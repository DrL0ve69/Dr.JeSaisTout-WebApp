/**
 * Gate des polices auto-hébergées — couverture réelle des glyphes français.
 *
 * POURQUOI CE GATE EXISTE. Un sous-ensemble latin trop agressif ne casse pas le
 * build : il casse la PAGE, en silence. Le « œ » de « cœur », les guillemets
 * « » et l'apostrophe typographique ’ tombent alors sur la police de repli,
 * au milieu d'un mot, sans qu'aucun outil ne le signale. Le backlog nomme ce
 * risque (E1-ST1, ST1-B) ; ce script le transforme en échec de build.
 *
 * CE QU'IL VÉRIFIE, POUR CHAQUE CARACTÈRE EXIGÉ. Les deux moitiés comptent :
 *   (a) le caractère tombe dans au moins un `unicode-range` déclaré par
 *       `_polices.scss` — sinon le navigateur ne télécharge même pas le fichier
 *       pour ce caractère et bascule sur le repli ;
 *   (b) le fichier .woff2 correspondant contient VRAIMENT un glyphe pour lui —
 *       un `unicode-range` généreux sur un fichier amputé donne exactement la
 *       même page cassée, avec en plus l'illusion d'être couvert.
 *
 * COMMENT. Le .woff2 est ouvert pour de bon : en-tête, répertoire de tables,
 * flux Brotli décompressé, puis lecture de la table `cmap` (formats 4 et 12).
 * Aucune dépendance : `node:zlib` sait décompresser Brotli. On ne fait confiance
 * ni au nom du fichier, ni à la déclaration CSS, ni au fournisseur.
 *
 * SORTIE. Déterministe et triée. Code 1 à la moindre lacune, et le message dit
 * lequel des deux volets a lâché — jamais de saut silencieux.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DOSSIER_POLICES = path.join(RACINE, 'public/polices');
const FICHIER_SCSS = path.join(RACINE, 'src/styles/_polices.scss');

/**
 * Les caractères que le site DOIT rendre dans sa propre police.
 * Chaque entrée porte son libellé : un échec doit se lire sans table Unicode
 * sous la main.
 */
const EXIGES = [
  // --- Le piège nommé par le backlog ----------------------------------------
  ['œ', 'œ — ligature minuscule (cœur, œuvre, nœud)'],
  ['Œ', 'Œ — ligature majuscule (ŒUVRE)'],
  ['«', '« — guillemet ouvrant français'],
  ['»', '» — guillemet fermant français'],
  ['’', '’ — apostrophe typographique (U+2019)'],
  [String.fromCodePoint(0x00a0), 'espace insécable (U+00A0) — LA blanche insécable du site'],

  // --- Accents et cédille, minuscules ---------------------------------------
  ['à', 'à'],
  ['â', 'â'],
  ['ä', 'ä'],
  ['ç', 'ç'],
  ['é', 'é'],
  ['è', 'è'],
  ['ê', 'ê'],
  ['ë', 'ë'],
  ['î', 'î'],
  ['ï', 'ï'],
  ['ô', 'ô'],
  ['ö', 'ö'],
  ['ù', 'ù'],
  ['û', 'û'],
  ['ü', 'ü'],
  ['ÿ', 'ÿ'],

  // --- Majuscules accentuées : le français en exige, le web les oublie ------
  ['À', 'À'],
  ['Â', 'Â'],
  ['Ç', 'Ç'],
  ['É', 'É'],
  ['È', 'È'],
  ['Ê', 'Ê'],
  ['Ë', 'Ë'],
  ['Î', 'Î'],
  ['Ô', 'Ô'],
  ['Ù', 'Ù'],
  ['Û', 'Û'],

  // --- Ponctuation d'un texte soigné ----------------------------------------
  ['–', '– tiret demi-cadratin'],
  ['—', '— tiret cadratin'],
  ['…', '… points de suspension'],
  ['“', '“ guillemet anglais ouvrant (citations imbriquées)'],
  ['”', '” guillemet anglais fermant'],

  // --- Signes que le contenu du cours emploie -------------------------------
  ['°', '° degré'],
  ['€', '€ euro'],
];

/**
 * ÉCARTS CONNUS — caractères que NI Fraunces NI Inter ne portent, tels que
 * livrés par le fournisseur, et qui seront donc rendus par la police de repli.
 *
 * Ils ne sont pas retirés de la vérification : ils sont AFFICHÉS à chaque run.
 * Un écart qu'on efface de la liste des contrôles est un écart qu'on oubliera ;
 * un écart imprimé reste une décision qu'on peut relire.
 *
 * Le gate échoue AUSSI si l'un d'eux devient couvert : cela voudrait dire que
 * les fichiers ont changé et que la consigne de rédaction ci-dessous (comme le
 * commentaire de `_polices.scss`) est devenue fausse. La doc ne dérive pas en
 * silence — elle casse le build et se fait corriger.
 */
