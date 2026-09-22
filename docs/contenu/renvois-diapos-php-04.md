# Renvois diapositives — PHP, module 04 « Programmation orientée objet »

> **Ce que c'est.** La table de correspondance **mesurée** entre chaque titre `##`/`###` prévu pour
> `content/cours/php/04-programmation-orientee-objet/lecon.md` et les diapositives réelles du
> support de la **séance 4** du cours **420-4P2-HU** « Développement d'application en PHP »
> d'Alexandre Mageau-Pétrin. Produite le **2026-09-15**, au lot **PHP-5**, **par le fil principal**
> — le déck fait 53 diapositives, le plus court des cinq : il tient en une lecture, et la règle
> appliquée aux séances 1 à 3 vaut telle quelle (**c'est la taille de la SOURCE qui décide, pas la
> nature de la tâche**).

## 0 · La source, et sa fraîcheur

| Étiquette | Cours | Ce qui a été lu | Diapos |
|---|---|---|---|
| **4P2** | 420-4P2-HU « Développement d'application en PHP » — le cours du sujet `php` | `php-2026/extraits/Cours04_programmation_orientee_objet.txt`, **lu en entier** | **53** pour la séance 4 |

Le numéro entre crochets de l'extrait est le **rang de présentation**, dérivé de
`ppt/presentation.xml` — c'est ce numéro-là, et lui seul, qui est cité ici. **Aucun agent ne lit un
`.pptx`**, et `WebFetch` n'est jamais employé sur un support de cours : il invente plutôt que
d'échouer.

✅ **Fraîcheur vérifiée avant d'écrire une ligne de cette table, et jusqu'au site.**

1. Le `.pptx` servi par le site a été **retéléchargé** le 2026-09-15 et son empreinte comparée à la
   copie locale : `md5 = 8fc7a7e0c9f50873d228946f0ce032e3` des **deux côtés**, `Content-Length:
   1297146` identique. C'est plus fort qu'un contrôle de taille — **aucune republication depuis le
   téléchargement local du 2026-08-31**. `Last-Modified: Wed, 05 Aug 2026 19:34:59 GMT`.
2. `extraire-diapositives.mjs` relancé le **2026-09-15** sur ce `.pptx` : **53 diapositives**, même
   ordre, même texte que l'extrait de `extraits/`.

## 1 · Les exercices — vérifiés à la SOURCE D'AUTORITÉ

`content/cours/php/exercices.json` porte **4 exercices** pour la séance 4, références **1 à 4**,
aucun numéro qui saute. La numérotation repart à `1` parce que le registre exige l'unicité **dans
une séance**, pas dans le fichier (`exercices.schema.json`, champ `reference`). Un encadré de la
leçon les cite donc par `::: exercice-du-cours {seance="4" ref="…"}`.

✅ Relevés le **2026-09-15** sur <https://www.alexandrepetrin.ca/exercice-php-cours-4-2026/> — **le
site de l'enseignant, pas la copie locale** (`php-2026/extraits/exercices-cours-04.txt`). Les deux
concordent **énoncé par énoncé** : 4 énoncés, même ordre, mêmes noms de classes (`Etudiant`,
`Repertoire`, `Fichier`, `Mathematiques`, `Robot`), mêmes noms de méthodes (`CreerCodePermanent`,
`AjouterCoursComplete`, `ChangerNom`, `ChangerPrenom`, `AfficherProfile`, `obtenirCheminAcces`,
`ValeurAbsolue`, `Factoriel`, `RacineCarre`, `MaxTableau`, `Division`, `Facteur`, `meDecrire`),
mêmes noms d'exceptions (`ValeurNegativeException`, `ValeurIncorrecteException`), même arborescence
à l'exercice 2 et même liste d'expressions faciales.

