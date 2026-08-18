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
// ⚠️ RÉDACTION : blanches insécables U+00A0 UNIQUEMENT, écrites `&nbsp;` dans le
// gabarit pour qu'on les VOIE à la relecture, et `'\u00A0'` (constante `INSECABLE`)
// dans le TypeScript, où `no-irregular-whitespace` refuse la vraie — jamais U+202F ni
// U+2009, absentes de Fraunces comme d'Inter (`.claude/rules/contenu-pedagogique.md` §3).
//
// E2-ST4 (lot A1) : `preparer()` refuse aussi une PORTÉE d'annotation malformée. Ce qu'il
// peut et ne peut pas constater est écrit sur `fautePortee` — la borne « la ligne existe »
// n'est PAS vérifiable ici, faute de code brut dans l'artéfact ; elle se tient au
// compilateur (`lirePortee`).
// =============================================================================

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

import { Quiz } from '../../quiz/quiz';

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

/** U+00A0 écrite en échappement : `no-irregular-whitespace` refuse la vraie dans un littéral. */
const INSECABLE = '\u00A0';

/**
 * Ce que la page peut HONNÊTEMENT constater d'une portée d'annotation — et ce qu'elle ne peut pas.
 *
 * CE QU'ELLE CONSTATE (E2-ST4, lot A1) : la forme. Une portée vide, un `1.5`, un `-1`, un `NaN`,
 * un doublon, ou un `0` mêlé à des numéros de ligne rendraient une étiquette absurde — « Ligne
 * NaN : », « Ligne 1 et 1 : » — dans une leçon publiée, sans qu'aucun gate ne rougisse. Ces cas
 * sont IMPOSSIBLES à la sortie du compilateur ; ce contrôle-ci couvre le seul qu'il ne couvre pas,
 * celui d'un `lecons/<slug>.json` compilé par une AUTRE version du pipeline (même raison que le
 * contrôle d'équivalent textuel des diagrammes, juste en dessous).
 *
 * 🔴 CE QU'ELLE NE PEUT PAS CONSTATER, ET IL FAUT LE DIRE : que la ligne 42 EXISTE dans l'extrait.
 * `ExempleCode` ne conserve pas le code brut (`tools/content-pipeline/types.d.ts`) — la page ne
 * voit que le HTML coloré. Le déduire du balisage de Shiki (compter les `class="line"`) ferait
 * dériver une garantie de l'artéfact même qu'elle est censée contrôler, et cette garantie
 * disparaîtrait en silence à la première évolution du rendu : c'est le patron que S-005 et S-009
 * refusent. Cette borne se tient dans `lirePortee` (`compiler-markdown.mjs`) — le dernier endroit
 * du pipeline où le code source est encore là — ou elle ne se tient pas.
 *
 * ⚠️ LE PARAMÈTRE EST `unknown`, ET C'EST LE CŒUR DU CONTRÔLE. Le seul cas réaliste d'un artéfact
 * « d'une autre version du pipeline » est justement l'ANCIENNE forme `{ ligne: 1 }` d'avant E2-ST4 :
 * `lignes` y vaut `undefined`. Typer ce paramètre `readonly number[]` faisait donc lever un
 * `TypeError: Cannot read properties of undefined` — un plantage ANONYME sur le seul cas que le
 * texte ci-dessus prétend couvrir, c'est-à-dire une justification plus large que la garantie
 * appliquée (patron S-009 / L-008). La garde `Array.isArray` est en première ligne pour cette
 * raison, et son message NOMME l'ancienne forme.
 *
 * @returns la faute constatée, ou `null` si la portée est bien formée
 */
