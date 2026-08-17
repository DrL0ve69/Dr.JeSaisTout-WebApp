// =============================================================================
// resoudreLecon — le seul garde-fou du lot qui décide QUELLE leçon se charge
// -----------------------------------------------------------------------------
// POURQUOI CE FICHIER EXISTE. `resoudre-lecon.ts` porte deux marqueurs 🔴 — la
// propriété PROPRE (`Object.hasOwn`) et le slug qui ne ressort pas — et aucun test
// ne les tenait : retirer le `Object.hasOwn` laissait `npm test` entièrement vert.
// Un garde-fou que rien ne mesure est une intention, pas un gate (L-005, L-019).
//
// LA CARTE EST INJECTÉE, PAS MOQUÉE. `src/content-generated/carte-lecons.ts` est
// généré et vaut `{}` tant que `content/` est vide (jusqu'à E3-ST1) : sur la vraie
// carte, le cas « slug connu » n'existerait pas et les deux autres seraient verts
// pour la mauvaise raison. Le résolveur lit donc son `CARTE_LECONS` par injection —
// jumeau de `MANIFESTE_LECONS`, même raison (L-005). Ce n'est pas un détour de
// confort : le système de tests d'Angular 22 REFUSE `vi.mock` sur un import relatif
// (« Please use Angular TestBed for mocking dependencies »), et le défaut du jeton
// reste la vraie carte, donc l'application ne câble rien.
//
// La carte fournie ici est un objet LITTÉRAL, donc elle hérite bel et bien de
// `Object.prototype` — c'est exactement le danger qu'on veut reproduire, et le
// premier test le CONSTATE avant d'exiger la redirection.
//
// LA LEÇON DE TEST EST ÉCRITE ICI, MINIMALE ET CONTRÔLÉE PAR `satisfies
// LeconCompilee` (type ambiant de `tools/content-pipeline/types.d.ts`) : c'est
// TypeScript qui la garde conforme au contrat, pas une relecture (L-016). Elle ne
// remplace pas la leçon-témoin réellement compilée par `lecon.spec.ts` — ce qui se
// mesure ici est le CHOIX du chargeur, pas la forme du contenu.
// =============================================================================

import { TestBed } from '@angular/core/testing';
import {
  RedirectCommand,
  convertToParamMap,
  provideRouter,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
} from '@angular/router';

import { type ChargeurLecon } from '../../../../content-generated/carte-lecons';
import { CARTE_LECONS, resoudreLecon } from './resoudre-lecon';

const SLUG_CONNU = 'lecon-connue';
const SLUG_MALFORME = 'lecon-malformee';

/**
 * Une leçon minimale mais CONFORME : un champ oublié ou un statut hors union
 * rougirait à la compilation, sans qu'aucune assertion ne le fasse taire.
 */
const LECON_VALIDE = {
  frontmatter: {
    titre: 'Une leçon de test',
    slug: SLUG_CONNU,
    sujet: 'securite-web',
    ordre: 1,
    niveau: 'cegep',
    dureeEstimee: 20,
    objectifs: ['Expliquer ce que ce test mesure'],
    prerequis: [],
    fichesSources: ['web/securite/xss-cross-site-scripting.md'],
    cree: '2026-08-17',
    maj: '2026-08-17',
    statut: 'publiee',
  },
  sections: [{ titre: 'Introduction', ancre: 'introduction', niveau: 2, blocs: [] }],
  // Le quiz est OBLIGATOIRE au contrat depuis E2-ST3 (lot B) : `satisfies LeconCompilee`
  // refuserait cette leçon sans lui. Réduit au strict nécessaire — ce qui se mesure ici
  // est le CHOIX du chargeur, pas la forme du quiz, dont l'enveloppe est éprouvée par
  // `lecon.spec.ts` sur une leçon réellement compilée.
  quiz: {
    lecon: SLUG_CONNU,
    titre: 'Quiz de test',
    questions: [
      {
        id: 'q1',
        type: 'vrai-faux',
        // Pas de `ficheSource` : le champ est exigé sur la SOURCE (`quiz.json`) et retiré à
        // l'émission — le contrat compilé ne le porte pas, et `satisfies` le refuserait ici.
        affirmation: 'Ce test mesure le choix du chargeur, pas la forme du quiz.',
        bonneReponse: true,
        justification:
          'La forme du quiz est éprouvée ailleurs, sur une leçon compilée pour de vrai.',
      },
    ],
  },
} satisfies LeconCompilee;

