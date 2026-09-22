# Renvois diapositives — PHP, module 01 « Introduction à PHP »

> **Ce que c'est.** La table de correspondance **mesurée** entre chaque titre `##`/`###` de
> `content/cours/php/01-introduction-php/lecon.md` et les diapositives réelles du support de la
> **séance 1** du cours **420-4P2-HU** « Développement d'application en PHP » d'Alexandre
> Mageau-Pétrin. Produite le **2026-09-13**, au lot **PHP-2**, **par le fil principal** — le déck
> fait 111 diapositives, donc 111 lignes d'extrait : il tient en une lecture, et la règle du lot 13
> s'applique telle quelle (**c'est la taille de la SOURCE qui décide, pas la nature de la tâche**).

## 0 · La source, et sa fraîcheur

| Étiquette | Cours | Ce qui a été lu | Diapos |
|---|---|---|---|
| **4P2** | 420-4P2-HU « Développement d'application en PHP » — le cours du sujet `php` | `php-2026/extraits/Cours01_Introduction_a_PHP_2026.txt`, **lu en entier** | **111** pour la séance 1 |

Le numéro entre crochets de l'extrait est le **rang de présentation**, dérivé de
`ppt/presentation.xml` — c'est ce numéro-là, et lui seul, qui est cité ici. **Aucun agent ne lit un
`.pptx`**, et `WebFetch` n'est jamais employé sur un support de cours : il invente plutôt que
d'échouer.

✅ **Fraîcheur vérifiée avant d'écrire une ligne de cette table.** `extraire-diapositives.mjs` a été
relancé sur `php-2026/Cours01_Introduction_a_PHP_2026.pptx` le **2026-09-13** et sa sortie est
**identique octet pour octet** à l'extrait de `extraits/` : **111 diapositives**, même ordre, même
texte.

🔴 **Ce que cette vérification NE dit PAS, et il faut l'écrire.** Elle compare l'extrait au `.pptx`
**local**, téléchargé le **2026-08-31**. Elle ne dit **rien** d'une republication faite par
l'enseignant depuis cette date — exactement le trou qui a mordu sur la séance 5 de 420-B10-HU, où
un support neuf a fait passer un déck de 23 à 119 diapositives sans qu'aucun gate ne rougisse. Le
dossier est gitignoré ; **seul un retéléchargement lève ce doute.**

## 1 · Les exercices — vérifiés à la SOURCE D'AUTORITÉ

`content/cours/php/exercices.json` porte **14 exercices** pour la séance 1, références **1 à 14**,
aucun numéro qui saute.

✅ Relevés le **2026-09-13** sur <https://www.alexandrepetrin.ca/exercice-php-cours-1-2026/> — **le
site de l'enseignant, pas la copie locale** (`php-2026/extraits/exercices-cours-01.txt`). Les deux
concordent : 14 énoncés, même ordre, même numérotation. C'est la règle posée après la faute du
2026-08-25 : *une mesure d'état local ne dit jamais rien du monde* ; avant de déclarer une feuille
complète — ou vide — on **ouvre sa page**, et on écrit la date.

Les énoncés du registre sont **REFORMULÉS**, jamais recopiés (décision X-1) : ce dépôt est public.

## 2 · La table des renvois

| # | Titre de la leçon | Renvoi | Ce que portent les diapositives |
|---|---|---|---|
| 1 | `## L'idée en une image` | `{diapos="17-23"}` | ce qu'est PHP, son rôle serveur, l'architecture d'une application web, la pile LAMP |
| 2 | `## En bref — la marche à suivre` | `{diapos="25-58"}` | de l'installation de WAMP à la première page servie par `localhost` |
| 3 | `## Ce que la séance 1 enseigne, et ce que cette leçon ajoute` | `{diapos="3, 6, 7, 8, 12, 13, 19"}` | objectif du cours, évaluation, droit aux notes à l'examen, déroulement, ressources, frais, contenu annoncé |
| 4 | `## Monter l'environnement de développement` | `{diapos="24-38"}` | WAMP : téléchargement, installation, service, menu de la barre système |
| 4a | `### Quand le port 80 est déjà pris` | `{diapos="35-37, 46-49"}` | IIS occupe le port 80 ; `httpd.conf`, `Listen 8080`, redémarrage |
| 4b | `### XAMPP — et pourquoi il n'est pas une option au Cégep` | `{diapos="26, 39-50"}` | XAMPP multiplateforme, `htdocs`, **interdit sur les postes du Cégep** (directive gouvernementale) |
| 5 | `## Où vivent les fichiers, et comment les servir` | `{diapos="45, 51-55"}` | `.php` obligatoire, extensions visibles, `C:/wamp64/www`, `C:/XAMPP/htdocs`, sous-répertoire par site |
| 6 | `## La syntaxe de PHP, en sommaire` | `{diapos="62-63"}` | la liste des dix concepts que la séance couvre |
| 6a | `### Afficher — echo et print` | `{diapos="64-65"}` | `echo` **envoie** au client, il n'« affiche » pas ; l'exemple `<script>alert()</script>` du cours |
| 6b | `### Les variables et leurs types` | `{diapos="66-69"}` | `$`, pas de déclaration, sept types, typage tardif |
| 6c | `### Lire ce que le visiteur envoie — $_GET et $_POST` | `{diapos="70-72"}` | les deux superglobales, GET dans l'URL, POST dans le corps |
| 6d | `### Les opérateurs` | `{diapos="73-75"}` | arithmétiques, `.` de concaténation, `=` contre `==`, `->` |
| 6e | `### Les conditions` | `{diapos="76-79"}` | `if`, `else` |
| 6f | `### Le switch` | `{diapos="80-83"}` | syntaxe, `break`, `default` |
| 6g | `### Les fonctions` | `{diapos="84-92"}` | les quatre formes (avec/sans paramètre, avec/sans retour), puis le typage |
| 6h | `### Les tableaux` | `{diapos="93-94"}` | `array()`, accès par position |
| 6i | `### Les boucles` | `{diapos="95-100"}` | `for`, `foreach`, `while`, `do…while` |
| 6j | `### La modularité — include et require` | `{diapos="101-103"}` | la différence avertissement/erreur fatale, et l'extension `.inc` |
| 6k | `### Les commentaires` | `{diapos="104-105"}` | `//` et `/* */` |
| 7 | `## Exemple simple` | `{diapos="56-60"}` | balises `<?PHP … ?>`, `localhost`, et le code source vu par le client |
| 8 | `## Exemple complet` | `{diapos="56, 70-72, 101-103"}` | une page qui lit un paramètre GET et réutilise un en-tête inclus |
| 9 | `## À toi de jouer` | `{hors-cours}` | les 14 exercices viennent de la **feuille** de la séance, pas du déck |
| 10 | `## À retenir` | `{diapos="107"}` | la conclusion du cours |
| 11 | `## Aller plus loin` | `{diapos="109, 111"}` | ce que la séance 2 apportera, et les références de l'enseignant |

