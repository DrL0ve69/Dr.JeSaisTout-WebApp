// =============================================================================
// Les routes publiques du site — E1-ST2, mises à jour par E1-ST3
// -----------------------------------------------------------------------------
// Quatre routes. `/` est désormais la VRAIE page d'accueil (`Accueil`, E1-ST3) ;
// `PageAVenir` ne sert plus qu'au sommaire du cours, en attendant le moteur de
// contenu (E2), et `PageIntrouvable` sert les deux entrées de la 404.
//
// POURQUOI `Accueil` EST IMPORTÉE DIRECTEMENT, sans `loadComponent`. Le site est
// entièrement prerendu (`outputMode: "static"`) : le HTML de `/` est déjà écrit
// dans le fichier servi, et le seul rôle du JavaScript y est l'hydratation. Rendre
// paresseuse la route d'ENTRÉE ajouterait un aller-retour réseau supplémentaire
// avant cette hydratation, sur la page la plus visitée du site, pour n'économiser
// aucun octet à personne — le fragment serait demandé dans la foulée du bundle
// principal, toujours. Le découpage paresseux redeviendra le bon geste en E2, où
// les routes de leçon sont nombreuses et rarement toutes visitées.
//
// AUCUNE ROUTE PARAMÉTRÉE EN E1 : `cours/securite-web/:slug` a été retirée de ce
// lot — elle ne pouvait qu'être servie par `404/index.html` (statut 404) puis
// écrasée côté client, donc décalage d'hydratation. Ce qu'E2-ST1 devra remettre,
// et comment, est écrit dans `app.routes.server.ts`.
//
// PAS DE `TitleStrategy` MAISON. Le `title:` littéral de chaque route est
// appliqué par la stratégie par défaut d'Angular (`TitleStrategy` →
// `Title.setTitle`). Écrire une stratégie pour cinq routes ajouterait une classe
// à tester et à maintenir sans rien apporter ; elle se justifiera en E2, quand le
// titre viendra du front-matter d'une leçon.
//
// PAS DE `withComponentInputBinding()` (raisonnement complet dans `app.config.ts`,
// rappel dans l'en-tête de `PageAVenir`) : ces routes alimentent le composant par
// `data`, qu'il lit lui-même sur `ActivatedRoute.snapshot`.
//
// LES `data.titre` NE SONT PAS FACULTATIFS — POUR LES ROUTES DE `PageAVenir`.
// `Accueil`, elle, écrit son `<h1>` dans son propre gabarit : le bloc `data` de la
// route `/` a été RETIRÉ avec E1-ST3 plutôt que laissé à ne servir personne (du
// code mort silencieux, que la revue suivante prendrait pour un contrat).
// `PageAVenir.titre()` LÈVE une
// exception si `data.titre` manque, est vide, ou n'est pas une chaîne — donc le
// prerender de la route fautive fait échouer `npm run build` au lieu de livrer un
// `<h1>` vide en silence. `app.routes.spec.ts` tient la même promesse côté tests,
// route par route.
//
// ⚠️ RÉDACTION : blanches insécables U+00A0 UNIQUEMENT (jamais U+202F ni U+2009,
// absentes de Fraunces comme d'Inter) — `.claude/rules/contenu-pedagogique.md` §3.
// Aucun texte ci-dessous n'en a besoin : les tirets cadratins sont entourés
// d'espaces ordinaires, et il n'y a ni guillemet français ni deux-points collé.
//
// POURQUOI UNE ROUTE `404` LITTÉRALE EN PLUS DU `**`, et c'est le cœur de ce lot.
// `@angular/build` SAUTE toute route contenant `*` au prerender
// (`src/utils/server-rendering/prerender.js` : `if (metadata.route.includes('*'))
// { continue; }`) : un `path: '**'` en `RenderMode.Prerender` ne produit AUCUN
// fichier, sans erreur ni avertissement — et `RenderMode.Client` n'en produit pas
// davantage, puisqu'il n'y a pas de serveur (`outputMode: "static"`). Le chemin
// LITTÉRAL `404`, lui, est prerendu en `404/index.html` : c'est le seul fichier
// que `responseOverrides.404` de la configuration SWA puisse servir avec le bon
// statut HTTP.
// Les deux routes rendent le MÊME composant, et c'est indispensable : SWA réécrit
// une URL inconnue vers `404/index.html`, où le routeur reconstruit l'arbre de
// `path: '**'`. Deux composants différents produiraient un décalage d'hydratation
// (le DOM servi ne correspondrait pas à l'arbre reconstruit) et une erreur en
// console à chaque 404.
// =============================================================================

import { Routes } from '@angular/router';

import { PageAVenir } from './core/layout/page-a-venir/page-a-venir';
import { PageIntrouvable } from './core/layout/page-introuvable/page-introuvable';
import { Accueil } from './features/home/accueil';

export const routes: Routes = [
  {
    path: '',
    component: Accueil,
    title: 'Dr. Je-Sais-Tout — cours public de sécurité des applications web',
  },
  {
    path: 'cours/securite-web',
    component: PageAVenir,
    title: 'Sommaire du cours — Dr. Je-Sais-Tout',
    data: {
      titre: 'Sécurité des applications web',
      description: 'Le sommaire des treize modules arrive avec le moteur de contenu (E2).',
    },
  },
  {
    // Chemin littéral → réellement prerendu en `404/index.html`. C'est LUI que
    // sert `responseOverrides.404` de `config/staticwebapp.config.source.json`.
    path: '404',
    component: PageIntrouvable,
    title: 'Page introuvable — Dr. Je-Sais-Tout',
  },
  {
    // Filet côté navigation cliente, une fois l'application chargée. Même
    // composant que `404` — un arbre différent casserait l'hydratation.
    path: '**',
    component: PageIntrouvable,
    title: 'Page introuvable — Dr. Je-Sais-Tout',
  },
];
