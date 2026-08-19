// =============================================================================
// Parcours clavier du quiz — les QUATRE mécaniques, au clavier seul
// (WCAG 2.2 · 2.1.1 Clavier, 2.1.2 Pas de piège, 2.4.3 Parcours du focus,
//  2.4.7 Visibilité du focus, 2.4.11 Focus non masqué, 4.1.2 Nom/rôle/valeur)
// -----------------------------------------------------------------------------
// POURQUOI CE FICHIER EXISTE — le constat D-C6 du dépôt, appliqué au quiz.
// « Zéro violation AXE » N'EST PAS « WCAG 2.2 AA ». Un analyseur statique ne décide
// ni de l'ordre de tabulation, ni du piège du focus, ni de la justesse sémantique
// d'un rôle : `verifier-axe.mjs` audite le HTML prerendu dans jsdom et ne presse
// aucune touche. Les 344 vérifications vertes du lot E-b2 ne disent donc RIEN des
// quatre mécaniques du quiz — radios de `choix-multiple` et de `vrai-faux`,
// `<select>` d'`associer`, radios par ligne de `trouver-la-faille` — dont aucune
// n'avait jamais été parcourue au clavier.
//
// CE QUE LE PARCOURS PROUVE, ET QUE RIEN D'AUTRE NE VOIT :
//
//  1. UN GROUPE DE RADIOS NE COÛTE QU'UNE TABULATION. C'est l'attribut `name`
//     partagé — et lui seul — qui fait qu'un groupe natif se traverse d'un Tab et
//     se parcourt aux flèches. Quatre `name` distincts par question donneraient
//     des cases à cocher déguisées : même rendu, même HTML valide, même passe axe,
//     mais QUATORZE arrêts au lieu de quatre, et plus aucune sémantique « 2 sur 3 ».
//     Le gabarit lie `[name]="question.idDocument"` ; cette hypothèse n'était
//     vérifiée nulle part. Elle l'est ici.
//
//  2. LE `<select>` D'`associer` SE REMPLIT SANS SOURIS. C'est l'argument qui a
//     écarté le glisser-déposer (D-1, et WCAG 2.2 · 2.5.7 Dragging Movements) :
//     le `<select>` natif donne gratuitement navigation clavier, nom accessible et
//     annonce de position. Argument écrit, jamais mesuré — jusqu'ici.
//
//  3. LE PARCOURS SE REMONTE. Le mode d'échec de 2.1.2 ne se voit ni dans le HTML,
//     ni dans les styles, ni dans un audit statique : on entre quelque part et on
//     n'en sort plus. Seul Maj+Tab jusqu'au bout le dit.
//
//  4. LA CORRECTION S'ATTEINT ET SE LIT. Corriger GÈLE les radios (`disabled`) :
//     huit arrêts disparaissent d'un coup du parcours, et le bouton qui portait le
//     focus est REMPLACÉ par « Recommencer le quiz ». Un focus laissé sur un
//     élément retiré retombe sur `<body>` — 2.4.3, invisible à tout gate statique.
//     `Quiz.corriger()` déplace donc le focus vers la région `role="status"` ; c'est
//     ici, et nulle part ailleurs, que ce déplacement est constaté.
//
// ⚠️ AUCUN `.focus()` PROGRAMMATIQUE — même règle que `navigation-clavier.spec.ts`
// et `focus-visible.spec.ts`, même raison : poser le focus par script prouverait
// seulement qu'un élément est focalisable, ce que jsdom sait déjà. L'ORDRE est la
// chose mesurée, et `:focus-visible` ne s'active pas de la même façon selon
// l'origine du focus. On presse Tab.
//
// ⚠️ LE PRÉAMBULE DE LA PAGE N'EST PAS ÉPINGLÉ, ET C'EST DÉLIBÉRÉ. Les arrêts qui
// précèdent le quiz (liens de sommaire, `<summary>` de description de diagramme,
// blocs de code défilables) appartiennent au CONTENU de la fixture : les épingler
// ferait rougir ce fichier à chaque retouche de la leçon-témoin, pour une faute qui
// ne serait pas la sienne. On tabule donc JUSQU'AU quiz, on imprime le compte au
// journal (« … tabulation(s) avant le quiz », plus bas), et on épingle ce qui
// appartient au quiz : ses huit arrêts, dans l'ordre.
//
// ⚠️ AUCUN CHIFFRE N'EST ÉCRIT ICI, ET C'EST UN CORRECTIF (revue du lot B, E2-ST4).
// Ce commentaire annonçait « 19 arrêts », un compte devenu faux DEUX FOIS dans le
// même lot — le rendu a ajouté un défileur nommé par bloc de code, puis le
// compilateur a retiré le `tabindex` que Shiki posait sur chaque `<pre>`. Un nombre
// qu'aucune assertion ne tient se périme sans rougir, et il se lit ensuite comme une
// mesure. Le compte vivant est celui du JOURNAL, à chaque exécution ; s'il faut le
// figer un jour, ce sera par une assertion, pas par une phrase.
//
// ⚠️ CE QUE CE FICHIER NE PROUVE PAS. `npx swa start` n'implémente pas
// `trailingSlash` : rien ici ne dit quoi que ce soit de la politique de routage de
// production (incident L-032, couvert EN LIGNE seulement, par `deploy.yml`).
// =============================================================================

