// =============================================================================
// EnTete — la bande de tête du site : logotype, navigation, bascule de thème
// -----------------------------------------------------------------------------
// ⚠️ AUCUN `<h1>` ICI, ET C'EST UNE RÈGLE, PAS UN OUBLI. Chaque page routée porte
// déjà son unique `<h1>` ; un second dans l'en-tête en mettrait deux sur TOUTES
// les pages du site d'un coup — `page-has-heading-one` / `heading-order` chez axe,
// et surtout un plan de titres faux pour quiconque navigue par titres. Le logotype
// est donc un simple lien : il conduit à l'accueil, il n'annonce pas une section.
//
// L'ÉTAT ACTIF EST EXPOSÉ, PAS SEULEMENT PEINT. `routerLinkActive` ne pose qu'une
// classe CSS : un lecteur d'écran ne « voit » pas une classe. D'où le
// `[attr.aria-current]` sur chaque lien, alimenté par la référence de template du
// directive (`#…="routerLinkActive"`). Le `null` de la branche inactive est
// volontaire — Angular RETIRE l'attribut sur `null`, là où `false` laisserait
// `aria-current="false"`, que certaines combinaisons annoncent quand même.
//
// ⚠️ `[routerLinkActiveOptions]="{ exact: true }"` SUR LE LIEN D'ACCUEIL. Par
// défaut `routerLinkActive` fait une correspondance de PRÉFIXE : « / » est alors
// actif sur absolument toutes les routes, et « Accueil » porterait
// `aria-current="page"` en même temps que la page réellement ouverte. Deux
// « page courante » dans une même navigation, c'est un plan faux. Vérifié par un
// test dédié dans `en-tete.spec.ts`.
//
// La bascule de thème est composée ICI, dans l'en-tête : c'est là qu'un visiteur
// la cherche, et l'`App` n'a pas à connaître son existence.
// =============================================================================

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { BasculeTheme } from '../bascule-theme/bascule-theme';

@Component({
  selector: 'app-en-tete',
  imports: [RouterLink, RouterLinkActive, BasculeTheme],
  template: `
    <header class="en-tete">
      <a class="logotype" routerLink="/">
        <span class="titre-court">Dr.</span>
        <span class="titre-long">Je-Sais-Tout</span>
      </a>

      <nav class="navigation" aria-label="Navigation principale">
        <ul class="liens">
          <li>
            <a
              routerLink="/"
              routerLinkActive="est-actif"
              [routerLinkActiveOptions]="{ exact: true }"
              #accueilActif="routerLinkActive"
              [attr.aria-current]="accueilActif.isActive ? 'page' : null"
            >
              Accueil
            </a>
          </li>
          <li>
            <a
              routerLink="/cours/securite-web"
              routerLinkActive="est-actif"
              #coursActif="routerLinkActive"
              [attr.aria-current]="coursActif.isActive ? 'page' : null"
            >
              Sécurité des applications web
            </a>
          </li>
        </ul>
      </nav>

      <app-bascule-theme />
    </header>
  `,
  styleUrl: './en-tete.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnTete {}
