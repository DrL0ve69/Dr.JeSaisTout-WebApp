// =============================================================================
// Le garde-fou CSP voit-il ce qu'un NAVIGATEUR voit ? (dette sécurité pré-E3-ST1, lot A)
// -----------------------------------------------------------------------------
// POURQUOI CE FICHIER EXISTE.
// Jusqu'au 2026-08-19, `tools/deploiement/generer-config-swa.mjs` analysait les
// blocs `<style>` (jsdom) mais appariait les balises `<script>` et les attributs
// par MOTIF. Les motifs avaient trois trous, et le pire d'entre eux ne produisait
// pas un refus mal formulé : il produisait un SILENCE.
//   · `<script data-x=a"b>alert(1)</script>` — UN guillemet non refermé (nombre
//     IMPAIR) faisait échouer la capture, donc la balise n'était NI hachée NI
//     signalée, et la construction sortait VERTE. Le navigateur, lui, garde le `"`
//     dans la valeur non citée, ferme la balise au premier `>` et exécute le corps.
//     C'est S-003, mot pour mot.
//   · ` style="` ne connaissait qu'une des quatre écritures de l'attribut
//     (`style='…'`, `style=…` nu, `STYLE=` lui échappaient) ;
//   · ` (on[a-z]+)="` imposait le guillemet DOUBLE et la minuscule : `onError='…'`
//     passait deux fois.
// Le lot A remplace les trois par UN parse jsdom par page. Ce fichier est ce qui
// prouve que le remplacement ferme bien les trous — et il est exécuté par
// `npm test`, donc par G-test des deux workflows. Un garde-fou qui ne vit que dans
// un harnais que personne n'appelle est une intention, pas un gate : c'est
// exactement ce que S-003 dénonce, et le piège où les fixtures d'E2-ST1 étaient
// tombées (L-019, axe CÂBLAGE).
//
// CE QUE CHAQUE CAS PÈSE — mesuré le 2026-08-19 en rejouant CHAQUE charge contre le
// générateur AVANT d'écrire son test, parce qu'un cas « vert pour la mauvaise raison »
// ne prouve rien (le lot A a failli livrer un cas vert pour rien : `<script data-x=a"b">`,
// guillemets PAIRS, était en fait déjà capturé par l'ancien motif) :
//   · TROIS ÉTAIENT SILENCIEUX avant le lot A et sont désormais refusés : le
//     guillemet non refermé, `style='…'`, `onError='…'` (0 capture chacun pour
//     l'ancien motif) ;
//   · CINQ SONT SORTIS EN CODE 0, SANS MESSAGE, SUR LE LOT A LUI-MÊME — la
//     régression trouvée par deux revues indépendantes le 2026-08-19, et rejouée
//     ici telle quelle : `querySelectorAll('*')` ne descend PAS dans
//     `template.content`, et rien ne parcourt un `<noscript>` lu en RAWTEXT par un
//     navigateur à script actif ni le `srcdoc` d'une `<iframe>`. Quatre de ces cinq
//     charges s'EXÉCUTENT ou s'appliquent dans un vrai navigateur ; la branche
//     attributs était la seule des trois à n'avoir aucun filet de complétude ;
//   · SIX ÉTAIENT DÉJÀ REFUSÉS et doivent le rester — backticks, `<ScRiPt>`,
//     `</script >`, sous-chaîne ≠ jeton, premier gagnant sur `type` répété, et le
//     commentaire HTML. Ce sont des cas de NON-RÉGRESSION : ce fichier a déjà été
//     contourné deux fois en revue, on ne rachète pas un trou en en fermant un autre.
//     ⚠️ Le commentaire HTML est un cas MIXTE et c'est mesuré : l'ancien `MOTIF_SCRIPT`
//     le capturait — donc il était refusé — mais PAR ACCIDENT et sur la MAUVAISE
//     CAUSE (« script inline exécutable non autorisé (8 o) », alors qu'il n'y a là
//     aucun script). Le refus n'est pas neuf ; le contrôle de CONSERVATION qui le
//     nomme correctement, lui, l'est.
//
// LES DEUX MOITIÉS DE LA PINCE, dont aucune ne suffit seule :
//   1. Les quatorze contournements sont REFUSÉS, chacun sur une cause qui NOMME la
//      page et l'élément. Seul, ce constat est compatible avec un outil qui refuserait
//      tout — et un faux positif ici, c'est une construction rouge sur un dépôt
//      sain, donc la pression d'assouplissement décrite en S-011.
//   2. L'artéfact sain est ACCEPTÉ, avec le bon nombre de hachages ET le hachage
//      ÉPINGLÉ du script anti-flash inchangé. Cette dernière assertion n'est pas
//      décorative : le corps haché est passé de la sous-chaîne brute capturée par
//      le motif à `textContent`. Les deux sont identiques sur une balise bien
//      formée — on le MESURE au lieu de le croire.
//
// LES SIX PAYLOADS DE SCRIPT ONT DES LONGUEURS DISTINCTES (8, 9, 10, 11, 12, 13 o) À
// DESSEIN : le message d'infraction cite le nombre d'octets du corps, donc chaque
// cas porte une empreinte que les cinq autres ne peuvent pas produire par
// accident. Sans ça, six cas partageraient la même cause et l'un d'eux pourrait
// être vert pour la mauvaise raison. Même geste pour les deux `<noscript>` : leurs
// APERÇUS de balisage diffèrent dans les 80 premiers caractères, donc l'assertion
// distingue bien les deux charges au lieu de se contenter du nom de la construction.
//
// POURQUOI PAR PROCESSUS FILS, SUR UN ARTÉFACT JETABLE. Même raison que
// `src/config-swa-provenance-style.spec.ts` : le générateur est un `.mjs` du
// TROISIÈME programme TypeScript (`tsconfig.tools.json`), et `npm test` ne
// construit pas l'application. On exécute donc la ligne de commande RÉELLE dans un
// dossier temporaire fabriqué ici, jamais sur `dist/`.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const GENERATEUR = resolve('tools/deploiement/generer-config-swa.mjs');

