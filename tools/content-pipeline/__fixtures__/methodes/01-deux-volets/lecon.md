---
titre: "Le conteneur d'onglets à DEUX volets"
slug: deux-volets
sujet: securite-web
ordre: 1
niveau: cegep                 # maternelle | primaire | secondaire | cegep | universite
duree-estimee: 5
objectifs:
  - "Prouver que le compilateur accepte un conteneur d'onglets à deux volets"
  - "Servir de contrôle positif à la borne basse du contrat (2 volets)"
  - "Documenter la forme minimale acceptée d'un conteneur methodes"
prerequis: []
fiches-sources:
  - web/securite/fondamentaux-securite-web.md
cree: 2026-09-06
maj: 2026-09-06
statut: brouillon
---

# Le conteneur d'onglets à DEUX volets

## L'idée en une image

Deux volets d'un conteneur d'onglets se comportent comme deux routes vers la même ville :
le voyageur en prend une, jamais les deux, et arrive au même endroit. L'analogie casse ici :
une route peut être plus longue sans être fausse, alors qu'un volet qui enseignerait autre
chose que son voisin ferait disparaître de la matière derrière un onglet fermé.

## Les deux chemins vers la même tâche

Le conteneur ci-dessous est la forme la plus courte que le contrat admette : deux volets,
un `libelle` sur chacun, et le marqueur `defaut` sur un seul d'entre eux.

:::: methodes

::: methode {libelle="La méthode du cours" defaut}

Le cours planifie une tâche récurrente avec la table de l'utilisateur.

```bash
crontab -e
```

:::

::: methode {libelle="L'équivalent moderne"}

Un gestionnaire de services rend le même résultat, avec un journal interrogeable.

```bash
systemctl edit --force --full surveillance.timer
```

:::

::::

## Exemple simple

Le frontmatter ci-dessus est l'exemple le plus court qui satisfasse le schéma : douze champs,
aucun de plus (`additionalProperties: false`), aucun de moins.

## Exemple complet

Un bloc de code est EXEMPTÉ des règles typographiques et de la liste fermée de conteneurs.
Le bloc qui suit contient les deux transgressions, et cette leçon reste pourtant valide —
c'est le contrôle positif de l'exemption :

```bash
# Une espace fine insécable (U+202F) dans du code d'exemple : tolérée.
# ::: conteneur-inventé  ← toléré aussi, parce que ce sont des données, pas du balisage.
echo 'la langue de la cloture appartient a la liste fermee du contrat'
```

## À toi de jouer

Le quiz de cette leçon vit dans `quiz.json`, à côté de ce fichier. Le marqueur ci-dessous dit au
compilateur OÙ l'insérer dans la page (bloc `ancre-quiz` du contrat).

[[quiz]]

## À retenir

- Un conteneur d'onglets porte deux ou trois volets, jamais un seul ni quatre.
- Exactement un volet porte le marqueur `defaut` : c'est celui qui s'affiche sans JavaScript.
- Le contenu masqué est toujours l'équivalent du contenu visible, jamais une matière unique.

## Aller plus loin

- `docs/contenu/pipeline-contenu.md` — le contrat dont ce fichier est la forme minimale.
- `.claude/rules/contenu-pedagogique.md` — la barre de qualité, que ce témoin ne prétend pas franchir.
