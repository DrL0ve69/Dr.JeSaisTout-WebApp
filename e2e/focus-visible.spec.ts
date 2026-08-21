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
// mesurée, son compte d'arrêts épinglé, et depuis le lot C d'E2-ST4 le CONTRÔLE
// POSITIF de la mesure mutualisée (deuxième test, en bas de fichier) : la seule
// preuve du dépôt que `dansLaFenetre` sache encore répondre `false`.
// =============================================================================

import { expect, test } from '@playwright/test';

import {
  MesureFocus,
  TOLERANCE_SOUS_PIXEL,
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
 * LES HUIT, DANS L'ORDRE DU DOCUMENT : (1) lien d'évitement · (2) logotype ·
 * (3) lien « Accueil » · (4) lien « Sécurité des applications web » · (5) « Commencer
 * le module 01 » · (6) « Voir les 13 modules » · (7) « Commencer le cours » · (8) le
 * lien du pied de page.
 *
 * 📉 SEPT → HUIT le 2026-08-20 (bascule E6), MESURÉ et non déduit : le groupe de
 * radios du thème sort de l'en-tête (−1, phase 1 à thème unique, décision D-2), les
 * deux appels à l'action de la bande d'ouverture entrent (+2). Le `<summary>` du menu
 * compact n'est PAS compté : à 1280 px (`devices['Desktop Chrome']`) il est en
 * `display: none`, au-dessus du point de rupture de 840 px d'`en-tete.scss`.
 */
const ARRETS_ATTENDUS = 8;

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

// =============================================================================
// CONTRÔLE POSITIF — la mesure sait-elle encore REFUSER ? (L-019, L-034, L-036)
// -----------------------------------------------------------------------------
// LE TROU QUE CE TEST FERME, TROUVÉ EN REVUE DU LOT C D'E2-ST4. `dansLaFenetre`
// n'est lu qu'en `.toBe(true)` par ses TROIS appelants (`focus-visible.spec.ts`,
// `parcours-clavier-quiz.spec.ts`, `defileurs-clavier.spec.ts`) : rien, nulle part,
// ne prouvait qu'il sache encore répondre `false`. Un module de mesure qui a perdu
// sa capacité de refus rend tous ses appelants VERTS — et c'était le seul des quatre
// `e2e/aides/*.ts` dans ce cas (`sonde-csp.ts` exige par écrit un contrôle positif
// de ses appelants, et deux specs le portent nommément). L-034 demande « ce module
// peut-il, seul, faire passer un test vert à tort ? » : seul l'axe TYPAGE était
// gardé, par `src/configuration-typescript.spec.ts`, et c'est l'axe COMPORTEMENT
// qui vient d'être desserré par la tolérance sous-pixel.
//
// POURQUOI SUR « / » ET NON SUR LA PAGE DE LEÇON : « / » existe dans les DEUX
// artéfacts (fixture et production), ce test n'est donc jamais sauté. Le seul
// endroit du dépôt où la capacité de refus est prouvée ne doit pas dépendre d'une
// fixture qui se retire à la clôture d'E3-ST1.
//
// 🔴 ON POUSSE L'ÉLÉMENT HORS DE LA FENÊTRE EN FAISANT DÉFILER LE DOCUMENT, ET
// SÛREMENT PAS EN LUI POSANT UN STYLE — MESURÉ, PAS SUPPOSÉ. La voie « écrire
// `element.style.top` par le CSSOM » a été essayée d'abord, sur la promesse
// courante qu'une mutation du CSSOM échappe à `style-src`. ELLE EST FAUSSE ICI, et
// le constat est net : sous la CSP servie du dépôt (`style-src 'self' <hachages>`,
// sans `'unsafe-inline'`), Chromium ACCEPTE l'écriture dans le DOM — l'attribut se
// relit, `style="opacity: 0.5;"` — et REFUSE DE L'APPLIQUER : `getComputedStyle`
// rend la valeur d'origine, y compris sur `<body>`, y compris avec `!important`, et
// SANS émettre d'événement `securitypolicyviolation` ni de message de console. Un
// déplacement par style aurait donc été un no-op SILENCIEUX — c'est-à-dire un
// contrôle positif qui accuse le produit d'un défaut de son propre instrument
// (le mode d'échec du `MutationObserver` d'E1, qui rapportait son plantage comme une
// violation de CSP). ⚠️ À retenir hors de ce fichier : dans un spec de ce dépôt, on
// ne bouge RIEN par le style — ni `element.style`, ni `setProperty(…, 'important')`,
// ni un `<style>` injecté (celui-là refusé bruyamment, faute de hachage).
//
// Le défilement, lui, ne touche à aucune feuille de style, et il reproduit le vrai
// mode d'échec de 2.4.11 que l'en-tête de ce fichier nomme : « hors de la fenêtre
// après un défilement ». `prefers-reduced-motion: reduce` est actif dans le harnais,
// donc `scroll-behavior: smooth` est neutralisé et le défilement est instantané —
// la boîte est quand même RELUE avant de conclure (L-021 : on ne lit pas une valeur
// dans la microseconde qui suit le geste, on la constate).
// =============================================================================
test('CONTRÔLE POSITIF — `dansLaFenetre` sait encore répondre faux, par le haut comme par le bas', async ({
  page,
}) => {
  // LA BORNE, ÉPINGLÉE. La tolérance sous-pixel est le desserrage qui rend ce
  // contrôle nécessaire ; l'élargir au-delà du pixel (donc au-delà du reste d'un
  // arrondi au pixel entier) cesserait d'être une correction de mesure pour devenir
  // une indulgence sur 2.4.11. Cette ligne le fait rougir.
  expect(
    TOLERANCE_SOUS_PIXEL,
    'la tolérance sous-pixel de `dansLaFenetre` a dépassé 1 px : ce n’est plus le reste ' +
      'd’un arrondi au pixel entier, c’est une tolérance sur WCAG 2.4.11',
  ).toBeLessThanOrEqual(1);

  await page.goto('/');

  // La page doit être plus haute que la fenêtre, sinon il n'y a rien à faire défiler
  // et les deux volets ci-dessous seraient verts sans avoir rien déplacé.
  const marge = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  expect(
    marge,
    'la page « / » tient entièrement dans la fenêtre : ce contrôle positif n’a plus de course ' +
      'de défilement, il ne pousserait plus rien hors de l’écran',
  ).toBeGreaterThan(200);

  /** La boîte de l'élément qui a le focus MAINTENANT, relue au navigateur. */
  const boiteDuFocalise = async (): Promise<{ top: number; bottom: number; fenetre: number }> =>
    page.evaluate(() => {
      const actif = document.activeElement;
      if (!(actif instanceof HTMLElement)) {
        throw new Error('le focus a quitté la page pendant le contrôle positif');
      }
      const boite = actif.getBoundingClientRect();
      return { top: boite.top, bottom: boite.bottom, fenetre: window.innerHeight };
    });

  // ---------------------------------------------------------------------------
  // (a) PAR LE HAUT — le logotype de l'en-tête, chassé au-dessus de la fenêtre
  // ---------------------------------------------------------------------------
  // Deux Tab : le lien d'évitement, puis le logotype. Ce dernier est en flux normal
  // dans un en-tête `position: static` (mesuré), donc le défilement l'emporte
  // vraiment — le lien d'évitement, lui, est `fixed` et ne bougerait pas d'un pixel.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');

  const auDepart = await mesurerArretFocalise(page);
  expect(auDepart, 'la deuxième tabulation n’a posé le focus sur aucun focalisable de « / »').not.toBeNull();
  expect(
    auDepart?.dansLaFenetre ?? false,
    `l’arrêt de départ est déjà HORS de la fenêtre (${auDepart?.bords ?? ''}) : le contrôle ` +
      'positif ne prouverait rien, puisqu’il n’aurait rien fait basculer',
  ).toBe(true);
  console.log(`Contrôle positif — départ DANS la fenêtre : ${auDepart?.bords ?? ''}`);

  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });

  // L'INSTRUMENT D'ABORD. Sans cette attente, un défilement resté animé ferait
  // échouer l'assertion suivante avec un message qui accuse le PRODUIT.
  await expect
    .poll(async () => (await boiteDuFocalise()).bottom, {
      message:
        'le défilement n’a pas chassé l’arrêt focalisé au-dessus de la fenêtre : l’instrument ' +
        'du contrôle positif n’a rien déplacé, ce n’est pas un constat sur le produit',
    })
    .toBeLessThan(0);

  const parLeHaut = await mesurerArretFocalise(page);
  expect(parLeHaut, 'le focus a quitté la page pendant le défilement vers le bas').not.toBeNull();
  console.log(`Contrôle positif — chassé par le HAUT : ${parLeHaut?.bords ?? ''}`);
  expect(
    parLeHaut?.dansLaFenetre ?? true,
    `un focalisable entièrement AU-DESSUS de la fenêtre est encore déclaré « dans la fenêtre » ` +
      `(${parLeHaut?.bords ?? ''}) : \`dansLaFenetre\` ne refuse plus rien, et les trois specs ` +
      'qui l’exigent `true` passeraient verts sur un indicateur de focus invisible (WCAG 2.4.11)',
  ).toBe(false);

  // ---------------------------------------------------------------------------
  // (b) PAR LE BAS — le dernier arrêt de la page, laissé sous la fenêtre
  // ---------------------------------------------------------------------------
  // Le second bord, parce que les deux comparaisons sont écrites séparément dans
  // `dansLaFenetre` : l'une peut parfaitement survivre à la disparition de l'autre.
  await page.goto('/');
  for (let n = 0; n < ARRETS_ATTENDUS; n++) {
    await page.keyboard.press('Tab');
  }

  const dernier = await mesurerArretFocalise(page);
  expect(dernier, 'le dernier arrêt de « / » n’est pas un focalisable mesurable').not.toBeNull();
  expect(
    dernier?.dansLaFenetre ?? false,
    `le dernier arrêt est déjà HORS de la fenêtre (${dernier?.bords ?? ''}) — la tabulation ne ` +
      'l’a donc pas amené à l’écran, et le basculement à prouver n’en serait pas un',
  ).toBe(true);

  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });

  await expect
    .poll(async () => {
      const boite = await boiteDuFocalise();
      return boite.top - boite.fenetre;
    }, {
      message:
        'le retour en haut de page n’a pas laissé l’arrêt focalisé sous la fenêtre : ' +
        'l’instrument du contrôle positif n’a rien déplacé',
    })
    .toBeGreaterThan(0);

  const parLeBas = await mesurerArretFocalise(page);
  expect(parLeBas, 'le focus a quitté la page pendant le retour en haut').not.toBeNull();
  console.log(`Contrôle positif — laissé sous le BAS : ${parLeBas?.bords ?? ''}`);
  expect(
    parLeBas?.dansLaFenetre ?? true,
    `un focalisable entièrement SOUS la fenêtre est encore déclaré « dans la fenêtre » ` +
      `(${parLeBas?.bords ?? ''}) : la comparaison du bord inférieur ne refuse plus rien`,
  ).toBe(false);
});
