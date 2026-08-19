// =============================================================================
// Sommaire du cours — état vide, masquage des brouillons, et la chaîne complète
// Quiz → ProgressionService → Sommaire (E2-ST6, lot E)
// -----------------------------------------------------------------------------
// CE QUE CE FICHIER MESURE, ET QUE RIEN D'AUTRE NE VOIT. Les specs unitaires du
// lot A/B tiennent chacun un maillon : `progression.spec.ts` sait écrire et relire
// `localStorage`, `sommaire.spec.ts` sait dériver un badge d'un état donné,
// `quiz.spec.ts` sait qu'un quiz corrigé appelle `enregistrerQuiz`. Aucun ne
// traverse la chaîne : deux composants montés sur DEUX ROUTES DIFFÉRENTES, qui ne
// se parlent que par `core/progression/` et par le stockage du navigateur. C'est
// exactement la frontière que la règle d'architecture d'E6 protège (« aucune
// feature n'importe une autre feature ») — et une frontière ne se prouve qu'en la
// franchissant pour de vrai, dans un vrai navigateur, sous la CSP servie.
//
// 🔴 LE FICHIER TOURNE SUR LES DEUX ARTÉFACTS, ET IL MESURE DES CHOSES DIFFÉRENTES.
// Le dépôt bâtit deux artéfacts distincts (décision E-2 d'E2-ST3, en-tête de
// `e2e/aides/artefact-mesure.ts`) : `deploy.yml` depuis la racine de PRODUCTION,
// où `content/` est vide jusqu'à E3-ST1, et `ci.yml` depuis la FIXTURE TÉMOIN, qui
// porte deux leçons. Le sommaire est la première page du site à être RÉELLEMENT
// SIGNIFICATIVE des deux côtés — vide ici, peuplé là — donc ce fichier ne choisit
// pas un artéfact : il mesure l'état vide quand il n'y a rien, et le masquage plus
// la progression quand il y a quelque chose. Chaque moitié se saute nommément sur
// l'autre artéfact, jamais en silence.
//
// 🔴 ET LE MASQUAGE DU BROUILLON SE VÉRIFIE AU DISQUE, JAMAIS PAR UNE 404.
// C'est l'exigence explicite du plan v2, et la raison est structurelle : une 404
// sur `/cours/securite-web/lecon-brouillon/` serait rendue à l'identique par TROIS
// situations dont deux sont des pannes — (1) le brouillon est bien exclu du
// prerender, ce qu'on veut prouver ; (2) on tourne sur l'artéfact de production,
// où AUCUNE leçon n'existe, donc le test serait vert sans rien avoir mesuré ;
// (3) le serveur est cassé. Un test qui accepte une 404 comme preuve est vert dans
// les trois cas. On interroge donc le système de fichiers, et on l'accompagne d'un
// CONTRÔLE POSITIF sur le même chemin de base : si `lecon-temoin/index.html` n'est
// pas trouvée là où on la cherche, c'est le sondage qui est faux, pas le produit
// (mode d'échec L-035 — une prémisse de test fausse rougit sur un produit sain, et
// sa jumelle silencieuse : un chemin mal orthographié rend l'absence triviale).
//
// ⚠️ SÉLECTEURS PAR RÔLE ET PAR NOM ACCESSIBLE, pas par classe CSS. La bascule
// visuelle E6 va réécrire les feuilles de style de fond en comble ; elle ne doit
// pas réécrire ce fichier. Les seules exceptions sont les `#quiz-qN` (identifiants
// de document, pas de style — ils viennent de `PREFIXE_ID_QUESTION`) et le filtre
// `a[href^=…]`, qui porte sur la cible d'un lien, pas sur son habillage.
// =============================================================================

import { existsSync } from 'node:fs';

import { Page, expect, test } from '@playwright/test';

import { LECON_TEMOIN_PRERENDUE, exigerLaPageDeLecon } from './aides/artefact-mesure';
import { attendreHydratation } from './aides/hydratation';

/** La route du sommaire — la seule route de cours du site, et elle existe dans les DEUX artéfacts. */
const CHEMIN_SOMMAIRE = '/cours/securite-web/';

