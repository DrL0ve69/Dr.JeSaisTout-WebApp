// =============================================================================
// La mécanique de la simulation, dans un vrai navigateur et sous la CSP servie
// (E2-ST5, lot c1)
// -----------------------------------------------------------------------------
// CE QUE CE FICHIER MESURE, ET CE QU'AUCUN TEST UNITAIRE NE PEUT MESURER.
// `simulation.spec.ts` (Vitest) couvre déjà la logique du composant : les signaux,
// la validation des renvois, le calcul des libellés. Trois choses lui échappent par
// construction, et ce sont exactement celles-ci :
//   (a) LE MODÈLE C′ SUR LE DOCUMENT SERVI — « les M étapes sont toutes visibles
//       dès le prerender, donc aussi SANS JavaScript, et rien ne se replie à
//       l'hydratation ». Un harnais de test monte le composant : il ne voit ni le
//       HTML prerendu, ni la fenêtre où le JavaScript n'est pas encore là.
//   (b) LE LIEN PROFOND — ouvrir `…#simulation-etape-3` doit AFFICHER l'étape 3.
//       C'est le seul contrôle de bout en bout de la correction L-033 : le fragment
//       est un état saisi dans le DOM avant que le composant existe, et seul un
//       navigateur qui navigue réellement le prouve.
//   (c) 🔴 `anchorScrolling`, LA DÉPENDANCE NON TENUE. Le SEUL mécanisme d'annonce
//       de ce composant est `withInMemoryScrolling({ anchorScrolling: 'enabled' })`
//       dans `src/app/app.config.ts` : c'est `ViewportScroller.scrollToAnchor` qui
//       appelle `focus({ preventScroll: true })` sur l'élément visé. Le composant,
//       lui, n'appelle JAMAIS `.focus()` — et `GestionFocusRoute` se retire
//       explicitement des navigations qui ne changent que le fragment. Retirer
//       l'option rendrait donc la simulation MUETTE pour un lecteur d'écran sans
//       qu'un seul autre gate rougisse. Le test « le focus suit le lien d'étape »
//       plus bas est ce garde-fou, et son message nomme le fichier à regarder.
//
// ⚠️ CE FICHIER NE DÉPLACE RIEN PAR LE STYLE (L-041 / S-016). Sous la CSP servie,
// un `style="…"` posé par `setAttribute` est REFUSÉ tandis qu'un
// `element.style.setProperty(…)` s'applique — mesuré au lot c2, qui corrige au
// passage la prémisse de L-041. Le geste est donc imprévisible selon la forme
// employée, et un spec qui bougerait un élément par le style serait au mieux
// fragile, au pire un no-op silencieux qui accuse le produit. Tout ce qui est
// mesuré ici l'est par des gestes réels (clic, tabulation) et par lecture du DOM.
//
// PÉRIMÈTRE. Le contrôle positif de `style-src` (la dette S-016) et l'énumération
// des hachages appartiennent à `simulation-sous-csp.spec.ts` (lot c2), pas ici. Ce
// fichier se contente d'exiger que la politique stricte soit RÉELLEMENT servie sur
// la réponse mesurée, et qu'actionner la simulation n'en produise aucune violation
// — la clause « sous la CSP réelle » de l'objectif.
// =============================================================================

import { Page, expect, test } from '@playwright/test';

import { exigerUneLeconAvecSimulation } from './aides/artefact-mesure';
import { attendreHydratation } from './aides/hydratation';
import { exigerCspServie, lireViolations, surveiller } from './aides/sonde-csp';
import {
  ROUTE_LECON_SIMULATION,
  COMMANDES,
  ID_REGION,
  NOMBRE_ACTEURS,
  NOMBRE_MARQUEURS_DANGER,
  NOMBRE_ETAPES,
  NOMBRE_LIENS,
  attendreCourante,
  attendreDepli,
  attendreRepli,
  commande,
  etape,
  idEtape,
  lienEtape,
  lireEtat,
} from './aides/simulation';

exigerUneLeconAvecSimulation('la mécanique de la simulation (modèle C′, lien profond, anchorScrolling)');

