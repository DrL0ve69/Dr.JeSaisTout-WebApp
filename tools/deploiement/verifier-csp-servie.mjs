// =============================================================================
// La CSP SERVIE est-elle exactement celle qu'on a générée ? (dette pré-E3-ST1, lot B)
// -----------------------------------------------------------------------------
// POURQUOI CE SCRIPT EXISTE.
// L'étape « Vérifier les en-têtes servis » de `deploy.yml` ne vérifiait la politique
// réellement appliquée par Azure Static Web Apps que par MOTIFS : présence du nom
// d'en-tête, présence de `sha256-`, présence de quatre directives écrites en clair,
// absence de trois mots interdits. Toutes ces vérifications sont des `grep -qF` sur
// la ligne entière — ce qui veut dire qu'une CSP servie pouvait porter une directive
// ENTIÈRE de plus, ou une directive affaiblie que le motif ne nomme pas, et sortir
// verte. `img-src *`, `connect-src https:`, un `frame-src` apparu de nulle part :
// aucun de ces trois cas n'est vu par un contrôle de présence.
//
// C'est la faille que ce site ENSEIGNE, mesurée sur son propre déploiement : un
// garde-fou qui ne refuse que ce que son auteur a imaginé (liste NOIRE de motifs) au
// lieu de confronter la valeur observée à une valeur de RÉFÉRENCE nominative
// (`.claude/rules/security.md` §4, famille S-001/S-003/S-009/S-014).
//
// LE PATRON EST DÉJÀ ÉPROUVÉ DANS LE DÉPÔT, côté e2e : `exigerCspServie`
// (`e2e/aides/sonde-csp.ts`) compare la politique servie par l'émulateur `swa start`
// à celle de l'artéfact SUR LE DISQUE, à l'octet près. Ce script transpose la même
// idée en ligne, avec deux différences assumées :
//   · la comparaison est STRUCTURELLE (directive par directive) et non textuelle,
//     parce qu'un intermédiaire HTTP a le droit de renormaliser les espaces et que
//     le message « ces deux chaînes de 600 caractères diffèrent » ne dit rien ;
//   · elle porte sur TROIS documents et non deux (voir ci-dessous).
//
// LES TROIS COMPARAISONS, ET POURQUOI AUCUNE NE SUFFIT SEULE.
//   (a↔b) SERVIE ↔ ARTÉFACT. La vérité opérationnelle : ce qu'Azure applique est-il
//         ce que le générateur a écrit ? Seule elle attrape une politique perdue en
//         route, tronquée, dédoublée, ou servie depuis une configuration périmée.
//         Elle est AVEUGLE à un artéfact déjà fautif — c'est tout l'objet de (c).
//   (b↔c) ARTÉFACT ↔ SOURCE VERSIONNÉE, modulo les jetons `__HACHAGES_*__`. La
//         vérité revue par un humain : `config/staticwebapp.config.source.json` est
//         le seul document que quelqu'un relit en revue de PR. Chaque jeton n'a le
//         droit d'être remplacé QUE par des sources `'sha256-…'` — jamais par un
//         `'unsafe-inline'`, un `https:` ou un domaine. C'est S-005 rendu exécutable
//         en ligne : la liste blanche reste NOMINATIVE, elle ne se dérive pas de
//         l'artéfact.
//
// CE QU'IL NE FAIT PAS, ET C'EST VOLONTAIRE.
//   · Il ne capture RIEN. Les en-têtes lui arrivent en fichier, produits par la
//     boucle d'attente active de `deploy.yml` — celle qui attend l'EFFET et non le
//     code de retour (L-004 : SWA répond 200 pendant ~30-60 s AVANT d'appliquer
//     `staticwebapp.config.json`). Recapturer ici rouvrirait exactement ce trou.
//   · Il n'a AUCUNE dépendance npm. Le job `publication` de `deploy.yml` est celui
//     qui détient le jeton de déploiement : il ne fait que `checkout` +
//     `download-artifact`, sans `node_modules`. Y ajouter un `npm ci` élargirait la
//     surface d'exécution du job le plus sensible du dépôt à tout l'arbre de
//     dépendances. Node seul, bibliothèque standard seule.
//   · Il ne REGARDE QUE LA CSP, et il ne remplace donc PAS les contrôles par motifs
//     qui l'entourent dans le workflow. L'égalité structurelle subsume leurs
//     contrôles DE CSP — et rien d'autre. Les mêmes lignes de `deploy.yml` vérifient
//     aussi la PRÉSENCE de quatre en-têtes hors CSP (`strict-transport-security`,
//     `x-content-type-options`, `referrer-policy`, `permissions-policy`) et le
//     `max-age=` de HSTS : ce script ne lit aucun de ces cinq points, qui restent
//     leur SEULE couverture. Un `Permissions-Policy: camera=*` servi passerait ce
//     comparateur sans une erreur. Les retirer en croyant retirer un doublon ouvrirait
//     un trou réel — mesuré, pas supposé.
//     S'ajoute la valeur de diagnostic : leurs messages nomment la faute en clair
//     (« Directive CSP absente ou affaiblie : object-src 'none' ») là où un delta
//     structurel demande une lecture.
//
// SORTIE. Code 0 et un journal qui ÉNUMÈRE les directives comparées — un run vert ne
// prouve pas qu'une vérification a tourné, c'est le journal qui fait foi (L-005). Ou
// code 1, en nommant la directive ET le delta (manquante, excédentaire, sources
// différentes), jamais un simple « les politiques diffèrent ».
//
// USAGE.
//   node tools/deploiement/verifier-csp-servie.mjs \
//     --entetes <en-têtes bruts capturés par `curl -D -`> \
//     --artefact <staticwebapp.config.json de l'artéfact déployé> \
//     --source   <config/staticwebapp.config.source.json>
// =============================================================================

