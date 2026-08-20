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

  it('fait REVENIR LE CODE À LA LIGNE au papier — sinon il disparaît sans trace', () => {
    // 🔴 LE DÉFAUT QUE CETTE ASSERTION FERME (revue du lot B, E2-ST4). Le défilement
    // horizontal du code vit sur `.defileur` depuis le lot B2 ; une feuille A4 n'a pas
    // de barre de défilement, donc tout ce qui dépasse la boîte est PERDU, en silence.
    // La règle doit vivre dans la feuille GLOBALE : le `<pre>` est du HTML injecté par
    // `[innerHTML]`, hors de portée de toute feuille de composant.
    const print = blocMedia(css, 'print');
    expect(print).not.toBeNull();
    expect(print).toMatch(/pre\s*\{[^}]*white-space:\s*pre-wrap/);
    // CONTRÔLE POSITIF : hors impression, le `<pre>` garde bien son comportement
    // d'écran. La feuille entière ne contient qu'UNE occurrence, et elle est dans le
    // bloc ci-dessus — donc la règle n'a pas fui hors du média, ce qui supprimerait le
    // défilement partout, y compris là où il est voulu.
    expect(css.split('pre-wrap').length - 1).toBe(1);
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
    // Les blocs `@font-face` sont retirés AVANT la mesure, et ce n'est pas un
    // assouplissement du contrôle : dans un `@font-face`, `font-weight` est un
    // DESCRIPTEUR — il déclare la graisse que le fichier contient (700 pour
    // Fraunces, l'intervalle 100 900 pour la variable Inter). Il ne style aucun
    // élément et ne peut donc pas court-circuiter un jeton. La règle visée par
    // ce test — aucune graisse en dur sur une RÈGLE de style — reste vérifiée
    // partout ailleurs, sur tout le reste de la feuille.
    const horsFontFace = css.replaceAll(/@font-face\s*\{[^}]*\}/g, '');
    expect(horsFontFace).not.toMatch(/font-weight:\s*\d/);
    expect(css).toContain('font-weight: var(--graisse-titre)');
    expect(css).toContain('--graisse-titre: 700');
  });

  it('déclare les polices auto-hébergées, et aucun hôte externe (CSP font-src \'self\')', () => {
    // G3 : la pile de titres commence par Fraunces, celle du corps par Inter.
    // Sass retire les guillemets en interpolant la pile dans une custom
    // property : la valeur émise est `Fraunces, Iowan Old Style, …`, pas
    // `"Fraunces", …`. On assied donc le test sur le CSS RÉEL. Ce qui compte
    // est le rang : la police auto-hébergée passe AVANT les replis système.
    expect(css).toMatch(/--police-titres:\s*Fraunces,/);
    expect(css).toMatch(/--police-corps:\s*Inter,/);

    // Le contrat de sécurité, mesuré sur le CSS émis plutôt que supposé : la CSP
    // du site est `font-src 'self'`. Une seule `src:` pointant un hôte externe
    // (un Google Fonts réintroduit par distraction) et la police ne chargerait
    // pas du tout en production, sans que rien n'échoue au build.
    const sources = [...css.matchAll(/src:\s*url\(["']?([^"')]+)["']?\)/g)].map((m) => m[1]);
    expect(sources.length).toBeGreaterThan(0);
    for (const s of sources) expect(s).toMatch(/^\/polices\//);

    // `swap` : le texte reste lisible pendant le téléchargement. Jamais `block`
    // (texte invisible = contenu inaccessible), jamais `optional` (première
    // visite privée de la police, soit l'écart à G3 qu'on vient de refermer).
    const affichages = [...css.matchAll(/font-display:\s*([\w-]+)/g)].map((m) => m[1]);
    expect(affichages.length).toBe(sources.length);
    for (const a of affichages) expect(a).toBe('swap');
  });
});

