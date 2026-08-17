// =============================================================================
// resoudreLecon — le chargement d'une leçon, DANS LA ROUTE et non dans le composant
// -----------------------------------------------------------------------------
// POURQUOI UN `ResolveFn` ET PAS UN CHARGEMENT DANS LE COMPOSANT. Le site est
// entièrement prerendu (`outputMode: "static"`). Le prerenderer rend la page une
// fois l'application STABLE : un `resolve` de route est attendu par le routeur
// AVANT l'activation du composant, donc avant tout rendu. Un chargement déclenché
// depuis le composant (`ngOnInit`, `afterNextRender`, un `resource()`) arriverait
// après le premier rendu, et le fichier statique écrit sur disque pourrait ne
// contenir que l'état d'attente — une leçon VIDE, livrée sans erreur, exactement le
// genre de silence que ce dépôt refuse partout ailleurs.
//
// CE QUE CETTE FONCTION FAIT, DANS L'ORDRE :
//   1. lit le `:slug` de la route ;
//   2. cherche son CHARGEUR dans `carte-lecons.ts` (généré) ;
//   3. slug inconnu ⇒ redirige vers `/404` (voir plus bas) ;
//   4. `await` le chargeur — un `import()` littéral, donc un chunk par leçon ;
//   5. RÉTRÉCIT le `unknown` du module en `LeconCompilee` (`lireLeconCompilee`).
//
// 🔴 POURQUOI `Object.hasOwn` ET NON `carteLecons[slug]` TOUT COURT. La carte est un
// objet littéral : elle hérite de `Object.prototype`. Un slug forgé valant
// `constructor`, `toString` ou `valueOf` rendrait donc une FONCTION héritée, que
// l'étape 4 appellerait. `noUncheckedIndexedAccess` ne voit rien de tout cela — le
// typage dit « peut-être undefined », le runtime rend une fonction. On demande donc
// une propriété PROPRE, et un slug hérité tombe dans le cas « inconnu ».
//
// 🔴 LE SLUG NE SORT PAS D'ICI. Il vient de l'URL, donc de qui forge le lien
// (règle écrite en tête d'`app.routes.server.ts`). Il sert à CHOISIR un chargeur ;
// il n'est ni affiché, ni concaténé dans un message d'erreur. Le seul slug qui
// atteint `lireLeconCompilee` est celui d'une CLEF de `carte-lecons.ts` — donc un
// slug que le pipeline a écrit, jamais celui que le visiteur a tapé. Les deux
// coïncident sur le chemin nominal ; ils divergent exactement dans le cas qu'on
// veut protéger.
//
// POURQUOI UNE REDIRECTION VERS `/404` ET NON UNE PAGE « LEÇON INTROUVABLE ».
// Au prerender, le cas est IMPOSSIBLE : les paramètres viennent du manifeste, donc
// des mêmes clefs que la carte. Il ne reste que la navigation cliente — et là, le
// document que SWA a servi pour une URL non prerendue est `404/index.html`, c'est-à-dire
// le DOM de `PageIntrouvable`. Monter un AUTRE composant par-dessus, ne serait-ce
// qu'une page « leçon introuvable » plus jolie, reproduirait très exactement le
// décalage d'hydratation (NG0500) qui a fait retirer la route `:slug` en E1. On
// converge donc vers la MÊME page 404 que celle qui a été servie.
// =============================================================================

import { InjectionToken, inject } from '@angular/core';
import { RedirectCommand, Router, type ResolveFn } from '@angular/router';

import { carteLecons, type ChargeurLecon } from '../../../../content-generated/carte-lecons';
import { lireLeconCompilee } from '../contenu-compile';

/** La route littérale réellement prerendue en `404/index.html` (cf. `app.routes.ts`). */
const ROUTE_404 = '/404';

/**
 * La carte des chargeurs, INJECTABLE — jumelle de `MANIFESTE_LECONS`, et pour la
 * même raison (`contenu-compile.ts`) : il n'existe qu'une carte, mais elle vaut
 * `{}` tant que `content/` est vide (jusqu'à E3-ST1). Importée en dur, le cas
 * « slug connu » de ce résolveur serait intestable, donc muet — et retirer le
 * `Object.hasOwn` ci-dessous laisserait `npm test` vert (L-005).
 * Le défaut EST la vraie carte : rien à câbler dans `app.config.ts`.
 */
export const CARTE_LECONS = new InjectionToken<Record<string, ChargeurLecon>>(
  'carte des chargeurs de leçons compilées',
  { providedIn: 'root', factory: () => carteLecons },
);

/**
 * Résout la leçon d'une route `cours/securite-web/:slug`.
 *
 * Le type déclaré est `LeconCompilee` : `ResolveFn<T>` autorise déjà un
 * `RedirectCommand` en retour, il n'a pas à figurer dans le paramètre de type.
 */
export const resoudreLecon: ResolveFn<LeconCompilee> = async (route) => {
  const routeur = inject(Router);
  const carte = inject(CARTE_LECONS);
  const slugDemande = route.paramMap.get('slug') ?? '';

  // Propriété PROPRE uniquement — voir l'en-tête (héritage de `Object.prototype`).
  if (!Object.hasOwn(carte, slugDemande)) {
    return new RedirectCommand(routeur.parseUrl(ROUTE_404));
  }
  const chargeur = carte[slugDemande];
  if (chargeur === undefined) {
    return new RedirectCommand(routeur.parseUrl(ROUTE_404));
  }

  const module = await chargeur();

  // À ce point seulement, le slug est une CLEF de la carte : il a été écrit par
  // `generer-manifeste.mjs`, pas par le visiteur. Le citer nomme donc le fichier
  // fautif au développeur, sans jamais rendre du texte de tiers.
  return lireLeconCompilee(module.default, `src/content-generated/lecons/${slugDemande}.json`);
};
