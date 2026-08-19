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

import { existsSync, readFileSync } from 'node:fs';

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
    //
    // ⚠️ `crypto.randomUUID()` ET NON `Math.random()` — constat SonarCloud
    // `typescript:S2245` sur la PR #17. Ici, l'enjeu n'est PAS la prédictibilité :
    // ce jeton n'autorise rien, il distingue deux journaux. Ce qui le motive est
    // qu'un `Math.random()` peut RÉPÉTER une valeur — c'est un générateur de 52
    // bits dont l'état repart d'une graine par contexte — et une clé répétée entre
    // deux documents ferait taire une violation par déduplication, donc rendrait ce
    // gate vert à tort. Le CSPRNG du navigateur est disponible partout ici (le
    // harnais sert la page en `localhost`, contexte sûr) et coûte le même geste.
    // Corollaire de méthode : sur un site qui enseigne la sécurité, on ne muselle
    // pas un constat d'analyseur par un commentaire — on prend la voie sûre quand
    // elle est gratuite.
    const jeton = crypto.randomUUID();
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

  exigerPolitiqueDeLArtefactCourant(politique);

  return politique;
}

/** Le `staticwebapp.config.json` que `swa start` est censé appliquer. */
const CONFIG_ARTEFACT = 'dist/dr-je-sais-tout/browser/staticwebapp.config.json';

/**
 * Exige que la politique SERVIE soit celle de l'artéfact PRÉSENT SUR LE DISQUE.
 *
 * 🔴 CE CONTRÔLE EST NÉ D'UNE MESURE FAUSSE, PAYÉE EN DIRECT (E2-ST4, lot A1).
 * `playwright.config.ts` pose `reuseExistingServer: !CI` : en local, un
 * `npx swa start` laissé en marche par un run précédent est RÉUTILISÉ tel quel.
 * Or il sert la politique qu'il a lue à SON démarrage. Reconstruire l'artéfact ne
 * le lui apprend pas — et il suffit qu'un gabarit change pour que l'identifiant du
 * composant change, donc le contenu de son bloc `<style>`, donc son hachage.
 * Résultat mesuré : une violation `style-src-elem` parfaitement reproductible, sur
 * un dépôt sain, pendant que `npm run config:swa` sortait vert avec le bon compte.
 *
 * ⚠️ ET C'EST LE SENS INVERSE QUI EST DANGEREUX. Ici, la divergence a rendu un
 * run ROUGE, donc bruyant. Elle peut tout aussi bien le rendre VERT : un serveur
 * qui a démarré sur une politique plus PERMISSIVE (avant qu'on la resserre, ou
 * avant qu'un hachage devienne obligatoire) laisserait passer exactement ce que
 * ces specs existent pour attraper. Un gate qui mesure la mauvaise politique ne
 * mesure rien — c'est la famille de L-032, sur un axe neuf : l'émulateur
 * implémente bien la directive, mais depuis un INSTANTANÉ.
 *
 * La comparaison est faite sur la chaîne ENTIÈRE, à l'octet près, et non sur
 * quelques motifs : deux politiques peuvent partager `'self'`, un `sha256-` et
 * l'absence d'`unsafe-*` en différant sur le seul hachage qui compte.
 */
