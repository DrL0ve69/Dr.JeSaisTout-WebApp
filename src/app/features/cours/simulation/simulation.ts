// =============================================================================
// Simulation — le pas-à-pas d'une leçon, rendu à l'ancre `[[simulation]]`
// (E2-ST5, lot b1)
// -----------------------------------------------------------------------------
// CE QU'IL FAIT, ET RIEN D'AUTRE. Il reçoit la `SimulationCompilee` émise par le
// pipeline (lot a) — jamais du JSON brut, jamais un chargement réseau — et la pose
// dans la page : un bandeau d'acteurs, une barre de liens d'étape, puis les M étapes
// EMPILÉES. Il ne route rien, ne charge rien, et ne connaît ni le slug de l'URL ni le
// sommaire. Il n'écrit RIEN hors de lui-même (pas de progression : une simulation ne
// se « réussit » pas).
//
// 🔵 LE MODÈLE C′ — DÉCISION DU PROPRIÉTAIRE, PAS UNE OPTION D'ERGONOMIE.
// Dans la page prerendue — donc aussi SANS JavaScript, donc aussi AVANT hydratation —
// les M étapes sont TOUTES visibles, empilées, dans l'ordre. C'est le contenu complet,
// lisible et imprimable. Après hydratation, RIEN NE CHANGE tant que le lecteur n'a rien
// demandé : pas de repli à l'hydratation. Un lecteur déjà descendu à l'étape 5 ne doit
// voir la page bouger à AUCUN moment ; le seul déplacement autorisé est celui qu'il
// vient de commander. Au PREMIER clic sur un lien d'étape, la vue se replie sur l'étape
// demandée — les autres reçoivent `hidden="until-found"` — et « Réinitialiser » déplie.
//
// 🔴 POURQUOI LE REPLI NE CRÉE AUCUN ÉLÉMENT, ET POURQUOI C'EST UNE RÈGLE ET NON UN
// STYLE D'ÉCRITURE. La CSP servie n'autorise que les blocs `<style>` PRÉSENTS DANS
// L'ARTÉFACT PRERENDU, nommément : `style-src` n'a pas d'`unsafe-inline`, et la liste de
// hachages est dérivée de l'artéfact (`tools/deploiement/generer-config-swa.mjs`). Un
// élément stylé monté pour la PREMIÈRE FOIS après l'hydratation ferait injecter par
// Angular un bloc de style que le navigateur REFUSERAIT EN SILENCE : élément non stylé
// en production, avec `npm run build`, `npm run config:swa` et toute la CI VERTS.
// Conséquence pratique, à tenir en relisant ce gabarit : tout `@if` ci-dessous porte sur
// une valeur DÉRIVÉE DE L'ENTRÉE (donc figée dès le prerender) ; l'état d'interaction
// (`replie`, `courante`) ne pilote QUE des attributs, des classes et du TEXTE sur des
// nœuds déjà prerendus.
//
// LA NAVIGATION DE FRAGMENT EST NATIVE TANT QUE LA PAGE N'EST PAS HYDRATÉE — et CE FICHIER
// n'appelle `preventDefault()` nulle part. `RouterLink`, lui, LE FAIT : son `onClick` rend
// `!isAnchorElement`, donc `false` sur un `<a>`, et Angular annule alors la navigation
// native pour la refaire par le routeur. Ce qui pose le focus sur l'étape après hydratation
// n'est donc PAS le navigateur : c'est `ViewportScroller.scrollToAnchor`, qui appelle
// `focus({ preventScroll: true })` sur l'élément visé.
// ⚠️ DÉPENDANCE NOMMÉE ICI PARCE QU'ELLE EST LE SEUL MÉCANISME D'ANNONCE DU COMPOSANT :
// `scrollToAnchor` ne tourne QUE parce que `app.config.ts` pose
// `withInMemoryScrolling({ anchorScrolling: 'enabled' })`. Chaque étape porte `tabindex="-1"`
// et c'est son NOM ACCESSIBLE qui annonce le changement ; retirer cette option rendrait ce
// composant muet APRÈS hydratation — avant elle, le navigateur suit le `href` et pose le
// focus lui-même, donc aucun test de ce fichier ne rougirait. La mesure en navigateur
// appartient au lot c1.
// ⚠️ D'où l'ABSENCE DÉCIDÉE de région `aria-live` : elle ferait une DOUBLE annonce à
// chaque pas. Ne pas en « ajouter une par prudence » — l'état courant est exposé aux
// technologies d'assistance par `aria-current="step"`, pas par une annonce.
//
// 🔴 `[routerLink]="[]" [fragment]="…"`, JAMAIS `href="#…"` (L-030, mesurée sur ce
// dépôt). `index.html` pose un `<base href="/">` : un fragment NU se résout contre la
// BASE du document et non contre l'URL courante — chaque lien renverrait le lecteur à
// l'ACCUEIL. Un `routerLink` vide désigne la route COURANTE, et le routeur écrit un
// `href` ABSOLU, fragment compris, que le navigateur suit sans JS. `anchorScrolling` est
// actif (`app.config.ts`). Même patron que le sommaire de `lecon.ts`.
//
// `beforematch` EST CE QUI REND LE REPLI HONNÊTE. `hidden="until-found"` laisse le
// contenu TROUVABLE (Ctrl+F, navigation vers son fragment) : quand le navigateur révèle
// une étape repliée, il émet `beforematch` sur elle, et l'on resynchronise l'étape
// courante. Sans cet écouteur, la barre désignerait une étape que le lecteur ne regarde
// plus. `beforeprint`, lui, DÉPLIE tout : une impression ne doit jamais perdre M−1
// étapes.
// ⚠️ Dégradation connue et assumée : un navigateur qui ne connaît pas `until-found`
// traite `hidden="until-found"` comme un `hidden` ordinaire — l'étape repliée devient
// alors introuvable au Ctrl+F. Le contenu reste atteignable par la barre de liens, et
// l'état de départ (tout déplié) n'est jamais quitté sans une action du lecteur.
//
// 🔴 L-033 — `withNoIncrementalHydration()` est actif (`app.config.ts`), le rejeu
// d'événements est PERDU, et CE COMPOSANT N'EN EST PAS DISPENSÉ. Il ne porte aucun champ de
// saisie, mais il porte bien un état que le DOM accepte AVANT hydratation : LE FRAGMENT
// D'URL. Le modèle C′ pose les liens d'étape dès le prerender ; un clic sur « Étape 5 »
// pendant la fenêtre de pré-hydratation — ou un lien profond `…#simulation-etape-5` ouvert
// directement — navigue NATIVEMENT, sans que le composant voie rien. Sans le ré-amorçage
// ci-dessous, `courante` resterait à 1 : le lecteur serait à l'étape 5 pendant que la barre
// désignerait l'étape 1 comme courante et que « Suivante : étape 2 » le renverrait EN
// ARRIÈRE. D'où la lecture de `location.hash` dans l'`afterNextRender`.
// ⚠️ CE RÉ-AMORÇAGE NE TOUCHE PAS `replie`, et ce n'est pas un oubli : le modèle C′ replie
// au PREMIER GESTE du lecteur seulement. Un lien profond n'est pas un geste de repli, et
// replier ici ferait disparaître M−1 étapes sous les yeux de qui vient d'arriver.
// ⚠️ CE QUI EST PROUVÉ, ET CE QUI NE L'EST PAS (seconde moitié de L-033) : le test unitaire
// prouve que la lecture est JUSTE, jamais qu'elle arrive à TEMPS — `afterNextRender` court
// APRÈS la première détection de changements. C'est sans conséquence ici, parce que RIEN
// dans ce composant n'écrit le fragment : aucune détection de changements ne peut l'écraser,
// contrairement à la `value` d'un `<select>`. La mesure en navigateur appartient au lot c1.
// `hydrate` note le passage, pour que « rien ne se replie à l'hydratation » soit OBSERVABLE
// plutôt que promis (L-008).
//
// CE QUE CE COMPOSANT REFUSE, ET POURQUOI PERSONNE D'AUTRE NE LE FERA.
// `tools/content-pipeline/types.d.ts` le dit en toutes lettres : les renvois de
// l'`etatVisuel` vers les acteurs (`acteurActif`, `fleche.de`/`vers`, les clés de
// `panneaux`, `surbrillance`) sont tenus par `valider.mjs` AU BUILD, SUR `content/`
// UNIQUEMENT. `compilerSimulation` revalide le schéma — pas les renvois — et
// `lireLeconCompilee` s'arrête à l'ENVELOPPE. À la lecture de l'artéfact, ce fichier est
// donc le SEUL à pouvoir les refuser, et il LÈVE en nommant la cause : un no-op
// silencieux peindrait une étape à moitié sans qu'aucun gate ne rougisse.
//
// 🔒 `panneaux` NE SE LIT JAMAIS PAR INDEXATION DIRECTE. C'est un `Record<string, …>`
// issu d'un `JSON.parse` dont les clés viennent du contenu : `panneaux['constructor']`
// sur un objet dépourvu de cette clé rend `Object.prototype.constructor` — une fonction,
// donc une valeur *truthy* qui traverserait un `@if (panneau)` pour peindre un panneau
// vide. On passe par `new Map(Object.entries(panneaux))`, qui n'expose que les clés
// PROPRES. (La frontière refuse déjà `constructor` comme `id` d'ACTEUR ; ce composant se
// tient quand même, parce qu'il est la frontière suivante.)
//
// 🔴 LE `code` D'UN PANNEAU EST DU CODE VOLONTAIREMENT VULNÉRABLE, écrit par l'auteur de
// la leçon (`.claude/rules/contenu-pedagogique.md` §4). Il se rend par INTERPOLATION
// SEULE, en texte brut monospace — jamais de liaison de HTML brut, jamais de
// contournement du sanitizer (les deux noms ne sont même pas PRONONCÉS dans ce fichier :
// `src/garde-fou-contournements-sanitizer.spec.ts` balaie tout `src/**` en `.ts` et
// `.html` et refuse la simple mention hors du seul fichier autorisé),
// dans aucune circonstance, et aucune colorisation (Shiki tourne au build et ne part
// jamais au navigateur : décision inscrite au contrat). Même consigne pour `texte`.
// ⚠️ COLLISION S-011, exactement comme dans `quiz.ts` : `generer-config-swa.mjs` balaie
// le HTML prerendu et refuse le style en ligne comme le gestionnaire d'événement en
// ligne, or l'interpolation d'Angular n'échappe pas les guillemets. Tout nœud TEXTE
// portant du texte d'auteur peut donc faire échouer le build sur un message parlant de
// CSP. Les sites concernés ici, NOMMÉMENT : `panneaux[].texte`, `panneaux[].code`,
// `etapes[].narration`, `etapes[].titre`, `fleche.libelle`, `acteurs[].libelle` et le
// `titre` de la simulation. La parade est ÉDITORIALE — jamais d'assouplir le garde-fou.
//
// AUCUN SVG. Les flèches sont du TEXTE plus un trait CSS : le sanitizer d'Angular efface
// la totalité du SVG (mesuré : 24 éléments → 0, `src/sonde-sanitizer-svg.spec.ts`). Et
// aucune notation n'est bâtie sur « → » (U+2192), rendue par la police de REPLI sur ce
// dépôt (`tools/design/verifier-glyphes.mjs`) : le sens est écrit EN MOTS.
//
// ⚠️ RÉDACTION : blanches insécables U+00A0 UNIQUEMENT, écrites `&nbsp;` dans le gabarit
// et en séquence d'échappement dans le code, pour qu'on les VOIE à la relecture. Jamais
// U+202F ni U+2009, absentes de Fraunces comme d'Inter.
// =============================================================================

