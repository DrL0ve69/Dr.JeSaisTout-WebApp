# Examen 1 — Sécurisation des applications web (420-B10-HU) · Fiche de révision

> **Portée : cours 1 à 4** (le Cours 5 le dit, diapo 118). Examen **pratique** à la séance 6.
> **Documents permis** : notes, exercices et corrigés, Internet (Cours 1, diapo 7).
> **Format annoncé** : *« Les examens réutiliseront le même modèle que les exercices »* (Cours 1, diapo 6).
> Autrement dit, **les manipulations des exercices sont la matière d'examen.**

## 0 · Comment lire ce document — OÙ se tape chaque commande

Chaque bloc de commandes commence par **l'invite** que tu vois à l'écran. Elle te dit **dans quel
programme** tu tapes et **dans quel répertoire** tu te trouves. **Ne tape pas l'invite**, seulement
ce qui la suit.

| Ce que tu vois au début de la ligne | Où tu es | Comment tu y es arrivé |
|---|---|---|
| `C:\Utilisateur\0758510\CleSSH>` | 🪟 **invite de commandes Windows** (`cmd`) **sur ton poste**, dans le dossier `CleSSH` | Explorateur → ouvrir le dossier → taper `cmd` dans la barre d'adresse → `Entrée` |
| `root@mon-droplet:~#` | 🐧 **PuTTY**, connecté **au serveur** en `root`, dans **`/root`** (`~` = ton répertoire personnel = `/root`) | PuTTY → IP → *Open* → `login as: root` |
| `root@mon-droplet:/scriptExerciceCours6#` | 🐧 **PuTTY**, même serveur, mais dans le répertoire **`/scriptExerciceCours6`** | après un `cd /scriptExerciceCours6` |
| `MariaDB [(none)]>` / `MariaDB [cours4]>` | 🗄️ **client MariaDB**, à l'intérieur de PuTTY (la base `cours4` est sélectionnée dans le 2e cas) | taper `mysql` dans PuTTY ; en sortir avec `EXIT;` |
| « 📄 **Dans vi** » au-dessus d'un bloc | ✏️ **éditeur `vi`**, ouvert dans PuTTY | `vi <fichier>` → `i` pour écrire → `Échap` → `:wq` → `Entrée` |
| « 📄 **Dans l'éditeur de crontab** » | ✏️ **`vi` ouvert par `crontab -e`** : la ligne s'ajoute **tout en bas du fichier**, sous les lignes de commentaires `#` | dans PuTTY : `crontab -e` → `G` (aller en bas) → `o` (nouvelle ligne + écriture) → coller → `Échap` → `:wq` |
| 🌐 **Navigateur** | Chrome/Edge **sur ton poste** | — |
| 🖱️ **Interface graphique** | fenêtres de PuTTY, PuTTYgen, WinSCP, site de DigitalOcean | — |

> **`mon-droplet`** = le nom d'hôte de ton serveur. Le tien est celui choisi à la création
> (par défaut quelque chose comme `ubuntu-s-1vcpu-1gb-tor1-01`). Seul le nom change, le reste est pareil.
> **Coller dans PuTTY = clic droit** (diapo 75 du Cours 2). Copier = sélectionner à la souris.

**Les autres légendes**

| Marque | Sens |
|---|---|
| 📘 | ce que le cours montre — **c'est la réponse à donner à l'examen** |
| 💡 | variante plus simple **avec les mêmes outils** (ne change rien au résultat) |
| ⚠️ | le support contient une coquille ou une imprécision : la bonne réponse est donnée à côté |
| `diapo N` | numéro de la diapositive dans le support 2026 de la séance |

**Valeurs employées dans les exemples concrets**

