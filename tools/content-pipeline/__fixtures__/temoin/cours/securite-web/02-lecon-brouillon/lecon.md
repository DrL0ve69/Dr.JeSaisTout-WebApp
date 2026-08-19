---
titre: 'Leçon-témoin brouillon — celle que le sommaire ne doit pas montrer'
slug: lecon-brouillon
sujet: securite-web
section: Approfondissements     # OPTIONNEL — tout-ou-rien par sujet : la leçon 01 en porte une aussi
ordre: 2
niveau: cegep
duree-estimee: 4
objectifs:
  - "Donner au masquage des brouillons un cas que le runner exécute vraiment"
  - "Prouver que deux leçons d'un même sujet compilent ensemble, avec des sections distinctes"
  - "Rester la forme la plus courte possible : chaque diagramme coûte une invocation mmdc"
prerequis: []
fiches-sources:
  - web/securite/fondamentaux-securite-web.md
cree: 2026-08-19
maj: 2026-08-19
statut: brouillon
---

# Leçon-témoin brouillon — celle que le sommaire ne doit pas montrer

<!-- ÉCHANTILLON DE TEST, PAS UNE LEÇON. Ce fichier appartient au MOTEUR (E2-ST6,
     lot B) et vit hors de `content/` : le build de production ne peut donc pas le
     publier, quelle que soit la valeur de son frontmatter.

     POURQUOI IL EXISTE. La décision D-1 d'E2-ST6 masque les leçons `brouillon` en UN
     SEUL point — le sélecteur `leconsPubliees` de `src/app/features/cours/contenu-compile.ts` —
     consommé par le sommaire, par la navigation prev/next ET par le prerender. Une règle
     de masquage qu'aucun contenu ne met en défaut est une intention, pas un gate (L-019) :
     tant que la fixture ne portait qu'une seule leçon, « masquer les brouillons » ne se
     distinguait pas de « ne rien masquer ». Ce dossier est le cas qui les sépare.

     IL EST VOLONTAIREMENT MAIGRE. La leçon 01 est la fixture GRASSE : c'est elle qui exerce
     toutes les formes de bloc du contrat. Celle-ci n'a besoin que d'être valide et
     compilable — pas de mermaid (une invocation `mmdc` par diagramme), pas de simulation,
     pas de bloc de code. -->

## L'idée en une image

Un brouillon se comporte comme une épreuve d'imprimerie restée sur l'établi : elle existe, elle
est complète, et personne dehors n'est censé la lire. L'analogie casse ici — une épreuve papier
est physiquement hors de portée, alors qu'une page prerendue est publique dès qu'elle est
écrite sur le disque. C'est pour cela que le masquage doit toucher aussi le prerender, et pas
seulement l'affichage du sommaire.

## Exemple simple

Le frontmatter ci-dessus porte `statut: brouillon`. C'est la seule différence qui compte entre
cette leçon et sa voisine.

## Exemple complet

Il porte aussi une `section`, comme la leçon 01 — et ce n'est pas décoratif. Le champ est
optionnel, mais il est tout-ou-rien à l'échelle du sujet : retirer cette ligne ferait échouer la
validation de la racine entière, en nommant ce fichier. C'est le contrôle positif de la règle,
exercé sur une racine que le pipeline compile pour de vrai.

## À toi de jouer

[[quiz]]

## À retenir

- Une leçon `brouillon` est du contenu valide et compilé : rien ne l'empêche d'exister.
- Ce qui la distingue, c'est qu'aucune vue publiée ne doit la nommer, prerender compris.
- Le champ `section` est optionnel, mais tout-ou-rien à l'échelle du sujet.

## Aller plus loin

- `docs/contenu/pipeline-contenu.md` — le gabarit dont ce fichier est une forme courte.
- `tools/content-pipeline/__fixtures__/temoin/LISEZMOI.md` — ce que cette racine exerce.
