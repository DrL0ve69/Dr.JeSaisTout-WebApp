// =============================================================================
// Navigation au clavier — l'ordre de tabulation RÉEL de la coquille
// (WCAG 2.2 · 2.1.1 Clavier, 2.1.2 Pas de piège au clavier, 2.4.3 Parcours du focus)
// -----------------------------------------------------------------------------
// CE QU'IL AJOUTE À CE QUI EXISTE DÉJÀ. Trois gates couvrent aujourd'hui la
// coquille, et AUCUN ne presse une touche : `app.spec.ts` et `en-tete.spec.ts`
// interrogent le DOM dans jsdom (qui ne calcule ni ordre de focus ni cascade), et
// `tools/a11y/verifier-axe.mjs` audite le HTML prerendu — axe est un analyseur
// STATIQUE, il ne sait pas si Tab atteint un élément ni dans quel ordre. C'est la
// dette (a) d'E1-ST2 : « clavier / focus visible / target-size ne sont couverts
// par AUCUN gate ». Ce fichier rembourse la première moitié du clavier.
//
// LES TROIS MODES D'ÉCHEC QU'IL ATTRAPE, et que rien d'autre ne verrait :
//
//  1. UN ORDRE FAUX. L'ordre de tabulation suit l'ordre du DOM… tant que personne
//     n'a posé un `tabindex` positif, ni sorti un élément de son conteneur en le
//     repositionnant. Le jour où ça arrive, la structure du document reste
//     parfaite — seul un vrai navigateur voit le parcours dévier.
//
//  2. LE GROUPE DE RADIOS DÉGROUPÉ. Les trois radios de `bascule-theme.ts`
//     partagent `name="theme"` : c'est CET attribut, et lui seul, qui fait qu'ils
//     ne coûtent QU'UNE tabulation et se parcourent aux flèches. Trois `name`
//     distincts donneraient trois cases à cocher déguisées — même rendu, même
//     HTML valide, même passe axe, mais trois arrêts au lieu d'un et plus aucune
//     sémantique « 2 sur 3 ». C'est précisément l'argument qui a fait préférer des
//     radios natifs à un `role="radiogroup"` maison (voir l'en-tête de
//     `bascule-theme.ts`) : il n'était démontré nulle part. Il l'est ici.
//
//  3. UN PIÈGE DU FOCUS. Le mode d'échec classique de 2.1.2 : on entre quelque
//     part et on ne peut plus en sortir. Il ne se voit ni dans le HTML, ni dans
//     les styles, ni dans un audit statique — uniquement en pressant Tab puis
//     Maj+Tab jusqu'au bout.
//
// ⚠️ AUCUN `.focus()` PROGRAMMATIQUE DANS CE FICHIER, ET C'EST LE POINT — même
// règle que `skip-link.spec.ts`, même raison : poser le focus par script prouve
// seulement qu'un élément est focalisable, ce que jsdom sait déjà. L'ORDRE est la
// chose mesurée ; un `locator.focus()` glissé ici rendrait le test vert et vide.
// =============================================================================

import { Locator, Page, expect, test } from '@playwright/test';

/**
 * Les six arrêts de tabulation de la page d'accueil, dans l'ordre attendu.
 *
 * Tout par RÔLE + nom accessible, jamais par classe CSS : c'est ce qu'une aide
 * technique perçoit. Un lien dégradé en `<div>` cliquable, ou un radio réétiqueté
 * en `role="button"`, ferait donc rougir ce test — un sélecteur `.liens a` n'y
 * verrait que du feu.
 *
 * Le logotype est épinglé sur son NOM COMPLET, « Dr. Je-Sais-Tout ». Ce n'était pas
 * possible tant que ce nom était calculé depuis le contenu : les deux `<span>`
 * adjacents (« Dr. » / « Je-Sais-Tout ») sont compilés sans nœud de texte entre eux
 * et donnaient « Dr.Je-Sais-Tout », en un seul mot. Le lien porte désormais un
 * `aria-label` explicite (voir l'en-tête d'`en-tete.ts`), et cette ligne est le seul
 * endroit du dépôt où un VRAI moteur calcule ce nom accessible — `en-tete.spec.ts`
 * ne peut que relire l'attribut.
 *
 * Le groupe de radios n'apparaît qu'UNE FOIS, sur « Système » : la tabulation entre
 * dans un groupe natif par son membre COCHÉ. C'est « Système » ici parce que le
 * `ThemeService` démarre sur ce choix (et que le HTML prerendu, produit dans Node,
 * ne peut cocher que celui-là — voir l'en-tête de `bascule-theme.ts`). Si le défaut
 * changeait un jour, ce test le dirait, ce qui est le comportement voulu.
 */
function arretsAttendus(page: Page): readonly { readonly nom: string; readonly element: Locator }[] {
  return [
    {
      nom: "lien d'évitement",
      element: page.getByRole('link', { name: 'Aller au contenu principal' }),
    },
    {
      nom: 'logotype',
      // `exact: true` : sans lui, Playwright cherche une SOUS-CHAÎNE, et le test
      // resterait vert sur « Dr.Je-Sais-Tout » comme sur n'importe quel nom qui
      // contiendrait celui-ci. C'est l'espace du nom accessible qui est mesurée ici.
      element: page.getByRole('link', { name: 'Dr. Je-Sais-Tout', exact: true }),
    },
    { nom: 'lien « Accueil »', element: page.getByRole('link', { name: 'Accueil' }) },
    {
      nom: 'lien « Sécurité des applications web »',
      element: page.getByRole('link', { name: 'Sécurité des applications web' }),
    },
    {
      nom: 'groupe de radios du thème (membre coché)',
      element: page.getByRole('radio', { name: 'Système' }),
    },
    {
      nom: 'lien du pied de page',
      element: page.getByRole('link', { name: 'dépôt public sur GitHub' }),
    },
  ];
}

