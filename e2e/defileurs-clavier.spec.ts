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
// 🔴 RECALIBRÉ LE 2026-08-20 (clôture d'E3-ST1) — ET LA RÈGLE DE CONCEPTION A CHANGÉ.
// Jusqu'ici, ce fichier ÉPINGLAIT l'inventaire de la fixture témoin : huit noms de
// défileurs écrits en dur, dans l'ordre, plus un bloc désigné nommément (« Exemple
// vulnérable n°1 — php ») comme la seule exception qui ne déborde pas. Le harnais de
// fixture est retiré, la mesure porte désormais sur la LEÇON PUBLIÉE, et il reste
// dix-huit leçons à écrire : un spec qui rougit parce qu'un auteur ajoute un bloc de
// code serait un défaut, et sa correction — réécrire la liste — serait un rituel sans
// valeur. **On mesure donc le MÉCANISME, jamais l'inventaire.** Le compte de
// défileurs vient du DOM, les rangs se vérifient par leur PROGRESSION et non par
// leurs valeurs, et le débordement se constate là où il a lieu.
//
// 🔴 LA LARGEUR DE FENÊTRE EST UNE MESURE, PAS UNE PRÉFÉRENCE — lire avant de la
// changer. À la fenêtre par défaut du projet (« Desktop Chrome », 1280 px), ZÉRO
// défileur ne débordait sur la fixture : la colonne de prose fait 635-686 px, plus
// large que la plus longue ligne de code. Une assertion « ça défile » y serait donc
// rouge en permanence, et la tentation serait de l'affaiblir. Sondé aux huit largeurs
// 1280/1024/768/640/480/400/360/320 : 0, 0, 0, 2, 6, 7, 7, 7 défileurs débordants. On
// mesure donc à **320 px**, qui n'est pas une largeur choisie au jugé : c'est la
// largeur de référence de WCAG 1.4.10 (Redistribution), donc la plus étroite que ce
// site promette de servir, et celle où le débordement est maximal.
//
// 🔴 CE QUI REMPLACE L'EXCEPTION NOMMÉE : UN CONTRÔLE POSITIF. Un bloc de deux lignes
// courtes tient dans sa boîte même à 320 px (mesuré sur la fixture : `scrollWidth` 221
// = `clientWidth` 221) — c'est un fait de CONTENU, pas un défaut, et l'épingler par
// son titre éditorial revenait à faire tenir un gate d'accessibilité par la longueur
// d'une ligne de PHP. Ce qui compte est ailleurs : **au moins un défileur DOIT
// déborder**, sinon la page ne met aucune mécanique à l'épreuve et tout ce fichier
// serait « 0 sur 0 conforme », c'est-à-dire vert et vide (L-005/L-019). Cette
// exigence-là est assertionnée ; le débordement bloc par bloc ne l'est plus.
//
// ⚠️ ON COMPTE DES TABULATIONS RÉELLES, PAS DES `[tabindex]` DU DOM. Compter les
// attributs redirait ce que `rendu-blocs.spec.ts` sait déjà, dans un moteur qui ne
// met rien en page. Un arrêt de tabulation est un fait de NAVIGATEUR : c'est lui
// qu'on presse ici, sans un seul `.focus()` programmatique — même règle et même
// raison que `parcours-clavier-quiz.spec.ts` (`:focus-visible` ne s'active pas de la
// même façon selon l'ORIGINE du focus).
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
import { ROUTE_LECON_QUIZ, exigerUneLeconAvecQuiz } from './aides/artefact-mesure';

exigerUneLeconAvecQuiz(
  'les défileurs de code au clavier (un focalisable par figure, débordement réel, flèches, noms distincts)',
);

