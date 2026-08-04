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
| E0-ST2 | Workspace Angular 22 + SCSS + eslint + Vitest | ✅ |
| E0-ST3 | `staticwebapp.config.json` : en-têtes + CSP | ✅ |
| E0-ST4 | CI GitHub Actions + premier déploiement SWA Free | ✅ |

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
- **Clos le 2026-08-03** — scaffold `ng new dr-je-sais-tout --directory . --ssr --style=scss --ai-config=none`
  sur **Angular 22.1.0** (dernière stable ; la v21 est passée en LTS), puis `ng add angular-eslint`.
  Gates : G-lint ✅ · G-test ✅ (Vitest 4.1.10, 2 tests) · G-build ✅ (prerender) ·
  G-audit ✅ (**0 vulnérabilité en production** ; 3 « moderate » dev-only via le SDK MCP d'`@angular/cli`,
  dont le correctif imposerait un downgrade en CLI 21 — refusé).
- **Écarts assumés par rapport à l'énoncé initial** :
  - *Angular 22 et non 21* — décidé au scaffold, conformément à ADR-001 (« vérifier la dernière stable »).
    Effet de bord favorable : **zoneless et Vitest sont les défauts**, donc rien à configurer (S-03).
  - *`outputMode: "static"` + suppression de `src/server.ts`* — le site est intégralement prerendu ;
    `express` et `@types/express` ont donc été retirés (surface inutile sur un hébergement statique).
  - *`optimization.styles.inlineCritical: false`* — **non négociable** : le défaut d'Angular émet un
    `<link … onload="this.media='all'">`, gestionnaire inline que la CSP stricte bloque, ce qui afficherait
    le site **sans styles**. Voir addendum S-02, mesure 3.
  - *Pipeline de contenu non câblé* — `content/` créé avec son README d'orientation, mais la compilation
    (script `content:build`) appartient à **E2** : aucun script pointant vers un fichier inexistant.
- **Vérifié sur la sortie prerendue** : 0 gestionnaire d'événement inline, 0 attribut `style` inline,
  `<link rel="stylesheet">` simple, un seul bloc `<style ng-app-id>` (4 062 o) à couvrir par hachage en E0-ST3.

### E0-ST3 — Config SWA : en-têtes et CSP
- **Objectif** : `staticwebapp.config.json` avec CSP stricte (selon S-02), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors`, routes de fallback prerender ; documentation courte des choix dans le fichier même (commentaires impossibles en JSON → section dans `docs/deployment.md`).
- **Fichiers** : `staticwebapp.config.json`, `docs/deployment.md` (nouveau, court).
- **Gates** : G-build ; en-têtes vérifiés localement via `swa start` ; conformité `.claude/rules/security.md`.
- **Clos le 2026-08-03** — documentation : `docs/deployment.md`. G-build ✅ ; en-têtes **constatés servis**
  par `swa start` (HSTS, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options, COOP/CORP) et CSP
  **résolue avec le hachage réel**, sans `unsafe-inline` ni hôte externe.
- **Écart de nommage assumé** : la source est `config/staticwebapp.config.source.json`, **pas**
  `staticwebapp.config.json` à la racine. Motif constaté en local : `swa start` résout ce nom depuis le
  **répertoire courant**, pas depuis le dossier servi — un fichier ainsi nommé à la racine serait servi
  avec le jeton `__HACHAGES_STYLE__` non résolu, donnant un `style-src` invalide et un **site sans styles**,
  sans la moindre erreur de build. Le fichier déployable est généré dans `dist/dr-je-sais-tout/browser/`.
- **Garde-fou ajouté** (`tools/deploiement/generer-config-swa.mjs`) : le build **échoue en code 1** si la
  sortie prerendue contient un gestionnaire d'événement inline, un script inline exécutable ou un attribut
  `style` inline. Vérifié en reproduisant la régression `inlineCritical: true` — le garde-fou l'attrape et
  nomme la cause.
- **Constat navigateur — levé le 2026-08-04** par le propriétaire sur
  <https://salmon-sky-0a730780f.7.azurestaticapps.net>, console ouverte : **aucune violation CSP**.
  Il avait été reporté ici faute d'accès (l'onglet Chrome piloté n'atteint pas `localhost` ; Claude in
  Chrome est banni du projet — seul le propriétaire peut faire ce constat). Ce qu'il établit, au-delà de
  l'absence de message : une CSP qui aurait bloqué le bloc `<style ng-app-id>` ou le
  `<script id="ng-state" type="application/json">` **l'aurait dit dans la console**. Silence = hachage
  `style-src` conforme au flux réellement servi, et `ng-state` non traité comme un script exécutable —
  l'hydratation en dépend. **E0-ST3 est clos sans reste.**

### E0-ST4 — CI/CD GitHub Actions
- **Objectif** : workflow PR (lint → test → build → axe → npm audit) + workflow `main` (idem + déploiement SWA Free) ; page « bientôt » minimaliste en ligne (placeholder sobre, pas la vraie home).
- **Fichiers** : `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, secret `AZURE_STATIC_WEB_APPS_API_TOKEN` (manuel, propriétaire).
- **Gates** : les deux workflows verts ; URL `*.azurestaticapps.net` répond avec les en-têtes E0-ST3. Zéro dépense (`.claude/rules/budget-free-tier.md`).

