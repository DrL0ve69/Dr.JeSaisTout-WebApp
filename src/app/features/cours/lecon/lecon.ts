// =============================================================================
// Lecon — la PAGE d'une leçon (E2-ST2, lot B)
// -----------------------------------------------------------------------------
// CE QU'ELLE FAIT. Elle met en page une `LeconCompilee` déjà chargée et déjà
// validée par `resoudreLecon` : page de garde (titre, repères, objectifs,
// prérequis), sommaire ancré, sections, puis navigation vers les leçons voisines.
// Elle ne charge RIEN et ne parse RIEN — le Markdown est devenu du HTML au build,
// et le rendu des blocs appartient à `RenduBlocs`.
//
// ELLE LIT `route.data` EN FLUX, PAS `route.snapshot`. Différence avec
// `PageAVenir`, et elle est structurelle : les liens « leçon précédente /
// suivante » mènent d'une leçon à l'autre, c'est-à-dire à la MÊME configuration de
// route avec un autre paramètre. Angular réutilise alors l'instance du composant au
// lieu de la recréer : un `snapshot` lu une fois resterait figé sur la leçon
// précédente, et le visiteur verrait l'ancienne page sous la nouvelle URL.
//
// SANS JS, TOUT L'ESSENTIEL TIENT. Le sommaire est une liste de `routerLink` sur la
// route COURANTE + `fragment` — donc des `href` absolus, fragment compris, que le
// navigateur suit lui-même (voir la note 🔴 devant le sommaire : un `href="#ancre"`
// nu se résoudrait contre le `<base href="/" />` et mènerait à l'accueil) ; les
// liens voisins sont eux aussi des `routerLink` qui
// écrivent un vrai `href` dans le HTML prerendu, et le corps de la leçon est dans
// le document. Rien ici ne dépend d'un gestionnaire d'événement — ce qui est
// obligatoire : `withNoIncrementalHydration()` est actif (`app.config.ts`), donc le
// rejeu d'événements est perdu et un bloc differe-hydrate serait INERTE.
//
// LE TITRE DU DOCUMENT N'EST PAS POSÉ ICI. Il l'est par la table de routes, via un
// resolveur de titre (`titreDeDocument`) que la stratégie par défaut d'Angular
// applique — le raisonnement, et pourquoi aucune stratégie de titre maison n'est
// écrite, est en tête de `navigation-lecon.ts`. Ce composant ne pose que les
// métadonnées que le routeur ne connaît pas : description et OpenGraph.
//
// 🔴 AUCUN SEGMENT D'URL N'EST RÉAFFICHÉ. Tout ce qui s'écrit dans cette page vient
// du frontmatter compilé ou du manifeste — donc de textes écrits par la boucle
// contenu. Le slug a servi à CHOISIR la leçon, dans `resoudreLecon`, et il s'arrête
// là (règle en tête d'`app.routes.server.ts`). Le slug employé ci-dessous pour
// trouver les voisines est celui du FRONTMATTER, pas celui de l'URL.
//
// ⚠️ RÉDACTION : blanches insécables U+00A0 UNIQUEMENT — écrites `&nbsp;` dans le
// gabarit et en séquence d'échappement dans le code, pour qu'on les VOIE à la
// relecture. Jamais U+202F ni U+2009, absentes de Fraunces comme d'Inter
// (`.claude/rules/contenu-pedagogique.md` §3).
// =============================================================================

import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MANIFESTE_LECONS, NIVEAUX, lireLeconCompilee } from '../contenu-compile';
import {
  construireSommaire,
  lienVersLecon,
  urlDeLecon,
  voisinesDe,
  type EntreeSommaire,
  type Voisines,
} from './navigation-lecon';
import {
  RenduBlocs,
  SANS_DECALAGE,
  cumulerFigures,
  type DecalageFigures,
} from './rendu-blocs/rendu-blocs';

/**
 * Les niveaux du frontmatter, rendus en français lisible.
 *
 * Le TYPE est `Record<Niveau, string>`, pas `Record<string, string>` : ajouter un
 * niveau au contrat sans lui écrire d'étiquette française fait échouer la
 * compilation, plutôt que d'afficher un identifiant technique en page. Et la
 * recherche passe par `NIVEAUX` (liste nominative) plutôt que par une indexation
 * directe du dictionnaire : `NIVEAUX_LISIBLES['constructor']` rendrait la fonction
 * héritée d'`Object.prototype`, qu'un `??` ne rattraperait pas — même piège que
 * `resoudre-lecon.ts`. `lireLeconCompilee` refuse déjà un niveau hors liste ; ceci
 * en est la conséquence, pas le doublon.
 */
