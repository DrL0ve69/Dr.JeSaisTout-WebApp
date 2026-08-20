#!/usr/bin/env node
/**
 * RENDU DES DIAGRAMMES MERMAID — E2-ST1, lot 3
 * =============================================================================
 * Remplit le trou laissé par le lot 2 : `compiler-markdown.mjs` reconnaît le bloc
 * ` ```mermaid ` mais ÉCHOUE tant qu'aucun rendeur ne lui est injecté (option
 * `rendreMermaid`). Ce fichier fabrique ce rendeur. La couture n'est pas
 * redessinée : le compilateur attend une fonction SYNCHRONE
 * `(code) => { svg, titreAccessible, descriptionLongue }`, il la reçoit.
 *
 * ── POURQUOI DEUX TEMPS (`prechargerLecon` puis `rendre`) ────────────────────
 * Le nœud 4 de §E2 (`docs/agile/backlog-phase-1.md`) exige une invocation `mmdc`
 * PAR LEÇON, pas par diagramme : chaque invocation démarre un Chromium, ~6 s
 * fixes. Treize leçons × 2 diagrammes feraient 26 démarrages. Mais la couture du
 * compilateur est synchrone et voit les diagrammes UN PAR UN.
 *
 * D'où la séparation : `prechargerLecon()` lit la source Markdown de la leçon,
 * en extrait TOUS les diagrammes, et les rend en UNE invocation (mode Markdown de
 * `mmdc` : un fichier d'entrée, N fichiers `sortie-<n>.svg`). `rendre()` n'est
 * plus qu'une consultation de table — donc synchrone, donc compatible avec la
 * couture. Un diagramme non préchargé fait ÉCHOUER la compilation : c'est le
 * signe que l'orchestrateur a oublié d'appeler `prechargerLecon` pour ce fichier,
 * jamais un motif de rendre un `svg: ''` que personne ne remarquerait.
 *
 * ── CE QUE LE FICHIER GARANTIT ───────────────────────────────────────────────
 *
 *   1. UNE LISTE BLANCHE NOMINATIVE, APPLIQUÉE PAR UN ANALYSEUR RÉEL — pas cinq
 *      motifs surveillés à la regex. La v1 de ce fichier ne regardait que
 *      `<style>`, `style=`, `<script>`, `<foreignObject>` et `on…=` : une revue de
 *      sécurité a PROUVÉ que `<a xlink:href="javascript:…">` (Mermaid en émet dès
 *      qu'une leçon emploie `click`), `<use href="https://…">`,
 *      `<animate attributeName="href" values="javascript:…">` et
 *      `<set attributeName="onload">` traversaient intacts, code 0. C'est la faute
 *      S-003 dans sa forme la plus pure : un garde-fou qui ne prouve pas qu'il a
 *      TOUT vu. Le SVG est donc PARSÉ (jsdom, `image/svg+xml` — déjà une
 *      dépendance, patron démontré par `tools/a11y/verifier-axe.mjs`), et chaque
 *      élément et chaque attribut est confronté à une liste blanche NOMINATIVE :
 *      tout ce qui n'y figure pas fait ÉCHOUER en se nommant, avec la marche à
 *      suivre pour l'ajouter après revue.
 *      UN NOM ADMIS N'EST PAS UNE VALEUR ADMISE — deuxième trou, refermé par le
 *      lot D de la dette sécurité pré-E3-ST1. La v2 contraignait la valeur de
 *      `href`/`xlink:href` (`ATTRIBUTS_REFERENCE`) et d'eux seuls ; `fill`,
 *      `stroke`, `clip-path`, `marker-start` et `marker-end` acceptent pourtant un
 *      `<FuncIRI>`, si bien que `fill="url(https://exemple.invalide/x.svg#p)"`
 *      traversait en silence — une référence EXTERNE dans un SVG livré. Ces cinq
 *      attributs (`ATTRIBUTS_FUNCIRI`, relevés PAR MESURE, pas de mémoire) voient
 *      désormais leur valeur confrontée à DEUX formes admises, et à elles seules :
 *      `REFERENCE_LOCALE` (`url(#…)`) et `COULEUR_FONCTIONNELLE` (`rgb(…)`/
 *      `rgba(…)`, mesurées sur le `rect rgb(…)` de surlignage d'un
 *      `sequenceDiagram`).
 *      🔴 QUAND UNE FORME LÉGITIME MANQUE, LE CORRECTIF EST UNE FORME AJOUTÉE
 *      NOMINATIVEMENT ICI, mesurée sur une sortie réelle de `mmdc` et revue par le
 *      `security-reviewer` — JAMAIS un repli sur une chasse au motif `url(`, ni un
 *      assouplissement de l'ancrage. Sur un format structuré, une liste noire de
 *      motifs est un S-003 par construction (`.claude/rules/security.md` §4) : ce
 *      fichier a déjà payé ce défaut deux fois. La pression sera éditoriale — une
 *      leçon qui ne se publie pas — et c'est exactement le moment où la doctrine
 *      doit tenir (famille S-011).
 *      Deux exceptions, et deux seulement, sont
 *      RETIRÉES au lieu d'être refusées — `<style>` et l'attribut `style=`, parce
 *      que Mermaid en émet TOUJOURS. Motif : la CSP du site est à hachages.
 *      `generer-config-swa.mjs` refuse tout ` style="` de l'artéfact et hache tout
 *      `<style>` dans un `style-src` GLOBAL AU SITE — un diagramme ferait donc
 *      entrer sa palette dans la CSP de toutes les pages (S-005, objection B2 du
 *      plan). Le style des diagrammes vit à la place dans
 *      `src/styles/_mermaid-generee.scss`, ÉCRIT À LA MAIN et VERSIONNÉ, thémé par
 *      jetons sémantiques.
 *      Le CONTRÔLE DE CONSERVATION (patron S-003) reste : la sortie FINALE est
 *      RE-PARSÉE par le même analyseur (`verifierSvgNettoye`), qui doit rendre 0
 *      refus et 0 retrait restant. On ne recompte plus des motifs, on relit.
 *
 *   2. Les identifiants sont RENDUS UNIQUES PAR OCCURRENCE. Mermaid nomme sa
 *      racine `my-svg` et en dérive `chart-title-my-svg`, `my-svg-arrowhead`,
 *      `actor0`, `root-0`… Deux diagrammes dans une même page partageraient donc
 *      une vingtaine d'identifiants : `duplicate-id-aria` chez axe, et surtout des
 *      références `url(#…)` qui pointeraient vers le mauvais diagramme (une flèche
 *      empruntée à son voisin).
 *      PAR OCCURRENCE, et non par SOURCE — c'est un correctif, pas un détail. La
 *      v1 dérivait le préfixe du hachage du CODE, qui est aussi la clef du cache :
 *      deux diagrammes IDENTIQUES dans une même leçon recevaient donc le même SVG,
 *      donc les mêmes identifiants deux fois dans la même page. Le cache garde la
 *      clef du code (un `mmdc` de moins entre deux leçons), mais il stocke
 *      désormais le SOCLE NON PRÉFIXÉ ; le préfixe se calcule par occurrence
 *      (fichier + rang + code) au moment de garnir la table.
 *
 *   3. `titreAccessible` et `descriptionLongue` viennent des directives NATIVES
 *      `accTitle:` / `accDescr:` écrites par l'auteur de la leçon, et leur absence
 *      fait ÉCHOUER la compilation en nommant le fichier et le rang du diagramme.
 *      Fail-closed volontaire (WCAG 1.1.1, objection 12 du plan) : un diagramme
 *      est une image, seul son auteur peut en écrire l'équivalent textuel, et une
 *      description auto-générée serait un mensonge d'accessibilité.
 *
 *   4. Le Chromium employé est CELUI DE PLAYWRIGHT, déjà installé par
 *      `npm run e2e:install`. `.puppeteerrc.cjs` empêche Puppeteer d'en
 *      télécharger un second (~200 Mo). S'il manque, on échoue en DISANT quoi
 *      lancer — jamais de repli silencieux sur un téléchargement.
 *
 *   5. CACHE par hachage sha256 de la source du diagramme, sous `.cache/mermaid/`
 *      (gitignoré). Le hachage inclut `EMPREINTE_REGLES` — un sha256 des LISTES
 *      BLANCHES elles-mêmes, de `CONFIG_MERMAID` et de `CLASSE_RACINE`. Ce n'est
 *      pas une coquetterie : la v1 confiait cette invalidation à un entier
 *      `VERSION_RENDU` qu'un commentaire demandait d'incrémenter à la main, donc à
 *      une contrepartie qui n'existait que dans un commentaire (L-008). Un SVG mal
 *      nettoyé aurait survécu, en cache, à la correction censée le supprimer.
 *      Désormais l'oubli est impossible : toucher une règle change l'empreinte,
 *      donc toutes les clefs. Et tout SVG relu du cache repasse par
 *      `verifierSvgNettoye()` — un cache est une mémoire, donc un endroit où une
 *      faute se conserve, et il n'est PAS une source de confiance.
 *
 * ── SORTIE SVG : POURQUOI ELLE NE PEUT PAS ÊTRE LIÉE TELLE QUELLE ────────────
 * La sonde `src/sonde-sanitizer-svg.spec.ts` a mesuré le sanitizer d'Angular 22 :
 * des 24 éléments et 71 attributs d'un SVG `mmdc` réaliste, **0 et 0 survivent**
 * à un `[innerHTML]`. E2-ST2 devra donc passer par `bypassSecurityTrustHtml`,
 * scopé au seul bloc `mermaid` — voir la note en tête de `types.d.ts`.
 *
 * Usage. Le chemin de PRODUCTION est `npm run content:build` (`build.mjs`), qui
 * précharge, compile, puis appelle `controlerSvgCompiles()` sur l'AST — c'est là,
 * et NULLE PART AILLEURS, que vit le contrôle final. La ligne ci-dessous n'est
 * qu'un harnais de mise au point sur une racine isolée :
 *   node tools/content-pipeline/rendre-mermaid.mjs --racine <dossier>
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { compilerRacine } from './compiler-markdown.mjs';

const RACINE_DEPOT = process.cwd();

/** Cache des SVG rendus — gitignoré, jamais une source. */
const DOSSIER_CACHE = '.cache/mermaid';

