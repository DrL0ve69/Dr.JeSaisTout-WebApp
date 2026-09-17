# Renvois diapositives — séance 7 « Sécurité du code » (modules 07 et 08)

> **Ce que c'est.** La table de correspondance **mesurée** entre chaque titre `##`/`###` des **deux**
> modules de la séance 7 —
> [`07-injection`](../../content/cours/securite-web/07-injection/lecon.md) (887 lignes) et
> [`08-xss`](../../content/cours/securite-web/08-xss/lecon.md) (789 lignes) — et les diapositives
> réelles des supports du cours 420-B10-HU d'Alexandre Mageau-Pétrin. Produite le **2026-09-17**,
> **par le fil principal**, et **une seule fois pour les deux modules** : c'est la première séance
> dont le déck se partage entre plusieurs leçons, et le déck ne fait que **39 diapositives**.

## 0 · Les sources, et ce qu'un `aucun` signifie exactement

| Étiquette | Cours | Ce qui a été lu |
|---|---|---|
| **B10** | 420-B10-HU « Sécurisation des applications web » — le cours du site (`sujet: securite-web`) | `Cours07_securite_app_web` **lu en entier** (39 diapositives) ; les 7 autres décks et les 4 feuilles d'exercices sondés |
| **4P2** | 420-4P2-HU « Développement d'application en PHP » | les 15 extraits de `php-2026/extraits/`, sondés |

**27 fichiers sondés** au total. Les extraits portent **une ligne par diapositive**, préfixée de son
rang de présentation entre crochets — c'est ce numéro-là, et lui seul, qui est cité ici. Aucun agent
ne lit un `.pptx`, et `WebFetch` n'est **jamais** employé sur un support de cours : il invente
plutôt que d'échouer.

⚠️ **Fraîcheur vérifiée avant de citer.** `extraits/` est gitignoré et aucun gate ne le confronte à
son `.pptx`. Mesuré le 2026-09-17 : le `.pptx` servi rend `Content-Length: 1 249 761` et
`Last-Modified: 2026-08-06`, la copie locale fait **exactement 1 249 761 octets**, et son extrait
est daté du 2026-08-31 — postérieur au support. Le servi n'a pas bougé.

## 1 · Ce que la séance 7 enseigne RÉELLEMENT — le découpage du déck

| Diapositives | Ce qu'elles portent |
|---|---|
| 1-7 | titre, rappel de l'examen, introduction générale, **plan annoncé : « Injection SQL · Cross-site scripting (XSS) · Conclusion »** |
| **8-19** | **Injection SQL** — définition, requête de connexion, tautologie `' or ''='`, sources d'entrée, démonstration sur `connexion.php`, charge `admin';#`, parade par requête préparée |
| **20-33** | **XSS** — définition, plan de section, ce qu'un attaquant peut faire, les deux règles, démonstration, `htmlspecialchars()`, le piège de l'encodage à l'insertion |
| 34-39 | conclusion, prochain cours, questions, références |

🔴 **La séance 7 ne contient RIEN d'autre.** Ni CSRF, ni contrôle d'accès, ni DDOS, ni *local file
inclusion* — la diapositive 6 les **nomme** en passant (« Injection SQL, Cross-site scripting, Local
file inclusion, etc. ») sans en traiter aucun, et la diapositive 7 ferme le plan à deux sujets. C'est
ce constat qui a fait sortir `csrf` et `controle-acces` de la séance 7 (lot « provenance »,
2026-09-17).

⚠️ **Deux erreurs du déck lui-même, à ne PAS recopier.** (a) La diapositive 33 annonce « dans la
prochaine section, nous couvrirons les protections contre les attaques de type **DDOS** » — aucune
section DDOS ne suit, la 34 est la conclusion. (b) La diapositive 37 annonce que le prochain cours
portera sur « la sécurisation des services web et l'installation de certificat HTTPS » — le
**calendrier en ligne** dit que la séance 8 est « Sécurité des bases de données ». Le déck date d'un
horaire antérieur ; **le calendrier fait foi**, pas le déck.

