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
    vulnerable: { htmlColore: string };
    corrige: { htmlColore: string };
  }[];
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
  });
});
