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
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, lstatSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** La racine du dépôt, dérivée de l'emplacement de ce fichier (`tools/supports-cours/`). */
const RACINE_DEPOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * 🔴 LES DEUX CHEMINS DE LA LIGNE DE COMMANDE SONT AUSSI DES ENTRÉES.
 * Le support à lire et le fichier à écrire arrivent par `process.argv` : rien ne
 * garantit qu'ils désignent un support de cours. Cet outil n'a qu'un seul terrain
 * légitime — les supports versionnés du dépôt et les extraits qu'il en tire — donc
 * on le dit, et on refuse tout le reste. Même patron que `cheminDeDiapositive` :
 * on RÉSOUT, puis on vérifie STRUCTURELLEMENT où l'on a abouti.
 *
 * 🔴 LE PRÉFIXE DE LECTEUR SE REFUSE SUR TOUTE PLATEFORME, ET C'EST LE PIÈGE PAYÉ ICI.
 * `isAbsolute` dépend de l'OS : sous Linux, `C:/Windows/win.ini` n'est PAS absolu, c'est
 * un chemin relatif vers un dossier nommé `C:`. Le confinement l'admettait donc — il
 * aboutit bien sous le dépôt — là où Windows le refusait. Une garde dont le verdict
 * change avec l'hôte est DEUX gardes : verte sur ce poste, rouge sur le runner (mesuré,
 * CI 33527351852). On refuse donc la forme `X:` partout, quel que soit le séparateur.
 */
export function cheminSousLeDepot(valeur, role) {
  if (/^[a-zA-Z]:/.test(valeur)) {
    throw new Error(`${role} hors du dépôt, refusé (chemin de lecteur) : ${valeur}`);
  }
  const chemin = resolve(process.cwd(), valeur);
  if (chemin !== RACINE_DEPOT && !chemin.startsWith(RACINE_DEPOT + sep)) {
    throw new Error(`${role} hors du dépôt, refusé : ${valeur}`);
  }
  return chemin;
}

// -----------------------------------------------------------------------------
// LE BINAIRE SE RÉSOUT EN ABSOLU — jamais par le PATH.
// `execFileSync('unzip', …)` laisse le système choisir le programme : il suffit
// qu'un dossier inscriptible précède `/usr/bin` dans le PATH de qui lance l'outil
// pour qu'un faux `unzip` s'exécute à sa place, avec les droits du développeur. La
// liste est donc NOMINATIVE et absolue ; si aucun candidat n'existe, on échoue en le
// disant, plutôt que de retomber en silence sur une recherche implicite.
// -----------------------------------------------------------------------------
// 🔴 UN CHEMIN POSIX ÉCRIT EN DUR EST UNE GARDE DÉPENDANTE DE L'OS — donc DEUX gardes,
// exactement comme l'`isAbsolute` corrigé plus haut. MESURÉ sur ce poste :
// `resolve('/usr/bin/unzip')` rend `C:\usr\bin\unzip`, et c'est CETTE cible que
// `existsSync` interroge — pas `/usr/bin`, qui n'existe pas sous Windows. Or la racine
// `C:\` accorde par défaut le droit de créer un dossier aux « Utilisateurs authentifiés » :
// un processus local non privilégié plante `C:\usr\bin\unzip`, le `find` le prend EN
// PREMIER — il précédait le chemin Git dans la liste — et il s'exécute avec les droits de
// l'opérateur. La liste était donc absolue sous POSIX et RELATIVE AU LECTEUR COURANT sous
// Windows, c'est-à-dire le défaut même que `resoudreUnzip` existe pour fermer.
//
// Les deux listes sont exportées pour que le spec juge CHACUNE contre la règle de SA
// plateforme, où qu'il tourne : la CI (Linux) vérifie ainsi l'ancrage de la liste Windows,
// que ce poste-ci serait seul à exercer.
export const CANDIDATS_UNZIP_POSIX = ['/usr/bin/unzip', '/bin/unzip', '/usr/local/bin/unzip'];
export const CANDIDATS_UNZIP_WIN32 = [
  'C:/Program Files/Git/usr/bin/unzip.exe',
  'C:/Program Files (x86)/Git/usr/bin/unzip.exe',
];
const CANDIDATS_UNZIP =
  process.platform === 'win32' ? CANDIDATS_UNZIP_WIN32 : CANDIDATS_UNZIP_POSIX;

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
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll(/\s+/g, ' ')
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
 * 🔴 LE TYPE D'UNE ENTRÉE SE CONTRÔLE — un chemin admis ne dit RIEN de ce qu'il désigne.
 * C'est la moitié que les trois gardes de `cheminDeDiapositive` ne couvrent pas, et elle
 * est nommée telle quelle dans `.claude/rules/security.md` §4 (b) : « un lien symbolique
 * portant un nom admis passe un contrôle de chemin seul ». Le scénario est complet et
 * n'exige aucune complicité de l'opérateur : un .pptx hostile stocke `ppt/slides/slide1.xml`
 * comme LIEN vers `~/.ssh/id_rsa` ou `.git/config`, `unzip` restaure le lien, les trois
 * gardes passent — le chemin résolu reste sous le dossier temporaire, le basename est bien
 * `slide1.xml` — et la lecture SUIT le lien. Le secret part dans l'extrait, que l'opérateur
 * lit et recopie.
 *
 * ⚠️ CE QUI NE VAUT PAS PROTECTION : l'`unzip.exe` de Git for Windows ne matérialise pas
 * les liens, là où Info-ZIP sous POSIX le fait par défaut. Se reposer là-dessus serait
 * une garde dont le verdict dépend de l'hôte — le défaut même corrigé plus haut, deux fois.
 * On contrôle donc le type, sur toute plateforme, et le refus se NOMME.
 *
 * `lstatSync` et non `statSync` : `stat` suit le lien et rapporterait « fichier régulier »
 * pour sa cible, ce qui verdirait exactement l'attaque qu'on refuse.
 *
 * @param {string} chemin chemin déjà borné par `cheminDeDiapositive` ou construit ici
 * @returns {string} le contenu, en UTF-8
 */