/** La page de leçon réellement présente dans l'artéfact mesuré — jamais un littéral. */
const CHEMIN_LECON = ROUTE_LECON_QUIZ;

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
 * LA FORME DU NOM ACCESSIBLE — ce qui remplace la liste des huit noms de la fixture.
 *
 * Deux compteurs, et c'est voulu : les blocs `code` d'un côté (« Code n°1 »,
 * « Code n°2 »…), les PAIRES de `comparaison` de l'autre (« Exemple vulnérable n°N »
 * et « Correctif n°N » partagent le rang N, parce qu'ils se lisent ensemble). Le
 * groupe 1 capture le genre, le groupe 2 le rang : c'est sur eux que porte la
 * vérification de continuité, plus bas.
 *
 * ⚠️ LE LANGAGE EST REPRIS BRUT, DONC LA CLASSE EST LARGE (correctif du 2026-08-20).
 * `RenduBlocs.etiquetteCode()` interpole `${langage}` TEL QUE L'AUTEUR L'ÉCRIT — il
 * ne le met ni en minuscules ni en forme. Une classe `[a-z0-9#+-]+` faisait donc
 * rougir ce fichier sur un produit parfaitement sain dès qu'un auteur écrivait
 * `PHP`, `C#` ou `Objective-C` (L-035 : une prémisse de test fausse accuse le
 * produit). Le point couvre les langages versionnés (`asp.net`, `f#`).
 */
const FORME_DU_NOM = new RegExp(
  `^(Code|Exemple vulnérable|Correctif) n°(\\d+)${INSECABLE}— [A-Za-z0-9#+.-]+$`,
  'u',
);

/**
 * Borne de la marche d'approche. Généreuse mais FINIE : sans elle, un piège du focus
 * placé n'importe où sur la page ferait BOUCLER la suite au lieu de la faire rougir.
 *
 * ⚠️ RELEVÉE DE 80 À 220 LE 2026-08-20, et ce n'est pas un affaiblissement : cette
 * borne ne mesure rien, elle empêche une boucle infinie. La fixture témoin comptait
 * 33 arrêts en tout ; une leçon publiée porte un quiz de huit questions, un sommaire
 * de page et une section « Aller plus loin », donc davantage. Une borne serrée sur
 * l'inventaire d'hier ferait rougir la première leçon un peu longue, sur un message
 * qui accuserait un piège du focus inexistant.
 */
const LIMITE_APPROCHE = 220;

/** Ce qu'un arrêt de tabulation révèle de lui-même, vu du navigateur. */
interface ArretTabulation {
  readonly estDefileur: boolean;
  /** Vrai quand l'arrêt est DANS une figure de code — la clef du 16 → 8. */
  readonly dansUneFigureDeCode: boolean;
  /** L'`aria-label` quand il y en a un ; sert au journal et aux messages d'échec. */
  readonly nom: string | null;
  readonly description: string;
}

/** Le débordement d'un défileur, tel que la MISE EN PAGE du navigateur le décide. */
interface MesureDefileur {
  readonly nom: string;
  readonly scrollWidth: number;
  readonly clientWidth: number;
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
 * Les noms accessibles des défileurs DANS L'ORDRE DU DOCUMENT, lus au DOM.
 *
 * C'est la source de référence de tout ce fichier depuis le recalibrage : elle
 * remplace la liste écrite en dur, et elle se confronte partout à ce que la
 * TABULATION atteint réellement — deux sources indépendantes, dont l'égalité est
 * l'assertion.
 */
async function nomsAuDom(page: Page): Promise<readonly (string | null)[]> {
  return page
    .locator('.defileur')
    .evaluateAll((elements) => elements.map((element) => element.getAttribute('aria-label')));
}

/** Le débordement de chaque défileur, dans l'ordre du document, à la largeur courante. */
async function mesurerDefileurs(page: Page): Promise<readonly MesureDefileur[]> {
  return page.locator('.defileur').evaluateAll((elements) =>
    elements.map((element) => ({
      nom: element.getAttribute('aria-label') ?? '(sans nom)',
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    })),
  );
}

/** Imprime l'inventaire du débordement — le journal fait foi (L-005). */
function journaliserDebordement(largeur: string, mesures: readonly MesureDefileur[]): void {
  console.log(`Défileurs — débordement mesuré à ${largeur} :`);
  for (const mesure of mesures) {
    console.log(
      `  • « ${mesure.nom} » — scrollWidth ${String(mesure.scrollWidth)} / ` +
        `clientWidth ${String(mesure.clientWidth)} → ` +
        `${mesure.scrollWidth > mesure.clientWidth ? 'déborde' : 'TIENT DANS SA BOÎTE'}`,
    );
  }
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
      'piège du focus (WCAG 2.1.2), ou page devenue beaucoup plus longue que tout ce que ' +
      'ce dépôt a publié jusqu’ici (relever LIMITE_APPROCHE seulement après avoir écarté le piège)',
  );
}

