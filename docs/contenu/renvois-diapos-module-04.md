# Renvois diapositives — module 04 « Automatisation et surveillance »

> **Ce que c'est.** La table de correspondance **mesurée** entre chaque titre `##`/`###` de
> [`content/cours/securite-web/04-automatisation-surveillance/lecon.md`](../../content/cours/securite-web/04-automatisation-surveillance/lecon.md)
> et les diapositives réelles du support de la **séance 4** du cours 420-B10-HU d'Alexandre
> Mageau-Pétrin, plus les décks frères là où la matière de la leçon vit réellement. Produite le
> **2026-09-10**, au lot 14, **par le fil principal** — le déck de la séance 4 ne fait que 70
> diapositives, donc 70 lignes d'extrait, et la leçon 1400 lignes : les deux tiennent en une lecture.
> C'est le deuxième lot de suite où la cartographie n'a pas eu besoin d'un agent, et la règle du lot
> 13 se confirme : **c'est la taille de la SOURCE qui décide, pas la nature de la tâche.**

## 0 · Les sources, et ce qu'un `aucun` signifie exactement

| Étiquette | Cours | Ce qui a été lu | Diapos |
|---|---|---|---|
| **B10** | 420-B10-HU « Sécurisation des applications web » — le cours du site (`sujet: securite-web`) | `securite-app-web-2026/extraits/Cours04-Taches_cedulees_et_scriptage` **lu en entier**, les 7 autres décks balayés par sonde | **70** pour la séance 4 |
| **4P2** | 420-4P2-HU « Développement d'application en PHP » | les 13 extraits de `php-2026/extraits/`, balayés par sonde | — |

**21 extraits `.txt` au total**, plus les quatre feuilles d'exercices de B10
(`exercices-cours-02.txt` à `-05.txt`), produits par
`tools/supports-cours/extraire-diapositives.mjs` depuis les `.pptx`. Ils portent **une ligne par
diapositive**, préfixée de son rang de présentation entre crochets — c'est ce numéro-là, et lui
seul, qui est cité ici. Aucun agent ne lit un `.pptx`, et `WebFetch` n'est jamais employé sur un
support de cours : il invente plutôt que d'échouer.

⚠️ **Fraîcheur vérifiée avant de citer.** Le dossier `extraits/` est gitignoré et aucun gate ne le
confronte à son `.pptx` — un extrait périmé ferait pointer les renvois sur l'ancienne numérotation
(constat du 2026-09-09 sur la séance 5). Mesuré ici : le `.pptx` de la séance 4 date du 2026-08-25
13:24 ; l'extrait a été **régénéré le 2026-09-10** avant d'écrire une seule ligne de cette table, et
il rend **70 diapositives**, le même compte qu'avant.

## 1 · La mesure d'absence, en mot entier, sur les 21 extraits

La sonde est **jetable** (scratchpad, hors dépôt) et rend **une ligne par terme** :
`terme <TAB> total <TAB> deck:diapos…`, ou `AUCUN`. Deux gardes non négociables, hérités du lot 12 :
un mode **mot entier**, et le rappel qu'une mesure **transporte les hypothèses d'orthographe de
celui qui l'a lancée** — elle est un point de départ, jamais un verdict.

**Aucune occurrence, sur les 21 extraits :** `crontab -l` · `crontab -r` · `crontab -u` ·
`/etc/crontab` · `/etc/cron.d` · `cron.daily` · `MAILTO` · `flock` · `verrou` · `@reboot` ·
`@daily` · `systemd` · `timer` · `OnCalendar` · `journalctl` · `journald` · `heartbeat` ·
`signal de vie` · `seuil` · `alerte` · `escapeshellarg` · `escapeshellcmd` · `proc_open` ·
`passthru` · `disable_functions` · `injection de commande` · `fail2ban` · `logwatch` · `Netdata` ·
`Prometheus` · `Zabbix` · `supervision` · `inotify` · `logrotate` (hors bibliographies) ·
`max_execution_time` · `SAPI` · `shebang` · `getopt` · `argv` · `STDIN` · `STDERR` · `fgets` ·
`file_get_contents` · `file_put_contents` · `FILE_APPEND` · `LOCK_EX` · `auth.log` · `mysqldump` ·
`2>&1` · `/dev/null` · `/var/log` · `curl` · `tar` · `archive` · `unlink` · `glob` · `conteneur` ·
`Docker` · `idempot` · `chevauche` · `code de retour` · `moindre privilège` · `compte de service` ·
`getenv` · `variable d'environnement` · `declare(strict_types` · `is-active`.

