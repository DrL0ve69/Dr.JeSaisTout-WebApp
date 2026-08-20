// =============================================================================
// L-033 — la fenêtre de pré-hydratation, MESURÉE au lieu d'être raisonnée
// -----------------------------------------------------------------------------
// CE QUE CE FICHIER FERME, ET POURQUOI RIEN D'AUTRE NE POUVAIT LE FAIRE.
// La page de leçon est prerendue puis hydratée par un CHUNK PARESSEUX, et
// `withNoIncrementalHydration()` est actif (`src/app/app.config.ts`) : le rejeu
// d'événements est PERDU. Entre la peinture du HTML prerendu et le branchement du
// `(change)`, la radio se coche réellement — c'est le navigateur qui le fait, le
// composant ne voit rien — puis la première détection de changements réévalue
// `[checked]` à `false` et RÉÉCRIT la coche. Aucune erreur console, aucun test
// rouge : la coche apparaît et disparaît.
//
// `Quiz` amorce donc son état DEPUIS le DOM (`ngOnInit`, gardé par
// `isPlatformBrowser`, avec `afterNextRender` en second filet). Mais l'en-tête de
// `quiz.ts` le dit lui-même, et c'est la dette que ce fichier paie : « le mécanisme
// est RAISONNÉ, PAS MESURÉ ». `quiz.spec.ts` prouve que `amorcerDepuisLeDom()` lit
// le bon état QUAND ON L'APPELLE ; il ne prouve rien de l'ORDONNANCEMENT, le
// `TestBed` n'ayant pas de DOM prerendu avant son premier rendu. C'est le motif
// L-032 : vert sur un comportement que l'instrument n'implémente pas.
//
// 🔴 ON NE TESTE PAS UNE COURSE — ON ÉLARGIT LA FENÊTRE.
// « Cliquer assez vite » serait instable et ne prouverait rien. On INTERCEPTE le
// chargement du chunk paresseux de la leçon et on le RETIENT : tant qu'il ne
// répond pas, le routeur ne peut pas activer la route, donc `Quiz` n'est jamais
// instancié — le HTML prerendu reste seul à l'écran, aussi longtemps qu'on veut.
// On agit dedans, puis on relâche.
//
// QUEL CHUNK, ET COMMENT ON LE DÉSIGNE SANS ÉCRIRE UN HACHAGE. Le document servi
// référence lui-même ses scripts (`main-…`, et les `modulepreload` de la coquille
// ET du composant `lecon`). Le SEUL `.js` que la page demande sans l'avoir annoncé
// est le chunk de DONNÉES de la leçon — celui que `resoudre-lecon` charge par un
// `import()` dynamique. La règle est donc : tout `.js` absent du document servi est
// retenu. Elle survit à un rehachage, à un renommage, à un découpage différent —
// contrairement à un `chunk-EEPZ63KW.js` écrit en dur, qui rendrait ce fichier
// vert et vide au prochain build (mode d'échec L-019).
//
// 🔴 LE CONTRÔLE POSITIF, SANS LEQUEL UN VERT NE VOUDRAIT RIEN DIRE (L-019).
// Un test qui coche puis constate que la coche est là prouverait la même chose si
// la fenêtre n'était jamais ouverte — il aurait simplement cliqué APRÈS
// l'hydratation. Deux contrôles indépendants attestent donc que la fenêtre est
// réellement ouverte au moment où l'on agit :
//   • COMPORTEMENTAL, et c'est le décisif : un clic sur « Corriger mes réponses »
//     émis PENDANT la fenêtre est PERDU. Le composant n'écoute pas encore, et le
//     rejeu d'événements est désactivé — donc aucun verdict n'apparaît, même une
//     fois l'hydratation terminée. Si le composant avait déjà été branché, la page
//     serait corrigée et l'assertion rougirait.
//   • STRUCTUREL, en second : les attributs `ngh` qu'Angular pose sur le HTML
//     prerendu sont ENCORE là pendant la fenêtre, et disparaissent à l'hydratation.
//     Marqueur interne au framework, donc gardé comme second témoin seulement — et
//     employé comme point de SYNCHRONISATION (voir `attendreHydratation`) : s'il
//     changeait de nom, l'attente expirerait et le fichier rougirait bruyamment,
//     jamais ne passerait vert en silence.
//
// ⚠️ CE QUI EST PROUVÉ N'EST PAS « LA COCHE EST ENCORE À L'ÉCRAN ». Une coche
// survivante pourrait n'être qu'un DOM qu'Angular n'a pas retouché. Ce qui compte
// est que le COMPOSANT l'ait lue : chaque test finit donc par une correction, et
// lit le VERDICT — « juste » sur la question cochée, la réponse du visiteur citée
// mot pour mot dans la correction de l'`associer`. C'est le test à deux mains.
//
// ⚠️ CE QUE CE FICHIER NE PROUVE PAS. `npx swa start` n'implémente pas
// `trailingSlash` : rien ici ne dit quoi que ce soit de la politique de routage de
// production (incident L-032, couvert EN LIGNE seulement, par `deploy.yml`).
// =============================================================================

