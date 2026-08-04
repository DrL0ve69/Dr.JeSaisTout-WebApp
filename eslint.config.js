// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
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
]);
