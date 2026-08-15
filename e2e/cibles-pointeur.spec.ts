// =============================================================================
// Taille des cibles de pointeur — mesurée à la mise en page réelle
// (WCAG 2.2 · 2.5.8 « Taille de cible (minimum) », niveau AA = 24 × 24 px CSS)
// -----------------------------------------------------------------------------
// CE QU'IL AJOUTE À CE QUI EXISTE DÉJÀ. Rien ne mesurait ces boîtes. `en-tete.scss`
// et `bascule-theme.scss` posent un `min-block-size` en jeton (`--espace-6`) et
// commentent l'intention — mais un jeton est une PROMESSE : sa valeur peut changer,
// une règle plus spécifique peut l'écraser, un `flex` peut comprimer l'enfant. La
// hauteur finale d'un élément n'existe qu'après la mise en page, et jsdom n'en fait
// aucune : `bascule-theme.scss` l'écrit lui-même — « la seule règle de cette
// sous-tâche qu'aucun gate ne peut attraper ». Ce fichier est ce gate.
//
// ⚠️ 24 PX EST LA BARRE, PAS 44. Les deux critères existent et se confondent
// facilement :
//   • 2.5.8 « Taille de cible (minimum) » — niveau AA — 24 × 24 px CSS ;
//   • 2.5.5 « Taille de cible » — niveau AAA — 44 × 44 px CSS.
// La barre dure du projet est WCAG 2.2 AA : le gate ROUGIT sous 24. Ce qui mesure
// entre 24 et 44 est IMPRIMÉ dans le journal (qui fait foi, L-005) à titre
// informatif — c'est une information de confort, pas un manquement. Faire échouer
// sur 44 reviendrait à appliquer du AAA sous l'étiquette AA, exactement la
// confusion qu'un site qui ENSEIGNE l'accessibilité ne peut pas se permettre.
//
// LA CIBLE, C'EST LA ZONE CLIQUABLE — PAS LA BOÎTE DU CONTRÔLE. Les trois radios de
// la bascule de thème mesurent 24 × 24 en tant qu'`<input>`, mais on ne clique
// jamais l'input nu : il est enveloppé d'un `<label>`, et TOUT le label active le
// contrôle. Mesurer l'input rendrait le gate à la fois faux et inutilement sévère.
// On mesure donc le `<label>` associé quand il y en a un.
// =============================================================================

import { expect, test } from '@playwright/test';

/** La barre AA de 2.5.8, en pixels CSS. Sous cette valeur, le gate échoue. */
const MINIMUM_AA = 24;

/** Le seuil AAA de 2.5.5 : purement informatif ici (voir l'en-tête). */
const SEUIL_AAA_INFORMATIF = 44;

/**
 * Énumération plutôt que liste écrite à la main : la DÉFINITION de ce qu'est une
 * cible vit ici une seule fois, et toute cible ajoutée demain à la coquille est
 * mesurée sans qu'on ait à décrire son gabarit. Elle n'est pas mesurée en silence
 * pour autant : le compte est épinglé plus bas (`toBe(8)`), donc l'ajout d'une
 * cible fait rougir ce fichier et demande un geste conscient. Les deux vont
 * ensemble — l'énumération évite d'oublier de MESURER, le compte évite d'oublier
 * de CONSTATER. `[tabindex="-1"]` est exclu : `<main tabindex="-1">` n'est pas une
 * cible de pointeur.
 */
const SELECTEUR_CIBLES =
  'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex^="-"])';

