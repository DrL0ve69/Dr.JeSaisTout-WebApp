// =============================================================================
// BasculeTheme — le choix visible du thème (clair / sombre / système)
// -----------------------------------------------------------------------------
// LE PREMIER CLIENT DU `ThemeService`. Celui-ci exporte `THEMES` et `definir()`
// depuis E1-ST1-D précisément pour cette bascule ; la partie visible avait été
// laissée hors de ST1-D.
//
// POURQUOI DES RADIOS NATIFS, ET PAS UN `role="radiogroup"` MAISON. La variante
// « 3 × <button role="radio"> + roving tabindex » a été écartée à la revue du
// plan : elle réimplémente à la main ce que le HTML donne gratuitement — le
// groupement par `name`, le focus roving, les flèches, Home/End, l'état `checked`
// exposé à la technologie d'assistance (« bouton radio, Sombre, 2 sur 3 »), et le
// rendu en mode contraste forcé. Sur un site qui ENSEIGNE l'ARIA, réétiqueter un
// rôle natif par un autre viole la première règle de l'ARIA : on ne le fait pas
// dans son propre en-tête. Le `<fieldset>`/`<legend>` porte le nom du groupe ;
// c'est ce que les lecteurs d'écran annoncent avant chaque option.
//
// PAS DE `@angular/forms` ICI. Il n'y a pas de formulaire : rien n'est soumis,
// rien n'est validé. Un `(change)` natif qui appelle `definir()` suffit, et
// éviter `ReactiveFormsModule` garde la surface du bundle et celle des tests
// minimales.
//
// ⚠️ CE QUE LE HTML PRERENDU AFFICHE, ET POURQUOI ON NE LE « CORRIGE » PAS.
// `outputMode: "static"` prerend toutes les routes dans Node, où `choix()` vaut
// TOUJOURS « systeme » : le fichier livré coche donc « Système » alors que le
// script anti-flash d'`index.html` a peut-être déjà peint la page en sombre. Le
// service se réaligne dès l'hydratation, et sans JavaScript le contrôle affiche
// un état qu'il ne peut pas changer. C'est assumé — le reste de la page ne dépend
// pas de JS (§ SSR/prerender) — et c'est CONSTATÉ par un test
// (« prerender (Node) »), pour que personne ne tente de le réparer en écrivant un
// `data-theme` dans le HTML prerendu : ce fichier est le MÊME pour tous les
// visiteurs, y épingler un thème épinglerait le choix d'un seul sur la page
// servie à tout le monde (voir le commentaire de `definir()` dans `theme.ts`).
// =============================================================================

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { THEMES, Theme, ThemeService } from '../../theme/theme';

/**
 * Les libellés français, indexés par état.
 *
 * `Record<Theme, string>` n'est pas décoratif : si un quatrième état apparaissait
 * dans `THEMES`, ce fichier ne compilerait PLUS — au lieu de rendre une option
 * sans texte, donc un contrôle sans nom accessible, en silence.
 */
const LIBELLES: Record<Theme, string> = {
  clair: 'Clair',
  sombre: 'Sombre',
  systeme: 'Système',
};

@Component({
  selector: 'app-bascule-theme',
  // Gabarit en ligne : le composant est court, et le voir à côté de son
  // commentaire de conception vaut mieux qu'un troisième fichier.
  template: `
    <fieldset class="bascule-theme">
      <legend class="intitule">Thème d’affichage</legend>

      <!--
        L'enveloppe existe pour la mise en page : un « display: flex » posé
        directement sur un fieldset a un historique de rendu irrégulier de la
        légende selon les moteurs. Le groupe de radios, lui, reste bien porté par
        le fieldset.
      -->
      <div class="options">
        @for (theme of themes; track theme) {
          <label class="option">
            <!--
              Un seul attribut « name » pour les trois : c'est LUI qui fait le
              groupe natif (une seule tabulation pour entrer, flèches pour
              circuler, « 2 sur 3 » annoncé). Trois noms distincts donneraient
              trois cases à cocher déguisées.
            -->
            <input
              class="tampon"
              type="radio"
              name="theme"
              [value]="theme"
              [checked]="service.choix() === theme"
              (change)="service.definir(theme)"
            />
            <span class="libelle">{{ libelle(theme) }}</span>
          </label>
        }
      </div>
    </fieldset>
  `,
  styleUrl: './bascule-theme.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasculeTheme {
  /** Aucune API publique : ce composant lit et écrit l'état global du thème. */
  protected readonly service = inject(ThemeService);

  /**
   * La liste FERMÉE du service, jamais recopiée ici. Une seconde liste en dur
   * pourrait diverger de celle que `definir()` accepte : le contrôle afficherait
   * une option que le service refuse, sans message.
   */
  protected readonly themes = THEMES;

  protected libelle(theme: Theme): string {
    return LIBELLES[theme];
  }
}
