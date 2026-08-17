// =============================================================================
// RenduBlocs — le rendu RÉCURSIF d'un `BlocContenu[]` compilé (E2-ST2, lot A)
// -----------------------------------------------------------------------------
// CE QUE FAIT CE COMPOSANT, ET RIEN D'AUTRE. Il reçoit le tableau de blocs d'UNE
// section de leçon — la sortie du pipeline de contenu, jamais du Markdown — et le
// pose dans la page. Il ne charge rien, ne route rien, ne connaît ni le slug ni le
// sommaire : c'est l'affaire de la page de leçon (lot B). Aucun parseur Markdown
// au runtime : tout est déjà HTML au moment où ce composant s'exécute.
//
// LE CONTRAT VIENT DE `tools/content-pipeline/types.d.ts`, ET DE NULLE PART AILLEURS.
// `BlocContenu`, `Langage` et leurs voisins sont des types AMBIANTS — pas d'`import`
// au-dessus, et c'est voulu : le fichier ne porte que des déclarations globales et il
// est listé nominativement dans `tsconfig.tools.json`, `tsconfig.app.json` et
// `tsconfig.spec.json`. Une seule déclaration, trois programmes. Recopier ces formes
// ici donnerait deux vérités qui divergeraient au premier champ ajouté (L-016).
//
// LES SEPT TYPES DE BLOCS SONT TRAITÉS EXPLICITEMENT, ET UN TYPE INCONNU LÈVE.
// `preparer()` ci-dessous valide le `type` de chaque bloc contre une liste
// NOMINATIVE avant tout rendu. Un JSON compilé par une version antérieure ou
// postérieure du pipeline fait donc ÉCHOUER le prerender, en nommant le type fautif
// et la position du bloc — au lieu de laisser un trou silencieux dans une leçon
// publiée. C'est le comportement voulu : le rendu a lieu au build, l'échec casse le
// build (même principe que la garde de `PageAVenir` sur `data.titre`).
//
// ⚠️ LES STYLES DE `rendu-blocs.scss` N'ATTEIGNENT PAS LE HTML LIÉ EN `[innerHTML]`.
// L'encapsulation d'Angular tague les éléments écrits DANS le gabarit, pas ceux
// qu'on injecte. La mise en forme de la prose, du code coloré (`.shiki`) et des
// diagrammes vient donc des feuilles GLOBALES — `src/styles.scss`,
// `src/styles/_coloration-syntaxique-generee.scss`, `src/styles/_mermaid-generee.scss`.
// Cette feuille-ci n'habille que les enveloppes écrites ci-dessous. Ce n'est pas un
// contournement à trouver : c'est la raison pour laquelle `_mermaid-generee.scss`
// accroche `svg.diagramme-mermaid` et ne dépend d'aucun balisage d'E2-ST2.
//
// ⚠️ RÉDACTION : blanches insécables U+00A0 UNIQUEMENT, écrites `&nbsp;` pour qu'on
// les VOIE à la relecture (jamais U+202F ni U+2009, absentes de Fraunces comme
// d'Inter) — `.claude/rules/contenu-pedagogique.md` §3.
// =============================================================================

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

/**
 * Les types de blocs que ce composant sait rendre — liste NOMINATIVE, jamais un
 * `default` muet. Elle vaut aussi contrôle de complétude : ajouter un membre à
 * l'union de `BlocContenu` sans l'ajouter ici fait lever au premier rendu, et
 * l'oublier des deux côtés fait rougir `rendu-blocs.spec.ts`.
 */
const TYPES_RENDUS = [
  'prose',
  'code',
  'comparaison',
  'mermaid',
  'encadre',
  'ancre-quiz',
  'ancre-simulation',
] as const;

/** Étiquette visible d'un encadré. WCAG 1.4.1 : le genre de l'encadré ne peut pas
 * reposer sur sa seule couleur ni sur son seul style de trait — il est ÉCRIT. */
const ETIQUETTES_ENCADRE: Record<'attention' | 'note' | 'a-retenir', string> = {
  attention: 'Attention',
  note: 'Note',
  'a-retenir': 'À retenir',
};

