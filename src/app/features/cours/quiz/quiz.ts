// =============================================================================
// Quiz — le quiz d'une leçon, rendu à l'ancre `[[quiz]]` (E2-ST3, lot C)
// -----------------------------------------------------------------------------
// CE QU'IL FAIT, ET RIEN D'AUTRE. Il reçoit le `QuizCompile` émis par le pipeline
// (lot B) — jamais du JSON brut, jamais un chargement réseau — et le pose dans la
// page : une question par `<fieldset>`, un bouton de correction, un résumé chiffré.
// Il ne route rien, ne charge rien, et ne connaît ni le slug de l'URL ni le
// sommaire. La seule chose qu'il ÉCRIT hors de lui-même est l'avancement, par
// `ProgressionService`.
//
// 🔴 POURQUOI `cours/lecon` A LE DROIT D'IMPORTER `cours/quiz`, ALORS QUE LA RÈGLE
// DIT « AUCUNE FEATURE N'IMPORTE UNE AUTRE FEATURE ».
// La règle (`docs/architecture/stack-et-architecture.md` §7) vise le COUPLAGE
// D'ÉTAT LATÉRAL entre deux features de même rang : `cours/quiz` écrit un
// avancement que `cours/sommaire` lit, et le seul chemin légitime entre elles est
// `core/progression/` — jamais un import de l'une vers l'autre. Ce qui se passe
// ici est l'autre relation, la composition DESCENDANTE d'une page vers son widget :
// `lecon` (la page) rend `quiz` (le composant), dans un seul sens, sans retour.
// Sans elle, aucune page ne pourrait rendre quoi que ce soit. Les deux se
// distinguent à un test simple : `quiz/` n'importe RIEN de `lecon/`, et
// `quiz/` ne lit aucun état que `lecon/` posséderait. La flèche ne part jamais
// d'ici vers une autre feature — elle part de `core/`, ou de nulle part.
//
// LA FORME EST UN FORMULAIRE COMPLET, PAS UN ASSISTANT PAS-À-PAS. Les N questions
// sont TOUTES dans le document, et un seul bouton corrige l'ensemble. Ce n'est pas
// un choix d'ergonomie : la page est prerendue et `withNoIncrementalHydration()`
// est actif (`src/app/app.config.ts`). Sans JavaScript, le document livré doit
// rester complet et lisible — seule la CORRECTION manque alors, et rien d'autre.
// Un assistant qui masquerait les questions 2 à N derrière un bouton n'afficherait
// qu'une question sur une page sans JS, et exigerait une gestion de focus dont
// aucun gate clavier ne sortirait indemne.
//
// PAS DE FORMULAIRE RÉACTIF, ET PAS DE `<form>` NON PLUS. Les radios sont natives,
// pilotées en `[checked]` / `(change)` sur des signaux — exactement le patron de
// `core/layout/bascule-theme`. Un `<form>` sans `action` réagirait à la touche
// Entrée en rechargeant la page si le JavaScript venait à manquer, c'est-à-dire en
// effaçant les réponses saisies : un `<div>` ne fait rien, ce qui est le
// comportement honnête d'une page non hydratée.
//
// LE CONTRAT VIENT DE `tools/content-pipeline/types.d.ts`. `QuizCompile`,
// `QuestionQuiz` et `ChoixDeQuestion` sont AMBIANTS — aucun `import` à écrire, et
// surtout aucune copie du contrat à maintenir (L-016).
//
// LE PARTAGE DE LA VALIDATION, ÉCRIT DES DEUX CÔTÉS. `lireLeconCompilee`
// (`../contenu-compile`) vérifie l'ENVELOPPE du quiz : existence, appariement au
// slug, `id` kebab-case unique, `type` de la liste nominative, collision avec les
// ancres de section. Les champs PROPRES à chaque type sont vérifiés ICI, au moment
// où ils sont lus — même partage que `sections`/`blocs` avec `RenduBlocs`. Un
// champ manquant LÈVE en nommant la question : le rendu ayant lieu au prerender,
// l'échec casse `npm run build` au lieu d'afficher une question vide en silence.
//
// ⚠️ RÉDACTION : blanches insécables U+00A0 UNIQUEMENT, écrites `&nbsp;` dans le
// gabarit et en séquence d'échappement dans le code, pour qu'on les VOIE à la
// relecture — une blanche insécable posée en clair est indistinguable d'une espace
// ordinaire, et `no-irregular-whitespace` la refuse. Jamais
// U+202F ni U+2009, absentes de Fraunces comme d'Inter
// (`.claude/rules/contenu-pedagogique.md` §3).
// =============================================================================

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { ProgressionService } from '../../../core/progression/progression';
import { PREFIXE_ID_QUESTION } from '../contenu-compile';

