#!/usr/bin/env node
/**
 * ORCHESTRATEUR DU PIPELINE DE CONTENU — E2-ST1, lot 4
 * =============================================================================
 * L'unique point d'entrée du contenu-as-code : `npm run content:build`. Cinq étapes, dans cet
 * ordre, et aucune n'est facultative :
 *
 *   1. VALIDATION (`valider.mjs`) — une leçon malformée fait échouer la construction ICI, là où le
 *      message peut encore nommer le fichier et le champ fautifs. ⚠️ ELLE PRÉCÈDE LA PURGE, et c'est
 *      délibéré : le validateur ne lit que `content/`, donc un refus doit laisser la sortie
 *      PRÉCÉDENTE intacte plutôt que de vider l'arbre dont `npm test` et `npm start` dépendent.
 *   2. PURGE de `src/content-generated/` — avant toute écriture, et seulement une fois le contenu
 *      déclaré conforme.
 *   3. COMPILATION (`compiler-markdown.mjs`), diagrammes Mermaid inclus (`rendre-mermaid.mjs`),
 *      SUIVIE DU CONTRÔLE FINAL des SVG (`controlerSvgCompiles`) — voir `etapeCompiler`.
 *   4. MANIFESTE + CARTE d'imports paresseux (`generer-manifeste.mjs`).
 *   5. POIDS (`verifier-poids.mjs`) — la table s'imprime toujours.
 *
 * ─── LES DEUX CAS D'ABSENCE, ET POURQUOI ILS NE SE TRAITENT PAS PAREIL ──────────────────────────
 *
 * · RACINE EXPLICITE (`--racine …`) INTROUVABLE ⇒ CODE 1. Le chemin vient de la ligne de commande :
 *   une faute de frappe est bien plus probable qu'un contenu absent. Échouer en nommant le chemin
 *   coûte une seconde ; réussir en silence sur zéro leçon coûte une enquête.
 *
 * · RACINE PAR DÉFAUT ABSENTE, OU PRÉSENTE MAIS VIDE ⇒ CODE 0, ET LES SORTIES SONT ÉCRITES QUAND
 *   MÊME — et c'est l'état de `content/cours/php`, qui ne porte à ce jour qu'un `horaire.json`.
 *   Le piège, et il est vicieux : `src/styles.scss` fait `@use 'styles/coloration-syntaxique-generee'`
 *   sur une feuille GITIGNORÉE, que seul ce pipeline produit. Un générateur qui « saute » l'écriture
 *   quand il n'a rien à compiler laisse donc, sur tout clone frais, un `@use` sans cible — et c'est
 *   `npm test` qui tombe EN PREMIER (le spec du design system compile la feuille globale), avant même
 *   `npm run build`. D'où la règle : ZÉRO leçon écrit une feuille vide, un manifeste vide et une carte
 *   vide. Le vide est un résultat, pas une raison de ne rien faire.
 *
 * ─── CHROMIUM N'EST DEMANDÉ QUE S'IL EST NÉCESSAIRE — DEUX FILTRES, PAS UN ────────────────────
 * 1. On lit les sources, on cherche un bloc ` ```mermaid `, et on ne construit le rendeur que s'il
 *    y en a au moins un : avec `content/` vide, aucun diagramme n'est à rendre.
 * 2. 🔴 ET LE RENDEUR LUI-MÊME NE RÉSOUT RIEN À LA CONSTRUCTION. `mmdc` et le Chromium de
 *    Playwright ne sont localisés qu'au moment d'un rendu RÉEL — c'est-à-dire quand un socle
 *    manque au cache (`rendre-mermaid.mjs`, `localiserOutils`). Le premier filtre seul ne suffit
 *    pas : une leçon À DIAGRAMMES dont le cache est CHAUD n'a rien à rendre et exigeait pourtant
 *    un navigateur (mesuré : cache à 4 SVG + `PLAYWRIGHT_BROWSERS_PATH` vide ⇒ code 1). Or le job
 *    `gates` de `deploy.yml` lance G-test AVANT d'installer le navigateur.
 * Ce qui NE change pas : quand un rendu est nécessaire et que l'outil manque, l'échec reste
 * bruyant, nommé, et dit la commande à lancer.
 *
 * ─── `--cache-diagrammes` ─────────────────────────────────────────────────────────────────────
 * Dossier des socles SVG mis en cache (défaut : `.cache/mermaid`). Il existe pour que les tests
 * puissent EXERCER les deux états — cache froid et cache chaud — sans se marcher dessus ni
 * effacer le cache partagé du poste. En production, on ne le passe jamais.
 *
 * ─── 🔴 `--inclure-brouillons` — LE SEUL MOYEN DE PUBLIER UNE LEÇON NON PUBLIÉE ────────────────
 * Sans ce drapeau, une leçon dont le `statut` n'est pas `publiee` est COMPILÉE (elle doit l'être :
 * c'est ainsi qu'on sait qu'elle est valide) mais n'est écrite NULLE PART dans `src/content-generated/`.
 * Raison mesurée le 2026-08-19 : un `lecons/<slug>.json` écrit devient un chunk esbuild, servi en
 * 200 par l'hébergeur et rendu par le routeur client sur son URL non prerendue — une leçon non
 * relue, publique. Voir l'en-tête de `generer-manifeste.mjs`. Le drapeau existe pour `npm start`
 * et la relecture éditoriale ; un artéfact bâti avec lui ne se déploie pas.
 *
 * ─── 🔴 `--racine` EST RÉPÉTABLE — LE PIPELINE COMPILE PLUSIEURS SUJETS (E7, lot A) ────────────
 * Le dépôt porte deux cours (`securite-web`, `php`) et l'application n'a qu'UN manifeste : une
 * exécution compile donc toutes les racines de `RACINES_PAR_DEFAUT`, ou toutes celles que
 * `--racine` énumère (la première occurrence REMPLACE la liste par défaut, elle ne s'y ajoute pas).
 * Ce qui reste PAR RACINE : la validation (un processus fils par racine, son message d'échec
 * nomme la racine), le registre des sujets frères, l'horaire, le registre d'exercices et le
 * contrôle des `{voir="module:…"}` — un renvoi de module se juge contre les leçons du MÊME sujet.
 * Ce qui devient GLOBAL : la purge, le colorateur (donc la feuille, assemblée une seule fois), le
 * manifeste, la carte d'imports, l'unicité des slugs et le contrôle des poids. Une collision de
 * sujet entre deux racines fait ÉCHOUER en nommant le sujet (`generer-manifeste.mjs`).
 *
 * Usage :
 *   node tools/content-pipeline/build.mjs [--racine <dossier>]… [--sortie <dossier>] [--css <fichier>]
 *                                         [--inclure-brouillons] [--cache-diagrammes <dossier>]
 */
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assemblerFeuille, compilerRacine, creerColorateur } from './compiler-markdown.mjs';
import {
  controlerSvgCompiles,
  creerRendeurMermaid,
  extraireDiagrammes,
  recenserFichiersLecon,
} from './rendre-mermaid.mjs';
import { ecrireAtomique, ecrireContenuGenere } from './generer-manifeste.mjs';
import { verifierPoids } from './verifier-poids.mjs';