/** La leçon-témoin de la fixture, en `statut: publiee`. */
const CHEMIN_LECON_TEMOIN = '/cours/securite-web/lecon-temoin/';

/**
 * La racine, SUR LE DISQUE, des pages de leçon prerendues de ce sujet. Les deux
 * sondages ci-dessous en dérivent — c'est ce qui rend le contrôle positif capable
 * d'attraper une faute de frappe qui rendrait le contrôle négatif trivialement vrai.
 */
const RACINE_COURS_PRERENDUE = 'dist/dr-je-sais-tout/browser/cours/securite-web';

/** Le document prerendu d'une leçon de ce sujet, tel que `swa start` le servirait. */
function documentPrerendu(slug: string): string {
  return `${RACINE_COURS_PRERENDUE}/${slug}/index.html`;
}

/** Les titres exacts des deux leçons de la fixture témoin (frontmatter `titre`). */
const TITRE_TEMOIN = 'Leçon-témoin grasse — tout le contrat du pipeline dans un fichier';
const TITRE_BROUILLON = 'Leçon-témoin brouillon — celle que le sommaire ne doit pas montrer';

/** Les sections des deux leçons de la fixture — le brouillon est SEUL dans la sienne. */
const SECTION_DU_BROUILLON = 'Approfondissements';

/** Les libellés de badge de `Sommaire` (`LIBELLES_ETAT`), écrits ici tels qu'un visiteur les lit. */
const BADGE_A_COMMENCER = 'À commencer';
const BADGE_MAITRISE = 'Maîtrisé';

/**
 * Les cinq bonnes réponses du quiz de la leçon-témoin, relevées dans
 * `tools/content-pipeline/__fixtures__/temoin/…/01-lecon-temoin/quiz.json`.
 *
 * Le seuil de maîtrise est de 80 % (`SEUIL_REUSSITE`) : 4 sur 5 suffiraient. On
 * répond juste PARTOUT quand même, pour que ce test ne devienne pas rouge le jour
 * où le seuil bouge — ce fichier mesure la chaîne, pas l'arithmétique du seuil,
 * qui a son test unitaire.
 */
const ASSOCIATIONS_ATTENDUES: Readonly<Record<string, string>> = {
  'manifeste-routes.json': 'la liste des routes à prerendre',
  'carte-lecons.ts': "le chargement paresseux d'une leçon",
  '_coloration-syntaxique-generee.scss': 'les couleurs des blocs de code',
};

/** Le module du sommaire qui porte la leçon-témoin, avec son badge et ses métadonnées. */
function moduleTemoin(page: Page) {
  return page
    .getByRole('main')
    .locator('li')
    .filter({ has: page.getByRole('link', { name: TITRE_TEMOIN }) });
}

// -----------------------------------------------------------------------------
// (a) L'artéfact de PRODUCTION — le sommaire dit honnêtement qu'il est vide
// -----------------------------------------------------------------------------
test.describe("sommaire de l'artéfact de production", () => {
  // Le symétrique d'`exigerLaPageDeLecon` : ici c'est l'ABSENCE de page de leçon
  // qui est la prémisse. Sur la fixture, le sommaire porte un module et l'état
  // vide n'a plus de sujet — le saut se nomme plutôt que de rougir à tort.
  test.beforeEach(() => {
    test.skip(
      LECON_TEMOIN_PRERENDUE,
      "l'artéfact mesuré porte une page de leçon : c'est la FIXTURE, l'état vide du sommaire n'y a pas de sujet",
    );
  });

  test("le sommaire existe, se nomme, et annonce qu'aucun module n'est publié", async ({ page }) => {
    await page.goto(CHEMIN_SOMMAIRE);

    // La page a bien un titre de premier niveau : c'est l'adaptateur de route qui
    // l'écrit (littéral de gabarit), pas une donnée de route qu'on peut oublier.
    await expect(page.getByRole('heading', { level: 1, name: 'Sécurité des applications web' })).toBeVisible();

    // L'aveu, en toutes lettres. Une page de sommaire qui se rendrait VIDE — sans
    // liste et sans phrase — serait indiscernable d'une page cassée : c'est le
    // mode d'échec « page vide en silence » que tout le moteur de contenu combat.
    await expect(page.getByText('Modules en préparation.')).toBeVisible();

    // Et rien qui ressemble à un module : aucun lien de leçon, aucun badge.
    await expect(page.getByRole('main').locator('a[href^="/cours/securite-web/"]')).toHaveCount(0);
  });
});