function fautePortee(lignes: unknown): string | null {
  if (!Array.isArray(lignes)) {
    return (
      '« lignes » absent ou non-tableau — « ligne » est l’ancienne forme, d’avant E2-ST4 ' +
      `(reçu ${decrire(lignes)})`
    );
  }
  const portee: readonly unknown[] = lignes;
  if (portee.length === 0) return 'portée vide (attendu au moins un numéro, ou 0 pour le bloc)';
  const horsContrat = portee.filter(
    (ligne) => typeof ligne !== 'number' || !Number.isInteger(ligne) || ligne < 0,
  );
  if (horsContrat.length > 0) {
    return `entiers >= 0 attendus — reçu ${horsContrat.map(decrire).join(', ')}`;
  }
  if (new Set(portee).size !== portee.length) {
    return `ligne citée deux fois — ${portee.map(decrire).join(', ')}`;
  }
  if (portee.includes(0) && portee.length > 1) {
    return `0 (le bloc entier) mêlé à des numéros de ligne — ${portee.map(decrire).join(', ')}`;
  }
  return null;
}

/**
 * Rend une valeur hors contrat LISIBLE dans un message d'erreur — c'est la raison d'être du
 * garde-fou, pas un détail de présentation. `String(null)` donne « null » mais `[null].join()` la
 * chaîne VIDE, et un objet donne « [object Object] » : le message accuserait alors une portée
 * fautive sans jamais dire ce qu'il a reçu. `JSON.stringify` restitue la forme ; les nombres
 * passent à côté, parce que `NaN` et `Infinity` n'ont pas de forme JSON et sortiraient en « null »
 * — précisément les deux valeurs qu'il faut pouvoir nommer.
 */
function decrire(valeur: unknown): string {
  if (typeof valeur === 'number') return String(valeur);
  return JSON.stringify(valeur) ?? String(valeur); // `undefined` n'a pas de forme JSON
}

/**
 * Le refus d'une portée, TOUJOURS sous le même préambule — les trois gardes de `verifierPortees`
 * passent par ici pour qu'un artéfact d'une autre version du pipeline se nomme de la même façon,
 * qu'il ait perdu `exemples`, `annotations` ou `lignes`.
 *
 * @param ou la position fautive, déjà rédigée (« bloc n°2, paire n°1, volet vulnérable »)
 */
function erreurPortee(ou: string, faute: string): Error {
  return new Error(
    `RenduBlocs : portée d'annotation invalide (${ou}) — ${faute}. Le contrat est ` +
      '`tools/content-pipeline/types.d.ts` ; la portée est produite par ' +
      '`lirePortee` (`compiler-markdown.mjs`) — régénérer avec `npm run content:build`.',
  );
}

/**
 * « Ligne 3 », « Lignes 1 et 2 », « Lignes 1, 2 et 5 » — l'énumération française, avec « et »
 * devant le dernier terme. Le pluriel suit le nombre d'ancres, sans quoi une portée multiple
 * s'annoncerait au singulier.
 */
