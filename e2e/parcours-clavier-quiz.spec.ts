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
//     se parcourt aux flèches. Un `name` distinct par choix donnerait des cases à
//     cocher déguisées : même rendu, même HTML valide, même passe axe, mais autant
//     d'arrêts que de radios, et plus aucune sémantique « 2 sur 3 ».
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
//     tous les arrêts de questions disparaissent d'un coup du parcours, et le
//     bouton qui portait le
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
// blocs de code défilables) appartiennent au CONTENU de la leçon : les épingler
// ferait rougir ce fichier à chaque retouche éditoriale, pour une faute qui
// ne serait pas la sienne. On tabule donc JUSQU'AU quiz, on imprime le compte au
// journal (« … tabulation(s) avant le quiz », plus bas), et on épingle ce qui
// appartient au quiz : ses arrêts, dans l'ordre.
//
// 🔴 CE FICHIER EST AGNOSTIQUE AU CONTENU ÉDITORIAL — RECALIBRAGE DU 2026-08-20,
// à la clôture d'E3-ST1. Il visait la fixture témoin et ses CINQ questions, avec
// des littéraux partout : huit arrêts, onze radios, « sur 5 questions corrigées »,
// « quatre tabulations jusqu'au premier `<select>` ». La leçon 01 en publie HUIT,
// d'où douze arrêts et vingt-quatre radios — et dix-huit leçons restent à écrire.
// Un spec qui rougit parce qu'un auteur ajoute une question est un défaut, pas un
// gate. Tout compte est donc DÉRIVÉ, et de DEUX sources indépendantes :
//   • la STRUCTURE attendue vient du `quiz.json` de la leçon mesurée, lu sur le
//     DISQUE — types de questions, nombre de choix, nombre de lignes d'un
//     `associer`, lignes de code d'un `trouver-la-faille` ;
//   • le RENDU vient du DOM servi.
// L'assertion est leur ÉGALITÉ. C'est la parade au patron S-014 : un compte tiré
// du seul DOM se prouverait lui-même, et un test auto-validant est un gate vide.
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
import { ROUTE_LECON_QUIZ, exigerUneLeconAvecQuiz } from './aides/artefact-mesure';
import {
  citationDeReponse,
  lireQuizSource,
  mecaniqueDeSaisie,
  radiosAttendues,
} from './aides/quiz-source';

exigerUneLeconAvecQuiz('le parcours clavier du quiz (arrêts, flèches, focus visible)');

/** La page de leçon à quiz que l'artéfact sous mesure porte réellement. */
const CHEMIN_LECON = ROUTE_LECON_QUIZ;

/**
 * La SOURCE de vérité indépendante du DOM : le `quiz.json` de cette leçon-là.
 *
 * 🔴 LA LECTURE A DÉMÉNAGÉ DANS `e2e/aides/quiz-source.ts` (2026-08-20), et la dette
 * qui était nommée ici est payée. Elle vivait en TROIS exemplaires — un par spec du
 * quiz — et les trois avaient déjà divergé sur le contrat qu'ils lisaient. Le
 * fichier d'aide est inscrit dans `src/configuration-typescript.spec.ts` comme
 * L-034 l'exige, dans ce même diff.
 */
const QUESTIONS_SOURCE = lireQuizSource();

/**
 * Borne de la marche d'approche vers le quiz. Généreuse mais finie : sans elle, un
 * piège du focus AVANT le quiz ferait boucler la suite au lieu de la faire rougir.
 */
const LIMITE_APPROCHE = 60;

/**
 * LES ARRÊTS DU QUIZ, DANS L'ORDRE DU DOCUMENT — le cœur épinglé de ce fichier.
 *
 * ⚠️ DÉRIVÉS DE `quiz.json`, PLUS ÉCRITS À LA MAIN (2026-08-20). La règle de rendu
 * est stable, elle : une question à radios coûte UN arrêt (le groupe `name` partagé,
 * entré sur son premier membre puisque rien n'est coché), une question `associer`
 * en coûte UN PAR LIGNE (un `<select>` par ligne de gauche), et le bouton de
 * correction en coûte un dernier. Vingt-quatre radios pour huit arrêts de question
 * sur la leçon 01 : c'est tout l'intérêt, et c'est ce que le test mesure.
 */
