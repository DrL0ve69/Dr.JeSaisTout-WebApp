// =============================================================================
// Tests du script anti-flash de thème — sur le script RÉELLEMENT servi
// -----------------------------------------------------------------------------
// POURQUOI CES TESTS EXISTENT.
// Ce script est le seul code du site qui ne passe ni par TypeScript, ni par le
// compilateur d'Angular : c'est du JavaScript écrit à la main dans
// `src/index.html`. Rien ne le typerait, rien ne l'exécuterait, et une faute de
// frappe s'y verrait en production sous la forme d'un flash — ou d'une page qui
// ne démarre pas du tout, puisqu'il s'exécute avant tout le reste.
//
// On ne recopie donc PAS sa logique ici : on l'extrait de `src/index.html` et on
// l'exécute pour de vrai, avec un `localStorage` et un `document` en trompe-l'œil.
// Un test qui vérifierait une copie ne vérifierait rien.
//
// PORTÉE EXACTE, pour ne pas se croire mieux couvert qu'on ne l'est : ces tests
// lisent la SOURCE, seule lisible sans construire le site. C'est le générateur
// `tools/deploiement/generer-config-swa.mjs` qui, lui, travaille sur l'artéfact
// servi et refuse tout écart avec le hachage épinglé.
//
// Le contrat testé ici est celui que le `ThemeService` (E1-ST1-D) devra honorer
// en écriture — c'est le même en lecture et en écriture, il vit dans les deux
// sens et doit rester vérifié des deux côtés.
// =============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from 'sass';

const INDEX = join(process.cwd(), 'src', 'index.html');
const CLE = 'drjst-theme';

