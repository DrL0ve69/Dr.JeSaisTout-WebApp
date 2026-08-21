// =============================================================================
// Ce qu'est « la simulation » pour les specs — sélecteurs, comptes mesurés, état lu
// (E2-ST5, lot c1)
// -----------------------------------------------------------------------------
// POURQUOI CE MODULE EXISTE. Deux specs mesurent la même région : la mécanique
// (`simulation-mecanique.spec.ts`) et le parcours clavier
// (`parcours-clavier-simulation.spec.ts`). Recopier dans les deux les `id` de
// document, le compte d'étapes et la lecture de l'état donnerait deux définitions
// libres de diverger en silence — c'est le motif L-016, et c'est exactement la
// raison pour laquelle `indicateur-focus.ts` existe déjà à côté.
//
// 🔴 LES COMPTES CI-DESSOUS SONT MESURÉS SUR L'ARTÉFACT, PAS DÉDUITS. Ils viennent
// de `tools/content-pipeline/__fixtures__/temoin/cours/securite-web/01-lecon-temoin/
// simulation.json` — 4 acteurs, 6 étapes — relevés dans le HTML prerendu. Les
// épingler ici n'est pas de la décoration : un spec qui affirme « la vue s'est
// repliée » en comptant 5 étapes masquées est FAUX si la fixture passe à 7 étapes,
// et il rougirait alors sur un produit parfaitement sain (famille L-035). En les
// nommant à un seul endroit, une fixture qui change fait rougir une ligne qui DIT
// ce qui a bougé.
//
// ⚠️ LES `id` SONT ÉPINGLÉS EN LITTÉRAL, ET C'EST VOULU. `ID_SIMULATION` et
// `PREFIXE_ID_ETAPE` existent dans `src/app/features/cours/contenu-compile`, mais
// le programme e2e (`tsconfig.e2e.json`) ne couvre pas `src/` et n'a pas à le
// couvrir : ces specs mesurent l'artéfact SERVI, en boîte noire. Un renommage côté
// source ne passerait donc pas inaperçu — il ferait rougir tous les sélecteurs
// d'un coup, ce qui est le comportement souhaité pour un contrat de document.
// =============================================================================

import { readFileSync } from 'node:fs';

import { Locator, Page, expect } from '@playwright/test';

import { LECON_AVEC_SIMULATION } from './artefact-mesure';
import { fichierSourceDeLaLecon, laLeconEstDeclaree } from './lecon-source';

/**
 * La route de la page de leçon qui porte une SIMULATION dans l'artéfact sous mesure.
 *
 * 📉 Le littéral `'/cours/securite-web/lecon-temoin/'` a disparu le 2026-08-20, avec le harnais
 * de fixture de `ci.yml` (clôture d'E3-ST1). Une route écrite en dur n'aurait plus de sens : les
 * deux workflows bâtissent le contenu RÉEL. `artefact-mesure.ts` la DÉCOUVRE dans l’artéfact, ou
 * fait sauter le fichier en nommant ce qui n’a pas été mesuré.
 *
 * ✅ DEPUIS LE 2026-08-21, elle est découverte pour de bon : `03-injection` (E3-ST3) est la
 * première leçon publiée à porter une simulation, et les trois specs se sont rallumés seuls, comme
 * la clôture d'E3-ST1 l'avait annoncé.
 */
export { ROUTE_LECON_SIMULATION } from './artefact-mesure';

/** L'`id` de la région — cible du lien « Réinitialiser ». */
export const ID_REGION = 'simulation';

/** Le préfixe des `id` d'étape : l'étape N porte `simulation-etape-N`. */
export const PREFIXE_ID_ETAPE = 'simulation-etape-';

/** Une étape, réduite à ce que les specs ont le droit d'en LIRE. */
interface EtapeSource {
  readonly etatVisuel?: { readonly surbrillance?: readonly string[] };
}

/** Ce qu'un `simulation.json` déclare, réduit à ce que les specs ont le droit de LIRE. */
interface SimulationSource {
  readonly acteurs: readonly unknown[];
  readonly etapes: readonly EtapeSource[];
}

