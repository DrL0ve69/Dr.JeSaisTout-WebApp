#!/usr/bin/env node
/**
 * GATE DE POIDS DU CONTENU COMPILÉ — E2-ST1, lot 4
 * =============================================================================
 * Mesure le JSON produit POUR CHAQUE LEÇON et imprime la table à chaque exécution. Deux seuils,
 * volontairement différents :
 *
 *   · 150 Ko — AVERTISSEMENT. La leçon reste publiable ; le journal le dit pour que l'auteur le
 *     voie avant que ça devienne un problème.
 *   · 300 Ko — ÉCHEC. Sur une connexion mobile, un chunk de cette taille retarde l'affichage de la
 *     leçon de plusieurs secondes après un premier rendu déjà prerendu — le lecteur voit le texte,
 *     puis attend. C'est le point où l'on refuse de publier.
 *
 * POURQUOI PAR LEÇON, ET NON EN TOTAL. La carte d'imports découpe le contenu en un chunk par slug
 * (voir `generer-manifeste.mjs`) : ce qu'un visiteur télécharge, c'est UNE leçon. Un total de 3 Mo
 * réparti en treize chunks de 230 Ko n'est pas le même produit qu'une leçon unique de 3 Mo, et
 * seule la seconde est un défaut.
 *
 * CE QUE CETTE MESURE EST — ET CE QU'ELLE N'EST PAS. C'est un PROXY : on mesure le JSON écrit, pas
 * le chunk esbuild final (qui sera minifié et compressé). La corrélation est directe et monotone
 * — un JSON qui double double son chunk — mais les chiffres ne sont pas les mêmes. Un budget
 * `angular.json` n'aurait, lui, aucune prise : il ne sait pas nommer des chunks lazy dont le nom
 * est dérivé du contenu. Dette assumée, consignée au plan d'E2-ST1.
 *
 * L-005 — LE JOURNAL FAIT FOI. La table s'imprime TOUJOURS, y compris (et surtout) quand elle est
 * vide : « 0 leçon mesurée » est une information, un silence n'en est pas une.
 *
 * Usage :
 *   node tools/content-pipeline/verifier-poids.mjs [--dossier src/content-generated/lecons]
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const RACINE_DEPOT = process.cwd();

/** Dossier des leçons compilées, tel que `generer-manifeste.mjs` l'écrit. */
const DOSSIER_PAR_DEFAUT = 'src/content-generated/lecons';

/** Seuil d'AVERTISSEMENT, en octets. */
export const SEUIL_AVERTISSEMENT = 150 * 1024;

/** Seuil d'ÉCHEC, en octets. */
export const SEUIL_ECHEC = 300 * 1024;

/**
 * @param {string} message
 * @param {readonly string[]} [details]
 * @returns {never}
 */
function echec(message, details = []) {
  console.error(`\n✖ verifier-poids : ${message}`);
  for (const d of details) console.error(`   · ${d}`);
  console.error('');
  process.exit(1);
}

/**
 * @param {number} octets
 * @returns {string} « 12,3 Ko », en français
 */
function enKo(octets) {
  return `${(octets / 1024).toFixed(1).replace('.', ',')} Ko`;
}

/**
 * @typedef {object} Mesure
 * @property {string} slug
 * @property {number} octets
 * @property {'ok' | 'avertissement' | 'echec'} verdict
 */

/**
 * Marque imprimée en tête de ligne, par verdict. Table plutôt que ternaires imbriqués (S3358) : la
 * correspondance verdict → symbole se lit d'un coup d'œil, et le typage `Record` force à couvrir
 * TOUS les verdicts — un verdict ajouté sans sa marque ne compile plus, là où un ternaire l'aurait
 * silencieusement rangé dans la branche par défaut.
 *
 * @type {Record<Mesure['verdict'], string>}
 */
const MARQUES = { echec: '✖', avertissement: '▲', ok: '·' };

/**
 * @param {number} octets
 * @returns {Mesure['verdict']}
 */
