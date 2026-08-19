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

import { Locator, Page } from '@playwright/test';

/** La route de la page de leçon dans l'artéfact de FIXTURE (voir `artefact-mesure.ts`). */
export const CHEMIN_LECON_TEMOIN = '/cours/securite-web/lecon-temoin/';

/** L'`id` de la région — cible du lien « Réinitialiser ». */
export const ID_REGION = 'simulation';

/** Le préfixe des `id` d'étape : l'étape N porte `simulation-etape-N`. */
export const PREFIXE_ID_ETAPE = 'simulation-etape-';

/** Mesuré sur la fixture témoin. */
export const NOMBRE_ETAPES = 6;

/** Mesuré sur la fixture témoin. */
export const NOMBRE_ACTEURS = 4;

/**
 * Les arrêts de tabulation de la région : 3 commandes (précédente / suivante /
 * réinitialiser) puis un lien par étape. Mesuré : 9 sur la fixture témoin.
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
