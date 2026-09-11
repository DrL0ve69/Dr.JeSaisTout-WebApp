// =============================================================================
// Page du sommaire de « Sécurité des applications web » — l'ADAPTATEUR DE ROUTE
// -----------------------------------------------------------------------------
// CE COMPOSANT N'EXISTE QUE POUR UNE RAISON, ET ELLE EST STRUCTURELLE.
// `Sommaire` déclare `sujet` en `input.required<string>()`, et le routeur du site
// n'a PAS `withComponentInputBinding()` — décision arbitrée pour la sécurité,
// raisonnement complet en tête d'`app.config.ts`, à ne pas rouvrir. Monter
// `Sommaire` directement sur la route ne lui fournirait donc JAMAIS son `sujet` :
// avec le défaut `unmatchedInputBehavior: 'alwaysUndefined'`, le routeur pose
// `undefined` sans rien dire, et un `input.required()` n'échoue même pas
// bruyamment. La page rendrait un sommaire vide, en silence.
//
// L'adaptateur est la réponse la moins chère : il fixe le sujet DANS LE GABARIT,
// donc à la compilation, hors de portée de toute URL. Il garde `Sommaire` pur et
// générique — exactement ce qu'exige la décision D-3 d'E2-ST6 (« la généricité se
// prouve par un test, pas par une route »), et le jour où E7 publie le cours PHP,
// c'est un second adaptateur de quinze lignes, pas un mécanisme neuf.
// ✅ C'EST FAIT (E7, lot B, 2026-09-10) : `page-sommaire-php.ts`. Une nuance que la
// phrase ci-dessus ne voyait pas : la FEUILLE de mise en page ne se recopie pas —
// chaque composant porteur de styles coûte un hachage `style-src`. Titre, chapô et
// feuille ont donc migré dans `CadreSommaire`, et cet adaptateur n'a plus de
// `styleUrl` du tout (raisonnement en tête de `cadre-sommaire.scss`).
//
// LE `<h1>` EST RENDU PAR LE CADRE, MAIS SON TEXTE EST TOUJOURS UN LITTÉRAL D'ICI —
// pas un `data.titre` de route lu à l'exécution. C'est ce qui remplace la garde que
// `PageAVenir` portait : un `titre` oublié est une erreur de compilation
// (`input.required` + `strictTemplates`), donc plus de `<h1>` vide possible.
// `page-sommaire-securite-web.spec.ts` et le rendu réel de `app.routes.spec.ts` le
// tiennent des deux côtés.
//
// AUCUNE LOGIQUE ICI, ET IL NE DOIT JAMAIS Y EN AVOIR. Tout ce qui touche au
// manifeste, à la progression ou au gate d'hydratation (L-033) vit dans
// `Sommaire`. Si ce fichier devait un jour injecter quoi que ce soit, c'est que
// la responsabilité a été posée au mauvais endroit.
//
// ⚠️ RÉDACTION : blanches insécables U+00A0 UNIQUEMENT, écrites `&nbsp;` pour
// qu'on les VOIE à la relecture (jamais U+202F ni U+2009, absentes de Fraunces
// comme d'Inter) — `.claude/rules/contenu-pedagogique.md` §3.
// =============================================================================

import { ChangeDetectionStrategy, Component } from '@angular/core';

import { CadreSommaire } from './cadre-sommaire';

@Component({
  selector: 'app-page-sommaire-securite-web',
  imports: [CadreSommaire],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-cadre-sommaire titre="Sécurité des applications web" sujet="securite-web">
      Le parcours du cours, module par module&nbsp;: chaque entrée ouvre sa leçon, et son badge
      dit où vous en êtes. L’avancement reste dans votre navigateur — aucun compte, aucun envoi.
    </app-cadre-sommaire>
  `,
})
export class PageSommaireSecuriteWeb {}