/**
 * Le bloc `mermaid`, préparé : son `svg` est devenu une valeur de confiance, UNE
 * SEULE FOIS, dans `preparer()`. Le gabarit ne fait donc aucun appel de méthode —
 * une valeur `SafeHtml` recalculée à chaque détection remplacerait le SVG à chaque
 * cycle et perdrait la position de défilement comme le focus.
 *
 * C'est le SEUL membre de l'union qui soit restaté ici : les six autres traversent
 * `Exclude<…>` intacts, donc sans copie du contrat (L-016).
 */
interface MermaidPrepare {
  type: 'mermaid';
  svgDeConfiance: SafeHtml;
  titreAccessible: string;
  descriptionLongue: string;
}

/** Ce que le gabarit consomme réellement : le contrat, `mermaid` mis à part. */
type BlocPrepare = Exclude<BlocContenu, { type: 'mermaid' }> | MermaidPrepare;

@Component({
  selector: 'app-rendu-blocs',
  styleUrl: './rendu-blocs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // AUCUN `@default` dans le `@switch` ci-dessous, et c'est délibéré : le cas
  // inconnu est traité AVANT le rendu, par `preparer()`, qui lève en nommant le
  // type. Un `@default` ici ne pourrait qu'être muet ou redondant.
  template: `
    @for (bloc of blocsPrepares(); track $index) {
      @switch (bloc.type) {
        @case ('prose') {
          <!--
            Sanitizer d'Angular ACTIF, aucun contournement : ce HTML sort de
            markdown-it, mais il traverse quand même le filtre du framework. Le
            pipeline de contenu est une frontière de confiance, pas une dispense
            (.claude/rules/security.md §4). Mesuré par la sonde de conservation de
            rendu-blocs.spec.ts : les formes que markdown-it et Shiki produisent
            survivent intactes.
          -->
          <div class="prose" [innerHTML]="bloc.html"></div>
        }

        @case ('code') {
          <div class="code" [attr.data-langage]="bloc.langage" [innerHTML]="bloc.htmlColore"></div>
        }

        @case ('comparaison') {
          <!--
            RENDU PROVISOIRE, ASSUMÉ COMME TEL. Le composant complet est E2-ST4,
            dont les onglets de langage sont un sous-projet d'accessibilité à part
            entière (backlog §E2-ST4). On n'écrit donc ICI aucun rôle « tab » :
            un motif ARIA à moitié posé dégrade l'accessibilité au lieu de
            l'améliorer. La forme provisoire est simplement empilée, complète et
            lisible sans JS — les deux volets sont dans le document, chacun avec
            son étiquette écrite et ses annotations rattachées.
          -->
          <div class="comparaison">
            @for (exemple of bloc.exemples; track $index) {
              <div class="paire">
                <div class="volet volet-vulnerable">
                  <p class="etiquette">Exemple vulnérable&nbsp;— {{ exemple.langage }}</p>
                  <div class="code" [innerHTML]="exemple.vulnerable.htmlColore"></div>
                  @if (exemple.vulnerable.annotations.length > 0) {
                    <ul class="annotations">
                      @for (note of exemple.vulnerable.annotations; track $index) {
                        <li>
                          @if (note.ligne > 0) {
                            <b class="portee">Ligne {{ note.ligne }}&nbsp;:</b>
                          } @else {
                            <b class="portee">Ensemble du bloc&nbsp;:</b>
                          }
                          {{ note.texte }}
                        </li>
                      }
                    </ul>
                  }
                </div>

                <div class="volet volet-corrige">
                  <p class="etiquette">Correctif&nbsp;— {{ exemple.langage }}</p>
                  <div class="code" [innerHTML]="exemple.corrige.htmlColore"></div>
                  @if (exemple.corrige.annotations.length > 0) {
                    <ul class="annotations">
                      @for (note of exemple.corrige.annotations; track $index) {
                        <li>
                          @if (note.ligne > 0) {
                            <b class="portee">Ligne {{ note.ligne }}&nbsp;:</b>
                          } @else {
                            <b class="portee">Ensemble du bloc&nbsp;:</b>
                          }
                          {{ note.texte }}
                        </li>
                      }
                    </ul>
                  }
                </div>
              </div>
            }
          </div>
        }

        @case ('mermaid') {
          <figure class="diagramme">
            <!--
              role="img" + aria-label : le rôle « img » est un rôle FEUILLE (ses
              enfants sont présentationnels), donc la centaine de g/path du
              diagramme n'est pas parcourue nœud par nœud par un lecteur d'écran.
              Le nom accessible court vient de la directive accTitle (WCAG 1.1.1),
              et l'équivalent textuel complet vit dans le details NATIF ci-dessous
              — pas de JS : withNoIncrementalHydration() est actif
              (src/app/app.config.ts), donc tout ce qui dépendrait d'un
              gestionnaire d'événement serait mort sur une page prerendue.
            -->
            <div
              class="dessin"
              role="img"
              [attr.aria-label]="bloc.titreAccessible"
              [innerHTML]="bloc.svgDeConfiance"
            ></div>
            <details class="equivalent">
              <summary>Description du diagramme</summary>
              <p>{{ bloc.descriptionLongue }}</p>
            </details>
          </figure>
        }

        @case ('encadre') {
          <aside class="encadre" [attr.data-variante]="bloc.variante">
            <p class="etiquette">{{ etiquetteEncadre(bloc.variante) }}</p>
            <!-- RÉCURSION : un encadré porte lui-même des blocs. L'enfant refait
                 sa propre validation, donc un type inconnu imbriqué lève aussi. -->
            <app-rendu-blocs [blocs]="bloc.blocs" />
          </aside>
        }

        @case ('ancre-quiz') {
          <!--
            RIEN N'EST RENDU, ET C'EST LA DÉCISION. Le quiz est E2-ST3 : afficher
            aujourd'hui un cadre « Quiz » ou un « à venir » ferait mentir la page à
            l'écran. Le cas est traité NOMMÉMENT (il ne tombe dans aucun default),
            sa position dans le flux est celle où E2-ST3 posera le composant.
          -->
        }

        @case ('ancre-simulation') {
          <!-- Idem, pour E2-ST5. Voir le commentaire du cas ancre-quiz. -->
        }
      }
    }
  `,
})
export class RenduBlocs {
  private readonly assainisseur = inject(DomSanitizer);