**Présent, mais ailleurs :** `chmod` → B10 séance 5, `[63, 67, 68, 69, 77, 80]` · `chown` → séance 5,
`[63, 67, 82, 83, 84]` · `permission` → séance 5, `[67, 71, 75]` · `sudoers` → séance 5, `[8, 38-42]`
(plus la bibliographie de la séance 3) · `timedatectl` → **4P2**, `Cours08_deploiement`, `[49, 51,
52, 53]` · `php.ini` → B10 séance 10 `[96, 97]` et 4P2 `Cours03` `[11]` · `PDO` → 4P2 `Cours05` `[55]` ·
`fopen` → 4P2 `Cours03` `[47]` · `preg_match` → 4P2 `Cours03` `[64, 68]`.

**Présent dans la FEUILLE d'exercices de la séance 4, et nulle part sur une diapositive :** le
**fuseau horaire** (exercice 2). C'est la réserve R-2 ci-dessous.

🔴 **`{seance="5"}` n'est pas `{hors-cours}`, et le lot 12 a payé la confusion.** Une absence dans le
déck de **sa** séance ne dit rien du cours. Le marqueur répond à « aucune diapositive **des deux
cours** ne porte cette section » ; s'en tenir au déck de la séance produirait une **promesse
d'exclusion** — le pire des deux échecs symétriques, parce qu'elle fait choisir à l'étudiant ce
qu'il ne révise pas. Et le module 04 est le **dernier de la portée de l'Examen 1**
(`horaire.json`, séance 6, `portee: [1, 2, 3, 4]`).

## 2 · La table — 32 titres, 0 muet