// -----------------------------------------------------------------------------
// (b) et (c) — l'artéfact de FIXTURE, le seul où il y a quelque chose à masquer
// -----------------------------------------------------------------------------
test.describe('sommaire peuplé — masquage du brouillon et progression', () => {
  exigerLaPageDeLecon(
    'le sommaire peuplé du cours (1 module listé sur 2, et la chaîne quiz → progression → badge)',
  );

  test("liste la leçon publiée et masque le brouillon — partout, y compris au prerender", async ({
    page,
  }) => {
    // ---- 1. Le brouillon n'a PAS DE PAGE, et c'est le disque qui le dit --------
    //
    // Contrôle positif d'abord : sans lui, une faute de frappe dans
    // `RACINE_COURS_PRERENDUE` rendrait l'assertion suivante vraie pour rien.
    expect(
      existsSync(documentPrerendu('lecon-temoin')),
      `le sondage disque regarde au mauvais endroit — ${documentPrerendu('lecon-temoin')} introuvable ` +
        `alors que l'artéfact mesuré est celui de la fixture (contrôle positif du test)`,
    ).toBe(true);

    expect(
      existsSync(documentPrerendu('lecon-brouillon')),
      `la leçon en « statut: brouillon » a été PRERENDUE : ${documentPrerendu('lecon-brouillon')} existe. ` +
        `Le sélecteur « leconsPubliees » (D-1 d'E2-ST6) doit filtrer le manifeste de prerender ` +
        `autant que le sommaire — sinon un brouillon est public et indexable.`,
    ).toBe(false);

    // ---- 2. Le sommaire, lui aussi, n'en montre qu'une -------------------------
    await page.goto(CHEMIN_SOMMAIRE);

    await expect(page.getByRole('link', { name: TITRE_TEMOIN })).toBeVisible();
    await expect(page.getByRole('link', { name: TITRE_BROUILLON })).toHaveCount(0);

    // Le compte, et non seulement la présence : « la publiée est là » n'exclut pas
    // « et une autre aussi ». Un seul lien de leçon dans tout le `<main>`.
    await expect(page.getByRole('main').locator('a[href^="/cours/securite-web/"]')).toHaveCount(1);

    // La fixture donne au brouillon une SECTION à lui (« Approfondissements ») :
    // masquer la leçon doit faire disparaître le groupe entier, titre compris.
    // Un titre de section resté seul serait une promesse vide dans la carte de parcours.
    await expect(page.getByRole('heading', { name: SECTION_DU_BROUILLON })).toHaveCount(0);
  });

  test('quiz témoin réussi → le module passe à « Maîtrisé » sur le sommaire', async ({ page }) => {
    // ---- 1. L'état de départ, MESURÉ et non supposé ---------------------------
    //
    // Playwright donne à chaque test un contexte neuf, donc un `localStorage` vide.
    // On le constate quand même : sans ce relevé, un badge qui vaudrait « Maîtrisé »
    // dès le premier rendu rendrait tout le reste du test vert sans rien prouver
    // (L-035 — on vérifie que l'entrée produit bien la sortie exigée).
    await page.goto(CHEMIN_SOMMAIRE);
    await attendreHydratation(page, 'le sommaire lit la progression après hydratation seulement');
    await expect(moduleTemoin(page)).toContainText(BADGE_A_COMMENCER);

    // ---- 2. Le quiz de la leçon, réussi pour de vrai --------------------------
    await page.goto(CHEMIN_LECON_TEMOIN);
    await attendreHydratation(
      page,
      'le chunk paresseux de la leçon a-t-il été refusé par `script-src` ?',
    );
    await repondreJusteAuQuizTemoin(page);

    await page.getByRole('button', { name: 'Corriger mes réponses' }).click();

    // La preuve que le quiz est RÉUSSI se lit dans la région live — le texte que le
    // visiteur (et son lecteur d'écran) reçoit. C'est cet instant précis qui appelle
    // `enregistrerQuiz` ; un verdict partiel ici invaliderait tout ce qui suit.
    await expect(page.getByRole('status')).toContainText('5 bonnes réponses sur 5');

    // ---- 3. Retour au sommaire : l'autre route, l'autre composant --------------
    //
    // Navigation complète et non un retour arrière : la progression doit survivre à
    // un rechargement, sinon elle ne vaut rien pour un visiteur qui revient demain.
    await page.goto(CHEMIN_SOMMAIRE);
    await attendreHydratation(page, 'le sommaire lit la progression après hydratation seulement');

    await expect(moduleTemoin(page)).toContainText(BADGE_MAITRISE);
    await expect(moduleTemoin(page)).not.toContainText(BADGE_A_COMMENCER);
  });
});

