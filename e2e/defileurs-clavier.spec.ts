// =============================================================================
// Les défileurs de code au clavier — la dette que `verifier-axe.mjs` a NOMMÉE
// (WCAG 2.2 · 2.1.1 Clavier, 2.1.2 Pas de piège, 2.4.3 Parcours du focus,
//  2.4.6 En-têtes et étiquettes, 2.4.7 Visibilité du focus, 2.4.11 Focus non
//  masqué, 4.1.2 Nom/rôle/valeur)
// -----------------------------------------------------------------------------
// POURQUOI CE FICHIER EXISTE — ce n'est pas une case à cocher, c'est axe lui-même
// qui le réclame par écrit. Le lot B d'E2-ST4 a posé, autour de chaque bloc de code,
// une région défilante écrite dans le gabarit de `RenduBlocs` : `div.defileur`,
// `role="group"`, `tabindex="0"`, `aria-label`. AUCUN gate ne pouvait la mesurer :
//   • `tools/a11y/verifier-axe.mjs` DÉSACTIVE NOMMÉMENT `scrollable-region-focusable`,
//     avec sa raison écrite — la règle dépend du calcul de débordement
//     (`overflow`/`scrollWidth`), que jsdom n'effectue pas sans feuille de style —
//     et la conclusion de cette raison est « → Playwright en dette ». Ce fichier
//     est le remboursement de cette dette-là, pas d'une autre.
//   • `focus-order-semantics` est désactivée PAR DÉFAUT chez axe.
//
// 🔴 ET LE TROU A DÉJÀ MORDU, une fois, dans le lot qui a créé la région. Shiki
// posait son propre `tabindex="0"` sur chaque `<pre>` : la page témoin est passée de
// 8 à SEIZE arrêts de tabulation, dont huit sans nom et sans rien à faire défiler
// (l'`overflow-x` avait déménagé sur l'enveloppe). Corrigé à l'aveugle par un
// transformateur du compilateur (`drjst-pre-sans-tabindex`), puis mesuré 16 → 8 sur
// le DOM PRERENDU — jamais dans un navigateur, où seule la mise en page décide.
// Les tabulations comptées ici sont donc le premier filet réel de ce 16 → 8.
//
// ⚠️ ON COMPTE DES TABULATIONS RÉELLES, PAS DES `[tabindex]` DU DOM. Compter les
// attributs redirait ce que `rendu-blocs.spec.ts` sait déjà, dans un moteur qui ne
// met rien en page. Un arrêt de tabulation est un fait de NAVIGATEUR : c'est lui
// qu'on presse ici, sans un seul `.focus()` programmatique — même règle et même
// raison que `parcours-clavier-quiz.spec.ts` (`:focus-visible` ne s'active pas de la
// même façon selon l'ORIGINE du focus).
//
// 🔴 LA LARGEUR DE FENÊTRE EST UNE MESURE, PAS UNE PRÉFÉRENCE — lire avant de la
// changer. À la fenêtre par défaut du projet (« Desktop Chrome », 1280 px), ZÉRO
// défileur sur huit déborde : la colonne de prose fait 635-686 px, plus large que
// la plus longue ligne de code de la fixture. Une assertion « ça défile » y serait
// donc VRAIE PAR HASARD dans l'autre sens — elle serait rouge en permanence, et la
// tentation serait de l'affaiblir. Sondé aux huit largeurs 1280/1024/768/640/480/
// 400/360/320 : 0, 0, 0, 2, 6, 7, 7, 7 défileurs débordants. On mesure donc à
// **320 px**, qui n'est pas une largeur choisie au jugé : c'est la largeur de
// référence de WCAG 1.4.10 (Redistribution), donc la plus étroite que ce site
// promette de servir, et celle où le débordement est maximal.
//
// 🔴 SEPT SUR HUIT À 320 PX — ET HUIT SUR HUIT À LA LARGEUR RÉELLEMENT SERVIE.
// Le constat le plus important de ce fichier, et il se lit dans cet ordre-là.
//   • À 320 px, `Exemple vulnérable n°1 — php` ne déborde À AUCUNE LARGEUR : ses
//     deux lignes font 20 et 23 caractères, donc son contenu tient dans la boîte la
//     plus étroite que la mise en page sache produire (mesuré : `scrollWidth` 221 =
//     `clientWidth` 221). Il est ÉPINGLÉ nommément plus bas : si un neuvième bloc
//     cessait de déborder, ou si celui-ci se mettait à déborder, le test rougit.
//   • 🔴 MAIS À 1280 PX — la fenêtre par défaut du projet, celle qu'un visiteur de
//     bureau reçoit — la sonde ci-dessus dit ZÉRO défileur débordant : les HUIT
//     portent alors un `tabindex="0"` sans rien à faire défiler. Ce n'est pas une
//     exception nommée, c'est le cas GÉNÉRAL de la largeur la plus fréquente, et
//     l'écrire dans un commentaire ne le rendait observable nulle part (famille
//     L-008/L-018, une garantie surestimée). D'où le `describe` « largeur par
//     défaut » en bas de fichier : il n'assertionne rien et IMPRIME le compte à
//     chaque run — le journal fait foi (L-005), la dette se relit au lieu de dormir.
// Ce n'est pas un échec WCAG (2.1.1 n'exige pas qu'un arrêt serve à quelque chose),
// et ce n'est pas un défaut du composant : le gabarit est prerendu, il ne peut pas
// savoir à quelle largeur il sera lu, et poser le `tabindex` en JavaScript après
// coup rouvrirait L-033 (un arrêt qui apparaît après l'hydratation). C'est
// exactement la classe de bruit clavier que le lot B a passé son temps à retirer,
// et c'est un constat à porter à la clôture du lot C.
//
// ⚠️ CE QUE CE FICHIER NE PROUVE PAS. `npx swa start` n'implémente pas
// `trailingSlash` : rien ici ne dit quoi que ce soit de la politique de routage de
// production (incident L-032, couvert EN LIGNE seulement, par `deploy.yml`).
// =============================================================================

