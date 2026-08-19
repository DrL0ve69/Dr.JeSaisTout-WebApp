#!/usr/bin/env node
/**
 * Valide le contenu pédagogique de `content/cours/<sujet>/` AVANT toute compilation.
 *
 * POURQUOI CE SCRIPT EXISTE.
 * Le schéma d'un fichier de contenu est un CONTRAT, pas une convention : `lecon.md`, `quiz.json` et
 * `simulation.json` sont écrits à la main par la boucle contenu (`professeur-web` /
 * `verificateur-theorie`) puis consommés au build par un compilateur qui, lui, suppose la forme
 * acquise. Sans ce garde-fou, un champ mal orthographié ne produit pas une erreur : il produit une
 * page en ligne à laquelle il manque un morceau, en silence. La règle du dépôt est l'inverse — un
 * fichier malformé fait ÉCHOUER le build, avec un message qui nomme le fichier ET le champ fautif.
 *
 * CE QU'IL VÉRIFIE, ET DANS QUEL ORDRE (l'ordre compte : c'est la PREMIÈRE anomalie d'une leçon qui
 * est rapportée en mode `--fixtures`, donc chaque cas de test est écrit pour n'en porter qu'une) :
 *   1. frontmatter lisible          — sous-ensemble YAML strict, voir `analyserFrontmatter`
 *   2. frontmatter conforme         — `schemas/lecon.frontmatter.schema.json` (Ajv)
 *   3. cohérence dossier ↔ leçon    — `<nn>-<slug>` = `slug` + `ordre`, slugs uniques
 *   4. sections du gabarit          — présentes, uniques, dans l'ordre
 *   5. espaces fines interdites     — U+202F et U+2009 hors blocs de code
 *   6. marqueurs `à-vérifier:`      — interdits dès `statut: publiee`
 *   7. conteneurs `:::`             — liste FERMÉE
 *   8. `quiz.json`                  — obligatoire ; schéma + cohérences inter-champs
 *   9. `simulation.json`            — optionnel ; schéma + cohérences inter-champs
 *  10. `section` tout-ou-rien       — à l'échelle du SUJET, après le passage de toutes les leçons
 *
 * POURQUOI DES RÈGLES « HORS SCHÉMA ».
 * JSON Schema décrit la forme d'UN document ; il ne sait pas comparer deux branches du même
 * document (`bonneReponse` ∈ `choix`), ni deux fichiers entre eux (`quiz.lecon` = `slug` du
 * frontmatter = nom du dossier), ni compter des valeurs distinctes (« au moins 2 types de
 * question »). Ces règles-là vivent donc ici, chacune avec son message.
 *
 * FAIL-CLOSED. Toute chose non comprise est une infraction, jamais un laissez-passer : une ligne de
 * frontmatter hors du sous-ensemble accepté, un conteneur `:::` hors liste, un champ non déclaré au
 * schéma (`additionalProperties: false` partout) font échouer la validation. Même règle que
 * `tools/deploiement/generer-config-swa.mjs`, dont ce fichier reprend la fonction `echec()`.
 *
 * USAGE
 *   node tools/content-pipeline/valider.mjs
 *   node tools/content-pipeline/valider.mjs --racine <chemin>
 *   node tools/content-pipeline/valider.mjs --fixtures <dossier>
 *   node tools/content-pipeline/valider.mjs --clefs   (< tableau JSON sur l'entrée standard)
 *
 * `--fixtures` est le CONTRÔLE POSITIF du garde-fou (leçon L-019) : chaque sous-dossier y est une
 * racine dont on ATTEND qu'elle soit refusée. Le code de sortie y vaut 1 par construction — c'est
 * la liste des causes imprimées qui fait foi, pas le code. Un cas qui passerait est signalé en
 * toutes lettres comme un contrôle manqué.
 *
 * `--clefs` est un mode de TEST, au même titre que `--fixtures` : il expose `clefIndiscernable`
 * à un runner sans ouvrir ce fichier à l'importation. La clef d'indiscernabilité existe en DEUX
 * exemplaires — ici et dans `src/app/features/cours/quiz/quiz.ts` — et la duplication est
 * assumée : la frontière entre l'outillage `.mjs` (troisième programme TypeScript,
 * `tsconfig.tools.json`, Node pur) et la source Angular est délibérée. Ce qui n'est pas
 * acceptable, c'est que le seul lien entre les deux copies soit un COMMENTAIRE (L-008). Ce mode
 * est ce qui permet à `src/clef-indiscernable-parite.spec.ts` de faire calculer un même corpus
 * par les deux implémentations et d'exiger l'égalité valeur par valeur.
 *
 * Le mode d'échec qu'il ferme n'est vicieux que dans un sens : si la copie du validateur devient
 * plus PERMISSIVE que celle du composant, une leçon sort G-content verte puis casse au prerender
 * d'`ng build`, sur un message qui ne nomme pas le fichier, au milieu d'une pile Angular.
 *
 * Entrée : un tableau JSON de chaînes, sur l'entrée standard. Sortie : le tableau JSON des clefs,
 * dans le même ordre. Les deux passent par JSON, et la sortie est ÉCHAPPÉE EN ASCII PUR, parce
 * que les valeurs en jeu sont faites de blanches significatives (U+00A0, tabulation, saut de
 * ligne) et de décompositions Unicode : ni argv ni un flux dépendant de la page de code d'une
 * console Windows ne les transportent sans les abîmer, et un transport qui abîme la valeur
 * fabriquerait une divergence qui n'existe pas.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, resolve, basename } from 'node:path';
// IMPORT NOMMÉ, PAS L'IMPORT PAR DÉFAUT. `import Ajv from 'ajv'` fonctionne à l'exécution (Node
// donne `module.exports`, qui EST la classe) mais ne compile pas sous `checkJs` + `nodenext` : le
// typage résout alors l'espace de noms du module, non constructable (TS2351). L'export nommé
// `Ajv` satisfait les deux — cousin de L-022 : ce qui tourne ne prouve pas ce qui type.
import { Ajv } from 'ajv';
// Le SEUL import que ce fichier fait au pipeline, et il est délibérément minuscule : un module
// sans dépendance, qui ne porte qu'une formule de comptage. Le validateur tourne AVANT le
// compilateur et ne doit pas en dépendre (`build.mjs` : valider, puis compiler) — importer
// `compiler-markdown.mjs` pour cette fonction chargerait Shiki et markdown-it au démarrage du
// validateur et inverserait la stratification du pipeline. Voir `compter-lignes.mjs`.
import { compterLignes } from './compter-lignes.mjs';

const RACINE_DEPOT = process.cwd();
// Chemin CANONIQUE du cours, écrit en séparateurs POSIX : c'est celui du backlog (§E2-ST1, §E3) et
// celui qui s'affiche dans les messages, quel que soit l'OS. `docs/contenu/pipeline-contenu.md`
// annonce encore `content/<sujet>/` sans le segment `cours/` — dérive documentaire connue,
// corrigée au lot 5 ; c'est le backlog qui fait foi.
const RACINE_PAR_DEFAUT = 'content/cours/securite-web';

/**
 * Sections attendues du corps de `lecon.md`, dans cet ordre
 * (`docs/contenu/pipeline-contenu.md` §Structure du corps).
 *
 * La première et la dernière sont ANCRÉES : « L'idée en une image » ouvre toujours, « Aller plus
 * loin » ferme toujours. Entre les deux, l'auteur intercale librement ses sections de théorie —
 * c'est ce qui distingue une leçon d'un formulaire.
 */
const SECTIONS_REQUISES = /** @type {const} */ ([
  "L'idée en une image",
  'Exemple simple',
  'Exemple complet',
  'À toi de jouer',
  'À retenir',
  'Aller plus loin',
]);

/**
 * Conteneurs `:::` autorisés — liste FERMÉE.
 *
 * Le rendu (lot 2) associe à chacun un gabarit, une couleur de jeton et un rôle. Un conteneur
 * inconnu ne « dégrade » pas joliment : il disparaît du rendu ou sort non stylé. On le refuse donc
 * au build, à l'endroit où l'auteur peut encore le corriger.
 */
const CONTENEURS_AUTORISES = new Set([
  'comparaison',
  'vulnerable',
  'corrige',
  'attention',
  'note',
  'a-retenir',
]);

/**
 * Les deux espaces fines INTERDITES dans le corps d'une leçon.
 *
 * Contrainte MATÉRIELLE, pas une préférence de style (E1-ST1-B, `docs/design/polices.md`) : U+202F
 * (fine insécable) est absente de Fraunces COMME d'Inter, et U+2009 (fine) n'est portée que par
 * Inter — titres et corps ne s'espaceraient donc pas pareil. Le sous-ensemble maison qui les
 * récupérerait est précisément ce qui casse `œ`, `« »` et `’` en silence : il est interdit. Seule
 * U+00A0 est permise.
 */
const ESPACES_FINES_INTERDITES = new Map([
  ['\u202f', 'U+202F (espace fine insécable)'],
  ['\u2009', 'U+2009 (espace fine)'],
]);

/** Marqueur de doute du `professeur-web`, consommé par le `verificateur-theorie`. */
const MARQUEUR_DOUTE = 'à-vérifier:';

// ---------------------------------------------------------------------------
// Infrastructure : échec, anomalies, erreurs de lecture
// ---------------------------------------------------------------------------

