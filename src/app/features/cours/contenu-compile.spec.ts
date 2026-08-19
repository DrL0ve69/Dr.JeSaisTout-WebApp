// =============================================================================
// `leconsPubliees` — l'unique définition de « publiée » du dépôt (E2-ST6, D-1)
// -----------------------------------------------------------------------------
// CE QUE CE FICHIER GARDE, ET POURQUOI ÇA MÉRITE UN SPEC À SOI.
// Le filtre tient à une ligne, mais trois consommateurs en dépendent — le
// sommaire, la navigation prev/next et `parametresDePrerender` — et le troisième
// décide de ce qui est **prerendu et indexable**. Une erreur ici ne se voit pas à
// l'écran : elle met une leçon inachevée en ligne, dans l'index de Google, sans
// qu'aucune page n'ait l'air cassée.
//
// Deux pièges sont visés nommément :
//   1. `verifiee` n'est PAS publiée. Une implémentation en `!== 'brouillon'`
//      passerait tous les tests naïfs et publierait les leçons en relecture.
//   2. L'ajout d'un QUATRIÈME statut au schéma doit forcer une décision. Le
//      dernier test relit `lecon.frontmatter.schema.json` AU DISQUE et exige que
//      l'énumération soit exactement celle qu'on a revue — sans lui, un statut
//      neuf tomberait silencieusement du côté « non publiée » (L-046 : un contrôle
//      d'exhaustivité ne vaut que pour le corpus qu'on lui a donné).
// =============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { leconsPubliees } from './contenu-compile';

/** Les statuts revus à la main le 2026-08-19, RECOPIÉS ICI EN DUR. La duplication
 * est le garde-fou : un test qui importerait la liste qu'il vérifie ne vérifierait
 * rien du contrat (L-012). */
const STATUTS_REVUS = ['brouillon', 'verifiee', 'publiee'];

function entree(
  slug: string,
  statut: EntreeManifesteRoutes['statut'],
  ordre = 1,
): EntreeManifesteRoutes {
  return {
    sujet: 'securite-web',
    slug,
    ordre,
    titre: `Leçon ${slug}`,
    dureeEstimee: 10,
    niveau: 'cegep',
    statut,
  };
}

describe('leconsPubliees', () => {
  it('ne retient que « publiee » — « verifiee » et « brouillon » sont écartées', () => {
    const resultat = leconsPubliees([
      entree('publiee-a', 'publiee', 1),
      entree('en-relecture', 'verifiee', 2),
      entree('en-cours', 'brouillon', 3),
      entree('publiee-b', 'publiee', 4),
    ]);

    expect(resultat.map((e) => e.slug)).toEqual(['publiee-a', 'publiee-b']);
  });

  it('écarte « verifiee », qu’une implémentation en « pas brouillon » laisserait passer', () => {
    // Ce test existe SEUL contre une mutation précise : `statut !== 'brouillon'`.
    // Il publierait les leçons en relecture éditoriale — donc du contenu que
    // personne n'a validé, prerendu et indexable.
    expect(leconsPubliees([entree('en-relecture', 'verifiee')])).toEqual([]);
  });

  it('préserve l’ordre du manifeste, qui fait foi pour l’ordre du cours', () => {
    const resultat = leconsPubliees([
      entree('troisieme', 'publiee', 3),
      entree('premiere', 'publiee', 1),
      entree('deuxieme', 'publiee', 2),
    ]);

    // On constate l'ordre REÇU sans le retrier : `generer-manifeste.mjs` trie déjà,
    // et re-trier ici masquerait une régression du générateur.
    expect(resultat.map((e) => e.slug)).toEqual(['troisieme', 'premiere', 'deuxieme']);
  });

  it('rend un tableau vide sur un manifeste vide — un résultat, pas une panne', () => {
    expect(leconsPubliees([])).toEqual([]);
  });

  it('rend un tableau vide quand AUCUNE leçon n’est publiée', () => {
    // L'état réel de la fixture témoin avant le lot B, et l'état de `content/`
    // jusqu'à E3-ST1 : le sommaire doit pouvoir afficher « en préparation ».
    expect(leconsPubliees([entree('a', 'brouillon'), entree('b', 'verifiee')])).toEqual([]);
  });

  it('ne modifie pas le tableau reçu', () => {
    const source = [entree('a', 'publiee'), entree('b', 'brouillon')];
    leconsPubliees(source);
    expect(source).toHaveLength(2);
  });

  it('rougit si le schéma gagne un statut que ce filtre n’a pas arbitré', () => {
    const schema: unknown = JSON.parse(
      readFileSync(
        join(process.cwd(), 'tools', 'content-pipeline', 'schemas', 'lecon.frontmatter.schema.json'),
        'utf8',
      ),
    );

    const proprietes = (schema as { properties?: Record<string, { enum?: unknown }> }).properties;
    const enumeration = proprietes?.['statut']?.enum;

    expect(enumeration, 'le schéma ne déclare plus d’énumération pour « statut »').toEqual(
      STATUTS_REVUS,
    );
  });
});
