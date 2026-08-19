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

## ⚠️ Cette racine porte DEUX leçons depuis E2-ST6 (lot B)

| Dossier | `statut` | `section` | Rôle |
|---|---|---|---|
| `01-lecon-temoin` | **`publiee`** | `Fondamentaux` | la fixture GRASSE, décrite ci-dessous |
| `02-lecon-brouillon` | **`brouillon`** | `Approfondissements` | le cas que le masquage doit écarter |

**Ne pas ramener les deux au même `statut`.** Le masquage des brouillons (décision D-1) vit en un
seul point — le sélecteur `leconsPubliees` de `src/app/features/cours/contenu-compile.ts` —
consommé par le sommaire, par la navigation prev/next **et** par le prerender. Tant que cette
racine n'avait qu'une leçon, « masquer les brouillons » et « ne rien masquer » produisaient le
même artéfact : la règle n'était exercée par **aucun** runner (**L-019**). Et le sens inverse est
tout aussi cassant : si `01` repassait en `brouillon`, le prerender filtré n'écrirait **aucune**
page de leçon, donc toute la suite e2e qui vise `/cours/securite-web/lecon-temoin/` tomberait.

Les deux portent une `section` parce que le champ est **tout-ou-rien par sujet** (décision D-2) :
en retirer une seule ferait échouer la validation de la racine entière. C'est voulu — cette racine
est aussi la moitié « sections partout » du contrôle positif, dont `temoin-minimal/` (aucune
section) est la moitié « sections nulle part ».

La leçon `02` est volontairement **maigre** : ni diagramme (chaque `mermaid` coûte une invocation
`mmdc`), ni simulation, ni bloc de code. Elle n'a besoin que d'être valide et compilable.

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

Ce ne sont **pas** des leçons, et leur qualité pédagogique n'a pas été jugée : elles ne franchissent
pas la barre de `.claude/rules/contenu-pedagogique.md` et ne prétendent pas la franchir. La
rédaction des leçons appartient à la boucle **contenu** (`professeur-web` → `verificateur-theorie`,
via le skill `/lecon`), jamais à la boucle livraison. Leurs `statut` ne sont que des valeurs de
test — y compris le `publiee` de `01`, qui ne dit rien de sa qualité et tout du cas qu'il exerce.
