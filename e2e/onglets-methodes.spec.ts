// =============================================================================
// Les onglets `:::: methodes` — les QUATRE états du lecteur, mesurés en navigateur
// -----------------------------------------------------------------------------
// CE QUE CE FICHIER FERME, ET POURQUOI RIEN D'AUTRE NE POUVAIT LE FAIRE.
// Le conteneur d'onglets est livré depuis le lot 6 et entièrement mesuré en jsdom
// (`src/app/features/cours/lecon/rendu-blocs/rendu-blocs.spec.ts`) : la STRUCTURE
// rendue y est épinglée — l'unicité du `name`, l'unique `checked`, un `<label>` par
// volet, un `<div class="panneau">` par volet. Mais jsdom n'applique aucune feuille
// de style et ne connaît ni `@media print` ni `forced-colors`. Tout le mécanisme
// des onglets étant en CSS PUR (décision D-C : zéro JavaScript), jsdom mesurait
// donc exactement la moitié qui ne décide de rien.
//
// 🔴 ET AUCUN GATE DU DÉPÔT NE MESURAIT L'AUTRE MOITIÉ. Jusqu'au lot 10, aucune
// leçon publiée n'employait le conteneur : G-axe et G-e2e n'avaient VU aucun
// onglet, et leur vert prouvait la non-régression, jamais le rendu. « Cocher un
// onglet montre son panneau » — le comportement entier de la fonctionnalité —
// n'était mesuré nulle part. Depuis le lot 10, `01-fondamentaux` porte le premier
// conteneur du dépôt ; ce fichier est ce que cette publication a rendu possible.
//
// LES QUATRE ÉTATS SONT UN CRITÈRE D'ACCEPTATION DU CONTRAT, PAS UNE NOTE
// D'INTENTION (`docs/design/refonte-lecons-actionnables.md`, D-C) :
//   1. SANS JAVASCRIPT — entièrement fonctionnel. C'est le seul mécanisme
//      interactif du site qui n'a PAS besoin de JS, et c'est la raison d'être du
//      choix « radios + `:checked ~` » contre un composant à état.
//   2. PENDANT LA FENÊTRE DE PRÉ-HYDRATATION — l'état posé par le DOM natif
//      survit. Il n'y a AUCUNE liaison Angular sur ces radios, donc aucune
//      détection de changements ne devrait le réécrire (L-033 par la négative).
//   3. À L'IMPRESSION — tous les volets, chacun sous son libellé, dans l'ordre du
//      document : un widget de sélection sur une feuille A4 promet une interaction
//      que le papier n'a pas.
//   4. EN `forced-colors: active` — l'onglet actif se signale par un canal NON
//      CHROMATIQUE. `rendu-blocs.scss` l'AFFIRME dans un commentaire (« la teinte
//      tombe en contraste forcé, l'épaisseur non ») ; ce fichier rend cette
//      affirmation MESURÉE au lieu d'écrite.
//
// 🔴 LA DEUXIÈME SOURCE, CELLE QUE LE DOM NE PEUT PAS FABRIQUER (S-014). Aucun
// compte n'est écrit à la main ici : le nombre de volets, leurs libellés et LEQUEL
// porte `defaut` sont lus dans le `lecon.md` de l'AUTEUR. L'assertion est l'égalité
// des deux sources. Un test qui compterait les onglets dans le DOM puis vérifierait
// qu'il y en a ce nombre-là prouverait sa propre entrée. ⚠️ Le contrat admet 2 OU 3
// volets : rien ici n'épingle « deux ».
//
// ⚠️ CE QUE CE FICHIER NE PROUVE PAS, DIT FRANCHEMENT.
//   • Il mesure des RÈGLES RETENUES PAR LE MOTEUR et des PIXELS PEINTS — les deux,
//     depuis le bloc de capture en fin de fichier (L-025 : un `getComputedStyle`
//     juste n'a jamais prouvé un pixel). Ce qu'il ne dit toujours pas, c'est qu'un
//     ŒIL HUMAIN distingue les deux onglets : « peint plus épais » n'est pas
//     « perçu comme actif », et aucun gate ne peut trancher ça.
//   • Rien ici ne dit quoi que ce soit de la politique de routage de production :
//     `npx swa start` n'implémente pas `trailingSlash` (incident L-032, couvert EN
//     LIGNE seulement, par `deploy.yml`).
//   • L'état 2 n'a PAS de contrôle positif comportemental, et c'est structurel :
//     le contrôle du spec du quiz est « un clic émis dans la fenêtre est perdu »,
//     or ici il n'y a aucun écouteur à perdre — c'est précisément ce qu'on mesure.
//     Restent les deux contrôles structurels, dits à leur place.
// =============================================================================