- **Écrit et vérifié en local le 2026-08-04** (🟦 — rien n'est encore en ligne) :
  - `.github/workflows/ci.yml` (PR) · `deploy.yml` (push `main`, + **vérification des en-têtes
    réellement servis** après publication) · `infra.yml` (Terraform `fmt`/`validate`, filtre `paths`).
    `permissions: contents: read` partout, actions épinglées par version majeure.
  - **Page « bientôt »** : `src/app/app.{html,scss,ts}` — gabarit Angular remplacé, `index.html`
    passé de `lang="en"` à **`lang="fr-CA"`** (violation WCAG 2.2 **3.1.1** corrigée au passage),
    thèmes clair/sombre dessinés, aucune animation, focus visible.
  - Gates : **G-lint ✅ · G-test ✅ (3 tests) · G-build ✅** (CSP régénérée, hachage résolu, aucun
    `__HACHAGES_STYLE__` résiduel ; sortie prerendue vérifiée sans trace du gabarit Angular).
- **Écart assumé — provisionnement en Terraform** (non prévu à l'énoncé) : `infra/` décrit le groupe
  de ressources et la Static Web App **Free** (`sku_tier`/`sku_size` en dur, pas en variable : le
  palier devient un garde-fou budgétaire visible en diff). Motifs : outil habituel du propriétaire,
  et la phase 2 (Container Apps + SQL S0) sera multi-ressources. `terraform validate` passe contre
  le provider `azurerm ~> 4.0`. **Terraform ne tourne jamais en CI** — la fiche KB
  `devops/infrastructure-as-code-limites.md` rappelle qu'un système qui applique de l'infra détient
  des identifiants à haut privilège ; la CI ne connaît que le jeton de déploiement SWA. État local,
  gitignoré (**il contient le jeton en clair**). Marche à suivre : `infra/README.md`.
- **G-axe volontairement absent** des workflows : aucune page réelle à tester avant E1. Un gate vert
  qui ne teste rien est pire qu'un gate absent.
- **Provisionné le 2026-08-04 par le propriétaire** ✅ : dépôt public
  <https://github.com/DrL0ve69/Dr.JeSaisTout-WebApp> sur `main` · `terraform apply` → **2 ajoutées,
  0 modifiée, 0 détruite**, palier **Free** confirmé dans le plan · site
  <https://salmon-sky-0a730780f.7.azurestaticapps.net> · secret `AZURE_STATIC_WEB_APPS_API_TOKEN`
  posé et vérifié · commit `ddb9ba9`. Détail : `docs/deployment.md` §Ressources en place.
- **Mise en ligne faite le 2026-08-04** : <https://salmon-sky-0a730780f.7.azurestaticapps.net> —
  HTTP 200, cinq en-têtes servis, CSP à hachage résolu, `lang="fr-CA"`. Workflow `Infra` vert.
- **Déploiement vert le 2026-08-04** (run `30921738380`, commit `9d00d7e`) : l'attente active sur la
  propagation de la config SWA règle le rouge du premier run. Le journal de l'étape établit trois choses
  que le seul « vert » ne prouvait pas : la sortie **`static_web_app_url` porte bien ce nom** (« Cible :
  https://salmon-sky-0a730780f.7.azurestaticapps.net » — l'étape ne s'est donc pas auto-ignorée), les
  **cinq en-têtes** attendus sont servis, et la CSP porte
  `style-src 'self' 'sha256-CdQGNV4BbviTctFmbjMF/2Z8eHTF6jpnV9H4mKkTEmY='` — **résolue**, sans
  `unsafe-inline` ni hôte externe. Constat navigateur levé : voir E0-ST3.
- **Annotations du premier run, corrigées le 2026-08-04** (avertissements, jamais des échecs) :
  - `actions/checkout@v4` et `actions/setup-node@v4` ciblent **Node 20, déprécié** ; les runners les
    forçaient en Node 24 avec un avertissement, et ce forçage cessera. Montées aux majeures qui
    tournent nativement en Node 24 : **`checkout@v7`, `setup-node@v7`**, et **`setup-terraform@v4`**
    dans `infra.yml` (même cause, pas encore signalée faute de run récent). Notes de version relues :
    aucune rupture qui touche ces workflows — la seule de `setup-node` v5/v6 est un cache npm
    automatique, sans effet ici puisque `cache: npm` est déclaré explicitement.
  - `skip_api_build: true` : **cette entrée n'existe pas** dans `Azure/static-web-apps-deploy@v1`
    (l'action listait ses entrées valides dans l'avertissement). Elle était ignorée en silence.
    Retirée ; `api_location: ''` suffit — sans API, il n'y a rien à construire.
- **✅ Clos le 2026-08-04**, commit `fb86461` : `Déploiement` (run `30924715006`) et `Infra`
  (run `30924711444`) **verts, zéro annotation**, en-têtes reconstatés servis avec la CSP à hachage
  résolu. Plus rien d'ouvert sur E0 : **prochaine étape E1-ST1** (jetons SCSS), dont les critères ont
  été chiffrés le 2026-08-04 — lire `docs/revue-plan-kb-2026-08-04.md` avant de commencer.

---

## E1 · Design system & app shell

| ID | Objectif | Statut |
|---|---|---|
| E1-ST1 | Jetons SCSS + thèmes clair/sombre | 🟦 |
| E1-ST2 | Layout, navigation, pied de page | ⬜ |
| E1-ST3 | Home « carnet de laboratoire » | ⬜ |

### E1-ST1 — Jetons sémantiques SCSS
- **Objectif** : design system 3 couches (primitives → sémantiques → composants) en SCSS + custom properties ; thèmes clair (papier ivoire) et sombre (ardoise encrée) tous deux dessinés ; échelles typo/espacement ; couleurs sémantiques dont `danger-vuln` / `ok-fixed` ; service de bascule de thème (persisté, `prefers-color-scheme` par défaut) ; `prefers-reduced-motion` outillé (mixin).
- **Fichiers** : `src/styles/` (`_tokens.scss`, `_themes.scss`, `_mixins.scss`…), `src/app/core/theme/`.
- **Référence** : `docs/design/direction-visuelle.md` (garde-fous G1–G9 bloquants) ;
  **fiches KB** `web/frontend/principes-design-visuel.md` et `web/css/selecteurs-cascade-specificite.md`.
- **Chiffré le 2026-08-04** (revue `docs/revue-plan-kb-2026-08-04.md`, constats C2/C3/C4) — les
  échelles étaient nommées sans être définies, donc invérifiables :
  - **Échelle typographique** : jeu **fixe** de tailles, chaque palier espacé d'au moins **~25 %**
    du précédent (*Refactoring UI*). Pas d'ajustement au jugé hors de l'échelle.
  - **Espacement 8pt** : tout multiple de **8** (8/16/24/32/48/64), sous-grille en multiples de 4.
  - **Aucune opacité sur un jeton de texte.** Chaque niveau d'emphase est une **couleur pleine**
    avec son ratio de contraste mesuré et consigné. La hiérarchie par opacité (Material 87/60 %)
    fait mécaniquement chuter le contraste sous 4.5:1 — collision directe avec G8. L'opacité reste
    permise sur les décors (règlure, filets), jamais sur du texte.
  - **Polices auto-hébergées, obligatoire** : la CSP est `font-src 'self'`, aucun hôte externe
    (pas de Google Fonts). Livrer les `woff2`, le `@font-face` et une stratégie `font-display`.
    ⚠️ **Vérifier le sous-ensemble de glyphes sur du texte français réel** : accents, ligature
    **œ**, et **guillemets « »** — un sous-ensemble latin trop agressif les casse en silence.
    Tant que ce lot n'est pas fait, l'écart à **G3** de la page « bientôt » (pile système) subsiste.
- **Gates** : G-lint, G-build ; **table des ratios de contraste** produite pour chaque paire
  texte/fond des deux thèmes (AA minimum, AAA visé sur le corps) ; G-test sur le service de thème.

**2026-08-04 — plan v2 en cinq sous-tâches (architecte, après passe d'avocat du diable).**
- **ST1-A (fondations SCSS + gate de contraste) est livrée et revue** : 73 primitives Sass
  (inatteignables depuis un composant — G7 verrouillé structurellement) → 58 jetons sémantiques en
  custom properties (24 couleurs par thème) → 0 jeton composant, couche vide et voulue. Thèmes clair
  et sombre tous deux dessinés, accents recalibrés (jamais inversés — G9). Aucune opacité sur un
  jeton de texte. Gate `tools/design/verifier-contrastes.mjs` : 33 paires déclarées, 66 mesures,
  seuils 4.5:1 texte / 3:1 grand texte / 3:1 non-texte (WCAG 1.4.11) ; plus bas mesuré 3,24:1 (clair)
  et 3,39:1 (sombre) ; corps de texte à 14,15:1 / 13,95:1 (AAA). Échoue sur l'inconnu (jamais de skip
  silencieux). Câblé dans `ci.yml` et `deploy.yml` en mode `--check`, sortie déterministe. Corrections
  de revue : cascade `@media print` (thème sombre battait le print par spécificité), `$taille-xs`
  hors échelle des 25 %, mixin `marque-pedagogique` avec second canal non coloré pour le mode
  contraste élevé Windows (WCAG 1.4.1). Leçons L-007, L-008, L-009 consignées.
- **ST1-B (polices auto-hébergées) est livrée** — l'**écart à G3 est levé**. 4 fichiers `.woff2`
  sous OFL 1.1 dans `public/polices/` (196,4 Kio livrés, **83 Kio réellement chargés** par une page
  française : les `latin-ext` n'arrivent que si un caractère les appelle), noms **versionnés**,
  `unicode-range` recopiés verbatim, `font-display: swap`, `preload` des deux `latin`.
  Deux choix **mesurés** : Inter est une police **variable** — `wght@400` et `wght@700` renvoient
  des octets identiques (même SHA-256), donc **un seul fichier** par sous-ensemble et
  `font-weight: 100 900`, 133 Kio de doublon évités ; Fraunces reste en **700 fixe** (l'axe `opsz`
  demeure variable) car la graisse variable coûte **+32 Ko** pour des graisses qu'aucun jeton
  n'utilise. Gate `tools/design/verifier-glyphes.mjs` (lecture réelle de la table `cmap`, 80
  vérifications), câblé dans `ci.yml` **et** `deploy.yml`. Provenance, empreintes et procédure de
  mise à jour : [`docs/design/polices.md`](../design/polices.md).
- **⚠️ Constat de ST1-B contraire au plan, qui engage la RÉDACTION du contenu (E2).**
  **U+202F (espace fine insécable) est absente de Fraunces comme d'Inter**, alors que le plan
  l'exigeait explicitement. Elle est irrécupérable chez ce fournisseur : la seule voie serait un
  sous-ensemble maison, précisément ce que ST1-B interdit (c'est lui qui casse `œ`, `« »` et `’`
  en silence). **Consigne : le contenu emploie U+00A0**, seule blanche insécable couverte par les
  deux familles. U+2009 n'est pas une issue — Inter la porte, Fraunces non, titres et corps ne
  s'espaceraient donc pas pareil. Le gate imprime cet écart à chaque exécution et **échoue** si le
  caractère devenait couvert, pour que la consigne ne survive pas à sa propre péremption.
  À reporter dans `.claude/rules/contenu-pedagogique.md` §3 au moment d'écrire la première leçon.
- **Restent** : **ST1-C** (script inline
  `<script id="init-theme">` unique, haché depuis l'artéfact, revu par `security-reviewer`) ·
  **ST1-D** (script anti-flash + `ThemeService` tri-état clair/sombre/système) · **ST1-E**
  (vérification jetable + clôture).
- **Écart de dépendance documenté** : `sass` promue de transitive à devDependency explicite (déjà
  dans l'arbre via `@angular/build`, 0 octet téléchargé, 0 surface en production) pour tester les
  mixins sur le CSS émis.

**2026-08-04 — SonarCloud sur la PR #1 : la « duplication » est la TABLE DES PAIRES, pas les thèmes.**
- **Ce que Sonar mesure** : `new_duplicated_lines = 76` sur `new_lines = 1890`, soit **4,02 %**,
  au-dessus de la condition « ≤ 3 % de duplication sur le code neuf » de la porte qualité.
- **Où** : les **76 lignes sont toutes dans `tools/design/verifier-contrastes.mjs`**. L'hypothèse de
  départ — les deux blocs de thème de `src/styles/_themes.scss` — est **fausse** : l'API mesure
  `duplicated_lines = 0` sur ce fichier, comme sur tout le reste du dépôt. `api/duplications/show`
  ne rend **qu'un** doublon, deux blocs du même fichier qui se chevauchent à six lignes d'écart :
  c'est la table `PAIRES`, ses ~33 entrées écrites chacune sur six lignes
  (`[`, premier plan, fond, usage, seuil, `],`).
- **Pourquoi c'est intentionnel et structurel** : le détecteur de copier-coller **normalise les
  littéraux** — deux entrées qui ne partagent aucune chaîne lui présentent malgré tout la même suite
  de jetons. Il ne voit donc pas de la logique dupliquée, il voit **les lignes d'un tableau de
  données**. Or cette table *est* le livrable du gate : elle sert à la fois de jeu de tests et de
  documentation des combinaisons autorisées (une paire absente est une paire interdite). La
  « factoriser » signifierait engendrer les paires par un programme — soit exactement supprimer
  l'explicitité sur laquelle le gate repose, et rendre invérifiable à l'œil ce qu'un relecteur doit
  pouvoir compter. Même nature que la duplication des deux thèmes, que **G9** interdit de factoriser
  (`docs/design/direction-visuelle.md`) : le sombre est dessiné, jamais dérivé du clair.
- **Décision** : ne rien factoriser.
- **Réglé le 2026-08-04 (commit `307e843`) — et une conclusion de ce paragraphe était fausse.**
  Il était écrit que « rien n'est réglable côté code » parce que le dépôt n'a pas de
  `sonar-project.properties`. C'est le mauvais fichier : l'analyse automatique lit
  **`.sonarcloud.properties`** à la racine, et c'est justement `sonar-project.properties` qu'elle
  **ignore**. `sonar.cpd.exclusions=tools/design/verifier-contrastes.mjs` (nominatif — les motifs
  génériques y sont interdits) a fait tomber la duplication du code neuf de **4,0 % à 0,0 %**,
  **dès l'analyse de la PR** : contrairement à ce qu'indique la doc, le réglage n'a pas attendu
  d'être sur la branche par défaut. Aucune intervention du propriétaire n'aura été nécessaire.
- **Constat que la passe précédente n'avait pas vu : la porte tombait sur DEUX conditions**, pas
  une. `new_reliability_rating = 3` (note C) vient d'**un BUG** `css:S8776` « Nesting selectors
  should have a scoping root », sur le `&` de `@mixin focus-visible` (`src/styles/_mixins.scss`).
  **Faux positif, vérifié en compilant plutôt que supposé** : l'analyseur applique la sémantique de
  l'imbrication CSS native, où un `&` sans racine de portée est une faute ; en SCSS le `&` d'un
  `@mixin` se résout au **site d'appel** — `.bouton { @include m.focus-visible; }` rend bien
  `.bouton:focus-visible`, media query de contraste forcé comprise.
  **Reste à la charge du propriétaire**, et c'est le seul reliquat : `.sonarcloud.properties`
  n'admet pas `sonar.issue.ignore.multicriteria`, donc une issue ne peut pas être tue par fichier.
  Marquer le constat **False Positive** dans l'interface SonarCloud. Tant que ce n'est pas fait,
  `main` reste rouge sur ce seul critère. Le mixin porte un commentaire qui interdit de le
  « corriger » — le faux positif ne doit pas piloter la conception.

### E1-ST2 — Layout & navigation
- **Objectif** : shell applicatif (header avec logotype typographique, nav, bascule de thème, footer), squelette de routes (`/`, `/cours/securite-web`, `/cours/securite-web/:slug`), page 404, skip-link, landmarks ARIA.
- **Fichiers** : `src/app/core/layout/`, `src/app/app.routes.ts`.
- **Gates** : G-lint, G-test, G-build, G-axe (navigation clavier complète).

### E1-ST3 — Home
- **Objectif** : page d'accueil appliquant la direction « carnet de laboratoire » : présentation du Dr. Je-Sais-Tout, carte du cours sécurité web avec lien, un seul CTA. **Exploration visuelle avant implémentation** (voir méthode ci-dessous).
- **Méthode d'exploration** *(corrigée le 2026-08-04 — constat C1 : le skill `frontend-design`
  invoqué ici n'existe pas et n'a jamais existé ; il n'est installé ni au projet ni à l'utilisateur)* :
  lire `web/frontend/principes-design-visuel.md` (anchor font sur le **titre** et non le corps,
  « star of the show » reliée au produit et non décorative, visual rhyming) et
  `ai/agents/claude-code/design-ui.md` (boucle génération/critique, bibliothèque de goût injectée
  en contexte) — puis **produire plusieurs directions franchement différentes avant de converger**,
  pas des variantes de la première. La fiche signale que sa version retenue était la 12ᵉ ;
  n'en affiner qu'une plafonne le résultat.
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
- **⚠️ Les onglets sont un sous-projet d'accessibilité, pas une option d'affichage** *(constat C5 du
  2026-08-04)*. Le HTML n'a pas de balise `tabs` native : c'est un des rares cas où ARIA est
  légitime, mais mal posé il **dégrade** l'accessibilité (WebAIM : les pages avec ARIA affichent en
  moyenne plus d'erreurs que celles sans). Patron à suivre : **`web/css/composant-tabs.md`**
  (`tablist`/`tab`/`tabpanel`, **roving tabindex**), cadrage ARIA :
  `web/html/html-semantique-accessibilite.md`. Évaluer d'abord si `details`/`name` suffit.
- **Gates** : G-lint, G-test, G-build, G-axe (annotations accessibles, pas de sens porté par la couleur seule)
  **+ vérification clavier manuelle** : flèches gauche/droite entre onglets, Home/End, un seul
  `tabindex="0"` dans le `tablist`, focus visible à chaque étape. `G-axe` ne teste rien de tout ça.

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

---

## Dette de plan — constats ouverts de la revue KB du 2026-08-04

Issus de [`docs/revue-plan-kb-2026-08-04.md`](../revue-plan-kb-2026-08-04.md). **C1 à C5 sont
appliqués** (E1-ST1, E1-ST3, E2-ST4, `direction-visuelle.md`, `roadmap.md`). Les trois ci-dessous
touchent des **règles** et non le plan : ils attendent une décision du propriétaire, pas une édition
d'office. Chacun est un lot autonome, dimensionné pour un agent frais.

| ID | Constat | À trancher | Statut |
|---|---|---|---|
| **D-C6** | « Zéro violation AXE » est traité comme équivalent à « WCAG 2.2 AA ». Un outil automatisé ne décide ni de l'ordre de tabulation, ni du piège du focus, ni de la justesse d'un rôle ARIA : un `role` valide mais sémantiquement faux passe axe. Les gates E1-ST2 et E2-ST3/4/5 se réduisent pourtant à `G-axe`. | Ajouter un gate **`G-clavier`** (checklist manuelle : parcours au clavier seul, focus visible, ordre logique, passe lecteur d'écran) sur tout composant interactif ; ajuster la formulation de la barre dure dans CLAUDE.md. | ⬜ |
| **D-C7** | `.claude/rules/contenu-pedagogique.md` §2 décrit une **structure** (théorie + 2 exemples + analogie + visuel) mais pas un **ancrage**. La fiche `divers/pedagogie/enseigner-informatique-ere-ia.md` (Malan/CS50) apporte le « moment mémorable » : au moins un par cours, plutôt en début ou milieu qu'à la fin. Le mécanisme existe déjà ici — c'est la simulation — mais **4 modules sur 13 n'en ont aucune** : E3-ST1 (`01-fondamentaux`), E3-ST2 (`02-evaluation-cvss`), E3-ST8 (`08-cryptographie`), E3-ST13 (`13-durcissement`). Ce sont les plus abstraits du cours. | Ajouter le « moment mémorable » à la règle pédagogique ; faire **nommer** le sien à chaque module, y compris sans simulation. *(Le 13 a déjà le bon : « les en-têtes réels de CE site comme étude de cas ».)* | ⬜ |
| **D-C8** | Les 13 modules présupposent HTTP, TLS, cookies et DNS sans adosser ces prérequis à quoi que ce soit — alors que la règle pédagogique exige des « prérequis explicites ». Le plan ne connaissait que `web/securite/`. | Câbler `cs/reseaux/parcours-requete-web.md`, `cs/reseaux/https-tls.md` et `web/backend/cors.md` comme fiches de prérequis. Modules concernés : **01**, **05** (CSRF ≠ CORS ≠ SOP), **11**, **13**. | ⬜ |