| Titre (dépouillé) | Renvoi posé | Ce que portent les diapositives citées |
|---|---|---|
| `## L'idée en une image` | `{diapos="5, 9, 10"}` | [5] automatiser sert à la sécurité **et** à l'entretien · [9] la liste des rôles d'un script · [10] « on doit définir les moments auxquels ces scripts doivent s'exécuter : c'est ce qu'on appelle un crontab » |
| `## En bref — la marche à suivre` | `{hors-cours}` | la marche à suivre est une construction de la leçon |
| `## Pourquoi automatiser : le rôle du scriptage` | `{diapos="5, 7-11"}` | [8] programmer l'environnement et non l'application · [9] les cinq besoins, un par ligne du tableau de la leçon · [10] les langages · [11] le plan de la séance |
| `## Crontab : cinq champs et une commande` | `{diapos="12, 13, 17"}` | [13] `crontab -e` · [17] « crontab est un fichier de texte qui contient la liste des commandes », vérification **une fois par minute**, pas d'intervalle inférieur |
| `### Les trois commandes à connaître` | `{diapos="13-16"}` | [13] `crontab -e` · [14] le choix de l'éditeur (`vim.basic`) · [15] écrire les expressions · [16] `Échap` puis `:wq`. 🔴 **Renvoi volontairement borné** : `-l`, `-r`, `-u` et la sauvegarde ne sont **sur aucune** diapositive, et un paragraphe de la section le dit |
| `### La syntaxe : cinq champs, puis la commande` | `{diapos="18-32"}` | [18] la forme générale · [19] les cinq champs et l'astérisque · [20] le schéma · [21] deux exemples · [22]-[25] valeurs multiples, plage, intervalle · [26]-[32] les six cas typiques |
| `### Lire une expression : les quatre du cours` | `{diapos="33-37"}` | l'exercice de groupe, dévoilé une réponse par diapositive ; [37] porte les quatre réponses. **Section créée par ce lot** : ces cinq diapositives n'étaient atteignables par aucun titre |
| `### Quand une seule expression ne suffit pas` | `{diapos="43, 44"}` | [43] « exécuter votre script plus souvent et ajouter des validations » · [44] l'exemple `*/15` avec sortie anticipée |
| `## Rediriger la sortie : sans journal, pas de surveillance` | `{diapos="21, 57, 63"}` | [21] la **seule** redirection montrée du paquet, un chevron simple vers `resultat.txt` · [57] et [63] « on voit la trace dans le fichier log ». 🔴 `>>`, `2>&1` et `/dev/null` : **aucune** occurrence, et la section le dit en toutes lettres |
| `### Le courriel de cron` | `{hors-cours}` | `MAILTO`, `PATH`, `SHELL` en tête de crontab : **aucune** occurrence |
| `## Où vivent les tâches : trois emplacements, un champ de différence` | `{hors-cours}` | `/etc/crontab`, `/etc/cron.d`, `/etc/cron.daily` : **aucune** occurrence. Le cours ne connaît que la crontab utilisateur |
| `## Les pièges de cron que le cours ne couvre pas` | `{hors-cours}` | environnement minimal, répertoire courant, `%`, chevauchement, heure avancée, échec silencieux : **aucune** occurrence. Réserve R-2 ci-dessous pour le fuseau horaire |
| `## PHP en ligne de commande` | `{diapos="46-50"}` | [47] les langages de script · [48] `php < chemin du fichier >` et son exemple · [49] la capture · [50] la même commande dans une crontab. 🔴 Le reste de la section (deux `php.ini`, `$argv`, code de retour, shebang) est mesuré **absent**, et la section le dit |
| `### Lire un journal ligne à ligne` | `{diapos="6, 11"}` | [6] le plan annoncé du cours, qui nomme le **« Traitement des fichiers »** · [11] le plan **révisé**, qui ne garde que crontab et le scriptage PHP. Le sujet est annoncé puis abandonné : c'est ce que ce renvoi dit, et rien d'autre |
| `## Surveiller un service et le relancer` | `{diapos="58-63"}` | [59] un service peut « planter » · [60] créer un script et le planifier · [61] `/crontabDemo/surveillerApache.php` et sa crontab · [62] l'explication ligne à ligne · [63] la trace horodatée |
| `## Les scripts qui suppriment` | `{diapos="51-53"}` | [51] les deux cas typiques annoncés · [53] supprimer les données trop vieilles |
| `### Trois règles avant d'écrire une seule ligne de suppression` | `{diapos="55"}` | [55] le `SELECT` posé **avant** le `DELETE`, sur le même filtre — c'est la règle n° 1. 🔴 Les deux autres règles sont **hors cours**, et un paragraphe de la section le nomme |
| `### Le cas du cours : purger une table` | `{diapos="54-57"}` | [54] la table `fichierImporte` de la base `demonstration` · [55] les deux requêtes `DATE_ADD` · [56] le script, la crontab, « une suppression chaque minute est inutile » · [57] la vérification |
| `### La version que l'on met en production` | `{hors-cours}` | PDO, `getenv`, mode simulation, filtre unique : **aucune** occurrence dans B10 (`PDO` existe en 4P2 séance 5 `[55]`, dans un tout autre propos) |
| `## shell_exec et l'injection de commande OS` | `{diapos="6, 62, 70"}` | [6] « Exécution de commande Linux (`shell_exec`) » au plan annoncé · [62] la ligne 3 du script du cours, « on exécute une commande » · [70] la bibliographie, qui cite le manuel PHP de `shell_exec` |
| `### La faille, sur l'exemple le plus court possible` | `{hors-cours}` | `injection de commande` : **aucune** occurrence sur les 21 extraits. Le mot « injection » existe (séances 1, 7, 10), toujours pour SQL ou XSS |
| `## Permissions du script planifié` | `{seance="5" diapos="38-42, 63, 67-71, 74-77, 82-84"}` | [38]-[42] le fichier `sudoers`, sa syntaxe `<Qui> <Hôte> <Options> <Commande>` · [63] `ls -l`/`chmod`/`chown`/`chgrp` · [67]-[71] permissions, propriétaire, groupe, bits d'accès · [74]-[77] la notation numérique · [82]-[84] `chown` |
| `## Alternatives et arbitrages` | `{hors-cours}` | le cours ne compare aucune alternative |
| `### Quatre façons de planifier` | `{hors-cours}` | `systemd`, `timer`, `OnCalendar`, `CronJob`, `conteneur` : **aucune** occurrence |
| `### Surveiller : script maison ou outil déjà écrit` | `{hors-cours}` | `fail2ban`, `logwatch`, Netdata, Prometheus, Zabbix : **aucune** occurrence |
| `### Le langage du script` | `{diapos="10, 47"}` | [10] « PHP, Python, Bash, Perl, etc. » · [47] « PHP, Python, Perl, ou autres ». 🔴 Le cours **nomme** les langages, il ne les compare jamais — la section le dit avant son tableau |
| `### Quand ne PAS planifier une tâche` | `{hors-cours}` | `inotify`, `logrotate`, file de messages : **aucune** occurrence |
| `## Exemple simple` | `{diapos="21"}` | [21] `30 12 1 6 * php script.php > /resultatCrontab/resultat.txt` — la colonne vulnérable de la comparaison est cette ligne, chemins relatifs et chevron simple compris |
| `## Exemple complet` | `{diapos="48, 62"}` | [48] `php /mesScripts/copieDeSauvegarde.php` — le scénario de sauvegarde vient de là · [62] le `shell_exec` sur une chaîne construite. Un paragraphe de la section dit ce que le cours porte et ce qu'il ne porte pas |
| `## À toi de jouer` | `{hors-cours}` | les sept énoncés sont sur la feuille d'exercices de la séance, pas sur une diapositive |
| `## À retenir` | `{diapos="21, 55, 62, 66"}` | [21] la redirection · [55] compter avant de supprimer · [62] le test d'état du script de surveillance · [66] le résumé du cours |
| `## Aller plus loin` | `{diapos="38, 68, 70"}` | [38] `crontab.guru/examples.html` · [68] « au prochain cours, la sécurité liée aux utilisateurs » · [70] les quatre références du cours |