import { Page, expect, test } from '@playwright/test';

import {
  MesureFocus,
  exigerIndicateurVisible,
  journaliserMesures,
  mesurerArretFocalise,
  releverEtatAuRepos,
} from './aides/indicateur-focus';

import { attendreHydratation } from './aides/hydratation';
import { exigerLaPageDeLecon } from './aides/artefact-mesure';

exigerLaPageDeLecon(
  'les défileurs de code au clavier (8 arrêts, débordement réel, flèches, noms distincts)',
);

/** Voir l'en-tête de `quiz-pre-hydratation.spec.ts` : cette route vient de la fixture témoin. */
const CHEMIN_LECON = '/cours/securite-web/lecon-temoin/';

/**
 * 320 × 720 — la largeur de référence de WCAG 1.4.10, et la seule où le débordement
 * des défileurs soit mesurable. Le raisonnement complet, chiffres compris, est dans
 * l'en-tête de ce fichier ; ne pas la changer sans le relire.
 */
test.use({ viewport: { width: 320, height: 720 } });

/**
 * U+00A0 écrite en échappement — `no-irregular-whitespace` refuse la vraie dans un
 * littéral, et une espace ORDINAIRE ferait rougir ce fichier sur un produit sain.
 * Les deux fautes ont été payées le 2026-08-19 (famille L-035, une prémisse de test
 * fausse rougit sur un produit sain). `RenduBlocs.etiquetteCode()` compose le nom
 * ainsi : genre + « n°» + rang + U+00A0 + « — » + langage.
 */
const INSECABLE = '\u00A0';

