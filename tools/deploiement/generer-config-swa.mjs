#!/usr/bin/env node
/**
 * Génère le `staticwebapp.config.json` de l'artéfact de déploiement.
 *
 * Pourquoi ce script existe (voir addendum S-02, `docs/architecture/stack-et-architecture.md` §9) :
 * chaque page prerendue porte un bloc `<style ng-app-id>` produit par Angular. Une CSP stricte
 * (sans `unsafe-inline`) ne peut l'autoriser que par **hachage**, et ce hachage change à chaque
 * modification de style. Une CSP recopiée à la main se désynchronise donc au premier changement —
 * d'où la génération.
 *
 * Même mécanique pour `script-src` depuis E1-ST1-C : la page porte UN script inline
 * (`<script id="init-theme">`, l'anti-flash de thème), qui ne peut être autorisé que par hachage.
 * Il est haché depuis l'artéfact et non depuis `src/index.html`, parce que c'est l'artéfact que le
 * navigateur reçoit : si la construction transforme la page (minification, sérialisation du
 * prerender), le hachage suit sans qu'on ait à le savoir.
 *
 * `config/staticwebapp.config.source.json` est la SOURCE : elle contient tout sauf les hachages,
 * marqués par les jetons `__HACHAGES_STYLE__` et `__HACHAGES_SCRIPT__`. Ce script la résout et écrit
 * le résultat dans `dist/`, qui est l'artéfact réellement déployé sur Azure Static Web Apps.
 *
 * ⚠️ La source ne s'appelle **pas** `staticwebapp.config.json` et ne vit **pas** à la racine, à
 * dessein : `swa start` (et potentiellement le déploiement) résout ce nom depuis le répertoire
 * courant, pas depuis le dossier servi. Un fichier portant ce nom à la racine serait donc servi tel
 * quel — jeton non résolu compris, ce qui produit un `style-src` invalide et un site sans styles.
 * Constaté en local le 2026-08-03.
 *
 * Il sert aussi de GARDE-FOU : il échoue si la sortie contient un gestionnaire d'événement inline
 * ou un script inline exécutable AUTRE que celui autorisé nommément ci-dessous, deux choses que la
 * CSP bloquerait *silencieusement* en production.
 *
 * ⚠️ CE QUE `style-src` GARANTIT — ET CE QU'IL NE GARANTIT PAS (décision E-3 du lot E, E2-ST3,
 * AMENDÉE le 2026-08-18 après revue sécurité — lire l'amendement, la première rédaction promettait
 * plus que le code n'appliquait).
 * Jusqu'au 2026-08-18, ce script hachait **tout** bloc `<style>` trouvé dans l'artéfact : la
 * permission se dérivait donc de la sortie, ce que **S-002** interdit et ce que l'en-tête ci-dessus
 * reproche déjà au cas `script-src`. Le premier `.scss` d'un composant interactif y aurait ajouté un
 * hachage **en silence**, sans qu'aucun humain ne l'ait vu.
 * La dérivation est désormais bornée par DEUX contrôles, et il faut **les deux** :
 *   1. PROVENANCE ET PLACE : seuls les blocs `<style ng-app-id="ng">`, sans aucun autre attribut,
 *      **enfants directs de `<head>` ou de `<body>`**, sont hachés ; tout autre `<style>` de la
 *      sortie prerendue est une infraction nommée, au même titre qu'un gestionnaire d'événement
 *      inline. La contrainte de place n'est pas décorative : `<noscript><style ng-app-id="ng">` est
 *      **invisible au navigateur** quand le script est actif, et son contenu obtenait quand même un
 *      hachage global dans `style-src` — divergence d'analyseurs de la famille **S-001**.
 *   2. NOMBRE ÉPINGLÉ : `NOMBRE_HACHAGES_STYLE_ATTENDU` ci-dessous. Le compte de hachages distincts
 *      de l'artéfact est comparé à une valeur **revue**, exactement comme `hachagesScript.size`
 *      l'est à 1. Il n'y a qu'UN artéfact depuis la clôture d'E3-ST1 (le harnais de fixture de la
 *      décision E-2 est retiré), donc qu'un seul compte : la constante ci-dessous, et rien
 *      d'autre. L'option `--hachages-style <n>` qui permettait de la remplacer au point d'appel a
 *      été **supprimée** le 2026-08-20 — c'était un levier capable de desserrer une autorisation
 *      CSP depuis le corps d'un script npm, hors de portée du garde-fou qui la surveillait
 *      (S-018). Ce script n'accepte plus **aucun** argument. Détail : `refuserToutArgument`.
 *   · CE QUI EST FERMÉ : qu'un hachage de style **apparaisse dans la CSP sans que personne ne le
 *     voie**. Un composant neuf qui porte des styles fait rougir la construction UNE fois, et cette
 *     fois-là passe par une revue.
 *   · CE QUI RESTE OUVERT, ET SE DIT : le **contenu** de chaque bloc reste **dérivé de l'artéfact**,
 *     jamais comparé à une valeur revue. `style-src` n'est donc **PAS** une liste blanche nominative
 *     comme `script-src` — le nombre est épinglé, les valeurs ne le sont pas. Ne jamais laisser
 *     croire, ici ou ailleurs, l'inverse : un texte qui promet plus que le code n'applique, c'est
 *     **S-009**.
 *   · CE QUE LA PREMIÈRE RÉDACTION DE CETTE NOTE PROMETTAIT À TORT, et pourquoi le nombre a été
 *     ajouté : elle annonçait qu'« un bloc injecté par autre chose qu'Angular — **un composant** —
 *     ne peut plus s'auto-autoriser ». C'est **faux**, et c'était mesurable : les blocs `<style>` de
 *     l'artéfact **SONT** les styles des composants (`[_nghost-ng-c…]`), tous émis par Angular avec
 *     `ng-app-id="ng"`. Borner à ce marqueur, c'est borner à un **marqueur**, pas à une
 *     **provenance** — le producteur légitime le porte lui-même, et la revue a fait accepter un
 *     `<style ng-app-id="ng">.quiz[_ngcontent-ng-c999]{color:red}</style>` ajouté à l'artéfact réel
 *     (code 0, 9 → 10 hachages, aucun signal). D'où le contrôle 2.
 *   · POURQUOI LE NOMBRE ET NON LES VALEURS : un `HACHAGE_STYLE_ATTENDU` par bloc rougirait à
 *     **chaque `.scss` touché** — pression permanente à désarmer le garde-fou, sur un fichier dont
 *     **S-011** montre qu'il en subit déjà. Éditer un `.scss` ne change **pas** le compte :
 *     l'objection qui écartait l'épinglage des valeurs ne s'applique pas à celui du nombre.
 *
 * ⚠️ TOUT EST ANALYSÉ — AUCUN MOTIF NE PEUT PLUS **AUTORISER** ; les deux motifs qui subsistent
 * (`<script[\s>/]`, `<style[\s>/]`) ne servent qu'à COMPTER le brut, jamais à décider ce qui est
 * **autorisé** ; un écart, lui, refuse en se nommant (lot A de la dette sécurité
 * pré-E3-ST1, 2026-08-19 ; c'est la fermeture de **S-003** pour ce fichier).
 * Chaque page est analysée UNE seule fois par jsdom, et le MÊME document sert aux trois contrôles :
 * balises `<script>`, attributs de TOUS les éléments (`style`, `on…`), blocs `<style>`. Ce que les
 * trois motifs retirés rataient — mesuré et reproduit, pas supposé :
 *   · `<script data-x=a"b>alert(1)</script>` : UN guillemet non refermé (nombre IMPAIR) suffisait à
 *     faire échouer la capture — le motif ne savait alterner que des runs cités complets. La balise
 *     n'était donc NI hachée NI signalée : construction VERTE. Un analyseur HTML, lui, garde le `"`
 *     dans la valeur non citée, ferme la balise au premier `>`, et le navigateur exécute le corps.
 *     Mesuré : ancien motif 0 capture, jsdom 1 élément, corps `alert(1)`.
 *   · `style='…'`, `style=…` sans guillemets, `STYLE=` : le motif ` style="` ne connaissait qu'une
 *     des quatre écritures d'un même attribut.
 *   · `onError='…'` : le motif ` (on[a-z]+)="` imposait à la fois le guillemet DOUBLE et la
 *     minuscule — deux trous dans un garde-fou de six caractères.
 * CE QUE ÇA GARANTIT : ce que le garde-fou refuse est ce qu'un analyseur HTML voit, et non ce que
 * l'auteur d'un motif avait imaginé.
 * CE QUE ÇA NE GARANTIT PAS, et il faut le dire (S-009) : que jsdom lise chaque octet comme tout
 * navigateur. La parade N'EST PAS LA MÊME dans les trois branches, et il faut le décrire tel quel
 * plutôt que promettre un dispositif uniforme :
 *   · `<script>` et `<style>` — CONTRÔLE DE CONSERVATION. Le compte d'occurrences BRUTES
 *     (`<script[\s>/]`, `<style[\s>/]`) est confronté au compte d'éléments ANALYSÉS ; tout écart
 *     est une infraction NOMMÉE. L'inconnu est compté, pas seulement analysé.
 *   · ATTRIBUTS (`style`, `on…`) — PAS de contrôle de conservation, et c'est un choix motivé : les
 *     motifs bruts correspondants (` style=`, ` on…=`) compteraient aussi les NŒUDS TEXTE, donc la
 *     leçon XSS qui affiche littéralement `onerror="alert(1)"` — ce serait rouvrir **S-011**, que
 *     l'abandon du balayage de texte brut vient précisément de refermer. À la place, deux gestes
 *     STRUCTURELS : le parcours descend dans `template.content` (que `querySelectorAll` ignore), et
 *     toute construction capable de soustraire du contenu vif à l'analyseur — `<template>`,
 *     `<noscript>`, `<iframe>`, l'attribut `shadowrootmode` — est refusée NOMINATIVEMENT. Détail et
 *     mesure : `BALISES_MASQUANTES`, plus bas.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { join, relative, resolve, sep } from 'node:path';

const RACINE = process.cwd();
const SOURCE = join(RACINE, 'config', 'staticwebapp.config.source.json');
const ARTEFACT = join(RACINE, 'dist', 'dr-je-sais-tout', 'browser');
const JETON_STYLE = '__HACHAGES_STYLE__';
const JETON_SCRIPT = '__HACHAGES_SCRIPT__';

/**
 * Le SEUL script inline autorisé du site : l'anti-flash de thème (`src/index.html`).
 * Tout autre script inline reste une infraction — la liste blanche est nominative, jamais un motif.
 */