| Quoi | Valeur | À faire |
|---|---|---|
| IP du droplet | `203.0.113.10` | **remplace-la par l'IP de TON droplet** (203.0.113.x est une plage réservée aux exemples) |
| Dossier perso Windows (poste du Cégep) | `C:\Utilisateur\0758510` | hypothèse : tape `echo %USERPROFILE%` dans `cmd` pour lire le vrai chemin (l'Explorateur français affiche « Utilisateurs » pour `C:\Users`) |
| WAMP | `C:\wamp` (racine web `C:\wamp\www`) | hypothèse : peut être `C:\wamp64` sur une installation 64 bits |
| Compte sur le serveur | `root` | le cours travaille toujours en `root` → **pas besoin de `sudo`** |

> 💡 **À propos de `sudo`** : en `root`, ajouter `sudo` ne change rien et ne casse rien. Si tu es
> connecté avec un autre compte, il faut `sudo` devant `apt`, `ufw`, `systemctl`…

> 💡 **Chemin absolu = répertoire courant sans importance.** Quand une commande vise
> `/scriptExerciceCours6/heureActuelle.php` (chemin qui commence par `/`), tu peux la taper depuis
> n'importe quel répertoire. Dans ce document, les commandes sont montrées depuis `/root` (`~`),
> là où PuTTY te dépose à la connexion.

**Les leçons complètes du site** (théorie + renvois de diapos) :
[01 Fondamentaux](https://salmon-sky-0a730780f.7.azurestaticapps.net/cours/securite-web/fondamentaux/) ·
[02 Environnement Linux](https://salmon-sky-0a730780f.7.azurestaticapps.net/cours/securite-web/environnement-linux/) ·
[03 Communication serveur](https://salmon-sky-0a730780f.7.azurestaticapps.net/cours/securite-web/communication-serveur/) ·
[04 Automatisation et surveillance](https://salmon-sky-0a730780f.7.azurestaticapps.net/cours/securite-web/automatisation-surveillance/)

## Table des matières

- [0 · Où se tape chaque commande](#0--comment-lire-ce-document--où-se-tape-chaque-commande)
- [A · Corrigés des exercices (séance 4 → séance 1)](#a)
  - [Séance 4 — Tâches cédulées et scriptage](#a4)
  - [Séance 3 — Sécurité des communications serveur](#a3)
  - [Séance 2 — Environnement infonuagique Linux](#a2)
  - [Séance 1 — Introduction et poste de travail](#a1)
- [D · Pseudo-examen PRATIQUE (10 tâches + solutions cachées)](#d)
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

**Tout se fait dans PuTTY, connecté en `root`, sauf mention 🌐.**

**Préparation commune** — l'énoncé mélange deux dossiers (`/scriptExerciceCours6/` pour les scripts,
`/scriptExerciceCours4/` pour certains journaux). Ce n'est pas ton erreur : crée les deux, **à la
racine** du serveur (le `/` au début le garantit).

```bash
root@mon-droplet:~# mkdir /scriptExerciceCours4 /scriptExerciceCours6   # mkdir accepte plusieurs noms
root@mon-droplet:~# ls /                                                 # vérifier : les 2 dossiers apparaissent
```

### Exercice 1 — Écrire sept expressions crontab

🌐 Dans le navigateur, sur **crontab.guru** (l'éditeur en ligne du cours) : tu tapes l'expression, le
site te la traduit en phrase et *Next* montre les prochaines exécutions.

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

**Étapes** : créer le droplet et s'y connecter (séance 2, ex. 1) → installer PHP → écrire le script
→ l'exécuter → corriger le fuseau si l'heure est fausse (un droplet neuf est en **UTC**, soit 4 h de
plus que l'heure du Québec en été).

**1) Installer PHP**

```bash
root@mon-droplet:~# apt-get install php        # 📘 forme du cours
# 💡 apt update && apt install php             ← met d'abord la liste des paquets à jour (évite « Unable to locate package »)
root@mon-droplet:~# php -v                     # vérifie que PHP répond : « PHP 8.x … »
```

**2) Créer le script**

```bash
root@mon-droplet:~# vi /scriptExerciceCours6/heureActuelle.php
```

📄 **Dans vi** — appuie sur `i`, tape ceci, puis `Échap`, `:wq`, `Entrée` :

```php
<?php
// Affiche la date et l'heure complètes au moment de l'exécution
echo date("Y-m-d H:i:s") . "\n";   // Y=année, m=mois, d=jour, H=heure 00-23, i=minutes, s=secondes ; \n = retour à la ligne
?>
```

**3) L'exécuter** (syntaxe du cours : `php <chemin du fichier>`, Cours 4 diapo 48)

```bash
root@mon-droplet:~# php /scriptExerciceCours6/heureActuelle.php
2026-09-11 22:42:07                            ← ce que le script affiche (ici 4 h d'avance : le serveur est en UTC)
```

**4) Corriger le fuseau horaire**

```bash
root@mon-droplet:~# timedatectl                              # lire la ligne « Time zone: Etc/UTC »
root@mon-droplet:~# timedatectl set-timezone America/Toronto  # fuseau du Québec
root@mon-droplet:~# date                                     # l'heure du SYSTÈME est maintenant juste
root@mon-droplet:~# php /scriptExerciceCours6/heureActuelle.php   # re-tester le script
# alternative par menu : dpkg-reconfigure tzdata   → America → Toronto
```

> ⚠️ **Si le script affiche encore l'heure UTC** : PHP a son propre réglage de fuseau (`date.timezone`,
> UTC par défaut) et peut ignorer celui du système. Correctif : rouvre le script
> (`vi /scriptExerciceCours6/heureActuelle.php`) et ajoute cette ligne juste sous `<?php` :
> `date_default_timezone_set('America/Toronto');`

### Exercice 3 — Planifier le script chaque minute + surveiller le journal

**1) Ouvrir la crontab**

```bash
root@mon-droplet:~# crontab -e
```

La **1re fois**, une question s'affiche : *« Select an editor »*. Le cours tape **`2`** (vim.basic = vi),
puis `Entrée`. (Pour changer d'éditeur plus tard : `select-editor`.)

📄 **Dans l'éditeur de crontab** — `G` pour aller en bas, `o` pour ouvrir une nouvelle ligne, taper
(ou coller avec clic droit), `Échap`, `:wq`, `Entrée` :

```bash
* * * * * php /scriptExerciceCours6/heureActuelle.php >> /scriptExerciceCours4/exercice3.log
```

À la sortie, PuTTY affiche `crontab: installing new crontab` : c'est enregistré.

| Morceau | Rôle |
|---|---|
| `* * * * *` | chaque minute |
| `php /scriptExerciceCours6/heureActuelle.php` | la commande exécutée (chemin **absolu** du script : cron ne sait pas où tu étais) |
| `>>` | **ajoute** la sortie à la fin du fichier (l'énoncé dit « ajouté ») — `>` écraserait le fichier à chaque fois : tu ne verrais qu'une ligne |
| `/scriptExerciceCours4/exercice3.log` | le journal (créé automatiquement, mais **son dossier doit exister**) |

**2) Vérifier et surveiller**

```bash
root@mon-droplet:~# crontab -l                                   # relire la crontab enregistrée
root@mon-droplet:~# tail -f /scriptExerciceCours4/exercice3.log  # TEMPS RÉEL : une ligne apparaît chaque minute
2026-09-11 18:43:01
2026-09-11 18:44:01
^C                                                               ← Ctrl+C pour arrêter la surveillance (la tâche cron, elle, continue)
```

> 💡 Ajouter `2>&1` à la fin de la ligne de crontab envoie **aussi les erreurs** dans le journal
> (`… >> /scriptExerciceCours4/exercice3.log 2>&1`). Hors cours, 5 caractères de plus.

### Exercice 4 — Redémarrer Apache automatiquement s'il est arrêté

**1) Installer Apache et vérifier la page**

```bash
root@mon-droplet:~# apt-get install apache2    # 📘   💡 apt update && apt install apache2
root@mon-droplet:~# systemctl status apache2   # « active (running) » ; q pour quitter l'affichage
```

🌐 Navigateur : `http://203.0.113.10` → page **« Apache2 Ubuntu Default Page — It works! »**.

**2) Écrire le script**

```bash
root@mon-droplet:~# vi /scriptExerciceCours6/exercice4.php
```

📄 **Dans vi** (📘 calqué sur `surveillerApache.php`, Cours 4, diapos 61-62) :

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
> — `trim()` retire le `\n` et on teste l'état **attendu** : le script redémarre aussi Apache s'il est
> `failed` (planté), ce que la version du cours laisse passer.

**3) Le planifier chaque minute**

```bash
root@mon-droplet:~# crontab -e
```

📄 **Dans l'éditeur de crontab** (en bas, sous la ligne de l'exercice 3) :

```bash
* * * * * php /scriptExerciceCours6/exercice4.php >> /scriptExerciceCours4/exercice4.log
```

Le script n'affiche rien quand Apache va bien → le journal ne contient **que** les redémarrages. ✔

**4) Le test demandé, geste par geste**

| # | Où | Quoi |
|---|---|---|
| 1 | 🐧 PuTTY | arrêter Apache |
| 2 | 🌐 Navigateur | rafraîchir `http://203.0.113.10` → **« Ce site est inaccessible »** |
| 3 | ⏱️ | attendre **un peu plus d'une minute** (cron vérifie chaque minute, à la seconde 00) |
| 4 | 🐧 PuTTY | vérifier l'état d'Apache et lire le journal |
| 5 | 🌐 Navigateur | rafraîchir → la page Apache est revenue |

```bash
root@mon-droplet:~# systemctl stop apache2                   # geste 1
root@mon-droplet:~# systemctl is-active apache2              # → inactive  (confirme l'arrêt)
#   … geste 2 dans le navigateur, puis attendre une minute …
root@mon-droplet:~# systemctl is-active apache2              # geste 4 → active : cron l'a relancé
root@mon-droplet:~# cat /scriptExerciceCours4/exercice4.log  # → [2026-09-11 18:51:01] Redemarrage d'Apache
```

### Exercice 5 — MariaDB : purger les données de plus de 6 mois

**1) Installer** (🐧 PuTTY)

```bash
root@mon-droplet:~# apt-get install mariadb-server php-mysql   # php-mysql = extension mysqli pour le script PHP
# 💡 apt update && apt install mariadb-server php-mysql
root@mon-droplet:~# mysql                                      # ouvre le client MariaDB (en root : pas de mot de passe demandé)
MariaDB [(none)]>                                              ← tu es maintenant DANS MariaDB
```

**2) Créer la base, la table, les données, le compte** (🗄️ client MariaDB — chaque instruction finit par `;`)

```sql
MariaDB [(none)]> CREATE DATABASE cours4;
MariaDB [(none)]> USE cours4;
MariaDB [cours4]> CREATE TABLE donnees (
    ->   id_donnees    INT AUTO_INCREMENT PRIMARY KEY,   -- entier, clé primaire auto-incrémentée
    ->   texte         VARCHAR(100),
    ->   date_creation DATETIME
    -> );

-- Données étalées sur les derniers mois (aujourd'hui = 2026-09-11 → limite des 6 mois = 2026-03-11)
MariaDB [cours4]> INSERT INTO donnees (texte, date_creation) VALUES
    ->   ('Recente',        '2026-09-01 10:00:00'),   -- reste
    ->   ('Il y a 3 mois',  '2026-06-10 10:00:00'),   -- reste
    ->   ('Il y a 5 mois',  '2026-04-15 10:00:00'),   -- reste
    ->   ('Il y a 7 mois',  '2026-02-10 10:00:00'),   -- sera supprimée
    ->   ('Il y a 10 mois', '2025-11-05 10:00:00');   -- sera supprimée
-- 💡 dates relatives : ('Il y a 7 mois', DATE_ADD(NOW(), INTERVAL -7 MONTH))

-- Compte utilisé par le script PHP (le cours se connecte avec alexandre / qwerty)
MariaDB [cours4]> CREATE USER 'alexandre'@'localhost' IDENTIFIED BY 'qwerty';
MariaDB [cours4]> GRANT ALL PRIVILEGES ON cours4.* TO 'alexandre'@'localhost';
MariaDB [cours4]> FLUSH PRIVILEGES;

-- Voir AVANT de supprimer (📘 diapo 55 : SELECT puis DELETE, même filtre) → doit lister 2 lignes
MariaDB [cours4]> SELECT * FROM donnees WHERE date_creation < DATE_ADD(NOW(), INTERVAL -6 MONTH);
MariaDB [cours4]> EXIT;
root@mon-droplet:~#                                           ← de retour dans le terminal Linux
```

> Le `->` au début des lignes est l'invite de **suite** de MariaDB : elle apparaît quand une
> instruction n'est pas encore terminée par `;`. Ne la tape pas.

**3) Exporter la table** (🐧 PuTTY, **pas** dans MariaDB)

```bash
root@mon-droplet:~# mysqldump cours4 donnees > /scriptExerciceCours4/donnees.sql   # mysqldump <base> <table> > <fichier>
root@mon-droplet:~# ls -l /scriptExerciceCours4                                    # le fichier donnees.sql existe
```

**4) Le script de purge** (📘 calqué sur la diapo 56)

```bash
root@mon-droplet:~# vi /scriptExerciceCours6/exercice5.php
```

📄 **Dans vi** :

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

**5) Tester à la main, puis planifier toutes les 5 minutes**

```bash
root@mon-droplet:~# php /scriptExerciceCours6/exercice5.php   # → [...] Suppression effectuee avec succes (2 ligne(s))
root@mon-droplet:~# crontab -e
```

📄 **Dans l'éditeur de crontab** :

```bash
*/5 * * * * php /scriptExerciceCours6/exercice5.php >> /scriptExerciceCours4/exercice5.log
```

**6) Vérifier / recommencer** (🐧 PuTTY)

```bash
root@mon-droplet:~# mysql -e "SELECT * FROM cours4.donnees;"      # -e = exécuter une requête sans entrer dans MariaDB → 3 lignes récentes
root@mon-droplet:~# cat /scriptExerciceCours4/exercice5.log       # une ligne toutes les 5 min
# En cas de problème : supprimer la table puis réimporter l'export (aucune donnée à retaper)
root@mon-droplet:~# mysql -e "DROP TABLE cours4.donnees;"
root@mon-droplet:~# mysql cours4 < /scriptExerciceCours4/donnees.sql   # mysql <base> < <fichier> = importer
```

