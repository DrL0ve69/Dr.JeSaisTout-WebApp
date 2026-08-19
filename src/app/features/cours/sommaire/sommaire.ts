// =============================================================================
// Sommaire — la carte de parcours d'UN cours (E2-ST6, lot C1)
// -----------------------------------------------------------------------------
// CE COMPOSANT NE CONNAÎT AUCUN COURS EN PARTICULIER. Il reçoit un `sujet` et
// lit le manifeste par injection (`MANIFESTE_LECONS`). C'est ce qui remplace la
// route `/cours/php` que le plan d'E2-ST6 a REFUSÉE (décision D-3) : la
// généricité se prouve par un test qui rend deux sujets distincts, pas par une
// seconde route qu'il faudrait maintenir avant d'avoir la moindre leçon PHP.
//
// 🔴 GATE D'HYDRATATION (L-033) — LA CONTRAINTE QUI STRUCTURE TOUT CE FICHIER.
// Le site est prerendu (`outputMode: "static"`) et `withNoIncrementalHydration()`
// est actif : le HTML servi est le MÊME fichier pour tout le monde, donc toujours
// sans progression. Deux règles en découlent, et aucune n'est négociable :
//
//   1. LE GABARIT EST INVARIANT SUR L'ÉTAT. Le badge d'un module est TOUJOURS
//      rendu ; seuls sa classe et son texte changent, et ils changent ensemble.
//      Aucun `@if` ne porte sur la progression. Un `@if` ferait apparaître ou
//      disparaître un nœud entre le DOM servi et le premier rendu client.
//   2. LA SOURCE DE L'ÉTAT EST FERMÉE JUSQU'APRÈS LE PREMIER RENDU. Le signal
//      privé `progressionLisible` vaut `false` jusqu'à `afterNextRender` ; tant
//      qu'il est fermé, `groupes()` NE LIT PAS le service de progression et rend
//      « à commencer » partout — exactement ce que le fichier prerendu contient.
//
//   ⚠️ Le premier point sans le second ne suffirait pas : le DOM aurait les bons
//   nœuds mais les mauvais textes dès le premier rendu client. Le second sans le
//   premier ne suffirait pas non plus : la structure divergerait à la bascule.
//
// LE DÉNOMINATEUR *ET* LE NUMÉRATEUR VIENNENT DU MANIFESTE. `ProgressionService`
// n'expose plus de compteur (retrait délibéré du lot A1) : compter les entrées
// de `localStorage` compterait aussi les leçons renommées ou retirées, et un
// « 12/13 » deviendrait « 14/13 » sur la page même qui existe pour mesurer
// l'avancement. On itère donc les leçons PUBLIÉES du sujet et on interroge
// `etatDe(sujet, slug)` module par module.
//
// AUCUN IMPORT D'UNE AUTRE FEATURE. La progression que ce composant LIT est
// écrite par `features/cours/quiz` et `features/cours/lecon` — le seul chemin
// entre elles passe par `core/progression/` (règle d'architecture du 2026-08-17).
//
// LA MAÎTRISE VIENT DU QUIZ RÉUSSI, JAMAIS DU TEMPS PASSÉ (décision produit,
// backlog §E2-ST6). Ce fichier ne mesure aucune durée de lecture et n'en a aucun
// moyen : il n'appelle que `estMaitrisee(...)`.
//
// ⚠️ RÉDACTION : blanches insécables U+00A0 UNIQUEMENT, et écrites en séquence
// d'échappement (\u00A0) — une U+00A0 littérale dans un fichier TypeScript est
// refusée par la règle ESLint no-irregular-whitespace (L-035). Jamais U+202F ni
// U+2009, absentes de Fraunces comme d'Inter (contenu-pedagogique.md §3).
//
// ⏳ DETTE DATÉE — LE LIEN D'UN MODULE VISE `/cours/<sujet>/<slug>`, et seule la
// route `cours/securite-web/:slug` existe aujourd'hui (`app.routes.ts`). Le jour
// où le cours PHP publie sa première leçon (épic E7), sa route doit être posée
// DANS LE MÊME LOT, sinon ce sommaire produit des liens qui tombent sur la 404.
// C'est écrit ici et dans `sommaire.spec.ts` ; ce n'est pas un oubli du lot C1,
// dont le périmètre exclut explicitement toute route neuve.
// =============================================================================

import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { ProgressionService } from '../../../core/progression/progression';
import { MANIFESTE_LECONS, leconsPubliees, niveauLisible } from '../contenu-compile';

/**
 * Les trois états d'un module, et il n'y en a pas de quatrième.
 *
 * `maitrise` ⊃ `lu` : un quiz réussi implique une leçon ouverte. L'ordre de
 * priorité est donc fixe — on teste la maîtrise d'abord.
 */
export type EtatModule = 'non-commence' | 'lu' | 'maitrise';

