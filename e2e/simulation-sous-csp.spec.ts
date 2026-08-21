// =============================================================================
// `style-src` MESURÉ, simulation à l'écran — et le contrôle positif qui manquait
// (E2-ST5, lot c2 — dette S-016)
// -----------------------------------------------------------------------------
// CE QUE CE FICHIER FERME, ET QU'AUCUN AUTRE GATE NE FERMAIT.
// Le dépôt prouve depuis E2-ST3 que `script-src` est RÉELLEMENT APPLIQUÉ : un
// script inline non haché injecté par la page est refusé, compté, journalisé
// (`bascule-theme.spec.ts`, `quiz-sous-csp.spec.ts`). `style-src` n'avait AUCUNE
// preuve équivalente — et c'est la directive la plus mouvante du dépôt :
//   · elle est DÉRIVÉE de l'artéfact (contrairement à la liste blanche nominative
//     de `script-src`, S-005) ; un bloc `<style>` de plus s'y ajoute tout seul ;
//   · la clôture d'E3-ST1 vient de la faire passer de 10 à 13 hachages en publiant
//     la première leçon ;
//   · une directive dérivée sans preuve de REFUS peut devenir permissive sans
//     qu'aucun gate ne rougisse — c'est exactement la dette S-016.
//
// 🔴 DEUX GARDES DANS CE FICHIER, ET C'EST LE POINT (2026-08-20). Les deux mesures
// de `style-src` — (a) et (b) — sont gardées par `exigerUneLeconAvecQuiz` ; seul le
// lien profond (c), qui a réellement besoin d'une simulation, est gardé par
// `exigerUneLeconAvecSimulation`. La leçon 01 publiée n'a pas de simulation : garder
// tout le fichier derrière ce second garde aurait ÉTEINT la seule preuve live que
// `style-src` est appliqué dans le commit même qui l'élargit de 10 à 13 hachages —
// « Enabler ≠ enforcement », `.claude/rules/security.md` §1.
//
// 🔴 POURQUOI LE CONTRÔLE POSITIF N'A PAS LA FORME DE CELUI DE `script-src`.
// S-016 posait la règle : ne jamais présumer qu'une directive est observable par
// `securitypolicyviolation` sans contrôle positif DÉDIÉ à cette directive, et
// vérifier `style-src` par un second canal, structurel — `getComputedStyle`. La
// forme retenue mesure donc l'EFFET, pas l'événement, et exerce quatre canaux dans
// la même page : deux qui doivent être refusés, un qui doit passer (l'instrument),
// un quatrième hors périmètre. Le détail vit dans `e2e/aides/sonde-csp.ts`, à côté
// du contrôle de `script-src`, pour que tout appelant en dispose.
//
// ⚠️ ET CE CHOIX A PAYÉ TOUT DE SUITE : la mesure du 2026-08-19 CORRIGE la prémisse
// de L-041 / S-016. Ce n'est pas « une écriture CSSOM est refusée en silence » ;
// c'est `setAttribute('style', …)` qui est refusé — et il émet bien
// `style-src-attr` —, tandis qu'un `element.style.setProperty(…)` s'APPLIQUE, hors
// du périmètre de la directive. La mesure d'origine (`el.style.top = '-200px'` sur
// un élément statique) portait sur une propriété sans effet : un artefact, pas un
// refus. Les valeurs des quatre canaux sont imprimées au journal de ce fichier.
//
// LES DEUX INSTRUMENTS, ET POURQUOI IL EN FAUT DEUX.
//   (a) CÔTÉ ARTÉFACT — les blocs `<style>` de CETTE page sont énumérés, hachés et
//       confrontés un par un à la directive SERVIE. Le générateur, lui, épingle un
//       NOMBRE sur l'artéfact entier : il ne dit rien de la page de leçon en
//       particulier, et surtout rien de ce que le document porte APRÈS hydratation.
//       L'énumération est donc faite une fois la page actionnée — c'est la
//       transposition de S-005 à `style-src` : un composant qui monterait sa feuille
//       au runtime ajouterait un bloc que l'artéfact ne contient pas.
//   (b) CÔTÉ NAVIGATEUR — `npx swa start` applique la politique, le quiz est
//       réellement actionné (réponse, correction, résumé produit par le composant),
//       et le témoin prouve que la politique est APPLIQUÉE et non `report-only`.
//
// ⚠️ CE FICHIER NE DÉPLACE RIEN PAR LE STYLE (L-041). Les seules écritures de style
// qu'il contient sont celles de la SONDE, dont le refus est le sujet.
//
// PÉRIMÈTRE — ce qui n'est PAS ici. La mécanique de la simulation (modèle C′,
// `anchorScrolling`, mouvement réduit, couleurs forcées) est mesurée par
// `simulation-mecanique.spec.ts` (lot c1) ; le parcours clavier par
// `parcours-clavier-simulation.spec.ts`. Ce fichier ne les rejoue pas : il actionne
// juste assez pour que « zéro violation » porte sur une page VIVANTE.
// =============================================================================

