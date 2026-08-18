// =============================================================================
// Bascule de thème — la page INTERACTIVE, exécutée sous la CSP APPLIQUÉE
// -----------------------------------------------------------------------------
// CE QU'IL AJOUTE À CE QUI EXISTE DÉJÀ, et que rien d'autre ne peut dire.
// Le thème est aujourd'hui couvert par trois gates, tous aveugles au navigateur :
// `theme.spec.ts` exerce le service dans jsdom, `init-theme.spec.ts` rejoue le
// script anti-flash à la main et compile `_themes.scss` pour comparer, et
// `generer-config-swa.mjs` hache les scripts inline de l'artéfact. Aucun des trois
// n'a jamais vu un vrai moteur appliquer un vrai en-tête `Content-Security-Policy`
// à une page qui bouge. Ce fichier est le premier — et c'est exactement le trou
// qu'a nommé la leçon S-005 (`.claude/lessons/security-lessons.md`) : la CSP du
// site avait été validée sur une page INERTE ; le premier écouteur d'événement —
// cette bascule, précisément — a fait injecter par Angular deux scripts inline que
// la CSP refusait. La vérification était juste, son périmètre ne l'était pas.
// Le constat que le propriétaire devait produire à la main dans un navigateur
// (« zéro violation en console », note de reprise de `CLAUDE.md`) est automatisé ici.
//
// ⚠️ CE FICHIER DOIT D'ABORD PROUVER QU'IL MESURE QUELQUE CHOSE, et deux fois.
// « Zéro violation de CSP » est une affirmation vide tant que deux conditions ne
// sont pas établies, chacune fermant un fail-open distinct :
//   a. UNE CSP EST BIEN SERVIE. `findSWAConfigFile` de l'émulateur SWA
//      (`node_modules/@azure/static-web-apps-cli/dist/core/utils/user-config.js`)
//      rend `null` quand `staticwebapp.config.json` est absent OU invalide, et
//      `swa start` démarre quand même — sans `globalHeaders`, sans code d'erreur.
//      Sans en-tête servi, tous les tests ci-dessous seraient verts en l'absence
//      TOTALE de politique. D'où `exigerCspServie`, appelée sur la réponse de la
//      navigation : c'est elle qui donne un sens aux zéros qui suivent. Classe
//      S-003 (`.claude/lessons/security-lessons.md`) : un garde-fou doit prouver
//      qu'il a vu quelque chose, pas seulement bien refuser ce qu'il voit.
//   b. LA SONDE MORD. Une sonde silencieusement cassée rend elle aussi une liste
//      vide. Le test « contrôle positif » injecte donc un script inline NON haché
//      et exige que la CSP le refuse, que la sonde le compte et que la console le
//      dise — pendant du contrôle NÉGATIF déjà posé sur la sonde anti-flash
//      (L-010 : un test de mutation vérifie d'abord qu'il a frappé sa cible).
//
// LES CINQ MODES D'ÉCHEC MESURÉS, dans l'ordre des tests :
//  0. AUCUNE CSP SERVIE — ou une CSP relâchée en `unsafe-inline`/`unsafe-eval`,
//     ce qui reviendrait à publier la politique d'un site qui n'enseigne rien.
//  1. UNE RESSOURCE REFUSÉE PAR LA CSP. Silencieuse pour le visiteur (une bascule
//     qui ne réagit plus), invisible à tout gate statique.
//  2. UNE BASCULE QUI N'ATTEINT PAS LE CSS. Poser un `data-theme` que
//     `_themes.scss` ne connaît pas laisse la page en clair sans erreur ; écrire
//     une clé de stockage que le script d'`index.html` ne lit pas laisse le choix
//     s'évaporer au rechargement.
//  3. LE FLASH DE CLAIR au chargement d'un thème sombre épinglé — quelques images,
//     donc invisible à toute assertion posée APRÈS le chargement.
//  4. L'ÉTAT « SYSTÈME » qui cesse de suivre l'OS.
//
// ⚠️ POURQUOI LES VALEURS DU CONTRAT SONT ÉCRITES EN DUR ICI (arbitrage L-012).
// `theme.ts` exporte `THEMES`, `CLE_THEME`, `ATTRIBUT_THEME` — et ce fichier ne les
// importe PAS, délibérément. L-012 (`.claude/lessons/lessons-learned.md`) : un test
// qui importe la constante qu'il vérifie ne vérifie que la cohérence d'un fichier
// avec lui-même. Renommer `CLE_THEME` en `'drjst-theme-v2'` laisserait un tel test
// vert pendant que le script inline d'`index.html` lirait toujours l'ancienne clé.
// Un test de bout en bout est justement l'AUTRE EXTRÉMITÉ de ces contrats : il
// s'adresse au navigateur avec les littéraux que le reste du monde emploie —
// `'drjst-theme'` est ce qu'écrit `src/index.html`, `data-theme` ce que sélectionne
// `src/styles/_themes.scss`. Une divergence d'un seul côté doit rougir ici.
// Et la vérification ne s'arrête pas à l'attribut : chaque test compare la COULEUR
// DE FOND CALCULÉE, seul témoin que la valeur posée correspond à un sélecteur qui
// peint réellement quelque chose.
//
// ⚠️ LA SONDE ELLE-MÊME A DÉMÉNAGÉ dans `./aides/sonde-csp.ts` au lot E-c2
// d'E2-ST3 : `quiz-sous-csp.spec.ts` applique la MÊME mesure à la page de leçon
// INTERACTIVE — chunk paresseux, hydratation, cinq questions actionnées — et deux
// copies de « aucune violation de CSP » auraient été libres de diverger en silence
// (L-016). Ce fichier garde ce qui lui est propre : la page mesurée, son parcours,
// et les quatre modes d'échec du thème.
// =============================================================================