import { Page, expect, test } from '@playwright/test';

import { attendreHydratation } from './aides/hydratation';
import { ROUTE_LECON_QUIZ, exigerUneLeconAvecQuiz } from './aides/artefact-mesure';
import { citationDeReponse, lireQuizSource } from './aides/quiz-source';

exigerUneLeconAvecQuiz('la fenêtre de pré-hydratation (L-033)');

/**
 * La page de leçon INTERACTIVE réellement présente dans l'artéfact sous mesure.
 *
 * ⚠️ PLUS AUCUN LITTÉRAL DE ROUTE (2026-08-20, clôture d'E3-ST1). Ce fichier visait
 * `/cours/securite-web/lecon-temoin/`, la fixture que `ci.yml` compilait tant que
 * `content/` était vide. Le harnais de fixture est retiré : la route vient
 * désormais de l'artéfact, et publier la leçon 02 n'obligera pas à toucher ce
 * fichier. Voir l'en-tête de `e2e/aides/artefact-mesure.ts`.
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
 * La PREMIÈRE question `choix-multiple` de la leçon mesurée, et l'id de sa bonne
 * réponse — tous deux lus dans `quiz.json` (2026-08-20 ; c'était `#quiz-q1` / « b »
 * en dur, calibré sur la fixture témoin). Le `value` de chaque radio est l'id du
 * choix : viser la bonne réponse ne demande rien d'autre.
 */
const QUESTION_RADIO = (() => {
  const question = QUESTIONS_SOURCE.find((candidate) => candidate.type === 'choix-multiple');
  if (question === undefined) return undefined;
  const bonneReponse = question.bonneReponse;
  if (typeof bonneReponse !== 'string' || bonneReponse === '') return undefined;
  return { fieldset: `#quiz-${question.id}`, bonneReponse } as const;
})();

/** La première question `associer` de la leçon mesurée, s'il y en a une. */
const ASSOCIER = QUESTIONS_SOURCE.find((question) => question.type === 'associer');

/**
 * La valeur qu'on choisit dans le `<select>` de la première ligne de l'`associer`.
 *
 * ⚠️ ELLE EST VOLONTAIREMENT FAUSSE, et elle est DÉRIVÉE (2026-08-20 ; c'était la
 * chaîne « le chargement paresseux d'une leçon », propre à la fixture témoin). Une
 * réponse juste se corrigerait par un simple « Association correcte », qui ne cite
 * pas ce que le visiteur a saisi — or c'est très exactement la citation qui prouve
 * que le composant a LU le `<select>`, et non qu'il a deviné. On prend donc la
 * première `droite` déclarée qui n'est PAS celle de la première ligne : les options
 * rendues sont les `droite` dédoublonnées, dans l'ordre de leur première apparition.
 */
const REPONSE_SELECT = ASSOCIER?.paires?.map((paire) => paire.droite).find(
  (droite) => droite !== ASSOCIER?.paires?.[0]?.droite,
);

/**
 * Ce que la correction doit alors afficher.
 *
 * 🔴 CE COMMENTAIRE PROMETTAIT PLUS QUE LE CODE N'APPLIQUAIT (L-008, corrigé le
 * 2026-08-20). Dix lignes expliquaient ici que la U+00A0 du gabarit était EXIGÉE
 * dans la chaîne attendue — et `toContainText` NORMALISE les blancs face à une
 * chaîne, de sorte que le jumeau de `parcours-clavier-quiz.spec.ts`, qui écrivait
 * une espace ORDINAIRE, passait tout aussi vert. Deux fichiers, deux conventions,
 * la même assertion inoffensive. `citationDeReponse` (e2e/aides/quiz-source.ts)
 * rend désormais une EXPRESSION RÉGULIÈRE, que Playwright ne normalise PAS : c'est
 * elle, et elle seule, qui mesure réellement l’insécable — pour les deux fichiers.
 */

/** Poignée sur une fenêtre de pré-hydratation ouverte. */
interface FenetreDePreHydratation {
  /** Laisse repartir le chunk retenu. Idempotent. */
  readonly relacher: () => void;
  /** Les `.js` effectivement retenus — sert au contrôle positif et au journal. */
  readonly retenus: readonly string[];
}

/**
 * Ouvre la fenêtre de pré-hydratation, PUIS navigue vers la page de leçon.
 *
 * Au retour, le HTML prerendu est à l'écran, complet et interrogeable, et rien
 * n'est hydraté. L'appelant agit, puis appelle `relacher()`.
 */
