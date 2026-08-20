// =============================================================================
// Sommaire du cours — masquage des brouillons, fidélité au contenu, et la chaîne
// complète Quiz → ProgressionService → Sommaire (E2-ST6, lot E)
// -----------------------------------------------------------------------------
// CE QUE CE FICHIER MESURE, ET QUE RIEN D'AUTRE NE VOIT. Les specs unitaires du
// lot A/B tiennent chacun un maillon : `progression.spec.ts` sait écrire et relire
// `localStorage`, `sommaire.spec.ts` sait dériver un badge d'un état donné,
// `quiz.spec.ts` sait qu'un quiz corrigé appelle `enregistrerQuiz`. Aucun ne
// traverse la chaîne : deux composants montés sur DEUX ROUTES DIFFÉRENTES, qui ne
// se parlent que par `core/progression/` et par le stockage du navigateur. C'est
// exactement la frontière que la règle d'architecture d'E6 protège (« aucune
// feature n'importe une autre feature ») — et une frontière ne se prouve qu'en la
// franchissant pour de vrai, dans un vrai navigateur, sous la CSP servie.
//
// 🔴 RECALIBRÉ LE 2026-08-20 (clôture d'E3-ST1) — TROIS CHANGEMENTS, ET LEURS RAISONS.
//
// (1) LE VOLET « ÉTAT VIDE » A ÉTÉ RETIRÉ DE CETTE SUITE. Il vérifiait que le
//     sommaire annonce « Modules en préparation. » quand `content/` ne porte aucune
//     leçon. Ce cas n'a plus de sujet : la leçon 01 est publiée, et il n'existe plus
//     d'artéfact sans leçon à bâtir. Un test e2e qui ne peut PLUS JAMAIS s'exécuter
//     n'est pas un filet, c'est un gate vide (L-005) — il coûterait un `skip`
//     permanent en laissant croire à une couverture. L'état vide reste couvert là où
//     il est réellement atteignable : par le test unitaire
//     `src/app/features/cours/sommaire/sommaire.spec.ts`, describe « état vide », qui
//     monte le composant avec un manifeste VIDE et exige « en préparation », aucun
//     résumé et aucune liste. C'est le bon niveau : le manifeste y est une entrée, pas
//     un fait de dépôt.
//
// (2) LE MASQUAGE DU BROUILLON MESURE L'INVARIANT, PLUS L'INVENTAIRE. L'ancien test
//     exigeait nommément `lecon-brouillon` absent et `lecon-temoin` présent — deux
//     slugs qui n'existaient que dans la fixture témoin. Ce qui doit être vrai n'est
//     pas « ces deux-là », c'est : TOUTE leçon de `content/cours/securite-web/` en
//     `statut: brouillon` est absente de `dist/`, et TOUTE leçon en `statut: publiee`
//     y est présente ET listée exactement une fois dans le sommaire. La liste des
//     leçons est donc LUE DANS `content/`, jamais écrite ici : publier la leçon 02 ne
//     demande de toucher à rien.
//
// (3) LE QUIZ EST RÉPONDU À PARTIR DE SON JSON, PAS D'UN SCRIPT ÉCRIT À LA MAIN.
//     `repondreJusteAuQuizTemoin` connaissait les cinq questions de la fixture par
//     cœur (libellés compris). La leçon 01 en porte huit, et les leçons suivantes en
//     porteront autre chose. La fonction lit désormais `quiz.json` sur le disque et en
//     déduit la bonne réponse de chaque forme, et le verdict attendu (« N bonnes
//     réponses sur N ») se calcule à partir du NOMBRE DE QUESTIONS DU FICHIER.
//
// 🔴 ET LE CROISEMENT DEUX SOURCES EST VOULU, C'EST LUI L'ASSERTION. Le DOM d'un
// côté, `quiz.json` de l'autre — deux chemins indépendants jusqu'à la page. Un quiz
// qui perdrait une question au compilateur ferait diverger les deux comptes, et c'est
// l'égalité qui le dit. Le contraire — faire écrire à l'auteur, dans le test, le
// nombre qu'on prétend vérifier — serait le patron S-014 : un garde-fou dont l'entrée
// fabrique la preuve qu'il exige n'en est pas un.
//
// 🔴 LE MASQUAGE DU BROUILLON SE VÉRIFIE AU DISQUE, JAMAIS PAR UNE 404.
// C'est l'exigence explicite du plan v2, et la raison est structurelle : une 404 sur
// une route de brouillon serait rendue à l'identique par TROIS situations dont deux
// sont des pannes — (1) le brouillon est bien exclu du prerender, ce qu'on veut
// prouver ; (2) l'artéfact mesuré ne porte AUCUNE leçon, donc le test serait vert sans
// rien avoir mesuré ; (3) le serveur est cassé. Un test qui accepte une 404 comme
// preuve est vert dans les trois cas. On interroge donc le système de fichiers, et on
// l'accompagne d'un CONTRÔLE POSITIF sur le même chemin de base : si le document d'une
// leçon PUBLIÉE n'est pas trouvé là où on le cherche, c'est le sondage qui est faux,
// pas le produit (mode d'échec L-035 — une prémisse de test fausse rougit sur un
// produit sain, et sa jumelle silencieuse : un chemin mal orthographié rend l'absence
// trivialement vraie).
//
// ⚠️ SÉLECTEURS PAR RÔLE ET PAR NOM ACCESSIBLE, pas par classe CSS. La bascule
// visuelle E6 va réécrire les feuilles de style de fond en comble ; elle ne doit
// pas réécrire ce fichier. Les seules exceptions sont les `#quiz-qN` (identifiants
// de document, pas de style — ils viennent de `PREFIXE_ID_QUESTION`) et le filtre
// `a[href^=…]`, qui porte sur la cible d'un lien, pas sur son habillage.
// =============================================================================

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { Locator, Page, expect, test } from '@playwright/test';

