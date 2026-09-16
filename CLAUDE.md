# CLAUDE.md

**Tri éditorial — relu le 2026-09-13.** Ce qui reste ici est **ce qui contraint encore du travail à
venir** : décisions ouvertes, pièges actifs, dette nommée. Le récit clos (clôtures de lots, incidents
résolus, chiffres de gates datés) vit dans [`docs/agile/backlog-phase-1.md`](docs/agile/backlog-phase-1.md),
dans les deux documents de reprise, et — pour ce que ce fichier portait jusqu’au 2026-09-13 — dans
[`docs/agile/journal-reprises-claude-md.md`](docs/agile/journal-reprises-claude-md.md). Rien n’a été
supprimé. Les commentaires HTML de bloc, eux, sont **retirés avant l’injection** de ce fichier dans
le contexte de Claude, mais restent lisibles au `Read`.

Guide de Claude Code pour ce dépôt. > Langue du projet : **français** (code commenté, commits, contenu). Match it.

## Projet

**Dr. Je-Sais-Tout** (`Dr.JeSaisTout-WebApp`) — site d'apprentissage web. **Phase 1 (août–octobre
2026)** : cours public « Sécurité des applications web » (13 modules) + page d'accueil. Pas de
comptes, pas de backend actif en phase 1. Vision long terme (multi-sujets, tutorat) :
[`docs/vision.md`](docs/vision.md).


## ⏭️ Où en est le travail — des POINTEURS, jamais le récit

> 🔴 **Ce fichier est payé par CHAQUE agent de CHAQUE session.** Mesuré le 2026-09-13 : il était
> monté à **19 720 tokens injectés** (968 lignes), contre 8 407 le 2026-08-20 — la croissance venait
> entièrement des blocs de reprise qui accumulaient une clôture de lot par lot. Ils sont archivés
> **verbatim** dans [`docs/agile/journal-reprises-claude-md.md`](docs/agile/journal-reprises-claude-md.md) ;
> rien n'a été perdu. **La règle qui en sort : un état d'avancement s'écrit dans son document de
> reprise, et `CLAUDE.md` n'en porte qu'une ligne.** La doc officielle vise « sous 200 lignes », et
> précise que plus long ne coûte pas seulement du contexte : *ça réduit l'obéissance*.

| Chantier | État | Où tout est écrit — **le lire AVANT d'y toucher** |
|---|---|---|
| 🔴 **Cours PHP, format « En bref »** — PRIORITAIRE | ✅ **PHP-7 livré** (2026-09-16) — séances 1 à 5 et 7 en ligne en `statut: verifiee`. Le geste suivant est **PHP-8** (séance 8, déploiement), dont le terrain n'est PAS posé. | [`docs/agile/reprise-php-en-bref.md`](docs/agile/reprise-php-en-bref.md) — lire sa DERNIÈRE section, puis son §6 |
| Refonte « leçons actionnables » (sécurité) | **différée**, compteur `5/9` | [`docs/agile/reprise-refonte-lecons.md`](docs/agile/reprise-refonte-lecons.md) |
| Contenu du cours de sécurité | 10 leçons en ligne ; E3-ST17 (séance 5) reste le geste suivant, **hors chemin critique** | [`docs/agile/backlog-phase-1.md`](docs/agile/backlog-phase-1.md) |
| Plan d'ensemble | E0, E1, E2, E6 **clos en entier** | le backlog fait foi |

