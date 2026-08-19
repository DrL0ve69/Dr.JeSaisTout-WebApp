// =============================================================================
// Tests de PageSommaireSecuriteWeb — l'adaptateur de route du sommaire
// -----------------------------------------------------------------------------
// Ce fichier tient TROIS choses, et rien d'autre :
//
//  1. LE SUJET RÉELLEMENT TRANSMIS. C'est la seule raison d'être du composant, et
//     c'est aussi le seul endroit où le câblage peut casser en silence : le
//     routeur n'a pas `withComponentInputBinding()` (décision d'`app.config.ts`),
//     donc un `sujet` absent ou faux ne lève RIEN — il rend un sommaire vide ou,
//     pire, le sommaire d'un autre cours. Le test est écrit pour MOURIR sur les
//     deux mutations possibles : `sujet="securite-web"` → `"php"` (mauvais cours)
//     et `sujet` retiré du gabarit (aucun cours). Le manifeste de test porte donc
//     DEUX sujets aux titres distincts — avec un seul, remplacer la valeur par
//     n'importe quelle autre laisserait le test vert sur une liste vide.
//
//  2. L'UNIQUE `<h1>` NON VIDE. C'est ce qui REMPLACE l'ancien test
//     `routesAVenir` d'`app.routes.spec.ts`, supprimé avec `PageAVenir` : le
//     défaut qu'il gardait (un `<h1>` vide livré en silence faute de `data.titre`)
//     n'existe plus sous la même forme — le titre est un littéral du gabarit —
//     mais il resterait possible de le supprimer ou de le rétrograder en `<h2>`,
//     et `Sommaire` ne fournit AUCUN `<h1>` de remplacement (il commence au
//     `<h2>` de section). WCAG 1.3.1 / 2.4.6.
//
//  3. RIEN DE L'URL N'ENTRE DANS LA PAGE. Bloc HÉRITÉ de `page-a-venir.spec.ts`,
//     supprimé avec `PageAVenir` : il gardait cette règle sur le composant alors
//     monté sur `cours/securite-web`, et c'est `PageSommaireSecuriteWeb` qui l'est
//     aujourd'hui. Le test d'`app.routes.spec.ts` qui l'a « remplacé » porte sur
//     `route.data`, PAS sur `paramMap` : ce n'est pas le même invariant, et sans ce
//     bloc la règle — écrite trois fois dans le dépôt (`app.routes.server.ts`,
//     `navigation-lecon.ts`, `resoudre-lecon.ts`) — n'avait plus AUCUN exécutant.
//     Elle tient aujourd'hui par construction (ni `Sommaire` ni cette page
//     n'injectent `ActivatedRoute`) ; c'est précisément pour ça qu'elle a besoin
//     d'un gate plutôt que d'une note.
//
// L-012 : rien ici ne compare une constante à elle-même. Les titres attendus sont
// écrits dans le manifeste de test, ci-dessous, et relus sur le DOM rendu.
// =============================================================================

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, convertToParamMap, provideRouter } from '@angular/router';

import { MANIFESTE_LECONS } from '../contenu-compile';
import { PageSommaireSecuriteWeb } from './page-sommaire-securite-web';
import { Sommaire } from './sommaire';

/**
 * Deux cours publiés, aux titres sans recouvrement possible.
 *
 * Le second n'est pas décoratif : c'est lui qui rend le test sensible à la
 * mutation « mauvais sujet ». Sans lui, `sujet="php"` produirait une liste vide,
 * qu'une assertion sur les seuls titres de sécurité pourrait laisser passer.
 */
const MANIFESTE: readonly EntreeManifesteRoutes[] = [
  {
    sujet: 'securite-web',
    slug: 'xss',
    ordre: 1,
    titre: 'Le XSS',
    dureeEstimee: 20,
    // `cegep`, PAS `debutant` : l'énumération du contrat est
    // `maternelle | primaire | secondaire | cegep | universite` (`NIVEAUX`, dans
    // `../contenu-compile`). Une fixture hors contrat neutralise en silence le gate
    // qu'elle est censée exercer — même patron que les clefs `debutant`/`avance`
    // qui avaient fait afficher « cegep » au sommaire (L-016).
    niveau: 'cegep',
    statut: 'publiee',
  },
  {
    sujet: 'php',
    slug: 'variables',
    ordre: 1,
    titre: 'Les variables',
    dureeEstimee: 12,
    niveau: 'cegep',
    statut: 'publiee',
  },
];

async function rendre(): Promise<ComponentFixture<PageSommaireSecuriteWeb>> {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: MANIFESTE_LECONS, useValue: MANIFESTE }],
  });

  const fixture = TestBed.createComponent(PageSommaireSecuriteWeb);
  await fixture.whenStable();
  return fixture;
}