describe('Jetons de provenance pédagogique — 📘 cours / 🧩 complément', () => {
  const css = compile(FEUILLE_GLOBALE, { loadPaths: [RACINE_STYLES] }).css;

  /** Toutes les valeurs émises pour une custom property, tous thèmes confondus. */
  const valeursDe = (jeton: string): string[] =>
    [...css.matchAll(new RegExp(`${jeton}:\\s*([^;]+);`, 'g'))].map((m) => (m[1] ?? '').trim());

  it('porte les quatre jetons DANS LES DEUX THÈMES, sur les primitives attendues', () => {
    // Le gate `tools/design/verifier-contrastes.mjs` refuse déjà un jeton défini
    // dans un seul thème ; ce test épingle en plus la PRIMITIVE choisie, sur le
    // CSS réellement émis. Un remappage (E6) est légitime — il doit alors être
    // délibéré, donc passer par ici, pas se glisser dans un diff de peau.
    const attendu: Record<string, [string, string]> = {
      // jeton: [valeur en thème clair, valeur en thème sombre]
      '--couleur-provenance-cours': ['#10508f', '#94bdf0'],
      '--couleur-provenance-cours-surface': ['#eee8da', '#1f2531'],
      '--couleur-provenance-complement': ['#4e586e', '#a3abbb'],
      '--couleur-provenance-complement-surface': ['#fffdf7', '#262e3c'],
    };
    for (const [jeton, [clair, sombre]] of Object.entries(attendu)) {
      const valeurs = new Set(valeursDe(jeton));
      expect(valeurs, jeton).toContain(clair);
      expect(valeurs, jeton).toContain(sombre);
      expect(valeurs.size, `${jeton} — exactement deux calibrages, un par thème`).toBe(2);
    }
  });

  it('ne dilue NI le rouge « vulnérable » NI le vert « corrigé »', () => {
    // La seule signature chromatique pédagogique du site : rouge = vulnérable,
    // vert = corrigé. Une teinte de provenance qui reprendrait l'une des deux la
    // viderait de son sens. Les valeurs de référence sont relues du CSS émis, pas
    // recopiées : changer une primitive de signature ne peut pas contourner le test.
    const signature = new Set([
      ...valeursDe('--couleur-danger-vuln'),
      ...valeursDe('--couleur-danger-vuln-surface'),
      ...valeursDe('--couleur-ok-corrige'),
      ...valeursDe('--couleur-ok-corrige-surface'),
    ]);
    expect(signature.size).toBeGreaterThan(0);
    const provenance = [...css.matchAll(/--couleur-provenance-[\w-]+:\s*([^;]+);/g)].map((m) =>
      (m[1] ?? '').trim(),
    );
    expect(provenance.length).toBeGreaterThan(0);
    for (const valeur of provenance) expect(signature).not.toContain(valeur);
  });

  it('n’ouvre AUCUNE troisième teinte pour « correction-du-cours »', () => {
    // La variante ⚠️ réemploie `--couleur-attention{,-surface}`, déjà mesuré.
    // Un jeton dédié serait une teinte de plus dans un vocabulaire qui en compte
    // déjà assez — et une paire de contraste de plus à porter jusqu'à E6.
    expect(css).not.toMatch(/--couleur-provenance-correction/);
    expect(css).toMatch(/--couleur-attention:/);
  });
});

describe('Numérotation des lignes de code — feuille globale (E2-ST4, lot B2)', () => {
  const css = compile(FEUILLE_GLOBALE, { loadPaths: [RACINE_STYLES] }).css;

  it('numérote TOUTES les lignes, par un compteur remis à zéro à chaque bloc', () => {
    // C'est ce qui rend « Ligne 2 : » — l'étiquette d'annotation de `rendu-blocs.ts` —
    // localisable d'un regard, pour toutes les notes à la fois. La feuille doit être
    // GLOBALE : le HTML de Shiki est injecté par `[innerHTML]`, donc hors de portée de
    // toute feuille de composant.
    expect(css).toMatch(/pre\.shiki > code\s*\{[^}]*counter-reset:\s*ligne-de-code/);
    expect(css).toMatch(/pre\.shiki > code > span\.line\s*\{[^}]*counter-increment:\s*ligne-de-code/);
    expect(css).toMatch(/span\.line::before\s*\{[^}]*content:\s*counter\(ligne-de-code\)/);
  });

  it('masque la ligne FANTÔME — `:last-child` ET `:empty`, jamais l’un sans l’autre', () => {
    // markdown-it termine le contenu d'une clôture par un saut de ligne, dont Shiki
    // fait une dernière ligne VIDE, ancrée comme les autres (mesuré :
    // `src/pipeline-contenu-compilation.spec.ts`). La numéroter afficherait un numéro
    // devant du vide. `:empty` seul masquerait aussi une ligne vide AU MILIEU d'un
    // extrait — une respiration voulue par l'auteur — et décalerait alors l'œil d'un
    // cran par rapport aux annotations.
    expect(css).toMatch(/span\.line:last-child:empty\s*\{[^}]*display:\s*none/);
    expect(css).not.toMatch(/span\.line:empty\s*\{/);
  });

  it('n’introduit AUCUNE couleur pour les numéros — zéro paire de contraste neuve', () => {
    // Le numéro hérite de l'encre du code. Une encre affaiblie « pour la discrétion »
    // serait une paire de plus à mesurer par `tools/design/verifier-contrastes.mjs`,
    // sur des fonds (`--shiki-*-bg`) que ce gate ne connaît pas.
    const regle = /span\.line::before\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(regle.length).toBeGreaterThan(0);
    expect(regle).not.toMatch(/(^|[\s;])color:/);
    expect(regle).not.toMatch(/opacity:/);
    // G7 : la gouttière passe par un jeton, jamais par une valeur littérale.
    expect(regle).toContain('inline-size: var(--espace-4)');
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
