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
import { join, relative } from 'node:path';

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
 */
function attributs(chaine) {
  const paires = new Map();
  const motif = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;
  for (const m of chaine.matchAll(motif)) {
    const brut = m[2] ?? '';
    const valeur = /^["']/.test(brut) ? brut.slice(1, -1) : brut;
    // PREMIER GAGNANT, comme l'analyseur HTML : sur un attribut répété, il retient la première
    // occurrence et ignore les suivantes. Garder la dernière laissait
    // `<script type="text/javascript" type="application/json">` passer pour inerte alors que le
    // navigateur l'exécute.
    if (!paires.has(m[1].toLowerCase())) paires.set(m[1].toLowerCase(), valeur.trim());
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
 */
function hacher(contenu) {
  const normalise = contenu.replace(/\r\n?/g, '\n');
  return `'sha256-${createHash('sha256').update(normalise, 'utf8').digest('base64')}'`;
}

/** Ordre total stable sur les unités de code UTF-16 — indépendant de la locale et de la plateforme. */
function comparerOctets(a, b) {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

/**
 * Remplace un jeton par sa liste de hachages dans la directive CSP.
 *
 * On absorbe l'espace qui PRÉCÈDE le jeton pour qu'une liste vide ne laisse pas
 * `script-src 'self' ;` — une directive que SWA sert telle quelle et que le navigateur rejette.
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

/** Liste récursivement les fichiers `.html` de l'artéfact. */
function fichiersHtml(dossier) {
  const sortie = [];
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) sortie.push(...fichiersHtml(chemin));
    else if (entree.endsWith('.html')) sortie.push(chemin);
  }
  return sortie;
}

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
for (const [jeton, directive] of [
  [JETON_STYLE, 'style-src'],
  [JETON_SCRIPT, 'script-src'],
]) {
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
const infractions = [];
const hachagesStyle = new Set();
const hachagesScript = new Set();

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const nom = relative(ARTEFACT, page);

  for (const m of html.matchAll(/ (on[a-z]+)="/g)) {
    infractions.push(`${nom} : gestionnaire d’événement inline « ${m[1]} » — bloqué par script-src`);
  }

  let scriptsAutorises = 0;
  for (const m of html.matchAll(MOTIF_SCRIPT)) {
    const corps = m[2];
    if (!MOTIF_ATTRIBUTS_BIEN_FORMES.test(m[1])) {
      infractions.push(`${nom} : balise <script> aux attributs non analysables — refusée par principe`);
      continue;
    }
    const attrs = attributs(m[1]);
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
    hachagesStyle.add(hacher(m[1]));
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
JSON.parse(resolu); // garde-fou : la substitution doit laisser un JSON valide
writeFileSync(join(ARTEFACT, 'staticwebapp.config.json'), resolu);

console.log(`✔ staticwebapp.config.json généré dans ${relative(RACINE, ARTEFACT)}`);
console.log(`  ${pages.length} page(s) inspectée(s)`);
console.log(`  ${hachagesStyle.size} hachage(s) de style distinct(s), ${hachagesScript.size} de script`);
if (hachagesStyle.size === 0) console.log('  (aucun bloc <style> inline — style-src reste à \'self\')');
