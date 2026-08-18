// =============================================================================
// Sonde de violations de CSP — le CODE partagé par les specs qui mesurent la
// politique RÉELLEMENT APPLIQUÉE par un navigateur (leçon S-005)
// -----------------------------------------------------------------------------
// POURQUOI CE MODULE EXISTE, ET POURQUOI IL EST NÉ AU LOT E-c2 D'E2-ST3.
// `bascule-theme.spec.ts` portait déjà cette sonde, mais elle n'y voyait qu'UNE
// page : la coquille d'accueil, dont le seul élément interactif est la bascule de
// thème. Le lot E-c2 ajoute la page de leçon INTERACTIVE — un chunk paresseux, une
// hydratation, cinq questions actionnées, une correction — qui doit franchir la
// MÊME barre. Recopier les trois collecteurs dans un second spec aurait donné deux
// définitions de « aucune violation de CSP » libres de diverger en silence : c'est
// le motif L-016 du dépôt. Le PARCOURS mesuré change de page en page ; la
// DÉFINITION de la mesure, non — elle vit ici.
//
// ⚠️ CE MODULE NE NAVIGUE NULLE PART ET N'ASSERTE AUCUN ZÉRO. Il installe, il
// relit, il exige qu'une politique soit servie. Ce qui compte comme « parcours »
// et l'instant où l'on conclut appartiennent à l'appelant — c'est précisément ce
// qui distingue les deux specs qui l'emploient.
//
// 🔴 LES DEUX FAIL-OPEN QU'IL FERME, ET QU'AUCUN ZÉRO NE FERMERAIT SEUL.
//   a. UNE CSP EST-ELLE SEULEMENT SERVIE ? `findSWAConfigFile` de l'émulateur SWA
//      (`node_modules/@azure/static-web-apps-cli/dist/core/utils/user-config.js`)
//      rend `null` quand `staticwebapp.config.json` est absent OU invalide, et
//      `swa start` démarre quand même — sans `globalHeaders`, sans code d'erreur.
//      Sans en-tête servi, tout « zéro violation » serait vert en l'absence TOTALE
//      de politique. D'où `exigerCspServie`, appelée sur la réponse de la
//      navigation. Classe S-003 : un garde-fou doit prouver qu'il a vu quelque
//      chose, pas seulement bien refuser ce qu'il voit.
//   b. LA SONDE MORD-ELLE ? Une sonde silencieusement cassée rend elle aussi une
//      liste vide. `lireViolations` LÈVE si le journal du document est absent, et
//      chaque spec appelant porte en plus un CONTRÔLE POSITIF (L-019) : un script
//      inline non haché injecté doit être refusé, compté et journalisé.
// =============================================================================

import { type ConsoleMessage, type Page, type Response as ReponsePlaywright, expect } from '@playwright/test';

/**
 * Ce à quoi ressemble une violation de CSP dans la console de Chromium.
 *
 * Deux motifs plutôt qu'un : le premier couvre le refus d'exécution/chargement
 * (« Refused to execute inline script… », « Refused to load the stylesheet… »), le
 * second attrape toute formulation qui nomme la politique elle-même. Le libellé
 * exact appartient au moteur et peut changer d'une version à l'autre — c'est
 * pourquoi ce filet de console ne travaille jamais SEUL : la mesure de référence
 * est l'événement `securitypolicyviolation`, que le navigateur émet quoi qu'il
 * écrive dans la console (voir `surveiller`).
 */
export const MOTIFS_CSP = /Refused to |Content Security Policy|violates the following/i;

/**
 * Une violation telle que la PAGE l'a enregistrée.
 *
 * La clé — `<jeton du document>:<n° dans ce document>` — n'est pas décorative :
 * elle rend exacte la fusion des deux journaux (voir `lireViolations`). Deux
 * refus identiques (même directive, même ressource) restent deux entrées, et une
 * même entrée vue des deux côtés n'est comptée qu'une fois.
 */
export interface ViolationCsp {
  readonly cle: string;
  /** `directive effective ← ressource bloquée`. */
  readonly detail: string;
}

/**
 * Les crochets que CETTE sonde pose dans la page, et eux seuls.
 *
 * Les specs appelants étendent cette interface avec les leurs (marqueur
 * anti-flash, témoin d'exécution du script interdit…) plutôt que de les inscrire
 * ici : ce module ne connaît que la CSP.
 */
