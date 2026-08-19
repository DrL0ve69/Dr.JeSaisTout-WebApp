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
//
// C'EST LUI QUI ÉCRIT LE `<h1>` DE LA PAGE, et c'est délibéré. `Sommaire` ne
// commence qu'au `<h2>` d'une section : un composant de carte de parcours qui
// s'arrogerait le titre de premier niveau ne serait plus réutilisable dans une
// page qui en a déjà un. Le titre est ici un LITTÉRAL du gabarit, pas un
// `data.titre` de route lu à l'exécution — c'est ce qui remplace la garde que
// `PageAVenir` portait : il n'y a plus de champ à oublier, donc plus de `<h1>`
// vide possible. `page-sommaire-securite-web.spec.ts` et le rendu réel de
// `app.routes.spec.ts` le tiennent des deux côtés.
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

import { Sommaire } from './sommaire';

@Component({
  selector: 'app-page-sommaire-securite-web',
  imports: [Sommaire],
  styleUrl: './page-sommaire-securite-web.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <h1 class="titre">Sécurité des applications web</h1>

      <p class="chapo">
        Le parcours du cours, module par module&nbsp;: chaque entrée ouvre sa leçon, et son badge
        dit où vous en êtes. L’avancement reste dans votre navigateur — aucun compte, aucun envoi.
      </p>

      <app-sommaire sujet="securite-web" />
    </div>
  `,
})
export class PageSommaireSecuriteWeb {}
