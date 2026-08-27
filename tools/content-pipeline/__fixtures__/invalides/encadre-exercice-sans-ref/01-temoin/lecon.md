---
titre: "Leçon témoin — les exercices du cours"
slug: temoin
sujet: securite-web
ordre: 1
seance: 2
niveau: cegep
duree-estimee: 5
objectifs:
  - "Servir de cas au contrôle positif du validateur de contenu"
  - "Ne porter qu’UNE faute, pour que la première anomalie soit la bonne"
  - "Documenter la forme d’un encadré d’exercice du cours"
prerequis: []
fiches-sources:
  - web/securite/fondamentaux-securite-web.md
cree: 2026-08-25
maj: 2026-08-25
statut: brouillon
---

# Leçon témoin — les exercices du cours

## L'idée en une image

Un registre d'exercices se comporte comme le corrigé rangé au fond de la classe : chacun
travaille sur le même énoncé, personne ne le recopie de mémoire. L'analogie casse ici — le
corrigé, lui, n'a pas à exister avant l'exercice.

## Ce que ce cas exerce

::: cours
Cet encadré satisfait G2 : la leçon trace la provenance d'au moins un de ses passages.
:::

::: exercice-du-cours
Sans « ref », cet encadré ne désigne aucun énoncé.
:::

## Exemple simple

Le frontmatter ci-dessus est la forme la plus courte qui satisfasse le schéma.

## Exemple complet

Un bloc de code reste exempté des règles typographiques et de la liste fermée de conteneurs.

```bash
echo 'fixture de test'
```

## À toi de jouer

[[quiz]]

## À retenir

- Un fichier de contenu malformé fait **échouer le build**, jamais une page vide en silence.
- L'énoncé d'un exercice du cours vit dans le registre, jamais dans un module.
- Le corps d'un encadré d'exercice est la piste, pas l'énoncé.

## Aller plus loin

- `docs/contenu/ancrage-au-cours.md` §6 — le contrat que ce cas exerce.
