// =============================================================================
// G-clavier — la simulation au clavier seul (E2-ST5, lot c1)
// -----------------------------------------------------------------------------
// CE QUE CE FICHIER AJOUTE À `parcours-clavier-quiz.spec.ts`. Le quiz apportait
// huit arrêts d'un genre neuf (radios, `<select>`, un bouton) ; la simulation en
// apporte NEUF d'un genre banal — des liens — mais dont le comportement, lui, ne
// l'est pas : trois d'entre eux REPLIENT la vue au moment où on les active. Un
// repli qui retirerait du document l'élément qui a le focus le renverrait sur
// `<body>`, et la tabulation suivante repartirait du haut de la page : c'est un
// décrochage de WCAG 2.4.3 que seul un vrai navigateur constate.
//
// LA DÉFINITION DE « UN ANNEAU EST DESSINÉ » N'EST PAS RÉÉCRITE ICI. Elle vit dans
// `aides/indicateur-focus.ts`, partagée avec `focus-visible.spec.ts` et le parcours
// du quiz — deux définitions libres de diverger seraient le motif L-016.
//
// ⚠️ AUCUN `.focus()` PROGRAMMATIQUE, ICI COMME DANS LES DEUX AUTRES SPECS.
// `:focus-visible` ne s'active pas de la même façon selon l'ORIGINE du focus :
// poser le focus par script mesurerait un état qu'un vrai clavier ne produit pas.
// On presse Tab.
//
// ⚠️ ET AUCUN CHIFFRE N'EST HÉRITÉ DE LA PAGE ENTIÈRE (L-035). Le parcours du quiz
// épingle 11 radios et 8 arrêts ; ces comptes-là ne disent RIEN de la région
// mesurée ici. Ce qui est épinglé ci-dessous a été REMESURÉ sur la simulation :
// 9 liens (3 commandes + 6 étapes), sur la fixture témoin à 6 étapes.
// =============================================================================

import { Locator, Page, expect, test } from '@playwright/test';

import { exigerLaPageDeLecon } from './aides/artefact-mesure';
import { attendreHydratation } from './aides/hydratation';
import {
  MesureFocus,
  exigerIndicateurVisible,
  journaliserMesures,
  mesurerArretFocalise,
  releverEtatAuRepos,
} from './aides/indicateur-focus';
import {
  CHEMIN_LECON_TEMOIN,
  COMMANDES,
  NOMBRE_ETAPES,
  NOMBRE_LIENS,
  commande,
  etape,
  lienEtape,
  lireEtat,
} from './aides/simulation';

exigerLaPageDeLecon('le parcours clavier de la simulation (9 arrêts, focus visible, sortie)');

/**
 * La borne de l'approche. La simulation est en bas de la page de leçon, derrière le
 * sommaire, la prose et les huit arrêts du quiz : le compte réel mesuré est de 39
 * tabulations. La borne est large parce qu'elle n'est PAS l'objet de la mesure —
 * elle existe pour qu'un piège de focus en amont s'arrête en nommant sa cause au
 * lieu de faire tourner la suite jusqu'au délai d'expiration.
 */
const LIMITE_APPROCHE = 80;

/**
 * Les neuf arrêts de la région, dans l'ordre du document — l'ordre du DOCUMENT est
 * précisément ce que 2.4.3 exige de l'ordre du FOCUS, et les épingler ainsi fait
 * rougir toute réorganisation du gabarit qui les découplerait.
 */
function arretsDeLaSimulation(
  page: Page,
): readonly { readonly nom: string; readonly element: Locator }[] {
  const arrets = [
    { nom: 'commande « Précédente »', element: commande(page, COMMANDES.precedente) },
    { nom: 'commande « Suivante »', element: commande(page, COMMANDES.suivante) },
    { nom: 'commande « Réinitialiser »', element: commande(page, COMMANDES.reinitialiser) },
  ];
  for (let numero = 1; numero <= NOMBRE_ETAPES; numero++) {
    arrets.push({ nom: `lien de l’étape ${String(numero)}`, element: lienEtape(page, numero) });
  }
  return arrets;
}

/** Tabule depuis le début du document jusqu'au premier arrêt situé DANS la simulation. */
async function tabulerJusquALaSimulation(page: Page): Promise<number> {
  for (let presses = 1; presses <= LIMITE_APPROCHE; presses++) {
    await page.keyboard.press('Tab');
    const dansLaSimulation = await page.evaluate(
      () =>
        document.activeElement !== null && document.activeElement.closest('.simulation') !== null,
    );
    if (dansLaSimulation) {
      return presses;
    }
  }
  throw new Error(
    `la simulation n'a pas été atteinte en ${String(LIMITE_APPROCHE)} tabulations — piège du focus en amont, ou simulation absente de la page`,
  );
}

