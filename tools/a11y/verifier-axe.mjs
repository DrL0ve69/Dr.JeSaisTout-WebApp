#!/usr/bin/env node
/**
 * Gate d'accessibilité — axe-core sur le HTML PRERENDU de l'artéfact.
 *
 * POURQUOI CE GATE EXISTE.
 * `verifier-contrastes.mjs` mesure les JETONS : c'est la moitié amont, et elle ne
 * voit aucune page. Rien ne regardait ce que les pages rendues valent réellement
 * — landmarks, hiérarchie de titres, lien d'évitement, noms accessibles. La barre
 * du projet est WCAG 2.2 AA, zéro violation AXE : sans ce gate, cette barre
 * n'était qu'une intention. `ci.yml` lui réservait explicitement sa place, avec la
 * consigne de ne PAS y mettre d'étape verte factice ; ce script l'honore.
 *
 * POURQUOI PAS DE NAVIGATEUR (décision arbitrée, E1-ST2 lot 3).
 * `jsdom` est DÉJÀ une devDependency ; `axe-core` est donc la seule dépendance
 * ajoutée. Le site est 100 % prerendu (`outputMode: "static"`) : le HTML statique
 * EST l'expérience avant hydratation, c'est exactement ce qu'il faut auditer. Et
 * le contraste, principale raison d'exiger un vrai moteur de rendu, est déjà
 * couvert en amont. Playwright reste en dette pour l'INTERACTION CLAVIER, sa
 * vraie valeur ajoutée — pas pour cette passe structurelle.
 *
 * CE QUE CE GATE NE COUVRE PAS, ET IL LE DIT À CHAQUE EXÉCUTION.
 * jsdom ne calcule ni boîtes ni cascade complète, et ne charge aucune feuille de
 * style. Les règles qui en dépendent sont donc DÉSACTIVÉES EXPLICITEMENT et
 * imprimées avec leur motif (table `REGLES_DESACTIVEES`). Une règle qu'on laisse
 * tourner sans pouvoir la calculer produit un « vert » qui rassure à tort — c'est
 * pire que son absence. Même discipline que `verifier-glyphes.mjs`, qui imprime
 * ses écarts assumés à chaque run.
 *
 * TROIS GARDE-FOUS CONTRE LE FAUX VERT :
 *   1. ZÉRO FICHIER = ÉCHEC (L-014). Un gate peut sortir vert en n'ayant rien
 *      vérifié — c'est arrivé au gate de typage de ce dépôt. `dist/` absent,
 *      renommé ou vide sort donc en code 1, avec la marche à suivre.
 *   2. RÈGLES PROMISES VÉRIFIÉES AUPRÈS D'AXE. Chaque règle que ce gate prétend
 *      couvrir est confrontée à `axe.getRules()` : inconnue ou désactivée → code 1.
 *      Sans ça, une règle renommée par une version d'axe disparaîtrait en silence
 *      et le gate resterait vert en couvrant moins.
 *   3. UNE RÈGLE QUI PLANTE EST UN ÉCHEC. axe range une règle en erreur dans
 *      `incomplete` avec un `error-occurred` : ce n'est pas un « à revoir », c'est
 *      une règle qui n'a pas tourné. Elle fait rougir le gate.
 *
 * AUTO-TEST (`--auto-test`) : le gate se prouve lui-même. Il écrit des fixtures
 * dans un dossier temporaire, se relance dessus en sous-processus et vérifie les
 * CODES DE SORTIE et les messages : violation détectée → 1, page conforme → 0,
 * dossier absent → 1, dossier sans page → 1. C'est la culture du dépôt : les
 * gates sont eux-mêmes testés (L-010). Les fixtures ne sont pas commitées en
 * `.html` pour une raison mesurée : `npm run lint` fait tourner `eslint tools`,
 * dont le bloc des gabarits HTML applique les règles d'accessibilité d'Angular
 * — un fichier volontairement fautif y ferait échouer le lint. Elles
 * vivent donc en clair ci-dessous, sous contrôle de version comme le reste du
 * script, et sont matérialisées le temps de l'auto-test.
 *
 * Usage : node tools/a11y/verifier-axe.mjs                    (scanne l'artéfact)
 *         node tools/a11y/verifier-axe.mjs --auto-test        (prouve le gate)
 *         node tools/a11y/verifier-axe.mjs --artefact=<dir>   (autre cible)
 *         npm run a11y:axe / npm run a11y:axe:auto-test
 */