⚠️ **Trois énoncés s'appuient sur une CAPTURE que le relevé ne lit pas.** La page porte trois
images (`image.png`, `image-1-1024x275.png`, `image-2.png`) aux endroits où l'exercice 2 écrit
« Exemple / Résultat: » et où l'exercice 4 écrit « L'utilisation des classes peut ressembler à
ceci: ». La forme exacte de la sortie attendue et le moule d'appel du robot **ne sont donc pas
connus du dépôt par le texte de l'énoncé**. Ils le sont par ailleurs — voir §1a : le corrigé
officiel donne le moule d'appel réel.

⚠️ **Le libellé `feuille` du registre reste « Exercices du cours 4 (2026) »**, alors que le titre
réel de la page de l'enseignant est « Exercice PHP – Cours 4 (2026) ». Ce n'est pas une coquille de
relevé : c'est la **forme employée par les trois séances déjà au registre**, et changer les quatre
d'un coup est un lot à part. Le champ est un libellé affiché, jamais un identifiant
(`exercices.schema.json`).

Les énoncés du registre sont **REFORMULÉS**, jamais recopiés (décision X-1) : ce dépôt est public.

### 1a · Le corrigé officiel de la séance — lu, et il porte CINQ défauts

Le **corrigé publié par l'enseignant** (`corrige_php_cours04.zip`, relevé le **2026-09-15** —
4 fichiers : `exercice01.php` 45 lignes, `exercice02.php` 51, `exercice03.php` 70, `exercice04.php`
53) a été **déballé et lu en entier**. C'est le code que l'étudiant recevra, et il est la meilleure
indication du niveau attendu à l'examen 1.

🔵 **Ces cinq défauts ne sont PAS une découverte de ce lot** : `KnowledgeBase/web/php/php-poo.md`
§ « Ce que montre le corrigé officiel de la séance 4 » les porte depuis le **2026-08-19**, avec
leurs corrections. Ils ont été **retrouvés indépendamment** par lecture du code au présent lot, ce
qui les corrobore — mais une fiche KB est une source, pas une preuve : le `verificateur-theorie`
les confirme quand même.

1. 🔴 **`Factoriel()` est faux, et c'est démontrable contre son propre énoncé.**
   `for ($x=2;$x<$n;$x++){ $accumulateur*=$x; }` s'arrête **avant** `$n` : `Factoriel(5)` rend
   `2×3×4 = 24` là où l'énoncé écrit noir sur blanc `Factoriel(5) = 5 * 4 * 3 * 2 * 1`, soit 120.
   Le remède tient en un caractère : `$x <= $n`. **C'est le meilleur moment mémorable de la
   séance** — un bogue hors-de-portée-d'un-cran, ancré sur du code de l'enseignant, et l'énoncé
   fournit lui-même la valeur attendue.
2. 🔴 **`MaxTableau()` saute l'indice 1.** `$max = $tab[0];` puis `for ($x=2; …)` : l'élément de
   rang 1 n'est **jamais** comparé. `MaxTableau([3, 99, 5])` rend 5. Le remède : `$x = 1`. Même
   famille que le précédent — une borne de boucle — mais dans l'autre sens, ce qui en fait le
   contre-exemple naturel.
3. 🔴 **Le constructeur de `Robot` ignore son paramètre `$expression`** : il le reçoit, puis écrit
   `$this->tete = new Tete("sourire");` en dur. `new Robot("rire", 4, 6)` produit un robot qui
   sourit — et le contrôle de validité de `Tete`, seul endroit où l'exercice 4 exerce une exception,
   **n'est donc jamais réellement éprouvé**. Un paramètre mort est un défaut silencieux : rien ne
   rougit.
4. **Le constructeur d'`Etudiant` écrit `$codePermanent = "";` et `$creditsCompletes = 0;` sans
   `$this->`** — deux **variables locales** qui meurent à la fin du constructeur, et aucune
   propriété initialisée. Le résultat est juste **par accident** : une propriété non typée déclarée
   sans valeur vaut `null`, et `$this->creditsCompletes += 3` traite silencieusement `null` comme 0.
   🔴 **C'est le pont vers la voie moderne** : avec `private int $creditsCompletes;`, le même code
   lèverait `Error: Typed property must not be accessed before initialization`. Le typage ne décore
   pas — il fait remonter ce bogue-là. À écrire en `{voie="cours"}` / `{voie="moderne"}` (D-PHP-1,
   forme courte).