/**
 * Tabule jusqu'à ce que le focus soit posé sur un défileur, et renvoie son nom.
 *
 * Volontairement écrit SANS supposer que les défileurs se suivent : ils se suivaient
 * dans la fixture, une leçon qui intercale un lien entre deux blocs de code ne le fait
 * plus, et cette aide continue de fonctionner.
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
 * est un, et à 1280 px il y en avait huit sur huit dans la fixture. Le `describe` de
 * la largeur par défaut, en bas de fichier, imprime ce reste-là.
 */
test('le parcours au clavier atteint TOUS les défileurs du DOM, et UN SEUL focalisable par figure de code', async ({
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
  const auDom = await nomsAuDom(page);

  // Le journal fait foi (L-005) : le compte total appartient au CONTENU de la leçon
  // publiée et n'est donc pas épinglé — mais il s'imprime, parce qu'un écart s'y lit.
  console.log(
    `Défileurs — parcours complet de « ${CHEMIN_LECON} » : ${String(arrets.length)} arrêt(s) de ` +
      `tabulation, dont ${String(defileurs.length)} défileur(s) et ${String(enTrop.length)} arrêt(s) ` +
      'dans une figure de code sans être le défileur.',
  );

  // 🔴 LA NON-RÉGRESSION DU 16 → 8, MESURÉE DANS UN NAVIGATEUR. Si le transformateur
  // `drjst-pre-sans-tabindex` était débranché, ou si Shiki reposait son `tabindex`
  // sous un autre nom, chaque figure rendrait DEUX arrêts — un nommé et défilant, un
  // muet et inerte — et c'est cette ligne, seule, qui le dirait.
  expect(
    enTrop.map((arret) => arret.description),
    'une figure de code porte DEUX focalisables : un arrêt de tabulation y est posé sans être ' +
      'son défileur — sans nom et sans rien à faire défiler (le défaut du lot B, 16 arrêts pour ' +
      '8 blocs). Ce test compte les focalisables PAR FIGURE ; il ne dit rien de savoir si un ' +
      'défileur a quelque chose à faire défiler (voir le describe « largeur par défaut »)',
  ).toEqual([]);

  // CONTRÔLE POSITIF — sans lui, une leçon sans le moindre bloc de code rendrait tout
  // ce fichier « 0 sur 0 conforme », donc vert et vide (L-005/L-019).
  expect(
    auDom.length,
    'la page de leçon mesurée ne porte AUCUN défileur de code : ce fichier n’a rien mesuré. ' +
      'Une leçon publiée sans un seul bloc de code est possible, mais alors ces gates ne ' +
      'gardent plus rien — il faut le savoir, pas le laisser passer en vert.',
  ).toBeGreaterThan(0);

  // ET AUCUN DÉFILEUR N'EST RESTÉ EN DEHORS DU PARCOURS. Les deux comptes viennent de
  // deux sources différentes — l'un des tabulations pressées, l'autre du DOM : un
  // défileur qui perdrait son `tabindex` serait toujours dans le second, plus dans le
  // premier, et l'écart se lit ici (jamais dans un seul des deux).
  expect(
    defileurs.map((arret) => arret.nom),
    'le parcours au clavier n’atteint pas exactement les défileurs du DOM, dans l’ordre du ' +
      'document — un défileur a perdu son tabindex, ou l’ordre de tabulation ne suit plus le ' +
      'document (WCAG 2.4.3)',
  ).toEqual([...auDom]);
});

test('chaque défileur porte un nom accessible non vide, DISTINCT sur la page, et de rang CONTINU', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);

  const noms = await nomsAuDom(page);

  console.log(`Défileurs — noms accessibles relevés : ${noms.map((nom) => `« ${nom ?? '(null)'} »`).join(', ')}`);

  // LA GARDE « VERT ET VIDE », EN TÊTE — c'était le seul test des six à en manquer
  // (constat de revue du lot C). À zéro défileur relevé, les boucles ci-dessous ne
  // tournent pas et `new Set([]).size === 0` satisfait l'unicité : le test passerait
  // vert en ne prouvant rien.
  expect(noms.length, 'aucun défileur relevé : le test serait vert et vide').toBeGreaterThan(0);

  // 4.1.2 — un `role="group"` sans nom accessible est un groupe anonyme : le lecteur
  // d'écran annonce « groupe » et rien d'autre.
  for (const nom of noms) {
    expect(nom, 'un défileur n’a pas de nom accessible (role="group" anonyme, WCAG 4.1.2)')
      .not.toBeNull();
    expect((nom ?? '').trim(), 'un défileur porte un nom accessible VIDE').not.toBe('');
  }

  // 🔴 L'UNICITÉ, EXIGÉE EXPLICITEMENT — c'est ce que le lot C1 a rendu vrai. Avant
  // lui, la numérotation repartait de 1 à chaque section : quatre défileurs
  // s'appelaient « Code n°1 » et seul leur langage les séparait. Deux blocs du même
  // langage dans deux sections auraient donné deux HOMONYMES stricts — indiscernables
  // à l'oreille comme dans une liste de régions.
  expect(
    new Set(noms).size,
    `deux défileurs portent le même nom accessible : ${noms.join(' | ')}`,
  ).toBe(noms.length);

  // Et la FORME du nom, en plus de son unicité : l'unicité seule serait satisfaite par
  // des chaînes arbitraires. Le rang est ce qui distingue, il doit être là.
  const rangsParGenre = new Map<string, number[]>();
  for (const nom of noms) {
    const correspondance = FORME_DU_NOM.exec(nom ?? '');
    expect(
      correspondance,
      `« ${nom ?? ''} » ne suit pas la forme « <genre> n°<rang> — <langage> » ` +
        '(séparateur U+00A0 avant le tiret, cf. RenduBlocs.etiquetteCode)',
    ).not.toBeNull();
    if (correspondance === null) continue;

    // `?? ''` / `?? NaN` plutôt qu’un `!` : `noUncheckedIndexedAccess` a raison sur le TYPE
    // (un groupe de capture peut être vide), même si `.not.toBeNull()` ci-dessus garantit la
    // VALEUR. Un `NaN` de repli échouerait bruyamment à l’assertion de rang, jamais en silence.
    const genre = correspondance[1] ?? '';
    const rangs = rangsParGenre.get(genre) ?? [];
    rangs.push(Number(correspondance[2] ?? NaN));
    rangsParGenre.set(genre, rangs);
  }

  // 🔴 LA NUMÉROTATION CONTINUE DU LOT C1 — ce qui remplace la liste des huit noms.
  // La page monte un `RenduBlocs` par section ; sans le décalage propagé, chaque
  // section repartirait de 1 et les rangs d'un même genre feraient 1, 2, 1, 2. On
  // n'épingle donc PAS les valeurs (ce serait l'inventaire éditorial), on épingle leur
  // PROGRESSION : premier rang à 1, puis strictement croissante. Cette assertion vaut
  // pour une leçon de 3 blocs comme pour une leçon de 40.
  //
  // ⚠️ « CONTINUE » ET NON « STRICTEMENT CROISSANTE » (correctif du 2026-08-20). Les
  // deux assertions précédentes — premier rang à 1, puis chaque rang supérieur au
  // précédent — laissaient passer `1, 2, 4`, c'est-à-dire un rang SAUTÉ. Or la
  // décision du lot C écrite au CLAUDE.md dit « numérotation CONTINUE sur toute la
  // page » : un trou signifie qu'une figure a été comptée par le décalage de section
  // sans être rendue, et le lecteur cherche en vain la « figure n°3 ». L'égalité à
  // `1..n` dit les deux propriétés d'un coup, et elle dit AUSSI le compte.
  for (const [genre, rangs] of rangsParGenre) {
    expect(
      rangs,
      `les rangs de « ${genre} » ne sont pas CONTINUS depuis 1 (${rangs.join(', ')}) — soit la ` +
        'numérotation ne démarre pas au début du document, soit le décalage de section du lot C1 ' +
        'compte une figure que la page ne rend pas. Un rang sauté envoie le lecteur chercher une ' +
        'figure inexistante ; un rang répété donne des HOMONYMES.',
    ).toEqual(rangs.map((_, index) => index + 1));
  }
});