import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ARTEFACT_PAR_DEFAUT = path.join(RACINE, 'dist', 'dr-je-sais-tout', 'browser');
const MOI = fileURLToPath(import.meta.url);

// =============================================================================
// 1 · Les règles désactivées, et POURQUOI — imprimées à chaque exécution
// =============================================================================
/**
 * Chaque entrée coûte une couverture : elle dit donc où le contrôle se reporte.
 * Une règle retirée d'ici sans que le motif soit levé est une régression.
 *
 * @type {ReadonlyArray<readonly [regle: string, motif: string]>}
 */
const REGLES_DESACTIVEES = [
  [
    'color-contrast',
    'exige des couleurs RENDUES ; aucune feuille de style n’est chargée en jsdom. ' +
      'Déjà couverte en amont par tools/design/verifier-contrastes.mjs (33 paires de ' +
      'jetons, 66 mesures, les deux thèmes) — c’est la moitié amont de ce gate-ci.',
  ],
  [
    'target-size',
    'exige les boîtes de mise en page (WCAG 2.2 AA, 2.5.8, cibles ≥ 24×24 px ; la barre ' +
      'du projet est 44 px). jsdom rend toute boîte à 0×0 : la règle ne pourrait que ' +
      'mentir. → checklist manuelle, et Playwright en dette.',
  ],
  [
    'link-in-text-block',
    'compare la couleur d’un lien à celle du texte qui l’entoure — donc du rendu, absent ici. ' +
      '→ vérifié à l’œil sur la page déployée.',
  ],
  [
    'scrollable-region-focusable',
    'dépend du calcul de débordement (overflow/scrollHeight), que jsdom n’effectue pas sans ' +
      'feuille de style. → Playwright en dette.',
  ],
];

/**
 * Fichiers de l'artéfact qu'on n'audite PAS, et pourquoi. Imprimés à chaque
 * exécution, comme les règles désactivées : un fichier sauté en silence est une
 * page qu'on croit vérifiée.
 *
 * La clé est le chemin RELATIF à la racine de l'artéfact, en séparateurs `/` —
 * pas le nom de fichier seul. Comparer le basename écartait en silence tout
 * homonyme situé ailleurs dans l'arbre (une future page `.../index.csr.html`
 * n'aurait jamais été auditée) : une exemption doit désigner UN fichier, pas une
 * famille de noms.
 *
 * @type {ReadonlyArray<readonly [chemin: string, motif: string]>}
 */
const FICHIERS_IGNORES = [
  [
    'index.csr.html',
    'coquille de rendu CLIENT émise par `ng build` (body = `<app-root></app-root>` vide). ' +
      'Elle n’a ni repère ni titre PAR CONSTRUCTION — les auditer produirait deux faux positifs ' +
      'permanents (landmark-one-main, page-has-heading-one) qui apprendraient à ignorer le gate. ' +
      'Ce n’est pas une page du site : c’est un artéfact de construction, et l’URL est FERMÉE par ' +
      'une redirection 301 vers / (routes de staticwebapp.config.source.json) — aucun visiteur ne ' +
      'reçoit donc ce document.',
  ],
];

/**
 * Ce que ce gate PRÉTEND couvrir. Confronté à `axe.getRules()` à chaque exécution :
 * une règle inconnue d'axe ou désactivée par défaut fait rougir le gate, au lieu de
 * disparaître en silence lors d'une montée de version.
 *
 * La liste suit les livrables d'E1-ST2 : landmarks, titres, lien d'évitement, ARIA,
 * noms accessibles, langue du document, étiquettes de formulaire.
 *
 * @type {readonly string[]}
 */
