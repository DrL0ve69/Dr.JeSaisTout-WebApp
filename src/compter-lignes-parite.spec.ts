// =============================================================================
// Les DEUX copies du comptage de lignes disent-elles la même chose ?
// (E2-ST4, lot B — correctifs de revue)
// -----------------------------------------------------------------------------
// POURQUOI CE FICHIER EXISTE.
// Le nombre de lignes d'un extrait de code est calculé en DEUX exemplaires, et c'est
// voulu :
//   · `compterLignes` (`tools/content-pipeline/compter-lignes.mjs`) est la DÉFINITION DE
//     RÉFÉRENCE — trois garde-fous du pipeline s'en servent au BUILD (portée d'annotation,
//     conservation des ancres de ligne, borne de `ligneFautive`) ;
//   · `decouperLignesDeCode` (`src/app/features/cours/quiz/quiz.ts`) découpe à
//     l'EXÉCUTION les lignes que le quiz `trouver-la-faille` rend en radios.
// La frontière entre l'outillage `.mjs` et la source Angular est délibérée dans ce dépôt —
// un composant qui importerait un module de `tools/**` le ferait entrer dans son bundle
// (en-tête de `tsconfig.tools.json`). On ne factorise donc pas ; on garde la duplication
// HONNÊTE. Même patron, même raison et même mode d'échec que
// `src/clef-indiscernable-parite.spec.ts`.
//
// 🔴 LA DETTE A ÉTÉ PAYÉE DEUX FOIS, ET C'EST CE FICHIER QUI MANQUAIT.
// Premier paiement (lot B) : `valider.mjs` bornait `ligneFautive` avec
// `code.split('\n').length` pendant que le compilateur comptait autrement — d'où
// `compter-lignes.mjs`, annoncé comme « UNE définition, TROIS appelants », dette « payée ».
// Deuxième paiement (revue du lot B) : il y avait un QUATRIÈME appelant, sur le chemin du
// RENDU, et il comptait encore `split('\n')`. Un `code` terminé par un saut de ligne y
// produisait une radio fantôme « Ligne N+1 », au libellé vide, sélectionnable et toujours
// fausse. Recompter la même formule une fois de plus sans la confronter, c'est armer la
// troisième divergence : le lien entre deux copies n'est jamais un commentaire (L-008).
//
// LE MODE D'ÉCHEC EST DISSYMÉTRIQUE, ET LES DEUX SENS RESTENT MAUVAIS. Si la copie du
// composant compte PLUS que la référence, elle rend des lignes que le pipeline refuse de
// laisser désigner : radios mortes à l'écran, et une garde d'exécution plus permissive que
// celle du build. Si elle compte MOINS, la bonne réponse d'un quiz validé n'est affichable
// par AUCUNE radio. On exige donc l'ÉGALITÉ, pas une inclusion.
//
// POURQUOI PAR PROCESSUS FILS, ET PAS PAR IMPORT. Décision déjà prise par
// `src/clef-indiscernable-parite.spec.ts` et `src/pipeline-contenu-validation.spec.ts` :
// importer un `.mjs` d'outillage le ferait entrer dans `tsconfig.spec.json`, qui n'a ni
// `allowJs` ni les types Node de l'outillage. La différence avec la clef d'indiscernabilité
// est que `compter-lignes.mjs` n'a AUCUNE ligne de commande — c'est un module pur, sans
// dépendance. Lui en ajouter une (un mode `--lignes` à la `--clefs`) mettrait du code de
// test dans un fichier du pipeline pour un module de trois lignes. On l'importe donc par son
// URL de fichier dans un processus Node jetable : c'est bien LE module de production qui
// calcule, pas une recopie.
//
// LE CORPUS EST ÉCRIT ICI, EN DUR — jamais importé de l'un des deux côtés (L-012), et ses
// caractères invisibles sont en séquences d'échappement, jamais en clair.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { decouperLignesDeCode } from './app/features/cours/quiz/quiz';

const MODULE_DE_REFERENCE = join(process.cwd(), 'tools', 'content-pipeline', 'compter-lignes.mjs');

/** Une seule invocation de Node pour tout le corpus : lente une fois, pas vingt fois. */
const DELAI = 60_000;

/**
 * Le programme jetable qui fait compter la RÉFÉRENCE. Il importe le module de production
 * par son URL de fichier — un chemin relatif ne se résout pas de façon garantie sous
 * `--eval`, et une URL `file:` est la seule forme portable sous Windows.
 */
