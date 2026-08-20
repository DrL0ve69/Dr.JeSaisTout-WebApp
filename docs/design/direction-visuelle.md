# Direction visuelle — Dr. Je-Sais-Tout

> Objectif : un site **distinctif, moderne, interactif** — l'antithèse du « AI-slop » (dégradés
> violets, glassmorphism réflexe, cartes arrondies interchangeables, emojis en guise d'icônes).
> Le public est cégep/universitaire : on vise la complicité intelligente, pas le gimmick enfantin.
>
> Ce document fixe la direction et les garde-fous. Il **prévaut sur les goûts du moment** : toute
> dérive détectée en revue (`code-reviewer`) se juge contre les garde-fous G1–G9 ci-dessous.

---

## 0 · ⚠️ BASCULE DE DIRECTION — 2026-08-17

**La direction « Carnet de laboratoire » est abandonnée.** Le propriétaire a tranché une nouvelle
direction le 2026-08-17 : la **structure produit de boot.dev** (apprentissage jalonné, carte de
parcours, progression visible) habillée en **rétro-arcade + Matrix**, en lieu et place du registre
médiéval/WoW de boot.dev.

Ce que ce document dit d'important sur cette bascule, et qu'il ne faut pas relire de travers :

1. **La direction B « Console clinique » avait été ÉCARTÉE en 2026-08, et elle est RÉHABILITÉE.**
   Les motifs du rejet sont consignés en §1 et restent des risques réels — ils ne disparaissent pas
   parce que la décision a changé ; ils deviennent des **garde-fous à tenir** (G10, G11).
2. **La mécanique du design system ne bascule pas.** Les trois couches
   (`primitives → sémantiques → composants`) sont exactement ce qui rend la bascule abordable :
   ce sont les **valeurs** et les **motifs** qui tombent, pas l'architecture. Voir §5 pour
   l'inventaire de ce qui survit.
3. **La bascule est PLANIFIÉE, pas immédiate** : elle s'exécute **après le premier bloc de leçons**
   (E3 bloc A), sous l'épic **E6** du backlog. Le contenu garde le chemin critique de l'échéance de
   mi-septembre (critère S2 de `docs/vision.md`). Écrire du composant neuf d'ici là est sans risque
   *à condition* de ne consommer que des jetons sémantiques (G7) — c'est déjà la règle.

---

## 1 · Historique des directions — pourquoi celle-ci, et ce qu'elle traîne

| Direction | Statut | Ce qu'il faut en retenir |
|---|---|---|
| **A — Carnet de laboratoire** | **Abandonnée le 2026-08-17** | Papier ivoire / ardoise encrée, serif Fraunces, marginalia, tampons. Implémentée en E1 et **en production aujourd'hui**. Sa signature pédagogique — encre rouge = vulnérable, vert d'annotation = corrigé — est le seul élément qui **survit intact** et qui pilote la palette neuve (§2). |
| **B — Console clinique** | **Réhabilitée, devient la base** | Terminal, mono en vedette, accents phosphore. Écartée en août pour trois motifs : « cliché hacker vu partout », « thème clair peu naturel », « intimidant pour la phase 3 (sujets non-sécurité) ». **Les trois sont toujours vrais** → ils deviennent G10, la décision D-2 (§4) et une contrainte de phase 3 à ne pas oublier. |
| **C — Cabinet de curiosités** | Écartée (coût illustratif) | Son coût — un fonds d'illustrations sur mesure pour un dev solo — est la raison pour laquelle l'identité reste **typographique** et non incarnée par un avatar dessiné (décision D-4, §4). |

## 2 · Direction retenue : **Moniteur ambre**

L'univers : un **terminal à phosphore ambre** dans une salle de machines — le croisement du
moniteur d'époque, de la borne d'arcade et de l'imagerie de *Matrix*. Sombre, net, sans
ornement gratuit.

**Le choix structurant, et il est pédagogique avant d'être esthétique : la couleur de marque est
l'AMBRE, pas le vert.**