  /** Les blocs d'UNE section, dans l'ordre du document. Un tableau vide est légitime. */
  readonly blocs = input.required<readonly BlocContenu[]>();

  /**
   * Valide puis prépare les blocs. Deux choses s'y passent, et une seule est
   * visible : la validation du `type` (qui lève) et la mise en confiance du SVG des
   * diagrammes (qui ne se fait qu'ICI, une fois par bloc).
   */
  readonly blocsPrepares = computed<readonly BlocPrepare[]>(() =>
    this.blocs().map((bloc, rang) => this.preparer(bloc, rang)),
  );

  /** L'étiquette écrite d'un encadré — troisième canal de WCAG 1.4.1. */
  etiquetteEncadre(variante: 'attention' | 'note' | 'a-retenir'): string {
    return ETIQUETTES_ENCADRE[variante];
  }

  private preparer(bloc: BlocContenu, rang: number): BlocPrepare {
    const connus: readonly string[] = TYPES_RENDUS;
    if (!connus.includes(bloc.type)) {
      throw new Error(
        `RenduBlocs : type de bloc inconnu « ${bloc.type} » (bloc n°${rang + 1}). ` +
          `Types rendus : ${TYPES_RENDUS.join(', ')}. Le contrat est ` +
          '`tools/content-pipeline/types.d.ts` — un bloc non rendu serait un trou ' +
          'silencieux dans la leçon, on préfère casser la construction.',
      );
    }

    if (bloc.type !== 'mermaid') return bloc;

    // Le pipeline ÉCHOUE déjà sans `accTitle:` / `accDescr` (`rendre-mermaid.mjs`).
    // Ce contrôle-ci couvre le seul cas qu'il ne couvre pas : un JSON compilé par une
    // version antérieure du pipeline atteignant ce composant. Un `role="img"` sans nom
    // accessible est une violation de 1.1.1 livrée en silence.
    if (bloc.titreAccessible.trim() === '' || bloc.descriptionLongue.trim() === '') {
      throw new Error(
        `RenduBlocs : diagramme sans équivalent textuel (bloc n°${rang + 1}). ` +
          '`titreAccessible` et `descriptionLongue` sont requis (WCAG 1.1.1) ; ils ' +
          'viennent des directives `accTitle:` / `accDescr` du diagramme Mermaid.',
      );
    }

    return {
      type: 'mermaid',
      svgDeConfiance: this.assainisseur.bypassSecurityTrustHtml(bloc.svg),
      titreAccessible: bloc.titreAccessible,
      descriptionLongue: bloc.descriptionLongue,
    };
  }
}

