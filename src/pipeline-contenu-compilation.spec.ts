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
 */
function leconAdHoc(
  nom: string,
  corps?: (source: string) => string,
  quiz?: ((donnees: Record<string, unknown>) => void) | null,
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
    });

    it("n'émet AUCUN attribut style= dans le HTML coloré", () => {
      for (const html of htmlColores(lecon)) {
        expect(html.match(/\sstyle\s*=/gi) ?? []).toEqual([]);
        expect(html.match(/<style[\s>]/gi) ?? []).toEqual([]);
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

    /** Deux lignes de PHP, encadrées d'une comparaison complète, portée paramétrable. */
    function comparaisonAvecPortee(portee: string): string {
      return [
        ':::: comparaison',
        `::: vulnerable {lignes="${portee}"}`,
        '```php',
        '$a = 1;',
        '$b = 2;',
        '```',
        'La remarque qui porte la portée mise à l’épreuve.',
        ':::',
        '::: corrige',
        '```php',
        '$a = 1;',
        '$b = 2;',
        '```',
        'Le correctif.',
        ':::',
        '::::',
        '',
      ].join('\n');
    }

    /**
     * Insère la comparaison dans la leçon-témoin, juste avant « À toi de jouer ».
     *
     * L-010 : la mutation doit frapper SA cible. Sans le constat ci-dessous, un témoin dont le
     * titre de section aurait changé rendrait ces cas verts (ou rouges) pour la mauvaise raison.
     */
    function leconAvecComparaison(nom: string, portee: string): string {
      let vue = false;
      const racine = leconAdHoc(nom, (source) => {
        vue = source.includes('## À toi de jouer');
        return source.replace(
          '## À toi de jouer',
          `${comparaisonAvecPortee(portee)}\n## À toi de jouer`,
        );
      });
      expect(vue).toBe(true);
      return racine;
    }

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
  });
});
