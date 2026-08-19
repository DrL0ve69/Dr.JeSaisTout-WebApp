// =============================================================================
// Mesure de l'indicateur de focus — le CODE partagé par les specs qui l'exigent
// (WCAG 2.2 · 2.4.7 Visibilité du focus, 2.4.11 Focus non masqué)
// -----------------------------------------------------------------------------
// POURQUOI CE MODULE EXISTE, ET POURQUOI IL EST NÉ AU LOT E-c D'E2-ST3.
// `focus-visible.spec.ts` mesurait déjà ces deux propriétés, mais sur la seule
// page d'accueil, avec sa liste d'arrêts et son évaluation en ligne. Le quiz de la
// page de leçon ajoute HUIT arrêts d'un genre neuf (quatre groupes de radios, trois
// `<select>`, un bouton) qui doivent franchir la MÊME barre. Recopier le bloc de
// mesure dans un second spec aurait donné deux définitions de « un anneau est
// dessiné » libres de diverger en silence — c'est le motif L-016 du dépôt (une
// constante recopiée est une constante qui se désynchronise). Le sujet mesuré
// change de page en page ; la DÉFINITION de la mesure, non : elle vit ici.
//
// ⚠️ CE MODULE NE PRESSE AUCUNE TOUCHE, ET C'EST VOLONTAIRE. Il lit l'état de
// `document.activeElement` — l'appelant reste maître du geste qui l'y a mis. La
// règle des deux specs appelants est la même et ne se négocie pas : **aucun
// `.focus()` programmatique**. `:focus-visible`, le sélecteur qu'emploie le mixin
// `m.focus-visible`, ne s'active pas de la même façon selon l'ORIGINE du focus ;
// poser le focus par script pourrait ne jamais déclencher la règle, ou la
// déclencher alors qu'un vrai clavier ne le ferait pas. On presse Tab.
// =============================================================================

import { Page, expect } from '@playwright/test';

/**
 * Ce qu'un visiteur peut atteindre au clavier. Volontairement une ÉNUMÉRATION et
 * non une liste écrite à la main : tout élément interactif ajouté demain sera
 * mesuré sans que personne pense à l'inscrire quelque part.
 *
 * `[tabindex="-1"]` est exclu par construction (le sélecteur ne prend que les
 * `tabindex` non négatifs) : `<main tabindex="-1">`, le `<h3>` du quiz et sa région
 * `role="status"` sont focalisables PAR SCRIPT, ils ne sont pas des arrêts de
 * tabulation et n'ont pas à porter d'anneau.
 */
export const SELECTEUR_FOCALISABLES =
  'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex^="-"])';

/**
 * LA TOLÉRANCE SOUS-PIXEL VERTICALE DE `dansLaFenetre`, ET POURQUOI ELLE N'EST PAS
 * UN SEUIL QUI GLISSE — née du lot C d'E2-ST4, mesurée, pas devinée.
 *
 * Quand une tabulation oblige le navigateur à défiler vers le BAS, Chromium aligne
 * l'élément FLUSH sur le bord inférieur de la fenêtre (`kAlignToEdgeIfNeeded`) : la
 * cible est donc `bottom === innerHeight` exactement. Mais il arrondit le décalage de
 * défilement à un pixel entier, tandis que la mise en page garde des hauteurs
 * FRACTIONNAIRES — les défileurs de code mesurent 66,53125 px et 46,0625 px. Le reste
 * de la division déborde donc du bord de quelques CENTIÈMES de pixel : mesuré
 * 0,422 px à 720 px de haut, 0,172 px à 800 px, sur des éléments que le navigateur
 * venait précisément d'amener à l'écran.
 *
 * Sans cette tolérance, la comparaison exacte déclare « focalisé HORS de la fenêtre »
 * un élément parfaitement visible, et le verdict CHANGE avec la hauteur de fenêtre —
 * c'est-à-dire un rouge qui n'apprend rien, sur un produit sain (famille L-035). Le
 * défaut dormait déjà dans les deux autres specs appelants : leurs arrêts sont plus
 * petits, donc moins souvent fractionnaires, pas mieux protégés.
 *
 * ⚠️ DEUX RESSERREMENTS DEMANDÉS EN REVUE, ET APPLIQUÉS — le commentaire promettait
 * plus strict que le code, et la borne était généralisée à des bords jamais mesurés.
 *  1. LA COMPARAISON EST STRICTE (`>` / `<`), plus `>=` / `<=`. L'écart est le RESTE
 *     d'un arrondi au pixel entier : il vit dans [0 ; 1[, donc exactement 1,000 px
 *     n'est pas un reste d'arrondi, c'est un autre phénomène — et il doit rougir.
 *     Le code dit désormais ce que le commentaire disait déjà (« INFÉRIEUR À 1 »).
 *  2. ELLE NE S'APPLIQUE QU'À L'AXE VERTICAL, le seul où la cause ait été mesurée.
 *     Le dépôt interdit un défilement horizontal du document (la prose est bornée,
 *     les blocs de code défilent DANS leur région) : l'arrondi de défilement ne se
 *     produit donc pas sur `left`/`right`, et une tolérance y aurait été un
 *     raisonnement, pas une mesure. Les quatre bords sont IMPRIMÉS à chaque run
 *     (champ `bords`), de sorte que la marge horizontale reste observable — y
 *     compris à 320 px, où l'anneau frôle le bord.
 *
 * Ce que 2.4.11 interdit (un indicateur masqué, ou hors de l'écran) se compte en
 * dizaines de pixels et reste refusé. La borne est ÉPINGLÉE `<= 1` par le contrôle
 * positif de `focus-visible.spec.ts` : l'élargir fait rougir un gate.
 */
