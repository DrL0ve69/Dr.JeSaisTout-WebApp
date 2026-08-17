// =============================================================================
// Le compilateur Markdown → AST tient-il ses TROIS promesses ? (E2-ST1, lot 2)
// -----------------------------------------------------------------------------
// POURQUOI CE TEST EXISTE.
// `tools/content-pipeline/compiler-markdown.mjs` porte trois garanties qu'aucun
// autre gate ne peut constater :
//
//   1. ZÉRO attribut `style=` dans le HTML coloré. La CSP du site est à hachages :
//      `generer-config-swa.mjs` refuse tout ` style="` de l'artéfact et hache tout
//      bloc `<style>` dans un `style-src` GLOBAL AU SITE. Le build finirait par le
//      dire — mais bien plus tard, sur un message qui ne nommerait pas la leçon
//      fautive. Ici, la faute se voit à la ligne près.
//   2. Les commentaires `<!-- à-vérifier: … -->` disparaissent AVANT rendu, pour
//      TOUS les statuts. `html: false` les ÉCHAPPE au lieu de les effacer : sans
//      retrait explicite, les doutes du professeur s'afficheraient en clair aux
//      apprenants sur toute leçon `brouillon` ou `verifiee`.
//   3. Un conteneur `:::` hors de la liste fermée fait ÉCHOUER la compilation.
//      markdown-it-container ne « dégrade » pas : il retombe en paragraphe et les
//      deux-points s'affichent au lecteur.
//
// LE CONTRÔLE POSITIF (L-019). Une assertion « la sortie ne contient pas
// `à-vérifier` » est vraie sur une sortie vide, sur une leçon sans marqueur, et
// même sur un compilateur qui ne compile rien. Le premier test vérifie donc
// d'abord que la SOURCE en contient un — si quelqu'un retire le marqueur de la
// fixture, c'est ce test-là qui rougit, pas la garantie qui devient muette.
//
// POURQUOI PAR PROCESSUS FILS, ET NON PAR IMPORT. Le compilateur est un `.mjs`
// vérifié par le TROISIÈME programme (`tsconfig.tools.json`, Node pur).
// L'importer depuis un spec Angular le ferait entrer dans `tsconfig.spec.json`,
// qui n'a ni `allowJs` ni les types Node de l'outillage — la frontière que
// `configuration-typescript.spec.ts` défend explicitement. On exécute donc la
// LIGNE DE COMMANDE réelle, ce qui a l'avantage de vérifier aussi le contrat que
// `build.mjs` (lot 4) consommera.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const COMPILATEUR = 'tools/content-pipeline/compiler-markdown.mjs';
const FIXTURE_TEMOIN = 'tools/content-pipeline/__fixtures__/temoin-minimal';
const FIXTURE_CONTENEUR_INCONNU =
  'tools/content-pipeline/__fixtures__/invalides/corps-conteneur-hors-liste-fermee';

/** Shiki charge de vraies grammaires TextMate au premier appel — c'est lent, mais une seule fois. */
const DELAI = 60_000;

interface BlocQuelconque {
  type: string;
  html?: string;
  htmlColore?: string;
  blocs?: BlocQuelconque[];
  exemples?: {
    langage: string;
    vulnerable: { htmlColore: string };
    corrige: { htmlColore: string };
  }[];
}

interface SectionLue {
  titre: string;
  ancre: string;
  niveau: number;
  blocs: BlocQuelconque[];
}

interface LeconLue {
  frontmatter: Record<string, unknown>;
  sections: SectionLue[];
}

/** Un dossier jetable par exécution : les sorties générées ne doivent jamais toucher `src/`. */
let bacASable = '';

/**
 * Lance le compilateur et rend sa sortie JSON. Le processus fils écrit son compte-rendu sur
 * stderr et le JSON sur stdout, précisément pour que cette lecture reste possible.
 */
function compiler(racine: string, feuille: string): { lecons: LeconLue[] } {
  const sortie = execFileSync(
    process.execPath,
    [COMPILATEUR, '--racine', racine, '--css', feuille, '--json'],
    { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: DELAI },
  );
  return JSON.parse(sortie) as { lecons: LeconLue[] };
}

/** Aplatit l'arbre : les encadrés contiennent des blocs, qui peuvent contenir du code. */
function tousLesBlocs(sections: readonly SectionLue[]): BlocQuelconque[] {
  const plat: BlocQuelconque[] = [];
  const descendre = (blocs: readonly BlocQuelconque[]): void => {
    for (const bloc of blocs) {
      plat.push(bloc);
      if (bloc.blocs !== undefined) descendre(bloc.blocs);
    }
  };
  descendre(sections.flatMap((section) => section.blocs));
  return plat;
}

/** Tous les fragments de HTML coloré produits, y compris ceux nichés dans une comparaison. */
function htmlColores(lecon: LeconLue): string[] {
  return tousLesBlocs(lecon.sections).flatMap((bloc) => [
    ...(bloc.htmlColore === undefined ? [] : [bloc.htmlColore]),
    ...(bloc.exemples ?? []).flatMap((paire) => [
      paire.vulnerable.htmlColore,
      paire.corrige.htmlColore,
    ]),
  ]);
}

