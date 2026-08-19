// =============================================================================
// Le compilateur Markdown → AST tient-il ses TROIS promesses ? (E2-ST1, lot 2)
// -----------------------------------------------------------------------------
// POURQUOI CE TEST EXISTE.
// `tools/content-pipeline/compiler-markdown.mjs` porte trois garanties qu'aucun
// autre gate ne peut constater :
//
//   1. ZÉRO attribut `style=` dans le HTML coloré. La CSP du site est à hachages :
//      `generer-config-swa.mjs` refuse tout ` style="` de l'artéfact et hache tout
//      bloc `<style>` dans un `style-src` GLOBAL AU SITE. Le build finirait par le
//      dire — mais bien plus tard, sur un message qui ne nommerait pas la leçon
//      fautive. Ici, la faute se voit à la ligne près.
//   2. Les commentaires `<!-- à-vérifier: … -->` disparaissent AVANT rendu, pour
//      TOUS les statuts. `html: false` les ÉCHAPPE au lieu de les effacer : sans
//      retrait explicite, les doutes du professeur s'afficheraient en clair aux
//      apprenants sur toute leçon `brouillon` ou `verifiee`.
//   3. Un conteneur `:::` hors de la liste fermée fait ÉCHOUER la compilation.
//      markdown-it-container ne « dégrade » pas : il retombe en paragraphe et les
//      deux-points s'affichent au lecteur.
//   4. (E2-ST3, lot B) `quiz.json` est lu, REVALIDÉ et émis dans `LeconCompilee.quiz` —
//      absent, mal apparié à sa leçon ou hors schéma, il fait échouer la compilation.
//      Seul `trouver-la-faille` s'enrichit d'un `htmlColore`, et son `code` brut reste
//      à côté. Le compilateur revalide parce qu'il s'exécute AUSSI hors de `build.mjs`
//      (cette ligne de commande en est la preuve vivante) : `valider.mjs` n'a alors pas
//      tourné, et un générateur ne suppose pas qu'un garde-fou d'amont s'est exécuté.
//
// LE CONTRÔLE POSITIF (L-019). Une assertion « la sortie ne contient pas
// `à-vérifier` » est vraie sur une sortie vide, sur une leçon sans marqueur, et
// même sur un compilateur qui ne compile rien. Le premier test vérifie donc
// d'abord que la SOURCE en contient un — si quelqu'un retire le marqueur de la
// fixture, c'est ce test-là qui rougit, pas la garantie qui devient muette.
//
// POURQUOI PAR PROCESSUS FILS, ET NON PAR IMPORT. Le compilateur est un `.mjs`
// vérifié par le TROISIÈME programme (`tsconfig.tools.json`, Node pur).
// L'importer depuis un spec Angular le ferait entrer dans `tsconfig.spec.json`,
// qui n'a ni `allowJs` ni les types Node de l'outillage — la frontière que
// `configuration-typescript.spec.ts` défend explicitement. On exécute donc la
// LIGNE DE COMMANDE réelle, ce qui a l'avantage de vérifier aussi le contrat que
// `build.mjs` (lot 4) consommera.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const COMPILATEUR = 'tools/content-pipeline/compiler-markdown.mjs';
const FIXTURE_TEMOIN = 'tools/content-pipeline/__fixtures__/temoin-minimal';
const FIXTURE_CONTENEUR_INCONNU =
  'tools/content-pipeline/__fixtures__/invalides/corps-conteneur-hors-liste-fermee';

/** Shiki charge de vraies grammaires TextMate au premier appel — c'est lent, mais une seule fois. */
const DELAI = 60_000;

interface BlocQuelconque {
  type: string;
  html?: string;
  htmlColore?: string;
  blocs?: BlocQuelconque[];
  exemples?: {
    langage: string;
    vulnerable: { htmlColore: string; annotations: AnnotationLue[] };
    corrige: { htmlColore: string; annotations: AnnotationLue[] };
  }[];
}

/**
 * L'annotation TELLE QU'ELLE SORT du pipeline — lue en forme large, comme le quiz ci-dessous et
 * pour la même raison (L-012) : décrire ici la forme d'`AnnotationLigne` ferait passer pour
 * vérifié ce que ce spec doit constater à l'exécution.
 */
interface AnnotationLue {
  lignes: number[];
  texte: string;
}

interface SectionLue {
  titre: string;
  ancre: string;
  niveau: number;
  blocs: BlocQuelconque[];
}

/**
 * Le quiz TEL QU'IL SORT du pipeline — lu en forme LARGE, pas en `QuizCompile`.
 * C'est délibéré : un type qui décrirait déjà les quatre variantes ferait passer pour
 * vérifié ce que ce spec doit justement constater à l'exécution (L-012).
 */
interface QuestionLue {
  id: string;
  type: string;
  langage?: string;
  code?: string;
  htmlColore?: string;
}

interface QuizLu {
  lecon: string;
  titre: string;
  questions: QuestionLue[];
}

interface LeconLue {
  frontmatter: Record<string, unknown>;
  sections: SectionLue[];
  quiz: QuizLu;
  /** Optionnel au contrat (E2-ST5, lot a) — lu en forme LARGE, pour la raison ci-dessus. */
  simulation?: Record<string, unknown>;
}

/** Un dossier jetable par exécution : les sorties générées ne doivent jamais toucher `src/`. */
let bacASable = '';

/**
 * Lance le compilateur et rend sa sortie JSON. Le processus fils écrit son compte-rendu sur
 * stderr et le JSON sur stdout, précisément pour que cette lecture reste possible.
 */
function compiler(racine: string, feuille: string): { lecons: LeconLue[] } {
  const sortie = execFileSync(
    process.execPath,
    [COMPILATEUR, '--racine', racine, '--css', feuille, '--json'],
    { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: DELAI },
  );
  return JSON.parse(sortie) as { lecons: LeconLue[] };
}

/** Aplatit l'arbre : les encadrés contiennent des blocs, qui peuvent contenir du code. */
function tousLesBlocs(sections: readonly SectionLue[]): BlocQuelconque[] {
  const plat: BlocQuelconque[] = [];
  const descendre = (blocs: readonly BlocQuelconque[]): void => {
    for (const bloc of blocs) {
      plat.push(bloc);
      if (bloc.blocs !== undefined) descendre(bloc.blocs);
    }
  };
  descendre(sections.flatMap((section) => section.blocs));
  return plat;
}

/**
 * Tous les fragments de HTML coloré produits : ceux du corps, ceux nichés dans une comparaison,
 * ET celui de chaque question `trouver-la-faille` du quiz (E2-ST3, lot B).
 *
 * Le quiz entre dans CE helper plutôt que dans une assertion parallèle, et c'est le point : le
 * code d'un quiz est coloré par le MÊME colorateur que celui du corps, donc les deux garanties
 * qui suivent (zéro `style=`, toute classe `clr-` définie dans la feuille) doivent le couvrir
 * sans qu'on ait à y penser. Une assertion écrite à côté aurait à être répétée au bloc suivant.
 */
function htmlColores(lecon: LeconLue): string[] {
  return [
    ...tousLesBlocs(lecon.sections).flatMap((bloc) => [
      ...(bloc.htmlColore === undefined ? [] : [bloc.htmlColore]),
      ...(bloc.exemples ?? []).flatMap((paire) => [
        paire.vulnerable.htmlColore,
        paire.corrige.htmlColore,
      ]),
    ]),
    ...lecon.quiz.questions.flatMap((question) =>
      question.htmlColore === undefined ? [] : [question.htmlColore],
    ),
  ];
}

/**
 * Les ancres de ligne d'un fragment coloré, DANS L'ORDRE — `[1, 2, 3]` pour trois lignes ancrées.
 *
 * 🔴 ON ANALYSE, ON NE CHERCHE PAS DE MOTIF, et ce n'est pas une préférence de style : la chaîne
 * HTML contient le TEXTE du code de l'auteur, donc un motif `ligne-(\d+)` s'apparie aussi bien à
 * un commentaire de leçon qu'à une vraie classe. C'est le défaut que la revue de sécurité a
 * MESURÉ sur la première écriture de ce fichier (S-003 / S-009, quatrième récidive de la famille
 * dans ce dépôt). Le texte d'un `<span>` ne peut pas fabriquer un `<span>` : l'arbre ne ment pas.
 *
 * `document` est celui de l'environnement de test — le même outil que le compilateur emploie côté
 * Node (jsdom), pour poser exactement la même question.
 */
function ancresDe(html: string): (number | null)[] {
  const porteur = document.createElement('div');
  porteur.innerHTML = html;
  // ⚠️ UNE ENTRÉE PAR LIGNE RENDUE, `null` COMPRIS — et non « la liste des ancres trouvées ».
  // Un `flatMap` qui laisse tomber les lignes sans ancre rendrait `[1, 2]` sur un extrait de
  // trois lignes dont la deuxième aurait perdu la sienne : la suite serait intacte, le trou
  // invisible. La ligne muette doit apparaître dans la mesure pour pouvoir la faire rougir.
  return [...porteur.querySelectorAll('pre.shiki > code > span.line')].map((ligne) => {
    const ancres = [...ligne.classList].filter((classe) => /^ancre-ligne-\d+$/.test(classe));
    return ancres.length === 1 ? Number(ancres[0]?.slice('ancre-ligne-'.length)) : null;
  });
}

/**
 * Appelle `verifierAncres` DU COMPILATEUR sur un HTML forgé, dans un processus fils, et rend son
 * code de sortie et son compte-rendu.
 *
 * 🔴 POURQUOI CE DÉTOUR PLUTÔT QU'UNE ASSERTION DE PLUS SUR LA FIXTURE (constat de revue,
 * 2026-08-18). Les tests d'ancres ci-dessous compilent une vraie leçon, transformateur BRANCHÉ :
 * ils prouvent ce que `ancresDe` sait lire, pas ce que le compilateur sait REFUSER. La version
 * par motif du garde-fou — celle qu'un texte de leçon citant « ancre-ligne-1, ancre-ligne-2 »
 * suffisait à contenter — les aurait tous passés verts. Un garde-fou dont la seule preuve est une
 * mutation faite à la main n'a pas de contrôle positif : c'est L-019, sur l'axe « le test vise le
 * mauvais côté de la frontière ».
 *
 * Le processus fils est obligatoire, et pour la raison écrite en tête de fichier : ce spec ne peut
 * pas `import` un `.mjs` du programme de l'outillage. Il ne l'est pas moins pour une autre raison —
 * `verifierAncres` sort par `echec()`, donc par `process.exit(1)` : l'appeler en direct tuerait le
 * lanceur de tests.
 */
