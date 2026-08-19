// =============================================================================
// Tests du Quiz — E2-ST3, lots C, D et E-a
// -----------------------------------------------------------------------------
// CE QUE CE FICHIER TIENT, ET POURQUOI CHAQUE GROUPE A SON CONTRÔLE POSITIF.
//
//   · La FORME. Radios natives dans des `<fieldset>`/`<legend>`, un `<select>` natif
//     par ligne d'un `associer` (décision D-1), aucun rôle ARIA de remplacement, un
//     `id` de document par question. Le contrôle positif est qu'on a bien compté des
//     radios et des champs : « aucun role=radiogroup » serait vrai d'un composant qui
//     ne rend rien (L-019).
//   · Le SCORE. Bonnes réponses sur les QUATRE types, une question sans réponse
//     comptant comme fausse — et le disant à l'écran. Il n'y a plus de question
//     « provisoire » depuis le lot D : le dénominateur est le total.
//   · La PROGRESSION. `enregistrerQuiz` est appelé sur un quiz mixte, avec sa moitié
//     de pince : une association ratée fait bien retomber le score enregistré. Sans
//     elle, « 5/5 est écrit » serait vrai d'un composant qui compterait tout juste.
//   · La FENÊTRE DE PRÉ-HYDRATATION (L-033). La saisie faite avant que le composant
//     ne se branche survit à la première détection de changements — plus un garde-fou
//     de CÂBLAGE, parce que les trois cas appellent l'amorçage eux-mêmes (L-008).
//   · La VALIDATION. Les champs propres à chaque type lèvent en nommant la
//     question. C'est le pendant de `verifierEnveloppeDuQuiz` (`contenu-compile.ts`),
//     qui s'arrête, lui, à l'enveloppe.
//   · LA COLLISION S-011, à deux mains et sur les QUATRE types (lot E-a) : la charge
//     utile d'auteur s'affiche ENTIÈRE sans qu'un seul nœud n'en naisse, ET la
//     séquence que `generer-config-swa.mjs` cherche survit dans le HTML sérialisé —
//     COMPTÉE, jamais seulement « présente ». Les quatre types ont chacun leur `it()` :
//     `choix-multiple` (`question`, `choix[].texte`), `vrai-faux` (`affirmation`,
//     `justification`), `associer` (`gauche`, `droite`) et `trouver-la-faille`
//     (`code`, `correction`). La couverture se COMPTE, elle ne se déclare pas : jusqu'au
//     lot E-a cet en-tête annonçait quatre types pour deux `it()`, et un document de
//     garde-fou qui promet plus que le garde-fou n'applique, c'est S-009.
//     Si cette seconde main tombe un jour, c'est la note S-011 de `quiz.ts` qui doit
//     partir dans le même diff — jamais le gate qui doit s'assouplir.
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

/**
 * LE CONTRÔLE POSITIF DE LA CLAUSE DE D-1 : « plusieurs `<select>` peuvent porter la
 * même valeur `droite` ». `Q_ASSOCIER` n'a que des `droite` DISTINCTS — la déduplication
 * d'`optionsDroite` n'y est donc jamais exécutée, et le test qui pose deux champs sur la
 * même valeur y prouve l'interface, pas la décision. Ici, deux paires partagent
 * réellement leur `droite` : le lot ne compte que DEUX valeurs de réponse pour TROIS
 * lignes, et les deux lignes qui la partagent doivent pouvoir être justes en même temps.
 * `gauche`, lui, reste unique — c'est l'autre moitié de la décision, et `valider.mjs` la
 * refuse désormais en nommant le fichier.
 */
const Q_ASSOCIER_DROITE_DOUBLE: QuestionQuiz = {
  type: 'associer',
  id: 'paires-doublon',
  consigne: 'Associer chaque en-tête à la catégorie de défense dont il relève.',
  paires: [
    { gauche: 'HSTS', droite: 'défense du transport' },
    { gauche: 'X-Frame-Options', droite: 'défense du rendu' },
    { gauche: 'nosniff', droite: 'défense du rendu' },
  ],
  explication:
    'Deux en-têtes peuvent relever de la même catégorie : c’est précisément ce que la ' +
    'question fait constater, et c’est pourquoi l’unicité des réponses n’est pas forcée.',
};

