#!/usr/bin/env node
/**
 * Gate du design system — Dr. Je-Sais-Tout.
 * Contrastes WCAG des paires de jetons **et** cohérence des échelles typo/espacement.
 *
 * POURQUOI CE SCRIPT EXISTE.
 * AXE ne teste que ce qui est **rendu** : un jeton défini mais pas encore
 * consommé par un composant lui est invisible, et une paire jamais assemblée à
 * l'écran n'est jamais mesurée. Un design system se valide donc en amont, sur
 * ses jetons, pas seulement en aval sur ses pages. Ce gate est la moitié amont ;
 * G-axe (E1-ST2) sera la moitié aval. Aucune des deux ne remplace l'autre.
 *
 * LE CONTRASTE EST UNE PROPRIÉTÉ DE **PAIRES**, PAS DE JETONS.
 * `--couleur-encre-tertiaire` n'a pas « un contraste » : il en a un par fond sur
 * lequel on l'autorise. Le cœur de ce fichier est donc la table `PAIRES`
 * ci-dessous : elle est à la fois le jeu de tests ET la documentation des
 * combinaisons autorisées. Une paire absente de la table est une paire
 * interdite ; un jeton absent de toute paire doit être exempté explicitement.
 *
 * CE QUE LE GATE REFUSE (chacun sort en code 1) :
 *   1. une paire sous son seuil ;
 *   2. une valeur de jeton non résoluble (`oklch()`, `color-mix()`, fonction
 *      Sass, jeton inconnu…) — jamais de saut silencieux, un saut produit un
 *      vert mensonger ;
 *   3. un jeton de TEXTE porteur d'un canal alpha (`#rrggbbaa`) — la hiérarchie
 *      par opacité fait chuter le contraste de façon mécanique et invisible ;
 *   4. un jeton `--couleur-*` défini dans un seul des deux thèmes ;
 *   5. un jeton `--couleur-*` couvert par aucune paire et non exempté ;
 *   6. une exemption OBSOLÈTE (jeton disparu) ou REDONDANTE (jeton en réalité
 *      couvert par la table des paires) — une exemption mensongère est publiée
 *      telle quelle dans le rapport, elle ment donc aussi aux lecteurs ;
 *   7. un jeton de thème NON préfixé `--couleur-` dont la valeur est une couleur.
 *      Sans ce contrôle, `--ombre-carte` ou `--surlignage-x` échapperait à la
 *      fois à la couverture (5) et à l'exemption (6) : une porte dérobée ouverte
 *      par le simple choix d'un nom ;
 *   8. une ÉCHELLE incohérente — ratio typographique < 1.25 entre deux paliers
 *      consécutifs, ou espacement qui n'est pas un multiple de 4 px. C'est
 *      exactement l'erreur qui a survécu à la première revue (`$taille-xs` à
 *      0.8333rem, ratio 1.20) : rien ne mesurait les échelles.
 *
 * MÉTHODE DE CALCUL : luminance relative WCAG 2 (spec figée depuis 2008).
 * Pas d'APCA : la barre du projet est WCAG 2.2 AA, et APCA n'est normatif
 * nulle part à ce jour.
 *
 * ZÉRO DÉPENDANCE (règle `.claude/rules/budget-free-tier.md`) : Node pur.
 *
 * Usage : node tools/design/verifier-contrastes.mjs           (écrit le rapport)
 *         node tools/design/verifier-contrastes.mjs --check   (n'écrit RIEN)
 *         npm run design:contrastes / npm run design:contrastes:check
 *
 * `--check` régénère le rapport EN MÉMOIRE et le compare à celui du dépôt : il
 * sort en 1 si le fichier commité est périmé. C'est ce mode que la CI appelle —
 * sans lui, un rapport obsolète ne fait échouer personne, et le mode écriture
 * produirait un dépôt sale à chaque exécution.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const MODE_CHECK = process.argv.includes('--check');

const RACINE = process.cwd();
const PRIMITIVES = join(RACINE, 'src', 'styles', '_primitives.scss');
const THEMES = join(RACINE, 'src', 'styles', '_themes.scss');
const RAPPORT = join(RACINE, 'docs', 'design', 'contrastes-jetons.md');

// =============================================================================
// 1 · Les seuils — trois, pas un
// =============================================================================
// Un gate mono-seuil à 4.5 laisserait passer un anneau de focus invisible :
// personne ne pense à mesurer une bordure, et AXE détecte mal le non-texte.
const SEUILS = {
  'texte-normal': { min: 4.5, critere: 'WCAG 1.4.3 AA — texte normal' },
  'grand-texte': { min: 3, critere: 'WCAG 1.4.3 AA — grand texte (≥ 24 px, ou ≥ 18.66 px gras)' },
  'non-texte': { min: 3, critere: 'WCAG 1.4.11 AA — composant d’interface ou objet graphique' },
};

// Cible haute, informative seulement : le corps de texte vise AAA (7:1).
const CIBLE_AAA = 7;

// =============================================================================
// 2 · LA TABLE DES PAIRES — le vrai livrable
// =============================================================================
// [jeton de premier plan, jeton de fond, usage, seuil]
// `aaa: true` marque les paires de corps de texte pour lesquelles on VISE AAA
// (l'écart à AAA est signalé, il ne fait pas échouer le gate).
//
// Le type est déclaré : sans lui, une analyse statique infère de ce tableau
// hétérogène le type « chaîne OU objet » pour CHAQUE position, et croit donc
// voir un objet interpolé (« [object Object] ») partout où un message d'erreur
// cite `texte`, `fond` ou `usage`. Le tuple dit ce qu'il en est réellement.
/** @type {[string, string, string, keyof typeof SEUILS, ({ aaa?: boolean })?][]} */
const PAIRES = [
  // --- Texte principal sur les trois surfaces -------------------------------
  [
    '--couleur-encre',
    '--couleur-surface',
    'Corps de texte sur la page',
    'texte-normal',
    { aaa: true },
  ],
  [
    '--couleur-encre',
    '--couleur-surface-creuse',
    'Corps de texte dans un encart',
    'texte-normal',
    { aaa: true },
  ],
  [
    '--couleur-encre',
    '--couleur-surface-elevee',
    'Corps de texte sur un feuillet',
    'texte-normal',
    { aaa: true },
  ],

  // --- Hiérarchie d'emphase : des couleurs pleines, pas des opacités --------
  [
    '--couleur-encre-secondaire',
    '--couleur-surface',
    'Texte secondaire (chapô, intertitre)',
    'texte-normal',
  ],
  [
    '--couleur-encre-secondaire',
    '--couleur-surface-creuse',
    'Texte secondaire dans un encart',
    'texte-normal',
  ],
  [
    '--couleur-encre-tertiaire',
    '--couleur-surface',
    'Légende, méta, note de bas de page',
    'texte-normal',
  ],
  [
    '--couleur-encre-tertiaire',
    '--couleur-surface-creuse',
    'Légende dans un encart',
    'texte-normal',
  ],

  // --- Filigrane : le SEUL usage à 3:1 justifié par la taille ---------------
  // Numéro de module en grands chiffres (≥ 31.25 px, palier --taille-xl).
  // Naïvement on l'obtiendrait par `opacity` ; ici c'est un jeton plein mesuré.
  [
    '--couleur-encre-filigrane',
    '--couleur-surface',
    'Numéro de module en filigrane (≥ 31.25 px)',
    'grand-texte',
  ],
  [
    '--couleur-encre-filigrane',
    '--couleur-surface-creuse',
    'Numéro de module en filigrane sur encart',
    'grand-texte',
  ],

  // --- Action ---------------------------------------------------------------
  ['--couleur-accent', '--couleur-surface', 'Lien dans le corps de texte', 'texte-normal'],
  ['--couleur-accent', '--couleur-surface-creuse', 'Lien dans un encart', 'texte-normal'],
  ['--couleur-accent-survol', '--couleur-surface', 'Lien survolé', 'texte-normal'],
  ['--couleur-sur-accent', '--couleur-accent', 'Libellé d’un bouton plein', 'texte-normal'],

  // --- Signature pédagogique : vulnérable / corrigé -------------------------
  [
    '--couleur-danger-vuln',
    '--couleur-surface',
    'Étiquette « vulnérable » sur la page',
    'texte-normal',
  ],
  [
    '--couleur-danger-vuln',
    '--couleur-danger-vuln-surface',
    'Texte d’un bloc de code vulnérable',
    'texte-normal',
  ],
  [
    '--couleur-encre',
    '--couleur-danger-vuln-surface',
    'Commentaire dans un bloc vulnérable',
    'texte-normal',
  ],
  [
    '--couleur-ok-corrige',
    '--couleur-surface',
    'Étiquette « corrigé » sur la page',
    'texte-normal',
  ],
  [
    '--couleur-ok-corrige',
    '--couleur-ok-corrige-surface',
    'Texte d’un bloc de code corrigé',
    'texte-normal',
  ],
  [
    '--couleur-encre',
    '--couleur-ok-corrige-surface',
    'Commentaire dans un bloc corrigé',
    'texte-normal',
  ],
  [
    '--couleur-attention',
    '--couleur-surface',
    'Étiquette « cours vs état de l’art »',
    'texte-normal',
  ],
  [
    '--couleur-attention',
    '--couleur-attention-surface',
    'Texte d’un encadré d’avertissement',
    'texte-normal',
  ],
  [
    '--couleur-encre',
    '--couleur-attention-surface',
    'Corps d’un encadré d’avertissement',
    'texte-normal',
  ],

  // --- Provenance pédagogique : 📘 cours / 🧩 complément --------------------
  // La 3ᵉ variante (⚠️ « correction-du-cours ») n'apparaît pas ici : elle
  // réemploie `--couleur-attention{,-surface}`, déjà mesuré juste au-dessus.
  // ⚠️ Ces paires mesurent l'encadré SUR SA PROPRE SURFACE. Poser la teinte de
  // provenance en bordure d'un encadré posé sur `--couleur-surface` serait un
  // usage de plus, donc une paire de plus (seuil `non-texte`) : à déclarer par
  // le lot de rendu, pas à supposer couvert.
  [
    '--couleur-provenance-cours',
    '--couleur-provenance-cours-surface',
    'Titre / étiquette d’un encadré « au programme du cours »',
    'texte-normal',
  ],
  [
    '--couleur-encre',
    '--couleur-provenance-cours-surface',
    'Corps d’un encadré « au programme du cours »',
    'texte-normal',
  ],
  [
    '--couleur-provenance-complement',
    '--couleur-provenance-complement-surface',
    'Titre / étiquette d’un encadré « complément hors cours »',
    'texte-normal',
  ],
  [
    '--couleur-encre',
    '--couleur-provenance-complement-surface',
    'Corps d’un encadré « complément hors cours »',
    'texte-normal',
  ],
  // Les DEUX paires annoncées par la note ci-dessus, déclarées par le lot de rendu
  // (E3-ST1) parce qu'il a bel et bien posé la teinte en BORDURE : `cours` reçoit un
  // cadre complet, `complement` un filet de gauche en tirets. Une bordure est au
  // contact de `--couleur-surface`, pas de la surface de l'encadré — c'est un objet
  // graphique porteur d'information (le second canal de WCAG 1.4.1), donc 1.4.11.
  // 🔴 ET UNE TROISIÈME, QUI N'ÉTAIT PAS PRÉVUE ET QUI EST UNE DETTE ANTÉRIEURE.
  // `correction-du-cours` réemploie `--couleur-attention` — la note du lot des jetons
  // en concluait « rien à déclarer ». Faux : la paire déjà mesurée est
  // `--couleur-attention` sur `--couleur-attention-surface`, c'est-à-dire l'ENCRE de
  // l'étiquette sur le fond de l'encadré. Le TRAIT, lui, borde la page — et l'encadré
  // `attention` d'E2-ST1 le posait déjà, sans que personne ne le mesure. On le mesure
  // ici, une fois, pour les deux variantes qui l'emploient.
  [
    '--couleur-attention',
    '--couleur-surface',
    'Filet / cadre d’un encadré d’avertissement ou de correction, sur la page',
    'non-texte',
  ],
  [
    '--couleur-provenance-cours',
    '--couleur-surface',
    'Cadre d’un encadré « au programme du cours » sur la page',
    'non-texte',
  ],
  [
    '--couleur-provenance-complement',
    '--couleur-surface',
    'Filet d’un encadré « complément hors cours » sur la page',
    'non-texte',
  ],

  // --- Code et sélection ----------------------------------------------------
  [
    '--couleur-code-encre',
    '--couleur-code-surface',
    'Code source (bloc et incise)',
    'texte-normal',
  ],
  [
    '--couleur-selection-encre',
    '--couleur-selection-fond',
    'Texte sélectionné à la souris',
    'texte-normal',
  ],

  // --- Non-texte (1.4.11) : bordures, filets, anneau de focus ---------------
  [
    '--couleur-filet',
    '--couleur-surface',
    'Bordure d’encart / séparateur sur la page',
    'non-texte',
  ],
  ['--couleur-filet', '--couleur-surface-creuse', 'Bordure interne d’un encart', 'non-texte'],
  [
    '--couleur-filet-fort',
    '--couleur-surface',
    'Bordure appuyée (champ de saisie, tableau)',
    'non-texte',
  ],
  [
    '--couleur-filet-fort',
    '--couleur-surface-creuse',
    'Bordure appuyée dans un encart',
    'non-texte',
  ],
  [
    '--couleur-focus',
    '--couleur-surface',
    'Anneau de focus sur la page (2.4.7 / 1.4.11)',
    'non-texte',
  ],
  ['--couleur-focus', '--couleur-surface-creuse', 'Anneau de focus dans un encart', 'non-texte'],
  ['--couleur-focus', '--couleur-surface-elevee', 'Anneau de focus sur un feuillet', 'non-texte'],
  // Ces deux-là servent À LA FOIS de tampon textuel et de bordure de
  // `marque-pedagogique` dans un encart : on les déclare au seuil le plus strict
  // des deux usages (4.5 ⊃ 3). Rappel : le trait de la marque porte AUSSI un
  // style (`dashed`/`solid`) — le ratio ne suffit pas à satisfaire 1.4.1.
  [
    '--couleur-danger-vuln',
    '--couleur-surface-creuse',
    'Tampon « vulnérable » et trait de marque dans un encart',
    'texte-normal',
  ],
  [
    '--couleur-ok-corrige',
    '--couleur-surface-creuse',
    'Tampon « corrigé » et trait de marque dans un encart',
    'texte-normal',
  ],
];

