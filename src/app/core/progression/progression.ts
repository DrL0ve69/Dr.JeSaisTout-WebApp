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
// Comportement vérifié par `progression.spec.ts`.
// =============================================================================

import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, PLATFORM_ID, Service, computed, inject, signal } from '@angular/core';

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
 */
export const VERSION_PROGRESSION = 1;

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

/** L'état complet : un enregistrement indexé par slug de leçon. */
export type Progression = Readonly<Record<string, EtatLecon>>;

/** Forme réellement écrite sur le disque du visiteur. */
interface EnveloppeStockee {
  readonly version: number;
  readonly lecons: Progression;
}

const ETAT_VIERGE: EtatLecon = { lue: false, meilleurScore: 0, totalQuestions: 0 };

/**
 * Le slug est une clef d'objet ET une valeur relue du stockage : on le contraint
 * au même motif que le schéma de contenu (`quiz.schema.json` §identifiant). Une
 * clef arbitraire venue d'un stockage réécrit n'entre pas dans l'état.
 *
 * **Exporté pour être CONFRONTÉ au schéma**, pas par commodité : `progression.spec.ts`
 * lit `quiz.schema.json` au disque et compare les deux motifs. Sans cela, le
 * commentaire ci-dessus serait une promesse invérifiable — exactement la faute
 * L-016 (« un commentaire qui cite un fichier doit pointer vers du réel »).
 */
export const MOTIF_SLUG_LECON = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MOTIF_SLUG = MOTIF_SLUG_LECON;

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

  // `isPlatformBrowser` plutôt qu'`afterNextRender` : la carte de parcours
  // s'étiquette dès l'injection ; un état chargé après la première peinture
  // afficherait « non commencé » sur des modules déjà lus.
  private readonly estNavigateur = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly etat = signal<Progression>({});

  /** L'avancement complet, en lecture seule. */
  readonly progression = this.etat.asReadonly();

  /** Nombre de leçons ouvertes au moins une fois. */
  readonly nombreLues = computed(
    () => Object.values(this.etat()).filter((etat) => etat.lue).length,
  );

  /** Nombre de leçons dont le quiz est réussi — la « maîtrise ». */
  readonly nombreMaitrisees = computed(
    () => Object.values(this.etat()).filter((etat) => this.estMaitrise(etat)).length,
  );

  constructor() {
    if (!this.estNavigateur) {
      return;
    }
    this.etat.set(this.lireStockage());
  }

  /** L'état d'une leçon — toujours défini, « vierge » si elle est inconnue. */
  etatDe(slug: string): EtatLecon {
    return this.etat()[slug] ?? ETAT_VIERGE;
  }

  /** `true` si le quiz de cette leçon a été réussi au moins une fois. */
  estMaitrisee(slug: string): boolean {
    return this.estMaitrise(this.etatDe(slug));
  }

  /**
   * Marque une leçon comme lue. Idempotent, et **jamais dégradant** : rouvrir une
   * leçon ne remet aucun score à zéro.
   */
  marquerLue(slug: string): void {
    if (!MOTIF_SLUG.test(slug)) return;
    const actuel = this.etatDe(slug);
    if (actuel.lue) return;
    this.ecrire(slug, { ...actuel, lue: true });
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
  enregistrerQuiz(slug: string, score: number, total: number): void {
    if (!MOTIF_SLUG.test(slug)) return;
    if (!estCompteur(score) || !estCompteur(total) || total === 0 || score > total) return;

    const actuel = this.etatDe(slug);
    // Comparaison en PART, pas en nombre brut : un quiz peut gagner ou perdre des
    // questions entre deux versions de la leçon, et 4/5 vaut mieux que 5/10.
    const partActuelle = actuel.totalQuestions === 0 ? -1 : actuel.meilleurScore / actuel.totalQuestions;
    if (score / total <= partActuelle) {
      // Pas mieux qu'avant : on ne retient rien du quiz, mais la leçon est lue.
      this.marquerLue(slug);
      return;
    }

    this.ecrire(slug, { lue: true, meilleurScore: score, totalQuestions: total });
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

  private ecrire(slug: string, etat: EtatLecon): void {
    const suivant: Progression = { ...this.etat(), [slug]: etat };
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

    const valides: Record<string, EtatLecon> = {};
    for (const [slug, valeur] of Object.entries(lecons)) {
      if (!MOTIF_SLUG.test(slug)) continue;
      const etat = lireEtatLecon(valeur);
      if (etat !== null) valides[slug] = etat;
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