import { type Page, expect, test } from '@playwright/test';

import {
  FenetreSondeeCsp,
  MOTIFS_CSP,
  exigerCspServie,
  lireViolations,
  surveiller,
} from './aides/sonde-csp';

/** Ce qu'écrit le script inline de `src/index.html` — littéral, jamais importé (L-012). */
const CLE_STOCKAGE = 'drjst-theme';

/** Ce que sélectionne `src/styles/_themes.scss` — littéral, jamais importé (L-012). */
const ATTRIBUT = 'data-theme';

interface MarqueurAntiFlash {
  /** La sonde a-t-elle réellement observé quelque chose ? (garde-fou L-010) */
  observe: boolean;
  /** La valeur de l'attribut de thème à l'instant observé. */
  attribut: string | null;
}

/** Les crochets que ce fichier pose EN PLUS de ceux de la sonde partagée. */
interface FenetreSondee extends FenetreSondeeCsp {
  __drjstMarqueurAntiFlash?: MarqueurAntiFlash;
  /** Posé par le seul script que la CSP doit refuser (contrôle positif). */
  __drjstScriptInterditAExecute?: boolean;
}

/** La couleur réellement peinte — `body { background-color: var(--couleur-surface) }`. */
async function fondDuCorps(page: Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

/**
 * Attend que le fond CESSE d'être `avant` — et échoue s'il ne change jamais.
 *
 * ⚠️ POURQUOI UNE ATTENTE ET NON UNE LECTURE SÈCHE. La suite tourne sous
 * `prefers-reduced-motion: reduce` (voir `playwright.config.ts`), et le bloc
 * `m.mouvement-reduit` de `src/styles.scss` pose `transition-duration: 0.01ms`
 * sur `*`. Or `transition-property` vaut `all` par défaut : TOUT changement de
 * propriété devient donc une micro-transition, y compris `background-color`.
 * `getComputedStyle` lu dans la foulée rend alors la valeur de DÉPART — la
 * précédente — et l'assertion « la page a changé de fond » échoue sur une page
 * pourtant correcte. Constaté ici même, en rouge, à l'activation de `reduce`.
 * Une valeur en transition n'est pas une valeur finale : on interroge donc
 * jusqu'à ce qu'elle le devienne, ce qui reste une mesure de la peinture réelle
 * et supprime au passage la même flakiness pour toute future animation de thème.
 */
async function attendreFondDifferentDe(page: Page, avant: string, message: string): Promise<void> {
  await expect.poll(async () => fondDuCorps(page), { message }).not.toBe(avant);
}

/**
 * Entre dans le groupe de radios AU CLAVIER et s'arrête sur « Sombre ».
 *
 * Les cinq tabulations et le comportement des flèches sont établis par
 * `navigation-clavier.spec.ts` — on s'appuie dessus sans le redémontrer. On entre
 * sur le membre COCHÉ (« Système », dernier des trois dans l'ordre `clair`,
 * `sombre`, `systeme`) : une seule flèche VERS LA GAUCHE recule d'un cran et
 * atteint « Sombre ». Au clavier et pas au clic, parce que c'est le parcours le
 * plus contraignant — il exige que le groupe natif soit resté un groupe.
 */
async function choisirSombreAuClavier(page: Page): Promise<void> {
  for (let n = 0; n < 5; n++) {
    await page.keyboard.press('Tab');
  }
  await expect(page.getByRole('radio', { name: 'Système' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
}

test('le parcours interactif complet ne déclenche AUCUNE violation de CSP', async ({ page }) => {
  const journal = await surveiller(page);

  const reponse = await page.goto('/');

  // AVANT toute autre assertion : une politique est-elle seulement servie ? Sans
  // cette ligne, ce test resterait vert sur un serveur qui n'applique AUCUNE CSP
  // (voir le point (a) de l'en-tête) — c'est-à-dire qu'il ne prouverait rien du
  // tout, tout en portant le nom de la leçon S-005.
  exigerCspServie(reponse);

  // Le parcours doit toucher tout ce qui, sous CSP, peut échouer différemment :
  //  · le chargement lui-même (script inline haché du `<head>`, feuilles de style,
  //    polices auto-hébergées, module d'amorçage d'Angular) ;
  //  · la PREMIÈRE interaction — celle qui a produit S-005 : c'est en voyant un
  //    écouteur réel qu'Angular injectait ses scripts de rejeu d'événements ;
  //  · une navigation du routeur, qui charge une route paresseuse et réécrit le DOM
  //    sans rechargement ;
  //  · un rechargement complet AVEC un thème épinglé, qui rejoue le script inline.
  await choisirSombreAuClavier(page);
  await expect(page.getByRole('radio', { name: 'Sombre' })).toBeChecked();

  // Au pointeur cette fois : le `<label>` enveloppe le radio, le chemin de
  // l'événement n'est pas le même qu'au clavier.
  await page.getByText('Clair', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Clair' })).toBeChecked();

  await page.getByRole('link', { name: 'Sécurité des applications web' }).click();
  await expect(page).toHaveURL(/\/cours\/securite-web\/?$/);
  await page.goBack();

  await page.reload();
  // On attend l'HYDRATATION avant de conclure, sinon le test se prononcerait sur
  // une page encore statique : le HTML prerendu coche toujours « Système » (il est
  // le même fichier pour tous les visiteurs), et c'est le service qui rétablit
  // « Clair » depuis le stockage une fois Angular démarré. Tant que cette
  // assertion n'a pas passé, rien ne prouve que le code du site a tourné.
  await expect(page.getByRole('radio', { name: 'Clair' })).toBeChecked();

  // LA mesure de S-005 : ce que le navigateur a lui-même qualifié de violation.
  // Relu dans la page à cet instant, donc APRÈS tout ce que le rechargement
  // ci-dessus a pu émettre (voir la note sur la course dans `surveiller`).
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

test('CONTRÔLE POSITIF — un script inline non haché est refusé par la CSP, et les deux détecteurs le voient', async ({
  page,
}) => {
  // POURQUOI CE TEST EXISTE. Le test précédent exige une liste VIDE. Or une sonde
  // cassée, un écouteur jamais installé, un binding disparu ou une CSP en mode
  // rapport rendent exactement la même liste vide — et le vert se lit alors comme
  // une preuve. C'est le pendant du contrôle NÉGATIF que la sonde anti-flash porte
  // déjà plus bas (L-010) : là-bas on prouve que la sonde sait dire « absent »,
  // ici on prouve qu'elle sait dire « présent ». Sans les deux, un zéro n'est
  // qu'un silence.
  //
  // LA VIOLATION EST VRAIE, PAS SIMULÉE. Le script est créé et inséré PAR LA PAGE
  // (`DOMContentLoaded`), donc c'est un nœud du document comme un autre, soumis à
  // `script-src 'self' 'sha256-…'`. Rien n'est falsifié : si la politique servie
  // autorisait l'inline, ce test rougirait — ce qui est précisément le but.
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
  expect(politique, "la CSP servie ne restreint pas `script-src`").toContain('script-src');

  // On attend l'hydratation, comme le parcours : l'instant de lecture doit être le
  // même que celui où le test précédent conclut « zéro ».
  await expect(page.getByRole('radio', { name: 'Système' })).toBeChecked();

  const violations = await lireViolations(page, journal);

  // 1. LE DÉTECTEUR PRÉCIS a compté la violation, et c'est BIEN celle-ci :
  //    Chromium rapporte `script-src-elem` avec `blockedURI` à `inline`. Exiger la
  //    directive évite qu'une violation d'une tout autre origine (une police, une
  //    image) fasse passer ce contrôle pour concluant.
  expect(
    violations.filter((detail) => detail.startsWith('script-src') && detail.includes('inline')),
    "la CSP n'a PAS refusé un script inline non haché, ou la sonde ne l'a pas vu — dans les deux cas le « zéro violation » du test précédent ne prouve rien",
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
    'le script inline non haché s’est EXÉCUTÉ : la politique servie est rapportée mais pas appliquée',
  ).toBe(false);
});

test('choisir « Sombre » au clavier épingle le thème, l’écrit dans le stockage ET repeint la page', async ({
  page,
}) => {
  await page.goto('/');
  const fondAvant = await fondDuCorps(page);

  await choisirSombreAuClavier(page);
  const sombre = page.getByRole('radio', { name: 'Sombre' });
  await expect(sombre).toBeFocused();
  await expect(sombre).toBeChecked();

  // 1. L'ATTRIBUT sur `<html>` — le contrat avec `_themes.scss`.
  await expect(page.locator('html')).toHaveAttribute(ATTRIBUT, 'sombre');

  // 2. LE STOCKAGE — le contrat avec le script inline d'`index.html`. La clé est
  //    passée depuis Node : c'est le littéral de ce fichier qui interroge la page,
  //    pas la constante du service (L-012).
  const memorise = await page.evaluate((cle) => localStorage.getItem(cle), CLE_STOCKAGE);
  expect(memorise, `le choix n'a pas été mémorisé sous « ${CLE_STOCKAGE} »`).toBe('sombre');

  // 3. LA PEINTURE. Sans cette ligne, les deux précédentes passeraient encore si
  //    `definir()` posait `data-theme="dark"` ou `data-theme="systeme"` : des
  //    valeurs qu'aucun sélecteur ne connaît, donc une page restée claire, sans
  //    erreur et sans test rouge. C'est le CSS compilé qui tranche, pas l'attribut.
  await attendreFondDifferentDe(
    page,
    fondAvant,
    "l'attribut est posé mais la page n'a pas changé de fond",
  );
});

test('un thème sombre épinglé est déjà posé quand le corps de page apparaît — donc aucun flash de clair', async ({
  page,
}) => {
  // POURQUOI CETTE OBSERVATION MORD, LÀ OÙ UN `expect` APRÈS CHARGEMENT NE VERRAIT
  // JAMAIS RIEN. Le flash est une fenêtre de quelques images : la page est peinte
  // en clair, puis l'attribut arrive et elle vire au sombre. Une assertion posée
  // après le chargement trouve le sombre dans les deux cas — avec ou sans le script
  // anti-flash, elle est verte. Ce qu'il faut mesurer n'est donc pas la VALEUR
  // finale mais l'INSTANT où elle est posée, et l'instant qui décide est le premier
  // où le navigateur peut peindre quoi que ce soit : l'apparition de `<body>`.
  // Le script anti-flash (E1-ST1-C) est synchrone dans le `<head>`, donc STRICTEMENT
  // avant ; le `ThemeService`, lui, ne s'exécute qu'à l'hydratation, longtemps
  // après. Un `MutationObserver` posé sur le document dès l'ouverture — avant tout
  // script de la page — lit l'attribut à cet instant précis : « sombre » prouve que
  // rien n'a pu être peint en clair, `null` prouve qu'une fenêtre de flash existe.
  await page.goto('/');
  await page.evaluate((cle) => localStorage.setItem(cle, 'sombre'), CLE_STOCKAGE);

  await page.addInitScript(() => {
    const marqueur: MarqueurAntiFlash = { observe: false, attribut: null };
    (window as FenetreSondee).__drjstMarqueurAntiFlash = marqueur;

    // Observé sur `document` et non sur `document.documentElement` : à l'instant où
    // ce script s'exécute, le document est vide — `<html>` n'existe pas encore.
    const observateur = new MutationObserver(() => {
      if (document.body === null) {
        return;
      }
      marqueur.observe = true;
      marqueur.attribut = document.documentElement.getAttribute('data-theme');
      observateur.disconnect();
    });
    observateur.observe(document, { childList: true, subtree: true });
  });

  await page.reload();
  const auCorps = await lireMarqueur(page);

  expect(
    auCorps.observe,
    "la sonde n'a jamais observé l'apparition de `<body>` : la mesure ci-dessous ne vaudrait rien",
  ).toBe(true);
  expect(
    auCorps.attribut,
    'le thème épinglé n’était pas encore posé quand le corps de page est apparu : la page a pu être peinte en clair avant de virer au sombre',
  ).toBe('sombre');

  const fondSombre = await fondDuCorps(page);

  // CONTRÔLE NÉGATIF — la sonde sait-elle dire « absent » ? Sans lui, une sonde
  // cassée qui renverrait toujours « sombre » passerait pour une preuve (L-010 : un
  // test de mutation doit vérifier qu'il a frappé sa cible). Stockage vidé, la même
  // observation au même instant doit rendre `null`, puisque « système » ne pose
  // AUCUN attribut — et la page doit alors se peindre autrement.
  await page.evaluate((cle) => localStorage.removeItem(cle), CLE_STOCKAGE);
  await page.reload();
  const sansEpinglage = await lireMarqueur(page);

  expect(sansEpinglage.observe).toBe(true);
  expect(
    sansEpinglage.attribut,
    'la sonde rend « sombre » même sans thème épinglé : elle ne mesure pas ce qu’elle prétend',
  ).toBeNull();
  await attendreFondDifferentDe(
    page,
    fondSombre,
    'sans thème épinglé, la page se peint pourtant comme en sombre',
  );
});

test('l’état « Système » suit `prefers-color-scheme`, sans attribut et sans rechargement', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');

  // L'ABSENCE d'attribut EST l'état « système » : `_themes.scss` bascule le sombre
  // sur `:root:not([data-theme])`. Poser `data-theme="systeme"` ne correspondrait à
  // aucun sélecteur et gèlerait la page en clair sur un OS en sombre — cette
  // assertion est ce qui l'empêche.
  await expect(page.locator('html')).not.toHaveAttribute(ATTRIBUT);
  await expect(page.getByRole('radio', { name: 'Système' })).toBeChecked();

  const fondSystemeSombre = await fondDuCorps(page);

  // Le changement de préférence est appliqué SANS rechargement : c'est la requête
  // média du CSS qui repeint, JavaScript n'y est pour rien. Le service, lui, ne
  // s'abonne que pour étiqueter le thème effectif.
  await page.emulateMedia({ colorScheme: 'light' });

  await attendreFondDifferentDe(
    page,
    fondSystemeSombre,
    'la page ne suit pas `prefers-color-scheme` : le bloc `@media` de `_themes.scss` ne s’applique plus',
  );

  // Et toujours aucun attribut : suivre l'OS ne doit jamais épingler quoi que ce soit.
  await expect(page.locator('html')).not.toHaveAttribute(ATTRIBUT);
});

/** Relit la sonde anti-flash, en distinguant « absente » de « valeur nulle ». */
async function lireMarqueur(page: Page): Promise<MarqueurAntiFlash> {
  const marqueur = await page.evaluate(
    () => (window as FenetreSondee).__drjstMarqueurAntiFlash ?? null,
  );
  if (marqueur === null) {
    throw new Error(
      "la sonde anti-flash est absente de la page : `addInitScript` ne s'est pas exécuté",
    );
  }
  return marqueur;
}