const REPLI_DOCUMENTE = [
  [
    0x202f,
    'espace fine insécable',
    "Absente des deux familles. La typographie française la veut avant ; : ! ? " +
      'et à l’intérieur des guillemets « », mais le fournisseur ne la livre dans ' +
      'aucun de ses sous-ensembles, et tailler un sous-ensemble maison est ' +
      'interdit (ST1-B). CONSIGNE DE RÉDACTION : le contenu emploie U+00A0, ' +
      'seule blanche insécable réellement couverte par les deux familles. ' +
      '(Inter porte U+2009, Fraunces non — donc U+2009 non plus n’est pas une ' +
      'issue : elle rendrait titres et corps différemment.)',
  ],
  [
    0x2192,
    'flèche vers la droite',
    'Hors du sous-ensemble latin du fournisseur, qui ne retient que U+2191 et ' +
      'U+2193. Sans conséquence : les flèches du cours vivent dans les ' +
      'diagrammes Mermaid, qui portent leur propre rendu. Une flèche isolée en ' +
      'pleine prose tomberait sur le repli — c’est un symbole, pas une lettre.',
  ],
];

// =============================================================================
// Lecture du .woff2 — en-tête, répertoire de tables, flux Brotli
// =============================================================================

/** Étiquettes de tables connues, indexées 0..62 par la spécification WOFF2. */
const TAGS_CONNUS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm',
  'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern',
  'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC',
  'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar',
  'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty',
  'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat',
  'Gloc', 'Feat', 'Sill',
];

/** Entier à longueur variable, 7 bits utiles par octet (UIntBase128). */
function lireBase128(buf, pos) {
  let valeur = 0;
  for (let i = 0; i < 5; i += 1) {
    const octet = buf[pos + i];
    valeur = valeur * 128 + (octet & 0x7f);
    if ((octet & 0x80) === 0) return [valeur, pos + i + 1];
  }
  throw new Error('UIntBase128 non terminé après 5 octets — fichier corrompu.');
}

/**
 * Extrait la table `cmap` d'un .woff2.
 * `cmap` n'est jamais transformée par WOFF2 : sa longueur d'origine fait foi.
 */
function extraireCmap(fichier) {
  const buf = readFileSync(fichier);
  if (buf.toString('ascii', 0, 4) !== 'wOF2') {
    throw new Error(`${path.basename(fichier)} : signature wOF2 absente.`);
  }
  const nbTables = buf.readUInt16BE(12);

  let pos = 48;
  const entrees = [];
  for (let i = 0; i < nbTables; i += 1) {
    const drapeaux = buf[pos];
    pos += 1;
    const indexTag = drapeaux & 0x3f;
    const versionTransfo = (drapeaux >> 6) & 0x03;

    let tag;
    if (indexTag === 63) {
      tag = buf.toString('ascii', pos, pos + 4);
      pos += 4;
    } else {
      tag = TAGS_CONNUS[indexTag];
    }

    let longueurOrigine;
    [longueurOrigine, pos] = lireBase128(buf, pos);

    // `glyf`/`loca` sont transformées quand la version vaut 0 ; les autres
    // tables le sont quand elle vaut 1. Une longueur transformée suit alors.
    const transformee =
      tag === 'glyf' || tag === 'loca' ? versionTransfo === 0 : versionTransfo === 1;

    let longueurDansFlux = longueurOrigine;
    if (transformee) {
      [longueurDansFlux, pos] = lireBase128(buf, pos);
    }
    entrees.push({ tag, longueurDansFlux });
  }

  const flux = brotliDecompressSync(buf.subarray(pos));

  let decalage = 0;
  for (const e of entrees) {
    if (e.tag === 'cmap') return flux.subarray(decalage, decalage + e.longueurDansFlux);
    decalage += e.longueurDansFlux;
  }
  throw new Error(`${path.basename(fichier)} : aucune table cmap.`);
}

// =============================================================================
// Lecture de la table cmap — formats 4 et 12
// =============================================================================

