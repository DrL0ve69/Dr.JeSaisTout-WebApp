// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const sonarjs = require('eslint-plugin-sonarjs');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    // Les tests de bout en bout et la config Playwright sont du TypeScript, mais
    // pas de l'Angular : aucun composant, aucun gabarit, aucun décorateur. Leur
    // appliquer `angular.configs.tsRecommended` ferait tourner des règles qui
    // n'ont rien à inspecter — et surtout `processInlineTemplates`, qui cherche
    // des gabarits inline dans des fichiers qui n'en contiennent jamais. Ils ont
    // leur propre bloc plus bas.
    ignores: ['e2e/**/*.ts', 'playwright.config.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
  // Outillage Node de `tools/` — les GATES eux-mêmes (génération de la config SWA,
  // gate de contraste, recherche KB). Ils n'étaient lintés par personne : le
  // `lintFilePatterns` d'`angular.json` s'arrête à `src/`, et un gate non vérifié
  // est exactement le genre de code où une faute passe inaperçue.
  // `npm run lint` enchaîne donc `ng lint` puis `eslint tools`.
  //
  // Les globals Node sont déclarés à la main plutôt que via le paquet `globals` :
  // aucune dépendance nouvelle (`.claude/rules/budget-free-tier.md`), et la liste
  // dit explicitement quelle surface d'exécution ces scripts s'autorisent.
  {
    files: ['tools/**/*.mjs'],
    extends: [eslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        Buffer: 'readonly',
        structuredClone: 'readonly',
      },
    },
    rules: {
      // Hors de `recommended`, mais c'est exactement la faute trouvée en revue
      // (`let ratioMin` jamais réaffecté) : on la fait détecter, pas juste corriger.
      'prefer-const': 'error',
      'no-var': 'error',
      // `ignoreRestSiblings` aligne ces fichiers sur le défaut de typescript-eslint, qui
      // gouverne déjà tout `src/`. Sans lui, la façon idiomatique d'OMETTRE une propriété
      // — `const { champ, ...reste } = objet` — est signalée comme variable inutilisée,
      // ce qui pousse vers un `delete` sur une copie, moins lisible et moins bien typé.
      // Le cas réel du dépôt : `emettreQuestion` retire `ficheSource` à l'émission du quiz.
      'no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },
  // ===========================================================================
  // SonarJS — un MIROIR PARTIEL de SonarCloud, mais AVANT le push
  // ---------------------------------------------------------------------------
  // POURQUOI CE BLOC EXISTE. SonarCloud tourne en analyse AUTOMATIQUE (app
  // GitHub) : ses constats n'arrivent qu'une fois la PR poussée, et
  // `.sonarcloud.properties` n'accepte AUCUN réglage au niveau règle — son propre
  // en-tête l'énumère, `sonar.issue.ignore.multicriteria` n'en fait pas partie.
  // Un faux positif s'y clôt donc à la main, dans une interface tierce, sans
  // trace dans le dépôt. La PR #12 a ouvert 43 constats qu'aucun gate local ne
  // pouvait voir — et sa porte qualité est tombée sur UNE seule condition,
  // `new_reliability_rating` à D, tenue par les NEUF `.sort()` sans comparateur
  // (S2871, classés bugs). Le reste était du code smell, maintenabilité déjà en A.
  //
  // `eslint-plugin-sonarjs` porte les règles JS/TS de SonarCloud en plugin ESLint,
  // avec les mêmes numéros S____, exécutées par `npm run lint`. Deux gains, et
  // c'est ce qui justifie la dépendance :
  //   1. le constat tombe dans G-lint, avant le commit — pas après le push ;
  //   2. une règle inadaptée au projet s'éteint ICI, revue dans un diff.
  // Coût (`.claude/rules/budget-free-tier.md`) : gratuit, sans clé, sans compte,
  // `devDependencies` seulement — `npm audit --omit=dev` reste à 0.
  //
  // ⚠️ CE MIROIR EST PARTIEL, ET LE DIRE FAIT PARTIE DU GARDE-FOU. Mesure du
  // 2026-08-17 : la version 4.2.0 publie **279 règles**, et QUATRE règles que
  // SonarCloud exécute n'en font pas partie — S7718 (nommage du paramètre de
  // `catch`), S7747 (itérable copié sans raison), S7755 (`X[X.length - n]` →
  // `X.at(-n)`) et S6557 (`String#startsWith`). Dix des constats de la PR #12 en
  // venaient : ils ne rougiront JAMAIS en local, quelle que soit la portée.
  // Conséquence assumée : ce bloc RÉDUIT l'aller-retour avec SonarCloud, il ne le
  // SUPPRIME pas — l'autorité reste la porte qualité de la PR. Une justification
  // qui promettrait « mêmes règles » ferait exactement ce que S-009 reproche : un
  // texte plus fort que ce que le code applique.
  //
  // POURQUOI LE PARSEUR TYPÉ, ET PAS LE PARSEUR JS PAR DÉFAUT. Sans types,
  // `sonarjs/no-alphabetical-sort` ne tire PAS : elle ne sait pas si le tableau
  // trié contient des chaînes. C'est précisément la règle qui a fait tomber la
  // note de fiabilité de la PR #12 en D. Un miroir local qui rate la règle qui
  // casse la porte ne miroite rien (L-005) : on branche donc `tsconfig.tools.json`
  // — celui qui porte déjà `checkJs`.
  //
  // POURQUOI LA PORTÉE S'ARRÊTE À `content-pipeline`. Ce n'est pas un demi-gate
  // (L-007) mais la contrainte du programme de types, exactement comme la liste
  // NOMINATIVE d'`include` dans `tsconfig.tools.json` : un fichier hors de ce
  // programme fait échouer le lint typé sur « file not found in project ». Or
  // `tools/design/verifier-{contrastes,glyphes}.mjs` en sont encore absents (34 et
  // 35 erreurs de typage, dette inscrite au backlog). La portée grandira avec le
  // programme, pas avant — et elle grandira SEULE, sans toucher ce fichier, parce
  // qu'elle est exprimée en glob sur un dossier entièrement couvert.
  // ===========================================================================
  {
    files: ['tools/content-pipeline/**/*.mjs'],
    plugins: sonarjs.configs.recommended.plugins,
    settings: sonarjs.configs.recommended.settings,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.tools.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      ...sonarjs.configs.recommended.rules,
    },
  },
  // Tests de bout en bout (`e2e/`) et harnais Playwright. Même motif que le bloc
  // `tools/` juste au-dessus : `lintFilePatterns` d'`angular.json` s'arrête à
  // `src/`, donc ces fichiers n'étaient lintés par PERSONNE. `npm run lint`
  // enchaîne désormais `ng lint`, `eslint tools` et `eslint e2e
  // playwright.config.ts`.
  //
  // Règles JS + TypeScript recommandées, sans le volet Angular (voir l'`ignores`
  // du premier bloc). `stylistic` est volontairement écarté : ses règles visent la
  // cohérence d'un code applicatif, pas celle de specs qui se lisent comme des
  // scénarios.
  {
    files: ['e2e/**/*.ts', 'playwright.config.ts'],
    extends: [eslint.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      // `process.env.CI` dans la config Playwright — elle s'exécute côté Node.
      // Les specs, eux, ne touchent au DOM que dans des rappels transmis au
      // navigateur : aucun global de navigateur n'est légitime à ce niveau.
      globals: { process: 'readonly' },
    },
  },
]);