5. **Écart énoncé / corrigé sur `Facteur()`** : l'énoncé demande `ValeurIncorrecteException` pour
   une valeur **inférieure à 2** ; le corrigé teste `< 0`. ⚠️ **`à-vérifier:` quelle version est
   retenue à la correction** — ce marqueur-là est légitime, la réponse ne vit ni dans le code source
   de PHP ni dans une spécification, mais dans la pratique de l'enseignant.

⚠️ **Un sixième point qui n'est PAS un défaut du corrigé, et l'écrire évite de le ré-accuser.**
`Division()` teste `if ($b < 0)`, ce qui est **exactement** ce que son énoncé demande
(« un diviseur inférieure à 0 »). Le trou est **partagé par l'énoncé et le corrigé** : ni l'un ni
l'autre ne traite `$b == 0`. `Division(20, 0)` lève un **`DivisionByZeroError`**, qui est une
`Error` et non une `Exception` — donc `catch (ValeurNegativeException $e)` ne l'attrape pas, et un
`catch (Exception $e)` non plus. Or la **diapositive 43 donne « diviser par 0 » comme exemple
canonique** d'erreur prévisible à traiter par exception : le déck se contredit à distance avec son
propre exercice. C'est la porte d'entrée naturelle vers la hiérarchie `Throwable`.
🔵 La KB a **retiré** l'accusation « `Division()` teste le mauvais cas » le 2026-08-19 après l'avoir
portée : ne pas la réintroduire.

**Deux écarts de forme, à ne pas monter en épingle** : `Bras`, `Jambe`, `Tete`, `Repertoire` et
`Fichier` exposent tous leurs attributs en `public`, ce qui contredit l'encapsulation enseignée
vingt diapositives plus tôt ; et `exercice02.php` ne remplit **jamais** `$listeFichier` ni
`$listeRepertoire`, alors que l'énoncé exige que chaque répertoire connaisse « ses répertoires et
fichiers enfants » — seul le lien enfant → parent est câblé, ce qui suffit à `obtenirCheminAcces()`
mais pas à l'énoncé. Le corrigé écrit aussi `BilletAction.png` là où l'énoncé écrit
`BilletAvion.png`, et `Itineraire.pdf` sans accent.

### 1b · Les fiches KB qui portent cette séance

| Fiche | Ce qu'elle apporte | Lignes |
|---|---|---:|
| `KnowledgeBase/web/php/php-poo.md` | **la source principale** — classes, encapsulation, constructeur, `static`, héritage, polymorphisme, composition, exceptions, le corrigé officiel. Étiquetage 📘 (matière d'examen) / 🧩 (hors déck) déjà posé | 641 |
| `KnowledgeBase/web/php/exercices-corriges-poo-application.md` § « Séance 4 » | les quatre exercices corrigés et commentés | 1057 |

🔴 **Ces deux fiches ont lu les 40 captures d'écran de la séance 4** (passe de rattrapage E3-ST0 du
2026-08-19). C'est le progrès décisif par rapport au lot PHP-4, où seize diapositives-captures
étaient déclarées « inconnues du dépôt » : ici, **la matière des captures est connue**, et la table
du §3 dit pour chacune *où* elle est écrite. La leçon n'a donc rien à deviner.

## 2 · La table des renvois

