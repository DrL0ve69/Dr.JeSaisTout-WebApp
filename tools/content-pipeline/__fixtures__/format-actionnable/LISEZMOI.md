# Fixture — le gate du FORMAT ACTIONNABLE (décision D-D, lot 9)

Une racine **valide** d’un seul module, dont le `slug` est `projet-de-session` et le `sujet`
`securite-web` — soit la clef `securite-web/projet-de-session`, l’un des noms de
`MODULES_AU_FORMAT_ACTIONNABLE` (`tools/content-pipeline/valider.mjs`). C’est ce **couple**, et lui
seul, qui fait entrer ce module sous la règle 13 : depuis le lot PHP-F (2026-09-22) la liste est
indexée par `<sujet>/<slug>`, et non plus par le slug nu.

⚠️ **Le `sujet` vient du frontmatter, pas du nom du dossier de cette racine** — qui, lui, s’appelle
`format-actionnable`. C’est précisément pourquoi la clef ne peut pas être bâtie sur le nom de
dossier : cette fixture en sortirait, et les cas de refus de `src/format-actionnable.spec.ts`
passeraient tous au vert sans rien mesurer. Le `horaire.json` voisin déclare donc le même `sujet`,
comme la règle 14 l’exige.

**Pourquoi une racine à part, plutôt qu’un dossier de plus dans `../invalides/`.** Le gate ne se
prouve pas par un refus isolé : ce qui le discrimine d’un gate qui refuserait *tout* titre sans
renvoi, c’est le **couple** — la même faute doit être **acceptée** sur un module hors de la liste.
`src/format-actionnable.spec.ts` copie donc cette racine dans un bac à sable jetable, y applique
**une** mutation par cas, et mesure les deux moitiés. Le mode `--fixtures`, lui, ne sait exprimer
que des refus.

**Pourquoi le corpus de production ne suffit pas.** Le module 11 est **déjà conforme** depuis le
lot 8-B (18 titres sur 18 annotés, 0 muet) : `content:build` vert ne prouve donc rien de la
sensibilité du gate. Il faut une racine qu’on puisse abîmer — c’est celle-ci.

| Ce que la racine porte | Pourquoi |
|---|---|
| `seance: 1` au frontmatter | exigence (3) ; sans elle, l’exigence (2) se tairait |
| `## En bref — la marche à suivre` en **deuxième** section `##` | exigence (1), la place que D-A impose |
| un `:::: marche-a-suivre` dans cette section | exigence (1), le résumé lui-même et pas seulement son titre |
| `{hors-cours}` sur huit titres, `{seance="1" diapos="3-5"}` sur un | exigence (2), les **deux** issues |
| un titre de **niveau 3** annoté | exigence (2) porte sur `##` **et** `###` — sans lui, la moitié de la règle n’aurait aucun contrôle positif |

⚠️ **L’étape 1 de la marche renvoie au titre de niveau 3, pas à `## Ce que le gate exige`.** C’est
délibéré : le cas `section-mal-placee` **renomme** cette section-là, et un renvoi qui la citerait
sortirait une **seconde** cause (« titre introuvable ») sous laquelle la cause mesurée disparaîtrait.

⚠️ **Ne pas renommer les titres de ce fichier sans relire `src/format-actionnable.spec.ts`** : les
cinq cas mutent des lignes citées **au caractère près**, et le harnais lève si sa cible a disparu
plutôt que de mesurer une racine restée valide (L-015).
