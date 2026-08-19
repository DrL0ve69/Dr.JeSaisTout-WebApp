// =============================================================================
// La rigueur du compilateur est un CONTRAT, pas un réglage
// -----------------------------------------------------------------------------
// POURQUOI CE TEST EXISTE.
// `.claude/rules/security.md` et la barre WCAG tiennent la vérification de types
// pour acquise. Or, avant E1-ST1-F, `tsconfig.json` ne déclarait NI `strict` NI
// `strictTemplates` : le dépôt en bénéficiait quand même, parce que TypeScript 6
// et Angular 22 les activent PAR DÉFAUT. Une garantie qui ne tient qu'à un défaut
// d'outil n'est pas une garantie — elle est invisible à la lecture, et elle
// change sans prévenir à la montée de version majeure suivante.
//
// Trois options, elles, étaient réellement inactives (`noUncheckedIndexedAccess`,
// `typeCheckHostBindings`, `strictStandalone`) et les diagnostics étendus ne
// sortaient qu'en avertissement — donc invisibles dans un run vert (L-006).
//
// CE QUE CE TEST VÉRIFIE, ET POURQUOI SOUS CETTE FORME.
// Il ne relit pas `tsconfig.json` pour le comparer à lui-même (L-012) : il passe
// par `readConfiguration`, LE résolveur du compilateur Angular, celui-là même
// qu'utilise `ng build`. Il voit donc la configuration EFFECTIVE, chaîne
// `extends` déroulée. C'est ce qui compte : la faille réelle n'est pas qu'on
// retire une ligne de la base — c'est qu'un `tsconfig.app.json` ou
// `tsconfig.spec.json` la REDÉFINISSE plus bas, en silence, sans que rien ne
// rougisse. Les deux programmes sont donc vérifiés séparément.
//
// La liste attendue est écrite ICI, en dur, volontairement : c'est la POLITIQUE
// du projet. `tsconfig.json` porte le RÉGLAGE. Deux endroits indépendants — si
// l'un dérive, ce test rougit. S'ils n'en faisaient qu'un, il ne vérifierait rien.
// =============================================================================

import { readConfiguration } from '@angular/compiler-cli';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Les deux programmes ANGULAR, réellement compilés : l'application (par
 * `ng build`) et les tests (par `ng test`). Une rigueur qui s'arrêterait aux
 * specs laisserait passer du code de production, et l'inverse laisserait pourrir
 * les tests.
 */
const PROGRAMMES_ANGULAR = ['tsconfig.app.json', 'tsconfig.spec.json'] as const;

/**
 * Les programmes NODE : l'outillage de build (`tools/`, lancé par des scripts npm
 * et par personne d'autre) et les tests de bout en bout (`e2e/`, lancés par
 * Playwright). Ni l'un ni l'autre ne voit Angular — leur exiger des options du
 * compilateur Angular ferait rougir des assertions sans qu'aucun défaut n'existe.
 * D'où la séparation ci-dessous : la rigueur TypeScript vaut pour TOUT le dépôt,
 * la rigueur Angular seulement là où Angular compile.
 *
 * `tsconfig.e2e.json` est arrivé ici APRÈS COUP, et c'est le fait notable : il
 * était câblé dans les deux workflows sans qu'aucune assertion ne le couvre —
 * L-014 rejouée à l'identique, un cran plus loin. Ses six options de rigueur ne
 * tenaient qu'à leur présence dans le fichier, et son périmètre à rien du tout.
 */
const PROGRAMMES_NODE = ['tsconfig.tools.json', 'tsconfig.e2e.json'] as const;

const PROGRAMMES = [...PROGRAMMES_ANGULAR, ...PROGRAMMES_NODE] as const;