function exigerPolitiqueDeLArtefactCourant(politiqueServie: string): void {
  expect(
    existsSync(CONFIG_ARTEFACT),
    `${CONFIG_ARTEFACT} est absent : l'artéfact n'a pas été bâti, or c'est lui que \`swa start\` sert. Lancer \`npm run build\` (ou la variante fixture témoin) avant \`npm run e2e\``,
  ).toBe(true);

  const configuration = JSON.parse(readFileSync(CONFIG_ARTEFACT, 'utf8')) as {
    globalHeaders?: Record<string, string>;
  };
  const attendue = configuration.globalHeaders?.['Content-Security-Policy'] ?? '';

  expect(
    attendue,
    `${CONFIG_ARTEFACT} ne porte aucune \`Content-Security-Policy\` dans ses \`globalHeaders\` — l'artéfact est incomplet, la comparaison ci-dessous ne voudrait rien dire`,
  ).not.toBe('');

  expect(
    politiqueServie,
    'la CSP SERVIE diffère de celle de l’artéfact présent sur le disque. La cause de loin la plus probable : un `npx swa start` d’un run précédent est encore en marche et sert la politique qu’il a lue à SON démarrage (`reuseExistingServer: !CI` dans `playwright.config.ts`). Arrêter le processus qui écoute le port, puis relancer. Tant qu’il tourne, ce gate mesure une politique qui n’est plus celle du site',
  ).toBe(attendue);
}

// =============================================================================
// LE CONTRÔLE POSITIF DE `style-src` — dette S-016, payée ici (E2-ST5, lot c2)
// -----------------------------------------------------------------------------
// ON MESURE L'EFFET, PAS L'ÉVÉNEMENT — et c'est ce choix qui a permis de corriger
// la prémisse même de la dette. `getComputedStyle` est le seul instrument qu'une
// politique ne peut pas rendre muet : une déclaration refusée ne peint rien, et
// cela se lit, qu'un événement soit émis ou non.
//
// 🔴 CE QUE LA MESURE DU 2026-08-19 A ÉTABLI, ET QUI CORRIGE L-041 / S-016.
// Ces deux leçons annonçaient qu'« une écriture CSSOM de `style` est acceptée dans
// le DOM mais jamais appliquée, sans violation ni message ». Mesuré ici, sur la
// page de leçon, sous la CSP réellement servie, quatre écritures distinctes :
//   · `element.style.setProperty(…)`      → APPLIQUÉE   (aucun événement — normal)
//   · `element.style.cssText = …`         → APPLIQUÉE
//   · `element.style.paddingTop = …`      → APPLIQUÉE
//   · `element.setAttribute('style', …)`  → REFUSÉE, et `style-src-attr` EST émis
// La frontière n'est donc pas « CSSOM contre attribut » mais « écriture PROPRIÉTÉ
// PAR PROPRIÉTÉ contre ANALYSE d'un texte de déclaration » : `style-src-attr`
// gouverne le parsing de l'attribut, pas les accesseurs de `CSSStyleDeclaration`.
// ⚠️ CONSÉQUENCE DE SÉCURITÉ, À NE PAS PERDRE : cette CSP n'empêche PAS un script
// déjà exécuté de restyler la page. Ce qu'elle ferme, c'est l'INJECTION de style
// (un `<style>` ou un `style="…"` glissé dans du contenu) — ce qui est exactement
// la surface d'un site de contenu, et exactement ce que cette sonde exerce.
// ⚠️ ET POURQUOI L-041 A CONCLU L'INVERSE : sa mesure était `el.style.top =
// '-200px'` sur un élément en position STATIQUE, où `top` n'a aucun effet visuel.
// Rejoué ici : la valeur est bel et bien appliquée (`getComputedStyle` rend
// `-200px`) — c'était un artefact de propriété, pas un refus. Même famille que le
// piège `outline-offset` documenté plus bas : deux fois le même mode d'échec.
//
// ⚠️ C'EST UNE PINCE, PAS UN CONSTAT D'ABSENCE (L-019). « La valeur n'a pas bougé »
// est exactement ce que produirait un sélecteur mal écrit, une propriété mal
// choisie ou un témoin jamais inséré dans le document. Les quatre canaux sont donc
// exercés dans la MÊME page, avec la MÊME déclaration :
//   · canal ÉLÉMENT   — un `<style>` inline non haché                    → REFUSÉ
//   · canal ATTRIBUT  — `setAttribute('style', …)`                       → REFUSÉ
//   · canal AUTORISÉ  — une feuille de MÊME ORIGINE (`style-src 'self'`) → APPLIQUÉE
//   · canal CSSOM     — `element.style.setProperty(…)`                   → APPLIQUÉ,
//     hors du périmètre de la directive : il est mesuré pour que la portée réelle
//     de la protection soit ÉCRITE, jamais supposée.
// Sans les deux derniers, ce module ne mesurerait rien ; sans les deux premiers, il
// ne garderait rien. C'est aussi ce qui distingue « la politique bloque » de « la
// politique bloque TOUT » : elle discrimine, et le canal autorisé le prouve.
//
// ⚠️ LE TROISIÈME CANAL PASSE PAR `page.route`, ET C'EST DÉLIBÉRÉ. La feuille
// témoin n'existe pas dans l'artéfact — l'y écrire depuis un spec modifierait
// `dist/`, que `deploy.yml` scelle par empreintes sha256. Son URL est néanmoins
// celle de l'origine servie : du point de vue de la CSP, c'est bien `'self'` qui
// est exercé, la ressource étant décidée juste après, au niveau réseau.
// =============================================================================

