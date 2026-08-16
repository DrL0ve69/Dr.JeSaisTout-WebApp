# Fixtures — cas attendus INVALIDES (contrôle positif du garde-fou)

`npm run content:valider:fixtures` traite **chaque sous-dossier comme une racine de contenu** et
exige que chacun soit refusé, en imprimant la cause. Le code de sortie y vaut **1 par
construction** — du contenu invalide a bien été détecté. C'est la LISTE des causes qui fait foi,
pas le code.

> ### 🔒 Qui exécute ce contrôle, et pourquoi ce n'est PAS une étape de CI
>
> Le gate est **`src/pipeline-contenu-validation.spec.ts`**, donc **G-test** — qui tourne déjà dans
> `ci.yml` **et** `deploy.yml`. Le spec lance la commande ci-dessus, exige **9/9 refus** et vérifie
> que **chaque cas est refusé sur SA cause propre** : neuf refus pour une seule et même raison (un
> chemin introuvable, disons) seraient sinon indistinguables de neuf refus corrects. Il porte en
> plus un **garde-fou de complétude** — ajouter un dixième dossier ici sans écrire son assertion
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

⚠️ **Ce ne sont pas des leçons** : ces dossiers appartiennent au moteur, pas à `content/`. Ils ne
sont jamais compilés ni publiés.
