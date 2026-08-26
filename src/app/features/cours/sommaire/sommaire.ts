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
import {
  EvaluationDuCours,
  HORAIRES_DES_COURS,
  MANIFESTE_LECONS,
  SeanceDuCours,
  leconsPubliees,
  niveauLisible,
} from '../contenu-compile';

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
  /**
   * Les numéros de séance des modules du groupe, dans l'ordre de lecture — jamais
   * rendus, ils servent UNIQUEMENT à placer les jalons d'évaluation.
   *
   * Un module sans `seance` (complément hors cours) n'y figure pas : il ne compte
   * dans aucun maximum, et un groupe qui n'en contient que de tels modules ne peut
   * donc recevoir aucun jalon avant lui. C'est ce que dit
   * `docs/contenu/ancrage-au-cours.md` §5(c), et c'est aussi la seule lecture
   * honnête : un complément n'a pas de place dans le calendrier du cours.
   */
  readonly seances: readonly number[];
}

/**
 * UN JALON D'ÉVALUATION — « Examen 1 · 11 septembre · séances 1 à 4 ».
 *
 * Ce n'est PAS un module : il n'a ni lien, ni état, ni progression. Il vient de
 * l'HORAIRE (`horaire.json`), donc du contenu compilé, donc il est rigoureusement
 * identique au prerender et après hydratation (L-033).
 */
export interface JalonSommaire {
  readonly cle: string;
  /** Le numéro de la séance d'évaluation — sa position dans le calendrier. */
  readonly seance: number;
  /** Le TEXTE, entier. WCAG 1.4.1 : l'information ne passe ni par la couleur ni par un trait. */
  readonly libelle: string;
}

/** Un groupe de modules, à sa place dans la suite rendue. */
export interface ElementGroupe {
  readonly type: 'groupe';
  readonly cle: string;
  readonly groupe: GroupeSommaire;
}

/** Un jalon d'évaluation, intercalé ENTRE deux groupes — jamais dans une liste de modules. */
export interface ElementJalon {
  readonly type: 'jalon';
  readonly cle: string;
  readonly jalon: JalonSommaire;
}

/**
 * Ce que le gabarit itère : groupes et jalons dans l'ordre de lecture.
 *
 * Une union DISCRIMINÉE plutôt que deux champs optionnels : « un groupe et un
 * jalon à la fois » et « ni l'un ni l'autre » sont des états qui n'existent pas,
 * et un type qui les autorise finit par les produire.
 */
export type ElementSommaire = ElementGroupe | ElementJalon;

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

// -----------------------------------------------------------------------------
// Les jalons d'évaluation — `docs/contenu/ancrage-au-cours.md` §5(c)
// -----------------------------------------------------------------------------

/**
 * Les douze mois, indexés par `rang - 1` du champ `MM` du contrat.
 *
 * 🔴 AUCUN `Date`, ET CE N'EST PAS UNE PRÉFÉRENCE DE STYLE. `new Date('2026-09-11')`
 * est interprété en UTC par la spécification : à l'ouest de Greenwich — donc sur tout
 * le Québec — la date locale qui en sort est le 10 septembre. Le site annoncerait
 * l'examen la veille, et un site PRERENDU fige cette erreur dans le fichier servi.
 * La date du contrat est une CHAÎNE `AAAA-MM-JJ` : on la découpe, on l'indexe.
 */
const MOIS_EN_FRANCAIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const;

/**
 * Le séparateur du libellé d'un jalon.
 *
 * Insécable AVANT le point médian, ordinaire APRÈS : la puce ne peut jamais se
 * retrouver seule en début de ligne, et le libellé garde le droit de se replier sur
 * un écran étroit. U+00A0 en séquence d'échappement — voir l'en-tête du fichier.
 */
const SEPARATEUR_JALON = `${ESPACE_INSECABLE}· `;

/**
 * `AAAA-MM-JJ` → « 11 septembre ». Sans année : le jalon vit dans le calendrier
 * d'UNE session, que l'en-tête du cours nomme déjà.
 *
 * Le quantième passe par `Number` pour que le `07` du contrat ne se rende pas
 * « 07 août ». Une date hors table retombe sur la chaîne BRUTE plutôt que sur un
 * mois inventé : `lireHoraires` la refuse déjà au chargement, et si elle passait
 * quand même, l'ISO est au moins vrai.
 */
function formaterDateCourte(iso: string): string {
  const [, mois, jour] = iso.split('-');
  const nomDuMois = MOIS_EN_FRANCAIS[Number(mois) - 1];
  const quantieme = Number(jour);
  if (nomDuMois === undefined || !Number.isInteger(quantieme) || quantieme < 1) {
    return iso;
  }
  return `${quantieme}${ESPACE_INSECABLE}${nomDuMois}`;
}

/** Une plage de séances, ou une séance seule quand les deux bornes coïncident. */
function ecrirePlage(debut: number, fin: number): string {
  return debut === fin
    ? `${debut}`
    : `${debut}${ESPACE_INSECABLE}à${ESPACE_INSECABLE}${fin}`;
}

