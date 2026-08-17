---
titre: "Leçon témoin — validation du pipeline de contenu"
slug: temoin
sujet: securite-web
ordre: 1
niveau: cegep                 # maternelle | primaire | secondaire | cegep | universite
duree-estimee: 5
objectifs:
  - "Prouver que le validateur accepte une leçon conforme au gabarit"
  - "Servir de contrôle positif au mode --fixtures de valider.mjs"
  - "Documenter la forme minimale acceptée d'une leçon"
prerequis: []
fiches-sources:
  - web/securite/fondamentaux-securite-web.md
cree: 2026-08-15
maj: 2026-08-15
statut: publiee
---

# Leçon témoin — validation du pipeline de contenu

## L'idée en une image

Un contrat de contenu se comporte comme le contrôle d'un billet à l'entrée d'une salle :
personne ne vérifie ce que le spectateur pense du spectacle, mais tout le monde présente un
billet à la même forme. L'analogie casse ici : un billet refusé n'empêche pas la salle
d'ouvrir, alors qu'une leçon refusée fait échouer la construction du site en entier.

## Ce que le validateur regarde

Cette section libre existe pour prouver un point du gabarit : entre la première section et
« Exemple simple », l'auteur intercale autant de sections de théorie qu'il veut. Le validateur
ancre seulement la première et la dernière. Durée annoncée : 5 minutes.

::: note
Un conteneur de la liste fermée passe. Un conteneur inventé fait échouer la construction.
:::

<!-- à-vérifier: le validateur refuse-t-il ce marqueur en statut publiee ? — doute posé exprès -->

## Exemple simple

Le frontmatter ci-dessus est l'exemple le plus court qui satisfasse le schéma : douze champs,
aucun de plus (`additionalProperties: false`), aucun de moins.

## Exemple complet

Un bloc de code est EXEMPTÉ des règles typographiques et de la liste fermée de conteneurs.
Le bloc qui suit contient les deux transgressions, et cette leçon reste pourtant valide —
c'est le contrôle positif de l'exemption :

```text
Une espace fine insécable (U+202F) dans du code d'exemple : tolérée.
::: conteneur-inventé  ← toléré aussi, parce que ce sont des données, pas du balisage.
```

## À toi de jouer

Le quiz de cette leçon vit dans `quiz.json`, à côté de ce fichier.

## À retenir

- Un fichier de contenu malformé fait **échouer le build**, jamais une page vide en silence.
- Seule U+00A0 est permise comme blanche insécable ; U+202F et U+2009 sont absentes des polices.
- Le nom du dossier, le `slug` du frontmatter et le `lecon` du quiz doivent coïncider.

## Aller plus loin

- `docs/contenu/pipeline-contenu.md` — le gabarit dont ce fichier est la forme minimale.
- `.claude/rules/contenu-pedagogique.md` — la barre de qualité, que ce témoin ne prétend pas franchir.
