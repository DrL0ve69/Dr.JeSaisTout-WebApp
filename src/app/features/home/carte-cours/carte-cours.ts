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
// ⚠️ RÉDACTION : blanches insécables U+00A0 UNIQUEMENT, écrites `&nbsp;` pour
// qu'on les VOIE à la relecture (jamais U+202F ni U+2009, absentes de Fraunces
// comme d'Inter) — `.claude/rules/contenu-pedagogique.md` §3. Le texte éditorial
// de la carte n'est pas ici : il est passé par l'appelant (`accueil.ts`).
// =============================================================================

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

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
}
