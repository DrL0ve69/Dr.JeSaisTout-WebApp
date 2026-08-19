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
  ID_SIMULATION,
  MANIFESTE_LECONS,
  NIVEAUX,
  PREFIXE_ID_ETAPE,
  PREFIXE_ID_QUESTION,
  TYPES_ACTEUR,
  lireLeconCompilee,
  lireManifeste,
} from '../contenu-compile';
import { ProgressionService } from '../../../core/progression/progression';
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

/**
 * U+00A0 écrite en échappement — comme dans le composant, et pour la même raison :
 * `no-irregular-whitespace` refuse la vraie dans un littéral, et une espace ORDINAIRE tapée ici
 * ferait échouer la comparaison sur un caractère invisible (L-035 : une prémisse de test fausse
 * rougit sur un produit sain).
 */
const INSECABLE = '\u00A0';

/** Copie profonde d'une valeur JSON — pour muter une fixture sans contaminer les voisines. */
function copie<T>(valeur: T): T {
  return JSON.parse(JSON.stringify(valeur)) as T;
}

/**
 * Compte les ancres d'un type dans TOUTE la leçon, encadrés compris.
 *
 * ⚠️ LA RÉCURSION N'EST PAS DÉCORATIVE ICI NON PLUS. Ce compte sert de CONTRÔLE POSITIF aux
 * mutations d'ancre ci-dessous, et il mire deux compteurs qui descendent, eux, dans les
 * `::: note`. Un balayage de premier niveau donnerait 0 le jour où la fixture témoin
 * déplacerait son ancre dans un encadré : le contrôle positif rougirait sur un produit sain,
 * et la prémisse fausse serait celle du test (L-035). La parité des DEUX copies de
 * production, elle, est tenue par `src/compter-ancres-parite.spec.ts`.
 */