/**
 * Interrompt la validation sur un constat STRUCTUREL (racine introuvable, schéma illisible).
 *
 * À ne pas confondre avec une anomalie de contenu : celles-ci sont collectées puis imprimées
 * ensemble, pour qu'un auteur voie toutes ses fautes en une passe plutôt qu'une par exécution.
 * `@returns {never}` apprend au compilateur que le flot ne revient jamais d'ici.
 *
 * @param {string} message
 * @param {readonly string[]} [details] lignes de contexte, affichées en puces
 * @returns {never}
 */
function echec(message, details = []) {
  console.error(`\n✖ valider-contenu : ${message}`);
  for (const d of details) console.error(`   · ${d}`);
  console.error('');
  process.exit(1);
}

/**
 * Anomalie de CONTENU : quelque chose qu'un auteur peut corriger dans son fichier.
 * @typedef {{ fichier: string, cause: string }} Anomalie
 */

/**
 * Erreur qui interrompt l'examen d'UNE leçon (frontmatter illisible, JSON malformé) sans
 * interrompre le programme : les autres leçons restent examinées.
 */
class ErreurContenu extends Error {}

// ---------------------------------------------------------------------------
// Frontmatter : un sous-ensemble YAML volontairement minuscule
// ---------------------------------------------------------------------------

/**
 * Sépare le frontmatter du corps.
 *
 * `\r?\n` partout : sur ce poste les fichiers versionnés arrivent indifféremment en LF ou en CRLF
 * et une ancre naïve rate une fin de ligne réelle (L-015).
 */
const MOTIF_FRONTMATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/**
 * Convertit un scalaire du sous-ensemble accepté.
 *
 * @param {string} brut texte à droite du `:` (ou d'un `- `), déjà séparé
 * @param {string} contexte pour le message d'erreur
 * @returns {string | number | boolean | null | string[]}
 */
function scalaire(brut, contexte) {
  const t = brut.trim();
  const cite = /^"([^"\\]*)"(?:\s+#.*)?$/.exec(t) ?? /^'([^']*)'(?:\s+#.*)?$/.exec(t);
  if (cite) return cite[1] ?? '';
  if (t.startsWith('"') || t.startsWith("'")) {
    throw new ErreurContenu(
      `${contexte} : chaîne citée mal fermée, ou contenant une échappée YAML non gérée`,
    );
  }
  // Séquence en ligne : seule la forme vide est acceptée. `[a, b]` est refusé volontairement —
  // l'accepter obligerait à gérer la citation, l'échappement et l'imbrication, c'est-à-dire à
  // écrire un analyseur YAML. Le gabarit demande la forme en blocs `- item`.
  if (t === '[]') return [];
  if (t.startsWith('[') || t.startsWith('{')) {
    throw new ErreurContenu(
      `${contexte} : structure en ligne non acceptée (« ${t} ») — utiliser la forme en blocs « - item »`,
    );
  }
  // `\s` et non `\s+` : deux quantificateurs adjacents dont les classes se chevauchent donnent un
  // retour arrière super-linéaire (S8786). Une seule blanche suffit à reconnaître le début du
  // commentaire ; les blanches qui la précèdent restent en tête et le `.trim()` — qui était DÉJÀ
  // là — les enlève. Sortie identique, à la lettre.
  const sansCommentaire = t.replace(/\s#.*$/, '').trim();
  if (sansCommentaire === '' || sansCommentaire === '~' || sansCommentaire === 'null') return null;
  if (/^-?\d+$/.test(sansCommentaire)) return Number(sansCommentaire);
  if (sansCommentaire === 'true') return true;
  if (sansCommentaire === 'false') return false;
  return sansCommentaire;
}

/**
 * Analyse le frontmatter selon un sous-ensemble YAML STRICT : `cle: scalaire`, `cle:` suivi d'une
 * liste `  - scalaire`, `cle: []`, lignes vides et commentaires `#`. Tout le reste est refusé.
 *
 * POURQUOI PAS UN VRAI ANALYSEUR YAML ICI. Le lot 1 du pipeline n'introduit qu'une dépendance
 * (`ajv`) ; `gray-matter` (et son `js-yaml`) arrive au lot 2 avec le compilateur. La parade au
 * risque de divergence entre les deux lectures n'est pas la ruse mais la STRICTESSE : ce que ce
 * sous-ensemble accepte, YAML l'accepte à l'identique — sauf les dates, laissées ici en CHAÎNE
 * là où js-yaml rendrait un objet `Date`. Le lot 2 doit donc normaliser `cree`/`maj` en chaîne ISO
 * avant de revalider, sinon le schéma (`type: string`) rougira sur un fichier pourtant valide.
 *
 * @param {string} brut contenu entre les deux `---`
 * @returns {Record<string, unknown>}
 */