> ⚠️ Diapo 56 : le texte dit qu'une purge **une fois par jour** suffit, la capture montre `*/1`.
> L'exercice demande `*/5` pour voir le résultat pendant la séance ; en vrai, `0 3 * * *`.

### Exercice 6 — Épargner les données marquées « conserver = true »

**1) Désactiver la tâche pendant la modification** (📘 astuce du cours : la commenter avec `#`)

```bash
root@mon-droplet:~# crontab -e
```

📄 **Dans l'éditeur de crontab** — mets le curseur au début de la ligne de l'exercice 5, `i`, tape `#`,
`Échap`, `:wq` :

```bash
#*/5 * * * * php /scriptExerciceCours6/exercice5.php >> /scriptExerciceCours4/exercice5.log
```

**2) Ajouter le champ et de nouvelles vieilles données** (🐧 `mysql` → 🗄️ MariaDB)

```sql
root@mon-droplet:~# mysql
MariaDB [(none)]> USE cours4;
MariaDB [cours4]> ALTER TABLE donnees ADD conserver VARCHAR(10);      -- 'true' ou 'false'

-- Nouvelles données de plus de 6 mois, true/false au hasard
MariaDB [cours4]> INSERT INTO donnees (texte, date_creation, conserver) VALUES
    ->   ('Vieux A', '2026-01-10 08:00:00', IF(RAND() < 0.5, 'true', 'false')),
    ->   ('Vieux B', '2025-12-20 08:00:00', IF(RAND() < 0.5, 'true', 'false')),
    ->   ('Vieux C', '2025-10-02 08:00:00', IF(RAND() < 0.5, 'true', 'false')),
    ->   ('Vieux D', '2025-08-15 08:00:00', IF(RAND() < 0.5, 'true', 'false'));
-- ou simplement écrire 'true' / 'false' à la main

MariaDB [cours4]> SELECT * FROM donnees WHERE conserver = 'true';   -- NOTER lesquelles, avant le passage du script
MariaDB [cours4]> EXIT;
```

**3) Modifier la requête du script**

```bash
root@mon-droplet:~# vi /scriptExerciceCours6/exercice5.php
```

📄 **Dans vi** — remplace la ligne `$sql = …` par :

```php
$sql = "DELETE FROM donnees
        WHERE date_creation < DATE_ADD(now(), INTERVAL -6 MONTH)
          AND (conserver <> 'true' OR conserver IS NULL)";
```

> Pourquoi `OR conserver IS NULL` : les lignes créées **avant** l'`ALTER TABLE` ont `conserver = NULL`,
> et en SQL `NULL <> 'true'` n'est jamais vrai → elles échapperaient à la purge. Si toutes tes lignes
> ont une valeur, `AND conserver = 'false'` suffit.

**4) Réactiver et vérifier**

```bash
root@mon-droplet:~# crontab -e          # retirer le # devant la ligne (curseur dessus, x efface un caractère), :wq
#   … attendre 5 minutes …
root@mon-droplet:~# mysql -e "SELECT * FROM cours4.donnees;"   # les lignes 'true' sont toujours là, les vieilles 'false' ont disparu
```

### Exercice 7 — Deux fréquences d'exécution selon l'heure de la journée

**Ce que l'énoncé demande, en clair** : le même script doit s'exécuter

- **toutes les 5 minutes** pendant les **heures impaires** de l'horloge (1 h, 3 h, 5 h … 13 h, 15 h … 23 h) ;
- **toutes les 3 minutes** pendant les **heures paires** (0 h, 2 h, 4 h … 12 h, 14 h … 22 h).

Exemple concret de ce que le journal doit montrer :

| Période | Heure paire ou impaire ? | Exécutions attendues |
|---|---|---|
| de 13 h 00 à 13 h 59 | 13 = **impaire** → aux 5 min | 13:00, 13:05, 13:10, 13:15 … 13:55 |
| de 14 h 00 à 14 h 59 | 14 = **paire** → aux 3 min | 14:00, 14:03, 14:06, 14:09 … 14:57 |
| de 15 h 00 à 15 h 59 | 15 = **impaire** → aux 5 min | 15:00, 15:05 … |

Une seule expression crontab ne peut pas porter deux fréquences différentes : il faut **deux lignes**
(réponse 1) ou une vérification **dans le script** (réponse 2, méthode du cours).

**1) Copier le script et le modifier** (🐧 PuTTY)

```bash
root@mon-droplet:~# cp /scriptExerciceCours6/heureActuelle.php /scriptExerciceCours6/heureActuelleExercice7.php
#                   cp <fichier source>                       <fichier copie>      ← copie : l'original reste intact
root@mon-droplet:~# vi /scriptExerciceCours6/heureActuelleExercice7.php
```

📄 **Dans vi** — modifier la ligne `echo` pour qu'elle devienne :

```php
<?php
echo date("Y-m-d H:i:s") . " (Exercice 7)\n";
?>
```

```bash
root@mon-droplet:~# php /scriptExerciceCours6/heureActuelleExercice7.php   # → 2026-09-11 18:55:12 (Exercice 7)
```

**2a) Réponse 1 — deux lignes de crontab** (la plus lisible)

```bash
root@mon-droplet:~# crontab -e
```

📄 **Dans l'éditeur de crontab** :

```bash
*/5 1-23/2 * * * php /scriptExerciceCours6/heureActuelleExercice7.php >> /scriptExerciceCours6/exercice7.log
*/3 0-22/2 * * * php /scriptExerciceCours6/heureActuelleExercice7.php >> /scriptExerciceCours6/exercice7.log
```

| Champ | Sens |
|---|---|
| `*/5` puis `*/3` (minutes) | toutes les 5 min, puis toutes les 3 min |
| `1-23/2` (heures) | de 1 à 23, **une heure sur deux** → 1, 3, 5 … 23 = heures impaires |
| `0-22/2` (heures) | 0, 2, 4 … 22 = heures paires (`*/2` donne la même chose) |

**2b) Réponse 2 — 📘 la méthode du cours (diapos 43-44)** : exécuter **chaque minute** et laisser le
script décider s'il doit écrire.

📄 **Dans l'éditeur de crontab** (une seule ligne, à la place des deux précédentes) :

```bash
* * * * * php /scriptExerciceCours6/heureActuelleExercice7.php >> /scriptExerciceCours6/exercice7.log
```

📄 **Dans vi** (`vi /scriptExerciceCours6/heureActuelleExercice7.php`) :

```php
<?php
$heure  = (int) date("G");   // heure 0-23
$minute = (int) date("i");   // minute 0-59
if ($heure % 2 == 1 && $minute % 5 != 0) { exit; }   // heure impaire : on n'écrit qu'aux minutes 0, 5, 10…
if ($heure % 2 == 0 && $minute % 3 != 0) { exit; }   // heure paire   : on n'écrit qu'aux minutes 0, 3, 6…
echo date("Y-m-d H:i:s") . " (Exercice 7)\n";
?>
```

(`%` = reste de la division : `13 % 2` vaut 1 → impaire ; `14 % 2` vaut 0 → paire.)

**3) Vérifier**

```bash
root@mon-droplet:~# tail -f /scriptExerciceCours6/exercice7.log   # observer l'écart de 5 ou 3 min entre les lignes ; Ctrl+C
```

---

<a id="a3"></a>

## Séance 3 — Sécurité des communications serveur

### Exercice 1 — Paire de clés SSH + droplet qui l'exige (Cours 3, diapos 11-43)

**A. Générer la clé — 🪟 sur ton poste Windows**

1. Explorateur Windows : créer le dossier `C:\Utilisateur\0758510\CleSSH`.
2. Ouvrir ce dossier, cliquer dans la **barre d'adresse**, taper `cmd`, `Entrée` : une invite de
   commandes s'ouvre **déjà positionnée dans ce dossier**.
3. Lancer la commande ; répondre `maCle` au nom de fichier ; taper la passphrase **deux fois**
   (rien ne s'affiche pendant la frappe — c'est normal).

```bat
C:\Utilisateur\0758510\CleSSH> ssh-keygen
Generating public/private ed25519 key pair.
Enter file in which to save the key (C:\Users\0758510/.ssh/id_ed25519): maCle      ← taper maCle
Enter passphrase (empty for no passphrase):                                         ← taper la phrase secrète
Enter same passphrase again:                                                        ← la retaper
C:\Utilisateur\0758510\CleSSH> dir                                                  ← vérifier : maCle et maCle.pub
```

`maCle` = clé **privée** (ne la donne jamais) · `maCle.pub` = clé **publique** (va sur le serveur).