/**
 * La propriété témoin, et pourquoi celle-ci.
 *
 * `padding-top` n'est **pas héritée** (une valeur venue d'un ancêtre ne peut donc
 * pas fabriquer un faux « appliqué »), sa valeur initiale est `0px`, et sa valeur
 * RÉSOLUE est toujours une longueur en pixels — quel que soit le reste du style de
 * l'élément.
 *
 * 🔴 CE DERNIER POINT N'EST PAS DÉCORATIF, ET IL A ÉTÉ PAYÉ EN DIRECT (2026-08-19).
 * La première écriture de cette sonde employait `outline-offset`, choisi pour la
 * même raison de non-héritage. Chromium résout `outline-offset` à `0px` **tant que
 * `outline-style` vaut `none`** : les TROIS canaux rendaient alors `0px`, y compris
 * celui qui avait bel et bien chargé sa feuille. Les deux refus se seraient donc lus
 * comme des succès si l'assertion de l'instrument (le canal autorisé, plus bas)
 * n'avait pas été écrite EN PREMIER — c'est exactement le mode d'échec L-019 que
 * cette pince existe pour attraper, et il s'est produit dès le premier run.
 */
const PROPRIETE_TEMOIN = 'padding-top';

/** La valeur que les trois canaux tentent d'écrire. Volontairement improbable. */
const VALEUR_TEMOIN = '13px';

/** Ce que la propriété vaut quand la déclaration n'a PAS pris. */
const VALEUR_INITIALE = '0px';

/** Une classe par canal : sans cela, la feuille autorisée verdirait aussi les deux autres témoins. */
const CLASSES_TEMOIN = {
  element: 'drjst-temoin-style-element',
  attribut: 'drjst-temoin-style-attribut',
  autorise: 'drjst-temoin-style-autorise',
  cssom: 'drjst-temoin-style-cssom',
} as const;

/**
 * L'URL de la feuille témoin — de même origine, donc couverte par `style-src 'self'`.
 * Le préfixe `__` la rend reconnaissable dans un journal réseau et ne peut entrer en
 * collision avec aucune route du site.
 */
const URL_FEUILLE_TEMOIN = '/__sonde-style-src.css';

/** Ce que les trois canaux ont produit, tel quel — l'appelant assertionne. */
export interface MesureStyleSrc {
  /** La valeur calculée AVANT toute injection : la référence de la comparaison. */
  readonly initiale: string;
  /** Après l'insertion d'un `<style>` inline non haché. */
  readonly elementNonHache: string;
  /** Après un `setAttribute('style', …)` — le canal que `style-src-attr` gouverne. */
  readonly attributEnLigne: string;
  /** Ce que l'attribut `style` PORTE après cette écriture — le DOM l'accepte (S-016). */
  readonly attributRelu: string;
  /**
   * Après un `element.style.setProperty(…)` — HORS du périmètre de la directive.
   * Mesuré pour écrire la portée réelle de la protection, jamais pour la supposer.
   */
  readonly cssomPropriete: string;
  /** Après le chargement d'une feuille de même origine portant la MÊME déclaration. */
  readonly feuilleAutorisee: string;
  /** `chargée` ou `refusée` : l'événement du `<link>`, pour distinguer les causes d'un échec. */
  readonly etatFeuilleAutorisee: string;
  /** Millisecondes écoulées entre l'événement `load` du `<link>` et son effet peint. */
  readonly delaiApplication: number;
}

