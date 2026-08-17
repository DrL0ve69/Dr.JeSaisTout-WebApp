#!/usr/bin/env node
/**
 * ORCHESTRATEUR DU PIPELINE DE CONTENU — E2-ST1, lot 4
 * =============================================================================
 * L'unique point d'entrée du contenu-as-code : `npm run content:build`. Cinq étapes, dans cet
 * ordre, et aucune n'est facultative :
 *
 *   1. PURGE de `src/content-generated/` — avant toute écriture.
 *   2. VALIDATION (`valider.mjs`) — une leçon malformée fait échouer la construction ICI, là où le
 *      message peut encore nommer le fichier et le champ fautifs.
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
 *   MÊME. C'est l'état RÉEL du dépôt jusqu'à E3 : `content/` ne contient que son `README.md`.
 *   Le piège, et il est vicieux : `src/styles.scss` fait `@use 'styles/coloration-syntaxique-generee'`
 *   sur une feuille GITIGNORÉE, que seul ce pipeline produit. Un générateur qui « saute » l'écriture
 *   quand il n'a rien à compiler laisse donc, sur tout clone frais, un `@use` sans cible — et c'est
 *   `npm test` qui tombe EN PREMIER (le spec du design system compile la feuille globale), avant même
 *   `npm run build`. D'où la règle : ZÉRO leçon écrit une feuille vide, un manifeste vide et une carte
 *   vide. Le vide est un résultat, pas une raison de ne rien faire.
 *
 * ─── CHROMIUM N'EST DEMANDÉ QUE S'IL EST NÉCESSAIRE ────────────────────────────────────────────
 * `creerRendeurMermaid()` localise `mmdc` ET le Chromium de Playwright À LA CONSTRUCTION, et échoue
 * si l'un manque. Le construire inconditionnellement rendrait `npm test` impossible sur un poste
 * qui n'a pas encore lancé `npm run e2e:install` — alors qu'avec `content/` vide, aucun diagramme
 * n'est à rendre. On lit donc les sources, on cherche un bloc ` ```mermaid `, et on ne construit le
 * rendeur que s'il y en a au moins un.
 *
 * Usage :
 *   node tools/content-pipeline/build.mjs [--racine <dossier>] [--sortie <dossier>] [--css <fichier>]
 */
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compilerRacine } from './compiler-markdown.mjs';
import {
  controlerSvgCompiles,
  creerRendeurMermaid,
  extraireDiagrammes,
  recenserFichiersLecon,
} from './rendre-mermaid.mjs';
import { ecrireAtomique, ecrireContenuGenere } from './generer-manifeste.mjs';
import { verifierPoids } from './verifier-poids.mjs';

const RACINE_DEPOT = process.cwd();

/** Chemin canonique du cours (backlog §E2-ST1, §E3). */
const RACINE_PAR_DEFAUT = 'content/cours/securite-web';

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
 * Étape 1 — purge. Le dossier de sortie est RECONSTRUIT à chaque exécution, jamais mis à jour.
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
  etape(`1/5 purge — ${afficher(dossierSortie)}`);
}

/**
 * Étape 2 — validation, EN PROCESSUS FILS.
 *
 * `valider.mjs` n'exporte rien : il exécute sa ligne de commande au chargement du module et sort en
 * `process.exit()`. L'importer ferait valider au moment de l'`import`, avant même la purge, et le
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
    echec(`contenu refusé par le validateur (code ${String(resultat.status)})`, [
      'les anomalies sont listées ci-dessus, fichier par fichier',
      'corriger les fichiers nommés, puis relancer : npm run content:build',
    ]);
  }
  etape('2/5 validation — contenu conforme au schéma');
}

/**
 * Étape 3 — compilation, diagrammes compris.
 *
 * @param {string} racineAbsolue
 * @returns {Promise<{ lecons: LeconCompilee[], feuille: string }>}
 */
