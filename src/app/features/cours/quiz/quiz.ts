// =============================================================================
// Quiz — le quiz d'une leçon, rendu à l'ancre `[[quiz]]` (E2-ST3, lots C et D)
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
// ✅ COLLISION S-011 — REFERMÉE LE 2026-08-19, ET VOICI CE QUI LA TIENT FERMÉE.
// L'ancienne version de cette note décrivait un garde-fou qui n'existe plus : le gate
// `tools/deploiement/generer-config-swa.mjs` balayait le HTML prerendu à la recherche
// de DEUX séquences de TEXTE BRUT (« espace + style= » et « espace + on…= » suivis d'un
// guillemet). Or l'interpolation d'Angular n'échappe que `&`, `<` et `>` — jamais les
// guillemets —, donc tout NŒUD TEXTE portant du texte d'auteur faisait échouer le build
// sur un message parlant de CSP alors que la cause était un texte de quiz. Le lot A de
// la dette sécurité pré-E3-ST1 a remplacé ces motifs par UN parse jsdom : la décision
// porte désormais sur les ATTRIBUTS que l'analyseur a réellement construits, et un nœud
// texte n'en produit aucun. MESURÉ le 2026-08-19 contre le générateur d'aujourd'hui :
// une page portant `<p>onerror="alert(1)" style="color:red"</p>` sort en CODE 0 (avant
// le lot A : rouge). Une leçon sur le XSS peut donc écrire ses charges en toutes lettres.
//
// 🔴 CE QUI LA ROUVRIRAIT, ET C'EST LA SEULE RAISON DE GARDER CETTE NOTE. Ajouter au
// gate un « contrôle de conservation » pour la branche attributs, sur le modèle de ceux
// qui existent pour `<script` et `<style`. Le réflexe est bon — une branche sans filet
// de complétude est un S-003 en puissance — mais le motif brut correspondant compterait
// les NŒUDS TEXTE, donc exactement le contenu ci-dessous. Le générateur a pris l'autre
// voie, STRUCTURELLE : descente dans `template.content` + refus nominatif de `<template>`,
// `<noscript>`, `<iframe>` et `shadowrootmode`, qui ne peuvent pas se former dans une
// phrase d'auteur. Ne pas défaire ce choix sans relire S-011.
//
// LES SITES DE TEXTE D'AUTEUR, NOMMÉMENT — la liste survit à la fermeture parce que
// c'est elle qui chiffre le coût d'un retour au balayage brut : le `code` d'un
// `trouver-la-faille` (ligne par ligne), sa `faille` et sa `correction` (qui est du CODE
// CORRIGÉ), le `gauche` et le `droite` d'un `associer` (le texte des `<option>`), la
// `consigne`, la `question`, l'`affirmation`, les `choix[].texte` et les
// `explication`/`justification`.
//
// CE QUI N'ÉTAIT DÉJÀ PAS CONCERNÉ, ET C'EST MESURÉ (revue de sécurité du lot D, sur
// domino — le sérialiseur du prerender — ET sur jsdom) : les CONTEXTES D'ATTRIBUT. Un `"`
// posé dans une `value` de `<option>`, d'`<input>` ou dans `[attr.data-champ]` est
// sérialisé en `&quot;`. Constat conservé parce qu'il reste vrai et qu'il documente une
// asymétrie réelle : le même caractère est inerte ici et signifiant là, c'est le CONTEXTE
// qui décide. Détail : S-011 dans `.claude/lessons/security-lessons.md`.
//
// ⚠️ RÉDACTION : blanches insécables U+00A0 UNIQUEMENT, écrites `&nbsp;` dans le
// gabarit et en séquence d'échappement dans le code, pour qu'on les VOIE à la
// relecture — une blanche insécable posée en clair est indistinguable d'une espace
// ordinaire, et `no-irregular-whitespace` la refuse. Jamais
// U+202F ni U+2009, absentes de Fraunces comme d'Inter
// (`.claude/rules/contenu-pedagogique.md` §3).
// =============================================================================

import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  type OnInit,
  PLATFORM_ID,
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
  /**
   * Le même numéro, en chaîne : un `<input type="radio">` ne porte que des chaînes,
   * et la conversion se fait ici, une fois, plutôt qu'en trois points du gabarit.
   */
  readonly valeur: string;
  readonly texte: string;
}

/**
 * Une ligne de gauche d'un `associer`, avec la clef de son champ de saisie.
 *
 * `idChamp` n'est PAS un `id` de document : c'est la clef de cette ligne dans la
 * table des réponses, indexée par question partout ailleurs. Le `#` la rend
 * impossible à confondre avec un `id` de question — le schéma les impose en
 * kebab-case (`quiz.schema.json`, `identifiant`), qui n'en contient jamais.
 */
interface LigneAAssocier {
  readonly idChamp: string;
  readonly gauche: string;
  readonly droite: string;
}

/** Le détail ligne à ligne de la correction d'un `associer`. */
interface LigneCorrigee {
  readonly idChamp: string;
  readonly gauche: string;
  readonly attendue: string;
  readonly donnee: string | undefined;
  readonly verdict: Verdict;
}

type QuestionChoixMultiple = Extract<QuestionQuiz, { type: 'choix-multiple' }>;
type QuestionVraiFaux = Extract<QuestionQuiz, { type: 'vrai-faux' }>;
type QuestionAssocier = Extract<QuestionQuiz, { type: 'associer' }>;
type QuestionFaille = Extract<QuestionQuiz, { type: 'trouver-la-faille' }>;