/**
 * 🔴 LA BARRIÈRE DE TEMPS, ET POURQUOI ELLE EXISTE — mesurée le 2026-08-19.
 *
 * L'événement `load` d'un `<link rel="stylesheet">` inséré dynamiquement précède
 * l'application de la feuille : `lien.sheet.cssRules` porte déjà la règle, le
 * sélecteur correspond bien à l'élément, et `getComputedStyle` rend encore la
 * valeur d'origine pendant quelques dizaines de millisecondes. Constaté ici :
 * lecture immédiate après `load` → `0px` ; lecture 25 ms plus tard → `13px`.
 *
 * ⚠️ CE N'EST PAS UN CONFORT, C'EST LA CONDITION DE VALIDITÉ DES DEUX AUTRES
 * CANAUX. Sans attente, « la déclaration refusée n'a pas pris » serait
 * indiscernable de « la mesure est arrivée trop tôt » — le test aurait été vert
 * pour la mauvaise raison, sur un dépôt sain comme sur un dépôt permissif. La
 * feuille autorisée est le canal le plus LENT des trois (elle passe par le
 * réseau) : quand SON effet est visible, les deux canaux synchrones ont
 * nécessairement eu le temps de s'appliquer s'ils l'avaient pu. C'est elle qui
 * sert de barrière, et c'est pour cela que les trois valeurs sont relevées
 * seulement après.
 */
const DELAI_APPLICATION_MS = 2_000;

/** Le pas de scrutation de cette barrière. */
const PAS_SCRUTATION_MS = 25;

/**
 * Exerce les trois canaux de `style-src` sur la page COURANTE et rend les mesures.
 *
 * Ne laisse rien derrière elle : les trois témoins, le bloc refusé et le `<link>`
 * sont retirés du document une fois les valeurs relevées, pour que l'appelant
 * puisse continuer d'actionner la page sur un DOM inchangé.
 */
