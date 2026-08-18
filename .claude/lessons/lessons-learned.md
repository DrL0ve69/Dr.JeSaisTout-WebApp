# Leçons apprises — Dr. Je-Sais-Tout

> **Ce que c'est.** Le journal vivant des erreurs déjà commises sur ce dépôt, pour ne pas les répéter.
> Chaque leçon est numérotée `L-0xx` (ordre d'apparition) et suit le format :
>
> ```
> ## L-0xx · Titre court et cherchable
>
> **Symptôme.** Ce qui a été observé/cassé (concret, avec fichier:ligne si pertinent).
> **Règle.** Le geste à répéter (ou à ne plus jamais faire) pour l'éviter.
> **Réfs.** Fichiers/PR/commits concernés.
> ```
>
> Le hook `SessionStart` (`inject-context.mjs`) injecte automatiquement l'**index** (titres seulement)
> dans chaque session/sous-agent ; lire l'entrée complète d'une leçon dont la zone touche la tâche en
> cours **avant** d'y toucher. Ce fichier est distinct de `.claude/lessons/security-lessons.md`
> (`S-0xx`), réservé aux leçons de sécurité.

---

## L-001 · Le plan du projet vit dans `docs/agile/backlog-phase-1.md` — pointeur, jamais l'epic entier

**Symptôme.** Une délégation à un sous-agent qui reçoit tout un epic/backlog en brief se met à
boucler sur chaque sous-tâche dans le même contexte, et dépasse le budget de contexte par agent
(voir `.claude/rules/agent-context-budget.md`) bien avant d'avoir livré quoi que ce soit de vérifiable.

**Règle.** Le plan du projet (`docs/agile/backlog-phase-1.md` ou équivalent une fois créé) **est** le
brief — mais on ne passe à un sous-agent qu'un **pointeur de section** (ex. « §2.3 Leçon XSS-101,
lignes 40-58 »), jamais le document entier. Un agent = un livrable vérifiable, scope étroit.

**Réfs.** `.claude/rules/agent-context-budget.md` §2.

**Addendum (2026-08-08).** Le même piège existe en sens inverse : mesurer le code avant de coder un
défaut déjà consigné ne remplace pas **ouvrir son entrée de backlog**. Sur `chore/tsconfig-strict`,
mesurer `tsconfig.json` a bien trouvé le volet `strict`, mais a manqué le second volet du même
ticket (`tsconfig.app.json` portait `"types": ["node"]` en contradiction avec le commentaire de
`tsconfig.spec.json`) — rattrapé seulement par le `code-reviewer`. Un ticket porte souvent **plus
d'un volet** ; le plan est le pointeur, pas la mesure du code. Cousin de [[L-008]] : un volet
non fermé laisse un commentaire voisin menteur, que la revue suivante croira.

---

## L-002 · Toute commande destinée au propriétaire s'écrit en **PowerShell**, jamais en bash

**Symptôme.** Le 2026-08-04, `infra/README.md` proposait `cd infra && terraform init && terraform
plan`. Le poste est en **Windows PowerShell 5.1**, où `&&` n'est pas un séparateur d'instruction :
la ligne entière est une *erreur de syntaxe*, aucune des trois commandes ne s'exécute. Conséquence
en cascade : `terraform output` a ensuite tourné depuis le mauvais répertoire, sans état, et a rendu
une **chaîne vide** — que `gh secret set --body ""` aurait acceptée sans broncher, posant un secret
vide et silencieusement cassé. Deux fautes du même README dans la même session.

