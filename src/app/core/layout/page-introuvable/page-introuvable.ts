import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Page 404 — servie sur DEUX routes par la coquille applicative :
 *  · `path: '404'` — un chemin littéral, seul moyen d'obtenir un vrai fichier
 *    `404/index.html` à servir avec le bon statut HTTP. Un `path: '**'` en
 *    `RenderMode.Prerender` est SILENCIEUSEMENT ignoré au prerender (le
 *    prerenderer d'`@angular/build` saute toute route contenant `*`) : il ne
 *    produit aucun fichier, et sans le moindre avertissement ;
 *  · `path: '**'` — le filet côté navigation client, une fois l'application
 *    chargée.
 *
 * D'où la règle de conception : ce composant ne lit RIEN de la route (ni `data`,
 * ni paramètre). Il doit rendre exactement la même chose depuis les deux points
 * de montage, et il n'y aurait de toute façon rien à lire dans une URL qui, par
 * définition, ne correspond à aucune page.
 */
@Component({
  selector: 'app-page-introuvable',
  imports: [RouterLink],
  styleUrl: './page-introuvable.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="cartouche-erreur">
      <!--
        DEUX PARAGRAPHES DISTINCTS, ET C'EST DÉLIBÉRÉ. Écrits en deux <span>
        d'un même paragraphe, ils seraient COLLÉS dans le texte accessible :
        preserveWhitespaces: false retire le nœud de texte blanc qui les
        sépare, et l'espace qu'on voit ne viendrait que du CSS — que nulle API
        d'accessibilité ne lit (c'est exactement le mode d'échec L-024, payé sur
        le logotype de l'en-tête). Deux blocs ne peuvent pas se coller.
      -->
      <p class="etiquette">Erreur</p>
      <p class="code-erreur">404</p>

      <h1 class="titre">Page introuvable</h1>

      <p class="accroche">
        L&rsquo;adresse demandée ne correspond à aucune page de ce site. Elle a peut-être été
        déplacée, ou le lien qui vous a mené ici comporte une faute de frappe.
      </p>

      <hr class="separateur" />

      <p class="retour">
        <a routerLink="/">Retour à l&rsquo;accueil</a>
      </p>
    </article>
  `,
})
export class PageIntrouvable {}