const RACINE_DEPOT = process.cwd();

/**
 * LES RACINES COMPILÉES PAR DÉFAUT — UNE LISTE NOMINATIVE, JAMAIS UN BALAYAGE (E7, lot A).
 *
 * Le pipeline compile PLUSIEURS sujets en une exécution : le cours de sécurité et le cours de PHP
 * vivent côte à côte sous `content/cours/`, et l'application n'a qu'un manifeste. Il aurait été
 * plus court de balayer `content/cours/*` — c'est précisément ce qu'on refuse : un dossier déposé
 * par erreur, ou une branche de travail oubliée, serait alors compilé, écrit dans l'artéfact et
 * déployé sans qu'aucun humain l'ait décidé. C'est le patron « liste blanche nominative » de
 * `.claude/rules/security.md` §4, appliqué au contenu : ouvrir un sujet est un geste qui se
 * commite ici, en une ligne qu'une revue voit passer.
 *
 * ⚠️ Une racine de cette liste qui n'existe pas — ou qui existe sans porter la moindre leçon —
 * n'est PAS une faute : voir l'en-tête du fichier, « les deux cas d'absence ». `content/cours/php`
 * ne porte aujourd'hui qu'un `horaire.json`, et c'est un état légitime.
 */
const RACINES_PAR_DEFAUT = ['content/cours/securite-web', 'content/cours/php'];

