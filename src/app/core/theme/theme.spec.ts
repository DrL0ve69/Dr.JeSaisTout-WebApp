// =============================================================================
// Tests du ThemeService — la moitié « écriture » du contrat de thème
// -----------------------------------------------------------------------------
// `src/init-theme.spec.ts` vérifie la LECTURE (le script inline anti-flash).
// Ce fichier vérifie l'ÉCRITURE : même clé, mêmes trois états, même attribut.
//
// Deux trompe-l'œil sont nécessaires, et pour deux raisons opposées :
//  · `matchMedia` — jsdom le fournit mais n'évalue JAMAIS `prefers-color-scheme`
//    (il rend toujours `matches: false` et ne déclenche aucun `change`). Un test
//    de la préférence système sans faux `matchMedia` ne testerait donc rien.
//  · `localStorage` — jsdom en fournit un vrai, qu'on utilise tel quel ; on ne
//    l'espionne que pour lui faire LEVER une exception, ce que le navigateur
//    fait réellement en navigation privée ou au dépassement de quota.
//
// L'élément `<html>` est PARTAGÉ entre tous les tests du fichier (et du run) :
// l'attribut et le stockage sont remis à zéro avant ET après chaque test, sans
// quoi un test qui épingle « sombre » ferait échouer le suivant.
//
// ⚠️ CE QU'UN TEST DE COMPORTEMENT NE PEUT PAS PROUVER, ET POURQUOI IL Y A PLUS
// BAS UN GROUPE « contrat ». Tout ce fichier importe `CLE_THEME` et
// `ATTRIBUT_THEME` DU SERVICE QU'IL TESTE : renommer la clé en
// « drjst-theme-v2 » laisserait donc tous ces tests verts pendant que le service
// écrirait une clé qu'`index.html` ne lit pas. Un test qui importe la constante
// qu'il vérifie ne vérifie rien du contrat. Le groupe « contrat du thème »
// compare chaque constante à L'AUTRE EXTRÉMITÉ, lue depuis sa source au disque —
// même technique que `src/init-theme.spec.ts`.
// =============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { compile } from 'sass';

import { ATTRIBUT_THEME, CLE_THEME, REQUETE_SOMBRE, THEMES, Theme, ThemeService } from './theme';

/** La fenêtre du document de test — celle-là même que le service atteint. */
function fenetre(): Window {
  const vue = document.defaultView;
  if (!vue) {
    throw new Error('Aucune fenêtre : ces tests exigent un environnement DOM.');
  }
  return vue;
}

function racine(): HTMLElement {
  return document.documentElement;
}

type EcouteurMedia = (evenement: MediaQueryListEvent) => void;

/** Faux `matchMedia` pilotable, installé AVANT l'injection du service. */
function installerPreferenceSysteme(sombreAuDepart: boolean) {
  const ecouteurs = new Set<EcouteurMedia>();
  const requetesDemandees: string[] = [];

  const liste = {
    matches: sombreAuDepart,
    media: REQUETE_SOMBRE,
    addEventListener: (_type: string, ecouteur: EcouteurMedia) => {
      ecouteurs.add(ecouteur);
    },
    removeEventListener: (_type: string, ecouteur: EcouteurMedia) => {
      ecouteurs.delete(ecouteur);
    },
  };

  // Objet partiel : le service n'utilise que ces quatre membres, et un
  // `MediaQueryList` complet ne se construit pas à la main.
  const faux = liste as unknown as MediaQueryList;
  fenetre().matchMedia = ((requete: string) => {
    requetesDemandees.push(requete);
    return faux;
  }) as typeof window.matchMedia;

  return {
    /** Simule un basculement de l'OS pendant la vie du service. */
    basculer(sombre: boolean): void {
      liste.matches = sombre;
      for (const ecouteur of ecouteurs) {
        ecouteur({ matches: sombre } as MediaQueryListEvent);
      }
    },
    get nombreEcouteurs(): number {
      return ecouteurs.size;
    },
    get requetesDemandees(): readonly string[] {
      return requetesDemandees;
    },
  };
}

/**
 * Le CORPS du `<script id="init-theme">` de `src/index.html`, lu au disque.
 *
 * On extrait le script plutôt que de chercher dans le fichier entier : le
 * commentaire qui précède la balise cite lui aussi `drjst-theme`, et une
 * assertion sur tout le HTML resterait donc verte après un renommage de la clé
 * dans le script seul (piège L-010 — la même chaîne existe deux fois).
 */
function corpsDuScriptInitTheme(): string {
  const html = readFileSync(join(process.cwd(), 'src', 'index.html'), 'utf8');
  const corps = /<script[^>]*\bid\s*=\s*"init-theme"[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1];
  if (corps === undefined) {
    throw new Error('Aucun <script id="init-theme"> dans src/index.html.');
  }
  return corps;
}