test('au moins un défileur DÉBORDE à 320 px — sans quoi rien n’est mis à l’épreuve', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);

  const mesures = await mesurerDefileurs(page);
  journaliserDebordement('320 px (largeur de référence WCAG 1.4.10)', mesures);

  expect(mesures.length, 'aucun défileur mesuré : le test serait vert et vide').toBeGreaterThan(0);

  // 🔴 LE CONTRÔLE POSITIF DE TOUT LE FICHIER, ET LA RAISON D'ÊTRE DE LA LARGEUR DE
  // 320 px. On n'exige plus « chaque défileur déborde » — c'était l'inventaire de la
  // fixture, avec son exception nommée, et une leçon dont tous les blocs tiennent en
  // 40 colonnes la ferait rougir sans qu'aucun défaut d'accessibilité n'existe. Ce
  // qu'on exige est que la page mette la mécanique à l'épreuve : si RIEN ne déborde à
  // la largeur la plus étroite que le site promette de servir, alors les tests de
  // flèche et d'indicateur de focus ci-dessous ne prouvent rien, et ce fichier serait
  // « 0 sur 0 conforme » — le vert vide que L-005/L-019 nomment.
  const debordent = mesures.filter((mesure) => mesure.scrollWidth > mesure.clientWidth);
  expect(
    debordent.length,
    `aucun des ${String(mesures.length)} défileur(s) ne déborde à 320 px : la leçon mesurée ne ` +
      'met AUCUNE région défilante à l’épreuve, donc les mesures de défilement et d’indicateur ' +
      'de focus de ce fichier ne gardent rien. Deux causes possibles, et il faut trancher : la ' +
      'leçon n’a que des blocs courts (fait de contenu, à constater), ou l’enveloppe `.defileur` ' +
      'a perdu son `overflow-x` (régression du lot B).',
  ).toBeGreaterThan(0);

  console.log(
    `Défileurs — ${String(debordent.length)} sur ${String(mesures.length)} débordent à 320 px : ` +
      `${debordent.map((mesure) => `« ${mesure.nom} »`).join(', ')}.`,
  );
});