function compterAncresDeLaLecon(
  lecon: LeconCompilee,
  type: 'ancre-quiz' | 'ancre-simulation',
): number {
  const descendre = (blocs: readonly BlocContenu[]): number =>
    blocs.reduce(
      (total, bloc) =>
        total +
        (bloc.type === type ? 1 : bloc.type === 'encadre' ? descendre(bloc.blocs) : 0),
      0,
    );
  return lecon.sections.reduce((total, section) => total + descendre(section.blocs), 0);
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
      // 🔴 LE DRAPEAU EST ICI POUR QUE `manifesteReel` PORTE LES DEUX STATUTS.
      // Depuis le correctif du 2026-08-19, un bâtissage PAR DÉFAUT n'écrit plus rien
      // d'une leçon non publiée : le manifeste témoin ne porterait alors qu'une seule
      // entrée, et les assertions de `parametresDePrerender` et de `voisinesDe` sur
      // données RÉELLES deviendraient vraies du vide (le filtre appliqué deux fois est
      // idempotent, donc silencieux). On demande donc explicitement l'artéfact
      // « d'auteur » — celui que le filtre de génération est censé refuser au public —
      // pour que les filtres APPLICATIFS aient encore un brouillon à écarter.
      // Que le bâtissage par défaut, lui, n'en écrive aucun est tenu ailleurs, et par
      // un fichier dont c'est le seul objet : `src/garde-fou-lecons-non-publiees.spec.ts`.
      '--inclure-brouillons',
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

/**
 * UN manifeste, DEUX cours — la forme que la phase 1 aura dès que §E7 publiera sa
 * première leçon de PHP.
 *
 * 🔴 LES DEUX COURS SONT ENTRELACÉS, ET C'EST TOUT L'ENJEU. Groupés (les deux
 * leçons de sécurité côte à côte), un filtre absent laisserait quand même
 * `voisinesDe('xss').suivante` tomber sur `injection-sql` : le test serait vert sur
 * un produit cassé. Entrelacés, la voisine immédiate de `xss` DANS LE MANIFESTE est
 * une leçon de PHP — le filtre est alors la seule chose qui puisse rendre la bonne
 * réponse, exactement comme le brouillon posé au MILIEU distingue « filtrer avant »
 * de « filtrer après ».
 *
 * Les trois entrées sont PUBLIÉES : ce jeu de données mesure le sujet, et rien
 * d'autre. Le statut a ses propres cas, juste à côté.
 */
function manifesteDeuxCours(): EntreeManifesteRoutes[] {
  const premiere = manifesteReel[0];
  if (premiere === undefined) throw new Error('manifeste vide');
  return [
    { ...premiere, sujet: 'securite-web', slug: 'xss', ordre: 1, titre: 'Le XSS', statut: 'publiee' },
    { ...premiere, sujet: 'php', slug: 'variables', ordre: 2, titre: 'Les variables', statut: 'publiee' },
    {
      ...premiere,
      sujet: 'securite-web',
      slug: 'injection-sql',
      ordre: 3,
      titre: 'L’injection SQL',
      statut: 'publiee',
    },
  ];
}

describe('page de leçon — la fixture elle-même', () => {
  // CE GROUPE EST LE CONTRÔLE POSITIF DE TOUS LES AUTRES (L-019). Sans lui, un
  // sommaire imbriqué « correct » sur une leçon sans aucune section de niveau 3
  // serait vert en ne prouvant rien.
  it('compile DEUX leçons, la première avec des sections de niveau 2 ET de niveau 3', () => {
    // Depuis E2-ST6 (lot B), la racine-témoin porte DEUX leçons : la grasse (`publiee`) et une
    // maigre en `brouillon`, qui donne au masquage des brouillons un cas qu'un runner exécute
    // vraiment (L-019). `slugTemoin` reste la PREMIÈRE — c'est elle que ce fichier monte.
    expect(manifesteReel).toHaveLength(2);
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

  it('porte la simulation de la leçon, appariée à son slug (E2-ST5, lot a)', () => {
    // CONTRÔLE POSITIF de toutes les mutations de simulation ci-dessous (L-019). Le champ
    // est OPTIONNEL au contrat : sans cette assertion, chacune d'elles serait verte sur une
    // leçon-témoin qui n'en porterait aucune — un `undefined` muté reste un `undefined`.
    const simulation = lecon().simulation;
    expect(simulation).toBeDefined();
    expect(simulation?.lecon).toBe(slugTemoin);
    expect(simulation?.acteurs.length).toBeGreaterThan(1);
    expect(simulation?.etapes.length).toBeGreaterThan(1);

    // Et l'autre moitié de la paire : le corps porte bien l'ancre où elle s'affichera.
    // ⚠️ LA DESCENTE EST RÉCURSIVE, comme les DEUX compteurs que ce contrôle positif mire.
    // Un `flatMap` de premier niveau compterait 0 le jour où la fixture témoin déplacerait
    // son `[[simulation]]` dans un `::: note` : ce contrôle positif rougirait sur un produit
    // parfaitement sain, et c'est la prémisse du test qui serait fausse (L-035).
    expect(compterAncresDeLaLecon(lecon(), 'ancre-simulation')).toBe(1);
  });
});

describe('rétrécissement `unknown` → `LeconCompilee`', () => {
  it('ACCEPTE la leçon-témoin telle que le pipeline l’a écrite (contrôle positif)', () => {
    const rendue = lireLeconCompilee(leconBrute, 'contrôle positif');
    expect(rendue.frontmatter.slug).toBe(slugTemoin);
    expect(rendue.sections.length).toBeGreaterThan(1);
    // La fixture porte bien une `section` — sans quoi la mutation « section présente mais
    // vide » ci-dessous mesurerait l'inertie du validateur, pas sa portée (L-010/L-019).
    expect(rendue.frontmatter.section).toBe('Fondamentaux');
  });

  it('ACCEPTE une leçon SANS « section » — le champ est optionnel (D-2)', () => {
    // La moitié qu'aucune mutation ne peut couvrir : les cas de la table ci-dessous prouvent
    // tous un REFUS. Sans ce test, `section` pourrait être devenue obligatoire à la lecture
    // sans que rien ne le dise — et toute leçon d'un sujet non groupé, c'est-à-dire le cas
    // NORMAL, ferait échouer le prerender de sa page.
    const sansSection = copie(lecon());
    delete (sansSection.frontmatter as unknown as Record<string, unknown>)['section'];

    const rendue = lireLeconCompilee(sansSection, 'contrôle positif');
    expect(rendue.frontmatter.section).toBeUndefined();
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
      // `section` est OPTIONNELLE (E2-ST6, D-2) : ABSENTE est légal — le test dédié plus bas en
      // est le contrôle positif. PRÉSENTE mais vide ne l'est pas, et c'est le seul cas que ce
      // rétrécissement peut trancher : `null`, `''` ou des blanches sont une régression du
      // pipeline, pas une leçon sans section. Les confondre rendrait un groupe au titre
      // invisible dans la carte de parcours, sans qu'aucun gate ne rougisse.
      nom: 'une section présente mais vide',
      muter: (l) => {
        (l.frontmatter as unknown as Record<string, unknown>)['section'] = '  ';
      },
      attendu: 'frontmatter.section',
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
    // ─── L'enveloppe de la simulation (E2-ST5, lot a) ─────────────────────────
    // Le champ est OPTIONNEL, à la différence de `quiz` : ce qui est tenu ici n'est
    // pas sa présence mais la COHÉRENCE de la paire « champ ⇔ ancre », plus la forme
    // de ce que le composant du lot b recevra. Les champs d'`etatVisuel`, eux, ne
    // sont PAS ici — ils appartiennent à ce composant (même partage que le quiz).
    {
      nom: 'une simulation appariée à une autre leçon que la sienne',
      muter: (l) => {
        (l.simulation as unknown as Record<string, unknown>)['lecon'] = 'une-autre-lecon';
      },
      attendu: 'simulation.lecon',
    },
    {
      nom: 'un acteur dont le `type` sort de la liste nominative',
      muter: (l) => {
        (l.simulation?.acteurs[0] as unknown as Record<string, unknown>)['type'] = 'robot';
      },
      attendu: 'simulation.acteurs[0] ».type',
    },
    {
      nom: 'deux acteurs qui partagent le même `id`',
      muter: (l) => {
        const acteurs = l.simulation?.acteurs ?? [];
        (acteurs[1] as unknown as Record<string, unknown>)['id'] = acteurs[0]?.id;
      },
      attendu: 'deux acteurs partagent le même',
    },
    {
      // LE SEUIL EST DEUX, celui du schéma (`minItems: 2`), et il l'est ici AUSSI. Une
      // simulation à un acteur ne raconte aucun échange : la laisser traverser la
      // frontière rendrait la LECTURE plus permissive que l'écriture.
      nom: 'une simulation réduite à UN SEUL acteur',
      muter: (l) => {
        const simulation = l.simulation as unknown as Record<string, unknown>;
        simulation['acteurs'] = (simulation['acteurs'] as readonly unknown[]).slice(0, 1);
      },
      attendu: 'au moins deux acteurs',
    },
    {
      // L'AUTRE BORNE DU MÊME CHAMP (`maxItems: 6`). Le plancher était tenu, le plafond
      // non : la lecture était donc PLUS PERMISSIVE que l'écriture d'un côté seulement,
      // exactement l'asymétrie que le commentaire du plancher existe pour refuser.
      nom: 'une simulation à SEPT acteurs',
      muter: (l) => {
        const simulation = l.simulation as unknown as Record<string, unknown>;
        const acteurs = [...(simulation['acteurs'] as readonly unknown[])];
        while (acteurs.length < 7) {
          acteurs.push({
            id: `figurant-${acteurs.length}`,
            libelle: `Un acteur de trop, n°${acteurs.length}`,
            type: 'serveur',
          });
        }
        simulation['acteurs'] = acteurs;
      },
      attendu: 'au plus six acteurs',
    },
    {
      // LE SEUIL DES ÉTAPES EST CINQ, celui du schéma (`minItems: 5`), et il l'est ici
      // AUSSI. Il ne valait qu'un `length === 0` : une simulation à deux étapes, que le
      // build REFUSE, traversait cette frontière — un artéfact venu d'ailleurs passait
      // donc sans contrôle sur un champ que le schéma borne.
      nom: 'une simulation réduite à QUATRE étapes',
      muter: (l) => {
        const simulation = l.simulation as unknown as Record<string, unknown>;
        simulation['etapes'] = (simulation['etapes'] as readonly unknown[]).slice(0, 4);
      },
      attendu: 'de cinq à douze étapes attendues, 4 trouvée(s)',
    },
    {
      // 🔴 LE PIÈGE DU PROTOTYPE (S-014 et voisins). `constructor` passe le kebab-case, et
      // `panneaux` est un `Record<idActeur, …>` issu d'un `JSON.parse` : au lot b,
      // `panneaux['constructor']` sur un objet sans cette clef rendrait
      // `Object.prototype.constructor` — une fonction, donc une valeur *truthy* qui
      // traverserait un `@if (panneau)` pour peindre un panneau vide. On refuse la clef à
      // la FRONTIÈRE, une fois, plutôt que d'espérer la parade dans chaque consommateur.
      nom: 'un acteur dont l’`id` est une propriété héritée d’`Object.prototype`',
      muter: (l) => {
        (l.simulation?.acteurs[0] as unknown as Record<string, unknown>)['id'] = 'constructor';
      },
      attendu: 'hérité d’« Object.prototype »',
    },
    {
      // Le `numero` devient l'`id` de document de l'étape (`PREFIXE_ID_ETAPE`) : une
      // séquence qui ne suit pas la position ferait deux étapes au même `id`, ou un
      // lien de la barre d'étapes qui ne mène nulle part.
      nom: 'un `numero` d’étape qui ne suit pas sa position',
      muter: (l) => {
        (l.simulation?.etapes[1] as unknown as Record<string, unknown>)['numero'] = 7;
      },
      attendu: 'simulation.etapes[1] ».numero',
    },
    {
      // La narration est l'équivalent textuel de l'état visuel (WCAG 1.1.1) : une
      // étape muette ne raconterait rien à qui ne voit pas le dessin.
      nom: 'une étape dont la narration est vide',
      muter: (l) => {
        (l.simulation?.etapes[0] as unknown as Record<string, unknown>)['narration'] = '   ';
      },
      attendu: 'simulation.etapes[0] ».narration',
    },
    {
      // L'ANCRE ORPHELINE — la moitié du défaut que le compilateur ne voyait pas avant
      // ce lot. Le champ disparaît, le corps garde son `[[simulation]]` : la page
      // porterait un trou là où l'auteur croyait avoir placé le pas-à-pas.
      nom: 'une simulation retirée alors que le corps garde son ancre',
      muter: (l) => {
        delete (l as unknown as Record<string, unknown>)['simulation'];
      },
      attendu: 'aucune « simulation » dans cette leçon',
    },
    {
      // L'autre moitié : de la donnée livrée dans le chunk, affichée nulle part.
      nom: 'un corps privé de son ancre « [[simulation]] »',
      muter: (l) => {
        for (const section of l.sections) {
          (section as unknown as Record<string, unknown>)['blocs'] = section.blocs.filter(
            (bloc) => bloc.type !== 'ancre-simulation',
          );
        }
      },
      attendu: 'la simulation ne serait rendue nulle part',
    },
    {
      // 🔴 LE CAS QUI EXIGE LA RÉCURSION à la frontière, et il est à un décalage NON
      // NEUTRE (L-039) : la simulation est PRÉSENTE, donc UNE ancre est attendue. Un
      // balayage de premier niveau compterait 1, trouverait le compte juste et
      // laisserait passer — ici on exige que le compte soit 2.
      nom: 'une SECONDE ancre « [[simulation]] » cachée dans un encadré',
      muter: (l) => {
        const premiere = l.sections[0] as unknown as Record<string, unknown>;
        premiere['blocs'] = [
          ...(premiere['blocs'] as readonly unknown[]),
          { type: 'encadre', variante: 'note', blocs: [{ type: 'ancre-simulation' }] },
        ];
      },
      attendu: '2 ancre(s) « [[simulation]] » dans le corps, 1 attendue(s)',
    },
    {
      // La collision d'`id` de document : l'auteur choisit ses ancres sans rien savoir
      // de la simulation, et `ancre: 'simulation'` est un choix parfaitement naturel
      // pour la section qui présente le pas-à-pas.
      nom: "une ancre de section qui prend l'`id` de la RÉGION de simulation",
      muter: (l) => {
        (l.sections[0] as unknown as Record<string, unknown>)['ancre'] = ID_SIMULATION;
      },
      attendu: `« ${ID_SIMULATION} » est déjà pris par une ancre de section`,
    },
    {
      nom: "une ancre de section qui prend l'`id` d'une ÉTAPE",
      muter: (l) => {
        (l.sections[0] as unknown as Record<string, unknown>)['ancre'] = `${PREFIXE_ID_ETAPE}2`;
      },
      attendu: `« ${PREFIXE_ID_ETAPE}2 » est déjà pris par une ancre de section`,
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

  it('tient `TYPES_ACTEUR` collé à l’énumération du SCHÉMA de simulation', () => {
    // Même patron, même raison que `NIVEAUX` ci-dessus (L-016) : la liste nominative de
    // `contenu-compile.ts` reprend celle de `simulation.schema.json`, écrite à deux
    // endroits parce que le schéma Ajv appartient au programme de l'outillage et n'a rien
    // à faire dans le bundle du navigateur. Ce test est ce qui interdit qu'elles divergent
    // en silence — un `type` accepté ici mais inconnu du composant du lot b donnerait une
    // boîte MUETTE pour un lecteur d'écran, sans qu'aucun gate ne rougisse.
    const schema: unknown = JSON.parse(
      readFileSync('tools/content-pipeline/schemas/simulation.schema.json', 'utf8'),
    );
    const enumeration = (
      schema as {
        properties: { acteurs: { items: { properties: { type: { enum: string[] } } } } };
      }
    ).properties.acteurs.items.properties.type.enum;

    expect([...TYPES_ACTEUR]).toEqual(enumeration);
  });
});

describe('lecture du manifeste', () => {
  it('ACCEPTE le manifeste réellement écrit par le pipeline', () => {
    const entrees = lireManifeste(copie(manifesteReel), 'contrôle positif');
    // Les deux slugs sont écrits EN DUR, pas dérivés de `manifesteReel` : un test qui se
    // compare à la donnée dont il vérifie la lecture ne prouve que `x === x` (L-012).
    expect(entrees.map((entree) => entree.slug)).toEqual(['lecon-temoin', 'lecon-brouillon']);
    // `section` traverse bien la frontière de typage (E2-ST6, lot B) — elle est OPTIONNELLE,
    // donc `lireManifeste` a son propre chemin de lecture pour elle. Une valeur perdue ici
    // ferait retomber la carte de parcours en liste plate, sans qu'aucun gate ne rougisse.
    expect(entrees.map((entree) => entree.section)).toEqual(['Fondamentaux', 'Approfondissements']);
  });

  it('ACCEPTE une entrée SANS « section » — le champ est optionnel (D-2)', () => {
    // L'autre moitié de la pince du test ci-dessus. Sans elle, `section` pourrait être devenue
    // obligatoire dans `lireManifeste` sans que rien ne le dise : tout sujet non groupé — le cas
    // NORMAL, et celui de `content/` jusqu'à E3-ST1 — lèverait au chargement du module.
    const premiere = manifesteReel[0];
    if (premiere === undefined) throw new Error('manifeste vide');
    const sansSection: Record<string, unknown> = { ...premiere };
    delete sansSection['section'];

    const entrees = lireManifeste([sansSection], 'contrôle positif');
    expect(entrees[0]?.section).toBeUndefined();

    // Et le refus reste FERMÉ : PRÉSENT mais vide n'est pas « absent », c'est une régression du
    // pipeline — un groupe au titre invisible dans la carte de parcours.
    expect(() => lireManifeste([{ ...premiere, section: '   ' }], 'négatif')).toThrow(/section/);
    expect(() => lireManifeste([{ ...premiere, section: null }], 'négatif')).toThrow(/section/);
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
  it('rend EXACTEMENT les slugs PUBLIÉS, dans l’ordre du manifeste', () => {
    const premiere = manifesteReel[0];
    if (premiere === undefined) throw new Error('manifeste vide');
    // Annotées : sans le type, TypeScript élargit `statut` en `string` et le jeu de
    // données ne serait plus un manifeste.
    const trois: EntreeManifesteRoutes[] = [
      { ...premiere, slug: 'introduction', ordre: 1, statut: 'publiee' },
      { ...premiere, slug: 'injection-sql', ordre: 2, statut: 'publiee' },
      { ...premiere, slug: 'sessions', ordre: 3, statut: 'publiee' },
    ];

    expect(parametresDePrerender(trois, 'securite-web')).toEqual([
      { slug: 'introduction' },
      { slug: 'injection-sql' },
      { slug: 'sessions' },
    ]);
    // Et sur le manifeste RÉEL, pour que ce test ne vive pas que sur des données
    // fabriquées : la racine-témoin porte DEUX leçons, `lecon-temoin` en `publiee` et
    // `lecon-brouillon` en `brouillon` — seule la première se prerende.
    // 🔴 C'EST L'ASSERTION QUI FERME LA RÉSERVE (3) D'E2-ST2 : ce qui n'est pas ici ne
    // devient pas un `index.html` déployé, donc pas une page publique et indexable.
    expect(parametresDePrerender(manifesteReel, 'securite-web')).toEqual([{ slug: 'lecon-temoin' }]);
  });

  it('ÉCARTE tout statut qui n’est pas `publiee` — `verifiee` comprise', () => {
    const premiere = manifesteReel[0];
    if (premiere === undefined) throw new Error('manifeste vide');
    const melange: EntreeManifesteRoutes[] = [
      { ...premiere, slug: 'brouillonne', ordre: 1, statut: 'brouillon' },
      { ...premiere, slug: 'relue', ordre: 2, statut: 'verifiee' },
      { ...premiere, slug: 'en-ligne', ordre: 3, statut: 'publiee' },
    ];

    // `verifiee` est un statut de relecture éditoriale, pas une mise en ligne : la
    // laisser passer publierait une leçon que personne n'a décidé de publier.
    expect(parametresDePrerender(melange, 'securite-web')).toEqual([{ slug: 'en-ligne' }]);
  });

  it('rend `[]` sur un manifeste vide — l’état du dépôt jusqu’à E3-ST1', () => {
    // C'est ce cas qui doit NE PAS faire échouer `npm run build` : zéro leçon
    // prerendue est un résultat, pas une panne.
    expect(parametresDePrerender([], 'securite-web')).toEqual([]);
  });

  it('n’écrit AUCUN slug d’un autre cours sous l’URL de celui-ci', () => {
    // 🔴 LE DÉFAUT QUE CE TEST GARDE, ET QUE L'UNICITÉ DES SLUGS NE RÈGLE PAS.
    // Cette fonction alimente le `getPrerenderParams()` de la route
    // `cours/securite-web/:slug` : chaque slug rendu devient un `index.html` ÉCRIT
    // SOUS CE CHEMIN. Sans le filtre de sujet, `variables` (PHP) produirait
    // `/cours/securite-web/variables/index.html` — page livrée et indexable sous
    // l'URL du mauvais cours, pendant que `/cours/php/variables` répondrait 404.
    // `generer-manifeste.mjs` refuse bien deux leçons de même slug tous sujets
    // confondus, mais un slug unique dit QUELLE leçon on désigne, jamais SOUS
    // QUELLE URL on l'écrit.
    const deuxCours = manifesteDeuxCours();

    expect(parametresDePrerender(deuxCours, 'securite-web')).toEqual([
      { slug: 'xss' },
      { slug: 'injection-sql' },
    ]);
    // Et le sens réciproque, qui prouve que le filtre discrimine au lieu de tout
    // jeter : la route de PHP, le jour où elle existera, n'aura que ses leçons.
    expect(parametresDePrerender(deuxCours, 'php')).toEqual([{ slug: 'variables' }]);
    // Un sujet qu'aucune leçon ne porte ne récupère rien « par défaut ».
    expect(parametresDePrerender(deuxCours, 'reseaux')).toEqual([]);
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
      { ...premiere, slug: 'avant', ordre: 1, titre: 'La leçon qui précède', statut: 'publiee' },
      { ...premiere, slug: slugTemoin, ordre: 2, statut: 'publiee' },
      { ...premiere, slug: 'apres', ordre: 3, titre: 'La leçon qui suit', statut: 'publiee' },
    ];
  }

  it('donne les deux voisines au milieu du cours', () => {
    const voisines = voisinesDe(troisEntrees(), 'securite-web', slugTemoin);
    expect(voisines.precedente?.slug).toBe('avant');
    expect(voisines.suivante?.slug).toBe('apres');
  });

  it('n’invente aucune voisine aux extrémités', () => {
    const entrees = troisEntrees();
    expect(voisinesDe(entrees, 'securite-web', 'avant').precedente).toBeNull();
    expect(voisinesDe(entrees, 'securite-web', 'avant').suivante?.slug).toBe(slugTemoin);
    expect(voisinesDe(entrees, 'securite-web', 'apres').suivante).toBeNull();
    // Slug hors manifeste : deux absences, pas une exception.
    expect(voisinesDe(entrees, 'securite-web', 'inconnu')).toEqual({
      precedente: null,
      suivante: null,
    });
  });

  it('NE DÉBORDE PAS sur le cours voisin, même entrelacé dans le manifeste', () => {
    // 🔴 LE PENDANT DE « SAUTE UN BROUILLON AU MILIEU », pour l'autre filtre. Le
    // manifeste porte `xss` (sécurité), puis `variables` (PHP), puis `injection-sql`
    // (sécurité) : sans filtre de sujet, la « leçon suivante » du XSS serait une leçon
    // de PHP, affichée sous un lien `/cours/securite-web/variables` qui répond 404.
    const deuxCours = manifesteDeuxCours();

    expect(voisinesDe(deuxCours, 'securite-web', 'xss').suivante?.slug).toBe('injection-sql');
    expect(voisinesDe(deuxCours, 'securite-web', 'injection-sql').precedente?.slug).toBe('xss');
    // Aux extrémités DU COURS, pas du manifeste.
    expect(voisinesDe(deuxCours, 'securite-web', 'xss').precedente).toBeNull();
    expect(voisinesDe(deuxCours, 'securite-web', 'injection-sql').suivante).toBeNull();
    // Et le sens réciproque : la leçon de PHP n'a pas de voisine de sécurité.
    expect(voisinesDe(deuxCours, 'php', 'variables')).toEqual({
      precedente: null,
      suivante: null,
    });
    // Un slug du BON manifeste mais du MAUVAIS cours n'est pas un point de départ.
    expect(voisinesDe(deuxCours, 'securite-web', 'variables')).toEqual({
      precedente: null,
      suivante: null,
    });
  });

  it('SAUTE un brouillon posé au MILIEU, au lieu d’interrompre le cours', () => {
    // 🔴 L'ASSERTION QUI DISTINGUE « FILTRER AVANT » DE « FILTRER APRÈS ». Aux
    // extrémités, les deux implémentations coïncident ; c'est au MILIEU qu'elles
    // divergent — filtrer après le calcul du rang rendrait `null` ici, c'est-à-dire un
    // parcours qui s'arrête net sur une leçon que le lecteur n'est pas censé savoir
    // exister. Le cours doit rester CONTINU : `avant` et `apres` sont voisines.
    const premiere = manifesteReel[0];
    if (premiere === undefined) throw new Error('manifeste vide');
    const avecBrouillonAuMilieu: EntreeManifesteRoutes[] = [
      { ...premiere, slug: 'avant', ordre: 1, titre: 'La leçon qui précède', statut: 'publiee' },
      { ...premiere, slug: 'en-chantier', ordre: 2, titre: 'Pas prête', statut: 'brouillon' },
      { ...premiere, slug: 'apres', ordre: 3, titre: 'La leçon qui suit', statut: 'publiee' },
    ];

    expect(voisinesDe(avecBrouillonAuMilieu, 'securite-web', 'avant').suivante?.slug).toBe('apres');
    expect(voisinesDe(avecBrouillonAuMilieu, 'securite-web', 'apres').precedente?.slug).toBe(
      'avant',
    );

    // Et le brouillon lui-même n'a pas de place dans la séquence : il n'est pas un
    // point de départ vers ses anciennes voisines.
    expect(voisinesDe(avecBrouillonAuMilieu, 'securite-web', 'en-chantier')).toEqual({
      precedente: null,
      suivante: null,
    });
  });

  it('n’atteint PAS une leçon `verifiee` de proche en proche', () => {
    // Même barre que le prerender : `verifiee` n'est pas `publiee` (contrôle positif du
    // filtre sur le second statut non publié, celui qu'on oublie).
    const premiere = manifesteReel[0];
    if (premiere === undefined) throw new Error('manifeste vide');
    const deux: EntreeManifesteRoutes[] = [
      { ...premiere, slug: 'en-ligne', ordre: 1, titre: 'Publiée', statut: 'publiee' },
      { ...premiere, slug: 'relue', ordre: 2, titre: 'Relue mais pas publiée', statut: 'verifiee' },
    ];

    expect(voisinesDe(deux, 'securite-web', 'en-ligne').suivante).toBeNull();
  });

  it('compose le titre d’onglet à partir du MANIFESTE, jamais du slug', () => {
    const titre = titreDeDocument(manifesteReel, 'securite-web', slugTemoin);
    expect(titre).toContain(manifesteReel[0]?.titre ?? '');
    expect(titre).toContain('Dr. Je-Sais-Tout');

    // 🔴 Un slug forgé ne se réaffiche PAS, même en repli.
    const forge = 'votre-compte-est-compromis-appelez-le-1-800-000-0000';
    const repli = titreDeDocument(manifesteReel, 'securite-web', forge);
    expect(repli).not.toContain('1-800');
    expect(repli).not.toContain('compromis');
    expect(repli).toContain('Dr. Je-Sais-Tout');
  });

  it('ne titre PAS une page de sécurité avec le titre d’une leçon d’un autre cours', () => {
    // Le titre d'onglet ne filtre pas le STATUT (voir le test suivant), mais il filtre
    // le COURS : nommé avec le titre d'une leçon de PHP, l'onglet ne décrirait plus son
    // document (WCAG 2.4.2) et énoncerait une confusion que la table de routes n'a pas.
    const deuxCours = manifesteDeuxCours();

    expect(titreDeDocument(deuxCours, 'securite-web', 'xss')).toContain('Le XSS');
    // Le slug existe — dans l'AUTRE cours. On tombe donc sur le repli générique, pas
    // sur « Les variables ».
    const repli = titreDeDocument(deuxCours, 'securite-web', 'variables');
    expect(repli).not.toContain('Les variables');
    expect(repli).toContain('Sécurité des applications web');
    // Et le sens réciproque, qui prouve que le filtre discrimine au lieu de tout jeter.
    expect(titreDeDocument(deuxCours, 'php', 'variables')).toContain('Les variables');
  });

  it('nomme AUSSI une leçon non publiée — le titre décrit la page à l’écran', () => {
    // Décision d'E2-ST6, lot C2 : `leconsPubliees` garde ce que le public ATTEINT (URL
    // prerendue, lien de sommaire, voisine). Un titre d'onglet ne fait atteindre personne :
    // il nomme un document DÉJÀ rendu — en `npm start`, ou à la relecture éditoriale.
    // Le filtrer y donnerait un onglet générique au-dessus d'un `<h1>` qui dit autre chose,
    // soit un échec de WCAG 2.4.2 pour zéro gain. Ce test ÉPINGLE ce choix : s'il rougit,
    // c'est qu'on a étendu le filtre par symétrie plutôt que par raisonnement.
    const premiere = manifesteReel[0];
    if (premiere === undefined) throw new Error('manifeste vide');
    const brouillon: EntreeManifesteRoutes[] = [
      { ...premiere, slug: 'en-chantier', titre: 'Une leçon en chantier', statut: 'brouillon' },
    ];

    expect(titreDeDocument(brouillon, 'securite-web', 'en-chantier')).toContain(
      'Une leçon en chantier',
    );
  });
});

describe('rendu de la page', () => {
  /** Monte la page sur une route réelle, avec un `resolve` qui rend la leçon compilée. */
  async function monter(
    entrees: readonly EntreeManifesteRoutes[],
    url = `/cours/securite-web/${slugTemoin}`,
    leconRendue: LeconCompilee = lecon(),
  ): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'cours/securite-web/:slug',
            component: Lecon,
            resolve: { lecon: () => leconRendue },
          },
        ]),
        { provide: MANIFESTE_LECONS, useValue: entrees },
      ],
    });
    const harnais = await RouterTestingHarness.create();
    await harnais.navigateByUrl(url);
    // 🔴 ON ATTEND LA STABILITÉ, PAS SEULEMENT LA NAVIGATION (E2-ST6, lot A2). La page
    // marque la leçon lue depuis un `effect` gardé par `afterNextRender` : ces deux
    // mécanismes courent APRÈS la détection de changements que `navigateByUrl` déclenche.
    // Sans cette attente, le test observerait une progression vide sur un produit sain
    // (L-035 : une prémisse de test fausse rougit sur un produit sain).
    await harnais.fixture.whenStable();
    const rendu = harnais.routeNativeElement;
    if (rendu === null) throw new Error('la page de leçon n’a pas été montée');
    return rendu;
  }

  beforeEach(() => {
    // La progression s'écrit dans `localStorage` : sans ce ménage, un test relirait
    // l'avancement écrit par son voisin.
    document.defaultView?.localStorage.clear();
  });

  afterEach(() => {
    document.defaultView?.localStorage.clear();
    // Les balises OpenGraph sont posées sur le VRAI `document` : sans ce ménage,
    // un test lirait celles du test précédent.
    for (const balise of document.querySelectorAll(
      'meta[property^="og:"], meta[name="description"]',
    )) {
      balise.remove();
    }
  });

  it('🔴 marque la leçon LUE, sous le couple `(sujet, slug)` DU FRONTMATTER', async () => {
    // E2-ST6, lot A2 — le premier et unique appelant de `marquerLue`. Avant ce lot, la
    // méthode existait sans appelant : du code mort qui promettait une fonctionnalité
    // inexistante, et une carte de parcours qui n'aurait jamais su qu'une leçon a été
    // ouverte.
    const { sujet, slug } = lecon().frontmatter;

    // 🔴 L'URL PORTE UN AUTRE SLUG QUE LE FRONTMATTER, ET C'EST LE CŒUR DU TEST. Le
    // `resolve` rend la même leçon quoi qu'il arrive : si la page composait sa clef de
    // progression à partir du segment d'URL — une entrée non fiable —, l'avancement
    // s'écrirait sous le slug forgé. La règle du dépôt est l'inverse (voir l'en-tête de
    // `lecon.ts`), et elle se mesure ici.
    const forge = 'slug-forge-par-un-tiers';
    expect(forge).not.toBe(slug); // contrôle positif : l'écart existe bien
    await monter(manifesteReel, `/cours/securite-web/${forge}`);

    const service = TestBed.inject(ProgressionService);
    expect(service.etatDe(sujet, slug).lue).toBe(true);
    expect(service.etatDe(sujet, forge).lue).toBe(false);
    // Et le sujet compte autant que le slug : la clef est composite depuis le lot A1.
    expect(service.etatDe('php', slug).lue).toBe(false);
  });

  it('n’écrit RIEN de plus que « lue » — aucun score n’est inventé à l’ouverture', async () => {
    // L'autre moitié de la pince. Sans elle, « la leçon est lue » resterait vrai d'une
    // page qui marquerait aussi une maîtrise que personne n'a gagnée — or un module se
    // marque maîtrisé sur un quiz réussi, jamais sur une page ouverte.
    const { sujet, slug } = lecon().frontmatter;
    await monter(manifesteReel);

    const service = TestBed.inject(ProgressionService);
    expect(service.etatDe(sujet, slug)).toEqual({
      lue: true,
      meilleurScore: 0,
      totalQuestions: 0,
    });
    expect(service.estMaitrisee(sujet, slug)).toBe(false);
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

  it('🔴 numérote les figures de code EN CONTINU d’une section à l’autre', async () => {
    // LE DÉFAUT QUE CETTE ASSERTION FERME (E2-ST4, lot C1). Un `RenduBlocs` est monté PAR SECTION :
    // chaque instance repartait donc de « n°1 ». Sur la leçon-témoin, quatre défileurs s'appelaient
    // « Code n°1 » et seul leur LANGAGE les séparait — deux sections portant un bloc du MÊME
    // langage auraient produit deux homonymes stricts. C'est ce cas-là qui est monté ici, et il
    // n'est PAS dans la fixture : la fixture y échappe par hasard.
    const bloc = (): unknown => ({
      type: 'code',
      langage: 'php',
      htmlColore: '<pre class="shiki"><code><span class="line">echo $x;</span></code></pre>',
    });
    const surMesure = copie(lecon()) as unknown as Record<string, unknown>;
    // Cette leçon de mesure réécrit ses sections, donc perd l'ancre `[[simulation]]` de la
    // témoin. Le champ part avec elle : depuis E2-ST5 (lot a), `lireLeconCompilee` exige que
    // les deux moitiés de la paire s'accordent, et une simulation sans ancre serait refusée —
    // à juste titre, ce n'est pas ce que ce test mesure.
    delete surMesure['simulation'];
    surMesure['sections'] = [
      { titre: 'Première', ancre: 'premiere-mesure', niveau: 2, blocs: [bloc()] },
      // La section du milieu niche son bloc dans un ENCADRÉ : le comptage doit y descendre,
      // sinon la troisième section réutilise le numéro de la deuxième.
      {
        titre: 'Deuxième',
        ancre: 'deuxieme-mesure',
        niveau: 2,
        blocs: [{ type: 'encadre', variante: 'note', blocs: [bloc()] }],
      },
      {
        titre: 'Troisième',
        ancre: 'troisieme-mesure',
        niveau: 2,
        blocs: [bloc(), { type: 'ancre-quiz' }],
      },
    ];
    const rendu = await monter(
      manifesteReel,
      `/cours/securite-web/${slugTemoin}`,
      lireLeconCompilee(surMesure, 'leçon de mesure — numérotation continue'),
    );

    const noms = [...rendu.querySelectorAll('.defileur')].map(
      (element) => element.getAttribute('aria-label') ?? '',
    );
    // CONTRÔLE POSITIF (L-019) : trois figures, toutes du MÊME langage. Sans lui, « les noms sont
    // uniques » serait vrai d'une page qui n'aurait rien rendu.
    expect(noms).toHaveLength(3);
    expect(noms.every((nom) => nom.endsWith('— php'))).toBe(true);
    expect(noms).toEqual([
      `Code n°1${INSECABLE}— php`,
      `Code n°2${INSECABLE}— php`,
      `Code n°3${INSECABLE}— php`,
    ]);
  });

  it('ne laisse AUCUN nom de défileur en double sur la leçon-témoin réelle', async () => {
    // L'autre bout de la pince : la mesure précédente est construite, celle-ci porte sur la leçon
    // que le pipeline produit vraiment. Avant le lot C1, elle donnait quatre « Code n°1 ».
    const rendu = await monter(manifesteReel);

    const noms = [...rendu.querySelectorAll('.defileur')].map(
      (element) => element.getAttribute('aria-label') ?? '',
    );
    expect(noms.length).toBeGreaterThan(1); // contrôle positif : on a bien regardé plusieurs figures
    expect(new Set(noms).size, noms.join(' · ')).toBe(noms.length);
    // Et un seul « n°1 » par genre : c'est la continuité, pas seulement l'unicité.
    // ⚠️ LE SÉPARATEUR FAIT PARTIE DU MOTIF, ET C'EST LE POINT (revue du lot C1). `startsWith('Code
    // n°1')` attrape aussi « Code n°10 », « Code n°12 »… : le jour où une leçon porte dix blocs de
    // code, ce filtre en compterait plusieurs et ce test rougirait sur un PRODUIT SAIN — L-035, sur
    // le fichier même dont l'en-tête l'invoque. L'espace du séparateur est U+00A0 et passe par
    // `INSECABLE` : tapée littéralement, elle est refusée par `no-irregular-whitespace`.
    expect(noms.filter((nom) => nom.startsWith(`Code n°1${INSECABLE}—`))).toHaveLength(1);
  });

  it('n’affiche AUCUNE voisine quand la leçon est seule au manifeste', async () => {
    // Une leçon seule est première ET dernière du cours : aucun lien ne doit être rendu — un
    // voisin manquant n'est pas un lien mort.
    // ⚠️ LE MANIFESTE EST RÉDUIT À LA MAIN, ET IL DOIT L'ÊTRE (E2-ST6, lot B). Ce test lisait
    // `manifesteReel`, en s'appuyant sur le fait que la racine-témoin n'avait qu'une leçon —
    // une prémisse de FIXTURE, pas une propriété du produit. Elle a cessé d'être vraie le jour
    // où la fixture en a gagné une seconde, et le test a rougi sur un produit sain (L-035).
    const premiere = manifesteReel[0];
    if (premiere === undefined) throw new Error('manifeste vide');
    const rendu = await monter([premiere]);
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