/** Dossier des sorties destinées à l'application Angular. Gitignoré, réécrit intégralement. */
const SORTIE_PAR_DEFAUT = 'src/content-generated';

/** Feuille de coloration syntaxique produite par Shiki. Gitignorée, `@use` par `src/styles.scss`. */
const CSS_PAR_DEFAUT = 'src/styles/_coloration-syntaxique-generee.scss';

/**
 * Nom EXIGÉ du dossier de sortie. `--sortie` existe pour les tests, qui écrivent dans un dossier
 * jetable — et il pointe un `rmSync(recursive)`. Un `--sortie src` mal tapé effacerait le code de
 * l'application. Le garde-fou est bête exprès : le dossier doit s'appeler ainsi, et vivre dans le
 * dépôt.
 */
const NOM_SORTIE_EXIGE = 'content-generated';

/** Le validateur, invoqué en PROCESSUS FILS (voir `etapeValider`). */
const VALIDATEUR = fileURLToPath(new URL('./valider.mjs', import.meta.url));

// ---------------------------------------------------------------------------
// Sorties
// ---------------------------------------------------------------------------

/**
 * Interrompt la construction en disant QUEL fichier et QUOI FAIRE. Un message qui ne contient que
 * « échec de la compilation » oblige le lecteur à refaire l'enquête que ce script vient de faire.
 *
 * @param {string} message
 * @param {readonly string[]} [details]
 * @returns {never}
 */
function echec(message, details = []) {
  console.error(`\n✖ content:build : ${message}`);
  for (const d of details) console.error(`   · ${d}`);
  console.error('');
  process.exit(1);
}

/**
 * @param {string} chemin chemin absolu
 * @returns {string} relatif au dépôt, en séparateurs POSIX
 */
function afficher(chemin) {
  return relative(RACINE_DEPOT, chemin).replaceAll('\\', '/') || '.';
}

/** @param {string} message */
function etape(message) {
  console.log(`content:build · ${message}`);
}

/**
 * @param {string} chemin
 * @returns {boolean}
 */
