// =============================================================================
// L'ORCHESTRATEUR TIENT-IL SES PROMESSES ? (E2-ST1, lot 4)
// -----------------------------------------------------------------------------
// POURQUOI CE TEST EXISTE, ET POURQUOI IL EXISTE MAINTENANT.
// `src/styles.scss` fait `@use 'styles/coloration-syntaxique-generee'` sur une
// feuille GITIGNORÉE que seul `npm run content:build` produit. Sur un dépôt
// fraîchement cloné, cette feuille n'existe pas — et c'est `npm test` qui tombe EN
// PREMIER, avant `npm run build`, parce que le spec du design system compile la
// feuille globale. Tant que le câblage `pretest`/`prestart` + étape CI n'est pas
// posé, le dépôt est ROUGE pour quiconque le clone.
//
// La panne la plus vicieuse n'est pas l'absence de câblage : c'est un générateur
// qui « saute » l'écriture quand il n'a rien à compiler. `content/` est vide
// aujourd'hui et le restera jusqu'à E3 ; un pipeline qui rendrait la main sans rien
// écrire passerait tous ses propres tests et laisserait quand même le `@use` sans
// cible. D'où le premier test ci-dessous, qui est le cœur du lot : ZÉRO leçon doit
// écrire QUAND MÊME la feuille, le manifeste et la carte.
//
// POURQUOI PAR PROCESSUS FILS, ET NON PAR IMPORT — même raison que
// `pipeline-contenu-compilation.spec.ts` : l'orchestrateur est un `.mjs` vérifié par
// le TROISIÈME programme (`tsconfig.tools.json`, Node pur). L'importer le ferait
// entrer dans `tsconfig.spec.json`, qui n'a ni `allowJs` ni les types Node de
// l'outillage. On exécute donc la ligne de commande réelle — celle que `pretest`,
// `prestart` et les deux workflows appellent.
//
// POURQUOI LE BAC À SABLE EST DANS LE DÉPÔT ET NON DANS `tmpdir()`.
// `build.mjs` efface son dossier de sortie récursivement. Le garde-fou qui rend
// cet effacement sûr exige que la cible vive DANS le dépôt et se nomme
// « content-generated ». Un bac dans `tmpdir()` serait donc refusé — et c'est
// exactement ce qu'on veut du garde-fou. `.cache/` est gitignoré.
//
// ⚠️ CE SPEC EXIGE LE CHROMIUM DE PLAYWRIGHT — ce n'est pas un détail d'exécution.
// Les deux fixtures employées ici portent des blocs ` ```mermaid ` : le pipeline
// démarre donc `mmdc`, qui démarre le Chromium installé par `npm run e2e:install`
// (`.puppeteerrc.cjs` interdit à Puppeteer d'en télécharger un second). Sur un
// clone frais, `npm ci && npm test` est donc ROUGE tant que cette installation n'a
// pas eu lieu. C'est assumé : aucun `skip` muet ne masque ce cas — un test sauté
// en silence ne distingue pas « rien à vérifier » de « rien vérifié » (L-005).
// La contrepartie, c'est que l'échec doit DIRE QUOI LANCER : voir `diagnostic()`
// ci-dessous, qui nomme `npm run e2e:install` dans le message de Vitest lui-même.
// =============================================================================

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ORCHESTRATEUR = 'tools/content-pipeline/build.mjs';
const RACINE_TEMOIN = 'tools/content-pipeline/__fixtures__/temoin/cours/securite-web';

/** La fixture à diagrammes : deux sources distinctes, dont une RÉPÉTÉE mot pour mot. */
const RACINE_DIAGRAMMES = 'tools/content-pipeline/__fixtures__/mermaid-deux-diagrammes';
const SOURCE_DIAGRAMMES = join(RACINE_DIAGRAMMES, '01-diagrammes', 'lecon.md');

/** Bac à sable, dans le dépôt et gitignoré — voir l'en-tête. */
const BAC = '.cache/tests-e2-st1';

