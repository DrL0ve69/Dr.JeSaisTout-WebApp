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
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
 * Types de `<script>` réellement INERTES — le navigateur ne les exécute pas et la CSP ne les
 * soumet pas à `script-src`. La liste est volontairement courte : `importmap` et
 * `speculationrules` n'en font PAS partie (tous deux sont soumis à `script-src` quand ils sont
 * inline), les classer ici les rendrait invisibles au garde-fou tout en les faisant bloquer en
 * production — exactement la panne silencieuse que ce script existe pour empêcher.
 */
const TYPES_INERTES = new Set(['application/json', 'application/ld+json']);

/**
 * Découpe une liste d'attributs HTML en paires nom → valeur.
 *
 * POURQUOI UN VRAI DÉCOUPAGE PLUTÔT QU'UN `test()` SUR LA CHAÎNE BRUTE. Chercher la sous-chaîne
 * `id="init-theme"` dans les attributs laissait passer une valeur FORGÉE : dans
 * `<script data-x=" id=init-theme">`, la sous-chaîne est présente alors qu'aucun attribut `id`
 * n'existe. Le corps arbitraire était alors haché et autorisé. Deux revues indépendantes l'ont
 * reproduit sur l'artéfact (2026-08-08). Une liste blanche qui délivre un droit doit apparier des
 * jetons, jamais des sous-chaînes.
 *
 * @param {string} chaine bloc d'attributs brut, tel que capturé entre `<script` et `>`
 * @returns {Map<string, string>} nom d'attribut en minuscules → valeur déguillemetée
 */
function attributs(chaine) {
  /** @type {Map<string, string>} */
  const paires = new Map();
  const motif = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;
  for (const m of chaine.matchAll(motif)) {
    // Le groupe 1 n'est pas optionnel dans le motif : une correspondance sans lui n'existe pas.
    // `noUncheckedIndexedAccess` ne le sait pas, et on ne l'affirme pas par une assertion — on le
    // vérifie. C'est la règle de ce fichier : l'inconnu est écarté, jamais supposé inoffensif.
    const nom = m[1]?.toLowerCase();
    if (nom === undefined) continue;
    const brut = m[2] ?? '';
    const valeur = /^["']/.test(brut) ? brut.slice(1, -1) : brut;
    // PREMIER GAGNANT, comme l'analyseur HTML : sur un attribut répété, il retient la première
    // occurrence et ignore les suivantes. Garder la dernière laissait
    // `<script type="text/javascript" type="application/json">` passer pour inerte alors que le
    // navigateur l'exécute.
    if (!paires.has(nom)) paires.set(nom, valeur.trim());
  }
  return paires;
}

/**
 * Le bloc d'attributs est-il ENTIÈREMENT analysable par `attributs()` ?
 *
 * `attributs()` glane des paires là où il en trouve ; il ne se plaint pas de ce qu'il n'a pas su
 * lire. Sur `<script data-x=`type="application/json"`>`, il croyait donc voir un `type` inerte au
 * milieu d'une valeur à backticks là où le navigateur ne voit aucun `type` — et exécute. On exige
 * ici que TOUT le bloc corresponde à une suite d'attributs bien formés : ce qui n'est pas compris
 * devient une infraction, jamais un laissez-passer. C'est la règle générale de ce fichier —
 * échouer sur l'inconnu plutôt que le supposer inoffensif.
 */
const MOTIF_ATTRIBUTS_BIEN_FORMES =
  /^(?:\s+[a-zA-Z_:][-a-zA-Z0-9_:.]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?$/;

/**
 * Balises `<script>` d'une page, avec leurs attributs découpés et leur corps.
 * Le groupe d'attributs accepte les valeurs citées contenant un `>` — sinon la balise serait
 * coupée au mauvais endroit et son corps mal lu.
 */
// Drapeau `i` et `</script\s*>` : `<ScRiPt>` et `</script >` sont du script exécutable pour un
// navigateur. Sans eux, la balise n'était pas vue du tout — donc ni hachée ni signalée.
const MOTIF_SCRIPT = /<script((?:"[^"]*"|'[^']*'|[^>"'])*)>([\s\S]*?)<\/script\s*>/gi;

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

  for (const m of html.matchAll(/ (on[a-z]+)="/g)) {
    infractions.push(`${nom} : gestionnaire d’événement inline « ${m[1]} » — bloqué par script-src`);
  }

  let scriptsAutorises = 0;
  for (const m of html.matchAll(MOTIF_SCRIPT)) {
    // Les deux groupes du motif sont obligatoires : une correspondance qui n'en porterait pas est
    // impossible. On l'écarte quand même plutôt que de l'affirmer par une assertion — même règle
    // que `attributs()` : ce qui n'est pas compris est refusé, jamais supposé inoffensif.
    const attributsBruts = m[1];
    const corps = m[2];
    if (attributsBruts === undefined || corps === undefined) {
      infractions.push(`${nom} : balise <script> illisible — refusée par principe`);
      continue;
    }
    if (!MOTIF_ATTRIBUTS_BIEN_FORMES.test(attributsBruts)) {
      infractions.push(`${nom} : balise <script> aux attributs non analysables — refusée par principe`);
      continue;
    }
    const attrs = attributs(attributsBruts);
    const type = (attrs.get('type') ?? '').toLowerCase();
    if (!corps.trim() || attrs.has('src') || TYPES_INERTES.has(type)) continue;

    // Le script d'initialisation du thème est le SEUL inline exécutable admis. Deux conditions
    // CUMULATIVES : le bon `id` ET le contenu exact déjà revu. L'`id` seul ne suffit pas — il est
    // choisi par celui qui produit l'artéfact, donc il n'atteste de rien.
    if (attrs.get('id') === ID_SCRIPT_AUTORISE) {
      // Compté ici, avant la comparaison de hachage : un script présent mais modifié doit produire
      // le message « il a changé », pas « il est absent ».
      scriptsAutorises += 1;
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

  if (/ style="/.test(html)) {
    const n = (html.match(/ style="/g) || []).length;
    infractions.push(`${nom} : ${n} attribut(s) style inline — bloqué(s) par style-src (les hachages ne couvrent pas les attributs)`);
  }

  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
    // Un bloc vide donne `''`, jamais `undefined` : le groupe est obligatoire, ce cas est
    // inatteignable. On le signale quand même plutôt que de sauter en silence — même geste que
    // la branche <script> ci-dessus, et même règle affichée : ce qui n'est pas compris est
    // REFUSÉ, jamais ignoré. Un `continue` muet ici serait le seul saut silencieux du fichier.
    const corpsStyle = m[1];
    if (corpsStyle === undefined) {
      infractions.push(`${nom} : bloc <style> illisible — refusé par principe`);
      continue;
    }
    hachagesStyle.add(hacher(corpsStyle));
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
console.log(`  ${hachagesStyle.size} hachage(s) de style distinct(s), ${hachagesScript.size} de script`);
if (hachagesStyle.size === 0) console.log('  (aucun bloc <style> inline — style-src reste à \'self\')');
