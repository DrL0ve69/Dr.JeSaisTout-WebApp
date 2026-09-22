# Renvois diapositives — PHP, module 03 « La librairie standard PHP »

> **Ce que c'est.** La table de correspondance **mesurée** entre chaque titre `##`/`###` prévu pour
> `content/cours/php/03-librairie-standard/lecon.md` et les diapositives réelles du support de la
> **séance 3** du cours **420-4P2-HU** « Développement d'application en PHP » d'Alexandre
> Mageau-Pétrin. Produite le **2026-09-14**, au lot **PHP-4**, **par le fil principal** — le déck
> fait 74 diapositives, donc 74 lignes d'extrait : il tient en une lecture, et la règle appliquée
> aux séances 1 et 2 vaut telle quelle (**c'est la taille de la SOURCE qui décide, pas la nature de
> la tâche**).

## 0 · La source, et sa fraîcheur

| Étiquette | Cours | Ce qui a été lu | Diapos |
|---|---|---|---|
| **4P2** | 420-4P2-HU « Développement d'application en PHP » — le cours du sujet `php` | `php-2026/extraits/Cours03_Librairie_PHP.txt`, **lu en entier** | **74** pour la séance 3 |

Le numéro entre crochets de l'extrait est le **rang de présentation**, dérivé de
`ppt/presentation.xml` — c'est ce numéro-là, et lui seul, qui est cité ici. **Aucun agent ne lit un
`.pptx`**, et `WebFetch` n'est jamais employé sur un support de cours : il invente plutôt que
d'échouer.

✅ **Fraîcheur vérifiée avant d'écrire une ligne de cette table, et jusqu'au site.**

1. `extraire-diapositives.mjs` relancé le **2026-09-14** sur `php-2026/Cours03_Librairie_PHP.pptx` :
   sortie **identique octet pour octet** à l'extrait de `extraits/` — **74 diapositives**, même
   ordre, même texte.
2. `curl -I` sur la copie servie par le site de l'enseignant rend `Content-Length: 1630008` —
   **exactement** la taille du `.pptx` local — et `Last-Modified: Fri, 31 Jul 2026 19:35:07 GMT`,
   soit **antérieur** au téléchargement local du 2026-08-31. Aucune republication depuis.

## 1 · Les exercices — vérifiés à la SOURCE D'AUTORITÉ

`content/cours/php/exercices.json` porte **9 exercices** pour la séance 3, références **1 à 9**,
aucun numéro qui saute. La numérotation repart à `1` parce que le registre exige l'unicité **dans
une séance**, pas dans le fichier (`exercices.schema.json`, champ `reference`). Un encadré de la
leçon les cite donc par `::: exercice-du-cours {seance="3" ref="…"}`.

✅ Relevés le **2026-09-14** sur <https://www.alexandrepetrin.ca/exercice-php-cours-3-2026/> — **le
site de l'enseignant, pas la copie locale** (`php-2026/extraits/exercices-cours-03.txt`). Les deux
concordent **identifiant par identifiant** : 9 énoncés, même ordre, mêmes noms de fichiers
(`exercice03_generer_mdp.php`, `exercice03_valider_mdp.php`, `exercice6.ini`, `journalisation.inc`,
`exercice11.php`), mêmes noms de fonctions (`compterMot`, `compter_819`, `retourner_450`,
`retourner_telephone_invalide`), mêmes clés de configuration, mêmes numéros de téléphone, et
l'exercice 9 porte bien ses trois sous-points 9.1 / 9.2 / 9.3.

⚠️ **L'exercice 8 nomme son fichier `exercice11.php`** — pas `exercice08.php`. Ce n'est pas une
coquille de relevé : la feuille de l'enseignant l'écrit ainsi **sur le site**, et le corrigé
officiel livre pourtant `exercice08.php`. Le registre conserve le nom de la feuille et le dit.

Les énoncés du registre sont **REFORMULÉS**, jamais recopiés (décision X-1) : ce dépôt est public.

### 1a · Le corrigé officiel de la séance — lu, et il change la leçon

