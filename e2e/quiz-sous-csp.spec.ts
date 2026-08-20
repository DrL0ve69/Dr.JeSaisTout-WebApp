// =============================================================================
// Le QUIZ ACTIONNÉ sous la CSP réellement appliquée par un navigateur (S-005)
// -----------------------------------------------------------------------------
// CE QUE CE FICHIER FERME, ET POURQUOI RIEN D'AUTRE NE POUVAIT LE FAIRE.
// Le lot E-b2 a mesuré la CSP de l'ARTÉFACT : comptes de hachages, provenance de
// chaque `<style>`, classement des scripts inline. Verdict rassurant — `script-src`
// n'a pas bougé en accueillant la première page de leçon interactive. Mais un
// artéfact conforme n'est pas une page qui fonctionne : personne n'avait encore
// regardé un moteur APPLIQUER cette politique pendant qu'un visiteur ACTIONNE le
// premier composant réellement interactif du site.
//
// `bascule-theme.spec.ts` fait cette mesure depuis E1-ST2, mais sur la coquille
// d'accueil : trois radios de thème, aucun chunk paresseux, aucun contenu compilé.
// La page de leçon ajoute tout ce qui manquait à cette preuve :
//   • un CHUNK PARESSEUX de route (`resoudre-lecon` fait un `import()` dynamique
//     des données de la leçon) — un `script-src` trop étroit le refuserait, et la
//     page resterait sur son HTML prerendu, muette et d'apparence saine ;
//   • une HYDRATATION de contenu compilé — Markdown rendu, coloration Shiki, SVG
//     Mermaid déshabillé, un `bypassSecurityTrustHtml` scopé au bloc `mermaid` ;
//   • les TROIS `<style ng-app-id="ng">` que le lot E-b1 a bornés à leur
//     provenance et que le lot E-b2 a comptés (9 → 12 hachages `style-src`) : ici
//     ils sont soit appliqués, soit refusés par un vrai moteur, et une feuille
//     refusée ne se voit dans AUCUN gate statique — elle se voit à l'écran ;
//   • les GESTES : cocher dans les quatre mécaniques à radios, remplir les trois
//     `<select>` de l'`associer`, corriger. C'est ce dernier point qui a produit
//     S-005 en E1-ST2 : ce n'est pas le code d'un composant qui fait apparaître un
//     script inline, c'est le fait qu'il ÉCOUTE.
//
// ⚠️ « ZÉRO VIOLATION » N'EST UNE PREUVE QUE SI DEUX CHOSES SONT ÉTABLIES, et les
// deux le sont ICI, sur CETTE page, jamais par procuration :
//   a. UNE CSP EST SERVIE SUR CE DOCUMENT-CI. `exigerCspServie` est appelée sur la
//      réponse de la page de leçon mesurée, pas sur celle de « / ». Les
//      `globalHeaders` de SWA sont globaux aujourd'hui ; « aujourd'hui » n'est pas
//      une mesure, et une route qu'on exclurait demain ne se verrait que là.
//   b. LA SONDE MORD SUR CE DOCUMENT-CI, ET APRÈS HYDRATATION. Le contrôle positif
//      de `bascule-theme.spec.ts` prouve que `script-src` est appliqué sur la page
//      d'accueil, au chargement. Il ne dit rien de la fenêtre qui compte ici :
//      celle d'APRÈS l'hydratation d'un chunk paresseux, quand le visiteur agit.
//      Le second test injecte donc son script interdit à cet instant précis — donc
//      il n'est pas un doublon du contrôle d'accueil, il en est le pendant tardif
//      (L-019 : un collecteur qui rend une liste vide doit d'abord prouver qu'il
//      sait rendre une liste pleine).
//
// ⚠️ LE PARCOURS DOIT LAISSER UNE TRACE VISIBLE, sinon le vert serait celui d'une
// page morte. Chaque test finit sur le VERDICT du quiz : autant de questions
// corrigées que `quiz.json` en déclare, et un résumé qui les compte. Une page dont
// le chunk n'a pas chargé, ou dont le composant n'écoute pas, ne peut pas produire
// cela.
//
// 🔴 AGNOSTIQUE AU CONTENU ÉDITORIAL — RECALIBRAGE DU 2026-08-20 (clôture d'E3-ST1).
// Ce fichier visait la fixture témoin et ses CINQ questions, avec la liste de ses
// `<fieldset>` écrite à la main. La leçon publiée en porte HUIT, et dix-huit leçons
// restent à écrire : tout compte est désormais DÉRIVÉ du `quiz.json` de la leçon
// mesurée, lu sur le DISQUE, puis confronté au DOM servi. L'assertion est l'ÉGALITÉ
// des deux sources — un compte tiré du seul DOM se prouverait lui-même (S-014).
//
// ⚠️ CE QUE CE FICHIER NE PROUVE PAS. `npx swa start` sert en HTTP sur localhost :
// `frame-ancestors`, HSTS et `upgrade-insecure-requests` y sont inobservables, et
// `trailingSlash` n'est pas implémenté (incident L-032). Ces points restent
// couverts EN LIGNE seulement, par `.github/workflows/deploy.yml`. Voir l'en-tête
// de `playwright.config.ts` pour la liste exacte des trous.
// =============================================================================

