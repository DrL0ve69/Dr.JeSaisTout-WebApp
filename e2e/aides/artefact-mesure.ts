// =============================================================================
// De QUELLE page de leçon parle-t-on ? — l'artéfact décide, pas un littéral
// -----------------------------------------------------------------------------
// 🔴 LE DÉFAUT QUE CE MODULE RÉPARE, ET IL A COÛTÉ UN DÉPLOIEMENT ROUGE.
// La décision E-2 d'E2-ST3 faisait bâtir à `ci.yml` un artéfact depuis la FIXTURE
// TÉMOIN, pendant que `deploy.yml` gardait la racine de PRODUCTION. Les huit specs
// de la page de leçon visaient `/cours/securite-web/lecon-temoin/` EN DUR — une
// route qui n'existait que d'un côté. Sur `deploy.yml` : 10 rouges sur un dépôt
// sain, dans le workflow qui publie (mode d'échec L-007).
//
// ✅ CE QUI A CHANGÉ LE 2026-08-20 (clôture d'E3-ST1). `content/` porte enfin une
// vraie leçon, le harnais de fixture est RETIRÉ de `ci.yml`, et les deux workflows
// bâtissent le même artéfact de production. Le littéral de route n'a donc plus de
// raison d'être — et il serait même nuisible : il faudrait le réécrire à chaque
// leçon publiée, dans huit fichiers.
//
// 🔴 LE PRINCIPE DE CE MODULE : ON DÉCOUVRE, PUIS ON EXIGE. Les specs ne nomment
// plus une route, ils nomment une CAPACITÉ — « une page de leçon qui porte un
// quiz », « une page de leçon qui porte une simulation ». Le module inspecte
// l'artéfact réellement bâti et rend la route qui la porte, ou fait sauter le
// fichier en NOMMANT ce qui n'a pas été mesuré. Conséquences voulues :
//   • un spec reste vert sur l'artéfact de fixture (`--racine …__fixtures__…`)
//     comme sur celui de production — c'est la même mécanique des deux côtés ;
//   • publier la leçon 02, 03… n'oblige à toucher aucun spec ;
//   • le jour où une leçon publiée porte une simulation, les specs de simulation
//     se rallument TOUT SEULS.
//
// 🔴 ET VOICI CE QUI EMPÊCHE LE SAUT DE TOUT AVALER EN SILENCE — sans quoi ce
// fichier serait le gate vide que tout le dépôt combat (L-005/L-014).
//   a. Le saut IMPRIME sa raison, le marqueur cherché et les slugs inspectés : le
//      journal fait foi, et un saut inattendu se lit dans la sortie du run.
//   b. `src/workflows-github.spec.ts` compte les capacités que `content/` publie
//      RÉELLEMENT et les confronte à ce que la suite e2e prétend mesurer. Il vit
//      HORS de la suite e2e, parce qu'un fichier entièrement sauté ne peut pas
//      s'assertionner. C'est lui qui empêche « sauté partout, en silence ».
//   c. `deploy.yml` n'est pas laissé sans filet : ses vérifications EN LIGNE
//      portent sur le site réellement publié, et ce sont elles qui font foi là-bas.
//
// ⚠️ ON INTERROGE LE DISQUE, PAS LE SERVEUR. La décision « ces specs ont-ils un
// sujet ? » se prend avant toute navigation, et une 404 ne distinguerait pas
// « l'artéfact ne porte pas cette page » de « le serveur est cassé ».
// =============================================================================

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { test } from '@playwright/test';

/** Là où le prerender dépose une page par leçon publiée, un dossier par slug. */
const RACINE_PRERENDUE = 'dist/dr-je-sais-tout/browser/cours/securite-web';

/** Une page de leçon effectivement présente dans l'artéfact sous mesure. */
export interface PageDeLecon {
  /** Le slug, c'est-à-dire le nom du dossier prerendu — et donc la route. */
  readonly slug: string;
  /** Le document prerendu sur le disque. */
  readonly document: string;
  /** La route à passer à `page.goto`, barre oblique finale comprise. */
  readonly route: string;
}

