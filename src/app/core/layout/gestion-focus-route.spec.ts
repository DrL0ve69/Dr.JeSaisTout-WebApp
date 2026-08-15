// =============================================================================
// Tests de GestionFocusRoute — le cœur accessibilité de la coquille
// -----------------------------------------------------------------------------
// Ce service n'a AUCUNE API publique : il s'injecte, il écoute, il déplace le
// focus. Rien de ce qu'il fait n'est visible d'un autre test — `app.spec.ts`
// prouve seulement qu'il est CONSTRUIT. Sans ce fichier, la garde
// `isPlatformBrowser`, le `skip(1)` et le `preventScroll: true` pouvaient tous
// disparaître sans qu'un seul test rougisse (L-005, L-008).
//
// TROIS CHOIX DE MÉTHODE, chacun pour rendre une garde RÉELLEMENT mordante :
//
//  1. LE VRAI ROUTEUR, pas un faux `events`. Fabriquer des `NavigationEnd` à la
//     main reviendrait à écrire soi-même l'`urlAfterRedirects` que le service
//     inspecte — le test vérifierait alors sa propre fixture. On navigue donc
//     pour de vrai, et c'est le routeur qui compose les URL.
//  2. L'ABONNEMENT EST COMPTÉ, pas déduit. Côté serveur, « aucun appel à
//     `getElementById` » resterait vert même si le service s'abonnait pour ne
//     rien trouver ; on lit donc directement le nombre d'abonnés du `Subject`
//     d'événements. La sonde est bidirectionnelle (L-013) : abonné dans le
//     navigateur, PAS abonné sur le serveur — un test qui ne vérifierait qu'un
//     seul sens ne distinguerait pas la garde d'un `Subject` inerte.
//  3. LES ERREURS AVALÉES PAR RXJS SONT CAPTURÉES. Une exception levée dans un
//     `subscribe` n'échoue pas le test : rxjs l'attrape et la renvoie hors pile
//     via `config.onUnhandledError`. Sans le collecteur ci-dessous, le cas
//     « cible absente du DOM » serait un test complaisant — il passerait aussi
//     bien avec un `.focus()` non protégé.
//
// L-012 : l'identifiant de la cible est écrit EN CLAIR ici, jamais importé du
// service. Renommer `ID_CONTENU_PRINCIPAL` sans toucher à `app.html` doit sortir
// rouge des deux côtés — ici, et sur le DOM rendu dans `app.spec.ts`.
// =============================================================================

import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, Routes, provideRouter } from '@angular/router';
import { Subject, config as configurationRxjs } from 'rxjs';

import { GestionFocusRoute } from './gestion-focus-route';

/** L'`id` du `<main>` de la coquille — valeur attendue, choisie par le test. */
const ID_CIBLE = 'contenu-principal';

/** De quoi faire changer l'URL : aucune page n'est montée dans ces tests. */
const ROUTES_HARNAIS: Routes = [{ path: '**', children: [] }];

/** Les erreurs qu'rxjs a sorties de la pile pendant le test en cours. */
let erreursRxjs: unknown[] = [];
let onUnhandledErrorOriginal: typeof configurationRxjs.onUnhandledError;

/**
 * Rend la main assez longtemps pour qu'rxjs ait vidé sa file d'erreurs
 * différées : `reportUnhandledError` passe par un `setTimeout`.
 */
function attendreLesErreursDifferees(): Promise<void> {
  return new Promise((resoudre) => {
    setTimeout(resoudre, 0);
  });
}

/** Le `<main>` que la coquille monte en vrai, reconstitué pour ces tests. */
function poserLaCible(): HTMLElement {
  const main = document.createElement('main');
  main.id = ID_CIBLE;
  main.tabIndex = -1;
  document.body.append(main);
  return main;
}

/**
 * Le nombre d'abonnés au flux d'événements du routeur.
 *
 * `Router.events` expose un `Subject` rxjs (`_events`) : on en lit `observed`.
 * Si ce n'était plus le cas, ce test ne saurait plus compter et doit le DIRE
 * plutôt que de rendre un `false` rassurant.
 */
function estAbonneAuRouteur(router: Router): boolean {
  const flux = router.events as unknown as Partial<Subject<unknown>>;
  if (typeof flux.observed !== 'boolean') {
    throw new Error(
      '`Router.events` n’est plus un `Subject` rxjs : ce test ne peut plus compter ' +
        'les abonnés et doit être réécrit.',
    );
  }
  return flux.observed;
}

/** Installe le service sur la plateforme voulue, AVANT toute navigation. */
function installer(plateforme: 'browser' | 'server'): Router {
  TestBed.configureTestingModule({
    providers: [provideRouter(ROUTES_HARNAIS), { provide: PLATFORM_ID, useValue: plateforme }],
  });
  // L'injection EST le branchement : le constructeur s'abonne (ou non).
  TestBed.inject(GestionFocusRoute);
  return TestBed.inject(Router);
}

/** Combien de fois la CIBLE précise a été cherchée dans le document. */
function recherchesDeLaCible(espion: { mock: { calls: unknown[][] } }): number {
  return espion.mock.calls.filter((arguments_) => arguments_[0] === ID_CIBLE).length;
}