import { Locator, Page, expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

import { attendreHydratation } from './aides/hydratation';
import { LECON_AVEC_ONGLETS, ROUTE_LECON_ONGLETS, exigerUneLeconAvecOnglets } from './aides/artefact-mesure';
import { fichierSourceDeLaLecon } from './aides/lecon-source';
import { ouvrirFenetreDePreHydratation } from './aides/pre-hydratation';

exigerUneLeconAvecOnglets('les quatre états des onglets de méthode');

/** La page de leçon portant des onglets réellement présente dans l'artéfact. */
const CHEMIN_LECON = ROUTE_LECON_ONGLETS;

/** Un volet tel que l'AUTEUR l'a déclaré — la source que le DOM ne fabrique pas. */
interface VoletDeclare {
  readonly libelle: string;
  readonly defaut: boolean;
}

/**
 * Les volets du PREMIER `:::: methodes` du `lecon.md` de la leçon mesurée.
 *
 * ⚠️ ON LIT LA SOURCE D'AUTEUR, PAS LE JSON COMPILÉ. Le contrat compilé est produit
 * par le même pipeline que le HTML servi : les opposer ferait comparer une sortie à
 * elle-même. Le Markdown est la seule source en amont des DEUX.
 *
 * Rend un tableau vide plutôt que de lever quand la leçon n'a pas de conteneur :
 * `exigerUneLeconAvecOnglets` a déjà décidé plus haut, et une levée au chargement
 * du module masquerait son saut.
 *
 * ⚠️ C'EST UN BALAYAGE LIGNE À LIGNE, PAS UN ANALYSEUR — et la limite est nommée
 * plutôt que corrigée. Un `::: methode {…}` CITÉ dans un bloc clôturé à l'intérieur
 * d'un volet serait compté ; ce module enseigne le contenu-as-code, donc le cas
 * n'est pas théorique. Ce qui le rend tolérable est le SENS de l'échec : un volet
 * de trop fait rougir `toHaveCount`, jamais passer un test vide. Les deux autres
 * trous sont fermés en amont — un `::::` imbriqué refermerait le conteneur et le
 * build échouerait d'abord, et le compilateur impose déjà 2 ou 3 volets, un seul
 * `defaut`, des libellés non vides et non homonymes.
 */
function voletsDeclares(): readonly VoletDeclare[] {
  const source = fichierSourceDeLaLecon(LECON_AVEC_ONGLETS?.slug ?? '', 'lecon.md');
  if (source === undefined) return [];

  const lignes = readFileSync(source, 'utf8').split(/\r?\n/);
  const debut = lignes.findIndex((ligne) => /^::::\s+methodes\s*$/.test(ligne));
  if (debut === -1) return [];
  const longueur = lignes.slice(debut + 1).findIndex((ligne) => /^::::\s*$/.test(ligne));
  if (longueur === -1) return [];

  return lignes
    .slice(debut + 1, debut + 1 + longueur)
    .map((ligne) => /^:::\s+methode\s*\{(?<attributs>.*)\}\s*$/.exec(ligne)?.groups?.['attributs'])
    .filter((attributs): attributs is string => attributs !== undefined)
    .map((attributs) => ({
      libelle: /libelle="(?<valeur>[^"]*)"/.exec(attributs)?.groups?.['valeur'] ?? '',
      // Marqueur SANS valeur : `defaut` est un mot isolé dans le bloc d'attributs.
      //
      // ⚠️ ON CHERCHE LE MOT HORS DES VALEURS ENTRE GUILLEMETS (constat de revue).
      // Sur le bloc brut, un libellé parfaitement légitime — « La méthode par
      // defaut » — marquerait son volet, et le test-filet exigeant EXACTEMENT un
      // `defaut` rougirait sur un contenu sain : une prémisse de test fausse sur un
      // produit sain (L-035). Les chaînes sont donc neutralisées d'abord.
      defaut: /(?:^|\s)defaut(?:\s|$)/.test(attributs.replace(/"[^"]*"/g, ' ')),
    }));
}

const VOLETS = voletsDeclares();

/**
 * L'index du volet que l'auteur a marqué `defaut` — celui qui doit être à l'écran
 * au chargement. `verifierMethodes` (compilateur) impose qu'il y en ait EXACTEMENT
 * un ; on le relit ici plutôt que de supposer que c'est le premier, parce que rien
 * dans la grammaire n'oblige l'auteur à le placer en tête.
 */
const INDEX_DEFAUT = VOLETS.findIndex((volet) => volet.defaut);

/** Un autre volet que celui par défaut — la cible du geste de bascule. */
const INDEX_AUTRE = VOLETS.findIndex((volet) => !volet.defaut);

/**
 * Le filet du garde-fou (L-019) : sans lui, une lecture de source qui échouerait
 * rendrait un tableau vide, et TOUS les tests d'en dessous passeraient verts en
 * n'ayant mesuré aucun onglet.
 */
test('la source d’auteur déclare bien un conteneur d’onglets exploitable', () => {
  expect(
    VOLETS.length,
    `aucun volet lu dans le « :::: methodes » de « ${LECON_AVEC_ONGLETS?.slug ?? '?'} » : la ` +
      `lecture de la source d'auteur a échoué, et tout ce qui suit mesurerait le vide`,
  ).toBeGreaterThanOrEqual(2);
  expect(
    VOLETS.length,
    'le contrat borne un « :::: methodes » à trois volets',
  ).toBeLessThanOrEqual(3);
  expect(
    VOLETS.filter((volet) => volet.defaut),
    'la source ne déclare pas EXACTEMENT un volet « defaut » — le compilateur le refuse, ' +
      'donc lire autre chose ici signale une lecture fautive plutôt qu’un contenu fautif',
  ).toHaveLength(1);
  expect(INDEX_AUTRE, 'aucun volet non-défaut : il n’y aurait rien à basculer').toBeGreaterThanOrEqual(0);
});

/** Les quatre familles d'éléments du premier conteneur de la page. */
function conteneur(page: Page): {
  readonly onglets: Locator;
  readonly libelles: Locator;
  readonly panneaux: Locator;
  readonly nomsDePanneau: Locator;
} {
  // `.first()` : le contrat n'interdit pas deux conteneurs sur une même page, et
  // `nth-of-type` de la feuille se résout par conteneur. On en mesure UN, nommément.
  // Les `methodes` imbriqués sont bannis au contrat, donc ces descendants sont bien
  // les siens et ceux d'aucun autre.
  const racine = page.locator('fieldset.methodes').first();
  return {
    onglets: racine.locator('input.onglet'),
    libelles: racine.locator('label.onglet-nom'),
    panneaux: racine.locator('div.panneau'),
    nomsDePanneau: racine.locator('p.panneau-nom'),
  };
}