const ARRETS_DU_QUIZ: readonly { readonly nom: string; readonly selecteur: string }[] = [
  ...QUESTIONS_SOURCE.flatMap((question) =>
    mecaniqueDeSaisie(question) === 'selects'
      ? (question.paires ?? []).map((paire, ligne) => ({
          nom: `${question.id} · associer — select de « ${paire.gauche} »`,
          selecteur: `#quiz-${question.id} select >> nth=${ligne}`,
        }))
      : [
          {
            nom: `${question.id} · ${question.type} — 1er membre du groupe`,
            selecteur: `#quiz-${question.id} input[type="radio"] >> nth=0`,
          },
        ],
  ),
  { nom: 'bouton « Corriger mes réponses »', selecteur: '.quiz button' },
];

/** Le compte de radios que la source annonce, toutes questions confondues. */
const RADIOS_ATTENDUES = QUESTIONS_SOURCE.reduce(
  (somme, question) => somme + radiosAttendues(question),
  0,
);

/** Le rang, dans le parcours, du premier arrêt appartenant à la question `id`. */
function rangDuPremierArret(id: string): number {
  const rang = ARRETS_DU_QUIZ.findIndex((arret) => arret.selecteur.startsWith(`#quiz-${id} `));
  if (rang < 0) {
    throw new Error(`la question « ${id} » n'a produit aucun arrêt : le parcours dérivé est faux`);
  }
  return rang;
}

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

test('les arrêts du quiz se parcourent au clavier seul, dans l’ordre du document', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);

  // LE CROISEMENT DES DEUX SOURCES, POSÉ AVANT TOUT LE RESTE. Le DOM rend-il
  // exactement ce que `quiz.json` déclare ? Sans cette ligne, le parcours dérivé
  // se prouverait lui-même : une question perdue au rendu retirerait à la fois un
  // arrêt attendu et l'arrêt réel, et le test resterait vert (S-014).
  await expect(
    page.locator('.quiz fieldset.question'),
    `le DOM rend un nombre de questions différent de ce que « quiz.json » déclare (${QUESTIONS_SOURCE.length}) : le rendu a perdu ou inventé une question`,
  ).toHaveCount(QUESTIONS_SOURCE.length);

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

  // ANTI-VACUITÉ. Le parcours est dérivé de la source ; ce garde-fou dit qu'il n'a
  // pas été dérivé à VIDE. Une liste amputée de tous ses arrêts de question, ou de
  // son bouton, passerait la boucle ci-dessus VERTE sans presser une seule touche.
  // Le quiz porte au moins un arrêt par question, plus le bouton : le strict
  // supérieur tient même sans `associer`.
  expect(
    arrets.length,
    'le parcours dérivé ne couvre pas toutes les questions : la boucle ci-dessus serait verte et vide',
  ).toBeGreaterThan(QUESTIONS_SOURCE.length);

  // CE QUE LA LIGNE SUIVANTE PROUVE, ELLE, SUR LE DOM RÉEL : vingt-quatre radios
  // pour huit arrêts de question sur la leçon 01. C'est le `name` partagé par
  // question, et c'est la seule assertion du fichier qui rougirait si quelqu'un
  // remplaçait `[name]="question.idDocument"` par un identifiant unique par choix.
  //
  // ⚠️ LE COMPTE VIENT DE `quiz.json`, PAS DU DOM (2026-08-20 — il valait 11 en dur,
  // calibré sur la fixture témoin). Chaque question annonce ses membres : les choix
  // d'un `choix-multiple`, les deux d'un `vrai-faux`, une radio par ligne de code
  // d'un `trouver-la-faille`. Le sélecteur est borné au `.quiz` : les trois radios
  // de la bascule de thème de la coquille n'entrent pas dans ce compte.
  await expect(
    page.locator('.quiz input[type="radio"]'),
    `le DOM ne rend pas les ${RADIOS_ATTENDUES} radios que « quiz.json » annonce : le gabarit a bougé, ou une question n’est pas rendue`,
  ).toHaveCount(RADIOS_ATTENDUES);

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
  //
  // 🔴 ASSERTION RETIRÉE LE 2026-08-20, ET LE DIRE FAIT PARTIE DU CORRECTIF. Une
  // seconde assertion exigeait ici que le focus entre dans `.simulation .commandes a`.
  // La leçon 01 n'a PAS de simulation (décision du propriétaire : sujet abstrait,
  // schéma statique) — l'exiger ferait rougir ce fichier sur un produit sain, et
  // l'ancrer à un voisin éditorial est exactement ce que le paragraphe ci-dessus
  // reproche. Ce qui reste mesuré est le sujet du test — on SORT du quiz. Ce qui
  // n'est plus mesuré ici — le voisin d'après — l'est par
  // `parcours-clavier-simulation.spec.ts` le jour où une leçon publiée en porte une.
  //
  // ⚠️ « SORTIR DU QUIZ » ET « PERDRE LE FOCUS » SONT DEUX ÉTATS DISTINCTS, et le
  // second est un défaut (correctif du 2026-08-20). `closest('.quiz') === null` est
  // AUSSI vrai quand `document.activeElement` est `<body>` — c'est-à-dire quand le
  // focus est tombé nulle part, exactement le mode d'échec 2.4.3 que ce fichier
  // existe pour attraper. On exige donc les deux moitiés : il y a un focalisable
  // focalisé, ET il est hors du quiz.
  await page.keyboard.press('Tab');
  const sortie = await page.evaluate(() => {
    const actif = document.activeElement;
    return {
      focalise: actif !== null && actif !== document.body,
      horsDuQuiz: actif?.closest('.quiz') === null,
      description: actif === null ? '(aucun)' : `${actif.tagName.toLowerCase()}`,
    };
  });
  expect(
    sortie.focalise,
    `la tabulation après le bouton de correction laisse le focus dans le vide (${sortie.description}) : ` +
      'le focus n’est PAS sorti du quiz, il a été PERDU — 2.4.3',
  ).toBe(true);
  expect(sortie.horsDuQuiz, 'la tabulation après le bouton de correction ne sort pas du quiz').toBe(
    true,
  );
});