> 💡 **Forme explicite, sans questions** (même dossier, même invite `cmd`) :
> `ssh-keygen -t ed25519 -C "0758510@poste-cegep" -f maCle`
>
> | Option | Rôle | Valeur |
> |---|---|---|
> | `-t` | *type* : l'algorithme de la clé | `ed25519` (moderne) ou `rsa` |
> | `-b` | *bits* : taille — **RSA seulement** | ex. `-b 4096` ; inutile avec ed25519 |
> | `-C` | *commentaire* collé à la fin de la clé publique (sert à reconnaître la clé) | guillemets **obligatoires s'il y a une espace**, conseillés toujours |
> | `-f` | *file* : nom du fichier de sortie (évite la question) | `maCle` → crée `maCle` + `maCle.pub` dans le dossier courant |
>
> ⚠️ Le cours obtenait une clé **RSA 3072** (diapo 18) ; depuis OpenSSH 9.5 (2023) la même commande
> produit une **Ed25519**. Les deux fonctionnent.

**B. Convertir pour PuTTY — 🖱️ PuTTYgen, sur ton poste** (PuTTY ne lit que le format `.ppk`)

4. ⚠️ Le cours fait renommer `maCle` en `maCle.ppk` (diapo 20) : ce renommage ne convertit rien, il
   sert seulement à voir le fichier dans la boîte *Load* (sinon, choisir le filtre « All Files (\*.\*) »).
5. Ouvrir **PuTTYgen** → bouton *Load* → sélectionner la clé dans `C:\Utilisateur\0758510\CleSSH` →
   entrer la passphrase → message de confirmation → *OK*.
6. Bouton *Save private key* → enregistrer dans le même dossier sous **`clePutty.ppk`**.

**C. Créer le droplet avec la clé — 🌐 site de DigitalOcean**

7. *Create* → *Droplets* → section *Authentication* : cocher **SSH Key** (et non *Password*) → *New SSH Key*.
8. 🪟 Ouvrir `maCle.pub` avec le Bloc-notes ou Notepad++ → `Ctrl+A`, `Ctrl+C` (toute la ligne
   `ssh-ed25519 AAAA… commentaire`) → 🌐 coller dans la fenêtre DigitalOcean → donner un nom → *Add SSH Key*.
9. Terminer la création (*Create Droplet*), attendre, noter l'**IP**.

**D. Se connecter — 🖱️ PuTTY, sur ton poste**

10. Menu de gauche : *Connection → SSH → Auth* (versions récentes : *Auth → Credentials*) → *Browse* →
    `C:\Utilisateur\0758510\CleSSH\clePutty.ppk`.
11. Remonter à *Session* → *Host Name* : `203.0.113.10` · *Port* : `22` · *SSH* → *Open*.
12. Fenêtre *PuTTY Security Alert* → *Accept* (mise en cache de la clé du serveur).
13. Dans la fenêtre noire :

```text
login as: root                                        ← taper root
Authenticating with public key "0758510@poste-cegep"
Passphrase for key "0758510@poste-cegep":             ← la PASSPHRASE de ta clé (étape 3)
root@mon-droplet:~#                                   ← connecté !
```

> ⚠️ Piège classique : ce qu'on tape à l'étape 13 **n'est pas le mot de passe de root**, c'est la
> passphrase qui déchiffre ta clé privée **sur ton poste**. Elle n'est jamais envoyée au serveur.

**E. WinSCP — 🖱️ sur ton poste** (diapos 38-42) : *New Site* → *Host name* `203.0.113.10`, *User name*
`root` → *Advanced…* → *SSH → Authentication* → *Private key file* : `clePutty.ppk` → *OK* → *Login* →
passphrase. Gauche = ton poste, droite = le serveur ; glisser-déposer pour transférer.

> 💡 **Même résultat sans PuTTY**, 🪟 dans `cmd` ou PowerShell sur ton poste :
> `ssh -i C:\Utilisateur\0758510\CleSSH\maCle root@203.0.113.10` (`-i` = *identity* : la clé
> **privée** au format OpenSSH, pas le `.ppk`).

### Exercice 2 — Installer Apache et vérifier

```bash
root@mon-droplet:~# apt-get install apache2      # 📘 forme de l'énoncé ; répondre Y si demandé
# 💡 apt update && apt install apache2
root@mon-droplet:~# systemctl status apache2     # « active (running) » ; q pour quitter
```

🌐 Navigateur : `http://203.0.113.10` → page **« Apache2 Ubuntu Default Page — It works! »**.

### Exercice 3 — Activer UFW en gardant HTTP et SSH (🐧 PuTTY)

```bash
root@mon-droplet:~# ufw status          # Status: inactive   (⚠️ la diapo 47 écrit « uwf » : coquille)
root@mon-droplet:~# ufw allow 80        # ou : ufw allow http   → Rules updated / Rules updated (v6)
root@mon-droplet:~# ufw allow 22        # ou : ufw allow ssh    ← AVANT enable, sinon tu t'enfermes dehors
root@mon-droplet:~# ufw enable
Command may disrupt existing ssh connections. Proceed with operation (y|n)? y
Firewall is active and enabled on system startup
root@mon-droplet:~# ufw status          # Status: active + la liste des règles
```

Résultat (4 règles : chaque règle est créée en IPv4 **et** en IPv6) :

```text
To                         Action      From
--                         ------      ----
80                         ALLOW       Anywhere
22                         ALLOW       Anywhere
80 (v6)                    ALLOW       Anywhere (v6)
22 (v6)                    ALLOW       Anywhere (v6)
```

Vérifier : 🌐 la page Apache s'affiche toujours **et** 🖱️ une **deuxième** fenêtre PuTTY arrive à se
connecter (garde la première ouverte le temps du test).

### Exercice 4 — Supprimer la règle du port 80 (🐧 PuTTY)

**📘 Par numéro** (diapo 55) :

```bash
root@mon-droplet:~# ufw status numbered
     To                         Action      From
     --                         ------      ----
[ 1] 80                         ALLOW IN    Anywhere
[ 2] 22                         ALLOW IN    Anywhere
[ 3] 80 (v6)                    ALLOW IN    Anywhere (v6)
[ 4] 22 (v6)                    ALLOW IN    Anywhere (v6)
root@mon-droplet:~# ufw delete 3        # règle IPv6 du port 80 → « Proceed with operation (y|n)? » y
root@mon-droplet:~# ufw delete 1        # règle IPv4 du port 80 → y
root@mon-droplet:~# ufw status numbered # il ne reste que 22
```

