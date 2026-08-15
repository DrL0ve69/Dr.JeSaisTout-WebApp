// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

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