⚠️ **« Le corrigé du cours 8 » (diapo 14) et « le corrigé du cours 5 » (diapo 26) désignent le cours
de PHP, pas celui-ci.** Le fichier nommé est `connexion.php` et la démonstration porte sur un CRUD
PHP ; le corrigé de la séance 5 de PHP (« Intégration de base de données ») est justement
`cours05_code_demo.zip`. **À-vérifier** avant de l'affirmer en prose : les deux corrigés ne sont pas
publiés sur la page du cours de sécurité.

## 2 · La mesure d'absence, en MOT ENTIER, sur les 27 fichiers

Sonde jetable (scratchpad, hors dépôt), mode **mot entier** et insensible aux accents — sans le mot
entier, une sonde remonte n'importe quoi (lot 12 : `vi` → 191 diapositives).

**Aucune occurrence, nulle part :** `prepare` · `bindParam` · `ORM` · `XXE` · `NoSQL` ·
`liste blanche` · `UNION` · `information_schema` · `real_escape_string` · `ORDER BY` · `LFI` ·
`innerHTML` · `CSP` · `Content-Security-Policy` · `HttpOnly` · `SameSite` · `DOMPurify` ·
`réfléchi` · `stocké` · `gabarit` · `IDOR` · `élévation de privilèges` · `CSRF`.

**Présent, mais ailleurs que dans la séance 7 :**

| Terme | Où |
|---|---|
| `injection SQL` | **B10 séance 1** `[38, 39]` (définition + sources) · **B10 séance 9** `[17-21, 28, 33]` (au service de l'authentification) · **4P2 séance 5** `[41]` |
| `XSS` | **B10 séance 1** `[40, 41, 42]` (définition + sites les plus exposés) · **B10 séance 9** `[22, 23, 33]` · **4P2 séance 3** `[26]` |
| `htmlspecialchars` | **4P2 séance 3** `[15, 24, 26]` — la fonction est **enseignée au cours de PHP**, et sa diapo 26 renvoie explicitement « au cours de sécurité » |
| `requête préparée` | **B10 séance 9** `[33, 34]` — tableau des parades, et « sera couverte dans le cours 10 de PHP » |
| `PDO` | **4P2 séance 5** `[55]` uniquement (mention ; le pilote enseigné est **MySQLi**) |
| `mysqli` | **4P2 séance 5** `[35, 40, 47, 55, 73]` · **B10 séance 8** `[41, 42, 58]` |
| `tautologie` | **B10 séance 7** `[12]` — **le seul endroit du corpus** |
| `AJAX` | **B10 séance 7** `[23]` · **B10 séance 9** `[23]` |
| `shell_exec` | **B10 séance 4** `[6]` — au sens du scriptage, jamais d'une injection de commande |
| `MongoDB` | **4P2 séance 1** `[21]` — cité comme SGBD, aucun rapport avec l'injection NoSQL |

🔴 **`{seance="1"}` n'est PAS `{hors-cours}`.** Une absence du déck de **sa** séance ne dit rien du
cours. Le marqueur `{hors-cours}` répond à « **aucune** diapositive des deux cours ne porte cette
section ». Les modules 07 et 08 sont dans la portée de l'**examen final** (`horaire.json`, séance 13,
`portee: [1, 2, 3, 4, 5, 7, 8, 9]`) : une fausse promesse d'exclusion ferait choisir à l'étudiant ce
qu'il ne révise pas.

## 3 · Module 07 — `Sécurité du code — Injection` · 24 titres

