// =============================================================================
// Accueil — la page « / », première application de la direction « Moniteur ambre »
// -----------------------------------------------------------------------------
// CE QU'ELLE FAIT, ET CE QU'ELLE REFUSE DE FAIRE. La direction arrêtée est
// « l'exposition de pièces à conviction » : l'accueil ne vend rien, elle DÉMONTRE
// que le site s'applique le cours qu'il enseigne. La vedette de sa deuxième
// section est donc un extrait des en-têtes de sécurité réellement servis
// (`ExtraitEntetes`), suivi de « vérifiez vous-même ».
//
// 🔴 CE QUE LE LOT E6 A CHANGÉ, ET POURQUOI. Le propriétaire a constaté que la
// page « ne présente aucun design ». Le diagnostic n'était PAS la couleur : la
// page empilait au centre trois blocs de prose de MÊME POIDS, sans hiérarchie ni
// point d'entrée. Trois gestes de structure, pas de peinture :
//  1. une BANDE D'OUVERTURE, bornée par un cartouche, qui porte la micro-étiquette,
//     le titre d'affichage, la phrase de présentation et DEUX appels à l'action ;
//  2. la pièce à conviction posée dans un CADRE À BARRE DE TITRE — l'extrait cesse
//     d'être un paragraphe parmi d'autres, il devient une capture d'écran de
//     réponse HTTP ;
//  3. la carte du cours porte une JAUGE SEGMENTÉE de progression éditoriale.
//
// 📈 QUATRE depuis le 2026-09-10 (E7, lot C) : l'appel à l'action de la carte du
// cours de PHP s'ajoute, et le lien PHP de l'en-tête avec lui — 8 → 10 arrêts sur
// « / », ajustés dans les trois specs e2e qui les épinglent, dans le même diff.
// Le paragraphe qui suit raconte l'étape précédente.
//
// ⚠️ TROIS ÉLÉMENTS FOCALISABLES SUR CETTE PAGE, PLUS UN (voir `accueil.spec.ts`).
// C'était UN seul depuis E1-ST3, et le compte est ÉPINGLÉ hors de ce dépôt de
// tests : `e2e/focus-visible.spec.ts` (`ARRETS_ATTENDUS`) et
// `e2e/navigation-clavier.spec.ts` (l'ORDRE exact) comptent les arrêts de
// tabulation de « / » coquille comprise. Le compte est passé de 7 à 8 dans ce
// lot, et il se recompose : 7 − 1 (le groupe de radios du sélecteur de thème,
// retiré par D-2 « sombre seul ») + 2 (les deux appels à l'action neufs) = 8.
// Les deux specs ont été ajustées ICI, dans le même diff — le compte épinglé et
// le DOM ne divergent donc pas. C'est voulu que ces specs rougissent au moindre
// écart : un compte d'arrêts qui change sans que personne ne le voie est
// exactement le défaut qu'elles existent pour attraper.
//
// ⚠️ ORDRE DU DOM = ORDRE DE LECTURE (décision 4, WCAG 1.3.2). AUCUNE propriété
// `order:` ne doit apparaître dans les feuilles de cette page — elle
// désynchroniserait le parcours visuel du parcours clavier et du parcours vocal.
//
// ⚠️ LE DÉCOR EST UNE COUCHE, JAMAIS UN CONTENU. `PluieGlyphes` est monté DANS la
// bande d'ouverture et NULLE PART AILLEURS (G11 : aucun effet ambiant dans le
// champ de lecture — donc jamais sur une page de leçon). Il est `aria-hidden` et
// `inert`, il ne peint rien sous `prefers-reduced-motion`, et la bande reste
// intégralement lisible sans JavaScript : tout son texte est dans le flux normal,
// par-dessus la couche.
//
// PAS DE `data` DE ROUTE ICI. Cette page écrit son `<h1>` elle-même — c'est la
// règle de toute la table de routes depuis E2-ST6 (`app.routes.spec.ts`).
//
// 🔴 LES DEUX CHIFFRES DE LA JAUGE SONT DES LITTÉRAUX, ET LEUR PÉREMPTION EST
// TENUE PAR UN TEST. `MODULES_PUBLIES` est confronté par `accueil.spec.ts` au
// manifeste de contenu réellement compilé : le jour où une deuxième leçon est
// publiée, G-test ROUGIT ici au lieu de laisser l'accueil mentir en silence.
// C'est la leçon de la `mentionChantier` « Chantier en cours », qui a menti
// pendant toute la durée d'E3-ST1 parce que rien ne l'observait : une dette datée
// se pose avec son réveille-matin, ou ne se pose pas.
//
// ⚠️ RÉDACTION : blanches insécables U+00A0 UNIQUEMENT, écrites `&nbsp;` pour
// qu'on les VOIE à la relecture (jamais U+202F ni U+2009, absentes des polices du
// site) — `.claude/rules/contenu-pedagogique.md` §3. `accueil.spec.ts` la tient
// pour CETTE page, sur le texte rendu ET sur les sources des trois gabarits.
// =============================================================================

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PluieGlyphes } from '../../core/ambiance/pluie-glyphes/pluie-glyphes';
import { CarteCours } from './carte-cours/carte-cours';
import { ExtraitEntetes } from './extrait-entetes/extrait-entetes';