> Le vert est **déjà pris** : il veut dire « corrigé ». La signature du site est
> **rouge = vulnérable / vert = corrigé** ; elle est portée par `--couleur-danger-vuln` et
> `--couleur-ok-corrige` (nom réel du jeton dans `src/styles/_themes.scss` — ce document a dit
> `ok-fixed` jusqu'au 2026-08-20, c'était une erreur : **le code fait foi**), elle structure le
> rendu des paires vulnérable/corrigé (E2-ST4), et c'est le seul code
> couleur qu'un étudiant doit retenir sans effort. Un vert phosphore *de marque* — bordures, titres,
> boutons, pluie de glyphes — le diluerait jusqu'à ce que le vert ne **signale** plus rien.
> C'est la stricte application d'une règle que ce document portait déjà : « l'encre rouge ne sert
> jamais d'ornement, sous peine de diluer sa valeur de signal ».
>
> L'ambre est *l'autre* phosphore historique des moniteurs et la couleur des marquees d'arcade. Il
> atteint AAA sur noir sans effort, il ne fatigue pas en lecture longue, et il **laisse rouge et
> vert entièrement disponibles pour la pédagogie**. Le rappel *Matrix* passe alors par le **motif** —
> pluie de glyphes, scanlines, noir profond, cadence typographique — jamais par la teinte dominante.

### Palette d'amorçage — **mesurée**, pas supposée

Valeurs de départ pour E6, mesurées le 2026-08-17 avec la formule de
`tools/design/verifier-contrastes.mjs` : **18 paires, 0 échec**. Elles ne sont pas définitives —
le gate reste le juge, sur ses 33 paires — mais elles partent d'un état vert.

| Rôle | Valeur | Mesure notable |
|---|---|---|
| `fond` | `#06080A` | — |
| `surface` | `#0F1619` | 1,10:1 sur `fond` — **voisin par conception**, voir G7-a |
| `surface-creuse` | `#0B1114` | 1,04:1 sur `surface` — idem |
| `filet` | `#5E6A70` | **3,60:1 / 3,28:1** sur fond et surface — au-dessus du seuil 3:1 de G7-a |
| `filet-vif` | `#8AA0A8` | 6,68:1 sur surface |
| `texte` | `#D6E2E6` | **15,17:1** sur fond (AAA) |
| `texte-faible` | `#8CA1AA` | 7,44:1 / 6,78:1 (AAA sur fond) |
| **`marque` (ambre)** | `#FFB454` | **11,38:1** sur fond (AAA) ; `fond` sur ambre plein : 11,38:1 |
| `marque-sourde` | `#A97129` | 4,85:1 — pour les traits d'accent, pas pour du texte fin |
| **`danger-vuln`** | `#FF5C57` | 6,61:1 / 6,02:1 |
| **`ok-corrige`** | `#4ADE80` | 11,51:1 / 10,49:1 (AAA) |
| `info` | `#5BC8E8` | 10,39:1 (AAA) |

⚠️ **Le premier jet a échoué et c'est ce qui rend cette table crédible** : les filets proposés à vue
(`#26343A`) mesuraient **1,42:1** — très en dessous du 3:1 que G7-a rend *obligatoire*. Ils ont été
recherchés numériquement, pas ajustés à l'œil. Un filet trop discret est la faute la plus facile à
commettre sur fond noir, et c'est exactement celle que G7-a existe pour attraper.

### Typographie

