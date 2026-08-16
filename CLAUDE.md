# CLAUDE.md

Guide de Claude Code pour ce dépôt. > Langue du projet : **français** (code commenté, commits, contenu). Match it.

## Projet

**Dr. Je-Sais-Tout** (`Dr.JeSaisTout-WebApp`) — site d'apprentissage web. **Phase 1 (août–octobre
2026)** : cours public « Sécurité des applications web » (13 modules) + page d'accueil. Pas de
comptes, pas de backend actif en phase 1. Vision long terme (multi-sujets, tutorat) :
[`docs/vision.md`](docs/vision.md).

> ## ⏭️ REPRISE — état au 2026-08-16, fin de session
>
> **E0 CLOS · E1 CLOSE EN ENTIER · E2-ST1 CLOSE** — le **moteur de contenu tourne**. `content/` est
> validé (Ajv + règles hors schéma), compilé en AST typé (Markdown → HTML, Shiki précompilé, encadrés),
> ses diagrammes Mermaid sont rendus au build et **déshabillés par un analyseur à liste blanche**, et
> il en sort un manifeste de routes + une carte d'imports paresseux. `content:build` précède `ng build`
> **et** `ng test` (crochets + étape CI avant G-lint dans les deux workflows).
> **256 tests / 19 fichiers · 11 e2e · axe 258 vérifications, 0 violation · `npm audit --omit=dev` 0.**
> Le **jalon J2 est atteint neuf jours avant son échéance**.
>
> **Le geste suivant : E2-ST2 — page leçon & routage** (tranché par le propriétaire le 2026-08-16 ;
> [`docs/agile/backlog-phase-1.md`](docs/agile/backlog-phase-1.md) §E2-ST2). Le backlog dit déjà
> *quoi, où, avec quels gates* : **pas de `solution-architect` ni de `devils-advocate`** ici (barème
> `.claude/README.md` §6a) — on implémente.
>
> **⚠️ CE QU'E2-ST2 DOIT SAVOIR AVANT D'ÉCRIRE UNE LIGNE.**
> **(1) Le sanitizer d'Angular efface TOUT le SVG.** Mesuré, pas supposé
> (`src/sonde-sanitizer-svg.spec.ts`, gardée comme tripwire) : d'un SVG `mmdc` réaliste lié en
> `[innerHTML]`, **24 éléments → 0 et 71 attributs → 0** survivent. Un diagramme lié directement
> serait illisible ET sans `<title>`/`<desc>`. `bypassSecurityTrustHtml` est donc **inévitable**, mais
> **scopé au seul bloc `mermaid`**, avec justification nominative au point d'appel (patron de
> `HACHAGE_SCRIPT_ATTENDU`) et **revue `security-reviewer` OBLIGATOIRE avant le merge**. Ce qui rend
> ce contournement acceptable est écrit dans `tools/content-pipeline/types.d.ts` — et ce texte décrit
> désormais **ce que le code applique vraiment**, pas une intention.
> **(2) Le manifeste attend `app.routes.server.ts`.** `src/content-generated/manifeste-routes.json`
> porte exactement les slugs à prerendre et rien d'autre : aucun filtrage à faire, la leçon-témoin
> vivant **hors de `content/`**. Réintroduire `cours/securite-web/:slug` **des deux côtés**, ici en
> `RenderMode.Prerender` **avec** `getPrerenderParams()`. Sans quoi aucune leçon n'est prerendue.
> **(3) `withNoIncrementalHydration()` est toujours actif** — `@defer (hydrate …)` est inerte, le
> rejeu d'événements est perdu. Piège hérité d'E1-ST2.
> **(4) Retirer la `mentionChantier` « Chantier en cours »** de la carte le jour où la première leçon
> est publiée, sinon l'accueil ment.
>
> **❓ NŒUDS : tous tranchés le 2026-08-16, ne pas les rouvrir** (détail : §E2 du backlog). Dette
> sécurité → **avant E3-ST1**, pas avant E2-ST1 · leçon-témoin → **fixture hors de `content/`** ·
> diagrammes Mermaid → **rendus au build** (une invocation `mmdc` par leçon, cache par hachage,
> Chromium de Playwright réutilisé). **Un seul reste ouvert, et il n'appartient qu'au propriétaire :**
> marquer *False Positive* le `css:S8776` de SonarCloud (le `&` de `@mixin focus-visible`) — un
> fichier de propriétés ne sait pas taire une issue.
>
> **✅ LES CONSTATS NAVIGATEUR D'E1 SONT FAITS** (2026-08-16, sur le site déployé) — et la consigne qui
> les bloquait était **fausse par excès** : ce n'est pas le navigateur qui est banni, c'est
> l'**extension** Claude in Chrome. **Playwright, déjà installé, est la voie.** Résultats : **0**
> violation de CSP en actionnant les trois états de la bascule (avec **contrôle positif** : un script
> inline non haché injecté est bien capté) · **aucun flash** de clair sur thème sombre épinglé,
> *prouvé par capture* — les 3 images du chargement filmé sont sombres dès la première (L-025) ·
> `/404/*` **couvre bien** `/404/` (`x-robots-tag: noindex` présent) · le lien du pied de page porte un
> **soulignement** en plus de sa couleur (`link-in-text-block` tenu).
> ⚠️ *Leçon de méthode payée au passage* : la 1ʳᵉ mesure du flash a échoué **sur l'instrument** — un
> `MutationObserver` posé avant l'existence de `documentElement` levait, et le script a rapporté son
> propre plantage comme « 1 violation CSP ».
>
> **Dette à ne pas perdre**, de la plus mordante à la plus froide. **Les quatre premières forment UN
> SEUL LOT, à payer AVANT E3-ST1** (la première leçon publiée) — elles sont de la même famille :
> **🔴 S-003** (le garde-fou de CSP ne prouve pas qu'il a *tout vu* : un guillemet orphelin rend une
> balise `<script>` invisible à son motif) · **le garde-fou de `generer-config-swa.mjs` ne connaît que
> le motif ` style="`** — `style='…'` ou sans guillemets lui échappe · **la CSP servie n'est vérifiée
> que par motifs, pas structurellement** (comparer directive par directive avec
> `config/staticwebapp.config.source.json`) · **la portée du sceau d'artéfact de `deploy.yml` a été
> réduite** par la remontée de l'installation du navigateur (imposée par le pipeline de contenu) : la
> parade est un **job propre** pour `content:build`, pas un digest — aucun digest n'épingle un
> `apt-get` en root. *Ces quatre-là ont maintenant un patron de correctif DANS le dépôt :
> `rendre-mermaid.mjs` a remplacé sa liste noire par un analyseur jsdom à liste blanche — le
> transposer, pas en réinventer un.*
> Puis, plus froid : `Azure/static-web-apps-deploy@v1` est un **tag mutable** dans le job qui détient
> le jeton (SHA relevé, épinglage volontairement reporté à ce même lot) · **`.claude/rules/security.md`
> n'a pas intégré S-007/S-008** · **typage (b) 34 et (c) 35 erreurs** sur les deux gates de design · et
> le texte de l'extrait d'en-têtes de la Home est **en dur** (borné par un test qui relit
> `staticwebapp.config.source.json`).
> Détail de chacune : [`docs/agile/backlog-phase-1.md`](docs/agile/backlog-phase-1.md) §E1-ST1, §E1-ST2, §E1-ST3 et §E2.
>
> **Acquis, vérifié :** dépôt <https://github.com/DrL0ve69/Dr.JeSaisTout-WebApp> (public, `main`) ·
> ressources Azure créées (*Azure for Students*, palier **Free**) · secret
> `AZURE_STATIC_WEB_APPS_API_TOKEN` posé · workflows `Déploiement` **et** `Infra` **verts, zéro
> annotation** · ST1-A : design system 3 couches (73 primitives → 58 jetons sémantiques → 0 jeton
> composant), gate `verifier-contrastes.mjs` (33 paires, 66 mesures, plus bas 3,24:1/3,39:1) ·
> ST1-B : Fraunces + Inter en OFL auto-hébergées (196 Ko livrés, **83 Ko chargés**), gate
> `verifier-glyphes.mjs` (lecture réelle de la table `cmap`, 80 vérifications) · ST2 : `deploy.yml`
> **scindé en deux jobs** (`gates` sans secret → `publication` qui détient le jeton), artéfact
> **scellé par empreintes sha256** entre les deux, vérifications en ligne **fail-closed** et portant
> sur les **directives** CSP, pas seulement sur la présence des en-têtes — tous les gates câblés dans
> `ci.yml` **et** `deploy.yml` (L-007) · aucun `tfstate` versionné.
>
> **Pièges à ne pas repayer.** Les trois neufs d'E2-ST1 d'abord, parce qu'ils se ressemblent :
> **(A) une liste NOIRE de motifs sur un format structuré est un S-003 par construction.** Le scrub
> du SVG surveillait cinq motifs par regex ; `<a xlink:href="javascript:…">`, `<use href="https://…">`
> et `<animate attributeName="href">` passaient intacts. On **parse**, puis on confronte à une **liste
> blanche nominative** — jamais l'inverse. **(B) un contrôle positif qu'aucun runner n'exécute est une
> intention, pas un gate** : les 9 fixtures invalides du validateur étaient exactes, exécutables à la
> main… et lancées par personne, donc invisibles à toute régression (cousine de **L-019**, sur l'axe
> *câblage*). Même famille : un garde-fou qui ne vit que dans un harnais CLI que la CI n'appelle pas.
> **(C) un identifiant dérivé du hachage du CONTENU se duplique dès que le contenu se répète** — deux
> diagrammes identiques dans une leçon recevaient le même SVG, donc les mêmes `id` dans la page. Une
> clef de cache indexe une **source** ; un préfixe doit distinguer une **occurrence**.
>
> Puis (0, celui d'E1-ST3, le plus retors parce qu'il ne fait rougir
> AUCUN gate) : la feuille de l'agent utilisateur pose `margin-inline: auto` sur `<hr>` — en **item
> de grille**, une marge automatique l'emporte sur l'étirement et la largeur retombe à **zéro**. Le
> filet occupait sa place et ne peignait rien, avec un style calculé parfaitement juste. Corrigé dans
> `@mixin filet-horizontal` ; morale plus large : **un `getComputedStyle` correct ne prouve pas un
> pixel peint**, seule une capture ou une géométrie le prouve (**L-025**, cousine de L-021). Puis les
> deux d'E1-ST2 : (1) `provideClientHydration()` d'Angular 22 active par
> défaut l'**hydratation incrémentale**, qui injecte deux scripts inline que la CSP à hachages refuse —
> et ces scripts n'apparaissent **qu'avec le premier élément interactif**. D'où
> `withNoIncrementalHydration()` dans `app.config.ts` : rejeu d'événements perdu, `@defer (hydrate …)`
> inerte — **piège pour E2**. (2) `preserveWhitespaces: false` retire le nœud blanc entre deux
> `<span>` : le nom accessible se calcule **en un seul mot**, l'espace visible ne venant que du `gap`
> CSS qu'aucune API d'accessibilité ne lit (**L-024**).
>
> **⚠️ Contrainte de RÉDACTION née de ST1-B : le contenu emploie U+00A0**, jamais U+202F.
> L'espace fine insécable est **absente de Fraunces comme d'Inter**, et irrécupérable (le
> sous-ensemble maison est interdit — c'est lui qui casse `œ`, `« »`, `’` en silence). U+2009 n'est
> pas une issue : Inter la porte, Fraunces non. À reporter dans
> `.claude/rules/contenu-pedagogique.md` §3 à la première leçon. Détail :
> [`docs/design/polices.md`](docs/design/polices.md).
>
> **SonarCloud** : porte **verte**. L'analyse est **automatique** (app GitHub) — elle lit
> `.sonarcloud.properties`, et **ignore** `sonar-project.properties` ; ne pas créer ce dernier en
> croyant régler quelque chose. Un seul reliquat, côté propriétaire : marquer *False Positive* le
> bug `css:S8776` sur le `&` de `@mixin focus-visible` (faux positif prouvé en compilant ; le
> fichier de propriétés ne sait pas taire une issue).
>
> **Pièges déjà payés, à ne pas repayer.** (1) Une vérification post-déploiement doit attendre
> l'**effet**, pas le code de retour : SWA répond 200 pendant ~30-60 s *avant* d'appliquer
> `staticwebapp.config.json`, et `curl --retry` ne rattrape rien puisque la réponse est un succès
> (lesson **L-004**). (2) Un run « vert » ne prouve pas qu'une vérification a *tourné* — c'est le
> **journal** qui fait foi. (3) `public/**` est copié sans empreinte de contenu alors que les
> `.js` sont servis `immutable` un an — d'où le choix ST1-C d'un script inline haché plutôt qu'un
> fichier externe pour l'anti-flash de thème, et d'où les **noms de polices versionnés** de ST1-B.
> (4) Un outil d'analyse a raison **et** tort dans le même run : sur la PR #1, la duplication et le
> « bug » étaient deux faux positifs ; sur la PR #2, les cinq bugs signalés étaient réels. On
> vérifie chaque constat, on n'accepte ni ne rejette le lot en bloc. (5) `.yml`/`.json` sont en
> **CRLF** sur ce poste : un `replace()` sur un littéral multi-ligne en `\n` ne mute rien, et une
> regex ancrée `$` en multiligne s'ancre **après** le `\r` (**L-015**).
>
> Spikes tranchés : addendums §9 de
> [`docs/architecture/stack-et-architecture.md`](docs/architecture/stack-et-architecture.md).
> Le plan fait foi : [`docs/agile/backlog-phase-1.md`](docs/agile/backlog-phase-1.md).
> Scaffold par CLI officiels (`ng new` / `dotnet new`) uniquement — jamais à la main.

## Stack (décidée — ADR complets dans `docs/architecture/stack-et-architecture.md`)

- **Frontend** : **Angular 22.1** (installé) — **zoneless** (défaut v22, aucun `zone.js`), standalone,
  signaux, OnPush, **SCSS** jetons sémantiques, `outputMode: "static"` → **toutes** les routes sont
  prerendues, site 100 % statique (pas de serveur Express : `src/server.ts` a été retiré).
  ⚠️ `optimization.styles.inlineCritical: false` est **obligatoire** — le défaut d'Angular émet un
  gestionnaire `onload` inline que la CSP stricte bloque, ce qui afficherait le site sans styles.
- **Contenu-as-code** : leçons Markdown + quiz/simulations JSON dans `content/`, validés et
  compilés au build (gabarits : [`docs/contenu/pipeline-contenu.md`](docs/contenu/pipeline-contenu.md)).
  Source de théorie : la **KnowledgeBase** (voir §KnowledgeBase ci-dessous). KB en lecture seule,
  sauf correction d'erreur avérée.
- **Backend** : .NET 10 / C# Clean Architecture allégée — **phase 2** (squelette optionnel E5,
  conventions du projet frère `2026/Templates/AbrisAutoOutaouais-WebApp`).