export interface FenetreSondeeCsp extends Window {
  __drjstViolationCsp?: (violation: ViolationCsp) => void;
  /** Le journal des violations DU DOCUMENT COURANT, relu de façon synchrone. */
  __drjstViolationsCsp?: ViolationCsp[];
}

export interface JournalPage {
  /**
   * Les violations remontées jusqu'à Node, indexées par clé. Ce journal-ci
   * SURVIT aux rechargements (le journal de la page, lui, repart à vide à chaque
   * document) — c'est sa raison d'être, et sa seule.
   */
  readonly violations: Map<string, string>;
  /** TOUTE la console, sans tri par niveau. */
  readonly messages: string[];
  /** Les exceptions non rattrapées. */
  readonly erreurs: string[];
}

/**
 * Installe les trois collecteurs. À appeler AVANT `page.goto` : une violation qui
 * survient au chargement — le cas le plus probable, puisque le script anti-flash
 * est inline dans le `<head>` — est perdue si l'on s'abonne après.
 */
export async function surveiller(page: Page): Promise<JournalPage> {
  const violations = new Map<string, string>();
  const messages: string[] = [];
  const erreurs: string[] = [];

  // 1. LE SIGNAL PRÉCIS. Le navigateur émet un `securitypolicyviolation` sur le
  //    document pour CHAQUE ressource refusée, indépendamment de ce qu'il écrit
  //    dans la console. `exposeFunction` et `addInitScript` passent par le
  //    protocole de débogage, hors de portée de la CSP : le collecteur ne peut pas
  //    être bloqué par ce qu'il est chargé de mesurer.
  //
  //    ⚠️ CHAQUE VIOLATION EST ÉCRITE DEUX FOIS, ET C'EST LE POINT. Le passage par
  //    `exposeFunction` est ASYNCHRONE (aller-retour CDP) : une violation déclenchée
  //    par le dernier `reload()` ou par la fin de l'hydratation peut arriver côté
  //    Node APRÈS l'`expect`, et la suite tourne avec `retries: 0` — le faux
  //    NÉGATIF serait intermittent et se lirait comme un succès. Le journal de la
  //    page, lui, se relit par `page.evaluate` : la lecture est alors synchrone
  //    avec le document, donc postérieure à tout ce que ce document a émis. Le
  //    journal Node reste indispensable pour l'inverse — il survit aux
  //    rechargements, que le journal de la page ne franchit pas. `lireViolations`
  //    fusionne les deux.
  await page.exposeFunction('__drjstViolationCsp', (violation: ViolationCsp) => {
    violations.set(violation.cle, violation.detail);
  });
  await page.addInitScript(() => {
    const fenetre = window as FenetreSondeeCsp;
    // Un jeton par document : deux documents successifs ne peuvent pas produire la
    // même clé, donc la fusion ne peut pas confondre deux violations distinctes.
    const jeton = Math.random().toString(36).slice(2);
    const journalDuDocument: ViolationCsp[] = [];
    fenetre.__drjstViolationsCsp = journalDuDocument;

    document.addEventListener('securitypolicyviolation', (evenement) => {
      const bloque = evenement.blockedURI || evenement.sourceFile || '(en ligne)';
      const violation = {
        cle: `${jeton}:${journalDuDocument.length}`,
        detail: `${evenement.effectiveDirective || evenement.violatedDirective} ← ${bloque}`,
      };
      journalDuDocument.push(violation);

      const versNode = fenetre.__drjstViolationCsp;
      if (versNode === undefined) {
        // Pas de `?.` ici : un binding absent est une PANNE DE SONDE, et une sonde
        // muette rend une liste vide, c'est-à-dire un test vert. L'exception
        // remonte en `pageerror`, que le parcours exige vide — la panne devient
        // donc rouge au lieu de passer pour une preuve.
        throw new Error('sonde de violations CSP : le binding Node `__drjstViolationCsp` est absent');
      }
      versNode(violation);
    });
  });

  // 2. LE FILET LARGE. Toute la console est conservée, tous niveaux confondus :
  //    aucun tri « on ignore les avertissements » ici, qui viderait le test de sa
  //    substance. Le tri se fait à l'ASSERTION, où il est nommé et justifié.
  page.on('console', (message: ConsoleMessage) => {
    messages.push(`[${message.type()}] ${message.text()}`);
  });

  // 3. LES EXCEPTIONS NON RATTRAPÉES. Une CSP qui refuse `eval` ne se manifeste pas
  //    toujours par un message de console : elle lève une `EvalError` dans la page.
  page.on('pageerror', (erreur) => {
    erreurs.push(erreur.message);
  });

  return { violations, messages, erreurs };
}