const REGLES_PROMISES = [
  // Repères (landmarks) et structure de page
  'region',
  'landmark-one-main',
  'landmark-unique',
  'landmark-no-duplicate-main',
  'landmark-no-duplicate-banner',
  'landmark-no-duplicate-contentinfo',
  // Le lien d'évitement. DEUX PIÈGES mesurés sur axe 4.13, à connaître avant de
  // s'y fier : (a) la règle ne s'applique qu'aux pages contenant au moins un
  // `a[href]` (`bypass-matches`) ; (b) elle est `reviewOnFail`, donc son échec
  // arrive en « à revoir » et non en violation. C'est pour ça qu'un « à revoir »
  // sur une règle PROMISE fait rougir ce gate (voir plus bas) : sans cette
  // politique, un lien d'évitement absent passerait en jaune silencieux.
  // À savoir aussi : axe accepte un repère ou un titre comme mécanisme
  // d'évitement — la PRÉSENCE du lien lui-même reste un point de la checklist
  // manuelle, pas quelque chose qu'axe puisse exiger.
  'bypass',
  // Titres
  'page-has-heading-one',
  'heading-order',
  'empty-heading',
  // ARIA
  'aria-allowed-attr',
  'aria-allowed-role',
  'aria-valid-attr',
  'aria-valid-attr-value',
  'aria-required-attr',
  'aria-required-children',
  'aria-required-parent',
  'aria-hidden-body',
  'aria-hidden-focus',
  'aria-roles',
  'duplicate-id-aria',
  // Noms accessibles
  'button-name',
  'link-name',
  'aria-command-name',
  'aria-toggle-field-name',
  'image-alt',
  'input-button-name',
  // Document et formulaires
  'html-has-lang',
  'html-lang-valid',
  'document-title',
  'label',
  'form-field-multiple-labels',
  'list',
  'listitem',
];

/** Options passées à `axe.run`. Aucun `runOnly` : toutes les règles activées par
 *  défaut d'axe tournent (WCAG A/AA + bonnes pratiques), moins celles ci-dessus.
 *  Un `runOnly` par étiquettes aurait fait dépendre la couverture de noms
 *  d'étiquettes qui changent d'une version à l'autre. */
const OPTIONS_AXE = {
  rules: Object.fromEntries(REGLES_DESACTIVEES.map(([regle]) => [regle, { enabled: false }])),
};

// =============================================================================
// 2 · Formes de données lues d'axe (frontière typée : axe s'exécute dans jsdom)
// =============================================================================
/**
 * @typedef {{ id: string, data?: unknown }} VerificationAxe
 * @typedef {{ target: string[], any: VerificationAxe[], all: VerificationAxe[], none: VerificationAxe[] }} NoeudAxe
 * @typedef {{ id: string, help: string, helpUrl: string, nodes: NoeudAxe[] }} ResultatRegle
 * @typedef {{ violations: ResultatRegle[], incomplete: ResultatRegle[], passes: ResultatRegle[], inapplicable: ResultatRegle[] }} RapportAxe
 * @typedef {{ ruleId: string, enabled: boolean }} DescriptionRegle
 * @typedef {{ eval(code: string): unknown, close(): void }} FenetreJsdom
 * @typedef {{ fichier: string, regle: string, cible: string, aide: string, url: string }} Constat
 */

const requerir = createRequire(import.meta.url);

/**
 * jsdom ne publie pas de types et `@types/jsdom` serait une dépendance de plus
 * pour trois membres. La frontière est donc déclarée ICI, explicitement : c'est
 * exactement la surface que ce script s'autorise. Le programme `tsconfig.tools.json`
 * n'a pas `lib: DOM` — volontairement (un script Node ne doit pas pouvoir toucher
 * `document`), et cette annotation respecte cette frontière sans l'affaiblir.
 *
 * @type {new (html: string, options: Record<string, unknown>) => { window: FenetreJsdom }}
 */
const JSDOM = requerir('jsdom').JSDOM;

/** Source d'axe-core, lue une seule fois puis évaluée dans chaque fenêtre. */
const SOURCE_AXE = readFileSync(requerir.resolve('axe-core'), 'utf8');

// =============================================================================
// 3 · Outils
// =============================================================================

/**
 * Comparateur d'octets — PAS `localeCompare`. Les données triées ici sont des
 * chemins de fichiers et des identifiants de règles, tous ASCII : la comparaison
 * par unités UTF-16 donne le même ordre sur ce poste Windows et sur le runner
 * Linux, là où une collation dépendante de la locale réintroduirait la divergence
 * que L-009 a déjà coûtée. (`verifier-glyphes.mjs` trie, lui, des libellés
 * français : sa locale explicite est le bon choix pour SES données, pas pour
 * celles-ci.)
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function comparerOctets(a, b) {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

/**
 * Liste récursivement les `.html` d'un dossier. Même motif que
 * `tools/deploiement/generer-config-swa.mjs` — un seul parcours dans le dépôt.
 *
 * @param {string} dossier racine du parcours
 * @returns {string[]} chemins absolus — annotation OBLIGATOIRE : la fonction est
 *   récursive, et sans elle TypeScript ne sait pas inférer son retour (TS7023).
 */