test('une flèche droite fait DÉFILER chaque défileur qui déborde — c’est le fond de WCAG 2.1.1', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);

  const mesures = await mesurerDefileurs(page);
  const defilements: string[] = [];
  let exerces = 0;

  for (const [index, mesure] of mesures.entries()) {
    const nom = await tabulerJusquAuDefileurSuivant(page, 'Tab');
    expect(
      nom,
      'les défileurs ne sont pas atteints dans l’ordre du document (WCAG 2.4.3)',
    ).toBe(mesure.nom);

    if (mesure.scrollWidth <= mesure.clientWidth) {
      // Un défileur qui n'a rien à faire défiler n'est pas un défaut : c'est un fait
      // de contenu (un bloc court tient dans sa boîte). On l'imprime, on ne
      // l'assertionne pas — l'assertion qui compte est le contrôle positif du test
      // précédent, qui exige qu'au moins un défileur soit mis à l'épreuve.
      defilements.push(`« ${nom} » — rien à faire défiler (contenu plus étroit que la boîte)`);
      continue;
    }

    const defileur = page.locator('.defileur').nth(index);
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
    exerces++;
  }

  console.log(`Défileurs — défilement à la flèche droite :\n  • ${defilements.join('\n  • ')}`);
  expect(
    exerces,
    'la boucle n’a fait défiler AUCUN défileur : le test serait vert et vide (aucun ne débordait, ' +
      'ce que le contrôle positif du test précédent aurait dû attraper avant)',
  ).toBeGreaterThan(0);
});

