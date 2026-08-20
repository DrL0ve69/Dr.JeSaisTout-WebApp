// =============================================================================
// Tests de PluieGlyphes — un décor se prouve par ce qu'il REFUSE de faire
// -----------------------------------------------------------------------------
// Trois promesses, et chacune a son contrôle POSITIF (L-019 : une assertion
// d'absence sans témoin de présence est verte et vide) :
//  1. DÉCOR : `aria-hidden="true"` ET `inert` sur l'hôte, les deux ensemble.
//  2. MOUVEMENT RÉDUIT, PARADE JS : `prefers-reduced-motion: reduce` ⇒ la boucle
//     n'est PAS armée. Le témoin inverse (préférence NON exprimée ⇒ elle l'est)
//     est indispensable : sans lui, un composant qui ne peindrait JAMAIS
//     passerait le premier test au vert.
//  3. MOUVEMENT RÉDUIT, PARADE CSS : la feuille COMPILÉE porte `display: none`
//     sous `prefers-reduced-motion: reduce`. C'est la moitié qui vaut sans
//     JavaScript et avant hydratation — le test la lit dans le CSS émis, pas
//     dans le source, pour qu'un mixin déplacé ne la fasse pas disparaître en
//     silence.
//
// ⚠️ LE CONTEXTE 2D EST SIMULÉ, ET C'EST NÉCESSAIRE. jsdom n'implémente pas
// `HTMLCanvasElement.getContext` : sans doublure, le composant sortirait par sa
// garde `contexte === null` et le témoin positif serait vert sans avoir rien
// mesuré — exactement le mode d'échec que ce fichier cherche à empêcher.
// =============================================================================

import { TestBed } from '@angular/core/testing';
import { compile } from 'sass';

import { join } from 'node:path';
import { readFileSync } from 'node:fs';

import { PluieGlyphes } from './pluie-glyphes';

const DOSSIER = join(process.cwd(), 'src', 'app', 'core', 'ambiance', 'pluie-glyphes');
const SOURCE = join(DOSSIER, 'pluie-glyphes.ts');
const FEUILLE = join(DOSSIER, 'pluie-glyphes.scss');

/**
 * Une doublure de contexte 2D : elle enregistre, elle ne dessine pas.
 *
 * 🔴 `setTransform` COMPTE, et c'est lui la mesure du démarrage — pas le nombre d'appels à
 * `requestAnimationFrame`. Le composant n'a qu'UN seul `requestAnimationFrame`, dans
 * `demarrer()`, et il vient APRÈS `this.mesurer()`, qui repose la matrice : un compteur de
 * `setTransform` à zéro prouve donc que la boucle n'a pas été armée. Compter les `rAF` de la
 * fenêtre mesurerait autre chose — l'ordonnanceur zoneless d'Angular en demande une pour son
 * propre cycle de détection, indépendamment du composant, et le test rougissait sur ce
 * bruit-là en accusant un composant sain (L-035 : la prémisse du test, pas le produit).
 */
function contexteSimule(compter: () => void): CanvasRenderingContext2D {
  const doublure = {
    globalAlpha: 1,
    fillStyle: '',
    font: '',
    textBaseline: 'top',
    fillRect: () => undefined,
    fillText: () => undefined,
    setTransform: () => {
      compter();
    },
  };
  return doublure as unknown as CanvasRenderingContext2D;
}

/**
 * 🔴 jsdom 28 NE FOURNIT PAS `matchMedia` — mesuré, pas supposé (`typeof` sur une
 * `JSDOM` fraîche : `undefined`). Donc `vi.spyOn(window, 'matchMedia')` LÈVE
 * (« can only spy on a function »), et il lève AVANT la moindre assertion : le
 * fichier rougissait sur une prémisse fausse, jamais sur le composant, qui garde
 * au contraire `typeof window.matchMedia === 'function'` et se tait quand la
 * fonction manque. On INSTALLE donc la doublure par affectation, et on rend la
 * fenêtre à son état initial dans `afterEach` — `vi.restoreAllMocks()` ne défait
 * pas une affectation.
 */
const restaurations: (() => void)[] = [];

/** Rend la fenêtre à l'état exact où le test l'a trouvée, dans l'ordre inverse. */
function restaurerLaFenetre(): void {
  while (restaurations.length > 0) restaurations.pop()?.();
}

/**
 * Installe l'environnement navigateur que jsdom ne fournit pas, et rend le
 * composant. `matchMedia` est stubé pour DÉCIDER de la préférence : c'est la
 * variable de l'expérience.
 */
