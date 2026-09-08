/**
 * LE BALAYAGE DES SUJETS FRÈRES — la PLOMBERIE de la résolution inter-cours (§3bis, lot 1b).
 *
 * `docs/contenu/ancrage-au-cours.md` définit le registre : les dossiers **frères de la racine
 * compilée** qui portent un `horaire.json`, indexés par leur **nom de dossier**. C'est tout ce
 * qu'un `cours="…"` d'auteur peut nommer.
 *
 * 🔴 POURQUOI CE FICHIER EXISTE, alors que ce dépôt DUPLIQUE délibérément chaque règle entre
 * `compiler-markdown.mjs` et `valider.mjs`. La duplication est le contrat pour ce qui **juge** :
 * deux copies d'un refus, appariées par les specs, garantissent qu'aucune des deux ne laisse
 * passer ce que l'autre refuse. Mais **recenser des dossiers ne juge rien** — et une divergence
 * ici serait du pire genre : le validateur accepterait `cours="php"` que le compilateur ne
 * trouverait pas (ou l'inverse), et *aucun* appariement de messages ne pourrait le voir, puisque
 * les deux copies rendraient chacune la bonne cause pour la population qu'elle a balayée. Une
 * seule source pour « quels frères existent » est donc plus forte que deux, pas plus faible.
 * Précédent du même dossier : `compter-lignes.mjs`, importé par les deux.
 *
 * 🔴 LA VALEUR ÉCRITE PAR L'AUTEUR N'ENTRE JAMAIS ICI. Ce module ne reçoit qu'une racine ; ses
 * chemins se composent exclusivement de noms rendus par `readdirSync`. C'est ce qui fait de la
 * valeur d'auteur une **clef de `Map`** chez l'appelant, jamais un composant de chemin — un
 * `join(parent, valeurDeLAuteur)` offrirait une traversée à un champ d'auteur (famille S-003/S-020
 * de `.claude/rules/security.md` §4).
 *
 * 🔴 DEUX CONTRÔLES DE TYPE D'ENTRÉE, PAS UN (S-021). `Dirent.isDirectory()` décrit l'entrée
 * elle-même, si bien qu'un lien de dossier ou une jonction NTFS portant un nom admis tombe HORS
 * du registre. Et `lstatSync(...).isFile()` sur le `horaire.json` lui-même : sans lui,
 * `readFileSync` suivrait un lien symbolique, et un fichier quelconque du poste pourrait être lu
 * sous le nom d'un horaire (constat de la revue de sécurité du 2026-09-08, PR #52). Un contrôle
 * d'EXISTENCE ne dit jamais rien du TYPE de ce qui existe.
 */
import { readdirSync, lstatSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

/** Le nom du fichier d'horaire d'un sujet — le même des deux côtés, par construction. */
export const FICHIER_HORAIRE_DE_SUJET = 'horaire.json';

/**
 * Comparaison par point de code, indépendante de la locale — la même que celle des deux
 * appelants. Un `sort()` nu trierait selon la locale du poste, ce qui ferait varier d'une machine
 * à l'autre l'ÉNUMÉRATION DES SUJETS CONNUS, qui part dans un message de refus donc dans une
 * assertion (S-010).
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function comparerOctets(a, b) {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

/**
 * Recense les sujets frères d'une racine.
 *
 * @param {string} racine chemin absolu de la racine compilée (`…/content/cours/securite-web`)
 * @returns {Map<string, string>} nom de dossier → chemin absolu de son `horaire.json`, dans
 *   l'ordre des noms. VIDE quand le parent est illisible : le registre vide n'est pas une faute
 *   de contenu, et tout `cours="…"` sera alors refusé en énumérant zéro sujet — fail-closed, en
 *   le disant.
 */
export function recenserLesSujetsFreres(racine) {
  /** @type {Map<string, string>} */
  const registre = new Map();
  const parent = dirname(racine);
  const nomDeLaRacine = basename(racine);
  /** @type {import('node:fs').Dirent[]} */
  let entrees;
  try {
    entrees = readdirSync(parent, { withFileTypes: true });
  } catch {
    return registre;
  }
  const noms = entrees
    .filter((entree) => entree.isDirectory() && entree.name !== nomDeLaRacine)
    .map((entree) => entree.name)
    .sort(comparerOctets);
  for (const nom of noms) {
    const chemin = join(parent, nom, FICHIER_HORAIRE_DE_SUJET);
    try {
      // `lstatSync`, PAS `statSync` : le second SUIT le lien et rendrait `true` pour un lien
      // pointant vers un fichier — c'est exactement ce qu'on refuse. Un chemin absent lève ici,
      // et le `catch` le traite comme « pas de frère », sans distinguer les deux : ni l'absence
      // ni le mauvais type ne sont une faute de CONTENU, ce sont deux façons de ne pas exister.
      if (lstatSync(chemin).isFile()) registre.set(nom, chemin);
    } catch {
      continue;
    }
  }
  return registre;
}