/** Tous les numéros d'étape SAUF celui-là — ce que « repliée sur N » veut dire. */
function toutesSaufCelleCi(numero: number): number[] {
  return Array.from({ length: NOMBRE_ETAPES }, (_, rang) => rang + 1).filter(
    (candidat) => candidat !== numero,
  );
}

// -----------------------------------------------------------------------------
// (a) Le modèle C′ — d'abord SANS JavaScript, puis après hydratation
// -----------------------------------------------------------------------------

test.describe('sans JavaScript — l’état final du prerender', () => {
  // Le contenu doit rester lisible sans JS (SSR/prerender = état final). C'est la
  // moitié du modèle C′ que le reste du fichier ne peut pas mesurer : dès que le
  // JavaScript s'exécute, on ne sait plus distinguer « le prerender le portait
  // déjà » de « le composant vient de le poser ».
  test.use({ javaScriptEnabled: false });

  test('les M étapes et les M liens d’étape sont là, aucun n’est masqué', async ({ page }) => {
    await page.goto(ROUTE_LECON_SIMULATION);

    const etat = await lireEtat(page);

    expect(etat.etapesPresentes, 'le prerender ne porte pas toutes les étapes').toBe(NOMBRE_ETAPES);
    expect(
      etat.masquees,
      'une étape est masquée dans le HTML servi : le modèle C′ exige que tout soit lisible sans JavaScript',
    ).toEqual([]);
    expect(
      etat.courante,
      'aucun lien ne porte `aria-current="step"` dans le prerender : la barre ne dit pas où commence la lecture',
    ).toBe(1);

    await expect(
      page.locator('.simulation .liens-etapes a'),
      'les liens d’étape ne sont pas présents dès le prerender — c’est la décision C′ du propriétaire',
    ).toHaveCount(NOMBRE_ETAPES);
    await expect(page.locator('.simulation .acteurs .acteur')).toHaveCount(NOMBRE_ACTEURS);

    // Les liens portent une VRAIE cible dans le document servi : sans JavaScript,
    // c'est le navigateur seul qui doit pouvoir mener à l'étape 6.
    await expect(lienEtape(page, NOMBRE_ETAPES)).toHaveAttribute(
      'href',
      new RegExp(`#${idEtape(NOMBRE_ETAPES)}$`),
    );
  });

  test('le lien profond mène à l’étape visée même sans JavaScript', async ({ page }) => {
    await page.goto(`${ROUTE_LECON_SIMULATION}#${idEtape(3)}`);

    // Sans JavaScript, personne ne déplace le focus ni ne marque l'étape : ce qui
    // doit tenir, c'est que la cible EXISTE et soit visible. Un `id` absent ferait
    // du lien un lien mort — la seule façon de rater ce cas est de ne pas le tester.
    await expect(
      etape(page, 3),
      'la cible du lien profond est absente ou masquée dans le document servi',
    ).toBeVisible();
  });
});

test('après hydratation, RIEN ne se replie tant que le lecteur n’a rien demandé', async ({
  page,
}) => {
  await page.goto(ROUTE_LECON_SIMULATION);
  await attendreHydratation(page);

  const etat = await lireEtat(page);
  expect(
    etat.masquees,
    'la vue s’est repliée à l’hydratation : un lecteur déjà descendu à l’étape 5 aurait vu la page bouger sans l’avoir demandé (modèle C′)',
  ).toEqual([]);
  expect(etat.courante, 'l’étape courante a bougé sans geste du lecteur').toBe(1);
  expect(etat.liensCourants, '`aria-current="step"` doit désigner UNE seule étape').toBe(1);
});

// -----------------------------------------------------------------------------
// (a bis) Les trois commandes
// -----------------------------------------------------------------------------

