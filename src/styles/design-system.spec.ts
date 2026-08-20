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

/**
 * Extrait le corps de TOUS les blocs `@media <condition>`, concaténés.
 *
 * 🔴 IL Y EN A PLUSIEURS DEPUIS E6, et n'en lire qu'un faisait échouer ce test
 * sur un produit parfaitement sain. `styles.scss` porte la cascade d'impression
 * du site ; la feuille de coloration syntaxique GÉNÉRÉE porte la sienne, et elle
 * arrive en premier dans le CSS compilé. L'ancienne version rendait donc le bloc
 * de Shiki en croyant rendre celui du site, puis cherchait `--couleur-encre`
 * dedans et ne l'y trouvait pas — un diagnostic qui accusait le produit.
 *
 * Ce qui compte à l'impression n'est de toute façon pas « le premier bloc » mais
 * TOUT ce que `@media print` applique : la concaténation est aussi la mesure
 * juste.
 */
function blocMedia(css: string, condition: string): string | null {
  const corps: string[] = [];
  let curseur = 0;

  for (;;) {
    const debut = css.indexOf(`@media ${condition}`, curseur);
    if (debut === -1) break;
    const ouvrante = css.indexOf('{', debut);
    if (ouvrante === -1) break;

    let profondeur = 0;
    let fin = -1;
    for (let i = ouvrante; i < css.length; i += 1) {
      if (css[i] === '{') profondeur += 1;
      else if (css[i] === '}') {
        profondeur -= 1;
        if (profondeur === 0) { fin = i; break; }
      }
    }
    if (fin === -1) break;

    corps.push(css.slice(ouvrante + 1, fin));
    curseur = fin + 1;
  }

  return corps.length > 0 ? corps.join('\n') : null;
}