/**
 * Toutes les pages de leçon prerendues de l'artéfact sous mesure, **triées par slug**.
 *
 * Un dossier ne compte que s'il porte un `index.html` : `cours/securite-web/index.html`
 * (le sommaire) n'est pas un dossier, et un dossier vide n'est pas une page.
 *
 * 🔴 POURQUOI LE TRI EST EXPLICITE — ajouté le 2026-08-21 (E3-ST5), sur constat de
 * revue de sécurité. Plusieurs specs et leurs littéraux épinglés raisonnent sur « la
 * PREMIÈRE page portant tel marqueur, dans l'ordre alphabétique ». Cette phrase était
 * **fausse** : `readdirSync` ne trie pas — il rend l'ordre du système de fichiers. Elle
 * n'était vraie que par accident sur le NTFS du poste de développement, et rien ne la
 * garantit sur l'ext4 du runner de CI. Mesuré ici : l'ordre de CRÉATION des cinq pages
 * est `csrf, xss, injection, fondamentaux, evaluation-cvss` — l'ordre de fin d'un
 * prerender parallèle, ni alphabétique, ni stable.
 *
 * Le risque n'était pas théorique : un compte épinglé sur une cible découverte doit
 * être invariant sur TOUTES les cibles possibles, ou la découverte doit être totalement
 * ordonnée. `BLOCS_STYLE_PAGE_QUIZ` valait 6, satisfait par deux candidats sur quatre —
 * il vaut 7, satisfait par un seul sur cinq. Le pari devenait perdant.
 *
 * `localeCompare(…, 'en')` plutôt que le `.sort()` par défaut : l'ordre par unité de
 * code UTF-16 dépendrait des accents et des majuscules d'un futur slug. Les slugs sont
 * en ASCII minuscule aujourd'hui — c'est précisément le moment de ne pas en dépendre.
 */
export const LECONS_PRERENDUES: readonly PageDeLecon[] = existsSync(RACINE_PRERENDUE)
  ? readdirSync(RACINE_PRERENDUE, { withFileTypes: true })
      .filter((entree) => entree.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name, 'en'))
      .map((entree) => ({
        slug: entree.name,
        document: join(RACINE_PRERENDUE, entree.name, 'index.html'),
        route: `/cours/securite-web/${entree.name}/`,
      }))
      .filter((page) => existsSync(page.document))
  : [];

/**
 * La première page de leçon dont le document prerendu porte `marqueur`.
 *
 * ⚠️ On cherche dans le HTML PRERENDU, pas dans `content/`. C'est la seule lecture
 * qui dit ce que le navigateur va réellement recevoir : une leçon en
 * `statut: brouillon` n'est pas prerendue, et une ancre non rendue ne produit
 * aucun élément (E2-ST5 : `[[simulation]]` a longtemps rendu le vide).
 */
function leconPortant(marqueur: string): PageDeLecon | undefined {
  return LECONS_PRERENDUES.find((page) => readFileSync(page.document, 'utf8').includes(marqueur));
}

/** Une page de leçon dont le quiz est réellement rendu, s'il en existe une. */
export const LECON_AVEC_QUIZ = leconPortant('<app-quiz');

/** Une page de leçon dont la simulation est réellement rendue, s'il en existe une. */
export const LECON_AVEC_SIMULATION = leconPortant('<app-simulation');

/**
 * Route de repli, employée quand la capacité exigée est absente. Elle n'est JAMAIS
 * navigée — le `test.skip` posé par les fonctions ci-dessous s'exécute avant. Elle
 * se nomme quand même, pour qu'un saut défaillant produise une 404 qui s'explique
 * elle-même plutôt qu'une erreur muette.
 */
const ROUTE_ABSENTE = '/cours/securite-web/AUCUNE-LECON-PRERENDUE-NE-PORTE-CETTE-CAPACITE/';

/** La route de la page à mesurer, ou une route parlante quand il n'y en a pas. */
export const ROUTE_LECON_QUIZ = LECON_AVEC_QUIZ?.route ?? ROUTE_ABSENTE;

/** La route de la page à mesurer, ou une route parlante quand il n'y en a pas. */
export const ROUTE_LECON_SIMULATION = LECON_AVEC_SIMULATION?.route ?? ROUTE_ABSENTE;