test('les flèches déplacent la coche dans chaque mécanique à radios de la leçon', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);
  await tabulerJusquAuQuiz(page);

  // LES MÉCANIQUES À RADIOS QUE CETTE LEÇON-LÀ PUBLIE, une par forme — la PREMIÈRE
  // question de chaque forme suffit : les suivantes de la même forme rendent le même
  // gabarit, et le parcours complet est déjà épinglé par le premier test.
  // Le rang de tabulation vient du parcours dérivé, plus d'un littéral (2026-08-20 :
  // il valait 0/1/3 sur la fixture témoin ; il vaut 0/1/6 sur la leçon 01, où
  // l'`associer` et ses quatre lignes s'intercalent).
  // ⚠️ LE FILTRE PORTE SUR LA MÉCANIQUE, PAS SUR `type !== 'associer'` : la liste
  // blanche de `mecaniqueDeSaisie` REFUSE un type inconnu en le nommant, là où la
  // comparaison négative l'aurait rangé d'office parmi les groupes de radios.
  const mecaniques = [
    ...new Set(
      QUESTIONS_SOURCE.filter((question) => mecaniqueDeSaisie(question) === 'radios').map(
        (question) => question.type,
      ),
    ),
  ]
    .map((forme) => {
      const question = QUESTIONS_SOURCE.find((candidate) => candidate.type === forme);
      if (question === undefined || radiosAttendues(question) < 2) {
        throw new Error(`la forme « ${forme} » n'a pas de groupe à deux membres : rien à parcourir`);
      }
      return {
        forme,
        fieldset: `#quiz-${question.id}`,
        tabulationsDepuisLeQuiz: rangDuPremierArret(question.id),
      };
    })
    .sort((a, b) => a.tabulationsDepuisLeQuiz - b.tabulationsDepuisLeQuiz);

  // ANTI-VACUITÉ, ET C'EST UN CROISEMENT : toute forme à radios déclarée par la
  // source est parcourue ici. Une forme oubliée ferait un test vert sur une
  // mécanique jamais pressée.
  expect(
    mecaniques.length,
    'aucune mécanique à radios parcourue : le test serait vert et vide',
  ).toBeGreaterThan(0);

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
  // La leçon mesurée ne porte pas forcément d'`associer` — le saut se NOMME plutôt
  // que de faire rougir un produit sain (2026-08-20 ; la fixture témoin en avait un,
  // la leçon 01 aussi, mais rien ne l'impose aux dix-huit suivantes).
  const associer = QUESTIONS_SOURCE.find((question) => question.type === 'associer');
  test.skip(
    associer === undefined,
    'la leçon mesurée ne publie aucune question « associer » : pas de `<select>` à remplir au clavier',
  );
  if (associer === undefined) return;
  const premiereLigne = associer.paires?.[0];
  if (premiereLigne === undefined) {
    throw new Error(`l'« associer » ${associer.id} ne déclare aucune paire : rien à mesurer`);
  }

  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);
  await tabulerJusquAuQuiz(page);

  // Le rang du 1er `<select>` vient du parcours dérivé (2026-08-20 : quatre
  // tabulations sur la fixture témoin, deux sur la leçon 01, où l'`associer` est
  // la troisième question).
  for (let n = 0; n < rangDuPremierArret(associer.id); n++) {
    await page.keyboard.press('Tab');
  }

  const premierChamp = page.locator(`#quiz-${associer.id} select`).first();
  await expect(premierChamp).toBeFocused();
  await expect(premierChamp, 'le champ ne part pas de « Choisir… »').toHaveValue('');

  // La flèche sur un `<select>` fermé change la valeur ET émet `change` — c'est le
  // comportement natif que D-1 revendiquait sans l'avoir mesuré. Aucune souris,
  // aucun `selectOption()` : `selectOption` est une commande de Playwright, pas une
  // touche, et l'employer ici viderait le test de son sujet.
  //
  // 🔴 ON DESCEND JUSQU'À UNE RÉPONSE FAUSSE, ET CE N'EST PAS DÉCORATIF. Une
  // association JUSTE se corrige par un simple « Association correcte », qui ne cite
  // RIEN : on viserait alors une citation qui n'a aucune raison d'exister, et le test
  // rougirait sur un composant parfaitement sain. La citation de la réponse du
  // visiteur n'existe que sur une ligne FAUSSE, et c'est elle — elle seule — qui
  // prouve que le `(change)` a couru.
  //
  // ⚠️ LA BONNE RÉPONSE VIENT DE `quiz.json`, PLUS D'UN COMPTE DE FLÈCHES EN DUR
  // (2026-08-20 : « deux ArrowDown » était calibré sur l'ordre des options de la
  // fixture témoin). On presse tant que la valeur choisie est vide ou correcte,
  // borné par le nombre d'options réellement rendues. Même raisonnement, mêmes
  // raisons, que `REPONSE_SELECT` dans `quiz-pre-hydratation.spec.ts`.
  const nombreDOptions = await premierChamp.locator('option').count();
  let valeurChoisie = '';
  for (let n = 0; n < nombreDOptions; n++) {
    await page.keyboard.press('ArrowDown');
    valeurChoisie = await premierChamp.inputValue();
    if (valeurChoisie !== '' && valeurChoisie !== premiereLigne.droite) break;
  }
  expect(valeurChoisie, 'la flèche n’a rien changé : le champ n’est pas opérable au clavier').not.toBe(
    '',
  );
  expect(
    valeurChoisie,
    'aucune option FAUSSE n’a pu être atteinte à la flèche : la correction ne citerait pas la réponse, et le test ne prouverait plus rien',
  ).not.toBe(premiereLigne.droite);

  // ET LE COMPOSANT L'A-T-IL ENREGISTRÉ ? Une valeur dans le DOM ne prouve pas que
  // le `(change)` a couru. La correction cite la réponse du visiteur quand elle est
  // fausse : c'est cette citation qui prouve l'enregistrement.
  //
  // ⚠️ LA CITATION EST UNE EXPRESSION RÉGULIÈRE, PAS UNE CHAÎNE (2026-08-20). Le
  // gabarit écrit une U+00A0 avant le deux-points ; `toContainText` NORMALISE les
  // blancs quand on lui passe une chaîne, donc l'espace ordinaire écrite ici
  // passait sans rien mesurer — et son jumeau de `quiz-pre-hydratation.spec.ts`
  // annonçait l'inverse en commentaire (L-008). `citationDeReponse` tranche pour
  // les deux fichiers, et elle MESURE l'insécable.
  await page.getByRole('button', { name: 'Corriger mes réponses' }).click();
  await expect(
    page.locator(`#quiz-${associer.id} .ligne-corrigee`).first(),
    'la correction ne cite pas la valeur choisie à la flèche : le `(change)` du `<select>` n’a pas couru',
  ).toContainText(citationDeReponse(valeurChoisie));
});

