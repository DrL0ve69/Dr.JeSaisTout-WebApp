# Fixture — le conteneur `methodes` (décision D-C, 2026-08-31)

Une racine **valide** à deux modules, écrite pour exercer les **deux cardinalités** que le contrat
admet. C'est le contrôle **positif** du lot 5 ; les contrôles **négatifs** de cardinalité, de
marqueur et de contenu banni vivent dans le compilateur et sont exercés par
`src/pipeline-contenu-compilation.spec.ts` (bloc « le conteneur `:::: methodes` »), sur des racines
jetables montées à la volée.

| Module | Volets | Ce qu'il ajoute |
|---|---|---|
| `01-deux-volets` | 2 | la **borne basse**, et la forme du contrat mot pour mot (`defaut` sur le premier volet) |
| `02-trois-volets` | 3 | la **borne haute**, `defaut` sur le **second** volet, et un volet dont le contenu est de la prose + une liste + un bloc de code |

**Pourquoi `defaut` n'est pas sur le premier volet du second module.** Un compilateur qui poserait
`defaut: true` sur le premier volet quel que soit l'écrit passerait un contrôle positif où les deux
coïncident. Ici, le volet marqué est le **deuxième** : l'écart est observable.

⚠️ **AUX LONGUEURS DE MARQUEUR ÉCRITES ICI, un volet ne peut pas contenir un autre conteneur.** Ce
n'est pas une règle du contrat, c'est une conséquence de `markdown-it-container` : une ligne de
fermeture ferme le **premier** conteneur ouvert dont le marqueur est au plus aussi long qu'elle.
Avec `::::` pour le conteneur et `:::` pour un volet, un `::: note` imbriqué est refermé par la
fermeture du volet. Les volets de ces deux fixtures ne portent donc que de la prose, des listes et
des blocs de code.

🔴 **Mais ce n'est PAS une limite du conteneur — c'est une limite de CES fixtures, et la nuance a
été mesurée le 2026-09-07.** Les longueurs doivent seulement **décroître strictement** en
descendant : sous la forme `:::::` methodes / `::::` methode / `:::` note, l'imbrication fonctionne
et le volet rend `['prose', 'code', 'encadre']`. La promesse du contrat — « un volet admet du contenu
de bloc **général**, comme un encadré » — est donc **vraie**, et c'est la longueur du marqueur qui
se choisit d'avance en fonction de la profondeur visée. Ces fixtures gardent la forme courte parce
que c'est celle que la doc montre à l'auteur.