import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { ID_SIMULATION, PREFIXE_ID_ETAPE, TYPES_ACTEUR } from '../contenu-compile';

/** L'apparence d'un `type` d'acteur : un badge DÉCORATIF et un rôle ÉCRIT. */
interface ApparenceActeur {
  /**
   * Le badge est purement ASCII, et c'est délibéré : il est posé `aria-hidden` (il ne
   * dit rien qu'un lecteur d'écran doive entendre), et un pictogramme Unicode ou un
   * emoji retomberait sur la police de REPLI — ni Fraunces ni Inter ne les portent
   * (`docs/design/polices.md`). Ce qui porte le sens est `role`, écrit en toutes lettres.
   */
  readonly badge: string;
  readonly role: string;
}

/** Un panneau prêt à rendre : trois champs plats, aucun calcul dans le gabarit. */
interface PanneauPrepare {
  readonly texte: string | null;
  readonly code: string | null;
  /** L'étiquette ÉCRITE du bloc de code (le `langage` n'est pas une couleur ici). */
  readonly etiquette: string | null;
}

/** Une boîte d'acteur, telle qu'elle se peint à UNE étape donnée. */
interface BoitePreparee {
  readonly id: string;
  readonly libelle: string;
  readonly badge: string;
  readonly role: string;
  readonly actif: boolean;
  readonly danger: boolean;
  readonly panneau: PanneauPrepare | null;
}

