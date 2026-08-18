// =============================================================================
// Indicateur de focus — mesuré sur l'état focalisé, pas déduit d'une règle CSS
// (WCAG 2.2 · 2.4.7 Visibilité du focus, 2.4.11 Focus non masqué — nouveau en 2.2)
// -----------------------------------------------------------------------------
// CE QU'IL AJOUTE À CE QUI EXISTE DÉJÀ. Le mixin `m.focus-visible` est appelé dans
// chaque feuille de style de composant, et c'est tout ce que le dépôt savait dire
// jusqu'ici : une règle est ÉCRITE quelque part. Rien ne prouvait qu'elle
// s'applique à l'élément réellement focalisé. Trois façons banales de la perdre,
// toutes invisibles au lint comme à jsdom (qui n'a pas de cascade) et à
// `verifier-axe.mjs` (axe ne mesure aucun état focalisé) :
//   • un `outline: none` posé plus loin dans la cascade, ou par une remise à zéro ;
//   • un mixin appelé sur un conteneur alors que le focus atterrit sur l'enfant
//     (cas du radio de `bascule-theme.ts` : c'est l'`<input>` qui reçoit le focus,
//     pas le `<label>` qui l'enveloppe) ;
//   • un anneau bien dessiné mais RECOUVERT — l'échec propre à 2.4.11, où
//     l'indicateur existe, est calculé, et se trouve caché derrière une couche
//     superposée ou hors de la fenêtre après un défilement.
//
// DEUX MESURES, PAS UNE.
//  1. « Un indicateur est calculé » : on lit le style CALCULÉ de l'élément pendant
//     qu'il a le focus, et on exige un `outline` non nul, ou un `box-shadow`, ou un
//     écart mesurable avec l'état au repos (capturé au chargement, avant toute
//     tabulation). L'existence d'une règle ne compte pas — seule la valeur
//     calculée compte.
//  2. « Il n'est pas masqué » : la boîte de l'élément focalisé est entièrement dans
//     la fenêtre, et `document.elementFromPoint` en son centre renvoie l'élément
//     lui-même ou un de ses descendants. Si elle renvoie autre chose, quelque chose
//     est PAR-DESSUS : un en-tête collant, une bannière, une couche oubliée.
//     C'est un vrai risque ici — le lien d'évitement est `position: fixed` avec
//     `z-index: 1` et passe devant l'en-tête par construction ; il n'est neutralisé
//     au repos que par son `clip-path`, qui exclut aussi la zone du test de survol.
//
// ⚠️ AUCUN `.focus()` PROGRAMMATIQUE ICI NON PLUS. `:focus-visible` — le sélecteur
// que le mixin utilise, à dessein, pour ne pas cerner chaque clic de souris — ne
// s'active pas de la même façon selon l'ORIGINE du focus. Poser le focus par script
// pourrait ne jamais déclencher la règle, ou la déclencher alors qu'un vrai clavier
// ne le ferait pas : la mesure ne vaudrait rien. On presse Tab.
//
// ⚠️ LA MESURE ELLE-MÊME A DÉMÉNAGÉ dans `./aides/indicateur-focus.ts` au lot E-c
// d'E2-ST3 : `parcours-clavier-quiz.spec.ts` applique la MÊME barre aux huit arrêts
// du quiz, et deux copies de « un anneau est dessiné » auraient été libres de
// diverger en silence (L-016). Ce fichier garde ce qui lui est propre — la page
// mesurée et son compte d'arrêts épinglé.
// =============================================================================

import { expect, test } from '@playwright/test';

import {
  MesureFocus,
  exigerIndicateurVisible,
  journaliserMesures,
  mesurerArretFocalise,
  releverEtatAuRepos,
} from './aides/indicateur-focus';

/**
 * Garde-fou de boucle : on tabule jusqu'à retomber sur un élément déjà vu (le
 * parcours a bouclé) ou à sortir de la page. La borne empêche une boucle infinie
 * si un jour le focus se met à sauter d'un élément à l'autre sans jamais se répéter.
 */
const LIMITE_TABULATIONS = 20;

/**
 * Le nombre d'arrêts attendus aujourd'hui sur la page d'accueil. Il est ÉPINGLÉ par
 * `navigation-clavier.spec.ts`, qui en vérifie l'ordre exact ; ici il ne sert qu'à
 * garantir que la boucle a bien mesuré quelque chose. Un test qui parcourt zéro
 * élément passerait vert en ne prouvant rien — c'est le mode d'échec silencieux
 * d'une boucle de mesure.
 *
 * LES SEPT, DANS L'ORDRE DU DOCUMENT : (1) lien d'évitement · (2) logotype ·
 * (3) lien « Accueil » · (4) lien « Sécurité des applications web » · (5) le radio
 * « Système », seul membre du groupe atteint (la boucle ne presse que Tab, jamais
 * les flèches : un groupe natif ne livre que son membre coché) · (6) « Commencer le
 * cours », l'unique focalisable du `<main>` depuis E1-ST3 · (7) le lien du pied de
 * page. Six avant E1-ST3, quand la route « / » rendait `PageAVenir`, dépourvue de
 * tout élément interactif.
 */
const ARRETS_ATTENDUS = 7;

test("chaque arrêt de tabulation porte un indicateur de focus calculé, et il n'est pas masqué", async ({
  page,
}) => {
  await page.goto('/');

  // ÉTAT AU REPOS, capturé AVANT la première tabulation : à ce moment aucun élément
  // de la page n'a le focus, donc ces valeurs sont bien celles de l'état neutre.
  // Indexées dans l'ordre du document, elles se rapprochent ensuite de l'état
  // focalisé par le même index — pas besoin de rendre le focus pour comparer.
  const auRepos = await releverEtatAuRepos(page);

  const mesures: MesureFocus[] = [];
  const indexVus = new Set<number>();

  for (let n = 0; n < LIMITE_TABULATIONS; n++) {
    await page.keyboard.press('Tab');

    const mesure = await mesurerArretFocalise(page);

    if (mesure === null || indexVus.has(mesure.index)) {
      break;
    }
    indexVus.add(mesure.index);
    mesures.push(mesure);
  }

  // Le journal fait foi (L-005) : les valeurs mesurées sont imprimées, pas
  // seulement comparées. Un anneau qui rétrécirait de 3 px à 1 px passerait encore
  // les assertions ; il se verrait ici.
  journaliserMesures('« / »', mesures);

  expect(
    mesures.length,
    "la boucle de tabulation n'a mesuré aucun arrêt : le test serait vert et vide",
  ).toBe(ARRETS_ATTENDUS);

  for (const mesure of mesures) {
    const repos = auRepos[mesure.index];
    if (repos === undefined) {
      throw new Error(
        `état au repos introuvable pour ${mesure.description} : la liste des éléments focalisables a changé pendant le test`,
      );
    }

    exigerIndicateurVisible(mesure, repos);
  }
});