> Les numéros **se décalent** après chaque suppression : supprime le **plus grand numéro d'abord**,
> ou relis `ufw status numbered` entre deux.
> 💡 **En une commande** : `ufw delete allow 80` retire d'un coup la règle IPv4 **et** IPv6
> (si tu avais écrit `ufw allow http`, c'est `ufw delete allow http`).

Vérifier : 🌐 `http://203.0.113.10` ne répond plus (le navigateur tourne jusqu'à expiration). Apache,
lui, tourne toujours (🐧 `systemctl status apache2` → active) : c'est le pare-feu qui bloque.

### Projet de session — remue-méninges

Pas de corrigé : idées à préparer — rôle de l'application et utilisateurs fictifs, fonctionnalités,
inventaire des données et première conception des tables, maquettes des interfaces.

---

<a id="a2"></a>

## Séance 2 — Environnement infonuagique Linux

### Exercice 1 — Déployer un Ubuntu sur DigitalOcean et s'y connecter avec PuTTY

1. 🌐 DigitalOcean → *Create* → *Droplets*.
2. Image : 📘 *Marketplace → LAMP on 18.04* (⚠️ Ubuntu 18.04 n'a plus de correctifs depuis mai 2023 : en vrai, prendre la LTS la plus récente).
3. Plan : le moins cher (*Regular Intel with SSD*) · Région : **Toronto** · *Authentication* : 📘 *One-time password* (à la séance 3 : *SSH Key*) · *hostname* au choix → *Create*.
4. 📧 Le courriel reçu donne : utilisateur (`root`), mot de passe, IP.
5. 🖱️ **PuTTY** : *Host Name* = IP, *Port* = `22`, *Connection type* = `SSH` → *Open* → *Accept*.
6. Dans la fenêtre noire :

```text
login as: root
root@203.0.113.10's password:                ← coller le mot de passe du courriel (clic droit) puis Entrée (rien ne s'affiche)
You are required to change your password immediately (administrator enforced)
Current password:                            ← recoller le mot de passe du courriel
New password:                                ← ton nouveau mot de passe
Retype new password:                         ← le retaper
root@mon-droplet:~#                          ← connecté, dans /root
```

### Exercices 2 à 13 — la séquence complète (🐧 PuTTY, en `root`, départ dans `/root`)

Observe l'invite : la partie après `:` indique le répertoire courant (`~` = `/root`).

```bash
# 2 · Afficher le répertoire courant
root@mon-droplet:~# pwd
/root

# 3 · Créer le répertoire exercice3 (dans /root, puisque c'est là que tu es)
root@mon-droplet:~# mkdir exercice3
root@mon-droplet:~# ls
exercice3

# 4 · Créer exercice4.txt avec vi (2 lignes)
root@mon-droplet:~# vi exercice4.txt
```

📄 **Dans vi** : `i` → taper `Démonstration de l'utilisation de VI` → `Entrée` → taper
`Voici une seconde ligne` → `Échap` → `:wq` → `Entrée`.

```bash
# 5 · Afficher le contenu
root@mon-droplet:~# cat exercice4.txt
Démonstration de l'utilisation de VI
Voici une seconde ligne

# 6 · Créer exercice5.txt (nom volontairement faux) avec vi
root@mon-droplet:~# vi exercice5.txt
#   📄 Dans vi : i → « Voici le texte de l'exercice 6 » → Entrée → « Ce dernier contient également une seconde ligne » → Échap → :wq

# 7 · Renommer exercice5.txt en exercice6.txt
root@mon-droplet:~# mv exercice5.txt exercice6.txt

# 8 · Déplacer exercice4.txt dans exercice3
root@mon-droplet:~# mv exercice4.txt exercice3/          # la barre finale = « c'est un répertoire »
root@mon-droplet:~# ls
exercice3  exercice6.txt

# 9 · Entrer dans exercice3
root@mon-droplet:~# cd exercice3                         # relatif (absolu : cd /root/exercice3)
root@mon-droplet:~/exercice3#                            ← l'invite a changé : tu es dans /root/exercice3

# 10 · Ajouter une 3e ligne à exercice4.txt
root@mon-droplet:~/exercice3# vi exercice4.txt
#   📄 Dans vi : G (dernière ligne) → o (nouvelle ligne dessous + mode écriture) → « Voici une troisième ligne » → Échap → :wq
root@mon-droplet:~/exercice3# cat exercice4.txt          # 3 lignes

# 11 · Revenir au répertoire parent
root@mon-droplet:~/exercice3# cd ..
root@mon-droplet:~#                                      ← de retour dans /root

# 12 · Supprimer le répertoire exercice3 (non vide)
root@mon-droplet:~# rm -r exercice3                      # -r = récursif ; sans lui : « Is a directory », refusé

# 13 · Supprimer exercice6.txt
root@mon-droplet:~# rm exercice6.txt
root@mon-droplet:~# ls                                   # plus rien des exercices
```

> ⚠️ L'énoncé écrit « Exercice3 » avec une majuscule aux ex. 9 et 12. **Linux distingue la casse** :
> reprends exactement le nom créé à l'ex. 3 (`exercice3`). Astuce du cours : **Tab** complète les noms.
>
> 💡 Ex. 10 sans `G`/`o` : descendre avec les flèches jusqu'à la fin de la 2e ligne, taper `A`
> (écrire en fin de ligne), `Entrée`, écrire la ligne, `Échap`, `:wq`.

---

<a id="a1"></a>

## Séance 1 — Introduction et poste de travail

> La feuille va 1, 2, **4** : il n'y a pas d'exercice 3 (numérotation de l'enseignant).
> Tout se passe **sur ton poste Windows** (🪟 / 🌐 / 🖱️) — pas encore de serveur.

### Exercice 1 — Installer les applications du cours

| Outil | À quoi il sert | Vérification |
|---|---|---|
| **WAMP** (ou XAMPP) | serveur web local Apache + PHP + MySQL sous Windows | lancer WAMP → icône **verte** dans la barre des tâches → 🌐 `http://localhost` affiche la page de WAMP ; tes fichiers vont dans `C:\wamp\www` |
| Éditeur de texte | écrire le code (Notepad++, VS Code, PHPStorm) | — |
| **PuTTY** | terminal distant **SSH** vers le serveur Linux | s'ouvre sur la fenêtre de configuration |
| **WinSCP** | transfert de fichiers poste ↔ serveur (glisser-déposer) | s'ouvre sur la fenêtre *Login* |

> Sur le poste du Cégep, WAMP est déjà installé (hypothèse : `C:\wamp`).

### Exercice 2 — Compte DigitalOcean fonctionnel

🌐 Créer le compte sur digitalocean.com, ajouter un moyen de paiement. Budget prévu par le cours :
**5 $ maximum** pour la plateforme infonuagique (Cours 1, diapo 13).

### Exercice 4 — Acheter un nom de domaine (🌐 GoDaddy, diapos 64-77)

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

# D · Pseudo-examen PRATIQUE

> **Même modèle que les exercices** : des manipulations à faire sur un vrai droplet, dans l'ordre.
> Chaque tâche s'appuie sur la précédente. Fais-la **pour de vrai** (dans PuTTY), puis ouvre la
> solution pour comparer. Les noms et les chiffres changent volontairement par rapport aux exercices :
> l'examen ne recopiera pas les feuilles.
>
> **Point de départ** : un droplet Ubuntu neuf, et tu es connecté en `root` dans `/root`.
> Tous les fichiers de l'examen vont sous **`/examen1`**.

### Tâche 1 — Préparer l'arborescence (séance 2)

Crée le répertoire `/examen1`, puis à l'intérieur deux sous-répertoires `scripts` et `logs`.
Vérifie avec une commande qui affiche le détail.

<details><summary>Solution</summary>

```bash
root@mon-droplet:~# mkdir /examen1
root@mon-droplet:~# mkdir /examen1/scripts
root@mon-droplet:~# mkdir /examen1/logs
root@mon-droplet:~# ls -l /examen1
drwxr-xr-x 2 root root 4096 Sep 11 19:02 logs
drwxr-xr-x 2 root root 4096 Sep 11 19:02 scripts
```
💡 `mkdir -p /examen1/scripts /examen1/logs` crée tout d'un coup (`-p` = crée aussi les parents).
Le `d` au début de la ligne = répertoire.
</details>

### Tâche 2 — Fichiers, vi, déplacements (séance 2)

1. Place-toi dans `/examen1` et affiche où tu es.
2. Avec `vi`, crée `brouillon.txt` contenant deux lignes : `Examen pratique` et `Deuxième ligne`.
3. Affiche son contenu.
4. Renomme-le `notes.txt`.
5. Déplace-le dans `/examen1/logs`.
6. Sans quitter `/examen1`, ajoute la ligne `Troisième ligne` à la fin du fichier.
7. Va dans `/examen1/scripts` **par un chemin relatif** à partir de `/examen1/logs`.
8. Crée un répertoire `temporaire` dans `/examen1`, puis supprime-le.

<details><summary>Solution</summary>

```bash
root@mon-droplet:~# cd /examen1                          # 1 (absolu)
root@mon-droplet:/examen1# pwd
/examen1
root@mon-droplet:/examen1# vi brouillon.txt              # 2 → 📄 i, « Examen pratique », Entrée, « Deuxième ligne », Échap, :wq
root@mon-droplet:/examen1# cat brouillon.txt             # 3
root@mon-droplet:/examen1# mv brouillon.txt notes.txt    # 4 renommer
root@mon-droplet:/examen1# mv notes.txt logs/            # 5 déplacer
root@mon-droplet:/examen1# vi logs/notes.txt             # 6 → 📄 G, o, « Troisième ligne », Échap, :wq
root@mon-droplet:/examen1# cat logs/notes.txt            #   vérification : 3 lignes
root@mon-droplet:/examen1# cd logs
root@mon-droplet:/examen1/logs# cd ../scripts            # 7 relatif : .. = remonter à /examen1, puis entrer dans scripts
root@mon-droplet:/examen1/scripts# cd ..
root@mon-droplet:/examen1# mkdir temporaire              # 8
root@mon-droplet:/examen1# rm -r temporaire              #   -r obligatoire pour un répertoire
```
</details>

### Tâche 3 — Clé SSH, droplet protégé, WinSCP (séance 3)

1. Sur ton poste, génère une paire de clés nommée `cleExamen` (avec une passphrase), dans
   `C:\Utilisateur\0758510\CleSSH`.
2. Convertis-la pour PuTTY sous le nom `cleExamenPutty.ppk`.
3. Crée un droplet qui n'accepte **que** cette clé, et connecte-toi avec PuTTY.
4. Installe Apache.
5. Sur ton poste, crée un fichier `examen.html` contenant `<h1>Examen 1</h1>`, et dépose-le avec
   **WinSCP** dans le répertoire servi par Apache.
6. Affiche la page dans ton navigateur.

<details><summary>Solution</summary>

**1)** 🪟 Explorateur → `C:\Utilisateur\0758510\CleSSH` → barre d'adresse → `cmd` → `Entrée` :

```bat
C:\Utilisateur\0758510\CleSSH> ssh-keygen
Enter file in which to save the key (...): cleExamen
Enter passphrase (empty for no passphrase):        ← passphrase
Enter same passphrase again:                       ← passphrase
```

**2)** 🖱️ PuTTYgen → *Load* (filtre « All Files ») → `cleExamen` → passphrase → *OK* →
*Save private key* → `cleExamenPutty.ppk`.

**3)** 🌐 DigitalOcean → *Create → Droplets* → *Authentication : SSH Key* → *New SSH Key* → coller le
contenu de **`cleExamen.pub`** (ouvert au Bloc-notes) → *Add SSH Key* → *Create Droplet*.
🖱️ PuTTY → *Connection → SSH → Auth* → *Browse* `cleExamenPutty.ppk` → *Session* : IP, port 22 →
*Open* → *Accept* → `login as: root` → **passphrase de la clé**.

**4)** 🐧 PuTTY :

