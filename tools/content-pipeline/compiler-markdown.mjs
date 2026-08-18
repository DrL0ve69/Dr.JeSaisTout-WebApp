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
 *      `tools/deploiement/generer-config-swa.mjs` refuse tout ` style="` de l'artéfact (les
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
 *         ::: vulnerable {lignes="2"}
 *         ```php
 *         …
 *         ```
 *         Texte de l'annotation portée par la ligne 2.
 *         :::
 *         ::: corrige
 *         ```php
 *         …
 *         ```
 *         Texte de l'annotation générale (ligne 0 = tout le bloc).
 *         :::
 *         ::::
 *
 *     `{langage="php"}` est accepté sur `comparaison` : c'est alors une ASSERTION, vérifiée contre
 *     la langue réelle des clôtures. `{lignes="2,5"}` porte l'annotation sur ces lignes-là.
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
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Ajv } from 'ajv';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import conteneurPlugin from 'markdown-it-container';
import { createHighlighter } from 'shiki';
import { transformerStyleToClass } from '@shikijs/transformers';

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
 * Les six langues du contrat (`type Langage` de `types.d.ts`) — liste FERMÉE.
 *
 * Deux formes du même ensemble, et c'est délibéré : la LISTE est typée `Langage[]` (elle alimente
 * Shiki, qui exige des noms de grammaires connus), l'ENSEMBLE est typé sur `string` (il teste une
 * langue lue dans un fichier, donc encore inconnue). Un `Set<Langage>.has(string)` ne compile pas.
 */
/** @type {readonly Langage[]} */
const LANGAGES = ['php', 'csharp', 'typescript', 'sql', 'bash', 'json'];
/** @type {ReadonlySet<string>} */
const NOMS_LANGAGES = new Set(LANGAGES);

/** Les trois encadrés, et la variante qu'ils portent au contrat. */
/** @type {ReadonlyArray<'attention' | 'note' | 'a-retenir'>} */
const VARIANTES_ENCADRE = ['attention', 'note', 'a-retenir'];
/** @type {ReadonlySet<string>} */
const ENCADRES = new Set(VARIANTES_ENCADRE);

/**
 * Conteneurs `:::` autorisés — liste FERMÉE, la MÊME que celle de `valider.mjs`. Deux listes
 * séparées est une redondance assumée : le compilateur ne suppose pas que le validateur a tourné,
 * et le lot 5 les rapprochera par un test plutôt que par un import (un import ferait des deux une
 * seule vérité, donc une seule occasion de se tromper).
 */
/** @type {ReadonlySet<string>} */
const CONTENEURS_AUTORISES = new Set([
  'comparaison',
  'vulnerable',
  'corrige',
  ...VARIANTES_ENCADRE,
]);

/** Thèmes Shiki — un clair, un sombre, choisis en paire pour la bascule de thème du site. */
const THEME_CLAIR = 'github-light';
const THEME_SOMBRE = 'github-dark';

/** Préfixe des classes de coloration. Court, sans collision possible avec le design system. */
const PREFIXE_CLASSE = 'clr-';

/** Marqueur de doute du `professeur-web` — compté avant retrait, exigé absent après rendu. */
const MARQUEUR_DOUTE = 'à-vérifier';

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
 * markdown-it-container n'enregistre que les six noms connus ; un `::: astuce` n'est donc pas
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
      const ouverture = /^[ \t]{0,3}:{3,}(?!:)[ \t]*(\S+)/.exec(ligne);
      const nom = ouverture?.[1];
      if (nom === undefined) continue;
      if (!CONTENEURS_AUTORISES.has(nom)) {
        echec(`${nomFichier} : conteneur inconnu`, [
          `ligne ${numero} DU CORPS (frontmatter exclu) : « ::: ${nom} » n'appartient pas à la liste fermée`,
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
 * @returns {Promise<Colorateur>}
 */
async function creerColorateur() {
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
        transformers: [transformateur],
      });
      // CONTRÔLE DE CONSERVATION (patron S-003) : on n'affirme pas que le transformateur a marché,
      // on le VÉRIFIE. Un `style=` survivant passerait le lint, passerait les tests, et ferait
      // rougir `generer-config-swa.mjs` bien plus tard — ou, pire, élargirait la CSP du site.
      if (/\sstyle\s*=/i.test(html) || /<style[\s>]/i.test(html)) {
        echec(`${nomFichier} : la coloration a produit du style en ligne`, [
          'la CSP du site est à hachages — `style=` est refusé, `<style>` élargirait style-src',
          'vérifier que `transformerStyleToClass` est bien passé au rendu Shiki',
        ]);
      }
      return html;
    },
    feuille() {
      return transformateur.getCSS();
    },
  };
}

