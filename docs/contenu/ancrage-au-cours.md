# Ancrage au cours — séances, diapositives et portée d'examen

> **Ce que c'est.** Le contrat qui relie chaque module publié à la **séance du cours réel** qu'il
> couvre, et chaque affirmation de cours à la **diapositive** qui la porte. Décidé par le
> propriétaire le **2026-08-25**, après le constat que les 13 modules planifiés suivaient l'ordre
> OWASP d'une **édition antérieure** du cours et non l'horaire du millésime 2026.
>
> Cousin : [`pipeline-contenu.md`](pipeline-contenu.md) (le contrat de compilation) et
> `.claude/rules/contenu-pedagogique.md` §6 (la règle de provenance 📘 / 🧩 / ⚠️).

## 0 · Le constat qui a rendu ce contrat nécessaire

Le cours **420-B10-HU « Sécurisation des applications web »** (automne 2026, Alexandre
Mageau-Pétrin, Cégep de l'Outaouais) est un cours **serveur et système** avant d'être un cours
OWASP : ses séances 2 à 5 traitent Linux, SSH/UFW, `cron` et les comptes utilisateurs. Les six
premiers modules du site ont pourtant été écrits dans l'ordre OWASP (injection → XSS → CSRF →
contrôle d'accès), qui est l'ordre d'une **édition antérieure**.

Conséquence mesurée : au 2026-08-25, **aucun** des trois modules de l'examen 1 n'existait, et ils
étaient planifiés **en dernier** au backlog (E3-ST14 à ST16).

**La portée de l'examen 1 est fixée par le cours lui-même** : `Cours05_Securite_utilisateurs.pptx`,
diapositive 21 — « *Au prochain cours, ce sera l'examen 1. Celui-ci couvrira la matière des cours
1 à 4.* » La séance 5 n'y est **pas**.

⚠️ **Contradiction relevée dans les documents de l'enseignant, non tranchée.** L'horaire publié
annonce **Examen 1 : 20 % · Projet : 20 % · Examen final : 60 %** ; la diapositive 6 du Cours 1
annonce **25 % · 15 % · 60 %**. `horaire.json` retient les valeurs de **l'horaire**, qui est le
document contractuel. À faire confirmer par le propriétaire auprès de l'enseignant.

## 1 · `content/cours/<sujet>/horaire.json` — la source unique de vérité

Un fichier par sujet, à côté des dossiers de modules. Il porte l'horaire réel du cours et **rien
d'autre** ; aucun module ne recopie son contenu.

```jsonc
{
  "sujet": "securite-web",
  "cours": {
    "code": "420-B10-HU",
    "titre": "Sécurisation des applications web",
    "enseignant": "Alexandre Mageau-Pétrin",
    "etablissement": "Cégep de l'Outaouais",
    "session": "Automne 2026"
  },
  "seances": [
    { "numero": 1, "date": "2026-08-07", "titre": "Introduction à la sécurité des applications web" },
    { "numero": 2, "date": "2026-08-14", "titre": "Gestion d'environnement infonuagique" },
    { "numero": 3, "date": "2026-08-21", "titre": "Sécurité de la communication serveur" },
    { "numero": 4, "date": "2026-08-28", "titre": "Automatisation des tâches de surveillance et nettoyage" },
    { "numero": 5, "date": "2026-09-04", "titre": "Sécurité des utilisateurs" },
    { "numero": 6, "date": "2026-09-11", "titre": "Examen 1",
      "evaluation": { "libelle": "Examen 1", "nature": "examen-ecrit", "ponderation": 20,
                      "portee": [1, 2, 3, 4] } },
    { "numero": 7, "date": "2026-09-18", "titre": "Sécurité du code" },
    { "numero": 8, "date": "2026-09-25", "titre": "Sécurité des services web et certificat HTTPS" },
    { "numero": 9, "date": "2026-10-02", "titre": "Sécurité des bases de données" },
    { "numero": 10, "date": "2026-10-09", "titre": "Sécurité des mécanismes d'authentification et autorisation" },
    { "numero": 11, "date": "2026-10-16", "titre": "Projet de session",
      "evaluation": { "libelle": "Projet de session", "nature": "evaluation-pratique",
                      "ponderation": 20 } },
    { "numero": 12, "date": "2026-10-23", "titre": "Révision" },
    { "numero": 13, "date": "2026-10-30", "titre": "Examen final",
      "evaluation": { "libelle": "Examen final", "nature": "examen-ecrit", "ponderation": 60,
                      "portee": [1, 2, 3, 4, 5, 7, 8, 9, 10] } }
  ]
}
```

**Pourquoi un fichier et pas des champs recopiés dans chaque frontmatter.** Le titre d'une séance
et sa date sont la **même information pour cinq modules** quand une séance en donne cinq. Recopiée,
elle diverge — et rien ne le signalerait. C'est le mode d'échec « deux sources disent deux fois la
même chose » que `valider.mjs` §3 existe déjà pour attraper sur le couple dossier ↔ frontmatter.

## 2 · `seance` — le seul champ neuf du frontmatter

```yaml
seance: 2      # entier 1-13, OPTIONNEL
```

- **Absent** = module **complémentaire, hors cours**. Il s'affiche « Complément · hors cours » et
  n'apparaît dans la portée d'aucun examen. C'est le cas de `evaluation-cvss`, `jwt` et
  `en-tetes-securite-http`, mesurés à **0 📘** au recensement de provenance du 2026-08-19.
- **Présent** : le numéro DOIT exister dans `horaire.json`, et cette séance ne doit pas être un
  **examen écrit** — il n'y a pas de module « Examen 1 ». Une séance d'**évaluation pratique**,
  elle, **peut** porter un module : voir la règle sous cette liste.
- **Plusieurs modules peuvent partager une même séance.** La séance 7 « Sécurité du code » en donne
  cinq. Le rang dans la séance (« 1/5 ») est **dérivé** par le compilateur depuis `ordre`, jamais
  écrit à la main.

🔴 **Toute évaluation n'est pas un examen — arbitrage R-3 du propriétaire, 2026-08-31.**
Trois séances du cours portent une `evaluation` (6, 11, 13) et le schéma ne savait pas les
distinguer : le validateur les refusait toutes les trois comme support de module. Or le
**Projet de session** (séance 11) **s'enseigne** — consignes, barème, démarche, critères de
remise — et c'est exactement ce qu'un module doit couvrir ; l'**Examen 1** et l'**Examen final**,
eux, ne sont que des séances de passation, et un module rattaché à la séance 6 s'afficherait
sous un jalon d'examen dans le sommaire. D'où le champ **`nature`** de l'`evaluation` :

| `nature` | Un module peut-il citer cette séance ? | Exemple |
|---|---|---|
| `examen-ecrit` | **Non** — refusé par `valider.mjs` §3bis, en nommant la nature lue | séances 6 et 13 |
| `evaluation-pratique` | **Oui** | séance 11, « Projet de session » |

⚠️ **`nature` est REQUISE, jamais optionnelle, et c'est le cœur de la règle.** Optionnelle avec
un défaut permissif, elle rouvrirait les séances 6 et 13 **en silence** le jour où quelqu'un
l'omettrait. Requise, elle fait **échouer le build** tant que chaque évaluation n'a pas été
qualifiée **à la main** : une omission se **nomme**, elle ne se devine pas. Le test de
`valider.mjs` porte du reste sur la nature **autorisée**, jamais sur la nature interdite — une
troisième valeur d'énumération ajoutée un jour serait refusée par défaut plutôt qu'admise sans
que personne l'ait vue (`.claude/rules/security.md` §4 : liste blanche, pas liste noire).

⚠️ **La règle des EXERCICES ne bouge pas** (§6) : un exercice ne peut citer **aucune** séance
d'évaluation, quelle que soit sa nature — une feuille d'exercices ne se remet pas un jour
d'évaluation, projet compris.

🔴 **`ordre` ne devient PAS le numéro de séance.** `ordre` reste la position de lecture, unique, et
égale au préfixe `nn` du dossier — c'est déjà le contrat de `valider.mjs` §3, et une séance à cinq
modules le rendrait insatisfiable. L'alignement 01→05 = séances 1→5 est un **heureux hasard**
d'ordonnancement, pas une règle : ne bâtis rien qui en dépende.

## 3 · Le renvoi de diapositives sur les encadrés

```markdown
::: cours {diapos="13, 17"}
Le modèle en couches de la responsabilité partagée…
:::

::: cours {seance="5" diapos="45-50"}
Un module peut citer la diapositive d'une AUTRE séance que la sienne.
:::

::: correction-du-cours {source="NIST SP 800-63B rév. 4, §3.1.1" diapos="92"}
La diapositive 92 impose quatre classes de caractères ; la doctrine 2026 les proscrit.
:::
```

| Variante | `source` | `diapos` / `seance` |
|---|---|---|
| `cours` | **refusé** | **autorisés** |
| `complement` | **refusé** | **refusés** — un complément ne vient pas du cours |
| `correction-du-cours` | **obligatoire** | **autorisés** — c'est là que se compare la méthode du cours à la pratique moderne |
| `attention`, `note`, `a-retenir`, `vulnerable`, `corrige`, `comparaison` | refusé | refusés |

**Grammaire de `diapos`** : numéros et plages séparés par des virgules, `"13"`, `"13, 17"`,
`"45-50"`, `"13, 17, 45-50"`. Entiers ≥ 1, strictement croissants d'un jeton au suivant, bornes de
plage croissantes. Toute autre forme fait **échouer le build** en nommant le jeton fautif — un
renvoi faux envoie l'étudiant réviser la mauvaise diapositive, en silence.

**`seance` sur l'encadré** : optionnel, vaut par défaut le `seance` du frontmatter. **Obligatoire**
si le frontmatter n'en a pas — sans quoi le renvoi ne désigne rien.

## 3bis · Le renvoi de diapositives sur les TITRES de section

> **Décision D-B, tranchée par le propriétaire le 2026-08-31**
> ([`../design/refonte-lecons-actionnables.md`](../design/refonte-lecons-actionnables.md), bloc
> « VERDICT »). Motif : *« les diapositives concernées devraient être affichées dans les titres, les
> sous-titres, les étapes, les commandes — et dans la barre latérale »*. Le §3 ci-dessus ne couvrait
> que les **encadrés** ; la numérotation est conservée telle quelle pour ne casser aucun renvoi
> existant vers §4, §5 et §6.

L'attribut se pose sur le titre **lui-même**, en fin de ligne :

```markdown
## Les commandes, dans l'ordre {diapos="12-18"}
### Vérifier le service {seance="4" diapos="45-50"}
### Le VirtualHost {seance="8" cours="php" diapos="30-42"}
```

**Trois règles, et rien d'autre.**

- **`diapos` seul** = les diapositives de la séance du module, celle du frontmatter. C'est le cas de
  **9 modules sur 10**.
- **`seance`** ne s'écrit que pour citer une **autre** séance du **même** cours. Comme sur un
  encadré (§3), il est **obligatoire** quand le frontmatter n'a pas de `seance` — sans quoi le
  renvoi ne désigne rien.
- **`cours`** ne s'écrit que pour citer un **autre cours**. Aujourd'hui un seul module en a besoin :
  `11-projet-de-session`, qui mêle 420-B10-HU et 420-4P2-HU. 🔴 **Le validateur le REFUSE quand il
  est superflu** — c'est-à-dire égal au `sujet` du module. Un attribut qu'on peut écrire sans effet
  est un attribut qu'on finira par écrire au hasard.

**La grammaire de `diapos` est celle du §3**, sans exception : numéros et plages séparés par des
virgules (`"13"`, `"13, 17"`, `"45-50"`, `"13, 17, 45-50"`), entiers ≥ 1, strictement croissants d'un
jeton au suivant, bornes de plage croissantes. Toute autre forme fait **échouer le build** en nommant
le jeton fautif. La matrice d'attributs est **fermée à trois clefs** — `diapos`, `seance`, `cours` —
et une clef inconnue est un refus nommé, jamais une valeur ignorée en silence.

🔴 **L'attribut est retiré du texte du titre AVANT toute autre chose.** Trois conséquences qui ne se
devinent pas, et dont chacune casserait en silence si elle était ratée :

1. **L'ancre** est fabriquée depuis le titre **dépouillé** — sans quoi elle vaudrait
   `les-commandes-dans-lordre-diapos-12-18`, et tout `{voir="…"}` ou lien profond existant
   pointerait à côté.
2. **Le sommaire** afficherait sinon l'attribut brut, accolades comprises.
3. **Les sections imposées du gabarit se reconnaissent sur le titre dépouillé** : `## Exemple simple
   {diapos="30-34"}` **est** la section « Exemple simple ». La comparaison de `valider.mjs` est une
   égalité de chaîne exacte — si elle voit l'attribut, la leçon est refusée pour « section absente »,
   et le message n'aide personne.

⚠️ **Le renvoi inter-cours (`cours="…"`) n'est pas résoluble en l'état, et c'est mesuré.** Le pipeline
est **mono-sujet par exécution** — `RACINE_PAR_DEFAUT` est en dur dans `build.mjs`,
`compiler-markdown.mjs` et `valider.mjs`, et `validerLecon(dossier, horaire, exercices)` ne reçoit
**qu'un** horaire, au singulier. Un `content/cours/php/horaire.json` déposé aujourd'hui n'est pas
*accepté* : il n'est **jamais lu** (mesure du 2026-08-31, `4/5 sorties — … 1 horaire(s) de sujet :
securite-web`). La résolution inter-cours est donc un lot à part, qui doit **d'abord** rendre le
validateur multi-sujets. Tant qu'il n'est pas livré, `cours="…"` est refusé — un renvoi validé contre
rien serait pire que pas de renvoi du tout.

## 4 · Ce que le contrat compilé gagne

```ts
// BlocContenu, variante encadre
| {
    type: 'encadre';
    variante: VarianteEncadre;
    source?: string;
    /** Renseigné UNIQUEMENT sur `cours` et `correction-du-cours`. Plages déjà dépliées. */
    renvoiCours?: { seance: number; diapos: number[] };
    blocs: BlocContenu[];
  }
```

Depuis §3bis, **une section** peut elle aussi porter un renvoi — le même objet, plus le cours quand
il est cité :

```ts
// SectionCompilee
{
  titre: string;          // le titre DÉPOUILLÉ de son bloc d'attributs
  ancre: string;          // fabriquée depuis le titre dépouillé, jamais depuis la ligne brute
  niveau: 2 | 3;
  /** Renseigné quand le titre porte `{diapos="…"}`. Plages déjà dépliées, comme sur un encadré. */
  renvoiCours?: { seance: number; diapos: number[]; cours?: string };
  blocs: BlocContenu[];
}
```

⚠️ **`cours` n'est présent que lorsqu'il désigne un AUTRE cours que le sujet du module** — le
validateur refuse la forme superflue (§3bis), si bien qu'un `cours` renseigné dans le contrat compilé
est toujours une information, jamais une redite.

`LeconCompilee['frontmatter']` gagne `seance?: number`.
`EntreeManifesteRoutes` gagne `seance?: number`.
Le manifeste de routes gagne, **une fois par sujet**, l'horaire compilé — le sommaire en a besoin
pour intercaler les jalons d'évaluation sans relire `content/` au runtime.

## 5 · Ce que le lecteur voit

**(a) Étiquette d'encadré.** « 📘 COURS · Séance 2 · diapos 13, 17 ». Sans renvoi, l'étiquette
reste « 📘 COURS » — le contrat n'oblige personne à renseigner des diapositives.

⚠️ **LE REPLI DES PLAGES S'APPLIQUE ICI AUSSI, depuis le 2026-09-02** — décision du propriétaire, et
elle a changé le rendu de **six** encadrés déjà en ligne (`02-environnement-linux`,
`03-communication-serveur`) sans qu'aucun fichier de contenu ne soit touché : « diapos 56, 57, 64,
65, 66, 69, 70, 71 » se lit désormais « diapos 56, 57, 64 à 66, 69 à 71 ». **Une seule fabrique de
libellé sert les encadrés et les titres** (`src/app/features/cours/lecon/renvoi-au-cours.ts`) : deux
fabriques divergeraient, et rien ne le signalerait.

**La règle de repli, en un mot :** une suite d'**au moins trois** numéros consécutifs se replie en
« a à b » ; une suite de un ou deux reste séparée par des virgules — « 45, 46 » se lit mieux que
« 45 à 46 ».

**(b) En-tête de page de leçon.** « Séance 2 · Gestion d'environnement infonuagique », et la
pastille **« À l'examen 1 »** quand la séance est dans la `portee` d'une évaluation à venir. Un
module sans `seance` porte « Complément · hors cours ».

**(c) Sommaire du cours.** Les modules dans l'ordre de lecture, chacun annonçant sa séance, et les
**jalons d'évaluation intercalés** à leur position d'horaire : « ── Examen 1 · 11 septembre ·
séances 1 à 4 ── ».

⚠️ **WCAG 2.2 AA — la pastille ne peut pas être qu'une couleur** (1.4.1, l'information ne doit pas
passer par la seule couleur). Elle porte un **texte explicite**, et son contraste se mesure comme
toute paire du design system. Même exigence pour la séance : c'est un mot, pas une teinte.

⚠️ **UNE ÉVALUATION NE COUVRE AUCUNE SÉANCE D’ÉVALUATION — quelle que soit sa NATURE.** La
`portee` d’un examen cite des séances **enseignées** ; elle ne peut citer ni un autre examen, ni le
projet de session, et `valider.mjs` le refuse sur la **présence** d’une `evaluation`, pas sur sa
nature. R-3 n’y a rien changé, **délibérément** : le projet s’enseigne — il a donc un module — mais
il n’est pas de la *matière* qu’un examen interroge. Même raison que pour les exercices (§6), et
c’est le seul endroit où « évaluation pratique » reste traitée comme n’importe quelle évaluation.

**(d) Renvoi posé sur un titre de section (§3bis).** Le renvoi s'affiche **sous** le titre et **non
dedans** : un `<p>` **frère** du `<h2>`/`<h3>`, lu immédiatement après lui en lecture linéaire.

🔴 **SA FORME EST TRANCHÉE (propriétaire, 2026-09-02) : entre PARENTHÈSES, plages REPLIÉES, séance
TUE quand elle est celle du module.** Pour un module dont le frontmatter porte `seance: 2` :

| Le titre porte | Le lecteur voit |
|---|---|
| `{diapos="12-18"}` | `(diapos 12 à 18)` |
| `{seance="4" diapos="45-50"}` | `(séance 4 · diapos 45 à 50)` |
| `{cours="php" seance="8" diapos="30-42"}` | `(420-4P2-HU · séance 8 · diapos 30 à 42)` |

- **La séance ne s'écrit que si elle DIFFÈRE** de celle du module. Répéter « séance 2 » sur les 17
  titres d'un module de la séance 2 est du bruit, et c'est déjà le principe appliqué aux exercices
  (§6.5). ⚠️ Quand `frontmatter.seance` est **absent**, elle s'écrit **toujours** — il n'y a alors
  rien à quoi la comparer.
- **Un `cours` renseigné FORCE l'affichage de la séance** : « 420-4P2-HU · diapos 30 à 42 » laisserait
  croire que la séance est celle du module courant, alors qu'elle appartient à l'autre cours.
- **Minuscule à « séance »** dans cette forme entre parenthèses ; l'encadré, lui, garde sa majuscule
  (§5 (a)) — il ouvre une étiquette, pas une incise.

🔴 **Pourquoi sous le titre, et pas dedans — c'est la partie accessibilité, et elle est décidée.** Un
lecteur d'écran offre une **liste des titres** pour naviguer dans la page. Y injecter « diapos 12 à
18 » sur les 247 titres du corpus transforme cet outil de navigation en bouillie : le nom accessible
du titre doit rester le titre.

**(e) Sommaire de la barre latérale.** Là, à l'inverse, le renvoi entre bien **dans le texte du
lien** : `Les commandes, dans l'ordre (diapos 12 à 18)`. C'est là que le lecteur le cherche, et un
lien de sommaire n'a pas de mode « navigation rapide » à polluer.

⚠️ **Le piège technique à ne pas rater, il a déjà été payé (L-024)** : `preserveWhitespaces: false`
supprime le nœud blanc entre deux `<span>`, et le nom accessible se calcule alors **en un seul mot**
— l'espace visible ne venant que du `gap` CSS, qu'aucune API d'accessibilité ne lit. Le renvoi se
construit donc comme **une seule chaîne interpolée dans un seul `<span>`**, avec ses U+00A0 —
exactement ce que fait déjà `renvoiEncadre()` dans `rendu-blocs.ts`. On **réutilise cette fonction**,
on n'en écrit pas une deuxième : deux fabriques de libellé divergent, et rien ne le signale.

---

## 6 · Les exercices du cours — `exercices.json` et l'encadré `exercice-du-cours`

> **Exigence du propriétaire, posée le 2026-08-25.** *« Quand le module est lié à un cours qui
> contient des exercices (presque tous), tu dois les ajouter (tous) au contenu et les identifier
> clairement comme étant les exercices du cours. »* Elle vaut pour **tout sujet** — sécurité des
> applications web aujourd'hui, PHP et les suivants ensuite.
>
> Deux décisions du propriétaire, prises le même jour, à ne pas rouvrir :
> **X-1 · Les énoncés sont REFORMULÉS, jamais recopiés.** Intention, ordre et numérotation
> conservés ; le texte est réécrit et **attribué**. Motif : ce dépôt est public, et
> `securite-app-web-2026/` est gitignoré pour ne pas rediffuser le matériel de l'enseignant. C'est
> exactement ce que les leçons font déjà des diapositives — on cite, on ne reproduit pas.
> **X-2 · L'exercice se pose AU FIL DU TEXTE**, en encadré, juste après la notion qu'il exerce —
> pas en annexe de fin de leçon. On apprend, puis on pratique, tout de suite.

### 6.1 · `content/cours/<sujet>/exercices.json` — le registre

Un fichier par sujet, à côté de `horaire.json`, et **la seule** source des énoncés. Un module ne
recopie jamais un énoncé : il le **référence**.

```jsonc
{
  "sujet": "securite-web",
  "avertissement": "Énoncés REFORMULÉS à partir des feuilles de …",
  "seances": [
    {
      "numero": 2,                              // DOIT exister dans horaire.json
      "feuille": "Exercices du cours 2 (2026)",
      "exercices": [
        { "reference": "8",
          "titre": "Déplacer un fichier dans un répertoire",
          "enonce": "Déplace « exercice4.txt » dans le répertoire « exercice3 » …" }
      ]
    }
  ]
}
```

**`reference`** est une **chaîne**, pas un entier, et c'est délibéré : la feuille de la séance 3
porte quatre exercices numérotés **plus** un bloc « Projet de session » qui n'a pas de numéro. Le
forcer à `5` mentirait sur le document de l'enseignant. Deux formes admises, et une seule règle de
libellé :

| Forme de `reference` | Exemple | Libellé rendu |
|---|---|---|
| **Numérique** (`^[1-9][0-9]*$`) | `"8"` | « n° 8 » |
| **Nommée** (slug `^[a-z][a-z0-9-]*$`) | `"projet-de-session"` | le `titre` de l'entrée |

Contraintes de validation (`valider.mjs`, échec du build en nommant le jeton fautif) : `sujet` égal
au dossier · `numero` de séance présent dans `horaire.json` et **sans `evaluation`** · **`numero` de
séance unique dans le registre** · `reference` **unique dans sa séance** · les références numériques
**strictement croissantes** — et non **contiguës** — dans l'ordre du tableau · `titre` et `enonce`
non vides · `avertissement` **obligatoire et non vide**.

> **Deux de ces contraintes ont été ajoutées à l'implémentation (2026-08-25) ; elles sont
> confirmées, et voici pourquoi.**
>
> **`numero` de séance unique.** Le registre est indexé par séance dans une `Map` : deux entrées
> portant le même numéro se seraient **écrasées en silence**, et le gate de complétude (§6.4) aurait
> alors cessé de mesurer la feuille perdue — un garde-fou qui se débranche sans rien dire est pire
> que pas de garde-fou. C'est la même famille que **S-010** : la *population* change sous
> l'instrument, et aucun test ne s'éteint.
>
> **`avertissement` obligatoire.** Il rend la décision **X-1** (« énoncés reformulés, jamais
> recopiés ») visible dans le fichier plutôt que seulement dans ce document. ⚠️ Sois honnête sur ce
> qu'il vaut : c'est une **attestation d'auteur**, pas une preuve — aucun gate ne peut comparer un
> énoncé reformulé à un original qui n'est pas dans le dépôt. Il oblige à *déclarer* la politique de
> provenance ; c'est la revue humaine qui la vérifie.

### 6.2 · L'encadré, côté auteur

```markdown
::: exercice-du-cours {seance="2" ref="8"}
`mv` prend la source puis la destination. Si la destination est un répertoire existant,
le fichier y entre en gardant son nom.
:::
```

- **`ref`** est obligatoire ; **`seance`** est optionnel et vaut par défaut le `seance` du
  frontmatter (mêmes règles que `::: cours`, §3) — obligatoire si le frontmatter n'en porte pas.
- **`diapos`** est autorisé, comme sur `::: cours`.
- **`source` est refusé** : la source d'un exercice du cours, c'est le cours.
- **Le corps de l'encadré est la PISTE de résolution écrite par le module** — jamais l'énoncé,
  qui vient du registre. Un corps vide est admis (certains exercices se passent d'indice).

### 6.3 · Ce que le compilateur produit

```ts
| {
    type: 'encadre';
    variante: 'exercice-du-cours';
    /** Résolu depuis exercices.json — l'auteur ne l'écrit jamais. */
    exerciceDuCours: {
      seance: number;
      reference: string;
      libelle: string;   // « n° 8 » ou le titre, selon la forme de `reference`
      titre: string;
      enonce: string;
    };
    renvoiCours?: { seance: number; diapos: number[] };
    blocs: BlocContenu[];   // la piste, éventuellement vide
  }
```

Le manifeste de routes gagne, **une fois par sujet** et à côté de l'horaire compilé, le registre
d'exercices — le sommaire doit pouvoir annoncer « séance 2 · 13 exercices » sans relire `content/`.

### 6.4 · 🔴 Le gate de complétude — c'est lui qui rend « tous » mesurable

> Sans lui, « ajoute-les tous » est une intention, pas un livrable. Le mode d'échec connu du dépôt
> est précisément la promesse sans garde-fou exécutable (famille **L-007** : « un gate livré n'est
> pas un gate câblé »).

Au build, pour **chaque séance qui porte au moins un module publié** :

1. **Complétude** — chaque `reference` du registre est citée par **au moins un** encadré
   `exercice-du-cours` parmi les modules de cette séance. Une manquante fait **échouer** le build
   en la nommant, avec le `titre` de l'exercice et la liste des modules examinés.
2. **Unicité** — une même `reference` n'est citée qu'**une fois** dans toute la séance. Deux
   modules qui se disputent l'exercice 8 est une erreur d'auteur, pas un doublon bénin.
3. **Existence** — un `ref` qui ne correspond à aucune entrée du registre fait échouer le build.
   Ne jamais retirer l'encadré en silence : c'est le patron de liste blanche nominative de
   `.claude/rules/security.md` §4 (tout élément absent de la liste **se nomme** en échouant).

⚠️ **Le contrôle porte sur les modules PUBLIÉS.** Tant que la séance 4 n'a pas de module `publiee`,
ses sept exercices ne bloquent rien — c'est ce qui permet de livrer un module à la fois. Le jour où
un module de la séance 4 passe `publiee`, les sept doivent être placés.

⚠️ **Une séance absente du registre n'est pas une erreur** : la séance 5 n'a aucun exercice publié —
sa page existe sur le site de l'enseignant mais **ne porte aucun énoncé**, vérifié le 2026-08-25 à
la source, pas seulement sur la copie locale.

🔴 **ET C'EST LÀ QU'ON S'EST TROMPÉ UNE FOIS — la faute vaut d'être écrite.** Ce paragraphe affirmait
aussi « et la séance 1 non plus ». **Faux** : la séance 1 porte **trois** exercices (installation de
WAMP/XAMPP, éditeur, PuTTY et WinSCP · compte DigitalOcean · achat d'un nom de domaine). La
conclusion venait d'un **fichier local absent**, transformé en affirmation sur ce que l'enseignant
publie. Une mesure d'**état local** ne dit jamais rien du **monde** — même famille que **L-074**
(« un commentaire qui affirme une cause doit l'avoir mesurée »). La règle qui en sort :

> **La source d'autorité des exercices est le SITE de l'enseignant**
> (`https://www.alexandrepetrin.ca/exercice-securisation-app-web-cours-<n>-2026/`), pas le dossier
> local `securite-app-web-2026/`, qui n'en est qu'une copie et peut être incomplète. Avant de
> déclarer une séance sans exercice, **ouvrir sa page** — et écrire la date de la vérification.
> L'enseignant publie en cours de session : une séance vide aujourd'hui ne l'est pas pour toujours.

⚠️ **Les numéros peuvent SAUTER, et le registre les respecte.** La feuille du cours 1 numérote ses
exercices **1, 2 et 4** — il n'y a pas d'exercice 3. C'est pourquoi §6.1 exige des références
numériques **strictement croissantes** et non **contiguës** : exiger la contiguïté forcerait à
inventer un exercice 3 qui n'existe pas, ou à renuméroter ceux de l'enseignant — deux façons de
mentir sur son document.

### 6.5 · Ce que le lecteur voit

Étiquette : « 🧪 **Exercice du cours** · Séance 2 · n° 8 », puis le **titre**, puis l'**énoncé**,
puis la piste si le module en donne une. ⚠️ Même exigence WCAG qu'au §5 : l'étiquette est du
**texte**, le pictogramme ne porte jamais l'information seul, et la paire de contraste de la
variante se mesure comme toutes les autres (`design:contrastes:check`).

⚠️ **LES CAPITALES DE CE DOCUMENT SONT UN RACCOURCI D'ÉCRITURE, PAS LA CHAÎNE RENDUE** — corrigé le
2026-08-25, parce qu'un lecteur pressé y voyait une spécification. `ETIQUETTES_ENCADRE` est la seule
source du mot, et ses valeurs sont des **phrases** : `cours` rend « Au programme du cours — matière
d'examen », `complement` rend « Complément — hors du cours, pas exigible à l'examen ». Le commentaire
de ce `Record` explique aussi pourquoi `exercice-du-cours` est **court** là où les trois autres sont
longues : le statut à l'examen n'a pas à y être écrit, la suite de l'étiquette le dit mieux en
nommant la séance et le numéro que porte la feuille de l'enseignant. **Pour changer un libellé, on
change cette valeur — jamais une règle CSS, jamais ce document seul.**

⚠️ **L'espace de « n° 8 » est une U+00A0 insécable**, posée au build (`compiler-markdown.mjs`, calcul
de `libelle`) : sans elle une fin de ligne coupe entre « n° » et son chiffre, et l'abréviation seule
ne désigne plus rien. U+00A0 **et rien d'autre** — U+202F est absente de Fraunces comme d'Inter
(contrainte matérielle d'E1-ST1-B, `.claude/rules/contenu-pedagogique.md` §3).

✅ **L'ENCADRÉ EST RENDU DEPUIS LE 2026-08-25 (lot E3-ST21-B) — l'exclusion est levée.** Les leçons
des séances 2, 3 et 4 peuvent donc être écrites : c'était le **préalable** que ce lot devait payer,
jamais une finition cosmétique qu'on aurait repoussée après le contenu.

Ce qui existait avant, et **pourquoi il ne reste rien** : `rendu-blocs.ts` excluait la variante
nommément (`VARIANTE_NON_RENDUE`, `VarianteEncadreRendue`, `exigerVarianteRendue`), pour ne pas
peindre un exercice du cours **sans son énoncé** — un choix *fail-closed*, une construction cassée
se voyant là où une page mutilée ne se voit pas. Le garde-fou ayant été **franchi**, il a été
**supprimé** avec son message : un refus qu'on laisse en place après l'avoir levé devient un
mensonge sur ce que le composant refuse (famille **L-070**).

🔴 **CE QUI LE REMPLACE, ET QUI TIENT LE MÊME RISQUE.** `verifierVariante` refuse désormais, à
l'exécution et **en se nommant**, un encadré `exercice-du-cours` arrivé **sans son `exerciceDuCours`
résolu** (`seance`, `libelle`, `titre`, `enonce`). C'est le seul cas réaliste qui restait — un
`lecons/<slug>.json` compilé par une **autre version du pipeline**, où le type ment par
construction. Le rendu affiche le **titre** puis l'**énoncé** en nœuds texte, jamais en attribut ni
en `[innerHTML]`, et un spec « à deux mains » (S-011) le mesure sur une charge hostile.

⚠️ **Le renvoi de diapositives est du TEXTE, dans son propre `<span class="renvoi">`** — « · Séance 2
· diapos 13, 17 », « · Séance 2 · n° 8 » —, jamais concaténé au mot de l'étiquette : le libellé de
`.mot` est épinglé variante par variante. La séance n'est écrite **qu'une fois** quand l'exercice et
le renvoi citent la même ; « diapo » passe au singulier à un seul numéro.

⚠️ **Une HUITIÈME variante casserait encore la compilation ici**, et c'est la raison d'être du type.
L'exclusion est nominative et unique ; elle ne se généralise pas en « les variantes non rendues ».
