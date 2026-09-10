#!/usr/bin/env node
/**
 * COMPILATEUR MARKDOWN → AST — E2-ST1, lot 2
 * =============================================================================
 * Transforme `content/**\/lecon.md` en `LeconCompilee` (voir `types.d.ts`, le contrat que
 * consomment E2-ST2, E2-ST4 et E2-ST6). Le validateur (`valider.mjs`, lot 1) dit si une leçon a le
 * DROIT d'entrer ; ce fichier dit à quoi elle RESSEMBLE une fois entrée. Les deux refusent plutôt
 * que de dégrader : un fichier malformé fait échouer la construction avec un message qui nomme le
 * fichier ET la cause, jamais une page vide en silence.
 *
 * CE QUE LE FICHIER GARANTIT — trois exigences dures, chacune assertée avant d'écrire quoi que ce
 * soit :
 *
 *   1. ZÉRO attribut `style=` dans le HTML produit. La CSP du site est à HACHAGES :
 *      `tools/deploiement/generer-config-swa.mjs` ANALYSE l'artéfact (jsdom, lot A de la dette
 *      sécurité pré-E3-ST1) et refuse tout attribut `style` quelle qu'en soit l'écriture — le
 *      refus est donc plus LARGE que l'ancien motif ` style="` qui figurait ici (les
 *      hachages ne couvrent pas les attributs de style) et hache tout bloc `<style>` dans un
 *      `style-src` GLOBAL AU SITE. Un `<pre>` coloré en styles en ligne casserait donc le build —
 *      ou, pire, élargirait la CSP de tout le site à la palette d'un bloc de code. D'où Shiki +
 *      `transformerStyleToClass` : la couleur sort en CLASSES, et la feuille de classes part dans
 *      le bundle CSS, servi par `style-src 'self'` sans aucun hachage.
 *
 *   2. Les commentaires HTML sont RETIRÉS de la source avant rendu, POUR TOUS LES STATUTS. Avec
 *      `html: false`, markdown-it ÉCHAPPE un `<!-- à-vérifier: … -->` au lieu de l'effacer : les
 *      doutes du professeur s'afficheraient en clair aux apprenants sur toute leçon `brouillon` ou
 *      `verifiee` (le validateur ne les interdit qu'en `publiee`). Conclusion mesurée du spike
 *      S-01. Le retrait est contrôlé APRÈS rendu (contrôle de conservation, patron S-003) : si un
 *      `à-vérifier` ou un `<!--` survit dans la sortie, la compilation échoue.
 *
 *   3. Conteneurs `:::` en LISTE FERMÉE — `comparaison`, `vulnerable`, `corrige`, `attention`,
 *      `note`, `a-retenir`. Un conteneur inconnu n'est pas « ignoré poliment » par
 *      markdown-it-container : il retombe en PARAGRAPHE et les `:::` s'affichent au lecteur. Il est
 *      donc détecté par un balayage explicite de la source, avant tout rendu.
 *
 * CONVENTIONS MARKDOWN (rien de tout ceci n'est deviné à l'exécution) :
 *
 *   · Sections = titres de niveau 2 et 3. Le `# titre` de niveau 1 est le titre de la leçon, il
 *     n'ouvre pas de section ; rien ne peut vivre entre lui et le premier `##`.
 *   · Blocs de code : la langue de la clôture doit appartenir à `Langage` (6 valeurs). Un bloc sans
 *     langue, ou dans une langue hors liste, fait ÉCHOUER la compilation — c'est le seul moyen de
 *     garantir que E2-ST4 sait rendre tout ce que le pipeline produit.
 *   · Encadrés : `::: attention` / `::: note` / `::: a-retenir`, fermés par `:::`. Ils peuvent
 *     contenir un bloc de code — c'est précisément pourquoi `markdown-it-container` a été retenu
 *     plutôt qu'une clôture maison.
 *   · Comparaison vulnérable/corrigé : le conteneur EXTÉRIEUR prend QUATRE deux-points, parce que
 *     markdown-it-container ferme sur le premier marqueur d'au moins la même longueur.
 *
 *         :::: comparaison
 *         ::: vulnerable
 *         ```php
 *         …
 *         ```
 *         {lignes="0"} Ce que le volet montre dans son ensemble.
 *
 *         {lignes="2"} Texte de l'annotation portée par la ligne 2.
 *         :::
 *         ::: corrige
 *         ```php
 *         …
 *         ```
 *         {lignes="1,2"} Une note peut porter sur plusieurs lignes.
 *         :::
 *         ::::
 *
 *     `{langage="php"}` est accepté sur `comparaison` : c'est alors une ASSERTION, vérifiée contre
 *     la langue réelle des clôtures.
 *
 *     ⚠️ LA PORTÉE S'ÉCRIT EN TÊTE DE CHAQUE NOTE, PLUS SUR LE CONTENEUR (E2-ST4, lot B1a). Dans
 *     un volet, APRÈS la clôture de code, **chaque paragraphe est une annotation distincte** et
 *     doit ouvrir par `{lignes="…"}` (`{lignes="0"}` = le bloc entier). L'ancienne écriture
 *     `::: vulnerable {lignes="2"}` échoue désormais en se nommant — `lignes` n'est plus dans la
 *     liste fermée des attributs du conteneur, et cette liste refuse toute clef inconnue.
 *   · Ancres d'exercice : un paragraphe valant exactement `[[quiz]]` ou `[[simulation]]`.
 *
 * DIAGRAMMES MERMAID : le bloc ` ```mermaid ` est reconnu mais son rendu appartient au LOT 3
 * (`rendre-mermaid.mjs`). Tant qu'aucun rendeur n'est injecté (option `rendreMermaid`), un tel bloc
 * fait échouer la compilation en le disant — plutôt que de produire un `svg: ''` que personne ne
 * remarquerait.
 *
 * LE QUIZ (E2-ST3, lot B) : `quiz.json` est lu, REVALIDÉ et émis ici même, dans
 * `LeconCompilee.quiz` — il voyage DANS la leçon parce qu'il s'affiche sur la page de leçon, à
 * l'ancre `[[quiz]]`. Le raisonnement complet est en tête de `compilerQuiz`.
 *
 * DIVERGENCE DE LECTURE DU FRONTMATTER — le legs explicite du lot 1. `valider.mjs` lit le
 * frontmatter avec un sous-ensemble YAML maison qui garde `cree`/`maj` en CHAÎNE ; `gray-matter`
 * (donc js-yaml) rend des objets `Date`. Le schéma exige `type: string` : sans normalisation, il
 * rougirait ici sur un fichier que le validateur vient d'accepter. `normaliserDates()` ramène donc
 * les deux chemins au même `YYYY-MM-DD`, et le frontmatter est REVALIDÉ contre le MÊME schéma —
 * le compilateur ne suppose pas que le validateur a tourné.
 *
 * PIÈGE DE TYPAGE DÉJÀ PAYÉ (cousin de L-022) : `import Ajv from 'ajv'` s'exécute mais ne compile
 * pas sous `checkJs` + `nodenext` (TS2351). C'est l'export NOMMÉ `{ Ajv }` qui satisfait les deux.
 *
 * Usage :
 *   node tools/content-pipeline/compiler-markdown.mjs [--racine <dossier>] [--json]
 *                                                     [--css <fichier>] [--sans-css]
 */
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Ajv } from 'ajv';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import conteneurPlugin from 'markdown-it-container';
import { createHighlighter } from 'shiki';
import { transformerStyleToClass } from '@shikijs/transformers';
import { compterLignes } from './compter-lignes.mjs';
import { recenserLesSujetsFreres } from './sujets-freres.mjs';

/** @typedef {ReturnType<InstanceType<typeof MarkdownIt>['parse']>[number]} JetonMd */

const RACINE_DEPOT = process.cwd();

/** Chemin CANONIQUE du cours (backlog §E2-ST1, §E3), en séparateurs POSIX. */
const RACINE_PAR_DEFAUT = 'content/cours/securite-web';

/**
 * Feuille de coloration GÉNÉRÉE : elle est gitignorée et réécrite à chaque compilation.
 * `src/styles.scss` la `@use` une seule fois — c'est ce qui la fait entrer dans le bundle CSS,
 * donc sous `style-src 'self'`, donc hors de tout hachage.
 */
const FEUILLE_COLORATION_PAR_DEFAUT = 'src/styles/_coloration-syntaxique-generee.scss';

/**
 * Les HUIT langues du contrat (`type Langage` de `types.d.ts`) — liste FERMÉE.
 *
 * ⚠️ `javascript` et `html` sont entrés le 2026-08-24, et la raison est pédagogique : un cours de
 * sécurité WEB montre des charges HTML, des puits DOM et des en-têtes HTTP. Tant que la liste
 * s'arrêtait à six, l'auteur étiquetait son bloc avec une langue qu'il ne contient pas — et
 * `rendu-blocs` recopie cette étiquette À LA FOIS dans le `<figcaption>` VISIBLE et dans
 * l'`aria-label` du défileur. Le lecteur voyait, et le lecteur d'écran entendait, une langue
 * fausse : ce n'était pas une gêne d'auteur, c'était une information erronée servie à
 * l'apprenant. Quatre leçons de suite avaient dû contourner.
 *
 * 🔴 CE QUE COÛTE UNE LANGUE DE PLUS, à savoir avant d'en ajouter une neuvième : une grammaire
 * Shiki neuve fait apparaître des PORTÉES neuves, donc des ENCRES neuves, donc des paires de
 * contraste neuves à mesurer contre `--couleur-code-surface` (voir `ENCRES_SOMBRES_CORRIGEES`).
 * `html` est le cas lourd et ce n'est pas intuitif : sa grammaire IMBRIQUE celles de JavaScript
 * et de CSS pour le contenu de `<script>` et `<style>`. On MESURE, on ne suppose pas —
 * `src/coloration-encres-contraste.spec.ts` est le garde-fou exécutable de cette mesure.
 *
 * Deux formes du même ensemble, et c'est délibéré : la LISTE est typée `Langage[]` (elle alimente
 * Shiki, qui exige des noms de grammaires connus), l'ENSEMBLE est typé sur `string` (il teste une
 * langue lue dans un fichier, donc encore inconnue). Un `Set<Langage>.has(string)` ne compile pas.
 */
/** @type {readonly Langage[]} */
const LANGAGES = ['php', 'csharp', 'typescript', 'javascript', 'html', 'sql', 'bash', 'json'];
/** @type {ReadonlySet<string>} */
const NOMS_LANGAGES = new Set(LANGAGES);

/**
 * Les SEPT encadrés, et la variante qu'ils portent au contrat (`type VarianteEncadre`).
 *
 * Trois encadrés de TON (E2-ST1), trois encadrés de PROVENANCE (E3-ST1), puis l'EXERCICE DU COURS
 * (E3-ST21) — voir la note de `types.d.ts`. L'ORDRE est celui du contrat, et il est comparé au
 * littéral écrit en dur dans `src/pipeline-contenu-validation.spec.ts` : ce n'est pas un détail de
 * style, c'est ce qui fait de la liste dupliquée de `valider.mjs` une redondance VÉRIFIÉE plutôt
 * qu'un commentaire (L-008).
 */
/** @type {readonly VarianteEncadre[]} */
const VARIANTES_ENCADRE = [
  'attention',
  'note',
  'a-retenir',
  'cours',
  'complement',
  'correction-du-cours',
  'exercice-du-cours',
];
/** @type {ReadonlySet<string>} */
const ENCADRES = new Set(VARIANTES_ENCADRE);

/**
 * La SEULE variante qui admet — et EXIGE — un attribut, et le nom de cet attribut.
 *
 * Écrits en constantes parce que trois endroits les citent (la liste de clefs admise passée à
 * `lireAttributs`, le contrôle de non-vacuité, et le message d'échec) : un nom recopié trois fois
 * est un nom qui divergera une fois.
 */
const VARIANTE_SOURCEE = 'correction-du-cours';
const ATTRIBUT_SOURCE = 'source';

/** Les deux attributs de RENVOI AU COURS (E3-ST20, `docs/contenu/ancrage-au-cours.md` §3). */
const ATTRIBUT_DIAPOS = 'diapos';
const ATTRIBUT_SEANCE = 'seance';

/**
 * Le TROISIÈME attribut de renvoi, qui n'existe que sur un TITRE de section (§3bis, décision D-B) :
 * citer une diapositive d'un AUTRE cours que celui du module.
 *
 * 🔴 SA VALEUR EST UN NOM DE DOSSIER DE SUJET FRÈRE, JAMAIS UN CODE DE COURS (lot 1b,
 * 2026-09-08). La compilation reste mono-sujet — une racine par exécution — mais l'ancrage gagne
 * un REGISTRE : les dossiers frères de la racine qui portent un `horaire.json`
 * (`construireRegistreDesSujetsFreres`). C'est le compilateur qui RÉSOUT `cours="php"` en
 * `420-4P2-HU`, le `cours.code` de l'horaire cité, et c'est ce code — jamais le nom de dossier
 * écrit par l'auteur — qui entre au contrat compilé, donc au rendu.
 */
const ATTRIBUT_COURS = 'cours';

/**
 * LA MATRICE D'ATTRIBUTS D'UN TITRE DE SECTION — fermée à trois clefs, et à celles-là seules.
 *
 * Elle est l'exacte jumelle de `CLEFS_RENVOI_DE_TITRE` dans `valider.mjs` ; la duplication est
 * ASSUMÉE (le validateur ne dépend pas du compilateur), et l'appariement des deux copies est tenu
 * par `src/pipeline-contenu-validation.spec.ts`, jamais par le commentaire que vous lisez (L-008).
 *
 * @type {readonly string[]}
 */
const CLEFS_RENVOI_DE_TITRE = [ATTRIBUT_DIAPOS, ATTRIBUT_SEANCE, ATTRIBUT_COURS];

/**
 * LE MARQUEUR SANS VALEUR D'UN TITRE DE SECTION : « aucune diapositive des cours ne porte cette
 * section » (lot 1c, décision du propriétaire du 2026-09-08).
 *
 * 🔴 POURQUOI. La cartographie mesurée du module 11 (`docs/contenu/renvois-diapos-module-11.md`)
 * établit que **10 de ses 18 titres `##`/`###` ne sont portés par AUCUNE diapositive des deux
 * cours** (`VirtualHost`, `.gitignore`, `composer`, `public/`, `WSL` : zéro occurrence dans les 16
 * extraits) — ce sont précisément les sections qui existent parce que le cours ne les couvre pas.
 * Sans marqueur, « pas encore cartographié » et « rien à citer » s'écrivent tous deux par le
 * SILENCE, et le gate du lot 9 ne pourrait jamais devenir total.
 *
 * Sa mécanique est celle de `MARQUEUR_DEFAUT` (voir son commentaire, plus bas) : un marqueur sans
 * valeur admis par LISTE BLANCHE de l'appelant. `hors-cours` n'est admis que sur un titre de
 * section, jamais sur un encadré ni sur un volet ; `{hors-cours="oui"}` est refusé en nommant la
 * grammaire des marqueurs, jamais avalé.
 */
const MARQUEUR_HORS_COURS = 'hors-cours';

/**
 * La liste blanche des marqueurs d'un titre — jumelle de `MARQUEURS_DE_TITRE` dans `valider.mjs`,
 * même duplication assumée que `CLEFS_RENVOI_DE_TITRE`, même appariement tenu par
 * `src/pipeline-contenu-validation.spec.ts` plutôt que par ce commentaire (L-008).
 *
 * @type {readonly string[]}
 */
const MARQUEURS_DE_TITRE = [MARQUEUR_HORS_COURS];

/**
 * La FORME d'un nom de dossier de sujet — jumelle de `definitions.kebab` dans
 * `schemas/horaire.schema.json` et de la copie de `valider.mjs`.
 *
 * ⚠️ CE N'EST PAS LE GARDE-FOU DE SÉCURITÉ : ce qui protège est le REGISTRE
 * (`construireRegistreDesSujetsFreres`), où la valeur d'auteur n'est qu'une clef de `Map`. Ce
 * motif ne sert qu'à donner à `cours="../x"` sa faute PROPRE, distincte de « sujet inconnu ».
 */
const MOTIF_NOM_DE_SUJET = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LONGUEUR_MAX_NOM_DE_SUJET = 40;

/** La variante qui EXIGE un `ref`, et le nom de cet attribut (E3-ST21, §6.2). */
const VARIANTE_EXERCICE = 'exercice-du-cours';
const ATTRIBUT_REF = 'ref';

/** Les deux fichiers de SUJET, à la racine, à côté des dossiers de modules. */
const FICHIER_HORAIRE = 'horaire.json';
const FICHIER_EXERCICES = 'exercices.json';

/**
 * La forme NUMÉRIQUE d'une `reference` d'exercice — la seule chose dont le LIBELLÉ dépend (§6.1) :
 * « n° 8 » pour une référence numérique, le `titre` de l'entrée pour une référence nommée.
 * Dupliquée depuis `schemas/exercices.schema.json`, comme dans `valider.mjs` et pour la même
 * raison : ce n'est pas une revalidation du registre, c'est une question que le schéma ne pose pas.
 */
const REFERENCE_NUMERIQUE = /^[1-9]\d*$/;

/**
 * LA MATRICE D'ATTRIBUTS DES SEPT ENCADRÉS — la MÊME que celle de `valider.mjs`, et la duplication
 * reste assumée pour la raison déjà écrite en tête de `CONTENEURS_AUTORISES` : le compilateur ne
 * suppose pas que le validateur a tourné. Le lien entre les deux copies n'est PAS un commentaire
 * (L-008) : `src/pipeline-contenu-validation.spec.ts` les apparie, et le mode `--fixtures` du
 * validateur exerce chaque ligne de la table.
 *
 * @type {ReadonlyMap<VarianteEncadre, readonly string[]>}
 */
const ATTRIBUTS_ADMIS_PAR_VARIANTE = new Map([
  ['attention', []],
  ['note', []],
  ['a-retenir', []],
  ['cours', [ATTRIBUT_DIAPOS, ATTRIBUT_SEANCE]],
  ['complement', []],
  [VARIANTE_SOURCEE, [ATTRIBUT_SOURCE, ATTRIBUT_DIAPOS, ATTRIBUT_SEANCE]],
  // `source` est REFUSÉ ici, et c'est le contrat (§6.2) : la source d'un exercice du cours, c'est
  // le cours. `lireAttributs` le refuse NOMMÉMENT, comme tout attribut hors matrice.
  [VARIANTE_EXERCICE, [ATTRIBUT_REF, ATTRIBUT_DIAPOS, ATTRIBUT_SEANCE]],
]);

/** Bornes de la grammaire de `diapos` — voir `valider.mjs`, même valeurs, même justification. */
const DIAPO_MAX = 999;
const AMPLITUDE_MAX_PLAGE = 100;

/**
 * Conteneurs `:::` autorisés — liste FERMÉE, la MÊME que celle de `valider.mjs`. Deux listes
 * séparées est une redondance assumée : le compilateur ne suppose pas que le validateur a tourné,
 * et un import ferait des deux une seule vérité, donc une seule occasion de se tromper.
 *
 * Les deux copies sont APPARIÉES PAR UN TEST depuis le lot 5 —
 * `src/pipeline-contenu-validation.spec.ts`, bloc « les deux copies de la liste fermée de
 * conteneurs », contre des noms écrits À LA MAIN (L-012). Le commentaire n'est donc plus le seul
 * lien entre elles (L-008).
 */
/** @type {ReadonlySet<string>} */
const CONTENEURS_AUTORISES = new Set([
  'comparaison',
  'vulnerable',
  'corrige',
  'marche-a-suivre',
  'methodes',
  'methode',
  ...VARIANTES_ENCADRE,
]);

/** Le conteneur du résumé actionnable (décision D-A, 2026-08-31). */
const CONTENEUR_MARCHE = 'marche-a-suivre';
/** Son unique attribut, OBLIGATOIRE et non vide. */
const ATTRIBUT_TITRE = 'titre';
/** L'attribut de renvoi d'une étape, écrit LITTÉRALEMENT en tête de l'item. */
const ATTRIBUT_VOIR = 'voir';
/** Ce qui, dans un `{voir="…"}`, désigne un autre module plutôt qu'un titre de la même leçon. */
const PREFIXE_MODULE = 'module:';

/** Le conteneur des ONGLETS de méthode (décision D-C, 2026-08-31), et son volet. */
const CONTENEUR_METHODES = 'methodes';
const CONTENEUR_VOLET = 'methode';
/** Le texte de l'onglet — obligatoire, non vide, UNIQUE dans le conteneur. */
const ATTRIBUT_LIBELLE = 'libelle';
/**
 * Le MARQUEUR SANS VALEUR qui désigne le volet visible. Exactement un volet le porte.
 *
 * 🔴 C'est le premier marqueur du dépôt : la grammaire d'attributs n'acceptait jusqu'ici que des
 * paires `clef="valeur"` et refusait tout résidu. La liste blanche des marqueurs est passée PAR
 * L'APPELANT, comme `clefsAutorisees` — `defaut` n'est admis que sur `::: methode`, jamais sur un
 * titre de section ni sur un encadré (`.claude/rules/security.md` §4 : ce qui n'est pas nommé est
 * refusé en se nommant).
 */
const MARQUEUR_DEFAUT = 'defaut';
/** Bornes du nombre de volets : un seul n'est pas une comparaison, quatre est un sommaire déguisé. */
const VOLETS_MIN = 2;
const VOLETS_MAX = 3;
/**
 * Le renvoi d'une étape, EN TÊTE et nulle part ailleurs — même position imposée que `{lignes="…"}`
 * sur une annotation. Ancré sur `^`, donc aucun retour arrière possible : ce qui n'est pas en tête
 * n'est pas reconnu, et l'appelant le refuse en le nommant plutôt que de le laisser passer.
 */
const MOTIF_VOIR_EN_TETE = new RegExp(String.raw`^\{${ATTRIBUT_VOIR}="([^"]*)"\}`);
/** Ce qu'on cherche pour dire « il y a un renvoi ICI, mais pas au bon endroit ». */
const AMORCE_VOIR = `{${ATTRIBUT_VOIR}=`;

/**
 * Une étape compilée — DÉRIVÉE du contrat, jamais réécrite. Recopier sa forme ici ferait deux
 * vérités qui divergeraient au premier ajustement (L-016).
 *
 * @typedef {Extract<BlocContenu, { type: 'marche-a-suivre' }>['etapes'][number]} EtapeMarche
 */

/** Thèmes Shiki — un clair, un sombre, choisis en paire pour la bascule de thème du site. */
const THEME_CLAIR = 'github-light';
const THEME_SOMBRE = 'github-dark';

/** Préfixe des classes de coloration. Court, sans collision possible avec le design system. */
const PREFIXE_CLASSE = 'clr-';

/**
 * Préfixe de l'ANCRE DE LIGNE posée par le transformateur `line` (E2-ST4, lot A2) : la ligne 3
 * d'un extrait sort en `class="line ancre-ligne-3"`. C'est le crochet auquel le lot B accrochera les
 * annotations ancrées — et la raison pour laquelle c'est une CLASSE, et non `data-ligne` ni `id`,
 * est MESURÉE : voir `transformateurLigne` plus bas et `src/sonde-sanitizer-shiki.spec.ts`.
 */
const PREFIXE_LIGNE = 'ancre-ligne-';

/** Marqueur de doute du `professeur-web` — compté avant retrait, exigé absent après rendu. */
const MARQUEUR_DOUTE = 'à-vérifier';

/**
 * LISTE BLANCHE des jetons markdown-it admis dans un `::: vulnerable` / `::: corrige` (E2-ST4,
 * lot B). Un volet porte exactement une clôture de code et N paragraphes d'annotation ; tout
 * autre jeton (`bullet_list_open`, `blockquote_open`, `heading_open`, `table_open`…) y perdrait
 * son balisage sans un mot, l'auteur croyant publier une liste et publiant de la prose.
 * Nominative, et fermée : voir `lireExemple`.
 */
const JETONS_DE_VOLET = new Set(['paragraph_open', 'inline', 'paragraph_close', 'fence']);

// ---------------------------------------------------------------------------
// Échec — un seul point de sortie, un message qui nomme le fichier
// ---------------------------------------------------------------------------

/**
 * @param {string} message
 * @param {readonly string[]} [details]
 * @returns {never}
 */
function echec(message, details = []) {
  console.error(`\n✖ compiler-markdown : ${message}`);
  for (const d of details) console.error(`   · ${d}`);
  console.error('');
  process.exit(1);
}

/**
 * @param {string} chemin chemin absolu
 * @returns {string} le même chemin, relatif au dépôt et en séparateurs POSIX
 */
function afficher(chemin) {
  return relative(RACINE_DEPOT, chemin).replaceAll('\\', '/');
}

// ---------------------------------------------------------------------------
// Frontmatter : gray-matter, dates normalisées, schéma REVALIDÉ
// ---------------------------------------------------------------------------

const ajv = new Ajv({ allErrors: true, strict: true });

/**
 * @param {string} nom nom du fichier de schéma, dans `schemas/`
 * @returns {import('ajv').ValidateFunction}
 */
function compilerSchema(nom) {
  return ajv.compile(
    /** @type {object} */ (
      JSON.parse(readFileSync(join(RACINE_DEPOT, 'tools/content-pipeline/schemas', nom), 'utf8'))
    ),
  );
}

const validerFrontmatter = compilerSchema('lecon.frontmatter.schema.json');
const validerQuiz = compilerSchema('quiz.schema.json');
const validerSimulation = compilerSchema('simulation.schema.json');

/**
 * Ramène `cree`/`maj` au `YYYY-MM-DD` du schéma.
 *
 * js-yaml applique le type `!!timestamp` du cœur YAML : `cree: 2026-08-15` devient un objet `Date`
 * (minuit UTC), et le schéma `{ type: 'string' }` le refuserait. `toISOString().slice(0, 10)` rend
 * exactement la date écrite — la conversion est en UTC des deux côtés, aucun décalage possible.
 *
 * @param {Record<string, unknown>} donnees muté sur place
 */
function normaliserDates(donnees) {
  for (const cle of ['cree', 'maj']) {
    const valeur = donnees[cle];
    if (valeur instanceof Date) donnees[cle] = valeur.toISOString().slice(0, 10);
  }
}

/**
 * Rend la PREMIÈRE erreur Ajv utile, en nommant l'emplacement fautif.
 *
 * Les erreurs de mot-clé `if` sont écartées, exactement comme dans `valider.mjs` : sur le schéma
 * du quiz — le seul des trois à être piloté par `if/then` — elles disent « ne correspond pas au
 * schéma then », ce qui répète la faute sans jamais nommer le champ. Les garder ferait dépendre
 * la lisibilité du message de l'ordre dans lequel Ajv range ses erreurs.
 *
 * ⚠️ LE TEXTE D'AJV RESTE EN ANGLAIS ICI — dette assumée, PAS un oubli. La table de traduction
 * (`decrireErreurAjv`) vit dans `valider.mjs`, qui est le fichier que l'auteur d'une leçon voit
 * en premier ; la recopier ferait deux vérités à maintenir (L-016), et la partager suppose un
 * module commun que ce lot n'ouvre pas. Ce qui compte est tenu : l'emplacement ET le champ
 * fautifs sont nommés.
 *
 * @param {readonly import('ajv').ErrorObject[] | null | undefined} erreurs
 * @returns {string}
 */