### L'encadré qui porte un renvoi, en plus des titres

| Encadré | Renvoi | Pourquoi |
|---|---|---|
| `::: cours` de la méthode de travail (`### La syntaxe`) | `{diapos="38-42"}` | [38] l'adresse de `crontab.guru` · [39] cliquer un exemple · [40] modifier l'expression et lire la phrase · [41] « Next » et les prochaines dates · [42] « random ». C'était un `::: complement` : c'est de la matière du cours, et il occupe cinq diapositives |
| `::: correction-du-cours` du sixième champ | `{diapos="31"}` | [31] « Cas #5 : Tous les samedis à 3 heures du matin — `0 3 * * * 6` », **six** champs. Les cinq autres cas de la série sont justes. C'était un `::: attention` qui décrivait la faute **sans nommer sa source** |

## 3 · Les diapositives non citées, et pourquoi

**[1]-[4], [7], [12], [45], [46], [52], [58], [64], [65], [67], [69]** — treize diapositives de
**titre, de transition ou de clôture** : le titre du cours, le rappel de la séance précédente, les
cinq titres de section, les deux « voici qui termine notre section », le titre « Conclusion », le
titre « Prochain cours », et « Questions? ». Aucune ne porte d'enseignement.

**Les cinquante-sept autres sont toutes atteignables par au moins un titre.** C'est le deuxième sens
de la vérification, celui que le lot 13 a dû ajouter en revue : une cartographie vérifie que chaque
renvoi est **juste**, et **aussi** que chaque diapositive du déck est **atteignable**. Ici c'est ce
second sens qui a fait naître `### Lire une expression : les quatre du cours` — les diapositives 33
à 37, l'exercice de groupe du cours, n'étaient citées par aucun titre et ne vivaient nulle part dans
la leçon.

## 4 · Les réserves de ce lot

