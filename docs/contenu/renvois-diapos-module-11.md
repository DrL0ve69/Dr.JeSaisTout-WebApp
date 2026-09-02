# Renvois diapositives — module 11 « Amorcer un projet LAMP »

> **Ce que c'est.** La table de correspondance **mesurée** entre chaque section de
> [`content/cours/securite-web/11-projet-de-session/lecon.md`](../../content/cours/securite-web/11-projet-de-session/lecon.md)
> (942 lignes) et les diapositives des **deux** cours d'Alexandre Mageau-Pétrin dont ce module tire
> sa matière. Produite le **2026-08-31**. Elle est la matière première d'une réécriture des renvois ;
> elle ne modifie ni la leçon ni aucun autre fichier.
>
> **Pourquoi elle existe.** Le module 11 mêle les deux cours sans toujours le dire, et l'un de ses
> encadrés annonce « matière d'examen » en agrégeant les deux. Un étudiant de 420-B10-HU se
> retrouvait à réviser XAMPP, qui n'est pas de la matière de sa séance 2.

## 0 · Les sources, et ce qu'elles valent

| Étiquette | Cours | Extraits lus | Diapos |
|---|---|---|---|
| **B10** | 420-B10-HU « Sécurisation des applications web » — le cours du site (`sujet: securite-web`) | `securite-app-web-2026/extraits/Cours01…`, `Cours02_environnement_linux`, `Cours03-Securite_communication_serveur`, `Cours09-Securite_base_de_donnees` | 83 · 82 · 61 · 58 |
| **4P2** | 420-4P2-HU « Développement d'application en PHP » | `php-2026/extraits/Cours01_Introduction_a_PHP_2026`, `Cours03_Librairie_PHP`, `Cours05_integration_base_de_donnees`, `Cours07_Les_sessions_en_php`, `Cours08_deploiement_application_web` | 111 · 74 · 73 · 78 · 103 |

Les extraits portent **une ligne par diapositive**, préfixée de son **rang de présentation** entre
crochets — c'est ce numéro-là qui est cité ici. Ils sont produits par
`tools/supports-cours/extraire-diapositives.mjs` depuis les `.pptx`, avec contrôle positif : ni
lecture, ni reconstitution. Réserves de provenance : `php-2026/extraits/PROVENANCE.md`.

**Lecture des colonnes.**

- **`Cours`** — `B10`, `4P2`, `les deux`, ou **`aucun`**. `aucun` n'est pas un échec de recherche :
  c'est un résultat, et il est fréquent ici. Une section marquée `aucun` avec une confiance
  `certaine` signifie que le terme a été cherché dans les **16 extraits** et n'y figure pas.
- **`Diapos`** — numéros et plages, virgules, strictement croissants.
- **`Ce que la diapositive porte`** — quelques mots **réellement présents** dans la ligne `[n]`.
  Le renvoi se vérifie en ouvrant l'extrait, sans croire cette table sur parole.
- **`Confiance`** — `certaine` (la diapositive traite explicitement le sujet de la section, ou
  l'absence est mesurée) · `partielle` (elle l'effleure, ou le sujet est réparti).

Une section qui s'appuie sur plusieurs cours ou séances occupe **plusieurs lignes**, une par déck,
pour que la colonne `Diapos` ne mélange jamais deux numérotations.

---

## 1 · La table, section par section

