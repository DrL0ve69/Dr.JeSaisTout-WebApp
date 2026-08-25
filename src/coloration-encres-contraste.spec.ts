// =============================================================================
// Les ENCRES de coloration franchissent-elles le seuil AA, pour TOUTES les
// grammaires du contrat ? (lot « langages web », 2026-08-24)
// -----------------------------------------------------------------------------
// POURQUOI CE TEST EXISTE.
// `src/styles/_coloration-syntaxique-generee.scss` n'émet QUE les classes que le
// contenu compilé emploie réellement : une encre qu'aucune leçon n'a fait naître
// n'existe pas dans la feuille, donc n'est mesurée par AUCUN gate — pas même par
// `tools/design/verifier-contrastes.mjs`, qui lit cette même feuille. C'est
// exactement ce qui a laissé dormir l'encre de commentaire `#6A737D` (3,95:1)
// jusqu'à la première leçon publiée portant des commentaires (E3-ST3).
//
// Le contrat vient de s'ouvrir à `javascript` et `html`. Une grammaire neuve fait
// naître des PORTÉES neuves, donc des ENCRES neuves — et la grammaire HTML de
// Shiki IMBRIQUE celles de JavaScript et de CSS pour le contenu de `<script>` et
// de `<style>`. Sans ce test, la paire de contraste correspondante resterait une
// dette silencieuse, qui rougirait en CI le jour d'une publication, c'est-à-dire
// au pire moment.
//
// CE QUE CE TEST FAIT, ET QUI NE DOUBLONNE PAS G-contrastes :
//   · G-contrastes mesure la feuille du CONTENU PUBLIÉ — ce qui est servi ;
//   · ce test mesure la feuille du BANC `__fixtures__/langages-web` — ce que le
//     CONTRAT autorise un auteur à écrire demain.
// Les deux populations sont différentes ; couvrir l'une ne couvre pas l'autre.
//
// LE FOND N'EST PAS ÉCRIT EN DUR (L-008). Il est LU dans les deux fichiers qui le
// définissent, et le chaînon entre eux est VÉRIFIÉ : un littéral recopié ici
// resterait vert le jour où le design system déplacerait `--couleur-code-surface`.
//
// POURQUOI PAR PROCESSUS FILS. Même frontière que
// `pipeline-contenu-compilation.spec.ts` : le compilateur est un `.mjs` du
// troisième programme TypeScript, l'importer le ferait entrer dans
// `tsconfig.spec.json`. On exécute donc la ligne de commande réelle.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const COMPILATEUR = 'tools/content-pipeline/compiler-markdown.mjs';
const BANC = 'tools/content-pipeline/__fixtures__/langages-web';
const PRIMITIVES = 'src/styles/_primitives.scss';
const THEMES = 'src/styles/_themes.scss';

/** Shiki charge de vraies grammaires TextMate au premier appel — c'est lent, mais une seule fois. */
const DELAI = 60_000;

/** WCAG 2.2, 1.4.3 : du code est du texte NORMAL, pas du non-texte. */
const SEUIL_AA_TEXTE_NORMAL = 4.5;

/**
 * Les DEUX langues entrées au contrat le 2026-08-24 — celles que ce banc existe pour couvrir.
 * Écrites ici pour que le test rougisse si le banc cessait d'en exercer une (anti-vacuité).
 */
const LANGUES_DU_BANC = ['javascript', 'html'];

/** Un canal `#rrggbb` lu à son décalage, ramené à [0, 1] puis LINÉARISÉ (WCAG 2.x). */
function canalLineaire(hex: string, decalage: number): number {
  const brut = Number.parseInt(hex.slice(decalage, decalage + 2), 16) / 255;
  return brut <= 0.03928 ? brut / 12.92 : ((brut + 0.055) / 1.055) ** 2.4;
}

/** Luminance relative sRGB, telle que WCAG 2.x la définit. */
function luminance(hex: string): number {
  return (
    0.2126 * canalLineaire(hex, 1) +
    0.7152 * canalLineaire(hex, 3) +
    0.0722 * canalLineaire(hex, 5)
  );
}

