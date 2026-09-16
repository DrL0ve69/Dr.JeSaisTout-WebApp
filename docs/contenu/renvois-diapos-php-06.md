# Renvois diapositives — PHP, module 06 « Sessions et authentification » (séance 7)

> **Ce que c'est.** La table de correspondance **mesurée** entre chaque titre `##`/`###` prévu pour
> `content/cours/php/06-sessions-authentification/lecon.md` et les diapositives réelles du support
> de la **séance 7** du cours **420-4P2-HU** « Développement d'application en PHP » d'Alexandre
> Mageau-Pétrin. Produite le **2026-09-16**, au lot **PHP-7**, **par le fil principal**.
>
> ⚠️ **Le numéro du module n'est pas celui de la séance.** La séance 6 est l'Examen 1 : le sixième
> module du sujet `php` porte donc la matière de la **séance 7**. Le frontmatter dit `ordre: 6`,
> `seance: 7`, et tout renvoi `{seance="…"}` / `::: exercice-du-cours {seance="…"}` dit **7**.

## 0 · La source, et sa fraîcheur

| Étiquette | Cours | Ce qui a été lu | Diapos |
|---|---|---|---|
| **4P2** | 420-4P2-HU — le cours du sujet `php` | `php-2026/extraits/Cours07_Les_sessions_en_php.txt`, **lu en entier** | **78** |

✅ **Fraîcheur vérifiée jusqu'au site, le 2026-09-16.**

1. Le `.pptx` servi par <https://www.alexandrepetrin.ca/php/> a été **retéléchargé** : `md5 =
   f54512be8e1ca96edfd9678cb0defb65` des **deux côtés**, `Content-Length: 1271496`,
   `Last-Modified: Thu, 06 Aug 2026 12:54:25 GMT`. Aucune republication.
2. `extraire-diapositives.mjs` relancé sur ce `.pptx` : **78 diapositives**, `diff` **vide** contre
   l'extrait de `extraits/`.
3. 🔵 **Pour la première fois sur ce chantier, les CAPTURES ont été lues.** Le `.pptx` est une archive ; ses
   images se relient à leur diapositive par `ppt/slides/_rels/slideN.xml.rels`, et l'outil `Read`
   affiche une image. Les **dix-neuf** diapositives à capture ont été ouvertes par le fil principal
   (§3a) — leur contenu ci-dessous est **lu**, pas reconstitué.

### 0a · L'instrument, et ce qu'il a mesuré

**PHP 8.5.10**, `C:\php` — **`php-cgi.exe` compris**. C'est le neuf de ce lot : `php-cgi` émet les
**en-têtes HTTP réels** (`Status`, `Location`, `Set-Cookie`), et accepte un cookie par la variable
d'environnement `HTTP_COOKIE`. Une redirection, un cookie de session et un corps de réponse se
**mesurent** donc sans serveur web. Le lanceur est trivial :
`REDIRECT_STATUS=1 GATEWAY_INTERFACE=CGI/1.1 REQUEST_METHOD=GET SCRIPT_FILENAME=<f> HTTP_COOKIE=<c> php-cgi -d output_buffering=<n> -d session.save_path=<dossier> <f>`.

❌ **Toujours aucun serveur MariaDB** : `connexion.php` ne s'exécute pas. Tout ce qui suit le
`execute()` est un raisonnement, pas une mesure — même règle qu'au module 05.

⚠️ **`output_buffering` change le résultat, et WAMP n'est pas le poste de mesure.** `php.ini-development`
et `php.ini-production` posent tous deux `output_buffering = 4096` ; un PHP sans `php.ini` (le
poste) vaut `0`. Les deux ont été mesurés. **La valeur réelle du WAMP du Cégep n'est pas connue** :
toute phrase qui en dépend porte `à-vérifier:`.

| # | Affirmation | Mesure (PHP 8.5.10, `php-cgi`) |
|---|---|---|
| M1 | `pageSecuritaire.php` **du corrigé**, sans session, `output_buffering=4096` | `Status: 302 Found` + `location:formulaireConnexion.php` — **et le corps contient le menu PUIS le Lorem ipsum en entier**. Le contenu « protégé » part dans la réponse de redirection |
| M2 | le même, `output_buffering=0` | **aucune redirection** : `Warning: session_start(): Session cannot be started after headers have already been sent`, puis `Warning: Cannot modify header information - headers already sent by (output started at …menu.inc:1)`, puis le Lorem ipsum. **La page s'affiche à tout le monde** |
| M3 | garde en **première ligne** + `die()` | `302` + `Location`, **corps vide** |
| M4 | diapos 23-25 : écrire `maCle` puis la relire avec le même cookie | `Bonjour` — la valeur traverse les deux scripts |
| M5 | diapo 30 : `session_start(); session_unset(); session_destroy();` | **aucun `Set-Cookie`** dans la réponse : le cookie **reste** dans le navigateur. Relecture ensuite : `Warning: Undefined array key "maCle"` |
| M6 | **fixation** — cookie `PHPSESSID=attaquant123` envoyé à un `session_start()`, réglages par défaut (`session.use_strict_mode=0`) | `session_id()` rend **`attaquant123`**, et le fichier `sess_attaquant123` est **créé** sur le serveur. L'identifiant choisi par le client est adopté |
| M6b | le même, `session.use_strict_mode=1` | identifiant **neuf** + `Set-Cookie` : l'identifiant inconnu est refusé |
| M7 | `session_regenerate_id(true)` sur la session `attaquant123` | `attaquant123 -> 2d5713c9…` + `Set-Cookie`, et **`sess_attaquant123` est supprimé** |
| M8 | `include` d'un fichier absent, puis `echo "Information sensible"` | deux `Warning` (`include(protectoin.inc): Failed to open stream…`, `include(): Failed opening…`) **puis `Information sensible`** |
| M8b | le même avec `require` | `Warning: require(…): Failed to open stream…` puis **`Fatal error: Uncaught Error: Failed opening required 'protectoin.inc'`** — rien n'est affiché ensuite |
| M9 | `Set-Cookie` d'une session, PHP **sans** `php.ini` | `PHPSESSID=…; path=/` — **ni `HttpOnly`, ni `Secure`, ni `SameSite`** |
| M10 | écrire `$_SESSION[...]` **sans** `session_start()` | aucun avertissement, **aucun `Set-Cookie`** : la valeur est rangée dans un tableau ordinaire et **perdue** à la fin du script |
| M11 | lire `$_SESSION[...]` sans `session_start()` | `Warning: Undefined global variable $_SESSION` + `Warning: Trying to access array offset on null` ; `isset($_SESSION["id_utilisateur"])` rend **`false`** sans rien dire |
| M12 | diapo 62, **tel quel**, visiteur non connecté | `<li>Panneau d'administration</li>` **est affiché** (ligne 5, hors de toute condition) + `Warning: Undefined array key "typeCompte"` |

