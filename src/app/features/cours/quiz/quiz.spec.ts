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
  paires: [
    { gauche: 'HSTS', droite: 'force HTTPS' },
    { gauche: 'X-Frame-Options', droite: 'interdit le cadrage' },
    { gauche: 'nosniff', droite: 'interdit la déduction de type' },
  ],
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

/** Les `<select>` d'un `associer`, dans l'ordre du document. */
function champs(hote: HTMLElement, idQuestion: string): HTMLSelectElement[] {
  return [...hote.querySelectorAll<HTMLSelectElement>(`[id="${idQuestion}"] select`)];
}

/** Choisit une valeur dans le n-ième `<select>` d'une question, comme un visiteur. */
async function associer(
  hote: HTMLElement,
  idQuestion: string,
  rang: number,
  valeur: string,
): Promise<void> {
  const champ = champs(hote, idQuestion)[rang];
  if (champ === undefined) {
    throw new Error(`Aucun champ n°${rang} dans la question « ${idQuestion} »`);
  }
  champ.value = valeur;
  // Une valeur refusée par le `<select>` retombe sur la chaîne vide sans rien dire :
  // sans ce contrôle, un test sur une option inexistante passerait pour « absente ».
  if (champ.value !== valeur) {
    throw new Error(`« ${valeur} » n’est proposée par aucune option de « ${idQuestion} »`);
  }
  champ.dispatchEvent(new Event('change'));
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

  describe('`associer` (D-1) — un `<select>` natif par ligne de gauche', () => {
    it('rend un champ par paire, avec l’attente PUIS toutes les valeurs de droite', async () => {
      const hote = await monter(QUIZ_MIXTE);
      const groupe = hote.querySelector('[id="quiz-paires"]');

      const selects = champs(hote, 'quiz-paires');
      // CONTRÔLE POSITIF (L-019) : sans lui, « aucun rôle ARIA » serait vrai d'un
      // composant qui ne rendrait aucun champ.
      expect(selects.length).toBe(3);

      // L'ordre des options est celui de la SOURCE, précédé de l'attente. Les
      // valeurs sont écrites ici en dur (L-012), jamais dérivées de la fixture.
      const options = [...selects[0]!.options].map((option) => option.value);
      expect(options).toEqual([
        '',
        'force HTTPS',
        'interdit le cadrage',
        'interdit la déduction de type',
      ]);
      // Rien n'est pré-choisi : le prerender part de l'attente, donc le troisième
      // état de WCAG 1.4.1 (« absente ») reste atteignable.
      expect(selects.every((champ) => champ.value === '')).toBe(true);

      // Le nom accessible vient du `<label>` qui CONTIENT le champ — zéro ARIA,
      // zéro `id` fabriqué, donc zéro collision possible avec une ancre de section.
      const etiquettes = [...(groupe?.querySelectorAll('label.paire') ?? [])].map(
        (label) => label.querySelector('span')?.textContent?.trim(),
      );
      expect(etiquettes).toEqual(['HSTS', 'X-Frame-Options', 'nosniff']);
      for (const label of groupe?.querySelectorAll('label.paire') ?? []) {
        expect(label.querySelector('select')).not.toBeNull();
      }
      for (const attendu of ['listbox', 'combobox', 'option', 'group']) {
        expect(groupe?.querySelector(`[role="${attendu}"]`)).toBeNull();
      }
    });

    it('ACCEPTE deux champs sur la même valeur — l’unicité n’est PAS forcée (D-1)', async () => {
      const hote = await monter(QUIZ_MIXTE);
      await associer(hote, 'quiz-paires', 0, 'force HTTPS');
      await associer(hote, 'quiz-paires', 1, 'force HTTPS');

      // Forcer l'unicité transformerait l'exercice en sudoku et masquerait la vraie
      // erreur de compréhension : les deux champs gardent la même valeur.
      const selects = champs(hote, 'quiz-paires');
      expect([selects[0]!.value, selects[1]!.value]).toEqual(['force HTTPS', 'force HTTPS']);
    });

    it('corrige LIGNE PAR LIGNE, en écrivant le mot de chaque ligne', async () => {
      const hote = await monter(QUIZ_MIXTE);
      await associer(hote, 'quiz-paires', 0, 'force HTTPS'); // juste
      await associer(hote, 'quiz-paires', 1, 'force HTTPS'); // faux
      // Le troisième champ reste sur l'attente.
      await cliquerBouton(hote);

      const groupe = hote.querySelector('[id="quiz-paires"]');
      // Une association PARTIELLE est fausse pour le score…
      expect(groupe?.querySelector('.verdict')?.getAttribute('data-verdict')).toBe('faux');
      // … mais la correction dit exactement ce qui est acquis, ligne à ligne.
      const lignes = [...(groupe?.querySelectorAll('.ligne-corrigee') ?? [])];
      expect(lignes.length).toBe(3);
      expect(lignes.map((ligne) => ligne.getAttribute('data-verdict'))).toEqual([
        'juste',
        'faux',
        'absente',
      ]);
      // WCAG 1.4.1 : le MOT, jamais la seule couleur.
      expect(lignes[0]?.textContent).toContain('Association correcte');
      expect(lignes[1]?.textContent).toContain('Association incorrecte');
      expect(lignes[2]?.textContent).toContain('Aucune association choisie');

      // La ligne fausse montre la réponse donnée ET l'attendue ; la juste et
      // l'absente n'ont pas de « votre réponse » à afficher.
      expect(lignes[1]?.textContent).toContain('interdit le cadrage');
      expect(lignes[1]?.querySelector('.donnee')?.textContent).toContain('force HTTPS');
      expect(lignes[0]?.querySelector('.donnee')).toBeNull();
      expect(lignes[2]?.querySelector('.donnee')).toBeNull();

      // Pas de « réponse attendue » globale : elle n'aurait aucun sens ici.
      expect(groupe?.querySelector('.attendue')).toBeNull();
      expect(groupe?.querySelector('.explication')?.textContent).toContain(
        'Chaque en-tête a un effet distinct.',
      );
    });

    it('vaut « juste » quand TOUTES les lignes le sont, « absente » quand aucune ne l’est', async () => {
      const hote = await monter(quizDe(Q_ASSOCIER));
      await cliquerBouton(hote);
      expect(hote.querySelector('.verdict')?.getAttribute('data-verdict')).toBe('absente');

      await cliquerBouton(hote); // « Recommencer »
      await associer(hote, 'quiz-paires', 0, 'force HTTPS');
      await associer(hote, 'quiz-paires', 1, 'interdit le cadrage');
      await associer(hote, 'quiz-paires', 2, 'interdit la déduction de type');
      await cliquerBouton(hote);

      expect(hote.querySelector('.verdict')?.getAttribute('data-verdict')).toBe('juste');
      expect(fixture.componentInstance.score()).toBe(1);
    });

    it('revenir sur « Choisir… » EFFACE la réponse au lieu d’en stocker une vide', async () => {
      const hote = await monter(quizDe(Q_ASSOCIER));
      await associer(hote, 'quiz-paires', 0, 'force HTTPS');
      expect(fixture.componentInstance.reponseDe('paires#0')).toBe('force HTTPS');

      await associer(hote, 'quiz-paires', 0, '');
      // Sans l'effacement, le verdict serait « faux » — donc « vous vous êtes
      // trompé » là où le visiteur n'a simplement rien répondu.
      expect(fixture.componentInstance.reponseDe('paires#0')).toBeUndefined();
      await cliquerBouton(hote);
      expect(hote.querySelector('.verdict')?.getAttribute('data-verdict')).toBe('absente');
    });

    it('GÈLE les champs à la correction, comme les radios', async () => {
      const hote = await monter(quizDe(Q_ASSOCIER));
      await cliquerBouton(hote);
      expect(champs(hote, 'quiz-paires').filter((champ) => champ.disabled).length).toBe(3);
    });
  });

  describe('`trouver-la-faille` (D-2) — une radio par ligne de code', () => {
    it('rend une radio par ligne, dont le label porte le NUMÉRO et le code', async () => {
      const hote = await monter(QUIZ_MIXTE);
      const groupe = hote.querySelector('[id="quiz-faille-php"]');

      const lignes = [...(groupe?.querySelectorAll('.code-numerote > li') ?? [])];
      expect(lignes.length).toBe(2);

      const boutons = radios(hote, 'quiz-faille-php');
      expect(boutons.length).toBe(2);
      // La numérotation commence à 1 — c'est le référentiel de `ligneFautive`.
      expect(boutons.map((bouton) => bouton.value)).toEqual(['1', '2']);
      // Un `name` unique par question : c'est LUI qui fait le groupe natif.
      expect(new Set(boutons.map((bouton) => bouton.name))).toEqual(
        new Set(['quiz-faille-php']),
      );

      // 🔴 LE MOT « Ligne » EST ÉCRIT, pas seulement le numéro — et c'est ce qui rend
      // le nom accessible de la radio utilisable. Le marqueur d'une `<ol>` n'entre pas
      // dans le calcul du nom, donc le numéro doit venir du document ; et le numéro NU
      // laissait un nom ambigu (« 2 » de quoi ?), tandis que la correction annonce
      // « Ligne 2 », qui ne correspondait alors à AUCUN libellé d'option. axe ne juge
      // pas la justesse d'un nom accessible (constat D-C6) : ce test le fait.
      const label = lignes[1]?.querySelector('label.ligne-code');
      expect(label?.querySelector('.numero-ligne')?.textContent?.trim()).toBe('Ligne\u00A02');
      expect(label?.querySelector('code')?.textContent).toContain('SELECT * FROM lecons');
      expect(label?.querySelector('input[type="radio"]')).not.toBeNull();
      // Le code part par INTERPOLATION : Angular l'échappe, aucun `innerHTML`.
      expect(groupe?.querySelector('pre')).toBeNull();
    });

    it('corrige la ligne désignée, et affiche faille, explication ET correction', async () => {
      const hote = await monter(quizDe(Q_FAILLE));
      await repondre(hote, 'quiz-faille-php', '1'); // la fautive est la 2
      await cliquerBouton(hote);

      const groupe = hote.querySelector('[id="quiz-faille-php"]');
      expect(groupe?.querySelector('.verdict')?.getAttribute('data-verdict')).toBe('faux');
      // Le NUMÉRO seul serait ambigu à l'oreille : le libellé reprend le mot qui
      // étiquette déjà chaque ligne à l'écran.
      expect(groupe?.querySelector('.attendue')?.textContent).toContain('Ligne 2');
      expect(groupe?.querySelector('.faille')?.textContent).toContain(
        'Injection SQL par interpolation',
      );
      expect(groupe?.querySelector('.explication')?.textContent).toContain(
        'insère la donnée du client',
      );
      expect(groupe?.querySelector('.correction')?.textContent).toContain('$pdo->prepare');
    });

    it('vaut « juste » sur la bonne ligne, « absente » sans réponse', async () => {
      const hote = await monter(quizDe(Q_FAILLE));
      await cliquerBouton(hote);
      expect(hote.querySelector('.verdict')?.getAttribute('data-verdict')).toBe('absente');

      await cliquerBouton(hote); // « Recommencer »
      await repondre(hote, 'quiz-faille-php', '2');
      await cliquerBouton(hote);
      expect(hote.querySelector('.verdict')?.getAttribute('data-verdict')).toBe('juste');
      expect(fixture.componentInstance.score()).toBe(1);
    });
  });

  describe('le dénominateur est redevenu le TOTAL (fin des questions provisoires)', () => {
    /** Répond juste aux cinq questions de `QUIZ_MIXTE`. */
    async function toutRepondre(hote: HTMLElement): Promise<void> {
      await repondre(hote, 'quiz-injection', 'requete-preparee');
      await repondre(hote, 'quiz-csp', 'faux');
      await repondre(hote, 'quiz-entetes', 'sniff');
      await associer(hote, 'quiz-paires', 0, 'force HTTPS');
      await associer(hote, 'quiz-paires', 1, 'interdit le cadrage');
      await associer(hote, 'quiz-paires', 2, 'interdit la déduction de type');
      await repondre(hote, 'quiz-faille-php', '2');
    }

    it('compte 5 questions sur 5, sans mention d’attente dans le résumé', async () => {
      const hote = await monter(QUIZ_MIXTE);
      await toutRepondre(hote);
      await cliquerBouton(hote);

      expect(fixture.componentInstance.total()).toBe(5);
      expect(fixture.componentInstance.score()).toBe(5);

      const resume = hote.querySelector('[role="status"]')?.textContent ?? '';
      expect(resume).toContain('5 bonnes réponses sur 5 questions corrigées');
      // La mention du lot C a disparu AVEC la forme provisoire : la laisser serait
      // un mensonge à l'écran sur un quiz entièrement corrigé.
      expect(resume).not.toContain('arrive');
      expect(resume).not.toContain('pas enregistré');
      // Aucune question ne se rend plus en « provisoire ».
      expect(hote.querySelector('.mention-provisoire')).toBeNull();
    });

    it('🔴 ÉCRIT la progression sur un quiz mixte — c’est la fin de la retenue du lot C', async () => {
      const hote = await monter(QUIZ_MIXTE);
      await toutRepondre(hote);
      await cliquerBouton(hote);

      const service = TestBed.inject(ProgressionService);
      expect(service.etatDe('injection-sql')).toEqual({
        lue: true,
        meilleurScore: 5,
        totalQuestions: 5,
      });
      expect(service.estMaitrisee('injection-sql')).toBe(true);
      expect(fenetre().localStorage.getItem(CLE_PROGRESSION)).not.toBeNull();
    });

    it('CONTRÔLE POSITIF : une association RATÉE fait bien tomber le score à 4/5', async () => {
      // L'autre moitié de la pince. Sans lui, « 5/5 est enregistré » serait vrai
      // d'un composant qui compterait juste toutes les questions difficiles.
      const hote = await monter(QUIZ_MIXTE);
      await toutRepondre(hote);
      await associer(hote, 'quiz-paires', 2, 'force HTTPS'); // on casse la 3e ligne
      await cliquerBouton(hote);

      expect(fixture.componentInstance.score()).toBe(4);
      expect(TestBed.inject(ProgressionService).etatDe('injection-sql').meilleurScore).toBe(4);
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
    const FAILLE = Q_FAILLE as Extract<QuestionQuiz, { type: 'trouver-la-faille' }>;

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
        nom: 'une `consigne` vide sur un `associer`',
        question: { ...ASSOCIER, consigne: '' },
        attendu: /consigne/,
      },
      {
        nom: 'un `associer` à une seule paire',
        question: { ...ASSOCIER, paires: [{ gauche: 'HSTS', droite: 'force HTTPS' }] },
        attendu: /au moins deux paires/,
      },
      {
        nom: 'une paire dont le `droite` est vide',
        question: {
          ...ASSOCIER,
          paires: [
            { gauche: 'HSTS', droite: 'force HTTPS' },
            { gauche: 'nosniff', droite: '  ' },
          ],
        },
        attendu: /paires\[1\].*droite/,
      },
      {
        nom: 'deux paires qui partagent le même `gauche`',
        question: {
          ...ASSOCIER,
          paires: [
            { gauche: 'HSTS', droite: 'force HTTPS' },
            { gauche: 'HSTS', droite: 'interdit le cadrage' },
          ],
        },
        attendu: /même « gauche »/,
      },
      {
        nom: 'une `explication` vide sur un `associer`',
        question: { ...ASSOCIER, explication: '' },
        attendu: /explication/,
      },
      {
        nom: 'un `code` vide sur un `trouver-la-faille`',
        question: { ...FAILLE, code: '' },
        attendu: /code/,
      },
      {
        nom: 'une `faille` vide',
        question: { ...FAILLE, faille: '   ' },
        attendu: /faille » : texte non vide/,
      },
      {
        nom: 'une `correction` vide',
        question: { ...FAILLE, correction: '' },
        attendu: /correction/,
      },
      {
        nom: 'une `ligneFautive` qui déborde du code',
        // Le mode d'échec est MUET : la bonne réponse ne serait proposée par aucune
        // radio, et toutes les tentatives du visiteur seraient fausses.
        question: { ...FAILLE, ligneFautive: 3 },
        attendu: /ligneFautive.*ne désigne aucune ligne \(le code en compte 2\)/,
      },
      {
        nom: 'une `ligneFautive` à zéro — la numérotation commence à 1',
        question: { ...FAILLE, ligneFautive: 0 },
        attendu: /ligneFautive/,
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

    it('🔴 le `<select>` choisi AVANT l’hydratation n’est pas ramené sur « Choisir… »', async () => {
      // Le cas le PLUS exposé de L-033 : un `<select>` garde silencieusement la
      // valeur choisie avant l'hydratation, sans aucun repère visuel qu'un état
      // concurrent existe — et `[value]` la réécrirait à '' à la première détection.
      const hote = await monter(QUIZ_MIXTE);

      const selects = champs(hote, 'quiz-paires');
      selects[0]!.value = 'force HTTPS'; // sans `dispatchEvent` : c'est le navigateur
      selects[1]!.value = 'interdit le cadrage';
      cocherSansEvenement(hote, 'quiz-faille-php', '2');

      // CONTRÔLE POSITIF (L-019) : sans amorçage, le composant ignore tout de ces
      // trois saisies — c'est bien le défaut que L-033 décrit.
      expect(fixture.componentInstance.reponseDe('paires#0')).toBeUndefined();
      expect(fixture.componentInstance.reponseDe('faille-php')).toBeUndefined();

      fixture.componentInstance.amorcerDepuisLeDom();
      await fixture.whenStable();

      expect(fixture.componentInstance.reponseDe('paires#0')).toBe('force HTTPS');
      expect(fixture.componentInstance.reponseDe('paires#1')).toBe('interdit le cadrage');
      // Le champ laissé sur l'attente n'invente RIEN : la chaîne vide n'est jamais
      // stockée, sinon le verdict « absente » deviendrait inatteignable.
      expect(fixture.componentInstance.reponseDe('paires#2')).toBeUndefined();
      expect(fixture.componentInstance.reponseDe('faille-php')).toBe('2');

      // Et la saisie SURVIT à la détection de changements qui suit.
      expect(champs(hote, 'quiz-paires')[0]?.value).toBe('force HTTPS');
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
      const lignes = [...(groupe?.querySelectorAll('.code-numerote code') ?? [])];
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
