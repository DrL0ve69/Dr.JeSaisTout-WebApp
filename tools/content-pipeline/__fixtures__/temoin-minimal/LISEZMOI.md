# Fixture — leçon-témoin MINIMALE (valide)

Racine de contenu artificielle servant de **contrôle négatif** au validateur :
`node tools/content-pipeline/valider.mjs --racine tools/content-pipeline/__fixtures__/temoin-minimal`
doit sortir en **code 0**.

⚠️ **Ce n'est pas une leçon.** Ce dossier appartient au moteur, pas à la boucle contenu :
il ne vit pas sous `content/`, il ne sera jamais compilé en production et il ne prétend pas
franchir la barre de `.claude/rules/contenu-pedagogique.md`. Sa seule ambition est de porter
**la forme minimale acceptée** : les six sections ancrées du gabarit, un quiz de cinq questions
à deux types, aucun diagramme Mermaid, aucun bloc `comparaison`.

Il porte aussi deux **contrôles positifs de tolérance** : un U+00A0 en prose (permis) et, dans
un bloc de code clôturé, un U+202F et un conteneur `:::` inventé — tous deux exemptés parce
qu'ils sont des données d'exemple, pas du balisage. Si le validateur venait à les refuser, ce
témoin rougirait, et le message serait le bon.

La leçon-témoin **grasse** (Mermaid, comparaisons multi-langages) appartient au lot 4.