| Rôle | Décision | Contrainte |
|---|---|---|
| Corps | **Inter — conservée** | Déjà auto-hébergée et **déjà passée au gate de glyphes** (80 vérifications, `œ` / `« »` / `’` couverts). La conserver supprime tout le lot « polices » de la bascule. |
| Affichage / titres | **IBM Plex Mono 700** (retenue le 2026-08-20) | **Fraunces est retirée** — ses deux fichiers pesaient **67 816 o**, pas « ~113 Ko » comme ce document l'a écrit jusqu'au 2026-08-20. |
| Code | **IBM Plex Mono 400 — passe d'une pile SYSTÈME à une police servie** | Décision du propriétaire (2026-08-20) : le cours ancre des annotations *à la ligne* et oppose des paires vulnérable/corrigé où l'alignement porte du sens ; une pile système rend le même extrait en Consolas chez l'un et en SF Mono chez l'autre. Coloration précompilée Shiki, inchangée. |
| Micro-étiquettes | **Silkscreen 400** | Capitales courtes uniquement (tampons, jalons). Police bitmap : illisible en prose, quelle que soit la taille. |
| Jalons | **Press Start 2P 400** | 🔴 Rôle **fermé à trois emplois** (pastille de module, verdict d'un quiz réussi, code d'erreur 404), tenu par `src/styles/police-jalon.spec.ts`. |

🔴 **Aucune police d'affichage n'entre sans être passée à `tools/design/verifier-glyphes.mjs`
D'ABORD** — et cette exigence-là reste entière : le gate lit la vraie table `cmap` et échoue sur un
`œ`, un `« »` ou une apostrophe `’` manquants. C'est déjà lui qui a interdit le sous-ensemble maison
en E1-ST1-B.

⚠️ **En revanche, la crainte qui accompagnait cette exigence est MESURÉE FAUSSE.** Ce document
affirmait que « les polices pixel couvrent notoirement mal le français ». Passées au gate le
2026-08-20, **Silkscreen 400 et Press Start 2P 400 couvrent 40/40 caractères exigés**, `œ Œ « » ’` et
U+00A0 compris — exactement comme IBM Plex Mono et Inter (160 vérifications, 0 lacune). La leçon
n'est pas « les polices pixel vont bien » : c'est qu'**une réputation ne remplace pas une mesure**,
dans les deux sens. Le repli prévu (« une mono à large couverture traitée en capitales espacées »)
n'a pas eu à servir.

⚠️ La contrainte de rédaction née d'E1-ST1-B **ne change pas** : le contenu emploie **U+00A0** et
jamais U+202F ni U+2009. Détail : [`polices.md`](polices.md).

### Motifs signature

- **Cartouche d'arcade** : en-tête de module en encadré mono, numéro en pastille pleine.
- **Jauge segmentée** : la progression se lit en segments discrets (pixels), pas en barre lisse.
- **Filet pixel** : les blocs se bornent par un trait net ; aucun rayon d'arrondi générique.
- **Scanline / pluie de glyphes** : ambiance, **décor uniquement**, toujours `aria-hidden`, toujours
  neutralisée par `prefers-reduced-motion` (G6). Jamais porteuse d'information.
- **Identité typographique, pas d'avatar** (décision D-4) : le logotype est un cartouche mono en
  capitales. « Dr. Je-Sais-Tout » reste le nom ; son incarnation devient l'**opérateur** derrière la
  console, pas un personnage dessiné.

## 3 · Garde-fous « anti AI-slop » (bloquants en revue)

