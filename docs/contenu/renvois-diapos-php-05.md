# Renvois diapositives — PHP, module 05 « Intégration de base de données »

> **Ce que c'est.** La table de correspondance **mesurée** entre chaque titre `##`/`###` prévu pour
> `content/cours/php/05-integration-base-de-donnees/lecon.md` et les diapositives réelles du support
> de la **séance 5** du cours **420-4P2-HU** « Développement d'application en PHP » d'Alexandre
> Mageau-Pétrin. Produite le **2026-09-16**, au lot **PHP-6**, **par le fil principal** — le déck
> fait 73 diapositives, le plus long des cinq, mais sa matière est déjà lue et étiquetée par la
> KnowledgeBase : la table se bâtit par confrontation, pas par découverte.

## 0 · La source, et sa fraîcheur

| Étiquette | Cours | Ce qui a été lu | Diapos |
|---|---|---|---|
| **4P2** | 420-4P2-HU « Développement d'application en PHP » — le cours du sujet `php` | `php-2026/extraits/Cours05_integration_base_de_donnees.txt`, **lu en entier** | **73** pour la séance 5 |

Le numéro entre crochets de l'extrait est le **rang de présentation**, dérivé de
`ppt/presentation.xml` — c'est ce numéro-là, et lui seul, qui est cité ici. **Aucun agent ne lit un
`.pptx`**, et `WebFetch` n'est jamais employé sur un support de cours : il invente plutôt que
d'échouer.

✅ **Fraîcheur vérifiée avant d'écrire une ligne de cette table, et jusqu'au site.**

1. Le `.pptx` servi par le site a été **retéléchargé** le 2026-09-16 et son empreinte comparée à la
   copie locale : `md5 = b0d4a1721b21eec6c8cc40bef8efc1e4` des **deux côtés**, `Content-Length:
   1393382` identique. **Aucune republication depuis le téléchargement local du 2026-08-31.**
   `Last-Modified: Thu, 06 Aug 2026 16:59:58 GMT`.
2. `extraire-diapositives.mjs` relancé le **2026-09-16** sur ce `.pptx` : **73 diapositives**,
   `diff` **vide** contre l'extrait de `extraits/`. Même ordre, même texte, octet pour octet.

### 0a · 🔴 CE QUE L'INSTRUMENT PEUT MESURER ICI, ET CE QU'IL NE PEUT PAS

Depuis **L-109**, tout exemple de code se fait **exécuter** avant publication. Cette séance est la
première où cette règle **ne peut pas s'appliquer entièrement**, et il faut le dire avant d'écrire
plutôt que de le découvrir en revue.

| Instrument | Disponible sur le poste | Ce qu'il prouve |
|---|---|---|
| `php -l` (PHP **8.5.10** CLI, `C:\php`) | ✅ | la **syntaxe** de tout fichier `.php` de la séance |
| exécution PHP pure (chaînes, fichiers, `password_hash`, `parse_ini_file`, `htmlspecialchars`) | ✅ | la **sortie réelle** de tout fragment qui ne touche pas la base |
| extension **`mysqli`** | ⚠️ pas chargée par défaut, mais **activable à la volée** : `php -d extension_dir=C:/php/ext -d extension=php_mysqli.dll` | les erreurs de **signature et de site d'appel** — mesuré le 2026-09-16 |
| **serveur MySQL / MariaDB** | ❌ **aucun** sur le poste (ni `C:\wamp64`, ni XAMPP, ni service) | — |

> ⚠️ **La ligne `mysqli` disait d'abord « ❌ non chargeable », et c'était une conclusion tirée trop
> vite d'un `php -m`.** L'extension est bel et bien là, et s'active par `-d`. Ce qu'on en tire :
> tout ce qui échoue **avant d'atteindre le serveur** est mesurable — types d'arguments, passage par
> référence, arité. Mesuré : `mysqli_stmt_bind_param(null, "s", "Robert")` rend
> `Argument #3 could not be passed by reference` **sans aucune connexion**, parce que le contrôle de
> référence précède la vérification de type de l'argument 1. **Un instrument absent et un instrument
> qu'on n'a pas su allumer ne se ressemblent que de loin.**