function analyserFrontmatter(brut) {
  /** @type {Record<string, unknown>} */
  const donnees = {};
  /** @type {string | null} */
  let cleEnCours = null;
  /** @type {Array<string | number | boolean | null | string[]>} */
  let liste = [];

  const fermerListe = () => {
    if (cleEnCours !== null) {
      donnees[cleEnCours] = liste;
      cleEnCours = null;
      liste = [];
    }
  };

  const lignes = brut.split('\n');
  for (let i = 0; i < lignes.length; i++) {
    const ligne = (lignes[i] ?? '').replace(/\r$/, '');
    const contexte = `frontmatter ligne ${i + 2}`;
    if (ligne.trim() === '' || /^\s*#/.test(ligne)) continue;

    // UN seul motif là où il y en avait deux : leur union est exactement `^\s*-` (« tiret indenté »
    // OU « tiret en colonne 0 »). Et `\s` plutôt que `\s+` après le tiret — la blanche
    // supplémentaire tombe dans la capture, que `scalaire()` commence par `.trim()`. Les deux
    // gestes suppriment le retour arrière super-linéaire (S8786) sans toucher à ce qui est accepté.
    const item = /^\s*-\s(.*)$/.exec(ligne);
    if (item) {
      if (cleEnCours === null) {
        throw new ErreurContenu(`${contexte} : élément de liste « - » sans clé au-dessus`);
      }
      liste.push(scalaire(item[1] ?? '', contexte));
      continue;
    }

    const paire = /^([A-Za-z][A-Za-z0-9_-]*):(.*)$/.exec(ligne);
    if (!paire) {
      throw new ErreurContenu(
        `${contexte} : ligne hors du sous-ensemble YAML accepté (« ${ligne.trim()} »)`,
      );
    }
    fermerListe();
    const cle = paire[1] ?? '';
    if (Object.hasOwn(donnees, cle)) {
      throw new ErreurContenu(`${contexte} : clé « ${cle} » répétée`);
    }
    // `\s` et non `\s+` — même raison qu'en tête de `scalaire()`, et même `.trim()` derrière.
    const reste = (paire[2] ?? '').replace(/\s#.*$/, '').trim();
    if (reste === '') {
      cleEnCours = cle;
      liste = [];
    } else {
      donnees[cle] = scalaire(paire[2] ?? '', contexte);
    }
  }
  fermerListe();
  return donnees;
}

// ---------------------------------------------------------------------------
// Lecture du corps : titres, lignes hors code, conteneurs
// ---------------------------------------------------------------------------

/**
 * Découpe le corps en lignes en signalant celles qui sont DANS un bloc de code clôturé.
 *
 * Les blocs de code sont exemptés des règles typographiques et de la liste fermée de conteneurs :
 * un extrait PHP a le droit de contenir n'importe quoi, y compris `:::` ou une espace fine dans une
 * chaîne d'exemple. La clôture suit CommonMark de près : même caractère, longueur au moins égale à
 * l'ouverture.
 *
 * @param {string} corps
 * @returns {Array<{ numero: number, texte: string, code: boolean }>}
 */
function lignesDuCorps(corps) {
  /** @type {Array<{ numero: number, texte: string, code: boolean }>} */
  const resultat = [];
  /** @type {{ caractere: string, longueur: number } | null} */
  let cloture = null;

  const lignes = corps.split('\n');
  for (let i = 0; i < lignes.length; i++) {
    const texte = (lignes[i] ?? '').replace(/\r$/, '');
    // Le motif ne reconnaît QUE le préfixe (indentation + marqueur) ; la fin de ligne se récupère
    // en JS. Un `\s*(.*)$` accolé au marqueur rendait le motif super-linéaire (S8786) alors que
    // seule la question « ce qui suit est-il vide ? » nous intéresse.
    const marque = /^\s{0,3}(`{3,}|~{3,})/.exec(texte);
    if (marque) {
      const suite = marque[1] ?? '';
      const caractere = suite.charAt(0);
      const apres = texte.slice(marque[0].length).trim();
      if (cloture === null) {
        cloture = { caractere, longueur: suite.length };
        resultat.push({ numero: i + 1, texte, code: true });
        continue;
      }
      const fermante =
        caractere === cloture.caractere && suite.length >= cloture.longueur && apres === '';
      resultat.push({ numero: i + 1, texte, code: true });
      if (fermante) cloture = null;
      continue;
    }
    resultat.push({ numero: i + 1, texte, code: cloture !== null });
  }
  return resultat;
}

/**
 * Normalise l'apostrophe typographique en apostrophe droite avant comparaison de titre.
 *
 * Le gabarit s'écrit « L'idée en une image ». Un auteur qui tape U+2019 (’) écrit exactement le bon
 * titre du point de vue du lecteur ; le refuser pour un octet serait un piège, pas un garde-fou.
 *
 * @param {string} texte
 */
function normaliserApostrophes(texte) {
  return texte.replace(/[\u2019\u02bc]/g, "'");
}

/**
 * Titres ATX du corps, blocs de code exclus.
 *
 * CE QUI EST RENDU À PART, ET POURQUOI. Un titre SANS texte (`##` suivi de blanches seulement) ne
 * peut pas entrer dans `titres` : il deviendrait une section fantôme dans le contrôle d'ordre du
 * gabarit, qui rapporterait alors « section manquante » — une cause à côté de la vraie. Mais il ne
 * peut pas non plus être ignoré : le refactor S8786 du 2026-08-17 l'avait fait, et le validateur
 * cessait de mordre là où l'ancien motif `(.+?)` mordait par accident (constat de revue de
 * sécurité). Il sort donc par la seconde porte, `vides`, pour être refusé EN SE NOMMANT — c'est le
 * contrat du dépôt : ce qui n'est pas compris est refusé, jamais ignoré.
 *
 * @param {Array<{ numero: number, texte: string, code: boolean }>} lignes
 * @returns {{ titres: Array<{ niveau: number, texte: string, numero: number }>, vides: number[] }}
 *   `vides` porte les numéros de ligne des titres sans texte
 */
function titresDuCorps(lignes) {
  /** @type {Array<{ niveau: number, texte: string, numero: number }>} */
  const titres = [];
  /** @type {number[]} */
  const vides = [];
  for (const l of lignes) {
    if (l.code) continue;
    // Préfixe seul (`###` + UNE blanche), le titre se prend en JS : `\s+` suivi de `(.+?)\s*$`
    // faisait travailler le moteur sur chaque découpe possible de la blanche (S8786).
    const t = /^(#{1,6})\s/.exec(l.texte);
    if (!t) continue;
    const texte = l.texte.slice(t[0].length).trim();
    if (texte === '') {
      vides.push(l.numero);
      continue;
    }
    titres.push({
      niveau: (t[1] ?? '').length,
      texte: normaliserApostrophes(texte),
      numero: l.numero,
    });
  }
  return { titres, vides };
}

// ---------------------------------------------------------------------------
// Ajv : compilation des trois schémas
// ---------------------------------------------------------------------------

/**
 * Charge un schéma depuis `./schemas/`, résolu par rapport à CE fichier et non au répertoire
 * courant : le validateur doit rester lançable depuis n'importe où.
 *
 * @param {string} nom
 * @returns {object}
 */
function lireSchema(nom) {
  const url = new URL(`./schemas/${nom}`, import.meta.url);
  try {
    return JSON.parse(readFileSync(url, 'utf8'));
  } catch (e) {
    return echec(`schéma illisible : schemas/${nom}`, [e instanceof Error ? e.message : String(e)]);
  }
}

const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: false });
const validerFrontmatter = ajv.compile(lireSchema('lecon.frontmatter.schema.json'));
const validerQuiz = ajv.compile(lireSchema('quiz.schema.json'));
const validerSimulation = ajv.compile(lireSchema('simulation.schema.json'));

/**
 * Rend une erreur Ajv EN FRANÇAIS.
 *
 * POURQUOI TRADUIRE PLUTÔT QU'IMPRIMER `e.message`. Ajv rend « must have required property » : ce
 * message est la seule chose que l'auteur d'une leçon verra quand sa construction échouera, et le
 * produit est francophone. `ajv-i18n` ferait le travail, mais au prix d'une dépendance de plus pour
 * une quinzaine de mots-clés réellement employés par nos trois schémas
 * (`.claude/rules/budget-free-tier.md` : on n'ajoute pas un paquet pour ça).
 *
 * Le `default` conserve le message anglais d'Ajv et NOMME le mot-clé non traduit, plutôt que
 * d'écrire « invalide » : un schéma qui grandira introduira des mots-clés que cette table ne
 * connaît pas encore, et perdre l'information serait pire qu'un mot d'anglais.
 *
 * @param {import('ajv').ErrorObject} e
 * @returns {string}
 */
function decrireErreurAjv(e) {
  const p = /** @type {Record<string, unknown>} */ (e.params);
  const limite = String(p['limit']);
  switch (e.keyword) {
    case 'required':
      return `champ obligatoire absent : « ${String(p['missingProperty'])} »`;
    case 'additionalProperties':
      return `champ inconnu du schéma : « ${String(p['additionalProperty'])} » (faute de frappe ? champ à déclarer ?)`;
    case 'pattern':
      return `ne respecte pas le motif attendu ${String(p['pattern'])}`;
    case 'type':
      return `doit être de type ${String(p['type'])}`;
    case 'enum':
      return `valeur hors de la liste permise (${Array.isArray(p['allowedValues']) ? p['allowedValues'].join(', ') : '?'})`;
    case 'const':
      return `doit valoir exactement « ${String(p['allowedValue'])} »`;
    case 'minItems':
      return `doit compter au moins ${limite} élément(s)`;
    case 'maxItems':
      return `doit compter au plus ${limite} élément(s)`;
    case 'minLength':
      return `doit compter au moins ${limite} caractère(s)`;
    case 'maxLength':
      return `doit compter au plus ${limite} caractère(s)`;
    case 'minimum':
      return `doit valoir au moins ${limite}`;
    case 'maximum':
      return `doit valoir au plus ${limite}`;
    case 'uniqueItems':
      return 'contient deux éléments identiques';
    case 'anyOf':
      return 'ne correspond à aucune des formes acceptées par le schéma';
    case 'dependencies':
      return `le champ « ${String(p['property'])} » en exige un autre : ${String(p['deps'])}`;
    case 'propertyNames':
      return 'un nom de propriété ne respecte pas la forme attendue';
    default:
      return `${e.message ?? 'invalide'} (règle Ajv « ${e.keyword} », non traduite)`;
  }
}

/**
 * Rend la PREMIÈRE erreur Ajv utile, en nommant l'emplacement fautif.
 *
 * Les erreurs de mot-clé `if` sont écartées : elles disent « ne correspond pas au schéma then »,
 * ce qui répète sans informer. C'est précisément la lisibilité que le choix `if/then/else`
 * (plutôt que `oneOf`) sert à obtenir — la garder suppose de ne pas réintroduire le bruit ici.
 *
 * @param {import('ajv').ErrorObject[] | null | undefined} erreurs
 * @returns {string}
 */
function premiereErreurAjv(erreurs) {
  const toutes = erreurs ?? [];
  const utiles = toutes.filter((e) => e.keyword !== 'if');
  const e = utiles[0] ?? toutes[0];
  if (!e) return 'invalide, sans détail rendu par Ajv';
  const ou = e.instancePath === '' ? 'racine du document' : e.instancePath;
  const reste = utiles.length > 1 ? `  (+${utiles.length - 1} autre(s) erreur(s) de schéma)` : '';
  return `${ou} — ${decrireErreurAjv(e)}${reste}`;
}

// ---------------------------------------------------------------------------
// Règles hors schéma
// ---------------------------------------------------------------------------

/**
 * @param {unknown} v
 * @returns {v is Record<string, unknown>}
 */
function estObjet(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * --- 4a. Titre de niveau 1 ---
 *
 * Le corps porte exactement UN `# …`, et c'est le tout premier titre rencontré : c'est lui que la
 * page prerendue affiche en tête, et lui que le manifeste de routes annonce.
 *
 * @param {Array<{ niveau: number, texte: string, numero: number }>} titres
 * @param {(cause: string) => void} signaler
 */
function verifierTitreDeNiveau1(titres, signaler) {
  const h1 = titres.filter((t) => t.niveau === 1);
  if (h1.length !== 1) {
    signaler(
      `le corps doit porter exactement UN titre de niveau 1 (# …) — il en porte ${h1.length}`,
    );
  } else if (titres[0]?.niveau !== 1) {
    signaler('le titre de niveau 1 (# …) doit être le tout premier titre du corps');
  }
}

/**
 * --- 4b. Présence et unicité de chaque section du gabarit ---
 *
 * Rend la position de chaque section requise dans la suite des `##`, ou `null` dès qu'une section
 * manque ou se répète : sans les positions complètes, contrôler l'ORDRE (4c) reviendrait à
 * comparer une liste trouée, donc à signaler un désordre imaginaire par-dessus l'absence déjà
 * signalée.
 *
 * @param {string[]} textesH2 textes des titres de niveau 2, dans l'ordre du corps
 * @param {(cause: string) => void} signaler
 * @returns {number[] | null} positions dans `textesH2`, ou `null` si le relevé est incomplet
 */
function releverPositionsDesSectionsRequises(textesH2, signaler) {
  /** @type {number[]} */
  const positions = [];
  let sectionsCompletes = true;
  for (const attendue of SECTIONS_REQUISES) {
    const occurrences = textesH2.filter((t) => t === attendue).length;
    if (occurrences === 0) {
      signaler(`section « ## ${attendue} » absente du corps (gabarit de pipeline-contenu.md)`);
      sectionsCompletes = false;
      continue;
    }
    if (occurrences > 1) {
      signaler(`section « ## ${attendue} » présente ${occurrences} fois — elle doit être unique`);
      sectionsCompletes = false;
      continue;
    }
    positions.push(textesH2.indexOf(attendue));
  }
  return sectionsCompletes ? positions : null;
}

/**
 * --- 4c. Ordre du gabarit, et bornes (première et dernière section) ---
 *
 * @param {number[]} positions positions des sections requises, dans l'ordre du gabarit
 * @param {string[]} textesH2 textes des titres de niveau 2, dans l'ordre du corps
 * @param {(cause: string) => void} signaler
 */
function verifierOrdreEtBornesDesSections(positions, textesH2, signaler) {
  for (let i = 1; i < positions.length; i++) {
    const precedent = positions[i - 1] ?? -1;
    const courant = positions[i] ?? -1;
    if (courant < precedent) {
      signaler(
        `section « ## ${SECTIONS_REQUISES[i]} » placée avant « ## ${SECTIONS_REQUISES[i - 1]} » — ` +
          "l'ordre du gabarit n'est pas respecté",
      );
      break;
    }
  }
  if (textesH2[0] !== SECTIONS_REQUISES[0]) {
    signaler(
      `la première section de niveau 2 doit être « ## ${SECTIONS_REQUISES[0]} », pas « ## ${textesH2[0] ?? '(aucune)'} »`,
    );
  }
  const derniere = SECTIONS_REQUISES.at(-1);
  const derniereVue = textesH2.at(-1);
  if (derniereVue !== derniere) {
    signaler(
      `la dernière section de niveau 2 doit être « ## ${derniere} », pas « ## ${derniereVue ?? '(aucune)'} »`,
    );
  }
}

/**
 * --- 5. Espaces fines interdites (hors code, hors code en ligne) ---
 *
 * @param {Array<{ numero: number, texte: string, code: boolean }>} lignes
 * @param {(cause: string) => void} signaler
 */
function verifierEspacesFinesInterdites(lignes, signaler) {
  for (const l of lignes) {
    if (l.code) continue;
    // Les segments `code en ligne` sont blanchis SUR PLACE (même longueur) pour que la colonne
    // rapportée reste celle du fichier réel.
    const texte = l.texte.replace(/`+[^`]*`+/g, (m) => ' '.repeat(m.length));
    for (const [caractere, libelle] of ESPACES_FINES_INTERDITES) {
      const colonne = texte.indexOf(caractere);
      if (colonne >= 0) {
        signaler(
          `corps ligne ${l.numero}, colonne ${colonne + 1} : ${libelle} interdite — ` +
            'seule U+00A0 est permise (polices Fraunces/Inter, docs/design/polices.md)',
        );
      }
    }
  }
}

/**
 * --- 6. Marqueur de doute vs statut ---
 *
 * @param {Array<{ numero: number, texte: string, code: boolean }>} lignes
 * @param {string} statut
 * @param {(cause: string) => void} signaler
 */
function verifierMarqueurDeDouteVsStatut(lignes, statut, signaler) {
  if (statut !== 'publiee') return;
  for (const l of lignes) {
    if (l.texte.includes(MARQUEUR_DOUTE)) {
      signaler(
        `corps ligne ${l.numero} : marqueur « ${MARQUEUR_DOUTE} » présent alors que ` +
          '`statut: publiee` — une leçon publiée ne porte plus de doute non tranché',
      );
    }
  }
}

/**
 * --- 7. Conteneurs `:::` en liste fermée ---
 *
 * @param {Array<{ numero: number, texte: string, code: boolean }>} lignes
 * @param {(cause: string) => void} signaler
 */
function verifierConteneursEnListeFermee(lignes, signaler) {
  for (const l of lignes) {
    if (l.code) continue;
    // Préfixe seul (indentation + `:::`), la suite en JS — même raison qu'en `lignesDuCorps` et
    // `titresDuCorps` : `\s*(.*)$` accolé au marqueur rend le motif super-linéaire (S8786).
    const marque = /^\s{0,3}:{3,}/.exec(l.texte);
    if (!marque) continue;
    const suite = l.texte.slice(marque[0].length).trim();
    if (suite === '') continue; // fermeture d'un conteneur
    const nom = /^([A-Za-z0-9-]+)/.exec(suite);
    if (!nom) {
      signaler(`corps ligne ${l.numero} : conteneur « ::: ${suite} » sans nom lisible`);
      continue;
    }
    const identifiant = nom[1] ?? '';
    if (!CONTENEURS_AUTORISES.has(identifiant)) {
      signaler(
        `corps ligne ${l.numero} : conteneur « ::: ${identifiant} » hors de la liste fermée ` +
          `(${[...CONTENEURS_AUTORISES].join(', ')})`,
      );
    }
  }
}

/**
 * Vérifie le corps : sections, typographie, marqueurs de doute, conteneurs.
 *
 * L'ORDRE DES APPELS EST LE CONTRAT. Les anomalies sortent dans l'ordre où elles sont signalées,
 * et cet ordre est comparé d'une exécution à l'autre (même raison que `comparerOctets` plus bas) :
 * ne pas réordonner ces étapes sans en mesurer l'effet sur la sortie du gate.
 *
 * @param {string} corps
 * @param {string} statut
 * @param {(cause: string) => void} signaler
 */
function verifierCorps(corps, statut, signaler) {
  const lignes = lignesDuCorps(corps);
  const { titres, vides } = titresDuCorps(lignes);

  // --- 4. Sections du gabarit ---------------------------------------------
  // Les titres SANS texte se signalent AVANT tout le reste, et par leur vraie cause. Placés après,
  // ils seraient précédés d'un « section manquante » qui enverrait l'auteur corriger la mauvaise
  // ligne — or la première anomalie est celle que le contrôle positif compare.
  for (const numero of vides) {
    signaler(`corps ligne ${numero} : titre de section sans texte (« # » suivi de blanches seules)`);
  }
  verifierTitreDeNiveau1(titres, signaler);
  const textesH2 = titres.filter((t) => t.niveau === 2).map((t) => t.texte);
  const positions = releverPositionsDesSectionsRequises(textesH2, signaler);
  if (positions !== null) verifierOrdreEtBornesDesSections(positions, textesH2, signaler);

  // --- 5. Espaces fines interdites (hors code, hors code en ligne) ---------
  verifierEspacesFinesInterdites(lignes, signaler);

  // --- 6. Marqueur de doute vs statut -------------------------------------
  verifierMarqueurDeDouteVsStatut(lignes, statut, signaler);

  // --- 7. Conteneurs `:::` en liste fermée ---------------------------------
  verifierConteneursEnListeFermee(lignes, signaler);
}

/**
 * 🔴 LA CLEF D'INDISCERNABILITÉ — le cœur de la règle, écrit ici parce que le composant
 * (`src/app/features/cours/quiz/quiz.ts`) porte la MÊME et doit la porter à l'identique.
 *
 * L'invariant réellement voulu n'est pas « deux chaînes d'octets égales », c'est « deux
 * champs que RIEN ne distingue à l'écran ». Une comparaison brute laisse donc passer
 * `HSTS` contre `HSTS␠` (blanche de fin), contre `HSTS␠` en U+00A0, ou contre la même
 * chaîne en NFD — et le rendu pose alors deux `<select>` au nom accessible identique,
 * ce que la règle existait précisément pour empêcher.
 *
 * Ce n'est pas un cas exotique : `.claude/rules/contenu-pedagogique.md` §3 IMPOSE U+00A0
 * dans le contenu du site. La collision est organisée par le projet lui-même.
 *
 * `\s` couvre U+00A0 et U+202F en JavaScript : replier toute suite de blanches sur une
 * espace ordinaire, puis rogner les bords, rend indiscernables exactement les chaînes que
 * l'œil ne sépare pas. La normalisation NFC replie en plus les décompositions Unicode
 * (`é` en un point de code contre `e` + accent combinant).
 *
 * @param {string} valeur
 * @returns {string}
 */
function clefIndiscernable(valeur) {
  return valeur.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/**
 * Relève les groupes de valeurs INDISCERNABLES qui apparaissent plus d'une fois, dans
 * l'ordre de leur première occurrence. Un message qui NOMME la valeur fautive vaut mieux
 * qu'un message qui annonce seulement qu'il en existe une : l'auteur cherche sinon à
 * l'œil dans un lot de huit paires.
 *
 * La comparaison se fait sur `clefIndiscernable`, mais chaque groupe conserve les valeurs
 * BRUTES rencontrées : c'est celles-là que l'auteur doit reconnaître dans son fichier, pas
 * une forme normalisée qu'il n'y trouvera nulle part.
 *
 * @param {readonly string[]} valeurs
 * @returns {{ brutes: string[], invisible: boolean }[]}
 */
function releverDoublons(valeurs) {
  /** @type {Map<string, { brutes: string[], occurrences: number }>} */
  const parClef = new Map();
  for (const valeur of valeurs) {
    const clef = clefIndiscernable(valeur);
    const groupe = parClef.get(clef);
    if (groupe === undefined) {
      parClef.set(clef, { brutes: [valeur], occurrences: 1 });
      continue;
    }
    groupe.occurrences += 1;
    if (!groupe.brutes.includes(valeur)) groupe.brutes.push(valeur);
  }
  return [...parClef.values()]
    .filter((groupe) => groupe.occurrences > 1)
    .map((groupe) => ({ brutes: groupe.brutes, invisible: groupe.brutes.length > 1 }));
}

/**
 * Met une liste de valeurs en forme pour un message d'anomalie : « a », « b ».
 * Fonction plutôt qu'expression en ligne — un `map(…).join(…)` interpolé dans un
 * gabarit de chaîne y imbrique un second gabarit, que la règle
 * `sonarjs/no-nested-template-literals` refuse.
 *
 * @param {readonly string[]} valeurs
 * @returns {string}
 */
function enumererEntreGuillemets(valeurs) {
  return valeurs.map((valeur) => `« ${valeur} »`).join(', ');
}

/**
 * Décrit les groupes rendus par `releverDoublons`. Un groupe dont les valeurs brutes
 * DIFFÈRENT le dit : sans cette mention, l'auteur lirait deux libellés visuellement
 * identiques entre guillemets et croirait à un défaut du validateur, alors que la
 * différence est justement celle qu'il ne peut pas voir.
 *
 * @param {readonly { brutes: string[], invisible: boolean }[]} groupes
 * @returns {string}
 */
function decrireDoublons(groupes) {
  const invisible = groupes.some((groupe) => groupe.invisible);
  const liste = groupes.map((groupe) => enumererEntreGuillemets(groupe.brutes)).join(', ');
  if (!invisible) return liste;
  return `${liste} — ces libellés ne diffèrent que par des blanches ou une normalisation Unicode, donc rien ne les distingue à l'écran`;
}

/**
 * Cohérences d'une question `choix-multiple` : identifiants de choix distincts, et
 * `bonneReponse` qui désigne réellement l'un d'eux.
 *
 * Un `bonneReponse` orphelin est le défaut le plus coûteux du format : le schéma ne peut pas
 * l'exprimer (il faudrait comparer une valeur à une liste voisine), et une question dont aucune
 * réponse n'est bonne ne se voit qu'à l'usage, en pleine leçon.
 *
 * ℹ️ La clef d'indiscernabilité est PARTAGÉE avec `gauche`, mais elle est ici une IDENTITÉ :
 * `choix[].id` est tenu au kebab-case par le schéma (`#/definitions/identifiant`), motif qui
 * n'admet ni blanche ni caractère hors ASCII. Aucun `id` légal ne peut donc changer en
 * traversant `clefIndiscernable`. On la passe quand même, par une seule fonction de relevé —
 * deux fonctions divergeraient, et celle-ci ne peut rien relâcher sur un `id` valide.
 *
 * @param {Record<string, unknown>} q question déjà validée par le schéma
 * @param {string} id identifiant de la question, tel qu'il est rapporté
 * @param {(cause: string) => void} signaler
 */
function verifierQuestionChoixMultiple(q, id, signaler) {
  const choix = Array.isArray(q['choix']) ? q['choix'] : [];
  const idsChoix = choix
    .map((c) => (estObjet(c) && typeof c['id'] === 'string' ? c['id'] : null))
    .filter((c) => c !== null);
  const idsRepetes = releverDoublons(idsChoix);
  if (idsRepetes.length > 0) {
    // Deux choix au même `id` rendent deux radios de même `value` dans le même groupe :
    // le visiteur en coche une, la correction lit l'autre — et la question devient
    // infalsifiable. Le composant le refuse aussi (`quiz.ts`), mais c'est ICI que le
    // message nomme le FICHIER, avant que le prerender ne casse au milieu d'une pile
    // Angular. Le nommer ici ne dispense pas de l'y garder : le composant est la
    // frontière de confiance contre un artéfact d'une AUTRE version du pipeline.
    signaler(
      `question « ${id} » : « choix » — deux choix portent le même « id » ` +
        `(${decrireDoublons(idsRepetes)})`,
    );
  }
  if (!idsChoix.includes(String(q['bonneReponse']))) {
    signaler(
      `question « ${id} » : « bonneReponse » vaut « ${String(q['bonneReponse'])} », qui n'est ` +
        `l'identifiant d'aucun choix (${idsChoix.join(', ') || 'aucun'})`,
    );
  }
}

/**
 * Cohérence d'une question `associer` : deux paires ne peuvent pas porter le même
 * libellé `gauche`.
 *
 * POURQUOI ICI, ET PAS SEULEMENT DANS LE COMPOSANT. Le rendu (décision D-1, backlog
 * §E2-ST3) pose un `<select>` par ligne de gauche, indexé par son RANG ; deux libellés
 * identiques donnent donc deux champs que rien ne distingue à l'écran, sur une
 * correction ligne à ligne devenue illisible. `quiz.ts` le refuse — mais il le refuse
 * au PRERENDER, sur un message qui nomme la question et le champ sans nommer le
 * fichier, au milieu d'une pile Angular. Une leçon légale au schéma sortait donc
 * G-content VERT avant de casser `ng build`. Le contrôle du composant reste en place :
 * il cesse seulement d'être le premier à parler.
 *
 * ⚠️ L'ÉGALITÉ D'OCTETS N'EST PAS L'INDISCERNABILITÉ (lot E-a). La comparaison passe par
 * `clefIndiscernable` : `HSTS` et `HSTS` suivi d'une U+00A0 rendraient deux `<select>` au
 * nom accessible identique tout en étant deux chaînes distinctes. Le contenu du site
 * EMPLOIE U+00A0 par consigne (`.claude/rules/contenu-pedagogique.md` §3) — la collision
 * est donc organisée par le projet, pas hypothétique.
 *
 * ⚠️ `droite`, LUI, A LE DROIT DE SE RÉPÉTER — et ce n'est pas un oubli. La clause de
 * D-1 est explicite : forcer l'unicité des réponses transformerait l'exercice en sudoku
 * et masquerait la vraie erreur de compréhension. Le rendu déduplique les `<option>` ;
 * la correction dit ligne par ligne ce qui est juste. Ne pas « compléter » cette
 * fonction par symétrie.
 *
 * @param {Record<string, unknown>} q question déjà validée par le schéma
 * @param {string} id identifiant de la question, tel qu'il est rapporté
 * @param {(cause: string) => void} signaler
 */
function verifierQuestionAssocier(q, id, signaler) {
  const paires = Array.isArray(q['paires']) ? q['paires'] : [];
  const gauches = paires
    .map((p) => (estObjet(p) && typeof p['gauche'] === 'string' ? p['gauche'] : null))
    .filter((g) => g !== null);
  const gauchesRepetes = releverDoublons(gauches);
  if (gauchesRepetes.length > 0) {
    signaler(
      `question « ${id} » : « paires » — deux paires portent le même « gauche » ` +
        `(${decrireDoublons(gauchesRepetes)})`,
    );
  }
}

/**
 * Cohérence d'une question `trouver-la-faille` : la ligne désignée comme fautive existe
 * réellement dans l'extrait de code fourni.
 *
 * @param {Record<string, unknown>} q question déjà validée par le schéma
 * @param {string} id identifiant de la question, tel qu'il est rapporté
 * @param {(cause: string) => void} signaler
 */
function verifierQuestionTrouverLaFaille(q, id, signaler) {
  const code = typeof q['code'] === 'string' ? q['code'] : '';
  // 🔴 `compterLignes` PARTAGÉ, ET SURTOUT PAS `code.split('\n').length` (E2-ST4, lot B).
  // C'est ce que cette ligne faisait jusqu'au 2026-08-18, et les deux comptages du pipeline
  // avaient divergé d'une ligne : sur un `code` terminé par un saut de ligne, `split` compte la
  // chaîne VIDE qui suit le dernier saut, donc ce garde-fou acceptait `ligneFautive = N+1` — une
  // ligne que le quiz affiche vide et que personne ne peut désigner à l'écran. Le compilateur,
  // lui, refusait déjà `{lignes="N+1"}` sur le même extrait. Aucun des deux n'était rouge : ils
  // ne se comparaient à rien. Contrôle positif : `__fixtures__/invalides/quiz-ligne-fautive-hors-extrait`.
  const nbLignes = compterLignes(code);
  const fautive = typeof q['ligneFautive'] === 'number' ? q['ligneFautive'] : 0;
  if (fautive > nbLignes) {
    signaler(
      `question « ${id} » : « ligneFautive » vaut ${fautive} alors que « code » ne compte que ${nbLignes} ligne(s)`,
    );
  }
}

/**
 * Cohérences internes du quiz que JSON Schema ne peut pas exprimer.
 *
 * @param {Record<string, unknown>} quiz déjà validé par le schéma
 * @param {string} slug
 * @param {(cause: string) => void} signaler
 */
function verifierQuizHorsSchema(quiz, slug, signaler) {
  if (quiz['lecon'] !== slug) {
    signaler(
      `« lecon »: « ${String(quiz['lecon'])} » ne correspond pas au slug de la leçon « ${slug} »`,
    );
  }
  const questions = Array.isArray(quiz['questions']) ? quiz['questions'] : [];

  /** @type {Set<string>} */
  const ids = new Set();
  /** @type {Set<string>} */
  const types = new Set();
  questions.forEach((q, i) => {
    if (!estObjet(q)) return;
    const id = typeof q['id'] === 'string' ? q['id'] : `#${i + 1}`;
    if (ids.has(id)) signaler(`question « ${id} » : identifiant répété`);
    ids.add(id);
    if (typeof q['type'] === 'string') types.add(q['type']);

    if (q['type'] === 'choix-multiple') verifierQuestionChoixMultiple(q, id, signaler);
    if (q['type'] === 'associer') verifierQuestionAssocier(q, id, signaler);
    if (q['type'] === 'trouver-la-faille') verifierQuestionTrouverLaFaille(q, id, signaler);
  });

  // « Au moins 2 types différents » (pipeline-contenu.md §quiz) : un quiz mono-type teste la
  // mémoire d'un format, pas la compréhension d'un concept.
  if (questions.length > 0 && types.size < 2) {
    signaler(
      `le quiz n'emploie qu'un seul type de question (« ${[...types].join(', ')} ») — le gabarit en exige au moins 2`,
    );
  }
}

/**
 * Cohérences internes de la simulation que JSON Schema ne peut pas exprimer.
 *
 * @param {Record<string, unknown>} simulation déjà validée par le schéma
 * @param {string} slug
 * @param {(cause: string) => void} signaler
 */
function verifierSimulationHorsSchema(simulation, slug, signaler) {
  if (simulation['lecon'] !== slug) {
    signaler(
      `« lecon »: « ${String(simulation['lecon'])} » ne correspond pas au slug de la leçon « ${slug} »`,
    );
  }
  const acteurs = Array.isArray(simulation['acteurs']) ? simulation['acteurs'] : [];
  /** @type {Set<string>} */
  const idsActeurs = new Set();
  for (const a of acteurs) {
    if (!estObjet(a) || typeof a['id'] !== 'string') continue;
    if (idsActeurs.has(a['id'])) signaler(`acteur « ${a['id']} » : identifiant répété`);
    idsActeurs.add(a['id']);
  }

  /**
   * @param {unknown} id
   * @param {string} ou
   */
  const exigerActeurConnu = (id, ou) => {
    if (typeof id === 'string' && !idsActeurs.has(id)) {
      signaler(
        `${ou} désigne l'acteur inconnu « ${id} » (déclarés : ${[...idsActeurs].join(', ')})`,
      );
    }
  };

  const etapes = Array.isArray(simulation['etapes']) ? simulation['etapes'] : [];
  etapes.forEach((etape, i) => {
    if (!estObjet(etape)) return;
    if (etape['numero'] !== i + 1) {
      signaler(
        `étape en position ${i + 1} : « numero » vaut ${String(etape['numero'])} — il doit suivre la position`,
      );
    }
    const etat = estObjet(etape['etatVisuel']) ? etape['etatVisuel'] : {};
    exigerActeurConnu(etat['acteurActif'], `étape ${i + 1} : « acteurActif »`);
    const fleche = estObjet(etat['fleche']) ? etat['fleche'] : null;
    if (fleche) {
      exigerActeurConnu(fleche['de'], `étape ${i + 1} : « fleche.de »`);
      exigerActeurConnu(fleche['vers'], `étape ${i + 1} : « fleche.vers »`);
      if (fleche['de'] === fleche['vers']) {
        signaler(`étape ${i + 1} : « fleche » part et arrive au même acteur`);
      }
    }
    const panneaux = estObjet(etat['panneaux']) ? etat['panneaux'] : {};
    for (const cle of Object.keys(panneaux)) {
      exigerActeurConnu(cle, `étape ${i + 1} : clé de « panneaux »`);
    }
    const surbrillance = Array.isArray(etat['surbrillance']) ? etat['surbrillance'] : [];
    for (const id of surbrillance) exigerActeurConnu(id, `étape ${i + 1} : « surbrillance »`);
  });
}

// ---------------------------------------------------------------------------
// Validation d'une leçon, puis d'une racine
// ---------------------------------------------------------------------------

/**
 * Lit et valide un JSON annexe (`quiz.json`, `simulation.json`).
 *
 * @param {string} chemin
 * @param {(donnees: Record<string, unknown>) => void} suite
 * @param {(cause: string) => void} signaler
 */
function avecJson(chemin, suite, signaler) {
  let donnees;
  try {
    donnees = JSON.parse(readFileSync(chemin, 'utf8'));
  } catch (e) {
    signaler(`JSON illisible : ${e instanceof Error ? e.message : String(e)}`);
    return;
  }
  if (!estObjet(donnees)) {
    signaler('le document JSON doit être un objet');
    return;
  }
  suite(donnees);
}

/**
 * --- 3. Cohérence dossier ↔ frontmatter ---
 *
 * Le nom du dossier (`<nn>-<slug>`) et le frontmatter disent DEUX FOIS la même chose : la position
 * de la leçon et son slug. Deux sources doivent concorder, sinon l'URL prerendue et le lien qui y
 * mène finissent par diverger.
 *
 * @param {RegExpExecArray | null} decoupe résultat du découpage du nom de dossier, ou `null` si le
 *   nommage est déjà signalé comme invalide — rien n'est alors comparable
 * @param {Record<string, unknown>} frontmatter déjà validé par le schéma
 * @param {string} slug slug déclaré par le frontmatter
 * @param {(cause: string) => void} signaler
 */
function verifierCoherenceDossierEtFrontmatter(decoupe, frontmatter, slug, signaler) {
  if (!decoupe) return;
  const nn = decoupe[1] ?? '';
  const slugDossier = decoupe[2] ?? '';
  if (slugDossier !== slug) {
    signaler(
      `le slug du frontmatter (« ${slug} ») diffère du suffixe du dossier (« ${slugDossier} »)`,
    );
  }
  if (frontmatter['ordre'] !== Number(nn)) {
    signaler(
      `« ordre » vaut ${String(frontmatter['ordre'])} alors que le dossier annonce ${Number(nn)} (« ${nn}- »)`,
    );
  }
}

/**
 * Le `<h1>` doit reprendre le titre du frontmatter : c'est le titre que la page prerendue affiche
 * et celui que le manifeste de routes annonce. Deux titres différents, c'est une page qui ne dit
 * pas la même chose que le lien qui y mène.
 *
 * @param {string} corps corps du Markdown, frontmatter retiré
 * @param {Record<string, unknown>} frontmatter déjà validé par le schéma
 * @param {(cause: string) => void} signaler
 */
function verifierTitreContreFrontmatter(corps, frontmatter, signaler) {
  // Les titres VIDES ne concernent pas cette comparaison — `verifierCorps` les a déjà signalés,
  // et un titre sans texte ne peut de toute façon pas être le `<h1>` attendu.
  const { titres } = titresDuCorps(lignesDuCorps(corps));
  const premierTitre = titres.find((t) => t.niveau === 1);
  const titreAttendu = normaliserApostrophes(String(frontmatter['titre']));
  if (premierTitre && premierTitre.texte !== titreAttendu) {
    signaler(
      `le titre de niveau 1 (« ${premierTitre.texte} ») diffère du « titre » du frontmatter (« ${titreAttendu} »)`,
    );
  }
}

/**
 * --- 8. `quiz.json` (obligatoire) ---
 *
 * Toute leçon porte son quiz : son absence est une anomalie, pas une option. Les anomalies du quiz
 * sont rapportées sous SON chemin à lui, pas sous celui de `lecon.md` — l'auteur doit savoir quel
 * fichier ouvrir.
 *
 * @param {string} dossier chemin absolu du dossier de la leçon
 * @param {string} slug slug déclaré par le frontmatter de la leçon
 * @param {Anomalie[]} anomalies collecteur, muté sur place
 */
function validerQuizDeLecon(dossier, slug, anomalies) {
  const cheminQuiz = join(dossier, 'quiz.json');
  const relQuiz = relative(RACINE_DEPOT, cheminQuiz).replaceAll('\\', '/');
  /** @param {string} cause */
  const signalerQuiz = (cause) => anomalies.push({ fichier: relQuiz, cause });
  if (!existsSync(cheminQuiz)) {
    signalerQuiz('fichier obligatoire absent — toute leçon porte son quiz');
    return;
  }
  avecJson(
    cheminQuiz,
    (quiz) => {
      if (!validerQuiz(quiz)) {
        signalerQuiz(premiereErreurAjv(validerQuiz.errors));
        return;
      }
      verifierQuizHorsSchema(quiz, slug, signalerQuiz);
    },
    signalerQuiz,
  );
}

/**
 * --- 9. `simulation.json` (optionnel) ---
 *
 * Absente, la simulation ne dit rien ; présente, elle est validée comme le reste.
 *
 * @param {string} dossier chemin absolu du dossier de la leçon
 * @param {string} slug slug déclaré par le frontmatter de la leçon
 * @param {Anomalie[]} anomalies collecteur, muté sur place
 */
function validerSimulationDeLecon(dossier, slug, anomalies) {
  const cheminSimulation = join(dossier, 'simulation.json');
  if (!existsSync(cheminSimulation)) return;
  const relSimulation = relative(RACINE_DEPOT, cheminSimulation).replaceAll('\\', '/');
  /** @param {string} cause */
  const signalerSimulation = (cause) => anomalies.push({ fichier: relSimulation, cause });
  avecJson(
    cheminSimulation,
    (simulation) => {
      if (!validerSimulation(simulation)) {
        signalerSimulation(premiereErreurAjv(validerSimulation.errors));
        return;
      }
      verifierSimulationHorsSchema(simulation, slug, signalerSimulation);
    },
    signalerSimulation,
  );
}

/**
 * Valide UNE leçon (un dossier contenant `lecon.md`).
 *
 * @param {string} dossier chemin absolu du dossier de la leçon
 * @returns {{ anomalies: Anomalie[], slug: string | null, ordre: unknown, sujet: unknown, section: unknown }}
 */
function validerLecon(dossier) {
  /** @type {Anomalie[]} */
  const anomalies = [];
  const cheminLecon = join(dossier, 'lecon.md');
  const relLecon = relative(RACINE_DEPOT, cheminLecon).replaceAll('\\', '/');

  /** @param {string} cause */
  const signalerLecon = (cause) => anomalies.push({ fichier: relLecon, cause });

  const nomDossier = basename(dossier);
  const decoupe = /^(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(nomDossier);
  if (!decoupe) {
    signalerLecon(
      `le dossier « ${nomDossier} » ne suit pas le nommage « <nn>-<slug> » (deux chiffres, tiret, slug kebab-case)`,
    );
  }

  const texte = readFileSync(cheminLecon, 'utf8');
  const separation = MOTIF_FRONTMATTER.exec(texte);
  if (!separation) {
    signalerLecon('frontmatter absent ou non fermé — le fichier doit ouvrir par une ligne « --- »');
    return { anomalies, slug: null, ordre: null, sujet: null, section: null };
  }

  /** @type {Record<string, unknown>} */
  let frontmatter;
  try {
    frontmatter = analyserFrontmatter(separation[1] ?? '');
  } catch (e) {
    signalerLecon(e instanceof ErreurContenu ? e.message : String(e));
    return { anomalies, slug: null, ordre: null, sujet: null, section: null };
  }

  // --- 2. Schéma du frontmatter -------------------------------------------
  if (!validerFrontmatter(frontmatter)) {
    signalerLecon(`frontmatter : ${premiereErreurAjv(validerFrontmatter.errors)}`);
    return { anomalies, slug: null, ordre: null, sujet: null, section: null };
  }

  const slug = String(frontmatter['slug']);
  const statut = String(frontmatter['statut']);

  // --- 3. Cohérence dossier ↔ frontmatter ---------------------------------
  verifierCoherenceDossierEtFrontmatter(decoupe, frontmatter, slug, signalerLecon);

  // --- 4 à 7. Corps --------------------------------------------------------
  const corps = texte.slice(separation[0].length);
  verifierCorps(corps, statut, signalerLecon);
  verifierTitreContreFrontmatter(corps, frontmatter, signalerLecon);

  // --- 8. quiz.json (obligatoire) -----------------------------------------
  validerQuizDeLecon(dossier, slug, anomalies);

  // --- 9. simulation.json (optionnel) --------------------------------------
  validerSimulationDeLecon(dossier, slug, anomalies);

  return {
    anomalies,
    slug,
    ordre: frontmatter['ordre'],
    sujet: frontmatter['sujet'],
    section: frontmatter['section'],
  };
}

/**
 * Ordre total stable sur les unités de code UTF-16 — indépendant de la locale et de la plateforme.
 * Même fonction, même raison que dans `tools/a11y/verifier-axe.mjs` et
 * `tools/deploiement/generer-config-swa.mjs` (L-009) : ce sont des chemins et des noms de dossiers
 * ASCII, et l'ORDRE DES ANOMALIES rapportées doit être le même sur ce poste Windows et sur le
 * runner Linux — sinon deux exécutions du même gate ne se comparent plus.
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
 * Recense les leçons d'une racine : les dossiers qui contiennent un `lecon.md`, à n'importe quelle
 * profondeur.
 *
 * POURQUOI UN RECENSEMENT PAR `lecon.md` ET NON PAR DOSSIER. `content/` porte déjà un `README.md`
 * et un `.gitkeep` ; un jour il portera des ressources partagées. Recenser « tout dossier sous la
 * racine » ferait de chacun d'eux une leçon amputée. C'est le fichier obligatoire qui déclare une
 * leçon, pas la présence d'un dossier.
 *
 * @param {string} racine
 * @returns {string[]} chemins absolus des dossiers de leçon, triés
 */
function recenserLecons(racine) {
  /** @type {string[]} */
  const trouves = [];
  /** @param {string} dossier */
  const descendre = (dossier) => {
    for (const entree of readdirSync(dossier, { withFileTypes: true })) {
      const chemin = join(dossier, entree.name);
      if (entree.isDirectory()) descendre(chemin);
      else if (entree.name === 'lecon.md') trouves.push(dossier);
    }
  };
  descendre(racine);
  return trouves.sort(comparerOctets);
}

/**
 * Exige qu'une valeur soit portée par UNE SEULE leçon de la racine, et nomme le premier porteur
 * quand elle se répète.
 *
 * POURQUOI NOMMER LE PREMIER PORTEUR. Un doublon de slug ou d'ordre ne se corrige pas en regardant
 * la leçon qui rougit : il faut voir les DEUX pour décider laquelle se déplace. Un message qui ne
 * cite qu'un des deux fichiers renvoie l'auteur à une chasse manuelle.
 *
 * @template T
 * @param {Map<T, string>} dejaVus valeurs déjà rencontrées → chemin relatif de leur porteur
 * @param {T} valeur valeur portée par la leçon courante
 * @param {string} rel chemin relatif de la leçon courante
 * @param {(premierPorteur: string) => string} decrire rend la cause, le premier porteur en main
 * @param {Anomalie[]} anomalies collecteur, muté sur place
 */
function exigerUniciteDansLaRacine(dejaVus, valeur, rel, decrire, anomalies) {
  const dejaVu = dejaVus.get(valeur);
  if (dejaVu === undefined) {
    dejaVus.set(valeur, rel);
    return;
  }
  anomalies.push({ fichier: rel, cause: decrire(dejaVu) });
}

/**
 * Exige le TOUT-OU-RIEN de `section` à l'échelle d'un SUJET (E2-ST6, décision D-2).
 *
 * `section` est optionnelle et sans contrainte de contiguïté : un sujet peut n'en porter aucune
 * (le sommaire rend alors une liste ordonnée à plat), ou en porter partout (le sommaire groupe).
 * Ce qui est refusé, c'est le MÉLANGE. Un groupement partiel ne casse rien au build : il produit
 * une carte de parcours où certains modules flottent hors de toute section — un défaut
 * d'AFFICHAGE silencieux, du genre que personne ne remarque avant de le voir en ligne. On le
 * transforme donc en échec de construction, là où l'auteur a encore son fichier sous les yeux.
 *
 * POURQUOI LA RÈGLE VIT ICI ET NULLE PART AILLEURS. Ni le schéma JSON (qui ne voit qu'un fichier)
 * ni `compilerLecon` (qui ne voit qu'une leçon) ne peuvent l'exprimer : elle porte sur la
 * COLLECTION. `validerRacine` est la seule fonction du pipeline qui les recense toutes.
 *
 * POURQUOI LES FAUTIVES SONT CELLES QUI N'EN ONT PAS, ET POURQUOI ON NOMME AUSSI L'AUTRE CAMP.
 * Dès qu'une leçon porte une section, l'auteur a décidé de grouper ce sujet ; les leçons sans
 * section sont les oubliées. Le message cite le premier porteur — même raison que
 * `exigerUniciteDansLaRacine` : on ne corrige pas un mélange en regardant seulement le fichier
 * qui rougit, il faut voir de quelle décision il s'écarte.
 *
 * @param {ReadonlyMap<string, { avec: { rel: string, slug: string }[], sans: { rel: string, slug: string }[] }>} parSujet
 * @param {Anomalie[]} anomalies collecteur, muté sur place
 */
function exigerSectionsToutOuRien(parSujet, anomalies) {
  for (const [sujet, groupes] of parSujet) {
    const premierPorteur = groupes.avec[0];
    if (premierPorteur === undefined || groupes.sans.length === 0) continue;
    for (const orpheline of groupes.sans) {
      anomalies.push({
        fichier: `${orpheline.rel}/lecon.md`,
        cause:
          `la leçon « ${orpheline.slug} » n'a pas de « section » alors que « ${premierPorteur.slug} » ` +
          `(${premierPorteur.rel}/lecon.md) en porte une — dans le sujet « ${sujet} », ` +
          'le champ « section » est tout-ou-rien : soit toutes les leçons en portent une, soit aucune',
      });
    }
  }
}

/**
 * Range UNE leçon dans le relevé « porte une section / n'en porte pas » de son sujet.
 *
 * Extrait de `validerRacine` pour la garder sous le seuil de complexité cognitive : cette
 * répartition est un geste à part, et la sortir la rend lisible sans changer ce qu'elle fait.
 *
 * ⚠️ SEULES LES LEÇONS AU FRONTMATTER VALIDE ENTRENT. `validerLecon` rend `slug: null` dès que le
 * frontmatter est illisible ou refusé par le schéma ; y faire entrer une telle leçon ferait
 * rapporter un mélange de sections sur un fichier dont la vraie faute est ailleurs, c'est-à-dire
 * une SECONDE cause pour une seule anomalie — ce que le mode `--fixtures` interdit par contrat.
 *
 * @param {Map<string, { avec: { rel: string, slug: string }[], sans: { rel: string, slug: string }[] }>} parSujet
 * @param {{ slug: string | null, sujet: unknown, section: unknown }} resultat sortie de `validerLecon`
 * @param {string} rel chemin relatif du dossier de la leçon
 */
function releverSection(parSujet, resultat, rel) {
  if (typeof resultat.sujet !== 'string' || resultat.slug === null) return;
  let groupes = parSujet.get(resultat.sujet);
  if (groupes === undefined) {
    groupes = { avec: [], sans: [] };
    parSujet.set(resultat.sujet, groupes);
  }
  const ou = resultat.section === undefined ? groupes.sans : groupes.avec;
  ou.push({ rel, slug: resultat.slug });
}

/**
 * Valide toutes les leçons d'une racine.
 *
 * @param {string} racine chemin absolu
 * @returns {{ lecons: number, anomalies: Anomalie[] }}
 */
function validerRacine(racine) {
  /** @type {Anomalie[]} */
  const anomalies = [];
  const dossiers = recenserLecons(racine);

  /** @type {Map<string, string>} */
  const slugsVus = new Map();
  /** @type {Map<number, string>} */
  const ordresVus = new Map();
  /** @type {Set<string>} */
  const sujets = new Set();
  /**
   * Les leçons de chaque sujet, réparties selon qu'elles portent une `section` ou non.
   * Indexée par SUJET DÉCLARÉ, et non par racine : c'est le sujet qui définit le cours, donc
   * la carte de parcours à grouper. (Une racine ne porte qu'un sujet — voir le contrôle
   * `sujets.size > 1` plus bas — mais l'indexation reste celle du contrat, pas celle du disque.)
   * @type {Map<string, { avec: { rel: string, slug: string }[], sans: { rel: string, slug: string }[] }>}
   */
  const sectionsParSujet = new Map();

  for (const dossier of dossiers) {
    const rel = relative(RACINE_DEPOT, dossier).replaceAll('\\', '/');
    const resultat = validerLecon(dossier);
    anomalies.push(...resultat.anomalies);
    if (resultat.slug !== null) {
      const slug = resultat.slug;
      exigerUniciteDansLaRacine(
        slugsVus,
        slug,
        rel,
        (dejaVu) =>
          `le slug « ${slug} » est déjà porté par « ${dejaVu} » — il doit être unique dans le sujet`,
        anomalies,
      );
    }
    if (typeof resultat.ordre === 'number') {
      const ordre = resultat.ordre;
      exigerUniciteDansLaRacine(
        ordresVus,
        ordre,
        rel,
        (dejaVu) =>
          `« ordre: ${ordre} » est déjà porté par « ${dejaVu} » — deux leçons ne peuvent pas occuper la même position`,
        anomalies,
      );
    }
    if (typeof resultat.sujet === 'string') sujets.add(resultat.sujet);
    releverSection(sectionsParSujet, resultat, rel);
  }

  exigerSectionsToutOuRien(sectionsParSujet, anomalies);

  // Le `sujet` n'est PAS déduit du nom de la racine : celle-ci est paramétrable (`--racine`) et
  // vaut, pour les fixtures, un nom de cas de test. Ce qu'on peut exiger sans mentir, c'est que
  // toutes les leçons d'une même racine déclarent le même sujet.
  if (sujets.size > 1) {
    anomalies.push({
      fichier: relative(RACINE_DEPOT, racine).replaceAll('\\', '/'),
      cause: `plusieurs « sujet » déclarés sous la même racine : ${[...sujets].join(', ')}`,
    });
  }

  return { lecons: dossiers.length, anomalies };
}

// ---------------------------------------------------------------------------
// Ligne de commande
// ---------------------------------------------------------------------------

/**
 * @returns {{ racine: string, racineExplicite: boolean, fixtures: string | null, clefs: boolean }}
 */
function lireArguments() {
  const args = process.argv.slice(2);
  let racine = RACINE_PAR_DEFAUT;
  let racineExplicite = false;
  /** @type {string | null} */
  let fixtures = null;
  let clefs = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    // `--clefs` est un DRAPEAU, pas une option à valeur : les chaînes du corpus arrivent par
    // l'entrée standard, jamais par argv (voir l'en-tête du fichier).
    if (arg === '--clefs') {
      clefs = true;
      continue;
    }
    if (arg === '--racine' || arg === '--fixtures') {
      const valeur = args[i + 1];
      if (valeur === undefined || valeur.startsWith('--')) {
        echec(`l'option ${arg} attend un chemin`);
      }
      if (arg === '--racine') {
        racine = valeur;
        racineExplicite = true;
      } else {
        fixtures = valeur;
      }
      i++;
      continue;
    }
    echec(`argument inconnu : « ${String(arg)} »`, [
      'Usage : node tools/content-pipeline/valider.mjs [--racine <chemin>] [--fixtures <dossier>]',
      '        node tools/content-pipeline/valider.mjs --clefs   (tableau JSON sur stdin)',
    ]);
  }
  return { racine, racineExplicite, fixtures, clefs };
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

/**
 * @param {readonly Anomalie[]} anomalies
 */
function imprimerAnomalies(anomalies) {
  for (const a of anomalies) console.error(`   ✖ ${a.fichier}\n      ${a.cause}`);
}

/**
 * Échappe en ASCII PUR toute unité de code hors de l'ASCII imprimable, pour que le tableau JSON
 * écrit sur la sortie standard traverse n'importe quelle page de code. `JSON.stringify` laisse
 * `é` et U+00A0 littéraux ; ce sont précisément les caractères que le corpus met en jeu.
 *
 * @param {readonly string[]} valeurs
 * @returns {string}
 */
function enJsonAscii(valeurs) {
  return JSON.stringify(valeurs).replace(/[^\x20-\x7E]/gu, (c) => {
    const code = c.charCodeAt(0).toString(16).padStart(4, '0');
    return `\\u${code}`;
  });
}

const options = lireArguments();

if (options.clefs) {
  // --- Mode PARITÉ DES DEUX COPIES DE LA CLEF -------------------------------
  // Lecture SYNCHRONE du descripteur 0 : ce fichier n'a pas de fonction principale asynchrone,
  // et le corpus tient en quelques centaines d'octets.
  const brut = readFileSync(0, 'utf8');
  /** @type {unknown} */
  let recu;
  try {
    recu = JSON.parse(brut);
  } catch {
    echec("--clefs : l'entrée standard n'est pas du JSON valide");
  }
  // FAIL-CLOSED, comme partout ailleurs dans ce fichier : une entrée non comprise est une
  // infraction. Un mode de test qui accepterait n'importe quoi rendrait des clefs sur du vide,
  // et la parité serait « vérifiée » sur zéro valeur.
  if (!Array.isArray(recu) || recu.some((v) => typeof v !== 'string')) {
    echec('--clefs : attendu un tableau JSON de chaînes sur l\'entrée standard');
  }
  const valeurs = /** @type {string[]} */ (recu);
  if (valeurs.length === 0) echec('--clefs : corpus vide — une parité sur zéro valeur ne prouve rien');
  process.stdout.write(`${enJsonAscii(valeurs.map(clefIndiscernable))}\n`);
  process.exit(0);
}

if (options.fixtures !== null) {
  // --- Mode CONTRÔLE POSITIF ------------------------------------------------
  const dossierFixtures = resolve(RACINE_DEPOT, options.fixtures);
  if (!estDossier(dossierFixtures)) {
    echec(`dossier de fixtures introuvable : ${options.fixtures}`);
  }
  const cas = readdirSync(dossierFixtures, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort(comparerOctets);
  if (cas.length === 0)
    echec(`aucun cas dans ${options.fixtures} — un contrôle positif vide ne prouve rien`);

  console.log(`\nContrôle positif du garde-fou — ${cas.length} cas attendus INVALIDES\n`);
  let refuses = 0;
  /** @type {string[]} */
  const manques = [];
  for (const nom of cas) {
    const resultat = validerRacine(join(dossierFixtures, nom));
    const premiere = resultat.anomalies[0];
    if (premiere === undefined) {
      manques.push(nom);
      console.log(
        `  ✗ ${nom}\n      CONTRÔLE MANQUÉ : ce cas a été ACCEPTÉ alors qu'il doit être refusé`,
      );
      continue;
    }
    refuses++;
    const reste = resultat.anomalies.length - 1;
    const mentionAutres = reste > 0 ? `  (+${reste} autre(s))` : '';
    console.log(`  ✔ ${nom}\n      refusé : ${premiere.cause}${mentionAutres}`);
  }
  console.log(`\n${refuses}/${cas.length} cas refusés avec une cause nommée.`);
  if (manques.length > 0) {
    echec(`${manques.length} cas de contrôle ont été acceptés à tort`, manques);
  }
  // Code 1 VOULU : du contenu invalide a bien été refusé. C'est la liste ci-dessus qui fait foi.
  console.error('\n✖ valider-contenu : contenu invalide détecté (attendu en mode --fixtures).\n');
  process.exit(1);
}

// --- Mode normal -------------------------------------------------------------
const racineAbsolue = resolve(RACINE_DEPOT, options.racine);
if (!estDossier(racineAbsolue)) {
  if (options.racineExplicite) {
    echec(`racine de contenu introuvable : ${options.racine}`, [
      'Le chemin a été fourni explicitement par --racine : une faute de frappe est plus probable',
      "qu'un contenu absent, donc l'échec est immédiat.",
    ]);
  }
  // Racine PAR DÉFAUT absente : légitime avant E3 (aucune leçon écrite). On le dit à voix haute
  // plutôt que de sortir un vert muet — un gate qui n'a rien mordu doit se voir dans le journal
  // (L-005). Le contrôle positif de `--fixtures` est ce qui prouve que le gate mord.
  console.log(
    `\nvalider-contenu : aucune leçon — ${options.racine} n'existe pas encore (attendu avant E3).\n`,
  );
  process.exit(0);
}

const { lecons, anomalies } = validerRacine(racineAbsolue);

if (anomalies.length > 0) {
  console.error(`\n✖ valider-contenu : ${anomalies.length} anomalie(s) dans ${lecons} leçon(s)\n`);
  imprimerAnomalies(anomalies);
  console.error('');
  process.exit(1);
}

console.log(
  `\nvalider-contenu : ${lecons} leçon(s) valides sous ${options.racine}.` +
    (lecons === 0 ? ' (racine vide — aucune leçon à valider)' : '') +
    '\n',
);