export async function mesurerStyleSrc(page: Page): Promise<MesureStyleSrc> {
  await page.route(URL_FEUILLE_TEMOIN, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/css',
      body: `.${CLASSES_TEMOIN.autorise}{${PROPRIETE_TEMOIN}:${VALEUR_TEMOIN}}`,
    });
  });

  return page.evaluate(
    async ([propriete, valeur, classes, urlFeuille, delaiMax, pas]: readonly [
      string,
      string,
      typeof CLASSES_TEMOIN,
      string,
      number,
      number,
    ]) => {
      const creerTemoin = (classe: string): HTMLElement => {
        const temoin = document.createElement('span');
        temoin.className = classe;
        // Hors de l'arbre d'accessibilité : la mesure ne doit pas ajouter de contenu
        // à une page dont un autre gate (axe) compte les éléments.
        temoin.setAttribute('aria-hidden', 'true');
        document.body.append(temoin);
        return temoin;
      };

      const lire = (element: Element): string =>
        getComputedStyle(element).getPropertyValue(propriete).trim();

      const temoinElement = creerTemoin(classes.element);
      const temoinAttribut = creerTemoin(classes.attribut);
      const temoinAutorise = creerTemoin(classes.autorise);
      const temoinCssom = creerTemoin(classes.cssom);

      const initiale = lire(temoinElement);

      // 1. CANAL ÉLÉMENT. Le bloc est créé PAR LA PAGE et inséré dans le document :
      //    c'est un nœud comme un autre, soumis à `style-src-elem`. Rien n'est
      //    falsifié — si la politique servie autorisait l'inline, il s'appliquerait.
      const bloc = document.createElement('style');
      bloc.textContent = `.${classes.element}{${propriete}:${valeur}}`;
      document.head.append(bloc);

      // 2. CANAL ATTRIBUT — celui que `style-src-attr` gouverne RÉELLEMENT. Le
      //    navigateur ANALYSE le texte de la déclaration : c'est cette analyse qui
      //    est refusée. On relève tout de suite ce que le DOM PORTE, car c'est la
      //    moitié qui trompe (S-016) : l'attribut se relit intact, donc un test qui
      //    se contenterait de le relire conclurait « appliqué ».
      temoinAttribut.setAttribute('style', `${propriete}:${valeur}`);
      const attributRelu = temoinAttribut.getAttribute('style') ?? '';

      // 2 bis. CANAL CSSOM — HORS PÉRIMÈTRE, et c'est le constat qui corrige L-041.
      //    Une écriture propriété par propriété n'est pas soumise à la directive :
      //    elle s'applique. La mesurer, c'est écrire la portée de la protection au
      //    lieu de la supposer.
      temoinCssom.style.setProperty(propriete, valeur);

      // 3. CANAL AUTORISÉ. La même déclaration, par une feuille de même origine.
      //    C'est la moitié de la pince qui prouve que l'instrument MESURE — et c'est
      //    aussi la BARRIÈRE DE TEMPS des deux autres (voir `DELAI_APPLICATION_MS`).
      const lien = document.createElement('link');
      lien.rel = 'stylesheet';
      lien.href = urlFeuille;
      const etatFeuilleAutorisee = await new Promise<string>((resoudre) => {
        lien.addEventListener('load', () => resoudre('chargée'), { once: true });
        lien.addEventListener('error', () => resoudre('refusée'), { once: true });
        document.head.append(lien);
      });

      // On attend l'EFFET, pas l'événement : `load` précède l'application. La sortie
      // par expiration est volontaire et non silencieuse — elle rend la valeur telle
      // qu'elle est, et c'est l'assertion de l'appelant qui tranche.
      const depart = performance.now();
      let delaiApplication = -1;
      while (performance.now() - depart < delaiMax) {
        if (lire(temoinAutorise) !== initiale) {
          delaiApplication = Math.round(performance.now() - depart);
          break;
        }
        await new Promise((resoudre) => setTimeout(resoudre, pas));
      }

      // Les trois relevés se font APRÈS la barrière : les deux canaux synchrones ont
      // donc eu, eux aussi, tout le temps de s'appliquer s'ils l'avaient pu.
      const elementNonHache = lire(temoinElement);
      const attributEnLigne = lire(temoinAttribut);
      const feuilleAutorisee = lire(temoinAutorise);
      const cssomPropriete = lire(temoinCssom);

      for (const noeud of [
        temoinElement,
        temoinAttribut,
        temoinAutorise,
        temoinCssom,
        bloc,
        lien,
      ]) {
        noeud.remove();
      }

      return {
        initiale,
        elementNonHache,
        attributEnLigne,
        attributRelu,
        feuilleAutorisee,
        etatFeuilleAutorisee,
        delaiApplication,
        cssomPropriete,
      };
    },
    [
      PROPRIETE_TEMOIN,
      VALEUR_TEMOIN,
      CLASSES_TEMOIN,
      URL_FEUILLE_TEMOIN,
      DELAI_APPLICATION_MS,
      PAS_SCRUTATION_MS,
    ] as const,
  );
}

/**
 * Exige que `style-src` soit RÉELLEMENT APPLIQUÉ sur la page courante — la dette
 * S-016 en un appel.
 *
 * L'ORDRE DES ASSERTIONS EST LE CŒUR DU CONTRÔLE : l'instrument est prouvé AVANT
 * qu'on conclue quoi que ce soit d'un refus. Un `expect` sur « rien n'a bougé »
 * placé en tête ferait passer pour une preuve exactement ce qu'un témoin jamais
 * inséré produirait.
 *
 * @returns la mesure, pour que l'appelant l'imprime au journal (L-005).
 */