import { Page, expect, test } from '@playwright/test';

import {
  FenetreSondeeCsp,
  MOTIFS_CSP,
  exigerCspServie,
  lireViolations,
  surveiller,
} from './aides/sonde-csp';

import { attendreHydratation } from './aides/hydratation';
import { ROUTE_LECON_QUIZ, exigerUneLeconAvecQuiz } from './aides/artefact-mesure';
import { lireQuizSource, mecaniqueDeSaisie } from './aides/quiz-source';

exigerUneLeconAvecQuiz('la CSP mesurée en actionnant le quiz (S-005)');

/**
 * La page de leçon INTERACTIVE réellement présente dans l'artéfact sous mesure.
 *
 * ⚠️ PLUS AUCUN LITTÉRAL DE ROUTE (2026-08-20, clôture d'E3-ST1). Ce fichier visait
 * `/cours/securite-web/lecon-temoin/`, la fixture que `ci.yml` compilait tant que
 * `content/` était vide. Le harnais de fixture est retiré : la route vient
 * désormais de l'artéfact. Voir l'en-tête de `e2e/aides/artefact-mesure.ts`.
 */
const CHEMIN_LECON = ROUTE_LECON_QUIZ;

/**
 * La SOURCE de vérité indépendante du DOM : le `quiz.json` de cette leçon-là.
 *
 * 🔴 LA LECTURE A DÉMÉNAGÉ DANS `e2e/aides/quiz-source.ts` (2026-08-20). Elle vivait
 * en trois exemplaires — un par spec du quiz — chacun annoncé « dupliqué et assumé »,
 * et les trois avaient déjà divergé sur le contrat lu. Le fichier d'aide est inscrit
 * au tripwire de `src/configuration-typescript.spec.ts` (L-034) dans ce même diff.
 */
const QUESTIONS_SOURCE = lireQuizSource();

/**
 * Les `<fieldset>` à radios de la leçon mesurée, dans l'ordre du document
 * (2026-08-20 : c'était `q1..q4` en dur, calibré sur la fixture témoin ; la
 * leçon 01 en publie SEPT et son `associer` est la troisième question).
 *
 * ⚠️ LE TRI PASSE PAR `mecaniqueDeSaisie`, PAS PAR `type !== 'associer'` (correctif
 * du 2026-08-20). La comparaison négative rangeait TOUT type inconnu parmi les
 * groupes de radios : un cinquième type ajouté au pipeline aurait fait échouer ce
 * fichier sur un timeout Playwright opaque — « le locator n'a rien trouvé » — au
 * lieu de nommer la cause. La liste blanche REFUSE l'inconnu en le nommant.
 */