| # | Règle |
|---|---|
| G1 | **Pas de dégradés décoratifs** (violets génériques, duos indigo→rose, néons dégradés). Les surfaces sont plates ; la lueur (`text-shadow`/`box-shadow` ambré) est admise **ponctuellement** sur la couleur de marque, jamais sur du corps de texte. |
| G2 | **Pas de glassmorphism** (blur/transparence réflexe) ; surfaces mates et structurées. Fondé, pas affaire de goût : voir §5. |
| G3 | **Typographie affirmée** : hiérarchie marquée (mono d'affichage en capitales espacées), jamais la stack système par défaut faute de décision. |
| G4 | **Un seul langage graphique** — le trait net et le pixel. Pas d'icônes dépareillées, **pas d'emojis** en guise d'iconographie UI. |
| G5 | **Thème sombre seul en phase 1** *(amendé le 2026-08-17 — voir D-2 §4)*. Le thème clair est une **dette datée**, à honorer en E4-ST1 ; d'ici là `prefers-color-scheme: light` est délibérément ignoré et cet écart est assumé par écrit. |
| G6 | **`prefers-reduced-motion` respecté** : toute animation a une variante réduite. Les simulations pas-à-pas restent pilotables sans animation ; la pluie de glyphes et les scanlines **disparaissent**. |
| G7 | **Jetons sémantiques SCSS obligatoires** ; aucune couleur ou taille en dur dans les composants. **Un bloc se délimite par un trait, jamais par sa seule teinte de fond** — voir G7-a. |
| G8 | Contraste et focus : AA minimum partout (**viser AAA pour le corps** — la palette §2 le tient largement), focus visible dessiné. Barre WCAG 2.2 AA / zéro violation AXE. |
| G9 | Le sombre n'est pas « noir + couleurs criardes » : fond froid, accents recalibrés, **une seule** couleur de marque. La saturation se dépense à un seul endroit. |
| **G10** | **🆕 Le cliché « hacker » est un risque, pas une esthétique.** Motif de rejet historique de la direction B, toujours valide. Interdits : cascades de `0`/`1` en fond de contenu, « ACCESS GRANTED » et vocabulaire de film, texte qui se tape tout seul dans une zone de lecture, terminal factice comme conteneur de prose. L'univers est un **cadre**, jamais un déguisement du contenu. |
| **G11** | **🆕 La lecture prime sur le jeu.** Ce site est un produit de lecture avant d'être un jeu : sur une page de leçon, le corps de texte, son interligne et sa largeur de ligne ne sont **jamais** sacrifiés à un effet. Aucun effet ambiant ne tourne dans le champ de lecture. |

### Deux règles de conception que le gate de contraste ne peut PAS tester

Ces deux-là sont la **contrepartie** d'exemptions accordées dans
`tools/design/verifier-contrastes.mjs`. Elles sont **bloquantes en revue** au même titre que G1–G11,
et **la bascule ne les change pas** — elle les rend plus critiques, un fond noir pardonnant encore
moins un filet trop discret.

- **G7-a · Un encart est toujours borné par un trait.** `--couleur-surface-creuse` et
  `--couleur-surface` sont volontairement proches — **1,04:1** dans la palette neuve — parce que deux
  fonds voisins ne sont ni un composant d'interface ni un objet graphique au sens de 1.4.11 : les
  opposer imposerait un encart criard. La contrepartie est **obligatoire** : tout bloc (encart,
  carte, bloc de code, encadré) porte une **bordure `--couleur-filet`** mesurée **≥ 3:1**. Sans elle,
  l'encart est indistinguable de la page — et il l'est de toute façon en `forced-colors: active`, où
  les deux fonds deviennent identiques.
- **G7-b · L'information ne passe jamais par la seule couleur** (WCAG **1.4.1**). « Vulnérable » et
  « corrigé » sont la signature chromatique du site — mais en mode contraste élevé de Windows, les
  accents deviennent un unique `CanvasText` et les deux blocs deviennent identiques. Un bloc
  sémantique se pose donc par le mixin **`marque-pedagogique($type)`** (`src/styles/_mixins.scss`),
  qui ajoute un **style de trait** distinct (`dashed` / `solid` / `dotted`) survivant à
  `forced-colors` — et le gabarit y ajoute une **étiquette textuelle** visible.

## 4 · Les quatre décisions du 2026-08-17 (propriétaire — ne pas rouvrir)

| # | Question | Décision | Conséquence directe |
|---|---|---|---|
| **D-1** | Quel habillage ? | **« Moniteur ambre »** — ambre de marque, Matrix par le motif | Palette §2 ; A « Phosphore » (vert de marque) et B « Borne » (néon magenta) écartés |
| **D-2** | Le thème clair survit-il ? | **Sombre d'abord, clair reporté** | G5 amendé ; le clair devient une **dette datée** portée par **E4-ST1**, avec échéance — pas une note flottante |
| **D-3** | Quand basculer ? | **Après le premier bloc de leçons** (E3 bloc A) | Épic **E6** au backlog, ordonnancement E2 → E3 bloc A → **E6** → E3 blocs B et C |
| **D-4** | Le personnage ? | **Opérateur — identité typographique** | Aucun avatar dessiné ; logotype en cartouche mono. Écarte le coût illustratif qui avait tué la direction C |

> ⚠️ **La dette de D-2 a un mode d'échec connu dans ce dépôt** : une dette datée sans échéance
> exécutable finit oubliée (c'est la famille de L-007 — « un gate livré n'est pas un gate câblé »).
> Parade retenue : le thème clair n'est **pas** une note dans un document, c'est une **ligne de
> livrable dans E4-ST1** avec ses propres gates. Voir le backlog.

## 5 · Mise en œuvre

- Les jetons vivent dans le design system SCSS : `src/styles/_primitives.scss` (valeurs) →
  `src/styles/_themes.scss` (jetons sémantiques) → composants. **La bascule tient dans ces deux
  fichiers plus `_mixins.scss` et `_polices.scss`** ; aucun composant ne doit être touché pour
  changer de peau. Si un composant doit être modifié, c'est qu'il violait G7 — c'est un défaut à
  corriger, pas un coût de la bascule.
- **Ce qui survit à la bascule** : la mécanique à trois couches · les 58 **noms** de jetons
  sémantiques (leur mappage change, pas leur nom) · Inter · `@mixin filet-horizontal` (avec son
  correctif L-025 sur `margin-inline: auto`) · `@mixin focus-visible` · `marque-pedagogique()` ·
  le gate de contraste et le gate de glyphes · G2, G6, G7, G7-a, G7-b, G8.
- **Ce qui tombe** : les 73 valeurs primitives · Fraunces (2 fichiers, **67 816 o** — le chiffre
  « ~113 Ko » écrit ici jusqu'au 2026-08-20 était faux) · `@mixin marge-carnet` et le vocabulaire
  carnet (tampons, marginalia, règlure) · les formulations de G1, G4, G5, G9 · les mesures du gate de
  contraste, à refaire.

**🔴 LE BILAN DE POIDS RÉEL — il faut distinguer LIVRÉ et CHARGÉ, sinon on se trompe de signe.**
Mesuré le 2026-08-20, fichiers en main (`wc -c`, Fraunces relue depuis git avant suppression) :

| | Avant | Après | Delta |
|---|---:|---:|---:|
| **Livré** (tous fichiers) | 201 140 o | 223 876 o | **+22 736 o** |
| **Chargé** sur une page de leçon complète (5 sous-ensembles `latin`) | 83 768 o | 98 788 o | **+15 020 o** |

Le poste qui coûte est la **police de code** : +14 708 o sur toute page qui porte du code, prix
explicite de l'alignement des paires vulnérable/corrigé. Le reste s'équilibre presque —
IBM Plex Mono 700 `latin` (14 908 o) remplace Fraunces `latin` (35 512 o). Une page qui ne porterait
**ni** pastille de jalon **ni** micro-étiquette ne chargerait que 77 872 o, soit *moins* qu'avant :
le delta ci-dessus est le **cas le plus chargé**, pas une moyenne. Silkscreen et Press Start 2P ne
sont de toute façon **pas préchargées** — elles ne pèsent rien sur le premier écran. Détail par
fichier et empreintes : [`public/polices/PROVENANCE.md`](../../public/polices/PROVENANCE.md).
- **G2 est fondé, pas seulement affaire de goût** : `web/frontend/principes-design-visuel.md`
  recommande la « depth » (texture, glassmorphism subtil) — mais exclut ces effets des produits « où
  la clarté et la vitesse de scan priment ». Un site de cours est un produit de lecture (G11).
- **Polices auto-hébergées obligatoirement** (CSP `font-src 'self'`, aucun hôte externe).
- La **page de démonstration** des trois habillages candidats, avec composants rendus en vrai, a été
  publiée le 2026-08-17 : <https://claude.ai/code/artifact/a3247f7f-19bf-41ef-9d8a-cf8f8b3893be>.
