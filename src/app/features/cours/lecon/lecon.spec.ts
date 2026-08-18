// =============================================================================
// La page de leçon et son routage — E2-ST2, lot B
// -----------------------------------------------------------------------------
// LES DONNÉES DE CE FICHIER SONT COMPILÉES POUR DE VRAI, PAS ÉCRITES À LA MAIN.
// `beforeAll` lance l'orchestrateur du pipeline sur la LEÇON-TÉMOIN GRASSE
// (`tools/content-pipeline/__fixtures__/temoin/`) et lit ses sorties. Une fixture
// d'AST rédigée ici serait un troisième exemplaire du contrat, qui divergerait au
// premier champ ajouté (L-016) — et surtout, elle prouverait que la page sait
// afficher ce que le développeur imagine, pas ce que le pipeline produit.
//
// ⚠️ CE SPEC EXIGE LE CHROMIUM DE PLAYWRIGHT, comme
// `pipeline-contenu-orchestration.spec.ts` : la leçon-témoin porte deux diagrammes
// Mermaid, donc `mmdc` démarre le Chromium installé par `npm run e2e:install`.
// Aucun `skip` muet ne masque son absence — un test sauté en silence ne distingue
// pas « rien à vérifier » de « rien vérifié » (L-005). `diagnostic()` nomme la
// commande à lancer dans le rapport de Vitest lui-même.
//
// POURQUOI `content/` N'EST PAS UNE PREUVE ICI. Le dépôt livre un `content/` VIDE
// jusqu'à E3-ST1 : `src/content-generated/manifeste-routes.json` vaut `[]` et
// `carteLecons` vaut `{}`. Un test qui passerait par ces artéfacts-là ne mesurerait
// donc rien. On teste les fonctions PURES sur des données réelles, et le composant
// sur un manifeste injecté par `MANIFESTE_LECONS` — c'est la raison d'être de ce
// jeton (voir `contenu-compile.ts`).
//
// CE QUE CHAQUE GROUPE TIENT, ET SON CONTRÔLE POSITIF :
//   · la fixture elle-même — sans quoi tous les groupes suivants pourraient être
//     verts sur une leçon sans section de niveau 3, sans diagramme, sans rien ;
//   · le rétrécissement `unknown` → `LeconCompilee` : accepte la leçon réelle,
//     REFUSE des mutations ciblées (et chaque mutation vérifie qu'elle a frappé sa
//     cible avant d'exiger l'échec — L-010) ;
//   · `getPrerenderParams` : exactement les slugs du manifeste, et `[]` sur vide ;
//   · le sommaire : les ancres et les niveaux RÉELS de la leçon ;
//   · prev/next : aucun lien mort aux extrémités, et le TITRE du manifeste rendu,
//     jamais le slug ;
//   · les métadonnées OpenGraph, lues sur le `document` après rendu.
// =============================================================================

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import {
  ANCRES_RESERVEES,
  MANIFESTE_LECONS,
  NIVEAUX,
  PREFIXE_ID_QUESTION,
  lireLeconCompilee,
  lireManifeste,
} from '../contenu-compile';
import { Lecon } from './lecon';
import {
  construireSommaire,
  parametresDePrerender,
  titreDeDocument,
  voisinesDe,
} from './navigation-lecon';

const ORCHESTRATEUR = 'tools/content-pipeline/build.mjs';
const RACINE_TEMOIN = 'tools/content-pipeline/__fixtures__/temoin/cours/securite-web';

/** Bac à sable dans le dépôt : `build.mjs` refuse une sortie hors dépôt. `.cache/` est gitignoré. */
const BAC = '.cache/tests-e2-st2';

/** Shiki charge de vraies grammaires, `mmdc` démarre un vrai Chromium : lent, une seule fois. */
const DELAI = 180_000;

/** Le slug de la leçon-témoin grasse — lu plus bas dans le manifeste, jamais supposé. */
let slugTemoin = '';

let manifesteReel: readonly EntreeManifesteRoutes[] = [];
let leconBrute: unknown = null;
let leconReelle: LeconCompilee | null = null;

