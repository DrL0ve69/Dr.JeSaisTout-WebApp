// =============================================================================
// ThemeService — l'état tri-état du thème (clair / sombre / système)
// -----------------------------------------------------------------------------
// LA MOITIÉ « ÉCRITURE » D'UN CONTRAT DÉJÀ ÉCRIT EN LECTURE.
// Le script anti-flash de `src/index.html` (E1-ST1-C) lit `localStorage`
// ['drjst-theme'] avant la première peinture et n'épingle `data-theme` que sur
// `clair` ou `sombre`. Ce service écrit la MÊME clé avec les MÊMES trois états.
// Les deux fichiers se lisent ensemble : renommer la clé, un état ou l'attribut
// d'un seul côté laisserait le visiteur épinglé sur un sélecteur inexistant —
// page rendue en clair, sans message et sans test rouge.
//
// L'ABSENCE d'attribut EST l'état « système ». `src/styles/_themes.scss` fait
// basculer le sombre via `@media screen and (prefers-color-scheme: dark)` sur
// `:root:not([data-theme])` : poser `data-theme="systeme"` ne correspondrait à
// AUCUN sélecteur et gèlerait la page en clair sur un OS en sombre.
//
// CONTRAINTE DE PRERENDER. `outputMode: "static"` prerend toutes les routes :
// ce service s'instancie aussi dans Node, où ni `localStorage` ni `matchMedia`
// n'existent. Tout accès au navigateur est donc gardé — un oubli casserait
// `npm run build`, pas seulement l'exécution en ligne.
//
// Ce service ne rend RIEN : la bascule visible est E1-ST2 (en-tête du shell).
// Comportement vérifié par `theme.spec.ts` ; la moitié lecture par
// `src/init-theme.spec.ts`.
// =============================================================================

import { isPlatformBrowser } from '@angular/common';
import {
  DOCUMENT,
  DestroyRef,
  PLATFORM_ID,
  Service,
  computed,
  inject,
  signal,
} from '@angular/core';

/**
 * Les trois états, en liste FERMÉE : elle sert aussi de liste blanche à la
 * lecture du stockage, que le visiteur peut modifier à sa guise.
 */
export const THEMES = ['clair', 'sombre', 'systeme'] as const;

/** Le choix du visiteur — ce qui est persisté. */
export type Theme = (typeof THEMES)[number];

/** Ce que la page rend vraiment : « systeme » est résolu, il ne s'affiche jamais. */
export type ThemeEffectif = Exclude<Theme, 'systeme'>;

/** Même clé que le script inline de `src/index.html` — contrat E1-ST1-C. */
export const CLE_THEME = 'drjst-theme';

/** Même attribut que les sélecteurs de `src/styles/_themes.scss`. */
export const ATTRIBUT_THEME = 'data-theme';

/**
 * La CONDITION du bloc `@media` de `_themes.scss` — pas sa chaîne entière.
 * Ce bloc s'écrit `@media screen and (prefers-color-scheme: dark)` : le
 * `screen and` n'y sert qu'à exclure l'impression (Firefox et Safari évaluent
 * encore `prefers-color-scheme` sur papier). `matchMedia` interroge déjà l'écran
 * courant, la restriction n'aurait donc rien à y faire. Ne PAS « aligner » les
 * deux chaînes en recopiant `screen and` ici : elles décrivent le même écran
 * depuis deux contextes différents, et c'est la condition seule qui doit
 * rester identique de part et d'autre.
 */
export const REQUETE_SOMBRE = '(prefers-color-scheme: dark)';

/** Liste blanche fermée : tout ce qui n'est pas un état connu vaut « systeme ». */
function estTheme(valeur: unknown): valeur is Theme {
  return typeof valeur === 'string' && (THEMES as readonly string[]).includes(valeur);
}

