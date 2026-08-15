// =============================================================================
// Tests d'EnTete — le squelette de navigation du site
// -----------------------------------------------------------------------------
// Trois choses que seul un test tient dans le temps :
//
//  1. L'ABSENCE DE `<h1>`. Chaque page routée porte déjà son unique `<h1>` ; un
//     second dans l'en-tête en mettrait deux sur TOUTES les pages d'un coup.
//     C'est exactement le genre d'« amélioration » qu'un contributeur pressé
//     ajoute au logotype, et rien à l'œil nu ne le distingue d'un `<a>` stylé.
//  2. L'ÉTAT ACTIF EXPOSÉ. `routerLinkActive` ne pose qu'une classe CSS, qu'aucun
//     lecteur d'écran ne perçoit. C'est `aria-current="page"` qui l'annonce.
//  3. LA CORRESPONDANCE EXACTE DU LIEN D'ACCUEIL. Sans
//     `[routerLinkActiveOptions]="{ exact: true }"`, « / » est actif par PRÉFIXE
//     sur toutes les routes : deux liens porteraient `aria-current="page"` en même
//     temps. Le test « une seule page courante » ci-dessous est précisément celui
//     qui devient rouge si l'option disparaît.
//
// ⚠️ LE HARNAIS DE ROUTES EST VOLONTAIREMENT INDÉPENDANT DE `app.routes.ts`.
// Ces routes sans composant suffisent à faire changer l'URL et n'exigent aucun
// `<router-outlet>` — la fixture ne rend que l'en-tête, sans monter la moindre
// page. Ne PAS les remplacer par la vraie table : ce fichier vérifie le
// comportement de l'en-tête face à une URL, pas le câblage des routes (c'est
// `app.routes.spec.ts` qui tient ce contrat-là).
// =============================================================================

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, Routes, provideRouter } from '@angular/router';

import { ATTRIBUT_THEME } from '../../theme/theme';
import { EnTete } from './en-tete';

/** Harnais de routes : de quoi faire changer l'URL, rien de plus. */
const ROUTES_HARNAIS: Routes = [
  { path: '', children: [] },
  { path: 'cours/securite-web', children: [] },
];

function liens(fixture: ComponentFixture<EnTete>): HTMLAnchorElement[] {
  const hote = fixture.nativeElement as HTMLElement;
  return [...hote.querySelectorAll<HTMLAnchorElement>('nav a')];
}

/** Le texte des liens de navigation qui s'annoncent comme page courante. */
function pagesCourantes(fixture: ComponentFixture<EnTete>): string[] {
  return liens(fixture)
    .filter((lien) => lien.getAttribute('aria-current') === 'page')
    .map((lien) => (lien.textContent ?? '').trim());
}

async function creerSur(url: string): Promise<ComponentFixture<EnTete>> {
  const fixture = TestBed.createComponent(EnTete);
  await TestBed.inject(Router).navigateByUrl(url);
  await fixture.whenStable();
  return fixture;
}

describe('EnTete', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute(ATTRIBUT_THEME);
    TestBed.configureTestingModule({
      imports: [EnTete],
      providers: [provideRouter(ROUTES_HARNAIS)],
    });
  });

  afterEach(() => {
    // La bascule composée dans l'en-tête instancie le `ThemeService`, qui écrit
    // sur `<html>` — élément partagé par tout le run.
    document.documentElement.removeAttribute(ATTRIBUT_THEME);
    window.localStorage.clear();
  });

  describe('structure', () => {
    it('rend un `<header>` et N’AJOUTE AUCUN `<h1>`', async () => {
      // Le logotype est un lien vers l'accueil, jamais un titre : le plan de
      // titres appartient à la page routée.
      const fixture = await creerSur('/');
      const hote = fixture.nativeElement as HTMLElement;

      expect(hote.querySelector('header')).not.toBeNull();
      expect(hote.querySelectorAll('h1').length).toBe(0);
      expect(hote.querySelectorAll('h1, h2, h3, h4, h5, h6').length).toBe(0);
    });

    it('donne au logotype un lien vers l’accueil', async () => {
      const fixture = await creerSur('/cours/securite-web');
      const hote = fixture.nativeElement as HTMLElement;

      const logotype = hote.querySelector<HTMLAnchorElement>('header > a');

      expect(logotype?.getAttribute('href')).toBe('/');
      expect(logotype?.textContent).toContain('Je-Sais-Tout');
    });

    it('nomme la navigation, pour la distinguer des futurs autres `<nav>`', async () => {
      // Un site en aura plusieurs (fil d'Ariane, sommaire de module) : un `<nav>`
      // sans nom laisse le visiteur choisir entre « navigation » et « navigation ».
      const fixture = await creerSur('/');
      const hote = fixture.nativeElement as HTMLElement;

      const nav = hote.querySelector('nav');

      expect(nav?.getAttribute('aria-label')).toBe('Navigation principale');
    });

    it('expose exactement les deux destinations de la phase 1', async () => {
      const fixture = await creerSur('/');

      expect(liens(fixture).map((lien) => lien.getAttribute('href'))).toEqual([
        '/',
        '/cours/securite-web',
      ]);
      expect(liens(fixture).map((lien) => (lien.textContent ?? '').trim())).toEqual([
        'Accueil',
        'Sécurité des applications web',
      ]);
    });

    it('compose la bascule de thème DANS l’en-tête', async () => {
      // Elle vit ici, pas dans `App` : c'est là qu'un visiteur la cherche. On
      // vérifie qu'elle est bien RENDUE (le fieldset), pas seulement déclarée.
      const fixture = await creerSur('/');
      const hote = fixture.nativeElement as HTMLElement;

      expect(hote.querySelector('header app-bascule-theme fieldset')).not.toBeNull();
    });
  });

  describe('page courante annoncée', () => {
    it('marque « Accueil » sur `/`', async () => {
      const fixture = await creerSur('/');

      expect(pagesCourantes(fixture)).toEqual(['Accueil']);
    });

    it('marque le cours — et UNE SEULE page courante — sur `/cours/securite-web`', async () => {
      // LE test de la correspondance exacte. `routerLinkActive` compare par
      // PRÉFIXE par défaut : « / » est préfixe de tout, donc sans
      // `{ exact: true }` on obtiendrait ici ['Accueil', 'Sécurité…'] — deux
      // « page courante » dans la même navigation.
      const fixture = await creerSur('/cours/securite-web');

      expect(pagesCourantes(fixture)).toEqual(['Sécurité des applications web']);
    });

    it('RETIRE l’attribut des liens inactifs, au lieu d’écrire `aria-current="false"`', async () => {
      // `[attr.aria-current]="… ? 'page' : null"` : le `null` fait retirer
      // l'attribut. Avec `false`, l'attribut resterait présent à la valeur
      // « false », que certaines combinaisons de lecteur d'écran annoncent quand
      // même — chaque lien se présenterait comme ayant un état de page.
      const fixture = await creerSur('/cours/securite-web');

      const accueil = liens(fixture).at(0);

      expect(accueil?.hasAttribute('aria-current')).toBe(false);
    });

    it('suit la navigation sans être reconstruite', async () => {
      // L'en-tête est persistant dans la coquille : l'état actif doit se
      // recalculer sur place à chaque navigation, pas au premier rendu seulement.
      const fixture = await creerSur('/');
      expect(pagesCourantes(fixture)).toEqual(['Accueil']);

      await TestBed.inject(Router).navigateByUrl('/cours/securite-web');
      await fixture.whenStable();

      expect(pagesCourantes(fixture)).toEqual(['Sécurité des applications web']);
    });
  });
});