Le **corrigé publié par l'enseignant** (archive `corrige_php_cours03.zip` de la page du cours,
relevée le **2026-09-14** — 13 fichiers, dont 10 `.php`, un `.ini`, un `.inc` et un `journal.log`
d'exemple) a été lu, ainsi que le fichier `code_journalisation.inc` publié séparément. Cinq
constats **doivent** être portés par la leçon, parce qu'ils sont vrais du code que l'étudiant
recevra :

1. 🔴 **La fonction `log_message()` du cours porte un défaut réel, et il est répété TROIS fois** —
   diapositive 47, `journalisation.inc` du corrigé, et `code_journalisation.inc` publié à part. La
   ligne `$message .= "[" . date(...) . "] $msg";` concatène **dans une variable qui n'existe pas
   encore** : en PHP 8, `.=` sur une variable non définie émet `Warning: Undefined variable
   $message`. Le résultat écrit dans le journal est bien celui qu'on attend (le `null` est converti
   en chaîne vide), mais l'avertissement est là — et la ligne juste au-dessus,
   `error_reporting(E_ERROR | E_PARSE)`, le **masque**. Le code cache donc son propre défaut. Le
   remède tient en un caractère : `$message = …` au lieu de `$message .= …`. La leçon le nomme en
   `correction-du-cours` ; c'est le meilleur moment mémorable de la séance, et il est ancré sur du
   code de l'enseignant.
   ⚠️ **À faire confirmer par le `verificateur-theorie`** — c'est le constat le plus exposé de cette
   leçon, avec le n° 2 du §4.
2. 🔴 **`exercice06.php` du corrigé affiche le mot de passe de la configuration en clair dans une
   page HTML**, et `exercice6.ini` est déposé **à côté** de la page, donc dans la racine servie.
   Les deux faits se cumulent : le fichier `.ini` n'est pas interprété par PHP, il est **servi tel
   quel** par Apache, et `localhost/exercice6.ini` le rend en texte brut. C'est l'énoncé de
   l'exercice qui le veut ainsi, et c'est exactement le contre-exemple qu'un site qui enseigne la
   sécurité doit nommer. La leçon le traite **sans reprocher** : l'exercice s'accomplit tel quel, et
   un encadré dit ce qu'on en fait hors du cours (fichier hors de `www/`, ou `deny` côté serveur).
3. **Le corrigé de la séance 3 ne contient AUCUNE XSS réfléchie** — contrairement aux séances 1 et
   2. Mieux : `exercice04.php` **applique `htmlspecialchars()`**, ce qui est précisément la parade.
   À dire, parce que c'est vrai et que ça donne à l'étudiant une image juste du cours.
4. **`exercice04.php` du corrigé écrit « il faut utiliser la valide `<script>` »** là où l'énoncé
   dit « la **balise** `<script>` ». Simple coquille ; consignée ici pour qu'une relecture future ne
   cherche pas une intention derrière.
5. **`exercice09.php` du corrigé est le seul endroit du cours où une expression régulière est
   vraiment écrite** (`/^\(819\)/`, `/^\([0-9]{3}\) [0-9]{3}-[0-9]{4}$/`). La diapositive 66, elle,
   ne donne qu'un résumé de règles — et son exemple est mal formé (§4, n° 4). La leçon s'appuie donc
   sur le corrigé pour la forme des ancres, pas sur la diapositive.

### 1b · Ce que la KnowledgeBase a DÉJÀ mesuré sur cette séance — ne pas le remesurer

Deux fiches couvrent la séance 3 **explicitement**, et elles ont lu ce que l'extracteur ne lit pas
(les captures d'écran des diapositives 40, 42, 43, 48, 49 et 63, ingérées à la passe d'archivage du
**2026-08-19**) :

| Fiche | Ce qu'elle porte pour cette leçon | Lignes |
|---|---|---:|
| `web/php/php-librairie-standard.md` | dates et fuseau, chaînes (standard **et** sécurité), maths, `preg_*`, **validation** — et une section « Ce que montre le corrigé officiel de la séance 3 » | 487 |
| `web/php/php-fichiers-journalisation.md` | le système de fichiers, les `.ini` du cours, **les cinq défauts du `log_message()` de l'enseignant**, « jamais dans la racine web » | 512 |