describe('pipeline de contenu — compilation Markdown', () => {
  beforeAll(() => {
    bacASable = mkdtempSync(join(tmpdir(), 'drjst-compilation-'));
  });

  afterAll(() => {
    rmSync(bacASable, { recursive: true, force: true });
  });

  describe('leçon témoin', () => {
    let lecon: LeconLue;
    let feuille: string;

    beforeAll(() => {
      const cible = join(bacASable, 'coloration.scss');
      const resultat = compiler(FIXTURE_TEMOIN, cible);
      expect(resultat.lecons).toHaveLength(1);
      const premiere = resultat.lecons[0];
      if (premiere === undefined) throw new Error('aucune leçon compilée');
      lecon = premiere;
      feuille = readFileSync(cible, 'utf8');
    }, DELAI);

    it('produit du code coloré, et pas seulement de la prose', () => {
      // Sans cette assertion, les deux suivantes seraient vraies sur une leçon
      // dépourvue de tout bloc de code — un vert qui ne prouve rien (L-019).
      expect(htmlColores(lecon).length).toBeGreaterThan(0);
    });

    it("n'émet AUCUN attribut style= dans le HTML coloré", () => {
      for (const html of htmlColores(lecon)) {
        expect(html.match(/\sstyle\s*=/gi) ?? []).toEqual([]);
        expect(html.match(/<style[\s>]/gi) ?? []).toEqual([]);
      }
    });

    it('définit dans la feuille générée TOUTES les classes que le HTML référence', () => {
      // Le pendant de l'assertion précédente : sortir la couleur en classes ne sert à rien si la
      // feuille qui les définit n'est pas écrite. Une classe manquante ne lève aucune erreur — le
      // texte s'affiche simplement sans couleur, ce qu'aucun gate ne remarquerait.
      const utilisees = new Set(
        htmlColores(lecon)
          .flatMap((html) => [...html.matchAll(/class="([^"]*)"/g)])
          .flatMap((trouve) => (trouve[1] ?? '').split(/\s+/).filter((c) => c.startsWith('clr-'))),
      );
      expect(utilisees.size).toBeGreaterThan(0);
      expect([...utilisees].filter((classe) => !feuille.includes(`.${classe}{`))).toEqual([]);
    });

    it('efface les marqueurs « à-vérifier » de la source — sur une leçon NON publiée', () => {
      // Contrôle positif d'abord : la fixture DOIT porter le marqueur. Son statut est
      // « brouillon », donc le validateur le tolère — c'est très exactement le cas où le
      // compilateur doit l'effacer, et celui que la v1 du plan avait perdu.
      const source = readFileSync(join(FIXTURE_TEMOIN, '01-temoin', 'lecon.md'), 'utf8');
      expect(source).toContain('<!-- à-vérifier:');
      expect(lecon.frontmatter['statut']).toBe('brouillon');

      const rendu = JSON.stringify(lecon);
      expect(rendu).not.toContain('à-vérifier');
      expect(rendu).not.toContain('<!--');
      expect(rendu).not.toContain('&lt;!--');
    });

    it('donne à chaque section une ancre kebab-case unique', () => {
      const ancres = lecon.sections.map((section) => section.ancre);
      expect(ancres.length).toBeGreaterThan(1);
      expect(new Set(ancres).size).toBe(ancres.length);
      for (const ancre of ancres) expect(ancre).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      for (const section of lecon.sections) expect([2, 3]).toContain(section.niveau);
    });
  });

  describe('fail-closed', () => {
    /**
     * @returns le message d'erreur du processus fils, ou `null` s'il a réussi — un `null` doit
     *   faire rougir l'appelant : un garde-fou qui laisse passer est un garde-fou absent.
     */
    function messageDEchec(racine: string): string | null {
      try {
        compiler(racine, join(bacASable, 'jetable.scss'));
        return null;
      } catch (erreur) {
        const echec = erreur as { status?: number; stderr?: string };
        expect(echec.status).not.toBe(0);
        return echec.stderr ?? '';
      }
    }

    it(
      'refuse un conteneur hors de la liste fermée, en le nommant',
      () => {
        const message = messageDEchec(FIXTURE_CONTENEUR_INCONNU);
        expect(message).not.toBeNull();
        expect(message).toContain('conteneur inconnu');
        expect(message).toContain('astuce');
      },
      DELAI,
    );

    it(
      'refuse un bloc de code dont la langue est hors du contrat',
      () => {
        // Écrit à la volée : le contrat `Langage` est une liste fermée de six valeurs, et une leçon
        // qui en emploie une septième ne serait pas colorée — E2-ST4 ne saurait pas la rendre.
        const racine = join(bacASable, 'langue-inconnue');
        const dossier = join(racine, '01-temoin');
        mkdirSync(dossier, { recursive: true });
        const source = readFileSync(join(FIXTURE_TEMOIN, '01-temoin', 'lecon.md'), 'utf8');
        const frontmatter = source.slice(0, source.indexOf('---', 4) + 4);
        writeFileSync(
          join(dossier, 'lecon.md'),
          `${frontmatter}\n# Titre\n\n## Une section\n\n\`\`\`brainfuck\n+++\n\`\`\`\n`,
          'utf8',
        );

        const message = messageDEchec(racine);
        expect(message).not.toBeNull();
        expect(message).toContain('brainfuck');
      },
      DELAI,
    );
  });
});
