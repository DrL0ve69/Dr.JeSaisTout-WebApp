// =============================================================================
// Tests de CarteCours — un contrat d'entrées, et UN seul focalisable
// -----------------------------------------------------------------------------
// Ce que ce fichier tient, et que rien d'autre ne peut tenir :
//
//  1. LE TITRE N'EST PAS UN LIEN (décision 1 du plan d'E1-ST3). C'est exactement
//     l'« amélioration » qu'un contributeur pressé ajoute — rien à l'œil ne
//     distingue un `<h2>` d'un `<h2><a>`. Elle donnerait deux focalisables à
//     l'accueil, et un second lien de même destination que celui de la
//     navigation, sous un nom différent.
//  2. LES TROIS ENTRÉES SONT REQUISES. Passer `input.required<string>()` à
//     `input<string>()` ne casse aucune compilation ici : la carte rendrait
//     simplement du vide, ou « undefined », en silence.
//  3. `mentionChantier` EST FACULTATIVE, et son absence ne laisse aucune trace —
//     ni paragraphe vide, ni littéral « undefined » publié.
//
// L-012 appliqué : aucune valeur attendue n'est importée du composant. Les textes
// injectés sont choisis ICI, et le seul texte comparé à un littéral est celui que
// le GABARIT écrit lui-même (le libellé de l'appel à l'action), ce qui est bien le
// contrat qu'on veut verrouiller.
// =============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CarteCours } from './carte-cours';

/** Les entrées de la carte, telles qu'un appelant les fournit. */
interface EntreesCarte {
  titre: string;
  description: string;
  lien: string;
  mentionChantier?: string;
}

const ENTREES_MINIMALES: EntreesCarte = {
  titre: 'Un cours choisi par le test',
  description: 'Une description choisie par le test.',
  lien: '/une/destination/choisie-par-le-test',
};

async function rendre(entrees: EntreesCarte): Promise<ComponentFixture<CarteCours>> {
  const fixture = TestBed.createComponent(CarteCours);
  for (const [nom, valeur] of Object.entries(entrees)) {
    fixture.componentRef.setInput(nom, valeur);
  }
  await fixture.whenStable();
  return fixture;
}

function hote(fixture: ComponentFixture<CarteCours>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** Le source du composant, lu au disque — pour les interdits de forme. */
function sourceDuComposant(): string {
  return readFileSync(
    join(process.cwd(), 'src', 'app', 'features', 'home', 'carte-cours', 'carte-cours.ts'),
    'utf8',
  );
}

describe('CarteCours', () => {
  beforeEach(() => {
    // `provideRouter([])` suffit : `routerLink` exige un routeur, aucune route
    // n'a besoin d'exister pour qu'un `href` soit calculé.
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  describe('le titre est un titre, pas un lien (décision 1)', () => {
    it('rend le `titre` dans un `<h2>` qui n’est PAS un lien et n’en contient aucun', async () => {
      const fixture = await rendre(ENTREES_MINIMALES);
      const titre = hote(fixture).querySelector('h2');

      expect(titre?.textContent).toContain(ENTREES_MINIMALES.titre);
      expect(titre?.closest('a')).toBeNull();
      expect(titre?.querySelector('a')).toBeNull();
    });

    it('n’expose qu’UN SEUL élément focalisable : l’appel à l’action', async () => {
      const fixture = await rendre(ENTREES_MINIMALES);

      // Même liste de sélecteurs qu'`app.spec.ts` : c'est l'ordre de tabulation
      // réel du site en phase 1. Ce compte est aussi ce sur quoi s'appuient les
      // specs Playwright d'E1-ST2 — le laisser dériver casse leurs totaux.
      const focalisables = hote(fixture).querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      expect(focalisables.length).toBe(1);
      expect(focalisables[0]?.tagName).toBe('A');
    });
  });

  describe('appel à l’action', () => {
    it('pointe vers le `lien` fourni, choisi par le test', async () => {
      const fixture = await rendre(ENTREES_MINIMALES);
      const cta = hote(fixture).querySelector<HTMLAnchorElement>('a');

      expect(cta?.getAttribute('href')).toBe(ENTREES_MINIMALES.lien);
    });

    it('porte un libellé d’un seul tenant, espaces comprises (L-024)', async () => {
      // Le nom accessible se calcule à partir du CONTENU. Le jour où ce libellé
      // serait découpé en deux `<span>` pour le styler, `preserveWhitespaces:
      // false` retirerait le nœud blanc entre eux et le nom deviendrait
      // « Commencerlecours » — invisible à l'écran, injoignable à la commande
      // vocale (WCAG 2.2 · 2.5.3). Cette ligne rougit avant la mise en ligne.
      const fixture = await rendre(ENTREES_MINIMALES);
      const cta = hote(fixture).querySelector<HTMLAnchorElement>('a');

      expect(cta?.textContent?.trim()).toBe('Commencer le cours');
    });
  });

  describe('contrat des entrées', () => {
    it('EXIGE `titre`, `description` et `lien` — aucune ne se dégrade en vide', () => {
      const fixture = TestBed.createComponent(CarteCours);
      const instance = fixture.componentInstance as unknown as Record<string, () => unknown>;

      for (const nom of ['titre', 'description', 'lien']) {
        const lecture = instance[nom];

        // Garde-fou contre le vert vide : si l'entrée disparaissait du composant,
        // la boucle passerait sans rien vérifier (L-005).
        expect(typeof lecture, `entrée absente : ${nom}`).toBe('function');
        // Angular lève NG0950 à la lecture d'une entrée requise non fournie. Une
        // entrée devenue facultative rendrait `undefined` sans broncher.
        expect(() => lecture?.(), `entrée non requise : ${nom}`).toThrow();
      }
    });

    it('rend la `mentionChantier` quand elle est fournie', async () => {
      const fixture = await rendre({
        ...ENTREES_MINIMALES,
        mentionChantier: 'Un avertissement choisi par le test',
      });

      expect(hote(fixture).querySelector('.chantier')?.textContent).toContain(
        'Un avertissement choisi par le test',
      );
    });

    it('ne rend AUCUN paragraphe quand la `mentionChantier` est absente', async () => {
      const fixture = await rendre(ENTREES_MINIMALES);

      expect(hote(fixture).querySelector('.chantier')).toBeNull();
      // La faute jumelle : interpoler `undefined` et publier « undefined ».
      expect(hote(fixture).textContent).not.toContain('undefined');
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