**Ajoutées après la rédaction** — chacune lève un `à-vérifier:` posé par un rédacteur :

| # | Affirmation | Mesure |
|---|---|---|
| M13 | un second `session_start()` alors qu'une session est active (le cas de `menu.inc` inclus après un `session_start()`) | `Notice: session_start(): Ignoring session_start() because a session is already active (started from … on line 2) in … on line 3` — puis le script **continue** |
| M14 | déconnexion propre : `$_SESSION = []`, `setcookie(session_name(), '', time() - 42000, …session_get_cookie_params())`, `session_destroy()`, `header('Location: index.php', true, 303); exit;` | `Status: 303 See Other`, `Set-Cookie: PHPSESSID=deleted; expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0; path=/`, `Location: index.php` — et le fichier `sess_…` est **supprimé** |
| M15 | `session_destroy()` sans `session_start()` | `Warning: session_destroy(): Trying to destroy uninitialized session` ; rend `false` |
| M16 | `(int) $_GET["article"]` sans paramètre | `Warning: Undefined array key "article"` ; rend `int(0)` |
| M17 | `==` entre deux chaînes **numériques** : `"1e3" == "1000"`, `"10" == "1e1"`, `"abc" == "ABC"` | `true`, `true`, `false` — deux chaînes numériques se comparent **comme des nombres**. Tranche un constat de la passe adversariale, et une erreur de la KB (corrigée) |
| M18 | `new mysqli(…)` vers un port fermé, suivi du `if ($c->connect_error) die(…)` du corrigé (`mysqli` chargée par `-d extension=php_mysqli.dll`) | `Fatal error: Uncaught mysqli_sql_exception: …` **dans le constructeur** — le `die()` n'est jamais atteint (défaut `MYSQLI_REPORT_ERROR \| MYSQLI_REPORT_STRICT` depuis PHP 8.1). La trace affiche l'hôte et l'utilisateur ; le mot de passe y paraît comme `Object(SensitiveParameterValue)` |
| M19 | variable jamais affectée comparée par `==` à `""` | `Warning: Undefined variable $mot_de_passe` puis **`bool(true)`** — `null == ""` est vrai |
| M20 | `password_verify()` contre un haché `PASSWORD_DEFAULT` | coût **12** (défaut depuis PHP 8.4) ; **~217 ms par appel** sur le poste de mesure — l'écart de temps entre « compte absent » et « compte présent » est mesurable |
| M21 | `session.use_strict_mode=1` : `session_destroy()`, puis le **même** cookie renvoyé | identifiant **neuf** + `Set-Cookie` : un identifiant détruit est refusé. Avec `=0`, le même identifiant est **réutilisé** |
| M22 | la garde, requête **sans** cookie | `Status: 302` **et** `Set-Cookie: PHPSESSID=…` (déjà visible en M3) |