/**
 * LA CHARGE UTILE SUR LE CHEMIN `associer` — les deux côtés. Le `gauche` devient le texte
 * d'un `<span>` d'étiquette et le texte d'une ligne de correction ; le `droite` devient le
 * texte d'une `<option>`, sa `value`, et le texte de la réponse attendue. Une leçon sur le
 * XSS appariera littéralement `onerror="…"` à son vecteur : la collision S-011 n'y est pas
 * hypothétique.
 */
const Q_ASSOCIER_XSS: QuestionQuiz = {
  type: 'associer',
  id: 'paires-xss',
  consigne: 'Associer chaque charge utile au vecteur qu’elle emprunte.',
  paires: [
    { gauche: '<img src=x onerror="alert(\'XSS\')">', droite: 'un attribut style="color:red"' },
    { gauche: '<script>alert(1)</script>', droite: 'une balise ouverte' },
  ],
  explication:
    'Les deux charges sont ici du TEXTE : elles s’affichent entières et ne s’exécutent ' +
    'pas, parce que le rendu passe par interpolation et jamais par du HTML brut.',
};

/**
 * LA CHARGE UTILE DANS `correction` — le champ le plus exposé du lot, et le moins évident :
 * une correction est du CODE CORRIGÉ, donc du code qui pose légitimement un attribut. Le
 * `style="…"` ci-dessous n'a rien d'une charge exotique, c'est ce qu'un correctif écrit.
 * Ce champ ne se rend qu'APRÈS la correction : le test doit cliquer pour le voir.
 */
const Q_FAILLE_CORRECTION_XSS: QuestionQuiz = {
  type: 'trouver-la-faille',
  id: 'faille-correction',
  consigne: 'Repérer la ligne qui recopie une entrée du client dans du HTML.',
  langage: 'php',
  code: "$avis = $_GET['avis'];\necho '<p>' . $avis . '</p>';",
  htmlColore: '<pre class="shiki"><code><span class="line">$avis</span></code></pre>',
  ligneFautive: 2,
  faille: 'XSS réfléchi',
  explication: 'La ligne 2 recopie la donnée du client dans le HTML sans l’encoder.',
  correction:
    'echo \'<p style="color:red">\' . htmlspecialchars($avis, ENT_QUOTES, \'UTF-8\') . ' +
    '\'</p>\'; // plus aucun onerror="…" ne peut naître de $avis',
};

/**
 * LA CHARGE UTILE SUR LE CHEMIN `choix-multiple` — l'énoncé (`question`) et le libellé
 * d'une proposition (`choix[].texte`). Ces deux sites sont nommés dans la liste S-011 de
 * `quiz.ts` et n'avaient, jusqu'au lot E-a, AUCUNE assertion : l'en-tête de ce fichier
 * promettait « les quatre types » et n'en exerçait que deux. Un document de garde-fou qui
 * promet plus que le garde-fou n'applique, c'est S-009 — on ferme le trou, pas la promesse.
 *
 * ⚠️ Les `choix[].id` restent en kebab-case : c'est eux qui deviennent la `value` des
 * radios, donc un contexte d'ATTRIBUT, où la séquence ne peut de toute façon pas se former.
 * La charge est là où le lecteur la lit — dans le texte.
 */
const Q_CHOIX_XSS: QuestionQuiz = {
  type: 'choix-multiple',
  id: 'choix-xss',
  question: 'Que rend le navigateur devant <img src=x onerror="alert(\'XSS\')"> ?',
  choix: [
    { id: 'texte', texte: 'Rien : la charge s’affiche comme du texte si elle est encodée.' },
    { id: 'balise', texte: 'Une balise, si la sortie n’est pas encodée — ex. style="color:red".' },
  ],
  bonneReponse: 'texte',
  explication:
    'Une charge encodée en sortie reste du texte : le navigateur n’ouvre aucune balise et ' +
    'n’exécute aucun gestionnaire d’événement.',
};

/**
 * LA CHARGE UTILE SUR LE CHEMIN `vrai-faux` — l'`affirmation` et sa `justification`.
 * La justification ne se rend qu'APRÈS correction : le test doit cliquer pour la voir,
 * comme pour `correction` d'un `trouver-la-faille`.
 */
