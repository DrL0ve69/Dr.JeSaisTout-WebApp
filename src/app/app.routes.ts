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
// ✅ LA ROUTE PARAMÉTRÉE EST DE RETOUR (E2-ST2, lot B), et cette fois elle est
// PRERENDUE. `cours/securite-web/:slug` avait été retirée en E1 parce qu'elle ne
// pouvait qu'être servie par `404/index.html` (statut 404) puis écrasée côté
// client, donc décalage d'hydratation. Ce qui a changé : `app.routes.server.ts` la
// déclare en `RenderMode.Prerender` AVEC un `getPrerenderParams()` alimenté par le
// manifeste, donc chaque leçon devient un vrai fichier statique. Les deux tables
// doivent rester d'accord — une entrée ici sans son pendant là-bas retomberait
// exactement dans le défaut d'E1.
//
// ELLE EST PARESSEUSE, contrairement à `Accueil`. Le raisonnement du paragraphe
// précédent s'inverse ici : les leçons sont nombreuses, aucun visiteur ne les lit
// toutes, et `carte-lecons.ts` émet déjà un chunk par leçon. Faire entrer la page
// et son corps dans le bundle initial ferait payer treize modules à qui n'en ouvre
// aucun.
//
// SON CONTENU EST CHARGÉ PAR UN `resolve`, PAS PAR LE COMPOSANT. Le prerenderer
// écrit le fichier une fois l'application stable ; un chargement déclenché depuis
// le composant arriverait après le premier rendu et pourrait figer une page VIDE
// sur disque. Détail complet en tête de `resoudre-lecon.ts`.
//
// TOUJOURS PAS DE `TitleStrategy` MAISON — et c'est maintenant une décision prise
// EN CONNAISSANCE DU CAS QU'ELLE DEVAIT SERVIR. Le commentaire d'E1 annonçait
// qu'elle « se justifierait en E2, quand le titre viendra du front-matter ». Le
// titre en vient bien, mais `Route.title` accepte AUSSI un `ResolveFn<string>`, que
// la stratégie par défaut applique telle quelle : la route de leçon passe donc
// `titreDeDocument`, et il n'y a aucune classe à écrire. Une `TitleStrategy` maison
// n'ajouterait ici qu'un point de passage supplémentaire à tester.
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
import { manifesteLecons } from './features/cours/contenu-compile';
import { titreDeDocument } from './features/cours/lecon/navigation-lecon';
import { resoudreLecon } from './features/cours/lecon/resoudre-lecon';
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
    // LA PAGE DE LEÇON. Elle vient APRÈS le chemin littéral `cours/securite-web`
    // (le sommaire) et AVANT le `**` : le routeur prend le premier motif qui
    // correspond, et un `**` placé plus haut avalerait toutes les leçons.
    //
    // Le `title` est un RÉSOLVEUR, pas une chaîne : le titre d'une leçon vient de
    // son front-matter, via le manifeste. La stratégie par défaut d'Angular
    // l'applique comme un littéral — voir l'en-tête, et `navigation-lecon.ts` pour
    // la raison pour laquelle il ne réaffiche JAMAIS le slug de l'URL.
    path: 'cours/securite-web/:slug',
    loadComponent: () => import('./features/cours/lecon/lecon').then((module) => module.Lecon),
    resolve: { lecon: resoudreLecon },
    title: (route) => titreDeDocument(manifesteLecons, route.paramMap.get('slug') ?? ''),
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