| Titre (dépouillé) | Renvoi à poser | Ce que portent les diapositives citées |
|---|---|---|
| `## L'idée en une image` | `{diapos="10, 12"}` | [10] la requête `SELECT … code='<entrée>' AND motdepasse='<entrée>'` · [12] la requête obtenue et la tautologie |
| `## En bref — la marche à suivre` | `{hors-cours}` | section neuve du format actionnable, construction de la leçon |
| `## Ce que la séance 7 enseigne, et ce que cette leçon ajoute` | `{diapos="7, 9"}` | [7] le plan fermé à deux sujets · [9] la définition et les buts de l'injection |
| `## Le principe commun à toutes les injections` | `{diapos="13"}` | [13] « toute circonstance où une information fournie par l'utilisateur se retrouve concaténée dans une requête SQL » |
| `## L'injection SQL vue de l'attaquant` | `{diapos="9, 11"}` | [9] obtenir de l'information, détruire, obtenir des accès privilégiés · [11] les valeurs fournies |
| `### Charge n° 1 — la tautologie sans commentaire` | `{diapos="11, 12"}` | [11] `' or ''='` · [12] la requête finale, « c'est ce qu'on appelle une tautologie » |
| `### Charge n° 2 — le commentaire de fin de ligne` | `{diapos="16, 17"}` | [16] `admin';#` · [17] la requête valide, mot de passe neutralisé |
| `### Le déroulé complet` | `{diapos="10-12, 16, 17"}` | les deux charges bout à bout, telles que le cours les projette |
| `## Le code réellement projeté au cours` | `{diapos="14, 15, 16, 17"}` | [14] « en modifiant le code du corrigé … fichier `connexion.php` » · [15]-[17] la démonstration |
| `## D'où vient l'entrée : tout ce que le client touche` | `{diapos="13"}` | [13] formulaire · cookie · paramètre dans l'URL — **et** B10 séance 1 [39], même liste |
| `## Les trois objectifs de l'attaquant` | `{diapos="9"}` | [9] obtenir de l'information, détruire des données, obtenir des accès privilégiés. ⚠️ **B10 séance 9 [21]** en donne une seconde liste, orientée authentification : s'authentifier sans mot de passe, changer le mot de passe d'un tiers, élever son niveau d'accès — la leçon doit citer les **deux** |
| `## Quand entrer ne suffit plus : extraire les données` | `{seance="1"}` | absent du déck de la séance 7 ; **B10 séance 1 [38]** « lire des données sensibles », **séance 9 [28]** l'extraction du contenu de la base |
| `## La parade : paramétrer, et ce que le paramétrage ne couvre pas` | `{diapos="18"}` | [18] « les paramètres qui proviennent de l'utilisateur doivent être passés en paramètre sous forme de requête préparée ». ⚠️ La **seconde moitié** du titre (ce que le paramétrage ne couvre pas) n'est portée par aucune diapositive — à traiter en `complement` marqué |
| `## Les autres grammaires : commande système, XXE, NoSQL` | `{hors-cours}` | **mesuré** : `XXE`, `NoSQL`, `LFI` absents des 27 fichiers ; `shell_exec` n'apparaît qu'en séance 4, au sens du scriptage |
| `### Injection de commande système` | `{hors-cours}` | idem |
| `### XXE — l'entité externe XML` | `{hors-cours}` | idem |
| `### Injection NoSQL` | `{hors-cours}` | idem |
| `## Exemple simple` | `{diapos="10-12"}` | la requête de connexion et la tautologie, en isolant le mécanisme |
| `## Exemple complet` | `{diapos="14-18"}` | la démonstration `connexion.php` et sa parade |
| `### 1. Le `connexion.php` de la séance 7` | `{diapos="14, 16, 17"}` | ⚠️ **titre à corriger** : le fichier vient du corrigé du **cours de PHP**, pas de la séance 7 de sécurité (voir §1) |
| `### 2. La même faute derrière un ORM` | `{hors-cours}` | `ORM` : aucune occurrence sur les 27 fichiers |
| `### 3. Le cas que le paramétrage ne couvre pas` | `{hors-cours}` | l'identifiant non paramétrable (`ORDER BY`, nom de table) : `ORDER BY` et `liste blanche` absents partout |
| `## À toi de jouer` | `{hors-cours}` | renvoie aux exercices, qui ont leur propre registre |
| `## À retenir` | `{diapos="18, 35"}` | [18] la parade · [35] « on peut mettre en place des mécanismes qui protègent contre les attaques les plus fréquentes » |
| `## Aller plus loin` | `{hors-cours}` | ressources hors cours |

