// =============================================================================
// ProgressionService — l'avancement du visiteur, en `localStorage` et rien d'autre
// -----------------------------------------------------------------------------
// POURQUOI CE SERVICE EST DANS `core/` ET NON DANS LA FEATURE DU QUIZ.
// C'est la règle d'architecture posée le 2026-08-17
// (`docs/architecture/stack-et-architecture.md` §7) : **aucune feature n'importe
// une autre feature**. Deux features ont besoin de cet état, et elles n'ont pas
// le droit de se connaître :
//   · `features/cours/quiz`    (E2-ST3) l'ÉCRIT   — un quiz vient d'être corrigé ;
//   · `features/cours/sommaire`(E2-ST6) le LIT    — la carte de parcours s'allume ;
//   · `features/cours/lecon`   (E2-ST2) l'écrit   — une leçon vient d'être ouverte.
// Le seul chemin légitime entre elles passe par ici, par injection. Un import
// direct de l'une vers l'autre est un constat BLOQUANT en revue.
//
// PAS DE COMPTE, PAS DE SERVEUR, PAS DE PII. Phase 1 : l'avancement ne quitte
// jamais l'appareil (`docs/vision.md` §3). Ce qui est stocké ne contient aucune
// donnée personnelle — des slugs de leçons et des entiers. Le jour où la phase 2
// ajoute des comptes, c'est CE format qui s'importera dans le compte, d'où
// l'enveloppe versionnée ci-dessous.
//
// ⚠️ LE STOCKAGE EST UNE ENTRÉE NON FIABLE. Le visiteur peut réécrire
// `localStorage` à la main, et une version antérieure du site a pu y laisser une
// autre forme. On ne fait donc JAMAIS `JSON.parse(...) as Progression` : chaque
// valeur relue est **validée nominativement** avant d'entrer dans l'état — même
// patron que la liste blanche `estTheme()` de `core/theme/theme.ts`. Ce n'est pas
// un vecteur XSS (rien n'est injecté dans du HTML), mais un état corrompu
// afficherait une carte de parcours fausse, ou ferait lever un composant au
// premier rendu — sans message et sans test rouge.
//
// CONTRAINTE DE PRERENDER. `outputMode: "static"` prerend toutes les routes : ce
// service s'instancie aussi dans Node, où `localStorage` n'existe pas. Tout accès
// est gardé — un oubli casserait `npm run build`, pas seulement l'exécution en
// ligne. Au prerender, l'état est **vide**, et c'est exactement ce que le HTML
// livré doit contenir : le même fichier est servi à tout le monde.
//
// L'ÉTAT EST INDEXÉ PAR COURS, PAS À PLAT. La phase 1 porte DEUX cours (sécurité
// web et PHP, §E7), et l'avancement doit être ADRESSABLE PAR COURS : l'API publique
// de ce service parle en `(sujet, slug)`, et le sommaire l'interroge module par
// module, pour un cours à la fois. Le slug seul ne suffirait donc pas comme clef.
// ⚠️ CE N'EST PAS parce que deux slugs pourraient se heurter : `generer-manifeste.mjs`
// REFUSE au build deux leçons de même slug, tous sujets confondus (fail-closed) — une
// version antérieure de ce commentaire l'affirmait, et c'était faux. Mais cette
// unicité est un invariant du PIPELINE, relâchable un jour d'une décision de contenu ;
// un contrat de STOCKAGE, lui, survit aux données déjà écrites chez le visiteur et ne
// doit dépendre d'aucun invariant d'un autre programme.
// La clef de stockage est donc **composite et plate** — `"sujet/slug"`. Plate et
// non imbriquée parce que plus personne n'énumère par cours (voir le retrait des
// compteurs, plus bas) : l'imbrication n'achèterait qu'une validation à deux
// niveaux et un cas mort (`{"php": {}}`). La composition de la clef est un
// **détail privé** : l'API publique parle en `(sujet, slug)`, et rien de ce qui
// est exporté ici ne laisse fuir le séparateur.
//
// Comportement vérifié par `progression.spec.ts`.
// =============================================================================