function estDossier(chemin) {
  try {
    return statSync(chemin).isDirectory();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Étapes
// ---------------------------------------------------------------------------

/**
 * Étape 2 — purge. Le dossier de sortie est RECONSTRUIT à chaque exécution, jamais mis à jour.
 *
 * Pourquoi : une leçon renommée ou supprimée laisserait sinon son `<slug>.json` sur le disque.
 * Le manifeste ne la citerait plus, la carte non plus — mais le fichier resterait, et le prochain
 * développeur qui ouvrirait `src/content-generated/` lirait une leçon qui n'existe plus. Pire, une
 * exécution partielle mêlerait deux générations. Purger rend l'état de sortie une FONCTION de
 * `content/`, pas un historique.
 *
 * @param {string} dossierSortie chemin absolu, déjà validé
 */
function etapePurger(dossierSortie) {
  rmSync(dossierSortie, { recursive: true, force: true });
  etape(`2/5 purge — ${afficher(dossierSortie)}`);
}

/**
 * Étape 1 — validation, EN PROCESSUS FILS.
 *
 * `valider.mjs` n'exporte rien : il exécute sa ligne de commande au chargement du module et sort en
 * `process.exit()`. L'importer ferait valider au moment de l'`import`, avant même l'analyse des arguments, et le
 * moindre refus tuerait ce processus-ci sans que l'orchestrateur puisse dire ce qu'il faisait. Le
 * processus fils garde la frontière nette : un code de retour, et le journal de l'enfant hérité tel
 * quel (`stdio: 'inherit'`) — l'auteur voit SES anomalies, dans le format du validateur.
 *
 * @param {string} racineAbsolue
 */
function etapeValider(racineAbsolue) {
  const resultat = spawnSync(process.execPath, [VALIDATEUR, '--racine', racineAbsolue], {
    stdio: 'inherit',
    cwd: RACINE_DEPOT,
  });
  if (resultat.error !== undefined) {
    echec("le validateur n'a pas pu être lancé", [
      `commande : node ${afficher(VALIDATEUR)} --racine ${afficher(racineAbsolue)}`,
      String(resultat.error.message),
    ]);
  }
  if (resultat.status !== 0) {
    // LA RACINE EST NOMMÉE, ET CE N'EST PAS DÉCORATIF DEPUIS QU'IL Y EN A PLUSIEURS : le
    // validateur tourne une fois par racine, ses anomalies s'impriment fichier par fichier, et
    // sans ce nom l'auteur ne sait pas lequel des sujets a fait tomber la construction.
    echec(
      `contenu refusé par le validateur (code ${String(resultat.status)}) — racine « ${afficher(racineAbsolue)} »`,
      [
        'les anomalies sont listées ci-dessus, fichier par fichier',
        'corriger les fichiers nommés, puis relancer : npm run content:build',
      ],
    );
  }
  etape(`1/5 validation — ${afficher(racineAbsolue)} : contenu conforme au schéma`);
}

/**
 * Étape 3 — compilation, diagrammes compris.
 *
 * ⚠️ LE COLORATEUR VIENT DE L'APPELANT, IL N'EST PAS CRÉÉ ICI — voir `principal()` et l'en-tête de
 * `compilerRacine`. Un colorateur par racine rendrait une feuille COMPLÈTE par racine, et leur
 * concaténation dupliquerait l'enveloppe écran/impression.
 *
 * @param {string} racineAbsolue
 * @param {string | undefined} cacheDiagrammes dossier de cache des SVG, ou `undefined` pour le défaut
 * @param {import('./compiler-markdown.mjs').Colorateur} colorateur le colorateur PARTAGÉ par toutes les racines de l'exécution
 * @returns {Promise<{ lecons: LeconCompilee[], feuille: string, horaire: HoraireCompile | null, exercices: ExercicesCompiles | null, sujetsFreres: string[] }>}
 */
async function etapeCompiler(racineAbsolue, cacheDiagrammes, colorateur) {
  /** @type {((code: string) => { svg: string, titreAccessible: string, descriptionLongue: string }) | undefined} */
  let rendreMermaid;

  if (existsSync(racineAbsolue)) {
    const fichiers = recenserFichiersLecon(racineAbsolue);
    const sources = fichiers.map((chemin) => ({ chemin, source: readFileSync(chemin, 'utf8') }));
    const avecDiagrammes = sources.filter(({ source }) => extraireDiagrammes(source).length > 0);

    if (avecDiagrammes.length > 0) {
      // Construire le rendeur n'exige AUCUN outil : Chromium et `mmdc` ne sont
      // localisés que si un socle manque au cache — voir l'en-tête du fichier.
      const rendeur = creerRendeurMermaid(
        cacheDiagrammes === undefined ? {} : { cache: cacheDiagrammes },
      );
      for (const { chemin, source } of avecDiagrammes) rendeur.prechargerLecon(chemin, source);
      rendeur.journaliser();
      rendreMermaid = rendeur.rendre;
    } else {
      etape(
        `3/5 diagrammes — ${afficher(racineAbsolue)} : aucun bloc « mermaid » dans ${sources.length} leçon(s), Chromium non démarré`,
      );
    }
  }

  const compile = await compilerRacine(racineAbsolue, { rendreMermaid, colorateur });

  // LE CONTRÔLE FINAL VIT ICI, ET NULLE PART AILLEURS. Il était logé dans le
  // harnais `node rendre-mermaid.mjs --racine …`, que `npm run content:build`
  // n'exécute jamais : ni la CI ni un développeur n'empruntent ce chemin, donc le
  // garde-fou ne gardait rien (S-003). Il porte sur l'AST RÉELLEMENT écrit — chaque
  // `svg` repasse par l'analyseur, et aucun identifiant n'est partagé entre deux
  // diagrammes (axe `duplicate-id-aria`, et un `url(#…)` qui pointerait chez le
  // voisin). Le compte s'imprime TOUJOURS, même à zéro : un gate qui n'a rien vu
  // doit se voir dans le journal (L-005).
  const controle = controlerSvgCompiles(compile.lecons);
  etape(
    `3/5 compilation — ${afficher(racineAbsolue)} : ${compile.lecons.length} leçon(s) · ` +
      `${controle.svg} SVG contrôlé(s) · ` +
      `${controle.uniques}/${controle.identifiants} identifiant(s) unique(s)`,
  );
  return compile;
}

// ---------------------------------------------------------------------------
// Ligne de commande
// ---------------------------------------------------------------------------

/**
 * ⚠️ `--racine` EST RÉPÉTABLE, ET IL REMPLACE LA LISTE PAR DÉFAUT — il ne s'y ajoute pas.
 * Deux occurrences compilent deux racines ; une seule en compile une, et le défaut multi-sujet ne
 * se glisse alors PAS dans le dos de l'appelant. C'est ce qui garde utilisables les dizaines de
 * `--racine <fixture>` des specs : chacune veut mesurer SA racine, jamais celle-là plus le corpus
 * de production.
 *
 * @returns {{ racines: string[], racinesExplicites: boolean, sortie: string, css: string,
 *             inclureBrouillons: boolean, cacheDiagrammes: string | undefined }}
 */
function lireArguments() {
  const args = process.argv.slice(2);
  /** @type {string[]} */
  const racines = [];
  let sortie = SORTIE_PAR_DEFAUT;
  let css = CSS_PAR_DEFAUT;
  let inclureBrouillons = false;
  /** @type {string | undefined} */
  let cacheDiagrammes;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    // Le SEUL drapeau booléen : il n'attend pas de valeur, et il se traite avant le contrôle
    // ci-dessous, qui exige un chemin derrière chaque option.
    if (arg === '--inclure-brouillons') {
      inclureBrouillons = true;
      continue;
    }
    if (
      arg !== '--racine' &&
      arg !== '--sortie' &&
      arg !== '--css' &&
      arg !== '--cache-diagrammes'
    ) {
      echec(`option inconnue : « ${String(arg)} »`, [
        'usage : node tools/content-pipeline/build.mjs [--racine <dossier>]… [--sortie <dossier>]',
        '                                             [--css <fichier>] [--inclure-brouillons]',
        '                                             [--cache-diagrammes <dossier>]',
        '--racine est RÉPÉTABLE : chaque occurrence ajoute une racine, et la première remplace',
        `la liste par défaut (${RACINES_PAR_DEFAUT.join(', ')})`,
      ]);
    }
    const valeur = args[i + 1];
    if (valeur === undefined || valeur.startsWith('--')) {
      echec(`l'option ${arg} attend un chemin`);
    }
    if (arg === '--racine') racines.push(valeur);
    else if (arg === '--sortie') sortie = valeur;
    else if (arg === '--cache-diagrammes') cacheDiagrammes = valeur;
    else css = valeur;
    i += 1;
  }
  const racinesExplicites = racines.length > 0;
  return {
    racines: racinesExplicites ? racines : [...RACINES_PAR_DEFAUT],
    racinesExplicites,
    sortie,
    css,
    inclureBrouillons,
    cacheDiagrammes,
  };
}

/**
 * Résout, dédoublonne et éprouve la liste des racines à compiler — AVANT toute purge, pour qu'un
 * refus laisse intacte la génération précédente.
 *
 * @param {readonly string[]} racines chemins tels que demandés, relatifs ou absolus
 * @param {boolean} racinesExplicites `true` si elles viennent de `--racine` et non du défaut
 * @returns {{ racineAbsolue: string, presente: boolean }[]} dans l'ordre demandé
 */
function preparerRacines(racines, racinesExplicites) {
  /** @type {{ racineAbsolue: string, presente: boolean }[]} */
  const preparees = [];
  /** @type {Set<string>} */
  const vues = new Set();

  for (const racine of racines) {
    const racineAbsolue = resolve(RACINE_DEPOT, racine);

    // DEUX FOIS LA MÊME RACINE EST UNE FAUTE D'APPEL, PAS UNE DEMANDE DE DOUBLE COMPILATION. Sans
    // ce refus, la seconde passe rendrait exactement les mêmes leçons — donc les mêmes slugs — et
    // c'est le contrôle d'unicité de `ecrireContenuGenere` qui rougirait, sur une cause qui ne
    // nomme pas la vraie faute (« deux leçons portent le slug X » plutôt que « la racine X est
    // citée deux fois »). La faute la plus locale doit sortir la première.
    if (vues.has(racineAbsolue)) {
      echec(`racine citée deux fois — « ${afficher(racineAbsolue)} »`, [
        'chaque racine se compile une seule fois par exécution',
        'retirer l’occurrence en trop de la ligne de commande',
      ]);
    }
    vues.add(racineAbsolue);

    const presente = estDossier(racineAbsolue);
    if (!presente && racinesExplicites) {
      echec(`racine de contenu introuvable — « ${afficher(racineAbsolue)} »`, [
        `chemin demandé : ${racine}`,
        'ce chemin a été fourni explicitement par --racine : une faute de frappe est plus probable',
        "qu'un contenu absent, donc la construction s'arrête au lieu de produire zéro leçon en silence",
      ]);
    }
    preparees.push({ racineAbsolue, presente });
  }
  return preparees;
}

async function principal() {
  const { racines, racinesExplicites, sortie, css, inclureBrouillons, cacheDiagrammes } =
    lireArguments();

  const sortieAbsolue = resolve(RACINE_DEPOT, sortie);
  const cssAbsolu = resolve(RACINE_DEPOT, css);

  // Garde-fou du `rmSync` — voir NOM_SORTIE_EXIGE.
  const dansLeDepot = !relative(RACINE_DEPOT, sortieAbsolue).startsWith('..');
  if (!dansLeDepot || !sortieAbsolue.endsWith(NOM_SORTIE_EXIGE)) {
    echec(`dossier de sortie refusé : ${afficher(sortieAbsolue)}`, [
      `il doit vivre dans le dépôt et se nommer « ${NOM_SORTIE_EXIGE} » — ce chemin est effacé`,
      'récursivement à chaque exécution, et le garde-fou est le seul rempart contre une faute de frappe',
    ]);
  }

  const presence = preparerRacines(racines, racinesExplicites);
  const racinesAbsolues = presence.map(({ racineAbsolue }) => racineAbsolue);

  console.log('');

  // LE NOMBRE DE RACINES S'ANNONCE AVANT TOUT LE RESTE, MÊME À UNE (L-005). Le pipeline compile
  // désormais plusieurs sujets : sans cette ligne, « la liste par défaut a bien deux racines » et
  // « une seule racine a été retenue » s'écriraient exactement pareil dans le journal, et un
  // manifeste amputé d'un sujet entier passerait pour un manifeste normal.
  etape(
    `0/5 racines — ${racinesAbsolues.length} racine(s)` +
      (racinesExplicites ? ' (--racine)' : ' (liste par défaut)') +
      ` : ${racinesAbsolues.map(afficher).join(', ')}`,
  );

  // LA VALIDATION PRÉCÈDE LA PURGE, ET CE N'EST PAS UN DÉTAIL D'ORDONNANCEMENT.
  // Le validateur ne lit que `content/` — jamais la sortie — donc rien ne l'oblige à passer
  // après l'effacement. L'ordre inverse, tenu jusqu'au 2026-08-26, avait ce défaut mesuré :
  // un contenu refusé laissait `src/content-generated/` VIDE, et `npm test` / `npm start`
  // tombaient ensuite sur une erreur Sass (`@use 'styles/coloration-syntaxique-generee'`) qui
  // ne nommait pas la cause. Ce n'était pas un cas rare : c'est l'état NORMAL pendant la
  // rédaction d'un module, où `lecon.md` est déposé avant son `quiz.json`. Constaté ce
  // jour-là : un agent qui ne touchait pas au contenu a attendu que l'arbre redevienne
  // constructible. Valider d'abord rend l'échec inoffensif — l'arbre précédent survit intact.
  // ⚠️ TOUTES LES RACINES SONT VALIDÉES AVANT QUE LA PREMIÈRE NE SOIT COMPILÉE, et c'est le même
  // raisonnement porté au multi-racine : un refus sur la SECONDE racine ne doit pas laisser
  // derrière lui une purge déjà faite. Le validateur reste mono-racine par exécution — il juge
  // les slugs, les renvois et l'horaire d'UN sujet — donc un processus fils par racine.
  for (const { racineAbsolue, presente } of presence) {
    if (presente) {
      etapeValider(racineAbsolue);
    } else {
      etape(`1/5 validation — sautée : ${afficher(racineAbsolue)} n'existe pas encore`);
    }
  }

  etapePurger(sortieAbsolue);

  // UN SEUL COLORATEUR POUR TOUTES LES RACINES — voir l'en-tête de `compilerRacine`. Il accumule
  // les classes de coloration de tous les blocs de code de l'exécution, et `assemblerFeuille` ne
  // l'enveloppe qu'UNE fois, après la boucle : concaténer une feuille par racine dupliquerait
  // l'en-tête, la bascule écran/impression et les commentaires épinglés.
  const colorateur = await creerColorateur();

  /** @type {LeconCompilee[]} */
  const lecons = [];
  /** @type {(HoraireCompile | null)[]} */
  const horairesCompiles = [];
  /** @type {(ExercicesCompiles | null)[]} */
  const exercicesCompiles = [];
  /** @type {string[]} */
  const freresParRacine = [];

  for (const { racineAbsolue } of presence) {
    const compile = await etapeCompiler(racineAbsolue, cacheDiagrammes, colorateur);
    lecons.push(...compile.lecons);
    horairesCompiles.push(compile.horaire);
    exercicesCompiles.push(compile.exercices);
    freresParRacine.push(
      `${afficher(racineAbsolue)} → ${compile.sujetsFreres.length > 0 ? compile.sujetsFreres.join(', ') : 'aucun'}`,
    );
  }

  // ÉCRITURE INCONDITIONNELLE — c'est le cœur du lot. Voir l'en-tête : zéro leçon écrit quand même
  // la feuille, le manifeste et la carte, sinon `src/styles.scss` perd sa cible sur un clone frais.
  ecrireAtomique(cssAbsolu, assemblerFeuille(colorateur.feuille()));
  const { entrees, ecartees, incluses, horaires, exercices: registres } = ecrireContenuGenere(
    sortieAbsolue,
    lecons,
    {
      inclureBrouillons,
      // UNE ENTRÉE PAR RACINE, `null` COMPRIS. C'est l'écrivain qui refuse deux horaires d'un même
      // sujet — un `null` (racine sans ancrage au cours) est ignoré, une collision de sujet fait
      // échouer en la nommant. Même geste, même raison, pour le registre d'exercices.
      horaires: horairesCompiles,
      exercices: exercicesCompiles,
    },
  );
  // L'HORAIRE S'ANNONCE MÊME À ZÉRO (L-005) : sans cette ligne, « aucun horaire dans la racine »
  // et « lecture de l'horaire débranchée » s'écriraient exactement pareil dans le journal.
  const sujetsAvecHoraire = Object.keys(horaires);
  // LE REGISTRE D'EXERCICES S'ANNONCE MÊME À ZÉRO, POUR LA MÊME RAISON (L-005) — et il annonce le
  // COMPTE d'exercices, pas seulement le nombre de sujets : c'est ce compte que le gate de
  // complétude oppose aux encadrés posés, et le lire au journal est ce qui distingue « le registre
  // est vide » de « la lecture du registre est débranchée ».
  const sujetsAvecExercices = Object.entries(registres).map(
    ([sujet, registre]) =>
      `${sujet} (${registre.seances.reduce((total, s) => total + s.exercices.length, 0)} exercice(s) sur ${registre.seances.length} séance(s))`,
  );
  etape(
    `4/5 sorties — ${afficher(cssAbsolu)} · ${entrees.length} entrée(s) de manifeste · ` +
      `carte de ${entrees.length} import(s) paresseux · ` +
      `${sujetsAvecHoraire.length} horaire(s) de sujet` +
      (sujetsAvecHoraire.length > 0 ? ` : ${sujetsAvecHoraire.join(', ')}` : ''),
  );
  etape(
    `4/5 exercices — ${sujetsAvecExercices.length} registre(s) de sujet` +
      (sujetsAvecExercices.length > 0 ? ` : ${sujetsAvecExercices.join(', ')}` : ''),
  );
  // LE REGISTRE DES SUJETS FRÈRES S'ANNONCE MÊME À ZÉRO, POUR LA MÊME RAISON (L-005). C'est lui
  // qui borne ce qu'un `{cours="…"}` peut nommer (§3bis) : sans cette ligne, « la racine n'a aucun
  // sujet frère » et « la lecture du registre est débranchée » s'écriraient exactement pareil, et
  // un renvoi refusé enverrait chercher la faute dans la leçon plutôt que dans l'arborescence.
  etape(
    `4/5 sujets frères — registre de ${freresParRacine.length} racine(s) : ` +
      freresParRacine.join(' · '),
  );
  // LE FILTRE S'ANNONCE TOUJOURS, MÊME À ZÉRO (L-005) : un gate qui n'a rien retiré doit se voir
  // dans le journal, sinon « aucun brouillon » et « filtre débranché » s'écrivent pareil.
  etape(
    `4/5 publication — ${ecartees.length} leçon(s) non publiée(s) écartée(s)` +
      (ecartees.length > 0 ? ` : ${ecartees.join(', ')}` : ''),
  );
  if (incluses.length > 0) {
    // Bruyant à dessein : cet artéfact porte des leçons que personne n'a décidé de publier.
    console.warn(
      `\n⚠️ content:build : --inclure-brouillons — ${incluses.length} leçon(s) NON PUBLIÉE(S) ` +
        `écrite(s) dans l'artéfact : ${incluses.join(', ')}.\n` +
        "   Cet artéfact est destiné à `npm start` et à la relecture éditoriale — il ne se déploie pas.\n",
    );
  }

  const { echecs } = verifierPoids(join(sortieAbsolue, 'lecons'));
  if (echecs > 0) {
    echec(`${echecs} leçon(s) dépassent le seuil de poids`, [
      'la table ci-dessus nomme les leçons fautives',
      'alléger la leçon (les SVG de diagrammes dominent le poids) ou la scinder en deux',
    ]);
  }
  etape(`5/5 poids — ${echecs} dépassement(s)`);

  console.log(
    `\n✔ content:build : ${lecons.length} leçon(s) compilée(s) depuis ` +
      `${racinesAbsolues.length} racine(s) : ${racinesAbsolues.map(afficher).join(', ')}.\n`,
  );
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await principal();
}
