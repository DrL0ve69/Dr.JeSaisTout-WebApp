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
  // ⚠️ PLUS AUCUN NETTOYAGE DE `data-theme` NI DE `localStorage` ICI, et c'est un
  // retrait raisonné (L-029 : une règle appliquée PAR ACCIDENT disparaît sans
  // bruit quand on refactorise l'accident — autant la retirer en le disant).
  // Ces deux lignes existaient parce que l'en-tête composait `<app-bascule-theme>`,
  // qui instanciait le `ThemeService`, qui écrivait sur `<html>` — un élément
  // partagé par tout le run. L'en-tête ne compose plus la bascule (E6) : il ne
  // touche plus ni à l'attribut ni au stockage. Un nettoyage qui ne nettoie rien
  // laisserait croire que ce fichier a encore un effet de bord global.
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EnTete],
      providers: [provideRouter(ROUTES_HARNAIS)],
    });
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

    it('donne au logotype un nom accessible ESPACÉ, que son contenu ne produit pas', async () => {
      const fixture = await creerSur('/');
      const hote = fixture.nativeElement as HTMLElement;

      const logotype = hote.querySelector<HTMLAnchorElement>('header > a');
      const morceauxVisibles = [...(logotype?.querySelectorAll('span') ?? [])].map((span) =>
        (span.textContent ?? '').trim(),
      );

      // LE MODE D'ÉCHEC, CONSTATÉ TEL QUEL. `preserveWhitespaces: false` (défaut
      // d'Angular) retire le nœud de texte blanc entre les deux `<span>` : le
      // contenu du lien est COLLÉ, et c'est de ce contenu qu'un lecteur d'écran
      // tirerait le nom du lien s'il n'y avait pas d'`aria-label`. L'espace qu'on
      // voit à l'écran vient du `gap` de `.logotype`, qu'aucune API
      // d'accessibilité ne lit. Cette ligne n'est pas décorative : le jour où le
      // contenu se met à porter une vraie espace, elle rougit — et l'`aria-label`
      // devra être réexaminé plutôt que traîner en doublon silencieux.
      expect(logotype?.textContent).toBe('Dr.Je-Sais-Tout');

      // Le nom accessible, lui, porte une espace ordinaire. Il est comparé au
      // texte VISIBLE relu depuis le DOM, jamais à une chaîne recopiée : ce qui
      // est verrouillé ici n'est pas « la valeur vaut ceci », c'est
      // « le nom accessible EST le texte visible, dans l'ordre, séparé d'une
      // espace » — l'exigence de WCAG 2.2 · 2.5.3 (« Étiquette dans le nom »),
      // sans laquelle la commande vocale ne peut pas activer ce lien.
      expect(morceauxVisibles).toEqual(['Dr.', 'Je-Sais-Tout']);
      expect(logotype?.getAttribute('aria-label')).toBe(morceauxVisibles.join(' '));
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

    it('n’expose QU’UN SEUL `<nav>` — le menu compact ENVELOPPE la liste, il ne la duplique pas', async () => {
      // 🔴 LE TEST QUI TIENT LE MENU COMPACT (E6). La façon « évidente » de faire
      // un menu responsive est de rendre la liste DEUX FOIS — une barre pour le
      // large, un panneau pour l'étroit — puis d'en masquer une par media query.
      // Trois conséquences, toutes invisibles à l'œil : deux liens porteraient
      // `aria-current="page"` en même temps (exactement le plan faux que
      // `{ exact: true }` existe pour empêcher, et que le test « une seule page
      // courante » ci-dessous ne verrait PAS, puisqu'il compte des textes), deux
      // jeux d'arrêts de tabulation dont un vers des liens masqués, et un repère
      // de navigation en double chez axe. Un `display: none` en CSS ne retire
      // rien de tout cela du DOM rendu.
      const fixture = await creerSur('/');
      const hote = fixture.nativeElement as HTMLElement;

      expect(hote.querySelectorAll('nav').length).toBe(1);
      expect(liens(fixture).length).toBe(2);
    });

    it('replie la navigation derrière un `<details>` NATIF, sans le moindre gestionnaire', async () => {
      // `withNoIncrementalHydration()` est actif et toutes les routes sont
      // prerendues : un bouton Angular aurait l'air vivant sans l'être pendant
      // la fenêtre d'hydratation (L-033). `<details>`/`<summary>` fonctionne
      // avant tout script — c'est CE contrat-là qu'on verrouille, et il se perd
      // silencieusement si quelqu'un « modernise » le résumé en `<button>`.
      const fixture = await creerSur('/');
      const hote = fixture.nativeElement as HTMLElement;

      const details = hote.querySelector<HTMLDetailsElement>('header details');
      const resume = details?.querySelector(':scope > summary');

      expect(details).not.toBeNull();
      expect(resume).not.toBeNull();
      // La navigation vit DANS le `<details>` : c'est ce qui fait qu'il n'y en a
      // qu'une seule, repliée ou dépliée selon la largeur, jamais deux.
      expect(details?.querySelector('nav')).not.toBeNull();
      // Fermé au chargement : le panneau ne doit pas s'ouvrir tout seul sur un
      // petit écran, ni pousser le contenu avant la moindre interaction.
      expect(details?.open).toBe(false);
    });

    it('ne rend AUCUNE bascule de thème — phase 1 = sombre seul', async () => {
      // ⚠️ TEST INVERSÉ LE 2026-08-20 (bascule E6), et il prouve autant que celui
      // qu'il remplace. L'ancien exigeait le `fieldset` de `<app-bascule-theme>`
      // rendu dans l'en-tête ; la phase 1 n'a plus qu'un thème (décision D-2), et
      // une commande qui n'offre aucun choix est un contrôle mort.
      //
      // CE QU'IL ATTRAPE, CONCRÈTEMENT : une recomposition accidentelle de la
      // bascule. Elle ne serait pas un simple détail visuel — elle rouvrirait le
      // besoin du script inline anti-flash, donc d'un hachage dans `script-src`,
      // que ce lot vient précisément de ramener à ZÉRO. Ce test est le premier
      // maillon de cette chaîne, et le moins cher à lire.
      //
      // ⚠️ E4-ST1 EST PROPRIÉTAIRE DE CE TEST : le jour où le thème clair revient,
      // c'est ici qu'on réinverse — après avoir traité `src/index.html`,
      // `_themes.scss` et `generer-config-swa.mjs`, pas avant.
      const fixture = await creerSur('/');
      const hote = fixture.nativeElement as HTMLElement;

      expect(hote.querySelector('app-bascule-theme')).toBeNull();
      expect(hote.querySelector('header fieldset')).toBeNull();
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
