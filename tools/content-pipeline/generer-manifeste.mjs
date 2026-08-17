#!/usr/bin/env node
/**
 * GÉNÉRATEUR DU MANIFESTE ET DE LA CARTE D'IMPORTS — E2-ST1, lot 4
 * =============================================================================
 * Matérialise `src/content-generated/`, c'est-à-dire TOUT ce que l'application Angular verra du
 * contenu compilé. Trois sorties, indissociables et écrites ensemble par `ecrireContenuGenere()` :
 *
 *   1. `lecons/<slug>.json` — une `LeconCompilee` par leçon, un fichier par leçon.
 *   2. `manifeste-routes.json` — le tableau `EntreeManifesteRoutes[]`, TRIÉ PAR `ordre`. C'est lui
 *      que lira `getPrerenderParams()` (E2-ST2) pour savoir quelles routes prerendre, et l'index du
 *      cours pour lister ses leçons. Il ne porte QUE des métadonnées : jamais le corps d'une leçon,
 *      sans quoi la page d'index embarquerait les treize leçons.
 *   3. `carte-lecons.ts` — un `() => import('./lecons/<slug>.json')` PAR SLUG.
 *
 * POURQUOI UN IMPORT PAR SLUG, ET NON UN SEUL MODULE DE DONNÉES (objection B3 du plan arrêté).
 * Un `import donnees from './lecons.json'` — ou même un `Record` littéral qui référencerait les
 * treize fichiers — fait entrer TOUT le contenu dans le graphe statique : esbuild n'a alors aucune
 * frontière où couper, et le visiteur d'une seule leçon télécharge les douze autres. Un import
 * DYNAMIQUE est, au contraire, exactement le point de coupe qu'esbuild cherche : il émet un chunk
 * par expression `import()` distincte. La carte est donc écrite avec une expression littérale par
 * slug — jamais `import(`./lecons/${slug}.json`)`, qui ne serait plus analysable statiquement et
 * ferait retomber tout le contenu dans un chunk unique (ou échouerait au bundling).
 *
 * POURQUOI CE FICHIER ÉCRIT AUSSI LES `lecons/<slug>.json`, ET PAS SEULEMENT LA CARTE.
 * Les noms de fichiers écrits ICI sont précisément les chemins cités dans la carte. Séparer les
 * deux écritures ferait de cette correspondance une convention tacite entre deux modules ; les
 * garder ensemble en fait une seule fonction, qui ne peut pas se contredire.
 *
 * CE FICHIER N'A PAS DE LIGNE DE COMMANDE — délibérément. Il consomme un AST en mémoire
 * (`LeconCompilee[]`), que seul l'orchestrateur `build.mjs` possède après compilation. Une CLI
 * autonome devrait recompiler, donc dupliquer `build.mjs`.
 */
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Sous-dossier des leçons compilées, relatif au dossier de sortie. Cité tel quel dans la carte. */
const DOSSIER_LECONS = 'lecons';

/** Nom du manifeste de routes. */
const FICHIER_MANIFESTE = 'manifeste-routes.json';

/** Nom de la carte d'imports paresseux. */
const FICHIER_CARTE = 'carte-lecons.ts';

/**
 * @param {string} message
 * @param {readonly string[]} [details]
 * @returns {never}
 */
function echec(message, details = []) {
  console.error(`\n✖ generer-manifeste : ${message}`);
  for (const d of details) console.error(`   · ${d}`);
  console.error('');
  process.exit(1);
}