/** Un module, tel que le gabarit le rend. Aucune logique dans la vue. */
export interface ModuleSommaire {
  readonly sujet: string;
  readonly slug: string;
  readonly ordre: number;
  readonly titre: string;
  readonly niveau: string;
  readonly duree: string;
  readonly etat: EtatModule;
  /** Le TEXTE du badge. WCAG 1.4.1 : l'état ne passe jamais par la seule couleur. */
  readonly libelleEtat: string;
  /**
   * Le nom accessible du lien — « 3. Les en-têtes de sécurité ».
   *
   * POURQUOI IL NE SUFFIT PAS DE DÉMASQUER LE NUMÉRO. La feuille de style retire les
   * puces, donc un lecteur d'écran annonce une POSITION D'INDEX de liste (« 4 sur
   * 4 ») qui n'est pas l'`ordre` de la leçon : dès qu'un brouillon est intercalé, le
   * visiteur voyant lit « 5 » pendant que la voix dit « 4 ». Le numéro dessiné reste
   * donc `aria-hidden` — sans quoi `preserveWhitespaces: false` recollerait « 3Les
   * en-têtes » (L-024) — et l'`ordre` entre dans le nom avec un séparateur écrit.
   * WCAG 2.5.3 (Label in Name) est tenu : le nom CONTIENT le libellé visible.
   */
  readonly nomAccessible: string;
}

/** Un groupe de modules : une section nommée, ou l'unique groupe d'une liste plate. */
export interface GroupeSommaire {
  readonly cle: string;
  /** `null` ⇒ liste plate : aucun titre de section n'est rendu. */
  readonly section: string | null;
  readonly modules: readonly ModuleSommaire[];
}

/**
 * Clef interne de l'unique groupe d'une liste plate.
 *
 * La chaîne vide ne peut collisionner avec aucun vrai nom de section : le mode
 * groupé exige que CHAQUE section soit non vide après `trim()`. Les deux modes
 * s'excluent de toute façon — cette clef n'est composée que lorsque le
 * groupement par section est écarté.
 */
const CLE_LISTE_PLATE = '';

const ESPACE_INSECABLE = '\u00A0';

const LIBELLES_ETAT: Readonly<Record<EtatModule, string>> = {
  'non-commence': 'À commencer',
  lu: 'Lu',
  maitrise: 'Maîtrisé',
};

/**
 * Un compte suivi de son nom, ACCORDÉ. « 1 module », « 3 modules », « 1 maîtrisé ».
 *
 * 🔴 LE PLURIEL SE CALCULE ICI, PAS DANS LE GABARIT. Un `@if` sur
 * `nombreMaitrises()` porterait sur l'ÉTAT DE PROGRESSION : il ferait apparaître ou
 * disparaître un nœud entre le HTML prerendu (toujours à zéro) et le premier rendu
 * client, ce qui est exactement le décalage d'hydratation que ce composant existe
 * pour éviter (L-033) — et `sommaire.spec.ts` le refuse explicitement. Une chaîne
 * qui descend comme `libelleEtat` change le TEXTE d'un nœud toujours présent.
 *
 * Le français met le singulier à 0 comme à 1 : « 0 maîtrisé », « 1 module ».
 */
function accorder(nombre: number, singulier: string): string {
  return `${nombre} ${singulier}${nombre >= 2 ? 's' : ''}`;
}

/**
 * Une durée en minutes, rendue en français.
 *
 * L'espace avant l'unité est une U+00A0 : « 25 min » ne doit jamais se couper en
 * fin de ligne. Les valeurs aberrantes (négatives, non finies) retombent à 0
 * plutôt que de publier « NaN min » — le manifeste est validé au build, mais un
 * composant d'affichage n'a aucune raison de faire confiance à un nombre.
 */
function formaterDuree(minutes: number): string {
  const total = Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : 0;
  if (total < 60) {
    return `${total}${ESPACE_INSECABLE}min`;
  }
  const heures = Math.floor(total / 60);
  const reste = total % 60;
  if (reste === 0) {
    return `${heures}${ESPACE_INSECABLE}h`;
  }
  return `${heures}${ESPACE_INSECABLE}h${ESPACE_INSECABLE}${String(reste).padStart(2, '0')}`;
}

