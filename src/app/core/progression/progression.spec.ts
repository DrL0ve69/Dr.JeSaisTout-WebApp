// =============================================================================
// Tests du ProgressionService — l'avancement, et surtout ce qu'il REFUSE de lire
// -----------------------------------------------------------------------------
// La moitié la plus importante de ce fichier n'est pas « le service sait
// compter » : c'est « le service survit à un `localStorage` réécrit à la main ».
// Le stockage est une entrée non fiable (le visiteur y accède, une version
// antérieure du site a pu y laisser une autre forme), et un état corrompu ne
// lèverait pas forcément — il afficherait une carte de parcours FAUSSE.
//
// jsdom fournit un vrai `localStorage`, utilisé tel quel. On ne l'espionne que
// pour lui faire LEVER une exception, ce que le navigateur fait réellement en
// navigation privée ou au dépassement de quota.
//
// ⚠️ CLEF COMPOSITE `"sujet/slug"` (v2, E2-ST6). Sa composition est un détail
// PRIVÉ du service : l'API publique parle en `(sujet, slug)`. Ces tests écrivent
// donc la clef en toutes lettres UNIQUEMENT quand ils jouent le rôle du disque
// (`poserStockage`) ou celui de l'inspecteur (`lireStockage`) — jamais pour
// appeler le service. C'est ce qui rend la forme de la clef vérifiable sans la
// rendre publique.
//
// ⚠️ UN TEST QUI IMPORTE LA CONSTANTE QU'IL VÉRIFIE NE VÉRIFIE RIEN DU CONTRAT
// (L-012). Le groupe « contrat » plus bas ne compare donc pas
// `MOTIF_SEGMENT_PROGRESSION` à lui-même : il le confronte à L'AUTRE EXTRÉMITÉ —
// le motif `identifiant` de `tools/content-pipeline/schemas/quiz.schema.json` et
// le motif `kebab` de `lecon.frontmatter.schema.json` (celui qui gouverne
// `sujet`), tous deux lus au disque. Si un schéma de contenu autorisait un jour
// des identifiants que ce service rejette, la progression de ces leçons serait
// perdue **en silence** ; c'est ce test qui rougit.
// =============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  CLE_PROGRESSION,
  MOTIF_SEGMENT_PROGRESSION,
  ProgressionService,
  SEUIL_REUSSITE,
  VERSION_PROGRESSION,
} from './progression';

/** Les deux sujets réels de la phase 1 — un cours de sécurité, un cours de PHP. */
const SECURITE = 'securite-web';
const PHP = 'php';

function fenetre(): Window {
  const vue = document.defaultView;
  if (!vue) {
    throw new Error('Aucune fenêtre : ces tests exigent un environnement DOM.');
  }
  return vue;
}

/** Écrit une enveloppe brute dans le stockage, telle qu'elle serait sur disque. */
function poserStockage(valeur: unknown): void {
  fenetre().localStorage.setItem(
    CLE_PROGRESSION,
    typeof valeur === 'string' ? valeur : JSON.stringify(valeur),
  );
}

/** Relit ce que le service a réellement écrit. */
function lireStockage(): unknown {
  const brut = fenetre().localStorage.getItem(CLE_PROGRESSION);
  return brut === null ? null : JSON.parse(brut);
}

function service(): ProgressionService {
  return TestBed.inject(ProgressionService);
}

