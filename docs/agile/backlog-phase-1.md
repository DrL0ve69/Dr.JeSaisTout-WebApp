# Backlog — Phase 1 (cours sécurité web + home)

> **Document central des agents.** Une sous-tâche = **UN livrable vérifiable**, dimensionné pour un
> sous-agent frais **< 150k tokens** (`.claude/rules/agent-context-budget.md`). Le brief d'un agent =
> la **section** de sa sous-tâche (pointeur `ID`), jamais ce document entier.
>
> Conventions : statuts ⬜ à faire · 🟦 en cours · ✅ fait · ⛔ bloqué. Mettre à jour le statut à la
> clôture (agent scribe). Ordre nominal : E0 → E1 → E2 → E3 (parallélisable dès E2-ST4) → E4 → E5.
> Jalons datés : `docs/agile/roadmap.md`. Décisions et spikes : `docs/architecture/stack-et-architecture.md`.

**Gates récurrents** (référencés par sigle) :
- **G-lint** : `ng lint` sans erreur · **G-test** : Vitest vert · **G-build** : `ng build` + prerender sans erreur
- **G-axe** : zéro violation AXE sur les pages touchées · **G-audit** : `npm audit` sans vuln haute/critique
- **G-lecon** : gates du pipeline contenu (`docs/contenu/pipeline-contenu.md`) : gabarit respecté, schémas JSON valides, `verificateur-theorie` sans objection bloquante

---

## E0 · Initialisation du workspace

| ID | Objectif | Statut |
|---|---|---|
| E0-ST1 | Trancher les spikes S-01 / S-02 / S-03 | ✅ |
| E0-ST2 | Workspace Angular 21 + SCSS + eslint + Vitest | ⬜ |
| E0-ST3 | `staticwebapp.config.json` : en-têtes + CSP | ⬜ |
| E0-ST4 | CI GitHub Actions + premier déploiement SWA Free | ⬜ |

### E0-ST1 — Spikes d'architecture (solution-architect)
- **Objectif** : trancher S-01 (pipeline Markdown→HTML au build : marked/Shiki vs autre + intégration prerender), S-02 (CSP stricte sur SWA avec prerender Angular), S-03 (zoneless vs zone.js) ; consigner chaque conclusion en addendum d'ADR.
- **Fichiers** : `docs/architecture/stack-et-architecture.md` (§8 + addendums). Prototypes jetables dans un scratchpad, pas dans le repo.
- **Gates** : chaque spike conclut par une décision motivée + impacts sur E0-ST2/ST3 et E2.
- **Clos le 2026-08-03** : les trois spikes sont tranchés, addendums dans
  `docs/architecture/stack-et-architecture.md` **§9**. Décisions : chaîne `gray-matter` + `markdown-it` +
  `shiki` + `@mermaid-js/mermaid-cli` + `ajv` avec AST de blocs JSON pré-build (S-01) · CSP à hachages
  **générée au build**, `inlineCritical: false` obligatoire (S-02) · **zoneless** par défaut d'Angular 22,
  Vitest fourni par le scaffold (S-03).
- **Reports explicites vers E0-ST3** : constat live de la CSP (`ng-state` en `application/json` non bloqué ;
  hachage `style-src` conforme au flux servi par SWA) et confirmation navigateur que le `foreignObject`
  Mermaid impose le SVG inline plutôt que `<img>`.

### E0-ST2 — Workspace Angular
- **Objectif** : `ng new` Angular 21 standalone, SCSS, eslint (angular-eslint), Vitest, prettier ; config zoneless selon S-03 ; structure `src/app/{core,features,shared}` ; `content/` vide avec `.gitkeep` et README d'un paragraphe.
- **Fichiers** : racine du repo (`angular.json`, `package.json`, `eslint.config.*`, `vitest.config.*`, `src/`), `content/`.
- **Gates** : G-lint, G-test (1 test témoin), G-build, G-audit. Respect `.claude/rules/angular-best-practices.md`.

