// =============================================================================
// Le validateur de contenu MORD-IL, et mord-il sur la BONNE cause ? (E2-ST1, lot 5)
// -----------------------------------------------------------------------------
// POURQUOI CE TEST EXISTE — et pourquoi il est arrivé en retard.
// `tools/content-pipeline/valider.mjs` porte un mode `--fixtures` qui est le
// contrôle positif du garde-fou (L-019) : quatorze dossiers, une faute chacun, tous
// attendus REFUSÉS. Ce mode était exact, exécutable à la main… et lancé par
// PERSONNE — ni par un test, ni par un script npm, ni par un workflow. Or
// `content/cours/securite-web` n'existe pas encore : l'étape de validation de
// `content:build` valide donc ZÉRO fichier, et sortirait verte même si le glob
// était cassé ou si Ajv ne compilait plus. Le maillon qui décide si une leçon
// entre dans le site n'était vérifié par rien (constat de revue, 2026-08-16).
//
// C'est la cousine de L-019 sur l'axe CÂBLAGE : un contrôle positif qu'aucun
// runner n'exécute est une intention, pas un gate. Ce fichier est le runner.
//
// LES TROIS CHOSES QU'IL PROUVE, et pourquoi aucune ne suffit seule :
//   1. Les quatorze cas invalides sont REFUSÉS. Seul, ce constat est compatible avec
//      un validateur qui refuserait TOUT.
//   2. La leçon-témoin VALIDE passe, code 0. C'est l'autre moitié de la pince :
//      ensemble, les deux prouvent que le garde-fou discrimine.
//   3. Chaque refus porte la BONNE cause, cas par cas. Sans ce troisième point,
//      quatorze refus pour une seule et même raison (un chemin introuvable, disons)
//      seraient indistinguables de quatorze refus corrects.
//
// LES CAUSES ATTENDUES SONT ÉCRITES ICI, EN DUR — jamais importées de l'outil
// qu'elles vérifient (L-012). Un test qui importe la constante dont il contrôle
// la valeur ne vérifie rien du contrat : il vérifie que `x === x`.
//
// POURQUOI PAR PROCESSUS FILS. Même raison que le spec de compilation : le
// validateur est un `.mjs` du TROISIÈME programme TypeScript
// (`tsconfig.tools.json`, Node pur) ; l'importer le ferait entrer dans
// `tsconfig.spec.json`, qui n'a ni `allowJs` ni les types Node de l'outillage.
// On exécute donc la ligne de commande RÉELLE — celle que la CI lance.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const VALIDATEUR = 'tools/content-pipeline/valider.mjs';
const DOSSIER_INVALIDES = 'tools/content-pipeline/__fixtures__/invalides';
const FIXTURE_VALIDE = 'tools/content-pipeline/__fixtures__/temoin-minimal';

/** Ajv compile ses schémas et quatorze racines : lent une fois, pas quatorze fois. */
const DELAI = 60_000;

/**
 * Un cas = un dossier, une faute, une empreinte de cause. Le fragment attendu est
 * volontairement le morceau le plus SPÉCIFIQUE du message — celui qu'un autre cas
 * ne pourrait pas produire par accident.
 */
