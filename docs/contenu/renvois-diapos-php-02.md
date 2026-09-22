# Renvois diapositives — PHP, module 02 « Syntaxe PHP (suite) »

> **Ce que c'est.** La table de correspondance **mesurée** entre chaque titre `##`/`###` prévu pour
> `content/cours/php/02-superglobales-tableaux-classes/lecon.md` et les diapositives réelles du
> support de la **séance 2** du cours **420-4P2-HU** « Développement d'application en PHP »
> d'Alexandre Mageau-Pétrin. Produite le **2026-09-14**, au lot **PHP-3**, **par le fil principal** —
> le déck fait 60 diapositives, donc 60 lignes d'extrait : il tient en une lecture, et la règle
> appliquée à la séance 1 vaut telle quelle (**c'est la taille de la SOURCE qui décide, pas la
> nature de la tâche**).

## 0 · La source, et sa fraîcheur

| Étiquette | Cours | Ce qui a été lu | Diapos |
|---|---|---|---|
| **4P2** | 420-4P2-HU « Développement d'application en PHP » — le cours du sujet `php` | `php-2026/extraits/Cours02_variablesSuperGlobales_Tableau_Classe.txt`, **lu en entier** | **60** pour la séance 2 |

Le numéro entre crochets de l'extrait est le **rang de présentation**, dérivé de
`ppt/presentation.xml` — c'est ce numéro-là, et lui seul, qui est cité ici. **Aucun agent ne lit un
`.pptx`**, et `WebFetch` n'est jamais employé sur un support de cours : il invente plutôt que
d'échouer.

✅ **Fraîcheur vérifiée avant d'écrire une ligne de cette table, et cette fois JUSQU'AU SITE.**

1. `extraire-diapositives.mjs` relancé le **2026-09-14** sur
   `php-2026/Cours02_variablesSuperGlobales_Tableau_Classe.pptx` : sortie **identique octet pour
   octet** à l'extrait de `extraits/` — **60 diapositives**, même ordre, même texte.
2. 🔴 **Et le doute qu'une comparaison locale ne lève jamais a été levé, lui aussi** : `curl -I` sur
   la copie servie par le site de l'enseignant rend `Content-Length: 1314655` — **exactement** la
   taille du `.pptx` local — et `Last-Modified: Fri, 31 Jul 2026 19:35:02 GMT`, soit **antérieur**
   au téléchargement local du 2026-08-31. Aucune republication depuis. C'est le trou nommé au lot
   PHP-2 (« seul un retéléchargement lève ce doute ») ; deux en-têtes HTTP suffisent à le fermer,
   et ils coûtent une commande.

## 1 · Les exercices — vérifiés à la SOURCE D'AUTORITÉ

`content/cours/php/exercices.json` porte **7 exercices** pour la séance 2, références **1 à 7**,
aucun numéro qui saute. La numérotation repart à `1` parce que le registre exige l'unicité **dans
une séance**, pas dans le fichier (`exercices.schema.json`, champ `reference`) — et parce que la
feuille de l'enseignant s'intitule elle aussi « Exercice 1 » à « Exercice 7 ». Un encadré de la
leçon les cite donc par `::: exercice-du-cours {seance="2" ref="…"}`.

✅ Relevés le **2026-09-14** sur <https://www.alexandrepetrin.ca/exercice-php-cours-2-2026/> — **le
site de l'enseignant, pas la copie locale** (`php-2026/extraits/exercices-cours-02.txt`). Les deux
concordent : 7 énoncés, même ordre, même numérotation, et l'exercice 5 porte bien ses trois
sous-points 5.1 / 5.2 / 5.3.

Les énoncés du registre sont **REFORMULÉS**, jamais recopiés (décision X-1) : ce dépôt est public.

### 1a · Le corrigé officiel de la séance — lu, et il change la leçon

Le **corrigé publié par l'enseignant** (archive `corrige_php_cours02.zip` de la page du cours,
relevée le **2026-09-14** — 7 fichiers `.php`) a été lu. Quatre constats **doivent** être portés par
la leçon, parce qu'ils sont vrais du code que l'étudiant recevra :