/**
 * LES HUIT NOMS, DANS L'ORDRE DU DOCUMENT — le cœur épinglé de ce fichier.
 *
 * Deux compteurs, et c'est voulu : les blocs `code` d'un côté (« Code n°1 » à
 * « Code n°4 »), les PAIRES de `comparaison` de l'autre (« Exemple vulnérable n°N »
 * et « Correctif n°N » partagent le rang N, parce qu'ils se lisent ensemble). La
 * numérotation est CONTINUE sur toute la page depuis le lot C1 : la page monte un
 * `RenduBlocs` par section, et sans le décalage propagé chaque section repartirait
 * de 1 — quatre défileurs se seraient appelés « Code n°1 », séparés par leur seul
 * langage. C'est exactement ce que la liste ci-dessous, et l'unicité exigée plus
 * bas, empêchent de revenir.
 */
const NOMS_ATTENDUS = [
  `Code n°1${INSECABLE}— bash`,
  `Code n°2${INSECABLE}— sql`,
  `Code n°3${INSECABLE}— typescript`,
  `Exemple vulnérable n°1${INSECABLE}— php`,
  `Correctif n°1${INSECABLE}— php`,
  `Exemple vulnérable n°2${INSECABLE}— csharp`,
  `Correctif n°2${INSECABLE}— csharp`,
  `Code n°4${INSECABLE}— json`,
] as const;

/**
 * Le seul défileur de la fixture dont le contenu TIENT dans sa boîte, à toute
 * largeur. Épinglé nommément plutôt que toléré par un seuil : voir l'en-tête.
 */
const DEFILEUR_QUI_NE_DEBORDE_PAS = `Exemple vulnérable n°1${INSECABLE}— php`;

/**
 * Borne de la marche d'approche. Généreuse mais finie : sans elle, un piège du focus
 * placé n'importe où sur la page ferait BOUCLER la suite au lieu de la faire rougir.
 * Mesuré sur la fixture : 16 tabulations avant le premier défileur, 33 arrêts en tout.
 */
const LIMITE_APPROCHE = 80;

/** Ce qu'un arrêt de tabulation révèle de lui-même, vu du navigateur. */
interface ArretTabulation {
  readonly estDefileur: boolean;
  /** Vrai quand l'arrêt est DANS une figure de code — la clef du 16 → 8. */
  readonly dansUneFigureDeCode: boolean;
  /** L'`aria-label` quand il y en a un ; sert au journal et aux messages d'échec. */
  readonly nom: string | null;
  readonly description: string;
}

/** Décrit l'élément qui a le focus MAINTENANT, ou `null` si le focus a quitté la page. */
async function decrireArretCourant(page: Page): Promise<ArretTabulation | null> {
  return page.evaluate(() => {
    const actif = document.activeElement;
    if (!(actif instanceof HTMLElement) || actif === document.body) {
      return null;
    }
    return {
      estDefileur: actif.classList.contains('defileur'),
      dansUneFigureDeCode: actif.closest('figure.bloc-code') !== null,
      nom: actif.getAttribute('aria-label'),
      description:
        `<${actif.tagName.toLowerCase()}` +
        `${actif.className === '' ? '' : ` class="${actif.className}"`}> ` +
        `« ${(actif.getAttribute('aria-label') ?? actif.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 50) || '(sans nom)'} »`,
    };
  });
}

/**
 * Le parcours de tabulation COMPLET de la page, du premier arrêt jusqu'à la sortie.
 *
 * Aucun `.focus()`, aucun raccourci : c'est une vraie marche, qui traverserait donc
 * un piège du focus posé n'importe où avant les défileurs.
 */
async function parcourirToutLeDocument(page: Page): Promise<readonly ArretTabulation[]> {
  const arrets: ArretTabulation[] = [];
  for (let presses = 1; presses <= LIMITE_APPROCHE; presses++) {
    await page.keyboard.press('Tab');
    const arret = await decrireArretCourant(page);
    if (arret === null) {
      return arrets;
    }
    arrets.push(arret);
  }
  throw new Error(
    `le parcours n'est pas sorti du document en ${String(LIMITE_APPROCHE)} tabulations — ` +
      'piège du focus (WCAG 2.1.2), ou page devenue beaucoup plus longue que la fixture témoin',
  );
}