// NOTE — pourquoi la paire `--couleur-surface-creuse` / `--couleur-surface`
// n'est PAS dans la table. Deux fonds voisins ne sont ni un composant
// d'interface ni un objet graphique nécessaire à la compréhension : 1.4.11 ne
// s'y applique pas, et l'exiger imposerait un encart criard. La contrepartie
// est une contrainte de conception, pas un test : **un encart doit toujours
// être borné par `--couleur-filet`** (mesuré à 3:1), jamais par sa seule teinte
// de fond. Cette règle vaut aussi bien pour le mode contraste forcé, où les
// deux fonds deviennent de toute façon identiques.

// =============================================================================
// 3 · Exemptions — un jeton non testé doit être justifié PAR ÉCRIT
// =============================================================================
// Sans cette liste, un jeton oublié de la table `PAIRES` passerait inaperçu :
// le gate serait vert parce qu'il n'a rien regardé. Toute exemption est un
// argument WCAG, pas une commodité.
const EXEMPTIONS = {
  '--couleur-reglure':
    'Décor pur (règlure de carnet). Ne porte aucune information et n’est pas un ' +
    'composant d’interface : hors champ de 1.4.11, qui exempte explicitement le décoratif. ' +
    'Elle est d’ailleurs masquée en `forced-colors: active` (mixin `reglure`).',
  // `--couleur-surface-elevee` a été RETIRÉ de cette liste : il figure comme fond
  // dans quatre paires, la branche d'exemption ne s'exécutait donc jamais — et le
  // rapport publiait « exempté de mesure » pour un jeton mesuré quatre fois dans
  // le même document. Le contrôle « exemption redondante » (§6b) interdit
  // désormais qu'une telle entrée soit réintroduite sans que le gate crie.
};