```bash
root@mon-droplet:~# apt-get install apache2          # 💡 apt update && apt install apache2
```

**5)** 🪟 Bloc-notes → taper `<h1>Examen 1</h1>` → *Enregistrer sous* `examen.html`
(type « Tous les fichiers », sinon Windows ajoute `.txt`).
🖱️ WinSCP → *New Site* → IP, `root` → *Advanced… → SSH → Authentication* → `cleExamenPutty.ppk` →
*Login* → passphrase → panneau de **droite** : aller dans `/var/www/html` → glisser `examen.html`
depuis le panneau de **gauche**.

**6)** 🌐 `http://203.0.113.10/examen.html` → « Examen 1 » en titre.
Vérif 🐧 : `ls -l /var/www/html` → `examen.html` et `index.html`.
</details>

### Tâche 4 — Pare-feu UFW (séance 3)

1. Active UFW en autorisant **SSH par son nom de protocole** et **le web par son numéro de port**.
   Confirme que la page `examen.html` s'affiche toujours.
2. **Bloque** le port du web ; vérifie dans le navigateur ; puis **rouvre-le**.
3. Affiche les règles numérotées et supprime **uniquement** les règles du web (IPv4 et IPv6).
4. Réinitialise complètement le pare-feu, puis remets-le en service de façon sûre avec seulement SSH.

<details><summary>Solution</summary>

```bash
root@mon-droplet:~# ufw allow ssh            # 1 — SSH D'ABORD
root@mon-droplet:~# ufw allow 80
root@mon-droplet:~# ufw enable               #     → y
root@mon-droplet:~# ufw status               #     22/tcp et 80 (+ v6) ALLOW
#   🌐 http://203.0.113.10/examen.html → s'affiche

root@mon-droplet:~# ufw deny 80              # 2 — la règle 80 passe à DENY (« Rule updated »)
#   🌐 rafraîchir → la page ne répond plus
root@mon-droplet:~# ufw allow 80             #     rouvrir → 🌐 la page revient

root@mon-droplet:~# ufw status numbered      # 3 — p. ex. [1] 22/tcp  [2] 80  [3] 22/tcp (v6)  [4] 80 (v6)
root@mon-droplet:~# ufw delete 4             #     le plus grand numéro d'abord → y
root@mon-droplet:~# ufw delete 2             #     → y
root@mon-droplet:~# ufw status numbered      #     il ne reste que 22/tcp
# 💡 à la place des deux delete : ufw delete allow 80

root@mon-droplet:~# ufw reset                # 4 — efface tout ET désactive → y
root@mon-droplet:~# ufw allow ssh            #     d'abord SSH…
root@mon-droplet:~# ufw enable               #     …ensuite l'activation → y
root@mon-droplet:~# ufw status
```
Les numéros réels dépendent de ta liste : **lis toujours `ufw status numbered` avant `ufw delete`**.
</details>

### Tâche 5 — Expressions crontab (séance 4)

Écris l'expression (vérifie sur 🌐 crontab.guru) : (a) toutes les 10 minutes ; (b) tous les jours
à 23 h 45 ; (c) du lundi au vendredi à 8 h et à 17 h ; (d) le 1er et le 15 de chaque mois à minuit ;
(e) toutes les 30 minutes, le samedi et le dimanche seulement ; (f) le 1er janvier, avril, juillet et
octobre à 6 h ; (g) aux minutes 10, 20 et 50 de chaque heure ; (h) chaque samedi à 3 h.

<details><summary>Solution</summary>

| # | Expression | Remarque |
|---|---|---|
| a | `*/10 * * * *` | |
| b | `45 23 * * *` | minute d'abord, puis heure |
| c | `0 8,17 * * 1-5` | virgule = plusieurs heures ; `1-5` = lun-ven |
| d | `0 0 1,15 * *` | 3e champ = jours du **mois** |
| e | `*/30 * * * 0,6` | 0 = dimanche, 6 = samedi (ou `6,7`) |
| f | `0 6 1 1,4,7,10 *` | ou `0 6 1 */3 *` (mois 1, 4, 7, 10) |
| g | `10,20,50 * * * *` | énumération, pas d'intervalle régulier |
| h | `0 3 * * 6` | ⚠️ **5 champs** — la diapo 31 écrit `0 3 * * * 6` (un de trop) |
</details>

### Tâche 6 — Script PHP planifié + fuseau horaire (séance 4)

1. Installe PHP.
2. Crée `/examen1/scripts/bonjour.php` qui affiche `Bonjour, il est ` suivi de la date et de l'heure.
3. Exécute-le depuis le terminal ; si l'heure n'est pas celle du Québec, corrige-la.
4. Planifie-le **toutes les 2 minutes**, en **ajoutant** sa sortie à `/examen1/logs/bonjour.log`.
5. Surveille le journal en temps réel jusqu'à voir deux lignes.
6. Désactive la tâche **sans la supprimer**.

<details><summary>Solution</summary>

```bash
root@mon-droplet:~# apt-get install php                  # 1   💡 apt update && apt install php
root@mon-droplet:~# vi /examen1/scripts/bonjour.php      # 2
```
📄 **Dans vi** :
```php
<?php
echo "Bonjour, il est " . date("Y-m-d H:i:s") . "\n";
?>
```
```bash
root@mon-droplet:~# php /examen1/scripts/bonjour.php     # 3 → Bonjour, il est 2026-09-11 23:10:44  (UTC ?)
root@mon-droplet:~# timedatectl set-timezone America/Toronto
root@mon-droplet:~# php /examen1/scripts/bonjour.php     #   si encore faux : ajouter date_default_timezone_set('America/Toronto'); sous <?php
root@mon-droplet:~# crontab -e                           # 4
```
📄 **Dans l'éditeur de crontab** :
```bash
*/2 * * * * php /examen1/scripts/bonjour.php >> /examen1/logs/bonjour.log
```
```bash
root@mon-droplet:~# tail -f /examen1/logs/bonjour.log    # 5 → une ligne toutes les 2 min ; Ctrl+C
root@mon-droplet:~# crontab -e                           # 6 → ajouter # au début de la ligne, :wq
root@mon-droplet:~# crontab -l                           #   la ligne commence par #
```
</details>

### Tâche 7 — Surveiller MariaDB et le relancer (séance 4)

1. Installe MariaDB.
2. Écris `/examen1/scripts/surveillerMariaDB.php` : si MariaDB est arrêté, il le démarre et affiche
   la date, l'heure et le message `Redemarrage de MariaDB`. S'il tourne, il n'affiche **rien**.
3. Planifie-le **chaque minute**, journal : `/examen1/logs/mariadb.log`.
4. Arrête MariaDB, attends, et prouve qu'il est reparti et que l'événement est journalisé.

<details><summary>Solution</summary>

```bash
root@mon-droplet:~# apt-get install mariadb-server       # 1
root@mon-droplet:~# systemctl is-active mariadb          #   → active
root@mon-droplet:~# vi /examen1/scripts/surveillerMariaDB.php   # 2
```
📄 **Dans vi** (même patron que le script Apache du cours — seul le nom du service change) :
```php
<?php
$resultat = shell_exec('systemctl is-active mariadb');
if ($resultat == "inactive\n") {                 // 💡 ou : if (trim($resultat) != "active")
    shell_exec('systemctl start mariadb');
    echo "[" . date("Y-m-d H:i:s") . "] ";
    echo "Redemarrage de MariaDB\n";
}
?>
```
```bash
root@mon-droplet:~# crontab -e                           # 3
```
📄 **Dans l'éditeur de crontab** :
```bash
* * * * * php /examen1/scripts/surveillerMariaDB.php >> /examen1/logs/mariadb.log
```
```bash
root@mon-droplet:~# systemctl stop mariadb               # 4
root@mon-droplet:~# systemctl is-active mariadb          #   → inactive
#   … attendre un peu plus d'une minute …
root@mon-droplet:~# systemctl is-active mariadb          #   → active
root@mon-droplet:~# cat /examen1/logs/mariadb.log        #   → [2026-09-11 19:20:01] Redemarrage de MariaDB
```
</details>

### Tâche 8 — Purge conditionnelle en base de données (séance 4)

1. Crée la base `examen1` et la table `commandes` : `id_commande` (entier, clé primaire
   auto-incrémentée), `client` (varchar 50), `date_commande` (datetime), `archivee` (varchar 10,
   `true`/`false`).
2. Insère au moins 6 commandes, dont certaines de **plus de 3 mois**, avec un mélange de `true`/`false`.
3. Exporte la table dans `/examen1/logs/commandes.sql`.
4. Écris `/examen1/scripts/purger.php` qui supprime les commandes de **plus de 3 mois** **sauf** celles
   dont `archivee` vaut `true`, et journalise le résultat.
5. Planifie-le **tous les jours à 2 h**. Pour le tester tout de suite, lance-le à la main.
6. Prouve que seules les bonnes lignes ont disparu.