- **Hébergement** : Azure Static Web Apps **Free** ; headers/CSP via `staticwebapp.config.json`.
  Provisionnement en **Terraform** (`infra/`, palier Free en dur) — exécuté **manuellement par le
  propriétaire, jamais en CI** : la CI ne détient que le jeton de déploiement SWA, pas d'identifiant
  Azure à haut privilège. Voir [`infra/README.md`](infra/README.md).

## KnowledgeBase — comment y entrer (règle de méthode)

`C:\Users\phili\ProjetsPortfolio\KnowledgeBase\` — **263 fiches, 10 domaines de premier niveau**
(`web/`, `cs/`, `ai/`, `devops/`, `outils/`, `divers/`, `mobile/`, `gamedev/`, `desktop/`, plus
`_archiviste/` qui est technique). Elle ne se limite **pas** à `web/securite/`.

**Ordre obligatoire, du moins cher au plus cher :**

1. [`docs/kb-map.md`](docs/kb-map.md) — table de routage **tâche → fiches**, ~3 000 tokens. Couvre
   contenu, pédagogie, Angular/CSS/a11y, sécurité, CI-CD, architecture, phase 2 .NET, harnais
   d'agents, et la liste des **trous** (ce que la KB ne couvre pas : SWA, WCAG au critère, Vitest,
   Mermaid, Angular 22). **Toujours commencer ici.**
2. `npm run kb -- <termes>` — recherche par frontmatter/tags/description (`--full` pour le corps,
   `--any` pour un OU). Gratuit, sans clé, sans index à maintenir.
3. `KnowledgeBase/<domaine>/carte.md` — la carte du domaine donne l'ordre de lecture et les trous.
4. `KnowledgeBase/INDEX.md` — exhaustif mais **~26 000 tokens** : en dernier recours seulement.

**Si `kb-map.md` ne couvre pas le sujet traité : chercher, puis le compléter.** Un plan bâti sur le
seul dossier au nom évident est une faute constatée sur ce projet (2026-08-04) — voir la note
d'ouverture de `docs/kb-map.md`.

Ce que cette faute avait coûté, et les correctifs appliqués au plan :
[`docs/revue-plan-kb-2026-08-04.md`](docs/revue-plan-kb-2026-08-04.md). **Constats C6 (axe ≠ WCAG),
C7 (moment mémorable ; 4 modules sur 13 sans support mémorable) et C8 (prérequis réseau) restent
ouverts** — ils touchent `.claude/rules/contenu-pedagogique.md` et la définition des gates a11y.

## Commandes

**Prérequis : Node ≥ 24.15** (Angular 22 le refuse en deçà ; poste en 24.18.1 LTS).

| Commande | Rôle | Gate |
|---|---|---|
| `npm run lint` | ESLint + angular-eslint | G-lint |
| `npm test` | Vitest (runner par défaut d'Angular 22) | G-test |
| `npm run content:build` | **compile `content/`** : valide → Markdown/HTML + Mermaid → manifeste de routes + carte d'imports. **Précède** `ng build` ET `ng test` (crochets `prestart`/`pretest`) | G-content |
| `npm run build` | `content:build` + `ng build` + **génération de la config SWA** (CSP à hachages) → `dist/dr-je-sais-tout/browser` | G-build |
| `npm run config:swa` | régénère seul `staticwebapp.config.json` dans l'artéfact ; **code 1** si la sortie casse la CSP | G-build |
| `npm run typecheck:tools` | vérifie les types de `tools/**/*.mjs` + `eslint.config.js` (`checkJs`) | G-typage-outils |
| `npm run a11y:axe` | axe-core sur les pages prerendues de `dist/` | G-axe |
| `npm run e2e` | Playwright sur `dist/` servi par `npx swa start` — donc **sous la CSP réelle** | G-e2e |
| `npm start` | serveur de dev | — |
| `npm run kb -- <termes>` | recherche dans la KnowledgeBase (`--full`, `--any`, `--n N`) | — |
| `npm audit --omit=dev` | surface de production (doit rester à **0**) | G-audit |

⚠️ **`content:build` n'est pas optionnel, même avec un `content/` vide.** `src/styles.scss` fait
`@use` sur `styles/coloration-syntaxique-generee`, une feuille **gitignorée** que seul ce pipeline
produit : sur un clone frais, sans lui, c'est `npm test` qui tombe **en premier**, sur une erreur
Sass qui ne nomme pas la cause. D'où les crochets `prestart`/`pretest` et l'étape CI placée **avant
G-lint** dans `ci.yml` **et** `deploy.yml` (L-007).

⚠️ **Sur un clone frais, l'ordre est `npm ci` → `npm run e2e:install` → le reste.** Le deuxième
n'est pas réservé au gate e2e : `rendre-mermaid.mjs` impose **ce** Chromium-là à `mmdc`
(`.puppeteerrc.cjs` interdit à Puppeteer d'en télécharger un second, ~200 Mo), et la leçon-témoin du
pipeline porte deux diagrammes — donc **`npm ci && npm test` seul est ROUGE**, sur un message qui
parle de Playwright au milieu d'un test de contenu. La CI l'installe en tête des deux workflows pour
cette raison.

`npm audit` complet remonte **5 vulnérabilités, dont 4 *high*** — toutes **dev-only et
préexistantes** : `adm-zip`, `devcert` et `tmp` via `@azure/static-web-apps-cli`, `nanoid` via
`@angular/build`. Aucune n'atteint la surface livrée : **`--omit=dev` reste à 0**, et c'est lui qui
fait foi (mesure du 2026-08-16 ; l'ancienne note « 3 moderate via le SDK MCP d'@angular/cli » était
périmée). Reste à venir : `dotnet build`/`dotnet test` (**phase 2**).

## Règles dures (rappelées automatiquement par les hooks)

- **Zéro dépense** — gratuit ET sans clé ; seul le crédit étudiant Azure (~120 $ CA) est permis :
  `.claude/rules/budget-free-tier.md`.
- **Budget de contexte par sous-agent** : viser de finir sous ~120k ; 150k alerte / 200k toléré /
  250k jamais ; un agent = UN livrable ; boucle séquentielle par défaut :
  `.claude/rules/agent-context-budget.md`.
- **Accessibilité** : WCAG 2.2 AA, zéro violation AXE — barre dure.
- **Sécurité** : le site **enseigne** la sécurité web, il doit exemplifier ce qu'il prêche (CSP
  stricte, headers, `npm audit` vert ; code vulnérable UNIQUEMENT en blocs d'exemple marqués) :
  `.claude/rules/security.md`.
- **Qualité pédagogique** : chaque concept = théorie + exemple simple ET complexe + analogie bornée
  + support visuel ; jamais de fait non sourcé : `.claude/rules/contenu-pedagogique.md`.
- **Design anti-AI-slop** : direction « Carnet de laboratoire » + garde-fous G1–G9 :
  `docs/design/direction-visuelle.md`.

## Système d'agents (guide complet : `.claude/README.md`)

Trois boucles, coordonnées par le **fil principal** (les sous-agents ne s'appellent pas entre eux) :

1. **Livraison** (`/feature-cycle`) : `solution-architect` (fable/medium) → `devils-advocate`
   (conditionnel, opus) → `feature-developer` (opus) → `code-reviewer` (opus, read-only) →
   `mentor` (sonnet). Plomberie git/PR/docs → `git-ops` (sonnet).
2. **Contenu** (`/lecon <module>`) : `professeur-web` (opus) écrit UNE leçon depuis les fiches KB
   pointées par le backlog → `verificateur-theorie` (opus, adversarial, peut corriger la KB si
   erreur certaine) → correctifs par agent **frais**. `content/**` appartient à cette boucle, pas
   à feature-cycle.
3. **Sécurité** (`/security-audit`) : `security-auditor` → `security-reviewer` sur tout diff
   sensible → `security-mentor` (leçons S-0xx).

Principes non négociables : brief = **pointeur de section** du backlog, jamais l'epic entier ;
correctifs de revue → agent frais (jamais `SendMessage` à un agent saturé) ; gates lourds → agent
de vérification jetable ; `.claude/lessons/lessons-learned.md` injecté à chaque session par le
hook `SessionStart`.

**À quelle échelle convoquer qui** (règle du propriétaire, 2026-08-04 — barème complet dans
[`.claude/README.md`](.claude/README.md) §6a) : `solution-architect` et surtout `devils-advocate`
sont pour un **début d'epic** ou une **grosse tâche** (recherche à faire, large surface, enjeux
importants, décision peu réversible). **Toute sous-tâche ne les mérite pas** : si le backlog dit
déjà *quoi, où, avec quels gates*, le plan existe — on implémente. Dans l'autre sens, ne pas
déléguer ce que le fil principal fait sans se saturer : un sous-agent repart d'un cache froid et
son rapport doit être revérifié. Restent toujours rentables : le **volumineux** et le **regard neuf
indépendant** (`code-reviewer`, `security-reviewer` sur un diff).

## Après chaque tâche

Mettre à jour le statut (⬜→✅) dans `docs/agile/backlog-phase-1.md` (via `git-ops`). Après chaque
epic : passe d'entretien du harnais (`.claude/README.md` §10).