test('chaque cible de pointeur tient la barre AA de 24 × 24 px (2.5.8)', async ({ page }) => {
  await page.goto('/');

  const cibles = await page.evaluate(
    (selecteur) =>
      Array.from(document.querySelectorAll<HTMLElement>(selecteur)).map((element) => {
        // La zone réellement cliquable. Un contrôle enveloppé dans son `<label>`
        // (les radios du thème) hérite de la boîte du label ; un contrôle relié par
        // `for=""` en ferait autant. Sans label, l'élément est sa propre cible.
        // `CSS.escape` n'est pas une précaution de style : un `id` contenant `.`,
        // `:` ou un chiffre en tête (Angular en génère de tels pour les contrôles
        // de formulaire) produirait un sélecteur INVALIDE, dont l'exception ferait
        // tomber tout l'`evaluate` — donc le gate entier, sur une cause qui n'a
        // rien à voir avec la taille des cibles.
        const label =
          element.closest('label') ??
          (element.id === ''
            ? null
            : document.querySelector<HTMLElement>(`label[for="${CSS.escape(element.id)}"]`));
        const cible = label ?? element;
        const boite = cible.getBoundingClientRect();

        // ─────────────────────────────────────────────────────────────────────
        // EXCEPTION « EN LIGNE » DE 2.5.8, la seule automatisable des cinq.
        // Texte du critère : la cible est exemptée quand elle « se trouve dans une
        // phrase, ou que sa taille est par ailleurs contrainte par la hauteur de
        // ligne d'un texte qui n'est pas une cible ». Autrement dit : un lien au
        // fil du texte ne peut PAS grandir sans disloquer le paragraphe qui le
        // porte — l'agrandir serait le remède pire que le mal.
        //
        // DÉTECTION, VOLONTAIREMENT ÉTROITE — deux conditions cumulatives :
        //   1. l'élément est de niveau `inline` au sens du style CALCULÉ (un
        //      `inline-flex` ou un `block` ne l'est PAS : il a une boîte propre,
        //      donc rien ne contraint sa taille — les liens de l'en-tête et le
        //      logotype sont en `inline-flex`, ils ne relèvent jamais de
        //      l'exception) ;
        //   2. son conteneur direct porte, à côté de lui, du texte qui n'est pas
        //      une cible. C'est ce qui distingue « un lien DANS une phrase » d'un
        //      lien seul dans son bloc, lequel pourrait parfaitement grandir.
        //
        // Une détection plus large — « tout lien de texte » — viderait le gate :
        // il suffirait de mettre un bouton en `display: inline` pour l'exempter.
        //
        // Les quatre autres exceptions (Espacement, Contrôle de l'agent
        // utilisateur, Essentiel, Équivalent) ne sont PAS implémentées : elles
        // demandent un jugement humain ou une analyse de voisinage, et aucune ne
        // s'applique à la coquille aujourd'hui. Le jour où une cible passera sous
        // 24 px en s'en réclamant, le constat devra être écrit à la main, pas
        // deviné par ce fichier.
        // ─────────────────────────────────────────────────────────────────────
        const enLigne = getComputedStyle(cible).display === 'inline';
        const parent = cible.parentElement;
        // « Du texte QUI N'EST PAS UNE CIBLE » — le critère le dit, et le filtre
        // doit le dire aussi. Écarter la seule cible courante ne suffit pas : deux
        // liens en ligne dans un même `<p>`, sans autre texte, s'exempteraient
        // MUTUELLEMENT — chacun servant de « phrase environnante » à l'autre. On
        // écarte donc tout nœud qui EST une cible ou qui EN CONTIENT une ; ne
        // subsiste que du texte véritablement inerte, celui dont la hauteur de
        // ligne contraint réellement la boîte.
        const texteVoisin =
          parent === null
            ? ''
            : Array.from(parent.childNodes)
                .filter(
                  (noeud) =>
                    noeud !== cible &&
                    !(
                      noeud instanceof Element &&
                      (noeud.matches(selecteur) || noeud.querySelector(selecteur) !== null)
                    ),
                )
                .map((noeud) => noeud.textContent ?? '')
                .join('')
                .trim();
        const exceptionEnLigne = enLigne && texteVoisin.length > 0;

        const texte = (cible.textContent ?? '').trim();

        return {
          description: `${element.tagName.toLowerCase()}${element instanceof HTMLInputElement ? `[${element.type}]` : ''} « ${texte || '(sans texte)'} »`,
          largeur: Math.round(boite.width * 10) / 10,
          hauteur: Math.round(boite.height * 10) / 10,
          mesureeSur: label === null ? "l'élément" : 'son <label>',
          exceptionEnLigne,
        };
      }),
    SELECTEUR_CIBLES,
  );

  // Le journal fait foi : toutes les mesures sont imprimées, y compris celles qui
  // passent. C'est ce qui permet de constater une régression progressive (48 → 40 →
  // 32) bien avant qu'elle ne franchisse la barre.
  console.log(`Cibles de pointeur — ${cibles.length} mesurée(s) sur « / » (barre AA 2.5.8 : 24 px) :`);
  for (const cible of cibles) {
    const notes = [];
    if (cible.exceptionEnLigne) {
      notes.push('exception « en ligne » de 2.5.8 appliquée');
    } else if (cible.largeur < SEUIL_AAA_INFORMATIF || cible.hauteur < SEUIL_AAA_INFORMATIF) {
      // INFORMATIF, jamais bloquant : 44 px est le critère 2.5.5, de niveau AAA.
      notes.push(`sous 44 px — 2.5.5 (AAA), hors barre du projet`);
    }
    console.log(
      `  • ${cible.description} — ${cible.largeur}×${cible.hauteur} px (mesuré sur ${cible.mesureeSur})` +
        (notes.length > 0 ? ` · ${notes.join(' · ')}` : ''),
    );
  }

  // Garde-fou : une énumération qui ne trouve rien passerait verte en ne prouvant
  // rien. La coquille en compte 8 aujourd'hui (lien d'évitement, logotype, 2 liens
  // de navigation, 3 radios, lien du pied de page).
  expect(cibles.length, "aucune cible mesurée : l'énumération ne trouve plus rien").toBe(8);

  const tropPetites = cibles.filter(
    (cible) =>
      !cible.exceptionEnLigne &&
      (cible.largeur < MINIMUM_AA || cible.hauteur < MINIMUM_AA),
  );

  expect(
    tropPetites.map((cible) => `${cible.description} = ${cible.largeur}×${cible.hauteur} px`),
    `cible(s) sous la barre AA de ${MINIMUM_AA} px (WCAG 2.2 · 2.5.8). Si l'une d'elles relève d'une exception non automatisée (Espacement, Essentiel, Équivalent, Contrôle de l'agent utilisateur), le constat s'écrit à la main dans le backlog — il ne se contourne pas en élargissant la détection de ce fichier`,
  ).toEqual([]);
});
