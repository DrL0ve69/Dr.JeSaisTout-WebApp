// =============================================================================
// LE GARDE-FOU DE PUBLICATION — aucune leçon non publiée dans l'artéfact
// -----------------------------------------------------------------------------
// CE QUE CE FICHIER TIENT, EN UNE PHRASE :
//   Object.keys(carteLecons) ⊆ leconsPubliees(manifesteLecons).map(e => e.slug)
// et la même chose sur un artéfact fraîchement bâti depuis la fixture témoin.
//
// POURQUOI IL EXISTE. Le 2026-08-19, un relecteur indépendant a mesuré, sur
// l'artéfact réellement servi : `GET /chunk-<hash>.js` en **200**, contenant le texte
// complet d'une leçon en `statut: brouillon` ; une navigation Chromium sur son URL non
// prerendue rendait la page ENTIÈRE ; et son titre voyageait jusque dans le bundle
// initial. Le prerender, lui, était correctement filtré — « Prerendered 4 static
// routes », aucun `index.html` de brouillon sur le disque. C'est tout le défaut :
// **« ne pas prerendre » n'est pas « ne pas publier »** (S-006 — tout fichier présent
// dans l'artéfact est servable, qu'un plan de routage le mentionne ou non).
//
// POURQUOI IL EST ÉCRIT COMME UN GARDE-FOU, ET PAS COMME UN TEST DE PLUS.
// `leconsPubliees` (`app/features/cours/contenu-compile.ts`) se déclarait
// « l'unique définition de « publiée » du dépôt » et énumérait TROIS consommateurs.
// Il y avait CINQ points de décision, et les deux qui manquaient — l'écriture de
// l'artéfact et le résolveur de route — sont exactement ceux par lesquels le texte
// fuyait. Une promesse qui dit « le dépôt » et une vérification qui couvre trois
// appelants sur cinq, c'est le patron S-010, et il ne se referme pas en corrigeant le
// commentaire : il se referme par un balayage qui porte sur le MÊME périmètre que la
// promesse — ici, la SORTIE du pipeline, pas la liste de ses appelants.
//
// LES DEUX PRÉDICATS QUE CE FICHIER MET FACE À FACE. Le filtre de génération vit dans
// `tools/content-pipeline/generer-manifeste.mjs` (`separerPubliees`, programme
// outillage) ; le filtre applicatif vit dans `contenu-compile.ts` (`leconsPubliees`,
// bundle du navigateur). Les deux programmes ne peuvent pas s'importer l'un l'autre —
// d'où deux écritures du même mot, et d'où ce fichier, qui fait bâtir la fixture par
// le PREMIER et juge le résultat avec le SECOND (L-016).
//
// ⚠️ SANS SON CONTRÔLE POSITIF, CE FICHIER SERAIT VRAI DU VIDE. `content/` est vide
// jusqu'à E3-ST1 : dans le dépôt, `carteLecons` vaut `{}` et `manifesteLecons` vaut
// `[]`, donc l'inclusion est trivialement vraie. Le seul jeu de données qui prouve
// quelque chose est la fixture témoin, qui porte UNE leçon publiée et UNE en
// `brouillon` — et le contrôle positif consiste à rebâtir la même fixture avec
// `--inclure-brouillons` et à exiger que le garde-fou ROUGISSE alors (L-014, L-019).
//
// ⚠️ CE SPEC EXIGE LE CHROMIUM DE PLAYWRIGHT, comme les deux autres specs qui bâtissent
// la fixture : la leçon-témoin porte des diagrammes Mermaid. Aucun `skip` muet ne masque
// son absence (L-005) — `diagnostic()` nomme `npm run e2e:install` dans le rapport de
// Vitest lui-même. Les diagrammes sont mis en cache par hachage : le second bâtissage
// ne relance pas `mmdc`.
// =============================================================================

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { carteLecons } from './content-generated/carte-lecons';
import { leconsPubliees, lireManifeste, manifesteLecons } from './app/features/cours/contenu-compile';

const ORCHESTRATEUR = 'tools/content-pipeline/build.mjs';
const RACINE_TEMOIN = 'tools/content-pipeline/__fixtures__/temoin/cours/securite-web';

/** La source de la leçon non publiée de la fixture — relue pour le contrôle positif du corpus. */
const SOURCE_BROUILLON = join(RACINE_TEMOIN, '02-lecon-brouillon', 'lecon.md');

/** Le slug de la leçon non publiée, écrit EN DUR — un test qui le dérive de la fixture qu'il
 * vérifie ne prouve que `x === x` (L-012). */
const SLUG_BROUILLON = 'lecon-brouillon';

/** Le slug de la leçon publiée de la fixture, en dur pour la même raison. */
const SLUG_PUBLIEE = 'lecon-temoin';

