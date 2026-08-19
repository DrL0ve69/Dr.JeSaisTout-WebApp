// =============================================================================
// Les DEUX copies du comptage d'ancres disent-elles la même chose ?
// (E2-ST5, lot a — correctifs de revue)
// -----------------------------------------------------------------------------
// POURQUOI CE FICHIER EXISTE.
// Le nombre d'ancres `[[quiz]]` / `[[simulation]]` d'une leçon est calculé en DEUX
// exemplaires, et c'est voulu :
//   · `compterAncres` (`tools/content-pipeline/compiler-markdown.mjs`) refuse au BUILD une
//     leçon dont le corps ne porte pas le bon nombre d'ancres ;
//   · `compterAncres` (`src/app/features/cours/contenu-compile.ts`) REDIT cet invariant à la
//     LECTURE de l'artéfact, parce que ce JSON a pu être produit par une autre version du
//     pipeline — un invariant qui n'existe qu'au compilateur n'est pas tenu à la lecture.
// La frontière entre l'outillage `.mjs` et la source Angular est délibérée dans ce dépôt : un
// composant qui importerait un module de `tools/**` le ferait entrer dans son bundle (en-tête
// de `tsconfig.tools.json`). On ne factorise donc pas ; on garde la duplication HONNÊTE. Même
// patron, même raison et même mode d'échec que `src/compter-lignes-parite.spec.ts` — lu et
// suivi, pas réinventé.
//
// 🔴 CE QUI MANQUAIT, ET POURQUOI UN POINTEUR CROISÉ NE SUFFIT PAS (L-037).
// Les deux JSDoc se citaient déjà l'une l'autre. C'était la moitié de la dette : L-037 exige
// pointeur ET test de parité. Le mode de divergence est SILENCIEUX, et c'est L-034 dans sa
// forme littérale — le jour où un `BlocContenu` neuf portera des `blocs` imbriqués (au-delà
// d'`encadre`), une descente mise à jour d'un seul côté fera SOUS-COMPTER l'autre. Or le côté
// qui sous-compte trouve son compte JUSTE : une leçon à deux ancres en voit une, une seule est
// attendue, `1 === 1`, et rien ne rougit. La divergence ne se voit qu'en confrontant les deux
// comptes sur le MÊME corpus — c'est ce que fait ce fichier.
//
// POURQUOI PAR PROCESSUS FILS, ET PAS PAR IMPORT. Décision déjà prise par
// `src/compter-lignes-parite.spec.ts` et `src/pipeline-contenu-validation.spec.ts` : importer
// un `.mjs` d'outillage le ferait entrer dans `tsconfig.spec.json`, qui n'a ni `allowJs` ni
// les types Node de l'outillage. `compterAncres` est donc EXPORTÉE de `compiler-markdown.mjs`
// « exprès pour être mise à l'épreuve », comme `verifierAncres` l'a été (L-036) — elle n'a
// aucun autre appelant hors de son fichier.
//
// LES DEUX CATÉGORIES DU CORPUS, ET POURQUOI L'ÉGALITÉ N'EST EXIGÉE QUE DE L'UNE.
// Les blocs BIEN FORMÉS sont ceux que le compilateur produit : c'est là que les deux copies
// doivent rendre le MÊME nombre, sans exception. Les blocs HOSTILES (un `encadre` sans
// `blocs`, ou dont `blocs` n'est pas un tableau) ne peuvent pas sortir de `construireBlocs` —
// mais ils peuvent arriver dans un artéfact écrit par une autre version du pipeline. Les deux
// copies s'y comportent DIFFÉREMMENT, et c'est le contrat, pas un défaut : le compilateur a le
// droit de LEVER sur son propre AST cassé, la frontière de lecture n'en a pas le droit — elle
// doit rendre un nombre et laisser l'enveloppe nommer la faute. Cette asymétrie est donc
// ASSERTÉE, pas contournée.
//
// LE CORPUS EST ÉCRIT ICI, EN DUR — jamais importé de l'un des deux côtés (L-012).
// =============================================================================

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { compterAncres } from './app/features/cours/contenu-compile';

const MODULE_DE_REFERENCE = join(
  process.cwd(),
  'tools',
  'content-pipeline',
  'compiler-markdown.mjs',
);

/**
 * Une seule invocation de Node pour tout le corpus. Généreux à dessein : le module de
 * référence tire Shiki et jsdom à l'import. ⚠️ Un test à processus fils SANS délai explicite
 * est une bombe à retardement que le lot suivant déclenche — ses voisins
 * (`compter-lignes-parite`, `pipeline-contenu-validation`) en posent un pour cette raison.
 */
const DELAI = 120_000;

/**
 * Le programme jetable qui fait compter la RÉFÉRENCE. Il importe le module de production par
 * son URL de fichier — un chemin relatif ne se résout pas de façon garantie sous `--eval`, et
 * une URL `file:` est la seule forme portable sous Windows.
 *
 * Un cas qui LÈVE rend `null` plutôt que d'interrompre la série : c'est une réponse du module,
 * pas une panne du harnais, et le spec l'asserte comme telle.
 */