/**
 * Une question prête à rendre — QUATRE formes depuis le lot D, une par `type` du
 * contrat. Le lot C en réunissait deux sous « provisoire » (énoncé lisible, aucune
 * interaction, hors du score) ; cette forme-là n'existe plus, et avec elle a disparu
 * l'écart entre le dénominateur et le nombre de questions.
 *
 * Les champs dérivés (`lignes`, `lignesAAssocier`, `optionsDroite`) sont calculés
 * UNE FOIS à la préparation, jamais dans le gabarit : une expression de gabarit se
 * réévalue à chaque détection de changements, et `track` sur un tableau recréé à
 * chaque passe détruirait puis recréerait les champs de saisie sous le curseur.
 */
type QuestionPreparee =
  | { forme: 'choix-multiple'; idDocument: string; source: QuestionChoixMultiple }
  | { forme: 'vrai-faux'; idDocument: string; source: QuestionVraiFaux }
  | {
      forme: 'associer';
      idDocument: string;
      source: QuestionAssocier;
      lignesAAssocier: readonly LigneAAssocier[];
      /** Toutes les valeurs `droite` du lot, dans l'ordre de la source. */
      optionsDroite: readonly string[];
    }
  | {
      forme: 'trouver-la-faille';
      idDocument: string;
      source: QuestionFaille;
      lignes: readonly LigneDeCode[];
    };

/** Le verdict d'une question corrigée — TROIS états, pas deux (WCAG 1.4.1). */
type Verdict = 'juste' | 'faux' | 'absente';

/** Le mot ÉCRIT de chaque verdict. La couleur ne porte jamais l'information seule. */
const MOTS_DU_VERDICT: Record<Verdict, string> = {
  juste: 'Bonne réponse',
  faux: 'Réponse incorrecte',
  absente: 'Aucune réponse — comptée comme fausse',
};

/**
 * Le mot de chaque verdict de LIGNE, dans la correction d'un `associer`. Les mots de
 * question ne conviennent pas tels quels : « Aucune réponse, comptée comme fausse »
 * est vrai de la question entière, pas d'une ligne parmi cinq.
 */
const MOTS_DU_VERDICT_LIGNE: Record<Verdict, string> = {
  juste: 'Association correcte',
  faux: 'Association incorrecte',
  absente: 'Aucune association choisie',
};

/**
 * La valeur de l'option d'attente d'un `<select>` — la chaîne vide.
 *
 * 🔴 ELLE N'EST JAMAIS STOCKÉE : `repondre` EFFACE l'entrée au lieu de l'écrire.
 * Sans cela, revenir sur « Choisir » enregistrerait une réponse vide, et le verdict
 * `absente` — le troisième état de WCAG 1.4.1, celui qui distingue « pas répondu »
 * de « répondu faux » — deviendrait inatteignable pour un `associer`.
 *
 * Elle porte aussi le premier `<option>` du champ, et c'est ce qui rend le prerender
 * juste sans une seule liaison : un `<select>` dont aucune option ne porte l'attribut
 * `selected` sélectionne la première, donc l'attente. Le HTML prerendu est ainsi
 * exactement l'état de départ du composant, et l'hydratation n'a rien à rattraper
 * tant que le visiteur n'a pas touché au champ.
 */
const VALEUR_SANS_CHOIX = '';

function estRempli(valeur: unknown): boolean {
  return typeof valeur === 'string' && valeur.trim() !== '';
}

/**
 * 🔴 LE QUATRIÈME COMPTEUR DE LIGNES DU DÉPÔT — et c'est une COPIE DÉLIBÉRÉE de
 * `compterLignes` (`tools/content-pipeline/compter-lignes.mjs`), qui est la DÉFINITION DE
 * RÉFÉRENCE. Toute évolution de la formule commence là-bas et se recopie ici, jamais
 * l'inverse.
 *
 * POURQUOI UNE COPIE, ET NON UN IMPORT. `tools/**` et `src/**` sont deux programmes
 * TypeScript distincts (`tsconfig.tools.json` le dit dans son en-tête) : l'application
 * Angular ne peut pas importer un `.mjs` d'outillage sans le faire entrer dans son
 * programme, donc dans son bundle. La frontière est délibérée dans ce dépôt — c'est la
 * même que celle de `clefIndiscernable` juste au-dessus, et elle se paie de la même
 * façon : par un contrôle de PARITÉ, pas par un commentaire (L-008).
 *
 * 🔴 CE QUE LA DIVERGENCE COÛTAIT, MESURÉ (revue du lot B, E2-ST4). Ce chemin comptait
 * `question.code.split('\n')`. Sur un `code` de quiz terminé par un saut de ligne —
 * `tools/content-pipeline/__fixtures__/invalides/quiz-ligne-fautive-hors-extrait` prouve
 * que les auteurs en écrivent — cela produisait une ligne VIDE de plus, donc une RADIO
 * FANTÔME « Ligne N+1 » au libellé `<code>` vide : sélectionnable, et toujours fausse. Et
 * la garde `ligneFautive > lignes.length` d'en dessous devenait par le fait plus permissive
 * que celle de `valider.mjs`, c'est-à-dire que la divergence que le lot B croyait payer
 * avait seulement changé de place.
 *
 * ON DÉCOUPE, ON NE COMPTE PAS. Rendre le TABLEAU plutôt qu'un nombre est ce qui empêche
 * la prochaine divergence : la longueur affichée est celle du découpage réellement rendu,
 * il n'y a donc pas deux valeurs à garder d'accord. Le `\r?` couvre les fins de ligne CRLF
 * de ce poste (L-015), qui laisseraient sinon un `\r` en queue de chaque ligne affichée.
 *
 * 🔴 EXPORTÉE POUR ÊTRE CONFRONTÉE, PAS POUR ÊTRE RÉUTILISÉE — même statut que
 * `clefIndiscernable`. Son seul consommateur est `src/compter-lignes-parite.spec.ts`, qui
 * fait compter un corpus piégeux par CETTE copie et par le module de référence (processus
 * fils) et exige l'égalité cas par cas.
 */