## 4 · Module 08 — `Sécurité du code — XSS` · 24 titres

| Titre (dépouillé) | Renvoi à poser | Ce que portent les diapositives citées |
|---|---|---|
| `## L'idée en une image` | `{diapos="21"}` | [21] « PHP va récupérer mon message et l'inclure dans la page » — le contenu de l'autre exécuté avec l'autorité du site |
| `## En bref — la marche à suivre` | `{hors-cours}` | section neuve du format actionnable |
| `## Le pont avec le module précédent` | `{diapos="31"}` | [31] le seul endroit du corpus qui **relie les deux failles** : « elle permet d'effectuer une attaque de type XSS à partir d'une injection SQL » |
| `## Ce que la séance 7 enseigne, et ce que cette leçon ajoute` | `{diapos="22"}` | [22] le plan de section : mécanique, cas typiques (DOM, cookies, information sensible), protections (validation, code entité) |
| `## Le principe : une injection dans le navigateur` | `{diapos="21"}` | [21] la définition, la balise `script` dans un champ utilisateur |
| `## Les trois familles de XSS` | `{seance="1"}` | ⚠️ **le cours ne distingue AUCUNE famille** : ni `réfléchi`, ni `stocké`, ni « DOM » comme famille. **B10 séance 1 [42]** nomme les sites exposés (média social, forum, évaluations) — c'est le XSS **stocké** sans le mot. La section est un complément, mais pas `{hors-cours}` |
| `### XSS réfléchi — le payload voyage dans l'URL` | `{hors-cours}` | `réfléchi` : aucune occurrence |
| `### XSS stocké — la charge attend en base` | `{diapos="21"}` | [21] « un message sur un forum, votre nom, une publication » — le mécanisme est là, le nom ne l'est pas |
| `### XSS basé sur le DOM — le serveur ne voit jamais rien` | `{hors-cours}` | [22] cite « manipulation DOM » comme **cas d'usage**, pas comme famille où le serveur ne voit rien : renvoi refusé, il promettrait une couverture inexistante |
| `## Ce qu'un attaquant fait vraiment` | `{diapos="23"}` | [23] changer le lien d'une balise `<a>` · voler les cookies par requête AJAX · agir dans une session authentifiée. **Et B10 séance 1 [41]**, même liste |
| `## Pourquoi filtrer les entrées ne suffit pas` | `{diapos="31"}` | [31] le piège de `htmlspecialchars()` à l'insertion, et la porte que l'injection SQL laisse alors ouverte |
| `## Les défenses, dans l'ordre de priorité` | `{diapos="24"}` | [24] les deux règles du cours : ne pas injecter ailleurs que dans du texte affiché, passer par `htmlspecialchars()` |
| `### 1. Encoder la sortie, dans le contexte où la donnée atterrit` | `{diapos="24, 32"}` | [24] la règle · [32] « avant d'être retourné à l'utilisateur en tant que code client ». ⚠️ La notion de **contexte** (attribut, URL, JavaScript) est un complément : le cours ne connaît que le contexte HTML |
| `### 2. Encoder à l'affichage, jamais à l'insertion` | `{diapos="31"}` | [31] la diapositive « Attention! » — c'est **le** point fort de la séance |
| `### 3. Assainir, quand il faut vraiment accepter du HTML` | `{hors-cours}` | `DOMPurify`, `sanitize` : aucune occurrence |
| `### 4. La Content-Security-Policy, filet de sécurité` | `{hors-cours}` | `CSP` et `Content-Security-Policy` : aucune occurrence sur les 27 fichiers |
| `### 5. `HttpOnly` : limiter l'impact, pas la cause` | `{hors-cours}` | `HttpOnly` : aucune occurrence. ⚠️ Les **cookies** sont enseignés en 4P2 séance 7 `[11, 28, 32]`, mais jamais leur drapeau |
| `### 6. Valider les entrées, en complément` | `{diapos="22"}` | [22] « Les mécanismes de protection : **Validation des entrées utilisateur** · Code entité » — le cours la cite, et la leçon la rétrograde à juste titre au rang de complément |
| `## Exemple simple` | `{diapos="27, 28"}` | [27] le formulaire soumis · [28] « le code JavaScript se fait exécuter » |
| `## Exemple complet` | `{diapos="26-30"}` | la démonstration complète et sa parade |
| `### 1. La démonstration de la séance 7` | `{diapos="26, 27, 28, 29, 30"}` | ⚠️ **titre à corriger** : [26] dit « le corrigé du cours 5 », qui est le cours de **PHP** (voir §1) |
| `### 2. La même faute derrière un moteur de gabarits` | `{hors-cours}` | `gabarit`, `moteur de gabarits` : aucune occurrence |
| `### 3. Le cas où le serveur n'est pas en cause` | `{hors-cours}` | le XSS DOM pur : aucune diapositive |
| `## À toi de jouer` | `{hors-cours}` | renvoie aux exercices |
| `## À retenir` | `{diapos="32, 35"}` | [32] la conclusion de section · [35] la conclusion du cours |
| `## Aller plus loin` | `{hors-cours}` | ressources hors cours |

