// =============================================================================
// EXTRACTION DU TEXTE D'UN .pptx, DIAPOSITIVE PAR DIAPOSITIVE
// -----------------------------------------------------------------------------
// Pourquoi cet outil existe : les renvois `diapos="13, 17"` du contrat d'ancrage
// (docs/contenu/ancrage-au-cours.md §3) ne valent que si le NUMÉRO est exact. Or
// aucun outil d'agent ne lit un .pptx, et `WebFetch` a déjà rendu une lecture
// INVENTÉE d'un support plutôt que d'échouer (CLAUDE.md, séance 4). Un renvoi faux
// envoie l'étudiant réviser la mauvaise diapositive, en silence.
//
// La mesure remplace donc la lecture : un .pptx est une archive ZIP dont chaque
// diapositive est un XML ; l'ordre de présentation est celui de `ppt/_rels/
// presentation.xml.rels` lu à travers `ppt/presentation.xml`, JAMAIS l'ordre
// alphabétique des fichiers `slideN.xml` (slide10 précède slide2 — même famille
// que `readdirSync` ne trie pas, L-078).
//
// Sortie : une ligne par diapositive, `[n] <texte>`, format déjà employé par
// `securite-app-web-2026/extraits/`. Rien n'est interprété : on concatène les
// nœuds `<a:t>` dans l'ordre du document.
//
// 🔴 UN .pptx EST UNE ENTRÉE, PAS UNE DONNÉE DU DÉPÔT. Il est téléchargé depuis le
// site de l'enseignant : son XML est écrit par un tiers. Les deux gardes qui en
// découlent sont plus bas — le binaire résolu en absolu, et le chemin de chaque
// diapositive vérifié STRUCTURELLEMENT plutôt que nettoyé par motif.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { basename, isAbsolute, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

// -----------------------------------------------------------------------------
// LE BINAIRE SE RÉSOUT EN ABSOLU — jamais par le PATH.
// `execFileSync('unzip', …)` laisse le système choisir le programme : il suffit
// qu'un dossier inscriptible précède `/usr/bin` dans le PATH de qui lance l'outil
// pour qu'un faux `unzip` s'exécute à sa place, avec les droits du développeur. La
// liste est donc NOMINATIVE et absolue ; si aucun candidat n'existe, on échoue en le
// disant, plutôt que de retomber en silence sur une recherche implicite.
// -----------------------------------------------------------------------------
const CANDIDATS_UNZIP = [
  '/usr/bin/unzip',
  '/bin/unzip',
  'C:/Program Files/Git/usr/bin/unzip.exe',
];

function resoudreUnzip() {
  const trouve = CANDIDATS_UNZIP.find((candidat) => existsSync(candidat));
  if (!trouve) {
    throw new Error(
      `Aucun \`unzip\` parmi : ${CANDIDATS_UNZIP.join(', ')}. Installer unzip ` +
        '(Linux/macOS) ou Git for Windows, ou ajouter le chemin absolu à CANDIDATS_UNZIP.',
    );
  }
  return trouve;
}