function enumererLignes(lignes: readonly number[]): string {
  if (lignes.length === 1) return `Ligne ${String(lignes[0])}`;
  const debut = lignes.slice(0, -1).join(', ');
  return `Lignes ${debut} et ${String(lignes[lignes.length - 1])}`;
}

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
  imports: [Quiz],
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
                          <b class="portee">{{ etiquettePortee(note) }}</b>
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
                          <b class="portee">{{ etiquettePortee(note) }}</b>
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
                 sa propre validation, donc un type inconnu imbriqué lève aussi.
                 Le quiz DESCEND avec la récursion : une ancre écrite dans un
                 encadré doit rendre le même quiz que la même ancre au premier
                 niveau — le compilateur, lui, refuse qu'il y en ait deux. -->
            <app-rendu-blocs [blocs]="bloc.blocs" [quiz]="quiz()" />
          </aside>
        }

        @case ('ancre-quiz') {
          <!--
            E2-ST3 (lot C) : le quiz se rend ICI, à la position que l'auteur a
            choisie dans son corps de leçon. Le bloc lui-même ne porte AUCUNE
            donnée — c'est une ancre, pas un conteneur ; le quiz voyage dans
            LeconCompilee.quiz et traverse ce composant par un input requis.
          -->
          <app-quiz [quiz]="quiz()" />
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
   * Le quiz de la leçon, REQUIS — même quand la section rendue ne porte pas
   * l'ancre.
   *
   * POURQUOI REQUIS, ET NON OPTIONNEL. Le compilateur compte les ancres `[[quiz]]`
   * et exige qu'il y en ait exactement une, précisément pour qu'un quiz livré ne
   * puisse pas rester invisible. Un input optionnel rouvrirait ce trou par l'autre
   * bout : la page de leçon oublierait la liaison, le `@case` rendrait un composant
   * sans données ou rien du tout, aucun gate ne rougirait, et le quiz manquerait à
   * l'écran d'une leçon publiée. Requis, l'oubli ne compile pas.
   *
   * `LeconCompilee.quiz` étant obligatoire au contrat, l'exiger ici ne coûte rien
   * à l'appelant : il a toujours la valeur sous la main.
   */
  readonly quiz = input.required<QuizCompile>();

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

  /**
   * L'étiquette de portée d'une annotation : « Ensemble du bloc », « Ligne 3 », « Lignes 1 et 2 ».
   *
   * La portée est ÉCRITE, jamais seulement suggérée par une couleur ou une position — c'est ce qui
   * rend l'annotation utilisable au lecteur d'écran comme à l'impression (WCAG 1.4.1). `[0]` ne
   * s'affiche surtout pas « Ligne 0 » : 0 désigne le bloc entier, pas une ligne.
   */
  etiquettePortee(note: AnnotationLigne): string {
    const libelle = note.lignes[0] === 0 ? 'Ensemble du bloc' : enumererLignes(note.lignes);
    return `${libelle}${INSECABLE}:`;
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

    if (bloc.type === 'comparaison') {
      this.verifierPortees(bloc, rang);
      return bloc;
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

  /**
   * Refuse une portée d'annotation malformée, en NOMMANT le volet et la paire.
   *
   * Voir `fautePortee` ci-dessus pour ce que ce contrôle peut et ne peut pas constater : la FORME
   * oui, l'EXISTENCE de la ligne dans l'extrait non — le code brut n'est pas dans l'artéfact.
   */
  private verifierPortees(
    bloc: Extract<BlocContenu, { type: 'comparaison' }>,
    rang: number,
  ): void {
    // ⚠️ LES DEUX `Array.isArray` CI-DESSOUS NE SONT PAS DE LA DÉFENSE DE PRINCIPE. Le cas que ce
    // contrôle déclare couvrir est un `lecons/<slug>.json` compilé par une AUTRE version du
    // pipeline : à ce moment-là le TYPE ment, par construction. Sans ces gardes, un artéfact où
    // `exemples` ou `annotations` a changé de forme fait lever un `TypeError` anonyme depuis la
    // boucle — le garde-fou censé nommer la faute plante sans la nommer (patron S-009 / L-008).
    if (!Array.isArray(bloc.exemples)) {
      throw erreurPortee(`bloc n°${rang + 1}`, '« exemples » absent ou non-tableau');
    }
    for (const [rangPaire, exemple] of bloc.exemples.entries()) {
      const volets = [
        ['vulnérable', exemple.vulnerable],
        ['corrigé', exemple.corrige],
      ] as const;
      for (const [nomVolet, volet] of volets) {
        const ou = `bloc n°${rang + 1}, paire n°${rangPaire + 1}, volet ${nomVolet}`;
        // `volet?.` et pas `volet.` : un artéfact périmé peut avoir perdu le VOLET lui-même, et
        // `undefined.annotations` relèverait le `TypeError` anonyme que cette garde existe pour
        // supprimer — le défaut se serait juste déplacé d'un cran.
        if (!Array.isArray(volet?.annotations)) {
          throw erreurPortee(ou, '« annotations » absent ou non-tableau (ou volet absent)');
        }
        for (const note of volet.annotations) {
          const faute = fautePortee(note.lignes);
          if (faute !== null) throw erreurPortee(ou, faute);
        }
      }
    }
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