/**
 * Classe posée sur le `<svg>` racine par le nettoyage. C'est le crochet UNIQUE de
 * `src/styles/_mermaid-generee.scss` : la feuille ne dépend d'aucun balisage
 * qu'E2-ST2 aurait à écrire autour du diagramme.
 */
const CLASSE_RACINE = 'diagramme-mermaid';

/**
 * Configuration Mermaid. `htmlLabels: false` est FORCÉ ici et nulle part
 * ailleurs : à `true`, Mermaid pose les étiquettes dans un `<foreignObject>`
 * contenant du HTML — que le nettoyage refuse (règle n°1), et que le sanitizer
 * d'Angular effacerait de toute façon.
 */
const CONFIG_MERMAID = {
  htmlLabels: false,
  securityLevel: 'strict',
  flowchart: { htmlLabels: false, useMaxWidth: true },
  class: { htmlLabels: false },
  sequence: { useMaxWidth: true },
};

// ---------------------------------------------------------------------------
// LES LISTES BLANCHES — nominatives, jamais un glob, jamais une liste noire
// ---------------------------------------------------------------------------
// CALIBRAGE MESURÉ, PAS DEVINÉ. Les noms « (mesuré) » ci-dessous ont été relevés
// en lançant `mmdc` (htmlLabels: false, securityLevel: 'strict') sur SIX familles
// de diagrammes — flowchart, sequenceDiagram, classDiagram, stateDiagram-v2,
// erDiagram, pie — et en inventoriant les éléments et attributs réellement émis.
// Les noms « (élargissement) » n'ont PAS été observés : ils sont ajoutés parce
// qu'ils sont inertes et qu'une famille de diagrammes non couverte les emploierait
// vraisemblablement. Aucun n'entre par motif : la règle est qu'un nom absent de
// ces listes FAIT ÉCHOUER en se nommant, et qu'on l'ajoute ICI, après revue.

/**
 * Éléments ADMIS. Tout autre élément fait échouer — y compris ceux d'ELEMENTS_REFUSES,
 * qui n'existe que pour donner un message parlant à ceux qu'on refuse EXPRÈS.
 */
const ELEMENTS_AUTORISES = new Set([
  // mesurés
  'circle',
  'defs',
  'desc',
  'feDropShadow',
  'filter',
  'g',
  'line',
  'marker',
  'path',
  'polygon',
  'rect',
  'svg',
  'symbol',
  'text',
  'title',
  'tspan',
  // élargissement nominatif
  'clipPath',
  'ellipse',
  'feGaussianBlur',
  'linearGradient',
  'mask',
  'pattern',
  'polyline',
  'stop',
  'textPath',
]);

/**
 * Éléments RETIRÉS, sous-arbre compris. Un seul, et c'est une concession assumée :
 * Mermaid émet TOUJOURS un `<style>`, et le refuser rendrait tout diagramme
 * impossible. Le style vit dans `src/styles/_mermaid-generee.scss`.
 */
const ELEMENTS_RETIRES = new Set(['style']);

/**
 * Éléments REFUSÉS NOMMÉMENT. Ils tomberaient déjà sous « absent de la liste
 * blanche » — l'énumération existe pour que le message dise POURQUOI, et pour
 * qu'un futur lecteur comprenne que leur absence est une décision, pas un oubli.
 *
 * @type {ReadonlyMap<string, string>}
 */
const ELEMENTS_REFUSES = new Map([
  [
    'a',
    'lien : Mermaid en émet dès qu’une leçon emploie `click`, et `xlink:href` y accepte `javascript:`',
  ],
  ['use', 'référence, potentiellement vers un document EXTERNE (`href="https://…"`)'],
  [
    'image',
    'chargement d’une ressource externe — la CSP du site ne l’autorise pas et le site ne le veut pas',
  ],
  [
    'animate',
    'peut RÉÉCRIRE un attribut après coup (`attributeName="href"`, `values="javascript:…"`)',
  ],
  ['animateTransform', 'même mécanisme d’écriture différée qu’`<animate>`'],
  ['animateMotion', 'même mécanisme d’écriture différée qu’`<animate>`'],
  ['set', 'peut POSER un attribut après coup, `onload` compris'],
  ['script', 'exécution de code — jamais dans un diagramme de leçon'],
  ['foreignObject', 'HTML arbitraire dans le SVG ; `htmlLabels: false` doit l’empêcher en amont'],
]);

/**
 * Attributs ADMIS, nominativement. Voir le calibrage ci-dessus.
 *
 * EXPORTÉ pour le seul tripwire de `src/analyseur-svg-references.spec.ts`, qui
 * assertionne le couplage avec `ATTRIBUTS_FUNCIRI` : admettre ici un nom porteur
 * de `<FuncIRI>` sans l'inscrire là-bas rouvrirait le trou n°2 en une ligne.
 */
export const ATTRIBUTS_AUTORISES = new Set([
  // mesurés
  'alignment-baseline',
  'class',
  'clip-rule',
  'cx',
  'cy',
  'd',
  'dominant-baseline',
  'dx',
  'dy',
  'fill',
  'fill-rule',
  'flood-color',
  'flood-opacity',
  'font-style',
  'font-weight',
  'height',
  'id',
  'marker-end',
  'marker-start',
  'markerHeight',
  'markerUnits',
  'markerWidth',
  'name',
  'orient',
  'points',
  'r',
  'refX',
  'refY',
  'role',
  'rx',
  'ry',
  'stdDeviation',
  'stroke',
  'stroke-dasharray',
  'stroke-width',
  'text-anchor',
  'transform',
  'viewBox',
  'width',
  'x',
  'x1',
  'x2',
  'xmlns',
  'xmlns:xlink',
  'y',
  'y1',
  'y2',
  // élargissement nominatif
  'clip-path',
  'font-family',
  'font-size',
  'gradientUnits',
  'letter-spacing',
  'offset',
  'opacity',
  'patternUnits',
  'pointer-events',
  'preserveAspectRatio',
  'spreadMethod',
  'stop-color',
  'stroke-linecap',
  'stroke-linejoin',
  'visibility',
  'xml:space',
]);

/**
 * Les DEUX seuls préfixes admis en bloc. `aria-*` porte l'accessibilité du
 * diagramme (`aria-labelledby`, `aria-describedby`, `aria-roledescription`) et
 * `data-*` les métadonnées de Mermaid (`data-id`, `data-edge`…) : les énumérer
 * reviendrait à figer une nomenclature interne de la bibliothèque. Ni l'un ni
 * l'autre n'est exécutable.
 */
const PREFIXES_ATTRIBUTS = ['aria-', 'data-'];

/** Attribut RETIRÉ — voir ELEMENTS_RETIRES, même motif. */
const ATTRIBUTS_RETIRES = new Set(['style']);

/**
 * Attributs de RÉFÉRENCE : admis UNIQUEMENT si leur valeur commence par `#`, donc
 * pointe à l'intérieur du même document. C'est le trou n°1 de la v1 :
 * `xlink:href="javascript:alert(1)"` traversait sans un mot.
 */
const ATTRIBUTS_REFERENCE = new Set(['href', 'xlink:href']);