/** Tous les `<script>` inline exécutables de `src/index.html`, avec leurs attributs. */
function scriptsInline(): { attrs: string; corps: string }[] {
  const html = readFileSync(INDEX, 'utf8');
  return [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
    .map((m) => ({ attrs: m[1], corps: m[2] }))
    .filter(({ attrs, corps }) => corps.trim() !== '' && !/\bsrc\s*=/.test(attrs));
}

const CODE = scriptsInline()[0]?.corps ?? '';

interface Execution {
  /** Valeur posée sur `data-theme`, ou `null` si l'attribut n'a pas été touché. */
  themePose: string | null;
  /** Clé demandée au stockage — le contrat avec le futur `ThemeService`. */
  cleLue: string | null;
  /** Le script est en LECTURE SEULE : tout appel en écriture est un défaut. */
  ecritures: number;
}

/** Exécute le script servi avec un stockage et un document en trompe-l'œil. */
function executer(lecture: () => string | null): Execution {
  const resultat: Execution = { themePose: null, cleLue: null, ecritures: 0 };

  const stockage = {
    getItem: (cle: string) => {
      resultat.cleLue = cle;
      return lecture();
    },
    setItem: () => {
      resultat.ecritures += 1;
    },
    removeItem: () => {
      resultat.ecritures += 1;
    },
  };

  const documentFactice = {
    documentElement: {
      setAttribute: (nom: string, valeur: string) => {
        if (nom === 'data-theme') resultat.themePose = valeur;
      },
    },
  };

  // Les deux paramètres MASQUENT les globales du même nom à l'intérieur du script :
  // c'est ce qui permet de l'exécuter tel quel, sans y toucher une ligne.
  new Function('localStorage', 'document', CODE)(stockage, documentFactice);

  return resultat;
}

describe('index.html — un seul script inline, celui qui est haché', () => {
  it('n’en contient qu’UN, et il porte l’id attendu par le générateur de CSP', () => {
    // `tools/deploiement/generer-config-swa.mjs` n'autorise nommément que
    // `id="init-theme"` et échoue sur tout autre script inline : ce test fait
    // échouer la suite AVANT la construction, là où le message est plus clair.
    const inlines = scriptsInline();
    expect(inlines).toHaveLength(1);
    expect(inlines[0].attrs).toMatch(/(?:^|\s)id\s*=\s*"init-theme"/);
  });

  it('s’exécute de façon synchrone — pas de `type="module"`, pas de `src`', () => {
    // `type="module"` DIFFÈRE l'exécution après l'analyse du document : l'attribut
    // suffirait à annuler tout l'anti-flash sans qu'aucun autre gate ne bronche.
    // (`defer` et `async`, eux, sont ignorés sur un script inline — ce ne sont
    // pas eux le risque, et ce test ne prétend donc pas les couvrir.)
    const { attrs } = scriptsInline()[0];
    expect(attrs).not.toMatch(/(?:^|\s)type\s*=/);
    expect(attrs).not.toMatch(/(?:^|\s)src\s*=/);
  });

  it('ne referme pas prématurément sa propre balise', () => {
    // `</script>` dans le corps couperait le script en deux au parsing, et le
    // hachage calculé depuis l'artéfact porterait alors sur un fragment.
    expect(CODE).not.toContain('</script');
  });
});

describe('Script anti-flash — thème épinglé', () => {
  it('pose data-theme="sombre" quand le visiteur a épinglé le sombre', () => {
    const { themePose, cleLue } = executer(() => 'sombre');
    expect(themePose).toBe('sombre');
    expect(cleLue).toBe(CLE);
  });

  it('pose data-theme="clair" quand le visiteur a épinglé le clair', () => {
    expect(executer(() => 'clair').themePose).toBe('clair');
  });
});

describe('Script anti-flash — état « système »', () => {
  // L'ABSENCE d'attribut EST l'état système : `_themes.scss` laisse alors
  // `prefers-color-scheme` décider. Poser quoi que ce soit ici épinglerait le
  // visiteur à son insu et gèlerait le site sur un thème.
  it('ne pose rien quand aucune préférence n’est enregistrée', () => {
    expect(executer(() => null).themePose).toBeNull();
  });

  it('ne pose rien pour la valeur « systeme » qu’écrira le ThemeService', () => {
    expect(executer(() => 'systeme').themePose).toBeNull();
  });
});

describe('Script anti-flash — robustesse', () => {
  it('ignore une valeur hors de la liste blanche', () => {
    // `localStorage` est modifiable par le visiteur : sa valeur ne doit jamais
    // atteindre `setAttribute` sans avoir été comparée à une liste fermée.
    for (const valeur of ['SOMBRE', 'dark', ' sombre', 'sombre"><script>', '']) {
      expect(executer(() => valeur).themePose).toBeNull();
    }
  });

  it('n’écrit jamais dans le stockage', () => {
    expect(executer(() => 'sombre').ecritures).toBe(0);
    expect(executer(() => null).ecritures).toBe(0);
  });

  it('n’épingle que des thèmes que la feuille de styles sait rendre', () => {
    // LE test qui relie les deux moitiés du contrat. Le script écrit `data-theme`,
    // `_themes.scss` le lit : renommer un thème d'un seul côté laisserait le
    // visiteur épinglé sur un sélecteur qui n'existe plus — page rendue en clair,
    // aucun message, aucun test rouge. On compare donc les deux ensembles.
    const litterauxDuScript = [...CODE.matchAll(/theme === '([^']+)'/g)].map((m) => m[1]);
    const css = compile(join(process.cwd(), 'src', 'styles.scss'), {
      loadPaths: [join(process.cwd(), 'src', 'styles')],
    }).css;
    const themesDuCss = new Set([...css.matchAll(/\[data-theme=['"]?([\w-]+)['"]?\]/g)].map((m) => m[1]));

    expect(litterauxDuScript.length).toBeGreaterThan(0);
    expect(new Set(litterauxDuScript)).toEqual(themesDuCss);
  });

  it('survit à un stockage inaccessible (navigation privée, cookies bloqués)', () => {
    // Sans le `try`, l'exception remonterait dans le `<head>` — avant Angular,
    // donc avant toute page. Le site doit alors s'afficher en thème système.
    let resultat: Execution | undefined;
    expect(() => {
      resultat = executer(() => {
        throw new DOMException('accès refusé', 'SecurityError');
      });
    }).not.toThrow();
    expect(resultat?.themePose).toBeNull();
  });
});