/**
 * Tabule jusqu'à ce que le focus soit posé sur un défileur, et renvoie son nom.
 *
 * Volontairement écrit SANS supposer que les huit défileurs se suivent : ils se
 * suivent dans la fixture d'aujourd'hui, une leçon qui intercalerait un lien entre
 * deux blocs de code ne le ferait plus, et cette aide continuerait de fonctionner.
 */
async function tabulerJusquAuDefileurSuivant(page: Page, sens: 'Tab' | 'Shift+Tab'): Promise<string> {
  for (let presses = 1; presses <= LIMITE_APPROCHE; presses++) {
    await page.keyboard.press(sens);
    const arret = await decrireArretCourant(page);
    if (arret === null) {
      throw new Error(
        `le focus a quitté le document avant d'atteindre un défileur (sens ${sens}) — ` +
          'il manque des défileurs au parcours',
      );
    }
    if (arret.estDefileur) {
      return arret.nom ?? '';
    }
  }
  throw new Error(
    `aucun défileur atteint en ${String(LIMITE_APPROCHE)} pressions de ${sens} — ` +
      'piège du focus, ou défileurs absents de la page',
  );
}

/**
 * ⚠️ CE QUE CE TEST REVENDIQUE, EXACTEMENT — le titre a été resserré en revue du
 * lot C. Il mesure UN SEUL FOCALISABLE PAR FIGURE DE CODE, c'est-à-dire la
 * non-régression du 16 → 8 du lot B. La définition d'« arrêt mort » qu'il emploie est
 * STRUCTURELLE (`dansUneFigureDeCode && !estDefileur`) : par construction, il ne peut
 * pas voir un arrêt mort FONCTIONNEL — un défileur qui n'a rien à faire défiler en
 * est un, et à 1280 px il y en a huit. L'ancien titre (« AUCUN arrêt mort dans un
 * bloc de code ») promettait donc un absolu que la mesure ne couvre pas ; le
 * `describe` de la largeur par défaut, en bas de fichier, imprime le reste.
 */
test('le parcours au clavier compte exactement huit défileurs, et UN SEUL focalisable par figure de code', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);

  const arrets = await parcourirToutLeDocument(page);
  const defileurs = arrets.filter((arret) => arret.estDefileur);
  // « En trop » et non « mort » : le critère est STRUCTUREL — un focalisable posé
  // dans une figure de code sans être son défileur. Un défileur qui n'a rien à faire
  // défiler n'entre pas dans ce compte, et c'est le `describe` du bas qui l'imprime.
  const enTrop = arrets.filter((arret) => arret.dansUneFigureDeCode && !arret.estDefileur);

  // Le journal fait foi (L-005) : le compte total appartient au CONTENU de la
  // fixture et n'est donc pas épinglé (même réserve que le préambule de
  // `parcours-clavier-quiz.spec.ts`) — mais il s'imprime, parce qu'un écart s'y lit.
  console.log(
    `Défileurs — parcours complet : ${String(arrets.length)} arrêt(s) de tabulation, ` +
      `dont ${String(defileurs.length)} défileur(s) et ${String(enTrop.length)} arrêt(s) ` +
      'dans une figure de code sans être le défileur.',
  );

  // 🔴 LA NON-RÉGRESSION DU 16 → 8, ENFIN MESURÉE DANS UN NAVIGATEUR. Si le
  // transformateur `drjst-pre-sans-tabindex` était débranché, ou si Shiki reposait
  // son `tabindex` sous un autre nom, chaque figure rendrait DEUX arrêts — un nommé
  // et défilant, un muet et inerte — et c'est cette ligne, seule, qui le dirait.
  expect(
    enTrop.map((arret) => arret.description),
    'une figure de code porte DEUX focalisables : un arrêt de tabulation y est posé sans être ' +
      'son défileur — sans nom et sans rien à faire défiler (le défaut du lot B, 16 arrêts pour ' +
      '8 blocs). Ce test compte les focalisables PAR FIGURE ; il ne dit rien de savoir si un ' +
      'défileur a quelque chose à faire défiler (voir le describe « largeur par défaut »)',
  ).toEqual([]);

  expect(
    defileurs.length,
    'le nombre de défileurs ATTEINTS au clavier a changé — ou un défileur n’est plus atteignable du tout',
  ).toBe(NOMS_ATTENDUS.length);

  // L'ordre du document, nom par nom : c'est la numérotation continue du lot C1.
  expect(defileurs.map((arret) => arret.nom)).toEqual([...NOMS_ATTENDUS]);

  // ET AUCUN DÉFILEUR N'EST RESTÉ EN DEHORS DU PARCOURS. Les deux comptes viennent de
  // deux sources différentes — l'un des tabulations pressées, l'autre du DOM : un
  // défileur qui perdrait son `tabindex` serait toujours dans le second, plus dans le
  // premier, et l'écart se lit ici (jamais dans un seul des deux).
  await expect(
    page.locator('.defileur'),
    'le DOM porte un nombre de défileurs différent de celui que la tabulation atteint',
  ).toHaveCount(NOMS_ATTENDUS.length);
});

