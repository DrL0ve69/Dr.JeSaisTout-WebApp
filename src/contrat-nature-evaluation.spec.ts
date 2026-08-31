// =============================================================================
// `evaluation.nature` — l'appariement des TROIS écritures du même contrat
// -----------------------------------------------------------------------------
// L'arbitrage R-3 (2026-08-31) a fait porter la règle « pas de module sur une
// évaluation » sur la NATURE de celle-ci plutôt que sur sa présence. Cette nature
// s'écrit trois fois, dans trois langages que rien ne relie :
//
//   1. `tools/content-pipeline/schemas/horaire.schema.json` — l'`enum` d'Ajv, qui
//      décide ce que le BUILD accepte dans un `horaire.json` d'auteur ;
//   2. `tools/content-pipeline/types.d.ts` — l'union TypeScript, qui décide ce que
//      le compilateur connaît ;
//   3. `src/app/features/cours/contenu-compile.ts` — la liste blanche du
//      rétrécissement d'artéfact, qui décide ce que l'APP accepte au CHARGEMENT.
//
// (2) et (3) SONT DÉJÀ APPARIÉES PAR LE TYPAGE : `NATURES_PAR_VALEUR` est un
// `Record<NatureDEvaluation, true>`, donc total et fermé sur l'union — une nature
// ajoutée au contrat sans l'être à la liste ne compile pas, et l'inverse non plus.
// La liste d'exécution en est dérivée par `Object.keys`, elle n'est donc pas une
// quatrième écriture.
//
// 🔴 CE QUE CE FICHIER TIENT, ET QU'AUCUN TYPE NE PEUT TENIR : l'accord avec (1).
// Un JSON n'est pas un type. Sans ce test, ajouter une valeur à l'`enum` du schéma
// livrerait un `horaire.json` accepté par le build et REFUSÉ au chargement de
// l'artéfact — un `ng build` rouge au prerendu, sur un message accusant le module
// au lieu de l'horaire. C'est le mode d'échec exact que le lot 0ter a trouvé entre
// le validateur et l'app, ici transposé au schéma (L-016 : trois exemplaires d'un
// contrat divergent au premier champ ajouté).
//
// ⚠️ CE TEST N'EST PAS SYMÉTRIQUE PAR PARESSE, IL L'EST PAR NÉCESSITÉ : il exige
// l'ÉGALITÉ des deux ensembles, pas l'inclusion. Une inclusion dans un sens
// laisserait le schéma admettre une valeur que l'app refuse ; dans l'autre, l'app
// accepterait une valeur qu'aucun auteur ne peut écrire — une permission morte
// (famille S-005).
// =============================================================================

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { NATURES_D_EVALUATION } from './app/features/cours/contenu-compile';

const SCHEMA = 'tools/content-pipeline/schemas/horaire.schema.json';

/** L'`enum` de `nature`, lu dans le schéma SUR DISQUE — jamais recopié ici. */
function naturesDuSchema(): readonly string[] {
  const schema = JSON.parse(readFileSync(SCHEMA, 'utf8')) as Record<string, unknown>;
  // Le chemin est écrit en toutes lettres : une refonte du schéma qui déplacerait
  // `evaluation` doit faire ÉCHOUER ce test, pas le rendre vide et donc vert.
  const seances = ((schema['properties'] as Record<string, unknown>)?.['seances'] ??
    {}) as Record<string, unknown>;
  const seance = (seances['items'] ?? {}) as Record<string, unknown>;
  const proprietes = (seance['properties'] ?? {}) as Record<string, unknown>;
  const evaluation = (proprietes['evaluation'] ?? {}) as Record<string, unknown>;
  const champs = (evaluation['properties'] ?? {}) as Record<string, unknown>;
  const nature = (champs['nature'] ?? {}) as Record<string, unknown>;
  const valeurs = nature['enum'];
  if (!Array.isArray(valeurs) || valeurs.length === 0) {
    throw new Error(
      `${SCHEMA} : « seances.items.properties.evaluation.properties.nature.enum » introuvable ou ` +
        "vide — l'extraction a échoué, et un test qui ne trouve rien ne prouve rien",
    );
  }
  return valeurs as readonly string[];
}

describe('`evaluation.nature` — le schéma JSON et la liste blanche de l’app', () => {
  it('déclarent EXACTEMENT les mêmes natures, dans les deux sens', () => {
    const duSchema = [...naturesDuSchema()].sort();
    const deLApp = [...NATURES_D_EVALUATION].sort();

    expect(duSchema).toEqual(deLApp);
  });

  it('exigent que « nature » soit REQUISE, jamais optionnelle à défaut permissif', () => {
    // ⚠️ C'EST LA MOITIÉ QUI TIENT L'ARBITRAGE, PAS SEULEMENT LA FORME. Rendue
    // optionnelle, la nature rouvrirait EN SILENCE les séances d'examen écrit : une
    // évaluation sans nature serait lue comme « pas evaluation-pratique » ici, mais
    // rien n'obligerait plus un auteur à qualifier les siennes. Une omission doit se
    // NOMMER — c'est le motif écrit de l'arbitrage R-3.
    const schema = JSON.parse(readFileSync(SCHEMA, 'utf8')) as Record<string, unknown>;
    const evaluation = (
      (
        (
          ((schema['properties'] as Record<string, unknown>)['seances'] as Record<string, unknown>)[
            'items'
          ] as Record<string, unknown>
        )['properties'] as Record<string, unknown>
      )['evaluation'] as Record<string, unknown>
    )['required'];

    expect(evaluation).toContain('nature');
  });
});