import { LECON_AVEC_QUIZ, exigerUneLeconAvecQuiz } from './aides/artefact-mesure';
import { attendreHydratation } from './aides/hydratation';

/** La route du sommaire — la seule route de cours du site, et elle existe toujours. */
const CHEMIN_SOMMAIRE = '/cours/securite-web/';

/** La racine, DANS LE DÉPÔT, des leçons de ce sujet — la source de vérité éditoriale. */
const RACINE_CONTENU = 'content/cours/securite-web';

/**
 * La racine, SUR LE DISQUE, des pages de leçon prerendues de ce sujet. Les sondages
 * ci-dessous en dérivent — c'est ce qui rend le contrôle positif capable d'attraper
 * une faute de frappe qui rendrait le contrôle négatif trivialement vrai.
 */
const RACINE_COURS_PRERENDUE = 'dist/dr-je-sais-tout/browser/cours/securite-web';

/**
 * Le document prerendu d'une leçon de ce sujet, tel que `swa start` le servirait.
 *
 * 🔴 UN SLUG VIDE EST REFUSÉ, EN SE NOMMANT (correctif du 2026-08-20). Une `lecon.md`
 * dont le frontmatter n'aurait pas de champ `slug:` donne `''`, et
 * `documentPrerendu('')` résout alors au document du SOMMAIRE lui-même — qui existe
 * toujours. L'étape 1 de « toute leçon publiée est prerendue » serait donc
 * trivialement vraie, et le contrôle positif du test des brouillons aussi. Le
 * chemin fabriqué ne doit jamais pouvoir désigner autre chose que ce qu'il nomme.
 */
function documentPrerendu(slug: string): string {
  if (slug === '') {
    throw new Error(
      "une leçon de content/ ne déclare pas de champ « slug: » dans son frontmatter : le chemin " +
        'prerendu qu’on en dériverait pointerait sur le sommaire, et rendrait le sondage disque ' +
        'trivialement vrai',
    );
  }
  return `${RACINE_COURS_PRERENDUE}/${slug}/index.html`;
}

/** Les libellés de badge de `Sommaire` (`LIBELLES_ETAT`), écrits ici tels qu'un visiteur les lit. */
const BADGE_A_COMMENCER = 'À commencer';
const BADGE_MAITRISE = 'Maîtrisé';

// -----------------------------------------------------------------------------
// Ce que `content/` déclare — lu, jamais recopié
// -----------------------------------------------------------------------------

