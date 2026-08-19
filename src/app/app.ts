// =============================================================================
// App — la COQUILLE du site : lien d'évitement, en-tête, `<main>`, pied de page
// -----------------------------------------------------------------------------
// Ce composant ne rend plus aucun contenu depuis E1-ST2 : la page « chantier »
// d'E0-ST4 qui vivait ici est partie dans un composant de page, et ces pages sont
// depuis devenues les vraies (`Accueil` en E1-ST3, le sommaire du cours en
// E2-ST6). Ce qui reste est la structure commune à toutes les pages.
//
// C'EST LA COQUILLE QUI PORTE L'UNIQUE `<main>`, et c'est un contrat entre les
// lots d'E1-ST2 : aucun composant de page (`Accueil`, `PageSommaireSecuriteWeb`,
// `Lecon`, `PageIntrouvable`) n'en émet, et l'en-tête comme le pied émettent déjà
// leur propre repère
// (`<header>`, `<footer role="contentinfo">`) — les envelopper une seconde fois
// dupliquerait `banner` et `contentinfo`. Porter le `<main>` ici plutôt que dans
// chaque page tient l'invariant utile : un `<main>` et un seul, toujours présent,
// toujours au même endroit pour le lien d'évitement et pour `GestionFocusRoute`.
//
// `GestionFocusRoute` EST INJECTÉ ICI, ET L'INJECTION EST LE CÂBLAGE. Un
// `@Service()` que personne n'injecte est élagué du bundle : le service serait
// livré mort, sans message. Il n'a pas d'API publique — l'appel ci-dessous EST son
// branchement, et `app.spec.ts` le prouve pour qu'un « nettoyage » de code
// apparemment inutile ne le débranche pas en silence.
// =============================================================================

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { EnTete } from './core/layout/en-tete/en-tete';
import { GestionFocusRoute } from './core/layout/gestion-focus-route';
import { PiedDePage } from './core/layout/pied-de-page/pied-de-page';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, EnTete, PiedDePage],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  constructor() {
    // Injecté pour ses EFFETS, pas pour son API : il écoute le routeur et remet le
    // focus sur `#contenu-principal` à chaque navigation. Sans cet appel, le
    // service n'est jamais construit et n'écoute rien.
    inject(GestionFocusRoute);
  }
}
