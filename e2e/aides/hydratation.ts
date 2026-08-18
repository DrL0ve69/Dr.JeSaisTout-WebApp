// =============================================================================
// Attendre la fin de l'hydratation — la MÊME attente pour tous les specs
// -----------------------------------------------------------------------------
// POURQUOI CETTE AIDE EXISTE. Trois specs de la page de leçon ont besoin du même
// point de départ : « le composant est branché, on peut agir ». Chacun en portait
// sa copie, et ces trois lignes étaient libres de diverger en silence — c'est très
// exactement l'argument L-016 qui a déjà fait déménager `indicateur-focus.ts` puis
// `sonde-csp.ts` au lot E d'E2-ST3. Une troisième copie laissée en place aurait été
// une inconséquence : on ne mutualise pas la mesure du focus et de la CSP en
// écrivant pourquoi, pour recopier l'attente juste au-dessus.
//
// ⚠️ POURQUOI `[ngh]` ET NON UNE DURÉE. Angular pose des attributs `ngh` sur le
// HTML déshydraté et les retire quand les vues s'hydratent : c'est un point de
// synchronisation OBSERVABLE. Un `waitForTimeout` mesurerait la vitesse du poste,
// pas l'état de la page. Le marqueur est INTERNE au framework, et c'est assumé :
// s'il changeait de nom, l'attente expirerait et les specs rougiraient
// bruyamment — jamais ne passeraient vert en silence (mode d'échec L-019).
// =============================================================================

import { Page, expect } from '@playwright/test';

/** Le tronc commun du message : un même échec se lit pareil dans tous les specs. */
const MESSAGE = "l'hydratation ne s'est jamais terminée (attributs `ngh` toujours présents)";

/**
 * Attend que plus aucun attribut `ngh` ne subsiste — donc que l'hydratation soit
 * terminée et le composant réellement branché.
 *
 * @param indice complément de message propre à l'appelant, quand l'échec a une
 * cause probable que ce spec-là est seul à connaître (par exemple : « le chunk
 * paresseux de la leçon a-t-il été refusé par `script-src` ? »).
 */
export async function attendreHydratation(page: Page, indice?: string): Promise<void> {
  await expect(
    page.locator('[ngh]'),
    indice === undefined ? MESSAGE : `${MESSAGE} — ${indice}`,
  ).toHaveCount(0);
}