test('les huit défileurs portent un nom accessible non vide, et ces noms sont DISTINCTS sur la page entière', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);

  const noms = await page
    .locator('.defileur')
    .evaluateAll((elements) => elements.map((element) => element.getAttribute('aria-label')));

  console.log(`Défileurs — noms accessibles relevés : ${noms.map((nom) => `« ${nom ?? '(null)'} »`).join(', ')}`);

  // LA GARDE « VERT ET VIDE », EN TÊTE — c'était le seul test des six à en manquer
  // (constat de revue du lot C). À zéro défileur relevé, les deux boucles ci-dessous
  // ne tournent pas et `new Set([]).size === 0` satisfait l'unicité : le test passait
  // vert en ne prouvant rien. L'égalité finale l'aurait bien attrapé, mais elle est
  // en BAS de fichier, après tout ce qui se serait tu.
  expect(noms.length, 'aucun défileur relevé : le test serait vert et vide').toBe(
    NOMS_ATTENDUS.length,
  );

  // 4.1.2 — un `role="group"` sans nom accessible est un groupe anonyme : le lecteur
  // d'écran annonce « groupe » et rien d'autre.
  for (const nom of noms) {
    expect(nom, 'un défileur n’a pas de nom accessible (role="group" anonyme, WCAG 4.1.2)')
      .not.toBeNull();
    expect((nom ?? '').trim(), 'un défileur porte un nom accessible VIDE').not.toBe('');
  }

  // 🔴 L'UNICITÉ, EXIGÉE EXPLICITEMENT — c'est ce que le lot C1 vient de rendre vrai.
  // Avant lui, la numérotation repartait de 1 à chaque section : quatre défileurs
  // s'appelaient « Code n°1 » et seul leur langage les séparait. Deux blocs du même
  // langage dans deux sections auraient donné deux HOMONYMES stricts — indiscernables
  // à l'oreille comme dans une liste de régions.
  expect(
    new Set(noms).size,
    `deux défileurs portent le même nom accessible : ${noms.join(' | ')}`,
  ).toBe(noms.length);

  // Et la FORME du nom, en plus de son unicité : l'unicité seule serait satisfaite par
  // huit chaînes arbitraires. Le rang est ce qui distingue, il doit être là.
  for (const nom of noms) {
    expect(
      nom ?? '',
      `« ${nom ?? ''} » ne suit pas la forme « <genre> n°<rang> — <langage> » ` +
        '(séparateur U+00A0 avant le tiret, cf. RenduBlocs.etiquetteCode)',
    ).toMatch(/^(Code|Exemple vulnérable|Correctif) n°\d+\u00A0— [a-z0-9#+-]+$/u);
  }

  expect(noms).toEqual([...NOMS_ATTENDUS]);
});