async function ouvrirFenetreDePreHydratation(page: Page): Promise<FenetreDePreHydratation> {
  // Le document servi est demandé HORS navigation, pour établir la liste de ses
  // propres scripts avant que le navigateur ne commence à les réclamer.
  const document = await page.request.get(CHEMIN_LECON);
  expect(
    document.ok(),
    `${CHEMIN_LECON} n'est pas servi alors que l'artéfact sur le disque porte cette page : le serveur sert-il un autre dist/ ?`,
  ).toBe(true);
  const html = await document.text();
  const annonces = new Set(
    [...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((occurrence) =>
      String(occurrence[1]).split('/').pop(),
    ),
  );
  expect(
    annonces.size,
    'le document servi n’annonce aucun script : la liste des « annoncés » est vide, donc TOUT serait retenu et la mesure ne vaudrait rien',
  ).toBeGreaterThan(0);

  const retenus: string[] = [];
  let relacher = (): void => {};
  const barriere = new Promise<void>((resoudre) => {
    relacher = resoudre;
  });

  await page.route('**/*.js', async (route) => {
    const nom = new URL(route.request().url()).pathname.split('/').pop();
    if (annonces.has(nom)) {
      await route.continue();
      return;
    }
    retenus.push(String(nom));
    await barriere;
    await route.continue();
  });

  await page.goto(CHEMIN_LECON);
  // Le HTML prerendu est peint : TOUS les `<fieldset>` du quiz sont là AVANT que
  // le moindre composant ne soit instancié. C'est l'état « sans JS » — et c'est
  // aussi celui, plus trompeur, de « pas encore hydraté ».
  //
  // ⚠️ LE COMPTE VIENT DE `quiz.json`, PAS DU DOM (2026-08-20 ; il valait 5 en dur,
  // calibré sur la fixture témoin — la leçon 01 en publie 8). Le croisement des deux
  // sources EST l'assertion : un DOM qui se compterait lui-même prouverait sa propre
  // entrée (S-014), et une page servie amputée d'une question passerait verte.
  await expect(
    page.locator('.quiz fieldset.question'),
    `le HTML prerendu ne porte pas les ${QUESTIONS_SOURCE.length} questions que « quiz.json » déclare`,
  ).toHaveCount(QUESTIONS_SOURCE.length);

  // Le chunk de données a bien été intercepté, et il attend. `expect.poll` plutôt
  // qu'une attente arbitraire : on attend un ÉTAT, jamais une durée.
  await expect
    .poll(
      () => retenus.length,
      { message: 'aucun `.js` retenu : la fenêtre de pré-hydratation ne s’est jamais ouverte' },
    )
    .toBeGreaterThan(0);

  return { relacher, retenus };
}

test('une coche posée PENDANT la fenêtre de pré-hydratation survit, et le composant la compte', async ({
  page,
}) => {
  // La leçon mesurée pourrait ne publier aucun `choix-multiple` : le saut se NOMME
  // plutôt que de faire rougir un produit sain (2026-08-20).
  test.skip(
    QUESTION_RADIO === undefined,
    'la leçon mesurée ne publie aucune question « choix-multiple » à bonne réponse nommée',
  );
  if (QUESTION_RADIO === undefined) return;

  const fenetre = await ouvrirFenetreDePreHydratation(page);

  // Contrôle positif STRUCTUREL : le HTML prerendu n'est pas encore hydraté.
  await expect(
    page.locator('[ngh]'),
    'aucun attribut `ngh` : la page était déjà hydratée, la fenêtre n’a jamais été ouverte',
  ).not.toHaveCount(0);

  // LE GESTE DU VISITEUR : une vraie coche, par le navigateur, sur un DOM que
  // personne n'écoute. `.check()` de Playwright émet un vrai clic — aucun
  // `dispatchEvent` fabriqué, qui court-circuiterait précisément ce qu'on mesure.
  const bonneReponse = page.locator(
    `${QUESTION_RADIO.fieldset} input[type="radio"][value="${QUESTION_RADIO.bonneReponse}"]`,
  );
  await bonneReponse.check();
  await expect(bonneReponse).toBeChecked();

  // Contrôle positif COMPORTEMENTAL, et c'est le décisif : ce clic-ci doit être
  // PERDU. Le `(click)` n'est pas branché, et le rejeu d'événements est désactivé.
  await page.getByRole('button', { name: 'Corriger mes réponses' }).click();

  fenetre.relacher();
  await attendreHydratation(page);

  // Le clic émis pendant la fenêtre n'a rien déclenché : assertion posée sur un
  // état STABILISÉ (hydratation terminée), pas sur un « rien ne s'est passé »
  // constaté trop tôt. Si le composant avait été branché au moment du clic, la
  // page serait corrigée ici.
  await expect(
    page.locator('.verdict'),
    'la page est corrigée : le clic « Corriger » a été traité, donc le composant écoutait DÉJÀ — la fenêtre n’était pas ouverte',
  ).toHaveCount(0);

  // 🔴 L-033, moitié visible : la coche a SURVÉCU à la première détection de
  // changements. Sans l'amorçage, `[checked]` l'aurait réécrite à `false`.
  await expect(
    bonneReponse,
    'la coche posée pendant la fenêtre a été effacée par l’hydratation (L-033)',
  ).toBeChecked();

  // 🔴 L-033, moitié qui compte : le COMPOSANT l'a lue. Une coche encore à l'écran
  // pourrait n'être qu'un DOM non retouché ; un score ne peut pas mentir.
  await page.getByRole('button', { name: 'Corriger mes réponses' }).click();
  await expect(page.locator(`${QUESTION_RADIO.fieldset} .verdict`)).toHaveAttribute(
    'data-verdict',
    'juste',
  );
  await expect(
    page.getByRole('status'),
    'le résumé ne compte pas la réponse saisie pendant la fenêtre : le DOM a survécu, l’état du composant non',
  ).toContainText('1 bonne réponse');
});

test('un `<select>` d’associer rempli PENDANT la fenêtre garde sa valeur, et le composant la relit', async ({
  page,
}) => {
  // Idem : la leçon mesurée pourrait ne publier aucun `associer`, ou n'y proposer
  // qu'une seule réponse distincte — dans les deux cas il n'y a pas de réponse
  // FAUSSE à choisir, donc rien à prouver ici (2026-08-20).
  test.skip(
    ASSOCIER === undefined || REPONSE_SELECT === undefined,
    'la leçon mesurée ne publie aucune question « associer » offrant une réponse fausse à choisir',
  );
  if (ASSOCIER === undefined || REPONSE_SELECT === undefined) return;

  const fenetre = await ouvrirFenetreDePreHydratation(page);

  const premierChamp = page.locator(`#quiz-${ASSOCIER.id} select[data-champ]`).first();

  // 🔴 LE PIÈGE JUMEAU, MESURÉ ICI PLUTÔT QUE SUPPOSÉ. Un `<select>` avale
  // silencieusement une valeur dont l'`<option>` n'existe pas encore : l'affectation
  // est ignorée et le champ retombe sur son premier choix. Le risque était que le
  // `[value]` du gabarit s'écrive avant que le `@for` d'options n'ait produit les
  // siennes. Constat : le HTML PRERENDU porte déjà les quatre options — « Choisir… »
  // plus les trois `droite` — donc la valeur a bien où atterrir. C'est ce que cette
  // assertion épingle : le jour où les options cesseraient d'être prerendues, le
  // piège se rouvrirait, et il rougirait ICI plutôt que de se manifester par une
  // réponse perdue chez un visiteur.
  //
  // ⚠️ LE COMPTE VIENT DE `quiz.json` (2026-08-20 ; il valait 4 en dur, calibré sur
  // les trois lignes de la fixture témoin). Le gabarit rend « Choisir… » plus les
  // `droite` DÉDOUBLONNÉES : la leçon 01 a quatre paires pour trois réponses
  // distinctes, donc quatre options elles aussi — c'est le dédoublonnage qui est
  // épinglé ici, pas un nombre de lignes.
  const optionsAttendues =
    new Set((ASSOCIER.paires ?? []).map((paire) => paire.droite)).size + 1;
  await expect(
    premierChamp.locator('option'),
    `les \`<option>\` ne sont pas dans le HTML prerendu, ou ne sont pas les ${optionsAttendues} attendues : une valeur posée avant l’hydratation serait avalée en silence`,
  ).toHaveCount(optionsAttendues);

  await premierChamp.selectOption(REPONSE_SELECT);
  await expect(premierChamp).toHaveValue(REPONSE_SELECT);

  fenetre.relacher();
  await attendreHydratation(page);

  // Moitié visible : le champ n'est pas retombé sur « Choisir… ».
  await expect(
    premierChamp,
    'le `<select>` est retombé sur « Choisir… » à l’hydratation — c’est le cas le PLUS exposé de L-033, sans aucun repère visuel pour le visiteur',
  ).toHaveValue(REPONSE_SELECT);

  // Moitié qui compte : la correction CITE la réponse du visiteur. Un « Association
  // incorrecte » seul ne prouverait rien — une ligne sans réponse est elle aussi
  // incorrecte. C'est la citation qui prouve la lecture.
  await page.getByRole('button', { name: 'Corriger mes réponses' }).click();
  await expect(
    page.locator(`#quiz-${ASSOCIER.id} .ligne-corrigee`).first(),
    'la correction ne cite pas la valeur choisie pendant la fenêtre : le composant ne l’a jamais lue',
  ).toContainText(citationDeReponse(REPONSE_SELECT));
});