test('un clic sur un lien d’étape replie la vue sur cette étape, et sur elle seule', async ({
  page,
}) => {
  await page.goto(ROUTE_LECON_SIMULATION);
  await attendreHydratation(page);

  await lienEtape(page, 4).click();
  // Barrière : `lireEtat` est servie UNE fois et ne se rejoue pas, alors que le
  // repli est peint sur une frame ultérieure — intermittence « famille 1 », mesurée
  // et détaillée dans `aides/simulation.ts`.
  await attendreRepli(page, 4, 'l’étape courante ne suit pas le lien activé');

  const etat = await lireEtat(page);
  expect(etat.courante, 'l’étape courante ne suit pas le lien activé').toBe(4);
  expect(etat.masquees, 'le repli ne masque pas exactement les M−1 autres étapes').toEqual(
    toutesSaufCelleCi(4),
  );
  expect(
    etat.valeursHidden,
    '`hidden` doit valoir « until-found » : un `hidden` nu rendrait l’étape introuvable au Ctrl+F',
  ).toEqual(['until-found']);
  expect(
    etat.etapesPresentes,
    'le repli a RETIRÉ des nœuds du document — la CSP servie refuse tout bloc de style monté après l’hydratation',
  ).toBe(NOMBRE_ETAPES);
  await expect(etape(page, 4), 'l’étape demandée n’est pas visible').toBeVisible();

  // Les libellés bornés DISENT le numéro visé : depuis l'étape 4, ils annoncent 3 et 5.
  expect(etat.commandes[COMMANDES.precedente]).toContain('étape 3');
  expect(etat.commandes[COMMANDES.suivante]).toContain('étape 5');
});

test('« précédente », « suivante » et « réinitialiser » déplacent l’étape courante', async ({
  page,
}) => {
  await page.goto(ROUTE_LECON_SIMULATION);
  await attendreHydratation(page);

  // Au premier pas, « précédente » est BORNÉE à l'étape 1 : elle pointe une cible
  // réelle et son libellé le dit. Ce n'est pas un lien mort, et le vérifier ferme
  // le seul endroit où le repli pourrait masquer TOUTES les étapes.
  expect((await lireEtat(page)).commandes[COMMANDES.precedente]).toContain('étape 1');
  await commande(page, COMMANDES.precedente).click();
  // Une barrière par geste : chaque lecture ponctuelle décrit alors un instant
  // COHÉRENT, au lieu de courir contre la frame de peinture (« famille 1 »).
  await attendreCourante(page, 1, 'la borne basse de « précédente » a cédé');
  expect((await lireEtat(page)).courante, 'la borne basse de « précédente » a cédé').toBe(1);

  await commande(page, COMMANDES.suivante).click();
  await attendreCourante(page, 2, '« Suivante » n’a pas mené à l’étape 2');
  expect((await lireEtat(page)).courante).toBe(2);
  await commande(page, COMMANDES.suivante).click();
  await attendreCourante(page, 3, '« Suivante » n’a pas mené à l’étape 3');
  expect((await lireEtat(page)).courante).toBe(3);
  await commande(page, COMMANDES.precedente).click();
  await attendreRepli(page, 2, '« Précédente » n’a pas ramené la vue à l’étape 2');

  const avantReinitialisation = await lireEtat(page);
  expect(avantReinitialisation.courante).toBe(2);
  expect(
    avantReinitialisation.masquees,
    'la vue devrait être repliée après trois gestes — sinon le test suivant ne prouve rien',
  ).toEqual(toutesSaufCelleCi(2));

  await commande(page, COMMANDES.reinitialiser).click();
  // La vue VIENT d'être constatée repliée (assertion ci-dessus) : la barrière de
  // dépli n'est donc pas vraie par construction ici.
  await attendreDepli(page, '« Réinitialiser » n’a pas tout réaffiché');

  const apres = await lireEtat(page);
  expect(apres.masquees, '« Réinitialiser » n’a pas tout réaffiché').toEqual([]);
  expect(apres.courante, '« Réinitialiser » ne ramène pas la lecture à l’étape 1').toBe(1);
});

// -----------------------------------------------------------------------------
// (b) 🔴 Le lien profond — la régression que les correctifs viennent de fermer
// -----------------------------------------------------------------------------

