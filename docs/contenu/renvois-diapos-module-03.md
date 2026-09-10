# Renvois diapositives — module 03 « Sécurité de la communication serveur »

> **Ce que c'est.** La table de correspondance **mesurée** entre chaque titre `##`/`###` de
> [`content/cours/securite-web/03-communication-serveur/lecon.md`](../../content/cours/securite-web/03-communication-serveur/lecon.md)
> et les diapositives réelles du support de la **séance 3** du cours 420-B10-HU d'Alexandre
> Mageau-Pétrin, plus les décks frères là où la matière de la leçon vit réellement. Produite le
> **2026-09-10**, au lot 13, **par le fil principal** — le déck de la séance 3 ne fait que 78
> diapositives, donc 78 lignes d'extrait : il tient en une lecture, et la cartographie n'avait pas
> besoin d'un agent (au lot 12, elle avait coûté 213k pour un document de 392 lignes).

## 0 · Les sources, et ce qu'un `aucun` signifie exactement

| Étiquette | Cours | Ce qui a été lu | Diapos |
|---|---|---|---|
| **B10** | 420-B10-HU « Sécurisation des applications web » — le cours du site (`sujet: securite-web`) | `securite-app-web-2026/extraits/Cours03-Securite_communication_serveur` **lu en entier**, les 7 autres décks balayés par sonde | **78** pour la séance 3 |
| **4P2** | 420-4P2-HU « Développement d'application en PHP » | les 13 extraits de `php-2026/extraits/`, balayés par sonde | — |

**21 extraits `.txt` au total** : 8 pour B10, 13 pour 4P2, produits par
`tools/supports-cours/extraire-diapositives.mjs` depuis les `.pptx`. Ils portent **une ligne par
diapositive**, préfixée de son rang de présentation entre crochets — c'est ce numéro-là, et lui
seul, qui est cité ici. Aucun agent ne lit un `.pptx`, et `WebFetch` n'est jamais employé sur un
support de cours : il invente plutôt que d'échouer.

⚠️ **Fraîcheur vérifiée avant de citer.** Le dossier `extraits/` est gitignoré et aucun gate ne le
confronte à son `.pptx` — un extrait périmé ferait pointer les renvois sur l'ancienne numérotation
(constat du 2026-09-09 sur la séance 5). Mesuré ici : l'extrait de la séance 3 date du 2026-08-25
16:07, son `.pptx` du 2026-08-24 13:43. L'extrait est postérieur, sur les 16 décks des deux cours.

🔵 **Correction à ce qu'écrit la cartographie du module 01.** Elle dit que « les exercices de B10
n'ont pas d'extrait ». C'est faux : `securite-app-web-2026/exercices-cours-02.txt`, `-03`, `-04` et
`-05` existent — hors du dossier `extraits/`, donc hors de la sonde, et `-05` est **vide**. La
feuille de la séance 3 a été lue en entier pour ce lot. Un `aucun` de cette table signifie donc :
*absent des 21 extraits de diapositives **et** de la feuille d'exercices de la séance 3*.

## 1 · La mesure d'absence, en mot entier, sur les 21 extraits

La sonde est **jetable** (scratchpad, hors dépôt) et rend **une ligne par terme** :
`terme <TAB> total <TAB> deck:diapos…`, ou `AUCUN`. Deux gardes non négociables, hérités du lot 12 :
un mode **mot entier** (sans lui, `vi` remonte 191 diapositives — vie, avis, service, vider), et le
rappel qu'une mesure **transporte les hypothèses d'orthographe de celui qui l'a lancée** : elle est
un point de départ, jamais un verdict.

**Aucune occurrence, sur les 21 extraits :** `sshd_config` · `sshd` · `PermitRootLogin` ·
`PasswordAuthentication` · `PubkeyAuthentication` · `authorized_keys` · `.ssh` · `ssh-copy-id` ·
`ssh-agent` · `Pageant` · `fail2ban` · `auth.log` · `nmap` · `ed25519` · `RSA` · `ECDSA` · `VPN` ·
`nftables` · `WAF` · `console web` · `REJECT` · `timeout` · `moindre privilège` · `clé de secours`.

**Présent, mais ailleurs :** `chmod` → B10 séance 5, `[63, 67, 68, 69, 77, 80]` · `chown` → séance 5,
`[63, 67, 82, 83, 84]` · `permission` → séance 5, `[8, 34, 51, 66, 67, 70, 71, 75]` · `apache` →
séances 4, 5, 9, 10 et 4P2, **jamais en séance 3** · `passphrase` → séance 10 `[57, 58]`, mais au
sens d'un **mot de passe long**, pas d'une clé chiffrée · `algorithme` → séances 1 et 10, au sens de
la force brute et du chiffrement, jamais du choix d'un algorithme de clé SSH.