/** Shiki charge de vraies grammaires, `mmdc` démarre un vrai Chromium : c'est lent, une seule fois. */
const DELAI = 180_000;

interface Execution {
  code: number;
  journal: string;
}

/** Lance l'orchestrateur et rend son code de sortie et son journal (les deux flux réunis). */
function lancer(args: readonly string[]): Execution {
  const resultat = spawnSync(process.execPath, [ORCHESTRATEUR, ...args], {
    encoding: 'utf8',
    cwd: process.cwd(),
  });
  return {
    code: resultat.status ?? -1,
    journal: `${resultat.stdout ?? ''}\n${resultat.stderr ?? ''}`,
  };
}

/**
 * Message de diagnostic, VIDE quand tout va bien. Un `expect(diagnostic(x)).toBe('')`
 * placé avant l'assertion de code fait remonter la CAUSE dans le rapport de Vitest,
 * là où `expect(code).toBe(0)` n'afficherait que « expected -1 to be 0 ».
 *
 * Le cas qu'il existe pour nommer : un clone frais sans le Chromium de Playwright.
 * L'échec est alors parfaitement légitime — mais illisible si le rapport ne dit pas
 * la commande à lancer.
 */
function diagnostic(execution: Execution): string {
  if (execution.code === 0) return '';
  const chromiumManquant = /Chromium|e2e:install|Playwright|mmdc/i.test(execution.journal);
  const tete = chromiumManquant
    ? 'le rendu des diagrammes exige le Chromium de Playwright — lancer : npm run e2e:install'
    : `l'orchestrateur a échoué (code ${execution.code})`;
  const extrait = execution.journal
    .trim()
    .split('\n')
    .filter((ligne) => ligne.trim() !== '')
    .slice(-12)
    .join('\n');
  return `${tete}\n${extrait}`;
}

interface BlocLu {
  type: string;
  svg?: string;
  titreAccessible?: string;
  descriptionLongue?: string;
  blocs?: BlocLu[];
}

/** Récolte les blocs `mermaid` d'une leçon compilée, encadrés compris — dans l'ordre du document. */
function svgDeLaLecon(chemin: string): BlocLu[] {
  const lecon: { sections: { blocs: BlocLu[] }[] } = JSON.parse(readFileSync(chemin, 'utf8'));
  const trouves: BlocLu[] = [];
  const descendre = (blocs: readonly BlocLu[]): void => {
    for (const bloc of blocs) {
      if (bloc.type === 'mermaid') trouves.push(bloc);
      if (bloc.blocs !== undefined) descendre(bloc.blocs);
    }
  };
  for (const section of lecon.sections) descendre(section.blocs);
  return trouves;
}

/** Les identifiants d'un SVG, dans l'ordre. */
function identifiants(svg: string): string[] {
  return [...svg.matchAll(/\sid="([^"]+)"/g)].map((trouve) => trouve[1] ?? '');
}

/** Un sous-dossier de sortie propre, au nom que le garde-fou de `build.mjs` exige. */
function bac(nom: string): { sortie: string; css: string } {
  const dossier = join(BAC, nom);
  rmSync(dossier, { recursive: true, force: true });
  mkdirSync(dossier, { recursive: true });
  return { sortie: join(dossier, 'content-generated'), css: join(dossier, '_coloration.scss') };
}

afterAll(() => {
  rmSync(BAC, { recursive: true, force: true });
});