## 5 · La mesure dans l'AUTRE sens — quelles diapositives sont atteignables ?

« Une cartographie se mesure dans les DEUX sens » : un titre muet fait rougir le gate, une
**diapositive orpheline ne fait rougir personne**.

| Diapositives | Atteintes par | Verdict |
|---|---|---|
| 1-5 | — | titre, rappel de l'examen, introduction générale : **aucune matière**, orphelines assumées |
| 6 | — | énumère « Local file inclusion, etc. » sans rien en dire. **Orpheline assumée** : lui donner un renvoi promettrait une couverture que le cours n'a pas |
| 7, 9-19 | module 07 | **toutes atteintes** |
| 8, 15, 20, 25 | — | diapositives de **titre de section**, sans contenu |
| 21-24, 26-33 | module 08 | **toutes atteintes** |
| 34-38 | modules 07 et 08 (`À retenir` cite 35) | 34, 36, 37, 38 sont des diapositives de conclusion et de transition : **orphelines assumées**, et 37 est **fausse** (voir §1) |
| 39 | — | références. **Contient le seul « CSRF » du corpus**, et c'est un lien oublié : ne l'atteindre depuis aucune section est le comportement juste |

**Bilan : 0 diapositive de matière orpheline.** Les 11 orphelines sont des titres, des transitions,
une conclusion et une page de références.

## 6 · Ce que ces deux reprises doivent corriger dans le texte, au-delà des renvois

1. 🔴 **Deux titres de section mentent sur la provenance du code démontré** —
   ``### 1. Le `connexion.php` de la séance 7`` et `### 1. La démonstration de la séance 7`. Les
   diapositives 14 et 26 renvoient au **corrigé du cours de PHP**. À reformuler, et à marquer
   `à-vérifier:` tant que les deux corrigés n'ont pas été lus.
2. **Les trois objectifs de l'attaquant ont deux listes dans le cours** (séance 7 [9] et séance 9
   [21]), et la leçon n'en porte qu'une.
3. **Le déck se trompe deux fois** (DDOS annoncé, prochain cours annoncé) : un encadré
   `correction-du-cours` **sourcé** est dû, pour la seconde au moins — c'est le calendrier en ligne
   qui la dément.
4. **`htmlspecialchars()` est enseignée au cours de PHP** (4P2 séance 3 [26]), qui renvoie
   explicitement « au cours de sécurité ». Un `{cours="php" diapos="26"}` fait le lien dans le bon
   sens.