/**
 * Attributs dont la VALEUR peut porter un `<FuncIRI>` — la forme `url(…)`, qui
 * référence une ressource. C'est le trou n°2, jumeau du n°1 : la liste blanche
 * contraignait le NOM de ces attributs et rien d'autre, si bien que
 * `fill="url(https://exemple.invalide/x.svg#p)"` traversait sans un mot. Ni
 * l'analyseur (l'attribut est admis, sa valeur n'était pas regardée) ni
 * `prefixerIdentifiants` (qui ne se plaint que d'un `url(#…)` LOCAL orphelin) ne
 * le signalait : une référence EXTERNE dans un SVG livré, en silence.
 *
 * MESURÉ, PAS DEVINÉ — même méthode que le reste du calibrage. Chaque nom
 * d'`ATTRIBUTS_AUTORISES` a été posé à `url(#cible)` sur un élément SVG dans le
 * Chromium de Playwright, puis sa valeur CALCULÉE relue : ces CINQ-LÀ sont les
 * seuls dont le moteur CSS a retenu la référence. `mask` et `filter` en portent
 * une aussi — mais ils ne sont PAS dans `ATTRIBUTS_AUTORISES`, donc déjà refusés
 * par leur nom, et ce lot RESSERRE la liste blanche : il n'y ajoute rien.
 *
 * ⚠️ CE COUPLAGE-LÀ N'EST PAS TENU PAR CE COMMENTAIRE. `mask`, `filter`, `marker`
 * et `marker-mid` ne sont refusés que par leur NOM : le jour où un lot en ajoute
 * un à `ATTRIBUTS_AUTORISES` pour une famille de diagrammes neuve — une ligne,
 * tout à fait plausible — leur valeur redeviendrait libre, et le défaut refermé
 * ici reviendrait en silence. L'invariant « tout attribut admis qui peut porter
 * un `<FuncIRI>` est dans CE `Set` » est donc assertionné par un runner, dans
 * `src/analyseur-svg-references.spec.ts` : c'est pour cela que les deux ensembles
 * sont EXPORTÉS.
 */
export const ATTRIBUTS_FUNCIRI = new Set([
  'clip-path',
  'fill',
  'marker-end',
  'marker-start',
  'stroke',
]);

/**
 * La forme de RÉFÉRENCE admise pour un attribut d'`ATTRIBUTS_FUNCIRI` dès que sa
 * valeur porte une parenthèse — donc une fonction CSS, quelle qu'elle soit. Avec
 * `COULEUR_FONCTIONNELLE` juste en dessous, elles sont les DEUX seules formes
 * admises, et toute autre fait échouer en se nommant.
 * C'est une liste BLANCHE DE FORME, pas une chasse au motif `url(` : `URL(`,
 * `url (`, `url("…")` et `image-set(…)` échouent tous parce qu'ils ne sont pas
 * CETTE forme, sans qu'on ait eu à les imaginer un par un (S-003, S-009).
 *
 * Pourquoi ni les guillemets ni la casse mixte, alors que le CSS les accepte :
 * c'est EXACTEMENT la forme que `prefixerIdentifiants` sait réécrire
 * (`/url\(#([^)]+)\)/g`, sans le drapeau `i`). Admettre `url("#a")` ou `URL(#a)`
 * laisserait la référence NON préfixée — et tous les identifiants du diagramme,
 * eux, SONT préfixés : la référence PEND donc, elle ne désigne plus rien. Elle ne
 * pointerait chez un voisin que si un élément NON-diagramme de la page portait
 * l'identifiant brut. Dans les deux cas c'est un défaut silencieux, que le
 * contrôle d'orphelins ne verrait pas davantage — il ne relit que la forme
 * canonique.
 */
