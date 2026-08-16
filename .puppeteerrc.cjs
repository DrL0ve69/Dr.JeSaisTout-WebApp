// =============================================================================
// Configuration Puppeteer du dépôt — un seul réglage, et il vaut ~200 Mo
// -----------------------------------------------------------------------------
// `@mermaid-js/mermaid-cli` (E2-ST1, lot 3) tire `puppeteer`, dont le script
// `install.mjs` télécharge SON PROPRE Chromium — un second navigateur complet, à
// côté de celui que `npm run e2e:install` a déjà posé pour Playwright.
//
// Le nœud 4 de §E2 (`docs/agile/backlog-phase-1.md`) tranche : on réutilise le
// Chromium de Playwright. `tools/content-pipeline/rendre-mermaid.mjs` le localise
// par `chromium.executablePath()` de `@playwright/test` et le passe à mermaid-cli
// en `executablePath` ; il ÉCHOUE en nommant `npm run e2e:install` si ce binaire
// manque, plutôt que de retomber en silence sur un téléchargement.
//
// Ce fichier est la moitié « installation » de la même décision. Il vaut pour
// `npm ci` en CI autant que pour `npm i` en local — un `PUPPETEER_SKIP_DOWNLOAD=1`
// posé dans un shell ne tiendrait ni l'un ni l'autre.
//
// POURQUOI ICI ET PAS DANS `.npmrc`. La clé `puppeteer_skip_download=true` du
// `.npmrc` fonctionne encore, mais npm 11 l'annonce déjà comme condamnée :
// « Unknown project config "puppeteer_skip_download". This will stop working in
// the next major version of npm. » Un garde-fou qui s'éteindra tout seul à la
// prochaine montée de npm n'en est pas un ; `.puppeteerrc.cjs` est la voie que
// Puppeteer documente et qu'il lit lui-même.
//
// ⚠️ Le retirer ne fait rougir aucun gate : il rallonge silencieusement chaque
// installation de ~200 Mo, pour un binaire que rien n'exécute.
//
// CommonJS (`.cjs`) : `package.json` n'a pas de champ `"type"`, mais Puppeteer
// charge ce fichier par `require()` — l'extension le dit explicitement plutôt que
// de dépendre du défaut.
// =============================================================================
module.exports = {
  skipDownload: true,
};