/** Une leçon telle que son fichier source la déclare. */
interface LeconSource {
  /** Le dossier dans `content/`, avec son préfixe d'ordre (`01-fondamentaux`). */
  readonly dossier: string;
  /** Le `slug` du frontmatter — c'est LUI qui devient la route, pas le dossier. */
  readonly slug: string;
  readonly titre: string;
  readonly statut: string;
}

/**
 * Lit un champ scalaire du frontmatter. Volontairement minimal : on ne veut ici que
 * trois chaînes plates (`slug`, `titre`, `statut`), et ajouter un analyseur YAML à la
 * suite e2e pour cela serait une dépendance de plus sur la surface d'un gate. Les
 * champs structurés (`objectifs`, `fiches-sources`) ne sont pas lus.
 */
function champScalaire(frontmatter: string, nom: string): string {
  const trouve = new RegExp(`^${nom}:[ \\t]*(.*)$`, 'm').exec(frontmatter);
  return (trouve?.[1] ?? '').trim().replace(/^["']|["']$/g, '');
}

/** Toutes les leçons DÉCLARÉES dans `content/`, publiées comme brouillons. */
const LECONS_SOURCE: readonly LeconSource[] = existsSync(RACINE_CONTENU)
  ? readdirSync(RACINE_CONTENU, { withFileTypes: true })
      .filter((entree) => entree.isDirectory())
      .map((entree) => ({ dossier: entree.name, chemin: join(RACINE_CONTENU, entree.name, 'lecon.md') }))
      .filter((candidate) => existsSync(candidate.chemin))
      .map((candidate) => {
        const brut = readFileSync(candidate.chemin, 'utf8');
        // Le frontmatter est le premier bloc encadré de `---`. `\r?\n` parce que les
        // fins de ligne de ce poste sont mixtes (L-015).
        const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(brut)?.[1] ?? '';
        return {
          dossier: candidate.dossier,
          slug: champScalaire(frontmatter, 'slug'),
          titre: champScalaire(frontmatter, 'titre'),
          statut: champScalaire(frontmatter, 'statut'),
        };
      })
  : [];

const LECONS_PUBLIEES = LECONS_SOURCE.filter((lecon) => lecon.statut === 'publiee');
const LECONS_BROUILLON = LECONS_SOURCE.filter((lecon) => lecon.statut === 'brouillon');

/** Les slugs de leçon effectivement liés depuis le `<main>` du sommaire, dans l'ordre. */
async function slugsListesAuSommaire(page: Page): Promise<readonly string[]> {
  const hrefs = await page
    .getByRole('main')
    .locator('a[href^="/cours/securite-web/"]')
    .evaluateAll((elements) => elements.map((element) => element.getAttribute('href') ?? ''));

  return hrefs.map((href) => href.replace('/cours/securite-web/', '').replace(/\/$/, ''));
}

/**
 * Le module du sommaire qui porte une leçon donnée, avec son badge et ses métadonnées.
 *
 * 🔴 LES DEUX CONVENTIONS DE `href` SONT ACCEPTÉES, ET C'EST UN CORRECTIF
 * (2026-08-20). `slugsListesAuSommaire` tolère la barre oblique finale (elle la
 * retire avant de comparer) ; cette fonction, elle, exigeait son ABSENCE. Le jour où
 * le routeur canonicalise en `…/${slug}/`, ce locator résoudrait à ZÉRO élément — et
 * `expect(module).not.toContainText(BADGE_A_COMMENCER)` passerait alors À VIDE, sur
 * un sommaire qui affiche pourtant le mauvais badge. Une assertion négative sur un
 * locator vide est toujours vraie : c'est le mode d'échec silencieux de L-019.
 * On énumère donc les DEUX formes exactes plutôt qu'un préfixe — `href^=` aurait
 * aussi capté un futur slug `${slug}-avance`, et fait porter au module voisin les
 * assertions de celui-ci.
 */
function moduleDuSommaire(page: Page, slug: string): Locator {
  const lien = `a[href="/cours/securite-web/${slug}"], a[href="/cours/securite-web/${slug}/"]`;
  return page.getByRole('main').locator('li').filter({ has: page.locator(lien) });
}

// -----------------------------------------------------------------------------
// (a) Le sommaire dit EXACTEMENT ce que `content/` publie — ni plus, ni moins
// -----------------------------------------------------------------------------
test.describe('sommaire — fidélité au contenu publié', () => {
  test('toute leçon publiée est prerendue ET listée exactement une fois', async ({ page }) => {
    // CONTRÔLE POSITIF, en tête. Sans lui, un `content/` vide ou un chemin mal
    // orthographié rendrait toutes les boucles ci-dessous vides, donc vertes, sans
    // avoir rien mesuré (L-005/L-019).
    expect(
      LECONS_PUBLIEES.map((lecon) => lecon.slug),
      `aucune leçon en « statut: publiee » trouvée sous ${RACINE_CONTENU} : ce test serait vert ` +
        'et vide. Soit le contenu a disparu, soit ce sondage regarde au mauvais endroit.',
    ).not.toEqual([]);

    // 🔴 ET AUCUN SLUG N'EST VIDE (correctif du 2026-08-20). `['']` passait le contrôle
    // ci-dessus — un tableau non vide de chaînes vides — alors qu'un `slug` absent du
    // frontmatter fait résoudre `documentPrerendu('')` sur le SOMMAIRE, qui existe
    // toujours : l'étape 1 devenait trivialement vraie. Le contrôle positif doit
    // refuser la valeur qui le rend inoffensif, pas seulement la liste vide.
    expect(
      LECONS_PUBLIEES.filter((lecon) => lecon.slug === '').map((lecon) => lecon.dossier),
      'ces leçons publiées ne déclarent aucun champ « slug: » dans leur frontmatter : la route ' +
        'qu’on en dériverait serait celle du sommaire, et ce test ne mesurerait plus rien.',
    ).toEqual([]);

    // ---- 1. Chacune a bien SA PAGE, et c'est le disque qui le dit ---------------
    for (const lecon of LECONS_PUBLIEES) {
      expect(
        existsSync(documentPrerendu(lecon.slug)),
        `« ${lecon.titre} » est en « statut: publiee » mais n'a PAS été prerendue : ` +
          `${documentPrerendu(lecon.slug)} est introuvable. Une leçon publiée que le prerender ` +
          'ignore est une page qui n’existe pas pour un visiteur sans JS, ni pour un moteur.',
      ).toBe(true);
    }

    // ---- 2. Le sommaire liste ces slugs-là, et RIEN d'autre ---------------------
    await page.goto(CHEMIN_SOMMAIRE);

    const listes = [...(await slugsListesAuSommaire(page))].sort((a, b) => a.localeCompare(b));
    const attendus = LECONS_PUBLIEES.map((lecon) => lecon.slug).sort((a, b) => a.localeCompare(b));

    // Une seule égalité, et elle porte dans les DEUX sens : un brouillon listé apparaît
    // à gauche, une leçon publiée oubliée manque à gauche, et un doublon casse le
    // compte. « La publiée est là » n'aurait exclu ni l'un ni l'autre.
    expect(
      listes,
      'le sommaire ne liste pas exactement les leçons publiées de `content/` — un brouillon ' +
        'listé, une leçon publiée manquante, ou un module en double',
    ).toEqual(attendus);

    // Et le TITRE est bien celui du frontmatter : un lien juste sous une étiquette
    // fausse serait indétectable par le compte ci-dessus.
    for (const lecon of LECONS_PUBLIEES) {
      await expect(
        page.getByRole('link', { name: lecon.titre }),
        `« ${lecon.titre} » n’est pas lisible comme lien dans le sommaire`,
      ).toBeVisible();
    }
  });

  test('toute leçon en « statut: brouillon » est absente du prerender ET du sommaire', async ({
    page,
  }) => {
    if (LECONS_BROUILLON.length === 0) {
      // Le journal fait foi (L-005) : un saut muet serait indiscernable d'un succès,
      // et celui-ci est appelé à durer tant qu'aucun auteur ne laisse un brouillon.
      console.log(
        `⏭️  SAUTÉ — masquage des brouillons : aucune leçon de ${RACINE_CONTENU} n'est en ` +
          `« statut: brouillon » (${String(LECONS_SOURCE.length)} leçon(s) inspectée(s) : ` +
          `${LECONS_SOURCE.map((lecon) => `${lecon.dossier} → ${lecon.statut}`).join(', ')}). ` +
          "Il n'y a rien à masquer, donc rien à mesurer — la moitié « publiée » de l'invariant " +
          'est mesurée par le test précédent, elle, et le filtre `leconsPubliees` garde ' +
          'son test unitaire (D-1 d’E2-ST6).',
      );
    }
    test.skip(
      LECONS_BROUILLON.length === 0,
      'aucune leçon en « statut: brouillon » dans content/ — le masquage n’a pas de sujet',
    );

    // ---- 1. Le brouillon n'a PAS DE PAGE, et c'est le disque qui le dit ---------
    //
    // Contrôle positif d'abord : sans lui, une faute de frappe dans
    // `RACINE_COURS_PRERENDUE` rendrait les assertions suivantes vraies pour rien.
    const temoinPublie = LECONS_PUBLIEES[0];
    expect(
      temoinPublie === undefined ? false : existsSync(documentPrerendu(temoinPublie.slug)),
      'le sondage disque regarde au mauvais endroit : aucune leçon PUBLIÉE n’est trouvée sous ' +
        `${RACINE_COURS_PRERENDUE} (contrôle positif du test)`,
    ).toBe(true);

    for (const brouillon of LECONS_BROUILLON) {
      expect(
        existsSync(documentPrerendu(brouillon.slug)),
        `la leçon en « statut: brouillon » a été PRERENDUE : ${documentPrerendu(brouillon.slug)} ` +
          'existe. Le sélecteur « leconsPubliees » (D-1 d’E2-ST6) doit filtrer le manifeste de ' +
          'prerender autant que le sommaire — sinon un brouillon est public et indexable.',
      ).toBe(false);
    }

    // ---- 2. Le sommaire, lui non plus, ne le montre pas ------------------------
    await page.goto(CHEMIN_SOMMAIRE);

    const listes = await slugsListesAuSommaire(page);
    for (const brouillon of LECONS_BROUILLON) {
      expect(
        listes,
        `le sommaire liste « ${brouillon.titre} », qui est un brouillon`,
      ).not.toContain(brouillon.slug);

      await expect(
        page.getByRole('link', { name: brouillon.titre }),
        `« ${brouillon.titre} » est un brouillon et pourtant lisible comme lien dans le sommaire`,
      ).toHaveCount(0);
    }
  });
});

// -----------------------------------------------------------------------------
// (b) La chaîne complète : quiz réussi sur une route → badge sur une autre
// -----------------------------------------------------------------------------
test.describe('sommaire — la chaîne quiz → progression → badge', () => {
  exigerUneLeconAvecQuiz('la chaîne quiz réussi → ProgressionService → badge « Maîtrisé » du sommaire');

  test('quiz réussi → le module passe à « Maîtrisé » sur le sommaire', async ({ page }) => {
    const lecon = LECON_AVEC_QUIZ;
    expect(lecon, 'la garde `exigerUneLeconAvecQuiz` aurait dû faire sauter ce test').toBeDefined();
    if (lecon === undefined) return;

    const quiz = lireQuizDeLaLecon(lecon.slug);
    const module = moduleDuSommaire(page, lecon.slug);

    // ---- 1. L'état de départ, MESURÉ et non supposé ---------------------------
    //
    // Playwright donne à chaque test un contexte neuf, donc un `localStorage` vide.
    // On le constate quand même : sans ce relevé, un badge qui vaudrait « Maîtrisé »
    // dès le premier rendu rendrait tout le reste du test vert sans rien prouver
    // (L-035 — on vérifie que l'entrée produit bien la sortie exigée).
    await page.goto(CHEMIN_SOMMAIRE);
    await attendreHydratation(page, 'le sommaire lit la progression après hydratation seulement');

    // 🔴 LE MODULE EXISTE, ET C'EST LA PREMIÈRE CHOSE MESURÉE. Sans cette ligne, un
    // locator résolvant à zéro élément rendrait le `not.toContainText` de la fin
    // trivialement vrai — le test annoncerait « le badge est passé à Maîtrisé » en
    // n'ayant regardé aucun module (L-019).
    await expect(
      module,
      `aucun module du sommaire ne porte de lien vers « ${lecon.slug} » : la convention de href a ` +
        'changé, ou le sommaire ne liste pas la leçon mesurée. Tout ce qui suit serait vert et vide.',
    ).toHaveCount(1);
    await expect(module).toContainText(BADGE_A_COMMENCER);

    // ---- 2. Le quiz de la leçon, réussi pour de vrai --------------------------
    await page.goto(lecon.route);
    await attendreHydratation(
      page,
      'le chunk paresseux de la leçon a-t-il été refusé par `script-src` ?',
    );
    await repondreJusteAuQuiz(page, quiz);

    await page.getByRole('button', { name: 'Corriger mes réponses' }).click();

    // La preuve que le quiz est RÉUSSI se lit dans la région live — le texte que le
    // visiteur (et son lecteur d'écran) reçoit. C'est cet instant précis qui appelle
    // `enregistrerQuiz` ; un verdict partiel ici invaliderait tout ce qui suit.
    //
    // ⚠️ LE DÉNOMINATEUR VIENT DU JSON, PAS D'UN LITTÉRAL. C'est le croisement décrit
    // en tête de fichier : si le compilateur perdait une question en chemin, le DOM
    // en rendrait N-1 et cette ligne le dirait. Un « 8 » écrit ici l'aurait tu.
    const total = quiz.questions.length;
    const pluriel = total > 1 ? 's' : '';
    await expect(page.getByRole('status')).toContainText(
      `${String(total)} bonne${pluriel} réponse${pluriel} sur ${String(total)}`,
    );

    // ---- 3. Retour au sommaire : l'autre route, l'autre composant --------------
    //
    // Navigation complète et non un retour arrière : la progression doit survivre à
    // un rechargement, sinon elle ne vaut rien pour un visiteur qui revient demain.
    await page.goto(CHEMIN_SOMMAIRE);
    await attendreHydratation(page, 'le sommaire lit la progression après hydratation seulement');

    await expect(module).toContainText(BADGE_MAITRISE);
    await expect(module).not.toContainText(BADGE_A_COMMENCER);
  });
});

// -----------------------------------------------------------------------------
// Le quiz, lu à la source
// -----------------------------------------------------------------------------

/** Une question telle que `quiz.json` la déclare — les quatre formes du contrat. */
interface QuestionSource {
  readonly id: string;
  readonly type: 'choix-multiple' | 'vrai-faux' | 'associer' | 'trouver-la-faille';
  /** `choix-multiple` : l'`id` du bon choix. `vrai-faux` : un booléen. */
  readonly bonneReponse?: string | boolean;
  /** `trouver-la-faille` : le NUMÉRO de la ligne fautive, à partir de 1. */
  readonly ligneFautive?: number;
  /** `associer` : les paires, dans l'ordre de la source. */
  readonly paires?: readonly { readonly gauche: string; readonly droite: string }[];
}

interface QuizSource {
  readonly questions: readonly QuestionSource[];
}

/**
 * Le `quiz.json` de la leçon dont le SLUG est donné.
 *
 * ⚠️ Le slug n'est pas le nom du dossier : `content/…/01-fondamentaux/` publie la
 * route `fondamentaux`. On passe donc par `LECONS_SOURCE`, qui a lu le frontmatter —
 * fabriquer le chemin en devinant le préfixe d'ordre serait une supposition de plus.
 */
function lireQuizDeLaLecon(slug: string): QuizSource {
  const source = LECONS_SOURCE.find((lecon) => lecon.slug === slug);
  if (source === undefined) {
    throw new Error(
      `aucune leçon de ${RACINE_CONTENU} ne déclare le slug « ${slug} », que l'artéfact prerend ` +
        'pourtant : le frontmatter et le manifeste de routes ont divergé',
    );
  }

  const chemin = join(RACINE_CONTENU, source.dossier, 'quiz.json');
  const brut: unknown = JSON.parse(readFileSync(chemin, 'utf8'));
  const quiz = brut as QuizSource;

  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    throw new Error(`${chemin} ne porte aucune question : le test serait vert et vide`);
  }
  return quiz;
}

/** Normalise un texte lu au DOM pour le comparer à un littéral du JSON. */
function normaliser(texte: string): string {
  return texte.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

/**
 * Répond JUSTE à toutes les questions d'un quiz, quelle que soit sa forme.
 *
 * ⚠️ AUCUNE ÉCRITURE D'ÉTAT PAR SCRIPT. On coche et on sélectionne comme un
 * visiteur, pour que le `(change)` du gabarit coure réellement : c'est lui qui
 * alimente `Quiz.repondre()`, donc le score, donc `enregistrerQuiz`. Poser l'état
 * par `page.evaluate` rendrait le test vert avec le composant débranché.
 *
 * ⚠️ ET LES VALEURS CIBLÉES SONT CELLES QUE LE COMPOSANT LIT, pas les libellés
 * affichés. Le piège a été payé le 2026-08-19 sur la fixture : le nom accessible
 * d'une ligne de `trouver-la-faille` contient deux U+00A0 (« Ligne 2 », L-024) que la
 * normalisation des noms accessibles ne garantit pas de rendre comparables à un
 * littéral. L'attribut `value` est, lui, exactement ce que `repondre()` reçoit —
 * `choix.id`, `'vrai'`/`'faux'`, `String(numeroDeLigne)`, la valeur de droite.
 */
async function repondreJusteAuQuiz(page: Page, quiz: QuizSource): Promise<void> {
  for (const question of quiz.questions) {
    // `#quiz-<id>` vient de `PREFIXE_ID_QUESTION` : un identifiant de document, pas
    // une classe de style — il survit à la bascule visuelle E6.
    const champDeQuestion = page.locator(`#quiz-${question.id}`);
    await expect(
      champDeQuestion,
      `la question « ${question.id} » du fichier quiz.json n’est pas rendue dans la page : ` +
        'le compilateur ou le composant en a perdu une en chemin',
    ).toHaveCount(1);

    switch (question.type) {
      case 'choix-multiple':
        await cocherParValeur(champDeQuestion, String(question.bonneReponse));
        break;

      case 'vrai-faux':
        // `VALEUR_VRAI` / `VALEUR_FAUX` du composant : deux chaînes, pas un booléen.
        await cocherParValeur(champDeQuestion, question.bonneReponse === true ? 'vrai' : 'faux');
        break;

      case 'trouver-la-faille':
        await cocherParValeur(champDeQuestion, String(question.ligneFautive));
        break;

      case 'associer':
        await associerJuste(page, champDeQuestion, question);
        break;
    }
  }
}

/** Coche la radio d'une question par la VALEUR que le composant lit. */
async function cocherParValeur(champDeQuestion: Locator, valeur: string): Promise<void> {
  const radio = champDeQuestion.locator(`input[type="radio"][value="${valeur}"]`);
  await expect(
    radio,
    `aucune option de valeur « ${valeur} » dans cette question — la bonne réponse déclarée ` +
      'au JSON ne correspond à aucun contrôle rendu',
  ).toHaveCount(1);
  await radio.check();
}

/**
 * Remplit un `associer` en croisant le DOM et le JSON, ligne par ligne.
 *
 * On lit la colonne de GAUCHE dans le document et on en déduit la réponse, plutôt que
 * de compter sur l'ordre des `<select>` : un pipeline qui réordonnerait les paires
 * ferait alors rougir ce test en NOMMANT la paire inattendue, au lieu de choisir au
 * hasard et d'échouer plus loin sur un score partiel.
 */
async function associerJuste(
  page: Page,
  champDeQuestion: Locator,
  question: QuestionSource,
): Promise<void> {
  const paires = question.paires ?? [];
  const lignes = champDeQuestion.locator('li');

  await expect(
    lignes,
    `la question « ${question.id} » rend un nombre de lignes différent des paires du JSON`,
  ).toHaveCount(paires.length);
  expect(paires.length, `la question « ${question.id} » ne porte aucune paire`).toBeGreaterThan(0);

  for (let index = 0; index < paires.length; index++) {
    const ligne = lignes.nth(index);
    const gauche = normaliser(await ligne.locator('label > span').first().innerText());
    const attendue = paires.find((paire) => normaliser(paire.gauche) === gauche)?.droite;

    expect(
      attendue,
      `paire inattendue à gauche : « ${gauche} » — le DOM et « quiz.json » ne portent pas les ` +
        'mêmes intitulés (le compilateur a-t-il transformé le texte ?)',
    ).toBeDefined();

    // Par VALEUR et non par libellé : `[value]="option"` est exactement la chaîne que
    // `repondre()` reçoit, alors que le libellé passe par l'interpolation.
    await ligne.locator('select').selectOption(attendue ?? '');
  }
}