function premiereErreurAjv(erreurs) {
  const toutes = erreurs ?? [];
  const utiles = toutes.filter((erreur) => erreur.keyword !== 'if');
  const e = utiles[0] ?? toutes[0];
  if (e === undefined) return 'erreur de schéma non décrite';
  const ou = e.instancePath === '' ? 'racine' : e.instancePath.replace(/^\//, '');
  return `« ${ou} » ${e.message ?? 'invalide'}`;
}

// ---------------------------------------------------------------------------
// Nettoyage de la source : commentaires HTML, conteneurs hors liste
// ---------------------------------------------------------------------------

/** Une clôture de bloc de code : trois backticks ou trois tildes, éventuellement indentés. */
const MOTIF_CLOTURE = /^\s{0,3}(`{3,}|~{3,})/;

/**
 * Découpe le corps en tranches en distinguant ce qui est DANS un bloc de code de ce qui ne l'est
 * pas. Les deux règles ci-dessous (retrait des commentaires, liste fermée de conteneurs) ne
 * s'appliquent qu'HORS code : dans un bloc de code, un `<!-- … -->` ou un `::: astuce` sont des
 * DONNÉES que l'auteur veut montrer, exactement comme dans `valider.mjs`.
 *
 * @param {string} corps
 * @returns {Array<{ texte: string, code: boolean }>}
 */
function trancherHorsCode(corps) {
  /** @type {Array<{ texte: string, code: boolean }>} */
  const tranches = [];
  /** @type {string[]} */
  let courante = [];
  let dansCode = false;
  /** @type {string | null} */
  let clotureOuvrante = null;

  const pousser = (/** @type {boolean} */ code) => {
    if (courante.length > 0) tranches.push({ texte: courante.join('\n'), code });
    courante = [];
  };

  for (const ligne of corps.split('\n')) {
    const cloture = MOTIF_CLOTURE.exec(ligne)?.[1];
    if (!dansCode && cloture !== undefined) {
      pousser(false);
      dansCode = true;
      clotureOuvrante = cloture;
      courante.push(ligne);
      continue;
    }
    // Une clôture ne se ferme que par le MÊME caractère, répété AU MOINS autant de fois : c'est la
    // règle CommonMark, et elle est ce qui permet d'imbriquer un exemple de Markdown dans un bloc.
    const ouvrante = clotureOuvrante;
    if (
      dansCode &&
      cloture !== undefined &&
      ouvrante !== null &&
      // `charAt` et non `ouvrante[0]` : sous `noUncheckedIndexedAccess`, l'indexation rend
      // `string | undefined`, que `startsWith` refuse — `charAt` rend toujours une chaîne.
      cloture.startsWith(ouvrante.charAt(0)) &&
      cloture.length >= ouvrante.length
    ) {
      courante.push(ligne);
      pousser(true);
      dansCode = false;
      clotureOuvrante = null;
      continue;
    }
    courante.push(ligne);
  }
  pousser(dansCode);
  return tranches;
}

/**
 * Retire TOUS les commentaires HTML hors blocs de code — pas seulement les `à-vérifier:`.
 *
 * Pourquoi tous : `html: false` les ÉCHAPPE au lieu de les effacer, donc n'importe quel commentaire
 * laissé par un auteur s'afficherait tel quel à l'apprenant. Retirer la catégorie entière évite
 * d'avoir à deviner lesquels étaient « pour l'équipe ». Le compte des `à-vérifier` est rendu à
 * l'appelant : c'est le contrôle POSITIF du garde-fou (L-019) — un retrait qui ne retire jamais
 * rien passerait sinon pour un succès.
 *
 * @param {string} corps
 * @returns {{ corps: string, commentaires: number, doutes: number }}
 */
function retirerCommentairesHtml(corps) {
  let commentaires = 0;
  let doutes = 0;
  const tranches = trancherHorsCode(corps).map((tranche) => {
    if (tranche.code) return tranche.texte;
    return tranche.texte.replace(/<!--[\s\S]*?-->/g, (trouve) => {
      commentaires += 1;
      if (trouve.includes(MARQUEUR_DOUTE)) doutes += 1;
      return '';
    });
  });
  return { corps: tranches.join('\n'), commentaires, doutes };
}

/**
 * Refuse tout conteneur `:::` hors de la liste fermée, AVANT le rendu.
 *
 * markdown-it-container n'enregistre que les noms de `CONTENEURS_AUTORISES` ; un `::: astuce` n'est donc pas
 * « mal rendu », il retombe en paragraphe et les deux-points s'affichent au lecteur. Le défaut est
 * silencieux à la compilation et visible en production — l'inverse de ce qu'on veut.
 *
 * @param {string} corps corps déjà débarrassé de ses commentaires
 * @param {string} nomFichier pour le message
 */
function verifierConteneurs(corps, nomFichier) {
  let numero = 0;
  for (const tranche of trancherHorsCode(corps)) {
    for (const ligne of tranche.texte.split('\n')) {
      numero += 1;
      if (tranche.code) continue;
      // `(?!:)` INTERDIT le retour arrière : sans lui, `:{3,}` rendrait trois deux-points sur une
      // ligne de FERMETURE « :::: » et le quatrième passerait pour un nom de conteneur. Le
      // garde-fou refusait alors un fichier parfaitement correct, en nommant « ::: : ».
      // Le MARQUEUR est capturé, pas supposé : un message qui écrit « ::: » là où l'auteur a tapé
      // « :::: » l'envoie chercher la faute au mauvais endroit — et la marche à suivre s'ouvre
      // précisément à quatre deux-points.
      const ouverture = /^[ \t]{0,3}(:{3,})(?!:)[ \t]*(\S+)/.exec(ligne);
      const nom = ouverture?.[2];
      if (nom === undefined) continue;
      if (!CONTENEURS_AUTORISES.has(nom)) {
        echec(`${nomFichier} : conteneur inconnu`, [
          `ligne ${numero} DU CORPS (frontmatter exclu) : « ${ouverture?.[1] ?? ':::'} ${nom} » n'appartient pas à la liste fermée`,
          `attendus : ${[...CONTENEURS_AUTORISES].join(', ')}`,
        ]);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Ancres de section : kebab-case, uniques dans la leçon
// ---------------------------------------------------------------------------

/**
 * Ligatures que `NFD` ne décompose PAS. Sans elles, « cœur » donnerait l'ancre « c-ur » : le
 * caractère tomberait dans le filet `[^a-z0-9]`, silencieusement. Les accents, eux, se
 * décomposent bien et n'ont besoin d'aucune table.
 */
/** @type {ReadonlyMap<string, string>} */
const REMPLACEMENTS_ANCRE = new Map([
  ['œ', 'oe'],
  ['Œ', 'oe'],
  ['æ', 'ae'],
  ['Æ', 'ae'],
]);

/**
 * Fabrique une ancre kebab-case UNIQUE dans la leçon.
 *
 * L'unicité n'est pas cosmétique : E2-ST2 en fait des `id` de `<h2>`/`<h3>` et des cibles de
 * sommaire. Deux `id` identiques, et le lien du sommaire mène toujours au premier — un lien mort
 * en pratique, invisible à tout gate qui ne compare pas les ancres entre elles.
 *
 * @param {string} titre
 * @param {Set<string>} dejaVues muté
 * @returns {string}
 */
function ancrer(titre, dejaVues) {
  let base = '';
  for (const caractere of titre) base += REMPLACEMENTS_ANCRE.get(caractere) ?? caractere;
  base = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    // UN seul tiret, pas `-+` : la ligne précédente vient de réduire TOUT groupe de caractères
    // non alphanumériques à un tiret unique, donc `--` ne peut plus exister ici. Le quantificateur
    // n'ajoutait rien qu'un retour arrière super-linéaire (S8786).
    .replace(/^-|-$/g, '');
  if (base === '') base = 'section';

  let ancre = base;
  let suffixe = 2;
  while (dejaVues.has(ancre)) {
    ancre = `${base}-${suffixe}`;
    suffixe += 1;
  }
  dejaVues.add(ancre);
  return ancre;
}

// ---------------------------------------------------------------------------
// Coloration syntaxique — Shiki en CLASSES, jamais en styles en ligne
// ---------------------------------------------------------------------------

/**
 * @typedef {object} Colorateur
 * @property {(code: string, langage: Langage, nomFichier: string) => string} colorer
 * @property {() => string} feuille CSS des classes émises, prêt à écrire
 */

/**
 * Le transformateur `line` — pose sur CHAQUE ligne colorée l'ancre `ancre-ligne-N` (E2-ST4, lot A2).
 *
 * 🔴 POURQUOI UNE CLASSE, ET NON `data-ligne` NI `id` — C'EST MESURÉ, PAS PRÉFÉRÉ.
 * `rendu-blocs.ts` pose `htmlColore` par `[innerHTML]`, SANS `bypassSecurityTrustHtml` : le
 * sanitizer d'Angular passe donc dessus et retire EN SILENCE ce qui n'est pas dans sa liste
 * blanche. `src/sonde-sanitizer-shiki.spec.ts` a monté cette sortie même dans un composant réel
 * (Angular 22.1) et compté, sur trois lignes :
 *
 *     class 15 → 15 · tabindex 3 → 3 · aria-describedby 3 → 3 · aria-label 3 → 3
 *     id 3 → 0 · data-ligne 3 → 0
 *
 * `data-ligne="3"` — le premier réflexe, et le plus lisible en CSS — aurait donné un artéfact
 * parfaitement correct, une page prerendue SANS le moindre crochet, et aucun gate rouge : le HTML
 * compilé porte l'attribut, seul le DOM ne l'a plus. La classe est le seul véhicule qui traverse.
 * ⚠️ Corollaire pour le lot B : la CIBLE d'un `aria-describedby` ne peut pas vivre ici (son `id`
 * serait effacé) — elle s'écrit dans le GABARIT de `rendu-blocs.ts`, qui ne traverse aucun
 * sanitizer.
 *
 * @type {import('shiki').ShikiTransformer}
 */
const transformateurLigne = {
  name: 'drjst-ancre-de-ligne',
  line(noeud, numero) {
    // `numero` est fourni par Shiki, en base 1 — la MÊME base que `{lignes="…"}` côté auteur.
    this.addClassToHast(noeud, `${PREFIXE_LIGNE}${String(numero)}`);
  },
};

/**
 * Le transformateur `pre` — RETIRE le `tabindex="0"` que Shiki pose lui-même sur son `<pre>`
 * (E2-ST4, lot B, constat de revue du 2026-08-18).
 *
 * 🔴 POURQUOI ON LE RETIRE, ET POURQUOI SEULEMENT MAINTENANT. Ce `tabindex` était JUSTE tant que
 * `overflow-x: auto` vivait sur `.shiki` : une région qui défile doit s'atteindre au clavier
 * (WCAG 2.1.1), et le `<pre>` ÉTAIT cette région. Le lot B2 a remonté le défilement dans le
 * gabarit de `rendu-blocs.ts` (`div.defileur`, `tabindex="0"`, `role="group"`, `aria-label`) et
 * retiré `overflow-x` de `.shiki` — le `<pre>` n'a donc plus rien à faire défiler, et son
 * `tabindex` est devenu un arrêt de tabulation MORT : atteignable, sans nom, sans rôle, sans
 * effet. Mesuré dans l'artéfact prerendu de la leçon-témoin : 8 blocs de code, **16** arrêts
 * (8 `.defileur` + 8 `pre[tabindex="0"]`), dont la moitié inutile — le clavier traversait chaque
 * bloc DEUX fois.
 *
 * ⚠️ AUCUN GATE NE POUVAIT LE VOIR, et c'est la raison pour laquelle il faut le tenir ici :
 * `focus-order-semantics` est désactivée par défaut chez axe, et `scrollable-region-focusable`
 * est désactivée dans `tools/a11y/verifier-axe.mjs` (jsdom ne calcule pas le débordement). Le
 * filet est donc l'assertion « aucun `pre[tabindex]` » de
 * `src/app/features/cours/lecon/rendu-blocs/rendu-blocs.spec.ts` (côté rendu) et celle de
 * `src/pipeline-contenu-compilation.spec.ts` (côté compilateur, sur la sortie réelle).
 *
 * ⚠️ SI LE DÉFILEMENT REVENAIT UN JOUR SUR `.shiki`, CE TRANSFORMATEUR DEVIENDRAIT UNE FAUTE
 * WCAG 2.1.1 — les deux vont ensemble, et c'est pourquoi
 * `src/pipeline-contenu-compilation.spec.ts` interdit tout `overflow` dans la feuille générée.
 *
 * @type {import('shiki').ShikiTransformer}
 */
const transformateurPre = {
  name: 'drjst-pre-sans-tabindex',
  pre(noeud) {
    // `delete` et non `= undefined` : `hast-util-to-html` sérialise une propriété présente à
    // `undefined` comme absente aujourd'hui, mais c'est un détail d'implémentation. L'absence de
    // la clef, elle, est une garantie du modèle.
    delete noeud.properties['tabindex'];
  },
};

// ⚠️ `compterLignes` A DÉMÉNAGÉ (E2-ST4, lot B) — il vit dans `./compter-lignes.mjs`, importé en
// tête de ce fichier. Il avait ici DEUX appelants (`lirePortee` et `verifierAncres`) ; il en a
// désormais TROIS, le dernier étant `verifierQuestionTrouverLaFaille` de `valider.mjs`, qui
// comptait autrement et acceptait de ce fait une `ligneFautive` d'une ligne de trop. La dette est
// donc PAYÉE, et le module partagé est ce qui l'empêche de se reformer : la formule, et la raison
// de chacun de ses deux détails, ne s'écrivent plus qu'à un seul endroit.

const requerir = createRequire(import.meta.url);

/**
 * La surface DOM que ce script s'autorise, déclarée explicitement — même patron que
 * `rendre-mermaid.mjs` et `tools/a11y/verifier-axe.mjs`. jsdom ne publie pas de types, et
 * `tsconfig.tools.json` n'a volontairement pas `lib: DOM` : un script Node n'a pas à pouvoir
 * toucher un `document` global.
 *
 * @typedef {{ className: string, tagName: string, outerHTML: string, hasAttribute(nom: string): boolean }} ElementHtml
 * @typedef {{ querySelectorAll(selecteur: string): Iterable<ElementHtml> }} DocumentHtml
 * @type {new (source: string, options?: Record<string, unknown>) => { window: { document: DocumentHtml } }}
 */
const JSDOM = requerir('jsdom').JSDOM;

/**
 * Analyse un fragment HTML, ou fait échouer la construction en nommant le fichier.
 *
 * Partagé par les DEUX contrôles de conservation (`verifierZeroStyle`, `verifierAncres`) : un
 * fragment illisible doit les faire échouer tous les deux de la même façon. Un garde-fou qui ne
 * prouve pas avoir tout vu ne garde rien (S-003).
 *
 * @param {string} html fragment à analyser
 * @param {string} nomFichier fichier de contenu, pour nommer la faute
 * @returns {DocumentHtml}
 */
function analyserFragment(html, nomFichier) {
  try {
    // `NOSONAR` : S7718 réclame `error_`, contre la règle « français seulement ».
    return new JSDOM(`<!doctype html><body>${html}</body>`).window.document;
  } catch (erreur) { // NOSONAR
    return echec(`${nomFichier} : la sortie de la coloration n'est pas du HTML analysable`, [
      String(erreur instanceof Error ? erreur.message : erreur),
      'un garde-fou qui ne prouve pas avoir tout vu ne garde rien (S-003)',
    ]);
  }
}

/**
 * CONTRÔLE DE CONSERVATION « ZÉRO STYLE EN LIGNE » — le pendant de `verifierAncres`, pour
 * `transformerStyleToClass`. La CSP du site est à hachages : un `style=` survivant serait refusé
 * par le navigateur, et un `<style>` élargirait `style-src`.
 *
 * 🔴 POURQUOI ON ANALYSE — CINQUIÈME RÉCIDIVE DE LA FAMILLE S-001/S-003/S-009/S-014, et cette
 * fois le défaut allait dans l'autre sens : le SUR-REFUS. La première écriture cherchait les
 * motifs `/\sstyle\s*=/i` et `/<style[\s>]/i` dans la CHAÎNE `html` — laquelle contient le TEXTE
 * du code de l'auteur, échappé par Shiki mais toujours là. Un exemple PHP parfaitement légitime,
 * `$html = '<p style="color:red">';`, faisait donc échouer G-content sur un diagnostic FAUX
 * (« la coloration a produit du style en ligne — vérifier `transformerStyleToClass` »), et sans
 * parade éditoriale possible : on ne met pas de guillemets typographiques dans du code. C'est la
 * leçon **XSS/CSP** qui ne se serait pas publiée, sur un site qui enseigne la CSP — donc la
 * pression aurait été de DÉSARMER le garde-fou. Reproduit en revue le 2026-08-18.
 *
 * La règle du dépôt ne change pas de forme quand le sens du défaut change : sur un format
 * structuré, on ANALYSE, puis on confronte à une liste blanche NOMINATIVE. Ici l'arbre tranche
 * seul — le texte d'un `<span>` ne peut pas fabriquer un attribut, Shiki échappant « < ».
 *
 * CE QUI EST REFUSÉ, NOMMÉMENT : un élément `<style>` RÉEL, et tout élément portant un attribut
 * `style` RÉEL. Ce que le code de l'auteur RACONTE ne compte pour rien.
 *
 * ⚠️ EXPORTÉ POUR ÊTRE MIS À L'ÉPREUVE, et c'est la seule raison (L-036) : un contrôle positif du
 * correctif doit APPELER l'outil corrigé sur un HTML forgé, pas compiler autour de lui — compiler
 * transformateur branché ne mesurerait que la lecture du spec, jamais la capacité de REFUS.
 *
 * @param {string} html sortie de `codeToHtml`
 * @param {string} nomFichier fichier de contenu, pour nommer la faute
 */
export function verifierZeroStyle(html, nomFichier) {
  const document = analyserFragment(html, nomFichier);

  for (const element of document.querySelectorAll('style')) {
    echec(`${nomFichier} : la coloration a produit un élément <style>`, [
      `rencontré : « ${apercu(element.outerHTML)} »`,
      'un <style> élargirait `style-src` — la CSP du site est à hachages',
      'vérifier que `transformerStyleToClass` est bien passé au rendu Shiki',
    ]);
  }
  for (const element of document.querySelectorAll('[style]')) {
    echec(
      `${nomFichier} : la coloration a produit un attribut style= sur <${element.tagName.toLowerCase()}>`,
      [
        `rencontré : « ${apercu(element.outerHTML)} »`,
        'la CSP du site est à hachages — `style=` est refusé par le navigateur',
        'vérifier que `transformerStyleToClass` est bien passé au rendu Shiki',
      ],
    );
  }
}

/**
 * CONTRÔLE DE CONSERVATION DES ANCRES DE LIGNE — le pendant du « zéro `style=` », pour l'autre
 * transformateur. Une ancre manquante ne casse rien à la compilation : elle produit une leçon
 * publiée où l'annotation du lot B ne désigne plus rien, sous des gates verts.
 *
 * 🔴 POURQUOI ON ANALYSE, ET POURQUOI UNE REGEX ÉTAIT ICI UN S-003 DE PLUS. La première écriture
 * de ce contrôle cherchait `\bligne-(\d+)\b` dans la CHAÎNE `html` — laquelle contient le TEXTE
 * du code de l'auteur. Un extrait dont un commentaire dit « voir ancre-ligne-1, ancre-ligne-2, ancre-ligne-3 »
 * fournissait donc lui-même les ancres qu'on lui demandait, et le garde-fou passait vert
 * transformateur débranché (mesuré en revue de sécurité, 2026-08-18). C'est le patron que le
 * dépôt refuse pour la QUATRIÈME fois : sur un format structuré, on ANALYSE, puis on confronte à
 * une liste blanche NOMINATIVE — jamais l'inverse. Le texte d'un `<span>` ne peut pas fabriquer
 * un `<span>` : Shiki échappe « < », donc l'arbre, lui, ne ment pas.
 *
 * CE QUI EST EXIGÉ, ET C'EST PLUS QU'UNE PRÉSENCE :
 *   · les lignes sont les `span.line` enfants du `<code>` d'un `<pre class="shiki">` — nommés,
 *     pas cherchés n'importe où dans le document ;
 *   · chacune porte EXACTEMENT une classe `ancre-ligne-N`, N en base 1 ;
 *   · la suite relevée est `1, 2, … N` DANS L'ORDRE — un `Set` aurait laissé passer une base 0,
 *     un décalage d'un cran ou une ligne dupliquée, qui feraient tous pointer `{lignes="3"}` sur
 *     la mauvaise ligne, en silence ;
 *   · et il y a au moins autant de lignes rendues que la source n'en compte (`compterLignes`),
 *     sans quoi une portée acceptée par `lirePortee` s'ancrerait dans le vide.
 *
 * ⚠️ EXPORTÉ POUR ÊTRE MIS À L'ÉPREUVE, ET C'EST LA SEULE RAISON. Un garde-fou dont la seule
 * preuve est une mutation faite à la main un jour donné n'a pas de contrôle positif : rien ne
 * rougira le jour où quelqu'un l'affaiblira (L-019, et le constat de revue qui a fait naître cette
 * ligne). `src/pipeline-contenu-compilation.spec.ts` l'appelle donc DIRECTEMENT, dans un processus
 * fils, avec un HTML forgé sans ancre mais dont le TEXTE en cite — le contournement exact que la
 * version par motif laissait passer — et exige le code de sortie 1.
 *
 * @param {string} html sortie de `codeToHtml`
 * @param {string} code source colorée, pour compter ce qu'on attend
 * @param {string} nomFichier fichier de contenu, pour nommer la faute
 */
export function verifierAncres(html, code, nomFichier) {
  const attendues = compterLignes(code);
  const document = analyserFragment(html, nomFichier);

  /** @type {number[]} */
  const relevees = [];
  for (const ligne of document.querySelectorAll('pre.shiki > code > span.line')) {
    const ancres = ligne.className
      .split(/\s+/)
      .filter((classe) => classe.startsWith(PREFIXE_LIGNE))
      .map((classe) => classe.slice(PREFIXE_LIGNE.length));
    if (ancres.length !== 1 || !/^\d+$/.test(ancres[0] ?? '')) {
      return echec(
        `${nomFichier} : une ligne colorée porte ${String(ancres.length)} ancre(s) au lieu d'une ` +
          `— classes : « ${ligne.className} »`,
        [
          'chaque ligne doit porter exactement une classe `ancre-ligne-N`, N en base 1',
          'vérifier le transformateur `drjst-ancre-de-ligne` passé au rendu Shiki',
        ],
      );
    }
    relevees.push(Number(ancres[0]));
  }

  const attenduesEnOrdre = relevees.map((_ancre, index) => index + 1);
  if (relevees.join(',') !== attenduesEnOrdre.join(',')) {
    return echec(
      `${nomFichier} : les ancres de ligne ne forment pas la suite 1…${String(relevees.length)} ` +
        `— relevées : ${relevees.join(', ') || '(aucune)'}`,
      [
        'chaque ligne doit porter sa classe `ancre-ligne-N` : c’est le seul crochet qui survive au',
        'sanitizer d’Angular (mesure : `src/sonde-sanitizer-shiki.spec.ts`)',
        'vérifier que le transformateur `drjst-ancre-de-ligne` est bien passé au rendu Shiki',
      ],
    );
  }
  if (relevees.length < attendues) {
    return echec(
      `${nomFichier} : ${String(relevees.length)} ligne(s) ancrée(s) pour ${String(attendues)} ` +
        'ligne(s) de source',
      [
        'une portée `{lignes="N"}` acceptée par `lirePortee` s’ancrerait alors dans le vide',
        'les deux comptages viennent de `compterLignes` : leur écart vient du rendu, pas de la source',
      ],
    );
  }
}

/**
 * Les encres du thème SOMBRE que ce dépôt corrige — liste NOMINATIVE, une entrée par couleur,
 * chacune avec sa mesure. Rien d'autre n'est touché.
 *
 * 🔴 POURQUOI CETTE CORRECTION EXISTE (2026-08-21, E3-ST3). Le thème `github-dark` est calibré
 * pour SON fond (`#24292e`), pas pour celui du design system : depuis la bascule « Moniteur
 * ambre », `--couleur-code-surface` vaut `#0b1114`, nettement plus sombre. Les encres claires y
 * gagnent du contraste ; l'encre de COMMENTAIRE, elle, est déjà la plus faible du thème et tombe
 * à **3,94:1** — sous la barre de 4,5:1 de WCAG 1.4.3 AA pour du texte normal.
 *
 * ⚠️ CE N'EST PAS UN DÉFAUT NEUF : il dormait depuis E6, et il ne s'est révélé qu'à la première
 * leçon publiée portant des COMMENTAIRES dans ses blocs de code (`02-evaluation-cvss`). La
 * feuille générée ne contient que les classes réellement employées par `content/` — une encre
 * qu'aucune leçon n'emploie n'est jamais émise, donc jamais mesurée. Le gate G-contraste
 * (`tools/design/verifier-contrastes.mjs`) l'a attrapé en CI, sur le contenu réel.
 *
 * On corrige l'ENCRE plutôt que le FOND parce que le fond est un jeton du design system, mesuré
 * contre 40 paires : le déplacer pour arranger une couleur de thème tiers reviendrait à laisser
 * la coloration syntaxique dicter la palette du site.
 *
 * @type {ReadonlyMap<string, { remplacement: string, note: string }>}
 */
const ENCRES_SOMBRES_CORRIGEES = new Map([
  [
    '#6A737D',
    {
      remplacement: '#848D99',
      // Même teinte (hsl ~210°, 8 %), luminosité portée de 45 % à 55 % : 3,94:1 → 5,70:1 sur
      // `--couleur-code-surface` (#0b1114). Le commentaire reste NETTEMENT plus discret que le
      // texte courant du code (#E1E4E8, ~14:1) — la hiérarchie visuelle est conservée, c'est
      // seulement le plancher légal qui est franchi.
      note: 'encre de commentaire de github-dark — 3,94:1 sur #0b1114, sous le seuil AA',
    },
  ],
]);

/**
 * Applique les corrections d'encre ci-dessus au CSS que Shiki vient de produire.
 *
 * ⚠️ La substitution ne porte que sur la propriété `--shiki-dark` : l'impression garde les
 * encres CLAIRES du thème, qui sont mesurées contre le papier blanc et n'ont pas ce défaut.
 * Et elle se VÉRIFIE au lieu de s'affirmer — une casse hexadécimale inattendue ou un changement
 * de thème laisserait sinon passer l'encre fautive en silence, et le gate G-contraste ne
 * rougirait qu'en CI, une fois la leçon écrite.
 *
 * @param {string} css
 * @returns {string}
 */
function corrigerEncresSombres(css) {
  let corrige = css;
  for (const [encre, { remplacement }] of ENCRES_SOMBRES_CORRIGEES) {
    // La chaîne inspectée est du CSS GÉNÉRÉ (noms de classes et couleurs) : elle ne contient
    // aucune entrée d'auteur, contrairement au HTML colorisé que `verifierZeroStyle` doit,
    // lui, analyser (S-014).
    const motif = new RegExp(`(--shiki-dark:\\s*)${encre}\\b`, 'gi');
    corrige = corrige.replace(motif, `$1${remplacement}`);
  }

  const restantes = [...ENCRES_SOMBRES_CORRIGEES.keys()].filter((encre) =>
    new RegExp(`--shiki-dark:\\s*${encre}\\b`, 'i').test(corrige),
  );
  if (restantes.length > 0) {
    throw new Error(
      `coloration : la correction d'encre n'a pas pris sur ${restantes.join(', ')} — la feuille ` +
        'générée porterait une encre sous le seuil de contraste AA sans que rien ne le dise',
    );
  }
  return corrige;
}

/**
 * @returns {Promise<Colorateur>}
 */