🔴 **Conséquence, à écrire dans le brief du rédacteur :** aucun `prepare`/`bind_param`/`execute`/
`fetch` de cette leçon ne peut être **exécuté**. Il peut être **lu par `php -l`**, il peut être
confronté au **corrigé officiel** et au **code de démonstration** de l'enseignant — mais une
affirmation sur ce que la base *renvoie* est un raisonnement, pas une mesure, et elle se formule
comme tel. C'est exactement le mode d'échec dominant des deux lots précédents (une **sortie
annoncée** qui diffère de la **sortie réelle**) ; ici, l'instrument qui l'a attrapé n'existe pas.
**La parade est de ne montrer de « sortie » que là où elle est mesurable** — et la séance en offre
plusieurs, listées au §1c.

### 0b · Deux corpus de code de l'enseignant, à NE PAS confondre

Les deux ont été retéléchargés le **2026-09-16** et rangés sous `php-2026/` (dossier **gitignoré**) :

| Fichier | Ce que c'est | Rangé dans |
|---|---|---|
| `corrige_php_cours05.zip` | le **corrigé officiel des huit exercices** — 11 fichiers, 257 lignes, table `client`, dump `cours3.sql` | `php-2026/corriges/corrige5_php/` |
| `cours05_code_demo.zip` | le **code de la démonstration en groupe** annoncée par la diapositive 71 — 7 fichiers, 222 lignes, table `compte`, dump `demotable.sql` | `php-2026/demos/cours05_code_demo/` |

🔴 **Le code de démonstration n'est PAS celui des captures du déck, et l'écart est daté.** Le dump
`demotable.sql` est généré le **2026-09-01** (MariaDB 11.4.9, PHP 8.3.28, hôte `127.0.0.1:3307`),
soit **après** le `.pptx` (`Last-Modified` du 2026-08-06). Sa table `compte` porte
`id_compte, prenom, nom, courriel` — **aucune colonne `motdepasse`**, alors que les captures des
diapositives 38, 46 et 51, telles que la KnowledgeBase les a lues le 2026-08-19, en portent une.
L'enseignant a donc **rafraîchi son code de démonstration sans refaire ses diapositives**.
⚠️ Une leçon qui mélangerait les deux tables décrirait un code qui n'existe nulle part.

✅ **Ce que ce zip permet, en revanche, et qui est neuf** : la numérotation des lignes des
diapositives 39 à 45 (« Ligne 2-5 », « Ligne 7 », « Ligne 12 », « Ligne 13 », « Ligne 15-17 »,
« Ligne 19 », « Ligne 20 ») **concorde** avec la structure de `ajouterCompte.php`, à un décalage de
deux lignes vides près. La capture de la diapositive 38 se reconstitue donc **avec sa numérotation
d'origine**, ce qu'aucun lot précédent n'avait pu faire sur une capture.

⚠️ **`corriges/corrige5_php/cours3.sql` contient l'adresse courriel personnelle de l'enseignant**
dans son `INSERT`. Le dossier est gitignoré ; **rien de ce fichier ne se recopie dans `content/`**.

## 1 · Les exercices — vérifiés à la SOURCE D'AUTORITÉ

`content/cours/php/exercices.json` portera **8 exercices** pour la séance 5, références **1 à 8**,
aucun numéro qui saute. La numérotation repart à `1` parce que le registre exige l'unicité **dans
une séance**, pas dans le fichier (`exercices.schema.json`, champ `reference`). Un encadré de la
leçon les cite donc par `::: exercice-du-cours {seance="5" ref="…"}`.

✅ Relevés le **2026-09-16** sur <https://www.alexandrepetrin.ca/exercice-php-cours-5-2026/> — **le
site de l'enseignant, pas la copie locale** (`php-2026/extraits/exercices-cours-05.txt`). Les deux
concordent **énoncé par énoncé** : 8 énoncés, même ordre, mêmes noms de fichiers (`index.php`,
`ajouter_client.php`, `ajout.php`, `modification.log`, `database.ini`, `configuration.php`), même
base `Cours5`, même table `client` à quatre champs, même liste des cinq `$_SERVER`.