/**
 * Lit le `simulation.json` de la leçon RÉELLEMENT mesurée par l'artéfact sous test.
 *
 * Rend des tableaux VIDES — plutôt que de lever — quand l'artéfact ne porte aucune
 * leçon à simulation : les trois specs appelants sont déjà sautés par
 * `exigerUneLeconAvecSimulation`, et lever à l'import transformerait un saut
 * annoncé en erreur de chargement (même raison que `lireQuizSource`).
 *
 * En revanche, il LÈVE en se nommant sur les deux incohérences réelles : une leçon
 * dont l'artéfact rend `<app-simulation` sans que sa source déclare la moindre
 * étape, et une leçon prerendue qu'aucune racine de contenu ne déclare. Un retour
 * muet y ferait passer les trois specs VERTS sur zéro étape.
 */
function lireSimulationSource(): SimulationSource {
  const slug = LECON_AVEC_SIMULATION?.slug;
  if (slug === undefined) return { acteurs: [], etapes: [] };

  const chemin = fichierSourceDeLaLecon(slug, 'simulation.json');
  if (chemin === undefined) {
    throw new Error(
      laLeconEstDeclaree(slug)
        ? `la leçon « ${slug} » ne porte pas de « simulation.json », alors que l'artéfact prerend ` +
          "bien un « <app-simulation » sur sa page : la source et l'artéfact ont divergé"
        : `aucune racine de contenu ne déclare « slug: ${slug} », que l'artéfact prerend pourtant : ` +
          'le frontmatter et le manifeste de routes ont divergé, ou la leçon mesurée a été bâtie ' +
          "depuis une racine qu'« aides/lecon-source.ts » ne connaît pas",
    );
  }

  const brut = JSON.parse(readFileSync(chemin, 'utf8')) as Partial<SimulationSource>;
  const acteurs = brut.acteurs ?? [];
  const etapes = brut.etapes ?? [];
  if (etapes.length === 0 || acteurs.length === 0) {
    throw new Error(
      `la simulation de « ${slug} » déclare ${String(acteurs.length)} acteur(s) et ` +
        `${String(etapes.length)} étape(s) — une source vide rendrait les trois specs vacuously verts`,
    );
  }
  return { acteurs, etapes };
}

/**
 * Ce que la SOURCE de la leçon mesurée déclare — jamais ce que le DOM affiche.
 *
 * 📉 Les littéraux `6` et `4` ont disparu le 2026-08-21 (E3-ST3). Ils étaient
 * annotés « mesuré sur la fixture témoin », et c'était exact tant que la fixture
 * était le seul artéfact à porter une simulation. `03-injection` en publie une de
 * **10 étapes et 3 acteurs** : les trois specs de simulation, qui venaient de se
 * rallumer seuls comme prévu, rougissaient tous sur un produit parfaitement SAIN —
 * le mode d'échec exact de L-035 (une prémisse de test fausse accuse le produit).
 *
 * 🔴 CE N'EST PAS UN AFFAIBLISSEMENT DE L'ASSERTION, et c'est le même geste que
 * `quiz-source.ts` : le compte reste confronté à une source INDÉPENDANTE du rendu.
 * L'auteur déclare N étapes dans `simulation.json` ; les specs exigent que le
 * prerender en porte N, qu'aucune ne soit masquée et que N-1 se replient. Un compte
 * tiré du DOM se prouverait lui-même — c'est CELA qui aurait vidé le gate.
 */
const SOURCE = lireSimulationSource();

/** Les étapes que l'auteur déclare. `0` quand l'artéfact n'a aucune simulation. */
export const NOMBRE_ETAPES = SOURCE.etapes.length;

/** Les acteurs que l'auteur déclare. `0` quand l'artéfact n'a aucune simulation. */
export const NOMBRE_ACTEURS = SOURCE.acteurs.length;

/**
 * Les marqueurs « danger » que la page entière doit porter : le gabarit en pose UN
 * par acteur mis en surbrillance, à chaque étape — donc la SOMME des `surbrillance`,
 * pas le nombre d'étapes qui en portent.
 *
 * 📉 Le littéral `1` (« la fixture témoin porte exactement une surbrillance ») a
 * disparu ici le 2026-08-21 pour la même raison que les comptes d'étapes.
 */