/**
 * Options TypeScript exigées — de TOUS les programmes. `strict` est le
 * PARAPLUIE : ses sous-options (`strictNullChecks`, `noImplicitAny`…) ne sont
 * jamais matérialisées dans la configuration résolue, les affirmer une par une
 * échouerait à tort. Les CINQ suivantes ne sont PAS couvertes par `strict` —
 * ce sont des ajouts délibérés, chacun activé explicitement dans `tsconfig.json`
 * ET redéclaré dans `tsconfig.tools.json` (qui n'étend pas la base : voir
 * l'en-tête de ce fichier-là). La liste est donc exhaustive à dessein : une
 * option redéclarée mais non listée ici pourrait disparaître d'un des deux
 * endroits sans qu'aucun test ne rougisse — et c'est très exactement la faute
 * L-008 (« un commentaire ne protège rien ») que ce fichier prétend fermer.
 * `noUncheckedIndexedAccess` compte double : le pipeline de contenu d'E2
 * indexera beaucoup.
 */
const OPTIONS_TYPESCRIPT = [
  'strict',
  'noUncheckedIndexedAccess',
  'noImplicitOverride',
  'noPropertyAccessFromIndexSignature',
  'noImplicitReturns',
  'noFallthroughCasesInSwitch',
] as const;

/**
 * Options du compilateur Angular exigées — des seuls programmes Angular. Aucune
 * n'est couverte par `strict` : elles vivent dans `angularCompilerOptions` et se
 * règlent séparément. C'est aussi pour cette raison que l'assertion sur
 * `extendedDiagnostics` reste avec elles : hors Angular, l'option n'existe pas
 * et vaudrait `undefined`.
 */
const OPTIONS_ANGULAR = [
  'strictTemplates',
  'typeCheckHostBindings',
  'strictStandalone',
  'strictInjectionParameters',
  'strictInputAccessModifiers',
] as const;