✅ **Et, contrairement à la séance 4, la page ne porte AUCUNE image.** Les huit énoncés sont
intégralement lisibles en texte : rien n'est « connu par ailleurs seulement ».

⚠️ **Deux écarts entre l'énoncé et le corrigé officiel, à ne pas gommer en silence** :

- l'**exercice 6** demande un journal nommé **`modification.log`** ; le corrigé écrit dans
  **`journal.log`** ;
- l'**exercice 7** demande un fichier **`database.ini`** ; le corrigé livre **`config.ini`**.

⚠️ **Le libellé `feuille` du registre reste « Exercices du cours 5 (2026) »**, alors que le titre
réel de la page de l'enseignant est « Exercice PHP – Cours 5 (2026) ». Ce n'est pas une coquille de
relevé : c'est la **forme employée par les quatre séances déjà au registre**, et changer les cinq
d'un coup est un lot à part. Le champ est un libellé affiché, jamais un identifiant
(`exercices.schema.json`).

Les énoncés du registre sont **REFORMULÉS**, jamais recopiés (décision X-1) : ce dépôt est public.

### 1a · Le corrigé officiel de la séance — lu en entier, et il porte SEPT défauts

`php-2026/corriges/corrige5_php/`, **11 fichiers / 257 lignes**, **les 8 fichiers PHP passent
`php -l`** (mesuré le 2026-09-16). Les sept défauts sont **déjà écrits**, défaut par défaut et avec
leur correction, dans `KnowledgeBase/web/php/php-base-de-donnees-pdo.md` § « Les sept défauts du
corrigé » — ce lot ne les redécouvre pas, il les **confirme** :

1. `config.ini` **dans la racine web** — Apache sert l'extension `.ini` en `text/plain` ; idem
   `logger.inc` et `journal.log`.
2. Le compte **`root` sans mot de passe** pour quatre opérations CRUD sur une table.
3. **Aucune sortie n'est échappée** — XSS stocké dans `index.php` et dans les `value=` de
   `modifier_client.php`.
4. La **suppression est un lien `GET`** sans jeton ni vérification de propriétaire (écriture en GET
   + CSRF + IDOR) — et l'**exercice 4 la demande explicitement ainsi**.
5. **Aucun `set_charset()`**, alors que les diapositives 54-56 y consacrent une section.
6. **Aucune vérification d'erreur de connexion**, alors que les diapositives 39-40 la montrent.
7. `logger.inc` : `$message .= …` sur une variable **jamais initialisée**, dont l'avertissement est
   **masqué** par l'`error_reporting(E_ERROR | E_PARSE)` posé juste au-dessus.

🔵 **Le point fort est réel et se dit en premier :** **les cinq requêtes du corrigé sont toutes
préparées, et les quatre qui portent une valeur variable la lient**, y compris là où c'était tentant
de concaténer (`WHERE id_client=?` sur une valeur venue de `$_GET`). C'est le cœur pédagogique de la
séance, et il est tenu.

> 🔴 **CE PARAGRAPHE A PORTÉ UNE PHRASE FAUSSE, RECOPIÉE DE LA KB SANS ÊTRE COMPTÉE** — « les cinq
> **écritures** passent toutes par une requête préparée **avec liage** ». Mesuré le 2026-09-16 par
> `grep -n "prepare(\|bind_param(" *.php` sur les onze fichiers : **5 préparées, 4 liées, 3
> écritures**. `index.php:16` prépare un `SELECT` **sans aucun paramètre**, donc sans liage — ce qui
> est correct, et que la diapositive 43 autorise explicitement. Le vérificateur de la moitié B l'a
> attrapé ; la KB (`php-base-de-donnees-pdo.md`) est corrigée, et ce document aussi. **La leçon de
> méthode : un chiffre qui décrit un corpus se recompte sur le corpus, même quand il vient d'une
> source de confiance — surtout quand il en vient**, parce que la confiance est précisément ce qui
> dispense de compter.

### 1b · Les fiches KB qui portent cette séance