import { readFileSync } from 'node:fs';

/** Le nom d'en-tête cherché, en minuscules — HTTP les compare sans tenir compte de la casse. */
const EN_TETE_CSP = 'content-security-policy';

/**
 * Les jetons que `generer-config-swa.mjs` substitue dans la source versionnée.
 *
 * ⚠️ La liste est NOMINATIVE et doit le rester : un jeton inconnu de ce script serait
 * traité comme une source CSP littérale, donc exigé tel quel dans l'artéfact — ce qui
 * ferait rougir le gate au lieu de l'ouvrir. C'est le sens de défaillance voulu.
 *
 * 🔴 `__HACHAGES_SCRIPT__` A ÉTÉ RETIRÉ DE CETTE LISTE le 2026-08-20 (bascule E6), et ce
 * retrait DURCIT la comparaison au lieu de l'affaiblir. `script-src` s'écrit désormais
 * « 'self' » EN DUR dans la source versionnée, sans jeton : la branche
 * `jetons.length === 0 && surplus.length > 0` d'`exigerResolutionDesJetons` s'applique donc
 * à cette directive, et TOUTE source ajoutée à `script-src` entre la source revue et
 * l'artéfact — un hachage compris — est refusée par « Rien n'autorisait cet ajout ».
 * Le laisser dormir ici aurait fait exactement l'inverse : un jeton mort continuerait
 * d'autoriser l'ajout silencieux de `'sha256-…'` à la directive la plus sensible du site,
 * pour du code qui n'existe plus (S-005).
 */
const JETONS_HACHAGES = new Set(['__HACHAGES_STYLE__']);

/**
 * Ce qu'un jeton a le droit de devenir, et RIEN d'autre.
 *
 * Un hachage CSP est `'sha256-<base64>'`, apostrophes comprises. Le motif est ancré aux
 * deux bouts : `'sha256-abc' 'unsafe-inline'` est une seule source pour le découpage
 * (les sources ne contiennent pas d'espace), mais un `'sha256-abc'; script-src …` mal
 * découpé ne passerait pas cette ancre non plus.
 */
const SOURCE_HACHAGE = /^'sha256-[A-Za-z0-9+/]+={0,2}'$/;

/**
 * Une politique analysée : nom de directive (minuscules) → sources, dans l'ordre du texte.
 *
 * @typedef {Map<string, string[]>} PolitiqueAnalysee
 */