function hote(fixture: ComponentFixture<PageSommaireSecuriteWeb>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe('PageSommaireSecuriteWeb', () => {
  it('transmet le sujet « securite-web » au sommaire, lu sur le composant enfant', async () => {
    const fixture = await rendre();

    // L'input tel que l'enfant le VOIT. Un `sujet` retiré du gabarit ferait
    // échouer la lecture du signal requis ; une autre valeur échouerait ici.
    const enfant = fixture.debugElement.query(By.directive(Sommaire));

    expect(enfant).not.toBeNull();
    expect((enfant.componentInstance as Sommaire).sujet()).toBe('securite-web');
  });

  it('rend les modules de la sécurité web et AUCUN module d’un autre cours', async () => {
    const fixture = await rendre();
    const titres = [...hote(fixture).querySelectorAll('.module .titre')].map((noeud) =>
      noeud.textContent?.trim(),
    );

    // Le sens « le bon cours est là »…
    expect(titres).toContain('Le XSS');
    // …et le sens « l'autre n'y est pas », qui est celui que la mutation
    // `sujet="php"` fait tomber.
    expect(titres).not.toContain('Les variables');
  });

  it('rend EXACTEMENT un « h1 » non vide, et le sommaire n’en fournit aucun', async () => {
    const fixture = await rendre();
    const titres = hote(fixture).querySelectorAll('h1');

    expect(titres.length).toBe(1);
    expect(titres[0]?.textContent?.trim()).not.toBe('');
  });

  describe('rien de l’URL n’entre dans la page', () => {
    it('ne lit AUCUN paramètre d’URL, et l’espion le PROUVE (contrôle positif)', async () => {
      // LA RÈGLE, ET SA RAISON, vivent dans l'en-tête d'`app.routes.server.ts` :
      // réafficher un segment d'URL fait écrire au site, sous son propre domaine, la
      // phrase d'un tiers (`/cours/…/appelez-le-1-800-…`). Ce n'est pas une question
      // d'échappement — Angular échappe déjà —, c'est une question de qui RÉDIGE le
      // texte. Même raisonnement que le refus de `withComponentInputBinding()`
      // (`app.config.ts`).
      //
      // ASSERTION SUR L'ACCÈS, PAS SUR LE RENDU : un composant qui se remettrait à
      // lire `paramMap` rougit ici, alors qu'un test « le slug ne s'affiche pas »
      // resterait vert tant que la valeur transiterait sans être imprimée.
      //
      // ⚠️ PORTÉE EXACTE, héritée de la mesure faite sur `PageAVenir` : un
      // `computed()` qui lirait `paramMap` sans que le gabarit l'affiche ne fait PAS
      // rougir — les signaux sont paresseux, la lecture n'a jamais lieu. C'est le bon
      // périmètre (ce qui n'est jamais évalué n'entre pas dans la page), mais ce n'est
      // pas « personne n'écrit `paramMap` dans ce fichier ».
      TestBed.configureTestingModule({
        providers: [provideRouter([]), { provide: MANIFESTE_LECONS, useValue: MANIFESTE }],
      });

      // L'espion est posé sur la route RÉELLE du routeur de test — celle que le
      // composant recevrait s'il injectait `ActivatedRoute` — et non sur un objet
      // parallèle qu'aucune injection n'atteindrait (ce serait un no-op silencieux).
      const route = TestBed.inject(ActivatedRoute);
      const parametresLus: string[] = [];
      // Une carte NON VIDE : un espion branché sur zéro paramètre laisserait planer le
      // doute sur ce que le contrôle positif ci-dessous mesure vraiment.
      const reelle = convertToParamMap({ slug: 'un-slug-que-personne-ne-doit-lire' });
      const espion: ParamMap = {
        get keys(): string[] {
          return reelle.keys;
        },
        has: (nom: string) => {
          parametresLus.push(nom);
          return reelle.has(nom);
        },
        get: (nom: string) => {
          parametresLus.push(nom);
          return reelle.get(nom);
        },
        getAll: (nom: string) => {
          parametresLus.push(nom);
          return reelle.getAll(nom);
        },
      };
      // `snapshot.paramMap` est un accesseur du prototype : une propriété PROPRE le
      // masque, sans toucher aux internes privés du routeur.
      Object.defineProperty(route.snapshot, 'paramMap', { value: espion, configurable: true });

      const fixture = TestBed.createComponent(PageSommaireSecuriteWeb);
      await fixture.whenStable();

      expect(parametresLus).toEqual([]);

      // 🔴 CONTRÔLE POSITIF (L-019) — sans lui, ce test passerait tout aussi vert s'il
      // n'observait RIEN. On fabrique la lecture que le composant ne fait pas, sur la
      // route qu'il aurait reçue, et l'espion doit la voir.
      expect(TestBed.inject(ActivatedRoute).snapshot.paramMap.get('slug')).toBe(
        'un-slug-que-personne-ne-doit-lire',
      );
      expect(parametresLus).toEqual(['slug']);
    });
  });
});
