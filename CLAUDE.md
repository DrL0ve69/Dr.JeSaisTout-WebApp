# CLAUDE.md

Guide de Claude Code pour ce dépôt. > Langue du projet : **français** (code commenté, commits, contenu). Match it.

## Projet

**Dr. Je-Sais-Tout** (`Dr.JeSaisTout-WebApp`) — site d'apprentissage web. **Phase 1 (août–octobre
2026)** : cours public « Sécurité des applications web » (13 modules) + page d'accueil. Pas de
comptes, pas de backend actif en phase 1. Vision long terme (multi-sujets, tutorat) :
[`docs/vision.md`](docs/vision.md).

> ## ⏭️ REPRISE — état au 2026-08-15, fin de session
>
> **E0 CLOS. E1-ST1 CLOSE (ST1-A à ST1-E ✅). E1-ST2 CLOSE** — coquille du site, en-tête,
> **bascule de thème visible**, pied de page, 404 réelle, lien d'évitement, landmarks, gestion du
> focus au changement de route ; **plus deux gates neufs** : G-axe (`tools/a11y/verifier-axe.mjs`)
> et **G-e2e** (Playwright servant `dist/` par `npx swa start`, donc **sous la CSP à hachages
> réellement générée**). **170 tests / 12 fichiers · 11 tests e2e · axe 258 vérifications,
> 0 violation.** Les PR **#6** et **#7** sont **fusionnées** — plus rien n'attend de ce côté.
>
> **Le geste suivant : E1-ST3 — la Home « carnet de laboratoire »**
> ([`docs/agile/backlog-phase-1.md`](docs/agile/backlog-phase-1.md) §E1-ST3, ligne 567). Sa
> particularité tient en une phrase : **l'exploration visuelle précède l'implémentation**, et le
> backlog exige **plusieurs directions franchement différentes avant de converger** — pas des
> variantes de la première (constat C1 : le skill `frontend-design` qu'invoquait le plan d'origine
> **n'existe pas**, ne pas le chercher). Fiches à lire : `web/frontend/principes-design-visuel.md`
> et `ai/agents/claude-code/design-ui.md`.
>
> **⚠️ DEUX CONSTATS N'ATTENDENT QUE TOI, et personne d'autre ne peut les produire** (l'outil
> navigateur est banni sur ce projet). Sur <https://salmon-sky-0a730780f.7.azurestaticapps.net>,
> **après le déploiement d'E1-ST2** — les refaire même si tu les avais faits en août : la CSP a
> changé avec le premier élément interactif (S-005), un constat d'avant ST2 ne vaut plus. (1) **zéro
> violation CSP en console**, en **actionnant la bascule de thème** ; (2) **thème sombre épinglé sans
> flash** (`localStorage.setItem('drjst-theme','sombre')` puis rechargement). S'y ajoute un troisième,
> moins coûteux : (3) le motif SWA `/404/*` couvre-t-il **`/404/` lui-même** ? (dette (b) d'E1-ST2).
>
> **Dette à ne pas perdre**, de la plus mordante à la plus froide :
> **🔴 S-003** — le garde-fou de CSP ne prouve pas qu'il a *tout vu* (un guillemet orphelin rend une
> balise `<script>` invisible à son motif ; **préexistant**, impact borné, parade connue — et devenue
> **moins chère** : `verifier-axe.mjs` démontre le patron « analyseur réel plutôt que regex », jsdom
> est déjà là) · **la CSP servie n'est vérifiée que par motifs, pas structurellement** (une CSP
> permissive d'une autre forme que les trois refusées passerait ; parade : comparaison directive par
> directive avec `config/staticwebapp.config.source.json`) — *c'est le constat le plus proche de ce
> que le site enseigne, à traiter avant la première leçon publiée* · **`.claude/rules/security.md`
> n'a pas intégré S-007/S-008** (§1 devrait exiger le fail-closed d'une vérification
> post-déploiement, §3 la séparation gate-à-binaire-tiers / job-détenant-le-jeton **plus** le
> scellement d'artéfact) · `Azure/static-web-apps-deploy@v1` est un **tag mutable** dans le job qui
> détient le jeton · **typage (b) 34 et (c) 35 erreurs** sur les deux gates de design.
> Détail de chacune : [`docs/agile/backlog-phase-1.md`](docs/agile/backlog-phase-1.md) §E1-ST1 et §E1-ST2.
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
> **Deux pièges d'E1-ST2 à ne pas repayer.** (1) `provideClientHydration()` d'Angular 22 active par
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
| `npm run build` | `ng build` + **génération de la config SWA** (CSP à hachages) → `dist/dr-je-sais-tout/browser` | G-build |
| `npm run config:swa` | régénère seul `staticwebapp.config.json` dans l'artéfact ; **code 1** si la sortie casse la CSP | G-build |
| `npm run typecheck:tools` | vérifie les types de `tools/**/*.mjs` + `eslint.config.js` (`checkJs`) | G-typage-outils |
| `npm start` | serveur de dev | — |
| `npm run kb -- <termes>` | recherche dans la KnowledgeBase (`--full`, `--any`, `--n N`) | — |
| `npm audit --omit=dev` | surface de production (doit rester à **0**) | G-audit |

`npm audit` complet remonte 3 vulnérabilités **moderate dev-only** (SDK MCP tiré par `@angular/cli`) ;
leur « correctif » downgraderait la CLI en v21 — refusé. C'est `--omit=dev` qui fait foi.
Reste à venir : `content:build` (compilation de `content/`, **E2**), axe (**E1**), `dotnet build`/`dotnet test` (**phase 2**).

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