/**
 * Découpe une CSP en directives.
 *
 * On analyse au lieu de chercher des motifs, parce qu'une CSP est un format STRUCTURÉ et
 * que la règle du dépôt est constante : on parse, puis on confronte à une référence
 * nominative (`.claude/rules/security.md` §4).
 *
 * Deux subtilités qui décident de la sécurité du résultat :
 *   1. Les noms de directives sont insensibles à la casse — on normalise en minuscules,
 *      sinon `IMG-SRC *` glissé à côté d'`img-src 'self'` serait vu comme une directive
 *      distincte au lieu d'un doublon.
 *   2. Une directive répétée est IGNORÉE par les navigateurs après sa première occurrence.
 *      Un attaquant qui contrôlerait un intermédiaire pourrait donc ajouter une seconde
 *      `script-src` permissive sans effet… ou l'inverse selon l'implémentation. Le doublon
 *      est donc une ERREUR nommée, pas une valeur à fusionner en silence.
 *
 * @param {string} politique texte brut de l'en-tête (sans le nom d'en-tête)
 * @param {string} origine étiquette employée dans les messages d'erreur
 * @param {string[]} erreurs collecteur — toute anomalie y est poussée, rien n'est levé
 * @returns {PolitiqueAnalysee}
 */
function analyserCsp(politique, origine, erreurs) {
  /** @type {PolitiqueAnalysee} */
  const directives = new Map();

  for (const segment of politique.split(';')) {
    const jetons = segment.trim().split(/\s+/).filter(Boolean);
    const nom = jetons[0];
    // Un segment vide vient d'un `;` final ou double : ce n'est pas une anomalie.
    if (nom === undefined) {
      continue;
    }

    const cle = nom.toLowerCase();
    if (directives.has(cle)) {
      erreurs.push(
        `CSP ${origine} : la directive « ${cle} » apparaît PLUSIEURS FOIS. Les navigateurs ignorent les occurrences suivantes — la politique effective n'est donc pas celle qu'on lit.`,
      );
      continue;
    }
    directives.set(cle, jetons.slice(1));
  }

  return directives;
}

/**
 * Compare deux ensembles de sources sans tenir compte de l'ordre, doublons compris.
 *
 * ⚠️ `surplus` N'A PAS LE MÊME SENS CHEZ SES DEUX APPELANTS, et la fonction ne peut pas
 * le savoir : elle rend une différence, pas un verdict.
 *   · dans `exigerEgaliteExacte` (a↔b) : un surplus est une DIVERGENCE, toujours fautive ;
 *   · dans `exigerResolutionDesJetons` (b↔c) : un surplus est ce que la génération a
 *     ajouté — donc légitime SI la directive portait un jeton ET si chaque valeur est un
 *     `'sha256-…'`. C'est l'appelant qui tranche, juste en dessous.
 *
 * @param {readonly string[]} attendues
 * @param {readonly string[]} obtenues
 * @returns {{ manquantes: string[]; surplus: string[] }}
 */
function differenceSources(attendues, obtenues) {
  const restantes = [...attendues];
  /** @type {string[]} */
  const surplus = [];

  for (const source of obtenues) {
    const position = restantes.indexOf(source);
    if (position === -1) {
      surplus.push(source);
    } else {
      restantes.splice(position, 1);
    }
  }

  return { manquantes: restantes, surplus };
}

/**
 * Exige l'ÉGALITÉ EXACTE de deux politiques, directive par directive.
 *
 * C'est la moitié (a↔b) : ce qu'Azure sert doit être, à la source près, ce que le
 * générateur a écrit dans l'artéfact. Aucune tolérance — un `frame-src` en plus est
 * une divergence même s'il est restrictif, parce que personne ne l'a décidé.
 *
 * @param {PolitiqueAnalysee} attendue
 * @param {PolitiqueAnalysee} obtenue
 * @param {string} etiquetteAttendue
 * @param {string} etiquetteObtenue
 * @param {string[]} erreurs
 */
