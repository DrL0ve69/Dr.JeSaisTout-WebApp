// =============================================================================
// CadreSommaire — le cadre d'une page de sommaire, commun à tous les cours
// -----------------------------------------------------------------------------
// Né au lot B d'E7 (2026-09-10), quand le cours de PHP a demandé sa propre page de
// sommaire. Il porte ce que les adaptateurs de route avaient chacun : le `<h1>`, le
// chapô, la feuille de mise en page, et le montage de `Sommaire`.
//
// POURQUOI UN CADRE PLUTÔT QU'UN SECOND ADAPTATEUR COMPLET. L'en-tête de
// `page-sommaire-securite-web.ts` annonçait « un second adaptateur de quinze lignes ».
// C'est resté vrai pour le CÂBLAGE, pas pour la FEUILLE : chaque composant porteur de
// styles émet son propre bloc `<style>` inline, donc son propre hachage dans
// `style-src`. Recopier la feuille dans l'adaptateur PHP aurait élargi la CSP d'une
// permission pour un texte identique au caractère près — raisonnement complet en tête
// de `cadre-sommaire.scss`. Les adaptateurs ne portent donc plus de feuille du tout.
//
// LES ADAPTATEURS RESTENT, ET C'EST TOUJOURS EUX QUI FIXENT LE SUJET. Le routeur n'a
// pas `withComponentInputBinding()` (décision de sécurité, `app.config.ts`) : ce
// composant, qui exige `sujet` et `titre`, n'est donc JAMAIS monté par une route.
// Chaque adaptateur écrit les deux valeurs en LITTÉRAUX de gabarit — à la
// compilation, hors de portée de toute URL —, et un littéral oublié est une erreur de
// compilation (`strictTemplates`), pas un `<h1>` vide livré en silence.
//
// C'EST LUI QUI ÉCRIT LE `<h1>` DE LA PAGE. `Sommaire` ne commence qu'au `<h2>` d'une
// section : un composant de carte de parcours qui s'arrogerait le titre de premier
// niveau ne serait plus réutilisable dans une page qui en a déjà un.
//
// AUCUNE LOGIQUE ICI. Tout ce qui touche au manifeste, à la progression ou au gate
// d'hydratation (L-033) vit dans `Sommaire`. Ce composant n'injecte rien — en
// particulier pas `ActivatedRoute` : rien de l'URL n'entre dans la page (les specs
// des adaptateurs le mesurent par espion).
// =============================================================================

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Sommaire } from './sommaire';

@Component({
  selector: 'app-cadre-sommaire',
  imports: [Sommaire],
  styleUrl: './cadre-sommaire.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <h1 class="titre">{{ titre() }}</h1>

      <p class="chapo"><ng-content /></p>

      <app-sommaire [sujet]="sujet()" />
    </div>
  `,
})
export class CadreSommaire {
  /** Le nom du cours, rendu en `<h1>`. Littéral de l'adaptateur, jamais une donnée de route. */
  readonly titre = input.required<string>();

  /** La clef de sujet du manifeste (`securite-web`, `php`…). Littéral de l'adaptateur. */
  readonly sujet = input.required<string>();
}
