# Refonte des leçons — les rendre ACTIONNABLES

> **Ce que c'est.** Le dossier de décision et le plan d'implémentation de la refonte demandée par le
> propriétaire le **2026-08-31**, après lecture du module `11-projet-de-session` en ligne. Le constat
> qui l'ouvre, dans ses mots : *« la théorie étayée en détail, c'est bien, mais je m'y perds lorsque
> je cherche des commandes ou des étapes par étapes »*.
>
> **Statut : LES SEPT ARBITRAGES SONT RENDUS (2026-08-31).** Le verdict du propriétaire est en
> tête de ce fichier, juste dessous ; il fait foi et remplace toute « recommandation » du §(A).
> Rien n'est encore implémenté : le lot 0 écrit les contrats retenus dans
> `docs/contenu/pipeline-contenu.md` et `docs/contenu/ancrage-au-cours.md`.
>
> Cousins : [`../contenu/pipeline-contenu.md`](../contenu/pipeline-contenu.md),
> [`../contenu/ancrage-au-cours.md`](../contenu/ancrage-au-cours.md),
> [`direction-visuelle.md`](direction-visuelle.md).

---

# ⚖️ VERDICT DU PROPRIÉTAIRE — 2026-08-31

Rendu dans la session qui a suivi le `/clear`, à partir de l'Artifact
<https://claude.ai/code/artifact/4d7fbadc-2879-4263-b977-256a1bcb3b07>. **Sept arbitrages, tous
tranchés.** Ce qui suit n'est plus discutable dans ce chantier ; ce qui n'y figure pas reste ouvert.

| # | Décision | Verdict |
|---|---|---|
| **D-A** | La marche à suivre en tête de leçon | **Conteneur dédié `:::: marche-a-suivre`** (option 1) |
| **D-B** | Les diapositives dans les titres et le sommaire | **L'attribut se pose sur le titre lui-même** (option 1) |
| **D-C** | Les onglets « même tâche, deux méthodes » | **Onglets CSS purs (radios), zéro JavaScript** (option 1) |
| **D-D** | La reprise des dix modules publiés | **Gate qui se durcit module par module, avec compteur** (option 3) |
| **R-3** | La séance 11 ne peut pas être déclarée | **La règle s'assouplit** : une séance d'évaluation **pratique** peut porter un module ; une séance d'**examen écrit** reste interdite |
| **R-7** | Reprise des 10 modules **contre** contenu neuf | **La reprise passe devant.** Le contenu neuf des séances restantes attend qu'elle soit finie |
| **R-4** | Le `Ctrl+F` ne trouve pas un onglet masqué | **Coût accepté**, les onglets sont gardés — réserve nommée au contrat, et **R-1 se mesure d'abord** |

**Ce que chaque verdict engage, en une ligne chacun.**

- **D-A** — un conteneur neuf dans le compilateur et le validateur (lots 3 et 4), donc une forme
  qu'un gate peut exiger. C'est ce qui rend D-D possible : on ne peut pas compter ce qu'on ne
  nomme pas.
- **D-B** — l'attribut entre dans le **nom accessible** du titre, donc dans la liste des titres d'un
  lecteur d'écran et dans le sommaire. La contrainte L-024 (`preserveWhitespaces: false` supprime le
  nœud blanc entre deux `<span>`) est à traiter **dans le lot 2**, pas après.
- **D-C** — dépend entièrement de **R-1** : si l'hydratation réécrit le `checked` d'une radio
  statique, le repli écrit est l'option 2. **Mesurer avant de coder le lot 6.**
- **D-D** — le compteur est un littéral épinglé de plus. Il monte de 1 à chaque module repris, et
  **il ne redescend jamais** : c'est le cliquet qui interdit la régression silencieuse.
- **R-3** — modification de contrat dans `ancrage-au-cours.md` §2 **et** `valider.mjs:1942-1947`.
  ⚠️ Elle arrive avec **sa fixture invalide** : un module qui déclare une séance d'**examen écrit**
  doit continuer à être refusé, sans quoi l'assouplissement devient un trou. La distinction
  « évaluation pratique / examen écrit » doit exister dans `horaire.json` **avant** d'être lisible
  par le validateur — si elle n'y est pas, c'est un sous-lot à part.
- **R-7** — la file de production est : module 11 (lot 8), puis les neuf autres (lots 11+), puis le
  contenu neuf. ⚠️ **Conséquence à assumer, elle n'est pas neutre** : les séances enseignées d'ici la
  fin de la reprise n'auront pas de leçon. Le propriétaire l'a tranché en connaissance de ce coût.
- **R-4** — la réserve s'écrit **dans le contrat**, pas dans un commentaire de code : le contenu
  masqué est toujours l'**équivalent** du contenu visible, jamais un exemple pédagogique unique.
  C'est cette clause, et elle seule, qui distingue ce conteneur de ce qu'interdit ST4-1.


