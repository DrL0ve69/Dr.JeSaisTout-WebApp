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

(les prochaines leçons seront ajoutées ici par l'agent mentor au fil des cycles de livraison)
