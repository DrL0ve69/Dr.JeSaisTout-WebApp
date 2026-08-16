// =============================================================================
// Modes de rendu côté serveur — la table que lit le prerenderer
// -----------------------------------------------------------------------------
// L'ORDRE COMPTE : premier motif qui correspond gagne. Une seule entrée
// aujourd'hui, mais toute entrée future doit précéder le `**`, sinon elle ne
// serait jamais atteinte.
//
// POURQUOI IL N'Y A AUCUNE ROUTE PARAMÉTRÉE EN E1 — ni ici, ni dans
// `app.routes.ts`. Une route `cours/securite-web/:slug` a existé sur ce lot, en
// `RenderMode.Client`, avec l'intention d'afficher une page « leçon à venir »
// plutôt qu'une 404 sur un lien forgé à la main. Elle a été RETIRÉE, parce que
// ce bénéfice ne se produit pas : `outputMode: "static"` ne déploie aucun
// serveur, une route en `Client` ne produit donc AUCUN fichier, et SWA sert une
// telle URL par `responseOverrides.404` → `404/index.html`. Le visiteur reçoit
// un document `PageIntrouvable` (statut HTTP 404) que le routeur client remplace
// aussitôt par un autre composant : décalage d'hydratation et erreur NG0500 en
// console, pour une page qui reste un 404 aux yeux du réseau. Le `**` seul donne
// un 404 cohérent des deux côtés.
//
// ⚠️ CE QU'E2-ST2 DEVRA FAIRE, sans quoi AUCUNE leçon ne sera prerendue — le
// site perdrait sa lisibilité sans JS sur l'essentiel de son contenu :
// réintroduire `cours/securite-web/:slug` DES DEUX CÔTÉS, ici en
// `RenderMode.Prerender` **avec** un `getPrerenderParams()` alimenté par
// `src/content-generated/manifeste-routes.json` — le tableau
// `EntreeManifesteRoutes[]` trié par `ordre` que produit E2-ST1 (lot 4). Il porte
// exactement les slugs à prerendre, et RIEN d'autre : aucun champ n'y distingue
// une leçon « factice » d'une vraie, parce qu'il n'y en a plus besoin — la
// leçon-témoin du pipeline vit hors de `content/`
// (`tools/content-pipeline/__fixtures__/temoin/`), donc hors de portée du build de
// production. Il n'y a donc rien à FILTRER ici : tout ce que le manifeste contient
// se prerende. La fonction n'est pas facultative : `@angular/ssr` fait échouer
// `npm run build` sur une route paramétrée déclarée en `Prerender` qui n'en fournit
// pas — c'est ce garde-fou qui rend l'oubli impossible, à condition de ne pas
// retomber sur `Client` pour le faire taire.
//
// ⚠️ ET UNE RÈGLE DE CONTENU QUI VA AVEC, à ne pas redécouvrir à ce moment-là :
// UN SLUG NE SE RÉAFFICHE JAMAIS TEL QUEL. Il vient de l'URL, donc de qui forge
// le lien. L'interpolation Angular l'échapperait — mais l'échappement n'est pas
// le sujet : réafficher un segment du genre
// `/cours/securite-web/votre-compte-est-compromis-appelez-le-1-800-…` fait écrire
// au site, en français et sous son propre domaine, la phrase d'un tiers. C'est le
// même raisonnement qui a fait écarter `withComponentInputBinding()`
// (`app.config.ts`) ; l'écarter pour les paramètres de requête et l'accepter pour
// un paramètre de chemin serait incohérent. Un slug sert à décider QUEL texte,
// écrit par nous, s'affiche — jamais à fournir ce texte.
// =============================================================================

import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