| # | Titre de la leçon | Renvoi | Ce que portent les diapositives |
|---|---|---|---|
| 1 | `## L'idée en une image` | `{diapos="10, 27, 40"}` | une classe regroupe données et comportement ; l'héritage « est-un » ; la composition « a-un » |
| 2 | `## En bref — la marche à suivre` | `{diapos="10, 11, 14, 15, 18, 27, 36, 40, 43"}` | déclarer, instancier, encapsuler, dériver, redéfinir, composer, lever une exception |
| 3 | `## Ce que la séance 4 enseigne, et ce que cette leçon ajoute` | `{diapos="3, 6, 7"}` | le rappel de la séance 3 et le sommaire annoncé du cours |
| 4 | `## Une classe, et les deux erreurs de syntaxe du déck` | `{diapos="9, 10"}` | ce qu'est une classe, et la syntaxe `class <nom>{ }` |
| 4a | `### Les attributs` | `{diapos="11"}` | `public $nom = "Alice";` dans `class Personne` |
| 4b | `### Le constructeur — et le « $this. » de la diapositive 14` | `{diapos="14"}` | la syntaxe du constructeur, écrite avec un **point** au lieu de `->` |
| 4c | `### Instancier avec « new »` | `{diapos="15, 16"}` | `$variable = new MonObjet(...)`, et l'exemple complet en capture |
| 4d | `### Les méthodes statiques, et l'opérateur « :: »` | `{diapos="12, 13"}` | `<classe>::<fonction>()`, et l'exemple `Mathematiques::Facteur` |
| 5 | `## L'encapsulation` | `{diapos="18, 20"}` | `public` / `private` / `protected`, et pourquoi cacher |
| 5a | `### Le « public getNom() » de la diapositive 19` | `{diapos="19"}` | l'exemple `Personne`, auquel il manque le mot `function` |
| 5b | `### Les deux jeux-questionnaires du cours` | `{diapos="21-24"}` | l'attribut `$solde` privé, puis la fonction `estPositif()` privée |
| 5c | `### Un accesseur par propriété n'est pas de l'encapsulation` | `{hors-cours}` | — (ajout de la leçon, ancré sur la fiche KB) |
| 6 | `## L'héritage` | `{diapos="27, 28"}` | `extends`, la relation « est-un », la spécialisation/généralisation |
| 6a | `### Ce que le cours dit lui-même contre l'héritage` | `{diapos="29, 30"}` | le fort couplage, et les trois alternatives nommées par le déck |
| 7 | `## Le polymorphisme` | `{diapos="32"}` | « plusieurs formes », et les deux variantes annoncées |
| 7a | `### La surcharge — que PHP ne supporte PAS` | `{diapos="33-35"}` | le code projeté, puis l'erreur `Cannot redeclare` qu'il produit |
| 7b | `### La redéfinition — que PHP supporte` | `{diapos="36-38"}` | l'exemple `Carre` / `PrismeABaseCarre` et son résultat |
| 7c | `### Le vrai polymorphisme en PHP passe par le TYPE` | `{hors-cours}` | — (ajout de la leçon : arguments par défaut, `...$args`, interfaces) |
| 8 | `## La composition` | `{diapos="40, 41"}` | « l'attribut d'un objet est un autre objet », et l'exemple `Robot` / `Bras` |
| 9 | `## Les exceptions` | `{diapos="43"}` | interrompre sur une erreur prévisible ; « diviser par 0 » en exemple |
| 9a | `### Les trois démonstrations du cours` | `{diapos="44-46"}` | exception de base, exception personnalisée, deux `catch` distincts |
| 9b | `### Quand une exception personnalisée vaut la peine` | `{diapos="47"}` | l'argument de l'enseignant : plusieurs types au même endroit |
| 9c | `### « Error » n'est pas « Exception » — le piège de la division par zéro` | `{diapos="43"}` | la diapositive donne l'exemple ; la hiérarchie `Throwable` est un ajout |
| 10 | `## Exemple simple` | `{diapos="10, 11, 14, 15"}` | déclarer une classe, l'instancier, l'afficher |
| 11 | `## Exemple complet` | `{diapos="18, 27, 36, 40, 43-46"}` | une petite hiérarchie encapsulée qui compose et lève ses exceptions |
| 12 | `## À toi de jouer` | `{hors-cours}` | — (exercice de la leçon, distinct de ceux du cours) |
| 13 | `## À retenir` | `{diapos="49"}` | la conclusion du cours |
| 14 | `## Aller plus loin` | `{diapos="53"}` | les trois liens w3schools du déck |

