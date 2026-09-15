# ⏭️ REPRISE — Cours PHP, séances 1 à 5, format « En bref » (ouverte le 2026-09-10)

> **À lire en premier dans toute session qui reprend ce chantier.** Ce fichier n'est PAS
> auto-injecté : `CLAUDE.md` n'en portera qu'une ligne de pointeur, délibérément — un bloc de
> reprise qui accumule l'historique d'un épic est payé par **chaque agent de chaque session**
> (`.claude/rules/agent-context-budget.md` §7).
>
> Il **succède** à [`reprise-refonte-lecons.md`](reprise-refonte-lecons.md) sans le remplacer : la
> refonte « leçons actionnables » du cours de sécurité s'arrête au lot 14 (compteur `5/9`), et la
> priorité passe au cours de PHP. Les lots 15 et suivants de la refonte sécurité sont **différés**,
> pas annulés.

---

## 1 · La demande du propriétaire, telle qu'elle a été faite le 2026-09-10

Constat d'ouverture, à porter au crédit du format existant : **le « En bref » des quatre premiers
modules de sécurité et l'amorce du projet LAMP sont « presque exactement » ce qui était cherché**,
renvois de diapositives compris. Ce qui suit corrige, il ne repart pas de zéro.

1. **La priorité passe au cours de PHP, séances 1 à 5.**
2. **Seule la section « En bref » compte pour l'instant.** Le reste de chaque module peut rester au
   minimum : un sommaire bref de la section, orienté **étapes / commandes / actions / exemples de
   code**. Les longs développements théoriques, les quiz et les sections complémentaires sont
   **hors périmètre** pour ce chantier.
3. **🔴 LE DÉFAUT À CORRIGER : les « En bref » écrits jusqu'ici ne distinguent pas la voie du cours
   de la bonne pratique moderne.** Les deux vivent dans la même phrase. Il faut une **distinction
   visuelle** : un pas-à-pas séparé quand l'écart est majeur, une annotation en ligne appuyée
   quand il est mineur.
4. **Concis mais précis.** Pas de longues phrases. En revanche, chaque commande ou bloc de code
   porte **deux formes** : une **générique**, où *chaque paramètre est expliqué*, et une
   **concrète**, ancrée au poste de travail réel du propriétaire. Le motif de référence est la
   capture qu'il a jointe (`ssh-keygen -t ed25519 -C "…"`) — le format et les commentaires étaient
   bons, mais `-t` et `-C` n'étaient **pas expliqués**, et rien ne disait si la valeur finale prend
   des guillemets.
5. **Le public visé est un débutant en Linux, en PHP et en sécurité applicative.** La théorie garde
   sa place, mais elle ne doit jamais être le seul chemin vers l'action.
6. **Ces corrections s'appliqueront rétroactivement aux leçons déjà écrites** — d'où cette
   replanification. PHP d'abord.
7. Commit, push, PR et fusion autorisés si la CI est verte.

---

## 2 · Les décisions rendues le 2026-09-10 — elles font foi

Trois questions ont été posées au propriétaire sur une maquette rendue
(<https://claude.ai/code/artifact/95a2a8c9-d972-47eb-b210-197bf5cdca00>), qui affichait les trois
formats candidats sur **le même** contenu.

**D-PHP-1 · Le format de la distinction est A, avec C en repli.**
« A » est le conteneur d'onglets `:::: methodes` **déjà en production** (radios CSS pures, décision
D-C du 2026-08-31, quatre conteneurs livrés, mesuré en e2e et en contraste forcé). « C » est un
marquage d'étape — liseré coloré **plus étiquette écrite** — pour les cas où des onglets ne
conviennent pas au contexte. Formulation du propriétaire : *« Lorsque possible utilise A, sinon si
vraiment plus convenable au contexte utilise C. »*
⚠️ **Le liseré seul ne suffit jamais** : il disparaît en `forced-colors: active`. L'étiquette
écrite est le canal qui porte le sens (leçon du lot 11, famille R-8).
⚠️ **La clause de rédaction de D-C reste en vigueur, et elle a été enfreinte aux trois premiers
conteneurs sur quatre** : un volet masqué ne doit **jamais** contenir le seul exemplaire d'un fait.
La parade qui a marché au lot 14 est d'imposer **l'ordre d'écriture** — la prose visible d'abord,
avec tout ce qui doit être trouvable au `Ctrl+F` ; les volets ne gardent que la suite de gestes.

**D-PHP-2 · La plomberie « second cours » passe AVANT l'écriture du contenu.**
Le propriétaire a choisi que PHP soit **en ligne** avant qu'on y écrive les modules, plutôt que
d'accumuler des `lecon.md` que le validateur ne peut pas juger.

**D-PHP-3 · L'environnement de référence est WAMP, version « Admin », sur le poste du Cégep.**
🔴 **La diapositive 33 du Cours 1 ment sur ce point** — elle dit qu'il *faudra peut-être* la version
Admin ; le propriétaire a vérifié : **elle est installée et utilisable**. Et la diapositive 26 dit
que XAMPP est interdit sur les postes du Cégep. Les exemples concrets se font donc sur WAMP.

---

## 3 · 🔴 CE QUI MANQUE ENCORE — les chemins absolus du poste de travail

**Le propriétaire les fournira plus tard.** D'ici là, **aucun exemple concret ne s'invente** : un
chemin faux est pire qu'un chemin absent, parce qu'il se recopie tel quel dans un terminal.
✅ **P-1 et P-3 sont fournis et confirmés (2026-09-11)** — voir le tableau. Il reste **P-2, P-4, P-5,
P-6 et P-7**.