/** Bac à sable dans le dépôt : `build.mjs` refuse une sortie hors dépôt. `.cache/` est gitignoré. */
const BAC = '.cache/garde-fou-publication';

/** Shiki charge de vraies grammaires, `mmdc` peut démarrer un vrai Chromium : lent, une fois. */
const DELAI = 240_000;

interface Artefact {
  readonly sortie: string;
  readonly code: number;
  readonly journal: string;
}

/** Bâtit la fixture témoin dans un sous-dossier du bac, avec les arguments donnés en plus. */
function batir(nom: string, argsEnPlus: readonly string[]): Artefact {
  const sortie = join(BAC, nom, 'content-generated');
  const resultat = spawnSync(
    process.execPath,
    [
      ORCHESTRATEUR,
      '--racine',
      RACINE_TEMOIN,
      '--sortie',
      sortie,
      '--css',
      join(BAC, nom, '_coloration.scss'),
      ...argsEnPlus,
    ],
    { encoding: 'utf8', cwd: process.cwd() },
  );
  return {
    sortie,
    code: resultat.status ?? -1,
    journal: `${resultat.stdout ?? ''}\n${resultat.stderr ?? ''}`,
  };
}

/**
 * Message de diagnostic, VIDE quand tout va bien — placé avant l'assertion de code, il fait
 * remonter la CAUSE dans le rapport de Vitest au lieu de « expected -1 to be 0 ».
 */
function diagnostic(artefact: Artefact): string {
  if (artefact.code === 0) return '';
  const chromiumManquant = /Chromium|e2e:install|Playwright|mmdc/i.test(artefact.journal);
  const tete = chromiumManquant
    ? 'le rendu des diagrammes exige le Chromium de Playwright — lancer : npm run e2e:install'
    : `l'orchestrateur a échoué (code ${artefact.code})`;
  const extrait = artefact.journal
    .trim()
    .split('\n')
    .filter((ligne) => ligne.trim() !== '')
    .slice(-12)
    .join('\n');
  return `${tete}\n${extrait}`;
}

/**
 * Les slugs réellement importables d'un `carte-lecons.ts` généré.
 *
 * Le motif apparie l'expression `import()` LITTÉRALE, pas une clef d'objet quelconque : ce qui
 * rend une leçon téléchargeable est le point de coupe d'esbuild, et lui seul. Son contrôle
 * positif est l'assertion « la carte fermée porte la leçon publiée » — sans elle, un motif
 * devenu muet rendrait tout le fichier vert en n'ayant rien lu (L-014).
 */