/** La VRAIE source de configuration — une copie inventée ici ne verrait pas disparaître son jeton. */
const SOURCE_CONFIG = readFileSync(resolve('config/staticwebapp.config.source.json'), 'utf8');

/**
 * Le script anti-flash, repris VERBATIM de `src/index.html`, fins de ligne normalisées en LF.
 * La normalisation n'est pas cosmétique (L-015) : ce poste écrit en CRLF, et les pages fabriquées
 * ici sont assemblées avec des LF explicites — un mélange rendrait toute assertion multi-ligne
 * dépendante de la plateforme. Le hachage, lui, est insensible aux fins de ligne (le générateur
 * les normalise avant de hacher), donc ce geste ne masque rien.
 */
const SCRIPT_THEME = (() => {
  const index = readFileSync(resolve('src/index.html'), 'utf8');
  const trouve = /<script id="init-theme">[\s\S]*?<\/script>/.exec(index)?.[0];
  if (trouve === undefined)
    throw new Error('script « init-theme » introuvable dans src/index.html');
  return trouve.replace(/\r\n?/g, '\n');
})();

/**
 * LES DEUX AUTRES `<script>` QUE PORTE UNE VRAIE PAGE PRERENDUE, dans leur forme réelle — relevés
 * le 2026-08-19 sur `dist/dr-je-sais-tout/browser/index.html`. Ils ne sont pas décoratifs : sans
 * eux la fixture restait plus PAUVRE que le réel — exactement le défaut décrit sous `page()` pour
 * le `<meta content>` — et les deux échappements de la boucle des scripts du générateur n'étaient
 * exercés par AUCUN `it()`. Ce que chacun exerce, MESURÉ et non supposé :
 *   · le bundle `type="module"` est SANS CORPS dans l'artéfact réel : il sort par `!corps.trim()`,
 *     la PREMIÈRE branche de la garde, jamais par `getAttribute('src') !== null`. Constat à garder :
 *     la branche `src` n'a pas d'exercice ici parce qu'elle n'en a pas davantage en production —
 *     aucun `<script src>` du site ne porte de corps. Lui en inventer un rendrait la fixture plus
 *     RICHE que le réel, ce qui n'est pas le défaut qu'on corrige ;
 *   · `ng-state` porte, lui, un corps NON VIDE : c'est le seul des trois scripts d'une page réelle
 *     qui atteigne `TYPES_INERTES`, donc le seul qui exerce cette branche.
 */