import { Locator, Page, expect, test } from '@playwright/test';

import {
  MesureFocus,
  exigerIndicateurVisible,
  journaliserMesures,
  mesurerArretFocalise,
  releverEtatAuRepos,
} from './aides/indicateur-focus';

import { attendreHydratation } from './aides/hydratation';
import { exigerLaPageDeLecon } from './aides/artefact-mesure';

exigerLaPageDeLecon('le parcours clavier du quiz (8 arrêts, flèches, focus visible)');


/** Voir l'en-tête de `quiz-pre-hydratation.spec.ts` : cette route vient de la fixture témoin. */
const CHEMIN_LECON = '/cours/securite-web/lecon-temoin/';

/**
 * Borne de la marche d'approche vers le quiz. Généreuse mais finie : sans elle, un
 * piège du focus AVANT le quiz ferait boucler la suite au lieu de la faire rougir.
 */
const LIMITE_APPROCHE = 60;

/**
 * LES HUIT ARRÊTS DU QUIZ, DANS L'ORDRE DU DOCUMENT — le cœur épinglé de ce fichier.
 *
 * Quatre questions à radios = QUATRE arrêts (un par groupe `name`, entré sur son
 * premier membre puisque rien n'est coché), puis les TROIS `<select>` de
 * l'`associer` — un par ligne de gauche, donc trois arrêts bien distincts — puis le
 * bouton de correction. Quatorze radios pour quatre arrêts : c'est tout l'intérêt.
 */
const ARRETS_DU_QUIZ = [
  { nom: 'q1 · choix-multiple — 1er choix', selecteur: '#quiz-q1 input[type="radio"] >> nth=0' },
  { nom: 'q2 · vrai-faux — « Vrai »', selecteur: '#quiz-q2 input[type="radio"] >> nth=0' },
  { nom: 'q3 · choix-multiple — 1er choix', selecteur: '#quiz-q3 input[type="radio"] >> nth=0' },
  {
    nom: 'q4 · trouver-la-faille — « Ligne 1 »',
    selecteur: '#quiz-q4 input[type="radio"] >> nth=0',
  },
  { nom: 'q5 · associer — select de la 1re ligne', selecteur: '#quiz-q5 select >> nth=0' },
  { nom: 'q5 · associer — select de la 2e ligne', selecteur: '#quiz-q5 select >> nth=1' },
  { nom: 'q5 · associer — select de la 3e ligne', selecteur: '#quiz-q5 select >> nth=2' },
  { nom: 'bouton « Corriger mes réponses »', selecteur: '.quiz button' },
] as const;

/**
 * Tabule depuis le début du document jusqu'au PREMIER arrêt situé dans le quiz, et
 * renvoie le nombre de tabulations qu'il a fallu.
 *
 * Aucun `.focus()` : c'est une vraie marche d'approche, qui traverserait un piège
 * du focus posé n'importe où avant le quiz.
 */
async function tabulerJusquAuQuiz(page: Page): Promise<number> {
  for (let presses = 1; presses <= LIMITE_APPROCHE; presses++) {
    await page.keyboard.press('Tab');
    const dansLeQuiz = await page.evaluate(
      () => document.activeElement?.closest('.quiz') !== null && document.activeElement !== null,
    );
    if (dansLeQuiz) {
      return presses;
    }
  }
  throw new Error(
    `le quiz n'a pas été atteint en ${LIMITE_APPROCHE} tabulations — piège du focus en amont, ou quiz absent de la page`,
  );
}