const PROGRAMME = [
  `import { compterAncres } from ${JSON.stringify(pathToFileURL(MODULE_DE_REFERENCE).href)};`,
  "let brut = '';",
  "process.stdin.setEncoding('utf8');",
  'for await (const morceau of process.stdin) brut += morceau;',
  'const recu = JSON.parse(brut);',
  'const comptes = recu.map((cas) => {',
  '  try {',
  '    return compterAncres(cas.blocs, cas.type);',
  '  } catch {',
  '    return null;',
  '  }',
  '});',
  'process.stdout.write(JSON.stringify(comptes));',
].join('\n');

/** Un encadré, tel que `construireBlocs` l'écrit — le SEUL bloc qui en imbrique d'autres. */
function encadre(...blocs: readonly unknown[]): Record<string, unknown> {
  return { type: 'encadre', variante: 'note', titre: 'Note', blocs };
}

/** Un bloc quelconque qui n'est ni une ancre ni un encadré — du bruit, qui doit être ignoré. */
const PARAGRAPHE = { type: 'paragraphe', html: '<p>Du texte.</p>' };

/**
 * Un bloc `comparaison` voisin : il porte des `exemples`, PAS des `blocs`. Une descente qui
 * confondrait « a des enfants » et « est un encadré » se ferait attraper ici.
 */
const COMPARAISON = {
  type: 'comparaison',
  exemples: [
    { role: 'vulnerable', langage: 'php', code: 'echo $x;', htmlColore: '', annotations: [] },
    { role: 'corrige', langage: 'php', code: 'echo h($x);', htmlColore: '', annotations: [] },
  ],
};

/**
 * Un cas = une liste de blocs + le type cherché + l'étiquette qui le NOMME dans le rapport.
 * `bienForme` dit si le compilateur peut produire cette liste (voir l'en-tête).
 */
const CORPUS: readonly {
  etiquette: string;
  blocs: readonly unknown[];
  type: 'ancre-quiz' | 'ancre-simulation';
  bienForme: boolean;
}[] = [
  { etiquette: 'liste vide', blocs: [], type: 'ancre-quiz', bienForme: true },
  {
    etiquette: 'aucune ancre — que du bruit',
    blocs: [PARAGRAPHE, COMPARAISON],
    type: 'ancre-quiz',
    bienForme: true,
  },
  {
    etiquette: 'une ancre au PREMIER niveau',
    blocs: [PARAGRAPHE, { type: 'ancre-quiz' }],
    type: 'ancre-quiz',
    bienForme: true,
  },
  {
    // 🔴 LE CAS QUI EXIGE LA RÉCURSION. Une descente de premier niveau compte 0 ici.
    etiquette: 'une ancre dans un `::: note` — imbrication à UN niveau',
    blocs: [PARAGRAPHE, encadre({ type: 'ancre-simulation' })],
    type: 'ancre-simulation',
    bienForme: true,
  },
  {
    etiquette: 'une ancre dans un encadré DANS un encadré — imbrication à DEUX niveaux',
    blocs: [encadre(PARAGRAPHE, encadre({ type: 'ancre-simulation' }))],
    type: 'ancre-simulation',
    bienForme: true,
  },
  {
    // Le décalage NON NEUTRE du corpus (L-039) : 3 en récursif, 1 à plat.
    etiquette: 'une ancre au premier niveau ET deux imbriquées — le compte doit valoir 3',
    blocs: [
      { type: 'ancre-simulation' },
      encadre({ type: 'ancre-simulation' }, encadre({ type: 'ancre-simulation' })),
    ],
    type: 'ancre-simulation',
    bienForme: true,
  },
  {
    // LES DEUX TYPES MÊLÉS : la descente est commune, le filtre ne l'est pas. Un compteur qui
    // additionnerait les deux types rendrait 3 au lieu de 2.
    etiquette: 'les deux types d’ancre mêlés — on ne compte QUE `ancre-quiz`',
    blocs: [
      { type: 'ancre-quiz' },
      encadre({ type: 'ancre-simulation' }, { type: 'ancre-quiz' }),
      COMPARAISON,
    ],
    type: 'ancre-quiz',
    bienForme: true,
  },
  {
    etiquette: 'les deux types mêlés — le MÊME corpus, vu par `ancre-simulation`',
    blocs: [
      { type: 'ancre-quiz' },
      encadre({ type: 'ancre-simulation' }, { type: 'ancre-quiz' }),
      COMPARAISON,
    ],
    type: 'ancre-simulation',
    bienForme: true,
  },
  {
    etiquette: 'encadré VIDE — des enfants, mais aucun',
    blocs: [encadre()],
    type: 'ancre-quiz',
    bienForme: true,
  },
  {
    etiquette: 'bloc `comparaison` voisin — il a des `exemples`, jamais des `blocs`',
    blocs: [COMPARAISON, encadre({ type: 'ancre-quiz' })],
    type: 'ancre-quiz',
    bienForme: true,
  },
  // ─── Les cas HOSTILES : impossibles à produire, possibles à LIRE ────────────────────────
  {
    etiquette: 'encadré dont `blocs` est ABSENT',
    blocs: [{ type: 'encadre', variante: 'note' }],
    type: 'ancre-quiz',
    bienForme: false,
  },
  {
    etiquette: 'encadré dont `blocs` vaut `null`',
    blocs: [{ type: 'encadre', variante: 'note', blocs: null }],
    type: 'ancre-quiz',
    bienForme: false,
  },
  {
    etiquette: 'encadré dont `blocs` est un NOMBRE',
    blocs: [{ type: 'encadre', variante: 'note', blocs: 42 }],
    type: 'ancre-quiz',
    bienForme: false,
  },
];

