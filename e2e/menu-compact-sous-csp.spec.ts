// =============================================================================
// L'ACCUEIL SOUS LA CSP APPLIQUÉE — parcours réel + contrôle positif de `script-src`
// -----------------------------------------------------------------------------
// 🔴 CE FICHIER EST UN RE-HÉBERGEMENT, PAS UNE CRÉATION (bascule E6, 2026-08-20).
// `e2e/bascule-theme.spec.ts` a été supprimé avec la commande de thème qu'il
// pilotait. Le dépôt a une règle née d'un incident : QUAND UN LOT SUPPRIME UN SPEC
// OU LE FAIT SAUTER, ON RECENSE CE QUE CE SPEC ÉTAIT LE SEUL À PROUVER. Ce
// recensement a donné DEUX tests que rien d'autre ne portait, et les voici :
//
//   1. « le parcours interactif complet ne déclenche AUCUNE violation de CSP » —
//      la seule mesure du dépôt qui exécute un parcours d'utilisateur sur la PAGE
//      D'ACCUEIL, sous la politique réellement servie. `quiz-sous-csp.spec.ts` et
//      `simulation-sous-csp.spec.ts` mesurent la page de LEÇON : ils ne verraient
//      pas une violation propre à la coquille du site.
//   2. « CONTRÔLE POSITIF — un script inline non haché est refusé » — la preuve que
//      la politique servie est APPLIQUÉE et non `report-only`, sans laquelle le
//      « zéro » du test 1 est un silence, pas un résultat (L-019).
//
// CE QUI A CHANGÉ EN CHANGEANT DE SUJET. Le parcours interactif ne passe plus par
// un groupe de radios : il passe par le MENU COMPACT `<details class="menu">` de
// l'en-tête, livré par le lot précédent d'E6. C'est un meilleur sujet, pas un
// repli — le `<details>` natif fonctionne AVANT toute hydratation (piège L-033,
// c'est même la raison pour laquelle il a été choisi), donc le test traverse les
// deux régimes de la page : le prerendu inerte, puis l'hydraté.
//
// 🔴 LE CONTRÔLE POSITIF EST DEVENU PLUS FORT QU'AVANT, et c'est le cœur du lot.
// Jusqu'au 2026-08-20, `script-src` portait UN hachage — celui du script inline
// anti-flash de thème. Ce script a été supprimé : la directive s'écrit désormais
// `script-src 'self'`, liste blanche d'inline **VIDE**. Il n'y a donc plus aucun
// hachage à contourner, et aucune valeur qu'une régression pourrait élargir « juste
// un peu ». Le test ci-dessous exige en plus, explicitement, qu'aucun `'sha256-…'`
// ne soit revenu dans cette directive : c'est le garde-fou LIVE qui répond au
// garde-fou statique `hachagesScript.size !== 0` de
// `tools/deploiement/generer-config-swa.mjs`.
//
// ⚠️ LARGEUR DE FENÊTRE IMPOSÉE. `en-tete.scss` masque le `<summary>` au-delà de
// `$rupture-menu` (52,5 rem = 840 px) et rouvre le `<details>` en CSS. À la largeur
// par défaut de Playwright (1280 px), le menu compact N'EXISTE PAS à l'écran : ce
// fichier mesurerait la barre horizontale en croyant mesurer le menu. D'où le
// `test.use` ci-dessous, écrit en pixels et commenté — un chiffre nu se périme.
//
// ⚠️ RAPPEL DU TROISIÈME PIÈGE DU HARNAIS E2E : `playwright.config.ts` pose
// `reuseExistingServer: !CI`. Un `npx swa start` survivant d'un run précédent sert
// la CSP qu'il a lue à SON démarrage — reconstruire l'artéfact ne le lui apprend
// pas. Il ment dans les DEUX sens, et le sens dangereux rendrait VERT exactement ce
// que ce fichier existe pour attraper. En local, après tout rebâtissage : arrêter
// le processus qui écoute le port 4280 avant `npm run e2e`.
// =============================================================================

import { expect, test } from '@playwright/test';

import { attendreHydratation } from './aides/hydratation';
import {
  FenetreSondeeCsp,
  MOTIFS_CSP,
  exigerCspServie,
  lireViolations,
  surveiller,
} from './aides/sonde-csp';

// Sous les 840 px de `$rupture-menu` : c'est la seule plage où le `<summary>` est
// rendu et où le `<details>` est réellement replié.
test.use({ viewport: { width: 390, height: 844 } });