const FIELDSETS_A_RADIOS = QUESTIONS_SOURCE.filter(
  (question) => mecaniqueDeSaisie(question) === 'radios',
).map((question) => `#quiz-${question.id}`);

/** Les questions `associer` de la leçon mesurée, avec leur nombre de lignes. */
const ASSOCIERS = QUESTIONS_SOURCE.filter(
  (question) => mecaniqueDeSaisie(question) === 'selects',
).map((question) => ({
  fieldset: `#quiz-${question.id}`,
  lignes: (question.paires ?? []).length,
}));

/** Le nombre de questions déclaré par la source — le compte que la correction doit rendre. */
const QUESTIONS_ATTENDUES = QUESTIONS_SOURCE.length;

/** Le crochet propre à ce fichier, en plus de ceux de la sonde partagée. */
interface FenetreSondeeQuiz extends FenetreSondeeCsp {
  /** Posé par le seul script que la CSP doit refuser (contrôle positif). */
  __drjstScriptInterditAExecute?: boolean;
}

/**
 * ACTIONNE réellement TOUTES les questions de la leçon mesurée, puis corrige — et
 * constate le verdict.
 *
 * Aucune commande de haut niveau qui court-circuiterait le navigateur : `.check()`
 * émet un vrai clic, `selectOption` un vrai `change`. Les valeurs choisies ne sont
 * pas les bonnes réponses et n'ont pas à l'être : ce qu'on mesure est la CSP
 * pendant les gestes, pas le barème (couvert par `quiz.spec.ts`).
 */
async function actionnerTousLesTypesEtCorriger(page: Page): Promise<void> {
  // Toutes les mécaniques à radios — `choix-multiple`, `vrai-faux`,
  // `trouver-la-faille`. On coche le premier membre de chaque groupe : c'est un clic
  // réel sur un `<input>` visible, pas un `dispatchEvent`.
  for (const fieldset of FIELDSETS_A_RADIOS) {
    const premier = page.locator(`${fieldset} input[type="radio"]`).first();
    await premier.check();
    await expect(premier, `${fieldset} : la coche n’a pas pris`).toBeChecked();
  }

  // Les `<select>` de chaque `associer`, un par ligne de gauche. L'option d'index 0
  // est « Choisir… » (de valeur vide) : on prend la suivante, donc une vraie
  // association. Le nombre de lignes vient de `quiz.json` (2026-08-20 : « trois » en
  // dur auparavant, calibré sur la fixture témoin ; la leçon 01 en a quatre).
  for (const associer of ASSOCIERS) {
    const champs = page.locator(`${associer.fieldset} select`);
    await expect(
      champs,
      `${associer.fieldset} : le DOM ne rend pas les ${associer.lignes} lignes que « quiz.json » déclare`,
    ).toHaveCount(associer.lignes);
    for (let n = 0; n < associer.lignes; n++) {
      const champ = champs.nth(n);
      await champ.selectOption({ index: 1 });
      await expect(champ, `associer, ligne ${n + 1} : le choix n’a pas pris`).not.toHaveValue('');
    }
  }

  await page.getByRole('button', { name: 'Corriger mes réponses' }).click();

  // LA TRACE VISIBLE, sans laquelle tout ce fichier serait vert sur une page morte.
  // Un chunk refusé, un composant non hydraté ou un écouteur jamais branché ne
  // peuvent produire ni un verdict par question, ni le résumé. Le compte attendu
  // vient de `quiz.json`, pas du DOM : c'est le croisement qui fait l'assertion.
  await expect(
    page.locator('.quiz .verdict'),
    'la correction n’a produit aucun verdict : la page n’a pas été ACTIONNÉE, le « zéro violation » ne porterait sur rien',
  ).toHaveCount(QUESTIONS_ATTENDUES);
  await expect(page.getByRole('status')).toContainText(
    `sur ${QUESTIONS_ATTENDUES} questions corrigées`,
  );
}