// =============================================================================
// 3 bis · Les ÉCHELLES — le contraste n'est pas la seule chose qui se mesure
// =============================================================================
// L'échelle typographique est un JEU FIXE à paliers espacés d'au moins ~25 %
// (backlog E1-ST1, d'après Refactoring UI). Elle était écrite comme une intention
// et démentie par ses propres valeurs. Elle est un test à partir d'ici.
const ECHELLE_TYPO = [
  'taille-xs',
  'taille-s',
  'taille-m',
  'taille-l',
  'taille-xl',
  'taille-xxl',
];
const RATIO_TYPO_MIN = 1.25;

// Les paliers sont écrits en rem arrondis au dix-millième (1.9531rem pour
// 1.25⁴ = 1.953125). Le ratio mesuré peut donc valoir 1.249984 là où l'intention
// est exactement 1.25 : la tolérance absorbe CET artefact d'écriture, et rien de
// plus. Un vrai palier fautif rate de plusieurs centièmes (0.8333rem → 1.2000).
const TOLERANCE_TYPO = 0.001;

// Échelle d'espacement 8pt, sous-grille en multiples de 4 (backlog E1-ST1).
const ECHELLE_ESPACEMENT = [
  'espace-0-5',
  'espace-1',
  'espace-2',
  'espace-3',
  'espace-4',
  'espace-6',
  'espace-8',
];
const PAS_ESPACEMENT_PX = 4;
const BASE_REM_PX = 16;