test('ouvrir directement …#simulation-etape-3 affiche l’étape 3 (L-033)', async ({ page }) => {
  await page.goto(`${ROUTE_LECON_SIMULATION}#${idEtape(3)}`);
  await attendreHydratation(page);
  // `amorcerDepuisLeFragment` court dans `afterNextRender`, et son effet est peint
  // sur une frame ultérieure : `[ngh]`=0 ne dit rien de CETTE écriture-là.
  await attendreCourante(page, 3, 'le fragment de l’URL n’a pas été relu au premier rendu client');

  const etat = await lireEtat(page);

  expect(
    etat.courante,
    'le fragment de l’URL n’a pas été relu au premier rendu client : le composant s’est amorcé à l’étape 1 ' +
      'et écrase l’intention du lecteur (L-033 — `amorcerDepuisLeFragment`, appelée depuis `afterNextRender`)',
  ).toBe(3);
  expect(etat.liensCourants, '`aria-current="step"` doit désigner UNE seule étape').toBe(1);
  await expect(
    lienEtape(page, 3),
    'le lien de l’étape visée ne porte pas `aria-current="step"` — le canal MACHINE de l’état courant est perdu',
  ).toHaveAttribute('aria-current', 'step');

  // ⚠️ LE MODÈLE C′ TIENT AUSSI ICI, et c'est le point qu'un test unitaire ne dit
  // pas : arriver par un lien profond n'est PAS un geste de repli. Les six étapes
  // restent lisibles ; seule la barre dit où l'on est.
  expect(
    etat.masquees,
    'un lien profond a replié la vue : la page est arrivée amputée de M−1 étapes, sans que le lecteur ait rien demandé',
  ).toEqual([]);
  await expect(etape(page, 3)).toBeVisible();
  await expect(etape(page, 1)).toBeVisible();
});

// -----------------------------------------------------------------------------
// (c) ⚠️ `anchorScrolling` — le seul mécanisme d'annonce du composant
// -----------------------------------------------------------------------------

/** Le message d'échec commun : il doit dire QUOI regarder, pas seulement que c'est rouge. */
const DIAGNOSTIC_ANCRE =
  'le focus n’a pas suivi le lien d’ancre. Le composant n’appelle JAMAIS `.focus()` : ' +
  'ce déplacement vient de `withInMemoryScrolling({ anchorScrolling: "enabled" })` dans ' +
  '`src/app/app.config.ts` (c’est `ViewportScroller.scrollToAnchor` qui appelle ' +
  '`focus({ preventScroll: true })`), et `GestionFocusRoute` se retire des navigations qui ne ' +
  'changent que le fragment. Sans cette option, la simulation est MUETTE pour un lecteur d’écran.';

/**
 * ✅ MUTATION VÉRIFIÉE (2026-08-19), et c'est ce qui distingue ce test d'une
 * intention : `anchorScrolling` passé à `'disabled'` dans `app.config.ts`, artéfact
 * reconstruit — CE test part ROUGE (le focus reste sur le lien activé, l'étape 5
 * n'est jamais focalisée). C'est donc bien lui qui tient l'option.
 */
test('le focus suit le lien d’étape — la dépendance à `anchorScrolling`', async ({ page }) => {
  await page.goto(ROUTE_LECON_SIMULATION);
  await attendreHydratation(page);

  // Prémisse explicite : le focus n'est pas DÉJÀ sur la cible avant le geste,
  // sinon l'assertion suivante serait vraie sans que rien ne l'ait déplacée.
  expect(
    await page.evaluate(() => document.activeElement?.id ?? ''),
    'le focus est déjà sur une étape avant tout geste : le test ne prouverait rien',
  ).not.toBe(idEtape(5));

  await lienEtape(page, 5).click();

  await expect(etape(page, 5), DIAGNOSTIC_ANCRE).toBeFocused();

  // « Réinitialiser » vise la RÉGION : le même mécanisme doit y mener aussi.
  await commande(page, COMMANDES.reinitialiser).click();
  await expect(page.locator(`#${ID_REGION}`), DIAGNOSTIC_ANCRE).toBeFocused();
});

