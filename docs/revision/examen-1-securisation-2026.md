# Examen 1 — Sécurisation des applications web (420-B10-HU) · Fiche de révision

> **Portée : cours 1 à 4** (le Cours 5 le dit, diapo 118). Examen à la séance 6, le 2026-09-11.
> **Documents permis** : notes, exercices et corrigés, Internet (Cours 1, diapo 7).
> **Format annoncé** : *« Les examens réutiliseront le même modèle que les exercices »* (Cours 1, diapo 6).
> Autrement dit, **les commandes des exercices sont la matière d'examen.**

**Légende**

| Marque | Sens |
|---|---|
| 📘 | ce que le cours montre — **c'est la réponse à donner à l'examen** |
| 💡 | variante plus simple **avec les mêmes outils** (ne change rien au résultat) |
| ⚠️ | le support contient une coquille ou une imprécision : la réponse juste est donnée à côté |
| `diapo N` | numéro de la diapositive dans le support 2026 de la séance |

**Valeurs employées dans les exemples concrets**

| Quoi | Valeur | À faire |
|---|---|---|
| IP du droplet | `203.0.113.10` | **remplace-la par l'IP de TON droplet** (203.0.113.x est une plage réservée aux exemples) |
| Dossier perso Windows (poste du Cégep) | `C:\Utilisateur\0758510` | hypothèse : tape `echo %USERPROFILE%` dans `cmd` pour lire le vrai chemin (l'Explorateur français affiche « Utilisateurs » pour `C:\Users`) |
| WAMP | `C:\wamp` (racine web `C:\wamp\www`) | hypothèse : peut être `C:\wamp64` sur une installation 64 bits |
| Compte sur le serveur | `root` | le cours travaille toujours en `root` → **pas besoin de `sudo`** dans ses commandes |

> 💡 **À propos de `sudo`** : le cours tape tout en `root`, donc sans `sudo`. Si tu es connecté avec
> un autre compte, ajoute `sudo` devant les commandes d'administration (`apt`, `ufw`, `systemctl`…).
> En `root`, ajouter `sudo` ne change rien et ne casse rien.

**Les leçons complètes du site** (théorie + renvois de diapos) :
[01 Fondamentaux](https://salmon-sky-0a730780f.7.azurestaticapps.net/cours/securite-web/fondamentaux/) ·
[02 Environnement Linux](https://salmon-sky-0a730780f.7.azurestaticapps.net/cours/securite-web/environnement-linux/) ·
[03 Communication serveur](https://salmon-sky-0a730780f.7.azurestaticapps.net/cours/securite-web/communication-serveur/) ·
[04 Automatisation et surveillance](https://salmon-sky-0a730780f.7.azurestaticapps.net/cours/securite-web/automatisation-surveillance/)

## Table des matières

- [A · Corrigés des exercices (séance 4 → séance 1)](#a)
  - [Séance 4 — Tâches cédulées et scriptage](#a4)
  - [Séance 3 — Sécurité des communications serveur](#a3)
  - [Séance 2 — Environnement infonuagique Linux](#a2)
  - [Séance 1 — Introduction et poste de travail](#a1)
- [D · Pseudo-examen (questions + réponses cachées)](#d)
- [B · Résumé des cours 1 à 5 (étapes, commandes, code)](#b)
  - [Cours 1](#b1) · [Cours 2](#b2) · [Cours 3](#b3) · [Cours 4](#b4) · [Cours 5 (hors examen 1)](#b5)

---

<a id="a"></a>

# A · Corrigés des exercices

> Les énoncés sont **reformulés** (ce dépôt est public). L'ordre et la numérotation sont ceux des
> feuilles de l'enseignant. Seul l'exercice 1 de la séance 4 a un corrigé publié — et il contient
> une coquille, signalée plus bas.

<a id="a4"></a>

## Séance 4 — Tâches cédulées et scriptage

**Préparation commune** — l'énoncé mélange deux dossiers (`/scriptExerciceCours6/` pour les scripts,
`/scriptExerciceCours4/` pour certains journaux). Ce n'est pas ton erreur : crée les deux.

```bash
mkdir /scriptExerciceCours4 /scriptExerciceCours6   # mkdir accepte plusieurs noms d'un coup
```

### Exercice 1 — Écrire sept expressions crontab

Rappel de l'ordre des 5 champs : **minute · heure · jour du mois · mois · jour de la semaine**.

| # | Énoncé | Réponse | Pourquoi |
|---|---|---|---|
| a | à chaque minute | `* * * * *` | `*` = toutes les valeurs de chaque champ |
| b | toutes les 15 minutes | `*/15 * * * *` | `*/15` en minutes = 0, 15, 30, 45 |
| c | à 0 h 30, du lundi au vendredi | `30 0 * * 1-5` | minute **30**, heure **0** ; `1-5` = lundi à vendredi. ⚠️ piège : `0 30 …` met 30 dans les heures → invalide |
| d | toutes les heures, lundi, jeudi et dimanche | `0 * * * 1,4,7` | corrigé de l'enseignant. `0 * * * 0,1,4` est **identique** (dimanche = 0 **ou** 7) |
| e | le 1er février à 21 h | `0 21 1 2 *` | minute 0, heure 21, jour 1, mois 2 |
| f | le 15 du mois à minuit, un mois sur deux | `0 0 15 */2 *` | `*/2` en mois part de 1 → janvier, mars, mai, juillet, septembre, novembre |
| g | toutes les 15 min **sauf** la minute 45 (seulement 0, 15, 30) | `0,15,30 * * * *` | on **énumère** avec des virgules, `*/15` donnerait aussi 45 |

> ⚠️ **Coquille dans le corrigé publié** : il affiche `0,15,45 * * * *` pour (g). C'est l'inverse de
> l'énoncé, qui exclut justement la minute 45. La bonne réponse est `0,15,30 * * * *`.

### Exercice 2 — Script PHP qui affiche l'heure du serveur

**Étapes**

1. Créer le droplet (voir séance 2, ex. 1) et s'y connecter avec PuTTY.
2. Installer PHP.
3. Écrire le script avec `vi`, l'exécuter, vérifier l'heure.
4. Si l'heure est fausse (le droplet est en UTC → +4 h en été au Québec), corriger le fuseau.

```bash
apt-get install php                  # 📘 forme du cours
# 💡 sudo apt update && sudo apt install php   ← met d'abord la liste des paquets à jour (évite « Unable to locate package »)
php -v                               # vérifie que PHP répond

vi /scriptExerciceCours6/heureActuelle.php
```

Contenu du script (dans `vi` : `i`, taper, `Échap`, `:wq`) :

```php
<?php
// Affiche la date et l'heure complètes au moment de l'exécution
echo date("Y-m-d H:i:s") . "\n";   // Y=année 4 chiffres, m=mois, d=jour, H=heure 00-23, i=minutes, s=secondes
?>
```

```bash
php /scriptExerciceCours6/heureActuelle.php    # exécuter : php <chemin du script>   (Cours 4, diapo 48)
# → 2026-09-11 18:42:07    (si c'est 4 h de plus que ta montre : le serveur est en UTC)

date                                       # heure du SYSTÈME
timedatectl                                # affiche le fuseau actuel (Time zone: Etc/UTC)
timedatectl set-timezone America/Toronto   # fuseau du Québec
# alternative par menu : dpkg-reconfigure tzdata   (America → Toronto)
```

> ⚠️ **Si `php` affiche encore l'heure UTC après `timedatectl`** : PHP n'utilise pas forcément le
> fuseau du système, il lit le sien (`date.timezone` dans `php.ini`, UTC par défaut). Correctif en
> une ligne, en tête du script : `date_default_timezone_set('America/Toronto');`

### Exercice 3 — Planifier le script chaque minute + surveiller le journal

```bash
crontab -e      # 1re fois : choisir l'éditeur (le cours prend 2 = vim.basic, c.-à-d. vi)
```

Ligne à ajouter dans la crontab (puis `Échap`, `:wq`) :

```bash
* * * * * php /scriptExerciceCours6/heureActuelle.php >> /scriptExerciceCours4/exercice3.log
```

| Morceau | Rôle |
|---|---|
| `* * * * *` | chaque minute |
| `php /scriptExerciceCours6/heureActuelle.php` | la commande exécutée (chemin **absolu** du script) |
| `>>` | **ajoute** la sortie à la fin du fichier (l'énoncé dit « ajouté ») — `>` écraserait le fichier à chaque fois : tu ne verrais jamais qu'une ligne |
| `/scriptExerciceCours4/exercice3.log` | le journal (créé automatiquement s'il n'existe pas, mais son dossier doit exister) |

```bash
crontab -l                                   # relire la crontab enregistrée
tail -f /scriptExerciceCours4/exercice3.log  # surveiller en TEMPS RÉEL (une ligne de plus chaque minute) ; Ctrl+C pour arrêter
```

> 💡 `2>&1` à la fin de la ligne envoie **aussi les erreurs** dans le journal
> (`… >> /scriptExerciceCours4/exercice3.log 2>&1`). Sans lui, si le script plante, le journal reste
> muet. Hors cours, mais c'est la même commande avec 5 caractères de plus.

### Exercice 4 — Redémarrer Apache automatiquement s'il est arrêté

```bash
apt-get install apache2              # 📘   💡 sudo apt update && sudo apt install apache2
# navigateur : http://203.0.113.10   → page « Apache2 Ubuntu Default Page — It works! »

vi /scriptExerciceCours6/exercice4.php
```

Script (📘 calqué sur `surveillerApache.php`, Cours 4, diapos 61-62) :

```php
<?php
// Ligne 3 : demande à systemd si Apache est « active » ou « inactive »
$resultat = shell_exec('systemctl is-active apache2');

// Ligne 5 : faut-il le démarrer ?
if ($resultat == "inactive\n") {
    shell_exec('systemctl start apache2');            // Ligne 6 : démarrage
    echo "[" . date("Y-m-d H:i:s") . "] ";            // Lignes 7-8 : trace horodatée
    echo "Redemarrage d'Apache\n";
}
?>
```

> 💡 **Mince modification qui rend le test plus sûr** : `if (trim($resultat) != "active") {`
> — `trim()` retire le `\n`, et on teste l'état **attendu** : le script redémarre aussi Apache s'il est
> `failed` (planté), ce que la version du cours laisse passer. Même outil, même logique.

Crontab (`crontab -e`) :

```bash
* * * * * php /scriptExerciceCours6/exercice4.php >> /scriptExerciceCours4/exercice4.log
```

Le script n'écrit **que** s'il redémarre Apache → le journal ne contient que les redémarrages. ✔

**Test demandé**

```bash
systemctl stop apache2                          # arrêter Apache
# navigateur : rafraîchir http://203.0.113.10 → la page ne répond plus
# attendre un peu plus d'une minute…
systemctl status apache2                        # « active (running) » : cron l'a relancé
cat /scriptExerciceCours4/exercice4.log         # → [2026-09-11 18:51:01] Redemarrage d'Apache
```

### Exercice 5 — MariaDB : purger les données de plus de 6 mois

**1) Installer et créer la base**

```bash
apt-get install mariadb-server php-mysql   # php-mysql = l'extension mysqli dont le script PHP a besoin
# 💡 sudo apt update && sudo apt install mariadb-server php-mysql
mysql                                      # client MariaDB (en root, aucun mot de passe demandé)
```

```sql
CREATE DATABASE cours4;
USE cours4;

CREATE TABLE donnees (
  id_donnees    INT AUTO_INCREMENT PRIMARY KEY,   -- entier, clé primaire auto-incrémentée
  texte         VARCHAR(100),
  date_creation DATETIME
);

-- Données étalées sur les derniers mois (aujourd'hui = 2026-09-11 → limite = 2026-03-11)
INSERT INTO donnees (texte, date_creation) VALUES
  ('Recente',        '2026-09-01 10:00:00'),   -- reste
  ('Il y a 3 mois',  '2026-06-10 10:00:00'),   -- reste
  ('Il y a 5 mois',  '2026-04-15 10:00:00'),   -- reste
  ('Il y a 7 mois',  '2026-02-10 10:00:00'),   -- sera supprimée
  ('Il y a 10 mois', '2025-11-05 10:00:00');   -- sera supprimée
-- 💡 version relative : ('Il y a 7 mois', DATE_ADD(NOW(), INTERVAL -7 MONTH))

-- Compte pour le script PHP (le cours se connecte avec alexandre / qwerty)
CREATE USER 'alexandre'@'localhost' IDENTIFIED BY 'qwerty';
GRANT ALL PRIVILEGES ON cours4.* TO 'alexandre'@'localhost';
FLUSH PRIVILEGES;

-- Vérifier AVANT de supprimer (📘 Cours 4, diapo 55 : SELECT puis DELETE, même filtre)
SELECT * FROM donnees WHERE date_creation < DATE_ADD(NOW(), INTERVAL -6 MONTH);
EXIT;
```

**2) Exporter la table** (sauvegarde pour recommencer)

```bash
mysqldump cours4 donnees > /scriptExerciceCours4/donnees.sql   # mysqldump <base> <table> > <fichier>
```

**3) Le script de purge** — `vi /scriptExerciceCours6/exercice5.php` (📘 calqué sur la diapo 56)

```php
<?php
$conn = new mysqli('localhost', 'alexandre', 'qwerty', 'cours4');  // hôte, utilisateur, mot de passe, base
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$sql = "DELETE FROM donnees WHERE date_creation < DATE_ADD(now(), INTERVAL -6 MONTH)";
if ($conn->query($sql) === TRUE) {
    echo "[" . date("Y-m-d H:i:s") . "] Suppression effectuee avec succes ("
       . $conn->affected_rows . " ligne(s))\n";       // 💡 affected_rows : combien de lignes ont disparu
} else {
    echo "Erreur de suppression: " . $conn->error . "\n";
}
$conn->close();
?>
```

**4) La tâche cédulée aux 5 minutes**

```bash
php /scriptExerciceCours6/exercice5.php      # tester à la main d'abord
crontab -e
*/5 * * * * php /scriptExerciceCours6/exercice5.php >> /scriptExerciceCours4/exercice5.log
```

**5) Vérifier / recommencer**

```bash
mysql -e "SELECT * FROM cours4.donnees;"               # il ne reste que les 3 récentes
# En cas de problème : supprimer la table puis réimporter l'export
mysql -e "DROP TABLE cours4.donnees;"
mysql cours4 < /scriptExerciceCours4/donnees.sql       # mysql <base> < <fichier> = importer
```

> ⚠️ Diapo 56 : le texte dit qu'une purge **une fois par jour** suffit, la capture montre `*/1`.
> L'exercice demande `*/5` pour voir le résultat pendant la séance ; en vrai, `0 3 * * *`.

### Exercice 6 — Épargner les données marquées « conserver = true »

```bash
crontab -e       # 📘 astuce du cours : désactiver la tâche pendant la modif en la commentant
#*/5 * * * * php /scriptExerciceCours6/exercice5.php >> /scriptExerciceCours4/exercice5.log
```

```sql
USE cours4;
ALTER TABLE donnees ADD conserver VARCHAR(10);          -- 'true' ou 'false'

-- Nouvelles données de plus de 6 mois, true/false au hasard
INSERT INTO donnees (texte, date_creation, conserver) VALUES
  ('Vieux A', '2026-01-10 08:00:00', IF(RAND() < 0.5, 'true', 'false')),
  ('Vieux B', '2025-12-20 08:00:00', IF(RAND() < 0.5, 'true', 'false')),
  ('Vieux C', '2025-10-02 08:00:00', IF(RAND() < 0.5, 'true', 'false')),
  ('Vieux D', '2025-08-15 08:00:00', IF(RAND() < 0.5, 'true', 'false'));
-- ou simplement écrire 'true' / 'false' à la main

SELECT * FROM donnees WHERE conserver = 'true';        -- noter lesquelles AVANT le passage du script
```

Dans le script, seule la requête change :

```php
$sql = "DELETE FROM donnees
        WHERE date_creation < DATE_ADD(now(), INTERVAL -6 MONTH)
          AND (conserver <> 'true' OR conserver IS NULL)";
```

> Pourquoi `OR conserver IS NULL` : les lignes créées **avant** l'`ALTER TABLE` ont `conserver = NULL`,
> et en SQL `NULL <> 'true'` n'est jamais vrai → elles échapperaient à la purge. Si toutes tes lignes
> ont une valeur, `AND conserver = 'false'` suffit.

Réactiver la ligne de crontab (retirer le `#`), attendre 5 min, puis
`SELECT * FROM donnees;` → les lignes `true` sont toujours là, les vieilles `false` ont disparu.

### Exercice 7 — Deux cadences selon la parité de l'heure

```bash
cp /scriptExerciceCours6/heureActuelle.php /scriptExerciceCours6/heureActuelleExercice7.php
vi /scriptExerciceCours6/heureActuelleExercice7.php
```

```php
<?php
echo date("Y-m-d H:i:s") . " (Exercice 7)\n";
?>
```

**Réponse 1 — deux lignes de crontab** (la plus lisible)

```bash
*/5 1-23/2 * * * php /scriptExerciceCours6/heureActuelleExercice7.php >> /scriptExerciceCours6/exercice7.log
*/3 0-22/2 * * * php /scriptExerciceCours6/heureActuelleExercice7.php >> /scriptExerciceCours6/exercice7.log
```

| Champ | Sens |
|---|---|
| `1-23/2` (heures) | de 1 à 23, une sur deux → 1, 3, 5 … 23 = heures **impaires** |
| `0-22/2` (heures) | 0, 2, 4 … 22 = heures **paires** (`*/2` donne la même chose) |
| `*/5` / `*/3` (minutes) | toutes les 5 min / toutes les 3 min |

**Réponse 2 — 📘 la méthode du cours (diapos 43-44)** : exécuter **plus souvent** et filtrer **dans le script**.

```bash
* * * * * php /scriptExerciceCours6/heureActuelleExercice7.php >> /scriptExerciceCours6/exercice7.log
```

```php
<?php
$heure  = (int) date("G");   // heure 0-23 sans zéro
$minute = (int) date("i");
if ($heure % 2 == 1 && $minute % 5 != 0) { exit; }   // heure impaire : seulement aux 5 min
if ($heure % 2 == 0 && $minute % 3 != 0) { exit; }   // heure paire   : seulement aux 3 min
echo date("Y-m-d H:i:s") . " (Exercice 7)\n";
?>
```

Vérifier : `tail -f /scriptExerciceCours6/exercice7.log`.

---

<a id="a3"></a>

## Séance 3 — Sécurité des communications serveur

### Exercice 1 — Paire de clés SSH + droplet qui l'exige (Cours 3, diapos 11-43)

**A. Générer la clé sur ton poste Windows**

1. Créer un dossier, p. ex. `C:\Utilisateur\0758510\CleSSH`.
2. Dans l'Explorateur, taper `cmd` dans la barre d'adresse → `Entrée` : l'invite s'ouvre **dans ce dossier**.
3. Lancer la commande, donner le nom `maCle`, puis la passphrase **deux fois** (rien ne s'affiche pendant la frappe, c'est normal).

```bat
C:\Utilisateur\0758510\CleSSH> ssh-keygen
Enter file in which to save the key (C:\Users\0758510/.ssh/id_ed25519): maCle
Enter passphrase (empty for no passphrase):        ← taper la phrase secrète
Enter same passphrase again:                       ← la retaper
```

Résultat : deux fichiers dans le dossier — `maCle` (**privée**, ne la donne jamais) et `maCle.pub` (**publique**, va sur le serveur).

> 💡 **Forme explicite, sans questions** : `ssh-keygen -t ed25519 -C "0758510@poste-cegep" -f maCle`
>
> | Option | Rôle | Valeur |
> |---|---|---|
> | `-t` | *type* : l'algorithme de la clé | `ed25519` (moderne) ou `rsa` |
> | `-b` | *bits* : taille — **RSA seulement** | ex. `-b 4096` ; inutile avec ed25519 |
> | `-C` | *commentaire* collé à la fin de la clé publique (sert à reconnaître la clé) | guillemets **obligatoires s'il y a une espace**, conseillés toujours |
> | `-f` | *file* : nom du fichier de sortie (évite la question) | `maCle` → crée `maCle` + `maCle.pub` |
>
> ⚠️ Le cours obtenait une clé **RSA 3072** (diapo 18) ; depuis OpenSSH 9.5 (2023) la même commande
> produit une **Ed25519**. Les deux fonctionnent.

**B. Convertir pour PuTTY** (PuTTY ne lit que le format `.ppk`)

4. ⚠️ Le cours fait renommer `maCle` en `maCle.ppk` (diapo 20) : ce renommage ne convertit rien, il sert seulement à voir le fichier dans la boîte *Load*. (Sinon : filtre « All Files (\*.\*) ».)
5. Ouvrir **PuTTYgen** → *Load* → choisir la clé → entrer la passphrase → *OK*.
6. *Save private key* → enregistrer sous **`clePutty.ppk`**.

**C. Créer le droplet avec la clé**

7. DigitalOcean → *Create* → *Droplets* → *Authentication* : **SSH Key** (et non *Password*) → *New SSH Key*.
8. Ouvrir `maCle.pub` avec un éditeur (Bloc-notes, Notepad++) → copier **toute la ligne** (`ssh-ed25519 AAAA… commentaire`) → coller → nommer la clé → *Add SSH Key*.
9. Terminer la création, noter l'IP.

**D. Se connecter**

10. **PuTTY** → menu de gauche *Connection → SSH → Auth* (versions récentes : *Auth → Credentials*) → *Browse* → `clePutty.ppk`.
11. *Session* → *Host Name* : `203.0.113.10`, *Port* : `22`, *SSH* → *Open*.
12. Accepter la clé du serveur (mise en cache) → `login as: root` → taper la **passphrase de la clé**.

> ⚠️ Piège classique : ce qu'on tape à l'étape 12 **n'est pas le mot de passe de root**, c'est la
> passphrase qui déchiffre ta clé privée **sur ton poste**. Elle n'est jamais envoyée au serveur.

**WinSCP** (diapos 38-42) : *New Site* → IP + `root` → *Advanced…* → *SSH → Authentication* →
*Private key file* : `clePutty.ppk` → *OK* → *Login* → passphrase.

> 💡 **Même résultat sans PuTTY**, avec le client OpenSSH de Windows :
> `ssh -i C:\Utilisateur\0758510\CleSSH\maCle root@203.0.113.10` (`-i` = *identity*, le fichier de clé
> **privée** au format OpenSSH, pas le `.ppk`).

### Exercice 2 — Installer Apache et vérifier

```bash
apt-get install apache2          # 📘 forme de l'énoncé
# 💡 sudo apt update && sudo apt install apache2
systemctl status apache2         # « active (running) »
```

Navigateur : `http://203.0.113.10` → page **« Apache2 Ubuntu Default Page — It works! »**.

### Exercice 3 — Activer UFW en gardant HTTP et SSH

```bash
ufw status              # Status: inactive   (⚠️ la diapo 47 écrit « uwf » : coquille)
ufw allow 80            # ou : ufw allow http
ufw allow 22            # ou : ufw allow ssh      ← AVANT enable, sinon tu t'enfermes dehors
ufw enable              # « Command may disrupt existing ssh connections. Proceed (y|n)? » → y
ufw status              # Status: active + la liste des règles
```

Résultat affiché (4 règles : chaque règle est créée en IPv4 **et** en IPv6) :

```text
To                         Action      From
--                         ------      ----
80                         ALLOW       Anywhere
22                         ALLOW       Anywhere
80 (v6)                    ALLOW       Anywhere (v6)
22 (v6)                    ALLOW       Anywhere (v6)
```

Vérifier : la page Apache s'affiche toujours **et** une nouvelle session PuTTY s'ouvre.

### Exercice 4 — Supprimer la règle du port 80

**📘 Par numéro** (diapo 55) :

```bash
ufw status numbered
#      To                         Action      From
# [ 1] 80                         ALLOW IN    Anywhere
# [ 2] 22                         ALLOW IN    Anywhere
# [ 3] 80 (v6)                    ALLOW IN    Anywhere (v6)
# [ 4] 22 (v6)                    ALLOW IN    Anywhere (v6)
ufw delete 3            # supprime la règle IPv6 du port 80   (confirmer : y)
ufw delete 1            # supprime la règle IPv4 du port 80
ufw status numbered     # il ne reste que 22
```

> Les numéros **se décalent** après chaque suppression : supprime le **plus grand numéro d'abord**,
> ou relis `ufw status numbered` entre deux.
> 💡 **En une commande** : `ufw delete allow 80` retire d'un coup la règle IPv4 **et** IPv6
> (si tu avais écrit `ufw allow http`, c'est `ufw delete allow http`).

Vérifier : `http://203.0.113.10` ne répond plus (le navigateur tourne jusqu'à expiration). Apache,
lui, tourne toujours (`systemctl status apache2`) : c'est le pare-feu qui bloque, pas le service.

### Projet de session — remue-méninges

Pas de corrigé : idées à préparer — rôle de l'application et utilisateurs fictifs, fonctionnalités,
inventaire des données et première conception des tables, maquettes des interfaces.

---

<a id="a2"></a>

## Séance 2 — Environnement infonuagique Linux

### Exercice 1 — Déployer un Ubuntu sur DigitalOcean et s'y connecter avec PuTTY

1. DigitalOcean → *Create* → *Droplets*.
2. Image : 📘 *Marketplace → LAMP on 18.04* (⚠️ Ubuntu 18.04 n'a plus de correctifs depuis mai 2023 : en vrai, prendre la LTS la plus récente).
3. Plan : le moins cher (*Regular Intel with SSD*) · Région : **Toronto** · *Authentication* : 📘 *One-time password* (séance 3 : *SSH Key*) · *hostname* au choix → *Create*.
4. Le courriel reçu donne : utilisateur (`root`), mot de passe, IP.
5. **PuTTY** : *Host Name* = IP, *Port* = `22`, *Connection type* = `SSH` → *Open* → accepter la clé du serveur.
6. `login as: root` → coller le mot de passe du courriel (**clic droit = coller** dans PuTTY) → le serveur **exige un nouveau mot de passe** à la 1re connexion.

### Exercices 2 à 13 — la séquence complète

Tu travailles en `root`, donc ton répertoire de départ est `/root`.

```bash
# 2 · Afficher le répertoire courant
pwd                                   # → /root

# 3 · Créer le répertoire exercice3
mkdir exercice3
ls                                    # vérifier

# 4 · Créer exercice4.txt avec vi (2 lignes)
vi exercice4.txt
#   i                                   ← passe en mode Insertion
#   Démonstration de l'utilisation de VI   (Entrée)
#   Voici une seconde ligne
#   Échap                               ← retour au mode Commande
#   :wq   (Entrée)                      ← sauvegarder et quitter

# 5 · Afficher le contenu
cat exercice4.txt

# 6 · Créer exercice5.txt (nom volontairement faux) avec vi
vi exercice5.txt
#   i → « Voici le texte de l'exercice 6 » → Entrée → « Ce dernier contient également une seconde ligne »
#   Échap → :wq

# 7 · Renommer exercice5.txt en exercice6.txt
mv exercice5.txt exercice6.txt

# 8 · Déplacer exercice4.txt dans exercice3
mv exercice4.txt exercice3/           # la barre finale = « c'est un répertoire »

# 9 · Entrer dans exercice3
cd exercice3                          # chemin relatif (ou absolu : cd /root/exercice3)

# 10 · Ajouter une 3e ligne à exercice4.txt
vi exercice4.txt
#   G   ← aller à la dernière ligne      o   ← ouvrir une ligne dessous + mode Insertion
#   Voici une troisième ligne
#   Échap → :wq
cat exercice4.txt                     # 3 lignes

# 11 · Revenir au répertoire parent
cd ..                                 # → /root

# 12 · Supprimer le répertoire exercice3 (non vide)
rm -r exercice3                       # -r = récursif ; sans lui : « Is a directory », refusé

# 13 · Supprimer exercice6.txt
rm exercice6.txt
ls                                    # plus rien des exercices
```

> ⚠️ L'énoncé écrit « Exercice3 » avec une majuscule aux ex. 9 et 12. **Linux distingue la casse** :
> reprends exactement le nom créé à l'ex. 3 (`exercice3`). Astuce du cours : **Tab** complète les noms.
>
> 💡 Ex. 10 sans `G`/`o` : ouvrir, descendre avec les flèches jusqu'à la fin de la 2e ligne, taper
> `A` (ou `i` puis `Fin`), `Entrée`, écrire la ligne, `Échap`, `:wq`.

---

<a id="a1"></a>

## Séance 1 — Introduction et poste de travail

> La feuille va 1, 2, **4** : il n'y a pas d'exercice 3 (numérotation de l'enseignant).

### Exercice 1 — Installer les applications du cours

| Outil | À quoi il sert | Vérification |
|---|---|---|
| **WAMP** (ou XAMPP) | serveur web local Apache + PHP + MySQL sous Windows | lancer WAMP → icône **verte** → `http://localhost` affiche la page d'accueil de WAMP ; fichiers dans `C:\wamp\www` |
| Éditeur de texte | écrire le code (Notepad++, VS Code, PHPStorm) | — |
| **PuTTY** | terminal distant **SSH** vers le serveur Linux | ouvrir, fenêtre de configuration |
| **WinSCP** | transfert de fichiers poste ↔ serveur (glisser-déposer) | ouvrir, fenêtre *Login* |

> Sur le poste du Cégep, WAMP est déjà installé (hypothèse : `C:\wamp`).

### Exercice 2 — Compte DigitalOcean fonctionnel

Créer le compte sur digitalocean.com, ajouter un moyen de paiement. Budget prévu par le cours :
**5 $ maximum** pour la plateforme infonuagique (Cours 1, diapo 13).

### Exercice 4 — Acheter un nom de domaine (GoDaddy, diapos 64-77)

1. godaddy.com → barre de recherche → chercher un nom (`.ca`, `.com`, `.org` — **pas** d'extension limitée à un pays comme `.ru` ou `.fr`).
2. Ajouter au panier → *Continue to Cart*.
3. **Désactiver tous les produits complémentaires** proposés.
4. Formulaire d'inscription → *Continue*.
5. Durée : **1 an** (facture réduite) → payer. Budget : **~15 $** (diapo 13).
6. Autre registraire permis s'il permet au minimum de **modifier l'adresse IP de destination (enregistrement `@`)** et **les serveurs de noms (*name servers*)** (diapo 66).

> ⚠️ La diapo 75 conseille l'extension **Honey** pour des coupons : à éviter (réécriture de cookies
> d'affiliation documentée fin 2024). Une extension de navigateur lit toutes tes pages.

---

<a id="d"></a>

# D · Pseudo-examen

> Même modèle que les exercices : surtout des **commandes à écrire**, plus quelques questions de
> théorie. Clique sur « Réponse » pour voir la solution. Essaie d'abord sans regarder.

## Partie 1 — Théorie (cours 1 et 2)

**Q1.** Associe chaque situation au principe **CIA** qu'elle compromet : (a) un site est noyé de
fausses requêtes et ne répond plus ; (b) un employé consulte des dossiers médicaux sans y être
autorisé ; (c) un membre d'un forum modifie le message d'un autre sans être administrateur ;
(d) un pirate envoie volontairement de faux mots de passe et tous les comptes se verrouillent après
3 essais ; (e) un pirate s'ajoute des droits d'administrateur.

<details><summary>Réponse</summary>

(a) **Disponibilité** (DDoS) · (b) **Confidentialité** · (c) **Intégrité** · (d) **Disponibilité** —
les utilisateurs légitimes ne peuvent plus se connecter (exemple exact de la diapo 29) ·
(e) **Intégrité** — modification de données qu'il ne devrait pas pouvoir modifier (diapo 28).
Règle : *qui peut lire* → C ; *qui peut modifier* → I ; *est-ce que ça marche quand il faut* → D.
</details>

**Q2.** Qu'est-ce qu'un DDoS et qu'est-ce qu'un *botnet* ?

<details><summary>Réponse</summary>

*Distributed Denial of Service* : un serveur est inondé de requêtes pour qu'il ne puisse plus
traiter les requêtes légitimes. Généralement **pas de dommage permanent**, mais le système est
inutilisable. Il est mené par un **botnet** : un réseau d'ordinateurs infectés contrôlés à distance
par le pirate (qui peut se louer au marché noir). Principe touché : disponibilité.
</details>

**Q3.** D'où peut venir l'information qui cause une injection SQL ? Donne trois sources.

<details><summary>Réponse</summary>

Un **champ de formulaire**, un **paramètre dans l'URL**, la **valeur d'un cookie** (diapo 39) — toute
donnée contrôlée par l'utilisateur ajoutée à une requête SQL **sans avoir été traitée correctement**.
Conséquences : lire, modifier ou supprimer des données, voire la base entière.
</details>

**Q4.** Qu'est-ce que le XSS, et quels sites y sont les plus vulnérables ?

<details><summary>Réponse</summary>

L'attaquant injecte du **JavaScript** dans un site ; ce code s'exécute dans le **navigateur des autres
visiteurs** (vol d'informations, lien modifié vers un faux site, actions faites au nom de
l'utilisateur via le DOM). Les plus vulnérables : ceux où les **utilisateurs contribuent au contenu**
— médias sociaux, forums, commerces avec évaluations.
</details>

**Q5.** Quels sont les deux objectifs d'une attaque *Man-in-the-middle* ?

<details><summary>Réponse</summary>

**Espionner** la communication entre les deux parties, ou **l'altérer** (le pirate s'insère entre
l'utilisateur et le serveur et fait suivre les messages après les avoir lus/modifiés).
⚠️ La diapo 46 affirme que chiffrer ne protège pas ; réponse du cours à donner telle quelle. En
pratique, un chiffrement **authentifié par certificat** (HTTPS vérifié) est justement la parade.
</details>

**Q6.** Qu'est-ce que l'**entropie** d'un mot de passe ? Quels facteurs l'influencent ? Nomme deux
autres techniques que la force brute pour trouver un mot de passe.

<details><summary>Réponse</summary>

Le **nombre de combinaisons à tester**. Facteurs : les **types de caractères** exigés (minuscule,
majuscule, chiffre, spécial) et la **longueur minimale**. Autres techniques : **attaque par
dictionnaire**, **tables arc-en-ciel** (*rainbow tables*).
</details>

**Q7.** Comment se protéger des librairies de tiers parti ? Pourquoi l'hameçonnage est-il difficile à
prévenir ? Que fait un rançongiciel ?

<details><summary>Réponse</summary>

Librairies : n'utiliser que celles d'**organismes de confiance** ; utiliser les **CDN** des
entreprises qui les offrent. Hameçonnage : il exploite **l'erreur humaine** → programmes de
**sensibilisation**. Rançongiciel : **chiffre** les données (un dossier ou le disque entier), rançon
pour la clé ; danger principal : **vitesse de propagation** sur le réseau.
</details>

**Q8.** Pourquoi faut-il un nom de domaine dans ce cours ? Quelles deux actions minimales le
registraire doit-il permettre ?

<details><summary>Réponse</summary>

Pour **déployer** les applications, configurer des **certificats SSL** et activer certaines
**protections** ; il remplace l'IP par un nom facile à retenir. Le registraire doit permettre de
modifier **l'adresse IP de destination (`@`)** et **les *name servers***.
</details>

**Q9.** Classe : un droplet DigitalOcean, Heroku, Office 365. En IaaS, où commence la responsabilité
du développeur ?

<details><summary>Réponse</summary>

Droplet = **IaaS** · Heroku = **PaaS** · Office 365 = **SaaS**. En IaaS, la responsabilité commence
au **système d'exploitation** (et tout ce qui est dessus : runtime, base de données, pare-feu).
</details>

**Q10.** Donne deux avantages et un désavantage de l'infonuagique par rapport à l'approche
traditionnelle (*on premise*).

<details><summary>Réponse</summary>

Avantages (diapo 11) : réduction et **prévisibilité** des coûts, développement accéléré, mise à
l'échelle plus facile, sécurité généralement supérieure. Désavantages : flexibilité des technologies
(rare), **données sensibles sur une infrastructure externe**.
</details>

## Partie 2 — Linux (cours 2)

**Q11.** Arborescence : `/var` contient `www` (qui contient `html`) et `log` (qui contient `journal`).
Tu es dans `/var/www`. Écris : (a) aller dans `html` en relatif ; (b) aller dans `html` en absolu ;
(c) aller dans `journal` sans chemin absolu ; (d) aller dans `journal` en absolu.

<details><summary>Réponse</summary>

(a) `cd html` · (b) `cd /var/www/html` · (c) `cd ../log/journal` · (d) `cd /var/log/journal`.
Un chemin qui commence par `/` part de la **racine** ; sinon il part du **répertoire courant** ;
`..` = le parent.
</details>

**Q12.** Tu as `demo.txt` et un répertoire `contenu`. Écris : (A) renommer `demo.txt` en
`nouveauNom.txt` ; (B) le déplacer dans `contenu` ; (C) le déplacer dans `contenu` **et** le renommer
`nouveauNom.txt`.

<details><summary>Réponse</summary>

(A) `mv demo.txt nouveauNom.txt` · (B) `mv demo.txt contenu/` · (C) `mv demo.txt contenu/nouveauNom.txt`.
Syntaxe : `mv <chemin de départ> <chemin d'arrivée>` — renommer = déplacer sur place.
</details>

**Q13.** Écris la suite de commandes : créer le répertoire `projet`, y créer avec `vi` un fichier
`notes.txt` contenant « Bonjour », afficher son contenu, puis supprimer tout le répertoire.

<details><summary>Réponse</summary>

```bash
mkdir projet
cd projet
vi notes.txt        # i → Bonjour → Échap → :wq
cat notes.txt
cd ..
rm -r projet
```
</details>

**Q14.** Dans `vi` : comment passer en écriture ? revenir au mode commande ? sauvegarder sans
quitter ? sauvegarder et quitter ? quitter **sans** sauvegarder ?

<details><summary>Réponse</summary>

`i` · `Échap` · `:w` · `:wq` · `:q!` (puis `Entrée` pour les commandes `:`). `vi` démarre en mode
**Commande**. Coincé ? `Échap`, `:q!`, `Entrée`.
</details>

**Q15.** Que fait `rm monDossier` si `monDossier` est un répertoire ? Que fait `ls -l` de plus que
`ls` ? Que fait `clear` ?

<details><summary>Réponse</summary>

`rm` sans `-r` **refuse** de supprimer un répertoire → `rm -r monDossier`. `ls -l` affiche le
**détail** (permissions, propriétaire, groupe, taille, date). `clear` efface l'écran du terminal.
</details>

## Partie 3 — SSH et UFW (cours 3)

**Q16.** De quoi se compose une clé SSH ? Où vit chaque partie ? Lequel des deux fichiers colles-tu
dans DigitalOcean ? Pourquoi une clé est-elle plus sûre qu'un mot de passe ?

<details><summary>Réponse</summary>

Une clé **publique** (conservée **sur le serveur**, `maCle.pub` → c'est elle qu'on colle) et une clé
**privée** (protégée **par l'administrateur**, sur son poste, `maCle`). Le mot de passe peut être
trouvé par **force brute** ; la clé ajoute une contrainte beaucoup plus forte. PuTTY a besoin de la
privée au format `.ppk` (PuTTYgen → *Save private key*).
</details>

**Q17.** Écris, dans l'ordre, les commandes pour activer le pare-feu en laissant passer le web et
SSH, puis afficher les règles.

<details><summary>Réponse</summary>

```bash
ufw allow 80        # ou ufw allow http
ufw allow ssh       # ou ufw allow 22 — AVANT d'activer
ufw enable
ufw status
```
Si on active **avant** d'autoriser SSH, on peut perdre l'accès au serveur (diapo 49).
</details>

**Q18.** Que fait `ufw reset` ? Que dois-tu faire tout de suite après ?

<details><summary>Réponse</summary>

Il **supprime toutes les règles** et **désactive** le pare-feu (diapo 58). Ensuite : réautoriser SSH
(`ufw allow ssh`) **puis** réactiver (`ufw enable`).
</details>

**Q19.** `ufw status numbered` affiche `[1] 80`, `[2] 22/tcp`, `[3] 80 (v6)`, `[4] 22/tcp (v6)`.
(a) Supprime seulement la règle IPv6 du port 80. (b) Supprime toutes les règles du port 80.

<details><summary>Réponse</summary>

(a) `ufw delete 3` · (b) `ufw delete 3` puis `ufw delete 1` (le plus grand numéro d'abord, car les
numéros se décalent) — ou `ufw delete allow 80`, qui retire IPv4 et IPv6 d'un coup.
</details>

**Q20.** Bloque le port 80, puis rouvre-le. Quelle règle `ufw allow http` crée-t-elle réellement ?

<details><summary>Réponse</summary>

`ufw deny 80` puis `ufw allow 80`. `ufw allow http` crée une règle **TCP sur le port 80** : UFW ne
filtre pas vraiment le protocole HTTP, il traduit le nom en port — « ça revient au même » (diapo 71).
Syntaxe générale : `ufw <allow|deny> <port ou protocole>`.
</details>

**Q21.** Quel est le lien entre UFW et `iptables` ? Comment installer UFW s'il manque ?

<details><summary>Réponse</summary>

`iptables` est le pare-feu intégré de Linux, trop complexe à utiliser directement ; **UFW**
(*Uncomplicated Firewall*) est l'outil simple qui l'administre, « norme de l'industrie ».
Installation : `apt-get install ufw`.
</details>

## Partie 4 — Crontab et scripts (cours 4)

**Q22.** Écris l'expression crontab : (a) tous les jours à 2 h 30 ; (b) toutes les 10 minutes du
lundi au vendredi ; (c) le 1er de chaque mois à 6 h ; (d) chaque dimanche à 23 h ; (e) toutes les
2 heures, à l'heure pile ; (f) le 1er janvier à minuit et 5 minutes ; (g) tous les samedis à 3 h.

<details><summary>Réponse</summary>

(a) `30 2 * * *` · (b) `*/10 * * * 1-5` · (c) `0 6 1 * *` · (d) `0 23 * * 0` (ou `7`) ·
(e) `0 */2 * * *` · (f) `5 0 1 1 *` (cas n° 6 du cours) · (g) `0 3 * * 6`.
</details>

**Q23.** Que font : (a) `0 0,6,12,18 * * *` ; (b) `0 0 * * 1,2` ; (c) `0 0 1 1 *` ;
(d) `15 14 1 * *` ; (e) `*/20 9-17 * * 1-5` ; (f) `5 * * * *`.

<details><summary>Réponse</summary>

(a) à minuit, 6 h, midi et 18 h, tous les jours · (b) lundi et mardi à minuit (5e champ = jours de
la **semaine**, pas du mois) · (c) une fois par an, le 1er janvier à minuit · (d) le 1er de chaque
mois à 14 h 15 · (e) toutes les 20 min de 9 h à 17 h 40, en semaine · (f) à chaque heure et 5 minutes
(0 h 05, 1 h 05…) — exemple de la diapo 21.
</details>

**Q24.** Trouve l'erreur : (a) « tous les samedis à 3 h » écrit `0 3 * * * 6` ; (b) « à minuit trente »
écrit `0 30 * * *` ; (c) « toutes les 15 min sans la minute 45 » écrit `*/15 * * * *`.

<details><summary>Réponse</summary>

(a) **Six** champs au lieu de cinq — cron prendrait `6` pour la commande. Correct : `0 3 * * 6`
(⚠️ la coquille est dans la diapo 31 du cours). (b) Minute et heure inversées : `30 0 * * *`.
(c) `*/15` produit 0, 15, 30 **et 45** → `0,15,30 * * * *`.
</details>

**Q25.** Explique chaque partie : `*/1 * * * * php /crontabDemo/surveillerApache.php >> /crontabDemo/surveillerApache.log`

<details><summary>Réponse</summary>

`*/1 * * * *` = chaque minute (identique à `* * * * *`) · `php /crontabDemo/surveillerApache.php` =
exécute le script PHP (syntaxe `php <chemin du fichier>`) · `>>` = **ajoute** la sortie du script à la
fin de… · `/crontabDemo/surveillerApache.log` = le fichier journal. Résultat : chaque redémarrage
d'Apache laisse une ligne horodatée dans le journal.
</details>

**Q26.** Différence entre `>` et `>>` ? Quelle commande surveille un fichier journal en temps réel ?
Comment ouvrir sa crontab ? Comment la lister ?

<details><summary>Réponse</summary>

`>` **écrase** le fichier à chaque exécution, `>>` **ajoute** à la fin. `tail -f <fichier>`
(Ctrl+C pour arrêter). `crontab -e` (éditer) ; `crontab -l` (lister).
</details>

**Q27.** Quelle est la plus petite fréquence possible avec crontab, et pourquoi ?

<details><summary>Réponse</summary>

**Une minute** : cron vérifie la table **une fois par minute** et exécute toutes les commandes
éligibles (diapo 17) — impossible de descendre sous la minute.
</details>

**Q28.** On veut un script toutes les 15 min en semaine et toutes les 60 min la fin de semaine.
Quelle est la solution du cours ?

<details><summary>Réponse</summary>

Exécuter le script **plus souvent** (`*/15 * * * *`) et ajouter une **validation dans le script** :
si (jour = samedi ou dimanche) et (minute ≠ 0) → quitter (`exit`) (diapos 43-44).
Autre réponse valable : deux lignes de crontab (`*/15 * * * 1-5 …` et `0 * * * 0,6 …`).
</details>

**Q29.** Écris un script PHP `surveillerMariaDB.php` qui relance MariaDB s'il est arrêté et
journalise un message, puis la ligne de crontab qui l'exécute chaque minute.

<details><summary>Réponse</summary>

```php
<?php
$resultat = shell_exec('systemctl is-active mariadb');
if ($resultat == "inactive\n") {              // 💡 ou : if (trim($resultat) != "active")
    shell_exec('systemctl start mariadb');
    echo "[" . date("Y-m-d H:i:s") . "] ";
    echo "Redemarrage de MariaDB\n";
}
?>
```
```bash
* * * * * php /crontabDemo/surveillerMariaDB.php >> /crontabDemo/surveillerMariaDB.log
```
Même patron que le script Apache : on remplace seulement le nom du service.
</details>

**Q30.** Écris la requête qui supprime de la table `journal` les lignes dont `date_ajout` date de
plus de 30 jours. Quelle requête exécuter **avant** ? À quelle fréquence planifier une purge ?

<details><summary>Réponse</summary>

```sql
SELECT * FROM journal WHERE date_ajout < DATE_ADD(now(), INTERVAL -30 DAY);   -- voir d'abord
DELETE FROM journal WHERE date_ajout < DATE_ADD(now(), INTERVAL -30 DAY);
```
Unités possibles : `DAY`, `MONTH`, `YEAR`. Une purge chaque minute est inutile : **une fois par
jour** suffit (diapo 56), p. ex. `0 3 * * *`.
</details>

**Q31.** Comment désactiver temporairement une tâche cron sans la supprimer ? Comment exécuter un
script PHP à la main ?

<details><summary>Réponse</summary>

La mettre en **commentaire** avec `#` dans `crontab -e` : `#* * * * * php /script/monScript.php`.
À la main : `php /chemin/du/script.php`.
</details>

**Q32.** Nomme quatre rôles d'un script de tâche cédulée.

<details><summary>Réponse</summary>

(diapo 9) Surveiller le nombre de tentatives de connexion (force brute) · nettoyer de vieilles données
(fichiers ou BD) · vérifier les activités des utilisateurs · surveiller l'état du système (rapports)
· vérifier périodiquement un service et le **redémarrer** s'il a planté. Langages possibles : PHP,
Python, Bash, Perl…
</details>

---

<a id="b"></a>

# B · Résumé des cours 1 à 5

Chaque commande : **forme générique** (paramètres expliqués) → **exemple concret** → 💡 variante.

<a id="b1"></a>

## Cours 1 — Introduction à la sécurité des applications web

📖 [Leçon 01](https://salmon-sky-0a730780f.7.azurestaticapps.net/cours/securite-web/fondamentaux/) · diapos 14-79

**Pourquoi la sécurité** (diapos 19-24) — de plus en plus d'informations sensibles sur le web (banque,
impôts, dossiers médicaux…). Motivations des pirates : argent, vol d'identité, réputation, défi,
politique, extorsion, rançon. Impacts : réputation (vol chez Desjardins), stress des victimes,
pertes financières (Sony). **Même un site banal** (forum) sert de tremplin (XSS, spam, analyse de
mots de passe). La sécurité est la responsabilité de **chaque développeur**.

**CIA** (diapos 25-30)

| Principe | Question | Exemple d'attaque |
|---|---|---|
| **C**onfidentialité | seules les personnes prévues peuvent-elles **lire** ? | accès au compte bancaire d'autrui |
| **I**ntégrité | seules les personnes autorisées peuvent-elles **modifier** ? | s'ajouter des droits admin, injecter du code |
| **D**isponibilité | le système est-il **utilisable** quand prévu ? | DDoS, verrouillage massif des comptes |

+ protéger aussi contre les **erreurs accidentelles** (lecture seule quand il faut).

**Les 8 attaques courantes** (diapos 31-60, source : **OWASP**)

| Attaque | En une phrase | Parade citée |
|---|---|---|
| DDoS | inonder un serveur de requêtes via un **botnet** | — |
| Injection SQL | l'utilisateur fait exécuter **son** SQL (formulaire, URL, cookie) | traiter les entrées (vu plus tard) |
| XSS | JavaScript injecté, exécuté chez les **autres visiteurs** | (vu plus tard) |
| Man-in-the-middle | s'insérer dans la communication pour **espionner / altérer** | — |
| Brute force | essayer toutes les combinaisons ; **entropie** = nb de combinaisons | politique de mot de passe (cours 5) |
| Librairies tierces | code malicieux caché dans une librairie gratuite | organismes de confiance, CDN |
| Hameçonnage | faux message → faux site qui vole les identifiants | sensibilisation |
| Rançongiciel | chiffre les données, rançon pour la clé | copies de sauvegarde |

**Poste de travail** (diapo 63) : XAMPP ou WAMP · éditeur · PuTTY + WinSCP · compte DigitalOcean ·
domaine GoDaddy. Frais : plateforme **5 $ max**, domaine **~15 $** (diapo 13).

<a id="b2"></a>

## Cours 2 — Environnement infonuagique Linux

📖 [Leçon 02](https://salmon-sky-0a730780f.7.azurestaticapps.net/cours/securite-web/environnement-linux/) · diapos 4-76

**Infrastructure** : serveurs, équipement réseau, pare-feu… Approche **traditionnelle (*on premise*)**
vs **infonuagique (*cloud*)** = louer l'infrastructure d'un fournisseur qui l'entretient, coût
mensuel divisé à l'heure.

| Service | Tu gères | Exemple |
|---|---|---|
| **IaaS** | à partir du **système d'exploitation** | DigitalOcean, AWS EC2 — **celui du cours** |
| **PaaS** | ton code et ta BD, pas l'OS | Heroku |
| **SaaS** | rien : application clé en main | Office 365 |

**Linux** : créé par **Linus Torvalds en 1991**, *open source* ; **distributions** : Ubuntu (celle du
cours), Fedora, CentOS, Red Hat.

### Déployer et se connecter

Voir [séance 2, ex. 1](#a2) (droplet → courriel → PuTTY port 22 → changer le mot de passe root).
Astuces PuTTY (diapo 75) : **Tab** complète · **flèches haut/bas** = historique · **clic droit** = coller.

### Les commandes de base (diapos 34-74)

| Générique | Paramètres | Concret | 💡 |
|---|---|---|---|
| `pwd` | — | `pwd` → `/root` | — |
| `clear` | — | `clear` | `Ctrl+L` |
| `cd <chemin>` | chemin **relatif** (depuis ici) ou **absolu** (commence par `/`) ; `..` = parent | `cd /var/www/html` · `cd html` · `cd ..` | `cd` seul = retour à `~` |
| `ls [-l]` | `-l` = détail (permissions, proprio, groupe, taille, date) | `ls -l` | `ls -la` montre aussi les fichiers cachés |
| `cat <fichier>` | affiche tout le contenu | `cat index.html` | `tail -f` pour un journal |
| `mkdir <répertoire>` | crée un répertoire | `mkdir exercice3` | `mkdir -p a/b/c` crée toute la chaîne |
| `rm [-r] <cible>` | `-r` (récursif) **obligatoire** pour un répertoire | `rm fichierDemo.txt` · `rm -r contenu` | pas de corbeille : `ls` avant |
| `mv <départ> <arrivée>` | déplace **et/ou** renomme | `mv demo.txt contenu/nouveauNom.txt` | barre finale `contenu/` = « c'est un répertoire » |
| `vi <fichier>` | ouvre (ou crée à la sauvegarde) | `vi exercice4.txt` | `nano` : pas de modes, `Ctrl+O` enregistre, `Ctrl+X` quitte |

**`vi`** : démarre en mode **Commande** · `i` → mode **Insertion** · `Échap` → retour Commande ·
`:w` sauvegarder · `:wq` sauvegarder et quitter · `:q!` quitter sans sauvegarder.
Les `~` à gauche = lignes qui n'existent pas encore (`Entrée` pour les créer).

<a id="b3"></a>

## Cours 3 — Sécurité des communications serveur

📖 [Leçon 03](https://salmon-sky-0a730780f.7.azurestaticapps.net/cours/securite-web/communication-serveur/) · diapos 7-72

### Authentification par clé SSH (diapos 7-43)

Pourquoi : le mot de passe peut être trouvé par **force brute** ; la clé est beaucoup plus sûre.
Clé **publique** sur le serveur, clé **privée** gardée par toi (ne pas la perdre).

| Étape | Générique | Concret |
|---|---|---|
| Générer | `ssh-keygen [-t <algo>] [-b <bits RSA>] [-C "<commentaire>"] [-f <fichier>]` | `ssh-keygen` puis nom `maCle` (📘) · 💡 `ssh-keygen -t ed25519 -C "0758510@poste-cegep" -f maCle` |
| Convertir | PuTTYgen → *Load* → passphrase → *Save private key* | `clePutty.ppk` |
| Déposer | DigitalOcean → *Authentication : SSH Key* → *New SSH Key* → coller le **.pub** | contenu de `maCle.pub` |
| Connecter (PuTTY) | *Connection → SSH → Auth* → *Browse* `.ppk` → *Session* : IP → *Open* → `root` → passphrase | `203.0.113.10`, port 22 |
| Connecter (WinSCP) | *Advanced → SSH → Authentication* → clé `.ppk` → *Login* | idem |
| 💡 Connecter (OpenSSH) | `ssh -i <clé privée> <utilisateur>@<IP>` | `ssh -i C:\Utilisateur\0758510\CleSSH\maCle root@203.0.113.10` |

Détail pas à pas : [séance 3, ex. 1](#a3).

### Pare-feu UFW (diapos 44-72)

Linux filtre avec **iptables** (complexe) ; **UFW** (*Uncomplicated Firewall*) le rend simple.

| Générique | Rôle | Concret |
|---|---|---|
| `ufw status` | actif ou non + règles | `ufw status` |
| `ufw status numbered` | règles **numérotées** | `ufw status numbered` |
| `ufw enable` / `ufw disable` | activer / désactiver | ⚠️ `ufw allow ssh` **avant** `enable` |
| `ufw <allow\|deny> <port>` | permettre / bloquer un port | `ufw allow 80` · `ufw deny 80` |
| `ufw <allow\|deny> <protocole>` | idem par nom (traduit en port TCP) | `ufw allow http` (= 80/tcp) · `ufw allow ssh` (= 22/tcp) |
| `ufw delete <numéro>` | supprime **une** règle | `ufw delete 3` |
| `ufw reset` | supprime **toutes** les règles **et désactive** | puis `ufw allow ssh` + `ufw enable` |
| `apt-get install ufw` | installer s'il manque | 💡 `sudo apt update && sudo apt install ufw` |

💡 `ufw delete allow 80` supprime la règle v4 **et** v6 d'un coup · `ufw allow 80/tcp` n'ouvre que TCP.

📘 Changer le port SSH (ancienne édition du support, encore citée en référence diapo 78) : dans
`/etc/ssh/sshd_config`, remplacer `#Port 22` par `Port 2222`, `ufw allow 2222`, puis
`systemctl restart ssh`. Réduit les attaques automatisées qui visent le port 22 (mais ne cache rien à
un scan ciblé).

<a id="b4"></a>

## Cours 4 — Tâches cédulées et scriptage

📖 [Leçon 04](https://salmon-sky-0a730780f.7.azurestaticapps.net/cours/securite-web/automatisation-surveillance/) · diapos 4-66

### Crontab (diapos 12-45)

| Générique | Rôle | Concret |
|---|---|---|
| `crontab -e` | éditer sa crontab (1re fois : choisir l'éditeur, le cours prend `2` = vim.basic) | sauvegarder : `Échap`, `:wq` |
| `crontab -l` | afficher sa crontab | — |
| `<min> <heure> <jour-mois> <mois> <jour-sem> <commande>` | une ligne = une tâche | `5 * * * * php script.php` |

| Champ | Valeurs |
|---|---|
| minute | 0-59 |
| heure | 0-23 |
| jour du mois | 1-31 |
| mois | 1-12 |
| jour de la semaine | 0-6 (0 = dimanche ; 7 aussi = dimanche) |

| Opérateur | Sens | Exemple |
|---|---|---|
| `*` | toutes les valeurs | `* * * * *` = chaque minute |
| `,` | valeurs multiples | `0 0 * * 1,3,5` = lun, mer, ven à minuit |
| `-` | plage | `0 15 * * 1-5` = jours de semaine à 15 h |
| `/` | intervalle | `*/15 * * * *` = toutes les 15 min |

**Les 6 cas du cours** : chaque minute `* * * * *` · aux 5 min `*/5 * * * *` · tous les jours à
0 h 01 `1 0 * * *` · lun-ven à midi `0 12 * * 1-5` · samedi 3 h `0 3 * * 6` (⚠️ la diapo 31 écrit
`0 3 * * * 6`, un champ de trop) · 1er janvier 0 h 05 `5 0 1 1 *`.

**Rediriger la sortie** : `commande > fichier` écrase · `commande >> fichier` ajoute ·
💡 `>> fichier 2>&1` ajoute aussi les erreurs.
Exemple du cours : `30 12 1 6 * php script.php > /resultatCrontab/resultat.txt` (1er juin, 12 h 30).

**Vérifier une expression** : crontab.guru (modifier l'expression, lire l'explication, *Next* =
prochaines exécutions). **Combinaison impossible** : exécuter plus souvent + valider dans le script.

### Scriptage PHP (diapos 46-63)

| Générique | Concret |
|---|---|
| `php <chemin du fichier>` | `php /mesScripts/copieDeSauvegarde.php` |
| dans la crontab | `0 3 * * * php /mesScripts/copieDeSauvegarde.php >> /mesScripts/sauvegarde.log` |
| surveiller un journal | `tail -f /mesScripts/sauvegarde.log` |

**Purge de données** (diapos 52-57) : `SELECT` d'abord, puis `DELETE` avec le même filtre.

```sql
DELETE FROM <table> WHERE <champ_date> < DATE_ADD(now(), INTERVAL -<n> <DAY|MONTH|YEAR>);
DELETE FROM fichierImporte WHERE date_importation < DATE_ADD(now(), INTERVAL -1 YEAR);
-- 💡 équivalent plus lisible : DATE_SUB(NOW(), INTERVAL 1 YEAR)
```

Script PHP type : `new mysqli('localhost', '<utilisateur>', '<mot de passe>', '<base>')` →
`$conn->query($sql) === TRUE` → message → `$conn->close()`. Code complet : [ex. 5](#a4).

**Surveillance d'un service** (diapos 58-63) : `shell_exec('systemctl is-active apache2')` → si
`"inactive\n"` → `shell_exec('systemctl start apache2')` + date + message. Code complet : [ex. 4](#a4).

| Commande systemd | Rôle |
|---|---|
| `systemctl is-active <service>` | répond `active`, `inactive` ou `failed` |
| `systemctl start / stop / restart <service>` | démarrer / arrêter / redémarrer |
| `systemctl status <service>` | état détaillé (`q` pour sortir) |

<a id="b5"></a>

## Cours 5 — Sécurité des utilisateurs (⚠️ pas à l'examen 1 — examen final)

diapos 7-113. Les exemples reprennent les noms de la feuille d'exercices du cours 5.

### Comptes utilisateurs (diapos 7-31)

| Générique | Paramètres | Concret (ex. du cours 5) |
|---|---|---|
| `adduser <utilisateur>` | interactif, crée le `home` — **méthode privilégiée** | `adduser alexandre` (ex. 2) |
| `useradd <utilisateur>` | crée le compte **seulement** (scripts) | `useradd exercice16` |
| `passwd [<utilisateur>]` | change le mot de passe (le sien sans argument) | `passwd alexandre` → `Qwerty123` (ex. 3) |
| `su <utilisateur>` | changer de compte (mot de passe demandé sauf depuis root) | `su philippe` (ex. 4) · `exit` = revenir |
| `whoami` | quel compte est actif | `whoami` (ex. 5) |
| `usermod -l <nouveau> <ancien>` | renommer | `usermod -l alex alexandre` |
| `usermod -L / -U <utilisateur>` | verrouiller / déverrouiller (rend le mot de passe inutilisable ; root peut quand même `su`) | `usermod -L nic` (ex. 6) |
| `userdel -r <utilisateur>` | supprimer + son `home` (`-r`) | `userdel -r nic` |

Fichiers : `/etc/passwd` (infos des comptes) · `/etc/shadow` (hachage des mots de passe).
Lister les comptes (ex. 9) : `cat /etc/passwd` · 💡 `cut -d: -f1 /etc/passwd` n'affiche que les noms.

### sudo et sudoers (diapos 33-49)

`sudo <commande>` = exécuter en super-utilisateur, **si** le fichier `/etc/sudoers` l'autorise.

```text
<qui>   <hôte>=(<compte>)  <options>:  <commandes>
sara    ALL=(ALL)          ALL                              ← ex. 7 : toutes les permissions
julie   ALL=(ALL)          NOPASSWD: /usr/bin/apt-get install *
bob     ALL=(root)         /usr/bin/systemctl restart apache2
%support ALL=(root)        /usr/bin/apt update, /usr/bin/apt upgrade   ← % = un groupe
```

| Élément | Sens |
|---|---|
| qui | `alex` (utilisateur) ou `%groupe` |
| hôte=(compte) | serveur visé (`ALL`) et compte d'exécution (`ALL` ou `root`) ; dans le doute `ALL=(ALL)` |
| options | `NOPASSWD`/`PASSWD` (redemander le mot de passe) · `NOEXEC`/`EXEC` (sous-processus) · `SETENV`/`NOSETENV` ; chaque option suivie de `:` |
| commandes | chemins complets séparés par des virgules, ou `ALL` ; `*` = joker (prudence) |

💡 Éditer avec **`visudo`** : même fichier, mais la syntaxe est vérifiée avant l'enregistrement (une
faute dans `sudoers` peut casser `sudo`). 💡 Alternative : `usermod -aG sudo sara` (le groupe `sudo`
a déjà tous les droits, diapo 40). Ex. 8 : `su sara` puis `sudo apt-get install apache2`.

### Groupes (diapos 50-60)

| Générique | Concret |
|---|---|
| `cat /etc/group` | tous les groupes |
| `groups [<utilisateur>]` | `groups alexandre` (ex. 10) |
| `id <utilisateur>` | groupe **primaire** + secondaires |
| `groupadd <groupe>` / `groupdel <groupe>` | `groupadd enseignant` (ex. 11) |
| `usermod -aG <groupe> <utilisateur>` | `usermod -aG enseignant alexandre` (`-a` = **ajouter** ; sans lui `-G` remplace tous les groupes) |
| `gpasswd -d <utilisateur> <groupe>` | retirer du groupe |
| `getent group <groupe>` | `getent group enseignant` → membres |

### Permissions (diapos 61-87)

`ls -l` : `drwxrwxr-x 2 root enseignant 4096 … cegep` → type · droits **propriétaire / groupe /
autres** · propriétaire · groupe.

| Droit | Fichier | Répertoire | Valeur |
|---|---|---|---|
| r | lire | voir le contenu | 4 |
| w | modifier | modifier les fichiers dedans | 2 |
| x | exécuter | **accéder** au répertoire | 1 |

**Numérique** : additionner par classe → `chmod 754 demo.txt` = propriétaire 7 (rwx), groupe 5 (r-x),
autres 4 (r--).
**Symbolique** : `u` propriétaire · `g` groupe · `o` autres · `a` tous ; `+` ajouter · `-` retirer ;
`r w x` → `chmod g+rw demo.php` · `chmod g+x,o+x demo.php` · `chmod o-rwx demo.php` · `chmod a+rwx demo.php`.
`chown <utilisateur> <cible>` (propriétaire) · `chgrp <groupe> <cible>` (⚠️ la diapo 86 écrit
`<utilisateur>` : c'est un groupe).

Ex. 12-13 (répertoire `/cegep`, enseignants lecture/écriture, autres lecture) :

```bash
mkdir /cegep
chgrp enseignant /cegep
chmod 775 /cegep      # root rwx · enseignant rwx (le x est nécessaire pour entrer dans le répertoire) · autres r-x
su alexandre          # (se reconnecter après l'ajout au groupe pour qu'il prenne effet)
vi /cegep/notes.txt   # fonctionne
exit
su philippe
touch /cegep/test.txt # → Permission denied  ✔
```

### Politique de mot de passe (diapos 89-113)

```bash
apt-get install libpam-pwquality          # ex. 14
grep pwquality /etc/pam.d/common-password # doit contenir : password requisite pam_pwquality.so retry=3
vi /etc/security/pwquality.conf           # décommenter (#) et régler :
#   minlen = 8        ← longueur minimale
#   minclass = 3      ← nb de classes : minuscule, majuscule, chiffre, spécial
su elizabeth
passwd                                    # « qwerty » → refusé ✔ (tester en tant qu'elle : root peut outrepasser)
```

| Générique (`chage`) | Rôle | Concret |
|---|---|---|
| `chage -l <u>` | afficher l'expiration | `chage -l sara` (ex. 15) |
| `chage -m <jours> <u>` | durée **minimum** avant de pouvoir changer | `chage -m 1 sara` |
| `chage -M <jours> <u>` | durée **maximum** (expiration) | `chage -M 30 sara` |
| `chage -W <jours> <u>` | avertissement avant expiration | `chage -W 7 sara` |
| `chage -d 0 <u>` | forcer le changement à la prochaine connexion | `chage -d 0 sara` |
| combiné | plusieurs options d'un coup | `chage -M 30 -W 7 sara` (ex. 15) |

**Politique pour les futurs comptes** (ex. 16) : `vi /etc/login.defs` → `PASS_MAX_DAYS 30`,
`PASS_WARN_AGE 7` → `adduser exercice16` → `chage -l exercice16`. Ne s'applique **qu'aux nouveaux
comptes** (les existants : script ou `chage`).