/** Une étape prête à rendre. Tout y est FIGÉ dès l'entrée — voir la note 🔴 de l'en-tête. */
interface EtapePreparee {
  readonly numero: number;
  readonly idDocument: string;
  /** « Étape N sur M — titre », en UN SEUL nœud de texte (L-024). */
  readonly nom: string;
  /** « Étape N : titre », le libellé du lien de la barre. */
  readonly libelleLien: string;
  readonly narration: string;
  /** Le sens de la flèche, ÉCRIT EN MOTS, ou `null`. */
  readonly fleche: string | null;
  readonly boites: readonly BoitePreparee[];
}

/**
 * Le mot ÉCRIT de chaque état d'acteur — deuxième canal de WCAG 1.4.1, le premier étant
 * la couleur et le troisième la `narration`, qui dit la même chose en phrases. En
 * `forced-colors: active` les deux couleurs tombent sur `CanvasText` : il ne reste que
 * ces mots et le style du trait, et c'est exactement ce qui doit suffire.
 */
const MOT_ACTEUR_ACTIF = 'Acteur actif à cette étape';
const MOT_ACTEUR_DANGER = 'Danger — acteur exposé';

/** Le marqueur écrit de l'étape courante, dans la barre de liens. */
const MOT_ETAPE_COURANTE = '\u00A0(étape courante)';

