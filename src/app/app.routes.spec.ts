// =============================================================================
// Tests de la TABLE DE ROUTES — le contrat que deux composants de coquille
// tiennent pour toutes les pages du site
// -----------------------------------------------------------------------------
// Ce que ce fichier protège, et qu'aucun autre ne peut protéger :
//
//  · CHAQUE PAGE A UN TITRE DE DOCUMENT. Un `title:` oublié laisse le titre de la
//    page PRÉCÉDENTE dans l'onglet après une navigation cliente — WCAG 2.4.2
//    décroche sans que rien ne soit visible à l'écran.
//  · UN SEUL `<h1>` PAR PAGE, et il n'est pas vide (WCAG 1.3.1 / 2.4.6). C'est le
//    seul garde-fou qui reste sur ce point depuis E2-ST6, et c'est voulu : le test
//    `routesAVenir` qui vivait ici vérifiait qu'une route de `PageAVenir` portait
//    bien son `data.titre` — un composant supprimé avec ce lot, et une donnée de
//    route que plus AUCUNE route ne porte. Chaque page écrit désormais son `<h1>`
//    dans son gabarit ; ce qui reste à garder n'est plus le câblage, c'est
//    l'EFFET, et le groupe « rendu réel » ci-dessous le mesure sur le DOM.
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
      // DEUX formes sont admises, et la stratégie par défaut du routeur les
      // applique toutes les deux : une chaîne littérale, ou un `ResolveFn<string>`.
      // La route de leçon emploie la seconde depuis E2-ST2 — son titre vient du
      // front-matter, donc du manifeste. Ce que ce résolveur RETOURNE se vérifie
      // sur des données réelles dans `lecon.spec.ts` ; ici on ne tient que le
      // contrat de la table.
      const sansTitre = routes
        .filter((route) => !estChaineNonVide(route.title) && typeof route.title !== 'function')
        .map(nommer);

      expect(sansTitre).toEqual([]);
      // Contrôle positif des deux formes : sans lui, ce filtre resterait vert sur
      // une table où plus aucune route n'aurait de titre du tout (L-019).
      expect(routes.filter((route) => typeof route.title === 'string').length).toBeGreaterThan(0);
      expect(routes.filter((route) => typeof route.title === 'function').length).toBe(1);
    });

    it('ne fait dépendre AUCUN `<h1>` d’un `data` de route', () => {
      // Ce test REMPLACE `routesAVenir`, supprimé avec `PageAVenir` (E2-ST6). Il
      // ne garde pas la même chose, et c'est le point : l'ancien vérifiait qu'une
      // route de placeholder portait bien le `data.titre` dont son `<h1>`
      // dépendait ; celui-ci verrouille la propriété qui a rendu ce couplage
      // inutile — plus aucune route ne transmet de contenu de page. Un `data`
      // réintroduit ici serait soit lu par un composant (retour du `<h1>` vide en
      // silence), soit lu par personne (du code mort qu'une revue prendrait pour
      // un contrat). Les deux se corrigent au même endroit : le gabarit.
      const avecData = routes.filter((route) => route.data !== undefined).map(nommer);

      expect(avecData).toEqual([]);
      // Contrôle positif (L-019) : sans lui, ce filtre resterait vert sur une
      // table vide, ou sur une table dont plus aucune entrée n'est une route.
      expect(routes.length).toBeGreaterThan(0);
    });

    it('monte le MÊME composant sur `404` et sur `**`', () => {
      const litterale = routes.find((route) => route.path === '404');
      const joker = routes.find((route) => route.path === '**');

      expect(litterale?.component).toBeDefined();
      expect(joker?.component).toBe(litterale?.component);
    });

    it('déclare la route de leçon paramétrée DES DEUX CÔTÉS, en prerender paramétré', () => {
      // MISE À JOUR SCIEMMENT (E2-ST2, lot B) de l'ancien test « aucune route
      // paramétrée en E1 ». Le défaut qu'il protégeait n'a pas disparu, il a changé
      // de forme : une route `:slug` déclarée côté client SANS pendant serveur en
      // `Prerender` + `getPrerenderParams()` ne produit AUCUN fichier, donc SWA sert
      // `404/index.html` (statut 404) et le routeur client monte une leçon
      // par-dessus — décalage d'hydratation, exactement ce qui l'avait fait retirer.
      //
      // Le côté serveur est lu À SA SOURCE, comme le test voisin : importer
      // `app.routes.server.ts` tirerait `@angular/ssr` dans le bundle de test du
      // navigateur. Ce que `getPrerenderParams()` RETOURNE (les slugs du manifeste)
      // est vérifié sur des données réelles par `lecon.spec.ts` — ici on tient le
      // câblage, là-bas le contenu.
      const parametrees = routes.filter((route) => (route.path ?? '').includes(':'));
      expect(parametrees.map(nommer)).toEqual(["path: 'cours/securite-web/:slug'"]);

      // Elle doit précéder le `**` : le routeur prend le premier motif qui
      // correspond, et un joker placé avant avalerait toutes les leçons.
      const rangLecon = routes.findIndex((route) => route.path === 'cours/securite-web/:slug');
      const rangJoker = routes.findIndex((route) => route.path === '**');
      expect(rangLecon).toBeGreaterThan(-1);
      expect(rangLecon).toBeLessThan(rangJoker);

      // Son contenu est chargé par un `resolve` de route, pas par le composant :
      // sans lui, le prerenderer écrirait un fichier avant que la leçon n'arrive.
      expect(parametrees[0]?.resolve?.['lecon']).toBeDefined();

      const source = readFileSync(join(process.cwd(), 'src', 'app', 'app.routes.server.ts'), 'utf8');
      const rangServeurLecon = source.indexOf("path: 'cours/securite-web/:slug'");
      const rangServeurJoker = source.indexOf("path: '**'");
      expect(rangServeurLecon).toBeGreaterThan(-1);
      expect(rangServeurLecon).toBeLessThan(rangServeurJoker);
      expect(source).toContain('getPrerenderParams');
      // La forme exacte qui échouerait en silence : `Prerender` SANS paramètres.
      // `@angular/ssr` refuse ce cas au build, mais le message n'arrive qu'au bout
      // du gate le plus lent — ici, c'est rouge en deux secondes.
      expect(source.slice(rangServeurLecon, rangServeurJoker)).toContain('RenderMode.Prerender');
      expect(source.slice(rangServeurLecon, rangServeurJoker)).toContain('getPrerenderParams');
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