const Q_VRAI_FAUX_XSS: QuestionQuiz = {
  type: 'vrai-faux',
  id: 'vrai-faux-xss',
  affirmation: 'Le fragment <img src=x onerror="alert(\'XSS\')"> est inoffensif une fois encodé.',
  bonneReponse: true,
  justification:
    'Encodée en sortie, la charge devient du texte. Un correctif écrit d’ailleurs ' +
    'légitimement <p style="color:red"> sans la moindre intention d’attaque.',
};

/** Trois questions, toutes corrigeables : le chemin où la progression S'ÉCRIT. */
const QUIZ_CORRIGEABLE: QuizCompile = {
  lecon: 'injection-sql',
  titre: 'Quiz — injection SQL',
  questions: [Q_CHOIX, Q_VRAI_FAUX, Q_AUTRE_CHOIX],
};

/** Les cinq questions, un exemplaire de chacun des quatre types : le quiz complet. */
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

/**
 * Le sujet du cours par défaut des montages ci-dessous — E2-ST6, lot A2. La progression
 * est indexée par le couple `(sujet, slug)` : `SUJET` et `QUIZ_*.lecon` composent donc
 * ensemble la clef que les assertions relisent.
 */
const SUJET = 'securite-web';

async function monter(quiz: QuizCompile, sujet = SUJET): Promise<HTMLElement> {
  fixture = TestBed.createComponent(Quiz);
  fixture.componentRef.setInput('quiz', quiz);
  fixture.componentRef.setInput('sujet', sujet);
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

/**
 * 🔴 LA LISTE BLANCHE DES ATTRIBUTS QUE CE COMPOSANT A LE DROIT DE RENDRE. Écrite en dur,
 * NOMINATIVEMENT, et exhaustive : tout attribut qui n'y figure pas fait échouer le test EN
 * SE NOMMANT.
 *
 * Pourquoi une liste blanche et pas la liste des formes interdites (`style`, `on…`) qui
 * tenait ce rôle jusqu'au lot E-a : une liste noire ne refuse que ce que son auteur a
 * imaginé. `srcdoc`, `formaction`, `href="javascript:"`, `xlink:href` seraient passés
 * intacts. C'est le patron systémique du dépôt, constaté trois fois (S-001, S-003,
 * S-009) : sur un format STRUCTURÉ, on relève puis on confronte à une liste blanche.
 *
 * ⚠️ Ajouter un nom ici est une DÉCISION, pas une formalité de mise à jour : c'est
 * déclarer qu'un humain a regardé ce que le gabarit rend de neuf.
 */
const ATTRIBUTS_PERMIS: readonly string[] = [
  'class',
  'id',
  'type',
  'name',
  'value',
  'checked',
  'disabled',
  'selected',
  'role',
  'tabindex',
  'aria-live',
  'aria-atomic',
  'data-champ',
  'data-verdict',
];

/**
 * Angular pose l'encapsulation de styles émulée sous des noms dérivés d'un compteur de
 * build (`_nghost-ng-c1234567`, `_ngcontent-ng-c1234567`) : le suffixe ne PEUT pas être
 * nominatif, le préfixe l'est. C'est la seule dérogation, et elle est bornée à ces deux
 * préfixes-là.
 */
function estAttributPermis(nom: string): boolean {
  if (/^_ng(host|content)-/.test(nom)) return true;
  return ATTRIBUTS_PERMIS.includes(nom);
}

/**
 * LA PREMIÈRE MAIN DE S-011, factorisée parce qu'elle se rejoue sur les QUATRE types de
 * question. Elle interroge le DOM, jamais la source : c'est la différence entre « le
 * composant n'écrit pas `innerHTML` » et « rien ne s'exécute ».
 *
 * Le balayage porte sur l'HÔTE ENTIER, pas sur le seul groupe : une charge qui
 * s'échapperait de son `<fieldset>` serait le pire des cas, donc celui qu'il faut voir.
 */
function exigerQu_aucunNoeudNeSoitNe(hote: HTMLElement, groupe: Element | null): void {
  expect(groupe?.querySelector('img')).toBeNull();
  expect(groupe?.querySelector('script')).toBeNull();
  expect(groupe?.querySelector('div')).toBeNull();

  const elements = [...hote.querySelectorAll('*')];
  // CONTRÔLE POSITIF (L-019) : sans lui, « aucun attribut inconnu » serait vrai d'un
  // composant qui ne rend aucun élément.
  expect(elements.length).toBeGreaterThan(0);

  const inconnus = new Set(
    elements.flatMap((element) =>
      [...element.attributes]
        .map((attribut) => attribut.name)
        .filter((nom) => !estAttributPermis(nom))
        .map((nom) => `<${element.localName} ${nom}>`),
    ),
  );
  expect([...inconnus]).toEqual([]);
}

/**
 * Compte les occurrences EXACTES d'une séquence littérale. La couverture se compte, elle
 * ne se déclare pas : un `toContain` dit qu'une occurrence existe, jamais combien — et un
 * `not.toContain` à l'échelle d'un élément confondrait deux contextes (`outerHTML`
 * sérialise l'attribut ET le nœud texte, dont un seul est risqué pour le gate).
 */
function compterOccurrences(dans: string, sequence: string): number {
  return dans.split(sequence).length - 1;
}

/** Construit un quiz d'UNE question, pour isoler un cas de validation. */
function quizDe(question: QuestionQuiz): QuizCompile {
  return { lecon: 'injection-sql', titre: 'Quiz', questions: [question] };
}

/** Monte sans attendre le rendu, et rend l'accès qui LÈVE si la question est hors contrat. */
function preparation(quiz: QuizCompile): () => unknown {
  const isole = TestBed.createComponent(Quiz);
  isole.componentRef.setInput('quiz', quiz);
  isole.componentRef.setInput('sujet', SUJET);
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

    it('respecte l’ordre de la SOURCE — `melanger` n’est pas encore implémenté', async () => {
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
      expect(service.estMaitrisee(SUJET, 'injection-sql')).toBe(true);

      await cliquerBouton(hote); // « Recommencer »

      expect(fixture.componentInstance.corrige()).toBe(false);
      expect(hote.querySelector('.verdict')).toBeNull();
      expect(radios(hote, 'quiz-injection').filter((radio) => radio.checked)).toEqual([]);
      // 🔴 La progression, elle, SURVIT : le service ne retient que le meilleur
      // score, et refaire un quiz ne doit pas coûter une maîtrise acquise.
      expect(service.estMaitrisee(SUJET, 'injection-sql')).toBe(true);
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
      // Une seule interrogation du DOM, réutilisée : rejouer le sélecteur dans la
      // boucle la rendrait vacue tout seule le jour où il cesserait de matcher (L-019).
      const labels = [...(groupe?.querySelectorAll('label.paire') ?? [])];
      const etiquettes = labels.map((label) => label.querySelector('span')?.textContent?.trim());
      expect(etiquettes).toEqual(['HSTS', 'X-Frame-Options', 'nosniff']);
      for (const label of labels) {
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

    it('🔴 DEUX PAIRES peuvent partager leur `droite` — la clause de D-1, exécutée', async () => {
      // Le test précédent pose deux champs sur la même valeur d'un lot dont TOUS les
      // `droite` sont distincts : il prouve l'interface (rien n'interdit de rejouer une
      // valeur), pas la décision (une même réponse peut être JUSTE deux fois). C'est ce
      // lot-ci qui exécute la déduplication d'`optionsDroite`, jamais atteinte sinon.
      const hote = await monter(quizDe(Q_ASSOCIER_DROITE_DOUBLE));
      const selects = champs(hote, 'quiz-paires-doublon');
      expect(selects.length).toBe(3);

      // (a) L'option partagée n'apparaît qu'UNE fois dans CHAQUE champ — trois paires,
      // mais deux valeurs de réponse seulement. Les libellés sont écrits en dur (L-012).
      for (const champ of selects) {
        const options = [...champ.options].map((option) => option.value);
        expect(options).toEqual(['', 'défense du transport', 'défense du rendu']);
      }

      // (b) Les deux lignes qui partagent la réponse sont justes SIMULTANÉMENT — c'est
      // le cœur de la décision : forcer l'unicité les aurait rendues incompatibles.
      await associer(hote, 'quiz-paires-doublon', 0, 'défense du transport');
      await associer(hote, 'quiz-paires-doublon', 1, 'défense du rendu');
      await associer(hote, 'quiz-paires-doublon', 2, 'défense du rendu');
      await cliquerBouton(hote);
      expect(hote.querySelector('.verdict')?.getAttribute('data-verdict')).toBe('juste');
      expect(fixture.componentInstance.score()).toBe(1);

      // (c) … et la correction ligne à ligne le DIT pour les deux, chacune avec son mot.
      const lignes = [...hote.querySelectorAll('.ligne-corrigee')];
      expect(lignes.map((ligne) => ligne.getAttribute('data-verdict'))).toEqual([
        'juste',
        'juste',
        'juste',
      ]);
      expect(lignes[1]?.textContent).toContain('Association correcte');
      expect(lignes[2]?.textContent).toContain('Association correcte');
      expect(lignes[1]?.textContent).toContain('X-Frame-Options');
      expect(lignes[2]?.textContent).toContain('nosniff');
    });

    it('CONTRÔLE POSITIF du `droite` partagé : une seule des deux lignes peut être fausse', async () => {
      // Sans lui, « les deux sont justes » serait vrai d'un composant qui déclarerait
      // juste toute ligne dont la valeur figure QUELQUE PART dans le lot — donc d'un
      // composant qui ne compare rien ligne à ligne.
      const hote = await monter(quizDe(Q_ASSOCIER_DROITE_DOUBLE));
      await associer(hote, 'quiz-paires-doublon', 0, 'défense du rendu'); // faux
      await associer(hote, 'quiz-paires-doublon', 1, 'défense du rendu'); // juste
      await associer(hote, 'quiz-paires-doublon', 2, 'défense du rendu'); // juste
      await cliquerBouton(hote);

      expect(hote.querySelector('.verdict')?.getAttribute('data-verdict')).toBe('faux');
      expect(
        [...hote.querySelectorAll('.ligne-corrigee')].map((l) => l.getAttribute('data-verdict')),
      ).toEqual(['faux', 'juste', 'juste']);
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

    it('🔴 un `code` terminé par un SAUT DE LIGNE ne rend AUCUNE radio surnuméraire', async () => {
      // LE DÉFAUT QUE CETTE ASSERTION FERME (revue du lot B, E2-ST4). Ce composant
      // découpait avec `question.code.split('\n')`, c'est-à-dire avec la formule que
      // `tools/content-pipeline/compter-lignes.mjs` existe justement pour remplacer. Un
      // `code` terminé par un saut — les auteurs en écrivent, la fixture
      // `__fixtures__/invalides/quiz-ligne-fautive-hors-extrait` en est faite — rendait
      // donc une ligne VIDE de plus : une radio « Ligne 3 » au `<code>` vide,
      // SÉLECTIONNABLE et toujours fausse, sur un quiz que le build avait validé.
      // ⚠️ Ce test regarde le DOM. La PARITÉ des deux formules — celle d'ici et celle du
      // pipeline — se mesure ailleurs, sur un corpus : `src/compter-lignes-parite.spec.ts`.
      const faille = Q_FAILLE as Extract<QuestionQuiz, { type: 'trouver-la-faille' }>;
      const hote = await monter(quizDe({ ...faille, code: `${faille.code}\n` }));
      const groupe = hote.querySelector('[id="quiz-faille-php"]');

      const lignes = [...(groupe?.querySelectorAll('.code-numerote > li') ?? [])];
      expect(lignes.length).toBe(2);
      const boutons = radios(hote, 'quiz-faille-php');
      expect(boutons.map((bouton) => bouton.value)).toEqual(['1', '2']);
      // Aucun libellé de ligne VIDE : c'est la forme exacte qu'aurait prise la radio
      // fantôme, et la seule qui distingue ce test d'un simple compte.
      for (const ligne of lignes) {
        expect((ligne.querySelector('code')?.textContent ?? '').length).toBeGreaterThan(0);
      }
      // Le `\r` d'un `quiz.json` enregistré sur ce poste ne doit pas non plus finir en
      // queue de libellé (L-015) : `\r?` fait partie de la formule de référence.
      const avecCrlf = await monter(
        quizDe({ ...faille, id: 'faille-crlf', code: 'a;\r\nb;\r\n' }),
      );
      const lignesCrlf = [
        ...avecCrlf.querySelectorAll('[id="quiz-faille-crlf"] .code-numerote > li code'),
      ];
      expect(lignesCrlf.map((c) => c.textContent)).toEqual(['a;', 'b;']);
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
      // La classe `.mention-provisoire` n'existant plus NULLE PART, l'ancienne assertion
      // « elle est absente du rendu » était devenue VACUE : plus rien ne pouvait la faire
      // rougir. C'est le motif L-019 que ce fichier prêche par ailleurs. Ce qui la
      // remplace peut tomber : les CINQ questions sont rendues et corrigées, aucune n'est
      // mise de côté — c'est ce que la fin des questions provisoires signifie vraiment.
      expect(hote.querySelectorAll('fieldset').length).toBe(5);
      expect(hote.querySelectorAll('.verdict').length).toBe(5);
    });

    it('🔴 ÉCRIT la progression sur un quiz mixte — c’est la fin de la retenue du lot C', async () => {
      const hote = await monter(QUIZ_MIXTE);
      await toutRepondre(hote);
      await cliquerBouton(hote);

      const service = TestBed.inject(ProgressionService);
      expect(service.etatDe(SUJET, 'injection-sql')).toEqual({
        lue: true,
        meilleurScore: 5,
        totalQuestions: 5,
      });
      expect(service.estMaitrisee(SUJET, 'injection-sql')).toBe(true);
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
      const service = TestBed.inject(ProgressionService);
      expect(service.etatDe(SUJET, 'injection-sql').meilleurScore).toBe(4);
    });

    it('🔴 enregistre sous le sujet REÇU — deux cours, même slug, deux progressions', async () => {
      // E2-ST6, lot A2. C'est le contrat que la clef composite `(sujet, slug)` existe pour
      // tenir, et le seul test qui puisse le faire tomber : la phase 1 porte DEUX cours
      // (sécurité web et PHP, §E7), et deux leçons de sujets différents peuvent partager un
      // slug. Un `sujet` en dur dans le composant — ou pris à l'URL — resterait vert sur
      // toutes les assertions ci-dessus, qui n'emploient qu'un seul sujet.
      const service = TestBed.inject(ProgressionService);

      // Cours n°1 : les trois bonnes réponses.
      const cours1 = await monter(QUIZ_CORRIGEABLE, 'securite-web');
      await repondre(cours1, 'quiz-injection', 'requete-preparee');
      await repondre(cours1, 'quiz-csp', 'faux');
      await repondre(cours1, 'quiz-entetes', 'sniff');
      await cliquerBouton(cours1);

      // Cours n°2 : MÊME slug de leçon, autre sujet, et une réponse fausse.
      const cours2 = await monter(QUIZ_CORRIGEABLE, 'php');
      await repondre(cours2, 'quiz-injection', 'liste-noire');
      await repondre(cours2, 'quiz-csp', 'faux');
      await repondre(cours2, 'quiz-entetes', 'sniff');
      await cliquerBouton(cours2);

      expect(service.etatDe('securite-web', 'injection-sql').meilleurScore).toBe(3);
      expect(service.etatDe('php', 'injection-sql').meilleurScore).toBe(2);
      // Les deux ne se mélangent pas, et la conséquence VISIBLE est la maîtrise : le
      // sommaire du cours de sécurité allumera son module, celui de PHP non.
      expect(service.estMaitrisee('securite-web', 'injection-sql')).toBe(true);
      expect(service.estMaitrisee('php', 'injection-sql')).toBe(false);
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
        // 🔴 LE CONTRÔLE POSITIF DE LA CLEF NORMALISÉE (lot E-a). Ces deux `gauche` sont
        // deux chaînes d'octets DIFFÉRENTES — la seconde finit par une U+00A0 — et un
        // `Set` sur les valeurs brutes les acceptait. Le rendu posait alors deux `<select>`
        // au nom accessible identique, c'est-à-dire exactement ce que la règle interdit.
        // Le cas n'a rien d'exotique : `.claude/rules/contenu-pedagogique.md` §3 IMPOSE
        // U+00A0 dans le contenu du site. La blanche est écrite en séquence d'échappement
        // pour qu'on la VOIE à la relecture (même consigne que l'en-tête de `quiz.ts`).
        nom: 'deux `gauche` que seule une U+00A0 sépare — indiscernables à l’écran',
        question: {
          ...ASSOCIER,
          paires: [
            { gauche: 'HSTS', droite: 'force HTTPS' },
            { gauche: 'HSTS\u00a0', droite: 'interdit le cadrage' },
          ],
        },
        attendu: /même « gauche ».*rien ne les distingue à l’écran/,
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
      expect(TestBed.inject(ProgressionService).estMaitrisee(SUJET, 'injection-sql')).toBe(true);
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
      exigerQu_aucunNoeudNeSoitNe(hote, groupe);
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

    it('🔴 S-011 sur le chemin `associer` — les deux mains, `gauche` ET `droite`', async () => {
      // Le test ci-dessus n'exerce qu'UN type sur quatre. Or le lot D a ouvert quatre
      // sites de texte d'auteur de plus, dont le `gauche` et le `droite` d'un `associer` :
      // une leçon sur le XSS appariera littéralement `onerror="…"` à son vecteur.
      const hote = await monter(quizDe(Q_ASSOCIER_XSS));
      const groupe = hote.querySelector('[id="quiz-paires-xss"]');

      // MAIN 1 — CONTRÔLE POSITIF (L-019) : les deux côtés sont à l'écran, ENTIERS.
      const texte = groupe?.textContent ?? '';
      expect(texte).toContain('<img src=x onerror="alert(\'XSS\')">');
      expect(texte).toContain('<script>alert(1)</script>');
      expect(texte).toContain('un attribut style="color:red"');
      // … et pas un nœud n'en est né.
      exigerQu_aucunNoeudNeSoitNe(hote, groupe);
      // Les étiquettes ne portent QUE du texte : aucune balise n'a été interprétée.
      // CONTRÔLE POSITIF (L-019) avant la boucle : sans lui, un sélecteur qui ne
      // matche plus rien rendrait cette vérification VACUE — elle ne pourrait plus
      // rougir. C'est le défaut que ce même diff répare 350 lignes plus haut.
      const etiquettes = [...(groupe?.querySelectorAll('label.paire > span') ?? [])];
      expect(etiquettes.length).toBe(2);
      for (const span of etiquettes) {
        expect(span.children.length).toBe(0);
      }

      // MAIN 2 — la séquence que `tools/deploiement/generer-config-swa.mjs` cherche dans
      // le HTML prerendu survit INTACTE, parce qu'Angular n'échappe pas les guillemets.
      // Si cette assertion tombe, c'est la note S-011 de `quiz.ts` qui doit partir dans
      // le même diff — jamais le gate qui doit s'assouplir.
      const html = groupe?.innerHTML ?? '';
      expect(html).toContain('&lt;img');
      expect(html).toContain(' onerror="');
      expect(html).toContain(' style="color:red"');
    });

    it('S-011 · en contexte d’ATTRIBUT la séquence ne se forme pas — la moitié JSDOM', async () => {
      // 🔴 CE QUE CE TEST MESURE, ET CE QU'IL NE MESURE PAS. La revue de sécurité du lot D
      // avait instrumenté DEUX sérialiseurs : domino (celui du prerender) et jsdom. Un `"`
      // posé dans une valeur d'attribut y est sérialisé `&quot;`, donc les motifs du gate —
      // qui exigent un guillemet LITTÉRAL — ne peuvent pas s'y former.
      // CE test-ci n'exerce que JSDOM, parce que c'est le seul DOM que le `TestBed` a. La
      // moitié DOMINO se re-mesure au PRERENDER, au lot E-b, sur une page de leçon
      // réellement construite : écrire « mesure du lot D » ici laisserait croire que les
      // deux moitiés sont tenues par ce fichier.
      const hote = await monter(quizDe(Q_ASSOCIER_XSS));
      const groupe = hote.querySelector('[id="quiz-paires-xss"]');
      const chargee = [...(groupe?.querySelectorAll('option') ?? [])].find((option) =>
        option.value.includes('style='),
      );

      // CONTRÔLE POSITIF : la valeur d'attribut porte bien la charge, guillemets compris.
      expect(chargee?.value).toBe('un attribut style="color:red"');

      // … et sa SÉRIALISATION ne peut pas nourrir le gate : le guillemet y est une
      // ENTITÉ. L'attendu est écrit en toutes lettres plutôt qu'en « ne contient pas » —
      // l'`<option>` sérialisée porte AUSSI son nœud texte, où la charge est littérale,
      // et un « ne contient pas » sur l'élément entier confondrait les deux contextes.
      const serialise = chargee?.outerHTML ?? '';
      expect(serialise).toContain('value="un attribut style=&quot;color:red&quot;"');

      // La preuve que les deux contextes cohabitent SANS se confondre : la séquence
      // littérale n'apparaît qu'UNE fois dans l'élément — celle du nœud texte. Deux
      // occurrences voudraient dire que l'attribut a cessé d'être échappé.
      const litterales = serialise.split(' style="color:red"').length - 1;
      expect(litterales).toBe(1);
    });

    it('🔴 S-011 sur le champ `correction` — du CODE CORRIGÉ, donc des attributs légitimes', async () => {
      // `correction` ne se rend qu'APRÈS le clic. C'est le site le moins évident du lot :
      // un correctif écrit naturellement ` style="…"`, sans aucune intention d'attaque.
      const hote = await monter(quizDe(Q_FAILLE_CORRECTION_XSS));
      await cliquerBouton(hote);
      const groupe = hote.querySelector('[id="quiz-faille-correction"]');

      // MAIN 1 — la correction est à l'écran, entière, et rien n'en est né.
      const rendu = groupe?.querySelector('.correction code');
      expect(rendu?.textContent).toContain('<p style="color:red">');
      expect(rendu?.textContent).toContain('onerror="…"');
      expect(rendu?.children.length).toBe(0);
      exigerQu_aucunNoeudNeSoitNe(hote, groupe);

      // MAIN 2 — les DEUX motifs du gate survivent dans le nœud texte.
      const html = groupe?.innerHTML ?? '';
      expect(html).toContain(' style="color:red"');
      expect(html).toContain(' onerror="…"');
    });

    it('🔴 S-011 sur le chemin `choix-multiple` — `question` ET `choix[].texte`', async () => {
      // Ces deux sites sont nommés dans la liste S-011 de `quiz.ts` et n'avaient AUCUNE
      // assertion avant le lot E-a : l'en-tête de ce fichier promettait « les quatre
      // types » et n'en couvrait que deux.
      const hote = await monter(quizDe(Q_CHOIX_XSS));
      const groupe = hote.querySelector('[id="quiz-choix-xss"]');

      // MAIN 1 — CONTRÔLE POSITIF (L-019) : les deux charges sont à l'écran, ENTIÈRES.
      const texte = groupe?.textContent ?? '';
      expect(texte).toContain('<img src=x onerror="alert(\'XSS\')">');
      expect(texte).toContain('style="color:red"');
      // … et pas un nœud n'en est né.
      exigerQu_aucunNoeudNeSoitNe(hote, groupe);
      const libelles = [...(groupe?.querySelectorAll('label.choix > span.libelle') ?? [])];
      expect(libelles.length).toBe(2);
      for (const libelle of libelles) {
        expect(libelle.children.length).toBe(0);
      }

      // MAIN 2 — la séquence que `generer-config-swa.mjs` cherche survit INTACTE dans le
      // HTML sérialisé. COMPTÉE, pas seulement présente : les `value` des radios sont des
      // `id` kebab-case, donc aucune occurrence ne peut venir d'un contexte d'attribut —
      // une occurrence de plus dirait qu'un site inattendu s'est mis à porter la charge.
      const html = groupe?.innerHTML ?? '';
      expect(html).toContain('&lt;img');
      expect(compterOccurrences(html, ' onerror="')).toBe(1);
      expect(compterOccurrences(html, ' style="color:red"')).toBe(1);
    });

    it('🔴 S-011 sur le chemin `vrai-faux` — `affirmation` ET `justification`', async () => {
      // La `justification` ne se rend qu'APRÈS le clic, comme `correction` : sans lui,
      // la moitié du site d'auteur de ce type resterait hors du champ du test.
      const hote = await monter(quizDe(Q_VRAI_FAUX_XSS));
      await cliquerBouton(hote);
      const groupe = hote.querySelector('[id="quiz-vrai-faux-xss"]');

      // MAIN 1 — les deux charges sont à l'écran, entières, et rien n'en est né.
      const texte = groupe?.textContent ?? '';
      expect(texte).toContain('<img src=x onerror="alert(\'XSS\')">');
      expect(texte).toContain('<p style="color:red">');
      expect(groupe?.querySelector('.explication')?.children.length).toBe(0);
      exigerQu_aucunNoeudNeSoitNe(hote, groupe);

      // MAIN 2 — comptée : une occurrence dans l'affirmation, une dans la justification.
      const html = groupe?.innerHTML ?? '';
      expect(html).toContain('&lt;img');
      expect(compterOccurrences(html, ' onerror="')).toBe(1);
      expect(compterOccurrences(html, ' style="color:red"')).toBe(1);
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