test("l'ordre de tabulation de la page d'accueil suit l'ordre du document, radios compris", async ({
  page,
}) => {
  await page.goto('/');

  const arrets = arretsAttendus(page);

  for (const arret of arrets) {
    await page.keyboard.press('Tab');
    // Le message n'est pas décoratif : en cas d'échec, le rapport nomme l'arrêt
    // attendu plutôt que d'afficher un sélecteur nu.
    await expect(arret.element, `arrêt attendu : ${arret.nom}`).toBeFocused();
  }

  // CE QUE CETTE LIGNE GARDE, ET CE QU'ELLE NE PROUVE PAS.
  // Elle porte sur un tableau littéral de ce fichier : elle ne peut donc RIEN dire
  // du nombre réel d'arrêts de la page — il n'y a pas de septième Tab pressé
  // ci-dessus, et affirmer « pas sept » serait une tautologie déguisée (L-008).
  // Ce qu'elle garde est réel et suffit à la justifier : une boucle `for` sur une
  // liste vidée ou amputée passerait VERTE sans presser une seule touche. Le
  // compte épinglé est le seul garde-fou contre ce vert-là (même geste que le
  // `toBe(8)` de `cibles-pointeur.spec.ts`). Il vaut aussi contrat de lecture :
  // `<main tabindex="-1">` n'est pas un arrêt (focalisable par script seulement,
  // c'est ce qui permet au lien d'évitement de déplacer le focus sans polluer le
  // parcours) et les trois radios n'en font qu'un.
  //
  // Le « pas de septième arrêt », lui, n'est pas mesurable de façon fiable ici :
  // au-delà du dernier élément, Chromium sans affichage BOUCLE sur le premier
  // focalisable — un « le focus a quitté la liste » y serait faux, et le troisième
  // test de ce fichier refuse déjà, pour la même raison, de tabuler au-delà.
  expect(arrets).toHaveLength(6);
});

test('le groupe de radios ne consomme QU’UNE tabulation, et les flèches y déplacent la coche', async ({
  page,
}) => {
  await page.goto('/');

  const systeme = page.getByRole('radio', { name: 'Système' });
  const clair = page.getByRole('radio', { name: 'Clair' });
  const lienPied = page.getByRole('link', { name: 'dépôt public sur GitHub' });

  // Cinq tabulations pour entrer dans le groupe : c'est l'ordre prouvé par le test
  // précédent. On entre sur le membre coché.
  for (let n = 0; n < 5; n++) {
    await page.keyboard.press('Tab');
  }
  await expect(systeme).toBeFocused();
  await expect(systeme).toBeChecked();

  // LA FLÈCHE, pas la tabulation. Dans un groupe natif elle déplace le focus ET la
  // coche d'un seul geste — c'est le comportement que `role="radiogroup"` aurait
  // fallu réécrire à la main (roving tabindex, Home/End, bouclage). `THEMES` vaut
  // ['clair', 'sombre', 'systeme'] : depuis le dernier membre, la flèche boucle sur
  // le premier.
  await page.keyboard.press('ArrowRight');
  await expect(clair).toBeFocused();
  await expect(clair).toBeChecked();
  // La coche s'est DÉPLACÉE, elle ne s'est pas ajoutée : trois `name` distincts
  // laisseraient les deux cochés, et cette ligne est ce qui le prouve.
  await expect(systeme).not.toBeChecked();

  // Et la tabulation suivante SORT du groupe. Si elle atterrissait sur le radio
  // voisin, le groupe coûterait trois arrêts au clavier au lieu d'un.
  await page.keyboard.press('Tab');
  await expect(lienPied).toBeFocused();
});

test('aucun piège du focus : Maj+Tab remonte tout le parcours jusqu’au lien d’évitement', async ({
  page,
}) => {
  await page.goto('/');

  const arrets = arretsAttendus(page);

  // Aller : jusqu'au dernier arrêt de la page.
  for (const arret of arrets) {
    await page.keyboard.press('Tab');
    await expect(arret.element, `aller — arrêt attendu : ${arret.nom}`).toBeFocused();
  }

  // Retour : le parcours inverse doit être le miroir exact de l'aller. On ne
  // tabule pas AU-DELÀ du dernier arrêt avant de faire demi-tour — ce qui se passe
  // après le dernier élément appartient au navigateur (barre d'adresse en mode
  // fenêtré, bouclage en mode sans affichage) et ne dit rien de la page.
  //
  // Le groupe de radios est traversé ici EN SENS INVERSE : un piège n'est pas
  // toujours symétrique — une gestion maison des flèches peut laisser entrer et
  // interdire de ressortir vers l'arrière.
  for (let n = arrets.length - 2; n >= 0; n--) {
    const arret = arrets[n];
    if (arret === undefined) {
      throw new Error(`arrêt n°${n} introuvable — la liste des arrêts a été modifiée`);
    }
    await page.keyboard.press('Shift+Tab');
    await expect(arret.element, `retour — arrêt attendu : ${arret.nom}`).toBeFocused();
  }
});