## 0 · Ce que la mesure dit du corpus existant

Relevé le 2026-08-31 sur `content/cours/securite-web/` — c'est ce qui dimensionne toute la suite.

| Module | Lignes | Titres `##`/`###` | `::: cours` | `::: complement` | `seance` |
|---|---|---|---|---|---|
| `01-fondamentaux` | 656 | 16 | 4 | 9 | 1 |
| `02-environnement-linux` | 953 | 24 | 5 | 9 | 2 |
| `03-communication-serveur` | 972 | 25 | 7 | 11 | 3 |
| `04-automatisation-surveillance` | 1400 | 30 | 4 | 8 | 4 |
| `07-injection` | 887 | 24 | 8 | 15 | 7 |
| `08-xss` | 789 | 25 | 8 | 9 | 7 |
| `09-csrf` | 1111 | 27 | 3 | 8 | 7 |
| `10-controle-acces` | 1406 | 31 | 10 | 7 | 7 |
| `11-projet-de-session` | 942 | 17 | 3 | 9 | **absent** |
| `20-evaluation-cvss` | 618 | 16 | 0 | 4 | absent |

**Trois choses à lire dans ce tableau.**

1. **Le travail de reprise est un travail de CONTENU, pas de code** : ~247 titres à annoter, 10
   marches à suivre à écrire. Un lot par module, tenu par la boucle `/lecon`.
2. **`11-projet-de-session` ne porte AUCUN `seance`**, et ce n'est pas un oubli. Le contrat
   (`ancrage-au-cours.md` §2) interdit à un module de déclarer une séance qui porte une
   `evaluation` — or la séance 11 est « Projet de session (20 %) ». Le module affiche donc
   « Complément · hors cours » alors qu'il est **la** séance 11. Nœud à trancher (R-3), et c'est
   précisément le module que la refonte attaque en premier.
3. `20-evaluation-cvss` est à **0 `::: cours`** : hors cours, aucune diapositive à citer. La refonte
   ne lui demandera jamais de renvoi — le gate doit le savoir.

---

# (A) Le dossier de décision — quatre choix à trancher

Écrit pour être tranché sans lire une ligne de code. Chaque décision dit ce qu'elle **rend
impossible** : c'est la partie qu'on regrette de ne pas avoir lue.

## D-A · Le bloc « marche à suivre » — le résumé actionnable en tête de leçon

**Le besoin.** *« D'entrée de jeu un résumé concis qui affiche les commandes à exécuter… ou réfère
vers la théorie sur le sujet plus loin dans la page ou vers un autre module. »*

**Le concept en une phrase.** Un bloc de contenu structuré — pas de la prose libre — qui liste des
**étapes numérotées**, chacune avec une phrase impérative, éventuellement un bloc de commandes, et un
**renvoi cliquable** vers la section de théorie qui l'explique.

### Option 1 — un conteneur neuf `:::: marche-a-suivre` (RECOMMANDÉE)

L'auteur écrit, dans une section `## En bref — la marche à suivre` posée juste après
`## L'idée en une image` :

````markdown
:::: marche-a-suivre {titre="Monter l'environnement LAMP local"}

1. {voir="Les commandes, dans l'ordre"} Installer WSL2 et Ubuntu 24.04 depuis PowerShell
   **en administrateur**. C'est la seule commande de la leçon côté Windows.

   ```bash
   wsl --install -d Ubuntu-24.04     # une seule fois par poste
   ```

2. {voir="Les commandes, dans l'ordre"} Ajouter le dépôt `ondrej/php` AVANT d'installer PHP :
   `apt install php` livre la 8.3, le serveur cible sert la 8.4.

3. {voir="module:02-environnement-linux"} Vérifier ce qui est réellement installé — pas ce qu'on
   croit avoir installé.

::::
````

**Ce que ça donne au lecteur** : une liste ordonnée en tête de page, les commandes coloriées comme
partout ailleurs, et à chaque étape un lien « → pourquoi » qui descend au bon endroit de la page (ou
part vers un autre module).

**Le point qui rend l'option solide, et qui n'est pas évident.** `{voir="…"}` désigne la section par
son **titre écrit**, pas par son ancre. L'ancre est fabriquée par le compilateur (`ancrer`, qui
suffixe en cas de collision) : un auteur qui écrirait `#les-commandes-dans-lordre` poserait un
littéral fragile qui casserait en silence au premier renommage. Résolution par titre = **le build
échoue en nommant le titre introuvable**, comme le fait déjà `ref` pour les exercices. Même patron de
liste blanche nominative que `.claude/rules/security.md` §4.