/**
 * Message de diagnostic, VIDE quand tout va bien. Placé avant l'assertion de code,
 * il fait remonter la CAUSE dans le rapport de Vitest — le cas qu'il existe pour
 * nommer étant un clone frais sans le Chromium de Playwright.
 */
function diagnostic(code: number, journal: string): string {
  if (code === 0) return '';
  const chromiumManquant = /Chromium|e2e:install|Playwright|mmdc/i.test(journal);
  const tete = chromiumManquant
    ? 'le rendu des diagrammes exige le Chromium de Playwright — lancer : npm run e2e:install'
    : `l'orchestrateur a échoué (code ${code})`;
  const extrait = journal
    .trim()
    .split('\n')
    .filter((ligne) => ligne.trim() !== '')
    .slice(-12)
    .join('\n');
  return `${tete}\n${extrait}`;
}

/** Copie profonde d'une valeur JSON — pour muter une fixture sans contaminer les voisines. */
function copie<T>(valeur: T): T {
  return JSON.parse(JSON.stringify(valeur)) as T;
}

beforeAll(() => {
  rmSync(BAC, { recursive: true, force: true });
  mkdirSync(BAC, { recursive: true });
  const sortie = join(BAC, 'content-generated');

  const resultat = spawnSync(
    process.execPath,
    [
      ORCHESTRATEUR,
      '--racine',
      RACINE_TEMOIN,
      '--sortie',
      sortie,
      '--css',
      join(BAC, '_coloration.scss'),
    ],
    { encoding: 'utf8', cwd: process.cwd() },
  );
  const journal = `${resultat.stdout ?? ''}\n${resultat.stderr ?? ''}`;
  expect(diagnostic(resultat.status ?? -1, journal)).toBe('');

  manifesteReel = lireManifeste(
    JSON.parse(readFileSync(join(sortie, 'manifeste-routes.json'), 'utf8')),
    'manifeste de la leçon-témoin',
  );
  const premiere = manifesteReel[0];
  if (premiere === undefined) throw new Error('le manifeste témoin est vide');
  slugTemoin = premiere.slug;

  const chemin = join(sortie, 'lecons', `${slugTemoin}.json`);
  expect(existsSync(chemin)).toBe(true);
  leconBrute = JSON.parse(readFileSync(chemin, 'utf8'));
  leconReelle = lireLeconCompilee(leconBrute, 'leçon-témoin compilée');
}, DELAI);

afterAll(() => {
  rmSync(BAC, { recursive: true, force: true });
});

/** La leçon compilée, non nulle — un accès qui échoue bruyamment plutôt qu'en `null`. */
function lecon(): LeconCompilee {
  if (leconReelle === null) throw new Error('la leçon-témoin n’a pas été compilée');
  return leconReelle;
}

describe('page de leçon — la fixture elle-même', () => {
  // CE GROUPE EST LE CONTRÔLE POSITIF DE TOUS LES AUTRES (L-019). Sans lui, un
  // sommaire imbriqué « correct » sur une leçon sans aucune section de niveau 3
  // serait vert en ne prouvant rien.
  it('compile UNE leçon, avec des sections de niveau 2 ET de niveau 3', () => {
    expect(manifesteReel).toHaveLength(1);
    expect(slugTemoin).not.toBe('');

    const niveaux = lecon().sections.map((section) => section.niveau);
    expect(niveaux.filter((niveau) => niveau === 2).length).toBeGreaterThan(0);
    expect(niveaux.filter((niveau) => niveau === 3).length).toBeGreaterThan(0);
  });

  it('porte des objectifs, une durée et un niveau — ce que la page de garde affiche', () => {
    const frontmatter = lecon().frontmatter;
    expect(frontmatter.objectifs.length).toBeGreaterThan(0);
    expect(frontmatter.dureeEstimee).toBeGreaterThan(0);
    expect(frontmatter.niveau).not.toBe('');
    // La témoin n'a AUCUN prérequis : c'est ce qui rend testable le cas « section
    // absente » de la page de garde.
    expect(frontmatter.prerequis).toEqual([]);
  });

  it('porte le quiz de la leçon, apparié à son slug (E2-ST3, lot B)', () => {
    // CONTRÔLE POSITIF des trois mutations de quiz ci-dessous : sans lui, elles
    // seraient vertes sur une leçon dont le quiz serait déjà absent ou déjà cassé.
    const quiz = lecon().quiz;
    expect(quiz.lecon).toBe(slugTemoin);
    expect(quiz.questions.length).toBeGreaterThan(0);
  });
});

