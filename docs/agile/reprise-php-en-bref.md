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

**La règle en attendant :** tout exemple concret porte un marqueur `à-vérifier:` (interdit en
`statut: publiee` par `valider.mjs` §6, ce qui **bloque mécaniquement** la publication d'un module
dont les chemins n'ont pas été confirmés). Un module PHP reste donc en `statut: verifiee` tant que
cette section n'est pas remplie.

| # | Ce qu'il faut | Valeur | Hypothèse de travail (**NON confirmée**) |
|---|---|---|---|
| P-1 | Racine du dossier personnel de l'étudiant sur le poste du Cégep | ⬜ à fournir | `C:/usr/0758510` — forme évoquée de mémoire, matricule inclus, **non vérifiée** |
| P-2 | Dossier de travail PHP à l'intérieur de P-1 | ⬜ à fournir | — |
| P-3 | Racine servie par Apache sous WAMP sur ce poste | ⬜ à fournir | `C:/wamp64/www` (Cours 1, diapo 54) |
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
| **PHP-A** | Grammaire d'auteur pour D-PHP-1 — si le conteneur `:::: methodes` existant ne suffit pas **dans** une marche à suivre, la mesurer avant d'écrire quoi que ce soit de neuf | ⬜ |
| **PHP-2** | Séance 1 — Introduction à PHP, LAMP, WAMP, premier script | ⬜ |
| **PHP-3** | Séance 2 — Syntaxe (suite), superglobales, tableaux, classes | ⬜ |
| **PHP-4** | Séance 3 — Librairie standard | ⬜ |
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
