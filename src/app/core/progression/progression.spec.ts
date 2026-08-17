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
// ⚠️ UN TEST QUI IMPORTE LA CONSTANTE QU'IL VÉRIFIE NE VÉRIFIE RIEN DU CONTRAT
// (L-012). Le groupe « contrat » plus bas ne compare donc pas `MOTIF_SLUG_LECON`
// à lui-même : il le confronte à L'AUTRE EXTRÉMITÉ — le motif `identifiant` de
// `tools/content-pipeline/schemas/quiz.schema.json`, lu au disque. Si le schéma
// de contenu autorisait un jour des slugs que ce service rejette, la progression
// de ces leçons serait perdue **en silence** ; c'est ce test qui rougit.
// =============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  CLE_PROGRESSION,
  MOTIF_SLUG_LECON,
  ProgressionService,
  SEUIL_REUSSITE,
  VERSION_PROGRESSION,
} from './progression';

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
      const s = service();

      expect(s.progression()).toEqual({});
      expect(s.nombreLues()).toBe(0);
      expect(s.nombreMaitrisees()).toBe(0);
    });

    it('rend un état « vierge » pour une leçon inconnue, jamais `undefined`', () => {
      expect(service().etatDe('04-xss')).toEqual({
        lue: false,
        meilleurScore: 0,
        totalQuestions: 0,
      });
    });

    it('relit une enveloppe valide', () => {
      poserStockage({
        version: VERSION_PROGRESSION,
        lecons: { '04-xss': { lue: true, meilleurScore: 4, totalQuestions: 5 } },
      });

      const s = service();

      expect(s.etatDe('04-xss')).toEqual({ lue: true, meilleurScore: 4, totalQuestions: 5 });
      expect(s.nombreLues()).toBe(1);
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
        lecons: { '04-xss': { lue: true, meilleurScore: 5, totalQuestions: 5 } },
      });

      expect(service().progression()).toEqual({});
    });

    it('ignore une enveloppe SANS version — une forme non versionnée n’est pas la nôtre', () => {
      poserStockage({ lecons: { '04-xss': { lue: true, meilleurScore: 5, totalQuestions: 5 } } });

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
          '03-injection': { lue: true, meilleurScore: 5, totalQuestions: 5 },
          '04-xss': entree,
        },
      });

      const s = service();

      expect(s.etatDe('03-injection').meilleurScore).toBe(5);
      expect(s.etatDe('04-xss')).toEqual({ lue: false, meilleurScore: 0, totalQuestions: 0 });
    });

    it('rejette une clef qui n’est pas un slug valide', () => {
      poserStockage({
        version: VERSION_PROGRESSION,
        lecons: {
          '../../etc/passwd': { lue: true, meilleurScore: 1, totalQuestions: 1 },
          'Slug Majuscule': { lue: true, meilleurScore: 1, totalQuestions: 1 },
        },
      });

      expect(service().progression()).toEqual({});
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
      s.marquerLue('04-xss');
      s.marquerLue('04-xss');

      expect(s.etatDe('04-xss').lue).toBe(true);
      expect(s.nombreLues()).toBe(1);
      expect(lireStockage()).toEqual({
        version: VERSION_PROGRESSION,
        lecons: { '04-xss': { lue: true, meilleurScore: 0, totalQuestions: 0 } },
      });
    });

    it('ne dégrade JAMAIS un score déjà acquis', () => {
      const s = service();
      s.enregistrerQuiz('04-xss', 5, 5);
      s.marquerLue('04-xss');

      expect(s.etatDe('04-xss')).toEqual({ lue: true, meilleurScore: 5, totalQuestions: 5 });
      expect(s.estMaitrisee('04-xss')).toBe(true);
    });

    it('refuse un slug invalide', () => {
      const s = service();
      s.marquerLue('../secret');

      expect(s.progression()).toEqual({});
    });
  });

  describe('enregistrerQuiz', () => {
    it('enregistre un résultat et marque la leçon lue', () => {
      const s = service();
      s.enregistrerQuiz('04-xss', 4, 5);

      expect(s.etatDe('04-xss')).toEqual({ lue: true, meilleurScore: 4, totalQuestions: 5 });
    });

    it('ne retient que le MEILLEUR score — un second essai raté ne fait rien perdre', () => {
      const s = service();
      s.enregistrerQuiz('04-xss', 5, 5);
      s.enregistrerQuiz('04-xss', 1, 5);

      expect(s.etatDe('04-xss').meilleurScore).toBe(5);
      expect(s.estMaitrisee('04-xss')).toBe(true);
    });

    it('compare en PART et non en nombre brut — 4/5 bat 5/10', () => {
      const s = service();
      s.enregistrerQuiz('04-xss', 5, 10);
      s.enregistrerQuiz('04-xss', 4, 5);

      expect(s.etatDe('04-xss')).toEqual({ lue: true, meilleurScore: 4, totalQuestions: 5 });
    });

    it.each([
      ['un total nul', 0, 0],
      ['un score supérieur au total', 6, 5],
      ['un score non entier', 2.5, 5],
      ['un score négatif', -1, 5],
    ])('ignore un appel incohérent : %s', (_cas, score, total) => {
      const s = service();
      s.enregistrerQuiz('04-xss', score, total);

      expect(s.progression()).toEqual({});
    });

    it('ne lève pas quand l’écriture échoue (quota) et garde l’état en mémoire', () => {
      vi.spyOn(fenetre().localStorage, 'setItem').mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError');
      });

      const s = service();

      expect(() => s.enregistrerQuiz('04-xss', 5, 5)).not.toThrow();
      expect(s.etatDe('04-xss').meilleurScore).toBe(5);
    });
  });

  describe('maîtrise', () => {
    it('n’est jamais acquise sans quiz — la lecture seule ne suffit pas', () => {
      const s = service();
      s.marquerLue('04-xss');

      expect(s.estMaitrisee('04-xss')).toBe(false);
      expect(s.nombreMaitrisees()).toBe(0);
    });

    it('s’acquiert exactement AU seuil, pas seulement au-dessus', () => {
      const s = service();
      // 8/10 = 0,8 = SEUIL_REUSSITE : la borne est incluse.
      s.enregistrerQuiz('04-xss', Math.round(SEUIL_REUSSITE * 10), 10);

      expect(s.estMaitrisee('04-xss')).toBe(true);
    });

    it('ne s’acquiert pas juste en dessous du seuil', () => {
      const s = service();
      s.enregistrerQuiz('04-xss', Math.round(SEUIL_REUSSITE * 10) - 1, 10);

      expect(s.estMaitrisee('04-xss')).toBe(false);
    });
  });

  describe('reinitialiser', () => {
    it('vide l’état ET le stockage', () => {
      const s = service();
      s.enregistrerQuiz('04-xss', 5, 5);
      s.reinitialiser();

      expect(s.progression()).toEqual({});
      expect(lireStockage()).toBeNull();
    });
  });

  describe('persistance entre deux instances', () => {
    it('ce qui est écrit par une instance est relu par la suivante', () => {
      service().enregistrerQuiz('04-xss', 4, 5);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});

      expect(service().etatDe('04-xss')).toEqual({
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
        lecons: { '04-xss': { lue: true, meilleurScore: 5, totalQuestions: 5 } },
      });
      const espion = vi.spyOn(fenetre().localStorage, 'getItem');

      const s = service();

      expect(s.progression()).toEqual({});
      expect(espion).not.toHaveBeenCalled();
    });

    it('n’écrit rien au prerender, mais tient l’état en mémoire', () => {
      const espion = vi.spyOn(fenetre().localStorage, 'setItem');

      const s = service();
      s.enregistrerQuiz('04-xss', 5, 5);

      expect(s.estMaitrisee('04-xss')).toBe(true);
      expect(espion).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // CONTRAT — confronté à l'autre extrémité, jamais à lui-même (L-012)
  // ---------------------------------------------------------------------------
  describe('contrat du slug', () => {
    it('accepte exactement les slugs que le schéma de contenu autorise', () => {
      const schema = JSON.parse(
        readFileSync(
          join(process.cwd(), 'tools', 'content-pipeline', 'schemas', 'quiz.schema.json'),
          'utf8',
        ),
      ) as { definitions: { identifiant: { pattern: string } } };

      const motifDuSchema = schema.definitions.identifiant.pattern;

      expect(motifDuSchema).toBeTypeOf('string');
      expect(MOTIF_SLUG_LECON.source).toBe(motifDuSchema);
    });
  });
});