/**
 * La carte de test. Deux entrées : une leçon conforme, et un JSON présent mais hors
 * contrat — c'est LUI qui fait parler `lireLeconCompilee`, donc qui rend la
 * provenance observable.
 */
const CARTE_DE_TEST: Record<string, ChargeurLecon> = {
  [SLUG_CONNU]: () => Promise.resolve({ default: LECON_VALIDE }),
  [SLUG_MALFORME]: () => Promise.resolve({ default: { frontmatter: {}, sections: [] } }),
};

/** Une route porteuse d'un `:slug`, réduite à ce que `resoudreLecon` lit vraiment. */
function routePourSlug(slug: string): ActivatedRouteSnapshot {
  return { paramMap: convertToParamMap({ slug }) } as unknown as ActivatedRouteSnapshot;
}

/**
 * Exécute le `ResolveFn` dans un contexte d'injection muni d'un vrai `Router`.
 * La configuration du `TestBed` est faite UNE fois par test (`beforeEach`) : la
 * refaire ici casserait dès qu'un test résout deux slugs — le module de test est
 * instancié au premier `runInInjectionContext`.
 */
function resoudre(slug: string): Promise<LeconCompilee | RedirectCommand> {
  return TestBed.runInInjectionContext(() =>
    resoudreLecon(routePourSlug(slug), {} as RouterStateSnapshot),
  ) as Promise<LeconCompilee | RedirectCommand>;
}

/** La cible attendue de toute redirection : la page 404 réellement prerendue. */
function cibleDe(resultat: LeconCompilee | RedirectCommand): string {
  expect(resultat).toBeInstanceOf(RedirectCommand);
  return String((resultat as RedirectCommand).redirectTo);
}

describe('resoudreLecon — le choix du chargeur', () => {
  const HERITES = ['constructor', 'toString', 'valueOf'];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: CARTE_LECONS, useValue: CARTE_DE_TEST }],
    });
  });

  it('REDIRIGE un slug hérité de `Object.prototype` plutôt que d’appeler la fonction héritée', async () => {
    // CONTRÔLE POSITIF DU DANGER (L-010) : sans lui, les assertions suivantes
    // seraient vertes sur une carte qui n'hériterait de rien.
    for (const herite of HERITES) {
      expect(herite in CARTE_DE_TEST).toBe(true);
      expect(Object.hasOwn(CARTE_DE_TEST, herite)).toBe(false);
      expect(typeof (CARTE_DE_TEST as Record<string, unknown>)[herite]).toBe('function');
    }

    for (const herite of HERITES) {
      expect(cibleDe(await resoudre(herite))).toBe('/404');
    }
  });

  it('REDIRIGE un slug absent de la carte, sans en réafficher un mot', async () => {
    const forge = 'votre-compte-est-compromis-appelez-le-1-800-000-0000';
    const cible = cibleDe(await resoudre(forge));

    expect(cible).toBe('/404');
    // 🔴 Le slug de l'URL s'arrête ici : il n'atteint ni un message, ni une cible.
    expect(cible).not.toContain('1-800');
    expect(cible).not.toContain('compromis');
  });

  it('rend la `LeconCompilee` d’un slug connu, chargée par SON chargeur', async () => {
    const resultat = await resoudre(SLUG_CONNU);

    expect(resultat).not.toBeInstanceOf(RedirectCommand);
    const lecon = resultat as LeconCompilee;
    expect(lecon.frontmatter.slug).toBe(SLUG_CONNU);
    expect(lecon.sections.map((section) => section.ancre)).toEqual(['introduction']);
  });

  it('nomme le fichier par la CLEF de la carte, jamais par l’URL, quand le JSON est hors contrat', async () => {
    // La provenance n'est observable que par le message d'échec : c'est le seul
    // endroit où `resoudreLecon` écrit du texte, et il ne cite que du nôtre.
    await expect(resoudre(SLUG_MALFORME)).rejects.toThrow(
      `src/content-generated/lecons/${SLUG_MALFORME}.json`,
    );
  });
});