describe('rigueur du compilateur', () => {
  for (const programme of PROGRAMMES) {
    describe(programme, () => {
      const { options, errors } = readConfiguration(join(process.cwd(), programme));
      const estAngular: boolean = (PROGRAMMES_ANGULAR as readonly string[]).includes(programme);

      it('se résout sans erreur de configuration', () => {
        // Attrape les incohérences que le compilateur refuse — par exemple
        // NG4003 : `extendedDiagnostics` configuré alors que `strictTemplates`
        // est désactivé. Sans cette assertion, une telle faute ne se verrait
        // qu'au prochain `ng build`.
        expect(errors.map((erreur) => erreur.messageText)).toEqual([]);
      });

      for (const option of OPTIONS_TYPESCRIPT) {
        it(`active ${option}`, () => {
          expect(options[option]).toBe(true);
        });
      }

      if (estAngular) {
        for (const option of OPTIONS_ANGULAR) {
          it(`active ${option}`, () => {
            expect(options[option]).toBe(true);
          });
        }

        it('traite les diagnostics étendus comme des erreurs', () => {
          // Leur défaut est `warning`. Un avertissement ne casse pas un build :
          // il se noie dans un run vert, et on finit par le tolérer (L-006).
          expect(options.extendedDiagnostics?.defaultCategory).toBe('error');
        });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // La frontière Node — une garantie qui n'était écrite qu'en commentaire
  // ---------------------------------------------------------------------------
  // `tsconfig.spec.json` affirmait que l'application n'inclut pas les types Node,
  // « donc aucune API Node n'est accidentellement atteignable depuis un
  // composant ». C'était faux : `tsconfig.app.json` portait `"types": ["node"]`.
  // Un `process.cwd()` dans un composant passait le typage et cassait au
  // navigateur. La séparation est maintenant affirmée des deux côtés — un
  // commentaire ne protège rien (L-008).
  describe('frontière Node', () => {
    it("n'expose aucun type ambiant à l'application", () => {
      expect(readConfiguration(join(process.cwd(), 'tsconfig.app.json')).options.types).toEqual([]);
    });

    it('expose Node aux seuls tests', () => {
      expect(readConfiguration(join(process.cwd(), 'tsconfig.spec.json')).options.types).toContain(
        'node',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Le contrat du contenu est-il VRAIMENT visible des deux programmes Angular ?
  // ---------------------------------------------------------------------------
  // E2-ST2 (lot A) a rapatrié `tools/content-pipeline/types.d.ts` côté application en
  // l'ajoutant NOMINATIVEMENT à l'`include` de `tsconfig.app.json` et de
  // `tsconfig.spec.json`, plutôt qu'en recopiant le contrat sous `src/` (L-016).
  //
  // POURQUOI CETTE ASSERTION EXISTE ALORS QU'UN RETRAIT CASSERAIT LA COMPILATION.
  // Parce qu'il casserait la compilation D'UN SEUL PROGRAMME À LA FOIS. Retirer
  // l'entrée de `tsconfig.app.json` seul laisse `ng test` intégralement vert — les
  // specs voient encore le contrat — et ne fait rougir que `ng build`, c'est-à-dire un
  // gate d'un autre lot, plusieurs minutes plus tard, sur un message qui parle de
  // `BlocContenu` introuvable sans dire pourquoi. Les deux programmes sont donc
  // vérifiés SÉPARÉMENT, ici, sur les `rootNames` réellement résolus — la liste que
  // `tsc` compile vraiment, `include` déjà déroulé, jamais le texte de la
  // configuration relu par lui-même (L-012).
  describe('contrat du contenu compilé', () => {
    const CONTRAT = 'tools/content-pipeline/types.d.ts';

    for (const programme of PROGRAMMES_ANGULAR) {
      it(`${programme} compile réellement ${CONTRAT}`, () => {
        const { rootNames } = readConfiguration(join(process.cwd(), programme));
        const normalises = rootNames.map((chemin) => chemin.replace(/\\/g, '/'));
        expect(normalises.filter((chemin) => chemin.endsWith(`/${CONTRAT}`))).toHaveLength(1);
      });
    }

    it('n’a AUCUNE copie du contrat sous `src/`', () => {
      // L'autre moitié de la pince. Les assertions ci-dessus prouvent que le contrat
      // est VISIBLE ; celle-ci prouve qu'il est UNIQUE. Une deuxième déclaration de
      // `BlocContenu` sous `src/` compilerait très bien à côté de la première (les
      // types globaux et les types de module cohabitent sans conflit) et divergerait
      // en silence au premier champ ajouté — très exactement L-016.
      // Le nom cherché est ASSEMBLÉ à l'exécution, jamais écrit d'un seul tenant :
      // le motif complet, s'il figurait quelque part dans CE fichier — fût-ce dans
      // un commentaire —, se trouverait lui-même et ferait rougir l'assertion sur
      // son propre texte. Constaté deux fois de suite au premier run, la seconde
      // dans le commentaire qui expliquait la première.
      const nom = ['Bloc', 'Contenu'].join('');
      const declaration = new RegExp(`(?:type|interface)\\s+${nom}\\b`);

      // Contrôle positif : la déclaration existe bel et bien là où on l'attend.
      // Sans lui, « aucune copie sous src/ » resterait vrai d'un contrat effacé.
      expect(declaration.test(readFileSync(join(process.cwd(), CONTRAT), 'utf8'))).toBe(true);

      const racineSrc = join(process.cwd(), 'src');
      const copies = readdirSync(racineSrc, { recursive: true, encoding: 'utf8' })
        .filter((chemin) => chemin.endsWith('.ts'))
        .filter((chemin) => declaration.test(readFileSync(join(racineSrc, chemin), 'utf8')));
      expect(copies).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Vérifier la bonne cible — sinon le test garde un fichier que personne ne compile
  // ---------------------------------------------------------------------------
  // `PROGRAMMES` est écrit en dur ci-dessus, mais c'est `angular.json` qui décide
  // quel tsconfig `ng build` et `ng test` compilent RÉELLEMENT. Repointer une
  // cible vers un troisième fichier laisserait tout ce qui précède vert pendant
  // que le build tournerait sous une configuration laxiste — la forme même de
  // L-012, sur l'autre axe.
  it('ne compile aucun programme échappant à ces vérifications', () => {
    const espaceTravail: {
      projects: Record<string, { architect?: Record<string, { options?: { tsConfig?: string } }> }>;
    } = JSON.parse(readFileSync(join(process.cwd(), 'angular.json'), 'utf8'));

    const declares = Object.values(espaceTravail.projects)
      .flatMap((projet) => Object.values(projet.architect ?? {}))
      .map((cible) => cible.options?.tsConfig)
      .filter((chemin): chemin is string => chemin !== undefined);

    // `PROGRAMMES_ANGULAR`, et non `PROGRAMMES` : `tsconfig.tools.json` n'est PAS
    // soumis aux options du compilateur Angular (il n'en a aucune). L'accepter ici
    // laisserait `angular.json` pointer une cible `ng` dessus en restant vert —
    // c'est-à-dire compiler l'application sans `strictTemplates`.
    const verifies: readonly string[] = PROGRAMMES_ANGULAR;
    expect(declares.length).toBeGreaterThan(0);
    expect(declares.filter((chemin) => !verifies.includes(chemin))).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Le programme outillage est le seul que `angular.json` ne connaît pas
  // ---------------------------------------------------------------------------
  // Le test ci-dessus ferme la porte pour `ng build` et `ng test`, parce que leur
  // cible est DÉCLARÉE dans `angular.json`. `tsconfig.tools.json` n'y figure pas
  // et n'y figurera jamais : il est lancé par un script npm, appelé par la CI.
  // Sans les cinq assertions qui suivent, il pourrait exister, être parfait, et
  // ne jamais tourner — un gate livré mais non câblé (L-007), donc un vert qui ne
  // prouve rien (L-005). Le maillon vérifié va bout en bout : le tsconfig est
  // rigoureux ET vérifie bien du JS, il contient BIEN le fichier qui motive tout
  // le lot, le script npm vise bien CE tsconfig, et les DEUX workflows appellent
  // bien CE script.
  //
  // Tout se lit AU DISQUE, jamais par import (L-012) : un test qui importerait la
  // valeur qu'il contrôle ne prouverait que la cohérence d'un fichier avec
  // lui-même. `package.json` et les `.yml` sont précisément les fichiers qui ne se
  // compilent pas avec ce spec — c'est là que le contrat peut se rompre en silence.
  describe('câblage du programme outillage', () => {
    const PROGRAMME_OUTILS = 'tsconfig.tools.json';
    const SCRIPT_NPM = 'typecheck:tools';
    const WORKFLOWS = ['ci.yml', 'deploy.yml'] as const;
    const NOM_ETAPE = 'G-typage-outils';

    /**
     * Les fichiers dont on EXIGE qu'ils soient réellement compilés. La liste peut GRANDIR
     * librement — `tsconfig.tools.json` fait entrer l'outillage par lots — mais elle ne peut pas
     * RÉTRÉCIR : chaque entrée est un outil qui décide de quelque chose d'irréversible.
     *
     * `generer-config-swa.mjs` écrit la politique de sécurité du site. Les trois suivants forment
     * le pipeline de contenu d'E2-ST1 : `valider.mjs` décide si une leçon entre dans le site,
     * `compiler-markdown.mjs` décide de ce que le navigateur en reçoit, et `types.d.ts` est le
     * CONTRAT que les deux — plus E2-ST2/ST4/ST6 — partagent. Le `.d.ts` mérite son entrée pour
     * une raison propre : ne portant que des déclarations globales, son absence du programme ne
     * casserait aucun import. Elle ferait retomber tout le contrat en `any` sous un `tsc` vert,
     * qui est très exactement le gate vide de L-005.
     */
    const FICHIERS_EPINGLES = [
      'tools/content-pipeline/build.mjs',
      'tools/content-pipeline/compiler-markdown.mjs',
      'tools/content-pipeline/generer-manifeste.mjs',
      'tools/content-pipeline/rendre-mermaid.mjs',
      'tools/content-pipeline/types.d.ts',
      'tools/content-pipeline/valider.mjs',
      'tools/content-pipeline/verifier-poids.mjs',
      'tools/deploiement/generer-config-swa.mjs',
    ] as const;

    it('vérifie réellement le JavaScript, et pas seulement le TypeScript', () => {
      // `allowJs` fait ENTRER les `.mjs` dans le programme, `checkJs` les fait
      // VÉRIFIER. Sans le second, `tsc` parcourt les fichiers, n'en dit rien et
      // sort en 0 : le gate le plus vert du dépôt, et le plus vide.
      const { options } = readConfiguration(join(process.cwd(), PROGRAMME_OUTILS));
      expect(options.allowJs).toBe(true);
      expect(options.checkJs).toBe(true);
    });

    for (const fichier of FICHIERS_EPINGLES) {
      it(`compile réellement ${fichier}`, () => {
        // L'assertion précédente ne dit RIEN du périmètre : vider l'`include` de
        // `tsconfig.tools.json`, ou le repointer ailleurs, laisse `allowJs` et
        // `checkJs` à true, le script npm intact, les deux workflows verts — et
        // `tsc` sort en 0 sur ZÉRO fichier. Le gate le plus vide, déplacé d'un cran
        // (L-005). Les `rootNames` sont la liste que `tsc` compile vraiment,
        // `include`/`exclude`/`files` déjà résolus — pas le texte de la
        // configuration relu par lui-même (L-012).
        const { rootNames } = readConfiguration(join(process.cwd(), PROGRAMME_OUTILS));
        const normalises = rootNames.map((chemin) => chemin.replace(/\\/g, '/'));
        expect(normalises.filter((chemin) => chemin.endsWith(`/${fichier}`))).toHaveLength(1);
      });
    }

    it(`expose un script npm « ${SCRIPT_NPM} » qui vise ce programme`, () => {
      const manifeste: { scripts?: Record<string, string> } = JSON.parse(
        readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
      );
      expect(manifeste.scripts?.[SCRIPT_NPM] ?? '').toContain(PROGRAMME_OUTILS);
    });

    for (const workflow of WORKFLOWS) {
      it(`est appelé par ${workflow}`, () => {
        // Les deux workflows rejouent les mêmes gates : un gate câblé dans l'un
        // et pas l'autre laisse partir en ligne du code moins vérifié que ce qui
        // passe en PR (L-007). D'où une assertion par workflow, et non une seule
        // qui se contenterait du premier trouvé.
        // Et on asserte la PAIRE — le nom de l'étape ET la ligne `run:` réelle.
        // Un simple `toContain` passerait sur une étape mise en commentaire
        // (« # run: npm run typecheck:tools »), c'est-à-dire sur un gate
        // désactivé : exactement la panne (L-007) que cette assertion existe
        // pour attraper. L'ancrage `^\s+run:` exige une directive YAML vivante.
        const contenu = readFileSync(
          join(process.cwd(), '.github', 'workflows', workflow),
          'utf8',
        );
        // `\r?$` et non `$` : les `.yml` du dépôt sont en CRLF, et `$` en mode
        // multiligne s'ancre avant le `\n`, donc APRÈS le `\r`. Sans le `\r?`,
        // l'assertion échouerait ici sur un fichier pourtant correct.
        expect(contenu).toContain(`- name: ${NOM_ETAPE}`);
        expect(contenu).toMatch(new RegExp(`^[ \\t]+run: npm run ${SCRIPT_NPM}\\r?$`, 'm'));
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Le programme de bout en bout — L-014, exactement la même panne, un cran plus loin
  // ---------------------------------------------------------------------------
  // `tsconfig.e2e.json` reproduisait trait pour trait la situation qui a produit
  // L-014 : un tsconfig rigoureux, un script npm, les DEUX workflows qui
  // l'appellent — et rien, nulle part, qui asserte ce qu'il vérifie RÉELLEMENT.
  // Vider ou repointer son `include` laisse `tsc -p tsconfig.e2e.json` sortir en 0
  // sur ZÉRO fichier : les specs qui portent tout le clavier, tout le focus et la
  // seule mesure de CSP à l'exécution du dépôt — plus les modules d'aide où cette
  // mesure vit désormais — cesseraient d'être typés sans qu'aucun run ne rougisse.
  // ⚠️ AUCUN NOMBRE DANS CETTE PROSE, ET C'EST DÉLIBÉRÉ (constat de revue du lot C,
  // E2-ST4) : elle en portait deux, tous deux périmés dès l'entrée du spec suivant,
  // et ils avaient survécu à la correction du paragraphe voisin. La SOURCE DE
  // VÉRITÉ est `FICHIERS_EPINGLES` ci-dessous et son assertion miroir
  // (`toHaveLength(FICHIERS_EPINGLES.length)`), qui rougit toute seule.
  // Le bloc ci-dessous est calqué sur celui du programme
  // outillage, pour la même raison et avec la même exigence de bout en bout : le
  // périmètre est épinglé NOMMÉMENT, le script npm vise bien ce tsconfig, et les
  // deux workflows appellent bien ce script.
  //
  // Tout se lit AU DISQUE (L-012) : `package.json` et les `.yml` sont précisément
  // les fichiers qu'aucune compilation de ce spec ne touche.
  describe('câblage du programme de bout en bout', () => {
    const PROGRAMME_E2E = 'tsconfig.e2e.json';
    const SCRIPT_TYPAGE = 'typecheck:e2e';
    const SCRIPT_SUITE = 'e2e';
    const WORKFLOWS = ['ci.yml', 'deploy.yml'] as const;
    const NOM_ETAPE = 'G-e2e';

    /**
     * Le périmètre attendu, à l'unité près. `playwright.config.ts` en fait partie :
     * il vit à la racine, donc hors de `src/` et de `tools/` — sans ce programme,
     * le fichier qui décide QUEL SERVEUR sert l'artéfact ne serait vérifié par
     * personne (L-008).
     *
     * Le compte est épinglé lui aussi : un spec ajouté demain fait rougir cette
     * ligne, et c'est voulu. Inscrire un spec ici coûte une ligne ; ne pas
     * l'inscrire coûterait la découverte, dans six mois, qu'un fichier entier
     * échappait au typage.
     *
     * ✅ IL A MORDU — E2-ST3, lot E, 2026-08-18. Les six entrées neuves ci-dessous
     * sont arrivées ensemble, et c'est ce test qui les a fait constater : `npm test`
     * a rougi sur « expected 12 to have a length of 6 » avant qu'aucun humain n'ait
     * remarqué que six fichiers venaient d'entrer dans le programme. Le mode
     * d'échec que le commentaire annonçait était donc réel, et le gate n'était pas
     * décoratif.
     *
     * ⚠️ LES QUATRE `e2e/aides/*.ts` NE SONT PAS DES SPECS, ET ILS SONT ÉPINGLÉS
     * QUAND MÊME — c'est le point le plus important de cette liste depuis le lot E.
     * Ce sont eux qui portent désormais la MESURE elle-même : `indicateur-focus.ts`
     * décide ce qu'est « un anneau de focus dessiné » pour trois fichiers,
     * `sonde-csp.ts` porte les trois collecteurs de violations et l'exigence de CSP
     * servie pour deux autres, `hydratation.ts` définit le point de départ commun
     * de tout ce qui s'exécute sur la page de leçon, et `artefact-mesure.ts` décide
     * si les specs de la page de leçon ont un SUJET — c'est lui qui les saute quand
     * l'artéfact mesuré est celui de production, et un défaut chez lui rendrait ce
     * saut universel ou nul sans qu'aucun appelant s'en aperçoive (le mode d'échec
     * qui a rendu `deploy.yml` rouge sur dix specs, PR #17). Un défaut de typage y serait
     * strictement invisible depuis les specs qui les appellent, et il ferait passer
     * VERTS les gates les plus structurants du dépôt. Les mutualiser (L-016) a
     * déplacé le risque : cette liste est l'endroit où on le rattrape.
     */
    const FICHIERS_EPINGLES = [
      'e2e/aides/artefact-mesure.ts',
      'e2e/aides/hydratation.ts',
      'e2e/aides/indicateur-focus.ts',
      'e2e/aides/sonde-csp.ts',
      'e2e/bascule-theme.spec.ts',
      'e2e/cibles-pointeur.spec.ts',
      'e2e/defileurs-clavier.spec.ts',
      'e2e/focus-visible.spec.ts',
      'e2e/navigation-clavier.spec.ts',
      'e2e/parcours-clavier-quiz.spec.ts',
      'e2e/quiz-pre-hydratation.spec.ts',
      'e2e/quiz-sous-csp.spec.ts',
      'e2e/skip-link.spec.ts',
      'playwright.config.ts',
    ] as const;

    const { rootNames } = readConfiguration(join(process.cwd(), PROGRAMME_E2E));
    const normalises = rootNames.map((chemin) => chemin.replace(/\\/g, '/'));

    for (const fichier of FICHIERS_EPINGLES) {
      it(`compile réellement ${fichier}`, () => {
        expect(normalises.filter((chemin) => chemin.endsWith(`/${fichier}`))).toHaveLength(1);
      });
    }

    it('ne compile RIEN d’autre que ces fichiers', () => {
      // L'assertion miroir des précédentes : elles interdisent qu'un fichier
      // épinglé disparaisse du programme, celle-ci interdit qu'un fichier y entre
      // sans être épinglé — donc sans que personne ait constaté qu'il est typé.
      expect(normalises).toHaveLength(FICHIERS_EPINGLES.length);
    });

    it(`expose un script npm « ${SCRIPT_TYPAGE} » qui vise ce programme`, () => {
      const manifeste: { scripts?: Record<string, string> } = JSON.parse(
        readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
      );
      expect(manifeste.scripts?.[SCRIPT_TYPAGE] ?? '').toContain(PROGRAMME_E2E);
    });

    it(`le script « ${SCRIPT_SUITE} » type les specs AVANT de les exécuter`, () => {
      // Playwright transpile sans vérifier : lancer `playwright test` seul ferait
      // du typage un gate facultatif, que personne n'exécuterait jamais. C'est
      // l'enchaînement qui le rend obligatoire, et c'est donc lui qu'on épingle.
      const manifeste: { scripts?: Record<string, string> } = JSON.parse(
        readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
      );
      expect(manifeste.scripts?.[SCRIPT_SUITE] ?? '').toContain(`npm run ${SCRIPT_TYPAGE}`);
    });

    for (const workflow of WORKFLOWS) {
      it(`est appelé par ${workflow}`, () => {
        const contenu = readFileSync(join(process.cwd(), '.github', 'workflows', workflow), 'utf8');
        // L'étape était un bloc `run: |` multiligne tant qu'elle installait
        // elle-même chromium ; depuis E2-ST1 (lot 4), cette installation est
        // remontée avant la compilation de `content/` — `rendre-mermaid.mjs`
        // partage le MÊME navigateur — et l'étape n'exécute plus qu'une commande.
        // L'ancrage accepte donc les deux formes : `run: npm run e2e` sur la
        // directive, ou la ligne seule dans un bloc, pour que ce spec survive à un
        // futur ajout de commande sans devenir muet. `\r?$` parce que les `.yml`
        // du dépôt sont en CRLF (L-015), et `$` en multiligne s'ancre APRÈS le `\r`.
        expect(contenu).toContain(`- name: ${NOM_ETAPE}`);
        expect(contenu).toMatch(
          new RegExp(`^[ \\t]+(?:run: )?npm run ${SCRIPT_SUITE}\\r?$`, 'm'),
        );
      });
    }
  });
});