test('la correction s’atteint à la touche Entrée, et le focus va au résumé plutôt que dans le vide', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);
  await tabulerJusquAuQuiz(page);

  // Le bouton de correction est le DERNIER arrêt du quiz : on tabule d'autant
  // (2026-08-20 : sept tabulations en dur sur la fixture témoin, onze sur la
  // leçon 01 — le compte est désormais celui du parcours dérivé).
  for (let n = 0; n < ARRETS_DU_QUIZ.length - 1; n++) {
    await page.keyboard.press('Tab');
  }
  const bouton = page.getByRole('button', { name: 'Corriger mes réponses' });
  await expect(bouton).toBeFocused();

  // ENTRÉE, et non un clic : c'est l'activation clavier d'un `<button type="button">`.
  await page.keyboard.press('Enter');

  // La correction est là, et le RÉSUMÉ porte enfin un texte — la région
  // `role="status"` existe dès le premier rendu, vide, précisément pour être annoncée.
  // Un verdict par question DÉCLARÉE par la source, et le résumé qui les compte —
  // deux sources, une égalité (2026-08-20 : « 5 » en dur, calibré sur la fixture).
  await expect(page.locator('.quiz .verdict')).toHaveCount(QUESTIONS_SOURCE.length);
  await expect(page.getByRole('status')).toContainText(
    `sur ${QUESTIONS_SOURCE.length} questions corrigées`,
  );

  // 🔴 LE POINT QUE RIEN D'AUTRE NE VOIT (WCAG 2.4.3). Le bouton qui portait le
  // focus vient d'être REMPLACÉ par « Recommencer le quiz », et toutes les radios
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