function appelerVerifierAncres(html: string, code: string): { statut: number; sortie: string } {
  const script = join(bacASable, 'appel-verifier-ancres.mjs');
  writeFileSync(
    script,
    [
      "import { pathToFileURL } from 'node:url';",
      'const [, , chemin, html, code] = process.argv;',
      'const module = await import(pathToFileURL(chemin).href);',
      "module.verifierAncres(html, code, 'html-forgé.md');",
    ].join('\n'),
    'utf8',
  );
  try {
    const sortie = execFileSync(process.execPath, [script, COMPILATEUR, html, code], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: DELAI,
    });
    return { statut: 0, sortie };
  } catch (erreur) {
    const echec = erreur as { status?: number; stderr?: string };
    return { statut: echec.status ?? -1, sortie: echec.stderr ?? '' };
  }
}

/**
 * Appelle `verifierZeroStyle` du COMPILATEUR sur un HTML forgé, dans un processus fils.
 *
 * 🔴 MÊME RAISON QUE `appelerVerifierAncres`, ET C'EST L-036 MOT POUR MOT. Compiler une leçon
 * transformateur BRANCHÉ ne mesurerait que ce que le spec sait lire, jamais ce que le garde-fou
 * sait REFUSER : la version par MOTIF — celle qui faisait échouer G-content sur un exemple PHP
 * contenant `style="…"` dans son TEXTE — passerait un tel test tout aussi verte. Le refus se
 * prouve en appelant l'outil corrigé sur un HTML forgé, et en lisant son code de sortie.
 *
 * Le processus fils est obligatoire pour les deux raisons écrites en tête de fichier : ce spec ne
 * peut pas `import` un `.mjs` du programme de l'outillage, et `verifierZeroStyle` sort par
 * `echec()`, donc par `process.exit(1)` — l'appeler en direct tuerait le lanceur de tests.
 */
function appelerVerifierZeroStyle(html: string): { statut: number; sortie: string } {
  const script = join(bacASable, 'appel-verifier-zero-style.mjs');
  writeFileSync(
    script,
    [
      "import { pathToFileURL } from 'node:url';",
      'const [, , chemin, html] = process.argv;',
      'const module = await import(pathToFileURL(chemin).href);',
      "module.verifierZeroStyle(html, 'html-forgé.md');",
    ].join('\n'),
    'utf8',
  );
  try {
    const sortie = execFileSync(process.execPath, [script, COMPILATEUR, html], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: DELAI,
    });
    return { statut: 0, sortie };
  } catch (erreur) {
    const echec = erreur as { status?: number; stderr?: string };
    return { statut: echec.status ?? -1, sortie: echec.stderr ?? '' };
  }
}

/**
 * Recopie la leçon-témoin dans un dossier JETABLE du bac à sable, en laissant muter chacun de
 * ses deux fichiers.
 *
 * POURQUOI DANS LE BAC À SABLE, ET NON SOUS `__fixtures__/invalides/`. Ce dernier dossier est la
 * table CÂBLÉE de `pipeline-contenu-validation.spec.ts`, dont le garde-fou de complétude exige
 * une assertion par dossier : y déposer un cas destiné au COMPILATEUR ferait rougir le spec du
 * VALIDATEUR, pour une faute qui n'est pas la sienne.
 *
 * @param nom sous-dossier du bac à sable — un par cas, pour qu'aucun n'hérite du voisin
 * @param corps transforme le `lecon.md` du témoin ; absent = copie conforme
 * @param quiz mute le `quiz.json` déjà parsé ; `null` = ne pas écrire de quiz du tout
 * @param simulation contenu de `simulation.json` ; absent = ne pas en écrire du tout, ce qui
 *   est l'état de la leçon-témoin minimale (elle n'en porte pas, et n'en portera pas : c'est
 *   ce qui la garde valide sous la règle « ancre ⇔ fichier » d'E2-ST5)
 */
function leconAdHoc(
  nom: string,
  corps?: (source: string) => string,
  quiz?: ((donnees: Record<string, unknown>) => void) | null,
  simulation?: Record<string, unknown>,
): string {
  const racine = join(bacASable, nom);
  const dossier = join(racine, '01-temoin');
  mkdirSync(dossier, { recursive: true });

  const source = readFileSync(join(FIXTURE_TEMOIN, '01-temoin', 'lecon.md'), 'utf8');
  writeFileSync(join(dossier, 'lecon.md'), corps === undefined ? source : corps(source), 'utf8');

  if (quiz !== null) {
    const donnees = JSON.parse(
      readFileSync(join(FIXTURE_TEMOIN, '01-temoin', 'quiz.json'), 'utf8'),
    ) as Record<string, unknown>;
    quiz?.(donnees);
    writeFileSync(join(dossier, 'quiz.json'), JSON.stringify(donnees, null, 2), 'utf8');
  }

  if (simulation !== undefined) {
    writeFileSync(join(dossier, 'simulation.json'), JSON.stringify(simulation, null, 2), 'utf8');
  }

  return racine;
}