const PROGRAMME = [
  `import { compterLignes } from ${JSON.stringify(pathToFileURL(MODULE_DE_REFERENCE).href)};`,
  "let brut = '';",
  "process.stdin.setEncoding('utf8');",
  'for await (const morceau of process.stdin) brut += morceau;',
  'const recu = JSON.parse(brut);',
  'process.stdout.write(JSON.stringify(recu.map(compterLignes)));',
].join('\n');

/**
 * Un cas = un extrait piégeux + l'étiquette qui le NOMME dans le rapport de test. Sans
 * l'étiquette, une divergence sur une chaîne faite de sauts de ligne s'afficherait comme un
 * blanc à côté d'un autre blanc.
 */
const CORPUS: readonly { etiquette: string; valeur: string }[] = [
  { etiquette: 'chaîne vide — aucune ligne adressable', valeur: '' },
  { etiquette: 'une ligne, sans saut final', valeur: 'echo $avis;' },
  // 🔴 LE CAS QUI A COÛTÉ LA RADIO FANTÔME. `split('\n')` en rend DEUX, dont une vide.
  { etiquette: 'une ligne, AVEC saut final', valeur: 'echo $avis;\n' },
  { etiquette: 'trois lignes, sans saut final', valeur: 'a;\nb;\nc;' },
  { etiquette: 'trois lignes, avec saut final', valeur: 'a;\nb;\nc;\n' },
  { etiquette: 'ligne vide AU MILIEU — une respiration voulue, qui se compte', valeur: 'a;\n\nc;' },
  { etiquette: 'deux sauts finaux — un seul se retire', valeur: 'a;\n\n' },
  { etiquette: 'saut de ligne SEUL', valeur: '\n' },
  { etiquette: 'CRLF, sans saut final (L-015)', valeur: 'a;\r\nb;' },
  { etiquette: 'CRLF, AVEC saut final (L-015)', valeur: 'a;\r\nb;\r\n' },
  { etiquette: 'CRLF seul', valeur: '\r\n' },
  { etiquette: 'CR orphelin — ce n’est PAS un saut de ligne', valeur: 'a;\rb;' },
  { etiquette: 'espaces seules — une ligne, non vide au sens du découpage', valeur: '   ' },
  { etiquette: 'fins de ligne mêlées, LF puis CRLF', valeur: 'a;\nb;\r\nc;' },
];

/** Comptes calculés par le module de RÉFÉRENCE — une seule invocation, tout le corpus. */
let comptesReference: readonly number[] = [];

describe('Parité des deux copies du comptage de lignes', () => {
  beforeAll(() => {
    const sortie = execFileSync(process.execPath, ['--input-type=module', '--eval', PROGRAMME], {
      input: JSON.stringify(CORPUS.map((c) => c.valeur)),
      encoding: 'utf8',
      timeout: DELAI,
    });
    const recu: unknown = JSON.parse(sortie);
    if (!Array.isArray(recu) || recu.some((v) => typeof v !== 'number')) {
      throw new Error(
        `compterLignes n'a pas rendu un tableau de nombres : ${sortie.slice(0, 200)}`,
      );
    }
    comptesReference = recu as number[];
  }, DELAI);

  it('la référence rend exactement un compte par cas du corpus', () => {
    expect(comptesReference).toHaveLength(CORPUS.length);
  });

  // LE CONTRÔLE POSITIF DU CORPUS (L-019). Sans lui, « les deux copies sont d'accord »
  // serait vrai d'un corpus sur lequel `split('\n').length` — la formule FAUTIVE — serait
  // d'accord aussi, c'est-à-dire d'un test incapable d'attraper la régression qu'il vise.
  it('le corpus SÉPARE vraiment les deux formules — `split` naïf diverge sur plusieurs cas', () => {
    const divergents = CORPUS.filter(
      (c) => c.valeur.split('\n').length !== decouperLignesDeCode(c.valeur).length,
    );
    expect(
      divergents.length,
      divergents.map((c) => c.etiquette).join(' · '),
    ).toBeGreaterThanOrEqual(6);
  });

  it('le corpus porte le cas exact de la radio fantôme — même code, avec et sans saut final', () => {
    // La paire est nommée à part : c'est elle, et elle seule, qui décrit le défaut vu à
    // l'écran. Un remaniement du corpus qui la perdrait fait rougir ICI.
    expect(decouperLignesDeCode('echo $avis;\n')).toEqual(decouperLignesDeCode('echo $avis;'));
    expect(decouperLignesDeCode('echo $avis;\n')).toHaveLength(1);
  });

  for (const [index, cas] of CORPUS.entries()) {
    it(`même compte des deux côtés — ${cas.etiquette}`, () => {
      expect(comptesReference[index], JSON.stringify(cas.valeur)).toBe(
        decouperLignesDeCode(cas.valeur).length,
      );
    });
  }
});