test('chaque défileur DÉFILE vraiment — sauf celui, nommé, dont le contenu tient dans sa boîte', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);

  const mesures = await page.locator('.defileur').evaluateAll((elements) =>
    elements.map((element) => ({
      nom: element.getAttribute('aria-label') ?? '(sans nom)',
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    })),
  );

  console.log('Défileurs — débordement mesuré à 320 px (largeur de référence WCAG 1.4.10) :');
  for (const mesure of mesures) {
    console.log(
      `  • « ${mesure.nom} » — scrollWidth ${String(mesure.scrollWidth)} / ` +
        `clientWidth ${String(mesure.clientWidth)} → ` +
        `${mesure.scrollWidth > mesure.clientWidth ? 'déborde' : 'TIENT DANS SA BOÎTE'}`,
    );
  }

  expect(mesures.length, 'aucun défileur mesuré : le test serait vert et vide').toBe(
    NOMS_ATTENDUS.length,
  );

  for (const mesure of mesures) {
    if (mesure.nom === DEFILEUR_QUI_NE_DEBORDE_PAS) {
      // L'EXCEPTION EST TENUE PAR SA RAISON, PAS PAR UNE TOLÉRANCE. On n'exige pas
      // « il ne déborde pas » (ce qui laisserait le contraire passer sans bruit) : on
      // exige l'ÉGALITÉ, c'est-à-dire que son contenu tienne exactement. Le jour où la
      // fixture allonge cette ligne de PHP, ce test rougit — et la note de l'en-tête,
      // qui explique pourquoi son `tabindex` est un arrêt sans emploi, sera relue.
      expect(
        mesure.scrollWidth,
        `« ${mesure.nom} » n’est plus le défileur « qui tient dans sa boîte » : relire l’en-tête ` +
          'de ce fichier, l’exception nommée n’a plus lieu d’être',
      ).toBe(mesure.clientWidth);
      continue;
    }

    // 🔴 SANS CETTE LIGNE, `tabindex="0"` FABRIQUE UN ARRÊT MORT. Une région qu'on
    // atteint au clavier et qui n'a rien à faire défiler coûte une tabulation à tout
    // le monde et ne rend rien à personne : c'est très exactement le défaut du lot B.
    expect(
      mesure.scrollWidth,
      `« ${mesure.nom} » ne déborde pas (scrollWidth ${String(mesure.scrollWidth)} = clientWidth ` +
        `${String(mesure.clientWidth)}) : son tabindex="0" est un arrêt de tabulation sans emploi`,
    ).toBeGreaterThan(mesure.clientWidth);
  }

  // Un seul toléré, et c'est celui-là. Une exception qui se met à en couvrir deux
  // n'est plus une exception, c'est un seuil qui glisse.
  expect(
    mesures.filter((mesure) => mesure.scrollWidth <= mesure.clientWidth).map((m) => m.nom),
    'la liste des défileurs qui ne débordent pas a changé',
  ).toEqual([DEFILEUR_QUI_NE_DEBORDE_PAS]);
});

