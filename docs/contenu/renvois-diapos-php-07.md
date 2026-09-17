# Renvois diapositives — PHP, module 07 « Déploiement d'application » (séance 8)

> **Ce que c'est.** La table de correspondance **mesurée** entre chaque titre `##`/`###` prévu pour
> `content/cours/php/07-deploiement/lecon.md` et les diapositives réelles du support de la
> **séance 8** du cours **420-4P2-HU**. Produite le **2026-09-16**, au lot **PHP-8**, par le fil
> principal. Frontmatter : `ordre: 7`, **`seance: 8`**.

## 0 · La source, et sa fraîcheur — 🔴 LE DÉCK A ÉTÉ REPUBLIÉ

| Étiquette | Ce qui a été lu | Diapos |
|---|---|---|
| **4P2** | `php-2026/extraits/Cours08_deploiement_application_web.txt`, **réextrait le 2026-09-16**, lu en entier | **101** |

🔴 **La copie locale était PÉRIMÉE, et rien ne l'aurait dit.** Le `.pptx` servi par le site porte
`Last-Modified: Sat, 12 Sep 2026 16:21:49 GMT` et `md5 = d4f80de8517835e37bec29f9a1547503`
(2 921 259 octets) ; la copie du 2026-08-31 avait `2af07b61…` (2 854 863 octets) et **103**
diapositives. L'ancienne version est rangée sous `php-2026/archives/` (gitignoré).

**Correspondance ancienne → nouvelle numérotation**, mesurée par comparaison des textes :
anciennes **1-60** inchangées · anciennes **61-62** fusionnées dans la nouvelle **60** · ancienne
**N ≥ 63 → N − 2**. Textes modifiés : **5** (XAMPP → **WAMP**), **37** (« Marketplace / LAMP on
24.04 » → « Solutions », chercher « LAMP »), **59** (chemin DNS du registraire), **63** (ne promet
**plus** de section SSL : annonce la protection de la base), **68** (la réponse « 2 » à « Enlever
compte anonyme » est devenue « **Y** »).

⚠️ **La KnowledgeBase citait l'ancienne numérotation** (`php-deploiement.md`,
`php-hebergement-domaine-https.md`). Recalée le 2026-09-16 par un agent dédié (voir la clôture du
lot). **Un renvoi `{diapos}` de la leçon se lit contre CE document, jamais contre la fiche.**

✅ **Captures lues par le fil principal** (le `.pptx` est une archive ; 45 images sur 41
diapositives) : 13/17, 36, 37, 40, 41, 42, 45, 50, 52, 53, 60, 65, 69, 76, 78, 80, 81, 85, 86,
87, 90, 92, 93, 94. **Non ouvertes** (écrans d'interface sans commande) : 22, 23, 27, 28, 43, 44, 46,
51, 57, 58, 59, 61, 77, 79, 95.

### 0a · L'instrument, et ce qu'il peut mesurer

❌ **Aucun Linux** sur le poste (ni WSL, ni VM), **aucun MariaDB/MySQL**, aucun Apache. Toute
commande `timedatectl`, `apt-get`, `chmod`, `mysql_secure_installation`, `GRANT` est **décrite**,
pas exécutée : **une sortie de terminal ne s'annonce que si elle est dans une capture lue** (§3a).
✅ PHP 8.5.10 CLI mesure ce qui relève de PHP :

| # | Affirmation | Mesure |
|---|---|---|
| M1 | fuseau de PHP quand le **système** est réglé (`TZ=America/Toronto`) et que `date.timezone` est vide | `date_default_timezone_get()` → **`UTC`** ; `date("H:i T")` → heure **UTC**. Avec `-d date.timezone=America/Toronto` → `America/Toronto`, heure **EDT**. Régler le système ne règle **pas** PHP |
| M2 | `parse_ini_file()` sur `password=CoursPHP123!` **sans** guillemets | `Warning: syntax error, unexpected '!' in … on line 3` et **`bool(false)`** — toute la configuration est perdue. C'est la raison de la note de la diapositive 93 |
| M3 | le même fichier, valeurs **entre guillemets** | les quatre clés lues, `password` = `CoursPHP123!` (12 caractères) |
| M4 | `password=Cours;PHP` sans guillemets | **`Cours`** — le `;` ouvre un commentaire, la valeur est **tronquée sans avertissement** |

### 0b · Le code déployé par la séance — lequel ?

🔴 **Le déck mélange deux applications**, et la leçon doit le dire plutôt que de le lisser :

| Diapos | Ce qu'elles montrent |
|---|---|
| 65 | « le corrigé de l'**examen de pratique** du cours 5 » — la capture pointe le lien **Corrigé** de la ligne **Cours 5** du site |
| 85, 87, 93 | base **`cours3`**, table **`client`** (capture 87), `config.ini` avec `dbname="cours3"` — c'est le **corrigé du cours 5** (`php-2026/corriges/corrige5_php/`) |
| 86, 90, 92, 94 | base **`pratique_examen_1`**, table **`offre_emploi`**, fichiers `ajouter_offre_emploi.php`, `base_de_donnees.ini`, `pratique_examen_1.sql` (captures de 2021) — une **autre** application |
| 87 (texte) | « votre table "offer_emploi" » — coquille, **et** la capture montre `client` |
| 91 | « Ne pas inclure le fichier `pratique_examen_1.sql` » |

**Le corrigé du cours 5 (lu le 2026-09-16)** : `cours3.sql` ne contient **aucun** `CREATE DATABASE`
(d'où la base vide à créer, diapo 85) ; `config.ini` dit `dbname=cours5` (d'où la modification,
diapo 93) ; `logger.inc` ouvre `journal.log` en ajout et fait `die("Incapable d'ouvrir le fichier de
journalisation!")` s'il échoue (d'où le `chmod`, diapo 93).