**Règle.** Écrire les commandes du propriétaire en PowerShell, et baliser les blocs ` ```powershell `.
Pas de `&&` (une commande par ligne, ou `;`, ou `cmd1; if ($?) { cmd2 }`) · pas de `grep`
(→ `Select-String`) · pas de `head`/`tail`/`which`/`touch`/`mkdir -p`. **Et surtout** : ne jamais
enchaîner un `$(...)` dont l'échec produirait une valeur vide acceptée en aval — vérifier
explicitement (`gh secret list`, longueur non nulle) plutôt que de supposer. Le Bash tool existe pour
*mes* scripts POSIX ; il ne dit rien du shell du propriétaire.

**Réfs.** `infra/README.md` §« Toutes les commandes ci-dessous sont en PowerShell » ;
`docs/deployment.md`.

---

## L-003 · Entrer dans la KnowledgeBase par `docs/kb-map.md`, jamais par le dossier au nom évident

**Symptôme.** Le 2026-08-04, le propriétaire a dû reprendre trois fois : la KB n'avait pas été
consultée, puis seul `web/` l'avait été, puis seul `ai/`. Le plan de phase 1 ne citait que
`web/securite/` et `web/angular/` sur **263 fiches / 10 domaines**. La revue qui a suivi a trouvé
un gate impossible à satisfaire (skill `frontend-design` inexistant, invoqué à 5 endroits), des
échelles de design jamais définies, un piège de contraste, et 4 modules sur 13 sans support
pédagogique mémorable.

**Règle.** Avant toute décision d'architecture, de design, de contenu ou d'outillage : lire
`docs/kb-map.md` (table de routage tâche → fiches, ~3k tokens), puis `npm run kb -- <termes>`, puis
la `carte.md` du domaine. `INDEX.md` (~26k tokens) en dernier recours. **Si `kb-map.md` ne couvre
pas le sujet : chercher, puis le compléter.** Les domaines `cs/`, `devops/`, `outils/` et
`divers/pedagogie/` portent sur ce projet autant que `web/`.

**Réfs.** `docs/kb-map.md` · `docs/revue-plan-kb-2026-08-04.md` · CLAUDE.md §KnowledgeBase.

---

## L-004 · Une vérification post-déploiement doit attendre l'**effet**, pas le code de retour

**Symptôme.** Premier déploiement du 2026-08-04 : `deploy.yml` **rouge alors que le site était
parfaitement en ligne**. Azure SWA sert la page (**HTTP 200**) *avant* d'avoir appliqué
`staticwebapp.config.json` — pendant ~30-60 s la réponse ne porte que `content-type` et `date`.
L'étape de vérification a lu cette réponse et déclaré les cinq en-têtes absents. Le
`curl --retry 5 --retry-all-errors` censé couvrir ça n'a **jamais** réessayé : la réponse était un
**succès**, et `--retry` ne se déclenche que sur un échec.

**Règle.** Une vérification qui suit un déploiement attend la **condition observable** qu'elle
teste (ici : la présence effective de l'en-tête `content-security-policy`), dans une boucle bornée
avec un pas explicite — jamais le seul code de retour HTTP, et jamais `--retry` quand l'état
transitoire se présente comme un succès. Corollaire : « 200 » ne veut pas dire « configuré ».

**Réfs.** `.github/workflows/deploy.yml` étape « Vérifier les en-têtes servis » ;
`docs/deployment.md` §Reste à faire.

---

## L-005 · Un run **vert** ne prouve pas qu'une vérification a **tourné**

**Symptôme.** L'étape « Vérifier les en-têtes servis » de `deploy.yml` commence par un garde-fou :
si `steps.deploiement.outputs.static_web_app_url` arrive vide, elle émet un `::warning::` et
`exit 0`. Prudent au premier run — le nom exact de la sortie de l'action Azure n'était pas
confirmé — mais ça crée un **vert qui ne vérifie rien**. Le 2026-08-04, le run `30921738380` est
passé vert : impossible de savoir, du seul statut, si les cinq en-têtes avaient été contrôlés ou si
l'étape s'était auto-ignorée. Il a fallu ouvrir le journal pour lire « Cible : https://… » et voir
que la vérification avait bien eu lieu.

**Règle.** Quand un gate contient une **porte de sortie silencieuse** (`exit 0` sur donnée
manquante, `continue-on-error`, `if:` qui peut être faux), le vert est ambigu : il faut lire le
**journal** pour clore le constat, ou faire échouer l'étape une fois la condition confirmée. Ne
jamais écrire dans un doc de suivi « workflow vert donc en-têtes vérifiés » sans avoir vu la sortie
de l'étape. Corollaire du même esprit que L-004 : on constate l'**effet**, pas le symbole.

**Réfs.** `.github/workflows/deploy.yml` étape « Vérifier les en-têtes servis » (branche
`URL non fournie`) ; `docs/agile/backlog-phase-1.md` §E0-ST4.

---

## L-006 · Les annotations jaunes d'un run se traitent, elles ne se tolèrent pas

**Symptôme.** Le premier déploiement vert portait deux annotations : `checkout@v4`/`setup-node@v4`
ciblent **Node 20, déprécié** (les runners les forçaient en Node 24 — un forçage temporaire), et
`skip_api_build` **n'existe pas** dans `Azure/static-web-apps-deploy@v1`, donc l'entrée était
**ignorée en silence**. Aucune des deux ne cassait quoi que ce soit *ce jour-là* : la première est
une panne datée d'avance, la seconde une intention qui ne faisait rien.

**Règle.** Une annotation jaune est un **échec différé** ou une **illusion de configuration** :
la traiter dans la foulée du run, jamais « plus tard ». Deux gestes concrets sur ce dépôt :
(a) épingler les actions sur une majeure qui tourne en **Node 24** (`checkout@v7`, `setup-node@v7`,
`setup-terraform@v4`) et relire les notes de version avant de monter — pas de bond à l'aveugle ;
(b) toute entrée passée à une action tierce doit figurer dans les entrées valides qu'elle déclare,
sinon elle ne fait rien tout en donnant l'impression du contraire.

**Réfs.** commit `fb86461` ; `.github/workflows/{ci,deploy,infra}.yml` ;
`docs/agile/backlog-phase-1.md` §E0-ST4 « Annotations du premier run ».

---

## L-007 · Un gate livré n'est pas un gate câblé — il lui faut son étape CI, dans le même diff, dans tous les workflows

**Symptôme.** `tools/design/verifier-contrastes.mjs` (branche `feat/e1-st1-jetons-scss`) écrit,
passant, produisant un rapport — et appelé par **rien** : ni `ci.yml`, ni `deploy.yml`, ni
`npm run build`. Il n'aurait jamais tourné sur une PR. `ci.yml` porte pourtant déjà en commentaire
« un gate vert qui ne teste rien est pire qu'un gate absent ».

**Règle.** Tout nouveau gate arrive avec son étape CI dans le **même diff** que le script, et dans
**tous** les workflows qui rejouent les gates (`ci.yml` *et* `deploy.yml` ici) — un gate câblé dans
l'un et pas l'autre laisse partir en ligne du code moins vérifié que ce qui passe en PR. Déclinaison
de [[L-005]] (« un vert n'est ambigu que si on lit le journal ») et de [[L-004]] (constater l'effet,
pas le symbole) : ici le symptôme est encore plus en amont — la vérification n'est même pas
*branchée* au workflow.

**Réfs.** `tools/design/verifier-contrastes.mjs` ; `.github/workflows/{ci,deploy}.yml` ;
branche `feat/e1-st1-jetons-scss`.

**Addendum (E2-ST1).** Le piège existe aussi en mode **atrophié** : `tools/content-pipeline/valider.mjs`
avait un mode `--fixtures` (9 dossiers volontairement invalides, chacun refusé sur SA cause précise)
correct et exécutable à la main — mais appelé par **rien** : ni test, ni script npm, ni workflow. Un
contrôle **positif** non câblé n'est pas un gate, c'est une intention (cousine de [[L-019]] sur l'axe
câblage plutôt que contenu de l'assertion). Aggravant constaté le même jour : `content/cours/securite-web`
n'existant pas encore, l'étape de validation de `content:build` validait **zéro fichier** — verte même
avec un glob cassé ou un Ajv qui ne compile plus ; et le recomptage des motifs interdits et l'unicité
des identifiants inter-diagrammes ne vivaient que dans le harnais CLI `rendre-mermaid.mjs --racine`,
que `npm run content:build` (le seul chemin qu'empruntent CI et devs) n'appelle jamais. Un gate qui
valide un dossier vide, ou dont le mode le plus strict n'est exposé qu'en CLI manuelle, n'est câblé
qu'en apparence — vérifier qu'il a **du contenu réel à mordre**, pas seulement une étape dans le
workflow. Réparé par `src/pipeline-contenu-validation.spec.ts` et le déplacement des contrôles dans
`build.mjs`.

---

## L-008 · Une contrepartie de conception qui n'existe que dans un commentaire de code ne protège rien

**Symptôme.** L'implémenteur a retiré, à raison, `--couleur-surface-creuse`/`--couleur-surface` du
seuil 3:1 de WCAG 1.4.11 (deux fonds voisins ne sont ni composant ni objet graphique). Mais la
contrepartie qui rend ce retrait sûr (« un encart est **toujours** borné par `--couleur-filet` »)
n'était écrite que dans un commentaire de `verifier-contrastes.mjs`, que zéro auteur de composant
n'ouvrira. Les deux fonds mesurent **1,11:1** : sans bordure garantie, un encart devient
indistinguable.

**Règle.** Quand on **exempte** quelque chose d'un gate, la contrepartie qui justifie l'exemption
s'inscrit là où le futur auteur la lira (ici `docs/design/direction-visuelle.md`, garde-fous G),
jamais seulement dans l'outil qui exempte.

**Réfs.** `tools/design/verifier-contrastes.mjs` ; `docs/design/direction-visuelle.md` §G7-a/G7-b ;
`docs/design/contrastes-jetons.md`.

---

## L-009 · Un artéfact généré et commité doit être reproductible octet pour octet, avec un mode `--check`

**Symptôme.** `verifier-contrastes.mjs` horodatait son rapport avec `new Date()` : diff parasite à
chaque exécution, et aucun moyen de vérifier en CI qu'un rapport commité était à jour — un rapport
périmé ne faisait échouer personne.

**Règle.** Un artéfact généré et commité doit produire la **même sortie** à deux exécutions
identiques (pas d'horodatage, pas d'aléatoire) ; le script qui le génère expose un mode `--check`
qui régénère en mémoire, compare, et sort en 1 sur divergence — c'est ce mode qui rend l'artéfact
réellement vérifiable en CI, pas sa seule présence dans le dépôt.

**Réfs.** `tools/design/verifier-contrastes.mjs` (option `--check`) ; `docs/design/contrastes-jetons.md`.

---

## L-010 · Un test de mutation doit vérifier que la mutation a frappé sa cible

**Symptôme.** Pour prouver qu'un gate mordait, une mutation a remplacé la chaîne `drjst-theme` dans
`dist/.../index.html` via `String.replace`. Le gate est resté vert et le premier réflexe a été de
soupçonner un trou dans le gate. En réalité `replace` avait frappé la **première** occurrence, dans
un **commentaire HTML**, jamais dans le script visé : la mutation n'avait jamais eu lieu, et le gate
était correct depuis le début.

**Règle.** Un test de mutation vérifie **d'abord** qu'il a bien modifié ce qu'il croit modifier
(comparer avant/après sur la zone visée, ou muter une chaîne qui n'existe QUE là) avant de juger le
gate. « Le gate n'a pas mordu » est d'abord une hypothèse sur le **test**, pas sur le gate — cousine
symétrique de [[L-005]] (« un run vert ne prouve pas qu'une vérification a tourné ») : ici un run
rouge ou vert ne dit rien tant que l'entrée du test n'est pas vérifiée.

**Réfs.** `src/init-theme.spec.ts` ; `tools/deploiement/generer-config-swa.mjs` ;
`docs/agile/backlog-phase-1.md` §E1-ST1 (ST1-C).

**Addendum (E1-ST2).** Même piège sur un fichier aux en-têtes nourris (norme de ce dépôt) : une
mutation ciblant `skip(1)` a frappé son occurrence dans le **commentaire d'en-tête** du fichier
(cité deux fois avant la ligne de code) plutôt que le code lui-même — le gate semblait ne pas
mordre alors qu'il n'avait rien à mordre. Sur ce dépôt en particulier, une mutation par regex doit
ancrer l'indentation ou une position de ligne de code, jamais la seule chaîne, précisément parce que
les en-têtes de commentaire répètent souvent les identifiants du code qui suit.

---

## L-011 · Les commentaires de `src/index.html` sont servis à chaque visiteur

**Symptôme.** La construction d'Angular **ne dépouille pas** les commentaires HTML d'`index.html`
(mesuré dans l'artéfact le 2026-08-08). Un commentaire d'explication de 1 985 octets ajouté à
`index.html` partait donc sur **chaque page** du site, ~900 o même après compression brotli — alors
qu'un commentaire équivalent dans un `.ts`, un `.scss` ou un `.mjs` ne coûte rien au visiteur (retiré
au build ou jamais livré). Après condensation : page de 7 091 → 6 179 o (brotli 2 752 → 2 332 o).

**Règle.** Dans `src/index.html`, garder le commentaire court et pointer vers le fichier non livré
qui porte le raisonnement long (ici `tools/deploiement/generer-config-swa.mjs` et
`src/init-theme.spec.ts`). Le dépôt aime les commentaires nourris — vrai partout **sauf** dans les
fichiers livrés tels quels au navigateur.

**Réfs.** `src/index.html` ; `tools/deploiement/generer-config-swa.mjs` ;
`docs/agile/backlog-phase-1.md` §E1-ST1 (ST1-C).

---

## L-012 · Un test qui importe la constante qu'il vérifie ne vérifie rien du contrat

**Symptôme.** `src/app/core/theme/theme.spec.ts` importait `CLE_THEME` et `ATTRIBUT_THEME` **depuis
le `ThemeService` qu'il teste**. Le 2026-08-08, renommer `CLE_THEME` en `'drjst-theme-v2'` (ou
`ATTRIBUT_THEME` en `'data-thème'`) laissait les **38 tests au vert**, pendant que le service écrivait
une clé que le script inline de `src/index.html` ne lit pas, et un attribut qu'aucun sélecteur de
`src/styles/_themes.scss` ne rend. La page serait restée en thème clair, sans erreur, sans test rouge.

**Règle.** Quand une valeur est un **contrat entre deux fichiers qui ne se compilent pas ensemble**
(ici : `localStorage['drjst-theme']` lie `index.html` au `ThemeService` ; `data-theme` lie le
`ThemeService` au SCSS, invisible du typage TS), le test doit comparer à **l'autre extrémité, lue
depuis sa source** (le fichier au disque, le CSS compilé) — jamais à l'import de sa propre
définition. Importer la constante ne teste que la cohérence du fichier avec lui-même : une
tautologie. Bon exemple dans ce dépôt : `src/init-theme.spec.ts` compile réellement `_themes.scss`
via `sass.compile` et compare le résultat. Chaînon entre [[L-008]] (une contrepartie qui n'existe
que dans un commentaire ne protège rien) et [[L-010]] (un test de mutation doit vérifier qu'il a
frappé sa cible) : ici, c'est la **source de vérité du test lui-même** qui doit sortir du fichier
testé.

**Réfs.** `src/app/core/theme/theme.spec.ts` (avant correctif) ; `src/init-theme.spec.ts` lignes
33-40 et 149-162 ; `docs/agile/backlog-phase-1.md` §E1-ST1 (ST1-D).

---

## L-013 · Une option de configuration absente du fichier n'est pas prouvée inactive — seule une sonde bidirectionnelle fait foi

**Symptôme.** Un constat de revue affirmait que `tsconfig.json` n'activait ni `strict`, ni
`strictNullChecks`, ni `noImplicitAny` — faux à moitié : `strict` est actif par **défaut** de
TypeScript 6.0, `strictTemplates` par défaut d'Angular 22 ; seules `noUncheckedIndexedAccess`,
`typeCheckHostBindings` et `strictStandalone` étaient réellement inactives. Piège inverse rencontré
dans le même run : le `.d.ts` d'Angular annonce `strictTemplates` « Defaults to `true` », et une
première sonde (`[hidden]="'texte'"`, une propriété DOM native qu'Angular ne type-vérifie pas)
semblait prouver le contraire — la sonde visait à côté.

**Règle.** Ni l'absence d'une option dans un fichier de config, ni sa présence documentée dans un
`.d.ts`, ne prouve son état réel : seule une **sonde bidirectionnelle** fait foi — une violation
volontaire qui échoue **avec** l'option et passe **sans elle**. Vérifier d'abord que la sonde frappe
sa cible (prolongement direct de [[L-010]]), sinon on mesure l'inertie de l'outil, pas le réglage.
Corollaire : une garantie qui ne tient qu'à un **défaut d'outil** (version du compilateur/framework)
est invisible à la lecture et peut changer sans prévenir à la montée de version majeure — la
déclarer explicitement et la tenir par un test, pas par la config.

**Réfs.** branche `chore/tsconfig-strict` ; `tsconfig.json`, `tsconfig.app.json`.

**Addendum (2026-08-08).** Même famille de piège retrouvée sur `chore/tsconfig-strict` §L-008 : la
promesse « ces deux listes ne peuvent pas diverger » vivait en commentaire dans
`tsconfig.tools.json` pour **six** options, mais `src/configuration-typescript.spec.ts` n'en
assertait que **deux** — quatre pouvaient disparaître sans rougir un test, dans le lot même où
L-008 aurait dû prévenir le geste. Corrigé en étendant l'assertion, pas en rabotant le commentaire.
Rappel : une promesse de synchronisation qui grandit (2 → 6 éléments) doit faire grandir son test
**dans le même diff**, jamais après coup.

---

## L-014 · Un gate de typage peut sortir vert en n'ayant vérifié **aucun** fichier

**Symptôme.** `tsconfig.tools.json` (nouveau, `chore/tsconfig-strict`) combinait `allowJs` +
`checkJs` + `strict`, un script `typecheck:tools` présent, câblé dans `ci.yml` **et** `deploy.yml` —
tout vert. Mais rien n'assertait la liste de fichiers réellement couverte : vider ou repointer le
`include` du tsconfig laisse `tsc` sortir en code 0 en n'ayant typé **zéro fichier**, y compris
`tools/deploiement/generer-config-swa.mjs` qui génère la CSP du site. Trouvé par une revue à
contexte frais, pas par le gate lui-même.

**Règle.** Un gate de typage/lint neuf doit s'accompagner d'une assertion sur ses `rootNames`
réels (ex. `readConfiguration(...).fileNames` de `typescript`), épinglant nommément le(s) fichier(s)
qui motivent le gate — pas seulement un code de sortie 0. Prolongement de [[L-005]] (un run vert ne
prouve pas qu'une vérification a tourné) sur un axe neuf : ici la vérification **tournait bel et
bien**, elle n'avait simplement rien à mordre.

**Réfs.** `tsconfig.tools.json` ; `tools/deploiement/generer-config-swa.mjs` ;
`src/configuration-typescript.spec.ts` ; branche `chore/tsconfig-strict`.

---

## L-015 · Sur ce poste, `.yml`/`.json` sont en CRLF — ça casse une mutation en écriture ET une regex ancrée en lecture

**Symptôme.** Sur ce poste Windows, `ci.yml` mesure 84 CRLF / 0 LF, alors que d'autres fichiers du
dépôt sont en LF — incohérence déjà repayée une fois côté hachage CSP (`index.csr.html` livré en
CRLF, `index.html` en LF, cf. [[L-010]]). Deux nouvelles variantes rencontrées dans le même lot :
(1) *en écriture* — un test de mutation faisait un `String.replace()` avec un littéral `\n` sur un
fichier en CRLF : le remplacement ne matchait rien, la mutation n'avait jamais lieu, et le gate
semblait à tort ne pas mordre (rattrapé par le garde-fou de [[L-010]] qui vérifie que la mutation a
frappé sa cible) ; (2) *en lecture* — une regex ancrée `$` en mode multiligne s'ancre **avant** le
`\r`, pas après, et échouait à matcher une fin de ligne réelle du fichier.

**Règle.** Sur tout script qui écrit dans ou lit une fin de ligne d'un `.yml`/`.json`/`.html` de ce
dépôt : ne jamais supposer LF. Muter/matcher avec `\r?\n` ou `\r?$`, ou normaliser
(`.replace(/\r\n/g, '\n')`) avant comparaison — et vérifier le résultat après coup (cf. [[L-010]]).
Rentable large : touche tout futur test de mutation, tout gate qui apparie un fichier de
configuration, et tout générateur qui hache du contenu texte.

**Réfs.** `.github/workflows/ci.yml` ; `tools/deploiement/generer-config-swa.mjs` ;
`src/init-theme.spec.ts` ; branche `chore/tsconfig-strict`.

---

## L-016 · Un commentaire qui cite un fichier, une section ou une checklist doit pointer vers du réel — sinon c'est [[L-008]] avec une signature en plus

**Symptôme.** Sur E1-ST2 (layout & navigation), le même motif est apparu **cinq fois dans un seul
diff** : `gestion-focus-route.ts` invoquait « `gestion-focus-route.spec.ts` vérifie l'absence
d'appel côté serveur … sans cette assertion les tests resteraient verts gardes retirées (L-005) »
— le spec **n'existait pas**, et le service (cœur WCAG 2.4.3 du lot) n'avait aucun test ;
`app.routes.ts`/`app.spec.ts` renvoyaient à `app.routes.spec.ts`, **inexistant** ; `app.routes.server.ts`
renvoyait à `docs/deployment.md` §« La 404 est un vrai fichier », **section inexistante** ; le gate
axe se déchargeait ×4 sur « la checklist manuelle d'E1-ST2 », **inexistante**, et ×4 sur « Playwright,
inscrit en dette », **inscrit nulle part**. Chaque citation empruntait la crédibilité d'un vrai
mécanisme (jusqu'à citer L-005 elle-même) sans le fournir.

**Règle.** Tout chemin de fichier, section de doc, ou nom de test cité dans un commentaire **doit
exister au moment du commit** — vérifier avant d'écrire la phrase, pas après. C'est la généralisation
de [[L-008]] (une contrepartie qui n'existe qu'en commentaire ne protège rien) : ici la contrepartie
se fait passer pour vérifiable en nommant une cible précise, ce qui la rend *plus* dangereuse, pas
moins. Signal pour `.claude/rules/` : ce geste est mécanisable (grep des chemins cités dans les
commentaires vs présence au disque) et mériterait un hook ou un gate dédié plutôt que de rester une
vigilance de revue.

**Réfs.** `src/app/core/layout/gestion-focus-route.ts` ; `src/app/app.routes.ts` ; `src/app/app.spec.ts` ;
`src/app/app.routes.server.ts` ; `tools/a11y/verifier-axe.mjs` ; branche `feat/e1-st2-layout-navigation`.

**Addendum (E2-ST1).** Variante plus insidieuse qu'une citation fausse : un commentaire qui **promet
plus que le code n'applique**. Un commentaire de `types.d.ts` citait le nettoyage SVG de
`rendre-mermaid.mjs` comme justification écrite d'un futur `bypassSecurityTrustHtml` (donc du retrait
total du sanitizer d'Angular) — alors que ce nettoyage n'était qu'une liste **noire** de cinq motifs
regex, contournable (probé : `xlink:href="javascript:…"`, `<use href="https://evil…">`,
`<animate>`/`<set>` sur `href`/`onload`). Le texte décrivait une garantie que le code ne tenait pas.
**Règle.** Un commentaire qui sert de justification écrite à un contournement de garde-fou (sanitizer,
CSP, validation) doit décrire **exactement** ce que le code vérifie, jamais son intention — sinon un
futur lecteur hérite d'une confiance non gagnée. Le versant sécurité (liste noire vs liste blanche
sur un format structuré) est traité dans `security-lessons.md`.

**Réfs.** `tools/content-pipeline/rendre-mermaid.mjs` ; `types.d.ts` ; branche `feat/e2-st1-pipeline-contenu`.

---

## L-017 · Un octet NUL dans un fichier source le rend « binaire » pour grep/ripgrep, qui le sautent EN SILENCE

**Symptôme.** `tools/a11y/verifier-axe.mjs` (757 lignes, exécuté en CI **et** au déploiement)
contenait deux U+0000 bruts dans une clé de tri. Conséquence : le fichier sortait du balayage
textuel exigé par `.claude/rules/security.md` §2 (recherche de secrets, gitleaks) — et le symptôme
était trompeur, `grep`/ripgrep répondant « binary file … matches » au lieu d'afficher la ligne
cherchée, ce qui invite à conclure « rien trouvé » plutôt que « fichier ignoré ». Git le voyait
encore comme du texte (le NUL était au-delà de sa fenêtre de détection de 8 000 octets), donc les
diffs de PR restaient lisibles et ne signalaient rien.

**Règle.** Un « binary file matches » ou l'absence totale de correspondance sur un fichier `.mjs`/`.ts`
qu'on sait volumineux mérite un second regard (`Select-String -Encoding` explicite, ou inspection
hexadécimale) avant de conclure à une absence de secret. Cousine de [[L-005]] sur un axe matériel :
la vérification tournait, elle ne *voyait* simplement pas le fichier — un octet NUL est aussi
invisible à `grep` qu'une porte de sortie silencieuse l'est à un statut de CI.

**Réfs.** `tools/a11y/verifier-axe.mjs` ; `.claude/rules/security.md` §2 ; branche `feat/e1-st2-layout-navigation`.

---

## L-018 · Une assertion de « non-lecture » (ex. aucun paramètre d'URL lu) ne prouve que ce que le gabarit rend, pas ce que le code lit

**Symptôme.** `page-a-venir.spec.ts` affirmait « le composant ne lit AUCUN paramètre d'URL ». Une
mutation ajoutant un `computed()` qui lisait `paramMap` **sans l'afficher** dans le gabarit laissait
le test **vert** ; il n'est devenu rouge qu'une fois la valeur effectivement rendue à l'écran. Le
périmètre réel de l'assertion était donc « la valeur atteint le rendu », pas « le fichier ne
référence pas `paramMap` » — la lenteur du signal vient de la **paresse d'Angular** (un `computed()`
non consommé n'est jamais évalué), pas d'un test complaisant.

**Règle.** Nommer ce type d'assertion pour ce qu'il vérifie réellement (« rien de dérivé de l'URL
n'apparaît dans le rendu »), pas pour une propriété plus large qu'il ne couvre pas. Si l'intention
est vraiment « aucune lecture de `paramMap` dans le code », c'est une recherche statique
(grep/AST), pas un test de rendu. Prolonge [[L-012]] (le test doit lire le contrat à sa vraie
source) sur un piège inverse : ici la source existe bien dans le composant, mais un signal Angular
non consommé ne se propage jamais jusqu'au point que le test observe.

**Réfs.** `src/app/**/page-a-venir.spec.ts` ; branche `feat/e1-st2-layout-navigation`.

---

## L-019 · Une sonde qui COLLECTE des événements a besoin d'un contrôle POSITIF, pas seulement d'un tableau vide

**Symptôme.** Le spec censé prouver « zéro violation CSP » accumulait les événements
`securitypolicyviolation` dans un tableau et exigeait qu'il soit vide. Si l'abonnement à
l'événement n'était jamais posé (mauvais objet, mauvaise page, écouteur retiré trop tôt), le
tableau restait vide **pour la mauvaise raison**, et le test passait vert en ne mesurant rien.
Trouvé indépendamment par la revue de code et la revue de sécurité.

**Règle.** Toute assertion de type « aucun événement reçu » doit être accompagnée d'un cas qui
**provoque volontairement** l'événement et exige qu'il soit vu — sinon le test ne prouve que
l'absence de crash, pas l'absence du symptôme. Même famille que [[L-010]] (un test de mutation
doit vérifier qu'il a frappé sa cible) : ici la cible n'est pas une mutation de fichier mais un
écouteur d'événement, mais le principe est identique — un contrôle négatif seul ne prouve rien
tant qu'on n'a pas vu le contrôle positif correspondant réussir.

**Réfs.** `e2e/*.spec.ts` (sonde CSP) ; branche `feat/e1-st2-layout-navigation`.

**Addendum (E2-ST1).** Version encore plus trompeuse : une sonde peut **rapporter son propre
plantage comme le symptôme qu'elle cherche**. Une sonde Playwright posait un `MutationObserver` en
`addInitScript`, exécuté avant que `document.documentElement` existe : `observe(null)` levait, et le
script a rapporté « 1 violation CSP » sur le site déployé — alors qu'il n'avait jamais observé quoi
que ce soit. Un contrôle positif (déclencher une vraie violation et vérifier qu'elle est vue) l'aurait
attrapé immédiatement. Refaite par capture d'image (screencast), qui a confirmé 0 flash. Un instrument
de mesure sans contrôle positif ne distingue pas « j'ai vu 0 » de « je suis aveugle » — pire, il peut
confondre son erreur d'exécution avec le signal qu'il cherche.

---

## L-020 · L-014 s'applique à **chaque nouveau programme TypeScript**, pas qu'à celui qui l'a fait naître

**Symptôme.** `tsconfig.e2e.json`, quatrième `tsconfig` du dépôt, a été ajouté et câblé dans
`ci.yml` **et** `deploy.yml` — mais sans assertion sur ses `rootNames` réels. Vider son `include`
l'aurait laissé sortir vert en ayant typé zéro fichier e2e, exactement le défaut que [[L-014]]
décrit pour `tsconfig.tools.json`.

**Règle.** [[L-014]] est renforcée, pas dupliquée : toute introduction d'un **nouveau** programme
TypeScript (nouveau `tsconfig*.json` + script de vérification) répète le même geste — une
assertion sur les fichiers réellement couverts, épinglant nommément au moins un fichier qui motive
le gate. À signaler pour `.claude/rules/` : la checklist devrait rappeler ce geste dès qu'un
`tsconfig*.json` apparaît, pas seulement au moment de l'écrire une première fois.

**Réfs.** `tsconfig.e2e.json` ; `.github/workflows/{ci,deploy}.yml` ; [[L-014]].

---

## L-021 · `prefers-reduced-motion` + `transition-duration: 0.01ms !important` sur `*` transforme tout changement de style en micro-transition — lire un `getComputedStyle` sec ment

**Symptôme.** `transition-property` vaut `all` par défaut : sous émulation `reducedMotion`, un
`getComputedStyle` lu immédiatement après un changement de propriété peut encore rendre la valeur
**de départ**, pas la nouvelle, tant que les 0,01 ms n'ont pas achevé. Un test a viré au rouge en
activant `reducedMotion` — la flakiness était déjà latente, l'émulation l'a seulement rendue
visible.

**Règle.** Toute lecture de style calculé consécutive à un changement de propriété se *poll*e
(`expect.poll(...)`), elle ne se lit jamais sèche juste après le déclencheur — d'autant plus sous
`prefers-reduced-motion`, où la transition existe encore, juste très courte.

**Réfs.** `e2e/bascule-theme.spec.ts` ; `playwright.config.ts`.

---

## L-022 · Une option d'outil déplacée d'une version à l'autre ne produit AUCUN avertissement à l'exécution — seule la vérification de types l'attrape

**Symptôme.** `reducedMotion` est passé de `use` à `contextOptions` en Playwright 1.62 : posée au
mauvais endroit, l'option est simplement **ignorée en silence**, aucun test ne devient rouge pour
cette seule raison. C'est `tsc` (TS2769 sur la signature de configuration) qui l'a attrapée, pas un
run de la suite.

**Règle.** Un changement de version d'un outil de test/build mérite une passe de vérification de
**types** sur son fichier de configuration avant de faire confiance à un run vert — une option mal
placée ne casse rien à l'exécution, elle disparaît. Illustration directe de la valeur du 4ᵉ
programme TypeScript de ce dépôt (cf. [[L-020]]).

**Réfs.** `playwright.config.ts` ; `tsconfig.e2e.json`.

---

## L-023 · ⚠️ RÉPÉTÉE UNE FOIS (E2-ST2) — geste déclencheur : « j'écris un commentaire HTML dans un `template:` inline ». À ce moment précis, s'arrêter : pas de backtique.

**Reconnaître le geste AVANT la faute, pas le symptôme après.** Le seul moment où cette leçon peut
encore servir, c'est celui où la main s'apprête à taper `<!-- ... -->` **à l'intérieur d'un
template-literal** (`template: \`…\`` en `.ts`). Si ce commentaire va porter un backtique (norme de
commentaire nourri de ce dépôt) — **s'arrêter là**, avant d'écrire, pas en lisant l'erreur de lint
ensuite. La leçon a été relue au démarrage de session et repayée quand même le 2026-08-17 (E2-ST2) :
elle était reconnaissable au symptôme (`Parsing error`), pas au geste. D'où la reformulation.

**Symptôme (répété deux fois, deux fichiers différents).** `en-tete.ts` d'abord, puis un composant
d'E2-ST2 — même geste, même piège : un commentaire HTML avec backtique à l'intérieur d'un `template:`
en template-literal ferme le littéral prématurément, `Parsing error: ',' expected`, sur une ligne sans
rapport avec la cause réelle. Attrapé gratuitement par `npm run lint` les deux fois — coûteux quand
même : le message ne pointe pas la cause.

**Règle.** Dans un gabarit Angular **inline** (template-literal en `.ts`), un commentaire HTML ne
peut jamais contenir de backtique — reformuler sans backtique, ou déplacer le gabarit dans un fichier
`.html` externe si le commentaire nourri est nécessaire. Collision structurelle sur ce dépôt, dont
le registre de commentaire emploie massivement les backtiques ([[L-011]] sur un axe voisin : le
contenu d'`index.html` est livré tel quel, ici c'est un `.ts` qui casse à la compilation). Signal pour
`.claude/rules/angular-best-practices.md` : ce geste est mécanisable (lint custom sur backtique dans
commentaire HTML d'un template-literal) et gagnerait à devenir un gate plutôt qu'une vigilance de
mémoire — c'est précisément ce que sa répétition démontre.

**Réfs.** `src/app/core/layout/en-tete/en-tete.ts` ; composant d'E2-ST2 (page de leçon) ; branche
`feat/e2-st2-page-lecon-routage`.

---

## L-030 · Un fragment nu (`href="#ancre"`) se résout contre `<base href>`, jamais contre l'URL courante — un test qui compare la CHAÎNE d'un `href` ne prouve rien de la navigation

**Symptôme.** `src/index.html:6` pose `<base href="/" />`. Le sommaire de la page de leçon écrivait
`<a [href]="'#' + ancre">` : servi sous `/cours/securite-web/xss`, chaque lien se résolvait contre la
**base du document**, pas contre le chemin courant — les 9 entrées menaient toutes à `/#ancre`, c'est-à-
dire l'accueil. Mesuré en Chromium réel (`pathname: "/"` sur les 9 liens), pas déduit. Le test censé
couvrir ces liens comparait la **chaîne** de l'attribut `href` à un `id` du fragment rendu : il est
resté vert sur un sommaire entièrement cassé, parce qu'il ne **résolvait** aucune URL.

**Règle.** Sur ce dépôt (base `/` posée), un fragment relatif seul est un piège systémique dès qu'une
page n'est pas servie à la racine — préférer `[routerLink]="[]" [fragment]="…"`, qui produit un `href`
absolu dans le HTML prerendu. Et plus largement : un attribut d'URL syntaxiquement correct ne prouve
pas une navigation correcte — tester en résolvant (`new URL(href, document.baseURI).pathname`), jamais
en comparant la chaîne brute. Cousine directe de [[L-025]] (un style calculé correct ne prouve pas un
pixel peint) et de [[L-018]] (une assertion sur ce que le gabarit rend n'est pas une assertion sur ce
que le code fait) — ici c'est un axe de plus : ce qu'un `href` **contient** n'est pas ce vers quoi il
**mène**.

**Réfs.** page de leçon (sommaire) ; `app.config.ts` (`withInMemoryScrolling({ anchorScrolling:
'enabled' })`) ; `src/app/core/layout/gestion-focus-route.ts` lignes 25-32 ; branche
`feat/e2-st2-page-lecon-routage`.

---

## L-031 · Un module GÉNÉRÉ (`content-generated/`) doit être injectable, pas importé en dur — `vi.mock` refuse un import relatif sous Angular 22

**Symptôme.** `resoudre-lecon.spec.ts` avait besoin de forcer des cas limites (slug forgé
`constructor`/`toString`/`valueOf`, slug absent, JSON hors contrat) sur `src/content-generated/carte-lecons.ts` —
un fichier **généré** par le pipeline de contenu. `vi.mock` sur son chemin relatif est refusé par le
système de tests d'Angular 22 (`@angular/build:unit-test`) : les quatre cas étaient inécrivables.

**Règle.** Tout module généré dont on veut tester les cas limites passe derrière un **jeton
d'injection** (`InjectionToken`), avec la vraie donnée générée comme valeur par défaut — rien à câbler
côté appelants normaux, mais un test peut fournir une carte forgée sans toucher au fichier généré.
Patron déjà posé pour `MANIFESTE_LECONS`, reconduit ici pour `CARTE_LECONS`.

**Réfs.** `src/content-generated/carte-lecons.ts` ; `resoudre-lecon.spec.ts` ; jeton `CARTE_LECONS` ;
branche `feat/e2-st2-page-lecon-routage`.

---

## L-024 · Le nom accessible d'éléments inline adjacents ne porte pas l'espace visuel qui vient du `gap` CSS

**Symptôme.** Le logotype rendait `<span>Dr.</span><span>Je-Sais-Tout</span>` : `preserveWhitespaces:
false` (défaut d'Angular) retire le nœud de texte blanc entre les deux `<span>`, donc le nom
accessible calculé valait `Dr.Je-Sais-Tout` en un seul mot — l'espace visible à l'écran ne venait
que du `gap` CSS entre les deux éléments, qu'aucune API d'accessibilité ne lit.

**Règle.** Ne jamais épingler dans un `getByRole({ name })` une espace qui dépend à la fois de
l'aplatissement du nom accessible ET du traitement des blancs par le compilateur — poser un
`aria-label` reprenant exactement le texte visible (WCAG 2.5.3, nom-dans-le-nom) plutôt que
compter sur le rendu DOM. C'est la parade retenue ici ; les autres pistes envisagées déplaçaient le
rendu plutôt que de le corriger.

**Réfs.** `src/app/core/layout/en-tete/en-tete.ts` lignes 24-62.

---

## L-025 · Une marge automatique fait tomber un élément sans contenu à une largeur de ZÉRO dès qu'il est item de grille ou de flexbox — il occupe sa place et ne peint rien

**Symptôme.** Le `<hr>` de l'accueil (E1-ST3) était invisible, alors que le `<hr>` du pied de page —
même mixin, mêmes jetons — s'affichait. Aucune erreur, aucun avertissement, aucun gate rouge : le
style calculé était **juste** (`height` et `background-color` corrects), et `verifier-contrastes.mjs`
mesure une table de jetons, pas des pixels. La cause : la feuille de l'agent utilisateur pose
`margin-inline: auto` sur `<hr>`. En flux normal, une marge automatique avec `width: auto` se résout
à 0 et le trait prend toute la ligne. Mais un item de **grille** (ou de flexbox) dont les marges sont
automatiques **ne s'étire pas** — les marges absorbent l'espace libre, la largeur retombe sur le
contenu, ici **zéro**. Constaté à l'œil sur `home-clair.png`, puis mesuré :
`getBoundingClientRect().width` valait 0.

**Règle.** (1) Tout mixin qui dessine un élément **remplaçable ou à style d'agent utilisateur**
(`<hr>`, `<fieldset>`, `<figure>`, `<button>`) neutralise explicitement les marges de l'agent
utilisateur — sinon il ne se comporte pareil qu'en flux normal, et change de rendu selon le parent
qui l'accueille. (2) Corollaire de méthode, plus large que le CSS : **un style calculé correct ne
prouve pas un pixel peint**. Seule la géométrie (`getBoundingClientRect`) ou une capture le prouve —
même famille de piège que [[L-021]], où le `getComputedStyle` mentait aussi, pour une autre raison.
C'est le lot « capture et critique » d'E1-ST3 qui a trouvé celle-ci, qu'aucun des six gates
automatiques ne pouvait voir : ils vérifient tous des contrats, aucun ne **regarde** le résultat.

**Réfs.** `src/styles/_mixins.scss` (`@mixin filet-horizontal`, l'avertissement en tête) ;
`docs/agile/backlog-phase-1.md` §E1-ST3, lot C.

---

## L-026 · Une clef de cache indexée sur le CONTENU ne peut pas servir de préfixe d'identifiant — elle se répète dès que le contenu se répète

**Symptôme.** Le cache des diagrammes Mermaid était indexé par `sha256(source du diagramme)`, et le
**préfixe des identifiants du SVG** en était dérivé directement. Deux diagrammes **identiques** dans
une même leçon (même source, donc même hachage) recevaient donc le même SVG en cache, donc les mêmes
`id` **deux fois** dans la page rendue — `duplicate-id-aria` chez axe, et un `url(#…)` qui pointait
chez le mauvais voisin. Invisible tant qu'aucun contenu ne se répète ; reproduit avant correction :
24 identifiants partagés.

**Règle.** Une clef de cache indexe une **source** (elle a raison de collisionner sur un contenu
identique — c'est le but). Un préfixe d'identifiant DOM distingue une **occurrence** (il a tort de
collisionner, même sur un contenu identique). Ne jamais dériver le second directement du premier :
le socle SVG reste non préfixé en cache, le préfixe se calcule à part, à partir de
fichier + rang + code du diagramme dans la leçon. Écrire un test qui répète deux fois le même
diagramme dans une même leçon avant de déclarer un pipeline de rendu fini — c'est le cas qui ne se
voit qu'à la répétition.

**Réfs.** `tools/content-pipeline/rendre-mermaid.mjs` ; branche `feat/e2-st1-pipeline-contenu`.

---

## L-027 · Un workflow GitHub illisible ne produit pas une erreur de syntaxe — il produit un run en échec de 0 s, sur un déclencheur qui n'aurait pas dû s'appliquer

**Symptôme.** Une étape de `deploy.yml` renommée en
`- name: Sceller l'artéfact (portée : construction → téléversement)`. En YAML, dans un scalaire
**non quoté**, la séquence « `:` suivie d'une espace » ouvre une **clef de mapping** : le fichier
devenait illisible d'un bout à l'autre. GitHub n'a signalé ni la ligne, ni la colonne, ni même le
fichier — il a créé un run **`Déploiement`** en **échec instantané (0 s)**, intitulé « This run
likely failed because of a workflow file issue », **sur un push de branche de fonctionnalité que le
`branches: [main]` du fichier n'aurait jamais dû viser**. C'est logique une fois vu : ne sachant
plus lire `on:`, GitHub ne peut plus décider de *ne pas* exécuter. Mais le symptôme désigne le
mauvais workflow, le mauvais déclencheur, et aucune ligne.

**Règle.** (1) Tout nom d'étape, de job ou de workflow contenant `:`, `#`, `{`, `[`, `,`, `&`, `*`,
`?`, `|`, `>`, `!`, `%`, `@` ou une apostrophe ambiguë **se met entre quotes**, et un commentaire
adjacent dit pourquoi — sinon le prochain qui « nettoie les quotes inutiles » repaie la faute.
(2) Un workflow se vérifie en le **PARSANT**, jamais au motif : les specs qui lisaient les workflows
à la regex sont toutes restées vertes, puisqu'une regex trouve encore `content:build` dans un
fichier que plus aucun analyseur ne sait lire. C'est le même principe que
`.claude/rules/security.md` §4 (analyser puis confronter) appliqué à l'outillage. (3) Ne jamais
conclure d'un run rouge qu'on a compris quel fichier est en cause : ici, le workflow qui a rougi
n'était pas celui qu'on venait de modifier au sens fonctionnel, et il n'aurait pas dû tourner.
Cousine de [[L-015]] (les `.yml` sont un piège sur ce poste) et de [[L-005]] (le journal fait foi,
pas la couleur — ici, l'absence de journal *était* l'information).

**Réfs.** `src/workflows-github.spec.ts` (le gate, avec mutation vérifiée : les quotes retirées font
rougir `deploy.yml`, et lui seul) ; `.github/workflows/deploy.yml` (le commentaire qui protège le
nom quoté) ; PR #12.

---

## L-028 · Un outil d'analyse ne connaît pas la VIVACITÉ d'une collection DOM

**Symptôme.** SonarCloud (règle S7747, « itérable copié sans raison ») a signalé deux copies
défensives dans `tools/content-pipeline/rendre-mermaid.mjs`, l'analyseur à liste blanche qui décide
de ce qu'un SVG a le droit de contenir. Les deux ressemblaient au même code. **Le conseil était juste
sur l'une et destructeur sur l'autre :** `querySelectorAll(...)` rend une **NodeList STATIQUE** —
retirer un nœud pendant l'itération ne raccourcit pas la liste : la copie était vraiment inutile,
elle a été retirée. `element.attributes` rend une **NamedNodeMap VIVANTE** — et la boucle appelle
`removeAttribute()`. Mesuré sous jsdom : sur un élément portant `a,b,c,d`, l'itération SANS copie ne
voit que **`a` et `c`**. La liste blanche aurait inspecté **un attribut sur deux**, en silence. Ce qui
rend le piège grave : rien ne rougit — aucun test ne tombe, la liste blanche continue de « passer »,
et le SVG sort avec des attributs jamais confrontés à quoi que ce soit, c'est-à-dire la réouverture
de S-009 par la moitié des attributs.

**Règle.** Avant de retirer une copie défensive sur une collection DOM parce qu'un lint la dit
inutile : établir si la collection est **vivante** ou **statique**, et si la boucle **mute** la
collection. Statique + mutation = copie inutile. Vivante + mutation = **la copie EST le garde-fou**.
Et la vérification se fait par **mesure** (une sonde de dix lignes), pas par lecture de la spec —
c'est ce qui a tranché ici (même geste que [[L-013]], « seule une sonde bidirectionnelle fait foi »).

**Réfs.** `tools/content-pipeline/rendre-mermaid.mjs` ligne 719 (la boucle sur `.attributes`, qui
porte un `// NOSONAR` et son raisonnement mesuré) · cousine de [[L-019]] sur l'axe « un instrument
qui ne distingue pas *j'ai vu 0* de *je suis aveugle* » · famille sécurité S-003 / S-009 (liste noire
vs liste blanche sur un format structuré) · commit `7e2675b`.

---

## L-029 · Une règle appliquée PAR ACCIDENT disparaît sans bruit quand on refactorise l'accident

**Symptôme.** Dans `tools/content-pipeline/valider.mjs`, le relevé des titres (`titresDuCorps`)
employait un motif qui laissait entrer un titre vide (`##` suivi de blanches seules) avec un texte
fait d'une blanche — il devenait donc une section fantôme, et le contrôle d'ordre du gabarit finissait
par s'en plaindre. **Le validateur refusait la faute, mais par accident, et sous une cause qui ne la
nommait pas.** La réécriture du motif (conformité S8786, retour arrière super-linéaire) l'a fait
disparaître du relevé : la faute cessait d'être refusée. Aucun test n'a rougi — 266 tests verts, 9
fixtures invalides toujours 9/9 refusées — parce qu'**aucune fixture ne couvrait ce chemin**. Seule
une revue de sécurité l'a vu, en comparant le comportement des deux motifs valeur par valeur.

**Règle.** Quand un refactor touche le motif ou la structure de données **d'où** un gate tire sa
décision, l'égalité des sorties sur les cas existants ne prouve rien pour les cas qu'aucun cas de
test ne couvre. Le geste : identifier ce que l'ancien code refusait **de façon incidente** (par un
effet de bord, pas par une règle écrite), puis **rendre ce refus EXPLICITE et nommé** — et lui poser
son propre cas dans le contrôle positif. Corollaire : un contrôle positif ne prouve que les chemins
qu'il contient ; son garde-fou de complétude prouve qu'on n'a pas oublié d'assertion, pas qu'on n'a
pas oublié de CAS.

**Réfs.** `tools/content-pipeline/valider.mjs` fonction `titresDuCorps` (ligne 341) et
`verifierCorps` (ligne 650), qui rend désormais `{ titres, vides }` et signale explicitement en tête
de `verifierCorps` · `tools/content-pipeline/__fixtures__/invalides/corps-titre-de-section-vide/` et
son assertion dans `src/pipeline-contenu-validation.spec.ts` ligne 70 · cousines [[L-019]] (contrôle
positif) et [[L-005]] (un vert ne prouve pas qu'une vérification a tourné) · commit `7e2675b`.

---

## L-032 · Une redirection sur un fichier JS déplace la BASE de ses imports relatifs — et l'émulateur qui ignore la directive rend le gate vert

**Symptôme.** En production, `GET /main-5RJCKUZA.js` répondait **301** vers
`/main-5RJCKUZA.js/`, puis servait le bundle en 200 avec le bon type MIME. Le site fonctionnait :
rien ne rougissait, aucun gate ne bronchait. Mais l'URL finale du module devenait
`/main-5RJCKUZA.js/`, **donc la base de ses imports relatifs aussi** — et son
`import('./chunk-6ZRI2U7P.js')` visait `/main-5RJCKUZA.js/chunk-6ZRI2U7P.js`, qui n'existe pas.
404, `content-type: text/html`, route paresseuse morte. Cause : `"trailingSlash": "always"` dans
`config/staticwebapp.config.source.json`, qui s'applique **aussi aux fichiers avec extension**
(documenté : `/privacy.html` → 301 → `/privacy/`).

**Ce qui rend le cas retors — trois couches.** (1) Le défaut était **connu et écrit** depuis
E1-ST1-B, mais classé *coût de performance* en attente d'un arbitrage SEO : personne n'avait vu
qu'il deviendrait une **panne fonctionnelle**. (2) Il ne s'est déclenché qu'au **premier chunk
paresseux** du dépôt (E2-ST2, page de leçon) — un défaut dormant depuis E1, réveillé par un lot qui
ne l'a pas causé. (3) Le gate e2e tourne sous `npx swa start`, et **l'émulateur SWA n'implémente pas
`trailingSlash` du tout** (zéro occurrence dans son code) : il testait donc une politique de routage
qui n'était pas celle de la production, et restait vert pendant que la production était cassée.

**Règle.** Un émulateur qui **ignore** une directive ne la valide pas, il la **masque** — sa
verdeur ne dit rien de la directive, et c'est pire qu'une absence de test, parce que ça ressemble à
une couverture. Le geste : pour toute directive d'hébergement que l'outillage local ne sait pas
rejouer, la vérification appartient au **post-déploiement**, sur le site réellement servi. Et le
corollaire propre aux modules ES : **ne jamais laisser une redirection sur un asset**. Un 301 sur
un `.js` n'est pas un coût d'aller-retour, c'est un changement de **base de résolution** pour tout
le graphe d'imports en aval. Une vérification en ligne « chaque asset référencé par la page est
servi en 200, pas en 3xx » attrape la famille entière, pas ce cas-ci.

**Réfs.** `config/staticwebapp.config.source.json` (`trailingSlash` : `always` → **`auto`**, qui
garde la canonicalisation des dossiers — `/cours/securite-web` → 301 → `/cours/securite-web/` — et
sert les fichiers directement) · `.github/workflows/deploy.yml` étape « Vérifier le routage servi »,
bloc (c), dont la liste d'assets est **lue dans la page réellement servie** et le contrôle positif
est le **compte** (au moins 2, sinon le test ne mesure rien — [[L-019]]) · défaut décrit à l'avance
dans `docs/agile/backlog-phase-1.md` §E1-ST1-B · cousines [[L-004]] (attendre l'**effet**, pas le
code de retour) et [[L-005]] (un vert ne prouve pas qu'une vérification a tourné).

---

## L-033 · Entre la peinture prerendue et l'hydratation, le DOM natif accepte la saisie — et sans rejeu d'événements, la première détection l'écrase

**Symptôme.** Sur le `QuizComponent` (E2-ST3 lot C), le visiteur coche une réponse, la coche
apparaît puis disparaît, ou la correction affiche « sans réponse » pour une question visiblement
répondue. Aucun test rouge, aucune erreur console. Mécanisme : la page de leçon est un **chunk
paresseux**, et `withNoIncrementalHydration()` est actif dans `src/app/app.config.ts` — le rejeu
d'événements est supprimé. Entre la peinture du HTML prerendu et le branchement du gestionnaire
`(change)`, la radio se coche **réellement** dans le DOM (c'est le navigateur qui le fait, le
composant ne voit rien) ; puis à la première détection de changements, la liaison `[checked]`
s'évalue à `false` et est **réécrite** — Angular saute la création de nœuds à l'hydratation, pas la
mise à jour des liaisons. L'état du composant efface la saisie réelle du visiteur.

**Pourquoi personne ne l'avait vu.** Le composant documentait soigneusement le cas « **sans JS** »
(page prerendue lisible, seule la correction manquant) et en concluait, à tort, qu'il était
couvert. « Sans JS » et « **pas encore hydraté** » sont deux états distincts — le second est plus
trompeur, l'interface répond au clic, elle a l'air vivante, elle ment. Aggravant : le piège était
**nommé d'avance** dans le bloc de reprise de `CLAUDE.md` (« PIÈGES ENCORE ACTIFS » n°1,
`withNoIncrementalHydration()` actif, « il mord directement E2-ST3 ») — annoncé n'est pas évité
tant qu'aucun test ne l'a mordu. Cousine de [[L-032]] : là un émulateur qui ignore une directive ne
la valide pas, il la masque ; ici c'est un raisonnement (« sans JS = couvert ») qui ignore un état
réel et le masque de la même façon.

**Règle.** Tout composant interactif d'une page prerendue hydratée paresseusement (donc sans rejeu
d'événements) doit **amorcer son état depuis le DOM au premier rendu client**, dans un
`afterNextRender` qui relit les éléments natifs déjà mutés par le visiteur (ici :
`input[type=radio]:checked` de l'hôte), **avant** que la première détection de changements ne
réécrive les liaisons. Signal détecteur, à répéter avant d'écrire tout `(change)`/`(click)` sur une
page prerendue : se demander explicitement ce que le DOM natif accepte **avant que le composant ne
soit hydraté**, pas seulement ce qui se passe sans JS du tout. Et poser un test qui coche l'input
*avant* la première détection, pour prouver que le verdict n'efface pas la saisie.

**Réfs.** composant `QuizComponent`, E2-ST3 lot C ; `src/app/app.config.ts`
(`withNoIncrementalHydration()`) ; CLAUDE.md, bloc de reprise « PIÈGES ENCORE ACTIFS » n°1 ;
cousine [[L-032]].

---

(les prochaines leçons seront ajoutées ici par l'agent mentor au fil des cycles de livraison)