/**
 * Le croisement des deux sources : le DOM servi porte exactement les volets que
 * l'auteur a déclarés, dans le même ordre, et un seul est coché.
 */
async function exigerLaStructureDeclaree(page: Page): Promise<void> {
  const { onglets, libelles, panneaux } = conteneur(page);
  await expect(
    onglets,
    `le HTML servi ne porte pas les ${VOLETS.length} onglets que « lecon.md » déclare`,
  ).toHaveCount(VOLETS.length);
  await expect(panneaux).toHaveCount(VOLETS.length);
  await expect(
    libelles,
    'les libellés servis ne sont pas ceux de l’auteur, ou pas dans l’ordre du document',
  ).toHaveText(VOLETS.map((volet) => volet.libelle));
  await expect(
    onglets.nth(INDEX_DEFAUT),
    'le volet marqué « defaut » par l’auteur n’est pas celui qui est coché à l’arrivée',
  ).toBeChecked();
}

/**
 * Le volet `attendu` est à l'écran, et AUCUN autre — sur TOUS les volets déclarés.
 *
 * ⚠️ Nommer les deux index (`INDEX_DEFAUT`, `INDEX_AUTRE`) suffisait tant que la
 * leçon mesurée porte deux volets, mais l'en-tête de ce fichier promet que rien
 * n'épingle « deux » : le contrat en admet trois, et la feuille porte bien une règle
 * `:nth-of-type(3)`. Avec un troisième volet, elle n'aurait été mesurée que par le
 * test d'impression. On balaie donc l'ensemble déclaré par l'auteur.
 */
async function exigerUnSeulPanneauAffiche(page: Page, attendu: number): Promise<void> {
  const { panneaux } = conteneur(page);
  for (const [index, volet] of VOLETS.entries()) {
    if (index === attendu) {
      await expect(
        panneaux.nth(index),
        `le panneau du volet « ${volet.libelle} » n’est pas à l’écran alors que son onglet est coché`,
      ).toBeVisible();
    } else {
      await expect(
        panneaux.nth(index),
        `le panneau du volet « ${volet.libelle} » est à l’écran en même temps qu’un autre : les ` +
          `volets s’empilent au lieu de se remplacer`,
      ).toBeHidden();
    }
  }
}

// -----------------------------------------------------------------------------
// ÉTAT 1 — SANS JAVASCRIPT
// -----------------------------------------------------------------------------

test('sans JavaScript, cocher un onglet montre son panneau et masque l’autre', async ({ browser }, info) => {
  // 🔴 UN CONTEXTE À PART, ET C'EST LA MESURE ELLE-MÊME. `javaScriptEnabled: false`
  // ne se règle qu'à la création du contexte : la page n'est alors JAMAIS hydratée,
  // et ce qui reste à l'écran est le HTML prerendu seul. Si le mécanisme dépendait
  // d'un écouteur, d'un `[checked]` lié ou d'un composant, il serait mort ici.
  const baseURL = info.project.use.baseURL;
  expect(baseURL, 'aucune baseURL au projet : le contexte neuf ne saurait pas où naviguer').toBeTruthy();
  const contexte = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await contexte.newPage();

  try {
    await page.goto(CHEMIN_LECON);
    await exigerLaStructureDeclaree(page);

    const { onglets, libelles } = conteneur(page);

    // Contrôle positif : la page n'est pas hydratée, donc les attributs `ngh` du
    // HTML déshydraté sont TOUJOURS là. Sans ce constat, un contexte dont le
    // drapeau aurait été ignoré rendrait ce test vert en mesurant une page vivante.
    await expect(
      page.locator('[ngh]'),
      'plus aucun attribut `ngh` : la page a été hydratée, donc JavaScript tournait — ' +
        'ce test ne mesure alors PAS ce qu’il prétend mesurer',
    ).not.toHaveCount(0);

    // L'état d'arrivée : un panneau, et un seul. On balaie TOUS les volets, jamais
    // les deux seuls index nommés — l'en-tête promet que rien n'épingle « deux », et
    // avec trois volets la règle `:nth-of-type(3)` de la feuille ne serait mesurée
    // par personne (constat de revue).
    await exigerUnSeulPanneauAffiche(page, INDEX_DEFAUT);

    // LE GESTE DU VISITEUR : un clic sur le `<label>`, exactement ce qu'un lecteur
    // fait. C'est l'agent utilisateur qui coche la radio associée ; personne n'écoute.
    await libelles.nth(INDEX_AUTRE).click();

    // 🔴 LE CŒUR DU LOT : les visibilités s'inversent, sans une ligne de JavaScript.
    await expect(onglets.nth(INDEX_AUTRE)).toBeChecked();
    await exigerUnSeulPanneauAffiche(page, INDEX_AUTRE);
  } finally {
    await contexte.close();
  }
});

// -----------------------------------------------------------------------------
// ÉTAT 2 — PENDANT LA FENÊTRE DE PRÉ-HYDRATATION
// -----------------------------------------------------------------------------