/**
 * Assemble la feuille SCSS générée : les classes de Shiki, puis la bascule clair/sombre.
 *
 * Les couleurs en dur qu'on lit ici sont la PALETTE d'un thème de coloration syntaxique, pas des
 * couleurs de composant : elles n'ont pas d'équivalent en jetons sémantiques (le design system
 * n'a pas de jeton « mot-clé de langage »). Le fichier est généré et gitignoré ; il ne se modifie
 * pas à la main.
 *
 * @param {string} classes CSS rendu par `transformerStyleToClass`
 * @returns {string}
 */
function assemblerFeuille(classes) {
  return `// FICHIER GÉNÉRÉ par tools/content-pipeline/compiler-markdown.mjs — NE PAS ÉDITER.
// Coloration syntaxique Shiki (${THEME_CLAIR} / ${THEME_SOMBRE}), sortie en CLASSES et non en
// styles en ligne : la CSP du site est à hachages et refuse tout attribut « style ».
// Chaque classe ne porte que deux propriétés personnalisées ; la bascule ci-dessous décide
// laquelle s'applique, avec les MÊMES sélecteurs que src/styles/_themes.scss.

${classes}

.shiki {
  overflow-x: auto;
  background-color: var(--shiki-light-bg);
}

.shiki,
.shiki span {
  color: var(--shiki-light);
}

@media screen and (prefers-color-scheme: dark) {
  :root:not([data-theme]) .shiki {
    background-color: var(--shiki-dark-bg);
  }

  :root:not([data-theme]) .shiki,
  :root:not([data-theme]) .shiki span {
    color: var(--shiki-dark);
  }
}

// « @media screen » et non une règle nue : à l'impression, src/styles.scss force les jetons du
// thème CLAIR pour TOUS les visiteurs, épinglés ou non. Un bloc de code resté sombre gaspillerait
// l'encre et sortirait illisible — exactement la panne que la cascade d'impression a corrigée
// ailleurs (E1-ST1).
@media screen {
  :root[data-theme='sombre'] .shiki {
    background-color: var(--shiki-dark-bg);
  }

  :root[data-theme='sombre'] .shiki,
  :root[data-theme='sombre'] .shiki span {
    color: var(--shiki-dark);
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
 * @returns {Record<string, string>}
 */
function lireAttributs(info, nom, clefsAutorisees, nomFichier) {
  const reste = info.trim().slice(nom.length).trim();
  if (reste === '') return {};
  const accolade = /^\{(.*)\}$/.exec(reste);
  if (accolade === null) {
    echec(`${nomFichier} : « ::: ${nom} » suivi de « ${reste} »`, [
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
    if (!clefsAutorisees.includes(clef)) {
      echec(`${nomFichier} : attribut « ${clef} » inconnu sur « ::: ${nom} »`, [
        `attendus : ${clefsAutorisees.join(', ') || '(aucun)'}`,
      ]);
    }
    attributs[clef] = paire[2] ?? '';
  }
  // CE QUI RESTE une fois les paires reconnues retirées doit être vide. Sans ce contrôle,
  // `{lignes=2}` (guillemets oubliés) rendrait un objet VIDE : l'annotation partirait sur la ligne
  // 0 sans que rien ne le signale. Ce qui n'est pas compris est refusé, jamais ignoré.
  const residu = corps.replace(MOTIF_PAIRE, '').trim();
  if (residu !== '') {
    echec(`${nomFichier} : attributs illisibles sur « ::: ${nom} » — « ${residu} »`, [
      'forme attendue : {clef="valeur"}, valeurs toujours entre guillemets droits',
    ]);
  }
  return attributs;
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
 * Lit un `::: vulnerable` ou `::: corrige` : exactement une clôture de code, plus une prose
 * facultative qui devient l'annotation.
 *
 * @param {readonly JetonMd[]} enfants
 * @param {JetonMd} ouverture
 * @param {'vulnerable' | 'corrige'} nom
 * @param {Contexte} ctx
 * @returns {{ langage: Langage, exemple: ExempleCode }}
 */
function lireExemple(enfants, ouverture, nom, ctx) {
  const clotures = enfants.filter((j) => j.type === 'fence');
  const cloture = clotures[0];
  if (cloture === undefined || clotures.length !== 1) {
    echec(`${ctx.nomFichier} : « ::: ${nom} » contient ${clotures.length} bloc(s) de code`, [
      'il en faut exactement un — le code comparé',
    ]);
  }
  const langage = langageDe(cloture, ctx);
  const attributs = lireAttributs(ouverture.info, nom, ['lignes'], ctx.nomFichier);

  const texte = enfants
    .filter((j) => j.type === 'inline')
    .map((j) => j.content.trim())
    .filter((t) => t !== '')
    .join(' ');

  /** @type {AnnotationLigne[]} */
  const annotations = [];
  if (texte !== '') {
    // `ligne: 0` = commentaire portant sur TOUT le bloc. C'est la valeur qu'E2-ST4 doit traiter à
    // part : un numéro de ligne 0 n'existe pas dans un extrait, l'ambiguïté est donc exclue.
    const lignes = (attributs['lignes'] ?? '0').split(',');
    for (const brute of lignes) {
      const numero = Number(brute.trim());
      if (!Number.isInteger(numero) || numero < 0) {
        echec(`${ctx.nomFichier} : « lignes="${attributs['lignes'] ?? ''}" » sur « ::: ${nom} »`, [
          'valeurs attendues : des entiers positifs séparés par des virgules',
        ]);
      }
      annotations.push({ ligne: numero, texte });
    }
  } else if (attributs['lignes'] !== undefined) {
    echec(`${ctx.nomFichier} : « ::: ${nom} » annonce des lignes sans texte d'annotation`, [
      'ajouter le paragraphe qui explique la ligne désignée, ou retirer {lignes="…"}',
    ]);
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
 * @param {JetonMd} jeton jeton rencontré, dont le type n'est pas `container_vulnerable_open`
 * @param {string} nomFichier fichier de contenu, pour nommer la faute
 * @returns {void} rend la main si le jeton est un simple résidu de balisage à ignorer
 */