const SCRIPT_MODULE = '<script src="main-7IIB2T56.js" type="module"></script>';
const SCRIPT_ETAT =
  '<script id="ng-state" type="application/json">{"__nghData__":[{"t":{"5":"t0"}}]}</script>';

/**
 * Le hachage du script anti-flash, RECOPIÉ EN DUR depuis `generer-config-swa.mjs` — jamais importé
 * de l'outil qu'il vérifie (L-012). C'est la sentinelle du seul changement de comportement du lot A
 * qui pourrait passer inaperçu : le corps haché vient désormais de `textContent`.
 */
const HACHAGE_SCRIPT_ATTENDU = 'sha256-hIxkAZ0KC2VIDD2cWnG1AoQYrZGTH4AxI7h8JYMUs8M=';

/** Le compte de hachages de style épinglé par le générateur — en dur ici aussi, même raison. */
// 10 → 13 le 2026-08-20 : ce n’est pas une permission élargie mais la TAILLE DE LA FIXTURE de ce
// fichier — elle doit égaler le compte que le générateur épingle par défaut, sinon un artéfact
// synthétique SAIN se ferait refuser et le contrôle positif ne prouverait plus rien.
const NOMBRE_HACHAGES_ATTENDU = 13;

/** Autant de blocs Angular conformes, tous de contenus DISTINCTS — le générateur dédoublonne. */
const BLOCS_CONFORMES = Array.from(
  { length: NOMBRE_HACHAGES_ATTENDU },
  (_, i) => `<style ng-app-id="ng">.bloc-${i}{color:red}</style>`,
);

/** jsdom démarre, deux processus Node se lancent par cas : large, mais borné. */
const DELAI = 60_000;

const BASE = mkdtempSync(join(tmpdir(), 'swa-contournements-'));

/**
 * Une page prerendue plausible : le script anti-flash et les blocs de style conformes en `<head>`,
 * le fragment à l'essai en `<body>`. Assemblée en LF explicites.
 *
 * ⚠️ LE `<meta name="viewport" content="…">` N'EST PAS DÉCORATIF — il est ici en tant que
 * RÉGRESSION, payée en écrivant le correctif de la régression du lot A (2026-08-19). Le parcours
 * qui descend dans `template.content` descendait d'abord sur un simple `if (element.content)` :
 * or `content` est une CHAÎNE sur `<meta content="…">`, et le générateur plantait sur l'artéfact
 * réel dès la première balise `<meta>` porteuse de l'attribut. Toutes les pages fabriquées ici
 * n'avaient que `<meta charset>`, qui ne porte pas `content` — la suite était donc VERTE sur un
 * générateur qui ne pouvait plus tourner en production. C'est L-019 en miroir : ce n'est pas le
 * test qui manquait, c'est la fixture qui était plus pauvre que le réel.
 *
 * ⚠️ MÊME RAISON pour les deux `<script>` de bas de page et pour les marqueurs d'hydratation
 * (`<!--nghm-->`, `ngh="…"`) : la fixture n'en portait aucun alors que TOUTE page réelle les porte.
 * Trois scripts par page, donc, et non un — ce qui fixe aussi les comptes du contrôle de
 * conservation cité par le dernier cas de `CONTOURNEMENTS` (4 occurrences brutes pour 3 éléments
 * dès qu'un `<script` supplémentaire est masqué dans le fragment).
 */
