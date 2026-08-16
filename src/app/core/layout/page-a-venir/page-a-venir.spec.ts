// =============================================================================
// Tests de PageAVenir — le placeholder des routes annoncées avant d'exister
// (depuis E1-ST3, seul `/cours/securite-web` ; `/` est servie par `Accueil`)
// -----------------------------------------------------------------------------
// Ce composant n'a qu'une seule logique, mais c'est la plus facile à casser en
// silence : il lit son texte dans la DÉFINITION DE LA ROUTE. Un `data.titre`
// oublié au câblage rendrait un `<h1>` vide, et rien ne serait rouge.
//
// L-012 appliqué : la route de test fournit un titre CHOISI ICI, jamais importé
// du composant. Un test qui comparerait `h1` à une constante venue du composant
// resterait vert même si le composant cessait de lire la route.
//
// L-010 appliqué : le `<h1>` alimenté par `data.titre` a été vérifié par mutation
// (source cassé exprès, test constaté ROUGE, source remis).
// =============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { PageAVenir } from './page-a-venir';

/**
 * Une `ActivatedRoute` minimale : le composant ne touche que `snapshot.data` et
 * `snapshot.paramMap`. Un objet partiel dit exactement quelle surface de l'API
 * du routeur ce composant s'autorise — un vrai `ActivatedRoute` ne se construit
 * pas à la main, et `provideRouter` + navigation coûterait un cycle complet du
 * routeur pour vérifier deux lectures.
 */
function routeDeTest(donnees: Record<string, unknown>): ActivatedRoute {
  return {
    snapshot: {
      data: donnees,
      // Un `paramMap` NON VIDE alors que le composant ne doit rien y lire : c'est
      // ce qui donne sa force au cas « rien de l'URL n'entre dans la page ». Une
      // carte vide rendrait cette assertion vraie par accident.
      paramMap: convertToParamMap({ slug: 'un-slug-que-personne-ne-doit-lire' }),
    },
  } as unknown as ActivatedRoute;
}

async function rendre(donnees: Record<string, unknown>): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [{ provide: ActivatedRoute, useValue: routeDeTest(donnees) }],
  });
  const fixture = TestBed.createComponent(PageAVenir);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

/** Le source du composant, lu au disque — pour les interdits de forme. */
function sourceDuComposant(): string {
  return readFileSync(
    join(process.cwd(), 'src', 'app', 'core', 'layout', 'page-a-venir', 'page-a-venir.ts'),
    'utf8',
  );
}

