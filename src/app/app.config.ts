// =============================================================================
// Configuration de l'application — fournisseurs de la racine
// -----------------------------------------------------------------------------
// `withInMemoryScrolling` : sans lui, le routeur d'Angular laisse la page où elle
// était après une navigation. Concrètement, quitter le bas d'une longue page pour
// une autre route ouvre la nouvelle page au milieu — WCAG 2.4.3 (ordre du focus)
// et 3.2.3 (navigation cohérente) en souffrent tous les deux.
//  · `scrollPositionRestoration: 'enabled'` — remonte en haut à chaque
//    navigation, ET restitue la position d'origine sur un retour arrière ;
//  · `anchorScrolling: 'enabled'` — fait fonctionner un lien `#ancre` interne, ce
//    dont les leçons d'E2 (sommaires, renvois) auront besoin.
// Le déplacement de focus de `GestionFocusRoute` cohabite avec ce défilement grâce
// à `focus({ preventScroll: true })` — sans quoi les deux se battraient pour la
// position de la fenêtre.
//
// ⚠️ PAS DE `withComponentInputBinding()` — décision arbitrée, pas un oubli :
//  1. l'option lie AUSSI les paramètres de requête, activés par défaut
//     (`@angular/router/fesm2022/_router-chunk.mjs` : `this.options.queryParams
//     ??= true`). La fusion est `{...queryParams, ...params, ...data}`, `data` en
//     DERNIER : un `?titre=` ou `?description=` sur nos routes actuelles serait
//     donc écrasé par le `data` de la route — l'exposition réelle n'est pas là.
//     Elle est sur le complément : TOUT input dont le nom n'est couvert ni par
//     `data` ni par `params` deviendrait pilotable depuis la chaîne de requête,
//     donc du texte de tiers affiché par le domaine légitime. Du spoofing de
//     contenu latent, sur un site qui enseigne la sécurité web ; le jour où un
//     composant routé gagne un input, la faille arrive sans que personne ne
//     touche à cette ligne ;
//  2. avec le défaut `unmatchedInputBehavior: 'alwaysUndefined'`, un
//     `input.required()` n'échoue PAS bruyamment — le routeur appelle
//     `setInput(nom, undefined)` sans condition (même fichier) — donc un
//     `data.titre` oublié rendrait un `<h1>` vide en silence, exactement ce que
//     la garde de `PageAVenir` existe pour empêcher.
// `PageAVenir` lit donc `ActivatedRoute.snapshot` lui-même : rien à câbler ici.
//
// ⚠️ `withNoIncrementalHydration()` EST UN ARBITRAGE, PAS UNE OPTION DÉCORATIVE —
// ne pas le « nettoyer ». `provideClientHydration()` seul active l'hydratation
// incrémentale, qui embarque `withEventReplay()` ; celui-ci injecte DEUX scripts
// inline (`ng-event-dispatch-contract` et `window.__jsaction_bootstrap(…)`) que la
// CSP stricte à hachages du site refuse. Le retirer fait échouer `npm run build`
// sur « script inline exécutable non autorisé (475 o) » — un message qui ne parle
// pas d'hydratation et oriente vers le mauvais correctif. C'est aujourd'hui la
// SEULE API publique qui désactive ce rejeu (aucun `withNoEventReplay()` n'existe).
// Ce que ça coûte, et qu'il faut assumer en connaissance de cause :
//  · LE REJEU D'ÉVÉNEMENTS EST PERDU. Un clic sur un radio de la bascule de thème
//    AVANT l'hydratation ne sera pas rejoué — et comme le navigateur a déjà
//    déplacé le `checked` natif, le visiteur voit « Sombre » coché sur un site
//    resté en thème système. Fenêtre courte, mais réelle ;
//  · `@defer (hydrate …)` EST INERTE tant que ce drapeau est posé — piège direct
//    pour les simulations pas-à-pas d'E2, qui sont exactement le genre de bloc
//    qu'on voudrait hydrater à la demande ;
//  · L'ALTERNATIVE ÉCARTÉE était d'apprendre au générateur de CSP à hacher N
//    scripts inline au lieu d'une liste nominative. Refusée : la liste blanche
//    deviendrait DÉRIVÉE de l'artéfact — elle autoriserait donc tout script
//    qu'une future version d'Angular y injecterait, sans qu'un humain l'ait vu —
//    et S-003 est ouvert (le garde-fou ne prouve pas encore qu'il a TOUT vu).
// =============================================================================

import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withNoIncrementalHydration } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),
    // `withNoIncrementalHydration()` : obligatoire tant que la CSP est à hachages
    // nominatifs — voir l'arbitrage en tête de fichier avant d'y toucher.
    provideClientHydration(withNoIncrementalHydration()),
  ],
};