test('un onglet coché PENDANT la fenêtre de pré-hydratation reste coché après l’hydratation', async ({
  page,
}) => {
  const fenetre = await ouvrirFenetreDePreHydratation(page, CHEMIN_LECON, exigerLaStructureDeclaree);

  const { onglets, libelles, panneaux } = conteneur(page);

  // Contrôle positif STRUCTUREL n°1 : le HTML prerendu n'est pas encore hydraté.
  // (Le n°2 vit dans l'aide : elle exige qu'un `.js` ait RÉELLEMENT été retenu.)
  await expect(
    page.locator('[ngh]'),
    'aucun attribut `ngh` : la page était déjà hydratée, la fenêtre n’a jamais été ouverte',
  ).not.toHaveCount(0);

  await libelles.nth(INDEX_AUTRE).click();
  await expect(onglets.nth(INDEX_AUTRE)).toBeChecked();
  await expect(
    panneaux.nth(INDEX_AUTRE),
    'le CSS ne bascule pas pendant la fenêtre : le mécanisme dépendrait donc de quelque chose que la page n’a pas encore',
  ).toBeVisible();

  fenetre.relacher();
  await attendreHydratation(page);

  // 🔴 CE QUE MESURE CE TEST : l'hydratation n'a RIEN réécrit. Le quiz avait besoin
  // d'un amorçage explicite depuis le DOM (L-033) parce que son `[checked]` est
  // LIÉ ; ici il n'y a aucune liaison, donc la première détection de changements
  // ne doit toucher ni la coche ni le panneau. Le jour où quelqu'un ajouterait une
  // liaison sur ces radios « pour faire propre », ce test rougirait.
  await expect(
    onglets.nth(INDEX_AUTRE),
    'la coche posée pendant la fenêtre a été effacée par l’hydratation (L-033) : une liaison Angular est apparue sur ces radios',
  ).toBeChecked();
  await exigerUnSeulPanneauAffiche(page, INDEX_AUTRE);
});

// -----------------------------------------------------------------------------
// ÉTAT 3 — À L'IMPRESSION
// -----------------------------------------------------------------------------

test('à l’impression, TOUS les volets sont là, chacun sous son libellé, dans l’ordre du document', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await exigerLaStructureDeclaree(page);

  const { onglets, libelles, panneaux, nomsDePanneau } = conteneur(page);

  // Témoin négatif : à l'écran, un seul panneau. Sans lui, une feuille `print` qui
  // ne s'appliquerait jamais serait indiscernable d'une page qui montre déjà tout.
  await expect(panneaux.nth(INDEX_AUTRE)).toBeHidden();

  // 🔴 ET LE SECOND TÉMOIN D'ÉCRAN, QUI MESURE UNE PROMESSE D'ACCESSIBILITÉ. Le
  // `<p class="panneau-nom">` est retiré du flux À L'ÉCRAN parce que le `<label>` de
  // l'onglet dit déjà le libellé, et l'entendre deux fois serait un doublon au
  // lecteur d'écran. C'est aussi ce qui rend la mesure d'impression signifiante :
  // sans ce constat, « il est visible sur le papier » ne distinguerait pas une
  // feuille `print` appliquée d'un nom qui n'a jamais été masqué.
  await expect(
    nomsDePanneau.first(),
    'le nom de panneau est visible À L’ÉCRAN : le lecteur d’écran entend le libellé deux fois, ' +
      'une fois par le `<label>` de l’onglet et une fois par le titre du volet',
  ).toBeHidden();

  await page.emulateMedia({ media: 'print' });

  for (const [index, volet] of VOLETS.entries()) {
    await expect(
      panneaux.nth(index),
      `le volet « ${volet.libelle} » manque à l’impression : le papier n’a pas d’onglets, donc ce contenu serait PERDU`,
    ).toBeVisible();

    // 🔴 `toBeVisible`, ET PAS SEULEMENT LE `toHaveText` D'EN DESSOUS — constat de
    // revue, 2026-09-09. `toHaveText` lit `textContent`, que le DOM rend AUSSI pour
    // un élément en `display: none` : l'égalité des libellés est donc déjà vraie à
    // l'écran, avant toute émulation. Elle mesure l'ORDRE et l'ORTHOGRAPHE, jamais
    // la révélation. Or c'est `.panneau-nom { display: block }` dans le
    // `@media print` qui porte la moitié « chacun sous son libellé » du critère
    // d'acceptation — retirer cette seule ligne laissait ce test VERT.
    await expect(
      nomsDePanneau.nth(index),
      `le volet « ${volet.libelle} » est imprimé SANS SON TITRE : sur le papier, les volets se ` +
        `suivent sans que rien ne dise quelle méthode on lit`,
    ).toBeVisible();
  }

  // Chacun SOUS SON LIBELLÉ : les titres portent bien les libellés de l'auteur, dans
  // l'ordre du document. Cette assertion-ci complète la précédente — elle nomme, la
  // précédente révèle ; aucune des deux ne suffit seule.
  await expect(
    nomsDePanneau,
    'les volets imprimés ne sont pas titrés, ou pas dans l’ordre du document : le lecteur ne sait plus quelle méthode il lit',
  ).toHaveText(VOLETS.map((volet) => volet.libelle));

  // Et le widget de sélection disparaît : promettre une interaction sur une feuille
  // A4 est le défaut que cette moitié de la règle existe pour éviter.
  await expect(onglets.nth(INDEX_DEFAUT), 'une radio est imprimée sur le papier').toBeHidden();
  await expect(libelles.nth(INDEX_DEFAUT), 'un onglet est imprimé sur le papier').toBeHidden();
});

// -----------------------------------------------------------------------------
// ÉTAT 4 — EN `forced-colors: active`
// -----------------------------------------------------------------------------