**R-1 — une promesse d'exclusion en tête de leçon.** L'encadré `::: complement` de
`## L'idée en une image` écrivait, à propos de la lecture de fichier : « tu n'en seras pas évalué,
mais sans elle tu ne peux écrire aucun script de surveillance réel ». La promesse porte sur le
**contenu de l'examen**, que ce dépôt n'est pas en position de tenir — exactement la réserve R-2 du
lot 13, sur un autre module. Remplacée par la **mesure** : la diapositive 6 annonce le traitement de
fichiers, la 11 le retire du programme, et aucune démonstration n'est donnée. Deux autres promesses
du même genre ont été retirées dans la foulée (« ne compte pas dessus à l'examen » pour les
raccourcis `@`, « à l'examen, `0` pour dimanche reste sans risque »).

**R-2 — `{hors-cours}` sur « Les pièges de cron », alors qu'un des sept pièges a un ancrage
ailleurs.** Le réglage du fuseau horaire (`timedatectl`) est **l'objet de l'exercice 2** de la
feuille de la séance, et il est enseigné en diapositives dans le **cours de PHP** (4P2, séance 8,
diapositives 49 à 53). Les six autres pièges — environnement minimal, répertoire courant, `%`,
chevauchement, heure avancée, échec silencieux — sont mesurés absents partout. **Arbitrage :** le
marqueur est conservé, parce qu'aucune diapositive de la séance 4 ne porte l'un des sept, et la
prose du piège n° 6 **nomme** les deux ancrages au lieu de les taire. Cousin de la réserve du module
03 sur `{diapos="78"}`, une diapositive de bibliographie : **la grammaire des renvois ne distingue
pas aujourd'hui une provenance partielle d'une provenance pleine.**

**R-3 — le champ jour-de-semaine, écrit `0-6` par le cours.** La diapositive 19 donne « Jour de la
semaine (0-6) » ; `crontab(5)` donne `0-7`, `0` et `7` valant tous deux dimanche. Ce n'est pas une
erreur — écrire `0` reste juste — mais la leçon l'attribuait à « beaucoup de mémentos » sans nommer
sa source. Corrigé en nommant la diapositive.

**R-4 — le sixième champ de la diapositive 31 était décrit sans être attribué.** La leçon écrivait
« On voit parfois `0 3 * * * 6` » : c'est le cas n° 5 du cours, mot pour mot. Une faute du support
décrite en la déguisant en usage général prive l'étudiant du seul renseignement utile — **la
diapositive qu'il révisera contient l'erreur**. Devenu un `correction-du-cours` avec sa source.

**R-5 — trois titres portaient du code en ligne.** `` `crontab` ``, `` `cron` ``, `` `shell_exec` ``
dans un `##`. Le pipeline **ne rend pas** le code en ligne dans un titre — ni dans le `<h2>`, ni au
sommaire : le lecteur voit les accents graves (défaut nommé au `CLAUDE.md`, non corrigé). Les trois
titres ont été dépouillés, comme au module 11. **Le défaut de rendu, lui, reste ouvert.**

## 5 · Ce que ce lot laisse ouvert

- **Les affirmations POSITIVES sur le contenu de l'examen subsistent** — « c'est la réponse du cours
  et elle est attendue à l'examen », « à l'examen, la réponse attendue est `crontab` », « de la
  matière d'examen telle quelle ». Ce lot n'a retiré que les promesses d'**exclusion**, parce que ce
  sont elles qui font choisir à l'étudiant ce qu'il ne révise pas. Les positives errent dans l'autre
  sens — elles font réviser davantage — mais elles restent des affirmations sur un examen que ce
  dépôt n'écrit pas. **Nœud laissé au propriétaire : faut-il les réancrer toutes sur « le cours »,
  sur les dix modules à la fois ?**
- **`### Lire un journal ligne à ligne` cite `{diapos="6, 11"}`, deux diapositives de PLAN.** Au
  sommaire, la mention se lira comme une provenance de matière, alors que [6] annonce un sujet et
  [11] le retire. La section l'explique ; le sommaire, lui, ne le porte pas. Même famille que la
  diapositive de bibliographie du module 03.
- **Le libellé d'un volet `methodes` est interpolé nu** (`{{ volet.libelle }}`) : des accents graves
  y sortiraient littéralement. Le conteneur écrit par ce lot n'en met aucun, mais c'est la deuxième
  surface du défaut R-5 — et elle reste ouverte.
