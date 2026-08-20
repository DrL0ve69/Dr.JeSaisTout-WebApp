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

/** Le `src/index.html` versionné, lu au disque. */
function indexHtml(): string {
  return readFileSync(join(process.cwd(), 'src', 'index.html'), 'utf8');
}

/**
 * Les thèmes épinglables que la feuille de styles NE SAIT PLUS peindre en phase 1.
 *
 * 🔴 LISTE REVUE À LA MAIN, JAMAIS DÉRIVÉE DU CSS COMPILÉ. Une exemption calculée
 * depuis la sortie qu'elle est censée contraindre ne contraint rien (S-002/S-005) :
 * elle se mettrait à jour toute seule le jour où un sélecteur disparaît, ce qui est
 * exactement l'accident qu'on veut faire rougir.
 *
 * POURQUOI ELLE EXISTE. Décision D-2 du 2026-08-17 : la phase 1 ne rend qu'un
 * thème, le sombre. `_themes.scss` a donc RETIRÉ le mixin `jetons-theme-clair` et
 * tous ses sélecteurs `[data-theme=…]` — « clair » n'a plus de peau.
 *
 * ⚠️ ELLE NE CONTIENT QUE « clair », ET C'EST UNE MESURE, PAS UNE INTUITION. La
 * première rédaction de ce lot y avait mis « sombre » aussi, en croyant `:root`
 * seul responsable de la peau ; le test ci-dessous a rendu `Set{'sombre'}` et l'a
 * réfutée. Le sélecteur `:root[data-theme='sombre']` survit dans
 * `_coloration-syntaxique-generee.scss` — la feuille GÉNÉRÉE par le pipeline de
 * contenu pour la coloration Shiki, qui a gardé la bascule à deux thèmes.
 *
 * CE QUE L'EXEMPTION NE RENDRAIT PAS SÛRE TOUTE SEULE : `definir('clair')` pose un
 * attribut que plus rien ne peint. C'est inoffensif UNIQUEMENT parce qu'aucun
 * composant rendu n'appelle `definir()` — `bascule-theme` n'est plus composée dans
 * `EnTete` (tripwire dans `en-tete.spec.ts`). Recomposer la bascule sans vider
 * cette liste gèlerait la page.
 */
