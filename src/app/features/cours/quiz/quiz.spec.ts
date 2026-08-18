// =============================================================================
// Tests du Quiz — E2-ST3, lot C
// -----------------------------------------------------------------------------
// CE QUE CE FICHIER TIENT, ET POURQUOI CHAQUE GROUPE A SON CONTRÔLE POSITIF.
//
//   · La FORME. Radios natives dans des `<fieldset>`/`<legend>`, aucun rôle ARIA
//     de remplacement, un `id` de document par question. Le contrôle positif est
//     qu'on a bien compté des radios : « aucun role=radiogroup » serait vrai d'un
//     composant qui ne rend rien (L-019).
//   · Le SCORE. Bonnes réponses sur questions CORRIGEABLES, une question sans
//     réponse comptant comme fausse — et le disant à l'écran.
//   · La PERSISTANCE. `enregistrerQuiz` est appelé sur un quiz entièrement
//     corrigeable, et ne l'est PAS dès qu'une question provisoire est là. Les deux
//     moitiés de la pince : sans la première, « rien n'est écrit » serait vrai d'un
//     composant qui n'écrit jamais.
//   · La VALIDATION. Les champs propres à chaque type lèvent en nommant la
//     question. C'est le pendant de `verifierEnveloppeDuQuiz` (`contenu-compile.ts`),
//     qui s'arrête, lui, à l'enveloppe.
//
// LES VALEURS ATTENDUES SONT ÉCRITES ICI, EN DUR — jamais importées du composant
// ni de `contenu-compile.ts` (L-012). Le préfixe `quiz-` est donc littéral
// ci-dessous : un test qui importe `PREFIXE_ID_QUESTION` pour le comparer à
// lui-même ne vérifie rien du contrat.
//
// LES FIXTURES SONT TYPÉES `QuizCompile` / `QuestionQuiz`, types AMBIANTS venus de
// `tools/content-pipeline/types.d.ts` : aucun `import`, aucune copie du contrat.
// =============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';

import { CLE_PROGRESSION, ProgressionService } from '../../../core/progression/progression';
import { Quiz } from './quiz';

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

const Q_CHOIX: QuestionQuiz = {
  type: 'choix-multiple',
  id: 'injection',
  question: 'Qu’est-ce qui ferme une injection SQL ?',
  choix: [
    { id: 'liste-noire', texte: 'Filtrer les apostrophes.' },
    { id: 'requete-preparee', texte: 'Séparer la structure de la donnée.' },
    { id: 'https', texte: 'Servir la page en HTTPS.' },
  ],
  bonneReponse: 'requete-preparee',
  explication:
    'Une requête préparée sépare la structure de la donnée. Le filtrage d’apostrophes est ' +
    'une liste noire, et HTTPS chiffre le transport sans rien changer à la requête.',
};

const Q_VRAI_FAUX: QuestionQuiz = {
  type: 'vrai-faux',
  id: 'csp',
  affirmation: 'Une CSP stricte remplace l’échappement en sortie.',
  bonneReponse: false,
  justification:
    'La CSP est une défense en profondeur : elle limite les dégâts d’une injection, elle ' +
    'n’empêche pas l’injection elle-même.',
};

const Q_AUTRE_CHOIX: QuestionQuiz = {
  type: 'choix-multiple',
  id: 'entetes',
  question: 'À quoi sert « X-Content-Type-Options: nosniff » ?',
  choix: [
    { id: 'sniff', texte: 'Empêcher le navigateur de deviner le type d’un fichier.' },
    { id: 'cache', texte: 'Désactiver le cache du navigateur.' },
  ],
  bonneReponse: 'sniff',
  explication: 'L’en-tête interdit la déduction de type, qui transforme une image en script.',
};

const Q_ASSOCIER: QuestionQuiz = {
  type: 'associer',
  id: 'paires',
  consigne: 'Associer chaque en-tête à son effet.',
  paires: [{ gauche: 'HSTS', droite: 'force HTTPS' }],
  explication: 'Chaque en-tête a un effet distinct.',
};

