// =============================================================================
// LE GATE DU FORMAT ACTIONNABLE (décision D-D) — les deux moitiés de la pince,
// et le compteur du durcissement.
//
// POURQUOI PAR PROCESSUS FILS. Même raison que les deux specs du pipeline : le
// validateur est un `.mjs` du TROISIÈME programme TypeScript
// (`tsconfig.tools.json`, Node pur) ; l'importer le ferait entrer dans
// `tsconfig.spec.json`, qui n'a ni `allowJs` ni les types Node de l'outillage.
// On exécute donc la ligne de commande RÉELLE — celle que la CI lance.
//
// 🔴 POURQUOI CE FICHIER PORTE AUSSI L'APPLICATION DE LA RÈGLE, ET PAS SEULEMENT
// SA MESURE. Le contrat du lot 0 écrivait qu'un slug de
// `MODULES_AU_FORMAT_ACTIONNABLE` SANS leçon correspondante fait échouer le
// build. Porté dans `valider.mjs`, ce contrôle mordrait sur CHAQUE racine que le
// validateur examine — or il en examine une douzaine qui ne sont pas le corpus :
// les racines de `tools/content-pipeline/__fixtures__/`, qui n'ont aucune raison
// de porter un `projet-de-session`. La permission morte se juge donc là où LE
// corpus est visible, et nulle part ailleurs. Le gate reste bloquant : G-test
// est rouge tant que la liste ment.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const VALIDATEUR = 'tools/content-pipeline/valider.mjs';
const FIXTURE = 'tools/content-pipeline/__fixtures__/format-actionnable';
const CORPUS = 'content/cours/securite-web';
const MODULE = '11-projet-de-session';

/** Ajv compile ses schémas et une racine par cas : lent une fois, pas une fois par cas. */
const DELAI = 60_000;