⚠️ **L'exercice 6 fait déployer le corrigé du cours 7** (sessions, base `cours08` dans son
`connexion.php`), pas celui du cours 5. La leçon suit **l'énoncé** pour l'exercice et **les
diapositives** pour la démonstration, en le disant.

## 1 · Les exercices — vérifiés à la SOURCE D'AUTORITÉ

✅ Relevés le **2026-09-16** sur <https://www.alexandrepetrin.ca/exercice-php-cours-8-2026/>
(aucune image) ; copie locale `php-2026/extraits/exercices-cours-08.txt`. **Six énoncés, dont le 4
optionnel**, précédés d'une phrase d'objectif (« déployer une application que vous avez faite, ou
le corrigé du cours 5 »). Au registre : `numero: 8`, références `1` à `6`. **Aucun corrigé** n'est
publié pour cette séance.

### 1a · Les fiches KB

| Fiche | Apport | Lignes |
|---|---|---:|
| `KnowledgeBase/web/php/php-hebergement-domaine-https.md` | IaaS/PaaS/SaaS, droplet, PuTTY/WinSCP, fuseau, DNS, HTTPS | 412 |
| `KnowledgeBase/web/php/php-deploiement.md` | `mysql_secure_installation`, compte de l'application, phpMyAdmin, import, copie du code, défauts de sécurité, liste de contrôle | 734 |

`grep -n "^## " <fiche>`, recalculé à chaque lecture — jamais de plage recopiée.

## 2 · La table des renvois

