# Backlog — Phase 1 (cours sécurité web + home)

> **Document central des agents.** Une sous-tâche = **UN livrable vérifiable**, dimensionné pour un
> sous-agent frais **< 150k tokens** (`.claude/rules/agent-context-budget.md`). Le brief d'un agent =
> la **section** de sa sous-tâche (pointeur `ID`), jamais ce document entier.
>
> Conventions : statuts ⬜ à faire · 🟦 en cours · ✅ fait · ⛔ bloqué. Mettre à jour le statut à la
> clôture (agent scribe).
> Jalons datés : `docs/agile/roadmap.md`. Décisions et spikes : `docs/architecture/stack-et-architecture.md`.
>
> **⚠️ ORDRE NOMINAL RÉVISÉ le 2026-08-17** (bascule de direction visuelle, décision D-3) :
> **E0 → E1 → E2 → E3-ST0 → E3 bloc A → E6 → E3 blocs B et C → E4 → E5.**
> Deux insertions par rapport à l'ordre d'origine : **E3-ST0** (rattrapage d'archivage KB, §E3) en
> amont de la première leçon, et **E6** (bascule d'identité visuelle, §E6) intercalé *après* le bloc A
> pour que le contenu garde le chemin critique de l'échéance de mi-septembre (critère S2).

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
| E1-ST1 | Jetons SCSS + thèmes clair/sombre | ✅ |
| E1-ST2 | Layout, navigation, pied de page | ✅ |
| E1-ST3 | Home « carnet de laboratoire » | ✅ |

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
  **Reporté le 2026-08-08** dans `.claude/rules/contenu-pedagogique.md` §3 — sans attendre la première leçon : une consigne qui n'existe que sous forme de « à reporter » ne protège rien (**L-008**).
- **🔴 S-003 — LE GARDE-FOU DE CSP NE PROUVE PAS QU'IL A *TOUT VU*. Préexistant, lot autonome.**
  Trouvé le 2026-08-08 par la revue sécurité du lot de typage, et **reproduit à l'identique sur la
  branche de base** : le typage ne l'a pas introduit.
  **Le défaut** : `tools/deploiement/generer-config-swa.mjs` (~l. 125) — `MOTIF_SCRIPT` peut **ne pas
  apparier une balise `<script>` du tout**. Un guillemet orphelin dans le bloc d'attributs
  (`<script data-x=a"b">alert(1)</script>`) fait échouer le groupe de capture : la balise devient
  **invisible** — ni hachée, ni signalée, **build vert**. L'analyseur HTML d'un navigateur, lui,
  accepte cette valeur non citée, ferme la balise au `>` et **exécute le corps**.
  **Ce qui le distingue de S-001 et S-002** : ceux-là couvraient « mal autoriser ce qu'on voit »,
  celui-ci couvre « ne pas voir du tout ». Le refus fail-closed est **en aval** d'un motif qui peut
  silencieusement ne rien apparier.
  **Impact borné, à ne pas surjouer** : aucun hachage n'étant délivré pour cette balise, la CSP
  servie la **bloque quand même** à l'exécution. Ce qui est perdu, c'est la couche de **détection** —
  précisément la panne silencieuse que ce script existe pour empêcher.
  **Parade** : contrôle de conservation avant la boucle — comparer le compte brut
  (`html.match(/<script/gi)`) au nombre de correspondances du motif, tout écart devenant une
  infraction. *L'inconnu doit être compté, pas seulement analysé.*
  **Déjà prouvé** : 7 contournements rejoués sur copie jetable de l'artéfact, **6 refusés en code 1**
  avec cause nommée, le 7ᵉ passe en **0**. Le harnais est à refaire dans le lot.
  **Gates du lot** : G-lint, G-test (mutation de contrôle par contournement), G-build ; passe
  **`security-reviewer` obligatoire** — ce fichier a déjà été contourné deux fois.
- **🔴 DÉFAUT TROUVÉ EN VÉRIFIANT ST1-B EN LIGNE — antérieur à ce lot, à planifier (E0/déploiement).**
  `trailingSlash: "always"` (`config/staticwebapp.config.source.json`) s'applique **aussi aux
  fichiers avec extension** : SWA répond **301** sur `/polices/*.woff2`, sur le bundle `main-*.js`,
  sur `styles-*.css` et sur `favicon.ico`, puis sert le fichier en 200 à l'URL suffixée d'un `/`.
  Constaté en GET avec en-têtes de navigateur, pas seulement en `HEAD`/`curl` — donc réel :
  `curl -sI …/styles-BZVQZPIQ.css` → `301`, `Location: …/styles-BZVQZPIQ.css/`.
  **Coût** : un aller-retour de plus sur *chaque* asset, dont le CSS bloquant le rendu. **Et un
  effet propre à ST1-B** : un `<link rel="preload">` qui traverse une redirection n'est
  couramment **pas réutilisé** par le navigateur — les deux préchargements de polices risquent
  donc d'être payés deux fois au lieu d'accélérer quoi que ce soit.
  **Piste** : `trailingSlash: "auto"`, ou une règle de route qui exempte les extensions. **Décision
  à prendre par le propriétaire** : le réglage porte la canonicalisation des URL de pages (effet
  SEO), il déborde du périmètre de ST1-B et ne se change pas en passant.
- **ST1-C (script inline d'initialisation du thème) est livrée.** Un `<script id="init-theme">`
  unique dans `src/index.html` pose `data-theme` sur `<html>` **avant la première peinture** : il
  lit `localStorage['drjst-theme']` et n'épingle que sur `clair` ou `sombre` ; toute autre valeur
  (absente, `systeme`, inconnue) ne pose **aucun** attribut et laisse `prefers-color-scheme`
  décider — l'absence d'attribut EST l'état système. Script en **lecture seule**, liste blanche
  fermée, `try/catch` pour le stockage inaccessible. Inline et non `public/init-theme.js` :
  `public/**` est copié sans empreinte de contenu et servi `immutable` un an.
  `tools/deploiement/generer-config-swa.mjs` le hache **depuis l'artéfact** vers `script-src` ;
  CSP émise : `script-src 'self' 'sha256-hIxkAZ0KC2VIDD2cWnG1AoQYrZGTH4AxI7h8JYMUs8M='`.
  **Contrat pour ST1-D** : le `ThemeService` écrira cette même clé avec ces mêmes trois états.
- **Le garde-fou a été durci après deux revues indépendantes**, qui ont **reproduit sur l'artéfact**
  des contournements de la première version : elle appariait des **sous-chaînes**
  (`<script data-x=" id=init-theme">…` obtenait le droit CSP) et **dérivait** l'autorisation de
  l'`id` au lieu de la comparer à un contenu revu. Désormais : découpage réel des attributs (premier
  gagnant, comme l'analyseur HTML), **refus fail-closed** de tout bloc d'attributs non intégralement
  analysable, casse mixte et `</script >` couverts, `importmap`/`speculationrules` traités comme
  exécutables, hachages triés (reproductibilité Windows/Linux), et surtout **hachage épinglé**
  (`HACHAGE_SCRIPT_ATTENDU`) : modifier le script fait **échouer la construction** avec pour consigne
  de repasser par `security-reviewer` avant de mettre la constante à jour. Leçons **L-010, L-011,
  S-001, S-002**.
- **Note technique qui a coûté du temps** : le hachage CSP porte sur le contenu **après
  normalisation des fins de ligne** par l'analyseur HTML. `index.csr.html` est livré en **CRLF** et
  `index.html` en **LF** ; sans normalisation, une même source donne deux hachages et la CSP bloque
  en silence.
- **Vérification LIVE de ST1-C — faite le 2026-08-08, et plus forte qu'un simple constat d'en-tête.**
  Après fusion de la PR #3 et déploiement (`main → SWA Free`, 1 m 22 s), la CSP servie a été sondée
  **jusqu'à l'effet** et non jusqu'au code de retour (**L-004**) : présente dès la première sonde.
  Le point qui compte : le `<script id="init-theme">` a été extrait du **HTML réellement servi** et
  re-haché — `sha256-hIxkAZ0KC2VIDD2cWnG1AoQYrZGTH4AxI7h8JYMUs8M=`, **identique** au
  `HACHAGE_SCRIPT_ATTENDU` épinglé et à ce que la CSP autorise. La chaîne est donc prouvée de bout
  en bout, pas seulement « un `sha256-` est présent ». Deux scripts inline servis : `init-theme`
  (haché) et `ng-state` en `type="application/json"` — données non exécutables, sans hachage requis,
  ce qui confirme que l'hydratation n'est pas bloquée. Cinq en-têtes servis
  (HSTS `max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`) ; ni `Server` ni `X-Powered-By`.
- **✅ 2026-08-14 — LES DEUX CONSTATS NAVIGATEUR SONT FAITS, PAR LE PROPRIÉTAIRE.** Sur
  <https://salmon-sky-0a730780f.7.azurestaticapps.net> : (1) **console ouverte, aucun message** —
  donc zéro violation CSP, et l'hydratation n'est pas bloquée sur `<script id="ng-state">` ;
  (2) **aucun clignotement perçu** à la bascule de thème. Ces deux constats demandaient un œil dans
  le navigateur — l'outil Chrome est banni sur ce projet, aucun agent ne pouvait les produire.
  **ST1-C est donc close sans réserve**, et la chaîne CSP-à-hachages est prouvée de bout en bout :
  en-têtes servis (mesurés), hachage recalculé sur le HTML réellement livré (mesuré), et exécution
  réelle sans violation (constatée). **Nuance de portée, à ne pas surinterpréter** : « aucun
  clignotement perçu » est un constat à l'œil nu, pas une mesure de peinture ; il vaut pour ce que
  l'anti-flash devait garantir (pas de flash *perceptible*), et c'était exactement la barre visée.
- **ST1-D (`ThemeService` tri-état) est livrée et revue.** `src/app/core/theme/theme.ts` : signal
  `choix`, `computed` `themeEffectif` (`'clair' | 'sombre'`, qui résout `'systeme'` via
  `prefers-color-scheme` et suit l'OS à chaud), `definir()`, et les constantes `THEMES` /
  `CLE_THEME` / `ATTRIBUT_THEME` / `REQUETE_SOMBRE` exportées **pour E1-ST2**. Décorateur
  **`@Service()`** — forme Angular 22 auto-fournie à la racine et élagable, vérifiée dans les
  typages (`@angular/core/types/core.d.ts` l.1268-1322, `autoProvided: true` par défaut), pas
  `@Injectable({providedIn:'root'})`. `isPlatformBrowser` plutôt qu'`afterNextRender` : l'état doit
  être juste **dès l'injection**, la bascule d'E1-ST2 s'étiquette avec. 47 tests (4 fichiers).
  **La bascule visible n'est PAS dans ce lot** — c'est E1-ST2, volontairement.
- **Ce que la revue a changé, et c'est le vrai enseignement du lot (→ L-012).** Le comportement
  était juste ; c'est la **preuve** qui manquait. `theme.spec.ts` importait `CLE_THEME` et
  `ATTRIBUT_THEME` **depuis le service qu'il teste** : renommer `CLE_THEME` en `'drjst-theme-v2'`
  laissait **38 tests sur 38 au vert** pendant que le service aurait écrit une clé que
  `src/index.html` ne lit pas. Or cette valeur est un contrat entre deux fichiers qu'aucun
  compilateur ne relie (HTML d'un côté, SCSS de l'autre). Corrigé : la clé est cherchée dans le
  **corps extrait** du script inline (pas dans tout `index.html`, où le commentaire cite la même
  chaîne), et l'attribut comme l'ensemble des états épinglables sont comparés au **CSS compilé**
  par `sass.compile`. Second manque comblé : le chemin prerender n'avait aucune couverture et
  `npm run build` **ne pouvait pas** en tenir lieu — le service n'étant injecté nulle part, il est
  élagué du bundle (**L-005**) ; les tests `PLATFORM_ID: 'server'` vérifient donc l'**absence
  d'appel** à `localStorage` et `matchMedia`, sans quoi ils passeraient gardes retirées.
  Cinq mutations de contrôle, chacune rouge sur sa cible (**L-010**).
- **✅ 2026-08-08 — DÉFAUT DE REVUE DE ST1-D CLOS** (`chore(tsconfig): rendre la rigueur du
  compilateur explicite et la tenir par un test`). **Le constat d'origine était à moitié faux** :
  sondes bidirectionnelles à l'appui, `strict` et `strictTemplates` étaient déjà **actifs par
  défaut** (TypeScript 6.0, Angular 22) — mais une garantie qui ne tient qu'à un défaut d'outil est
  invisible à la lecture et disparaîtrait silencieusement à une montée de version majeure. Rendus
  **explicites** dans `tsconfig.json`. Réellement inactives, et activées par ce lot :
  `noUncheckedIndexedAccess`, `typeCheckHostBindings`, `strictStandalone` ; les diagnostics étendus
  passent de `warning` à `error` (**L-006**). **Second volet fermé** : `tsconfig.app.json` passe de
  `"types": ["node"]` à `"types": []` — prouvé bidirectionnellement, un composant appelant
  `process.cwd()` compilait avant, il échoue désormais en `TS2591`. Retombées : 6 erreurs
  `noUncheckedIndexedAccess`, toutes dans les specs, corrigées sans affaiblir une assertion.
  **Garde-fou neuf** : `src/configuration-typescript.spec.ts` — résout la configuration
  **effective** via `readConfiguration` de `@angular/compiler-cli` pour les deux programmes,
  vérifie la frontière Node, et vérifie qu'`angular.json` ne compile aucun programme échappant au
  test. Monte sur le gate G-test déjà câblé dans `ci.yml` et `deploy.yml` (**L-007**). 5 mutations
  de contrôle, chacune rouge sur sa cible (**L-010**). Gates : `npm run lint` exit 0 · `npm test`
  **68/68** exit 0 · `npm run build` exit 0 · `npm audit --omit=dev` 0 vulnérabilité.
  **Trois constats ouverts issus de la revue, en dette à planifier (non traités dans ce lot)** :
  (1) `tools/**/*.mjs` n'est dans aucun tsconfig — donc jamais type-vérifié, alors que
  `tools/deploiement/generer-config-swa.mjs` **génère la CSP**, et `eslint.config.js` n'est couvert
  ni par `ng lint` (`src/**`) ni par `eslint tools`. Piste : `tsconfig.tools.json` (`allowJs` +
  `checkJs` + `strict`), script `typecheck:tools`, câblé dans `ci.yml` **et** `deploy.yml` dans le
  même diff (L-007), et le nouveau programme ajouté à `PROGRAMMES` du spec de configuration.
  (2) `typescript-eslint` tourne sans information de types (`recommended`, pas de
  `projectService`) : promesses flottantes et flux `any` restent invisibles malgré `strict` ; coût
  de run à mesurer avant d'activer. (3) `exactOptionalPropertyTypes` volontairement écartée pour
  l'instant — à revoir à **E2**, quand le frontmatter des leçons introduira des champs optionnels.
- **✅ 2026-08-08 — CONSTAT (1) FERMÉ POUR SA PART CRITIQUE : le générateur de CSP est
  type-vérifié.** Troisième programme `tsconfig.tools.json` (`allowJs` + `checkJs` + `strict` +
  `noUncheckedIndexedAccess`, `module`/`moduleResolution: nodenext`, `lib: ["ES2023"]` **sans DOM**,
  `types: ["node"]` — frontière symétrique de celle que `tsconfig.app.json` pose dans l'autre sens),
  script `typecheck:tools`, étape **`G-typage-outils` câblée au même rang dans `ci.yml` ET
  `deploy.yml`** (**L-007**). `eslint.config.js` portait déjà un `// @ts-check` que **rien
  n'exécutait** (**L-008**) : il est maintenant dans le programme, et propre — 0 erreur.
- **Le chantier a été CHIFFRÉ avant d'être promis, et c'est ce qui l'a sauvé.** Activer `checkJs`
  sur tout `tools/` révèle **95 erreurs**, pas la vingtaine supposée : 57 d'annotations absentes
  (TS7xxx), 38 nées de `noUncheckedIndexedAccess`/`noPropertyAccessFromIndexSignature`. L'agent
  s'est **arrêté au seuil de mesure** plutôt que de livrer un gate rouge à moitié câblé. Découpe :
  **lot (a) livré** — `generer-config-swa.mjs` (16) + `kb-search.mjs` (10) + `eslint.config.js` (0),
  `include` **nominatif** et commenté comme tel ; lots (b) et (c) en dette, ci-dessous.
- **Ce que les deux revues ont changé — et c'est encore la PREUVE qui manquait, pas le
  comportement.** Le typage n'avait converti aucun refus en silence (vérifié ligne à ligne, puis
  empiriquement : 7 contournements rejoués sur copie jetable de l'artéfact). Mais **(i) le gate
  pouvait devenir vide en silence** — vider ou repointer l'`include` laissait `tsc` sortir en **0 sur
  zéro fichier**, script npm intact et workflows verts ; refermé par une assertion sur les
  **`rootNames`** réels, qui épingle nommément `generer-config-swa.mjs` (**L-014**). **(ii)** Le
  commentaire de `tsconfig.tools.json` promettait que le spec tenait **six** options quand il n'en
  assertait que **deux** : `OPTIONS_TYPESCRIPT` a été étendue aux six, plutôt que le commentaire
  raboté (addendum **L-008** — la faute s'est reproduite dans le lot qui invoquait L-008). Trois
  mineurs traités : `PROGRAMMES_ANGULAR` pour la garde `angular.json`, assertion de **paire** (nom
  d'étape + ligne `run:`) au lieu d'une sous-chaîne qui passerait sur un commentaire YAML, et la
  branche `<style>` de `generer-config-swa.mjs` alignée sur la branche `<script>` — elle écartait en
  silence, seul saut muet du fichier.
- **Gates** : `typecheck:tools` **0 erreur** · `lint` exit 0 · `test` **88/88** (68 en début de
  session) · `build` exit 0 · `audit --omit=dev` **0 vulnérabilité**. **Six** mutations de contrôle
  sur le lot, chacune rouge **sur sa cible** (**L-010**). Preuve de non-régression : la sortie
  `staticwebapp.config.json` du générateur est **identique octet pour octet** avant/après typage.
- **Piège de poste consigné (L-015)** : `.yml` et `.json` sont en **CRLF** ici, et ça frappe dans
  **les deux sens** — un `replace()` sur un littéral multi-ligne en `\n` ne mute rien (faux « le gate
  ne mord pas », rattrapé par le garde-fou de L-010), et une regex ancrée `$` en mode multiligne
  s'ancre **après** le `\r`. `\r?\n` / `\r?$` partout où l'on apparie un fichier de configuration.

**Dette de typage restante — chiffrée, pas devinée.**
- **(b) `tools/design/verifier-contrastes.mjs` — 34 erreurs.** Élargir l'`include` de
  `tsconfig.tools.json` **dans le même diff** que les corrections : la CI ne doit jamais passer par
  un rouge intermédiaire.
- **(c) `tools/design/verifier-glyphes.mjs` — 35 erreurs.** Même méthode, `include` élargi à
  `tools/**/*.mjs` en fin de lot. Point déjà élucidé, à ne pas re-débattre : `REPLI_DOCUMENTE`
  (l. 106) est un tableau littéral mixte inféré `(number|string)[][]`, d'où deux TS2365 l. 404.
  **Ce n'est pas un défaut d'exécution** — les bornes `plages` sortent toutes de `parseInt` — c'est
  une annotation absente ; un `@type` sur la constante vaut mieux que deux corrections au point
  d'usage.
- **Constats (2) et (3) inchangés** : `typescript-eslint` sans information de types, et
  `exactOptionalPropertyTypes` à revoir en **E2**.
- **✅ 2026-08-08 — ST1-E EST CLOSE, ET E1-ST1 AVEC ELLE.** Vérification jetable de bout en bout sur
  l'artéfact réellement bâti, chiffres tirés du journal et non du seul code de retour (**L-005**) :
  `lint` exit 0 · `test` **68/68** (5 fichiers de specs) · `build` exit 0 (1 route prérendue, 2 pages
  inspectées, 1 hachage de style + 1 de script émis) · `audit --omit=dev` **0 vulnérabilité** ·
  `design:contrastes:check` **33 paires × 2 thèmes = 66 mesures** (plus bas 3,24:1 clair, 3,39:1
  sombre) · `design:glyphes` **80 vérifications** (40 caractères × 2 familles).
- **Câblage reconstaté, aucun écart (L-007)** : `ci.yml` et `deploy.yml` portent les six mêmes gates
  dans le même ordre — G-lint, G-contraste, G-glyphes, G-test, G-build (+`config:swa`), G-audit.
  `deploy.yml` n'y ajoute que le déploiement SWA et la vérification live des en-têtes.
- **Chaîne CSP prouvée une seconde fois, par un contexte qui ne l'avait pas écrite** : la constante
  épinglée `HACHAGE_SCRIPT_ATTENDU`, le `script-src` du `staticwebapp.config.json` généré dans
  l'artéfact, et un recalcul indépendant (normalisé LF) donnent la **même** valeur
  `sha256-hIxkAZ0KC2VIDD2cWnG1AoQYrZGTH4AxI7h8JYMUs8M=` — sur `index.html` **et** `index.csr.html`,
  malgré leur différence CRLF/LF.
- **Contrat ST1-C ↔ ST1-D reconstaté** : clé littérale `drjst-theme` identique dans `theme.ts` et
  dans le script inline de `src/index.html` ; attribut `data-theme` posé par le script et lu par
  `_themes.scss`. Le lien est déjà tenu par `src/init-theme.spec.ts`, qui extrait les littéraux du
  script et les compare aux sélecteurs du **CSS compilé** par Sass — pas à une constante réimportée
  (**L-012**).
- **✅ 2026-08-14 — les deux constats de l'œil humain sont FAITS** (détail en §E1-ST1-C ci-dessus) :
  console sans aucun message (donc zéro violation CSP) et aucun clignotement perçu à la bascule de
  thème, sur le site déployé. Aucun agent ne pouvait les produire — l'outil navigateur est banni sur
  ce projet. **E1-ST1 est désormais close des deux côtés** : la chaîne outillée *et* l'œil humain
  qu'aucun gate ne remplace.
- **Second écart de glyphe, trouvé à la clôture et absent du plan de ST1-B** : **U+2192 (« → »)** est
  elle aussi rendue par la **police de repli**, exactement comme U+202F. Le gate l'imprime en « écart
  assumé » et ne casse pas — mais une flèche dans une leçon ne sera dessinée ni par Fraunces ni par
  Inter. Consigné avec U+00A0 dans `.claude/rules/contenu-pedagogique.md` §3.
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

#### 🟡 Point d'étape — 2026-08-14

**Reste 🟡 en cours, volontairement.** Le plan exigeait G-axe avec « navigation clavier
complète » ; le gate livré (`tools/a11y/verifier-axe.mjs`, `axe-core` sur jsdom) **ne peut
structurellement pas** couvrir le clavier — jsdom ne calcule ni boîtes ni cascade, et le script
l'imprime lui-même à chaque exécution. Le propriétaire a tranché : **Playwright sera câblé
maintenant, en lot séparé, dans cette même branche**, et c'est ce lot qui fermera E1-ST2.

**Livré et vert** : coquille du site (lien d'évitement premier focalisable, `<app-en-tete>`,
`<main id="contenu-principal" tabindex="-1">` unique, `<app-pied-de-page>`) ; routes `/` et
`/cours/securite-web` prerendues, route `404` réelle + `**` ; `PageAVenir`, `PageIntrouvable`,
`BasculeTheme` (radios natifs dans un `<fieldset>`, premier client du `ThemeService` de ST1-D),
`GestionFocusRoute` ; gate **G-axe** (`tools/a11y/verifier-axe.mjs`, `axe-core` en devDep,
~85 règles, auto-test qui prouve qu'il mord, câblé dans `ci.yml` **et** `deploy.yml`).

**Gates mesurés** : lint 0 · `typecheck:tools` 0 · **151 tests / 12 fichiers** (88 en début
d'epic) · build 3 routes prerendues, 1 cible interne vérifiée, 1 hachage de script · axe
3 pages / 258 vérifications / **0 violation** · `npm audit --omit=dev` 0.

**Trois décisions consignées** :
1. **`withNoIncrementalHydration()`** dans `app.config.ts` — le build sortait ROUGE :
   `provideClientHydration()` d'Angular 22 active par défaut l'hydratation incrémentale, qui
   embarque le rejeu d'événements et injecte **deux scripts inline** refusés par la CSP à
   hachages. Ces scripts n'apparaissaient **qu'avec le premier élément interactif** du site.
   Coût assumé : rejeu d'événements perdu, `@defer (hydrate …)` inerte (piège pour E2). Voir
   **S-005**.
2. **Route `cours/securite-web/:slug` RETIRÉE d'E1** (des deux côtés : `app.routes.ts` et
   `app.routes.server.ts`) — décision du propriétaire. Elle servait un **404 HTTP** titré
   « Leçon à venir » plus une erreur d'hydratation NG0500 en console. **E2-ST1 doit la
   réintroduire en `RenderMode.Prerender` avec un `getPrerenderParams()` alimenté par la
   compilation de `content/`** — sans quoi aucune leçon ne sera prerendue. La règle « un slug
   ne se réaffiche jamais tel quel » est conservée dans l'en-tête d'`app.routes.server.ts`.
3. **`navigationFallback` retiré** — correction de sécurité non planifiée : toute URL inconnue
   renvoyait **200 avec la page d'accueil légitime**. `/index.csr.html` fermée par 301.

**Dette ouverte, à ne pas perdre** :
(a) **clavier / focus visible / `target-size` ne sont couverts par AUCUN gate** — c'est le lot
Playwright qui suit, et c'est ce qui tient E1-ST2 ouverte ;
(b) ~~le motif SWA `/404/*` n'a pas été confirmé comme couvrant `/404/` lui-même~~ → **CLOSE le
2026-08-16, favorablement** : mesuré sur le site déployé, `GET /404/` répond **200 avec
`x-robots-tag: noindex`** — le motif couvre donc bien le dossier lui-même. Deux nuances constatées au
passage, aucune bloquante : `/404/index.html` est fermée par un **301** (comportement de
`trailingSlash: always`), et une vraie URL inconnue (`/404/quoi`) renvoie bien **404** mais **sans**
le `noindex` et avec `max-age=30` — c'est la réponse générée par `responseOverrides`, qui ne traverse
pas les règles `routes`. Un 404 n'étant pas indexable de toute façon, on n'y touche pas ;
(c) **S-003 reste ouvert** (inchangé par ce lot, mais son correctif est devenu moins cher :
`verifier-axe.mjs` démontre le patron « analyseur réel plutôt que regex » avec jsdom déjà
présent) ;
(d) la dette de typage (b) 34 / (c) 35 erreurs sur les deux gates de design est inchangée.

**Constat D-C6 confirmé par ce lot** (`docs/agile/backlog-phase-1.md:626` — « zéro violation
AXE » traité à tort comme équivalent à WCAG 2.2 AA) : Playwright est sa réponse.

#### ✅ Clôture — 2026-08-15 (lot Playwright)

**La dette (a) est remboursée, E1-ST2 est close.** Harnais Playwright (`playwright.config.ts`,
`tsconfig.e2e.json` = 4ᵉ programme de typage, bloc ESLint dédié) servant `dist/` par `npx swa start`
— donc **sous la CSP à hachages réellement générée**, et non sur un serveur statique nu qui
l'ignorerait. **5 specs / 11 tests** : ordre de tabulation réel et absence de piège du focus,
indicateur de focus calculé et non recouvert (2.4.7 / 2.4.11), taille de cible (2.5.8), bascule de
thème exercée au clavier avec zéro violation CSP en console. Gate **G-e2e** câblé dans `ci.yml`
**et** `deploy.yml` (L-007).

**Gates mesurés** : lint 0 · `typecheck:tools` 0 · `typecheck:e2e` 0 · **170 tests / 12 fichiers**
(151 en début de lot) · build 3 routes prerendues, 6 hachages de style + 1 de script · axe
258 vérifications / 0 violation · **e2e 11 tests**, verts aussi en `CI=true` · `npm audit --omit=dev` 0.

**Quatre décisions consignées** :
1. **Barre `target-size` = 24 × 24 px CSS (WCAG 2.2 · 2.5.8, niveau AA)** — arbitrage du
   propriétaire. Le dépôt annonçait « ≥ 44 px » dans `ci.yml`, `playwright.config.ts` et ici :
   c'est le critère **2.5.5, niveau AAA**, hors barre du projet. Corrigé aux trois endroits. Ce qui
   mesure entre 24 et 44 est **imprimé au journal** sans faire rougir. La cible mesurée est la zone
   cliquable (le `<label>`, pas l'`<input>` nu) ; l'exception « lien en ligne » est détectée
   étroitement (`display` calculé + texte voisin non-cible).
2. **`deploy.yml` scindé en deux jobs** — `gates` (aucun secret, exécute tout) → `publication`
   (`needs: gates`, détient le jeton, ne fait que téléverser puis constater en ligne). Motif :
   `playwright install --with-deps` télécharge un binaire **hors du contrôle d'intégrité de
   `package-lock.json`**, en root, et tournait dans le job détenant `AZURE_STATIC_WEB_APPS_API_TOKEN`.
   ⚠️ **La coupe protège le jeton, pas l'artéfact** : d'où le **sceau d'empreintes `sha256`** posé
   après `G-build` et revérifié avant le téléversement. Deux mesures distinctes — voir **S-007**.
3. **Vérifications en ligne rendues fail-closed** : `URL` absente donnait `::warning::` + `exit 0`,
   donc deux étapes **vertes sans avoir rien vérifié** juste après un déploiement réel. Passées en
   `exit 1`. Et elles contrôlent désormais les **directives** (`object-src 'none'`, `base-uri 'self'`,
   `frame-ancestors 'none'`, `upgrade-insecure-requests`, `max-age` HSTS, refus de
   `unsafe-inline`/`unsafe-eval`/`strict-dynamic`), plus seulement la présence des en-têtes — une CSP
   servie mais permissive passait. Voir **S-008**.
4. **`aria-label` sur le logotype** : `preserveWhitespaces: false` retirant le nœud blanc entre les
   deux `<span>`, le nom accessible calculé valait `Dr.Je-Sais-Tout` **en un seul mot** (l'espace
   visible ne vient que du `gap` CSS, qu'aucune API d'accessibilité ne lit). Les deux autres parades
   déplaçaient le rendu. Contrat verrouillé par `en-tete.spec.ts`. Voir **L-024**.

**Preuves de morsure** (aucun gate n'est déclaré vert sans avoir été vu rougir) : CSP retirée de
l'artéfact → le gate e2e rougit ; sonde de violations neutralisée → le contrôle positif rougit ;
`include` de `tsconfig.e2e.json` amputé → 6 tests rouges ; un octet ajouté à
`staticwebapp.config.json` → le sceau rougit ; quatre mutations de directives CSP → chacune
attrapée par le contrôle qui la vise.

**Dette ouverte, reportée sciemment** :
(a) **La CSP servie n'est vérifiée que par motifs, pas structurellement.** Une CSP permissive d'une
autre façon que les trois formes refusées passerait encore. Parade connue : comparaison directive
par directive avec `config/staticwebapp.config.source.json`, jetons `__HACHAGES_*__` normalisés.
C'est le constat le plus proche de ce que le site enseigne — à traiter avant la première leçon
publiée ;
(b) **`Azure/static-web-apps-deploy@v1` est un tag mutable**, exécuté dans le job qui détient le
jeton. Conforme à `.claude/rules/security.md` §3 (« `@vX` épinglé »), mais l'épinglage au SHA serait
le plancher supérieur ;
(c) **`.claude/rules/security.md` n'a pas encore intégré S-007/S-008** : §1 devrait exiger qu'une
vérification post-déploiement soit fail-closed sur ses préconditions, §3 la séparation
gate-avec-binaire-tiers / job-détenant-le-jeton **plus** le scellement d'artéfact ;
(d) **S-003 reste ouvert** (inchangé par ce lot) ; (e) la dette de typage (b) 34 / (c) 35 erreurs sur
les deux gates de design est inchangée.

**Constat D-C6 : fermé.** « Zéro violation AXE » n'est plus traité comme équivalent à WCAG 2.2 AA —
G-e2e couvre nommément ce qu'axe ne peut pas voir, et `playwright.config.ts` dit **exactement** ce
que le harnais ne garantit pas (réponses 200, HTTP local, un seul document HTTP).

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

#### 📐 Plan arrêté — 2026-08-15 (v2, après passe `devils-advocate`)

**Direction tranchée par le propriétaire : « l'exposition de pièces à conviction ».** La Home ne se
vend pas, elle **démontre** que le site s'applique son propre cours : la *star of the show* est un
extrait des **en-têtes de sécurité réellement servis par ce site**, annoté en marginalia, suivi de
« Ouvrez les outils réseau, vérifiez vous-même. » Elle est dessinée en **type et filets seulement** —
aucun SVG à main levée, donc aucun pari sur la qualité d'un dessin produit par un agent. Elle rime
avec **E3-ST13** (« les en-têtes réels de CE site comme étude de cas ») et **prouve** la cohérence
qu'exige `.claude/rules/security.md`.

Trois directions ont été écartées : le **sceau** (branding, pas produit ; qualité suspendue à un
dessin de LLM ; raté, il devenait la référence visuelle de tout E2), le **duo vulnérable/corrigé**
(fait entrer la règle de contenu pédagogique §4 dans une sous-tâche d'E1, et `direction-visuelle.md:136`
interdit l'encre rouge en ornement), et le **feuillet minimal**.

**Texte figé de l'extrait** — les 3 directives les plus stables, aucune ne portant de jeton
`__HACHAGES_*__` (contrairement à `script-src`/`style-src`), plus le **nom** du header HSTS sans sa
valeur pour ne pas figer un `max-age` : `default-src 'self'` · `object-src 'none'` ·
`frame-ancestors 'none'` · `Strict-Transport-Security`. **Dérive assumée pour E1** : le texte est en
dur et peut diverger de `config/staticwebapp.config.source.json` ; le générer au build est du niveau
E2 — c'est dit, pas promis.

**Décisions consignées** :
1. **`CarteCours` ne porte AUCUN lien** — titre en `<h2>`, pas en `<a>`. Conséquence heureuse : « un
   seul CTA » est tenu au pied de la lettre, il n'y a **qu'un** focalisable neuf sur `/`, et aucune
   collision de nom accessible avec le lien de nav « Sécurité des applications web ».
2. **Confinement des contrastes** : la Home se pose sur `surface`/`surface-creuse` uniquement, dont
   toutes les paires sont déjà mesurées (`verifier-contrastes.mjs:95-262`). `--couleur-surface-elevee`
   est **écarté** — il n'est mesuré que sur 4 paires, aucune avec `filet`/`accent`/encres
   secondaire-tertiaire. Zéro paire nouvelle. *Rappel structurel : le gate mesure une table de
   jetons, pas l'usage réel des composants — rien ne détecte une combinaison non listée.*
3. **Bloc d'en-têtes** : `<figure>` → `<pre><code>` + `<figcaption>`, `aria-label` sur la figure,
   `overflow-x: auto` **sur le `<pre>`** et jamais sur un ancêtre (à 360 px le texte défile
   localement, le `body` ne déborde pas). Aucune couleur d'accent dans le bloc.
4. **Ordre DOM = ordre de lecture** — grille CSS qui se replie, **interdiction** d'une propriété
   `order:` qui désynchroniserait le visuel du DOM (WCAG 1.3.2).
5. **Retrait du bloc `data`** de la route `''` (`app.routes.ts:60-65`) : il ne servait qu'à
   `PageAVenir`, le nouveau composant écrit son `<h1>` lui-même. Les garder serait du code mort
   silencieux. `app.routes.spec.ts` **ne change pas** — son filtre `component === PageAVenir` fait
   sortir la route toute seule.
6. **La carte annonce le chantier** (`mentionChantier`), le CTA menant encore à `PageAVenir`. E1-ST3
   se clôt donc ✅ et non 🟡. *À retirer quand la première leçon est publiée — rappel posé en E2-ST2.*

**Découpage en 4 lots, chacun un livrable vérifiable seul, chacun un agent frais** :
- **Lot A — implémentation** : `src/app/features/home/{accueil,carte-cours/,extrait-entetes/}` +
  route `''`. Contrat `CarteCours` : `titre` / `description` / `lien` en `input.required`,
  `mentionChantier` optionnel — **sans état ni progression**, ceux-là arrivent en E2-ST6.
  Gates : `lint`, `test`, `build`, `design:contrastes:check`, `a11y:axe`.
- **Lot B — specs Playwright d'E1-ST2** *(distinct de A, et conscient : ces comptes sont le seul
  garde-fou contre une boucle de focus vidée)*. `navigation-clavier.spec.ts:77-81` → scoper les
  locators « Accueil » et « Sécurité des applications web » au landmark de nav avec `exact: true`
  (fragiles par construction, indépendamment de ce lot) ; insérer l'arrêt « CTA Commencer » entre les
  radios et le pied de page ; `:123` 6 → 7 · `focus-visible.spec.ts:68` 6 → 7 ·
  `cibles-pointeur.spec.ts` 8 → 9 **et son commentaire d'énumération**.
  Gates : `typecheck:e2e` + les 3 specs.
- **Lot C — capture et critique visuelle** *(le trou que personne ne comblait : aucun gate ne
  REGARDE le résultat, et l'extrait n'étant pas `aria-hidden`, axe n'y changera rien)*. Script
  Playwright **jetable, non commité**, sur le build réel servi par `npx swa start` :
  `home-clair.png`, `home-sombre.png`, `home-360px.png` dans `e2e/__screenshots__/home/` (déjà
  couvert par `.gitignore:40`). L'agent **lit** les PNG et critique contre G1–G9.
  **Plafond : 3 itérations.** Au-delà, on **documente l'écart nommé** (quel G, quelle capture) et il
  remonte au propriétaire — on ne force pas une 4ᵉ passe.
- **Lot D — clôture documentaire** (scribe) : statut ✅ ici au format d'E1-ST2, rappel de retrait de
  `mentionChantier` posé en E2-ST2, `roadmap.md` si elle suit ce grain.

#### ✅ Les constats NAVIGATEUR d'E1, faits le 2026-08-16 sur le site déployé

Ils traînaient depuis des semaines parce qu'une consigne trop large (« l'outil navigateur est banni »)
avait été lue comme interdisant **tout** pilotage de navigateur. Le propriétaire a rectifié : seule
l'**extension** Claude in Chrome est écartée ; **Playwright — déjà installé pour G-e2e — est la voie**.
Scripts jetables, non commités, lancés sur `https://salmon-sky-0a730780f.7.azurestaticapps.net`, sous
la CSP à **9 hachages de style** réellement servie.

1. **Zéro violation de CSP en usage interactif** ✔ — les **trois** états de la bascule de thème
   actionnés, plus un aller-retour de navigation qui rejoue l'hydratation : **0** violation au
   détecteur natif `securitypolicyviolation`, **0** en console, **0** `pageerror`. Et un **contrôle
   positif** (L-019) dans la même page : un script inline non haché injecté après coup est refusé et
   **capté** — le détecteur mord, il n'est pas aveugle.
2. **Aucun flash de clair sur thème sombre épinglé** ✔ — et cette fois **prouvé par l'image**, pas par
   un `getComputedStyle` (L-025). Le chargement est **filmé** (screencast CDP) après
   `localStorage.setItem('drjst-theme','sombre')` : les **3 images** captées, dès la première, sont
   sombres (`rgb(24,28,37)`, luminance 0,109). Aucune image claire.
   ⚠️ **La première tentative a échoué sur l'INSTRUMENT, pas sur le site** : un `MutationObserver` posé
   en `addInitScript` part avant que `document.documentElement` existe, donc `observe(null)` lève — et
   le script mesurait son propre plantage, qu'il a rapporté comme « 1 violation CSP ». Corollaire de
   L-019 : *un instrument sans contrôle positif ne dit pas s'il a vu ou s'il est aveugle.*
3. **`/404/*` couvre bien `/404/`** ✔ — voir la dette (b) d'E1-ST2 ci-dessus, close favorablement.
4. **`link-in-text-block` sur le pied de page** ✔ *(le quatrième, gratuit)* — la règle axe que jsdom ne
   peut pas calculer. Mesuré sur le rendu réel : le lien « dépôt public sur GitHub » porte
   `text-decoration: underline` (1 px) en plus de sa couleur `rgb(16,80,143)` contre
   `rgb(78,88,110)` — il se distingue **autrement que par la couleur seule**. WCAG 1.4.1 tenu.

**Deux arguments FAUX du plan v1, à ne jamais resservir** : (1) `direction-visuelle.md:58` **conserve
explicitement** le dispositif « cartel » (« *mais ses cartels inspirent les en-têtes de modules* ») —
prétendre que le cartel est une direction tranchée contre tuerait à tort un cartel légitime en
E2-ST2 ; (2) « minimalisme = dashboards » vient de `principes-design-visuel.md:110`/`:122`, la ligne
sur la **depth/texture** que le projet invoque déjà **en faveur** de la sobriété (fondement de G2) —
la ligne pertinente est `:111`.

**Rappel utile au développeur** : les blocs `<style>` inline sont **hachés automatiquement**
(`generer-config-swa.mjs:384-394`) — un composant stylé ne coûte rien à la CSP. Seul l'**attribut**
`style="…"` fait échouer le build (`:379-382`).

**Non couvert par un gate** : la Home est la **première** page à porter de la vraie copie éditoriale
française, et **rien ne vérifie U+00A0** (`.claude/rules/contenu-pedagogique.md` §3) — à contrôler à
la main dans le Lot A.

#### ✅ Clôture — 2026-08-15

**Les quatre lots sont livrés, E1-ST3 est close.** La page `/` est la vraie accueil (`Accueil`,
`features/home/`) et non plus `PageAVenir` : ouverture (tampon, `<h1>` Fraunces, chapô), filet, la
**pièce à conviction** (`ExtraitEntetes` — `<figure>` → `<pre><code>` + marginalia + cartel
« vérifiez vous-même »), puis `CarteCours` portant l'**unique** appel à l'action du site. Type et
filets seulement, aucun dessin — le pari sur un SVG produit par un agent n'a jamais été pris.

**Gates mesurés** : lint 0 · `typecheck:tools` 0 · `typecheck:e2e` 0 · **197 tests / 15 fichiers**
(170 / 12 en début de lot, soit **+27** répartis 11 / 9 / 7 sur les trois composants) · build
**3 routes prerendues**, **9 hachages de style** + 1 de script (6 + 1 avant ce lot : les trois
feuilles de composants) · `design:contrastes:check` 33 paires / 66 mesures, **zéro paire nouvelle** ·
axe **258 vérifications / 0 violation** · **e2e 11 tests verts sous la CSP réelle** · `npm audit
--omit=dev` **0**.

**Ce que les 27 tests neufs verrouillent, au-delà du rendu** : un seul focalisable dans toute la page ·
le `lien` du CTA existe dans la table de routage du site (une adresse morte ferait rougir) · les
lignes affichées par `ExtraitEntetes` **existent encore** dans `config/staticwebapp.config.source.json`
(la preuve ne peut pas se périmer en silence) · aucune valeur périssable figée (le nom de HSTS, jamais
son `max-age`) · `overflow` déclaré **sur le `<pre>` seul** · aucune propriété `order` dans les trois
feuilles (WCAG 1.3.2) · U+00A0 présente et **U+202F / U+2009 absentes** du texte rendu **et** des
trois sources · aucun `innerHTML`, aucun `bypassSecurityTrust*`, aucun attribut `style` inline.

**Trois décisions consignées** :
1. **`Accueil` est importée directement, sans `loadComponent`.** Le site est entièrement prerendu :
   le HTML de `/` est déjà écrit, et rendre paresseuse la route d'**entrée** ajouterait un
   aller-retour réseau avant l'hydratation de la page la plus visitée, sans économiser un octet à
   personne. Le découpage paresseux redevient le bon geste en E2, où les routes de leçon sont
   nombreuses et rarement toutes visitées.
2. **Le bloc `data` de la route `''` a été retiré**, pas laissé en place : `Accueil` écrit son `<h1>`
   elle-même. `PageAVenir` reste **générique** (titre et chapô lus dans la route) plutôt que
   spécialisé « sommaire » — c'est ce qui lui permettra de couvrir la prochaine route annoncée avant
   d'exister. `app.routes.spec.ts` n'a pas bougé : son filtre `component === PageAVenir` fait sortir
   la route toute seule.
3. **Les comptes des specs Playwright d'E1-ST2 ont été relevés consciemment** — 6 → 7 arrêts de
   tabulation (`navigation-clavier`, `focus-visible`), 8 → 9 cibles de pointeur — et les deux liens
   de navigation sont désormais **scopés au repère `navigation` avec `exact: true`** : « Sécurité des
   applications web » est le nom du lien de nav **et** le titre de la carte, « Commencer le cours »
   mène à la même adresse. Sans le scope, la recherche par sous-chaîne aurait échoué en mode strict —
   un rouge exact mais illisible, accusant l'ordre de tabulation d'une faute qu'il n'a pas commise.

**Ce que le lot C a trouvé, et qu'aucun gate ne pouvait voir** : le `<hr>` de l'accueil était
**invisible** — style calculé juste, aucune erreur. La feuille de l'agent utilisateur pose
`margin-inline: auto` sur `<hr>` ; en item de grille, les marges automatiques l'emportent sur
l'étirement et la largeur retombe à **zéro**. Corrigé dans `@mixin filet-horizontal`, avec
l'explication en tête du mixin. C'est la justification rétroactive du lot : **six gates verts, et
personne ne REGARDAIT le résultat**. Leçon **L-025**. Une seule itération de critique a été
nécessaire (plafond : 3). Captures conservées hors dépôt (`e2e/__screenshots__/home/`, ignoré) :
clair, sombre, et 360 px — à 360 px, colonne unique, **aucun débordement horizontal du `body`**, le
bloc de code tient sans défiler.

**Revue contre `direction-visuelle.md` §3, à l'œil sur les captures** : G1 aucun dégradé (aplats
encre/papier) · G2 surfaces mates, aucun flou ni transparence · G3 Fraunces en display, Inter en
corps, hiérarchie franche · G4 un seul langage graphique — type et filets, **zéro emoji** · G5 les
deux thèmes dessinés (l'ardoise n'est pas l'inverse du papier) · G7 **aucune couleur ni taille en
dur** dans les trois feuilles, et G7-a tenu : **chaque bloc est borné par un filet**, jamais par sa
seule teinte de fond · G8 focus visible mesuré sur les 7 arrêts par Playwright · G9 accents
désaturés, aucune couleur criarde.

**Dette ouverte, reportée sciemment** :
(a) **le texte de l'extrait est en dur** — dérive assumée, bornée par le test qui relit
`staticwebapp.config.source.json` ; le générer au build est du niveau E2 ;
(b) **`mentionChantier` (« Chantier en cours ») est une dette datée** : tant que le CTA mène à
`PageAVenir`, la carte doit le dire. **À retirer quand la première leçon est publiée** — rappel posé
en E2-ST2 ;
(c) le gate de contrastes mesure une **table de jetons**, pas l'usage réel des composants : rien ne
détecterait une combinaison non listée. La Home se confine donc aux paires déjà mesurées
(`surface` / `surface-creuse`), `--couleur-surface-elevee` écartée ;
(d) toute la dette d'E1-ST2 est **inchangée** : (a) CSP servie vérifiée par motifs et non
structurellement · (b) `Azure/static-web-apps-deploy@v1` en tag mutable · (c) `.claude/rules/security.md`
sans S-007/S-008 · (d) S-003 · (e) typage 34 / 35 erreurs sur les deux gates de design.

---

## E2 · Moteur de contenu

| ID | Objectif | Statut |
|---|---|---|
| E2-ST1 | Pipeline build `content/` → HTML/JSON + routes prerendues | ✅ |
| E2-ST2 | Rendu des leçons (page leçon + routage) | ✅ |
| E2-ST3 | `QuizComponent` + score localStorage | ⬜ |
| E2-ST4 | `CodeCompareComponent` | ⬜ |
| E2-ST5 | `SimulationComponent` | ⬜ |
| E2-ST6 | Page sommaire du cours + progression localStorage | ⬜ |

#### ✅ Nœuds d'ouverture d'E2 — TRANCHÉS par le propriétaire le 2026-08-16

Trois questions lui appartenaient (posées dans le bloc REPRISE de `CLAUDE.md`), plus une quatrième
née de la passe d'avocat du diable. Le travail n'a pas été bloqué en attendant : des **défauts** ont
été pris le 2026-08-15 et implémentés. **Au retour, le propriétaire les a tous CONFIRMÉS, sans en
révoquer aucun**, et a fixé la suite : **E2-ST2 (page leçon & routage)** est le lot qui suit le merge
d'E2-ST1. Ce qui suit n'est donc plus provisoire — c'est la décision.

1. **Quelle dette payer avant la première leçon publiée ?** → la **vérification structurelle de la
   CSP servie** (comparaison directive par directive avec `config/staticwebapp.config.source.json`,
   plutôt que par motifs) est planifiée **avant E3-ST1**, la première leçon publiée — et **non**
   avant E2-ST1. La recommandation du dépôt dit « avant la première leçon publiée » : ce placement
   la respecte à la lettre, sans faire payer un lot au **chemin critique** J3→J4 qu'est E2-ST1.
2. **Leçon-témoin d'E2-ST1 : factice ou réelle ?** → **factice**, comme l'écrit §E2-ST1 ci-dessous.
   Le plan fait foi (L-001), et une vraie leçon mélangerait la boucle **contenu** (`/lecon`) à la
   boucle **livraison** que `.claude/README.md` sépare exprès.
3. **SonarCloud `css:S8776`** → **rien à faire côté dépôt** : le faux positif sur le `&` de
   `@mixin focus-visible` ne se marque que dans l'interface, par le propriétaire.
4. **Les diagrammes Mermaid sont-ils rendus au build, ou commités comme artéfacts relus ?**
   *(nœud neuf, soulevé par la passe d'avocat du diable sur le plan d'E2-ST1)* → défaut : **rendu au
   build**, mais avec les trois correctifs que l'avocat proposait en repli — **une invocation `mmdc`
   par leçon** (et non par diagramme), un **cache par hachage de la source**, et la **réutilisation du
   Chromium déjà installé pour Playwright** (`PUPPETEER_SKIP_DOWNLOAD=1` + `executablePath`), qui
   évite ~200 Mo de téléchargement en double.
   Pourquoi pas les SVG commités, que l'avocat recommandait : son argument principal — « chaque octet
   passe sous un œil humain en revue de PR » — ne tient pas pour 15 Ko de données de tracé par
   diagramme, et il se retourne même contre lui, puisque les identifiants générés par Mermaid varient
   d'un run à l'autre : chaque régénération produirait un diff massif et illisible. Son second
   argument — le non-déterminisme dans un artéfact scellé par sha256 — **a été vérifié et est faux** :
   `deploy.yml` calcule le sceau **après** un unique `G-build` et le revérifie avant publication,
   **même job, même artéfact, une seule construction**. Une variation d'un run à l'autre ne le casse
   donc pas. Ce qui reste vrai et non contesté : le coût en temps de build pendant E3, que les trois
   correctifs ci-dessus adressent.

#### 🔴 Dette de sécurité NEUVE, découverte pendant la planification d'E2-ST1 (2026-08-15)

**`tools/deploiement/generer-config-swa.mjs` ne détecte que le motif ` style="`.** Un attribut écrit
`style='…'` (guillemets simples) ou sans guillemets **échappe au garde-fou** : il ne serait ni signalé
ni haché, et passerait en production sous une CSP qui ne le couvre pas. C'est le **cousin direct de
S-003** — même famille de faute, découverte en vérifiant une objection de l'avocat du diable sur un
tout autre sujet.

Portée : **dépasse E2-ST1**, qui se contente de ne rien produire qui déclenche le trou (le pipeline de
contenu refuse tout `style=` en amont, avec son propre contrôle de conservation). Parade, la même que
pour S-003 : un **analyseur réel plutôt qu'une regex** — `verifier-axe.mjs` en démontre déjà le
patron, et jsdom est déjà une dépendance du dépôt.

À traiter avec S-003 et la vérification structurelle de la CSP, **avant E3-ST1**.

> 📌 **La parade a désormais un précédent DANS le dépôt**, ce qui abaisse encore son coût : la revue
> de sécurité d'E2-ST1 (2026-08-16) a trouvé la MÊME faute de famille dans
> `tools/content-pipeline/rendre-mermaid.mjs` — une liste noire de cinq motifs, que
> `<a xlink:href="javascript:…">`, `<use href="https://…">`, `<animate attributeName="href">` et
> `<set attributeName="onload">` traversaient intacts. Elle y a été remplacée par un **analyseur
> jsdom à liste blanche nominative**, calibré sur les éléments et attributs que `mmdc` émet
> réellement (six familles de diagrammes mesurées). C'est ce patron-là qu'il faudra transposer à
> `generer-config-swa.mjs`, pas en réinventer un.
>
> **Troisième membre de la famille, à traiter dans le même lot** : la portée réduite du sceau
> d'artéfact de `deploy.yml`. L'installation du navigateur (binaire CDN **+ `apt-get` en root**) a dû
> remonter avant la construction, parce que le pipeline de contenu en dépend ; le sceau ne couvre
> donc plus que la fenêtre construction → téléversement. Épingler le binaire par empreinte ne couvre
> que la moitié du risque (aucun digest n'épingle un `apt-get`) : la vraie parade est un **job propre**
> qui compile `content/` et remet ses sorties en artéfact. Le trou ne devient concret qu'avec le
> premier diagramme, donc en E3-ST1 — d'où son placement ici. L'isolation du **jeton**, elle, n'est
> pas touchée : vérifié, la seule occurrence de `secrets.` du fichier est dans `publication`.
>
> **Quatrième, du même lot et de la même nature** : `Azure/static-web-apps-deploy@v1` reste un **tag
> mutable** dans le job qui détient le jeton. Le SHA est connu (`1a947af9992250f3bc2e68ad0754c0b0c11566c9`,
> relevé le 2026-08-16) et l'épinglage tient en une ligne — il n'a **pas** été fait dans la PR
> d'E2-ST1 à dessein : modifier le job de publication dans une PR sur le pipeline de contenu ferait
> qu'un déploiement rouge ne dirait plus laquelle des deux causes l'a cassé. À payer avec le reste du
> lot, où il aura sa propre fenêtre de vérification.
>
> **Cinquième, relevé par la revue de sécurité d'E2-ST2 lot A (2026-08-17)** : dans
> `rendre-mermaid.mjs`, la liste blanche porte sur les **noms** d'attributs, et seules les **valeurs**
> de `href`/`xlink:href` sont contraintes (à `#…`). `fill`, `stroke`, `clip-path`, `marker-start` et
> `marker-end` acceptent donc un `<FuncIRI>` quelconque : `prefixerIdentifiants` ne fait échouer que
> sur un `url(#…)` orphelin, et un `url(https://exemple.invalide/x.svg#p)` traverserait en silence.
> **Impact réel nul aujourd'hui**, et c'est pourquoi ce n'est PAS un correctif d'E2-ST2 : `default-src
> 'self'` bloque la requête, et les navigateurs ont abandonné les références de paint-server
> inter-documents. C'est de la défense en profondeur — le troisième filet derrière deux qui tiennent.
> Parade : étendre le patron `ATTRIBUTS_REFERENCE` à ces attributs (mot-clef, couleur, ou `url(#…)` —
> tout autre `url(…)` refusé **nommément**, jamais retiré en silence). La revue n'a trouvé **aucun
> écart** entre la justification écrite du `bypassSecurityTrustHtml` et ce que le code applique, ce
> qui était la question S-009 posée à ce lot.

### E2-ST1 — Pipeline de contenu au build
- **Objectif** : implémentation de la conclusion S-01 : script de build qui valide `content/cours/securite-web/**` (frontmatter, schémas JSON quiz/simulation — gabarits de `docs/contenu/pipeline-contenu.md`), compile Markdown→HTML (coloration précompilée PHP/C#/TS, encadrés ⚠️/note/à-retenir), génère la liste des routes à prerendre. Build échoue si contenu invalide.
- **Fichiers** : `tools/content-pipeline/`, `content/cours/securite-web/` (leçon-témoin factice), `angular.json` (hook prerender).
- **Gates** : G-build (avec la leçon-témoin) ; test du pipeline (contenu invalide → échec explicite) ; G-lint.
- ⚠️ **Correction du champ « Fichiers » ci-dessus, vérifiée sur le dépôt** : `angular.json` **ne bouge
  pas** — il n'a aucune notion de script pré-build. Le point d'accroche réel est l'ordre des scripts
  de `package.json`, plus une étape CI explicite. Et la leçon-témoin ne vit **pas** dans `content/`
  mais sous `tools/content-pipeline/__fixtures__/temoin/` : le build de production ne peut alors
  physiquement pas la publier, ce qui supprime le besoin d'un champ `factice` que personne n'aurait
  été obligé de lire.

#### ✅ E2-ST1 CLOSE — 2026-08-16, branche `feat/e2-st1-pipeline-contenu`

Le plan qui a fait foi est le **v2**, sorti d'une passe `solution-architect` → `devils-advocate` →
2ᵉ passe d'architecte tranchant **douze objections** (4 bloquantes). Ses décisions structurantes
vivent désormais ici et dans les nœuds §E2 — le document de plan lui-même était dans un scratchpad
de session et n'a pas à être retrouvé.

| Lot | Contenu | État |
|---|---|---|
| 1 | Schémas Ajv + `valider.mjs` + 9 fixtures fail-closed | ✅ 9/9 rouges sur la bonne cause |
| 2 | `compiler-markdown.mjs` + Shiki + `types.d.ts` (le contrat) | ✅ 3 exigences dures prouvées par mutation |
| 3 | Mermaid : sonde du sanitizer, `rendre-mermaid.mjs`, SCSS des classes | ✅ branche B mesurée, 24 éléments → 0 |
| 4 | Manifeste + carte lazy + poids + câblage CI | ✅ `content:build` avant G-lint dans les 2 workflows |
| 5 | Vérification complète + revues + clôture | ✅ **ce lot** |

**Gates au moment de la clôture — tous verts, tous relancés par le fil principal :**
`lint` · `typecheck:tools` · **256 tests / 19 fichiers** · `build` (9 hachages de style, 1 de script)
· `a11y:axe` **258 vérifications, 0 violation** · **e2e 11/11** · `design:contrastes:check`
· `npm audit --omit=dev` **0**.

##### Ce que les deux revues à regard neuf ont changé — le lot 5 n'a pas été une formalité

Les deux ont rendu **CHANGEMENTS DEMANDÉS**. Ce qui a été corrigé avant le merge :

1. **🔴 Le nettoyage du SVG était une liste NOIRE de cinq motifs** (`rendre-mermaid.mjs`).
   `<a xlink:href="javascript:…">` — que Mermaid émet dès qu'une leçon emploie `click` —,
   `<use href="https://…">`, `<animate attributeName="href">` et `<set attributeName="onload">` la
   traversaient **intacts**. Gravité réelle : c'est ce nettoyage que `types.d.ts` cite comme la
   justification écrite du `bypassSecurityTrustHtml` d'E2-ST2, donc du **retrait total du sanitizer
   d'Angular** sur cette chaîne — une promesse plus large que ce que le code appliquait.
   → Remplacé par un **analyseur jsdom à liste blanche nominative** (`analyserSvg`), calibré sur les
   éléments et attributs que `mmdc` émet réellement, mesurés sur **six familles** de diagrammes
   (flowchart, sequence, class, state, er, pie). Refus nommés pour
   `a use image animate animateTransform animateMotion set script foreignObject`, tout `on…` refusé,
   `href`/`xlink:href` admis **seulement** en `#…`. Contre-vérifié indépendamment par le fil
   principal : **18 vecteurs refusés / 18, chacun sur SA propre règle**, et **3 SVG légitimes
   acceptés / 3** — la pince discrimine, elle ne refuse pas tout.
2. **🔴 Un contrôle positif que personne n'exécutait.** Les 9 fixtures invalides du validateur
   n'étaient lancées par **aucun** test, script npm ni workflow — et comme `content/cours/securite-web`
   n'existe pas encore, l'étape de validation de `content:build` valide **zéro fichier** : elle serait
   sortie verte avec un glob cassé. → `src/pipeline-contenu-validation.spec.ts` exige 9/9 refus
   **chacun sur sa cause propre**, plus un garde-fou de complétude (un 10ᵉ dossier sans assertion fait
   rougir) et l'autre moitié de la pince (la leçon-témoin valide passe en code 0). Mutation vérifiée.
3. **🔴 Des garde-fous hors du chemin réellement exécuté** — même famille que S-003. Le recomptage
   final et l'unicité des identifiants inter-diagrammes ne vivaient que dans le harnais CLI
   `rendre-mermaid.mjs --racine`, que `content:build` n'appelle jamais ; et un SVG relu **du cache**
   n'était revérifié par rien. → Les deux contrôles sont passés dans `build.mjs`, et tout SVG venu du
   cache repasse par `verifierSvgNettoye()`.
4. **🔴 Bug réel : deux diagrammes IDENTIQUES dans une même leçon** partageaient la clef de cache,
   donc recevaient le même SVG — **les mêmes `id` deux fois dans la page** (`duplicate-id-aria`, et un
   `url(#…)` pointant chez le voisin). → Le cache garde un **socle non préfixé** ; le préfixe dérive
   de (fichier, rang, code). Reproduit avant correction (24 identifiants partagés), puis vert.
5. Plus petits : `--no-sandbox` désormais **conditionné à `CI`** (il désarmait aussi le poste du
   développeur) · `VERSION_RENDU`, qu'il fallait incrémenter à la main (L-008), remplacé par
   `EMPREINTE_REGLES`, un sha256 **des règles elles-mêmes** — l'oubli devient impossible ·
   remontée de dossier `..` fermée dans les motifs `ficheSource`/`cheminFicheKb` des deux schémas
   (CWE-22, pure métadonnée aujourd'hui, garantie acquise pour le lot qui la résoudra) · crochet
   `prewatch` manquant · portée réduite du sceau `deploy.yml` **dite dans le nom de l'étape**.

##### Conventions tranchées en implémentation

`[[quiz]]` / `[[simulation]]` comme ancres ; **`::::` (quatre points) obligatoire** sur `comparaison`,
car l'exemple du plan à trois ouvertures pour deux fermetures **ne parse pas** ; `ligne: 0` =
annotation portant sur le bloc entier.

##### Constats hors périmètre, à ne pas perdre

- **(a)** `Langage` est fermé à six valeurs, donc **aucun bloc de code sans langue n'est possible**.
  Si le projet en veut un, c'est le **contrat** qui change, pas la fixture.
- **(b)** ~~la note `npm audit` de `CLAUDE.md` est périmée~~ → **corrigée** : l'audit complet est passé
  de 3 *moderate* à **5 vulnérabilités dont 4 *high*** (`adm-zip`/`devcert`/`tmp` via
  `@azure/static-web-apps-cli`, `nanoid` via `@angular/build`) — **préexistantes et dev-only**,
  `--omit=dev` reste à **0**.
- **(c)** **Sur un clone frais, `npm ci && npm test` est ROUGE** : la leçon-témoin porte deux
  diagrammes, donc `npm test` démarre `mmdc`, qui exige le Chromium de Playwright. L'ordre est
  `npm ci` → `npm run e2e:install` → le reste ; dit dans `CLAUDE.md` §Commandes et dans l'en-tête du
  spec d'orchestration, qui **nomme la commande** dans son message d'échec (jamais un `skip` muet).
- **(d)** Les 8 dépendances neuves sont **toutes dev, toutes MIT, gratuites et sans clé** — aucune
  n'entre dans `dependencies`, donc aucune n'atteint la surface livrée.

### E2-ST2 — Page leçon & routage
- **Objectif** : route `/cours/securite-web/:slug` prerendue consommant la sortie du pipeline ; gabarit de leçon (en-tête de module « page de garde », sommaire ancré, prev/next, méta SEO/OpenGraph) ; zéro parseur Markdown au runtime.
- **Fichiers** : `src/app/features/cours/lecon/`.
- **Gates** : G-lint, G-test, G-build (leçon-témoin prerendue), G-axe.
- **⏰ Rappel posé par E1-ST3** : dès que **la première leçon est publiée**, retirer la
  `mentionChantier` (« Chantier en cours ») de l'appel à `<app-carte-cours>` dans
  `src/app/features/home/accueil.ts`. C'est une dette datée, pas un ornement : la carte annonce un
  chantier tant que le CTA mène à `PageAVenir`, et cet avertissement devient un **mensonge** le jour
  où le cours ouvre. L'entrée est facultative — la retirer suffit, aucun composant à toucher
  (`carte-cours.spec.ts` couvre déjà le cas « absente »).

#### ⚠️ Trois réserves de clôture d'E2-ST2, toutes dues à un `content/` VIDE (2026-08-17)

Le lot B est vert, mais son gate `G-build (leçon-témoin prerendue)` **ne peut pas être franchi tel
qu'il est écrit** : le nœud tranché le 2026-08-16 place la leçon-témoin **hors de `content/`**, donc
le build de production prerende **0 route de leçon**. Les deux énoncés ne peuvent pas être vrais
ensemble ; c'est le gate qui est périmé, pas le lot. La preuve du routage a donc été faite en tests
unitaires, plus une construction jetable sur la fixture témoin (4 routes, `<head>` et sommaire
analysés à jsdom) — **une leçon n'a jamais été fabriquée dans `content/` pour verdir un gate**.

Ce qui en découle, à traiter **en clôture d'E3-ST1** (la première vraie leçon), pas avant :

1. **`npm run a11y:axe` et `npm run e2e` n'ont jamais vu la page de leçon** — aucune page n'existe à
   visiter. La barre dure AXE n'est pas *franchie* ici, elle est *contournée par l'absence de
   données*. Premier passage réel exigé à E3-ST1.
2. **La CSP servie n'a jamais été mesurée sur une page de leçon** : `generer-config-swa.mjs` n'a
   jamais inspecté son `<head>`. C'est la règle « enabler ≠ enforcement » (S-005) — un `npm run
   build` vert ne prouve rien sur une page qui n'existe pas. *Mesuré et rassurant en attendant* :
   `script-src` est `'self' <hachages>` **sans** `strict-dynamic`, donc `'self'` reste actif et le
   premier chunk paresseux du dépôt (`lecon`, 17,49 kB) chargera. À vérifier **live** malgré tout.
3. **Une leçon en `statut: brouillon` sera prerendue en page publique et indexable.** Le manifeste ne
   filtre pas sur `statut` — nœud tranché par le propriétaire le 2026-08-16, **non rouvert ici** —
   et `X-Robots-Tag: noindex` n'existe que sur `/404/*`. Conséquence à connaître avant de committer
   un brouillon dans `content/`, pas un défaut du lot.

#### 🔴 PR #13 est bloquée par SonarCloud — et seul le propriétaire peut la débloquer (2026-08-17)

`lint · test · build · audit` est **vert**. `SonarCloud Code Analysis` est **rouge**, sur une
**unique** condition : *E Security Rating on New Code* (requis ≥ A).

| Champ | Valeur relevée par l'API SonarCloud |
|---|---|
| Règle | `typescript:S6268` — « Make sure disabling Angular built-in sanitization is safe here » |
| Type / sévérité | **VULNERABILITY** / **BLOCKER** — pas un *hotspot* (`api/hotspots/search` renvoie 0) |
| Emplacement | `src/app/features/cours/lecon/rendu-blocs/rendu-blocs.ts:263` |
| Nombre | **1** — c'est le seul constat de sécurité de la PR |

**C'est l'unique `bypassSecurityTrustHtml` du site, et il est exactement celui qui a été décidé,
implémenté puis revu.** Sa nécessité est *mesurée* (`src/sonde-sanitizer-svg.spec.ts` : 24 éléments
→ 0, 71 attributs → 0), sa portée est tenue par un garde-fou à l'échelle du dépôt
(`src/garde-fou-contournements-sanitizer.spec.ts`), sa justification nominative est au point d'appel,
et la revue `security-reviewer` du 2026-08-17 n'a trouvé **aucun écart** entre ce que ce texte promet
et ce que le code applique. Sonar ne peut pas savoir tout cela : S6268 se déclenche sur *tout* appel,
par conception.

**Ce qu'il ne faut PAS faire** : ajouter un `// NOSONAR`, ni tenter un `sonar.issue.ignore.*` dans
`.sonarcloud.properties` — l'analyse **automatique** ignore ces paramètres (c'est déjà la raison pour
laquelle `css:S8776` ne se règle pas côté dépôt). Museler un constat de sécurité par un commentaire
serait par ailleurs l'inverse de ce que ce site enseigne.

**Action, côté propriétaire uniquement, dans l'interface SonarCloud** : ouvrir l'issue et la marquer
**« Accepted »** (*won't fix*) avec un commentaire pointant vers `rendu-blocs.ts` §« L'UNIQUE
`bypassSecurityTrustHtml` DU SITE ». Le rating repasse à A et la porte devient verte.

> 📌 **Deuxième item SonarCloud qui n'appartient qu'au propriétaire**, après le faux positif
> `css:S8776` (le `&` de `@mixin focus-visible`). Les deux se règlent au même endroit, en deux
> minutes. Tant qu'ils ne sont pas faits, la porte reste rouge et masque tout constat **neuf** —
> c'est le vrai coût, et c'est pourquoi ils ne doivent pas traîner.

### E2-ST3 — QuizComponent
- **Objectif** : quiz piloté par JSON (choix multiple, vrai/faux, mise en situation) ; correction expliquée par question ; score et état persistés en `localStorage` ; entièrement clavier/lecteur d'écran.
- **Fichiers** : `src/app/features/cours/quiz/`, schéma JSON dans `tools/content-pipeline/schemas/`.
- **Gates** : G-lint, G-test (logique de scoring), G-build, G-axe.

#### 📐 Périmètre réel et découpe — relevé sur le dépôt le 2026-08-17

**Deux constats qui élargissent le lot par rapport à la ligne « Objectif » ci-dessus.**

1. 🔴 **Le pipeline valide `quiz.json` mais ne l'ÉMET PAS.** `valider.mjs` le contrôle
   intégralement (schéma + cohérences hors schéma : `bonneReponse` ∈ `choix`, `lecon` = slug,
   ≥ 2 types distincts), et `compiler-markdown.mjs` produit bien un bloc `{ type: 'ancre-quiz' }`
   dans l'AST — mais **`LeconCompilee` n'a aucun champ quiz** (`tools/content-pipeline/types.d.ts`).
   Rien ne parvient donc au navigateur. E2-ST3 contient un **lot de pipeline**, ce que la ligne
   « Fichiers » ne laissait pas deviner.
2. **Le schéma définit QUATRE types de questions**, pas trois : `choix-multiple`, `vrai-faux`,
   `associer` et `trouver-la-faille`. Chacun a sa mécanique d'interaction **et** sa mécanique
   d'accessibilité. La ligne « Objectif » n'en nommait que trois, dont une (« mise en situation »)
   qui ne correspond à aucun `type` du schéma.

**Découpe retenue** — application du « test du + » (`.claude/rules/agent-context-budget.md` §2) :
un lot en une phrase, vérifiable seul, un agent frais chacun.

| Lot | Contenu | Vérifiable par | Statut |
|---|---|---|---|
| **A** | `core/progression/` — service de progression `localStorage`, en signaux, avec sa sérialisation versionnée et sa tolérance aux données absentes/corrompues | G-test seul (aucune UI) | ⬜ |
| **B** | Émission du quiz par le pipeline : type `QuizCompile` dans `types.d.ts`, sortie du compilateur, fixture témoin, mutation prouvant que le gate mord | G-content, G-test | ⬜ |
| **C** | `QuizComponent` (coquille, navigation, score, correction expliquée) + les deux types simples : `choix-multiple`, `vrai-faux` | G-test, G-axe, **G-clavier** | ⬜ |
| **D** | Les deux types difficiles : `associer` et `trouver-la-faille` | G-test, G-axe, **G-clavier** | ⬜ |
| **E** | Vérification de bout en bout (agent jetable) : a11y, e2e sous CSP réelle, CSP revalidée | tous gates | ⬜ |

**Pourquoi A d'abord, et pas le composant** : c'est le lot qui crée `core/progression/`, donc celui
où se **gagne ou se perd** la règle « aucune feature n'importe une autre feature »
(`docs/architecture/stack-et-architecture.md` §7). E2-ST6 lira ce même service. L'écrire *après* le
composant, c'est écrire le composant contre un état local qu'il faudra ensuite extraire.

**⚠️ Trois pièges nommés pour les lots C et D :**
- **`associer` n'est PAS un glisser-déposer.** Le drag & drop est un piège d'accessibilité connu, et
  WCAG 2.2 ajoute justement **2.5.7 Dragging Movements** (tout geste de glissement doit avoir une
  alternative à pointeur simple). Patron attendu : une liste de sélection par paire, opérable au
  clavier seul. À trancher au lot D, pas improvisé.
- **`trouver-la-faille` empiète sur E2-ST4.** Il affiche du code numéroté avec une ligne à désigner —
  c'est-à-dire la moitié du `CodeCompareComponent`. Décider au lot D si le rendu de code est **mis en
  commun** dès maintenant ou dupliqué puis fusionné ; le dupliquer sans le dire est la vraie faute.
- **Le code de `trouver-la-faille` est VOLONTAIREMENT vulnérable** (`security.md` §4) : il n'est
  jamais exécuté, jamais interpolé dans du HTML de confiance, et il ne passe **pas** par le
  contournement de sanitizer d'E2-ST2 — qui reste scopé au seul bloc `mermaid`.

**⚠️ Et le piège de CSP qui vise ce lot précisément** : E2-ST3 est le **premier composant réellement
interactif d'une page de leçon**. « Une CSP validée sur une page INERTE ne vaut que pour une page
inerte » (S-005) — Angular injecte des scripts inline avec le premier écouteur d'événement, ce qui a
déjà rendu un build rouge en E1-ST2. À revalider au lot E, liste blanche **nominative**.

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

### E2-ST6 — Sommaire du cours & progression *(= la « carte de parcours »)*
- **Objectif** : page `/cours/securite-web` : les 13 modules dans l'ordre de lecture (sections Fondations / Attaques / Identités & données / Hébergement), état par module (non commencé / lu / quiz réussi) depuis `localStorage`, temps de lecture estimé.
- **Fichiers** : `src/app/features/cours/sommaire/`, `src/app/core/progression/`.
- **Gates** : G-lint, G-test (service progression), G-build, G-axe.
- 🆕 **C'est le porteur de la couche « jeu » décidée le 2026-08-17** (§E6). Elle est délibérément
  **restreinte**, et le périmètre ci-dessous fait foi contre toute tentation d'en ajouter :

  | On prend | Pourquoi |
  |---|---|
  | **La carte de parcours** — les 13 modules en chemin visible, état de chacun | Geste central de boot.dev, et c'était **déjà** l'objectif de cette sous-tâche. La bascule lui donne un langage visuel, pas une fonctionnalité de plus. |
  | **La maîtrise, pas le score** — un module se marque « maîtrisé » au quiz réussi, jamais au temps passé | Le quiz explique déjà chaque distracteur (`.claude/rules/contenu-pedagogique.md` §5) : c'est de la remédiation, pas une note. |
  | **Le moment mémorable** — la simulation pas-à-pas | Constat **D-C7**, toujours ouvert : 4 modules sur 13 n'en ont aucune. |

  | On refuse | Pourquoi |
  |---|---|
  | **Série quotidienne (streak)** | Dark pattern documenté de Duolingo : produit de l'anxiété de série, pas de l'apprentissage. Et il n'a aucun sens sans compte, sur un cours de 13 modules à faire en 10 semaines. |
  | **Ligues, classements** | Impossibles sans backend (phase 2) — et la recherche montre qu'ils détournent de l'objectif d'apprentissage. À rouvrir seulement si la phase 2 le justifie. |
  | **Monnaie, coffres, boutique** | Le modèle économique de boot.dev en dépend ; pas le nôtre. Zéro dépense, zéro compte, zéro achat : un vocabulaire de récompense sans usage réel serait du décor. |

- 🆕 **Règle d'architecture qui devient concrète ici** : `cours/sommaire` a besoin de la progression
  que `cours/quiz` (E2-ST3) produit. Elle passe par un service de **`core/progression/`** que les
  deux injectent — **aucune feature n'importe une autre feature**. C'est la seule règle de l'état de
  l'art frontend 2026 qui manquait encore au dépôt ; détail dans
  `docs/architecture/stack-et-architecture.md`.

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

**⏰ Dette à payer AVANT la première leçon publiée** *(nœud 1 tranché le 2026-08-15, §E2)* : la
**vérification structurelle de la CSP servie** — comparer la politique réellement renvoyée par SWA
**directive par directive** avec `config/staticwebapp.config.source.json`, au lieu des motifs
actuels qui laisseraient passer une CSP permissive d'une forme non listée. C'est le constat le plus
proche de ce que le site enseigne : publier une leçon sur les en-têtes avec ce trou ouvert serait
exactement l'incohérence que `.claude/rules/security.md` interdit. À faire dans le lot qui précède
E3-ST1, pas pendant.

### E3-ST0 — Rattrapage d'archivage : le site du cours a été complété *(⬜ — préalable au bloc A)*

- **Origine** : signalé par le propriétaire le **2026-08-17**. Lors de la passe `/archiviste` qui a
  produit les fiches de `KnowledgeBase/web/securite/`, **le site de l'enseignant n'était pas
  terminé** — il manquait des diapositives et des notes, ce qui a laissé des **trous dans les fiches
  sources**. L'enseignant a depuis mis en ligne une grande partie (ou la totalité) du contenu
  manquant.
- **Sources** :
  - <https://www.alexandrepetrin.ca/securisation-des-applications-web/> — le cours 420-B10-HU lui-même
  - <https://www.alexandrepetrin.ca/php/> — le cours de PHP (les exemples de code du cours sont en PHP)
- **Pourquoi c'est un préalable et pas une tâche de fond** : les 13 modules d'E3 sont rédigés
  **depuis les fiches KB**. Une fiche trouée produit une leçon trouée, et le
  `verificateur-theorie` ne peut pas inventer ce qui manque à la source. Le coût d'un rattrapage
  après rédaction, c'est de réécrire des leçons déjà publiées.
- **Livrable** : passe `/archiviste` sur les deux URL, **en fusion** (pas en création) sur les fiches
  existantes de `web/securite/` ; note datée de ce qui a été ajouté, corrigé ou contredit.
- **⚠️ Contrainte** : la KnowledgeBase est en **lecture seule sauf correction d'erreur avérée**
  (CLAUDE.md). Une *fusion d'archivage* est le cas prévu par le skill `/archiviste` — mais tout
  écart entre l'ancienne fiche et le nouveau matériel se **signale** ; il ne s'écrase pas en
  silence.
- **Portée de vérification** : si le nouveau matériel du cours contredit l'état de l'art, c'est un
  encadré ⚠️ « ce que le cours dit vs l'état de l'art » de plus — la matière d'examen reste ce que
  l'enseignant enseigne. C'est déjà la règle d'E3 ; le rattrapage ne fait qu'en augmenter le nombre.
- **Gates** : fiches fusionnées sans doublon ; `docs/kb-map.md` mis à jour si la couverture change ;
  aucun module d'E3 démarré avant que sa fiche source soit à jour.
- **Découpe budget** : deux URL = potentiellement beaucoup de matériel. Un agent = un cours. Si le
  cours de sécurité seul dépasse, découper par bloc de modules.

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
- 🔴 **LIVRABLE SUPPLÉMENTAIRE — le thème clair, dette datée de la décision D-2 (2026-08-17).**
  La bascule visuelle d'E6 livre le **sombre seul** ; le garde-fou **G5** de
  `docs/design/direction-visuelle.md` a été amendé en conséquence et `prefers-color-scheme: light`
  est délibérément ignoré d'ici là. **C'est ici que la dette se paie**, et elle est écrite comme un
  livrable avec ses gates — pas comme une note dans un document, parce que le mode d'échec connu de
  ce dépôt est précisément la dette datée sans échéance exécutable (famille de **L-007** : « un gate
  livré n'est pas un gate câblé »).
  - **Contenu** : second thème dessiné — *papier blueprint*, encre ambre-brûlée sur fond froid —
    et **non** une inversion automatique du sombre (exigence historique de G5).
  - **Gates propres** : `design:contrastes:check` vert sur **les deux** thèmes (le gate repasse de
    33 à 66 mesures) · G-axe sur les deux thèmes · bascule manuelle persistée toujours
    fonctionnelle (elle existe depuis E1-ST1-C, elle n'est pas à réécrire).
  - **Si l'échéance d'octobre est menacée** : c'est cette ligne qui saute en premier, et son
    abandon se consigne alors comme **écart assumé** dans `docs/vision.md` §S8 — jamais en silence.

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

## E6 · Bascule d'identité visuelle — « Moniteur ambre »

> **S'exécute APRÈS E3 bloc A**, pas avant (décision **D-3** du 2026-08-17). Le cours doit être en
> ligne pour la mi-septembre ; l'habillage ne prend pas le chemin critique. Brief de référence :
> [`docs/design/direction-visuelle.md`](../design/direction-visuelle.md) — qui **fait foi** et
> contient la palette mesurée, les garde-fous G1–G11 et les quatre décisions.

| ID | Objectif | Statut |
|---|---|---|
| E6-ST1 | Palette : primitives + jetons sémantiques + gate de contraste recalibré | ⬜ |
| E6-ST2 | Typographie : retrait de Fraunces, police d'affichage, gate de glyphes | ⬜ |
| E6-ST3 | Motifs : mixins carnet → mixins arcade, ambiance | ⬜ |
| E6-ST4 | Logotype & en-têtes de module | ⬜ |
| E6-ST5 | Vérification de bout en bout (a11y, e2e, CSP, poids) | ⬜ |

**Le pari de cet épic, à vérifier plutôt qu'à supposer** : *aucun composant ne doit être touché pour
changer de peau.* Si un composant doit l'être, c'est qu'il violait **G7** (couleur ou taille en dur)
— c'est un **défaut à corriger et à consigner**, pas un coût normal de la bascule. Le nombre de
composants touchés est donc la mesure de santé du design system : à rapporter en clôture.

### E6-ST1 — Palette
- **Objectif** : réécrire les 73 valeurs de `_primitives.scss` sur la gamme « moniteur ambre » ;
  remapper les 58 jetons sémantiques de `_themes.scss` **sans renommer** ; supprimer la branche de
  thème clair (décision D-2 — sa réintroduction est un livrable d'E4-ST1).
- **Fichiers** : `src/styles/_primitives.scss`, `src/styles/_themes.scss`,
  `tools/design/verifier-contrastes.mjs` (liste de paires), `src/styles/design-system.spec.ts`.
- **Point de départ mesuré** : la table de §2 de `direction-visuelle.md` — **18 paires, 0 échec**,
  mesurées le 2026-08-17 avec la formule du gate.
- ⚠️ **Le piège déjà rencontré, à ne pas repayer** : le premier jet de filets (`#26343A`) mesurait
  **1,42:1** contre le seuil **3:1** que **G7-a** rend obligatoire. Sur fond noir, un filet trop
  discret est la faute la plus facile à commettre et elle est invisible à l'œil. Les valeurs de
  filet se **cherchent numériquement**, jamais à vue.
- **Gates** : `npm run design:contrastes:check` vert (33 paires recalibrées) · G-build · G-axe ·
  G-test.

### E6-ST2 — Typographie
- **Objectif** : retirer Fraunces (2 `.woff2` + licence + `@font-face`, ~113 Ko livrés en moins) ;
  **conserver Inter** pour le corps ; adopter une mono d'affichage pour les titres.
- **Fichiers** : `src/styles/_polices.scss`, `public/` (fichiers de polices + licence OFL),
  `tools/design/verifier-glyphes.mjs`, `docs/design/polices.md`.
- 🔴 **Ordre obligatoire : mesurer AVANT d'adopter.** Une police d'affichage se passe à
  `verifier-glyphes.mjs` (lecture réelle de la table `cmap`) **avant** d'entrer dans le dépôt. Les
  polices pixel couvrent notoirement mal le français ; c'est ce gate qui a interdit le sous-ensemble
  maison en E1-ST1-B, sur `œ`, `« »` et `’`. Candidats : Departure Mono, VT323, Silkscreen,
  Press Start 2P, JetBrains Mono, IBM Plex Mono.
- **Repli explicite si tous les candidats tombent** : une mono à large couverture traitée en
  **capitales espacées** — le caractère vient du traitement, pas de la fonte. Ce n'est pas un échec
  du lot, c'est une branche prévue.
- **Contrainte inchangée** : le contenu emploie **U+00A0**, jamais U+202F ni U+2009.
- **Gates** : `npm run design:glyphes` vert · poids des polices livrées **mesuré et rapporté**
  (référence à battre : 196 Ko livrés / 83 Ko chargés) · G-build · G-axe.

### E6-ST3 — Motifs
- **Objectif** : remplacer le vocabulaire « carnet » par le vocabulaire arcade — `marge-carnet`,
  tampons et marginalia sortent ; cartouche d'arcade, jauge segmentée, filet pixel entrent.
  Ambiance (scanline, pluie de glyphes) **décorative uniquement**.
- **Fichiers** : `src/styles/_mixins.scss`, composants n'utilisant les mixins retirés.
- **Conservés tels quels** : `@mixin filet-horizontal` (avec son correctif **L-025** sur
  `margin-inline: auto` — un item de grille à marge auto tombe à une largeur de zéro),
  `@mixin focus-visible`, `marque-pedagogique($type)` (contrepartie **G7-b**, survit à
  `forced-colors`).
- 🔴 **G6 et G10/G11 sont bloquants ici**, et c'est le lot où on les enfreint sans le vouloir :
  toute ambiance est `aria-hidden`, **disparaît** sous `prefers-reduced-motion`, et **ne tourne
  jamais dans le champ de lecture d'une leçon**. Pas de terminal factice comme conteneur de prose,
  pas de texte qui se tape tout seul, pas de « ACCESS GRANTED ».
- ⚠️ **Rappel de l'instrumentation** : `prefers-reduced-motion` + `transition-duration: 0.01ms
  !important` sur `*` transforme tout changement de style en micro-transition — un `getComputedStyle`
  sec ment (**L-021**), et un style calculé juste ne prouve pas un pixel peint (**L-025**). Ce qui
  fait foi ici est une **capture**, pas une assertion de style.
- **Gates** : G-lint, G-test, G-build, G-axe ; **nombre de composants touchés rapporté** (cf. le pari
  de l'épic).

### E6-ST4 — Logotype & en-têtes de module
- **Objectif** : logotype en cartouche mono capitales (décision **D-4** : identité **typographique**,
  aucun avatar dessiné) ; en-têtes de module en cartouche d'arcade — numéro en pastille pleine, titre,
  question-clé de la fiche KB en exergue.
- **Fichiers** : `src/app/core/layout/`, `src/app/features/cours/lecon/`, `src/app/features/home/`.
- ⏰ **À faire au même moment, si ce n'est pas déjà fait** : retirer la `mentionChantier`
  (« Chantier en cours ») de `<app-carte-cours>` dans `src/app/features/home/accueil.ts` — dette
  posée par E1-ST3, qui devient un **mensonge** dès la première leçon publiée. À E6, le bloc A est
  en ligne : elle doit avoir disparu.
- **Gates** : G-lint, G-test, G-build, G-axe.

### E6-ST5 — Vérification de bout en bout *(agent de vérification jetable)*
- **Objectif** : relancer la **totalité** des gates sur la peau neuve et consigner les chiffres.
- **Gates** : `lint` · `typecheck:tools` · `test` · `build` · `a11y:axe` **zéro violation** ·
  `e2e` · `design:contrastes:check` · `design:glyphes` · `npm audit --omit=dev` **0**.
- 🔴 **Deux vérifications propres à CETTE bascule, qu'aucun gate existant ne couvre :**
  1. **La CSP à hachages est sensible au CSS.** `generer-config-swa.mjs` hache les styles émis ;
     changer toute la palette change les hachages. Un `npm run config:swa` vert **et** une
     vérification en ligne des en-têtes servis sont exigés — « enabler ≠ enforcement » (**S-005**),
     et un build vert ne prouve rien sur ce qui est servi (**L-004** : attendre l'*effet*, pas le
     code de retour).
  2. **`optimization.styles.inlineCritical: false` doit être toujours actif.** C'est ce qui empêche
     Angular d'émettre un gestionnaire `onload` inline que la CSP stricte bloquerait — le site
     s'afficherait alors **sans styles**. Un lot qui réécrit tout le CSS est exactement le moment où
     cette option se fait perdre de vue.
- **Sortie attendue** : ≤ 20 lignes, **des chiffres**, pas de logs collés.

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