describe('Feuille globale — cascade d’impression (M1)', () => {
  const css = compile(FEUILLE_GLOBALE, { loadPaths: [RACINE_STYLES] }).css;

  it('imprime en encre SOMBRE sur papier clair — mesuré, pas supposé', () => {
    // 🔴 CE TEST A CHANGÉ DE FORME À LA BASCULE E6, PAS D'OBJET. Il épinglait le
    // hex du papier ivoire et les deux sélecteurs qui neutralisaient la cascade à
    // deux thèmes ; ces trois valeurs sont mortes avec le thème clair (D-2). Ce
    // qu'il protégeait — une page qui ne s'imprime pas en clair sur blanc, mesuré
    // à ~1.1:1 avant correctif — reste EXACTEMENT le même risque, et il est
    // même plus aigu maintenant : la surface d'écran est un noir de tube, que les
    // navigateurs ne peignent pas au papier. Sans inversion, il ne resterait que
    // l'encre #d6e2e6 sur blanc.
    //
    // On ne mesure donc plus un hex attendu mais le CONTRASTE RÉELLEMENT OBTENU :
    // le bloc `@media print` reste libre de choisir ses valeurs, il n'est pas
    // libre de rendre la page illisible.
    const print = blocMedia(css, 'print');
    expect(print).not.toBeNull();

    const valeur = (jeton: string): string | null =>
      new RegExp(`${jeton}:\\s*(#[0-9a-fA-F]{6})`).exec(print ?? '')?.[1]?.toLowerCase() ?? null;

    const encre = valeur('--couleur-encre');
    const surface = valeur('--couleur-surface');
    expect(encre, '`@media print` doit redéfinir --couleur-encre').not.toBeNull();
    expect(surface, '`@media print` doit redéfinir --couleur-surface').not.toBeNull();

    const canal = (huit: number): number => {
      const s = huit / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (hex: string): number => {
      const canaux = [1, 3, 5].map((i) => canal(Number.parseInt(hex.slice(i, i + 2), 16)));
      const [r, v, b] = canaux;
      // `map` sur un littéral de trois indices rend toujours trois canaux, mais
      // l'indexation reste `number | undefined` pour TypeScript. On LÈVE plutôt
      // que de retomber sur des zéros : une couleur illisible donnerait sinon une
      // luminance de 0, donc un ratio faussement flatteur — un gate de contraste
      // qui ment vert est pire que pas de gate.
      if (r === undefined || v === undefined || b === undefined) {
        throw new Error(`Couleur illisible, 6 chiffres hexadécimaux attendus : ${hex}`);
      }
      return 0.2126 * r + 0.7152 * v + 0.0722 * b;
    };
    const lEncre = luminance(encre as string);
    const lSurface = luminance(surface as string);
    const ratio =
      (Math.max(lEncre, lSurface) + 0.05) / (Math.min(lEncre, lSurface) + 0.05);

    expect(ratio, `encre ${encre} sur papier ${surface}`).toBeGreaterThanOrEqual(4.5);
    // Et le sens compte : au papier, c'est l'ENCRE qui est sombre. Une page
    // imprimée « juste » à l'envers gaspillerait un aplat de toner par feuille.
    expect(lEncre, 'l’encre doit être plus sombre que le papier').toBeLessThan(lSurface);
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
    // l'impression. Restreindre au type `screen` retire un bloc sombre du champ
    // du papier, quelle que soit la spécificité.
    //
    // ⚠️ LE COMPTE N'EST PLUS EXIGÉ > 0, ET C'EST DÉLIBÉRÉ. Depuis D-2 (sombre
    // seul), AUCUNE occurrence ne subsiste dans la feuille compilée : ni
    // `_themes.scss`, ni la feuille de coloration syntaxique générée par le
    // pipeline de contenu — `compiler-markdown.mjs` a lui aussi cessé d'émettre
    // son bloc `prefers-color-scheme` dans ce même lot. Il n'y a donc plus rien
    // à arbitrer, et exiger qu'il en reste au moins un ferait échouer le test
    // sur la BONNE issue. La règle, elle, ne s'assouplit pas : elle reste écrite
    // pour E4-ST1 (retour du thème clair), et le premier bloc qui réapparaîtra
    // devra être borné à `screen` ou ce test rougira.
    const requetesSombres = [...css.matchAll(/@media ([^{]*prefers-color-scheme:\s*dark[^{]*)\{/g)];
    for (const [, condition] of requetesSombres) {
      expect(condition).toContain('screen');
    }
  });

  it('n’émet plus aucune graisse en dur — l’axe passe par les jetons', () => {
    // Les blocs `@font-face` sont retirés AVANT la mesure, et ce n'est pas un
    // assouplissement du contrôle : dans un `@font-face`, `font-weight` est un
    // DESCRIPTEUR — il déclare la graisse que le fichier contient (400 et 700
    // pour IBM Plex Mono, l'intervalle 100 900 pour la variable Inter, 400 pour
    // Silkscreen et Press Start 2P). Il ne style aucun
    // élément et ne peut donc pas court-circuiter un jeton. La règle visée par
    // ce test — aucune graisse en dur sur une RÈGLE de style — reste vérifiée
    // partout ailleurs, sur tout le reste de la feuille.
    const horsFontFace = css.replaceAll(/@font-face\s*\{[^}]*\}/g, '');
    expect(horsFontFace).not.toMatch(/font-weight:\s*\d/);
    expect(css).toContain('font-weight: var(--graisse-titre)');
    expect(css).toContain('--graisse-titre: 700');
  });

  it('déclare les polices auto-hébergées, et aucun hôte externe (CSP font-src \'self\')', () => {
    // G3 : chaque jeton de police commence par sa famille auto-hébergée. Sass
    // retire les guillemets en interpolant la pile dans une custom property : la
    // valeur émise est `IBM Plex Mono, ui-monospace, …`, pas `"IBM Plex Mono", …`.
    // On assied donc le test sur le CSS RÉEL. Ce qui compte est le rang : la
    // police servie passe AVANT les replis système.
    //
    // 🔴 `--police-code` EST DANS LA LISTE DEPUIS E6, et ce n'est pas cosmétique :
    // les blocs de code sont passés d'une pile SYSTÈME à une police servie parce
    // que le cours ancre des annotations à la ligne et oppose des paires
    // vulnérable/corrigé où l'alignement porte du sens. Un retour à la pile
    // système rendrait le même extrait en Consolas chez l'un et en SF Mono chez
    // l'autre — c'est ce test qui l'attrape.
    expect(css).toMatch(/--police-titres:\s*IBM Plex Mono,/);
    expect(css).toMatch(/--police-corps:\s*Inter,/);
    expect(css).toMatch(/--police-code:\s*IBM Plex Mono,/);
    expect(css).toMatch(/--police-micro:\s*Silkscreen,/);
    expect(css).toMatch(/--police-jalon:\s*Press Start 2P,/);

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

  it('porte les quatre jetons, sur les primitives attendues du thème sombre', () => {
    // Le gate `tools/design/verifier-contrastes.mjs` mesure le CONTRASTE de ces
    // jetons ; ce test épingle la VALEUR choisie, sur le CSS réellement émis. Un
    // remappage est légitime — il doit alors être délibéré, donc passer par ici,
    // pas se glisser dans un diff de peau. Les valeurs ci-dessous sont celles de
    // la bascule E6 « Moniteur ambre » (le cyan de provenance est choisi hors du
    // vocabulaire rouge/vert/ambre pour ne rien lui voler).
    //
    // ⚠️ UN SEUL CALIBRAGE PAR JETON DEPUIS D-2 (sombre seul). Le compte exact
    // reste vérifié, et il compte : `size === 1` interdit qu'un composant
    // redéfinisse le jeton dans son coin — c'est le garde-fou G7, mesuré sur la
    // sortie et pas seulement promis dans l'en-tête de `_themes.scss`.
    const attendu: Record<string, string> = {
      '--couleur-provenance-cours': '#5bc8e8',
      '--couleur-provenance-cours-surface': '#0a1e26',
      '--couleur-provenance-complement': '#8ca1aa',
      '--couleur-provenance-complement-surface': '#0f1619',
    };
    for (const [jeton, sombre] of Object.entries(attendu)) {
      const valeurs = new Set(valeursDe(jeton));
      expect(valeurs, jeton).toContain(sombre);
      expect(valeurs.size, `${jeton} — un seul calibrage tant qu’il n’y a qu’un thème`).toBe(1);
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