const Q_FAILLE: QuestionQuiz = {
  type: 'trouver-la-faille',
  id: 'faille-php',
  consigne: 'Repérer la ligne fautive.',
  langage: 'php',
  code: "$slug = $_GET['slug'];\n$sql = \"SELECT * FROM lecons WHERE slug = '$slug'\";",
  htmlColore: '<pre class="shiki"><code><span class="line">$slug</span></code></pre>',
  ligneFautive: 2,
  faille: 'Injection SQL par interpolation',
  explication: 'La ligne 2 insère la donnée du client dans le texte de la requête.',
  correction: "$pdo->prepare('… WHERE slug = :slug')",
};

/**
 * LA MÊME FORME, MAIS CHARGÉE POUR DE VRAI. Ce n'est pas un doublon de `Q_FAILLE` :
 * celui-là porte du SQL inoffensif à rendre, celui-ci porte les charges utiles qu'une
 * leçon sur le XSS écrira forcément un jour — `<script>`, `onerror=`, `style=`. Il
 * existe pour que la sûreté du rendu soit prouvée par le COMPORTEMENT du DOM, et non
 * par la seule absence des chaînes `innerHTML` / `bypassSecurityTrust*` dans la source :
 * ces deux assertions-là resteraient vertes si le gabarit passait un jour à une liaison
 * de HTML brut écrite autrement (une directive, un `[attr.…]`, un pipe).
 */
const Q_FAILLE_XSS: QuestionQuiz = {
  type: 'trouver-la-faille',
  id: 'faille-xss',
  consigne: 'Repérer la ligne qui rend la charge <img src=x onerror="alert(\'XSS\')">.',
  langage: 'php',
  code:
    "echo '<div style=\"color:red\">';\n" +
    'echo $_GET[\'avis\']; // <img src=x onerror="alert(\'XSS\')">\n' +
    "echo '</div><script>alert(1)</script>';",
  htmlColore: '<pre class="shiki"><code><span class="line">echo</span></code></pre>',
  ligneFautive: 2,
  faille: 'XSS reflété',
  explication: 'La ligne 2 recopie la donnée du client dans le HTML sans l’encoder.',
  correction: "echo htmlspecialchars($_GET['avis'], ENT_QUOTES, 'UTF-8');",
};

/** Trois questions, toutes corrigeables : le chemin où la progression S'ÉCRIT. */
const QUIZ_CORRIGEABLE: QuizCompile = {
  lecon: 'injection-sql',
  titre: 'Quiz — injection SQL',
  questions: [Q_CHOIX, Q_VRAI_FAUX, Q_AUTRE_CHOIX],
};

/** Trois corrigeables + les deux formes provisoires du lot D. */
const QUIZ_MIXTE: QuizCompile = {
  lecon: 'injection-sql',
  titre: 'Quiz — injection SQL et en-têtes',
  questions: [Q_CHOIX, Q_VRAI_FAUX, Q_AUTRE_CHOIX, Q_ASSOCIER, Q_FAILLE],
};

// -----------------------------------------------------------------------------
// Outillage
// -----------------------------------------------------------------------------

function fenetre(): Window {
  const vue = document.defaultView;
  if (vue === null) throw new Error('Aucune fenêtre : ces tests exigent un environnement DOM.');
  return vue;
}

let fixture: ComponentFixture<Quiz>;