function refuserJetonHorsPaire(jeton, nomFichier) {
  if (jeton.type === 'container_corrige_open') {
    echec(`${nomFichier} : « ::: corrige » sans « ::: vulnerable » juste avant`);
  }
  if (jeton.nesting === 1 || jeton.type === 'fence') {
    echec(`${nomFichier} : « :::: comparaison » ne peut contenir que des paires`, [
      `« ${jeton.type} » rencontré — attendu « ::: vulnerable » puis « ::: corrige »`,
    ]);
  }
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
  if (!ENCADRES.has(/** @type {'attention' | 'note' | 'a-retenir'} */ (nom))) {
    echec(`${ctx.nomFichier} : « ::: ${nom} » hors d'un « :::: comparaison »`, [
      'vulnerable et corrige n’existent qu’appariés, à l’intérieur d’une comparaison',
    ]);
  }
  lireAttributs(ouverture.info, nom, [], ctx.nomFichier);
  return {
    type: 'encadre',
    variante: /** @type {'attention' | 'note' | 'a-retenir'} */ (nom),
    blocs: construireBlocs(enfants, ctx),
  };
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
 * @typedef {{ titre: string, niveau: NiveauTitre, jetons: JetonMd[] }} SectionEnCours
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
 * Fige une section accumulée en section compilée, en lui attribuant son ancre.
 *
 * @param {SectionEnCours} courante
 * @param {Set<string>} ancres ancres déjà attribuées — mutée par `ancrer` pour garantir l'unicité
 * @param {Contexte} ctx
 * @returns {SectionCompilee}
 */
function cloturerSection(courante, ancres, ctx) {
  return {
    titre: courante.titre,
    ancre: ancrer(courante.titre, ancres),
    niveau: courante.niveau,
    blocs: construireBlocs(courante.jetons, ctx),
  };
}

/**
 * Traite un titre rencontré dans le flux : `#` (titre de la leçon, hors sommaire), `##`/`###`
 * (ouverture d'une section), ou un niveau inférieur qui n'en est pas un.
 *
 * @param {EtatDecoupage} etat muté sur place
 * @param {string} titre texte du titre
 * @param {number} niveau niveau ATX lu sur la balise (`h1` → 1, `h2` → 2…)
 * @param {Contexte} ctx
 * @returns {boolean} `true` si le titre a été consommé comme titre ; `false` pour un `h4` et
 *   au-delà, qui n'est pas une section du sommaire mais du contenu légitime
 */
function traiterTitre(etat, titre, niveau, ctx) {
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
  etat.courante = { titre, niveau: /** @type {NiveauTitre} */ (niveau), jetons: [] };
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
 * Compte les ancres `[[quiz]]` d'une liste de blocs, ENCADRÉS COMPRIS.
 *
 * La récursion n'est pas une précaution : `construireBlocs` descend dans le contenu de
 * chaque `::: note` / `::: attention` / `::: a-retenir`, donc une ancre y produit bien un
 * bloc `ancre-quiz` — invisible à un `flatMap` de premier niveau. Voir le contrôle qui
 * appelle cette fonction pour ce que ce trou coûtait.
 *
 * @param {readonly BlocContenu[]} blocs
 * @returns {number}
 */
function compterAncresQuiz(blocs) {
  let total = 0;
  for (const bloc of blocs) {
    if (bloc.type === 'ancre-quiz') total += 1;
    else if (bloc.type === 'encadre') total += compterAncresQuiz(bloc.blocs);
  }
  return total;
}

/**
 * Compile UNE leçon.
 *
 * @param {string} dossier chemin absolu du dossier contenant `lecon.md`
 * @param {{ md: InstanceType<typeof MarkdownIt>, colorateur: Colorateur, rendreMermaid?: Contexte['rendreMermaid'] }} outils
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
  };
  const sections = construireSections(outils.md.parse(nettoye.corps, {}), ctx);

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
  // d'empêcher. `encadre` est le seul bloc qui en imbrique d'autres (`comparaison`
  // porte des `exemples`, pas des blocs).
  const ancresQuiz = compterAncresQuiz(sections.flatMap((section) => section.blocs));
  if (ancresQuiz !== 1) {
    echec(`${nomFichier} : le corps porte ${ancresQuiz} ancre(s) « [[quiz]] », une seule attendue`, [
      ancresQuiz === 0
        ? 'le quiz est obligatoire mais ne s’afficherait nulle part — ajouter un paragraphe valant exactement « [[quiz]] »'
        : 'le même quiz serait rendu plusieurs fois, donc les `id` de ses questions dupliqués dans le document',
      'gabarit : docs/contenu/pipeline-contenu.md §Gabarit de leçon',
    ]);
  }

  const slug = String(donnees['slug']);

  return {
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
 * @param {string} racine chemin absolu
 * @param {{ rendreMermaid?: Contexte['rendreMermaid'] }} [options]
 * @returns {Promise<{ lecons: LeconCompilee[], feuille: string }>}
 */
export async function compilerRacine(racine, options = {}) {
  // `content/cours/securite-web/` n'existe pas encore (E3 l'ouvrira). Sans ce garde-fou, l'appel
  // par défaut mourrait sur une pile ENOENT ; avec lui, il rend zéro leçon et une feuille vide,
  // ce qui garde `src/styles.scss` compilable. Une racine EXPLICITE introuvable, elle, est une
  // faute d'appel : le lot 4 la fera échouer en code 1 depuis `build.mjs`.
  const colorateur = await creerColorateur();
  if (!existsSync(racine)) {
    console.error(`compiler-markdown : aucune racine « ${afficher(racine)} » — 0 leçon`);
    return { lecons: [], feuille: assemblerFeuille(colorateur.feuille()) };
  }
  const md = creerMarkdownIt();
  const lecons = recenserLecons(racine).map((dossier) =>
    compilerLecon(dossier, { md, colorateur, rendreMermaid: options.rendreMermaid }),
  );
  return { lecons, feuille: assemblerFeuille(colorateur.feuille()) };
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
