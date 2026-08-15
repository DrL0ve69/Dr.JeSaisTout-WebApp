// =============================================================================
// Harnais Playwright — le premier VRAI navigateur de ce dépôt
// -----------------------------------------------------------------------------
// POURQUOI CE HARNAIS EXISTE, alors qu'un gate axe tourne déjà.
// `tools/a11y/verifier-axe.mjs` audite le HTML PRERENDU dans jsdom : c'est la
// passe STRUCTURELLE (landmarks, titres, noms accessibles). Elle ne presse aucune
// touche. Or la moitié des critères WCAG 2.2 que ce site prétend tenir sont
// COMPORTEMENTAUX — ordre de tabulation réel, focus qui se déplace et reste
// visible, taille de cible mesurée à la mise en page. jsdom ne calcule ni boîte
// ni ordre de focus : ces critères n'étaient couverts par rien. C'est la dette que
// l'en-tête de `verifier-axe.mjs` nomme explicitement, et que ce harnais rembourse.
//
// ⚠️ SUR LA TAILLE DE CIBLE, LA BARRE EST 24 PX — PAS 44. Deux critères distincts
// portent des noms voisins, et les confondre reviendrait à afficher du AAA sous
// l'étiquette AA dans le dépôt d'un site qui ENSEIGNE l'accessibilité :
//   • 2.5.8 « Taille de cible (minimum) », niveau **AA** — 24 × 24 px CSS : c'est
//     la barre du projet, celle qui fait ROUGIR `cibles-pointeur.spec.ts` ;
//   • 2.5.5 « Taille de cible », niveau **AAA** — 44 × 44 px CSS : hors barre.
//     Ce qui mesure entre les deux est imprimé au journal, à titre informatif.
//
// POURQUOI `swa start` ET NON UN SERVEUR STATIQUE NU (le point décisif).
// Un `http-server dist/…` servirait les MÊMES octets — et manquerait tout
// l'intérêt. `staticwebapp.config.json` est généré DANS l'artéfact par
// `tools/deploiement/generer-config-swa.mjs` : c'est lui qui porte la CSP stricte
// à hachages et les en-têtes de sécurité. Seul `swa start` les applique, parce
// qu'il émule le runtime d'Azure Static Web Apps. Un serveur nu les ignore
// silencieusement, et tout ce qu'une CSP bloque en production passerait vert ici.
//
// C'est exactement le point aveugle qui a produit la leçon S-005 : la CSP avait
// été validée sur une page INERTE ; le premier écouteur d'événement (la bascule
// de thème) a fait injecter par Angular des scripts inline que personne n'avait
// vus. Ce harnais est le premier endroit du projet où un navigateur réel exécute
// la page INTERACTIVE sous une CSP appliquée. Changer ce `command` pour un serveur
// plus rapide reviendrait à rouvrir ce trou — ne pas le faire.
//
// ⚠️ CE QUI EST GARANTI ICI, EXACTEMENT — ET LES TROIS TROUS QUI RESTENT.
// Garanti : la CSP et les en-têtes des `globalHeaders` de
// `staticwebapp.config.json`, tels qu'appliqués aux réponses **200**, en **HTTP
// sur localhost**, sur un SEUL document HTTP : « / ». Les autres routes ne sont
// atteintes que par le routeur, donc sans nouvelle réponse du serveur — leurs
// en-têtes ne sont exercés par aucun spec.
// C'est déjà ce qu'aucun autre gate ne voit, et `bascule-theme.spec.ts` refuse
// désormais de conclure sans avoir constaté l'en-tête sur la réponse. Ce n'est
// PAS « la CSP de production », et l'écrire serait un défaut à part entière dans
// un dépôt qui enseigne la sécurité (L-008/L-016 : une garantie surestimée est
// pire qu'une garantie absente, parce qu'elle dissuade de vérifier).
//   1. LA PAGE 404 EST SERVIE SANS AUCUN EN-TÊTE EN LOCAL. `handleErrorPage`
//      (`dist/msha/middlewares/response.middleware.js`, `handlers/error-page.handler.js`
//      du CLI SWA) n'appelle jamais `updateResponseHeaders` — la production, elle,
//      applique bien la politique. Un spec qui vérifierait la CSP d'une 404 ici
//      constaterait un faux trou.
//   2. LE CLI AJOUTE DES EN-TÊTES QUE LUI SEUL DÉCIDE (HSTS, `Referrer-Policy`,
//      `nosniff` par défaut) : leur PRÉSENCE en local ne prouve pas celle en ligne.
//      Seule la CSP à hachages, absente de tout défaut, est concluante ici.
//   3. HTTP SUR LOCALHOST REND CERTAINES DIRECTIVES INOBSERVABLES par construction :
//      `frame-ancestors` (pas d'encadrement croisé exercé), HSTS (ignoré hors TLS)
//      et `upgrade-insecure-requests`/contenu mixte n'ont ici aucun effet mesurable.
// CE QUE `deploy.yml` RATTRAPE DE CES TROUS — ET CE QU'IL NE RATTRAPE PAS. Les
// étapes « Vérifier les en-têtes servis » et « Vérifier le routage servi » de
// `.github/workflows/deploy.yml` interrogent le site déployé, en TLS : elles
// couvrent entièrement le trou 1 (la vraie page 404 doit porter sa CSP), et
// referment le trou 3 pour les directives LISIBLES — `frame-ancestors 'none'`,
// `object-src 'none'`, `base-uri 'self'`, `upgrade-insecure-requests` et le
// `max-age` de HSTS y sont exigés dans l'en-tête servi, en plus du refus de tout
// `unsafe-inline`/`unsafe-eval`/`strict-dynamic`.
// RESTE NON VÉRIFIÉ, PAR AUCUN GATE, ET C'EST À DIRE PLUTÔT QU'À TAIRE : personne
// n'EXERCE ces directives. Aucune page n'est réellement encadrée dans une iframe
// tierce, aucune sous-ressource en http:// n'est demandée depuis la page servie en
// https://. On vérifie que la politique est ÉCRITE et SERVIE, jamais qu'un
// navigateur l'a APPLIQUÉE sur ces points précis — la seule directive dont
// l'application effective soit prouvée est `script-src`, par le contrôle positif de
// `bascule-theme.spec.ts`. Les deux vérifications restent complémentaires : celle-ci
// presse des touches sans TLS, celle-là lit des en-têtes réels sans presser quoi
// que ce soit.
//
// UN SEUL NAVIGATEUR (chromium). Ce qu'on mesure ici — ordre de tabulation,
// déplacement du focus, taille de cible — relève du comportement standardisé, pas
// des écarts de moteurs. Un second navigateur doublerait la durée du gate et le
// poids du téléchargement pour une couverture quasi nulle. Le jour où un constat
// dépendra réellement du moteur, il justifiera son propre projet.
//
// Prérequis : `npm run build` AVANT `npm run e2e`. Le serveur sert l'artéfact, il
// ne le construit pas — un `dist/` périmé ferait tester la version d'hier.
// =============================================================================