// =============================================================================
// 4 · Analyse des sources SCSS
// =============================================================================
const echecs = [];
const erreur = (msg) => echecs.push(msg);

function lire(chemin) {
  try {
    return readFileSync(chemin, 'utf8');
  } catch {
    console.error(`\n✖ verifier-contrastes : fichier introuvable — ${relative(RACINE, chemin)}\n`);
    process.exit(1);
  }
}

/**
 * Extrait `$nom: valeur;` de la couche primitives.
 *
 * L'espace autour du `:` est HORIZONTAL (`[ \t]`) et non `\s` : sous le drapeau
 * `m`, un `\s*` collé à `^` peut réavaler les fins de ligne que `^` vient de
 * franchir, ce qui multiplie les chemins de retour arrière (backtracking
 * super-linéaire, signalé par l'analyse statique). Les captures sont
 * strictement inchangées — l'espace déplacé d'un côté à l'autre du `:` tombe de
 * toute façon dans le `.trim()`. La VALEUR reste `[^;]+`, autorisée à courir sur
 * plusieurs lignes (`$pile-corps` est une pile de polices multiligne) : la
 * borner ferait disparaître cette primitive de la table sans que rien ne le
 * signale, exactement le saut silencieux que ce gate refuse.
 */
function lirePrimitives(source) {
  const table = new Map();
  for (const m of source.matchAll(/^[ \t]*\$([\w-]+)[ \t]*:[ \t]*([^;]+);/gm)) {
    table.set(m[1], m[2].trim());
  }
  return table;
}

/**
 * Extrait le corps d'un `@mixin <nom>` par appariement d'accolades.
 * Une regex non appariée casserait au premier bloc imbriqué.
 */
function corpsDuMixin(source, nom) {
  const debut = source.indexOf(`@mixin ${nom}`);
  if (debut === -1) return null;
  const ouvrante = source.indexOf('{', debut);
  if (ouvrante === -1) return null;
  let profondeur = 0;
  for (let i = ouvrante; i < source.length; i += 1) {
    if (source[i] === '{') profondeur += 1;
    else if (source[i] === '}') {
      profondeur -= 1;
      if (profondeur === 0) return source.slice(ouvrante + 1, i);
    }
  }
  return null;
}

/**
 * Extrait les `--jeton: valeur;` d'un corps de mixin.
 * Même durcissement horizontal que `lirePrimitives`, et pour la même raison.
 * Volontairement NON ancrée sur `^` : deux déclarations posées sur une même
 * ligne doivent rester vues. Un jeton sauté ici échapperait aux contrôles de
 * couverture (§6a/6b) sans un mot — un vert mensonger coûte plus cher qu'un
 * avertissement d'analyse statique sur une entrée qui est notre propre SCSS.
 */
function lireJetons(corps) {
  const table = new Map();
  for (const m of corps.matchAll(/(--[\w-]+)[ \t]*:[ \t]*([^;]+);/g)) {
    table.set(m[1], m[2].trim());
  }
  return table;
}

/**
 * Résout la valeur d'un jeton en couleur RVB.
 * Renvoie `{ hex, rvb }` ou `{ probleme }` — jamais `null` silencieux.
 */
