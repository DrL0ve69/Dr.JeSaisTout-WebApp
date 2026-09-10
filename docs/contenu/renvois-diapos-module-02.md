# Renvois diapositives — module 02 « Gestion d'environnement infonuagique »

> **Ce que c'est.** La table de correspondance **mesurée** entre chaque titre de
> [`content/cours/securite-web/02-environnement-linux/lecon.md`](../../content/cours/securite-web/02-environnement-linux/lecon.md)
> (953 lignes) et les diapositives réelles du support de la **séance 2** du cours 420-B10-HU
> d'Alexandre Mageau-Pétrin, plus les décks frères là où la matière de la leçon vit réellement.
> Produite le **2026-09-09**. Elle est la matière première d'une réécriture des renvois
> `{diapos="…"}` ; elle ne modifie ni la leçon ni aucun autre fichier.
>
> **Pourquoi elle existe.** Le module 02 est celui qui **renvoie le plus de matière vers la base de
> connaissances** : deux encadrés `::: complement` déclarent que les permissions, `chmod`, `chown`,
> `apt`, `systemctl` et les journaux « ne sont pas dans les diapositives de la séance 2 » et
> « viennent de la base de connaissances », et le premier ajoute que « tu ne seras pas évalué
> dessus ». La première moitié de l'affirmation est **exacte** — mesurée : `permission` 0, `chmod` 0,
> `apt` 0, `systemctl` 0 dans le déck de la séance 2. La seconde est **fausse**, et c'est le constat
> le plus coûteux de ce document : ces sujets ne viennent pas de la KB, ils viennent de la
> **séance 5 du même cours**, qui leur consacre une trentaine de diapositives. La leçon dit à
> l'étudiant qu'il n'aura pas à réviser de la matière d'examen.

## 0 · Les sources, et ce qu'elles valent

| Étiquette | Cours | Extraits lus | Diapos |
|---|---|---|---|
| **B10** | 420-B10-HU « Sécurisation des applications web » — le cours du site (`sujet: securite-web`) | `securite-app-web-2026/extraits/Cours02_environnement_linux` (déck de référence, **lu en entier**), plus `Cours01-Introduction…`, `Cours03-Securite_communication_serveur`, `Cours04-Taches_cedulees_et_scriptage`, `Cours05_Securite_utilisateurs`, `Cours07_securite_app_web`, `Cours09-Securite_base_de_donnees`, `Cours10-mecanisme_protection_authentification` (balayés par sonde, lignes citées ouvertes une à une) | **82** pour la séance 2 |
| **4P2** | 420-4P2-HU « Développement d'application en PHP » | les 13 extraits de `php-2026/extraits/` — 7 décks de cours, 5 fichiers d'exercices, l'énoncé du projet de session (balayés) | — |

**21 extraits `.txt` au total** : 8 pour B10, 13 pour 4P2. Ils portent **une ligne par diapositive**,
préfixée de son **rang de présentation** entre crochets — c'est ce numéro-là, et lui seul, qui est
cité ici. Ils sont produits par `tools/supports-cours/extraire-diapositives.mjs` depuis les `.pptx` :
ni lecture d'un `.pptx` par un agent, ni reconstitution, ni consultation en ligne. Réserves de
provenance : `php-2026/extraits/PROVENANCE.md`.

**Ce que la mesure ne couvre pas — et il faut le lire avant toute cellule `aucun`.**

1. **Les exercices de B10 n'ont pas d'extrait de diapositives** (`php-2026/` en a cinq,
   `securite-app-web-2026/` aucun). Or la diapositive [6] du déck de la **séance 1** écrit « Tout le
   contenu de l'examen se trouve dans les notes **et les exercices** ». Un `aucun` de cette table
   signifie donc exactement : *absent des 21 extraits de diapositives*, jamais *absent du cours*.
   Les **treize énoncés** de la séance 2 sont en revanche disponibles dans le dépôt, reformulés, en
   [`content/cours/securite-web/exercices.json`](../../content/cours/securite-web/exercices.json) —
   ils sont cités ici quand ils tranchent (voir **R-3** et **R-11**).
2. 🔴 **Un extrait ne porte que le TEXTE d'une diapositive.** Une capture d'écran — et le déck de la
   séance 2 en est fait pour moitié : [27]-[30] PuTTY, [43]-[49] les arbres de `cd`, [51]-[53] `ls`,
   [59]-[61] `rm`, [69]-[74] `vi` — ne laisse **aucune trace** dans l'extrait. Quatre affirmations de
   la leçon portent sur ce que montre une capture (`pwd` répond `/root`, le message
   `cannot remove: Is a directory`, la page « It works! », le fichier `index.html`) : elles sont
   **non mesurables**, ni confirmées ni infirmées, et cette table le dit plutôt que de trancher.
3. ⚠️ **Une absence mesurée dépend de l'orthographe cherchée, et la mesure de base en portait une
   fausse.** `on-premise` y sort `AUCUN` ; le déck écrit « On Premise », **sans trait d'union**, à la
   diapositive [9]. Remesuré ici : **2 occurrences** (B10-02 [9], 4P2-08 [9]). Même famille :
   `chemin relatif` sort `AUCUN` parce que le cours dit « **adresse** relative » ([40]). Avant
   d'écrire `{hors-cours}` sur la foi d'un `AUCUN`, chercher la **variante orthographique du cours**.

**Lecture des colonnes.**

- **`Cours`** — `B10`, `4P2`, `les deux`, ou **`aucun`**. `aucun` n'est pas un échec de recherche :
  c'est un résultat. Une section marquée `aucun` avec une confiance `certaine` signifie que les
  termes **nommés dans la cellule** ont été cherchés dans les **21 extraits**, sans distinction de
  casse ni d'accent, et n'y figurent pas.
- **`Séance`** — le rang du cours dans son propre calendrier, pas le numéro de module du site.
- **`Diapos`** — numéros et plages, virgules, strictement croissants.
- **`Ce que la diapositive porte`** — quelques mots **réellement présents** dans la ligne `[n]`.
  Le renvoi se vérifie en ouvrant l'extrait, sans croire cette table sur parole.
- **`Confiance`** — `certaine` (la diapositive traite explicitement le sujet de la section, ou
  l'absence est mesurée) · `partielle` (elle l'effleure, ou le sujet est réparti).
- **`Renvoi à écrire`** — l'attribut littéral, prêt à copier en fin de ligne de titre. Il suit la
  grammaire de [`ancrage-au-cours.md`](ancrage-au-cours.md) §3bis : `diapos` seul = la séance du
  frontmatter (ici la **2**) ; `seance="N"` = une autre séance du même cours ; `cours="…"` = un autre
  cours, et il rend `seance` obligatoire ; `{hors-cours}` = marqueur sans valeur, exclusif des trois.
  ⚠️ **Le marqueur ne se pose que sur un titre de niveau 2 ou 3** : le `#` de niveau 1 n'en prend
  pas, et le gate de la règle 13 ne l'exige pas de lui.

Une section qui s'appuie sur plusieurs cours ou séances occupe **plusieurs lignes**, une par déck,
pour que la colonne `Diapos` ne mélange jamais deux numérotations — mais la colonne `Renvoi à
écrire` n'est renseignée **qu'une fois par titre**, la grammaire n'admettant qu'un attribut.
Les encadrés portant une affirmation attribuable à une diapositive ont leur propre ligne, la
section entre parenthèses.