function exigerEgaliteExacte(attendue, obtenue, etiquetteAttendue, etiquetteObtenue, erreurs) {
  for (const [nom, sources] of attendue) {
    if (!obtenue.has(nom)) {
      erreurs.push(
        `Directive MANQUANTE dans la CSP ${etiquetteObtenue} : « ${nom} » (la CSP ${etiquetteAttendue} la porte avec : ${sources.join(' ') || '<aucune source>'}).`,
      );
    }
  }

  for (const [nom, sources] of obtenue) {
    if (!attendue.has(nom)) {
      erreurs.push(
        `Directive EXCÉDENTAIRE dans la CSP ${etiquetteObtenue} : « ${nom} ${sources.join(' ')} » — absente de la CSP ${etiquetteAttendue}. Une directive que personne n'a écrite est une politique que personne n'a revue.`,
      );
    }
  }

  for (const [nom, sourcesAttendues] of attendue) {
    const sourcesObtenues = obtenue.get(nom);
    if (sourcesObtenues === undefined) {
      continue;
    }
    const { manquantes, surplus } = differenceSources(sourcesAttendues, sourcesObtenues);
    if (manquantes.length > 0 || surplus.length > 0) {
      erreurs.push(
        `Directive « ${nom} » DIFFÉRENTE entre ${etiquetteAttendue} et ${etiquetteObtenue} :` +
          (surplus.length > 0
            ? ` sources en TROP côté ${etiquetteObtenue} → ${surplus.join(' ')} ;`
            : '') +
          (manquantes.length > 0
            ? ` sources MANQUANTES côté ${etiquetteObtenue} → ${manquantes.join(' ')} ;`
            : ''),
      );
    }
  }
}

/**
 * Exige que l'artéfact soit la source versionnée, jetons résolus — et RIEN de plus.
 *
 * C'est la moitié (b↔c), celle qui rend S-005 exécutable en ligne. La source est le seul
 * document qu'un humain relit ; ce contrôle vérifie que la génération n'y a ajouté que ce
 * qu'elle a le droit d'ajouter : des hachages.
 *
 * Le zéro hachage est ADMIS pour une directive porteuse de jeton : `generer-config-swa.mjs`
 * retire le jeton ET l'espace qui le précède quand la liste est vide (`replaceAll(' JETON', '')`).
 * Le compte, lui, est épinglé ailleurs — dans le générateur — et n'a pas à être redit ici.
 *
 * @param {PolitiqueAnalysee} source
 * @param {PolitiqueAnalysee} artefact
 * @param {string[]} erreurs
 */
function exigerResolutionDesJetons(source, artefact, erreurs) {
  for (const nom of source.keys()) {
    if (!artefact.has(nom)) {
      erreurs.push(
        `Directive MANQUANTE dans la CSP de l'artéfact : « ${nom} » — elle est pourtant écrite dans la source versionnée. La génération l'a perdue.`,
      );
    }
  }

  for (const [nom, sourcesArtefact] of artefact) {
    if (!source.has(nom)) {
      erreurs.push(
        `Directive EXCÉDENTAIRE dans la CSP de l'artéfact : « ${nom} ${sourcesArtefact.join(' ')} » — absente de la source versionnée. La génération n'a le droit d'ajouter QUE des hachages.`,
      );
    }
  }

  for (const [nom, sourcesSource] of source) {
    const sourcesArtefact = artefact.get(nom);
    if (sourcesArtefact === undefined) {
      continue;
    }

    const jetons = sourcesSource.filter((valeur) => JETONS_HACHAGES.has(valeur));
    const litterales = sourcesSource.filter((valeur) => !JETONS_HACHAGES.has(valeur));
    // Ici — et à la différence de (a↔b) — `surplus` est ce que la GÉNÉRATION a ajouté :
    // légitime tant que c'est un hachage sur une directive porteuse de jeton. `manquantes`,
    // lui, garde le même sens des deux côtés : la génération a perdu une source revue.
    const { manquantes, surplus } = differenceSources(litterales, sourcesArtefact);

    if (manquantes.length > 0) {
      erreurs.push(
        `Directive « ${nom} » : la CSP de l'artéfact a PERDU des sources écrites dans la source versionnée → ${manquantes.join(' ')}.`,
      );
    }

    if (jetons.length === 0 && surplus.length > 0) {
      erreurs.push(
        `Directive « ${nom} » : la CSP de l'artéfact ajoute ${surplus.join(' ')} alors que la source versionnée ne porte AUCUN jeton \`__HACHAGES_*__\` sur cette directive. Rien n'autorisait cet ajout.`,
      );
      continue;
    }

    for (const valeur of surplus) {
      if (!SOURCE_HACHAGE.test(valeur)) {
        erreurs.push(
          `Directive « ${nom} » : le jeton ${jetons.join(' / ')} a été remplacé par « ${valeur} », qui n'est PAS un hachage \`'sha256-…'\`. Un jeton ne résout que des hachages — jamais un domaine, un schéma ni un mot-clef.`,
        );
      }
    }
  }
}