test('les neuf arrêts de la simulation se parcourent au clavier seul, dans l’ordre du document', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON_TEMOIN);
  await attendreHydratation(page);

  const approche = await tabulerJusquALaSimulation(page);
  console.log(
    `Parcours clavier — ${String(approche)} tabulation(s) avant la simulation (coquille, prose et quiz).`,
  );

  const arrets = arretsDeLaSimulation(page);
  const [premier, ...suivants] = arrets;
  if (premier === undefined) {
    throw new Error('la liste des arrêts de la simulation est vide — le test serait vert et vide');
  }

  await expect(premier.element, `arrêt attendu : ${premier.nom}`).toBeFocused();
  for (const arret of suivants) {
    await page.keyboard.press('Tab');
    await expect(arret.element, `arrêt attendu : ${arret.nom}`).toBeFocused();
  }

  // Le compte est épinglé DEUX fois, et ce n'est pas une redondance : la première
  // ligne dit combien d'arrêts ce test a réellement traversés, la seconde relit le
  // DOM. Une étape ajoutée à la fixture sans que la liste bouge ferait passer la
  // boucle ci-dessus sans jamais visiter le dernier lien.
  expect(arrets, 'la liste d’arrêts ne couvre plus la région').toHaveLength(NOMBRE_LIENS);
  await expect(
    page.locator('.simulation a'),
    'le compte de liens de la simulation a changé : la fixture témoin ou le gabarit a bougé, l’ordre épinglé plus haut n’est plus le bon',
  ).toHaveCount(NOMBRE_LIENS);

  // AUCUN PIÈGE DE FOCUS (2.1.2) : la tabulation suivante SORT de la région.
  await page.keyboard.press('Tab');
  expect(
    await page.evaluate(() => document.activeElement?.closest('.simulation') === null),
    'la tabulation après le dernier lien d’étape ne sort pas de la simulation — piège de focus',
  ).toBe(true);
});

test('Maj+Tab remonte les neuf arrêts en miroir', async ({ page }) => {
  await page.goto(CHEMIN_LECON_TEMOIN);
  await attendreHydratation(page);

  await tabulerJusquALaSimulation(page);
  const arrets = arretsDeLaSimulation(page);

  // Descente jusqu'au dernier arrêt, puis remontée : chaque arrêt doit se retrouver
  // dans l'ordre exactement inverse.
  for (let rang = 1; rang < arrets.length; rang++) {
    await page.keyboard.press('Tab');
  }
  const dernier = arrets[arrets.length - 1];
  if (dernier === undefined) {
    throw new Error('la liste des arrêts est vide — le test serait vert et vide');
  }
  await expect(dernier.element, `arrêt attendu : ${dernier.nom}`).toBeFocused();

  for (let rang = arrets.length - 2; rang >= 0; rang--) {
    await page.keyboard.press('Shift+Tab');
    const attendu = arrets[rang];
    if (attendu === undefined) {
      throw new Error(`arrêt ${String(rang)} absent de la liste`);
    }
    await expect(attendu.element, `Maj+Tab — arrêt attendu : ${attendu.nom}`).toBeFocused();
  }
});

test('chacun des neuf arrêts porte un indicateur de focus visible et non masqué', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON_TEMOIN);
  await attendreHydratation(page);

  // Relevé AVANT toute tabulation : à cet instant aucun élément n'a le focus, donc
  // ces valeurs sont bien celles de l'état neutre.
  const repos = await releverEtatAuRepos(page);

  await tabulerJusquALaSimulation(page);

  const mesures: MesureFocus[] = [];
  for (let rang = 0; rang < NOMBRE_LIENS; rang++) {
    if (rang > 0) {
      await page.keyboard.press('Tab');
    }
    const mesure = await mesurerArretFocalise(page);
    expect(
      mesure,
      `arrêt ${String(rang + 1)} de la simulation : le focus n'est sur aucun focalisable de la page`,
    ).not.toBeNull();
    if (mesure === null) {
      throw new Error('mesure absente — déjà signalé par l’assertion précédente');
    }
    mesures.push(mesure);
  }

  journaliserMesures('la simulation de la page de leçon', mesures);

  for (const mesure of mesures) {
    const etatAuRepos = repos[mesure.index];
    expect(
      etatAuRepos,
      `${mesure.description} : aucun état au repos relevé à l'index ${String(mesure.index)} — la liste des focalisables a changé pendant le parcours`,
    ).toBeDefined();
    if (etatAuRepos === undefined) {
      throw new Error('état au repos absent — déjà signalé par l’assertion précédente');
    }
    exigerIndicateurVisible(mesure, etatAuRepos);
  }

  expect(mesures, 'tous les arrêts de la région n’ont pas été mesurés').toHaveLength(NOMBRE_LIENS);
});

test('activer un lien d’étape au clavier replie la vue ET garde le focus dans le document', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON_TEMOIN);
  await attendreHydratation(page);

  await tabulerJusquALaSimulation(page);

  // Trois tabulations depuis la première commande mènent au lien de l'étape 1 ;
  // trois de plus au lien de l'étape 4. Le compte est DÉRIVÉ de l'ordre épinglé
  // plus haut, pas d'une constante recopiée.
  for (let presses = 0; presses < 3 + 3; presses++) {
    await page.keyboard.press('Tab');
  }
  await expect(lienEtape(page, 4), 'le clavier n’atteint pas le lien de l’étape 4').toBeFocused();

  await page.keyboard.press('Enter');

  const etat = await lireEtat(page);
  expect(etat.courante, 'Entrée sur le lien d’étape n’a pas replié la vue sur l’étape 4').toBe(4);

  // 🔴 LE POINT DE CE TEST. Le repli masque M−1 étapes ; s'il retirait des nœuds ou
  // masquait celui qui porte le focus, `document.activeElement` retomberait sur
  // `<body>` et la tabulation suivante repartirait du haut de la page.
  await expect(
    etape(page, 4),
    'après activation au clavier, le focus n’est pas sur l’étape visée : le repli a perdu le point de lecture (WCAG 2.4.3)',
  ).toBeFocused();

  // Et la tabulation repart bien d'ici — pas du début du document.
  await page.keyboard.press('Tab');
  expect(
    await page.evaluate(() => document.activeElement?.tagName ?? ''),
    'la tabulation après le repli est repartie de `<body>` : le focus avait été perdu',
  ).not.toBe('BODY');
});