**Les six fichiers du corrigé passent `php -l`.**

### 0b · Le corrigé officiel — rangé, lu en entier

`corrige_php_cours07.zip` retéléchargé le 2026-09-16 et déballé sous
`php-2026/corriges/corrige7_php/corrige_php_cours07/` (gitignoré) : **7 fichiers, 160 lignes** —
`connexion.php` (31), `cours07.sql` (66), `deconnexion.php` (8), `formulaireConnexion.php` (30),
`index.php` (3), `menu.inc` (13), `pageSecuritaire.php` (9). **Aucun code de démonstration** n'est
publié pour cette séance (le site n'en porte que pour la séance 5).

Ses défauts sont **déjà écrits** dans `KnowledgeBase/web/php/php-sessions-authentification.md`
§ « Le corrigé officiel de la séance 7 ». Ce lot les **confirme par mesure** et en ajoute :

1. 🔴 **`pageSecuritaire.php` n'a pas de `die()` après `header()`** — la diapositive 49 l'exige.
   Mesuré (M1, M2) : le contenu protégé part dans la réponse.
2. 🔴 **La garde vient APRÈS `require "menu.inc"`, qui affiche du HTML avant `session_start()`.** Sans
   tampon de sortie, la redirection **n'a pas lieu du tout** (M2).
3. ⚠️ **`index.php` commence par une ligne vide** avant `<?PHP` : de la sortie avant le
   `session_start()` de `menu.inc` — même famille que 2.
4. ⚠️ **Mots de passe en clair**, comparés par `==` (`connexion.php:14`) ; dump : `(1, 'admin', 'test')`.
5. ⚠️ **Aucun `session_regenerate_id(true)`** à la connexion, alors que `menu.inc` ouvre une session
   sur **toutes** les pages publiques : fixation (M6, M7).
6. ⚠️ **Deux messages distincts** (`?erreurMotDePasse=1` / `?compteInexistant=1`) : énumération de
   comptes — et **l'exercice 3 la DEMANDE** en toutes lettres.
7. ⚠️ **La troisième redirection de `connexion.php` (ligne 30) n'a pas de `die`** — sans conséquence
   ici (dernière instruction), mais le réflexe est faux.
8. ⚠️ **Base `cours08`** dans `connexion.php` et le dump, **`cours7`** dans l'énoncé et la diapo 40 ;
   le formulaire titre « Cours 8 ».
9. ⚠️ **Les DEUX étiquettes sont orphelines** : `<label for="fname">` (`formulaireConnexion.php:21`)
   et `<label for="mot_de_passe">` (ligne 23), alors qu'**aucun** des deux champs ne porte d'`id`.
   Neuf ici, absent de la KB. (Première rédaction : « `for="fname"` » seul — relevé par le
   rédacteur de la moitié B.)
10. 🔵 **Ce qu'il fait bien, et qui se dit en premier** : la requête est **préparée et liée** ;
    `session_start()` n'est appelé dans `connexion.php` **qu'après** la validation ; `require`, pas
    `include` ; la déconnexion suit l'ordre du cours et se termine par `die`.

## 1 · Les exercices — vérifiés à la SOURCE D'AUTORITÉ

✅ Relevés le **2026-09-16** sur <https://www.alexandrepetrin.ca/exercice-php-cours-7-2026/> (texte de
`.entry-content`, **aucune image**). Copie locale écrite à cette occasion :
`php-2026/extraits/exercices-cours-07.txt` — **7 énoncés**. Ils sont **au registre**
(`content/cours/php/exercices.json`, `numero: 7`, références `1` à `7`, reformulés), écrits par le
fil principal avant le brief du rédacteur.