describe('GestionFocusRoute', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    erreursRxjs = [];
    onUnhandledErrorOriginal = configurationRxjs.onUnhandledError;
    configurationRxjs.onUnhandledError = (erreur: unknown) => {
      erreursRxjs.push(erreur);
    };
  });

  afterEach(() => {
    configurationRxjs.onUnhandledError = onUnhandledErrorOriginal;
    vi.restoreAllMocks();
    for (const main of [...document.body.querySelectorAll('main')]) {
      main.remove();
    }
  });

  describe('prerender (Node, `PLATFORM_ID` serveur)', () => {
    it('ne s’abonne PAS au routeur et n’effleure pas le document', async () => {
      // Dans Node, `document` n'existe pas : la moindre lecture ferait échouer le
      // prerender de TOUTES les routes, pas seulement l'exécution en ligne. Les
      // deux assertions sont nécessaires — sans le compte d'abonnés, un service
      // qui écouterait pour ne rien trouver passerait pour sage.
      poserLaCible();
      const recherche = vi.spyOn(document, 'getElementById');

      const router = installer('server');

      expect(estAbonneAuRouteur(router)).toBe(false);

      await router.navigateByUrl('/premiere');
      await router.navigateByUrl('/seconde');

      expect(recherchesDeLaCible(recherche)).toBe(0);
    });
  });

  describe('navigateur', () => {
    it('S’ABONNE au routeur — l’autre moitié de la sonde', () => {
      // Sans ce sens-là, le test serveur ci-dessus resterait vert même si le
      // service ne s'abonnait JAMAIS, sur aucune plateforme.
      const router = installer('browser');

      expect(estAbonneAuRouteur(router)).toBe(true);
    });

    it('IGNORE la première navigation, puis focalise la cible sur la seconde', async () => {
      // La première `NavigationEnd` est celle du démarrage : y déplacer le focus
      // ferait entrer le visiteur APRÈS le lien d'évitement et l'en-tête, au
      // chargement de chaque page.
      const cible = poserLaCible();
      const focus = vi.spyOn(cible, 'focus');
      const recherche = vi.spyOn(document, 'getElementById');
      const router = installer('browser');

      await router.navigateByUrl('/premiere');

      expect(recherchesDeLaCible(recherche)).toBe(0);
      expect(focus).not.toHaveBeenCalled();

      await router.navigateByUrl('/seconde');

      expect(recherche).toHaveBeenCalledWith(ID_CIBLE);
      // `preventScroll: true` n'est pas une précaution : `withInMemoryScrolling`
      // remet la page en haut à chaque navigation, et un `focus()` ordinaire
      // ferait défiler la fenêtre en même temps — position finale imprévisible.
      // L'argument est donc asserté, pas seulement l'appel.
      expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    });

    it('déplace le focus à CHAQUE changement de page, pas seulement au premier', async () => {
      const cible = poserLaCible();
      const focus = vi.spyOn(cible, 'focus');
      const router = installer('browser');

      await router.navigateByUrl('/premiere');
      await router.navigateByUrl('/seconde');
      await router.navigateByUrl('/troisieme');

      expect(focus).toHaveBeenCalledTimes(2);
    });
  });

  describe('sauts d’ancre (`anchorScrolling`)', () => {
    it('NE VOLE PAS le focus quand seul le fragment change', async () => {
      // Le sommaire ancré d'une leçon (E2) navigue par `routerLink` + `fragment`.
      // Si le service y répondait, il ramènerait le focus en tête du `<main>` :
      // le lien d'ancre ne mènerait nulle part au clavier, et les deux
      // fonctionnalités se neutraliseraient.
      const cible = poserLaCible();
      const focus = vi.spyOn(cible, 'focus');
      const router = installer('browser');

      await router.navigateByUrl('/lecon');
      await router.navigateByUrl('/lecon#chiffrement');
      await router.navigateByUrl('/lecon#sessions');

      expect(focus).not.toHaveBeenCalled();
    });

    it('focalise quand même si le CHEMIN change en plus du fragment', async () => {
      const cible = poserLaCible();
      const focus = vi.spyOn(cible, 'focus');
      const router = installer('browser');

      await router.navigateByUrl('/lecon#chiffrement');
      await router.navigateByUrl('/autre-lecon#chiffrement');

      expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    });

    it('traite un changement de chaîne de requête comme une vraie navigation', async () => {
      // Frontière assumée du filtre : `?page=2` change le CONTENU affiché, le
      // focus doit suivre. Seul le fragment désigne un endroit dans la page déjà
      // rendue.
      const cible = poserLaCible();
      const focus = vi.spyOn(cible, 'focus');
      const router = installer('browser');

      await router.navigateByUrl('/liste');
      await router.navigateByUrl('/liste?page=2');

      expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    });
  });

  describe('cible absente du document', () => {
    it('ne lève RIEN — ni dans la pile, ni hors pile', async () => {
      // Cas réel : un test qui monte un composant seul, ou un futur gabarit sans
      // `<main>`. Une exception ici ne ferait pas échouer la navigation — rxjs
      // l'avale et la renvoie hors pile — donc le collecteur d'erreurs différées
      // est ce qui rend cette assertion mordante : sans lui, le `?.` du service
      // pourrait disparaître sans qu'aucun test ne rougisse.
      const recherche = vi.spyOn(document, 'getElementById');
      const router = installer('browser');

      await router.navigateByUrl('/premiere');
      await expect(router.navigateByUrl('/seconde')).resolves.toBe(true);
      await attendreLesErreursDifferees();

      // La cible a bien été CHERCHÉE (donc le chemin de code a tourné)…
      expect(recherchesDeLaCible(recherche)).toBe(1);
      // …et son absence n'a produit aucune erreur, même différée.
      expect(erreursRxjs).toEqual([]);
    });
  });
});