const ID_SCRIPT_AUTORISE = 'init-theme';

/**
 * Hachage attendu du script autorisé — ÉPINGLÉ ICI EXPRÈS.
 *
 * Sans cette constante, la liste blanche porterait sur l'`id` et non sur le CONTENU : n'importe
 * quel corps placé sous `id="init-theme"` se ferait hacher puis autoriser tout seul dans
 * `script-src`. Le générateur cesserait d'être un garde-fou pour devenir un distributeur
 * d'autorisations, et la revue `security-reviewer` exigée par le backlog (§E1-ST1, ST1-C) ne
 * survivrait pas à la première édition du script.
 *
 * ⚠️ CHANGER LE SCRIPT INLINE CHANGE CE HACHAGE, et la construction échouera tant qu'il n'est pas
 * remis à jour ici — c'est voulu, et la mise à jour n'est PAS une formalité : elle passe par une
 * relecture `security-reviewer`. Même esprit que le mode `--check` de la leçon L-009.
 */
const HACHAGE_SCRIPT_ATTENDU = "'sha256-hIxkAZ0KC2VIDD2cWnG1AoQYrZGTH4AxI7h8JYMUs8M='";

/**
 * La SEULE provenance de bloc `<style>` reconnue : le marqueur qu'Angular pose sur les styles qu'il
 * injecte lui-même dans la page prerendue (`<style ng-app-id="ng">`). La forme est mesurée sur
 * l'artéfact, pas devinée : au 2026-08-18, les 17 blocs des 4 pages prerendues portent tous
 * `ng-app-id="ng"` et **rien d'autre**. On retient donc la forme la plus étroite qui couvre ce
 * qu'Angular émet réellement — exactement un attribut, celui-ci, à cette valeur.
 *
 * ⚠️ Élargir ce couple (autre valeur, attribut supplémentaire toléré) ROUVRE le trou que la
 * décision E-3 ferme : la reconnaissance de provenance redeviendrait assez lâche pour qu'un bloc
 * d'une autre origine s'y glisse. Si une version d'Angular change ce marquage, la construction
 * échouera en NOMMANT le bloc — c'est le moment de faire relire la nouvelle forme, pas de la
 * recopier ici sans regard.
 */
const ATTRIBUT_PROVENANCE_STYLE = 'ng-app-id';
const VALEUR_PROVENANCE_STYLE = 'ng';

/**
 * Les SEULS parents admis pour un bloc `<style>` haché.
 *
 * POURQUOI UNE CONTRAINTE DE PLACE EN PLUS DE LA PROVENANCE. Le marqueur `ng-app-id="ng"` se pose
 * n'importe où : `<svg><style ng-app-id="ng">` et surtout `<noscript><style ng-app-id="ng">`
 * étaient acceptés et hachés. Le second est une **divergence d'analyseurs** (famille S-001) :
 * script activé, le navigateur ne voit **aucun élément** dans le `<noscript>` — il n'y a là qu'un
 * texte —, mais son contenu obtenait tout de même un hachage dans un `style-src` **global**, donc
 * valable pour toute la page. Angular pose ses styles en enfant direct de `<head>` (mesuré sur les
 * 4 pages prerendues, 2026-08-18) ; toute autre place est une infraction NOMMÉE, pas un silence.
 */
const PARENTS_STYLE_ADMIS = new Set(['head', 'body']);

/**
 * Nombre de hachages de style DISTINCTS attendus dans l'artéfact — ÉPINGLÉ ICI EXPRÈS.
 *
 * C'est le miroir exact de `hachagesScript.size !== 1` : la seule chose qui empêche une permission
 * `style-src` d'apparaître **sans qu'aucun humain ne l'ait vue**. Sans cette constante, la
 * reconnaissance de provenance ne borne qu'un marqueur — que le producteur légitime porte lui-même
 * (voir l'en-tête du fichier) : le `.scss` d'un composant neuf s'ajouterait donc en silence.
 *
 * ⚠️ CE NOMBRE VA ROUGIR, ET C'EST LE COMPORTEMENT VOULU. Trois à quatre fois d'ici la fin d'E2
 * (E2-ST4, ST5, ST6 ajoutent chacune un composant à la page de leçon). Éditer un `.scss` existant
 * ne change **pas** le compte : un composant neuf porteur de styles rougit **une fois**, et cette
 * fois-là est exactement la revue qu'on veut. Mettre la constante à jour n'est PAS une formalité :
 * elle passe par une relecture `security-reviewer`, **puis** l'édition. Jamais l'inverse (S-002).
 *
 * Valeur mesurée sur l'artéfact du 2026-08-18 : 9 hachages distincts pour 4 fichiers HTML inspectés
 * (17 blocs, dédupliqués — les mises en page partagées se répètent d'une page à l'autre).
 *
 * ⚠️ CE NOMBRE EST CELUI DE L'ARTÉFACT DE PRODUCTION, et c'est désormais le SEUL — le harnais de
 * fixture de la décision E-2 a été retiré à la clôture d'E3-ST1, et l'option qui permettait de
 * remplacer ce compte au point d'appel avec lui. `npm run build` en local, `ci.yml` et
 * `deploy.yml` bâtissent tous le même artéfact et relisent tous cette constante.
 */