/**
 * L'apparence d'un acteur, par `type`. Le `switch` est EXHAUSTIF sur l'union du contrat, et
 * c'est le `acteur.type satisfies never` de la branche `default` qui le TIENT : ajouter un
 * sixième type à `ActeurSimulation` sans lui écrire d'apparence fait échouer la COMPILATION,
 * plutôt que d'afficher une boîte MUETTE pour un lecteur d'écran. Sans lui, la phrase précédente serait
 * une promesse plus forte que ce que le code applique (famille S-009) : le cast de la
 * branche `default` suffit à faire accepter n'importe quel type par TypeScript.
 *
 * ⚠️ `attaquant` N'EST PAS UNE `personne` AU LIBELLÉ PARLANT — c'est un type à part
 * entière parce que les déroulés d'attaque du bloc A d'E3 font de l'opposition
 * attaquant/victime le propos même de la simulation. Les confondre rendrait la
 * distinction invisible à qui ne lit pas le `libelle`.
 */
function apparenceDe(acteur: ActeurSimulation): ApparenceActeur {
  switch (acteur.type) {
    case 'personne':
      return { badge: '[o]', role: 'Personne' };
    case 'attaquant':
      return { badge: '[!]', role: 'Attaquant' };
    case 'navigateur':
      return { badge: '[>]', role: 'Navigateur' };
    case 'serveur':
      return { badge: '[=]', role: 'Serveur' };
    case 'stockage':
      return { badge: '[#]', role: 'Stockage' };
    default: {
      // 🔒 LA MOITIÉ COMPILÉE DE LA GARANTIE. Sur l'union du contrat, `acteur.type` est ici
      // de type `never` ; l'annotation le VÉRIFIE, et c'est elle qui fait rougir `npm run
      // build` le jour où un sixième type entre dans `ActeurSimulation` sans apparence.
      // ⚠️ C'EST BIEN `acteur.type`, PAS `acteur` — mesuré : `ActeurSimulation` est UNE
      // interface dont un champ est une union, pas une union d'interfaces. Un `switch` sur
      // le champ ne rétrécit donc QUE le champ ; `acteur satisfies never` échouerait à la
      // compilation TOUJOURS, sur un code parfaitement sain.
      acteur.type satisfies never;
      // LA MOITIÉ EXÉCUTÉE. Inatteignable selon le contrat — `lireLeconCompilee` refuse
      // déjà un `type` hors de `TYPES_ACTEUR`. Le cas reste écrit : un artéfact compilé par
      // une AUTRE version du pipeline doit casser la construction, pas rendre une boîte
      // anonyme.
      const inconnu = acteur as { id?: unknown; type?: unknown };
      throw new Error(
        `Simulation : acteur « ${String(inconnu.id)} » de type inconnu ` +
          `« ${String(inconnu.type)} » — attendu ${TYPES_ACTEUR.join(' | ')}. ` +
          'Le contrat est `tools/content-pipeline/types.d.ts` ; une boîte sans icône ni ' +
          'rôle serait muette pour un lecteur d’écran. Régénérer avec ' +
          '`npm run content:build`.',
      );
    }
  }
}

function estRempli(valeur: unknown): boolean {
  return typeof valeur === 'string' && valeur.trim() !== '';
}