/**
 * Le kebab-case du schéma (`quiz.schema.json` §identifiant), appliqué ici aux `id`
 * de PROPOSITION — ceux des questions sont déjà contrôlés par `lireLeconCompilee`.
 * Écrit et non importé : la constante de `contenu-compile.ts` est privée, et la
 * partager pour la partager rendrait ce fichier dépendant d'un détail qui ne le
 * concerne pas. Les deux motifs sont identiques parce que le schéma est unique.
 */
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Les deux valeurs d'un `vrai-faux` côté DOM. Un `<input type="radio">` ne porte
 * que des chaînes : le booléen du contrat se traduit ici, à un seul endroit, plutôt
 * que par des `'true'` semés dans le gabarit.
 */
const VALEUR_VRAI = 'vrai';
const VALEUR_FAUX = 'faux';

/** Une ligne de code de `trouver-la-faille`, numérotée dès 1 comme `ligneFautive`. */
interface LigneDeCode {
  readonly numero: number;
  readonly texte: string;
}

type QuestionChoixMultiple = Extract<QuestionQuiz, { type: 'choix-multiple' }>;
type QuestionVraiFaux = Extract<QuestionQuiz, { type: 'vrai-faux' }>;
type QuestionProvisoire = Extract<QuestionQuiz, { type: 'associer' | 'trouver-la-faille' }>;

/**
 * Une question prête à rendre. La `forme` n'est pas le `type` du contrat : elle
 * réunit `associer` et `trouver-la-faille` sous « provisoire », parce que le
 * gabarit les traite pareil (énoncé lisible, aucune interaction, hors du score).
 * Le `type` d'origine reste dans `source` — c'est lui qui distingue les deux
 * énoncés à l'affichage.
 */
type QuestionPreparee =
  | { forme: 'choix-multiple'; idDocument: string; source: QuestionChoixMultiple }
  | { forme: 'vrai-faux'; idDocument: string; source: QuestionVraiFaux }
  | {
      forme: 'provisoire';
      idDocument: string;
      source: QuestionProvisoire;
      lignes: readonly LigneDeCode[];
    };

/** Les deux formes que le lot C sait corriger. Les autres sortent du dénominateur. */
type QuestionCorrigeable = Extract<QuestionPreparee, { forme: 'choix-multiple' | 'vrai-faux' }>;

/** Le verdict d'une question corrigée — TROIS états, pas deux (WCAG 1.4.1). */
type Verdict = 'juste' | 'faux' | 'absente';

/** Le mot ÉCRIT de chaque verdict. La couleur ne porte jamais l'information seule. */
const MOTS_DU_VERDICT: Record<Verdict, string> = {
  juste: 'Bonne réponse',
  faux: 'Réponse incorrecte',
  absente: 'Aucune réponse — comptée comme fausse',
};

function estRempli(valeur: unknown): boolean {
  return typeof valeur === 'string' && valeur.trim() !== '';
}

