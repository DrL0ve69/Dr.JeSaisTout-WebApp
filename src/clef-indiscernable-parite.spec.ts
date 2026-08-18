// =============================================================================
// Les DEUX copies de la clef d'indiscernabilité disent-elles la même chose ?
// (E2-ST3, lot E-b)
// -----------------------------------------------------------------------------
// POURQUOI CE FICHIER EXISTE.
// `clefIndiscernable` — `valeur.normalize('NFC').replace(/\s+/g, ' ').trim()` — existe
// en deux exemplaires, et c'est VOULU :
//   · `tools/content-pipeline/valider.mjs` (troisième programme TypeScript,
//     `tsconfig.tools.json`, Node pur) refuse au BUILD deux `gauche` ou deux
//     `choix[].id` que rien ne distingue à l'écran, en nommant le fichier ;
//   · `src/app/features/cours/quiz/quiz.ts` refuse la MÊME chose à l'exécution,
//     parce qu'un composant ne peut pas faire confiance à ce qu'on lui passe.
// La frontière entre l'outillage `.mjs` et la source Angular est délibérée dans ce
// dépôt : on ne factorise pas les deux copies en un module partagé. Ce qui manquait,
// c'est le contrôle qui garde la duplication HONNÊTE — le seul lien entre les deux
// était un commentaire (« la MÊME règle que … »), c'est-à-dire rien (L-008).
//
// LE MODE D'ÉCHEC, ET IL EST VICIEUX DANS UN SEUL SENS. Si la copie du validateur
// devient plus PERMISSIVE que celle du composant, une leçon sort G-content VERTE, puis
// casse au prerender d'`ng build`, sur un message qui ne nomme pas le fichier, au milieu
// d'une pile Angular. C'est exactement la panne que le lot E-a existait pour éliminer,
// réintroduite un cran plus haut. Dans l'autre sens (validateur plus strict), la faute
// est bénigne : le build refuse une leçon que le composant aurait acceptée. Le contrôle
// exige donc l'ÉGALITÉ, pas une inclusion — les deux sens rougissent.
//
// POURQUOI PAR PROCESSUS FILS, ET PAS PAR IMPORT. Même raison que
// `src/pipeline-contenu-validation.spec.ts`, dont ce fichier prolonge le patron :
// importer `valider.mjs` le ferait entrer dans `tsconfig.spec.json`, qui n'a ni
// `allowJs` ni les types Node de l'outillage. Cette décision ne se rouvre pas. On
// exécute donc la ligne de commande RÉELLE, via un mode `--clefs` ajouté à l'outil dans
// le même esprit que `--fixtures` : un mode de test, pas un `export`.
//
// POURQUOI TOUT PASSE EN ASCII ÉCHAPPÉ, DANS LES DEUX SENS. Le corpus est fait de
// blanches significatives (U+00A0, tabulation, saut de ligne, CRLF) et de décompositions
// Unicode. Ni argv ni un flux dépendant de la page de code d'une console Windows ne les
// transportent intacts — et un transport qui abîme la valeur fabriquerait une divergence
// qui n'existe pas, c'est-à-dire un test qui ment dans le sens le plus coûteux. Pour la
// même raison, les caractères invisibles du corpus sont écrits en SÉQUENCES D'ÉCHAPPEMENT
// JavaScript, jamais en clair : un caractère qu'aucun relecteur ne voit est un caractère
// qu'un formateur automatique peut remplacer sans que personne ne le remarque.
//
// LE CORPUS EST ÉCRIT ICI, EN DUR — jamais importé de l'un des deux côtés (L-012). Un
// test qui importe la constante dont il vérifie la valeur ne vérifie que `x === x`.
// =============================================================================

import { execFileSync } from 'node:child_process';

import { clefIndiscernable } from './app/features/cours/quiz/quiz';

const VALIDATEUR = 'tools/content-pipeline/valider.mjs';

/** Une seule invocation de Node pour tout le corpus : lente une fois, pas seize fois. */
const DELAI = 60_000;

/**
 * Un cas = une valeur piégeuse + l'étiquette qui la NOMME dans le rapport de test. Sans
 * l'étiquette, une divergence sur une chaîne faite de blanches s'afficherait comme un
 * blanc à côté d'un autre blanc : illisible, et indiscernable du cas voisin — soit
 * exactement ce que la règle testée existe pour empêcher.
 */