function resoudreCouleur(valeur, primitives, chemin = []) {
  const interpolation = valeur.match(/^#\{\s*(?:[\w-]+\.)?\$([\w-]+)\s*\}$/);
  if (interpolation) {
    const nom = interpolation[1];
    if (chemin.includes(nom)) return { probleme: `référence circulaire sur $${nom}` };
    if (!primitives.has(nom)) return { probleme: `primitive inconnue $${nom}` };
    return resoudreCouleur(primitives.get(nom), primitives, [...chemin, nom]);
  }

  const hex = valeur.match(/^#([0-9a-fA-F]{3,8})$/);
  if (!hex) {
    return {
      probleme:
        `valeur non résoluble « ${valeur} » — le gate n'accepte qu'un hex littéral ` +
        `ou une interpolation de primitive #{prim.$nom}`,
    };
  }

  const chiffres = hex[1];
  if (chiffres.length === 4 || chiffres.length === 8) {
    return {
      probleme: `canal alpha interdit sur un jeton (« ${valeur} ») — voir règle « aucune opacité »`,
    };
  }
  if (chiffres.length !== 3 && chiffres.length !== 6) {
    return { probleme: `hex de longueur inattendue « ${valeur} »` };
  }

  const plein =
    chiffres.length === 3
      ? chiffres
          .split('')
          .map((c) => c + c)
          .join('')
      : chiffres;

  return {
    hex: `#${plein.toLowerCase()}`,
    rvb: [0, 2, 4].map((i) => Number.parseInt(plein.slice(i, i + 2), 16)),
  };
}

// =============================================================================
// 5 · Contraste WCAG 2 — luminance relative
// =============================================================================
// Réf. WCAG 2.x, définitions « relative luminance » et « contrast ratio ».
function canal(huitBits) {
  const c = huitBits / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance([r, v, b]) {
  return 0.2126 * canal(r) + 0.7152 * canal(v) + 0.0722 * canal(b);
}

function ratioContraste(rvbA, rvbB) {
  const a = luminance(rvbA);
  const b = luminance(rvbB);
  const clair = Math.max(a, b);
  const sombre = Math.min(a, b);
  return (clair + 0.05) / (sombre + 0.05);
}

/** Arrondi PRUDENT (vers le bas) : 4.4999 ne doit jamais s'afficher « 4.5 ». */
function arrondiPrudent(ratio) {
  return Math.floor(ratio * 100) / 100;
}

// =============================================================================
// 6 · Exécution
// =============================================================================
const primitives = lirePrimitives(lire(PRIMITIVES));
const sourceThemes = lire(THEMES);

const THEMES_ATTENDUS = [
  { cle: 'clair', mixin: 'jetons-theme-clair', libelle: 'Clair — « papier ivoire »' },
  { cle: 'sombre', mixin: 'jetons-theme-sombre', libelle: 'Sombre — « ardoise encrée »' },
];

const jetonsParTheme = new Map();
for (const theme of THEMES_ATTENDUS) {
  const corps = corpsDuMixin(sourceThemes, theme.mixin);
  if (corps === null) {
    console.error(
      `\n✖ verifier-contrastes : mixin @mixin ${theme.mixin} introuvable dans _themes.scss\n`,
    );
    process.exit(1);
  }
  jetonsParTheme.set(theme.cle, lireJetons(corps));
}

// --- 6a. Les deux thèmes doivent définir exactement les mêmes jetons couleur -
const couleursDe = (m) => [...m.keys()].filter((n) => n.startsWith('--couleur-'));
const clairs = new Set(couleursDe(jetonsParTheme.get('clair')));
const sombres = new Set(couleursDe(jetonsParTheme.get('sombre')));
for (const nom of clairs) {
  if (!sombres.has(nom)) erreur(`jeton « ${nom} » défini en clair mais absent du thème sombre`);
}
for (const nom of sombres) {
  if (!clairs.has(nom)) erreur(`jeton « ${nom} » défini en sombre mais absent du thème clair`);
}

// --- 6b. Couverture : aucun jeton couleur ne doit échapper à la mesure -------
const jetonsCouverts = new Set(PAIRES.flatMap(([texte, fond]) => [texte, fond]));
for (const nom of clairs) {
  if (!jetonsCouverts.has(nom) && !EXEMPTIONS[nom]) {
    erreur(
      `jeton « ${nom} » n'apparaît dans aucune paire et n'est pas exempté — ` +
        `l'ajouter à PAIRES ou justifier son exemption dans EXEMPTIONS`,
    );
  }
}
for (const nom of Object.keys(EXEMPTIONS)) {
  if (!clairs.has(nom)) erreur(`exemption obsolète : le jeton « ${nom} » n'existe plus`);
  // Une exemption redondante est pire qu'inutile : la branche ne s'exécute jamais,
  // et le rapport publie « exempté de mesure » pour un jeton bel et bien mesuré.
  else if (jetonsCouverts.has(nom)) {
    const paires = PAIRES.filter(([t, f]) => t === nom || f === nom).length;
    erreur(
      `exemption redondante : le jeton « ${nom} » est couvert par ${paires} paire(s) de la ` +
        `table PAIRES — retirer son entrée d'EXEMPTIONS (le rapport le déclarerait « exempté ` +
        `de mesure » alors qu'il est mesuré)`,
    );
  }
}

// --- 6b bis. Porte dérobée par nommage --------------------------------------
// La couverture (6b) ne regarde que les jetons `--couleur-*`. Un futur jeton
// coloré nommé `--ombre-carte` ou `--surlignage-x` échapperait donc À LA FOIS à
// la mesure et à l'obligation d'exemption : le gate resterait vert sans avoir
// rien regardé. On refuse ici toute VALEUR de couleur portée par un jeton de
// thème mal préfixé — c'est le nom qui doit s'aligner sur la valeur, pas
// l'inverse.
for (const theme of THEMES_ATTENDUS) {
  for (const [nom, brut] of jetonsParTheme.get(theme.cle)) {
    if (nom.startsWith('--couleur-')) continue;
    const resolue = resoudreCouleur(brut, primitives);
    if (resolue.hex) {
      erreur(
        `[${theme.cle}] jeton « ${nom} » porte une couleur (${resolue.hex}) sans le préfixe ` +
          `« --couleur- » : il échapperait à la couverture ET à l'exemption. Le renommer ` +
          `« --couleur-… » et l'ajouter à PAIRES (ou à EXEMPTIONS, justifié).`,
      );
    }
  }
}

// --- 6b ter. Échelles typographique et d'espacement -------------------------
// Le contraste n'est pas la seule règle chiffrée du design system. Ces deux
// échelles étaient écrites comme des intentions dans un commentaire, et l'une
// d'elles était démentie par ses propres valeurs sans que rien ne le signale.
/** Convertit `0.8rem` / `12px` en pixels. Renvoie `null` si non convertible. */
function enPixels(valeur) {
  const rem = valeur.match(/^(-?[\d.]+)rem$/);
  if (rem) return Number.parseFloat(rem[1]) * BASE_REM_PX;
  const px = valeur.match(/^(-?[\d.]+)px$/);
  if (px) return Number.parseFloat(px[1]);
  return null;
}

const taillesPx = [];
for (const nom of ECHELLE_TYPO) {
  const brut = primitives.get(nom);
  if (brut === undefined) {
    erreur(`échelle typo : la primitive $${nom} est introuvable dans _primitives.scss`);
    continue;
  }
  const px = enPixels(brut);
  if (px === null) {
    erreur(`échelle typo : $${nom} vaut « ${brut} » — attendu une valeur en rem ou px`);
    continue;
  }
  taillesPx.push({ nom, brut, px });
}

for (let i = 1; i < taillesPx.length; i += 1) {
  const bas = taillesPx[i - 1];
  const haut = taillesPx[i];
  const ratio = haut.px / bas.px;
  if (ratio < RATIO_TYPO_MIN - TOLERANCE_TYPO) {
    erreur(
      `échelle typo : $${haut.nom} / $${bas.nom} = ${ratio.toFixed(4)} < ${RATIO_TYPO_MIN} requis ` +
        `(${bas.brut} → ${haut.brut}, soit ${bas.px}px → ${haut.px}px). Chaque palier doit être ` +
        `espacé d'au moins ~25 % du précédent (backlog E1-ST1).`,
    );
  }
}

for (const nom of ECHELLE_ESPACEMENT) {
  const brut = primitives.get(nom);
  if (brut === undefined) {
    erreur(`échelle d'espacement : la primitive $${nom} est introuvable dans _primitives.scss`);
    continue;
  }
  const px = enPixels(brut);
  if (px === null) {
    erreur(`échelle d'espacement : $${nom} vaut « ${brut} » — attendu une valeur en rem ou px`);
    continue;
  }
  if (!Number.isInteger(px) || px % PAS_ESPACEMENT_PX !== 0) {
    erreur(
      `échelle d'espacement : $${nom} vaut ${brut} = ${px}px, qui n'est pas un multiple de ` +
        `${PAS_ESPACEMENT_PX}px (grille 8pt, sous-grille 4 — backlog E1-ST1).`,
    );
  }
}

// --- 6c. Mesure de chaque paire, dans chaque thème --------------------------
const jetonsDeTexte = new Set(
  PAIRES.filter(([, , , seuil]) => seuil !== 'non-texte').map(([texte]) => texte),
);

const resultats = new Map(); // cle du thème -> lignes
const ratioMin = new Map(); // cle du thème -> { ratio, texte, fond }

for (const theme of THEMES_ATTENDUS) {
  const jetons = jetonsParTheme.get(theme.cle);
  const lignes = [];
  const resolus = new Map();

  const couleurDe = (nom) => {
    if (resolus.has(nom)) return resolus.get(nom);
    if (!jetons.has(nom)) {
      const r = { probleme: `jeton « ${nom} » non défini dans le thème ${theme.cle}` };
      resolus.set(nom, r);
      return r;
    }
    const r = resoudreCouleur(jetons.get(nom), primitives);
    resolus.set(nom, r);
    return r;
  };

  for (const [texte, fond, usage, seuil, options = {}] of PAIRES) {
    const cTexte = couleurDe(texte);
    const cFond = couleurDe(fond);

    if (cTexte.probleme || cFond.probleme) {
      if (cTexte.probleme) erreur(`[${theme.cle}] ${texte} : ${cTexte.probleme}`);
      if (cFond.probleme) erreur(`[${theme.cle}] ${fond} : ${cFond.probleme}`);
      continue;
    }

    const min = SEUILS[seuil].min;
    const ratio = arrondiPrudent(ratioContraste(cTexte.rvb, cFond.rvb));
    const conforme = ratio >= min;

    if (!conforme) {
      erreur(
        `[${theme.cle}] ${texte} sur ${fond} — ${ratio.toFixed(2)}:1 < ${min}:1 requis ` +
          `(${SEUILS[seuil].critere}) · ${usage} · ${cTexte.hex} sur ${cFond.hex}`,
      );
    }

    lignes.push({
      texte,
      fond,
      usage,
      seuil,
      ratio,
      min,
      conforme,
      options,
      hexTexte: cTexte.hex,
      hexFond: cFond.hex,
    });

    const courant = ratioMin.get(theme.cle);
    if (!courant || ratio < courant.ratio) ratioMin.set(theme.cle, { ratio, texte, fond });
  }

  // Règle « aucune opacité sur un jeton de texte » : vérifiée à la résolution
  // (un hex à 4 ou 8 chiffres est refusé) ; on re-signale ici les jetons texte
  // dont la source contiendrait une fonction d'alpha explicite.
  for (const nom of jetonsDeTexte) {
    const brut = jetons.get(nom) ?? '';
    if (/rgba\(|hsla\(|color-mix\(|transparentize\(|rgba\s*\(/.test(brut)) {
      erreur(`[${theme.cle}] ${nom} : jeton de texte avec transparence (« ${brut} ») — interdit`);
    }
  }

  resultats.set(theme.cle, lignes);
}

// =============================================================================
// 7 · Rapport Markdown — livrable exigé par le backlog (E1-ST1)
// =============================================================================
// ⚠️ AUCUN HORODATAGE ICI, volontairement. Une date de génération (`new Date()`)
// rend la sortie non déterministe : elle produit un diff parasite à chaque
// exécution, et surtout elle rendrait le mode `--check` toujours faux dès le
// lendemain. La date de dernière mise à jour est celle du commit — git la tient
// mieux que nous.
const md = [];
md.push(
  '# Table des contrastes des jetons sémantiques',
  '',
  '> **Fichier généré — ne pas modifier à la main.**',
  '> Produit par `tools/design/verifier-contrastes.mjs` (`npm run design:contrastes`).',
  '> Toute modification manuelle est écrasée à la prochaine passe, et',
  '> `npm run design:contrastes:check` (gate **G-contraste** en CI) échoue si la version',
  '> commitée diverge de ce que le script régénère. La date de dernière mise à jour est',
  '> celle du commit : la sortie est **déterministe**, sans horodatage.',
  '>',
  '> Le contraste est une propriété de **paires**, pas de jetons : la table des paires',
  '> autorisées vit en tête du script et fait foi. Une paire absente de cette table est une',
  '> combinaison **non autorisée** — l’ajouter au script avant de l’employer dans un composant.',
  '>',
  '> Méthode : luminance relative **WCAG 2** (pas d’APCA — non normatif). Ratios arrondis',
  '> **vers le bas** au centième, pour qu’un 4,4999 ne s’affiche jamais « 4,50 ».',
  '',
  '## Seuils appliqués',
  '',
  '| Seuil | Minimum | Critère |',
  '|---|---|---|',
);
for (const [cle, s] of Object.entries(SEUILS)) {
  md.push(`| \`${cle}\` | ${s.min}:1 | ${s.critere} |`);
}
md.push(
  '',
  `Cible haute informative : **${CIBLE_AAA}:1 (AAA)** sur le corps de texte — signalée, non bloquante.`,
  '',
);

for (const theme of THEMES_ATTENDUS) {
  const lignes = resultats.get(theme.cle) ?? [];
  md.push(
    `## Thème ${theme.libelle}`,
    '',
    '| Premier plan | Fond | Usage | Seuil | Ratio | Verdict |',
    '|---|---|---|---|---|---|',
  );
  for (const l of lignes) {
    const verdict = !l.conforme
      ? `❌ **${l.min}:1 requis**`
      : l.options.aaa
        ? l.ratio >= CIBLE_AAA
          ? '✅ AAA'
          : '✅ AA (AAA non atteint)'
        : '✅ AA';
    md.push(
      `| \`${l.texte}\`<br>\`${l.hexTexte}\` | \`${l.fond}\`<br>\`${l.hexFond}\` | ${l.usage} | ` +
        `${l.min}:1 | **${l.ratio.toFixed(2)}:1** | ${verdict} |`,
    );
  }
  md.push('');
  const bas = ratioMin.get(theme.cle);
  if (bas) {
    md.push(
      `Ratio le plus bas du thème : **${bas.ratio.toFixed(2)}:1** ` +
        `(\`${bas.texte}\` sur \`${bas.fond}\`).`,
      '',
    );
  }
}

md.push('## Jetons exemptés de mesure', '', '| Jeton | Justification |', '|---|---|');
for (const [nom, raison] of Object.entries(EXEMPTIONS)) {
  md.push(`| \`${nom}\` | ${raison} |`);
}
md.push(
  '',
  'Un jeton listé ici ne doit apparaître dans **aucune** paire ci-dessus : le gate refuse une',
  'exemption redondante autant qu’une exemption obsolète.',
  '',
  '## Échelles — typographie et espacement',
  '',
  'Le contraste n’est pas la seule règle chiffrée du design system : ces deux échelles sont',
  'mesurées par le même gate, et un palier hors règle le fait sortir en code 1.',
  '',
  `### Typographie — ratio minimal exigé : **${RATIO_TYPO_MIN}** entre paliers consécutifs`,
  '',
  '| Palier | Valeur | px (base 16) | Ratio vs palier précédent |',
  '|---|---|---|---|',
);
for (const [i, t] of taillesPx.entries()) {
  const ratio = i === 0 ? '—' : (t.px / taillesPx[i - 1].px).toFixed(4);
  md.push(`| \`$${t.nom}\` | \`${t.brut}\` | ${t.px} | ${ratio} |`);
}
md.push(
  '',
  `### Espacement — tout palier est un multiple de **${PAS_ESPACEMENT_PX} px** (grille 8pt)`,
  '',
  '| Palier | Valeur | px (base 16) |',
  '|---|---|---|',
);
for (const nom of ECHELLE_ESPACEMENT) {
  const brut = primitives.get(nom) ?? '—';
  const px = enPixels(brut);
  md.push(`| \`$${nom}\` | \`${brut}\` | ${px ?? '—'} |`);
}
md.push(
  '',
  '## Ce que ce gate ne couvre pas',
  '',
  '- Le contraste **réellement rendu** : un composant qui empilerait une opacité, une ombre',
  '  ou un fond intermédiaire sortirait de cette mesure. C’est le rôle de **G-axe** (E1-ST2),',
  '  qui teste les pages ; les deux gates sont complémentaires, aucun ne remplace l’autre.',
  '- Les images et diagrammes (Mermaid, SVG de leçon) — hors jetons.',
  '- Le critère **1.4.12** (espacement du texte) et **1.4.4** (zoom 200 %), qui relèvent des',
  '  échelles typographiques, pas des couleurs.',
  '',
);

// Saut de ligne final : un éditeur ou un formateur qui « corrige » l'absence de
// newline terminale ferait échouer `--check` pour une raison sans rapport avec le
// design system.
const rapportAttendu = `${md.join('\n')}\n`;

// Normalise les fins de ligne AVANT comparaison : sur un poste Windows, git peut
// rendre le fichier en CRLF au checkout alors que le script écrit en LF. Sans ça,
// `--check` échouerait pour une raison qui n'a rien à voir avec le design system.
const sansCR = (texte) => texte.replace(/\r\n/g, '\n');

if (MODE_CHECK) {
  let existant = null;
  try {
    existant = readFileSync(RAPPORT, 'utf8');
  } catch {
    erreur(
      `rapport absent — ${relative(RACINE, RAPPORT)} n'existe pas. ` +
        `Lancer « npm run design:contrastes » et committer le résultat.`,
    );
  }
  if (existant !== null && sansCR(existant) !== sansCR(rapportAttendu)) {
    erreur(
      `rapport périmé — ${relative(RACINE, RAPPORT)} diverge de ce que le script régénère. ` +
        `Lancer « npm run design:contrastes » et committer le résultat.`,
    );
  }
} else {
  mkdirSync(dirname(RAPPORT), { recursive: true });
  writeFileSync(RAPPORT, rapportAttendu, 'utf8');
}

// =============================================================================
// 8 · Résumé console et code de sortie
// =============================================================================
const totalPaires = [...resultats.values()].reduce((n, l) => n + l.length, 0);

console.log('');
console.log(
  `  Gate du design system — contrastes (WCAG 2, AA) + échelles${MODE_CHECK ? ' · mode --check' : ''}`,
);
console.log(
  `  ${clairs.size} jetons couleur par thème · ${PAIRES.length} paires déclarées · ${totalPaires} mesures`,
);
console.log(
  `  échelles : ${taillesPx.length} paliers typo (ratio ≥ ${RATIO_TYPO_MIN}) · ` +
    `${ECHELLE_ESPACEMENT.length} paliers d'espacement (multiples de ${PAS_ESPACEMENT_PX}px)`,
);
for (const theme of THEMES_ATTENDUS) {
  const lignes = resultats.get(theme.cle) ?? [];
  const bas = ratioMin.get(theme.cle);
  const echecsTheme = lignes.filter((l) => !l.conforme).length;
  console.log(
    `  · ${theme.cle.padEnd(7)} ${lignes.length} paires · ` +
      `plus bas ${bas ? bas.ratio.toFixed(2) : '—'}:1 (${bas ? bas.texte : '—'} / ${bas ? bas.fond : '—'})` +
      (echecsTheme ? ` · ${echecsTheme} SOUS LE SEUIL` : ''),
  );
}
console.log(
  `  Rapport : ${relative(RACINE, RAPPORT)}${MODE_CHECK ? ' (comparé, non réécrit)' : ' (réécrit)'}`,
);

// Un jeton cassé apparaît dans plusieurs paires : on ne répète pas le constat.
const distincts = [...new Set(echecs)];
if (distincts.length) {
  console.error('');
  console.error(`✖ verifier-contrastes : ${distincts.length} problème(s)`);
  for (const e of distincts) console.error(`   · ${e}`);
  console.error('');
  process.exit(1);
}

console.log('✔ toutes les paires déclarées franchissent leur seuil, échelles conformes.');
console.log('');
