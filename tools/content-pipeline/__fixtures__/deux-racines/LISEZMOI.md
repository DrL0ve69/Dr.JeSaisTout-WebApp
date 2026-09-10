# Fixture — le pipeline compile PLUSIEURS racines (E7, lot A)

Quatre racines minuscules, dont **deux seulement** portent une leçon. Elles existent pour
exercer trois propriétés du multi-racine que le corpus de production **ne peut pas** démontrer :
`content/cours/securite-web` et `content/cours/php` ne collisionnent pas, et ne disparaissent pas.

| Dossier | Contenu | Ce qu'il sert à prouver |
|---|---|---|
| `alpha/` | `horaire.json` (sujet `alpha`) + 1 leçon, slug `alpha` | deux sujets distincts se combinent en un seul manifeste |
| `beta/` | `horaire.json` (sujet `beta`) + 1 leçon, slug `beta` | idem, l'autre moitié de la paire |
| `alpha-en-double/` | `horaire.json` **sujet `alpha`**, aucune leçon | une collision de sujet fait échouer en NOMMANT le sujet |
| `sans-lecon/` | un `LISEZMOI.md` et rien d'autre | une racine présente mais vide ne fait échouer personne |

⚠️ **`alpha-en-double/` ne porte AUCUNE leçon, et c'est délibéré.** Avec une leçon, le refus
serait sorti sur l'unicité des **slugs** — un contrôle antérieur dans `ecrireContenuGenere` — et
la fixture aurait mesuré la mauvaise règle, en restant verte. La collision de **sujet** ne peut
s'observer proprement que quand rien de plus local ne la précède (famille **L-035** : un test qui
exige une sortie doit d'abord vérifier que son entrée la produit, et pour la bonne cause).

⚠️ **Ce ne sont pas des leçons.** Ces dossiers appartiennent au moteur : ils ne vivent pas sous
`content/`, ne sont jamais compilés en production, et ne prétendent pas franchir la barre de
`.claude/rules/contenu-pedagogique.md`. Leur prose n'a aucune valeur pédagogique — seule leur
FORME compte. Les deux leçons sont dérivées de `__fixtures__/temoin-minimal/`, au `statut:
publiee` (une leçon `brouillon` n'entre pas au manifeste, et le manifeste est ce qu'on mesure).

⚠️ **Les quatre dossiers se voient les uns les autres comme « sujets frères ».** Le registre
qu'un `{cours="…"}` consulte est bâti sur les dossiers VOISINS de la racine compilée : ajouter
une cinquième racine ici élargit ce que les quatre autres peuvent citer. Aucune leçon de cette
fixture n'emploie `cours="…"` aujourd'hui ; si l'une venait à le faire, ce voisinage devient une
donnée du test et non un détail d'arborescence.

Exercées par `src/pipeline-contenu-orchestration.spec.ts`, bloc « sur PLUSIEURS racines ».