// 📈 9 → 10 le 2026-08-19 (E2-ST6) : `PageAVenir` (un bloc) cède `cours/securite-web` à
// l'adaptateur `PageSommaireSecuriteWeb` (`.page`) ET au composant `Sommaire` (`.vide`). Le bloc
// de plus a été énuméré et nommé avant cet épinglage.
// 📈 10 → 13 le 2026-08-20 (E3-ST1, clôture) : `content/` porte sa PREMIÈRE LEÇON PUBLIÉE
// (`01-fondamentaux`), donc l’artéfact de production prerend enfin une page de leçon. Les trois
// blocs de plus ont été ÉNUMÉRÉS ET NOMMÉS un par un avant cet épinglage (⚠️ c’est le NOMBRE qui
// est épinglé et revu ; le CONTENU de chaque bloc reste dérivé de l’artéfact — `style-src` n’est
// PAS une liste blanche nominative comme `script-src`, voir l’en-tête de ce fichier, S-002/S-009),
// et ils n’apparaissent QUE sur
// `cours/securite-web/fondamentaux/index.html` :
//   · 4 196 o — l’adaptateur de route de la page de leçon `[_nghost-…]{display:block;padding:…}`
//   · 6 998 o — le rendeur de blocs, `.prose[_ngcontent-…]`
//   · 5 669 o — le quiz, `.quiz[_ngcontent-…]`
// ⚠️ IL N’Y EN A QUE TROIS, ET C’EST LA MESURE QUI LE DIT. L’artéfact de FIXTURE en portait
// QUATRE de plus (14) : le quatrième était `.simulation[_ngcontent-…]`. La leçon 01 n’a pas de
// simulation — sujet abstrait, schéma statique (décision du propriétaire du 2026-08-20) — donc
// ce bloc n’est pas rendu. Il reviendra avec E3-ST3, et rougira ici une fois, comme prévu.
// Le compte de hachages de SCRIPT reste à 1.
const NOMBRE_HACHAGES_STYLE_ATTENDU = 13;

/**
 * @typedef {{ name: string }} AttributHtml
 * @typedef {{ tagName: string, attributes: Iterable<AttributHtml>, getAttribute(nom: string): string | null, textContent: string | null, outerHTML: string, parentElement: { tagName: string } | null, content?: DocumentHtml }} ElementHtml
 * @typedef {{ querySelectorAll(selecteur: string): Iterable<ElementHtml> }} DocumentHtml
 * @typedef {{ document: DocumentHtml }} FenetreHtml
 */

const requerir = createRequire(import.meta.url);

/**
 * jsdom ne publie pas de types et `@types/jsdom` serait une dépendance de plus pour trois membres.
 * La frontière est donc déclarée ICI, explicitement : c'est exactement la surface DOM que ce script
 * s'autorise. `tsconfig.tools.json` n'a pas `lib: DOM` — volontairement — et cette annotation
 * respecte cette frontière sans l'affaiblir. Même patron que `tools/a11y/verifier-axe.mjs` et
 * `tools/content-pipeline/rendre-mermaid.mjs`.
 *
 * @type {new (html: string) => { window: FenetreHtml }}
 */
const JSDOM = requerir('jsdom').JSDOM;

/**
 * Types de `<script>` réellement INERTES — le navigateur ne les exécute pas et la CSP ne les
 * soumet pas à `script-src`. La liste est volontairement courte : `importmap` et
 * `speculationrules` n'en font PAS partie (tous deux sont soumis à `script-src` quand ils sont
 * inline), les classer ici les rendrait invisibles au garde-fou tout en les faisant bloquer en
 * production — exactement la panne silencieuse que ce script existe pour empêcher.
 */
const TYPES_INERTES = new Set(['application/json', 'application/ld+json']);

/**
 * Les constructions qui peuvent SOUSTRAIRE du contenu vif au parcours de l'analyseur — refusées
 * NOMINATIVEMENT, avec la raison, parce qu'un contenu qu'on ne parcourt pas est un contenu qu'on
 * ne peut pas refuser (`.claude/rules/security.md` §4 : tout ce qui est absent de la liste blanche
 * échoue EN SE NOMMANT).
 *
 * POURQUOI CE REFUS PLUTÔT QU'UN COMPTAGE DU TEXTE BRUT. Le réflexe serait de compter les
 * occurrences brutes de ` style=` / ` on…=` comme on le fait pour `<script` et `<style`. Ce serait
 * **rouvrir S-011** : ces motifs comptent aussi les NŒUDS TEXTE, et la leçon XSS affiche
 * littéralement `onerror="alert(1)"` dans son contenu pédagogique — construction rouge sur un
 * dépôt sain, sur le site qui enseigne la CSP, avec la pression d'assouplissement que ça implique.
 * Le refus ci-dessous porte sur une STRUCTURE, jamais sur du texte libre, donc il ne peut pas se
 * former dans une phrase d'auteur.
 *
 * ET IL EST GRATUIT — mesuré le 2026-08-19 : les pages HTML de l'artéfact de production comme de
 * l'artéfact de fixture (page de leçon interactive comprise) portent **zéro** occurrence de ces
 * trois balises et de `shadowrootmode`. Angular n'en émet aucune. Le jour où le produit en aura
 * réellement besoin, la construction rougira en NOMMANT la page — c'est exactement la revue qu'on
 * veut à ce moment-là, pas un silence.
 */
const BALISES_MASQUANTES = new Map([
  [
    'template',
    'son contenu vit dans un fragment SÉPARÉ, invisible à `querySelectorAll` — et avec `shadowrootmode` il devient du DOM vif dans le navigateur',
  ],
  [
    'noscript',
    'le navigateur bascule en RAWTEXT quand le script est ACTIF, là où l’analyseur (script désactivé) y voit des éléments — divergence d’analyseurs, famille S-001',
  ],
  [
    'iframe',
    'un document imbriqué a sa PROPRE politique, et `srcdoc` transporte du balisage qu’aucun analyseur de la page ne parcourt',
  ],
]);

/**
 * Les attributs qui transforment un élément en RACINE D'ARBRE SÉPARÉ. Même raison que ci-dessus :
 * `<template shadowrootmode="open">` est du contenu VIF dans un navigateur, et un shadow root ne
 * se traverse pas depuis le document. `shadowroot` est l'ancienne orthographe de la proposition,
 * gardée parce qu'un analyseur qui l'ignore n'empêche pas un navigateur de la comprendre.
 */
const ATTRIBUTS_MASQUANTS = new Set(['shadowrootmode', 'shadowroot']);