import { Page, expect, test } from '@playwright/test';

import {
  ROUTE_LECON_QUIZ,
  exigerUneLeconAvecQuiz,
  exigerUneLeconAvecSimulation,
} from './aides/artefact-mesure';
import { attendreHydratation } from './aides/hydratation';
import {
  MOTIFS_CSP,
  exigerCspServie,
  exigerStyleSrcApplique,
  lireViolations,
  surveiller,
} from './aides/sonde-csp';
import { ROUTE_LECON_SIMULATION, attendreCourante, idEtape, lireEtat } from './aides/simulation';

/**
 * Les blocs `<style>` que porte la page mesurée par CE test — MESURÉS sur l'artéfact de
 * PRODUCTION, jamais déduits.
 *
 * 🔴 CE BLOC A ÉTÉ RÉÉCRIT LE 2026-08-21 (E3-ST3), PAS ANNOTÉ, parce que ce qu'il disait
 * était devenu faux sur trois points à la fois : le compte de l'artéfact (13), le nombre de
 * pages (4) et la promesse « il reviendra à E3-ST3, et rougira ici ». Un relecteur qui
 * recomposait l'union depuis cette liste obtenait le mauvais total — et un chiffre de
 * sécurité faux dans un commentaire est exactement ce qui fabrique la prochaine erreur de
 * compte (S-005).
 *
 * ⚠️ CE QUI A CHANGÉ, ET QUI VAUT POUR TOUT LITTÉRAL DU DÉPÔT NOMMÉ « …_PAGE_LECON » :
 * depuis qu'il y a TROIS leçons publiées, « la page de leçon » n'est plus un objet unique.
 * Les deux constantes ci-dessous décrivent deux pages DIFFÉRENTES, et le disent.
 *
 * L'état mesuré au 2026-08-21, page par page — 6 pages, 14 hachages distincts en union :
 *   · accueil                        7 blocs
 *   · `cours/securite-web/injection` 7 blocs — coquille (1 746 o), en-tête (5 305 o),
 *     pied (473 o), `lecon` (5 782 o), `.prose` (7 190 o), `.simulation` (4 775 o),
 *     `.quiz` (6 108 o). C'est ELLE qui porte le 14ᵉ hachage, et elle seule.
 *   · `cours/securite-web/evaluation-cvss` 6 blocs · `…/fondamentaux` 6 blocs
 *   · sommaire 5 blocs · 404 4 blocs
 *
 * 📉 Historique du compte de la page du QUIZ : 8 → 7 le 2026-08-20 (clôture d'E3-ST1 — le
 * 8ᵉ bloc était `.simulation`, qui n'existait que sur l'artéfact de FIXTURE), puis 7 → 6 le
 * 2026-08-20 (bascule E6 — sortie du bloc de `BasculeTheme`, le sélecteur de thème étant
 * retiré en phase 1 à thème unique). ⚠️ Ce second retrait n'a RIEN relâché, et l'ordre des
 * assertions le prouve : `orphelins` — « chaque bloc du DOM vivant est NOMMÉ par le
 * `style-src` servi » — est évalué AVANT le compte, et il est passé vert pendant que le
 * littéral rougissait.
 *
 * ⚠️ RECOPIÉS EN DUR, jamais importés de l'outil qui les calcule (L-012) : c'est la
 * duplication qui fait de ce fichier le second endroit revu quand un composant porteur de
 * styles entre dans une page de leçon.
 */
