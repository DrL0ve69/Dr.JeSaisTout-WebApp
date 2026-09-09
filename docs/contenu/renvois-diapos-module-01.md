# Renvois diapositives — module 01 « Fondamentaux de la sécurité des applications web »

> **Ce que c'est.** La table de correspondance **mesurée** entre chaque section de
> [`content/cours/securite-web/01-fondamentaux/lecon.md`](../../content/cours/securite-web/01-fondamentaux/lecon.md)
> (656 lignes) et les diapositives réelles du support de la **séance 1** du cours 420-B10-HU
> d'Alexandre Mageau-Pétrin, plus les décks frères là où la matière de la leçon vit réellement.
> Produite le **2026-09-09**. Elle est la matière première d'une réécriture des renvois
> `{diapos="…"}` ; elle ne modifie ni la leçon ni aucun autre fichier.
>
> **Pourquoi elle existe.** Le module 01 est celui qui **prétend délimiter le cours** : un encadré
> `::: cours` annonce que la séance 1 « enseigne trois choses, et ce sont celles-là qui sont matière
> d'examen », et un encadré `::: complement` déclare que « aucune question d'examen 2026 ne s'appuie »
> sur tout le reste. C'est l'affirmation la plus vérifiable de la leçon, et la plus coûteuse si elle
> est fausse : un étudiant qui la croit choisit ce qu'il ne révise pas. La mesure ci-dessous la
> trouve **globalement juste et localement fausse** — quatre blocs de contenu plutôt que trois, deux
> bornes hautes trop courtes, et une matière déclarée hors examen qui revient en séance 7.

## 0 · Les sources, et ce qu'elles valent

| Étiquette | Cours | Extraits lus | Diapos |
|---|---|---|---|
| **B10** | 420-B10-HU « Sécurisation des applications web » — le cours du site (`sujet: securite-web`) | `securite-app-web-2026/extraits/Cours01-Introduction_a_la_securite_des_applications_web` (déck de référence, lu en entier), plus `Cours02_environnement_linux`, `Cours03-Securite_communication_serveur`, `Cours04-Taches_cedulees_et_scriptage`, `Cours05_Securite_utilisateurs`, `Cours07_securite_app_web`, `Cours09-Securite_base_de_donnees`, `Cours10-mecanisme_protection_authentification` (balayés) | **83** pour la séance 1 |
| **4P2** | 420-4P2-HU « Développement d'application en PHP » | les 13 extraits de `php-2026/extraits/` — 7 décks de cours, 5 fichiers d'exercices, l'énoncé du projet de session (balayés) | — |

**21 extraits `.txt` au total** : 8 pour B10, 13 pour 4P2. Ils portent **une ligne par diapositive**,
préfixée de son **rang de présentation** entre crochets — c'est ce numéro-là, et lui seul, qui est
cité ici. Ils sont produits par `tools/supports-cours/extraire-diapositives.mjs` depuis les `.pptx` :
ni lecture d'un `.pptx` par un agent, ni reconstitution, ni consultation en ligne. Réserves de
provenance : `php-2026/extraits/PROVENANCE.md`.

**Ce que la mesure ne couvre pas.** Les **exercices de B10** n'ont pas d'extrait (`php-2026/` en a
cinq, `securite-app-web-2026/` aucun). Or la diapositive [6] du déck de la séance 1 écrit « Tout le
contenu de l'examen se trouve dans les notes **et les exercices** ». Un `aucun` de cette table
signifie donc exactement : *absent des 21 extraits de diapositives*, jamais *absent du cours*.

**Lecture des colonnes.**

- **`Cours`** — `B10`, `4P2`, `les deux`, ou **`aucun`**. `aucun` n'est pas un échec de recherche :
  c'est un résultat. Une section marquée `aucun` avec une confiance `certaine` signifie que les
  termes **nommés dans la cellule** ont été cherchés dans les **21 extraits**, sans distinction de
  casse, et n'y figurent pas.