function lancer(args: readonly string[]): { sortie: string; code: number } {
  try {
    const sortie = execFileSync(process.execPath, [VALIDATEUR, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { sortie, code: 0 };
  } catch (erreur) {
    const detail = erreur as { status?: number; stdout?: string; stderr?: string };
    return { sortie: `${detail.stdout ?? ''}${detail.stderr ?? ''}`, code: detail.status ?? -1 };
  }
}

describe('le gate du FORMAT ACTIONNABLE, côté VALIDATEUR (décision D-D)', () => {
  let bac = '';

  beforeAll(() => {
    bac = mkdtempSync(join(tmpdir(), 'drjst-format-actionnable-'));
  });

  afterAll(() => {
    rmSync(bac, { recursive: true, force: true });
  });

  /**
   * Copie la racine témoin, applique LES mutations du cas, et rend le chemin de la racine mutée.
   *
   * 🔴 CHAQUE MUTATION EST VÉRIFIÉE AVANT D'ÊTRE MESURÉE (L-015). Les fins de ligne de ce dépôt
   * sont mixtes ; un remplacement qui ne mordrait pas laisserait la racine VALIDE, et l'assertion
   * accuserait le garde-fou d'un défaut qui serait celui du harnais. On lève donc sur la cible
   * introuvable — c'est-à-dire sur la fixture qui aurait changé de forme, la vraie cause.
   */
  function muter(nom: string, mutations: readonly (readonly [string, string])[]): string {
    const racine = join(bac, nom);
    cpSync(FIXTURE, racine, { recursive: true });
    const fichier = join(racine, MODULE, 'lecon.md');
    let source = readFileSync(fichier, 'utf8');
    for (const [avant, apres] of mutations) {
      if (!source.includes(avant)) {
        throw new Error(`« ${nom} » : « ${avant.slice(0, 50)}… » introuvable — la fixture a changé`);
      }
      source = source.replace(avant, apres);
    }
    writeFileSync(fichier, source, 'utf8');
    return racine;
  }

  it(
    'ACCEPTE la racine témoin — sans quoi les cinq refus ne prouveraient rien',
    () => {
      const { sortie, code } = lancer(['--racine', FIXTURE]);
      expect(code).toBe(0);
      expect(sortie).toContain('1 leçon(s) valides');
    },
    DELAI,
  );

  it(
    'ACCEPTE la MÊME faute sur un module HORS de la liste — le seul discriminant du gate',
    () => {
      // 🔴 LA MOITIÉ QUI DISCRIMINE. Sans elle, « refuse un titre sans renvoi » est indistinguable
      // de « refuse TOUT titre sans renvoi » — soit un gate qui ferait rougir les neuf autres
      // leçons publiées, dont aucune n'annote ses titres. Ce que la mutation change n'est PAS la
      // faute : c'est le seul `slug`, donc l'appartenance à MODULES_AU_FORMAT_ACTIONNABLE.
      const racine = muter('hors-liste', [
        ['slug: projet-de-session', 'slug: hors-liste'],
        [' {hors-cours}\n\nCe titre n', '\n\nCe titre n'],
      ]);
      // Le nom du dossier et le `lecon` du quiz suivent le slug : ce sont trois écritures du même
      // nom, et les deux autres sont tenues par des règles antérieures (3 et 11).
      cpSync(join(racine, MODULE), join(racine, '11-hors-liste'), { recursive: true });
      rmSync(join(racine, MODULE), { recursive: true, force: true });
      const quiz = join(racine, '11-hors-liste', 'quiz.json');
      writeFileSync(
        quiz,
        readFileSync(quiz, 'utf8').replace('"lecon": "projet-de-session"', '"lecon": "hors-liste"'),
        'utf8',
      );

      const { sortie, code } = lancer(['--racine', racine]);
      expect(sortie).not.toContain('FORMAT ACTIONNABLE');
      expect(code).toBe(0);
    },
    DELAI,
  );

  /**
   * LES CINQ REFUS, EN TABLE — chacun sur SA cause propre.
   *
   * ⚠️ Le fragment attendu est le morceau le plus SPÉCIFIQUE du message : un gate qui refuserait
   * tout passerait un test qui n'épingle que l'échec. Et chaque cas est écrit pour ne produire
   * qu'UNE anomalie : `anomalie(s)` est épinglé à 1, sans quoi une seconde cause pourrait masquer
   * la disparition de celle qu'on mesure.
   */
  const REFUS: readonly {
    nom: string;
    quoi: string;
    mutations: readonly (readonly [string, string])[];
    cause: string;
  }[] = [
    {
      nom: 'sans-seance',
      quoi: 'un module de la liste SANS « seance » — l’exigence des renvois disparaîtrait en silence',
      mutations: [['seance: 1\n', '']],
      cause: 'module déclaré au FORMAT ACTIONNABLE et sans « seance »',
    },
    {
      // 🔴 LE NIVEAU 3. Le relevé qui a dimensionné ce chantier compte 247 titres `##` ET `###`
      // ensemble : un gate qui n'exigerait que les `##` laisserait la moitié du corpus dehors
      // sans que rien ne le dise. C'est ce cas-là, et lui seul, qui l'interdit.
      nom: 'titre-de-niveau-3-sans-renvoi',
      quoi: 'un titre de NIVEAU 3 sans renvoi — les deux niveaux comptent',
      mutations: [[' {hors-cours}\n\nCe titre n', '\n\nCe titre n']],
      cause: '« ### Le titre de niveau 3 compte AUSSI » sans renvoi au cours',
    },
    {
      nom: 'section-absente',
      quoi: 'la section « En bref » ABSENTE, en nommant la place qu’elle doit occuper',
      mutations: [
        ['## En bref — la marche à suivre {hors-cours}', '## Ce qu’il faut faire {hors-cours}'],
      ],
      cause: 'section « ## En bref — la marche à suivre » absente',
    },
    {
      // La section EXISTE et elle est bien placée : ce qui manque est le conteneur. Sans ce cas,
      // un titre nu suffirait à passer le gate — or un titre n'est pas une marche à suivre.
      nom: 'section-sans-conteneur',
      quoi: 'la section présente mais VIDE de son conteneur',
      mutations: [
        [':::: marche-a-suivre {titre="Déclarer un module au format actionnable"}\n\n', ''],
      ],
      cause: 'sans conteneur « :::: marche-a-suivre »',
    },
    {
      // ⚠️ DEUX remplacements, et c'est le seul cas qui en demande deux : « mal placée » n'existe
      // que si la section est AILLEURS, donc si une autre occupe sa place.
      nom: 'section-mal-placee',
      quoi: 'la section présente mais PAS immédiatement après « L’idée en une image »',
      mutations: [
        ['## En bref — la marche à suivre {hors-cours}', '## Ce qu’il faut faire {hors-cours}'],
        [
          '## Ce que le gate exige {seance="1" diapos="3-5"}',
          '## En bref — la marche à suivre {seance="1" diapos="3-5"}',
        ],
      ],
      cause:
        'mal placée — le contrat la veut immédiatement après « ## L\'idée en une image », où se trouve « ## Ce qu\'il faut faire »',
    },
  ];

  for (const cas of REFUS) {
    it(
      `refuse ${cas.quoi}`,
      () => {
        const { sortie, code } = lancer(['--racine', muter(cas.nom, cas.mutations)]);
        expect(code).toBe(1);
        expect(sortie).toContain(cas.cause);
        expect(sortie).toContain('1 anomalie(s)');
      },
      DELAI,
    );
  }
});

describe('le durcissement module par module — la liste, le corpus, le compteur (D-D)', () => {
  /**
   * La liste est LUE au validateur, jamais recopiée ici. C'est l'arbitrage du lot 1b appliqué à un
   * spec : la duplication est le contrat pour ce qui JUGE, jamais pour ce qui RECENSE (L-095) —
   * deux copies d'une liste que rien n'apparie divergeraient, et le compteur mentirait sans rougir.
   */
  function listeDuValidateur(): readonly string[] {
    const { sortie, code } = lancer(['--modules-actionnables']);
    expect(code).toBe(0);
    return JSON.parse(sortie) as string[];
  }

  /** Les modules du corpus, avec leur statut — lus au frontmatter, comme le validateur les lit. */
  function corpus(): readonly { dossier: string; slug: string; statut: string }[] {
    return readdirSync(CORPUS, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => {
        const source = readFileSync(join(CORPUS, e.name, 'lecon.md'), 'utf8');
        return {
          dossier: e.name,
          slug: /^slug:[ \t]*(\S+)[ \t]*$/m.exec(source)?.[1] ?? '',
          statut: /^statut:[ \t]*(\S+)[ \t]*$/m.exec(source)?.[1] ?? '',
        };
      });
  }

  it('la liste n’est pas VIDE — un gate qui ne vise personne ne garde rien', () => {
    expect(listeDuValidateur().length).toBeGreaterThan(0);
  });

  it('ne porte AUCUNE permission morte : chaque slug listé a une leçon PUBLIÉE dans le corpus', () => {
    // 🔴 FAMILLE S-005 — une permission qui ne correspond à rien est une permission qu'on CROIT
    // appliquée. Un module renommé ou retiré laisserait derrière lui une entrée qui n'exige plus
    // rien de personne, et que personne ne relirait. `publiee` et pas seulement « existe » :
    // entrer dans la liste, c'est déclarer le module entièrement conforme, après revue humaine.
    const publies = new Set(corpus().filter((m) => m.statut === 'publiee').map((m) => m.slug));
    const mortes = listeDuValidateur().filter((slug) => !publies.has(slug));
    expect(
      mortes,
      `slugs de MODULES_AU_FORMAT_ACTIONNABLE sans leçon publiée : ${mortes.join(', ')}`,
    ).toEqual([]);
  });

  it('IMPRIME ce qu’il reste à reprendre — un compteur qui descend vaut mieux qu’une promesse', () => {
    // Ce test n'épingle pas un COMPTE : l'épingler obligerait à le corriger à chaque module repris
    // sans rien prouver de plus que le test précédent. Ce qu'il garantit, c'est que le reste à
    // faire est ÉCRIT au journal de chaque exécution de G-test — le jour où il tombe à zéro,
    // `MODULES_AU_FORMAT_ACTIONNABLE` se supprime et la règle 13 devient inconditionnelle.
    const liste = new Set(listeDuValidateur());
    const publies = corpus().filter((m) => m.statut === 'publiee');
    const restants = publies.filter((m) => !liste.has(m.slug));
    console.log(
      `\nFORMAT ACTIONNABLE — ${publies.length - restants.length}/${publies.length} module(s) ` +
        `repris ; ${restants.length} restant(s) : ${restants.map((m) => m.dossier).join(', ')}\n`,
    );
    expect(restants.length).toBeLessThan(publies.length);
  });
});