/**
 * Analyse une page de l'artéfact — UNE fois, pour les trois contrôles.
 *
 * ⚠️ MÉMOIRE DES CONTOURNEMENTS DÉJÀ PAYÉS EN REVUE SUR CE FICHIER. Cette fonction remplace un
 * découpage d'attributs maison (`attributs()`), son contrôle de bonne formation
 * (`MOTIF_ATTRIBUTS_BIEN_FORMES`) et le motif de capture des balises (`MOTIF_SCRIPT`). Les quatre
 * pièges qu'ils avaient coûté ne disparaissent pas avec eux — ils sont désormais tenus par
 * l'analyseur, et c'est CE qu'il faut relire avant d'être tenté de revenir à un motif :
 *   · SOUS-CHAÎNE ≠ JETON (deux revues indépendantes, 2026-08-08). Chercher `id="init-theme"` dans
 *     la chaîne d'attributs acceptait une valeur FORGÉE : `<script data-x=" id=init-theme">` porte
 *     la sous-chaîne sans porter l'attribut. `getAttribute('id')` ne peut pas s'y tromper.
 *   · PREMIER GAGNANT sur attribut répété. `<script type="text/javascript" type="application/json">`
 *     est EXÉCUTÉ par le navigateur, qui retient la première occurrence ; garder la dernière le
 *     faisait passer pour inerte. L'analyseur applique nativement la règle du navigateur.
 *   · BACKTICKS. Sur `<script data-x=`type="application/json"`>`, le découpage maison croyait voir
 *     un `type` inerte au milieu d'une valeur, là où le navigateur ne voit AUCUN `type` — et exécute.
 *   · CASSE ET BLANCS. `<ScRiPt>` et `</script >` sont du script exécutable ; sans le drapeau `i`
 *     et le `\s*`, le motif ne voyait pas la balise DU TOUT — ni hachée, ni signalée.
 * Et le trou qui a motivé le lot A : `<script data-x=a"b>` — UN guillemet non refermé suffisait à
 * faire échouer la capture, donc à rendre la balise invisible au garde-fou (S-003). Les trois
 * premiers pièges ci-dessus étaient, eux, déjà REFUSÉS par l'ancien code : la refonte ne doit rien
 * relâcher, et `src/config-swa-contournements.spec.ts` porte un cas exécutable pour chacun des
 * trois (sous-chaîne, premier gagnant, backticks). Le quatrième — casse et blancs — y a lui aussi
 * ses deux cas. Cette phrase se vérifie en comptant les `it()`, pas en se souvenant de l'intention :
 * jusqu'au 2026-08-19 elle promettait « cas par cas » avec UN seul des trois au harnais, ce qui est
 * exactement le S-009 que ce fichier passe son temps à dénoncer.
 *
 * Renvoie une UNION plutôt qu'un document éventuellement vide : un `catch` qui rendrait un document
 * sans élément ferait passer une page illisible pour une page propre — fail-open exact.
 *
 * @param {string} html contenu brut du fichier de l'artéfact
 * @returns {{ document: DocumentHtml, erreur?: undefined } | { document?: undefined, erreur: string }}
 */
function analyserPage(html) {
  try {
    return { document: new JSDOM(html).window.document };
  } catch (erreur) { // NOSONAR — nom français, voir `rendre-mermaid.mjs`
    return { erreur: String(erreur instanceof Error ? erreur.message : erreur) };
  }
}

/**
 * Hache le contenu d'un élément comme le fait un navigateur.
 *
 * La normalisation des fins de ligne n'est pas cosmétique : l'analyseur HTML convertit `\r\n` et
 * `\r` en `\n` AVANT que le contenu de l'élément n'existe dans le DOM, et c'est sur ce contenu-là
 * que la CSP calcule son hachage. Un artéfact construit sous Windows avec des CRLF produirait donc
 * un hachage qui ne correspond à rien de ce que le navigateur mesure — et la CSP bloquerait le
 * script en silence. Sans effet quand les fins de ligne sont déjà des LF.
 *
 * @param {string} contenu corps textuel de l'élément, tel qu'il figure dans l'artéfact
 * @returns {string} source CSP prête à l'emploi, apostrophes comprises : `'sha256-…'`
 */
function hacher(contenu) {
  const normalise = contenu.replace(/\r\n?/g, '\n');
  return `'sha256-${createHash('sha256').update(normalise, 'utf8').digest('base64')}'`;
}

/**
 * Décrit les attributs d'un élément pour un message d'infraction : c'est ce qui NOMME le bloc
 * fautif. Sans cette description, « un bloc <style> refusé » n'apprend rien à qui doit corriger.
 * Tronqué, parce qu'un message d'erreur ne doit pas déverser trois kilo-octets (même geste que
 * `rendre-mermaid.mjs`).
 *
 * @param {ElementHtml} element
 * @returns {string} `attr="valeur" …`, ou `(aucun attribut)` si l'élément n'en porte pas
 */
function decrireAttributs(element) {
  const rendu = [...element.attributes]
    .map((a) => {
      const valeur = element.getAttribute(a.name);
      const court = (valeur ?? '').length > 40 ? `${(valeur ?? '').slice(0, 40)}…` : (valeur ?? '');
      return valeur === null ? a.name : `${a.name}="${court}"`;
    })
    .join(' ');
  return rendu || '(aucun attribut)';
}

/**
 * Parcourt TOUS les éléments d'un arbre, `<template>` compris.
 *
 * `querySelectorAll('*')` ne descend PAS dans `template.content` : le contenu d'un `<template>` vit
 * dans un `DocumentFragment` séparé. C'est exactement le trou qui a fait sortir en code 0, SANS
 * message, un `<template shadowrootmode="open"><img src=x onerror="alert(1)"></template>` — du DOM
 * vif dans un navigateur qui sait lire le shadow DOM déclaratif. Le refus nominatif de
 * `BALISES_MASQUANTES` suffirait à le rougir ; on descend quand même, pour que ce refus ne soit pas
 * le SEUL filet et que la cause imprimée nomme aussi l'attribut fautif.
 *
 * ⚠️ LA DESCENTE EST NOMINATIVE — `<template>` et rien d'autre — et ce n'est PAS de la coquetterie
 * de style : `element.content` existe aussi sur `<meta name="viewport" content="…">`, où c'est une
 * CHAÎNE. Un `if (element.content)` fait donc planter le générateur sur l'artéfact réel dès la
 * première balise `<meta>` porteuse de l'attribut — mesuré le 2026-08-19, en écrivant ce correctif.
 * Le nom d'une propriété DOM n'atteste de rien ; le nom de la BALISE, si.
 *
 * @param {DocumentHtml} racine document ou fragment à parcourir
 * @returns {Generator<ElementHtml>} chaque élément, une fois, dans l'ordre du document
 */
function* tousLesElements(racine) {
  for (const element of racine.querySelectorAll('*')) {
    yield element;
    if (element.tagName.toLowerCase() === 'template' && element.content !== undefined) {
      yield* tousLesElements(element.content);
    }
  }
}

/**
 * Aperçu tronqué du balisage d'un élément, pour que le message d'infraction NOMME la construction
 * refusée. Sans lui, deux `<noscript>` différents produiraient la même ligne et personne ne saurait
 * lequel corriger. Blancs repliés (un `<template>` peut s'étaler sur dix lignes), longueur bornée
 * (même geste que `decrireAttributs`).
 *
 * @param {ElementHtml} element
 * @returns {string} balisage replié, tronqué à 80 caractères
 */
function apercuBalisage(element) {
  const replie = (element.outerHTML ?? '').replace(/\s+/g, ' ').trim();
  return replie.length > 80 ? `${replie.slice(0, 80)}…` : replie;
}

