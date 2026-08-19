// =============================================================================
// « Aucune feature n'importe une autre feature » — la règle devient un GATE
// -----------------------------------------------------------------------------
// POURQUOI CE TEST EXISTE.
// La règle est écrite noir sur blanc dans `docs/architecture/stack-et-architecture.md`
// (§ « La seule règle de l'état de l'art qui manquait ») et rappelée dans le bloc de
// bascule de `CLAUDE.md` : si `features/cours/sommaire` a besoin de la progression que
// `features/cours/quiz` produit, les deux INJECTENT un service de `core/progression/` —
// jamais un import direct de l'une vers l'autre. Elle était annoncée « bloquante en
// revue », c'est-à-dire ratée dès que personne ne regarde. Ici elle rougit toute seule.
//
// POURQUOI PAS `no-restricted-imports` D'ESLINT.
// Cette règle filtre le SPÉCIFICATEUR ÉCRIT, pas le chemin RÉSOLU : un motif qui
// interdit `features/cours/quiz` laisse passer `../../quiz/quiz`, qui désigne
// pourtant exactement le même fichier. On résout donc chaque import avec
// `path.resolve` avant de juger. `ts.preProcessFile` fait l'extraction (il voit les
// `import`, les `export … from`, les imports dynamiques et les `require`) ;
// TypeScript est déjà une dépendance du dépôt, aucune n'est ajoutée.
//
// GRANULARITÉ : LE RÉPERTOIRE DE SOUS-FEATURE.
// L'unité est le chemin sous `src/app/features/`, tronqué à DEUX segments :
// `cours/quiz`, `cours/lecon`, `cours/simulation`, `home/carte-cours`… Un fichier
// posé à la racine d'une feature (`cours/contenu-compile.ts`, `home/accueil.ts`)
// relève de l'unité à UN segment (`cours`, `home`). Deux unités distinctes ne
// peuvent pas s'importer — sauf arête inscrite NOMMÉMENT ci-dessous, avec sa raison.
// =============================================================================

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

import ts from 'typescript';

const RACINE = process.cwd();
const RACINE_FEATURES = join(RACINE, 'src', 'app', 'features');

/** Un fichier soumis à l'analyse : son chemin absolu et son texte source. */
interface FichierAnalyse {
  readonly chemin: string;
  readonly source: string;
}

/** Une arête relevée entre deux unités distinctes. */
interface Arete {
  readonly importateur: string;
  readonly importe: string;
  readonly de: string;
  readonly vers: string;
}

/**
 * Les arêtes TOLÉRÉES, recensées une par une dans le code réel du dépôt — jamais une
 * exclusion large. Une arête absente d'ici fait échouer le test en se nommant.
 */
const ARETES_TOLEREES: readonly { de: string; vers: string; raison: string }[] = [
  // `rendu-blocs` est le rendu d'un bloc de leçon compilé : un bloc `quiz` et un bloc
  // `simulation` sont deux VARIANTES de bloc parmi d'autres, il doit donc pouvoir
  // instancier les deux composants. C'est une composition de vue, pas un partage
  // d'état : aucune donnée ne remonte de la leçon vers le quiz.
  { de: 'cours/lecon', vers: 'cours/quiz', raison: 'rendu-blocs instancie le bloc quiz' },
  {
    de: 'cours/lecon',
    vers: 'cours/simulation',
    raison: 'rendu-blocs instancie le bloc simulation',
  },

  // `cours/contenu-compile.ts` vit à la RACINE de la feature `cours` : c'est le contrat
  // partagé du contenu compilé (jeton `MANIFESTE_LECONS`, `lireLeconCompilee`,
  // `TYPES_ACTEUR`, préfixes d'identifiants). Les QUATRE sous-features le lisent ; aucune
  // ne lit celui d'une autre.
  { de: 'cours/lecon', vers: 'cours', raison: 'contrat du contenu compilé de la feature' },
  { de: 'cours/quiz', vers: 'cours', raison: 'contrat du contenu compilé de la feature' },
  { de: 'cours/simulation', vers: 'cours', raison: 'contrat du contenu compilé de la feature' },
  // `cours/sommaire` lit le MÊME contrat — le manifeste et `leconsPubliees`. C'est même
  // l'exemple canonique de la règle : ce qu'il ne doit PAS importer est `cours/quiz`,
  // qui ÉCRIT la progression qu'il LIT, et cette arête-là reste absente d'ici (le
  // contrôle positif plus bas la fabrique exprès pour vérifier qu'elle mord).
  { de: 'cours/sommaire', vers: 'cours', raison: 'contrat du contenu compilé de la feature' },

  // `home/accueil.ts` est la RACINE de composition de la feature `home` : elle assemble
  // ses propres sous-composants. La descente racine → sous-feature reste interne à la
  // feature ; c'est la traversée LATÉRALE entre deux sous-features qui est proscrite.
  { de: 'home', vers: 'home/carte-cours', raison: 'accueil compose sa propre carte' },
  { de: 'home', vers: 'home/extrait-entetes', raison: 'accueil compose son propre extrait' },
];