<details><summary>Solution</summary>

```bash
root@mon-droplet:~# apt-get install php-mysql            # extension mysqli (si pas déjà faite)
root@mon-droplet:~# mysql
```
```sql
MariaDB [(none)]> CREATE DATABASE examen1;
MariaDB [(none)]> USE examen1;
MariaDB [examen1]> CREATE TABLE commandes (
    ->   id_commande   INT AUTO_INCREMENT PRIMARY KEY,
    ->   client        VARCHAR(50),
    ->   date_commande DATETIME,
    ->   archivee      VARCHAR(10)
    -> );
MariaDB [examen1]> INSERT INTO commandes (client, date_commande, archivee) VALUES
    ->   ('Alice',  '2026-09-05 10:00:00', 'false'),   -- récente → reste
    ->   ('Bruno',  '2026-07-20 10:00:00', 'false'),   -- < 3 mois → reste
    ->   ('Chloe',  '2026-05-02 10:00:00', 'false'),   -- > 3 mois, false → SUPPRIMÉE
    ->   ('David',  '2026-04-10 10:00:00', 'true'),    -- > 3 mois, true  → reste
    ->   ('Emma',   '2026-01-15 10:00:00', 'false'),   -- > 3 mois, false → SUPPRIMÉE
    ->   ('Felix',  '2025-11-30 10:00:00', 'true');    -- > 3 mois, true  → reste
MariaDB [examen1]> CREATE USER 'examen'@'localhost' IDENTIFIED BY 'qwerty';
MariaDB [examen1]> GRANT ALL PRIVILEGES ON examen1.* TO 'examen'@'localhost';
MariaDB [examen1]> FLUSH PRIVILEGES;
-- voir AVANT de supprimer (même filtre que le DELETE) → Chloe et Emma
MariaDB [examen1]> SELECT * FROM commandes WHERE date_commande < DATE_ADD(now(), INTERVAL -3 MONTH) AND archivee <> 'true';
MariaDB [examen1]> EXIT;
```
```bash
root@mon-droplet:~# mysqldump examen1 commandes > /examen1/logs/commandes.sql   # 3
root@mon-droplet:~# vi /examen1/scripts/purger.php                             # 4
```
📄 **Dans vi** :
```php
<?php
$conn = new mysqli('localhost', 'examen', 'qwerty', 'examen1');
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
$sql = "DELETE FROM commandes
        WHERE date_commande < DATE_ADD(now(), INTERVAL -3 MONTH)
          AND (archivee <> 'true' OR archivee IS NULL)";
if ($conn->query($sql) === TRUE) {
    echo "[" . date("Y-m-d H:i:s") . "] Suppression effectuee avec succes ("
       . $conn->affected_rows . " ligne(s))\n";
} else {
    echo "Erreur de suppression: " . $conn->error . "\n";
}
$conn->close();
?>
```
```bash
root@mon-droplet:~# crontab -e                           # 5
```
📄 **Dans l'éditeur de crontab** :
```bash
0 2 * * * php /examen1/scripts/purger.php >> /examen1/logs/purge.log
```
```bash
root@mon-droplet:~# php /examen1/scripts/purger.php >> /examen1/logs/purge.log    # test immédiat, même redirection
root@mon-droplet:~# cat /examen1/logs/purge.log                                   # → ... (2 ligne(s))
root@mon-droplet:~# mysql -e "SELECT * FROM examen1.commandes;"                   # 6 → Alice, Bruno, David, Felix
# recommencer au besoin :
root@mon-droplet:~# mysql examen1 < /examen1/logs/commandes.sql
```
</details>

### Tâche 9 — Deux fréquences selon le jour (séance 4)

