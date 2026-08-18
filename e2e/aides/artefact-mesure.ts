// =============================================================================
// De QUEL artéfact parle-t-on ? — la page de leçon n'existe pas dans les deux
// -----------------------------------------------------------------------------
// 🔴 LE DÉFAUT QUE CE MODULE RÉPARE, ET IL A COÛTÉ UN DÉPLOIEMENT ROUGE.
// La décision E-2 d'E2-ST3 fait bâtir à `ci.yml` un artéfact depuis la FIXTURE
// TÉMOIN (`tools/content-pipeline/__fixtures__/temoin/…`), pour que G-axe, G-e2e
// et le générateur de CSP voient enfin une page de leçon INTERACTIVE. `deploy.yml`
// garde la racine de PRODUCTION — c'est lui qui publie, et `content/` est vide
// jusqu'à E3-ST1. Deux artéfacts, donc, et c'est voulu.
//
// Ce que la décision n'a pas vu : les huit specs que le lot E a ajoutés visent
// `/cours/securite-web/lecon-temoin/`, une route qui n'existe QUE dans l'artéfact
// de fixture. Sur `deploy.yml` ils sont partis en 404 — **10 rouges**, sur un
// dépôt sain, dans le workflow qui publie. Le vert de `ci.yml` avait masqué le
// trou parce qu'il regarde l'autre artéfact (mode d'échec L-007 : un gate câblé
// dans un workflow et pas dans l'autre).
//
// ⚠️ POURQUOI UN SAUT PLUTÔT QU'UN ÉCHEC. Exiger la page de leçon dans l'artéfact
// de production reviendrait à exiger que la fixture parte EN LIGNE — exactement ce
// que la décision E-2 refuse. Le comportement mesuré, lui, est le même code des
// deux côtés : il est gardé par `ci.yml`, sur chaque PR, sur l'artéfact qui porte
// la page. Ce module rend donc cet écart EXPLICITE et BRUYANT, au lieu de le
// laisser produire des 404 illisibles.
//
// 🔴 ET VOICI CE QUI EMPÊCHE LE SAUT DE TOUT AVALER EN SILENCE — sans quoi ce
// fichier serait le gate vide que tout le dépôt combat (L-005/L-014).
//   a. Le saut IMPRIME sa raison et le chemin qu'il a cherché : le journal fait
//      foi, et un saut inattendu se lit dans la sortie du run.
//   b. `src/workflows-github.spec.ts` exige que la racine de fixture nommée par
//      `ci.yml` porte RÉELLEMENT la leçon que ces specs mesurent. Le jour où la
//      fixture disparaît ou change de nom, G-test rougit — donc le saut ne peut
//      pas devenir universel sans qu'un test le dise.
//   c. `deploy.yml` n'est pas laissé sans filet : ses vérifications EN LIGNE
//      (« Vérifier les en-têtes servis », « Vérifier le routage servi ») portent
//      sur le site réellement publié, et ce sont elles qui font foi là-bas.
//
// ⏳ PÉREMPTION. À la clôture d'E3-ST1, `content/` portera une vraie leçon : les
// deux artéfacts auront alors une page de leçon, le saut ne se déclenchera plus
// jamais, et ce module devra être retiré avec le harnais de fixture de `ci.yml`.
// =============================================================================

import { existsSync } from 'node:fs';

import { test } from '@playwright/test';

/**
 * Le document prerendu de la page de leçon, dans l'artéfact servi par
 * `npx swa start` (voir `playwright.config.ts`).
 *
 * On interroge le DISQUE et non le serveur : la décision « ces specs ont-ils un
 * sujet ? » doit être prise avant toute navigation, et une 404 ne distinguerait
 * pas « artéfact de production » de « serveur cassé ».
 */
const DOCUMENT_LECON = 'dist/dr-je-sais-tout/browser/cours/securite-web/lecon-temoin/index.html';

/** Vrai quand l'artéfact sous mesure porte la page de leçon interactive. */
export const LECON_TEMOIN_PRERENDUE = existsSync(DOCUMENT_LECON);

/**
 * À appeler au sommet d'un fichier de spec dont TOUS les tests visent la page de
 * leçon. Saute le fichier entier, en nommant la raison, quand l'artéfact mesuré
 * ne porte pas cette page.
 *
 * @param sujet ce que le fichier mesure, pour que le journal dise ce qui n'a pas
 * été mesuré et non seulement qu'on a sauté.
 */
export function exigerLaPageDeLecon(sujet: string): void {
  if (LECON_TEMOIN_PRERENDUE) {
    return;
  }

  // Le journal fait foi (L-005) : un saut muet serait indiscernable d'un succès.
  console.log(
    `⏭️  SAUTÉ — ${sujet} : l'artéfact sous mesure ne porte pas de page de leçon ` +
      `(${DOCUMENT_LECON} absent). C'est l'artéfact de PRODUCTION — « content/ » est vide ` +
      `jusqu'à E3-ST1, décision E-2 d'E2-ST3. Ces mesures sont faites par « ci.yml », ` +
      `qui bâtit depuis la fixture témoin. Pour les exercer en local, rebâtir ` +
      `l'artéfact avec --racine tools/content-pipeline/__fixtures__/temoin/cours/securite-web.`,
  );

  // `beforeEach` plutôt qu'un saut de portée fichier : la forme est valide quel
  // que soit l'endroit d'où on l'appelle, et chaque test sauté apparaît NOMMÉMENT
  // dans le rapport — un fichier sauté en bloc ne dirait pas ce qu'il contenait.
  test.beforeEach(() => {
    test.skip(true, `page de leçon absente de l'artéfact mesuré — ${sujet} relève de « ci.yml »`);
  });
}