🔴 **VINGT-HUIT titres — quatorze `##` et quatorze `###`.** Le compte est écrit ici **après avoir
énuméré la table, jamais avant**, et il s'obtient en comptant les lignes du tableau ci-dessus :
quatorze portent un numéro nu (1 à 14, tous `##`) et quatorze portent une lettre (4a-4d, 5a-5c,
6a, 7a-7c, 9a-9c, tous `###`). C'est **ce chiffre-là** qui dimensionne le brief du rédacteur, et
lui seul : au lot PHP-3, un compte recopié de mémoire (22 au lieu de 26) a sous-estimé de moitié le
volume de sortie, et le rédacteur a fini à 167k. Vingt-huit titres, dont neuf portent du code PHP
verbatim, se situent **au-dessus** des vingt-neuf de PHP-4 en densité de code : le brief prévoit une
découpe en deux moitiés pour la passe adversariale, comme à PHP-4.

## 3 · Le sens inverse — quelles diapositives sont ATTEIGNABLES

**38 diapositives citées sur 53. Quinze orphelines**, une par une :

| Diapo | Ce qu'elle porte | Pourquoi elle n'est citée nulle part |
|---|---|---|
| 1 | « Programmation orientée objet » | page de couverture |
| 2 | « Rappel du dernier cours » | titre de section |
| 4 | « Correction des exercices » | déroulement de la séance, pas du contenu |
| 5 | « Programmation orientée objet » | titre de section |
| 8 | « Les classes » | titre de section |
| 17 | « L'encapsulation » | titre de section |
| 25 | résumé de l'encapsulation | redite de la diapositive 20, sans matière neuve |
| 26 | « Héritage » | titre de section |
| 31 | « Polymorphisme » | titre de section |
| 39 | « Relation de composition » | titre de section |
| 42 | « Les exceptions » | titre de section |
| 48 | « Conclusion » | titre de section |
| 50 | « Prochain cours » | titre de section |
| 51 | l'examen 1 « qui comptera pour 15% » | 🔴 **écartée DÉLIBÉRÉMENT — voir §4 n° 1** |
| 52 | « Questions? » | fin de présentation |

**Aucun trou de leçon.** Les deux sens sont mesurés séparément : 38 + 15 = 53.

✅ **Ce que la table PEUT mesurer ici, et qu'elle ne pouvait pas à PHP-4.** **Seize** diapositives
(**13, 16, 19, 21, 22, 23, 24, 28, 34, 35, 37, 38, 41, 44, 45, 46**) portent leur matière en
**capture d'écran de code** que l'extracteur ne lit pas. Leur contenu est néanmoins **connu du
dépôt**, parce que la KnowledgeBase les a lues à sa passe du 2026-08-19. Où chacune est écrite :