/**
 * Ordre total stable sur les unités de code UTF-16 — indépendant de la locale et de la plateforme.
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
 * Remplace un jeton par sa liste de hachages dans la directive CSP.
 *
 * On absorbe l'espace qui PRÉCÈDE le jeton pour qu'une liste vide ne laisse pas
 * `script-src 'self' ;` — une directive que SWA sert telle quelle et que le navigateur rejette.
 *
 * @param {string} texte configuration SWA sérialisée, jetons non encore résolus
 * @param {string} jeton marqueur à remplacer (`__HACHAGES_STYLE__` ou `__HACHAGES_SCRIPT__`)
 * @param {ReadonlySet<string>} hachages sources CSP à injecter, dans un ordre quelconque
 * @returns {string} le même texte, jeton résolu
 */
function injecter(texte, jeton, hachages) {
  // Tri : `readdirSync` n'ordonne pas les pages de la même façon sous Windows et sur le runner
  // Linux. Sans lui, la même entrée produirait deux CSP différentes selon la machine (L-009).
  //
  // Comparateur EXPLICITE, et surtout PAS `localeCompare` : celui-ci ordonne selon la locale de la
  // machine, ce qui réintroduirait exactement la divergence Windows/Linux que ce tri existe pour
  // supprimer. La comparaison par `<`/`>` porte sur les unités de code UTF-16 — même ordre partout,
  // quelle que soit la locale. (Le `.sort()` nu donnait le même résultat sur des chaînes, mais par
  // conversion implicite : intention non lisible, et signalée CRITICAL par SonarCloud — S2871.)
  const liste = [...hachages].sort(comparerOctets).join(' ');
  return texte.replaceAll(` ${jeton}`, liste ? ` ${liste}` : '').replaceAll(jeton, liste);
}

/**
 * Liste récursivement les fichiers `.html` de l'artéfact.
 *
 * @param {string} dossier racine du parcours
 * @returns {string[]} chemins absolus — annotation OBLIGATOIRE : la fonction est récursive, et sans
 *   elle TypeScript ne sait pas inférer le type de retour (TS7023).
 */
function fichiersHtml(dossier) {
  /** @type {string[]} */
  const sortie = [];
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) sortie.push(...fichiersHtml(chemin));
    else if (entree.endsWith('.html')) sortie.push(chemin);
  }
  return sortie;
}

/**
 * @typedef {{ cible: string, origine: string, genre: 'rewrite' | 'redirect' }} CibleInterne
 */

/**
 * Une cible de `redirect` désigne-t-elle un FICHIER de l'artéfact ?
 *
 * Un `rewrite` sert toujours un fichier : sa cible se vérifie sans condition. Un
 * `redirect`, lui, renvoie le navigateur sur une URL — le plus souvent une route
 * du site (`/`, `/cours/`), qui n'a aucun fichier à ce chemin puisque SWA y sert
 * `index.html`. Exiger un fichier là fabriquerait un faux positif permanent. On
 * ne contrôle donc que ce qui se présente comme un chemin de fichier : dernier
 * segment porteur d'une extension, et cible interne (pas d'URL absolue).
 *
 * @param {string} cible
 * @returns {boolean}
 */
function estCheminDeFichier(cible) {
  if (!cible.startsWith('/')) return false;
  const sansQuery = cible.split('?')[0]?.split('#')[0] ?? '';
  const dernier = sansQuery.split('/').pop() ?? '';
  return /\.[a-z0-9]+$/i.test(dernier);
}

/**
 * Récolte les cibles internes déclarées par la configuration résolue —
 * `responseOverrides` ET `routes`.
 *
 * Lue en `unknown` et narrowée champ par champ à dessein : la source est un JSON
 * édité à la main, et ce script est la dernière chose qui la regarde avant Azure.
 * Une forme inattendue ne doit ni planter ni être supposée correcte — elle est
 * simplement ignorée pour la RÉCOLTE, la validité JSON restant garantie en amont.
 *
 * @param {unknown} config
 * @returns {CibleInterne[]}
 */
function ciblesInternes(config) {
  /** @type {CibleInterne[]} */
  const cibles = [];
  if (typeof config !== 'object' || config === null) return cibles;
  const racine = /** @type {Record<string, unknown>} */ (config);

  /** @param {unknown} entree @param {string} origine */
  const lire = (entree, origine) => {
    if (typeof entree !== 'object' || entree === null) return;
    const champs = /** @type {Record<string, unknown>} */ (entree);
    const rewrite = champs['rewrite'];
    if (typeof rewrite === 'string') cibles.push({ cible: rewrite, origine, genre: 'rewrite' });
    const redirect = champs['redirect'];
    if (typeof redirect === 'string' && estCheminDeFichier(redirect)) {
      cibles.push({ cible: redirect, origine, genre: 'redirect' });
    }
  };

  const overrides = racine['responseOverrides'];
  if (typeof overrides === 'object' && overrides !== null) {
    for (const [code, entree] of Object.entries(overrides)) {
      lire(entree, `responseOverrides.${code}`);
    }
  }
  const routes = racine['routes'];
  if (Array.isArray(routes)) {
    routes.forEach((entree, i) => {
      const route =
        typeof entree === 'object' && entree !== null
          ? /** @type {Record<string, unknown>} */ (entree)['route']
          : undefined;
      lire(entree, `routes[${i}]${typeof route === 'string' ? ` (${route})` : ''}`);
    });
  }
  return cibles;
}

/**
 * Interrompt la génération sur un constat bloquant.
 *
 * `@returns {never}` n'est pas décoratif : c'est lui qui apprend au compilateur que le flot ne
 * revient jamais d'ici. Les `catch { echec(…) }` ci-dessous en dépendent — sans cette annotation,
 * `source` et `pages` resteraient `string | undefined` après leur `try`, et il faudrait les tester
 * une seconde fois pour une branche qui n'existe pas.
 *
 * @param {string} message
 * @param {readonly string[]} [details] lignes de contexte, affichées en puces
 * @returns {never}
 */
function echec(message, details = []) {
  console.error(`\n✖ generer-config-swa : ${message}`);
  for (const d of details) console.error(`   · ${d}`);
  console.error('');
  process.exit(1);
}

// --- 0. Ligne de commande ------------------------------------------------------

/**
 * 🔴 CE GÉNÉRATEUR N'ACCEPTE AUCUNE OPTION, ET C'EST LE CORRECTIF DU 2026-08-20.
 *
 * Il en portait une : `--hachages-style <n>`, qui remplaçait le compte épinglé POUR CET APPEL.
 * Elle existait pour la décision E-2 (lot E d'E2-ST3), qui faisait sortir DEUX artéfacts du même
 * code — celui du déploiement (`content/` vide) et celui de la CI (bâti sur la fixture témoin,
 * donc avec une page de leçon interactive). Le harnais de fixture est RETIRÉ depuis la clôture
 * d'E3-ST1 : il n'y a plus qu'un artéfact, donc plus qu'un compte, et plus AUCUN appelant du
 * drapeau.
 *
 * POURQUOI LE SUPPRIMER PLUTÔT QUE LE LAISSER DORMIR. Le drapeau était un levier capable de
 * DESSERRER une autorisation CSP, et le garde-fou qui le surveillait ne portait que sur les
 * `run:` des workflows — pas sur le corps des scripts npm. Un
 * `"config:swa": "node …/generer-config-swa.mjs --hachages-style 20"` posé dans `package.json`
 * passait tous les gates (S-018, 6ᵉ occurrence). Supprimer le levier vaut mieux que le garder
 * sous surveillance : ce qui n'existe pas ne se rallume pas en silence.
 *
 * FAIL-CLOSED : tout argument, connu ou non, est refusé en se nommant — jamais ignoré.
 * Le compte attendu est donc TOUJOURS `NOMBRE_HACHAGES_STYLE_ATTENDU`, revu à la main, et la
 * comparaison finale reste une ÉGALITÉ EXACTE, jamais un minimum.
 *
 * @returns {void}
 */