const CAS_ATTENDUS: readonly { dossier: string; cause: RegExp }[] = [
  { dossier: 'quiz-moins-de-cinq-questions', cause: /\/questions — doit compter au moins 5/ },
  { dossier: 'quiz-explication-absente', cause: /\/questions\/1 .*« explication »/ },
  { dossier: 'quiz-fiche-source-absente', cause: /\/questions\/0 .*« ficheSource »/ },
  { dossier: 'frontmatter-slug-non-kebab-case', cause: /\/slug — ne respecte pas le motif/ },
  { dossier: 'corps-espace-fine-insecable-u202f', cause: /U\+202F .*seule U\+00A0 est permise/ },
  { dossier: 'marqueur-a-verifier-en-statut-publiee', cause: /marqueur .*statut: publiee/ },
  { dossier: 'corps-section-gabarit-manquante', cause: /section « ## À retenir » absente/ },
  { dossier: 'corps-conteneur-hors-liste-fermee', cause: /conteneur « ::: astuce » hors de la liste/ },
  { dossier: 'simulation-lecon-differente-du-slug', cause: /« lecon ».*ne correspond pas au slug/ },
  // Dixième cas, ajouté le 2026-08-17 sur constat de revue de sécurité. Il ne verrouille pas une
  // règle NEUVE : il verrouille une règle que le validateur appliquait PAR ACCIDENT. L'ancien motif
  // de titre `/^(#{1,6})\s+(.+?)\s*$/` faisait entrer « ## » suivi de blanches seules dans le relevé
  // des sections, où le contrôle d'ordre du gabarit finissait par s'en plaindre — sous une cause qui
  // ne nommait pas la vraie faute. La réécriture du motif (S8786) l'a fait disparaître du relevé, et
  // donc cesser d'être refusé, SANS qu'aucun test ne rougisse : le seul chemin du lot où une décision
  // a bougé sans que rien d'exécutable le constate. Le refus est désormais EXPLICITE, et ce cas est
  // ce qui l'empêche de redevenir accidentel.
  { dossier: 'corps-titre-de-section-vide', cause: /titre de section sans texte/ },
  // Onzième et douzième cas, ajoutés le 2026-08-18 (E2-ST3, lot E-a). Ils verrouillent les deux
  // unicités qu'un `quiz.json` doit tenir et que JSON Schema ne peut pas exprimer. Le point à ne
  // pas manquer : sans eux, le refus vient du COMPOSANT, donc au prerender d'`ng build`, sur un
  // message qui nomme la question et le champ mais PAS le fichier, au milieu d'une pile Angular.
  // Et l'unicité des `choix[].id` était déjà écrite dans `valider.mjs` — sans qu'aucune fixture ne
  // l'exerce : exactement L-019, une règle exacte que rien n'empêchait de disparaître.
  {
    dossier: 'quiz-associer-gauche-repete',
    cause: /« q4 » : « paires » — deux paires portent le même « gauche »/,
  },
  {
    dossier: 'quiz-choix-identifiant-repete',
    cause: /« q1 » : « choix » — deux choix portent le même « id »/,
  },
  // Treizième cas (lot E-a, constat de revue) : la TROISIÈME règle d'unicité du quiz — celle des
  // `id` de QUESTION — existait dans `valider.mjs` sans aucune fixture, pendant que les deux
  // autres venaient d'en recevoir une. C'est le L-019 laissé ouvert sur la seule des trois qui
  // alimente vraiment le langage de requête : `quiz.ts` retrouve une radio par
  // `[id="…"] input[type=radio]:checked`, et `querySelector` rend le PREMIER match — deux
  // questions homonymes feraient donc relire à l'amorçage L-033 la radio d'une AUTRE question.
  { dossier: 'quiz-question-identifiant-repete', cause: /« q1 » : identifiant répété/ },
  // Quatorzième cas (lot E-a) : le CONTRÔLE POSITIF de la clef d'indiscernabilité. Les deux
  // libellés `gauche` y sont deux chaînes d'octets DIFFÉRENTES (la seconde finit par une U+00A0)
  // que rien ne sépare à l'écran. Avant le correctif, la comparaison portait sur les octets bruts
  // et ce cas sortait ACCEPTÉ — sur un contenu que le rendu aurait cassé. Et ce n'est pas
  // exotique : `.claude/rules/contenu-pedagogique.md` §3 impose U+00A0 dans le contenu du site.
  {
    dossier: 'quiz-associer-gauche-indiscernable',
    cause: /« q4 » : « paires ».*ne diffèrent que par des blanches ou une normalisation Unicode/,
  },
];

/**
 * Lance le validateur et rend sa sortie complète. Le mode `--fixtures` sort en
 * code 1 PAR CONSTRUCTION (du contenu invalide a bien été détecté) : c'est la
 * liste des causes qui fait foi, pas le code. On ne peut donc pas se contenter
 * de `execFileSync` sans capture.
 */
function lancer(args: readonly string[]): { sortie: string; code: number } {
  try {
    const sortie = execFileSync(process.execPath, [VALIDATEUR, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { sortie, code: 0 };
  } catch (erreur) {
    const detail = erreur as { status?: number; stdout?: string; stderr?: string };
    return {
      sortie: `${detail.stdout ?? ''}${detail.stderr ?? ''}`,
      code: detail.status ?? -1,
    };
  }
}

describe('le contrôle positif du validateur de contenu', () => {
  let sortie = '';

  beforeAll(() => {
    sortie = lancer(['--fixtures', DOSSIER_INVALIDES]).sortie;
  }, DELAI);

  it(
    'traite les QUATORZE cas, et aucun ne manque à l’appel',
    () => {
      // Compte en DUR, pas `CAS_ATTENDUS.length` : dériver l'attendu de la table qui sert déjà à
      // la boucle ci-dessous ferait un test qui se compare à lui-même (L-012). Ce littéral est ce
      // qui oblige un humain à constater qu'un cas est apparu ou a disparu.
      expect(sortie).toContain('14 cas attendus INVALIDES');
      expect(sortie).toContain('14/14 cas refusés avec une cause nommée');
    },
    DELAI,
  );

  // Le cœur : chaque cas est refusé POUR SA PROPRE RAISON. Douze refus identiques
  // passeraient l'assertion globale ci-dessus et échoueraient ici.
  for (const { dossier, cause } of CAS_ATTENDUS) {
    it(
      `refuse « ${dossier} » sur sa cause propre`,
      () => {
        expect(sortie).toMatch(new RegExp(`✔ ${dossier}`));
        expect(sortie).toMatch(cause);
      },
      DELAI,
    );
  }

  // GARDE-FOU DE COMPLÉTUDE. Sans lui, ajouter un quinzième cas de fixture sans
  // écrire son assertion laisserait ce spec vert — et le nouveau cas ne serait
  // vérifié par personne, ce qui est exactement la faute que ce fichier répare.
  it('connaît TOUS les dossiers de fixtures — un cas ajouté sans assertion fait rougir', () => {
    const surDisque = readdirSync(DOSSIER_INVALIDES, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    const connus = CAS_ATTENDUS.map((c) => c.dossier).sort();
    expect(surDisque).toEqual(connus);
  });
});

describe('l’autre moitié de la pince — le validateur ne refuse pas TOUT', () => {
  it(
    'accepte la leçon-témoin valide, en code 0',
    () => {
      const { sortie, code } = lancer(['--racine', FIXTURE_VALIDE]);
      expect(code).toBe(0);
      expect(sortie).toMatch(/1 leçon\(s\) valides/);
    },
    DELAI,
  );
});