export async function creerColorateur() {
  const transformateur = transformerStyleToClass({ classPrefix: PREFIXE_CLASSE });
  const surligneur = await createHighlighter({
    themes: [THEME_CLAIR, THEME_SOMBRE],
    langs: [...LANGAGES],
  });

  return {
    colorer(code, langage, nomFichier) {
      const html = surligneur.codeToHtml(code, {
        lang: langage,
        // Deux thèmes, aucune couleur par défaut : Shiki n'émet que les propriétés personnalisées
        // `--shiki-light` / `--shiki-dark`, et la feuille générée choisit laquelle s'applique. Sans
        // `defaultColor: false`, la couleur claire serait écrite en dur et le thème sombre du site
        // afficherait du code clair.
        themes: { light: THEME_CLAIR, dark: THEME_SOMBRE },
        defaultColor: false,
        transformers: [transformateur, transformateurLigne, transformateurPre],
      });
      // LES DEUX CONTRÔLES DE CONSERVATION (patron S-003/S-014) : on n'affirme pas que les
      // transformateurs ont marché, on le VÉRIFIE — et par ANALYSE, jamais par motif. Les deux
      // inspectent une chaîne qui contient le TEXTE du code de l'auteur : un motif y laisserait
      // l'entrée fabriquer la preuve (ancres) ou fabriquer la faute (style en ligne).
      verifierZeroStyle(html, nomFichier);
      verifierAncres(html, code, nomFichier);
      return html;
    },
    feuille() {
      return corrigerEncresSombres(transformateur.getCSS());
    },
  };
}

/**
 * Assemble la feuille SCSS générée : les classes de Shiki, puis le choix écran/impression.
 *
 * Les couleurs en dur qu'on lit ici sont la PALETTE d'un thème de coloration syntaxique, pas des
 * couleurs de composant : elles n'ont pas d'équivalent en jetons sémantiques (le design system
 * n'a pas de jeton « mot-clé de langage »). Le fichier est généré et gitignoré ; il ne se modifie
 * pas à la main.
 *
 * @param {string} classes CSS rendu par `transformerStyleToClass`
 * @returns {string}
 */
export function assemblerFeuille(classes) {
  return `// FICHIER GÉNÉRÉ par tools/content-pipeline/compiler-markdown.mjs — NE PAS ÉDITER.
// Coloration syntaxique Shiki (${THEME_CLAIR} / ${THEME_SOMBRE}), sortie en CLASSES et non en
// styles en ligne : la CSP du site est à hachages et refuse tout attribut « style ».
// Chaque classe ne porte que deux propriétés personnalisées : l'ÉCRAN prend la sombre sans
// condition (le site n'a qu'un thème depuis E6), l'IMPRESSION prend la claire.

${classes}

// ⚠️ AUCUN \`overflow-x\` ICI — RETIRÉ AU LOT B2 D'E2-ST4, ET IL NE DOIT PAS REVENIR.
// Une région défilante doit être atteignable au clavier : c'est le conteneur qui défile
// qui porte \`tabindex="0"\` et le nom accessible, et ce conteneur est écrit dans le GABARIT
// de \`rendu-blocs.ts\` (\`.defileur\`), le seul endroit où un attribut survit — le sanitizer
// d'Angular efface \`id\` et \`data-*\` du HTML injecté. Le remettre ici imbriquerait deux
// défileurs : celui du gabarit ne recevrait plus rien à faire défiler, et le \`<pre>\`
// intérieur deviendrait une région défilante SANS NOM ET INATTEIGNABLE au clavier — son
// \`tabindex\` est retiré à la compilation depuis le lot B (\`drjst-pre-sans-tabindex\`),
// précisément parce qu'il n'a plus rien à faire défiler (WCAG 2.1.1 / 2.4.6).
// Épinglé par \`src/pipeline-contenu-compilation.spec.ts\`.
// 🔴 À L'ÉCRAN, LA COLORATION SOMBRE EST INCONDITIONNELLE — E6, « Moniteur ambre ».
// Jusqu'ici la bascule avait trois branches : un DÉFAUT clair, puis deux surcharges sombres
// conditionnées à \`prefers-color-scheme: dark\` ou à \`[data-theme='sombre']\`. Les deux
// conditions sont mortes depuis E6 — le thème clair a quitté \`_themes.scss\` et plus personne
// ne pose \`data-theme\` —, donc un visiteur dont le SYSTÈME est en clair tombait sur la branche
// par défaut et recevait des blocs de code BLANCS dans une page noire. Une seule branche
// subsiste : le site n'a qu'un thème.
//
// Et le FOND vient du design system, pas du thème de coloration : \`--shiki-dark-bg\` (#24292e,
// le gris-bleu de github-dark) n'est pas la surface du site, et la MÊME page affichait deux
// fonds de code — celui des blocs de leçon et celui du quiz/de la simulation, qui lisent le
// jeton. Les ENCRES (\`--shiki-dark\`) restent celles du thème : c'est la coloration
// syntaxique, elle a sa raison d'être.
.shiki {
  background-color: var(--couleur-code-surface);
}

.shiki,
.shiki span {
  color: var(--shiki-dark);
}

// À l'impression, src/styles.scss force les jetons du thème CLAIR pour TOUS les visiteurs :
// encre sombre sur papier blanc. Un bloc de code resté sombre gaspillerait l'encre et sortirait
// illisible — exactement la panne que la cascade d'impression a corrigée ailleurs (E1-ST1). La
// branche claire n'est donc pas supprimée, elle est DÉPLACÉE là où elle vaut encore.
@media print {
  .shiki {
    background-color: var(--shiki-light-bg);
  }

  .shiki,
  .shiki span {
    color: var(--shiki-light);
  }
}
`;
}

// ---------------------------------------------------------------------------
// Attributs `{clef="valeur"}` posés sur un conteneur
// ---------------------------------------------------------------------------

/**
 * Analyse la partie `{clef="valeur"}` de l'info d'un conteneur.
 *
 * ~15 lignes de code maison assumées au plan : `markdown-it-container` ne fournit rien de tel. Les
 * clefs sont en LISTE FERMÉE — une clef mal orthographiée (`ligne=` pour `lignes=`) doit faire
 * échouer la construction, pas se perdre.
 *
 * @param {string} info valeur brute de `token.info`
 * @param {string} nom nom du conteneur, pour le message
 * @param {readonly string[]} clefsAutorisees
 * @param {string} nomFichier
 * @param {string} [marque] le marqueur RÉELLEMENT écrit par l'auteur (`ouverture.markup`), cité
 *   tel quel dans les messages. Défaut `':::'` pour les conteneurs qui n'admettent que cette
 *   longueur. 🔴 CE PARAMÈTRE N'EST PAS COSMÉTIQUE : un littéral `':::'` faisait dire au refus
 *   d'un `::: methodes` (3 deux-points, la forme qui NE MARCHE PAS puisque le conteneur doit
 *   s'ouvrir plus long que ses volets) « ::: methodes » — c'est-à-dire qu'il rendait à l'auteur
 *   sa propre faute comme si c'était la forme attendue.
 * @returns {Record<string, string>}
 */
function lireAttributs(info, nom, clefsAutorisees, nomFichier, marque = ':::') {
  const reste = info.trim().slice(nom.length).trim();
  return lireBlocDAttributs(reste, `${marque} ${nom}`, clefsAutorisees, nomFichier).attributs;
}

/**
 * La même lecture, pour le SEUL appelant qui admet des marqueurs sans valeur (`::: methode`).
 *
 * Fonction distincte plutôt qu'un cinquième paramètre sur `lireAttributs` : les six autres
 * appelants rendent un `Record` et n'ont aucun marqueur à connaître. Un appelant qui ne déclare
 * aucun marqueur doit se comporter EXACTEMENT comme avant le lot 5 — c'est ce que garantit le
 * défaut `[]` de `lireBlocDAttributs`.
 *
 * @param {string} info le `info` du jeton d'ouverture
 * @param {string} nom nom du conteneur
 * @param {readonly string[]} clefsAutorisees liste blanche NOMINATIVE des paires
 * @param {readonly string[]} marqueursAutorises liste blanche NOMINATIVE des marqueurs sans valeur
 * @param {string} nomFichier
 * @param {string} [marque] le marqueur réellement écrit (`ouverture.markup`) — même raison que
 *   sur `lireAttributs` : un volet niché dans un conteneur à cinq deux-points s'ouvre à quatre.
 * @returns {{ attributs: Record<string, string>, marqueurs: string[] }}
 */
function lireAttributsEtMarqueurs(
  info,
  nom,
  clefsAutorisees,
  marqueursAutorises,
  nomFichier,
  marque = ':::',
) {
  const reste = info.trim().slice(nom.length).trim();
  return lireBlocDAttributs(
    reste,
    `${marque} ${nom}`,
    clefsAutorisees,
    nomFichier,
    marqueursAutorises,
  );
}

/**
 * Le CŒUR de l'analyse `{clef="valeur"}` — commun au conteneur `:::` et, depuis le §3bis, au TITRE
 * de section. Extrait de `lireAttributs` plutôt que recopié : une SECONDE écriture de la même
 * grammaire finirait par en dire autre chose, et un message parlant de « ::: » sur un titre
 * enverrait l'auteur chercher un conteneur qui n'existe pas.
 *
 * @param {string} reste `''`, ou le bloc `{…}` complet, déjà rogné
 * @param {string} libelle ce que l'auteur a écrit (« ::: cours », « ## Les commandes ») — cité tel
 *   quel dans les messages, c'est la seule chose qui distingue les deux appelants
 * 🔴 LES MARQUEURS SANS VALEUR (lot 5, `::: methode {libelle="…" defaut}`) SONT UNE LISTE BLANCHE
 * PASSÉE PAR L'APPELANT, exactement comme `clefsAutorisees`. Un appelant qui n'en déclare AUCUN
 * retombe, à l'octet près, sur le comportement d'avant : tout résidu est refusé par le message
 * « attributs illisibles ». C'est ce qui garde le contrôle de résidu SENSIBLE — il existe pour
 * attraper `{lignes=2}` (guillemets oubliés), qui rendrait un objet vide et enverrait une
 * annotation à la ligne 0 sans que rien ne le signale.
 *
 * @param {readonly string[]} clefsAutorisees liste blanche NOMINATIVE
 * @param {string} nomFichier
 * @param {readonly string[]} [marqueursAutorises] liste blanche NOMINATIVE des marqueurs SANS
 *   valeur ; vide par défaut, ce qui rend le résidu entièrement refusé
 * @returns {{ attributs: Record<string, string>, marqueurs: string[] }}
 */
function lireBlocDAttributs(reste, libelle, clefsAutorisees, nomFichier, marqueursAutorises = []) {
  if (reste === '') return { attributs: {}, marqueurs: [] };
  const accolade = /^\{(.*)\}$/.exec(reste);
  if (accolade === null) {
    echec(`${nomFichier} : « ${libelle} » suivi de « ${reste} »`, [
      'seule la forme {clef="valeur"} est acceptée après le nom du conteneur',
    ]);
  }
  /** @type {Record<string, string>} */
  const attributs = {};
  const corps = accolade[1] ?? '';
  // Le `\b` de tête n'est pas décoratif : sans lui, `[a-z-]+` peut démarrer au MILIEU d'un nom de
  // clef et le moteur essaie chaque point de départ, d'où un retour arrière super-linéaire (S8786).
  // Ancré sur une frontière de mot, il n'y a plus qu'un départ possible par clef. Le contrôle de
  // résidu ci-dessous est inchangé : `{lignes=2}` (guillemets oubliés) ne correspond toujours à
  // rien, donc laisse un résidu non vide, donc échoue — c'est le garde-fou testé.
  const MOTIF_PAIRE = /\b([a-z-]+)="([^"]*)"/g;
  for (const paire of corps.matchAll(MOTIF_PAIRE)) {
    const clef = paire[1] ?? '';
    // UN MARQUEUR ÉCRIT AVEC UNE VALEUR (`{hors-cours="oui"}`) EST UNE FAUTE DE GRAMMAIRE, PAS UN
    // ATTRIBUT INCONNU — et le message doit le dire. « attribut inconnu » enverrait l'auteur
    // chercher une faute de frappe dans un nom qui est, lui, parfaitement au contrat ; c'est sa
    // FORME qui est fautive. Jugé ICI, avant la liste blanche des clefs, pour que la copie du
    // validateur puisse rendre le même verdict clef par clef, dans le même ordre (L-089).
    if (marqueursAutorises.includes(clef)) {
      echec(
        `${nomFichier} : attributs illisibles sur « ${libelle} » — « ${clef} » est un marqueur : il s’écrit seul, sans valeur ni guillemets`,
        [
          `marqueurs admis : ${marqueursAutorises.join(', ')}`,
          'un attribut s’écrit clef="valeur" ; un marqueur s’écrit seul, sans valeur ni guillemets',
        ],
      );
    }
    if (!clefsAutorisees.includes(clef)) {
      echec(`${nomFichier} : attribut « ${clef} » inconnu sur « ${libelle} »`, [
        `attendus : ${clefsAutorisees.join(', ') || '(aucun)'}`,
      ]);
    }
    attributs[clef] = paire[2] ?? '';
  }
  // CE QUI RESTE une fois les paires reconnues retirées doit être vide. Sans ce contrôle,
  // `{lignes=2}` (guillemets oubliés) rendrait un objet VIDE : l'annotation partirait sur la ligne
  // 0 sans que rien ne le signale. Ce qui n'est pas compris est refusé, jamais ignoré.
  const residu = corps.replace(MOTIF_PAIRE, '').trim();
  if (residu === '') return { attributs, marqueurs: [] };
  // AUCUN MARQUEUR DÉCLARÉ = le comportement d'avant le lot 5, mot pour mot. C'est la branche que
  // prennent le titre de section, l'encadré, la comparaison et la marche à suivre.
  if (marqueursAutorises.length === 0) {
    echec(`${nomFichier} : attributs illisibles sur « ${libelle} » — « ${residu} »`, [
      'forme attendue : {clef="valeur"}, valeurs toujours entre guillemets droits',
    ]);
  }
  const marqueurs = residu.split(/\s+/);
  const inconnu = marqueurs.find((jeton) => !marqueursAutorises.includes(jeton));
  if (inconnu !== undefined) {
    echec(
      `${nomFichier} : « ${inconnu} » n’est ni un attribut ni un marqueur connu sur « ${libelle} »`,
      [
        `marqueurs admis : ${marqueursAutorises.join(', ')}`,
        'un attribut s’écrit clef="valeur" ; un marqueur s’écrit seul, sans valeur ni guillemets',
      ],
    );
  }
  // Un marqueur répété est une frappe, pas une intention : il ne veut rien dire de plus que le
  // premier, et l'avaler laisserait croire que la ligne a été comprise en entier.
  const repete = marqueurs.find((jeton, rang) => marqueurs.indexOf(jeton) !== rang);
  if (repete !== undefined) {
    echec(`${nomFichier} : marqueur « ${repete} » écrit deux fois sur « ${libelle} »`);
  }
  return { attributs, marqueurs };
}

// ---------------------------------------------------------------------------
// Parcours des jetons markdown-it → blocs du contrat
// ---------------------------------------------------------------------------

/**
 * @typedef {object} Contexte
 * @property {InstanceType<typeof MarkdownIt>} md
 * @property {Colorateur} colorateur
 * @property {string} nomFichier
 * @property {((code: string) => { svg: string, titreAccessible: string, descriptionLongue: string }) | null} rendreMermaid
 * @property {number | null} seanceDuModule séance déclarée par le frontmatter, ou `null`. C'est la
 *   valeur par DÉFAUT du `seance` d'un encadré (`docs/contenu/ancrage-au-cours.md` §3) : à `null`,
 *   un encadré qui porte un renvoi doit déclarer sa séance lui-même, sans quoi le renvoi ne
 *   désigne rien et la compilation échoue.
 * @property {RegistreIndexe | null} exercices le registre du SUJET, indexé pour la résolution des
 *   `ref` (E3-ST21). `null` quand la racine n'en porte pas : un `::: exercice-du-cours` fait alors
 *   ÉCHOUER la compilation en le disant, jamais rendre un encadré sans énoncé.
 * @property {string} nomDeLaRacine le NOM DU DOSSIER de la racine compilée (`securite-web`), et
 *   non le `sujet` déclaré — c'est lui qui indexe le registre, donc lui qu'un `cours` SUPERFLU
 *   répète (§3bis, lot 1b). Non nullable : un dossier a toujours un nom.
 * @property {Map<string, SujetFrere>} sujetsFreres les sujets frères de la racine, indexés par nom
 *   de dossier — la seule chose qu'un `cours="…"` puisse nommer. VIDE plutôt que `null` quand il
 *   n'y en a aucun : le refus peut alors énumérer zéro sujet, ce qui est une information.
 */

/**
 * L'index de résolution du registre — la forme de travail, pas celle du contrat.
 *
 * @typedef {{
 *   parSeance: ReadonlyMap<number, ReadonlyMap<string, { titre: string, enonce: string }>>,
 * }} RegistreIndexe
 */

/**
 * Repère la fermeture du conteneur ouvert en `debut`, en comptant les imbrications de MÊME nom.
 *
 * @param {readonly JetonMd[]} jetons
 * @param {number} debut index du jeton d'ouverture
 * @param {string} nom
 * @param {string} nomFichier
 * @returns {number} index du jeton de fermeture
 */
function trouverFermeture(jetons, debut, nom, nomFichier) {
  let profondeur = 0;
  for (let i = debut; i < jetons.length; i += 1) {
    const type = jetons[i]?.type;
    if (type === `container_${nom}_open`) profondeur += 1;
    else if (type === `container_${nom}_close`) {
      profondeur -= 1;
      if (profondeur === 0) return i;
    }
  }
  return echec(`${nomFichier} : « ::: ${nom} » n'est jamais fermé`);
}

/**
 * @param {JetonMd} jeton un jeton `fence`
 * @param {Contexte} ctx
 * @returns {Langage}
 */
function langageDe(jeton, ctx) {
  const langue = jeton.info.trim().split(/\s+/)[0] ?? '';
  if (!NOMS_LANGAGES.has(langue)) {
    echec(`${ctx.nomFichier} : bloc de code en « ${langue || '(aucune langue)'} »`, [
      `langues acceptées : ${[...LANGAGES].join(', ')}`,
      'une langue hors liste ne serait pas colorée, et E2-ST4 ne saurait pas la rendre',
    ]);
  }
  return /** @type {Langage} */ (langue);
}

/**
 * Convertit une clôture en bloc du contrat — code coloré, ou diagramme si le lot 3 est branché.
 *
 * @param {JetonMd} jeton
 * @param {Contexte} ctx
 * @returns {BlocContenu}
 */
function blocDeCloture(jeton, ctx) {
  if (jeton.info.trim() === 'mermaid') {
    if (ctx.rendreMermaid === null) {
      // Ce message se lit surtout depuis `npm run content:compiler`, qui appelle
      // compilerRacine() SANS rendeur : ce script est un outil de mise au point sur
      // une leçon sans diagramme, jamais le chemin de construction. Le brancher ici
      // ferait un cycle d'imports (rendre-mermaid.mjs importe déjà compilerRacine).
      // On nomme donc la commande qui, elle, branche tout.
      echec(`${ctx.nomFichier} : bloc « mermaid » rencontré sans rendeur branché`, [
        'compilerRacine() a été appelée sans son option `rendreMermaid`',
        'en ligne de commande, c’est `npm run content:build` qui branche le rendeur',
        '(`npm run content:compiler` ne sert qu’aux leçons SANS diagramme)',
      ]);
    }
    return { type: 'mermaid', ...ctx.rendreMermaid(jeton.content) };
  }
  const langage = langageDe(jeton, ctx);
  return {
    type: 'code',
    langage,
    htmlColore: ctx.colorateur.colorer(jeton.content, langage, ctx.nomFichier),
  };
}

/**
 * Lit la PORTÉE d'une annotation — la valeur de `{lignes="…"}` — et la confronte à l'extrait
 * qu'elle désigne.
 *
 * 🔴 POURQUOI CE CONTRÔLE VIT ICI, ET NULLE PART AILLEURS (E2-ST4, lot A1). `ExempleCode` ne
 * conserve PAS le code brut : l'artéfact ne porte que le HTML coloré. Aucun consommateur en aval
 * — ni `lireLeconCompilee`, ni `RenduBlocs` — ne peut donc recompter les lignes de l'extrait pour
 * savoir si la ligne 42 existe. Le compilateur est le dernier endroit du pipeline où la source
 * est encore là ; s'il ne borne pas la portée, personne ne la bornera. Avant ce lot, `lignes="42"`
 * sur un extrait de deux lignes sortait G-content VERT, et le rendu affichait « Ligne 42 : »
 * devant un bloc qui n'a pas de ligne 42. C'est la même famille de défaut que la dette du lot D
 * d'E2-ST3 : un invariant nécessaire au rendu, imposé d'un seul côté.
 * `valider.mjs` fait exactement ce contrôle pour le `ligneFautive` d'une question
 * `trouver-la-faille` (`verifierQuestionTrouverLaFaille`) — l'asymétrie n'avait pas de raison.
 *
 * CE QUI EST REFUSÉ, ET POURQUOI CHAQUE CAS COMPTE :
 *   · une valeur vide (`lignes=""`, `lignes="1,,2"`) — `Number('')` vaut `0`, donc l'ancien code
 *     transformait une coquille en « annotation sur le bloc entier », SANS RIEN DIRE ;
 *   · autre chose qu'une suite de chiffres (`-1`, `1.5`, `1e2`, `0x2`) — `Number` les accepte
 *     tous, `Number.isInteger` en laisse passer deux ;
 *   · un numéro AU-DELÀ du nombre de lignes de l'extrait — le défaut nommé ci-dessus ;
 *   · le même numéro deux fois (`lignes="1,1"`) — deux portées identiques dans une seule note ;
 *   · `0` mêlé à des numéros (`lignes="0,2"`) — `0` désigne le bloc ENTIER (convention tranchée
 *     en E2-ST1) ; l'annoncer avec une ligne précise est contradictoire, pas ambigu.
 *
 * Le message NOMME le fichier et la valeur fautive : la dette du lot D était précisément un refus
 * qui laissait le lecteur chercher lui-même la leçon en cause.
 *
 * ⚠️ `brut` N'EST PLUS FACULTATIF DEPUIS LE LOT B1a. Il y avait ici un `if (brut === undefined)
 * return [0]` — la portée par défaut du temps où `{lignes="…"}` était un attribut FACULTATIF du
 * conteneur. Maintenant que chaque note doit ouvrir par sa portée, ce chemin n'était plus atteint,
 * et le garder aurait laissé un futur appelant retomber en silence sur « le bloc entier ». Une
 * valeur absente est désormais une valeur VIDE, donc un refus nommé.
 *
 * @param {string} brut valeur de `{lignes="…"}` lue en tête de la note
 * @param {string} code contenu du bloc de code annoté, tel que markdown-it le rend
 * @param {'vulnerable' | 'corrige'} nom volet annoté, pour nommer la faute
 * @param {string} nomFichier fichier de contenu, pour nommer la faute
 * @returns {number[]} portée triée, jamais vide — `[0]` = le bloc entier
 */
function lirePortee(brut, code, nom, nomFichier) {
  // ⚠️ LE MÊME COMPTAGE QUE CELUI DES ANCRES (E2-ST4, lot A2). `compterLignes` est partagé avec le
  // contrôle de conservation du colorateur, exprès : la borne « la ligne 3 existe » et l'ancre
  // `ancre-ligne-3` doivent parler de la même ligne 3. Deux comptages recopiés auraient pu diverger d'un
  // saut de ligne final, et une portée acceptée se serait ancrée dans le vide.
  const nbLignes = compterLignes(code);

  /** @type {number[]} */
  const portee = [];
  for (const jeton of brut.split(',')) {
    const valeur = jeton.trim();
    if (valeur === '') {
      echec(`${nomFichier} : « lignes="${brut}" » sur « ::: ${nom} » porte une valeur VIDE`, [
        'une virgule sans numéro derrière est une coquille, pas une portée',
        '⚠️ `Number("")` vaut 0 : sans ce refus, la note basculerait en silence sur le bloc entier',
      ]);
    }
    if (!/^\d+$/.test(valeur)) {
      echec(`${nomFichier} : « lignes="${brut}" » sur « ::: ${nom} » — « ${valeur} » illisible`, [
        'valeurs attendues : des entiers >= 0 séparés par des virgules, par exemple {lignes="1,2"}',
        '0 désigne le bloc entier, et ne se combine avec aucun numéro de ligne',
      ]);
    }
    const numero = Number(valeur);
    if (numero > nbLignes) {
      echec(
        `${nomFichier} : « lignes="${brut}" » sur « ::: ${nom} » désigne la ligne ${numero}, ` +
          `mais l'extrait n'en compte que ${nbLignes}`,
        [
          'la portée d’une annotation doit exister dans le code qu’elle annote',
          'sinon la leçon publiée affiche « Ligne ' + String(numero) + ' : » devant un bloc qui n’a pas cette ligne',
        ],
      );
    }
    if (portee.includes(numero)) {
      echec(
        `${nomFichier} : « lignes="${brut}" » sur « ::: ${nom} » désigne deux fois la ligne ${numero}`,
        ['chaque ligne de la portée ne se cite qu’une fois'],
      );
    }
    portee.push(numero);
  }
  if (portee.includes(0) && portee.length > 1) {
    echec(
      `${nomFichier} : « lignes="${brut}" » sur « ::: ${nom} » mêle 0 et des numéros de ligne`,
      [
        '0 désigne le bloc ENTIER (convention d’E2-ST1) : il ne se combine avec rien',
        'écrire {lignes="0"} pour le bloc entier, ou la liste des lignes visées',
      ],
    );
  }
  return [...portee].sort((a, b) => a - b);
}

/**
 * La PORTÉE en tête d'une note, ancrée au DÉBUT de la chaîne — le `^` porte tout le garde-fou.
 * `[ \t]*` mange la seule espace de séparation ; le texte de la note commence après.
 */
const MOTIF_PORTEE_EN_TETE = /^\{lignes="([^"]*)"\}[ \t]*/;

/**
 * Réduit un paragraphe à un aperçu d'une ligne, pour NOMMER la note fautive dans un message.
 *
 * @param {string} texte
 * @returns {string}
 */
function apercu(texte) {
  const surUneLigne = texte.replace(/\s+/g, ' ').trim();
  return surUneLigne.length > 60 ? `${surUneLigne.slice(0, 60)}…` : surUneLigne;
}

/**
 * Lit UNE note d'un volet : un paragraphe qui OUVRE par sa portée `{lignes="…"}`.
 *
 * 🔴 POURQUOI ON LIT UN JETON, ET NON UNE CHAÎNE (S-014, quatrième récidive de la famille
 * S-001/S-003/S-009, payée au lot A2). Le texte d'une note peut parfaitement CITER `{lignes="2"}`
 * — une leçon qui enseigne cette syntaxe le fera. Balayer `jeton.content` à la recherche du motif
 * laisserait donc l'ENTRÉE fabriquer la portée : « ne pas écrire {lignes="9"} au milieu » serait
 * lu comme une annotation sur la ligne 9. La position de la portée est définie par la GRAMMAIRE de
 * markdown-it, pas par une recherche : c'est le début du PREMIER enfant `text` du jeton `inline`
 * du paragraphe. Un `{lignes="…"}` cité ailleurs n'est jamais à cette position, et reste du texte.
 *
 * Le contrôle `startsWith` qui suit ferme le dernier écart : `jeton.content` est la source BRUTE
 * du paragraphe, `children[0].content` sa forme décodée. Un `\{lignes="1"\}` échappé par l'auteur
 * donnerait un enfant qui commence par la portée sans que la source le fasse — la note serait
 * alors refusée, jamais lue de travers.
 *
 * @param {JetonMd} jeton jeton `inline` du paragraphe
 * @param {string} code contenu de la clôture annotée, pour borner la portée
 * @param {'vulnerable' | 'corrige'} nom volet annoté, pour nommer la faute
 * @param {Contexte} ctx
 * @returns {AnnotationLigne}
 */