async function rendre(
  reduit: boolean,
): Promise<{ hote: HTMLElement; boucleArmee: () => number }> {
  let imagesDemandees = 0;
  let boucleArmee = 0;

  const matchMediaEtaitLa = 'matchMedia' in window;
  const matchMediaInitial = window.matchMedia;
  restaurations.push(() => {
    if (matchMediaEtaitLa) window.matchMedia = matchMediaInitial;
    else Reflect.deleteProperty(window, 'matchMedia');
  });
  window.matchMedia = ((requete: string) =>
    ({
      matches: reduit && requete.includes('prefers-reduced-motion'),
      media: requete,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;

  // Même précaution pour la boucle d'animation : `pretendToBeVisual` de jsdom la
  // fournit aujourd'hui, mais un `spyOn` la rendrait à nouveau tributaire d'un
  // détail de l'environnement de test plutôt que du contrat mesuré ici.
  const rafInitial = window.requestAnimationFrame;
  window.requestAnimationFrame = ((): number => {
    imagesDemandees += 1;
    // On ne rappelle PAS le callback : une boucle d'animation réelle ne se
    // termine jamais, et ce test mesure le DÉMARRAGE, pas la peinture.
    return imagesDemandees;
  }) as typeof window.requestAnimationFrame;
  restaurations.push(() => {
    window.requestAnimationFrame = rafInitial;
  });

  // `getContext` est SURCHARGÉE : le type de retour choisi par `spyOn` dépend de
  // la dernière surcharge, d'où la conversion explicite plutôt qu'un pari.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    contexteSimule(() => {
      boucleArmee += 1;
    }) as unknown as RenderingContext,
  );

  const fixture = TestBed.createComponent(PluieGlyphes);
  fixture.detectChanges();
  await fixture.whenStable();

  return { hote: fixture.nativeElement as HTMLElement, boucleArmee: () => boucleArmee };
}

describe('PluieGlyphes', () => {
  afterEach(() => {
    restaurerLaFenetre();
    vi.restoreAllMocks();
  });

  describe('c’est du décor, jamais de l’information', () => {
    it('porte `aria-hidden` ET `inert` sur son hôte — les deux, pas l’un des deux', async () => {
      const { hote } = await rendre(true);

      expect(hote.getAttribute('aria-hidden')).toBe('true');
      expect(hote.hasAttribute('inert')).toBe(true);
    });

    it('n’expose AUCUN élément focalisable ni aucun texte lisible', async () => {
      const { hote } = await rendre(true);

      expect(
        hote.querySelectorAll('a[href], button, input, select, textarea, [tabindex]').length,
      ).toBe(0);
      expect(hote.textContent?.trim()).toBe('');
    });
  });

  describe('prefers-reduced-motion — parade JavaScript', () => {
    it('n’arme AUCUNE boucle quand la personne demande moins de mouvement', async () => {
      const { boucleArmee } = await rendre(true);

      expect(boucleArmee()).toBe(0);
    });

    it('EN ARME une quand la préférence n’est pas exprimée (témoin de la mesure)', async () => {
      const { boucleArmee } = await rendre(false);

      expect(boucleArmee()).toBeGreaterThan(0);
    });
  });

  describe('prefers-reduced-motion — parade CSS (celle qui vaut sans JavaScript)', () => {
    it('émet `display: none` sous `prefers-reduced-motion: reduce`', () => {
      const css = compile(FEUILLE, { loadPaths: ['src'] }).css;
      const bloc = css.split('@media (prefers-reduced-motion: reduce)')[1] ?? '';

      expect(css).toContain('@media (prefers-reduced-motion: reduce)');
      expect(bloc.slice(0, 200)).toContain('display: none');
    });
  });

  describe('interdits de forme', () => {
    it('ne fait AUCUN rendu HTML brut ni contournement de la sécurité Angular', () => {
      const source = readFileSync(SOURCE, 'utf8');

      expect(source).not.toContain('innerHTML');
      expect(source).not.toContain('bypassSecurityTrust');
    });

    it('ne pose aucun attribut `style` inline — la CSP à hachages ne les couvre pas', () => {
      expect(readFileSync(SOURCE, 'utf8')).not.toContain(' style="');
    });

    it('n’emploie pas `--police-jalon`, dont le rôle est fermé à trois emplois', () => {
      expect(readFileSync(SOURCE, 'utf8')).not.toContain('--police-jalon');
      expect(readFileSync(FEUILLE, 'utf8')).not.toContain('--police-jalon');
    });
  });
});