test('en contraste forcé, l’onglet actif se signale encore par l’ÉPAISSEUR de son filet', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await exigerLaStructureDeclaree(page);

  const { libelles } = conteneur(page);
  const actif = libelles.nth(INDEX_DEFAUT);
  const inactif = libelles.nth(INDEX_AUTRE);

  // La lecture des valeurs de référence suit un état ÉTABLI par une assertion
  // auto-réessayée (`exigerLaStructureDeclaree`) et ne suit AUCUN geste : il n'y a
  // donc pas de frame en attente à manquer (L-057). Ce qui est lu ici ne sert
  // ensuite que d'attendu à des assertions de locator, elles auto-réessayées.
  const filet = async (cible: Locator): Promise<{ largeur: string; couleur: string }> =>
    cible.evaluate((element) => {
      const calcule = getComputedStyle(element);
      return {
        largeur: calcule.borderBottomWidth,
        couleur: calcule.borderBottomColor,
      };
    });

  const actifNormal = await filet(actif);
  const inactifNormal = await filet(inactif);

  // Prémisse : en mode normal, les DEUX canaux distinguent déjà l'onglet actif.
  // Sans elle, la mesure d'en dessous ne dirait rien — deux filets identiques
  // resteraient identiques en contraste forcé, et le test serait vert et vide.
  expect(
    actifNormal.largeur,
    'l’onglet actif et l’inactif ont le même filet en mode normal : le canal d’épaisseur n’existe pas, ' +
      'et le commentaire de « rendu-blocs.scss » promet plus que la feuille n’applique',
  ).not.toBe(inactifNormal.largeur);
  expect(actifNormal.couleur).not.toBe(inactifNormal.couleur);

  await page.emulateMedia({ forcedColors: 'active' });

  // 🔴 MOITIÉ 1 — LA TEINTE TOMBE, et c'est le contrôle positif de l'émulation.
  // Sans lui, un drapeau ignoré rendrait la moitié 2 vraie pour la mauvaise raison.
  await expect(
    actif,
    'la couleur du filet actif n’a pas bougé en contraste forcé : l’émulation `forcedColors` ne s’applique pas, ' +
      'donc la moitié qui suit ne mesure PAS ce qu’elle prétend',
  ).not.toHaveCSS('border-bottom-color', actifNormal.couleur);

  // 🔴 MOITIÉ 2 — L'ÉPAISSEUR, ELLE, SURVIT. C'est l'affirmation écrite dans
  // `rendu-blocs.scss` (« L'ONGLET ACTIF — DEUX CANAUX, DONT UN D'ÉPAISSEUR »),
  // rendue mesurée. ⚠️ C'est une preuve DE LA RÈGLE RETENUE PAR LE MOTEUR, pas d'un
  // pixel peint (L-025) : le pixel, lui, est mesuré par « EN PIXELS — le filet de
  // l'onglet actif est PEINT plus épais… », en fin de fichier.
  await expect(
    actif,
    'le filet de l’onglet actif a changé d’épaisseur en contraste forcé : le second canal, ' +
      'celui qui devait survivre à la chute des teintes, ne survit pas',
  ).toHaveCSS('border-bottom-width', actifNormal.largeur);
  await expect(
    inactif,
    'le filet de l’onglet inactif a changé d’épaisseur en contraste forcé',
  ).toHaveCSS('border-bottom-width', inactifNormal.largeur);
});
// -----------------------------------------------------------------------------
// ÉTAT 4, SECONDE MOITIÉ — LA CAPTURE : des PIXELS, plus des règles
// -----------------------------------------------------------------------------
// 🔴 POURQUOI CE QUI PRÉCÈDE NE SUFFISAIT PAS (L-025). Le test ci-dessus lit un
// `getComputedStyle` : il prouve que le moteur RETIENT un filet de 3 px sous
// l'onglet actif contre 1 px sous l'autre. Il ne prouve pas qu'un pixel ait été
// peint. Le dépôt a déjà payé exactement cet écart — le `<hr>` d'E1-ST3 avait un
// style calculé parfaitement juste et une largeur réelle de ZÉRO, parce que la
// feuille de l'agent utilisateur lui posait `margin-inline: auto` en item de
// grille. Et c'est très précisément ce que le contrat réclamait ici : le critère
// d'acceptation de R-8 exige « une capture en HCM à la clôture ». La voici, et
// elle est MESURÉE plutôt que regardée une fois.
//
// 🔴 CE QUE LA CAPTURE A APPRIS, ET QU'AUCUNE LECTURE DE FEUILLE NE DISAIT.
// En `forced-colors: active`, le filet de l'onglet INACTIF — `solid transparent`,
// donc rien du tout à l'écran normal — devient PEINT : le moteur force sa teinte
// sur `CanvasText` comme celle de son voisin. Relevé sur la rangée d'onglets de
// `01-fondamentaux` : à l'écran normal 2 rangées peintes sous l'actif contre 0
// sous l'inactif ; en contraste forcé, 2 contre 1. ⚠️ LE CANAL D'ÉPAISSEUR SURVIT
// DONC, MAIS SA MARGE SE RÉDUIT LÀ OÙ ON COMPTAIT SUR LUI — en HCM, tous les
// onglets portent un filet, et il ne reste qu'un pixel d'écart entre l'actif et
// les autres. Ce n'est pas ce que le commentaire de `rendu-blocs.scss` laissait
// entendre, et c'est la raison pour laquelle le canal qui porte réellement R-8 est
// l'AUTRE, mesuré juste en dessous : la radio native laissée visible.
//
// ⚠️ AUCUN COMPTE DE RANGÉES N'EST ÉPINGLÉ, ET C'EST DÉLIBÉRÉ. Le nombre de
// rangées pleines dépend de l'alignement subpixel de la découpe et du rapport de
// pixels du poste (la feuille demande 3 px, la capture en compte 2). On mesure donc
// un ORDRE — l'actif est peint plus épais que l'inactif — et un plancher : il est
// peint. Un littéral « 3 » rougirait sur le premier poste en DPR 2, sans qu'aucun
// défaut existe.
// ⚠️ CE QUI STABILISE LE RELEVÉ N'EST PAS LE TEST, C'EST LE PROJET. `playwright.config.ts`
// fixe `devices['Desktop Chrome']`, donc `deviceScaleFactor: 1` : l'ordre est mesuré
// à DPR 1, et rien ici ne le tient à une autre densité. À DPR 2 la marge devrait
// s'élargir plutôt que se réduire (3 px et 1 px de CSS donnent alors 6 et 2 pixels
// d'appareil) — mais ce n'est pas mesuré, et ce commentaire ne l'affirme donc pas.
// -----------------------------------------------------------------------------