describe('PageAVenir', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('titre', () => {
    it('rend EXACTEMENT un `h1`, alimenté par `data.titre` de la route', async () => {
      // Le titre est arbitraire et n'existe nulle part dans le composant : c'est
      // la seule façon de prouver que la valeur vient bien de la route.
      const rendu = await rendre({ titre: 'Titre venu de la route, choisi par le test' });

      expect(rendu.querySelectorAll('h1').length).toBe(1);
      expect(rendu.querySelector('h1')?.textContent).toContain(
        'Titre venu de la route, choisi par le test',
      );
    });

    it('ÉCHOUE bruyamment quand `data.titre` manque, au lieu de rendre un `h1` vide', () => {
      // Le comportement par défaut d'Angular ici serait le silence : `data` est
      // un dictionnaire non typé, `undefined` s'interpole en chaîne vide. Un
      // `<h1></h1>` prerendu est une violation de 1.3.1 livrée sans bruit — on
      // préfère faire échouer le prerender de la route fautive.
      TestBed.configureTestingModule({
        providers: [{ provide: ActivatedRoute, useValue: routeDeTest({}) }],
      });
      const fixture = TestBed.createComponent(PageAVenir);

      expect(() => fixture.componentInstance.titre()).toThrowError(/data\.titre/);
    });

    it('refuse aussi un `data.titre` vide ou fait d’espaces', () => {
      for (const titre of ['', '   ', 42, null]) {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [{ provide: ActivatedRoute, useValue: routeDeTest({ titre }) }],
        });
        const fixture = TestBed.createComponent(PageAVenir);

        expect(
          () => fixture.componentInstance.titre(),
          `titre : ${JSON.stringify(titre)}`,
        ).toThrow();
      }
    });
  });

  describe('description', () => {
    it('rend la description fournie par la route', async () => {
      const rendu = await rendre({
        titre: 'Un titre',
        description: 'Un chapô choisi par le test.',
      });

      expect(rendu.querySelector('.accroche')?.textContent).toContain(
        'Un chapô choisi par le test.',
      );
    });

    it('ne rend AUCUN paragraphe quand la description est absente', async () => {
      // Un `<p>` vide n'est pas visible mais reste annoncé par certains lecteurs
      // d'écran, et il ferait dériver le rythme vertical du feuillet.
      const rendu = await rendre({ titre: 'Un titre' });

      expect(rendu.querySelector('.accroche')).toBeNull();
      // La faute jumelle : interpoler `undefined` et publier « undefined ».
      expect(rendu.textContent).not.toContain('undefined');
    });
  });

  // La table de routes d'E1 ne monte plus AUCUN chemin paramétré (cf.
  // `app.routes.server.ts`), et ce composant ne lit donc plus rien de l'URL. Le
  // cas ci-dessous n'est pas un vestige : il verrouille CETTE propriété, qui est
  // une règle de sécurité et pas une conséquence de la table de routes du jour.
  describe('rien de l’URL n’entre dans la page', () => {
    it('ne lit AUCUN paramètre d’URL — seulement la définition de la route', async () => {
      // La règle, et sa raison, vivent dans l'en-tête d'`app.routes.server.ts` :
      // réafficher un segment d'URL fait écrire au site, sous son propre domaine,
      // la phrase d'un tiers (`/cours/…/appelez-le-1-800-…`). Ce n'est pas une
      // question d'échappement — Angular échappe déjà —, c'est une question de
      // qui rédige le texte. Même raisonnement que le refus de
      // `withComponentInputBinding()` (`app.config.ts`).
      //
      // Assertion sur l'ACCÈS, pas sur le rendu : le jour où E2-ST1 réintroduira
      // `:slug`, un composant qui se remettrait à lire `paramMap` rougira ici,
      // alors qu'un test « le slug ne s'affiche pas » resterait vert tant que la
      // valeur transiterait sans être imprimée.
      //
      // ⚠️ SA PORTÉE EXACTE, mesurée par mutation et pas supposée : un `computed()`
      // qui lirait `paramMap` sans que le gabarit l'affiche ne le fait PAS rougir —
      // les signaux sont paresseux, la lecture n'a jamais lieu. Vérifié : mutation
      // « computed seul » → 151 verts ; mutation « computed AFFICHÉ » → rouge
      // (`expected [ 'slug' ] to deeply equal []`). C'est le bon périmètre — ce qui
      // n'est jamais évalué n'entre pas dans la page — mais ce n'est pas
      // « personne n'écrit `paramMap` dans ce fichier ».
      const parametresLus: string[] = [];
      const route = {
        snapshot: {
          data: { titre: 'Une leçon' },
          paramMap: convertToParamMap({ slug: 'injection-sql' }),
        },
      } as unknown as ActivatedRoute;
      const paramMap = route.snapshot.paramMap;
      const getReel = paramMap.get.bind(paramMap);
      paramMap.get = (nom: string) => {
        parametresLus.push(nom);
        return getReel(nom);
      };

      TestBed.configureTestingModule({
        providers: [{ provide: ActivatedRoute, useValue: route }],
      });
      const fixture = TestBed.createComponent(PageAVenir);
      await fixture.whenStable();

      expect(parametresLus).toEqual([]);
    });
  });

  describe('interdits de forme', () => {
    it('ne fait AUCUN rendu HTML brut ni contournement de la sécurité Angular', () => {
      // Vérifié sur le SOURCE et non sur le DOM : un `[innerHTML]` introduit
      // demain sur une branche jamais rendue par ces tests passerait autrement
      // inaperçu. Contenu non validé + `innerHTML` = la faille que ce site
      // enseigne (`.claude/rules/security.md` §4).
      const source = sourceDuComposant();

      expect(source).not.toContain('innerHTML');
      expect(source).not.toContain('bypassSecurityTrust');
    });

    it('ne pose pas `standalone: true` (défaut depuis Angular 20)', () => {
      expect(sourceDuComposant()).not.toContain('standalone');
    });
  });
});