import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, PLATFORM_ID, Service, inject, signal } from '@angular/core';

/** Clé de stockage. Préfixe `drjst-` commun à tout le site (cf. `CLE_THEME`). */
export const CLE_PROGRESSION = 'drjst-progression';

/**
 * Version du FORMAT stocké, pas du site.
 *
 * Une enveloppe versionnée coûte trois lignes aujourd'hui et évite d'avoir à
 * choisir, plus tard, entre « je casse la progression de tout le monde » et « je
 * devine à quelle forme j'ai affaire ». Une enveloppe d'une version inconnue est
 * **ignorée**, jamais devinée : mieux vaut repartir à zéro que réafficher un
 * avancement faux. À incrémenter dès que la forme de `EtatLecon` change.
 *
 * **2 — passage à la clef composite `"sujet/slug"` (E2-ST6, 2026-08-19).** Il n'y
 * a **AUCUN code de migration depuis la v1**, et c'est un choix mesuré, pas un
 * oubli : au moment du pivot, `content/` ne portait qu'un `README.md`,
 * `manifeste-routes.json` valait `[]`, et les seuls écrivains de progression
 * (le quiz et la page de leçon) vivent sur une route dont le prerender est
 * alimenté par ce manifeste. Aucune page capable d'écrire un enregistrement v1
 * n'a donc jamais été servie à un visiteur réel : il n'y a rien à migrer, et
 * écrire une migration invérifiable serait du code mort qui ment.
 */
export const VERSION_PROGRESSION = 2;

/**
 * Part de bonnes réponses à partir de laquelle un quiz est « réussi », donc le
 * module « maîtrisé ».
 *
 * C'est un choix de produit, isolé ici en UNE constante pour qu'il se change sans
 * chasse au nombre magique. 0,8 place la barre au-dessus du hasard sur toutes les
 * formes de question du schéma — un `vrai-faux` se devine à 0,5 — tout en
 * laissant passer une erreur sur cinq. La règle qui compte, elle, n'est pas
 * négociable : **un module se marque maîtrisé sur un quiz réussi, jamais sur du
 * temps passé** (`docs/agile/backlog-phase-1.md` §E2-ST6).
 */
export const SEUIL_REUSSITE = 0.8;

/** Ce qu'on retient d'une leçon. Aucune donnée personnelle, par construction. */
export interface EtatLecon {
  /** La page de leçon a été ouverte au moins une fois. */
  readonly lue: boolean;
  /** Meilleur nombre de bonnes réponses obtenu — jamais dégradé par un essai raté. */
  readonly meilleurScore: number;
  /** Nombre de questions du quiz au moment de ce meilleur score. */
  readonly totalQuestions: number;
}

/**
 * L'état complet : un enregistrement **plat**, indexé par la clef composite
 * `"sujet/slug"`. La forme de cette clef ne se compose et ne se relit qu'ici ;
 * aucun appelant n'a à la connaître.
 */
export type Progression = Readonly<Record<string, EtatLecon>>;

/** Forme réellement écrite sur le disque du visiteur — enveloppe versionnée. */
interface EnveloppeStockee {
  readonly version: number;
  readonly lecons: Progression;
}

const ETAT_VIERGE: EtatLecon = { lue: false, meilleurScore: 0, totalQuestions: 0 };

/**
 * Motif d'UN segment de clef — le `sujet` comme le `slug`.
 *
 * Ces deux valeurs composent une clef d'objet ET reviennent du stockage : on les
 * contraint au même motif kebab que le schéma de contenu — `quiz.schema.json`
 * §identifiant pour le slug, `lecon.frontmatter.schema.json` §kebab pour le
 * sujet. Une clef arbitraire venue d'un stockage réécrit n'entre pas dans l'état.
 *
 * **Exporté pour être CONFRONTÉ aux schémas**, pas par commodité :
 * `progression.spec.ts` lit les DEUX fichiers au disque et compare les motifs.
 * Sans cela, le commentaire ci-dessus serait une promesse invérifiable —
 * exactement la faute L-016 (« un commentaire qui cite un fichier doit pointer
 * vers du réel »).
 */