**Compte des titres : 25, et non 24.** Un `#` (l. 25), **16** `##`, **8** `###`. Le gate de la
règle 13 portera donc sur **24** blocs d'attributs.

---

## 1 · La table, section par section

| Section (`ligne:titre`) | Cours | Séance | Diapos | Ce que la diapositive porte | Confiance | Renvoi à écrire |
|---|---|---|---|---|---|---|
| `25:# Gestion d'environnement infonuagique` | B10 | 2 | 1, 4, 6 | [1] « Gestion d'environnement infonuagique **Linux** » — le titre du déck ; [6] « Plan de cours … Concept d'infrastructure · Introduction à Linux · Déploiement d'un serveur · Commandes Linux de base · Conclusion » | certaine | *s.o.* — titre de niveau 1 |
| `27:## L'idée en une image` | B10 | 2 | 9, 12 | [9] « installée sur les lieux de votre organisation. C'est ce qu'on appelle l'approche "traditionnelle" (ou "**On Premise**") » ; [12] « Le Cloud offre 3 types de services principaux Infrastructure as a service (IaaS) Platform as a service (PaaS) Software as a service (SaaS) » | partielle | `{diapos="9, 12"}` |
| `27:` (l'analogie du commerce, du local nu et du kiosque, et son « où elle casse ») | aucun | — | aucun | Termes cherchés : `commerce`, `kiosque`, `analogie`, `pot de miel`, `honeypot`, `Unit 42`, `robot` — 0 occurrence sur 21 extraits. L'image, sa borne et le chiffre des 184 minutes sont propres à la leçon | certaine | — |
| `74:## Pourquoi l'infrastructure est un choix d'ingénierie` | B10 | 2 | 7, 8 | [8] « L'infrastructure représente l'équipement disponible pour rendre votre application disponible aux utilisateurs finaux … Serveur Équipement Réseau Pare-feu … impact considérable le cout, la sécurité et la capacité de **mise à l'échelle** » — la leçon reprend les trois axes mot pour mot | certaine | `{diapos="7, 8"}` |
| `89:### On-premise ou infonuagique` | B10 | 2 | 9-11 | [10] « Le Cloud … est un service permettant de **louer** des infrastructures informatiques d'un fournisseur externe. Ce dernier assure l'entretien … cout mensuel (**Divisé à l'heure**) » ; [11] « Avantage Réduction des coûts … **Sécurité généralement supérieure** Désavantage … Données sensibles sur une infrastructure externe » | certaine | `{diapos="9-11"}` |
| `106:` (encadré `correction-du-cours`, « sécurité généralement supérieure ») | B10 | 2 | 11 | [11] porte littéralement « Sécurité généralement supérieure ». **L'attribution est exacte**, mot pour mot | certaine | — |
| `116:### Le modèle de responsabilité partagée` | B10 | 2 | 18 | [18] « notre **responsabilité** en tant que développeur qui utilise IaaS **commence au système d'exploitation**. Sur Digital Ocean, nous utiliserons le système d'exploitation "Linux" ». ⚠️ Le **modèle nommé** est absent : `responsabilité partagée` **0/21** — le déck pose la frontière, il ne nomme ni ne dessine le modèle | partielle | `{diapos="18"}` |
| `139:### La grille des neuf couches` | B10 | 2 | 13, 17 | [13] et [17] portent le **même titre**, « Pile (Stack) de développement », et rien d'autre : le visuel est une image, aucun nom de couche n'entre dans l'extrait. La **répétition** que la leçon annonce est mesurée ; le **contenu** des neuf couches ne l'est pas — voir **R-6** | partielle | `{diapos="13, 17"}` |
| `141:` (encadré `cours {diapos="13, 17"}`) | B10 | 2 | 13, 17 | **Le renvoi existant est juste** : ce sont bien les deux seules diapositives « Pile (Stack) de développement » du déck. En revanche « neuf couches » et « la question d'examen la plus probable » ne sont portés par aucun texte — voir **R-6** | partielle | — |
| `165:` (encadré `correction-du-cours`, le tiret SaaS sur *Applications* et *Data*) | aucun | — | aucun | La grille est une **image** : aucun nom de couche, aucun tiret, aucune coche n'entre dans l'extrait de [13] ni de [17]. La correction porte sur un contenu **non mesurable** — voir **R-6** | certaine | — |
| `175:### IaaS, PaaS, SaaS en une phrase chacun` | B10 | 2 | 14-16 | [14] « vous avez directement accès au système d'exploitation … Exemple de fournisseur: **Digital Ocean, Amazon web services**. Ce type de service est celui que nous utiliserons dans ce cours » ; [15] « **Heroku**, Amazon web services* » ; [16] « Prévisibilité des couts … Avantages fiscaux (les services de location sont à 100% **déductibles d'impôt**) … le code critique est entièrement sur le serveur … **Office 365** est un SaaS » | certaine | `{diapos="14-16"}` |
| `179:` (« Exemples cités par le cours : DigitalOcean, AWS, **Linode** ») | B10 | 2 | 9, 14 | [14], la diapositive **IaaS**, ne cite que « Digital Ocean, Amazon web services ». `Linode` vient de [9], liste générale de fournisseurs d'infrastructure où figure **aussi Heroku** — voir **R-7** | certaine | — |
| `188:` (encadré `correction-du-cours`, « le cours cite Heroku comme IaaS ») | B10 | 2 | 9, 15 | [9] range Heroku parmi les « entreprises [qui] offrent des services d'infrastructure » ; **[15] le classe explicitement en PaaS** : « Platform as a service (PaaS) … Exemple de fournisseur: **Heroku** ». La correction accuse le cours d'une erreur qu'il ne commet pas — voir **R-7** | certaine | — |
| `195:## Déployer un serveur Ubuntu et s'y connecter` | B10 | 2 | 22-26 | [22] « Déploiement d'un serveur » ; [23] « Maintenant que nous avons notre compte Digital Ocean et les logiciels qui nous permettront de gérer notre serveur à distance » ; [26] « Utilisation de Putty » | certaine | `{diapos="22-26"}` |
| `197:### Créer la machine` | B10 | 2 | 23-25 | [24] « Cliquez sur "Create", puis "**Droplets**" … Sous "Recommended for you", choisissez "**LAMP on 18.04**" » ; [25] « prenez le minimum (celui à **5$ par mois**) (Nécessite de changer le type de CPU à "**Regular Intel with SSD**") … prenez "**Toronto**" … choisissez "**One-time password**" … Vous recevrez un **courriel** avec les informations de connexion (Code utilisateur, mot de passe, adresse IP) » | certaine | `{diapos="23-25"}` |
| `207:` (encadré `correction-du-cours`, l'image « LAMP on 18.04 ») | B10 | 2 | 24 | [24] écrit exactement « choisissez "LAMP on 18.04" ». **L'attribution est exacte**, numéro compris ; `18.04` n'apparaît que dans cette seule diapositive sur 21 | certaine | — |
| `219:` (encadré `correction-du-cours`, « Authentication : one-time password ») | B10 | 2 | 25 | [25] point 7 : « Dans la section "Authentication", choisissez "**One-time password**" ». **L'attribution est exacte** ; l'expression n'apparaît que dans B10-02 [25] et 4P2-08 [38] | certaine | — |
| `228:### La première connexion, et l'empreinte qu'on n'accepte pas à l'aveugle` | B10 | 2 | 26-31 | [26] « Entrez les informations suivantes: Adresse IP du serveur **Port: 22** … Connexion Type: **SSH** Appuyez sur "Open" … Vous devrez **changer le mot de passe de "root" à la première connexion**. Vous pouvez coller le mot de passe … avec le **bouton droit** de la souris » ; [27]-[30] captures PuTTY ; [31] « Voici donc qui conclut comment on peut se connecter à notre serveur à partir de Putty » | partielle | `{diapos="26-31"}` |
| `228:` (la moitié « empreinte de la clé d'hôte ») | aucun | — | aucun | Termes cherchés : `empreinte`, `fingerprint`, `known_hosts`, `ssh-keygen`, `SHA256`, `man-in-the-middle` **dans le déck de la séance 2** — 0 occurrence ; `empreinte` et `fingerprint` sont à **0 sur les 21 extraits**. Toute cette moitié est un apport de la leçon — voir **R-4** | certaine | — |
| `236:` (encadré `complement`, client OpenSSH sous Windows) | aucun | — | aucun | Termes cherchés : `OpenSSH`, `PowerShell`, `Windows Terminal`, `fonctionnalité facultative` — 0 occurrence sur 21 extraits. `Putty` est à 19 occurrences, dont **8 dans le déck de la séance 2** : le cours n'enseigne que PuTTY | certaine | — |
| `288:` (encadré `exercice-du-cours {ref="1"}`) | B10 | 2 | 23-26 | L'énoncé réel (`exercices.json`, séance 2, réf. 1) est « **Déploie un serveur Ubuntu** chez un hébergeur infonuagique (DigitalOcean dans le cours), puis **connecte-toi à distance** avec un client SSH (PuTTY dans le cours) » — soit [23]-[26]. Le commentaire de la leçon le réécrit **entièrement** autour de la vérification d'empreinte, qui n'y figure pas — voir **R-3** | certaine | — |
| `299:### Le premier geste sur un serveur neuf : cesser d'être root` | B10 | 5 | 34, 36, 37, 40 | [34] « le compte **root** … est ce qu'on appelle un "**super utilisateur**" (superuser) conçu pour avoir le maximum de privilège sur l'environnement. Toutefois, nous souhaiterons délégue[r] » ; [37] « Il s'agit d'un fichier de configuration qui permet d'accorder des accès "**sudo**" aux utilisateurs réguliers » ; [40] « Tous les membres du groupe "**sudo**" ont plein accès à sudo » | certaine | `{seance="5" diapos="34, 36, 37, 40"}` |
| `299:` (côté séance 2) | B10 | 2 | 26 | `root` n'apparaît qu'**une fois** dans tout le déck de la séance 2, à [26] : « Vous devrez changer le mot de passe de "root" à la première connexion ». `sudo`, `adduser`, `usermod` : **0 dans le déck 2** | certaine | — |
| `304:` (encadré `correction-du-cours`, « le cours fait toute la séance en `root` ») | B10 | 2 | 26 | Mesuré : le déck ne montre **aucune** création de compte ordinaire ni aucun `sudo`, et [26] fait ouvrir la session en `root`. L'affirmation est **soutenue par l'absence**, pas par une diapositive positive. En revanche « c'est d'ailleurs pour cela que `pwd` y répond `/root` » n'est pas mesurable (capture) — voir **R-5** | partielle | — |
| `330:## L'arborescence Linux : une seule racine` | B10 | 2 | 41, 48 | [41] « Imaginons la structure de répertoires suivante **var www** ⟵ Vous êtes ici **html log journal** » ; [48] « Comment puis-je me rendre sous "journal" **sans utiliser de chemin absolu** ? ». ⚠️ C'est un arbre d'illustration de `cd` — le cours n'enseigne **aucune** hiérarchie système : `/etc` **0/21**, `/home` **0/21**, `arborescence` 0 dans B10-02 | partielle | `{diapos="41, 48"}` |
| `356:` (encadré `cours {diapos="36"}`, « `pwd` répond `/root` ») | B10 | 2 | 36 | [36] est bien la diapositive `pwd` — « "pwd" est une instruction qui permet d'afficher le répertoire en cours » — mais **elle ne contient ni `/root` ni aucune sortie** : la démonstration est une capture. Et [36] appartient au bloc « Commandes de base », pas à une section sur l'arborescence — voir **R-5** et **R-9** | partielle | — |
| `364:## Se repérer, lister, créer` | B10 | 2 | 34-53, 56, 57 | [34] « nous couvrirons les commandes suivantes : **pwd clear cd ls cat mkdir rm mv vi** » ; [38] « "clear" … permet d'effacer tout le contenu de la page » ; [40] « on peut utiliser une **adresse relative** … ou une **adresse absolue** … commencer le chemin d'accès par "/" » ; [47] « il est toujours possible de vous rendre au dossier parent en utilisant la notation "**..**" » ; [52] « des **interrupteurs** ("switch") … un tiret suivi de lettres … on peut ajouter "**-l**" » ; [57] « "mkdir" (Make Directory) est une commande permettant de créer un nouveau répertoire » | certaine | `{diapos="34-53, 56, 57"}` |
| `393:` (la lecture colonne par colonne de `ls -l`) | B10 | 5 | 66, 67 | [66] « Les colonnes représentent respectivement Les **permissions** Le **nombre de liens** … Le **propriétaire** Le **groupe** La **taille** La **date** … Le **nom** » — la table de la leçon est celle-là, et elle est de la **séance 5**. Le déck 2 s'arrête à « "-l" pour afficher tout le détail des fichiers » ([52]) | certaine | — |
| `406:` (encadré `exercice-du-cours {ref="2"}`) | B10 | 2 | 35, 36 | Énoncé réel : « Affiche le chemin du répertoire dans lequel tu te trouves. » Correspond à [35]-[36]. La réponse `/root` annoncée par le commentaire reste une capture — voir **R-5** | certaine | — |
| `412:` (encadré `exercice-du-cours {ref="3"}`) | B10 | 2 | 56, 57 | Énoncé réel : « Crée un répertoire nommé « **exercice3** » » — en **minuscules** dans la seule source du dépôt. Voir **R-11** | certaine | — |
| `418:` (« Linux est sensible à la casse », et l'exercice 9 qui écrirait « Exercice3 ») | aucun | — | aucun | `casse` **0/21** ; `sensible à la casse`, `case sensitive` : 0. Aucune diapositive des 21 extraits n'aborde la sensibilité à la casse. Et l'énoncé 9 de `exercices.json` écrit « exercice3 » **en minuscules** — voir **R-11** | certaine | — |
| `423:` (les « cinq raccourcis ») | B10 | 2 | 75 | [75] « Petit truc 1) … la touche de **tabulation** (tab) pour compléter automatiquement le nom 2) … avec les **flèches "haut" et "bas"** 3) … un "**coller**" … avec un clic droit de la souris ». Le cours en donne **trois** ; `Ctrl+C`, `Ctrl+R`, `Ctrl+L` et `Ctrl+Shift+V` sont **0/21** — voir **R-10** | certaine | — |
| `428:` (encadré `complement`, `ls -la`, `Ctrl+L`, « les mêmes partout ») | B10 | 2 | 52 | Le cours n'enseigne que `ls -l` ([52]) : `ls -la` et `ls -lh` sont **0/21**, `Ctrl+L` **0/21**. L'encadré déclare correctement son statut de complément | certaine | — |
| `448:### Lire un fichier sans l'ouvrir` | B10 | 2 | 54, 55 | [55] « "cat" est une instruction qui prend en paramètre le nom d'un fichier et affichera son contenu … Imaginons que j'exécute la commande sur un fichier HTML que j'aurais **déposé sur mon serveur** ». ⚠️ `less` **0/21**, `head` **0/21**, `tail` **0/21** : trois des quatre commandes du bloc de code sont hors cours, sans marqueur | partielle | `{diapos="54, 55"}` |
| `461:` (encadré `cours {diapos="55"}`, « la page Apache2 Ubuntu Default Page — It works! ») | B10 | 2 | 55 | Le **numéro est juste** (c'est la diapositive `cat`), mais son texte dit « un fichier HTML que j'aurais **déposé** sur mon serveur », **pas** la page par défaut. `apache` : **0 occurrence dans tout le déck de la séance 2** ; `index.html` : 0 dans B10, 1 seule dans 4P2-08 [93] ; `It works` : 0/21 — voir **R-1** | certaine | — |
| `466:` (encadré `correction-du-cours`, la page par défaut qui trahit la stack) | aucun | — | aucun | Termes cherchés : `page par défaut`, `default page`, `It works`, `bannière`, `banner`, `divulgation` — 0 occurrence sur 21 extraits. La correction est adossée à **R-1** : elle corrige une diapositive qui ne dit pas ce qu'on lui prête | certaine | — |
| `474:## L'éditeur vi : deux modes, et toute la confusion vient de là` | B10 | 2 | 66-74 | [67] « VI n'est pas une commande à proprement parler, mais plutôt une **application de traitement de texte** … il existe plusieurs autres applications similaires telles que **VIM, NANO** » ; [68] « Si le fichier n'existe pas, un fichier sera créé » ; [70] « VI à deux modes: "**Commande**" et le mode "**Insertion**" … appuyer sur la lettre "i" … sur la touche "**Echaper**" » ; [71] « les petites **lignes bleues** sur le côté gauche représentent des lignes qui n'existent pas dans votre fichier » ; [72] « **:w** … **:wq** … **:q!** » | certaine | `{diapos="66-74"}` |
| `498:` (la table des frappes en mode Commande) | B10 | 2 | 72 | [72] ne porte que **trois** frappes — `:w`, `:wq`, `:q!`. `:q` seul, `:set nu`, `dd`, `u`, `Ctrl+r`, `gg`, `G`, `/motif` sont **absents du déck** — voir **R-10** | certaine | — |
| `509:` (« le cours les décrit comme des lignes bleues ») | B10 | 2 | 71 | [71] écrit « les petites **lignes bleues** sur le côté gauche ». **L'attribution est exacte** ; `bleues` n'apparaît que dans cette seule diapositive sur 21 | certaine | — |
| `519:` (encadré `complement`, VS Code Remote-SSH et `nano`) | B10 | 2 | 67 | `VS Code`, `Remote`, `console web` : **0/21**. En revanche `nano` **est** cité par le cours, à [67], parmi les alternatives à VI — la leçon dit « ce n'est pas ce que le cours évalue », ce qui reste exact | partielle | — |
| `541:` (encadrés `exercice-du-cours` 4, 5, 6) | B10 | 2 | 68-74 | Énoncés réels : créer `exercice4.txt` à deux lignes sous `vi`, l'afficher, puis créer `exercice5.txt` volontairement mal nommé. Correspondent à la démonstration [68]-[74] | certaine | — |
| `561:## Renommer, déplacer, se déplacer` | B10 | 2 | 47, 62-65 | [47] la notation « .. » pour le répertoire parent ; [63] « la commande "mv" (Move) permet de **déplacer et de renommer** un fichier. La syntaxe est la suivante : mv <chemin de départ> <chemin d'arrive> » ; [64] les trois cas A/B/C — renommer, déplacer, déplacer **et** renommer. ⚠️ `cp` est **0/21** : le `cp` du bloc de code n'est pas au cours | certaine | `{diapos="47, 62-65"}` |
| `577:` (encadrés `exercice-du-cours` 7, 8, 9) | B10 | 2 | 47, 63-65 | Énoncés réels : renommer le fichier de l'exercice 6 en `exercice6.txt`, déplacer `exercice4.txt` dans `exercice3`, se placer dans `exercice3`. Correspondent à [63]-[65] et, pour le dernier, à `cd` ([40]) | certaine | — |
| `596:## Revenir modifier un fichier existant` | B10 | 2 | 68 | [68] « Si le fichier **existe**, VI ouvrira le fichier ». ⚠️ C'est tout ce que le déck en dit : `G` et `o`, les deux frappes sur lesquelles la section entière repose, sont **absents du déck** — le cours n'enseigne que `i` ([70]) | partielle | `{diapos="68"}` |
| `608:` (encadrés `exercice-du-cours` 10, 11) | B10 | 2 | 47, 68 | Énoncés réels : ajouter une troisième ligne à `exercice4.txt` sous `vi` ; remonter au parent de `exercice3`. [47] porte « .. » ; la modification d'un fichier existant, [68] | certaine | — |
| `620:` (encadré `complement`, WinSCP, `scp`, `rsync`) | B10 | 1, 3 | — | `WinSCP` : **0 dans le déck de la séance 2**, présent en B10-01 [63], B10-03 [38] et [43], B10-09 [46]. `scp` : **0/21**. `rsync` : **0/21**. L'outil est du cours, à d'autres séances ; les deux commandes en ligne sont un apport de la leçon | certaine | — |
| `648:## Supprimer : la commande sans corbeille` | B10 | 2 | 58-61 | [59] « "rm" (Remove) est une commande pour supprimer un fichier ou un répertoire. Prenons ce répertoire :(rm –r) On voit un fichier et deux répertoires (en bleu) » ; [60] « Je peux supprimer le fichier "**fichierDemo.txt**" avec l'instruction : rm fichierDemo.txt » ; [61] « Si on ne le fait pas, l'**opération sera refusée**. Pour se faire, on utilisera l'interrupteur "**-r**" (Recursif) » | certaine | `{diapos="58-61"}` |
| `656:` (encadré `cours {diapos="59, 60, 61"}`) | B10 | 2 | 58-61 | **Le renvoi existant est juste**, et la citation « si on ne le fait pas, l'opération sera refusée » est **exacte** ([61]). En revanche `repertoireDemo` est **0/21** et `cannot remove` **0/21** : le nom du répertoire et le message d'erreur viennent d'une capture — voir **R-8**. La borne basse gagnerait [58], le titre de section « RM » | certaine | — |
| `662:` (encadré `attention`, `rm -rf $DOSSIER/*`, le lien symbolique) | aucun | — | aucun | Termes cherchés : `corbeille`, `rm -rf`, `-f`, `lien symbolique`, `symlink` — 0 occurrence sur 21 extraits. Tout l'encadré est un apport de la leçon — voir **R-12** | certaine | — |
| `674:` (encadrés `exercice-du-cours` 12, 13) | B10 | 2 | 61 | Énoncés réels : supprimer le répertoire `exercice3` **non vide**, puis le fichier `exercice6.txt`. [61] est exactement la diapositive qui l'explique | certaine | — |
| `686:` (encadré `complement`, `grep` et `find`) | aucun | — | aucun | `grep` **0/21**, `find` : aucune occurrence en tant que commande. L'encadré déclare correctement son statut | certaine | — |
| `693:## Les permissions, en trois classes et trois droits` | B10 | 5 | 63, 66-71, 75-77, 80 | [63] « Gestion des accès aux fichiers/répertoires … **ls -l chmod chown chgrp** » ; [69] « La commande **chmod** permet de définir qui a accès … chmod <bit d'accès> <fichier/répertoire ciblé> Exemple: chmod 751 demo.txt » ; [70] « **3 ensembles de permissions pour 3 catégories** d'utilisateur … Le propriétaire … Les membres du groupe … Tous les autres » ; [71] « Répertoire … Exécution **Accéder au répertoire** / Fichier … Exécution Exécuter le fichier » ; [75] « Lecture 1 **4** Écriture 2 **2** Exécution 3 **1** » ; [77] « (4 + 2 + 1 = 7) … (4 + 1 = 5) … La notation numérique est donc: **754** » ; [80] « **Notation symbolique** … chmod g+rw demo.php » | certaine | `{seance="5" diapos="63, 66-71, 75-77, 80"}` |
| `695:` (encadré `complement`, « la séance 5 les annonce sans les développer ») | B10 | 5 | 63-84 | **Contredit par la mesure** : la séance 5 y consacre une vingtaine de diapositives, notation numérique **et** symbolique comprises, plus `chown` ([82]-[84]) et `chgrp`. `permission` : **8 occurrences en B10-05**, `chmod` **6**, `chown` **5** — voir **R-2**, la réserve la plus grave de ce document | certaine | — |
| `706:` (la table des trois droits, fichier / répertoire) | B10 | 5 | 71, 75 | La distinction fichier/répertoire de la leçon — et jusqu'au mot « **traverser** » rendu par « Accéder au répertoire » — est celle de [71] ; les valeurs 4/2/1, celles de [75]. La leçon enseigne, en le déclarant hors cours, un contenu du cours **repris à l'identique** | certaine | — |
| `722:` (l'analogie du trousseau de clés et son « où elle casse ») | aucun | — | aucun | Termes cherchés : `trousseau`, `clé de service`, `couloir`, `analogie` — 0 occurrence sur 21 extraits. L'image est propre à la leçon | certaine | — |
| `729:## Paquets, services et journaux` | B10 | 5 | 35, 41, 42, 49, 94 | [35] « Prenons la commande "**apt-get**", celle-ci n'est normalement pas accessible à un utilisateur régulier » ; [42] « bob ALL=(root) /usr/bin/**systemctl** restart apache2 %support ALL=(root) /usr/bin/**apt update**, /usr/bin/**apt upgrade** » ; [94] « apt-get install libpam-pwquality » | certaine | `{seance="5" diapos="35, 41, 42, 49, 94"}` |
| `729:` (les mêmes commandes, côté séance 9) | B10 | 9 | 7, 41, 42 | [7] « apt-get install mariadb-server » ; [41] « **apt-get update** apt-get install apache2 apt-get install php » ; [42] « Redémarrer le service d'Apache **systemctl restart** Apache2 » — l'`update`/`install` du cours, en situation | certaine | — |
| `731:` (encadré `complement`, « cette section entière vient de la base de connaissances ») | B10 | 5, 9, 10 | — | **Contredit par la mesure** : `apt` **11 occurrences** (B10-03 [51], B10-05 ×5, B10-09 ×3, 4P2-08 ×2), `systemctl` **3** (B10-05 [42], B10-09 [42], B10-10 [99]). L'affirmation « pas au programme de la **séance 2** » est exacte ; « vient de la base de connaissances » ne l'est pas — voir **R-2** | certaine | — |
| `763:` (les journaux, `journalctl`, `/var/log/auth.log`) | aucun | — | aucun | `journalctl` **0/21** ; `auth.log` **0/21** ; `/var/log` **0/21**. ⚠️ Le terme `journal` remonte B10-02 [41]-[49], mais c'est un **répertoire nommé `journal`** dans l'arbre d'exemple de `cd` — aucun rapport. Le seul point de contact réel est B10-05 [8], « visualiser les fichiers de **journalisation** » | certaine | — |
| `778:## Exemple simple` (le `chmod 777` et le `chown`) | B10 | 5 | 69, 77, 80, 82-84 | [77] la notation numérique et la somme 4+2+1 ; [80] « Donner tous les droits à tout le monde chmod **a+rwx** demo.php » — le cours enseigne littéralement le geste que l'exemple corrige ; [83] « La commande **chown** (Change Owner) permet simplement de modifier qui est l'utilisateur défini comme **propriétaire** » ; [84] « le fichier demo.txt était assigné à l'utilisateur "root", mais après avoir exécuté la commande chown, il est maintenant assigné à l'utilisateur "alex" » | certaine | `{seance="5" diapos="69, 77, 80, 82-84"}` |
| `778:` (`www-data`, le webshell, `find -exec`) | aucun | — | aucun | Termes cherchés : `www-data`, `webshell`, `téléversement`, `upload`, `find`, `-exec` — 0 occurrence sur 21 extraits. Le compte de service et le scénario d'exécution de code sont des apports de la leçon | certaine | — |
| `827:## Exemple complet` (les dix premières minutes d'un serveur neuf) | B10 | 2 | 24-26, 55 | La colonne « cours » est la procédure réelle du déck : [24]-[25] la création du droplet en « one-time password », [26] la session ouverte en `root` par PuTTY, [55] le `cat` d'un fichier HTML | partielle | `{diapos="24-26, 55"}` |
| `853:` (la colonne corrigée : clé SSH, `adduser`, `usermod -aG sudo`, `unattended-upgrades`) | B10 | 5 | 34, 37, 40 | `adduser`/`usermod` : la matière de la séance 5 ([34]-[48], gestion des comptes et de `sudoers`). `unattended`, `fail2ban`, `rsync`, `id_ed25519` : **0/21**. La clé SSH est annoncée par la leçon comme matière de la séance 3 ; `SSH` y compte 14 occurrences (B10-03) | partielle | — |
| `883:` (encadré `correction-du-cours`, « la suite est la matière de la séance 3 ») | B10 | 3 | 44-51 | Mesuré : `ufw` **19 occurrences, toutes en B10-03** ; `pare-feu` 16 en B10-03. La promesse est **tenue** pour le pare-feu. `fail2ban` en revanche est **0/21** — voir **R-13** | partielle | — |
| `891:## À toi de jouer` | aucun | — | aucun | Conteneur du quiz (`[[quiz]]`) et rappel des treize exercices. Aucune diapositive des 21 extraits ne porte les énoncés d'exercices de B10 (§0, limite 1). Même traitement qu'au module 01 | certaine | `{hors-cours}` |
| `893:` (« les treize exercices … portent tous sur les commandes de base ») | B10 | 2 | 23-26 | **Contredit par `exercices.json`** : l'exercice 1 est « Déploie un serveur Ubuntu … puis connecte-toi à distance avec un client SSH ». Douze sur treize portent sur les commandes, pas treize — voir **R-3** | certaine | — |
| `903:## À retenir` | B10 | 2 | 13, 17, 40, 61, 70 | Reprend la grille ([13], [17]), l'opposition adresse relative / absolue ([40]), le `-r` obligatoire sur un répertoire ([61]) et les deux modes de `vi` ([70]). ⚠️ Le cinquième point — « Linux est sensible à la casse » — n'est porté par **aucune** diapositive (`casse` 0/21) | partielle | `{diapos="13, 17, 40, 61, 70"}` |
| `921:## Aller plus loin` | B10 | 2 | 82 | [82] « **Références** www.digitalocean.com https://www.**hostinger**.com/tutorials/linux-commands ». La leçon cite explicitement « diapositive 82 » pour Hostinger : **l'attribution est exacte**, numéro compris. `hostinger` n'apparaît que dans cette seule diapositive sur 21 | certaine | `{diapos="82"}` |

**Bilan des renvois à écrire** — 24 blocs d'attributs pour 16 `##` et 8 `###` :
**19** `{diapos="…"}` (séance 2), **4** `{seance="5" diapos="…"}`, **1** `{hors-cours}`, **0**
`{cours="…"}`. Aucun titre du module 02 ne cite le cours PHP.

---

## 2 · Réserves — ce que la mesure contredit dans la leçon

> Treize écarts mesurés. **Aucun n'est tranché ici** : la leçon n'est pas le livrable de ce document,
> et `content/` a été lu sans jamais être écrit. Chacun donne la ligne de la leçon, la diapositive, et
> l'écart — plus une correction **proposée**.

**R-1 · La diapositive `cat` ne porte pas la page par défaut d'Apache — et deux encadrés en dépendent.**
`461:` L'encadré `::: cours {diapos="55"}` écrit : « La démonstration de `cat` du cours porte sur
`/var/www/html/index.html`, c'est-à-dire la page "**Apache2 Ubuntu Default Page — It works!**"
livrée avec l'image LAMP. » La diapositive [55] écrit : « Imaginons que j'exécute la commande sur un
fichier HTML que j'aurais **déposé sur mon serveur** » — un fichier **déposé par l'enseignant**, ce
qui est l'inverse d'une page livrée avec l'image. Mesuré par ailleurs : `apache` compte **0
occurrence dans tout le déck de la séance 2** (27 occurrences ailleurs : B10-04, 05, 09, 10, 4P2),
`index.html` 0 en B10, `It works` **0/21**. La sortie de la commande est une **capture** ; rien ne
permet de dire ce qu'elle montre.
*Correction proposée* : retirer l'attribution, garder le fait — `::: cours {diapos="55"}` conserve
« la démonstration de `cat` porte sur un fichier HTML déposé sur le serveur », et l'encadré
`correction-du-cours` de la ligne 466 (la page par défaut qui trahit la stack) devient un
`::: complement`, puisqu'il ne corrige plus rien que le cours ait dit. C'est le patron du dépôt :
**retirer l'attribution, garder le fait**.

**R-2 · 🔴 « Tu ne seras pas évalué dessus » : les permissions sont la matière de la séance 5, et
la leçon dit à l'étudiant de ne pas les réviser.**
`66:` « Le modèle de responsabilité partagée, les permissions (`chmod`, `chown`), la gestion de
paquets (`apt`), les services (`systemctl`) et les journaux … ne sont pas dans les diapositives de la
séance 2. **Ils viennent de la base de connaissances.** … **tu ne seras pas évalué dessus cette
semaine** » — et `695:` « La séance 2 n'aborde pas les permissions ; la séance 5 les annonce
("configuration des bits d'accès") **sans les développer** » — et `731:` « **Cette section entière
vient de la base de connaissances.** »
La **première** moitié est exacte, et mesurée : dans le déck de la séance 2, `permission` **0**,
`chmod` **0**, `chown` **0**, `apt` **0**, `systemctl` **0**. La **seconde** est fausse sur les trois
encadrés. Mesuré dans le déck de la **séance 5** : [63] « Gestion des accès aux fichiers/répertoires
… ls -l **chmod chown chgrp** » ; [69] la syntaxe de `chmod` et l'exemple `chmod 751 demo.txt` ;
[70] les trois classes et les trois droits ; [71] la distinction fichier/répertoire, « Exécution
**Accéder au répertoire** » ; [75] les valeurs 4/2/1 ; [77] la notation numérique et « 754 » ; [80]
la **notation symbolique** complète, `chmod g+rw`, `chmod a+rwx` ; [82]-[84] `chown`, avec exemple.
Soit **8 occurrences** de `permission`, **6** de `chmod` et **5** de `chown` en B10-05. La table de
la leçon (l. 706) et son analogie du couloir reprennent **exactement** [71] ; son « la notation
symbolique complète … est la matière du module sur les utilisateurs » désigne [80], qui la donne en
entier. Pour `apt` et `systemctl` : 11 et 3 occurrences, en B10-03 [51], B10-05 [35][41][42][49][94],
B10-09 [7][41][42], B10-10 [99].
C'est le mode d'échec n°2 du dépôt — **la promesse d'exclusion**, celle qui fait choisir à
l'étudiant ce qu'il ne révise pas — et le dépôt ne peut pas la tenir : la diapositive [6] de la
séance 1 écrit que l'examen porte sur « les notes **et les exercices** », donc sur les treize
séances. Aucun de ces trois encadrés ne peut rester en l'état.
*Correction proposée* : dans les trois, remplacer « viennent de la base de connaissances » par
« sont enseignés **plus tard dans le même cours** — `chmod`, `chown` et `ls -l` à la séance 5, `apt`
et `systemctl` aux séances 5 et 9 », et supprimer « tu ne seras pas évalué dessus », qui n'est
soutenu par rien. La section 693 devient `{seance="5" diapos="63, 66-71, 75-77, 80"}` : elle n'est
**pas** hors cours.

**R-3 · L'exercice 1 est un déploiement de serveur ; la leçon le réécrit en vérification d'empreinte
— et son propre encadré `cours` dit que les treize exercices portent sur les commandes.**
`57:` « Les **treize** exercices de la feuille de la séance portent **tous** sur cette dernière
partie [les neuf commandes de base]. » `288:` L'encadré `exercice-du-cours {ref="1"}` commente :
« Prends le temps de **comparer l'empreinte** affichée par ton client SSH avec celle que la console
du fournisseur affiche pour ton droplet, avant de répondre `yes`. »
L'énoncé réel, seule source du dépôt
([`exercices.json`](../../content/cours/securite-web/exercices.json), séance 2, réf. 1) : « **Déploie
un serveur Ubuntu** chez un hébergeur infonuagique (DigitalOcean dans le cours), puis
**connecte-toi à distance** avec un client SSH (PuTTY dans le cours). » Aucune vérification
d'empreinte n'y figure — et `empreinte` comme `fingerprint` sont à **0 sur les 21 extraits**. Les
deux affirmations se contredisent l'une l'autre : douze exercices sur treize portent sur les
commandes, pas treize, et le treizième restant est précisément celui que la leçon détourne.
*Correction proposée* : dans l'encadré de la ligne 57, écrire « **douze des treize** exercices
portent sur cette dernière partie ; le premier est le déploiement du serveur et la connexion à
distance ». Dans le commentaire de l'exercice 1, faire la marche à suivre demandée (créer le droplet,
ouvrir PuTTY) **puis** ajouter la vérification d'empreinte comme geste supplémentaire explicitement
signalé comme un ajout.

**R-4 · Toute la moitié « empreinte de la clé d'hôte » d'un titre `###` est hors cours, et rien ne le
dit.**
`228:### La première connexion, et l'empreinte qu'on n'accepte pas à l'aveugle` — la moitié PuTTY est
au cours ([26]-[31], 8 occurrences de `Putty` dans le seul déck 2) ; la moitié empreinte ne l'est
pas : `empreinte` **0/21**, `fingerprint` **0/21**, `known_hosts` 0, `ssh-keygen` 0, `SHA256` 0,
`man-in-the-middle` 0 dans le déck 2. Le diagramme Mermaid, l'exercice réécrit et le paragraphe
« c'est le moment le plus vite bâclé de la séance » n'ont **aucun marqueur de provenance** : le
lecteur ne peut pas savoir que la moitié de la section n'est pas évaluable. À l'inverse, ce que le
cours **ajoute** et que la leçon **omet** est dans la même diapositive : [26] « Vous devrez
**changer le mot de passe de "root" à la première connexion** » — un geste obligatoire, absent de la
leçon.
*Correction proposée* : encadrer la moitié empreinte en `::: complement` (le titre restant
`{diapos="26-31"}`, la mesure soutenant la moitié PuTTY), et ajouter le changement de mot de passe
imposé à la première connexion, qui est de la procédure du cours.

**R-5 · `pwd` répond `/root` : l'attribution est plausible, la mesure ne peut ni la confirmer ni
l'infirmer — et le renvoi est posé sous le mauvais titre.**
`356:` L'encadré `::: cours {diapos="36"}` écrit : « Le cours fait une démonstration où `pwd` répond
**`/root`**, et non `/`. » La diapositive [36] dit en entier : « "pwd" est une instruction qui permet
d'afficher le répertoire en cours. » Aucune sortie n'y figure — la démonstration est une capture, que
l'extraction ne voit pas (§0, limite 2). Et `root` n'apparaît qu'**une** fois dans tout le déck 2, à
[26]. L'affirmation n'est donc **pas réfutée** ; elle est **non mesurable**, ce qui n'est pas la même
chose et doit s'écrire autrement. Second point : [36] appartient au bloc « Commandes de base »
([34]-[75]), alors que l'encadré est placé sous `## L'arborescence Linux`, dont le renvoi mesuré est
[41] et [48].
*Correction proposée* : conserver l'encadré et son renvoi `{diapos="36"}`, mais retirer l'affirmation
sur ce que la capture montre — la distinction `/root` ≠ `/` reste vraie et pédagogiquement utile, elle
n'a pas besoin d'être attribuée à une diapositive. Ou déplacer l'encadré sous `## Se repérer, lister,
créer`, dont [36] fait réellement partie.

**R-6 · « Neuf couches » et « la question d'examen la plus probable » ne sont mesurables ni l'un ni
l'autre — et la correction du tiret SaaS porte sur une image.**
`141:` L'encadré `::: cours {diapos="13, 17"}` : « neuf couches empilées, quatre colonnes, et une
frontière … C'est la **question d'examen la plus probable de la séance**. » `165:` « La grille du
cours met un **tiret pour le SaaS** sur les lignes *Applications* et *Data*. »
Le **renvoi est juste** : [13] et [17] portent tous deux « Pile (Stack) de développement », et ce sont
les deux seules du déck. Mais leur extrait ne contient **rien d'autre que ce titre** : ni nom de
couche, ni colonne, ni tiret, ni coche. Le nombre « neuf », la liste
Applications/Data/Runtime/Middleware/O/S/Virtualization/Servers/Storage/Networking et le tiret que
l'encadré corrige sont **non mesurables**. Quant à « la question d'examen la plus probable », c'est
une inférence de la leçon : aucune diapositive ne hiérarchise ce qui sera demandé.
*Correction proposée* : garder le renvoi et la répétition (mesurées), atténuer « la question d'examen
la plus probable » en « le seul visuel que le cours répète », et déclarer dans le
`correction-du-cours` que la grille est reproduite d'après le visuel du cours — le `{source="…"}`
existant pointe la fiche KB, pas la diapositive, ce qui est déjà la bonne pratique.

**R-7 · 🔴 Le `correction-du-cours` sur Heroku accuse le cours d'une erreur que le cours ne commet
pas.**
`188:` « Le cours cite **Heroku** dans sa liste de fournisseurs d'infrastructure. Heroku est un
**PaaS**, pas un IaaS : on y pousse du code, on n'y administre aucun système d'exploitation. »
Mesuré. [9] est une liste **générale** — « Plusieurs entreprises offrent des services
d'infrastructure (Amazon web services, Digital Ocean, Linode, Heroku, etc.) » — sans aucune mention
d'IaaS. La diapositive **IaaS**, [14], ne cite **que** « Digital Ocean, Amazon web services ». Et
surtout, **[15] classe Heroku en PaaS, explicitement** : « Platform as a service (PaaS) … Exemple de
fournisseur : **Heroku**, Amazon web services* ». Le cours a donc raison, et il le dit six
diapositives avant l'endroit où la leçon le corrige. La règle du dépôt est nette : *un ⚠️ qui accuse
le cours à tort est un défaut grave, au même titre qu'une erreur technique.*
*Correction proposée* : supprimer ce `correction-du-cours`. S'il faut garder l'information, elle
devient un `::: note` neutre : « le cours nomme Heroku deux fois — dans la liste générale des
fournisseurs [9], puis comme exemple de PaaS [15] ; c'est cette seconde mention qui donne le
classement ». Corollaire mineur, même ligne : `179:` attribue « DigitalOcean, AWS, **Linode** » à la
diapositive IaaS ; `Linode` vient de [9], pas de [14].

**R-8 · Le message `cannot remove: Is a directory` et le nom `repertoireDemo` sont attribués au
cours ; ni l'un ni l'autre n'est mesurable.**
`656:` « La démonstration du cours montre que `rm repertoireDemo` **sans** `-r` est refusé, avec le
message `cannot remove: Is a directory`. » Mesuré : `repertoireDemo` **0/21**, `cannot remove`
**0/21**. Le déck écrit, en [59], « Prenons ce répertoire :(rm –r) On voit un fichier et deux
répertoires (en bleu) » et, en [60], nomme le **fichier** — « fichierDemo.txt ». Le nom du répertoire
et le message d'erreur ne peuvent venir que d'une capture. En revanche la citation que l'encadré met
entre guillemets — « si on ne le fait pas, l'opération sera refusée » — est **exacte**, mot pour mot
([61]).
*Correction proposée* : garder la citation exacte et la règle, retirer le nom `repertoireDemo` et le
message d'erreur littéral, ou les présenter comme « le message que renvoie Linux » plutôt que comme
ce que la diapositive affiche. Étendre au passage le renvoi à `{diapos="58-61"}` : [58] est le titre
de section « RM », et [59] porte la mise en place de la démonstration.

**R-9 · Le renvoi `{diapos="36"}` est le seul des quatre existants dont la SECTION ne correspond pas.**
Récapitulatif des quatre renvois déjà écrits dans la leçon, vérifiés un par un :
`141:{diapos="13, 17"}` **juste** (les deux « Pile (Stack) de développement ») · `356:{diapos="36"}`
**numéro juste, placement discutable** (la diapositive `pwd` est dans le bloc « Commandes de base »,
l'encadré est sous « L'arborescence Linux ») · `461:{diapos="55"}` **numéro juste, contenu attribué
faux** (voir R-1) · `656:{diapos="59, 60, 61"}` **juste**, borne basse perfectible (voir R-8).
Aucun des quatre n'est à jeter ; deux demandent une réécriture de leur texte, pas de leur numéro.

**R-10 · Trois inventaires présentés comme ceux du cours en débordent, sans marqueur.**
Trois fois le même patron — la leçon complète le cours, ce qui est attendu, mais **en silence**, ce
qui ne l'est pas :
**(a)** `423:` « **Cinq raccourcis** » — [75] en donne **trois** (tabulation, flèches haut/bas, clic
droit pour coller). `Ctrl+C`, `Ctrl+R`, `Ctrl+L`, `Ctrl+Shift+V` : **0/21**.
**(b)** `498:` la table des frappes de `vi` en donne **onze** — [72] en donne **trois** (`:w`, `:wq`,
`:q!`). `:q` seul, `:set nu`, `dd`, `u`, `Ctrl+r`, `gg`, `G`, `/motif` : absents du déck.
**(c)** `450:` le bloc de code « Lire un fichier sans l'ouvrir » enseigne `cat`, `less`, `head` et
`tail -f` — seul `cat` est au cours ([55]) ; `less` **0/21**, `head` **0/21**, `tail` **0/21**. Même
chose ligne 570 : `cp` **0/21**, dans un bloc dont le reste (`mv`) est au cours ([63]-[65]).
*Correction proposée* : un commentaire de fin de ligne ou une phrase courte distinguant, dans chaque
inventaire, ce que le cours donne de ce que la leçon ajoute. C'est le §6 de
`.claude/rules/contenu-pedagogique.md` : *combler le trou est attendu ; le combler en silence ne
l'est pas.*

**R-11 · « L'énoncé de l'exercice 9 écrit Exercice3 avec une majuscule » est contredit par la seule
source du dépôt.**
`418:` « le corrigé officiel de la séance le signale lui-même : l'énoncé de l'exercice 9 écrit
"**Exercice3**" avec une majuscule, et `cd Exercice3` échouera. » Dans
[`exercices.json`](../../content/cours/securite-web/exercices.json), l'énoncé 9 est « Place-toi dans
le répertoire « **exercice3** » » — en minuscules, comme l'énoncé 3 et l'énoncé 8. Ce fichier est une
**reformulation**, pas le document de l'enseignant : la majuscule peut exister dans l'original, et
cette table ne peut pas trancher (§0, limite 1 — aucun extrait des exercices de B10). Ce qui est
mesuré, en revanche : `casse` **0/21**, et aucune diapositive des 21 extraits n'aborde la sensibilité
à la casse. La leçon en fait pourtant l'un des cinq points que « l'examen est susceptible de
demander » (l. 897-899) et l'un des cinq de « À retenir ».
*Correction proposée* : retirer l'attribution au corrigé officiel — « Linux est sensible à la casse »
se démontre sans citer personne — ou la conditionner explicitement à la version papier de la feuille
d'exercices, que ce dépôt n'a pas.

**R-12 · Deux dangers présentés comme des dangers du cours, alors que le cours n'en parle pas — et
le premier est surévalué.**
C'est le mode d'échec n°1 des leçons d'admin système : la menace exagérée s'auto-détruit.
**(a)** `662:` l'encadré `::: attention` sur `rm` — « Une variable vide dans un script —
`rm -rf $DOSSIER/*` où `$DOSSIER` ne vaut rien — **détruit le système en une commande** ». Le fait est
vrai en principe, mais la formulation est absolue : `rm -rf /*` lancé en `root` sur une Ubuntu récente
est refusé par le garde-fou `--preserve-root` de coreutils pour la racine elle-même, et
`rm -rf $DOSSIER/*` avec `$DOSSIER` vide vaut `rm -rf /*`, qui détruit **le contenu** de la racine
sans que la commande soit « une commande qui détruit le système » au sens où un étudiant l'essaiera
pour voir. Le cours, lui, ne dit **rien** de tout cela : `corbeille` **0/21**, `-f` 0, `rm -rf` 0.
**(b)** même encadré : « Jamais de barre oblique finale derrière un lien symbolique » —
`lien symbolique` et `symlink` sont **0/21**, et la leçon elle-même n'a introduit le `l` de `ls -l`
qu'à la ligne 398, dans une table dont la source mesurée est la **séance 5** ([66]).
*Correction proposée* : garder les deux règles — elles sont justes et utiles — mais les sortir d'un
`::: attention` qui a l'air de rapporter un avertissement du cours, vers un `::: complement`. Une
menace qu'un étudiant peut tester et voir échouer devient, dans sa tête, un danger imaginaire.

**R-13 · Deux promesses de séance suivante, dont une seule est tenue par la mesure.**
`888:` « La suite — **clés SSH**, **pare-feu UFW**, **`fail2ban`** — est la matière de la séance 3. »
Mesuré : `ufw` **19 occurrences, toutes en B10-03** ([44]-[72]) et `pare-feu` 16 en B10-03 — la
promesse est **tenue** pour le pare-feu ; `SSH` compte 14 occurrences en B10-03 — tenue également.
Mais `fail2ban` est à **0 sur les 21 extraits**. Même famille, `628:` « c'est la matière de la
séance 3 » à propos des clés SSH : tenue. Et `327:` « La gestion complète des comptes, des groupes et
du fichier `sudoers` est la matière de la **séance 5** » : **tenue**, et largement — B10-05 [34]-[49].
*Correction proposée* : retirer `fail2ban` de l'énumération de la ligne 888, ou l'annoncer comme un
ajout de la leçon plutôt que comme de la matière de la séance 3.

---

## 3 · Ce qui reste non mesurable, et qu'aucune réserve ne tranche

Quatre affirmations de la leçon portent sur le **contenu d'une capture d'écran**, que
`extraire-diapositives.mjs` ne voit pas. Elles ne sont ni confirmées ni infirmées ici, et le lot qui
consommera cette table ne doit pas les traiter comme réfutées :

1. `pwd` répond `/root` dans la démonstration ([36], R-5) ;
2. le message `cannot remove: Is a directory` et le nom `repertoireDemo` ([59]-[61], R-8) ;
3. le contenu des neuf couches de la grille et le tiret SaaS ([13], [17], R-6) ;
4. ce qu'affiche le `cat` de [55] — la page par défaut d'Apache ou un fichier déposé (R-1 ; ici le
   **texte** de la diapositive penche pour le second, ce qui rend l'attribution douteuse, pas fausse).

S'y ajoute la limite structurelle du §0 : **aucun extrait des exercices de B10**. Les treize énoncés
de la séance 2 sont disponibles reformulés dans `exercices.json`, et c'est à eux que R-3 et R-11
confrontent la leçon — pas au document de l'enseignant, que ce dépôt n'a pas.
