// =============================================================================
// LE `quiz.json` DE LA LEÇON MESURÉE — la deuxième source, celle que le DOM ne
// peut pas fabriquer (S-014)
// -----------------------------------------------------------------------------
// POURQUOI CE FICHIER EXISTE. Les trois specs du quiz — `parcours-clavier-quiz`,
// `quiz-pre-hydratation`, `quiz-sous-csp` — sont agnostiques au contenu éditorial
// depuis le recalibrage du 2026-08-20 : aucun compte n'y est écrit à la main, tout
// est DÉRIVÉ de deux sources indépendantes, la structure déclarée par l'auteur et
// le rendu servi. L'assertion est leur égalité ; un compte tiré du seul DOM se
// prouverait lui-même, et un test auto-validant est un gate vide.
//
// 🔴 CE QUE LA TRIPLE COPIE COÛTAIT, ET C'EST MESURÉ, PAS CRAINT (revue du
// 2026-08-20). La lecture vivait en TROIS exemplaires, chacun annoncé « dupliqué
// et assumé » — et les trois avaient DÉJÀ divergé sur le contrat qu'ils lisaient :
// `QuestionSource` déclarait `choix`/`code` dans l'un, `bonneReponse` dans le
// deuxième, `paires` seule dans le troisième. Trois vues partielles d'un contrat
// unique, donc trois façons de se tromper séparément sur la même source. C'est la
// famille L-016/L-034 par les deux bouts : l'absence de mutualisation a laissé
// diverger, et la mutualisation DÉPLACE le risque ici — d'où l'épinglage nominatif
// de ce fichier dans `src/configuration-typescript.spec.ts` (L-034). Un défaut de
// typage ici serait invisible depuis les trois appelants et ferait passer VERTS
// les gates du quiz.
//
// ⚠️ CE FICHIER N'EST PAS UN SPEC. Il ne s'assertionne pas lui-même : il LÈVE, en
// se nommant, dès que la source manque ou est vide — un retour muet transformerait
// une source introuvable en suite verte.
// =============================================================================

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { LECON_AVEC_QUIZ } from './artefact-mesure';

/**
 * Les deux racines où une leçon peut être RÉDIGÉE. La seconde est la fixture
 * témoin : `--racine tools/content-pipeline/__fixtures__/temoin/…` reste une façon
 * légitime de bâtir l'artéfact en local, et les specs du quiz doivent s'y mesurer
 * aussi. L'ordre compte : `content/` d'abord, la fixture en repli.
 */
const RACINES_CONTENU = [
  'content/cours/securite-web',
  'tools/content-pipeline/__fixtures__/temoin/cours/securite-web',
] as const;

/** Une ligne d'une question `associer`, dans l'ordre de la source. */
export interface PaireSource {
  readonly gauche: string;
  readonly droite: string;
}

/**
 * Ce qu'une question déclare dans `quiz.json` — LE contrat, en UN seul endroit.
 *
 * Les champs sont optionnels parce qu'ils dépendent du `type` ; c'est le schéma
 * Ajv du pipeline qui impose lequel est requis pour lequel, pas ce fichier. Ce
 * type décrit ce que les specs ont le droit de LIRE, il ne revalide rien.
 */
export interface QuestionSource {
  readonly id: string;
  readonly type: string;
  /** `choix-multiple` : les choix proposés. */
  readonly choix?: readonly unknown[];
  /** `choix-multiple` : l'`id` du bon choix. `vrai-faux` : un booléen. */
  readonly bonneReponse?: unknown;
  /** `trouver-la-faille` : l'extrait dont on désigne une ligne. */
  readonly code?: string;
  /** `trouver-la-faille` : le NUMÉRO de la ligne fautive, à partir de 1. */
  readonly ligneFautive?: number;
  /** `associer` : les paires, dans l'ordre de la source. */
  readonly paires?: readonly PaireSource[];
}