function lireFormat4(t, base) {
  const segX2 = t.readUInt16BE(base + 6);
  const seg = segX2 / 2;
  const fins = base + 14;
  const debuts = fins + segX2 + 2;
  const deltas = debuts + segX2;
  const decalages = deltas + segX2;

  return (pc) => {
    if (pc > 0xffff) return 0;
    for (let i = 0; i < seg; i += 1) {
      const fin = t.readUInt16BE(fins + i * 2);
      if (pc > fin) continue;
      const debut = t.readUInt16BE(debuts + i * 2);
      if (pc < debut) return 0;
      const delta = t.readInt16BE(deltas + i * 2);
      const dec = t.readUInt16BE(decalages + i * 2);
      if (dec === 0) return (pc + delta) & 0xffff;
      const posGlyphe = decalages + i * 2 + dec + (pc - debut) * 2;
      if (posGlyphe + 1 >= t.length) return 0;
      const g = t.readUInt16BE(posGlyphe);
      return g === 0 ? 0 : (g + delta) & 0xffff;
    }
    return 0;
  };
}

function lireFormat12(t, base) {
  const nbGroupes = t.readUInt32BE(base + 12);
  return (pc) => {
    for (let i = 0; i < nbGroupes; i += 1) {
      const g = base + 16 + i * 12;
      const debut = t.readUInt32BE(g);
      const fin = t.readUInt32BE(g + 4);
      if (pc < debut) return 0;
      if (pc > fin) continue;
      return t.readUInt32BE(g + 8) + (pc - debut);
    }
    return 0;
  };
}

/** Construit la fonction « point de code → identifiant de glyphe » d'un fichier. */
function chercheurDeGlyphe(fichier) {
  const t = extraireCmap(fichier);
  const nbSous = t.readUInt16BE(2);
  const chercheurs = [];

  for (let i = 0; i < nbSous; i += 1) {
    const e = 4 + i * 8;
    const plateforme = t.readUInt16BE(e);
    const encodage = t.readUInt16BE(e + 2);
    const base = t.readUInt32BE(e + 4);
    const format = t.readUInt16BE(base);

    // On ne retient que l'Unicode : (3,1) BMP, (3,10) complet, (0,x) Unicode.
    const unicode = (plateforme === 3 && (encodage === 1 || encodage === 10)) || plateforme === 0;
    if (!unicode) continue;

    if (format === 4) chercheurs.push(lireFormat4(t, base));
    else if (format === 12) chercheurs.push(lireFormat12(t, base));
  }

  if (chercheurs.length === 0) {
    throw new Error(`${path.basename(fichier)} : aucune sous-table cmap Unicode exploitable.`);
  }
  return (pc) => chercheurs.some((f) => f(pc) !== 0);
}

// =============================================================================
// Lecture des `unicode-range` déclarés dans _polices.scss
// =============================================================================

/**
 * Associe à chaque famille la liste de ses blocs `@font-face` : fichier visé et
 * intervalles de points de code déclarés. On lit la DÉCLARATION, pas ce qu'on
 * croit avoir écrit — c'est elle que le navigateur appliquera.
 */
function lireDeclarations(scss) {
  const blocs = [];
  for (const m of scss.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)) {
    const corps = m[1];
    const famille = /font-family:\s*'([^']+)'/.exec(corps)?.[1];
    const fichier = /url\(['"]?([^'")]+)['"]?\)/.exec(corps)?.[1];
    const brut = /unicode-range:\s*([^;]+);/.exec(corps)?.[1];
    if (!famille || !fichier || !brut) continue;

    const plages = [];
    for (const p of brut.split(',')) {
      const t = p.trim();
      const inter = /^U\+([0-9A-Fa-f]+)-([0-9A-Fa-f]+)$/.exec(t);
      const seul = /^U\+([0-9A-Fa-f]+)$/.exec(t);
      if (inter) plages.push([parseInt(inter[1], 16), parseInt(inter[2], 16)]);
      else if (seul) plages.push([parseInt(seul[1], 16), parseInt(seul[1], 16)]);
      else if (/^U\+[0-9A-Fa-f]*\?+$/.test(t)) {
        const base = t.slice(2);
        plages.push([
          parseInt(base.replaceAll('?', '0'), 16),
          parseInt(base.replaceAll('?', 'F'), 16),
        ]);
      } else {
        throw new Error(`unicode-range illisible : « ${t} » (famille ${famille}).`);
      }
    }
    blocs.push({ famille, fichier: path.basename(fichier), plages });
  }
  return blocs;
}

// =============================================================================
// Exécution
// =============================================================================

/**
 * Comparateur de tri.  sans argument compare les unités UTF-16 :
 * « é » y passerait APRÈS « z », et l'ordre des constats dépendrait de
 * l'accentuation. Or ce script promet une sortie déterministe et triée — sur
 * des libellés français. La locale est explicite pour que deux machines
 * rendent le même ordre.
 */
const parOrdreFrancais = (a, b) => a.localeCompare(b, 'fr');