Crée `/examen1/scripts/rapport.php` (il affiche `Rapport` + date/heure). Il doit s'exécuter
**toutes les 10 minutes du lundi au vendredi**, et **une fois par heure (à l'heure pile) le samedi et
le dimanche**, avec sortie ajoutée à `/examen1/logs/rapport.log`. Donne les deux solutions : avec la
crontab seule, et avec la méthode du cours.

<details><summary>Solution</summary>

📄 **Dans vi** (`vi /examen1/scripts/rapport.php`) :
```php
<?php
echo "Rapport " . date("Y-m-d H:i:s") . "\n";
?>
```

**Solution 1 — deux lignes** (📄 dans l'éditeur de crontab) :
```bash
*/10 * * * 1-5 php /examen1/scripts/rapport.php >> /examen1/logs/rapport.log
0 * * * 0,6    php /examen1/scripts/rapport.php >> /examen1/logs/rapport.log
```

**Solution 2 — 📘 méthode du cours** (diapos 43-44) : planifier au plus fréquent, filtrer dans le script.
```bash
*/10 * * * * php /examen1/scripts/rapport.php >> /examen1/logs/rapport.log
```
```php
<?php
$jour   = (int) date("w");   // jour de la semaine : 0 = dimanche … 6 = samedi
$minute = (int) date("i");
if (($jour == 0 || $jour == 6) && $minute != 0) {
    exit;                    // fin de semaine : on ne continue qu'à la minute 0
}
echo "Rapport " . date("Y-m-d H:i:s") . "\n";
?>
```
</details>

### Tâche 10 — Répare la crontab (séance 4)

Voici le contenu d'une crontab (`crontab -l`). Chaque ligne a **un** défaut. Trouve-le et corrige-le.

```bash
0 3 * * * 6 php /examen1/scripts/rapport.php >> /examen1/logs/rapport.log      # tous les samedis à 3 h
0 30 * * 1-5 php /examen1/scripts/bonjour.php >> /examen1/logs/bonjour.log     # 0 h 30 en semaine
* * * * * php scripts/surveillerMariaDB.php >> /examen1/logs/mariadb.log        # chaque minute
*/15 * * * * php /examen1/scripts/bonjour.php > /examen1/logs/bonjour.log      # garder tout l'historique
0 24 * * * php /examen1/scripts/purger.php >> /examen1/logs/purge.log          # tous les jours à minuit
* * * * * /examen1/scripts/bonjour.php >> /examen1/logs/bonjour.log            # exécuter le script PHP
```

<details><summary>Solution</summary>

| # | Défaut | Correction |
|---|---|---|
| 1 | **6 champs** de temps (le `6` serait pris pour la commande) | `0 3 * * 6 php …` |
| 2 | minute et heure inversées (`30` dans le champ heure = invalide) | `30 0 * * 1-5 php …` |
| 3 | chemin **relatif** du script : cron ne part pas de `/examen1` | `php /examen1/scripts/surveillerMariaDB.php` |
| 4 | `>` **écrase** le journal à chaque fois | `>>` |
| 5 | l'heure va de **0 à 23** : 24 n'existe pas | `0 0 * * * php …` |
| 6 | il manque `php` devant le script (un `.php` ne s'exécute pas seul) | `* * * * * php /examen1/scripts/bonjour.php …` |

Pour appliquer : 🐧 `crontab -e`, corriger chaque ligne dans vi, `:wq`, puis `crontab -l`.
</details>

---

<a id="b"></a>

# B · Résumé des cours 1 à 5

Chaque commande : **forme générique** (paramètres expliqués) → **exemple concret** → 💡 variante.
**Où** : sauf mention 🪟/🌐/🖱️, tout se tape dans 🐧 **PuTTY**, connecté en `root`
(invite `root@mon-droplet:~#`).

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
| Brute force | essayer toutes les combinaisons ; **entropie** = nb de combinaisons (types de caractères, longueur) ; aussi dictionnaire, tables arc-en-ciel | politique de mot de passe (cours 5) |
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
mensuel divisé à l'heure. Avantages : coûts réduits et prévisibles, développement plus rapide, mise à
l'échelle facile, sécurité souvent supérieure. Désavantages : choix technologiques (rare), données
sensibles hébergées à l'externe.

| Service | Tu gères | Exemple |
|---|---|---|
| **IaaS** | à partir du **système d'exploitation** | DigitalOcean, AWS EC2 — **celui du cours** |
| **PaaS** | ton code et ta BD, pas l'OS | Heroku |
| **SaaS** | rien : application clé en main | Office 365 |

**Linux** : créé par **Linus Torvalds en 1991**, *open source* ; **distributions** : Ubuntu (celle du
cours), Fedora, CentOS, Red Hat.

### Déployer et se connecter

Voir [séance 2, ex. 1](#a2) (🌐 droplet → 📧 courriel → 🖱️ PuTTY port 22 → changer le mot de passe root).
Astuces PuTTY (diapo 75) : **Tab** complète · **flèches haut/bas** = historique · **clic droit** = coller.

### Les commandes de base (diapos 34-74) — 🐧 PuTTY

| Générique | Paramètres | Concret | 💡 |
|---|---|---|---|
| `pwd` | — | `pwd` → `/root` | — |
| `clear` | — | `clear` | `Ctrl+L` |
| `cd <chemin>` | chemin **relatif** (depuis ici) ou **absolu** (commence par `/`) ; `..` = parent | `cd /var/www/html` · `cd html` · `cd ..` | `cd` seul = retour à `/root` |
| `ls [-l]` | `-l` = détail (permissions, proprio, groupe, taille, date) | `ls -l` | `ls -la` montre aussi les fichiers cachés |
| `cat <fichier>` | affiche tout le contenu | `cat index.html` | `tail -f` pour un journal |
| `mkdir <répertoire>` | crée un répertoire | `mkdir exercice3` | `mkdir -p a/b/c` crée toute la chaîne |
| `rm [-r] <cible>` | `-r` (récursif) **obligatoire** pour un répertoire | `rm fichierDemo.txt` · `rm -r contenu` | pas de corbeille : `ls` avant |
| `mv <départ> <arrivée>` | déplace **et/ou** renomme | `mv demo.txt contenu/nouveauNom.txt` | barre finale `contenu/` = « c'est un répertoire » |
| `cp <source> <copie>` | copie un fichier (utilisé à l'ex. 7 du cours 4) | `cp a.php b.php` | `cp -r` pour un répertoire |
| `vi <fichier>` | ouvre (ou crée à la sauvegarde) | `vi exercice4.txt` | `nano` : pas de modes, `Ctrl+O` enregistre, `Ctrl+X` quitte |

**`vi`** : démarre en mode **Commande** · `i` → mode **Insertion** · `Échap` → retour Commande ·
`:w` sauvegarder · `:wq` sauvegarder et quitter · `:q!` quitter sans sauvegarder.
💡 `G` = aller à la dernière ligne · `o` = nouvelle ligne dessous + Insertion · `x` = effacer un caractère.
Les `~` à gauche = lignes qui n'existent pas encore.

**Arborescence des diapos 41-49** : `/var` contient `www` (qui contient `html`) et `log` (qui contient
`journal`). Depuis `/var/www` : `cd html` (relatif) ou `cd /var/www/html` (absolu) ;
`cd ../log/journal` (relatif, avec `..`) ou `cd /var/log/journal` (absolu).

<a id="b3"></a>

## Cours 3 — Sécurité des communications serveur

📖 [Leçon 03](https://salmon-sky-0a730780f.7.azurestaticapps.net/cours/securite-web/communication-serveur/) · diapos 7-72

### Authentification par clé SSH (diapos 7-43)

Pourquoi : le mot de passe peut être trouvé par **force brute** ; la clé est beaucoup plus sûre.
Clé **publique** sur le serveur, clé **privée** gardée par toi (ne pas la perdre).

| Étape | Où | Générique | Concret |
|---|---|---|---|
| Générer | 🪟 `cmd`, dans le dossier de la clé | `ssh-keygen [-t <algo>] [-b <bits RSA>] [-C "<commentaire>"] [-f <fichier>]` | `ssh-keygen` puis nom `maCle` (📘) · 💡 `ssh-keygen -t ed25519 -C "0758510@poste-cegep" -f maCle` |
| Convertir | 🖱️ PuTTYgen | *Load* → passphrase → *Save private key* | `clePutty.ppk` |
| Déposer | 🌐 DigitalOcean | *Authentication : SSH Key* → *New SSH Key* → coller le **.pub** | contenu de `maCle.pub` |
| Connecter | 🖱️ PuTTY | *Connection → SSH → Auth* → *Browse* `.ppk` → *Session* : IP → *Open* → `root` → passphrase | `203.0.113.10`, port 22 |
| Transférer | 🖱️ WinSCP | *Advanced → SSH → Authentication* → clé `.ppk` → *Login* | idem |
| 💡 Connecter | 🪟 `cmd` / PowerShell | `ssh -i <clé privée> <utilisateur>@<IP>` | `ssh -i C:\Utilisateur\0758510\CleSSH\maCle root@203.0.113.10` |

Détail pas à pas : [séance 3, ex. 1](#a3).

### Pare-feu UFW (diapos 44-72) — 🐧 PuTTY

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
| `apt-get install ufw` | installer s'il manque | 💡 `apt update && apt install ufw` |

💡 `ufw delete allow 80` supprime la règle v4 **et** v6 d'un coup · `ufw allow 80/tcp` n'ouvre que TCP.

📘 Changer le port SSH (ancienne édition du support, encore citée en référence diapo 78) :
`vi /etc/ssh/sshd_config` → remplacer `#Port 22` par `Port 2222` → `ufw allow 2222` →
`systemctl restart ssh`. Réduit les attaques automatisées qui visent le port 22 (mais ne cache rien à
un scan ciblé).

<a id="b4"></a>

## Cours 4 — Tâches cédulées et scriptage

📖 [Leçon 04](https://salmon-sky-0a730780f.7.azurestaticapps.net/cours/securite-web/automatisation-surveillance/) · diapos 4-66

**Rôles d'un script** (diapo 9) : surveiller les tentatives de connexion (force brute), nettoyer de
vieilles données, vérifier l'activité des utilisateurs, surveiller l'état du système, vérifier un
service et le redémarrer. Langages : PHP, Python, Bash, Perl…

### Crontab (diapos 12-45) — 🐧 PuTTY

| Générique | Rôle | Concret |
|---|---|---|
| `crontab -e` | éditer sa crontab (1re fois : choisir l'éditeur, le cours prend `2` = vim.basic) | ligne en bas du fichier ; `Échap`, `:wq` |
| `crontab -l` | afficher sa crontab | — |
| `<min> <heure> <jour-mois> <mois> <jour-sem> <commande>` | une ligne = une tâche | `5 * * * * php script.php` |
| `#` devant une ligne | la désactiver sans l'effacer | `#* * * * * php /script/monScript.php` |

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
**Exercice de groupe** (diapos 33-37) : `*/15 * * * *` toutes les 15 min · `0 0,6,12,18 * * *` minuit,
6 h, midi, 18 h · `0 0 1 1 *` le 1er janvier à minuit · `0 0 * * 1,2` lundi et mardi à minuit.

**Rediriger la sortie** : `commande > fichier` écrase · `commande >> fichier` ajoute ·
💡 `>> fichier 2>&1` ajoute aussi les erreurs. **Surveiller** : `tail -f fichier` (Ctrl+C).
Exemple du cours : `30 12 1 6 * php script.php > /resultatCrontab/resultat.txt` (1er juin, 12 h 30).

**Vérifier une expression** : 🌐 crontab.guru (modifier l'expression, lire l'explication, *Next* =
prochaines exécutions). Plus petite fréquence : **1 minute** (cron vérifie une fois par minute).
**Combinaison impossible en une ligne** : exécuter plus souvent + valider dans le script (diapos 43-44).

### Scriptage PHP (diapos 46-63) — 🐧 PuTTY

| Générique | Concret |
|---|---|
| `php <chemin du fichier>` | `php /mesScripts/copieDeSauvegarde.php` |
| dans la crontab | `0 3 * * * php /mesScripts/copieDeSauvegarde.php >> /mesScripts/sauvegarde.log` |

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

Noms de services du cours : `apache2`, `mariadb`.

| MariaDB | Où | Commande |
|---|---|---|
| entrer / sortir | 🐧 → 🗄️ | `mysql` … `EXIT;` |
| exporter une table | 🐧 | `mysqldump <base> <table> > <fichier.sql>` |
| importer | 🐧 | `mysql <base> < <fichier.sql>` |
| requête sans entrer | 🐧 | `mysql -e "SELECT * FROM <base>.<table>;"` |

<a id="b5"></a>

## Cours 5 — Sécurité des utilisateurs (⚠️ pas à l'examen 1 — examen final)

diapos 7-113 · 🐧 PuTTY en `root`. Les exemples reprennent les noms de la feuille d'exercices du cours 5.

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
root@mon-droplet:~# mkdir /cegep
root@mon-droplet:~# chgrp enseignant /cegep
root@mon-droplet:~# chmod 775 /cegep     # root rwx · enseignant rwx (x nécessaire pour entrer) · autres r-x
root@mon-droplet:~# su alexandre         # (nouvelle session après l'ajout au groupe, pour qu'il prenne effet)
alexandre@mon-droplet:/root$ vi /cegep/notes.txt   # fonctionne
alexandre@mon-droplet:/root$ exit
root@mon-droplet:~# su philippe
philippe@mon-droplet:/root$ touch /cegep/test.txt  # → Permission denied  ✔
```

(L'invite finit par `$` pour un compte ordinaire et par `#` pour `root`.)

### Politique de mot de passe (diapos 89-113)

```bash
root@mon-droplet:~# apt-get install libpam-pwquality            # ex. 14
root@mon-droplet:~# cat /etc/pam.d/common-password              # doit contenir : password requisite pam_pwquality.so retry=3
root@mon-droplet:~# vi /etc/security/pwquality.conf             # retirer le # et régler :
#   minlen = 8        ← longueur minimale
#   minclass = 3      ← nb de classes : minuscule, majuscule, chiffre, spécial
root@mon-droplet:~# su elizabeth
elizabeth@mon-droplet:/root$ passwd                             # « qwerty » → refusé ✔ (tester en tant qu'elle : root peut outrepasser)
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