import { defineConfig, devices } from '@playwright/test';

/** Le port par défaut du CLI Static Web Apps ; fixé ici pour que l'URL attendue et la commande ne puissent pas diverger. */
const PORT = 4280;
const URL_BASE = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',

  // `test.only` oublié dans un commit = suite amputée en silence, et verte. En CI
  // c'est donc une erreur ; en local il reste l'outil de mise au point normal.
  forbidOnly: !!process.env['CI'],

  // AUCUNE nouvelle tentative, même en CI. Un gate d'accessibilité qui se rejoue
  // jusqu'à passer transforme une régression intermittente en bruit toléré — la
  // discipline du dépôt est l'inverse (un run vert doit prouver quelque chose).
  retries: 0,

  // Sobre à dessein : `list` écrit dans le journal, ce qui fait foi. Le rapport
  // HTML ouvrirait un navigateur à la fin d'un run local et n'est lu par personne
  // en CI ; il n'est donc pas généré (et `playwright-report/` reste vide).
  reporter: [['list']],

  use: {
    baseURL: URL_BASE,
    // Trace et capture UNIQUEMENT sur échec : le vert ne doit rien écrire sur le
    // disque, le rouge doit être diagnosticable sans rejouer le run.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',

    // `prefers-reduced-motion: reduce` — POUR DEUX RAISONS, et la seconde suffirait.
    //  1. STABILITÉ. `src/styles.scss` active `scroll-behavior: smooth` sous
    //     `@media (prefers-reduced-motion: no-preference)`, et Chromium n'émule
    //     RIEN par défaut : la page défile donc de façon animée. Une boîte lue
    //     juste après un `Tab` (`focus-visible.spec.ts`) peut alors être mesurée
    //     EN PLEIN DÉFILEMENT — vérification de fenêtre faussée, `elementFromPoint`
    //     qui désigne un autre élément. Invisible aujourd'hui parce que la coquille
    //     tient dans la fenêtre ; rouge intermittent dès la première page de contenu
    //     plus haute qu'elle (E2), et sans `retries` pour le masquer.
    //  2. C'EST L'ÉTAT QU'UN GATE D'ACCESSIBILITÉ DOIT MESURER. Le parcours d'une
    //     personne qui a demandé moins de mouvement n'est pas un cas particulier :
    //     c'est celui dont le dépôt promet qu'il fonctionne (WCAG 2.3.3, et le
    //     bloc `m.mouvement-reduit` de `src/styles.scss`). Le mesurer par défaut
    //     ferme aussi la porte à une régression qui ne casserait QUE ce parcours.
    //
    // Sous `contextOptions` et non à la racine de `use` : depuis Playwright 1.6x,
    // `reducedMotion` n'est plus une option de test de premier niveau. Écrit à la
    // racine, il ne provoquait aucun avertissement à l'exécution — c'est
    // `npm run typecheck:e2e` qui l'a refusé (TS2769), et c'est très exactement ce
    // que ce quatrième programme existe pour attraper.
    contextOptions: { reducedMotion: 'reduce' },
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: `npx swa start dist/dr-je-sais-tout/browser --port ${PORT}`,
    url: URL_BASE,
    // En local on réutilise un serveur déjà lancé (itération rapide) ; en CI
    // jamais : un serveur préexistant y serait un vestige d'un autre run, donc un
    // artéfact potentiellement périmé.
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});