const REFERENCE_LOCALE = /^url\(#[^\s"'()\\]+\)$/;

/**
 * La SECONDE forme admise : une couleur fonctionnelle `rgb(…)` / `rgba(…)`.
 *
 * MESURÉE, PAS SUPPOSÉE — et c'est une correction de faux positif, pas un
 * élargissement de confort. Le corpus de la fixture (deux diagrammes) ne portait
 * que `#eaeaea`, `#000000`, `#666`, `#999`, `black`, `none` et `url(#…)`. Mais
 * `mmdc` émet `fill="rgb(191, 223, 255)"` dès qu'un `sequenceDiagram` emploie
 * `rect rgb(…)`, la syntaxe DOCUMENTÉE de surlignage d'un échange (Mermaid la
 * pose en attribut : `rectElem.attr("fill", rectData.fill)`). Les deux formes
 * ont été rendues et relues sur ce dépôt : `rect rgb(191, 223, 255)` donne
 * `fill="rgb(191, 223, 255)"`, `rect rgba(0, 0, 255, .1)` donne
 * `fill="rgba(0, 0, 255, .1)"`. RIEN D'AUTRE n'a été ajouté : ni `hsl()`, ni
 * `var()`, ni `color-mix()` — aucune n'a été observée, et ce fichier n'ouvre pas
 * « au cas où ».
 *
 * Sans elle, la première leçon qui surligne un aller-retour ferait ÉCHOUER le
 * build sur un message parlant de `url(#…)` — sur le site qui enseigne la CSP,
 * avec la pression éditoriale que ça implique (famille S-011).
 *
 * 🔴 LA DOCTRINE, à relire avant de toucher à ces deux formes : quand une forme
 * LÉGITIME manque, le correctif attendu est UNE FORME AJOUTÉE NOMINATIVEMENT,
 * ici, après revue `security-reviewer` — mesurée sur une sortie réelle de `mmdc`.
 * Ce n'est JAMAIS un repli sur une chasse au motif `url(` : une liste noire sur
 * un format structuré est un S-003 par construction (`.claude/rules/security.md`
 * §4). Le corollaire tient l'ancrage : le nom de la fonction est exact, et son
 * contenu n'admet que des chiffres, virgules, espaces, `%` et décimales — ni
 * lettre, ni `//`, ni `:`, donc aucune URL ne peut s'y loger.
 */
const COULEUR_FONCTIONNELLE = /^rgba?\([\d.,% ]+\)$/;

/**
 * Ordre total stable sur les unités de code UTF-16 — indépendant de la locale et de
 * la plateforme. Même fonction, même raison que dans `tools/a11y/verifier-axe.mjs`
 * et `tools/deploiement/generer-config-swa.mjs` (L-009) : `localeCompare` classerait
 * les mêmes noms différemment selon la locale du poste, et ces listes triées
 * alimentent un HACHAGE qui sert de clef de cache — une divergence d'ordre entre ce
 * poste Windows et le runner Linux invaliderait le cache d'un côté seulement.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} négatif, nul ou positif, au contrat de `Array.prototype.sort`
 */
function comparerOctets(a, b) {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

/**
 * L'EMPREINTE DES RÈGLES — la contrepartie exécutable de l'invalidation du cache.
 *
 * Un entier `VERSION_RENDU` qu'un commentaire demandait d'incrémenter à la main
 * n'engage personne : c'est une intention que rien n'exécute (L-008). Ici, la clef
 * du cache DÉRIVE des règles ; élargir une liste blanche, resserrer
 * `CONFIG_MERMAID` ou renommer `CLASSE_RACINE` change l'empreinte, donc toutes les
 * clefs, donc rejette tout le cache. L'oubli devient impossible.
 */
const EMPREINTE_REGLES = createHash('sha256')
  .update(
    JSON.stringify({
      elementsAutorises: [...ELEMENTS_AUTORISES].sort(comparerOctets),
      elementsRetires: [...ELEMENTS_RETIRES].sort(comparerOctets),
      elementsRefuses: [...ELEMENTS_REFUSES.keys()].sort(comparerOctets),
      attributsAutorises: [...ATTRIBUTS_AUTORISES].sort(comparerOctets),
      attributsRetires: [...ATTRIBUTS_RETIRES].sort(comparerOctets),
      attributsReference: [...ATTRIBUTS_REFERENCE].sort(comparerOctets),
      attributsFuncIri: [...ATTRIBUTS_FUNCIRI].sort(comparerOctets),
      referenceLocale: REFERENCE_LOCALE.source,
      couleurFonctionnelle: COULEUR_FONCTIONNELLE.source,
      prefixesAttributs: PREFIXES_ATTRIBUTS,
      configMermaid: CONFIG_MERMAID,
      classeRacine: CLASSE_RACINE,
    }),
  )
  .digest('hex')
  .slice(0, 16);

/** Marche à suivre, imprimée sous CHAQUE refus de l'analyseur. */
const CONSEILS_ANALYSEUR = [
  'les listes blanches vivent en tête de `tools/content-pipeline/rendre-mermaid.mjs`',
  '(ELEMENTS_AUTORISES, ATTRIBUTS_AUTORISES, ATTRIBUTS_FUNCIRI / REFERENCE_LOCALE et',
  'COULEUR_FONCTIONNELLE pour les VALEURS) : un nom ou une FORME légitime s’y ajoute',
  'NOMINATIVEMENT, après mesure sur une sortie réelle de `mmdc` et',
  'après revue `security-reviewer` — jamais par glob, jamais en effaçant le refus',
  'ce SVG sera livré sous `bypassSecurityTrustHtml` (E2-ST2) : le sanitizer d’Angular ne',
  'repassera PAS derrière cet analyseur, il est le seul filtre (voir la note de `types.d.ts`)',
];

// ---------------------------------------------------------------------------
// Sorties
// ---------------------------------------------------------------------------

/**
 * @param {string} message
 * @param {readonly string[]} [details]
 * @returns {never}
 */
function echec(message, details = []) {
  console.error(`\n✖ rendre-mermaid : ${message}`);
  for (const d of details) console.error(`   · ${d}`);
  console.error('');
  process.exit(1);
}

/**
 * @param {string} chemin chemin absolu
 * @returns {string} le même chemin, relatif au dépôt et en séparateurs POSIX
 */
function afficher(chemin) {
  return relative(RACINE_DEPOT, chemin).replaceAll('\\', '/');
}

// ---------------------------------------------------------------------------
// Chromium — celui de Playwright, ou rien
// ---------------------------------------------------------------------------

/**
 * @returns {string} chemin absolu du binaire Chromium installé par Playwright
 */
function localiserChromium() {
  /** @type {string} */
  let chemin;
  try {
    chemin = chromium.executablePath();
    // S7718 attend un paramètre nommé `error_` — nomenclature anglophone incompatible avec la
    // règle de langue du dépôt (CLAUDE.md : identifiants en français). `.sonarcloud.properties`
    // n'accepte pas `sonar.issue.ignore.multicriteria` (son en-tête énumère ce qu'il accepte) :
    // le seul levier est un `NOSONAR`, et il est PAR LIGNE.
  } catch (erreur) { // NOSONAR
    return echec('Playwright ne sait pas où est son Chromium', [
      String(erreur instanceof Error ? erreur.message : erreur),
      'lancer : npm run e2e:install',
    ]);
  }
  if (!existsSync(chemin)) {
    echec(`Chromium de Playwright introuvable — « ${chemin} »`, [
      'lancer : npm run e2e:install',
      "aucun repli n'est tenté : `.puppeteerrc.cjs` interdit à Puppeteer de télécharger",
      'son propre Chromium (~200 Mo pour un binaire en double) — nœud 4 de §E2',
    ]);
  }
  return chemin;
}

/**
 * @returns {string} chemin absolu du script `mmdc`
 */
function localiserMmdc() {
  const exiger = createRequire(import.meta.url);
  /** @type {string} */
  let cli;
  try {
    // Le paquet n'EXPORTE que son point d'entrée d'API (`./src/index.js`) :
    // `resolve('…/src/cli.js')` échoue en ERR_PACKAGE_PATH_NOT_EXPORTED. On part
    // donc du point d'entrée résolu et on prend son voisin de dossier.
    cli = resolve(dirname(exiger.resolve('@mermaid-js/mermaid-cli')), 'cli.js');
  } catch {
    return echec('`@mermaid-js/mermaid-cli` est introuvable', [
      'lancer : npm ci (ou npm i -D @mermaid-js/mermaid-cli)',
    ]);
  }
  if (!existsSync(cli)) {
    return echec(`le script mmdc est introuvable — « ${cli} »`, [
      'la disposition interne du paquet a changé : réinstaller, puis corriger ce chemin',
    ]);
  }
  return cli;
}

// ---------------------------------------------------------------------------
// Extraction des diagrammes et de leurs directives d'accessibilité
// ---------------------------------------------------------------------------

/**
 * Normalise la source d'un diagramme. C'est la clef du cache ET la clef de la
 * table de consultation, donc les deux chemins d'accès — extraction depuis la
 * source Markdown ici, jeton `fence` de markdown-it là-bas — DOIVENT produire la
 * même chaîne. Sans cette normalisation, une fin de ligne CRLF (le poste est sous
 * Windows, L-015) suffirait à faire manquer la table.
 *
 * @param {string} code
 * @returns {string}
 */
function normaliser(code) {
  return `${code.replaceAll('\r\n', '\n').trim()}\n`;
}

/**
 * Clef du CACHE — dérivée de la source du diagramme ET de l'empreinte des règles.
 * Elle ne dépend NI du fichier NI du rang : c'est ce qui fait qu'un diagramme
 * répété entre deux leçons ne coûte qu'un seul `mmdc`.
 *
 * @param {string} code source normalisée du diagramme
 * @returns {string} hachage sha256 tronqué, préfixé d'une lettre pour rester un
 *   identifiant XML valide
 */
function clefCache(code) {
  const somme = createHash('sha256').update(`${EMPREINTE_REGLES}\n${code}`).digest('hex');
  return `d${somme.slice(0, 16)}`;
}

/**
 * Préfixe des identifiants d'UNE OCCURRENCE. Distinct de `clefCache()` à dessein,
 * et c'est le correctif du bug le plus retors de ce fichier : deux diagrammes
 * IDENTIQUES dans une même leçon partagent la clef de cache, donc partageraient le
 * préfixe — donc les mêmes `id` deux fois dans la même page (`duplicate-id-aria`
 * chez axe, et un `url(#…)` qui pointe chez le voisin). Le fichier et le rang
 * entrent donc dans le calcul.
 *
 * @param {string} nomFichier chemin d'affichage de la leçon
 * @param {number} rang 1-based, dans l'ordre du document
 * @param {string} code source normalisée du diagramme
 * @returns {string}
 */
function prefixeOccurrence(nomFichier, rang, code) {
  const somme = createHash('sha256')
    .update(`${EMPREINTE_REGLES}\n${nomFichier}\n${rang}\n${code}`)
    .digest('hex');
  return `d${somme.slice(0, 16)}`;
}

/**
 * Repère les clôtures ` ```mermaid ` d'une source Markdown, dans l'ordre.
 *
 * @param {string} source
 * @returns {string[]} sources normalisées, une par diagramme
 */
export function extraireDiagrammes(source) {
  const motif = /^```mermaid[^\n]*\n([\s\S]*?)^```/gm;
  return [...source.replaceAll('\r\n', '\n').matchAll(motif)].map((m) => normaliser(m[1] ?? ''));
}

/**
 * Lit les directives d'accessibilité NATIVES de Mermaid. `accDescr` a deux
 * formes : une ligne (`accDescr: …`) ou un bloc (`accDescr { … }`) ; les deux sont
 * acceptées, parce que les descriptions utiles dépassent souvent la ligne.
 *
 * @param {string} code
 * @param {string} nomFichier
 * @param {number} rang 1-based, pour un message qui désigne LE diagramme fautif
 * @returns {{ titreAccessible: string, descriptionLongue: string }}
 */
function lireDirectivesAcces(code, nomFichier, rang) {
  // Les espaces qui suivent le « : » sont capturées puis retirées par `.trim()`, plutôt que
  // consommées par un `[ \t]*` devant la capture : deux quantificateurs adjacents dont les classes
  // se chevauchent (`[ \t]` ⊂ `.`) donnent à l'analyseur un retour arrière super-linéaire (S8786).
  // Le `.trim()` était déjà là — la forme est donc plus simple ET équivalente.
  const titre = /^[ \t]*accTitle[ \t]*:(.*)$/m.exec(code)?.[1]?.trim() ?? '';
  const descLigne = /^[ \t]*accDescr[ \t]*:(.*)$/m.exec(code)?.[1]?.trim() ?? '';
  const descBloc = /^[ \t]*accDescr[ \t]*\{([\s\S]*?)\}/m.exec(code)?.[1] ?? '';
  const description = (descLigne || descBloc).replace(/\s+/g, ' ').trim();

  if (titre === '') {
    echec(`${nomFichier} : diagramme n°${rang} sans directive « accTitle: »`, [
      'un diagramme est une image : son nom accessible ne peut pas être deviné (WCAG 1.1.1)',
      'forme attendue, sur une ligne du diagramme : accTitle: Trajet d’une requête bloquée',
    ]);
  }
  if (description === '') {
    echec(`${nomFichier} : diagramme n°${rang} sans directive « accDescr »`, [
      "l'équivalent textuel complet est écrit par l'auteur de la leçon, jamais généré",
      'formes acceptées : « accDescr: … » sur une ligne, ou « accDescr { … } » sur plusieurs',
    ]);
  }
  return { titreAccessible: titre, descriptionLongue: description };
}

// ---------------------------------------------------------------------------
// L'ANALYSEUR — un vrai parseur, pas des motifs
// ---------------------------------------------------------------------------

/**
 * @typedef {{ name: string, value: string }} AttributXml
 * @typedef {{ tagName: string, attributes: Iterable<AttributXml>, parentNode: ElementXml | null, removeAttribute(nom: string): void, remove(): void }} ElementXml
 * @typedef {{ documentElement: ElementXml, querySelectorAll(selecteur: string): Iterable<ElementXml> }} DocumentXml
 * @typedef {{ document: DocumentXml, XMLSerializer: new () => { serializeToString(noeud: ElementXml): string } }} FenetreXml
 */

const requerir = createRequire(import.meta.url);

/**
 * jsdom ne publie pas de types, et `@types/jsdom` serait une dépendance de plus
 * pour cinq membres. La frontière est donc déclarée ICI, explicitement — c'est
 * exactement la surface DOM que ce script s'autorise. `tsconfig.tools.json` n'a
 * pas `lib: DOM` (volontairement : un script Node ne doit pas pouvoir toucher
 * `document`), et cette annotation respecte cette frontière sans l'affaiblir.
 * Même patron que `tools/a11y/verifier-axe.mjs`.
 *
 * @type {new (source: string, options: Record<string, unknown>) => { window: FenetreXml }}
 */
const JSDOM = requerir('jsdom').JSDOM;

/**
 * @param {string} valeur
 * @returns {string} la valeur, tronquée — un message d'erreur ne doit pas déverser
 *   un `d="M0 0 …"` de trois kilo-octets
 */
function abreger(valeur) {
  const propre = valeur.replaceAll(/\s+/g, ' ').trim();
  return propre.length <= 60 ? propre : `${propre.slice(0, 57)}…`;
}

/**
 * @typedef {object} RapportAnalyse
 * @property {string} svg le document re-sérialisé, débarrassé de ce qui est RETIRÉ
 * @property {Record<string, number>} retires comptes de ce qui a été effectivement retiré
 * @property {string[]} refus un libellé par constat, déjà rédigé pour l'humain
 */

/**
 * Le sort réservé à un élément ou à un attribut, une fois confronté aux listes blanches.
 *
 * `retirer` porte la clef de comptage (c'est elle qui alimente le contrôle de conservation de
 * `verifierSvgNettoye`), `refuser` porte le libellé déjà rédigé pour l'humain, `garder` ne porte
 * rien. Trois cas nommés valent mieux qu'un booléen plus un canal de message à côté : c'est la
 * forme qui empêche un retrait SILENCIEUX de se glisser à la place d'un refus.
 *
 * @typedef {{ genre: 'retirer', clef: string }
 *   | { genre: 'refuser', libelle: string }
 *   | { genre: 'garder' }} Verdict
 */

/**
 * Ouvre le SVG en XML strict et vérifie que sa racine est bien un `<svg>`.
 *
 * L'analyseur refuse de laisser passer ce qu'il n'a pas su lire ENTIÈREMENT : un garde-fou qui ne
 * prouve pas avoir tout vu ne garde rien (S-003).
 *
 * @param {string} source
 * @param {string} origine ce qu'on nomme dans le message — fichier, rang, ou chemin de cache
 * @returns {{ window: FenetreXml }} le document analysé, racine `<svg>` confirmée
 */
function ouvrirDocumentSvg(source, origine) {
  /** @type {{ window: FenetreXml }} */
  let dom;
  try {
    dom = new JSDOM(source, { contentType: 'image/svg+xml' });
    // `NOSONAR` : S7718 réclame `error_`, contre la règle « français seulement » — voir
    // `localiserChromium` pour le raisonnement complet.
  } catch (erreur) { // NOSONAR
    return echec(`${origine} : le SVG n'est pas du XML bien formé`, [
      String(erreur instanceof Error ? erreur.message : erreur),
      "l'analyseur refuse de laisser passer ce qu'il n'a pas su lire ENTIÈREMENT — un",
      'garde-fou qui ne prouve pas avoir tout vu ne garde rien (S-003)',
    ]);
  }

  const racine = dom.window.document.documentElement;
  if (racine.tagName !== 'svg') {
    return echec(`${origine} : la racine du document est « ${racine.tagName} », pas « svg »`);
  }
  return dom;
}

/**
 * Un élément dont un ancêtre vient d'être supprimé n'est plus dans le document :
 * l'inspecter produirait des refus sur du contenu déjà parti.
 *
 * @param {ElementXml} element
 * @param {ReadonlySet<ElementXml>} supprimes éléments déjà retirés au cours de cette analyse
 * @returns {boolean}
 */
function estDetache(element, supprimes) {
  for (let parent = element.parentNode; parent !== null; parent = parent.parentNode) {
    if (supprimes.has(parent)) return true;
  }
  return false;
}

/**
 * Confronte UN élément aux listes blanches et rend son verdict.
 *
 * @param {string} nom nom de la balise, tel que l'analyseur XML l'a lu
 * @returns {Verdict}
 */
function jugerElement(nom) {
  if (ELEMENTS_RETIRES.has(nom)) return { genre: 'retirer', clef: `<${nom}>` };

  const raison = ELEMENTS_REFUSES.get(nom);
  if (raison !== undefined) {
    return { genre: 'refuser', libelle: `élément « <${nom}> » — ${raison}` };
  }
  if (!ELEMENTS_AUTORISES.has(nom)) {
    return { genre: 'refuser', libelle: `élément « <${nom}> » — absent de ELEMENTS_AUTORISES` };
  }
  return { genre: 'garder' };
}

/**
 * Confronte UN attribut aux listes blanches et rend son verdict.
 *
 * @param {string} nom nom de la balise porteuse, pour que le message désigne l'attribut EN
 *   SITUATION — « absent de la liste » sans dire de quel élément renvoie à une fouille
 * @param {string} cle nom de l'attribut
 * @param {string} valeur valeur de l'attribut
 * @returns {Verdict}
 */
function jugerAttribut(nom, cle, valeur) {
  if (ATTRIBUTS_RETIRES.has(cle)) return { genre: 'retirer', clef: `${cle}=` };
  if (/^on/i.test(cle)) {
    return {
      genre: 'refuser',
      libelle: `<${nom} ${cle}="${abreger(valeur)}"> — gestionnaire d'événement`,
    };
  }
  if (ATTRIBUTS_REFERENCE.has(cle)) {
    if (valeur.startsWith('#')) return { genre: 'garder' };
    return {
      genre: 'refuser',
      libelle:
        `<${nom} ${cle}="${abreger(valeur)}"> — seule une référence INTERNE ` +
        '(« #… ») est admise ; une URL externe ou un « javascript: » est refusée',
    };
  }
  if (PREFIXES_ATTRIBUTS.some((prefixe) => cle.startsWith(prefixe))) return { genre: 'garder' };
  if (!ATTRIBUTS_AUTORISES.has(cle)) {
    return {
      genre: 'refuser',
      libelle: `<${nom} ${cle}="${abreger(valeur)}"> — absent de ATTRIBUTS_AUTORISES`,
    };
  }
  if (ATTRIBUTS_FUNCIRI.has(cle)) return jugerFuncIri(nom, cle, valeur);
  return { genre: 'garder' };
}

/**
 * Confronte la VALEUR d'un attribut porteur de `<FuncIRI>` à la liste blanche de
 * forme. Le nom de l'attribut a déjà été admis par `jugerAttribut` ; ce qui se
 * juge ici est ce vers quoi il POINTE.
 *
 * Le déclencheur est la présence d'une PARENTHÈSE, pas celle du mot « url » :
 * une valeur sans parenthèse ne peut pas être une fonction CSS, donc ne peut
 * référencer quoi que ce soit (`none`, `#666`, `black`). Dès qu'il y en a une,
 * la valeur ENTIÈRE doit être la forme admise — c'est ce qui rend inutile
 * d'énumérer les contournements (`URL(`, guillemets, `//hôte`, espaces).
 *
 * @param {string} nom nom de la balise porteuse, pour désigner l'attribut EN SITUATION
 * @param {string} cle nom de l'attribut
 * @param {string} valeur valeur de l'attribut
 * @returns {Verdict}
 */
function jugerFuncIri(nom, cle, valeur) {
  if (!/[()]/.test(valeur)) return { genre: 'garder' };
  if (REFERENCE_LOCALE.test(valeur)) return { genre: 'garder' };
  if (COULEUR_FONCTIONNELLE.test(valeur)) return { genre: 'garder' };
  return {
    genre: 'refuser',
    libelle:
      `<${nom} ${cle}="${abreger(valeur)}"> — deux formes seulement sont admises : ` +
      '« url(#identifiant) », référence INTERNE au même diagramme, « url » en ' +
      'minuscules, sans guillemets ni espace ; et une couleur « rgb(…) »/« rgba(…) » ' +
      'à contenu purement numérique. Une URL externe, un protocole relatif « // », un ' +
      '« javascript: » ou toute autre fonction CSS sont refusés',
  };
}

/**
 * Applique la liste blanche à TOUS les attributs d'un élément déjà autorisé.
 *
 * La copie est ICI load-bearing, contrairement à celle du parcours d'éléments de `analyserSvg` :
 * `attributes` est une `NamedNodeMap` VIVANTE, et le corps de boucle appelle `removeAttribute`.
 * Mesuré sur jsdom : sur quatre attributs a,b,c,d dont chacun est retiré au passage, l'itération
 * directe n'en voit que DEUX (a puis c) — la moitié des attributs échapperait donc à la liste
 * blanche, en silence. Ne pas « simplifier ».
 *
 * @param {ElementXml} element muté sur place : les attributs `retirer` en sont ôtés
 * @param {string} nom nom de la balise, pour les messages
 * @param {(clef: string) => void} compterRetrait comptabilise un retrait effectif
 * @param {string[]} refus collecteur de constats, muté sur place
 * @returns {void}
 */
function appliquerListeBlancheAuxAttributs(element, nom, compterRetrait, refus) {
  for (const attribut of [...element.attributes]) { // NOSONAR
    const verdict = jugerAttribut(nom, attribut.name, attribut.value);
    if (verdict.genre === 'retirer') {
      compterRetrait(verdict.clef);
      element.removeAttribute(attribut.name);
      continue;
    }
    if (verdict.genre === 'refuser') refus.push(verdict.libelle);
  }
}

/**
 * Parse un SVG et confronte CHAQUE élément et CHAQUE attribut aux listes blanches.
 *
 * Le contrat est délibérément SANS EFFET DE BORD sur le processus : la fonction ne
 * sort pas, elle RAPPORTE. Ce sont ses deux appelants qui décident — `nettoyerSvg`
 * refuse au premier constat, `verifierSvgNettoye` exige en plus qu'il n'y ait plus
 * rien à retirer. Un seul chemin de lecture, deux exigences.
 *
 * @param {string} source
 * @param {string} origine ce qu'on nomme dans le message — fichier, rang, ou chemin de cache
 * @returns {RapportAnalyse}
 */
function analyserSvg(source, origine) {
  const dom = ouvrirDocumentSvg(source, origine);
  const document = dom.window.document;
  const racine = document.documentElement;

  /** @type {Record<string, number>} */
  const retires = {};
  /** @type {string[]} */
  const refus = [];
  /** @type {Set<ElementXml>} */
  const supprimes = new Set();

  /** @param {string} clef */
  const compterRetrait = (clef) => {
    retires[clef] = (retires[clef] ?? 0) + 1;
  };

  // Instantané AVANT toute mutation : `querySelectorAll` rend une NodeList STATIQUE, elle ne se
  // met donc pas à jour quand on retire des nœuds en cours de route — la copie serait sans effet.
  for (const element of document.querySelectorAll('*')) {
    if (supprimes.has(element) || estDetache(element, supprimes)) continue;
    const nom = element.tagName;

    const verdict = jugerElement(nom);
    if (verdict.genre === 'retirer') {
      compterRetrait(verdict.clef);
      supprimes.add(element);
      element.remove();
      continue;
    }
    if (verdict.genre === 'refuser') {
      refus.push(verdict.libelle);
      continue;
    }

    appliquerListeBlancheAuxAttributs(element, nom, compterRetrait, refus);
  }

  const svg = new dom.window.XMLSerializer().serializeToString(racine).trim();
  return { svg, retires, refus };
}

/**
 * CONTRÔLE DE CONSERVATION (patron S-003), en mode VÉRIFICATION SEULE : le SVG
 * passé doit être DÉJÀ propre — zéro refus, et plus rien à retirer. Réutilisable,
 * et réutilisé sur les trois chemins où un SVG entre dans le site : sortie de
 * `mmdc`, relecture du CACHE, et contrôle final sur l'AST compilé.
 *
 * @param {string} svg
 * @param {string} origine
 * @returns {void}
 */
export function verifierSvgNettoye(svg, origine) {
  const rapport = analyserSvg(svg, origine);
  const restes = Object.entries(rapport.retires)
    .filter(([, n]) => n > 0)
    .map(([nom, n]) => `« ${nom} » : ${n} survivant(s) — le nettoyage n'a pas porté`);

  if (rapport.refus.length === 0 && restes.length === 0) return;
  echec(`${origine} : le SVG ne satisfait pas l'analyseur`, [
    ...rapport.refus,
    ...restes,
    ...CONSEILS_ANALYSEUR,
  ]);
}

/**
 * Rend uniques tous les identifiants du diagramme et réécrit leurs références.
 *
 * @param {string} svg
 * @param {string} prefixe
 * @param {string} nomFichier
 * @param {number} rang
 * @returns {{ svg: string, identifiants: number }}
 */
function prefixerIdentifiants(svg, prefixe, nomFichier, rang) {
  const connus = new Map(
    [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => [m[1] ?? '', `${prefixe}-${m[1] ?? ''}`]),
  );

  let sortie = svg.replace(/(\sid=")([^"]+)(")/g, (tout, avant, id, apres) =>
    connus.has(id) ? `${avant}${connus.get(id)}${apres}` : tout,
  );

  // Références internes. Une référence vers un identifiant INCONNU n'est pas
  // réécrite en silence : elle fait échouer, parce qu'elle signifie soit un
  // diagramme cassé, soit un motif que ce nettoyage ne comprend pas encore.
  /** @type {string[]} */
  const orphelines = [];
  sortie = sortie.replace(/url\(#([^)]+)\)/g, (tout, id) => {
    const remplacant = connus.get(String(id));
    if (remplacant === undefined) {
      orphelines.push(String(id));
      return tout;
    }
    return `url(#${remplacant})`;
  });
  sortie = sortie.replace(/((?:xlink:)?href=")#([^"]+)(")/g, (tout, avant, id, apres) => {
    const remplacant = connus.get(String(id));
    if (remplacant === undefined) {
      orphelines.push(String(id));
      return tout;
    }
    return `${avant}#${remplacant}${apres}`;
  });
  sortie = sortie.replace(
    /(\saria-(?:labelledby|describedby)=")([^"]+)(")/g,
    (tout, avant, liste, apres) => {
      const jetons = String(liste)
        .split(/\s+/)
        .map((id) => {
          const remplacant = connus.get(id);
          if (remplacant === undefined) orphelines.push(id);
          return remplacant ?? id;
        });
      return `${avant}${jetons.join(' ')}${apres}`;
    },
  );

  if (orphelines.length > 0) {
    echec(`${nomFichier} : diagramme n°${rang} référence des identifiants inexistants`, [
      `orphelins : ${[...new Set(orphelines)].join(', ')}`,
      'une flèche ou une description qui pointe dans le vide ne se corrige pas au rendu',
    ]);
  }
  return { svg: sortie, identifiants: connus.size };
}

/**
 * Pose la classe crochet sur le `<svg>` racine, et retire la largeur en dur que
 * Mermaid écrit en attribut : la taille est décidée par la feuille, pas par le
 * générateur.
 *
 * @param {string} svg
 * @param {string} nomFichier
 * @param {number} rang
 * @returns {string}
 */
function marquerRacine(svg, nomFichier, rang) {
  const ouverture = /<svg\b[^>]*>/i.exec(svg);
  if (ouverture === null) {
    return echec(`${nomFichier} : diagramme n°${rang} — aucune balise <svg> en sortie de mmdc`);
  }
  const balise = ouverture[0];
  const marquee = /\sclass="([^"]*)"/i.test(balise)
    ? balise.replace(/\sclass="([^"]*)"/i, (_tout, valeur) => ` class="${valeur} ${CLASSE_RACINE}"`)
    : balise.replace(/^<svg/i, `<svg class="${CLASSE_RACINE}"`);
  return svg.replace(balise, marquee);
}