/** Les arrêts du quiz, résolus en locators sur la page courante. */
function arretsDuQuiz(page: Page): readonly { readonly nom: string; readonly element: Locator }[] {
  return ARRETS_DU_QUIZ.map((arret) => ({ nom: arret.nom, element: page.locator(arret.selecteur) }));
}

test('les huit arrêts du quiz se parcourent au clavier seul, dans l’ordre du document', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);

  const approche = await tabulerJusquAuQuiz(page);
  console.log(`Parcours clavier — ${approche} tabulation(s) avant le quiz (préambule de la leçon).`);

  const arrets = arretsDuQuiz(page);

  // Le premier arrêt est celui sur lequel la marche d'approche s'est arrêtée : on
  // ne represse pas Tab pour lui.
  const [premier, ...suivants] = arrets;
  if (premier === undefined) {
    throw new Error('la liste des arrêts du quiz est vide — le test serait vert et vide');
  }
  await expect(premier.element, `arrêt attendu : ${premier.nom}`).toBeFocused();

  for (const arret of suivants) {
    await page.keyboard.press('Tab');
    await expect(arret.element, `arrêt attendu : ${arret.nom}`).toBeFocused();
  }

  // LE COMPTE, ET CE QU'IL GARDE. Il porte sur un tableau littéral de ce fichier :
  // il ne peut donc rien dire du nombre RÉEL d'arrêts de la page (même geste, même
  // réserve, que le `toHaveLength(7)` de `navigation-clavier.spec.ts`). Ce qu'il
  // garde est réel : une boucle sur une liste vidée ou amputée passerait VERTE sans
  // presser une seule touche.
  expect(arrets).toHaveLength(8);

  // CE QUE LA LIGNE SUIVANTE PROUVE, ELLE, SUR LE DOM RÉEL : onze radios pour quatre
  // arrêts. C'est le `name` partagé par question, et c'est la seule assertion du
  // fichier qui rougirait si quelqu'un remplaçait `[name]="question.idDocument"` par
  // un identifiant unique par choix.
  //
  // ⚠️ ONZE, PAS QUATORZE. La page en porte bien quatorze — c'est le chiffre inscrit
  // en clôture du lot E-b2 — mais TROIS d'entre elles sont la bascule de thème de la
  // coquille, hors du `.quiz`. Le sélecteur est borné au quiz : le compte l'est
  // aussi. Mesuré sur l'artéfact (`quiz-q1` 3, `quiz-q2` 2, `quiz-q3` 3, `quiz-q4` 3).
  await expect(
    page.locator('.quiz input[type="radio"]'),
    'le compte de radios a changé : la fixture témoin ou le gabarit a bougé, l’ordre épinglé plus haut n’est plus le bon',
  ).toHaveCount(11);

  // La tabulation qui SUIT le quiz en sort — le bouton n'est pas un cul-de-sac.
  //
  // ⚠️ CE QUI VIENT APRÈS A CHANGÉ EN E2-ST5, ET C'EST UNE PRÉMISSE, PAS UN DÉFAUT
  // (L-035). Jusqu'au lot b1, le voisin suivant était le lien du pied de page ; le
  // lot b2 a inséré la SIMULATION entre le quiz et le pied de page, et cette
  // assertion est partie rouge sur un produit parfaitement sain — le premier gate à
  // constater le câblage. Ce que ce test veut prouver n'a pas bougé : le focus SORT
  // du quiz. On le dit donc désormais par la région quittée, pas par le nom d'un
  // voisin qui peut encore changer ; l'arrivée dans la simulation, elle, est mesurée
  // nommément par `parcours-clavier-simulation.spec.ts`.
  await page.keyboard.press('Tab');
  expect(
    await page.evaluate(() => document.activeElement?.closest('.quiz') === null),
    'la tabulation après le bouton de correction ne sort pas du quiz',
  ).toBe(true);
  await expect(
    page.locator('.simulation .commandes a').first(),
    'la tabulation après le quiz n’entre pas dans la simulation : l’ordre du document de la page de leçon a changé',
  ).toBeFocused();
});