export const NOMBRE_MARQUEURS_DANGER = SOURCE.etapes.reduce(
  (total, etape) => total + (etape.etatVisuel?.surbrillance?.length ?? 0),
  0,
);

/**
 * Les arrêts de tabulation de la région : 3 commandes (précédente / suivante /
 * réinitialiser) puis un lien par étape.
 */
export const NOMBRE_LIENS = 3 + NOMBRE_ETAPES;

/** L'`id` de document de l'étape N. */
export function idEtape(numero: number): string {
  return `${PREFIXE_ID_ETAPE}${numero}`;
}

/** La section de l'étape N. */
export function etape(page: Page, numero: number): Locator {
  return page.locator(`#${idEtape(numero)}`);
}

/** Le lien de l'étape N dans la barre (1-indexé, comme le libellé qu'il porte). */
export function lienEtape(page: Page, numero: number): Locator {
  return page.locator('.simulation .liens-etapes a').nth(numero - 1);
}

/** Les trois commandes, dans l'ordre du document. */
export const COMMANDES = { precedente: 0, suivante: 1, reinitialiser: 2 } as const;

/** La commande de rang donné (`COMMANDES`). */
export function commande(page: Page, rang: number): Locator {
  return page.locator('.simulation .commandes a').nth(rang);
}

/**
 * L'état de la simulation tel que le DOM le porte, en UNE lecture.
 *
 * Une seule évaluation plutôt que six locators : les six valeurs décrivent le MÊME
 * instant, ce qui rend le message d'échec lisible (« repliée sur 4, 5 masquées »)
 * au lieu d'exiger de recouper des assertions séparées.
 */
export interface EtatSimulation {
  /** Le numéro porté par le lien `aria-current="step"`, ou `null` s'il n'y en a pas. */
  readonly courante: number | null;
  /** Combien de liens portent `aria-current` — doit valoir 1, toujours. */
  readonly liensCourants: number;
  /** Les numéros des étapes masquées, triés. */
  readonly masquees: readonly number[];
  /** Les valeurs distinctes de l'attribut `hidden` des étapes masquées. */
  readonly valeursHidden: readonly string[];
  /** Le compte de sections d'étape présentes dans le document. */
  readonly etapesPresentes: number;
  /** Les libellés des trois commandes, dans l'ordre. */
  readonly commandes: readonly string[];
}

// =============================================================================
// 🔴 LES BARRIÈRES — À POSER ENTRE UN GESTE ET TOUTE LECTURE DE `lireEtat`
// -----------------------------------------------------------------------------
// LA DETTE QU'ELLES REMBOURSENT (intermittence « famille 1 », 4 occurrences en CI,
// diagnostiquée le 2026-08-20). `lireEtat` est UNE évaluation, servie une fois, et
// les assertions qui la suivent portent sur une VALEUR : `expect(etat.courante)`
// n'est PAS une assertion de locator, donc Playwright ne la rejoue jamais. Or
// l'effet d'un geste sur le DOM n'est pas synchrone : le `(click)` écrit les
// signaux tout de suite, mais la détection de changements zoneless d'Angular est
// PLANIFIÉE — elle peint sur une frame ultérieure.
//
// MESURÉ SUR CE DÉPÔT, PAS DÉDUIT (fixture témoin, `swa start`, 42 échantillons) :
//   · l'effet du geste atteint le DOM 26 à 407 ms APRÈS le geste ;
//   · la lecture `page.evaluate` qui suit est servie 112 à 938 ms après le geste ;
//   · la marge est donc de 58 à 856 ms — confortable, et garantie par RIEN.
// Et l'ordonnancement n'offre aucune garantie : sur 800 essais, une lecture CDP a
// été servie AVANT une `requestAnimationFrame` déjà planifiée 3 fois (0,4 %) —
// jamais avant un `setTimeout(0)`. Sous contention (CI : 2 workers sur 2 cœurs,
// frames sautées), l'ordre s'inverse pour de bon : le test lit l'état d'AVANT le
// geste et rougit en accusant un produit sain (famille L-035).
//
// ⚠️ CE N'EST PAS UNE TOLÉRANCE AU FLOU, ET LA DISTINCTION EST TOUT LE PROPOS.
// Une barrière n'assouplit aucune assertion : elle attend que le DOM porte l'effet
// ANNONCÉ du geste, puis les lectures ponctuelles qui suivent décrivent un instant
// COHÉRENT. Ce qui était mesuré l'est encore, au même endroit ; ce qui disparaît,
// c'est la course. Ajouter des `retries` à `playwright.config.ts` aurait masqué le
// symptôme — c'est exactement ce que le harnais refuse (voir son en-tête).
//
// 🔴 NE JAMAIS POSER DE BARRIÈRE DEVANT UNE ASSERTION NÉGATIVE. « rien ne se
// replie à l'hydratation » (`simulation-mecanique.spec.ts`) affirme une ABSENCE de
// changement : une barrière y serait vraie dès le prerender et ne prouverait plus
// rien. Une barrière se pose devant l'effet d'un GESTE, et devant lui seul.
// =============================================================================