| Section (`ligne:titre`) | Cours | Séance | Diapos | Ce que la diapositive porte | Confiance |
|---|---|---|---|---|---|
| `27:# Amorcer un projet LAMP` | 4P2 | 1 | 21, 23 | « La combinaison de Linux, Apache, PHP et MySQL s'appelle LAMP » ; tableau « Technologie / Role » des quatre briques | certaine |
| `27:# Amorcer un projet LAMP` | 4P2 | 8 | 30 | « La pile LAMP est un ensemble de technologies complémentaires: (L)inux (A)pache (M)ySQL (P)HP » | certaine |
| `27:# Amorcer un projet LAMP` | B10 | 2 | 24 | « Sous "Recommended for you", choisissez "LAMP on 18.04" » — le sigle employé, jamais développé | partielle |
| `29:## L'idée en une image` | aucun | — | — | L'analogie de la troupe de théâtre, la parité et les coulisses sont écrites pour la leçon ; « parité » n'apparaît dans aucun extrait | certaine |
| `29:## L'idée en une image` (encadré `::: cours`, pondération 20 %) | B10 | 1 | 6 | « Évaluation des compétences 3 évaluations … **Projet (Cours 11) : 15%** … Examen final (Cours 13): 60% » | certaine — **et la leçon écrit 20 %** (voir §2, R-10) |
| `80:## Deux machines qui doivent se ressembler` | aucun | — | — | Chapeau de section ; toute la matière est dans les trois `###` qui suivent | certaine |
| `82:### D'où vient la méthode que tu connais déjà` | 4P2 | 1 | 25-26, 35, 45-49, 52-55, 107 | « on peut donc installer WAMP, ou XAMPP » [25] ; « il est possible que voyez plutôt la page par défaut de IIS … configurer Apache pour utiliser le port 8080 » [35] ; « Rendez-vous sous le répertoire : C:\xampp\htdocs / Créer un sous-répertoire (Ex. monSite) / Allez a l'adresse : localhost/monSite/ » [45] ; « vous n'avez simplement qu'à créer des fichiers texte vides avec l'extension .php » [52] ; « L'environnement de développement sera XAMPP combine à un éditeur de traitement de texte comme Notepad++ » [107] | certaine |
| `82:### D'où vient la méthode que tu connais déjà` | B10 | 1 | 63 | « Pour le cours, vous aurez besoin de: **XAMPP ou WAMP** / Un éditeur de texte / Putty et WinSCP » — **XAMPP est aussi exigé par B10** | certaine — contredit l'encadré (§2, R-3) |
| `106:### La cible : ce que le serveur livre réellement` | 4P2 | 8 | 21, 24, 30, 36-38 | « Digital Ocean est une plateforme de type IaaS » [21] ; « configurer un serveur virtuel (Appelé "Droplet") » [24] ; « choisissez **"LAMP on 24.04"** » [37] ; « prenez le minimum (celui à **6$ par mois**) sous "Regular" » [38] | certaine |
| `106:### La cible : ce que le serveur livre réellement` | B10 | 2 | 22-25 | « Déploiement d'un serveur » [22] ; « Connectez-vous à www.digitalocean.com … choisissez **"LAMP on 18.04"** » [24] ; « prenez le minimum (celui à **5$ par mois**) » [25] | certaine — **version d'image différente** (§2, R-1) |
| `106:### La cible : ce que le serveur livre réellement` (coût annoncé) | B10 | 1 | 13 | « Frais à prévoir : Plateforme infonuagique **5$ (maximum)** / Nom de domaine **15$ (environ)** » — c'est ce que la leçon cite comme « le plan de cours » | certaine |
| `106:### La cible : ce que le serveur livre réellement` (coût annoncé) | 4P2 | 1 | 13 | « Location de serveur : **3$ (environ)** / Achat de nom de domaine : 15$ (Optionnel) » | certaine — troisième chiffre (§2, R-2) |
| `106:### La cible …` (encadré `correction-du-cours`, MariaDB) | 4P2 | 1 | 23, 40 | « *MariaDB est une version dérivée de MySQL suite a l'acquisition de ce dernier par ORACLE » [23] ; XAMPP « inclut Apache (A) **MariaDB (M)** PHP (P) Perl (P) » [40] | certaine |
| `106:### La cible …` (encadré `correction-du-cours`, MariaDB) | B10 | 9 | 3, 6-7, 11 | « le déploiement d'une base de données **MariaDB** » [3] ; « Installation de MySQL / MariaDB » [6] ; « **apt-get install mariadb-server** » [7] | certaine — **B10 est aussi un cours MariaDB** (§2, R-6) |
| `106:### La cible …` (tableau des écarts : casse, permissions, séparateurs) | aucun | — | — | Ni la sensibilité à la casse, ni les bits de permission, ni la comparaison `C:\`/`/var/www` n'apparaissent dans un extrait des deux cours | certaine |
| `171:### Pourquoi ce module existe dans un cours de sécurité` | aucun | — | — | Les trois exigences citées viennent du **plan de cours** du 4P2 (référentiel ministériel), pas d'un diaporama ; « système de gestion de versions » n'apparaît dans aucun extrait | certaine |
| `171:### Pourquoi ce module existe dans un cours de sécurité` | 4P2 | 1 | 3 | « L'application doit être correctement conçue, **sécuritaire**, et utilisable depuis l'Internet » — la formulation la plus proche portée par une diapositive | partielle |
| `189:## Monter la salle de répétition` (5 options d'environnement) | aucun | — | — | `WSL`, `Docker`, `DDEV`, `Laragon`, `php -S` : **0 occurrence** dans les 16 extraits | certaine |
| `216:### Les commandes, dans l'ordre` | B10 | 9 | 7, 41-42 | « apt-get install mariadb-server » [7] ; « apt-get update / apt-get install apache2 / apt-get install php / **php –version (observez quelle version de PHP vous avez)** » [41] ; « Redémarrer le service d'Apache **systemctl restart Apache2** » [42] | certaine — seule séquence d'installation LAMP par `apt` des deux cours |
| `216:### Les commandes, dans l'ordre` | 4P2 | 8 | 32-33, 35 | « **APT-GET**: programme de gestion des installations et leur dépendance … **CHMOD** … **SUDO** » [32] ; « sudo apt-get update / sudo apt-get INSTALL <application> » [33] ; « Sudo … vous accorde les droits administrateur » [35] | partielle |
| `216:### Les commandes …` (WSL2, `ondrej/php`, `a2dismod`/`a2enmod`, Composer, SAPI, `apache2ctl -M`) | aucun | — | — | `wsl`, `ondrej`, `a2enmod`, `a2dismod`, `composer`, `apache2ctl`, `SAPI`, `php.ini`, `phpinfo` : **0 occurrence** | certaine |
| `294:### Le VirtualHost : le geste qui remplace localhost/monSite/` | aucun | — | — | `VirtualHost`, `DocumentRoot`, `ServerName`, `AllowOverride`, `.htaccess`, `RewriteRule`, `RewriteEngine`, `Require all granted`, `a2ensite` : **0 occurrence** dans les 16 extraits | certaine |
| `294:### Le VirtualHost …` (fragment : recharger Apache) | B10 | 9 | 42 | « Redémarrer le service d'Apache systemctl restart Apache2 » — le geste, pas la configuration | partielle |
| `294:### Le VirtualHost …` (`.test`, fichier `hosts`, RFC 6761) | aucun | — | — | `hosts`, `.test`, `.local`, `.dev`, `RFC` : **0 occurrence** | certaine |
| `364:### Le chemin d'une requête, du navigateur au code` | 4P2 | 1 | 21-22, 56, 59-60 | « Composante Fureteur web … Serveur HTTP/Web (Apache, NGinX, …) … Langage serveur (PHP, …) … Base de données » [21] ; « un fichier PHP … contient du code qui sera exécuté par le serveur avant d'être envoyé dans le fureteur » [56] ; « le code PHP n'est pas visible dans le fureteur du client puisqu'il a été exécuté sur le serveur » [60] | partielle — l'architecture en couches, pas le trajet ni la réécriture |
| `364:### Le chemin …` (pourquoi `htdocs/monSite/` coince) | 4P2 | 1 | 45 | « Allez a l'adresse : **localhost/monSite/** » — la méthode exactement critiquée par la leçon | certaine |
| `364:### Le chemin …` (réécriture, point d'entrée unique, autoload PSR-4) | aucun | — | — | `index.php` comme point d'entrée unique, `autoload`, `PSR-4` : **0 occurrence** | certaine |
| `395:## Une arborescence qui ne sert pas ses secrets` | aucun | — | — | `public/`, `src/`, `templates/`, `vendor/`, `composer.json`, `composer.lock`, `.gitignore` : **0 occurrence** dans les 16 extraits | certaine |
| `395:## Une arborescence …` (ce que les cours prescrivent à la place) | 4P2 | 8 | 93 | « Déployer une application est très simple, il faut simplement **copier tout son contenu sous le répertoire /var/www/html** » — l'arborescence plate, à l'opposé | certaine |
| `395:## Une arborescence …` (ce que les cours prescrivent à la place) | B10 | 9 | 46 | « copier ce répertoire sur votre serveur … Vous devez le mettre sous **"var/www/html"** » | certaine |
| `395:## Une arborescence …` (le couple `bd.ini` / `bd.ini.exemple`) | 4P2 | 3 | 37-44 | « Fichiers de configuration » [37] ; « Ils contiennent des informations telles que : Le nom de la base de données / **Un code utilisateur ou mot de passe** » [39] ; « la fonction "**parse_ini_file()**" » [41] | certaine pour le **fichier**, `aucun` pour l'idée de le sortir de la racine web et pour le gabarit versionné |
| `470:## Cinq gestes … (encadré ::: cours seance="2", PuTTY)` | B10 | 2 | 23, 26-31 | « Utilisation de Putty … Adresse IP du serveur / **Port: 22** / Connexion Type: **SSH** » [26] ; « comment on peut se connecter à notre serveur à partir de Putty » [31] | certaine |
| `470:## Cinq gestes … (encadré ::: cours seance="2", WinSCP)` | B10 | 1 | 63 | « Putty et **WinSCP** » — WinSCP est posé à la **séance 1**, pas à la 2 : **0 occurrence** dans tout `Cours02` | certaine — **le renvoi de l'encadré est faux** (§2, R-4) |
| `470:## Cinq gestes … (WinSCP, suite)` | B10 | 3 | 38, 43 | « Si vous avez besoin de vous connecter à votre serveur avec **WinSCP**, vous devrez effectuer une configuration similaire » [38] ; « Celle-ci peut être utilisée pour Putty et WinSCP » [43] | certaine |
| `470:## Cinq gestes … (WinSCP + PuTTY côté PHP)` | 4P2 | 8 | 26-28, 39, 44-45 | « Logiciel de gestion du serveur : Putty / WinSCP » [26] ; « Putty … protocole SSH (Secure Shell) qui remplace l'ancienne méthode TELNET » [27] ; « WinSCP … transférer des fichiers par un simple « **Drag & drop** » » [28] | certaine |
| `470:## Cinq gestes … (encadré ::: cours seance="9", phpMyAdmin + GRANT)` | B10 | 9 | 28-30, 38, 40, 43-47, 49-50 | « GRANT ALL PRIVILEGES ON ‘<base_de_donnes>’.’<table>’ … FLUSH PRIVILEGES » [28] ; « **GRANT ALL PRIVILEGES ON \*.\*** to ‘demo_user’@’localhost’ » [30] ; « PHPMyAdmin … Il s'agit de l'interface offerte par défaut dans XAMPP également » [38] ; « En utilisant WinSCP, copier ce répertoire … sous "var/www/html" » [46] ; « <adresse IP>/phpMyAdmin » [47] | certaine |
| `470:## Cinq gestes … (phpMyAdmin + GRANT, côté PHP)` | 4P2 | 8 | 74, 76-82 | « **GRANT ALL PRIVILEGES ON \*.\*** to ‘app_user’@’localhost’ ; FLUSH PRIVILEGES » [74] ; « copier ce répertoire sur votre serveur … sous "var/www/html" » [81] ; « <nom de domaine>/phpMyAdmin » [82] | certaine — **le même geste dans les deux cours** (§2, R-5) |
| `470:## Cinq gestes … (config.ini en racine web, chmod 777)` | 4P2 | 8 | 95 | « Changer votre fichier de configuration (**config.ini**) … Changer le niveau d'accès du fichier de journalisation avec la commande : **chmod 777 journal.log** » | certaine |
| `470:## Cinq gestes … (fichiers .inc)` | 4P2 | 1 | 102-103 | « "Include" et "Require" permet d'inclure le contenu d'une autre page » [102] ; « include “header.inc” … Un fichier inclus utilisera typiquement l'extension “**.inc**” plutôt que “.php” afin d'éviter son exécution accidentelle » [103] | certaine |
| `470:## Cinq gestes … (« le HTTPS y est annoncé puis jamais couvert »)` | B10 | 9 | 49 | « **La communication avec le serveur n'est pas encryptée.** Votre mot de passe … peuvent facilement être interceptés … Cette situation sera corrigée **lorsque nous installerons un certificat SSL** » | certaine |
| `470:## Cinq gestes … (« le HTTPS y est annoncé puis jamais couvert »)` | 4P2 | 8 | 65 | « nous voudrons protéger la communication … en **installant un certificat SSL**. C'est ce que nous verrons dans la prochaine section » — la section suivante est « Déploiement de la base de données » | certaine |
| `470:## Cinq gestes … (parade : moindre privilège SQL)` | B10 | 9 | 32-35 | « nous voudrons créer des utilisateurs qui n'ont pas tous les accès … on peut remplacer l'accès “ALL PRIVILEGES” par des opérations telles que : **SELECT UPDATE DELETE INSERT** » [32] ; « Si cet utilisateur tente de faire une action qui n'est pas incluse dans ses accès, l'opération sera refusée » [34] | certaine — **la parade est déjà enseignée** (§2, R-7) |
| `470:## Cinq gestes … (parade : chown / 640 / 660, groupe partagé)` | 4P2 | 8 | 32 | « **CHMOD**: Permets de changer les accès sur un fichier » — le nom de la commande, jamais une valeur autre que `777` ; `chown`, `640`, `660`, `www-data` : **0 occurrence** | partielle |
| `551:## Le contrôle de version, exigé et jamais enseigné` | aucun | — | — | `git`, `commit`, `.gitignore`, `composer`, `PSR-4`, `autoload`, `dépôt` : **0 occurrence** dans les 16 extraits — l'affirmation « qu'aucune diapositive ne montre » est **mesurée vraie** | certaine |
| `551:## Le contrôle de version …` (ce que `git pull` remplace) | 4P2 | 8 | 28, 93 | « transférer des fichiers par un simple « Drag & drop » » [28] ; « copier tout son contenu sous le répertoire /var/www/html » [93] | certaine |
| `634:## Exemple simple` | 4P2 | 3 | 39, 41 | « Un code utilisateur ou mot de passe pour se connecter à un système … Chaque ligne suit le format : <propriété>=<valeur> » [39] ; « on doit utiliser la fonction “**parse_ini_file()**” » [41] | certaine — la fonction et le format du volet fautif viennent de là |
| `634:## Exemple simple` | 4P2 | 8 | 95 | « votre fichier de configuration (config.ini) » — déposé dans `/var/www/html` par la diapositive 93 | certaine |
| `634:## Exemple simple` (le pilote employé) | 4P2 | 5 | 35 | « Pour la connexion à la base de données, nous utiliserons le pilote "**MySQLi**" » — la leçon écrit du **PDO**, absent des deux cours | certaine |
| `687:## Exemple complet` (`include "config.inc"` / `"header.inc"`) | 4P2 | 1 | 102-103 | « la différence … “include” ne produira qu'un avertissement … “require” causera une erreur fatale » [102] ; « include “header.inc” » [103] | certaine |
| `687:## Exemple complet` (`session_start()`) | 4P2 | 7 | 17, 32, 48 | « il faut charger les informations de la session de l'utilisateur avec la fonction : **session_start();** » [17] ; « Pour pouvoir utiliser les variables de session, il faut d'abord appeler la fonction session_start() » [32] | certaine |
| `687:## Exemple complet` (`session_set_cookie_params`, `httponly`, `samesite`) | aucun | — | — | `session_set_cookie_params`, `httponly`, `samesite`, `secure` : **0 occurrence** dans les 16 extraits — le cours ne montre jamais ces options, donc l'inversion d'ordre **n'est pas une faute du cours** | certaine |
| `687:## Exemple complet` (journalisation) | 4P2 | 3 | 45-47 | « Les journaux d'évènements sont des fichiers texte simples » [46] ; le code `log_message()` : `fopen("journal.log","a")` … `fwrite($logFile, …)` [47] — le cours journalise par `fopen`, jamais par `error_log()` | certaine |
| `687:## Exemple complet` (`chmod 777` sur le journal) | 4P2 | 8 | 95 | « chmod 777 journal.log » | certaine |
| `687:## Exemple complet` (`display_errors`) | aucun | — | — | `display_errors`, `log_errors`, `error_reporting` en production : **0 occurrence** (seul `error_reporting(E_ERROR \| E_PARSE)` figure dans le code de 4P2 s3 d47, sans commentaire) | certaine |
| `687:## Exemple complet` (`GRANT ALL PRIVILEGES ON *.*`, `FLUSH PRIVILEGES`) | B10 | 9 | 28-30 | « GRANT ALL PRIVILEGES ON \*.\* to ‘demo_user’@’localhost’ ; FLUSH PRIVILEGES; » | certaine |
| `687:## Exemple complet` (`GRANT ALL PRIVILEGES ON *.*`, `FLUSH PRIVILEGES`) | 4P2 | 8 | 74 | « CREATE USER ‘app_user’@’localhost’ … GRANT ALL PRIVILEGES ON \*.\* … FLUSH PRIVILEGES; » | certaine |
| `687:## Exemple complet` (hôte `'%'`, `WITH GRANT OPTION`, `secure_file_priv`, privilège `FILE`) | aucun | — | — | Les deux cours écrivent **`'localhost'`**, jamais `'%'` ; `WITH GRANT OPTION`, `secure_file_priv`, `FILE`, `LOAD_FILE`, `INTO OUTFILE` : **0 occurrence** | certaine — le volet « vulnérable » attribue au cours deux gestes qu'il ne fait pas |
| `836:## À toi de jouer` | aucun | — | — | Liste de vérification dérivée de la leçon ; ni le test `secret.txt`, ni la comparaison des huit mesures ne viennent d'une diapositive | certaine |
| `836:## À toi de jouer` (mesurer la version installée) | B10 | 9 | 41 | « php –version (observez quelle version de PHP vous avez (ex. 7.4.3) » — le seul « mesure ce que tu as installé » des deux cours | partielle |
| `861:## À retenir` | les deux | — | — | Reprise des sections précédentes ; ses renvois nominatifs sont ceux des lignes 470 et 82 ci-dessus, **avec la même erreur d'attribution sur WinSCP et sur XAMPP** | partielle |
| `884:## Aller plus loin` | aucun | — | — | Fiches KB et sources web ; aucune diapositive citée | certaine |

---

## 2 · Recoupements et conflits entre les deux cours

C'est le cœur du problème : dix endroits où les deux cours se croisent, dont **six** où la leçon
attribue à un seul cours une matière qui appartient aux deux, ou au mauvais.

**R-1 · L'image du droplet n'a pas la même version selon le cours.** B10 s2 d24 dit
« LAMP on **18.04** » ; 4P2 s8 d37 dit « LAMP on **24.04** ». La leçon retient 24.04 (relevé daté du
marketplace) : elle suit donc le 4P2 sans le dire. Un étudiant de B10 qui relit sa diapositive lira
18.04 et croira la leçon fautive.

**R-2 · Le prix du serveur existe en trois chiffres.** B10 s1 d13 « 5$ (maximum) » · B10 s2 d25
« celui à 5$ par mois » · 4P2 s1 d13 « 3$ (environ) » · 4P2 s8 d38 « celui à 6$ par mois ». La leçon
écrit « de l'ordre de 6 $ » puis « le plan de cours annonce 5 $ » : les deux sont exacts, mais dans
deux cours différents, et la leçon ne le dit pas.

**R-3 · XAMPP n'est pas propre au 4P2.** L'encadré `::: complement` de la ligne 88 affirme que la
méthode XAMPP « vient du cours 420-4P2-HU, **pas de celui-ci** ». B10 s1 d63 exige pourtant
« XAMPP ou WAMP » dans la liste du matériel du cours de sécurité. L'attribution est mesurément
fausse ; ce qui reste vrai, c'est que **la procédure d'installation détaillée** (d25-49) est
propre au 4P2.

**R-4 · WinSCP n'appartient pas à la séance 2.** L'encadré `::: cours {seance="2"}` de la ligne 480
annonce que « le transfert du code … se fait par WinSCP » et que « ce sont les deux outils posés dès
la mise en place de l'environnement infonuagique ». Mesure : **`Cours02` ne mentionne WinSCP nulle
part** (0 occurrence sur 82 diapositives). WinSCP est posé à la **séance 1** (d63), reconfiguré à la
**séance 3** (d38, 43) et employé à la **séance 9** (d46). PuTTY, lui, est bien la séance 2
(d26-31). L'encadré est donc juste pour PuTTY et faux pour WinSCP — et c'est l'encadré qui promet
« ce sont eux qui seront nommés à l'examen ».

**R-5 · phpMyAdmin dans `/var/www/html` et `GRANT ALL ON *.*` sont enseignés par les DEUX cours, en
mêmes mots.** B10 s9 d28-30, 46-47 et 4P2 s8 d74, 81-82. L'encadré `::: cours {seance="9"}` les
donne comme matière de B10 seulement, ce qui est vrai mais incomplet : un étudiant du 4P2 les a
aussi. Les deux ne diffèrent que par le nom du compte (`demo_user` / `app_user`) et l'adresse
d'accès (IP / nom de domaine).

**R-6 · La leçon impute MariaDB au 4P2 ; B10 est aussi un cours MariaDB.** L'encadré
`correction-du-cours` de la ligne 158 explique que « le matériel d'installation du 420-4P2-HU parle
de MariaDB, parce que c'est ce que XAMPP embarque ». Or B10 s9 installe MariaDB **explicitement**,
par `apt-get install mariadb-server` (d7), et tout son chapitre s'intitule « déploiement d'une base
de données MariaDB » (d3). Le fait technique de la leçon reste juste — l'image du droplet sert
MySQL 8.0, donc l'écart existe — mais **l'attribution est à corriger** : l'écart est entre les deux
cours et le serveur, pas entre le 4P2 et B10.

**R-7 · Le moindre privilège SQL est déjà dans le cours de sécurité.** La leçon présente
« un compte par application, restreint à sa base » comme la parade absente du cours. B10 s9 d32-34
l'enseigne : « on peut remplacer l'accès “ALL PRIVILEGES” par des opérations telles que : SELECT
UPDATE DELETE INSERT ». La séquence pédagogique du cours est `ALL PRIVILEGES` d'abord (d29-30, pour
faire fonctionner phpMyAdmin), verbes restreints ensuite (d32) : c'est un ordre, pas une omission.
La critique juste est plus étroite — le cours ne revient jamais restreindre le compte qu'il vient de
créer, et c'est celui-là que l'application emploie (4P2 s8 d82 : « Rappel: Username: app_user »).

**R-8 · Le HTTPS est annoncé et jamais couvert des deux côtés.** L'affirmation de la leçon
(« le HTTPS y est annoncé puis n'est jamais couvert ») est vraie pour B10 s9 d49 **et** pour 4P2 s8
d65 — dans les deux cas, la diapositive suivante change de sujet. C'est le seul recoupement où la
leçon a raison des deux côtés sans le revendiquer.

**R-9 · Les commandes Linux de base sont enseignées deux fois.** B10 s2 d34-75 les déroule une par
une (`pwd`, `clear`, `cd`, `ls`, `cat`, `mkdir`, `rm`, `mv`, `vi`) ; 4P2 s8 d32-35 en donne un rappel
condensé, **plus** `apt-get`, `chmod` et `sudo` que B10 s2 ne couvre pas. Le module 11 ne renvoie à
aucune des deux : il les suppose acquises par son `prerequis: environnement-linux`.

**R-10 · La pondération du projet.** La leçon annonce 20 % ; B10 s1 d6 annonce 15 %. La
contradiction est déjà consignée dans [`ancrage-au-cours.md`](ancrage-au-cours.md) §0 — l'horaire
publié dit 20 %, la diapositive dit 15 %, et `horaire.json` retient l'horaire. La leçon suit donc la
décision du dépôt ; ce qui manque est que son encadré ne signale pas la divergence, alors qu'il
s'adresse à un étudiant qui a la diapositive sous les yeux.

---

## 3 · Ce que la leçon enseigne et qu'aucun des deux cours ne porte

**Mesure d'ensemble.** Cherchés dans les **16 extraits** (748 diapositives), **0 occurrence** de :
`VirtualHost`, `DocumentRoot`, `ServerName`, `AllowOverride`, `.htaccess`, `RewriteRule`,
`a2ensite`, `a2enmod`, `git`, `.gitignore`, `composer`, `PSR-4`, `autoload`, `WSL`, `Docker`,
`DDEV`, `Laragon`, `php -S`, `phpinfo`, `apache2ctl`, `SAPI`, `php.ini`, `PDO`,
`session_set_cookie_params`, `httponly`, `samesite`, `display_errors`, `chown`, `www-data`,
`secure_file_priv`, `WITH GRANT OPTION`, `parité`.

| Ce que la leçon enseigne seule | D'où la matière vient réellement, selon la leçon |
|---|---|
| L'analogie du théâtre, la notion de **parité** et ses trois ruptures | Écrit pour la leçon |
| Les cinq options d'environnement local, WSL2, `ppa:ondrej/php`, `a2dismod`/`a2enmod`, la distinction **SAPI CLI vs module Apache**, `/etc/wsl.conf` | Fiche `web/php/php-environnement-developpement-moderne.md` |
| Le **VirtualHost** entier, `AllowOverride None`, les trois en-têtes de sécurité, `.test` / RFC 6761, le fichier `hosts` | Même fiche |
| L'arborescence `public/ src/ templates/ config/ var/ tests/`, le `DocumentRoot` comme **frontière de sécurité**, le couple `bd.ini` / `bd.ini.exemple`, le contrôleur frontal | Fiche `web/php/php-organisation-projet.md` |
| `git init`, le `.gitignore` de sept lignes et l'**ordre** des règles de ré-inclusion, `composer.json` / `composer.lock`, PSR-4 et ses limites (LFI) | Même fiche, plus le plan de cours du 4P2 cité mais jamais enseigné en diapositive |
| `chown www-data:www-data`, `640`, `660` et le groupe partagé pour une tâche `cron` | Fiche `web/securite/administration-serveur-linux.md`. Le cours ne nomme `chmod` (4P2 s8 d32) qu'avec la valeur `777` |
| **PDO** et `ERRMODE_EXCEPTION` | La leçon ; le cours enseigne **MySQLi** (4P2 s5 d35) |
| `session_set_cookie_params` avant `session_start`, l'inversion inerte, l'avertissement PHP 7.2+ | Documentation PHP citée en « Aller plus loin » ; **le cours ne montre jamais ces options** |
| `display_errors` / `log_errors` / `error_log` comme valeurs de configuration | La leçon ; le cours journalise par `fopen`/`fwrite` (4P2 s3 d47) |
| L'hôte `'%'`, `WITH GRANT OPTION`, `secure_file_priv`, le privilège `FILE`, l'inutilité de `FLUSH PRIVILEGES` | Documentation MySQL citée ; **absents des deux cours** |
| Les quatre versions relevées sur l'image (Ubuntu 24.04, Apache 2.4.58, PHP 8.4.11, MySQL 8.0.43) et le fait qu'`apt install php` donne 8.3 | Relevé daté du 2026-08-31 sur le marketplace + Launchpad, cités en « Aller plus loin » |
| Le tableau des écarts Windows / Linux : **sensibilité à la casse**, séparateurs, bits de permission | Fiche KB ; aucune diapositive |
| La facturation d'un droplet **arrêté** et des instantanés | Fiche KB ; le cours ne parle que du prix mensuel |

---

## 4 · Ce que les cours portent et que la leçon passe sous silence

La moitié que personne ne mesure. Neuf points, du plus au moins structurant.

1. **`mysql_secure_installation`** — B10 s9 d10-12 (« Configuration du mot de passe administrateur /
   Désactiver les comptes anonymes / Désactiver les connexions distantes / Supprimer base de données
   test ») et 4P2 s8 d69-71, avec la liste exacte des réponses. C'est **le** geste de durcissement
   d'amorçage des deux cours, il est enseigné deux fois, et le module 11 — dont le sujet est
   précisément « amorcer » — ne le nomme nulle part.
2. **L'importation de la base de données** — 4P2 s8 d85-89 : créer la base vide, importer le `.sql`,
   vérifier la table. C'est l'étape de mise en ligne que la leçon ne traite pas du tout, alors
   qu'elle est le pendant naturel de sa section sur le compte SQL.
3. **Le fuseau horaire du serveur** — 4P2 s8 d47-53, `timedatectl set-timezone`, motivé par
   « la date et heure des fichiers de journalisation ainsi que certaines fonctions SQL telles que
   now() ». La leçon place un journal dans `var/log/` sans jamais parler de l'heure qui l'horodate.
4. **Le nom de domaine réel et le DNS chez le registrar** — B10 s1 d64-70 (GoDaddy, propriété `@`,
   *name servers*) et 4P2 s8 d55-64 (édition de l'enregistrement, délai de propagation, cache du
   navigateur). Les deux plans de cours facturent ce nom de domaine à l'étudiant. La leçon ne parle
   que du `.test` local.
5. **La connexion SSH par clé** — B10 s3 d38, 43 : la configuration s'applique « pour Putty **et**
   WinSCP ». La leçon traite le transfert comme un problème de reproductibilité (`git pull` contre
   glisser-déposer) et jamais comme un problème d'authentification.
6. **Les extensions PHP requises par phpMyAdmin et le diagnostic de la page blanche** — B10 s9
   d41-42 (`php-mysqli`, `php-xml`, redémarrage d'Apache) et d48 (« si vous voyez le message d'erreur
   ci-dessous, c'est qu'une extension n'a pas été installée correctement »). La liste de paquets de
   la leçon les couvre, sans dire d'où vient l'exigence ni comment la panne se manifeste.
7. **`sudo`, le compte `root` et le changement de mot de passe à la première connexion** — 4P2 s8
   d35 et B10 s2 d26. La leçon emploie `sudo` dans tous ses blocs sans l'introduire.
8. **`vi` et les deux modes** — B10 s2 d66-74 (sept diapositives) et 4P2 s8 d34. Le « À toi de
   jouer » de la leçon demande d'éditer des fichiers sur le serveur sans dire avec quel outil.
9. **L'avertissement du cours sur phpMyAdmin en clair** — B10 s9 d49 le signale lui-même, en toutes
   lettres. La leçon présente ce risque comme un angle mort du cours ; il ne l'est pas — ce qui
   l'est, c'est que le cours annonce la correction (« lorsque nous installerons un certificat SSL »)
   et ne la livre pas.
