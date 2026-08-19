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
// `src/styles/_coloration-syntaxique-generee.scss`, `src/styles/_code.scss`
// (numérotation des lignes, E2-ST4 lot B2), `src/styles/_mermaid-generee.scss`.
// Cette feuille-ci n'habille que les enveloppes écrites ci-dessous. Ce n'est pas un
// contournement à trouver : c'est la raison pour laquelle `_mermaid-generee.scss`
// accroche `svg.diagramme-mermaid` et ne dépend d'aucun balisage d'E2-ST2.
//
// ⚠️ RÉDACTION : blanches insécables U+00A0 UNIQUEMENT, écrites `&nbsp;` dans le
// gabarit pour qu'on les VOIE à la relecture, et `'\u00A0'` (constante `INSECABLE`)
// dans le TypeScript, où `no-irregular-whitespace` refuse la vraie — jamais U+202F ni
// U+2009, absentes de Fraunces comme d'Inter (`.claude/rules/contenu-pedagogique.md` §3).
//
// 🔴 COLLISION S-011 — CE FICHIER PORTE DÉSORMAIS DU TEXTE D'AUTEUR, DONC LE MODE
// D'ÉCHEC DE `quiz.ts`. Depuis le lot B d'E2-ST4, `annotations[].texte` est le seul
// canal de prose d'un volet de comparaison ; une leçon sur le XSS y écrira un
// gestionnaire d'événement entre guillemets, et le gate
// `tools/deploiement/generer-config-swa.mjs` refuse cette séquence dans le HTML
// prerendu (comme il refuse le style en ligne). La note complète, avec la liste des
// deux motifs et la parade ÉDITORIALE, est posée dans le gabarit, au point exact qui
// les produit — et mesurée à deux mains par `rendu-blocs.spec.ts`.
//
// E2-ST4 (lot A1) : `preparer()` refuse aussi une PORTÉE d'annotation malformée. Ce qu'il
// peut et ne peut pas constater est écrit sur `fautePortee` — la borne « la ligne existe »
// n'est PAS vérifiable ici, faute de code brut dans l'artéfact ; elle se tient au
// compilateur (`lirePortee`).
// =============================================================================

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

import { Quiz } from '../../quiz/quiz';
import { Simulation } from '../../simulation/simulation';

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

/**
 * Étiquette écrite d'un bloc de code — la MÊME chaîne pour le `<figcaption>` qu'on VOIT et pour
 * l'`aria-label` du défileur qu'on ENTEND (E2-ST4, lot B2). Deux littéraux séparés dans le gabarit
 * dériveraient au premier changement de libellé, et c'est l'oreille qui perdrait.
 */
const ETIQUETTES_CODE: Record<'code' | 'vulnerable' | 'corrige', string> = {
  code: 'Code',
  vulnerable: 'Exemple vulnérable',
  corrige: 'Correctif',
};

/** Le rang d'un bloc `code` ; `PAS_UN_EXEMPLE` distingue son espace de clefs de celui des paires. */
const PAS_UN_EXEMPLE = -1;

/**
 * La clef d'une figure de code dans la table des rangs. Écrite une fois, appelée des deux côtés
 * (construction et lecture) : deux gabarits de clef qui divergeraient rendraient la table muette.
 */