function fichiersHtml(dossier) {
  /** @type {string[]} */
  const sortie = [];
  for (const entree of readdirSync(dossier)) {
    const chemin = path.join(dossier, entree);
    if (statSync(chemin).isDirectory()) sortie.push(...fichiersHtml(chemin));
    else if (entree.endsWith('.html')) sortie.push(chemin);
  }
  return sortie;
}

/**
 * Chemin affiché : relatif et en séparateurs `/`, pour que Windows et le runner
 * Linux impriment la même ligne.
 *
 * @param {string} base
 * @param {string} chemin
 * @returns {string}
 */
function afficher(base, chemin) {
  return path.relative(base, chemin).replaceAll('\\', '/');
}

/**
 * Interrompt le gate sur un constat bloquant.
 *
 * @param {string} message
 * @param {readonly string[]} [details]
 * @returns {never}
 */
function echec(message, details = []) {
  console.error(`\n✖ G-axe : ${message}`);
  for (const d of details) console.error(`   · ${d}`);
  console.error('');
  process.exit(1);
}

/**
 * Ouvre une fenêtre jsdom avec axe-core injecté.
 *
 * `runScripts: 'outside-only'` est un choix de SÉCURITÉ autant que de
 * déterminisme : le seul code exécuté est celui qu'on injecte, jamais les
 * `<script>` de la page auditée. On audite donc le DOM prerendu tel qu'il est
 * livré, avant toute hydratation — ce que voit un lecteur d'écran si le JS n'a
 * pas (encore) tourné.
 *
 * @param {string} html
 * @returns {{ window: FenetreJsdom }}
 */
