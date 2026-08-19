// =============================================================================
// Tests de la COQUILLE — la structure, pas le contenu
// -----------------------------------------------------------------------------
// Les assertions d'E0-ST4 sur la page « chantier » (« Dr. Je-Sais-Tout » dans un
// `<h1>`, « sécurité des applications web » dans le texte) ont disparu d'ici
// VOLONTAIREMENT : ce composant ne rend plus de contenu. Ces mêmes vérifications
// vivent maintenant là où le contenu vit — `accueil.spec.ts` pour la page d'entrée
// et `app.routes.spec.ts` pour le `<h1>` unique de chaque route.
//
// Ce que ce fichier tient, et que rien d'autre ne peut tenir :
//  · les REPÈRES de la coquille — un `header`, un `main`, un `footer`, un seul de
//    chaque. C'est l'invariant qu'axe vérifie sur les pages construites
//    (`landmark-one-main`, `landmark-no-duplicate-banner`, `region`, `bypass`) ;
//    l'avoir aussi en test unitaire fait rougir en 2 secondes au lieu d'attendre
//    un `npm run build` complet ;
//  · le lien d'évitement PREMIER élément focalisable, et sa cible EXISTANTE ;
//  · l'absence de `<h1>` dans l'en-tête (chaque page routée porte le sien) ;
//  · le branchement effectif de `GestionFocusRoute`.
//
// `provideRouter([])` suffit : les composants d'en-tête utilisent `routerLink` et
// `routerLinkActive`, qui exigent un routeur — mais aucune route n'a besoin
// d'exister pour vérifier une structure.
// =============================================================================

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { GestionFocusRoute, ID_CONTENU_PRINCIPAL } from './core/layout/gestion-focus-route';

/**
 * Compteur de constructions du service de focus. Sert de PREUVE que la coquille
 * l'injecte : un `@Service()` que personne n'injecte est élagué du bundle et ne
 * tourne jamais, sans le moindre message.
 */
let constructionsFocus = 0;

class GestionFocusRouteEspionnee extends GestionFocusRoute {
  constructor() {
    super();
    constructionsFocus += 1;
  }
}

async function rendre(): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(App);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('App (coquille)', () => {
  beforeEach(() => {
    constructionsFocus = 0;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: GestionFocusRoute, useClass: GestionFocusRouteEspionnee },
      ],
    });
  });

  it('crée le composant racine', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('repères ARIA — un seul de chaque', () => {
    it('expose exactement un `header`, un `main` et un `footer`', async () => {
      const rendu = await rendre();

      // `landmark-one-main` + `landmark-no-duplicate-main` chez axe : la coquille
      // est la SEULE à émettre le `<main>`. Si un composant de page en ajoutait un
      // (ou si celui-ci disparaissait), c'est ici que ça rougit d'abord.
      expect(rendu.querySelectorAll('main').length).toBe(1);
      // `landmark-no-duplicate-banner` : l'en-tête émet DÉJÀ son `<header>` —
      // l'envelopper dans un second en produirait deux imbriqués.
      expect(rendu.querySelectorAll('header').length).toBe(1);
      // `landmark-no-duplicate-contentinfo` : idem pour le pied de page.
      expect(rendu.querySelectorAll('footer').length).toBe(1);
      expect(rendu.querySelectorAll('footer[role="contentinfo"]').length).toBe(1);
    });

    it('place le `router-outlet` DANS le `main`, pas à côté', async () => {
      const rendu = await rendre();
      const main = rendu.querySelector('main');

      // Le contenu routé hors du `<main>` serait du texte sans repère : `region`
      // chez axe, et un lien d'évitement qui saute par-dessus la page.
      expect(main?.querySelector('router-outlet')).not.toBeNull();
    });

    it('ne met AUCUN `h1` dans la coquille — chaque page routée porte le sien', async () => {
      const rendu = await rendre();

      // Un `<h1>` dans l'en-tête en mettrait deux sur TOUTES les pages d'un coup.
      expect(rendu.querySelector('header')?.querySelectorAll('h1').length).toBe(0);
      expect(rendu.querySelectorAll('h1').length).toBe(0);
    });
  });

  describe('lien d’évitement (WCAG 2.4.1)', () => {
    it('est le PREMIER élément focalisable de la page', async () => {
      const rendu = await rendre();

      // La liste des éléments naturellement focalisables du site en phase 1 :
      // liens, boutons, champs. `[tabindex="-1"]` en est exclu — le `<main>` est
      // focalisable par script, pas par tabulation, et n'entre donc pas dans cet
      // ordre. C'est précisément ce que ce test doit prouver.
      const focalisables = rendu.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      expect(focalisables.length).toBeGreaterThan(1);
      expect(focalisables[0]?.classList.contains('lien-evitement')).toBe(true);
    });

    it('pointe vers une cible qui EXISTE dans la page', async () => {
      const rendu = await rendre();
      const lien = rendu.querySelector<HTMLAnchorElement>('.lien-evitement');

      // Le contrat entre `app.html` et `gestion-focus-route.ts` : les deux visent
      // le même `id`. On le vérifie sur le DOM RENDU et depuis la constante du
      // service — renommer l'`id` d'un seul côté rougit (L-012).
      expect(lien?.getAttribute('href')).toBe(`#${ID_CONTENU_PRINCIPAL}`);
      expect(rendu.querySelector(`#${ID_CONTENU_PRINCIPAL}`)?.tagName).toBe('MAIN');
    });

    it('cible un `main` focalisable par script mais hors tabulation', async () => {
      const rendu = await rendre();
      const main = rendu.querySelector('main');

      // `tabindex="-1"` : sans lui, `focus()` ne prendrait pas sur un élément non
      // interactif et le saut du lien d'évitement déplacerait le défilement sans
      // déplacer le focus — le clavier resterait dans l'en-tête.
      expect(main?.getAttribute('tabindex')).toBe('-1');
    });

    it('n’est pas masqué par une technique qui le sortirait de la tabulation', async () => {
      const rendu = await rendre();
      const lien = rendu.querySelector<HTMLElement>('.lien-evitement');

      // Garde-fou contre la « correction » la plus tentante : cacher le lien avec
      // `hidden`, `display:none` ou `visibility:hidden` le rendrait définitivement
      // inatteignable au clavier, donc invisible pour toujours. Le masquage réel
      // se fait par `clip-path` dans `app.scss` — hors de portée de jsdom, qui ne
      // charge aucune feuille de style ; ce qui est vérifiable ici, c'est
      // l'absence des trois techniques fautives sur l'élément lui-même.
      expect(lien?.hasAttribute('hidden')).toBe(false);
      expect(lien?.getAttribute('aria-hidden')).toBeNull();
      expect(lien?.style.display).not.toBe('none');
      expect(lien?.style.visibility).not.toBe('hidden');
    });
  });

  describe('câblage de `GestionFocusRoute`', () => {
    it('est CONSTRUIT par la coquille — sinon il serait élagué du bundle', async () => {
      expect(constructionsFocus).toBe(0);

      await rendre();

      // Si `App` cesse d'injecter le service, ce compteur reste à 0 : le service
      // serait livré mort, le focus ne bougerait plus à la navigation, et aucun
      // autre test ne s'en apercevrait.
      expect(constructionsFocus).toBe(1);
    });
  });
});