/**
 * Modules du cours réellement publiés. Confronté au manifeste par le spec.
 *
 * 📈 6 → 7 le 2026-08-26 (E3-ST14) : `02-environnement-linux`, la séance 2 du
 * cours, rejoint les six premiers. Étape précédente : 5 → 6 le 2026-08-25
 * (E3-ST6, `06-controle-acces`), qui rejoignait les cinq
 * premiers. Étapes précédentes : 4 → 5 le 2026-08-21 (E3-ST5, `05-csrf`),
 * 3 → 4 le 2026-08-21 (E3-ST4, `04-xss`), puis 1 → 3 le 2026-08-21
 * (E3-ST2 et E3-ST3), `02-evaluation-cvss` et `03-injection` rejoignant
 * `01-fondamentaux`. Le littéral est délibéré — c'est lui qui force la revue
 * humaine d'une page d'accueil dont le texte, lui, n'est dérivé de rien (voir la
 * `description` de la carte, corrigée à E3-ST4 : elle annonçait « le premier
 * module est en ligne »). ⚠️ La `description` ci-dessous passe à « la plupart
 * des modules » à dix modules sur treize : « les premiers » sous-disait un compte
 * que la carte affiche juste à côté. Elle redeviendra fausse aux treize.
 */
const MODULES_PUBLIES = 10;

/** Modules prévus au plan du cours (éditorial, arrêté en phase 1). */
const MODULES_TOTAL = 13;

@Component({
  selector: 'app-accueil',
  imports: [CarteCours, ExtraitEntetes, PluieGlyphes, RouterLink],
  styleUrl: './accueil.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="accueil">
      <section class="ouverture">
        <app-pluie-glyphes />

        <div class="ouverture-contenu">
          <p class="etiquette">Cours public et gratuit</p>

          <h1 class="titre">Dr.&nbsp;<span class="titre-marque">Je-Sais-Tout</span></h1>

          <p class="chapo">
            Un cours de sécurité des applications web écrit pour être vérifié&nbsp;: chaque
            affirmation porte sa source, chaque exemple vulnérable porte sa correction.
          </p>

          <div class="actions">
            <a class="bouton bouton-plein" routerLink="/cours/securite-web/fondamentaux">
              Commencer le module&nbsp;01
            </a>

            <a class="bouton bouton-contour" routerLink="/cours/securite-web">
              Voir les 13&nbsp;modules
            </a>
          </div>
        </div>
      </section>

      <section class="piece-a-conviction">
        <p class="etiquette">Pièce à conviction</p>

        <h2 class="sous-titre">Ce site s’applique le cours qu’il enseigne</h2>

        <p class="intro">
          Voici deux des en-têtes que votre navigateur reçoit avec chaque page de ce site&nbsp;:
          trois directives de la politique de sécurité du contenu, et le nom de l’en-tête qui
          interdit d’y revenir en HTTP clair. Ils ne sont pas là pour la décoration — ils sont la
          première leçon.
        </p>

        <div class="cadre">
          <p class="cadre-barre">Réponse HTTP — en-têtes de sécurité</p>

          <div class="cadre-corps">
            <app-extrait-entetes />
          </div>
        </div>
      </section>

      <app-carte-cours
        titre="Sécurité des applications web"
        description="Treize modules, de l’injection SQL à la gestion des sessions. Pour chaque notion, la théorie, un exemple simple et un exemple réaliste, puis un quiz. La plupart des modules sont en ligne&nbsp;; les suivants s’ajouteront au sommaire à mesure qu’ils s’écrivent."
        lien="/cours/securite-web"
        [modulesPublies]="modulesPublies"
        [modulesTotal]="modulesTotal"
      />

      <!--
        LE SECOND COURS (E7, lot C, 2026-09-10) — en ligne avant son premier module
        (décision D-PHP-2). AUCUNE JAUGE, et c'est le contrat de « CarteCours » :
        sans plan chiffré ni module publié, une jauge vide promettrait un décompte
        qui n'existe pas. Le libellé d'action n'est pas « Commencer le cours » pour
        la même raison — le sommaire annonce « Modules en préparation. ».
        ⚠️ Le jour où un module de PHP est publié, cette carte REDEVIENT à revoir :
        libellé, description, et peut-être une jauge confrontée au manifeste comme
        celle d'au-dessus.
      -->
      <app-carte-cours
        titre="Développement d’application en PHP"
        description="Le cours 420-4P2-HU, séance par séance&nbsp;: syntaxe, superglobales, librairie standard, programmation orientée objet, base de données. Chaque module s’ajoutera au sommaire dès qu’il sera publié."
        lien="/cours/php"
        libelleAction="Voir le sommaire"
      />
    </div>
  `,
})
export class Accueil {
  protected readonly modulesPublies = MODULES_PUBLIES;
  protected readonly modulesTotal = MODULES_TOTAL;
}