const scss = readFileSync(FICHIER_SCSS, 'utf8');
const blocs = lireDeclarations(scss);
if (blocs.length === 0) {
  console.error('✖ aucun bloc @font-face exploitable dans src/styles/_polices.scss.');
  process.exit(1);
}

const familles = [...new Set(blocs.map((b) => b.famille))].sort(parOrdreFrancais);
const problemes = [];

// Tout fichier livré doit être déclaré, et réciproquement : un woff2 orphelin
// est un octet servi pour rien, une déclaration orpheline est un 404.
const surDisque = new Set(readdirSync(DOSSIER_POLICES).filter((f) => f.endsWith('.woff2')));
const declares = new Set(blocs.map((b) => b.fichier));
for (const f of [...surDisque].sort(parOrdreFrancais)) {
  if (!declares.has(f)) problemes.push(`${f} : présent dans public/polices/ mais déclaré nulle part.`);
}
for (const f of [...declares].sort(parOrdreFrancais)) {
  if (!surDisque.has(f)) problemes.push(`${f} : déclaré dans _polices.scss mais absent du disque.`);
}

const chercheurs = new Map();
for (const f of [...declares].sort(parOrdreFrancais)) {
  if (!surDisque.has(f)) continue;
  chercheurs.set(f, chercheurDeGlyphe(path.join(DOSSIER_POLICES, f)));
}

console.log('\n  Gate des polices — couverture des glyphes français');
console.log(
  `  ${familles.length} famille(s) · ${declares.size} fichier(s) · ` +
    `${EXIGES.length} caractères exigés · ${familles.length * EXIGES.length} vérifications`,
);

for (const famille of familles) {
  const blocsFamille = blocs.filter((b) => b.famille === famille);
  let couverts = 0;

  for (const [caractere, libelle] of EXIGES) {
    const pc = caractere.codePointAt(0);
    const hex = `U+${pc.toString(16).toUpperCase().padStart(4, '0')}`;

    // (a) le caractère tombe-t-il dans un `unicode-range` déclaré ?
    const candidats = blocsFamille.filter((b) => b.plages.some(([d, f]) => pc >= d && pc <= f));
    if (candidats.length === 0) {
      problemes.push(`${famille} · ${hex} ${libelle} : hors de tout unicode-range déclaré.`);
      continue;
    }

    // (b) le fichier visé porte-t-il vraiment le glyphe ?
    const porteurs = candidats.filter((b) => chercheurs.get(b.fichier)?.(pc));
    if (porteurs.length === 0) {
      problemes.push(
        `${famille} · ${hex} ${libelle} : couvert par ${candidats
          .map((b) => b.fichier)
          .join(', ')} mais AUCUN ne contient le glyphe.`,
      );
      continue;
    }
    couverts += 1;
  }

  const etat = couverts === EXIGES.length ? '·' : '✖';
  console.log(`  ${etat} ${famille.padEnd(10)} ${couverts}/${EXIGES.length} caractères couverts`);
}

// --- Écarts connus : affichés, jamais sautés ---------------------------------
console.log('\n  Écarts assumés — rendus par la police de repli :');
for (const [pc, nom, motif] of REPLI_DOCUMENTE) {
  const hex = `U+${pc.toString(16).toUpperCase().padStart(4, '0')}`;
  const porteurs = familles.filter((famille) =>
    blocs
      .filter((b) => b.famille === famille)
      .some((b) => b.plages.some(([d, f]) => pc >= d && pc <= f) && chercheurs.get(b.fichier)?.(pc)),
  );
  if (porteurs.length > 0) {
    problemes.push(
      `${hex} ${nom} : déclaré comme écart assumé, mais ${porteurs.join(' et ')} le porte(nt) ` +
        'désormais. Promouvoir ce caractère dans EXIGES, puis corriger _polices.scss et ' +
        `docs/design/polices.md — la justification suivante est devenue fausse : « ${motif} »`,
    );
  }
  console.log(`  ~ ${hex} ${nom} — repli sur la police système`);
}

const total = [...surDisque].reduce(
  (a, f) => a + readFileSync(path.join(DOSSIER_POLICES, f)).length,
  0,
);
console.log(`  Poids livré : ${(total / 1024).toFixed(1)} Kio sur ${surDisque.size} fichier(s)`);

if (problemes.length > 0) {
  console.error(`\n✖ ${problemes.length} problème(s) :`);
  for (const p of problemes.sort(parOrdreFrancais)) console.error(`  · ${p}`);
  console.error('');
  process.exit(1);
}

console.log('✔ chaque caractère exigé est déclaré ET présent dans le fichier servi.\n');