@Component({
  selector: 'app-quiz',
  styleUrl: './quiz.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="quiz">
      <!--
        h3, et non h2 : le gabarit de leçon impose l'ancre du quiz sous une section
        de niveau 2 (docs/contenu/pipeline-contenu.md, section « À toi de jouer »),
        et un niveau sauté est une violation de WCAG 1.3.1 que axe attrape.
        tabindex="-1" n'ajoute rien à la tabulation : il rend le titre CIBLABLE, ce
        dont « Recommencer » a besoin pour ne pas laisser le focus dans le vide
        quand son propre bouton disparaît.
      -->
      <h3 #titre class="titre" tabindex="-1">{{ quiz().titre }}</h3>

      <p class="consigne-generale">
        Répondez aux questions, puis corrigez l’ensemble d’un seul coup. Une question
        laissée sans réponse compte comme fausse.
      </p>

      <div class="questions">
        @for (question of questionsPreparees(); track question.source.id) {
          <!--
            L'id du document vient de PREFIXE_ID_QUESTION, jamais d'une chaîne
            recopiée : les id de question et les ancres de section partagent
            l'espace de noms du document, et lireLeconCompilee refuse déjà une
            leçon où les deux se heurteraient. Recopier le préfixe ici ferait
            diverger le contrôle et le rendu (L-016).
          -->
          <fieldset class="question" [id]="question.idDocument">
            @switch (question.forme) {
              @case ('choix-multiple') {
                <legend class="enonce">{{ question.source.question }}</legend>

                @for (choix of question.source.choix; track choix.id) {
                  <label class="choix">
                    <input
                      class="pastille"
                      type="radio"
                      [name]="question.idDocument"
                      [value]="choix.id"
                      [checked]="reponseDe(question.source.id) === choix.id"
                      [disabled]="corrige()"
                      (change)="repondre(question.source.id, choix.id)"
                    />
                    <span class="libelle">{{ choix.texte }}</span>
                  </label>
                }
              }

              @case ('vrai-faux') {
                <legend class="enonce">{{ question.source.affirmation }}</legend>

                @for (option of optionsVraiFaux; track option.valeur) {
                  <label class="choix">
                    <input
                      class="pastille"
                      type="radio"
                      [name]="question.idDocument"
                      [value]="option.valeur"
                      [checked]="reponseDe(question.source.id) === option.valeur"
                      [disabled]="corrige()"
                      (change)="repondre(question.source.id, option.valeur)"
                    />
                    <span class="libelle">{{ option.libelle }}</span>
                  </label>
                }
              }

              @case ('provisoire') {
                <legend class="enonce">{{ question.source.consigne }}</legend>

                @if (question.source.type === 'trouver-la-faille') {
                  <!--
                    Le code part NON ÉCHAPPÉ de l'artéfact (c'est voulu : il porte
                    la numérotation de ligneFautive et le texte accessible), et il
                    est volontairement vulnérable. Il est INTERPOLÉ, donc Angular
                    l'échappe — aucune liaison de HTML brut, aucun contournement
                    du sanitizer (les deux noms ne sont même pas prononcés dans ce
                    fichier : le garde-fou de portée du dépôt les cherche), et
                    htmlColore n'est PAS lu au lot C.
                    ⚠️ MODE D'ÉCHEC À CONNAÎTRE, ET IL PORTE SUR DEUX MOTIFS, PAS UN.
                    Le gate de déploiement tools/deploiement/generer-config-swa.mjs
                    balaie le HTML prerendu et refuse DEUX séquences : le style
                    en ligne (« espace + style= » suivi d'un guillemet, ligne 379)
                    ET tout gestionnaire d'événement en ligne (« espace + on… = »
                    suivi d'un guillemet, ligne 333). Or l'interpolation d'Angular
                    n'échappe que &, < et > : un texte de question contenant
                    onerror= entre guillemets — charge parfaitement plausible pour
                    une leçon sur le XSS, exactement comme style= l'est pour une
                    leçon sur la CSP — arrive INTACT dans le HTML servi et fera
                    échouer le build sur un message parlant de CSP, alors que la
                    cause sera un texte de quiz. Fail-closed, donc sain ; le
                    diagnostic, lui, serait trompeur sans cette note. La parade est
                    d'écrire la charge autrement dans la leçon (guillemets
                    typographiques, entité), JAMAIS d'assouplir le garde-fou :
                    ce site enseigne la CSP.
                  -->
                  <ol class="code-numerote">
                    @for (ligne of question.lignes; track ligne.numero) {
                      <li><code>{{ ligne.texte }}</code></li>
                    }
                  </ol>
                }

                <p class="mention-provisoire">
                  Cette question n’est pas encore corrigeable&nbsp;: elle arrive bientôt,
                  et elle ne compte pas dans le résultat.
                </p>
              }
            }

            @if (corrige() && question.forme !== 'provisoire') {
              <p class="verdict" [attr.data-verdict]="verdictDe(question)">
                <b class="mot">{{ motDuVerdict(question) }}</b>
              </p>

              @if (verdictDe(question) !== 'juste') {
                <p class="attendue">
                  Réponse attendue&nbsp;:&nbsp;<b>{{ reponseAttendue(question) }}</b>
                </p>
              }

              <p class="explication">{{ explicationDe(question) }}</p>
            }
          </fieldset>
        }
      </div>

      <div class="commandes">
        @if (corrige()) {
          <button class="bouton" type="button" (click)="recommencer()">
            Recommencer le quiz
          </button>
        } @else {
          <button class="bouton" type="button" (click)="corriger()">
            Corriger mes réponses
          </button>
        }
      </div>

      <!--
        Région live PRÉSENTE DÈS LE PREMIER RENDU, et vide tant que rien n'a été
        corrigé : une région insérée en même temps que son texte n'est pas annoncée
        par les lecteurs d'écran. tabindex="-1" la rend ciblable — le focus y va
        après correction, parce que le bouton qui l'a déclenchée est remplacé.
      -->
      <p #regionResume class="resume" role="status" tabindex="-1">{{ resume() }}</p>
    </section>
  `,
})
export class Quiz {
  private readonly progression = inject(ProgressionService);
  private readonly injecteur = inject(Injector);

  /**
   * Le quiz de la leçon, REQUIS. Un input optionnel laisserait passer le trou
   * silencieux que le compte d'ancres `[[quiz]]` du compilateur existe pour
   * interdire : un composant monté sans données rendrait une coquille vide, sur une
   * page publiée, sans qu'aucun gate ne rougisse.
   */
  readonly quiz = input.required<QuizCompile>();

  private readonly titreElement = viewChild<ElementRef<HTMLElement>>('titre');
  private readonly resumeElement = viewChild<ElementRef<HTMLElement>>('regionResume');

  /** Les réponses en cours de saisie, par `id` de question. */
  private readonly reponses = signal<ReadonlyMap<string, string>>(new Map());

  /**
   * L'INSTANTANÉ des réponses au moment de la correction, ou `null` avant elle.
   *
   * Les réponses sont GELÉES à la correction (les radios passent en `disabled`)
   * plutôt que recalculées en continu. La raison n'est pas ergonomique : le score
   * est ÉCRIT dans `ProgressionService` à cet instant précis, et un verdict qui
   * continuerait de bouger afficherait un résultat que rien n'a enregistré.
   */
  private readonly reponsesCorrigees = signal<ReadonlyMap<string, string> | null>(null);

  /** `true` dès que « Corriger » a été actionné, jusqu'à « Recommencer ». */
  readonly corrige = computed(() => this.reponsesCorrigees() !== null);

  /** Les deux options d'un `vrai-faux`, écrites une fois. */
  protected readonly optionsVraiFaux = [
    { valeur: VALEUR_VRAI, libelle: 'Vrai' },
    { valeur: VALEUR_FAUX, libelle: 'Faux' },
  ] as const;

  /**
   * Valide puis prépare les questions. C'est ici que le contrat est confronté à la
   * donnée : un champ manquant LÈVE, en nommant la question.
   *
   * ⚠️ `melanger` EST IGNORÉ, ET CE N'EST PAS UN OUBLI. Le champ existe au contrat
   * (`QuizCompile.melanger`), mais mélanger les questions côté client désaligne le
   * DOM hydraté du DOM prerendu : la page est produite au build, avec un ordre
   * fixe, et le navigateur reprend cet ordre-là. L'ordre rendu est donc celui de la
   * source, toujours. Ce qu'il faudrait pour l'honorer — mélanger au build par
   * leçon, ou ne mélanger qu'après hydratation en acceptant un saut visible —
   * reste à trancher (lot D ou plus tard) ; l'implémenter « au cas où » aurait posé
   * un défaut d'hydratation avant même qu'on ait choisi.
   */
  readonly questionsPreparees = computed<readonly QuestionPreparee[]>(() =>
    this.quiz().questions.map((question, rang) => this.preparer(question, rang)),
  );

  /** Les questions qui entrent dans le score — le dénominateur. */
  readonly corrigeables = computed<readonly QuestionCorrigeable[]>(() =>
    this.questionsPreparees().filter(
      (question): question is QuestionCorrigeable => question.forme !== 'provisoire',
    ),
  );

  /** Les questions rendues en PROVISOIRE (`associer`, `trouver-la-faille`). */
  readonly provisoires = computed(() =>
    this.questionsPreparees().filter((question) => question.forme === 'provisoire'),
  );

  /** Nombre de bonnes réponses de l'instantané corrigé. `0` avant correction. */
  readonly score = computed(() => {
    const instantane = this.reponsesCorrigees();
    if (instantane === null) return 0;
    return this.corrigeables().filter(
      (question) => this.verdict(question, instantane) === 'juste',
    ).length;
  });

  /** Le dénominateur affiché ET enregistré : les seules questions corrigées. */
  readonly total = computed(() => this.corrigeables().length);

  /**
   * Le texte de la région live. Vide avant correction — la région existe quand
   * même, sinon son apparition ne serait pas annoncée.
   */
  readonly resume = computed(() => {
    const instantane = this.reponsesCorrigees();
    if (instantane === null) return '';

    const score = this.score();
    const total = this.total();
    const sansReponse = this.corrigeables().filter(
      (question) => this.verdict(question, instantane) === 'absente',
    ).length;
    const enAttente = this.provisoires().length;

    const phrases = [
      `${score} bonne${score > 1 ? 's' : ''} réponse${score > 1 ? 's' : ''} ` +
        `sur ${total} question${total > 1 ? 's' : ''} corrigée${total > 1 ? 's' : ''}.`,
    ];
    if (sansReponse > 0) {
      phrases.push(
        `Dont ${sansReponse} sans réponse, comptée${sansReponse > 1 ? 's' : ''} comme fausse${
          sansReponse > 1 ? 's' : ''
        }.`,
      );
    }
    if (enAttente > 0) {
      // Le résumé DIT que rien n'est enregistré : une progression muette laisserait
      // croire à une maîtrise acquise sur un quiz à moitié corrigé.
      phrases.push(
        `${enAttente} question${enAttente > 1 ? 's' : ''} arrive${enAttente > 1 ? 'nt' : ''} ` +
          'bientôt et ne compte' +
          (enAttente > 1 ? 'nt' : '') +
          ' pas ; votre avancement n’est donc pas enregistré pour cette leçon.',
      );
    }
    return phrases.join(' ');
  });

  /** La réponse en cours pour une question, ou `undefined`. */
  reponseDe(id: string): string | undefined {
    return this.reponses().get(id);
  }

  /** Enregistre une réponse. Sans effet une fois le quiz corrigé. */
  repondre(id: string, valeur: string): void {
    if (this.corrige()) return;
    const suivant = new Map(this.reponses());
    suivant.set(id, valeur);
    this.reponses.set(suivant);
  }

  /**
   * Corrige l'ensemble, puis enregistre — SAUF si une question provisoire est
   * présente.
   *
   * 🔴 C'EST LA RÈGLE LA PLUS IMPORTANTE DU LOT. Tant que `associer` et
   * `trouver-la-faille` ne sont pas corrigeables (lot D), un quiz qui en contient
   * ne peut pas produire une mesure de maîtrise honnête : 3/3 sur 5 questions
   * marquerait la leçon « maîtrisée » (seuil 0,8) en n'ayant jamais évalué les deux
   * plus difficiles. On préfère ne RIEN écrire — une progression absente se
   * rattrape, une fausse maîtrise se croit.
   */
  corriger(): void {
    this.reponsesCorrigees.set(new Map(this.reponses()));

    if (this.provisoires().length === 0) {
      this.progression.enregistrerQuiz(this.quiz().lecon, this.score(), this.total());
    }

    // Le focus va sur le résumé, pas sur le bouton : celui-ci vient d'être remplacé
    // par « Recommencer », et un focus perdu retomberait sur `<body>` (WCAG 2.4.3).
    // `afterNextRender` attend que le DOM porte le texte du résumé, et ne s'exécute
    // jamais au prerender — ce qui est exactement voulu.
    this.deplacerFocusVers(() => this.resumeElement());
  }

  /**
   * Remet l'état de saisie à zéro. **N'efface RIEN** de `ProgressionService` : le
   * service ne retient que le MEILLEUR score, et refaire un quiz ne doit pas coûter
   * une maîtrise déjà acquise.
   */
  recommencer(): void {
    this.reponses.set(new Map());
    this.reponsesCorrigees.set(null);
    // Le bouton « Recommencer » disparaît en même temps qu'il est actionné : sans
    // ce déplacement, le focus retomberait sur `<body>`.
    this.deplacerFocusVers(() => this.titreElement());
  }

  /** Le verdict affiché d'une question corrigée. */
  verdictDe(question: QuestionPreparee): Verdict | null {
    if (question.forme === 'provisoire') return null;
    const instantane = this.reponsesCorrigees();
    if (instantane === null) return null;
    return this.verdict(question, instantane);
  }

  /** Le MOT du verdict — troisième canal de WCAG 1.4.1, jamais la couleur seule. */
  motDuVerdict(question: QuestionPreparee): string {
    const verdict = this.verdictDe(question);
    return verdict === null ? '' : MOTS_DU_VERDICT[verdict];
  }

  /** L'explication écrite PAR LE CONTENU — aucun texte n'est fabriqué ici. */
  explicationDe(question: QuestionPreparee): string {
    if (question.forme === 'choix-multiple') return question.source.explication;
    if (question.forme === 'vrai-faux') return question.source.justification;
    return '';
  }

  /** La bonne réponse, en toutes lettres, quand le visiteur s'est trompé. */
  reponseAttendue(question: QuestionPreparee): string {
    if (question.forme === 'vrai-faux') {
      return question.source.bonneReponse ? 'Vrai' : 'Faux';
    }
    if (question.forme === 'choix-multiple') {
      const attendu = question.source.choix.find(
        (choix) => choix.id === question.source.bonneReponse,
      );
      // `preparer()` a déjà refusé un `bonneReponse` hors des propositions : ce
      // repli n'est atteignable que si ce contrôle disparaissait.
      return attendu?.texte ?? question.source.bonneReponse;
    }
    return '';
  }

  private verdict(question: QuestionCorrigeable, instantane: ReadonlyMap<string, string>): Verdict {
    const donnee = instantane.get(question.source.id);
    if (donnee === undefined) return 'absente';
    if (question.forme === 'choix-multiple') {
      return donnee === question.source.bonneReponse ? 'juste' : 'faux';
    }
    const attendue = question.source.bonneReponse ? VALEUR_VRAI : VALEUR_FAUX;
    return donnee === attendue ? 'juste' : 'faux';
  }

  private deplacerFocusVers(cible: () => ElementRef<HTMLElement> | undefined): void {
    afterNextRender(
      () => {
        cible()?.nativeElement.focus();
      },
      { injector: this.injecteur },
    );
  }

  // ---------------------------------------------------------------------------
  // Validation nominative des champs PROPRES à chaque type
  // ---------------------------------------------------------------------------

  private preparer(question: QuestionQuiz, rang: number): QuestionPreparee {
    const idDocument = `${PREFIXE_ID_QUESTION}${question.id}`;

    switch (question.type) {
      case 'choix-multiple':
        this.validerChoixMultiple(question, rang);
        return { forme: 'choix-multiple', idDocument, source: question };

      case 'vrai-faux':
        this.validerVraiFaux(question, rang);
        return { forme: 'vrai-faux', idDocument, source: question };

      case 'associer':
      case 'trouver-la-faille':
        return {
          forme: 'provisoire',
          idDocument,
          source: question,
          lignes: this.validerProvisoire(question, rang),
        };

      default: {
        // Inatteignable selon le contrat — `lireLeconCompilee` refuse déjà un `type`
        // hors liste. Le cas reste écrit : un artéfact compilé par une autre version
        // du pipeline doit casser la construction, pas rendre une question vide.
        const inconnue = question as { type?: unknown; id?: unknown };
        throw new Error(
          `Quiz : type de question inconnu « ${String(inconnue.type)} » (question n°${rang + 1}). ` +
            'Le contrat est `tools/content-pipeline/types.d.ts` — une question non rendue ' +
            'serait un trou silencieux dans la leçon, on préfère casser la construction.',
        );
      }
    }
  }

  private validerChoixMultiple(question: QuestionChoixMultiple, rang: number): void {
    const manques: string[] = [];

    if (!estRempli(question.question)) manques.push('« question » : texte non vide attendu');

    if (!Array.isArray(question.choix) || question.choix.length < 2) {
      manques.push('« choix » : au moins deux propositions attendues');
    } else {
      const identifiants: string[] = [];
      for (const [rangChoix, choix] of question.choix.entries()) {
        const ou = `« choix[${rangChoix}] »`;
        if (typeof choix?.id !== 'string' || !KEBAB_CASE.test(choix.id)) {
          manques.push(`${ou}.id : kebab-case attendu`);
        } else {
          identifiants.push(choix.id);
        }
        if (!estRempli(choix?.texte)) manques.push(`${ou}.texte : texte non vide attendu`);
      }
      if (new Set(identifiants).size !== identifiants.length) {
        // Deux propositions homonymes rendraient deux radios de même `value` : le
        // visiteur en cocherait une et la correction lirait l'autre.
        manques.push('« choix » : deux propositions partagent le même « id »');
      }
      if (!identifiants.includes(question.bonneReponse)) {
        manques.push(
          `« bonneReponse » : « ${String(question.bonneReponse)} » ne désigne aucune proposition`,
        );
      }
    }

    // Une correction sans raison n'enseigne rien — `.claude/rules/contenu-pedagogique.md` §5.
    if (!estRempli(question.explication)) {
      manques.push('« explication » : texte non vide attendu');
    }

    if (manques.length > 0) this.refuser(question, rang, manques);
  }

  private validerVraiFaux(question: QuestionVraiFaux, rang: number): void {
    const manques: string[] = [];

    if (!estRempli(question.affirmation)) manques.push('« affirmation » : texte non vide attendu');
    if (typeof question.bonneReponse !== 'boolean') {
      // Une chaîne « false » relue d'un artéfact ancien serait VRAIE en JavaScript :
      // toutes les corrections de cette question s'inverseraient, en silence.
      manques.push('« bonneReponse » : booléen attendu');
    }
    if (!estRempli(question.justification)) {
      manques.push('« justification » : texte non vide attendu');
    }

    if (manques.length > 0) this.refuser(question, rang, manques);
  }

  private validerProvisoire(
    question: QuestionProvisoire,
    rang: number,
  ): readonly LigneDeCode[] {
    const manques: string[] = [];

    if (!estRempli(question.consigne)) manques.push('« consigne » : texte non vide attendu');

    if (question.type !== 'trouver-la-faille') {
      if (manques.length > 0) this.refuser(question, rang, manques);
      return [];
    }

    if (!estRempli(question.code)) manques.push('« code » : texte non vide attendu');
    if (manques.length > 0) this.refuser(question, rang, manques);

    // La numérotation commence à 1 — c'est le référentiel de `ligneFautive`.
    return question.code.split('\n').map((texte, index) => ({ numero: index + 1, texte }));
  }

  private refuser(question: QuestionQuiz, rang: number, manques: readonly string[]): never {
    throw new Error(
      `Quiz : question n°${rang + 1} (« ${question.id} », type « ${question.type} ») ` +
        `invalide — ${manques.join(' · ')}. Le contrat est ` +
        '`tools/content-pipeline/types.d.ts` ; l’enveloppe du quiz est vérifiée par ' +
        '`lireLeconCompilee`, les champs propres à chaque type le sont ici. ' +
        'Régénérer avec `npm run content:build`.',
    );
  }
}