export const TOLERANCE_SOUS_PIXEL = 1;

/** L'état neutre d'un focalisable, relevé AVANT toute tabulation. */
export interface EtatAuRepos {
  readonly contourStyle: string;
  readonly contourEpaisseur: number;
  readonly ombre: string;
}

/** L'état d'un focalisable PENDANT qu'il a le focus. */
export interface MesureFocus {
  /** Sa position dans l'ordre du document, clef de rapprochement avec l'état au repos. */
  readonly index: number;
  /** Sert au journal et aux messages d'échec — aucune assertion n'en dépend. */
  readonly description: string;
  readonly contourStyle: string;
  readonly contourEpaisseur: number;
  readonly contourCouleur: string;
  readonly ombre: string;
  readonly dansLaFenetre: boolean;
  readonly boite: string;
  /**
   * Les QUATRE bords face à ceux de la fenêtre, au centième de pixel — le chiffre
   * qu'il a fallu instrumenter à la main pour diagnostiquer le lot C d'E2-ST4
   * (0,422 px de dépassement). Sans lui, `boite` seule (arrondie) ne dit ni de
   * combien un élément déborde, ni par quel bord : le prochain diagnostic
   * repartirait de zéro, et « la tolérance est-elle bornée ? » resterait une
   * question non observable. Aucune assertion n'en dépend — il sert le journal et
   * le message d'échec de 2.4.11.
   */
  readonly bords: string;
  /** `null` = rien ne recouvre ; sinon, la balise du coupable. */
  readonly recouvertPar: string | null;
}

/**
 * Relève l'état au repos de TOUS les focalisables de la page, dans l'ordre du
 * document.
 *
 * À appeler AVANT la première tabulation : à ce moment aucun élément n'a le focus,
 * donc ces valeurs sont bien celles de l'état neutre. Elles se rapprochent ensuite
 * de l'état focalisé par le même index — pas besoin de rendre le focus pour comparer.
 */
export async function releverEtatAuRepos(page: Page): Promise<readonly EtatAuRepos[]> {
  return page.evaluate(
    (selecteur) =>
      Array.from(document.querySelectorAll<HTMLElement>(selecteur)).map((element) => {
        const style = getComputedStyle(element);
        return {
          contourStyle: style.outlineStyle,
          contourEpaisseur: Number.parseFloat(style.outlineWidth) || 0,
          ombre: style.boxShadow,
        };
      }),
    SELECTEUR_FOCALISABLES,
  );
}

/**
 * Mesure l'élément qui a le focus MAINTENANT, ou `null` s'il n'est pas un
 * focalisable de la page (focus sorti sur `<body>`, ou dans la chrome du navigateur).
 */