function refuserToutArgument() {
  const args = process.argv.slice(2);
  if (args.length === 0) return;
  echec(`option inconnue : « ${String(args[0])} »`, [
    'usage : node tools/deploiement/generer-config-swa.mjs (aucune option)',
    `le compte attendu est épinglé dans le code : NOMBRE_HACHAGES_STYLE_ATTENDU = ${NOMBRE_HACHAGES_STYLE_ATTENDU}.`,
    'l’option --hachages-style a été SUPPRIMÉE le 2026-08-20 avec le harnais de fixture :',
    'c’était un levier capable de desserrer une autorisation CSP depuis le corps d’un script npm.',
  ]);
}

refuserToutArgument();

// --- 1. Vérifications préalables ---------------------------------------------
let source;
try {
  source = readFileSync(SOURCE, 'utf8');
} catch {
  echec(`source introuvable : ${relative(RACINE, SOURCE)}`);
}
// Typée en TUPLES et non laissée à l'inférence : un littéral `[[a, b], …]` s'infère en `string[][]`,
// donc `jeton` sortirait `string | undefined` de la déstructuration et ne pourrait plus être passé
// à `includes()`. Le tuple dit ce que la donnée est réellement — deux champs, tous deux présents.
/** @type {ReadonlyArray<readonly [jeton: string, directive: string]>} */
const JETONS_REQUIS = [
  [JETON_STYLE, 'style-src'],
  [JETON_SCRIPT, 'script-src'],
];
for (const [jeton, directive] of JETONS_REQUIS) {
  if (!source.includes(jeton)) {
    echec(`le jeton ${jeton} est absent de la source`, [
      `La directive ${directive} doit contenir ce jeton pour que les hachages y soient injectés.`,
    ]);
  }
}

let pages;
try {
  pages = fichiersHtml(ARTEFACT);
} catch {
  echec(`artéfact introuvable : ${relative(RACINE, ARTEFACT)}`, ['Lancer `ng build` avant ce script.']);
}
if (pages.length === 0) echec('aucune page HTML dans l’artéfact — le prerender a-t-il tourné ?');