function juger(octets) {
  if (octets >= SEUIL_ECHEC) return 'echec';
  if (octets >= SEUIL_AVERTISSEMENT) return 'avertissement';
  return 'ok';
}

/**
 * Mesure chaque `<slug>.json` d'un dossier. Un dossier ABSENT rend une liste vide sans échouer :
 * avant E3, `content/` ne porte aucune leçon et il n'y a rien à mesurer — ce n'est pas une faute.
 *
 * @param {string} dossier chemin absolu
 * @returns {Mesure[]} triées de la plus lourde à la plus légère
 */
export function mesurer(dossier) {
  /** @type {string[]} */
  let entrees;
  try {
    entrees = readdirSync(dossier);
  } catch {
    return [];
  }
  return entrees
    .filter((nom) => nom.endsWith('.json'))
    .map((nom) => {
      const octets = statSync(join(dossier, nom)).size;
      return { slug: nom.slice(0, -'.json'.length), octets, verdict: juger(octets) };
    })
    .sort((a, b) => b.octets - a.octets || a.slug.localeCompare(b.slug, 'fr'));
}

/**
 * Imprime la table et rend le verdict global.
 *
 * @param {readonly Mesure[]} mesures
 * @param {string} dossier chemin absolu, pour l'en-tête
 * @returns {{ avertissements: number, echecs: number, total: number }}
 */
export function imprimer(mesures, dossier) {
  const affichage = relative(RACINE_DEPOT, dossier).replaceAll('\\', '/') || '.';
  const total = mesures.reduce((somme, m) => somme + m.octets, 0);

  console.log(
    `\nPoids du contenu compilé — ${affichage} ` +
      `(avertissement ≥ ${enKo(SEUIL_AVERTISSEMENT)}, échec ≥ ${enKo(SEUIL_ECHEC)})`,
  );
  if (mesures.length === 0) {
    console.log('   (0 leçon mesurée)');
  }
  for (const m of mesures) {
    console.log(`   ${MARQUES[m.verdict]} ${m.slug.padEnd(32)} ${enKo(m.octets).padStart(10)}`);
  }

  const avertissements = mesures.filter((m) => m.verdict === 'avertissement').length;
  const echecs = mesures.filter((m) => m.verdict === 'echec').length;
  console.log(
    `   ${mesures.length} leçon(s) · ${enKo(total)} au total · ` +
      `${avertissements} avertissement(s) · ${echecs} dépassement(s)\n`,
  );
  return { avertissements, echecs, total };
}

/**
 * Mesure, imprime, et rend le nombre de dépassements. C'est le point d'entrée de l'orchestrateur :
 * il ne quitte PAS le processus lui-même — c'est `build.mjs` qui décide de l'échec, avec son propre
 * message.
 *
 * @param {string} dossier chemin absolu
 * @returns {{ mesures: Mesure[], avertissements: number, echecs: number, total: number }}
 */
export function verifierPoids(dossier) {
  const mesures = mesurer(dossier);
  return { mesures, ...imprimer(mesures, dossier) };
}

// ---------------------------------------------------------------------------
// Ligne de commande
// ---------------------------------------------------------------------------

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  let dossier = DOSSIER_PAR_DEFAUT;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--dossier') {
      const valeur = args[i + 1];
      if (valeur === undefined || valeur.startsWith('--'))
        echec("l'option --dossier attend un chemin");
      dossier = valeur;
      i += 1;
    } else {
      echec(`option inconnue : « ${String(arg)} »`, [
        'usage : node tools/content-pipeline/verifier-poids.mjs [--dossier <chemin>]',
      ]);
    }
  }
  const { echecs } = verifierPoids(resolve(RACINE_DEPOT, dossier));
  if (echecs > 0) {
    echec(`${echecs} leçon(s) dépassent ${enKo(SEUIL_ECHEC)}`, [
      'alléger la leçon : moins de diagrammes, ou des diagrammes plus simples (le SVG domine)',
      'la scinder en deux leçons est souvent la bonne réponse pédagogique autant que technique',
    ]);
  }
}