export function decouperLignesDeCode(code: string): readonly string[] {
  const sansFin = code.replace(/\r?\n$/, '');
  return sansFin === '' ? [] : sansFin.split(/\r?\n/);
}

/**
 * 🔴 LA CLEF D'INDISCERNABILITÉ — la MÊME règle que `clefIndiscernable` de
 * `tools/content-pipeline/valider.mjs`, écrite ici parce que les deux bouts doivent la
 * porter à l'identique (même partage que l'unicité de `gauche` elle-même).
 *
 * L'invariant voulu n'est pas « deux chaînes d'octets égales », c'est « deux champs que
 * RIEN ne distingue à l'écran ». `HSTS` contre `HSTS` suivi d'une U+00A0, ou une paire
 * NFC/NFD, passaient les deux contrôles et rendaient deux `<select>` au nom accessible
 * identique — exactement ce que la règle existe pour empêcher. Et la collision est
 * ORGANISÉE par le projet : `.claude/rules/contenu-pedagogique.md` §3 impose U+00A0 dans
 * le contenu du site.
 *
 * `\s` couvre U+00A0 en JavaScript : replier toute suite de blanches sur une espace
 * ordinaire puis rogner les bords rend indiscernables les chaînes que l'œil ne sépare
 * pas ; `normalize('NFC')` replie en plus les décompositions Unicode.
 *
 * ℹ️ Sur un `choix[].id`, la même clef est une IDENTITÉ : le kebab-case (`KEBAB_CASE`,
 * imposé plus bas et par le schéma) n'admet ni blanche ni caractère hors ASCII. On la
 * partage quand même, pour n'avoir qu'une seule règle à faire évoluer.
 *
 * 🔴 EXPORTÉE POUR ÊTRE CONFRONTÉE, PAS POUR ÊTRE RÉUTILISÉE. Aucune autre source du site
 * ne l'importe — et si l'une le faisait, ce serait un import inter-features, interdit. Le
 * seul consommateur est `src/clef-indiscernable-parite.spec.ts`, qui fait calculer un
 * corpus de valeurs piégeuses par CETTE copie et par celle de `valider.mjs`
 * (mode `--clefs`, par processus fils) et exige l'égalité valeur par valeur. Avant lui, le
 * seul lien entre les deux copies était le commentaire ci-dessus — donc rien du tout
 * (L-008), sur une divergence dont le mode d'échec est de rendre G-content VERTE puis de
 * casser au prerender.
 */
