# Fixtures — cas attendus INVALIDES (contrôle positif du garde-fou)

`npm run content:valider:fixtures` traite **chaque sous-dossier comme une racine de contenu** et
exige que chacun soit refusé, en imprimant la cause. Le code de sortie y vaut **1 par
construction** — du contenu invalide a bien été détecté. C'est la LISTE des causes qui fait foi,
pas le code.

> ### 🔒 Qui exécute ce contrôle, et pourquoi ce n'est PAS une étape de CI
>
> Le gate est **`src/pipeline-contenu-validation.spec.ts`**, donc **G-test** — qui tourne déjà dans
> `ci.yml` **et** `deploy.yml`. Le spec lance la commande ci-dessus, exige **14/14 refus** et vérifie
> que **chaque cas est refusé sur SA cause propre** : quatorze refus pour une seule et même raison (un
> chemin introuvable, disons) seraient sinon indistinguables de quatorze refus corrects. Il porte en
> plus un **garde-fou de complétude** — ajouter un quinzième dossier ici sans écrire son assertion
> fait ROUGIR le spec.
>
> N'ajoutez donc **pas** d'étape `content:valider:fixtures` aux workflows : elle ferait tourner la
> même chose une seconde fois, plus lentement et en vérifiant moins. Le script npm existe pour
> l'humain qui met au point une règle.
>
> **Pourquoi ce bloc est écrit en gros.** Jusqu'au 2026-08-16, ce contrôle positif n'était lancé par
> **rien** : ni test, ni script, ni workflow. Il était exact et exécutable à la main — donc invisible
> à toute régression. Et comme `content/cours/securite-web` n'existe pas encore, l'étape de
> validation de `content:build` valide **zéro fichier** : elle serait sortie verte même avec un glob
> cassé ou un Ajv qui ne compile plus. *Un contrôle positif qu'aucun runner n'exécute est une
> intention, pas un gate* — cousine de **L-019** sur l'axe **câblage**.

Pourquoi ces dossiers existent (leçon **L-019**) : une assertion « aucune anomalie » ne prouve
rien tant qu'on n'a pas vu le garde-fou mordre. Un validateur dont on aurait cassé le glob, ou
dont Ajv ne compilerait plus, sortirait vert sur un `content/` vide — vert pour la mauvaise
raison. Ces cas sont le contre-poison.

**Un dossier = une faute, et son nom la nomme.** Chaque cas est écrit pour ne porter QUE sa
faute : c'est ce qui permet d'exiger que la cause imprimée soit la BONNE, pas seulement qu'une
cause existe.

| Dossier | Faute injectée | Règle qui doit mordre |
|---|---|---|
| `quiz-moins-de-cinq-questions` | 4 questions | `quiz.schema.json` → `minItems: 5` |
| `quiz-explication-absente` | `explication` retirée de q2 | branche `if/then` `choix-multiple` |
| `quiz-fiche-source-absente` | `ficheSource` retirée de q1 | `required` commun à toute question |
| `frontmatter-slug-non-kebab-case` | `slug: Temoin_Minimal` | `lecon.frontmatter.schema.json` → motif kebab |
| `corps-espace-fine-insecable-u202f` | U+202F en prose | règle typographique hors schéma |
| `marqueur-a-verifier-en-statut-publiee` | marqueur de doute + `statut: publiee` | règle de statut hors schéma |
| `corps-section-gabarit-manquante` | `## À retenir` retirée | sections du gabarit, présence et ordre |
| `corps-conteneur-hors-liste-fermee` | `::: astuce` | liste fermée de conteneurs |
| `simulation-lecon-differente-du-slug` | `simulation.lecon` ≠ slug du dossier | cohérence des slugs hors schéma |
| `corps-titre-de-section-vide` | un `##` suivi de blanches seules | titre de section sans texte |
| `quiz-associer-gauche-repete` | deux paires au même `gauche` (q4) | unicité de `gauche` hors schéma (D-1) |
| `quiz-choix-identifiant-repete` | deux `choix` au même `id` (q1) | unicité des `choix[].id` hors schéma |
| `quiz-question-identifiant-repete` | deux questions au même `id` (`q1`) | unicité des `id` de question hors schéma |
| `quiz-associer-gauche-indiscernable` | deux `gauche` que seule une U+00A0 sépare (q4) | unicité de `gauche` sur clef **normalisée** |

⚠️ **La faute de `corps-titre-de-section-vide` est faite de BLANCHES DE FIN DE LIGNE** : `##` suivi
de trois espaces, **ligne 39 du fichier** (que le validateur rapporte comme « corps ligne 21 » — il
compte le corps, frontmatter exclu ; ne pas chercher au mauvais endroit). Un éditeur réglé sur
« supprimer les espaces en fin de ligne » à l'enregistrement, ou un formateur lâché sur
`__fixtures__/`, la ferait disparaître — et le cas passerait de « refusé » à « accepté à tort »,
c'est-à-dire que le spec rougirait en nommant le contrôle plutôt que la cause. Si ce cas casse sans
raison apparente, vérifier d'abord la fin de cette ligne-là.

⚠️ **La faute de `quiz-associer-gauche-indiscernable` est INVISIBLE À L'ŒIL, et c'est tout son
propos** : le second `gauche` de `q4` se termine par une blanche insécable, écrite `\u00a0` **en
séquence d'échappement JSON** pour qu'on la VOIE à la relecture. Ne pas la « nettoyer » ni la
remplacer par une espace ordinaire : c'est exactement la collision que
`.claude/rules/contenu-pedagogique.md` §3 rend certaine (le contenu du site emploie U+00A0 par
consigne), et le cas est le contrôle positif de la clef normalisée de `clefIndiscernable`. Avant le
correctif du lot E-a, ce dossier sortait **accepté**.

⚠️ **Les quatre cas du 2026-08-18 dérivent de `__fixtures__/temoin-minimal`**, pas du témoin des huit
premiers : c'est la seule leçon-témoin VALIDE du dépôt, donc la base la plus sûre pour n'injecter
qu'une faute. Elle porte en plus l'ancre `[[quiz]]` et un marqueur de doute toléré (statut
`brouillon`) — deux différences sans effet sur le validateur, qui ne connaît ni l'une ni l'autre.

⚠️ **Ce ne sont pas des leçons** : ces dossiers appartiennent au moteur, pas à `content/`. Ils ne
sont jamais compilés ni publiés.