1. 🔴 **`exercice2.php` du corrigé est une XSS réfléchie** : il concatène `$_GET["nom"]` directement
   dans la sortie. C'est le **même** patron que le corrigé de la séance 1 — deuxième occurrence dans
   le même cours. La leçon le traite en `comparaison` vulnérable/corrigé (`htmlspecialchars(…,
   ENT_QUOTES, 'UTF-8')`), comme la séance 1, et elle nomme le corrigé comme **source**, sans le
   recopier.
2. **`exercice5.php` du corrigé démontre le piège de la diapositive 23 sans le dire** : après un
   `unset()` sur l'indice 1 puis deux ajouts sans clé, les clés du tableau sont `0, 2, 3, 4` — la
   clé **n'est pas** la position, et `unset()` ne réindexe pas. Le `print_r()` du corrigé rend ce
   fait visible à l'écran. C'est le meilleur moment mémorable de la séance, et il est ancré sur du
   code de l'enseignant.
3. **`exercice6.php` du corrigé s'écarte de son propre énoncé.** L'énoncé demande une fonction
   `AfficherEtudiantEnEchec()` qui **retourne un tableau de noms** ; le corrigé l'affiche et ne
   retourne rien, puis l'appelle sous `echo` — donc `echo` sur `null`. Ce n'est **pas** une erreur à
   taire : la leçon nomme l'écart en `correction-du-cours`, sans reprocher quoi que ce soit.
4. **`exercice1.php` du corrigé est un fichier vide** (des balises PHP et rien entre elles). La
   leçon ne peut donc s'appuyer sur aucun corrigé pour l'exercice 1 de la séance 2 — elle écrit son propre
   exemple, à partir du texte des diapositives 9 à 13.

## 2 · La table des renvois

