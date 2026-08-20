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

#### 🔧 Lot CI du 2026-08-19 — pendaison de l'installation du navigateur, corrigée

- **Incident.** L'étape « Installer le navigateur » de `ci.yml` a pendu **53 min** puis **12+ min**,
  contre **2 min 12 s** pour le run entier la veille. **Aucun des trois workflows** ne déclarait
  `timeout-minutes` — un job pendu court jusqu'au **plafond GitHub de 6 h** sans jamais rougir.
  Runs `32224090384` (blocage) et `32264319046` (déploiement rouge, mais c'est ce run qui a livré
  la mesure de la cause).
- **Cause, mesurée, pas supposée** : `azure.archive.ubuntu.com` servait à **~27 ko/s** ; les
  bibliothèques de Chromium étaient **déjà présentes** sur l'image du runner ; les **21 Mo**
  effectivement téléchargés par `--with-deps` étaient **neuf paquets de polices non latines**
  (japonais, thaï, chinois, cyrillique) — inutiles à un site en français.
- **Trois PR, toutes fusionnées, déploiement vert** : **#23** — bornes `timeout-minutes` sur les
  4 jobs des 3 workflows, et scission de l'installation du navigateur en **deux scripts npm**
  (l'un pour les dépendances système, l'autre pour le seul binaire Playwright) · **#22** — clôture
  E2-ST5 + E3-ST0 · **#24** — retrait de l'`apt-get` en root de la CI.
- **Ce que ça paie** : l'`apt-get` en root **disparaît de la CI** — c'est **une des deux dettes**
  situées hors du sceau d'artéfact de `deploy.yml` (§E1-ST2/E2, dette S-003 et suivantes),
  **réellement payée**. **L'autre reste entière** : le binaire CDN de `mmdc`/Playwright, hors
  `package-lock.json`, protégé par HTTPS seul puis exécuté sans vérification d'empreinte — le job
  propre du lot de dette pré-E3-ST1 garde sa raison d'être. Ne pas laisser croire cette dette-là
  réglée.
- **Contrepartie assumée** : un futur diagramme Mermaid à glyphes non latins (japonais, thaï,
  chinois, cyrillique) sortirait en **tofu** (glyphe manquant) ; la parade est de réinstaller
  **ces polices-là, nommément**, jamais de rétablir `--with-deps` en bloc.