/**
 * ⚠️ CE TEST NE TIENT PAS `anchorScrolling`, ET LE DIRE VAUT MIEUX QUE LE LAISSER
 * CROIRE — mesuré par la MÊME mutation que ci-dessus : `anchorScrolling: 'disabled'`
 * le laisse VERT. À l'ouverture d'une page, c'est le navigateur lui-même qui
 * focalise la cible d'un fragment quand elle est focalisable (`tabindex="-1"`), sans
 * que le routeur intervienne. Ce qu'il mesure reste utile — le lecteur qui arrive par
 * un lien profond atterrit bien SUR l'étape, et pas en tête de page — mais l'écrire
 * comme un second garde-fou de l'option serait une garantie surestimée (famille
 * S-009 : une justification plus forte que ce que le code applique). Le garde-fou de
 * l'option est le test précédent, et lui seul.
 */
test('le focus atterrit sur l’étape visée à l’ouverture par lien profond', async ({ page }) => {
  await page.goto(`${ROUTE_LECON_SIMULATION}#${idEtape(2)}`);
  await attendreHydratation(page);

  await expect(
    etape(page, 2),
    'arriver par un lien profond ne pose pas le focus sur l’étape visée : le lecteur atterrit en tête de page',
  ).toBeFocused();
});

// -----------------------------------------------------------------------------
// La CSP servie — clause « sous la CSP réelle » de l'objectif
// -----------------------------------------------------------------------------

test('actionner la simulation ne produit aucune violation de la CSP servie', async ({ page }) => {
  // AVANT `goto` : une violation survenue au chargement serait perdue autrement.
  const journal = await surveiller(page);

  const reponse = await page.goto(ROUTE_LECON_SIMULATION);
  // La politique servie est comparée à celle du dépôt : un `npx swa start` démarré
  // sur un artéfact périmé sert une AUTRE politique — dans le sens permissif, il
  // rendrait ce test vert pour rien.
  const politique = exigerCspServie(reponse);
  await attendreHydratation(
    page,
    'le chunk paresseux de la leçon a-t-il été refusé par `script-src` ?',
  );

  // Le parcours complet : repli, navigation bornée, dépli.
  await lienEtape(page, 3).click();
  await attendreRepli(page, 3, 'le repli n’a pas suivi le lien d’étape');
  await commande(page, COMMANDES.suivante).click();
  await attendreCourante(page, 4, '« Suivante » n’a pas mené à l’étape 4');
  await commande(page, COMMANDES.precedente).click();
  await attendreRepli(page, 3, '« Précédente » n’a pas ramené la vue à l’étape 3');
  await commande(page, COMMANDES.reinitialiser).click();
  await attendreDepli(page, '« Réinitialiser » n’a rien réaffiché');
  expect((await lireEtat(page)).masquees).toEqual([]);

  const violations = await lireViolations(page, journal);
  console.log(
    `CSP servie sur la page de leçon (${String(politique.length)} octets) — ` +
      `${String(violations.length)} violation(s) après le parcours complet de la simulation.`,
  );
  expect(violations, 'la simulation déclenche des refus de la CSP servie').toEqual([]);
  expect(journal.erreurs, 'une exception non rattrapée est survenue pendant le parcours').toEqual(
    [],
  );
});

// -----------------------------------------------------------------------------
// (f) `prefers-reduced-motion` et `forced-colors: active`
// -----------------------------------------------------------------------------

/** Le seuil qui sépare « neutralisée » de « animée ». Mesuré : 1e-05 s contre 0,12 s. */
const SEUIL_TRANSITION_SECONDES = 0.001;

/** La durée de transition de la première boîte d'acteur, en secondes. */
async function dureeDeTransition(page: Page): Promise<number> {
  return page
    .locator('.simulation .etape .boite')
    .first()
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration));
}

test('la transition des boîtes est neutralisée sous `prefers-reduced-motion: reduce`', async ({
  page,
}) => {
  // `playwright.config.ts` place TOUTE la suite sous `reduce` : c'est l'état par
  // défaut ici, et c'est bien celui qu'un gate d'accessibilité doit mesurer.
  await page.goto(ROUTE_LECON_SIMULATION);
  await attendreHydratation(page);

  const duree = await dureeDeTransition(page);
  console.log(`Mouvement réduit — transition des boîtes : ${String(duree)} s.`);
  expect(
    duree,
    'la transition n’est pas neutralisée sous `prefers-reduced-motion: reduce` (G6)',
  ).toBeLessThan(SEUIL_TRANSITION_SECONDES);
});

