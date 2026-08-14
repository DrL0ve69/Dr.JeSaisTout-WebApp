#!/usr/bin/env node
// Recherche dans la KnowledgeBase — gratuit, sans clé, sans index persistant.
//
// Pourquoi pas de recherche vectorielle : voir docs/kb-map.md §8 et les fiches
// ai/agents/outils/analyse-codebase-graph.md + ai/rag/architecture-rag.md. Un corpus de 263
// fichiers Markdown est trop petit pour amortir un index (coût d'entretien, dérive, dépendance
// tierce), et un index qui dérive du contenu réel est pire qu'utile.
//
// Ce script lit le frontmatter (titre, tags) de chaque fiche + la ligne descriptive d'INDEX.md,
// et classe par pertinence. Sortie volontairement compacte : elle est destinée à être lue par un
// agent qui paie ses tokens.
//
// Usage :
//   node tools/kb-search.mjs csp en-tetes            # tous les termes (ET)
//   node tools/kb-search.mjs --any csrf cors         # au moins un terme (OU)
//   node tools/kb-search.mjs --full "roving tabindex" # cherche aussi dans le corps des fiches
//   node tools/kb-search.mjs --n 20 accessibilite    # nombre de résultats (défaut : 12)
//
// Racine de la KB : variable d'environnement KB_ROOT, sinon ../../KnowledgeBase depuis ce dépôt.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE_DEPOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
// Notation indexée et non pointée : `process.env` est une signature d'index, et
// `noPropertyAccessFromIndexSignature` (politique du dépôt) exige que ce qui n'est pas déclaré se
// lise comme tel — une coquille `process.env.KBROOT` doit sauter aux yeux, pas rendre `undefined`.
const KB = process.env['KB_ROOT'] ?? resolve(RACINE_DEPOT, '..', '..', 'KnowledgeBase');
const IGNORES = new Set(['_archiviste', '.obsidian', '.git', 'node_modules']);

// --- arguments -------------------------------------------------------------

const args = process.argv.slice(2);
const options = { any: false, full: false, n: 12 };
/** @type {string[]} */
const termes = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  // `i < args.length` garantit la présence, mais `noUncheckedIndexedAccess` ne modélise pas cette
  // relation : sans ce filtre, `termes` deviendrait `(string | undefined)[]` et contaminerait tout
  // l'aval jusqu'à `norm()`. Une erreur de typage qui remonte loin se coupe à sa source.
  if (a === undefined) continue;
  if (a === '--any') options.any = true;
  else if (a === '--full') options.full = true;
  // `--n` en dernière position n'a pas d'argument : `args[++i]` est alors `undefined`. Le `?? ''`
  // le dit au compilateur sans changer le comportement — `parseInt('')` rend `NaN`, que le `|| 12`
  // ramène déjà au défaut.
  else if (a === '--n') options.n = Number.parseInt(args[++i] ?? '', 10) || 12;
  else termes.push(a);
}

if (termes.length === 0) {
  console.error('Usage : node tools/kb-search.mjs [--any] [--full] [--n N] <termes...>');
  process.exit(2);
}

/**
 * Minuscules sans accents : « Accessibilité » et « accessibilite » doivent matcher.
 * @param {string} s
 * @returns {string}
 */
const norm = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const besoins = termes.map(norm);

// --- descriptions d'INDEX.md ----------------------------------------------

/** @type {Map<string, string>} chemin de fiche (séparateurs `/`) → description d'une ligne */
const descriptions = new Map();
try {
  const index = readFileSync(join(KB, 'INDEX.md'), 'utf8');
  // Format imposé par CONVENTIONS.md : `- [chemin](chemin) — mots-clés`
  for (const ligne of index.split('\n')) {
    const m = /^- \[[^\]]+\]\(([^)]+\.md)\)\s*[—-]\s*(.+)$/.exec(ligne.trim());
    // Les deux groupes sont obligatoires dans le motif ; `noUncheckedIndexedAccess` l'ignore et les
    // rend `string | undefined`. On les teste plutôt que de les affirmer : une ligne d'INDEX.md
    // hors format doit être ignorée, jamais enregistrée à moitié.
    if (m?.[1] !== undefined && m[2] !== undefined) descriptions.set(m[1], m[2].trim());
  }
} catch {
  console.error(`⚠ INDEX.md illisible sous ${KB} — recherche sur frontmatter seul.`);
}

// --- parcours des fiches ---------------------------------------------------

/**
 * @param {string} dossier racine du parcours
 * @returns {string[]} chemins absolus de toutes les fiches .md retenues — annotation OBLIGATOIRE :
 *   la fonction est récursive, TypeScript ne peut pas inférer son retour seul (TS7023).
 */
function parcourir(dossier) {
  /** @type {string[]} */
  const trouves = [];
  for (const entree of readdirSync(dossier)) {
    if (IGNORES.has(entree)) continue;
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) trouves.push(...parcourir(chemin));
    else if (entree.endsWith('.md')) trouves.push(chemin);
  }
  return trouves;
}