| Capture | Ce qu'elle montre | Où c'est écrit |
|---|---|---|
| 13 | `Mathematiques::Facteur` — l'exemple `static` | `php-poo.md` § `static` |
| 16 | l'instanciation complète | `php-poo.md` § Constructeur |
| 19 | `class Personne` avec `public getNom()` | `php-poo.md` § Classes (l'erreur y est nommée) |
| 21-24 | `CompteBancaire`, `$solde` privé, `estPositif()` privée | `php-poo.md` § Encapsulation |
| 28 | la syntaxe `extends` | `php-poo.md` § Héritage |
| 34-35 | la surcharge refusée, **avec le message `Cannot redeclare`** | `php-poo.md` § Surcharge |
| 37-38 | `Carre` / `PrismeABaseCarre` et ses **trois erreurs de dénomination** | `php-poo.md` § Redéfinition |
| 41 | `Robot` / `Bras` — le chaînage d'accès | `php-poo.md` § Composition |
| 44-46 | les trois démonstrations d'exceptions, verbatim | `php-poo.md` § « Les exceptions telles que le cours les montre » |

🔴 **Aucune plage de lignes n'est écrite ici, et c'est délibéré.** Une plage recopiée se périme en
silence dès que la fiche est éditée, et elle envoie alors lire le mauvais passage. Le geste est
`grep -n "^## " KnowledgeBase/web/php/php-poo.md`, **recalculé à chaque lecture**, puis
`Read(fichier, offset, limit)`.

## 4 · 🔴 Ce que la source dit et qui demande une nuance — à ne PAS trancher en silence

1. 🔴 **LA PONDÉRATION DE L'EXAMEN 1 EST CONTRADICTOIRE À TROIS VOIX, ET AUCUNE NE PEUT ÊTRE
   DÉCLARÉE VRAIE.** Mesuré le 2026-09-15, en ouvrant les trois documents :
   - la **diapositive 51** de ce déck : « le premier examen qui comptera pour **15%** de la note
     finale » ;
   - la **page du cours** <https://www.alexandrepetrin.ca/php/> : « Cours 6 — Examen 1 (**10%**) »,
     puis Examen 2 (20 %), Projet de session (10 %), Examen final (60 %) — total 100 %, sur
     **13 séances**. C'est ce que `content/cours/php/horaire.json` a relevé ;
   - le **plan de cours officiel** `PC_420-4P2-HU_PHP_AlexandreMageauPetrin_2026.docx`, téléchargé
     et converti le 2026-09-15 : « Examen 1 : **25%** · Projet de session : 15% · Examen 3 : 60% »
     — total 100 %, et **aucun Examen 2**.

   Les trois sont internement cohérents et mutuellement **incompatibles**. 🔴 **La fiche KB
   `php-poo.md` affirmait « le plan de cours fait foi », confirmé le 2026-08-19 : cette affirmation
   est RÉFUTÉE** — elle avait comparé deux documents sur trois, sans ouvrir la page du cours.
   Fiche corrigée au présent lot. **La leçon n'écrit aucun chiffre de pondération**, et la
   diapositive 51 est écartée de la table pour cette raison-là, pas parce qu'elle serait un titre de
   section. Même famille que les contradictions déjà consignées pour 420-B10-HU
   (`docs/contenu/ancrage-au-cours.md` §0) et pour le projet de session PHP
   (`php-2026/extraits/PROVENANCE.md`).
2. 🔴 **La diapositive 14 écrit `$this.<attribute>`.** En PHP, `.` est l'opérateur de
   **concaténation de chaînes** ; l'accès à un membre s'écrit `$this->attribut`. Le code de la
   diapositive ne s'exécute pas tel quel. C'est le réflexe C#/Java, et le déck lui-même l'invoque
   (« Comme en C#, on peut utiliser des constructeurs »), ce qui rend l'erreur d'autant plus
   contagieuse. À nommer en `correction-du-cours`.
3. 🔴 **La diapositive 19 écrit `public getNom()` sans le mot `function`.** Erreur d'analyse
   syntaxique, pas d'exécution : la page entière échoue au lieu de s'afficher à moitié. Même
   traitement.
4. **La diapositive 35 affirme que PHP « ne supporte pas le polymorphisme de surcharge » — c'est
   exact, mais incomplet, et l'incomplétude désoriente.** PHP refuse bien deux méthodes de même nom
   (`Cannot redeclare`), mais il obtient le même service autrement : **arguments par défaut**,
   **arguments variadiques** (`...$args`), **types d'union**, et les **méthodes magiques**
   `__call` / `__callStatic` — que le manuel appelle d'ailleurs *overloading*, au sens inverse de
   celui du déck. Un étudiant qui retient « PHP ne sait pas faire » cherchera un contournement
   inutile. La leçon écrit la voie du cours et la voie moderne (D-PHP-1, forme courte).
5. **La diapositive 32 écrit « ce comporter » pour « se comporter », la 49 « la façon don't ».**
   Coquilles de frappe, sans effet sur le sens. **Ne pas les relever dans la leçon** — le mode
   d'échec d'une leçon qui corrige son cours est le grief accumulé, pas l'omission.
6. **La diapositive 29 est le meilleur passage du déck, et elle mérite d'être citée comme telle.**
   « Les relations d'héritage créent un fort couplage… D'autres mesures alternatives peuvent être
   préférables comme les relations de compositions et certains patrons de conception (Ex.
   Decorator) et architecture (Ex. Injections de dépendances). » C'est **exactement** la
   recommandation consensuelle du design objet (« favoriser la composition sur l'héritage », GoF
   1994). La leçon s'appuie dessus plutôt que de l'ajouter par-dessus : le cours a raison, il faut
   le dire — une leçon qui ne sait que corriger son cours n'est plus crue quand elle corrige
   vraiment.
7. **La diapositive 27 dit que l'héritage « copie » les attributs et fonctions du parent.** Le
   verbe est trompeur — rien n'est copié, la résolution se fait par la chaîne d'héritage à
   l'exécution, et c'est précisément ce qui rend la redéfinition possible. À nuancer d'une phrase,
   sans en faire un `correction-du-cours` : le mot est approximatif, l'idée ne l'est pas.
8. **La diapositive 6 promet que la POO sera vue « du côté serveur ET client ».** Le déck ne tient
   pas cette promesse : rien sur les classes JavaScript n'y figure. Rien à corriger — mais ne pas
   promettre à l'étudiant ce que la séance ne couvre pas, et **ne pas écrire `{hors-cours}` sur du
   JavaScript objet** au motif que ce serait absent : la règle veut que `{hors-cours}` réponde à
   « aucune diapositive des extraits », et la diapositive 6 en parle bien.

## 5 · Ce qui bloque encore la publication

Le module restera en **`statut: verifiee`**, comme les séances 1 à 3. `valider.mjs` §6 refuse
`statut: publiee` au premier marqueur `à-vérifier:`, et il en naîtra au moins **deux** :

- les chemins du poste **P-2, P-4, P-5, P-6 et P-7** ne sont pas fournis
  (`docs/agile/reprise-php-en-bref.md` §3). Seuls **P-1** (`C:\Users\0758510`) et **P-3**
  (`C:\wamp64`, racine servie `C:\wamp64\www`) sont confirmés ;
- l'écart énoncé / corrigé sur `Facteur()` (§1a n° 5) — la réponse vit dans la pratique de
  l'enseignant, pas dans une spécification.

🔴 **Et un marqueur à NE PAS poser** : la pondération de l'examen 1 (§4 n° 1). Un `à-vérifier:` y
promettrait une vérification qui a **déjà été faite** — les trois documents ont été ouverts et ils
se contredisent. Le geste juste est de **ne rien affirmer**, pas de promettre de trancher plus tard.
C'est la leçon de méthode du lot PHP-4, appliquée dans l'autre sens : un marqueur posé à tort n'est
pas neutre, il maintient un module hors publication sans raison et promet une vérification que
personne ne fera.

⚠️ **Le module n'entre pas ENCORE dans `MODULES_AU_FORMAT_ACTIONNABLE`** — mais l'obstacle qui
l'en empêchait est **levé depuis le 2026-09-22** (lot **PHP-F**) : `src/format-actionnable.spec.ts`
fixait `content/cours/securite-web` en dur et la liste était indexée par **slug nu**. Elle porte
désormais des clefs `<sujet>/<slug>`, et le spec balaie les racines rendues par
`build.mjs --racines-par-defaut` — les deux cours. Ce qui reste est une **déclaration de conformité
module par module**, qui vaut revue humaine : lot **PHP-F2**. Les renvois `{diapos="…"}` de cette
table sont écrits **quand même** — leur grammaire est légale sur n'importe quel module ; c'est
seulement leur **caractère obligatoire** qui dépend de la liste.