function page(fragment: string, blocsStyle: readonly string[]): string {
  return [
    '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1"><title>Essai</title>',
    SCRIPT_THEME,
    ...blocsStyle,
    '</head><body><!--nghm-->',
    '<app-root ngh="0">',
    fragment,
    '</app-root>',
    SCRIPT_MODULE,
    SCRIPT_ETAT,
    '</body></html>',
  ].join('\n');
}

/**
 * Fabrique un artéfact jetable conforme au défaut, n'y injecte QUE le fragment à l'essai, et y lance
 * la ligne de commande réelle. `404/index.html` existe parce que `responseOverrides.404` le nomme et
 * que le générateur vérifie ses cibles ; il ne porte aucun bloc `<style>`, pour que le compte de
 * hachages ne dépende que de `index.html`. Corollaire : un rouge ne peut venir que du fragment.
 */
function lancer(fragment: string): { sortie: string; code: number; config: string } {
  const racine = mkdtempSync(join(BASE, 'artefact-'));
  const navigateur = join(racine, 'dist', 'dr-je-sais-tout', 'browser');
  mkdirSync(join(racine, 'config'), { recursive: true });
  mkdirSync(join(navigateur, '404'), { recursive: true });
  writeFileSync(join(racine, 'config', 'staticwebapp.config.source.json'), SOURCE_CONFIG);
  writeFileSync(join(navigateur, 'index.html'), page(fragment, BLOCS_CONFORMES));
  writeFileSync(join(navigateur, '404', 'index.html'), page('<p>404</p>', []));

  let sortie: string;
  let code: number;
  try {
    sortie = execFileSync(process.execPath, [GENERATEUR], {
      cwd: racine,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    code = 0;
  } catch (erreur) {
    const detail = erreur as { status?: number; stdout?: string; stderr?: string };
    sortie = `${detail.stdout ?? ''}${detail.stderr ?? ''}`;
    code = detail.status ?? -1;
  }

  let config: string;
  try {
    config = readFileSync(join(navigateur, 'staticwebapp.config.json'), 'utf8');
  } catch {
    config = '';
  }
  return { sortie, code, config };
}

/**
 * Un cas = un contournement, une empreinte de cause. Le fragment attendu est écrit ICI, en dur,
 * jamais importé de l'outil qu'il vérifie (L-012), et il évite d'apparier les espaces des
 * guillemets français — la casse d'espace n'est pas ce qu'on teste.
 *
 * `causes` est une LISTE et non une seule expression depuis le correctif de la régression du lot A :
 * les charges à `<template>` doivent prouver DEUX choses à la fois — que la construction est
 * refusée nominativement, ET que le parcours descend bien dans `template.content`. Une seule des
 * deux serait compatible avec un correctif qui n'aurait posé que la moitié du filet.
 */
const CONTOURNEMENTS: readonly { nom: string; fragment: string; causes: readonly RegExp[] }[] = [
  {
    // 🔴 LE SEUL CAS QUI ÉTAIT SILENCIEUX, ET CELUI QUI A OUVERT LE LOT A. Le guillemet NON REFERMÉ
    // (nombre impair) faisait échouer la capture du motif, qui ne savait alterner que des runs
    // cités complets : ni hachage, ni infraction, construction VERTE. Mesuré le 2026-08-19 —
    // ancien motif 0 capture, jsdom 1 élément dont la valeur d'attribut vaut `a"b` et le corps
    // `alert(1)`. C'est exactement le navigateur qui exécuterait ce corps.
    // ⚠️ Le piège en écrivant ce cas : `data-x=a"b"` (guillemets PAIRS) est vu par l'ancien motif —
    // un test bâti dessus serait vert sans rien prouver du trou.
    nom: 'un guillemet NON REFERMÉ, qui rendait la balise INVISIBLE au motif',
    fragment: '<script data-x=a"b>alert(1)</script>',
    causes: [/script inline exécutable non autorisé \(8 o\)/],
  },
  {
    // NON-RÉGRESSION, pas un trou : l'ancien code refusait déjà ce cas, mais par sa voie
    // « attributs non analysables ». Le découpage maison croyait voir un `type` inerte au milieu
    // d'une valeur à backticks, là où le navigateur n'en voit AUCUN. La refonte doit continuer de
    // le refuser — et le fait désormais en NOMMANT ce que c'est : un script inline exécutable.
    nom: 'un faux `type` inerte caché dans une valeur à backticks (refus déjà acquis, à ne pas relâcher)',
    fragment: '<script data-x=`type="application/json"`>alert(11)</script>',
    causes: [/script inline exécutable non autorisé \(9 o\)/],
  },
  {
    // NON-RÉGRESSION : l'ancien motif portait déjà le drapeau `i`. Le cas reste pour que le jour où
    // quelqu'un « simplifierait » l'analyse, la casse mêlée rougisse encore.
    nom: 'une balise <ScRiPt> en casse mêlée (refus déjà acquis, à ne pas relâcher)',
    fragment: '<ScRiPt>alert(111)</ScRiPt>',
    causes: [/script inline exécutable non autorisé \(10 o\)/],
  },
  {
    // NON-RÉGRESSION : l'ancien motif portait déjà `</script\s*>`.
    nom: 'une balise fermante « </script > » porteuse d’un blanc (refus déjà acquis, à ne pas relâcher)',
    fragment: '<script>alert(1111)</script >',
    causes: [/script inline exécutable non autorisé \(11 o\)/],
  },
  {
    // Trou n°2 : ` style="` ne voyait que le guillemet double.
    nom: 'un attribut style à guillemets SIMPLES',
    fragment: "<p style='color:red'>rouge</p>",
    causes: [/1 attribut\(s\) style inline \(<p>\)/],
  },
  {
    // Trou n°3, deux fois troué dans six caractères : guillemet simple ET majuscule.
    nom: 'un gestionnaire « onError= » à guillemets simples et à majuscule',
    fragment: '<img alt="" src="x" onError=\'alert(1)\'>',
    causes: [/gestionnaire d’événement inline .*onerror.* sur <img>/],
  },
  {
    // 🔴 LA RÉGRESSION DU LOT A, 1/5 — et la charge la plus vive des cinq. `querySelectorAll('*')`
    // ne descend PAS dans `template.content` : le contenu d'un `<template>` vit dans un
    // `DocumentFragment` séparé. Un navigateur qui lit le shadow DOM déclaratif, lui, en fait du
    // DOM VIF et exécute le `onerror`. Rejoué le 2026-08-19 contre le générateur d'avant le
    // correctif : code 0, aucun message.
    // DEUX causes exigées : le refus NOMINATIF de la construction, et la descente qui trouve
    // l'attribut. Une seule des deux serait compatible avec un demi-correctif.
    nom: 'un gestionnaire caché dans un <template shadowrootmode> (invisible à querySelectorAll)',
    fragment: '<template shadowrootmode="open"><img src=x onerror="alert(1)"></template>',
    causes: [
      /construction .{1,3}<template.{1,3} refusée/,
      /attribut .{1,3}shadowrootmode.{1,3} sur <template>/,
      /gestionnaire d’événement inline .{1,3}onerror.{1,3} sur <img>/,
    ],
  },
  {
    // 🔴 LA RÉGRESSION DU LOT A, 2/5 — le jumeau `style` du cas précédent. La branche `style` et la
    // branche `on…` partagent le même parcours : un correctif qui n'aurait descendu que pour l'une
    // resterait vert sur l'autre.
    nom: 'un style inline caché dans un <template shadowrootmode>',
    fragment: '<template shadowrootmode="open"><img src=x style="color:red"></template>',
    causes: [
      /construction .{1,3}<template.{1,3} refusée/,
      /attribut .{1,3}shadowrootmode.{1,3} sur <template>/,
      /1 attribut\(s\) style inline \(<img>\)/,
    ],
  },
  {
    // 🔴 LA RÉGRESSION DU LOT A, 3/5 — DIVERGENCE D'ANALYSEURS PURE, famille S-001. jsdom analyse
    // avec le script DÉSACTIVÉ : il voit un `<div title="…">` bien sage, dont la valeur d'attribut
    // contient tout le reste. Un navigateur à script ACTIF bascule `<noscript>` en RAWTEXT — le
    // `</noscript>` glissé dans la valeur ferme l'élément, et l'`<img>` devient RÉELLE puis
    // s'exécute. Aucun `on…` n'atteint donc notre parcours : d'où le refus de la CONSTRUCTION.
    // La cause cite l'APERÇU du balisage, ce qui distingue cette charge de sa jumelle `style`.
    nom: 'un <noscript> refermé depuis une valeur d’attribut (le navigateur y voit une <img>)',
    fragment: `<noscript><div title='</noscript><img src=x onerror="alert(1)">'></noscript>`,
    causes: [
      /construction .{1,3}<noscript.{1,3} refusée/,
      /<noscript><div title="<\/noscript><img src=x onerror=&quot;alert\(1\)&quot;/,
    ],
  },
  {
    // 🔴 LA RÉGRESSION DU LOT A, 4/5 — la même bascule RAWTEXT, charge `style`. `position:fixed;
    // inset:0` est le style qui recouvre la page entière : le refus n'est pas académique.
    nom: 'un <noscript> refermé depuis une valeur d’attribut, charge de style plein écran',
    fragment: `<noscript><div title='</noscript><img src=x style="position:fixed;inset:0">'></noscript>`,
    causes: [
      /construction .{1,3}<noscript.{1,3} refusée/,
      /<noscript><div title="<\/noscript><img src=x style=&quot;position:fixed/,
    ],
  },
  {
    // 🔴 LA RÉGRESSION DU LOT A, 5/5 — `srcdoc` transporte un DOCUMENT ENTIER dans une valeur
    // d'attribut. Aucun analyseur de la page englobante ne le parcourt (jsdom pas davantage qu'un
    // balayage de motifs), et le document imbriqué a sa propre politique. Seul le refus de la
    // construction peut le nommer.
    nom: 'un document entier transporté dans le srcdoc d’une <iframe>',
    fragment: `<iframe srcdoc="<img src=x onerror='alert(1)'>"></iframe>`,
    causes: [
      /construction .{1,3}<iframe.{1,3} refusée/,
      /<iframe srcdoc="<img src=x onerror='alert\(1\)'>"><\/iframe>/,
    ],
  },
  {
    // NON-RÉGRESSION, et l'un des DEUX cas que l'en-tête du générateur promettait au harnais sans
    // les y avoir mis (S-009 : la promesse était fausse, pas le code). SOUS-CHAÎNE ≠ JETON, constat
    // de deux revues indépendantes le 2026-08-08 : chercher `id="init-theme"` dans la chaîne
    // d'attributs acceptait cette valeur FORGÉE — la sous-chaîne y est, l'attribut `id` non.
    // `getAttribute('id')` ne peut pas s'y tromper, et on le MESURE désormais.
    nom: 'un faux `id="init-theme"` forgé dans une valeur d’attribut (sous-chaîne ≠ jeton)',
    fragment: '<script data-x=" id=init-theme">alert(11111)</script>',
    causes: [/script inline exécutable non autorisé \(12 o\)/],
  },
  {
    // NON-RÉGRESSION, second des deux cas promis sans être assertionnés. PREMIER GAGNANT sur
    // attribut répété : le navigateur retient la PREMIÈRE occurrence de `type`, donc exécute ;
    // un découpage maison qui gardait la dernière voyait un `application/json` inerte et laissait
    // passer. L'analyseur applique nativement la règle du navigateur.
    nom: 'un `type` répété dont la SECONDE valeur est inerte (règle du premier gagnant)',
    fragment: '<script type="text/javascript" type="application/json">alert(111111)</script>',
    causes: [/script inline exécutable non autorisé \(13 o\)/],
  },
  {
    // CONTRÔLE DE CONSERVATION, jumeau de celui des blocs <style> : ce cas ne prouve pas qu'on
    // refuse bien ce qu'on voit, il prouve qu'on prouve avoir TOUT vu. Occurrence brute présente,
    // aucun élément analysé — refus NOMMÉ plutôt que silence.
    // ⚠️ CAS MIXTE, et le décompte de l'en-tête le dit désormais : l'ancien `MOTIF_SCRIPT`
    // capturait DÉJÀ ce fragment — la construction était donc rouge avant le lot A — mais sur la
    // cause « script inline exécutable non autorisé (8 o) », c'est-à-dire en accusant un script
    // qui n'existe pas. Ce qui est NEUF, c'est le contrôle de conservation qui le nomme pour ce
    // qu'il est ; et c'est LUI que la cause ci-dessous exige, pas le refus.
    nom: 'une occurrence de « <script » que l’analyseur ne retrouve pas (commentaire HTML)',
    fragment: '<!-- <script>alert(1)</script> -->',
    // 4 pour 3 : la page réelle porte TROIS scripts (anti-flash, bundle `type="module"`, `ng-state`),
    // et le commentaire en ajoute une quatrième occurrence BRUTE qu'aucun élément ne réalise.
    causes: [
      /4 occurrence\(s\) brute\(s\) de .{1,3}<script.{1,3}pour 3 élément\(s\) <script> vu\(s\)/,
    ],
  },
];

afterAll(() => {
  rmSync(BASE, { recursive: true, force: true });
});

describe('le garde-fou CSP, analysé plutôt qu’apparié', () => {
  for (const cas of CONTOURNEMENTS) {
    it(
      `refuse ${cas.nom}, en le nommant`,
      () => {
        const { sortie, code, config } = lancer(cas.fragment);
        // CONTRÔLE POSITIF (L-019) : sans lui, un cas dont la liste de causes serait vidée par
        // mégarde n'assertionnerait plus rien tout en restant vert.
        expect(cas.causes.length).toBeGreaterThan(0);
        for (const cause of cas.causes) expect(sortie).toMatch(cause);
        expect(code).toBe(1);
        expect(sortie).toContain('la sortie prerendue est incompatible avec la CSP stricte');
        // Le refus doit sortir AVANT l'écriture : une config écrite puis un code 1 laisserait un
        // artéfact déployable portant une CSP jamais revue.
        expect(config).toBe('');
      },
      DELAI,
    );
  }

  it(
    'accepte un artéfact sain — et le hachage ÉPINGLÉ du script anti-flash n’a pas bougé',
    () => {
      const { sortie, code, config } = lancer('<p>rien à signaler</p>');
      expect(code).toBe(0);
      expect(sortie).toContain(`${NOMBRE_HACHAGES_ATTENDU} hachage(s) de style distinct(s)`);
      // LA MOITIÉ QUI COMPTE POUR LE LOT A : le corps haché vient désormais de `textContent` et non
      // de la sous-chaîne brute. C'est la directive ÉCRITE qui part sur Azure — on la lit.
      const directive = /script-src[^;]*/.exec(config)?.[0] ?? '';
      expect(directive).toContain(HACHAGE_SCRIPT_ATTENDU);
      expect(directive.match(/sha256-/g) ?? []).toHaveLength(1);
    },
    DELAI,
  );
});