/** Ce qu'une capture dit d'une zone : sa teinte de fond, et où elle est peinte. */
interface ProfilDeCapture {
  /** La teinte majoritaire — le « fond », contre lequel tout le reste est de l'encre. */
  readonly fond: string;
  /** Les rangées peintes d'un bord à l'autre : un filet, jamais du texte. */
  readonly rangeesPleines: number;
  /** La part de la zone qui est peinte — sert de contrôle positif à l'instrument. */
  readonly encreTotale: number;
  /** La part peinte du QUART CENTRAL : le point d'une radio cochée y vit. */
  readonly encreDuNoyau: number;
}

/**
 * Le profil de pixels de la boîte d'un élément, tel que le navigateur l'a peinte.
 *
 * ⚠️ LE DÉCODAGE EST CONFIÉ AU NAVIGATEUR, sur une page `about:blank` — donc hors
 * du site et hors de sa CSP. C'est le choix déjà fait par
 * `theme-sombre-sans-flash.spec.ts` et pour les mêmes deux raisons : écrire un
 * décodeur PNG maison mettrait un algorithme non revu sur le chemin d'un gate qui
 * doit dire la vérité, et ajouter une dépendance d'image pour trois lignes
 * élargirait la surface livrée (`.claude/rules/budget-free-tier.md`).
 */
async function profilPeint(page: Page, cible: Locator): Promise<ProfilDeCapture> {
  // Sans ce défilement, `clip` sort de l'image rendue et Playwright LÈVE — il ne
  // rend pas une capture vide, ce qui serait pire.
  await cible.scrollIntoViewIfNeeded();
  const boite = await cible.boundingBox();
  expect(boite, "l'élément à capturer n'a aucune boîte : il n'est pas peint du tout").not.toBeNull();
  if (boite === null) throw new Error('inatteignable');

  const png = await page.screenshot({
    clip: { x: boite.x, y: boite.y, width: boite.width, height: boite.height },
  });

  const analyse = await page.context().browser()?.newPage();
  if (analyse === undefined) throw new Error('aucun navigateur pour décoder la capture');
  try {
    return await analyse.evaluate(async (base64: string) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();

      const toile = document.createElement('canvas');
      toile.width = image.naturalWidth;
      toile.height = image.naturalHeight;
      const contexte = toile.getContext('2d');
      if (contexte === null) throw new Error("aucun contexte 2d : l'instrument est cassé");
      contexte.drawImage(image, 0, 0);
      const { data, width, height } = contexte.getImageData(0, 0, toile.width, toile.height);
      if (width === 0 || height === 0) throw new Error('capture vide : la mesure ne vaudrait rien');

      const teinte = (x: number, y: number): string => {
        const decalage = (y * width + x) * 4;
        return `${data[decalage]},${data[decalage + 1]},${data[decalage + 2]}`;
      };

      // 🔴 LE FOND EST LE PIXEL DU COIN SUPÉRIEUR GAUCHE, ET SÛREMENT PAS LA TEINTE
      // MAJORITAIRE — la première version de cette aide prenait la majorité, et elle
      // S'EST INVERSÉE sur la radio cochée : dans une boîte de 13 × 13 occupée par un
      // anneau plein et son point, c'est l'ENCRE qui est majoritaire, si bien que le
      // point peint se comparait à lui-même et se mesurait « vide » à 0,00. Un
      // instrument qui se calibre sur ce qu'il mesure mesure zéro (cousin de S-014).
      // Le coin, lui, est hors du disque d'une radio comme hors du filet d'un onglet :
      // il vaut `--couleur-fond` à l'écran normal et `Canvas` en contraste forcé.
      const fond = teinte(0, 0);

      // « Pleine » à 90 % et non à 100 % : les extrémités d'un filet et
      // l'antialiasing des bords n'en font pas un filet absent.
      let rangeesPleines = 0;
      let encre = 0;
      for (let y = 0; y < height; y += 1) {
        let peints = 0;
        for (let x = 0; x < width; x += 1) if (teinte(x, y) !== fond) peints += 1;
        encre += peints;
        if (peints >= width * 0.9) rangeesPleines += 1;
      }

      // Le quart central. Une radio cochée y peint son point ; une radio vide y
      // laisse le fond, son anneau restant sur le pourtour.
      const xDebut = Math.floor(width * 0.375);
      const xFin = Math.max(xDebut + 1, Math.ceil(width * 0.625));
      const yDebut = Math.floor(height * 0.375);
      const yFin = Math.max(yDebut + 1, Math.ceil(height * 0.625));
      let noyau = 0;
      let noyauTotal = 0;
      for (let y = yDebut; y < yFin; y += 1) {
        for (let x = xDebut; x < xFin; x += 1) {
          noyauTotal += 1;
          if (teinte(x, y) !== fond) noyau += 1;
        }
      }

      // LE GARDE-FOU DU PIXEL DE RÉFÉRENCE, et il protège TOUS les appelants. Si le
      // coin était tombé SUR de l'encre, toutes les parts mesurées ci-dessus
      // s'inverseraient sans échouer — et le signe en est qu'à peu près tout
      // « diffère du fond ». Ce cas-là est refusé en se nommant.
      //
      // ⚠️ LE SEUIL EST À SENS UNIQUE, ET C'EST LA MOITIÉ QUI COMPTE. Une capture
      // PRESQUE VIDE n'est pas un défaut d'instrument : c'est un élément qui ne peint
      // rien — très exactement la régression que les appelants cherchent. La refuser
      // ici volerait à leur assertion son message, qui nomme R-8 ; on la laisse donc
      // passer, et c'est l'appelant qui se prononce.
      const encreTotale = encre / (width * height);
      if (encreTotale > 0.98) {
        throw new Error(
          `capture quasi entièrement « encrée » (${encreTotale.toFixed(2)}) : le pixel de référence du coin ` +
            `est tombé sur de l'encre, donc fond et encre sont échangés et la mesure s'inverserait en silence`,
        );
      }

      return { fond, rangeesPleines, encreTotale, encreDuNoyau: noyau / noyauTotal };
    }, png.toString('base64'));
  } finally {
    await analyse.close();
  }
}