## 3 · La mesure dans l'AUTRE sens — les diapositives orphelines

> 🔴 **Un titre muet fait rougir le gate ; une diapositive qu'aucun titre n'atteint ne fait rougir
> personne.** Douze orphelines au lot 13, cinq au lot 14. Le geste qui les attrape est mécanique :
> faire l'**union** des diapositives citées et la soustraire de `1..111`.

Union des renvois ci-dessus : **92 diapositives citées sur 111**. Les **19** qui restent, une par
une, avec ce qu'elles portent :

| Diapos | Nature | Verdict |
|---|---|---|
| 16, 20, 24, 27, 39, 51, 106, 108, 110 | **diapositives de titre de section**, sans contenu (« Introduction à PHP », « WAMP », « XAMPP », « Projet PHP », « Conclusion », « Questions? ») | ✅ attendu |
| 1, 2 | page couverture et coordonnées de l'enseignant | ✅ attendu |
| 4, 5, 9, 10, 11, 14, 15 | administration de la session : pourquoi ce cours, calendrier, travaux à la maison, conseils d'étude, retards et absences, capsule carrière, outils à distance | ✅ hors matière — aucune n'enseigne PHP |
| 61 | phrase de transition (« dans la prochaine section, nous verrons la syntaxe ») | ✅ attendu |

**Aucun trou de leçon.** Les deux sens sont mesurés séparément, comme le lot 14 l'impose.

## 4 · 🔴 Deux contradictions de la source — à ne PAS trancher en silence

1. **La pondération.** La **diapositive 6** annonce « Cours 9 (Examen 1) : 25 % · Cours 11 (Projet
   de session) : 15 % · Cours 15 (Examen final) : 60 % » — un calendrier à **15** séances. Or
   `content/cours/php/horaire.json`, relevé sur le site du cours, en compte **13** et place
   l'Examen 1 à la séance **6** pour **10 %**. La leçon **ne tranche pas** : elle nomme le
   désaccord et marque le point `à-vérifier:`. L'étudiant a la diapositive sous les yeux — la taire
   le laisserait croire à une erreur de sa part.
2. **La version « Admin » de WAMP.** La **diapositive 33** dit qu'il *faudra peut-être* la version
   Admin au Cégep. Le propriétaire a vérifié sur le poste : **elle est installée et utilisable**
   (décision **D-PHP-3**). C'est un `correction-du-cours`, pas un doute.
3. **XAMPP.** La **diapositive 107** (conclusion) annonce que « l'environnement de développement
   sera XAMPP », alors que la **diapositive 26** écrit que XAMPP n'est **pas disponible** sur les
   postes du Cégep. Le déck se contredit lui-même ; l'environnement de référence du site est
   **WAMP** (D-PHP-3). Le désaccord se **nomme** dans la leçon.

## 5 · Ce qui bloque encore la publication

Le module reste en **`statut: verifiee`**. `valider.mjs` §6 refuse `statut: publiee` au premier
marqueur `à-vérifier:`, et il en reste : les chemins du poste **P-2, P-4, P-5, P-6 et P-7** ne sont
pas fournis (`docs/agile/reprise-php-en-bref.md` §3). Seuls **P-1** (`C:\Users\0758510`) et **P-3**
(`C:\wamp64`, racine servie `C:\wamp64\www`) sont confirmés.

⚠️ **Le module n'entre pas ENCORE dans `MODULES_AU_FORMAT_ACTIONNABLE`** — mais l'obstacle qui l'en
empêchait est **levé depuis le 2026-09-22** (lot **PHP-F**). Il était double :
`src/format-actionnable.spec.ts` fixait `content/cours/securite-web` en dur, si bien qu'un slug PHP
y aurait été compté comme **permission morte** et aurait fait rougir G-test sans correctif possible ;
et la liste était indexée par **slug nu**, donc incapable de distinguer deux cours. Elle porte
désormais des clefs `<sujet>/<slug>`, et le spec balaie les racines rendues par
`build.mjs --racines-par-defaut` — les deux cours. Ce qui reste est une **déclaration de conformité
module par module**, qui vaut revue humaine : lot **PHP-F2**. Les renvois `{diapos="…"}` de cette
table sont écrits **quand même** — leur grammaire est légale sur n'importe quel module ; c'est
seulement leur **caractère obligatoire** qui dépend de la liste.
