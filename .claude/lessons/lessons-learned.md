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
>
> **Avant d'entrer une leçon : une mesure CONTRÔLÉE, pas une observation isolée.** (2026-08-19,
> né d'un correctif de [[L-041]], qui affirmait pendant plusieurs sessions une cause inverse de la
> réalité, tirée d'une seule observation non contrôlée.) Une entrée fausse est **plus coûteuse**
> qu'aucune entrée : elle est injectée à chaque session et fait raisonner juste sur des faits faux,
> et personne ne la remet en doute puisqu'elle a l'autorité du fichier. Avant d'écrire une leçon
> tirée d'un seul comportement observé (« ça n'a pas marché », « rien n'a bougé »,
> « c'est accepté/refusé ») : reproduire avec au moins **une variante de contrôle positif** qui
> prouve que l'instrument/la propriété testés peuvent effectivement bouger dans l'autre sens — sinon
> marquer l'entrée `à confirmer` dans son titre plutôt que l'affirmer comme un fait.

---

## L-001 · Le plan du projet vit dans `docs/agile/backlog-phase-1.md` — pointeur, jamais l'epic entier

**Symptôme.** Une délégation à un sous-agent qui reçoit tout un epic/backlog en brief se met à
boucler sur chaque sous-tâche dans le même contexte, et dépasse le budget de contexte par agent
(voir `.claude/rules/agent-context-budget.md`) bien avant d'avoir livré quoi que ce soit de vérifiable.

**Règle.** Le plan du projet (`docs/agile/backlog-phase-1.md` ou équivalent une fois créé) **est** le
brief — mais on ne passe à un sous-agent qu'un **pointeur de section** (ex. « §2.3 Leçon XSS-101,
lignes 40-58 »), jamais le document entier. Un agent = un livrable vérifiable, scope étroit.

**Réfs.** `.claude/rules/agent-context-budget.md` §2.