| Fiche | Ce qu'elle apporte | Lignes |
|---|---|---:|
| `KnowledgeBase/web/php/php-base-de-donnees-pdo.md` | **la source principale** — socle SQL et ses quatre coquilles, `mysqli` ↔ PDO, requêtes préparées, architecture de page corrigée, le corrigé officiel et ses sept défauts, les versions mesurées. Étiquetage 📘 (matière d'examen) / 🧩 (hors déck) déjà posé | 743 |
| `KnowledgeBase/web/php/exercices-corriges-poo-application.md` § « Séance 5 » | les huit exercices corrigés et commentés | 1057 (dont § séance 5 : 411-752) |
| `KnowledgeBase/web/php/php-fichiers-journalisation.md` | l'exercice 6 — `fopen`/`fwrite`, `file_put_contents` + `LOCK_EX`, et le `.inc` servi en clair | 512 |

🔴 **Aucune plage de lignes autre que celle-là n'est écrite ici, et c'est délibéré.** Une plage
recopiée se périme en silence dès que la fiche est éditée, et elle envoie alors lire le mauvais
passage. Le geste est `grep -n "^## " <fiche>`, **recalculé à chaque lecture**, puis
`Read(fichier, offset, limit)`.

### 1c · Ce qui EST mesurable, et qui a déjà été mesuré le 2026-09-16

Exécuté sur PHP 8.5.10 CLI. Ces chiffres se citent tels quels ; ils n'ont pas à être remesurés par
le rédacteur.

| Affirmation | Mesure |
|---|---|
| `logger.inc` **tel quel** | écrit `[2026-09-16 06:15:45] Un ajout a ete effectue`, **aucun avertissement affiché** |
| la **même fonction** privée de sa ligne `error_reporting()` | `Warning: Undefined variable $message in … on line 5`, **et la ligne écrite est identique** — le bogue est correct par accident, et masqué |
| `password_hash($m, PASSWORD_DEFAULT)` | algorithme `2y`, **60 caractères** |
| le même hachage **tronqué à 30** (la colonne du cours) | `password_verify(...)` renvoie **`false`** ; sur le hachage entier, `true` |
| `password_hash($m, PASSWORD_ARGON2ID)` | **97 caractères** |
| `parse_ini_file("config.ini")` du corrigé | `server=localhost`, `username=root`, `password=''`, `dbname=cours5` |
| `htmlspecialchars('" onfocus="alert(1)')` **sans drapeaux**, PHP 8.5 | `&quot; onfocus=&quot;alert(1)` — et `O'Brien` devient `O&#039;Brien` (défaut `ENT_QUOTES` depuis 8.1) |

**Ajoutées le 2026-09-16, après la passe adversariale** — chacune tranche un constat contesté :

| Affirmation | Mesure |
|---|---|
| `(int)"5 OR 1=1 --"` — la charge d'injection passée par un liage `"i"` | **`int(5)`**. Le serveur chercherait donc l'identifiant **5** et rendrait **cette ligne-là**, pas « aucune ligne ». Le point pédagogique en sort renforcé : la charge n'est plus qu'un déchet de chaîne |
| `$_POST["prenom"]` sur une requête **non-POST** | **`NULL`** + `Warning: Undefined array key`. Un `GET` sur `ajout.php` n'« accepte » donc aucune valeur : il insère des **chaînes vides** |
| un **littéral** passé à un paramètre par référence, PHP 8.5 | `Fatal error: … Argument #1 ($array) could not be passed by reference` — **pas** « Cannot pass parameter 2 by reference », qui est la formulation de PHP 7 |
| le **même**, sur `mysqli` chargée à la volée | `mysqli_stmt_bind_param(): Argument #3 could not be passed by reference` — **obtenu sans connexion** |
| un **appel de fonction** passé à un paramètre par référence | `Notice: Only variables should be passed by reference` — famille **différente** du cas littéral |

## 2 · La table des renvois

| # | Titre de la leçon | Renvoi | Ce que portent les diapositives |
|---|---|---|---|
| 1 | `## L'idée en une image` | `{diapos="6, 10, 41"}` | la base comme « gardienne » de ce qui transige ; SQL comme langage de requête ; la séparation requête/données |
| 2 | `## En bref — la marche à suivre` | `{diapos="26-29, 34, 37, 50, 56"}` | créer la base, brancher le pilote, préparer, lier, exécuter, lire, fixer l'encodage |
| 3 | `## Ce que la séance 5 enseigne, et ce que cette leçon ajoute` | `{diapos="4, 8"}` | le rappel de la séance 4 et le sommaire annoncé du cours |
| 4 | `## Les bases de données relationnelles, et les propriétés ACID` | `{diapos="6, 7"}` | MariaDB/MySQL comme SGBD du cours ; les quatre lettres A-C-I-D |
| 4a | `### L'« Isolé » que le cours définit n'est pas l'isolation` | `{diapos="7"}` | « Deux transactions ne peuvent pas être effectuées en même temps » |
| 5 | `## SQL : le structurel (DDL) et le transactionnel (DML)` | `{diapos="10, 11, 12"}` | ce que SQL permet ; la partition DDL/DML et qui fait quoi |
| 5a | `### CREATE TABLE — et la virgule en trop des diapositives 13, 14 et 16` | `{diapos="13, 14, 15, 16"}` | le gabarit, l'exemple nu, l'exemple avec clé primaire, l'exemple avec `AUTO_INCREMENT` |
| 5b | `### Les contraintes, et pourquoi INDEX n'en est pas une` | `{diapos="17, 18, 19"}` | le tableau des sept « contraintes » ; la règle d'usage des index ; `CREATE INDEX` |
| 5c | `### INSERT, SELECT, UPDATE, DELETE` | `{diapos="20, 21, 22, 23"}` | les quatre opérations CRUD et leurs exemples |
| 6 | `## Créer la base avec PHPMyAdmin — XAMPP sur la diapositive, WAMP au Cégep` | `{diapos="25-32"}` | démarrer le service, « new », nommer, collation, colonnes, `PRIMARY`, `A_I`, structure obtenue |
| 7 | `## Le pilote : brancher PHP sur MySQL` | `{diapos="34, 35, 47, 48"}` | les quatre informations de connexion ; le pilote `MySQLi` ; le port non standard et `my.ini` |
| 8 | `## Une requête sans retour` | `{diapos="36, 37, 38"}` | les deux familles de transactions ; les quatre étapes ; le code projeté |
| 8a | `### Le code du cours, ligne par ligne` | `{diapos="39-46"}` | l'explication ligne à ligne donnée par l'enseignant |
| 8b | `### Le « ? » n'est pas un raccourci d'écriture — c'est la défense contre l'injection SQL` | `{diapos="41"}` | « il est très important de ne jamais concaténer », avec le contre-exemple du cours |
| 8c | `### bind_param lie par RÉFÉRENCE — d'où l'ordre surprenant du cours` | `{diapos="42, 43, 44"}` | `s`/`i`/`d` ; les trois comptes qui doivent coïncider ; l'affectation *après* le liage |
| 8d | `### « Fermer la connexion » ferme en réalité la requête` | `{diapos="37, 45"}` | l'étape 6 annoncée, et le `close()` que le code exécute |
| 9 | `## Une requête avec retour` | `{diapos="49, 50, 51"}` | l'annonce du SELECT ; les six étapes ; le code projeté |
| 9a | `### bind_result, puis fetch` | `{diapos="52, 53"}` | l'égalité des comptes ; la boucle et sa condition d'arrêt |
| 10 | `## L'encodage de la connexion` | `{diapos="54, 55, 56"}` | pourquoi le fixer ; le symbole qui apparaît sinon ; `charset` en utf8 |
| 11 | `## Exporter et réimporter la base` | `{diapos="57-61"}` | à quoi ça sert au déploiement ; « Export » / « GO » ; la réimportation en six gestes |
| 12 | `## L'architecture des pages d'un CRUD` | `{diapos="62-68"}` | les quatre tâches, et la logique de chacune ; les deux différences du formulaire de modification |
| 12a | `### La redirection par header()` | `{diapos="69, 70"}` | `header("location: afficher_client.php");` et le schéma d'ensemble |
| 13 | `## Le corrigé officiel de la séance — ce qu'il fait bien, et ses sept défauts` | `{hors-cours}` | — (ajout de la leçon, ancré sur la fiche KB et sur le `.zip` de l'enseignant) |
| 14 | `## Exemple simple` | `{diapos="20, 37, 38"}` | un `INSERT` préparé, de la connexion à la fermeture |
| 15 | `## Exemple complet` | `{diapos="62-70"}` | la page liste + le formulaire + le traitement + la redirection |
| 16 | `## À toi de jouer` | `{hors-cours}` | — (exercice de la leçon, distinct de ceux du cours) |
| 17 | `## À retenir` | `{diapos="8"}` | les sept points annoncés par le sommaire du cours |
| 18 | `## Aller plus loin` | `{diapos="73"}` | les deux références du déck (w3schools, manuel PHP) |

🔴 **VINGT-HUIT titres — dix-huit `##` et dix `###`.** Le compte est écrit ici **après avoir
énuméré la table, jamais avant**, et il s'obtient en comptant les lignes du tableau ci-dessus :
dix-huit portent un numéro nu (1 à 18, tous `##`) et dix portent une lettre (4a, 5a-5c, 8a-8d, 9a,
12a — tous `###`). C'est **ce chiffre-là** qui dimensionne le brief du rédacteur, et lui seul.

> ⚠️ **Ce total a été écrit FAUX une première fois — « vingt-sept, dont neuf `###` » — et c'est la
> leçon de méthode du lot.** La table, elle, était juste : ses dix lignes à lettre étaient toutes
> là. Le défaut était de **compter de tête une liste qu'on vient d'écrire**, exactement ce que le
> paragraphe ci-dessus interdit. Le brief du rédacteur a donc annoncé 27 titres pour un plan qui en
> prescrivait 28 ; sans conséquence ici, parce que le rédacteur a suivi **la table** et non le
> total. C'est le bon ordre de confiance, et il vaut d'être dit : **devant un écart entre un
> résumé et l'énumération qu'il résume, c'est l'énumération qui fait foi.** Corrigé le 2026-09-16,
> par recompte de `grep -n "^## \|^### "` sur la leçon livrée.

⚠️ **Le déck est le plus long des cinq (73 diapos) mais la leçon vise le format des précédentes.**
Le rapport titres/diapositives est délibérément plus bas qu'à PHP-5 (28 titres pour 73 diapos contre
28 pour 53) : les diapositives 25-32 et 57-61 sont des **suites de gestes d'interface**, qui tiennent
en une marche à suivre et non en une section chacune. La découpe en deux moitiés pour la passe
adversariale reste prévue, comme à PHP-4 et PHP-5.

## 3 · Le sens inverse — quelles diapositives sont ATTEIGNABLES

**64 diapositives citées sur 73. Neuf orphelines**, une par une :

| Diapo | Ce qu'elle porte | Pourquoi elle n'est citée nulle part |
|---|---|---|
| 1 | « Cours 5 — Intégration de base de données » | page de couverture |
| 2 | « Correction des exercices » | déroulement de la séance, pas du contenu |
| 3 | « Rappel du dernier cours » | titre de section (le contenu est en 4) |
| 5 | « Les bases de données relationnelles » | titre de section (le contenu est en 6) |
| 9 | « Syntaxe SQL » | titre de section |
| 24 | « Bases de données en pratique » | titre de section |
| 33 | « Exécuter des requêtes sur la base de données » | titre de section |
| 71 | « Démonstration » | annonce d'une démonstration en groupe, sans contenu propre |
| 72 | « Questions? » | fin de présentation |

**Aucun trou de leçon.** Les deux sens sont mesurés séparément : 64 + 9 = 73.

### 3a · Les quinze captures d'écran, et où leur matière est écrite

Quinze diapositives portent leur matière en **capture** que l'extracteur ne lit pas. Leur contenu
est néanmoins **connu du dépôt** :

| Capture | Ce qu'elle montre | Où c'est écrit |
|---|---|---|
| 26-31 | les six écrans de création d'une base et d'une table dans PHPMyAdmin | `php-base-de-donnees-pdo.md` § « Environnement et versions mesurés » (collation, moteur, colonnes de `compte`) — et le texte des diapositives, qui décrit chaque geste |
| 38, 46 | le code d'une requête **sans retour**, avec sa numérotation | `php-base-de-donnees-pdo.md` § mots de passe — **et** `php-2026/demos/cours05_code_demo/ajouterCompte.php`, dont la structure concorde avec les diapos 39-45 (§0b) |
| 47 | le `my.ini` de WAMP, où se lit `port=3307` | `php-base-de-donnees-pdo.md` § « Environnement » — qui relève aussi le `skip_ssl` juste en dessous |
| 51 | le code d'une requête **avec retour** | `php-base-de-donnees-pdo.md` § mots de passe (`SELECT code, motdepasse FROM compte where id_compte=?`) — **et** `demos/cours05_code_demo/index.php` |
| 55 | le symbole qui remplace un accent mal encodé | `php-base-de-donnees-pdo.md` § défaut n° 5 |
| 56 | la ligne qui fixe le `charset` en utf8 | idem — la correction y est écrite (`$mysqli->set_charset('utf8mb4')`) |
| 59, 60 | les deux écrans d'export de PHPMyAdmin | le texte des diapositives donne les deux gestes en toutes lettres |
| 70 | le schéma d'ensemble de l'architecture de page | `php-base-de-donnees-pdo.md` § « Architecture de page (section du cours) — version corrigée » |

## 4 · 🔴 Ce que la source dit et qui demande une nuance — à ne PAS trancher en silence

1. 🔴 **LE DÉCK SE CONTREDIT SUR L'ENVIRONNEMENT : XAMPP à la diapositive 25, WAMP aux
   diapositives 47-48.** La diapositive 25 écrit *« démarrer le service Apache et MySQL dans
   XAMPP. Cliquez ensuite sur le bouton "Admin" vis-à-vis MySQL »* ; la 47 écrit *« Vous pouvez voir
   le port utilisé dans WAMP en ouvrant le fichier "my.ini" »*. 🔴 **La décision du dépôt est
   D-PHP-3 : l'environnement de référence est WAMP**, vérifié présent au Cégep, XAMPP y étant
   interdit. La leçon décrit donc **les gestes WAMP**, et **dit** que la diapositive nomme XAMPP —
   elle ne réécrit pas la source en silence.
2. ⚠️ **La définition de l'« Isolé » d'ACID donnée par la diapositive 7 est fausse.** *« Deux
   transactions ne peuvent pas être effectuées en même temps »* : les transactions s'exécutent bel
   et bien en parallèle, l'isolation garantit seulement que chacune voit une image cohérente.
   Argumentaire complet et niveaux d'isolation : fiche KB, § socle SQL. **À l'examen**, rendre les
   quatre lettres et leur libellé du cours ; **en production**, savoir ce que le mot veut dire.
3. ⚠️ **Trois `CREATE TABLE` ne s'exécutent pas — diapositives 13, 14 et 16** : virgule en trop
   avant la parenthèse fermante (`… courriel varchar(50),);`). ⚠️ **La diapositive 15 est
   correcte** et ne se range pas avec les autres : sa virgule est suivie de `PRIMARY KEY
   (id_client)`. 🔴 **Le message d'erreur `ERROR 1064` attribué à MySQL/MariaDB par la fiche KB
   n'est PAS mesurable sur ce poste** (§0a) : la leçon l'attribue à la fiche, ou l'écrit sans citer
   de message littéral.
4. ⚠️ **`INDEX` n'est pas une contrainte** (tableau de la diapositive 17). Une contrainte refuse une
   écriture ; un index accélère une recherche. La confusion vient de `UNIQUE`, qui est les deux.
   Le reste de la liste est exact.
5. ⚠️ **L'`INSERT` sans liste de colonnes de la diapositive 20 échoue sur la table du cours.** La
   règle énoncée est juste, mais la table `client` définie deux diapositives plus haut a **quatre**
   colonnes dont un `id_client AUTO_INCREMENT` : la forme courte exige autant de valeurs que de
   colonnes.
6. ⚠️ **La diapositive 50 dit « sans retour » là où elle décrit le « avec retour ».** Son titre est
   « Exécuter une requête **avec** retour », son corps commence par *« L'exécution d'une requête
   **sans** retour se fait ainsi »*, puis énumère six étapes dont « Préparer la requête (SELECT) »
   et « Lié le résultats à des variables ». Coquille de copier-coller, sans conséquence
   conceptuelle — mais un étudiant qui cherche la liste des étapes du SELECT la trouve sous le
   mauvais mot.
7. ⚠️ **L'étape 6 promet de « fermer la connexion », le code ferme la REQUÊTE.** La diapositive 37
   annonce *« 6. Fermer la connexion avec la base de données »* et la 45 commente *« Ligne 20 On
   ferme la connexion »* — or le code des deux corpus de l'enseignant écrit `$stmt->close()`, qui
   ferme le **statement**, pas la connexion (`$mysqli->close()`). Sans conséquence en pratique (PHP
   ferme la connexion à la fin du script), mais le vocabulaire est faux, et c'est un vocabulaire
   d'examen.
8. ⚠️ **La diapositive 43 écrit `SELECT code, motdepasse FROM client`, alors que les colonnes
   `code` et `motdepasse` appartiennent à la table `compte` des captures.** Le déck mélange ses deux
   tables d'exemple. Ne pas propager le mélange.
9. 🔴 **Le fil rouge des captures stocke un mot de passe EN CLAIR dans un `VARCHAR(30)`**, et la
   diapositive 51 l'**affiche** dans la page. Mesuré le 2026-09-16 : un hachage `PASSWORD_DEFAULT`
   fait **60 caractères**, tronqué à 30 il rend `password_verify()` **définitivement faux**. La
   colonne du cours ne rend pas seulement le stockage peu sûr : elle **rend le correctif impossible
   sans migration**. 🔵 À décharge, **la séance 3 du même cours enseigne correctement
   `password_hash`/`password_verify`** — la table `compte` est un support de démonstration SQL, ce
   que rien dans les diapositives ne dit.
10. 🔵 **Et il faut dire ce que le cours fait BIEN.** La diapositive 41 est le meilleur moment de
    sécurité de tout le cours de PHP : *« Cette séparation entre la requête SQL et les données
    permettent de se protéger contre une attaque de type "Injection SQL". Il est très important de
    ne jamais concaténer d'information provenant d'un utilisateur avec une requête SQL »*, avec le
    contre-exemple écrit. Le corrigé officiel **tient cette promesse sur ses cinq requêtes** (§1a
    pour le compte exact : 5 préparées, 4 liées, 3 écritures). C'est
    le pont naturel vers le cours de sécurité, et il se franchit dans ce sens-là : le cours a
    raison, et la leçon montre jusqu'où la garantie va (elle protège la **base**, pas la **page**).
11. ⚠️ **Deux écarts énoncé ↔ corrigé** (§1) : `modification.log` / `journal.log`, et
    `database.ini` / `config.ini`. La leçon suit l'**énoncé** — c'est lui qui est évalué — et
    signale le nom employé par le corrigé.
12. 🔴 **La pondération reste contradictoire à trois voix** et n'est pas tranchée par ce lot :
    horaire du site (Examen 1 à la séance 6, 10 %) ≠ diapositive 6 du Cours 1 (Cours 9, 25 %) ≠
    diapositive 51 du Cours 4 (15 %). **Ne rien affirmer sur la pondération sans `à-vérifier:`.**

## 5 · Ce qui bloque encore la publication

Inchangé : **P-2, P-4, P-5, P-6 et P-7** ne sont pas fournis (`docs/agile/reprise-php-en-bref.md`
§3). Tout exemple concret qui en dépend porte `à-vérifier:`, donc **le module 05 reste
`statut: verifiee`**.

🔴 **Et cette séance en ajoute un, qui lui est propre :**

| # | Ce qu'il faut | Valeur | Statut |
|---|---|---|---|
| **P-8** | Le **port du service MariaDB/MySQL** de WAMP sur le poste du Cégep, et les identifiants employés | ⬜ à fournir | le déck montre **3307** dans le `my.ini` du poste de l'enseignant (diapos 47-48) ; le standard est **3306** ; le corrigé se connecte en `root` **sans mot de passe**, le code de démonstration en `demo`/`demo` |

Une chaîne de connexion est exactement le genre d'exemple qui se recopie tel quel dans un éditeur :
tant que P-8 n'est pas confirmé, **toute chaîne concrète porte `à-vérifier:`**.