| # | Titre de la leçon | Renvoi | Ce que portent les diapositives |
|---|---|---|---|
| 1 | `## L'idée en une image` | `{diapos="5, 8, 10"}` | sortir du poste local ; l'infrastructure ; louer plutôt qu'acheter |
| 2 | `## En bref — la marche à suivre` | `{diapos="36-39, 44, 49-52, 60, 68, 72, 76-80, 84-86, 91, 93"}` | droplet, connexion, fuseau, DNS, sécurisation, compte, phpMyAdmin, import, copie, configuration |
| 3 | `## Ce que la séance 8 enseigne, et ce que cette leçon ajoute` | `{diapos="3, 6, 99"}` | le rappel, le plan de la séance, l'examen 2 qui suit |
| 4 | `## L'infrastructure, et ce que le nuage loue` | `{diapos="8, 9, 10, 11"}` | rôle ; « on premise » contre nuage ; définition ; avantages et inconvénients |
| 4a | `### IaaS, PaaS, SaaS — qui gère quoi` | `{diapos="12, 13, 14, 15, 16, 17"}` | les trois types ; le tableau « You Manage / Vendor Manages » (capture 13/17) |
| 5 | `## PuTTY et WinSCP, deux clients SSH` | `{diapos="26, 27, 28"}` | terminal distant ; transfert de fichiers ; le protocole SSH |
| 6 | `## La pile LAMP et les commandes Linux du cours` | `{diapos="29, 30, 31, 32"}` | L-A-M-P ; Linux ; les neuf commandes |
| 6a | `### apt-get, vi et sudo` | `{diapos="33, 34, 35"}` | `sudo apt-get update` / `install` ; les modes de `vi` ; `sudo` |
| 7 | `## Créer le serveur chez DigitalOcean` | `{diapos="21, 24, 36, 37, 38"}` | la plateforme ; le « droplet » ; les neuf gestes de création |
| 7a | `### Ce que coûte un droplet` | `{diapos="10, 38"}` | la facturation mensuelle divisée à l'heure ; le plan « à 6 $ par mois » |
| 7b | `### « One-time password » : un mot de passe root reçu par courriel` | `{diapos="38, 39"}` | l'option d'authentification ; le changement du mot de passe root à la première connexion |
| 8 | `## Se connecter : PuTTY, puis WinSCP` | `{diapos="39, 40, 41, 42, 43, 44, 45"}` | adresse IP, port 22, SSH ; l'IP du droplet ; l'alerte de clé ; WinSCP |
| 8a | `### L'alerte de clé d'hôte, acceptée sans vérification` | `{diapos="41"}` | la capture « PuTTY Security Alert » et le bouton « Yes » encadré |
| 9 | `## Valider le déploiement` | `{diapos="46"}` | l'adresse IP dans le navigateur |
| 10 | `## Le fuseau horaire` | `{diapos="48, 49, 50, 51, 52, 53"}` | pourquoi ; `timedatectl` ; lire « Time zone » ; lister ; changer ; vérifier |
| 10a | `### Le fuseau du système n'est pas celui de PHP` | `{hors-cours}` | — (M1 ; `date.timezone`) |
| 11 | `## Le nom de domaine et le DNS` | `{diapos="56, 57, 58, 59, 60, 61, 62"}` | à quoi sert un nom ; achat ; tableau de bord du registraire ; l'enregistrement A ; la propagation ; le cache du navigateur |
| 11a | `### HTTPS, que les captures montrent et que la séance n'enseigne plus` | `{hors-cours}` | — (captures 80 et 94 en `https://`, capture 87 « Not secure » ; aucune étape de certificat dans la version du 2026-09-12) |
| 12 | `## Sécuriser MariaDB : mysql_secure_installation` | `{diapos="66, 67, 68, 69"}` | les quatre tâches ; la commande et les réponses ; la sortie (capture 69) |
| 13 | `## Le compte de l'application` | `{diapos="70, 71, 72, 73"}` | ouvrir `mysql` ; `CREATE USER` / `GRANT` / `FLUSH` |
| 13a | `### GRANT ALL PRIVILEGES sur toutes les bases — un second root` | `{diapos="72"}` | le privilège accordé et sa portée |
| 14 | `## Installer phpMyAdmin` | `{diapos="74, 75, 76, 77, 78, 79, 80, 81, 82"}` | télécharger, décompresser, renommer, téléverser, se connecter |
| 14a | `### Un phpMyAdmin ouvert à tout Internet` | `{diapos="80"}` | l'adresse `<nom de domaine>/phpMyAdmin` et les identifiants rappelés |
| 15 | `## Importer la base` | `{diapos="83, 84, 85, 86, 87"}` | base vide `cours3` ; onglet Importer ; vérifier la table |
| 16 | `## Déployer le code` | `{diapos="65, 89, 90, 91, 92, 93, 94, 95"}` | quel corrigé (65) ; copier sous `/var/www/html` ; retirer `index.html` ; exclure le `.sql` ; configurer ; tester |
| 16a | `### config.ini : les guillemets, et un fichier que tout le monde peut lire` | `{diapos="93"}` | « les valeurs doivent être entourées de guillemets maintenant » (M2-M4) |
| 16b | `### chmod 777 journal.log` | `{diapos="93"}` | la commande et sa raison |
| 17 | `## Exemple simple` | `{diapos="49, 50, 51, 52, 53"}` | régler et vérifier le fuseau |
| 18 | `## Exemple complet` | `{diapos="68, 72, 85, 86, 91, 93"}` | du serveur neuf à l'application en ligne, version corrigée |
| 19 | `## À toi de jouer` | `{hors-cours}` | — |
| 20 | `## À retenir` | `{diapos="97"}` | la conclusion |
| 21 | `## Aller plus loin` | `{diapos="101"}` | les deux références du déck |