async function etapeCompiler(racineAbsolue) {
  /** @type {((code: string) => { svg: string, titreAccessible: string, descriptionLongue: string }) | undefined} */
  let rendreMermaid;

  if (existsSync(racineAbsolue)) {
    const fichiers = recenserFichiersLecon(racineAbsolue);
    const sources = fichiers.map((chemin) => ({ chemin, source: readFileSync(chemin, 'utf8') }));
    const avecDiagrammes = sources.filter(({ source }) => extraireDiagrammes(source).length > 0);

    if (avecDiagrammes.length > 0) {
      // Chromium n'est demandé qu'ici — voir l'en-tête du fichier.
      const rendeur = creerRendeurMermaid();
      for (const { chemin, source } of avecDiagrammes) rendeur.prechargerLecon(chemin, source);
      rendeur.journaliser();
      rendreMermaid = rendeur.rendre;
    } else {
      etape(
        `3/5 diagrammes — aucun bloc « mermaid » dans ${sources.length} leçon(s), Chromium non démarré`,
      );
    }
  }

  const compile = await compilerRacine(racineAbsolue, { rendreMermaid });

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
    `3/5 compilation — ${compile.lecons.length} leçon(s) · ${controle.svg} SVG contrôlé(s) · ` +
      `${controle.uniques}/${controle.identifiants} identifiant(s) unique(s)`,
  );
  return compile;
}

// ---------------------------------------------------------------------------
// Ligne de commande
// ---------------------------------------------------------------------------

/**
 * @returns {{ racine: string, racineExplicite: boolean, sortie: string, css: string }}
 */
function lireArguments() {
  const args = process.argv.slice(2);
  let racine = RACINE_PAR_DEFAUT;
  let racineExplicite = false;
  let sortie = SORTIE_PAR_DEFAUT;
  let css = CSS_PAR_DEFAUT;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg !== '--racine' && arg !== '--sortie' && arg !== '--css') {
      echec(`option inconnue : « ${String(arg)} »`, [
        'usage : node tools/content-pipeline/build.mjs [--racine <dossier>] [--sortie <dossier>]',
        '                                             [--css <fichier>]',
      ]);
    }
    const valeur = args[i + 1];
    if (valeur === undefined || valeur.startsWith('--')) {
      echec(`l'option ${arg} attend un chemin`);
    }
    if (arg === '--racine') {
      racine = valeur;
      racineExplicite = true;
    } else if (arg === '--sortie') sortie = valeur;
    else css = valeur;
    i += 1;
  }
  return { racine, racineExplicite, sortie, css };
}

async function principal() {
  const { racine, racineExplicite, sortie, css } = lireArguments();

  const racineAbsolue = resolve(RACINE_DEPOT, racine);
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

  const racinePresente = estDossier(racineAbsolue);
  if (!racinePresente && racineExplicite) {
    echec(`racine de contenu introuvable — « ${afficher(racineAbsolue)} »`, [
      `chemin demandé : ${racine}`,
      'ce chemin a été fourni explicitement par --racine : une faute de frappe est plus probable',
      "qu'un contenu absent, donc la construction s'arrête au lieu de produire zéro leçon en silence",
    ]);
  }

  console.log('');
  etapePurger(sortieAbsolue);

  if (racinePresente) {
    etapeValider(racineAbsolue);
  } else {
    etape(
      `2/5 validation — sautée : ${afficher(racineAbsolue)} n'existe pas encore (attendu avant E3)`,
    );
  }

  const { lecons, feuille } = await etapeCompiler(racineAbsolue);

  // ÉCRITURE INCONDITIONNELLE — c'est le cœur du lot. Voir l'en-tête : zéro leçon écrit quand même
  // la feuille, le manifeste et la carte, sinon `src/styles.scss` perd sa cible sur un clone frais.
  ecrireAtomique(cssAbsolu, feuille);
  const { entrees } = ecrireContenuGenere(sortieAbsolue, lecons);
  etape(
    `4/5 sorties — ${afficher(cssAbsolu)} · ${entrees.length} entrée(s) de manifeste · ` +
      `carte de ${entrees.length} import(s) paresseux`,
  );

  const { echecs } = verifierPoids(join(sortieAbsolue, 'lecons'));
  if (echecs > 0) {
    echec(`${echecs} leçon(s) dépassent le seuil de poids`, [
      'la table ci-dessus nomme les leçons fautives',
      'alléger la leçon (les SVG de diagrammes dominent le poids) ou la scinder en deux',
    ]);
  }
  etape(`5/5 poids — ${echecs} dépassement(s)`);

  console.log(
    `\n✔ content:build : ${lecons.length} leçon(s) compilée(s) depuis ${afficher(racineAbsolue)}.\n`,
  );
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await principal();
}
