// =============================================================================
// Accueil — la page « / », première application complète de la direction visuelle
// -----------------------------------------------------------------------------
// CE QU'ELLE FAIT, ET CE QU'ELLE REFUSE DE FAIRE. La direction arrêtée est
// « l'exposition de pièces à conviction » : l'accueil ne vend rien, elle DÉMONTRE
// que le site s'applique le cours qu'il enseigne. La vedette n'est donc ni une
// illustration ni un slogan, c'est un extrait des en-têtes de sécurité réellement
// servis par ce site (`ExtraitEntetes`), suivi de « vérifiez vous-même ».
// Trois directions ont été écartées avant celle-ci — le sceau (branding plutôt que
// produit, et qualité suspendue à un dessin de LLM), le duo vulnérable/corrigé
// (il ferait entrer la règle de contenu pédagogique dans une sous-tâche d'E1) et
// le feuillet minimal. Le raisonnement complet vit dans
// `docs/agile/backlog-phase-1.md` §E1-ST3 ; il ne se re-litige pas ici.
//
// ⚠️ UN SEUL ÉLÉMENT FOCALISABLE NEUF SUR CETTE PAGE : le « Commencer le cours »
// de `CarteCours`. Le titre de la carte n'est pas un lien (décision 1 du plan) et
// l'extrait n'est pas interactif. Ce n'est pas un détail d'esthétique : les
// comptes d'arrêts de tabulation des specs Playwright d'E1-ST2 en dépendent, et
// `accueil.spec.ts` verrouille le compte à 1.
//
// ⚠️ ORDRE DU DOM = ORDRE DE LECTURE (décision 4, WCAG 1.3.2). La mise en page est
// une colonne unique qui se replie d'elle-même ; AUCUNE propriété `order:` ne doit
// apparaître dans les feuilles de cette page — elle désynchroniserait le parcours
// visuel du parcours clavier et du parcours vocal.
//
// PAS DE `data` DE ROUTE ICI, contrairement à `PageAVenir`. Cette page écrit son
// `<h1>` elle-même : le bloc `data` de la route `''` a donc été RETIRÉ
// (décision 5), plutôt que laissé en place à ne servir personne.
//
// ⚠️ RÉDACTION : blanches insécables U+00A0 UNIQUEMENT, écrites `&nbsp;` pour
// qu'on les VOIE à la relecture (jamais U+202F ni U+2009, absentes de Fraunces
// comme d'Inter) — `.claude/rules/contenu-pedagogique.md` §3. Aucun gate ne
// vérifie encore cette règle dans le contenu ; `accueil.spec.ts` la tient pour
// CETTE page, sur le texte rendu ET sur les sources des trois gabarits.
// =============================================================================

import { ChangeDetectionStrategy, Component } from '@angular/core';

import { CarteCours } from './carte-cours/carte-cours';
import { ExtraitEntetes } from './extrait-entetes/extrait-entetes';

@Component({
  selector: 'app-accueil',
  imports: [CarteCours, ExtraitEntetes],
  styleUrl: './accueil.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="accueil">
      <div class="ouverture">
        <p class="tampon">Cours public et gratuit</p>

        <h1 class="titre">Dr. Je-Sais-Tout</h1>

        <p class="chapo">
          Un cours de sécurité des applications web écrit pour être vérifié&nbsp;: chaque
          affirmation porte sa source, chaque exemple vulnérable porte sa correction.
        </p>
      </div>

      <hr />

      <section class="piece-a-conviction">
        <p class="tampon">Pièce à conviction</p>

        <h2 class="sous-titre">Ce site s’applique le cours qu’il enseigne</h2>

        <p class="intro">
          Voici deux des en-têtes que votre navigateur reçoit avec chaque page de ce site&nbsp;:
          trois directives de la politique de sécurité du contenu, et le nom de l’en-tête qui
          interdit d’y revenir en HTTP clair. Ils ne sont pas là pour la décoration — ils sont la
          première leçon.
        </p>

        <app-extrait-entetes />
      </section>

      <app-carte-cours
        titre="Sécurité des applications web"
        description="Treize modules, de l’injection SQL à la gestion des sessions. Pour chaque notion, la théorie, un exemple simple et un exemple réaliste, puis un quiz. Les modules sont en cours d’écriture — le sommaire ouvrira avec eux."
        mentionChantier="Chantier en cours"
        lien="/cours/securite-web"
      />
    </div>
  `,
})
export class Accueil {}
