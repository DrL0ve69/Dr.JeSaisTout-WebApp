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
//  2. 📉 LE GROUPE DE RADIOS A PERDU SON OBJET (bascule E6, 2026-08-20), ET LA
//     PREUVE N'A PAS DISPARU POUR AUTANT. Ce fichier portait un deuxième test
//     dédié aux trois radios de `bascule-theme.ts` : un groupe natif ne coûte
//     QU'UNE tabulation, la flèche y déplace la coche, et la coche se DÉPLACE au
//     lieu de s'ajouter. Le sélecteur de thème est retiré de l'en-tête — la phase 1
//     n'a qu'un thème (décision D-2) — et il n'y a plus AUCUN groupe de radios
//     dans la coquille : le test n'avait plus rien à presser.
//     ⚠️ RECENSEMENT AVANT RETRAIT (règle : « quand un test perd son objet, on
//     recense ce qu'il était le SEUL à prouver »). Les trois assertions vivent
//     déjà, mesurées sur la page où elles comptent le plus — le quiz :
//       • « un groupe = UN arrêt » → `parcours-clavier-quiz.spec.ts:193`, dont le
//         parcours attendu est DÉRIVÉ de la source du quiz (un groupe y vaut un
//         rang), donc plus solide qu'un littéral ;
//       • « la flèche déplace le focus ET la coche » et « la coche se déplace, elle
//         ne s'ajoute pas » (`not.toBeChecked()`) →
//         `parcours-clavier-quiz.spec.ts:296`, appliqué à CHAQUE mécanique à radios
//         publiée par la leçon, pas à un seul groupe.
//     La SEULE chose que plus rien ne prouve est « la tabulation entre dans un
//     groupe par son membre COCHÉ » — parce qu'aucun groupe pré-coché n'existe plus
//     dans le produit. Ce n'est pas une couverture perdue : c'est un comportement
//     qui n'a plus de porteur. Le jour où E4-ST1 recompose la bascule de thème, ce
//     test se réécrit ici.
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
 * Les huit arrêts de tabulation de la page d'accueil, dans l'ordre attendu.
 * 📉 Sept avant la bascule E6, huit depuis — MESURÉ sur l'artéfact, pas déduit :
 * le groupe de radios du thème sort (−1), les deux appels à l'action de la bande
 * d'ouverture entrent (+2).
 *
 * ⚠️ LE `<summary>` DU MENU COMPACT N'EST PAS UN ARRÊT ICI, ET C'EST LA LARGEUR QUI
 * LE DIT. `devices['Desktop Chrome']` fixe la fenêtre à 1280 px ; au-dessus du point
 * de rupture de 840 px (`en-tete.scss`), `.menu > summary` est en `display: none` et
 * le contenu du `<details>` est révélé par `::details-content`. Sous 840 px le
 * `<summary>` DEVIENT un arrêt et les deux liens de nav n'en sont plus tant qu'il est
 * fermé — un parcours différent, qu'AUCUN spec ne mesure aujourd'hui (constat porté
 * au rapport du lot, pas corrigé ici).
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
 * IL N'Y A PLUS DE GROUPE DE RADIOS DANS LA COQUILLE depuis la bascule E6 : le
 * sélecteur de thème est retiré de l'en-tête (phase 1 = un seul thème, décision D-2).
 * Ce qu'il prouvait est recensé dans l'en-tête de fichier, point 2.
 *
 * LES DEUX LIENS DE NAVIGATION SONT SCOPÉS AU REPÈRE `navigation` ET `exact: true`,
 * parce qu'ils sont fragiles PAR CONSTRUCTION et le resteront : le lien « Sécurité
 * des applications web » de l'en-tête et l'appel à l'action « Commencer le cours »
 * de l'accueil mènent à la MÊME adresse, et le titre de la carte reprend mot pour
 * mot le nom du lien de nav. Sans `exact: true`, la recherche par sous-chaîne
 * attraperait tout futur lien dont le nom CONTIENDRAIT celui-ci (« Sécurité des
 * applications web — module 3 ») ; sans le scope au repère, elle attraperait un
 * homonyme posé ailleurs dans la page. Dans les deux cas Playwright échouerait en
 * mode strict — un rouge exact mais illisible, qui accuserait l'ordre de
 * tabulation d'une faute qu'il n'a pas commise.
 *
 * LES TROIS ARRÊTS DU `<main>`, DANS L'ORDRE DU DOCUMENT : les deux appels à
 * l'action de la bande d'ouverture (`accueil.ts`, `.actions`), puis « Commencer le
 * cours » de `CarteCours`, qui vient plus bas dans le gabarit. Ils suivent tous les
 * liens de l'en-tête ; s'ils se mettaient à les précéder, c'est que quelqu'un aurait
 * déplacé le contenu principal AVANT l'en-tête dans le document. Le titre de
 * `CarteCours` reste un `<h2>` et non un `<a>` (E1-ST3, décision 1) : il n'est pas
 * un arrêt.
 */