- **`Séance`** — le rang du cours dans son propre calendrier, pas le numéro de module du site.
- **`Diapos`** — numéros et plages, virgules, strictement croissants.
- **`Ce que la diapositive porte`** — quelques mots **réellement présents** dans la ligne `[n]`.
  Le renvoi se vérifie en ouvrant l'extrait, sans croire cette table sur parole.
- **`Confiance`** — `certaine` (la diapositive traite explicitement le sujet de la section, ou
  l'absence est mesurée) · `partielle` (elle l'effleure, ou le sujet est réparti).

Une section qui s'appuie sur plusieurs cours ou séances occupe **plusieurs lignes**, une par déck,
pour que la colonne `Diapos` ne mélange jamais deux numérotations. Les encadrés portant une
affirmation attribuable à une diapositive ont leur propre ligne, la section entre parenthèses.

---

## 1 · La table, section par section

| Section (`ligne:titre`) | Cours | Séance | Diapos | Ce que la diapositive porte | Confiance |
|---|---|---|---|---|---|
| `26:# Fondamentaux de la sécurité des applications web` | B10 | 1 | 14, 18 | [14] « Introduction à la sécurité des applications web » ; [18] l'ordre du jour : « Pourquoi la sécurité · Les principes de sécurité (CIA) · Les types d'attaques fréquentes · La configuration de l'environnement de travail · Conclusion » | certaine |
| `28:## L'idée en une image` | B10 | 1 | 26, 29 | [26] « toute forme d'attaque tentera de compromettre un ou plusieurs de ces principes » ; [29] « les comptes sont verrouillés après 3 tentatives manquées et les utilisateurs ne peuvent plus les utiliser » — c'est le « coffre soudé » de la leçon, en version cours | partielle |
| `28:` (l'analogie du coffre-fort et son « où elle casse ») | aucun | — | aucun | Termes cherchés : `coffre`, `bijout`, `analogie` — 0 occurrence sur 21 extraits. L'image et sa borne sont propres à la leçon | certaine |
| `57:## Ce que la séance 1 enseigne, et ce que cette leçon ajoute` | B10 | 1 | 18, 25-30, 31-60, 61-77 | [18] l'ordre du jour en cinq points ; bornes réelles des blocs du déck, mesurées — voir **R-1** et **R-2** | partielle |
| `57:` (encadré `::: cours`, « ce sont celles-là qui sont matière d'examen ») | B10 | 1 | 6, 7 | [6] « Examen 1 (Cours 6) : 25% Projet (Cours 11) : 15% Examen final (Cours 13): 60% … Tout le contenu de l'examen se trouve dans les notes et les exercices » ; [7] « vous avez droit à Les notes de cours Les exercices et leurs corrigés L'Internet » | certaine |
| `57:` (encadré `::: complement`, « aucune question d'examen 2026 ne s'appuie dessus ») | aucun | — | aucun | Termes cherchés sur les 21 extraits : `chapeau` (0), `éthique` (0), `intrusion` (0), `CVE` (0), `CWE` (0), `0-day` (0), `zero-day` (0), `kill chain` (0), `ATT&CK` (0), `SAST` (0), `DAST` (0), `IAST` (0), `boîte noire` (0), `pentest` (0), `DVWA` (0), `Burp` (0), `Top 10` (0). L'inventaire de l'encadré est exact **sauf** pour « l'architecture client/serveur » — voir **R-5** | partielle |
| `82:## La triade CIA — le cadre qui classe toutes les attaques` | B10 | 1 | 26-30 | [26] « Confidentialité (Confidentiality) Intégrité (Integrity) Disponibilité (Availabilty) … C'est ce qu'on appelle les principes CIA » ; [27] « un pirate tente d'accéder à votre compte bancaire », « Agence du revenue du Canada » ; [28] « modifier son compte pour d'ajouter des accès administrateur », modifier « votre message » sur un forum, « injecter du code » ; [29] « noyant de requête bidon (DDOS) » et le verrouillage après 3 échecs | certaine |
| `107:` (nuance 2, « la triade couvre l'accident autant que la malveillance ») | B10 | 1 | 30 | « votre système doit également être conçu pour être protégé contre les erreurs accidentelles … devrait toujours être en "lecture seule" … Il ne faut pas assumer que les utilisateurs ne vont pas accidentellement faire des erreurs » | certaine |
| `98:` (nuance 1 : throttling, CAPTCHA, limitation par IP) | aucun | — | aucun | Termes cherchés : `throttling`, `CAPTCHA`, `ralentissement`, `déverrouillage` — 0 occurrence sur 21 extraits. Le cours pose le problème ([29]), la leçon apporte seule les parades | certaine |
| `112:` (encadré `::: correction-du-cours`, STRIDE et non-répudiation) | aucun | — | aucun | Termes cherchés : `STRIDE`, `non-répudiation`, `authenticité`, `Parker`, `audit` — 0 occurrence sur 21 extraits. L'encadré ne contredit donc aucune diapositive : il complète | certaine |
| `122:## Le vocabulaire : faille, exploit, intrusion` | aucun | — | aucun | Termes cherchés : `chapeau` (0/21), `éthique` (0/21), `hacker` (0/21), `intrusion` (0/21), `faille` (1/21 — 4P2 séance 7, diapositive [55], « on a donc pu empêcher une faille de sécurité de survenir », sans rapport avec du vocabulaire), `exploit` (aucune occurrence du **nom** ; seules les formes verbales « exploiter », « exploite », « exploitation » dans le déck 1). Seul `pirate` est présent — 17 occurrences dans le déck de la séance 1 — voir **R-4** | certaine |
| `167:` (la divulgation responsable, les 90 jours de Project Zero) | aucun | — | aucun | Termes cherchés : `divulgation`, `disclosure`, `Project Zero`, `90 jours` — 0 occurrence sur 21 extraits | certaine |
| `173:## 0-day, CVE et CWE — nommer une faille` | aucun | — | aucun | Termes cherchés : `0-day`, `zero-day`, `CVE`, `CWE`, `CVSS`, `MITRE`, `NVD`, `Log4` — 0 occurrence sur 21 extraits. La leçon annonce cette absence (l. 176), la mesure la confirme | certaine |
| `209:## Ne jamais faire confiance au client` | 4P2 | 1 | 60 | « le code PHP n'est pas visible dans le fureteur du client puisqu'il a été exécuté sur le serveur . Les informations visibles dans le fureteur du client doivent typiquement être "envoyées du côté client" » — la frontière d'exécution est enseignée, dans l'autre cours | partielle |
| `209:` (la validation qui doit vivre côté serveur) | B10 | 7 | 22 | « Les mécanismes de protection : **Validation des entrées utilisateur** Code entité » — le principe revient en matière de séance 7, alors que la leçon le classe en complément hors examen — voir **R-5** | partielle |
| `209:` (côté séance 1) | aucun | — | aucun (déck 1) | Termes cherchés dans le déck de la séance 1 : `côté client`, `validation`, `curl`, `readonly`, `maxlength`, `surface d'attaque` — 0 occurrence. Le seul point de contact est [39], « Un champ de formulaire · Un paramètre dans l'URL · La valeur dans un cookie », donné comme sources d'injection SQL | certaine |
| `255:` (code compilé, décompilation, secret en dur) | aucun | — | aucun | Termes cherchés : `décompil`, `decompil`, `obfus`, `Ghidra`, `dotPeek`, `.pyc` — 0 occurrence sur 21 extraits | certaine |
| `262:## Le panorama des menaces de la séance 1` | B10 | 1 | 33-59 | [33] la liste des huit familles : « Les DDOS · Les injections SQL · Le Cross-site scripting (XSS) · Les attaques de type "Man-in-the-middle" · Les "brute force" · Les librairies de tiers parti · L'Hameçonnage · Les "Ransomware" » ; [35] botnet, « des réseaux de botnet peuvent être loués sur le marché noir » ; [49] « L'attaque par dictionnaire · Les tables arc-en-ciel (Rainbow tables) » ; [56] « exploite une vulnérabilité éternelle: L'erreur humaine » ; [59] « Le principal danger est la vitesse de propagation d'un ransomware » | certaine |
| `264:` (encadré `::: cours`, « pas plus sécuritaire que sa composante la plus faible ») | B10 | 1 | 79 | « Un système peut être attaqué au niveau de multiples composantes et n'est pas plus sécuritaire que la plus faible d'entre elles » — mais c'est la **Conclusion**, hors du bloc 31-59 que l'encadré désigne — voir **R-6** | certaine |
| `264:` (encadré `::: cours`, « dire quel principe CIA chacune vise est de la matière d'examen ») | B10 | 1 | 26, 30 | [26] « toute forme d'attaque tentera de compromettre un ou plusieurs de ces principes » ; [30] « voir le genre d'attaques qui peuvent compromettre les principes CIA ». **Aucune diapositive n'apparie une famille d'attaque à un principe** — voir **R-7** | partielle |
| `286:` (« un site sans données sensibles mérite-t-il d'être protégé ? ») | B10 | 1 | 23 | « Est-ce important si votre information n'a pas d'information sensible? **Oui** … même un site web banal (Ex. Forum de discussion) peut servir de **tremplin** … Cross-site scripting · Analyse de fréquence de mot de passe · Spamming » — matière de cours, mais issue du bloc « Pourquoi la sécurité » que la leçon ne déclare pas — voir **R-1** | certaine |
| `293:` (encadré `::: correction-du-cours`, MITM et CDN) | B10 | 1 | 46, 52 | [46] « notez que crypter la communication ne protège pas contre une attaque de type "Man-in-the-middle" » ; [52] « 2) Lorsque c'est possible, utiliser les serveurs CDN des compagnies qui offrent de tels services », avec bootstrapcdn et w3schools. **Les deux attributions sont exactes**, numéro compris | certaine |
| `310:## Le déroulé d'une intrusion : la kill chain` | aucun | — | aucun | Termes cherchés : `kill chain`, `ATT&CK`, `MITRE`, `Lockheed`, `exfiltration`, `persistance` — 0 occurrence sur 21 extraits. La leçon annonce cette absence (l. 312-314), la mesure la confirme | certaine |
| `357:## L'OWASP Top 10 — deux millésimes actifs` | B10 | 1 | 32, 83 | [32] « Un des organismes dominant dans ce domaine est la fondation OWASP (Open Web Application Security Project) (www.owasp.org) » ; [83] Références : « https://en.wikipedia.org/wiki/OWASP · https://owasp.org/ ». `OWASP` n'apparaît que dans **1 extrait sur 21**, et deux fois seulement | certaine |
| `357:` (les dix catégories, les deux millésimes) | aucun | — | aucun | Termes cherchés : `Top 10`, `A01`, `Broken Access Control`, `SSRF`, `Insecure Design`, `2021`/`2025` en contexte OWASP — 0 occurrence sur 21 extraits. L'affirmation « le deck nomme l'organisme et ne liste aucune catégorie » (l. 360-361) est **exacte** | certaine |
| `397:## Comment on cherche les failles` | aucun | — | aucun | Termes cherchés : `SAST`, `DAST`, `IAST`, `boîte noire`, `boîte blanche`, `boîte grise`, `pentest`, `test d'intrusion` — 0 occurrence sur 21 extraits. La leçon annonce cette absence (l. 400), la mesure la confirme | certaine |
| `427:## La chaîne d'outils de la session` | B10 | 1 | 62, 63 | [62] « exercices de sécurisation de système d'exploitation, de configuration d'infrastructure infonuagique, de sécurisation de code d'application serveur, ainsi que de création de scripts de tâche automatisée » ; [63] « XAMPP ou WAMP · Un éditeur de texte · Putty et WinSCP · Un compte Digital Ocean · Un nom de domaine sur GoDaddy » | certaine |
| `429:` (encadré `::: cours`, « environ 20 $ pour l'infonuagique et le domaine ») | B10 | 1 | 13 | « Frais à prévoir — Plateforme infonuagique **5$ (maximum)** · Nom de domaine **15$ (environ)** ». Le cours n'écrit jamais « 20 $ », et la diapositive est **hors des trois blocs** que la leçon déclare — voir **R-8** | certaine |
| `429:` (le domaine requis pour les certificats) | B10 | 1 | 65 | « Pour déployer des applications, configure des certificats SSL, et activent certaines fonctionnalités de protection sur les applications, il sera nécessaire d'avoir un nom de domaine » | certaine |
| `429:` (le registraire, enregistrement A et serveurs de noms) | B10 | 1 | 65-66 | [65] « Ce dernier doit être loué auprès d'un organisme appelé "Registrar". Pour le cours, nous utiliserons **GoDaddy** » ; [66] « Il est permis d'utiliser un autre registrar … Modifier l'adresse IP de destination (Propriété "@") · Modifier les "Name servers" de votre nom de domaine » — voir **R-9** | certaine |
| `429:` (« un serveur Ubuntu », PuTTY « SSH », WinSCP « SFTP ») | B10 | 2, 3 | — | `Ubuntu` : absent du déck de la séance 1, présent aux séances 2, 3, 9 et 10 de B10 et à la séance 8 de 4P2. `SSH` : même profil, absent de la séance 1. `SFTP` : **0 occurrence sur les 21 extraits** — voir **R-10** | certaine |
| `440:` (encadré `::: complement`, Let's Encrypt et HSTS) | aucun | — | aucun | Termes cherchés : `HSTS`, `Let's Encrypt`, `RFC 6797`, `adresse IP littérale` — 0 occurrence sur 21 extraits | certaine |
| `448:` (« ce laboratoire est un serveur réellement exposé ») | aucun | — | aucun | Aucune diapositive du déck 1 n'oppose un laboratoire volontairement vulnérable à un serveur réel, et `DVWA` est à 0/21. L'affirmation « le millésime 2026 **abandonne** le laboratoire volontairement vulnérable » (l. 430) n'est portée par aucune diapositive — voir **R-11** | certaine |
| `453:` (encadré `::: complement`, DVWA et Burp Suite) | aucun | — | aucun | Termes cherchés : `DVWA`, `Burp`, `Repeater`, `Intruder`, `proxy`, `machine virtuelle`, `conteneur` — 0 occurrence sur 21 extraits | certaine |
| `468:` (encadré `::: correction-du-cours`, l'extension Honey) | B10 | 1 | 75 | « Petit conseil, vous pouvez utiliser l'extension "**Honey**" dans votre fureteur qui tentera d'appliquer des coupons rabais sur votre achat … Dans le cas présent, j'épargnerais 5.10$ USD ». **L'attribution est exacte**, numéro compris ; `Honey` n'apparaît que dans ce seul extrait sur 21 | certaine |
| `483:## Exemple simple` (le panier qui croit son formulaire) | B10 | 1 | 39 | « lorsqu'un utilisateur a le contrôle sur de l'information qui sera ajouté dans une requête SQL … Un champ de formulaire · Un paramètre dans l'URL · La valeur dans un cookie » — le déck nomme les entrées, jamais leur validation | partielle |
| `505:` (le correctif `filter_input` / `FILTER_VALIDATE_INT`) | 4P2 | 3 | 54, 55 | [54] « Les filtres de validation offerts sont les suivants FILTER_VALIDATE_EMAIL FILTER_VALIDATE_FLOAT **FILTER_VALIDATE_INT** FILTER_VALIDATE_IP FILTER_VALIDATE_URL » ; [55] la syntaxe `filter_var(...)` | certaine |
| `483:` (côté B10) | aucun | — | aucun | Termes cherchés : `filter_input`, `FILTER_VALIDATE`, `curl` — 0 occurrence dans les 8 extraits de B10 (`FILTER_VALIDATE` n'existe que dans le déck 4P2 de la séance 3) | certaine |
| `529:## Exemple complet` (la session tenue côté serveur) | 4P2 | 7 | 17, 48 | [17] « il faut charger les informations de la session de l'utilisateur avec la fonction : session_start(" ; [48] « session_start(); if (!isset($_SESSION[ "id_utilisateur" ])){ //Rediriger vers la page d'accueil » — c'est le motif du volet corrigé de la leçon | certaine |
| `529:` (même motif, côté B10) | B10 | 10 | 92 | « <?PHP session_start(); if (isset($_SESSION["DERNIERE_ACTIVITE"])) { if (time() - $_SESSION["DERNIERE_ACTIVITE"] > 600) { session_unset(); session_destroy(); » | partielle |
| `529:` (le cookie comme entrée du client) | 4P2 | 2 | 9 | « Liste des variables super globales : $GLOBALS … $_SERVER … » — la super-globale `$_COOKIE` y est énumérée ; `_COOKIE` n'apparaît que dans ce seul extrait sur 21 | partielle |
| `577:` (le volet C#/ASP.NET, `[Authorize(Roles = …)]`) | aucun | — | aucun | Termes cherchés : `C#`, `csharp`, `Authorize`, `ASP`, `.NET` — 0 occurrence sur 21 extraits. Les deux cours sont exclusivement PHP : ce volet est un complément intégral | certaine |
| `613:## À toi de jouer` | — | — | s.o. | Conteneur du quiz (`[[quiz]]`), aucune matière propre à rattacher | s.o. |
| `620:## À retenir` | B10 | 1 | 26, 29, 30, 79 | Reprend les diapositives de la triade ([26]-[30]) et la conclusion [79], « n'est pas plus sécuritaire que la plus faible d'entre elles » ; le cinquième point (« seuls la triade, le panorama et la chaîne d'outils viennent du cours ») hérite de **R-1** | partielle |
| `639:## Aller plus loin` | B10 | 1 | 12, 83 | [12] « Site du cours (www.alexandremageau.ca) Diapositives Site de références (à la fin des diapositives) Exercices » ; [83] « https://en.wikipedia.org/wiki/OWASP · https://owasp.org/ · https://www.digitalocean.com · https://www.godaddy.com ». **Aucune des quatre références du cours n'est reprise** par la section | partielle |

---

## 2 · Recoupements — ce que la leçon affirme du cours, et ce que les diapositives portent

> Douze écarts mesurés. **Aucun n'est tranché ici** : la leçon n'est pas le livrable de ce document.
> Chacun donne la ligne de la leçon, la diapositive, et l'écart — rien de plus.

**R-1 · « Trois blocs » : le déck en porte quatre, et la leçon enseigne le quatrième.**
La leçon (l. 60-68) écrit « Les diapositives de la séance 1 ne portent que **trois** blocs » et
nomme la triade, le panorama et la chaîne d'outils. La diapositive [18] énonce l'ordre du jour du
cours en cinq points, dont **quatre de contenu** : « Pourquoi la sécurité · Les principes de
sécurité (CIA) · Les types d'attaques fréquentes · La configuration de l'environnement de travail ·
Conclusion ». Le bloc « Pourquoi la sécurité » occupe les diapositives **19 à 24** et n'est pas
déclaré. Or la leçon en tire de la matière qu'elle présente comme venant du cours : la question
« un site sans données sensibles mérite-t-il d'être protégé ? » (l. 286-291) est exactement la
diapositive **[23]**, « Est-ce important si votre information n'a pas d'information sensible? Oui …
peut servir de tremplin ». La leçon enseigne donc, comme matière de cours, un bloc qu'elle déclare
inexistant.

**R-2 · Les deux bornes hautes s'arrêtent une diapositive trop tôt.**
L'encadré annonce « diapositives 31-59 » pour le panorama : le bloc court en réalité de [31] à
**[60]** (« Voici donc qui termine notre aperçu sur les types d'attaques les plus fréquentes »). Il
annonce « diapositives 61-76 » pour la chaîne d'outils : le bloc court de [61] à **[77]** (« Voilà
qui termine notre section sur l'achat de nom de domaine »). Une diapositive de fermeture manque de
chaque côté.

**R-3 · « Pas exigible à l'examen 2026 » repose sur un périmètre que le cours définit plus largement.**
La leçon écrit (l. 62, l. 74-75, l. 636) que le complément est « hors examen 2026 ». La diapositive
[6] écrit « Tout le contenu de l'examen se trouve dans **les notes et les exercices** », et [7]
ajoute que notes de cours et corrigés d'exercices sont permis pendant l'examen. Les « notes » sont
celles des **treize** séances, et il n'existe **aucun extrait des exercices de B10** (§0). La
promesse d'exclusion est donc adossée à une source dont ce dépôt n'a pas la moitié, et à un
périmètre — la séance 1 seule — que la diapositive [6] ne pose pas.

**R-4 · La diapositive qui « liste chapeau blanc, chapeau noir, pirate, éthique, faille, intrusion »
n'existe pas.**
La leçon (l. 125-127) écrit : « La diapositive d'introduction du cours **liste** ces mots — chapeau
blanc, chapeau noir, pirate, éthique, faille, intrusion — sans les définir. » Mesuré sur les 21
extraits : `chapeau` **0**, `éthique` **0**, `hacker` **0**, `intrusion` **0** ; `faille` apparaît
**une seule** fois, dans le déck 4P2 de la séance 7 ([55], « empêcher une faille de sécurité de
survenir »), sans rapport avec une liste de vocabulaire. Seul `pirate` est présent — 17 fois dans le
déck de la séance 1. L'affirmation attribue au cours une diapositive qu'aucun extrait ne porte.
C'est le patron des attributions fausses du module 11, ici dans un `::: complement`, donc sans le
`{source="…"}` qu'un `correction-du-cours` aurait exigé.

**R-5 · « L'architecture client/serveur » est déclarée complément, et redevient matière en séance 7.**
La leçon range « l'architecture client/serveur » dans l'inventaire du complément (l. 73) et écrit
que « aucune question d'examen 2026 ne s'appuie dessus » (l. 74-75), puis répète en `::: complement`
(l. 212-214) que « le cours l'utilise partout sans la traiter pour elle-même ». Mesuré : la
diapositive [22] du déck **B10 séance 7** liste, parmi les mécanismes de protection du XSS,
« **Validation des entrées utilisateur** » ; et la diapositive [60] du déck **4P2 séance 1** énonce
la frontière d'exécution (« le code PHP n'est pas visible dans le fureteur du client puisqu'il a été
exécuté sur le serveur »). Le principe est enseigné — plus tard, et dans les deux cours.

**R-6 · « La composante la plus faible » est attribuée au panorama ; elle est à la Conclusion.**
L'encadré `::: cours` du panorama (l. 267-268) écrit « Le message du tableau est explicite : un
système n'est pas plus sécuritaire que sa composante la plus faible ». La phrase est à la
diapositive **[79]**, dans le bloc « Conclusion » ([78]-[79]) — hors des « diapositives 31-59 » que
la leçon désigne comme le panorama, et hors des trois blocs qu'elle déclare examinables.

**R-7 · L'appariement « attaque → principe CIA » est annoncé comme matière d'examen ; aucune
diapositive ne l'écrit.**
La leçon (l. 265-266) : « Savoir les nommer et dire **quel principe CIA chacune vise** est de la
matière d'examen », et sa table (l. 275-284) donne une colonne « Principe CIA visé » pour les huit
familles. Mesuré : le déck pose le lien **en général** — [26] « toute forme d'attaque tentera de
compromettre un ou plusieurs de ces principes », [30] « voir le genre d'attaques qui peuvent
compromettre les principes CIA » — mais **aucune des diapositives [33] à [59] n'apparie une famille
à un principe**. Le rattachement est un exercice que le cours rend possible, pas un contenu qu'il
livre : la colonne est un travail de la leçon présenté comme du cours.

**R-8 · « Environ 20 $ » est une somme de la leçon, prise dans une diapositive hors périmètre déclaré.**
La leçon (l. 435) : « Budget annoncé par le cours : environ 20 $ pour l'infonuagique **et** le
domaine ». La diapositive **[13]** écrit deux lignes, « Plateforme infonuagique **5$ (maximum)** »
et « Nom de domaine **15$ (environ)** » ; le total de 20 $ n'y figure nulle part, aucune devise
n'est précisée, et l'un des deux chiffres est un **maximum** quand l'autre est une **estimation**.
La diapositive appartient au bloc administratif ([6]-[13]), donc hors des trois blocs que la leçon
déclare examinables — même écart que R-1.

**R-9 · Le cours nomme GoDaddy ; la leçon dit « un registraire ».**
La leçon (l. 432-433) : « un **nom de domaine** loué chez un registraire », puis donne les critères
de choix. Le cours nomme le fournisseur : [63] « Un nom de domaine sur **GoDaddy** », [65] « Pour le
cours, nous utiliserons GoDaddy », et **quatorze diapositives** ([64]-[77]) sont une marche à suivre
d'achat sur GoDaddy, captures comprises. Les critères qu'énonce la leçon sont bien ceux de [66], qui
autorise explicitement un autre registraire — mais un étudiant qui révise cherche « GoDaddy », et
la moitié du bloc « chaîne d'outils » est ce tutoriel-là.

**R-10 · Ubuntu, SSH et SFTP sont attribués à la séance 1.**
La leçon (l. 431-433) écrit, dans un encadré `::: cours` consacré à la séance 1 : « **PuTTY** (SSH)
et **WinSCP** (SFTP) pour piloter un serveur **Ubuntu** chez DigitalOcean ». Mesuré : la diapositive
[63] écrit « Putty et WinSCP » et « Un compte Digital Ocean », sans une mention de protocole ni de
distribution. `Ubuntu` et `SSH` sont **absents du déck de la séance 1** et apparaissent aux séances
**2, 3, 9 et 10** de B10. `SFTP` est à **0 occurrence sur les 21 extraits**. Les trois précisions
sont justes techniquement ; leur rattachement à la séance 1 ne l'est pas.

**R-11 · « Le millésime 2026 abandonne le laboratoire volontairement vulnérable » n'est porté par
aucune diapositive.**
La leçon ouvre l'encadré `::: cours` de la chaîne d'outils (l. 430-431) par cette affirmation
historique. Aucune diapositive du déck 1 ne mentionne un laboratoire vulnérable, ni un millésime
antérieur, ni un abandon ; `DVWA` est à 0/21. C'est une inférence sur l'évolution du cours, écrite
dans l'encadré réservé à ce que le cours dit.

**R-12 · L'avertissement légal de la séance 1 n'est rattaché à rien.**
La diapositive **[17]** est un « Avertissement! » normatif : « Le piratage est une activité illégale
sauf dans certains contextes spécifiques. Vous seul serez responsable si vous utilisez les techniques
vues en classe ailleurs que dans le cadre du cours. » La leçon traite le **cadre éthique**
(l. 163-165, « mandat écrit, périmètre défini, objectif de remédiation ») comme un complément de la
base de connaissances, sans jamais citer cette diapositive ni sa portée disciplinaire. Ce n'est pas
une contradiction : c'est une diapositive de contenu de la séance 1 qu'une leçon prétendant délimiter
cette séance laisse sans renvoi.