function ouvrirFenetre(html) {
  const dom = new JSDOM(html, {
    url: 'https://exemple.invalid/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  // COMPENSATION jsdom, assumée et bornée : jsdom n'implémente pas
  // `document.elementFromPoint`, sur quoi repose le polyfill `elementsFromPoint`
  // d'axe. Sans ce bouchon, les règles de niveau PAGE (`page-has-heading-one`,
  // `landmark-one-main`) plantent et se rangent en `incomplete` — un « ni vert ni
  // rouge » silencieux, mesuré au développement de ce gate. Le bouchon ne sert
  // qu'aux calculs de PILE D'ÉLÉMENTS, dont les seules consommatrices réelles
  // sont les règles géométriques déjà désactivées ci-dessus.
  dom.window.eval('document.elementFromPoint = function () { return document.documentElement; };');
  dom.window.eval(SOURCE_AXE);
  return dom;
}

/**
 * Audite une page.
 *
 * @param {string} base dossier de référence pour l'affichage
 * @param {string} chemin fichier HTML
 * @returns {Promise<{ violations: Constat[], indecisPromis: Constat[], indecis: Constat[], plantees: Constat[], nbRegles: number }>}
 */
async function auditerPage(base, chemin) {
  const dom = ouvrirFenetre(readFileSync(chemin, 'utf8'));
  const nom = afficher(base, chemin);
  try {
    const rapport = /** @type {RapportAxe} */ (
      await /** @type {Promise<unknown>} */ (
        dom.window.eval(`axe.run(document, ${JSON.stringify(OPTIONS_AXE)})`)
      )
    );

    /** @param {ResultatRegle[]} resultats @returns {Constat[]} */
    const aplatir = (resultats) =>
      resultats.flatMap((r) =>
        r.nodes.map((n) => ({
          fichier: nom,
          regle: r.id,
          cible: n.target.join(' '),
          aide: r.help,
          url: r.helpUrl,
        })),
      );

    // Une règle qui a PLANTÉ n'est pas « à revoir » : elle n'a pas tourné. axe la
    // range dans `incomplete` avec un `error-occurred` ; on la sépare pour la
    // faire rougir, sinon le gate perdrait une règle sans le dire.
    const aPlante = (/** @type {ResultatRegle} */ r) =>
      r.nodes.some((n) =>
        [...n.any, ...n.all, ...n.none].some((c) => c.id === 'error-occurred'),
      );

    // Un « à revoir » (incomplete) n'est pas un vert : axe n'a pas tranché. Sur une
    // règle qu'on a PROMIS de couvrir, ne pas trancher = ne pas couvrir : ça rougit.
    // Sur les autres, ça s'imprime pour l'œil humain.
    const promises = new Set(REGLES_PROMISES);
    const aRevoir = rapport.incomplete.filter((r) => !aPlante(r));

    return {
      violations: aplatir(rapport.violations),
      indecisPromis: aplatir(aRevoir.filter((r) => promises.has(r.id))),
      indecis: aplatir(aRevoir.filter((r) => !promises.has(r.id))),
      plantees: aplatir(rapport.incomplete.filter(aPlante)),
      nbRegles:
        rapport.violations.length +
        rapport.incomplete.length +
        rapport.passes.length +
        rapport.inapplicable.length,
    };
  } finally {
    dom.window.close();
  }
}

/**
 * Confronte `REGLES_PROMISES` à ce qu'axe connaît réellement.
 *
 * @returns {{ problemes: string[], version: string, nbActivees: number }}
 */
function verifierReglesPromises() {
  const dom = ouvrirFenetre('<!doctype html><html lang="fr"><head><title>x</title></head><body></body></html>');
  try {
    const version = /** @type {string} */ (dom.window.eval('String(axe.version)'));
    const regles = /** @type {DescriptionRegle[]} */ (
      JSON.parse(/** @type {string} */ (dom.window.eval('JSON.stringify(axe.getRules())')))
    );
    const parId = new Map(regles.map((r) => [r.ruleId, r]));
    const desactivees = new Set(REGLES_DESACTIVEES.map(([regle]) => regle));

    /** @type {string[]} */
    const problemes = [];
    for (const id of [...REGLES_PROMISES].sort(comparerOctets)) {
      const regle = parId.get(id);
      if (!regle) {
        problemes.push(
          `règle promise « ${id} » INCONNUE d’axe ${version} — renommée ou retirée. ` +
            'Ce gate couvre donc moins que ce qu’il annonce : corriger REGLES_PROMISES.',
        );
      } else if (regle.enabled === false) {
        problemes.push(
          `règle promise « ${id} » DÉSACTIVÉE par défaut dans axe ${version} — elle ne tourne pas. ` +
            'L’activer explicitement dans OPTIONS_AXE ou la retirer de REGLES_PROMISES.',
        );
      } else if (desactivees.has(id)) {
        problemes.push(`règle « ${id} » à la fois promise et désactivée — contradiction.`);
      }
    }
    for (const [id] of REGLES_DESACTIVEES) {
      if (!parId.has(id)) {
        problemes.push(
          `règle désactivée « ${id} » INCONNUE d’axe ${version} : la désactivation ne sert plus à rien. ` +
            'Retirer l’entrée de REGLES_DESACTIVEES (et son motif) plutôt que la laisser mentir.',
        );
      }
    }
    return {
      problemes,
      version,
      nbActivees: regles.filter((r) => r.enabled !== false).length - desactivees.size,
    };
  } finally {
    dom.window.close();
  }
}

// =============================================================================
// 4 · Le gate
// =============================================================================

/**
 * @param {string} artefact dossier à scanner
 * @returns {Promise<number>} code de sortie
 */
async function scanner(artefact) {
  // GARDE-FOU L-014 : zéro fichier n'est PAS un succès.
  /** @type {string[]} */
  let toutes;
  try {
    toutes = fichiersHtml(artefact);
  } catch (err) {
    // On ne étiquette « dossier introuvable » que ce qui l'est VRAIMENT. Un EACCES
    // ou un EPERM ne dit pas la même chose et n'appelle pas la même correction :
    // afficher la mauvaise cause enverrait relancer `npm run build` pour un
    // problème de droits. Ce qui n'est pas ENOENT remonte tel quel, avec sa trace.
    if (/** @type {NodeJS.ErrnoException} */ (err)?.code !== 'ENOENT') throw err;
    echec(`dossier introuvable : ${afficher(RACINE, artefact)}`, [
      'Lancer `npm run build` d’abord : ce gate audite le HTML PRERENDU, pas les sources.',
      'Si le chemin de sortie a changé, corriger ARTEFACT_PAR_DEFAUT dans ce script.',
    ]);
  }
  const ignores = new Set(FICHIERS_IGNORES.map(([chemin]) => chemin));
  const ecartes = toutes.filter((p) => ignores.has(afficher(artefact, p)));
  const pages = toutes.filter((p) => !ignores.has(afficher(artefact, p))).sort(comparerOctets);

  if (pages.length === 0) {
    echec(`aucune page .html à auditer dans ${afficher(RACINE, artefact)} — 0 fichier inspecté`, [
      'Un gate qui n’a rien vérifié ne peut pas être vert (L-014).',
      'Lancer `npm run build` d’abord ; si le build a tourné, le prerender n’a rien émis.',
      ...(ecartes.length > 0
        ? [`${ecartes.length} fichier(s) écarté(s) par FICHIERS_IGNORES : la liste est-elle trop large ?`]
        : []),
    ]);
  }

  const { problemes, version, nbActivees } = verifierReglesPromises();

  console.log('\n  Gate d’accessibilité — axe-core ' + version + ' sur le HTML prerendu');
  console.log(
    `  ${pages.length} page(s) · ~${nbActivees} règles activées · ` +
      `${REGLES_PROMISES.length} règles promises · ${REGLES_DESACTIVEES.length} désactivées`,
  );

  console.log('\n  Règles DÉSACTIVÉES — jsdom ne peut pas les calculer honnêtement :');
  for (const [regle, motif] of REGLES_DESACTIVEES) console.log(`  ~ ${regle} — ${motif}`);

  console.log('\n  Fichiers ÉCARTÉS de l’audit :');
  for (const [chemin, motif] of FICHIERS_IGNORES) {
    const vus = ecartes.filter((p) => afficher(artefact, p) === chemin).length;
    console.log(`  ~ ${chemin} (${vus} trouvé(s)) — ${motif}`);
  }
  console.log(
    '  Hors de portée de ce gate, par construction : navigation et ordre de tabulation au ' +
      'CLAVIER, focus visible, focus non masqué, mouvement réduit, zoom 400 %. ' +
      'Aucune feuille de style n’est chargée : un élément masqué par CSS seule est audité ' +
      'comme visible. → checklist manuelle d’E1-ST2, et Playwright en dette.',
  );

  /** @type {Constat[]} */
  const violations = [];
  /** @type {Constat[]} */
  const indecisPromis = [];
  /** @type {Constat[]} */
  const indecis = [];
  /** @type {Constat[]} */
  const plantees = [];
  let nbVerifications = 0;

  console.log('');
  for (const page of pages) {
    const r = await auditerPage(artefact, page);
    violations.push(...r.violations);
    indecisPromis.push(...r.indecisPromis);
    indecis.push(...r.indecis);
    plantees.push(...r.plantees);
    nbVerifications += r.nbRegles;
    const enEchec = r.violations.length + r.indecisPromis.length + r.plantees.length;
    console.log(
      `  ${enEchec === 0 ? '·' : '✖'} ${afficher(artefact, page).padEnd(42)} ${r.nbRegles} règles · ` +
        `${r.violations.length} violation(s) · ${r.indecisPromis.length + r.indecis.length} à revoir`,
    );
  }
  console.log(
    `\n  ${pages.length} fichier(s) inspecté(s) · ${ecartes.length} écarté(s) · ` +
      `${nbVerifications} vérifications effectuées`,
  );

  /** @param {Constat} c @returns {string} */
  const cle = (c) => `${c.fichier}\0${c.regle}\0${c.cible}`;
  /** @param {Constat} a @param {Constat} b @returns {number} */
  const parConstat = (a, b) => comparerOctets(cle(a), cle(b));

  if (indecis.length > 0) {
    console.log(
      `\n  ${indecis.length} point(s) « à revoir » hors des règles promises — axe n’a pas tranché, ` +
        'ce n’est donc PAS un vert. À regarder à la main :',
    );
    for (const c of [...indecis].sort(parConstat)) {
      console.log(`  ? ${c.fichier} · ${c.regle} · ${c.cible}`);
    }
  }

  for (const c of [...indecisPromis].sort(parConstat)) {
    problemes.push(
      `${c.fichier} · ${c.regle} · ${c.cible} : « à revoir » sur une règle PROMISE — ${c.aide}. ` +
        'Ne pas trancher, c’est ne pas couvrir : corriger la page, ou retirer la règle de ' +
        `REGLES_PROMISES en écrivant pourquoi. Aide : ${c.url}`,
    );
  }

  for (const c of [...plantees].sort(parConstat)) {
    problemes.push(
      `${c.fichier} · ${c.regle} · ${c.cible} : la règle a PLANTÉ en jsdom, elle n’a donc pas ` +
        'tourné. Soit la désactiver avec son motif dans REGLES_DESACTIVEES, soit la compenser — ' +
        'jamais la laisser en « à revoir » silencieux.',
    );
  }

  if (violations.length > 0 || problemes.length > 0) {
    if (violations.length > 0) {
      console.error(`\n✖ G-axe : ${violations.length} violation(s) d’accessibilité :`);
      for (const c of [...violations].sort(parConstat)) {
        console.error(`  ✖ ${c.fichier} · ${c.regle} · ${c.cible}`);
        console.error(`      ${c.aide} — ${c.url}`);
      }
    }
    if (problemes.length > 0) {
      console.error(`\n✖ G-axe : ${problemes.length} problème(s) de configuration du gate :`);
      for (const p of problemes.sort(comparerOctets)) console.error(`  · ${p}`);
    }
    console.error('');
    return 1;
  }

  console.log('\n✔ aucune violation axe sur les pages prerendues.\n');
  return 0;
}

// =============================================================================
// 5 · Auto-test — la preuve que le gate MORD (L-010)
// =============================================================================
/**
 * Fixtures : du HTML dont on SAIT ce qu'axe doit y trouver. `attendues` liste les
 * règles qui DOIVENT être signalées pour ce fichier ; d'autres violations peuvent
 * s'y ajouter sans invalider la preuve (l'assertion est une inclusion).
 *
 * @type {ReadonlyArray<{ nom: string, attendues: readonly string[], html: string }>}
 */
const FIXTURES = [
  {
    nom: 'bouton-sans-nom.html',
    attendues: ['button-name'],
    html: `<main><h1>Titre</h1><button type="button"></button></main>`,
  },
  {
    nom: 'lien-sans-nom.html',
    attendues: ['link-name'],
    html: `<main><h1>Titre</h1><a href="/cible"></a></main>`,
  },
  {
    nom: 'titres-en-desordre.html',
    attendues: ['empty-heading', 'heading-order'],
    html: `<main><h1>Titre</h1><h4>Palier sauté</h4><h2></h2></main>`,
  },
  {
    nom: 'aria-non-permis.html',
    attendues: ['aria-allowed-attr'],
    html: `<main><h1>Titre</h1><p aria-checked="true">Pas une case à cocher.</p></main>`,
  },
  {
    nom: 'champ-sans-etiquette.html',
    attendues: ['label'],
    html: `<main><h1>Titre</h1><form><input type="text" name="a"></form></main>`,
  },
  {
    nom: 'sans-repere-ni-titre.html',
    attendues: ['bypass', 'landmark-one-main', 'page-has-heading-one', 'region'],
    // Le `<a href>` n'est pas décoratif : sans au moins un lien, `bypass` ne
    // s'applique pas du tout (`bypass-matches`) et la preuve serait creuse.
    // Aucun titre, aucun repère, aucun lien interne « # » : les trois issues
    // qu'axe accepte comme mécanisme d'évitement sont donc absentes.
    html: `<p>Texte hors de tout repère.</p><a href="/ailleurs">Aller ailleurs</a>`,
  },
];

/** Fixture sans `lang` : la seule qui doit modifier l'élément `<html>`. */
const FIXTURE_SANS_LANG = {
  nom: 'sans-lang.html',
  attendues: ['html-has-lang'],
  html: `<!doctype html><html><head><meta charset="utf-8"><title>Sans lang</title></head><body><main><h1>Titre</h1><p>Texte.</p></main></body></html>`,
};

/** Fixture sans `<title>`. */
const FIXTURE_SANS_TITRE = {
  nom: 'sans-titre-de-page.html',
  attendues: ['document-title', 'image-alt'],
  html: `<!doctype html><html lang="fr"><head><meta charset="utf-8"></head><body><main><h1>Titre</h1><img src="/decor.png"></main></body></html>`,
};

const FIXTURE_CONFORME = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Page conforme</title></head><body>
<a href="#principal">Aller au contenu principal</a>
<header><nav aria-label="Navigation principale"><ul><li><a href="/">Accueil</a></li></ul></nav></header>
<main id="principal">
  <h1>Titre de la page</h1>
  <h2>Sous-titre</h2>
  <p>Texte de démonstration.</p>
  <form><label for="q">Rechercher</label><input id="q" name="q" type="search"></form>
  <button type="button">Agir</button>
</main>
<footer><p>Pied de page</p></footer>
</body></html>`;

/**
 * @param {string} corps fragment placé dans `<body>`
 * @param {string} titre
 * @returns {string} page complète et par ailleurs conforme
 */
function pageAutour(corps, titre) {
  return `<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>${titre}</title></head><body>\n${corps}\n</body></html>`;
}

/**
 * Relance CE script en sous-processus sur un dossier donné : c'est le CODE DE
 * SORTIE réel qui est vérifié, pas une simulation en mémoire.
 *
 * @param {string} dossier
 * @returns {{ code: number, sortie: string }}
 */
function relancer(dossier) {
  const r = spawnSync(process.execPath, [MOI, `--artefact=${dossier}`], {
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  return { code: r.status ?? -1, sortie: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

/**
 * @returns {number} code de sortie
 */
function autoTest() {
  const base = mkdtempSync(path.join(tmpdir(), 'g-axe-'));
  /** @type {string[]} */
  const echecs = [];
  /** @param {string} nom @param {boolean} ok @param {string} [detail] */
  const verdict = (nom, ok, detail) => {
    console.log(`  ${ok ? '✔' : '✖'} ${nom}${detail && !ok ? ` — ${detail}` : ''}`);
    if (!ok) echecs.push(nom);
  };

  try {
    // --- Cas 1 : page conforme → code 0 -------------------------------------
    const dossierConforme = path.join(base, 'conforme');
    mkdirSync(dossierConforme, { recursive: true });
    writeFileSync(path.join(dossierConforme, 'index.html'), FIXTURE_CONFORME, 'utf8');

    // --- Cas 2 : une fixture par famille de règle → code 1 ------------------
    // Un sous-dossier pour prouver au passage que le parcours est RÉCURSIF.
    const dossierFautif = path.join(base, 'fautif', 'sous-dossier');
    mkdirSync(dossierFautif, { recursive: true });
    const fautives = [
      ...FIXTURES.map((f) => ({ ...f, html: pageAutour(f.html, f.nom) })),
      FIXTURE_SANS_LANG,
      FIXTURE_SANS_TITRE,
    ];
    for (const f of fautives) writeFileSync(path.join(dossierFautif, f.nom), f.html, 'utf8');

    // --- Cas 4 : dossier existant mais sans aucun .html ---------------------
    const dossierVide = path.join(base, 'vide');
    mkdirSync(dossierVide, { recursive: true });

    console.log('\n  Auto-test du gate G-axe — les quatre cas qui prouvent qu’il mord\n');

    const conforme = relancer(dossierConforme);
    verdict(
      'page conforme → code 0',
      conforme.code === 0 && conforme.sortie.includes('aucune violation axe'),
      `code ${conforme.code}`,
    );

    const fautif = relancer(dossierFautif);
    verdict('pages fautives → code 1', fautif.code === 1, `code ${fautif.code}`);
    for (const f of fautives) {
      for (const regle of f.attendues) {
        verdict(
          `   ${f.nom} · ${regle} nommée dans le rapport`,
          fautif.sortie.includes(`${f.nom} · ${regle}`),
          'la règle n’apparaît pas — le gate ne la détecte plus',
        );
      }
    }
    verdict(
      '   le rapport nomme fichier ET règle',
      /✖ [^\s]+\.html · [a-z0-9-]+ ·/.test(fautif.sortie),
      'format de constat inattendu',
    );

    const absent = relancer(path.join(base, 'nulle-part'));
    verdict(
      'dossier absent → code 1 + marche à suivre',
      absent.code === 1 && absent.sortie.includes('npm run build'),
      `code ${absent.code}`,
    );

    const vide = relancer(dossierVide);
    verdict(
      'dossier sans page → code 1 (L-014)',
      vide.code === 1 && vide.sortie.includes('0 fichier inspecté'),
      `code ${vide.code}`,
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }

  if (echecs.length > 0) {
    console.error(`\n✖ G-axe (auto-test) : ${echecs.length} cas en échec — le gate ne mord plus :`);
    for (const e of echecs.sort(comparerOctets)) console.error(`  · ${e}`);
    console.error('');
    return 1;
  }
  console.log('\n✔ le gate détecte chaque famille de violation et refuse de sortir vert à vide.\n');
  return 0;
}

// =============================================================================
// 6 · Point d'entrée
// =============================================================================

const cible = process.argv.find((a) => a.startsWith('--artefact='))?.slice('--artefact='.length);
const code = process.argv.includes('--auto-test')
  ? autoTest()
  : await scanner(cible ? path.resolve(RACINE, cible) : ARTEFACT_PAR_DEFAUT);
process.exit(code);
