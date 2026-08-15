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
// =============================================================================

import { expect, test } from '@playwright/test';

/**
 * Ce qu'un visiteur peut atteindre au clavier. Volontairement une ÉNUMÉRATION et
 * non une liste écrite à la main : tout élément interactif ajouté demain à la
 * coquille sera mesuré sans que personne pense à l'inscrire ici.
 *
 * `[tabindex="-1"]` est exclu par construction (le sélecteur ne prend que les
 * `tabindex` non négatifs) : `<main tabindex="-1">` est focalisable PAR SCRIPT, il
 * n'est pas un arrêt de tabulation et n'a pas à porter d'anneau.
 */
const SELECTEUR_FOCALISABLES =
  'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex^="-"])';

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
 */
const ARRETS_ATTENDUS = 6;

test("chaque arrêt de tabulation porte un indicateur de focus calculé, et il n'est pas masqué", async ({
  page,
}) => {
  await page.goto('/');

  // ÉTAT AU REPOS, capturé AVANT la première tabulation : à ce moment aucun élément
  // de la page n'a le focus, donc ces valeurs sont bien celles de l'état neutre.
  // Indexées dans l'ordre du document, elles se rapprochent ensuite de l'état
  // focalisé par le même index — pas besoin de rendre le focus pour comparer.
  const auRepos = await page.evaluate(
    (selecteur) =>
      Array.from(document.querySelectorAll<HTMLElement>(selecteur)).map((element) => {
        const style = getComputedStyle(element);
        return {
          contourStyle: style.outlineStyle,
          contourEpaisseur: Number.parseFloat(style.outlineWidth) || 0,
          ombre: style.boxShadow,
        };
      }),
    SELECTEUR_FOCALISABLES,
  );

  const mesures = [];
  const indexVus = new Set<number>();

  for (let n = 0; n < LIMITE_TABULATIONS; n++) {
    await page.keyboard.press('Tab');

    const mesure = await page.evaluate((selecteur) => {
      const focalisables = Array.from(document.querySelectorAll<HTMLElement>(selecteur));
      const actif = document.activeElement;
      if (!(actif instanceof HTMLElement)) {
        return null;
      }
      const index = focalisables.indexOf(actif);
      if (index < 0) {
        return null;
      }

      const style = getComputedStyle(actif);
      const boite = actif.getBoundingClientRect();

      // Le centre de la boîte : le point où un utilisateur regarde l'anneau. Si un
      // autre élément y est empilé, l'indicateur est masqué au sens de 2.4.11.
      const auCentre = document.elementFromPoint(
        boite.left + boite.width / 2,
        boite.top + boite.height / 2,
      );

      // Un radio n'a pas de texte propre : son nom vient du `<label>` qui
      // l'enveloppe. Sert UNIQUEMENT au journal et aux messages d'échec — aucune
      // assertion ne dépend de cette chaîne.
      const texte = (actif.textContent ?? '').trim() || (actif.closest('label')?.textContent ?? '').trim();

      return {
        index,
        description: `${actif.tagName.toLowerCase()} « ${texte || '(sans texte)'} »`,
        contourStyle: style.outlineStyle,
        contourEpaisseur: Number.parseFloat(style.outlineWidth) || 0,
        contourCouleur: style.outlineColor,
        ombre: style.boxShadow,
        dansLaFenetre:
          boite.top >= 0 &&
          boite.left >= 0 &&
          boite.bottom <= window.innerHeight &&
          boite.right <= window.innerWidth,
        boite: `${Math.round(boite.width)}×${Math.round(boite.height)} en (${Math.round(boite.left)}, ${Math.round(boite.top)})`,
        // `null` = rien ne recouvre ; sinon, la balise du coupable.
        recouvertPar:
          auCentre === null
            ? 'rien (point hors de tout élément)'
            : auCentre === actif || actif.contains(auCentre)
              ? null
              : `<${auCentre.tagName.toLowerCase()}>`,
      };
    }, SELECTEUR_FOCALISABLES);

    if (mesure === null || indexVus.has(mesure.index)) {
      break;
    }
    indexVus.add(mesure.index);
    mesures.push(mesure);
  }

  // Le journal fait foi (L-005) : les valeurs mesurées sont imprimées, pas
  // seulement comparées. Un anneau qui rétrécirait de 3 px à 1 px passerait encore
  // les assertions ; il se verrait ici.
  console.log(`Indicateur de focus — ${mesures.length} arrêt(s) mesuré(s) sur « / » :`);
  for (const mesure of mesures) {
    console.log(
      `  • ${mesure.description} — contour ${mesure.contourStyle} ${mesure.contourEpaisseur}px ${mesure.contourCouleur}` +
        ` · ombre ${mesure.ombre} · boîte ${mesure.boite}`,
    );
  }

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

    // 2.4.7 — un indicateur EXISTE, par l'un des trois canaux possibles. La
    // disjonction est volontairement large : le dépôt dessine un `outline`, mais
    // interdire d'avance une autre technique (ombre, changement d'arrière-plan)
    // ferait de ce gate un gardien de style, pas d'accessibilité.
    const contourDessine = mesure.contourStyle !== 'none' && mesure.contourEpaisseur > 0;
    const ombreDessinee = mesure.ombre !== 'none' && mesure.ombre !== repos.ombre;
    const ecartAvecLeRepos =
      mesure.contourStyle !== repos.contourStyle ||
      mesure.contourEpaisseur !== repos.contourEpaisseur;

    expect(
      contourDessine || ombreDessinee || ecartAvecLeRepos,
      `${mesure.description} : aucun indicateur de focus calculé (contour ${mesure.contourStyle} ${mesure.contourEpaisseur}px, ombre ${mesure.ombre} ; au repos : contour ${repos.contourStyle} ${repos.contourEpaisseur}px)`,
    ).toBe(true);

    // 2.4.11 — l'indicateur est visible là où il est dessiné.
    expect(
      mesure.dansLaFenetre,
      `${mesure.description} : focalisé HORS de la fenêtre (boîte ${mesure.boite}) — l'anneau existe mais personne ne le voit`,
    ).toBe(true);

    expect(
      mesure.recouvertPar,
      `${mesure.description} : recouvert par ${mesure.recouvertPar} en son centre — indicateur de focus masqué (WCAG 2.4.11)`,
    ).toBeNull();
  }
});