// La page du QUIZ : `ROUTE_LECON_QUIZ`, première page prerendue portant `<app-quiz` —
// aujourd'hui `evaluation-cvss`, qui n'a PAS de simulation. D'où 6 et non 7.
// ⚠️ Il rougira le jour où la première leçon de l'ordre alphabétique portera une simulation,
// et ce sera une revue légitime, pas un faux positif.
const BLOCS_STYLE_PAGE_QUIZ = 6;

// La page de la SIMULATION : `ROUTE_LECON_SIMULATION`, aujourd'hui `injection`. Elle porte le
// 14ᵉ hachage de l'artéfact — donc c'est la seule page dont la mesure « 0 orphelin » couvre
// le bloc `.simulation`. Sans le test qui l'emploie, le hachage le plus récemment ajouté à
// `style-src` serait le seul que rien n'énumère sur la page qui le produit.
const BLOCS_STYLE_PAGE_SIMULATION = 7;

/**
 * Actionne le QUIZ juste assez pour que la page soit VIVANTE : une réponse, une
 * correction, et la preuve que le composant — et non le DOM natif — a répondu.
 * Sans ce parcours, « zéro violation » serait le zéro d'une page morte.
 *
 * 🔴 POURQUOI LE QUIZ ET NON LA SIMULATION (2026-08-20). Ces deux tests mesurent
 * `style-src`, la seule directive du dépôt qui soit DÉRIVÉE de l'artéfact — ils
 * sont donc la seule preuve LIVE que `style-src` est appliqué (`.claude/rules/security.md`
 * §1, « Enabler ≠ enforcement »). Les laisser derrière le garde de SIMULATION les
 * aurait éteints jusqu'à E3-ST3, dans le commit même qui fait passer `style-src`
 * de 10 à 13 hachages. Ils n'ont jamais eu besoin d'une simulation : il leur faut
 * une page de leçon HYDRATÉE portant les blocs `<style>` de ses composants.
 *
 * ⚠️ Aucune aide de `aides/simulation.ts` ici, et c'est voulu : ces deux tests ne
 * doivent plus rien au sujet du reste du fichier.
 */
async function actionnerLeQuiz(page: Page): Promise<void> {
  // Une barrière auto-réessayée après CHAQUE geste, jamais une lecture ponctuelle :
  // l'effet est peint sur une frame ultérieure (L-057).
  const premierChoix = page.getByRole('radio').first();
  await premierChoix.check();
  await expect(premierChoix, 'la première réponse n’a pas été enregistrée').toBeChecked();

  await page.getByRole('button', { name: 'Corriger mes réponses' }).click();

  // Le résumé ne se remplit QUE par le composant : un DOM natif non hydraté
  // laisserait ce `role="status"` vide, et le « zéro violation » ne porterait alors
  // sur aucun geste réellement reçu (L-033).
  await expect(
    page.getByRole('status'),
    '« Corriger » n’a produit aucun résumé : le quiz n’a pas été actionné, le « zéro violation » ne porterait sur rien',
  ).toHaveText(/\d+ bonnes? réponses? sur \d+ questions? corrigées?\./);
}

/**
 * Les blocs `<style>` que le DOCUMENT porte À CET INSTANT, hachés comme le fait
 * `tools/deploiement/generer-config-swa.mjs` (normalisation des fins de ligne,
 * puis sha256 en base64).
 *
 * On lit le DOM ANALYSÉ par le navigateur — pas une regex sur le HTML : c'est
 * l'analyseur le plus fidèle qui soit, puisque c'est celui qui applique la
 * politique (règle « on analyse, on ne balaie pas », `.claude/rules/security.md` §4).
 */
async function hachagesDesBlocsStyle(
  page: Page,
): Promise<{ hachage: string; taille: number; debut: string; parent: string }[]> {
  return page.evaluate(async () => {
    const enBase64 = (tampon: ArrayBuffer): string => {
      let binaire = '';
      for (const octet of new Uint8Array(tampon)) {
        binaire += String.fromCharCode(octet);
      }
      return btoa(binaire);
    };

    const blocs = Array.from(document.querySelectorAll('style'));
    const mesures = [];
    for (const bloc of blocs) {
      const contenu = (bloc.textContent ?? '').replace(/\r\n?/g, '\n');
      const empreinte = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(contenu));
      mesures.push({
        hachage: `'sha256-${enBase64(empreinte)}'`,
        taille: contenu.length,
        debut: contenu.slice(0, 60).replace(/\s+/g, ' '),
        parent: (bloc.parentElement?.tagName ?? '(sans parent)').toLowerCase(),
      });
    }
    return mesures;
  });
}

