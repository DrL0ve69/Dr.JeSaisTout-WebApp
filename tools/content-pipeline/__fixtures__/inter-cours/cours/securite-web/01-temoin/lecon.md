---
titre: "Leçon témoin — résolution inter-cours d'un renvoi de section"
slug: temoin
sujet: securite-web
ordre: 1
seance: 2
niveau: cegep                 # maternelle | primaire | secondaire | cegep | universite
duree-estimee: 5
objectifs:
  - "Prouver qu'un renvoi {cours=…} se résout contre l'horaire du sujet frère cité"
  - "Prouver que le CODE du cours entre au contrat compilé, jamais le nom de dossier"
  - "Servir de contrôle positif au chemin passant du lot 1b"
prerequis: []
fiches-sources:
  - web/securite/fondamentaux-securite-web.md
cree: 2026-09-08
maj: 2026-09-08
statut: brouillon
---

# Leçon témoin — résolution inter-cours d'un renvoi de section

## L'idée en une image

Un renvoi vers un autre cours se comporte comme une référence croisée entre deux manuels posés
côte à côte sur la même étagère : le lecteur doit pouvoir attraper le second sans quitter sa
chaise. L'analogie casse ici — l'étagère est le dossier parent, et un manuel qui ne s'y trouve
pas ne se cite pas du tout, plutôt que de se citer « à peu près ».

## Ce que le validateur regarde {diapos="12-18"}

Cette racine de fixture mime la PRODUCTION : elle est `inter-cours/cours/securite-web`, et son
sujet frère `inter-cours/cours/php` ne porte qu'un `horaire.json`, sans une seule leçon — exactement
comme `content/cours/php/` aujourd'hui. Le parent commun, `cours/`, est ce que le registre balaie.

### Le VirtualHost, côté cours de PHP {cours="php" seance="8" diapos="30-42"}

Le renvoi ci-dessus est le CHEMIN PASSANT du lot 1b : `cours="php"` est un NOM DE DOSSIER, la
séance 8 existe dans l'horaire de ce dossier-là, et c'est le `cours.code` qui y est lu qui
entre au contrat compilé. Le nom de dossier, lui, ne va nulle part. Le code lui-même n'est
ÉCRIT NULLE PART dans ce fichier, délibérément : c'est ce qui rend l'assertion du spec non vide —
une implémentation qui recopierait le nom de dossier ne pourrait pas le fabriquer.

::: cours {diapos="13, 17"}
Un renvoi d'encadré reste intra-sujet : la matrice d'attributs d'un encadré n'admet pas « cours ».
:::

## Exemple simple

Le frontmatter ci-dessus déclare `seance: 2`, qui appartient à CE cours-ci. C'est précisément
pourquoi un renvoi inter-cours doit déclarer sa propre séance : hériter d'elle citerait la séance 2
du cours de PHP, que personne n'a voulu nommer.

## Exemple complet

Un bloc de code reste EXEMPTÉ des règles typographiques et de la liste fermée de conteneurs :

```bash
# ::: conteneur-inventé  ← toléré ici, parce que ce sont des données, pas du balisage.
echo 'la racine soeur php ne porte aucune lecon, et c est legitime'
```

## À toi de jouer

[[quiz]]

## À retenir

- La valeur de `cours` est un **nom de dossier** de sujet frère, jamais un code de cours.
- Le code affiché est **résolu** depuis l'horaire du sujet cité, donc jamais recopié à la main.
- `seance` devient **obligatoire** dès que `cours` est écrit.

## Aller plus loin

- `docs/contenu/ancrage-au-cours.md` §3bis — le contrat que cette fixture exerce.
- `tools/content-pipeline/__fixtures__/ancrage-au-cours/` — le témoin du renvoi intra-sujet.