test('aucun piège du focus dans le quiz : Maj+Tab remonte tous les arrêts en miroir', async ({
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

  // 🔴 L'ANTI-VACUITÉ EST CELLE-CI, PAS LA SUIVANTE (correctif du 2026-08-20, L-056).
  // `mesures.length === ARRETS_DU_QUIZ.length` ne peut PAS échouer : la boucle pousse
  // exactement un élément par itération ou lève. À zéro arrêt elle passe même (0 === 0)
  // — le cas exact que son message annonçait attraper. La question de L-056 (« ce test
  // aurait-il échoué là où l'échec doit se produire ? ») se répondait donc NON.
  // Le compte qui MORD est celui du parcours dérivé confronté à la source : un arrêt
  // par question (ou un par ligne d'`associer`, donc davantage) PLUS le bouton de
  // correction — le parcours est strictement plus long que la liste des questions.
  // Un `ARRETS_DU_QUIZ` réduit à zéro, ou amputé de son bouton, rougit ici.
  expect(
    ARRETS_DU_QUIZ.length,
    `le parcours dérivé compte ${String(ARRETS_DU_QUIZ.length)} arrêt(s) pour ` +
      `${String(QUESTIONS_SOURCE.length)} question(s) déclarée(s) : il devrait en compter au moins ` +
      'un de plus (le bouton « Corriger mes réponses »). La dérivation depuis `quiz.json` est ' +
      'vide ou tronquée — tout ce qui suit serait vert sans avoir rien parcouru.',
  ).toBeGreaterThan(QUESTIONS_SOURCE.length);

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