/** Les crochets que ce fichier pose EN PLUS de ceux de la sonde partagée. */
interface FenetreSondee extends FenetreSondeeCsp {
  /** Posé par le seul script que la CSP doit refuser (contrôle positif). */
  __drjstScriptInterditAExecute?: boolean;
}

test('le parcours interactif complet ne déclenche AUCUNE violation de CSP', async ({ page }) => {
  const journal = await surveiller(page);

  const reponse = await page.goto('/');

  // AVANT toute autre assertion : une politique est-elle seulement servie ?
  // `findSWAConfigFile` de l'émulateur SWA rend `null` quand
  // `staticwebapp.config.json` est absent OU invalide, et `swa start` démarre quand
  // même — sans `globalHeaders`, sans code d'erreur. Sans cette ligne, tout ce qui
  // suit serait vert en l'absence TOTALE de politique (classe S-003 : un garde-fou
  // doit prouver qu'il a vu quelque chose).
  exigerCspServie(reponse);

  // Le parcours doit toucher tout ce qui, sous CSP, peut échouer différemment :
  //  · le chargement lui-même (feuilles de style, polices auto-hébergées, module
  //    d'amorçage d'Angular) ;
  //  · le menu compact AU CLAVIER, avant comme après l'hydratation — `<details>`
  //    est natif, donc il répond dans les deux régimes (L-033) ;
  //  · une navigation du routeur, qui charge une route paresseuse et réécrit le DOM ;
  //  · un rechargement complet, qui rejoue tout depuis le HTML prerendu.
  const resume = page.locator('summary.bascule-menu');
  await expect(resume, 'le menu compact n’est pas rendu à cette largeur').toBeVisible();

  await resume.click();
  await expect(page.locator('details.menu')).toHaveAttribute('open', '');
  const lienCours = page.getByRole('link', { name: 'Sécurité des applications web' });
  await expect(lienCours).toBeVisible();

  // On attend l'hydratation AVANT de naviguer : sans elle, le clic ci-dessous
  // partirait sur le simple `href` du HTML prerendu et le routeur d'Angular ne
  // serait jamais exercé — le test se prononcerait sur une page inerte tout en
  // portant le nom « parcours interactif » (L-040).
  await attendreHydratation(page, 'le module d’amorçage a-t-il été refusé par `script-src` ?');

  await lienCours.click();
  await expect(page).toHaveURL(/\/cours\/securite-web\/?$/);
  await page.goBack();

  await page.reload();
  await attendreHydratation(page, 'le module d’amorçage a-t-il été refusé par `script-src` ?');

  // LA mesure de S-005 : ce que le navigateur a lui-même qualifié de violation.
  // Relue à cet instant, donc APRÈS tout ce que le rechargement a pu émettre.
  expect(
    await lireViolations(page, journal),
    'la CSP a refusé une ressource pendant le parcours interactif — relire `config/staticwebapp.config.source.json` et `src/app/app.config.ts` (S-005)',
  ).toEqual([]);

  // Le même constat par l'autre bout : ce que la console a écrit. Redondant tant
  // que tout va bien, et c'est voulu — si une version de Chromium cessait d'émettre
  // l'événement, ce filet resterait.
  expect(
    journal.messages.filter((message) => MOTIFS_CSP.test(message)),
    'la console porte un refus qui ressemble à une violation de CSP',
  ).toEqual([]);

  // Aucune exception non rattrapée : `eval` refusé par la CSP se manifeste ainsi,
  // et de toute façon une page de coquille qui lève n'a aucune excuse.
  expect(journal.erreurs, 'exception(s) non rattrapée(s) pendant le parcours').toEqual([]);

  // Le seul tri de tout ce fichier, et il est NOMMÉ : on exige zéro message de
  // niveau `error`, ce qui couvre aussi les ressources absentes (« Failed to load
  // resource… 404 »), qu'aucun autre gate ne verrait. Les niveaux `warning`/`info`
  // ne sont pas exigés vides : l'émulateur SWA et le navigateur en émettent qui ne
  // disent rien du site. Ils restent capturés dans `journal.messages`, donc soumis
  // au filtre CSP ci-dessus — c'est la différence entre « trier » et « ignorer ».
  expect(
    journal.messages.filter((message) => message.startsWith('[error]')),
    'erreur(s) de console pendant le parcours interactif',
  ).toEqual([]);
});