**La règle en attendant :** tout exemple concret porte un marqueur `à-vérifier:` (interdit en
`statut: publiee` par `valider.mjs` §6, ce qui **bloque mécaniquement** la publication d'un module
dont les chemins n'ont pas été confirmés). Un module PHP reste donc en `statut: verifiee` tant que
cette section n'est pas **entièrement** remplie — P-1/P-3 seuls ne lèvent pas le blocage.

| # | Ce qu'il faut | Valeur | Statut |
|---|---|---|---|
| P-1 | Racine du dossier personnel de l'étudiant sur le poste du Cégep | `C:\Users\0758510` | ✅ confirmé par le propriétaire (2026-09-11) |
| P-2 | Dossier de travail PHP à l'intérieur de P-1 | ⬜ à fournir | — |
| P-3 | Racine servie par Apache sous WAMP sur ce poste | `C:\wamp64` (racine web `C:\wamp64\www`) | ✅ confirmé par le propriétaire (2026-09-11) — installation 64 bits, comme l'annonçait déjà le Cours 1, diapo 54 |
| P-4 | Port d'écoute d'Apache | ⬜ à fournir | `80`, ou `8080` si IIS l'occupe (Cours 1, diapos 35-37 et 46-49) |
| P-5 | Nom d'utilisateur / matricule à faire figurer dans les exemples | ⬜ à fournir | — |
| P-6 | Éditeur réellement utilisé | ⬜ à fournir | Notepad++ (Cours 1, diapo 107 et références) |
| P-7 | Les fichiers vont-ils à la racine de `www` ou dans un sous-dossier par exercice ? | ⬜ à fournir | sous-dossier (Cours 1, diapo 45 : `localhost/monSite/`) |

---

## 4 · Ce qui est déjà mesuré — ne pas le remesurer

**Les supports du cours PHP sont extraits et numérotés** dans `php-2026/extraits/` (dossier
**gitignoré** ; `PROVENANCE.md` relevé le 2026-08-31 depuis <https://www.alexandrepetrin.ca/php/>).
Le numéro entre crochets est le **rang de présentation**, celui qu'un renvoi `diapos="…"` doit
citer.

| Séance | Support | Diapositives | Exercices |
|---|---|---:|---:|
| 1 · Introduction à PHP | `Cours01_Introduction_a_PHP_2026.txt` | 111 | 70 l. |
| 2 · Syntaxe PHP (suite) | `Cours02_variablesSuperGlobales_Tableau_Classe.txt` | 60 | 40 l. |
| 3 · La librairie standard PHP | `Cours03_Librairie_PHP.txt` | 74 | 58 l. |
| 4 · Programmation orientée objet | `Cours04_programmation_orientee_objet.txt` | 53 | 56 l. |
| 5 · Intégration de base de données | `Cours05_integration_base_de_donnees.txt` | 73 | 24 l. |

⚠️ **Un extrait de `extraits/` peut être périmé sans que rien ne rougisse** — le dossier est
gitignoré, aucun gate ne le confronte à son `.pptx`. **Réextraire avant de citer une diapositive**
(`tools/supports-cours/extraire-diapositives.mjs`). Et **aucun outil d'agent ne lit un `.pptx`** :
ne jamais en citer un de mémoire, ne jamais envoyer `WebFetch` le lire — il invente plutôt que
d'échouer.

**🔴 Contradiction relevée dans les documents de l'enseignant, non tranchée.** La pondération de
`content/cours/php/horaire.json` (relevée sur le site du cours : Examen 1 à la séance 6, 10 %)
contredit la **diapositive 6 du Cours 1** (« Cours 9 (Examen 1) : 25 % · Cours 11 (Projet de
session) : 15 % · Cours 15 (Examen final) : 60 % »), qui décrit d'ailleurs un calendrier à 15
séances là où l'horaire en compte 13. Même famille que la contradiction déjà consignée pour
420-B10-HU (`docs/contenu/ancrage-au-cours.md` §0) et que celle du projet de session PHP
(`php-2026/extraits/PROVENANCE.md`). **Ne rien affirmer sur la pondération sans marqueur
`à-vérifier:`.**

---

## 5 · L'état du dépôt au moment d'ouvrir ce chantier

- `content/cours/php/` ne contient **qu'`horaire.json`**. Aucun module.
- **Le build ne compile qu'UNE racine** — `tools/content-pipeline/build.mjs:80`
  (`RACINE_PAR_DEFAUT = 'content/cours/securite-web'`) et `:252-295` (`--racine` mono-valué). Le
  manifeste, lui, est **déjà indexé par sujet** (`generer-manifeste.mjs:89` et `:265-290`) : c'est
  l'amont qui bloque, pas la forme de la sortie.
- **Le sujet est écrit en dur dans le routage** — `src/app/app.routes.ts:112-136`,
  `src/app/app.routes.server.ts:79-88`, `page-sommaire-securite-web.ts`, `en-tete.ts:120`.
- **25 fichiers de source** portent `securite-web` en dur, hors `content/`, `docs/`,
  `src/content-generated/` (généré) et `__fixtures__/` (corpus de test), plus 8 fichiers e2e.
- **`valider.mjs:125-133` impose SIX sections** à toute `lecon.md` : « L'idée en une image »,
  « Exemple simple », « Exemple complet », « À toi de jouer », « À retenir », « Aller plus loin ».
  🔴 **« Le reste peut rester vide » n'est donc pas réalisable tel quel** : ces six sections
  existeront, remplies en sommaire bref conformément au point 2 de la demande.
- **La marche à suivre a une place imposée** : `valider.mjs` (`causeDeLaPlaceDeLaMarche`) exige que
  `:::: marche-a-suivre` soit dans la section `##` qui suit **immédiatement** « L'idée en une
  image », et qu'il n'y en ait **qu'une** par leçon.

---

## 6 · Les lots, dans l'ordre

| Lot | Objet | État |
|---|---|---|
| **PHP-0** | Plan d'implémentation de la plomberie « second cours » | ✅ découpage en trois lots, ci-dessous |
| **E7 lot A** | `content:build` compile **plusieurs racines** (`securite-web` + `php`) en une exécution | ✅ PR #69 |
| **E7 lot B** | Les **routes** du cours de PHP, des deux côtés : `cours/php` (sommaire) et `cours/php/:slug` (leçon), résolveur **par cours** | ✅ PR #70 |
| **E7 lot C** | La **navigation** : lien d'en-tête, carte d'accueil, comptes d'arrêts clavier épinglés en e2e | ✅ PR suivante — **la plomberie « second cours » est close** |
| **PHP-A1** | Grammaire d'auteur pour D-PHP-1, **format C** — l'attribut d'étape `{voie="cours"}` / `{voie="moderne"}` : étiquette écrite + liseré, les deux voies toujours visibles | ✅ PR #80 |
| **PHP-A2** | Grammaire d'auteur pour D-PHP-1, **format A** — admettre `:::: methodes` **dans** une étape de marche à suivre, pour une démarche qui diverge vraiment | ⬜ **pas ouvert** |
| **PHP-2** | Séance 1 — Introduction à PHP, LAMP, WAMP, premier script | ✅ **2026-09-14** — `statut: verifiee`, six `à-vérifier:` |
| **PHP-F** | Ouvrir le gate du **format actionnable** au second cours — `CORPUS` en dur sur `securite-web`, et liste indexée par **slug nu** | ⬜ **nommé le 2026-09-13** |
| **PHP-3** | Séance 2 — Syntaxe (suite), superglobales, tableaux, classes | ✅ **2026-09-14** — `statut: verifiee`, cinq `à-vérifier:` |
| **PHP-4** | Séance 3 — Librairie standard | ✅ **2026-09-15** — `statut: verifiee`, quatre `à-vérifier:` |
| **PHP-5** | Séance 4 — Programmation orientée objet | ⬜ |
| **PHP-6** | Séance 5 — Intégration de base de données | ⬜ |
| **PHP-R** | Rétro-application de D-PHP-1 aux cinq modules de sécurité déjà au format actionnable (`11`, `01`, `02`, `03`, `04`) | ⬜ |

### ✅ CLÔTURE — E7 lot B « les routes du cours de PHP » (2026-09-10)

Le découpage de PHP-0 n'avait été écrit nulle part — le PR #69 disait seulement « le premier des
trois lots ». Il est reconstitué ici par mesure du couplage : sur **32 fichiers** portant
`securite-web` hors contenu, presque tous étaient **déjà génériques** (`Sommaire` prend un `sujet`,
la progression est indexée `sujet/slug`, `parametresDePrerender`, `voisinesDe` et `titreDeDocument`
filtrent par cours, et la page de leçon tire son sujet du **frontmatter**, jamais de l'URL). Ce qui
restait en dur tenait en trois points : les deux tables de routes, le résolveur, et la navigation.

🔴 **LE RÉSOLVEUR ÉTAIT AVEUGLE AU COURS, et c'est le seul défaut réel que le lot ait trouvé.**
`resoudreLecon` cherchait le slug parmi les leçons publiées **de tous les cours**. Sans effet tant
qu'une seule route de leçon existait ; avec `cours/php/:slug`, un lien forgé `/cours/php/xss` aurait
monté la leçon de sécurité sous l'URL du cours de PHP, en navigation cliente. Il devient une
fabrique `resoudreLeconDe(sujet)`, dont le filtre **est** `parametresDePrerender` : la route
n'accepte exactement que les URL qu'elle a prerendues — une seule porte. ⚠️ Le spec du résolveur ne
peut pas voir un `resoudreLeconDe('securite-web')` **recopié sur la route de PHP** : c'est
`app.routes.spec.ts` qui exerce chaque résolveur **tel que la table le câble**, contre un manifeste
à deux cours.

🔴 **LE « SECOND ADAPTATEUR DE QUINZE LIGNES » ANNONCÉ PAR E2-ST6 AURAIT COÛTÉ UN HACHAGE CSP.**
Recopier la feuille de `page-sommaire-securite-web.scss` dans un adaptateur PHP produisait un
second bloc `<style>` — même texte, identifiant `_ngcontent` différent — donc un 15ᵉ hachage
`style-src` pour zéro octet de style neuf. Titre, chapô, feuille et montage de `Sommaire` sont
passés dans `CadreSommaire` ; les deux adaptateurs n'ont plus de `styleUrl`. **Le compte reste à
14** ; la **valeur** d'un hachage change (le bloc de l'adaptateur devient celui du cadre, mêmes
règles, identifiant neuf).

Titres d'onglet : les deux sommaires nomment désormais leur cours — deux onglets « Sommaire du
cours » auraient été indiscernables (WCAG 2.4.2), et un test l'exige.

**Le lot C, ce qu'il doit faire et ce qu'il va faire rougir.** Un lien « Développement
d'application en PHP » dans la navigation principale (`en-tete.ts:118-127` et son spec, qui épingle
**deux** destinations) et une `CarteCours` sur l'accueil (sans jauge : `modulesPublies` est
facultatif et une carte sans plan chiffré n'en affiche pas — `carte-cours.ts:110-119`). ⚠️ **Chaque
lien ajouté est un arrêt de tabulation épinglé** : `e2e/focus-visible.spec.ts` (`ARRETS_ATTENDUS =
8`) et `e2e/navigation-clavier.spec.ts` (l'ordre exact, l. 112-143) rougiront, et c'est voulu —
`accueil.spec.ts` l. 141-159 en compte trois sur la page. Les ajuster **dans le même diff**, comme
E6 l'a fait. Et `e2e/aides/artefact-mesure.ts` / `src/format-actionnable.spec.ts` restent bornés à
`securite-web` (dette nommée au PR #69) : à revoir le jour où PHP **publie** une leçon, pas avant.

### ✅ CLÔTURE — E7 lot C « la navigation vers le cours de PHP » (2026-09-10)

Un lien « Développement d’application en PHP » dans la navigation principale (même nom que le
`<h1>` de la page, comme pour la sécurité), et une seconde `CarteCours` sur l'accueil, **sans
jauge**. Sur « / », les arrêts de tabulation passent de **8 à 10**, ajustés dans les trois specs
qui les épinglent (`focus-visible`, `navigation-clavier`, `cibles-pointeur`) et dans
`accueil.spec.ts` (3 → 4 focalisables) — dans le même diff.

⚠️ **`CarteCours` gagne une entrée facultative `libelleAction`.** La carte PHP dit « Voir le
sommaire », pas « Commencer le cours » : un cours sans module ne se commence pas, et deux liens de
**même nom** vers deux destinations obligent l'utilisateur d'une liste de liens à ouvrir chacun
(WCAG 2.4.4) — Playwright l'aurait d'ailleurs refusé en mode strict. `accueil.spec.ts` exige
désormais des noms d'action **distincts**.

⏰ **À revoir le jour où un module de PHP est publié** : le libellé, la description et peut-être une
jauge de la carte PHP (commentaire dans `accueil.ts`), `e2e/aides/artefact-mesure.ts` et
`src/format-actionnable.spec.ts` (bornés à `securite-web`, dette du PR #69), et l'ordre de
découverte des specs e2e, qui peut glisser vers une page PHP (§7).

**Le geste suivant : PHP-A**, la grammaire d'auteur de D-PHP-1 (ci-dessous), puis **PHP-2**, la
séance 1. ⚠️ Les sept chemins du §3 ne sont toujours pas fournis : tout exemple concret de PHP-2
portera `à-vérifier:`, donc le module restera en `statut: verifiee`.

### 🔴 PHP-A EST RÉEL — mesuré le 2026-09-10, et l'hypothèse optimiste est réfutée

La question ouverte était : `:::: methodes` est-il légal **à l'intérieur** d'un item de
`:::: marche-a-suivre` ? **Non, et le refus est explicite, pas accidentel.**

`compiler-markdown.mjs:2058-2117` (`lireEtape`) définit une étape comme **exactement** : un
paragraphe d'ouverture, puis **au plus UN bloc de code clôturé**. Tout autre jeton tombe sur
l'`echec` de la ligne 2095. Un `mermaid` y est refusé nommément (l. 2107), un **deuxième** bloc de
code aussi (l. 2101). Le commentaire de la ligne 2097 dit l'intention : *« le jour où une étape a
besoin de plus, elle appartient à la théorie — c'est à ça que sert `{voir="…"}` »*.

**Donc D-PHP-1 coûte une grammaire neuve, dans les deux formats.** Il n'existe aucune voie à coût
nul :

- **Format A dans une étape** — il faut que `lireEtape` admette un `:::: methodes` à la place du
  bloc de code.
- **Format C** — il faut un attribut d'étape neuf (de la forme `{voie="cours"}` / `{voie="moderne"}`)
  qui rende une étiquette écrite **et** un liseré.
- **La seule voie sans grammaire neuve** est de sortir la comparaison de la marche à suivre : un
  `{voir="…"}` renvoie vers une section de théorie qui porte le `:::: methodes`. C'est le
  mécanisme **déjà prévu** par le contrat — mais il éloigne la comparaison de l'étape, ce qui est
  exactement ce que le propriétaire reproche au format actuel.

⚠️ **Un attribut d'étape se pose dans DEUX juges, jamais un seul** : `MOTIF_VOIR_EN_TETE` et
`jugerRenvoiDEtape` (`valider.mjs`) refusent aujourd'hui tout `{` en tête qui ne soit pas
`{voir="…"}`. La duplication compilateur/validateur est le contrat pour **ce qui juge** (L-095) ;
ce qui **recense**, lui, se partage.

⚠️ `.claude/rules/agent-context-budget.md` §9 s'applique : **le corpus de fixtures est un second
livrable**, et se compte à part dès qu'il dépasse deux ou trois cas.

---

### ⏸️ SESSION DU 2026-09-11 — pointeur remis à jour, chantier suspendu pour l'examen 1 de sécurité

La session précédente s'est arrêtée à court de jetons après la mesure de PHP-A ; rien n'avait été
perdu, mais la ligne de `CLAUDE.md` annonçait encore « PHP-A » comme un geste simple. **L'état réel :**

- **PHP-A est mesuré, pas fait.** La décision qui reste est d'ordre produit, et elle appartient au
  propriétaire : (A) admettre `:::: methodes` dans une étape (`lireEtape`) ou (C) un attribut d'étape
  `{voie="…"}` — dans les deux cas **deux juges** et un corpus de fixtures compté à part (§9 du
  budget). La voie `{voir="…"}` est gratuite mais éloigne la comparaison de l'étape.
- ✅ **P-1 et P-3 sont CONFIRMÉS (2026-09-11, en session)** — `C:\Users\0758510` et `C:\wamp64`
  (racine servie `C:\wamp64\www`), voir §3. Le blocage de publication **tient quand même** : P-2,
  P-4, P-5, P-6 et P-7 restent à fournir, et `valider.mjs` §6 refuse `statut: publiee` au premier
  `à-vérifier:` qu'ils laisseraient derrière eux.
- **Interruption :** l'examen 1 de 420-B10-HU (séance 6, 2026-09-11, matière des cours 1 à 4 selon
  la diapositive 118 du Cours 5) a pris la priorité. Livrable de révision, hors du pipeline de
  contenu : [`docs/revision/examen-1-securisation-2026.md`](../revision/examen-1-securisation-2026.md).

**Le geste suivant, au retour :** trancher A ou C avec le propriétaire, puis PHP-A, puis PHP-2.

## 7 · Les pièges hérités qui mordront sur ce chantier

- **Publier déplace la cible des specs e2e découverts, en silence.** `ROUTE_LECON_QUIZ` et
  `ROUTE_LECON_SIMULATION` (`e2e/aides/artefact-mesure.ts`) prennent la **première** page prerendue
  portant le marqueur, dans l'ordre alphabétique trié. Un cours `php` publié peut les déplacer.
  Devant un littéral épinglé qui rougit, la première question est **« quelle page mesure-t-il
  maintenant ? »**, jamais « quel chiffre y mettre ? ».
- **`MODULES_PUBLIES` de `src/app/features/home/accueil.ts` mord à chaque publication**, et c'est
  voulu.
- **G-contraste est un gate de contenu déguisé en gate de design** (L-080) : une construction
  syntaxique inédite dans un bloc de code fait naître des classes dans
  `src/styles/_coloration-syntaxique-generee.scss`. Du PHP neuf **peut** faire rougir la CI sur une
  PR sans une ligne de code de design.
- **U+00A0 seulement, jamais U+202F** — l'espace fine insécable est absente des polices du site.
  Et **U+26A0 (`⚠`) est un marqueur réservé** en prose de leçon.
- **Les fins de ligne de ce dépôt sont mixtes**, `backlog-phase-1.md` compris.
- **Une PR fusionnée ne prouve pas que la branche est vide** — `git log --oneline origin/main..<branche>`
  fait foi à la clôture d'un lot.
- 🔴 **DETTE CI NOMMÉE (2026-09-10) — deux vérifications en ligne de `deploy.yml` jugent AVANT la fin
  de la propagation SWA, et elles ont rougi DEUX déploiements sur deux, sur une production saine.**
  **(1) Routage, contrôle (c)** (`deploy.yml:790-832`, déploiement de #70) : il lit `/` **une seule
  fois** puis teste chaque asset **une seule fois**, sans la boucle d'attente que (a) et (b) portent.
  Mesuré : 24 s après la publication, la page servie référençait encore `main-VV5Q5OM6.js` — l'asset
  du build **précédent** (#71), déjà retiré — d'où un 404 ; le build de #70 était `main-RMDDMDZI.js`,
  servi 200 dès la minute suivante. Son message d'erreur accuse en plus la mauvaise cause
  (`trailingSlash` produit une **redirection** 3xx, pas un 404).
  **(2) En-têtes** (déploiement de #72) : `style-src` servie ≠ artéfact, 14 hachages des deux côtés
  mais **3 échangés** — les trois blocs de style que le lot C venait de changer. La boucle attend que
  les en-têtes soient **présents**, pas qu'ils soient **égaux** à l'artéfact : elle a comparé la
  configuration du déploiement précédent. Relue quelques minutes plus tard : les 3 hachages neufs
  présents, les 3 anciens absents.
  **Correctif, en lot à part** (workflow épinglé par `FENETRE_AVANT_SCEAU_REVUE`, revue
  `security-reviewer` requise) : attendre l'**effet** (L-004) — boucler jusqu'à ce que la page servie
  référence les assets **de ce build** et que la CSP servie soit **égale** à celle de l'artéfact, puis
  seulement juger ; et distinguer 3xx de 404 dans le message de (c). ⚠️ **Tant qu'il n'est pas fait,
  un déploiement rouge sur ces deux étapes se relit contre la production AVANT d'être cru** : relever
  les assets de `/` et la CSP servie, puis rejouer le job (`gh run rerun <id> --failed`).

---

### 🔵 SESSION DU 2026-09-13 — PHP-A est TRANCHÉ, et il donne DEUX lots, pas un

**La décision du propriétaire, telle qu'elle a été rendue** (question posée avec les trois formats
sur le même contenu) : *« Dans le cas où la démarche diffère vraiment je veux deux onglets. Lorsqu'il
s'agit d'une ou quelques lignes de code, l'option 1 me convient. »*

Autrement dit **les deux grammaires, chacune à sa place** — et c'est D-PHP-1 appliqué à la lettre
(« lorsque possible A, sinon si vraiment plus convenable au contexte C ») :

| L'écart porte sur… | Format | Où |
|---|---|---|
| **une ou quelques lignes de code** | **C** — attribut d'étape `{voie="cours"}` / `{voie="moderne"}` | **dans** l'étape de la marche à suivre — **PHP-A1** |
| **toute une démarche** (suite de gestes différente, outils différents) | **A** — le conteneur `:::: methodes` | section de théorie, citée depuis l'étape par `{voir="…"}` aujourd'hui ; **dans** l'étape le jour où **PHP-A2** est ouvert |

🔴 **Pourquoi A n'est PAS gratuit dans une étape, et pourquoi c'est un lot à part.** `lireEtape`
(`compiler-markdown.mjs:2059-2117`) définit une étape comme **exactement** un paragraphe puis **au
plus un** bloc de code clôturé ; tout autre jeton tombe sur un `echec` nommé. Admettre un
`:::: methodes` demande donc : la tokenisation imbriquée dans un item de liste, l'extension du
schéma de `name` des radios (aujourd'hui `chemin` = ancre de section puis `_e`/`_m`/`_v` par
récursion) à un segment d'étape, le rendu, **deux juges** (L-095) et un corpus de fixtures compté à
part (`.claude/rules/agent-context-budget.md` §9). ⚠️ Et il **réintroduit** au cœur du résumé
actionnable le mode d'échec de la clause D-C — un volet masqué qui enferme le seul exemplaire d'un
fait — qui a mordu **trois conteneurs sur quatre**.

**Ce que la séance 1 demande réellement, mesuré :** une seule démarche diverge vraiment (monter
l'environnement : WAMP du cours contre serveur intégré `php -S`), et elle appartient de toute façon
à une section de théorie, où `:::: methodes` est **déjà légal et déjà mesuré**. Tous les autres
écarts tiennent en une ou quelques lignes — `include "header.inc"` contre `require_once` sur un
`.php`, `echo $_GET[…]` nu contre `htmlspecialchars`, `array(…)` contre `[…]`. **PHP-A2 n'est donc
pas sur le chemin critique de PHP-2**, et il s'ouvrira le jour où un cas le réclame.

### 🔴 PHP-F — le gate du format actionnable est FERMÉ au second cours (mesuré le 2026-09-13)

`src/format-actionnable.spec.ts:29` fixe `const CORPUS = 'content/cours/securite-web'` **en dur**.
Le test « ne porte AUCUNE permission morte » construit ses `eligibles()` à partir de ce seul dossier :
y inscrire un slug du cours de PHP le compterait comme **permission morte** et ferait rougir G-test,
**sans correctif possible** — le module PHP n'est ni dans ce corpus, ni `publiee` (les `à-vérifier:`
des chemins du poste l'en empêchent, §3).

**Conséquence acceptée pour PHP-2** : le module 01 de PHP écrit ses renvois `{diapos="…"}` et
`{hors-cours}` — leur **grammaire est légale sur n'importe quel module** — mais **n'entre pas** dans
`MODULES_AU_FORMAT_ACTIONNABLE`. Ce n'est donc pas la règle 13 qui les rend obligatoires ici, c'est
la cartographie écrite (`docs/contenu/renvois-diapos-php-01.md`), relue à la main.

⚠️ **Deuxième face du même défaut, plus sournoise :** `MODULES_AU_FORMAT_ACTIONNABLE` est indexée par
**slug nu**, jamais par `sujet/slug`. Deux cours qui partageraient un slug appliqueraient le gate au
mauvais module, **en silence**. Famille **S-010** : « le corpus » et « le module » sont des promesses
au singulier, et elles ont une date de péremption — celle du jour où un second cours est entré dans
`content/`.

### ✅ Ce que la session a mesuré et posé avant d'écrire la leçon

- **`content/cours/php/exercices.json` existe** — 14 exercices pour la séance 1, références 1 à 14,
  aucun numéro qui saute, énoncés **reformulés** (décision X-1). ✅ **Vérifiés à la source
  d'autorité** le 2026-09-13, sur <https://www.alexandrepetrin.ca/exercice-php-cours-1-2026/> — le
  **site** de l'enseignant, pas la copie locale : les deux concordent.
- **L'extrait de la séance 1 est frais** — `extraire-diapositives.mjs` relancé le 2026-09-13, sortie
  **identique octet pour octet** à `php-2026/extraits/` : 111 diapositives. 🔴 Cela ne dit **rien**
  d'une republication depuis le téléchargement du `.pptx`, daté du **2026-08-31**.
- **La cartographie des 111 diapositives est écrite** :
  [`docs/contenu/renvois-diapos-php-01.md`](../contenu/renvois-diapos-php-01.md) — 24 titres, les
  deux sens mesurés (**92 diapositives citées sur 111**, les **19** orphelines justifiées une par
  une : diapositives de titre, administration de session, transition).
- **Trois contradictions de la source sont nommées et non tranchées en silence** : la pondération
  (diapo 6 contre `horaire.json`), la version « Admin » de WAMP (diapo 33, réfutée par le
  propriétaire), et XAMPP annoncé en conclusion (diapo 107) alors qu'il est interdit au Cégep
  (diapo 26).

---

### ⏭️ REPRISE — état exact à la fin de la session du 2026-09-13

> **Lire ce bloc en premier.** La session s'est arrêtée faute de quota, un sous-agent **en cours de
> travail**. Rien n'est perdu, mais **le travail sur le disque n'est ni committé, ni vérifié**.

**✅ FUSIONNÉ — PR #79, `chore/plancher-contexte-agents`.** Le plancher de contexte des sous-agents
est corrigé : **76 094 → 62 715 tokens**. Cause mesurée : `CLAUDE.md` était monté à **19 720 tokens
injectés** (968 lignes), dont **80 % de récit de clôture de lot** ; il est retombé à **5 305** (289
lignes). Le récit est archivé verbatim dans `journal-reprises-claude-md.md`. Voir
`.claude/rules/agent-context-budget.md` **§10** — il porte la mesure et **les deux causes séparées**.

> ⏭️ **CE BLOC EST HISTORIQUE depuis le 2026-09-14** — PHP-A1 est fusionné. L'état courant est à la
> section **« ✅ CLÔTURE — PHP-A1 »** tout en bas de ce document ; ce qui suit dit d'où il vient.

**🟦 EN COURS — branche `feat/php-a1-voie-etape`, commit `80acdd0`, PAS de PR ouverte.**
PHP-A1 (l'attribut d'étape `{voie="cours"}` / `{voie="moderne"}`) est livré et **était vert** au
commit : G-content 10 leçons / 2 racines · G-test **1195 passés / 48 fichiers / 1 sauté / 0 échec** ·
G-lint · `typecheck:tools`. La revue l'a **approuvé avec trois réserves**.

🔴 **CE QUI EST SUR LE DISQUE, NON COMMITTÉ ET NON VÉRIFIÉ.** Un agent de correctifs travaillait
encore quand la session s'est arrêtée. Il avait créé `tools/content-pipeline/tete-d-etape.mjs` et
modifié `compiler-markdown.mjs`, `valider.mjs`, `pipeline-contenu-compilation.spec.ts`,
`pipeline-contenu-validation.spec.ts`. **Le premier geste de la prochaine session est de constater
l'état réel** (`git status`, `git diff`), **pas de refaire** — puis de relancer les gates. S'il est
incomplet, reprendre par un agent **frais** avec les trois constats ci-dessous, qui sont déjà un
brief autonome.

#### Les trois réserves de la revue, telles quelles

1. **MAJEUR — ce qui RECENSE est dupliqué sans lien exécutable.** `MOTIF_ATTRIBUT_EN_TETE` et
   `decouperTeteDEtape` existent en deux copies indépendantes (`compiler-markdown.mjs` ~l. 381,
   `valider.mjs` ~l. 1228) qu'**aucun fichier n'apparie** — mesuré par `grep` sur `src/` et `tools/`.
   **L-095** : la duplication est le contrat pour ce qui **JUGE**, jamais pour ce qui **RECENSE**.
   Correctif : module partagé `tools/content-pipeline/tete-d-etape.mjs`, sur le patron **déjà
   existant** de `sujets-freres.mjs`. ⚠️ Les `echec(...)` / `signaler(...)` restent **dupliqués**,
   délibérément. ⚠️ `blanchirCodeEnLigne` est une dette **antérieure** : ne pas la déplacer ici.
   ⚠️ Le validateur tourne **avant** le compilateur et ne doit pas l'importer.
2. **Le sur-refus NEUF de l'accolade nue** (`compiler-markdown.mjs:2063-2068`, `valider.mjs:2189-2196`).
   Le contrôle `if (source.startsWith('{'))` ne gardait que le cas « rien n'a été lu » ; réemployé
   sur le **reste** de la phrase, il refuse du contenu légal —
   `1. {voir="Les tableaux"} {} est un objet vide en JS.` — avec le message le plus trompeur possible
   (« bloc d'attributs illisible **en tête** » sur une tête parfaitement formée). Zéro leçon en
   production touchée, **mais le cours qu'on écrit est du PHP/JS**, où une phrase s'ouvre sur `{`.
   Correctif dans les **deux** copies : `/^\{[A-Za-z][A-Za-z-]*\s*=/` au lieu de `.startsWith('{')`.
   Exige **un cas positif** (`{}` après une tête valide est accepté) **et un cas négatif**
   (`{voie=x}` non cité reste refusé) — sans les deux, le correctif peut tout relâcher sans rougir.
3. **Inventaire périmé, dans le fichier même qui cite L-075.** `pipeline-contenu-validation.spec.ts`
   l. 1096 (« six refus » → il y en a douze) et l. 1263-1266 (« deux renvois » → quatre, plus trois
   voies) ; renommer le `describe` en « la **tête** d'une étape, côté VALIDATEUR ».
   🔴 **Recompter sur le fichier, ne pas recopier ces chiffres.**

**Leçon candidate, à porter au corpus par un `mentor`** — *une condition déplacée se relit contre
l'ensemble sur lequel elle porte MAINTENANT, jamais contre celui pour lequel elle a été écrite.* Un
refactor qui élargit un garde-fou déplace aussi ses contrôles négatifs, et le message hérité accuse
alors la mauvaise cause.

#### Le geste suivant, une fois PHP-A1 fusionné : **PHP-2**

La séance 1, **« En bref » + sommaire bref** des six sections imposées — c'est la priorité posée par
le propriétaire. **Le terrain est déjà posé et vérifié**, ne pas le refaire :

- `content/cours/php/exercices.json` — 14 exercices, refs 1 à 14, énoncés reformulés, **vérifiés sur
  le site de l'enseignant** (2026-09-13) ; `content:build` les accepte déjà.
- `docs/contenu/renvois-diapos-php-01.md` — la cartographie des 111 diapositives, **24 titres**, les
  deux sens mesurés (92 citées sur 111, 19 orphelines justifiées une par une). **C'est le squelette
  du brief du `professeur-web`** : les titres et leurs renvois y sont déjà arbitrés.
- Extrait réextrait le 2026-09-13, identique au `.pptx` local (lequel date du **2026-08-31** — une
  republication depuis serait invisible).

⚠️ **Le module n'entre PAS dans `MODULES_AU_FORMAT_ACTIONNABLE`** (lot **PHP-F** : `CORPUS` est en dur
sur `securite-web` dans `src/format-actionnable.spec.ts:29`). Il porte ses renvois quand même.
⚠️ Il reste en **`statut: verifiee`** : P-2, P-4, P-5, P-6, P-7 ne sont pas fournis (§3).
⚠️ Dimensionner le brief : **KB `web/php/php-fondamentaux.md` (570 l.) + `php-environnement-developpement-moderne.md` (500 l.)**,
dont le §« Le tableau qui compte — méthode du cours ↔ équivalent moderne » est exactement la matière
de D-PHP-1. `quiz.json` est **obligatoire** même si les quiz sont hors périmètre : le faire minimal.

---

### ✅ CLÔTURE — PHP-A1 « l'attribut de voie d'une étape » (2026-09-14)

**Fusionné dans `main`.** L'attribut `{voie="cours"}` / `{voie="moderne"}` (décision **D-PHP-1**) est
en production : grammaire lue par un module partagé, deux juges appariés, rendu SCSS à deux canaux
(teinte **et** style de trait), et les trois réserves de la revue sont fermées.

**Ce que la session du 2026-09-14 a corrigé, et pourquoi c'est la partie à retenir.** La PR était
rouge sur deux gates que le travail d'implémentation n'avait pas vus — tous deux *déclenchés* par le
lot, mais *causés* par des seuils et des habitudes plus anciens.

**(a) G-build — le budget `anyComponentStyle` d'`angular.json`.** `rendu-blocs.scss` passait à
**8,39 kB** minifiés contre un plafond de 8 kB. Deux gestes, dans cet ordre, et l'ordre est la leçon :

1. **D'abord chercher le DOUBLON, jamais le seuil.** Quatre variantes d'encadré (`cours`,
   `exercice-du-cours`, `complement`, `correction-du-cours`) recopiaient chacune le même bloc
   `@include m.contraste-force { border-color: CanvasText; background-color: Canvas; }`, et `cours`
   / `exercice-du-cours` recopiaient la recette cyan entière alors que **seul le style du trait les
   oppose**. Idem pour `note` / `a-retenir` (même surface creusée, même largeur de montant) et pour
   les deux voies d'étape. **370 octets rendus** sans retirer une seule règle — 8,39 → **8,02 kB**.
2. **Ensuite seulement, recalibrer.** L'avertissement était à **6 kB** et la feuille le dépassait
   **DÉJÀ avant ce lot** : un avertissement rouge en permanence ne signale plus rien. Seuils portés à
   **8 kB / 10 kB**, ce qui rend l'avertissement de nouveau actionnable et laisse ~2 kB de marge.
   🔴 **La justification est écrite en tête de `rendu-blocs.scss`, pas seulement ici** :
   `angular.json` ne porte pas de commentaire, et un seuil relevé sans raison écrite à côté est
   exactement ce que `.claude/rules/agent-context-budget.md` appelle un chiffre qui devient un
   mensonge silencieux.

⚠️ **Pourquoi ce budget mord ICI et sur aucune autre feuille, et pourquoi il remordra.**
`rendu-blocs.scss` habille **tout** le vocabulaire de blocs d'une leçon là où un composant ordinaire
habille un écran : il grossit à chaque enrichissement du format. La question à poser au prochain
dépassement est donc « **quel doublon ?** », pas « quel chiffre y mettre ? ».

**(b) SonarCloud — 12,2 % de lignes dupliquées sur le code neuf** (seuil 3 %), concentrées dans
`pipeline-contenu-validation.spec.ts` (45,5 %) et `pipeline-contenu-compilation.spec.ts` (26,3 %).
🔴 **C'est L-095, appliquée à la deuxième moitié du lot.** La réserve n°1 de la revue avait bien fait
extraire ce qui RECENSE côté **outils** (`tools/content-pipeline/tete-d-etape.mjs`) — mais les
**specs** gardaient deux copies de la **table de mutations**, qui ne juge rien non plus. Une mutation
ajoutée d'un côté et pas de l'autre laissait un juge non mesuré **sans qu'aucun appariement de
messages ne rougisse** : chaque copie rendait la bonne cause pour la population qu'elle avait.

Correctif : `src/aides-de-test/mutations-de-tete-d-etape.ts` porte les **huit mutations** (recensement,
partagé) ; chaque spec garde sa **table de causes attendues** (jugement, dupliqué **exprès**, c'est
lui qui ferme S-010). Le renvoi valide qu'exige le cas `valeur-non-citee` est un **paramètre**, parce
que la cible doit exister dans la fixture de chaque appelant — sinon une seconde cause s'ajoute et le
contrat « un cas = une cause » tombe en silence. Et `refusDeTete` **lève** sur une mutation dont le
juge appelant n'a déclaré aucune cause : ajouter une entrée au corpus **force** désormais les deux
juges à dire ce qu'ils en font.

⚠️ **Ce qu'on a vérifié au passage, et qui vaut pour la prochaine fois.** `.sonarcloud.properties`
n'est lu **que depuis `main`** : un réglage posé dans une PR ne change rien à l'analyse de cette PR.
Une duplication de test ne se règle donc pas par une exclusion de dernière minute — elle se règle
dans le code, ou elle attend une fusion.

#### Le geste suivant : **PHP-2** (inchangé)

Tout ce qui suit la ligne « Le geste suivant, une fois PHP-A1 fusionné » plus haut reste **exact et
valide** : `exercices.json` (14 exercices vérifiés), `renvois-diapos-php-01.md` (111 diapositives
cartographiées dans les deux sens), le dimensionnement du brief et les trois avertissements
(`MODULES_AU_FORMAT_ACTIONNABLE`, `statut: verifiee`, `quiz.json` minimal obligatoire).

---

### ✅ CLÔTURE — PHP-2 « séance 1, En bref + sommaire bref » (2026-09-14)

**Livré** : `content/cours/php/01-introduction-php/` — `lecon.md` (~800 l., 24 titres aux renvois de
`docs/contenu/renvois-diapos-php-01.md`, 12 étapes de marche à suivre dont deux paires
`{voie="cours"}` / `{voie="moderne"}`, un `:::: methodes` à trois volets, une `comparaison`
vulnérable/corrigé sur le XSS réfléchi du corrigé officiel, un diagramme Mermaid, **14 encadrés
`::: exercice-du-cours`**, refs 1 à 14) et `quiz.json` (5 questions, le plancher du schéma —
les quiz sont hors périmètre de ce chantier).

**Le module reste en `statut: verifiee`, et c'est le contrat** : six marqueurs `à-vérifier:`
(répartition des évaluations · version de WAMP dans le chemin de `php.exe` · port d'Apache · quel
environnement sera évalué · dossier de travail · éditeur) bloquent mécaniquement `publiee` tant que
**P-2, P-4, P-5, P-6, P-7** du §3 ne sont pas fournis. Il n'entre **pas** dans
`MODULES_AU_FORMAT_ACTIONNABLE` (lot **PHP-F**).

**Gates, tous verts au moment de la clôture** : G-lint · G-test **1200 passés / 1 sauté / 0 échec**
(48 fichiers) · G-content **11 leçons / 2 racines** · G-build **14 routes prerendues, 14 hachages
`style-src`, 0 de script — inchangés** (la leçon n'étant pas publiée, elle n'ajoute aucune page) ·
G-typage-outils · G-contraste (aucune classe de coloration neuve malgré du PHP inédit) · G-axe
**0 violation** · G-e2e **57 passés** · `npm audit --omit=dev` **0**.

#### 🔴 Trois leçons de MÉTHODE, chacune payée dans cette session

1. **Le rédacteur de leçon n'a AUCUN outil d'exécution, et le brief lui a réclamé un gate.**
   `professeur-web` porte `Read`/`Write`/`Edit`/`Grep`/`Glob`/`WebSearch`/`WebFetch` — pas `Bash`.
   Le brief exigeait `npm run content:build` : l'agent a dû répondre qu'il ne pouvait pas, ce qui
   était **exact**. C'est le même patron que le `mentor` à qui l'on ordonnait `npm run lecons:index`
   (`.claude/rules/agent-context-budget.md` §7). **Un brief ne demande jamais un geste que
   l'outillage de l'agent lui interdit** — et `content:build` est de toute façon impossible avant que
   `quiz.json` existe (`valider.mjs:3027` le rend obligatoire pour **toute** leçon).
2. **🔴 UNE CORRECTION SE VÉRIFIE CONTRE LA SOURCE PRIMAIRE, JAMAIS CONTRE UN DOCUMENT DÉRIVÉ.**
   Le fil principal a « corrigé » *quatre évaluations* en *trois* en se fiant à la table des renvois,
   qui ne détaillait que trois pondérations. La diapositive écrit **littéralement « 4 évaluations »**
   puis n'en détaille que trois : la correction a donc **introduit** l'erreur que la passe
   adversariale a ensuite relevée en constat bloquant. L'extrait était à portée de `sed -n '6p'`.
   *Une table de renvois est un index, pas une source.*
3. **Le volume de SORTIE se dimensionne comme le volume d'ENTRÉE.** Le rédacteur a fini à
   **173 578 tokens** (au-dessus du gros maximum de 150k) sur une sortie de 787 lignes estimée à
   ~450 dans le brief. §9 de la règle de budget le dit pour les fixtures ; ça vaut pour une leçon.
   Le découpage qui a marché ensuite : quiz par agent frais (**85k**), contre-vérification (**150k**),
   correctifs par agent frais (**79k**).

#### Le geste suivant

**PHP-3** (séance 2 — syntaxe, superglobales, tableaux, classes). Le terrain n'est **pas** posé :
contrairement à la séance 1, il n'existe ni cartographie de renvois ni relevé d'exercices vérifié à
la source d'autorité. Les deux se font **avant** d'écrire, par le fil principal (le déck fait 60
diapositives — il tient en une lecture).
⏰ **Rappel** : le jour où un module de PHP passe `publiee`, `e2e/aides/artefact-mesure.ts` et
`src/format-actionnable.spec.ts` (bornés à `securite-web`) et `MODULES_PUBLIES` mordent — et l'ordre
de découverte des specs e2e peut glisser vers une page PHP (§7).

### ✅ CLÔTURE — PHP-3 « séance 2, En bref » (2026-09-14)

**Livré** : `content/cours/php/02-superglobales-tableaux-classes/` — `lecon.md` (1039 l., **26
titres** : douze `##` et quatorze `###`, concordant exactement avec `docs/contenu/renvois-diapos-php-02.md`)
et `quiz.json` (5 questions, trois types — `choix-multiple`, `trouver-la-faille`, `vrai-faux` —
chacune avec son explication et sa `ficheSource`). Plus un lot de pipeline, ci-dessous.

**La cartographie est mesurée DANS LES DEUX SENS, et les deux concordent** : 50 diapositives citées
sur 60, 10 orphelines — 1 (couverture), 2/5/55/57/59 (titres de section sans contenu), 4 (consigne
de déroulement), 20 et 38/39 (transitions, dont un doublon du déck de l'enseignant). Aucun trou de
leçon.

**Le module reste en `statut: verifiee`, et c'est le contrat** : **cinq** marqueurs `à-vérifier:`
(DOCUMENT_ROOT et SERVER_PORT du poste · `doubleval` alias de `floatval` · la notation `$this.` de
la diapositive 45 · la visibilité implicite d'une méthode · l'URL d'appel de `bulletin.php`). Le
plus exposé contredit une réponse de quiz du cours (diapositive 51) : *une méthode sans modificateur
vaut `public`, là où une propriété nue est une erreur de syntaxe*. Il est écrit comme §6 de
`.claude/rules/contenu-pedagogique.md` l'exige — la réponse de l'enseignant **conservée**, la
correction à côté avec sa source, et la règle d'arbitrage explicite.

**Gates** : G-content **12 leçons / 2 racines** · G-lint · G-test **1203 passés / 1 sauté**
(48 fichiers) · G-typage-outils · G-build **14 hachages `style-src`, 0 de script — inchangés** ·
G-axe **0 violation** (14 pages) · CI verte, SonarCloud comprise (PR #82).

#### Le lot de pipeline qui s'est invité — et pourquoi il fallait le prendre

`content:build` a rougi sur **trois blocs `text`** : les sorties de `print_r` de la leçon. Une
SORTIE de programme n'est d'aucune des huit langues du contrat, et les deux issues disponibles
étaient mauvaises — renoncer au bloc, ou l'étiqueter `bash`, ce qui remet la langue fausse dans le
`<figcaption>` **visible** et dans l'`aria-label` du défileur (la faute de 2026-08-24, sous une
autre forme). **Le propriétaire a tranché : élargir le contrat.** `text` est la neuvième langue.

La mesure qui l'autorisait : Shiki n'applique aucune grammaire à `text` — **2 encres**, `#24292e`
et `#e1e4e8`, déjà produites par `php`. Zéro portée neuve, donc zéro paire de contraste neuve.

#### 🔴 La leçon de méthode de cette session — L-080 récidive par AJOUT, pas par omission

**C'est la mesure elle-même qui a failli créer le trou.** Ayant mesuré que `text` n'apporte aucune
encre, la première rédaction en a conclu qu'elle était « dispensée du banc » de
`coloration-encres-contraste` — et l'a écrit dans un commentaire. La revue à regard neuf l'a
relevé : **une mesure qui ne vit que dans un commentaire ne rougit jamais.** Si une version future
de Shiki peignait du texte brut, la paire de contraste naîtrait dans une leçon publiée, en CI, au
pire moment. C'est mot pour mot la clause de clôture de L-080.

**La règle, désormais écrite à côté de `LANGAGES`** : *toute entrée ajoutée à la liste entre au banc
LE MÊME JOUR — surtout quand on a mesuré qu'elle n'apporte rien. C'est la mesure qui doit rougir si
elle cesse d'être vraie, pas l'auteur qui doit s'en souvenir.*

Deux corollaires payés dans la même passe : (a) le commentaire disait « la SEULE entrée dispensée »
alors que **six** autres langues ne sont pas au banc non plus — le patron du chiffre recopié qui
devient un mensonge silencieux ; (b) `text` était mécaniquement admise dans un volet
`vulnerable`/`corrige`, et la doc l'interdisait **en prose seule**. Un refus posé dans `lireExemple`
et son cas `fail-closed` ferment la surface : un volet compare du CODE.

#### Le geste suivant

**PHP-4** (séance 3), dont le terrain n'est **pas** posé — ni cartographie de renvois, ni relevé
d'exercices vérifié à la source d'autorité. Les deux se font **avant** d'écrire, par le fil
principal. ⚠️ **Et le compte des titres s'écrit dans la table au moment où on la bâtit** : le brief
de PHP-3 avait annoncé 22 titres là où la table en portait 26, et le volume de sortie, calé sur le
mauvais compte, s'est trouvé sous-estimé de moitié (rédacteur fini à 167k). Même famille que la
leçon 3 de PHP-2 : *le volume de SORTIE se dimensionne comme le volume d'ENTRÉE.*

⏰ **Rappel inchangé** : le jour où un module de PHP passe `publiee`, `e2e/aides/artefact-mesure.ts`,
`src/format-actionnable.spec.ts` (bornés à `securite-web`) et `MODULES_PUBLIES` mordent — et l'ordre
de découverte des specs e2e peut glisser vers une page PHP (§7).

💡 **Dette désormais outillée** : les blocs d'en-tête HTTP des leçons 08 et 09 de sécurité ont un
remède (`text`) ; il reste à l'appliquer. Idem pour les étiquettes mensongères des leçons 03-05.

---

### ✅ CLÔTURE — PHP-4 « séance 3, La librairie standard » (2026-09-15)

**Livré** : `content/cours/php/03-librairie-standard/` — `lecon.md` (**1758 lignes**, 29 titres :
quinze `##` et quatorze `###`, concordant avec `docs/contenu/renvois-diapos-php-03.md`) et
`quiz.json` (5 questions, **quatre** types — `trouver-la-faille`, `choix-multiple`, `vrai-faux`,
`associer` — chacune avec son explication et sa `ficheSource`). Les **9 exercices** de la séance 3
sont au registre et **tous les 9** cités au fil du texte.

**La cartographie est mesurée dans les DEUX sens** : 53 diapositives citées sur 74, 21 orphelines
(couverture, titres de section, transitions, un doublon de lien, « Questions? »). Aucun trou de
leçon. ⚠️ **Seize diapositives portent leur matière en capture d'écran** que l'extracteur ne lit
pas — leur renvoi est juste, mais le code qu'elles montrent n'est pas connu du dépôt ; la table le
dit nommément plutôt que de le deviner.

#### La passe adversariale, et ce qu'elle a rapporté

Deux `verificateur-theorie` indépendants, **un par moitié** (1-762 et 763-1681), parce que 1680
lignes plus la vérification en ligne ne tiennent pas dans un seul budget. **108k et 109k tokens,
16 appels d'outils chacun** — la découpe par volume de source a tenu exactement.

**26 constats, tous traités** : **5 INEXACT bloquants**, 17 à nuancer, 2 marqueurs manquants,
1 marqueur retirable. Les cinq inexactitudes, parce qu'elles disent quelque chose du mode d'échec :

1. **`date("\i\t \i\s")` n'imprime pas « it is ».** En guillemets **doubles**, PHP traite `\t`
   comme une tabulation *avant* que `date()` ne voie la chaîne. Le manuel écrit l'exemple en
   guillemets simples. Introduite par la leçon.
2. **Et `date("it is")` n'imprime pas « le jour ISO et le fuseau »** mais les minutes, le nombre de
   jours du mois, les minutes et les secondes — ce que **le tableau de la leçon elle-même**, seize
   lignes plus haut, disait correctement. Une leçon peut se contredire à distance.
3. **`substr("été", 0, 2)` ne rend pas un demi-caractère** : `é` = `0xC3 0xA9`, donc les deux octets
   demandés forment **exactement** ce caractère. Le demi-caractère naît d'une coupe **impaire**.
   🔴 **Héritée de la KnowledgeBase** — fiche corrigée et **poussée** (`22eeaa3`).
4. **`ENT_QUOTES` seul ne reproduit pas le défaut de PHP 8.1, il en RETIRE `ENT_SUBSTITUTE`.** Sur
   une entrée UTF-8 invalide, `htmlspecialchars` rend alors une **chaîne vide** au lieu du caractère
   de remplacement. La fiche KB écrivait déjà le bon jeu : **la leçon avait dégradé sa source.**
5. **Le journal de l'« Exemple complet » montrait 3 lignes pour 3 visites ; il en naît 5.** Le
   `log_message("Affichage de …")` est **hors** du `if`, donc il s'exécute à chaque passage, et une
   visite sans paramètre est elle aussi refusée (`?? ""` échoue au filtre). Corrigé en gardant le
   comptage **comme point d'enseignement**, pas en maquillant la sortie.

#### 🔴 La leçon de méthode — un marqueur `à-vérifier:` posé à TORT n'est pas neutre

Le cinquième marqueur du module portait sur `FILTER_VALIDATE_URL` et disait « à trancher par
exécution sur la version de PHP de WAMP ». **C'était une erreur de diagnostic, pas une prudence.**
La règle ne vit pas sur le poste : elle est dans `php_filter_validate_url`
(`ext/filter/logical_filters.c`), **identique de la branche 8.0 à aujourd'hui**, et elle se lit sans
rien exécuter. Le filtre **n'a aucune liste de schémas** — il refuse ce qui n'a ni schéma, ni hôte
(hors `mailto`/`news`/`file`). Marqueur **levé**, et la leçon dit désormais la règle au lieu de
promettre une mesure.

**Ce que ça coûte quand on se trompe dans ce sens** : un marqueur promet une vérification que
personne ne fera jamais, et il maintient un module hors publication sans raison. Le réflexe à
prendre avant d'en poser un : *où vit réellement la règle ?* Si la réponse est « dans le code source
de PHP » ou « dans une spécification », ce n'est pas un marqueur, c'est une lecture à faire.

#### Gates

G-content **13 leçons / 2 racines** (30 exercices PHP sur 3 séances) · G-lint · G-test **1203 passés
/ 1 sauté** (48 fichiers) · G-typage-outils · G-build **14 hachages `style-src`, 0 de script —
inchangés** · G-axe **0 violation** (14 pages). G-e2e laissé à la CI : le module n'est pas publié,
donc aucun spec e2e ne le mesure, et la suite complète porte le rouge reproductible connu
(`defileurs-clavier.spec.ts:502`, L-057).

#### Le geste suivant

**PHP-5** (séance 4, programmation orientée objet), dont le terrain n'est **pas** posé — ni
cartographie de renvois, ni relevé d'exercices vérifié à la source d'autorité. Les deux se font
**avant** d'écrire, par le fil principal, et **le compte des titres s'écrit dans la table au moment
où on la bâtit** (le piège de PHP-3, qui avait sous-estimé le volume de sortie de moitié).

⏰ **Rappel inchangé** : le jour où un module de PHP passe `publiee`, `e2e/aides/artefact-mesure.ts`,
`src/format-actionnable.spec.ts` (borné à `securite-web`, lot **PHP-F**) et `MODULES_PUBLIES`
mordent — et l'ordre de découverte des specs e2e peut glisser vers une page PHP (§7).