/** Le CSS réellement produit par la feuille de styles du site. */
function cssCompile(): string {
  return compile(join(process.cwd(), 'src', 'styles.scss'), {
    loadPaths: [join(process.cwd(), 'src', 'styles')],
  }).css;
}

describe('ThemeService', () => {
  let matchMediaOriginal: typeof window.matchMedia;

  beforeEach(() => {
    matchMediaOriginal = fenetre().matchMedia;
    installerPreferenceSysteme(false);
    fenetre().localStorage.clear();
    racine().removeAttribute(ATTRIBUT_THEME);
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fenetre().matchMedia = matchMediaOriginal;
    fenetre().localStorage.clear();
    racine().removeAttribute(ATTRIBUT_THEME);
  });

  describe('état initial', () => {
    it('démarre en « systeme » et ne pose aucun attribut quand rien n’est stocké', () => {
      const service = TestBed.inject(ThemeService);

      expect(service.choix()).toBe('systeme');
      expect(racine().hasAttribute(ATTRIBUT_THEME)).toBe(false);
    });

    it('relit un choix épinglé et réaligne l’attribut', () => {
      // En ligne, le script inline a déjà posé l'attribut ; ici on vérifie que
      // le service arrive au même résultat par lui-même, sans en dépendre.
      fenetre().localStorage.setItem(CLE_THEME, 'sombre');

      const service = TestBed.inject(ThemeService);

      expect(service.choix()).toBe('sombre');
      expect(racine().getAttribute(ATTRIBUT_THEME)).toBe('sombre');
    });

    it('RETIRE un attribut orphelin quand rien n’est stocké', () => {
      // La moitié manquante de l'auto-réparation : le service ne fait pas que
      // POSER l'attribut absent, il retire celui qui n'a plus de choix derrière
      // lui. Cas réel : le visiteur revient à « systeme » dans un autre onglet,
      // ou une extension a laissé l'attribut d'une session précédente. Sans ce
      // retrait, la page resterait épinglée en sombre alors que l'état, lui,
      // dit « systeme » — le DOM et le signal divergeraient en silence.
      racine().setAttribute(ATTRIBUT_THEME, 'sombre');

      const service = TestBed.inject(ThemeService);

      expect(service.choix()).toBe('systeme');
      expect(racine().hasAttribute(ATTRIBUT_THEME)).toBe(false);
    });

    it('interroge bien `(prefers-color-scheme: dark)`', () => {
      // La requête doit être la MÊME que le bloc `@media` de `_themes.scss` ;
      // une faute de frappe rendrait `themeEffectif` faux en silence.
      const media = installerPreferenceSysteme(true);
      TestBed.inject(ThemeService);

      expect(media.requetesDemandees).toContain('(prefers-color-scheme: dark)');
    });
  });

  describe('aller-retour des trois états', () => {
    it('épingle « clair » : signal, attribut et stockage', () => {
      const service = TestBed.inject(ThemeService);

      service.definir('clair');

      expect(service.choix()).toBe('clair');
      expect(racine().getAttribute(ATTRIBUT_THEME)).toBe('clair');
      expect(fenetre().localStorage.getItem(CLE_THEME)).toBe('clair');
    });

    it('épingle « sombre » : signal, attribut et stockage', () => {
      const service = TestBed.inject(ThemeService);

      service.definir('sombre');

      expect(service.choix()).toBe('sombre');
      expect(racine().getAttribute(ATTRIBUT_THEME)).toBe('sombre');
      expect(fenetre().localStorage.getItem(CLE_THEME)).toBe('sombre');
    });

    it('« systeme » RETIRE l’attribut posé par un choix précédent', () => {
      // Le point le plus facile à rater : poser `data-theme="systeme"` ne
      // correspond à aucun sélecteur de `_themes.scss` et gèlerait la page en
      // clair sur un OS en sombre. L'absence d'attribut EST l'état système.
      const service = TestBed.inject(ThemeService);
      service.definir('sombre');

      service.definir('systeme');

      expect(service.choix()).toBe('systeme');
      expect(racine().hasAttribute(ATTRIBUT_THEME)).toBe(false);
    });

    it('persiste « systeme » LITTÉRALEMENT, il ne l’efface pas du stockage', () => {
      // Contrat du backlog (E1-ST1, l.226) : la même clé porte les trois états.
      // Le script inline traite déjà « systeme » comme « ne rien épingler ».
      const service = TestBed.inject(ThemeService);

      service.definir('systeme');

      expect(fenetre().localStorage.getItem(CLE_THEME)).toBe('systeme');
    });
  });

  describe('robustesse du stockage', () => {
    it('lit toute valeur hors liste blanche comme « systeme »', () => {
      // `localStorage` est modifiable par le visiteur : sa valeur ne doit jamais
      // atteindre `setAttribute` sans avoir traversé une liste fermée.
      for (const valeur of ['rose', '', 'SOMBRE', 'dark', ' sombre', 'systeme"><script>']) {
        TestBed.resetTestingModule();
        racine().removeAttribute(ATTRIBUT_THEME);
        fenetre().localStorage.setItem(CLE_THEME, valeur);

        const service = TestBed.inject(ThemeService);

        expect(service.choix(), `valeur stockée : « ${valeur} »`).toBe('systeme');
        expect(racine().hasAttribute(ATTRIBUT_THEME)).toBe(false);
      }
    });

    it('survit à un stockage qui lève en LECTURE', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('accès refusé', 'SecurityError');
      });

      let service: ThemeService | undefined;
      expect(() => {
        service = TestBed.inject(ThemeService);
      }).not.toThrow();
      expect(service?.choix()).toBe('systeme');
    });

    it('survit à un stockage qui lève en ÉCRITURE, et bascule quand même', () => {
      // Un stockage indisponible ne doit jamais empêcher la bascule de
      // fonctionner pour la session en cours.
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('quota dépassé', 'QuotaExceededError');
      });
      const service = TestBed.inject(ThemeService);

      expect(() => service.definir('sombre')).not.toThrow();

      expect(service.choix()).toBe('sombre');
      expect(racine().getAttribute(ATTRIBUT_THEME)).toBe('sombre');
    });
  });

  describe('thème effectif', () => {
    it('résout « systeme » en sombre quand l’OS est en sombre', () => {
      installerPreferenceSysteme(true);
      const service = TestBed.inject(ThemeService);

      expect(service.choix()).toBe('systeme');
      expect(service.themeEffectif()).toBe('sombre');
    });

    it('résout « systeme » en clair quand l’OS est en clair', () => {
      installerPreferenceSysteme(false);
      const service = TestBed.inject(ThemeService);

      expect(service.themeEffectif()).toBe('clair');
    });

    it('ignore la préférence système dès qu’un thème est épinglé', () => {
      installerPreferenceSysteme(true);
      const service = TestBed.inject(ThemeService);

      service.definir('clair');

      expect(service.themeEffectif()).toBe('clair');
    });

    it('suit un changement de préférence de l’OS à chaud, sans rechargement', () => {
      const media = installerPreferenceSysteme(false);
      const service = TestBed.inject(ThemeService);
      expect(service.themeEffectif()).toBe('clair');

      media.basculer(true);

      expect(service.themeEffectif()).toBe('sombre');
    });

    it('cesse d’écouter l’OS quand l’injecteur est détruit', () => {
      // Sans le `DestroyRef`, chaque instanciation laisserait un écouteur
      // derrière elle — fuite invisible tant qu'on ne la compte pas.
      const media = installerPreferenceSysteme(false);
      TestBed.inject(ThemeService);
      expect(media.nombreEcouteurs).toBe(1);

      TestBed.resetTestingModule();

      expect(media.nombreEcouteurs).toBe(0);
    });
  });

  describe('navigateur sans `matchMedia`', () => {
    it('s’injecte sans lever et bascule quand même à la main', () => {
      // `matchMedia` manque encore sur de vieux moteurs embarqués et sur
      // certains environnements de test. Seule la RÉSOLUTION de « systeme » doit
      // y perdre : la bascule manuelle, elle, n'en dépend pas et doit continuer
      // de peindre. Sans ce test, la garde `?.()` du service n'est vérifiée que
      // par lecture — jsdom fournit toujours `matchMedia`.
      fenetre().matchMedia = undefined as unknown as typeof window.matchMedia;

      let service: ThemeService | undefined;
      expect(() => {
        service = TestBed.inject(ThemeService);
      }).not.toThrow();

      service?.definir('sombre');

      expect(service?.choix()).toBe('sombre');
      expect(racine().getAttribute(ATTRIBUT_THEME)).toBe('sombre');
    });
  });

  describe('liste blanche de `definir`', () => {
    it('ignore un état inconnu au lieu de l’épingler', () => {
      // La liste blanche doit tenir SEULE, sans s'appuyer sur le compilateur :
      // ce dépôt n'active pas `strict`, et un appelant JavaScript (ou un
      // `undefined` traversant un `?.`) atteindrait `setAttribute` sans elle.
      // Épingler un état inconnu ne serait pas un XSS — `setAttribute` n'exécute
      // rien — mais poserait un sélecteur que `_themes.scss` ne connaît pas.
      const service = TestBed.inject(ThemeService);
      service.definir('sombre');

      service.definir('rose' as unknown as Theme);

      expect(service.choix()).toBe('sombre');
      expect(racine().getAttribute(ATTRIBUT_THEME)).toBe('sombre');
      expect(fenetre().localStorage.getItem(CLE_THEME)).toBe('sombre');
    });
  });

  describe('prerender (Node, `PLATFORM_ID` serveur)', () => {
    it('n’effleure NI le stockage NI `matchMedia`, et ne pose aucun attribut', () => {
      // Pourquoi ce test malgré un `npm run build` vert : le service n'étant
      // injecté nulle part encore, il est ÉLAGUÉ du bundle — la construction ne
      // prouve donc rien sur sa sûreté au prerender (L-005 : un vert ne prouve
      // pas qu'une vérification a tourné). Il faut l'instancier ici avec
      // `PLATFORM_ID` serveur pour exercer le `return` anticipé du constructeur.
      //
      // Les DEUX espions sont le cœur du test : sans eux, il resterait vert
      // gardes retirées (un stockage vide donne « systeme » sans attribut de
      // toute façon). Ce qu'on vérifie, c'est que le code n'a même pas TENTÉ de
      // toucher au navigateur — dans Node, ces API n'existent pas et l'accès
      // lèverait, faisant échouer le prerender de toutes les routes.
      const lectureStockage = vi.spyOn(Storage.prototype, 'getItem');
      const interrogationMedia = vi.fn();
      fenetre().matchMedia = interrogationMedia as unknown as typeof window.matchMedia;

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const service = TestBed.inject(ThemeService);

      expect(service.choix()).toBe('systeme');
      expect(racine().hasAttribute(ATTRIBUT_THEME)).toBe(false);
      expect(lectureStockage).not.toHaveBeenCalled();
      expect(interrogationMedia).not.toHaveBeenCalled();
    });

    it('laisse `definir` changer le signal SANS toucher au DOM ni au stockage', () => {
      // Le HTML prerendu est le même fichier pour tous les visiteurs : y écrire
      // un `data-theme` épinglerait le choix d'un seul sur la page servie à
      // tout le monde. Seul le signal bouge.
      const ecritureStockage = vi.spyOn(Storage.prototype, 'setItem');

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const service = TestBed.inject(ThemeService);

      service.definir('sombre');

      expect(service.choix()).toBe('sombre');
      expect(racine().hasAttribute(ATTRIBUT_THEME)).toBe(false);
      expect(ecritureStockage).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
// LE CONTRAT — chaque constante confrontée à l'autre extrémité, lue au disque
// -----------------------------------------------------------------------------
// Ces tests n'instancient RIEN. Ils ne décrivent pas un comportement : ils
// répondent à la seule question que les tests ci-dessus ne peuvent pas poser,
// puisqu'ils importent du service les constantes qu'ils vérifient — « la valeur
// que le service écrit est-elle bien celle que l'autre moitié lit ? ».
//
// Les deux autres moitiés vivent hors de TypeScript : `src/index.html` (du JS
// écrit à la main, que rien ne type) et `_themes.scss` (des sélecteurs CSS).
// On les lit donc à leur source, le SCSS étant compilé pour de vrai — la valeur
// littérale d'un sélecteur n'est visible qu'après compilation.
// =============================================================================
describe('contrat du thème — les trois moitiés doivent se répondre', () => {
  it('`CLE_THEME` est bien la clé que lit le script anti-flash d’`index.html`', () => {
    expect(corpsDuScriptInitTheme()).toContain(`'${CLE_THEME}'`);
  });

  it('`ATTRIBUT_THEME` est bien l’attribut que ciblent les sélecteurs compilés', () => {
    // `[data-theme=…]` ou `:not([data-theme])` : les deux formes comptent.
    expect(cssCompile()).toMatch(new RegExp(`\\[${ATTRIBUT_THEME}[\\]=]`));
  });

  it('les états épinglables sont EXACTEMENT ceux que la feuille de styles sait peindre', () => {
    // Ensembles comparés dans les deux sens : un état ajouté au service sans
    // sélecteur (page gelée en clair) et un sélecteur orphelin (thème mort dans
    // le CSS) sortent tous deux rouges.
    const epinglables = new Set<string>(THEMES.filter((theme) => theme !== 'systeme'));
    const selecteurs = new Set(
      [...cssCompile().matchAll(new RegExp(`\\[${ATTRIBUT_THEME}=['"]?([\\w-]+)['"]?\\]`, 'g'))].map(
        (correspondance) => correspondance[1],
      ),
    );

    expect(epinglables.size).toBeGreaterThan(0);
    expect(selecteurs).toEqual(epinglables);
  });

  it('« systeme » n’a AUCUN sélecteur — son absence d’attribut EST l’état', () => {
    // Le piège le plus facile à introduire plus tard : ajouter
    // `[data-theme='systeme']` au SCSS « pour être complet ». Ce sélecteur
    // gagnerait sur le bloc `prefers-color-scheme` et gèlerait la page en clair
    // sur un OS en sombre.
    expect(cssCompile()).not.toContain(`[${ATTRIBUT_THEME}='systeme']`);
  });
});