/**
 * La portée d'une évaluation — « séances 1 à 4 », « séances 1 à 5, 7 à 10 »,
 * « séance 3 ».
 *
 * Les numéros CONTIGUS se replient en plage ; un trou (la séance 6 est l'examen 1,
 * elle n'est la matière de personne) ouvre une nouvelle plage. Énumérer « 1, 2, 3,
 * 4, 5, 7, 8, 9, 10 » serait exact et illisible.
 *
 * Une portée VIDE rend la chaîne vide, et l'appelant n'annonce alors aucune séance —
 * même règle qu'une portée absente : on n'invente pas de matière d'examen.
 */
function formaterPortee(portee: readonly number[]): string {
  const numeros = [...new Set(portee)].sort((a, b) => a - b);
  const plages: string[] = [];
  let debut: number | undefined;
  let fin: number | undefined;

  for (const numero of numeros) {
    if (debut === undefined || fin === undefined) {
      debut = numero;
      fin = numero;
    } else if (numero === fin + 1) {
      fin = numero;
    } else {
      plages.push(ecrirePlage(debut, fin));
      debut = numero;
      fin = numero;
    }
  }
  if (debut !== undefined && fin !== undefined) {
    plages.push(ecrirePlage(debut, fin));
  }

  if (plages.length === 0) {
    return '';
  }
  // Le français met le singulier à 1 : « séance 3 », jamais « séances 3 ».
  const nom = numeros.length >= 2 ? 'séances' : 'séance';
  return `${nom}${ESPACE_INSECABLE}${plages.join(', ')}`;
}

/**
 * Le libellé complet d'un jalon.
 *
 * Le `libelle` de l'évaluation se rend TEL QUEL, comme la pastille de la page de
 * leçon : fabriquer « à l'examen 1 » depuis la donnée donne « à l'Projet de session »
 * au premier libellé qui ne commence pas par une voyelle.
 *
 * SANS `portee`, AUCUNE séance n'est annoncée (cas du projet de session) :
 * l'enseignant n'en a publié aucune, et en inventer une annoncerait une matière
 * d'examen qui n'a jamais été annoncée (`ancrage-au-cours.md` §5).
 */
function decrireJalon(seance: SeanceDuCours, evaluation: EvaluationDuCours): JalonSommaire {
  const parties = [evaluation.libelle, formaterDateCourte(seance.date)];
  const portee = evaluation.portee === undefined ? '' : formaterPortee(evaluation.portee);
  if (portee !== '') {
    parties.push(portee);
  }
  return {
    cle: `jalon:${seance.numero}`,
    seance: seance.numero,
    libelle: parties.join(SEPARATEUR_JALON),
  };
}

/**
 * Le rang du groupe APRÈS lequel un jalon s'intercale — `-1` ⇒ avant tous.
 *
 * La règle, telle que le contrat la tranche : le groupe retenu est celui dont la plus
 * grande séance est la plus grande encore STRICTEMENT INFÉRIEURE à la séance du jalon.
 * À maximum égal, le dernier groupe l'emporte — un jalon se pose après TOUT ce qu'il
 * évalue, pas au milieu.
 *
 * 🔴 FAIL-CLOSED. Si un jalon devait tomber À L'INTÉRIEUR d'un groupe — le groupe
 * contient à la fois une séance antérieure et une séance postérieure à l'évaluation —
 * on LÈVE en nommant la section et l'évaluation. Repousser le jalon à la frontière la
 * plus proche rendrait une page plausible et FAUSSE : elle annoncerait que l'examen
 * couvre (ou ne couvre pas) des modules dont la place dans le calendrier dit le
 * contraire. Le cas n'existe pas aujourd'hui dans `securite-web` ; le jour où il
 * apparaît, c'est une décision de découpe éditoriale, et elle doit se voir. Même
 * régime que `ancrerAuCours`, qui lève plutôt que de retomber sur « hors cours ».
 */