**Vingt-six titres** — douze `##` et quatorze `###`. Le compte est écrit ici parce qu'un brief de ce
lot l'a annoncé à **22** en recomptant de mémoire une table qu'il avait sous les yeux : le rédacteur
a suivi la table (26, c'est elle qui fait foi) et le volume de sortie visé, calé sur le mauvais
compte, s'est trouvé sous-estimé de moitié.

| # | Titre de la leçon | Renvoi | Ce que portent les diapositives |
|---|---|---|---|
| 1 | `## L'idée en une image` | `{diapos="8, 9, 23"}` | des tableaux fournis par PHP, accessibles de partout ; et le tableau PHP comme table associative ordonnée |
| 2 | `## En bref — la marche à suivre` | `{diapos="9, 12, 17-19, 24-31, 36, 42-46"}` | de la lecture d'une superglobale à l'instanciation d'une classe, en passant par le transtypage et les tableaux |
| 3 | `## Ce que la séance 2 enseigne, et ce que cette leçon ajoute` | `{diapos="3, 6"}` | le rappel de la séance 1 et le sommaire annoncé du cours |
| 4 | `## Les variables superglobales` | `{diapos="7, 8"}` | ce qu'elles sont, d'où viennent leurs informations |
| 4a | `### Les neuf superglobales, et lesquelles serviront` | `{diapos="9, 14"}` | la liste complète ; `$_GET`, `$_POST`, `$_SESSION` retenues pour la session |
| 4b | `### Lire $_SERVER — un premier exemple` | `{diapos="10, 11"}` | l'exemple du cours et son résultat, dont `::1` équivalent de `127.0.0.1` |
| 4c | `### Voir l'intérieur d'un tableau — print_r()` | `{diapos="12, 13"}` | `print_r()` et la représentation clé-valeur affichée |
| 5 | `## Le transtypage` | `{diapos="15, 16"}` | convertir d'un type à l'autre, et les cas courants |
| 5a | `### Connaître le type — gettype()` | `{diapos="17"}` | la fonction et son exemple |
| 5b | `### Convertir — intval, floatval, strval, boolval` | `{diapos="18, 19"}` | les cinq fonctions listées par le cours, et l'exemple |
| 6 | `## Les tableaux` | `{diapos="21, 22"}` | le programme de la section : créer, ajouter, supprimer, compter, parcourir |
| 6a | `### Un tableau PHP est une table associative ordonnée` | `{diapos="23"}` | la clé n'est pas la position ; parenté avec le dictionnaire de C# |
| 6b | `### Créer un tableau — array()` | `{diapos="24"}` | la création avec des éléments initiaux |
| 6c | `### Ajouter un élément, avec ou sans clé` | `{diapos="25-28"}` | ajout sans clé, ajout avec clé choisie, et la coexistence clés numériques / clés textuelles |
| 6d | `### Supprimer — unset(), et le trou qu'il laisse` | `{diapos="29, 30"}` | `unset()` retire l'élément — et ne réindexe pas |
| 6e | `### Compter — count()` | `{diapos="31"}` | le nombre d'éléments d'un tableau |
| 6f | `### Parcourir — for, array_keys(), foreach` | `{diapos="32-37"}` | la limite de `for`, le contournement par `array_keys()`, et `foreach` sur clés numériques puis textuelles |
| 7 | `## Les classes` | `{diapos="40, 41"}` | à quoi servent les classes, et l'annonce de la section |
| 7a | `### Déclarer une classe, ses attributs, ses méthodes` | `{diapos="42-44"}` | la déclaration, un attribut public, une méthode et `$this` |
| 7b | `### Le constructeur et l'instanciation` | `{diapos="45-47"}` | `__construct()`, l'opérateur `new`, et l'exemple complet du cours |
| 7c | `### Le quiz du cours — et la réponse à nuancer` | `{diapos="48-53"}` | les trois questions : nom du constructeur, visibilité obligatoire, `$this` |
| 8 | `## Exemple simple` | `{diapos="10-13"}` | lire `$_SERVER` et l'afficher, avec `print_r()` pour inspecter |
| 9 | `## Exemple complet` | `{diapos="9, 18, 24-31, 42-47"}` | une page qui lit des paramètres GET, les transtype, les range dans un tableau et instancie une classe |
| 10 | `## À toi de jouer` | `{hors-cours}` | les 7 exercices viennent de la **feuille** de la séance, pas du déck |
| 11 | `## À retenir` | `{diapos="54, 56"}` | la classe revue en détail au cours 4 ; le résumé des trois sections |
| 12 | `## Aller plus loin` | `{diapos="58, 60"}` | ce que la séance 3 apportera (librairie standard) et les références de l'enseignant |

## 3 · La mesure dans l'AUTRE sens — les diapositives orphelines

> 🔴 **Un titre muet fait rougir le gate ; une diapositive qu'aucun titre n'atteint ne fait rougir
> personne.** Le geste qui les attrape est mécanique : faire l'**union** des diapositives citées et
> la soustraire de `1..60`.

Union des renvois ci-dessus : **50 diapositives citées sur 60**. Les **10** qui restent, une par
une, avec ce qu'elles portent :

| Diapos | Nature | Verdict |
|---|---|---|
| 1 | page couverture (« Cours 2 — Syntaxe PHP (Suite) ») | ✅ attendu |
| 2, 5, 55, 57, 59 | **diapositives de titre de section**, sans contenu (« Rappel du dernier cours », « Syntaxe PHP (Suite) », « Conclusion », « Prochain cours », « Questions? ») | ✅ attendu |
| 4 | « Correction des exercices » — une consigne de déroulement de séance, aucune matière | ✅ hors matière |
| 20 | phrase de transition (« ceci termine le transtypage, la prochaine section couvre les tableaux ») | ✅ attendu |
| 38, 39 | **deux diapositives de transition consécutives au texte quasi identique** (« Voici donc qui termine notre section sur les tableaux ») — un doublon du déck de l'enseignant, pas un contenu manqué | ✅ attendu — voir §4.4 |

**Aucun trou de leçon.** Les deux sens sont mesurés séparément.

⚠️ **Ce que la table ne peut PAS mesurer, et il faut l'écrire.** Dix-sept diapositives du déck
(**10, 11, 13, 17, 19, 25 à 31, 33, 35 à 37, 47**) portent leur matière dans une **capture d'écran
de code**, que l'extracteur ne lit pas — leur ligne d'extrait se réduit à un titre et à une phrase
d'amorce (« Par exemple : », « Voyons un exemple »). Leur renvoi est donc juste (le sujet est bien
celui-là), mais **le code qu'elles montrent n'est pas connu du dépôt**. La leçon écrit ses propres
exemples, alignés sur le texte de la diapositive et — quand il en existe un — sur le **corrigé
officiel** (§1a), jamais sur une reconstitution devinée.

## 4 · 🔴 Ce que la source dit et qui demande une nuance — à ne PAS trancher en silence