/**
 * Extrait l'unique en-tête `Content-Security-Policy` d'une capture `curl -D -`.
 *
 * ⚠️ Les en-têtes HTTP se terminent par CRLF, et ce dépôt tourne sur un poste où les
 * `.yml`/`.json` sont eux-mêmes en CRLF (L-015) : sans le `\r` retiré, la dernière source
 * de la politique porterait un caractère invisible et TOUTE comparaison exacte échouerait
 * sur un delta illisible.
 *
 * Zéro en-tête et deux en-têtes sont deux fautes distinctes, nommées séparément : deux
 * CSP servies donnent une politique effective qui est leur INTERSECTION, c'est-à-dire une
 * politique que personne n'a écrite.
 *
 * @param {string} capture
 * @param {string[]} erreurs
 * @returns {string | undefined}
 */
function extraireCspServie(capture, erreurs) {
  const valeurs = capture
    .split('\n')
    .map((ligne) => ligne.replace(/\r$/, ''))
    .filter((ligne) => ligne.toLowerCase().startsWith(`${EN_TETE_CSP}:`))
    .map((ligne) => ligne.slice(EN_TETE_CSP.length + 1).trim());

  if (valeurs.length === 0) {
    erreurs.push(
      "Aucun en-tête `Content-Security-Policy` dans la capture : le site est servi SANS politique. La comparaison structurelle n'a rien à comparer.",
    );
    return undefined;
  }

  if (valeurs.length > 1) {
    erreurs.push(
      `${valeurs.length} en-têtes \`Content-Security-Policy\` servis. La politique effective est leur INTERSECTION — donc une politique que personne n'a écrite ni revue.`,
    );
    return undefined;
  }

  return valeurs[0];
}

/**
 * Lit la CSP d'un `staticwebapp.config.json` (généré ou source).
 *
 * @param {string} chemin
 * @param {string} etiquette
 * @param {string[]} erreurs
 * @returns {string | undefined}
 */
function lireCspDeConfig(chemin, etiquette, erreurs) {
  /** @type {unknown} */
  let contenu;
  try {
    contenu = JSON.parse(readFileSync(chemin, 'utf8'));
  } catch (cause) {
    erreurs.push(
      `Configuration ${etiquette} illisible (${chemin}) : ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    return undefined;
  }

  const globalHeaders =
    typeof contenu === 'object' && contenu !== null && 'globalHeaders' in contenu
      ? /** @type {{ globalHeaders?: unknown }} */ (contenu).globalHeaders
      : undefined;

  const politique =
    typeof globalHeaders === 'object' &&
    globalHeaders !== null &&
    'Content-Security-Policy' in globalHeaders
      ? /** @type {Record<string, unknown>} */ (globalHeaders)['Content-Security-Policy']
      : undefined;

  if (typeof politique !== 'string' || politique.trim() === '') {
    erreurs.push(
      `Configuration ${etiquette} (${chemin}) : aucune \`globalHeaders["Content-Security-Policy"]\` exploitable. Sans référence, la comparaison serait vide — donc verte pour rien (L-005).`,
    );
    return undefined;
  }

  return politique;
}

/**
 * Lecture des arguments — trois chemins nommés, aucun optionnel.
 *
 * @param {readonly string[]} argv
 * @returns {{ entetes: string; artefact: string; source: string } | undefined}
 */
function lireArguments(argv) {
  /** @type {Record<string, string>} */
  const valeurs = {};
  for (let index = 0; index < argv.length; index += 1) {
    const nom = argv[index];
    if (nom !== undefined && nom.startsWith('--')) {
      const valeur = argv[index + 1];
      if (valeur === undefined || valeur.startsWith('--')) {
        return undefined;
      }
      valeurs[nom.slice(2)] = valeur;
      index += 1;
    }
  }

  const entetes = valeurs['entetes'];
  const artefact = valeurs['artefact'];
  const source = valeurs['source'];
  if (entetes === undefined || artefact === undefined || source === undefined) {
    return undefined;
  }
  return { entetes, artefact, source };
}