test('EN PIXELS — en contraste forcé, la radio cochée PEINT son point, et le point SUIT la sélection', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await exigerLaStructureDeclaree(page);

  const { onglets, libelles } = conteneur(page);

  // 🔴 C'EST ICI QUE R-8 SE GAGNE, ET `rendu-blocs.scss` LE DIT DÉJÀ : « la radio
  // reste visible, c'est le canal NON CHROMATIQUE de R-8 ». Le point d'une radio
  // cochée est peint par l'AGENT UTILISATEUR, pas par notre feuille — c'est
  // pourquoi il survit à la réécriture des teintes. Cette affirmation était écrite
  // et non mesurée ; la voici en pixels.
  //
  // 🔴 LE RELEVÉ D'AVANT L'ÉMULATION EST UN CONTRÔLE POSITIF, PAS UNE COMMODITÉ.
  // Les deux autres tests de contraste forcé de ce fichier en portent un ; celui-ci
  // — le seul qui porte réellement le critère R-8 — n'en avait pas (constat de
  // revue, 2026-09-09). ⚠️ La revue le croyait vert en cas d'émulation ignorée ;
  // MESURÉ, c'est faux : en thème sombre l'agent utilisateur peint aussi
  // l'intérieur d'une radio VIDE (noyau relevé à 1,00), si bien qu'un
  // `forcedColors` sans effet ferait tomber l'assertion « le noyau de la vide est à
  // 0,00 ». Le test était donc déjà protégé — mais PAR ACCIDENT, par la façon dont
  // Chromium peint une radio sur fond sombre, que rien de ce dépôt ne contrôle. Le
  // relevé ci-dessous rend la protection EXPLICITE et cesse d'en dépendre.
  const avantEmulation = await profilPeint(page, onglets.nth(INDEX_DEFAUT));

  await page.emulateMedia({ forcedColors: 'active' });

  const cochee = await profilPeint(page, onglets.nth(INDEX_DEFAUT));
  const vide = await profilPeint(page, onglets.nth(INDEX_AUTRE));

  expect(
    cochee.fond,
    `le fond de la capture n'a pas changé (${cochee.fond}) : l'émulation « forcedColors » ne ` +
      `s'applique pas, et TOUT ce test mesure l'écran normal en le nommant « contraste forcé »`,
  ).not.toBe(avantEmulation.fond);

  // CONTRÔLE POSITIF DE L'INSTRUMENT (L-010) : avant de conclure « ce noyau est
  // vide », il faut que la capture porte de l'encre. L'anneau des DEUX radios est
  // peint, cochée ou non — donc une capture vide se prononce AVANT l'assertion du
  // noyau, qui serait sinon vraie pour la mauvaise raison.
  //
  // ⚠️ DEUX LECTURES, ET LE MESSAGE DOIT LES NOMMER TOUTES LES DEUX — mesuré par
  // mutation le 2026-09-09. Un `appearance: none` posé sur `.onglet` « pour faire
  // propre » fait tomber cette assertion : ce n'est alors PAS l'instrument qui a
  // manqué sa cible, c'est la radio qui ne peint plus rien, et le canal non
  // chromatique de R-8 a disparu. Un message qui n'accuserait que l'instrument
  // enverrait le lecteur déboguer le test au lieu de la feuille.
  const riendepeint = (part: number): string =>
    `la capture de cette radio ne porte presque aucune encre (${part.toFixed(2)}). Deux causes, à ` +
      `départager dans cet ordre : (1) la radio ne peint PLUS RIEN — un « appearance: none » ou un ` +
      `masquage posé sur « .onglet » a supprimé le point natif, et le canal non chromatique de R-8 est ` +
      `mort ; (2) la découpe est tombée à côté de l'élément. Dans les deux cas l'assertion du noyau ` +
      `ci-dessous serait vraie pour la mauvaise raison.`;
  expect(vide.encreTotale, riendepeint(vide.encreTotale)).toBeGreaterThan(0.2);
  expect(cochee.encreTotale, riendepeint(cochee.encreTotale)).toBeGreaterThan(0.2);

  expect(
    cochee.encreDuNoyau,
    `en contraste forcé, le point de la radio COCHÉE n'est pas peint (${cochee.encreDuNoyau.toFixed(2)}) : ` +
      `l'onglet actif n'a alors plus AUCUNE signature non chromatique, et R-8 tombe`,
  ).toBeGreaterThan(0.9);
  expect(
    vide.encreDuNoyau,
    `en contraste forcé, la radio NON cochée peint elle aussi son noyau (${vide.encreDuNoyau.toFixed(2)}) : ` +
      `les deux onglets sont alors indiscernables, ce qui est le mode d'échec exact de R-8`,
  ).toBeLessThan(0.1);

  // 🔴 ET LE POINT SUIT LA SÉLECTION. Sans ce second relevé, un rendu où le
  // premier onglet serait peint en dur — et le mécanisme mort — passerait les
  // assertions ci-dessus. On bascule, et on exige que l'encre ait DÉMÉNAGÉ.
  await libelles.nth(INDEX_AUTRE).click();
  await expect(onglets.nth(INDEX_AUTRE)).toBeChecked();

  const apresBascule = await profilPeint(page, onglets.nth(INDEX_AUTRE));
  const abandonnee = await profilPeint(page, onglets.nth(INDEX_DEFAUT));

  // Le même contrôle d'instrument que plus haut, et il manquait ici (constat de
  // revue) : `apresBascule` s'auto-garde par son « > 0.9 », mais `abandonnee`
  // conclut « ce noyau est vide » — une découpe qui aurait raté sa cible après le
  // clic (défilement, décalage de mise en page) la rendrait vraie sans rien mesurer.
  expect(abandonnee.encreTotale, riendepeint(abandonnee.encreTotale)).toBeGreaterThan(0.2);

  expect(
    apresBascule.encreDuNoyau,
    "après la bascule, le point n'est pas peint sur l'onglet choisi : la signature non chromatique ne suit pas la sélection",
  ).toBeGreaterThan(0.9);
  expect(
    abandonnee.encreDuNoyau,
    "après la bascule, l'onglet abandonné garde son point peint : deux onglets se déclarent actifs en contraste forcé",
  ).toBeLessThan(0.1);
});