/** Le texte d'un XML de diapositive : les nœuds `<a:t>`, dans l'ordre du document. */
function texteDeDiapositive(xml) {
  const morceaux = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => m[1]);
  return morceaux
    .join(' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 🔴 LA CIBLE D'UNE RELATION EST UNE ENTRÉE — on l'ANALYSE, on ne la NETTOIE pas.
 * La version précédente faisait `cible.replace(/^\.\.\//, '')` et rendait le chemin tel
 * quel. Un motif ne retire QU'UN segment — mesuré contre cette version, sur ce poste :
 * `../../../../etc/passwd` en sortait à `…/AppData/Local/etc/passwd`, hors du dossier
 * d'extraction et lu sans un mot ; `slides/../presentation.xml` rendait une partie qui
 * n'est pas une diapositive ; `C:/Windows/win.ini` était recollé sous `ppt/`. Famille
 * S-021(c) de `.claude/rules/security.md` : apparier un motif sur un chemin SÉRIALISÉ
 * n'est pas analyser une structure de chemin.
 *
 * LA NORMALISATION ET LA GARDE SONT DEUX GESTES DISTINCTS — c'est tout le point.
 * On retire d'abord les `..` de TÊTE : pure compatibilité, reprise du comportement de
 * l'ancien `replace`, parce que certains producteurs écrivent `../slides/slideN.xml`
 * là où la cible est relative à `ppt/`. Ce geste ne décide RIEN en sécurité. Les
 * décisions sont les trois qui suivent, et aucune n'énumère ce qui est interdit :
 *  1. une cible ABSOLUE (`/x`, `C:\x`) est refusée d'emblée ;
 *  2. le chemin RÉSOLU doit rester sous le dossier temporaire — vérification
 *     STRUCTURELLE, vraie quel que soit le nombre et la place des `..` ;
 *  3. le nom de fichier est confronté à une liste blanche NOMINATIVE `slideN.xml`,
 *     la seule forme que porte une partie « diapositive » d'un .pptx.
 */
export function cheminDeDiapositive(dossier, cible) {
  if (isAbsolute(cible) || /^[a-zA-Z]:/.test(cible)) {
    throw new Error(`Cible de relation absolue, refusée : ${cible}`);
  }
  const segments = cible.split(/[\\/]+/).filter((s) => s !== '' && s !== '.');
  while (segments[0] === '..') segments.shift();

  const racine = resolve(dossier);
  const chemin = resolve(racine, 'ppt', ...segments);
  if (!chemin.startsWith(racine + sep)) {
    throw new Error(`Cible de relation hors du dossier d'extraction, refusée : ${cible}`);
  }
  if (!/^slide\d+\.xml$/.test(basename(chemin))) {
    throw new Error(`Cible de relation non nominative, refusée : ${cible}`);
  }
  return chemin;
}

/**
 * L'ORDRE DE PRÉSENTATION, dérivé des relations — jamais du nom de fichier.
 * `presentation.xml` liste les `<p:sldId r:id="rIdN">` dans l'ordre où l'auteur a
 * posé ses diapositives ; `presentation.xml.rels` associe chaque rId à sa cible.
 */
function ordreDesDiapositives(dossier) {
  const presentation = readFileSync(join(dossier, 'ppt/presentation.xml'), 'utf8');
  const relations = readFileSync(join(dossier, 'ppt/_rels/presentation.xml.rels'), 'utf8');

  const cibleParId = new Map(
    [...relations.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], m[2]]),
  );

  return [...presentation.matchAll(/<p:sldId[^>]*r:id="([^"]+)"/g)].map((m) => {
    const cible = cibleParId.get(m[1]);
    if (!cible) throw new Error(`Relation ${m[1]} absente de presentation.xml.rels`);
    return cheminDeDiapositive(dossier, cible);
  });
}

export function extraire(cheminPptx) {
  const dossier = mkdtempSync(join(tmpdir(), 'pptx-'));
  try {
    // `unzip` refuse de lui-même les chemins absolus et les `../` des membres d'archive ;
    // la garde qui compte ici reste `cheminDeDiapositive`, qui borne ce qu'on RELIT.
    execFileSync(resoudreUnzip(), ['-o', '-q', cheminPptx, '-d', dossier]);
    return ordreDesDiapositives(dossier).map(
      (fichier, index) => `[${index + 1}] ${texteDeDiapositive(readFileSync(fichier, 'utf8'))}`,
    );
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
}

// Le bloc CLI ne court QUE si ce fichier est le point d'entrée — patron du dépôt
// (`build.mjs`, `compiler-markdown.mjs`, `rendre-mermaid.mjs`). Sans lui, un spec qui
// importe le module pour éprouver ses gardes déclencherait l’usage et un `process.exit(1)` :
// le garde-fou serait alors intestable, donc non gardé.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , entree, sortie] = process.argv;
  if (!entree) {
    console.error('Usage : node extraire-diapositives.mjs <fichier.pptx> [sortie.txt]');
    process.exit(1);
  }
  const lignes = extraire(entree);
  const texte = lignes.join('\n') + '\n';
  if (sortie) {
    writeFileSync(sortie, texte, 'utf8');
    console.log(`${sortie} — ${lignes.length} diapositives`);
  } else {
    process.stdout.write(texte);
  }
}