// 🔴 « sombre » A REJOINT CETTE LISTE LE 2026-08-20, et ce n'est pas un
// relâchement. Le dernier `[data-theme='sombre']` du dépôt vivait dans la feuille
// de coloration syntaxique générée ; il a disparu quand `compiler-markdown.mjs` a
// cessé d'émettre une bascule à deux thèmes (elle laissait un visiteur au système
// CLAIR recevoir des blocs de code blancs sur une page noire). Le thème sombre est
// désormais peint SANS CONDITION sur `:root` : il n'a plus besoin de sélecteur,
// et un sélecteur qui reviendrait signalerait précisément le retour d'une cascade
// conditionnelle. L'ensemble attendu est donc VIDE — et un ensemble vide attendu
// attrape encore tout ce qui apparaît.
const THEMES_SANS_SELECTEUR_PHASE_1: ReadonlySet<string> = new Set(['clair', 'sombre']);

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
//
// ⚠️ EN PHASE 1, DEUX DE CES TROIS MOITIÉS SONT VIDES, ET C'EST LE CONTRAT (E6,
// 2026-08-20) : `index.html` n'a plus de script inline, `_themes.scss` n'a plus de
// sélecteur `[data-theme]`. Ces tests ne se sont pas ramollis pour autant — ils
// prouvent désormais l'ABSENCE, ce qui est une affirmation aussi forte et
// exactement aussi facile à casser par accident. E4-ST1 les réinversera.
// =============================================================================
describe('contrat du thème — les trois moitiés doivent se répondre', () => {
  it('`index.html` ne porte AUCUN script inline — `script-src` est à zéro hachage', () => {
    // ⚠️ TEST RETOURNÉ LE 2026-08-20 (bascule E6). Il exigeait auparavant que le
    // `<script id="init-theme">` d'`index.html` lise bien `CLE_THEME` : c'était la
    // moitié « hors TypeScript » du contrat. Ce script a été SUPPRIMÉ — en phase 1
    // il n'y a plus qu'un thème, il n'avait plus rien à lire, et un script inline
    // qui ne fait rien conserve une permission CSP pour du code mort (S-005).
    //
    // CE QUE CE TEST PROUVE MAINTENANT, et que rien d'autre en `src/` ne dit : la
    // page d'amorçage versionnée n'introduit aucun script inline. C'est la moitié
    // AMONT du garde-fou `hachagesScript.size !== 0` de
    // `tools/deploiement/generer-config-swa.mjs`, qui, lui, mesure l'ARTÉFACT. Les
    // deux sont nécessaires : celui-ci rougit en `npm test`, à la seconde où la
    // balise est écrite ; l'autre attrape ce que la construction injecterait sans
    // qu'aucun humain n'ait édité ce fichier.
    //
    // `CLE_THEME` reste importée et exercée par les tests de service ci-dessus :
    // c'est la clé de `localStorage`, que E4-ST1 relira intacte.
    const html = indexHtml();

    expect(html).not.toMatch(/<script[\s>/]/i);
    expect(html, 'la clé de thème n’a plus rien à faire dans la page d’amorçage').not.toContain(
      CLE_THEME,
    );
  });

  it('la feuille compilée n’émet aucun sélecteur de thème que le service ne connaisse pas', () => {
    // Ensembles comparés dans les DEUX SENS, comme avant — c'est ce qui fait la
    // sensibilité de ce test, et le retrait du thème clair ne l'a pas entamée :
    //   · un sélecteur ORPHELIN (`[data-theme='dark']`, un thème mort dans le CSS)
    //     n'est dans aucun des deux ensembles attendus → rouge ;
    //   · un état ajouté à `THEMES` SANS sélecteur → rouge, à moins qu'un humain
    //     ne l'ait explicitement inscrit dans `THEMES_SANS_SELECTEUR_PHASE_1`,
    //     c'est-à-dire ne l'ait REVU.
    // La seule chose qui a changé, c'est que l'ensemble attendu est aujourd'hui
    // VIDE — et un ensemble vide attendu attrape encore tout ce qui apparaît.
    const epinglables = new Set<string>(THEMES.filter((theme) => theme !== 'systeme'));
    const selecteurs = new Set(
      [...cssCompile().matchAll(new RegExp(`\\[${ATTRIBUT_THEME}=['"]?([\\w-]+)['"]?\\]`, 'g'))].map(
        (correspondance) => correspondance[1],
      ),
    );

    // Garde-fou contre le vert vide, et garde-fou sur l'exemption elle-même : une
    // liste d'exemption qui nomme un thème inexistant est une liste périmée, et
    // elle masquerait le jour où ce nom reviendrait (L-016).
    expect(epinglables.size).toBeGreaterThan(0);
    for (const exempte of THEMES_SANS_SELECTEUR_PHASE_1) {
      expect(
        epinglables.has(exempte),
        `« ${exempte} » est exempté de sélecteur mais n’est plus un thème épinglable`,
      ).toBe(true);
    }

    const attendus = new Set(
      [...epinglables].filter((theme) => !THEMES_SANS_SELECTEUR_PHASE_1.has(theme)),
    );
    expect(selecteurs).toEqual(attendus);
  });

  it('les JETONS de thème sont peints sans condition — seule la coloration Shiki reste à deux thèmes', () => {
    // 🔴 LE TEST QUI PORTE LA SÛRETÉ DE `THEMES_SANS_SELECTEUR_PHASE_1`, et sa
    // rédaction a dû être CORRIGÉE PAR LA MESURE — le récit vaut plus que le test.
    // La version écrite d'abord exigeait qu'aucun `prefers-color-scheme` ne subsiste
    // dans la feuille compilée. Elle est sortie ROUGE sur un dépôt sain : la
    // coloration syntaxique en porte un, et c'est un fait qu'il fallait apprendre
    // plutôt que faire taire (L-035 — une prémisse fausse rougit sur un produit
    // sain).
    //
    // CE QUI EST VRAI, MESURÉ : les jetons de thème de `_themes.scss` sont
    // inconditionnels (`:root { color-scheme: dark }` + les primitives sombres), et
    // le SEUL `prefers-color-scheme` de tout le CSS livré vient de
    // `_coloration-syntaxique-generee.scss`. On compare donc les deux comptes plutôt
    // que d'exiger zéro : c'est l'autre extrémité du contrat qui donne la valeur
    // attendue, jamais un chiffre recopié (L-012).
    //
    // ⚠️ CE QUE CE TEST NE CORRIGE PAS, ET QUI EST UNE DETTE RÉELLE POUR E6 : la
    // feuille de coloration applique ses couleurs CLAIRES par défaut et ne bascule
    // en sombre que sous `prefers-color-scheme: dark` ou `[data-theme='sombre']` —
    // deux conditions dont AUCUNE n'est vraie pour un visiteur dont l'OS est en
    // clair. Depuis le passage au thème sombre seul, ce visiteur reçoit donc des
    // blocs de code aux couleurs github-light sur une page noire. Ce fichier est
    // GÉNÉRÉ (`tools/content-pipeline/compiler-markdown.mjs`) : le correctif ne
    // s'écrit pas ici, et il n'appartient pas à ce lot. Ce test le NOMME pour qu'il
    // ne se redécouvre pas.
    const css = cssCompile();
    const feuilleShiki = readFileSync(
      join(process.cwd(), 'src', 'styles', '_coloration-syntaxique-generee.scss'),
      'utf8',
    );

    expect(css, '`:root` ne déclare plus `color-scheme: dark`').toContain('color-scheme: dark');

    // 🔴 LE CONTRAT S'EST DURCI DANS LE MÊME LOT. Ce test tolérait les
    // `prefers-color-scheme` de la coloration syntaxique, en NOMMANT cette
    // tolérance comme une dette. La dette est PAYÉE : `compiler-markdown.mjs`
    // n'émet plus de bascule à deux thèmes, parce qu'elle servait des blocs de
    // code github-LIGHT à tout visiteur dont le système est en clair. Il ne doit
    // donc plus rester AUCUNE requête de préférence de couleur nulle part.
    const total = [...css.matchAll(/prefers-color-scheme/g)].length;
    // 🔴 ON DÉCOMMENTE AVANT DE COMPTER, et c'est le même patron que le garde-fou
    // de la police du jalon. Le commentaire qui EXPLIQUE le correctif cite
    // forcément le motif qu'il a supprimé : compter le texte écrit plutôt que le
    // style appliqué faisait rougir ce test sur une feuille parfaitement saine.
    // C'est la famille L-021/L-025 du dépôt — une déclaration présente ne prouve
    // pas une déclaration appliquée, et sa mention ne prouve pas sa présence.
    const coloration = feuilleShiki.replace(new RegExp('//.*$', 'gm'), '');
    const dansLaColoration = [...coloration.matchAll(/prefers-color-scheme/g)].length;

    expect(
      total,
      'un `prefers-color-scheme` est apparu dans la feuille compilée : les jetons de thème ne sont plus peints sans condition, et l’exemption de sélecteur ci-dessus n’est plus sûre',
    ).toBe(0);
    expect(
      dansLaColoration,
      'la coloration syntaxique a retrouvé une bascule à deux thèmes — un visiteur au système CLAIR recevra des blocs de code blancs sur une page noire',
    ).toBe(0);

    // Garde-fou contre le vert vide (L-005) : deux ensembles vides se valident
    // trivialement, donc on prouve d'abord qu'on lit bien quelque chose — la
    // feuille compilée porte sa cascade d'impression, la feuille générée ses
    // classes de coloration.
    expect(css).toContain('@media print');
    expect(coloration).toContain('.shiki');
  });

  it('« systeme » n’a AUCUN sélecteur — son absence d’attribut EST l’état', () => {
    // Le piège le plus facile à introduire plus tard : ajouter
    // `[data-theme='systeme']` au SCSS « pour être complet ». Ce sélecteur
    // gagnerait sur le bloc `prefers-color-scheme` et gèlerait la page en clair
    // sur un OS en sombre.
    expect(cssCompile()).not.toContain(`[${ATTRIBUT_THEME}='systeme']`);
  });
});