describe('pipeline de contenu — compilation Markdown', () => {
  beforeAll(() => {
    bacASable = mkdtempSync(join(tmpdir(), 'drjst-compilation-'));
  });

  afterAll(() => {
    rmSync(bacASable, { recursive: true, force: true });
  });

  describe('leçon témoin', () => {
    let lecon: LeconLue;
    let feuille: string;

    beforeAll(() => {
      const cible = join(bacASable, 'coloration.scss');
      const resultat = compiler(FIXTURE_TEMOIN, cible);
      expect(resultat.lecons).toHaveLength(1);
      const premiere = resultat.lecons[0];
      if (premiere === undefined) throw new Error('aucune leçon compilée');
      lecon = premiere;
      feuille = readFileSync(cible, 'utf8');
    }, DELAI);

    it('produit du code coloré, et pas seulement de la prose', () => {
      // Sans cette assertion, les deux suivantes seraient vraies sur une leçon
      // dépourvue de tout bloc de code — un vert qui ne prouve rien (L-019).
      expect(htmlColores(lecon).length).toBeGreaterThan(0);
    });

    it('émet le quiz de la leçon, avec ses CINQ questions et les QUATRE types', () => {
      // CONTRÔLE POSITIF DE TOUT CE QUI SUIT (L-019). Sans lui, « aucun style= dans le
      // HTML coloré du quiz » serait vrai d'un quiz vide, et « chaque type traverse
      // intact » serait vrai d'un quiz mono-type. C'est cette assertion qui oblige la
      // fixture à porter de quoi mordre — voir son LISEZMOI.
      expect(lecon.quiz.lecon).toBe(lecon.frontmatter['slug']);
      expect(lecon.quiz.titre).not.toBe('');
      expect(lecon.quiz.questions).toHaveLength(5);
      expect([...new Set(lecon.quiz.questions.map((question) => question.type))].sort()).toEqual([
        'associer',
        'choix-multiple',
        'trouver-la-faille',
        'vrai-faux',
      ]);
    });

    it('colore le code de « trouver-la-faille » — et GARDE le code brut à côté', () => {
      // Le `code` brut est la source de vérité de la numérotation des lignes
      // (`ligneFautive`) et du texte accessible : le remplacer par son rendu HTML
      // rendrait la ligne fautive indésignable. Les deux doivent coexister.
      const failles = lecon.quiz.questions.filter((q) => q.type === 'trouver-la-faille');
      expect(failles).toHaveLength(1);
      for (const faille of failles) {
        expect(faille.code).toContain('$_GET');
        expect(faille.htmlColore).toMatch(/^<pre class="shiki/);
        expect(faille.htmlColore).toContain('clr-');
      }
    });

    it('ÉCHAPPE les métacaractères HTML du code — la propriété qui autorise le lot C', () => {
      // ⚠️ LE CONSTAT LE PLUS IMPORTANT DE CE FICHIER. Le lot C rendra `htmlColore` dans la
      // page ; ce qui l'y autorise n'est pas le sanitizer d'Angular mais une propriété du
      // colorateur : Shiki traite sa source comme du TEXTE, donc `<script>` en ressort en
      // `&lt;script&gt;`. Tant que personne ne la mesure, c'est une phrase de commentaire
      // (L-008) — et ce chemin portera `<script>alert('XSS')</script>` dès le module XSS d'E3.
      const faille = lecon.quiz.questions.find((q) => q.type === 'trouver-la-faille');
      expect(faille).toBeDefined();
      const { code = '', htmlColore = '' } = faille ?? {};

      // CONTRÔLE POSITIF (L-019) : sans charge utile dans la fixture, tout ce qui suit serait
      // vrai d'un code sans le moindre chevron. C'est cette assertion qui fait mordre l'autre.
      expect(code).toContain("<script>alert('XSS')</script>");
      expect(code).toContain('onerror=');

      // ⚠️ CE QUE SHIKI FAIT RÉELLEMENT, MESURÉ ET NON SUPPOSÉ : il échappe « < » en « &#x3C; »
      // et laisse « > » BRUT. La première version de ce test cherchait « &lt;script&gt; » et
      // refusait tout « onerror= » — les deux étaient fausses, et la seconde rougissait sur du
      // TEXTE inoffensif. La garantie exacte est plus étroite, et elle suffit : aucun « < » du
      // source ne survit, donc aucune balise ne peut s'OUVRIR. « > » et « onerror= » restent
      // alors des caractères de texte, sans pouvoir s'attacher à quoi que ce soit.
      //
      // On ANALYSE plutôt qu'on ne cherche des motifs interdits (S-001 · S-003 · S-009) : on
      // retire les seules balises que Shiki émet — liste NOMINATIVE — et on exige qu'il ne
      // reste plus un seul « < ». Une liste de motifs (« <script », « <img ») ne refuserait que
      // ce que son auteur a imaginé ; celle-ci refuse tout ce qu'il n'a pas imaginé.
      const BALISES_DE_SHIKI = /<\/?(?:pre|code|span)(?:\s[^>]*)?>/g;
      const balisesRetirees = htmlColore.match(BALISES_DE_SHIKI)?.length ?? 0;
      const texteSeul = htmlColore.replace(BALISES_DE_SHIKI, '');

      // Contrôle positif du retrait lui-même : un `replace` qui n'aurait rien retiré, ou un
      // texte vidé de sa charge, rendrait l'assertion suivante vraie sans rien prouver.
      expect(balisesRetirees).toBeGreaterThan(0);
      expect(texteSeul).toContain('onerror=alert(1)');

      expect(texteSeul).not.toContain('<');

      // Et la charge ressort bien — échappée, pas silencieusement effacée : l'énoncé de la
      // question doit rester LISIBLE, c'est la matière même de l'exercice.
      expect(texteSeul).toContain('&#x3C;script>');
      expect(texteSeul).toContain('&#x3C;img');
    });

    it("n'émet AUCUN `ficheSource` — la traçabilité reste côté build", () => {
      // `valider.mjs` l'EXIGE sur chaque question de la source (contenu-pedagogique §5) : le
      // contrôle positif est donc que le fichier lu en porte bien, sans quoi cette assertion
      // serait verte sur un quiz qui n'en a jamais eu.
      const source = readFileSync(join(FIXTURE_TEMOIN, '01-temoin', 'quiz.json'), 'utf8');
      expect(source).toContain('"ficheSource"');

      // Un chemin vers une KnowledgeBase privée n'a aucun usage dans un navigateur qui ne peut
      // pas l'ouvrir : c'est de la surface publiée pour rien. La voie publique vers les sources
      // est la section « Aller plus loin » de la leçon.
      expect(JSON.stringify(lecon.quiz)).not.toContain('ficheSource');
    });

    it('passe les AUTRES types du quiz sans y toucher — aucun `htmlColore` inventé', () => {
      // L'enrichissement est UNIQUE et ciblé. Un `htmlColore` apparu sur un
      // `choix-multiple` signalerait un colorateur appliqué au petit bonheur.
      for (const question of lecon.quiz.questions) {
        if (question.type === 'trouver-la-faille') continue;
        expect(question.htmlColore).toBeUndefined();
        expect(question.langage).toBeUndefined();
      }
    });

    it('ANCRE CHAQUE LIGNE — `ancre-ligne-1` … `ancre-ligne-N`, sans trou, dans TOUS les fragments colorés', () => {
      // E2-ST4 (lot A2). C'est le crochet auquel le lot B accrochera ses annotations
      // ancrées ; il est posé par le transformateur `drjst-ancre-de-ligne`, et c'est une
      // CLASSE parce que `src/sonde-sanitizer-shiki.spec.ts` a mesuré que ni `id` ni
      // `data-*` ne survivent au sanitizer d'Angular.
      //
      // ⚠️ CE QUE CE TEST AJOUTE AU CONTRÔLE DE CONSERVATION DU COMPILATEUR. Ce dernier
      // exige les ancres à la COMPILATION, donc sur le chemin de `colorer` ; celui-ci les
      // exige dans le JSON ÉMIS. Les deux ne disent pas la même chose : une étape d'émission
      // qui rognerait le HTML (assainissement, troncature, réécriture) laisserait le premier
      // vert. C'est le pendant exact de la garantie « zéro `style=` », vérifiée elle aussi
      // des deux côtés.
      const fragments = htmlColores(lecon);
      expect(fragments.length).toBeGreaterThan(0);

      for (const html of fragments) {
        // Contrôle positif (L-019) : sans ligne, « aucun trou » serait vrai de rien.
        expect(ancresDe(html).length).toBeGreaterThan(0);

        // La suite attendue est 1, 2, … N — pas « au moins une ancre quelque part ».
        // Une base 0, une base décalée d'un cran, ou une ligne sautée feraient toutes
        // pointer `{lignes="3"}` sur la mauvaise ligne, EN SILENCE.
        const ancres = ancresDe(html);
        expect(ancres).toEqual(ancres.map((_ancre, index) => index + 1));
      }
    });

    it('ANCRE — la ligne SURNUMÉRAIRE du corps de leçon est mesurée, pas supposée', () => {
      // 🔴 CE QUE LE LOT B DOIT SAVOIR AVANT D'APPARIER (constat de revue, 2026-08-18).
      // markdown-it termine le contenu d'une clôture par un saut de ligne, dont Shiki fait une
      // dernière ligne VIDE, ancrée comme les autres : un bloc du CORPS porte donc une ancre de
      // plus que la source n'a de lignes. Le `code` d'un quiz, qui n'a pas ce saut, n'en porte
      // pas. La règle est écrite dans `types.d.ts` ; elle est ÉPINGLÉE ici, sans quoi elle se
      // périmerait en silence à la première montée de markdown-it ou de Shiki (L-008).
      const bloc = tousLesBlocs(lecon.sections).find((b) => b.type === 'code');
      expect(bloc?.htmlColore).toBeDefined();
      // 3 lignes écrites dans la fixture (« ```bash » … « ``` »), 4 ancres rendues.
      expect(ancresDe(bloc?.htmlColore ?? '')).toEqual([1, 2, 3, 4]);

      const faille = lecon.quiz.questions.find((q) => q.type === 'trouver-la-faille');
      expect(faille?.code?.endsWith('\n')).toBe(false);
      expect(ancresDe(faille?.htmlColore ?? '')).toEqual([1, 2, 3]);
    });

    it('ANCRE — le garde-fou du COMPILATEUR refuse un HTML dont seul le TEXTE cite des ancres', () => {
      // 🔴 LE CONTRÔLE POSITIF DU CORRECTIF LUI-MÊME. C'est exactement l'entrée qui passait
      // VERTE avant le 2026-08-18 : aucune ligne ancrée, mais un commentaire de code qui
      // récite les ancres attendues. La version par motif y trouvait `ancre-ligne-1` et
      // `ancre-ligne-2` et se déclarait satisfaite ; la version qui ANALYSE voit deux
      // `span.line` sans classe d'ancre, et refuse.
      const texte = '// voir ancre-ligne-1, ancre-ligne-2\n$x = 1;';
      const sansAncre =
        '<pre class="shiki"><code>' +
        '<span class="line">// voir ancre-ligne-1, ancre-ligne-2</span>\n' +
        '<span class="line">$x = 1;</span>' +
        '</code></pre>';
      const refus = appelerVerifierAncres(sansAncre, texte);
      expect(refus.statut).toBe(1);
      expect(refus.sortie).toContain('0 ancre(s)');

      // CONTRE-ÉPREUVE, sans laquelle le refus ci-dessus serait compatible avec un garde-fou
      // qui refuse TOUT : le même fragment, ancré, passe — code de sortie 0, rien sur stderr.
      const avecAncre = sansAncre
        .replace('<span class="line">//', '<span class="line ancre-ligne-1">//')
        .replace('<span class="line">$x', '<span class="line ancre-ligne-2">$x');
      const accepte = appelerVerifierAncres(avecAncre, texte);
      expect(accepte.statut).toBe(0);

      // Et le troisième cas, celui que le `Set` de la première écriture laissait passer :
      // les ancres sont là, mais DÉCALÉES d'un cran. `{lignes="1"}` désignerait alors la
      // deuxième ligne de l'extrait, en silence.
      const decale = avecAncre
        .replace('ancre-ligne-1', 'ancre-ligne-2')
        .replace('ancre-ligne-2">$x', 'ancre-ligne-3">$x');
      const refusDecale = appelerVerifierAncres(decale, texte);
      expect(refusDecale.statut).toBe(1);
      expect(refusDecale.sortie).toContain('ne forment pas la suite');
      // `DELAI` explicite : ce test lance TROIS processus fils, dont chacun importe le
      // compilateur — donc Shiki, Ajv et markdown-it. Sous la suite complète, les 5 s par
      // défaut de Vitest ne suffisent pas, et l'échec ressemble alors à une régression du
      // garde-fou alors qu'il n'a jamais eu le temps de répondre (L-035 : une prémisse de
      // test fausse rougit sur un produit sain).
    }, DELAI);

    it('ANCRE — le TEXTE du code ne peut pas fabriquer une ancre (constat de revue, 2026-08-18)', () => {
      // 🔴 CE QUE CE TEST EXISTE POUR EMPÊCHER. La première écriture du garde-fou du
      // compilateur ET de l'assertion ci-dessus cherchait `ligne-(\d+)` par MOTIF dans la
      // chaîne HTML — laquelle contient le texte du code de l'auteur. Un extrait dont un
      // commentaire cite « ancre-ligne-1, ancre-ligne-2, ancre-ligne-3 » fournissait donc lui-même les ancres
      // qu'on lui réclamait : les deux gates passaient verts, transformateur débranché
      // (mesuré en revue de sécurité). C'est le patron S-003 / S-009, pour la quatrième fois.
      // ⚠️ La substitution est ancrée par REGEX et non sur `'```bash\n'` : les fichiers de ce
      // poste sont en CRLF (L-015), et un littéral en `\n` ne mute alors RIEN — le test serait
      // passé sur une leçon sans leurre, donc sans rien prouver.
      const racine = leconAdHoc('ancres-leurre', (source) =>
        source.replace(
          /```bash\r?\n/,
          (fence) =>
            `${fence}# leurre : class="line ancre-ligne-1" class="line ancre-ligne-2" class="line ancre-ligne-3"\n`,
        ),
      );
      const { lecons } = compiler(racine, join(bacASable, 'ancres-leurre.scss'));
      const html = htmlColores(lecons[0] as LeconLue).find((fragment) =>
        fragment.includes('leurre'),
      );

      // CONTRÔLE POSITIF : le leurre est bien DANS le fragment mesuré, sous sa forme
      // littérale. Sans lui, tout ce qui suit serait vrai d'un extrait ordinaire — et le
      // test ne prouverait rien de ce qu'il annonce.
      expect(html).toBeDefined();
      expect(html).toContain('class="line ancre-ligne-1" class="line ancre-ligne-2"');

      // Et pourtant les ancres relevées restent la suite des VRAIES lignes : le leurre en
      // cite trois, l'extrait en compte cinq (la ligne du leurre comprise, plus la ligne
      // vide finale de Shiki), et aucune ne se répète. On lit l'ARBRE, où le texte d'un
      // `<span>` ne peut pas fabriquer un `<span>` (Shiki échappe « < »).
      const ancres = ancresDe(html ?? '');
      expect(ancres).toEqual([1, 2, 3, 4, 5]);
      // `DELAI` explicite, pour la raison DÉJÀ écrite au test précédent : ce cas lance un
      // processus fils qui importe le compilateur, donc Shiki, Ajv et markdown-it. Les 5 s par
      // défaut de Vitest ne suffisent pas sous la suite complète — l'oubli s'est vu à
      // E2-ST5 (lot a), quand la même suite a gagné quelques compilations de plus, et
      // l'échec ressemblait à une régression du garde-fou (L-035).
    }, DELAI);

    it("n'émet AUCUN attribut style= dans le HTML coloré", () => {
      for (const html of htmlColores(lecon)) {
        expect(html.match(/\sstyle\s*=/gi) ?? []).toEqual([]);
        expect(html.match(/<style[\s>]/gi) ?? []).toEqual([]);
      }
    });

    it('ne pose AUCUN `tabindex` sur le `<pre>` — un seul arrêt de tabulation par bloc', () => {
      // 🔴 LA RÉGRESSION QUE CE TEST FERME (revue du 2026-08-18, lot B). Shiki pose
      // `tabindex="0"` sur son `<pre>`. C'était juste tant que `overflow-x: auto` vivait
      // sur `.shiki` (WCAG 2.1.1 : une région qui défile s'atteint au clavier) ; le lot B2
      // a remonté le défilement dans `div.defileur` du gabarit, et ce `tabindex` est devenu
      // un arrêt MORT — atteignable, sans nom, sans rôle, sans effet. Mesuré dans l'artéfact
      // prerendu de la leçon-témoin : 16 arrêts pour 8 blocs de code, dont 8 muets.
      // ⚠️ AUCUN GATE NE LE VOYAIT : `focus-order-semantics` est désactivée par défaut chez
      // axe, `scrollable-region-focusable` l'est dans `tools/a11y/verifier-axe.mjs`.
      // Ici on mesure la sortie RÉELLE du compilateur ; le pendant côté rendu vit dans
      // `rendu-blocs.spec.ts`, et le pendant côté DOM dans `sonde-sanitizer-shiki.spec.ts`.
      const fragments = htmlColores(lecon);
      expect(fragments.length).toBeGreaterThan(0); // contrôle positif (L-019)
      for (const html of fragments) {
        const porteur = document.createElement('div');
        porteur.innerHTML = html;
        // Contrôle positif par fragment : il y a bien un `<pre>` à interroger.
        expect(porteur.querySelector('pre.shiki')).not.toBeNull();
        expect(porteur.querySelectorAll('[tabindex]')).toHaveLength(0);
      }
    });

    it('définit dans la feuille générée TOUTES les classes que le HTML référence', () => {
      // Le pendant de l'assertion précédente : sortir la couleur en classes ne sert à rien si la
      // feuille qui les définit n'est pas écrite. Une classe manquante ne lève aucune erreur — le
      // texte s'affiche simplement sans couleur, ce qu'aucun gate ne remarquerait.
      const utilisees = new Set(
        htmlColores(lecon)
          .flatMap((html) => [...html.matchAll(/class="([^"]*)"/g)])
          .flatMap((trouve) => (trouve[1] ?? '').split(/\s+/).filter((c) => c.startsWith('clr-'))),
      );
      expect(utilisees.size).toBeGreaterThan(0);
      expect([...utilisees].filter((classe) => !feuille.includes(`.${classe}{`))).toEqual([]);
    });

    it('n’impose AUCUN `overflow-x` sur `.shiki` — le défileur vit dans le GABARIT', () => {
      // 🔴 E2-ST4, lot B2. Tant que `assemblerFeuille` posait `overflow-x: auto` sur
      // `.shiki`, la région défilante ÉTAIT le HTML injecté par `[innerHTML]` : sans nom
      // accessible, et impossible à en doter (le `id` d'un `aria-labelledby` y est effacé
      // par le sanitizer — `src/sonde-sanitizer-shiki.spec.ts`). Elle est désormais
      // l'enveloppe `.defileur` de `rendu-blocs.ts`, qui porte `tabindex="0"` et un
      // `aria-label`. Le remettre ici imbriquerait DEUX défileurs, et celui du gabarit
      // n'aurait plus rien à faire défiler — sans qu'aucun gate ne rougisse, la règle axe
      // `scrollable-region-focusable` étant désactivée (jsdom ne calcule pas le débordement).
      // Les commentaires sont retirés AVANT la mesure : la feuille en porte un qui NOMME
      // la propriété bannie (c'est sa raison d'être). Le mot y est une explication ; ce
      // qu'on interdit est une DÉCLARATION.
      const regles = feuille.replaceAll(/^[ \t]*\/\/.*$/gm, '');
      expect(regles).toContain('.shiki {'); // contrôle positif : la règle existe bien
      expect(regles).not.toMatch(/overflow/);
    });

    it('ANCRE — la ligne FANTÔME est bien VIDE, ce que la feuille globale suppose', () => {
      // `src/styles/_code.scss` masque la dernière ligne par `span.line:last-child:empty`.
      // Ce sélecteur deviendrait MUET — donc un numéro devant du vide, en silence — le jour
      // où Shiki y mettrait quoi que ce soit. On le mesure sur un extrait RÉELLEMENT compilé
      // plutôt que sur la promesse de `types.d.ts`.
      const bloc = tousLesBlocs(lecon.sections).find((b) => b.type === 'code');
      const porteur = document.createElement('div');
      porteur.innerHTML = bloc?.htmlColore ?? '';
      const lignes = [...porteur.querySelectorAll('pre.shiki > code > span.line')];

      expect(lignes).toHaveLength(4); // 3 lignes de source + la fantôme
      const fantome = lignes[lignes.length - 1];
      expect(fantome?.matches(':empty')).toBe(true);
      // Contrôle positif : les lignes de code, elles, ne sont PAS vides — sans quoi
      // « la dernière est vide » serait vrai d'un extrait entièrement vide.
      expect(lignes.slice(0, -1).every((ligne) => !ligne.matches(':empty'))).toBe(true);
    });

    it('efface les marqueurs « à-vérifier » de la source — sur une leçon NON publiée', () => {
      // Contrôle positif d'abord : la fixture DOIT porter le marqueur. Son statut est
      // « brouillon », donc le validateur le tolère — c'est très exactement le cas où le
      // compilateur doit l'effacer, et celui que la v1 du plan avait perdu.
      const source = readFileSync(join(FIXTURE_TEMOIN, '01-temoin', 'lecon.md'), 'utf8');
      expect(source).toContain('<!-- à-vérifier:');
      expect(lecon.frontmatter['statut']).toBe('brouillon');

      // ⚠️ LA PORTÉE EST `sections`, PAS LA LEÇON ENTIÈRE — et c'est la portée EXACTE de
      // la garantie, pas un rabotage de commodité. Le marqueur est un COMMENTAIRE HTML du
      // Markdown : `html: false` l'échappe au lieu de l'effacer, d'où le retrait explicite
      // et ce contrôle. `quiz.json` ne traverse ni markdown-it ni cet échappement — JSON
      // n'a pas de commentaires, donc la chaîne « à-vérifier » n'y est jamais un doute qui
      // fuit, seulement une DONNÉE. La question `vrai-faux` du témoin la cite d'ailleurs
      // dans son affirmation, exprès. Élargir l'assertion au quiz interdirait à une leçon
      // de parler du marqueur — et le compilateur a la même portée (`JSON.stringify(sections)`).
      const rendu = JSON.stringify(lecon.sections);
      expect(rendu).not.toContain('à-vérifier');
      expect(rendu).not.toContain('<!--');
      expect(rendu).not.toContain('&lt;!--');
    });

    it('donne à chaque section une ancre kebab-case unique', () => {
      const ancres = lecon.sections.map((section) => section.ancre);
      expect(ancres.length).toBeGreaterThan(1);
      expect(new Set(ancres).size).toBe(ancres.length);
      for (const ancre of ancres) expect(ancre).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      for (const section of lecon.sections) expect([2, 3]).toContain(section.niveau);
    });
  });

  describe('fail-closed', () => {
    /**
     * @returns le message d'erreur du processus fils, ou `null` s'il a réussi — un `null` doit
     *   faire rougir l'appelant : un garde-fou qui laisse passer est un garde-fou absent.
     */
    function messageDEchec(racine: string): string | null {
      try {
        compiler(racine, join(bacASable, 'jetable.scss'));
        return null;
      } catch (erreur) {
        const echec = erreur as { status?: number; stderr?: string };
        expect(echec.status).not.toBe(0);
        return echec.stderr ?? '';
      }
    }

    it(
      'refuse un conteneur hors de la liste fermée, en le nommant',
      () => {
        const message = messageDEchec(FIXTURE_CONTENEUR_INCONNU);
        expect(message).not.toBeNull();
        expect(message).toContain('conteneur inconnu');
        expect(message).toContain('astuce');
      },
      DELAI,
    );

    it(
      'refuse un bloc de code dont la langue est hors du contrat',
      () => {
        // Écrit à la volée : le contrat `Langage` est une liste fermée de six valeurs, et une leçon
        // qui en emploie une septième ne serait pas colorée — E2-ST4 ne saurait pas la rendre.
        // ⚠️ LE `quiz.json` EST RECOPIÉ, et ce n'est pas décoratif : depuis E2-ST3 il est
        // OBLIGATOIRE. Sans lui, ce cas rougirait toujours — mais sur l'absence du quiz, donc
        // en cessant de mesurer ce qu'il prétend mesurer (cousin de L-010 : une mutation doit
        // frapper SA cible, et une seule).
        const source = readFileSync(join(FIXTURE_TEMOIN, '01-temoin', 'lecon.md'), 'utf8');
        const frontmatter = source.slice(0, source.indexOf('---', 4) + 4);
        const racine = leconAdHoc(
          'langue-inconnue',
          () => `${frontmatter}\n# Titre\n\n## Une section\n\n\`\`\`brainfuck\n+++\n\`\`\`\n`,
        );

        const message = messageDEchec(racine);
        expect(message).not.toBeNull();
        expect(message).toContain('brainfuck');
      },
      DELAI,
    );

    // ─── Le quiz, émis par le compilateur depuis E2-ST3 (lot B) ────────────────────
    // Chaque cas isole UNE cause, et mute le fichier qui la porte. La leçon-témoin,
    // elle, compile — c'est le groupe précédent qui l'établit, donc la mutation est
    // bien la seule cause de l'échec constaté ici.

    it(
      'refuse une leçon dont le `quiz.json` est ABSENT, en nommant le fichier',
      () => {
        const racine = leconAdHoc('quiz-absent', undefined, null);
        const message = messageDEchec(racine);
        expect(message).not.toBeNull();
        expect(message).toContain('quiz.json');
        expect(message).toContain('obligatoire');
      },
      DELAI,
    );

    it(
      'refuse un quiz apparié à une AUTRE leçon, en nommant les deux valeurs',
      () => {
        const racine = leconAdHoc('quiz-mal-apparie', undefined, (quiz) => {
          // La mutation a-t-elle une cible ? (L-010) Le quiz d'origine désigne bien
          // « temoin » — sans quoi ce test mesurerait l'inertie du compilateur.
          expect(quiz['lecon']).toBe('temoin');
          quiz['lecon'] = 'une-autre-lecon';
        });
        const message = messageDEchec(racine);
        expect(message).not.toBeNull();
        expect(message).toContain('une-autre-lecon');
        expect(message).toMatch(/frontmatter d.clare .*temoin/);
      },
      DELAI,
    );

    it(
      "refuse une leçon dont le corps a PERDU son ancre « [[quiz]] »",
      () => {
        // Le mode d'échec que ce cas ferme est le plus coûteux du lot : la leçon compile, se
        // prerend, se publie — et son quiz n'est NULLE PART sur la page. Aucun gate ne rougit,
        // parce qu'il n'y a rien de malformé : il y a de la donnée livrée et jamais rendue.
        let vue = false;
        const racine = leconAdHoc('quiz-sans-ancre', (source) => {
          // L-010 : la mutation doit frapper SA cible. Sans ce constat, une leçon-témoin qui
          // aurait perdu son ancre en amont rendrait ce test vert pour la mauvaise raison.
          vue = source.includes('[[quiz]]');
          return source.replace('[[quiz]]', '');
        });
        expect(vue).toBe(true);

        const message = messageDEchec(racine);
        expect(message).not.toBeNull();
        expect(message).toContain('[[quiz]]');
        expect(message).toContain('0 ancre');
      },
      DELAI,
    );

    it(
      'refuse une SECONDE ancre « [[quiz]] » cachée dans un encadré',
      () => {
        // 🔴 LE DÉFAUT QUE CE CAS FERME (relevé au lot C). Le compte d'ancres se
        // faisait sur `sections.flatMap(s => s.blocs)`, donc sur le PREMIER NIVEAU
        // seulement — alors que `construireBlocs` descend dans les encadrés. Une
        // leçon portant l'ancre au premier niveau ET une seconde dans un `::: note`
        // comptait 1, passait le contrôle, et le composant rendait le quiz DEUX
        // fois : `id` de questions dupliqués dans le document (`PREFIXE_ID_QUESTION`),
        // c'est-à-dire très exactement ce que ce contrôle promet d'empêcher.
        // La fermeture du premier conteneur `:::` du témoin. La tolérance au `\r` n'est
        // pas décorative : les fins de ligne de ce poste sont mixtes, et une mutation
        // ancrée sur un `\n` nu ne muterait RIEN en silence (L-015).
        const FERMETURE = /\r?\n:::\r?\n/;
        let vue = false;
        const racine = leconAdHoc('quiz-deux-ancres-dont-une-imbriquee', (source) => {
          // L-010 : la mutation doit frapper SA cible. Le témoin porte bien UN
          // `::: note`, sa fermeture, et UNE ancre de premier niveau — sans quoi ce
          // test mesurerait autre chose que la récursion du compte.
          vue = source.includes('::: note') && source.includes('[[quiz]]') &&
            FERMETURE.test(source);
          return source.replace(FERMETURE, '\n\n[[quiz]]\n:::\n');
        });
        expect(vue).toBe(true);

        const message = messageDEchec(racine);
        expect(message).not.toBeNull();
        expect(message).toContain('[[quiz]]');
        // Le compte doit être EXACT — « 1 » prouverait que la récursion n'a pas eu
        // lieu, et le cas serait vert sur l'ancienne implémentation.
        expect(message).toContain('2 ancre');
      },
      DELAI,
    );

    it(
      'refuse une question au schéma cassé, en citant le champ manquant',
      () => {
        const racine = leconAdHoc('quiz-question-cassee', undefined, (quiz) => {
          const questions = quiz['questions'] as Record<string, unknown>[];
          const premiere = questions[0];
          if (premiere === undefined) throw new Error('le quiz témoin est vide');
          expect(typeof premiere['explication']).toBe('string');
          delete premiere['explication'];
        });
        const message = messageDEchec(racine);
        expect(message).not.toBeNull();
        expect(message).toContain('quiz.json');
        expect(message).toContain('explication');
      },
      DELAI,
    );

    // ─── La PORTÉE des annotations (E2-ST4, lot A1) ───────────────────────────────
    // 🔴 POURQUOI CES CAS VIVENT ICI, ET NON SOUS `__fixtures__/invalides/`. Ce dossier-là est la
    // table câblée de `pipeline-contenu-validation.spec.ts`, dont le garde-fou de complétude exige
    // une assertion par dossier : y déposer un cas destiné au COMPILATEUR ferait rougir le spec du
    // VALIDATEUR pour une faute qui n'est pas la sienne (raison déjà écrite en tête de
    // `leconAdHoc`). Le contrôle positif tourne donc là où il MORD : `npm test`, c'est-à-dire
    // l'étape G-test de `ci.yml` et de `deploy.yml`.
    //
    // 🔴 ET POURQUOI CE CONTRÔLE EST AU COMPILATEUR. `ExempleCode` ne conserve pas le code brut :
    // passé cette étape, plus personne ne peut recompter les lignes de l'extrait. Avant ce lot,
    // `{lignes="42"}` sur un extrait de deux lignes sortait G-content VERT, et la leçon publiée
    // annonçait « Ligne 42 : » devant un bloc qui n'a pas de ligne 42.

    // ─── LA SYNTAXE À N NOTES PAR VOLET (E2-ST4, lot B1a) ─────────────────────────
    // La portée a QUITTÉ le conteneur : elle s'écrit en tête de CHAQUE paragraphe du volet, et
    // chaque paragraphe est une note distincte. Les cas ci-dessous exercent donc `lirePortee`
    // à travers `lireNote`, plus à travers un attribut de `::: vulnerable`.

    /**
     * Deux lignes de PHP, encadrées d'une comparaison complète, NOTES paramétrables.
     *
     * @param notes paragraphes du volet vulnérable, écrits tels quels (séparés par une ligne vide)
     */
    function comparaisonAvecNotes(notes: readonly string[]): string {
      return [
        ':::: comparaison',
        '::: vulnerable',
        '```php',
        '$a = 1;',
        '$b = 2;',
        '```',
        ...notes.flatMap((note, rang) => (rang === 0 ? [note] : ['', note])),
        ':::',
        '::: corrige',
        '```php',
        '$a = 1;',
        '$b = 2;',
        '```',
        '{lignes="0"} Le correctif.',
        ':::',
        '::::',
        '',
      ].join('\n');
    }

    /** Le cas courant : UNE note, dont seule la portée varie. */
    function comparaisonAvecPortee(portee: string): string {
      return comparaisonAvecNotes([`{lignes="${portee}"} La remarque mise à l’épreuve.`]);
    }

    /**
     * Insère la comparaison dans la leçon-témoin, juste avant « À toi de jouer ».
     *
     * L-010 : la mutation doit frapper SA cible. Sans le constat ci-dessous, un témoin dont le
     * titre de section aurait changé rendrait ces cas verts (ou rouges) pour la mauvaise raison.
     */
    function leconAvecCorps(nom: string, corps: string): string {
      let vue = false;
      const racine = leconAdHoc(nom, (source) => {
        vue = source.includes('## À toi de jouer');
        return source.replace('## À toi de jouer', `${corps}\n## À toi de jouer`);
      });
      expect(vue).toBe(true);
      return racine;
    }

    function leconAvecComparaison(nom: string, portee: string): string {
      return leconAvecCorps(nom, comparaisonAvecPortee(portee));
    }

    /** Les annotations du volet VULNÉRABLE de la première comparaison compilée. */
    function annotationsVulnerables(racine: string, nom: string): AnnotationLue[] {
      const resultat = compiler(racine, join(bacASable, `${nom}.scss`));
      const comparaison = tousLesBlocs(resultat.lecons[0]?.sections ?? []).find(
        (bloc) => bloc.type === 'comparaison',
      );
      return comparaison?.exemples?.[0]?.vulnerable.annotations ?? [];
    }

    it(
      'fait DEUX annotations de deux paragraphes, dans l’ordre du document',
      () => {
        // 🔴 LE CŒUR DU LOT B1a. Jusqu'ici, `lireExemple` JOIGNAIT toute la prose d'un volet
        // (`.join(' ')`) et n'en poussait qu'UNE annotation : le type promettait N, le compilateur
        // n'en produisait jamais deux. Rétablir ce `.join(' ')` doit rougir ICI.
        const racine = leconAvecCorps(
          'notes-multiples',
          comparaisonAvecNotes([
            '{lignes="0"} Ce que le volet montre dans son ensemble.',
            '{lignes="2"} Et ce que fait précisément la seconde ligne.',
          ]),
        );

        const annotations = annotationsVulnerables(racine, 'notes-multiples');
        expect(annotations).toHaveLength(2);
        expect(annotations[0]?.lignes).toEqual([0]);
        expect(annotations[1]?.lignes).toEqual([2]);
        // Les TEXTES sont distincts et débarrassés de leur portée : une note qui republierait
        // « {lignes="2"} » en clair afficherait la syntaxe à l'apprenant.
        expect(annotations[0]?.texte).toBe('Ce que le volet montre dans son ensemble.');
        expect(annotations[1]?.texte).toBe('Et ce que fait précisément la seconde ligne.');
      },
      DELAI,
    );

    it(
      'admet DEUX notes sur la MÊME ligne — deux remarques distinctes, aucun dédoublonnage',
      () => {
        const racine = leconAvecCorps(
          'notes-meme-ligne',
          comparaisonAvecNotes([
            '{lignes="1"} La première remarque sur cette ligne.',
            '{lignes="1"} La seconde, qui dit autre chose.',
          ]),
        );

        const annotations = annotationsVulnerables(racine, 'notes-meme-ligne');
        expect(annotations).toHaveLength(2);
        expect(annotations.map((note) => note.lignes)).toEqual([[1], [1]]);
      },
      DELAI,
    );

    it(
      'laisse LITTÉRAL un {lignes="…"} cité au milieu d’une note, sans le lire comme portée',
      () => {
        // 🔴 ANTI-S-014 — la quatrième récidive de la famille S-001/S-003/S-009 a été payée au lot
        // A2 : un garde-fou dont l'ENTRÉE peut fabriquer la preuve qu'il exige n'est pas un
        // garde-fou. Ici, l'entrée est la prose de l'auteur, et une leçon qui ENSEIGNE cette
        // syntaxe la citera forcément. Un balayage de `jeton.content` à la recherche du motif
        // lirait « 9 » — une ligne qui n'existe pas dans un extrait de deux lignes — ou pire,
        // une ligne existante mais autre que celle voulue, EN SILENCE.
        const racine = leconAvecCorps(
          'note-citant-la-syntaxe',
          comparaisonAvecNotes([
            '{lignes="1"} Ne jamais écrire {lignes="9"} au milieu d’une phrase : la portée se lit ' +
              'en tête de paragraphe, et {lignes="0"} ici n’en est pas une.',
          ]),
        );

        const annotations = annotationsVulnerables(racine, 'note-citant-la-syntaxe');
        expect(annotations).toHaveLength(1);
        // La portée est celle de la TÊTE, jamais une des deux citées ensuite.
        expect(annotations[0]?.lignes).toEqual([1]);
        // Et les citations survivent telles quelles dans le texte publié.
        expect(annotations[0]?.texte).toContain('{lignes="9"}');
        expect(annotations[0]?.texte).toContain('{lignes="0"}');
        expect(annotations[0]?.texte.startsWith('Ne jamais écrire')).toBe(true);

        // L'AUTRE MOITIÉ DE LA PINCE, et la seule qui mord vraiment : un paragraphe SANS portée
        // en tête, mais qui en CITE une. Un balayage non ancré la trouverait et se déclarerait
        // satisfait — l'entrée aurait fabriqué la preuve exigée. Il doit être REFUSÉ.
        const citante = leconAvecCorps(
          'note-sans-portee-mais-citante',
          comparaisonAvecNotes(['Une note qui parle de {lignes="2"} sans en porter en tête.']),
        );
        const message = messageDEchec(citante);
        expect(message).not.toBeNull();
        expect(message).toContain("n'ouvre pas par");
      },
      DELAI,
    );

    it(
      'refuse un paragraphe qui n’ouvre pas par {lignes="…"}, en citant la note',
      () => {
        const racine = leconAvecCorps(
          'note-sans-portee',
          comparaisonAvecNotes(['Une remarque écrite à l’ancienne, sans portée en tête.']),
        );
        const message = messageDEchec(racine);
        expect(message).not.toBeNull();
        expect(message).toContain('lecon.md');
        expect(message).toContain("n'ouvre pas par");
        expect(message).toContain('Une remarque écrite à l’ancienne');
      },
      DELAI,
    );

    it(
      'refuse une portée en tête ILLISIBLE, sans la dégrader en portée par défaut',
      () => {
        // `{ligne="1"}` (singulier) : une coquille d'une lettre. Sans refus, elle deviendrait du
        // texte publié — la syntaxe elle-même affichée à l'apprenant.
        const racine = leconAvecCorps(
          'note-portee-illisible',
          comparaisonAvecNotes(['{ligne="1"} La coquille d’une seule lettre.']),
        );
        const message = messageDEchec(racine);
        expect(message).not.toBeNull();
        expect(message).toContain("n'ouvre pas par");
        expect(message).toContain('{ligne="1"}');
      },
      DELAI,
    );

    it(
      'refuse des notes DANS LE DÉSORDRE, plutôt que de retrier la prose de l’auteur',
      () => {
        // Trier à la place de l'auteur publierait un texte dans un ordre qu'il n'a pas écrit —
        // et un « corrige d'abord, explique ensuite » deviendrait l'inverse, sans un mot.
        const racine = leconAvecCorps(
          'notes-desordre',
          comparaisonAvecNotes([
            '{lignes="2"} La note de la seconde ligne, écrite en premier.',
            '{lignes="1"} Puis celle de la première.',
          ]),
        );
        const message = messageDEchec(racine);
        expect(message).not.toBeNull();
        expect(message).toContain('lecon.md');
        expect(message).toContain("ne suivent pas l'ordre des lignes");
        expect(message).toContain('« 2 » puis « 1 »');
      },
      DELAI,
    );

    it(
      'refuse {lignes="0"} placé APRÈS une note de ligne — le bloc entier se présente en tête',
      () => {
        const racine = leconAvecCorps(
          'note-zero-en-queue',
          comparaisonAvecNotes([
            '{lignes="1"} La note de la première ligne.',
            '{lignes="0"} Et le propos général, relégué à la fin.',
          ]),
        );
        const message = messageDEchec(racine);
        expect(message).not.toBeNull();
        expect(message).toContain("ne suivent pas l'ordre des lignes");
      },
      DELAI,
    );

    it(
      'refuse l’ANCIENNE écriture « ::: vulnerable {lignes="2"} », en nommant la clef',
      () => {
        // La migration doit se VOIR : `lignes` a quitté la liste fermée des attributs du
        // conteneur, et cette liste refuse toute clef inconnue. Sans ce refus, une leçon écrite
        // à l'ancienne compilerait avec sa portée SILENCIEUSEMENT PERDUE — le volet publié
        // n'annoncerait plus aucune ligne, tous gates verts.
        const racine = leconAvecCorps(
          'ancienne-ecriture',
          comparaisonAvecNotes(['{lignes="2"} La remarque.']).replace(
            '::: vulnerable',
            '::: vulnerable {lignes="2"}',
          ),
        );
        const message = messageDEchec(racine);
        expect(message).not.toBeNull();
        expect(message).toContain('lecon.md');
        expect(message).toContain('« lignes » inconnu');
        expect(message).toContain('::: vulnerable');
      },
      DELAI,
    );

    it(
      'accepte une portée MULTIPLE, et en fait UNE annotation à deux lignes — pas deux notes',
      () => {
        // LE CONTRÔLE POSITIF, et l'autre moitié de la pince : sans lui, tous les refus qui
        // suivent seraient compatibles avec un compilateur qui refuserait TOUTE portée.
        // Le second défaut du lot est ici : `{lignes="1,2"}` poussait auparavant le MÊME `texte`
        // DEUX fois, donc la même phrase répétée sous deux étiquettes dans la leçon publiée.
        const racine = leconAvecComparaison('portee-multiple', '1,2');
        const resultat = compiler(racine, join(bacASable, 'portee-multiple.scss'));
        const comparaison = tousLesBlocs(resultat.lecons[0]?.sections ?? []).find(
          (bloc) => bloc.type === 'comparaison',
        );

        const annotations = comparaison?.exemples?.[0]?.vulnerable.annotations ?? [];
        expect(annotations).toHaveLength(1);
        expect(annotations[0]?.lignes).toEqual([1, 2]);
        // Et le volet non annoté n'hérite de rien.
        expect(comparaison?.exemples?.[0]?.corrige.annotations).toHaveLength(1);
      },
      DELAI,
    );

    it(
      'refuse une portée AU-DELÀ de l’extrait, en nommant le fichier, la valeur et le compte',
      () => {
        const racine = leconAvecComparaison('portee-hors-bornes', '3');
        const message = messageDEchec(racine);
        expect(message).not.toBeNull();
        // NOMMER LE FICHIER est le point : la dette du lot D d'E2-ST3 était exactement un refus
        // qui laissait le lecteur chercher lui-même la leçon en cause.
        expect(message).toContain('lecon.md');
        expect(message).toContain('lignes="3"');
        expect(message).toContain('désigne la ligne 3');
        expect(message).toContain("n'en compte que 2");
      },
      DELAI,
    );

    it(
      'refuse les cinq autres formes de portée hors contrat, chacune sur SA cause',
      () => {
        const cas: readonly { nom: string; portee: string; cause: RegExp }[] = [
          // `Number('')` vaut 0 : l'ancien contrôle transformait cette coquille en « annotation
          // sur le bloc entier », silencieusement.
          { nom: 'portee-vide', portee: '1,,2', cause: /porte une valeur VIDE/ },
          { nom: 'portee-doublon', portee: '1,1', cause: /désigne deux fois la ligne 1/ },
          // 0 = le bloc ENTIER (convention d'E2-ST1) : le mêler à une ligne est contradictoire.
          { nom: 'portee-zero-melange', portee: '0,2', cause: /mêle 0 et des numéros de ligne/ },
          // 🔴 LES DEUX CAS CI-DESSOUS EXERCENT `!/^\d+$/`, QUE PERSONNE N'EXERÇAIT (constat de
          // revue du lot A1 ; cousin de L-019, un garde-fou sans contrôle positif est une
          // intention). Retirer cette regex laissait les vingt cas VERTS, alors que le JSDoc de
          // `lirePortee` annonce `-1`, `1.5`, `1e2` et `0x2` refusés.
          //   · `Number('0x2')` vaut 2 : la portée compilait EN SILENCE sur une autre ligne que
          //     celle écrite — le pire des trois modes d'échec, parce que rien ne rougit ;
          //   · `Number('-1')` vaut -1, et la borne d'existence ne l'attrape pas : `-1 > 2` est
          //     faux. Sans la regex, la leçon publiée annoncerait « Ligne -1 : ».
          { nom: 'portee-hexadecimale', portee: '0x2', cause: /« 0x2 » illisible/ },
          { nom: 'portee-negative', portee: '-1', cause: /« -1 » illisible/ },
        ];

        for (const { nom, portee, cause } of cas) {
          const message = messageDEchec(leconAvecComparaison(nom, portee));
          expect(message, nom).not.toBeNull();
          expect(message ?? '', nom).toMatch(cause);
        }
      },
      DELAI,
    );

    // ─── « ZÉRO STYLE EN LIGNE » — le garde-fou qui SUR-REFUSAIT (E2-ST4, lot B) ───
    // Cinquième récidive de la famille S-001/S-003/S-009/S-014, le sens du défaut en moins :
    // ici le motif ne laissait pas passer, il REFUSAIT à tort. Les deux tests ci-dessous sont
    // la pince — l'un prouve qu'on n'accuse plus le texte de l'auteur, l'autre qu'on refuse
    // toujours le balisage réel.

    it(
      'COMPILE un extrait dont le TEXTE contient `style="…"` — la leçon CSP doit pouvoir se publier',
      () => {
        // 🔴 LE CAS REPRODUIT EN REVUE. Le contrôle cherchait `/\sstyle\s*=/i` dans la CHAÎNE
        // HTML, laquelle contient le code de l'auteur échappé par Shiki. Cet extrait — celui
        // qu'une leçon XSS/CSP écrit naturellement — faisait donc échouer G-content sur un
        // diagnostic FAUX (« la coloration a produit du style en ligne »), sans parade
        // éditoriale possible : on ne met pas de guillemets typographiques dans du code.
        const racine = leconAvecCorps(
          'style-dans-le-texte',
          [
            ':::: comparaison',
            '::: vulnerable',
            '```php',
            '$html = \'<p style="color:red">\' . $_GET[\'n\'] . \'</p>\';',
            'echo $html;',
            '```',
            '{lignes="1"} Le style en ligne serait refusé par la CSP à hachages du site.',
            ':::',
            '::: corrige',
            '```php',
            '$html = \'<p class="alerte">\' . htmlspecialchars($_GET[\'n\']) . \'</p>\';',
            'echo $html;',
            '```',
            '{lignes="1"} La couleur passe par une classe, la donnée par un encodage.',
            ':::',
            '::::',
            '',
          ].join('\n'),
        );

        const resultat = compiler(racine, join(bacASable, 'style-dans-le-texte.scss'));
        const comparaison = tousLesBlocs(resultat.lecons[0]?.sections ?? []).find(
          (bloc) => bloc.type === 'comparaison',
        );
        // CONTRÔLE POSITIF : la compilation a bien vu l'extrait litigieux — sans quoi ce test
        // serait vert sur une leçon dont le `style="…"` aurait disparu (L-010).
        const html = comparaison?.exemples?.[0]?.vulnerable.htmlColore ?? '';
        // ⚠️ MESURÉ, PAS SUPPOSÉ : Shiki échappe « < » en `&#x3C;` et laisse les GUILLEMETS
        // BRUTS dans le texte. La chaîne contient donc littéralement ` style="color:red"`,
        // espace comprise — c'est-à-dire très exactement ce que l'ancien motif
        // `/\sstyle\s*=/i` cherchait. Le sur-refus n'était pas théorique.
        expect(html).toContain(' style="color:red"');
        // Et l'ATTRIBUT, lui, n'existe pas : le texte est du texte.
        const porteur = document.createElement('div');
        porteur.innerHTML = html;
        expect(porteur.querySelectorAll('[style]')).toHaveLength(0);
      },
      DELAI,
    );

    it(
      'REFUSE un `style=` réellement ÉMIS dans le balisage, en nommant le fichier',
      () => {
        // L-036 : le refus se prouve en appelant l'outil corrigé sur un HTML FORGÉ. Compiler
        // autour de lui mesurerait la lecture du spec, pas la capacité de refus.
        const attribut =
          '<pre class="shiki"><code><span class="line" style="color:#abb2bf">$a</span></code></pre>';
        const refusAttribut = appelerVerifierZeroStyle(attribut);
        expect(refusAttribut.statut).toBe(1);
        expect(refusAttribut.sortie).toContain('html-forgé.md');
        expect(refusAttribut.sortie).toContain('attribut style=');
        expect(refusAttribut.sortie).toContain('<span>');

        const balise = '<pre class="shiki"><style>.line{color:red}</style><code></code></pre>';
        const refusBalise = appelerVerifierZeroStyle(balise);
        expect(refusBalise.statut).toBe(1);
        expect(refusBalise.sortie).toContain('html-forgé.md');
        expect(refusBalise.sortie).toContain('élément <style>');

        // CONTRE-ÉPREUVE, et c'est elle qui distingue « il refuse » de « il refuse TOUT » :
        // le même balisage, avec `style="…"` dans le TEXTE échappé par Shiki, passe.
        const sain =
          '<pre class="shiki"><code><span class="line ancre-ligne-1">' +
          '&#x3C;p style="color:red">&#x3C;/p></span></code></pre>';
        expect(appelerVerifierZeroStyle(sain).statut).toBe(0);
      },
      DELAI,
    );

    // ─── UN VOLET N'AVALE PLUS LE BALISAGE DE L'AUTEUR (E2-ST4, lot B) ────────────
    // La boucle de `lireExemple` ne ramassait que les jetons `inline` et ignorait tout le
    // reste EN SILENCE. Deux conséquences, deux refus.

    it(
      'refuse une LISTE ou une CITATION dans un volet — leur balisage y était JETÉ en silence',
      () => {
        // 🔴 CE QUE ÇA PUBLIAIT : l'auteur écrit `- {lignes="2"} …`, markdown-it produit
        // `bullet_list_open` / `list_item_open` / `paragraph_open` / `inline` / … ; la boucle
        // ne gardait que l'`inline`, donc la note sortait en PROSE. L'auteur croyait publier
        // une liste, il publiait autre chose, tous gates verts.
        const cas: readonly { nom: string; note: string; jeton: string }[] = [
          { nom: 'volet-liste', note: '- {lignes="2"} Une note en item de liste.', jeton: 'list' },
          { nom: 'volet-citation', note: '> {lignes="2"} Une note en citation.', jeton: 'blockquote' },
        ];

        for (const { nom, note, jeton } of cas) {
          const racine = leconAvecCorps(nom, comparaisonAvecNotes([note]));
          const message = messageDEchec(racine);
          expect(message, nom).not.toBeNull();
          expect(message ?? '', nom).toContain('lecon.md');
          expect(message ?? '', nom).toContain('que du code et des paragraphes');
          // Le message NOMME ce qui a été rencontré — sans quoi l'auteur cherche à l'aveugle.
          expect(message ?? '', nom).toContain(jeton);
        }
      },
      DELAI,
    );

    it(
      'refuse une note écrite AVANT son bloc de code — le rendu la déplacerait après',
      () => {
        // La boucle ramassait TOUT jeton `inline`, quelle que soit sa position, et le gabarit
        // de `rendu-blocs.ts` place la `figure` PUIS la liste d'annotations : une note écrite
        // au-dessus de la clôture se retrouvait EN DESSOUS dans la page. Déplacer la prose de
        // l'auteur en silence est exactement ce que le refus du désordre existe pour empêcher.
        const corps = [
          ':::: comparaison',
          '::: vulnerable',
          '{lignes="1"} Une note écrite AVANT la clôture.',
          '',
          '```php',
          '$a = 1;',
          '$b = 2;',
          '```',
          ':::',
          '::: corrige',
          '```php',
          '$a = 1;',
          '$b = 2;',
          '```',
          '{lignes="0"} Le correctif.',
          ':::',
          '::::',
          '',
        ].join('\n');

        const message = messageDEchec(leconAvecCorps('note-avant-code', corps));
        expect(message).not.toBeNull();
        expect(message).toContain('lecon.md');
        expect(message).toContain('AVANT son bloc de code');
        expect(message).toContain('Une note écrite AVANT la clôture.');
      },
      DELAI,
    );

    // ═══ LA SIMULATION ET SON ANCRE (E2-ST5, lot a) ═════════════════════════════════════════
    // 🔴 POURQUOI CES CAS VIVENT ICI, ET NON SOUS `__fixtures__/invalides/`. Raison déjà écrite
    // deux fois dans ce fichier (en tête de `leconAdHoc`, et au-dessus des cas de portée) :
    // `__fixtures__/invalides/` est la table CÂBLÉE de `pipeline-contenu-validation.spec.ts`,
    // dont le garde-fou de complétude exige une assertion par dossier ET dont le compte de cas
    // est écrit en dur. Y déposer un cas destiné au COMPILATEUR ferait rougir le spec du
    // VALIDATEUR pour une faute qui n'est pas la sienne — `valider.mjs` ne lit aucune ancre et
    // ACCEPTERAIT les quatre cas ci-dessous. Le contrôle positif tourne donc là où il MORD :
    // `npm test`, c'est-à-dire l'étape G-test de `ci.yml` et de `deploy.yml`.
    describe('la simulation et son ancre', () => {
      /**
       * Une simulation VALIDE, reprise de la leçon-témoin complète — donc du seul
       * `simulation.json` réel du dépôt — et réappariée au slug de la témoin minimale.
       *
       * On la lit sur disque plutôt que de la retaper : une simulation écrite à la main dans ce
       * spec dériverait du schéma sans que rien ne le dise, et les cas d'échec ci-dessous
       * rougiraient alors sur la MAUVAISE cause (L-035).
       */
      function simulationValide(): Record<string, unknown> {
        const source = JSON.parse(
          readFileSync(
            join(
              'tools/content-pipeline/__fixtures__/temoin/cours/securite-web/01-lecon-temoin',
              'simulation.json',
            ),
            'utf8',
          ),
        ) as Record<string, unknown>;
        // L-010 : la mutation doit frapper SA cible. Sans ce constat, un jour où la témoin
        // complète changerait de slug, l'appariement se ferait au petit bonheur.
        expect(source['lecon']).toBe('lecon-temoin');
        source['lecon'] = 'temoin';
        return source;
      }

      /**
       * La fin de ligne RÉELLE du fichier lu.
       *
       * ⚠️ L-015 : les fichiers de ce dépôt sont en CRLF sur ce poste. Une insertion écrite en
       * `\n` en dur produirait un corps aux fins de ligne mêlées, et un repère cherché en
       * `'\n[[quiz]]\n'` ne s'apparierait à RIEN — une prémisse de test fausse qui rougit sur
       * un produit sain (L-035). Mesuré ici plutôt que supposé.
       */
      function finDeLigne(source: string): string {
        return source.includes('\r\n') ? '\r\n' : '\n';
      }

      /** Insère `[[simulation]]` juste après l'ancre `[[quiz]]` du corps, `combien` fois. */
      function corpsAvecAncres(combien: number): (source: string) => string {
        return (source) => {
          // L-010, encore : le témoin doit vraiment porter l'ancre qu'on prend pour repère.
          expect(source).toContain('[[quiz]]');
          const eol = finDeLigne(source);
          const ajout = Array.from(
            { length: combien },
            () => `${eol}${eol}[[simulation]]`,
          ).join('');
          return source.replace('[[quiz]]', `[[quiz]]${ajout}`);
        };
      }

      it(
        'ÉMET la simulation, fidèle à la source, quand le fichier ET l’ancre sont là',
        () => {
          const source = simulationValide();
          const racine = leconAdHoc('simulation-emise', corpsAvecAncres(1), undefined, source);
          const resultat = compiler(racine, join(bacASable, 'simulation-emise.scss'));
          const lecon = resultat.lecons[0];
          expect(lecon).toBeDefined();

          // FIDÈLE : rien n'est ajouté (aucun `htmlColore` inventé sur le `code` d'un panneau),
          // rien n'est retiré (pas d'équivalent de `ficheSource` ici). L'égalité PROFONDE est
          // l'assertion, pas un échantillon de champs — c'est elle qui attrape un champ perdu.
          expect(lecon?.simulation).toEqual(source);

          // Et le corps porte bien le bloc où le composant du lot b viendra se brancher :
          // sans cette assertion, « la simulation est émise » serait vrai d'une page qui ne
          // l'affiche nulle part, c'est-à-dire du défaut même que ce lot ferme.
          const ancres = tousLesBlocs(lecon?.sections ?? []).filter(
            (bloc) => bloc.type === 'ancre-simulation',
          );
          expect(ancres).toHaveLength(1);
        },
        DELAI,
      );

      it(
        'n’INVENTE aucune simulation quand la leçon n’en porte pas',
        () => {
          // L'autre moitié de la pince : le champ est OPTIONNEL, et son absence doit rester une
          // absence — pas un objet vide que le composant du lot b aurait à distinguer.
          const racine = leconAdHoc('simulation-absente');
          const resultat = compiler(racine, join(bacASable, 'simulation-absente.scss'));
          const lecon = resultat.lecons[0];
          expect(lecon).toBeDefined();
          expect(lecon?.simulation).toBeUndefined();
          expect(JSON.stringify(lecon)).not.toContain('"simulation"');
        },
        DELAI,
      );

      it(
        'REFUSE une ancre « [[simulation]] » sans simulation.json — l’ancre orpheline',
        () => {
          // Le cas qui compilait AVANT ce lot, et rendait un trou silencieux dans la page.
          const racine = leconAdHoc('simulation-ancre-orpheline', corpsAvecAncres(1));
          const message = messageDEchec(racine);
          expect(message).not.toBeNull();
          expect(message).toContain('lecon.md');
          expect(message).toContain('[[simulation]]');
          expect(message).toContain('1 ancre(s)');
          expect(message).toContain('0 attendue(s)');
          expect(message).toContain('aucun « simulation.json »');
        },
        DELAI,
      );

      it(
        'REFUSE un simulation.json sans ancre — de la donnée livrée, affichée nulle part',
        () => {
          const racine = leconAdHoc(
            'simulation-sans-ancre',
            undefined,
            undefined,
            simulationValide(),
          );
          const message = messageDEchec(racine);
          expect(message).not.toBeNull();
          expect(message).toContain('lecon.md');
          expect(message).toContain('0 ancre(s)');
          expect(message).toContain('1 attendue(s)');
          expect(message).toContain('ne s’afficherait nulle part');
        },
        DELAI,
      );

      it(
        'REFUSE DEUX ancres « [[simulation]] » — la simulation rendue deux fois',
        () => {
          const racine = leconAdHoc(
            'simulation-deux-ancres',
            corpsAvecAncres(2),
            undefined,
            simulationValide(),
          );
          const message = messageDEchec(racine);
          expect(message).not.toBeNull();
          expect(message).toContain('2 ancre(s)');
          expect(message).toContain('1 attendue(s)');
          expect(message).toContain('id » d’étape dupliqués');
        },
        DELAI,
      );

      it(
        'REFUSE une SECONDE ancre cachée dans un encadré — le cas qui EXIGE la récursion',
        () => {
          // 🔴 LE TEST DE MUTATION DU LOT, ET IL EST À UN DÉCALAGE NON NEUTRE (L-039).
          // La leçon porte UNE ancre de premier niveau ET une seconde dans un `::: note`,
          // avec un `simulation.json` — donc UNE ancre attendue.
          //   · récursion PRÉSENTE  → compte 2 ≠ 1 → REFUS, et ce test passe ;
          //   · récursion RETIRÉE   → compte 1 = 1 → la leçon est ACCEPTÉE, ce test rougit.
          // Le point à ne pas manquer : si la même leçon n'avait PAS de `simulation.json`
          // (0 attendue), les deux versions refuseraient — 2 ≠ 0 comme 1 ≠ 0 — et un test qui
          // se contenterait d'exiger un refus serait vert PAR COMPENSATION, exactement le
          // défaut que L-039 a payé au lot C. C'est la présence du fichier qui rend la valeur
          // non neutre, et le compte EXACT ci-dessous qui le constate.
          let vue = false;
          const racine = leconAdHoc(
            'simulation-ancre-en-encadre',
            (source) => {
              vue = source.includes('::: note') && source.includes('[[quiz]]');
              const eol = finDeLigne(source);
              return corpsAvecAncres(1)(source).replace(
                '::: note',
                `::: note${eol}${eol}[[simulation]]${eol}`,
              );
            },
            undefined,
            simulationValide(),
          );
          expect(vue).toBe(true);

          const message = messageDEchec(racine);
          expect(message).not.toBeNull();
          // Le compte doit être EXACT : « 1 » prouverait que la récursion n'a pas eu lieu.
          expect(message).toContain('2 ancre(s)');
          expect(message).toContain('1 attendue(s)');
        },
        DELAI,
      );

      it(
        'REFUSE une simulation appariée à une autre leçon, en citant les deux slugs',
        () => {
          // Le pendant exact du contrôle que `compilerQuiz` fait sur `quiz.lecon`. Une
          // simulation mal appariée s'attacherait en silence à la mauvaise leçon.
          const source = simulationValide();
          source['lecon'] = 'une-autre-lecon';
          const racine = leconAdHoc(
            'simulation-mal-appariee',
            corpsAvecAncres(1),
            undefined,
            source,
          );
          const message = messageDEchec(racine);
          expect(message).not.toBeNull();
          expect(message).toContain('simulation.json');
          expect(message).toContain('une-autre-lecon');
          // ⚠️ LE SLUG DE LA LEÇON S'ASSERTE SUR LA LIGNE DE DÉTAIL, PAS SUR « temoin » SEUL.
          // Le chemin du fichier fautif (`…/simulation-mal-appariee/01-temoin/simulation.json`)
          // contient déjà « temoin » : un `toContain('temoin')` resterait vert le jour où le
          // message cesserait de citer le frontmatter, alors que le titre de ce test affirme
          // qu'il cite LES DEUX slugs (L-040).
          expect(message).toContain('le frontmatter déclare « temoin »');
        },
        DELAI,
      );

      it(
        'REFUSE une simulation hors schéma, en citant le fichier et le champ',
        () => {
          // Le compilateur REVALIDE : il s'exécute aussi hors de `build.mjs` — cette ligne de
          // commande en est la preuve vivante — là où `valider.mjs` n'a pas tourné.
          const source = simulationValide();
          const etapes = source['etapes'] as Record<string, unknown>[];
          const premiere = etapes[0];
          if (premiere === undefined) throw new Error('la simulation témoin est vide');
          expect(typeof premiere['narration']).toBe('string');
          delete premiere['narration'];

          const racine = leconAdHoc(
            'simulation-hors-schema',
            corpsAvecAncres(1),
            undefined,
            source,
          );
          const message = messageDEchec(racine);
          expect(message).not.toBeNull();
          expect(message).toContain('simulation.json');
          expect(message).toContain('narration');
        },
        DELAI,
      );
    });
  });
});