- **Coût** : un conteneur de plus dans le compilateur et le validateur, un type compilé de plus, un
  rendu de plus dans `rendu-blocs`. Environ 3 lots (3, 4 et une part du 7).
- **Ce que ça rend impossible** : de la prose libre au milieu d'une marche à suivre. Une étape = une
  phrase + au plus un bloc de code + au plus un renvoi. C'est **voulu** : le jour où une étape a
  besoin de trois paragraphes, elle appartient à la théorie, pas au résumé.

### Option 2 — pure convention, zéro code

Une section `## En bref` contenant un tableau Markdown ordinaire. Coût de développement : **zéro**.
Coût réel : aucun gate ne peut vérifier qu'elle existe, que ses renvois pointent quelque part, ni
qu'elle reste au même format d'un module à l'autre. C'est le mode d'échec documenté du dépôt (famille
**L-007** : un gate livré n'est pas un gate câblé ; ici, pas de gate du tout). À 10 modules et deux
rédacteurs, le format aura divergé avant la fin de la reprise. **Rend impossible** : le durcissement
progressif de D-D, qui a besoin de quelque chose de mesurable.

### Option 3 — un fichier `marche.json` à côté de `quiz.json`

Structuré et validable par schéma JSON. Mais la marche à suivre **résume la leçon** : la tenir dans
un second fichier oblige l'auteur à maintenir deux documents en accord, et le renvoi « vers la
théorie plus bas » devient un lien entre deux fichiers que rien ne synchronise. Le quiz peut vivre à
part parce qu'il *interroge* la leçon ; un résumé la *reflète*. **Rejeté.**

> **Recommandation : option 1.** Conséquence de gabarit à accepter en même temps : la section
> `## En bref — la marche à suivre` entre dans la liste des sections imposées de
> `pipeline-contenu.md`, **entre** `L'idée en une image` et la théorie. Le brief de rédaction doit la
> nommer — c'est le défaut déjà payé un agent entier au lot des séances 3-4.

## D-B · Le renvoi de diapositives sur les titres et dans le sommaire

**Le besoin.** *« Les diapositives concernées devraient être affichées dans les titres / sous-titres
/ step-by-step, et dans la barre latérale »*, avec le **cours** identifié — mais l'identification du
cours n'est nécessaire **que pour le projet de session**, seul module à mêler deux cours.

**Ce qui existe déjà** : `{diapos="13, 17"}` et `{seance="5"}` sur les encadrés `cours`,
`correction-du-cours` et `exercice-du-cours`, avec leur grammaire, leur validation et leur rendu
(`ancrage-au-cours.md` §3-§5). **Rien de tout cela n'est à réinventer** — la décision porte
uniquement sur l'extension aux **titres de section**.

### Option 1 — l'attribut se pose sur le titre lui-même (RECOMMANDÉE)

```markdown
## Les commandes, dans l'ordre {diapos="12-18"}
### Le VirtualHost {seance="8" cours="php" diapos="30-42"}
```

Trois règles, et rien d'autre :

- **`diapos` seul** = les diapositives de la séance du module (celle du frontmatter). C'est le cas de
  9 modules sur 10.
- **`seance`** ne s'écrit que pour citer une **autre** séance du même cours.
- **`cours`** ne s'écrit que pour citer un **autre cours**. Aujourd'hui, un seul module en a besoin :
  `11-projet-de-session`. Le validateur le **refuse quand il est superflu** (égal au `sujet` du
  module) — un attribut qu'on peut écrire sans effet est un attribut qu'on écrira au hasard.

**Ce que le lecteur voit.** Dans le titre : `Les commandes, dans l'ordre` puis, **sous** le titre et
non dedans, une ligne de renvoi discrète : *« Séance 2 · diapos 12 à 18 »*. Dans le sommaire :
`Les commandes, dans l'ordre (diapos 12-18)`, **dans le texte du lien**.

**Pourquoi sous le titre et non dedans — c'est la partie accessibilité, et elle est décidée ici.** Un
lecteur d'écran offre une « liste des titres » pour naviguer. Y injecter « diapos 12 à 18 » sur 247
titres transforme cette liste en bouillie. Le renvoi est donc un `<p>` frère du titre, lu
immédiatement après lui en lecture linéaire. Dans le **sommaire**, à l'inverse, le renvoi entre bien
dans le texte du lien : c'est là que le propriétaire le cherche, et un lien de sommaire n'a pas de
mode « navigation rapide » à polluer. **Le piège technique à ne pas rater** :
`preserveWhitespaces: false` supprime le nœud blanc entre deux `<span>` et colle les mots dans le nom
accessible (**L-024**). Le renvoi se construit donc comme **une seule chaîne interpolée dans un seul
`<span>`** — exactement ce que fait déjà `renvoiEncadre()` dans `rendu-blocs.ts`, avec ses U+00A0. On
réutilise cette fonction, on n'en écrit pas une deuxième.