**Addendum (2026-08-18, E2-ST4).** Une revue adversariale de plan a trouvé une prémisse fausse dans
le backlog : « onglets de langage (PHP/C#/TS) » supposait le même code traduit en trois langages,
alors que la fixture et le compilateur montrent des `exemples` en **paires de vulnérabilités
distinctes** (PHP/XSS, C#/injection SQL) — un excellent arbitrage ARIA-vs-`<details>` a été produit
pour une question qui ne se posait pas. **Un objectif de backlog est une intention, pas un
contrat** : avant d'arbitrer COMMENT rendre une chose, vérifier dans le modèle de données/la
fixture réelle que cette chose **existe telle que décrite**.

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

**Addendum (2026-08-19) — un run vert ne referme pas non plus une panne INTERMITTENTE.** Après
correctif d'un job qui avait pendu (voir [[L-048]]), un run est repassé au vert en 21 s ; conclure
« transitoire » sur ce seul run était faux — la même panne a récidivé au déploiement suivant (run
GitHub `32264319046`). Un run vert prouve que la cause ne s'est pas manifestée **cette fois**, pas
qu'elle est éteinte. Sur une panne intermittente, ce qui referme le constat est soit une **mesure de
la cause** (journal lu ligne par ligne), soit un **mécanisme qui la rend structurellement
impossible** (retirer la dépendance fragile) — jamais un seul succès rejoué. Axe distinct de la
leçon d'origine (ici l'ambiguïté est l'**intermittence**, pas la **couverture** d'une porte de
sortie silencieuse), gardé comme addendum plutôt que dupliqué.

**Réfs addendum.** runs GitHub `32224090384` (blocage) et `32264319046` (récidive) ;
`.github/workflows/ci.yml`.

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

**Addendum (E2-ST5 lots a/b1) — le piège CRLF mord aussi les FIXTURES `.md` et les repères de
test.** Un repère écrit en dur dans un test (`'\n[[quiz]]\n'`) ne s'appariait à rien contre une
fixture `.md` en CRLF sur ce poste — même faute que la regex ancrée, sur un axe neuf : ici c'est un
littéral de comparaison, pas une regex. Les helpers de test mesurent désormais la fin de ligne
réelle du fichier plutôt que de supposer `\n`. **Deuxième variante, sur les commandes de ce poste :**
`sed 's/…/ /'` ne produit **pas** U+00A0 — GNU sed interprète `\u` côté remplacement comme
« mettre en majuscule le caractère suivant » et avale la séquence en silence ; il faut `\x5cu00A0`.
Sur un dépôt dont `.claude/rules/contenu-pedagogique.md` §3 impose U+00A0 et interdit U+202F/U+2009,
une substitution qui produit silencieusement un **autre** caractère (ou rien) est un risque de
contenu, pas seulement de test. Règle commune aux deux : sur ce poste, **toute** transformation de
fin de ligne ou d'espace spéciale se vérifie en relisant le résultat au disque, jamais en supposant
que la commande a fait ce qu'elle annonce.

**Réfs addendum.** fixtures `.md` et helpers de `tools/content-pipeline/` (E2-ST5 lots a/b1) ;
`.claude/rules/contenu-pedagogique.md` §3.

**Addendum (E3-ST0) — troisième variante, côté `bash` plutôt que côté fichier : `$VAR` dans un
`node -e "…"` est expansé par le SHELL avant que node ne le voie.** Un script d'écriture de registre
lancé en `node -e "…"` depuis bash portait `'$d'` : le shell l'a résolu en chaîne **vide** avant que
node n'exécute quoi que ce soit, et un ternaire côté node a silencieusement pris l'autre branche —
résultat un TSV bien formé, sans erreur, avec une colonne de dates **vide**. Seule une relecture du
fichier écrit au disque (pas le code de retour du process) l'a montré. Règle commune aux trois
variantes : sur ce poste, toute transformation de texte (fin de ligne, espace spéciale, ou
interpolation de variable dans un `-e`) se vérifie en **relisant le résultat au disque**. Corollaire
propre à celle-ci : jamais de `node -e "…"` avec des `$variables` shell en guillemets doubles —
écrire un fichier de script (`node script.js`) dès qu'une variable doit y entrer.

**Réfs addendum 2.** passe de fusion KB E3-ST0 (registre de progression) ; cousine directe des deux
variantes ci-dessus.

**Addendum (lot E6) — la même leçon repayée DEUX fois la même journée par deux agents distincts, sur
`design-system.spec.ts` et `tools/design/verifier-contrastes.mjs` : un `replace()` sur une ancre
multi-ligne écrite en `\n` ne mute RIEN dans un fichier CRLF, et échoue en SILENCE.** Corollaire
découvert au passage, sur un axe neuf (le TRANSPORT, pas le fichier) : **un script d'édition
s'écrit dans un fichier, jamais collé en ligne de commande** — le shell mange les échappements
(antislashs, apostrophes) au passage, ce qui a corrompu deux fois un fichier de test et forcé une
réparation manuelle. Règle : tout script d'édition (1) détecte la fin de ligne réelle du fichier et
aligne son motif dessus, (2) vérifie qu'une mutation a bien eu lieu avant d'écrire, (3) est lui-même
un fichier sur disque, jamais un one-liner passé en argument de commande.

**Réfs addendum 3.** lot E6 « Moniteur ambre » ; `src/app/pages/accueil/design-system.spec.ts` ;
`tools/design/verifier-contrastes.mjs`.

**Addendum (E3-ST2/E3-ST3, 2026-08-21) — le piège CRLF mord aussi la REVUE, pas seulement le test ou
le générateur.** `src/workflows-github.spec.ts` a été réécrit en CRLF alors que le blob de HEAD est
LF pur : `git diff --stat` annonçait **2 678 lignes** changées, `git diff -w --stat` en annonçait
**8** — pendant qu'une revue de sécurité tournait au même moment sur ce spec, le plus structurant du
dépôt. Un diff gonflé par une fin de ligne noie le vrai changement dans un bruit que la revue doit
trier à la main, ou pire, ne trie pas. **Règle** : avant de committer un fichier `.ts`/`.mjs`/`.yml`
touché, comparer `git diff --stat` à `git diff -w --stat` — un écart entre les deux signale une
réécriture de fin de ligne, à annuler en réalignant sur celle de HEAD (jamais sur celle de
l'éditeur), pas à committer tel quel en espérant que la revue filtre le bruit elle-même.

**Réfs addendum 4.** branche `feat/e3-st2-st3-lecons` ; `src/workflows-github.spec.ts`.

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

**Addendum (E2-ST6) — la promesse mensongère n'est pas toujours une citation de fichier, elle peut
être l'affirmation d'un COMPORTEMENT que le code voisin interdit.** `progression.ts` justifiait sa
clef de stockage composite par « deux leçons de sujets différents peuvent partager un slug » — or
`generer-manifeste.mjs:258` **refuse ce cas au build**, fail-closed : le cas que le commentaire
prétend gérer ne peut structurellement jamais se produire. La décision (clef composite) reste bonne,
sa justification écrite est fausse. Coût identique à l'addendum d'origine : le prochain lecteur
raisonne sur une garantie inexistante. **Règle étendue** : un commentaire qui sert de justification
ne se vérifie pas seulement en confirmant qu'un fichier/une section **existe** — il se vérifie en
confirmant que le **comportement** qu'il affirme est bien celui que le reste du système applique
(ici : tenter de reproduire le cas invoqué contre le garde-fou voisin, pas seulement lire son nom).

**Réfs addendum.** `src/app/**/progression.ts` ; `tools/content-pipeline/generer-manifeste.mjs:258` ;
E2-ST6.

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

**Addendum (2026-08-19, lot de dette sécurité pré-E3-ST1).** Récidive dans
`src/workflows-github.spec.ts` : un octet NUL littéral dans le fichier a fait répondre « Binary file
matches » à un `grep` de diagnostic et a fait **échouer silencieusement** une édition par
correspondance de chaîne (la chaîne cherchée « matchait » selon l'outil, mais rien n'était réellement
remplacé). Même geste que l'entrée d'origine : un « binary file matches » sur un `.ts`/`.mjs` connu
pour être du texte est un signal à inspecter, jamais une non-correspondance à accepter.

**Addendum (2026-08-20) — le pire cas est le SILENCE TOTAL, et il a fait conclure à l'absence d'un
garde-fou qui existe.** `src/workflows-github.spec.ts` est classé **`data`** (et non `text`) par
`file` : les outils de recherche le **sautent sans le dire** et répondent « aucune correspondance ».
Un scribe en a déduit qu'il ne pouvait pas vérifier la constante attendue — alors qu'elle s'y trouve
bien (`HACHAGES_STYLE_CI_ATTENDU = 14`, l. 212). **Règle** : sur un fichier réputé binaire/`data`,
forcer le mode texte (`rg --text`, `Select-String -Encoding utf8`, ou lecture directe du fichier)
**avant** de conclure. « Aucun résultat » ne prouve jamais une absence — et croire un garde-fou
absent est plus dangereux que son absence réelle : on en écrit un second, ou on retire l'exigence
qu'il tenait.

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

## L-023 · ⚠️ RÉPÉTÉE DEUX FOIS (E2-ST2, E2-ST4 lot B) — la leçon écrite ne suffit plus, il faut un garde-fou exécutable

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

**⚠️ Troisième occurrence (E2-ST4 lot B), et verdict : la leçon écrite ne change plus le
comportement.** Un commentaire HTML avec backtique dans le `template:` inline de
`rendu-blocs.ts` a de nouveau terminé le littéral, `npm run lint` rouge sur un « Parsing error »
sans rapport avec la cause — exactement le symptôme déjà décrit deux fois. Le problème n'est ni
la formulation (le geste déclencheur était déjà écrit noir sur blanc) ni le placement : au
troisième passage, une leçon *lue* et *repayée quand même* n'est plus un problème de mémoire, c'est
la preuve qu'une vigilance humaine ne suffit pas sur ce geste précis. **Elle cesse d'être une
leçon de mentor et devient une dette d'outillage.**

**Décision.** Ne pas ajouter de quatrième paragraphe si ça mord une quatrième fois — écrire
directement le garde-fou mécanisable déjà signalé ci-dessus : une règle ESLint (ou un script
`PostToolUse`/gate CI) qui refuse un backtique à l'intérieur d'un commentaire HTML `<!-- … -->`
présent dans un littéral `template: \`…\`` d'un `.ts`. **Signalé à `.claude/rules/angular-best-practices.md`
pour que ce geste y soit porté en dur**, plutôt que de rester une entrée de plus dans ce fichier.

**⚠️ Quatrième, cinquième et sixième occurrences (lot E6, même journée, trois agents indépendants) —
la décision ci-dessus n'a pas été exécutée, et le piège a mordu de nouveau.** `en-tete.ts`,
`page-introuvable.ts`, `lecon.ts`, `quiz.ts` : même geste, même symptôme (`Parsing error: ','
expected` / `TS1005`/`TS2554` sur une ligne sans rapport). La leçon écrite ne protège toujours pas —
elle n'a simplement jamais été portée en gate, malgré l'avoir déjà écrit noir sur blanc au tour
précédent. **Ce n'est plus une leçon à relire, c'est une action non faite à finir** : quelqu'un doit
réellement écrire la règle ESLint/le hook `PostToolUse` signalé ci-dessus — tant que ce n'est pas
fait, chaque agent qui écrit un commentaire dans un `template:` inline repayera cette leçon. Parade
immédiate en attendant l'outillage : dans un gabarit inline, ne **jamais** citer de code entre
accents graves dans un commentaire HTML — le dire, en clair ou entre guillemets « ».

**Réfs 4-6.** `src/app/core/layout/en-tete/en-tete.ts` ; `src/app/pages/page-introuvable/…` ; page de
leçon (`lecon.ts`) ; `quiz.ts` — lot E6 « Moniteur ambre », 2026-08-20.

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

**Addendum (2026-08-19, E2-ST5 lot c2) — le pendant côté PROPRIÉTÉ TÉMOIN, pas seulement côté
rendu.** Deux occurrences mesurées dans un même épisode CSP : une sonde écrivait `top` sur un
élément en `position: static` (où `top` n'a structurellement aucun effet), puis, en corrigeant,
`outline-offset` sur un élément dont `outline-style` valait `none` (Chromium le résout à `0px` tant
que le contour n'existe pas) — les deux fois, « aucun changement observé » était **ambigu** entre
« refusé par une politique » et « cette propriété-là n'avait de toute façon aucune prise ici ».
**Règle.** Toute sonde qui lit une propriété calculée (CSS, géométrie, attribut, focus) pour prouver
qu'**autre chose** a été refusé ou appliqué doit d'abord garantir que cette propriété **bouge** en
l'absence de tout refus — sinon on mesure l'inertie de la propriété choisie, pas la politique
testée. Choisir une propriété qui se résout **inconditionnellement** dans l'état où on l'interroge
(ex. `padding-top` plutôt que `top` hors positionnement, un contour déjà visible plutôt
qu'`outline-offset` seul). Cousine directe de [[L-010]] (un test de mutation doit vérifier qu'il a
frappé sa cible) et de [[L-013]] (seule une sonde bidirectionnelle fait foi) : ici l'axe est le
*choix de la propriété observée*, pas la mutation ni la config. Détail de l'épisode d'origine :
[[L-041]] (CSP `style-src`) et `.claude/lessons/security-lessons.md` **S-016**.

**Réfs addendum.** `e2e/aides/sonde-csp.ts` ; branche E2-ST5 lot c2.

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
d'événements) doit **amorcer son état depuis le DOM**, en relisant les éléments natifs déjà mutés
par le visiteur (ici : `input[type=radio]:checked` et la `value` des `<select>` de l'hôte), **avant
que son propre état ne puisse les écraser**. Signal détecteur, à répéter avant d'écrire tout
`(change)`/`(click)` sur une page prerendue : se demander explicitement ce que le DOM natif accepte
**avant que le composant ne soit hydraté**, pas seulement ce qui se passe sans JS du tout.

**⚠️ ET LA MOITIÉ QUI MANQUAIT À CETTE LEÇON, ajoutée le 2026-08-18 (lot D).** La première rédaction
prescrivait `afterNextRender` — or **`afterNextRender` s'exécute APRÈS la détection de changements**,
donc après les écritures DOM qu'elle a pu faire : le mécanisme prescrit ne peut pas, en toute
rigueur, satisfaire l'exigence que la règle énonce. Un test unitaire ne peut pas trancher (le
`TestBed` n'a pas de DOM prerendu avant le premier rendu, donc le test appelle l'amorçage à la
main : il prouve que la lecture est JUSTE, jamais qu'elle arrive à TEMPS). **Cette famille de
correctifs se mesure dans un vrai navigateur, ou elle n'est pas mesurée** — Playwright, cocher
pendant la fenêtre, laisser hydrater, vérifier que la coche survit. Cousine directe de [[L-032]] :
un instrument qui n'implémente pas le comportement observé rend vert sans avoir regardé. Et le
commentaire au point d'appel doit dire ce qui est prouvé **et ce qui ne l'est pas**, sinon c'est une
justification qui promet plus que le code n'applique (famille S-009).

**Réfs.** composant `QuizComponent`, E2-ST3 lot C ; `src/app/app.config.ts`
(`withNoIncrementalHydration()`) ; CLAUDE.md, bloc de reprise « PIÈGES ENCORE ACTIFS » n°1 ;
cousine [[L-032]].

**🔴 CE QUI EST RÉFUTÉ, MESURÉ LE 2026-08-20 — l'extension e2e de cette leçon était FAUSSE.**
La leçon ci-dessus reste vraie **pour ce qu'elle décrit** : la fenêtre de pré-hydratation existe, et
l'amorçage depuis le DOM est le bon correctif. Ce qui est **réfuté**, c'est l'usage qu'en faisaient
`CLAUDE.md` et le backlog pour expliquer l'intermittence des specs e2e de la simulation : « l'absence
d'attributs `ngh` prouve l'hydratation des vues, pas que le comportement d'un composant paresseux est
armé ». Mesures qui la renversent : `app-simulation` porte bien `ngh="7"` ; la disparition de `[ngh]`
et l'apparition de `__ngContext__` tombent sur le **même** échantillon ; « armé au retour de
`attendreHydratation` » **8/8** ; **20 gestes** émis à l'instant exact où `attendreHydratation` rend
la main, **0 perdu**. La vraie cause est une **lecture périmée**, décrite en [[L-057]] — pas une
hydratation incomplète. Entrée conservée et marquée plutôt qu'effacée : une leçon fausse laissée
muette est pire qu'une leçon absente (voir l'avertissement en tête de fichier), et celle-ci a orienté
le diagnostic à tort pendant plusieurs semaines.

---

## L-034 · Mutualiser une VÉRIFICATION déplace le risque vers le module mutualisé — il hérite du pouvoir de rendre tous ses appelants verts

**Symptôme.** E2-ST3 lot E a extrait, à raison ([[L-016]] : deux copies d'une même assertion
divergeraient en silence), trois modules d'aide depuis les specs e2e :
`e2e/aides/indicateur-focus.ts`, `sonde-csp.ts`, `hydratation.ts`. Une fois extraits, ce ne sont
plus des specs mais des **modules produit-adjacents qui portent la mesure** : un défaut de typage
ou de logique y serait invisible depuis chaque spec appelant, et ferait passer verts les gates les
plus structurants du dépôt (focus visible, CSP, hydratation — L-033/S-005). Ils ont dû être
épinglés nommément dans le programme de typage e2e, avec justification écrite.

**Règle.** Quand on factorise une vérification (assertion, sonde, matcher) hors d'un fichier de
test, le module qui en résulte **change de nature** : il devient aussi critique que ce qu'il
remplace, et demande la même garde qu'un gate — épinglage nominatif dans son programme de typage
([[L-014]]/[[L-020]]), pas seulement un import propre. Réflexe à chaque extraction d'aide e2e/test :
« ce fichier peut-il, seul, faire passer un test vert à tort ? » — si oui, il rejoint la liste
gardée.

**Réfs.** `e2e/aides/indicateur-focus.ts`, `sonde-csp.ts`, `hydratation.ts` ; `tsconfig.e2e.json` ;
branche `feat/e2-st3-lot-e` ; cousines [[L-014]], [[L-016]], [[L-020]].

**Addendum (E2-ST4 lot C) — l'épinglage de typage ne couvre que l'axe TYPAGE, pas l'axe
COMPORTEMENT.** `indicateur-focus.ts` a reçu une tolérance d'un pixel (justifiée). Mais sa fonction
`dansLaFenetre` n'était lue qu'en `.toBe(true)` par ses trois appelants : rien ne prouvait qu'elle
savait encore répondre `false`. Seul un des quatre modules de `e2e/aides/` était couvert sur cet
axe — `sonde-csp.ts` exige par écrit un contrôle positif de ses appelants, les trois autres non.
**Règle étendue** : un module mutualisé qui se desserre (tolérance, seuil, marge) doit livrer, dans
le **même diff**, un contrôle positif prouvant qu'il refuse encore un cas hors tolérance — l'épinglage
au programme de typage ([[L-014]]/[[L-020]]) protège contre un défaut de **signature**, pas contre un
module qui compile juste et ne sait plus jamais dire non. Réflexe à ajouter à la question de L-034 :
« ce module peut-il encore répondre `false`/refuser, et un appelant le vérifie-t-il ? »

**Réfs addendum.** `e2e/aides/indicateur-focus.ts` (`dansLaFenetre`) ; `e2e/aides/sonde-csp.ts`
(patron de référence) ; branche `feat/e2-st4-lot-c`.

---

## L-035 · Un chiffre mesuré dans un périmètre ne se réemploie pas dans un autre périmètre sans être remesuré — et un test qui exige une sortie doit d'abord vérifier que l'entrée choisie la PRODUIT

**Symptôme.** Trois échecs du lot E-c1, tous dans le spec, jamais dans le produit. (1) Le compte de
radios épinglé (**14**) avait été relevé sur la **page entière** dans un document de clôture
antérieur, puis réemployé tel quel dans un sélecteur borné **au seul quiz** — 3 des 14 étaient la
bascule de thème de la coquille. (2) Le test choisissait la **bonne** réponse d'un `<select>`, puis
exigeait que la correction la **cite** — le composant ne cite que les réponses **fausses** : le
test rougissait sur un composant correct, faute d'avoir vérifié que son entrée produirait la sortie
attendue. (3) Une U+00A0 littérale (imposée par la typo française du produit,
`.claude/rules/contenu-pedagogique.md` §3) faisait rougir `no-irregular-whitespace`.

**Règle.** (a) Un chiffre mesuré dans un périmètre (page entière, fixture antérieure, autre lot) ne
s'épingle dans un test qu'après avoir été **remesuré dans le périmètre exact** du test — jamais
recopié d'un document de clôture. (b) Un test qui affirme « la sortie contient X » doit d'abord
vérifier que l'**entrée choisie** est de la nature qui produit X (ici : une mauvaise réponse pour
tester une citation de correction) — sinon il teste une hypothèse sur le comportement, pas le
comportement. Cousine de [[L-019]] (contrôle positif) sur un axe amont : ici c'est la **prémisse du
test**, pas l'instrument de mesure, qui est fausse.

**Réfs.** E2-ST3 lot E-c1 ; `e2e/parcours-clavier-quiz.spec.ts` ; `e2e/quiz-pre-hydratation.spec.ts`.

**Addendum (E2-ST4 lot C).** Même famille, deux variantes neuves sur U+00A0. (1) Le libellé rendu
d'un bloc de code (« Code n°1 — bash ») contient U+00A0 entre le numéro et le tiret ; une espace
**ordinaire** tapée dans l'assertion d'un spec fait rougir un produit parfaitement sain — l'espace
attendue n'est PAS celle qu'on tape par réflexe au clavier. (2) Un `node -e` employé pour **écrire**
un fichier de spec a converti les échappements ` ` en **vrais caractères** U+00A0 dans le
fichier sur disque — ce qu'ESLint `no-irregular-whitespace` refuse ensuite en lecture, sur un
fichier qu'on croyait porter un échappement inoffensif. Corollaire : toute assertion qui touche un
libellé produit doit **copier** l'U+00A0 depuis sa source (ou l'écrire en ` ` dans un littéral,
jamais recopié tel quel par un outil qui l'interprète), et un script générateur de fichier source
doit être relu pour ce qu'il écrit **au disque**, pas pour ce qu'il affiche à l'écran.

**Addendum (lot E6) — un chiffre annoncé dans un BRIEF de coordinateur est un chiffre mesuré comme
un autre, il se remesure avant d'être recopié dans un livrable.** Le coordinateur a écrit deux fois
« les arrêts de tabulation passent de 7 à 9 » dans des briefs successifs ; la mesure réelle donne
**8** (7 − 1 groupe de radios retiré + 2 boutons). Même défaut que (a) ci-dessus, vu depuis
**l'amont** du test plutôt que depuis le test lui-même : un chiffre qui voyage d'un brief à l'autre
sans être recompté est un chiffre recopié, pas mesuré.

**Réfs addendum.** briefs de lot E6 « Moniteur ambre », arrêts de tabulation du composant en-tête.

**Addendum (E3-ST2/E3-ST3, 2026-08-21) — un chiffre nommé d'après « LA » page/le composant devient
ambigu dès que le dépôt en publie un DEUXIÈME.** `BLOCS_STYLE_PAGE_LECON` a d'abord été porté de 6 à
7 « puisque la simulation ajoute un bloc », avant que la mesure ne montre que le test qui l'emploie
navigue la page du **quiz** (sans simulation), pas celle de la simulation. Le littéral n'était pas
faux à l'écriture (une seule leçon publiée, un seul référent possible) ; il l'est devenu quand la
**population** qu'il nomme est passée de un à plusieurs sans que son nom le signale. **Règle
élargie** : tout littéral/nom de constante au singulier défini (« la page de X », « le composant
Y ») se relit dès que le dépôt en publie un deuxième exemplaire — le remesurer dans le périmètre
exact visé (pas supposer que le premier référent tient toujours), et si plusieurs variantes
coexistent, le nommer au pluriel ou le paramétrer plutôt que de garder un singulier qui ment.

**Réfs addendum 2.** branche `feat/e3-st2-st3-lecons` ; `e2e/aides/` (constante
`BLOCS_STYLE_PAGE_LECON`).

---

## L-036 · Un contrôle positif du CORRECTIF doit APPELER l'outil corrigé — un test qui compile transformateur branché mesure sa propre lecture, pas la capacité de refus qu'on vient de réparer

**Symptôme.** `verifierAncres` (garde-fou neuf de `compiler-markdown.mjs`) cherchait d'abord un
**motif** (`\bligne-(\d+)\b`) dans le HTML coloré — donc un commentaire d'auteur citant « voir
ligne-1, ligne-2 » satisfaisait le garde-fou sans que le transformateur d'ancres soit branché.
Réparé (analyse jsdom + liste blanche nominative). Mais la première preuve du correctif — une
fixture leurre compilée par le pipeline **entier**, puis assertion sur les ancres relevées — ne
prouvait rien : elle exerçait `ancresDe` (la lecture du spec), pas la capacité de **refus** de
`verifierAncres`. L'ANCIENNE version défaillante du garde-fou aurait passé ce test tout aussi
vert.

**Règle.** Quand le correctif vit **dans un outil**, le contrôle positif doit **appeler cet
outil directement** — l'exporter s'il ne l'est pas — plutôt que de faire tourner le pipeline
autour et d'observer un effet de bord en aval. Question à se poser avant d'écrire le test :
« ce test aurait-il échoué **avant** le correctif ? » Si la réponse est non, ce n'est pas le test
du correctif, même s'il touche le bon fichier et le bon symptôme. Le correctif final appelle
`verifierAncres` dans un processus fils avec un HTML **forgé** (sans ancre, texte leurre) et
assertion sur le code de sortie 1, plus une contre-épreuve (fragment réellement ancré ⇒ code 0)
et un cas d'ancres décalées d'un cran ⇒ refus. Cousine de [[L-019]] (un contrôle positif est
nécessaire, pas seulement un tableau vide) et de [[L-005]] (un vert ne prouve pas qu'une
vérification a tourné) — l'axe neuf ici : le test peut tourner, être vert à raison sur le HTML
choisi, ET viser le **mauvais côté de la frontière** (l'appelant plutôt que l'outil corrigé).

**Réfs.** `tools/content-pipeline/compiler-markdown.mjs` (`verifierAncres`, exportée exprès pour
être mise à l'épreuve) ; `src/pipeline-contenu-compilation.spec.ts`
(`appelerVerifierAncres`, test « ANCRE — le garde-fou du COMPILATEUR refuse… ») ; revue
`code-reviewer` du 2026-08-18 ; branche `feat/e2-st4-lot-a2`.

**Addendum (2026-08-19, lot de dette sécurité pré-E3-ST1) — la même question de mutation
(« ce test aurait-il échoué avant le correctif ? ») se pose aussi sur une CHARGE de contournement
et sur un contrôle de SUPPRESSION.** Deux variantes trouvées sur les quatre PR du lot :
(1) une charge de contournement citée en exemple pour S-003 (`<script data-x=a"b">`) portait un
nombre **pair** de guillemets — déjà refusée par l'ancien analyseur, donc inutile à rejouer telle
quelle ; toute charge de contournement doit d'abord se **rejouer contre l'ancien code**, avant même
d'écrire le test, pour confirmer qu'elle serait passée à travers. (2) un contrôle positif écrit pour
prouver « cette dépendance/cet outil n'est plus nécessaire » (Chromium pour Mermaid, un script CI
retiré) hérite de la **même contrainte** que ce qu'il prétend démontrer absent : mesuré sur une
machine qui possède déjà la ressource retirée, il reste vert en ne prouvant rien (le cache Mermoid
localisait sa dépendance à la **construction du composant**, avant toute consultation du cache — un
run sans Chromium l'aurait fait échouer partout) ; un spec censé prouver qu'un outil n'est plus requis
exécutait lui-même un run de chauffage qui le requérait (même famille que [[L-007]], précédent
PR #17). **Règle étendue** : avant d'écrire un contrôle qui affirme une absence (de faille, de
dépendance, de nécessité), vérifier qu'il tournerait dans les conditions **exactes** où l'absence
doit être vraie — machine sans la ressource, ancien code sans le correctif — pas dans l'environnement
confortable où l'agent travaille.

---

## L-037 · « UNE définition, N appelants, dette PAYÉE » n'est vrai que si les N appelants ont été RECENSÉS — pas seulement ceux qui vivent dans le même dossier que l'outil

**Symptôme.** `tools/content-pipeline/compter-lignes.mjs` (lot B d'E2-ST4) unifiait deux formules de
comptage de lignes divergentes (compilateur/validateur), avec un en-tête déclarant « UNE définition,
TROIS appelants » et la dette « PAYÉE ». La revue a trouvé un **quatrième** copieur :
`src/app/features/cours/quiz/quiz.ts` (`question.code.split('\n')`), qui produisait une radio
fantôme « Ligne N+1 » sélectionnable au libellé vide, et une garde de composant plus permissive que
celle du validateur. La divergence n'avait pas disparu, elle avait **changé de place** — sous un
commentaire qui affirmait le contraire.

**Ce qui rendait le quatrième invisible.** Il vivait **hors du dossier de l'outil**
(`src/app/…`, pas `tools/…`) et un composant Angular **ne peut structurellement pas importer** un
`.mjs` de `tools/` (deux programmes TypeScript distincts, cf. [[L-020]]) — la copie y était donc
nécessaire, ce qui la rendait facile à oublier plutôt qu'impossible.

**Règle.** Avant d'écrire « UNE définition, N appelants, dette payée » dans l'en-tête d'un module
qui remplace une formule dupliquée : recenser les copieurs par une recherche **plein-texte du
calcul**, pas par dossier ni par type de fichier — en particulier vérifier le côté **rendu/UI**, qui
vit presque toujours hors de `tools/` et ne peut par construction pas importer le module unifié. Un
appelant qu'on ne peut pas faire importer le module de référence n'est pas hors sujet : c'est lui
qu'il faut nommer explicitement comme **copie verrouillée** (pointeur vers la définition + test de
parité, patron `clef-indiscernable-parite.spec.ts`), jamais laisser une formule maison sans
étiquette. Cousine de [[L-008]]/[[L-016]] (une contrepartie ou une citation n'est vraie que
vérifiée) sur un axe neuf : ici, c'est un **compte** annoncé dans un commentaire qui doit se
vérifier avant d'être écrit, pas seulement une promesse qualitative.

**Réfs.** `tools/content-pipeline/compter-lignes.mjs` ; `src/app/features/cours/quiz/quiz.ts` ;
revue `code-reviewer`, branche `feat/e2-st4-lot-b`.

**⚠️ Addendum (E2-ST5 lots a/b1) — DEUXIÈME occurrence du même geste, même verdict que [[L-023]].**
`compterAncres` a été dupliquée entre `tools/content-pipeline/compiler-markdown.mjs` et
`src/app/features/cours/contenu-compile.ts`, avec un pointeur croisé écrit dans **les deux** JSDoc —
mais sans le test de parité que cette leçon prescrit. Le mode de divergence est concret : un
`BlocContenu` neuf portant des `blocs` enfants au-delà d'`encadre` ferait sous-compter **un seul**
des deux côtés, qui deviendrait VERT en se comparant à lui-même — [[L-034]] à la lettre. Deux
exemplaires de patron existaient déjà dans le dépôt (`src/compter-lignes-parite.spec.ts`,
`src/clef-indiscernable-parite.spec.ts`) et n'ont pas été copiés spontanément. **La leçon écrite ne
suffit plus pour ce geste non plus : dès qu'un commentaire dit « en double de X, et c'est voulu »,
le geste suivant doit être de créer `*-parite.spec.ts`, jamais de finir la phrase.** Signal pour
`.claude/rules/` : un gate exécutable est possible ici — grep les commentaires JSDoc/`.mjs`/`.ts`
qui déclarent une duplication volontaire (« dupliqué depuis », « copie voulue », pointeur croisé) et
exiger qu'un fichier `*-parite.spec.ts` existe pour la paire citée.

**Nuance trouvée en corrigeant celle-ci — le corpus de parité ne s'épure pas pour faire passer le
test.** Sur les entrées hostiles (`blocs` absent, `null`, un nombre), les deux implémentations de
`compterAncres` divergent **légitimement** : le compilateur a le droit de lever, la frontière Angular
doit rendre 0 sans lever. Retirer ces cas du corpus de parité aurait donné une parité vraie sur un
corpus mutilé. Ils ont été gardés et assertés comme **asymétrie de contrat**, avec leur propre
contrôle positif. Règle générale : quand deux implémentations d'une même règle divergent
volontairement sur une classe d'entrées, cette classe s'asserte comme **divergence attendue** — on
ne l'exclut pas du corpus, sinon le test vert ne couvre plus le cas qui l'a rendu intéressant.

**Réfs addendum.** `tools/content-pipeline/compiler-markdown.mjs`, `src/app/features/cours/contenu-compile.ts`
(`compterAncres`) ; revue `code-reviewer`, branche E2-ST5 lots a/b1.

---

## L-038 · Défaire une mutation de test par `git checkout -- <fichier>` sur un arbre SALE efface aussi le travail non commité de ce fichier

**Symptôme.** Un garde-fou de ce dépôt s'éprouve par mutation ([[L-036]]) : on modifie le fichier,
on observe le refus, on rétablit. Un implémenteur du lot B a rétabli avec `git checkout --
<fichier>` alors que `git status` n'était **pas propre** — les correctifs des lots précédents sur ce
même fichier n'étaient pas encore commités. `git checkout` a effacé la mutation **et** tout le
travail non commité, qu'il a fallu réécrire.

**Règle.** Avant de défaire une mutation de test : vérifier `git status`. Si l'arbre n'est pas
propre sur le fichier visé, ne jamais `git checkout -- <fichier>` — copier le fichier à part (ou
`git stash push -- <fichier>`) avant de muter, et restaurer depuis cette copie. `git checkout` sur
un arbre sale ne distingue pas « ce que je viens de muter » de « ce que je n'ai pas encore commité ».

**Réfs.** branche `feat/e2-st4-lot-b`, correctifs de revue du lot B.

---

## L-039 · Un test de mutation à une valeur NEUTRE mesure l'identité, pas le mécanisme qu'il prétend couvrir — et un commentaire `🔴` peut nommer le mauvais défaut voisin

**Symptôme.** Un test de E2-ST4 lot C portait un commentaire `🔴` l'annonçant comme le filet de la
**propagation** d'un décalage de numérotation. La mutation correspondante restait **verte** : le test
fermait en réalité la **descente**, pas la **propagation**. Cause exacte : le harnais travaillait à
un décalage **neutre** (0), la seule valeur où la descente compense exactement l'absence de
propagation — le test mesurait donc une tautologie sans le savoir. Corollaire trouvé dans le même
lot : deux compteurs séparés (`lignes`, `paires`) portaient chacun leur propre cas limite ; le jumeau
non testé laissait vivre une mutation qui aurait renuméroté les exemples d'une leçon publiée.

**Règle.** (1) Vérifier qu'une mutation rougit **ne suffit pas** — il faut vérifier **quelle**
mutation précise elle attrape, en confrontant le commentaire `🔴` au mécanisme réellement frappé
(prolongement direct de [[L-010]] sur un axe neuf : la mutation a bien frappé sa cible, mais la
cible n'était pas celle annoncée). (2) Un test qui prétend couvrir une **propagation** doit travailler
à une valeur **non neutre** — à la valeur neutre, un mécanisme absent et un mécanisme présent
produisent la même sortie. (3) « Deux compteurs séparés » veut dire « deux fois le même cas limite à
écrire », jamais un seul test partagé par accident.

**Réfs.** E2-ST4 lot C ; compteurs `lignes`/`paires` de `compter-lignes.mjs` (cf. [[L-037]]) ;
revue `code-reviewer`, branche `feat/e2-st4-lot-c`.

---

## L-040 · Le titre d'un test est lu par la CI, l'en-tête ne l'est par personne — un titre qui affirme un ABSOLU ne peut pas se contenter d'une condition structurelle

**Symptôme.** Un test s'appelait « AUCUN arrêt mort dans un bloc de code », mais définissait « mort »
**structurellement** (absence de contenu défilable au sens du DOM à une largeur de test) — par
construction, il ne pouvait pas voir un arrêt mort **fonctionnel**. À 1280 px, la largeur réellement
servie, huit régions portaient un `tabindex="0"` sans rien à faire défiler : mort au sens fonctionnel,
invisible au test qui se croyait exhaustif sur la base de son propre titre.

**Règle.** Un titre de test qui affirme un absolu (« AUCUN », « TOUJOURS », « JAMAIS ») doit soit
couvrir réellement cet absolu, soit se retitrer sur la condition qu'il vérifie vraiment — jamais
l'inverse (garder le titre large et espérer qu'un commentaire nuance, cf. [[L-016]]/[[L-008]]).
Correctif retenu, à reproduire : retitrer sur la revendication réelle **et** faire *imprimer* le fait
mesuré au journal de test (répond à [[L-005]] : un vert n'est plus ambigu si le journal porte le
chiffre), plutôt que de le figer dans un commentaire que personne ne relit. Cousine de [[L-018]] (une
assertion vérifie ce qu'elle vérifie, pas ce que son nom suggère) sur l'axe **titre** plutôt que
l'axe **portée**.

**Réfs.** E2-ST4 lot C ; test des arrêts clavier des défileurs de bloc de code, largeur 1280 px ;
branche `feat/e2-st4-lot-c`.

---

## L-041 · Sous la CSP servie, l'écriture CSSOM de propriété par propriété (`.style.top`, `.setProperty`, `.cssText`) est APPLIQUÉE sans violation — seuls `setAttribute('style', …)` et un `<style>` inline non haché sont refusés, et ces deux-là sont rapportés. Dans un spec de ce dépôt, on ne déplace RIEN par une écriture d'attribut/bloc `style`, mais l'écriture CSSOM reste un canal ouvert

> **🔴 CORRIGÉE le 2026-08-19 (E2-ST5, lot c2).** La version d'origine de cette leçon affirmait la
> cause **inverse** de la réalité mesurée : elle disait qu'une écriture CSSOM était acceptée en DOM
> mais jamais appliquée, sans violation. C'était un **artefact de la propriété sondée**
> (`top` sur un élément `position: static`, où `top` n'a structurellement aucun effet), pas un
> comportement de la CSP — rejouée avec une propriété qui se résout inconditionnellement
> (`padding-top`), l'écriture CSSOM **s'applique bel et bien**. Détail de la mesure contradictoire :
> `.claude/lessons/security-lessons.md` **S-016** (source de vérité pour l'axe sécurité — ne pas la
> redupliquer ici).

**Symptôme d'origine (faux, gardé pour mémoire du piège).** Un brief proposait de pousser un élément
hors de la fenêtre visible par CSSOM (`el.style.top = '-200px'`), en supposant qu'une écriture CSSOM
échappe à `style-src`. La première mesure semblait confirmer une conclusion **encore plus étrange** —
« accepté en DOM, jamais appliqué, sans violation » — et c'est CETTE conclusion qui était fausse : le
témoin choisi (`top` sur du `position: static`) ne pouvait jamais bouger, CSP ou pas.

**Ce que la mesure du lot c2 établit (juste).** Deux canaux distincts, deux comportements distincts :
(1) `setAttribute('style', '…')` et un `<style>` inline non haché sont **refusés** (l'effet
n'apparaît jamais dans `getComputedStyle`) **et rapportés** (`style-src-attr`/`style-src-elem`
via `securitypolicyviolation`) ; (2) `element.style.setProperty(…)` / `.cssText` / une propriété CSSOM
directe sont **appliqués**, sans aucun événement — la directive `style-src` gouverne l'**analyse d'un
texte de déclaration**, pas les accesseurs de `CSSStyleDeclaration`.

**Règle.** Dans un spec de ce dépôt, **ne jamais déplacer un élément par `setAttribute('style', …)`
ou un `<style>` inline** pour simuler un état sous la CSP servie — c'est bien bloqué, mais un test
qui espérait un déplacement s'y casserait pour la bonne raison. À l'inverse, **une écriture CSSOM
directe (`.style.propriete = …`) N'EST PAS bloquée par cette CSP** : ne pas s'appuyer dessus comme
contre-exemple de sécurité, et utiliser le **défilement** réel (`scrollIntoView`, `scrollTo`) pour
chasser un élément hors champ dans un test WCAG 2.4.11 — c'est de toute façon le vrai mode d'échec
visé. Cousine de [[L-019]] (un contrôle négatif seul ne prouve rien sans contrôle positif) : la
version d'origine de cette leçon-même en était la victime — un « rien observé » pris pour un refus
de politique plutôt que pour l'inertie d'une propriété mal choisie.

**Conséquence de sécurité, à retenir de l'épisode.** `style-src` ferme l'**injection** de style (un
`<style>`/`style="…"` glissé dans du contenu) — exactement la surface d'un site de contenu compilé —
mais **ne ferme pas** le restylage d'un script **déjà en cours d'exécution** via les accesseurs
CSSOM. Écrire « la CSP interdit tout style dynamique » serait une garantie surestimée (famille S-009).
Détail et mesures : S-016.

**Sur le choix de la propriété témoin de la sonde** (`top` en `position: static`, puis
`outline-offset` sans `outline-style`, tous deux structurellement inertes ici — indépendamment de
toute CSP) : voir **[[L-025]]**, qui porte désormais cette règle sous un titre qui ne nomme pas la
CSP, pour rester trouvable par une sonde de contraste/géométrie/focus qui n'a rien à voir avec ce
dossier.

**Réfs.** E2-ST4 lot C (mesure d'origine, fausse) ; E2-ST5 lot c2 (mesure correctrice) ;
`e2e/aides/sonde-csp.ts` (`exigerStyleSrcApplique`/`mesurerStyleSrc`) ;
`e2e/simulation-sous-csp.spec.ts` ; `.claude/lessons/security-lessons.md` **S-016** ; garde-fous CSP
`style-src` (`.claude/rules/security.md` §1) ; branches `feat/e2-st4-lot-c` et `feat/e2-st5-lot-c2`.

---

## L-042 · Un test qui lance un processus fils sans délai explicite hérite du délai par défaut du runner — une marge qui rétrécit à chaque test ajouté ailleurs, et le lot qui la fait déborder n'est pas celui qui l'a écrite

**Symptôme.** Un test préexistant de `src/pipeline-contenu-compilation.spec.ts` (« le TEXTE du code
ne peut pas fabriquer une ancre ») lance un processus fils **sans `DELAI` explicite** — alors que son
voisin immédiat documente déjà ce piège et pose un délai. Le test était sain, le produit aussi : il a
expiré au bout de 5 s (délai par défaut de Vitest) seulement une fois la suite alourdie par le lot
a d'E2-ST5, qui n'a rien changé à ce fichier. Un test rouge sur un produit sain, imputable à un lot
qui n'y touche pas.

**Règle.** Tout test qui lance un processus fils (`execFileSync`, `spawnSync`…) pose un **délai
explicite**, jamais le défaut du runner — le défaut est une ressource partagée par toute la suite, et
elle rétrécit à mesure que le dépôt grossit. Copier le patron du voisin qui le fait déjà plutôt que
de le découvrir à l'échéance. Cousine de [[L-005]]/[[L-032]] sur un axe neuf : ici ce n'est pas un
outil qui masque une directive, c'est un **budget de temps implicite** que personne n'a nommé.

**Réfs.** `src/pipeline-contenu-compilation.spec.ts` ; branche E2-ST5 lots a/b1.

---

## L-043 · Un garde-fou qui balaie du texte source ne distingue pas un USAGE d'une MENTION — nommer l'interdiction dans un commentaire déclenche l'interdiction

**Symptôme.** Le garde-fou de portée du sanitizer interdit toute occurrence de `bypassSecurityTrust*`
dans `src/**` non-spec. En écrivant l'en-tête d'un composant, formuler l'interdiction en la nommant
(« jamais `bypassSecurityTrust*` ici ») **fait rougir G-test** — le grep du garde-fou ne sait pas
qu'une mention en commentaire n'est pas un appel. Le composant a dû formuler l'interdiction sans
prononcer le nom, comme `quiz.ts` le fait déjà.

**Règle.** Sur ce dépôt, tout garde-fou qui balaie un **motif de texte** (pas un AST) dans du code
source traite une mention et un usage identiquement — le savoir avant d'écrire un commentaire qui cite
la chose interdite : reformuler sans le nom exact (paraphrase, ou pointeur vers le fichier qui porte
déjà la règle) plutôt que découvrir le rougissement après coup. Cousine de la famille sécurité
« liste noire de motifs sur un format structuré » (S-001/S-003/S-009/S-014,
`.claude/rules/security.md` §4), mais sur un axe non sécuritaire : ici le garde-fou est correct dans
son intention, c'est son **support** (texte brut plutôt qu'AST) qui ne sait pas lire l'intention d'un
commentaire.

**Réfs.** garde-fou de portée du sanitizer (grep `bypassSecurityTrust*` sur `src/**`) ;
`src/app/features/cours/quiz/quiz.ts` (le patron qui évite déjà de nommer) ; branche E2-ST5 lots a/b1.

---

## L-044 · Une garde d'exhaustivité `satisfies never` se pose sur le DISCRIMINANT, jamais sur l'objet — une interface à champ union n'est pas une union d'interfaces

**Symptôme.** Une revue a prescrit `acteur satisfies never` dans la branche `default` d'un `switch`
censé fermer l'exhaustivité sur les types d'acteur d'une simulation. Ça ne compile jamais :
`ActeurSimulation` est une **interface à champ union** (`{ type: 'a' | 'b' | …, … }`), pas une
**union discriminée d'interfaces** — un `switch (acteur.type)` ne rétrécit que le **champ** `type`,
jamais l'objet entier, qui reste `ActeurSimulation` de bout en bout. La forme juste est
`acteur.type satisfies never`. Le piège : devant l'erreur de compilation, le réflexe naturel est de
**retirer la garde**, ce qui restaure exactement le défaut d'origine — un commentaire qui promet une
exhaustivité que le code n'applique plus (famille S-009).

**Règle.** Avant de poser `x satisfies never` en branche `default`, vérifier si le type de `x` est
une **union discriminée** (le `switch` rétrécit `x` lui-même) ou une **interface à champ union** (le
`switch` ne rétrécit que le champ) — dans le second cas, la garde se pose sur `x.champDiscriminant`,
jamais sur `x`. Contrôle positif à deux sondes, à répéter pour toute garde de ce genre : le nombre de
cas actuel compile à 0 erreur, un cas neuf ajouté au type produit `TS1360` **à la ligne de la
garde**. Cousine de [[L-013]] (seule une sonde bidirectionnelle fait foi) sur l'axe TypeScript.

**Réfs.** `SimulationComponent`, modèle `ActeurSimulation` ; branche E2-ST5 lot b1.

---

## L-045 · Un périmètre de lot qui EXCLUT un gate ne peut pas voir les régressions que ce gate attrape ailleurs sur la page

**Symptôme.** Le lot b2 (E2-ST5) a inséré `SimulationComponent` entre le quiz et le pied de page —
son brief excluait explicitement G-e2e du périmètre du lot (sortie lourde, cf.
`.claude/rules/agent-context-budget.md` §4). Conséquence non vue avant le lot **suivant** :
l'assertion « Tab après *Corriger* → lien GitHub » de `e2e/parcours-clavier-quiz.spec.ts` est passée
**rouge sur un dépôt sain**, parce que l'ordre de tabulation est une propriété de la **page**, pas du
composant inséré — et personne n'avait de gate actif pour le voir au moment de l'insertion.

**Règle.** Câbler un composant nouveau **dans** une page existante est un changement qui touche
structurellement les voisins de tabulation, de focus et d'ordre DOM de **tout** ce qui l'entoure —
même quand le lot qui l'exécute a, à raison, sorti G-e2e complet de son périmètre pour tenir son
budget de contexte. Le geste : le lot d'insertion lance au minimum les specs e2e **du fichier
voisin le plus proche** (ici `parcours-clavier-quiz.spec.ts`) avant de clore, même si la suite
complète reste pour un agent de vérification séparé. Cousine de [[L-035]] (une prémisse de test
fausse rougit sur un produit sain) sur un axe inverse : ici c'est le **produit** qui a changé sous
un test resté juste, faute d'avoir été rejoué au bon moment.

**Réfs.** `e2e/parcours-clavier-quiz.spec.ts` ; `SimulationComponent`, câblage de page ; branche
E2-ST5 lot b2.

---

## L-046 · Un contrôle d'exhaustivité ne vaut que pour le CORPUS qu'on lui a donné — il conclura à l'absence chaque fois qu'une source légitime manque, même sur un fait exact

**Symptôme.** Deux passes de vérification indépendantes de la fusion KB (E3-ST0) ont signalé des
dates d'évaluation et un titre de séance comme « absents du plan de cours, à retirer ». Les deux
avaient raison sur leur **mesure** (le fait n'était bien pas dans le `.docx` du plan) et tort sur
leur **conclusion** : ces faits vivaient sur la **page web du cours**, une source qu'aucune des deux
passes n'avait reçue. Le correctif « évident » (retirer ce qui semble non sourcé) aurait supprimé
trois dates exactes.

**Règle.** Un contrôle d'exhaustivité/de sourçage n'a de sens que relatif à un **corpus déclaré** —
avant de lancer une passe de vérification qui peut conclure à une absence, **inventorier
explicitement les sources dans le brief** (toutes, pas seulement la plus évidente), et faire écrire
la source retenue dans le document vérifié pour qu'une passe suivante ne re-signale pas le même
« manque ». « Absent du corpus qu'on m'a donné » et « faux » sont deux conclusions différentes ;
un vérificateur qui les confond sur-corrige. Cousine de [[L-029]] (un contrôle positif ne prouve que
les chemins qu'il contient) sur l'axe **sourçage** plutôt que **cas de test**.

**Réfs.** passe E3-ST0 (fusion des fiches KB du cours du cégep) ; dates d'évaluation et titre de
séance retrouvés sur la page web du cours plutôt que dans le plan `.docx`.

---

## L-047 · Le budget de contexte d'une passe de fusion/synthèse se dimensionne au VOLUME DE SOURCE à lire, jamais au nombre de livrables promis

**Symptôme.** Des lots de fusion KB annoncés « 4 fiches » et « 6 fiches » ont fini à 250k, 244k, 277k
et 249k tokens — au-delà du maximum absolu de `.claude/rules/agent-context-budget.md` §0 — parce que
la variable qui pilotait réellement le coût était le **corpus source** : 230 à 298 diapositives, et
jusqu'à 47 captures d'écran ouvertes **une par une**. Les lots dimensionnés par corpus plutôt que par
compte de fiches (23 diapositives, 2 fiches) ont fini à 113k et 105k — sous le seuil visé.

**Règle.** Pour une passe de fusion/synthèse/lecture de source externe (diaporamas, captures, PDF),
le découpage en lots (§2 de `.claude/rules/agent-context-budget.md`) se fait sur le **volume à
lire** (nombre de diapositives, de pages, d'images à ouvrir), jamais sur le nombre de livrables
attendus en sortie — deux livrables peuvent cacher 300 diapositives, ou vingt. Avant de brief er un
lot de fusion, compter le corpus source de chaque fiche visée et répartir en conséquence. **Signal
pour `.claude/rules/agent-context-budget.md`** : ajouter ce critère de découpe (volume de source, pas
compte de livrables) à côté du « test du + » existant.

**Réfs.** passe E3-ST0 (fusion des fiches KB du cours du cégep, lots à 4-6 fiches) ;
`.claude/rules/agent-context-budget.md` §0, §2.

**Addendum (2026-08-20) — la même faute HORS fusion KB, sur des lots de CODE : trois dépassements
dans une seule session.** Trois sous-agents du lot d'intermittence pré-E3-ST1 ont fini à **179k,
195k et 186k** tokens, au-delà du maximum de 150k, sur des lots qui *paraissaient* bornés. Cause
commune, sans détour : le brief cumulait « **diagnostic + correctif + contrôle positif + campagne
de stabilité** », ou « **compilateur + validateur + fixtures + test d'appariement** ». Le **test du
« + »** de `.claude/rules/agent-context-budget.md` §2 l'interdisait explicitement ; le coordinateur
ne l'a pas appliqué. **C'est un défaut de brief, jamais un défaut d'agent** — un sous-agent ne peut
pas se `/compact` lui-même, son isolation vient entièrement du périmètre qu'on lui donne. La leçon
d'origine parlait de volume de **source à lire** ; celle-ci ajoute le volume de **phases à
traverser** : une phase de diagnostic (mesures, campagnes, journaux) est un livrable entier, elle ne
se greffe pas au lot qui applique le correctif. **Quatrième point de mesure, le même jour** : le lot
de correctifs de revue à **sept constats** a fini à **212k**. Sept constats dans un seul brief, c'est
le test du « + » ignoré une fois de plus — par le même coordinateur, **après** l'avoir écrit. Un
constat de revue est déjà un brief autonome (`fichier:ligne` + correctif) : ils se répartissent, ils
ne s'empilent pas.

---

## L-048 · Un job CI sans `timeout-minutes` ne rougit jamais quand il pend — il court jusqu'au plafond de six heures, et le mode d'échec est le SILENCE, pas le rouge

**Symptôme.** Le 2026-08-19, l'étape « Installer le navigateur » de `ci.yml` a pendu 53 min sur un
premier essai puis 12+ min sur un second, alors que le run entier tenait en 2 min 12 s la veille.
Aucun des trois workflows du dépôt (`ci.yml`, `deploy.yml`, `infra.yml`) ne posait
`timeout-minutes` sur ses jobs : un job pendu n'échoue pas, il continue jusqu'au plafond GitHub de
**six heures**. Rien ne distingue « la CI travaille encore » de « la CI est morte » — le
propriétaire a attendu 50 minutes un signal qui ne serait jamais venu.

**Règle.** Poser `timeout-minutes` sur **chaque** job de **chaque** workflow, borné à un multiple
raisonnable de la durée mesurée du run sain (ici : quelques minutes, pas des heures) — et faire
tenir cette borne par un test qui l'exige, une absence de borne ne faisant rougir aucun run tant
qu'elle n'est pas franchie. Même famille que [[L-008]]/[[L-016]] (une garantie qui n'existe nulle
part d'exécutable ne protège rien) sur un axe neuf : ici ce n'est pas une contrepartie de
conception qui manque, c'est une **borne de temps**.

**Réfs.** `.github/workflows/ci.yml`, `deploy.yml`, `infra.yml` ; `src/workflows-github.spec.ts` ;
runs GitHub `32224090384` (blocage) et `32264319046` (récidive au déploiement).

---

## L-049 · Une étape CI qui fait DEUX choses sous un seul nom est indiagnosticable quand elle pend — scinder est un acte de diagnostic, et le journal de la panne peut contenir sa propre parade

**Symptôme.** `playwright install --with-deps chromium` combine un `apt-get` en root **et** un
téléchargement de binaire CDN sous un seul nom d'étape. Quand elle a pendu (2026-08-19), le journal
n'avait **rien écrit** : impossible de savoir laquelle des deux opérations bloquait. Scindée en deux
étapes nommées, chacune avec son propre délai, le journal a nommé le coupable au run suivant :
`azure.archive.ubuntu.com` servait 21 Mo à ~27 ko/s. Ce même journal contenait aussi la parade : les
bibliothèques partagées de Chromium étaient déjà toutes présentes (« already the newest version »),
et les 21 Mo lents n'étaient que **neuf paquets de polices non latines** (japonais, thaï, chinois,
cyrillique) — inutiles sur un site français dont les diagrammes sont français. La dépendance flaky
n'était pas seulement fragile, elle était superflue.

**Règle.** Quand une étape opaque échoue ou pend, la **scinder en sous-étapes nommées** (chacune
avec son délai, cf. [[L-048]]) est un geste de diagnostic, pas de cosmétique — un journal vide ne
dit rien, un journal par sous-étape nomme le coupable. Et avant de fiabiliser une dépendance
flaky (réessais, cache, délai plus long), **lire ce qu'elle apporte réellement** : la meilleure
parade à un téléchargement fragile est souvent de constater qu'on n'en a pas besoin (ici : exclure
les paquets de polices non nécessaires à un contenu francophone plutôt que blinder leur
téléchargement).

**Réfs.** `.github/workflows/ci.yml` (étape « Installer le navigateur ») ;
`src/pipeline-contenu-orchestration.spec.ts` ; runs GitHub `32224090384` et `32264319046`.

---

## L-050 · Un gate d'architecture livré ROUGE dans le même lot qui crée la première violation reste rouge en silence tant que chaque agent ne lance que SON spec

**Symptôme.** `src/regles-architecture.spec.ts` (le gate « aucune feature n'importe une autre
feature », posé par la bascule D-4/E6) a été livré **rouge** dans le lot même qui a créé l'arête
`cours/sommaire → cours` : le composant de sommaire l'a introduite, mais le gate ne la connaissait
pas encore et l'a signalée comme violation. Il est resté rouge pendant **deux lots** sans qu'aucun
agent ne le remarque, parce que chaque agent, respectant son budget de contexte, ne lançait que
**son propre** spec — jamais `npm test` en entier. Le mode d'échec n'est pas le rouge : c'est le
**silence** d'un rouge que personne ne regarde. Le risque symétrique et pire : le premier agent qui
le rencontre est tenté d'assouplir la règle d'architecture plutôt que de comprendre pourquoi elle
mord, ce qui viderait le gate de son sens au moment précis où il vient de naître.

**Règle.** Tout gate neuf **d'architecture ou de portée** (pas seulement un gate de contenu/build)
doit être **vu échouer une fois puis passer une fois** dans le lot même qui l'introduit — un
contrôle positif ET négatif exercés au même moment que la création du gate, jamais après coup. Et
tant qu'un gate transversal (qui peut être cassé par un lot qui ne le sait pas toucher) vient d'être
posé, le fil principal (pas chaque agent isolé) lance la suite complète après **chaque** lot qui
touche à la surface qu'il garde, jusqu'à ce que deux ou trois lots consécutifs le laissent vert sans
intervention. Cousine de [[L-005]] (un run vert ne prouve pas qu'une vérification a tourné) et de
[[L-019]] (un contrôle négatif seul ne prouve rien sans contrôle positif) sur un axe neuf : ici ce
n'est ni l'ambiguïté d'un vert ni l'absence de contrôle positif qui est en cause, mais le **moment**
où le contrôle positif doit être exercé — au lot de naissance du gate, pas plus tard.

**Réfs.** `src/regles-architecture.spec.ts` ; E2-ST6 (Sommaire du cours & progression), composant
`cours/sommaire`.

---

## L-051 · `ng test --include=<glob>` restreint les specs exécutées, jamais le TYPECHECK — un lot qui change une signature publique ne compile son propre spec qu'une fois les appelants du lot suivant compilent aussi

**Symptôme.** Le compilateur Angular type-vérifie **tout le programme** avant de lancer quoi que ce
soit, `--include` ne filtrant que la sélection des specs à *exécuter*. Un lot d'E2-ST6 qui changeait
une signature publique (service de progression) restait donc rouge même en ciblant son propre spec
via `--include`, tant que les appelants d'un lot **suivant**, pas encore écrits/alignés, ne
compilaient pas. L'agent a d'abord conclu à tort que son propre lot était en faute.

**Règle.** Sur ce dépôt, `ng test --include=<glob>` ne dispense jamais de la compilation de
l'ensemble du programme — un lot qui change une signature publique consommée ailleurs peut rester
rouge pour une raison hors de son périmètre. Parade validée : appliquer un correctif d'arité
**temporaire** aux appelants non encore alignés, mesurer que le lot propre passe, puis
`git checkout --` sur les fichiers hors périmètre — mais **seulement** sur des fichiers qu'on n'a
soi-même pas modifiés, sous peine de répéter [[L-038]] (`git checkout --` sur un arbre sale efface
le travail non commité). Corollaire mesuré au passage : `--include="…/dossier/**"` ramasse aussi les
fichiers **source** comme suites de test (« No test suite found ») — viser nommément les
`*.spec.ts`.

**Réfs.** E2-ST6, lot du service de progression ; [[L-038]].

---

## L-052 · Isoler un spec Angular hors du builder officiel exige `--globals` — les globals de test viennent du builder, pas d'un `vitest.config.ts`

**Symptôme.** `npx vitest run <spec>` seul échoue avec `describe is not defined` sur ce dépôt : il
n'y a pas de `vitest.config.ts` à la racine, les globals (`describe`, `it`, `expect`…) sont fournis
par le builder `@angular/build:unit-test` (`npm test`), pas par Vitest en configuration autonome.

**Règle.** Pour isoler un spec Vitest en dehors de `npm test`/`ng test` sur ce dépôt, appeler
`npx vitest run --globals <spec>` — jamais `npx vitest run <spec>` seul.

**Réfs.** E2-ST6 (isolation d'un spec pendant un diagnostic).

---

## L-053 · Une fixture partagée entre specs est un contrat implicite — ajouter une donnée peut casser des assertions hors du périmètre du lot qui l'ajoute

**Symptôme.** Ajouter une deuxième leçon à la fixture témoin (pour tester le sommaire multi-leçons
d'E2-ST6) a cassé 4 assertions de `lecon.spec.ts`, hors périmètre du lot : elles posaient « la
fixture ne porte qu'une leçon » comme prémisse implicite, jamais écrite. Même famille que [[L-035]]
(une prémisse de test fausse rougit sur un produit sain) : ici la prémisse fausse ne tenait pas dans
le spec qui a changé le produit, mais dans un spec **voisin**, silencieux sur sa propre dépendance à
la forme de la fixture partagée.

**Règle.** Avant d'enrichir une fixture partagée (ajouter une leçon, un module, une entrée), chercher
qui d'autre la consomme (`Grep` sur son chemin) et vérifier si un compte, un ordre ou une unicité y
est présumé sans être énoncé — traiter ça comme une extension de [[L-035]], pas comme un cas neuf :
fusionné ici plutôt que dupliqué.

**Réfs.** `lecon.spec.ts` ; fixture témoin (`tools/content-pipeline/__fixtures__/temoin/…`) ;
E2-ST6 ; [[L-035]].

---

## L-054 · Une fixture de test qui alimente un champ soumis à une ÉNUMÉRATION de schéma avec une valeur HORS CONTRAT certifie l'inverse de la réalité

**Symptôme.** `sommaire.spec.ts` alimentait son manifeste avec `niveau: 'debutant' |
'intermediaire' | 'avance'` — trois valeurs **absentes** de l'énumération réelle du contrat
(`maternelle|primaire|secondaire|cegep|universite`). Le test nommé « rend le niveau en français,
jamais la valeur de schéma brute » passait **vert** sur des données qui ne peuvent jamais exister en
production, pendant que le composant réel était **cassé sur 100 % des lignes réelles** — il aurait
affiché la valeur brute `cegep` en vitrine dès la première leçon publiée. Le seul gate dédié à ce
défaut certifiait donc l'**inverse** de la réalité, et aucun gate futur ne l'aurait attrapé : le
champ est typé `string` dans `types.d.ts`, le typage ne pouvait rien dire. **Répété deux fois dans
le même lot** — même valeur fantôme reprise dans `page-sommaire-securite-web.spec.ts`, copiée d'un
spec à l'autre sans que la seconde occurrence ne soit questionnée.

**Règle.** Une fixture de test qui alimente un champ soumis à une énumération de schéma doit
employer une valeur **de cette énumération**, jamais une valeur plausible inventée — et cette
contrainte se **vérifie** (comparer aux valeurs réelles du schéma/contrat au moment d'écrire la
fixture, ou faire porter un type dérivé du schéma sur la fixture elle-même plutôt qu'un `string`
libre), elle ne se relit pas à l'œil. Cousine de [[L-010]] (un test de mutation doit vérifier qu'il
a frappé sa cible) et de [[L-012]] (un test qui importe la constante qu'il vérifie ne vérifie rien
du contrat) : ici l'axe est un troisième — une fixture peut être **syntaxiquement valide et
sémantiquement fausse**, hors du domaine de valeurs que le vrai contrat autorise, sans qu'aucun
typage large (`string`) ne le signale.

**Réfs.** `sommaire.spec.ts` ; `page-sommaire-securite-web.spec.ts` ; contrat de schéma (énumération
`niveau`) ; E2-ST6.

---

## L-055 · `PLATFORM_ID: 'server'` NE FERME PLUS `afterNextRender` depuis Angular ≥ 19 — le drapeau consulté est le global `ngServerMode`, pas le jeton de plateforme

**Symptôme.** Mesuré dans `core.mjs` : `afterNextRender` teste
`if (typeof ngServerMode !== 'undefined' && ngServerMode) return NOOP_AFTER_RENDER_REF` — le
drapeau réellement consulté est le **global `ngServerMode`**, plus l'injection de `PLATFORM_ID`. Un
test qui pose `PLATFORM_ID: 'server'` en croyant simuler le contexte de prerender voit le
`afterNextRender` du composant s'exécuter **quand même**, et rougit sur un composant sain — variante
de [[L-035]] (une prémisse de test fausse rougit sur un produit sain), où la prémisse fausse porte
ici sur le **mécanisme de simulation de plateforme** lui-même.

**Règle.** Pour simuler réellement le contexte serveur/prerender face à `afterNextRender` sur ce
dépôt (Angular 22), poser `globalThis.ngServerMode = true` avant le test et le **retirer en
`finally`** — `PLATFORM_ID: 'server'` seul ne suffit plus depuis Angular ≥ 19. Rattaché au dossier
[[L-033]] (hydratation/pré-hydratation d'Angular sur ce dépôt) : même terrain, piège voisin.

**Réfs.** `core.mjs` (bibliothèque Angular, mesure directe du drapeau) ; E2-ST6 ; [[L-033]] ;
[[L-035]].

---

**Addendum à [[L-047]] (2026-08-19, répétition constatée en E2-ST6).** La même faute de
dimensionnement s'est reproduite **deux fois dans la même session**, mais sur un axe différent de
son origine (E3-ST0, corpus de diaporamas) : ici les briefs étaient dimensionnés au **nombre de
livrables** (« 3 composants + 3 specs ») plutôt qu'au **volume de source à lire**, et deux agents ont
dépassé le plafond (**207k** et **234k**) — un lot « 3 composants + 3 specs » dont un seul spec fait
1119 lignes n'est pas un petit lot. Contre-preuve dans la même session : dès que les briefs suivants
ont porté des **plages de lignes exactes** au lieu du fichier entier, les agents sont retombés à
**112k** et **117k**. Ne se fusionne pas en une leçon neuve — L-047 couvrait déjà le principe
(volume de source, pas compte de livrables) ; cet addendum étend le constat au cas où la « source »
lourde est un fichier du dépôt lui-même (un spec existant volumineux), pas un corpus externe.
**⚠️ Seuils à jour, plus stricts depuis le 2026-08-19** (`.claude/rules/agent-context-budget.md`,
`~/.claude/CLAUDE.md`) : **120k visé / 150k gros maximum / 200k exceptionnel à justifier** — les
chiffres antérieurs (150k/200k/250k) cités ailleurs dans ce fichier sont désormais **périmés**, ne
pas les reproduire dans une leçon neuve.

---

## L-056 · Le lot de dette sécurité pré-E3-ST1 (4 PR, 2 Critiques + 8 Majeurs) : AUCUN défaut n'était de logique — tous étaient des défauts de PREUVE. Une question unique les couvre tous : « ce test/cette mesure aurait-il échoué dans les conditions exactes où l'échec doit se produire ? »

**Symptôme.** Sur les PR #27-#30 (dette S-003 : garde-fou de motif `style=`, CSP servie comparée
structurellement, portée du sceau d'artéfact, épinglage `Azure/static-web-apps-deploy@v1`), toutes
les revues ont trouvé des analyseurs **justes**, des listes blanches **nominatives**, des refus
**fail-closed** — et malgré ça 2 Critiques et 8 Majeurs, tous du même patron : le garde-fou ne
faisait pas ce que son test prétendait prouver. C'est [[S-003]] (« ce garde-fou ne prouve pas qu'il a
tout vu ») un cran plus haut : la même question s'applique aux **tests qui gardent les garde-fous**.

**Variantes mesurées, chacune une déclinaison d'une leçon déjà ouverte — aucune n'est un cas neuf :**
- Une charge de contournement ou un contrôle de suppression de dépendance non rejoués contre l'état
  **avant correctif** → addendum [[L-036]].
- Une fixture **plus pauvre que le réel** (`element.content` supposé objet alors qu'il est une
  **chaîne** sur `<meta name="viewport">` en production) : 15 tests verts sur un générateur incapable
  de tourner en production. Le revers compte autant : ne pas enrichir une fixture **au-delà** du
  réel non plus — une branche morte en production doit rester documentée comme morte, pas simulée
  vivante. Cousine de [[L-046]] (un contrôle n'a de sens que relatif à un corpus déclaré) et de
  [[L-035]] (une prémisse de test fausse rougit — ici c'est l'inverse : une fixture trop optimiste
  laisse passer un produit cassé).
- Une **dérivation qui réimplémente la production** (le test recomptait les blocs Mermaid au lieu
  d'appeler `extraireDiagrammes`, en ignorant les suffixes d'info-string) : divergence silencieuse,
  suite entière verte. Variante directe de [[L-034]] (mutualiser une vérification déplace le
  risque) côté inverse — ici c'est l'**absence** de mutualisation qui a laissé deux vérités diverger.
- Une clause déclarée « inatteignable » sur la seule foi des entrées imaginées
  (`trim() === ''` ne couvre pas `";"`) : la bonne réponse est un test qui **atteint** la clause, pas
  sa suppression — suivre le constat tel quel aurait supprimé un garde-fou vivant. Cousine de
  [[L-029]] (une règle appliquée par accident disparaît quand on refactorise l'accident sans avoir
  nommé ce qu'elle refusait).
- Trois occurrences, **dans le même lot**, d'une boucle `for … if (introuvable) continue` qui se
  saute elle-même : partir de la liste **filtrée** et l'assertionner non vide plutôt que de boucler
  sur une collection dont les absences se taisent. Variante de [[L-019]] (un contrôle négatif seul
  ne prouve rien sans contrôle positif).
- Remplacer un balayage de texte brut par un parcours du **DOM** (`querySelectorAll('*')`) rétrécit
  le périmètre sans le dire — `<template>.content` n'est pas descendu. Tout passage motif → analyseur
  (le patron prescrit par `.claude/rules/security.md` §4) doit poser un contrôle de **conservation**
  pour la branche migrée, sinon le gain de rigueur (liste blanche) cache une perte de portée.
- Un garde-fou textuel à portée fichier qui accuse sa **propre prose** : un commentaire
  d'avertissement citant `npm run e2e:install` en exemple d'interdit a fait rougir le test qui
  interdit ce script. Variante de [[L-043]] (un garde-fou par motif ne distingue pas un usage d'une
  mention) — ici sur un script CI plutôt qu'un appel de sanitizer ; on reformule la **prose**, jamais
  la portée du garde-fou.
- Un commentaire qui **sous-estime** une garantie est aussi faux qu'un qui la surestime : « `gates`
  ne revérifie rien » était faux (le cache repasse par l'analyseur) et invite à poser une protection
  redondante qui existe déjà — symétrique de [[L-016]]/S-009 (une justification qui promet plus que
  le code n'applique), sur l'axe inverse : ici la prose promettait **moins**.
- `build.mjs` refuse un `--sortie` hors dépôt, mais **après** avoir rendu les diagrammes — le run
  échoué peuple quand même le cache. Un refus fail-closed n'est complet que s'il est aussi
  **atomique** : un effet de bord qui survit à un échec est une preuve manquante de plus, pas
  seulement un défaut de propreté.

**Règle.** Avant de déclarer un garde-fou de sécurité (ou son test) fermé, poser explicitement la
question sur laquelle toutes ces variantes échouent : **« cette preuve tournerait-elle, et
échouerait-elle bien, dans les conditions exactes qu'elle prétend couvrir — l'ancien code, la
machine sans la dépendance, le DOM réel, la liste non filtrée, l'entrée hostile réelle ? »** Un
analyseur juste et une liste blanche nominative ne suffisent pas si le harnais qui les garde peut
répondre vert sans jamais avoir traversé le chemin qu'il prétend garder — c'est exactement le
niveau où [[S-003]] déplace le doute pour ce lot : de l'analyseur vers son propre test.

**Réfs.** PR #27, #28, #29, #30 (lot de dette sécurité pré-E3-ST1) ; `.claude/lessons/security-lessons.md`
**S-003** ; [[L-036]], [[L-034]], [[L-029]], [[L-019]], [[L-043]], [[L-016]], [[L-046]], [[L-035]] ;
`.claude/rules/security.md` §4.

---

## L-057 · Une assertion sur une VALEUR lue par une `page.evaluate` unique n'est jamais réessayée — c'est la vraie cause de l'intermittence e2e, pas l'hydratation

**Symptôme.** `e2e/parcours-clavier-simulation.spec.ts:210` et `e2e/simulation-mecanique.spec.ts:298`
échouaient par intermittence depuis des semaines (`etat.courante` = 1 au lieu de 4, étapes visibles
`[1,2,4,5,6]` au lieu d'aucune), sur du code produit inchangé. Le dépôt attribuait ça à l'hydratation
via [[L-033]] — **réfuté par la mesure** (voir le bloc de réfutation de [[L-033]] : `ngh="7"` présent,
armement 8/8, 20 gestes émis à l'instant du retour de `attendreHydratation`, 0 perdu).

**Cause réelle, générale.** Playwright réessaie les **locators**, jamais la **valeur** rendue par une
`page.evaluate` ponctuelle : elle est lue une fois et l'assertion tranche dessus. Or l'effet d'un
geste est peint sur une frame **ultérieure** (détection de changements zoneless planifiée). Mesuré :
effet au DOM à 26-407 ms, lecture servie à 112-938 ms — une marge de 58-856 ms **garantie par rien** ;
sur 800 essais, une lecture CDP est servie **avant** un `requestAnimationFrame` déjà planifié
**3 fois (0,4 %)**. 15 lectures de ce type existaient dans 3 specs.

**Règle.** Entre un geste et une lecture ponctuelle (`page.evaluate`, `elementHandle.evaluate`),
poser une **barrière de locator auto-réessayée** (`expect(locator).toHaveText/toBeVisible`, ou
`expect.poll`) qui atteste que l'effet est peint — la lecture de valeur ne vient qu'après.
**⚠️ Corollaire à ne pas rater : une barrière ne précède JAMAIS une assertion NÉGATIVE** (« aucune
étape visible », « rien n'a bougé ») — elle serait vraie dès le prerender et donnerait l'apparence
d'avoir fermé une course encore ouverte. Pour un négatif, il faut d'abord attendre un **positif
observable** du même geste.

**⚠️ Méthode, aussi durable que la règle.** Le journal CI a tranché **sans relance** : le test avait
bouclé en 2,0 s **sans délai d'expiration**, ce qui prouve une lecture périmée et exclut un événement
perdu ou une attente non satisfaite. **On vérifie l'assertion et le journal, jamais l'étiquette du
test** — « c'est le flaky connu » est le raisonnement qui tue un gate (famille [[L-005]], addendum
« un run vert ne referme pas une panne intermittente »).

**Réfs.** `e2e/parcours-clavier-simulation.spec.ts`, `e2e/simulation-mecanique.spec.ts`,
`e2e/quiz-pre-hydratation.spec.ts` ; branche `fix/intermittence-gates-pre-e3-st1` ; [[L-033]] (réfutée
sur cet axe), [[L-021]] (lire un style calculé sec ment), [[L-005]].

---

## L-058 · Ajouter un nom accessible à un `<aside>` ne le nomme pas — ça le PROMEUT en repère, et un gabarit répétable fabrique alors des repères homonymes

**Symptôme.** Un `[attr.aria-label]` posé « pour aider le lecteur d'écran » sur un `<aside>` d'un
gabarit **répétable** (encadrés de leçon) a fait échouer la règle axe **`landmark-unique`**. Mécanisme
du rôle implicite : sous `<section>`/`<article>`, un `aside` est `generic` **sans** nom accessible, et
**`complementary`** — donc un repère de page — **avec**. Le nom ne décore pas l'élément, il change son
rôle. Mesuré avec axe-core 4.13 : aucun nom → 0 violation ; deux `aside` de même nom → `landmark-unique`
×1 ; deux noms distincts → 0 violation.

**Règle.** Sur tout élément dont le rôle implicite dépend de la présence d'un nom accessible
(`aside`, `section`, `form`, `nav` imbriqué), ne pas ajouter `aria-label`/`aria-labelledby` « au cas
où » : soit le nom est **unique par instance**, soit on ne nomme pas. Sur un gabarit qui se répète ou
se récurse, un nom **constant** est fautif par construction. **Cousine directe de [[L-026]]** (une
clef de cache indexée sur le contenu se répète dès que le contenu se répète) : *la même récursivité
qui interdit l'`id` en dur interdit aussi le nom accessible constant* — dans les deux cas, une valeur
qui doit être unique dans le document est dérivée de quelque chose qui ne l'est pas.

**Réfs.** rendu des encadrés de leçon (`rendu-blocs`) ; `tools/a11y/verifier-axe.mjs` (axe-core 4.13,
`landmark-unique` actif — aucun `runOnly` ne la filtre) ; [[L-026]].

---

## L-059 · Une fixture « un exemplaire de chaque » ne peut JAMAIS exercer une règle d'UNICITÉ — le contrôle positif d'une telle règle exige un DOUBLON

**Symptôme.** Corollaire de [[L-058]], et c'est ce qui a rendu le gate aveugle : la fixture témoin
portait **un** exemplaire de chaque variante d'encadré. La règle `landmark-unique` était donc
**structurellement inatteignable** — le gate axe tournait bel et bien, sur un corpus incapable de
produire le symptôme. Le défaut n'est apparu qu'en contenu réel, où deux encadrés de même variante se
suivent.

**Règle.** Toute règle de la forme « X doit être unique dans le document » (identifiants, noms de
repères, ancres, clefs de progression) exige une fixture qui contient **deux instances** de X, sinon
le gate est vert par inaccessibilité de son cas. Généralisation : une fixture de couverture se
dimensionne sur les **règles à exercer**, pas sur les **variantes à représenter** — « une de chaque »
couvre le rendu, jamais les propriétés relationnelles. Même famille que [[L-019]] et l'addendum
E2-ST1 de [[L-007]] : un contrôle positif inexécutable est une intention, pas un gate.

**Réfs.** `tools/content-pipeline/__fixtures__/temoin/` ; `tools/a11y/verifier-axe.mjs` ;
[[L-058]], [[L-019]], [[L-007]].

---

## L-060 · Un garde-fou de COLLECTION neuf frappe d'abord les données EXISTANTES — recenser les racines déjà porteuses du statut avant d'écrire la règle

**Symptôme.** La règle G2 (« toute leçon publiée porte au moins un encadré de provenance ») a été
écrite comme une exigence sur le contenu **à venir**. Elle a immédiatement rendu **invalide la
fixture-témoin de la CI elle-même** : 13 tests rouges, une seule cause. Effet de bord plus retors :
une fixture volontairement invalide s'est mise à porter **deux** fautes au lieu d'une, violant le
contrat que ce corpus s'était donné (« un dossier = une faute »), donc rendant indistinguable la
cause que le test voulait prouver.

**Règle.** Avant d'écrire une règle conditionnée à un **statut** (`statut: publie`, `visible`,
`actif`…), **recenser les racines qui portent déjà ce statut** — `content/`, mais aussi les fixtures,
les corpus de test, les artéfacts de démonstration — et décider explicitement, dans le même lot, si
chacune est mise en conformité ou exclue du périmètre. Corollaire pour les corpus de fixtures
invalides : un dossier ne doit rester porteur que de **la** faute qu'il illustre ; une règle neuve qui
lui en ajoute une seconde se corrige côté fixture, jamais en relâchant la règle.

**Réfs.** règle G2 de provenance (📘/🧩/⚠️) ; `tools/content-pipeline/__fixtures__/` ;
`.claude/rules/contenu-pedagogique.md` §6 ; cousine [[L-053]] (une fixture partagée est un contrat
implicite).

---

## L-061 · Deux agents ne partagent pas un arbre de travail quand l'un lance des gates — un `content:build` concurrent purge `src/content-generated/`

**Symptôme.** Payé **deux fois** dans la même session. (1) Un `npm run content:build` lancé par un
agent **purge `src/content-generated/`** pendant qu'un autre agent compile : `TS2307: Cannot find
module '…/manifeste-routes.json'` — un message qui **n'accuse pas sa cause** et envoie chercher un
défaut d'import inexistant. (2) Un lot à moitié appliqué par un agent parallèle fait rougir le
typecheck d'un autre, sur un fichier qui ne lui appartient pas — l'agent innocent débogue le travail
d'un tiers.

**Règle.** Quand plusieurs agents travaillent dans le **même** arbre : périmètres de fichiers
**disjoints**, **et** un seul agent autorisé à lancer les gates lourds (`content:build`, `build`,
`test`, `e2e`) à la fois. Le coordinateur prévient explicitement les autres des **rouges attendus qui
ne sont pas les leurs**. Cousine de la note « worktree sans `node_modules` » : l'isolation par
worktree coûte les dépendances, l'arbre partagé coûte les gates — il n'existe pas d'option gratuite,
il faut choisir laquelle payer **avant** de lancer les agents.

**Réfs.** `src/content-generated/` (répertoire régénéré, gitignoré) ; `tools/content-pipeline/build.mjs` ;
mémoire du propriétaire « worktree sans node_modules » ; `.claude/rules/agent-context-budget.md` §6.

---

## L-062 · L'instrument accuse le produit — deux cas neufs : une feuille racine-absolue en `file://`, et un harnais de MUTATION muet sur CRLF

**Symptôme (a).** Une mesure de `forced-colors: active` a rapporté « aucune bordure nulle part » :
l'instrument, pas le produit. Une feuille de style référencée en **racine-absolue** (`/styles…`) ne se
résout pas sous `file://` ; tous les jetons `var()` deviennent indéfinis, donc toute déclaration qui en
contient une est *invalid-at-computed-value-time* et retombe à `border: none`. **Il faut servir en
HTTP** (`npx swa start` sur l'artéfact) pour toute mesure de style calculé.

**Symptôme (b).** [[L-015]] (CRLF sur ce poste) a mordu sur un **harnais de mutation** : deux
`perl -0pi` ancrés sur `\n` n'ont rien muté sur des fichiers CRLF, et les mutations ont d'abord été
rapportées « **vertes** » — c'est-à-dire qu'un test réputé mordant a été déclaré sain **sans avoir
jamais été éprouvé**. Exactement [[L-010]], sur un harnais outillé plutôt qu'un `String.replace` isolé :
l'outillage n'immunise pas contre la faute qu'il automatise, il la répète plus vite. **Et il a remordu
le MÊME JOUR**, dans le lot de correctifs de revue qui a suivi : une mutation de plus déclarée
« verte » sans s'être appliquée. La parade (vérifier que le motif a frappé) n'était donc pas encore un
réflexe au moment où elle venait d'être écrite — signal qu'elle appartient à l'outillage, pas à la
vigilance (même verdict que [[L-023]]).

**Règle.** (a) Une mesure de style/rendu se fait sur une page **servie en HTTP**, jamais ouverte en
`file://` — sinon on mesure la résolution des URL, pas le CSS. (b) **Tout harnais de mutation vérifie
que son motif s'est réellement appliqué** avant de juger le gate : `if (!s.includes(motif)) throw`, ou
comparaison avant/après sur la zone visée. Un « vert » de mutation non instrumenté n'est pas une
preuve, c'est un silence. Famille [[L-025]] / [[L-035]] : l'instrument défaillant accuse toujours le
produit, jamais lui-même.

**Réfs.** mesure `forced-colors: active` (E6, dette de contraste) ; harnais de mutation du lot
d'intermittence ; [[L-010]], [[L-015]], [[L-019]], [[L-025]], [[L-035]].

---

## L-063 · Un invariant que rien n'observe n'est pas vrai — il est INDÉTERMINÉ

**Symptôme.** Le validateur de contenu construisait un « arbre des conteneurs », présenté comme le
garant du comptage des encadrés **à travers la récursion**. Deux constats, dans cet ordre.
**(1) Aucune sortie ne pouvait le contredire** : la fonction de comptage visitait tous les nœuds, et
chaque ouverture produit exactement un nœud — le compte de l'arbre égalait donc le **compte plat**
des lignes d'ouverture pour **tout** document, imbriqué ou non. Aucune fixture, existante ou
imaginable, ne distinguait les deux implémentations. **(2) Et il était faux** : sur
`::: a` / `:::: b` / `:::`, markdown-it-container ferme `a` (une fermeture de longueur ≥ ouverture
ferme), alors que la pile ne dépilait rien. Une structure écrite « pour la rigueur » portait donc une
garantie que **rien ne mesurait**, *et* se trompait, sans qu'aucun test ne puisse le révéler.

**Règle.** Avant d'écrire une structure ou un invariant « pour la rigueur », **nommer la sortie
observable qui le distinguerait d'une version naïve**. Si cette sortie n'existe pas, la structure
n'ajoute aucune garantie — elle ajoute de la **surface** et une occasion de se tromper en silence. Et
quand le cas se présente, le correctif par défaut est de **retirer** l'invariant non observable et de
rendre la propriété structurelle (ici : la profondeur), pas de réparer ce que personne ne regarde.

**Cousines, et l'axe neuf.** La famille est déjà peuplée : [[L-019]] (contrôle positif inexécutable —
axe **câblage**), [[L-039]] (test vert **par compensation**, mutation survivante à 573 tests — axe
**valeur d'essai neutre**), [[L-059]] (fixture « un de chaque » incapable d'exercer une règle
d'unicité — axe **cardinalité du corpus**). L'axe neuf ici est l'**observabilité de l'invariant
lui-même** : même avec un test câblé, une valeur non neutre et un corpus riche, deux implémentations
indiscernables en sortie ne se départagent par aucun test.

**Réfs.** `tools/content-pipeline/valider.mjs` (arbre des conteneurs, retiré) ; markdown-it-container
(règle « fermeture de longueur ≥ ouverture ») ; lot de correctifs de revue du 2026-08-20 ;
[[L-019]], [[L-039]], [[L-059]].

---

## L-064 · Un gate qui remplace un littéral par une mesure doit mesurer LE MÊME PRÉDICAT que le garde qu'il protège — pas un proxy voisin

**Symptôme.** Deux occurrences dans le même lot (E3-ST1). `capacitesPubliees()`
(`src/workflows-github.spec.ts`) comptait `existsSync('quiz.json')`, là où `e2e/aides/artefact-mesure.ts`
cherche `<app-quiz` **rendu dans le HTML prerendu** — une leçon gardant son `quiz.json` mais perdant
son ancre `[[quiz]]` dans le Markdown laissait le gate de couverture **vert** pendant que 4 specs e2e
sautaient en silence. Et trois copies de `lireQuizSource()` **devinaient** le dossier source en
retirant `^\d+-` du slug, là où `sommaire.spec.ts` **lit le frontmatter** pour la même information.

**Règle.** Quand un gate remplace un littéral fragile par une mesure « plus honnête », vérifier
qu'elle porte sur **la même couche d'observation** que le mécanisme qu'elle protège — présence d'un
fichier source n'est pas présence dans le rendu compilé ; deviner un chemin n'est pas le lire à sa
source déclarée. Cousine de [[S-022]] (« la couche d'observation d'un contrôle de contenu est un
choix, pas un détail ») appliquée ici à un gate de **couverture** plutôt qu'à un balayage de sécurité,
et de [[L-012]] (un test doit lire le contrat à sa vraie source, pas le deviner).

**Réfs.** `src/workflows-github.spec.ts` (`capacitesPubliees`) ; `e2e/aides/artefact-mesure.ts` ;
`lireQuizSource()` (3 copies) ; `sommaire.spec.ts` ; PR #32, E3-ST1.

---

## L-065 · Un spec e2e calibré sur une fixture peut épingler un inventaire ÉDITORIAL — préférer une égalité DOM ↔ source de contenu à un compte en dur

**Symptôme.** Un recalibrage e2e a montré qu'un gate d'accessibilité mécanique n'a besoin de citer
aucun titre de bloc ni aucun compte fixe : compter les éléments dans le DOM et vérifier l'**égalité**
avec le compte extrait indépendamment de la source de contenu suffit. La forme antérieure (compte en
dur, titres cités) transformait un gate mécanique en dette à échéance connue — tout `content/` qui
grossit finit par le faire rougir sur un désaccord purement éditorial, sans rapport avec
l'accessibilité réelle.

**Règle.** Un spec e2e qui vérifie une propriété mécanique (nombre d'éléments, ordre de tabulation,
présence d'un rôle) sur du contenu qui va grossir compare **deux mesures indépendantes** (DOM rendu
vs source de contenu), jamais une mesure contre un littéral figé au moment de l'écriture. Cousine de
[[L-053]] (une fixture partagée est un contrat implicite) sur l'axe inverse : ici la parade est de
**dérober** le test à la forme exacte de la fixture plutôt que de documenter la dépendance.

**Réfs.** specs e2e recalibrés du lot E3-ST1 ; [[L-053]].

---

## L-066 · `toContainText(chaîne)` normalise les blancs (`\s+` → espace, U+00A0 inclus) — une insécable ne se prouve qu'en RegExp

**Symptôme.** Deux specs Playwright promettaient, en commentaire nourri, de vérifier la présence
d'une espace insécable U+00A0 (contrainte dure de `.claude/rules/contenu-pedagogique.md` §3) via
`toContainText('texte :')` — assertion qui **ne peut jamais échouer** sur ce point précis,
`toContainText` normalisant tout `\s` (dont U+00A0) en un espace simple avant comparaison.

**Règle.** Toute assertion Playwright censée distinguer une espace **spéciale** (U+00A0, U+202F,
U+2009) d'une espace ordinaire passe par une **RegExp non normalisante**
(`toHaveText(/texte :/)` ou lecture brute du texte), jamais par `toContainText` sur une chaîne.
Cousine de [[L-008]] (une garantie qui ne vit que dans un commentaire ne protège rien) : ici la
garantie était bien dans le **code** du test, mais l'API choisie ne pouvait matériellement pas la
tenir.

**Réfs.** specs e2e du lot E3-ST1 vérifiant U+00A0 ; `.claude/rules/contenu-pedagogique.md` §3 ;
[[L-008]].

---

## L-067 · Une anti-vacuité peut être TAUTOLOGIQUE — `toBe(SOURCE.length)` après une boucle qui pousse un élément par itération de SOURCE ne peut jamais échouer

**Symptôme.** `expect(mesures.length).toBe(SOURCE.length)`, écrit pour attraper une boucle qui
sauterait des éléments en silence, était construit sur une boucle qui pousse exactement un élément
par itération de `SOURCE` — l'égalité est vraie **par construction**, y compris à 0 élément
(`0 === 0`), exactement le cas dégénéré que le message d'intention annonçait attraper. Prouvé par
mutation : aucune mutation de la boucle ne le fait rougir.

**Règle.** Un `toBe(N)` censé prouver une non-vacuité s'accompagne d'un `toBeGreaterThan(0)`
**séparé** — le patron correct existe déjà ailleurs dans ce dépôt (`defileurs-clavier.spec.ts`).
Avant de faire confiance à une égalité de compte comme garde contre le saut silencieux, vérifier
qu'elle peut réellement valoir 0 sans que le test le remarque. Cousine de [[L-063]] (un invariant que
rien n'observe n'est pas vrai, il est indéterminé) et de [[L-039]] (test vert par compensation) : ici
l'axe est la **tautologie algébrique**, un troisième mode de « rien ne peut faire rougir ce test ».

**Réfs.** lot E3-ST1 (test de mutation) ; `defileurs-clavier.spec.ts` (bon patron) ; [[L-063]],
[[L-039]].

---

## L-068 · Une règle DUPLIQUÉE par une frontière structurelle (tsconfig, e2e isolé) doit couvrir TOUTES ses copies dans son contrôle de parité, pas seulement les plus accessibles

**Symptôme.** La règle de découpage des lignes de code existe en **3 exemplaires**
(`quiz.ts::decouperLignesDeCode()`, `valider.mjs`, `e2e/aides/quiz-source.ts`) parce que
`tsconfig.e2e.json` interdit structurellement à l'e2e d'importer le composant — la duplication
n'est pas de la paresse, elle est imposée par la frontière. `src/compter-lignes-parite.spec.ts`,
le contrôle censé garder les copies synchrones, n'en couvrait que **deux**.

**Règle.** Quand une frontière du dépôt (tsconfig, package, worktree) **force** la duplication d'une
règle plutôt que de la permettre par erreur, chercher explicitement **toutes** les copies (grep du
nom de fonction/de la logique) avant d'écrire le test de parité — une duplication structurelle a
plus de chances d'avoir une troisième copie oubliée qu'une duplication accidentelle. Cousine de
[[L-013]]/[[L-020]] (une promesse de synchronisation qui grandit doit faire grandir son test dans le
même diff) : ici c'est le recensement initial, pas la croissance, qui a manqué une copie.

**Réfs.** `src/app/**/quiz.ts` (`decouperLignesDeCode`) ; `tools/content-pipeline/valider.mjs` ;
`e2e/aides/quiz-source.ts` ; `src/compter-lignes-parite.spec.ts` ; `tsconfig.e2e.json`.

---

## L-069 · `CLAUDE.md` est capturé au démarrage de session — un sous-agent lancé ensuite hérite de cet instantané, pas du fichier au disque

**Symptôme.** Un test d'introspection posait deux sentinelles dans `CLAUDE.md` (une en commentaire
HTML, une en texte brut) pour observer si un mécanisme donné relisait le fichier. Les **deux** sont
revenues absentes — mais la sentinelle en texte brut était le **contrôle négatif** : son absence
prouvait que le fichier testé n'avait simplement pas été relu depuis le disque à ce moment-là, donc
l'absence de l'autre sentinelle ne prouvait **rien** sur le mécanisme réellement visé. Conclusion
utile trouvée en creusant : `CLAUDE.md` est lu au **démarrage de session**, et tout sous-agent lancé
ensuite dans cette même session travaille sur cet **instantané**, pas sur une relecture live.

**Règle.** Avant de conclure d'un test d'introspection sur ce qu'un agent « voit » d'un fichier
d'instructions, vérifier que le contrôle négatif (une sentinelle dont l'absence isolée signerait un
problème d'instrument, pas de mécanisme) a lui-même réussi — sinon l'échec du contrôle positif
n'est pas interprétable. Corollaire propre à ce dépôt : un changement de `CLAUDE.md` en cours de
session ne se propage à un sous-agent **qu'au prochain démarrage de session**, jamais en cours de
route. Cousine directe de [[L-062]] (« l'instrument accuse le produit »).

**Réfs.** test d'introspection du lot E3-ST1 (sentinelles `CLAUDE.md`) ; [[L-062]].

---

**Addendum à [[L-015]] (2026-08-20, lot E3-ST1) — sur ce poste, `Set-Content -Encoding utf8`
(PowerShell 5.1) écrit un BOM, même sur un JSON.** Restaurer `package.json` après une mutation de
test avec cette commande a fait échouer **silencieusement** `JSON.parse` dans plusieurs specs : 77
tests non collectés, un run rapportant « 790 skipped » **sans message de cause**. Même famille que
[[L-015]] (une transformation de texte sur ce poste ment sur ce qu'elle a écrit) sur un troisième axe
après CRLF et l'expansion `$VAR` : l'**encodage**. Règle commune aux trois : les mutations posées et
retirées sur un fichier de ce dépôt (JSON, YAML, source) passent par **Node** (`fs.writeFileSync`) ou
`git checkout --`, jamais par `Set-Content` en PowerShell 5.1, qui BOM-préfixe même en `-Encoding
utf8`.

**Réfs addendum.** lot de correctifs E3-ST1 (restauration de `package.json` après mutation) ;
[[L-015]].

---

## L-070 · Un commentaire qui promet « hors périmètre » ou « pas encore » ment dès que le MÊME lot fait le travail qu'il annonçait comme futur

**Symptôme.** Trois occurrences dans le même lot (E6). `accueil.ts` renvoyait à « un lot e2e » pour
des specs **modifiées dans le même diff**. `police-jalon.spec.ts` livrait un garde-fou en `it.skip`
« à activer quand les trois emplois existeront » — les trois emplois étaient **posés dans le même
commit**. `design-system.spec.ts` justifiait un retrait en pointant une source **supprimée dans le
même commit**. Les trois commentaires étaient vrais au moment où la main les a écrits (au début du
lot) et faux au moment où le lot a fini — personne n'est repassé les relire.

**Règle.** Au dernier geste d'un lot, relire **tous les commentaires qui contiennent un futur** («
doivent être », « quand », « à activer », « pas encore », « un lot ultérieur », « hors périmètre ») et
vérifier qu'ils décrivent encore un état vrai au moment du commit — sinon les corriger ou les retirer.
Corollaire côté **brief** : un coordinateur qui demande d'écrire un garde-fou **désactivé** en
promettant « les emplois viendront au lot suivant » doit lui-même prévoir le geste qui le rallume —
un garde-fou livré éteint ne garde rien, et rien dans le processus ne rappelle de le rallumer si ce
n'est écrit nulle part comme tâche de clôture.

**Réfs.** `src/app/pages/accueil/accueil.ts` ; `src/app/…/police-jalon.spec.ts` ;
`src/app/pages/accueil/design-system.spec.ts` — lot E6 « Moniteur ambre », 2026-08-20.

---

## L-071 · Une propriété CSS DÉCLARÉE deux fois (une base, une surcharge) ne prouve rien sur laquelle GAGNE — et un garde-fou qui compte un motif dans une source compte aussi ses commentaires

**Symptôme.** `src/styles.scss` posait `color-scheme: light dark` et `_themes.scss` posait
`color-scheme: dark`. `styles.scss` important `_themes.scss` par `@use`, ses propres règles sont
écrites **après** : à spécificité égale, `light dark` gagnait — le site annonçait au navigateur un
mode clair possible malgré une phase 1 sombre seule. Le test existant n'assertionnait que la
**présence** de la chaîne `color-scheme: dark` quelque part dans la feuille compilée : il restait
**vert** sur cette régression, la chaîne étant bien là, juste perdante. Second défaut du même lot, sur
le correctif lui-même : une assertion « plus aucun `prefers-color-scheme` » rougissait sur une feuille
saine, parce que le **commentaire qui explique le correctif** cite forcément le motif qu'il supprime.

**Règle.** (a) Mesurer ce qui est **appliqué** (CSS compilé résolu, style calculé, pixel peint),
jamais ce qui est **déclaré quelque part** — un garde-fou juste ici est « `color-scheme` apparaît une
seule fois hors `@media print` », pas « `color-scheme: dark` est présent ». Cousine de [[L-021]]
(un `getComputedStyle` sec ment) et [[L-025]] (un style calculé correct ne prouve pas un pixel peint),
sur un axe neuf : ici c'est la **spécificité/l'ordre de deux déclarations concurrentes**, pas le
délai d'une transition. (b) Un garde-fou qui compte un motif dans un fichier source doit d'abord
**décommenter** avant de compter, ou distinguer contenu actif et commentaire explicatif — même
patron que le garde-fou de police du jalon (cf. `police-jalon.spec.ts`).

**Réfs.** `src/styles.scss` ; `src/styles/_themes.scss` — lot E6 « Moniteur ambre », 2026-08-20.

---

## L-072 · jsdom 28 n'expose plus `matchMedia`/`requestAnimationFrame`/`ResizeObserver` — un test qui les pose sans doublure lève sur l'INSTRUMENT, jamais sur le produit

**Symptôme.** `vi.spyOn(window, 'matchMedia')` lève dans ce dépôt : jsdom 28 ne fournit plus
`matchMedia` par défaut (ni `requestAnimationFrame`, ni `ResizeObserver`) — `spyOn` ne peut pas
espionner une méthode absente. Deuxième piège dans le même lot : un test qui **compte** les appels à
un effet global (`requestAnimationFrame`, `setTimeout`) attribue au composant testé le bruit de
l'ordonnanceur **zoneless** d'Angular, qui pose son propre `rAF` indépendamment du composant.

**Règle.** (a) Sur ce dépôt, une doublure de `matchMedia`/`rAF`/`ResizeObserver` s'installe **par
affectation directe** (`window.matchMedia = vi.fn(...)`), jamais par `vi.spyOn` sur une méthode que
jsdom n'a jamais fournie — et se restaure explicitement en fin de test (`restoreAllMocks` ne défait
pas une affectation directe, seulement un spy). (b) Pour mesurer un effet qu'un composant seul
déclenche, mesurer sur une doublure ce que **le composant** touche, jamais un compteur global partagé
avec l'ordonnanceur du framework. ⚠️ `src/app/core/theme/theme.spec.ts` porte encore un commentaire
affirmant que « jsdom fournit toujours `matchMedia` » — c'est faux depuis jsdom 28, et ce commentaire
enverra le prochain lecteur dans le mur ; à corriger au prochain passage sur ce fichier.

**Réfs.** `src/app/core/theme/theme.spec.ts` — lot E6 « Moniteur ambre », 2026-08-20.

---

## L-073 · Un compte dérivé d'un champ OPTIONNEL du schéma hérite de son optionalité — un `if` qui retire une assertion sur une valeur à zéro ne laisse AUCUNE trace dans la sortie du run

**Symptôme.** `e2e/aides/simulation.ts` dérive `NOMBRE_ETAPES`, `NOMBRE_ACTEURS` et
`NOMBRE_MARQUEURS_DANGER` du `simulation.json` de l'auteur. Les deux premiers sont protégés par une
anti-vacuité qui **lève** si la source est vide. Le troisième vient de `etatVisuel.surbrillance`, un
champ **sans `required`** au schéma : une simulation légale sans surbrillance donne `0`, ce qui rend
`toHaveCount(0)` vraie d'office (variante « invariant indéterminé » de [[L-063]]) — et un
`if (NOMBRE_MARQUEURS_DANGER > 0)` retirait alors l'assertion voisine **sans qu'aucune ligne du run
ne le signale** : ni skip imprimé, ni avertissement, un test simplement absent du compte.

**Règle.** Dériver un compte d'un champ **optionnel** du schéma oblige à choisir explicitement,
au moment où le compte peut tomber à zéro, entre deux gestes qui s'impriment tous deux dans la
sortie : une **garde d'anti-vacuité** qui lève (si la valeur nulle ne devrait structurellement
jamais arriver dans le corpus visé), ou un **`test.skip` conditionnel**, qui s'annonce dans le
rapport (si zéro est un cas légal). Un `if` muet qui retire une assertion est la seule option
interdite — elle est indiscernable d'un test qui n'a jamais existé. Cousine de [[L-019]] (une sonde
qui collecte a besoin d'un contrôle positif) sur un axe amont : ici ce n'est pas l'instrument de
mesure qui manque de preuve, c'est la **source** du compte qui peut légitimement produire l'absence
qu'on croyait garder pour l'anti-vacuité.

**Réfs.** `e2e/aides/simulation.ts` ; branche `feat/e3-st2-st3-lecons`, 2026-08-21.

---

## L-074 · Un commentaire de correctif qui affirme une CAUSE doit l'avoir MESURÉE par retrait, pas inférée du symptôme

**Symptôme.** Un débordement horizontal (`scrollWidth` 1446 pour 1280) a été corrigé par trois
règles CSS, chacune justifiée par un commentaire affirmant sa cause. La deuxième désignait le
`<legend>` comme coupable, sur la foi d'une mesure d'**état** (« enfant le plus large » = 1029 px).
Un regard neuf a contesté l'attribution par arithmétique et l'a signalée comme **inférée, non
mesurée** — famille [[L-063]] (invariant que rien n'observe). Mesure par **retrait, une règle à la
fois** : la règle 2 était **inerte** (retrait → aucun changement, sur les 5 pages) ; les règles 1 et
3 étaient **toutes deux nécessaires, aucune suffisante**. Le `<legend>` à 1029 px était une
**conséquence** — il remplissait la largeur que le parent avait déjà prise — pas la cause.

**Règle.** Une mesure d'**état** (largeur d'un enfant, valeur `getComputedStyle`) ne donne jamais
une causalité ; seule une mesure par **retrait** ou **bascule** (une règle à la fois, effet
observé) la donne. Tout commentaire de correctif qui affirme « c'est X qui cause Y » se vérifie en
retirant X isolément — sinon, écrire « corrèle avec », pas « cause ». Le coût de se tromper n'est
pas le correctif lui-même : c'est le **commentaire**, qui survit et que le prochain lecteur croira
sur parole (cousine de [[L-016]]).
⚠️ **Piège méthodologique attenant** : une première tentative de mesure par retrait/mutation peut ne
rien mesurer du tout et le taire — ici un chemin POSIX passé à `node` sous Windows, puis des
littéraux `\n` contre un fichier en CRLF ([[L-015]]), ont produit un script qui rapportait « 2 → 2 »
en silence. Toute mesure par mutation **imprime la preuve que la mutation a eu lieu** (un diff, un
compte avant/après distinct), sans quoi on mesure la référence en croyant mesurer la variante —
variante de [[L-062]] (l'instrument accuse le produit).

**Réfs.** correctifs de mise en page de la leçon `05-csrf`, revue `code-reviewer` (2026-08-21) ;
[[L-063]], [[L-015]], [[L-016]], [[L-062]].

---

## L-075 · Un bloc de commentaire dont l'en-tête annonce qu'il a été RÉÉCRIT ne doit laisser AUCUN inventaire périmé en dessous

**Symptôme.** `e2e/simulation-sous-csp.spec.ts` porte un bloc en toutes lettres : « CE BLOC A ÉTÉ
RÉÉCRIT, PAS ANNOTÉ … un chiffre de sécurité faux dans un commentaire est ce qui fabrique la
prochaine erreur de compte ». Un correctif y a ajouté une note **au-dessus** en laissant
l'inventaire faux **en dessous** — quatre valeurs périmées, dont « `injection` porte le 14ᵉ
hachage, et elle seule » alors que trois pages le portent désormais. Le prochain lecteur recompose
l'ancien inventaire, pas le neuf, parce que les deux coexistent dans le même bloc.

**Règle.** Un lot qui touche un bloc de commentaire s'annonçant lui-même comme « réécrit, pas
annoté » **réécrit** — il ne superpose pas une addition à un inventaire qu'il rend faux. Avant
d'ajouter une note à un bloc de ce type, relire s'il reste des valeurs que la note vient de
périmer, et les corriger dans le même geste. Cousine de [[L-008]] (une garantie qui ne vit que dans
un commentaire ne protège rien) sur l'axe inverse : ici le commentaire protégeait quelque chose,
mais deux versions concurrentes du même fait cohabitaient.

**Réfs.** `e2e/simulation-sous-csp.spec.ts` ; correctifs de la leçon `05-csrf` (2026-08-21) ;
constat nommé par `code-reviewer` ; [[L-008]].

---

(les prochaines leçons seront ajoutées ici par l'agent mentor au fil des cycles de livraison)