test.describe('sans préférence de mouvement', () => {
  // L'AUTRE MOITIÉ DE LA PINCE. Sans elle, le test précédent resterait vert si la
  // transition disparaissait PARTOUT — on prouverait alors l'absence d'une
  // fonctionnalité, pas l'existence d'une variante.
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  test('la transition existe bel et bien quand rien n’est demandé', async ({ page }) => {
    await page.goto(ROUTE_LECON_SIMULATION);
    await attendreHydratation(page);

    const duree = await dureeDeTransition(page);
    console.log(`Sans préférence — transition des boîtes : ${String(duree)} s.`);
    expect(
      duree,
      'aucune transition hors `reduce` : la variante « sans animation » ne se distingue de rien',
    ).toBeGreaterThan(SEUIL_TRANSITION_SECONDES);
  });
});

test.describe('en couleurs forcées', () => {
  test.use({ contextOptions: { forcedColors: 'active', reducedMotion: 'reduce' } });

  test('rien d’essentiel ne disparaît sous `forced-colors: active`', async ({ page }) => {
    await page.goto(ROUTE_LECON_SIMULATION);
    await attendreHydratation(page);

    // Le système repeint TOUT : les deux encres de marqueur tombent sur `CanvasText`.
    // Ce qui doit rester est ce qui porte le sens SANS la couleur (WCAG 1.4.1) : les
    // mots écrits, les rôles, et un trait effectivement dessiné.
    await expect(
      page.locator('.simulation .marqueur-actif'),
      'le mot « acteur actif » a disparu : en couleurs forcées il ne reste que lui',
    ).toHaveCount(NOMBRE_ETAPES);
    for (let numero = 1; numero <= NOMBRE_ETAPES; numero++) {
      await expect(etape(page, numero).locator('.marqueur-actif')).toBeVisible();
    }

    const danger = page.locator('.simulation .marqueur-danger');
    await expect(
      danger,
      'le compte de marqueurs « danger » ne suit plus les `surbrillance` déclarées par la source',
    ).toHaveCount(NOMBRE_MARQUEURS_DANGER);
    // 🔴 UN SAUT ANNONCÉ, PAS UN `if` MUET (revue du 2026-08-21). Une simulation sans
    // aucune `surbrillance` est légale — `etatVisuel.surbrillance` est optionnel au
    // schéma — et il n'y aurait alors rien à prouver ici. Mais un compte dérivé d'un
    // champ OPTIONNEL hérite de son optionalité : `toHaveCount(0)` deviendrait une
    // assertion d'absence, vraie d'office, et un `if` aurait retiré le `toBeVisible()`
    // SANS LAISSER DE TRACE dans la sortie du run. `test.skip` conditionnel, lui,
    // s'imprime : la couverture perdue se voit.
    test.skip(
      NOMBRE_MARQUEURS_DANGER === 0,
      'la simulation publiée ne déclare aucune `surbrillance` : il n’y a aucun marqueur « danger » dont prouver la survie en couleurs forcées',
    );
    await expect(danger.first(), 'le mot « danger » a disparu en couleurs forcées').toBeVisible();

    await expect(
      page.locator('.simulation .liens-etapes a[aria-current="step"] span'),
      'le marqueur écrit de l’étape courante a disparu en couleurs forcées',
    ).toHaveText(/étape courante/);

    // Les traits sont regroupés dans `@include m.contraste-force` : un trait à
    // 0 px replierait la scène en un mur de texte indifférencié.
    const trait = await page
      .locator('.simulation .etape .boite')
      .first()
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).borderTopWidth));
    expect(trait, 'les boîtes d’acteur n’ont plus de trait en couleurs forcées').toBeGreaterThan(0);

    // Et le compte de liens ne bouge pas : aucune commande n'est masquée par la
    // requête média.
    await expect(page.locator('.simulation a')).toHaveCount(NOMBRE_LIENS);
  });
});