async function monter(quiz: QuizCompile): Promise<HTMLElement> {
  fixture = TestBed.createComponent(Quiz);
  fixture.componentRef.setInput('quiz', quiz);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

/** Les radios d'une question, dans l'ordre du document. */
function radios(hote: HTMLElement, idQuestion: string): HTMLInputElement[] {
  return [...hote.querySelectorAll<HTMLInputElement>(`[id="${idQuestion}"] input[type="radio"]`)];
}

/** Coche une réponse comme le ferait un visiteur, puis laisse Angular réagir. */
async function repondre(hote: HTMLElement, idQuestion: string, valeur: string): Promise<void> {
  const cible = radios(hote, idQuestion).find((radio) => radio.value === valeur);
  if (cible === undefined) {
    throw new Error(`Aucune réponse « ${valeur} » dans la question « ${idQuestion} »`);
  }
  cible.click();
  await fixture.whenStable();
}

async function cliquerBouton(hote: HTMLElement): Promise<void> {
  const bouton = hote.querySelector<HTMLButtonElement>('button.bouton');
  if (bouton === null) throw new Error('aucun bouton de commande rendu');
  bouton.click();
  await fixture.whenStable();
}

function sourceDuComposant(): string {
  return readFileSync(
    join(process.cwd(), 'src', 'app', 'features', 'cours', 'quiz', 'quiz.ts'),
    'utf8',
  );
}

/** Construit un quiz d'UNE question, pour isoler un cas de validation. */
function quizDe(question: QuestionQuiz): QuizCompile {
  return { lecon: 'injection-sql', titre: 'Quiz', questions: [question] };
}

/** Monte sans attendre le rendu, et rend l'accès qui LÈVE si la question est hors contrat. */
function preparation(quiz: QuizCompile): () => unknown {
  const isole = TestBed.createComponent(Quiz);
  isole.componentRef.setInput('quiz', quiz);
  return () => isole.componentInstance.questionsPreparees();
}

// -----------------------------------------------------------------------------

describe('Quiz', () => {
  beforeEach(() => {
    fenetre().localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    fenetre().localStorage.clear();
    TestBed.resetTestingModule();
  });

  describe('forme — du natif, et rien que du natif', () => {
    it('rend un `<fieldset>` par question, sous le préfixe d’`id` du contrat', async () => {
      const hote = await monter(QUIZ_MIXTE);

      const groupes = hote.querySelectorAll('fieldset');
      // CONTRÔLE POSITIF (L-019) : sans lui, toutes les assertions de forme
      // ci-dessous seraient vraies d'un composant qui ne rend rien.
      expect(groupes.length).toBe(5);

      // Le préfixe est ÉCRIT ICI, pas importé (L-012). C'est lui qui empêche un
      // `id` de question de heurter une ancre de section — collision que
      // `lireLeconCompilee` refuse déjà, sur cette même chaîne.
      const identifiants = [...groupes].map((groupe) => groupe.id);
      expect(identifiants).toEqual([
        'quiz-injection',
        'quiz-csp',
        'quiz-entetes',
        'quiz-paires',
        'quiz-faille-php',
      ]);

      // Chaque groupe porte son nom accessible par un `<legend>` — pas par un
      // `aria-label` posé à côté.
      for (const groupe of groupes) {
        expect(groupe.querySelector('legend')?.textContent?.trim()).not.toBe('');
      }
    });

    it('n’emploie AUCUN rôle ARIA de remplacement — les radios sont natives', async () => {
      const hote = await monter(QUIZ_CORRIGEABLE);

      // Contrôle positif : il y a bien des radios à ne pas avoir déguisées.
      expect(hote.querySelectorAll('input[type="radio"]').length).toBe(7);
      for (const attendu of ['radio', 'radiogroup', 'group', 'button']) {
        expect(hote.querySelector(`[role="${attendu}"]`)).toBeNull();
      }

      // Un `name` par question : c'est LUI qui fait le groupe natif (une seule
      // tabulation pour entrer, flèches pour circuler, « 2 sur 3 » annoncé).
      const noms = new Set(
        [...hote.querySelectorAll<HTMLInputElement>('input[type="radio"]')].map(
          (radio) => radio.name,
        ),
      );
      expect([...noms].sort()).toEqual(['quiz-csp', 'quiz-entetes', 'quiz-injection']);
    });

    it('respecte l’ordre de la SOURCE — `melanger` n’est pas implémenté au lot C', async () => {
      // Mélanger côté client désaligne le DOM hydraté du DOM prerendu. Le champ est
      // ignoré, et ce test est ce qui empêche de l'implémenter par inadvertance.
      const hote = await monter({ ...QUIZ_MIXTE, melanger: true });
      const identifiants = [...hote.querySelectorAll('fieldset')].map((groupe) => groupe.id);
      expect(identifiants[0]).toBe('quiz-injection');
      expect(identifiants[4]).toBe('quiz-faille-php');
    });

    it('rend une région live PRÉSENTE ET VIDE avant toute correction', async () => {
      // Une région insérée en même temps que son texte n'est pas annoncée : elle doit
      // exister dès le premier rendu.
      const hote = await monter(QUIZ_CORRIGEABLE);
      const region = hote.querySelector('[role="status"]');
      expect(region).not.toBeNull();
      expect(region?.textContent?.trim()).toBe('');
      expect(region?.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('correction et score', () => {
    it('compte les bonnes réponses, et une question sans réponse comme FAUSSE', async () => {
      const hote = await monter(QUIZ_CORRIGEABLE);

      await repondre(hote, 'quiz-injection', 'requete-preparee'); // juste
      await repondre(hote, 'quiz-csp', 'vrai'); // faux (la bonne est « faux »)
      // « quiz-entetes » reste sans réponse.

      await cliquerBouton(hote);

      expect(fixture.componentInstance.score()).toBe(1);
      expect(fixture.componentInstance.total()).toBe(3);

      const resume = hote.querySelector('[role="status"]')?.textContent ?? '';
      expect(resume).toContain('1 bonne réponse sur 3 questions corrigées');
      // L'absence de réponse est DITE, pas silencieusement assimilée à une erreur.
      expect(resume).toContain('1 sans réponse');
    });

    it('écrit le verdict EN TOUTES LETTRES, jamais par la seule couleur', async () => {
      const hote = await monter(QUIZ_CORRIGEABLE);
      await repondre(hote, 'quiz-injection', 'requete-preparee');
      await repondre(hote, 'quiz-csp', 'vrai');
      await cliquerBouton(hote);

      // WCAG 1.4.1 : le mot est le canal principal ; `data-verdict` n'existe que
      // pour l'habillage, et le test le lit pour prouver que les deux concordent.
      const juste = hote.querySelector('[id="quiz-injection"] .verdict');
      expect(juste?.textContent).toContain('Bonne réponse');
      expect(juste?.getAttribute('data-verdict')).toBe('juste');

      const faux = hote.querySelector('[id="quiz-csp"] .verdict');
      expect(faux?.textContent).toContain('Réponse incorrecte');
      expect(faux?.getAttribute('data-verdict')).toBe('faux');

      const absente = hote.querySelector('[id="quiz-entetes"] .verdict');
      expect(absente?.textContent).toContain('Aucune réponse');
      expect(absente?.getAttribute('data-verdict')).toBe('absente');
    });

    it('affiche l’explication ÉCRITE PAR LE CONTENU, et la réponse attendue', async () => {
      const hote = await monter(QUIZ_CORRIGEABLE);
      await repondre(hote, 'quiz-csp', 'vrai'); // faux
      await repondre(hote, 'quiz-injection', 'requete-preparee'); // juste
      await cliquerBouton(hote);

      const groupe = hote.querySelector('[id="quiz-csp"]');
      // Aucun texte n'est fabriqué par le composant : c'est la `justification` du
      // contrat qui s'affiche, mot pour mot.
      expect(groupe?.querySelector('.explication')?.textContent).toContain(
        'défense en profondeur',
      );
      expect(groupe?.querySelector('.attendue')?.textContent).toContain('Faux');

      // Une bonne réponse n'affiche PAS de « réponse attendue » : elle serait
      // redondante, et la répéter brouillerait la lecture du verdict.
      const juste = hote.querySelector('[id="quiz-injection"]');
      expect(juste?.querySelector('.verdict')?.getAttribute('data-verdict')).toBe('juste');
      expect(juste?.querySelector('.attendue')).toBeNull();
    });

    it('GÈLE les réponses à la correction — le score affiché est celui enregistré', async () => {
      const hote = await monter(QUIZ_CORRIGEABLE);
      await repondre(hote, 'quiz-injection', 'requete-preparee');
      await cliquerBouton(hote);

      const desactivees = radios(hote, 'quiz-injection').filter((radio) => radio.disabled);
      expect(desactivees.length).toBe(3);
    });

    it('déplace le focus sur le résumé — le bouton actionné vient de disparaître', async () => {
      const hote = await monter(QUIZ_CORRIGEABLE);
      await cliquerBouton(hote);

      // Sans ce déplacement, le focus retomberait sur `<body>` : « Corriger » est
      // remplacé par « Recommencer » au moment même où il est actionné (WCAG 2.4.3).
      expect(document.activeElement).toBe(hote.querySelector('[role="status"]'));
    });

    it('« Recommencer » remet l’état à zéro SANS effacer la progression', async () => {
      const hote = await monter(QUIZ_CORRIGEABLE);
      await repondre(hote, 'quiz-injection', 'requete-preparee');
      await repondre(hote, 'quiz-csp', 'faux');
      await repondre(hote, 'quiz-entetes', 'sniff');
      await cliquerBouton(hote);

      const service = TestBed.inject(ProgressionService);
      expect(service.estMaitrisee('injection-sql')).toBe(true);

      await cliquerBouton(hote); // « Recommencer »

      expect(fixture.componentInstance.corrige()).toBe(false);
      expect(hote.querySelector('.verdict')).toBeNull();
      expect(radios(hote, 'quiz-injection').filter((radio) => radio.checked)).toEqual([]);
      // 🔴 La progression, elle, SURVIT : le service ne retient que le meilleur
      // score, et refaire un quiz ne doit pas coûter une maîtrise acquise.
      expect(service.estMaitrisee('injection-sql')).toBe(true);
      // Et le focus ne retombe pas dans le vide.
      expect(document.activeElement).toBe(hote.querySelector('h3'));
    });
  });

  describe('questions provisoires (lot D) — lisibles, hors score, et sans persistance', () => {
    it('affiche la consigne, le code NUMÉROTÉ dès 1, et la mention d’attente', async () => {
      const hote = await monter(QUIZ_MIXTE);

      const associer = hote.querySelector('[id="quiz-paires"]');
      expect(associer?.querySelector('legend')?.textContent).toContain(
        'Associer chaque en-tête à son effet.',
      );
      expect(associer?.querySelector('.mention-provisoire')?.textContent).toContain(
        'pas encore corrigeable',
      );
      // Aucune interaction : l'énoncé est lisible, il n'est pas jouable.
      expect(associer?.querySelector('input')).toBeNull();

      const faille = hote.querySelector('[id="quiz-faille-php"]');
      const lignes = faille?.querySelectorAll('.code-numerote > li') ?? [];
      expect(lignes.length).toBe(2);
      expect(lignes[1]?.textContent).toContain('SELECT * FROM lecons');
      // Le code part par INTERPOLATION : Angular l'échappe, aucun `innerHTML`.
      expect(faille?.querySelector('pre')).toBeNull();
    });

    it('les sort du DÉNOMINATEUR — 3 corrigées sur 5 questions', async () => {
      const hote = await monter(QUIZ_MIXTE);
      await repondre(hote, 'quiz-injection', 'requete-preparee');
      await repondre(hote, 'quiz-csp', 'faux');
      await repondre(hote, 'quiz-entetes', 'sniff');
      await cliquerBouton(hote);

      expect(fixture.componentInstance.total()).toBe(3);
      expect(fixture.componentInstance.score()).toBe(3);

      const resume = hote.querySelector('[role="status"]')?.textContent ?? '';
      expect(resume).toContain('3 bonnes réponses sur 3 questions corrigées');
      expect(resume).toContain('2 questions arrivent bientôt');
      expect(resume).toContain('n’est donc pas enregistré');
    });

    it('🔴 n’écrit RIEN dans la progression tant qu’une question est provisoire', async () => {
      const hote = await monter(QUIZ_MIXTE);
      await repondre(hote, 'quiz-injection', 'requete-preparee');
      await repondre(hote, 'quiz-csp', 'faux');
      await repondre(hote, 'quiz-entetes', 'sniff');
      await cliquerBouton(hote);

      // 3/3 marquerait la leçon « maîtrisée » (seuil 0,8) sans avoir jamais évalué
      // les deux questions les plus difficiles : une fausse maîtrise se croit,
      // une progression absente se rattrape.
      const service = TestBed.inject(ProgressionService);
      expect(service.estMaitrisee('injection-sql')).toBe(false);
      expect(service.etatDe('injection-sql').totalQuestions).toBe(0);
      expect(fenetre().localStorage.getItem(CLE_PROGRESSION)).toBeNull();
    });

    it('CONTRÔLE POSITIF : le même geste, sans question provisoire, ÉCRIT bien', async () => {
      // L'autre moitié de la pince. Sans lui, « rien n'est écrit » serait vrai d'un
      // composant qui n'écrit jamais.
      const hote = await monter(QUIZ_CORRIGEABLE);
      await repondre(hote, 'quiz-injection', 'requete-preparee');
      await repondre(hote, 'quiz-csp', 'faux');
      await repondre(hote, 'quiz-entetes', 'sniff');
      await cliquerBouton(hote);

      const service = TestBed.inject(ProgressionService);
      expect(service.etatDe('injection-sql')).toEqual({
        lue: true,
        meilleurScore: 3,
        totalQuestions: 3,
      });
      expect(fenetre().localStorage.getItem(CLE_PROGRESSION)).not.toBeNull();
    });
  });

  describe('validation nominative des champs propres à chaque type', () => {
    it('CONTRÔLE POSITIF : les fixtures conformes NE lèvent pas', () => {
      // Sans lui, tous les refus ci-dessous seraient compatibles avec un composant
      // qui refuserait TOUT (L-019).
      expect(() => preparation(QUIZ_MIXTE)()).not.toThrow();
    });

    const CHOIX = Q_CHOIX as Extract<QuestionQuiz, { type: 'choix-multiple' }>;
    const VRAI_FAUX = Q_VRAI_FAUX as Extract<QuestionQuiz, { type: 'vrai-faux' }>;
    const ASSOCIER = Q_ASSOCIER as Extract<QuestionQuiz, { type: 'associer' }>;

    const cas: readonly { nom: string; question: QuestionQuiz; attendu: RegExp }[] = [
      {
        nom: 'un `choix-multiple` à une seule proposition',
        question: {
          ...CHOIX,
          choix: [{ id: 'seul', texte: 'Une seule proposition.' }],
          bonneReponse: 'seul',
        },
        attendu: /deux propositions/,
      },
      {
        nom: 'un `bonneReponse` qui ne désigne aucune proposition',
        question: { ...CHOIX, bonneReponse: 'inexistant' },
        attendu: /bonneReponse/,
      },
      {
        nom: 'une `explication` vide',
        question: { ...CHOIX, explication: '   ' },
        attendu: /explication/,
      },
      {
        nom: 'une `justification` vide sur un `vrai-faux`',
        question: { ...VRAI_FAUX, justification: '' },
        attendu: /justification/,
      },
      {
        nom: 'une `consigne` vide sur une question provisoire',
        question: { ...ASSOCIER, consigne: '' },
        attendu: /consigne/,
      },
    ];

    for (const { nom, question, attendu } of cas) {
      it(`refuse ${nom}, en nommant la question`, () => {
        const lever = preparation(quizDe(question));
        expect(lever).toThrowError(attendu);
        // Le message DIT laquelle : « une question quelque part » obligerait le
        // lecteur à refaire l'enquête (même exigence que `refuser()` de
        // `contenu-compile.ts`).
        expect(lever).toThrowError(new RegExp(question.id));
      });
    }

    it('refuse un `bonneReponse` non booléen sur un `vrai-faux`', () => {
      // Le cas est INÉCRIVABLE au contrat, et pourtant réel : une chaîne « false »
      // relue d'un artéfact ancien serait VRAIE en JavaScript, et toutes les
      // corrections de cette question s'inverseraient en silence.
      const cassee = { ...VRAI_FAUX, bonneReponse: 'false' } as unknown as QuestionQuiz;
      expect(preparation(quizDe(cassee))).toThrowError(/bonneReponse.*booléen/);
    });

    it('refuse un `type` que le contrat ne connaît pas', () => {
      const inconnue = { type: 'devinette', id: 'x' } as unknown as QuestionQuiz;
      expect(preparation(quizDe(inconnue))).toThrowError(/devinette/);
    });
  });

  describe('fenêtre de pré-hydratation (L-033) — la saisie du visiteur survit', () => {
    /**
     * CE QUE CE GROUPE REPRODUIT, ET POURQUOI IL S'Y PREND AINSI. En production, la page
     * est peinte prerendue puis hydratée par un chunk paresseux, sans rejeu d'événements
     * (`withNoIncrementalHydration()`). Entre les deux, le visiteur coche une radio : le
     * DOM change **pour de vrai**, mais aucun `(change)` n'est branché pour l'entendre.
     * Le `TestBed` ne sait pas fabriquer cet état — il n'existe pas de DOM prerendu avant
     * le premier rendu — alors on le fabrique à la main : `checked = true` **sans
     * dispatcher d'événement**, ce qui est très exactement ce que fait le navigateur.
     */
    function cocherSansEvenement(hote: HTMLElement, idQuestion: string, valeur: string): void {
      const cible = radios(hote, idQuestion).find((radio) => radio.value === valeur);
      if (cible === undefined) throw new Error(`Aucune réponse « ${valeur} »`);
      cible.checked = true;
    }

    it('🔴 la coche posée AVANT l’hydratation compte dans le score, au lieu d’être écrasée', async () => {
      const hote = await monter(QUIZ_CORRIGEABLE);

      // CONTRÔLE POSITIF (L-019) : sans amorçage, le composant ignore tout de ces
      // trois coches — c'est ce qu'affirme l'assertion suivante, et c'est bien le
      // défaut que L-033 décrit.
      cocherSansEvenement(hote, 'quiz-injection', 'requete-preparee');
      cocherSansEvenement(hote, 'quiz-csp', 'faux');
      cocherSansEvenement(hote, 'quiz-entetes', 'sniff');
      expect(fixture.componentInstance.reponseDe('injection')).toBeUndefined();

      fixture.componentInstance.amorcerDepuisLeDom();
      await fixture.whenStable();

      // Les trois réponses sont maintenant CELLES DU DOM, pas un état vide réécrit
      // par-dessus.
      expect(fixture.componentInstance.reponseDe('injection')).toBe('requete-preparee');
      expect(fixture.componentInstance.reponseDe('csp')).toBe('faux');
      expect(fixture.componentInstance.reponseDe('entetes')).toBe('sniff');
      expect(radios(hote, 'quiz-injection').filter((radio) => radio.checked).length).toBe(1);

      await cliquerBouton(hote);
      expect(fixture.componentInstance.score()).toBe(3);
      expect(TestBed.inject(ProgressionService).estMaitrisee('injection-sql')).toBe(true);
    });

    it('n’invente RIEN quand le DOM ne porte aucune coche, et n’écrase pas une réponse déjà saisie', async () => {
      const hote = await monter(QUIZ_CORRIGEABLE);

      fixture.componentInstance.amorcerDepuisLeDom();
      await fixture.whenStable();
      expect(fixture.componentInstance.reponseDe('injection')).toBeUndefined();

      // Idempotence : une réponse déjà connue du composant a coché sa radio, donc
      // l'amorçage la relit — il doit la retrouver identique, pas la perdre.
      await repondre(hote, 'quiz-injection', 'liste-noire');
      fixture.componentInstance.amorcerDepuisLeDom();
      await fixture.whenStable();
      expect(fixture.componentInstance.reponseDe('injection')).toBe('liste-noire');
    });

    it('reste SANS EFFET une fois le quiz corrigé — le verdict ne bouge plus', async () => {
      const hote = await monter(QUIZ_CORRIGEABLE);
      await repondre(hote, 'quiz-injection', 'liste-noire');
      await cliquerBouton(hote);
      expect(fixture.componentInstance.score()).toBe(0);

      // Les radios sont `disabled`, mais `checked` reste assignable par programme :
      // l'amorçage doit se taire de lui-même, sans quoi un score DÉJÀ enregistré
      // pourrait se mettre à diverger de ce que la progression a retenu.
      cocherSansEvenement(hote, 'quiz-injection', 'requete-preparee');
      fixture.componentInstance.amorcerDepuisLeDom();
      await fixture.whenStable();

      expect(fixture.componentInstance.reponseDe('injection')).toBe('liste-noire');
      expect(fixture.componentInstance.score()).toBe(0);
    });
  });

  describe('interdits de forme et de sécurité', () => {
    it('ne pose pas `standalone: true` (défaut depuis Angular 20)', () => {
      expect(sourceDuComposant()).not.toContain('standalone');
    });

    it('n’emploie ni `ngClass` ni `ngStyle`', () => {
      const source = sourceDuComposant();
      expect(source).not.toContain('ngClass');
      expect(source).not.toContain('ngStyle');
    });

    it('n’emploie NI `[innerHTML]` NI aucun `bypassSecurityTrust*`', () => {
      // L'unique contournement du site reste scopé au bloc `mermaid` de
      // `RenduBlocs` (`src/garde-fou-contournements-sanitizer.spec.ts`). Le code
      // volontairement vulnérable d'une question part par INTERPOLATION, donc
      // échappé par Angular.
      const source = sourceDuComposant();
      expect(source).not.toContain('innerHTML');
      expect(source).not.toContain('bypassSecurityTrust');
    });

    it('BRANCHE l’amorçage sur `afterNextRender`, sinon il ne garde rien (L-008)', () => {
      // Les trois tests de la fenêtre de pré-hydratation appellent `amorcerDepuisLeDom()`
      // eux-mêmes, faute de pouvoir fabriquer un DOM prerendu dans le `TestBed` : ils
      // prouvent que la méthode fait ce qu'il faut, pas que quelqu'un l'appelle. C'est
      // exactement le trou de L-008, et voici ce qui le bouche.
      expect(sourceDuComposant()).toMatch(
        /afterNextRender\(\(\) => \{\s*this\.amorcerDepuisLeDom\(\);/,
      );
    });

    it('🔴 AFFICHE une charge utile sans en faire naître un seul nœud — preuve par le DOM', async () => {
      const hote = await monter(quizDe(Q_FAILLE_XSS));
      const groupe = hote.querySelector('[id="quiz-faille-xss"]');

      // CONTRÔLE POSITIF (L-019) : la charge est bien à l'écran, entière et lisible.
      // Sans lui, tout ce qui suit serait vrai d'un composant qui n'affiche rien.
      const texte = groupe?.textContent ?? '';
      expect(texte).toContain('onerror="alert(\'XSS\')"');
      expect(texte).toContain('<script>alert(1)</script>');
      expect(texte).toContain('style="color:red"');

      // ... et pas un nœud n'en est né. On interroge le DOM, pas la source :
      // c'est la différence entre « le composant n'écrit pas `innerHTML` » et
      // « rien ne s'exécute ».
      expect(groupe?.querySelector('img')).toBeNull();
      expect(groupe?.querySelector('script')).toBeNull();
      expect(groupe?.querySelector('div')).toBeNull();
      const contamines = [...hote.querySelectorAll('*')].filter(
        (element) => element.hasAttribute('onerror') || element.hasAttribute('style'),
      );
      expect(contamines).toEqual([]);
      // Les lignes de code ne portent QUE du texte : aucun élément enfant, donc
      // aucune balise n'a été interprétée en chemin.
      const lignes = [...(groupe?.querySelectorAll('.code-numerote > li > code') ?? [])];
      expect(lignes.length).toBe(3);
      for (const ligne of lignes) {
        expect(ligne.children.length).toBe(0);
      }

      // 🔴 CE QUE L'ÉCHAPPEMENT NE FAIT PAS, et c'est mesuré ici pour que la note de
      // `quiz.ts` cesse d'être une supposition : Angular échappe « < », donc aucune
      // balise ne peut s'ouvrir — mais il n'échappe PAS les guillemets. La séquence
      // que le gate `tools/deploiement/generer-config-swa.mjs` cherche dans le HTML
      // prerendu (« espace + on…= + guillemet », et son jumeau pour le style en
      // ligne) survit donc INTACTE au rendu. Le build échouerait, fail-closed, sur
      // un message parlant de CSP. Si cette assertion tombe un jour, c'est que le
      // mode d'échec a disparu : retirer la note de `quiz.ts` dans le même diff.
      const html = groupe?.innerHTML ?? '';
      expect(html).toContain('&lt;img');
      expect(html).toContain(' onerror="');
      expect(html).toContain(' style="color:red"');
    });

    it('n’importe RIEN de `features/cours/lecon` — la flèche ne remonte jamais', () => {
      // La règle d'architecture « aucune feature n'importe une autre feature »
      // (`docs/architecture/stack-et-architecture.md` §7) vise le couplage d'état
      // latéral. La composition descendante `lecon → quiz` est légitime ; l'inverse
      // ne l'est pas, et ce test est ce qui l'empêche d'apparaître un jour.
      const source = sourceDuComposant();
      expect(source).not.toContain("from '../lecon");
      expect(source).not.toContain('features/cours/lecon');
      // Le seul chemin partagé avec les autres features passe par `core/`.
      expect(source).toContain("from '../../../core/progression/progression'");
    });
  });
});