/** Le saut commun : il nomme le sujet, le marqueur, et ce que l'artéfact contenait. */
function sauter(sujet: string, capacite: string, marqueur: string): void {
  // 🔴 DEUX ÉTATS, ET UN SEUL EST LÉGITIME (S-019 : un filtre se prouve à trois
  // endroits, pas à un). « Des leçons sont prerendues, aucune ne porte cette
  // capacité » est le trou documenté et daté — on saute. « AUCUNE page de leçon
  // prerendue » ne l'est plus depuis qu'une leçon est publiée : ce serait un
  // `outputPath` changé ou un prerender cassé, et le saut ferait passer les huit
  // specs au vert en n'ayant rien mesuré. Le filet de `src/workflows-github.spec.ts`
  // ne l'attraperait pas — il lit `content/`, donc un PRÉDICAT DIFFÉRENT, et il
  // resterait vert pendant que l'artéfact est vide.
  if (LECONS_PRERENDUES.length === 0) {
    throw new Error(
      `aucune page de leçon prerendue sous « ${RACINE_PRERENDUE} » : l’artéfact n’a pas été bâti, ` +
        `son chemin de sortie a changé, ou le prerender de « cours/securite-web/<slug>/index.html » ` +
        `est cassé. Ce n’est PAS le trou de couverture documenté (celui-là a des leçons, sans la ` +
        `capacité demandée) — sauter ici rendrait les huit specs de la page de leçon verts sans ` +
        `avoir rien mesuré. Bâtir l’artéfact : « npm run build ».`,
    );
  }

  const inventaire = `pages prerendues : ${LECONS_PRERENDUES.map((page) => page.slug).join(', ')}`;

  // Le journal fait foi (L-005) : un saut muet serait indiscernable d'un succès.
  console.log(
    `⏭️  SAUTÉ — ${sujet} : aucune leçon publiée ne porte ${capacite} ` +
      `(marqueur « ${marqueur} » introuvable ; ${inventaire}). ` +
      `Le trou est COMPTÉ hors de cette suite, par « src/workflows-github.spec.ts » : ` +
      `il rougit dès qu'une leçon publiée porte cette capacité sans que ces specs la mesurent. ` +
      `Pour exercer ces mesures en local sur la fixture témoin, rebâtir l'artéfact avec ` +
      `--racine tools/content-pipeline/__fixtures__/temoin/cours/securite-web.`,
  );

  // `beforeEach` plutôt qu'un saut de portée fichier : la forme est valide quel que
  // soit l'endroit d'où on l'appelle, et chaque test sauté apparaît NOMMÉMENT dans
  // le rapport — un fichier sauté en bloc ne dirait pas ce qu'il contenait.
  test.beforeEach(() => {
    test.skip(true, `aucune leçon publiée ne porte ${capacite} — ${sujet} n'a pas de sujet à mesurer`);
  });
}

/**
 * À appeler au sommet d'un fichier de spec dont TOUS les tests visent une page de
 * leçon portant un QUIZ. Saute le fichier entier, en nommant la raison, quand
 * l'artéfact sous mesure n'en porte aucune.
 *
 * @param sujet ce que le fichier mesure, pour que le journal dise ce qui n'a pas
 * été mesuré et non seulement qu'on a sauté.
 */
export function exigerUneLeconAvecQuiz(sujet: string): void {
  if (LECON_AVEC_QUIZ) return;
  sauter(sujet, 'de quiz', '<app-quiz');
}

/**
 * Idem, pour un fichier dont tous les tests visent une page de leçon portant une
 * SIMULATION.
 *
 * ⏳ DETTE NOMMÉE ET DATÉE (décision du propriétaire, 2026-08-20). La leçon 01
 * n'a pas de simulation — son sujet est abstrait, le schéma y est statique. Ces
 * specs sont donc SAUTÉS sur l'artéfact publié jusqu'à E3-ST3 (`03-injection`),
 * qui en porte une au plan. Le trou est assumé à voix haute, compté par
 * `src/workflows-github.spec.ts`, et se referme tout seul le jour où la leçon 03
 * est publiée.
 */
export function exigerUneLeconAvecSimulation(sujet: string): void {
  if (LECON_AVEC_SIMULATION) return;
  sauter(sujet, 'de simulation', '<app-simulation');
}