🔴 **TRENTE-DEUX titres — vingt et un `##` et onze `###`.** Compté sur la table : vingt et un
numéros nus (1 à 21) et onze à lettre (4a, 6a, 7a, 7b, 8a, 10a, 11a, 13a, 14a, 16a, 16b). ⚠️ Le
premier jet de ce paragraphe disait « trente-trois / douze », compté de tête : c'est l'énumération
qui fait foi.

**Découpe des rédacteurs, dimensionnée sur la sortie** (leçon du lot PHP-7 : deux rédacteurs à
~1 050 lignes chacun ont fini à 172k et 174k) : **A** = titres 1 à 6a · **B** = 7 à 12 · **C** =
13 à 21. ⚠️ **Redécoupé le 2026-09-16 après A** : A a fini à **160k** pour 884 lignes (marche à suivre de
27 étapes) ; le reste passe à **quatre** rédacteurs de ~400 lignes — **B** = 7 à 9 · **C** = 10 à 12 ·
**D** = 13 à 16b · **E** = 17 à 21. Le titre 13a a été renommé (« sur toutes les bases » au lieu de
`*.*`) : markdown-it rendait `*.*` en `<em>.</em>` dans un titre, mesuré.

## 3 · Le sens inverse — diapositives atteignables

**82 diapositives citées sur 101. Dix-neuf orphelines**, toutes sans contenu propre :