🔴 **Les deux constats les plus exposés de cette leçon y sont déjà établis et sourcés** : le
`$message .=` sur une variable non initialisée (fiche journalisation, § « Le code fourni par
l'enseignant » — elle en compte **cinq** défauts, pas un) et le retour de `filter_var()` qui n'est
pas un booléen (fiche librairie standard, § « Validation des données de formulaire »). La leçon s'y
appuie ; le `verificateur-theorie` les confirme quand même — une fiche KB est une source, pas une
preuve.

## 2 · La table des renvois

**Vingt-neuf titres** — quatorze `##` et quinze `###`. Le compte est écrit ici **au moment où la
table est bâtie**, et c'est lui qui fait foi pour dimensionner le brief : au lot PHP-3, un compte
recopié de mémoire (22 au lieu de 26) a sous-estimé de moitié le volume de sortie, et le rédacteur
a fini à 167k.

| # | Titre de la leçon | Renvoi | Ce que portent les diapositives |
|---|---|---|---|
| 1 | `## L'idée en une image` | `{diapos="14, 37, 53"}` | la librairie standard comme outillage déjà fourni : chaînes, fichiers, validation |
| 2 | `## En bref — la marche à suivre` | `{diapos="9, 18-21, 26-29, 33, 41, 47, 53-55, 64"}` | de l'horodatage à la validation d'une entrée, en passant par le fichier de configuration et le journal |
| 3 | `## Ce que la séance 3 enseigne, et ce que cette leçon ajoute` | `{diapos="3, 4, 6"}` | le rappel de la séance 2 et le sommaire annoncé du cours |
| 4 | `## Les dates` | `{diapos="8, 9"}` | `date()`, et le format `Y-m-d H:i:s` retenu pour toute la session |
| 4a | `### Les autres formats, et où les chercher` | `{diapos="10"}` | le renvoi au manuel PHP pour les autres lettres de format |
| 4b | `### Le fuseau horaire, et le piège du support` | `{diapos="11"}` | la marche à suivre du cours — écrite pour **XAMPP**, interdit au Cégep |
| 5 | `## Traiter les chaînes de caractères` | `{diapos="14, 15, 17"}` | pourquoi ces fonctions comptent, et la liste de celles que le cours couvre |
| 5a | `### substr() et explode() — extraire, découper` | `{diapos="18, 19"}` | les trois paramètres de `substr` ; `explode` et son séparateur |
| 5b | `### str_replace() et str_contains() — remplacer, chercher` | `{diapos="20, 21"}` | le remplacement, et le booléen de présence |
| 6 | `## Les fonctions de sécurité du cours` | `{diapos="24"}` | les quatre fonctions annoncées comme « de sécurité » |
| 6a | `### md5() et sha1() — ce qu'elles font, et ce qu'elles ne doivent plus faire` | `{diapos="25"}` | hachage constant mais irréversible ; « prototyper », jamais le produit final |
| 6b | `### htmlspecialchars() — afficher sans exécuter` | `{diapos="26"}` | les caractères spéciaux vers leurs entités, et le lien avec le XSS |
| 6c | `### password_hash() et password_verify()` | `{diapos="27-29"}` | `PASSWORD_DEFAULT`, le sel aléatoire, et la vérification sans déchiffrement |
| 7 | `## Les fonctions mathématiques` | `{diapos="32-35"}` | `abs`, `floor`/`ceil`, `round`, `min`/`max`, `pow`, `log` |
| 8 | `## Le système de fichiers` | `{diapos="37"}` | les deux usages retenus : configuration et journalisation |
| 8a | `### Le fichier de configuration, et parse_ini_file()` | `{diapos="39-43"}` | le format `propriété=valeur`, et le tableau associatif rendu |
| 8b | `### Un .ini posé dans www/ se télécharge en clair` | `{hors-cours}` | — (ajout de la leçon, ancré sur le corrigé §1a n° 2) |
| 8c | `### La journalisation, et la fonction du cours` | `{diapos="46-49"}` | à quoi sert un journal, le code de `log_message()` et son résultat |
| 8d | `### Le défaut de log_message() — « .= » sur une variable neuve` | `{diapos="47"}` | la ligne exacte, et l'`error_reporting` qui la couvre |
| 9 | `## Valider les données d'un formulaire` | `{diapos="52"}` | pourquoi valider ce que `$_GET`/`$_POST` rapportent |
| 9a | `### filter_var() et les cinq filtres` | `{diapos="53-57"}` | les deux paramètres, la liste des constantes, l'exemple courriel |
| 9b | `### FLOAT, INT, IP, URL` | `{diapos="58-63"}` | les quatre autres filtres, un à un |
| 9c | `### Le piège du retour — « 0 » est valide et pourtant faux` | `{diapos="53, 60"}` | la diapositive promet un booléen ; `filter_var` retourne la **valeur** |
| 9d | `### Quand les filtres ne suffisent pas — preg_match()` | `{diapos="64-66"}` | les deux paramètres, et le résumé de syntaxe des expressions régulières |
| 10 | `## Exemple simple` | `{diapos="9, 47"}` | horodater une ligne de journal, de bout en bout |
| 11 | `## Exemple complet` | `{diapos="39-43, 47-49, 53-55"}` | une page qui lit sa configuration, valide son entrée et journalise |
| 12 | `## À toi de jouer` | `{hors-cours}` | — (exercice de la leçon, distinct de ceux du cours) |
| 13 | `## À retenir` | `{diapos="68, 70"}` | la conclusion de la section validation et celle du cours |
| 14 | `## Aller plus loin` | `{diapos="72, 74"}` | le prochain cours (POO) et les liens de référence du déck |

## 3 · Le sens inverse — quelles diapositives sont ATTEIGNABLES

**53 diapositives citées sur 74.** Les **21** orphelines, une par une :

| Diapo | Ce qu'elle porte | Pourquoi elle n'est citée nulle part |
|---|---|---|
| 1 | « Cours 3 Librairie standard PHP » | page de couverture |
| 2 | « Correction des exercices (30 minutes) » | déroulement de la séance, pas du contenu |
| 5 | « Syntaxe PHP » | titre de section resté du déck précédent, sans contenu |
| 7 | « Les dates » | titre de section |
| 12 | transition vers le système de fichiers | annonce de section, sans contenu |
| 13 | « Traitement de chaine de caractère » | titre de section |
| 16 | « Traitement de chaine de caractère (Standard) » | titre de sous-section |
| 22 | transition vers les fonctions de sécurité | annonce de section |
| 23 | « Traitement de chaine de caractère (Sécurité) » | titre de sous-section |
| 30 | transition vers les fonctions mathématiques | annonce de section |
| 31 | « Fonctions mathématiques » | titre de section |
| 36 | « Le système de fichiers » | titre de section |
| 38 | « Fichier de configuration » | titre de sous-section |
| 44 | transition vers la journalisation | annonce de section |
| 45 | « Journalisation des évènements » | titre de section |
| 50 | transition vers la validation | annonce de section |
| 51 | « Validation des formulaires » | titre de section |
| 67 | le lien w3schools sur les regex | **doublon exact** du lien déjà porté par la diapositive 66 |
| 69 | « Conclusion » | titre de section |
| 71 | « Prochain cours » | titre de section |
| 73 | « Questions? » | fin de présentation |

**Aucun trou de leçon.** Les deux sens sont mesurés séparément.

⚠️ **Ce que la table ne peut PAS mesurer, et il faut l'écrire.** Seize diapositives du déck
(**19, 20, 21, 28, 34, 40, 42, 43, 48, 49, 56, 57, 59, 61, 63, 65**) portent leur matière dans une
**capture d'écran de code**, que l'extracteur ne lit pas — leur ligne d'extrait se réduit à un titre
et à une amorce (« Exemple : », « Par exemple », « Résultat : »). Leur renvoi est donc juste (le
sujet est bien celui-là), mais **le code qu'elles montrent n'est pas connu du dépôt**. Deux cas
méritent d'être signalés nommément :

- la diapositive **63** (`FILTER_VALIDATE_URL`) ne porte **que** le mot « Exemple » : ce filtre n'a
  **aucune** explication écrite dans tout le déck, alors qu'il figure à la liste de la diapositive
  54. Et la capture, elle, a été lue — par la KnowledgeBase, à sa passe d'archivage du 2026-08-19 :
  elle montre **`FILTER_VALIDATE_IP`**, déjà vu à la diapositive 62 (`$addresse = "192.168.0.125"`).
  **Il n'existe donc aucun exemple d'URL dans tout le matériel du cours.** La leçon écrit le sien
  (voir `KnowledgeBase/web/php/php-librairie-standard.md`, section « Validation des données de
  formulaire »).
  ✅ **Le marqueur `à-vérifier:` qui pesait sur ce filtre est LEVÉ depuis le 2026-09-15.** Il avait
  été posé en croyant la question dépendante du poste — « à trancher par exécution sur la version de
  PHP de WAMP ». C'était une erreur de diagnostic : la règle est dans `php_filter_validate_url`
  (`ext/filter/logical_filters.c`), **identique de la branche 8.0 à aujourd'hui**, et elle se lit
  sans rien exécuter. Le filtre **n'a aucune liste de schémas** ; il refuse ce qui n'a pas de schéma,
  ou pas d'hôte hors `mailto`/`news`/`file`. D'où : `javascript:alert(1)` nu rejeté,
  `javascript://%0aalert(1)` **passant**, `file:///…` et `php://filter/…` passants, `//exemple.ca`
  rejeté. 🔴 **La leçon de méthode** : avant d'écrire « ça dépend du poste », demander *où vit
  réellement la règle*. Un marqueur posé à tort n'est pas neutre — il promet une vérification que
  personne ne fera, et il maintient un module hors publication sans raison ;
- les diapositives **48 et 49** (« Quel sera le résultat ? », puis « Résultat : ») posent une
  question dont la réponse est une image. La leçon reconstruit l'exemple **à partir du code de la
  diapositive 47**, qui, lui, est du texte — jamais à partir d'une reconstitution devinée.

## 4 · 🔴 Ce que la source dit et qui demande une nuance — à ne PAS trancher en silence

1. 🔴 **La diapositive 11 donne la marche à suivre du fuseau horaire pour XAMPP** —
   `C:\xampp\php\php.ini`, puis « redémarrer Apache et MariaDB dans XAMPP ». Or **XAMPP est
   interdit sur les postes du Cégep** (Cours 1, diapositive 26) et l'environnement de référence du
   projet est **WAMP** (D-PHP-3). La marche à suivre reste juste dans son principe — la directive à
   changer est bien `date.timezone`, et `America/Toronto` est bien la valeur — mais **le chemin est
   faux pour le poste de l'étudiant**, et un chemin faux se recopie tel quel. La leçon écrit la voie
   WAMP en `à-vérifier:` (le dossier de version de PHP sous `C:\wamp64\bin\php\` n'est pas connu,
   P-4 n'est pas fourni) et nomme l'écart en `correction-du-cours`. C'est une **troisième**
   occurrence de la contradiction XAMPP/WAMP déjà consignée pour la séance 1.
2. 🔴 **La diapositive 53 promet un booléen, et c'est faux.** « La méthode retournera une valeur
   booléenne pour indiquer si le test a été réussi ou non » : `filter_var()` retourne en réalité la
   **valeur filtrée**, ou `false` en cas d'échec. La différence est démontrable et elle mord :
   `filter_var("0", FILTER_VALIDATE_INT)` retourne l'entier `0`, qui est **faux** dans un `if` —
   donc le patron de la diapositive 60, `if (filter_var($valeur, FILTER_VALIDATE_INT)) { … }`,
   **rejette l'entrée valide « 0 »**. Le remède est `!== false`. La leçon le nomme en
   `correction-du-cours` et en fait un titre à part (9c).
   ✅ **CONFIRMÉ par le `verificateur-theorie` le 2026-09-15** : la démonstration tient telle
   quelle. Le même passage a gagné une nuance que la table n'avait pas vue — `FILTER_NULL_ON_FAILURE`
   **casse** le patron `!== false` qu'il est censé secourir (l'échec vaut alors `null`), et les deux
   se choisissent donc ensemble.
3. **La diapositive 25 mélange hachage et chiffrement** : « prototyper des l'encryption de mot de
   passe ». Hacher n'est pas chiffrer — un hachage ne se défait pas, un chiffrement se déchiffre.
   La diapositive 27 récidive (« la crypter avec un algorithme de hachage ») et écrit « un set
   aléatoire » là où le terme est **sel** (*salt*). À nommer sobrement : le vocabulaire, pas le
   procédé, et **MD5/SHA-1 ne servent plus à un mot de passe, même pour prototyper** — la voie du
   cours et la voie moderne se disent avec `{voie="cours"}` / `{voie="moderne"}` (**D-PHP-1**,
   forme courte).
4. **La diapositive 66 donne un résumé de syntaxe dont deux points sont mal écrits.** Le point 4
   illustre la répétition par `[3-7{3}]` — les accolades sont **à l'intérieur** de la classe de
   caractères, ce qui ne veut pas dire ce qu'il annonce ; la forme juste est `[3-7]{3}`. Le point 5
   dit qu'on « ajoute un caractère individuel avec `\` » là où l'antislash **échappe** un caractère
   spécial. Le corrigé officiel, lui, écrit des expressions correctes (§1a n° 5). La leçon corrige
   les deux, en `correction-du-cours`.
5. **La diapositive 15 annonce `str_contains` parmi les fonctions « standards ».** C'est une
   fonction de **PHP 8.0 ou plus récent** ; sur une installation plus ancienne, elle n'existe pas.
   Rien à contredire — WAMP livre PHP 8 — mais à dire une fois, parce que l'étudiant trouvera sur le
   web des réponses écrites pour PHP 7 qui emploient `strpos() !== false`.
6. **La diapositive 8 écrit le format « YYYY-MM-JJ HH:MM:SS ».** C'est une notation **humaine**, pas
   une chaîne de format PHP : `MM` désignerait le mois et les minutes à la fois. La chaîne réelle
   est sur la diapositive 9 (`"Y-m-d H:i:s"`), et c'est elle que la leçon emploie. Aucune
   contradiction, mais ne pas recopier la première dans un bloc de code.

## 5 · Ce qui bloque encore la publication

Le module restera en **`statut: verifiee`**, comme les séances 1 et 2. `valider.mjs` §6 refuse
`statut: publiee` au premier marqueur `à-vérifier:`, et il en reste **quatre** après la passe
adversariale du 2026-09-15 (le cinquième, sur `FILTER_VALIDATE_URL`, a été levé — voir §3) : les
chemins du poste **P-2, P-4, P-5, P-6 et P-7** ne sont pas fournis
(`docs/agile/reprise-php-en-bref.md` §3). Seuls **P-1** (`C:\Users\0758510`) et **P-3**
(`C:\wamp64`, racine servie `C:\wamp64\www`) sont confirmés. **Les quatre restants dépendent tous
réellement du poste** — c'est ce qui les distingue du cinquième.

⚠️ **Le module n'entre pas ENCORE dans `MODULES_AU_FORMAT_ACTIONNABLE`** — mais l'obstacle qui
l'en empêchait est **levé depuis le 2026-09-22** (lot **PHP-F**) : `src/format-actionnable.spec.ts`
fixait `content/cours/securite-web` en dur et la liste était indexée par **slug nu**. Elle porte
désormais des clefs `<sujet>/<slug>`, et le spec balaie les racines rendues par
`build.mjs --racines-par-defaut` — les deux cours. Ce qui reste est une **déclaration de conformité
module par module**, qui vaut revue humaine : lot **PHP-F2**. Les renvois `{diapos="…"}` de cette
table sont écrits **quand même** — leur grammaire est légale sur n'importe quel module ; c'est
seulement leur **caractère obligatoire** qui dépend de la liste.