// `@Service()` est la forme Angular 22 de `@Injectable({ providedIn: 'root' })` :
// singleton auto-fourni à la racine et élagable. C'est ce qu'émet
// `ng generate service core/theme/theme`.
@Service()
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  // `isPlatformBrowser` plutôt qu'`afterNextRender` : l'état doit être JUSTE dès
  // l'injection — la bascule d'E1-ST2 s'étiquette avec, et `afterNextRender`
  // ne s'exécuterait qu'après une première peinture déjà étiquetée à tort.
  private readonly estNavigateur = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly choixCourant = signal<Theme>('systeme');
  private readonly preferenceSombre = signal(false);

  /** Le choix du visiteur, tel qu'il est stocké — « systeme » par défaut. */
  readonly choix = this.choixCourant.asReadonly();

  /**
   * Le thème réellement rendu : « systeme » résolu par `prefers-color-scheme`.
   * Exposé pour l'étiquetage de la future bascule (E1-ST2) ; ce service ne
   * s'en sert pas lui-même — c'est `_themes.scss` qui peint.
   */
  readonly themeEffectif = computed<ThemeEffectif>(() => {
    const choix = this.choixCourant();
    if (choix !== 'systeme') {
      return choix;
    }
    return this.preferenceSombre() ? 'sombre' : 'clair';
  });

  constructor() {
    // Prerender (Node) : « systeme » sans attribut est exactement ce que le HTML
    // livré doit contenir, puisque le serveur ignore la préférence du visiteur.
    if (!this.estNavigateur) {
      return;
    }

    this.choixCourant.set(this.lireChoixStocke());
    // Idempotent — le script inline a déjà posé l'attribut avant la première
    // peinture. On réaligne quand même : si ce script avait été bloqué (CSP,
    // extension), le DOM se remettrait d'accord avec l'état ici plutôt que de
    // diverger en silence.
    this.appliquer(this.choixCourant());
    this.suivrePreferenceSysteme();
  }

  /**
   * Change le thème : état, attribut sur `<html>`, puis mémorisation.
   *
   * AU PRERENDER (Node), seul le signal change — volontairement. Le HTML
   * prerendu est le MÊME fichier pour tous les visiteurs : y écrire un
   * `data-theme` épinglerait le choix d'un seul sur la page servie à tout le
   * monde, et le figerait jusqu'à la reconstruction du site. Le stockage, lui,
   * n'existe pas côté serveur.
   */
  definir(theme: Theme): void {
    // Liste blanche à l'EXÉCUTION, pas seulement à la compilation : ce dépôt
    // n'active pas `strict`, la garantie de type est donc plus faible qu'elle
    // n'en a l'air (un `undefined` d'appelant traverse le compilateur). Ce
    // n'est pas un vecteur XSS — `setAttribute('data-theme', …)` n'exécute
    // rien — mais un état inconnu épinglerait un sélecteur que `_themes.scss`
    // ne connaît pas et gèlerait la page en clair, sans message.
    if (!estTheme(theme)) {
      return;
    }

    this.choixCourant.set(theme);

    if (!this.estNavigateur) {
      return;
    }
    this.appliquer(theme);
    this.memoriser(theme);
  }

  private lireChoixStocke(): Theme {
    try {
      const brut = this.document.defaultView?.localStorage.getItem(CLE_THEME);
      return estTheme(brut) ? brut : 'systeme';
    } catch {
      // Stockage refusé (navigation privée, cookies bloqués) : on reste système.
      // Même parade que le script inline — l'accès à la propriété elle-même peut
      // lever, pas seulement `getItem`.
      return 'systeme';
    }
  }

  private memoriser(theme: Theme): void {
    try {
      this.document.defaultView?.localStorage.setItem(CLE_THEME, theme);
    } catch {
      // Quota ou stockage indisponible : le choix ne survivra pas à l'onglet,
      // mais il DOIT s'appliquer pour la session en cours — d'où le fait que
      // `definir` pose l'attribut AVANT d'écrire.
    }
  }

  private appliquer(theme: Theme): void {
    const racine = this.document.documentElement;
    if (theme === 'systeme') {
      racine.removeAttribute(ATTRIBUT_THEME);
      return;
    }
    racine.setAttribute(ATTRIBUT_THEME, theme);
  }

  /** Écoute la préférence de l'OS pour que « systeme » suive sans rechargement. */
  private suivrePreferenceSysteme(): void {
    // `?.()` : un navigateur sans `matchMedia` ne doit pas empêcher la bascule
    // manuelle de fonctionner — seule la résolution de « systeme » y perdrait.
    const requete = this.document.defaultView?.matchMedia?.(REQUETE_SOMBRE);
    if (!requete) {
      return;
    }

    this.preferenceSombre.set(requete.matches);

    const surChangement = (evenement: MediaQueryListEvent): void => {
      this.preferenceSombre.set(evenement.matches);
    };
    requete.addEventListener('change', surChangement);
    this.destroyRef.onDestroy(() => requete.removeEventListener('change', surChangement));
  }
}
