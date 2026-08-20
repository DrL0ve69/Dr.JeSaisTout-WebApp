// =============================================================================
// PluieGlyphes — le décor de scène de la bande d'ouverture (direction « Moniteur ambre »)
// -----------------------------------------------------------------------------
// CE QUE C'EST, ET SURTOUT CE QUE CE N'EST PAS. Une pluie de glyphes peinte au
// `<canvas>`, DERRIÈRE la bande d'ouverture de l'accueil, et nulle part ailleurs.
// C'est un CADRE — l'écran de l'opérateur — jamais un déguisement du contenu :
//  · G10 : aucune cascade de 0/1, aucune formule de film (« ACCESS GRANTED »),
//    aucun texte qui se tape tout seul. Les glyphes sont la PONCTUATION du code
//    (`<`, `>`, `{`, `}`, `;`…), choisie précisément parce qu'elle ne peut pas
//    former de mot : rien à lire, donc rien à confondre avec de l'information.
//  · G11 : la lecture prime — ce composant n'est JAMAIS monté sur une page de
//    leçon. Son unique point d'appel est `accueil.ts`.
//  · G1/G2 : aucun dégradé, aucune surface translucide « verre » ; le canevas
//    peint des glyphes mats sur le fond de la page.
//
// 🔴 C'EST DU DÉCOR, DONC CE N'EST PAS DE L'INFORMATION. L'hôte porte
// `aria-hidden="true"` ET `inert` : le premier le retire de l'arbre
// d'accessibilité, le second le retire du parcours de pointeur et de clavier.
// Les deux, pas l'un des deux — `aria-hidden` seul laisserait un descendant
// focalisable atteignable et invisible aux lecteurs d'écran (le pire des deux
// mondes), `inert` seul le laisserait annoncé.
//
// 🔴 `prefers-reduced-motion` — CEINTURE ET BRETELLES, DEUX PARADES DISJOINTES.
//   1. CSS (`pluie-glyphes.scss`) : `display: none` sous
//      `prefers-reduced-motion: reduce`. Elle couvre le RENDU, y compris avant
//      toute hydratation et même si le JavaScript ne s'exécute jamais.
//   2. JS (ci-dessous) : `matchMedia('(prefers-reduced-motion: reduce)')` consulté
//      dans `afterNextRender`, et réévalué à chaque `change`. Elle couvre le
//      CALCUL — sans elle, un `display: none` masquerait une boucle
//      `requestAnimationFrame` qui continuerait de tourner et de chauffer la
//      machine sans que rien ne se voie.
// Une seule des deux ne suffit pas : la première ne dépense rien mais peint quand
// même dans le presse-papier du compositeur, la seconde ne peut rien avant
// l'hydratation. Elles ne se recouvrent pas.
//
// ⚠️ `withNoIncrementalHydration()` EST ACTIF ET LA ROUTE `/` EST PRERENDUE
// (L-033). Ce composant est écrit pour que cela n'ait aucune conséquence : il
// n'expose AUCUN état, ne lit AUCUNE saisie, et ne peint qu'à partir
// d'`afterNextRender`. Sans JavaScript, le `<canvas>` reste un rectangle vide —
// la bande d'ouverture est lisible en entier, puisque tout son texte est peint
// PAR-DESSUS, dans le flux normal. Il n'y a donc rien à « rejouer » et rien à
// amorcer depuis le DOM.
//
// ⚠️ AUCUN SCRIPT INLINE, AUCUN ATTRIBUT `style`. La CSP du site est à hachages
// NOMINATIFS (S-005) : un script inline neuf ferait échouer le build. Ce fichier
// est un chunk JavaScript ordinaire, et toutes ses couleurs sont LUES sur les
// jetons sémantiques calculés de l'hôte (`--couleur-accent`, `--couleur-surface`,
// `--police-code`) — jamais écrites en dur, jamais poussées dans un attribut.
//
// ⚠️ `Math.random` EST UN GÉNÉRATEUR DE DÉCOR, PAS UN INSTRUMENT DE MESURE.
// S-013 vise l'aléa faible dans un gate de sécurité ; ici il ne décide de rien
// d'observable, il répartit des colonnes.
// =============================================================================

import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';

/**
 * Les glyphes peints. UNIQUEMENT de la ponctuation de code : aucune lettre, aucun
 * chiffre — donc aucun mot possible, aucune cascade binaire (G10). Le lecteur voit
 * une texture de terminal, jamais un message.
 */
const GLYPHES = ['<', '>', '/', '{', '}', '[', ']', '(', ')', ';', ':', '=', '+', '*', '&', '|'];

/** Côté d'une case de la grille de glyphes, en pixels logiques. */
const PAS = 18;

/** Une image peinte sur N : la pluie doit être lente, c'est un fond de scène. */
const IMAGES_PAR_PAS = 4;

/** Opacité du voile de fond qui efface l'image précédente — d'où la traîne. */
const OPACITE_VOILE = 0.14;

/** Opacité d'un glyphe. Volontairement basse : le décor ne dispute rien au texte. */
const OPACITE_GLYPHE = 0.5;

