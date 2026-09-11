// =============================================================================
// Page du sommaire de « Développement d'application en PHP » — l'ADAPTATEUR DE ROUTE
// -----------------------------------------------------------------------------
// Le second cours publié (E7, 420-4P2-HU), ouvert au lot B du 2026-09-10 — AVANT
// son premier module, par décision du propriétaire (D-PHP-2,
// `docs/agile/reprise-php-en-bref.md` §2) : la plomberie « second cours » passe
// avant l'écriture du contenu.
//
// Même raison d'être que `page-sommaire-securite-web.ts`, dont l'en-tête porte le
// raisonnement complet : le routeur n'a pas `withComponentInputBinding()`, donc le
// sujet et le titre se fixent ICI, en littéraux de gabarit, hors de portée de
// toute URL. Aucune feuille de style : le cadre porte la seule (CSP, voir
// `cadre-sommaire.scss`).
//
// TANT QU'AUCUN MODULE N'EST PUBLIÉ, `Sommaire` rend « Modules en préparation. » —
// c'est l'état attendu, pas une panne. Le chapô ci-dessous ne promet donc aucun
// compte de modules : le nombre vient du manifeste, jamais d'une phrase.
//
// ⚠️ RÉDACTION : blanches insécables U+00A0 UNIQUEMENT, écrites `&nbsp;` pour
// qu'on les VOIE à la relecture (jamais U+202F ni U+2009, absentes des polices du
// site) — `.claude/rules/contenu-pedagogique.md` §3.
// =============================================================================

import { ChangeDetectionStrategy, Component } from '@angular/core';

import { CadreSommaire } from './cadre-sommaire';

@Component({
  selector: 'app-page-sommaire-php',
  imports: [CadreSommaire],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-cadre-sommaire titre="Développement d’application en PHP" sujet="php">
      Le parcours du cours, séance par séance&nbsp;: chaque module s’ajoute au sommaire dès
      qu’il est publié. L’avancement reste dans votre navigateur — aucun compte, aucun envoi.
    </app-cadre-sommaire>
  `,
})
export class PageSommairePhp {}