test('une flèche droite fait DÉFILER le défileur focalisé — c’est le fond de WCAG 2.1.1', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);

  const defilements: string[] = [];

  for (const nomAttendu of NOMS_ATTENDUS) {
    const nom = await tabulerJusquAuDefileurSuivant(page, 'Tab');
    expect(nom, 'les défileurs ne sont pas atteints dans l’ordre du document').toBe(nomAttendu);

    if (nom === DEFILEUR_QUI_NE_DEBORDE_PAS) {
      defilements.push(`« ${nom} » — rien à faire défiler (exception nommée)`);
      continue;
    }

    const defileur = page.locator('.defileur').nth(NOMS_ATTENDUS.indexOf(nomAttendu));
    await expect(defileur, 'la marche d’approche n’a pas posé le focus où on le croit').toBeFocused();
    expect(await defileur.evaluate((element) => element.scrollLeft)).toBe(0);

    await page.keyboard.press('ArrowRight');

    // `expect.poll` et non une lecture sèche : L-021. `prefers-reduced-motion: reduce`
    // est actif dans le harnais, mais `scroll-behavior` reste une transition — une
    // valeur lue dans la microseconde qui suit la touche peut encore être celle d'avant.
    await expect
      .poll(
        async () => defileur.evaluate((element) => element.scrollLeft),
        {
          message: `« ${nom} » : la flèche droite ne fait pas défiler la région — elle s’atteint au clavier mais ne s’y opère pas (WCAG 2.1.1)`,
        },
      )
      .toBeGreaterThan(0);

    const apres = await defileur.evaluate((element) => element.scrollLeft);
    defilements.push(`« ${nom} » — scrollLeft 0 → ${String(apres)}`);
  }

  console.log(`Défileurs — défilement à la flèche droite :\n  • ${defilements.join('\n  • ')}`);
  expect(defilements.length, 'la boucle n’a exercé aucun défileur : le test serait vert et vide').toBe(
    NOMS_ATTENDUS.length,
  );
});

test('chaque défileur porte un indicateur de focus calculé, et il n’est pas masqué', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);

  // ÉTAT AU REPOS relevé AVANT toute tabulation, sur la page ENTIÈRE : les index
  // renvoyés par la mesure sont ceux de l'ordre du document complet.
  const auRepos = await releverEtatAuRepos(page);

  const mesures: MesureFocus[] = [];
  for (const nomAttendu of NOMS_ATTENDUS) {
    const nom = await tabulerJusquAuDefileurSuivant(page, 'Tab');
    expect(nom).toBe(nomAttendu);

    const mesure = await mesurerArretFocalise(page);
    if (mesure === null) {
      throw new Error(
        `« ${nomAttendu} » : le focus n’est sur aucun focalisable de la page — le défileur ` +
          'est-il encore compté par SELECTEUR_FOCALISABLES ?',
      );
    }
    mesures.push(mesure);
  }

  journaliserMesures(`les défileurs de « ${CHEMIN_LECON} » (fenêtre 320 px)`, mesures);

  expect(
    mesures.length,
    'la boucle de tabulation n’a mesuré aucun défileur : le test serait vert et vide',
  ).toBe(NOMS_ATTENDUS.length);

  for (const mesure of mesures) {
    const repos = auRepos[mesure.index];
    if (repos === undefined) {
      throw new Error(
        `état au repos introuvable pour ${mesure.description} : la liste des éléments ` +
          'focalisables a changé pendant le test',
      );
    }
    exigerIndicateurVisible(mesure, repos);
  }
});

test('aucun piège du focus : Maj+Tab remonte les huit défileurs en miroir', async ({ page }) => {
  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);

  // Aller.
  for (const nomAttendu of NOMS_ATTENDUS) {
    expect(await tabulerJusquAuDefileurSuivant(page, 'Tab')).toBe(nomAttendu);
  }

  // Retour : miroir exact. Un piège n'est pas toujours symétrique — une région
  // défilante focalisable peut très bien laisser entrer et retenir vers l'arrière si
  // quelqu'un pose un jour une gestion maison des touches par-dessus.
  const auRetour = [...NOMS_ATTENDUS].reverse().slice(1);
  for (const nomAttendu of auRetour) {
    expect(
      await tabulerJusquAuDefileurSuivant(page, 'Shift+Tab'),
      'le retour ne repasse pas par les défileurs dans l’ordre inverse (WCAG 2.1.2)',
    ).toBe(nomAttendu);
  }

  // Et on ressort par le haut : Maj+Tab depuis le premier défileur remonte VERS UN
  // AUTRE FOCALISABLE DE LA PAGE, hors des figures de code — il ne rebondit pas dans
  // les blocs.
  //
  // ⚠️ LE NON-NUL D'ABORD, ET C'EST TOUT L'OBJET DU CORRECTIF DE REVUE. `apres` vaut
  // `null` quand le focus a quitté le document (chrome du navigateur) : le
  // `?? false` d'origine transformait donc cette sortie-là en « pas de piège »,
  // c'est-à-dire en assertion vraie PAR ACCIDENT (L-018). Une remontée hors du
  // document ne prouve rien sur le parcours de la page.
  await page.keyboard.press('Shift+Tab');
  const apres = await decrireArretCourant(page);
  expect(
    apres,
    'Maj+Tab depuis le premier défileur a fait sortir le focus du DOCUMENT : la remontée dans ' +
      'la page n’est pas prouvée, et l’assertion suivante serait vraie par accident',
  ).not.toBeNull();
  expect(
    apres?.dansUneFigureDeCode ?? true,
    `Maj+Tab depuis le premier défileur reste dans une figure de code ` +
      `(${apres?.description ?? ''}) — piège du focus (WCAG 2.1.2)`,
  ).toBe(false);
  console.log(`Défileurs — sortie par le haut : ${apres?.description ?? '(focus hors du document)'}`);
});

