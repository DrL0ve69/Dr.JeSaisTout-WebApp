// =============================================================================
// Tests de PageIntrouvable — la 404
// -----------------------------------------------------------------------------
// Trois choses seulement, mais ce sont les trois qu'une 404 rate le plus souvent :
// un titre de premier niveau (et un seul), une sortie vers l'accueil, et aucune
// dépendance à la route — le composant est monté à DEUX endroits (`path: '404'`,
// littéral et réellement prerendu, et `path: '**'` pour la navigation client).
//
// `provideRouter([])` est nécessaire malgré l'absence de navigation : c'est le
// routeur qui transforme `routerLink="/"` en attribut `href`. Sans lui, le lien
// existerait dans le DOM sans destination — exactement le défaut qu'on vérifie.
// =============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PageIntrouvable } from './page-introuvable';

async function rendre(): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(PageIntrouvable);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function sourceDuComposant(): string {
  return readFileSync(
    join(process.cwd(), 'src', 'app', 'core', 'layout', 'page-introuvable', 'page-introuvable.ts'),
    'utf8',
  );
}

describe('PageIntrouvable', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('annonce l’erreur avec un `h1`, et un seul', async () => {
    const rendu = await rendre();

    expect(rendu.querySelectorAll('h1').length).toBe(1);
    expect(rendu.querySelector('h1')?.textContent).toContain('Page introuvable');
  });

  it('explique la situation en français, sans jargon de code d’état', async () => {
    const rendu = await rendre();

    expect(rendu.querySelector('.accroche')?.textContent).toContain('ne correspond à aucune page');
  });

  it('offre une sortie : un lien RÉSOLU vers l’accueil', async () => {
    // Une 404 sans issue est un cul-de-sac. On vérifie l'attribut `href`
    // effectivement calculé, pas la seule présence de la directive : un
    // `routerLink` mal orthographié laisserait un `<a>` sans destination.
    const rendu = await rendre();

    const lien = rendu.querySelector<HTMLAnchorElement>('a[routerLink]');
    expect(lien).not.toBeNull();
    expect(lien?.getAttribute('href')).toBe('/');
    expect(lien?.textContent?.trim()).toBe('Retour à l’accueil');
  });

  it('ne lit RIEN de la route — il doit rendre pareil sous `404` et sous `**`', () => {
    // `ActivatedRoute` n'est volontairement pas fourni ci-dessus dans les autres
    // tests non plus : si le composant en injectait un jour un, ces tests
    // lèveraient. Ici on le dit explicitement sur le source, pour que
    // l'intention survive à une refonte des tests.
    const source = sourceDuComposant();

    expect(source).not.toContain('ActivatedRoute');
    expect(source).not.toContain('inject(');
  });

  it('ne fait AUCUN rendu HTML brut ni contournement de la sécurité Angular', () => {
    const source = sourceDuComposant();

    expect(source).not.toContain('innerHTML');
    expect(source).not.toContain('bypassSecurityTrust');
  });
});