@Component({
  selector: 'app-sommaire',
  imports: [RouterLink],
  templateUrl: './sommaire.html',
  styleUrl: './sommaire.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sommaire {
  /** Le cours à rendre — la clef de sujet du manifeste (`securite-web`, `php`…). */
  readonly sujet = input.required<string>();

  private readonly manifeste = inject(MANIFESTE_LECONS);
  private readonly progression = inject(ProgressionService);

  /**
   * Le gate d'hydratation (L-033). `false` au prerender ET au premier rendu
   * client ; bascule une seule fois, après que le DOM servi a été adopté.
   *
   * ⚠️ Ne PAS remplacer par une garde de plateforme (`isPlatform…`) : celle-là
   * est déjà vraie au premier rendu client, donc elle ne garde rien. Le nom
   * exact n'est pas écrit ici parce que `sommaire.spec.ts` l'interdit dans tout
   * le fichier, commentaires compris — le garde-fou serait sinon contournable
   * en glissant l'appel juste sous une phrase qui le proscrit.
   */
  private readonly progressionLisible = signal(false);

  /** Les leçons PUBLIÉES du sujet, triées. Ne dépend que du manifeste. */
  private readonly leconsDuSujet = computed<readonly EntreeManifesteRoutes[]>(() => {
    const sujet = this.sujet();
    return [...leconsPubliees(this.manifeste)]
      .filter((entree) => entree.sujet === sujet)
      .sort((a, b) => a.ordre - b.ordre);
  });

  /**
   * Le modèle de rendu complet — groupes, modules, badges.
   *
   * Tant que `progressionLisible()` est faux, ce calcul NE LIT PAS le service :
   * il ne s'y abonne donc même pas. À la bascule, il se recalcule et prend la
   * dépendance ; la structure produite est rigoureusement la même, seuls `etat`
   * et `libelleEtat` changent.
   */
  readonly groupes = computed<readonly GroupeSommaire[]>(() => {
    const lisible = this.progressionLisible();
    const lecons = this.leconsDuSujet();

    // TOUT-OU-RIEN (décision D-2) : on ne groupe que si CHAQUE leçon publiée du
    // sujet porte une section non vide. Un sujet partiellement sectionné retombe
    // en liste plate — aucun module ne se retrouve orphelin dans un groupe « sans
    // titre », et aucun titre de section n'apparaît à moitié.
    const sectionne =
      lecons.length > 0 && lecons.every((entree) => (entree.section ?? '').trim() !== '');

    // `Map` : l'ordre d'insertion est celui de la première apparition dans la
    // liste déjà triée par `ordre`. Les sections se rangent donc d'elles-mêmes,
    // sans exiger qu'elles soient contiguës dans le manifeste.
    const parGroupe = new Map<string, ModuleSommaire[]>();
    for (const entree of lecons) {
      const cle = sectionne ? (entree.section ?? '').trim() : CLE_LISTE_PLATE;
      const modules = parGroupe.get(cle) ?? [];
      modules.push(this.decrire(entree, lisible));
      parGroupe.set(cle, modules);
    }

    return [...parGroupe].map(([cle, modules]) => ({
      cle,
      section: sectionne ? cle : null,
      modules,
    }));
  });

  /** Tous les modules rendus, à plat — la SEULE source des compteurs ci-dessous. */
  readonly modules = computed<readonly ModuleSommaire[]>(() =>
    this.groupes().flatMap((groupe) => groupe.modules),
  );

  /** Le dénominateur. Il vient du manifeste, jamais du stockage. */
  readonly nombreModules = computed(() => this.modules().length);

  /**
   * Le numérateur. Il vient du MÊME tableau que les badges : un module maîtrisé
   * dans `localStorage` mais absent du manifeste (leçon renommée, retirée, ou
   * d'un autre cours) ne peut pas être compté ici, faute d'exister dans la liste.
   */
  readonly nombreMaitrises = computed(
    () => this.modules().filter((module) => module.etat === 'maitrise').length,
  );

  /** Modules ouverts au moins une fois — la maîtrise en fait partie. */
  readonly nombreCommences = computed(
    () => this.modules().filter((module) => module.etat !== 'non-commence').length,
  );

  /**
   * Les trois compteurs du résumé, ACCORDÉS — le gabarit n'écrit plus « 1 modules ».
   *
   * Ils descendent comme des CHAÎNES, exactement comme `libelleEtat`, pour que le
   * gabarit reste invariant sur la progression (voir `accorder` ci-dessus).
   */
  readonly libelleModules = computed(() => accorder(this.nombreModules(), 'module'));

  readonly libelleMaitrises = computed(() => accorder(this.nombreMaitrises(), 'maîtrisé'));

  readonly libelleCommences = computed(() => accorder(this.nombreCommences(), 'commencé'));

  /** La durée du cours entier, somme des durées annoncées par les leçons publiées. */
  readonly dureeTotale = computed(() =>
    formaterDuree(this.leconsDuSujet().reduce((somme, entree) => somme + entree.dureeEstimee, 0)),
  );

  constructor() {
    // Un `afterNextRender` ne court JAMAIS au prerender (Angular ne l'exécute que
    // dans un navigateur) : le fichier écrit sur le disque est donc forcément
    // celui de l'état fermé, sans qu'aucune garde de plateforme soit nécessaire.
    afterNextRender(() => this.progressionLisible.set(true));
  }

  private decrire(entree: EntreeManifesteRoutes, lisible: boolean): ModuleSommaire {
    const etat = lisible ? this.etatDe(entree) : 'non-commence';
    return {
      sujet: entree.sujet,
      slug: entree.slug,
      ordre: entree.ordre,
      titre: entree.titre,
      niveau: niveauLisible(entree.niveau),
      duree: formaterDuree(entree.dureeEstimee),
      etat,
      libelleEtat: LIBELLES_ETAT[etat],
      nomAccessible: `${entree.ordre}. ${entree.titre}`,
    };
  }

  /** `maitrise` d'abord : un quiz réussi implique une leçon lue. */
  private etatDe(entree: EntreeManifesteRoutes): EtatModule {
    if (this.progression.estMaitrisee(entree.sujet, entree.slug)) {
      return 'maitrise';
    }
    return this.progression.etatDe(entree.sujet, entree.slug).lue ? 'lu' : 'non-commence';
  }
}