### E0-ST3 — Config SWA : en-têtes et CSP
- **Objectif** : `staticwebapp.config.json` avec CSP stricte (selon S-02), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors`, routes de fallback prerender ; documentation courte des choix dans le fichier même (commentaires impossibles en JSON → section dans `docs/deployment.md`).
- **Fichiers** : `staticwebapp.config.json`, `docs/deployment.md` (nouveau, court).
- **Gates** : G-build ; en-têtes vérifiés localement via `swa start` ; conformité `.claude/rules/security.md`.

### E0-ST4 — CI/CD GitHub Actions
- **Objectif** : workflow PR (lint → test → build → axe → npm audit) + workflow `main` (idem + déploiement SWA Free) ; page « bientôt » minimaliste en ligne (placeholder sobre, pas la vraie home).
- **Fichiers** : `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, secret `AZURE_STATIC_WEB_APPS_API_TOKEN` (manuel, propriétaire).
- **Gates** : les deux workflows verts ; URL `*.azurestaticapps.net` répond avec les en-têtes E0-ST3. Zéro dépense (`.claude/rules/budget-free-tier.md`).

---

## E1 · Design system & app shell

| ID | Objectif | Statut |
|---|---|---|
| E1-ST1 | Jetons SCSS + thèmes clair/sombre | ⬜ |
| E1-ST2 | Layout, navigation, pied de page | ⬜ |
| E1-ST3 | Home « carnet de laboratoire » | ⬜ |

### E1-ST1 — Jetons sémantiques SCSS
- **Objectif** : design system 3 couches (primitives → sémantiques → composants) en SCSS + custom properties ; thèmes clair (papier ivoire) et sombre (ardoise encrée) tous deux dessinés ; échelles typo/espacement ; couleurs sémantiques dont `danger-vuln` / `ok-fixed` ; service de bascule de thème (persisté, `prefers-color-scheme` par défaut) ; `prefers-reduced-motion` outillé (mixin).
- **Fichiers** : `src/styles/` (`_tokens.scss`, `_themes.scss`, `_mixins.scss`…), `src/app/core/theme/`.
- **Référence** : `docs/design/direction-visuelle.md` (garde-fous G1–G9 bloquants).
- **Gates** : G-lint, G-build ; contrastes AA vérifiés sur les paires de jetons ; G-test sur le service de thème.

### E1-ST2 — Layout & navigation
- **Objectif** : shell applicatif (header avec logotype typographique, nav, bascule de thème, footer), squelette de routes (`/`, `/cours/securite-web`, `/cours/securite-web/:slug`), page 404, skip-link, landmarks ARIA.
- **Fichiers** : `src/app/core/layout/`, `src/app/app.routes.ts`.
- **Gates** : G-lint, G-test, G-build, G-axe (navigation clavier complète).

### E1-ST3 — Home
- **Objectif** : page d'accueil appliquant la direction « carnet de laboratoire » : présentation du Dr. Je-Sais-Tout, carte du cours sécurité web avec lien, un seul CTA. **Maquette via le skill `frontend-design` d'abord**, implémentation ensuite.
- **Fichiers** : `src/app/features/home/`.
- **Gates** : G-lint, G-test, G-build, G-axe ; revue contre `docs/design/direction-visuelle.md` §3 ; page prerendue.

---

## E2 · Moteur de contenu

| ID | Objectif | Statut |
|---|---|---|
| E2-ST1 | Pipeline build `content/` → HTML/JSON + routes prerendues | ⬜ |
| E2-ST2 | Rendu des leçons (page leçon + routage) | ⬜ |
| E2-ST3 | `QuizComponent` + score localStorage | ⬜ |
| E2-ST4 | `CodeCompareComponent` | ⬜ |
| E2-ST5 | `SimulationComponent` | ⬜ |
| E2-ST6 | Page sommaire du cours + progression localStorage | ⬜ |