/** Comptes calculés par la RÉFÉRENCE — `null` quand elle a levé. Une seule invocation. */
let comptesReference: readonly (number | null)[] = [];

/** Le compte QU'UNE DESCENTE DE PREMIER NIVEAU rendrait — l'étalon du contrôle positif. */
function compterAPlat(blocs: readonly unknown[], type: string): number {
  return blocs.filter((bloc) => (bloc as { type?: unknown } | null)?.type === type).length;
}

describe('Parité des deux copies du comptage d’ancres', () => {
  beforeAll(() => {
    const sortie = execFileSync(process.execPath, ['--input-type=module', '--eval', PROGRAMME], {
      input: JSON.stringify(CORPUS.map((c) => ({ blocs: c.blocs, type: c.type }))),
      encoding: 'utf8',
      timeout: DELAI,
    });
    const recu: unknown = JSON.parse(sortie);
    if (!Array.isArray(recu) || recu.some((v) => v !== null && typeof v !== 'number')) {
      throw new Error(
        `compterAncres n'a pas rendu un tableau de nombres : ${sortie.slice(0, 200)}`,
      );
    }
    comptesReference = recu as (number | null)[];
  }, DELAI);

  it('la référence rend exactement un compte par cas du corpus', () => {
    expect(comptesReference).toHaveLength(CORPUS.length);
  });

  // LE CONTRÔLE POSITIF DU CORPUS (L-019, et L-039 sur le décalage). Sans lui, « les deux
  // copies sont d'accord » serait vrai d'un corpus PLAT, sur lequel une descente non récursive
  // serait d'accord aussi — c'est-à-dire d'un test incapable d'attraper la seule régression
  // qu'il vise. On exige donc que le corpus SÉPARE les deux formules, et pas d'un cheveu.
  it('le corpus SÉPARE la descente récursive d’un balayage de premier niveau', () => {
    const divergents = CORPUS.filter(
      (cas) => compterAPlat(cas.blocs, cas.type) !== compterAncres(cas.blocs, cas.type),
    );
    expect(
      divergents.length,
      divergents.map((c) => c.etiquette).join(' · '),
    ).toBeGreaterThanOrEqual(4);

    // Et l'écart n'est pas de 1 partout : au moins un cas où deux ancres se cachent sous une
    // seule visible. Un décalage de 1 se compenserait trop facilement (L-039).
    const ecarts = CORPUS.map(
      (cas) => compterAncres(cas.blocs, cas.type) - compterAPlat(cas.blocs, cas.type),
    );
    expect(Math.max(...ecarts)).toBeGreaterThanOrEqual(2);
  });

  for (const [index, cas] of CORPUS.entries()) {
    if (cas.bienForme) {
      it(`même compte des deux côtés — ${cas.etiquette}`, () => {
        expect(comptesReference[index], cas.etiquette).toBe(compterAncres(cas.blocs, cas.type));
      });
    } else {
      // L'ASYMÉTRIE ASSUMÉE, ASSERTÉE PLUTÔT QUE CONTOURNÉE (voir l'en-tête). Le compilateur
      // travaille sur SON AST : il a le droit de lever sur un AST cassé. La frontière de
      // lecture, elle, reçoit un artéfact d'origine incertaine — si elle levait ici, la page
      // tomberait sur une exception anonyme au lieu du message qui nomme le champ fautif.
      it(`la LECTURE ne lève pas là où le compilateur a le droit de lever — ${cas.etiquette}`, () => {
        expect(() => compterAncres(cas.blocs, cas.type)).not.toThrow();
        expect(compterAncres(cas.blocs, cas.type)).toBe(0);
      });
    }
  }

  // Le contrôle positif de la catégorie « hostile » elle-même : si la référence cessait de
  // lever sur TOUS ces cas, la distinction ci-dessus n'aurait plus d'objet et les cas
  // devraient repasser en `bienForme` — donc en exigence d'égalité.
  it('la catégorie « hostile » est RÉELLE — la référence lève sur au moins un de ces cas', () => {
    const hostiles = CORPUS.map((cas, index) => ({ cas, compte: comptesReference[index] })).filter(
      ({ cas }) => !cas.bienForme,
    );
    expect(hostiles.length).toBeGreaterThan(0);
    expect(hostiles.filter(({ compte }) => compte === null).length).toBeGreaterThan(0);
  });
});