function slugsDeLaCarte(sortie: string): string[] {
  const source = readFileSync(join(sortie, 'carte-lecons.ts'), 'utf8');
  const motif = /'([a-z0-9-]+)':\s*\(\)\s*=>\s*import\(/g;
  return [...source.matchAll(motif)].map((capture) => capture[1] ?? '');
}

/** Le manifeste écrit par le pipeline, relu par la frontière de typage de l'application. */
function manifesteDe(sortie: string): readonly EntreeManifesteRoutes[] {
  return lireManifeste(
    JSON.parse(readFileSync(join(sortie, 'manifeste-routes.json'), 'utf8')),
    `manifeste de ${sortie}`,
  );
}

/**
 * 🔴 LE PRÉDICAT DU GARDE-FOU, ÉCRIT UNE FOIS : les slugs chargeables que le manifeste ne
 * déclare PAS publiés. Il doit rendre `[]` partout — sauf sur l'artéfact du contrôle positif.
 */
function intrus(carte: readonly string[], entrees: readonly EntreeManifesteRoutes[]): string[] {
  const publiees = new Set(leconsPubliees(entrees).map((entree) => entree.slug));
  return carte.filter((slug) => !publiees.has(slug));
}

let ferme: Artefact;
let ouvert: Artefact;

beforeAll(() => {
  rmSync(BAC, { recursive: true, force: true });
  mkdirSync(BAC, { recursive: true });
  ferme = batir('ferme', []);
  ouvert = batir('ouvert', ['--inclure-brouillons']);
}, DELAI);

afterAll(() => {
  rmSync(BAC, { recursive: true, force: true });
});

describe('aucune leçon non publiée dans l’artéfact', () => {
  // ---------------------------------------------------------------------------
  // Les contrôles positifs — sans eux, tout le reste est vrai du vide
  // ---------------------------------------------------------------------------
  it('CONTRÔLE POSITIF : la fixture porte bien une leçon NON publiée', () => {
    // Le jour où quelqu'un ramènerait les deux leçons de la fixture au même statut, ce
    // fichier entier deviendrait vert sans plus rien mesurer — exactement le trou que la
    // seconde leçon de la fixture a été créée pour combler (L-019).
    const source = readFileSync(SOURCE_BROUILLON, 'utf8');
    expect(source).toContain(`slug: ${SLUG_BROUILLON}`);
    expect(source).toMatch(/^statut:\s*brouillon\s*$/m);
  });

  it('CONTRÔLE POSITIF : les deux bâtissages ont réussi et la carte fermée n’est pas vide', () => {
    expect(diagnostic(ferme)).toBe('');
    expect(ferme.code).toBe(0);
    expect(diagnostic(ouvert)).toBe('');
    expect(ouvert.code).toBe(0);

    // Le motif de lecture de la carte trouve RÉELLEMENT quelque chose : sans cette
    // assertion, une carte illisible rendrait « 0 intrus » sur toute la ligne.
    expect(slugsDeLaCarte(ferme.sortie)).toEqual([SLUG_PUBLIEE]);
    expect(manifesteDe(ferme.sortie).map((entree) => entree.slug)).toEqual([SLUG_PUBLIEE]);
  });

  it('🔴 CONTRÔLE POSITIF DU GARDE-FOU : il ROUGIT sur un artéfact qui porte un brouillon', () => {
    // C'est l'assertion qui distingue « le garde-fou tient » de « le garde-fou ne mesure
    // rien ». Bâti avec `--inclure-brouillons`, l'artéfact redevient exactement celui que le
    // relecteur a mesuré : le chunk du brouillon existe, la carte le rend chargeable, et le
    // manifeste ne le déclare pas publié. Le prédicat DOIT le nommer.
    const trouves = intrus(slugsDeLaCarte(ouvert.sortie), manifesteDe(ouvert.sortie));
    expect(trouves).toEqual([SLUG_BROUILLON]);
    expect(existsSync(join(ouvert.sortie, 'lecons', `${SLUG_BROUILLON}.json`))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // La promesse elle-même
  // ---------------------------------------------------------------------------
  it('n’écrit NI json, NI entrée de carte, NI entrée de manifeste pour une leçon non publiée', () => {
    // Les TROIS sorties, une par une : c'est le `lecons/<slug>.json` qui devient le chunk
    // servi en 200, la carte qui le rend chargeable, et le manifeste qui fait voyager titre,
    // section et ordre dans le bundle INITIAL. En retirer deux sur trois ne fermerait rien.
    expect(existsSync(join(ferme.sortie, 'lecons', `${SLUG_PUBLIEE}.json`))).toBe(true);
    expect(existsSync(join(ferme.sortie, 'lecons', `${SLUG_BROUILLON}.json`))).toBe(false);
    expect(slugsDeLaCarte(ferme.sortie)).not.toContain(SLUG_BROUILLON);
    expect(manifesteDe(ferme.sortie).map((entree) => entree.slug)).not.toContain(SLUG_BROUILLON);

    // Et le PRÉDICAT, sur ce même artéfact : rien de chargeable qui ne soit publié.
    expect(intrus(slugsDeLaCarte(ferme.sortie), manifesteDe(ferme.sortie))).toEqual([]);
  });

  it('ne laisse AUCUN mot du brouillon dans les sorties — titre compris', () => {
    // Le manifeste porte les métadonnées de chaque leçon : filtrer les fichiers de leçon sans
    // filtrer le manifeste laisserait le TITRE d'une leçon non relue dans le bundle initial,
    // ce qui est précisément ce que le relecteur a mesuré (`grep -c … main-*.js` → 1).
    const manifeste = readFileSync(join(ferme.sortie, 'manifeste-routes.json'), 'utf8');
    const carte = readFileSync(join(ferme.sortie, 'carte-lecons.ts'), 'utf8');
    expect(manifeste).not.toContain('celle que le sommaire ne doit pas montrer');
    expect(manifeste).not.toContain(SLUG_BROUILLON);
    expect(carte).not.toContain(SLUG_BROUILLON);
  });

  it('le journal ANNONCE ce qu’il a écarté, et ce qu’il a inclus sur demande (L-005)', () => {
    // Un filtre muet ne se distingue pas d'un filtre débranché.
    expect(ferme.journal).toContain('1 leçon(s) non publiée(s) écartée(s)');
    expect(ferme.journal).toContain(SLUG_BROUILLON);
    expect(ouvert.journal).toContain('0 leçon(s) non publiée(s) écartée(s)');
    expect(ouvert.journal).toContain('--inclure-brouillons');
  });

  it('tient la promesse sur l’artéfact RÉELLEMENT livré par le dépôt', () => {
    // Vacuité assumée tant que `content/` est vide (E3-ST1) — c'est pour cela que les
    // assertions ci-dessus portent sur la fixture. Celle-ci mordra le jour où une vraie leçon
    // existera, sans que personne n'ait à y penser.
    expect(intrus(Object.keys(carteLecons), manifesteLecons)).toEqual([]);
  });
});