// -----------------------------------------------------------------------------
// 🔴 LES DEUX MESURES DE `style-src` — gardées par le QUIZ, pas par la simulation
// -----------------------------------------------------------------------------
// Elles sont la SEULE preuve live que `style-src` est appliqué : `exigerStyleSrcApplique`
// n'a pas d'autre appelant, et `quiz-sous-csp.spec.ts` ne couvre que `script-src`.
// D'où leur propre garde, ouvert dès qu'une leçon publiée porte un quiz.
// -----------------------------------------------------------------------------

test.describe('`style-src` mesuré sur la page de leçon hydratée (S-016)', () => {
  exigerUneLeconAvecQuiz('`style-src` mesuré sur une page de leçon vivante (S-016)');

  // (a) L'instrument ARTÉFACT — chaque bloc de la page, nommé, confronté à la directive
  test('chaque bloc `<style>` de la page de leçon actionnée est NOMMÉ dans le `style-src` servi', async ({
    page,
  }) => {
    const journal = await surveiller(page);

    const reponse = await page.goto(ROUTE_LECON_QUIZ);
    const politique = exigerCspServie(reponse);

    await attendreHydratation(
      page,
      'le chunk paresseux de la leçon a-t-il été refusé par `script-src` ?',
    );
    await actionnerLeQuiz(page);

    // La directive telle qu'elle est SERVIE — pas celle du dépôt. `exigerCspServie` a
    // déjà prouvé que les deux coïncident à l'octet près ; on lit donc la servie, qui
    // est celle que le moteur applique.
    const directive = /style-src[^;]*/.exec(politique)?.[0] ?? '';
    const hachagesServis = new Set(directive.match(/'sha256-[^']+'/g) ?? []);
    expect(
      directive,
      'la CSP servie ne porte plus `style-src` : les blocs de style de la page ne sont plus contraints du tout',
    ).not.toBe('');
    expect(
      directive,
      "`style-src` ne porte plus `'self'` : la feuille de coloration syntaxique et les polices tomberaient, et le canal autorisé du contrôle positif n’existerait plus",
    ).toContain("'self'");

    const blocs = await hachagesDesBlocsStyle(page);

    // Le journal fait foi (L-005) : chaque bloc est IMPRIMÉ, avec sa taille et son
    // début, pour que le compte soit vérifiable par un humain et non une promesse.
    for (const [rang, bloc] of blocs.entries()) {
      console.log(
        `style [${String(rang)}] ${String(bloc.taille)} o · <${bloc.parent}> · ` +
          `${hachagesServis.has(bloc.hachage) ? 'NOMMÉ' : '🔴 ABSENT'} · ${bloc.hachage.slice(0, 22)}… · ${bloc.debut}`,
      );
    }

    const orphelins = blocs.filter((bloc) => !hachagesServis.has(bloc.hachage));
    expect(
      orphelins.map((bloc) => `${String(bloc.taille)} o — ${bloc.debut}`),
      'un bloc `<style>` présent dans le DOM n’est PAS nommé par le `style-src` servi. Soit il a été monté au RUNTIME (transposition de S-005 à `style-src` : la politique est dérivée de l’artéfact, pas du DOM vivant), soit l’artéfact servi n’est pas celui qui a produit la politique',
    ).toEqual([]);

    expect(
      blocs.length,
      `la page de leçon ne porte plus ${String(BLOCS_STYLE_PAGE_QUIZ)} blocs <style> : un composant porteur de styles est entré ou sorti. Faire relire l’artéfact par « security-reviewer », PUIS reporter le nouveau compte ICI et dans NOMBRE_HACHAGES_STYLE_ATTENDU de « tools/deploiement/generer-config-swa.mjs » (recopié dans « src/config-swa-provenance-style.spec.ts »). Jamais l’inverse`,
    ).toBe(BLOCS_STYLE_PAGE_QUIZ);

    console.log(
      `style-src servi : ${String(hachagesServis.size)} hachage(s) sur l’artéfact entier, ` +
        `${String(blocs.length)} bloc(s) sur cette page, 0 orphelin.`,
    );

    // Et rien n'a été refusé pendant tout cela — les trois collecteurs.
    const violations = await lireViolations(page, journal);
    expect(
      violations,
      `la CSP a refusé une ressource pendant l’actionnement du quiz. Journal : ${violations.join(' · ')}`,
    ).toEqual([]);
    expect(
      journal.messages.filter((message) => MOTIFS_CSP.test(message)),
      'la console porte un refus qui ressemble à une violation de CSP',
    ).toEqual([]);
    expect(
      journal.messages.filter((message) => message.startsWith('[error]')),
      'erreur(s) de console pendant l’actionnement du quiz',
    ).toEqual([]);
    expect(journal.erreurs, 'exception(s) non rattrapée(s)').toEqual([]);
  });

  // (b) 🔴 LE CONTRÔLE POSITIF DE `style-src` — la dette S-016
  test('CONTRÔLE POSITIF — `style-src` REFUSE réellement, et sur la page où le quiz vient d’être actionné', async ({
    page,
  }) => {
    // POURQUOI ICI, ET PAS SUR LA PAGE D'ACCUEIL. Deux choses séparent cette mesure
    // de celle qu'un contrôle d'accueil produirait : le DOCUMENT (la page de leçon
    // porte trois feuilles de composant que l'accueil n'a pas, dont celle du quiz)
    // et l'INSTANT (après hydratation d'un chunk paresseux et après des gestes). Un
    // contrôle positif qui ne mord ni au même endroit ni au même moment que
    // l'assertion qu'il garde ne garde rien.
    const journal = await surveiller(page);

    const reponse = await page.goto(ROUTE_LECON_QUIZ);
    const politique = exigerCspServie(reponse);
    expect(politique, 'la CSP servie ne restreint pas `style-src`').toContain('style-src');

    await attendreHydratation(page);
    await actionnerLeQuiz(page);

    const mesure = await exigerStyleSrcApplique(page);

    console.log(
      'Contrôle positif `style-src` — ' +
        `initiale : ${mesure.initiale} · <style> non haché : ${mesure.elementNonHache} · ` +
        `setAttribute("style") : ${mesure.attributEnLigne} (le DOM porte « ${mesure.attributRelu} ») · ` +
        `CSSOM setProperty (hors périmètre) : ${mesure.cssomPropriete} · ` +
        `feuille de même origine : ${mesure.feuilleAutorisee} (${mesure.etatFeuilleAutorisee}, ` +
        `appliquée ${String(mesure.delaiApplication)} ms après son événement « load »).`,
    );

    // ⚠️ CE QUI SUIT EST UNE OBSERVATION IMPRIMÉE, PAS UNE ASSERTION — délibérément.
    // Le nombre exact de violations rapportées appartient au moteur : l'épingler
    // ferait rougir ce fichier le jour où Chromium signalerait DAVANTAGE,
    // c'est-à-dire sur une amélioration du navigateur. Ce qui FAIT FOI est l'effet,
    // assertionné ci-dessus dans `exigerStyleSrcApplique`.
    const violations = await lireViolations(page, journal);
    const surStyle = violations.filter((detail) => detail.startsWith('style-src'));
    console.log(
      `Observabilité (S-016) — ${String(surStyle.length)} violation(s) « style-src » rapportée(s) ` +
        `pour DEUX canaux refusés par l’effet : ${surStyle.join(' · ') || '(aucune)'}. ` +
        'Rappel de la mesure du 2026-08-19 : `element.style.setProperty(…)` s’applique et ' +
        'n’émet rien — non parce que la CSP serait muette, mais parce que ce canal n’est ' +
        'pas dans son périmètre. Un collecteur d’événements ne mesure donc pas « rien n’a ' +
        'été bloqué », il mesure « rien de ce que cet événement sait dire ».',
    );

    // La seule chose qu'on EXIGE côté observabilité : qu'au moins un des deux
    // détecteurs ait vu passer quelque chose. Deux refus prouvés par l'effet sans
    // aucune trace, ni événement ni console, signifieraient que les deux collecteurs
    // de `sonde-csp.ts` sont muets — et le « zéro violation » du test précédent
    // vaudrait alors zéro.
    const enConsole = journal.messages.filter((message) => MOTIFS_CSP.test(message));
    expect(
      [...surStyle, ...enConsole],
      'la CSP a REFUSÉ un `<style>` inline non haché (prouvé par l’effet, plus haut) et AUCUN des deux collecteurs ne l’a vu : la sonde de `quiz-sous-csp.spec.ts` et celle du test précédent sont aveugles, leurs « zéro violation » ne prouvent plus rien',
    ).not.toEqual([]);

    // ET LA PAGE RESTE ACTIONNABLE. Sans cette ligne, une politique qui casserait
    // aussi le quiz passerait ce contrôle positif avec les honneurs.
    await page.getByRole('button', { name: 'Recommencer le quiz' }).click();
    await expect(
      page.getByRole('status'),
      'le quiz ne répond plus après la sonde : « Recommencer » n’a pas vidé le résumé',
    ).toHaveText('');
  });
});

// -----------------------------------------------------------------------------
// (c) Le lien profond — la CSP tient aussi quand l'état arrive par l'URL
// -----------------------------------------------------------------------------

test.describe('la CSP à l’amorçage d’une simulation par lien profond', () => {
  exigerUneLeconAvecSimulation('la CSP à l’amorçage d’une simulation par lien profond');

  test('arriver par un lien profond d’étape ne produit aucune violation de CSP', async ({
    page,
  }) => {
    // Le chemin d'amorçage L-033 (`amorcerDepuisLeFragment`, appelé depuis
    // `afterNextRender`) est le SEUL qui écrive l'état de la simulation avant le
    // premier geste. C'est donc le seul instant où le composant touche au DOM sans
    // qu'un `(click)` l'ait demandé — et le seul que les deux tests précédents ne
    // traversent pas.
    const journal = await surveiller(page);

    const reponse = await page.goto(`${ROUTE_LECON_SIMULATION}#${idEtape(4)}`);
    exigerCspServie(reponse);

    await attendreHydratation(page);
    // `amorcerDepuisLeFragment` court dans `afterNextRender` : `[ngh]`=0 ne dit rien
    // du moment où SON écriture atteint le DOM.
    await attendreCourante(
      page,
      4,
      'le fragment n’a pas été relu : ce test ne traverserait pas le chemin qu’il prétend mesurer',
    );
    expect(
      (await lireEtat(page)).courante,
      'le fragment n’a pas été relu : ce test ne traverserait pas le chemin qu’il prétend mesurer',
    ).toBe(4);

    const violations = await lireViolations(page, journal);
    expect(
      violations,
      `l’amorçage par lien profond a produit un refus de CSP. Journal : ${violations.join(' · ')}`,
    ).toEqual([]);
    // Le SECOND collecteur (S-016) : un refus vu par la console mais pas par l’événement
    // « securitypolicyviolation » resterait invisible sans lui — et L-041 a mesuré qu’une
    // écriture CSSOM refusée ne lève AUCUN événement.
    expect(
      journal.messages.filter((message) => MOTIFS_CSP.test(message)),
      'la console porte un refus qui ressemble à une violation de CSP à l’amorçage par lien profond',
    ).toEqual([]);
    expect(journal.erreurs, 'exception(s) non rattrapée(s) à l’amorçage par lien profond').toEqual(
      [],
    );
  });

  // 🔴 CE TEST EST NÉ D'UNE REVUE DE SÉCURITÉ (2026-08-21, E3-ST3), ET IL COMBLE UN TROU
  // QUE LE LOT AVAIT OUVERT SANS LE VOIR. Le lot fait passer `style-src` de 13 à
  // 14 hachages ; le 14ᵉ est le bloc `.simulation`, et il n'apparaît que sur CETTE page.
  // Or le test (a) — le seul qui ÉNUMÈRE les blocs du DOM et exige que chacun soit NOMMÉ
  // par la directive servie — navigue `ROUTE_LECON_QUIZ`, une page sans simulation. Le
  // hachage le plus récemment ajouté à la permission était donc le seul qu'aucun
  // instrument n'énumérait sur la page qui le produit : il ne restait que le compte
  // GLOBAL de l'artéfact, qui ne dit rien de l'origine d'un bloc.
  // C'est le patron « quand un lot augmente un compte de permission, recenser ce que les
  // instruments existants cessent de couvrir » — ici la couverture n'était pas éteinte,
  // elle avait simplement changé de page sous nos pieds.
  test('chaque bloc `<style>` de la page de SIMULATION actionnée est NOMMÉ dans le `style-src` servi', async ({
    page,
  }) => {
    const journal = await surveiller(page);

    const reponse = await page.goto(ROUTE_LECON_SIMULATION);
    const politique = exigerCspServie(reponse);

    await attendreHydratation(page);

    // La page doit être VIVANTE : un « zéro orphelin » mesuré sur une page inerte ne
    // dirait rien du bloc que le composant monte en s'animant. On replie donc la vue sur
    // une étape, et on attend que le composant — pas le DOM natif — ait répondu.
    await page.locator(`.simulation .liens-etapes a[href$="#${idEtape(3)}"]`).click();
    await attendreCourante(
      page,
      3,
      'la simulation n’a pas répondu au clic : la mesure porterait sur une page morte',
    );

    const directive = /style-src[^;]*/.exec(politique)?.[0] ?? '';
    const hachagesServis = new Set(directive.match(/'sha256-[^']+'/g) ?? []);
    expect(
      directive,
      'la CSP servie ne porte plus `style-src` : les blocs de style de la page ne sont plus contraints du tout',
    ).not.toBe('');

    const blocs = await hachagesDesBlocsStyle(page);

    // Le journal fait foi (L-005) : chaque bloc est IMPRIMÉ, pour qu'un humain puisse
    // vérifier que `.simulation` est bien du nombre plutôt que de nous croire.
    for (const [rang, bloc] of blocs.entries()) {
      console.log(
        `style [${String(rang)}] ${String(bloc.taille)} o · <${bloc.parent}> · ` +
          `${hachagesServis.has(bloc.hachage) ? 'NOMMÉ' : '🔴 ABSENT'} · ${bloc.hachage.slice(0, 22)}… · ${bloc.debut}`,
      );
    }

    const orphelins = blocs.filter((bloc) => !hachagesServis.has(bloc.hachage));
    expect(
      orphelins.map((bloc) => `${String(bloc.taille)} o — ${bloc.debut}`),
      'un bloc `<style>` de la page de simulation n’est PAS nommé par le `style-src` servi. Soit il a été monté au RUNTIME (transposition de S-005 à `style-src`, dérivé de l’artéfact et non du DOM vivant), soit l’artéfact servi n’est pas celui qui a produit la politique',
    ).toEqual([]);

    expect(
      blocs.length,
      `la page de simulation ne porte plus ${String(BLOCS_STYLE_PAGE_SIMULATION)} blocs <style> : un composant porteur de styles est entré ou sorti. Faire relire l’artéfact par « security-reviewer », PUIS reporter le nouveau compte ICI et dans NOMBRE_HACHAGES_STYLE_ATTENDU de « tools/deploiement/generer-config-swa.mjs ». Jamais l’inverse`,
    ).toBe(BLOCS_STYLE_PAGE_SIMULATION);

    // 🔴 L'ANTI-VACUITÉ. Sans elle, une page dont le bloc `.simulation` aurait disparu
    // passerait « 0 orphelin » avec les honneurs — c'est bien le bloc de la simulation
    // qu'on veut voir nommé, pas six blocs de coquille.
    expect(
      blocs.some((bloc) => bloc.debut.includes('.simulation')),
      'aucun bloc `<style>` de cette page ne porte `.simulation` : le 14ᵉ hachage de `style-src` n’est plus produit ici, et ce test ne mesure plus ce pour quoi il existe',
    ).toBe(true);

    expect(
      journal.messages.filter((message) => MOTIFS_CSP.test(message)),
      'la console porte un refus qui ressemble à une violation de CSP',
    ).toEqual([]);
    expect(
      (await lireViolations(page, journal)).length,
      'la CSP a refusé une ressource pendant l’actionnement de la simulation',
    ).toBe(0);
  });
});
