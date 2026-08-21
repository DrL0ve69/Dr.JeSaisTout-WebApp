// =============================================================================
// AUCUN FLASH DE CLAIR — et cette fois, la preuve tient SANS JAVASCRIPT DU TOUT
// -----------------------------------------------------------------------------
// 🔴 RE-HÉBERGEMENT AVEC CHANGEMENT DE PRÉMISSE (bascule E6, 2026-08-20).
// `e2e/bascule-theme.spec.ts` portait « un thème sombre épinglé est déjà posé quand
// le corps de page apparaît ». Ce test mesurait un script : le `<script
// id="init-theme">` d'`index.html`, synchrone dans le `<head>`, qui lisait
// `localStorage` et posait `data-theme` avant la première peinture. Il observait
// donc l'INSTANT où l'attribut arrivait, avec un `MutationObserver`.
//
// CE SCRIPT N'EXISTE PLUS, et la propriété qu'il défendait est devenue STRUCTURELLE
// au lieu d'être temporelle : la phase 1 ne rend qu'un thème (décision D-2), et
// `:root` déclare le sombre INCONDITIONNELLEMENT dans `_themes.scss`. Il n'y a plus
// d'attribut à poser, donc plus de fenêtre pendant laquelle il pourrait manquer.
// La bonne mesure n'est donc plus « quand l'attribut arrive-t-il ? » mais « la page
// est-elle sombre quand RIEN ne s'exécute ? ».
//
// D'OÙ LES DEUX CHOIX DE CE FICHIER, qui vont ensemble :
//   · `javaScriptEnabled: false`. Ce n'est pas une commodité : c'est l'assertion
//     elle-même. Une page dont le fond dépend encore d'un script, d'une
//     hydratation ou d'une requête média se peindrait clair ici. C'est le plus
//     large filet possible contre un retour en arrière — y compris un retour
//     silencieux, du genre « on remet un petit script pour poser le thème ».
//   · UNE CAPTURE, PAS UN `getComputedStyle` (famille **L-025**). Un style calculé
//     correct ne prouve pas un pixel peint : ce dépôt a déjà payé un `<hr>` dont la
//     géométrie était juste et qui ne peignait rien. On lit donc les PIXELS
//     RÉELLEMENT RENDUS. Le décodage du PNG n'est pas écrit à la main — il est
//     confié au navigateur lui-même, dans une page d'analyse hors du site (voir
//     `luminanceMoyenne`), ce qui évite d'introduire à la fois une dépendance et un
//     décodeur maison dans un gate de sécurité.
//
// ⚠️ CE QUE CE FICHIER NE PROUVE PAS, et il faut le dire (S-009) : il ne dit rien du
// `localStorage` d'un visiteur qui avait épinglé « clair » avant E6. C'est voulu —
// aucune migration destructive n'a été faite, la préférence reste intacte pour
// E4-ST1, et elle est inoffensive par construction puisque plus personne ne lit
// cette clé ni ne pose l'attribut. Le tripwire correspondant vit à l'unité, dans
// `src/app/core/theme/theme.spec.ts`.
// =============================================================================

import { type Browser, expect, test } from '@playwright/test';

// 🔴 L'ASSERTION CENTRALE, ÉCRITE COMME UNE OPTION. Tout ce fichier tourne SANS
// JavaScript : si le sombre cessait d'être peint par la seule feuille de styles,
// chaque test ci-dessous rougirait.
test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 640 } });

/**
 * Seuils de décision, en luminance relative moyenne (0 = noir, 1 = blanc).
 *
 * Mesurés, pas devinés : la surface du thème sombre est un noir de tube (`#0B0E11`
 * et voisins, `_themes.scss`), une page claire de navigateur est du blanc pur. La
 * bande entre les deux est large exprès — ce test répond « sombre ou clair », il ne
 * mesure pas une nuance, et un seuil serré rougirait au premier ajustement de
 * palette sans rien apprendre à personne.
 */
const SOMBRE_AU_PLUS = 0.25;
const CLAIR_AU_MOINS = 0.6;