/**
 * Extrait `titre` et `tags` du frontmatter YAML, sans dépendance de parsing.
 * @param {string} contenu fiche Markdown entière
 * @returns {{ titre: string, tags: string }} chaînes vides quand le frontmatter manque
 */
function frontmatter(contenu) {
  if (!contenu.startsWith('---')) return { titre: '', tags: '' };
  const fin = contenu.indexOf('\n---', 3);
  if (fin === -1) return { titre: '', tags: '' };
  const bloc = contenu.slice(3, fin);
  const titre = /^titre:\s*(.+)$/m.exec(bloc)?.[1]?.trim() ?? '';
  const tags = /^tags:\s*(.+)$/m.exec(bloc)?.[1]?.trim() ?? '';
  return { titre, tags };
}

let fiches;
try {
  fiches = parcourir(KB);
} catch (err) {
  console.error(`✖ KnowledgeBase introuvable sous ${KB}. Définir KB_ROOT si elle a bougé.`);
  // `catch` livre un `unknown` : on ne présume pas d'un `Error`. Une exception non-Error (une
  // chaîne lancée par une dépendance) doit rester affichable, pas faire planter le gestionnaire.
  console.error(`  (${err instanceof Error ? err.message : String(err)})`);
  process.exit(1);
}

// --- classement ------------------------------------------------------------

/** @typedef {'chemin' | 'titre' | 'tags' | 'description' | 'corps'} Champ */

/**
 * Pondération : un terme dans le chemin ou le titre est un signal plus fort qu'un terme
 * noyé dans le corps d'une fiche de 600 lignes.
 *
 * Déclarée en PAIRES ORDONNÉES et non en objet, et typée explicitement : un littéral
 * `[['chemin', 10], …]` s'infère en `(string | number)[][]`, ce qui perd à la fois le nom du champ
 * et son poids. Le tuple nommé les rétablit — et surtout, `champ` sort de la boucle avec le type
 * `Champ`, donc il indexe `champs` sans élargir celui-ci à une signature d'index. `Object.entries()`
 * sur un objet, lui, rend toujours des clés `string` : c'est ce détour qui coûtait deux erreurs.
 *
 * @type {ReadonlyArray<readonly [champ: Champ, poids: number]>}
 */
const POIDS = [
  ['chemin', 10],
  ['titre', 8],
  ['tags', 6],
  ['description', 3],
  ['corps', 1],
];

/** @type {{ rel: string, titre: string, description: string, score: number }[]} */
const resultats = [];
for (const absolu of fiches) {
  const rel = relative(KB, absolu).split(sep).join('/');
  if (rel === 'INDEX.md' || rel === 'CONVENTIONS.md') continue;

  const contenu = readFileSync(absolu, 'utf8');
  const { titre, tags } = frontmatter(contenu);
  const description = descriptions.get(rel) ?? '';

  /** @type {Record<Champ, string>} */
  const champs = {
    chemin: norm(rel),
    titre: norm(titre),
    tags: norm(tags),
    description: norm(description),
    corps: options.full ? norm(contenu) : '',
  };

  let score = 0;
  let termesTrouves = 0;
  for (const besoin of besoins) {
    let meilleur = 0;
    for (const [champ, poids] of POIDS) {
      // Le test de non-vacuité est conservé : sans `--full`, `corps` vaut `''`, et un terme vide
      // passé en argument y serait « trouvé » par `''.includes('')`.
      if (champs[champ] && champs[champ].includes(besoin)) meilleur = Math.max(meilleur, poids);
    }
    if (meilleur > 0) termesTrouves++;
    score += meilleur;
  }

  const retenu = options.any ? termesTrouves > 0 : termesTrouves === besoins.length;
  if (retenu) resultats.push({ rel, titre, description, score });
}

// --- sortie ----------------------------------------------------------------

resultats.sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel));

if (resultats.length === 0) {
  const conseil = options.full
    ? "Élargir avec --any, ou le sujet est un trou de la KB (voir docs/kb-map.md §Trous connus)."
    : 'Réessayer avec --full (cherche dans le corps des fiches) ou --any.';
  console.log(`Aucune fiche pour : ${termes.join(' ')}\n${conseil}`);
  process.exit(0);
}

const affiches = resultats.slice(0, options.n);
console.log(`${resultats.length} fiche(s) — ${affiches.length} affichée(s) · racine : ${KB}\n`);
for (const r of affiches) {
  console.log(`${String(r.score).padStart(3)}  ${r.rel}`);
  if (r.titre) console.log(`     ${r.titre}`);
  if (r.description) {
    const d = r.description.length > 160 ? `${r.description.slice(0, 157)}...` : r.description;
    console.log(`     ${d}`);
  }
  console.log('');
}
if (resultats.length > affiches.length) {
  console.log(`… ${resultats.length - affiches.length} de plus (--n ${resultats.length} pour tout voir).`);
}