test('EN PIXELS — le filet de l’onglet actif est PEINT plus épais que celui de l’inactif, avant ET après la chute des teintes', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await exigerLaStructureDeclaree(page);

  const { libelles } = conteneur(page);

  // À L'ÉCRAN NORMAL D'ABORD : c'est la prémisse, et c'est aussi la seule preuve
  // du dépôt qu'un filet d'onglet existe en PIXELS et pas seulement en règle CSS.
  const actifNormal = await profilPeint(page, libelles.nth(INDEX_DEFAUT));
  const inactifNormal = await profilPeint(page, libelles.nth(INDEX_AUTRE));

  expect(
    actifNormal.rangeesPleines,
    "aucune rangée peinte d'un bord à l'autre sous l'onglet actif : le filet est dans la feuille et pas à l'écran (L-025)",
  ).toBeGreaterThanOrEqual(1);
  expect(
    actifNormal.rangeesPleines,
    "le filet de l'onglet actif n'est pas peint plus épais que celui de l'inactif à l'écran normal",
  ).toBeGreaterThan(inactifNormal.rangeesPleines);

  await page.emulateMedia({ forcedColors: 'active' });

  const actifForce = await profilPeint(page, libelles.nth(INDEX_DEFAUT));
  const inactifForce = await profilPeint(page, libelles.nth(INDEX_AUTRE));

  // 🔴 LE CANAL D'ÉPAISSEUR SURVIT — mais sa marge se réduit, parce que le filet
  // transparent de l'inactif devient peint lui aussi (voir l'en-tête de ce bloc).
  // C'est pour cela qu'on mesure un ORDRE et non une distance : exiger « deux fois
  // plus épais » serait une promesse que la feuille ne tient pas en HCM.
  expect(
    actifForce.rangeesPleines,
    "en contraste forcé, plus aucune rangée peinte sous l'onglet actif : le second canal a disparu avec les teintes",
  ).toBeGreaterThanOrEqual(1);
  expect(
    actifForce.rangeesPleines,
    `en contraste forcé, le filet de l'onglet actif (${actifForce.rangeesPleines} rangée(s)) n'est plus plus épais ` +
      `que celui de l'inactif (${inactifForce.rangeesPleines}) : les deux onglets portent le même trait, ` +
      `et le canal d'épaisseur de R-8 ne distingue plus rien`,
  ).toBeGreaterThan(inactifForce.rangeesPleines);

  // CONTRÔLE POSITIF DE L'ÉMULATION : le fond a changé de teinte. Sans lui, un
  // drapeau `forcedColors` ignoré rendrait les deux relevés ci-dessus identiques
  // à ceux de l'écran normal, et ce test mesurerait deux fois la même chose.
  expect(
    actifForce.fond,
    "le fond de la capture n'a pas changé en contraste forcé : l'émulation ne s'applique pas, " +
      'et les deux relevés ci-dessus sont ceux de l’écran normal',
  ).not.toBe(actifNormal.fond);
});