**Dette nommée et non corrigée**, une ligne chacune — le détail est au backlog :
en-têtes globaux autres que la CSP vérifiés par **présence seule** · `publication` ne revérifie pas
le sceau après `download-artifact` · 7 des 14 hachages `style-src` n'ont **aucun** énumérateur live ·
les blocs d'en-tête HTTP des leçons 08 et 09 sont **à réétiqueter `text`** (le remède existe depuis
le 2026-09-14 : neuf langages, dont `text` pour les SORTIES de programme — il reste à l'appliquer) ·
les leçons 03, 04 et 05 portent encore des étiquettes de langage **mensongères** ·
le pipeline **ne rend pas le code en ligne dans un TITRE** ni dans un `libelle` de volet ·
`src/format-actionnable.spec.ts:29` fixe `CORPUS` sur `securite-web` en dur, ce qui **ferme le gate
du format actionnable au cours de PHP** (lot PHP-F) · **G-e2e a un rouge REPRODUCTIBLE en suite
complète et vert en isolation** — `defileurs-clavier.spec.ts:502`, lecture de géométrie non
réessayée avant chargement des polices (détail et parade : L-057, durcissement du 2026-09-14).

## 🔵 Décisions tranchées — NE PAS LES ROUVRIR

**Direction visuelle « Moniteur ambre »** (2026-08-17, détail : [`docs/design/direction-visuelle.md`](docs/design/direction-visuelle.md) §0 et §4).
La structure produit de boot.dev habillée en rétro-arcade + Matrix. « Carnet de laboratoire » est
**mort** (papier ivoire, Fraunces, marginalia, tampons : vocabulaire abandonné).
🔴 **La couleur de marque est l'AMBRE `#FFB454`, PAS le vert** — le vert est déjà pris, il veut dire
« corrigé », et le rouge veut dire « vulnérable ». *Matrix* passe par le **motif**, jamais par la
teinte. **Thème sombre seul en phase 1** (le clair est un livrable d'E4-ST1). Identité
**typographique** : aucun avatar dessiné, « Dr. Je-Sais-Tout » est l'opérateur derrière la console.

🔴 **Règle d'architecture, bloquante en revue : aucune feature n'importe une autre feature.**
`cours/sommaire` lit la progression que `cours/quiz` écrit **via `core/progression/`**, jamais par
import direct.

**Périmètre « jeu », restreint** : on prend la **carte de parcours** et la **maîtrise** (quiz réussi,
jamais le temps passé) ; on **refuse** série quotidienne, ligues, classements, monnaie et boutique.

**Format des leçons « actionnables »** (2026-08-31, contrat : [`docs/design/refonte-lecons-actionnables.md`](docs/design/refonte-lecons-actionnables.md)) :
D-A conteneur `:::: marche-a-suivre` · D-B l'attribut de diapos sur le **titre lui-même** ·
D-C onglets `:::: methodes` en **CSS pur** (radios), zéro JavaScript · D-D le gate se durcit module
par module, avec compteur.
⚠️ **La clause de rédaction de D-C a été enfreinte à trois conteneurs sur quatre.** Un volet masqué
ne doit **jamais** contenir le seul exemplaire d'un fait. La parade qui marche est d'imposer
**l'ordre d'écriture** : la prose visible d'abord, avec tout ce qui doit être trouvable au `Ctrl+F` ;
les volets ne gardent que la suite de gestes.

**Cours de PHP** (2026-09-10/13, détail au §2 du document de reprise) : **D-PHP-1** — l'écart entre
la voie du cours et la bonne pratique moderne s'écrit avec `{voie="cours"}` / `{voie="moderne"}` sur
l'étape quand il tient en **une ou quelques lignes**, et avec `:::: methodes` quand c'est **toute une
démarche** qui diverge · **D-PHP-2** la plomberie avant le contenu · **D-PHP-3** l'environnement de
référence est **WAMP** (version « Admin », vérifiée présente au Cégep ; XAMPP y est interdit).
🔴 **Aucun exemple concret ne s'invente** : les chemins du poste **P-2, P-4, P-5, P-6, P-7** et le
**P-8** (port du service MariaDB + identifiants) ne sont pas fournis, tout exemple qui en dépend
porte `à-vérifier:`, et un module PHP reste donc `statut: verifiee`.

**Rendu du code** : pas de sélecteur de langage, pas de repliage — les `exemples` d'une `comparaison`
sont des **vulnérabilités distinctes**, des onglets « de langage » cacheraient un exemple entier
derrière une étiquette mensongère. Numérotation des figures **continue** sur toute la page.

## ⚠️ Pièges ACTIFS — ce qui mord encore

> Ceux qui ont une entrée `L-0xx` / `S-0xx` sont détaillés dans le corpus de leçons : passer par
> **`.claude/lessons/INDEX.md`**, qui porte la **plage de lignes** de chaque entrée, et ouvrir 2-4
> entrées par `Read(fichier, offset, limit)`. **Ne jamais ouvrir un corpus en entier.**

**Contenu et rédaction**
- **U+00A0 seulement, jamais U+202F ni U+2009** — l'espace fine insécable est absente des polices.
- **U+26A0 (`⚠`), 📘 et 🧩 sont des marqueurs RÉSERVÉS** : interdits en prose de leçon, hors bloc de
  code (`valider.mjs` §8). Les employer comme simple signe d'attention fait rougir G-content.
- **`{seance="N"}` n'est PAS `{hors-cours}`.** `{hors-cours}` répond à « aucune diapositive des
  extraits », jamais d'un seul déck. Promettre à tort qu'un point est hors cours fait choisir à
  l'étudiant ce qu'il ne révise pas — c'est le pire des deux échecs symétriques.
- **Une cartographie se mesure dans les DEUX sens** : chaque renvoi est-il juste, **et** chaque
  diapositive du déck est-elle atteignable ? Un titre muet fait rougir le gate ; une diapositive
  orpheline ne fait rougir personne.
- **Les exercices d'une séance y vont TOUS**, reformulés, référencés depuis
  `content/cours/<sujet>/exercices.json`, au fil du texte. La **source d'autorité est le site de
  l'enseignant**, jamais la copie locale.
- **Un extrait de `extraits/` peut être périmé sans que rien ne rougisse** (dossier gitignoré) :
  réextraire avant de citer une diapositive. **Aucun outil d'agent ne lit un `.pptx`**, et `WebFetch`
  **hallucine** plutôt que d'échouer — une hallucination qui confirme ce qu'on cherche est le pire
  mode d'échec d'une vérification.
- **Le mode d'échec d'une leçon d'admin système est le danger SURÉVALUÉ, pas l'omission** : une
  menace exagérée s'auto-détruit.

**Pipeline et gates**
- **`content:build` n'est pas optionnel, même avec un `content/` vide** — `src/styles.scss` fait
  `@use` sur une feuille gitignorée que seul ce pipeline produit.
- **G-contraste est un gate de CONTENU déguisé en gate de design** (L-080) : une construction
  syntaxique inédite dans un bloc de code fait naître des classes, donc des propriétés neuves.
- **La bascule `verifiee` → `publiee` n'est pas une formalité** : une leçon non publiée n'est pas
  prerendue, donc G-axe, G-e2e et le compte de hachages CSP ne mesurent **rien** sur elle. Publier,
  **puis** relancer les gates, et attendre qu'ils rougissent avant de croire la leçon finie.
- **Publier DÉPLACE la cible des specs e2e découverts, en silence.** `ROUTE_LECON_QUIZ` /
  `ROUTE_LECON_SIMULATION` prennent la **première** page prerendue portant le marqueur, en ordre
  alphabétique trié. Devant un littéral épinglé qui rougit : *« quelle page mesure-t-il
  maintenant ? »*, jamais *« quel chiffre y mettre ? »*.
- **`MODULES_PUBLIES` (`src/app/features/home/accueil.ts`) mord à chaque publication**, et c'est voulu.
- **Les fins de ligne du dépôt sont MIXTES** (L-015) : un remplacement de littéral multi-ligne écrit
  en `\n` peut ne mordre **nulle part**, sans erreur. Toute mutation de mesure doit **imprimer la
  preuve qu'elle a eu lieu**.
- **En local, après tout rebâtissage : arrêter le processus qui écoute le port 4280** avant `npm run e2e`
  (`reuseExistingServer` sert la CSP lue à SON démarrage — il ment dans les deux sens).
- **Une PR fusionnée ne prouve pas que la branche est vide** : `git log --oneline origin/main..<branche>`
  fait foi à la clôture d'un lot. Payé en **production** le 2026-08-27 (deux leçons en 404).

**Sécurité et déploiement**
- **CSP : `style-src` est à 14 hachages, `script-src` à ZÉRO.** Le compte est recopié à la main à
  **trois** endroits épinglés, plus deux comptes **par page** dans `e2e/simulation-sous-csp.spec.ts`.
  La liste blanche reste **NOMINATIVE**, jamais dérivée de l'artéfact (S-005). Remettre un script
  inline exige une revue `security-reviewer`.
- **`trailingSlash: "auto"`** — `"always"` redirigeait aussi les fichiers et tuait les chunks
  paresseux ; aucun gate local ne peut le voir (l'émulateur SWA ne l'implémente pas).
- **`withNoIncrementalHydration()` est actif** : `@defer (hydrate …)` est inerte, le rejeu
  d'événements est perdu, et entre la peinture prerendue et l'hydratation le DOM natif accepte une
  saisie que la première détection de changements **écrase** (L-033).
- **Le sanitizer d'Angular efface TOUT le SVG** (mesuré : 24 éléments → 0). D'où le
  `bypassSecurityTrustHtml` **scopé au seul bloc `mermaid`**. Ne pas l'élargir.
- **Sur un format structuré, on ANALYSE puis on confronte à une liste blanche NOMINATIVE** — jamais
  une liste noire, jamais une regex (S-001/S-003/S-009/S-014). Et la liste contraint la **valeur**,
  pas seulement le **nom** (S-020).
- **`npm audit --omit=dev` doit rester à 0** ; le complet remonte des vulnérabilités **dev-only**.
  ⚠️ Ce gate rougit par le **CALENDRIER**, pas par le code : un avis publié le jour même fait rougir
  toutes les PR sans une ligne changée.
- **SonarCloud** : l'analyse est automatique et lit `.sonarcloud.properties` — `sonar-project.properties`
  est **ignoré**, ne pas le créer. Un reliquat côté propriétaire : marquer *False Positive* le
  `css:S8776` sur le `&` de `@mixin focus-visible`.

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

`npm audit` complet remonte **12 vulnérabilités, dont 6 *high*** — toutes **dev-only** (mesure de la
revue de sécurité du 2026-09-10, sur le verrou d'après la montée Angular 22.1.6 ; il y en avait 17
avant). Parmi elles, `hono` 4.12.34 tiré par `@modelcontextprotocol/sdk` (SDK MCP d'`@angular/cli`) :
3 avis *moderate*, corrigés en 4.13.5 — **lot séparé à ouvrir**. Aucune n'atteint la surface livrée :
**`--omit=dev` reste à 0**, et c'est lui qui fait foi. ⚠️ **Ce gate rougit par le CALENDRIER, pas par
le code** : le 2026-09-10, trois avis Angular publiés le même jour (GHSA-p297-fm68-3q8c, et deux
*high* sur `@angular/platform-server`) ont fait rougir G-audit sur toutes les PR sans une ligne changée
— montée en PR #71. Reste à venir : `dotnet build`/`dotnet test` (**phase 2**).

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
- **Design anti-AI-slop** : direction **« Moniteur ambre »** (rétro-arcade + Matrix, sombre seul en
  phase 1) + garde-fous **G1–G11** : `docs/design/direction-visuelle.md`. La direction « Carnet de
  laboratoire » est **abandonnée depuis le 2026-08-17 et n'est plus en production depuis E6**
  (2026-08-20).

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