⚠️ **Deux écarts énoncé ↔ corrigé, et un avec le déck** :

- l'**exercice 3** exige le message « Le mot de passe est invalide » ; le corrigé affiche
  « Le mot de passe est incorrect », et « Le compte n'existe pas » ;
- l'**exercice 3** redirige une connexion réussie vers `pageSecuritaire.php` (le corrigé aussi) ; la
  **diapositive 40** redirige vers `index.php` ;
- l'**exercice 6** fait rediriger la déconnexion vers `index.php` ; le `deconnexion.php` du corrigé
  redirige vers `formulaireConnexion.php` (la diapositive 69, elle, vers `index.php`) ;
- l'**exercice 7** porte une coquille (« Faite en sorte que les éléments du menu ne soit dans les
  conditions suivantes ») ; le sens est sans ambiguïté par la liste qui suit, et le registre le
  reformule.

### 1a · Les fiches KB qui portent cette séance

| Fiche | Ce qu'elle apporte | Lignes |
|---|---|---:|
| `KnowledgeBase/web/php/php-sessions-authentification.md` | **la source principale** — mécanique, `php.ini`, inscription/connexion complètes, protection des pages, le corrigé officiel et ses défauts, déconnexion propre. Étiquetage 📘/🧩 posé | 777 |
| `KnowledgeBase/web/php/exercices-corriges-poo-application.md` § « Séance 7 » | les sept exercices corrigés et commentés | 1057 (§ séance 7 ≈ 250) |

🔴 **Aucune plage de lignes n'est écrite ici, délibérément** : `grep -n "^## " <fiche>`, recalculé à
chaque lecture, puis `Read(fichier, offset, limit)`.