function lireNote(jeton, code, nom, ctx) {
  const premier = jeton.children?.[0];
  const trouve = premier?.type === 'text' ? MOTIF_PORTEE_EN_TETE.exec(premier.content) : null;
  if (trouve === null) {
    echec(
      `${ctx.nomFichier} : une note de « ::: ${nom} » n'ouvre pas par {lignes="…"} — ` +
        `« ${apercu(jeton.content)} »`,
      [
        'depuis E2-ST4 (lot B1a), CHAQUE paragraphe d’un volet est une annotation, et il doit',
        'ouvrir par sa portée : {lignes="2"} Le texte…  ({lignes="0"} = le bloc entier)',
        'un {lignes="…"} cité AU MILIEU du texte reste du texte — la portée se lit en tête, ou pas',
      ],
    );
  }
  const prefixe = trouve[0];
  if (!jeton.content.startsWith(prefixe)) {
    echec(
      `${ctx.nomFichier} : la portée en tête d'une note de « ::: ${nom} » n'est pas écrite ` +
        `telle quelle dans la source — « ${apercu(jeton.content)} »`,
      ['écrire {lignes="…"} sans échappement ni balisage, en tout début de paragraphe'],
    );
  }
  const texte = jeton.content.slice(prefixe.length).trim();
  if (texte === '') {
    echec(
      `${ctx.nomFichier} : une note de « ::: ${nom} » ne porte que sa portée « ${prefixe.trim()} »`,
      ['ajouter le texte qui explique la ou les lignes désignées, ou retirer le paragraphe'],
    );
  }
  return { lignes: lirePortee(trouve[1] ?? '', code, nom, ctx.nomFichier), texte };
}

/**
 * Lit un `::: vulnerable` ou `::: corrige` : exactement une clôture de code, puis N annotations —
 * un paragraphe = UNE note, chacune ouvrant par sa propre portée.
 *
 * ✅ LA LIMITE « 0 OU 1 ANNOTATION PAR VOLET » DU LOT A1 EST TOMBÉE ICI (lot B1a). Elle venait du
 * `.join(' ')` qui fondait toute la prose du volet en un seul `texte` : la syntaxe n'offrait qu'un
 * `{lignes="…"}` par volet, donc une seule portée à attribuer. La portée est maintenant portée par
 * la NOTE, plus par le conteneur — d'où la liste d'attributs autorisés VIDE ci-dessous.
 *
 * CE QUI EST REFUSÉ, ET POURQUOI :
 *   · un paragraphe sans portée lisible en tête — la note s'ancrerait « quelque part », ou son
 *     `{lignes="…"}` se publierait comme du texte littéral (`lireNote`) ;
 *   · `::: vulnerable {lignes="2"}`, l'ANCIENNE écriture — `lireAttributs` refuse toute clef hors
 *     de sa liste fermée, ici vide : la migration se voit, elle ne se dégrade pas en silence ;
 *   · des notes DANS LE DÉSORDRE. Trier à la place de l'auteur réordonnerait sa prose et
 *     publierait un texte qu'il n'a pas écrit dans cet ordre ; refuser nomme la faute. Deux notes
 *     citant la MÊME ligne restent admises — deux remarques distinctes sur une même ligne sont
 *     légitimes, et rien ici ne dédoublonne entre notes (`lirePortee` ne refuse le doublon qu'à
 *     l'INTÉRIEUR d'une portée) ;
 *   · tout jeton hors de `JETONS_DE_VOLET` — une liste, une citation, un titre. Ils étaient
 *     ACCEPTÉS et leur balisage JETÉ en silence jusqu'au lot B ;
 *   · une note écrite AVANT la clôture de code — le gabarit la rendrait APRÈS, donc ailleurs que
 *     là où l'auteur l'a écrite.
 *
 * @param {readonly JetonMd[]} enfants
 * @param {JetonMd} ouverture
 * @param {'vulnerable' | 'corrige'} nom
 * @param {Contexte} ctx
 * @returns {{ langage: Langage, exemple: ExempleCode }}
 */
function lireExemple(enfants, ouverture, nom, ctx) {
  const rangCloture = enfants.findIndex((j) => j.type === 'fence');
  const clotures = enfants.filter((j) => j.type === 'fence');
  const cloture = clotures[0];
  if (cloture === undefined || clotures.length !== 1) {
    echec(`${ctx.nomFichier} : « ::: ${nom} » contient ${clotures.length} bloc(s) de code`, [
      'il en faut exactement un — le code comparé',
    ]);
  }
  const langage = langageDe(cloture, ctx);
  // LISTE FERMÉE VIDE, et c'est le mécanisme même de la migration : `lignes` a QUITTÉ les
  // attributs du conteneur, donc `::: vulnerable {lignes="2"}` échoue en nommant la clef inconnue.
  lireAttributs(ouverture.info, nom, [], ctx.nomFichier);

  /** @type {AnnotationLigne[]} */
  const annotations = [];
  for (const [rang, jeton] of enfants.entries()) {
    // ⚠️ LISTE BLANCHE DE JETONS — même patron que `refuserJetonHorsPaire` un cran plus haut, et
    // même raison (constat de revue du 2026-08-18, lot B). La boucle ne ramassait QUE les jetons
    // `inline`, et ignorait tout le reste EN SILENCE : `- {lignes="2"} …` (item de liste) ou
    // `> {lignes="2"} …` (citation) étaient acceptés, leur `inline` lu comme une note, et leur
    // balisage JETÉ. L'auteur croyait publier une liste ou une citation ; il publiait de la prose,
    // sous des gates verts. Un volet n'a de place que pour UNE clôture de code et des PARAGRAPHES.
    if (!JETONS_DE_VOLET.has(jeton.type)) {
      echec(`${ctx.nomFichier} : « ::: ${nom} » ne peut contenir que du code et des paragraphes`, [
        `« ${jeton.type} » rencontré — attendu une clôture de code ou un paragraphe`,
        'une liste, une citation ou un titre y perdrait son balisage en silence :',
        'écrire chaque annotation en paragraphe simple, ouvert par sa portée {lignes="…"}',
      ]);
    }
    if (jeton.type !== 'inline') continue;
    // ⚠️ ET L'ORDRE, parce que le gabarit de `rendu-blocs.ts` place la `figure` PUIS la liste
    // d'annotations : une note écrite AVANT la clôture serait rendue APRÈS elle. Déplacer la
    // prose de l'auteur en silence est exactement ce que le refus du désordre (plus bas) existe
    // pour empêcher — le compilateur ne réordonne pas, il nomme la faute.
    if (rang < rangCloture) {
      echec(
        `${ctx.nomFichier} : une note de « ::: ${nom} » est écrite AVANT son bloc de code — ` +
          `« ${apercu(jeton.content)} »`,
        [
          'le rendu place le code PUIS ses annotations : une note écrite avant serait déplacée',
          'après lui, sans que rien ne le signale',
          'déplacer ce paragraphe sous la clôture ```',
        ],
      );
    }
    annotations.push(lireNote(jeton, cloture.content, nom, ctx));
  }

  for (let rang = 1; rang < annotations.length; rang += 1) {
    // La clef d'ordre est la PLUS PETITE ligne de la portée — `lirePortee` rend une liste triée,
    // donc son premier élément. `[0]` (le bloc entier) vaut 0, et se place donc naturellement en
    // tête : une note générale après une note de ligne est un désordre, pas un cas particulier.
    const precedente = annotations[rang - 1]?.lignes[0] ?? 0;
    const courante = annotations[rang]?.lignes[0] ?? 0;
    if (courante < precedente) {
      echec(
        `${ctx.nomFichier} : les notes de « ::: ${nom} » ne suivent pas l'ordre des lignes — ` +
          `« ${annotations[rang - 1]?.lignes.join(',') ?? ''} » puis ` +
          `« ${annotations[rang]?.lignes.join(',') ?? ''} »`,
        [
          'les annotations d’un volet se lisent dans l’ordre du code : portées croissantes,',
          '{lignes="0"} (le bloc entier) admis en tête',
          '⚠️ le compilateur ne TRIE pas à ta place : réordonner ta prose publierait un texte que',
          'tu n’as pas écrit dans cet ordre',
        ],
      );
    }
  }

  return {
    langage,
    exemple: {
      htmlColore: ctx.colorateur.colorer(cloture.content, langage, ctx.nomFichier),
      annotations,
    },
  };
}

/**
 * Refuse un jeton rencontré dans un `:::: comparaison` là où une ouverture `::: vulnerable` était
 * attendue.
 *
 * Tolérer de la prose ici reviendrait à la perdre : le contrat de `comparaison` n'a pas de place
 * pour elle. Mieux vaut le dire à l'auteur.
 *
 * 🔴 LE PRÉDICAT EST POSITIF, ET IL DOIT L'ÊTRE (`.claude/rules/security.md` §4). Il ne l'était
 * pas : `jeton.nesting === 1 || jeton.type === 'fence'` est une LISTE NOIRE, donc tout jeton de
 * `nesting 0` glissé entre deux paires était avalé EN SILENCE — mesuré avec le markdown-it du
 * dépôt, un `---` entre deux paires produit trois jetons `hr` de `nesting 0`, aucun refusé.
 * Ici RIEN n'est légitime : les fermetures d'une paire sont consommées par `trouverFermeture`,
 * après quoi l'appelant reprend à `fin + 1`. Tout ce qui atteint cette fonction est donc une
 * faute, et se nomme.
 *
 * @param {JetonMd} jeton jeton rencontré, dont le type n'est pas `container_vulnerable_open`
 * @param {string} nomFichier fichier de contenu, pour nommer la faute
 * @returns {void} ne rend jamais la main — `echec` termine le processus
 */
function refuserJetonHorsPaire(jeton, nomFichier) {
  if (jeton.type === 'container_corrige_open') {
    echec(`${nomFichier} : « ::: corrige » sans « ::: vulnerable » juste avant`);
  }
  echec(`${nomFichier} : « :::: comparaison » ne peut contenir que des paires`, [
    `« ${jeton.type} » rencontré — attendu « ::: vulnerable » puis « ::: corrige »`,
  ]);
}

/**
 * Lit UNE paire `::: vulnerable` + `::: corrige` et vérifie qu'elle est comparable : même langage
 * des deux côtés, et cohérent avec le `{langage="…"}` éventuellement annoncé sur la comparaison.
 *
 * @param {readonly JetonMd[]} enfants jetons intérieurs du `:::: comparaison`
 * @param {number} debut position de l'ouverture `container_vulnerable_open`
 * @param {JetonMd} ouvertureVulnerable jeton d'ouverture du volet vulnérable
 * @param {string | undefined} langageAnnonce valeur de `{langage="…"}` sur la comparaison
 * @param {Contexte} ctx
 * @returns {{ paire: { langage: Langage, vulnerable: ExempleCode, corrige: ExempleCode }, fin: number }}
 *   la paire lue et la position de la fermeture du volet corrigé
 */
function lirePaireVulnerableCorrige(enfants, debut, ouvertureVulnerable, langageAnnonce, ctx) {
  const finVulnerable = trouverFermeture(enfants, debut, 'vulnerable', ctx.nomFichier);
  const debutCorrige = finVulnerable + 1;
  const ouvertureCorrige = enfants[debutCorrige];
  if (ouvertureCorrige?.type !== 'container_corrige_open') {
    echec(`${ctx.nomFichier} : « ::: vulnerable » n'est pas suivi de « ::: corrige »`, [
      'chaque exemple vulnérable doit montrer sa parade immédiatement après',
    ]);
  }
  const finCorrige = trouverFermeture(enfants, debutCorrige, 'corrige', ctx.nomFichier);

  const vulnerable = lireExemple(
    enfants.slice(debut + 1, finVulnerable),
    ouvertureVulnerable,
    'vulnerable',
    ctx,
  );
  const corrige = lireExemple(
    enfants.slice(debutCorrige + 1, finCorrige),
    ouvertureCorrige,
    'corrige',
    ctx,
  );
  if (vulnerable.langage !== corrige.langage) {
    echec(`${ctx.nomFichier} : la paire compare du ${vulnerable.langage} à du ${corrige.langage}`, [
      'les deux versions doivent être écrites dans la même langue pour être comparables',
    ]);
  }
  if (langageAnnonce !== undefined && langageAnnonce !== vulnerable.langage) {
    echec(
      `${ctx.nomFichier} : « {langage="${langageAnnonce}"} » contredit les blocs, en ${vulnerable.langage}`,
    );
  }
  return {
    paire: {
      langage: vulnerable.langage,
      vulnerable: vulnerable.exemple,
      corrige: corrige.exemple,
    },
    fin: finCorrige,
  };
}

/**
 * Lit un `:::: comparaison` : une suite de paires `vulnerable` puis `corrige`.
 *
 * @param {readonly JetonMd[]} enfants
 * @param {JetonMd} ouverture
 * @param {Contexte} ctx
 * @returns {BlocContenu}
 */
function lireComparaison(enfants, ouverture, ctx) {
  const attributs = lireAttributs(ouverture.info, 'comparaison', ['langage'], ctx.nomFichier);
  const langageAnnonce = attributs['langage'];

  /** @type {Array<{ langage: Langage, vulnerable: ExempleCode, corrige: ExempleCode }>} */
  const exemples = [];
  let i = 0;
  while (i < enfants.length) {
    const jeton = enfants[i];
    if (jeton === undefined) break;
    if (jeton.type !== 'container_vulnerable_open') {
      refuserJetonHorsPaire(jeton, ctx.nomFichier);
      i += 1;
      continue;
    }

    const { paire, fin } = lirePaireVulnerableCorrige(enfants, i, jeton, langageAnnonce, ctx);
    exemples.push(paire);
    i = fin + 1;
  }

  if (exemples.length === 0) {
    echec(`${ctx.nomFichier} : « :::: comparaison » ne contient aucune paire vulnérable/corrigé`);
  }
  return { type: 'comparaison', exemples };
}

/**
 * Les conteneurs BANNIS à l'intérieur d'un volet de méthode, avec le libellé d'auteur de chacun.
 *
 * 🔴 POURQUOI CE BANNISSEMENT EST AU CONTRAT ET NON UNE PRÉFÉRENCE. Les volets d'un `methodes`
 * sont **le même résultat par deux routes** ; un exemple vulnérable et sa parade ne sont pas deux
 * routes vers le même résultat, et l'un des deux se retrouverait MASQUÉ derrière un onglet — donc
 * introuvable au `Ctrl+F` (coût R-4, assumé seulement parce que ce qui est masqué est un doublon
 * de but). Un `methodes` imbriqué, lui, est un sommaire déguisé à deux étages.
 *
 * TABLE NOMINATIVE : ce qui n'est pas prévu est nommé tel quel, jamais avalé
 * (`.claude/rules/security.md` §4).
 *
 * @type {ReadonlyMap<string, string>}
 */
const INTERDITS_DANS_UN_VOLET = new Map([
  ['container_comparaison_open', ':::: comparaison'],
  ['container_vulnerable_open', '::: vulnerable'],
  ['container_corrige_open', '::: corrige'],
  ['container_methodes_open', ':::: methodes'],
  ['container_methode_open', '::: methode'],
]);

/**
 * Refuse un jeton rencontré dans un `:::: methodes` là où une ouverture `::: methode` était
 * attendue.
 *
 * Même arbitrage, mot pour mot, que `refuserJetonHorsPaire` : tolérer de la prose ici reviendrait
 * à la perdre, puisque le contrat du conteneur n'a pas de place pour elle.
 *
 * 🔴 LE PRÉDICAT EST POSITIF, ET IL DOIT L'ÊTRE — voir `refuserJetonHorsPaire`, dont ce lot a
 * REDUPLIQUÉ la liste noire avant qu'une revue ne la mesure. AUCUN jeton n'est légitime ici : les
 * fermetures d'un volet sont consommées par `trouverFermeture`, après quoi `lireMethodes` reprend
 * à `fin + 1`. Ce qui arrive ici est donc toujours une faute, et se nomme par son `type`.
 *
 * @param {JetonMd} jeton jeton rencontré, dont le type n'est pas `container_methode_open`
 * @param {string} nomFichier
 * @returns {void} ne rend jamais la main — `echec` termine le processus
 */
function refuserJetonHorsVolet(jeton, nomFichier) {
  echec(`${nomFichier} : « :::: ${CONTENEUR_METHODES} » ne peut contenir que des volets`, [
    `« ${jeton.type} » rencontré — attendu « ::: ${CONTENEUR_VOLET} {${ATTRIBUT_LIBELLE}="…"} »`,
    'ce qu’il y aurait à dire autour des volets appartient à la théorie, hors du conteneur',
  ]);
}

/**
 * Lit UN volet `::: methode {libelle="…" defaut}`.
 *
 * @param {readonly JetonMd[]} enfants jetons intérieurs du volet
 * @param {JetonMd} ouverture jeton d'ouverture, porteur de son `info`
 * @param {Contexte} ctx
 * @returns {{ libelle: string, defaut: boolean, blocs: BlocContenu[] }}
 */
function lireVoletDeMethode(enfants, ouverture, ctx) {
  const { attributs, marqueurs } = lireAttributsEtMarqueurs(
    ouverture.info,
    CONTENEUR_VOLET,
    [ATTRIBUT_LIBELLE],
    [MARQUEUR_DEFAUT],
    ctx.nomFichier,
    ouverture.markup,
  );
  // OBLIGATOIRE ET NON VIDE, même geste que `{titre="…"}` sur la marche à suivre : `{libelle=""}`
  // passe la grammaire des paires et rendrait un onglet que rien ne nomme — ni à l'œil, ni au
  // lecteur d'écran, qui n'aurait alors qu'une radio anonyme à annoncer.
  const libelle = (attributs[ATTRIBUT_LIBELLE] ?? '').trim();
  if (libelle === '') {
    echec(
      `${ctx.nomFichier} : « ::: ${CONTENEUR_VOLET} » sans attribut « ${ATTRIBUT_LIBELLE} » non vide`,
      [
        `forme attendue : ::: ${CONTENEUR_VOLET} {${ATTRIBUT_LIBELLE}="La méthode du cours" ${MARQUEUR_DEFAUT}}`,
        'c’est le texte de l’onglet — le seul nom accessible que le volet aura',
      ],
    );
  }

  // Le balayage porte sur la liste PLATE des jetons du volet : un conteneur banni niché trois
  // niveaux plus bas y figure au même titre qu'un enfant direct.
  for (const jeton of enfants) {
    const banni = INTERDITS_DANS_UN_VOLET.get(jeton.type);
    if (banni !== undefined) {
      echec(
        `${ctx.nomFichier} : « ${banni} » dans le volet « ${libelle} » d’un « :::: ${CONTENEUR_METHODES} »`,
        [
          'un volet montre une ROUTE vers le même résultat, pas un exemple vulnérable et sa parade',
          'une comparaison s’écrit dépliée, hors du conteneur d’onglets — la moitié masquée serait introuvable',
        ],
      );
    }
  }

  return {
    libelle,
    defaut: marqueurs.includes(MARQUEUR_DEFAUT),
    blocs: construireBlocs(enfants, ctx),
  };
}

/**
 * Les TROIS bornes de cardinalité d'un `:::: methodes`, jugées une fois les volets lus.
 *
 * Isolée de `lireMethodes` pour la même raison que `causeDAttributsDEncadre` l'est de sa boucle :
 * la boucle parcourt, cette fonction juge — et chacune des trois fautes est une décision distincte.
 *
 * @param {ReadonlyArray<{ libelle: string, defaut: boolean, marque: string }>} volets dans l'ordre
 *   du document ; `marque` est le marqueur réellement écrit par l'auteur pour ce volet
 * @param {string} marqueDuConteneur `ouverture.markup` du `:::: methodes`
 * @param {string} nomFichier
 * @returns {void}
 */
function verifierBornesDesVolets(volets, marqueDuConteneur, nomFichier) {
  // SITUER LA FAUTE : dans une leçon qui porte trois jeux d'onglets, « porte 1 volet(s) » sans le
  // moindre libellé oblige l'auteur à chercher lequel des trois est visé.
  const tous = volets.map((volet) => `« ${volet.libelle} »`).join(', ');
  const situes = tous === '' ? '' : ` : ${tous}`;

  if (volets.length < VOLETS_MIN || volets.length > VOLETS_MAX) {
    /** @type {string[]} */
    const details = [
      `le contrat en admet ${VOLETS_MIN} ou ${VOLETS_MAX}`,
      'un seul volet n’est pas une comparaison ; quatre est un sommaire déguisé (ST4-1)',
    ];
    // 🔴 LA CAUSE LA PLUS FRÉQUENTE D'UN COMPTE TROP BAS N'EST PAS UN VOLET MANQUANT, C'EST UN
    // MARQUEUR TROP COURT. `markdown-it-container` referme un conteneur sur la première ligne de
    // deux-points AU MOINS AUSSI LONGUE que son ouverture : un `::: methodes` contenant des
    // `::: methode` se referme donc tout seul, et l'auteur lit « porte 1 volet(s) » alors qu'il en
    // a écrit deux. Le dire, plutôt que de le laisser deviner.
    if (
      volets.length < VOLETS_MIN &&
      volets.some((volet) => volet.marque.length <= marqueDuConteneur.length)
    ) {
      details.push(
        `« ${marqueDuConteneur} » n’est pas plus long que le marqueur d’un volet : le conteneur s’ouvre avec AU MOINS UN « : » DE PLUS que ses volets`,
      );
    }
    echec(
      `${nomFichier} : « ${marqueDuConteneur} ${CONTENEUR_METHODES} » porte ${volets.length} volet(s)${situes}`,
      details,
    );
  }

  // EXACTEMENT UN `defaut` — c'est ce qui garantit qu'un volet exactement est visible dans le HTML
  // servi, donc que « zéro volet à l'écran » n'est pas un état atteignable.
  const parDefaut = volets.filter((volet) => volet.defaut).map((volet) => volet.libelle);
  if (parDefaut.length !== 1) {
    const cites = parDefaut.map((libelle) => `« ${libelle} »`).join(', ');
    const constat =
      parDefaut.length === 0
        ? `aucun volet ne porte le marqueur « ${MARQUEUR_DEFAUT} »${situes}`
        : `${parDefaut.length} volets le portent (${cites})`;
    echec(`${nomFichier} : « ${marqueDuConteneur} ${CONTENEUR_METHODES} » — ${constat}`, [
      `exactement un volet porte « ${MARQUEUR_DEFAUT} » : c’est celui qui s’affiche sans JavaScript`,
      `forme attendue : ::: ${CONTENEUR_VOLET} {${ATTRIBUT_LIBELLE}="La méthode du cours" ${MARQUEUR_DEFAUT}}`,
    ]);
  }

  const doublon = volets.find(
    (volet, rang) => volets.findIndex((autre) => autre.libelle === volet.libelle) !== rang,
  );
  if (doublon !== undefined) {
    echec(
      `${nomFichier} : « ${marqueDuConteneur} ${CONTENEUR_METHODES} » porte deux volets nommés « ${doublon.libelle} »`,
      ['deux onglets homonymes ne se distinguent ni à l’œil ni au lecteur d’écran'],
    );
  }
}

/**
 * Lit un `:::: methodes` : une suite de 2 ou 3 volets `::: methode`, et rien d'autre.
 *
 * @param {readonly JetonMd[]} enfants
 * @param {JetonMd} ouverture
 * @param {Contexte} ctx
 * @returns {BlocContenu}
 */
function lireMethodes(enfants, ouverture, ctx) {
  // Le conteneur lui-même n'admet AUCUN attribut : tout ce qui se déclare se déclare sur un volet.
  // `lireAttributs` refuse NOMMÉMENT toute clef, et le résidu reste illisible faute de marqueur
  // déclaré ici — `defaut` posé sur le conteneur plutôt que sur un volet est donc une faute nommée.
  lireAttributs(ouverture.info, CONTENEUR_METHODES, [], ctx.nomFichier, ouverture.markup);

  /** @type {{ libelle: string, defaut: boolean, blocs: BlocContenu[], marque: string }[]} */
  const volets = [];
  let i = 0;
  while (i < enfants.length) {
    const jeton = enfants[i];
    if (jeton === undefined) break;
    if (jeton.type !== `container_${CONTENEUR_VOLET}_open`) {
      refuserJetonHorsVolet(jeton, ctx.nomFichier);
      i += 1;
      continue;
    }
    const fin = trouverFermeture(enfants, i, CONTENEUR_VOLET, ctx.nomFichier);
    volets.push({
      ...lireVoletDeMethode(enfants.slice(i + 1, fin), jeton, ctx),
      marque: jeton.markup,
    });
    i = fin + 1;
  }

  verifierBornesDesVolets(volets, ouverture.markup, ctx.nomFichier);
  // `marque` ne sert QU'aux messages de refus : elle ne franchit pas la frontière du contrat, et
  // la reconstruction est NOMINATIVE — un `...volet` y laisserait entrer tout champ futur.
  return {
    type: 'methodes',
    volets: volets.map((volet) => ({
      libelle: volet.libelle,
      defaut: volet.defaut,
      blocs: volet.blocs,
    })),
  };
}

/**
 * Nomme, en français, le jeton qu'une étape ne devrait pas porter.
 *
 * Une TABLE NOMINATIVE, et un repli qui cite le type brut : ce qui n'est pas prévu est nommé tel
 * quel, jamais avalé (`.claude/rules/security.md` §4). Un « jeton inattendu » sans nom enverrait
 * l'auteur relire toute sa marche à suivre.
 *
 * @param {string} type type du jeton markdown-it
 * @returns {string}
 */
function libelleDeJetonDEtape(type) {
  if (type.startsWith('heading_')) return 'un titre';
  if (type === 'bullet_list_open' || type === 'ordered_list_open') return 'une liste imbriquée';
  if (type === 'paragraph_open') return 'un second paragraphe';
  if (type === 'blockquote_open') return 'une citation';
  if (type === 'table_open') return 'un tableau';
  if (type === 'hr') return 'un filet horizontal';
  if (/^container_.+_open$/.test(type)) return 'un conteneur imbriqué';
  return `un jeton « ${type} »`;
}

/**
 * Blanchit les segments de `code en ligne`, SUR PLACE et à longueur égale.
 *
 * 🔴 POURQUOI L'AMORCE `{voir=` NE SE CHERCHE PAS SUR LA SOURCE BRUTE. Ce dépôt écrit des leçons
 * SUR SON PROPRE PIPELINE : une étape qui DOCUMENTE la syntaxe du renvoi, en la citant entre
 * accents graves au milieu de sa phrase, déclenchait « le renvoi n'est pas en TÊTE » sur du
 * contenu parfaitement légitime. C'est le sur-refus de S-015 — le contenu le plus certain de faire
 * mordre un garde-fou par motif est la leçon qui enseigne le motif surveillé. La MENTION n'est pas
 * l'USAGE (famille L-043).
 *
 * ⚠️ Jumelle de `blanchirCodeEnLigne` dans `valider.mjs`, dupliquée pour la même raison que les
 * deux listes fermées de conteneurs : le validateur tourne AVANT le compilateur et ne doit pas
 * l'importer. La longueur est préservée, donc un `slice` calculé sur la source reste valide ici.
 *
 * @param {string} texte
 * @returns {string} la même chaîne, ses segments entre accents graves remplacés par des espaces
 */