describe('ProgressionService', () => {
  beforeEach(() => {
    fenetre().localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fenetre().localStorage.clear();
  });

  describe('état initial', () => {
    it('démarre vide quand rien n’est stocké', () => {
      expect(service().progression()).toEqual({});
    });

    it('rend un état « vierge » pour une leçon inconnue, jamais `undefined`', () => {
      expect(service().etatDe(SECURITE, '04-xss')).toEqual({
        lue: false,
        meilleurScore: 0,
        totalQuestions: 0,
      });
    });

    it('relit une enveloppe valide', () => {
      poserStockage({
        version: VERSION_PROGRESSION,
        lecons: { 'securite-web/04-xss': { lue: true, meilleurScore: 4, totalQuestions: 5 } },
      });

      expect(service().etatDe(SECURITE, '04-xss')).toEqual({
        lue: true,
        meilleurScore: 4,
        totalQuestions: 5,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // CLEF COMPOSITE — la raison d'être de la v2
  // ---------------------------------------------------------------------------
  describe('clef composite « sujet/slug »', () => {
    it('n’écrase PAS un même slug d’un autre cours', () => {
      const s = service();
      s.enregistrerQuiz(SECURITE, '01-fondamentaux', 5, 5);
      s.enregistrerQuiz(PHP, '01-fondamentaux', 1, 5);

      expect(s.estMaitrisee(SECURITE, '01-fondamentaux')).toBe(true);
      expect(s.estMaitrisee(PHP, '01-fondamentaux')).toBe(false);
      expect(s.etatDe(PHP, '01-fondamentaux').meilleurScore).toBe(1);
    });

    it('écrit sur disque une clef « sujet/slug », et une seule par leçon', () => {
      service().enregistrerQuiz(SECURITE, '04-xss', 4, 5);

      expect(lireStockage()).toEqual({
        version: VERSION_PROGRESSION,
        lecons: { 'securite-web/04-xss': { lue: true, meilleurScore: 4, totalQuestions: 5 } },
      });
    });

    it.each([
      ['un sujet vide', ''],
      ['un sujet avec une barre oblique', 'cours/securite-web'],
      ['un sujet en majuscules', 'Securite-Web'],
      ['une remontée de chemin', '../../etc'],
      ['un sujet accentué', 'sécurité'],
    ])('ignore %s exactement comme un slug invalide', (_cas, sujet) => {
      const s = service();
      s.enregistrerQuiz(sujet, '04-xss', 5, 5);
      s.marquerLue(sujet, '04-xss');

      expect(s.progression()).toEqual({});
      expect(s.etatDe(sujet, '04-xss')).toEqual({
        lue: false,
        meilleurScore: 0,
        totalQuestions: 0,
      });
      expect(lireStockage()).toBeNull();
    });
  });

  describe('lecture défensive — le stockage est une entrée non fiable', () => {
    it('ignore un contenu qui n’est même pas du JSON, sans lever', () => {
      poserStockage('{ceci n’est pas du JSON');

      expect(() => service()).not.toThrow();
      expect(service().progression()).toEqual({});
    });

    it('ignore une enveloppe d’une version inconnue plutôt que de la deviner', () => {
      poserStockage({
        version: VERSION_PROGRESSION + 1,
        lecons: { 'securite-web/04-xss': { lue: true, meilleurScore: 5, totalQuestions: 5 } },
      });

      expect(service().progression()).toEqual({});
    });

    it('IGNORE une enveloppe v1 — aucune migration, et le contrôle est POSITIF', () => {
      // Contrôle positif : les entrées sont PARFAITEMENT bien formées au sens de
      // la v1 (clef slug nue, valeurs valides). Si l'état ressort vide, c'est le
      // rejet de version qui a mordu — pas une entrée mal écrite par le test.
      // Aucun visiteur réel ne peut détenir un tel enregistrement (au pivot,
      // `content/` ne portait aucune leçon), d'où l'absence délibérée de code de
      // migration : ce test verrouille ce choix contre une réintroduction.
      poserStockage({
        version: 1,
        lecons: {
          '04-xss': { lue: true, meilleurScore: 5, totalQuestions: 5 },
          '03-injection': { lue: true, meilleurScore: 4, totalQuestions: 5 },
        },
      });

      const s = service();

      expect(s.progression()).toEqual({});
      expect(s.etatDe(SECURITE, '04-xss').lue).toBe(false);
      expect(s.estMaitrisee(SECURITE, '04-xss')).toBe(false);
    });

    it('ignore une enveloppe SANS version — une forme non versionnée n’est pas la nôtre', () => {
      poserStockage({
        lecons: { 'securite-web/04-xss': { lue: true, meilleurScore: 5, totalQuestions: 5 } },
      });

      expect(service().progression()).toEqual({});
    });

    it.each([
      ['un score non entier', { lue: true, meilleurScore: 2.5, totalQuestions: 5 }],
      ['un score négatif', { lue: true, meilleurScore: -1, totalQuestions: 5 }],
      ['un score supérieur au total', { lue: true, meilleurScore: 9, totalQuestions: 5 }],
      ['un « lue » non booléen', { lue: 'oui', meilleurScore: 1, totalQuestions: 5 }],
      ['un champ manquant', { lue: true, meilleurScore: 1 }],
      ['une valeur non-objet', 'corrompu'],
      ['une valeur nulle', null],
    ])('rejette une entrée avec %s SANS perdre les entrées valides', (_cas, entree) => {
      poserStockage({
        version: VERSION_PROGRESSION,
        lecons: {
          'securite-web/03-injection': { lue: true, meilleurScore: 5, totalQuestions: 5 },
          'securite-web/04-xss': entree,
        },
      });

      const s = service();

      expect(s.etatDe(SECURITE, '03-injection').meilleurScore).toBe(5);
      expect(s.etatDe(SECURITE, '04-xss')).toEqual({
        lue: false,
        meilleurScore: 0,
        totalQuestions: 0,
      });
    });

    it.each([
      ['une clef SANS séparateur (l’ancienne forme v1)', 'xss'],
      ['une clef à trois segments', 'cours/securite-web/04-xss'],
      ['une remontée de chemin', '../../etc/passwd'],
      ['une clef en majuscules', 'Securite-Web/04-XSS'],
      ['un séparateur sans sujet', '/04-xss'],
      ['un séparateur sans slug', 'securite-web/'],
      ['une clef `__proto__`', '__proto__/04-xss'],
    ])('rejette %s SANS perdre les entrées valides', (_cas, clef) => {
      poserStockage({
        version: VERSION_PROGRESSION,
        lecons: {
          'securite-web/03-injection': { lue: true, meilleurScore: 5, totalQuestions: 5 },
          [clef]: { lue: true, meilleurScore: 1, totalQuestions: 1 },
        },
      });

      const s = service();

      expect(Object.keys(s.progression())).toEqual(['securite-web/03-injection']);
    });

    it('ne se laisse PAS empoisonner par la clef `constructor/xss`', () => {
      // `constructor` est un segment kebab parfaitement légal : la clef est donc
      // ACCEPTÉE, et c'est correct — un cours pourrait s'appeler ainsi. Ce qui
      // est vérifié ici, c'est qu'elle reste une entrée ordinaire : elle ne
      // touche pas le prototype de l'état, et elle ne rend pas « connue » une
      // leçon qui ne l'est pas.
      poserStockage({
        version: VERSION_PROGRESSION,
        lecons: { 'constructor/xss': { lue: true, meilleurScore: 1, totalQuestions: 1 } },
      });

      const s = service();
      const etat = s.progression();

      expect(s.etatDe('constructor', 'xss')).toEqual({
        lue: true,
        meilleurScore: 1,
        totalQuestions: 1,
      });
      expect(Object.getPrototypeOf(etat)).toBe(Object.prototype);
      expect(({} as Record<string, unknown>)['xss']).toBeUndefined();
      // Aucune autre leçon n'est devenue « connue » au passage.
      expect(s.etatDe(SECURITE, 'xss').lue).toBe(false);
      expect(s.etatDe('constructor', '04-xss').lue).toBe(false);
    });

    it('ne rend JAMAIS une propriété héritée du prototype de l’état', () => {
      // Sans clef composite, `etatDe('constructor')` rendait la FONCTION
      // `Object`. Avec le séparateur, aucune clef d'un seul segment n'est
      // composable — et `etatDe` vérifie en plus la propriété propre.
      const s = service();
      s.enregistrerQuiz(SECURITE, '04-xss', 5, 5);

      for (const herite of ['constructor', 'toString', 'hasOwnProperty', 'valueOf']) {
        expect(s.etatDe(herite, herite)).toEqual({
          lue: false,
          meilleurScore: 0,
          totalQuestions: 0,
        });
        expect(s.estMaitrisee(herite, herite)).toBe(false);
      }
    });

    it('ne lève pas quand `localStorage` est inaccessible (navigation privée)', () => {
      vi.spyOn(fenetre().localStorage, 'getItem').mockImplementation(() => {
        throw new DOMException('refusé', 'SecurityError');
      });

      expect(() => service()).not.toThrow();
      expect(service().progression()).toEqual({});
    });
  });

  describe('marquerLue', () => {
    it('marque, persiste, et reste idempotent', () => {
      const s = service();
      s.marquerLue(SECURITE, '04-xss');
      s.marquerLue(SECURITE, '04-xss');

      expect(s.etatDe(SECURITE, '04-xss').lue).toBe(true);
      expect(Object.keys(s.progression())).toEqual(['securite-web/04-xss']);
      expect(lireStockage()).toEqual({
        version: VERSION_PROGRESSION,
        lecons: { 'securite-web/04-xss': { lue: true, meilleurScore: 0, totalQuestions: 0 } },
      });
    });

    it('ne dégrade JAMAIS un score déjà acquis', () => {
      const s = service();
      s.enregistrerQuiz(SECURITE, '04-xss', 5, 5);
      s.marquerLue(SECURITE, '04-xss');

      expect(s.etatDe(SECURITE, '04-xss')).toEqual({
        lue: true,
        meilleurScore: 5,
        totalQuestions: 5,
      });
      expect(s.estMaitrisee(SECURITE, '04-xss')).toBe(true);
    });

    it('refuse un slug invalide', () => {
      const s = service();
      s.marquerLue(SECURITE, '../secret');

      expect(s.progression()).toEqual({});
    });
  });

  describe('enregistrerQuiz', () => {
    it('enregistre un résultat et marque la leçon lue', () => {
      const s = service();
      s.enregistrerQuiz(SECURITE, '04-xss', 4, 5);

      expect(s.etatDe(SECURITE, '04-xss')).toEqual({
        lue: true,
        meilleurScore: 4,
        totalQuestions: 5,
      });
    });

    it('ne retient que le MEILLEUR score — un second essai raté ne fait rien perdre', () => {
      const s = service();
      s.enregistrerQuiz(SECURITE, '04-xss', 5, 5);
      s.enregistrerQuiz(SECURITE, '04-xss', 1, 5);

      expect(s.etatDe(SECURITE, '04-xss').meilleurScore).toBe(5);
      expect(s.estMaitrisee(SECURITE, '04-xss')).toBe(true);
    });

    it('compare en PART et non en nombre brut — 4/5 bat 5/10', () => {
      const s = service();
      s.enregistrerQuiz(SECURITE, '04-xss', 5, 10);
      s.enregistrerQuiz(SECURITE, '04-xss', 4, 5);

      expect(s.etatDe(SECURITE, '04-xss')).toEqual({
        lue: true,
        meilleurScore: 4,
        totalQuestions: 5,
      });
    });

    it.each([
      ['un total nul', 0, 0],
      ['un score supérieur au total', 6, 5],
      ['un score non entier', 2.5, 5],
      ['un score négatif', -1, 5],
    ])('ignore un appel incohérent : %s', (_cas, score, total) => {
      const s = service();
      s.enregistrerQuiz(SECURITE, '04-xss', score, total);

      expect(s.progression()).toEqual({});
    });

    it('ne lève pas quand l’écriture échoue (quota) et garde l’état en mémoire', () => {
      vi.spyOn(fenetre().localStorage, 'setItem').mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError');
      });

      const s = service();

      expect(() => s.enregistrerQuiz(SECURITE, '04-xss', 5, 5)).not.toThrow();
      expect(s.etatDe(SECURITE, '04-xss').meilleurScore).toBe(5);
    });
  });

  describe('maîtrise', () => {
    it('n’est jamais acquise sans quiz — la lecture seule ne suffit pas', () => {
      const s = service();
      s.marquerLue(SECURITE, '04-xss');

      expect(s.estMaitrisee(SECURITE, '04-xss')).toBe(false);
    });

    it('s’acquiert exactement AU seuil, pas seulement au-dessus', () => {
      const s = service();
      // 8/10 = 0,8 = SEUIL_REUSSITE : la borne est incluse.
      s.enregistrerQuiz(SECURITE, '04-xss', Math.round(SEUIL_REUSSITE * 10), 10);

      expect(s.estMaitrisee(SECURITE, '04-xss')).toBe(true);
    });

    it('ne s’acquiert pas juste en dessous du seuil', () => {
      const s = service();
      s.enregistrerQuiz(SECURITE, '04-xss', Math.round(SEUIL_REUSSITE * 10) - 1, 10);

      expect(s.estMaitrisee(SECURITE, '04-xss')).toBe(false);
    });
  });

  describe('reinitialiser', () => {
    it('vide l’état ET le stockage', () => {
      const s = service();
      s.enregistrerQuiz(SECURITE, '04-xss', 5, 5);
      s.reinitialiser();

      expect(s.progression()).toEqual({});
      expect(lireStockage()).toBeNull();
    });
  });

  describe('persistance entre deux instances', () => {
    it('ce qui est écrit par une instance est relu par la suivante', () => {
      service().enregistrerQuiz(SECURITE, '04-xss', 4, 5);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});

      expect(service().etatDe(SECURITE, '04-xss')).toEqual({
        lue: true,
        meilleurScore: 4,
        totalQuestions: 5,
      });
    });
  });

  describe('prerender (plateforme serveur)', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
    });

    it('n’ouvre PAS le stockage et rend un état vide', () => {
      // Le stockage contient quelque chose : si le service le lisait au
      // prerender, le HTML servi à TOUT LE MONDE porterait l'avancement d'un seul.
      poserStockage({
        version: VERSION_PROGRESSION,
        lecons: { 'securite-web/04-xss': { lue: true, meilleurScore: 5, totalQuestions: 5 } },
      });
      const espion = vi.spyOn(fenetre().localStorage, 'getItem');

      const s = service();

      expect(s.progression()).toEqual({});
      expect(espion).not.toHaveBeenCalled();
    });

    it('n’écrit rien au prerender, mais tient l’état en mémoire', () => {
      const espion = vi.spyOn(fenetre().localStorage, 'setItem');

      const s = service();
      s.enregistrerQuiz(SECURITE, '04-xss', 5, 5);

      expect(s.estMaitrisee(SECURITE, '04-xss')).toBe(true);
      expect(espion).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // CONTRAT — confronté à l'autre extrémité, jamais à lui-même (L-012)
  // ---------------------------------------------------------------------------
  describe('contrat des segments de clef', () => {
    function lireSchema(nom: string): unknown {
      return JSON.parse(
        readFileSync(join(process.cwd(), 'tools', 'content-pipeline', 'schemas', nom), 'utf8'),
      );
    }

    it('accepte exactement les SLUGS que le schéma de quiz autorise', () => {
      const schema = lireSchema('quiz.schema.json') as {
        definitions: { identifiant: { pattern: string } };
      };

      const motifDuSchema = schema.definitions.identifiant.pattern;

      expect(motifDuSchema).toBeTypeOf('string');
      expect(MOTIF_SEGMENT_PROGRESSION.source).toBe(motifDuSchema);
    });

    it('accepte exactement les SUJETS que le frontmatter de leçon autorise', () => {
      // `sujet` est un `$ref` vers `#/definitions/kebab` dans ce schéma : c'est
      // donc ce motif-là qui gouverne le premier segment de la clef.
      const schema = lireSchema('lecon.frontmatter.schema.json') as {
        properties: { sujet: { $ref: string } };
        definitions: { kebab: { pattern: string } };
      };

      expect(schema.properties.sujet.$ref).toBe('#/definitions/kebab');
      expect(schema.definitions.kebab.pattern).toBeTypeOf('string');
      expect(MOTIF_SEGMENT_PROGRESSION.source).toBe(schema.definitions.kebab.pattern);
    });
  });
});
