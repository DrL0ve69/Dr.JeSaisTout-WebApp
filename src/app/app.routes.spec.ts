// =============================================================================
// Tests de la TABLE DE ROUTES — le contrat que deux composants de coquille
// tiennent pour toutes les pages du site
// -----------------------------------------------------------------------------
// Ce que ce fichier protège, et qu'aucun autre ne peut protéger :
//
//  · `PageAVenir` LÈVE quand `data.titre` manque. C'est un bon réflexe, mais il
//    ne se déclenche qu'au RENDU de la route fautive : sans ce fichier, la seule
//    chose qui l'attraperait serait `npm run build` (le prerender), c'est-à-dire
//    le gate le plus lent de la chaîne. Ici, c'est rouge en deux secondes.
//  · CHAQUE PAGE A UN TITRE DE DOCUMENT. Un `title:` oublié laisse le titre de la
//    page PRÉCÉDENTE dans l'onglet après une navigation cliente — WCAG 2.4.2
//    décroche sans que rien ne soit visible à l'écran.
//  · UN SEUL `<h1>` PAR PAGE, et il n'est pas vide (WCAG 1.3.1 / 2.4.6).
//  · LA 404 EST LA MÊME DES DEUX CÔTÉS. `404` (chemin littéral, réellement
//    prerendu en `404/index.html`) et `**` (filet client) doivent monter le MÊME
//    composant : SWA réécrit une URL inconnue vers `404/index.html`, où le routeur
//    reconstruit l'arbre de `**`. Deux composants différents = décalage
//    d'hydratation et erreur en console à chaque 404.
//
// L-012 : rien ici ne compare une constante à elle-même. Les chemins à rendre
// sont DÉDUITS de la table (toute route littérale ajoutée demain est couverte
// d'office), et ce qu'on vérifie ensuite est le DOM RÉELLEMENT RENDU par le vrai
// routeur — pas la valeur qu'on vient de lire dans le fichier.
// =============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TestBed } from '@angular/core/testing';
import { Route, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from './app.routes';
import { PageAVenir } from './core/layout/page-a-venir/page-a-venir';

/** Le nom du site, écrit à la main : chaque onglet doit l'identifier. */
const NOM_DU_SITE = 'Dr. Je-Sais-Tout';

/** Étiquette lisible d'une route dans un message d'échec. */
function nommer(route: Route): string {
  return `path: '${route.path ?? '(sans chemin)'}'`;
}

function estChaineNonVide(valeur: unknown): boolean {
  return typeof valeur === 'string' && valeur.trim() !== '';
}

/**
 * Les chemins que le prerenderer sait produire en fichiers : ni paramètre, ni
 * joker. Déduits de la table pour qu'une route ajoutée soit couverte sans que
 * personne n'y pense.
 */
const CHEMINS_LITTERAUX = routes
  .map((route) => route.path ?? '')
  .filter((chemin) => !chemin.includes(':') && !chemin.includes('*'));

function urlDe(chemin: string): string {
  return chemin === '' ? '/' : `/${chemin}`;
}

describe('table de routes', () => {
  describe('contrat de la table', () => {
    it('donne un `title` non vide à CHAQUE route', () => {
      // Un `title` peut aussi être une fonction de résolution ; ce site n'en
      // utilise pas encore, et une chaîne est la seule forme que la stratégie
      // par défaut applique sans code supplémentaire.
      const sansTitre = routes.filter((route) => !estChaineNonVide(route.title)).map(nommer);

      expect(sansTitre).toEqual([]);
    });

    it('donne un `data.titre` non vide à toute route servie par `PageAVenir`', () => {
      // C'est LA donnée dont dépend le `<h1>` de la page. Les routes de la 404
      // n'en portent pas, et c'est correct : `PageIntrouvable` ne lit RIEN de la
      // route — son titre est écrit dans son gabarit, précisément pour rendre la
      // même chose depuis ses deux points de montage.
      const routesAVenir = routes.filter((route) => route.component === PageAVenir);
      const sansTitreDeData = routesAVenir
        .filter((route) => !estChaineNonVide(route.data?.['titre']))
        .map(nommer);

      expect(routesAVenir.length).toBeGreaterThan(0);
      expect(sansTitreDeData).toEqual([]);
    });

    it('monte le MÊME composant sur `404` et sur `**`', () => {
      const litterale = routes.find((route) => route.path === '404');
      const joker = routes.find((route) => route.path === '**');

      expect(litterale?.component).toBeDefined();
      expect(joker?.component).toBe(litterale?.component);
    });

    it('n’a AUCUNE route paramétrée en E1 — elles ne seraient pas prerendues', () => {
      // Décision d'E1-ST2 : une route `:slug` sans `getPrerenderParams()` ne
      // produit aucun fichier, donc SWA sert `404/index.html` (statut 404) et le
      // routeur client monte un autre composant par-dessus — décalage
      // d'hydratation. E2-ST1 la réintroduira EN PRERENDER (voir
      // `app.routes.server.ts`) ; ce test doit alors être mis à jour sciemment,
      // pas contourné.
      expect(routes.filter((route) => (route.path ?? '').includes(':')).map(nommer)).toEqual([]);
    });

    it('ne déclare AUCUN `RenderMode.Client` côté serveur', () => {
      // L'autre extrémité du contrat, lue à sa source plutôt qu'importée : un
      // `import` d'`app.routes.server.ts` tirerait `@angular/ssr` dans le bundle
      // de test du navigateur. Avec `outputMode: "static"` il n'y a pas de
      // serveur : une entrée `Client` ne produit AUCUN fichier, elle promet un
      // rendu qui n'aura jamais lieu.
      const source = readFileSync(
        join(process.cwd(), 'src', 'app', 'app.routes.server.ts'),
        'utf8',
      );
      const modes = [...source.matchAll(/renderMode:\s*RenderMode\.(\w+)/g)].map(
        (correspondance) => correspondance[1],
      );

      expect(modes.length).toBeGreaterThan(0);
      expect(modes).not.toContain('Client');
    });
  });

  describe('rendu réel de chaque chemin littéral', () => {
    let titreOriginal: string;

    beforeEach(() => {
      titreOriginal = document.title;
      TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    });

    afterEach(() => {
      document.title = titreOriginal;
    });

    it('couvre bien les trois chemins livrés — sinon ce groupe ne teste rien', () => {
      // Garde-fou contre le vert vide (L-005) : si le filtre ci-dessus cessait de
      // trouver des chemins, la boucle suivante passerait sans rien vérifier.
      expect(CHEMINS_LITTERAUX).toEqual(['', 'cours/securite-web', '404']);
    });

    for (const chemin of CHEMINS_LITTERAUX) {
      it(`rend EXACTEMENT un « h1 » non vide et un titre d’onglet sur « ${urlDe(chemin)} »`, async () => {
        const harnais = await RouterTestingHarness.create();

        await harnais.navigateByUrl(urlDe(chemin));

        const rendu = harnais.routeNativeElement;
        const titres = rendu?.querySelectorAll('h1') ?? [];

        expect(titres.length).toBe(1);
        expect(titres[0]?.textContent?.trim()).not.toBe('');
        // Le titre d'onglet est appliqué par la stratégie par défaut du routeur :
        // on le lit sur `document`, pas dans la table — c'est l'EFFET qui compte.
        expect(document.title).toContain(NOM_DU_SITE);
      });
    }

    it('rend la MÊME page 404 sur `/404` et sur une URL inconnue', async () => {
      // La preuve côté DOM du contrat vérifié plus haut sur la table : c'est ce
      // que SWA fait en vrai (réécriture vers `404/index.html`, puis
      // reconstruction de l'arbre de `**` par le routeur client).
      const harnais = await RouterTestingHarness.create();

      const surLaRouteLitterale = await harnais.navigateByUrl('/404');
      const titreLitteral = harnais.routeNativeElement?.querySelector('h1')?.textContent?.trim();

      const surUneUrlInconnue = await harnais.navigateByUrl('/une-adresse-qui-n-existe-pas');
      const titreJoker = harnais.routeNativeElement?.querySelector('h1')?.textContent?.trim();

      expect(surLaRouteLitterale?.constructor).toBe(surUneUrlInconnue?.constructor);
      expect(titreLitteral).not.toBe('');
      expect(titreJoker).toBe(titreLitteral);
    });
  });
});