| Diapos | Ce qu'elles portent |
|---|---|
| 1, 4 | couverture et intertitre « Déploiement d'application web » |
| 2 | intertitre « Rappel du dernier cours » (le contenu est en 3) |
| 7, 18, 20, 25, 47, 55, 64, 96, 98 | intertitres de section, sans texte |
| 19 | sommaire de la section IaaS (reprend les titres qui suivent) |
| 22, 23 | captures de la création de compte DigitalOcean (écrans d'interface, non ouverts) |
| 54, 63, 88 | phrases de transition (« Voici donc qui termine… ») |
| 100 | « Questions? » |

82 + 19 = 101, compté par script sur la table du §2.

### 3a · Ce que les captures lues montrent

| Diapo | Contenu |
|---|---|
| 13, 17 | tableau « Cloud Services » : On Premises / IaaS / PaaS / SaaS, neuf couches (Applications → Networking), « You Manage » en bleu, « Vendor Manages » en vert. En IaaS, le fournisseur gère Virtualization, Servers, Storage, Networking ; en PaaS, en plus O/S, Middleware, Runtime ; en SaaS, tout |
| 36 | bouton « Create Droplet » ; choix de région, **Toronto** sélectionné |
| 37 | « Choose an image » → onglet **Solutions (301)**, recherche « LAMP », sélection « LAMP » |
| 40 | tableau de bord : droplet « DemoCours », adresse IP ; PuTTY, Host Name = cette IP, Port 22, SSH |
| 41 | **« PuTTY Security Alert »** — « The server's host key is not cached… You have no guarantee that the server is the computer you think it is » + empreinte `ssh-ed25519 256 …`, bouton **Yes** encadré en rouge |
| 42 | message d'accueil du « One-Click LAMP Droplet » : **UFW activé, seuls 22, 80 et 443 ouverts** ; racine web `/var/www/html` ; **« The MySQL root password is saved in /root/.digitalocean_password »** ; Certbot préinstallé ; puis changement du mot de passe UNIX de root. Capture **datée de 2019** (`lamp1804`, Ubuntu 18.04) |
| 45 | WinSCP, session `root@www.alexandremageau.ca`, protocole **SFTP-3**, dossier `/var/www/html` |
| 50 | `timedatectl` : `Time zone: Etc/UTC (UTC, +0000)`, `NTP service: active` |
| 52 | `timedatectl set-timezone America/Toronto` — **aucune sortie** ; `date` → `Thu Aug 12 08:23:27 EDT 2021` |
| 53 | `timedatectl` : `Time zone: America/Toronto (EDT, -0400)` |
| 60 | enregistrement DNS **A**, nom **@**, donnée `206.189.203.129`, TTL « 1/2 Hour », icône d'édition encadrée |
| 65 | tableau du site du cours : ligne « Cours 5 », lien **Corrigé** fléché ; ligne « Cours 6 — Examen 1 (**10 %**) » |
| 69 | sortie de **`mysql_secure_installation` de MySQL** (niveaux LOW/MEDIUM/STRONG, « Please enter 0 = LOW, 1 = MEDIUM and 2 = STRONG: 2 », « Skipping password set for root as authentication with **auth_socket** is used by default », lien `dev.mysql.com/doc/refman/8.0`) ; puis `Y` à : utilisateurs anonymes, root à distance, base `test`, rechargement ; « All done! » |
| 76 | page de téléchargement **phpMyAdmin 5.2.3** (8 octobre 2025), fichier `phpMyAdmin-5.2.3-all-languages.zip` fléché ; colonnes « Verification [PGP] [SHA256] » |
| 78 | dossier renommé **`phpmyadmin`** (minuscules), daté du 2025-09-29 |
| 80 | navigateur sur **`decorons.ca/phpMyAdmin/`** (cadenas), écran « Welcome to phpMyAdmin », champs Username / Password |
| 46, 61 | *(lues le 2026-09-17)* page d'accueil du droplet LAMP de DigitalOcean — « Please log into your Droplet with SSH to configure the LAMP installation. », boutons « Quickstart Guide » et « Ask a Question » ; barre d'adresse **« Not secure »**, sur l'IP (46) puis sur `www.<domaine>` (61) |
| 81 | 🔴 *(relue le 2026-09-17 — la ligne précédente disait « téléversement WinSCP », c'était FAUX)* **accueil de phpMyAdmin** : « Server type: **MariaDB** », « Server version: **10.3.31-MariaDB**-0ubuntu0.20.04.1 - Ubuntu 20.04 », « User: app_user@localhost », « Server connection: **SSL is not being used** », Apache/2.4.41 (Ubuntu), PHP 7.4.3 |
| 85 | phpMyAdmin « Create database » : **`cours3`**, collation `utf8mb4_0900_ai_ci` |
| 86 | import réussi de `pratique_examen_1.sql` dans la base **`pratique_examen_1`**, table `offre_emploi` ; en-tête du dump « Server version: 10.4.18-M… » |
| 87 | `167.99.190.49/phpmyadmin/…` marqué **« Not secure »** ; base `cours3`, table `client`, deux lignes avec **nom et courriel réels** |
| 90, 94 | l'application « Offre(s) d'emploi » (tableau, liens MODIFIER / SUPPRIMER / AJOUTER) ; en 94, sur `https://decorons.ca` |
| 92 | copie Windows → WinSCP `/var/www/html` : `ajout.php`, `ajouter_offre_emploi.php`, `base_de_donnees.ini`, `fonctions.js`, `index.php`, `journal.log`, `logger.inc`, `modifier*.php`, `supprimer.php`, et un dossier `phpMyAdmin` |
| 93 | `/var/www/html/config.ini` : `server="localhost"`, `username="app_user"`, `password="CoursPHP123!"`, `dbname="cours3"` ; terminal `root@cours8-Demo:/var/www/html# chmod 777 journal.log`, aucune sortie |

⚠️ **La capture 87 montre le nom et l'adresse courriel réels d'une personne.** Rien de cette
capture ne se recopie dans `content/`.

## 4 · 🔴 Ce que la source dit et qui demande une nuance

1. 🔴 **`config.ini` dans `/var/www/html`** (diapo 93) : servi par Apache à qui tape
   `https://domaine/config.ini`, **avec le mot de passe d'un compte qui a tous les privilèges sur
   toutes les bases** (diapo 72). Le même défaut touche `journal.log` et `logger.inc`. Correction :
   hors de la racine web, ou refus explicite dans la configuration Apache. ⚠️ Non mesurable ici
   (pas d'Apache) : l'affirmation vient de la fiche KB, qui l'a argumentée.
2. 🔴 **`GRANT ALL PRIVILEGES ON *.*`** (diapo 72) : le compte de l'application est un second root.
   Correction : `GRANT SELECT, INSERT, UPDATE, DELETE ON cours3.* TO …`, et un compte distinct pour
   l'administration.
3. 🔴 **Le mot de passe `CoursPHP123!` est écrit dans le déck public** (diapos 72, 80, 93) : à
   remplacer par un mot de passe généré. La leçon ne le montre qu'en disant de ne pas le reprendre.
4. 🔴 **phpMyAdmin exposé à tout Internet** sous un chemin devinable (diapo 80), connecté à ce même
   compte. Correction : restreindre par IP, le mettre derrière une authentification HTTP, ou le
   retirer après l'import ; au minimum le tenir à jour.
5. ⚠️ **`chmod 777 journal.log`** (diapo 93) : n'importe quel compte du serveur peut réécrire le
   journal. La raison réelle est que le fichier, copié en **root**, n'est pas inscriptible par
   l'utilisateur d'Apache (`www-data` sous Ubuntu). Correction : `chown www-data` (ou groupe) et
   `chmod 640`/`664`.
6. ⚠️ **Tout se fait en root** (diapos 39, 42, 45, 93), par mot de passe. Correction : un compte
   `sudo`, authentification par **clé** SSH, `PermitRootLogin no`.
7. ⚠️ **L'alerte de clé d'hôte est acceptée sans comparaison** (diapo 41). La capture elle-même dit
   « You have no guarantee that the server is the computer you think it is ». Correction : comparer
   l'empreinte à celle qu'affiche la console du fournisseur. `à-vérifier:` l'endroit exact où
   DigitalOcean l'affiche.
8. ⚠️ **La diapo 68 et le titre de section disent MariaDB ; la capture 69 montre MySQL — et la capture 81 montre MariaDB 10.3.31 (Ubuntu 20.04)** : les captures viennent de droplets de millésimes différents, la leçon ne tranche donc pas le moteur livré par l'image actuelle (constat du 2026-09-17) (composant
   VALIDATE PASSWORD, `auth_socket`, lien vers la documentation MySQL 8.0). La KB le dit déjà : le
   droplet LAMP livre **MySQL**. Les questions ne se posent pas dans le même ordre selon le moteur :
   la leçon ne promet pas une séquence de touches exacte.
9. ⚠️ **La capture 42 est de 2019** (Ubuntu 18.04) : elle dit que le mot de passe root de MySQL est
   dans `/root/.digitalocean_password`. `à-vérifier:` sur l'image LAMP actuelle.
10. ⚠️ **`phpmyadmin` (diapo 78) contre `phpMyAdmin` (diapo 80)** : Linux distingue la casse ;
    suivre les deux diapositives à la lettre mène à une **404**. Même écart dans la capture 92.
11. ⚠️ **Deux applications mêlées** (§0b) et la coquille « offer_emploi ».
12. ⚠️ **Le fuseau du système ne règle pas celui de PHP** (M1). La diapo 48 donne le bon motif
    (horodatage des journaux), mais `date()` du `logger.inc` restera en **UTC** tant que
    `date.timezone` n'est pas posé.
13. ⚠️ **La diapo 93 dit « les valeurs doivent être entourées de guillemets maintenant » sans dire
    pourquoi** : c'est le `!` du nouveau mot de passe (M2). Un `;` tronquerait en silence (M4).
14. ⚠️ **HTTPS n'est plus enseigné** dans la version du 2026-09-12 (l'ancienne diapo 65 l'annonçait),
    mais les captures 80 et 94 sont en `https://` et la 87 en « Not secure ». Certbot est
    préinstallé (capture 42). La leçon le signale et renvoie à la fiche KB, **en 🧩**.
15. ⚠️ **Le coût** : la diapo 38 dit « 6 $ par mois ». Un compte DigitalOcean exige un moyen de
    paiement ; un droplet oublié continue d'être facturé. `à-vérifier:` le tarif et les crédits
    étudiants au moment de la lecture — ne rien affirmer de chiffré sans date.
16. ⚠️ **La diapo 32 écrit les commandes en MAJUSCULES** (`CD`, `MKDIR`, `APT-GET`…) et la 33
    `apt-get INSTALL` : Linux est sensible à la casse, `CD` n'existe pas. À taper en minuscules.
17. 🔵 **La diapo 34 écrit `: wq`** (avec une espace). ~~la commande est `:wq`~~ — **cette nuance accusait le cours à tort** (relu le 2026-09-17) : Vim ignore les espaces et les deux-points en tête d'une commande Ex (`src/ex_docmd.c`, l.1865, « Skip comment lines and leading white space and colons »), donc `: wq` fonctionne. Remarque de forme seulement.
18. 🔵 **Ce que le cours fait bien** : `mysql_secure_installation` avant tout ; un compte dédié
    plutôt que root pour l'application ; retirer `index.html` ; **ne pas copier le `.sql`** dans la
    racine web (diapo 91) — exactement le réflexe qui manque au `config.ini` ; valider par une
    écriture réelle (diapo 95).

## 5 · Ce qui bloque la publication

**P-2 à P-8** inchangés (`reprise-php-en-bref.md` §3). S'y ajoute pour cette séance : le **tarif et
les conditions** de DigitalOcean au moment de la lecture. Le module 07 reste `statut: verifiee`.