/**
 * @typedef {object} Nettoyage
 * @property {string} svg le SOCLE : nettoyé et marqué, mais PAS ENCORE préfixé
 * @property {Record<string, number>} retires comptes de ce qui a été réellement retiré
 */

/**
 * Le cœur du lot : passe un SVG de `mmdc` à l'analyseur, refuse au premier
 * constat, et rend le SOCLE mis en cache.
 *
 * Ce que cette fonction NE fait PAS, et pourquoi : elle ne préfixe pas les
 * identifiants. Le socle est partagé entre toutes les occurrences d'un même code
 * (c'est ce qui rend le cache utile) alors que le préfixe, lui, doit être UNIQUE
 * PAR OCCURRENCE — voir `prefixeOccurrence`.
 *
 * @param {string} brut
 * @param {string} nomFichier
 * @param {number} rang
 * @returns {Nettoyage}
 */
export function nettoyerSvg(brut, nomFichier, rang) {
  const origine = `${nomFichier} · diagramme n°${rang}`;
  const rapport = analyserSvg(brut, origine);

  if (rapport.refus.length > 0) {
    echec(`${origine} — ${rapport.refus.length} constat(s) de l'analyseur SVG`, [
      ...rapport.refus,
      ...CONSEILS_ANALYSEUR,
    ]);
  }

  return { svg: marquerRacine(rapport.svg, nomFichier, rang), retires: rapport.retires };
}