/**
 * Écriture ATOMIQUE — le primitif d'écriture du pipeline, réutilisé par l'orchestrateur pour la
 * feuille de coloration.
 *
 * Pourquoi ce détour plutôt qu'un `writeFileSync` direct : `src/styles.scss` fait `@use` sur une
 * feuille que ce pipeline produit, et `ng build`/`ng test` peuvent la lire pendant qu'on l'écrit
 * (mode `--watch`, exécutions concurrentes). Un `writeFileSync` interrompu laisse un fichier
 * TRONQUÉ mais présent — donc un Sass qui échoue sur une syntaxe incompréhensible, à un endroit
 * qui n'a rien à voir avec la cause. Écrire à côté puis renommer rend la substitution indivisible :
 * le lecteur voit l'ancienne version ou la nouvelle, jamais une moitié.
 *
 * @param {string} chemin chemin absolu du fichier final
 * @param {string} contenu
 * @returns {number} nombre d'octets écrits (UTF-8)
 */
export function ecrireAtomique(chemin, contenu) {
  mkdirSync(dirname(chemin), { recursive: true });
  const provisoire = `${chemin}.tmp-${process.pid}`;
  const octets = Buffer.byteLength(contenu, 'utf8');
  writeFileSync(provisoire, contenu, 'utf8');
  // `renameSync` remplace la cible existante sur les trois plateformes (sous Windows, Node passe
  // MOVEFILE_REPLACE_EXISTING) : pas de `unlink` préalable, qui rouvrirait la fenêtre qu'on ferme.
  renameSync(provisoire, chemin);
  return octets;
}

/**
 * Construit le manifeste de routes, TRIÉ PAR `ordre`.
 *
 * Le tri se fait ici et pas au rendu : c'est le manifeste qui décide de l'ordre d'affichage du
 * cours, et il ne doit pas dépendre de l'ordre — alphabétique — dans lequel le système de fichiers
 * a rendu les dossiers. `ordre` est unique dans une racine (le validateur le vérifie) ; le tri
 * secondaire par slug n'existe donc que pour rendre la fonction totale, jamais pour départager.
 *
 * @param {readonly LeconCompilee[]} lecons
 * @returns {EntreeManifesteRoutes[]}
 */
export function construireManifeste(lecons) {
  return lecons
    .map((lecon) => ({
      sujet: lecon.frontmatter.sujet,
      slug: lecon.frontmatter.slug,
      ordre: lecon.frontmatter.ordre,
      titre: lecon.frontmatter.titre,
      dureeEstimee: lecon.frontmatter.dureeEstimee,
      niveau: lecon.frontmatter.niveau,
      statut: lecon.frontmatter.statut,
    }))
    .sort((a, b) => a.ordre - b.ordre || a.slug.localeCompare(b.slug, 'fr'));
}

/**
 * Rend le source TypeScript de la carte d'imports paresseux.
 *
 * @param {readonly EntreeManifesteRoutes[]} entrees déjà triées
 * @returns {string}
 */