const NIVEAUX_LISIBLES: Record<(typeof NIVEAUX)[number], string> = {
  maternelle: 'Maternelle',
  primaire: 'Primaire',
  secondaire: 'Secondaire',
  cegep: 'Cégep',
  universite: 'Université',
};

/** Le nom du site, tel qu'il apparaît dans les métadonnées OpenGraph. */
const NOM_DU_SITE = 'Dr. Je-Sais-Tout';

@Component({
  selector: 'app-lecon',
  imports: [RenduBlocs, RouterLink],
  styleUrl: './lecon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="lecon">
      <header class="page-de-garde">
        <p class="tampon">Module {{ frontmatter().ordre }}&nbsp;— sécurité des applications web</p>

        <h1 class="titre">{{ frontmatter().titre }}</h1>

        <!--
          Les repères de la leçon. Une liste de définitions plutôt que des
          paragraphes : chaque valeur a une étiquette qui la nomme, ce qu'un lecteur
          d'écran annonce (WCAG 1.3.1). Le mot « minutes » est ÉCRIT, pas abrégé en
          « min » : une abréviation demanderait un développement.
        -->
        <dl class="reperes">
          <div class="repere">
            <dt>Durée estimée</dt>
            <dd>{{ frontmatter().dureeEstimee }}&nbsp;minutes</dd>
          </div>
          <div class="repere">
            <dt>Niveau</dt>
            <dd>{{ niveauLisible() }}</dd>
          </div>
        </dl>

        @if (frontmatter().objectifs.length > 0) {
          <section class="encart" aria-labelledby="titre-objectifs">
            <h2 id="titre-objectifs">Ce que vous saurez faire</h2>
            <ul>
              @for (objectif of frontmatter().objectifs; track $index) {
                <li>{{ objectif }}</li>
              }
            </ul>
          </section>
        }

        @if (frontmatter().prerequis.length > 0) {
          <section class="encart" aria-labelledby="titre-prerequis">
            <h2 id="titre-prerequis">À connaître avant de commencer</h2>
            <ul>
              @for (prerequis of frontmatter().prerequis; track $index) {
                <li>{{ prerequis }}</li>
              }
            </ul>
          </section>
        }
      </header>

      <!--
        Le sommaire est une NAVIGATION nommée, pas une simple liste : c'est un
        repère que l'on doit pouvoir atteindre directement (WCAG 2.4.1). Ses liens
        mènent à un titre de LA MÊME page, et le navigateur les suit sans JavaScript
        — ce qui est obligatoire sur une page prerendue non hydratée.

        🔴 routerLink + fragment, JAMAIS un href de fragment nu. index.html pose une
        balise base sur « / » : un fragment nu se résout contre la BASE du document
        et non contre l'URL courante, donc chaque entrée renverrait le lecteur à
        l'ACCUEIL (mesuré en Chromium). Un routerLink vide désigne la route
        courante — le routeur écrit alors un href ABSOLU, juste sans JS —, et
        anchorScrolling (app.config.ts) fait défiler jusqu'au titre sans que
        GestionFocusRoute n'y voie un changement de page : il compare les chemins
        fragment retiré.
      -->
      <nav class="sommaire" aria-labelledby="titre-sommaire">
        <h2 id="titre-sommaire">Sommaire</h2>
        <ol>
          @for (entree of sommaire(); track entree.ancre) {
            <li>
              <a [routerLink]="[]" [fragment]="entree.ancre">{{ entree.titre }}</a>
              @if (entree.sousEntrees.length > 0) {
                <ol>
                  @for (sousEntree of entree.sousEntrees; track sousEntree.ancre) {
                    <li>
                      <a [routerLink]="[]" [fragment]="sousEntree.ancre">{{ sousEntree.titre }}</a>
                    </li>
                  }
                </ol>
              }
            </li>
          }
        </ol>
      </nav>

      <hr />

      @for (section of sections(); track section.ancre; let rangSection = $index) {
        <section class="section">
          <!--
            Le niveau vient du Markdown source et vaut 2 ou 3 (contrôlé par
            lireLeconCompilee). Le repli sur h3 n'est pas un cas « inconnu » qu'on
            masque : c'est la garantie qu'un titre de section est TOUJOURS rendu, et
            jamais remplacé par un trou silencieux dans la page.
          -->
          @switch (section.niveau) {
            @case (2) {
              <h2 class="titre-section" [id]="section.ancre">{{ section.titre }}</h2>
            }
            @default {
              <h3 class="titre-section" [id]="section.ancre">{{ section.titre }}</h3>
            }
          }

          <!--
            Le quiz descend avec les blocs, à toutes les sections : c'est l'ancre
            [[quiz]] qui décide OÙ il se rend, pas la page. Le compilateur garantit
            qu'il y a exactement une ancre dans tout le corps, donc exactement un
            rendu — d'où un input requis plutôt qu'une liaison conditionnelle que la
            page aurait à deviner.

            LA SIMULATION DESCEND DE LA MÊME FAÇON (E2-ST5, lot b2), et la page ne
            regarde toujours pas ce qu'elle transmet : la simulation de la leçon
            peut valoir « undefined » (une leçon qui ne décrit aucun flux n'a pas
            de simulation.json), et c'est l'ancre — donc RenduBlocs — qui décide.
            La liaison, elle, reste OBLIGATOIRE : l'oublier ne compile pas.

            LE DÉCALAGE DES FIGURES DESCEND AVEC LES BLOCS (E2-ST4, lot C1). Un
            RenduBlocs par section, donc autant de compteurs qui repartaient de 1 :
            « Code n°1 » quatre fois dans la leçon-témoin, mesuré. La page est le
            seul endroit qui voit TOUTES les sections, donc le seul qui puisse dire
            à chacune ce qui a déjà été numéroté avant elle.
          -->
          <app-rendu-blocs
            [blocs]="section.blocs"
            [quiz]="lecon().quiz"
            [simulation]="lecon().simulation"
            [decalage]="decalageDeSection(rangSection)"
          />
        </section>
      }

      <!--
        Prev/next. Le bloc entier disparaît quand la leçon n'a aucune voisine : un
        repère de navigation vide serait annoncé pour rien, et surtout un lien sans
        destination serait un lien mort. La première et la dernière leçon du cours
        n'affichent donc qu'un seul lien.
      -->
      @if (voisines().precedente !== null || voisines().suivante !== null) {
        <nav class="voisines" aria-labelledby="titre-voisines">
          <h2 id="titre-voisines">Poursuivre le cours</h2>

          @if (voisines().precedente; as precedente) {
            <a class="voisine precedente" [routerLink]="lienVers(precedente.slug)">
              <span class="sens">Leçon précédente&nbsp;:&nbsp;</span>
              <span class="titre-voisine">{{ precedente.titre }}</span>
            </a>
          }

          @if (voisines().suivante; as suivante) {
            <a class="voisine suivante" [routerLink]="lienVers(suivante.slug)">
              <span class="sens">Leçon suivante&nbsp;:&nbsp;</span>
              <span class="titre-voisine">{{ suivante.titre }}</span>
            </a>
          }
        </nav>
      }
    </article>
  `,
})
export class Lecon {
  private readonly route = inject(ActivatedRoute);
  private readonly metadonnees = inject(Meta);
  private readonly manifeste = inject(MANIFESTE_LECONS);

  /**
   * Les `data` de la route, EN FLUX. `requireSync` est légitime : `ActivatedRoute`
   * expose ses données via un sujet à valeur courante, donc la première émission
   * est synchrone — et si elle cessait de l'être, l'échec serait immédiat et
   * bruyant plutôt qu'un rendu à moitié vide.
   */
  private readonly donneesDeRoute = toSignal(this.route.data, { requireSync: true });

  /**
   * La leçon, re-rétrécie ici. `Data` est un dictionnaire non typé : le `resolve` a
   * bien validé la valeur, mais rien dans le TYPE ne le prouve à cet endroit. On
   * rappelle donc le MÊME contrôle plutôt que d'écrire un `as` — il n'existe qu'une
   * fonction de rétrécissement dans ce lot, il n'y en a pas deux à faire diverger.
   *
   * La provenance citée ne contient AUCUN segment d'URL (voir l'en-tête).
   */
  readonly lecon = computed(() =>
    lireLeconCompilee(this.donneesDeRoute()['lecon'], 'la leçon résolue par la route'),
  );

  readonly frontmatter = computed(() => this.lecon().frontmatter);

  readonly sections = computed<readonly SectionCompilee[]>(() => this.lecon().sections);

  /**
   * Ce qui a déjà été numéroté AVANT chaque section — un décalage par section, dans l'ordre du
   * document (E2-ST4, lot C1).
   *
   * POURQUOI ICI ET NULLE PART AILLEURS : la numérotation des figures de code est CONTINUE sur
   * toute la page, comme celle des figures d'un livre, et cette page est le seul endroit qui voit
   * toutes les sections. `RenduBlocs`, monté une fois par section, ne peut pas savoir ce qui l'a
   * précédé. Le parcours lui-même n'est pas réécrit ici : `cumulerFigures` est LA définition, et
   * elle descend dans les encadrés (un bloc de code niché décale la section suivante).
   */
  private readonly decalagesDesSections = computed<readonly DecalageFigures[]>(() => {
    const decalages: DecalageFigures[] = [];
    let cumul = SANS_DECALAGE;
    for (const section of this.sections()) {
      decalages.push(cumul);
      cumul = cumulerFigures(section.blocs, cumul);
    }
    return decalages;
  });

  readonly sommaire = computed<readonly EntreeSommaire[]>(() =>
    construireSommaire(this.sections()),
  );

  /** Les voisines, cherchées avec le slug DU FRONTMATTER — jamais celui de l'URL. */
  readonly voisines = computed<Voisines>(() => voisinesDe(this.manifeste, this.frontmatter().slug));

  readonly niveauLisible = computed(() => {
    const niveau = this.frontmatter().niveau;
    const connu = NIVEAUX.find((candidat) => candidat === niveau);
    return connu === undefined ? niveau : NIVEAUX_LISIBLES[connu];
  });

  /**
   * La description partagée par la balise `description` et par OpenGraph. Elle est
   * COMPOSÉE par nous à partir du frontmatter : aucune leçon n'a de champ
   * « description », et emprunter le premier objectif ferait passer un objectif
   * pédagogique pour un résumé.
   *
   * Les blanches insécables y sont ÉCHAPPÉES : posées en clair, elles seraient
   * indistinguables d'une espace ordinaire à la relecture.
   */
  private readonly description = computed(() => {
    const { titre, ordre, dureeEstimee } = this.frontmatter();
    return (
      `${titre} — leçon ${ordre} du cours public de sécurité des applications web ` +
      `de ${NOM_DU_SITE}. Durée estimée\u00A0: ${dureeEstimee}\u00A0minutes.`
    );
  });

  constructor() {
    // Les métadonnées sont un EFFET, pas une valeur rendue : elles vivent dans le
    // `<head>`, hors de l'arbre de ce composant. Les poser dans un `computed()`
    // ferait d'un calcul une écriture — et un `computed()` que personne ne consomme
    // n'est jamais évalué (L-018), donc elles ne seraient posées qu'au hasard.
    // `updateTag` REMPLACE la balise existante : passer d'une leçon à l'autre met à
    // jour la description, il ne l'empile pas.
    effect(() => {
      const { titre, slug } = this.frontmatter();
      const description = this.description();

      this.metadonnees.updateTag({ name: 'description', content: description });
      this.metadonnees.updateTag({ property: 'og:type', content: 'article' });
      this.metadonnees.updateTag({ property: 'og:locale', content: 'fr_CA' });
      this.metadonnees.updateTag({ property: 'og:site_name', content: NOM_DU_SITE });
      this.metadonnees.updateTag({ property: 'og:title', content: titre });
      this.metadonnees.updateTag({ property: 'og:description', content: description });
      // 🔴 Le slug vient du FRONTMATTER, jamais de l'URL : une `og:url` bâtie sur le
      // segment reçu ferait publier au site l'adresse qu'un tiers a forgée.
      this.metadonnees.updateTag({ property: 'og:url', content: urlDeLecon(slug) });
    });
  }

  /**
   * Le décalage à passer à la section de rang `rangSection`.
   *
   * Il LÈVE plutôt que de retomber sur `SANS_DECALAGE` : un repli muet rendrait une leçon dont la
   * numérotation repart de 1 au milieu — exactement le défaut que ce lot ferme — sans qu'aucun gate
   * ne rougisse. Impossible par construction : la table est bâtie du MÊME tableau que le `@for`
   * parcourt.
   */
  decalageDeSection(rangSection: number): DecalageFigures {
    const decalage = this.decalagesDesSections()[rangSection];
    if (decalage === undefined) {
      throw new Error(
        `Lecon : aucun décalage de figures pour la section n°${String(rangSection + 1)}. ` +
          'La table et le gabarit parcourent le même tableau — cet écart est un défaut de ce ' +
          'composant.',
      );
    }
    return decalage;
  }

  /** Les commandes de `routerLink` vers une leçon voisine. */
  lienVers(slug: string): string[] {
    return lienVersLecon(slug);
  }
}