⚠️ **La KB dit « captures des diapos 31, 53, 55 » pour le chemin `C:\xampp\htdocs\cours7\`** — lu
et **confirmé** (§3a). Elle dit aussi « lignes 14 et 19 de la diapo 40 » pour les deux `die` —
**confirmé**.

## 2 · La table des renvois

| # | Titre de la leçon | Renvoi | Ce que portent les diapositives |
|---|---|---|---|
| 1 | `## L'idée en une image` | `{diapos="9, 11"}` | HTTP sans état ; la session côté serveur, l'identifiant dans un cookie |
| 2 | `## En bref — la marche à suivre` | `{diapos="17, 22, 28, 37-40, 47-49, 67"}` | démarrer, lire/écrire, détruire ; la table, le formulaire, la logique ; la garde ; la déconnexion |
| 3 | `## Ce que la séance 7 enseigne, et ce que cette leçon ajoute` | `{diapos="4, 6, 7"}` | le rappel (l'examen 1), l'objet de la séance, le sommaire annoncé |
| 4 | `## Pourquoi les sessions existent : HTTP ne se souvient de rien` | `{diapos="9, 10"}` | « sans état » ; les rôles d'une variable de session |
| 4a | `### Où vit la session, et ce que le cookie transporte` | `{diapos="11"}` | données sur le serveur, identifiant dans un cookie, informations « clés » et légères |
| 5 | `## Le cycle de vie d'une session` | `{diapos="15, 32"}` | les trois étapes ; le résumé de la section |
| 5a | `### Créer ou charger : session_start()` | `{diapos="17, 18, 19"}` | ce que fait la fonction ; l'exemple ; « oublier de démarrer la session » |
| 5b | `### Lire et écrire : $_SESSION` | `{diapos="22, 23, 24, 25"}` | la superglobale comme tableau associatif ; `index.php` / `index2.php` ; le résultat ; l'explication |
| 5c | `### Détruire : session_unset() puis session_destroy()` | `{diapos="28, 29, 30, 31"}` | la séquence ; la page `detruire_session.php` ; l'ordre d'ouverture ; le résultat (capture PHP 7) |
| 6 | `## L'authentification, pas à pas` | `{diapos="35, 37"}` | le sommaire des stratégies ; les cinq étapes de la logique |
| 6a | `### La table des utilisateurs — et les mots de passe en clair` | `{diapos="38"}` | la structure (`VARCHAR(50)`) et le contenu (`admin`/`admin`, `alexandre`/`qwerty`) |
| 6b | `### Le formulaire de connexion — et ses étiquettes reliées à rien` | `{diapos="39"}` | le code (`type="password"`, `method="POST"`) et son rendu |
| 6c | `### La logique de connexion.php, ligne par ligne` | `{diapos="40"}` | les 24 lignes projetées : `prepare`, `bind_param`, `bind_result`, `while fetch`, `==`, `session_start`, trois `header` |
| 6d | `### Deux messages d'erreur distincts : l'énumération de comptes` | `{diapos="40"}` | `?erreurMotDePasse=1` / `?compteInexistant=1` (lignes 18 et 23) |
| 6e | `### Ce qui manque à cette connexion : password_verify et session_regenerate_id` | `{diapos="41"}` | « la matière du cours d'aujourd'hui ne fournit pas une protection optimale » |
| 7 | `## Protéger l'accès à une page` | `{diapos="44, 45, 47, 48"}` | la session décide de l'accès ; les deux niveaux ; la garde « au début de la page » ; le code |
| 7a | `### Pourquoi die() après header()` | `{diapos="49"}` | « un pirate peut refuser la redirection HTTP » |
| 7b | `### require, pas include` | `{diapos="50, 51, 52, 53, 54, 55"}` | le principe ; `protectionPage.inc` ; la faute de frappe ; l'affichage ; `require` ; l'erreur fatale |
| 8 | `## Protéger un élément de la page` | `{diapos="58, 59, 60, 61"}` | le besoin ; un `echo` conditionnel ; l'exemple 1 (`isset`) |
| 8a | `### Cacher un lien ne protège pas la page — et l'exemple 2 le montre` | `{diapos="62, 63"}` | la condition sur `typeCompte == "admin"` |
| 9 | `## Se déconnecter` | `{diapos="66, 67, 68, 69, 70"}` | le besoin ; les trois étapes ; le lien ; la page ; la redirection |
| 9a | `### Ce que session_destroy() ne fait pas` | `{hors-cours}` | — (le cookie reste dans le navigateur : M5 ; la déconnexion propre de la fiche KB) |
| 10 | `## Le corrigé officiel de la séance — ce qu'il fait bien, et ses défauts` | `{hors-cours}` | — (ajout de la leçon, ancré sur le `.zip` et sur la fiche KB) |
| 11 | `## Exemple simple` | `{diapos="23, 24, 25"}` | écrire une valeur sur une page, la lire sur une autre |
| 12 | `## Exemple complet` | `{diapos="37, 38, 39, 40, 47, 48, 49, 67, 69"}` | le parcours connexion → page protégée → déconnexion |
| 13 | `## À toi de jouer` | `{hors-cours}` | — (exercice de la leçon, distinct de ceux du cours) |
| 14 | `## À retenir` | `{diapos="32, 74"}` | le résumé de la syntaxe ; la conclusion de la séance |
| 15 | `## Aller plus loin` | `{diapos="41, 78"}` | le renvoi au cours de sécurisation ; la référence w3schools |

🔴 **VINGT-HUIT titres — quinze `##` et treize `###`.** Compté **sur la table**, ligne par ligne :
quinze numéros nus (1 à 15) et treize à lettre (4a ; 5a-5c ; 6a-6e ; 7a-7b ; 8a ; 9a) —
1 + 3 + 5 + 2 + 1 + 1 = 13.

## 3 · Le sens inverse — quelles diapositives sont ATTEIGNABLES

**49 diapositives citées sur 78. Vingt-neuf orphelines** — toutes sans contenu propre :

| Diapos | Ce qu'elles portent |
|---|---|
| 1, 5 | couverture et intertitre « La gestion des sessions » |
| 2 | « Correction des exercices » — déroulement de la séance |
| 3 | intertitre « Rappel du dernier cours » (le contenu est en 4) |
| 8, 13, 16, 21, 27, 33, 36, 43, 46, 57, 65, 73, 75 | intertitres de section, sans texte |
| 12, 14, 20, 26, 34, 42, 56, 64, 71 | phrases de transition (« Voici donc qui termine… », « Dans la prochaine section… ») |
| 72 | « Démonstration » — annonce, sans contenu ni code publié |
| 76 | « Au prochain cours, nous verrons comment utiliser Laravel » — contredit l'horaire (§4, n° 9) |
| 77 | « Questions? » |

**Aucun trou de leçon.** 49 + 29 = 78, compté par script sur la table du §2.

### 3a · Les dix-neuf diapositives à capture — LUES

| Diapo | Ce que montre la capture |
|---|---|
| 18 | `index.php` : `<?PHP`, `session_start();`, `?>` |
| 23, 25 | `index.php` écrit `$_SESSION["maCle"] = "Bonjour le monde";` ; `index2.php` fait `echo $_SESSION["maCle"];` — chacun après `session_start();` |
| 24 | le rendu : « Bonjour le monde » sur `index2.php`, page blanche sur `index.php` |
| 29 | les mêmes, plus `detruire_session.php` : `session_start(); session_unset(); session_destroy();` |
| 31 | `Notice: Undefined index: maCle in C:\xampp\htdocs\cours7\index2.php on line 5` (PHP 7) |
| 38 | structure de `utilisateur` — `id_utilisateur int(11)`, `code_utilisateur varchar(50)`, `mot_de_passe varchar(50)`, `utf8mb4_general_ci` — et contenu `admin`/`admin`, `alexandre`/`qwerty` |
| 39 | le formulaire (15 lignes) : `<h2>Page de connexion</h2>`, `action="connexion.php" method="POST"`, `label for="code_utilisateur"` / `input id="fname"`, `label for="mot_de_passe"` / `input type="password" id="lname"`, bouton « Connexion » ; et son rendu |
| 40 | `connexion.php` (24 lignes) : `new mysqli('localhost','root','','cours7')` ; `prepare` ; `bind_param("s", $code_utilisateur)` **avant** l'affectation ; `execute` ; `bind_result` ; `while ($stmt->fetch())` ; `if ($mot_de_passe == $_POST["mot_de_passe"])` ; `close`, `session_start`, `$_SESSION["id_utilisateur"]`, `header("location: index.php")`, `die();` (l. 14) ; sinon `?erreurMotDePasse=1` + `die;` (l. 18-19) ; après la boucle `close` + `?compteInexistant=1` **sans** `die` (l. 22-23) |
| 51, 52 | `protectionPage.inc` : `session_start(); if (!isset($_SESSION["id_utilisateur"])){ header("Location: index.php"); die(); }` ; `pageSecuritaire.php` : `include 'protectionPage.inc';` puis « Information sensible » — en 52, la faute de frappe `protectonPage.inc` |
| 53 | deux `Warning: include(protectonPage.inc)…` puis « Information sensible », chemin `C:\xampp\htdocs\cours7\` |
| 54 | la même page avec `require` |
| 55 | `Warning: require(…)` puis `Fatal error: require(): Failed opening required 'protectonPage.inc'` (PHP 7) |
| 60 | exemple 1 : `<ul>` Accueil / Liste de produit / Formulaire de contact, puis `session_start(); if (isset($_SESSION["id_utilisateur"])){ echo "<li>Panneau administrateur</li>"; }` |
| 62 | exemple 2 : `<ul>` Accueil / Liste de produit / **Panneau d'administration** (sans condition), puis `session_start(); if ($_SESSION["typeCompte"] == "admin"){ echo "<li>Panneau administrateur</li>"; }` |
| 68 | le menu : `Accueil \| Gestion des utilisateurs \| <a href="deconnecter.php">Déconnexion</a>`, et son rendu |
| 69 | `session_start(); session_unset(); session_destroy(); header("location: index.php");` — **sans `die`** (rien ne suit) |
| 70 | le rendu : « Accueil du site » et un Lorem ipsum |

## 4 · 🔴 Ce que la source dit et qui demande une nuance — à ne PAS trancher en silence

1. 🔴 **Le corrigé contredit la diapositive 49** (pas de `die()`), et la **mesure donne raison à la
   diapositive** (M1, M2). À l'examen comme en production : la diapositive a raison.
2. ⚠️ **La diapositive 11 dit que la session ne se manipule « pas à partir de JavaScript ».** Vrai
   pour les **données** (elles sont sur le serveur). Mais le **cookie d'identifiant**, lui, est
   lisible par `document.cookie` tant qu'il ne porte pas `HttpOnly` — et PHP ne le pose **pas** par
   défaut (M9). Un XSS vole donc la session. La valeur de `session.cookie_httponly` dans le WAMP du
   Cégep est **inconnue** : `à-vérifier:`.
3. ⚠️ **La diapositive 28 dit que `session_destroy()` rompt « le lien entre le cookie de session et
   la session ».** Mesuré (M5) : le fichier serveur est supprimé, mais **le cookie reste**, et avec
   les réglages par défaut le prochain `session_start()` **réutilise le même identifiant** (M6). La
   déconnexion propre efface aussi le cookie. Nuance, pas erreur : l'effet visible décrit par la
   diapositive 31 est exact.
4. ⚠️ **Les captures des diapositives 31, 53 et 55 sont des messages de PHP 7.** Diapo 31 :
   `Notice: Undefined index: maCle` → PHP 8 : `Warning: Undefined array key "maCle"` (M5). Diapo 55 :
   `Fatal error: require(): Failed opening required` → PHP 8.5 : `Fatal error: Uncaught Error:
   Failed opening required` (M8b). Diapo 53 : `failed to open stream` → `Failed to open stream`.
   **La leçon de chaque diapositive est juste** ; seul le libellé date. Chemin des captures :
   `C:\xampp\htdocs\cours7\` — **XAMPP**, alors que D-PHP-3 fixe WAMP.
5. ⚠️ **L'exemple 2 (diapositive 62) a deux défauts** (M12) : la ligne 5 affiche « Panneau
   d'administration » **sans condition**, et `$_SESSION["typeCompte"] == "admin"` sans `isset`
   lève un `Warning` chez un visiteur non connecté. Et, sur le fond : cacher un lien n'empêche
   personne de taper l'URL — la page d'administration doit porter **sa propre** garde, avec la
   même condition de rôle.
6. ⚠️ **Le formulaire de la diapositive 39 relie ses étiquettes à rien** : `for="code_utilisateur"`
   et `for="mot_de_passe"`, mais les champs portent `id="fname"` et `id="lname"`. Un lecteur
   d'écran n'annonce pas l'étiquette, et un clic sur le libellé ne place pas le curseur (WCAG 2.2,
   critère 1.3.1). Le corrigé a le même défaut sous une autre forme (§0b, n° 9).
7. ⚠️ **La diapositive 40 et le corrigé divergent** : `while` contre `if`, succès vers `index.php`
   contre `pageSecuritaire.php`, base `cours7` contre `cours08`. La leçon suit **l'énoncé** (c'est
   lui qui est évalué) et signale les deux autres.
8. ⚠️ **La diapositive 47 redirige vers « la page d'accueil »** ; l'exercice 4 redirige vers
   `formulaireConnexion.php`. Les deux sont légitimes ; la leçon dit lequel l'exercice attend.
9. ⚠️ **La diapositive 76 annonce Laravel au prochain cours** ; l'horaire du site place le
   **déploiement** à la séance 8 et Laravel à la séance 10. Contradiction dans les documents de
   l'enseignant — ne rien affirmer sur l'ordre sans `à-vérifier:`.
10. ⚠️ **L'exercice 3 demande l'énumération de comptes** (deux messages distincts). À l'examen,
    faire ce que l'énoncé demande ; en production, un **message unique** (« code utilisateur ou mot
    de passe invalide »). Pont vers le cours de sécurité.
11. 🔵 **Ce que le cours fait bien, et qui se dit** : la diapositive 49 (le `die()`) et les
    diapositives 50-55 (`require` plutôt qu'`include`, démontré par une faute de frappe) sont deux
    excellents moments de sécurité — **tous deux confirmés par mesure** (M3, M8, M8b). La
    diapositive 41 annonce elle-même que la protection n'est pas optimale.
12. 🔴 **La pondération reste contradictoire** et n'est pas tranchée par ce lot.

## 5 · Ce qui bloque encore la publication

Inchangé : **P-2, P-4, P-5, P-6, P-7 et P-8** (`docs/agile/reprise-php-en-bref.md` §3). La
connexion à la base de `connexion.php` est une chaîne concrète : **P-8** s'applique. **Le module 06
reste `statut: verifiee`.**