/**
 * Répond juste aux cinq questions du quiz de la leçon-témoin.
 *
 * ⚠️ AUCUNE ÉCRITURE D'ÉTAT PAR SCRIPT. On coche et on sélectionne comme un
 * visiteur, pour que le `(change)` du gabarit coure réellement : c'est lui qui
 * alimente `Quiz.repondre()`, donc le score, donc `enregistrerQuiz`. Poser l'état
 * par `page.evaluate` rendrait le test vert avec le composant débranché.
 */
async function repondreJusteAuQuizTemoin(page: Page): Promise<void> {
  // q1 et q3 — `choix-multiple`. Récupérées par leur NOM ACCESSIBLE : le libellé
  // est ce qu'une aide technique annonce, et il change si l'auteur change le quiz
  // (auquel cas ce test doit rougir, pas cocher silencieusement la mauvaise case).
  await page
    .getByRole('radio', {
      name: 'Il fait échouer la construction en nommant le fichier et le champ.',
      exact: true,
    })
    .check();

  // q2 — `vrai-faux`. La bonne réponse est `false` : le pipeline ne démarre
  // Chromium que si un bloc `mermaid` existe.
  await page.locator('#quiz-q2').getByRole('radio', { name: 'Faux', exact: true }).check();

  await page
    .getByRole('radio', { name: 'Pour que le bundler émette un chunk par leçon.', exact: true })
    .check();

  // q4 — `trouver-la-faille`, `ligneFautive: 2`. Ciblée par la VALEUR du contrôle
  // et non par son nom accessible : celui-ci contient deux U+00A0 (« Ligne 2 »,
  // L-024) que la normalisation des noms accessibles ne garantit pas de rendre
  // comparables à un littéral. L'attribut `value` est, lui, exactement ce que le
  // composant lit dans `repondre()`.
  await page.locator('#quiz-q4 input[type="radio"][value="2"]').check();

  // q5 — `associer`. On lit la colonne de GAUCHE dans le document et on en déduit
  // la réponse, plutôt que de compter sur l'ordre des `<select>` : un pipeline qui
  // réordonnerait les paires ferait alors rougir la table ci-dessus (paire
  // inattendue) au lieu de faire échouer le quiz sur une association fausse.
  const lignes = page.locator('#quiz-q5 li');
  const nombreDeLignes = await lignes.count();
  expect(nombreDeLignes, 'la question « associer » de la fixture porte trois paires').toBe(3);

  for (let index = 0; index < nombreDeLignes; index++) {
    const ligne = lignes.nth(index);
    const gauche = (await ligne.locator('label > span').first().innerText()).trim();
    const droite = ASSOCIATIONS_ATTENDUES[gauche];

    expect(
      droite,
      `paire inattendue à gauche : « ${gauche} » — la fixture du quiz a changé, ` +
        `mettre à jour ASSOCIATIONS_ATTENDUES plutôt que de laisser le test choisir au hasard`,
    ).toBeDefined();

    await ligne.locator('select').selectOption({ label: droite });
  }
}