/** Rapport de contraste WCAG entre deux couleurs opaques `#rrggbb`. */
function contraste(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * Résout `--couleur-code-surface` en REMONTANT la chaîne réelle du design system :
 * `_themes.scss` la fait pointer sur une primitive, `_primitives.scss` porte la valeur.
 * Le chaînon est asserté, pas supposé — sans quoi ce test mesurerait un fond que le site
 * n'applique plus.
 */
function fondDeCode(): string {
  const themes = readFileSync(THEMES, 'utf8');
  const nomPrimitive = /--couleur-code-surface:\s*#\{prim\.\$([a-z0-9-]+)\}/.exec(themes)?.[1];
  // Un `?.` qui retomberait sur `undefined` en silence rendrait ce test vert sans avoir mesuré
  // le bon fond : on ÉCHOUE en nommant ce qui n'a pas été trouvé.
  expect(
    nomPrimitive,
    'themes.scss ne fait plus pointer --couleur-code-surface sur une primitive',
  ).toBeTypeOf('string');

  const primitives = readFileSync(PRIMITIVES, 'utf8');
  const valeur = new RegExp(`\\$${nomPrimitive}:\\s*(#[0-9a-fA-F]{6})`).exec(primitives)?.[1];
  expect(valeur, `la primitive ${nomPrimitive} est introuvable dans ${PRIMITIVES}`).toBeTypeOf(
    'string',
  );
  return String(valeur).toUpperCase();
}

interface BlocQuelconque {
  type?: string;
  langage?: string;
  [clef: string]: unknown;
}

/** Toutes les langues effectivement colorées dans l'AST compilé, récursion comprise. */
function languesColorees(noeud: unknown, vues = new Set<string>()): Set<string> {
  if (Array.isArray(noeud)) {
    for (const enfant of noeud) languesColorees(enfant, vues);
    return vues;
  }
  if (noeud !== null && typeof noeud === 'object') {
    const bloc = noeud as BlocQuelconque;
    if (bloc.type === 'code' && typeof bloc.langage === 'string') vues.add(bloc.langage);
    for (const valeur of Object.values(bloc)) languesColorees(valeur, vues);
  }
  return vues;
}

describe('Coloration syntaxique — les encres du CONTRAT, pas seulement celles du contenu publié', () => {
  let bacASable: string;
  let feuille: string;
  let ast: unknown;

  beforeAll(() => {
    bacASable = mkdtempSync(join(tmpdir(), 'encres-'));
    const cible = join(bacASable, 'coloration.scss');
    const sortie = execFileSync(
      process.execPath,
      [COMPILATEUR, '--racine', BANC, '--css', cible, '--json'],
      { encoding: 'utf8', timeout: DELAI },
    );
    ast = JSON.parse(sortie);
    feuille = readFileSync(cible, 'utf8');
  }, DELAI);

  afterAll(() => {
    rmSync(bacASable, { recursive: true, force: true });
  });

  it('CONTRÔLE POSITIF — le banc colore bien les deux langues visées', () => {
    // Sans cette assertion, tout ce qui suit resterait vert sur un banc devenu muet :
    // zéro encre mesurée est trivialement « zéro encre sous le seuil » (L-019, L-067).
    const langues = [...languesColorees(ast)];
    for (const langue of LANGUES_DU_BANC) expect(langues).toContain(langue);
  });

  it("CONTRÔLE POSITIF — la correction d'encre a bien couru sur la feuille du banc", () => {
    // `#6A737D` est l'encre de commentaire de github-dark, mesurée à 3,95:1 sur le fond du
    // site. Les deux grammaires du banc portent des commentaires : elle DOIT avoir été
    // émise, puis remplacée. Si la substitution cessait de mordre, l'assertion de seuil
    // ci-dessous rougirait aussi — mais on veut savoir laquelle des deux moitiés a cédé.
    expect(feuille).not.toMatch(/--shiki-dark:\s*#6A737D\b/i);
    expect(feuille).toMatch(/--shiki-dark:\s*#848D99\b/i);
  });

  it('CHAQUE encre émise franchit 4,5:1 sur --couleur-code-surface', () => {
    const fond = fondDeCode();
    const encres = new Set<string>();
    for (const [, encre] of feuille.matchAll(/--shiki-dark:\s*(#[0-9a-fA-F]{6})\b/g)) {
      // Le groupe de capture est obligatoire dans le motif : s'il manque, c'est le MOTIF qui a
      // changé, pas la feuille — et un `?? ''` avalerait la mesure au lieu de le dire.
      if (encre === undefined) throw new Error("motif d'encre sans groupe de capture");
      encres.add(encre.toUpperCase());
    }

    // Anti-vacuité : une feuille vide, ou un format de feuille qui aurait changé, ne doit pas
    // produire « aucune encre sous le seuil ». Le banc en émet 9 au 2026-08-24 ; le plancher
    // est volontairement plus bas que la mesure — il garde contre le ZÉRO, pas contre
    // l'inventaire éditorial du banc (L-065).
    expect(encres.size).toBeGreaterThanOrEqual(5);

    const fautives = [...encres]
      .map((encre) => ({ encre, ratio: Number(contraste(encre, fond).toFixed(2)) }))
      .filter(({ ratio }) => ratio < SEUIL_AA_TEXTE_NORMAL);

    // Le message porte la mesure : un mainteneur qui ajoute une langue doit lire ICI quelle
    // encre étendre dans `ENCRES_SOMBRES_CORRIGEES`, pas partir la chercher.
    expect(fautives, `encres sous ${SEUIL_AA_TEXTE_NORMAL}:1 sur ${fond}`).toEqual([]);
  });
});
