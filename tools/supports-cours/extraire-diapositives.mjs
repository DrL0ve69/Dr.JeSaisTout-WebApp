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
// =============================================================================

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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
    return join(dossier, 'ppt', cible.replace(/^\.\.\//, ''));
  });
}

export function extraire(cheminPptx) {
  const dossier = mkdtempSync(join(tmpdir(), 'pptx-'));
  try {
    execFileSync('unzip', ['-o', '-q', cheminPptx, '-d', dossier]);
    return ordreDesDiapositives(dossier).map(
      (fichier, index) => `[${index + 1}] ${texteDeDiapositive(readFileSync(fichier, 'utf8'))}`,
    );
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
}

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