const CORPUS: readonly { etiquette: string; valeur: string }[] = [
  { etiquette: 'chaîne déjà propre', valeur: 'HSTS' },
  { etiquette: 'U+00A0 en queue', valeur: 'HSTS\u00a0' },
  { etiquette: 'U+00A0 en tête', valeur: '\u00a0HSTS' },
  { etiquette: 'U+00A0 au milieu', valeur: 'HSTS\u00a0strict' },
  { etiquette: 'espace ordinaire au milieu (la jumelle du cas précédent)', valeur: 'HSTS strict' },
  { etiquette: 'plusieurs espaces consécutives', valeur: 'HSTS   strict' },
  { etiquette: 'blanches mêlées — U+00A0 et tabulation', valeur: 'HSTS \u00a0\t strict' },
  { etiquette: 'NFC — « é » précomposé', valeur: 'clé publique' },
  { etiquette: 'NFD — « e » suivi de U+0301 combinant', valeur: 'cle\u0301 publique' },
  { etiquette: 'chaîne vide', valeur: '' },
  { etiquette: 'espaces ordinaires seules', valeur: '   ' },
  { etiquette: 'U+00A0 seules', valeur: '\u00a0\u00a0' },
  { etiquette: 'tabulation et saut de ligne', valeur: 'a\tb\nc' },
  { etiquette: 'CRLF au milieu (L-015)', valeur: 'a\r\nb' },
  // U+202F est INTERDITE dans `content/` (`.claude/rules/contenu-pedagogique.md` §3), mais
  // la classe `\s` la couvre en JavaScript : les deux copies doivent la replier pareil. Le
  // gate qui la bannit ne regarde que les fichiers de leçon — il ne verrait donc jamais
  // qu'une des deux copies a cessé de la traiter comme une blanche.
  { etiquette: 'U+202F, repliée par « \\s » bien que bannie du contenu', valeur: 'a\u202fb' },
  {
    etiquette: 'blanches aux deux bouts ET au milieu',
    valeur: '\u00a0 Réponse\u00a0 attendue \u00a0',
  },
];

/**
 * Échappe en ASCII pur toute unité de code hors de l'ASCII imprimable. Symétrique de
 * `enJsonAscii` côté outil — réécrite ici, jamais importée (L-012).
 */
function enJsonAscii(valeurs: readonly string[]): string {
  return JSON.stringify(valeurs).replace(/[^\x20-\x7E]/gu, (c) => {
    const code = c.charCodeAt(0).toString(16).padStart(4, '0');
    return `\\u${code}`;
  });
}

/** Clefs calculées par l'OUTIL — une seule invocation, pour tout le corpus. */
let clefsOutil: readonly string[] = [];

describe("Parité des deux copies de la clef d'indiscernabilité", () => {
  beforeAll(() => {
    const sortie = execFileSync(process.execPath, [VALIDATEUR, '--clefs'], {
      input: enJsonAscii(CORPUS.map((c) => c.valeur)),
      encoding: 'utf8',
      timeout: DELAI,
    });
    const recu: unknown = JSON.parse(sortie);
    if (!Array.isArray(recu) || recu.some((v) => typeof v !== 'string')) {
      throw new Error(`--clefs n'a pas rendu un tableau de chaînes : ${sortie.slice(0, 200)}`);
    }
    clefsOutil = recu as string[];
  }, DELAI);

  it("l'outil rend exactement une clef par valeur du corpus", () => {
    expect(clefsOutil).toHaveLength(CORPUS.length);
  });

  // LE CONTRÔLE POSITIF DU CORPUS, en deux moitiés. Sans lui, « les deux copies sont
  // d'accord » serait vrai d'un corpus de chaînes déjà propres — sur lequel n'importe
  // quelle paire d'implémentations, y compris deux identités, serait d'accord (L-019).
  it('le corpus exerce vraiment la normalisation — la plupart des valeurs sont transformées', () => {
    const transformees = CORPUS.filter((c) => clefIndiscernable(c.valeur) !== c.valeur);
    expect(transformees.length).toBeGreaterThanOrEqual(10);
  });

  it('le corpus porte de vraies collisions — des valeurs brutes distinctes, une même clef', () => {
    const clefs = CORPUS.map((c) => clefIndiscernable(c.valeur));
    const brutes = new Set(CORPUS.map((c) => c.valeur));
    expect(new Set(clefs).size).toBeLessThan(brutes.size);
    // La paire NFC/NFD est nommée à part : c'est la seule collision du lot qu'une
    // comparaison de blanches, si `normalize` disparaissait, ne rattraperait pas. Un
    // remaniement du corpus qui la perdrait fait rougir ICI, pas six mois plus tard.
    expect(clefIndiscernable('clé publique')).toBe(clefIndiscernable('cle\u0301 publique'));
  });

  for (const [index, cas] of CORPUS.entries()) {
    it(`même clef des deux côtés — ${cas.etiquette}`, () => {
      const attendue = clefIndiscernable(cas.valeur);
      // Les DEUX membres passent par `enJsonAscii` : c'est ce qui fait qu'un échec
      // IMPRIME la valeur qui diverge, au lieu d'afficher deux blancs identiques à l'œil.
      expect(enJsonAscii([clefsOutil[index] ?? '<<CLEF ABSENTE>>'])).toBe(enJsonAscii([attendue]));
    });
  }
});