@Component({
  selector: 'app-simulation',
  imports: [RouterLink],
  styleUrl: './simulation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!--
      La région porte ID_SIMULATION — importé, jamais recopié : les ancres de section
      écrites par l'auteur et les id de la simulation partagent l'espace de noms du
      document, et lireLeconCompilee refuse déjà une leçon où les deux se heurteraient.
      tabindex="-1" la rend CIBLABLE : c'est la destination du lien « Réinitialiser ».
      Le nom accessible est UNE SEULE chaîne (L-024) : preserveWhitespaces: false retire
      le nœud blanc entre deux span adjacents et les colle en un mot.
    -->
    <section class="simulation" [id]="idRegion" tabindex="-1" [attr.aria-label]="nomDeLaRegion()">
      <h3 class="titre">{{ nomDeLaRegion() }}</h3>

      <p class="consigne">
        Les étapes sont toutes affichées ci-dessous. Choisir une étape dans la barre n’affiche plus
        que celle-là&nbsp;; «&nbsp;Réinitialiser&nbsp;» les réaffiche toutes.
      </p>

      <!--
        Le bandeau des acteurs : QUI intervient, une fois pour toute la simulation. Le
        badge est décoratif (aria-hidden) ; ce qui porte le sens est le rôle, ÉCRIT.
        ⚠️ role="list" EXPLICITE, ICI ET SUR LES TROIS AUTRES LISTES DU GABARIT. Ce n'est
        pas une redondance : Safari/VoiceOver RETIRE le rôle « list » d'une liste dont le
        list-style vaut none, et simulation.scss le met à none sur les quatre. Sans cet
        attribut, « liste de 3 éléments » ne serait jamais annoncé — la feuille de style
        déciderait de la sémantique.
      -->
      <ul class="acteurs" role="list">
        @for (acteur of acteursPrepares(); track acteur.id) {
          <li class="acteur">
            <span class="badge" aria-hidden="true">{{ acteur.badge }}</span>
            <span class="role">{{ acteur.role }}</span>
            <span class="libelle">{{ acteur.libelle }}</span>
          </li>
        }
      </ul>

      <!--
        🔴 routerLink + fragment, JAMAIS un href de fragment nu (L-030) : voir l'en-tête.
        Le (click) n'appelle AUCUN preventDefault — il enregistre l'intention, le
        navigateur navigue. Les liens précédent/suivant sont BORNÉS : au premier pas, le
        « précédent » désigne l'étape 1 elle-même. Ce n'est pas un lien mort — il pointe
        une cible réelle — et son libellé DIT le numéro visé, donc il ne ment pas.
      -->
      <nav class="barre" aria-label="Étapes de la simulation">
        <ul class="commandes" role="list">
          <li>
            <a
              class="lien"
              [routerLink]="[]"
              [fragment]="fragmentDe(numeroPrecedente())"
              (click)="allerA(numeroPrecedente())"
              >{{ libellePrecedente() }}</a
            >
          </li>
          <li>
            <a
              class="lien"
              [routerLink]="[]"
              [fragment]="fragmentDe(numeroSuivante())"
              (click)="allerA(numeroSuivante())"
              >{{ libelleSuivante() }}</a
            >
          </li>
          <li>
            <a class="lien" [routerLink]="[]" [fragment]="idRegion" (click)="reinitialiser()"
              >Réinitialiser&nbsp;: tout afficher</a
            >
          </li>
        </ul>

        <!--
          L'ÉTAT COURANT PASSE PAR DEUX CANAUX, ET AUCUN DES DEUX N'EST FACULTATIF.
          · Le canal MACHINE est aria-current="step" (WCAG 4.1.2) : un mot ÉCRIT est du
            CONTENU, pas un état programmatiquement déterminable — rien ne le distingue
            d'un titre d'étape qui contiendrait la même parenthèse, et aucune technologie
            d'assistance ne peut proposer « aller à l'élément courant » sur du texte.
          · Le canal VISUEL est le mot lui-même (WCAG 1.4.1 : indice non chromatique). Il
            reste donc à l'écran, et son span est aria-hidden pour ne pas faire annoncer
            deux fois la même chose — ce que l'absence de région aria-live existe pour
            éviter. Sa blanche insécable de tête sépare le mot du libellé À L'ŒIL (L-024).
          ⚠️ Le span est TOUJOURS présent, vide quand l'étape n'est pas la courante : un @if
          créerait un nœud APRÈS l'hydratation, ce que la note de l'en-tête interdit.
        -->
        <ol class="liens-etapes" role="list">
          @for (etape of etapesPreparees(); track etape.numero) {
            <li>
              <a
                class="lien"
                [class.est-courante]="etape.numero === courante()"
                [attr.aria-current]="etape.numero === courante() ? 'step' : null"
                [routerLink]="[]"
                [fragment]="etape.idDocument"
                (click)="allerA(etape.numero)"
                >{{ etape.libelleLien
                }}<span aria-hidden="true">{{ etatDuLien(etape.numero) }}</span></a
              >
            </li>
          }
        </ol>
      </nav>

      <!--
        LES M ÉTAPES, TOUTES DANS LE DOCUMENT. Ce qui bouge après hydratation est
        l'attribut hidden — jamais l'existence d'un nœud (voir la note 🔴 de l'en-tête).
        « until-found » garde l'étape TROUVABLE au Ctrl+F ; le navigateur émet alors
        beforematch, et l'on resynchronise l'étape courante.
      -->
      @for (etape of etapesPreparees(); track etape.numero) {
        <section
          class="etape"
          [id]="etape.idDocument"
          tabindex="-1"
          [attr.aria-label]="etape.nom"
          [attr.hidden]="estMasquee(etape.numero) ? 'until-found' : null"
          (beforematch)="signalerRevelation(etape.numero)"
        >
          <h4 class="titre-etape">{{ etape.nom }}</h4>

          <!--
            La narration est l'équivalent textuel de l'état visuel (WCAG 1.1.1) ET le
            TROISIÈME canal des marqueurs ci-dessous : elle redit en phrases ce que la
            couleur et le mot signalent.
          -->
          <p class="narration">{{ etape.narration }}</p>

          @if (etape.fleche) {
            <p class="fleche">{{ etape.fleche }}</p>
          }

          <ul class="scene" role="list">
            @for (boite of etape.boites; track boite.id) {
              <li class="boite" [class.est-actif]="boite.actif" [class.est-danger]="boite.danger">
                <span class="badge" aria-hidden="true">{{ boite.badge }}</span>
                <span class="role">{{ boite.role }}</span>
                <span class="libelle">{{ boite.libelle }}</span>

                @if (boite.actif) {
                  <b class="marqueur marqueur-actif">{{ motActeurActif }}</b>
                }
                @if (boite.danger) {
                  <b class="marqueur marqueur-danger">{{ motActeurDanger }}</b>
                }

                @if (boite.panneau; as panneau) {
                  <div class="panneau">
                    @if (panneau.texte) {
                      <p class="panneau-texte">{{ panneau.texte }}</p>
                    }
                    @if (panneau.etiquette) {
                      <p class="etiquette">{{ panneau.etiquette }}</p>
                    }
                    @if (panneau.code) {
                      <pre class="code"><code>{{ panneau.code }}</code></pre>
                    }
                  </div>
                }
              </li>
            }
          </ul>
        </section>
      }
    </section>
  `,
})
export class Simulation {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * La simulation de la leçon, REQUISE. L'optionnalité vit un cran au-dessus (lot b2) :
   * un input optionnel laisserait ce composant rendre une coquille vide sur une page
   * publiée, ce que le compte d'ancres `[[simulation]]` existe précisément pour interdire.
   */
  readonly simulation = input.required<SimulationCompilee>();

  /** Les mots des marqueurs, exposés au gabarit — jamais recopiés dans le HTML. */
  protected readonly motActeurActif = MOT_ACTEUR_ACTIF;
  protected readonly motActeurDanger = MOT_ACTEUR_DANGER;

  /** L'`id` de document de la région — importé de la frontière, jamais recopié. */
  protected readonly idRegion = ID_SIMULATION;

  /**
   * L'étape que le lecteur regarde. Elle vaut 1 au prerender : c'est le point de départ
   * de la lecture, et c'est lui qui donne aux liens « précédent / suivant » une cible
   * stable dans le HTML servi.
   */
  protected readonly courante = signal(1);

  /**
   * `false` tant que le lecteur n'a rien demandé — et il n'y a AUCUN chemin qui le passe
   * à `true` sans un clic. C'est la moitié exécutable de la décision « rien ne change à
   * l'hydratation ».
   */
  protected readonly replie = signal(false);

  /**
   * Vrai une fois le premier rendu client passé. Il ne pilote RIEN — c'est le propos :
   * il existe pour rendre « rien ne se replie à l'hydratation » OBSERVABLE, plutôt
   * qu'affirmé en commentaire (L-008). `afterNextRender` ne s'exécute jamais au
   * prerender.
   */
  readonly hydrate = signal(false);

  constructor() {
    afterNextRender(() => {
      this.hydrate.set(true);

      // `beforeprint` est un événement de FENÊTRE : il n'a pas d'hôte dans le gabarit.
      // La garde n'est pas une précaution de style — un environnement sans `defaultView`
      // (le prerender, un DOM détaché) ne doit rien enregistrer.
      const vue = this.document.defaultView;
      if (!vue) return;

      // 🔴 L-033 — LE FRAGMENT EST L'ÉTAT SAISI DANS LE DOM (voir l'en-tête). On le relit
      // au premier rendu client, avant tout le reste : c'est la seule chose que le lecteur
      // ait pu changer sans que le composant l'apprenne.
      this.amorcerDepuisLeFragment(vue.location.hash);

      const surImpression = (): void => {
        // Une impression ne doit jamais perdre M−1 étapes.
        this.replie.set(false);
      };
      vue.addEventListener('beforeprint', surImpression);
      this.destroyRef.onDestroy(() => {
        vue.removeEventListener('beforeprint', surImpression);
      });
    });
  }

  /** Le nom de la région, en UN SEUL nœud de texte (L-024). */
  readonly nomDeLaRegion = computed(() => `Simulation\u00A0: ${this.simulation().titre}`);

  /**
   * Le bandeau d'acteurs. Il passe par `apparenceDe`, donc un `type` hors contrat LÈVE
   * ici aussi — la même frontière, quel que soit le chemin de rendu.
   */
  readonly acteursPrepares = computed<readonly BoitePreparee[]>(() =>
    this.simulation().acteurs.map((acteur) => {
      const apparence = apparenceDe(acteur);
      return {
        id: acteur.id,
        libelle: acteur.libelle,
        badge: apparence.badge,
        role: apparence.role,
        actif: false,
        danger: false,
        panneau: null,
      };
    }),
  );

  /**
   * Les étapes, VALIDÉES puis mises à plat. C'est ici que le contrat est confronté à la
   * donnée — voir la note « CE QUE CE COMPOSANT REFUSE » de l'en-tête : personne d'autre
   * ne vérifie ces renvois à la lecture de l'artéfact.
   */
  readonly etapesPreparees = computed<readonly EtapePreparee[]>(() => this.preparer());

  /** Le nombre d'étapes — le « sur M » du nom accessible, et la borne haute des liens. */
  readonly total = computed(() => this.etapesPreparees().length);

  /** L'étape régulièrement désignée par la barre. Exposée pour le gabarit et les tests. */
  readonly etapeCourante = computed(() => this.courante());

  /** Vrai dès que le lecteur a replié la vue sur une étape. */
  readonly estRepliee = computed(() => this.replie());

  readonly numeroPrecedente = computed(() => Math.max(1, this.courante() - 1));

  readonly numeroSuivante = computed(() => Math.min(this.total(), this.courante() + 1));

  /** Le libellé DIT le numéro visé : borné aux extrémités, il ne ment donc jamais. */
  readonly libellePrecedente = computed(() => `Précédente\u00A0: étape ${this.numeroPrecedente()}`);

  readonly libelleSuivante = computed(() => `Suivante\u00A0: étape ${this.numeroSuivante()}`);

  /** L'`id` de document d'une étape — bâti sur la POSITION, jamais sur `etape.numero`. */
  fragmentDe(numero: number): string {
    return `${PREFIXE_ID_ETAPE}${numero}`;
  }

  /** Le marqueur ÉCRIT de l'étape courante, ou la chaîne vide. */
  etatDuLien(numero: number): string {
    return numero === this.courante() ? MOT_ETAPE_COURANTE : '';
  }

  /** Vrai quand l'étape doit porter `hidden="until-found"`. */
  estMasquee(numero: number): boolean {
    return this.replie() && numero !== this.courante();
  }

  /**
   * Enregistre l'étape demandée et replie la vue. AUCUN `preventDefault` : la navigation
   * de fragment reste native, avant comme après hydratation, et c'est elle qui porte le
   * focus sur l'étape (`tabindex="-1"`).
   */
  allerA(numero: number): void {
    this.courante.set(numero);
    this.replie.set(true);
  }

  /** « Réinitialiser » : tout redevient visible, et la lecture repart de l'étape 1. */
  reinitialiser(): void {
    this.replie.set(false);
    this.courante.set(1);
  }

  /**
   * Le navigateur vient de révéler une étape repliée (`beforematch`) : on resynchronise
   * l'étape courante. On NE déplie PAS tout — le lecteur a demandé UNE étape, pas la
   * fin du repli.
   */
  signalerRevelation(numero: number): void {
    this.courante.set(numero);
  }

  /**
   * Ré-amorce l'étape courante depuis le fragment de l'URL (L-033 — voir l'en-tête).
   * EXPOSÉE pour le test, appelée par le seul `afterNextRender`.
   *
   * Le fragment est confronté au PRÉFIXE importé de la frontière, jamais à une chaîne
   * recopiée. Trois refus, et chacun laisse l'état INTACT plutôt que de deviner :
   *   · un fragment qui vise autre chose (une ancre de section, une question du quiz) n'a
   *     rien à dire sur cette simulation ;
   *   · un numéro qui ne se réécrit pas À L'IDENTIQUE — `…-etape-007`, `…-etape-+1` —
   *     ne désigne l'`id` d'AUCUNE étape du document ;
   *   · un numéro hors des bornes désignerait une étape qui n'existe pas, et la barre
   *     mentirait dans l'autre sens.
   */
  amorcerDepuisLeFragment(fragment: string): void {
    const debut = `#${PREFIXE_ID_ETAPE}`;
    if (!fragment.startsWith(debut)) return;

    const reste = fragment.slice(debut.length);
    const numero = Number(reste);
    if (!Number.isInteger(numero) || String(numero) !== reste) return;
    if (numero < 1 || numero > this.total()) return;

    this.courante.set(numero);
  }

  // ---------------------------------------------------------------------------
  // Validation nominative des renvois de l'`etatVisuel`
  // ---------------------------------------------------------------------------

  private preparer(): readonly EtapePreparee[] {
    const simulation = this.simulation();
    const total = simulation.etapes.length;

    // Deux tables plutôt qu'une indexation : `Map` n'a pas de prototype à traverser, et
    // c'est ce qui rend `constructor` inoffensif partout en dessous.
    const libelles = new Map<string, string>();
    const apparences = new Map<string, ApparenceActeur>();
    for (const acteur of simulation.acteurs) {
      libelles.set(acteur.id, acteur.libelle);
      apparences.set(acteur.id, apparenceDe(acteur));
    }

    return simulation.etapes.map((etape, rang) => {
      const numero = rang + 1;
      const manques: string[] = [];
      const etat = etape.etatVisuel;

      if (!libelles.has(etat.acteurActif)) {
        manques.push(
          `« etatVisuel.acteurActif » : « ${String(etat.acteurActif)} » ne désigne aucun acteur`,
        );
      }

      const surbrillance = new Set(etat.surbrillance ?? []);
      for (const id of surbrillance) {
        if (!libelles.has(id)) {
          manques.push(`« etatVisuel.surbrillance » : « ${id} » ne désigne aucun acteur`);
        }
      }

      // 🔒 `Object.entries` n'expose que les clés PROPRES : `panneaux['constructor']` ne
      // peut pas remonter `Object.prototype.constructor` par ce chemin.
      const panneaux = new Map(Object.entries(etat.panneaux ?? {}));
      for (const [id, panneau] of panneaux) {
        if (!libelles.has(id)) {
          manques.push(`« etatVisuel.panneaux » : la clé « ${id} » ne désigne aucun acteur`);
        }
        if (!estRempli(panneau.texte) && !estRempli(panneau.code)) {
          manques.push(
            `« etatVisuel.panneaux.${id} » : ni « texte » ni « code » — le panneau serait vide`,
          );
        }
      }

      let fleche: string | null = null;
      if (etat.fleche) {
        const depart = libelles.get(etat.fleche.de);
        const arrivee = libelles.get(etat.fleche.vers);
        if (depart === undefined) {
          manques.push(
            `« etatVisuel.fleche.de » : « ${String(etat.fleche.de)} » ne désigne aucun acteur`,
          );
        }
        if (arrivee === undefined) {
          manques.push(
            `« etatVisuel.fleche.vers » : « ${String(etat.fleche.vers)} » ne désigne aucun acteur`,
          );
        }
        if (depart !== undefined && arrivee !== undefined) {
          // Le sens est ÉCRIT EN MOTS : aucune notation bâtie sur « → », rendue par la
          // police de repli sur ce dépôt.
          const libelle = etat.fleche.libelle;
          fleche =
            `De ${depart} vers ${arrivee}` + (estRempli(libelle) ? `\u00A0— ${libelle}` : '');
        }
      }

      if (manques.length > 0) this.refuser(numero, etape.titre, manques);

      const boites: readonly BoitePreparee[] = simulation.acteurs.map((acteur) => {
        const apparence = apparences.get(acteur.id);
        if (apparence === undefined) {
          // Impossible par construction : la table est bâtie du MÊME tableau. Elle lève
          // plutôt que de retomber sur une boîte anonyme — un repli muet rendrait une
          // scène incomplète sans qu'aucun gate ne rougisse.
          this.refuser(numero, etape.titre, [
            `acteur « ${acteur.id} » : aucune apparence préparée (défaut de ce composant)`,
          ]);
        }
        const panneau = panneaux.get(acteur.id);
        return {
          id: acteur.id,
          libelle: acteur.libelle,
          badge: apparence.badge,
          role: apparence.role,
          actif: acteur.id === etat.acteurActif,
          danger: surbrillance.has(acteur.id),
          panneau:
            panneau === undefined
              ? null
              : {
                  texte: estRempli(panneau.texte) ? (panneau.texte ?? null) : null,
                  code: estRempli(panneau.code) ? (panneau.code ?? null) : null,
                  etiquette: estRempli(panneau.code)
                    ? `Extrait de code${estRempli(panneau.langage) ? `\u00A0— ${panneau.langage}` : ''}`
                    : null,
                },
        };
      });

      return {
        numero,
        // 🔴 L'`id` vient de la POSITION, jamais d'`etape.numero` : un `numero` qui ne
        // suivrait pas la position ferait deux étapes au même `id`, ou un lien vers rien.
        idDocument: `${PREFIXE_ID_ETAPE}${numero}`,
        nom: `Étape ${numero} sur ${total}\u00A0— ${etape.titre}`,
        libelleLien: `Étape ${numero}\u00A0: ${etape.titre}`,
        narration: etape.narration,
        fleche,
        boites,
      };
    });
  }

  private refuser(numero: number, titre: string, manques: readonly string[]): never {
    throw new Error(
      `Simulation : étape n°${numero} (« ${titre} ») invalide — ${manques.join(' · ')}. ` +
        'Les renvois de l’« etatVisuel » vers les acteurs sont tenus par ' +
        '`tools/content-pipeline/valider.mjs` AU BUILD et sur `content/` uniquement : à la ' +
        'lecture de l’artéfact, ce composant est le seul à les refuser. Le contrat est ' +
        '`tools/content-pipeline/types.d.ts` ; régénérer avec `npm run content:build`.',
    );
  }
}