test('chaque défileur porte un indicateur de focus calculé, et il n’est pas masqué', async ({
  page,
}) => {
  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);

  // ÉTAT AU REPOS relevé AVANT toute tabulation, sur la page ENTIÈRE : les index
  // renvoyés par la mesure sont ceux de l'ordre du document complet.
  const auRepos = await releverEtatAuRepos(page);
  const noms = await nomsAuDom(page);

  const mesures: MesureFocus[] = [];
  for (const nomAttendu of noms) {
    const nom = await tabulerJusquAuDefileurSuivant(page, 'Tab');
    expect(nom).toBe(nomAttendu ?? '');

    const mesure = await mesurerArretFocalise(page);
    if (mesure === null) {
      throw new Error(
        `« ${nomAttendu ?? ''} » : le focus n’est sur aucun focalisable de la page — le défileur ` +
          'est-il encore compté par SELECTEUR_FOCALISABLES ?',
      );
    }
    mesures.push(mesure);
  }

  journaliserMesures(`les défileurs de « ${CHEMIN_LECON} » (fenêtre 320 px)`, mesures);

  expect(
    mesures.length,
    'la boucle de tabulation n’a mesuré aucun défileur : le test serait vert et vide',
  ).toBe(noms.length);
  expect(mesures.length, 'aucun défileur sur la page : le test serait vert et vide').toBeGreaterThan(
    0,
  );

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

test('aucun piège du focus : Maj+Tab remonte tous les défileurs en miroir', async ({ page }) => {
  await page.goto(CHEMIN_LECON);
  await attendreHydratation(page);

  const noms = await nomsAuDom(page);
  expect(noms.length, 'aucun défileur : le miroir serait vert et vide').toBeGreaterThan(0);

  // Aller.
  for (const nomAttendu of noms) {
    expect(await tabulerJusquAuDefileurSuivant(page, 'Tab')).toBe(nomAttendu ?? '');
  }

  // Retour : miroir exact. Un piège n'est pas toujours symétrique — une région
  // défilante focalisable peut très bien laisser entrer et retenir vers l'arrière si
  // quelqu'un pose un jour une gestion maison des touches par-dessus.
  const auRetour = [...noms].reverse().slice(1);
  for (const nomAttendu of auRetour) {
    expect(
      await tabulerJusquAuDefileurSuivant(page, 'Shift+Tab'),
      'le retour ne repasse pas par les défileurs dans l’ordre inverse (WCAG 2.1.2)',
    ).toBe(nomAttendu ?? '');
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
// largeur réellement servie à un visiteur de bureau — les défileurs ne débordent
// généralement PAS (zéro sur huit sur la fixture témoin). Ils portent alors un
// `tabindex="0"` qui ne fait défiler rien.
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
// le journal fait foi (L-005) — et elle changera de valeur toute seule quand la mise
// en page ou le contenu de la leçon publiée bougera.
// =============================================================================
test.describe('la largeur par défaut — la dette imprimée, pas assertionnée', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('combien de défileurs n’ont rien à faire défiler à 1280 px (mesure au journal)', async ({
    page,
  }) => {
    await page.goto(CHEMIN_LECON);
    await attendreHydratation(page);

    const mesures = await mesurerDefileurs(page);
    const sansEmploi = mesures.filter((mesure) => mesure.scrollWidth <= mesure.clientWidth);

    console.log(
      `Défileurs — largeur par défaut (1280 px) : ${String(sansEmploi.length)} défileur(s) sur ` +
        `${String(mesures.length)} ne débordent PAS, donc autant de tabindex="0" sans rien à ` +
        'faire défiler. Constat porté à la clôture du lot C — pas un échec WCAG, pas une ' +
        'régression : la classe de bruit clavier que le lot B a retirée, revenue par la mise en page.',
    );
    journaliserDebordement('1280 px (fenêtre par défaut du projet)', mesures);
  });
});