function arretsAttendus(page: Page): readonly { readonly nom: string; readonly element: Locator }[] {
  const navigation = page.getByRole('navigation', { name: 'Navigation principale' });

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
    {
      nom: 'lien « Accueil » de la navigation principale',
      element: navigation.getByRole('link', { name: 'Accueil', exact: true }),
    },
    {
      nom: 'lien « Sécurité des applications web » de la navigation principale',
      element: navigation.getByRole('link', { name: 'Sécurité des applications web', exact: true }),
    },
    {
      nom: 'appel à l’action « Commencer le module 01 » de la bande d’ouverture',
      element: page.getByRole('link', { name: 'Commencer le module 01', exact: true }),
    },
    {
      nom: 'appel à l’action « Voir les 13 modules » de la bande d’ouverture',
      element: page.getByRole('link', { name: 'Voir les 13 modules', exact: true }),
    },
    {
      nom: 'appel à l’action « Commencer le cours » de la carte du cours',
      element: page.getByRole('link', { name: 'Commencer le cours', exact: true }),
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
  // du nombre réel d'arrêts de la page — il n'y a pas de huitième Tab pressé
  // ci-dessus, et affirmer « pas huit » serait une tautologie déguisée (L-008).
  // Ce qu'elle garde est réel et suffit à la justifier : une boucle `for` sur une
  // liste vidée ou amputée passerait VERTE sans presser une seule touche. Le
  // compte épinglé est le seul garde-fou contre ce vert-là (même geste que le
  // `toBe(8)` de `cibles-pointeur.spec.ts`). Il vaut aussi contrat de lecture :
  // `<main tabindex="-1">` n'est pas un arrêt (focalisable par script seulement,
  // c'est ce qui permet au lien d'évitement de déplacer le focus sans polluer le
  // parcours), et le `<summary>` du menu compact n'en est pas un À 1280 PX
  // (`display: none` au-dessus de 840 px — voir le commentaire d'`arretsAttendus`).
  //
  // LES HUIT, DANS L'ORDRE : (1) lien d'évitement · (2) logotype · (3) « Accueil » ·
  // (4) « Sécurité des applications web » · (5) « Commencer le module 01 » ·
  // (6) « Voir les 13 modules » · (7) « Commencer le cours » · (8) le lien du pied de
  // page. 📉 Sept avant la bascule E6 : le groupe de radios du thème valait le
  // cinquième arrêt (−1), les deux appels à l'action de la bande d'ouverture sont
  // neufs (+2).
  //
  // Le « pas de huitième arrêt », lui, n'est pas mesurable de façon fiable ici :
  // au-delà du dernier élément, Chromium sans affichage BOUCLE sur le premier
  // focalisable — un « le focus a quitté la liste » y serait faux, et le troisième
  // test de ce fichier refuse déjà, pour la même raison, de tabuler au-delà.
  expect(arrets).toHaveLength(8);
});

// 📉 LE TEST « le groupe de radios ne consomme QU'UNE tabulation, et les flèches y
// déplacent la coche » A ÉTÉ RETIRÉ ICI le 2026-08-20 (bascule E6) : la coquille n'a
// plus aucun groupe de radios à presser. Le recensement de ce qu'il prouvait — et
// des deux tests du quiz qui le prouvent toujours, sur une page où des radios
// existent — est écrit au point 2 de l'en-tête de fichier. À ne pas relire comme un
// trou : à relire comme un déménagement documenté.

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
  // Un piège n'est pas toujours symétrique : un conteneur peut laisser entrer et
  // interdire de ressortir vers l'arrière. Le `<details>` du menu compact est
  // exactement ce genre de conteneur — ouvert par CSS à 1280 px, il enveloppe les
  // deux liens de nav, et c'est ce parcours de retour qui atteste qu'on en sort.
  for (let n = arrets.length - 2; n >= 0; n--) {
    const arret = arrets[n];
    if (arret === undefined) {
      throw new Error(`arrêt n°${n} introuvable — la liste des arrêts a été modifiée`);
    }
    await page.keyboard.press('Shift+Tab');
    await expect(arret.element, `retour — arrêt attendu : ${arret.nom}`).toBeFocused();
  }
});