test('CONTRÔLE POSITIF — un script inline est refusé par la CSP, et les deux détecteurs le voient', async ({
  page,
}) => {
  // POURQUOI CE TEST EXISTE. Le test précédent exige une liste VIDE. Or une sonde
  // cassée, un écouteur jamais installé, un binding disparu ou une CSP en mode
  // rapport rendent exactement la même liste vide — et le vert se lit alors comme
  // une preuve. Ici on prouve que la sonde sait dire « présent ». Sans les deux
  // sens, un zéro n'est qu'un silence (L-019).
  //
  // LA VIOLATION EST VRAIE, PAS SIMULÉE. Le script est créé et inséré PAR LA PAGE
  // (`DOMContentLoaded`), donc c'est un nœud du document comme un autre, soumis à
  // `script-src`. Rien n'est falsifié : si la politique servie autorisait l'inline,
  // ce test rougirait — ce qui est précisément le but.
  const journal = await surveiller(page);

  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const script = document.createElement('script');
      // Charge utile inoffensive et OBSERVABLE : si elle s'exécute, le marqueur
      // existe. La seconde moitié du contrôle est là — on n'exige pas seulement que
      // la violation soit RAPPORTÉE, mais que le script ait été réellement EMPÊCHÉ.
      script.textContent = 'window.__drjstScriptInterditAExecute = true;';
      document.head.append(script);
    });
  });

  const reponse = await page.goto('/');
  const politique = exigerCspServie(reponse);
  expect(politique, 'la CSP servie ne restreint pas `script-src`').toContain('script-src');

  // 🔴 LE DURCISSEMENT D'E6, MESURÉ SUR LA POLITIQUE SERVIE ET NON SUR UN FICHIER.
  // `script-src` ne porte plus AUCUN hachage depuis le retrait du script inline
  // anti-flash : la liste blanche d'inline est vide, donc il n'existe plus de valeur
  // qu'une régression puisse élargir. Un `'sha256-…'` réapparu ici signifierait
  // qu'un script inline est revenu dans l'artéfact — et que le garde-fou statique
  // `hachagesScript.size !== 0` de `generer-config-swa.mjs` a été contourné.
  const scriptSrc = /(?:^|;)\s*script-src\b[^;]*/.exec(politique)?.[0] ?? '';
  expect(scriptSrc, '`script-src` est absente de la politique servie').not.toBe('');
  expect(
    scriptSrc,
    'un hachage est revenu dans `script-src` : un script inline a reparu dans l’artéfact (S-005)',
  ).not.toContain('sha256-');

  // On attend l'hydratation, comme le parcours : l'instant de lecture doit être le
  // même que celui où le test précédent conclut « zéro ».
  await attendreHydratation(page, 'le module d’amorçage a-t-il été refusé par `script-src` ?');

  const violations = await lireViolations(page, journal);

  // 1. LE DÉTECTEUR PRÉCIS a compté la violation, et c'est BIEN celle-ci :
  //    Chromium rapporte `script-src-elem` avec `blockedURI` à `inline`. Exiger la
  //    directive évite qu'une violation d'une tout autre origine (une police, une
  //    image) fasse passer ce contrôle pour concluant.
  expect(
    violations.filter((detail) => detail.startsWith('script-src') && detail.includes('inline')),
    "la CSP n'a PAS refusé un script inline, ou la sonde ne l'a pas vu — dans les deux cas le « zéro violation » du test précédent ne prouve rien",
  ).not.toEqual([]);

  // 2. LE FILET LARGE a écrit quelque chose lui aussi. Les deux détecteurs sont
  //    redondants par construction ; ce contrôle vérifie que la redondance existe
  //    encore, au lieu de deux détecteurs muets qui se couvrent l'un l'autre.
  expect(
    journal.messages.filter((message) => MOTIFS_CSP.test(message)),
    'la console ne porte aucun refus alors que la CSP vient d’en produire un : `MOTIFS_CSP` ne reconnaît plus la formulation de ce Chromium',
  ).not.toEqual([]);

  // 3. LE REFUS A EU LIEU. Une CSP en `report-only`, ou un `script-src` ouvert,
  //    rapporterait sans bloquer : le marqueur existerait.
  const aExecute = await page.evaluate(
    () => (window as FenetreSondee).__drjstScriptInterditAExecute === true,
  );
  expect(
    aExecute,
    'le script inline s’est EXÉCUTÉ : la politique servie est rapportée mais pas appliquée',
  ).toBe(false);
});
