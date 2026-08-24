# Fixture « langages-web » — le banc de mesure des ENCRES de coloration

**Ce n'est pas une leçon.** Ce dossier est un banc d'essai, hors de `content/`, dont le seul rôle
est d'**exercer largement** les grammaires Shiki de `html` et de `javascript` — les deux langues
entrées au contrat le 2026-08-24.

**Pourquoi il existe.** La feuille `src/styles/_coloration-syntaxique-generee.scss` ne contient que
les classes réellement employées par le contenu compilé : une encre qu'aucune leçon n'emploie n'est
jamais émise, donc jamais mesurée par le gate de contrastes. Une langue ajoutée au contrat mais
qu'aucune leçon n'emploie encore est donc une **paire de contraste non mesurée qui attend** — et
elle ne se révélerait qu'en CI, le jour où un auteur publie, c'est-à-dire au pire moment.

Ce banc force l'émission ; `src/coloration-encres-contraste.spec.ts` compile ce dossier et exige
que **chaque** encre `--shiki-dark` de la feuille produite franchisse 4,5:1 sur
`--couleur-code-surface`.

⚠️ **Ne pas amaigrir les blocs de code de `01-langages-web/lecon.md`** : chaque construction qu'ils
portent (commentaire, chaîne, gabarit, expression régulière, nombre, mot-clef, attribut, doctype,
`<script>`/`<style>` imbriqués) existe pour faire naître une portée de coloration distincte.
Retirer une construction ne fait rougir aucun test — elle cesse simplement d'être mesurée.