/**
 * Fusionne le journal de Node et celui du document courant, sans doublon.
 *
 * Lève si la sonde est absente de la page : une sonde qui ne s'est pas installée
 * rendrait `[]`, indiscernable d'un « aucune violation » légitime.
 */
export async function lireViolations(page: Page, journal: JournalPage): Promise<string[]> {
  const dansLaPage = await page.evaluate(
    () => (window as FenetreSondeeCsp).__drjstViolationsCsp ?? null,
  );
  if (dansLaPage === null) {
    throw new Error(
      "la sonde de violations est absente de la page : `addInitScript` ne s'est pas exécuté, aucune assertion sur la CSP ne vaudrait rien",
    );
  }

  const fusion = new Map(journal.violations);
  for (const violation of dansLaPage) {
    fusion.set(violation.cle, violation.detail);
  }
  return [...fusion.values()];
}

/**
 * Exige qu'une CSP soit RÉELLEMENT servie sur la réponse donnée, et qu'elle soit
 * la politique stricte du dépôt — voir le point (a) de l'en-tête.
 *
 * Les quatre contrôles ne sont pas interchangeables :
 *  · non vide — l'émulateur SWA démarre sans `globalHeaders` si sa configuration
 *    est absente ou invalide, et rien d'autre ne le dirait ;
 *  · `'self'` — la base `default-src`/`script-src` de la politique ;
 *  · `sha256-` — la preuve que les jetons `__HACHAGES_*__` de
 *    `config/staticwebapp.config.source.json` ont bien été RÉSOLUS par
 *    `tools/deploiement/generer-config-swa.mjs` ; servis tels quels, le site
 *    s'afficherait sans styles (même contrôle qu'à l'étape « Vérifier les en-têtes
 *    servis » de `.github/workflows/deploy.yml`, mais ici avant l'envoi) ;
 *  · ni `unsafe-inline` ni `unsafe-eval` — une politique qui les porterait
 *    laisserait passer, verts, tous les scénarios que les specs appelants
 *    existent pour surveiller.
 *
 * ⚠️ À APPELER SUR LA RÉPONSE DE LA PAGE MESURÉE, jamais sur celle d'une autre.
 * Les en-têtes de SWA sont globaux aujourd'hui, mais « aujourd'hui » n'est pas une
 * mesure : une route exclue demain des `globalHeaders` ne se verrait que là.
 *
 * @returns la politique servie, pour le diagnostic de l'appelant.
 */
export function exigerCspServie(reponse: ReponsePlaywright | null): string {
  expect(reponse, "la navigation n'a produit aucune réponse : le serveur ne répond pas").not.toBeNull();

  // `headers()` normalise les noms en minuscules.
  const politique = reponse?.headers()['content-security-policy'] ?? '';

  expect(
    politique,
    "aucun en-tête `Content-Security-Policy` servi. `swa start` démarre SANS `globalHeaders` quand `staticwebapp.config.json` est absent ou invalide (`findSWAConfigFile` rend `null`, sans code d'erreur) : tout le reste serait alors vert sans qu'aucune politique n'existe. Reconstruire (`npm run build`) avant de relancer",
  ).not.toBe('');
  expect(politique, "la CSP servie ne porte pas `'self'`").toContain("'self'");
  expect(
    politique,
    'la CSP servie ne porte aucun `sha256-` : les jetons `__HACHAGES_*__` ne sont pas résolus, ou les scripts/styles inline ne sont plus autorisés nominativement',
  ).toContain('sha256-');
  expect(politique, 'la CSP servie autorise `unsafe-inline`').not.toContain('unsafe-inline');
  expect(politique, 'la CSP servie autorise `unsafe-eval`').not.toContain('unsafe-eval');

  return politique;
}