function positionDuJalon(groupes: readonly GroupeSommaire[], jalon: JalonSommaire): number {
  let position = -1;
  let plusGrandMaximum = Number.NEGATIVE_INFINITY;

  for (const [rang, groupe] of groupes.entries()) {
    if (groupe.seances.length === 0) {
      continue;
    }
    const minimum = Math.min(...groupe.seances);
    const maximum = Math.max(...groupe.seances);

    if (minimum < jalon.seance && maximum > jalon.seance) {
      const ou = groupe.section ?? 'la liste plate (aucune section)';
      throw new Error(
        `Sommaire — « ${jalon.libelle} » (séance ${jalon.seance}) tomberait À L'INTÉRIEUR de ` +
          `« ${ou} », qui couvre les séances ${minimum} à ${maximum}. Un jalon d'évaluation ne ` +
          "se rend qu'ENTRE deux groupes : trancher la découpe des sections " +
          '(`docs/contenu/ancrage-au-cours.md` §5) plutôt que de repousser le jalon à une ' +
          "frontière, ce qui mentirait sur la position de l'évaluation dans le calendrier.",
      );
    }

    if (maximum < jalon.seance && maximum >= plusGrandMaximum) {
      plusGrandMaximum = maximum;
      position = rang;
    }
  }

  return position;
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
  private readonly horaires = inject(HORAIRES_DES_COURS);
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
    const seancesParGroupe = new Map<string, number[]>();
    for (const entree of lecons) {
      const cle = sectionne ? (entree.section ?? '').trim() : CLE_LISTE_PLATE;
      const modules = parGroupe.get(cle) ?? [];
      modules.push(this.decrire(entree, lisible));
      parGroupe.set(cle, modules);

      // `seance` est OPTIONNEL, et son absence a un sens (« complément hors cours ») :
      // le module existe, il ne prend simplement aucune place au calendrier.
      if (entree.seance !== undefined) {
        const seances = seancesParGroupe.get(cle) ?? [];
        seances.push(entree.seance);
        seancesParGroupe.set(cle, seances);
      }
    }

    return [...parGroupe].map(([cle, modules]) => ({
      cle,
      section: sectionne ? cle : null,
      modules,
      seances: seancesParGroupe.get(cle) ?? [],
    }));
  });

  /**
   * Les jalons du cours — TOUTES les séances de l'horaire qui portent une évaluation.
   *
   * Le projet de session en fait partie : c'est une évaluation à 20 %, et l'absence
   * de `portee` ne la rend pas moins datée ni moins due.
   *
   * L'ORDRE N'EST PAS REFAIT ICI. `lireHoraires` VÉRIFIE que les séances sont
   * strictement croissantes (et refuse l'artéfact sinon) : re-trier masquerait une
   * régression du pipeline, exactement comme pour le manifeste.
   *
   * Ne dépend QUE des horaires et du sujet — donc invariant à l'hydratation.
   */
  private readonly jalons = computed<readonly JalonSommaire[]>(() => {
    const horaire = this.horaires.get(this.sujet());
    if (horaire === undefined) {
      return [];
    }

    const jalons: JalonSommaire[] = [];
    for (const seance of horaire.seances) {
      const evaluation = seance.evaluation;
      if (evaluation !== undefined) {
        jalons.push(decrireJalon(seance, evaluation));
      }
    }
    return jalons;
  });

  /**
   * CE QUE LE GABARIT ITÈRE : les groupes de modules, et les jalons d'évaluation
   * intercalés à leur position d'horaire (`ancrage-au-cours.md` §5(c)).
   *
   * 🔴 INVARIANT À L'HYDRATATION (L-033). Les deux entrées de ce calcul — le
   * manifeste et l'horaire — sont du contenu COMPILÉ : le nombre de jalons et leur
   * position sont identiques dans le fichier prerendu et après hydratation. La
   * progression ne touche que le TEXTE des badges, jamais cette suite.
   *
   * `groupes()` reste la source de `modules()`, donc des compteurs : intercaler des
   * jalons ici n'en ajoute aucun au dénominateur — un jalon n'est pas un module.
   */
  readonly elements = computed<readonly ElementSommaire[]>(() => {
    const groupes = this.groupes();

    // Les jalons sont rangés par position ; l'itération suivant l'ordre de l'horaire,
    // plusieurs jalons partageant une position sortent par séance CROISSANTE.
    const parPosition = new Map<number, JalonSommaire[]>();
    for (const jalon of this.jalons()) {
      const position = positionDuJalon(groupes, jalon);
      const liste = parPosition.get(position) ?? [];
      liste.push(jalon);
      parPosition.set(position, liste);
    }

    const elements: ElementSommaire[] = [];
    const poserLesJalons = (position: number): void => {
      for (const jalon of parPosition.get(position) ?? []) {
        elements.push({ type: 'jalon', cle: jalon.cle, jalon });
      }
    };

    // `-1` : aucun groupe ne précède ce jalon — il ouvre la page. C'est le cas d'un
    // cours dont les premiers modules ne sont pas encore publiés.
    poserLesJalons(-1);
    for (const [rang, groupe] of groupes.entries()) {
      elements.push({ type: 'groupe', cle: `groupe:${groupe.cle}`, groupe });
      poserLesJalons(rang);
    }
    return elements;
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

  /**
   * Le texte VISIBLE de la jauge segmentée — « Maîtrise : 3 / 13 ».
   *
   * Il ne se contente pas de doubler la jauge : c'est LUI qui porte l'information,
   * les segments étant `aria-hidden` (WCAG 1.4.1 — jamais la seule couleur, et ici
   * jamais la seule forme non plus).
   *
   * La forme « n / total » est choisie parce qu'elle N'A PAS DE PLURIEL à accorder :
   * elle reste juste à 0, à 1 et à 13, là où « 1 modules maîtrisé » demanderait le
   * `@if` que L-033 interdit dans ce gabarit. Les deux blanches sont des U+00A0
   * écrites en séquence d'échappement — voir l'en-tête de ce fichier.
   */
  readonly libelleJauge = computed(
    () =>
      `Maîtrise${ESPACE_INSECABLE}: ${this.nombreMaitrises()}${ESPACE_INSECABLE}/` +
      `${ESPACE_INSECABLE}${this.nombreModules()}`,
  );

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