1. 🔴 **La diapositive 51 est fausse telle qu'elle est écrite.** Question du quiz du cours :
   « Vrai ou faux : les attributs et fonctions ont besoin de modificateur de visibilité (Ex.
   Public) » — **Réponse : Oui**. En PHP, une **méthode** sans modificateur est implicitement
   `public` : une méthode déclarée avec le seul mot-clé `function` est du code valide. Une
   **propriété**, elle, doit bien porter un modificateur (`public`/`private`/`protected`, ou
   l'ancien `var`) — la déclarer nue est une erreur de syntaxe. La réponse est donc **juste pour les
   attributs, fausse pour les méthodes**. La leçon nomme l'écart en `correction-du-cours` et
   recommande **d'écrire la visibilité partout quand même** : c'est ce que l'évaluation attend, et
   c'est la bonne pratique.
   ⚠️ **À faire confirmer par le `verificateur-theorie`** — c'est le constat le plus exposé de cette
   leçon.
2. 🔴 **La diapositive 45 écrit une faute de syntaxe PHP, et elle se recopie telle quelle.** La
   syntaxe donnée pour le constructeur est `$this.<attribute> = <param>` : en PHP, le point est
   l'opérateur de **concaténation de chaînes**, l'accès à un membre s'écrit `$this->attribut`. C'est
   le réflexe C#/Java, et le déck le grave dans la diapositive de référence — d'autant que la
   diapositive **44**, elle, écrit correctement `$this->nom`. La leçon corrige, en
   `correction-du-cours`.
   ⚠️ **Attention en lisant la KnowledgeBase sur ce point.** L'encadré de
   `KnowledgeBase/web/php/php-poo.md` (section « Classes, propriétés, méthodes ») signale la même
   faute, mais sous les numéros « diapo 14 » et « diapo 19 » : il vise le déck de la **séance 4**,
   pas celui-ci. Le fait est le même, la citation ne l'est pas — **ne jamais recopier ces numéros-là
   dans un renvoi du module 02.**
3. **La diapositive 18 liste `doubleval`.** C'est un **alias** de `floatval`, conservé pour
   compatibilité ; la documentation PHP renvoie vers `floatval`. À nommer, sans en faire une faute :
   voie du cours / voie moderne (**D-PHP-1**, forme courte `{voie="…"}`).
4. **Les diapositives 38 et 39 se répètent.** Deux transitions consécutives disent la même chose.
   Aucun effet pédagogique ; consigné ici seulement pour qu'une relecture future ne cherche pas un
   contenu manquant entre les deux.
5. **La diapositive 9 décrit `$_REQUEST` comme « contenant $_GET, $_POST et $_COOKIE ».** C'est vrai
   par défaut, mais la composition dépend de la directive `request_order` du `php.ini`, et mélanger
   trois sources de confiance différentes dans une seule variable est précisément ce qu'un cours de
   sécurité déconseille. La leçon le nomme ; elle ne contredit pas le cours.

## 5 · Ce qui bloque encore la publication

Le module restera en **`statut: verifiee`**, comme la séance 1. `valider.mjs` §6 refuse
`statut: publiee` au premier marqueur `à-vérifier:`, et il en reste : les chemins du poste **P-2,
P-4, P-5, P-6 et P-7** ne sont pas fournis (`docs/agile/reprise-php-en-bref.md` §3). Seuls **P-1**
(`C:\Users\0758510`) et **P-3** (`C:\wamp64`, racine servie `C:\wamp64\www`) sont confirmés.

⚠️ **Le module n'entre pas ENCORE dans `MODULES_AU_FORMAT_ACTIONNABLE`** — mais l'obstacle qui
l'en empêchait est **levé depuis le 2026-09-22** (lot **PHP-F**) : `src/format-actionnable.spec.ts`
fixait `content/cours/securite-web` en dur et la liste était indexée par **slug nu**. Elle porte
désormais des clefs `<sujet>/<slug>`, et le spec balaie les racines rendues par
`build.mjs --racines-par-defaut` — les deux cours. Ce qui reste est une **déclaration de conformité
module par module**, qui vaut revue humaine : lot **PHP-F2**. Les renvois `{diapos="…"}` de cette
table sont écrits **quand même** — leur grammaire est légale sur n'importe quel module ; c'est
seulement leur **caractère obligatoire** qui dépend de la liste.