/** Les sections d'étape actuellement masquées — la mesure du repli, en locator. */
function etapesMasquees(page: Page): Locator {
  return page.locator(`.simulation section.etape[hidden]`);
}

/**
 * Attend que la barre désigne l'étape `numero`. Assertion de locator, donc
 * RÉESSAYÉE jusqu'au délai d'expiration, et qui imprime son journal d'attente en
 * cas d'échec — un geste réellement perdu rougit toujours, en nommant sa cause.
 */
export async function attendreCourante(page: Page, numero: number, raison: string): Promise<void> {
  await expect(lienEtape(page, numero), raison).toHaveAttribute('aria-current', 'step');
}

/** Attend le repli COMPLET sur l'étape `numero` : la barre l'a suivie, et M−1 étapes sont masquées. */
export async function attendreRepli(page: Page, numero: number, raison: string): Promise<void> {
  await attendreCourante(page, numero, raison);
  await expect(etapesMasquees(page), raison).toHaveCount(NOMBRE_ETAPES - 1);
}

/**
 * Attend le dépli : plus aucune étape masquée, et la lecture revenue à l'étape 1.
 *
 * ⚠️ Vraie par construction sur une vue JAMAIS repliée — à n'employer qu'après un
 * geste de dépli, sur une vue dont l'appelant a établi qu'elle ÉTAIT repliée.
 */
export async function attendreDepli(page: Page, raison: string): Promise<void> {
  await expect(etapesMasquees(page), raison).toHaveCount(0);
  await attendreCourante(page, 1, raison);
}

export async function lireEtat(page: Page): Promise<EtatSimulation> {
  return page.evaluate(
    ([prefixe, idRegion]: readonly [string, string]) => {
      const region = document.getElementById(idRegion);
      if (region === null) {
        throw new Error(
          `la région « #${idRegion} » est absente du document : la page de leçon mesurée ne porte pas de simulation`,
        );
      }

      const numeroDe = (element: Element): number => Number(element.id.slice(prefixe.length));

      const sections = Array.from(region.querySelectorAll<HTMLElement>('section.etape'));
      const masquees = sections.filter((section) => section.hasAttribute('hidden'));
      const liens = Array.from(
        region.querySelectorAll<HTMLAnchorElement>('.liens-etapes a[aria-current="step"]'),
      );
      const rangs = Array.from(region.querySelectorAll('.liens-etapes a'));

      return {
        courante: liens[0] === undefined ? null : rangs.indexOf(liens[0]) + 1,
        liensCourants: liens.length,
        masquees: masquees.map(numeroDe).sort((a, b) => a - b),
        valeursHidden: [
          ...new Set(masquees.map((section) => section.getAttribute('hidden') ?? '')),
        ],
        etapesPresentes: sections.length,
        commandes: Array.from(region.querySelectorAll('.commandes a')).map((lien) =>
          (lien.textContent ?? '').trim(),
        ),
      };
    },
    [PREFIXE_ID_ETAPE, ID_REGION] as const,
  );
}