test('les flèches déplacent la coche dans chacune des trois mécaniques à radios', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);
  await tabulerJusquAuQuiz(page);

  // Les trois mécaniques à radios du contrat, avec le nombre de membres de chaque
  // groupe dans la fixture témoin. `q3` est omis : c'est la même mécanique que `q1`,
  // et le parcours complet est déjà épinglé par le premier test.
  const mecaniques = [
    { forme: 'choix-multiple', fieldset: '#quiz-q1', tabulationsDepuisLeQuiz: 0 },
    { forme: 'vrai-faux', fieldset: '#quiz-q2', tabulationsDepuisLeQuiz: 1 },
    { forme: 'trouver-la-faille', fieldset: '#quiz-q4', tabulationsDepuisLeQuiz: 3 },
  ] as const;

  let tabulationsFaites = 0;
  for (const mecanique of mecaniques) {
    while (tabulationsFaites < mecanique.tabulationsDepuisLeQuiz) {
      await page.keyboard.press('Tab');
      tabulationsFaites++;
    }

    const radios = page.locator(`${mecanique.fieldset} input[type="radio"]`);
    const premier = radios.nth(0);
    const second = radios.nth(1);

    await expect(premier, `${mecanique.forme} : la tabulation n'entre pas sur le 1er membre`).toBeFocused();

    // LA FLÈCHE, PAS LA TABULATION. Dans un groupe natif elle déplace le focus ET la
    // coche d'un seul geste — c'est ce qu'un `role="radiogroup"` maison aurait fallu
    // réécrire à la main (roving tabindex, Home/End, bouclage).
    await page.keyboard.press('ArrowDown');
    await expect(second, `${mecanique.forme} : la flèche ne déplace pas le focus`).toBeFocused();
    await expect(second, `${mecanique.forme} : la flèche ne coche pas`).toBeChecked();
    // La coche s'est DÉPLACÉE, elle ne s'est pas ajoutée : des `name` distincts
    // laisseraient les deux cochés, et c'est cette ligne qui le prouve.
    await expect(
      premier,
      `${mecanique.forme} : les deux membres sont cochés — le groupe n'en est pas un`,
    ).not.toBeChecked();
  }
});

test('un `<select>` d’associer se remplit au clavier seul, et le composant enregistre le choix', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);
  await tabulerJusquAuQuiz(page);

  // Quatre tabulations depuis le 1er arrêt du quiz pour atteindre le 1er `<select>`.
  for (let n = 0; n < 4; n++) {
    await page.keyboard.press('Tab');
  }

  const premierChamp = page.locator('#quiz-q5 select').first();
  await expect(premierChamp).toBeFocused();
  await expect(premierChamp, 'le champ ne part pas de « Choisir… »').toHaveValue('');

  // La flèche sur un `<select>` fermé change la valeur ET émet `change` — c'est le
  // comportement natif que D-1 revendiquait sans l'avoir mesuré. Aucune souris,
  // aucun `selectOption()` : `selectOption` est une commande de Playwright, pas une
  // touche, et l'employer ici viderait le test de son sujet.
  //
  // 🔴 DEUX FLÈCHES, ET LA SECONDE N'EST PAS DÉCORATIVE. La première amène sur
  // « la liste des routes à prerendre », qui est la BONNE réponse de cette ligne —
  // et une association juste se corrige par un simple « Association correcte », qui
  // ne cite RIEN. On viserait alors une citation qui n'a aucune raison d'exister, et
  // le test rougirait sur un composant parfaitement sain. La seconde flèche choisit
  // donc délibérément la réponse de la ligne SUIVANTE : la correction cite la
  // réponse du visiteur quand elle est fausse, et c'est cette citation — elle seule —
  // qui prouve que le `(change)` a couru. Même raisonnement, mêmes raisons, que
  // `REPONSE_SELECT` dans `quiz-pre-hydratation.spec.ts`.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  const valeurChoisie = await premierChamp.inputValue();
  expect(valeurChoisie, 'la flèche n’a rien changé : le champ n’est pas opérable au clavier').not.toBe(
    '',
  );

  // ET LE COMPOSANT L'A-T-IL ENREGISTRÉ ? Une valeur dans le DOM ne prouve pas que
  // le `(change)` a couru. La correction cite la réponse du visiteur quand elle est
  // fausse : c'est cette citation qui prouve l'enregistrement.
  await page.getByRole('button', { name: 'Corriger mes réponses' }).click();
  await expect(
    page.locator('#quiz-q5 .ligne-corrigee').first(),
    'la correction ne cite pas la valeur choisie à la flèche : le `(change)` du `<select>` n’a pas couru',
  ).toContainText(`votre réponse : ${valeurChoisie}`);
});