describe('rétrécissement `unknown` → `LeconCompilee`', () => {
  it('ACCEPTE la leçon-témoin telle que le pipeline l’a écrite (contrôle positif)', () => {
    const rendue = lireLeconCompilee(leconBrute, 'contrôle positif');
    expect(rendue.frontmatter.slug).toBe(slugTemoin);
    expect(rendue.sections.length).toBeGreaterThan(1);
  });

  /**
   * Chaque cas MUTE la leçon réelle sur un point précis. La mutation est d'abord
   * constatée (la valeur d'origine était bien conforme), sinon on mesurerait
   * l'inertie du validateur au lieu de sa portée (L-010).
   */
  const mutations: { nom: string; muter: (lecon: LeconCompilee) => void; attendu: string }[] = [
    {
      nom: 'un statut hors de l’union du contrat',
      muter: (l) => {
        (l.frontmatter as unknown as Record<string, unknown>)['statut'] = 'publié';
      },
      attendu: 'frontmatter.statut',
    },
    {
      nom: 'une durée passée en chaîne',
      muter: (l) => {
        (l.frontmatter as unknown as Record<string, unknown>)['dureeEstimee'] = '12';
      },
      attendu: 'frontmatter.dureeEstimee',
    },
    {
      nom: 'des objectifs qui ne sont plus un tableau de chaînes',
      muter: (l) => {
        (l.frontmatter as unknown as Record<string, unknown>)['objectifs'] = [{ texte: 'non' }];
      },
      attendu: 'frontmatter.objectifs',
    },
    {
      nom: 'une ancre de section hors du kebab-case',
      muter: (l) => {
        (l.sections[0] as unknown as Record<string, unknown>)['ancre'] = 'Ancre Invalide';
      },
      attendu: 'ancre',
    },
    {
      nom: 'un niveau de titre hors de 2 | 3',
      muter: (l) => {
        (l.sections[0] as unknown as Record<string, unknown>)['niveau'] = 4;
      },
      attendu: 'niveau',
    },
    {
      nom: 'deux sections qui partagent la même ancre',
      muter: (l) => {
        (l.sections[1] as unknown as Record<string, unknown>)['ancre'] = l.sections[0]?.ancre;
      },
      attendu: 'même ancre',
    },
    {
      nom: 'des sections absentes',
      muter: (l) => {
        (l as unknown as Record<string, unknown>)['sections'] = [];
      },
      attendu: 'au moins une section',
    },
    {
      nom: 'un niveau hors de l’énumération du schéma',
      muter: (l) => {
        (l.frontmatter as unknown as Record<string, unknown>)['niveau'] = 'constructor';
      },
      attendu: 'frontmatter.niveau',
    },
    {
      nom: 'une section qui reprend un `id` réservé à la page',
      muter: (l) => {
        (l.sections[0] as unknown as Record<string, unknown>)['ancre'] = 'titre-sommaire';
      },
      attendu: 'ancre réservée',
    },
    // ─── L'enveloppe du quiz (E2-ST3, lot B) ──────────────────────────────────
    // Le champ est OBLIGATOIRE au contrat : sans ces trois cas, `lireLeconCompilee`
    // promettrait au `QuizComponent` une donnée que rien ne confronte au fichier.
    {
      nom: 'un quiz absent, alors que le contrat le rend obligatoire',
      muter: (l) => {
        delete (l as unknown as Record<string, unknown>)['quiz'];
      },
      attendu: 'quiz',
    },
    {
      nom: 'un quiz apparié à une autre leçon que la sienne',
      muter: (l) => {
        (l.quiz as unknown as Record<string, unknown>)['lecon'] = 'une-autre-lecon';
      },
      attendu: 'quiz.lecon',
    },
    {
      nom: 'une question dont le `type` sort de la liste nominative',
      muter: (l) => {
        (l.quiz.questions[0] as unknown as Record<string, unknown>)['type'] = 'devinette';
      },
      attendu: 'type',
    },
    {
      // Les `id` de question et les ancres de section partagent l'espace de noms du DOCUMENT.
      // L'auteur choisit ses ancres sans rien savoir des `id` du quiz : c'est le seul cas que
      // ni l'une ni l'autre des deux parties ne peut arbitrer seule, d'où le refus nominatif.
      nom: "une question dont l'`id` préfixé heurte une ancre de section",
      muter: (l) => {
        const question = l.quiz.questions[0] as unknown as Record<string, unknown>;
        const section = l.sections[0] as unknown as Record<string, unknown>;
        question['id'] = 'introduction';
        section['ancre'] = `${PREFIXE_ID_QUESTION}introduction`;
      },
      attendu: 'déjà pris par une ancre de section',
    },
    // ─── L'ancre `[[quiz]]` (E2-ST3, lot C) ───────────────────────────────────
    // Le compilateur exige déjà exactement une ancre dans le corps. Ces deux cas
    // tiennent le même invariant à la LECTURE, parce que c'est là qu'il devient un
    // invariant d'`id` : zéro ancre = un quiz rendu nulle part, deux ancres = un
    // quiz rendu deux fois, donc tous ses `id` de question dupliqués.
    {
      nom: 'un corps privé de son ancre « [[quiz]] »',
      muter: (l) => {
        for (const section of l.sections) {
          (section as unknown as Record<string, unknown>)['blocs'] = section.blocs.filter(
            (bloc) => bloc.type !== 'ancre-quiz',
          );
        }
      },
      attendu: 'une seule attendue',
    },
    {
      // 🔴 LE CAS QUI EXIGE LA RÉCURSION, et la seule façon de prouver qu'elle est là :
      // un balayage de premier niveau compterait 1 ici et laisserait passer. C'est
      // exactement le trou que le compilateur portait jusqu'au lot C.
      nom: 'une SECONDE ancre « [[quiz]] » cachée dans un encadré',
      muter: (l) => {
        const premiere = l.sections[0] as unknown as Record<string, unknown>;
        premiere['blocs'] = [
          ...(premiere['blocs'] as readonly unknown[]),
          { type: 'encadre', variante: 'note', blocs: [{ type: 'ancre-quiz' }] },
        ];
      },
      attendu: 'une seule attendue',
    },
  ];

  for (const cas of mutations) {
    it(`REFUSE ${cas.nom}, en nommant le champ`, () => {
      const original = copie(lecon());
      // La leçon d'origine passe : la mutation est donc bien la SEULE cause de
      // l'échec qui suit.
      expect(() => lireLeconCompilee(original, 'avant mutation')).not.toThrow();

      const mutee = copie(lecon());
      cas.muter(mutee);
      expect(JSON.stringify(mutee)).not.toBe(JSON.stringify(original));

      expect(() => lireLeconCompilee(mutee, 'après mutation')).toThrow(
        new RegExp(cas.attendu.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      );
    });
  }

  it('REFUSE une valeur qui n’est pas un objet', () => {
    expect(() => lireLeconCompilee('une chaîne', 'contrôle négatif')).toThrow(/pas un objet/);
    expect(() => lireLeconCompilee(null, 'contrôle négatif')).toThrow(/pas un objet/);
  });

  it('tient `NIVEAUX` collé à l’énumération du SCHÉMA de build', () => {
    // La liste nominative de `contenu-compile.ts` reprend celle du schéma Ajv. Elles
    // sont écrites à deux endroits parce que le schéma appartient au programme
    // outillage et n'a rien à faire dans le bundle du navigateur ; ce test est ce qui
    // interdit qu'elles divergent en silence (L-016), et il NOMME les deux fichiers.
    const schema: unknown = JSON.parse(
      readFileSync('tools/content-pipeline/schemas/lecon.frontmatter.schema.json', 'utf8'),
    );
    const enumeration = (schema as { properties: { niveau: { enum: string[] } } }).properties.niveau
      .enum;

    expect([...NIVEAUX]).toEqual(enumeration);
  });
});

describe('lecture du manifeste', () => {
  it('ACCEPTE le manifeste réellement écrit par le pipeline', () => {
    const entrees = lireManifeste(copie(manifesteReel), 'contrôle positif');
    expect(entrees.map((entree) => entree.slug)).toEqual([slugTemoin]);
  });

  it('REFUSE un statut inconnu et un tri cassé', () => {
    const premiere = manifesteReel[0];
    if (premiere === undefined) throw new Error('manifeste vide');

    expect(() => lireManifeste([{ ...premiere, statut: 'presque-publiee' }], 'négatif')).toThrow(
      /statut/,
    );

    // Le tri appartient au générateur : le refaire ici masquerait sa régression.
    const desordonne = [
      { ...premiere, slug: 'deuxieme', ordre: 2 },
      { ...premiere, slug: 'premiere', ordre: 1 },
    ];
    expect(() => lireManifeste(desordonne, 'négatif')).toThrow(/triées/);
  });

  it('REFUSE une racine qui n’est pas un tableau', () => {
    expect(() => lireManifeste({ lecons: [] }, 'négatif')).toThrow(/tableau/);
  });
});

describe('getPrerenderParams — les slugs à prerendre', () => {
  it('rend EXACTEMENT les slugs du manifeste, dans son ordre', () => {
    const premiere = manifesteReel[0];
    if (premiere === undefined) throw new Error('manifeste vide');
    const trois = [
      { ...premiere, slug: 'introduction', ordre: 1 },
      { ...premiere, slug: 'injection-sql', ordre: 2 },
      { ...premiere, slug: 'sessions', ordre: 3 },
    ];

    expect(parametresDePrerender(trois)).toEqual([
      { slug: 'introduction' },
      { slug: 'injection-sql' },
      { slug: 'sessions' },
    ]);
    // Et sur le manifeste RÉEL, pour que ce test ne vive pas que sur des données
    // fabriquées : un slug, celui de la leçon-témoin compilée.
    expect(parametresDePrerender(manifesteReel)).toEqual([{ slug: slugTemoin }]);
  });

  it('rend `[]` sur un manifeste vide — l’état du dépôt jusqu’à E3-ST1', () => {
    // C'est ce cas qui doit NE PAS faire échouer `npm run build` : zéro leçon
    // prerendue est un résultat, pas une panne.
    expect(parametresDePrerender([])).toEqual([]);
  });
});

describe('sommaire ancré', () => {
  it('reflète les ancres et les niveaux RÉELS de la leçon-témoin', () => {
    const sections = lecon().sections;
    const sommaire = construireSommaire(sections);

    // Un titre de premier niveau par section de niveau 2 — ni plus, ni moins.
    const ancresDeNiveau2 = sections.filter((s) => s.niveau === 2).map((s) => s.ancre);
    expect(sommaire.map((entree) => entree.ancre)).toEqual(ancresDeNiveau2);

    // Chaque section de niveau 3 apparaît SOUS la section de niveau 2 qui la
    // précède dans le document — c'est tout l'intérêt d'un sommaire imbriqué.
    const ancresDeNiveau3 = sections.filter((s) => s.niveau === 3).map((s) => s.ancre);
    expect(ancresDeNiveau3.length).toBeGreaterThan(0);
    expect(sommaire.flatMap((entree) => entree.sousEntrees.map((sous) => sous.ancre))).toEqual(
      ancresDeNiveau3,
    );

    // Les titres viennent des sections, pas des ancres.
    for (const entree of sommaire) expect(entree.titre).not.toBe(entree.ancre);
  });

  it('place au premier niveau une section de niveau 3 SANS parent', () => {
    // Cas limite assumé : jeter la section produirait un sommaire silencieusement
    // incomplet, ce qui est pire qu'un sommaire un peu plat.
    const orpheline = copie(lecon()).sections.filter((section) => section.niveau === 3)[0];
    if (orpheline === undefined) throw new Error('la fixture n’a aucune section de niveau 3');

    const sommaire = construireSommaire([orpheline]);
    expect(sommaire.map((entree) => entree.ancre)).toEqual([orpheline.ancre]);
  });
});

describe('voisines et titre de document', () => {
  function troisEntrees(): EntreeManifesteRoutes[] {
    const premiere = manifesteReel[0];
    if (premiere === undefined) throw new Error('manifeste vide');
    return [
      { ...premiere, slug: 'avant', ordre: 1, titre: 'La leçon qui précède' },
      { ...premiere, slug: slugTemoin, ordre: 2 },
      { ...premiere, slug: 'apres', ordre: 3, titre: 'La leçon qui suit' },
    ];
  }

  it('donne les deux voisines au milieu du cours', () => {
    const voisines = voisinesDe(troisEntrees(), slugTemoin);
    expect(voisines.precedente?.slug).toBe('avant');
    expect(voisines.suivante?.slug).toBe('apres');
  });

  it('n’invente aucune voisine aux extrémités', () => {
    const entrees = troisEntrees();
    expect(voisinesDe(entrees, 'avant').precedente).toBeNull();
    expect(voisinesDe(entrees, 'avant').suivante?.slug).toBe(slugTemoin);
    expect(voisinesDe(entrees, 'apres').suivante).toBeNull();
    // Slug hors manifeste : deux absences, pas une exception.
    expect(voisinesDe(entrees, 'inconnu')).toEqual({ precedente: null, suivante: null });
  });

  it('compose le titre d’onglet à partir du MANIFESTE, jamais du slug', () => {
    const titre = titreDeDocument(manifesteReel, slugTemoin);
    expect(titre).toContain(manifesteReel[0]?.titre ?? '');
    expect(titre).toContain('Dr. Je-Sais-Tout');

    // 🔴 Un slug forgé ne se réaffiche PAS, même en repli.
    const forge = 'votre-compte-est-compromis-appelez-le-1-800-000-0000';
    const repli = titreDeDocument(manifesteReel, forge);
    expect(repli).not.toContain('1-800');
    expect(repli).not.toContain('compromis');
    expect(repli).toContain('Dr. Je-Sais-Tout');
  });
});

describe('rendu de la page', () => {
  /** Monte la page sur une route réelle, avec un `resolve` qui rend la leçon compilée. */
  async function monter(
    entrees: readonly EntreeManifesteRoutes[],
    url = `/cours/securite-web/${slugTemoin}`,
  ): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'cours/securite-web/:slug', component: Lecon, resolve: { lecon: () => lecon() } },
        ]),
        { provide: MANIFESTE_LECONS, useValue: entrees },
      ],
    });
    const harnais = await RouterTestingHarness.create();
    await harnais.navigateByUrl(url);
    const rendu = harnais.routeNativeElement;
    if (rendu === null) throw new Error('la page de leçon n’a pas été montée');
    return rendu;
  }

  afterEach(() => {
    // Les balises OpenGraph sont posées sur le VRAI `document` : sans ce ménage,
    // un test lirait celles du test précédent.
    for (const balise of document.querySelectorAll(
      'meta[property^="og:"], meta[name="description"]',
    )) {
      balise.remove();
    }
  });

  it('rend UN `h1` non vide, les repères et les objectifs de la leçon', async () => {
    const rendu = await monter(manifesteReel);
    const frontmatter = lecon().frontmatter;

    const titres = rendu.querySelectorAll('h1');
    expect(titres.length).toBe(1);
    expect(titres[0]?.textContent?.trim()).toBe(frontmatter.titre);

    const texte = rendu.textContent ?? '';
    expect(texte).toContain(String(frontmatter.dureeEstimee));
    for (const objectif of frontmatter.objectifs) expect(texte).toContain(objectif);

    // La leçon-témoin n'a pas de prérequis : la section ne doit pas exister.
    expect(rendu.querySelector('#titre-prerequis')).toBeNull();
  });

  it('rend un sommaire NOMMÉ dont chaque ancre pointe un titre existant', async () => {
    const rendu = await monter(manifesteReel);

    const sommaire = rendu.querySelector('nav.sommaire');
    expect(sommaire).not.toBeNull();
    // Le repère doit porter un nom accessible, sinon il est annoncé « navigation ».
    const nomme = rendu.querySelector('#titre-sommaire');
    expect(sommaire?.getAttribute('aria-labelledby')).toBe('titre-sommaire');
    expect(nomme?.textContent?.trim()).not.toBe('');

    const liens = [...(sommaire?.querySelectorAll('a') ?? [])];
    expect(liens.length).toBe(lecon().sections.length);

    // 🔴 L'ASSERTION PORTE SUR L'URL RÉSOLUE, PAS SUR LA CHAÎNE `href`. C'est le
    // reproducteur du défaut qui a motivé ce test : `src/index.html` pose
    // `<base href="/" />`, et un fragment NU (`href="#ancre"`) se résout contre la
    // BASE du document, jamais contre l'URL courante. Chaque entrée du sommaire
    // renvoyait donc le lecteur à l'accueil, avec ou sans JS — et une comparaison de
    // CHAÎNE à un `id` restait verte, puisqu'elle ne résout aucune URL.
    const cheminDeLaLecon = `/cours/securite-web/${slugTemoin}`;
    const resolus = liens.map((lien) => new URL(lien.getAttribute('href') ?? '', document.baseURI));
    expect(resolus.map((url) => url.pathname)).toEqual(liens.map(() => cheminDeLaLecon));

    // AUCUN LIEN MORT : chaque ancre du sommaire correspond à un `id` du document.
    const cassees = resolus
      .map((url) => url.hash.slice(1))
      .filter((ancre) => ancre === '' || rendu.querySelector(`[id="${ancre}"]`) === null);
    expect(cassees).toEqual([]);

    // L'imbrication est rendue, pas seulement calculée.
    expect(sommaire?.querySelectorAll('ol ol').length).toBeGreaterThan(0);
  });

  it('n’émet AUCUN `id` statique hors d’`ANCRES_RESERVEES`', async () => {
    // L'autre extrémité du contrôle d'unicité de `lireLeconCompilee` : celui-ci
    // REFUSE qu'une section reprenne un `id` de la page, encore faut-il que la liste
    // des `id` de la page soit à jour. Un `id` statique ajouté au gabarit sans être
    // déclaré réservé rougit ici — pas trois lots plus tard, sur un `aria-labelledby`
    // ambigu (L-016).
    const rendu = await monter(manifesteReel);
    const ancresDeSections = new Set(lecon().sections.map((section) => section.ancre));

    const statiques = [...rendu.querySelectorAll('[id]')]
      // Le corps appartient à `RenduBlocs`, qui a ses propres `id` (diagrammes).
      .filter((element) => element.closest('app-rendu-blocs') === null)
      .map((element) => element.id)
      .filter((id) => !ancresDeSections.has(id));

    expect(statiques.length).toBeGreaterThan(0); // contrôle positif : on a bien regardé
    expect(statiques.filter((id) => !ANCRES_RESERVEES.some((connu) => connu === id))).toEqual([]);
  });

  it('rend chaque section avec le niveau de titre du contenu', async () => {
    const rendu = await monter(manifesteReel);
    const sections = lecon().sections;

    for (const section of sections) {
      const titre = rendu.querySelector(`[id="${section.ancre}"]`);
      expect(titre?.tagName.toLowerCase()).toBe(`h${section.niveau}`);
      expect(titre?.textContent?.trim()).toBe(section.titre);
    }
    // Le corps est bien délégué à RenduBlocs : le diagramme de la fixture est là.
    expect(rendu.querySelectorAll('svg.diagramme-mermaid').length).toBeGreaterThan(0);
  });

  it('n’affiche AUCUNE voisine quand la leçon est seule au manifeste', async () => {
    // Le manifeste réel n'a qu'une entrée : première ET dernière du cours. Aucun
    // lien ne doit être rendu — un voisin manquant n'est pas un lien mort.
    const rendu = await monter(manifesteReel);
    expect(rendu.querySelector('nav.voisines')).toBeNull();
  });

  it('rend les deux voisines avec leur TITRE, et un lien vers leur route', async () => {
    const premiere = manifesteReel[0];
    if (premiere === undefined) throw new Error('manifeste vide');
    const rendu = await monter([
      { ...premiere, slug: 'avant', ordre: 1, titre: 'La leçon qui précède' },
      { ...premiere, slug: slugTemoin, ordre: 2 },
      { ...premiere, slug: 'apres', ordre: 3, titre: 'La leçon qui suit' },
    ]);

    const voisines = rendu.querySelector('nav.voisines');
    expect(voisines).not.toBeNull();
    expect(voisines?.getAttribute('aria-labelledby')).toBe('titre-voisines');

    const liens = [...(voisines?.querySelectorAll('a') ?? [])];
    expect(liens.map((lien) => lien.getAttribute('href'))).toEqual([
      '/cours/securite-web/avant',
      '/cours/securite-web/apres',
    ]);

    // Le TEXTE vient du manifeste, pas du slug — et le SENS du lien est écrit,
    // jamais porté par la seule position (WCAG 1.4.1).
    const textes = liens.map((lien) => lien.textContent ?? '');
    expect(textes[0]).toContain('La leçon qui précède');
    expect(textes[0]).toContain('Leçon précédente');
    expect(textes[1]).toContain('La leçon qui suit');
    expect(textes[1]).toContain('Leçon suivante');
  });

  it('ne réaffiche JAMAIS le segment d’URL, même forgé', async () => {
    // L-018 : cette assertion porte sur CE QUI EST RENDU, pas sur ce que le code
    // lit. C'est exactement la garantie recherchée — le slug peut servir à choisir
    // une leçon, il ne doit pas fournir un mot de la page.
    const rendu = await monter(
      manifesteReel,
      '/cours/securite-web/votre-compte-est-compromis-appelez-le-1-800-000-0000',
    );

    const texte = rendu.textContent ?? '';
    expect(texte).not.toContain('1-800');
    expect(texte).not.toContain('compromis');
    expect(texte).not.toContain('appelez');
    // Contrôle positif : la page a bien été rendue, sinon « rien ne s'affiche »
    // suffirait à faire passer les trois assertions ci-dessus (L-019).
    expect(texte).toContain(lecon().frontmatter.titre);
  });

  it('pose les métadonnées OpenGraph depuis le front-matter', async () => {
    await monter(manifesteReel);
    const frontmatter = lecon().frontmatter;

    const contenu = (selecteur: string): string =>
      document.querySelector(selecteur)?.getAttribute('content') ?? '';

    expect(contenu('meta[property="og:title"]')).toBe(frontmatter.titre);
    expect(contenu('meta[property="og:type"]')).toBe('article');
    expect(contenu('meta[property="og:locale"]')).toBe('fr_CA');
    expect(contenu('meta[property="og:site_name"]')).toBe('Dr. Je-Sais-Tout');

    const description = contenu('meta[property="og:description"]');
    expect(description).toContain(frontmatter.titre);
    expect(description).toContain(String(frontmatter.dureeEstimee));
    expect(contenu('meta[name="description"]')).toBe(description);

    // `og:url` : le chemin de la leçon, bâti sur le slug du FRONTMATTER.
    expect(contenu('meta[property="og:url"]')).toBe(`/cours/securite-web/${frontmatter.slug}`);
  });

  it('ne met AUCUN segment d’URL forgé dans les métadonnées, `og:url` comprise', async () => {
    // Jumeau de l'assertion sur le texte rendu : une balise `og:url` bâtie sur le
    // segment reçu ferait publier au site, sous son propre domaine, l'adresse d'un
    // tiers — invisible en page, et pourtant partagée par tout agrégateur.
    await monter(
      manifesteReel,
      '/cours/securite-web/votre-compte-est-compromis-appelez-le-1-800-000-0000',
    );

    const metadonnees = [
      ...document.querySelectorAll('meta[property^="og:"], meta[name="description"]'),
    ]
      .map((balise) => balise.getAttribute('content') ?? '')
      .join(' ');

    expect(metadonnees).toContain(lecon().frontmatter.slug); // contrôle positif
    expect(metadonnees).not.toContain('1-800');
    expect(metadonnees).not.toContain('compromis');
  });
});