export function lireMembreRegulier(chemin) {
  const etat = lstatSync(chemin);
  if (!etat.isFile()) {
    throw new Error(`Membre d'archive non régulier (lien ou dossier), refusé : ${chemin}`);
  }
  return readFileSync(chemin, 'utf8');
}

/**
 * L'ORDRE DE PRÉSENTATION, dérivé des relations — jamais du nom de fichier.
 * `presentation.xml` liste les `<p:sldId r:id="rIdN">` dans l'ordre où l'auteur a
 * posé ses diapositives ; `presentation.xml.rels` associe chaque rId à sa cible.
 */
function ordreDesDiapositives(dossier) {
  const presentation = lireMembreRegulier(join(dossier, 'ppt/presentation.xml'));
  const relations = lireMembreRegulier(join(dossier, 'ppt/_rels/presentation.xml.rels'));

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
    // `unzip` refuse de lui-même les chemins absolus et les `../` des membres d'archive —
    // vrai, et HORS SUJET : il ne dit rien des LIENS, qu'Info-ZIP restaure par défaut. Les
    // deux gardes qui comptent sont donc `cheminDeDiapositive` (où l'on va) et
    // `lireMembreRegulier` (ce qu'on trouve en arrivant). Aucune des deux ne délègue à unzip.
    execFileSync(resoudreUnzip(), ['-o', '-q', cheminPptx, '-d', dossier]);
    return ordreDesDiapositives(dossier).map(
      (fichier, index) => `[${index + 1}] ${texteDeDiapositive(lireMembreRegulier(fichier))}`,
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
  const support = cheminSousLeDepot(entree, 'Support');
  if (!/\.pptx$/i.test(support)) {
    throw new Error(`Le support doit être un fichier .pptx : ${entree}`);
  }
  const lignes = extraire(support);
  const texte = lignes.join('\n') + '\n';
  if (sortie) {
    writeFileSync(cheminSousLeDepot(sortie, 'Fichier de sortie'), texte, 'utf8');
    console.log(`${sortie} — ${lignes.length} diapositives`);
  } else {
    process.stdout.write(texte);
  }
}
