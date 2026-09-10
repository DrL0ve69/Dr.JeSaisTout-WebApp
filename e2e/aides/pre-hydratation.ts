// =============================================================================
// Ouvrir la fenêtre de pré-hydratation — la MÊME mécanique pour tous les specs
// -----------------------------------------------------------------------------
// POURQUOI CETTE AIDE EXISTE (lot 11, 2026-09-09). La technique vivait entière
// dans `e2e/quiz-pre-hydratation.spec.ts`, seul fichier à en avoir besoin. Le lot
// 11 en a eu besoin d'un second — mesurer que les onglets `:::: methodes`, qui
// n'ont AUCUNE liaison Angular, ne se font pas écraser par la première détection
// de changements. Recopier ces quarante lignes aurait laissé deux exemplaires
// d'un harnais subtil libres de diverger en silence : c'est très exactement
// l'argument L-016 qui a déjà fait déménager `indicateur-focus.ts`, `sonde-csp.ts`
// puis `hydratation.ts`. On mutualise, et on paie le prix de L-034 — ce fichier
// est épinglé nommément dans `src/configuration-typescript.spec.ts`, parce qu'un
// défaut de typage ici serait invisible depuis ses appelants et rendrait VERTE
// une fenêtre qui ne s'ouvre jamais.
//
// 🔴 ON NE TESTE PAS UNE COURSE — ON ÉLARGIT LA FENÊTRE.
// « Cliquer assez vite » serait instable et ne prouverait rien. On INTERCEPTE le
// chargement du chunk paresseux de la leçon et on le RETIENT : tant qu'il ne
// répond pas, le routeur ne peut pas activer la route, donc aucun composant de la
// page n'est instancié — le HTML prerendu reste seul à l'écran, aussi longtemps
// qu'on veut. On agit dedans, puis on relâche.
//
// QUEL CHUNK, ET COMMENT ON LE DÉSIGNE SANS ÉCRIRE UN HACHAGE. Le document servi
// référence lui-même ses scripts (`main-…`, et les `modulepreload` de la coquille
// ET du composant `lecon`). Le SEUL `.js` que la page demande sans l'avoir annoncé
// est le chunk de DONNÉES de la leçon — celui que `resoudre-lecon` charge par un
// `import()` dynamique. La règle est donc : tout `.js` absent du document servi est
// retenu. Elle survit à un rehachage, à un renommage, à un découpage différent —
// contrairement à un `chunk-EEPZ63KW.js` écrit en dur, qui rendrait ces fichiers
// verts et vides au prochain build (mode d'échec L-019).
//
// 🔴 LE JALON PRERENDU EST OBLIGATOIRE, ET CE N'EST PAS UNE COMMODITÉ. Une fenêtre
// ouverte sans avoir constaté que la CHOSE SUR LAQUELLE ON VA AGIR est déjà peinte
// serait un gate creux : on agirait sur un DOM absent, et l'assertion finale
// mesurerait l'hydratation seule. L'appelant DOIT donc fournir l'assertion qui dit
// « le HTML prerendu porte bien ce que je m'apprête à manipuler », et elle est
// posée à l'intérieur de la fenêtre, avant que l'appelant ne reprenne la main.
// =============================================================================

import { Page, expect } from '@playwright/test';

/** Poignée sur une fenêtre de pré-hydratation ouverte. */
export interface FenetreDePreHydratation {
  /** Laisse repartir le chunk retenu. Idempotent. */
  readonly relacher: () => void;
  /** Les `.js` effectivement retenus — sert au contrôle positif et au journal. */
  readonly retenus: readonly string[];
}

/**
 * Ouvre la fenêtre de pré-hydratation, PUIS navigue vers `route`.
 *
 * Au retour, le HTML prerendu est à l'écran, complet et interrogeable, et rien
 * n'est hydraté. L'appelant agit, puis appelle `relacher()`.
 *
 * @param route la page de leçon à mesurer — toujours découverte par
 * `e2e/aides/artefact-mesure.ts`, jamais écrite en dur.
 * @param jalonPrerendu l'assertion qui constate que le HTML prerendu porte déjà ce
 * que l'appelant s'apprête à manipuler. Obligatoire (voir l'en-tête).
 */
export async function ouvrirFenetreDePreHydratation(
  page: Page,
  route: string,
  jalonPrerendu: (page: Page) => Promise<void>,
): Promise<FenetreDePreHydratation> {
  // Le document servi est demandé HORS navigation, pour établir la liste de ses
  // propres scripts avant que le navigateur ne commence à les réclamer.
  const document = await page.request.get(route);
  expect(
    document.ok(),
    `${route} n'est pas servi alors que l'artéfact sur le disque porte cette page : le serveur sert-il un autre dist/ ?`,
  ).toBe(true);
  const html = await document.text();
  const annonces = new Set(
    [...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((occurrence) =>
      String(occurrence[1]).split('/').pop(),
    ),
  );
  expect(
    annonces.size,
    'le document servi n’annonce aucun script : la liste des « annoncés » est vide, donc TOUT serait retenu et la mesure ne vaudrait rien',
  ).toBeGreaterThan(0);

  const retenus: string[] = [];
  let relacher = (): void => {};
  const barriere = new Promise<void>((resoudre) => {
    relacher = resoudre;
  });

  await page.route('**/*.js', async (route_) => {
    const nom = new URL(route_.request().url()).pathname.split('/').pop();
    if (annonces.has(nom)) {
      await route_.continue();
      return;
    }
    retenus.push(String(nom));
    await barriere;
    await route_.continue();
  });

  await page.goto(route);

  // Le HTML prerendu est peint : ce que l'appelant va manipuler est déjà là AVANT
  // que le moindre composant ne soit instancié. C'est l'état « sans JS » — et
  // c'est aussi celui, plus trompeur, de « pas encore hydraté ».
  await jalonPrerendu(page);

  // Le chunk de données a bien été intercepté, et il attend. `expect.poll` plutôt
  // qu'une attente arbitraire : on attend un ÉTAT, jamais une durée.
  await expect
    .poll(() => retenus.length, {
      message: 'aucun `.js` retenu : la fenêtre de pré-hydratation ne s’est jamais ouverte',
    })
    .toBeGreaterThan(0);

  return { relacher, retenus };
}