test('la correction s’atteint à la touche Entrée, et le focus va au résumé plutôt que dans le vide', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);
  await tabulerJusquAuQuiz(page);

  // Sept tabulations depuis le 1er arrêt du quiz : le bouton de correction.
  for (let n = 0; n < 7; n++) {
    await page.keyboard.press('Tab');
  }
  const bouton = page.getByRole('button', { name: 'Corriger mes réponses' });
  await expect(bouton).toBeFocused();

  // ENTRÉE, et non un clic : c'est l'activation clavier d'un `<button type="button">`.
  await page.keyboard.press('Enter');

  // La correction est là, et le RÉSUMÉ porte enfin un texte — la région
  // `role="status"` existe dès le premier rendu, vide, précisément pour être annoncée.
  await expect(page.locator('.quiz .verdict')).toHaveCount(5);
  await expect(page.getByRole('status')).toContainText('sur 5 questions corrigées');

  // 🔴 LE POINT QUE RIEN D'AUTRE NE VOIT (WCAG 2.4.3). Le bouton qui portait le
  // focus vient d'être REMPLACÉ par « Recommencer le quiz », et les quatorze radios
  // sont passées `disabled` : sans déplacement explicite, le focus retomberait sur
  // `<body>` et la personne au clavier repartirait du haut du document.
  await expect(
    page.getByRole('status'),
    'le focus n’a pas suivi la correction : il est retombé dans le vide (WCAG 2.4.3)',
  ).toBeFocused();

  // Les radios gelées ont QUITTÉ le parcours — c'est voulu (les réponses sont
  // figées au moment où le score est écrit dans `core/progression/`), et c'est ce
  // qui rend le nouveau parcours court et lisible.
  await expect(page.locator('.quiz input[type="radio"]:not([disabled])')).toHaveCount(0);

  // Et « Recommencer le quiz » reste atteignable au clavier depuis le résumé.
  await page.keyboard.press('Shift+Tab');
  await expect(
    page.getByRole('button', { name: 'Recommencer le quiz' }),
    '« Recommencer le quiz » n’est pas atteignable au clavier depuis le résumé',
  ).toBeFocused();
});

test('aucun piège du focus dans le quiz : Maj+Tab remonte les huit arrêts en miroir', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);
  await tabulerJusquAuQuiz(page);

  const arrets = arretsDuQuiz(page);

  // Aller : jusqu'au dernier arrêt du quiz (le premier est déjà atteint).
  for (const arret of arrets.slice(1)) {
    await page.keyboard.press('Tab');
    await expect(arret.element, `aller — arrêt attendu : ${arret.nom}`).toBeFocused();
  }

  // Retour : miroir exact. Un piège n'est pas toujours symétrique — un groupe natif
  // peut laisser entrer et interdire de ressortir vers l'arrière si quelqu'un a posé
  // une gestion maison des flèches par-dessus.
  for (let n = arrets.length - 2; n >= 0; n--) {
    const arret = arrets[n];
    if (arret === undefined) {
      throw new Error(`arrêt n°${n} introuvable — la liste des arrêts a été modifiée`);
    }
    await page.keyboard.press('Shift+Tab');
    await expect(arret.element, `retour — arrêt attendu : ${arret.nom}`).toBeFocused();
  }

  // Et on ressort du quiz par le haut : Maj+Tab depuis le premier arrêt du quiz
  // remonte dans le contenu de la leçon, il ne rebondit pas dans le quiz.
  await page.keyboard.press('Shift+Tab');
  await expect(
    page.locator('.quiz :focus'),
    'Maj+Tab depuis le premier arrêt du quiz reste dans le quiz — piège du focus (WCAG 2.1.2)',
  ).toHaveCount(0);
});

test('chaque arrêt du quiz porte un indicateur de focus calculé, et il n’est pas masqué', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);

  // ÉTAT AU REPOS relevé AVANT toute tabulation, sur la page ENTIÈRE : les index
  // renvoyés par la mesure sont ceux de l'ordre du document complet.
  const auRepos = await releverEtatAuRepos(page);
  await tabulerJusquAuQuiz(page);

  const mesures: MesureFocus[] = [];
  for (let n = 0; n < ARRETS_DU_QUIZ.length; n++) {
    if (n > 0) {
      await page.keyboard.press('Tab');
    }
    const mesure = await mesurerArretFocalise(page);
    if (mesure === null) {
      throw new Error(`arrêt n°${n + 1} du quiz : le focus a quitté les focalisables de la page`);
    }
    mesures.push(mesure);
  }

  journaliserMesures('le quiz de « ' + CHEMIN_LECON + ' »', mesures);

  expect(
    mesures.length,
    'la boucle de tabulation n’a mesuré aucun arrêt du quiz : le test serait vert et vide',
  ).toBe(ARRETS_DU_QUIZ.length);

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
