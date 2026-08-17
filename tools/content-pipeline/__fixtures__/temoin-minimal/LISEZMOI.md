# Fixture — leçon-témoin MINIMALE (valide)

Racine de contenu artificielle servant de **contrôle négatif** au validateur :
`node tools/content-pipeline/valider.mjs --racine tools/content-pipeline/__fixtures__/temoin-minimal`
doit sortir en **code 0**.

⚠️ **Ce n'est pas une leçon.** Ce dossier appartient au moteur, pas à la boucle contenu :
il ne vit pas sous `content/`, il ne sera jamais compilé en production et il ne prétend pas
franchir la barre de `.claude/rules/contenu-pedagogique.md`. Sa seule ambition est de porter
**la forme minimale acceptée** : les six sections ancrées du gabarit, un quiz de cinq questions,
aucun diagramme Mermaid, aucun bloc `comparaison`.

⚠️ **Le quiz porte les QUATRE types de question, et ce n'est pas décoratif** (E2-ST3, lot B). Il
est le **contrôle positif** de l'émission du quiz par le compilateur : sans un
`trouver-la-faille`, l'assertion « le `htmlColore` du quiz n'émet aucun `style=` » serait verte
sur un quiz qui n'en contient aucun — un vert qui ne prouve rien (L-019). Sans un `associer`,
rien ne prouverait que les types non enrichis traversent le pipeline **intacts**. Ne pas les
retirer : `src/pipeline-contenu-compilation.spec.ts` exige les quatre nommément, et rougirait.

⚠️ **Le `code` de la question `trouver-la-faille` porte une charge utile `<script>` et un
`onerror=`, et c'est le point le plus important de ce fichier.** Le lot C rendra `htmlColore`
dans la page en s'appuyant sur une seule propriété : *Shiki échappe les métacaractères HTML du
texte source*. Sans un `<` dans la fixture, l'assertion qui vérifie cette propriété serait verte
sur un code qui n'en contient aucun — un vert qui ne prouve rien (**L-019**), sur le chemin même
qui portera le module XSS d'E3. La charge est **inoffensive et pédagogique**
(`.claude/rules/contenu-pedagogique.md` §4), et elle ne quitte jamais ce dossier : cette fixture
vit hors de `content/`, donc rien de tout cela n'atteint `dist/`.

Il porte aussi deux **contrôles positifs de tolérance** : un U+00A0 en prose (permis) et, dans
un bloc de code clôturé, un U+202F et un conteneur `:::` inventé — tous deux exemptés parce
qu'ils sont des données d'exemple, pas du balisage. Si le validateur venait à les refuser, ce
témoin rougirait, et le message serait le bon.

La leçon-témoin **grasse** (Mermaid, comparaisons multi-langages) appartient au lot 4.
