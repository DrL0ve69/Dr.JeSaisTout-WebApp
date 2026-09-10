---
titre: "Leçon témoin Alpha — première racine"
slug: alpha
sujet: alpha
ordre: 1
niveau: cegep
duree-estimee: 5
objectifs:
  - "Prouver qu'une racine parmi plusieurs compile pour son propre compte"
  - "Porter un slug distinct de celui de la racine sœur"
  - "Servir de contrôle positif au manifeste combiné"
prerequis: []
fiches-sources:
  - web/securite/fondamentaux-securite-web.md
cree: 2026-09-10
maj: 2026-09-10
statut: publiee
---

# Leçon témoin Alpha — première racine

## L'idée en une image

Deux cours qui partagent un même site se comportent comme deux rayons d'une bibliothèque : le
catalogue est commun, les cotes ne se mélangent jamais. L'analogie casse ici — deux livres
homonymes cohabitent sur une étagère, alors que deux leçons de même slug font échouer la
construction.

## Ce que cette racine prouve

Cette section existe pour donner un corps à la leçon. Le seul point mesuré par la fixture est
que cette leçon-ci et celle de la racine sœur atterrissent dans le **même** manifeste, sans
que l'une écrase l'autre.

::: cours
Le contenu de cet encadré n'a aucune valeur pédagogique : il est là parce qu'une leçon
`publiee` doit porter au moins un encadré de provenance.
:::

## Exemple simple

Le frontmatter ci-dessus est la forme la plus courte qui satisfasse le schéma.

## Exemple complet

Un bloc de code est exempté des règles typographiques :

```bash
echo 'racine alpha'
```

## À toi de jouer

[[quiz]]

## À retenir

- Une exécution du pipeline compile plusieurs racines et n'écrit qu'un manifeste.
- Deux racines ne peuvent pas déclarer le même sujet.
- Un slug reste unique sur l'ensemble des racines compilées, pas seulement dans la sienne.

## Aller plus loin

- `docs/contenu/pipeline-contenu.md` — le gabarit dont ce fichier est la forme minimale.