🔴 **`{seance="5"}` n'est pas `{hors-cours}`, et le lot 12 a payé la confusion.** Une absence dans le
déck de **sa** séance ne dit rien du cours. Le marqueur répond à « aucune diapositive **des deux
cours** ne porte cette section » ; s'en tenir au déck de la séance produirait une **promesse
d'exclusion** — le pire des deux échecs symétriques, parce qu'elle fait choisir à l'étudiant ce
qu'il ne révise pas. Et le module 03 est dans la **portée de l'Examen 1** (`horaire.json`, séance 6,
`portee: [1, 2, 3, 4]`).

## 2 · La table — 27 titres, 0 muet

| Titre (dépouillé) | Renvoi posé | Ce que portent les diapositives citées |
|---|---|---|
| `## L'idée en une image` | `{diapos="9, 10"}` | [9] le brute force sur le mot de passe · [10] la clé en deux parties |
| `## En bref — la marche à suivre` | `{hors-cours}` | la marche à suivre est une construction de la leçon |
| `## Pourquoi le mot de passe ne suffit pas` | `{diapos="8, 9"}` | [8] « nous avons toujours utilisé l'authentification par mot de passe » · [9] pourquoi c'est moins sécuritaire |
| `## La paire de clés : deux fichiers, un seul secret` | `{diapos="10"}` | [10] clé publique sur le serveur, clé privée chez l'administrateur |
| `## Générer la paire de clés` | `{diapos="14-19"}` | [14]-[19] le dossier, `cmd`, `ssh-keygen`, le nom, la phrase de sécurité, les deux fichiers |
| `### La séquence du cours, telle qu'elle se déroule à l'écran` | `{diapos="14-19"}` | idem — la section transcrit cette séquence |
| `### Convertir la clé pour PuTTY` | `{diapos="20-26"}` | [20] le renommage · [21]-[26] PuTTYgen, *Load*, *Save private key*, `clePutty.ppk` |
| `### Se connecter au droplet` | `{diapos="31-43"}` | [31]-[34] PuTTY : *Connection / SSH / Auth*, *Browse*, *Session*, la mise en cache de la clé du serveur · [35]-[37] `root`, le mot de passe, « Et voilà! Vous êtes connecté! » · [38]-[43] la même configuration pour WinSCP. **Section créée par la revue** : ces douze diapositives n'étaient atteignables par aucun renvoi de titre |
| `### Quel algorithme choisir` | `{hors-cours}` | `ed25519`, `RSA`, `ECDSA` : **aucune** occurrence sur les 21 extraits. Le cours ne choisit pas, il hérite du défaut |
| `### La passphrase, et pourquoi elle ne se tape pas cent fois` | `{diapos="18, 23"}` | [18] « entrer une phrase de sécurité deux fois (vous ne la verrez pas s'afficher) » · [23] la ressaisie dans PuTTYgen |
| `## Déposer la clé publique sur le serveur` | `{diapos="11-13, 27-29"}` | [11]-[13] *SSH Keys* / *New SSH Key* à la création du droplet · [27]-[29] coller `maCle.pub`, nommer, *Add SSH Key* |
| `### La voie du cours : la coller dans DigitalOcean` | `{diapos="11-13, 27-29"}` | idem |
| `### Les permissions, non négociables` | `{seance="5" diapos="63, 69-71, 75-77, 82-84"}` | [63] `ls -l`/`chmod`/`chown`/`chgrp` · [69]-[71] la syntaxe et les bits d'accès · [75]-[77] la notation numérique · [82]-[84] `chown` |
| `## Durcir la configuration du serveur SSH` | `{hors-cours}` | `sshd_config` et ses directives : **aucune** occurrence, ni sur les 21 extraits ni dans une feuille d'exercices |
| `### L'ordre des opérations, ou comment ne pas s'enfermer dehors` | `{hors-cours}` | idem — la procédure entière est de la base de connaissances |
| `## Changer le port SSH : ce que ça vaut vraiment` | `{diapos="78"}` | [78] la bibliographie, qui renvoie encore à un article sur le changement de port. **Aucune** autre diapositive du paquet republié n'en traite |
| `## Un service à protéger : le serveur web` | `{diapos="64, 69"}` | [64] « J'ai un site avec une page web active » · [69] la page redevenue indisponible. L'installation d'Apache, elle, est sur la **feuille d'exercices** (exercice 2), pas sur une diapositive |
| `## Le pare-feu UFW` | `{diapos="44-46, 51"}` | [44]-[45] `iptables` trop complexe, UFW la façade · [46] le plan de la section · [51] `apt-get install ufw` |
| `### Comment UFW décide du sort d'un paquet` | `{diapos="47, 61"}` | [47] actif ou inactif · [61] `deny` bloque, `allow` laisse passer. L'ordre d'évaluation, la politique par défaut, `LIMIT` et la distinction `DROP`/`REJECT` sont de la base de connaissances |
| `### Les commandes` | `{diapos="47, 48, 51, 55, 58, 61, 64, 68"}` | `status` · `enable`/`disable` · l'installation · `status numbered` et `delete <numéro>` · `reset` · la syntaxe · le filtrage des ports · le filtrage des protocoles. 🔴 **Le renvoi ne vaut que pour la première moitié du bloc de commandes** : `ufw default`, `ufw limit`, `status verbose`, le profil `OpenSSH` et `delete allow 80/tcp` ne sont sur **aucune** diapositive — un paragraphe de la section le dit maintenant |
| `### La démonstration du cours, sortie par sortie` | `{diapos="47-50, 55-57, 64-66, 69-71"}` | la séquence de captures, dans son ordre : `status inactive` → `enable` → `status active` → `numbered` → `delete 4` → `deny 80` → `allow 80` → `allow http` → « ça revient au même » |
| `## Ce que le cours ne dit pas, et qui compte` | `{hors-cours}` | `fail2ban`, `auth.log`, le pare-feu du fournisseur, WireGuard/Tailscale : **aucune** occurrence |
| `## Exemple simple` | `{diapos="49"}` | [49] « N'oubliez surtout pas l'activation de ssh, sinon vous pourriez ne plus pouvoir accéder à votre serveur… » — c'est exactement le contraste des deux colonnes |
| `## Exemple complet` | `{diapos="30, 35, 49"}` | [30] compléter la création du droplet et relever l'adresse IP · [35] `root` comme code utilisateur · [49] la séquence UFW du cours |
| `## À toi de jouer` | `{hors-cours}` | les quatre énoncés sont sur la feuille d'exercices de la séance, pas sur une diapositive |
| `## À retenir` | `{diapos="9, 10, 18, 49, 78"}` | une diapositive par puce, dans l'ordre des puces |
| `## Aller plus loin` | `{diapos="72, 78"}` | [72] le tutoriel UFW de DigitalOcean · [78] la bibliographie complète |

## 3 · Les cinq réserves que la mesure a levées, et ce qu'elles apprennent

**R-1 — un renvoi d'encadré pointait six diapositives qui parlent d'autre chose.** L'encadré
`::: cours` du changement de port SSH portait `{diapos="45, 46, 47, 48, 49, 50"}`. Dans le paquet
**republié** de 78 diapositives, ces six-là traitent d'**UFW**. L'encadré disait lui-même, deux
lignes plus bas, que la section avait disparu du paquet — le renvoi et sa propre prose se
contredisaient. ⚠️ **Un renvoi survit à la republication du support qui l'a justifié**, et rien ne
rougit : la grammaire de `diapos` contrôle la forme des jetons, jamais leur sens.

**R-2 — deux promesses d'exclusion.** « Tu ne seras pas évalué dessus » et « elles ne sont pas
exigibles à l'examen », toutes deux à propos de `sshd_config`. La matière est bien absente partout,
mais **la promesse porte sur le contenu de l'examen**, que ce dépôt n'est pas en position de tenir :
la diapositive [6] de la séance 1 écrit que l'examen porte sur « les notes **et les exercices** ».
Remplacées par la **mesure d'absence** — un fait — et par un renvoi au marqueur `{hors-cours}` du
titre, qui dit la même chose sans rien promettre.

**R-3 — l'attribution des droits d'accès à la mauvaise séance.** « La logique est celle de la séance
précédente » : mesuré, `chmod` et `chown` sont la matière de la **séance 5**. Exactement le constat
du lot 12, sur un autre module — et il devenait une **contradiction interne** au moment même où le
titre recevait `{seance="5" …}`, dans le même commit, sans qu'aucun diff ne rapproche les deux.

**R-4 — une diapositive citée à un rang près.** L'encadré de l'exercice 1 citait la diapositive 37
pour l'invite `Passphrase for key …`. [36] dit « Entrer votre mot de passe », [37] dit « Et voilà!
Vous êtes connecté! ». Le libellé exact de l'invite est **dans l'image**, que l'extrait ne voit pas :
la citation a été remplacée par le **texte mesuré** de [36], qui porte le même enseignement — le
cours fait bien saisir « un mot de passe » là où il vient de promettre qu'il n'y en aurait plus.

**R-5 — une borne basse trop courte.** L'encadré de la démonstration UFW commençait à [56] alors que
`ufw status numbered`, dont la section parle en premier, est introduit à **[55]**.

## 3bis · Ce que la revue à regard neuf a ajouté à cette table — et qui la contredisait

🔴 **UN RENVOI DE TITRE EST UN JUGEMENT DE PROVENANCE DANS LES DEUX SENS, et cette table ne
regardait que l'un des deux.** Elle vérifiait, pour chaque titre, que les diapositives citées
portent bien la matière de la section. Elle n'a pas vérifié la réciproque : que **tout** ce que la
section enseigne soit porté par ces diapositives. La revue a trouvé les deux échecs.

**Sur-attribution — `### Les commandes`.** Le bloc de commandes contient cinq formes que le cours ne
montre nulle part (`ufw default deny/allow incoming/outgoing`, `ufw limit`, `ufw status verbose`, le
profil applicatif `OpenSSH`, `ufw delete allow 80/tcp`). Le renvoi les faisait toutes passer pour de
la matière du cours. ⚠️ **Aggravant : le lot avait SUPPRIMÉ, en tête de leçon, la phrase qui
qualifiait `ufw limit` et `~/.ssh/config` de compléments** — la même passe posait le renvoi positif
et retirait le correctif de provenance. **La leçon L-101 a donc une deuxième face : le recensement
d'une classe d'affirmation doit couvrir les lignes SUPPRIMÉES du diff, pas seulement les lignes
intactes du fichier.**

**Sous-attribution — les diapositives 31 à 43.** Douze diapositives du cours, soit toute la
connexion PuTTY et toute la configuration WinSCP, n'étaient citées par **aucun** titre : elles ne
vivaient que dans le conteneur d'onglets, placé sous un titre qui ne parlait que de la conversion.
⚠️ **Un titre muet fait rougir le gate ; un titre dont le renvoi est trop ÉTROIT ne fait rougir
personne** — et la leçon promettait, en tête de page, que « les renvois disent lesquelles viennent
du cours ». D'où la section neuve `### Se connecter au droplet`.

**Une contradiction remontée en tête de page, pas créée par le lot.** La marche à suivre affirmait
qu'un droplet créé avec une clé « naît en clé seulement » ; `## Exemple complet` affirmait l'inverse
sur le même scénario. La contradiction préexistait entre deux sections éloignées ; le résumé
actionnable l'a portée en tête. Tranchée par la **source** : la documentation DigitalOcean écrit
*« Password authentication is disabled by default on Droplets created with an SSH key »*, et la
valeur vit dans `/etc/ssh/sshd_config.d/50-cloud-init.conf` — le fichier inclus dont la leçon parle
déjà. ⚠️ **Le format actionnable fait remonter les contradictions latentes d'une leçon**, parce
qu'un résumé met en voisinage immédiat des affirmations que six cents lignes séparaient.

## 4 · Ce que ce lot laisse ouvert

- **`### Quel algorithme choisir` porte `{hors-cours}` et son tableau dit « ce que produit la
  commande du cours ».** Ce n'est pas une contradiction : le **choix** d'un algorithme n'est enseigné
  nulle part, et l'`+---[RSA 3072]----+` qui prouve le défaut du cours vit dans **l'image** de la
  diapositive [18] — invisible à l'extrait, et déjà cité par le `correction-du-cours` de la section
  précédente, qui porte son propre renvoi.
- **`## Changer le port SSH` cite la diapositive 78, qui est une BIBLIOGRAPHIE.** Au sommaire, la
  mention se lira comme une provenance de matière, alors que [78] ne fait que porter un lien vers un
  article extérieur. L'encadré de la section l'explique ; le sommaire, lui, ne le porte pas.
  `{hors-cours}` serait pire — ce serait une promesse d'exclusion sur un sujet que la leçon dit
  elle-même « plausible à l'examen ». **Accepté en l'état ; la grammaire des renvois ne distingue pas
  aujourd'hui une diapositive de matière d'une diapositive de références.**
- **L'objectif 3 du frontmatter** (« Modifier `sshd_config` pour interdire le mot de passe… ») annonce
  une compétence bâtie sur une matière mesurée **absente du cours**. La leçon l'enseigne délibérément,
  et le marqueur `{hors-cours}` le dit au lecteur — mais la liste d'objectifs, elle, ne distingue pas
  ce qui vient du cours de ce qui vient de la base de connaissances. **Nœud laissé au propriétaire.**
