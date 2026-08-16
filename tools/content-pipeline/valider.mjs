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
 *
 * `--fixtures` est le CONTRÔLE POSITIF du garde-fou (leçon L-019) : chaque sous-dossier y est une
 * racine dont on ATTEND qu'elle soit refusée. Le code de sortie y vaut 1 par construction — c'est
 * la liste des causes imprimées qui fait foi, pas le code. Un cas qui passerait est signalé en
 * toutes lettres comme un contrôle manqué.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, resolve, basename } from 'node:path';
// IMPORT NOMMÉ, PAS L'IMPORT PAR DÉFAUT. `import Ajv from 'ajv'` fonctionne à l'exécution (Node
// donne `module.exports`, qui EST la classe) mais ne compile pas sous `checkJs` + `nodenext` : le
// typage résout alors l'espace de noms du module, non constructable (TS2351). L'export nommé
// `Ajv` satisfait les deux — cousin de L-022 : ce qui tourne ne prouve pas ce qui type.
import { Ajv } from 'ajv';

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
  const sansCommentaire = t.replace(/\s+#.*$/, '').trim();
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

    const item = /^\s+-\s+(.*)$/.exec(ligne) ?? /^-\s+(.*)$/.exec(ligne);
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
    const reste = (paire[2] ?? '').replace(/\s+#.*$/, '').trim();
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
    const marque = /^\s{0,3}(`{3,}|~{3,})\s*(.*)$/.exec(texte);
    if (marque) {
      const suite = marque[1] ?? '';
      const caractere = suite[0] ?? '`';
      if (cloture === null) {
        cloture = { caractere, longueur: suite.length };
        resultat.push({ numero: i + 1, texte, code: true });
        continue;
      }
      const fermante =
        caractere === cloture.caractere &&
        suite.length >= cloture.longueur &&
        (marque[2] ?? '').trim() === '';
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
 * @param {Array<{ numero: number, texte: string, code: boolean }>} lignes
 * @returns {Array<{ niveau: number, texte: string, numero: number }>}
 */
function titresDuCorps(lignes) {
  /** @type {Array<{ niveau: number, texte: string, numero: number }>} */
  const titres = [];
  for (const l of lignes) {
    if (l.code) continue;
    const t = /^(#{1,6})\s+(.+?)\s*$/.exec(l.texte);
    if (!t) continue;
    titres.push({
      niveau: (t[1] ?? '').length,
      texte: normaliserApostrophes((t[2] ?? '').trim()),
      numero: l.numero,
    });
  }
  return titres;
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
 * Vérifie le corps : sections, typographie, marqueurs de doute, conteneurs.
 *
 * @param {string} corps
 * @param {string} statut
 * @param {(cause: string) => void} signaler
 */
function verifierCorps(corps, statut, signaler) {
  const lignes = lignesDuCorps(corps);
  const titres = titresDuCorps(lignes);

  // --- 4. Sections du gabarit ---------------------------------------------
  const h1 = titres.filter((t) => t.niveau === 1);
  if (h1.length !== 1) {
    signaler(
      `le corps doit porter exactement UN titre de niveau 1 (# …) — il en porte ${h1.length}`,
    );
  } else if (titres[0]?.niveau !== 1) {
    signaler('le titre de niveau 1 (# …) doit être le tout premier titre du corps');
  }

  const h2 = titres.filter((t) => t.niveau === 2);
  const textesH2 = h2.map((t) => t.texte);
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
  if (sectionsCompletes) {
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
    const derniere = SECTIONS_REQUISES[SECTIONS_REQUISES.length - 1];
    if (textesH2[textesH2.length - 1] !== derniere) {
      signaler(
        `la dernière section de niveau 2 doit être « ## ${derniere} », pas « ## ${textesH2[textesH2.length - 1] ?? '(aucune)'} »`,
      );
    }
  }

  // --- 5. Espaces fines interdites (hors code, hors code en ligne) ---------
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

  // --- 6. Marqueur de doute vs statut -------------------------------------
  if (statut === 'publiee') {
    for (const l of lignes) {
      if (l.texte.includes(MARQUEUR_DOUTE)) {
        signaler(
          `corps ligne ${l.numero} : marqueur « ${MARQUEUR_DOUTE} » présent alors que ` +
            '`statut: publiee` — une leçon publiée ne porte plus de doute non tranché',
        );
      }
    }
  }

  // --- 7. Conteneurs `:::` en liste fermée ---------------------------------
  for (const l of lignes) {
    if (l.code) continue;
    const marque = /^\s{0,3}:{3,}\s*(.*)$/.exec(l.texte);
    if (!marque) continue;
    const suite = (marque[1] ?? '').trim();
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

    if (q['type'] === 'choix-multiple') {
      const choix = Array.isArray(q['choix']) ? q['choix'] : [];
      const idsChoix = choix
        .map((c) => (estObjet(c) && typeof c['id'] === 'string' ? c['id'] : null))
        .filter((c) => c !== null);
      if (new Set(idsChoix).size !== idsChoix.length) {
        signaler(`question « ${id} » : deux choix portent le même identifiant`);
      }
      if (!idsChoix.includes(String(q['bonneReponse']))) {
        signaler(
          `question « ${id} » : « bonneReponse » vaut « ${String(q['bonneReponse'])} », qui n'est ` +
            `l'identifiant d'aucun choix (${idsChoix.join(', ') || 'aucun'})`,
        );
      }
    }

    if (q['type'] === 'trouver-la-faille') {
      const code = typeof q['code'] === 'string' ? q['code'] : '';
      const nbLignes = code.split('\n').length;
      const fautive = typeof q['ligneFautive'] === 'number' ? q['ligneFautive'] : 0;
      if (fautive > nbLignes) {
        signaler(
          `question « ${id} » : « ligneFautive » vaut ${fautive} alors que « code » ne compte que ${nbLignes} ligne(s)`,
        );
      }
    }
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
 * Valide UNE leçon (un dossier contenant `lecon.md`).
 *
 * @param {string} dossier chemin absolu du dossier de la leçon
 * @returns {{ anomalies: Anomalie[], slug: string | null, ordre: unknown, sujet: unknown }}
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
    return { anomalies, slug: null, ordre: null, sujet: null };
  }

  /** @type {Record<string, unknown>} */
  let frontmatter;
  try {
    frontmatter = analyserFrontmatter(separation[1] ?? '');
  } catch (e) {
    signalerLecon(e instanceof ErreurContenu ? e.message : String(e));
    return { anomalies, slug: null, ordre: null, sujet: null };
  }

  // --- 2. Schéma du frontmatter -------------------------------------------
  if (!validerFrontmatter(frontmatter)) {
    signalerLecon(`frontmatter : ${premiereErreurAjv(validerFrontmatter.errors)}`);
    return { anomalies, slug: null, ordre: null, sujet: null };
  }

  const slug = String(frontmatter['slug']);
  const statut = String(frontmatter['statut']);

  // --- 3. Cohérence dossier ↔ frontmatter ---------------------------------
  if (decoupe) {
    const nn = decoupe[1] ?? '';
    const slugDossier = decoupe[2] ?? '';
    if (slugDossier !== slug) {
      signalerLecon(
        `le slug du frontmatter (« ${slug} ») diffère du suffixe du dossier (« ${slugDossier} »)`,
      );
    }
    if (frontmatter['ordre'] !== Number(nn)) {
      signalerLecon(
        `« ordre » vaut ${String(frontmatter['ordre'])} alors que le dossier annonce ${Number(nn)} (« ${nn}- »)`,
      );
    }
  }

  // --- 4 à 7. Corps --------------------------------------------------------
  const corps = texte.slice(separation[0].length);
  verifierCorps(corps, statut, signalerLecon);

  // Le <h1> doit reprendre le titre du frontmatter : c'est le titre que la page prerendue affiche
  // et celui que le manifeste de routes annonce. Deux titres différents, c'est une page qui ne dit
  // pas la même chose que le lien qui y mène.
  const premierTitre = titresDuCorps(lignesDuCorps(corps)).find((t) => t.niveau === 1);
  const titreAttendu = normaliserApostrophes(String(frontmatter['titre']));
  if (premierTitre && premierTitre.texte !== titreAttendu) {
    signalerLecon(
      `le titre de niveau 1 (« ${premierTitre.texte} ») diffère du « titre » du frontmatter (« ${titreAttendu} »)`,
    );
  }

  // --- 8. quiz.json (obligatoire) -----------------------------------------
  const cheminQuiz = join(dossier, 'quiz.json');
  const relQuiz = relative(RACINE_DEPOT, cheminQuiz).replaceAll('\\', '/');
  /** @param {string} cause */
  const signalerQuiz = (cause) => anomalies.push({ fichier: relQuiz, cause });
  if (!existsSync(cheminQuiz)) {
    signalerQuiz('fichier obligatoire absent — toute leçon porte son quiz');
  } else {
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

  // --- 9. simulation.json (optionnel) --------------------------------------
  const cheminSimulation = join(dossier, 'simulation.json');
  if (existsSync(cheminSimulation)) {
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

  return { anomalies, slug, ordre: frontmatter['ordre'], sujet: frontmatter['sujet'] };
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
  return trouves.sort();
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

  for (const dossier of dossiers) {
    const rel = relative(RACINE_DEPOT, dossier).replaceAll('\\', '/');
    const resultat = validerLecon(dossier);
    anomalies.push(...resultat.anomalies);
    if (resultat.slug !== null) {
      const dejaVu = slugsVus.get(resultat.slug);
      if (dejaVu !== undefined) {
        anomalies.push({
          fichier: rel,
          cause: `le slug « ${resultat.slug} » est déjà porté par « ${dejaVu} » — il doit être unique dans le sujet`,
        });
      } else slugsVus.set(resultat.slug, rel);
    }
    if (typeof resultat.ordre === 'number') {
      const dejaVu = ordresVus.get(resultat.ordre);
      if (dejaVu !== undefined) {
        anomalies.push({
          fichier: rel,
          cause: `« ordre: ${resultat.ordre} » est déjà porté par « ${dejaVu} » — deux leçons ne peuvent pas occuper la même position`,
        });
      } else ordresVus.set(resultat.ordre, rel);
    }
    if (typeof resultat.sujet === 'string') sujets.add(resultat.sujet);
  }

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
 * @returns {{ racine: string, racineExplicite: boolean, fixtures: string | null }}
 */
function lireArguments() {
  const args = process.argv.slice(2);
  let racine = RACINE_PAR_DEFAUT;
  let racineExplicite = false;
  /** @type {string | null} */
  let fixtures = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
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
    ]);
  }
  return { racine, racineExplicite, fixtures };
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

const options = lireArguments();

if (options.fixtures !== null) {
  // --- Mode CONTRÔLE POSITIF ------------------------------------------------
  const dossierFixtures = resolve(RACINE_DEPOT, options.fixtures);
  if (!estDossier(dossierFixtures)) {
    echec(`dossier de fixtures introuvable : ${options.fixtures}`);
  }
  const cas = readdirSync(dossierFixtures, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
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
    console.log(
      `  ✔ ${nom}\n      refusé : ${premiere.cause}${reste > 0 ? `  (+${reste} autre(s))` : ''}`,
    );
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
