// =============================================================================
// CarteCours — l'annonce d'un cours, et l'UNIQUE appel à l'action de l'accueil
// -----------------------------------------------------------------------------
// ⚠️ LE TITRE EST UN `<h2>`, JAMAIS UN `<a>`, ET C'EST UNE DÉCISION, PAS UN OUBLI
// (plan arrêté d'E1-ST3, décision 1). Trois conséquences, toutes vérifiées par
// `carte-cours.spec.ts` :
//  · la page d'accueil n'a qu'UN SEUL élément focalisable neuf — le bouton
//    « Commencer le cours ». « Un seul CTA » est alors tenu au pied de la lettre,
//    pas approché ;
//  · aucune collision de nom accessible avec le lien de navigation
//    « Sécurité des applications web », qui mène à la MÊME adresse : deux liens
//    de même destination et de noms différents ne gênent personne, deux liens de
//    même NOM dans deux repères différents désorientent une navigation par liens ;
//  · le titre reste un repère de plan de titres (navigation par titres), ce qu'un
//    lien enveloppant un titre brouille toujours un peu.
//
// LE CONTRAT DES ENTRÉES EST DÉLIBÉRÉMENT MINCE : `titre`, `description` et
// `lien` sont REQUIS, `mentionChantier` est facultatif. AUCUN état, AUCUNE
// progression, AUCUN compteur de modules — la progression (localStorage) est
// E2-ST6, et un composant qui la porterait « en prévision » serait du code mort
// que personne n'oserait retirer.
//
// ✅ `mentionChantier` A ÉTÉ RETIRÉE DE L'APPEL LE 2026-08-20, à la clôture d'E3-ST1,
// exactement au jour dit. C'était une DETTE DATÉE, pas un ornement : tant qu'aucune
// leçon n'était publiée, le sommaire n'affichait que « Modules en préparation » et la
// carte devait le dire, sinon l'appel à l'action mentait. La leçon 01 est en ligne, le
// sommaire la liste — la mention mentirait désormais dans l'autre sens. (La bascule
// d'E2-ST6, qui avait remplacé le placeholder par le vrai sommaire, ne l'avait PAS
// rendue caduque : c'est bien la PUBLICATION qui l'a fait.)
//
// L'ENTRÉE, ELLE, RESTE — et ce n'est pas de l'indécision. Elle est facultative,
// testée dans les deux sens (`carte-cours.spec.ts`, rendue quand fournie / aucun
// paragraphe quand absente), et le besoin revient tel quel à l'ouverture du DEUXIÈME
// sujet, dont la carte annoncera un cours vide. Retirer le composant pour le
// réécrire dans six semaines coûterait plus que le garder. Ce qui serait du code mort,
// c'est un état ou un compteur posé « en prévision » — pas une entrée déjà exercée.
//
// 🔴 LA JAUGE EST `aria-hidden`, ET C'EST LE MONTAGE LE PLUS SÛR, PAS LE PLUS
// PARESSEUX (bascule E6). Elle ne porte AUCUNE information que le paragraphe
// `.jauge-texte` ne porte déjà en toutes lettres, juste en dessous — l'information
// ne passe donc ni par la seule forme ni par la seule couleur (WCAG 1.4.1). Un
// `role="progressbar"` exigerait `aria-valuenow` / `aria-valuemin` /
// `aria-valuemax` COHÉRENTS avec ce texte : une deuxième source de vérité à tenir
// d'accord, dont la dérive serait muette pour tout le monde sauf pour qui écoute
// la page. Un décompte de modules n'est d'ailleurs pas une progression de tâche.
//
// ⚠️ RÉDACTION : blanches insécables U+00A0 UNIQUEMENT, écrites `&nbsp;` pour
// qu'on les VOIE à la relecture (jamais U+202F ni U+2009, absentes de Fraunces
// comme d'Inter) — `.claude/rules/contenu-pedagogique.md` §3. Le texte éditorial
// de la carte n'est pas ici : il est passé par l'appelant (`accueil.ts`).
// =============================================================================

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Un segment de la jauge : sa position, et s'il est rempli. */
interface SegmentDeJauge {
  readonly rang: number;
  readonly rempli: boolean;
}

@Component({
  selector: 'app-carte-cours',
  imports: [RouterLink],
  styleUrl: './carte-cours.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="carte">
      @if (mentionChantier(); as mention) {
        <p class="chantier">{{ mention }}</p>
      }

      <h2 class="titre">{{ titre() }}</h2>

      <p class="description">{{ description() }}</p>

      @if (progression(); as etat) {
        <div class="jauge" aria-hidden="true">
          @for (segment of etat.segments; track segment.rang) {
            <span class="segment" [class.rempli]="segment.rempli"></span>
          }
        </div>

        <p class="jauge-texte">{{ etat.libelle }}</p>
      }

      <p class="action">
        <a class="cta" [routerLink]="lien()">Commencer le cours</a>
      </p>
    </article>
  `,
})
export class CarteCours {
  /** Le nom du cours. Rendu en `<h2>` — voir l'en-tête de fichier. */
  readonly titre = input.required<string>();

  /** Ce que le cours couvre, en une ou deux phrases. */
  readonly description = input.required<string>();

  /** La destination de l'appel à l'action (chemin interne, jamais une URL tierce). */
  readonly lien = input.required<string>();

  /**
   * Avertissement facultatif « le contenu n'est pas encore là ». Absent ⇒ aucun
   * paragraphe rendu : un `<p>` vide reste annoncé par certains lecteurs d'écran
   * et ferait dériver le rythme vertical de la carte.
   */
  readonly mentionChantier = input<string>();

  /**
   * Modules déjà publiés, et modules prévus au plan. FACULTATIFS, tous les deux :
   * une carte de cours qui n'a pas encore de plan chiffré (l'ouverture d'un
   * deuxième sujet) n'affiche simplement pas de jauge, plutôt que d'en afficher
   * une vide qui promettrait un décompte inexistant. L'appelant est responsable
   * de la véracité des deux nombres — `accueil.spec.ts` confronte les siens au
   * manifeste de contenu réellement compilé.
   */
  readonly modulesPublies = input<number>();
  readonly modulesTotal = input<number>();

  /**
   * L'état de la jauge, ou `null` quand il n'y a rien d'honnête à afficher.
   *
   * Le LIBELLÉ est calculé ici plutôt qu'au gabarit : l'accord en nombre est une
   * règle de langue, pas une expression de gabarit, et « 1 modules publiés »
   * serait exactement le genre de détail qu'aucun test ne regarde.
   */
  protected readonly progression = computed<{
    segments: readonly SegmentDeJauge[];
    libelle: string;
  } | null>(() => {
    const publies = this.modulesPublies();
    const total = this.modulesTotal();

    if (publies === undefined || total === undefined) return null;
    if (!Number.isInteger(publies) || !Number.isInteger(total)) return null;
    if (total <= 0 || publies < 0 || publies > total) return null;

    return {
      segments: Array.from({ length: total }, (_valeur, rang) => ({
        rang,
        rempli: rang < publies,
      })),
      libelle:
        publies > 1
          ? `${String(publies)} modules publiés sur ${String(total)}`
          : `${String(publies)} module publié sur ${String(total)}`,
    };
  });
}