function clefDeRang(rangBloc: number, rangExemple: number): string {
  return `${String(rangBloc)}:${String(rangExemple)}`;
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

/**
 * Ce que le comptage des figures sait parcourir : le contrat, ET sa forme préparée. Les deux
 * appelants ne tiennent pas la même main — la page de leçon compte sur les blocs BRUTS d'une
 * section (elle n'a rien préparé), le composant compte sur `blocsPrepares()`. Une union plutôt
 * qu'une copie de la forme des trois types qui comptent : recopier `{ type: 'encadre'; blocs: … }`
 * ici donnerait une deuxième vérité, qui divergerait au premier champ ajouté (L-016).
 */
type BlocDenombrable = BlocContenu | BlocPrepare;

/**
 * Le décalage de départ des DEUX compteurs de figures — c'est-à-dire ce qui a déjà été numéroté
 * AVANT la liste de blocs qu'on s'apprête à rendre.
 *
 * Deux champs et non un : les blocs `code` d'un côté, les PAIRES de `comparaison` de l'autre. Cette
 * séparation est justifiée sur `tableDesRangs` ci-dessous, et elle survit à la numérotation
 * continue — ce qui devient continu, c'est chacun des deux compteurs, pas leur fusion.
 */
export interface DecalageFigures {
  readonly blocsDeCode: number;
  readonly paires: number;
}

/**
 * Le décalage neutre : rien n'a encore été numéroté. C'est la valeur par défaut de l'input
 * `decalage`, donc ce qui garde `RenduBlocs` montable SEUL (ses specs, et tout futur appelant qui
 * ne rendrait qu'un fragment).
 *
 * `Object.freeze` et pas seulement `readonly` : `readonly` n'existe qu'à la compilation, alors que
 * cet objet est PARTAGÉ par toutes les instances qui ne lient pas l'input. Une écriture accidentelle
 * (ou du JavaScript non typé, `Lecon` amorçant son cumul dessus) déplacerait la numérotation de
 * toute la page. Gelé, elle lève en `strict` au lieu de contaminer en silence.
 */
export const SANS_DECALAGE: DecalageFigures = Object.freeze({ blocsDeCode: 0, paires: 0 });

/**
 * LE parcours des figures de code — écrit UNE fois, appelé par TOUS ceux qui numérotent (L-037).
 *
 * ⚠️ RECENSEMENT DES APPELANTS, parce que « une définition, N appelants » n'est vrai que si les N
 * ont été comptés (L-037, née d'un quatrième appelant resté à compter les lignes à la main). Les
 * TROIS sites d'appel, et ce sont bien des appels — pas des consommateurs de leur résultat :
 *   1. `Lecon.decalagesDesSections` (`lecon.ts`) — le décalage de chaque SECTION, cumulé sur celles
 *      qui la précèdent ;
 *   2. l'AUTO-RÉCURSION du cas `encadre` ci-dessous — la descente dans les blocs d'un encadré ;
 *   3. `tableDesRangs` — les rangs affichés ET la table des décalages d'encadrés, via le visiteur.
 * ⚠️ Le cas `encadre` du GABARIT n'est PAS un quatrième appelant : il ne compte rien, il CONSOMME
 * `decalagesDesEncadres` (remplie en 3) via `decalageDeLEncadre`. L'écrire comme un appelant ferait
 * chercher un site de comptage là où il n'y en a pas, et manquer celui qui existe — soit très
 * exactement le mode d'échec que L-037 existe pour fermer.
 * Aucun quatrième au 2026-08-19 : `app-rendu-blocs` n'est monté qu'à deux endroits (`lecon.ts` et
 * le gabarit ci-dessous, mesuré par recherche sur le sélecteur), et `cumulerFigures` n'est appelée
 * qu'aux trois sites listés. Un quatrième site de comptage rouvrirait exactement le défaut que ce
 * lot ferme — les compteurs qui repartent de 1.
 *
 * LE COMPTAGE DESCEND DANS LES ENCADRÉS, et c'est le cas qu'on oublie : un bloc `code` niché dans
 * un encadré de la section 1 doit décaler la section 2, sinon la numérotation continue saute un
 * numéro puis se répète. La récursion interne ne rappelle PAS le visiteur : les blocs nichés sont
 * numérotés par le composant enfant, à qui l'on passe le décalage constaté ici.
 *
 * @param depart ce qui a déjà été numéroté avant cette liste
 * @param visiter appelé pour chaque bloc de PREMIER niveau, avec le cumul constaté AVANT lui
 * @returns le cumul APRÈS toute la liste
 */
export function cumulerFigures(
  blocs: readonly BlocDenombrable[],
  depart: DecalageFigures,
  visiter?: (bloc: BlocDenombrable, rangBloc: number, avant: DecalageFigures) => void,
): DecalageFigures {
  let cumul = depart;
  blocs.forEach((bloc, rangBloc) => {
    visiter?.(bloc, rangBloc, cumul);
    if (bloc.type === 'code') {
      cumul = { blocsDeCode: cumul.blocsDeCode + 1, paires: cumul.paires };
    } else if (bloc.type === 'comparaison') {
      // `Array.isArray` et pas `bloc.exemples.length` nu : la page de leçon compte sur des blocs
      // BRUTS, donc avant que `verifierPortees` n'ait pu NOMMER un artéfact d'une autre version du
      // pipeline. Sans cette garde, un `exemples` disparu ferait lever un `TypeError` anonyme ici,
      // c'est-à-dire AVANT le garde-fou qui existe pour le nommer (patron S-009 / L-008).
      const paires = Array.isArray(bloc.exemples) ? bloc.exemples.length : 0;
      cumul = { blocsDeCode: cumul.blocsDeCode, paires: cumul.paires + paires };
    } else if (bloc.type === 'encadre') {
      // MÊME GARDE, MÊME RAISON QUE `exemples` CI-DESSUS (revue du lot C1). Le raisonnement valait
      // mot pour mot pour `bloc.blocs`, et la garde manquait : `contenu-compile.ts` ne valide que
      // `section.blocs` et délègue explicitement le CONTENU des blocs à ce composant, donc un
      // encadré sans `blocs` faisait lever un `Cannot read properties of undefined (reading
      // 'forEach')` depuis `Lecon.decalagesDesSections` — sans nommer ni le fichier ni le bloc.
      // Ne pas descendre est le bon repli ICI : ce n'est pas à un compteur d'échouer, c'est à
      // `preparer()` de NOMMER l'encadré fautif, ce qu'il fait maintenant (patron S-009 / L-008).
      cumul = Array.isArray(bloc.blocs) ? cumulerFigures(bloc.blocs, cumul) : cumul;
    }
  });
  return cumul;
}

/** La table des rangs d'une instance, et les décalages à passer à ses encadrés enfants. */
interface TableDesRangs {
  readonly rangs: ReadonlyMap<string, number>;
  readonly decalagesDesEncadres: ReadonlyMap<number, DecalageFigures>;
}

@Component({
  selector: 'app-rendu-blocs',
  imports: [Quiz, Simulation],
  styleUrl: './rendu-blocs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // AUCUN `@default` dans le `@switch` ci-dessous, et c'est délibéré : le cas
  // inconnu est traité AVANT le rendu, par `preparer()`, qui lève en nommant le
  // type. Un `@default` ici ne pourrait qu'être muet ou redondant.
  template: `
    @for (bloc of blocsPrepares(); track $index; let rangBloc = $index) {
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
          <!--
            LE DÉFILEUR EST ÉCRIT ICI, PAS DANS LA FEUILLE GÉNÉRÉE — E2-ST4, lot B2.
            Jusqu'ici overflow-x: auto vivait sur .shiki, donc sur le HTML INJECTÉ :
            la région défilante n'avait ni nom ni existence dans le gabarit. On la
            remonte dans le document, avec tabindex="0" (WCAG 2.1.1 — une région qui
            défile doit s'atteindre au clavier) et un nom accessible (2.4.6).
            ⚠️ LE NOM PASSE PAR aria-label, JAMAIS PAR aria-labelledby + id : une
            leçon porte plusieurs blocs de code, et un identifiant qui se répète est
            L-026. role="group" et non region : region est un point de repère, et
            deux points de repère de même nom feraient rougir landmark-unique d'axe.
            ⚠️ ET CE DÉFILEUR EST LE SEUL ARRÊT DE TABULATION DU BLOC. Shiki posait
            lui-même tabindex="0" sur son pre : il y avait donc DEUX arrêts par bloc
            — celui-ci, nommé et défilant, puis celui du pre, qui n'a plus rien à
            faire défiler depuis que overflow-x a quitté .shiki. Mesuré dans
            l'artéfact prerendu : 16 arrêts pour 8 blocs, dont 8 morts et sans nom.
            Le compilateur le retire désormais (transformateur
            drjst-pre-sans-tabindex, tools/content-pipeline/compiler-markdown.mjs),
            et rendu-blocs.spec.ts tient l'invariant « aucun pre[tabindex] » — aucun
            gate axe ne le voit (focus-order-semantics est désactivée par défaut,
            scrollable-region-focusable l'est dans tools/a11y/verifier-axe.mjs).
          -->
          <figure class="bloc-code" [attr.data-langage]="bloc.langage">
            <figcaption class="etiquette">
              {{ etiquetteCode('code', bloc.langage, rangBloc) }}
            </figcaption>
            <div
              class="defileur"
              role="group"
              tabindex="0"
              [attr.aria-label]="etiquetteCode('code', bloc.langage, rangBloc)"
              [innerHTML]="bloc.htmlColore"
            ></div>
          </figure>
        }

        @case ('comparaison') {
          <!--
            AUCUN SÉLECTEUR, AUCUN REPLIAGE — décision ST4-1 du 2026-08-18, et ce
            n'est plus « provisoire en attendant les onglets ». Les exemples d'un
            bloc comparaison sont des paires de vulnérabilités DISTINCTES (la
            fixture témoin fait PHP/XSS puis C#/injection SQL) : des onglets « de
            langage » cacheraient un exemple pédagogique entier derrière une
            étiquette mensongère. Ni tablist ARIA, ni details name — et pas de
            repliage non plus : un details fermé ne s'imprime pas, Safari ne le
            trouve pas au Ctrl+F, et un accordéon exclusif peut finir avec zéro
            exemple à l'écran.
            E2-ST4 (lot B2) : les deux volets passent côte à côte SANS point de
            bascule (auto-fit, cf. rendu-blocs.scss), et l'ordre du DOM est
            l'ordre visuel — vulnérable puis correctif, aucun « order ». Ce qui
            rend « Ligne 2 : » localisable d'un regard est la numérotation des
            lignes, posée par la feuille GLOBALE src/styles/_code.scss : le HTML
            coloré est injecté, aucune feuille de composant ne l'atteint.
          -->
          <div class="comparaison">
            @for (exemple of bloc.exemples; track $index; let rangExemple = $index) {
              <div class="paire">
                <div class="volet volet-vulnerable">
                  <!-- Même défileur nommé que le cas « code » ci-dessus, et pour les mêmes
                       raisons. La légende porte l'étiquette écrite (troisième canal de
                       WCAG 1.4.1) ET nomme la figure. -->
                  <figure class="bloc-code">
                    <figcaption class="etiquette">
                      {{ etiquetteCode('vulnerable', exemple.langage, rangBloc, rangExemple) }}
                    </figcaption>
                    <div
                      class="defileur"
                      role="group"
                      tabindex="0"
                      [attr.aria-label]="
                        etiquetteCode('vulnerable', exemple.langage, rangBloc, rangExemple)
                      "
                      [innerHTML]="exemple.vulnerable.htmlColore"
                    ></div>
                  </figure>
                  <!--
                    🔴 COLLISION S-011 — ET C'EST ICI QU'ELLE MORD DÉSORMAIS.
                    Depuis le lot B, le texte d'une annotation est le SEUL canal de prose
                    d'un volet : tout ce que l'auteur explique de son extrait passe par
                    l'interpolation ci-dessous. Or le gate de déploiement
                    tools/deploiement/generer-config-swa.mjs balaie le HTML PRERENDU et
                    refuse DEUX séquences, toutes deux « espace + nom + égal + guillemet » :
                    le style en ligne (attribut « style ») et tout gestionnaire d'événement
                    en ligne (attribut commençant par « on »). L'interpolation d'Angular
                    n'échappe que « & », « < » et « > » — jamais les guillemets. Une
                    annotation de la leçon XSS qui écrit un gestionnaire entre guillemets
                    arrive donc INTACTE dans la sortie et fait ÉCHOUER le build, sur un
                    message parlant de CSP alors que la cause est un texte d'auteur.
                    C'est fail-closed, donc sain. LA PARADE EST ÉDITORIALE (guillemets
                    typographiques, entité) — jamais d'assouplir le gate ni d'exclure une
                    page du balayage : ce site enseigne la CSP.
                    Mesuré à deux mains dans rendu-blocs.spec.ts (la charge s'affiche
                    ENTIÈRE sans qu'un seul nœud naisse, ET la séquence survit dans le HTML
                    sérialisé). Même note, même liste, sur quiz.ts — l'autre site de texte
                    d'auteur. Détail : S-011 dans .claude/lessons/security-lessons.md.
                  -->
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
                  <figure class="bloc-code">
                    <figcaption class="etiquette">
                      {{ etiquetteCode('corrige', exemple.langage, rangBloc, rangExemple) }}
                    </figcaption>
                    <div
                      class="defileur"
                      role="group"
                      tabindex="0"
                      [attr.aria-label]="
                        etiquetteCode('corrige', exemple.langage, rangBloc, rangExemple)
                      "
                      [innerHTML]="exemple.corrige.htmlColore"
                    ></div>
                  </figure>
                  <!-- Collision S-011, à l'identique : voir la note du volet vulnérable
                       ci-dessus. Le champ « correction » d'un quiz porte déjà le même
                       risque, parce qu'il contient du CODE CORRIGÉ — donc des attributs
                       parfaitement légitimes, guillemets compris. -->
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
                 niveau — le compilateur, lui, refuse qu'il y en ait deux.
                 LA SIMULATION DESCEND POUR LA MÊME RAISON (E2-ST5, lot b2), et
                 le compte d'ancres qui l'accompagne DESCEND aussi : la règle de
                 cohérence de contenu-compile.ts compte récursivement, donc une
                 seconde ancre cachée dans un encadré fait échouer la lecture de
                 l'artéfact au lieu de dupliquer tous les id d'étape.
                 LE DÉCALAGE DESCEND AUSSI (E2-ST4, lot C1) : sans lui, les
                 compteurs de l'enfant repartiraient de 1 et un bloc de code
                 niché s'appellerait « Code n°1 » au milieu de la leçon. Il est
                 calculé par la table des rangs, à partir des blocs qui précèdent
                 CET encadré dans la liste courante, décalage d'entrée compris. -->
            <app-rendu-blocs
              [blocs]="bloc.blocs"
              [quiz]="quiz()"
              [simulation]="simulation()"
              [decalage]="decalageDeLEncadre(rangBloc)"
            />
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
          <!--
            E2-ST5 (lot b2) : idem, à la position que l'auteur a choisie. Une seule
            différence, et elle est de CONTRAT : la simulation est optionnelle au
            niveau de la leçon (une leçon qui ne décrit aucun flux n'en a pas), donc
            l'input peut valoir « undefined » — d'où l'appel de méthode ci-dessous
            plutôt qu'une liaison nue. simulationDeLAncre() LÈVE si l'ancre est là
            sans la donnée ; une condition muette rendrait ce cas invisible dans une
            leçon publiée, ce que le compte d'ancres du pipeline existe pour interdire.
          -->
          <app-simulation [simulation]="simulationDeLAncre()" />
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
   * La simulation de la leçon — E2-ST5, lot b2. LIAISON REQUISE, VALEUR OPTIONNELLE.
   *
   * Ce n'est pas une contradiction, c'est le contrat : `LeconCompilee.simulation` est `?`
   * (une leçon qui ne décrit aucun flux n'a pas de `simulation.json`), donc `undefined` est
   * une valeur LÉGITIME, à la différence de `quiz`. Mais l'input reste `required` pour que
   * l'OUBLI de la liaison ne compile pas : c'est le seul des deux défauts qu'un gate peut
   * attraper avant le prerender. Le second — l'ancre présente sans la donnée — se tient à
   * `simulationDeLAncre()`, qui lève.
   *
   * L'invariant qui rend les deux cas exhaustifs vit à la frontière
   * (`verifierEnveloppeSimulation`, `contenu-compile.ts`) : `simulation` présente ⇔
   * EXACTEMENT une ancre `[[simulation]]` dans le corps, absente ⇔ zéro. Ce composant n'a
   * donc pas à deviner ; il a seulement à ne jamais rendre en silence ce que l'invariant
   * déclare impossible.
   */
  readonly simulation = input.required<SimulationCompilee | undefined>();

  /**
   * Ce qui a déjà été numéroté AVANT cette liste de blocs — E2-ST4, lot C1.
   *
   * OPTIONNEL, ET NEUTRE PAR DÉFAUT, à la différence de `quiz`. La raison est le sens du défaut en
   * cas d'oubli : un quiz non lié serait un quiz INVISIBLE sur une leçon publiée, donc requis ;
   * un décalage non lié rend une numérotation qui repart de 1, ce qui est exactement le bon
   * comportement pour un composant monté SEUL (ses specs, un fragment rendu hors leçon). Le seul
   * appelant qui doit le poser est celui qui connaît le contexte, et il est unique — `Lecon` — plus
   * la récursion du cas `encadre`, qui le calcule elle-même.
   */
  readonly decalage = input<DecalageFigures>(SANS_DECALAGE);

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
   * Le rang AFFICHÉ de chaque figure de code, calculé une fois pour tout le tableau reçu.
   *
   * 🔴 POURQUOI UN RANG, ET PAS SEULEMENT LE LANGAGE (revue du lot B, E2-ST4). Le nom était
   * « Exemple vulnérable — php » : deux blocs du MÊME langage donnaient donc deux groupes
   * HOMONYMES, indiscernables à l'oreille comme dans une liste de régions. La leçon-témoin y
   * échappait par hasard — ses huit blocs sont de huit langages distincts —, et une leçon qui
   * compare deux failles PHP est le cas normal, pas le cas tordu.
   *
   * DEUX COMPTEURS, PAS UN : les blocs `code` d'un côté, les PAIRES de `comparaison` de l'autre.
   * Une paire porte deux figures (« Exemple vulnérable n°2 » et « Correctif n°2 ») que le genre
   * distingue déjà, et qui se lisent ensemble : leur donner deux rangs différents ferait mentir
   * l'appariement que la mise en page montre.
   *
   * ✅ LE RANG EST CONTINU SUR TOUTE LA PAGE DEPUIS E2-ST4 (lot C1), comme la numérotation des
   * figures d'un livre — décision du propriétaire du 2026-08-19. Le lot B laissait ici un constat
   * OUVERT : la page de leçon monte UN composant PAR SECTION (`lecon.ts`) et un encadré en remonte
   * un enfant par récursion, donc les compteurs repartaient de 1 à chaque instance. Mesure faite
   * alors sur la leçon-témoin prerendue : 8 défileurs, 8 noms distincts — mais QUATRE s'appelaient
   * « Code n°1 », et seul leur LANGAGE (bash, sql, typescript, json) les séparait ; deux blocs du
   * même langage dans deux sections différentes auraient donné deux homonymes STRICTS.
   *
   * CE QUI EST RÉELLEMENT APPLIQUÉ. Chaque instance reçoit un DÉCALAGE de départ (input `decalage`,
   * neutre par défaut pour rester montable seule) et le propage : `Lecon` calcule celui de chaque
   * section à partir des sections qui la précèdent, et le cas `encadre` du gabarit ci-dessus calcule
   * celui de chaque enfant à partir des blocs qui le précèdent DANS SA PROPRE LISTE, décalage
   * d'entrée compris. Le parcours qui produit ces trois nombres est écrit UNE fois — `cumulerFigures`
   * — et il DESCEND dans les encadrés, sans quoi un bloc de code niché ferait sauter un numéro.
   * L'alternative « le titre de la section dans le nom » a été écartée par le propriétaire.
   */
  private readonly tableDesRangs = computed<TableDesRangs>(() => {
    const rangs = new Map<string, number>();
    const decalagesDesEncadres = new Map<number, DecalageFigures>();
    cumulerFigures(this.blocsPrepares(), this.decalage(), (bloc, rangBloc, avant) => {
      if (bloc.type === 'code') {
        rangs.set(clefDeRang(rangBloc, PAS_UN_EXEMPLE), avant.blocsDeCode + 1);
      } else if (bloc.type === 'comparaison') {
        bloc.exemples.forEach((_, rangExemple) => {
          rangs.set(clefDeRang(rangBloc, rangExemple), avant.paires + rangExemple + 1);
        });
      } else if (bloc.type === 'encadre') {
        decalagesDesEncadres.set(rangBloc, avant);
      }
    });
    return { rangs, decalagesDesEncadres };
  });

  /**
   * Le décalage à passer à l'encadré de rang `rangBloc` — ce que la récursion du gabarit consomme.
   *
   * Il LÈVE plutôt que de retomber sur `SANS_DECALAGE` : un repli muet rouvrirait très exactement
   * le défaut que ce lot ferme, les compteurs d'un encadré repartant de 1 sans qu'aucun gate ne
   * rougisse (même raison que la levée d'`etiquetteCode`).
   */
  decalageDeLEncadre(rangBloc: number): DecalageFigures {
    const decalage = this.tableDesRangs().decalagesDesEncadres.get(rangBloc);
    if (decalage === undefined) {
      throw new Error(
        `RenduBlocs : aucun décalage pour l'encadré (bloc n°${String(rangBloc + 1)}). La table ` +
          'des rangs et le gabarit parcourent le même tableau — cet écart est un défaut de ce ' +
          'composant.',
      );
    }
    return decalage;
  }

  /**
   * La simulation à rendre à l'ancre `[[simulation]]` — ou une levée qui la NOMME.
   *
   * Le cas couvert est celui d'un `lecons/<slug>.json` compilé par une AUTRE version du
   * pipeline : la règle de cohérence bidirectionnelle de `verifierEnveloppeSimulation`
   * rend ce cas impossible sur un artéfact frais, exactement comme la table des rangs rend
   * `etiquetteCode` infaillible — et, exactement comme elle, on lève plutôt que de rendre
   * un trou. Le rendu ayant lieu au prerender, l'échec casse la construction au lieu de
   * publier une leçon dont la simulation a disparu sans un mot.
   */
  simulationDeLAncre(): SimulationCompilee {
    const simulation = this.simulation();
    if (simulation === undefined) {
      throw new Error(
        'RenduBlocs : ancre « [[simulation]] » sans simulation. `LeconCompilee.simulation` ' +
          'est optionnelle, mais `verifierEnveloppeSimulation` (`contenu-compile.ts`) exige ' +
          'l’équivalence « simulation présente ⇔ exactement une ancre » — un artéfact où les ' +
          'deux se contredisent vient d’une autre version du pipeline. Le contrat est ' +
          '`tools/content-pipeline/types.d.ts` ; régénérer avec `npm run content:build`.',
      );
    }
    return simulation;
  }

  /**
   * L'étiquette d'un bloc de code : « Exemple vulnérable n°2 — php ».
   *
   * Une seule méthode pour les deux emplois, et c'est le point : le `<figcaption>` VISIBLE et
   * l'`aria-label` du défileur en sortent ensemble, donc ils ne peuvent pas se contredire. Le rang
   * est donc VU autant qu'entendu — un numéro que seule l'oreille recevrait ferait diverger les
   * deux canaux, ce que WCAG 2.5.3 (étiquette dans le nom) refuse.
   */
  etiquetteCode(
    genre: 'code' | 'vulnerable' | 'corrige',
    langage: Langage,
    rangBloc: number,
    rangExemple = PAS_UN_EXEMPLE,
  ): string {
    const rang = this.tableDesRangs().rangs.get(clefDeRang(rangBloc, rangExemple));
    if (rang === undefined) {
      // Impossible par construction : la table est bâtie du MÊME tableau que le gabarit parcourt.
      // On lève quand même — un nom amputé de son rang serait le défaut d'origine, en silence.
      throw new Error(
        `RenduBlocs : aucun rang pour la figure de code (bloc n°${String(rangBloc + 1)}, ` +
          `exemple n°${String(rangExemple + 1)}). La table des rangs et le gabarit ` +
          'parcourent le même tableau — cet écart est un défaut de ce composant.',
      );
    }
    return `${ETIQUETTES_CODE[genre]} n°${String(rang)}${INSECABLE}— ${langage}`;
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

    // LE GARDE-FOU QUI NOMME (revue du lot C1). `cumulerFigures` se contente de ne pas descendre
    // dans un encadré sans `blocs` — c'est ici que le défaut se dit, avec le rang du bloc, comme
    // `verifierPortees` le fait pour une comparaison. Sans ces deux moitiés, un artéfact compilé
    // par une autre version du pipeline se manifesterait par un `TypeError` anonyme, ici ou dans
    // l'input `[blocs]` de l'enfant.
    if (bloc.type === 'encadre' && !Array.isArray(bloc.blocs)) {
      throw new Error(
        `RenduBlocs : encadré sans liste de blocs (bloc n°${rang + 1}, variante ` +
          `« ${bloc.variante} »). Le contrat est \`tools/content-pipeline/types.d.ts\` : ` +
          '`blocs` est requis, un tableau vide compris. Un encadré vide de contrat vient ' +
          "d'un artéfact compilé par une autre version du pipeline — reconstruire `content:build`.",
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
