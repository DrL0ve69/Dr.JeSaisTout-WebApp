// =============================================================================
// Tests de PageSommairePhp — l'adaptateur de route du sommaire du second cours
// -----------------------------------------------------------------------------
// Même contrat que `page-sommaire-securite-web.spec.ts`, dont l'en-tête porte le
// raisonnement complet ; ce fichier tient les deux points où CET adaptateur peut
// casser en silence :
//
//  1. LE SUJET RÉELLEMENT TRANSMIS. Un `sujet="securite-web"` recopié depuis
//     l'adaptateur voisin rendrait, sous `/cours/php`, le sommaire du cours de
//     sécurité — et rien d'autre ne rougirait. Le manifeste de test porte donc DEUX
//     sujets aux titres distincts, et les deux sens sont assertés.
//  2. L'UNIQUE `<h1>` NON VIDE, qui NOMME CE COURS — le titre est un littéral de
//     l'adaptateur, passé au cadre ; le cadre ne le fabrique pas.
//
// Et un troisième, propre à l'ouverture d'un cours sans module : sans leçon PHP
// publiée, la page rend l'état « Modules en préparation. », jamais un sommaire vide
// muet ni celui d'un autre cours.
//
// L-012 : les titres attendus sont écrits dans le manifeste de test et relus sur le
// DOM rendu ; rien ne compare une constante à elle-même.
// =============================================================================

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { MANIFESTE_LECONS } from '../contenu-compile';
import { PageSommairePhp } from './page-sommaire-php';
import { Sommaire } from './sommaire';

const LECON_SECURITE: EntreeManifesteRoutes = {
  sujet: 'securite-web',
  slug: 'xss',
  ordre: 1,
  titre: 'Le XSS',
  dureeEstimee: 20,
  niveau: 'cegep',
  statut: 'publiee',
};

const LECON_PHP: EntreeManifesteRoutes = {
  sujet: 'php',
  slug: 'variables',
  ordre: 1,
  titre: 'Les variables',
  dureeEstimee: 12,
  niveau: 'cegep',
  statut: 'publiee',
};

async function rendre(
  manifeste: readonly EntreeManifesteRoutes[],
): Promise<ComponentFixture<PageSommairePhp>> {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: MANIFESTE_LECONS, useValue: manifeste }],
  });

  const fixture = TestBed.createComponent(PageSommairePhp);
  await fixture.whenStable();
  return fixture;
}

function hote(fixture: ComponentFixture<PageSommairePhp>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function titresDeModules(fixture: ComponentFixture<PageSommairePhp>): (string | undefined)[] {
  return [...hote(fixture).querySelectorAll('.module .titre')].map((noeud) =>
    noeud.textContent?.trim(),
  );
}

describe('PageSommairePhp', () => {
  it('transmet le sujet « php » au sommaire, lu sur le composant enfant', async () => {
    const fixture = await rendre([LECON_SECURITE, LECON_PHP]);
    const enfant = fixture.debugElement.query(By.directive(Sommaire));

    expect(enfant).not.toBeNull();
    expect((enfant.componentInstance as Sommaire).sujet()).toBe('php');
  });

  it('rend les modules de PHP et AUCUN module du cours de sécurité', async () => {
    const titres = titresDeModules(await rendre([LECON_SECURITE, LECON_PHP]));

    expect(titres).toContain('Les variables');
    // Le sens que la mutation `sujet="securite-web"` fait tomber.
    expect(titres).not.toContain('Le XSS');
  });

  it('rend EXACTEMENT un « h1 », et il nomme le cours de PHP', async () => {
    const titres = hote(await rendre([LECON_PHP])).querySelectorAll('h1');

    expect(titres.length).toBe(1);
    expect(titres[0]?.textContent?.trim()).toBe('Développement d’application en PHP');
  });

  it('annonce « Modules en préparation. » tant qu’aucun module de PHP n’est publié', async () => {
    // L'état RÉEL du dépôt à l'ouverture du cours (D-PHP-2) : des leçons publiées
    // existent, mais toutes dans l'autre cours. Aucune ne doit fuiter ici.
    const fixture = await rendre([LECON_SECURITE]);

    expect(titresDeModules(fixture)).toEqual([]);
    expect(hote(fixture).querySelector('.vide')?.textContent?.trim()).toBe(
      'Modules en préparation.',
    );
  });
});