// --- 2. Garde-fou + hachages, en une seule lecture de chaque page --------------
/** @type {string[]} */
const infractions = [];
/** @type {Set<string>} */
const hachagesStyle = new Set();
/** @type {Set<string>} */
const hachagesScript = new Set();

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const nom = relative(ARTEFACT, page);

  // --- UN SEUL PARSE PAR PAGE, TROIS CONTRÔLES -------------------------------------------------
  // Un motif regex ne voit pas ce que le navigateur voit : `<STYLE>`, `<style ng-app-id='ng'>`, un
  // attribut dont la valeur contient un `>`, un guillemet orphelin qui fait rater la balise
  // ENTIÈRE… — et une balise ratée par le garde-fou est une balise que rien ne signale (S-003).
  // jsdom est déjà une dépendance du dépôt et applique les règles d'analyse du navigateur : on
  // parse UNE fois, puis on confronte à des listes blanches nominatives. C'est la règle de
  // `.claude/rules/security.md` §4 sur les formats structurés, et le patron de `rendre-mermaid.mjs`.
  const analyse = analyserPage(html);
  if (analyse.document === undefined) {
    infractions.push(`${nom} : page HTML non analysable (${analyse.erreur}) — refusée par principe`);
    continue;
  }
  const pageDom = analyse.document;

  // --- (a) Attributs de TOUS les éléments : `style` et `on…` -----------------------------------
  // L'analyseur a déjà décidé ce qui EST un attribut : `style='…'`, `style=…` sans guillemets,
  // `STYLE=` et `onError=` arrivent ici sous leur forme normalisée (nom en minuscules), là où les
  // deux motifs remplacés n'en connaissaient qu'une écriture chacun.
  //
  // CE QUI TIENT LA COMPLÉTUDE DE CETTE BRANCHE (elle n'a pas de compte de brut, et c'est motivé
  // en tête de `BALISES_MASQUANTES`) : le parcours descend dans `template.content`, que
  // `querySelectorAll` ignore, ET toute construction capable de soustraire du contenu vif à un
  // analyseur de la page est refusée NOMINATIVEMENT. Les quatre divergences connues — shadow DOM
  // déclaratif, `<noscript>` en RAWTEXT quand le script est actif, `srcdoc`, `<template>` — sont
  // donc couvertes DEUX fois plutôt qu'une.
  /** @type {string[]} */
  const porteursDeStyle = [];
  for (const element of tousLesElements(pageDom)) {
    const balise = element.tagName.toLowerCase();
    const raisonMasquante = BALISES_MASQUANTES.get(balise);
    if (raisonMasquante !== undefined) {
      infractions.push(
        `${nom} : construction « <${balise}> » refusée — ${raisonMasquante} ; ce que le garde-fou ne parcourt pas, il ne peut pas le refuser : ${apercuBalisage(element)}`,
      );
    }
    for (const attribut of element.attributes) {
      const nomAttribut = attribut.name.toLowerCase();
      if (nomAttribut === 'style') porteursDeStyle.push(`<${balise}>`);
      else if (ATTRIBUTS_MASQUANTS.has(nomAttribut)) {
        infractions.push(
          `${nom} : attribut « ${nomAttribut} » sur <${balise}> — il ouvre un arbre SÉPARÉ (shadow DOM déclaratif) que rien ne parcourt depuis le document`,
        );
      }
      // Tout nom qui COMMENCE par `on` : la liste des gestionnaires s'allonge à chaque version de
      // la plateforme, et un nom inconnu qui en a la forme se refuse plutôt que se suppose inoffensif.
      else if (nomAttribut.startsWith('on')) {
        infractions.push(
          `${nom} : gestionnaire d’événement inline « ${nomAttribut} » sur <${balise}> — bloqué par script-src`,
        );
      }
    }
  }
  if (porteursDeStyle.length) {
    const cites = porteursDeStyle.slice(0, 5).join(' ');
    const reste = porteursDeStyle.length > 5 ? ' …' : '';
    infractions.push(
      `${nom} : ${porteursDeStyle.length} attribut(s) style inline (${cites}${reste}) — bloqué(s) par style-src (les hachages ne couvrent pas les attributs)`,
    );
  }

  // --- (b) Balises <script> --------------------------------------------------------------------
  const scripts = [...pageDom.querySelectorAll('script')];

  // CONTRÔLE DE CONSERVATION (S-003), jumeau de celui des blocs <style> plus bas : « je refuse tout
  // ce que je vois » ne protège rien si voir peut échouer en silence. Même ancrage `<script` +
  // délimiteur de nom de balise (blanc, `/` ou `>`) : ce sont exactement les caractères qui
  // terminent un nom de balise pour le tokeniseur HTML, donc aucune vraie balise ne peut y échapper
  // (pas de fail-open) alors qu'un `<script-exemple>` — nom d'élément personnalisé parfaitement
  // légal dans une leçon — en sort. Un écart n'est pas forcément dangereux : il est NON COMPRIS.
  //
  // ⚠️ CE MESSAGE ACCUSE LA CSP POUR DES CAUSES QUI SONT SOUVENT ÉDITORIALES — les connaître évite
  // la pression d'assouplissement décrite en S-011. Écarts possibles, exactement les mêmes que ceux
  // recensés pour le jumeau `<style>` plus bas :
  //   · un `<script` dans un commentaire HTML ;
  //   · un `<script` dans un `<template>` inerte ;
  //   · un `<script` dans la chaîne d'un script ;
  //   · un `<script ` dans une VALEUR D'ATTRIBUT — et celui-là n'est PAS théorique ici : la
  //     sérialisation HTML n'échappe pas `<` dans une valeur d'attribut, et du TEXTE D'AUTEUR
  //     atteint bien des attributs (`bloc.titreAccessible`, `etape.nom`, `module.nomAccessible`).
  //     Charge mesurée : `<p aria-label="diagramme : injection d'un <script> dans le DOM">` donne 1
  //     occurrence brute pour 0 élément, donc code 1 sur un dépôt SAIN. Faux positif LÉGITIME et
  //     conservé — rien ne garantit que tous les analyseurs lisent cette valeur comme celui-ci.
  // 🔴 LA PARADE EST ÉDITORIALE, JAMAIS UN ASSOUPLISSEMENT DU COMPTE : on écrit « la balise script »
  // ou `‹script›` dans la leçon. Relâcher ce compte pour publier, c'est précisément la pression
  // S-011, sur un site qui enseigne la CSP.
  const occurrencesScript = (html.match(/<script[\s>/]/gi) ?? []).length;
  if (occurrencesScript !== scripts.length) {
    infractions.push(
      `${nom} : ${occurrencesScript} occurrence(s) brute(s) de « <script » pour ${scripts.length} élément(s) <script> vu(s) par l’analyseur — écart refusé (le garde-fou doit prouver qu’il a TOUT vu)`,
    );
  }

  let scriptsAutorises = 0;
  for (const script of scripts) {
    const corps = script.textContent ?? '';
    const type = (script.getAttribute('type') ?? '').trim().toLowerCase();
    if (!corps.trim() || script.getAttribute('src') !== null || TYPES_INERTES.has(type)) continue;

    // Le script d'initialisation du thème est le SEUL inline exécutable admis. Deux conditions
    // CUMULATIVES : le bon `id` ET le contenu exact déjà revu. L'`id` seul ne suffit pas — il est
    // choisi par celui qui produit l'artéfact, donc il n'atteste de rien.
    if (script.getAttribute('id') === ID_SCRIPT_AUTORISE) {
      // Compté ici, avant la comparaison de hachage : un script présent mais modifié doit produire
      // le message « il a changé », pas « il est absent ».
      scriptsAutorises += 1;
      // `textContent` est le corps tel que l'analyseur l'a construit — fins de ligne déjà
      // normalisées, comme côté navigateur. C'est le texte que la CSP hache, et le hachage épinglé
      // ci-dessus n'a pas bougé en passant de la sous-chaîne brute à `textContent` (assertionné par
      // `src/config-swa-contournements.spec.ts`, pas supposé).
      const hachage = hacher(corps);
      if (hachage === HACHAGE_SCRIPT_ATTENDU) hachagesScript.add(hachage);
      else infractions.push(`${nom} : le script « ${ID_SCRIPT_AUTORISE} » a changé — ${hachage}, attendu ${HACHAGE_SCRIPT_ATTENDU}`);
    } else {
      infractions.push(`${nom} : script inline exécutable non autorisé (${corps.trim().length} o) — bloqué par script-src`);
    }
  }

  // Absent, la page flashe au chargement pour un visiteur qui a épinglé un thème ; en double, le
  // « script inline unique » d'E1-ST1-C n'est plus unique. Les deux sont des régressions muettes.
  if (scriptsAutorises !== 1) {
    infractions.push(
      `${nom} : ${scriptsAutorises} script(s) « ${ID_SCRIPT_AUTORISE} » — il en faut exactement 1 (anti-flash de thème)`,
    );
  }

  // --- (c) Blocs <style> : confrontés à une provenance nominative ------------------------------
  const blocsStyle = [...pageDom.querySelectorAll('style')];

  // CONTRÔLE DE CONSERVATION (S-003) : « je refuse tout ce que je vois » ne protège rien si voir
  // peut échouer en silence. On compte les occurrences BRUTES de la structure ciblée et on exige
  // l'égalité stricte avec ce que l'analyseur a rendu. Un écart n'est pas forcément dangereux : il
  // est simplement NON COMPRIS, donc refusé en se nommant plutôt qu'ignoré.
  //
  // ⚠️ CE MESSAGE ACCUSE LA CSP POUR DES CAUSES QUI SONT SOUVENT ÉDITORIALES — les connaître évite
  // la pression d'assouplissement décrite en S-011. Écarts possibles, tous reproduits :
  //   · un `<style` dans un commentaire HTML ;
  //   · un `<style` dans un `<template>` inerte ;
  //   · un `<style` dans la chaîne d'un script ;
  //   · un `<style ` dans une VALEUR D'ATTRIBUT (`<p data-exemple="<style >">`) : 1 brute, 0
  //     élément. Faux positif LÉGITIME et conservé — un `<style` en valeur d'attribut mérite un
  //     regard, parce que rien ne garantit que tous les analyseurs le lisent comme celui-ci.
  // Un cinquième cas existait et a été supprimé À LA RACINE : un élément dont le NOM commence par
  // `style` (`<style-guide>`, un composant web parfaitement légal dans une leçon) comptait comme
  // occurrence brute et rendait la construction rouge. D'où l'ancrage `<style` + délimiteur de nom
  // de balise ci-dessous — whitespace, `/` ou `>` sont exactement les caractères qui terminent un
  // nom de balise pour le tokeniseur HTML, donc aucun vrai `<style>` ne peut échapper au compte
  // (pas de fail-open) alors que `<style-guide>` en sort.
  const occurrencesBrutes = (html.match(/<style[\s>/]/gi) ?? []).length;
  if (occurrencesBrutes !== blocsStyle.length) {
    infractions.push(
      `${nom} : ${occurrencesBrutes} occurrence(s) brute(s) de « <style » pour ${blocsStyle.length} élément(s) <style> vu(s) par l’analyseur — écart refusé (le garde-fou doit prouver qu’il a TOUT vu)`,
    );
  }

  for (const bloc of blocsStyle) {
    const noms = [...bloc.attributes].map((a) => a.name.toLowerCase());
    const provenanceAngular =
      noms.length === 1 &&
      noms[0] === ATTRIBUT_PROVENANCE_STYLE &&
      bloc.getAttribute(ATTRIBUT_PROVENANCE_STYLE) === VALEUR_PROVENANCE_STYLE;
    if (!provenanceAngular) {
      infractions.push(
        `${nom} : bloc <style ${decrireAttributs(bloc)}> de provenance non reconnue — seul « <style ${ATTRIBUT_PROVENANCE_STYLE}="${VALEUR_PROVENANCE_STYLE}"> », sans autre attribut, est haché ; tout autre bloc est bloqué par style-src`,
      );
      continue;
    }
    // PLACE, en plus de la provenance : le marqueur se pose n'importe où, et deux places ont été
    // mesurées comme acceptées à tort — `<svg><style ng-app-id="ng">` et surtout
    // `<noscript><style ng-app-id="ng">`, que le navigateur ne voit PAS comme un élément quand le
    // script est actif alors que son contenu obtenait un hachage global (S-001).
    const parent = (bloc.parentElement?.tagName ?? '').toLowerCase();
    if (!PARENTS_STYLE_ADMIS.has(parent)) {
      infractions.push(
        `${nom} : bloc <style ${decrireAttributs(bloc)}> placé dans <${parent || '(racine)'}> — un bloc haché doit être enfant direct de ${[...PARENTS_STYLE_ADMIS].map((p) => `<${p}>`).join(' ou ')} ; ailleurs, ce que la CSP autorise n’est pas ce que le navigateur rend`,
      );
      continue;
    }
    // Le contenu, lui, reste DÉRIVÉ de l'artéfact — écart assumé à S-002, déclaré en tête de
    // fichier. `textContent` est le texte tel que l'analyseur l'a construit, donc fins de ligne
    // déjà normalisées ; `hacher` renormalise sans effet, et c'est bien ce texte-là que la CSP
    // hache côté navigateur.
    hachagesStyle.add(hacher(bloc.textContent ?? ''));
  }
}