- **Coût** : le compilateur doit extraire l'attribut du texte du titre **avant** de fabriquer l'ancre
  (`texteDuTitre` → `ancrer`), sans quoi l'ancre contiendrait `diapos-12-18` et le sommaire
  afficherait l'attribut brut. C'est le seul endroit délicat.
- **Ce que ça rend impossible** : écrire un titre qui contient littéralement `{diapos="…"}` comme
  texte. Coût nul en pratique.

### Option 2 — une ligne de renvoi sous le titre, en conteneur

`::: renvoi {diapos="12-18"}` posé en première ligne de chaque section. Ne touche pas au découpage
des titres — moins risqué côté compilateur. Mais le **sommaire ne le voit pas** : il est construit
depuis `SectionCompilee` (`construireSommaire`, `navigation-lecon.ts`), qui ne porte que titre, ancre
et niveau. Il faudrait alors hisser ce bloc jusqu'à la section, c'est-à-dire faire quand même le
travail de l'option 1, en plus verbeux pour l'auteur. **Rejeté.**

### Le point qui coince : comment nommer le cours de PHP

`horaire.json` est **par sujet**, et `content/cours/php/` n'existe pas (épic E7).
**Recommandation : créer dès maintenant `content/cours/php/horaire.json` seul**, sans aucun module.
Le fichier des séances d'un cours ne dépend d'aucune leçon ; `cours="php"` se résout alors contre le
même chemin de validation que tout le reste, et E7 se contentera de déposer des dossiers à côté.
Aucun mécanisme jetable, aucune rustine à défaire. **Solution de rechange si ça ne passe pas** (R-2) :
un bloc `cours-cites` au frontmatter du seul module 11, refusé par le validateur le jour où
`content/cours/php/horaire.json` existe — donc bruyant à sa péremption, jamais silencieux.

## D-C · Le conteneur à onglets « même tâche, deux méthodes »

**Le besoin.** *« Pouvoir cliquer sur les options pour afficher — style dossier avec les différentes
méthodes. Celui qui est cliqué garde le focus plutôt que d'empiler verticalement. »*

**D'abord : ce n'est PAS une réouverture de ST4-1.** La décision ST4-1 interdit tout sélecteur et
tout repliage **sur le conteneur `comparaison`**, pour trois motifs. Le besoin d'aujourd'hui porte
sur autre chose — le couple `::: cours` + `::: complement`, empilés verticalement, qui montrent **la
même tâche par deux chemins**. Les trois motifs, un par un :

| Motif de ST4-1 | Pourquoi il ne se rejoue pas ici |
|---|---|
| (a) Les volets d'une `comparaison` sont des **vulnérabilités distinctes** — un onglet cacherait un exemple pédagogique entier | Ici les volets sont **le même résultat par deux routes** : `crontab` ou un timer systemd, `apt install composer` ou l'installeur amont. En cacher un ne retire aucune matière ; il retire un **doublon de but**. Et c'est une **règle validée**, pas une intention : un conteneur `methodes` refuse tout volet `vulnerable`/`corrige`, et exige un `libelle` qui nomme la méthode. |
| (b) Un `<details>` fermé ne s'imprime pas et échappe au `Ctrl+F` | La feuille d'impression du dépôt existe déjà et est **tenue par un test** (`rendu-blocs.scss` bloc `@media print`, `design-system.spec.ts`). Le conteneur y **révèle tous ses volets**, chacun sous son libellé. Le `Ctrl+F` reste un **coût réel et assumé** — voir R-4. |
| (c) Un accordéon exclusif peut finir à **zéro** volet à l'écran | Impossible par construction : le mécanisme est un **groupe de boutons radio**, dont exactement un est coché à tout instant, et le premier l'est dans le HTML servi. Zéro volet n'est pas un état atteignable. |

### Option 1 — onglets en CSS pur, sans une ligne de JavaScript (RECOMMANDÉE)

````markdown
:::: methodes
::: methode {libelle="La méthode du cours" defaut}
```bash
crontab -e
```
:::
::: methode {libelle="L'équivalent moderne"}
```bash
systemctl edit --force --full surveillance.timer
```
:::
::::
````