describe("l'orchestrateur du pipeline de contenu", () => {
  // ---------------------------------------------------------------------------
  // LE CŒUR DU LOT — zéro leçon n'est pas une raison de ne rien écrire
  // ---------------------------------------------------------------------------
  describe('sur une racine EXISTANTE mais SANS aucune leçon', () => {
    const { sortie, css } = bac('racine-vide');
    const racineVide = join(BAC, 'racine-vide', 'contenu-sans-lecon');
    let execution: Execution;

    beforeAll(() => {
      mkdirSync(racineVide, { recursive: true });
      execution = lancer(['--racine', racineVide, '--sortie', sortie, '--css', css]);
    }, DELAI);

    it('réussit — une racine vide est un état légitime avant E3, pas une faute', () => {
      expect(execution.code).toBe(0);
    });

    it('le dit à voix haute : « 0 leçon » figure au journal (L-005)', () => {
      // Un gate qui n'a rien vu doit se voir dans le journal. Un vert muet ne
      // distingue pas « rien à faire » de « rien fait ».
      expect(execution.journal).toContain('0 leçon');
    });

    it('écrit QUAND MÊME la feuille de coloration — sinon `src/styles.scss` perd sa cible', () => {
      // C'est LA régression que ce lot ferme. Sans ce fichier, Sass échoue sur
      // « Can't find stylesheet to import » au premier `npm test` d'un clone frais.
      expect(existsSync(css)).toBe(true);
    });

    it('écrit QUAND MÊME un manifeste — vide, mais présent et analysable', () => {
      const manifeste: unknown = JSON.parse(
        readFileSync(join(sortie, 'manifeste-routes.json'), 'utf8'),
      );
      expect(manifeste).toEqual([]);
    });

    it('écrit QUAND MÊME une carte d’imports — vide, mais compilable par le programme applicatif', () => {
      const carte = readFileSync(join(sortie, 'carte-lecons.ts'), 'utf8');
      expect(carte).toContain('export const carteLecons');
      expect(carte).toContain('= {};');
    });
  });

  // ---------------------------------------------------------------------------
  // La leçon-témoin GRASSE — le contrôle positif du cas vide
  // ---------------------------------------------------------------------------
  describe('sur la leçon-témoin grasse', () => {
    const { sortie, css } = bac('temoin');
    let execution: Execution;

    beforeAll(() => {
      execution = lancer(['--racine', RACINE_TEMOIN, '--sortie', sortie, '--css', css]);
    }, DELAI);

    it('compile la leçon sans échouer', () => {
      // `diagnostic()` D'ABORD : sur un clone sans Chromium, c'est lui qui nomme
      // `npm run e2e:install` au lieu d'afficher « expected -1 to be 0 ».
      expect(diagnostic(execution)).toBe('');
      expect(execution.code).toBe(0);
      expect(execution.journal).toContain('1 leçon(s) compilée(s)');
    });

    it('inscrit la leçon au manifeste, avec ses métadonnées et rien de plus', () => {
      // Le contrôle positif du test « manifeste vide » ci-dessus : si le générateur
      // n'écrivait jamais rien, les deux blocs seraient verts. Ici, il DOIT écrire.
      const manifeste: { slug: string; ordre: number; sujet: string }[] = JSON.parse(
        readFileSync(join(sortie, 'manifeste-routes.json'), 'utf8'),
      );
      expect(manifeste).toHaveLength(1);
      expect(manifeste[0]?.slug).toBe('lecon-temoin');
      expect(manifeste[0]?.sujet).toBe('securite-web');
      // AUCUN champ `factice` : la leçon-témoin vit hors de `content/`, la protection
      // est physique et non déclarative (objection S6 du plan d'E2-ST1).
      expect(Object.keys(manifeste[0] ?? {})).not.toContain('factice');
    });

    it('écrit un import dynamique LITTÉRAL par slug — le point de coupe d’esbuild', () => {
      const carte = readFileSync(join(sortie, 'carte-lecons.ts'), 'utf8');
      // Littéral, et non calculé : `import(`./lecons/${slug}.json`)` ne serait pas
      // analysable statiquement, et tout le contenu retomberait dans un seul chunk.
      expect(carte).toContain("'lecon-temoin': () => import('./lecons/lecon-temoin.json')");
      // L'assertion porte sur les APPELS `import(…)`, pas sur le fichier entier :
      // l'en-tête généré cite justement la forme interdite pour expliquer pourquoi
      // elle l'est. Un `not.toContain('${')` naïf rougirait sur ce commentaire.
      expect(carte).not.toMatch(/import\(\s*`/);
    });

    it('écrit un JSON par leçon, et la carte pointe bien dessus', () => {
      expect(existsSync(join(sortie, 'lecons', 'lecon-temoin.json'))).toBe(true);
    });

    it('imprime la table des poids, même quand aucun seuil n’est franchi (L-005)', () => {
      expect(execution.journal).toContain('Poids du contenu compilé');
      expect(execution.journal).toContain('lecon-temoin');
    });
  });

  // ---------------------------------------------------------------------------
  // LES DIAGRAMMES — et surtout le cas où DEUX d'entre eux sont IDENTIQUES
  // ---------------------------------------------------------------------------
  // La régression que ce bloc ferme : la clef du cache est le hachage du CODE du
  // diagramme, et la v1 s'en servait AUSSI comme préfixe d'identifiants. Deux
  // diagrammes identiques dans une même leçon recevaient donc le même SVG — donc
  // les mêmes `id` deux fois dans la même page (`duplicate-id-aria` chez axe, et un
  // `url(#…)` qui pointe chez le voisin). Rien ne rougissait : le contrôle
  // d'unicité vivait dans le harnais `rendre-mermaid.mjs --racine`, que
  // `npm run content:build` n'exécute jamais.
  describe('sur une leçon à trois diagrammes, dont deux IDENTIQUES', () => {
    const { sortie, css } = bac('diagrammes');
    let execution: Execution;
    let blocs: BlocLu[];

    beforeAll(() => {
      execution = lancer(['--racine', RACINE_DIAGRAMMES, '--sortie', sortie, '--css', css]);
      if (execution.code === 0) {
        blocs = svgDeLaLecon(join(sortie, 'lecons', 'diagrammes.json'));
      }
    }, DELAI);

    it('compile sans échouer', () => {
      expect(diagnostic(execution)).toBe('');
      expect(execution.code).toBe(0);
    });

    it('la fixture porte bien DEUX diagrammes identiques à l’octet près (contrôle positif)', () => {
      // L-019 : sans ce contrôle, tout ce bloc resterait vert si quelqu'un
      // « corrigeait » la fixture en différenciant les deux blocs — et la
      // régression qu'il surveille redeviendrait invisible.
      const source = readFileSync(SOURCE_DIAGRAMMES, 'utf8').replaceAll('\r\n', '\n');
      const sources = [...source.matchAll(/^```mermaid[^\n]*\n([\s\S]*?)^```/gm)].map(
        (trouve) => trouve[1] ?? '',
      );
      expect(sources).toHaveLength(3);
      expect(sources[0]).toBe(sources[2]);
      expect(sources[0]).not.toBe(sources[1]);
    });

    it('ne paie qu’UNE fabrication par SOURCE distincte, pas par occurrence', () => {
      // Cache-indépendant : selon que `.cache/mermaid/` est chaud ou froid, les deux
      // sources sont « rendues » ou « relues ». Ce qui est invariant, c'est 3
      // occurrences pour 2 sources — la déduplication elle-même.
      const compte = /(\d+) occurrence\(s\) — (\d+) source\(s\) rendue\(s\), (\d+) relue\(s\)/.exec(
        execution.journal,
      );
      expect(compte).not.toBeNull();
      expect(Number(compte?.[1])).toBe(3);
      expect(Number(compte?.[2]) + Number(compte?.[3])).toBe(2);
    });

    it('produit TROIS blocs mermaid dans l’AST, chacun avec son équivalent textuel', () => {
      expect(blocs).toHaveLength(3);
      for (const bloc of blocs) {
        expect(bloc.svg ?? '').toContain('<svg');
        expect((bloc.titreAccessible ?? '').length).toBeGreaterThan(0);
        expect((bloc.descriptionLongue ?? '').length).toBeGreaterThan(0);
      }
    });

    it('LA RÉGRESSION : les deux diagrammes identiques ne partagent AUCUN identifiant', () => {
      const premier = identifiants(blocs[0]?.svg ?? '');
      const copie = identifiants(blocs[2]?.svg ?? '');
      expect(premier.length).toBeGreaterThan(0);
      expect(copie).toHaveLength(premier.length); // même source ⇒ même structure
      expect(premier.filter((id) => copie.includes(id))).toEqual([]);
      expect(blocs[0]?.svg).not.toBe(blocs[2]?.svg);
    });

    it('aucun identifiant partagé entre les trois diagrammes de la page', () => {
      const tous = blocs.flatMap((bloc) => identifiants(bloc.svg ?? ''));
      expect(tous.length).toBeGreaterThan(0);
      expect(new Set(tous).size).toBe(tous.length);
    });

    it('le dit à voix haute : le contrôle final figure au journal (L-005)', () => {
      // Le contrôle vit désormais DANS `build.mjs`, sur le chemin que la CI emprunte.
      expect(execution.journal).toMatch(/3 SVG contrôlé\(s\)/);
      expect(execution.journal).toMatch(/(\d+)\/\1 identifiant\(s\) unique\(s\)/);
    });

    it('livre des SVG que l’analyseur à liste blanche accepte — rien de ce qu’il refuse', () => {
      for (const bloc of blocs) {
        const svg = bloc.svg ?? '';
        expect(svg.match(/\sstyle\s*=/gi) ?? []).toEqual([]);
        expect(svg.match(/<style[\s>]/gi) ?? []).toEqual([]);
        expect(
          svg.match(/<(a|use|image|animate|animateTransform|set|script|foreignObject)[\s/>]/g) ??
            [],
        ).toEqual([]);
        expect(svg.match(/\son[a-z]+\s*=/gi) ?? []).toEqual([]);
        // La classe crochet de `src/styles/_mermaid-generee.scss`, sans laquelle le
        // diagramme s'afficherait sans thème.
        expect(svg).toContain('diagramme-mermaid');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // La racine EXPLICITE introuvable — une faute d'appel, pas un contenu absent
  // ---------------------------------------------------------------------------
  describe('sur une racine EXPLICITE introuvable', () => {
    const { sortie, css } = bac('racine-absente');
    let execution: Execution;

    beforeAll(() => {
      execution = lancer([
        '--racine',
        'content/cours/ce-cours-n-existe-pas',
        '--sortie',
        sortie,
        '--css',
        css,
      ]);
    }, DELAI);

    it('échoue en code 1 plutôt que de produire zéro leçon en silence', () => {
      expect(execution.code).toBe(1);
    });

    it('nomme le chemin fautif dans son message', () => {
      expect(execution.journal).toContain('content/cours/ce-cours-n-existe-pas');
    });
  });
});

// =============================================================================
// LE CÂBLAGE — L-007 : un gate câblé dans un seul endroit n'est pas câblé
// -----------------------------------------------------------------------------
// Tout se lit AU DISQUE (L-012) : `package.json` et les `.yml` sont précisément
// les fichiers qu'aucune compilation de ce spec ne touche, donc les seuls endroits
// où le contrat peut se rompre en silence.
// =============================================================================
describe('câblage de `content:build`', () => {
  const WORKFLOWS = ['ci.yml', 'deploy.yml'] as const;
  const SCRIPT = 'content:build';
  const NOM_ETAPE = 'Compiler `content/` (pipeline)';

  const manifeste: { scripts?: Record<string, string> } = JSON.parse(
    readFileSync('package.json', 'utf8'),
  );

  it(`expose un script npm « ${SCRIPT} » qui vise l'orchestrateur`, () => {
    expect(manifeste.scripts?.[SCRIPT] ?? '').toContain(ORCHESTRATEUR);
  });

  for (const crochet of ['pretest', 'prestart'] as const) {
    it(`est appelé automatiquement par « ${crochet} »`, () => {
      // Le développeur local ne doit JAMAIS avoir à y penser : `npm test` et
      // `npm start` sur un clone frais doivent marcher du premier coup. Sans ces
      // deux crochets, la première commande lancée échoue sur une erreur Sass qui
      // ne nomme ni `content/`, ni le pipeline.
      expect(manifeste.scripts?.[crochet] ?? '').toContain(`run ${SCRIPT}`);
    });
  }

  it('précède `ng build` dans le script `build`', () => {
    const build = manifeste.scripts?.['build'] ?? '';
    expect(build).toContain(`run ${SCRIPT}`);
    expect(build.indexOf(`run ${SCRIPT}`)).toBeLessThan(build.indexOf('ng build'));
  });

  // =============================================================================
  // LE CORPS DES DEUX MOITIÉS D'INSTALLATION — parce qu'un NOM n'est pas un garde-fou.
  // -----------------------------------------------------------------------------
  // La scission du 2026-08-19 fait porter à `deploy.yml` une affirmation de SÉCURITÉ par un nom
  // d'étape : « les dépendances système (apt, en root) » d'un côté, « le navigateur » de l'autre,
  // et le commentaire du workflow cartographie la dette de sceau d'artéfact sur cette base.
  //
  // Or rien, jusqu'ici, n'empêchait de remettre `--with-deps` dans la moitié « navigateur ». Le
  // `apt-get` en root reviendrait alors dans une étape dont le NOM jure qu'il n'y est pas, le
  // commentaire de `deploy.yml` deviendrait faux en silence, et TOUS les gates resteraient verts :
  // les workflows appellent des scripts npm, et personne ne regardait ce que ces scripts font.
  // C'est le patron S-002 — une autorisation qui se compare à une intention plutôt qu'à une valeur
  // revue. On épingle donc les CORPS, pas seulement les appels.
  // =============================================================================
  it('définit les deux moitiés d’installation sans que l’une empiète sur l’autre', () => {
    const deps = manifeste.scripts?.['e2e:install:deps'] ?? '';
    const navigateur = manifeste.scripts?.['e2e:install:navigateur'] ?? '';
    const combine = manifeste.scripts?.['e2e:install'] ?? '';

    expect(deps, '`e2e:install:deps` doit installer les dépendances système, et rien d’autre').
      toMatch(/^playwright install-deps\b/);
    expect(navigateur, '`e2e:install:navigateur` doit installer le binaire').toMatch(
      /^playwright install\b(?!-deps)/,
    );

    // LE CŒUR DE CE TEST. `--with-deps` dans la moitié « navigateur » y ferait rentrer l'`apt-get`
    // en root que son nom exclut — et c'est exactement la régression que le nom ne peut pas voir.
    expect(
      navigateur,
      '`e2e:install:navigateur` ne doit PAS porter `--with-deps` : ce serait l’apt-get en root ' +
        'de retour dans l’étape dont le nom promet le contraire (deploy.yml en dépend)',
    ).not.toContain('--with-deps');

    // Le combiné reste la commande UNIQUE du développeur local (CLAUDE.md §Commandes, et les
    // messages d'erreur de `rendre-mermaid.mjs` la nomment). Il doit enchaîner les deux moitiés —
    // sinon un clone frais installerait la moitié de ce dont il a besoin.
    expect(combine).toContain('run e2e:install:deps');
    expect(combine).toContain('run e2e:install:navigateur');
    expect(combine.indexOf('run e2e:install:deps')).toBeLessThan(
      combine.indexOf('run e2e:install:navigateur'),
    );
  });

  for (const workflow of WORKFLOWS) {
    describe(workflow, () => {
      const contenu = readFileSync(join('.github', 'workflows', workflow), 'utf8');

      it("porte l'étape, avec une directive `run:` VIVANTE", () => {
        // `\r?$` et non `$` : les `.yml` du dépôt sont en CRLF, et `$` en mode
        // multiligne s'ancre avant le `\n`, donc APRÈS le `\r` (L-015). Et on
        // asserte la PAIRE nom + `run:` : un simple `toContain` passerait sur une
        // étape mise en commentaire, c'est-à-dire sur un gate désactivé.
        expect(contenu).toContain(`- name: ${NOM_ETAPE}`);
        expect(contenu).toMatch(new RegExp(`^[ \\t]+run: npm run ${SCRIPT}\\r?$`, 'm'));
      });

      it('la place AVANT G-lint — la feuille générée doit exister avant tout autre gate', () => {
        expect(contenu.indexOf(`- name: ${NOM_ETAPE}`)).toBeLessThan(
          contenu.indexOf('- name: G-lint'),
        );
      });

      it('installe le Chromium partagé AVANT elle, une seule fois, et SANS la moitié apt', () => {
        // `rendre-mermaid.mjs` impose le Chromium de Playwright à `mmdc`. Tant que
        // `content/` est vide, une installation restée près de G-e2e ne se voit
        // pas ; le jour où E3-ST1 publie sa première leçon à diagramme, les deux
        // workflows deviennent rouges. L'assertion « une seule fois » interdit de
        // « corriger » en dupliquant l'étape : ce serait deux installations payées.
        //
        // 📐 L'HISTOIRE DE CETTE ÉTAPE, EN DEUX TEMPS LE 2026-08-19, parce qu'elle explique
        // pourquoi le test a cette forme-ci et pas une autre.
        // (1) L'étape unique `playwright install --with-deps chromium` a PENDU (53 min, puis
        //     12 min, contre 2 min 12 s pour le run entier la veille) sans écrire une ligne de
        //     journal : impossible de savoir si c'était l'`apt-get` en root ou le téléchargement
        //     du binaire. On l'a donc scindée en deux étapes nommées, avec un délai chacune.
        // (2) Au run suivant, la scission a nommé son coupable : `apt` téléchargeait 21 Mo depuis
        //     `azure.archive.ubuntu.com` à ~27 ko/s. Et le journal montrait que les bibliothèques
        //     de Chromium étaient DÉJÀ sur le runner — les 21 Mo étaient neuf paquets de polices
        //     non latines (japonais, thaï, chinois, cyrillique), qu'aucun rendu de ce site français
        //     ne peint. La moitié apt a donc été retirée de la CI.
        //
        // CE QUE CE TEST TIENT MAINTENANT, et c'est le sens inverse du précédent : `install-deps`
        // ne doit PAS revenir dans un workflow. Il ne s'agit pas d'un détail de performance —
        // c'est un `apt-get` en ROOT sur le workflow qui détient le jeton de déploiement, et son
        // retrait est écrit dans `deploy.yml` comme une moitié de dette de sécurité PAYÉE. Un
        // retour silencieux rendrait ce commentaire faux (patron S-009).
        const appels = [...contenu.matchAll(/npm run e2e:install:navigateur(?![:\w-])/g)];
        expect(appels, '« npm run e2e:install:navigateur » doit apparaître exactement une fois').
          toHaveLength(1);
        expect(contenu.indexOf('npm run e2e:install:navigateur')).toBeLessThan(
          contenu.indexOf(`npm run ${SCRIPT}`),
        );

        // Ni la moitié apt, ni le script combiné qui l'enchaîne : les deux ramèneraient
        // l'`apt-get` en root dans la CI, l'un ouvertement, l'autre par la bande.
        expect(
          [...contenu.matchAll(/npm run e2e:install:deps(?![:\w-])/g)],
          "un workflow rappelle `e2e:install:deps` : l'apt-get en root est de retour dans la CI, " +
            'et le commentaire de `deploy.yml` qui le dit payé devient faux',
        ).toHaveLength(0);
        expect(
          [...contenu.matchAll(/npm run e2e:install(?![:\w-])/g)],
          'un workflow appelle le script combiné : il enchaîne `e2e:install:deps`, donc il ' +
            "réintroduit l'apt-get en root",
        ).toHaveLength(0);
      });
    });
  }
});