/** Le `slug` déclaré au frontmatter d'un `lecon.md`, ou `''` s'il n'en porte pas. */
function slugDeclare(cheminLecon: string): string {
  // Le frontmatter est le premier bloc encadré de `---`. `\r?\n` parce que les fins
  // de ligne de ce poste sont mixtes (L-015).
  const brut = readFileSync(cheminLecon, 'utf8');
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(brut)?.[1] ?? '';
  return (/^slug:[ \t]*(.*)$/m.exec(frontmatter)?.[1] ?? '').trim().replace(/^["']|["']$/g, '');
}

/**
 * Le dossier source qui PUBLIE ce slug-là, sous une racine donnée.
 *
 * 🔴 ON LIT LE FRONTMATTER, ON NE DEVINE PAS LE NOM DU DOSSIER (correctif du
 * 2026-08-20). Les trois copies retiraient `^\d+-` du nom de dossier et appariaient
 * là-dessus — or `content/…/01-fondamentaux/` publie la route `fondamentaux` par
 * son champ `slug:`, et rien n'oblige le dossier à porter le slug. `sommaire.spec.ts`
 * rejette nommément cette devinette (« le slug n'est pas le nom du dossier ») ; la
 * garder ici aurait fait diverger deux vérités dans le même diff. Le jour où un
 * auteur écrit `slug: fondamentaux-du-web` dans `02-bases/`, la devinette aurait
 * fait rougir les trois specs du quiz sur un produit parfaitement sain (L-035).
 */
function dossierQuiPublie(racine: string, slug: string): string | undefined {
  if (!existsSync(racine)) return undefined;

  for (const entree of readdirSync(racine, { withFileTypes: true })) {
    if (!entree.isDirectory()) continue;
    const lecon = join(racine, entree.name, 'lecon.md');
    if (!existsSync(lecon)) continue;
    const declare = slugDeclare(lecon);
    // Un `slug:` absent donne `''` : on refuse de l'apparier, sinon une leçon sans
    // frontmatter complet capterait n'importe quelle recherche vide.
    if (declare !== '' && declare === slug) return entree.name;
  }
  return undefined;
}

/**
 * Lit le `quiz.json` de la leçon RÉELLEMENT mesurée par l'artéfact sous test.
 *
 * Rend un tableau VIDE — plutôt que de lever — quand l'artéfact ne porte aucune
 * leçon à quiz : les specs appelants sont déjà sautés par `exigerUneLeconAvecQuiz`,
 * et lever à l'import transformerait un saut annoncé en erreur de chargement.
 */
export function lireQuizSource(): readonly QuestionSource[] {
  const slug = LECON_AVEC_QUIZ?.slug;
  if (slug === undefined) return [];

  for (const racine of RACINES_CONTENU) {
    const dossier = dossierQuiPublie(racine, slug);
    if (dossier === undefined) continue;

    const brut: unknown = JSON.parse(readFileSync(join(racine, dossier, 'quiz.json'), 'utf8'));
    const questions = (brut as { questions?: readonly QuestionSource[] }).questions ?? [];
    if (questions.length === 0) {
      throw new Error(`le quiz de « ${slug} » ne déclare aucune question — la source est vide`);
    }
    return questions;
  }

  throw new Error(
    `aucun « lecon.md » de ${RACINES_CONTENU.join(' ni ')} ne déclare « slug: ${slug} », que ` +
      "l'artéfact prerend pourtant : le frontmatter et le manifeste de routes ont divergé, ou la " +
      'leçon mesurée a été bâtie depuis une racine que ce fichier ne connaît pas',
  );
}

/** La mécanique de saisie que le gabarit rend pour une question. */
export type MecaniqueDeSaisie = 'radios' | 'selects';

/**
 * Quelle mécanique le gabarit rend pour cette question — LISTE BLANCHE, et elle
 * REFUSE l'inconnu en se nommant.
 *
 * ⚠️ POURQUOI PAS `type !== 'associer'` (correctif du 2026-08-20). Cette forme
 * traitait TOUT type inconnu comme un groupe de radios : un cinquième type ajouté
 * au pipeline aurait fait échouer les specs sur un timeout Playwright opaque
 * — « locator n'a rien trouvé » — au lieu de nommer la cause. Un défaut de
 * couverture doit se dire, pas se deviner (même patron que `.claude/rules/security.md`
 * §4 : on énumère ce qui est PERMIS).
 */
export function mecaniqueDeSaisie(question: QuestionSource): MecaniqueDeSaisie {
  switch (question.type) {
    case 'choix-multiple':
    case 'vrai-faux':
    case 'trouver-la-faille':
      return 'radios';
    case 'associer':
      return 'selects';
    default:
      throw new Error(
        `type de question inconnu « ${question.type} » : ce spec ne sait pas ce que le gabarit ` +
          "en rend, il refuse de mesurer à l'aveugle",
      );
  }
}

/**
 * Le nombre de LIGNES qu'un `trouver-la-faille` fait rendre.
 *
 * 🔴 TROISIÈME COPIE DE LA MÊME RÈGLE, ET ELLE EST DÉLIBÉRÉE — pas un oubli. Les
 * deux autres sont `decouperLignesDeCode()` (`src/app/features/cours/quiz/quiz.ts`,
 * le rendu) et `tools/content-pipeline/valider.mjs` (la validation) ; leur parité
 * est tenue par `src/compter-lignes-parite.spec.ts`. La suite e2e est un TROISIÈME
 * programme TypeScript (`tsconfig.e2e.json`) : importer le composant Angular ici le
 * ferait entrer dans le programme des specs, ce que la frontière du dépôt refuse.
 *
 * ⚠️ LE `\n` TERMINAL SE RETIRE — c'est le défaut payé au lot B d'E2-ST4, la
 * « RADIO FANTÔME » (fixture `quiz-ligne-fautive-hors-extrait`). Un `code.split('\n')`
 * naïf compte une ligne vide de plus dès que l'auteur termine son extrait par un
 * saut de ligne, et ferait rougir le compte de radios sur un produit sain (L-035).
 * La q4 de la leçon 01 finit sur `}` : le compte naïf n'y était vert que par chance.
 */
export function lignesDeCode(question: QuestionSource): number {
  const code = (question.code ?? '').replace(/\r?\n$/, '');
  return code === '' ? 0 : code.split(/\r?\n/).length;
}

/** Le nombre de radios que la SOURCE annonce pour une question, par type. */
export function radiosAttendues(question: QuestionSource): number {
  switch (question.type) {
    case 'choix-multiple':
      return question.choix?.length ?? 0;
    case 'vrai-faux':
      // Toujours deux : « Vrai » et « Faux » sont posés par le gabarit, pas par l'auteur.
      return 2;
    case 'trouver-la-faille':
      // Une radio par ligne de code — c'est la ligne fautive qu'on désigne.
      return lignesDeCode(question);
    case 'associer':
      return 0;
    default:
      // Même liste blanche que `mecaniqueDeSaisie`, même refus nominatif : un type
      // inconnu ne se compte pas à 0 en silence, il fait rougir en se nommant.
      throw new Error(
        `type de question inconnu « ${question.type} » : ce fichier ne sait pas combien de ` +
          "radios le gabarit en rend, il refuse de compter à l'aveugle",
      );
  }
}

/**
 * La citation que la correction affiche pour une réponse d'`associer` FAUSSE,
 * en EXPRESSION RÉGULIÈRE — et ce n'est pas un détail de forme.
 *
 * 🔴 POURQUOI PAS UNE CHAÎNE (correctif du 2026-08-20, L-008). Le gabarit écrit
 * `(votre réponse&nbsp;: {{ ligne.donnee }})` — une U+00A0, exigée par la
 * typographie française (`.claude/rules/contenu-pedagogique.md` §3). Deux specs
 * l'assertionnaient, l'un avec une insécable ÉCHAPPÉE et dix lignes de commentaire expliquant
 * que l'insécable était EXIGÉE, l'autre avec une espace ordinaire — et les deux
 * passaient, parce que `toContainText` NORMALISE les blancs quand on lui donne une
 * chaîne (`\s` inclut U+00A0). Le commentaire promettait donc une garantie que le
 * code n'appliquait pas, et l'espace ordinaire aurait survécu à la disparition du
 * `&nbsp;`. Playwright ne normalise PAS le texte face à une expression régulière :
 * c'est elle, et elle seule, qui mesure réellement l'insécable.
 */
export function citationDeReponse(reponse: string): RegExp {
  const litteral = reponse.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`votre réponse\u00A0: ${litteral}`, 'u');
}
