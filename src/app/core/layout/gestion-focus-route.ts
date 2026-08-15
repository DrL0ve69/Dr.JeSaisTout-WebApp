// =============================================================================
// GestionFocusRoute — remettre le focus sur le contenu à chaque navigation
// -----------------------------------------------------------------------------
// LE DÉFAUT QUE CE SERVICE CORRIGE. Dans une application à page unique, changer de
// route remplace le contenu MAIS NE DÉPLACE PAS LE FOCUS. Un visiteur au clavier
// qui active « Sécurité des applications web » dans l'en-tête reste donc focalisé
// sur ce lien : sa tabulation suivante le mène au lien voisin, pas à la page qu'il
// vient d'ouvrir, et un lecteur d'écran n'annonce rien du nouveau contenu. C'est
// WCAG 2.4.3 (ordre du focus) et 2.4.1 (contourner des blocs) qui décrochent, et
// la raison pour laquelle le lien d'évitement de la coquille et ce service visent
// la MÊME cible, `#contenu-principal`.
//
// LA PREMIÈRE NAVIGATION EST IGNORÉE, ET C'EST LE CŒUR DU COMPORTEMENT. Le
// routeur émet une navigation au démarrage (prerender compris) : voler le focus à
// ce moment-là déplacerait le point d'entrée du visiteur au CHARGEMENT de la page,
// sautant le lien d'évitement et l'en-tête. Ce serait un défaut d'accessibilité
// introduit par la correction d'un autre. On ne déplace donc le focus que sur les
// navigations qui suivent — celles qu'un geste de l'utilisateur a déclenchées.
// `skip(1)` est sûr ici parce que ce service est injecté par `App` PENDANT le
// démarrage, donc abonné AVANT la première navigation ; un service instancié
// paresseusement plus tard sauterait, lui, une navigation réelle.
//
// UNE NAVIGATION QUI NE CHANGE QUE LE FRAGMENT N'EST PAS UN CHANGEMENT DE PAGE.
// `app.config.ts` active `anchorScrolling: 'enabled'` pour les sommaires ancrés
// d'E2 : un `routerLink` + `fragment` vers `#chiffrement` doit amener le visiteur
// AU TITRE VISÉ. Si ce service y répondait, il ramènerait le focus en tête du
// `<main>` — les deux fonctionnalités se neutraliseraient, et le lien d'ancre ne
// mènerait nulle part au clavier. On compare donc le CHEMIN (fragment retiré)
// d'une navigation à l'autre, et on ne bouge que s'il a changé. Le `distinct`
// précède le `skip(1)` : c'est la première navigation DISTINCTE — celle du
// démarrage — qui est ignorée, y compris si l'URL d'entrée portait déjà un
// fragment.
//
// CONTRAINTE DE PRERENDER (même patron que `core/theme/theme.ts`). Ce service
// s'instancie aussi dans Node : ni `document.getElementById` utilisable, ni focus à
// déplacer sur une page qui n'est pas encore affichée. Tout est donc derrière
// `isPlatformBrowser` — un oubli casserait `npm run build` pour TOUTES les routes,
// pas seulement l'exécution en ligne. `gestion-focus-route.spec.ts` vérifie
// l'ABSENCE d'abonnement ET l'ABSENCE d'appel à `getElementById` côté serveur :
// sans ces deux assertions, les tests resteraient verts gardes retirées (L-005).
//
// ⚠️ IL DOIT ÊTRE RÉELLEMENT INJECTÉ. Un `@Service()` que personne n'injecte est
// élagué du bundle : il ne tournerait jamais, sans le moindre message. `App`
// l'injecte dans son constructeur, et `app.spec.ts` le prouve.
// =============================================================================

import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, PLATFORM_ID, Service, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { distinctUntilChanged, filter, map, skip } from 'rxjs';

/**
 * L'identifiant du `<main>` de la coquille — cible commune du lien d'évitement
 * (`app.html`) et de ce service. Les deux extrémités sont vérifiées ensemble par
 * `app.spec.ts`, sur le DOM RENDU : renommer l'`id` d'un seul côté rougit.
 */
export const ID_CONTENU_PRINCIPAL = 'contenu-principal';

/**
 * Le chemin d'une URL du routeur, fragment retiré — `/cours#chiffrement` et
 * `/cours#sessions` rendent donc la MÊME valeur.
 *
 * La chaîne de requête est volontairement CONSERVÉE : `?page=2` change le contenu
 * affiché, c'est une vraie navigation, et le focus doit suivre. Seul le fragment
 * désigne un endroit DANS la page déjà affichée.
 */
function cheminSansFragment(url: string): string {
  const debutFragment = url.indexOf('#');
  return debutFragment === -1 ? url : url.slice(0, debutFragment);
}

@Service()
export class GestionFocusRoute {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly estNavigateur = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    if (!this.estNavigateur) {
      return;
    }

    this.router.events
      .pipe(
        filter((evenement) => evenement instanceof NavigationEnd),
        map((evenement) => cheminSansFragment(evenement.urlAfterRedirects)),
        // Un simple saut d'ancre dans la page courante — voir l'en-tête.
        distinctUntilChanged(),
        // La navigation de démarrage — voir l'en-tête du fichier.
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.deplacerFocusSurLeContenu();
      });
  }

  /**
   * `preventScroll: true` est OBLIGATOIRE, pas une précaution : `provideRouter`
   * est configuré avec `withInMemoryScrolling` (`app.config.ts`), qui remet la
   * page en haut à chaque navigation. Un `focus()` ordinaire fait défiler le
   * navigateur jusqu'à l'élément focalisé et se battrait avec cette remise à
   * zéro — position finale imprévisible selon l'ordre des deux effets.
   *
   * Aucune plainte si la cible est absente : la coquille est la seule à monter ce
   * `<main>`, et un lancement de test qui rend un composant seul n'a pas à échouer
   * pour autant. La PRÉSENCE de la cible est garantie ailleurs — par le test de
   * coquille, où elle est réellement vérifiable.
   */
  private deplacerFocusSurLeContenu(): void {
    this.document.getElementById(ID_CONTENU_PRINCIPAL)?.focus({ preventScroll: true });
  }
}