if (infractions.length) {
  const aChange = infractions.some((i) => i.includes('a changé'));
  echec('la sortie prerendue est incompatible avec la CSP stricte', [
    ...infractions.slice(0, 15),
    ...(infractions.length > 15 ? [`… et ${infractions.length - 15} autre(s)`] : []),
    ...(aChange
      ? [
          'Le script inline a été modifié : faire relire le nouveau contenu par `security-reviewer`,',
          'PUIS reporter le hachage ci-dessus dans HACHAGE_SCRIPT_ATTENDU. Jamais l’inverse.',
        ]
      : ['Piste la plus fréquente : `optimization.styles.inlineCritical` doit rester à false (addendum S-02).']),
  ]);
}

// Un hachage par page servie signifierait que la construction sérialise le script différemment
// d'une page à l'autre : `script-src` gonflerait à chaque nouvelle route, et le premier écart
// passerait inaperçu. On exige donc UN hachage distinct, pas « au moins un ».
if (hachagesScript.size !== 1) {
  echec(`${hachagesScript.size} version(s) distincte(s) du script « ${ID_SCRIPT_AUTORISE} » dans l’artéfact`, [
    'Les pages prerendues doivent toutes porter le même script inline, octet pour octet.',
    'Vérifier que le script vient bien de `src/index.html` et qu’aucun composant n’en injecte un.',
  ]);
}

// MIROIR DU CONTRÔLE CI-DESSUS, POUR `style-src` (amendement de la décision E-3, 2026-08-18).
// La reconnaissance de provenance ne borne qu'un MARQUEUR, et le producteur légitime le porte
// lui-même : sans ce compte épinglé, le `.scss` d'un composant neuf ajoute son hachage à la CSP
// sans qu'aucun humain ne le voie — mesuré, 9 → 10, code 0. Le compte, lui, ne bouge pas quand un
// `.scss` existant est édité : le rouge arrive une fois par composant porteur de styles, et c'est
// exactement la revue qu'on veut.
if (hachagesStyle.size !== NOMBRE_HACHAGES_STYLE_ATTENDU) {
  echec(
    `${hachagesStyle.size} hachage(s) de style distinct(s) dans l’artéfact — ${NOMBRE_HACHAGES_STYLE_ATTENDU} attendu(s)`,
    [
      'Un bloc <style> de plus (ou de moins) CHANGE la permission style-src réellement servie.',
      'Faire relire l’artéfact et la nouvelle directive par `security-reviewer`,',
      'PUIS reporter le nouveau compte. Jamais l’inverse.',
      // TROIS endroits depuis le retrait du harnais : le compte est recopié en dur là où il doit
      // être RELU. Sans ce rappel, la moitié de la mise à jour se fait et un autre gate rougit
      // plus tard sur une cause qui semblera étrangère.
      'Où : NOMBRE_HACHAGES_STYLE_ATTENDU ici, son jumeau recopié dans',
      '`src/config-swa-provenance-style.spec.ts`, et BLOCS_STYLE_PAGE_LECON de',
      '`e2e/simulation-sous-csp.spec.ts` (qui compte les blocs de la seule page de leçon).',
      'Attendu une fois par composant neuf porteur de styles, et une fois par leçon qui',
      'introduit un composant que les précédentes n’avaient pas.',
    ],
  );
}

// --- 3. Écriture de l'artéfact -------------------------------------------------
let resolu = injecter(source, JETON_STYLE, hachagesStyle);
resolu = injecter(resolu, JETON_SCRIPT, hachagesScript);
const config = /** @type {unknown} */ (JSON.parse(resolu)); // garde-fou : la substitution doit laisser un JSON valide

// --- 3 bis. Les cibles internes existent-elles vraiment ? -----------------------
// FAIL-OPEN CORRIGÉ : jusqu'ici, `responseOverrides.404` pouvait pointer vers un
// fichier absent de l'artéfact sans qu'aucun gate ne rougisse. SWA aurait alors
// servi SA page d'erreur de marque à la place de la nôtre — un changement visible
// en production, invisible en CI. La route `404` d'`app.routes.ts` paraît redondante
// à côté du `**` : la retirer aurait suffi à casser la 404 du site en silence.
// Ce contrôle transforme ce silence en code 1, nommant la cible manquante.
const cibles = ciblesInternes(config);
/** @type {string[]} */
const ciblesCassees = [];
for (const { cible, origine, genre } of cibles) {
  const relatif = (cible.split('?')[0]?.split('#')[0] ?? '').replace(/^\/+/, '');
  const chemin = resolve(ARTEFACT, relatif);
  // La cible doit rester DANS l'artéfact : un `../` qui sortirait du dossier servi
  // n'est pas seulement introuvable pour SWA, c'est une cible à refuser en soi.
  const dedans = chemin === ARTEFACT || chemin.startsWith(ARTEFACT + sep);
  let estFichier = false;
  if (dedans) {
    try {
      estFichier = statSync(chemin).isFile();
    } catch {
      estFichier = false;
    }
  }
  if (!estFichier) {
    ciblesCassees.push(
      `${origine} : ${genre} « ${cible} » → aucun fichier ${relative(RACINE, chemin)} dans l’artéfact`,
    );
  }
}
if (ciblesCassees.length) {
  echec('une cible de la configuration SWA ne correspond à aucun fichier de l’artéfact', [
    ...ciblesCassees,
    'SWA servirait sa propre page à la place de la nôtre, sans qu’aucun gate ne rougisse.',
    'Vérifier que la route qui produit ce fichier est bien prerendue (app.routes.server.ts).',
  ]);
}

writeFileSync(join(ARTEFACT, 'staticwebapp.config.json'), resolu);

console.log(`✔ staticwebapp.config.json généré dans ${relative(RACINE, ARTEFACT)}`);
console.log(`  ${pages.length} page(s) inspectée(s)`);
console.log(`  ${cibles.length} cible(s) interne(s) vérifiée(s) présente(s) dans l’artéfact`);
console.log(
  `  ${hachagesStyle.size} hachage(s) de style distinct(s) (provenance ${ATTRIBUT_PROVENANCE_STYLE}="${VALEUR_PROVENANCE_STYLE}", ${NOMBRE_HACHAGES_STYLE_ATTENDU} attendu(s)), ${hachagesScript.size} de script`,
);
// L'ancienne note « aucun bloc <style> inline — style-src reste à 'self' » a été retirée : le
// compte étant désormais épinglé à NOMBRE_HACHAGES_STYLE_ATTENDU, arriver ici avec 0 hachage est
// impossible (le typage l'a d'ailleurs signalé, TS2367). Un artéfact sans bloc de style est
// aujourd'hui une anomalie qui doit rougir, pas une note de bas de page.