/** Probabilité qu'une colonne arrivée en bas reparte du haut, à chaque pas. */
const CHANCE_DE_REPARTIR = 0.03;

@Component({
  selector: 'app-pluie-glyphes',
  styleUrl: './pluie-glyphes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Décor : hors de l'arbre d'accessibilité ET hors de tout parcours (voir l'en-tête).
    'aria-hidden': 'true',
    inert: '',
  },
  template: `<canvas #toile class="toile"></canvas>`,
})
export class PluieGlyphes {
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly toile = viewChild<ElementRef<HTMLCanvasElement>>('toile');

  /** Position verticale de la tête de chaque colonne, en pixels logiques. */
  private tetes: number[] = [];
  private largeur = 0;
  private hauteur = 0;
  private compteur = 0;
  private idImage: number | null = null;

  constructor() {
    const destruction = inject(DestroyRef);

    afterNextRender(() => {
      // PARADE 2/2 (voir l'en-tête). `matchMedia` absent ⇒ on ne sait pas ce que
      // préfère la personne : on ne peint pas. Le défaut penche du côté du calme.
      const media =
        typeof window.matchMedia === 'function'
          ? window.matchMedia('(prefers-reduced-motion: reduce)')
          : null;
      if (media === null) return;

      const appliquer = (): void => {
        if (media.matches) this.arreter();
        else this.demarrer();
      };

      media.addEventListener('change', appliquer);

      // La bande d'ouverture se replie avec la fenêtre : sans réobservation, le
      // canevas garderait la taille qu'il avait au premier rendu et s'étirerait.
      const observateur =
        typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.mesurer()) : null;
      observateur?.observe(this.hote.nativeElement);

      destruction.onDestroy(() => {
        media.removeEventListener('change', appliquer);
        observateur?.disconnect();
        this.arreter();
      });

      appliquer();
    });
  }

  /** Le contexte 2D, ou `null` si l'environnement n'en fournit pas (jsdom). */
  private contexte(): CanvasRenderingContext2D | null {
    const toile = this.toile()?.nativeElement;
    if (toile === undefined) return null;
    try {
      return toile.getContext('2d');
    } catch {
      return null;
    }
  }

  private demarrer(): void {
    if (this.idImage !== null) return;

    const contexte = this.contexte();
    if (contexte === null) return;

    this.mesurer();

    const peindre = (): void => {
      this.peindre(contexte);
      this.idImage = requestAnimationFrame(peindre);
    };

    this.idImage = requestAnimationFrame(peindre);
  }

  private arreter(): void {
    if (this.idImage === null) return;
    cancelAnimationFrame(this.idImage);
    this.idImage = null;
  }

  /** Recale le canevas sur la taille réelle de l'hôte, densité d'écran comprise. */
  private mesurer(): void {
    const toile = this.toile()?.nativeElement;
    if (toile === undefined) return;

    const cadre = this.hote.nativeElement.getBoundingClientRect();
    this.largeur = Math.max(1, Math.round(cadre.width));
    this.hauteur = Math.max(1, Math.round(cadre.height));

    // Plafonné à 2 : au-delà, on quadruple le coût de peinture d'un décor.
    const densite = Math.min(window.devicePixelRatio || 1, 2);
    toile.width = Math.round(this.largeur * densite);
    toile.height = Math.round(this.hauteur * densite);

    const contexte = this.contexte();
    // Écrire `width`/`height` réinitialise la matrice : on la repose APRÈS.
    contexte?.setTransform(densite, 0, 0, densite, 0, 0);

    const colonnes = Math.ceil(this.largeur / PAS);
    this.tetes = Array.from({ length: colonnes }, () => Math.random() * this.hauteur);
  }

  private peindre(contexte: CanvasRenderingContext2D): void {
    this.compteur += 1;
    if (this.compteur % IMAGES_PAR_PAS !== 0) return;

    const styles = getComputedStyle(this.hote.nativeElement);
    const fond = styles.getPropertyValue('--couleur-surface').trim();
    const encre = styles.getPropertyValue('--couleur-accent').trim();
    const police = styles.getPropertyValue('--police-code').trim();

    // Le voile qui efface l'image précédente : c'est lui qui fabrique la traîne,
    // sans jamais peindre de dégradé (G1) — un aplat translucide, pas une rampe.
    contexte.globalAlpha = OPACITE_VOILE;
    contexte.fillStyle = fond;
    contexte.fillRect(0, 0, this.largeur, this.hauteur);

    contexte.globalAlpha = OPACITE_GLYPHE;
    contexte.fillStyle = encre;
    contexte.font = `${String(PAS)}px ${police}`;
    contexte.textBaseline = 'top';

    for (const [colonne, tete] of this.tetes.entries()) {
      const glyphe = GLYPHES[Math.floor(Math.random() * GLYPHES.length)] ?? GLYPHES[0] ?? '';
      contexte.fillText(glyphe, colonne * PAS, tete);

      const suivante = tete + PAS;
      this.tetes[colonne] =
        suivante > this.hauteur && Math.random() < CHANCE_DE_REPARTIR ? 0 : suivante;
    }

    contexte.globalAlpha = 1;
  }
}