/**
 * La luminance relative moyenne des pixels d'une capture PNG.
 *
 * ⚠️ LE DÉCODAGE EST CONFIÉ AU NAVIGATEUR, ET C'EST UN CHOIX DE SÉCURITÉ AUTANT QUE
 * DE COÛT. Écrire un décodeur PNG maison (en-tête, `IDAT`, `zlib.inflate`,
 * défiltrage ligne à ligne) mettrait un algorithme non revu sur le chemin d'un gate
 * qui doit dire la vérité ; ajouter une dépendance d'image pour trois lignes
 * violerait `.claude/rules/budget-free-tier.md` sur la surface d'attaque. La page
 * d'analyse est ouverte sur `about:blank` — HORS du site, donc hors de sa CSP : on
 * n'y injecte rien qui ressemble à ce que la politique du site interdit, et cette
 * page ne mesure jamais autre chose qu'un tableau d'octets.
 *
 * @param png la capture, telle que Playwright la rend
 * @returns la moyenne sur tous les pixels, dans [0, 1]
 */
async function luminanceMoyenne(browser: Browser, png: Buffer): Promise<number> {
  const analyse = await browser.newPage();
  try {
    const moyenne = await analyse.evaluate(async (base64: string) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();

      const toile = document.createElement('canvas');
      toile.width = image.naturalWidth;
      toile.height = image.naturalHeight;
      const contexte = toile.getContext('2d');
      if (contexte === null) {
        throw new Error("aucun contexte 2d : l'instrument de mesure est cassé");
      }
      contexte.drawImage(image, 0, 0);
      const { data } = contexte.getImageData(0, 0, toile.width, toile.height);

      let total = 0;
      let pixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        // Coefficients de luminance de Rec. 709, sur les valeurs sRGB brutes : on
        // compare deux extrêmes, pas des nuances — inutile de linéariser.
        total += (0.2126 * (data[i] ?? 0) + 0.7152 * (data[i + 1] ?? 0) + 0.0722 * (data[i + 2] ?? 0)) / 255;
        pixels += 1;
      }
      if (pixels === 0) {
        throw new Error('capture vide : la mesure ne vaudrait rien');
      }
      return total / pixels;
    }, png.toString('base64'));
    return moyenne;
  } finally {
    await analyse.close();
  }
}

test('l’accueil se peint SOMBRE sans exécuter la moindre ligne de JavaScript', async ({
  page,
  browser,
}) => {
  await page.goto('/');

  // La capture est prise sur la fenêtre visible, pas en pleine page : un flash est
  // par définition ce que l'œil voit au premier écran.
  const capture = await page.screenshot();
  const luminance = await luminanceMoyenne(browser, capture);

  expect(
    luminance,
    `l’accueil se peint en clair sans JavaScript (luminance ${luminance.toFixed(3)}) — le thème sombre dépend donc de quelque chose qui s’exécute, et une fenêtre de flash existe`,
  ).toBeLessThan(SOMBRE_AU_PLUS);
});

test('CONTRÔLE NÉGATIF — l’instrument sait dire « clair », sinon le test ci-dessus ne prouve rien', async ({
  browser,
}) => {
  // L-010 : un test de mutation doit d'abord vérifier qu'il a frappé sa cible. Une
  // `luminanceMoyenne` cassée qui rendrait toujours 0 ferait passer le test
  // précédent pour une preuve. On lui soumet donc une page blanche — celle que le
  // navigateur peint par défaut, et très exactement ce à quoi ressemblerait un
  // flash de clair — et on exige qu'elle la reconnaisse comme telle.
  const temoin = await browser.newPage();
  try {
    await temoin.goto('about:blank');
    const luminance = await luminanceMoyenne(browser, await temoin.screenshot());

    expect(
      luminance,
      'l’instrument rend « sombre » sur une page blanche : il ne mesure pas ce qu’il prétend',
    ).toBeGreaterThan(CLAIR_AU_MOINS);
  } finally {
    await temoin.close();
  }
});

test('aucun attribut de thème n’est posé — le sombre vient de `:root`, pas d’un script', async ({
  page,
}) => {
  // LE PENDANT STRUCTUREL DE LA MESURE DE PIXELS. La capture dit « la page est
  // sombre » ; celle-ci dit POURQUOI, et ferme la seule autre explication possible :
  // un `data-theme` qui serait arrivé par un chemin qu'on n'a pas prévu. Les deux
  // ensemble excluent le retour de l'anti-flash, sous quelque forme que ce soit.
  //
  // ⚠️ `toHaveAttribute` est une assertion de LOCATOR, donc auto-réessayée
  // (L-057) : elle ne se prononce pas sur une frame arbitraire.
  await page.goto('/');

  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
});