Le rendu pose un `<input type="radio">` par méthode, tous du même `name`, chacun suivi de son
`<label>` (l'onglet visible) ; les panneaux sont affichés ou masqués par la règle CSS
`:checked ~ .panneau`. **Aucun gestionnaire d'événement, aucune liaison Angular, aucun script.**

**Les trois états, comme demandé.**

- **Sans JavaScript** : entièrement fonctionnel. Les onglets se cliquent, se pilotent aux flèches du
  clavier (comportement natif d'un groupe de radios), et le contenu de l'onglet coché s'affiche.
  C'est le seul mécanisme interactif du site qui n'a **pas besoin** de JS.
- **Pendant la fenêtre de pré-hydratation** (**L-033**) : rien à perdre. Le danger de L-033 est qu'un
  composant écrase par sa liaison l'état que le DOM natif a accepté ; ici il n'y a **aucune liaison**
  sur les radios — le HTML est statique, Angular ne les regarde pas. C'est ce qui rend cette option
  acceptable là où des onglets JavaScript peindraient un bouton mort. **À mesurer quand même en
  navigateur** (R-1).
- **À l'impression** : tous les volets, tous les libellés, dans l'ordre du document.

**CSP** : `script-src` reste à **zéro**, aucune solution ne peut le toucher. Côté `style-src`, la
règle CSS vit dans la feuille du composant `rendu-blocs` qui **existe déjà** : son bloc `<style>`
change de **contenu**, donc de **hachage**, sans que le **compte** de 14 bouge. `npm run config:swa`
régénère la valeur ; les trois littéraux épinglés (`generer-config-swa.mjs`,
`config-swa-provenance-style.spec.ts`, `config-swa-contournements.spec.ts`) sont des **comptes**, pas
des valeurs. `BLOCS_STYLE_PAGE_QUIZ` (6) et `BLOCS_STYLE_PAGE_SIMULATION` (7) non plus. **Si l'un
d'eux rougit, la première question est « quelle page mesure-t-il maintenant ? »**, jamais « quel
chiffre y mettre ».

- **Ce que ça rend impossible** : lier vers un volet masqué (un `#fragment` visant l'intérieur d'un
  onglet fermé ne l'ouvrira pas, faute de JS), et retrouver son texte au `Ctrl+F`.

### Option 2 — ne rien faire, et poser un mini-index vertical

Garder l'empilement `cours` puis `complement`, en ajoutant un lien « voir l'équivalent moderne » qui
descend de quelques lignes. Coût quasi nul, zéro risque, zéro hachage. Mais ça ne répond pas au
besoin : le propriétaire demande à **voir la comparaison en un clic et revenir**. À retenir seulement
si R-1 se révèle bloquant.

### Option 3 — un `<details>` par méthode

Autorise **zéro volet ouvert** (motif (c) de ST4-1 se rejoue tel quel), s'imprime mal, et ne donne
pas le comportement « celui qui est cliqué garde la place ». **Rejeté.**

> **Recommandation : option 1**, avec une borne serrée par le validateur : **2 ou 3 méthodes**,
> **exactement un `defaut`**, un `libelle` non vide et unique par conteneur, et **aucun volet
> `vulnerable`/`corrige`** à l'intérieur. Les bornes sont ce qui empêche le conteneur de redevenir,
> par glissement, l'accordéon que ST4-1 a refusé.

## D-D · La reprise des 10 modules déjà publiés

### Option 1 — tout d'un coup, en une passe

Impossible à tenir dans le budget d'agents du dépôt : les modules font 618 à 1406 lignes, et la règle
mesurée quatre fois dit qu'au-delà de ~700 lignes de source un rédacteur se scinde déjà en deux. Une
passe unique gèlerait aussi la publication de nouvelles leçons. **Rejeté.**

### Option 2 — au fil de l'eau, sans gate

Coût nul aujourd'hui, format divergent dans trois mois, et rien pour dire lesquels sont faits. Mode
d'échec **L-007**. **Rejeté.**

### Option 3 — un gate qui se durcit module par module (RECOMMANDÉE)

Le validateur porte une **liste nominative, écrite à la main** :

```js
// tools/content-pipeline/valider.mjs
// Les modules au FORMAT ACTIONNABLE. Un slug n'entre ici qu'au dernier geste de son lot de
// reprise, après revue humaine — jamais dérivé du corpus (S-005, même patron que les hachages CSP).
const MODULES_AU_FORMAT_ACTIONNABLE = new Set(['projet-de-session']);
```

Pour un module de cette liste, le build **échoue** si : il n'a pas de bloc `marche-a-suivre` dans sa
première section ; ou s'il déclare un `seance` et qu'un de ses `##` n'a pas de `diapos`. Pour les
autres, les constructions neuves restent **optionnelles** : rien ne casse, on livre un module à la
fois — exactement le comportement du gate de complétude des exercices (`ancrage-au-cours.md` §6.4).

**Et le durcissement ne peut pas être oublié**, parce qu'un test l'imprime : un spec compare la liste
aux leçons publiées et **écrit combien il en reste**. Le jour où les deux ensembles coïncident, la
constante est supprimée et la règle devient inconditionnelle. Un compteur qui descend vaut mieux
qu'une promesse dans un backlog.

- **Ce que ça rend impossible** : reprendre un module « à moitié ». Entrer dans la liste, c'est
  déclarer le module entièrement conforme.

---

# (B) Le plan, lot par lot

Chaque lot est **un livrable déclarable vert seul**, dimensionné pour tenir sous 120k. Les lots 0 à 7
et 9 sont du **code** (`feature-cycle`) ; les lots 8, 10 et 11+ sont du **contenu** (boucle
`/lecon`). L'ordre est un ordre de dépendance : un lot de rendu ne part jamais avant son lot de
compilation.

## Lot 0 — Les contrats écrits (aucun code)

*« Toute évolution se fait ICI d'abord »* — `pipeline-contenu.md` le dit de lui-même, et un
compilateur qui devance son contrat produit un format que personne ne sait relire.

| Fichier | Changement | Pourquoi |
|---|---|---|
| `docs/contenu/pipeline-contenu.md` | § neuf « Marche à suivre » (syntaxe, `{voir=…}`, place dans le gabarit) ; § neuf « Méthodes » (bornes, refus de `vulnerable`/`corrige`) ; `## En bref — la marche à suivre` ajoutée aux sections imposées | contrat d'auteur |
| `docs/contenu/ancrage-au-cours.md` | §3 étendu : `diapos`/`seance`/`cours` **sur les titres** ; §5 étendu : ce que voit le lecteur dans le titre et dans le sommaire | contrat d'ancrage |
| `.claude/skills/lecon/SKILL.md` | le brief du rédacteur nomme les sections **et** la marche à suivre | défaut déjà payé un agent entier |

**Gates** : aucun (documentaire). **Agent** : scribe.

## Lot 1 — `diapos` sur les titres : compilation et validation

| Fichier | Changement |
|---|---|
| `tools/content-pipeline/compiler-markdown.mjs` | `texteDuTitre` extrait `{…}` du titre **avant** `ancrer` ; réutilise `lireAttributs` avec une matrice fermée `['diapos','seance','cours']` ; `cloturerSection` pose `renvoiCours` sur la section |
| `tools/content-pipeline/valider.mjs` | même matrice côté validateur (duplication assumée, appariée par `src/pipeline-contenu-validation.spec.ts`) ; réutilise `analyserDiapos` et `causeDuRenvoiAuCours` ; **refuse `cours` égal au sujet du module** |
| `tools/content-pipeline/types.d.ts` | `SectionCompilee` gagne `renvoiCours?: { seance: number; diapos: number[]; cours?: string }` |
| `content/cours/php/horaire.json` | **fichier neuf** — les séances du cours 420-4P2-HU, sans aucun module (D-B) |

**Deux fixtures témoins seulement** (une valide, une invalide) : le corpus va au lot 7.
**Gates** : `npm run content:build`, `npm test`, `npm run typecheck:tools`. **Littéraux** : aucun
compte épinglé n'est touché.

## Lot 2 — `diapos` sur les titres : rendu et sommaire

| Fichier | Changement |
|---|---|
| `src/app/features/cours/lecon/lecon.ts` | l. ~295-301 : le `<p class="renvoi-titre">` **frère** du `<h2>`/`<h3>` ; l. ~262-282 : le renvoi **dans** le texte du lien de sommaire |
| `src/app/features/cours/lecon/navigation-lecon.ts` | `SousEntreeSommaire` gagne le renvoi ; `construireSommaire` le propage |
| `src/app/features/cours/lecon/lecon.scss` | style du renvoi (jetons sémantiques seulement) |
| `src/app/features/cours/lecon/rendu-blocs/rendu-blocs.ts` | `renvoiEncadre()` généralisée et **exportée** — une seule fabrique de libellé, une seule chaîne, un seul `<span>` (L-024) |

**Gates** : `npm test`, `npm run build`, `npm run a11y:axe`, `npm run e2e`.
**Littéraux à surveiller** : la **valeur** des hachages de `style-src` change, pas leur **compte**
(14). Si un compte bouge, appliquer la question de S-010 avant de toucher un chiffre.

## Lot 3 — Conteneur `marche-a-suivre` : compilation et validation

`compiler-markdown.mjs` (nouveau conteneur ; résolution de `{voir="Titre de section"}` contre les
titres de la leçon et de `{voir="module:<slug>"}` contre le manifeste, **échec nommé** si
introuvable) · `valider.mjs` (mêmes règles) · `types.d.ts`
(`{ type:'marche-a-suivre', titre, etapes: { html, code?, renvoi? }[] }`). Deux fixtures témoins.
**Gates** : `content:build`, `npm test`, `typecheck:tools`.

## Lot 4 — Conteneur `marche-a-suivre` : rendu

`rendu-blocs.ts` + `.scss` + `.spec.ts`. Liste ordonnée, code colorié par le chemin existant, renvoi
en `routerLink`+`fragment` (**jamais un `href` de fragment nu** — la balise `base` renverrait à
l'accueil, mesuré). Aucun composant neuf, donc **aucun hachage de `style-src` en plus**.
**Gates** : `npm test`, `npm run build`, `npm run a11y:axe`.

## Lot 5 — Conteneur `methodes` : compilation et validation

Mêmes fichiers que le lot 3, plus les bornes de D-C (2-3 méthodes, un seul `defaut`, `libelle` non
vide et unique, aucun volet `vulnerable`/`corrige`). Deux fixtures témoins.

## Lot 6 — Conteneur `methodes` : rendu CSS pur, et sa MESURE

`rendu-blocs.ts`/`.scss`/`.spec.ts` · `e2e/` : un spec neuf qui mesure les trois états (sans JS,
pendant la pré-hydratation, après hydratation) dans un vrai navigateur — **c'est la seule preuve
recevable pour la famille L-033**. `name` du groupe de radios **dérivé du décalage de figures**
existant, jamais une constante (deux groupes homonymes lieraient deux conteneurs sans rapport :
famille S-010). Les `id` neufs ne doivent pas collisionner avec l'espace de noms d'ancres que
`lireLeconCompilee` protège. **Gates** : `npm test`, `npm run build`, `npm run a11y:axe`,
`npm run e2e`, `npm run config:swa`. **Littéraux** : vérifier les 14, les 6 et les 7 ; les porter
seulement après avoir nommé la page.

## Lot 7 — Le corpus de fixtures invalides (LOT À PART)

`.claude/rules/agent-context-budget.md` §9 : un corpus de fixtures a déjà **doublé** un lot. Ici ~12
cas invalides (diapos malformées sur un titre, `cours` superflu, `{voir=…}` introuvable, `voir` vers
un slug inconnu, 1 méthode, 4 méthodes, zéro `defaut`, deux `defaut`, `libelle` vide, `libelle` en
double, `vulnerable` dans `methodes`, marche à suivre absente d'un module de la liste), chacun avec
**sa cause propre**, plus les comptes en dur du mode `--fixtures`. Ce lot n'a pas besoin du
transcript des lots 1/3/5 : la liste des règles suffit.
**Gates** : `npm run content:build -- --fixtures`, `npm test`.

## Lot 8 — Le module 11 repris (CONTENU, boucle `/lecon`)

`content/cours/securite-web/11-projet-de-session/lecon.md` : la marche à suivre en tête, `diapos` sur
les 17 titres, 2-3 conteneurs `methodes` là où `::: cours` et `::: complement` disent la même tâche
(le trio `apt`/Composer, `crontab`/systemd, `.htaccess`/VirtualHost). Matière première :
`php-2026/extraits/*.txt` et `securite-app-web-2026/extraits/*.txt`, dont le numéro entre crochets
est le rang de présentation — **c'est celui-là qu'un `diapos` cite**. Ajoute `'projet-de-session'` à
`MODULES_AU_FORMAT_ACTIONNABLE` en **dernier geste**. Ne cite jamais `Projet_de_Session_PHP.txt`
comme un énoncé complet (PROVENANCE.md).
**Gates** : `content:build`, `npm test`, `npm run build`, `a11y:axe`, `e2e`.

## Lot 9 — Le durcissement (code, petit)

`valider.mjs` (la constante et sa règle) + un spec qui compare la liste aux leçons publiées et
imprime le reste à faire. Peut être fusionné au lot 1 si D-D option 3 est retenue dès maintenant.

## Lot 10 (indépendant) — Ouvrir `ini` et `apache` (dette N-8 / L-080)

Hors du chemin critique, mais la leçon 11 étiquette aujourd'hui deux blocs sous une langue
d'emprunt : le `<figcaption>` visible et l'`aria-label` **annoncent une langue que le bloc ne
contient pas**. Ouvrir la liste fermée à huit fait naître des encres neuves dans
`_coloration-syntaxique-generee.scss` (généré par `content:build`) : un banc de fixtures par
grammaire, sur le modèle de `__fixtures__/langages-web/`, puis `design:contrastes:check`.

## Lot 11 et suivants — les 9 autres modules (CONTENU, un lot par module)

Dans l'ordre de lecture. Les deux plus gros (`04`, 1400 l. et `10`, 1406 l.) se scindent en deux
demi-lots thématiques, seuil déjà mesuré quatre fois.

### Conformité documentaire, par lot

| Lot | Documents mis à jour |
|---|---|
| 0 | `pipeline-contenu.md`, `ancrage-au-cours.md`, `SKILL.md` de `/lecon`, backlog (ouverture de l'épic) |
| 1, 3, 5, 7, 9 | `backlog-phase-1.md` (statut + bloc de clôture), `pipeline-contenu.md` si le contrat a bougé à l'implémentation |
| 2, 4, 6 | `backlog-phase-1.md`, `ancrage-au-cours.md` §5, `direction-visuelle.md` si un jeton neuf apparaît |
| 8, 11+ | `backlog-phase-1.md`, `roadmap.md` (avancement de la reprise), `docs/kb-map.md` si une fiche neuve est sollicitée |
| 10 | `pipeline-contenu.md` (la liste passe de huit à dix), backlog §N-8 |

---

# (C) Les risques que je n'ai PAS levés

**R-1 · L'hydratation d'Angular peut-elle réécrire l'attribut `checked` d'une radio statique ?**
Toute l'option 1 de D-C repose sur « aucune liaison, donc rien à écraser ». C'est une déduction, pas
une mesure — et **L-074** dit exactement ce que valent les déductions de ce genre. *À mesurer* :
Playwright, cocher un onglet pendant la fenêtre de pré-hydratation (chunk paresseux retenu, comme le
fait déjà le harnais e2e), laisser hydrater, vérifier que la coche survit. Si elle ne survit pas,
**replier sur D-C option 2**.

**R-2 · Un `content/cours/php/horaire.json` sans aucun module passe-t-il le pipeline ?** Le
validateur et `generer-manifeste.mjs` n'ont jamais vu un sujet à zéro leçon. *À mesurer* : déposer le
fichier, lancer `npm run content:build` et regarder ce que le manifeste écrit. Repli nommé en D-B.

**R-3 · `11-projet-de-session` ne peut pas déclarer sa séance, et c'est un conflit de contrat.** La
séance 11 porte une `evaluation` ; §2 de `ancrage-au-cours.md` interdit alors à un module de la
déclarer. Le module de la séance 11 affiche donc « Complément · hors cours ». **Arbitrage du
propriétaire requis** : soit la règle s'assouplit (une séance d'évaluation *pratique* peut porter un
module), soit le module 11 reste hors cours et ses renvois passent tous par `seance="…"` explicite.
Je recommande le premier, mais c'est une modification de contrat, pas une décision d'architecte.

**R-4 · Le `Ctrl+F` ne trouve pas le texte d'un onglet masqué.** C'est le motif (b) de ST4-1, et il
est **réel** — je ne l'ai pas levé, je l'ai borné : les libellés restent visibles, l'impression
révèle tout, et le contenu masqué est toujours l'équivalent d'un contenu visible. Si le propriétaire
juge ce coût inacceptable, D-C option 2 est la réponse.

**R-5 · L'impact CSP est raisonné, pas mesuré.** J'annonce « le compte de 14 ne bouge pas, seule la
valeur du hachage change ». *À mesurer* : `npm run build` puis `npm run config:swa` sur une branche
du lot 2, et lire le journal. Toute divergence se traite par la question de **S-010** — « quelle page
mesure ce littéral maintenant ? » — jamais en réécrivant le chiffre.

**R-6 · Les renvois de diapositives sont aussi faux que leur source.** Les extraits sont mesurés et
portent le rang de présentation, ce qui est le bon numéro ; mais aucun gate ne peut vérifier qu'une
diapositive **parle bien** du titre qui la cite. Vérification humaine, du ressort du
`verificateur-theorie`.

**R-7 · Le volume total de la reprise n'est pas budgété.** 10 modules × un lot de contenu, avec deux
scissions : ~12 runs de rédaction, soit un trimestre de production à côté du contenu neuf des séances
restantes. **Le propriétaire doit dire lequel des deux passe devant.**

---

## Post-mortem de brief — pourquoi cet agent a débordé

L'architecte a fini à **163 247 tokens** pour 21 appels d'outils, au-dessus du maximum de 150k. La
variable n'était pas l'exploration (21 appels, c'est peu) mais le **volume écrit** : ce dossier fait
~600 lignes, quatre décisions à trois options chacune plus douze lots. Même famille que
`.claude/rules/agent-context-budget.md` §9 — le volume de SORTIE compte autant que celui de la
source. **La découpe juste était deux agents** : le dossier de décision (A) d'abord, le plan par lots
(B) ensuite, une fois les décisions tranchées par le propriétaire — le second n'a pas besoin du
transcript du premier, seulement de ses quatre verdicts.

⚠️ **Et l'outil `Write` était désactivé pour les sous-agents de cette session** : l'agent a dû rendre
son dossier dans son rapport final, que le fil principal a réécrit sur disque. Vérifier l'outillage
disponible **avant** de confier un livrable-fichier à un agent, sinon le rapport porte le livrable
entier et le budget explose une seconde fois.