export function rendreCarteLecons(entrees) {
  for (const entree of entrees) {
    // Le slug sert à la fois de CLEF d'objet et de NOM DE FICHIER dans une expression `import()`.
    // Le schéma du frontmatter le contraint déjà en kebab-case strict et le validateur exige qu'il
    // égale le suffixe du dossier — mais ce générateur écrit du CODE : il ne suppose pas qu'un
    // garde-fou situé en amont a tourné. Un slug qui s'échapperait de cette forme (point, barre
    // oblique, apostrophe) produirait un module qui ne compile pas, ou pire, un chemin qui sort du
    // dossier de sortie.
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(entree.slug)) {
      echec(`slug refusé pour la génération de code : « ${entree.slug} »`, [
        'attendu : kebab-case strict (minuscules non accentuées, chiffres, tirets simples)',
        "ce slug sert de nom de fichier ET de clef d'objet dans carte-lecons.ts",
      ]);
    }
  }

  const lignes = entrees.map(
    (e) => `  '${e.slug}': () => import('./${DOSSIER_LECONS}/${e.slug}.json'),`,
  );

  return `// =============================================================================
// ⚠️ FICHIER GÉNÉRÉ — NE PAS ÉDITER À LA MAIN
// -----------------------------------------------------------------------------
// Écrit par \`tools/content-pipeline/generer-manifeste.mjs\` à chaque
// \`npm run content:build\`, qui le RÉÉCRIT intégralement. Il est gitignoré
// (\`/src/content-generated/\`) : la source, c'est \`content/\`.
//
// UN IMPORT DYNAMIQUE PAR SLUG, ET C'EST LE POINT (objection B3 du plan d'E2-ST1).
// Chaque expression \`import()\` littérale est un point de coupe pour esbuild : le
// bundler émet un chunk par leçon, et le visiteur d'une leçon ne télécharge que
// celle-là. Un import calculé (\`import(\\\`./lecons/\${slug}.json\\\`)\`) ne serait pas
// analysable statiquement et ferait retomber tout le contenu dans un seul chunk.
//
// Le type du \`default\` est \`unknown\` ICI, à dessein : \`LeconCompilee\` vit dans
// \`tools/content-pipeline/types.d.ts\`, qui appartient au programme outillage
// (\`tsconfig.tools.json\`) et non au programme applicatif. C'est E2-ST2 qui
// rapatriera le contrat côté Angular et affinera ce type au point de consommation.
// =============================================================================

export type ChargeurLecon = () => Promise<{ default: unknown }>;

/** Clef = slug de la leçon ; valeur = son chargeur paresseux. ${entrees.length} leçon(s). */
export const carteLecons: Record<string, ChargeurLecon> = {${
    lignes.length === 0 ? '' : `\n${lignes.join('\n')}\n`
  }};
`;
}

/**
 * @typedef {object} FichierEcrit
 * @property {string} slug
 * @property {string} chemin chemin absolu
 * @property {number} octets
 */

/**
 * Écrit les trois sorties dans `dossierSortie`. Le dossier est supposé DÉJÀ PURGÉ par
 * l'orchestrateur : ce module ajoute, il n'efface pas.
 *
 * @param {string} dossierSortie chemin absolu
 * @param {readonly LeconCompilee[]} lecons
 * @returns {{ entrees: EntreeManifesteRoutes[], fichiers: FichierEcrit[], manifeste: string, carte: string }}
 */
export function ecrireContenuGenere(dossierSortie, lecons) {
  const entrees = construireManifeste(lecons);

  /** @type {Map<string, LeconCompilee>} */
  const parSlug = new Map();
  for (const lecon of lecons) {
    const slug = lecon.frontmatter.slug;
    if (parSlug.has(slug)) {
      echec(`deux leçons compilées portent le slug « ${slug} »`, [
        'le validateur le refuse déjà dans une même racine — ce contrôle attrape le cas où deux',
        'racines seraient compilées ensemble, où le second fichier écraserait le premier en silence',
      ]);
    }
    parSlug.set(slug, lecon);
  }

  /** @type {FichierEcrit[]} */
  const fichiers = [];
  for (const entree of entrees) {
    const lecon = parSlug.get(entree.slug);
    if (lecon === undefined) continue; // inatteignable : les entrées viennent des leçons
    const chemin = join(dossierSortie, DOSSIER_LECONS, `${entree.slug}.json`);
    // Pas d'indentation : ce JSON est un ARTÉFACT lu par un bundler, jamais par un humain, et
    // l'indentation pèserait ~20 % du poids mesuré par `verifier-poids.mjs`.
    const octets = ecrireAtomique(chemin, JSON.stringify(lecon));
    fichiers.push({ slug: entree.slug, chemin, octets });
  }

  // Le manifeste, lui, est indenté : il est court, et c'est le seul artéfact généré qu'un humain
  // ouvre pour comprendre ce que le build a vu.
  const manifeste = `${JSON.stringify(entrees, null, 2)}\n`;
  ecrireAtomique(join(dossierSortie, FICHIER_MANIFESTE), manifeste);

  const carte = rendreCarteLecons(entrees);
  ecrireAtomique(join(dossierSortie, FICHIER_CARTE), carte);

  return { entrees, fichiers, manifeste, carte };
}