// =============================================================================
// ⚠️ L'UNIQUE `bypassSecurityTrustHtml` DU SITE — sa justification, nominative
// -----------------------------------------------------------------------------
// Patron : `HACHAGE_SCRIPT_ATTENDU` dans `tools/deploiement/generer-config-swa.mjs`.
// Ce texte décrit CE QUE LE CODE APPLIQUE, ni plus ni moins — une justification plus
// large que la garantie réelle est très exactement le constat S-009
// (`.claude/lessons/security-lessons.md`).
//
// 1 · POURQUOI IL EST INÉVITABLE. Mesuré, pas supposé : `src/sonde-sanitizer-svg.spec.ts`
//     lie un SVG `mmdc` réaliste en `[innerHTML]` sur l'Angular réellement installé et
//     compte les survivants — 24 éléments → 0, 71 attributs → 0. Le sanitizer d'Angular
//     n'admet pas SVG. Un diagramme lié sans contournement serait illisible ET sans
//     `<title>`/`<desc>` (WCAG 1.1.1 non tenu). Cette sonde reste versionnée comme
//     TRIPWIRE : si une montée d'Angular réadmettait SVG, elle rougit, et le présent
//     commentaire devient faux au même instant.
//
// 2 · SA PORTÉE, EXACTEMENT. Un seul appel, dans `preparer()`, sur la seule branche
//     `bloc.type === 'mermaid'`, sur le seul champ `bloc.svg`. Ce n'est PAS une méthode
//     générique : `prose`, `code` et les deux volets de `comparaison` passent par
//     `[innerHTML]` NU, donc par le sanitizer d'Angular. `rendu-blocs.spec.ts` tient les
//     deux moitiés de la pince : un `<script>` glissé dans un bloc `prose` est bien
//     neutralisé (contrôle négatif), et le SVG d'un bloc `mermaid` arrive bien entier
//     (contrôle positif du contournement lui-même).
//
// 3 · CE QUI A RÉELLEMENT FILTRÉ CE `svg`, ET QUI SEUL AUTORISE LE CONTOURNEMENT.
//     Le champ est produit À LA COMPILATION par `tools/content-pipeline/rendre-mermaid.mjs`,
//     jamais reçu à l'exécution, et il a traversé un ANALYSEUR XML RÉEL (jsdom,
//     contentType `image/svg+xml`) — pas un jeu de motifs. Nominativement :
//       · liste blanche d'ÉLÉMENTS (`ELEMENTS_AUTORISES`) ; tout élément absent fait
//         ÉCHOUER le build en se nommant ; `<a>`, `<use>`, `<image>`, `<animate>`,
//         `<animateTransform>`, `<animateMotion>`, `<set>`, `<script>` et
//         `<foreignObject>` sont en outre refusés NOMMÉMENT ;
//       · liste blanche d'ATTRIBUTS (`ATTRIBUTS_AUTORISES`) + les seuls préfixes `data-`
//         et `aria-` ; tout `on…` est refusé ;
//       · `href` / `xlink:href` admis UNIQUEMENT en `#…` (référence interne) ;
//       · `<style>` et l'attribut `style=` RETIRÉS (la CSP du site est à hachages, S-005) ;
//       · CONTRÔLE DE CONSERVATION : la sortie est re-parsée par le même analyseur,
//         y compris tout SVG relu du cache et tout `svg` de l'AST (`controlerSvgCompiles`).
//     Le détail complet, tenu à jour avec le code qu'il décrit, est dans la note du bloc
//     `mermaid` de `tools/content-pipeline/types.d.ts`.
//
// 4 · CE QUE ÇA VEUT DIRE, SANS ADOUCISSEMENT. Le sanitizer d'Angular ne repassera PAS
//     derrière : l'analyseur de `rendre-mermaid.mjs` est le SEUL filtre sur ce chemin.
//     Élargir une de ses listes blanches élargit ce que cette page accepte. Cela se fait
//     LÀ-BAS, nominativement, et exige une revue `security-reviewer` — pas un `//` ici.
//
// 5 · REVUE. Une passe `security-reviewer` sur ce fichier est OBLIGATOIRE avant le merge
//     d'E2-ST2 (exigée par le plan arrêté d'E2-ST1 et par `.claude/rules/security.md` §4).
// =============================================================================