export const MOTIF_SEGMENT_PROGRESSION = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Séparateur de la clef composite. **Privé, et il doit le rester** : c'est ce qui
 * garantit que la forme de la clef reste un détail d'implémentation. Le `/` est
 * choisi parce qu'aucun segment kebab ne peut le contenir — la décomposition est
 * donc sans ambiguïté — et parce qu'il rend au passage toute clef v1 (`"xss"`,
 * sans séparateur) inéligible : second filet, sous le rejet d'enveloppe.
 */
const SEPARATEUR_CLEF = '/';

/**
 * Compose la clef d'une leçon, ou `null` si l'un des deux segments est refusé.
 *
 * **Porte d'entrée UNIQUE de la validation** : `sujet` et `slug` passent par le
 * même contrôle en liste blanche, et rien n'entre dans l'état sans être passé par
 * ici. Un `sujet` invalide est donc ignoré exactement comme un `slug` invalide.
 */
function composerClef(sujet: string, slug: string): string | null {
  if (!MOTIF_SEGMENT_PROGRESSION.test(sujet)) return null;
  if (!MOTIF_SEGMENT_PROGRESSION.test(slug)) return null;
  return `${sujet}${SEPARATEUR_CLEF}${slug}`;
}

/**
 * Valide UNE clef relue du stockage, en la faisant **repasser par `composerClef`**
 * plutôt qu'en lui appliquant un second motif recopié.
 *
 * Deux motifs à maintenir en parallèle divergent ; ici, il n'y en a qu'un, et le
 * contrôle est une liste blanche par reconstruction : la clef n'est acceptée que
 * si elle est **exactement** ce que le service aurait écrit. Tout le reste — un
 * `"xss"` v1 sans séparateur, un `"a/b/c"`, un `"__proto__/xss"` — sort par le
 * même `null`.
 */
function clefRelue(clef: string): string | null {
  const morceaux = clef.split(SEPARATEUR_CLEF);
  if (morceaux.length !== 2) return null;
  const [sujet, slug] = morceaux;
  if (sujet === undefined || slug === undefined) return null;
  return composerClef(sujet, slug);
}

/** Entier positif ou nul — `NaN`, `Infinity` et les décimaux sont refusés. */
function estCompteur(valeur: unknown): valeur is number {
  return typeof valeur === 'number' && Number.isInteger(valeur) && valeur >= 0;
}

/**
 * Valide UN état de leçon relu du stockage.
 *
 * Retourne `null` plutôt que de « réparer » : une entrée à moitié valide est une
 * entrée dont on ne sait rien. La rejeter perd une ligne d'avancement ; la
 * rafistoler afficherait un chiffre inventé sur la carte de parcours.
 */
function lireEtatLecon(valeur: unknown): EtatLecon | null {
  if (typeof valeur !== 'object' || valeur === null) return null;

  const brut = valeur as Record<string, unknown>;
  if (typeof brut['lue'] !== 'boolean') return null;
  if (!estCompteur(brut['meilleurScore']) || !estCompteur(brut['totalQuestions'])) return null;

  // Cohérence interne : un score supérieur au total est impossible, donc l'entrée
  // ne vient pas d'un chemin que ce service a écrit.
  if (brut['meilleurScore'] > brut['totalQuestions']) return null;

  return {
    lue: brut['lue'],
    meilleurScore: brut['meilleurScore'],
    totalQuestions: brut['totalQuestions'],
  };
}

@Service()
export class ProgressionService {
  private readonly document = inject(DOCUMENT);

