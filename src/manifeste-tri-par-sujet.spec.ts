// =============================================================================
// Le PRODUCTEUR du manifeste groupe-t-il ses entrées par sujet ? (PHP-PUB-3)
// -----------------------------------------------------------------------------
// POURQUOI CE TEST EXISTE.
// Le contrat d'ordre de `manifeste-routes.json` (`tools/content-pipeline/types.d.ts`)
// est CONSTATÉ par le lecteur, `lireManifeste` (`contenu-compile.ts`), et ses deux
// moitiés y ont chacune un test négatif (`lecon.spec.ts`). Mais un test du lecteur
// ne prouve pas le producteur : si `construireManifeste` revenait au tri par
// `ordre` seul, seul le chargement du VRAI manifeste rougirait — et seulement tant
// que deux cours publient des `ordre` qui se chevauchent. Le jour où ce n'est plus
// le cas, la régression passerait en silence (constat de revue, 2026-09-17).
//
// D'où une entrée FABRIQUÉE ici, qui entremêle deux sujets quel que soit le
// contenu réel, et la sortie exacte attendue.
//
// POURQUOI PAR PROCESSUS FILS. Même frontière que `coloration-encres-contraste.spec.ts` :
// `tools/**/*.mjs` est un programme Node à part, vérifié par `typecheck:tools` ;
// l'importer ici le ferait entrer dans le programme TypeScript du navigateur.
// =============================================================================

import { execFileSync } from 'node:child_process';

const GENERATEUR = 'tools/content-pipeline/generer-manifeste.mjs';

interface EntreeTriee {
  readonly sujet: string;
  readonly ordre: number;
}

/** Une leçon compilée minimale : seuls les champs lus par `construireManifeste`. */
function lecon(sujet: string, slug: string, ordre: number): object {
  return {
    frontmatter: { sujet, slug, ordre, titre: slug, dureeEstimee: 10, niveau: 'cegep', statut: 'publiee' },
  };
}

/** Passe les leçons au vrai `construireManifeste` et rend `sujet/ordre` dans l'ordre produit. */
function trier(lecons: readonly object[]): string[] {
  const script = [
    `import { construireManifeste } from './${GENERATEUR}';`,
    `const lecons = JSON.parse(process.argv[1]);`,
    `process.stdout.write(JSON.stringify(construireManifeste(lecons)));`,
  ].join('\n');
  const sortie = execFileSync(process.execPath, ['--input-type=module', '-e', script, JSON.stringify(lecons)], {
    encoding: 'utf8',
  });
  const entrees = JSON.parse(sortie) as EntreeTriee[];
  return entrees.map((entree) => `${entree.sujet}/${String(entree.ordre)}`);
}

describe('construireManifeste — groupé par sujet, puis par ordre', () => {
  it('sépare deux cours dont les « ordre » se chevauchent, sujets en ordre alphabétique', () => {
    const entree = [
      lecon('securite-web', 'fondamentaux', 1),
      lecon('php', 'introduction', 1),
      lecon('securite-web', 'linux', 2),
      lecon('php', 'superglobales', 2),
    ];

    expect(trier(entree)).toEqual(['php/1', 'php/2', 'securite-web/1', 'securite-web/2']);
  });

  it('trie par « ordre » à l’intérieur d’un sujet, quel que soit l’ordre d’arrivée', () => {
    const entree = [lecon('php', 'sessions', 6), lecon('php', 'introduction', 1), lecon('php', 'poo', 4)];

    expect(trier(entree)).toEqual(['php/1', 'php/4', 'php/6']);
  });
});
