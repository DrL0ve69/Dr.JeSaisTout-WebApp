// =============================================================================
// Tests du design system — sur le CSS ÉMIS, pas sur la source SCSS
// -----------------------------------------------------------------------------
// POURQUOI CES TESTS EXISTENT.
// Deux constats de la revue d'E1-ST1-A étaient invisibles à la lecture du SCSS et
// ne se voyaient que dans la sortie compilée :
//
//   · le bloc `@media print` était battu en spécificité par le bloc
//     `prefers-color-scheme: dark` (0,1,0 contre 0,2,0) — un visiteur non épinglé
//     sur un OS en sombre imprimait de l'encre claire sur papier blanc ;
//   · le mixin `marge-carnet` ne survivait pas à `forced-colors: active`, où
//     « vulnérable » et « corrigé » deviennent la même couleur.
//
// Un commentaire ne protège ni l'un ni l'autre. On compile donc réellement le
// SCSS ici et on interroge la sortie. `sass` est le compilateur déjà utilisé par
// `@angular/build` — aucune dépendance nouvelle, aucun octet téléchargé en plus.
// =============================================================================

import { join } from 'node:path';
import { compile, compileString } from 'sass';

const RACINE_STYLES = join(process.cwd(), 'src', 'styles');
const FEUILLE_GLOBALE = join(process.cwd(), 'src', 'styles.scss');

/** Compile un fragment qui consomme `_mixins.scss`. */
function compilerAvecMixins(scss: string): string {
  return compileString(`@use 'mixins' as m;\n${scss}`, {
    loadPaths: [RACINE_STYLES],
  }).css;
}

/** Extrait le corps d'un bloc `@media <condition>` par appariement d'accolades. */
function blocMedia(css: string, condition: string): string | null {
  const debut = css.indexOf(`@media ${condition}`);
  if (debut === -1) return null;
  const ouvrante = css.indexOf('{', debut);
  let profondeur = 0;
  for (let i = ouvrante; i < css.length; i += 1) {
    if (css[i] === '{') profondeur += 1;
    else if (css[i] === '}') {
      profondeur -= 1;
      if (profondeur === 0) return css.slice(ouvrante + 1, i);
    }
  }
  return null;
}

describe('Feuille globale — cascade d’impression (M1)', () => {
  const css = compile(FEUILLE_GLOBALE, { loadPaths: [RACINE_STYLES] }).css;

  it('force les jetons clairs pour un visiteur NON épinglé', () => {
    const print = blocMedia(css, 'print');
    expect(print).not.toBeNull();

    // C'est LE sélecteur qui manquait : sans lui, `:root` (0,1,0) perd contre le
    // `:root:not([data-theme])` (0,2,0) du bloc sombre, et la page s'imprime en
    // encre claire sur papier blanc (~1.1:1).
    expect(print).toContain(':root:not([data-theme])');
    // Et celui qui couvre le cas épinglé sombre (déjà correct avant la revue).
    expect(print).toContain(':root[data-theme]');
    // Preuve que le bloc pose bien les jetons du thème clair, pas seulement
    // `color-scheme` : la surface claire est le papier ivoire.
    expect(print).toContain('--couleur-surface: #f7f4ec');
  });

  it('ne laisse aucun bloc `prefers-color-scheme: dark` hors du média `screen`', () => {
    // La cause racine : Firefox et Safari évaluent encore la préférence système à
    // l'impression. Restreindre au type `screen` retire le bloc sombre du champ
    // du papier, quelle que soit la spécificité.
    const requetesSombres = [...css.matchAll(/@media ([^{]*prefers-color-scheme:\s*dark[^{]*)\{/g)];
    expect(requetesSombres.length).toBeGreaterThan(0);
    for (const [, condition] of requetesSombres) {
      expect(condition).toContain('screen');
    }
  });

  it('n’émet plus aucune graisse en dur — l’axe passe par les jetons', () => {
    expect(css).not.toMatch(/font-weight:\s*\d/);
    expect(css).toContain('font-weight: var(--graisse-titre)');
    expect(css).toContain('--graisse-titre: 700');
  });
});

describe('Mixin marque-pedagogique — WCAG 1.4.1 (M4)', () => {
  const styleDeTrait = (type: string): string => {
    const css = compilerAvecMixins(`.bloc { @include m.marque-pedagogique('${type}'); }`);
    return /border-inline-start:\s*[^;]*?\s(dashed|solid|dotted)\s/.exec(css)?.[1] ?? '';
  };

  it('donne à chaque type un STYLE de trait distinct, pas seulement une couleur', () => {
    const styles = ['vulnerable', 'corrige', 'attention'].map(styleDeTrait);
    expect(styles).toEqual(['dashed', 'solid', 'dotted']);
    // Le cœur du constat : trois canaux non colorés distincts. Si deux types
    // partageaient le même style, ils redeviendraient indiscernables en
    // contraste forcé — exactement le défaut de `marge-carnet` avant correctif.
    expect(new Set(styles).size).toBe(3);
  });

  it('survit à `forced-colors: active` : la couleur tombe, le trait reste', () => {
    for (const type of ['vulnerable', 'corrige', 'attention']) {
      const css = compilerAvecMixins(`.bloc { @include m.marque-pedagogique('${type}'); }`);
      const forces = blocMedia(css, '(forced-colors: active)');
      expect(forces, `type ${type}`).not.toBeNull();
      expect(forces, `type ${type}`).toContain('border-inline-start-color: CanvasText');
    }
  });

  it('refuse un type inconnu à la COMPILATION (le build casse, pas la page)', () => {
    expect(() =>
      compilerAvecMixins(`.bloc { @include m.marque-pedagogique('dangereux'); }`),
    ).toThrow(/type inconnu/);
  });
});

describe('Mixin marge-carnet — décor neutre (mineur)', () => {
  it('prend un trait neutre par défaut, jamais l’encre rouge « vulnérable »', () => {
    const css = compilerAvecMixins('.carnet { @include m.marge-carnet; }');
    expect(css).toContain('var(--couleur-filet-fort)');
    expect(css).not.toContain('--couleur-danger-vuln');
  });

  it('reste visible en contraste forcé', () => {
    const css = compilerAvecMixins('.carnet { @include m.marge-carnet; }');
    expect(blocMedia(css, '(forced-colors: active)')).toContain(
      'border-inline-start-color: CanvasText',
    );
  });
});