  // POURQUOI `isPlatformBrowser` AU CONSTRUCTEUR, ET CE QUE ÇA N'AUTORISE PAS.
  // Le service lit le stockage dès sa construction parce que la valeur doit être
  // DISPONIBLE tôt : un consommateur ne doit pas avoir à attendre pour savoir où
  // en est le visiteur.
  //
  // ⚠️ Ce n'est PAS un permis de peindre cet état au premier rendu client. La
  // version précédente de ce commentaire disait « la carte de parcours
  // s'étiquette dès l'injection » — c'est l'anti-patron exact de la leçon L-033 :
  // rendre l'avancement au premier rendu ferait diverger le DOM client du HTML
  // prerendu, qui est le MÊME fichier pour tout le monde et donc toujours vide.
  //
  // La frontière est donc : **ce service EXPOSE l'état, le CONSOMMATEUR gate son
  // AFFICHAGE**. Le composant `Sommaire` (E2-ST6 lot C1) lit `etatDe(...)` à
  // travers un `computed` adossé à un signal privé basculé en `afterNextRender`,
  // et garde un gabarit invariant (badge toujours présent, jamais de `@if` sur
  // l'état). Aucune de ces deux garanties n'est tenue ici : ce fichier ne promet
  // que de fournir une valeur juste, tôt.
  private readonly estNavigateur = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly etat = signal<Progression>({});

  /** L'avancement complet, en lecture seule. Clefs `"sujet/slug"`. */
  readonly progression = this.etat.asReadonly();

  // PAS DE COMPTEURS ICI — retrait délibéré (E2-ST6, 2026-08-19).
  // `nombreLues` et `nombreMaitrisees` comptaient les entrées de `etat()`, donc
  // AUSSI celles des leçons renommées ou retirées depuis. Sur la page même qui
  // existe pour mesurer l'avancement, un « 12/13 » serait devenu « 14/13 ».
  // Numérateur ET dénominateur viennent désormais du MANIFESTE : `Sommaire`
  // itère les leçons publiées du sujet et interroge `etatDe(sujet, slug)` module
  // par module. Le service ne sait pas quelles leçons existent — c'est le
  // manifeste qui le sait, et lui seul.

  constructor() {
    if (!this.estNavigateur) {
      return;
    }
    this.etat.set(this.lireStockage());
  }

  /**
   * L'état d'une leçon — toujours défini, « vierge » si elle est inconnue, si le
   * `sujet` est invalide ou si le `slug` l'est.
   *
   * `Object.hasOwn` plutôt qu'un simple accès indexé : l'état est un objet
   * littéral, donc porteur du prototype d'`Object`. Une clef héritée
   * (`constructor`, `toString`) ne peut de toute façon PAS être composée — elle
   * n'a pas de séparateur — mais le garde-fou ne repose pas sur ce raisonnement,
   * il vérifie la propriété.
   */
  etatDe(sujet: string, slug: string): EtatLecon {
    const clef = composerClef(sujet, slug);
    if (clef === null) return ETAT_VIERGE;
    const etat = this.etat();
    return Object.hasOwn(etat, clef) ? (etat[clef] ?? ETAT_VIERGE) : ETAT_VIERGE;
  }

  /** `true` si le quiz de cette leçon a été réussi au moins une fois. */
  estMaitrisee(sujet: string, slug: string): boolean {
    return this.estMaitrise(this.etatDe(sujet, slug));
  }

  /**
   * Marque une leçon comme lue. Idempotent, et **jamais dégradant** : rouvrir une
   * leçon ne remet aucun score à zéro.
   */
  marquerLue(sujet: string, slug: string): void {
    const clef = composerClef(sujet, slug);
    if (clef === null) return;
    const actuel = this.etatDe(sujet, slug);
    if (actuel.lue) return;
    this.ecrire(clef, { ...actuel, lue: true });
  }

  /**
   * Enregistre le résultat d'un quiz.
   *
   * **Seul le MEILLEUR score est retenu** : un deuxième essai raté ne fait pas
   * perdre une maîtrise acquise. C'est un choix pédagogique, pas une facilité —
   * le quiz existe pour faire réviser, et un mécanisme qui punit le réessai
   * décourage exactement le geste qu'on veut encourager.
   *
   * Un appel incohérent (score > total, total nul, valeurs non entières) est
   * **ignoré** : il vient forcément d'un défaut d'appelant, et écrire un chiffre
   * faux serait pire que ne rien écrire.
   */
  enregistrerQuiz(sujet: string, slug: string, score: number, total: number): void {
    const clef = composerClef(sujet, slug);
    if (clef === null) return;
    if (!estCompteur(score) || !estCompteur(total) || total === 0 || score > total) return;

    const actuel = this.etatDe(sujet, slug);
    // Comparaison en PART, pas en nombre brut : un quiz peut gagner ou perdre des
    // questions entre deux versions de la leçon, et 4/5 vaut mieux que 5/10.
    const partActuelle = actuel.totalQuestions === 0 ? -1 : actuel.meilleurScore / actuel.totalQuestions;
    if (score / total <= partActuelle) {
      // Pas mieux qu'avant : on ne retient rien du quiz, mais la leçon est lue.
      this.marquerLue(sujet, slug);
      return;
    }

    this.ecrire(clef, { lue: true, meilleurScore: score, totalQuestions: total });
  }