function blanchirCodeEnLigne(texte) {
  return texte.replace(/`+[^`]*`+/g, (m) => ' '.repeat(m.length));
}

/**
 * Lit le RENVOI d'une étape — `{voir="…"}`, écrit LITTÉRALEMENT en tête de l'item.
 *
 * 🔴 LE RENVOI DÉSIGNE UN TITRE PAR SON TEXTE, JAMAIS PAR SON ANCRE. L'ancre est fabriquée par
 * `ancrer` (qui suffixe en cas de collision) : un auteur qui écrirait `#les-commandes` poserait un
 * littéral fragile, qui casserait EN SILENCE au premier renommage. `ancre` est donc laissée vide
 * ici, et remplie par `resoudreRenvoisDeSection` une fois TOUS les titres de la leçon connus — la
 * marche à suivre est en tête de leçon et cite couramment une section située plus bas.
 *
 * @param {string} source texte BRUT du paragraphe de l'étape (jeton `inline`)
 * @param {string} situe où l'erreur se lit, déjà rédigé
 * @param {Contexte} ctx
 * @returns {{ renvoi: NonNullable<EtapeMarche['renvoi']> | null, phrase: string }}
 */
function lireRenvoiDEtape(source, situe, ctx) {
  // L'amorce se cherche HORS du `code en ligne` — voir `blanchirCodeEnLigne`.
  const horsCode = blanchirCodeEnLigne(source);
  const tete = MOTIF_VOIR_EN_TETE.exec(source);
  if (tete === null) {
    if (source.startsWith('{')) {
      echec(`${ctx.nomFichier} : ${situe} — bloc d'attributs illisible en tête`, [
        `seule la forme {${ATTRIBUT_VOIR}="…"} est acceptée, guillemets droits compris`,
      ]);
    }
    if (horsCode.includes(AMORCE_VOIR)) {
      echec(`${ctx.nomFichier} : ${situe} — le renvoi n'est pas en TÊTE de l'étape`, [
        `« ${AMORCE_VOIR}…"} » s'écrit littéralement au début de l'item, avant la phrase`,
        'même position imposée que {lignes="…"} sur une annotation',
      ]);
    }
    return { renvoi: null, phrase: source.trim() };
  }

  const valeur = (tete[1] ?? '').trim();
  const phrase = source.slice(tete[0].length).trim();
  if (horsCode.slice(tete[0].length).includes(AMORCE_VOIR)) {
    echec(`${ctx.nomFichier} : ${situe} — deux renvois sur la même étape`, [
      'une étape porte AU PLUS un renvoi ; deux destinations valent deux étapes',
    ]);
  }
  if (valeur === '') {
    echec(`${ctx.nomFichier} : ${situe} — renvoi vide`, [
      `{${ATTRIBUT_VOIR}=""} ne désigne rien — citer un titre de section, ou « ${PREFIXE_MODULE}<slug> »`,
    ]);
  }
  if (!valeur.startsWith(PREFIXE_MODULE)) {
    // `ancre` est délibérément VIDE à cet instant — voir l'en-tête de cette fonction.
    return { renvoi: { cible: 'section', titre: valeur, ancre: '' }, phrase };
  }
  const slug = valeur.slice(PREFIXE_MODULE.length).trim();
  if (slug === '') {
    echec(`${ctx.nomFichier} : ${situe} — « ${PREFIXE_MODULE} » sans slug`, [
      `forme attendue : {${ATTRIBUT_VOIR}="${PREFIXE_MODULE}02-environnement-linux"}`,
    ]);
  }
  return { renvoi: { cible: 'module', slug }, phrase };
}

/**
 * Lit UNE étape : une phrase impérative, puis AU PLUS un bloc de code clôturé.
 *
 * 🔴 CE QUI N'EST PAS ADMIS EST REFUSÉ EN SE NOMMANT — liste blanche NOMINATIVE de jetons, même
 * patron que `resoudreExerciceDuCours` (`.claude/rules/security.md` §4, familles S-003/S-009/S-014).
 * Un titre, une liste imbriquée ou un second paragraphe avalés en silence feraient d'un résumé
 * actionnable une seconde théorie, ce que le conteneur existe précisément pour empêcher.
 *
 * ⚠️ « IMPÉRATIVE » N'EST PAS VÉRIFIÉ, ET NE PEUT PAS L'ÊTRE. Ce qui est vérifiable est que
 * l'étape PORTE une phrase, et c'est ce qui est exigé. Le mode de la phrase relève de la relecture
 * éditoriale, jamais d'un gate — écrire ici un détecteur d'impératif rendrait des refus faux sur du
 * français correct, ce qui pousserait l'auteur à contourner le garde-fou.
 *
 * @param {readonly JetonMd[]} contenu jetons intérieurs de l'item, hors `list_item_open`/`_close`
 * @param {number} rang numéro d'étape, en base 1 — c'est ce que l'auteur voit à l'écran
 * @param {Contexte} ctx
 * @returns {EtapeMarche}
 */
function lireEtape(contenu, rang, ctx) {
  // ⚠️ L'ESPACE DE « n° 1 » EST UNE U+00A0 INSÉCABLE, ÉCRITE EN ÉCHAPPEMENT — même geste, même
  // raison que `resoudreExerciceDuCours` : une fin de ligne qui couperait entre « n° » et son
  // chiffre laisserait une abréviation qui ne désigne plus rien. U+00A0 et rien d'autre.
  const situe = `« :::: ${CONTENEUR_MARCHE} », étape n°\u00A0${rang}`;
  const phraseInline = contenu[1];
  if (
    contenu[0]?.type !== 'paragraph_open' ||
    phraseInline?.type !== 'inline' ||
    contenu[2]?.type !== 'paragraph_close'
  ) {
    echec(`${ctx.nomFichier} : ${situe} ne s'ouvre pas par une phrase`, [
      'une étape s’écrit : une phrase impérative, puis AU PLUS un bloc de code clôturé',
      'docs/contenu/pipeline-contenu.md, section « Le conteneur marche-a-suivre »',
    ]);
  }

  const { renvoi, phrase } = lireRenvoiDEtape(phraseInline.content, situe, ctx);
  if (phrase === '') {
    echec(`${ctx.nomFichier} : ${situe} — étape sans phrase`, [
      'un renvoi seul ne dit pas ce qu’il faut FAIRE — le résumé doit rester actionnable',
    ]);
  }

  /** @type {EtapeMarche} */
  // `renderInline` et non `render` : la phrase est rendue SANS `<p>`, le rendu (lot 4) l'enveloppe
  // dans son `<li>`. Et c'est la SOURCE amputée de son bloc `{voir="…"}` qui est re-rendue, jamais
  // le HTML découpé après coup : chercher un motif dans une chaîne qui contient du texte d'auteur
  // est exactement ce que S-014 refuse.
  const etape = { html: ctx.md.renderInline(phrase, {}).trim() };

  /** @type {EtapeMarche['code']} */
  let code;
  for (let i = 3; i < contenu.length; i += 1) {
    const jeton = contenu[i];
    if (jeton === undefined) continue;
    if (jeton.type !== 'fence') {
      echec(`${ctx.nomFichier} : ${situe} porte ${libelleDeJetonDEtape(jeton.type)}`, [
        'une étape n’admet qu’une phrase et au plus un bloc de code clôturé',
        'le jour où une étape a besoin de plus, elle appartient à la théorie — c’est à ça que sert {voir="…"}',
      ]);
    }
    if (code !== undefined) {
      echec(`${ctx.nomFichier} : ${situe} porte un DEUXIÈME bloc de code`, [
        'une étape en admet au plus un ; deux commandes distinctes valent deux étapes',
      ]);
    }
    const bloc = blocDeCloture(jeton, ctx);
    if (bloc.type !== 'code') {
      echec(`${ctx.nomFichier} : ${situe} porte un bloc « mermaid »`, [
        'une étape montre une commande, pas un diagramme — le diagramme vit dans la théorie',
      ]);
    }
    code = { langage: bloc.langage, htmlColore: bloc.htmlColore };
  }

  if (code !== undefined) etape.code = code;
  if (renvoi !== null) etape.renvoi = renvoi;
  return etape;
}

/**
 * Trouve la fermeture de l'item ouvert en `ouverture`, en comptant la PROFONDEUR.
 *
 * Un compteur et non « le prochain `list_item_close` » : une liste imbriquée en produit un avant
 * celui de l'item courant. Elle sera refusée par `lireEtape`, mais elle doit d'abord être remise à
 * la bonne étape — sans quoi le message nommerait le mauvais numéro.
 *
 * @param {readonly JetonMd[]} jetons
 * @param {number} ouverture index du `list_item_open`
 * @param {number} borne index exclusif de fin de recherche
 * @param {Contexte} ctx
 * @returns {number} index du `list_item_close` apparié
 */
function finDeListItem(jetons, ouverture, borne, ctx) {
  let profondeur = 0;
  for (let i = ouverture; i < borne; i += 1) {
    const type = jetons[i]?.type;
    if (type === 'list_item_open') profondeur += 1;
    else if (type === 'list_item_close') {
      profondeur -= 1;
      if (profondeur === 0) return i;
    }
  }
  return echec(`${ctx.nomFichier} : « :::: ${CONTENEUR_MARCHE} » — item de liste non refermé`);
}

/**
 * Lit un `:::: marche-a-suivre` : un titre obligatoire, puis UNE liste ordonnée d'étapes.
 *
 * @param {readonly JetonMd[]} enfants
 * @param {JetonMd} ouverture
 * @param {Contexte} ctx
 * @returns {BlocContenu}
 */
function lireMarcheASuivre(enfants, ouverture, ctx) {
  const attributs = lireAttributs(
    ouverture.info,
    CONTENEUR_MARCHE,
    [ATTRIBUT_TITRE],
    ctx.nomFichier,
  );
  // OBLIGATOIRE ET NON VIDE, même geste que `{source="…"}` sur une correction du cours : `{titre=""}`
  // passe la grammaire des paires et rendrait une liste que rien n'annonce — or c'est ce titre qu'un
  // lecteur d'écran lit AVANT la liste (contrat, section « Le conteneur marche-a-suivre »).
  const titre = (attributs[ATTRIBUT_TITRE] ?? '').trim();
  if (titre === '') {
    echec(
      `${ctx.nomFichier} : « :::: ${CONTENEUR_MARCHE} » sans attribut « ${ATTRIBUT_TITRE} » non vide`,
      [
        `forme attendue : :::: ${CONTENEUR_MARCHE} {${ATTRIBUT_TITRE}="Monter l'environnement LAMP local"}`,
        'il nomme la tâche que la marche accomplit — c’est lui qu’un lecteur d’écran annonce',
      ],
    );
  }

  const fin = enfants.length - 1;
  if (enfants[0]?.type !== 'ordered_list_open' || enfants[fin]?.type !== 'ordered_list_close') {
    echec(`${ctx.nomFichier} : « :::: ${CONTENEUR_MARCHE} » ne porte pas QU'une liste ordonnée`, [
      'le conteneur ne contient rien d’autre : ni prose d’introduction, ni liste à puces, ni encadré',
      'ce qu’il y aurait à dire autour des étapes appartient à la théorie',
    ]);
  }

  /** @type {EtapeMarche[]} */
  const etapes = [];
  let i = 1;
  while (i < fin) {
    if (enfants[i]?.type !== 'list_item_open') {
      // LE MESSAGE S'ADRESSE À UN AUTEUR DE CONTENU, pas à qui lit ce fichier. Le type brut d'un
      // jeton markdown-it (`ordered_list_close`, ou la chaîne vide si la liste finit court) ne dit
      // rien à personne : le rang de la DERNIÈRE étape lue situe la faute dans la marche, et le
      // détail dit la règle. Même forme à deux lignes que tous les refus voisins.
      const apres =
        etapes.length === 0
          ? 'avant la première étape'
          : `après l’étape n°\u00A0${etapes.length}`;
      echec(
        `${ctx.nomFichier} : « :::: ${CONTENEUR_MARCHE} » — ${libelleDeJetonDEtape(enfants[i]?.type ?? '')} ${apres}`,
        [
          'le conteneur ne contient QU’une liste ordonnée : rien ne s’écrit entre deux items',
          'ce qu’il y aurait à dire autour des étapes appartient à la théorie',
        ],
      );
    }
    const finItem = finDeListItem(enfants, i, fin, ctx);
    etapes.push(lireEtape(enfants.slice(i + 1, finItem), etapes.length + 1, ctx));
    i = finItem + 1;
  }

  if (etapes.length === 0) {
    echec(`${ctx.nomFichier} : « :::: ${CONTENEUR_MARCHE} » ne contient aucune étape`);
  }
  return { type: 'marche-a-suivre', titre, etapes };
}

/**
 * Reconnaît une ANCRE DE COMPOSANT : un paragraphe qui ne contient que `[[quiz]]` ou
 * `[[simulation]]`, et rien d'autre.
 *
 * L'exigence « rien d'autre » est le contrat : un paragraphe qui mêlerait `[[quiz]]` à de la prose
 * reste de la prose, et l'ancre y sera rendue littéralement — visible pour l'auteur, plutôt que
 * silencieusement avalée.
 *
 * @param {readonly JetonMd[]} jetons
 * @param {number} i position du jeton examiné
 * @returns {BlocContenu | null} le bloc d'ancre, ou `null` si ce n'en est pas une
 */
function lireAncreDeComposant(jetons, i) {
  if (jetons[i]?.type !== 'paragraph_open') return null;
  const contenu = jetons[i + 1];
  const fermeture = jetons[i + 2];
  if (fermeture?.type !== 'paragraph_close') return null;
  const texte = contenu?.type === 'inline' ? contenu.content.trim() : null;
  if (texte === '[[quiz]]') return { type: 'ancre-quiz' };
  if (texte === '[[simulation]]') return { type: 'ancre-simulation' };
  return null;
}

/**
 * Classe un conteneur `:::` ouvert : comparaison, encadré de la liste fermée, ou faute.
 *
 * `vulnerable` et `corrige` n'existent qu'appariés dans une comparaison — les rencontrer ici veut
 * dire qu'ils ont été écrits seuls, et c'est un échec nommé, pas un silence.
 *
 * @param {readonly JetonMd[]} enfants jetons intérieurs du conteneur
 * @param {JetonMd} ouverture jeton d'ouverture, porteur de son `info` (attributs)
 * @param {string} nom nom du conteneur, extrait de `container_<nom>_open`
 * @param {Contexte} ctx
 * @returns {BlocContenu}
 */
function classerConteneurOuvert(enfants, ouverture, nom, ctx) {
  if (nom === 'comparaison') return lireComparaison(enfants, ouverture, ctx);
  if (nom === CONTENEUR_MARCHE) return lireMarcheASuivre(enfants, ouverture, ctx);
  if (nom === CONTENEUR_METHODES) return lireMethodes(enfants, ouverture, ctx);
  // Un volet rencontré ICI a été écrit SEUL : `lireMethodes` consomme les siens et ne repasse
  // jamais par cette fonction pour eux. Même refus nommé que `::: corrige` hors d'une comparaison
  // — sans lui, le message générique du dessous parlerait de comparaison, donc de la mauvaise
  // faute, et enverrait l'auteur chercher un conteneur qu'il n'a pas écrit.
  if (nom === CONTENEUR_VOLET) {
    echec(`${ctx.nomFichier} : « ::: ${CONTENEUR_VOLET} » hors d’un « :::: ${CONTENEUR_METHODES} »`, [
      `un volet n’existe qu’à l’intérieur du conteneur d’onglets, entre ${VOLETS_MIN} et ${VOLETS_MAX} frères`,
    ]);
  }
  if (!ENCADRES.has(nom)) {
    echec(`${ctx.nomFichier} : « ::: ${nom} » hors d'un « :::: comparaison »`, [
      'vulnerable et corrige n’existent qu’appariés, à l’intérieur d’une comparaison',
    ]);
  }
  const variante = /** @type {VarianteEncadre} */ (nom);

  // La liste de clefs vient de la MATRICE, jamais d'un `if` : `source` sur `::: cours`, `diapos`
  // sur `::: complement` sont refusés NOMMÉMENT par `lireAttributs` au lieu d'être avalés. Un
  // attribut ignoré en silence serait un auteur qui croit sourcer — ou renvoyer à une diapositive —
  // et ne renvoie à rien.
  const attributs = lireAttributs(
    ouverture.info,
    nom,
    ATTRIBUTS_ADMIS_PAR_VARIANTE.get(variante) ?? [],
    ctx.nomFichier,
  );
  const renvoiCours = lireRenvoiAuCours(`::: ${variante}`, attributs, ctx);

  if (variante === VARIANTE_EXERCICE) {
    /** @type {Extract<BlocContenu, { variante: 'exercice-du-cours' }>} */
    const exercice = {
      type: 'encadre',
      variante,
      exerciceDuCours: resoudreExerciceDuCours(attributs, ctx),
      // LE CORPS EST LA PISTE DE RÉSOLUTION, JAMAIS L'ÉNONCÉ (§6.2). Un corps VIDE est admis —
      // certains exercices se passent d'indice — et il sort alors en tableau vide, pas en absence.
      blocs: construireBlocs(enfants, ctx),
    };
    if (renvoiCours !== null) exercice.renvoiCours = renvoiCours;
    return exercice;
  }

  if (variante !== VARIANTE_SOURCEE) {
    /** @type {Extract<BlocContenu, { type: 'encadre' }>} */
    const encadre = { type: 'encadre', variante, blocs: construireBlocs(enfants, ctx) };
    // Posé seulement s'il existe, jamais à `undefined` — même geste que `section` et `simulation`.
    if (renvoiCours !== null) encadre.renvoiCours = renvoiCours;
    return encadre;
  }

  // OBLIGATOIRE ET NON VIDE. `{source=""}` passe `lireAttributs` (la forme est correcte) et
  // rendrait un encadré qui ACCUSE le cours sans rien citer — le défaut grave nommé par
  // `.claude/rules/contenu-pedagogique.md` §6. Le validateur porte la même règle, en amont ;
  // celle-ci est le filet du compilateur, qui ne suppose pas que le validateur a tourné.
  const source = (attributs[ATTRIBUT_SOURCE] ?? '').trim();
  if (source === '') {
    echec(
      `${ctx.nomFichier} : « ::: ${VARIANTE_SOURCEE} » sans attribut « ${ATTRIBUT_SOURCE} » non vide`,
      [
        `forme attendue : ::: ${VARIANTE_SOURCEE} {${ATTRIBUT_SOURCE}="OWASP Top 10 2021 — A02"}`,
        'une correction du cours doit citer la source qui l’autorise, datée quand elle est périssable',
      ],
    );
  }
  /** @type {Extract<BlocContenu, { type: 'encadre' }>} */
  const correction = { type: 'encadre', variante, source, blocs: construireBlocs(enfants, ctx) };
  if (renvoiCours !== null) correction.renvoiCours = renvoiCours;
  return correction;
}

/**
 * RÉSOUT l'exercice cité par un `::: exercice-du-cours {ref="…"}` depuis le registre du sujet.
 *
 * 🔴 L'ÉNONCÉ N'EST JAMAIS ÉCRIT PAR LE MODULE — il est LU dans `exercices.json` (§6.1). C'est ce
 * qui empêche deux modules de raconter deux versions du même exercice, et c'est pourquoi la
 * résolution vit ici : l'auteur n'écrit qu'une référence, le compilateur pose le reste.
 *
 * 🔴 TOUTE RÉFÉRENCE ABSENTE DU REGISTRE FAIT ÉCHOUER LA CONSTRUCTION EN SE NOMMANT, et le message
 * énumère ce que la séance déclare vraiment — liste blanche NOMINATIVE, `.claude/rules/security.md`
 * §4 (familles S-003/S-009/S-014). Un encadré retiré en silence serait un exercice du cours que
 * l'étudiant ne verrait jamais, sur une page qui a l'air complète. Le validateur porte la même
 * règle en amont ; ce filet-ci ne suppose pas qu'il a tourné.
 *
 * @param {Readonly<Record<string, string>>} attributs déjà restreints aux clefs admises
 * @param {Contexte} ctx
 * @returns {{ seance: number, reference: string, libelle: string, titre: string, enonce: string }}
 */
function resoudreExerciceDuCours(attributs, ctx) {
  const reference = (attributs[ATTRIBUT_REF] ?? '').trim();
  if (reference === '') {
    echec(`${ctx.nomFichier} : « ::: ${VARIANTE_EXERCICE} » sans attribut « ${ATTRIBUT_REF} » non vide`, [
      `forme attendue : ::: ${VARIANTE_EXERCICE} {${ATTRIBUT_SEANCE}="2" ${ATTRIBUT_REF}="8"}`,
      'un exercice se cite par sa référence au registre — son énoncé ne se recopie jamais dans un module',
    ]);
  }

  const seanceBrute = attributs[ATTRIBUT_SEANCE];
  // La grammaire de `seance` est déjà jugée par `lireRenvoiAuCours`, qui s'exécute AVANT et
  // échoue sur une valeur mal écrite : ce qui reste ici est « déclarée » ou « héritée ».
  const seance = seanceBrute === undefined ? ctx.seanceDuModule : Number(seanceBrute);
  if (seance === null || !Number.isInteger(seance)) {
    echec(
      `${ctx.nomFichier} : « ::: ${VARIANTE_EXERCICE} » ne se rattache à aucune séance`,
      [
        `le frontmatter de ce module n'a pas de « ${ATTRIBUT_SEANCE} » — l'attribut « ${ATTRIBUT_SEANCE} » devient obligatoire sur cet encadré`,
      ],
    );
  }

  if (ctx.exercices === null) {
    echec(
      `${ctx.nomFichier} : « ::: ${VARIANTE_EXERCICE} {${ATTRIBUT_REF}="${reference}"} » sans registre`,
      [`la racine de ce module ne porte aucun « ${FICHIER_EXERCICES} » — l'énoncé ne se résout contre rien`],
    );
  }
  const feuille = ctx.exercices.parSeance.get(seance);
  if (feuille === undefined) {
    echec(
      `${ctx.nomFichier} : « ::: ${VARIANTE_EXERCICE} » cite la séance ${seance}, absente de « ${FICHIER_EXERCICES} »`,
      [`séances au registre : ${[...ctx.exercices.parSeance.keys()].join(', ') || '(aucune)'}`],
    );
  }
  const entree = feuille.get(reference);
  if (entree === undefined) {
    echec(
      `${ctx.nomFichier} : « ${ATTRIBUT_REF}="${reference}" » inconnue de la séance ${seance} de « ${FICHIER_EXERCICES} »`,
      [`références déclarées : ${[...feuille.keys()].join(', ')}`],
    );
  }

  // LE LIBELLÉ EST CALCULÉ ICI, ET NULLE PART AILLEURS (§6.1). Le rendu reçoit une chaîne prête —
  // une seconde implémentation de « que veut dire une référence nommée » finirait par en dire
  // autre chose, exactement comme pour le dépliage des plages de `diapos`.
  // ⚠️ L'ESPACE DE « n° 8 » EST UNE U+00A0 INSÉCABLE, PAS UNE ESPACE ORDINAIRE. Sans elle, une fin
  // de ligne peut couper entre « n° » et son chiffre, et l'abréviation seule ne désigne plus rien.
  // U+00A0 et RIEN D'AUTRE : U+202F (fine insécable) est ABSENTE de Fraunces comme d'Inter, et
  // U+2009 n'est portée que par Inter — contrainte matérielle d'E1-ST1-B, pas un goût typographique
  // (`.claude/rules/contenu-pedagogique.md` §3, `docs/design/polices.md`).
  const libelle = REFERENCE_NUMERIQUE.test(reference) ? `n°\u00A0${reference}` : entree.titre;
  return { seance, reference, libelle, titre: entree.titre, enonce: entree.enonce };
}

/**
 * Lit le RENVOI AU COURS d'un encadré — `{diapos="…"}` et/ou `{seance="…"}`, plages DÉPLIÉES.
 *
 * 🔴 ON DÉCOUPE, PUIS ON VALIDE CHAQUE JETON CONTRE UNE GRAMMAIRE TOTALE. Même geste, mêmes
 * bornes et mêmes refus que `analyserDiapos` dans `valider.mjs` — famille S-003/S-009/S-014 de
 * `.claude/rules/security.md` §4 : sur un format structuré, on analyse, on ne cherche pas un motif
 * « qui a l'air bon ». Ce filet-ci ne suppose pas que le validateur a tourné ; il échoue en
 * nommant le jeton fautif, comme lui.
 *
 * ⚠️ LES PLAGES SONT DÉPLIÉES ICI, ET NULLE PART AILLEURS (contrat §4 d'`ancrage-au-cours.md`).
 * Le rendu reçoit `[45, 46, 47, 48, 49, 50]` et n'a plus à connaître la grammaire d'auteur — une
 * seconde implémentation de « ce que veut dire 45-50 » finirait par en dire autre chose.
 *
 * @param {string} libelle ce que l'auteur a écrit (« ::: cours », « ## Les commandes »). C'était
 *   la `variante` d'encadré jusqu'au §3bis ; un titre de section porte désormais le même renvoi,
 *   et un message qui lui parlerait de « ::: » l'enverrait chercher un conteneur inexistant.
 * @param {Readonly<Record<string, string>>} attributs déjà restreints aux clefs admises
 * @param {Contexte} ctx
 * @returns {{ seance: number, diapos: number[], cours?: string } | null} `cours` porte le CODE
 *   RÉSOLU (`420-4P2-HU`), lu dans l'horaire du sujet cité — jamais le nom de dossier de l'auteur
 */
function lireRenvoiAuCours(libelle, attributs, ctx) {
  const diaposBrutes = attributs[ATTRIBUT_DIAPOS];
  const seanceBrute = attributs[ATTRIBUT_SEANCE];
  // `cours` est lu avec les deux autres : sans lui dans ce garde, un renvoi qui ne porterait que
  // lui rendrait `null` — donc « pas de renvoi » — et l'attribut serait avalé en silence.
  const coursBrut = attributs[ATTRIBUT_COURS];
  if (diaposBrutes === undefined && seanceBrute === undefined && coursBrut === undefined) {
    return null;
  }

  const diapos = deplierDiapos(diaposBrutes, ctx);

  // LA GRAMMAIRE DU NUMÉRO SE JUGE AVANT LE PARTAGE DES CHEMINS : elle est la même pour un renvoi
  // intra-sujet et pour un renvoi inter-cours, et une seconde copie du message finirait par en
  // dire autre chose.
  if (seanceBrute !== undefined && !/^[1-9]\d?$/.test(seanceBrute)) {
    echec(
      `${ctx.nomFichier} : « ${ATTRIBUT_SEANCE}="${seanceBrute}" » n'est pas un numéro de séance`,
      ['entier de 1 à 99, sans zéro de tête'],
    );
  }

  // LE RENVOI INTER-COURS PART ICI ET NE REDESCEND PAS : sa séance ne s'hérite pas du frontmatter
  // (elle appartiendrait à CE cours-ci) et se confronte à l'horaire de l'AUTRE sujet.
  if (coursBrut !== undefined) {
    const resolu = resoudreRenvoiInterCours(libelle, coursBrut, seanceBrute, ctx);
    return { seance: resolu.seance, diapos, cours: resolu.code };
  }

  let seance = ctx.seanceDuModule;
  if (seanceBrute !== undefined) {
    seance = Number(seanceBrute);
  }
  if (seance === null) {
    echec(
      `${ctx.nomFichier} : « ${libelle} » porte un renvoi au cours sans séance à laquelle le rattacher`,
      [
        `le frontmatter de ce module n'a pas de « ${ATTRIBUT_SEANCE} » — l'attribut « ${ATTRIBUT_SEANCE} » devient obligatoire sur ce renvoi`,
      ],
    );
  }
  return { seance, diapos };
}

/**
 * Découpe la valeur de `diapos` en jetons, valide chacun contre la grammaire TOTALE, et rend la
 * liste DÉPLIÉE. Séparée de `lireRenvoiAuCours` pour la même raison que dans `valider.mjs` : la
 * boucle parcourt, `refuserLeJetonDeDiapos` juge.
 *
 * @param {string | undefined} valeur
 * @param {Contexte} ctx
 * @returns {number[]} vide quand l'attribut est ABSENT — `{seance="5"}` seul est une forme légale
 */
function deplierDiapos(valeur, ctx) {
  /** @type {number[]} */
  const diapos = [];
  if (valeur === undefined) return diapos;
  let precedent = 0;
  for (const brut of valeur.split(',')) {
    const jeton = brut.trim();
    if (jeton === '') {
      echec(`${ctx.nomFichier} : jeton VIDE dans « ${ATTRIBUT_DIAPOS}="${valeur}" »`, [
        'deux virgules qui se suivent, ou une virgule en bout de liste',
      ]);
    }
    const { debut, fin } = lireUnJetonDeDiapos(jeton, precedent, valeur, ctx);
    for (let n = debut; n <= fin; n += 1) diapos.push(n);
    precedent = fin;
  }
  return diapos;
}

/**
 * La grammaire TOTALE d'UN jeton — « N » ou « N-M », décimal, sans zéro de tête ni signe, ancrée
 * aux deux bouts. Tout ce qui n'est pas exactement l'une des deux formes fait ÉCHOUER la
 * construction en se nommant. Mêmes refus, mêmes bornes que `analyserUnJetonDeDiapos` dans
 * `valider.mjs` — ce filet-ci ne suppose pas que le validateur a tourné.
 *
 * @param {string} jeton déjà rogné, jamais vide
 * @param {number} precedent borne haute du jeton précédent (0 pour le premier)
 * @param {string} valeur la liste entière, citée dans le message
 * @param {Contexte} ctx
 * @returns {{ debut: number, fin: number }}
 */
function lireUnJetonDeDiapos(jeton, precedent, valeur, ctx) {
  const decoupe = /^([1-9]\d*)(?:-([1-9]\d*))?$/.exec(jeton);
  if (decoupe === null) {
    echec(
      `${ctx.nomFichier} : jeton « ${jeton} » illisible dans « ${ATTRIBUT_DIAPOS}="${valeur}" »`,
      ["un jeton s'écrit « N » ou « N-M », en chiffres décimaux, sans zéro de tête"],
    );
  }
  const debut = Number(decoupe[1]);
  const estUnePlage = decoupe[2] !== undefined;
  const fin = estUnePlage ? Number(decoupe[2]) : debut;
  if (estUnePlage && fin <= debut) {
    echec(`${ctx.nomFichier} : plage « ${jeton} » — une plage s'écrit « N-M » avec N < M`);
  }
  if (fin > DIAPO_MAX || fin - debut + 1 > AMPLITUDE_MAX_PLAGE) {
    echec(`${ctx.nomFichier} : jeton « ${jeton} » hors des bornes admises`, [
      `numéro maximum ${DIAPO_MAX}, amplitude maximale d'une plage ${AMPLITUDE_MAX_PLAGE}`,
    ]);
  }
  if (debut <= precedent) {
    echec(
      `${ctx.nomFichier} : jeton « ${jeton} » — les jetons de « ${ATTRIBUT_DIAPOS} » sont STRICTEMENT croissants`,
      [`${precedent} le précède`],
    );
  }
  return { debut, fin };
}

/**
 * Construit la liste de blocs d'une suite de jetons — appelée pour une section, puis récursivement
 * pour le contenu de chaque encadré.
 *
 * @param {readonly JetonMd[]} jetons
 * @param {Contexte} ctx
 * @returns {BlocContenu[]}
 */
function construireBlocs(jetons, ctx) {
  /** @type {BlocContenu[]} */
  const blocs = [];
  /** @type {JetonMd[]} */
  let tampon = [];

  const viderTampon = () => {
    if (tampon.length === 0) return;
    const html = ctx.md.renderer.render(tampon, ctx.md.options, {}).trim();
    tampon = [];
    if (html !== '') blocs.push({ type: 'prose', html });
  };

  // Boucle `while` et non `for` : le pas N'EST PAS de 1. Une ancre `[[quiz]]` consomme trois
  // jetons (ouverture/inline/fermeture) et un conteneur `:::` consomme tout jusqu'à SA fermeture —
  // ces sauts sont délibérés, le contenu déjà absorbé ne doit pas être relu. Réaffecter le
  // compteur d'un `for` masquait cette mécanique derrière un en-tête qui annonce `i += 1` (S2310) ;
  // ici chaque branche déclare elle-même de combien elle avance.
  let i = 0;
  while (i < jetons.length) {
    const jeton = jetons[i];
    if (jeton === undefined) {
      i += 1;
      continue;
    }

    if (jeton.type === 'fence') {
      viderTampon();
      blocs.push(blocDeCloture(jeton, ctx));
      i += 1;
      continue;
    }

    const ancre = lireAncreDeComposant(jetons, i);
    if (ancre !== null) {
      viderTampon();
      blocs.push(ancre);
      i += 3;
      continue;
    }

    const ouverture = /^container_(.+)_open$/.exec(jeton.type);
    const nom = ouverture?.[1];
    if (nom !== undefined) {
      viderTampon();
      const fin = trouverFermeture(jetons, i, nom, ctx.nomFichier);
      blocs.push(classerConteneurOuvert(jetons.slice(i + 1, fin), jeton, nom, ctx));
      i = fin + 1;
      continue;
    }

    tampon.push(jeton);
    i += 1;
  }

  viderTampon();
  return blocs;
}

/**
 * Une section en cours d'accumulation : son titre, son niveau, et les jetons déjà absorbés.
 *
 * @typedef {{
 *   titre: string,
 *   niveau: NiveauTitre,
 *   jetons: JetonMd[],
 *   renvoiCours: { seance: number, diapos: number[] } | null,
 *   horsCours: boolean,
 * }} SectionEnCours
 */

/**
 * L'état du découpage, porté d'un jeton à l'autre.
 *
 * POURQUOI UN OBJET PLUTÔT QUE QUATRE VARIABLES LOCALES. Le traitement d'un titre modifie trois de
 * ces quatre champs à la fois (il clôt la section courante, en ouvre une autre, et mémorise le
 * `<h1>` déjà vu) : les passer séparément à une fonction extraite obligerait à rendre un tuple et
 * à le redistribuer au point d'appel, ce qui déplacerait la mécanique sans la clarifier.
 *
 * @typedef {{
 *   sections: SectionCompilee[],
 *   ancres: Set<string>,
 *   courante: SectionEnCours | null,
 *   titreLuNiveau1: boolean,
 * }} EtatDecoupage
 */

/**
 * Texte d'un titre ATX : le contenu `inline` qui suit son `heading_open`.
 *
 * @param {readonly JetonMd[]} jetons
 * @param {number} i position du `heading_open`
 * @returns {string} le titre nettoyé, ou la chaîne vide si le titre n'a pas de contenu
 */
function texteDuTitre(jetons, i) {
  const contenu = jetons[i + 1];
  return contenu?.type === 'inline' ? contenu.content.trim() : '';
}

/**
 * Sépare un titre ATX de son bloc d'attributs de fin de ligne (`## Les commandes {diapos="12-18"}`,
 * `docs/contenu/ancrage-au-cours.md` §3bis, décision D-B).
 *
 * 🔴 LE DÉPOUILLEMENT EST LE PREMIER GESTE, et le contrat en donne les trois raisons : l'ANCRE se
 * fabrique depuis le titre dépouillé (sans quoi elle vaudrait
 * `les-commandes-dans-lordre-diapos-12-18` et tout lien profond existant pointerait à côté), le
 * SOMMAIRE afficherait sinon l'attribut accolades comprises, et les sections imposées du gabarit
 * se reconnaissent par ÉGALITÉ DE CHAÎNE EXACTE dans `valider.mjs`.
 *
 * ⚠️ `[^{}]*` REFUSE UNE ACCOLADE INTERNE, délibérément : un titre qui finirait par
 * `{"a": {"b": 1}}` n'est pas un bloc d'attributs et reste du texte. On préfère ici ne PAS
 * reconnaître plutôt que reconnaître de travers — ce qui EST reconnu part ensuite se faire juger
 * par une liste blanche nominative (`.claude/rules/security.md` §4, famille S-003/S-009/S-014),
 * jamais retirer par un nettoyage de motif.
 *
 * @param {string} titreBrut le titre tel que markdown-it le rend, déjà rogné
 * @returns {{ titre: string, attributsBruts: string }} `attributsBruts` vaut `''` quand le titre
 *   n'en porte pas — c'est le cas des dix leçons publiées
 */
function separerAttributsDuTitre(titreBrut) {
  // La découpe se fait par INDEX, pas par un motif qui traverserait tout le titre : un
  // `^([\s\S]*?)\s*(\{…\})$` est super-linéaire par retour arrière (S8786), et un titre est du
  // texte d'auteur. `lastIndexOf` désigne la seule ouverture possible, puisque le bloc admis ne
  // contient aucune accolade.
  if (!titreBrut.endsWith('}')) return { titre: titreBrut, attributsBruts: '' };
  const ouverture = titreBrut.lastIndexOf('{');
  if (ouverture === -1) return { titre: titreBrut, attributsBruts: '' };
  const bloc = titreBrut.slice(ouverture);
  if (!/^\{[^{}]*\}$/.test(bloc)) return { titre: titreBrut, attributsBruts: '' };
  return { titre: titreBrut.slice(0, ouverture).trim(), attributsBruts: bloc };
}

/**
 * Le renvoi au cours porté par un TITRE de section (§3bis), et le titre dépouillé qui l'accompagne.
 *
 * Réemploie `lireBlocDAttributs` (la grammaire `{clef="valeur"}`) et `lireRenvoiAuCours` (la
 * grammaire de `diapos`/`seance`, plages dépliées) : la troisième écriture de l'une ou de l'autre
 * finirait par en dire autre chose.
 *
 * @param {string} titreBrut
 * @param {number} niveau niveau ATX lu sur la balise
 * @param {Contexte} ctx
 * @returns {{ titre: string, renvoiCours: { seance: number, diapos: number[] } | null,
 *   horsCours: boolean }}
 */
function lireRenvoiDeTitre(titreBrut, niveau, ctx) {
  const { titre, attributsBruts } = separerAttributsDuTitre(titreBrut);

  // 🔴 CE QUI RESTE APRÈS LE DÉPOUILLEMENT DOIT ÊTRE DU TEXTE — pas une accolade.
  // Le découpage prend le DERNIER bloc `{…}` de la ligne. Sans ce contrôle, trois formes
  // mesurées partaient en silence, et les deux copies de la règle étaient d'accord pour
  // se taire (famille S-010) :
  //   `## Les commandes {seance="4"} {diapos="45-50"}` → titre « Les commandes {seance="4"} »,
  //      ancre `les-commandes-seance-4`, accolades AU SOMMAIRE, et la séance 4 PERDUE : le
  //      renvoi se résolvait sur la séance du frontmatter.
  //   `## Les commandes {diapos="12-18"`  (accolade fermante oubliée) → tout en texte de titre.
  //   `## Les commandes {diapos="12-18"}}` → idem.
  // C'est le pendant, sur le titre, du contrôle de RÉSIDU de `lireBlocDAttributs` : ce qui
  // n'est pas compris est refusé, jamais ignoré. Mesuré : aucun titre des dix leçons publiées
  // ne contient d'accolade, donc la règle forte ne coûte rien aujourd'hui — et le jour où un
  // titre en aura légitimement besoin, c'est le CONTRAT qui change, pas ce garde qu'on affaiblit.
  if (/[{}]/.test(titre)) {
    echec(
      `${ctx.nomFichier} : « ${'#'.repeat(niveau)} ${titreBrut} » laisse une accolade dans le TEXTE du titre`,
      [
        `titre dépouillé : « ${titre} »`,
        'un titre porte AU PLUS un bloc d’attributs, en fin de ligne, de la forme {clef="valeur"}',
        'docs/contenu/ancrage-au-cours.md §3bis',
      ],
    );
  }

  if (attributsBruts === '') return { titre: titreBrut, renvoiCours: null, horsCours: false };

  const libelle = `${'#'.repeat(niveau)} ${titre}`;
  // Le contrat pose l'attribut sur une SECTION, et une section est un `##` ou un `###`. Ailleurs,
  // le refus se nomme : avalé en silence, le bloc s'afficherait tel quel dans la prose.
  if (niveau !== 2 && niveau !== 3) {
    echec(`${ctx.nomFichier} : « ${libelle} » porte un bloc d'attributs « ${attributsBruts} »`, [
      'un renvoi de diapositives ne se pose que sur un titre de niveau 2 ou 3',
      'docs/contenu/ancrage-au-cours.md §3bis',
    ]);
  }

  // ⚠️ UN SEUL MARQUEUR SUR UN TITRE DE SECTION, DEPUIS LE LOT 1c : `hors-cours`. Le cinquième
  // argument ne vaut plus `[]` — le commentaire qui vivait ici disait « AUCUN MARQUEUR SUR UN
  // TITRE DE SECTION » et il est devenu faux ce jour-là. `defaut` y reste un résidu illisible,
  // refusé comme avant : la liste blanche est nominative, pas ouverte aux marqueurs des voisins.
  const { attributs, marqueurs } = lireBlocDAttributs(
    attributsBruts,
    libelle,
    CLEFS_RENVOI_DE_TITRE,
    ctx.nomFichier,
    MARQUEURS_DE_TITRE,
  );

  // 🔴 LE MARQUEUR EST EXCLUSIF DES TROIS CLEFS DE RENVOI — jumelle du garde du validateur.
  // « aucune diapositive ne porte cette section » et « voici les diapositives qui la portent »
  // sont contradictoires : les accepter ensemble laisserait le contrat compilé porter les deux,
  // et le rendu choisir en silence lequel des deux l'auteur voulait dire. Le refus NOMME la clef
  // trouvée à côté du marqueur — sur un titre qui en porte trois, « les deux se contredisent »
  // sans nom obligerait l'auteur à relire toute la ligne pour trouver laquelle retirer.
  if (marqueurs.includes(MARQUEUR_HORS_COURS)) {
    const voisine = CLEFS_RENVOI_DE_TITRE.find((clef) => attributs[clef] !== undefined);
    if (voisine !== undefined) {
      echec(
        `${ctx.nomFichier} : « ${libelle} » porte le marqueur « ${MARQUEUR_HORS_COURS} » ET l'attribut « ${voisine} »`,
        [
          `« ${MARQUEUR_HORS_COURS} » dit qu'AUCUNE diapositive ne porte cette section ; les deux ensemble se contredisent`,
          'docs/contenu/ancrage-au-cours.md §3bis',
        ],
      );
    }
    return { titre, renvoiCours: null, horsCours: true };
  }

  // 🔴 SUR UN TITRE, `diapos` EST REQUIS — plus strict que sur un encadré, et délibérément.
  // `{}` passe la grammaire des paires (rien à lire, rien en résidu) ; `{seance="5"}` seul la
  // passe aussi, et produirait `renvoiCours: { seance: 5, diapos: [] }` — un « renvoi de
  // diapositives » qui n'en cite AUCUNE, que le rendu (lot 2) devrait cas-particulariser. Or
  // §3bis ne prévoit `seance` que pour DÉPLACER le renvoi vers une autre séance du même cours :
  // seul, il ne renvoie nulle part. On refuse ici plutôt que de laisser la forme vide traverser
  // jusqu'au contrat compilé, où elle deviendrait une dette silencieuse.
  // ⚠️ DEPUIS LE LOT 1c, LE MESSAGE NOMME LES DEUX ISSUES — citer, ou déclarer le marqueur. N'en
  // nommer qu'une enverrait l'auteur inventer un renvoi là où le cours n'a rien, ce que le
  // marqueur existe précisément pour éviter.
  if (attributs[ATTRIBUT_DIAPOS] === undefined) {
    echec(
      `${ctx.nomFichier} : « ${libelle} » porte un bloc d'attributs qui ne renvoie à rien`,
      [
        `citer des diapositives avec « ${ATTRIBUT_DIAPOS}="12-18" », ou déclarer le marqueur « ${MARQUEUR_HORS_COURS} » si aucune diapositive ne porte cette section`,
        `« ${ATTRIBUT_SEANCE} » seul ne fait que DÉPLACER le renvoi vers une autre séance`,
        'docs/contenu/ancrage-au-cours.md §3bis',
      ],
    );
  }

  return { titre, renvoiCours: lireRenvoiAuCours(libelle, attributs, ctx), horsCours: false };
}

/**
 * Fige une section accumulée en section compilée, en lui attribuant son ancre.
 *
 * @param {SectionEnCours} courante
 * @param {Set<string>} ancres ancres déjà attribuées — mutée par `ancrer` pour garantir l'unicité
 * @param {Contexte} ctx
 * @returns {SectionCompilee}
 */
function cloturerSection(courante, ancres, ctx) {
  const renvoi = courante.renvoiCours;
  return {
    titre: courante.titre,
    // 🔴 `courante.titre` est DÉJÀ DÉPOUILLÉ (§3bis) : `traiterTitre` a retiré le bloc d'attributs
    // avant de fabriquer la section. C'est la ligne qui garantit que l'ancre ne vaut jamais
    // `les-commandes-dans-lordre-diapos-12-18`.
    ancre: ancrer(courante.titre, ancres),
    niveau: courante.niveau,
    ...(renvoi === null ? {} : { renvoiCours: renvoi }),
    // 🔴 UN CHAMP DISTINCT, PAS UNE UNION AVEC `renvoiCours` (§3bis, lot 1c). Une union
    // obligerait CHAQUE consommateur du contrat à discriminer avant de lire des diapositives ;
    // ici, un lecteur qui ignore `horsCours` continue de fonctionner à l'identique. Et il reste
    // ABSENT quand la section n'a rien déclaré — c'est ce qui garde « rien à citer » (le
    // marqueur) distinct de « pas encore cartographié » (aucun des deux).
    ...(courante.horsCours ? { horsCours: /** @type {const} */ (true) } : {}),
    blocs: construireBlocs(courante.jetons, ctx),
  };
}

/**
 * Traite un titre rencontré dans le flux : `#` (titre de la leçon, hors sommaire), `##`/`###`
 * (ouverture d'une section), ou un niveau inférieur qui n'en est pas un.
 *
 * @param {EtatDecoupage} etat muté sur place
 * @param {string} titreBrut texte du titre, bloc d'attributs de fin de ligne COMPRIS
 * @param {number} niveau niveau ATX lu sur la balise (`h1` → 1, `h2` → 2…)
 * @param {Contexte} ctx
 * @returns {boolean} `true` si le titre a été consommé comme titre ; `false` pour un `h4` et
 *   au-delà, qui n'est pas une section du sommaire mais du contenu légitime
 */
function traiterTitre(etat, titreBrut, niveau, ctx) {
  // 🔴 PREMIER GESTE, avant toute autre décision (§3bis) : tout ce qui suit — le message du refus
  // de `h1`, l'ancre, le sommaire, la comparaison au gabarit — travaille sur le titre DÉPOUILLÉ.
  const { titre, renvoiCours, horsCours } = lireRenvoiDeTitre(titreBrut, niveau, ctx);

  if (niveau === 1) {
    if (etat.titreLuNiveau1) echec(`${ctx.nomFichier} : deux titres de niveau 1`);
    if (etat.courante !== null) {
      echec(`${ctx.nomFichier} : titre de niveau 1 « ${titre} » après le début du corps`);
    }
    etat.titreLuNiveau1 = true;
    return true;
  }

  if (niveau !== 2 && niveau !== 3) return false;

  if (titre === '') echec(`${ctx.nomFichier} : titre de niveau ${niveau} vide`);
  if (etat.courante !== null) {
    etat.sections.push(cloturerSection(etat.courante, etat.ancres, ctx));
  }
  etat.courante = {
    titre,
    niveau: /** @type {NiveauTitre} */ (niveau),
    jetons: [],
    renvoiCours,
    horsCours,
  };
  return true;
}

/**
 * Un jeton rencontré AVANT la première section est-il un simple résidu de balisage, qu'on peut
 * ignorer sans rien perdre ?
 *
 * Les jetons `inline` du `<h1>` déjà consommé et les jetons cachés (fermetures implicites de
 * markdown-it) tombent ici ; tout le reste est du contenu réel, qui doit vivre sous un `##`.
 *
 * @param {JetonMd} jeton
 * @returns {boolean}
 */
function estJetonIgnorableHorsSection(jeton) {
  return jeton.type === 'inline' || jeton.hidden;
}

/**
 * Découpe le flux de jetons en sections de niveau 2 et 3.
 *
 * @param {readonly JetonMd[]} jetons
 * @param {Contexte} ctx
 * @returns {SectionCompilee[]}
 */
function construireSections(jetons, ctx) {
  /** @type {EtatDecoupage} */
  const etat = { sections: [], ancres: new Set(), courante: null, titreLuNiveau1: false };

  for (let i = 0; i < jetons.length; i += 1) {
    const jeton = jetons[i];
    if (jeton === undefined) continue;

    if (jeton.type === 'heading_open') {
      const niveau = Number(jeton.tag.slice(1));
      if (traiterTitre(etat, texteDuTitre(jetons, i), niveau, ctx)) {
        i += 2;
        continue;
      }
      // h4 et au-delà : pas une section du sommaire, mais du contenu légitime — il retombe donc
      // dans la prose de la section courante, avec ses jetons de fermeture.
    }

    const courante = etat.courante;
    if (courante === null) {
      if (estJetonIgnorableHorsSection(jeton)) continue;
      echec(`${ctx.nomFichier} : contenu hors de toute section`, [
        `« ${jeton.type} » rencontré avant le premier titre de niveau 2`,
        'tout le corps doit vivre sous un « ## » (ou un « ### »)',
      ]);
    }
    courante.jetons.push(jeton);
  }

  if (etat.courante !== null) {
    etat.sections.push(cloturerSection(etat.courante, etat.ancres, ctx));
  }
  if (etat.sections.length === 0) {
    echec(`${ctx.nomFichier} : aucune section (aucun titre de niveau 2)`);
  }
  return etat.sections;
}

// ---------------------------------------------------------------------------
// Compilation d'une leçon, puis d'une racine
// ---------------------------------------------------------------------------

/**
 * Construit l'instance markdown-it du projet. `html: false` est le premier rempart XSS du
 * pipeline : aucun balisage brut d'un fichier de contenu n'atteint le DOM (règle `security.md` §4).
 *
 * @returns {InstanceType<typeof MarkdownIt>}
 */
function creerMarkdownIt() {
  const md = new MarkdownIt({
    html: false,
    linkify: false,
    typographer: false,
    breaks: false,
  });
  for (const nom of CONTENEURS_AUTORISES) {
    md.use(conteneurPlugin, nom, {
      // Le `validate` par défaut n'accepte que le nom seul : il rejetterait
      // « comparaison {langage="php"} », qui retomberait alors en paragraphe.
      validate: (params) => params.trim().split(/\s+/)[0] === nom,
    });
  }
  return md;
}

// ---------------------------------------------------------------------------
// Le quiz : relu, REVALIDÉ, coloré — puis émis DANS la leçon (E2-ST3, lot B)
// ---------------------------------------------------------------------------

/**
 * Le quiz TEL QU'IL EST ÉCRIT, avant enrichissement — c'est-à-dire `QuizCompile` privé du
 * seul champ que le build ajoute. Le distinguer n'est pas un raffinement gratuit : caster
 * la sortie d'`Ajv` directement en `QuizCompile` affirmerait qu'un `htmlColore` existe
 * alors que le schéma l'INTERDIT en entrée (`additionalProperties: false`), et le typage
 * mentirait exactement là où il sert (L-016, versant types).
 *
 * `ficheSource` figure ici et NON dans `QuestionQuiz` : le schéma l'exige sur la source, et
 * l'émission le retire (voir `emettreQuestion`). Le décalage entre les deux types EST le
 * contrat de la frontière — c'est lui qui rend l'oubli du retrait visible au typage.
 *
 * @typedef {Extract<QuestionQuiz, { type: 'trouver-la-faille' }>} QuestionFaille
 * @typedef {(Exclude<QuestionQuiz, QuestionFaille> | Omit<QuestionFaille, 'htmlColore'>) & { ficheSource: string }} QuestionSource
 * @typedef {Omit<QuizCompile, 'questions'> & { questions: QuestionSource[] }} QuizSource
 */

/**
 * Lit `quiz.json`, le revalide et l'émet en `QuizCompile`.
 *
 * POURQUOI CE FICHIER REVALIDE UN QUIZ QUE `valider.mjs` A DÉJÀ ACCEPTÉ.
 * `compilerRacine` s'exécute aussi HORS de `build.mjs` — la ligne de commande de ce
 * fichier, et les specs qui compilent des fixtures — là où le validateur n'a pas tourné.
 * Un générateur ne suppose pas qu'un garde-fou situé en amont s'est exécuté : c'est le
 * précédent NOMINATIF de `rendreCarteLecons` (`generer-manifeste.mjs`, contrôle du slug
 * avant écriture de code), et la même raison qui fait revalider le frontmatter ici même.
 *
 * CE QU'IL REVÉRIFIE HORS SCHÉMA, ET C'EST TOUT : `quiz.lecon === frontmatter.slug`.
 * C'est une invariante de l'ÉMISSION, pas une règle de contenu — un quiz mal apparié
 * serait attaché en silence à la mauvaise leçon, et rien dans la page ne le dirait. Les
 * autres cohérences (`bonneReponse` ∈ `choix`, `ligneFautive` ≤ nombre de lignes, deux
 * types distincts au minimum, unicité des `id`) restent la propriété de `valider.mjs` :
 * les dupliquer ici ferait deux vérités qui divergeraient au premier ajustement (L-016).
 *
 * @param {string} dossier chemin absolu du dossier de la leçon
 * @param {string} slug le `slug` du frontmatter, déjà validé
 * @param {Colorateur} colorateur
 * @returns {QuizCompile}
 */
function compilerQuiz(dossier, slug, colorateur) {
  const chemin = join(dossier, 'quiz.json');
  const nomFichier = afficher(chemin);

  if (!existsSync(chemin)) {
    echec(`${nomFichier} : fichier obligatoire absent`, [
      'toute leçon porte son quiz — le contrat `LeconCompilee.quiz` n’a pas de cas « absent »',
      'gabarit : docs/contenu/pipeline-contenu.md §Schéma quiz.json',
    ]);
  }

  let donnees;
  try {
    donnees = JSON.parse(readFileSync(chemin, 'utf8'));
  } catch (e) {
    echec(`${nomFichier} : JSON illisible`, [e instanceof Error ? e.message : String(e)]);
  }

  if (!validerQuiz(donnees)) {
    echec(`${nomFichier} : quiz refusé par le schéma`, [premiereErreurAjv(validerQuiz.errors)]);
  }
  const quiz = /** @type {QuizSource} */ (donnees);

  if (quiz.lecon !== slug) {
    echec(`${nomFichier} : quiz apparié à la mauvaise leçon`, [
      `« lecon » vaut « ${String(quiz.lecon)} », le frontmatter déclare « ${slug} »`,
      'un quiz mal apparié s’afficherait sous une autre leçon sans qu’aucune page ne le signale',
    ]);
  }

  /** @type {QuizCompile} */
  const emis = {
    lecon: quiz.lecon,
    titre: quiz.titre,
    questions: quiz.questions.map((question) => emettreQuestion(question, colorateur, nomFichier)),
  };
  // Recopié seulement s'il est écrit : le contrat le déclare optionnel, et `undefined`
  // disparaîtrait de toute façon à la sérialisation JSON — autant ne pas l'inventer.
  if (quiz.melanger !== undefined) emis.melanger = quiz.melanger;
  return emis;
}

/**
 * Émet UNE question. Tout est passé fidèlement ; seul `trouver-la-faille` s'enrichit.
 *
 * La coloration est précompilée ICI pour la même raison que celle des blocs de code du
 * corps : le navigateur ne reçoit jamais Shiki, et la couleur sort en CLASSES parce que
 * la CSP du site est à hachages. Le contrôle de conservation « zéro `style=` » du
 * colorateur s'applique donc au code du quiz gratuitement — et il nomme `quiz.json`.
 *
 * ⚠️ CE `code` EST VOLONTAIREMENT VULNÉRABLE (`.claude/rules/security.md` §4) : c'est
 * l'énoncé même de la question. Il n'est JAMAIS exécuté, et son `htmlColore` ne passe
 * PAS par le `bypassSecurityTrustHtml` d'E2-ST2, qui reste scopé au seul bloc `mermaid`.
 * Le `code` brut est conservé à côté : il porte la numérotation des lignes
 * (`ligneFautive`) et le texte accessible dont le rendu aura besoin.
 *
 * ⚠️ LA GARANTIE EXACTE, MESURÉE — ET PLUS ÉTROITE QU'ON NE LE CROIT. Shiki échappe
 * « < » en « &#x3C; » et laisse « > » BRUT. Ce n'est pas un échappement HTML complet, et
 * c'est pourtant suffisant : sans « < », aucune balise ne peut s'OUVRIR, donc « > » et
 * même un `onerror=` restent des caractères de texte. C'est cette propriété — et elle
 * seule — qui autorise le lot C à rendre `htmlColore`. Elle ne peut donc pas rester une
 * affirmation de commentaire (L-008) : la leçon-témoin porte une charge `<script>` et un
 * `onerror=`, et `src/pipeline-contenu-compilation.spec.ts` retire les balises que Shiki
 * émet (liste nominative) pour exiger qu'il ne reste plus un seul « < ». Ne pas retirer la
 * charge de la fixture : sans elle, l'assertion serait verte sur un code qui ne contient
 * aucun « < » — le patron S-009 croisé L-019, sur le chemin même qui portera le module
 * XSS d'E3.
 *
 * `ficheSource` NE FRANCHIT PAS cette frontière : c'est de la traçabilité de BUILD.
 * `valider.mjs` l'exige sur la source (§5 de `contenu-pedagogique.md`), mais le navigateur
 * n'a aucun usage d'un chemin vers une KnowledgeBase privée qu'il ne peut pas ouvrir. La
 * voie PUBLIÉE vers les sources est la section « Aller plus loin » de la leçon, écrite en
 * Markdown. Une surface publiée en moins, sans rien perdre de la traçabilité.
 *
 * @param {QuestionSource} question
 * @param {Colorateur} colorateur
 * @param {string} nomFichier pour le message d'échec du colorateur
 * @returns {QuestionQuiz}
 */
function emettreQuestion(question, colorateur, nomFichier) {
  if (question.type === 'trouver-la-faille') {
    const { ficheSource, ...publiable } = question;
    return {
      ...publiable,
      htmlColore: colorateur.colorer(question.code, question.langage, nomFichier),
    };
  }
  const { ficheSource, ...publiable } = question;
  return publiable;
}

/**
 * Compte les ancres d'un type donné dans une liste de blocs, ENCADRÉS COMPRIS.
 *
 * La récursion n'est pas une précaution : `construireBlocs` descend dans le contenu de
 * chaque `::: note` / `::: attention` / `::: a-retenir`, donc une ancre y produit bien un
 * bloc d'ancre — invisible à un `flatMap` de premier niveau. Voir les contrôles qui
 * appellent cette fonction pour ce que ce trou coûtait.
 *
 * UNE SEULE FONCTION POUR LES DEUX ANCRES (E2-ST5, lot a), et c'est délibéré : deux
 * recopies auraient été deux mécanismes de descente à éprouver séparément, dont le second
 * serait resté non exercé — la moitié exacte du constat L-039 (« deux compteurs séparés
 * veut dire deux fois le même cas limite à écrire »). Ici il n'y a qu'une descente, et
 * elle est exercée par les cas de `[[quiz]]` ET par ceux de `[[simulation]]`.
 *
 * ⚠️ ELLE EST EXPORTÉE EXPRÈS POUR ÊTRE MISE À L'ÉPREUVE, comme `verifierAncres` — et pas
 * parce qu'un autre module du pipeline l'appellerait. Il existe une SECONDE copie de cette
 * descente sur le chemin de la LECTURE de l'artéfact (`compterAncres`,
 * `src/app/features/cours/contenu-compile.ts`), et un pointeur croisé ne suffit pas :
 * `src/compter-ancres-parite.spec.ts` fait compter le MÊME corpus aux deux et exige
 * l'égalité (L-037 — pointeur ET test de parité). Le mode de divergence qu'il attrape est
 * silencieux : le jour où un `BlocContenu` neuf portera des `blocs` imbriqués, une descente
 * mise à jour d'un seul côté ferait SOUS-COMPTER l'autre, et le côté qui sous-compte trouve
 * son compte juste — aucun gate ne rougirait (L-034).
 *
 * @param {readonly BlocContenu[]} blocs
 * @param {'ancre-quiz' | 'ancre-simulation'} type
 * @returns {number}
 */
export function compterAncres(blocs, type) {
  let total = 0;
  for (const bloc of blocs) {
    if (bloc.type === type) total += 1;
    else if (bloc.type === 'encadre') total += compterAncres(bloc.blocs, type);
    // LE SECOND TYPE PORTEUR DE BLOCS (lot 5) : ses `blocs` vivent un cran plus bas, dans chaque
    // volet. Une ancre `[[quiz]]` écrite dans un onglet serait invisible à une descente qui ne
    // connaîtrait que `encadre` — et le compte sortirait juste sur une leçon qui en porte une
    // ailleurs, donc VERT. La copie jumelle de `src/app/features/cours/contenu-compile.ts` porte
    // la MÊME descente, et `src/compter-ancres-parite.spec.ts` fait compter le même corpus aux
    // deux (L-037).
    else if (bloc.type === 'methodes') {
      for (const volet of bloc.volets) total += compterAncres(volet.blocs, type);
    }
  }
  return total;
}

/**
 * Recense les `marche-a-suivre` d'une leçon, À TOUTE PROFONDEUR.
 *
 * 🔴 LA DESCENTE EST RÉCURSIVE POUR LA MÊME RAISON QUE `compterAncres` : `encadre` est le seul bloc
 * qui en imbrique d'autres, et une marche à suivre écrite dans un `::: note` serait invisible à un
 * balayage de premier niveau. Ses renvois resteraient alors NON RÉSOLUS — une ancre vide dans
 * l'artéfact, donc un lien mort dans la page, et aucun gate rouge.
 *
 * 🔴 LA DESCENTE EST NOMINATIVE ET BRUYANTE. `encadre` a été rejoint au lot 5 par `methodes`
 * (décision D-C), dont les `blocs` vivent un cran plus bas, dans chaque volet — une marche qu'un
 * volet porterait serait invisible à une descente qui l'ignorerait : ses renvois resteraient NON
 * RÉSOLUS, c'est-à-dire une `ancre` vide dans l'artéfact, un lien mort dans la page, et AUCUN gate
 * rouge.
 *
 * 🔴 CE QUE LA GARDE BRUYANTE DU DESSOUS NE COUVRE PAS — à lire avant de s'y fier. Elle apparie
 * `'blocs' in bloc`, donc elle ne voit QUE les enfants portés sous la clef `blocs`. Elle n'aurait
 * PAS attrapé `methodes`, dont les enfants vivent sous `volets[].blocs` : ce n'est pas elle qui a
 * tenu au lot 5, c'est la relecture à la main. Un type porteur d'enfants SOUS UNE AUTRE CLEF lui
 * échappe entièrement, et en silence.
 *
 * ⚠️ CONSÉQUENCE OPÉRATOIRE, ET ELLE EST MANUELLE. Le prochain `BlocContenu` imbriquant DOIT être
 * vérifié À LA MAIN aux QUATRE descentes du dépôt, qu'aucune garde partagée ne relie :
 *   · `recenserMarches`         — tools/content-pipeline/compiler-markdown.mjs:3045
 *   · `compterAncres`           — tools/content-pipeline/compiler-markdown.mjs:2989
 *   · `compterAncres` (jumelle) — src/app/features/cours/contenu-compile.ts:242
 *   · `collecterSvg`            — tools/content-pipeline/rendre-mermaid.mjs:1467
 * (Les numéros datent du 2026-09-07 et se périment ; les NOMS de fonction, eux, sont stables —
 * c'est par eux qu'on retrouve les quatre, la ligne n'est qu'un raccourci.)
 * Les trois autres n'ont AUCUNE garde du tout. La couverture est complète AUJOURD'HUI parce que
 * `encadre` et `methodes` sont les deux seuls types imbriquants — c'est un constat daté, pas une
 * propriété tenue par du code. Ne pas écrire l'inverse ici : une conviction annoncée comme preuve
 * fabrique la pression d'assouplissement (S-011), et un invariant que rien n'observe n'est pas
 * vrai, il est indéterminé (L-063). Une garde structurelle PARTAGÉE serait la vraie parade ; c'est
 * une décision d'architecture, hors du périmètre de ce lot.
 *
 * @param {readonly BlocContenu[]} blocs
 * @param {Extract<BlocContenu, { type: 'marche-a-suivre' }>[]} sortie mutée
 * @param {string} nomFichier pour le message
 * @returns {Extract<BlocContenu, { type: 'marche-a-suivre' }>[]} `sortie`, pour l'enchaînement
 */
function recenserMarches(blocs, sortie, nomFichier) {
  for (const bloc of blocs) {
    if (bloc.type === 'marche-a-suivre') sortie.push(bloc);
    else if (bloc.type === 'encadre') recenserMarches(bloc.blocs, sortie, nomFichier);
    else if (bloc.type === 'methodes') {
      for (const volet of bloc.volets) recenserMarches(volet.blocs, sortie, nomFichier);
    } else if ('blocs' in bloc) {
      echec(
        `${nomFichier} : bloc « ${bloc.type} » porteur de « blocs », NON ÉNUMÉRÉ par le recensement des marches à suivre`,
        [
          'une marche à suivre imbriquée dedans garderait une ancre VIDE — un lien mort, sans gate rouge',
          'ajouter le type à la descente de `recenserMarches`, dans compiler-markdown.mjs',
        ],
      );
    }
  }
  return sortie;
}

/**
 * Recense les marches à suivre de TOUTES les sections d'une leçon.
 *
 * @param {readonly SectionCompilee[]} sections
 * @param {string} nomFichier pour le message
 * @returns {Extract<BlocContenu, { type: 'marche-a-suivre' }>[]}
 */
function marchesDeLaLecon(sections, nomFichier) {
  /** @type {Extract<BlocContenu, { type: 'marche-a-suivre' }>[]} */
  const marches = [];
  for (const section of sections) recenserMarches(section.blocs, marches, nomFichier);
  return marches;
}

/**
 * RÉSOUT les `{voir="Titre de section"}` d'une leçon, EN SECOND TEMPS.
 *
 * 🔴 POURQUOI EN DEUX TEMPS, ET NON AU FIL DE L'EAU. La marche à suivre se place en TÊTE de leçon
 * (juste après « L'idée en une image ») et cite couramment une section située PLUS BAS : au moment
 * où `lireMarcheASuivre` la compile, le titre visé n'existe pas encore. La résolution attend donc
 * que `construireSections` ait rendu la main — c'est-à-dire que TOUS les titres `##`/`###` et leurs
 * ancres, suffixes de collision compris, soient connus.
 *
 * 🔴 DEUX SECTIONS AU MÊME TITRE SONT UN REFUS, jamais « la première gagne ». Une résolution
 * positionnelle serait exactement le littéral fragile que le contrat interdit, déguisé en
 * commodité : renommer l'une des deux sections déplacerait le renvoi EN SILENCE. Le message nomme
 * les deux sections et leurs deux ancres suffixées, et l'auteur tranche.
 *
 * @param {readonly SectionCompilee[]} sections
 * @param {Contexte} ctx
 */
function resoudreRenvoisDeSection(sections, ctx) {
  /** @type {Map<string, SectionCompilee[]>} */
  const parTitre = new Map();
  for (const section of sections) {
    const dejaVues = parTitre.get(section.titre);
    if (dejaVues === undefined) parTitre.set(section.titre, [section]);
    else dejaVues.push(section);
  }

  for (const marche of marchesDeLaLecon(sections, ctx.nomFichier)) {
    for (const [rang, etape] of marche.etapes.entries()) {
      const renvoi = etape.renvoi;
      if (renvoi === undefined || renvoi.cible !== 'section') continue;
      const situe = `« :::: ${CONTENEUR_MARCHE} », étape n°\u00A0${rang + 1}`;
      resoudreUnRenvoiDeSection(renvoi, situe, parTitre, ctx);
    }
  }
}

/**
 * Résout le renvoi de section d'UNE étape : cible UNIQUE exigée, puis ancre posée.
 *
 * Extraite de `resoudreRenvoisDeSection`, et pas seulement pour la complexité mesurée par
 * G-lint : trois refus indépendants sur un même renvoi se lisent mieux hors de deux boucles
 * imbriquées. Le comportement est INCHANGÉ, ligne pour ligne.
 *
 * @param {Extract<NonNullable<EtapeMarche['renvoi']>, { cible: 'section' }>} renvoi muté sur place
 * @param {string} situe où l’erreur se lit, déjà rédigé
 * @param {ReadonlyMap<string, SectionCompilee[]>} parTitre les sections de la leçon, par titre
 * @param {Contexte} ctx
 */
function resoudreUnRenvoiDeSection(renvoi, situe, parTitre, ctx) {
  const candidates = parTitre.get(renvoi.titre) ?? [];
  if (candidates.length === 0) {
    const connus = [...parTitre.keys()].map((t) => `« ${t} »`).join(', ') || '(aucun)';
    echec(
      `${ctx.nomFichier} : ${situe} renvoie à « ${renvoi.titre} », qui n'est le titre d'aucune section`,
      [
        `titres de section de cette leçon : ${connus}`,
        'le renvoi cite le TEXTE d’un titre, jamais son ancre — l’ancre est fabriquée au build',
      ],
    );
  }
  if (candidates.length > 1) {
    const portees = candidates.map((s) => `niveau ${s.niveau} → #${s.ancre}`).join(', ');
    echec(`${ctx.nomFichier} : ${situe} renvoie à « ${renvoi.titre} », titre AMBIGU`, [
      `${candidates.length} sections le portent : ${portees}`,
      'renommer l’une d’elles — une résolution positionnelle casserait en silence au premier renommage',
    ]);
  }
  // 🔴 PAS DE `?? ''` ICI. Les cas 0 et > 1 viennent d'échouer juste au-dessus : l'ancre existe
  // forcément. Mais un repli sur la chaîne vide poserait au rendu (lot 4) un `fragment=''`,
  // c'est-à-dire un lien mort qu'AUCUN gate ne verrait rougir — un invariant vrai que rien
  // n'observe (L-063). On le rend observable : s'il se rompait, la compilation le dirait.
  const ancre = candidates[0]?.ancre;
  if (ancre === undefined || ancre === '') {
    echec(`${ctx.nomFichier} : ${situe} — ancre introuvable pour « ${renvoi.titre} »`, [
      'la section a été trouvée mais ne porte pas d’ancre — invariant rompu dans `construireSections`',
    ]);
  }
  renvoi.ancre = ancre;
}

/**
 * VÉRIFIE les `{voir="module:<slug>"}` de toute une racine, APRÈS compilation de ses leçons.
 *
 * 🔴 C'EST UNE VÉRIFICATION, PAS UNE TRANSFORMATION. Le lien lui-même est bâti au rendu ; ce qui se
 * joue ici est qu'il désigne une page qui EXISTERA. Le manifeste de routes, lui, est produit APRÈS
 * cette compilation (`generer-manifeste.mjs`) : il n'est pas consultable d'ici. Mais les leçons
 * compilées portent leur `frontmatter.statut`, donc l'index slug → statut est gratuit une fois la
 * racine compilée — c'est la même donnée, une passe plus tôt.
 *
 * 🔴 UNE CIBLE NON `publiee` EST UN REFUS. Elle n'est pas prerendue : le lien servirait une 404,
 * c'est-à-dire l'incident de production du 2026-08-27 à l'identique. La vérification porte sur le
 * statut AU MOMENT DU BUILD, jamais sur l'intention de publier plus tard.
 *
 * @param {readonly LeconCompilee[]} lecons
 * @param {readonly string[]} dossiers mêmes indices que `lecons` — sert à NOMMER le fichier fautif
 */
function verifierRenvoisDeModule(lecons, dossiers) {
  /** @type {Map<string, string>} */
  const statutParSlug = new Map();
  for (const lecon of lecons) statutParSlug.set(lecon.frontmatter.slug, lecon.frontmatter.statut);

  for (const [index, lecon] of lecons.entries()) {
    const nomFichier = afficher(join(dossiers[index] ?? '', 'lecon.md'));
    for (const marche of marchesDeLaLecon(lecon.sections, nomFichier)) {
      for (const [rang, etape] of marche.etapes.entries()) {
        const renvoi = etape.renvoi;
        if (renvoi === undefined || renvoi.cible !== 'module') continue;
        const situe = `« :::: ${CONTENEUR_MARCHE} », étape n°\u00A0${rang + 1}`;
        verifierUnRenvoiDeModule(renvoi.slug, situe, nomFichier, statutParSlug);
      }
    }
  }
}

/**
 * Juge UN renvoi « module: » : la cible doit exister dans le sujet ET être `publiee`.
 *
 * Extraite de `verifierRenvoisDeModule` pour la même raison que sa jumelle de section : deux
 * refus indépendants au fond de trois boucles imbriquées. Comportement INCHANGÉ.
 *
 * @param {string} slug le slug cité par l’étape
 * @param {string} situe où l’erreur se lit, déjà rédigé
 * @param {string} nomFichier
 * @param {ReadonlyMap<string, string>} statutParSlug index slug → statut, pour TOUT le sujet
 */
function verifierUnRenvoiDeModule(slug, situe, nomFichier, statutParSlug) {
  const statut = statutParSlug.get(slug);
  if (statut === undefined) {
    echec(`${nomFichier} : ${situe} renvoie au module « ${slug} », inconnu de ce sujet`, [
      `slugs déclarés : ${[...statutParSlug.keys()].join(', ') || '(aucun)'}`,
    ]);
  }
  if (statut !== 'publiee') {
    echec(`${nomFichier} : ${situe} renvoie au module « ${slug} », en « statut: ${statut} »`, [
      'un module non publié n’est pas prerendu — le lien servirait une 404 (incident du 2026-08-27)',
      'le contrôle porte sur le statut AU MOMENT DU BUILD, pas sur l’intention de publier plus tard',
    ]);
  }
}

/**
 * Lit `simulation.json` s'il existe, le revalide et l'émet en `SimulationCompilee`.
 *
 * POURQUOI `null` PLUTÔT QU'UN ÉCHEC QUAND LE FICHIER MANQUE — la seule différence de fond
 * avec `compilerQuiz`. `valider.mjs` (§9) n'exige `simulation.json` d'aucune leçon : une
 * leçon qui ne décrit aucun flux n'en a pas, et `LeconCompilee.simulation` est optionnel.
 * L'absence est donc un RÉSULTAT, pas une anomalie — c'est l'appelant qui la confronte au
 * nombre d'ancres du corps.
 *
 * POURQUOI CE FICHIER REVALIDE UNE SIMULATION QUE `valider.mjs` A DÉJÀ ACCEPTÉE : même
 * raison que `compilerQuiz`, mot pour mot. `compilerRacine` s'exécute aussi HORS de
 * `build.mjs` — la ligne de commande de ce fichier, et les specs qui compilent des
 * fixtures — là où le validateur n'a pas tourné. Un générateur ne suppose pas qu'un
 * garde-fou d'amont s'est exécuté.
 *
 * CE QU'IL REVÉRIFIE HORS SCHÉMA, ET C'EST TOUT : `simulation.lecon === frontmatter.slug`.
 * Invariante de l'ÉMISSION, comme pour le quiz — une simulation mal appariée s'attacherait
 * en silence à la mauvaise leçon. Les cohérences internes (`numero` séquentiel, renvois
 * vers un acteur déclaré, unicité des `id` d'acteur) restent la propriété de `valider.mjs`
 * (`verifierSimulationHorsSchema`) : les dupliquer ici ferait deux vérités qui
 * divergeraient au premier ajustement (L-016).
 *
 * RIEN N'EST AJOUTÉ NI RETIRÉ à l'émission : pas de `htmlColore` (le `code` d'un panneau
 * est court, sa coloration appartiendra au composant du lot b) et pas d'équivalent de
 * `ficheSource` à retirer. La sortie est donc la source, telle quelle.
 *
 * @param {string} dossier chemin absolu du dossier de la leçon
 * @param {string} slug le `slug` du frontmatter, déjà validé
 * @returns {SimulationCompilee | null} `null` si la leçon n'en porte pas
 */
function compilerSimulation(dossier, slug) {
  const chemin = join(dossier, 'simulation.json');
  if (!existsSync(chemin)) return null;

  const nomFichier = afficher(chemin);

  let donnees;
  try {
    donnees = JSON.parse(readFileSync(chemin, 'utf8'));
  } catch (e) {
    echec(`${nomFichier} : JSON illisible`, [e instanceof Error ? e.message : String(e)]);
  }

  if (!validerSimulation(donnees)) {
    echec(`${nomFichier} : simulation refusée par le schéma`, [
      premiereErreurAjv(validerSimulation.errors),
    ]);
  }
  const simulation = /** @type {SimulationCompilee} */ (donnees);

  if (simulation.lecon !== slug) {
    echec(`${nomFichier} : simulation appariée à la mauvaise leçon`, [
      `« lecon » vaut « ${String(simulation.lecon)} », le frontmatter déclare « ${slug} »`,
      'une simulation mal appariée s’afficherait sous une autre leçon sans qu’aucune page ne le signale',
    ]);
  }

  return simulation;
}

/**
 * Compile UNE leçon.
 *
 * @param {string} dossier chemin absolu du dossier contenant `lecon.md`
 * @param {{ md: InstanceType<typeof MarkdownIt>, colorateur: Colorateur, rendreMermaid?: Contexte['rendreMermaid'], exercices?: RegistreIndexe | null, sujetsFreres?: Map<string, SujetFrere> }} outils
 *   `exercices` est OPTIONNEL : absent, tout `::: exercice-du-cours` fait échouer la compilation en
 *   nommant le registre manquant. C'est fail-closed, pas un défaut — une leçon compilée SANS son
 *   registre rendrait un encadré d'exercice sans énoncé, ce que rien en aval ne verrait.
 * @returns {LeconCompilee}
 */
export function compilerLecon(dossier, outils) {
  const chemin = join(dossier, 'lecon.md');
  const nomFichier = afficher(chemin);
  const brut = readFileSync(chemin, 'utf8');

  const separe = matter(brut);
  const donnees = /** @type {Record<string, unknown>} */ (separe.data);
  normaliserDates(donnees);
  if (!validerFrontmatter(donnees)) {
    echec(`${nomFichier} : frontmatter refusé par le schéma`, [
      premiereErreurAjv(validerFrontmatter.errors),
    ]);
  }

  const nettoye = retirerCommentairesHtml(separe.content);
  verifierConteneurs(nettoye.corps, nomFichier);

  /** @type {Contexte} */
  const ctx = {
    md: outils.md,
    colorateur: outils.colorateur,
    nomFichier,
    rendreMermaid: outils.rendreMermaid ?? null,
    seanceDuModule: typeof donnees['seance'] === 'number' ? donnees['seance'] : null,
    exercices: outils.exercices ?? null,
    // LES DEUX SE DÉRIVENT DU DISQUE, PAS DU FRONTMATTER : la racine est le dossier parent de la
    // leçon, et son NOM est ce qu'un `cours="…"` peut répéter (superflu) ou nommer. `outils` peut
    // fournir le registre pour que la lecture d'un horaire frère soit mémoïsée d'une leçon à
    // l'autre ; sans lui, une compilation de leçon isolée reste correcte plutôt que aveugle.
    nomDeLaRacine: basename(dirname(dossier)),
    sujetsFreres: outils.sujetsFreres ?? construireRegistreDesSujetsFreres(dirname(dossier)),
  };
  const sections = construireSections(outils.md.parse(nettoye.corps, {}), ctx);

  // LES RENVOIS DE SECTION D'UNE MARCHE À SUIVRE SE RÉSOLVENT ICI, ET PAS PLUS TÔT : la marche est
  // en tête de leçon et cite couramment une section située plus bas. Voir l'en-tête de la fonction.
  resoudreRenvoisDeSection(sections, ctx);

  // CONTRÔLE DE CONSERVATION du retrait des commentaires : la sortie ne doit plus contenir NI
  // marqueur de doute, NI commentaire échappé. Le contrôle porte sur le HTML réellement produit,
  // pas sur la source — c'est le seul endroit où l'échappement de markdown-it se verrait.
  const rendu = JSON.stringify(sections);
  if (rendu.includes(MARQUEUR_DOUTE) || rendu.includes('&lt;!--') || rendu.includes('<!--')) {
    echec(`${nomFichier} : un commentaire de la source a survécu au rendu`, [
      `${nettoye.commentaires} commentaire(s) retiré(s), dont ${nettoye.doutes} « ${MARQUEUR_DOUTE} »`,
      'les doutes du professeur ne doivent jamais s’afficher à un apprenant, quel que soit le statut',
    ]);
  }

  // L'ANCRE `[[quiz]]` DOIT ÊTRE PRÉSENTE, ET UNE SEULE FOIS.
  // Le quiz est obligatoire dans `LeconCompilee` ; l'ancre est le seul endroit du corps où il
  // s'affiche. Une leçon qui l'oublie compilerait, se prerendrait, se publierait — et son quiz
  // ne serait NULLE PART sur la page, sans qu'aucun gate ne rougisse : c'est de la donnée
  // livrée et jamais rendue, le mode d'échec le plus coûteux parce qu'il ne se voit qu'à l'œil.
  // Deux ancres seraient l'autre moitié du même défaut : le même quiz rendu deux fois, donc
  // des `id` de question dupliqués dans le document (cf. `PREFIXE_ID_QUESTION`).
  //
  // Le compte se fait ICI et pas dans `valider.mjs` : l'AST existe à cet instant, donc le
  // compte est EXACT. Le validateur, lui, ne lit que la source — il devrait deviner par motif
  // qu'un `[[quiz]]` n'est ni dans un bloc de code clôturé ni dans un commentaire retiré, et
  // une liste de motifs sur un format structuré est le patron que ce dépôt a déjà payé
  // trois fois (S-001, S-003, S-009).
  // 🔴 LE COMPTE EST RÉCURSIF, ET IL DOIT L'ÊTRE. Il ne l'était pas jusqu'au lot C :
  // `sections.flatMap(s => s.blocs)` ne voit que le PREMIER niveau, alors qu'un
  // `[[quiz]]` écrit dans un `::: note` produit un `ancre-quiz` imbriqué —
  // `construireBlocs` descend dans les encadrés. Une leçon portant l'ancre au premier
  // niveau ET une seconde dans un encadré comptait donc 1, passait le contrôle, et le
  // composant rendait le quiz DEUX fois : `id` de questions dupliqués dans le
  // document, c'est-à-dire très exactement ce que le paragraphe ci-dessus promet
  // d'empêcher. ⚠️ `encadre` N'EST PLUS LE SEUL bloc qui en imbrique d'autres : le lot 5 lui a
  // adjoint `methodes`, dont les enfants vivent un cran plus bas, dans `volets[].blocs`
  // (`comparaison`, elle, porte des `exemples`, pas des blocs). `compterAncres` descend dans les
  // deux — voir la descente elle-même, qui est nominative.
  const blocsDuCorps = sections.flatMap((section) => section.blocs);
  const ancresQuiz = compterAncres(blocsDuCorps, 'ancre-quiz');
  if (ancresQuiz !== 1) {
    echec(`${nomFichier} : le corps porte ${ancresQuiz} ancre(s) « [[quiz]] », une seule attendue`, [
      ancresQuiz === 0
        ? 'le quiz est obligatoire mais ne s’afficherait nulle part — ajouter un paragraphe valant exactement « [[quiz]] »'
        : 'le même quiz serait rendu plusieurs fois, donc les `id` de ses questions dupliqués dans le document',
      'gabarit : docs/contenu/pipeline-contenu.md §Gabarit de leçon',
    ]);
  }

  const slug = String(donnees['slug']);

  // ═══ LA SIMULATION ET SON ANCRE VONT PAR PAIRE (E2-ST5, lot a) ═══════════════════════════
  // `simulation.json` est OPTIONNEL — mais l'optionalité porte sur la PAIRE, pas sur chacune
  // de ses moitiés. Les deux dissociations sont des échecs silencieux symétriques :
  //   · fichier SANS ancre  → de la donnée compilée, livrée dans le chunk de la leçon, et
  //     affichée NULLE PART. Aucun gate ne rougit ; seul un œil qui connaît le fichier
  //     source verrait qu'il manque quelque chose à la page ;
  //   · ancre SANS fichier  → un trou dans le corps, là où l'auteur a écrit `[[simulation]]`
  //     en croyant y placer quelque chose. C'est le cas qui compilait AVANT ce lot ;
  //   · DEUX ancres         → la même simulation rendue deux fois, donc `ID_SIMULATION` et
  //     tous les `PREFIXE_ID_ETAPE + N` dupliqués dans le document (cf. `contenu-compile.ts`).
  //
  // LE CONTRÔLE VIT ICI, ET NULLE PART AILLEURS DANS LE PIPELINE. `compilerLecon` est la
  // seule fonction qui voit à la fois le DOSSIER (donc la présence du fichier) et l'AST
  // (donc le compte EXACT des ancres). `valider.mjs` ne lit aucune ancre : il devrait
  // deviner par motif qu'un `[[simulation]]` n'est ni dans un bloc de code clôturé ni dans
  // un commentaire retiré — une liste de motifs sur un format structuré est le patron que ce
  // dépôt a déjà payé quatre fois (S-001, S-003, S-009, S-014).
  //
  // 🔴 LE COMPTE EST RÉCURSIF, POUR LA RAISON ÉCRITE PLUS HAUT SUR `[[quiz]]` : une ancre
  // dans un `::: note` produit un `ancre-simulation` imbriqué, invisible à un balayage de
  // premier niveau. `compterAncres` porte cette descente une seule fois pour les deux ancres.
  const simulation = compilerSimulation(dossier, slug);
  const ancresSimulation = compterAncres(blocsDuCorps, 'ancre-simulation');
  const ancresAttendues = simulation === null ? 0 : 1;
  if (ancresSimulation !== ancresAttendues) {
    let cause;
    if (simulation === null) {
      cause =
        'aucun « simulation.json » à côté de cette leçon — l’ancre laisserait un trou dans la page';
    } else if (ancresSimulation === 0) {
      cause =
        '« simulation.json » existe mais ne s’afficherait nulle part — ajouter un paragraphe valant exactement « [[simulation]] »';
    } else {
      cause =
        'la même simulation serait rendue plusieurs fois, donc ses « id » d’étape dupliqués dans le document';
    }
    echec(
      `${nomFichier} : le corps porte ${ancresSimulation} ancre(s) « [[simulation]] », ` +
        `${ancresAttendues} attendue(s)`,
      [cause, 'gabarit : docs/contenu/pipeline-contenu.md §Schéma simulation.json'],
    );
  }

  /** @type {LeconCompilee} */
  const compilee = {
    frontmatter: {
      titre: String(donnees['titre']),
      slug,
      sujet: String(donnees['sujet']),
      ordre: Number(donnees['ordre']),
      niveau: String(donnees['niveau']),
      dureeEstimee: Number(donnees['duree-estimee']),
      objectifs: /** @type {string[]} */ (donnees['objectifs']),
      prerequis: /** @type {string[]} */ (donnees['prerequis']),
      fichesSources: /** @type {string[]} */ (donnees['fiches-sources']),
      cree: String(donnees['cree']),
      maj: String(donnees['maj']),
      statut: /** @type {LeconCompilee['frontmatter']['statut']} */ (String(donnees['statut'])),
    },
    sections,
    quiz: compilerQuiz(dossier, slug, outils.colorateur),
  };
  // `section` est le SEUL champ optionnel du frontmatter (E2-ST6, lot B). Même geste que la
  // simulation ci-dessous : recopié seulement s'il est là, jamais posé à `undefined`. Le schéma
  // a déjà refusé une valeur vide ou entourée de blanches ; ici, on ne fait que transporter.
  // La règle « tout-ou-rien par sujet » n'appartient PAS à ce fichier : elle porte sur toutes
  // les leçons d'un sujet, que `compilerLecon` — qui n'en voit qu'une — ne peut pas comparer.
  // Elle vit dans `valider.mjs` (`validerRacine`), qui les recense toutes.
  if (donnees['section'] !== undefined) {
    compilee.frontmatter.section = String(donnees['section']);
  }
  // `seance` — même geste, même raison (E3-ST20). ABSENTE = module complémentaire, hors cours : le
  // champ ne se pose pas à `undefined`, il n'existe simplement pas, et le rendu lit cette absence
  // comme un état à part entière plutôt que comme une donnée manquante. Le TITRE et la DATE de la
  // séance ne sont pas recopiés ici : ils vivent dans `horaire.json`, source unique.
  if (donnees['seance'] !== undefined) {
    compilee.frontmatter.seance = Number(donnees['seance']);
  }
  // Recopiée seulement si elle existe : le contrat la déclare optionnelle, et `undefined`
  // disparaîtrait de toute façon à la sérialisation JSON — même geste que `quiz.melanger`.
  if (simulation !== null) compilee.simulation = simulation;
  return compilee;
}

/**
 * Ordre total stable sur les unités de code UTF-16 — indépendant de la locale et de la plateforme.
 * Même fonction, même raison que dans `tools/a11y/verifier-axe.mjs` et
 * `tools/deploiement/generer-config-swa.mjs` (L-009) : ce sont des chemins ASCII, et l'ordre de
 * compilation doit être le même sur ce poste Windows et sur le runner Linux.
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
 * Recense les dossiers de leçon d'une racine — mêmes règles que `valider.mjs` : c'est la présence
 * d'un `lecon.md` qui déclare une leçon, jamais celle d'un dossier.
 *
 * @param {string} racine chemin absolu
 * @returns {string[]} triés
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
 * Compile toutes les leçons d'une racine et rend, avec elles, la feuille de coloration qu'elles
 * exigent. Les deux sortent ENSEMBLE parce qu'elles sont indissociables : le HTML référence des
 * classes que seule cette feuille définit.
 *
 * ⚠️ L'HORAIRE SORT AVEC ELLES (E3-ST20). Il n'appartient à aucune leçon — c'est la donnée du
 * SUJET — mais il doit voyager jusqu'au manifeste, et `compilerRacine` est la seule fonction qui
 * voit la racine entière. Il est rendu TEL QUEL, non validé : `valider.mjs` tourne AVANT ce
 * compilateur (`build.mjs` : valider, puis compiler) et c'est lui qui porte le schéma de l'horaire
 * et ses deux règles hors schéma. Absent, il vaut `null` — une racine sans ancrage au cours reste
 * compilable, comme elle l'était avant ce lot.
 *
 * ⚠️ LE REGISTRE D'EXERCICES SORT AVEC EUX (E3-ST21), pour les mêmes raisons, mot pour mot : il
 * est la donnée du SUJET, il doit voyager jusqu'au manifeste, et il est rendu TEL QUEL, non
 * validé — `valider.mjs` porte `schemas/exercices.schema.json` et ses quatre règles hors schéma,
 * et `build.mjs` le fait tourner avant. Absent, il vaut `null`.
 *
 * ⚠️ LE COLORATEUR EST INJECTABLE, ET C'EST CE QUI REND LE MULTI-RACINE POSSIBLE (E7, lot A).
 * Un colorateur ACCUMULE les classes de coloration des blocs qu'il a colorés, et `feuille` rend
 * ces classes déjà enveloppées par `assemblerFeuille` — en-têtes, bascule écran/impression et
 * commentaires épinglés compris. Deux racines compilées avec deux colorateurs distincts
 * rendraient donc deux feuilles COMPLÈTES, dont la concaténation dupliquerait l'enveloppe : les
 * mêmes sélecteurs `.shiki` déclarés deux fois, et `src/pipeline-contenu-compilation.spec.ts`
 * (qui surveille le contenu de cette feuille) mesurerait une feuille que personne n'a voulue.
 * L'appelant qui compile plusieurs racines crée donc UN colorateur, le passe à chacune, et
 * n'appelle `assemblerFeuille` qu'une fois, après la dernière — voir `build.mjs`. Sans l'option,
 * le comportement est inchangé : une racine, son colorateur, sa feuille assemblée.
 *
 * @param {string} racine chemin absolu
 * @param {{ rendreMermaid?: Contexte['rendreMermaid'], colorateur?: Colorateur }} [options]
 * @returns {Promise<{ lecons: LeconCompilee[], feuille: string, horaire: HoraireCompile | null, exercices: ExercicesCompiles | null, sujetsFreres: string[] }>}
 */
export async function compilerRacine(racine, options = {}) {
  // `content/cours/securite-web/` n'existe pas encore (E3 l'ouvrira). Sans ce garde-fou, l'appel
  // par défaut mourrait sur une pile ENOENT ; avec lui, il rend zéro leçon et une feuille vide,
  // ce qui garde `src/styles.scss` compilable. Une racine EXPLICITE introuvable, elle, est une
  // faute d'appel : le lot 4 la fera échouer en code 1 depuis `build.mjs`.
  const colorateur = options.colorateur ?? (await creerColorateur());
  if (!existsSync(racine)) {
    console.error(`compiler-markdown : aucune racine « ${afficher(racine)} » — 0 leçon`);
    return {
      lecons: [],
      feuille: assemblerFeuille(colorateur.feuille()),
      horaire: null,
      exercices: null,
      sujetsFreres: [],
    };
  }
  const md = creerMarkdownIt();
  const exercices = lireExercices(racine);
  // LE REGISTRE SE CONSTRUIT AVANT LA BOUCLE, ET C'EST OBLIGATOIRE : un `cours="…"` se résout
  // PENDANT la compilation d'une leçon. Il est partagé par toutes les leçons de la racine pour que
  // l'horaire d'un sujet cité par dix modules ne soit lu qu'une fois.
  const sujetsFreres = construireRegistreDesSujetsFreres(racine);
  const dossiers = recenserLecons(racine);
  const lecons = dossiers.map((dossier) =>
    compilerLecon(dossier, {
      md,
      colorateur,
      rendreMermaid: options.rendreMermaid,
      exercices: indexerExercices(exercices),
      sujetsFreres,
    }),
  );
  // APRÈS le `.map()`, et c'est le seul endroit possible : un `{voir="module:<slug>"}` se juge
  // contre les AUTRES leçons du sujet, qu'une compilation module par module ne voit pas.
  verifierRenvoisDeModule(lecons, dossiers);
  return {
    lecons,
    feuille: assemblerFeuille(colorateur.feuille()),
    horaire: lireHoraire(racine),
    exercices,
    // LES NOMS SEULEMENT, POUR LE JOURNAL (L-005) : un registre qui n'a rien vu doit se voir, sinon
    // « aucun sujet frère » et « lecture du registre débranchée » s'écrivent exactement pareil.
    sujetsFreres: [...sujetsFreres.keys()],
  };
}

/**
 * Lit le `exercices.json` d'une racine, s'il y en a un.
 *
 * ⚠️ AUCUNE VALIDATION ICI, ET C'EST DÉLIBÉRÉ — même stratification, même raison que `lireHoraire`
 * juste en dessous. Ce qui est refusé, en revanche, c'est un JSON illisible : un fichier tronqué ne
 * devient pas un registre vide en silence, ce qui ferait échouer chaque `ref` sur la mauvaise cause.
 *
 * @param {string} racine chemin absolu
 * @returns {ExercicesCompiles | null}
 */
function lireExercices(racine) {
  const chemin = join(racine, FICHIER_EXERCICES);
  if (!existsSync(chemin)) return null;
  try {
    return /** @type {ExercicesCompiles} */ (JSON.parse(readFileSync(chemin, 'utf8')));
  } catch (e) {
    return echec(`${afficher(chemin)} : JSON illisible`, [
      e instanceof Error ? e.message : String(e),
    ]);
  }
}

/**
 * Indexe le registre pour la résolution des `ref` — séance, puis référence.
 *
 * L'index est construit UNE FOIS par racine et partagé par toutes ses leçons : reconstruire une
 * `Map` par module ferait, sur treize modules, treize fois le même travail sur la même donnée.
 *
 * @param {ExercicesCompiles | null} registre
 * @returns {RegistreIndexe | null}
 */
function indexerExercices(registre) {
  if (registre === null) return null;
  /** @type {Map<number, Map<string, { titre: string, enonce: string }>>} */
  const parSeance = new Map();
  for (const seance of registre.seances) {
    /** @type {Map<string, { titre: string, enonce: string }>} */
    const feuille = new Map();
    for (const exercice of seance.exercices) {
      feuille.set(exercice.reference, { titre: exercice.titre, enonce: exercice.enonce });
    }
    parSeance.set(seance.numero, feuille);
  }
  return { parSeance };
}

/**
 * Lit le `horaire.json` d'une racine, s'il y en a un.
 *
 * ⚠️ AUCUNE VALIDATION ICI, ET C'EST DÉLIBÉRÉ — contrairement au reste de ce fichier, qui refuse
 * tout ce qu'il ne comprend pas. La raison est la stratification du pipeline : `valider.mjs` porte
 * `schemas/horaire.schema.json` et les deux règles hors schéma, et `build.mjs` le fait tourner
 * AVANT ce compilateur. Dupliquer le schéma ici donnerait deux autorités sur la même forme, donc
 * une occasion de plus qu'elles divergent. Ce qui est refusé, en revanche, c'est un JSON illisible :
 * un fichier tronqué ne devient pas un horaire vide en silence.
 *
 * @param {string} racine chemin absolu
 * @returns {HoraireCompile | null}
 */
function lireHoraire(racine) {
  const chemin = join(racine, FICHIER_HORAIRE);
  if (!existsSync(chemin)) return null;
  try {
    return /** @type {HoraireCompile} */ (JSON.parse(readFileSync(chemin, 'utf8')));
  } catch (e) {
    return echec(`${afficher(chemin)} : JSON illisible`, [e instanceof Error ? e.message : String(e)]);
  }
}

/**
 * UN SUJET FRÈRE : un chemin, et — seulement s'il est consulté — l'horaire lu.
 *
 * @typedef {object} SujetFrere
 * @property {string} chemin chemin absolu de son `horaire.json`
 * @property {string} affiche le même, tel qu'il s'écrit dans un message
 * @property {{ code: string, numeros: ReadonlySet<number> } | null} resolu mémoïsation
 */

/**
 * --- LE REGISTRE DES SUJETS FRÈRES (§3bis, lot 1b) ---
 *
 * Les dossiers **frères de la racine** portant un `horaire.json`, indexés par leur **nom de
 * dossier**. Jumeau de celui de `valider.mjs` — duplication ASSUMÉE, comme la matrice d'attributs :
 * ce compilateur ne dépend pas du validateur, et doit refuser tout seul ce que l'autre refuse.
 *
 * 🔴 LA VALEUR ÉCRITE PAR L'AUTEUR EST UNE CLEF DE `Map`, JAMAIS UN COMPOSANT DE CHEMIN. On BALAIE
 * le dossier parent, on construit le registre depuis ce que le système de fichiers rend, PUIS on
 * fait un `.get(valeur)`. Un `join(parent, valeurDeLAuteur)` — sous quelque forme que ce soit —
 * offrirait une traversée de chemin à un champ d'auteur (famille S-003/S-020 de
 * `.claude/rules/security.md` §4) : `cours="../../.."` deviendrait un chemin au lieu d'une clef
 * absente. Un lien symbolique ne rentre pas : `Dirent.isDirectory()` décrit l'entrée elle-même.
 *
 * 🔴 LA CLEF EST LE NOM DE DOSSIER, PAS LE `sujet` DÉCLARÉ : les racines de fixtures du dépôt
 * déclarent toutes `"sujet": "securite-web"`, et une clef prise sur ce champ les mettrait en
 * collision.
 *
 * ⚠️ AUCUNE LECTURE ICI : le registre ne retient que des chemins. Lire les horaires frères d'avance
 * ferait échouer la compilation d'une racine sur le fichier d'une AUTRE — mortel sous
 * `__fixtures__/invalides/`, où 52 cas sont frères les uns des autres et où plusieurs portent un
 * horaire volontairement fautif.
 *
 * @param {string} racine chemin absolu
 * ⚠️ LE BALAYAGE LUI-MÊME EST PARTAGÉ — `./sujets-freres.mjs`, importé par les DEUX copies. La
 * duplication est le contrat de ce dépôt pour ce qui JUGE ; recenser des dossiers ne juge rien, et
 * une divergence sur « quels frères existent » serait invisible à tout appariement de messages (le
 * raisonnement complet vit dans l'en-tête du module partagé). Ce qui reste ici est la seule chose
 * propre à cette copie : la FORME que prend un frère une fois recensé.
 *
 * @returns {Map<string, SujetFrere>}
 */
function construireRegistreDesSujetsFreres(racine) {
  /** @type {Map<string, SujetFrere>} */
  const registre = new Map();
  for (const [nom, chemin] of recenserLesSujetsFreres(racine)) {
    registre.set(nom, { chemin, affiche: afficher(chemin), resolu: null });
  }
  return registre;
}

/**
 * LA FORME D'UN CODE DE COURS DU RÉSEAU COLLÉGIAL — la jumelle de `cours.code` dans
 * `schemas/horaire.schema.json`. Recopiée, jamais dérivée du schéma : une valeur autorisée doit
 * l'avoir été par un humain, pas par ce que la prochaine version du schéma y mettra (S-005).
 */
const MOTIF_CODE_DE_COURS = /^[0-9A-Z]{3}-[0-9A-Z]{3}-[0-9A-Z]{2}$/;

/**
 * Lit l'horaire d'UN sujet frère et n'en garde que ce qu'un renvoi exige : le CODE du cours et les
 * numéros de séance.
 *
 * ⚠️ AUCUNE VALIDATION DE SCHÉMA ICI, ET C'EST DÉLIBÉRÉ — exactement la politique de `lireHoraire`
 * ci-dessus, pour la même raison : `valider.mjs` porte `schemas/horaire.schema.json`, il confronte
 * chaque horaire frère qu'il consulte, et `build.mjs` le fait tourner AVANT ce compilateur.
 * Dupliquer le schéma donnerait deux autorités sur la même forme. Ce qui est refusé, en revanche,
 * c'est un fichier dont on ne peut RIEN tirer : JSON illisible, ou `cours.code` absent — sans quoi
 * le contrat compilé porterait un `cours: undefined` que le rendu n'afficherait simplement pas,
 * silencieusement.
 *
 * @param {string} nom nom de dossier du sujet cité
 * @param {SujetFrere} frere muté sur place — un même sujet cité dix fois n'est lu qu'une
 * @param {Contexte} ctx
 * @returns {{ code: string, numeros: ReadonlySet<number> }}
 */
function lireHoraireDUnSujetFrere(nom, frere, ctx) {
  if (frere.resolu !== null) return frere.resolu;
  /** @type {{ cours?: { code?: unknown }, seances?: unknown }} */
  let donnees;
  try {
    donnees = JSON.parse(readFileSync(frere.chemin, 'utf8'));
  } catch (e) {
    return echec(`${ctx.nomFichier} : « ${frere.affiche} » : JSON illisible`, [
      e instanceof Error ? e.message : String(e),
      `le renvoi cite le cours « ${nom} », dont l'horaire ne se lit pas`,
    ]);
  }
  const code = donnees.cours?.code;
  if (typeof code !== 'string' || code === '') {
    return echec(`${ctx.nomFichier} : « ${frere.affiche} » n'a pas de « cours.code »`, [
      `le renvoi cite le cours « ${nom} », dont le CODE est ce que le rendu affiche`,
    ]);
  }
  // 🔴 LA GRAMMAIRE DU CODE EST POSÉE ICI AUSSI, ET PAS SEULEMENT DANS LE SCHÉMA — S-026 À LA
  // LETTRE (constat de la revue de sécurité du 2026-09-08, PR #52). Le schéma vit dans
  // `valider.mjs`, qui tourne AVANT ce compilateur sur le chemin de `build.mjs` : la dette était
  // donc fermée pour le PIPELINE, pas pour cette FONCTION. Or c'est elle, et elle seule, qui pose
  // `code` au contrat compilé, d'où il part au rendu — le jour où un appelant écrirait l'artéfact
  // sans passer par le validateur, cette copie serait la dernière autorité. Le littéral est celui
  // de `cours.code` dans schemas/horaire.schema.json, RECOPIÉ ET REVU À LA MAIN plutôt que dérivé
  // du schéma : une liste blanche dérivée autorise tout ce qu'une future version y mettra (S-005).
  if (!MOTIF_CODE_DE_COURS.test(code)) {
    return echec(
      `${ctx.nomFichier} : « ${frere.affiche} » porte un « cours.code » de forme inattendue`,
      [
        `lu : « ${code} » — forme attendue : 420-4P2-HU (trois blocs, chiffres et MAJUSCULES)`,
        `le renvoi cite le cours « ${nom} », et ce code part tel quel au rendu`,
      ],
    );
  }
  const seances = donnees.seances;
  if (!Array.isArray(seances)) {
    return echec(`${ctx.nomFichier} : « ${frere.affiche} » n'a pas de tableau « seances »`, [
      `le renvoi cite le cours « ${nom} », dont la séance doit se vérifier contre son horaire`,
    ]);
  }
  /** @type {Set<number>} */
  const numeros = new Set();
  for (const seance of seances) {
    const numero = /** @type {{ numero?: unknown }} */ (seance)?.numero;
    if (typeof numero === 'number') numeros.add(numero);
  }
  frere.resolu = { code, numeros };
  return frere.resolu;
}

/**
 * Résout un renvoi qui cite un AUTRE cours : CINQ refus, puis le code du cours cité.
 *
 * ⚠️ CE COMPTE DISAIT « QUATRE » JUSQU'AU LOT 1b-B, ET IL AVAIT TORT. Le juge en porte cinq, et
 * `lireHoraireDUnSujetFrere`, qu'il appelle, en porte QUATRE de plus (JSON illisible, `cours.code`
 * absent, `cours.code` de forme inattendue, `seances` qui n'est pas un tableau) — neuf en tout pour
 * ce chemin. Le compte périmé a servi à dimensionner le lot de ses contrôles positifs, qui a donc
 * été planifié sur une population fausse : on ne recense pas des branches en énumérant les façons
 * d'écrire un attribut, mais en lisant le juge. Les neuf sont désormais tenues une par une par
 * `src/pipeline-contenu-compilation.spec.ts`, et une mutation mesure que le garde de `cours.code`
 * discrimine (S-026).
 *
 * L'ordre des refus est celui de `causeDuRenvoiInterCours` dans `valider.mjs` — les deux copies
 * voient la même chaîne et doivent rendre des causes DISTINCTES mais CONCORDANTES : ici un échec
 * de compilation, là-bas une anomalie nommée.
 *
 * @param {string} libelle
 * @param {string} coursBrut la valeur d'auteur — un NOM DE DOSSIER, jamais un code
 * @param {string | undefined} seanceBrute déjà confrontée à la grammaire du numéro par l'appelante
 * @param {Contexte} ctx
 * @returns {{ code: string, seance: number }}
 */
function resoudreRenvoiInterCours(libelle, coursBrut, seanceBrute, ctx) {
  // ⚠️ CONTRÔLE DE FORME, PAS GARDE-FOU : ce qui rend `cours="…"` inoffensif est le registre
  // (une clef, pas un chemin). Ce motif ne sert qu'à donner à `cours="../x"` sa faute PROPRE
  // plutôt que de le laisser sortir sous « sujet inconnu ».
  if (!MOTIF_NOM_DE_SUJET.test(coursBrut) || coursBrut.length > LONGUEUR_MAX_NOM_DE_SUJET) {
    echec(
      `${ctx.nomFichier} : « ${libelle} » — « ${ATTRIBUT_COURS}="${coursBrut}" » n'est pas un nom de dossier de sujet`,
      [
        `minuscules, chiffres et tirets simples, ${LONGUEUR_MAX_NOM_DE_SUJET} caractères au plus`,
        'docs/contenu/ancrage-au-cours.md §3bis',
      ],
    );
  }
  if (coursBrut === ctx.nomDeLaRacine) {
    echec(
      `${ctx.nomFichier} : « ${libelle} » — « ${ATTRIBUT_COURS}="${coursBrut}" » nomme le sujet de ce module lui-même`,
      [
        "l'attribut est superflu : retirez-le",
        'docs/contenu/ancrage-au-cours.md §3bis',
      ],
    );
  }
  const frere = ctx.sujetsFreres.get(coursBrut);
  if (frere === undefined) {
    const cites = [...ctx.sujetsFreres.keys()].map((nom) => `« ${nom} »`);
    echec(
      `${ctx.nomFichier} : « ${libelle} » cite le cours « ${coursBrut} », qui n'est pas un sujet frère de cette racine`,
      [
        cites.length === 0
          ? `aucun dossier voisin de la racine ne porte de « ${FICHIER_HORAIRE} »`
          : `sujets connus : ${cites.join(', ')}`,
        'docs/contenu/ancrage-au-cours.md §3bis',
      ],
    );
  }
  if (seanceBrute === undefined) {
    echec(
      `${ctx.nomFichier} : « ${libelle} » cite le cours « ${coursBrut} » sans « ${ATTRIBUT_SEANCE} »`,
      [
        'la séance du frontmatter appartient à CE cours-ci : elle ne peut pas servir de défaut à un renvoi vers un autre',
        `« ${ATTRIBUT_SEANCE} » est obligatoire dès que « ${ATTRIBUT_COURS} » est écrit`,
      ],
    );
  }
  const seance = Number(seanceBrute);
  const horaire = lireHoraireDUnSujetFrere(coursBrut, frere, ctx);
  if (!horaire.numeros.has(seance)) {
    echec(
      `${ctx.nomFichier} : « ${libelle} » cite la séance ${seance} du cours « ${coursBrut} », absente de son horaire`,
      [`« ${frere.affiche} » ne porte pas de séance ${seance}`],
    );
  }
  return { code: horaire.code, seance };
}

// ---------------------------------------------------------------------------
// Ligne de commande
// ---------------------------------------------------------------------------

/**
 * @returns {{ racine: string, json: boolean, css: string | null }}
 */
function lireArguments() {
  const args = process.argv.slice(2);
  let racine = RACINE_PAR_DEFAUT;
  /** @type {string | null} */
  let css = FEUILLE_COLORATION_PAR_DEFAUT;
  let json = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--racine' || arg === '--css') {
      const valeur = args[i + 1];
      if (valeur === undefined || valeur.startsWith('--')) {
        echec(`l'option ${arg} attend un chemin`);
      }
      if (arg === '--racine') racine = valeur;
      else css = valeur;
      i += 1;
    } else if (arg === '--sans-css') css = null;
    else if (arg === '--json') json = true;
    else echec(`option inconnue : « ${String(arg)} »`);
  }
  return { racine, json, css };
}

async function principal() {
  const { racine, json, css } = lireArguments();
  const racineAbsolue = resolve(RACINE_DEPOT, racine);
  const { lecons, feuille } = await compilerRacine(racineAbsolue);

  if (css !== null) {
    const cible = resolve(RACINE_DEPOT, css);
    mkdirSync(dirname(cible), { recursive: true });
    writeFileSync(cible, feuille, 'utf8');
  }

  // Le compte-rendu part sur stderr : `--json` doit pouvoir se rediriger sans que rien d'autre ne
  // pollue le flux.
  console.error(
    `compiler-markdown : ${lecons.length} leçon(s) compilée(s) depuis ${afficher(racineAbsolue)}` +
      (css === null ? '' : ` · feuille : ${css}`),
  );
  if (json) process.stdout.write(JSON.stringify({ lecons }, null, 2));
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await principal();
}