// ---------------------------------------------------------------------------
// Invocation mmdc — une par leçon
// ---------------------------------------------------------------------------

/**
 * @param {readonly string[]} codes sources normalisées à rendre
 * @param {{ mmdc: string, chromium: string }} outils
 * @param {string} nomFichier
 * @returns {string[]} SVG bruts, dans l'ordre des `codes`
 */
function invoquerMmdc(codes, outils, nomFichier) {
  const bac = mkdtempSync(join(tmpdir(), 'drjst-mermaid-'));
  try {
    const entree = join(bac, 'lot.md');
    const sortie = join(bac, 'sortie.md');
    const config = join(bac, 'mermaid.json');
    const puppeteer = join(bac, 'puppeteer.json');

    writeFileSync(entree, codes.map((c) => `\`\`\`mermaid\n${c}\`\`\`\n`).join('\n'), 'utf8');
    writeFileSync(config, JSON.stringify(CONFIG_MERMAID), 'utf8');
    // `--no-sandbox` UNIQUEMENT en CI, jamais sur le poste d'un développeur.
    // Ce Chromium rend du Markdown d'AUTEUR sur la machine qui bâtit `dist/` : lui
    // retirer son bac à sable est un vrai affaiblissement, et il n'a de contrepartie
    // que dans un conteneur non privilégié (le runner GitHub), où le bac à sable
    // d'espaces de noms n'est pas disponible et où le processus est de toute façon
    // jetable. En local, le bac à sable est GRATUIT — on le garde.
    const argumentsChromium = process.env['CI'] === undefined ? [] : ['--no-sandbox'];
    writeFileSync(
      puppeteer,
      JSON.stringify({
        executablePath: outils.chromium,
        headless: true,
        args: argumentsChromium,
      }),
      'utf8',
    );

    try {
      execFileSync(
        process.execPath,
        [outils.mmdc, '-i', entree, '-o', sortie, '-c', config, '-p', puppeteer, '-q'],
        { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' },
      );
      // `NOSONAR` : S7718 réclame `error_`, contre la règle « français seulement » — voir
      // `localiserChromium` pour le raisonnement complet.
    } catch (erreur) { // NOSONAR
      const detail = /** @type {{ stderr?: string, stdout?: string }} */ (erreur);
      // `slice` rend DÉJÀ un tableau neuf : l'étaler dans un littéral n'en faisait qu'une copie
      // de plus, sans effet.
      return echec(
        `${nomFichier} : mmdc a échoué sur le lot de diagrammes`,
        String(detail.stderr ?? detail.stdout ?? erreur)
          .split('\n')
          .filter((l) => l.trim() !== '')
          .slice(-6),
      );
    }

    return codes.map((_code, index) => {
      const fichier = join(bac, `sortie-${index + 1}.svg`);
      if (!existsSync(fichier)) {
        return echec(`${nomFichier} : mmdc n'a pas produit le diagramme n°${index + 1}`, [
          `attendu : ${fichier}`,
          "le mode Markdown de mmdc numérote les sorties dans l'ordre du fichier d'entrée",
        ]);
      }
      return readFileSync(fichier, 'utf8');
    });
  } finally {
    rmSync(bac, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// La fabrique
// ---------------------------------------------------------------------------

/**
 * @typedef {object} DiagrammeRendu
 * @property {string} svg
 * @property {string} titreAccessible
 * @property {string} descriptionLongue
 */

/**
 * @typedef {object} Statistiques
 * @property {number} diagrammes OCCURRENCES, pas sources distinctes
 * @property {number} depuisCache sources distinctes relues du cache
 * @property {number} rendus sources distinctes passées par mmdc
 * @property {number} millisecondes total des invocations mmdc
 * @property {Record<string, number>} retires comptes cumulés de ce qui a été retiré
 */

/**
 * @typedef {object} RendeurMermaid
 * @property {(cheminLecon: string, source: string) => void} prechargerLecon
 * @property {(code: string) => DiagrammeRendu} rendre
 * @property {() => Statistiques} statistiques
 * @property {() => void} journaliser
 */

/**
 * Fabrique le rendeur. Le Chromium et `mmdc` sont localisés MAINTENANT, à la
 * construction : mieux vaut échouer avant d'avoir compilé douze leçons.
 *
 * @param {{ cache?: string }} [options]
 * @returns {RendeurMermaid}
 */
export function creerRendeurMermaid(options = {}) {
  const outils = { mmdc: localiserMmdc(), chromium: localiserChromium() };
  const dossierCache = resolve(RACINE_DEPOT, options.cache ?? DOSSIER_CACHE);
  mkdirSync(dossierCache, { recursive: true });

  /**
   * SOCLES, par clef de cache : le SVG nettoyé et marqué, NON préfixé. C'est lui
   * que le cache disque conserve, et c'est ce qui rend le cache partageable entre
   * deux leçons portant le même diagramme.
   *
   * @type {Map<string, string>}
   */
  const socles = new Map();

  /**
   * TABLE DE CONSULTATION, par clef de cache — une FILE, pas une valeur unique.
   *
   * La couture du compilateur est `(code) => rendu` : elle ne dit ni la leçon, ni
   * le rang. Deux occurrences du même code ne peuvent donc pas être distinguées à
   * la consultation… mais elles n'ont pas à l'être, parce que les entrées d'une
   * même file ne diffèrent QUE par leur préfixe d'identifiants (les directives
   * `accTitle`/`accDescr` sont écrites DANS le code du diagramme : à code
   * identique, elles le sont aussi). N'importe quel ordre de consommation est donc
   * correct, tant que chaque entrée n'est servie QU'UNE FOIS — ce que garantit le
   * curseur `consommes`.
   *
   * @type {Map<string, DiagrammeRendu[]>}
   */
  const table = new Map();

  /** @type {Map<string, number>} curseur de consommation, par clef */
  const consommes = new Map();

  /** @type {Statistiques} */
  const stats = { diagrammes: 0, depuisCache: 0, rendus: 0, millisecondes: 0, retires: {} };

  /** @param {Record<string, number>} comptes */
  const cumuler = (comptes) => {
    for (const [nom, n] of Object.entries(comptes))
      stats.retires[nom] = (stats.retires[nom] ?? 0) + n;
  };

  return {
    prechargerLecon(cheminLecon, source) {
      const nomFichier = afficher(resolve(RACINE_DEPOT, cheminLecon));
      const codes = extraireDiagrammes(source);
      if (codes.length === 0) return;

      // Les directives d'accessibilité sont exigées AVANT tout démarrage de
      // navigateur : un fichier fautif doit coûter des millisecondes, pas six
      // secondes de Chromium.
      const acces = codes.map((code, i) => lireDirectivesAcces(code, nomFichier, i + 1));

      // 1 · Quels SOCLES manquent ? Un socle par code DISTINCT, jamais par occurrence.
      /** @type {{ code: string, rang: number, clef: string }[]} */
      const manquants = [];
      codes.forEach((code, i) => {
        const clef = clefCache(code);
        if (socles.has(clef) || manquants.some((m) => m.clef === clef)) return;

        const enCache = join(dossierCache, `${clef}.svg`);
        if (existsSync(enCache)) {
          // LE CACHE N'EST PAS UNE SOURCE DE CONFIANCE. Un fichier corrompu, ou
          // produit sous des règles antérieures, entrerait sinon dans le site sans
          // repasser par le moindre contrôle — un garde-fou hors du chemin
          // d'exécution ne garde rien (S-003).
          const socle = readFileSync(enCache, 'utf8');
          verifierSvgNettoye(socle, `${afficher(enCache)} (relu du cache)`);
          socles.set(clef, socle);
          stats.depuisCache += 1;
          return;
        }
        manquants.push({ code, rang: i + 1, clef });
      });

      // 2 · UNE invocation pour tous les manquants de CETTE leçon (nœud 4 de §E2).
      if (manquants.length > 0) {
        const debut = Date.now();
        const bruts = invoquerMmdc(
          manquants.map((m) => m.code),
          outils,
          nomFichier,
        );
        stats.millisecondes += Date.now() - debut;

        manquants.forEach((manquant, i) => {
          const nettoye = nettoyerSvg(bruts[i] ?? '', nomFichier, manquant.rang);
          cumuler(nettoye.retires);
          writeFileSync(join(dossierCache, `${manquant.clef}.svg`), nettoye.svg, 'utf8');
          socles.set(manquant.clef, nettoye.svg);
          stats.rendus += 1;
        });
      }

      // 3 · UNE entrée de table PAR OCCURRENCE, avec son propre préfixe.
      codes.forEach((code, i) => {
        const rang = i + 1;
        const clef = clefCache(code);
        const socle = socles.get(clef);
        if (socle === undefined) {
          return echec(`${nomFichier} : diagramme n°${rang} sans socle après rendu`, [
            `clef de cache : ${clef}`,
            "c'est une incohérence interne du rendeur, pas une faute de la leçon",
          ]);
        }

        const origine = `${nomFichier} · diagramme n°${rang}`;
        const { svg } = prefixerIdentifiants(
          socle,
          prefixeOccurrence(nomFichier, rang, code),
          nomFichier,
          rang,
        );
        // Contrôle de conservation sur la sortie RÉELLEMENT posée en table.
        verifierSvgNettoye(svg, origine);

        const file = table.get(clef) ?? [];
        file.push({ svg, ...(acces[i] ?? { titreAccessible: '', descriptionLongue: '' }) });
        table.set(clef, file);
        return undefined;
      });

      stats.diagrammes += codes.length;
    },

    rendre(code) {
      const clef = clefCache(normaliser(code));
      const file = table.get(clef);
      const dejaServis = consommes.get(clef) ?? 0;
      const rendu = file?.[dejaServis];
      if (rendu === undefined) {
        return echec('un diagramme atteint le compilateur sans occurrence préchargée', [
          `empreinte : ${clef}`,
          `occurrences préchargées : ${file?.length ?? 0} · déjà servies : ${dejaServis}`,
          file === undefined
            ? "l'orchestrateur doit appeler prechargerLecon(chemin, source) pour CHAQUE leçon"
            : 'la compilation demande PLUS d’occurrences de ce diagramme que le préchargement',
          "n'en a inscrit — les deux comptages doivent porter sur les mêmes fichiers",
        ]);
      }
      consommes.set(clef, dejaServis + 1);
      return rendu;
    },

    statistiques() {
      return stats;
    },

    journaliser() {
      const retires = Object.entries(stats.retires)
        .map(([nom, n]) => `${nom} ×${n}`)
        .join(', ');
      console.error(
        `rendre-mermaid : ${stats.diagrammes} occurrence(s) — ${stats.rendus} source(s) rendue(s), ` +
          `${stats.depuisCache} relue(s) du cache, ${stats.millisecondes} ms de mmdc`,
      );
      console.error(`rendre-mermaid : retiré par l'analyseur — ${retires || '(aucun)'}`);
    },
  };
}

// ---------------------------------------------------------------------------
// Ligne de commande — harnais de preuve du lot 3
// ---------------------------------------------------------------------------

/**
 * LE CONTRÔLE FINAL — sur l'AST réellement produit, et sur AUCUN autre chemin.
 *
 * Il vivait dans le harnais `--racine` ci-dessous, que `npm run content:build`
 * n'exécute JAMAIS : un garde-fou hors du chemin d'exécution ne garde rien
 * (S-003, encore). Il est donc EXPORTÉ, et `build.mjs` — le seul chemin que la CI
 * et les développeurs empruntent — l'appelle après compilation. Le harnais
 * l'appelle aussi, pour rester honnête sur ce qu'il prouve.
 *
 * Deux exigences, indissociables :
 *   · chaque `svg` de l'AST repasse par l'ANALYSEUR (et non par un recomptage de
 *     motifs) — la compilation a pu le recopier, jamais le réécrire, et c'est
 *     précisément ce qu'on vérifie plutôt que de le supposer ;
 *   · AUCUN identifiant n'est partagé entre deux diagrammes. Cette seconde
 *     exigence ne se voit qu'en regardant les diagrammes ENSEMBLE : c'est la règle
 *     que `duplicate-id-aria` sanctionnerait chez axe, et qu'un `url(#…)` pointant
 *     chez le voisin trahirait à l'œil.
 *
 * Le contrôle porte sur les CHAMPS `svg`, pas sur le JSON entier — ce n'est pas un
 * affaiblissement. Une leçon qui ENSEIGNE la CSP écrit « style= » et « <script> »
 * dans sa prose ; balayer le JSON complet rougirait sur du texte parfaitement sain
 * (markdown-it échappe le balisage de la prose, Shiki n'émet aucun style en ligne
 * — garanties du lot 2).
 *
 * @param {readonly LeconCompilee[]} lecons
 * @returns {{ svg: number, identifiants: number, uniques: number }}
 */
export function controlerSvgCompiles(lecons) {
  const svgs = collecterSvg(lecons);
  svgs.forEach((svg, i) => verifierSvgNettoye(svg, `SVG compilé n°${i + 1} (contrôle final)`));

  const identifiants = svgs.flatMap((svg) =>
    [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1] ?? ''),
  );
  const uniques = new Set(identifiants);
  if (uniques.size !== identifiants.length) {
    const partages = [...new Set(identifiants.filter((id, i) => identifiants.indexOf(id) !== i))];
    echec(`${identifiants.length - uniques.size} identifiant(s) partagé(s) entre diagrammes`, [
      `en cause : ${partages.slice(0, 8).join(', ')}`,
      'deux diagrammes de la même page se disputeraient leurs marqueurs et leurs',
      'descriptions accessibles (axe `duplicate-id-aria`), et un `url(#…)` pointerait',
      'chez le voisin — le préfixage PAR OCCURRENCE est ce qui doit l’empêcher',
    ]);
  }
  return { svg: svgs.length, identifiants: identifiants.length, uniques: uniques.size };
}

/**
 * Compile une racine EN BRANCHANT le rendeur, puis lui applique le contrôle final.
 * Ce harnais est un outil de mise au point : le chemin de production est
 * `npm run content:build`, qui appelle `controlerSvgCompiles` lui-même.
 *
 * @param {string} racine
 * @returns {Promise<void>}
 */
async function principal(racine) {
  const racineAbsolue = resolve(RACINE_DEPOT, racine);
  if (!existsSync(racineAbsolue)) echec(`racine introuvable — « ${racine} »`);

  const rendeur = creerRendeurMermaid();
  for (const chemin of recenserFichiersLecon(racineAbsolue)) {
    rendeur.prechargerLecon(chemin, readFileSync(chemin, 'utf8'));
  }

  const { lecons } = await compilerRacine(racineAbsolue, { rendreMermaid: rendeur.rendre });

  rendeur.journaliser();

  const controle = controlerSvgCompiles(lecons);
  console.error(
    `rendre-mermaid : ${controle.svg} SVG contrôlé(s) · ${controle.identifiants} identifiant(s), ` +
      `${controle.uniques} unique(s)`,
  );
  console.error(`rendre-mermaid : ${lecons.length} leçon(s) compilée(s), 0 constat`);
}

/**
 * Récolte les `svg` de tous les blocs `mermaid`, encadrés compris.
 *
 * @param {readonly LeconCompilee[]} lecons
 * @returns {string[]}
 */
function collecterSvg(lecons) {
  /** @type {string[]} */
  const trouves = [];
  /** @param {readonly BlocContenu[]} blocs */
  const descendre = (blocs) => {
    for (const bloc of blocs) {
      if (bloc.type === 'mermaid') trouves.push(bloc.svg);
      else if (bloc.type === 'encadre') descendre(bloc.blocs);
    }
  };
  for (const lecon of lecons) for (const section of lecon.sections) descendre(section.blocs);
  return trouves;
}

/**
 * Recense les `lecon.md` d'une racine. EXPORTÉ pour l'orchestrateur `build.mjs` (lot 4) : c'est lui
 * qui décide s'il faut un rendeur — donc un Chromium — en regardant si une seule leçon porte un
 * diagramme. Réécrire ce parcours là-bas en ferait une troisième copie des mêmes règles de
 * recensement (`valider.mjs` et `compiler-markdown.mjs` en portent déjà une chacun, sur les
 * DOSSIERS ; celle-ci rend les FICHIERS).
 *
 * @param {string} racine chemin absolu
 * @returns {string[]}
 */
export function recenserFichiersLecon(racine) {
  /** @type {string[]} */
  const trouves = [];
  /** @param {string} dossier */
  const descendre = (dossier) => {
    for (const entree of readdirSync(dossier, { withFileTypes: true })) {
      const chemin = join(dossier, entree.name);
      if (entree.isDirectory()) descendre(chemin);
      else if (entree.name === 'lecon.md') trouves.push(chemin);
    }
  };
  descendre(racine);
  // `comparerOctets` et non le tri par défaut : ce recensement décide de l'ORDRE de rendu des
  // leçons, donc des préfixes d'identifiants du SVG (L-026). Un ordre dépendant de la locale
  // produirait deux artéfacts différents pour la même entrée selon la machine (L-009).
  return trouves.sort(comparerOctets);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const index = process.argv.indexOf('--racine');
  const racine = index === -1 ? undefined : process.argv[index + 1];
  if (racine === undefined)
    echec('usage : node tools/content-pipeline/rendre-mermaid.mjs --racine <dossier>');
  await principal(racine);
}