### E2-ST1 — Pipeline de contenu au build
- **Objectif** : implémentation de la conclusion S-01 : script de build qui valide `content/cours/securite-web/**` (frontmatter, schémas JSON quiz/simulation — gabarits de `docs/contenu/pipeline-contenu.md`), compile Markdown→HTML (coloration précompilée PHP/C#/TS, encadrés ⚠️/note/à-retenir), génère la liste des routes à prerendre. Build échoue si contenu invalide.
- **Fichiers** : `tools/content-pipeline/`, `content/cours/securite-web/` (leçon-témoin factice), `angular.json` (hook prerender).
- **Gates** : G-build (avec la leçon-témoin) ; test du pipeline (contenu invalide → échec explicite) ; G-lint.

### E2-ST2 — Page leçon & routage
- **Objectif** : route `/cours/securite-web/:slug` prerendue consommant la sortie du pipeline ; gabarit de leçon (en-tête de module « page de garde », sommaire ancré, prev/next, méta SEO/OpenGraph) ; zéro parseur Markdown au runtime.
- **Fichiers** : `src/app/features/cours/lecon/`.
- **Gates** : G-lint, G-test, G-build (leçon-témoin prerendue), G-axe.

### E2-ST3 — QuizComponent
- **Objectif** : quiz piloté par JSON (choix multiple, vrai/faux, mise en situation) ; correction expliquée par question ; score et état persistés en `localStorage` ; entièrement clavier/lecteur d'écran.
- **Fichiers** : `src/app/features/cours/quiz/`, schéma JSON dans `tools/content-pipeline/schemas/`.
- **Gates** : G-lint, G-test (logique de scoring), G-build, G-axe.

### E2-ST4 — CodeCompareComponent
- **Objectif** : affichage côte à côte (empilé en mobile) vulnérable/corrigé avec annotations ancrées aux lignes, onglets de langage (PHP/C#/TS), coloration précompilée au build ; couleurs `danger-vuln`/`ok-fixed` des jetons.
- **Fichiers** : `src/app/features/cours/code-compare/`, schéma JSON associé.
- **Gates** : G-lint, G-test, G-build, G-axe (annotations accessibles, pas de sens porté par la couleur seule).

### E2-ST5 — SimulationComponent
- **Objectif** : simulation pas-à-pas visuelle pilotée par un JSON d'étapes (acteurs : navigateur/attaquant/serveur ; états ; flèches/messages) ; contrôles précédent/suivant/réinitialiser ; variante `prefers-reduced-motion` sans animation.
- **Fichiers** : `src/app/features/cours/simulation/`, schéma JSON associé.
- **Gates** : G-lint, G-test, G-build, G-axe.

### E2-ST6 — Sommaire du cours & progression
- **Objectif** : page `/cours/securite-web` : les 13 modules dans l'ordre de lecture (sections Fondations / Attaques / Identités & données / Hébergement), état par module (non commencé / lu / quiz réussi) depuis `localStorage`, temps de lecture estimé.
- **Fichiers** : `src/app/features/cours/sommaire/`, `src/app/core/progression/`.
- **Gates** : G-lint, G-test (service progression), G-build, G-axe.

---

## E3 · Production du cours sécurité web (13 modules)

**Processus commun à chaque sous-tâche** : skill **`/lecon`** (`professeur-web` rédige →
`verificateur-theorie` contrôle) à partir de la fiche KB source (lecture seule sur
`C:\Users\phili\ProjetsPortfolio\KnowledgeBase\web\securite\`). Livrable : `content/cours/securite-web/NN-slug/`
(leçon `.md` + `quiz.json` + `simulation.json` si indiqué). Exemples de code en PHP **et** C#/TS
comme les fiches. Conserver les encadrés ⚠️ « cours vs état de l'art » (matière d'examen).
**Gates communs** : G-lecon, G-build, G-axe sur la page prerendue. **Déploiement dès le gate vert**
(un module = une PR = une mise en ligne). Ordre = ordre du cours de l'auteur (août : fondamentaux →
injection → XSS d'abord).

### Bloc A — Fondations & familles d'attaques *(cible : en ligne mi-septembre, J4)*

| ID | Module (`NN-slug`) | Fiche KB source | Simulation | Statut |
|---|---|---|---|---|
| E3-ST1 | `01-fondamentaux` — Fondamentaux de la sécurité web (faille/exploit/0-day, CVE/CWE, OWASP Top 10 2021 **et** 2025, kill chain, types de tests) | `fondamentaux-securite-web.md` | non — schéma kill chain statique | ⬜ |
| E3-ST2 | `02-evaluation-cvss` — Évaluation des vulnérabilités (CVSS v3.1/v4.0, EPSS, KEV) ; quiz = les 6 mises en situation corrigées du cours (matière d'examen) | `evaluation-vulnerabilites-cvss.md` | non — calculateur de scénario dans le quiz | ⬜ |
| E3-ST3 | `03-injection` — Injection SQL, commande, XXE, NoSQL ; requêtes paramétrées | `injection.md` | **oui** : déroulé d'une SQLi (entrée → requête → fuite) | ⬜ |
| E3-ST4 | `04-xss` — XSS réfléchi/stocké/DOM ; encodage de sortie contextuel | `xss-cross-site-scripting.md` | **oui** : script injecté exécuté chez la victime | ⬜ |
| E3-ST5 | `05-csrf` — CSRF ; token anti-CSRF + SameSite ; limite si XSS présent | `csrf.md` | **oui** : requête forgée depuis un site tiers | ⬜ |
| E3-ST6 | `06-controle-acces` — Contrôle d'accès, IDOR, élévation de privilèges, mass assignment | `controle-acces-idor.md` | **oui** : IDOR par manipulation d'identifiant | ⬜ |
| E3-ST7 | `07-inclusion-ssrf` — Path traversal, LFI/RFI, SSRF (métadonnées cloud) | `inclusion-fichiers-ssrf.md` | **oui** : SSRF vers l'endpoint de métadonnées | ⬜ |

### Bloc B — Identités & données *(cible : ~12 octobre, J5)*

| ID | Module (`NN-slug`) | Fiche KB source | Simulation | Statut |
|---|---|---|---|---|
| E3-ST8 | `08-cryptographie` — Encoder vs chiffrer vs hacher ; symétrique/asymétrique ; signature | `cryptographie-appliquee.md` | non — diagrammes comparatifs | ⬜ |
| E3-ST9 | `09-mots-de-passe` — Salt aléatoire, Argon2id, pourquoi MD5+salt ne suffit pas | `stockage-mots-de-passe.md` | **oui** : fuite de BD, hachages faibles vs Argon2id | ⬜ |
| E3-ST10 | `10-authentification` — Énumération, brute force, credential stuffing ; rate limiting, MFA, politique NIST | `authentification-failles.md` | **oui** : credential stuffing pas-à-pas | ⬜ |
| E3-ST11 | `11-sessions-cookies` — HttpOnly/Secure/SameSite, vol et fixation de session | `sessions-cookies-securite.md` | **oui** : fixation de session | ⬜ |
| E3-ST12 | `12-jwt` — Signé ≠ chiffré ; `alg:none`, confusion RS256/HS256, révocation | `jwt-securite.md` | **oui** : attaque `alg:none` | ⬜ |

### Bloc C — Hébergement *(cible : ~19 octobre, J6)*

| ID | Module (`NN-slug`) | Fiche KB source | Simulation | Statut |
|---|---|---|---|---|
| E3-ST13 | `13-durcissement-serveur` — Config Apache/PHP/MySQL, en-têtes de sécurité HTTP, WAF, moindre privilège ; **pont pédagogique : les en-têtes réels de CE site comme étude de cas** | `durcissement-serveur-web.md` | non — inspection guidée des en-têtes du site | ⬜ |

> Découpe budget : si un module + sa simulation menacent les 150k, scinder en (a) leçon+quiz via
> `/lecon` puis (b) `simulation.json` + intégration par un agent frais. La colonne Simulation est
> l'option à couper en premier en cas de retard (roadmap, chemin critique).

---

## E4 · Qualité & mise en ligne

| ID | Objectif | Statut |
|---|---|---|
| E4-ST1 | Audit accessibilité complet | ⬜ |
| E4-ST2 | Audit sécurité du site | ⬜ |
| E4-ST3 | Performance / Lighthouse / SEO | ⬜ |
| E4-ST4 | Revue de déploiement & DNS | ⬜ |

### E4-ST1 — Audit a11y (agent de vérification dédié)
- **Objectif** : passage AXE sur **toutes** les pages prerendues + parcours clavier/lecteur d'écran des 3 composants pédagogiques ; constats `fichier:ligne` ; correctifs par agents frais.
- **Fichiers** : rapport dans `docs/audits/a11y-phase1.md` ; correctifs dans `src/`.
- **Gates** : zéro violation AXE, WCAG 2.2 AA ; G-build après correctifs.

### E4-ST2 — Audit sécurité (skill `/security-audit`, boucle security-auditor/reviewer/mentor)
- **Objectif** : audit du site déployé (en-têtes effectifs, CSP réelle, absence de fuites) + revue `staticwebapp.config.json` + chaîne d'approvisionnement (G-audit, lockfile) ; le site doit exemplifier son propre cours.
- **Fichiers** : rapport dans `docs/audits/securite-phase1.md` ; correctifs ciblés.
- **Gates** : CSP sans `unsafe-inline`, G-audit, `.claude/rules/security.md` respectée.

### E4-ST3 — Performance & SEO
- **Objectif** : Lighthouse ≥ 90 (4 catégories) sur home, sommaire et 2 leçons types ; budgets de bundle en CI ; sitemap.xml + robots.txt + méta OG générés au build.
- **Fichiers** : `angular.json` (budgets), `tools/content-pipeline/` (sitemap), rapport `docs/audits/perf-phase1.md`.
- **Gates** : scores atteints et consignés ; G-build.

### E4-ST4 — Déploiement final & DNS
- **Objectif** : vérification de bout en bout de l'URL publique (`*.azurestaticapps.net` par défaut — domaine personnalisé **seulement** sur accord explicite du propriétaire, cf. budget) ; page 404 servie correctement ; checklist de publication dans `docs/deployment.md`.
- **Fichiers** : `docs/deployment.md`, `staticwebapp.config.json` si ajustements.
- **Gates** : workflows verts ; en-têtes vérifiés en production ; critères S1–S8 de `docs/vision.md` cochés.

---

## E5 · Squelette backend .NET *(fin de phase 1 — optionnel, ne menace jamais J6/J7)*

| ID | Objectif | Statut |
|---|---|---|
| E5-ST1 | Solution .NET 10 Clean Architecture allégée | ⬜ |
| E5-ST2 | CI .NET | ⬜ |

### E5-ST1 — Solution .NET
- **Objectif** : solution `api/` : projets Domain / Application / Infrastructure / Api, Mediator maison, FluentValidation, Problem Details RFC 9457, un endpoint `/health` — conventions du projet frère `AbrisAutoOutaouais-WebApp`. **Aucune ressource Azure provisionnée** (phase 2).
- **Fichiers** : `api/` (nouvelle arborescence).
- **Gates** : `dotnet build` + `dotnet test` verts (1 test témoin) ; revue conventions vs projet frère.

### E5-ST2 — CI .NET
- **Objectif** : workflow GitHub Actions build+test de `api/`, déclenché sur les chemins `api/**` seulement ; pas de déploiement.
- **Fichiers** : `.github/workflows/api-ci.yml`.
- **Gates** : workflow vert ; zéro impact sur le pipeline frontend.