test('actionner toutes les questions du quiz ne déclenche AUCUNE violation de CSP', async ({
  page,
}) => {
  // Installée AVANT la navigation : le chargement du document, celui du chunk
  // paresseux et l'hydratation sont donc tous sous surveillance, pas seulement les
  // gestes qui suivent.
  const journal = await surveiller(page);

  const reponse = await page.goto(CHEMIN_LECON);

  // AVANT toute autre assertion, et sur la réponse de CETTE page : sans cette
  // ligne, tout ce qui suit resterait vert sur un serveur qui n'applique AUCUNE
  // politique (voir le point (a) de l'en-tête).
  const politique = exigerCspServie(reponse);
  console.log(`CSP servie sur ${CHEMIN_LECON} — ${politique.length} caractères.`);

  // Le HTML prerendu porte bien le quiz : on mesure la page annoncée, pas une
  // coquille vide servie en repli.
  await expect(
    page.locator('.quiz fieldset.question'),
    `la page servie ne porte pas les ${QUESTIONS_ATTENDUES} questions que « quiz.json » déclare — le rendu en a perdu ou inventé une`,
  ).toHaveCount(QUESTIONS_ATTENDUES);

  await attendreHydratation(page, 'le chunk paresseux de la leçon a-t-il été refusé par `script-src` ?');
  await actionnerTousLesTypesEtCorriger(page);

  // LA mesure de S-005, relue DANS la page à cet instant — donc après tout ce que
  // ce document a pu émettre (voir la note sur la course dans `surveiller`).
  const violations = await lireViolations(page, journal);
  expect(
    violations,
    `la CSP a refusé une ressource pendant l’actionnement du quiz — relire config/staticwebapp.config.source.json et tools/deploiement/generer-config-swa.mjs (S-005). Journal : ${violations.join(' · ')}`,
  ).toEqual([]);

  // Le même constat par l'autre bout : ce que la console a écrit. Redondant tant
  // que tout va bien, et c'est voulu — si une version de Chromium cessait d'émettre
  // l'événement, ce filet resterait.
  expect(
    journal.messages.filter((message) => MOTIFS_CSP.test(message)),
    'la console porte un refus qui ressemble à une violation de CSP',
  ).toEqual([]);

  // Aucune exception non rattrapée : `eval` refusé par la CSP se manifeste ainsi,
  // et une panne de la sonde elle-même remonte ici (voir `surveiller`).
  expect(
    journal.erreurs,
    'exception(s) non rattrapée(s) pendant l’actionnement du quiz',
  ).toEqual([]);

  // Le seul tri de ce fichier, et il est NOMMÉ : zéro message de niveau `error`,
  // ce qui couvre aussi les ressources absentes (« Failed to load resource… 404 »)
  // — la police, le SVG Mermaid, la feuille de coloration — qu'aucun autre gate ne
  // verrait sur cette page. Les niveaux `warning`/`info` ne sont pas exigés vides :
  // l'émulateur SWA en émet qui ne disent rien du site. Ils restent capturés dans
  // `journal.messages`, donc soumis au filtre CSP ci-dessus.
  expect(
    journal.messages.filter((message) => message.startsWith('[error]')),
    'erreur(s) de console pendant l’actionnement du quiz',
  ).toEqual([]);
});