  /**
   * Efface tout l'avancement. Le visiteur doit pouvoir reprendre à zéro sans
   * ouvrir les outils de développement — c'est la contrepartie de « on stocke
   * sans rien demander ».
   */
  reinitialiser(): void {
    this.etat.set({});
    if (!this.estNavigateur) return;
    try {
      this.document.defaultView?.localStorage.removeItem(CLE_PROGRESSION);
    } catch {
      // Stockage indisponible : l'état en mémoire est déjà vide, ce qui est
      // l'effet visible attendu pour la session en cours.
    }
  }

  private estMaitrise(etat: EtatLecon): boolean {
    if (etat.totalQuestions === 0) return false;
    return etat.meilleurScore / etat.totalQuestions >= SEUIL_REUSSITE;
  }

  /**
   * `clef` est toujours une clef **déjà composée** par `composerClef` : cette
   * méthode n'est jamais un point d'entrée pour une valeur non validée.
   */
  private ecrire(clef: string, etat: EtatLecon): void {
    const suivant: Progression = { ...this.etat(), [clef]: etat };
    this.etat.set(suivant);
    this.memoriser(suivant);
  }

  private lireStockage(): Progression {
    let brut: string | null;
    try {
      brut = this.document.defaultView?.localStorage.getItem(CLE_PROGRESSION) ?? null;
    } catch {
      // Navigation privée, cookies bloqués : l'accès à la propriété elle-même
      // peut lever, pas seulement `getItem`. Même parade que `ThemeService`.
      return {};
    }
    if (brut === null) return {};

    let analyse: unknown;
    try {
      analyse = JSON.parse(brut);
    } catch {
      // Contenu qui n'est même pas du JSON : on repart à zéro sans bruit. Le
      // prochain enregistrement écrasera la valeur illisible.
      return {};
    }

    if (typeof analyse !== 'object' || analyse === null) return {};
    const enveloppe = analyse as Partial<EnveloppeStockee>;

    // Version inconnue (antérieure ou postérieure) : on IGNORE, on ne devine pas.
    if (enveloppe.version !== VERSION_PROGRESSION) return {};

    const lecons = enveloppe.lecons;
    if (typeof lecons !== 'object' || lecons === null) return {};

    // `Object.entries` ne rend que les propriétés PROPRES et énumérables : rien
    // du prototype n'entre ici. Chaque clef repasse ensuite par `clefRelue`, donc
    // par la même liste blanche que l'écriture.
    const valides: Record<string, EtatLecon> = {};
    for (const [brute, valeur] of Object.entries(lecons)) {
      const clef = clefRelue(brute);
      if (clef === null) continue;
      const etat = lireEtatLecon(valeur);
      if (etat !== null) valides[clef] = etat;
    }
    return valides;
  }

  private memoriser(progression: Progression): void {
    const enveloppe: EnveloppeStockee = { version: VERSION_PROGRESSION, lecons: progression };
    try {
      this.document.defaultView?.localStorage.setItem(
        CLE_PROGRESSION,
        JSON.stringify(enveloppe),
      );
    } catch {
      // Quota dépassé ou stockage refusé : l'avancement ne survivra pas à
      // l'onglet, mais il DOIT valoir pour la session en cours — d'où le fait que
      // `ecrire` pose l'état AVANT d'écrire sur le disque.
    }
  }
}
