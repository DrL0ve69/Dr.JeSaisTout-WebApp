/**
 * LE DÉCOUPAGE DE LA TÊTE D'UNE ÉTAPE — le RECENSEMENT pur de la grammaire d'auteur `{nom="valeur"}`
 * qui ouvre un item de marche à suivre (§ lot PHP-A1).
 *
 * 🔴 POURQUOI CE FICHIER EXISTE, alors que ce dépôt DUPLIQUE délibérément chaque règle entre
 * `compiler-markdown.mjs` et `valider.mjs`. La duplication est le contrat pour ce qui **juge**
 * (L-095) : deux copies d'un refus, appariées par les specs, garantissent qu'aucune des deux ne
 * laisse passer ce que l'autre refuse — et c'est pourquoi tous les `echec(...)` / `signaler(...)`
 * de la tête d'étape restent en double, chez leurs appelants. Mais **découper une chaîne en blocs
 * ne juge rien**. Une divergence d'un caractère entre deux copies du MOTIF ferait accepter à l'un
 * ce que l'autre refuse, *sans qu'aucun appariement de messages puisse le voir* : chaque copie
 * rendrait la bonne phrase pour la population qu'elle a su découper. C'est très exactement le
 * défaut du lot 1a (`### Titre ##`, fermeture ATX légale que l'un voyait et l'autre pas), et il ne
 * se repaie pas. Une seule source pour « où finit la tête » est donc plus forte que deux.
 * Précédents du même dossier : `compter-lignes.mjs` et `sujets-freres.mjs`, importés par les deux.
 *
 * 🔴 CE MODULE NE JUGE RIEN ET NE LÈVE JAMAIS. Il rend ce qu'il a lu ; la liste blanche des noms,
 * les doublons, les valeurs et les positions sont l'affaire des deux appelants — qui les refusent
 * chacun avec leur propre mécanique (`echec` lève, `signaler` accumule) et, par contrat, avec la
 * MÊME PHRASE.
 *
 * ⚠️ Le validateur tourne AVANT le compilateur et ne doit pas l'importer : ce module ne dépend de
 * rien, pour que la stratification du pipeline reste intacte dans les deux sens.
 */

/**
 * UN bloc d'attributs de tête d'étape — même position imposée que `{lignes="…"}` sur une
 * annotation. Ancré sur `^`, donc aucun retour arrière possible : ce qui n'est pas en tête n'est
 * pas reconnu, et l'appelant le refuse en le nommant plutôt que de le laisser passer.
 *
 * 🔴 LE NOM EST CAPTURÉ, PAS FIGÉ DANS LE MOTIF — et c'est ce qui a changé au lot PHP-A1. Un motif
 * par nom admis (`^\{voir="…"\}`) ne peut rien dire de `{couleur="x"}` ni de `{voi="x"}` : ils ne
 * matchent pas, et l'étape tombait dans « bloc d'attributs illisible ». En capturant le nom, la
 * tête se lit UNE fois et la liste blanche de l'appelant refuse en NOMMANT ce qu'elle a lu.
 */
export const MOTIF_ATTRIBUT_EN_TETE = /^\{([A-Za-z][A-Za-z-]*)="([^"]*)"\}/;

/**
 * Ce qui RESSEMBLE à un bloc d'attributs sans en être un — un nom d'attribut suivi de `=`.
 *
 * 🔴 POURQUOI PAS UNE ACCOLADE NUE. Le refus « bloc d'attributs illisible en tête » existe pour
 * l'auteur qui a VOULU écrire un bloc et l'a mal écrit : guillemets courbes, valeur non citée,
 * accolade non fermée. Tester `startsWith('{')` lui donne raison, mais refuse aussi
 * `{} est un objet vide en JS` — une phrase parfaitement légale, sur un message (« en tête ») qui
 * ment à propos d'une tête parfaitement formée. Le cours de PHP/JS est précisément celui où une
 * phrase s'ouvre sur `{`. On exige donc la forme minimale d'une INTENTION de bloc : un nom, puis
 * `=`. `{voie=x}`, `{voie=“x”}` et `{voir="a` restent refusés ; `{}` et `{ma: 1}` rendus à
 * l'auteur.
 */
export const MOTIF_BLOC_DATTRIBUTS_PROBABLE = /^\{[A-Za-z][A-Za-z-]*\s*=/;

/**
 * Ce qu'on cherche pour dire « il y a un `<nom>` ICI, mais pas au bon endroit ».
 *
 * @param {string} nom
 * @returns {string}
 */
export function amorceDeTete(nom) {
  return `{${nom}=`;
}

/**
 * Découpe la TÊTE d'une étape en blocs `{nom="valeur"}` — RECENSEMENT PUR, aucun jugement.
 *
 * @param {string} texte texte BRUT de l'étape, marqueur de liste retiré
 * @returns {{ blocs: { nom: string, valeur: string }[], consomme: number }} les blocs lus dans
 *   l'ordre d'écriture, et le nombre de caractères consommés — blanches intercalaires comprises,
 *   de sorte qu'un `slice(consomme)` de l'appelant rende exactement le reste de la phrase.
 */
export function decouperTeteDEtape(texte) {
  /** @type {{ nom: string, valeur: string }[]} */
  const blocs = [];
  let consomme = 0;
  for (;;) {
    const bloc = MOTIF_ATTRIBUT_EN_TETE.exec(texte.slice(consomme));
    if (bloc === null) break;
    blocs.push({ nom: bloc[1] ?? '', valeur: bloc[2] ?? '' });
    consomme += bloc[0].length;
    // Entre DEUX blocs la blanche est libre ; avant le premier elle ne l'est pas — `^` l'interdit.
    const apres = texte.slice(consomme);
    consomme += apres.length - apres.trimStart().length;
  }
  return { blocs, consomme };
}