function principal() {
  const options = lireArguments(process.argv.slice(2));
  if (options === undefined) {
    console.error(
      'Usage : node tools/deploiement/verifier-csp-servie.mjs --entetes <capture> --artefact <staticwebapp.config.json> --source <config/staticwebapp.config.source.json>',
    );
    process.exit(2);
  }

  /** @type {string[]} */
  const erreurs = [];

  /** @type {string | undefined} */
  let capture;
  try {
    capture = readFileSync(options.entetes, 'utf8');
  } catch (cause) {
    erreurs.push(
      `Capture d'en-têtes illisible (${options.entetes}) : ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }

  // Une capture VIDE n'est pas une capture absente : elle traverse `extraireCspServie`,
  // qui la refuse en nommant l'en-tête introuvable — le message qui décrit vraiment le cas.
  const politiqueServie = capture === undefined ? undefined : extraireCspServie(capture, erreurs);
  const politiqueArtefact = lireCspDeConfig(options.artefact, "de l'artéfact déployé", erreurs);
  const politiqueSource = lireCspDeConfig(options.source, 'source versionnée', erreurs);

  // Aucune des trois n'est facultative : un document absent rendrait la comparaison
  // partielle, donc VERTE sur ce qu'elle n'a pas lu. On sort en nommant ce qui manque.
  if (
    politiqueServie === undefined ||
    politiqueArtefact === undefined ||
    politiqueSource === undefined
  ) {
    for (const erreur of erreurs) {
      console.error(`::error::${erreur}`);
    }
    console.error(
      '::error::Comparaison structurelle de la CSP IMPOSSIBLE — au moins un des trois documents manque.',
    );
    process.exit(1);
  }

  const servie = analyserCsp(politiqueServie, 'servie', erreurs);
  const artefact = analyserCsp(politiqueArtefact, "de l'artéfact", erreurs);
  const source = analyserCsp(politiqueSource, 'source versionnée', erreurs);

  // Un garde-fou doit prouver qu'il a VU quelque chose, pas seulement bien refuser ce
  // qu'il voit (S-003). Une politique vide serait sinon « exactement égale » à une autre.
  //
  // LES TROIS CLAUSES SONT ATTEIGNABLES, chacune par un chemin distinct — et chacune a
  // son test (`src/csp-servie-structurelle.spec.ts`, « prouve qu'on a VU quelque chose ») :
  //   · `servie` : un en-tête `content-security-policy:` servi à valeur VIDE ou blanche.
  //     `extraireCspServie` le rend tel quel — l'en-tête EXISTE, c'est sa valeur qui est
  //     creuse, et le message « aucun en-tête » mentirait sur ce qu'on observe ;
  //   · `artefact` / `source` : `lireCspDeConfig` ne refuse en amont que la chaîne vide ou
  //     BLANCHE (`politique.trim() === ''`). Une politique faite de PONCTUATION seule —
  //     `";"`, `"; ;"` — la traverse intacte et n'analyse en 0 directive qu'ici. C'est
  //     exactement le cas qu'un `JSON.stringify` fautif ou une substitution ratée produit.
  if (servie.size === 0 || artefact.size === 0 || source.size === 0) {
    erreurs.push(
      `Politique VIDE après analyse (servie : ${servie.size} directive(s), artéfact : ${artefact.size}, source : ${source.size}). Une comparaison de deux ensembles vides est verte et ne prouve rien.`,
    );
  }

  exigerEgaliteExacte(artefact, servie, "de l'artéfact", 'servie', erreurs);
  exigerResolutionDesJetons(source, artefact, erreurs);

  if (erreurs.length > 0) {
    for (const erreur of erreurs) {
      console.error(`::error::${erreur}`);
    }
    console.error(`::error::CSP servie NON CONFORME — ${erreurs.length} divergence(s) ci-dessus.`);
    process.exit(1);
  }

  // Le journal fait foi (L-005) : on ÉNUMÈRE ce qui a été comparé. Un « OK » seul ne
  // distinguerait pas une comparaison réussie d'une comparaison qui n'a rien lu.
  console.log(`CSP servie ≡ CSP de l'artéfact — ${servie.size} directives comparées une à une :`);
  for (const [nom, sources] of servie) {
    console.log(`  · ${nom} → ${sources.length} source(s) : ${sources.join(' ') || '<aucune>'}`);
  }
  console.log(
    `CSP de l'artéfact ≡ ${options.source}, jetons ${[...JETONS_HACHAGES].join(' / ')} résolus en hachages 'sha256-…' UNIQUEMENT.`,
  );
}

principal();
