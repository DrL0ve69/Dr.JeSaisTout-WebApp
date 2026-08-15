import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Page « à venir » — le placeholder générique des routes publiques dont le
 * contenu n'existe pas encore. E1-ST3 lui a repris `/` (c'est `Accueil`, dans
 * `features/home/`) ; il ne lui reste que `/cours/securite-web`, jusqu'à ce qu'E2
 * livre le moteur de contenu et le vrai sommaire.
 *
 * Il reste GÉNÉRIQUE (titre et chapô lus dans la route) et non spécialisé en
 * « page du sommaire » : c'est ce qui lui permettra de couvrir la prochaine route
 * annoncée avant d'exister, sans qu'on écrive un composant de plus.
 *
 * POURQUOI ON LIT LA ROUTE À LA MAIN, sans `withComponentInputBinding()` : le
 * raisonnement complet (et vérifié dans le source du routeur) est en tête
 * d'`app.config.ts`. En deux lignes : l'option lie aussi la chaîne de requête, ce
 * qui rendrait pilotable de l'extérieur tout input non couvert par `data` ni
 * `params` ; et son `unmatchedInputBehavior: 'alwaysUndefined'` neutralise
 * `input.required()`, donc un `data.titre` oublié rendrait un `<h1>` vide en
 * silence. La garde de `titre` ci-dessous rétablit l'échec bruyant.
 *
 * `snapshot` suffit : les routes qu'il sert sont des chemins littéraux distincts,
 * le composant est donc détruit et recréé à chaque navigation — aucun cas où la
 * même instance survivrait à un changement de `data`.
 */
@Component({
  selector: 'app-page-a-venir',
  styleUrl: './page-a-venir.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="carnet">
      <p class="tampon">Chantier</p>

      <h1 class="titre">{{ titre() }}</h1>

      @if (description()) {
        <p class="accroche">{{ description() }}</p>
      }
    </article>
  `,
})
export class PageAVenir {
  private readonly route = inject(ActivatedRoute);

  /**
   * L'unique `<h1>` de la page. La garde n'est pas de la paranoïa de typage :
   * `data` est un dictionnaire non typé, et un `titre` oublié au câblage des
   * routes produirait un `<h1>` VIDE — une violation d'accessibilité livrée en
   * silence. Lever ici fait échouer le prerender de la route fautive, avec un
   * message qui nomme le champ manquant (même principe que les gates de build
   * du dépôt : jamais une page vide sans bruit).
   */
  readonly titre = computed(() => {
    const titre = this.route.snapshot.data['titre'];
    if (typeof titre !== 'string' || titre.trim() === '') {
      throw new Error(
        'PageAVenir : la route ne fournit pas de `data.titre` (chaîne non vide). ' +
          'Le <h1> de la page en dépend — corriger la définition de la route.',
      );
    }
    return titre;
  });

  /** Chapô facultatif. Absent ⇒ chaîne vide ⇒ aucun paragraphe rendu. */
  readonly description = computed(() => {
    const description = this.route.snapshot.data['description'];
    return typeof description === 'string' ? description : '';
  });

}