export async function mesurerArretFocalise(page: Page): Promise<MesureFocus | null> {
  return page.evaluate(([selecteur, tolerance]: readonly [string, number]) => {
    const focalisables = Array.from(document.querySelectorAll<HTMLElement>(selecteur));
    const actif = document.activeElement;
    if (!(actif instanceof HTMLElement)) {
      return null;
    }
    const index = focalisables.indexOf(actif);
    if (index < 0) {
      return null;
    }

    const style = getComputedStyle(actif);
    const boite = actif.getBoundingClientRect();

    // Le centre de la boîte : le point où un utilisateur regarde l'anneau. Si un
    // autre élément y est empilé, l'indicateur est masqué au sens de 2.4.11.
    const auCentre = document.elementFromPoint(
      boite.left + boite.width / 2,
      boite.top + boite.height / 2,
    );

    // Un radio et un `<select>` n'ont pas de texte propre : leur nom vient du
    // `<label>` qui les enveloppe.
    const texte =
      (actif.textContent ?? '').trim() || (actif.closest('label')?.textContent ?? '').trim();

    /** Deux décimales, virgule décimale française : ces chiffres sont lus par un humain. */
    const centieme = (valeur: number): string => valeur.toFixed(2).replace('.', ',');

    return {
      index,
      description: `${actif.tagName.toLowerCase()} « ${texte.replace(/\s+/g, ' ').slice(0, 60) || '(sans texte)'} »`,
      contourStyle: style.outlineStyle,
      contourEpaisseur: Number.parseFloat(style.outlineWidth) || 0,
      contourCouleur: style.outlineColor,
      ombre: style.boxShadow,
      // La tolérance ne joue que sur l'axe VERTICAL — le seul où l'arrondi du
      // décalage de défilement ait été mesuré — et STRICTEMENT : un reste d'arrondi
      // vit dans [0 ; 1[, donc 1,000 px exactement est un autre phénomène et doit
      // rougir. Les bords gauche/droit sont comparés sans indulgence. Voir
      // TOLERANCE_SOUS_PIXEL.
      dansLaFenetre:
        boite.top > -tolerance &&
        boite.left >= 0 &&
        boite.bottom < window.innerHeight + tolerance &&
        boite.right <= window.innerWidth,
      boite: `${Math.round(boite.width)}×${Math.round(boite.height)} en (${Math.round(boite.left)}, ${Math.round(boite.top)})`,
      bords:
        `top ${centieme(boite.top)} · left ${centieme(boite.left)} · ` +
        `bottom ${centieme(boite.bottom)} / innerHeight ${String(window.innerHeight)} · ` +
        `right ${centieme(boite.right)} / innerWidth ${String(window.innerWidth)}`,
      recouvertPar:
        auCentre === null
          ? 'rien (point hors de tout élément)'
          : auCentre === actif || actif.contains(auCentre)
            ? null
            : `<${auCentre.tagName.toLowerCase()}>`,
    };
  }, [SELECTEUR_FOCALISABLES, TOLERANCE_SOUS_PIXEL] as const);
}

/**
 * Les DEUX exigences, sur une mesure et son état au repos.
 *
 * 2.4.7 — un indicateur EXISTE, par l'un des trois canaux possibles. La disjonction
 * est volontairement large : le dépôt dessine un `outline`, mais interdire d'avance
 * une autre technique (ombre, changement d'arrière-plan) ferait de ce contrôle un
 * gardien de style, pas d'accessibilité.
 *
 * 2.4.11 — il est visible LÀ où il est dessiné : dans la fenêtre, et rien par-dessus.
 */
export function exigerIndicateurVisible(mesure: MesureFocus, repos: EtatAuRepos): void {
  const contourDessine = mesure.contourStyle !== 'none' && mesure.contourEpaisseur > 0;
  const ombreDessinee = mesure.ombre !== 'none' && mesure.ombre !== repos.ombre;
  const ecartAvecLeRepos =
    mesure.contourStyle !== repos.contourStyle ||
    mesure.contourEpaisseur !== repos.contourEpaisseur;

  expect(
    contourDessine || ombreDessinee || ecartAvecLeRepos,
    `${mesure.description} : aucun indicateur de focus calculé (contour ${mesure.contourStyle} ${mesure.contourEpaisseur}px, ombre ${mesure.ombre} ; au repos : contour ${repos.contourStyle} ${repos.contourEpaisseur}px)`,
  ).toBe(true);

  expect(
    mesure.dansLaFenetre,
    `${mesure.description} : focalisé HORS de la fenêtre (boîte ${mesure.boite} ; ` +
      `bords ${mesure.bords} ; tolérance verticale STRICTE < ${String(TOLERANCE_SOUS_PIXEL)} px) — ` +
      "l'anneau existe mais personne ne le voit",
  ).toBe(true);

  expect(
    mesure.recouvertPar,
    `${mesure.description} : recouvert par ${mesure.recouvertPar} en son centre — indicateur de focus masqué (WCAG 2.4.11)`,
  ).toBeNull();
}

/** Trace au journal — le journal fait foi (L-005) : les valeurs mesurées s'impriment. */
export function journaliserMesures(titre: string, mesures: readonly MesureFocus[]): void {
  console.log(`Indicateur de focus — ${mesures.length} arrêt(s) mesuré(s) sur ${titre} :`);
  for (const mesure of mesures) {
    console.log(
      `  • ${mesure.description} — contour ${mesure.contourStyle} ${mesure.contourEpaisseur}px ${mesure.contourCouleur}` +
        ` · ombre ${mesure.ombre} · boîte ${mesure.boite}` +
        // Les quatre bords au centième : c'est ici que la marge réelle face à la
        // fenêtre devient observable, sur l'axe horizontal comme sur le vertical.
        `\n      ${mesure.bords}`,
    );
  }
}