test('CONTRÔLE POSITIF — sur la page de leçon HYDRATÉE, un script inline non haché est refusé et les deux détecteurs le voient', async ({
  page,
}) => {
  // POURQUOI CE TEST EXISTE ALORS QUE `bascule-theme.spec.ts` EN PORTE DÉJÀ UN.
  // Celui d'accueil prouve que `script-src` est appliqué sur « / », au chargement,
  // sur un document prerendu inerte. Deux choses le séparent de ce qui est mesuré
  // ici : le DOCUMENT (une autre route, servie par une autre entrée de
  // `staticwebapp.config.json` si quelqu'un en ajoutait une) et l'INSTANT (après
  // l'exécution d'un chunk paresseux et d'une hydratation, c'est-à-dire dans la
  // fenêtre exacte où le test précédent conclut « zéro »). Un contrôle positif qui
  // ne mord pas au même endroit ni au même moment que l'assertion qu'il garde ne
  // garde rien.
  //
  // LA VIOLATION EST VRAIE, PAS SIMULÉE. Le script est créé et inséré PAR LA PAGE :
  // c'est un nœud du document comme un autre, soumis à `script-src`. Rien n'est
  // falsifié — si la politique servie autorisait l'inline, ce test rougirait, ce
  // qui est précisément le but.
  const journal = await surveiller(page);

  const reponse = await page.goto(CHEMIN_LECON);
  const politique = exigerCspServie(reponse);
  expect(politique, 'la CSP servie ne restreint pas `script-src`').toContain('script-src');

  await attendreHydratation(page, 'le chunk paresseux de la leçon a-t-il été refusé par `script-src` ?');

  // Rien de refusé AVANT l'injection : la ligne suivante distingue « la sonde a vu
  // ma violation » de « la sonde avait déjà quelque chose dans son journal ».
  expect(
    await lireViolations(page, journal),
    'la page de leçon hydratée porte déjà une violation avant toute injection — le contrôle positif ci-dessous ne prouverait plus rien de propre',
  ).toEqual([]);

  await page.evaluate(() => {
    const script = document.createElement('script');
    // Charge utile inoffensive et OBSERVABLE : si elle s'exécute, le marqueur
    // existe. La seconde moitié du contrôle est là — on n'exige pas seulement que
    // la violation soit RAPPORTÉE, mais que le script ait été réellement EMPÊCHÉ.
    script.textContent = 'window.__drjstScriptInterditAExecute = true;';
    document.head.append(script);
  });

  const violations = await lireViolations(page, journal);

  // 1. LE DÉTECTEUR PRÉCIS a compté la violation, et c'est BIEN celle-ci : Chromium
  //    rapporte `script-src-elem` avec `blockedURI` à `inline`. Exiger la directive
  //    évite qu'une violation d'une tout autre origine fasse passer ce contrôle
  //    pour concluant.
  expect(
    violations.filter((detail) => detail.startsWith('script-src') && detail.includes('inline')),
    'la CSP n’a PAS refusé un script inline non haché sur la page de leçon hydratée, ou la sonde ne l’a pas vu — dans les deux cas le « zéro violation » du test précédent ne prouve rien',
  ).not.toEqual([]);

  // 2. LE FILET LARGE a écrit quelque chose lui aussi. Les deux détecteurs sont
  //    redondants par construction ; ce contrôle vérifie que la redondance existe
  //    encore, au lieu de deux détecteurs muets qui se couvrent l'un l'autre.
  expect(
    journal.messages.filter((message) => MOTIFS_CSP.test(message)),
    'la console ne porte aucun refus alors que la CSP vient d’en produire un : `MOTIFS_CSP` ne reconnaît plus la formulation de ce Chromium',
  ).not.toEqual([]);

  // 3. LE REFUS A EU LIEU. Une CSP en `report-only`, ou un `script-src` ouvert,
  //    rapporterait sans bloquer : le marqueur existerait.
  const aExecute = await page.evaluate(
    () => (window as FenetreSondeeQuiz).__drjstScriptInterditAExecute === true,
  );
  expect(
    aExecute,
    'le script inline non haché s’est EXÉCUTÉ sur la page de leçon : la politique servie est rapportée mais pas appliquée',
  ).toBe(false);

  // 4. ET LA PAGE RESTE ACTIONNABLE. Le refus porte sur l'intrus, pas sur le site :
  //    sans cette ligne, une politique qui casserait aussi le quiz passerait ce
  //    contrôle positif avec les honneurs.
  await actionnerTousLesTypesEtCorriger(page);
});
