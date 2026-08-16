# Leçon-témoin GRASSE — échantillon de test, pas une leçon

Ce dossier est une **racine de contenu de démonstration**, consommée par l'orchestrateur du
pipeline :

```powershell
node tools/content-pipeline/build.mjs --racine tools/content-pipeline/__fixtures__/temoin/cours/securite-web
```

## Pourquoi elle vit ICI et non dans `content/`

Le plan d'E2-ST1 prévoyait au départ un champ `factice: true` dans le frontmatter, que le
générateur de manifeste aurait filtré. L'objection S6 l'a fait tomber : un drapeau ne protège de
rien, puisqu'il peut être oublié, mal orthographié, ou retiré par mégarde. La protection retenue
est **physique** — la leçon-témoin n'est pas là où le build de production regarde. Le pipeline est
paramétré par `--racine` (défaut : `content/cours/securite-web`), et aucune valeur par défaut ne
mène ici. Conséquence directe : `EntreeManifesteRoutes` ne porte **aucun** champ `factice`, et
`app.routes.server.ts` n'a **rien à filtrer**.

## Ce qu'elle exerce — et pourquoi elle est « grasse »

La fixture `temoin-minimal/` prouve la forme **la plus courte** qu'un fichier de contenu puisse
prendre. Celle-ci prouve l'inverse : que **toutes** les formes du contrat de
`tools/content-pipeline/types.d.ts` se compilent ensemble, dans un seul fichier.

| Forme du contrat | Ce que le fichier en contient |
|---|---|
| `mermaid` | 2 diagrammes (`flowchart` + `sequenceDiagram`), chacun avec `accTitle:` et `accDescr` |
| `code` | 8 blocs de clôture, couvrant les 6 langages autorisés |
| `comparaison` | 1 conteneur, **2 paires** vulnérable/corrigé en **2 langages** (php, csharp) |
| `encadre` | les 3 variantes : `note`, `attention` (avec un bloc de code dedans), `a-retenir` |
| `ancre-quiz` / `ancre-simulation` | les deux ancres, dans « À toi de jouer » |
| `SectionCompilee.niveau` | des sections de niveau 2 **et** 3 |
| `quiz.json` | 5 questions, **4 types différents** (le gabarit en exige 2 au minimum) |
| `simulation.json` | 4 acteurs, 6 étapes, flèches et panneaux |

## Ce qu'elle n'est PAS

Ce n'est **pas** une leçon, et sa qualité pédagogique n'a pas été jugée : elle ne franchit pas la
barre de `.claude/rules/contenu-pedagogique.md` et ne prétend pas la franchir. La rédaction des
leçons appartient à la boucle **contenu** (`professeur-web` → `verificateur-theorie`, via le skill
`/lecon`), jamais à la boucle livraison. Son `statut: brouillon` n'est qu'une valeur de test.
