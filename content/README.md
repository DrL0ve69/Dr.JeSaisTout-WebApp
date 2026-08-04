# `content/` — le contenu pédagogique, versionné comme du code

Chaque leçon vit dans `content/<sujet>/<nn>-<slug>/` et contient `lecon.md` (Markdown enrichi),
`quiz.json`, et éventuellement `simulation.json`. Le format exact — frontmatter, sections
obligatoires, marquage des blocs vulnérable/corrigé, schémas JSON — est défini par
[`docs/contenu/pipeline-contenu.md`](../docs/contenu/pipeline-contenu.md), qui fait foi. Ces
fichiers sont écrits par la boucle `/lecon` (`professeur-web` puis `verificateur-theorie`), jamais
à la main sans passer par elle.

Le dossier est vide pour l'instant : la compilation du contenu (Markdown → AST de blocs JSON,
coloration Shiki, diagrammes Mermaid rendus au build) est livrée par l'epic **E2**. Voir
l'addendum **S-01** dans
[`docs/architecture/stack-et-architecture.md`](../docs/architecture/stack-et-architecture.md) §9
pour la chaîne retenue et les contraintes CSP qu'elle impose.
