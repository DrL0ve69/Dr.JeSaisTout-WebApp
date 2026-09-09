---
titre: "Le module au FORMAT ACTIONNABLE"
slug: projet-de-session
sujet: securite-web
ordre: 11
seance: 1
niveau: cegep                 # maternelle | primaire | secondaire | cegep | universite
duree-estimee: 5
objectifs:
  - "Prouver que le gate du format actionnable ACCEPTE un module conforme"
  - "Servir de racine témoin aux quatre refus de la règle 13"
  - "Exercer les DEUX niveaux de titre que l'exigence (2) couvre"
prerequis: []
fiches-sources:
  - web/securite/fondamentaux-securite-web.md
cree: 2026-09-08
maj: 2026-09-08
statut: brouillon
---

# Le module au FORMAT ACTIONNABLE

## L'idée en une image {hors-cours}

Un gate qui se durcit module par module se comporte comme un chantier de rénovation pièce par
pièce : on n'exige la norme neuve que des pièces déclarées refaites. L'analogie casse ici — une
pièce de la maison peut rester dans son ancien état indéfiniment, alors que la liste du format
actionnable porte un compteur qui rappelle ce qui reste à reprendre.

## En bref — la marche à suivre {hors-cours}

:::: marche-a-suivre {titre="Déclarer un module au format actionnable"}

1. {voir="Le titre de niveau 3 compte AUSSI"} Poser la marche à suivre juste après
   « L'idée en une image ».

2. Annoter chaque titre de section, aux DEUX niveaux, d'un renvoi ou du marqueur `{hors-cours}`.

3. Ajouter le slug à `MODULES_AU_FORMAT_ACTIONNABLE`, en dernier geste du lot.

::::

## Ce que le gate exige {seance="1" diapos="3-5"}

Le slug de ce module est `projet-de-session` : c'est LUI qui le fait entrer dans la liste
nominative du validateur, et c'est ce qui rend cette racine mesurable sans toucher au corpus.

### Le titre de niveau 3 compte AUSSI {hors-cours}

Ce titre n'existe que pour une raison : l'exigence (2) porte sur les niveaux 2 **et** 3. Une
racine témoin qui n'aurait que des titres de niveau 2 laisserait cette moitié de la règle sans
contrôle positif, et le cas `titre-de-niveau-3-sans-renvoi` ne prouverait rien.

## Exemple simple {hors-cours}

Un module absent de la liste ne subit aucune de ces trois exigences : c'est ce qui permet de
reprendre les dix leçons publiées une par une.

## Exemple complet {hors-cours}

Un module de la liste qui perdrait sa `seance` perdrait l'exigence des renvois en silence. Le
validateur refuse donc ce cas en nommant la liste, pas la séance.

## À toi de jouer {hors-cours}

[[quiz]]

## À retenir {hors-cours}

- La liste est **nominative** et écrite à la main : elle n'est jamais dérivée du corpus.
- Entrer dans la liste, c'est déclarer le module **entièrement** conforme.
- Le compteur du durcissement vit dans un spec, pas dans une promesse de backlog.

## Aller plus loin {hors-cours}

- `docs/contenu/pipeline-contenu.md` — la section « Le gate du format actionnable ».
- `docs/design/refonte-lecons-actionnables.md` — la décision D-D et ses trois options.