export async function exigerStyleSrcApplique(page: Page): Promise<MesureStyleSrc> {
  const mesure = await mesurerStyleSrc(page);

  expect(
    mesure.initiale,
    `le témoin ne part pas de « ${VALEUR_INITIALE} » pour « ${PROPRIETE_TEMOIN} » : une règle du site écrit désormais cette propriété, la comparaison qui suit ne distinguerait plus « appliqué » de « refusé »`,
  ).toBe(VALEUR_INITIALE);

  // 1. L'INSTRUMENT MESURE. Sans cette ligne, tout le reste serait vrai d'un
  //    sélecteur mal écrit ou d'un témoin absent du document (L-019).
  expect(
    mesure.feuilleAutorisee,
    `la MÊME déclaration servie par une feuille de même origine ne s’applique pas (« ${mesure.etatFeuilleAutorisee} », après ${String(DELAI_APPLICATION_MS)} ms d’attente) : soit \`style-src\` ne porte plus \`'self'\` — le site serait alors sans styles —, soit cette sonde ne mesure rien et les refus constatés plus bas ne prouveraient rien`,
  ).toBe(VALEUR_TEMOIN);

  // 2. LE CANAL ÉLÉMENT EST REFUSÉ, ET LE REFUS EST EFFECTIF — pas rapporté.
  expect(
    mesure.elementNonHache,
    'un `<style>` inline NON HACHÉ inséré par la page a été APPLIQUÉ : `style-src` autorise l’inline (ou la politique servie est en `report-only`). C’est la directive DÉRIVÉE de l’artéfact (S-005) — sans ce contrôle, elle pouvait devenir permissive sans qu’aucun gate ne rougisse',
  ).toBe(VALEUR_INITIALE);

  // 3. LE CANAL ATTRIBUT AUSSI — c'est `style-src-attr`, la surface d'un `style="…"`
  //    injecté dans du contenu. Les deux moitiés comptent : le DOM ACCEPTE
  //    l'attribut (donc un test qui se contenterait de le relire conclurait
  //    « appliqué » — la moitié qui trompe, S-016), et la peinture ne suit PAS.
  expect(
    mesure.attributRelu,
    'l’attribut `style` ne porte plus la déclaration écrite : Chromium refuse désormais l’écriture elle-même, et non plus seulement son application. Relire S-016 avant d’ajuster — c’est une bonne nouvelle, pas un échec du site',
  ).toContain(VALEUR_TEMOIN);
  expect(
    mesure.attributEnLigne,
    'un `style="…"` posé par `setAttribute` a été APPLIQUÉ : `style-src` porte `unsafe-inline` ou `unsafe-hashes`, ou la politique n’est pas appliquée. C’est la surface exacte d’une injection de style dans du contenu',
  ).toBe(VALEUR_INITIALE);

  // 4. LA PORTÉE DE LA PROTECTION, ÉCRITE ET NON SUPPOSÉE. Une écriture propriété
  //    par propriété n'est pas gouvernée par la directive et s'applique. Ce n'est
  //    PAS un défaut du site : la CSP ferme l'INJECTION de style, pas le restylage
  //    par un script qui s'exécute déjà légitimement. L'assertion existe pour que
  //    personne ne lise « style-src » comme une garantie plus large qu'elle n'est.
  expect(
    mesure.cssomPropriete,
    'un `element.style.setProperty(…)` ne s’applique plus : le périmètre de `style-src-attr` s’est élargi aux accesseurs de `CSSStyleDeclaration`. Bonne nouvelle à consigner (S-016), pas un échec — mais toute prose du dépôt qui décrit ce canal doit être relue',
  ).toBe(VALEUR_TEMOIN);

  return mesure;
}