// =============================================================================
// LA LARGEUR PAR DÉFAUT — une MESURE IMPRIMÉE, aucune assertion
// -----------------------------------------------------------------------------
// POURQUOI CE BLOC N'ASSERTIONNE RIEN, ET POURQUOI IL EXISTE QUAND MÊME.
// Le fait à rendre observable : à 1280 px — la fenêtre par défaut du projet, donc la
// largeur réellement servie à un visiteur de bureau — AUCUN des huit défileurs ne
// déborde. Les huit portent alors un `tabindex="0"` qui ne fait défiler rien.
//
// L'assertionner serait une faute : ce n'est pas un échec WCAG (2.1.1 n'exige pas
// qu'un arrêt serve à quelque chose), le composant prerendu ne PEUT pas connaître la
// largeur de lecture, et poser le `tabindex` en JavaScript après coup rouvrirait
// L-033. Un rouge permanent ici ne se corrigerait qu'en affaiblissant le test — le
// mode d'échec exact que l'en-tête de ce fichier décrit pour l'assertion inverse.
//
// Mais le laisser en COMMENTAIRE était le défaut relevé en revue : un lecteur de
// journal CI concluait « zéro arrêt mort » pendant que le produit en avait huit à la
// largeur par défaut (famille L-008/L-018). Ici, la dette s'imprime à chaque run —
// le journal fait foi (L-005) — et elle changera de valeur toute seule le jour où la
// mise en page ou le contenu de la fixture bougera.
// =============================================================================
test.describe('la largeur par défaut — la dette imprimée, pas assertionnée', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('combien de défileurs n’ont rien à faire défiler à 1280 px (mesure au journal)', async ({
    page,
  }) => {
    await page.goto(CHEMIN_LECON);
    await attendreHydratation(page);

    const mesures = await page.locator('.defileur').evaluateAll((elements) =>
      elements.map((element) => ({
        nom: element.getAttribute('aria-label') ?? '(sans nom)',
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      })),
    );

    const sansEmploi = mesures.filter((mesure) => mesure.scrollWidth <= mesure.clientWidth);

    console.log(
      `Défileurs — largeur par défaut (1280 px) : ${String(sansEmploi.length)} défileur(s) sur ` +
        `${String(mesures.length)} ne débordent PAS, donc autant de tabindex="0" sans rien à ` +
        'faire défiler. Constat porté à la clôture du lot C — pas un échec WCAG, pas une ' +
        'régression : la classe de bruit clavier que le lot B a retirée, revenue par la mise en page.',
    );
    for (const mesure of mesures) {
      console.log(
        `  • « ${mesure.nom} » — scrollWidth ${String(mesure.scrollWidth)} / ` +
          `clientWidth ${String(mesure.clientWidth)} → ` +
          `${mesure.scrollWidth > mesure.clientWidth ? 'déborde' : 'TIENT DANS SA BOÎTE'}`,
      );
    }
  });
});