- **Leçons nées** : **L-048**, **L-049**, **S-018**, plus **L-005 réaffûtée** (nouvel axe : un run
  vert ne referme pas une panne **intermittente** — il faut avoir vu l'échec se reproduire pour se
  fier au vert qui suit).

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
  ⚠️ **Correction apportée le 2026-08-19, en clôturant le lot** : la charge d'exemple ci-dessus,
  `<script data-x=a"b">alert(1)</script>`, a un nombre **PAIR** de guillemets et était **déjà
  capturée** par l'ancien motif (1 capture mesurée) — elle ne démontrait donc **pas** le défaut,
  et ce depuis sa rédaction le 2026-08-08. La charge qui le démontre exige un guillemet **non
  refermé** : `<script data-x=a"b>alert(1)</script>` → ancien motif **0 capture**, analyseur jsdom
  **1 élément**, corps `alert(1)`.
  **✅ CLOS le 2026-08-19 (PR #27)** : `generer-config-swa.mjs` remplacé par un **analyseur jsdom
  unique par page**, sur le patron de `verifier-axe.mjs`/`rendre-mermaid.mjs` — plus de motif
  regex pouvant ne rien apparier.
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
  **✅ CLOS LE 2026-08-17 — et il n'était PAS qu'un coût de performance.** Signalé par le
  propriétaire depuis la console du site déployé : `/main-5RJCKUZA.js/chunk-6ZRI2U7P.js` en **404**.
  Le 301 déplace l'**URL finale du module**, donc la **base de résolution de ses imports relatifs** :
  `import('./chunk-….js')` visait un dossier qui n'existe pas, et la **route paresseuse de la page de
  leçon était morte en production**. Défaut dormant depuis E1, réveillé par le **premier chunk
  paresseux** du dépôt (E2-ST2) — un lot qui ne l'a pas causé.
  **Correctif appliqué** : `trailingSlash: "auto"`. Il **garde** ce qui motivait `always` — les
  dossiers restent canonicalisés (`/cours/securite-web` → 301 → `/cours/securite-web/`, mesuré) —
  et sert les fichiers directement, sans redirection. L'arbitrage SEO qui bloquait la décision
  n'avait donc pas de contrepartie à peser.
  **Gate neuf, parce qu'aucun n'aurait pu voir ça** : `deploy.yml`, étape « Vérifier le routage
  servi », bloc **(c)** — chaque asset référencé par la page d'accueil réellement servie doit
  répondre **200, jamais 3xx**. ⚠️ Le contrôle est **en ligne et nulle part ailleurs** :
  l'émulateur `npx swa start` **n'implémente pas `trailingSlash`** (zéro occurrence dans son code),
  donc le gate e2e tournait sous une politique de routage qui n'était pas celle de la production et
  restait vert pendant que la production était cassée. Leçon **L-032**.
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
(c) ~~S-003 reste ouvert~~ → **✅ CLOS le 2026-08-19 (PR #27)**, voir §E1-ST1 ;
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
(a) ~~La CSP servie n'est vérifiée que par motifs, pas structurellement.~~ → **✅ CLOS le
2026-08-19 (PR #28)** : comparaison **structurelle directive par directive**, 11 directives
énumérées au journal ;
(b) ~~`Azure/static-web-apps-deploy@v1` est un tag mutable~~ → **✅ CLOS le 2026-08-19 (PR #28)** :
épinglé au SHA `1a947af9992250f3bc2e68ad0754c0b0c11566c9` (le **tag** `v1`, relevé au journal du
run 32308397145 ; la branche `v1` diverge, `4d27395…`, volontairement **non** retenue — un
épinglage fige, il n'upgrade pas) ;
(c) **`.claude/rules/security.md` n'a pas encore intégré S-007/S-008** : §1 devrait exiger qu'une
vérification post-déploiement soit fail-closed sur ses préconditions, §3 la séparation
gate-avec-binaire-tiers / job-détenant-le-jeton **plus** le scellement d'artéfact ;
(d) ~~S-003 reste ouvert~~ → **✅ CLOS le 2026-08-19 (PR #27)** ; (e) la dette de typage (b) 34 / (c) 35
erreurs sur les deux gates de design est inchangée.

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
(d) dette d'E1-ST2 : (a) ~~CSP servie vérifiée par motifs~~ et (b) ~~`Azure/static-web-apps-deploy@v1`
en tag mutable~~ et (d) ~~S-003~~ → **✅ CLOSES le 2026-08-19** (PR #27, #28) · (c)
`.claude/rules/security.md` sans S-007/S-008 · (e) typage 34 / 35 erreurs sur les deux gates de
design — **toujours ouvertes**.

---

## E2 · Moteur de contenu

| ID | Objectif | Statut |
|---|---|---|
| E2-ST1 | Pipeline build `content/` → HTML/JSON + routes prerendues | ✅ |
| E2-ST2 | Rendu des leçons (page leçon + routage) | ✅ |
| E2-ST3 | `QuizComponent` + score localStorage | ✅ |
| E2-ST4 | `CodeCompareComponent` | ✅ |
| E2-ST5 | `SimulationComponent` | ✅ |
| E2-ST6 | Page sommaire du cours + progression localStorage | ✅ |

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

#### ✅ Dette de sécurité NEUVE, découverte pendant la planification d'E2-ST1 (2026-08-15) — CLOSE le 2026-08-19 (PR #27)

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

**✅ CLOS le 2026-08-19 (PR #27)**, avec S-003, par l'analyseur jsdom unique par page. Constaté au
passage : le garde-fou jumeau des gestionnaires en ligne (` on…="`) était **troué deux fois**, pas
une — il ratait à la fois les guillemets simples ET `onError=` (classe `[a-z]` insensible à la
casse manquante).

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

#### ⚠️ Réserves de clôture d'E2-ST2, toutes dues à un `content/` VIDE (2026-08-17 ; **4 depuis le 2026-08-18**)

Le lot B est vert, mais son gate `G-build (leçon-témoin prerendue)` **ne peut pas être franchi tel
qu'il est écrit** : le nœud tranché le 2026-08-16 place la leçon-témoin **hors de `content/`**, donc
le build de production prerende **0 route de leçon**. Les deux énoncés ne peuvent pas être vrais
ensemble ; c'est le gate qui est périmé, pas le lot. La preuve du routage a donc été faite en tests
unitaires, plus une construction jetable sur la fixture témoin (4 routes, `<head>` et sommaire
analysés à jsdom) — **une leçon n'a jamais été fabriquée dans `content/` pour verdir un gate**.

Ce qui en découle, à traiter **en clôture d'E3-ST1** (la première vraie leçon), pas avant :

1. ~~**`npm run a11y:axe` et `npm run e2e` n'ont jamais vu la page de leçon**~~ — **amendée le
   2026-08-18 (lot E-b2).** La barre AXE est désormais **franchie sur la FIXTURE TÉMOIN** : depuis la
   décision E-2, `ci.yml` bâtit son artéfact sur `tools/content-pipeline/__fixtures__/temoin/…`, donc
   G-axe voit une page de leçon **interactive** (mesure du 2026-08-18 : **4 fichiers · 344
   vérifications · 0 violation**). Ce qui **reste ouvert** : la confirmation sur le **contenu réel**
   à E3-ST1 — une fixture n'est pas une leçon, et c'est `deploy.yml` (racine de production) qui
   construit ce qui part en ligne. G-e2e sur la page de leçon relève du **lot E-c**.
2. **La CSP servie n'a jamais été mesurée sur une page de leçon** : `generer-config-swa.mjs` n'a
   jamais inspecté son `<head>`. C'est la règle « enabler ≠ enforcement » (S-005) — un `npm run
   build` vert ne prouve rien sur une page qui n'existe pas. *Mesuré et rassurant en attendant* :
   `script-src` est `'self' <hachages>` **sans** `strict-dynamic`, donc `'self'` reste actif et le
   premier chunk paresseux du dépôt (`lecon`, 17,49 kB) chargera. À vérifier **live** malgré tout.
3. **Une leçon en `statut: brouillon` sera prerendue en page publique et indexable.** Le manifeste ne
   filtre pas sur `statut` — nœud tranché par le propriétaire le 2026-08-16, **non rouvert ici** —
   et `X-Robots-Tag: noindex` n'existe que sur `/404/*`. Conséquence à connaître avant de committer
   un brouillon dans `content/`, pas un défaut du lot.
4. 🔴 **RETIRER LE HARNAIS DE FIXTURE de `ci.yml`** (décision E-2, lot E-b2 — ajouté le 2026-08-18).
   Il n'existe **que** parce que `content/` est vide : dès qu'une leçon y est publiée, il **masque le
   contenu réel** et fait auditer une fixture à sa place. Trois gestes, dans le même commit :
   (a) l'étape **G-build de `ci.yml` redevient `npm run build`** (les trois commandes dépliées
   disparaissent avec le `--racine`) ; (b) le drapeau **`--hachages-style 12` disparaît** — le compte
   retombe sur le défaut épinglé `NOMBRE_HACHAGES_STYLE_ATTENDU` ; (c) le `describe`
   « le harnais de leçon interactive » et la constante `HACHAGES_STYLE_CI_ATTENDU` de
   `src/workflows-github.spec.ts` sont supprimés. ✅ **Ce rappel a un tripwire exécutable** : le
   dernier cas de ce `describe` rougit tout seul dès que `content/cours/securite-web/` porte une
   `lecon.md` — la note ci-dessus n'est donc pas le seul filet (famille **L-007**).

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
| **A** | `core/progression/` — service de progression `localStorage`, en signaux, avec sa sérialisation versionnée et sa tolérance aux données absentes/corrompues | G-test seul (aucune UI) | ✅ |
| **B** | Émission du quiz par le pipeline : type `QuizCompile` dans `types.d.ts`, sortie du compilateur, fixture témoin, mutation prouvant que le gate mord | G-content, G-test | ✅ |
| **C** | `QuizComponent` (coquille, navigation, score, correction expliquée) + les deux types simples : `choix-multiple`, `vrai-faux` | G-test, G-axe, **G-clavier** | ✅ *(G-clavier et G-axe reportés au lot E : `content/` vide, aucune page de leçon prerendue)* |
| **D** | Les deux types difficiles : `associer` et `trouver-la-faille` | G-test, G-axe, **G-clavier** | ✅ *(G-clavier et G-axe reportés au lot E, même cause qu'au lot C)* |
| **E** | Vérification de bout en bout (agent jetable) : a11y, e2e sous CSP réelle, CSP revalidée | tous gates | ✅ |

#### ⏭️ ÉTAT DU LOT E au 2026-08-18 — pointeur de reprise

Le lot E s'est découpé **plus fin que prévu** (six agents, pas trois) : c'est la consigne du tableau
de découpe appliquée en chemin, chaque fois qu'un lot révélait un « + ».

| # | Lot | État |
|---|---|---|
| 1 | **E-a** — les quatre dettes du lot D | ✅ commité `cf4ffc1` |
| 2 | correctifs des deux revues (1 Majeur, 5 Mineurs) | ✅ dans `cf4ffc1` |
| 3 | parité des deux clefs d'indiscernabilité (**L-008**) | ✅ dans `cf4ffc1` |
| 4 | **E-b1** — `style-src` borné à la provenance Angular (décision E-3) | ✅ écrit, **revue sécurité en cours**, non commité |
| 5 | **E-b2** — harnais fixture câblé en CI (décision E-2) + CSP mesurée **quiz à l'écran** + G-axe | ✅ **chiffres ci-dessous** |
| 6 | **E-c** — e2e sous CSP réelle : L-033 prouvé par Playwright, piège du `<select>`, parcours clavier, **G-clavier** | ✅ |
| 6.1 | **E-c1** — le quiz se parcourt au clavier seul, L-033 cesse d'être raisonné | ✅ commité `f0c2e03` |
| 6.2 | **E-c2** — la CSP mesurée par un navigateur qui ACTIONNE le quiz | ✅ commité `e9f83a7` |
| 6.3 | **E-c3** — les six fichiers neufs du lot E entrent dans le programme e2e (tripwire de typage) | ✅ commité `3dd5594` |

##### ✅ Clôture du lot E-b2, 2026-08-18 — LA PAGE DE LEÇON INTERACTIVE EXISTE, ET ELLE EST MESURÉE

La barre qui était *contournée par l'absence de données* depuis E2-ST2 est franchie : `ci.yml` bâtit
son artéfact depuis la fixture témoin, donc G-axe, G-e2e et le générateur de CSP voient en
permanence une page de leçon **interactive** (`cours/securite-web/lecon-temoin/index.html`, 94 Ko :
**6 `<fieldset>`, 14 radios natives, 3 `<select>`, 1 bouton**). `deploy.yml` garde la racine de
production ; l'écart entre les deux artéfacts est assumé, et ce sont ses vérifications **en ligne**
qui font foi sur la CSP servie.

**Les chiffres, avant → après** (mesures locales du 2026-08-18, artéfact réel des deux côtés) :

| Mesure | Production (`content/` vide) | CI (fixture témoin) |
|---|---|---|
| Routes prerendues | 3 (+ `index.csr.html`) | **4** (+ `index.csr.html`) |
| Fichiers HTML inspectés par le générateur | 4 | **5** |
| Hachages `style-src` distincts | 9 | **12** |
| Hachages `script-src` distincts | 1 | **1 — inchangé** |
| G-axe : fichiers · vérifications · violations | 3 · 258 · 0 | **4 · 344 · 0** |
| G-test | 472 tests / 28 fichiers | **488 tests / 28 fichiers** |

**🔴 LE CONSTAT DE FOND, ET IL EST RASSURANT : `script-src` N'A PAS BOUGÉ.** L'inquiétude de S-005
— « le premier écouteur d'événement fait injecter par Angular des scripts inline que personne n'a
vus », rouge mesuré en E1-ST2 — **ne s'est pas reproduite ici**. La page de leçon porte bien un
script inline de plus qu'avant, `<script id="ng-state" type="application/json">` (5 215 o, l'état
d'hydratation du quiz), mais son `type` est **inerte** : le navigateur ne l'exécute pas et la CSP ne
le soumet pas à `script-src`. Le générateur le classe déjà comme tel (`TYPES_INERTES`). La liste
blanche reste donc **NOMINATIVE et à un seul élément** : `init-theme`, au hachage épinglé.
⚠️ Ce qui reste **non mesuré** et appartient au lot E-c : que le navigateur, sous la CSP réelle, ne
signale aucune violation en **actionnant** le quiz. Un artéfact conforme n'est pas une page qui
fonctionne.

**Les 3 hachages `style-src` neufs sont nommés, pas comptés** — inspection bloc par bloc de
l'artéfact : `[_nghost-ng-c2422324600]` (page `lecon`, 4 196 o), `[_nghost-ng-c675505835]` (rendeur
de blocs, `.prose`/`.code`, 4 229 o), `[_nghost-ng-c3398307194]` (`.quiz`, 5 669 o). Tous
`<style ng-app-id="ng">`, enfants directs de `<head>`, sans autre attribut — donc de provenance et
de place légitimes au sens du contrôle d'E-b1. C'est **exactement le rouge que l'amendement E-3 bis
avait annoncé** (« ~3-4 rouges d'ici la fin d'E2 ») : il est arrivé du premier coup, et il a été
inspecté avant que la valeur ne soit inscrite.

**🔵 Le conflit des deux comptes, et comment il est tranché.** Un artéfact avec page de leçon et un
sans ne peuvent pas partager une constante unique. Le compte attendu devient un **paramètre du point
d'appel** — `node tools/deploiement/generer-config-swa.mjs --hachages-style <n>` — avec les **deux
valeurs écrites dans le dépôt, donc revues** : `NOMBRE_HACHAGES_STYLE_ATTENDU = 9` (défaut, employé
par `deploy.yml` et par `npm run build` en local) et le `--hachages-style 12` de l'étape G-build de
`ci.yml`. Le contrôle reste **fail-closed** : égalité exacte dans les deux sens (jamais « au
moins »), drapeau absent ⇒ **la valeur épinglée**, jamais « pas de vérification », et **aucune
écriture ne tait le contrôle** — valeur manquante, non entière, négative, `0` (nommément refusé,
c'est la seule forme qui le viderait de son sens) et option inconnue sortent toutes en **code 1**.
13 cas neufs le gardent dans `src/config-swa-provenance-style.spec.ts`.

**Le harnais est prouvé CÂBLÉ, pas seulement livré** (L-007/L-019) : `src/workflows-github.spec.ts`
lit désormais les **commandes réellement exécutées** par les workflows (analyse YAML, pas `grep` —
un commentaire qui *explique* le drapeau n'est pas un `run:` qui le *pose*) et vérifie que la racine
de fixture nommée dans `ci.yml` **existe sur le disque**, que le drapeau y est un entier > 0, et que
`deploy.yml` ne bascule ni sur la fixture ni sur le drapeau. **Mutation à l'appui** : `securite-web`
→ `securite-webb` dans `ci.yml` ⇒ 1 test rouge nommant le chemin absent, et la commande elle-même
sort en code 1 (« racine de contenu introuvable »). Restauré.

**⏳ PÉREMPTION, à ne pas perdre : le harnais se retire à la clôture d'E3-ST1.** Le jour où
`content/` porte sa première leçon publiée, l'étape G-build de `ci.yml` redevient `npm run build`,
le `--hachages-style` disparaît avec elle, et le bloc `describe` du harnais dans
`src/workflows-github.spec.ts` aussi. Écrit à trois endroits (le workflow, le spec, ici) pour que
l'oubli soit visible. ⚠️ **`content/` reste compilé par sa propre étape** dans `ci.yml`, avant
G-lint : c'est elle le gate du contenu publié, et si les deux étapes basculaient sur la fixture, un
`lecon.md` malformé passerait la CI pour ne tomber qu'au déploiement.

**Deux constats laissés ouverts, avec leur raison.**
- **`ng build` avertit que `quiz.scss` dépasse son budget** (4,09 Ko pour 4,00 Ko, +88 o). Un
  avertissement, pas une erreur, et il **précède** ce lot (lot C). Le corriger ici, c'était toucher
  au style d'un composant dans un lot dont le livrable est la mesure — à traiter dans E2-ST4 ou
  dans le lot de dette, avec la question de fond : relever le budget ou alléger la feuille.
- **La CSP mesurée ici est celle de l'ARTÉFACT, pas celle qu'un navigateur applique.** C'est
  précisément la moitié que le lot E-c doit fermer (`npx swa start` + Playwright).

**Ce que le lot E a déjà changé, et qu'il ne faut pas re-découvrir.**
- **466 → 472 tests / 28 fichiers** (435 à l'ouverture du lot). 14 fixtures invalides, chacune
  refusée sur sa cause propre.
- 🔴 **L'égalité d'octets n'est pas l'indiscernabilité.** `gauche` et `choix[].id` se comparent
  désormais sur une clef normalisée (NFC, blanches repliées, rognée), **des deux côtés** —
  `valider.mjs` et `quiz.ts`. La collision était organisée par le projet lui-même :
  `.claude/rules/contenu-pedagogique.md` §3 **impose** U+00A0. Un spec de parité
  (`src/clef-indiscernable-parite.spec.ts`, corpus de 16 valeurs piégeuses en dur) garde les deux
  copies d'accord ; la mutation dans le sens dangereux — `normalize('NFC')` retiré **côté
  validateur**, qui devient alors plus permissif que le composant — rougit sur 1 test, et
  **aucun autre test du dépôt ne le voyait**.
- 🔴 **Le générateur de config SWA balayait `<style>` par MOTIF** (`/<style[^>]*>…/gi` : `[^>]*`
  coupe au premier `>` même cité ; ni `<STYLE>` ni `ng-app-id='ng'` n'étaient couverts). La branche
  `<style>` **analyse** maintenant (jsdom), avec un **contrôle de conservation** (occurrences brutes
  vs éléments rendus). ⚠️ **La branche `<script>` reste sur motif** — c'est la dette **S-003**, à
  payer dans son lot avant E3-ST1, et elle a maintenant **deux** patrons de correctif dans le dépôt
  (`rendre-mermaid.mjs` et cette branche-ci).
- **Rectification du backlog** : l'unicité des `choix[].id` n'avait jamais manqué à `valider.mjs` —
  seule sa **fixture** manquait (voir la rectification en clôture du lot D).

**⚠️ Pour qui reprend E-b2.** Les deux décisions qui le cadrent sont **prises** (E-2 : harnais câblé
en CI sur la fixture témoin ; E-3 : `style-src` borné) — ne pas les rouvrir. La commande qui produit
une page de leçon **interactive** prerendue est
`node tools/content-pipeline/build.mjs --racine tools/content-pipeline/__fixtures__/temoin/cours/securite-web`
(la fixture porte 5 questions et **les 4 types**). Note d'E-b1 : les `<style>` de Mermaid sont déjà
retirés par `rendre-mermaid.mjs`, donc une leçon à diagrammes ne butera pas sur la règle de
provenance neuve.

**⚠️ Budget de contexte — constat à porter au bilan d'epic.** Malgré la découpe, les agents ont fini
à **180k, 187k, 130k et 138k**. La cause n'est pas le brief : c'est le nombre d'allers-retours
qu'imposent `npm test` sur une suite de 470 tests **et** les preuves de mutation. E-b2 et E-c ajoutent
`ng build`, axe et Playwright — les découper encore plus fin, ou sortir les gates lourds dans un agent
jetable distinct (`.claude/rules/agent-context-budget.md` §4).

##### ✅ Clôture du lot E et d'E2-ST3 — 2026-08-18

**Ce que le lot E-c a fermé.** La CSP n'est plus seulement conforme dans l'artéfact : elle est
**mesurée par un navigateur qui ACTIONNE le quiz** — 4 radios cochées, 3 `<select>` remplis,
correction demandée, 5 verdicts obtenus, **0 violation**, journal de console vide, aucun
`pageerror`. La CSP est exigée sur la réponse de la page de leçon elle-même (923 caractères,
`'self'` + `sha256-`), jamais sur `/`. Le constat d'E-b2 est **confirmé côté navigateur** :
`script-src` n'a pas bougé, la liste blanche reste nominative à un seul élément. Contrôle positif
propre à cette page, injecté **après hydratation**, capté par les deux détecteurs, avec le témoin
d'exécution resté `false` (donc CSP appliquée, pas `report-only`).

**L-033 cesse d'être raisonné.** La fenêtre de pré-hydratation n'est plus estimée mais
**élargie** : le chunk paresseux de la leçon est retenu (règle : tout `.js` que le document servi
n'annonce pas), on agit dedans, on relâche. Deux contrôles positifs attestent qu'elle était
ouverte — un clic sur « Corriger » émis pendant la fenêtre est **perdu**, et les attributs `ngh`
sont encore là. Le piège jumeau du `<select>` a son propre test.

**G-clavier existe.** Huit arrêts parcourus dans l'ordre du document, flèches dans les trois
mécaniques à radios, `<select>` rempli à la flèche seule avec preuve que le `(change)` a couru,
Entrée puis focus au résumé, Maj+Tab en miroir, indicateur de focus calculé et non masqué sur
chaque arrêt (2.4.7 / 2.4.11).

**🔴 LE TRIPWIRE DE TYPAGE A MORDU, ET C'EST LE FAIT LE PLUS INSTRUCTIF DU LOT.**
`src/configuration-typescript.spec.ts` épingle nommément le périmètre de `tsconfig.e2e.json`. Les
lots E-c1 et E-c2 y ont fait entrer **six fichiers d'un coup** ; G-test a rougi sur « expected 12 to
have a length of 6 » **avant qu'aucun humain n'ait remarqué leur entrée**. Le mode d'échec que son
commentaire annonçait (L-014) était réel. ⚠️ Et le point qui compte pour la suite : les trois
`e2e/aides/*.ts` **ne sont pas des specs** et sont épinglés quand même — depuis les mutualisations
du lot E (**L-016**), ce sont eux qui portent la MESURE (ce qu'est un anneau de focus dessiné, les
trois collecteurs de violations CSP, le point de départ commun de la page de leçon). Mutualiser a
**déplacé** le risque : un défaut de typage y serait invisible depuis les specs appelants et
ferait passer verts les gates les plus structurants du dépôt.

**Trois corrections de prémisse, toutes dans les specs, aucune dans le produit** (E-c1) : le
compte de radios du quiz est **11 et non 14** — les 3 manquantes sont la bascule de thème de la
coquille, hors du `.quiz`, et le 14 inscrit en clôture d'E-b2 comptait toute la page · le
`<select>` doit se mettre sur une réponse **délibérément fausse**, parce qu'une association juste
se corrige par « Association correcte » qui ne cite rien, or c'est la citation qui prouve que le
`(change)` a couru · l'U+00A0 d'une chaîne attendue s'écrit `\u00A0` (`no-irregular-whitespace`
est actif sur `e2e/`).

**Les chiffres de clôture, mesurés le 2026-08-18** :

| Gate | Mesure | Verdict |
|---|---|---|
| G-lint | — | ✅ |
| G-typage-outils / G-typage-e2e | — | ✅ |
| G-test | **498 tests / 28 fichiers** | ✅ |
| G-content (fixture) | 1 leçon · 2 SVG contrôlés · 48/48 identifiants uniques | ✅ |
| G-build (fixture témoin) | 4 routes prerendues · 5 pages inspectées · **12 hachages de style, 1 de script** | ✅ (1 avertissement, ci-dessous) |
| G-build (production) | 4 pages inspectées · **9 hachages de style, 1 de script** | ✅ |
| G-axe | auto-test vert · 4 fichiers · 1 écarté · **344 vérifications, 0 violation** | ✅ |
| G-e2e | **21 tests** (11 à l'ouverture du lot E) | ✅ |
| G-audit (`--omit=dev`) | **0** | ✅ |
| G-contraste | 33 paires en sombre, plus bas 3,39:1 | ✅ |
| G-glyphes | 196,4 Kio livrés | ✅ |

**🔵 RECTIFICATION d'un chiffre inscrit en clôture d'E-b2.** Ce tableau-là annonçait **472 tests
côté production contre 488 côté fixture**, soit un écart de 16. Mesuré à nouveau le 2026-08-18,
sur les deux racines de contenu, avec `npx ng test` (donc sans le crochet `pretest` qui écrase la
compilation) : **498 des deux côtés, à l'unité près**. Le compte de tests **ne dépend pas de la
racine de contenu** — aucun `describe` n'est généré par leçon. L'écart inscrit à E-b2 est donc
erroné ou périmé ; il ne faut pas le reproduire dans un tableau futur.

**Ce qui reste ouvert, et qui n'appartient pas à E2-ST3** — reports, pas des oublis :
- **`quiz.scss` dépasse son budget de 88 o** (4,09 Ko pour 4,00 Ko). Avertissement, pas erreur, et
  **antérieur au lot E** (lot C). Question de fond à trancher dans E2-ST4 ou le lot de dette :
  relever le budget ou alléger la feuille.
- **Le harnais de fixture se retire à la clôture d'E3-ST1** — inchangé, écrit à trois endroits
  (`ci.yml`, `src/workflows-github.spec.ts`, backlog).
- **Les quatre dettes de sécurité, listées avant E3-ST1** — **toutes ✅ CLOSES le 2026-08-19**
  (lot de dette pré-E3-ST1, PR #27, #28, #30) : S-003, le motif ` style="` du garde-fou (PR #27),
  la CSP servie vérifiée par motifs et non structurellement (PR #28), la portée du sceau
  d'artéfact (PR #30).
- **Les 3 réserves de clôture d'E2-ST2** : les réserves (1) et (2) sont **levées** par le harnais
  de fixture et le lot E — G-axe et G-e2e ont vu une page de leçon interactive, et la CSP y a été
  mesurée servie **et** appliquée. La réserve (3) — une leçon en `statut: brouillon` serait
  prerendue publique et indexable — **✅ FERMÉE à la clôture d'E2-ST6 (2026-08-19)**, mais **pas
  par le chemin prévu** : filtrer le seul prerender ne suffisait pas, la leçon restait publique par
  le chunk d'artéfact et par le rendu client. Correctif : filtrage à la **génération** du manifeste
  (`generer-manifeste.mjs`), drapeau `--inclure-brouillons` défaut fermé, refus dans
  `resoudreLecon` avant tout `await chargeur()`, garde-fou exécutable
  `src/garde-fou-lecons-non-publiees.spec.ts`. Preuve live : `grep -rl "lecon-brouillon" dist/` vide
  · navigation Chromium sur `/cours/securite-web/lecon-brouillon/` → `{"statutHttp":404,"appLecon":0}`
  · contrôle positif `/cours/securite-web/lecon-temoin/` → 200. Détail : §E2-ST6 ci-dessous, leçon
  **S-019**.

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

#### ✅ Clôture du lot B — 2026-08-17

Le quiz **sort du pipeline** : `QuizCompile` dans `types.d.ts`, lu / revalidé / coloré par
`compilerQuiz`, émis dans `LeconCompilee.quiz` et rendu à l'ancre `[[quiz]]`. Deux revues
indépendantes (sécurité, code) l'ont approuvé **avec réserves** — quatre constats Majeurs, tous
mesurés. Les quatre sont **fermés**, et voici la forme retenue pour chacun, parce qu'elle engage
le lot C :

1. **🔴 « Shiki échappe le texte source » était une phrase, pas une garantie tenue.** C'est cette
   propriété — et elle seule — qui autorisera le lot C à rendre `htmlColore` dans la page ; or le
   code de la fixture ne contenait pas un seul `<`, le seul caractère qui compte. **La mesure a
   corrigé l'énoncé** : Shiki échappe `<` en `&#x3C;` et **laisse `>` brut**. Échappement partiel,
   mais suffisant — sans `<`, aucune balise ne peut **s'ouvrir**, donc `>` et même un `onerror=`
   restent du texte inerte. La fixture porte désormais `<script>alert('XSS')</script>` et
   `<img src=x onerror=alert(1)>`, et le test **analyse** au lieu de chercher des motifs interdits :
   il retire les seules balises que Shiki émet (liste nominative) et exige qu'il ne reste **aucun
   `<`**. Contrôle positif sur le compte de balises retirées et sur la présence de la charge.
2. **`ficheSource` n'est plus émis.** C'est de la traçabilité de **build** : `valider.mjs` l'exige
   sur la source, mais le navigateur n'a aucun usage d'un chemin vers une KnowledgeBase privée qu'il
   ne peut pas ouvrir. La voie publiée vers les sources reste la section « Aller plus loin ». Le
   champ vit donc dans `QuestionSource` (compilateur) et **pas** dans `QuestionQuiz` (contrat) — le
   décalage entre les deux types **est** la frontière, et c'est lui qui rendrait l'oubli visible au typage.
3. **Le préfixe d'`id` de rendu est fixé ET vérifié** : `PREFIXE_ID_QUESTION = 'quiz-'`
   (`contenu-compile.ts`). Les `id` de question et les ancres de section partagent l'espace de noms
   du **document** ; l'auteur choisit ses ancres sans rien savoir du quiz. `lireLeconCompilee` refuse
   donc nommément une leçon où `quiz-<id>` heurte une ancre existante. L'écrire sans le contrôler
   aurait été exactement **L-008** ; exiger de l'auteur qu'il connaisse les ancres réservées aurait
   été une contrainte invisible. ⚠️ **Le lot C rend ses `<fieldset>` sous cette constante**, pas
   sous une chaîne recopiée.
4. **L'ancre `[[quiz]]` manquante fait échouer la compilation**, comptée dans `compilerLecon` où
   l'AST existe (donc où le compte est **exact**), et non par relecture de la source dans le
   validateur — un motif sur un format structuré est le patron déjà payé trois fois (S-001, S-003,
   S-009). Le mode d'échec fermé est le plus coûteux du lot : une leçon qui compile, se prerend, se
   publie, et dont le quiz n'est **nulle part** sur la page.

**Gates au vert** : lint · **381 tests / 25 fichiers** · `content:build` · `ng build` + config SWA
· axe **258 vérifications, 0 violation** · **e2e 11/11** · `typecheck:tools`.

**⏭️ Dette transmise au lot C, à ne pas perdre.** Le `code` brut d'une question part **non
échappé** dans l'artéfact (c'est voulu : il porte la numérotation de `ligneFautive` et le texte
accessible). S'il contient un jour ` style="` — charge utile parfaitement plausible pour une leçon
sur la CSP — et que le composant le rend par interpolation, `generer-config-swa.mjs` **rougira sur
un message parlant de CSP alors que la cause sera un texte de quiz**. Fail-closed, donc sain, mais
le diagnostic serait trompeur : prévoir le message, pas le contournement.

**⚠️ Et le piège de CSP qui vise ce lot précisément** : E2-ST3 est le **premier composant réellement
interactif d'une page de leçon**. « Une CSP validée sur une page INERTE ne vaut que pour une page
inerte » (S-005) — Angular injecte des scripts inline avec le premier écouteur d'événement, ce qui a
déjà rendu un build rouge en E1-ST2. À revalider au lot E, liste blanche **nominative**.

#### ✅ Clôture du lot C — 2026-08-17

Le `QuizComponent` existe : coquille, `<fieldset>`/`<legend>` par question sous
`PREFIXE_ID_QUESTION`, radios **natives** (aucun rôle ARIA de remplacement), score sur les seules
questions corrigeables, correction expliquée distracteur par distracteur, et écriture de la maîtrise
dans `core/progression/` — jamais par import d'une autre feature. Les formes `associer` et
`trouver-la-faille` sont rendues **lisibles mais provisoires** (hors score, hors persistance), en
attendant le lot D. **Gates au vert : lint · 417 tests / 26 fichiers · `ng build` + config SWA
(9 hachages de style, 1 de script, inchangés) · `typecheck:tools` 0 erreur.**

**Un défaut du lot B corrigé au passage, prouvé par mutation.** Le contrôle « exactement une ancre
`[[quiz]]` » de `compilerLecon` ne balayait que le **premier niveau** des blocs : une seconde ancre
écrite dans un `::: note` était invisible, et le quiz se serait rendu **deux fois**, tous ses `id`
de question dupliqués — c'est-à-dire très exactement ce que le contrôle existait pour empêcher.
Le compte est désormais récursif (`encadre` est le seul bloc qui en imbrique d'autres). Récursion
neutralisée → **un seul** test rouge ; restaurée → 417/417.

**Trois décisions prises hors brief, gardées après revue** : radios **gelées** (`disabled`) à la
correction plutôt que retirées · **pas de `<form>`** (la touche Entrée rechargerait la page sans JS)
· titre en `<h3>` (l'ancre vit sous une section `##` — `heading-order` d'axe).

**Les quatre constats des deux revues, fermés dans un lot de correctifs à part** (l'implémenteur
avait fini à 264k, il n'a pas été repris — `.claude/rules/agent-context-budget.md` §3) :

1. **🔴 La note « mode d'échec » de `quiz.ts` ne nommait qu'un motif sur deux.**
   `generer-config-swa.mjs` refuse ` style="` (ligne 379) **et** ` on[a-z]+="` (ligne 333), et
   l'interpolation d'Angular n'échappe que `&`, `<` et `>` : un `onerror="…"` dans une question de la
   leçon **XSS** — la charge la plus banale du sujet le plus central du cours — arrive intact dans le
   HTML servi et fait échouer le build sur un message accusant la CSP. Le risque n'est pas la panne
   (fail-closed, saine) : c'est la **pression à assouplir le garde-fou pour publier**, sur un site qui
   enseigne la CSP. Note réécrite, et la parade est éditoriale (guillemets typographiques, entité).
   Leçon **S-011**.
2. **Rien ne prouvait par le comportement qu'une charge utile s'affiche sans s'exécuter.** Les
   assertions existantes (`innerHTML`/`bypassSecurityTrust*` absents de la source) resteraient vertes
   si le gabarit passait un jour à une liaison de HTML brut écrite autrement. Test neuf, à deux mains :
   la charge est **entière à l'écran** et **aucun nœud n'en naît** (ni `img`, ni `script`, aucun
   attribut `on…`/`style` sur un élément réel) ; et le HTML sérialisé **contient encore** la séquence
   que le gate cherche — si cette seconde assertion tombe, c'est la note du point 1 qui doit partir,
   pas le gate.
3. **L'invariant « exactement une ancre » n'existait qu'au compilateur.** `lireLeconCompilee` se
   déclare frontière de confiance contre un artéfact d'une **autre version** du pipeline et tenait
   déjà quatre invariants d'`id` ; celui-là en est un cinquième (zéro ancre = quiz nulle part, deux
   ancres = tous les `id` dupliqués). Ajouté, récursif comme au compilateur, avec ses **deux** cas de
   mutation — dont celui de l'ancre cachée dans un encadré, seul capable de prouver la récursion.
4. **🔴 La fenêtre de pré-hydratation effaçait la première coche du visiteur.** La page de leçon est
   un **chunk paresseux** et `withNoIncrementalHydration()` est actif : le rejeu d'événements est
   perdu. Entre la peinture prerendue et le branchement du `(change)`, la radio se coche
   **réellement** — le navigateur le fait, le composant ne voit rien — puis la première détection de
   changements réévalue `[checked]` à `false` et **réécrit** la coche. Aucun test rouge, aucune
   erreur console : la coche apparaît et disparaît. Le composant amorce désormais son état **depuis
   le DOM** au premier rendu client (`afterNextRender` → `amorcerDepuisLeDom()`), avec ses trois
   cas (la saisie compte dans le score · rien n'est inventé sur un DOM vierge, et une réponse déjà
   saisie n'est pas perdue · sans effet une fois corrigé) et un garde-fou de **câblage** contre
   L-008. Mutation : `amorcees > 0` → `> 99` ⇒ un seul test rouge. Leçon **L-033** — et le piège
   était **annoncé** dans `CLAUDE.md` depuis E1-ST2, ce qui n'a pas suffi à l'éviter.

**⏭️ Ce que le lot C laisse ouvert, et qui appartient au lot E.**

- **🔴 La CSP n'a JAMAIS été mesurée avec le quiz à l'écran.** `content/` est vide : aucune page de
  leçon n'est prerendue, les 3 routes inspectées par `config:swa` sont **inertes**, et le vert du
  build ne prouve donc rien sur le premier composant réellement interactif du site. La réserve (2)
  d'E2-ST2 ne s'est pas seulement maintenue, elle **s'est aggravée** : il ne s'agit plus de mesurer
  la CSP servie sur une page de leçon, mais sur une page de leçon **interactive**. S-005 intact.
- **`style-src` est dérivé de l'artéfact, contrairement à `script-src`** (relevé par la revue de
  sécurité). `quiz.scss` y ajoutera donc un hachage **en silence** dès la première leçon prerendue —
  à confronter à S-002 au lot E, avant que l'habitude ne s'installe.
- **G-axe et G-clavier n'ont pas vu le composant**, pour la même raison : ils sont *contournés par
  l'absence de données*, pas franchis. Ce sont eux, avec l'e2e sous CSP réelle, qui font le lot E.

#### 🔵 Les deux décisions du lot D, tranchées le 2026-08-18 (avant d'écrire une ligne)

Le tableau de découpe exigeait qu'elles soient **prises**, pas improvisées en chemin. Les voici, avec
ce qui les a tranchées.

**D-1 · `associer` se rend par un `<select>` natif par ligne de gauche.** Chaque `gauche` porte un
`<label>` et un `<select>` dont les `<option>` sont toutes les valeurs `droite` du lot, dans un ordre
fixe (celui de la source, comme les questions — voir la note `melanger` de `quiz.ts`). Zéro ARIA,
zéro glisser-déposer.
*Ce qui l'a tranché.* La KB n'a **aucune fiche** sur un widget d'appariement (`npm run kb -- associer
appariement clavier` ne remonte que `composant-tabs.md`, qui parle d'autre chose) — le trou est
consigné ici plutôt que comblé par une invention. Restait donc la doctrine, et elle est déjà écrite
deux fois dans ce dépôt : « no ARIA is better than bad ARIA »
(`web/html/html-semantique-accessibilite.md`), et le lot C entier tient parce qu'il n'emploie **que
du natif** (radios, `<fieldset>`, `<legend>`, aucun rôle de remplacement). Un `<select>` est le seul
contrôle du HTML qui exprime « choisir une valeur parmi N » avec une navigation clavier, un nom
accessible et une annonce de position que **le navigateur** fournit, sans une ligne d'ARIA. WCAG 2.2
**2.5.7 (Dragging Movements)** interdisait déjà l'autre voie ; ceci ferme la question dans l'autre
sens, en n'ayant rien à réimplémenter.
⚠️ **Le distracteur n'est pas la difficulté** : plusieurs `<select>` peuvent porter la même valeur.
C'est **volontaire** — forcer l'unicité côté client transformerait l'exercice en sudoku et masquerait
la vraie erreur de compréhension. La correction dit ligne par ligne ce qui est juste.

**D-2 · `trouver-la-faille` garde SON rendu de code dans `cours/quiz/`, et E2-ST4 fera l'extraction.**
La ligne fautive se désigne par une **radio par ligne**, dont le `<label>` est la ligne de code
numérotée — donc exactement la machinerie du lot C, sans rien de neuf à rendre accessible.
*Ce qui l'a tranché, et c'est le point à ne pas travestir.* Ce n'est **pas** « on verra plus tard » :
les deux besoins ne sont pas le même. Le quiz a besoin d'une ligne **sélectionnable** (radio +
label + `name` de groupe) ; le `CodeCompareComponent` d'E2-ST4 a besoin de lignes **annotées, en
vis-à-vis, sur deux colonnes, avec onglets de langage**. Extraire un composant commun à partir d'un
seul exemplaire, avant que le second consommateur n'ait exprimé ses vraies contraintes, est une
abstraction prématurée qu'E2-ST4 paierait en la défaisant. **La duplication est donc assumée et
DATÉE** : E2-ST4 fusionne, avec les deux cas réels en main. Ce qui était interdit par le tableau de
découpe, c'est de dupliquer **en silence** — ceci est le contraire du silence.
⚠️ **À reprendre en E2-ST4, nominativement** : `.code-numerote` (`quiz.scss` + gabarit de `quiz.ts`)
est le morceau à fusionner ; s'il a divergé d'ici là, c'est la fusion qui arbitre, pas l'ancienneté.

#### ✅ Clôture du lot D — 2026-08-18

`associer` et `trouver-la-faille` sont **corrigeables**. Les deux décisions ci-dessus ont été
exécutées telles quelles : `<select>` natif par ligne (zéro ARIA, zéro glisser-déposer), radio par
ligne de code, rendu de code gardé dans `cours/quiz/`. **Gates : lint · 435 tests / 26 fichiers ·
`ng build` + config SWA (9 hachages de style, 1 de script, inchangés depuis le lot C) ·
`typecheck:tools` 0.** Mutation du lot : `champ.value === VALEUR_SANS_CHOIX` retiré de
`amorcerDepuisLeDom()` ⇒ exactement 1 test rouge.

**La garantie de maîtrise a changé de gardien, et il faut savoir lequel.** Le lot C interdisait
d'écrire une maîtrise tant qu'une question était `provisoire` (`provisoires().length === 0`). La
forme `provisoire` est supprimée ; la garantie tient désormais par l'**exhaustivité** de
`preparer()`, qui lève sur tout type inconnu — donc une question que le composant ne sait pas
corriger ne peut plus être *rendue*, et la construction casse avant la publication. ⚠️ Mais la
**première** ligne de défense reste `TYPES_DE_QUESTION` de `contenu-compile.ts` : le `default` de
`preparer()` est **inatteignable en production** et ne couvre que l'artéfact d'une autre version du
pipeline. Le commentaire le disait mal ; il est corrigé.

**Six constats de revue fermés dans le même diff** (code + sécurité, deux agents indépendants) :

1. **🔴 Le nom accessible d'une ligne de code portait le numéro NU.** « 2 » de quoi ? Une ligne vide
   avait pour nom accessible entier « 2 », et la correction annonçait « Ligne 2 » qui ne
   correspondait à **aucun** libellé d'option. Le mot est maintenant **écrit** dans le document
   (`Ligne&nbsp;N`), avec la largeur de gouttière qui va avec. **axe ne voit rien de tout cela**
   (constat D-C6) — c'est le test qui le tient.
2. **🔴 La note de collision S-011 vivait dans UNE branche du `@switch`**, alors que le lot D ouvre
   quatre sites de texte d'auteur de plus — dont `correction`, qui est du *code corrigé*, et le texte
   des `<option>` d'un `associer`. Elle est **remontée à l'en-tête du fichier**, avec la liste
   nominative des sites. Invariant : *une note de garde-fou de sortie s'attache au fichier, pas à la
   branche où on y a pensé.*
3. **Mesure neuve, et elle rétrécit S-011 dans le bon sens.** La revue de sécurité a instrumenté
   **domino** (le sérialiseur du prerender) *et* jsdom : en **contexte d'attribut**, un `"` est
   sérialisé `&quot;`, donc les motifs du gate — qui exigent un guillemet **littéral** — ne peuvent
   pas s'y former. Les surfaces d'attribut du lot D (`[value]`, `[attr.data-champ]`) **n'élargissent
   pas** la collision ; seuls les **nœuds texte** collisionnent. Écrit dans l'en-tête du composant.
4. **`question.id` est revalidé au kebab-case dans `preparer()`.** C'est le seul champ qui alimente un
   **langage de requête** (un `id` de document, puis un fragment de sélecteur CSS — deux sites depuis
   le lot D). `lireLeconCompilee` le contraignait déjà et reste le chemin de production ; mais le
   composant revalide nominativement tout le reste à sa frontière, et déléguer précisément celui-là
   était la mauvaise exception. Un guillemet y donnerait soit un `SyntaxError` au prerender, soit —
   pire — un sélecteur qui relit la radio d'une **autre** question, en silence.
5. **L-033 : le mécanisme livré était présumé insuffisant PAR SON PROPRE ÉNONCÉ.** Une liaison de
   propriété part d'un état non initialisé : la toute première passe de mise à jour écrit
   `checked = false` / `value = ''` **inconditionnellement**, et `afterNextRender` s'exécute **après**
   elle. L'amorçage se fait donc maintenant dans **`ngOnInit`** (gardé par `isPlatformBrowser`) —
   après que les entrées sont posées, **avant** la mise à jour du gabarit ; en rendu client pur
   l'hôte est vide, donc c'est un no-op. L'`afterNextRender` reste en **second filet** (l'amorçage est
   idempotent). La leçon **L-033 elle-même a été corrigée** : elle prescrivait `afterNextRender` tout
   en exigeant « avant la première détection », ce que ce mécanisme ne peut pas tenir.
6. **Le commentaire de `corriger()` laissait croire que le fichier se gardait tout seul** — corrigé
   (voir ci-dessus).

**⏭️ CE QUI RESTE OUVERT — nommé ici plutôt qu'entamé à moitié.**

- **🔴 (bloquant pour le lot E) L'unicité de `gauche` n'est imposée QUE par le composant.** Ni
  `quiz.schema.json`, ni `valider.mjs`, ni `docs/contenu/pipeline-contenu.md` ne la connaissent. Une
  leçon légale au schéma passe donc **G-content vert**, puis casse au prerender d'`ng build`, sur un
  message qui nomme la question et le champ mais **pas le fichier**, au milieu d'une pile Angular.
  Même famille, héritée du lot C : l'unicité des `choix[].id`. **Correctif attendu** : remonter les
  **deux** règles dans `valider.mjs`, à côté de `bonneReponse ∈ choix` et `ligneFautive ≤ nbLignes` —
  c'est là que le message nomme le fichier ; documenter la contrainte dans la `description` de
  `paires` du schéma et dans `pipeline-contenu.md` ; **garder** le contrôle du composant, qui cesse
  seulement d'être le premier à parler.
  ⚠️ **Rectification du 2026-08-18, relevée au lot E-a et vérifiée sur la source** : la seconde
  moitié de ce constat était **fausse**. L'unicité des `choix[].id` était **déjà** dans
  `valider.mjs` (`7e2675b`, passe SonarCloud) — ce qui manquait était sa **fixture**. C'est du
  **L-019 pur** : une règle exacte que rien n'exerçait, donc invisible à toute régression, et un
  document qui la déclarait absente parce que rien ne la faisait parler. La source prime sur la
  doc ; le lot E-a a ajouté la fixture et enrichi le message (il nomme désormais la valeur en
  double).
- **La clause de D-1 « `droite` en double reste permise » n'a aucun contrôle positif.** Aucune fixture
  n'a deux paires partageant un `droite`, donc la déduplication d'`optionsDroite` n'est **jamais
  exécutée**. Le test qui semble la couvrir pose deux `<select>` sur la même valeur d'un lot dont tous
  les `droite` sont distincts : il prouve l'interface, pas la décision. **Correctif attendu** :
  fixture à `droite` dupliqué, trois assertions (l'option n'apparaît qu'une fois · les deux lignes
  peuvent être justes **simultanément** · la correction ligne à ligne le dit pour les deux). Aucun
  bug trouvé derrière ce trou — c'est une lacune de **preuve**.
- **Le test à deux mains de S-011 ne couvre qu'un type sur quatre.** Il n'exerce que
  `trouver-la-faille` ; ni le chemin `associer` (`gauche`/`droite`) ni le champ `correction` ne
  portent de charge. **Correctif attendu** : poser une charge dans les deux, puis rejouer les deux
  mains (aucun nœud né · le HTML sérialisé contient encore la séquence).
- **En-tête et libellés de `quiz.spec.ts` périmés d'un lot** (il se déclare « lot C », promet un test
  de persistance qui n'existe plus, et `expect(querySelector('.mention-provisoire')).toBeNull()` est
  devenu **vacuux** : la classe n'existe plus nulle part, l'assertion ne peut plus tomber — le motif
  L-019 que ce fichier prêche par ailleurs).
- **`quiz.scss` dépasse de 88 octets** le budget d'**avertissement** `anyComponentStyle` (4,00 ko ;
  total 4,09 ko), après une déduplication réelle (−26 %). `angular.json` **n'a pas été touché** pour
  faire taire l'avertissement : la résolution est **E2-ST4**, qui extrait `.code-numerote`.
- **L-023 a mordu une fois de plus** (backtique dans un commentaire HTML d'un `template:` inline) et
  **rien dans le dépôt ne le garde** — candidat sérieux à un vrai gate.

#### 🔵 Les trois décisions du lot E, tranchées le 2026-08-18 (avant d'écrire une ligne)

Même exigence qu'au lot D : le lot E touche la **forme de la CI** et la **posture CSP**, deux choses
qu'on n'improvise pas en chemin. Les voici, avec ce qui les a tranchées.

**E-1 · Le lot E se découpe en TROIS agents frais, et les dettes du lot D passent en premier.**
`E-a` — les dettes du lot D, **sans navigateur** : unicité de `gauche` et des `choix[].id` remontée
dans `valider.mjs`, contrôle positif du `droite` dupliqué, test à deux mains de S-011 étendu aux
quatre types, nettoyage de `quiz.spec.ts`. `E-b` — le **harnais de leçon interactive**, la CSP servie
enfin mesurée avec le quiz à l'écran, la confrontation `style-src`/S-002, G-axe. `E-c` — l'**e2e sous
CSP réelle** : L-033 prouvé par Playwright (cocher pendant la fenêtre de pré-hydratation), le piège
jumeau du `<select>` qui avale une valeur avant que ses `<option>` n'existent, le parcours clavier
complet, et la checklist **G-clavier**.
*Ce qui l'a tranché.* Les lots C et D ont fini leur agent à **264k et 262k**, au-delà du plafond
absolu de `.claude/rules/agent-context-budget.md`. Ce n'est plus un accident de brief : c'est le
calibre des lots. `E-a` est déjà un livrable vérifiable seul (G-content + G-test) et ne partage
**aucun** contexte avec la mesure navigateur ; `E-c` consomme le harnais que `E-b` pose, donc l'ordre
est contraint, pas arbitraire.

**E-2 · Le harnais de leçon interactive est CÂBLÉ en CI, sur la fixture témoin.**
`ci.yml` compile désormais le contenu depuis
`tools/content-pipeline/__fixtures__/temoin/cours/securite-web` : G-axe, G-e2e et la génération de
config SWA voient **en permanence** une page de leçon interactive. `deploy.yml` garde la racine de
production (`content/cours/securite-web`) — c'est lui qui publie, et ses vérifications **en ligne**
restent le juge de la CSP réellement servie.
*Ce qui l'a tranché.* Une mesure jetable aurait laissé le composant redevenir invisible aux gates dès
le lendemain — exactement le motif **L-019 / L-005** que ce dépôt paie déjà. Et l'angle mort n'est pas
propre à E2-ST3 : **E2-ST4, ST5 et ST6** ajoutent chacune un composant interactif à la page de leçon
et se heurteraient au même `content/` vide. Le second `ng build` d'une étape séparée coûtait ~3 min de
CI pour la seule fidélité d'un artéfact que `deploy.yml` reconstruit de toute façon.
⚠️ **Écart assumé et nommé** : la CSP mesurée en CI n'est pas octet pour octet celle du déploiement.
La parade existe déjà et ne bouge pas — les contrôles fail-closed **en ligne** de `deploy.yml`,
qui portent sur les directives servies.

**E-3 · `style-src` cesse de tout hacher : la dérivation est BORNÉE À LA PROVENANCE Angular.**
*(⚠️ **AMENDÉE le 2026-08-18** — la borne de provenance est nécessaire mais **ne suffit pas** ; lire
l'amendement **E-3 bis** juste en dessous avant de s'appuyer sur ce qui suit.)*
Seuls les blocs `<style ng-app-id="ng">` **sans autre attribut** sont hachés ; tout autre `<style>`
de la sortie prerendue devient une **infraction nommée**, au même titre qu'un gestionnaire
d'événement en ligne.

> 🔴 **AMENDEMENT E-3 bis, 2026-08-18 — la décision ci-dessus, telle qu'écrite, promettait plus que
> le code ne pouvait appliquer.** Elle annonçait qu'un bloc injecté par **autre chose qu'Angular**
> — « un composant » — ne pourrait plus s'auto-autoriser. **Faux, et mesuré** : les blocs `<style>`
> de l'artéfact **SONT** les styles des composants (`[_nghost-ng-c…]`), tous émis par Angular avec
> `ng-app-id="ng"`. La revue sécurité a ajouté à l'artéfact réel un
> `<style ng-app-id="ng">.quiz[…]{color:red}</style>` → **code 0, 9 → 10 hachages, aucun signal**.
> Borner à `ng-app-id="ng"`, c'est borner à un **marqueur**, pas à une **provenance** : le producteur
> légitime porte lui-même le marqueur. Le risque nommé en tête de `CLAUDE.md` — « `quiz.scss` y
> ajoutera un hachage **en silence** dès la première leçon prerendue » — restait donc **intact**.
> **Ce que le propriétaire a tranché** : épingler le **NOMBRE** de hachages de style attendus,
> `NOMBRE_HACHAGES_STYLE_ATTENDU` (9 au 2026-08-18), miroir exact de `hachagesScript.size !== 1` ;
> message d'échec imposant `security-reviewer` **PUIS** mise à jour de la constante, jamais l'inverse
> (S-002). Deux contrôles s'y ajoutent : le bloc doit être **enfant direct de `<head>`/`<body>`**
> (`<noscript><style ng-app-id="ng">` était haché alors que le navigateur n'y voit **aucun élément**
> — divergence d'analyseurs, famille S-001), et le comptage brut du contrôle de conservation est
> ancré sur `/<style[\s>/]/gi` (sans quoi `<style-guide>` rendait la construction rouge sur un
> message accusant la CSP pour une cause **éditoriale** — la pression S-011).
> **Pourquoi le nombre et pas les valeurs** : éditer un `.scss` ne change **pas** le compte, donc
> l'objection qui avait écarté l'épinglage des hachages eux-mêmes (« rouge permanent ») ne s'applique
> pas. Un composant neuf porteur de styles rougit **une fois**, et cette fois-là est la revue qu'on
> veut — **~3-4 rouges attendus d'ici la fin d'E2** (ST4, ST5, ST6). C'est la propriété que E-3
> revendiquait sans la livrer.
> **Ce qui reste ouvert, et se dit** : le **contenu** de chaque bloc reste **dérivé**, jamais comparé
> à une valeur revue. `style-src` n'est **pas** une liste blanche nominative comme `script-src` — le
> nombre est épinglé, les valeurs ne le sont pas. Détail : `.claude/lessons/security-lessons.md`
> §S-002, en-tête de `tools/deploiement/generer-config-swa.mjs`, et les 11 cas de
> `src/config-swa-provenance-style.spec.ts` (trois mutations à l'appui).
*Ce qui l'a tranché.* En l'état, `generer-config-swa.mjs` hache **tout ce qu'il trouve** — c'est la
lettre de **S-002** (« une autorisation CSP se compare à une valeur revue épinglée, jamais ne se
dérive de l'artéfact »), et le générateur cesserait d'être un garde-fou pour devenir un distributeur
de permissions, ce que son propre en-tête reproche déjà à `script-src`. Épingler chaque hachage de
style comme `HACHAGE_SCRIPT_ATTENDU` était l'option fidèle à la lettre, et c'est précisément celle
qui rougirait à **chaque `.scss` touché** : la pression à contourner serait permanente, sur un
garde-fou dont S-011 nous a déjà montré qu'il en subit.
⚠️ **L'écart résiduel se DÉCLARE, il ne se tait pas** — mais il était **mal mesuré**, et l'amendement
E-3 bis ci-dessus le corrige. Formulation qui fait foi : le *contenu* de chaque bloc reste dérivé, et
ce qui est fermé, c'est qu'un hachage de style **apparaisse dans la CSP sans que personne ne le
voie** — parce que leur **NOMBRE** est épinglé, pas parce que la provenance saurait distinguer
Angular d'un composant (elle ne le sait pas : c'est Angular qui émet les styles des composants).
À écrire dans S-002 et dans l'en-tête du générateur, dans le même diff que le code — sans quoi c'est
**S-009** (un texte qui promet plus que le code n'applique). ✅ Fait le 2026-08-18, correctifs de
revue du lot E-b1.

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

#### 🔵 Les deux décisions d'E2-ST4, tranchées le 2026-08-18 (avant d'écrire une ligne)

**ST4-1 · Il n'y a PAS de sélecteur de langage, et le nœud « onglets » du backlog est sans objet.**
L'objectif écrit annonçait « onglets de langage (PHP/C#/TS) ». La passe `devils-advocate` a
montré, et la vérification sur le dépôt a confirmé, que **le modèle de données ne porte pas ça** :
les `exemples` d'un bloc `comparaison` sont des **paires de vulnérabilités DISTINCTES**, pas le
même code traduit. La fixture témoin le prouve — paire 1 = PHP / XSS, paire 2 = C# / injection SQL
(`tools/content-pipeline/__fixtures__/temoin/cours/securite-web/*/lecon.md`, section « Exemple
complet »), et `compiler-markdown.mjs` n'impose aucune unicité de langage entre paires. Des onglets
« de langage » cacheraient donc **un exemple pédagogique entier** derrière une étiquette
mensongère. Ni ARIA `tablist` ni `<details name>` : **aucun sélecteur**. ⚠️ Ce qui reste vrai et
mérite d'être gardé de la passe d'architecture : construire des onglets JavaScript sur une page
prerendue de ce dépôt serait de toute façon un **bouton mort qui a l'air vivant** pendant la
fenêtre de pré-hydratation (`withNoIncrementalHydration()` actif, L-033).

**ST4-2 · On enrichit le rendu EN PLACE, on n'extrait pas de `code-compare/`.** Le rendu
`comparaison` existe déjà dans `src/app/features/cours/lecon/rendu-blocs/rendu-blocs.ts` (~l.
114-165) — deux volets côte à côte, étiquettes écrites, annotations rattachées, zéro JS — et s'y
annonce lui-même comme provisoire. Ses paires de contraste sont **déjà mesurées** dans
`rendu-blocs.scss`. L'extraire obligerait à repasser les données et à déplacer des styles mesurés,
pour un gain de découpage sur un fichier qui ne pousse pas. Décision du propriétaire, 2026-08-18.
**Le chemin `src/app/features/cours/code-compare/` écrit dans l'objectif d'E2-ST4 est donc
caduc.**
**Aucun repliage** : toutes les paires restent visibles. Trois coûts réels l'écartent sur un site
de cours — le contenu d'un `<details>` fermé **ne s'imprime pas**, Safari ne le trouve pas au
`Ctrl+F`, et un accordéon exclusif peut finir avec **zéro exemple à l'écran**.

**Le delta réel d'E2-ST4**, et sa découpe :

| Lot | Contenu | Gates | Statut |
|---|---|---|---|
| **A1** | Le contrôle de portée des annotations, **des deux côtés** (`compiler-markdown.mjs` + `rendu-blocs.ts`) + fixture invalide exécutée par la CI. Traite aussi le doublon : `lignes="1,2"` pousse aujourd'hui **la même annotation deux fois** | G-typage-outils, G-content, G-test | ✅ **clos le 2026-08-18** (`b0fc189`) |
| **A2** | Sonde : **que survit-il au sanitizer d'Angular** sur la sortie Shiki (`class` oui ; `data-*`/`id` à mesurer — précédent SVG 24 éléments → 0) ; **mesurer avant de concevoir**, puis le transformateur `line` | G-test, G-content | ✅ **clos le 2026-08-18** (`441af77`) |
| **B** | Le rendu enrichi : annotations ancrées à la ligne, 2 colonnes en large, numérotation CSS de toutes les lignes (le filet `.ligne-annotee` est retiré du périmètre) | G-lint, G-test, G-build | ✅ **clos le 2026-08-18** |
| **C** | Vérification jetable : G-axe, G-e2e clavier sous CSP réelle, `config:swa` (aucun hachage neuf attendu) | tous | ✅ **clos le 2026-08-19** |


##### ✅ Clôture du lot A1 — 2026-08-18

**Le défaut visé était réel, mais ce n'est pas le pire que le lot ait trouvé.** La portée n'avait
aucun plafond (`lignes="42"` sur un extrait de 5 lignes sortait G-content vert) — corrigé, et
l'invariant est tenu des deux côtés. 🔴 **Le vrai défaut : `lignes="1,,2"`.** Un jeton VIDE entre deux
virgules devenait une valeur **légale par coercition** — `Number('')` vaut `0`, `Number.isInteger(0)`
est vrai, et `0` signifie « le bloc entier ». Une coquille de frappe changeait donc **silencieusement
le sens** de l'annotation, et se publiait.

**Contrat modifié** : `ligne: number` → **`lignes: number[]`**. `{lignes="1,2"}` produit désormais UNE
annotation portant deux lignes, au lieu de deux notes au texte identique. Aucun consommateur résiduel
de l'ancienne forme (vérifié sur `src/`, `tools/`, `e2e/`, les specs, les schémas Ajv et la fixture).

**Écart au plan, fondé** : le pendant côté application vit dans `RenduBlocs.preparer()` et non dans
`resoudre-lecon.ts` — `lireLeconCompilee` est en réalité dans
`src/app/features/cours/contenu-compile.ts`, qui **délègue explicitement le contenu des blocs** à
`RenduBlocs` (L-016). Il n'y vérifie que la **forme** ; la **borne** y est déclarée **non prouvable**
en toutes lettres, parce qu'`ExempleCode` ne porte pas le code brut — la déduire du balisage Shiki
serait une garantie dérivée de l'artéfact (S-005/S-009).

**Deux constats de revue Majeurs, corrigés par agent frais, chacun prouvé par mutation** :
- le garde-fou **promettait plus qu'il n'appliquait** — il déclarait couvrir « un contenu compilé par
  une autre version du pipeline », qui est précisément le seul cas où il levait un `TypeError`
  anonyme. Garde `Array.isArray` sur les trois niveaux (`exemples`, `annotations`, `lignes`) ;
  mutation : 1 rouge nommant le `TypeError`.
- la validation de format `^\d+$` **n'était exercée par aucun test** (piège B / L-019) : la retirer
  laissait les 20 tests verts, et `lignes="0x2"` compilait en ligne 2. Deux cas ajoutés, chacun tuant
  le mutant **indépendamment**.

**⚠️ Limite laissée en place et ÉCRITE, pour le lot B** : `lireExemple` joint toute la prose d'un
volet, donc `ExempleCode.annotations` ne porte plus que **0 ou 1** élément — alors que le type, le
`@if` et le `@for` en promettent N. Le lot B (annotations ancrées à la ligne) la fera sauter ; il ne
doit pas la découvrir en chemin.

**📄 Dette documentaire payée au passage, et elle était pire que « périmée ».**
`docs/contenu/pipeline-contenu.md` décrivait une syntaxe morte depuis E2-ST1. Or `langageDe` ne lit
que le **premier mot** de la clôture d'un bloc de code : le reste était donc **ignoré en silence**, et
le bloc sortait en simple `code`. Un auteur suivant la doc aurait publié une leçon **sans
côte-à-côte, tous gates verts**. C'est le fichier depuis lequel `professeur-web` écrit, et E3-ST1 est
la prochaine leçon. Réécrit avec la forme réelle et les cinq refus.

**Chiffres** : G-test **509 / 28 fichiers** · G-e2e **21** (artéfact fixture) · G-axe 344
vérifications, 0 violation · G-lint, G-typage-outils, G-typage-e2e verts · `npm audit --omit=dev` **0**.

##### ✅ Clôture du lot A2 — 2026-08-18

**Verdict de la sonde** (`src/sonde-sanitizer-shiki.spec.ts`, compile la fixture `temoin-minimal`
par processus fils, mesure ce que le sanitizer d'Angular laisse passer de la sortie Shiki, sur
Angular 22.1) : `class` 15 → 15, `tabindex` 4 → 4, `aria-describedby` 3 → 3, `aria-label` 3 → 3,
mais **`id` 3 → 0 et `data-ligne` 3 → 0**. Le précédent du SVG (24 éléments → 0) interdisait de le
supposer ; c'est confirmé pour `data-*`/`id`.

**Décision qui en découle : une classe, pas un `data-*` ni un `id`.** Le transformateur Shiki
`drjst-ancre-de-ligne` (`compiler-markdown.mjs`) pose donc `class="line ancre-ligne-N"` (base 1) —
le seul véhicule mesuré comme survivant. Un `data-ligne` aurait produit un artéfact **correct** à la
compilation, une page prerendue **sans le crochet** une fois passée au sanitizer côté navigateur, et
**aucun gate rouge** pour le signaler avant la publication — exactement le mode d'échec que « mesurer
avant de concevoir » existe pour éviter.

**Deux constats de revue Majeurs, corrigés dans le même diff.**
- *Revue sécurité* : la première écriture du garde-fou cherchait un **motif** dans la chaîne HTML —
  laquelle contient le texte du code de l'auteur, donc un commentaire de leçon citant « ligne-1,
  ligne-2, ligne-3 » satisfaisait le garde-fou avec le **transformateur débranché** (mesuré par le
  reviewer). Quatrième récidive de la famille S-001/S-003/S-009. Corrigé : le compilateur **analyse**
  sa propre sortie (jsdom, sélecteur `pre.shiki > code > span.line`) et exige la suite ordonnée
  1..N — liste blanche nominative, jamais un motif. Leçon **S-014**.
- *Revue de code* : le test censé prouver ce correctif compilait avec le transformateur **branché** —
  il exerçait la fonction de lecture du spec, pas la capacité de **refus** du compilateur, et serait
  passé vert **avant** le correctif aussi. `verifierAncres` est désormais exporté et appelé
  directement dans un processus fils : HTML forgé sans ancre mais dont le texte en cite ⇒ code de
  sortie 1 ; le même fragment ancré ⇒ 0 ; ancres décalées d'un cran ⇒ 1. Leçon **L-036**.

**Écrit pour le lot B** : l'artéfact porte **une ligne de plus** que la source — le saut final de
markdown-it devient une dernière ligne vide, elle aussi ancrée. `[1,2,3,4]` pour un bloc source de 3
lignes du corps de leçon, `[1,2,3]` pour le code d'un quiz. Règle exacte consignée dans `types.d.ts`
et épinglée par une mesure.

**Chiffres** : G-lint vert · `npm run typecheck:tools` vert · G-test **517 / 29 fichiers**, 0 échec
(509 / 28 avant le lot) · `npm run build` + `config:swa` verts, **9 hachages de style / 1 de
script**, inchangés. G-e2e et G-axe non rejoués — le rendu utilisateur ne change pas (une classe
inerte de plus) ; ils appartiennent au **lot C**.

**PR #19** (`feat/e2-st4-lot-a2` → `main`).

**⏭️ Dette neuve, à payer avec le lot B (pas avant) : le compteur de lignes du validateur diverge
du compilateur.** `verifierQuestionTrouverLaFaille` (`tools/content-pipeline/valider.mjs`, ~l. 879)
compte les lignes d'une question avec `code.split('\n').length` — ni retrait du saut final, ni
`\r?` — alors que le compilateur emploie `compterLignes`. Sur un `code` de quiz terminé par un saut
de ligne, le validateur accepte donc `ligneFautive = N+1`, la ligne vide finale que personne ne peut
désigner dans l'interface. Non corrigé dans le lot A2 à dessein : resserrer ce garde-fou demande sa
propre fixture invalide sous `__fixtures__/invalides/` et son assertion — le lot B touchera de toute
façon aux deux côtés du comptage de lignes.

##### ✅ Clôture du lot B — 2026-08-18

**Deux décisions du propriétaire, prises le 2026-08-18, à ne pas rouvrir.**
- **Le filet `.ligne-annotee` est RETIRÉ du périmètre**, remplacé par la **numérotation CSS de
  toutes les lignes** (`counter-increment` + `::before`, feuille globale `src/styles/_code.scss`).
  Écart assumé à la lettre du backlog, arbitré après la passe d'avocat du diable : un filet
  **disparaît en `forced-colors: active`** et ne peut donc pas porter d'information ; il aurait été
  le **3ᵉ trait vertical emboîté** ; il aurait exigé un contrat compilateur→CSS à quatre endroits
  pour un seul consommateur ; et une ligne pouvant porter N notes, il aurait dit « il se passe
  quelque chose ici », pas « cette note-ci ». La numérotation rend « Ligne 2 : » localisable pour
  **toutes** les notes à la fois, sans toucher au compilateur.
- **Syntaxe d'auteur : forme UNIQUE.** Un paragraphe = une note, `{lignes="…"}` **obligatoire en
  tête** (`{lignes="0"}` = bloc entier). L'écriture d'avant (`{lignes}` posé sur le `:::` du volet)
  **échoue en se nommant** (« clef inconnue »), elle ne se dégrade pas. La limite « 0 ou 1
  annotation par volet » laissée par le lot A1 est **levée**.

**Ce que les revues ont trouvé, et qui n'était pas ce qu'on cherchait.**
- 🔴 **La dette du comptage de lignes avait CHANGÉ DE PLACE, pas disparu.** `compter-lignes.mjs`
  a été créé avec « UNE définition, TROIS appelants » ; la revue en a trouvé un **quatrième**, côté
  *rendu* : `quiz.ts` comptait `code.split('\n')`, produisant une **radio fantôme « Ligne N+1 »**
  au libellé vide et une garde plus permissive que le validateur. Invisible parce qu'un composant
  Angular ne peut pas importer un `.mjs` de `tools/` — la copie est structurellement nécessaire.
  Nommée comme copie, pointeur vers la référence, et verrouillée par un test de parité
  (`src/compter-lignes-parite.spec.ts`, 14 cas). Leçon **L-037**.
- 🔴 **Le garde-fou « zéro style en ligne » aurait refusé la leçon qu'il protège.** Il cherchait
  `/\sstyle\s*=/i` **dans la chaîne HTML, laquelle contient le texte du code de l'auteur** : un
  exemple PHP `$html = '<p style="color:red">';` faisait échouer G-content sur un diagnostic faux —
  sans parade éditoriale possible (le code doit rester copiable). Cinquième récidive de la famille
  S-001/S-003/S-009/S-014, axe neuf : le **sur-refus**. Corrigé par analyse jsdom (attribut/élément
  `style` réels), contrôle positif en appelant la fonction sur un HTML forgé (L-036). Leçon **S-015**.
- 🔴 **Un arrêt de tabulation MORT par bloc de code, créé par le lot lui-même, invisible à tout
  gate.** En remontant le défilement dans `div.defileur` et en retirant `overflow-x` de `.shiki`, le
  `tabindex="0"` posé par Shiki sur `<pre>` est devenu inutile : la page témoin est passée de **8 à
  16 arrêts**, dont 8 sans nom et sans rien à défiler — invisible parce que `focus-order-semantics`
  est désactivée chez axe par défaut et `scrollable-region-focusable` est désactivée dans
  `tools/a11y/verifier-axe.mjs` (jsdom ne calcule pas le débordement). Corrigé dans ce lot par un
  transformateur Shiki qui retire le `tabindex` : mesuré **16 → 8**. Sonde
  `src/sonde-sanitizer-shiki.spec.ts` mise à jour (`tabindex` 4 → 3, tripwire exact).

**Pourquoi le défileur est passé dans le gabarit** (trouvaille de l'avocat du diable, avant toute
ligne de code) : deux colonnes rendent le débordement horizontal systématique, et une région
défilante **dans** l'`[innerHTML]` n'a aucun focusable — inatteignable au clavier (WCAG 2.1.1), sans
qu'aucun gate ne rougisse. Le bloc de code y gagne aussi le nom accessible qu'il n'avait pas
(`<figcaption>` + `aria-label`, `role="group"` et non `region`).

**Dettes neuves, nommées et datées.**
- **`--couleur-code-fond` → E6.** Le fond du bloc Shiki vient des thèmes github, généré dans un
  fichier gitignoré — **hors du gate de contraste dès aujourd'hui**, aucune encre du bloc de code
  mesurée. E6 (« Moniteur ambre ») devra de toute façon reprendre ce fond.
- **→ lot C** : vérification Playwright des arrêts clavier (seul filet réel — G-axe ne voit ni
  débordement, ni contraste, ni disposition) ; et l'**unicité inter-sections** des noms de
  défileur — la page monte un composant par section, donc les compteurs de rang repartent de 1
  (mesuré : 8 défileurs, 8 noms distincts, mais quatre « Code n°1 » que seul le langage sépare).
  Lever ça demande l'identité de section en entrée. **Levé au lot C** : la numérotation des
  figures de code est devenue **continue sur toute la page** — voir la clôture du lot C
  ci-dessous.
- ⚠️ Rappel pour le lot C : tout fichier neuf sous `e2e/` doit être inscrit dans
  `src/configuration-typescript.spec.ts`, sinon G-test rougit — voulu (**L-034**).
- Inchangée : la dette `quiz.scss` (+88 o), antérieure.

**Chiffres de clôture, mesurés le 2026-08-18** — G-lint ✅ · `typecheck:tools` ✅ · **G-test
566 / 30 fichiers, 0 échec** (509/28 avant le lot) · **G-e2e 21 passés / 0 sauté** (fixture),
**11 passés / 10 sautés** (production) · **G-axe 4 pages / 344 vérifications, 0 violation**
(fixture), 3 pages / 258 (production) · **G-build 12 hachages de style / 1 de script** (fixture),
**9 / 1** (production) — inchangés · `npm audit --omit=dev` **0**.

##### ✅ Clôture du lot C — 2026-08-19

**La décision du propriétaire, prise le 2026-08-19, à ne pas rouvrir.** La numérotation des figures
de code devient **CONTINUE sur toute la page** (les compteurs `code` et `paires` restent distincts
l'un de l'autre, mais chacun ne repart plus jamais à 1 à chaque section ni à chaque encadré). Les
alternatives « titre de section dans le nom » et « ne rien faire » ont été écartées. Le constat
laissé **ouvert** par le lot B (« quatre Code n°1 que seul le langage sépare ») est donc **levé**.

**Ce que les revues ont trouvé, et qui n'était pas ce qu'on cherchait.**
- 🔴 **Une mutation survivait aux 573 tests.** Le compteur `paires` n'était jamais exercé **à
  travers la récursion** : remettre son décalage à zéro dans un encadré ne faisait rougir aucun
  test, et aurait renuméroté les exemples au milieu d'une leçon publiée (« Exemple vulnérable n°1 »
  en plein corps de texte). Test ajouté, mutation prouvée (1 échec nommé sur 576).
- 🔴 **Un test vert par COMPENSATION.** Le commentaire `🔴` d'un test l'annonçait comme le filet de
  la récursion ; la mutation correspondante le laissait vert, parce que le harnais travaillait à la
  valeur **neutre** (décalage 0) où la descente compense exactement la propagation absente. Il
  fermait un défaut **voisin** de celui qu'il annonçait. → **L-039**.
- 🔴 **Les huit `tabindex` du lot B sont sans emploi à la largeur réellement servie.** Sonde sur
  8 largeurs : à **1280 / 1024 / 768 px, AUCUN** des huit défileurs ne déborde (la colonne de prose
  fait 635-686 px, plus large que toute ligne de code de la fixture) ; 640 → 2, 480 → 6,
  400/360/320 → 7. Le lot B a retiré huit arrêts morts posés par Shiki et en a créé huit autres par
  une autre porte. **Ce n'est pas un échec WCAG** (aucun critère n'interdit un focalisable qui ne
  défile pas), c'est du bruit clavier. Dette ci-dessous.
- 🔴 **Un titre de test affirmait un absolu que sa mesure ne couvrait pas** (« AUCUN arrêt mort »,
  défini structurellement, donc aveugle à l'arrêt mort *fonctionnel*) : un lecteur de log CI
  concluait « zéro » pendant que le produit en avait huit. Retitré, et le fait est désormais
  **imprimé au journal** à chaque run plutôt que figé dans un commentaire. → **L-040**.
- 🔴 **Sous la CSP servie, on ne déplace rien par le style — et ça ne se voit pas.** Une écriture
  CSSOM (`el.style.top = …`) est **acceptée dans le DOM** (l'attribut se relit) et **jamais
  appliquée** (`getComputedStyle` rend la valeur d'origine), **sans** `securitypolicyviolation` ni
  message de console. Un contrôle positif bâti là-dessus aurait été un **no-op silencieux accusant
  le produit**. Parade employée : chasser l'élément **par le défilement**. → **L-041** et **S-016**.
- Le module mutualisé `e2e/aides/indicateur-focus.ts` a reçu une **tolérance d'un pixel** (justifiée
  et jugée correcte : Chromium aligne l'élément focalisé *flush* sur le bord et arrondit le
  défilement à l'entier ; dépassements mesurés 0,422 px et 0,172 px sur un élément parfaitement
  visible). Ce qui manquait n'était pas la borne mais **la preuve de refus** : `dansLaFenetre`
  n'était lu qu'en `.toBe(true)` par ses trois appelants, **rien ne prouvait qu'il savait encore
  répondre `false`**. Contrôle positif ajouté (par les **deux** bords), `TOLERANCE_SOUS_PIXEL`
  exporté et épinglé `<= 1`, comparaisons rendues **strictes**, tolérance **ramenée au seul axe
  vertical** — le seul mesuré. → addendum **L-034**.

**Dettes neuves, nommées et datées.**
1. **→ E6 · Huit `tabindex="0"` sans emploi à 1280 px.** Le `tabindex` est inconditionnel dans le
   gabarit ; le rendre conditionnel au débordement est **impossible au prerender** (le gabarit
   ignore la largeur de lecture) et le poser après hydratation **rouvrirait L-033**. E6 (« Moniteur
   ambre ») reprend de toute façon l'apparence du bloc de code : à trancher là, avec
   `--couleur-code-fond` (déjà consignée). Le fait est **imprimé à chaque run e2e**, il ne se
   perdra pas.
2. **→ dette de sécurité · contrôle positif `style-src` dans `e2e/aides/sonde-csp.ts`.** Le
   contrôle positif existant porte sur `script-src` (script inline injecté → violation captée) ;
   **rien n'atteste que `style-src` soit observable de la même façon**, et la mesure ci-dessus
   montre qu'il bloque **sans lever d'événement**. « 0 violation collectée » ne prouve donc rien
   pour cette directive — or c'est **la plus mouvante** (+3 hachages au lot E). Forme attendue :
   écriture CSSOM + assertion `getComputedStyle`, sans dépendre d'un événement. Voir **S-016**.
3. Inchangée : `quiz.scss` dépasse son budget de **88 o** (4,09 Ko / 4,00 Ko), antérieure au lot.

**Chiffres de clôture, mesurés le 2026-08-19 par le fil principal** (vérification indépendante,
après les trois agents) — G-lint ✅ · **G-test 576 / 30 fichiers, 0 échec** (566/30 avant le lot) ·
**G-e2e 29 passés / 0 sauté** (artéfact de fixture) et **12 passés / 17 sautés, code 0** (artéfact
de production) · **G-axe 4 pages / 344 vérifications / 0 violation** · **G-build 12 hachages de
style / 1 de script** (fixture), inchangés · `npm audit --omit=dev` **0**.

**E2-ST4 est CLOSE EN ENTIER** (lots A1, A2, B, C).

##### 🔴 Le déploiement rouge du 2026-08-18, et le mécanisme qui le referme

La PR #17 est passée **verte en CI** puis a rendu `deploy.yml` **rouge sur 10 tests e2e**, après
fusion. Cause **structurelle** : la décision E-2 fait bâtir à `ci.yml` l'artéfact depuis la **fixture
témoin**, tandis que `deploy.yml` garde la racine de **production** — or les huit specs du lot E
visent `/cours/securite-web/lecon-temoin/`, une route qui n'existe **que** dans l'artéfact de
fixture. Le vert de `ci.yml` masquait le trou parce qu'il regarde l'autre artéfact (**L-007** : un
gate câblé dans un workflow et pas dans l'autre).

Exiger cette page dans l'artéfact de production reviendrait à exiger que la fixture **parte en
ligne** — ce que E-2 refuse. `e2e/aides/artefact-mesure.ts` interroge donc le **disque** (et non le
serveur : une 404 ne distinguerait pas « artéfact de production » de « serveur cassé ») et saute les
trois specs quand la page est absente, en **imprimant** ce qui n'a pas été mesuré, pourquoi, et la
commande pour l'exercer en local.

**🔴 Ce qui empêche le saut de tout avaler en silence vit HORS de la suite e2e**, et c'est le point :
un fichier entièrement sauté ne peut pas s'assertionner. `src/workflows-github.spec.ts` exige donc
que la fixture nommée par `ci.yml` porte une leçon **au slug exact** que ces specs cherchent. Le test
voisin n'exigeait qu'« une leçon, n'importe laquelle » — insuffisant : renommer la fixture l'aurait
laissé vert, `ci.yml` aurait toujours prerendu une page interactive, et les dix specs se seraient
sautés **des deux côtés** sans qu'un seul run ne rougisse. Le slug y est écrit **en dur**, parce que
ce fichier ne compile pas avec la suite e2e et ne peut donc pas importer la constante qu'il contrôle
(**L-012**).

| Artéfact | Ce qui le bâtit | Attendu |
|---|---|---|
| Fixture témoin | `ci.yml` | **21 e2e passés, 0 sauté** |
| Production | `deploy.yml`, `npm run build` | **11 passés, 10 sautés, code 0** |

**⏳ Péremption** : à la clôture d'E3-ST1, `content/` portera une vraie leçon, le saut ne se
déclenchera plus jamais, et `e2e/aides/artefact-mesure.ts` se retire **avec** le harnais de fixture.

##### ⚠️ Le piège de harnais payé en direct au lot A1 — il ment dans les DEUX sens

`playwright.config.ts` pose `reuseExistingServer: !CI`. Un `npx swa start` laissé en marche par un run
précédent est **réutilisé**, et il sert la politique CSP qu'il a lue à **son** démarrage :
reconstruire l'artéfact ne le lui apprend pas. Or changer un gabarit change l'identifiant du
composant, donc le contenu de son bloc `<style>`, donc son hachage. Constaté : une violation
`style-src-elem` parfaitement **reproductible**, sur un dépôt sain, pendant que `npm run config:swa`
sortait vert avec le bon compte.

**Le sens inverse est le vrai danger** : un serveur démarré sur une politique plus **permissive**
rendrait **vert** exactement ce que ces specs existent pour attraper. C'est la famille de **L-032**
sur un axe neuf — l'émulateur implémente bien la directive, mais depuis un **instantané**.
`exigerCspServie` compare donc la CSP **servie** à celle de l'artéfact **sur le disque**, à l'octet
près. Contrôle positif exécuté : serveur démarré sur la config saine, artéfact muté ensuite ⇒ les
deux tests rougissent sur le message de divergence, **avant** l'assertion trompeuse.

Et deux constats à ne pas perdre, vérifiés sur le code :
- 🔴 **Le contrôle de portée manque réellement** : `compiler-markdown.mjs` (~l. 691-699) n'accepte
  qu'un entier `>= 0`, **sans plafond** — `lignes="42"` sur un extrait de 5 lignes sort G-content
  **vert**. `valider.mjs` (~l. 879-884) fait pourtant exactement ce contrôle pour `ligneFautive` :
  l'asymétrie est nette. Même famille que la dette du lot D.
- ⚠️ `ExempleCode` **ne conserve pas le code brut** (`types.d.ts`) : rien en aval ne peut recompter
  les lignes. Le contrôle doit donc vivre **dans le compilateur** ; le pendant côté
  `resoudre-lecon.ts` ne peut vérifier que la cohérence avec le HTML colorisé.
- Détail de nommage : le jeton s'appelle **`--couleur-ok-corrige`** (`src/styles/_themes.scss`) ;
  `ok-fixed` n'existe que dans les docs.

### E2-ST5 — SimulationComponent
- **Objectif** : simulation pas-à-pas visuelle pilotée par un JSON d'étapes (acteurs : navigateur/attaquant/serveur ; états ; flèches/messages) ; contrôles précédent/suivant/réinitialiser ; variante `prefers-reduced-motion` sans animation.
- **Fichiers** : `src/app/features/cours/simulation/`, schéma JSON associé.
- **Gates** : G-lint, G-test, G-build, G-axe.

**✅ CLOSE EN ENTIER (2026-08-19)** — tous les lots livrés : **a** (transport de `simulation.json`
jusqu'à la frontière de typage, commit `ee91e5d`), **b1** (le `SimulationComponent`, modèle **C′**,
commit `fa30352`), **b2** (câblage de `app-simulation` dans `rendu-blocs.ts`/`lecon.ts`, budget
`anyComponentStyle` relevé), **c1** (e2e mécanique + clavier + axe), **c2** (CSP `style-src` et son
contrôle positif — dette **S-016 payée**), **d** (clôture documentaire, cette passe).
- **Décisions prises pendant le lot, à ne pas rouvrir** : modèle **C′** (liens d'étape présents dès
  le prerender, repli au premier geste seulement) ; type d'acteur **`attaquant`** ajouté à
  l'énumération fermée ; budget `anyComponentStyle` **relevé de 4 Ko à 6 Ko**, ce qui paie du même
  coup la dette des 88 o de `quiz.scss` ouverte depuis E2-ST4 (zéro avertissement de budget dans les
  deux builds) ; **`aria-current="step"`** retenu contre le marqueur purement textuel (le mot
  « (étape courante) » est du contenu, pas un état programmatiquement déterminable — WCAG 4.1.2), le
  texte visible restant sous `aria-hidden`.
- **Compte de hachages de style** : `ci.yml` (artéfact de **fixture**) passe de 12 à **13**, reporté
  aussi dans `src/workflows-github.spec.ts`. `NOMBRE_HACHAGES_STYLE_ATTENDU = 9` dans
  `tools/deploiement/generer-config-swa.mjs` et `deploy.yml` **n'ont pas bougé** : `content/` est
  vide, aucune simulation n'est rendue en production.
- **Chiffres de clôture, mesurés et vérifiés indépendamment le 2026-08-19** :
  - **G-lint** : *All files pass linting*.
  - **G-test** : **576 → 661 tests / 30 → 32 fichiers**, 0 échec (4 assertions neuves ajoutées le
    même jour par le lot CI ci-dessous — pas une régression).
  - **G-e2e** : **48 passés / 0 sauté** sur l'artéfact de **fixture** · **12 passés / 36 sautés** sur
    l'artéfact de **production** (chaque saut imprime sa raison via `exigerLaPageDeLecon`).
  - **G-axe** : 4 fichiers, **344 vérifications, 0 violation**.
  - **G-build** : production **9 hachages de style / 9 attendus / 1 de script** · fixture **13 / 13**.
  - **G-audit** : `npm audit --omit=dev` → **0 vulnérabilité**.
- **Dettes NEUVES ouvertes** : le contrôle positif CSP de `style-src` vit **en HTTP sur localhost** —
  `frame-ancestors`, HSTS et `upgrade-insecure-requests` restent **inobservables** par ce contrôle et
  il **n'est pas rejoué en ligne** par `deploy.yml` · **L-041 était fausse** (sa prémisse était
  l'inverse de la réalité mesurée) ; sa réécriture est en cours ailleurs, à ne pas relire ici.

#### 🔴 DETTE NEUVE, CONSTATÉE LE 2026-08-19 — deux specs e2e de la simulation sont INTERMITTENTS

**À traiter avant de considérer E2-ST5 comme réellement stable**, et à connaître avant tout lot qui
touche `SimulationComponent` ou qui lit un vert de CI comme une preuve.

**Le fait.** Sur la PR #25 (run `32282161844`), deux specs ont échoué :
`e2e/parcours-clavier-simulation.spec.ts:210` (« activer un lien d'étape au clavier replie la vue »)
et `e2e/simulation-mecanique.spec.ts:298` (« actionner la simulation ne produit aucune violation de
la CSP servie »). **Même symptôme dans les deux cas : le repli n'a pas eu lieu** — `etat.courante`
vaut **1** au lieu de 4, et les étapes visibles sont `[1, 2, 4, 5, 6]` au lieu d'aucune.

**Pourquoi c'est INTERMITTENT et non une régression, prouvé sans relance.** La PR #25 est la PR #24
**plus de la documentation seule** : le code produit des deux est **identique à l'octet près**. Le run
de #24 était **vert (48 e2e / 0 échec)**, celui de #25 est rouge. Même code, résultats différents ⇒
intermittence. ⚠️ Ce raisonnement-là est valide ; **conclure « transitoire » sur un seul run vert ne
l'est pas** (c'est la faute commise le matin même, consignée en **L-005**).

**Piste, à vérifier et non à croire.** Les deux specs appellent pourtant `attendreHydratation(page)`,
qui attend la disparition des attributs `ngh`. L'hypothèse est donc que **cette attente ne suffit pas
pour le `SimulationComponent`** : le modèle **C′** rend les liens d'étape actifs dès le prerender (ce
sont de vraies ancres), et le repli n'arrive qu'au premier geste **après** que l'écouteur est attaché.
Si le chunk paresseux n'a pas fini de s'exécuter quand la touche Entrée part, la navigation de
fragment a bien lieu, **aucun repli ne se produit, et rien n'échoue bruyamment** — exactement la
famille **L-033**. `ngh` absent prouve l'hydratation des vues, pas que le comportement d'un composant
paresseux est armé. Si l'hypothèse tient, la parade est une attente qui observe l'**effet** (le
composant a répondu) plutôt qu'un **marqueur** de framework — même leçon que **L-004** sur les
vérifications post-déploiement.

**Ce que ça coûte tant que ce n'est pas payé** : G-e2e peut rougir sur une PR parfaitement saine, ce
qui **use la confiance dans le gate** et pousse à fusionner au rouge « parce que c'est sûrement le
flaky ». C'est le mécanisme par lequel un gate meurt.

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

#### 📐 Plan arrêté — 2026-08-19 (v2, après passe `devils-advocate`)

> Objectif d'origine (13 modules, un seul cours) **replanifié** — deux cours (§E7), un index de
> cours, une progression indexée **par cours**. Les deux tableaux « on prend / on refuse »
> ci-dessus **font toujours foi**. Ce qui suit est le plan d'exécution, **agent frais par lot** ; il
> est le brief direct de la prochaine session — ne pas le résumer, ne pas le rouvrir.

**Décisions du propriétaire, prises le 2026-08-19 — NE PAS LES ROUVRIR**

- **D-1 · Brouillons MASQUÉS du sommaire.** Masquage en UN SEUL point : un sélecteur
  `leconsPubliees(manifeste)` dans `contenu-compile.ts` (filtre `statut === 'publiee'`), consommé
  par le sommaire, par la navigation prev/next ET par `parametresDePrerender`. Sans ce troisième
  consommateur, un brouillon resterait prerendu et indexable : la réserve (3) d'E2-ST2 ne serait
  fermée qu'en façade. Trois recopies du filtre seraient un L-016 ; il n'y en a qu'une. La fixture
  témoin gagne UNE leçon `statut: brouillon` pour que la règle soit exercée (L-019).
- **D-2 · `section` : champ frontmatter OPTIONNEL**, pas obligatoire, pas de contrainte de
  contiguïté. Règle « tout-ou-rien par sujet » dans `valider.mjs` : si une leçon d'un sujet porte
  une section, toutes celles de ce sujet doivent en porter une. Le sommaire groupe quand les
  sections existent, rend une liste ordonnée à plat sinon.
- **D-3 · AUCUNE route neuve.** Ni `/cours`, ni `/cours/php` : une page prerendue et indexable qui
  promet un cours inexistant est refusée. La généricité du composant se prouve par un test unitaire
  le montant avec deux `sujet` distincts, via le jeton `MANIFESTE_LECONS`.

**Ce que la passe adversariale a changé au plan v1**

1. **Progression v2 SANS migration — GARDÉ**, et le pivot est VÉRIFIÉ, pas supposé : `content/` ne
   porte qu'un `README.md`, `manifeste-routes.json` vaut `[]`, `src/content-generated/` est
   gitignoré, et les seuls écrivains de progression sont `quiz.ts` et la page de leçon, tous deux
   sur une route dont le prerender est alimenté par le manifeste. Aucun visiteur réel ne peut
   détenir un enregistrement v1.
2. **Clef de stockage PLATE, pas imbriquée.** `Record<"sujet/slug", EtatLecon>`, motif de clef
   kebab/kebab, `VERSION_PROGRESSION = 2`. Une fois les compteurs sortis du service (point 3), plus
   personne n'énumère par cours : l'imbrication n'achèterait qu'une validation à deux niveaux et un
   cas mort (`{"php": {}}`). L'API publique reste `(sujet, slug)` — la composition de la clef est un
   détail privé, testé. Bonus : le `/` rend une entrée v1 (`"xss"`) inéligible au motif — double
   filet avec le rejet d'enveloppe.
3. **Les compteurs SORTENT du service.** `etat()[sujet]` compterait les entrées de leçons renommées
   ou retirées : un `12/13` deviendrait `14/13` sur la page qui existe pour mesurer l'avancement.
   Dénominateur ET numérateur viennent du MANIFESTE : `Sommaire` itère `leconsPubliees` filtrées par
   sujet et interroge `etatDe(sujet, slug)` module par module. `ProgressionService` perd
   `nombreLues`/`nombreMaitrisees`.
4. **Comportement NEUF à budgéter, absent du v1** : `marquerLue` n'a AUCUN appelant aujourd'hui, et
   `quiz.ts` ne connaît PAS son `sujet` (`QuizCompile` ne porte que `lecon`). Il faut donc un input
   `sujet` sur `Quiz`, passé par `rendu-blocs`, plus un appel neuf côté `lecon`.
5. **Hydratation : gabarit invariant + test d'invariance.** AUCUNE `@if` sur l'état de progression
   (badge toujours présent, `[class]` + texte liés) et un test unitaire comparant la structure DOM
   entre état vide et état peuplé — un invariant assertable, contrairement à un timing. La SOURCE
   des badges reste gated post-hydratation (`computed` sur un signal privé basculé en
   `afterNextRender`) : sans gate, le premier rendu client différerait du DOM prerendu (L-033).
6. **Spec d'architecture GARDÉ** (un ESLint `no-restricted-imports` matche le spécificateur écrit,
   pas le chemin résolu ; `eslint-plugin-boundaries` serait une dépendance neuve pour une règle
   unique ; G-test est câblé dans les deux workflows). Amendements : `ts.preProcessFile()`
   (`importedFiles`) + `path.resolve`, ~50 lignes, pas d'analyseur de graphe maison ; granularité au
   RÉPERTOIRE de sous-feature ; liste blanche nominative sur les arêtes RÉELLES
   (`lecon/rendu-blocs` vers `quiz`, `lecon/rendu-blocs` vers `simulation`, tout vers
   `cours/contenu-compile`).
7. **Cinq épinglages de hachages CSP, pas trois** — le v1 en oubliait deux, et ce sont ceux de la
   production : `ci.yml`, `deploy.yml`, `src/workflows-github.spec.ts`,
   `tools/deploiement/generer-config-swa.mjs` (`NOMBRE_HACHAGES_STYLE_ATTENDU`),
   `src/config-swa-provenance-style.spec.ts`. Consigne : **MESURER, JAMAIS PRÉDIRE** — le v1
   annonçait que les comptes bougeraient alors que `Sommaire` remplace `PageAVenir` (un bloc part,
   un arrive) : le delta plausible est 0, mais 0 se constate.
8. **`PageAVenir` MEURT** : `app.routes.ts` est son dernier point de montage. Après la bascule,
   `page-a-venir.{ts,scss,spec.ts}` est du code mort et `app.routes.spec.ts` (`routesAVenir`)
   ÉCHOUE. À supprimer dans le même diff — pas à « corriger ».

**Lots (agent frais chacun, dimensionnés pour finir sous ~120k)**

- **A1 — ProgressionService v2.** `core/progression/progression.ts` (clef composite,
  `VERSION_PROGRESSION = 2`, API `(sujet, slug)`, retrait des `computed` de comptage, commentaire
  d'hydratation amendé — il recommande aujourd'hui l'anti-patron `isPlatformBrowser`) ·
  `progression.spec.ts` réécrit (+ enveloppe v1 ignorée ; clef sans séparateur rejetée ; clef
  `constructor/xss`). ~650 l. de source. Vérif : `npm run lint`, `npm test`.
- **A2 — Les écrivains.** `quiz.ts` (+input `sujet`, `enregistrerQuiz(sujet, …)`) ·
  `rendu-blocs.ts` (passe `sujet`) · `lecon.ts` (appel neuf `marquerLue`) + les trois specs.
  Vérif : `npm run lint`, `npm test`.
- **B — Pipeline `section` + fixture brouillon.** `schemas/lecon.frontmatter.schema.json` (`section`
  optionnel) · compilateur · `generer-manifeste.mjs` · `types.d.ts` · `valider.mjs` (tout-ou-rien
  par sujet, échec nommant les leçons fautives) · `contenu-compile.ts` · fixture témoin **+1 leçon
  `brouillon`** · specs pipeline · `docs/contenu/pipeline-contenu.md`. ⚠️ La fixture change → les
  chiffres G-e2e/G-axe fixture peuvent bouger : les RELEVER, pas les prédire.
  Vérif : `npm run content:build`, `npm run typecheck:tools`, `npm test`.
- **C1 — Composant Sommaire (aucun gate d'artéfact).** `contenu-compile.ts` : sélecteur
  `leconsPubliees` exporté + spec · `features/cours/sommaire/sommaire.{ts,html,scss,spec.ts}` :
  filtre par `data.sujet`, groupes par `section` ou liste plate, badge toujours présent (`computed`
  gated `afterNextRender`), `dureeEstimee` par module + total, état vide « modules en préparation »,
  jetons sémantiques seulement (tout écart = défaut G7) · specs : généricité à deux `sujet`,
  invariance structurelle vide/peuplé, brouillon absent, liste plate sans sections.
  Vérif : `npm run lint`, `npm test`.
- **C2 — Bascule de route + épinglages MESURÉS.** `app.routes.ts` (Sommaire sur
  `cours/securite-web` ; suppression de `PageAVenir`) · `app.routes.spec.ts` · `navigation-lecon.ts`
  (`parametresDePrerender` et prev/next passent par `leconsPubliees`) + specs · puis MESURE :
  `npm run build` (production) et build fixture, `npm run config:swa`, relever les comptes réels,
  écrire les CINQ épinglages. Vérif : `npm run build`, `npm run config:swa` (code 0), `npm test`,
  `npm run a11y:axe`.
- **D — Règle d'architecture exécutable.** `src/regles-architecture.spec.ts` (~50 l.).
  Indépendant, exécutable après C2. Vérif : `npm test`.
- **E — e2e + clôture.** `e2e/sommaire.spec.ts` : (a) artéfact production → état vide ;
  (b) artéfact fixture → 1 module listé sur 2, slug brouillon sans page (vérifié AU DISQUE, pas par
  404) ; (c) « quiz témoin réussi → sommaire allumé », gardé par `exigerLaPageDeLecon` ·
  inscription du fichier dans `src/configuration-typescript.spec.ts` (L-034) · en local : tuer le
  processus du port 4280 avant `npm run e2e` · clôture doc : backlog §E2-ST6 ✅, réserve (3)
  d'E2-ST2 FERMÉE avec la preuve (b), `stack-et-architecture.md` §7, bloc de reprise `CLAUDE.md`.

**Ordre : A1 → A2 → B → C1 → C2 → D ∥ E.**

#### ✅ CLÔTURE — 2026-08-19

**E2-ST6 CLOSE EN ENTIER. E2 est donc CLOS en entier.**

**Chiffres de clôture (tous mesurés, aucun prédit)** : G-lint 0 erreur · G-typage-outils 0 erreur ·
G-test **744 tests / 36 fichiers / 0 échec** (était 661/32 à E2-ST5) · G-build production 3 routes
prerendues, **10** hachages de style (était 9), 1 de script · G-build fixture 4 routes prerendues,
**14** hachages de style (était 13), 1 de script · G-axe 3 fichiers, 258 vérifications, 0
violation · G-e2e fixture **50 passés / 1 sauté / 0 échec** · G-e2e production **13 passés / 38
sautés / 0 échec** · `npm audit --omit=dev` **0**.

**Épinglages CSP mesurés, pas prédits** : le plan pariait sur un delta de 0 côté style ; la mesure
donne **+1 des deux côtés** — `PageAVenir` fournissait un seul bloc `<style>` sur
`cours/securite-web`, remplacé par deux (`PageSommaireSecuriteWeb` `.page` 362 o, `Sommaire` `.vide`
3 216 o). Les 10 blocs de production ont été énumérés et nommés un par un avant épinglage (S-005).
Le compte de hachages de script reste à 1 des deux côtés.

**Livré** : `ProgressionService` v2 (clef composite `sujet/slug`, `VERSION_PROGRESSION = 2`,
compteurs retirés au profit du manifeste) · écrivains `quiz`/`rendu-blocs`/`lecon` avec `sujet`
pris du frontmatter · `section` frontmatter optionnel + règle tout-ou-rien par sujet dans
`valider.mjs` · fixture témoin à 2 leçons dont une `brouillon` · sélecteur unique `leconsPubliees`
· composant `Sommaire` générique (groupé par section ou liste plate) + adaptateur de route
`PageSommaireSecuriteWeb` · `PageAVenir` supprimé · règle d'architecture exécutable
(`src/regles-architecture.spec.ts`) · `e2e/sommaire.spec.ts`.

**Dette neuve, non traitée volontairement** :
1. Flash d'état sur navigation cliente (SPA) — le gate d'hydratation de `Sommaire` est par instance,
   pas par cycle de vie de l'app ; parade proposée : signal `hydratationTerminee` posé une fois dans
   `core/`. Non bloquant, visible.
2. Granularité de la liste blanche d'architecture (`src/regles-architecture.spec.ts`, 7 paires dont
   5 le long de l'axe de confinement) — parade proposée : critère de préfixe qui la ramènerait à 2
   entrées ; `core/` est actuellement hors corpus (une arête `core → features` serait invisible).
3. 🔴 **Troisième occurrence d'intermittence e2e, symptôme nouveau** : `e2e/quiz-pre-hydratation.spec.ts:234`
   a échoué une fois en suite complète (`document.ok()` faux — la page de leçon n'était pas servie),
   puis passé seul en 2,1 s, puis passé en suite complète au run suivant. Contrairement aux deux
   spécs déjà connues (`parcours-clavier-simulation.spec.ts:210`,
   `simulation-mecanique.spec.ts:298`, repli d'hydratation absent), ici c'est une **requête HTTP**
   qui échoue. Même dossier de dette, à payer **avant E3-ST1**.
4. Réserves antérieures : budget `quiz.scss` (dépassement de 88 o) inchangé. Le **lot de dette
   sécurité avant E3-ST1** (S-003, garde-fou `style='…'`, CSP servie vérifiée structurellement,
   portée du sceau d'artéfact, épinglage du tag `Azure/static-web-apps-deploy@v1`) est **✅ CLOS
   le 2026-08-19** — voir bloc de clôture ci-dessous.

**Enseignement du lot** : 744 tests, lint, axe et build étaient tous verts sur du code qui (a)
publiait une leçon brouillon, (b) aurait affiché l'identifiant technique `cegep` en vitrine dès la
première leçon publiée, (c) aurait pu laisser publier une leçon PHP sous une URL de sécurité. Le
seul test dédié au (b) employait une fixture à trois valeurs (`debutant/intermediaire/avance`)
absentes du contrat réel — un gate vert certifiant l'inverse de la réalité (**L-054**).

**Leçons écrites ce cycle** : L-050, L-051, L-052, L-053, L-054, L-055, S-019 (`.claude/lessons/`).

**Suite** : E2 clos en entier ; E3-ST0 déjà close ; **le lot de dette sécurité pré-E3-ST1 est CLOS**
(voir bloc de clôture ci-dessous). Ordre révisé (D-3 bascule 2026-08-17) :
E2 → E3-ST0 → E3 bloc A → E6 → E3 blocs B/C → E4 → E5. **Geste suivant : E3 bloc A — première
leçon publiée.** ⚠️ **La dette d'intermittence e2e n'est PAS payée** — elle reste devant E3-ST1, et
elle porte désormais **deux familles distinctes** : l'hydratation côté e2e (Playwright) et la
contention de ressource côté Vitest (voir bloc de clôture ci-dessous).

**Risques résiduels**

- Le plus probable : un des CINQ épinglages CSP oublié ou prédit — « mesurer avant d'écrire » est
  dans le brief de C2, nommément.
- La fixture à 2 leçons déplace des chiffres attendus ailleurs (e2e fixture, axe).
- Le filtrage `publiee` au prerender contredit le commentaire « rien à filtrer ici » d'
  `app.routes.server.ts` : C2 réécrit ce commentaire — un commentaire en retard sur le code est la
  moitié d'un L-016.

#### ✅ CLÔTURE — lot de dette sécurité pré-E3-ST1 (2026-08-19)

**Les six dettes du lot sont closes**, chacune avec sa PR :

| Dette | Fermée par |
|---|---|
| S-003 — `MOTIF_SCRIPT` de `generer-config-swa.mjs` pouvait ne rien apparier | **PR #27** — analyseur jsdom unique par page pour les trois contrôles (voir §E1-ST1) |
| Garde-fou d'attributs limité à ` style="` (et son jumeau ` on…="` troué deux fois : guillemets simples et `onError=`) | **PR #27** — même analyseur jsdom |
| CSP servie vérifiée par motifs, pas structurellement | **PR #28** — comparaison structurelle directive par directive, 11 directives énumérées au journal |
| `Azure/static-web-apps-deploy@v1` en tag mutable | **PR #28** — épinglé au SHA `1a947af9992250f3bc2e68ad0754c0b0c11566c9` (tag `v1`, relevé au run 32308397145 ; branche `v1` = `4d27395…`, volontairement non retenue) |
| Portée du sceau d'artéfact réduite par l'installation du navigateur | **PR #30** — job `contenu` propre ; preuve live : sceau au rang 13, navigateur au rang 14, « Sceau intact » au rang 18 dans `gates` |
| Valeurs `FuncIRI` non contraintes (`url(https://…#p)` traversait) | **PR #29** — 5 attributs recensés par mesure dans Chromium, valeurs contraintes aux références locales |

**Dettes NEUVES consignées, non corrigées** :
1. Les autres en-têtes globaux (HSTS, Referrer-Policy, Permissions-Policy, X-Content-Type-Options)
   restent vérifiés par **présence seule** — un `Permissions-Policy: camera=*` servi passerait tous
   les gates. Le comparateur structurel ne couvre que la CSP.
2. `publication` ne revérifie pas le sceau après `download-artifact` (préexistant ; la PR #28
   atténue en réancrant la CSP de l'artéfact à la source du checkout).
3. Le refus nominatif de `<template>`/`<noscript>`/`<iframe>`/`shadowrootmode` rougirait sur un
   `<noscript>` de repli ou un `<iframe>` de média légitimes — zéro occurrence dans l'artéfact
   aujourd'hui. Le jour où l'un est voulu : revue de sécurité, pas un retrait de la balise.
4. Le compte brut `<script[\s>/]` compte aussi dans les valeurs d'attribut, où la sérialisation
   n'échappe pas `<`. Du texte d'auteur y arrive (`bloc.titreAccessible`, `etape.nom`,
   `module.nomAccessible`) ; charge mesurée : `<p aria-label="… un <script> …">` → code 1 sur un
   dépôt sain. Parade éditoriale, jamais un assouplissement du compte (pression S-011).
5. Les 11 empreintes d'étapes de `FENETRE_AVANT_SCEAU_REVUE` se maintiennent à la main : elles
   rougissent sur un renommage bénin — voulu, le message dit quoi faire.
6. Le message d'échec de `rendre-mermaid.mjs` conseille `npm run e2e:install`, le script combiné
   que la CI interdit. Sans effet aujourd'hui (message affiché en local seulement).
7. Le nom du job `lint · test · build · audit` sous-décrit ce qu'il exécute : il porte aussi
   G-axe et G-e2e.

**🔴 Intermittences — deux familles désormais, pas une** :
- **Famille hydratation e2e** (connue) : `e2e/parcours-clavier-simulation.spec.ts:210` a une
  **quatrième occurrence**, sur la PR #30 (run `32322129384`) — `etat.courante` = 1 au lieu de 4,
  symptôme identique aux occurrences déjà consignées. Le lot ne touchait aucun code produit de la
  simulation, et dans le même run l'équivalent souris (`simulation-mecanique.spec.ts:142`) est
  passé. Au run suivant, code produit inchangé : 50 e2e passés / 1 sauté, 0 échec.
- **Famille contention Vitest — NEUVE** : `src/app/features/cours/lecon/lecon.spec.ts:1005`
  (« marque la leçon LUE, sous le couple `(sujet, slug)` du frontmatter ») a levé
  `Test timed out in 5000ms` en suite complète (1 échec sur 3 runs), 0 échec sur 5 runs isolés.
  Aucun `testTimeout` n'est configuré dans le dépôt (défaut Vitest 5 000 ms) ; le test passe par
  `RouterTestingHarness` + `navigateByUrl` + stabilisation d'un `effect` gardé par
  `afterNextRender` — coût en temps mur, sensible à la contention (run le plus lent : +44 % CPU
  pour les mêmes fichiers). Ce n'est **pas** une assertion fausse, c'est un dépassement de délai.
  Deux autres échecs signalés au même moment ne se sont pas reproduits et ne se rattachent pas à
  ce symptôme.

**Chiffres de clôture (2026-08-19)** : G-test **824 passés / 40 fichiers**, 0 échec (était
744/36) · G-e2e **50 passés / 1 sauté** (fixture) et **13 passés** (production) · G-axe
**0 violation** · G-build production **10 hachages de style / 1 de script**, fixture **14 / 1** ·
`npm audit --omit=dev` **0**.

**Suite** : geste suivant **E3 bloc A — la première leçon publiée**. La dette d'intermittence e2e
reste devant E3-ST1 (deux familles, ci-dessus).

#### ✅ CLÔTURE — lot `fix/intermittence-gates-pre-e3-st1` (2026-08-20)

**Les DEUX familles d'intermittence sont payées.** C'était la dernière dette devant E3-ST1.

- **Famille e2e — la cause consignée jusqu'ici était FAUSSE.** L'hypothèse « l'absence
  d'attributs `ngh` prouve l'hydratation des vues, pas que le comportement d'un composant
  paresseux est armé » (famille L-033) est **réfutée par la mesure** : `app-simulation` porte
  bien `ngh="7"`, l'armement est vérifié **8/8**, et **20 gestes** émis à l'instant où
  `attendreHydratation` rend la main sont **tous reçus (0 perdu)**.
  **Vraie cause** : une assertion portant sur une **valeur** lue par une `page.evaluate`
  **unique** n'est **jamais réessayée** par Playwright, alors que l'effet d'un geste est peint
  sur une frame ultérieure. 15 lectures de ce type dans 3 specs. Mesures : effet au DOM
  26-407 ms, lecture servie 112-938 ms ; sur 800 essais, une lecture CDP précède un
  `requestAnimationFrame` déjà planifié **3 fois (0,4 %)**. Le journal CI a tranché sans
  relance : le test avait bouclé en **2,0 s sans délai d'expiration** ⇒ lecture périmée, pas
  événement perdu.
  **Correctif** : trois barrières auto-réessayées sur des assertions de **locator**
  (`e2e/aides/simulation.ts`). Aucun `retries`, aucun `waitForTimeout`, **aucun code produit
  touché**.
  ⚠️ **Nuance à préserver** : L-033 n'est pas fausse en entier — la fenêtre de pré-hydratation
  et l'amorçage de l'état depuis le DOM restent **vrais** ; seule son **extension e2e**
  (le diagnostic de ce symptôme précis) est réfutée.
- **Famille Vitest** : `lecon.spec.ts` — 14 tests montent la leçon-témoin grasse dans jsdom
  (580-1018 ms chacun, 1658 ms pour le plus lourd) contre un défaut de 5 000 ms ; c'est du
  **calcul**, pas une attente. Correctif : `DELAI_RENDU = 20_000` porté sur **le `describe`
  entier** (pas sur le seul test qui rougissait), **`angular.json` non touché** — aucun
  relâchement global. Contrôle positif (7 s injectées dans le groupe → passe) **et** témoin
  négatif (les mêmes 7 s hors du groupe → `Test timed out in 5000ms`) : la sensibilité du gate
  reste intacte partout ailleurs. Un garde-fou neuf interdit désormais tout `testTimeout` global.

**Encadrés de provenance — voie (b) tranchée par le propriétaire le 2026-08-20**, contre la
voie (a), au motif qu'elle seule permet un gate exécutable. Trois variantes neuves :
`cours` · `complement` · `correction-du-cours` (avec `{source="…"}` **obligatoire**). Trois
règles : **G1** (aucun 📘/🧩/⚠️ littéral dans un corps de leçon, hors blocs de code) · **G2**
(toute leçon `publiee` porte ≥ 1 encadré de provenance) · **G3** (`correction-du-cours` sans
`source` refusé). Jetons sémantiques dans les deux thèmes, rendu Angular, fixture témoin
enrichie. ⚠️ **Il n'y a PAS de compte de provenance déclaré au frontmatter**, délibérément :
ce serait une preuve fabriquée par l'entrée (S-014). La fidélité à la fiche source reste le
travail du `verificateur-theorie`.

**Chiffres de clôture (2026-08-20)** :

| Gate | Production | Fixture |
|---|---|---|
| G-test | **849 passés / 40 fichiers / 0 échec** (2 runs, aucun `Test timed out`) | |
| G-build | **10** hachages style / **1** script | **14 / 1** |
| G-axe | 3 pages · **258 vérif. · 0 violation** | 4 pages · **344 vérif. · 0 violation** |
| G-e2e | **13 passés / 38 sautés / 0 échec** | **50 passés / 1 sauté / 0 échec** |
| G-contraste | **40 paires · 80 mesures**, plus bas **3,24:1** clair / **3,39:1** sombre | |
| Fixtures invalides | **23/23 refusées**, chacune sur sa cause propre (était 20/20) | |
| G-lint · G-typage-outils · G-audit | vert · 0 · **0 vulnérabilité** | |

Stabilité : `--repeat-each=6` sur les deux specs instables → **96 passés / 0 échec**.
✅ **Dette refermée** : l'avertissement de budget sur `quiz.scss` (4,09 Ko / 4,00 Ko), ouvert
depuis E2-ST3, **n'apparaît plus** dans aucun des deux builds.

**Dette NEUVE consignée, non corrigée** :
1. **G1 balaie la source brute, or `markdown-it` DÉCODE les entités** — mesuré : `&#x1F4D8;` →
   📘. Un auteur obtient donc le pictogramme en prose publiée sans que G1 voie rien. Parade
   nommée, **non appliquée** : porter G1 sur la **sortie compilée** (nœuds texte de l'AST hors
   blocs `code`), où les entités sont résolues et où l'exemption « bloc de code » redevient
   structurelle. Voir **S-022**.
2. **`attendreHydratation` expire sous forte contention** (hydratation mesurée à 2,1-6,5 s sous
   16 workers). **Non atteignable en CI** — `playwright.config.ts` ne fixe pas `workers`, donc
   Playwright prend la moitié des cœurs logiques (1 à 2 sur un runner GitHub). Relever ce délai
   sans preuve qu'il frappe en CI serait du masquage : **laissé tel quel, sciemment**.
3. **`e2e/simulation-mecanique.spec.ts:129`** (« rien ne se replie ») reste une assertion
   négative potentiellement vide : une barrière y serait vraie dès le prerender. La fermer exige
   un marqueur DOM « armé », donc un **changement de code produit** — hors périmètre de ce lot.
4. **`tools/content-pipeline/valider.mjs`** : l'arbre des conteneurs a été **retiré** (il était
   indiscernable d'un compte plat, et faux sur `::: a` / `:::: b` / `:::`). La sémantique réelle
   de markdown-it — le conteneur **le plus externe** réclame la fermeture — est consignée pour
   le jour où une règle en dépendra.

**Leçons écrites ce cycle** : `.claude/lessons/lessons-learned.md` — **L-057** à **L-063**
créées ; **L-017**, **L-047**, **L-062** affûtées. `.claude/lessons/security-lessons.md` —
**S-022** créée ; **S-009** et **S-011** renforcées. `.claude/rules/security.md` §4 élargie de
deux gestes (S-022, patron S-011 sur les champs d'auteur).

**Suite** : la dette d'intermittence e2e/Vitest est **CLOSE EN ENTIER**. Geste suivant :
**E3 bloc A — la première leçon publiée**, module **E3-ST1 `01-fondamentaux`**. Voir bloc de
reprise de `CLAUDE.md` pour les décisions de contenu (sources KB, `section`, absence de
simulation) et l'avertissement de tripwire de fixture à retirer dans le même commit.

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

> #### 💸 Dette née de la passe E3-ST0 — scission des fiches, mesurée le 2026-08-19
>
> `KnowledgeBase/CONVENTIONS.md` l. 74 : « **au-delà de ~500 lignes, scinder en sous-fiches liées ;
> la fiche mère devient un sommaire avec liens relatifs** ». **22 fiches dépassent ce seuil**, les
> plus lourdes étant `administration-serveur-linux.md` (1096), `exercices-corriges-poo-application.md`
> (1057), `exercices-corriges-langage.md` (981) et `automatisation-surveillance-cron.md` (792).
>
> **La scission n'a PAS été faite, et c'est délibéré** — pas un oubli : jusqu'à cinq agents écrivaient
> en parallèle dans ces deux dossiers, et découper une fiche **déplace les ancres** que d'autres
> fiches référencent par lien relatif. Le coût d'une collision dépassait le bénéfice.
>
> ⚠️ **Le seuil était déjà franchi AVANT cette passe** : `csrf.md` (559) et
> `inclusion-fichiers-ssrf.md` (513) n'ont été touchées par aucun agent. La passe a aggravé une
> dette existante, elle ne l'a pas créée — la traiter comme un lot propre, pas comme une retouche
> d'E3-ST0.
>
> **Lot à ouvrir, dimensionné** : une fiche mère = un sommaire, une sous-fiche par séance de cours.
> À faire **quand plus aucun agent n'écrit dans la KnowledgeBase**, avec un contrôle d'ancres avant
> et après (un des agents de cette passe en a écrit un et l'a exécuté : 0 ancre cassée — le
> réemployer plutôt qu'en réinventer un). **Aucune urgence** : la KB est un intrant de rédaction, pas
> un livrable publié — mais c'est une condition de lisibilité pour le `professeur-web`, qui devra
> lire ces fiches en entier pour écrire les leçons, sous budget de contexte.

### Bloc A — Fondations & familles d'attaques *(cible : en ligne mi-septembre, J4)*

| ID | Module (`NN-slug`) | Fiche KB source | Simulation | Statut |
|---|---|---|---|---|
| E3-ST1 | `01-fondamentaux` — Fondamentaux de la sécurité web (faille/exploit/0-day, CVE/CWE, OWASP Top 10 2021 **et** 2025, kill chain, types de tests) | `fondamentaux-securite-web.md` | non — schéma kill chain statique | ⬜ |
| E3-ST2 | `02-evaluation-cvss` — Évaluation des vulnérabilités (CVSS v3.1/v4.0, EPSS, KEV). 🔴 **COMPLÉMENT PUR — corrigé le 2026-08-19** : la mention « quiz = les 6 mises en situation corrigées du cours (matière d'examen) » était **fausse**. Mesure : **0 occurrence** de CVSS/CVE/CWE/EPSS/KEV dans les **8 diaporamas publiés** et dans le **plan de cours officiel**. Rien de ce module n'est examinable ; il doit se présenter comme complément. *(Réserve : la mesure porte sur le texte extrait ; un sigle qui n'existerait que dans une image aurait échappé — 95 captures ont été ouvertes sans le rencontrer.)* | `evaluation-vulnerabilites-cvss.md` | non — calculateur de scénario dans le quiz | ⬜ |
| E3-ST3 | `03-injection` — Injection SQL, commande, XXE, NoSQL ; requêtes paramétrées | `injection.md` | **oui** : déroulé d'une SQLi (entrée → requête → fuite) | ⬜ |
| E3-ST4 | `04-xss` — XSS réfléchi/stocké/DOM ; encodage de sortie contextuel | `xss-cross-site-scripting.md` | **oui** : script injecté exécuté chez la victime | ⬜ |
| E3-ST5 | `05-csrf` — CSRF ; token anti-CSRF + SameSite ; limite si XSS présent | `csrf.md` | **oui** : requête forgée depuis un site tiers | ⬜ |
| E3-ST6 | `06-controle-acces` — Contrôle d'accès, IDOR, élévation de privilèges, mass assignment | `controle-acces-idor.md` | **oui** : IDOR par manipulation d'identifiant | ⬜ |
| E3-ST7 | `07-inclusion-ssrf` — Path traversal, LFI/RFI, SSRF (métadonnées cloud) | `inclusion-fichiers-ssrf.md` | **oui** : SSRF vers l'endpoint de métadonnées | ⬜ |

> ### 📊 Recensement de provenance — mesuré le 2026-08-19, à la clôture d'E3-ST0
>
> Chaque fiche source porte désormais des marqueurs **ligne à ligne** : **📘 Cours** (matière
> d'examen) · **🧩 Complément KB** (pas exigible). Le compte ci-dessous dit, pour chaque module
> planifié, **combien de sa matière vient réellement du cours du cégep**. Il change ce qu'un module
> doit annoncer à son lecteur — et il n'était pas connu quand les 13 modules ont été écrits.
>
> | Fiche source | 📘 | 🧩 | Lecture |
> |---|---|---|---|
> | `securite-base-de-donnees.md` | 11 | 11 | la mieux couverte : comptes, privilèges, phpMyAdmin et les 7 exercices sont du cours |
> | `xss-cross-site-scripting.md` | 10 | 17 | le principe, la démo stockée et `htmlspecialchars` sont du cours ; taxonomie, DOM, CSP, DOMPurify non |
> | `injection.md` | 7 | 19 | seules les diapos 8-19 sont du cours ; UNION, blind, stacked, XXE, OS, NoSQL sont du complément |
> | `stockage-mots-de-passe.md` | 6 | 18 | |
> | `fondamentaux-securite-web.md` | 6 | 32 | seuls CIA et la chaîne d'outils viennent du cours |
> | `panorama-menaces.md` | 6 | 14 | le panorama des 8 familles ; le détail par famille non |
> | `authentification-failles.md` | 5 | 8 | |
> | `sessions-cookies-securite.md` | 3 | 7 | seule l'expiration de session (diapos 86-99) est du cours |
> | `controle-acces-idor.md` | 2 | 10 | |
> | **`evaluation-vulnerabilites-cvss.md`** | **0** | 21 | 🔴 CVSS/CVE/CWE/EPSS/KEV : **0 occurrence** dans les 8 diaporamas et le plan de cours |
> | **`jwt-securite.md`** | **0** | 15 | 🔴 **aucun mot du sujet** dans le millésime 2026 du cours |
> | **`en-tetes-securite-http.md`** | **0** | 11 | 🔴 fiche née d'une absence : la séance 8 n'a aucun support publié |
>
> **🔴 Conséquence, à traiter à la rédaction et non à la relecture.** Trois modules planifiés —
> **E3-ST2** (`02-evaluation-cvss`), **E3-ST12** (`12-jwt`) et **E3-ST19** (`19-services-web-https`) —
> n'ont **aucune** matière issue du cours. Ils restent utiles et restent au plan : le site n'est pas
> qu'un miroir du cégep. Mais ils doivent **le dire à leur lecteur**, faute de quoi ils lui font
> réviser pour un examen une matière que son enseignant n'évaluera pas — l'échec exact que la
> section 6 de `.claude/rules/contenu-pedagogique.md` existe pour empêcher.
>
> **À l'inverse**, `fondamentaux-securite-web.md` (6 📘 / 32 🧩) est le piège symétrique : la fiche
> est massivement du complément alors que le module **E3-ST1** ouvre le cours et *paraît* être la
> matière de la séance 1. C'est le module où le marquage compte le plus.

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

### Bloc D — Serveur & exploitation *(décidé le 2026-08-19 · cible : après le bloc C)*

> 🆕 **Pourquoi ce bloc existe.** La passe E3-ST0 a comparé le **plan de cours réel** de
> 420-B10-HU aux 13 modules planifiés : sur les **10 séances de matière**, **6 n'avaient aucun
> module** (séances 2, 3, 4, 5, 9, et 8 partiellement), et les **6 fiches KB correspondantes
> étaient orphelines** — aucune sous-tâche d'E3 ne les citait. L'exigence du propriétaire (« rien
> de la matière du cégep ne doit manquer du site ») n'était donc pas tenable avec les 13 modules.
> **Décision du propriétaire, 2026-08-19, à ne pas rouvrir** : on garde les 13 modules OWASP tels
> quels et on ouvre ce bloc, plutôt que de gonfler `13-durcissement-serveur` jusqu'à l'absorption.
> Motif : la carte de parcours d'E2-ST6 doit refléter le cours, et un module obèse est le contraire
> d'un jalon.
>
> **Ce bloc ne prend pas le chemin critique de mi-septembre** — il se livre après le bloc C.

| ID | Module (`NN-slug`) | Séance du cours | Fiche KB source | Simulation | Statut |
|---|---|---|---|---|---|
| E3-ST14 | `14-environnement-linux` — Gestion d'environnement infonuagique : arborescence, droits, paquets, services | séance 2 | `administration-serveur-linux.md` | non — inspection guidée | ⬜ |
| E3-ST15 | `15-communication-serveur` — Sécurité de la communication serveur : SSH, authentification par clés, durcissement de l'accès distant | séance 3 | `securisation-acces-distant-ssh.md` | **oui** : session SSH par mot de passe vs par clé | ⬜ |
| E3-ST16 | `16-automatisation-surveillance` — Tâches planifiées, journaux, surveillance et nettoyage | séance 4 | `automatisation-surveillance-cron.md` | non — lecture guidée de journaux | ⬜ |
| E3-ST17 | `17-utilisateurs-permissions` — Comptes, groupes, `sudo`, politique de mots de passe, propriétaires et bits d'accès, sensibilisation | séance 5 | `administration-serveur-linux.md` + `stockage-mots-de-passe.md` | non — tableau de permissions interactif | ⬜ |
| E3-ST18 | `18-securite-base-de-donnees` — Comptes et privilèges MySQL, moindre privilège, sauvegardes, chiffrement au repos | séance 9 | `securite-base-de-donnees.md` | non — diagramme de privilèges | ⬜ |
| E3-ST19 | `19-services-web-https` — Services web, TLS, certificats HTTPS, chaîne de confiance | séance 8 | `en-tetes-securite-http.md` + `cryptographie-appliquee.md` | **oui** : poignée de main TLS pas-à-pas | ⬜ |

> ⚠️ **Deux avertissements hérités de la passe E3-ST0, à lire avant d'écrire ces modules.**
> **(1) La séance 5 est un SQUELETTE à la source** — 23 diapositives dont dix ne portent qu'un
> titre, aucune image, et deux marqueurs `(TODO)` laissés par l'enseignant. Son plan annoncé
> (diapositive 6) fait foi comme matière d'examen ; tout le reste de `17-utilisateurs-permissions`
> est du **complément**, et doit se signaler comme tel.
> **(2) 🔴 La séance 8 n'a AUCUNE source publiée — mesuré le 2026-08-19, pas supposé.** Ni
> diaporama (cellule « Non disponible »), **ni énoncé d'exercice** : la page existe mais son contenu
> est **vide** (longueur 0 via l'API WordPress du site). `19-services-web-https` est donc un module
> de **complément intégral** — aucune matière d'examen ne peut en être tirée, et il doit le dire à
> son lecteur. Revérifier le site avant de rédiger : l'enseignant publie en cours de session.
> **(2 bis) Aucun corrigé n'est publié pour AUCUNE des 13 séances** du cours de sécurité (la colonne
> « Corrigé » est un texte sans lien partout). Contrairement au cours de PHP, dont les corrigés sont
> de vrais fichiers `.zip` — ne pas transposer l'hypothèse d'un cours à l'autre.

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

## E7 · Second cours publié — « Développement d'application en PHP » (420-4P2-HU)

> **Décision du propriétaire, 2026-08-19, à ne pas rouvrir.** Le cours de PHP suivi au cégep
> (420-4P2-HU, enseignant Alexandre Mageau-Pétrin, automne 2026) devient un **second cours publié**
> sur le site en phase 1 — et non une simple annexe de la KnowledgeBase. Motif : c'est de la
> matière d'examen au même titre que le cours de sécurité, et les exemples de code du cours de
> sécurité sont écrits en PHP.
>
> 🔴 **Le coût, dit franchement, parce qu'il a été accepté en connaissance de cause :** c'est un
> **doublement du volume de contenu** à rédiger d'ici octobre. La phase 1 passe de 13 à **19 + 8 =
> 27 modules**. L'échéance de mi-septembre (J4, bloc A du cours de sécurité) reste le chemin
> critique et **ne se négocie pas** ; E7 se livre après. Si le calendrier dérape, **c'est E7 qui
> ralentit**, module par module, jamais le bloc A.

**Processus** : identique à E3 — skill **`/lecon`** (`professeur-web` → `verificateur-theorie`) à
partir des fiches de `KnowledgeBase\web\php\`, fusionnées par la passe E3-ST0 du 2026-08-19.
Livrable : `content/cours/php/NN-slug/`.

| ID | Module (`NN-slug`) | Séance | Fiche KB source | Statut |
|---|---|---|---|---|
| E7-ST1 | `01-introduction-php` — Syntaxe de base, types, structures de contrôle, inclusion de fichiers | séance 1 | `php-fondamentaux.md` | ⬜ |
| E7-ST2 | `02-superglobales-tableaux` — Variables, superglobales, tableaux, formulaires | séance 2 | `php-formulaires-superglobales.md` | ⬜ |
| E7-ST3 | `03-librairie-standard` — Fonctions de la librairie standard, fichiers, journalisation | séance 3 | `php-librairie-standard.md` + `php-fichiers-journalisation.md` | ⬜ |
| E7-ST4 | `04-poo` — Classes, héritage, interfaces, organisation d'un projet | séance 4 | `php-poo.md` + `php-organisation-projet.md` | ⬜ |
| E7-ST5 | `05-base-de-donnees-pdo` — PDO, requêtes préparées, transactions | séance 5 | `php-base-de-donnees-pdo.md` | ⬜ |
| E7-ST6 | `06-sessions-authentification` — Sessions PHP, authentification, `password_hash()` | séance 7 | `php-sessions-authentification.md` | ⬜ |
| E7-ST7 | `07-deploiement` — Déploiement d'application, hébergement, domaine, HTTPS | séance 8 | `php-deploiement.md` + `php-hebergement-domaine-https.md` | ⬜ |
| E7-ST8 | `08-laravel` — Introduction à Laravel | séance 10 | 🔴 **AUCUNE FICHE KB** | ⬜ |

> ⚠️ **Trois constats de la passe E3-ST0, à traiter AVANT de rédiger.**
> **(1) La séance 10 (Laravel) n'a ni diaporama publié ni fiche KB.** `E7-ST8` est donc **bloqué à
> la source** : il lui faut d'abord une passe d'archivage (page d'exercice + documentation Laravel
> officielle datée), sans quoi la leçon serait inventée. Ne pas le démarrer avec les sept autres.
> **(2) Ce cours est le cours-frère du cours de sécurité, et il enseigne le langage AVANT d'en
> enseigner les dangers.** Chaque module de PHP qui montre une pratique risquée (concaténation SQL,
> sortie non échappée, hachage faible, `==` sur des chaînes) doit porter un encadré ⚠️ qui pointe
> vers le module de sécurité correspondant. C'est le **pont pédagogique** entre les deux cours, et
> c'est ce qui justifie de les publier ensemble plutôt que séparément.
> **(3) `.claude/rules/security.md` s'applique intégralement** : du code PHP volontairement
> vulnérable ne vit **que** dans un bloc d'exemple marqué, jamais dans du code exécuté par le site.

**🔴 CONSÉQUENCE IMMÉDIATE SUR E2-ST6, qui n'est pas encore écrite — la traiter là-bas, pas ici.**
La page sommaire et la carte de parcours ont été conçues pour **un** cours de 13 modules
(`/cours/securite-web`). Avec deux cours, il faut un **niveau au-dessus** : un index des cours, et
une progression indexée **par cours** dans `core/progression/`, pas une progression globale à plat.
C'est un changement de **modèle de données de la progression**, pas un ajout d'écran — et il coûte
beaucoup moins cher maintenant, avant qu'E2-ST6 existe, qu'après. La règle d'architecture d'E2-ST6
tient inchangée : **aucune feature n'importe une autre feature**.

**Gates** : identiques à E3 (G-lecon, G-build, G-axe sur la page prerendue) ; déploiement dès le
gate vert, un module = une PR = une mise en ligne.

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