export function clefIndiscernable(valeur: string): string {
  return valeur.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** Vrai si deux valeurs de la liste sont indiscernables à l'écran. */
function porteUnDoublonIndiscernable(valeurs: readonly string[]): boolean {
  return new Set(valeurs.map(clefIndiscernable)).size !== valeurs.length;
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

              @case ('associer') {
                <legend class="enonce">{{ question.source.consigne }}</legend>

                <!--
                  D-1 (backlog §E2-ST3) : un SELECT natif par ligne de gauche, et
                  zéro ARIA. C'est le seul contrôle du HTML qui exprime « choisir une
                  valeur parmi N » avec navigation clavier, nom accessible et annonce
                  de position fournis par le NAVIGATEUR. Le glisser-déposer est exclu
                  par WCAG 2.2 - 2.5.7 (Dragging Movements), et un motif ARIA maison
                  aurait dégradé ce que le natif donne gratuitement.
                  Le libellé est IMPLICITE (le champ vit dans son label), comme les
                  radios du lot C : aucun id à fabriquer, donc aucune collision
                  possible avec les ancres de section du document.
                  Plusieurs champs peuvent porter la MÊME valeur : c'est voulu.
                  Forcer l'unicité côté client transformerait l'exercice en sudoku et
                  masquerait la vraie erreur de compréhension.
                -->
                <ul class="associations">
                  @for (ligne of question.lignesAAssocier; track ligne.idChamp) {
                    <li>
                      <label class="paire">
                        <span>{{ ligne.gauche }}</span>
                        <select
                          #champ
                          class="champ-droite"
                          [attr.data-champ]="ligne.idChamp"
                          [value]="reponseDe(ligne.idChamp) ?? ''"
                          [disabled]="corrige()"
                          (change)="repondre(ligne.idChamp, champ.value)"
                        >
                          <option value="">Choisir…</option>
                          @for (option of question.optionsDroite; track option) {
                            <option [value]="option">{{ option }}</option>
                          }
                        </select>
                      </label>
                    </li>
                  }
                </ul>
              }

              @case ('trouver-la-faille') {
                <legend class="enonce">{{ question.source.consigne }}</legend>

                <!--
                    Le code part NON ÉCHAPPÉ de l'artéfact (c'est voulu : il porte
                    la numérotation de ligneFautive et le texte accessible), et il
                    est volontairement vulnérable. Il est INTERPOLÉ, donc Angular
                    l'échappe — aucune liaison de HTML brut, aucun contournement
                    du sanitizer (les deux noms ne sont même pas prononcés dans ce
                    fichier : le garde-fou de portée du dépôt les cherche), et
                    htmlColore n'est PAS lu, au lot D pas plus qu'au lot C : ce qui
                    est rendu est le code BRUT, parce que c'est LUI qui porte la
                    numérotation de ligneFautive. Rendre la version colorée exigerait
                    d'en découper le HTML ligne par ligne, donc de faire confiance à
                    sa structure — l'affaire d'E2-ST4, avec son propre garde-fou.
                    ⚠️ Le mode d'échec S-011 ne concerne PAS que ce bloc : voir la
                    note « COLLISION S-011 » de l'en-tête du fichier, qui nomme tous
                    les sites de texte d'auteur du gabarit.
                  D-2 (backlog §E2-ST3) : la ligne fautive se désigne par une RADIO
                  par ligne, dont le label est la ligne de code numérotée — donc la
                  machinerie du lot C, sans rien de neuf à rendre accessible.
                  LE MOT « Ligne » EST ÉCRIT, pas seulement le numéro, et c'est ce
                  qui rend le nom accessible utilisable. Trois raisons, toutes
                  vérifiées par un test : (a) un marqueur de liste d'agent
                  utilisateur n'entre pas dans le calcul du nom accessible, donc le
                  numéro doit venir du document ; (b) le numéro NU laissait un nom
                  ambigu — « 2 » de quoi ? — et une ligne de code vide ou faite
                  d'espaces avait pour nom accessible entier « 2 » ; (c) la
                  correction annonce « Ligne 2 », qui ne correspondait alors
                  littéralement à AUCUN libellé d'option. axe ne voit rien de tout
                  cela (constat D-C6 : un outil ne juge pas la justesse d'un nom).
                  L'espace insécable qui suit n'est pas décorative — sans nœud
                  blanc entre les deux, le nom se calcule en UN SEUL MOT (L-024).
                -->
                <ol class="code-numerote">
                  @for (ligne of question.lignes; track ligne.numero) {
                    <li>
                      <label class="ligne-code">
                        <input
                          class="pastille"
                          type="radio"
                          [name]="question.idDocument"
                          [value]="ligne.valeur"
                          [checked]="reponseDe(question.source.id) === ligne.valeur"
                          [disabled]="corrige()"
                          (change)="repondre(question.source.id, ligne.valeur)"
                        />
                        <span class="numero-ligne">Ligne&nbsp;{{ ligne.numero }}&nbsp;</span>
                        <code>{{ ligne.texte }}</code>
                      </label>
                    </li>
                  }
                </ol>
              }
            }

            @if (corrige()) {
              <p class="verdict" [attr.data-verdict]="verdictDe(question)">
                <b class="mot">{{ motDuVerdict(question) }}</b>
              </p>

              @if (question.forme === 'associer') {
                <!--
                  La correction d'un « associer » dit LIGNE PAR LIGNE ce qui est juste,
                  jamais « faux » pour l'ensemble : avec cinq paires, un verdict
                  global n'enseigne rien et n'indique même pas combien de lignes
                  reprendre. Chaque ligne porte son MOT, jamais sa seule couleur.
                -->
                <ul class="detail-association">
                  @for (ligne of detailAssociation(question); track ligne.idChamp) {
                    <li class="ligne-corrigee" [attr.data-verdict]="ligne.verdict">
                      <b class="mot">{{ motDeLigne(ligne) }}&nbsp;·&nbsp;</b>
                      <span>
                        {{ ligne.gauche }}&nbsp;: <b>{{ ligne.attendue }}&nbsp;</b>
                        @if (ligne.verdict === 'faux') {
                          <span class="donnee">
                            (votre réponse&nbsp;: {{ ligne.donnee }})
                          </span>
                        }
                      </span>
                    </li>
                  }
                </ul>
              } @else if (verdictDe(question) !== 'juste') {
                <p class="attendue">
                  Réponse attendue&nbsp;:&nbsp;<b>{{ reponseAttendue(question) }}</b>
                </p>
              }

              @if (question.forme === 'trouver-la-faille') {
                <p class="faille">
                  Faille&nbsp;:&nbsp;<b>{{ question.source.faille }}</b>
                </p>
              }

              <p class="explication">{{ explicationDe(question) }}</p>

              @if (question.forme === 'trouver-la-faille') {
                <p class="correction">
                  Correction&nbsp;:&nbsp;<code>{{ question.source.correction }}</code>
                </p>
              }
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
export class Quiz implements OnInit {
  private readonly progression = inject(ProgressionService);
  private readonly injecteur = inject(Injector);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly plateforme = inject(PLATFORM_ID);

  /**
   * 🔴 LA FENÊTRE DE PRÉ-HYDRATATION — le seul endroit du composant qui lit le DOM
   * plutôt que de l'écrire, et il le faut (L-033).
   *
   * La page de leçon est prerendue puis hydratée par un **chunk paresseux**, et
   * `withNoIncrementalHydration()` est actif (`src/app/app.config.ts`) : le **rejeu
   * d'événements est perdu**. Entre la peinture du HTML prerendu et le branchement du
   * `(change)`, la radio se coche **réellement** — c'est le navigateur qui le fait, le
   * composant ne voit rien. Puis, à la première détection de changements, `[checked]`
   * s'évalue à `false` et **réécrit** la coche : l'état du composant efface la saisie
   * réelle du visiteur. Angular saute la création de nœuds à l'hydratation, pas la mise
   * à jour des liaisons.
   *
   * ⚠️ « SANS JS » ET « PAS ENCORE HYDRATÉ » SONT DEUX ÉTATS DISTINCTS. L'en-tête de ce
   * fichier documente soigneusement le premier (page lisible, seule la correction
   * manque) — le second est plus trompeur : l'interface répond au clic, elle a l'air
   * vivante, et elle ment. On amorce donc l'état DEPUIS le DOM au premier rendu client.
   *
   * 🔴 POURQUOI L'AMORÇAGE SE FAIT DANS `ngOnInit`, ET PAS SEULEMENT DANS
   * `afterNextRender`. Le paragraphe ci-dessus n'est pas une hypothèse : une liaison de
   * propriété part d'un état non initialisé, donc la TOUTE PREMIÈRE passe de mise à jour
   * écrit `checked = false` / `value = ''` **inconditionnellement**. Or `afterNextRender`
   * s'exécute **après** la détection de changements — donc après ces écritures. Y placer
   * la seule relecture, c'est relire un DOM déjà écrasé : le correctif serait présumé
   * insuffisant **par son propre énoncé**.
   * `ngOnInit` s'exécute après que les entrées sont posées et **avant** que le gabarit de
   * ce composant ne soit mis à jour. En hydratation, les nœuds prerendus sont déjà sous
   * l'hôte à cet instant — avec la coche du visiteur. En rendu client pur, l'hôte est
   * vide : l'appel ne trouve rien, n'écrit rien, c'est un no-op. Strictement plus tôt,
   * jamais pire. L'`afterNextRender` reste en **second filet** : l'amorçage est
   * idempotent, le garder ne coûte rien et couvre un ordonnancement qui bougerait.
   *
   * 🔴 CE QUI EST PROUVÉ, ET CE QUI NE L'EST PAS — à lire avant de se croire couvert.
   * `quiz.spec.ts` prouve que l'amorçage lit le bon état **quand il est appelé** : il
   * coche une radio et pose la valeur d'un `<select>` SANS émettre d'événement, comme le
   * navigateur, puis vérifie que la saisie compte. Il ne prouve **rien de
   * l'ORDONNANCEMENT** — le `TestBed` ne peut pas trancher, faute de DOM prerendu avant
   * le premier rendu. Le mécanisme est donc **raisonné, pas mesuré** : c'est le motif de
   * **L-032** (vert sur un comportement que l'instrument n'implémente pas). À mordre **au
   * lot E, avec Playwright** : cocher pendant la fenêtre, laisser hydrater, vérifier que
   * la coche survit.
   * ⚠️ ET UN PIÈGE À VÉRIFIER DANS LE MÊME PROTOCOLE : amorcer avant la première passe de
   * mise à jour signifie que le `[value]` d'un `<select>` peut s'écrire **avant que ses
   * `<option>` du `@for` n'existent** — un `<select>` avale silencieusement une valeur
   * sans option correspondante. Sans effet aujourd'hui (en rendu client l'amorçage ne
   * trouve rien), mais à constater plutôt qu'à découvrir.
   */
  ngOnInit(): void {
    // Le prerender n'a pas de DOM à relire, et `nativeElement` n'y est pas un vrai
    // élément : la garde de plateforme n'est pas une précaution, c'est la condition
    // pour que cette méthode n'existe qu'au navigateur.
    if (!isPlatformBrowser(this.plateforme)) return;
    this.amorcerDepuisLeDom();
  }

  constructor() {
    afterNextRender(() => {
      this.amorcerDepuisLeDom();
    });
  }

  /**
   * Le quiz de la leçon, REQUIS. Un input optionnel laisserait passer le trou
   * silencieux que le compte d'ancres `[[quiz]]` du compilateur existe pour
   * interdire : un composant monté sans données rendrait une coquille vide, sur une
   * page publiée, sans qu'aucun gate ne rougisse.
   */
  readonly quiz = input.required<QuizCompile>();

  /**
   * Le SUJET du cours auquel appartient cette leçon — E2-ST6, lot A2.
   *
   * 🔴 POURQUOI IL ARRIVE PAR UN INPUT, ET NON PAR L'URL. La progression est indexée
   * par le couple `(sujet, slug)` depuis le lot A1 (`core/progression/progression.ts`) :
   * la phase 1 porte deux cours (sécurité web et PHP), et deux leçons de sujets
   * différents peuvent partager un slug. Or `QuizCompile` ne porte que `lecon` (le
   * slug) — le sujet n'est nulle part dans ce contrat, et il n'est pas non plus un
   * paramètre de la route (`cours/securite-web/:slug` : le sujet est en dur dans le
   * chemin). La source de vérité est donc `frontmatter.sujet` du contenu compilé, que
   * `Lecon` lit et fait descendre par `RenduBlocs` jusqu'ici.
   *
   * ⚠️ ET SURTOUT PAS DEPUIS `ActivatedRoute`. Un segment d'URL est une entrée non
   * fiable ; celui-ci composerait une CLEF DE STOCKAGE. La règle du dépôt est déjà
   * écrite en tête de `lecon.ts` (« aucun segment d'URL n'est réaffiché ») et
   * `composerClef` refuse de toute façon ce qui n'est pas kebab-case — mais un refus
   * silencieux au fond du service perdrait la progression sans un mot, là où la
   * provenance compilée la rend juste par construction.
   *
   * REQUIS pour la même raison que `quiz` : un input optionnel laisserait la
   * progression s'écrire sous un sujet vide sur une leçon publiée, sans qu'aucun gate
   * ne rougisse. Requis, l'oubli de la liaison ne compile pas.
   */
  readonly sujet = input.required<string>();

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
   * reste à trancher (le lot D ne l’a pas rouvert) ; l'implémenter « au cas où » aurait posé
   * un défaut d'hydratation avant même qu'on ait choisi.
   */
  readonly questionsPreparees = computed<readonly QuestionPreparee[]>(() =>
    this.quiz().questions.map((question, rang) => this.preparer(question, rang)),
  );

  /** Nombre de bonnes réponses de l'instantané corrigé. `0` avant correction. */
  readonly score = computed(() => {
    const instantane = this.reponsesCorrigees();
    if (instantane === null) return 0;
    return this.questionsPreparees().filter(
      (question) => this.verdict(question, instantane) === 'juste',
    ).length;
  });

  /**
   * Le dénominateur affiché ET enregistré. Depuis le lot D, c'est le TOTAL des
   * questions : les quatre types du contrat se corrigent, donc plus aucune n'est
   * hors score. Le lot C distinguait les deux comptes ; l'écart a disparu avec la
   * forme « provisoire », il ne reste pas un filtre qui ne filtre plus rien.
   */
  readonly total = computed(() => this.questionsPreparees().length);

  /**
   * Le texte de la région live. Vide avant correction — la région existe quand
   * même, sinon son apparition ne serait pas annoncée.
   */
  readonly resume = computed(() => {
    const instantane = this.reponsesCorrigees();
    if (instantane === null) return '';

    const score = this.score();
    const total = this.total();
    const sansReponse = this.questionsPreparees().filter(
      (question) => this.verdict(question, instantane) === 'absente',
    ).length;

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
    return phrases.join(' ');
  });

  /** La réponse en cours pour une question, ou `undefined`. */
  reponseDe(id: string): string | undefined {
    return this.reponses().get(id);
  }

  /**
   * Relit les champs réellement remplis dans le DOM et en amorce l'état.
   *
   * APPELÉE PAR LE CONSTRUCTEUR, dans `afterNextRender` — voir la note qui l'y pose
   * pour le pourquoi. Publique parce que `quiz.spec.ts` la déclenche pour reproduire
   * la fenêtre de pré-hydratation, que le `TestBed` ne peut pas fabriquer (il n'y a
   * pas de DOM prerendu avant le premier rendu).
   *
   * 🔴 LES QUATRE TYPES Y ENTRENT, PAS SEULEMENT LES RADIOS. Un `<select>` est le
   * cas le PLUS exposé de L-033 : contrairement à une radio, il garde silencieusement
   * la valeur choisie avant l'hydratation, sans aucun repère visuel qu'un état
   * concurrent existe — et la liaison `[value]` la réécrirait à `''` à la première
   * détection, ramenant le champ sur « Choisir… » sous les yeux du visiteur.
   *
   * Elle est IDEMPOTENTE et ne perd rien : un champ déjà connu du composant se
   * réécrit à l'identique, et un champ vide n'est pas touché. Le passage par
   * `questionsPreparees` — plutôt que par le `name` du DOM — évite de retirer un
   * préfixe à la main : l'appariement `idDocument` → `source.id` est déjà établi à
   * un seul endroit. Les `<select>` se retrouvent par `[data-champ]`, jamais par
   * position : un appariement par index se romprait en silence au premier
   * changement de gabarit.
   */
  amorcerDepuisLeDom(): void {
    if (this.corrige()) return;

    const suivant = new Map(this.reponses());
    let amorcees = 0;
    for (const question of this.questionsPreparees()) {
      if (question.forme === 'associer') {
        for (const ligne of question.lignesAAssocier) {
          const champ = this.hote.nativeElement.querySelector<HTMLSelectElement>(
            `[id="${question.idDocument}"] [data-champ="${ligne.idChamp}"]`,
          );
          if (champ === null || champ.value === VALEUR_SANS_CHOIX) continue;
          suivant.set(ligne.idChamp, champ.value);
          amorcees += 1;
        }
        continue;
      }

      const coche = this.hote.nativeElement.querySelector<HTMLInputElement>(
        `[id="${question.idDocument}"] input[type="radio"]:checked`,
      );
      if (coche === null) continue;
      suivant.set(question.source.id, coche.value);
      amorcees += 1;
    }
    // Ne pas remplacer le signal pour rien : une page hydratée sans saisie en cours
    // est le cas NORMAL, et une écriture inutile relancerait un rendu.
    if (amorcees > 0) this.reponses.set(suivant);
  }

  /**
   * Enregistre une réponse. Sans effet une fois le quiz corrigé.
   *
   * `id` est la clef de CHAMP, pas toujours celle de la question : une radio répond
   * pour sa question entière, un `<select>` d'`associer` répond pour sa seule ligne
   * (`idChamp`). Revenir sur « Choisir… » EFFACE l'entrée — voir `VALEUR_SANS_CHOIX`.
   */
  repondre(id: string, valeur: string): void {
    if (this.corrige()) return;
    const suivant = new Map(this.reponses());
    if (valeur === VALEUR_SANS_CHOIX) {
      suivant.delete(id);
    } else {
      suivant.set(id, valeur);
    }
    this.reponses.set(suivant);
  }

  /**
   * Corrige l'ensemble, puis enregistre.
   *
   * 🔴 LA GARANTIE DU LOT C EST INTACTE, ELLE A SEULEMENT CHANGÉ DE GARDIEN. La
   * règle était : ne JAMAIS écrire une maîtrise mesurée sur une partie seulement du
   * quiz — 3/3 sur 5 questions marquerait la leçon « maîtrisée » (seuil 0,8) sans
   * avoir évalué les deux plus difficiles, et une fausse maîtrise se croit là où une
   * progression absente se rattrape. Le lot C la tenait par un test de comptage ici
   * même (`provisoires().length === 0`), parce que deux types n'étaient pas
   * corrigeables.
   *
   * Depuis le lot D, elle est tenue plus haut et plus fort : `preparer()` est
   * EXHAUSTIF sur les quatre types du contrat et LÈVE sur tout autre. Une question
   * que ce composant ne saurait pas corriger ne peut donc plus être rendue du tout —
   * la construction casse avant la publication, au lieu de laisser une page publier
   * un score partiel. Le comptage n'a pas été retiré parce qu'il gênait : il a été
   * remplacé par une garantie qui ne dépend plus d'un filtre qu'on peut oublier de
   * mettre à jour. ⚠️ Ajouter un cinquième type au schéma sans savoir le corriger
   * doit donc échouer au `default` de `preparer()`, jamais réapparaître ici.
   *
   * ⚠️ ET LE GARDIEN N'EST PAS SEUL — dans quel ordre, ça compte. La PREMIÈRE ligne
   * de défense est la liste nominative `TYPES_DE_QUESTION` de `../contenu-compile`,
   * qui refuse un `type` inconnu à la lecture de l'artéfact : c'est le seul chemin
   * d'entrée en production (`resoudre-lecon` → `lireLeconCompilee` → `lecon` →
   * `RenduBlocs` → ce composant), donc le `default` de `preparer()` y est
   * **inatteignable**. Il n'est pas décoratif pour autant : il couvre l'artéfact
   * produit par une AUTRE version du pipeline, et c'est très exactement le scénario
   * que le test de `quiz.spec.ts` exerce en court-circuitant `lireLeconCompilee`. Ne
   * pas lire ce fichier comme s'il se gardait tout seul.
   */
  corriger(): void {
    this.reponsesCorrigees.set(new Map(this.reponses()));
    // `(sujet, slug)` et non le seul slug : la clef de progression est composite
    // depuis le lot A1 d'E2-ST6 — deux cours, deux leçons homonymes possibles.
    this.progression.enregistrerQuiz(this.sujet(), this.quiz().lecon, this.score(), this.total());

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
    const instantane = this.reponsesCorrigees();
    if (instantane === null) return null;
    return this.verdict(question, instantane);
  }

  /**
   * Le détail LIGNE PAR LIGNE de la correction d'un `associer`.
   *
   * C'est la contrepartie du choix D-1 : puisque plusieurs champs peuvent porter la
   * même valeur, un verdict global ne dit ni combien de lignes reprendre ni
   * lesquelles. Chaque ligne rend donc sa réponse, l'attendue, et son propre mot.
   */
  detailAssociation(question: QuestionPreparee): readonly LigneCorrigee[] {
    if (question.forme !== 'associer') return [];
    const instantane = this.reponsesCorrigees();
    if (instantane === null) return [];

    return question.lignesAAssocier.map((ligne) => {
      const donnee = instantane.get(ligne.idChamp);
      return {
        idChamp: ligne.idChamp,
        gauche: ligne.gauche,
        attendue: ligne.droite,
        donnee,
        verdict:
          donnee === undefined ? 'absente' : donnee === ligne.droite ? 'juste' : 'faux',
      };
    });
  }

  /** Le MOT d'une ligne de correction — jamais sa seule couleur (WCAG 1.4.1). */
  motDeLigne(ligne: LigneCorrigee): string {
    return MOTS_DU_VERDICT_LIGNE[ligne.verdict];
  }

  /** Le MOT du verdict — troisième canal de WCAG 1.4.1, jamais la couleur seule. */
  motDuVerdict(question: QuestionPreparee): string {
    const verdict = this.verdictDe(question);
    return verdict === null ? '' : MOTS_DU_VERDICT[verdict];
  }

  /**
   * L'explication écrite PAR LE CONTENU — aucun texte n'est fabriqué ici. Le
   * `vrai-faux` la nomme `justification` au contrat, les trois autres `explication` :
   * c'est le seul endroit du composant qui connaisse cet écart de vocabulaire.
   */
  explicationDe(question: QuestionPreparee): string {
    return question.forme === 'vrai-faux'
      ? question.source.justification
      : question.source.explication;
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
    if (question.forme === 'trouver-la-faille') {
      // Le NUMÉRO seul serait ambigu à l'oreille (« 2 » de quoi ?), et le libellé
      // reprend le mot qui étiquette déjà chaque ligne à l'écran.
      return `Ligne ${question.source.ligneFautive}`;
    }
    // Un `associer` n'a pas de réponse attendue UNIQUE : c'est `detailAssociation`
    // qui la donne, ligne par ligne, et le gabarit n'appelle pas cette méthode-là.
    return '';
  }

  private verdict(question: QuestionPreparee, instantane: ReadonlyMap<string, string>): Verdict {
    if (question.forme === 'associer') {
      // Toutes justes, ou rien de saisi, ou faux : les trois états de WCAG 1.4.1
      // valent aussi ici. Une association PARTIELLE est fausse pour le score — le
      // détail ligne à ligne, lui, dit exactement ce qui est acquis.
      const lignes = question.lignesAAssocier;
      const donnees = lignes.map((ligne) => instantane.get(ligne.idChamp));
      if (donnees.every((donnee) => donnee === undefined)) return 'absente';
      return donnees.every((donnee, rang) => donnee === lignes[rang]?.droite)
        ? 'juste'
        : 'faux';
    }

    const donnee = instantane.get(question.source.id);
    if (donnee === undefined) return 'absente';
    if (question.forme === 'choix-multiple') {
      return donnee === question.source.bonneReponse ? 'juste' : 'faux';
    }
    if (question.forme === 'trouver-la-faille') {
      return donnee === String(question.source.ligneFautive) ? 'juste' : 'faux';
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
    // 🔴 L'`id` EST LE SEUL CHAMP QUI ALIMENTE UN LANGAGE DE REQUÊTE. Il devient un
    // `id` de document, puis un fragment de SÉLECTEUR CSS dans `amorcerDepuisLeDom()`
    // — deux sites depuis le lot D. `lireLeconCompilee` le contraint déjà au
    // kebab-case, et c'est le seul chemin de production ; mais ce composant revalide
    // nominativement tout le reste à sa frontière, et déléguer précisément celui-là
    // serait le mauvais endroit où faire une exception. Un guillemet dans un `id`
    // donnerait soit un `SyntaxError` au prerender, soit — pire — un sélecteur qui
    // relit la radio d'une AUTRE question, en silence.
    if (!KEBAB_CASE.test(question.id)) {
      this.refuser(question, rang, ['« id » : kebab-case attendu']);
    }

    const idDocument = `${PREFIXE_ID_QUESTION}${question.id}`;

    switch (question.type) {
      case 'choix-multiple':
        this.validerChoixMultiple(question, rang);
        return { forme: 'choix-multiple', idDocument, source: question };

      case 'vrai-faux':
        this.validerVraiFaux(question, rang);
        return { forme: 'vrai-faux', idDocument, source: question };

      case 'associer': {
        const lignesAAssocier = this.validerAssocier(question, rang);
        return {
          forme: 'associer',
          idDocument,
          source: question,
          lignesAAssocier,
          // Toutes les valeurs `droite`, dans l'ordre de la SOURCE (comme les
          // questions — voir la note `melanger`). Les doublons sont retirés : deux
          // `<option>` de même texte et de même valeur seraient indiscernables à
          // l'écran comme à l'oreille, et une paire peut légitimement partager sa
          // valeur de droite avec une autre.
          optionsDroite: [...new Set(lignesAAssocier.map((ligne) => ligne.droite))],
        };
      }

      case 'trouver-la-faille':
        return {
          forme: 'trouver-la-faille',
          idDocument,
          source: question,
          lignes: this.validerTrouverLaFaille(question, rang),
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
      if (porteUnDoublonIndiscernable(identifiants)) {
        // Deux propositions homonymes rendraient deux radios de même `value` : le
        // visiteur en cocherait une et la correction lirait l'autre. Comme pour
        // `gauche` ci-dessous, `valider.mjs` porte la même règle à G-content et parle
        // le premier, en nommant le fichier ; celui-ci garde l'artéfact d'une autre
        // version du pipeline (lot E-a).
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

  private validerAssocier(
    question: QuestionAssocier,
    rang: number,
  ): readonly LigneAAssocier[] {
    const manques: string[] = [];

    if (!estRempli(question.consigne)) manques.push('« consigne » : texte non vide attendu');

    // Le schéma exige `minItems: 2` : une paire unique n'est pas un appariement,
    // c'est une question à une seule réponse possible.
    if (!Array.isArray(question.paires) || question.paires.length < 2) {
      manques.push('« paires » : au moins deux paires attendues');
    } else {
      const gauches: string[] = [];
      for (const [rangPaire, paire] of question.paires.entries()) {
        const ou = `« paires[${rangPaire}] »`;
        if (!estRempli(paire?.gauche)) manques.push(`${ou}.gauche : texte non vide attendu`);
        else gauches.push(paire.gauche);
        if (!estRempli(paire?.droite)) manques.push(`${ou}.droite : texte non vide attendu`);
      }
      if (porteUnDoublonIndiscernable(gauches)) {
        // Deux libellés de gauche identiques rendraient deux champs au nom
        // accessible identique : le lecteur d'écran annoncerait deux fois la même
        // chose, et la correction ligne à ligne deviendrait illisible. Les valeurs
        // de DROITE, elles, ont parfaitement le droit de se répéter (décision D-1).
        //
        // ⚠️ CE CONTRÔLE N'EST PLUS LE PREMIER À PARLER (lot E-a). `valider.mjs`
        // porte la même règle, à G-content, là où le message NOMME LE FICHIER —
        // avant que le prerender ne casse au milieu d'une pile Angular. Celui-ci
        // reste néanmoins la frontière de confiance contre un artéfact produit par
        // une AUTRE version du pipeline : ne pas le retirer au motif du doublon.
        //
        // La comparaison passe par `clefIndiscernable`, pas par l'égalité d'octets :
        // « rien ne les distingue à l'écran » est l'invariant, et une U+00A0 de fin
        // suffisait à contourner un `Set` sur les valeurs brutes.
        manques.push(
          '« paires » : deux paires portent le même « gauche » — à blanches et ' +
            'normalisation Unicode près, donc rien ne les distingue à l’écran',
        );
      }
    }

    if (!estRempli(question.explication)) {
      manques.push('« explication » : texte non vide attendu');
    }

    if (manques.length > 0) this.refuser(question, rang, manques);

    return question.paires.map((paire, index) => ({
      // Le `#` interdit la confusion avec un `id` de question : le schéma les impose
      // en kebab-case, qui n'en contient jamais.
      idChamp: `${question.id}#${index}`,
      gauche: paire.gauche,
      droite: paire.droite,
    }));
  }

  private validerTrouverLaFaille(
    question: QuestionFaille,
    rang: number,
  ): readonly LigneDeCode[] {
    const manques: string[] = [];

    if (!estRempli(question.consigne)) manques.push('« consigne » : texte non vide attendu');
    if (!estRempli(question.faille)) manques.push('« faille » : texte non vide attendu');
    if (!estRempli(question.explication)) manques.push('« explication » : texte non vide attendu');
    if (!estRempli(question.correction)) manques.push('« correction » : texte non vide attendu');
    if (!estRempli(question.code)) manques.push('« code » : texte non vide attendu');

    if (manques.length > 0) this.refuser(question, rang, manques);

    // La numérotation commence à 1 — c'est le référentiel de `ligneFautive`. Le découpage
    // passe par `decouperLignesDeCode` (ci-dessus) et JAMAIS par `code.split('\n')` : un
    // `code` terminé par un saut de ligne rendrait sinon une radio fantôme « Ligne N+1 »
    // au libellé vide, et desserrerait la garde ci-dessous par rapport à `valider.mjs`.
    const lignes: readonly LigneDeCode[] = decouperLignesDeCode(question.code).map(
      (texte, index) => ({ numero: index + 1, valeur: String(index + 1), texte }),
    );

    // `valider.mjs` le contrôle déjà côté source ; on le REFAIT ici parce qu'un
    // artéfact compilé par une autre version du pipeline ne serait pas passé par lui,
    // et parce que le mode d'échec est muet : la bonne réponse ne serait affichable
    // par AUCUNE radio, et toutes les tentatives du visiteur seraient fausses.
    if (
      !Number.isInteger(question.ligneFautive) ||
      question.ligneFautive < 1 ||
      question.ligneFautive > lignes.length
    ) {
      this.refuser(question, rang, [
        `« ligneFautive » : « ${String(question.ligneFautive)} » ne désigne aucune ligne ` +
          `(le code en compte ${lignes.length})`,
      ]);
    }

    return lignes;
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