/**
 * L'unité d'architecture d'un chemin, ou `null` s'il est hors de `features/`.
 * Le dernier segment est le module lui-même (avec ou sans extension : un import
 * résolu n'en porte pas), il ne compte pas.
 */
function uniteDe(cheminAbsolu: string): string | null {
  const relatif = relative(RACINE_FEATURES, cheminAbsolu).split(sep).join('/');
  if (relatif === '' || relatif.startsWith('..')) {
    return null;
  }
  const repertoires = relatif.split('/').slice(0, -1);
  return repertoires.length === 0 ? null : repertoires.slice(0, 2).join('/');
}

/** Relève toutes les arêtes entre unités DISTINCTES, tolérées ou non. */
function relever(corpus: readonly FichierAnalyse[]): Arete[] {
  const aretes: Arete[] = [];
  for (const fichier of corpus) {
    const de = uniteDe(fichier.chemin);
    if (de === null) {
      continue;
    }
    for (const reference of ts.preProcessFile(fichier.source, true, true).importedFiles) {
      // Seul un chemin RELATIF peut désigner une feature : ni `@angular/core` ni
      // `node:fs` ne se résolvent dans l'arborescence du dépôt.
      if (!reference.fileName.startsWith('.')) {
        continue;
      }
      const cible = resolve(dirname(fichier.chemin), reference.fileName);
      const vers = uniteDe(cible);
      if (vers === null || vers === de) {
        continue;
      }
      aretes.push({
        importateur: relative(RACINE, fichier.chemin).split(sep).join('/'),
        importe: relative(RACINE, cible).split(sep).join('/'),
        de,
        vers,
      });
    }
  }
  return aretes;
}

/** Les arêtes non inscrites dans la liste blanche, formatées pour être lisibles. */
function violations(corpus: readonly FichierAnalyse[]): string[] {
  return relever(corpus)
    .filter(
      (arete) =>
        !ARETES_TOLEREES.some((toleree) => toleree.de === arete.de && toleree.vers === arete.vers),
    )
    .map(
      (arete) =>
        `${arete.importateur} importe ${arete.importe} (${arete.de} -> ${arete.vers}) : ` +
        `une feature n'importe pas une autre feature — passer par un service injecte de ` +
        `src/app/core/ (patron : core/progression/), ou inscrire l'arete dans ARETES_TOLEREES ` +
        `avec sa raison.`,
    );
}

/** Le corpus réel : tout le TypeScript sous `src/app/features/`, specs comprises. */
const CORPUS: readonly FichierAnalyse[] = readdirSync(RACINE_FEATURES, {
  recursive: true,
  encoding: 'utf8',
})
  .filter((chemin) => chemin.endsWith('.ts'))
  .map((chemin) => {
    const absolu = join(RACINE_FEATURES, chemin);
    return { chemin: absolu, source: readFileSync(absolu, 'utf8') };
  });

describe("aucune feature n'importe une autre feature", () => {
  it('ne relève aucune arête interdite dans src/app/features/', () => {
    expect(violations(CORPUS)).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Contrôle positif — sans lui, ce test resterait vert sur ZÉRO fichier
  // ---------------------------------------------------------------------------
  // Le dépôt est sain aujourd'hui : l'assertion ci-dessus est un tripwire, et un
  // tripwire vert ne prouve rien de lui-même (L-014/L-019). Trois preuves, donc :
  // le corpus n'est pas vide, le détecteur voit bien des arêtes dans le code réel,
  // et il MORD sur une arête fabriquée — celle-là même qu'E2-ST6 rend tentante.
  describe('le détecteur mord réellement', () => {
    /** L'arête que la règle existe pour empêcher : le sommaire lisant le quiz. */
    const SOMMAIRE = join(RACINE_FEATURES, 'cours', 'sommaire', 'sommaire.ts');

    it('analyse un corpus non vide', () => {
      expect(CORPUS.length).toBeGreaterThan(0);
    });

    it('voit des arêtes inter-unités dans le code réel', () => {
      // Un `resolve` cassé, une racine mal calculée ou un `preProcessFile` muet
      // rendraient `violations()` vide pour de mauvaises raisons. Les arêtes
      // tolérées existent : elles doivent être VUES, puis pardonnées.
      expect(relever(CORPUS).length).toBeGreaterThan(0);
    });

    it('nomme les deux fichiers d’une arête interdite fabriquée', () => {
      const constats = violations([
        { chemin: SOMMAIRE, source: "import { Quiz } from '../quiz/quiz';" },
      ]);
      expect(constats).toHaveLength(1);
      expect(constats[0]).toContain('src/app/features/cours/sommaire/sommaire.ts');
      expect(constats[0]).toContain('src/app/features/cours/quiz/quiz');
      expect(constats[0]).toContain('core/progression/');
    });

    it('laisse passer la parade : le même besoin servi par core/', () => {
      // Le jumeau négatif. Sans lui, un détecteur qui refuserait TOUT import
      // passerait les trois assertions précédentes.
      expect(
        violations([
          {
            chemin: SOMMAIRE,
            source: "import { ProgressionService } from '../../../core/progression/progression';",
          },
        ]),
      ).toEqual([]);
    });
  });
});
