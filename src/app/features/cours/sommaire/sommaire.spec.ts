// =============================================================================
// Tests de Sommaire — ce que ce fichier tient, et que rien d'autre ne tient
// -----------------------------------------------------------------------------
//  1. LA GÉNÉRICITÉ, à DEUX sujets. C'est le test qui REMPLACE la route
//     `/cours/php` refusée par la décision D-3 du plan d'E2-ST6 : le même
//     composant rend deux cours à partir du même manifeste, sans qu'aucune route
//     neuve n'existe. Si ce test disparaît, la décision D-3 n'est plus prouvée
//     par rien.
//  2. L'INVARIANCE STRUCTURELLE progression vide / progression peuplée. C'est la
//     moitié assertable du gate d'hydratation (L-033) : un timing ne s'affirme
//     pas, une structure DOM si.
//  3. LE FILTRAGE DES BROUILLONS. `statut: 'verifiee'` n'est PAS publié non plus —
//     c'est l'erreur que le mot « vérifiée » invite à commettre.
//  4. LA LISTE PLATE quand aucune leçon ne porte de `section` (le champ est
//     optionnel et tout-ou-rien, décision D-2 : les deux modes sont réels).
//  5. LA SOURCE DU COMPTE DE MAÎTRISE. Une entrée de progression maîtrisée pour
//     un slug ABSENT du manifeste ne doit rien ajouter : c'est le défaut exact
//     qui a fait retirer `nombreMaitrisees` du service au lot A1 (« 12/13 »
//     devenu « 14/13 »).
//  6. LES JALONS D'ÉVALUATION intercalés au sommaire (`ancrage-au-cours.md`
//     §5(c)) : leur position, leurs libellés, leur invariance à l'hydratation, et
//     le CONTRÔLE POSITIF du fail-closed — un jalon qui tomberait à l'intérieur
//     d'une section fait LEVER, il ne se repousse pas à la frontière.
//
// L-012 appliqué : aucune valeur attendue n'est importée du composant. Le
// manifeste est écrit ICI, et les seuls textes comparés à un littéral sont ceux
// que le composant écrit lui-même (libellés d'état, unités de durée) — c'est
// précisément le contrat qu'on veut verrouiller.
//
// La progression est semée par l'API PUBLIQUE du service (`enregistrerQuiz`,
// `marquerLue`), jamais en écrivant `localStorage` à la main : un test qui
// recopierait le format de stockage resterait vert le jour où ce format change.
// =============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ProgressionService } from '../../../core/progression/progression';
import { HORAIRES_DES_COURS, MANIFESTE_LECONS } from '../contenu-compile';
import { Sommaire } from './sommaire';

// -----------------------------------------------------------------------------
// Le manifeste de test — écrit ici, DÉLIBÉRÉMENT DÉSORDONNÉ
// -----------------------------------------------------------------------------
// Les entrées ne sont ni triées par `ordre` ni groupées par section contiguë :
// le manifeste réel n'offre aucune de ces garanties, et un composant qui s'y
// fierait passerait un test trié.
//
// 🔴 `niveau` NE PREND QUE LES CINQ VALEURS DU CONTRAT — `maternelle`, `primaire`,
// `secondaire`, `cegep`, `universite` (schéma de build, repris nominativement dans
// `NIVEAUX`, et VÉRIFIÉ par `lireManifeste`). Le type ambiant les déclare `string`,
// donc rien ici n'empêche d'écrire `debutant` : une fixture hors contrat est
// exactement ce qui a rendu vert, pendant tout un lot, le test « rend le niveau en
// français » alors que le composant affichait la valeur brute sur 100 % des lignes
// réelles. Une valeur inventée ici ne teste rien qui puisse se produire en page.
const MANIFESTE: readonly EntreeManifesteRoutes[] = [
  {
    sujet: 'securite-web',
    slug: 'entetes',
    section: 'Défenses',
    ordre: 3,
    titre: 'Les en-têtes de sécurité',
    dureeEstimee: 18,
    niveau: 'universite',
    statut: 'publiee',
  },
  {
    sujet: 'securite-web',
    slug: 'injection-sql',
    section: 'Attaques classiques',
    ordre: 2,
    titre: 'L’injection SQL',
    dureeEstimee: 25,
    niveau: 'cegep',
    statut: 'publiee',
  },
  {
    sujet: 'securite-web',
    slug: 'xss',
    section: 'Attaques classiques',
    ordre: 1,
    titre: 'Le XSS',
    dureeEstimee: 20,
    niveau: 'secondaire',
    statut: 'publiee',
  },
  {
    sujet: 'securite-web',
    slug: 'csrf-en-chantier',
    section: 'Attaques classiques',
    ordre: 4,
    titre: 'Un brouillon qui ne doit pas sortir',
    dureeEstimee: 99,
    niveau: 'universite',
    statut: 'brouillon',
  },
  {
    sujet: 'securite-web',
    slug: 'relue-mais-pas-publiee',
    section: 'Défenses',
    ordre: 5,
    titre: 'Une leçon relue mais pas publiée',
    dureeEstimee: 77,
    niveau: 'universite',
    statut: 'verifiee',
  },

  // Le second cours — AUCUNE section : c'est lui qui exerce la liste plate.
  {
    sujet: 'php',
    slug: 'formulaires',
    ordre: 2,
    titre: 'Les formulaires',
    dureeEstimee: 18,
    niveau: 'primaire',
    statut: 'publiee',
  },
  {
    sujet: 'php',
    slug: 'variables',
    ordre: 1,
    titre: 'Les variables',
    dureeEstimee: 12,
    niveau: 'primaire',
    statut: 'publiee',
  },
];

/** U+00A0, en séquence d'échappement : une littérale est refusée par ESLint. */
const NBSP = '\u00A0';

/**
 * L'horaire par défaut des tests : AUCUN.
 *
 * Le jeton `HORAIRES_DES_COURS` a une vraie valeur par défaut — les horaires
 * COMPILÉS du dépôt, `securite-web` compris. Sans ce provider, chaque test de
 * `securite-web` rendrait donc les trois jalons de l'horaire réel de l'enseignant,
 * et la suite épinglerait un inventaire ÉDITORIAL qu'aucun lot ne contrôle (L-065).
 * Les tests de jalons fournissent leur propre horaire, écrit ici (L-012).
 */
const SANS_HORAIRE: ReadonlyMap<string, HoraireCompile> = new Map();

function configurer(
  manifeste: readonly EntreeManifesteRoutes[] = MANIFESTE,
  horaires: ReadonlyMap<string, HoraireCompile> = SANS_HORAIRE,
): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: MANIFESTE_LECONS, useValue: manifeste },
      { provide: HORAIRES_DES_COURS, useValue: horaires },
    ],
  });
}

async function rendre(sujet: string): Promise<ComponentFixture<Sommaire>> {
  const fixture = TestBed.createComponent(Sommaire);
  fixture.componentRef.setInput('sujet', sujet);
  await fixture.whenStable();
  return fixture;
}

function hote(fixture: ComponentFixture<Sommaire>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function textes(fixture: ComponentFixture<Sommaire>, selecteur: string): string[] {
  return [...hote(fixture).querySelectorAll(selecteur)].map((n) => n.textContent?.trim() ?? '');
}

/**
 * La STRUCTURE du DOM, classes et textes exclus.
 *
 * C'est l'invariant du gate d'hydratation : entre une progression vide et une
 * progression peuplée, cette chaîne doit être rigoureusement identique.
 */
function squelette(fixture: ComponentFixture<Sommaire>): string {
  return [...hote(fixture).querySelectorAll('*')].map((n) => n.tagName).join('>');
}

/** Le source du composant, lu au disque — pour les interdits de forme. */
function sourceDuComposant(): string {
  return readFileSync(
    join(process.cwd(), 'src', 'app', 'features', 'cours', 'sommaire', 'sommaire.ts'),
    'utf8',
  );
}

function sourceDuGabarit(): string {
  return readFileSync(
    join(process.cwd(), 'src', 'app', 'features', 'cours', 'sommaire', 'sommaire.html'),
    'utf8',
  );
}

describe('Sommaire', () => {
  beforeEach(() => {
    // Le service relit `localStorage` à sa construction : sans ce nettoyage, un
    // test sèmerait la progression du suivant.
    localStorage.clear();
    configurer();
  });

  afterEach(() => localStorage.clear());

  // ---------------------------------------------------------------------------
  describe('généricité — le même composant rend deux cours (décision D-3)', () => {
    it('ne rend que les modules du `sujet` demandé, dans les deux sens', async () => {
      const securite = await rendre('securite-web');
      expect(textes(securite, '.titre')).toEqual([
        'Le XSS',
        'L’injection SQL',
        'Les en-têtes de sécurité',
      ]);

      TestBed.resetTestingModule();
      configurer();

      const php = await rendre('php');
      expect(textes(php, '.titre')).toEqual(['Les variables', 'Les formulaires']);
    });

    it('trie par `ordre`, sans se fier à l’ordre du manifeste', async () => {
      // Le manifeste liste `entetes` (3) AVANT `xss` (1) : un composant qui
      // rendrait le manifeste tel quel échouerait ici et nulle part ailleurs.
      const fixture = await rendre('securite-web');

      expect(textes(fixture, '.numero')).toEqual(['1', '2', '3']);
    });

    it('ne rend AUCUN module d’un sujet inconnu, et le dit', async () => {
      const fixture = await rendre('sujet-qui-nexiste-pas');

      expect(hote(fixture).querySelectorAll('.module').length).toBe(0);
      expect(hote(fixture).querySelector('.vide')?.textContent).toContain('en préparation');
    });
  });

  // ---------------------------------------------------------------------------
  describe('publication — un brouillon n’est pas un module', () => {
    it('exclut `brouillon` ET `verifiee`', async () => {
      const fixture = await rendre('securite-web');
      const titres = textes(fixture, '.titre');

      expect(titres).not.toContain('Un brouillon qui ne doit pas sortir');
      expect(titres).not.toContain('Une leçon relue mais pas publiée');
      expect(titres.length).toBe(3);
    });

    it('n’ajoute PAS la durée des leçons non publiées au total', async () => {
      // 20 + 25 + 18 = 63 minutes. Le brouillon (99) et la relue (77) porteraient
      // le total à 239 — un écart qu'aucune erreur d'arrondi ne peut produire.
      const fixture = await rendre('securite-web');

      expect(hote(fixture).querySelector('.resume')?.textContent).toContain(
        `1${NBSP}h${NBSP}03`,
      );
    });

    it('ne compte pas les leçons non publiées dans le dénominateur', async () => {
      const fixture = await rendre('securite-web');

      expect(hote(fixture).querySelector('.resume')?.textContent).toContain('3 modules');
    });
  });

  // ---------------------------------------------------------------------------
  describe('groupement — sections ou liste plate (décision D-2)', () => {
    it('groupe par section, dans l’ordre d’apparition, quand toutes en portent une', async () => {
      const fixture = await rendre('securite-web');

      expect(textes(fixture, '.titre-section')).toEqual(['Attaques classiques', 'Défenses']);
      // Les sections ne sont pas contiguës dans le manifeste : `entetes`
      // (Défenses) y précède les deux modules d'« Attaques classiques ».
      const groupes = [...hote(fixture).querySelectorAll('.groupe')];
      expect(groupes.length).toBe(2);
      expect(groupes[0]?.querySelectorAll('.module').length).toBe(2);
      expect(groupes[1]?.querySelectorAll('.module').length).toBe(1);
    });

    it('rend une LISTE PLATE, sans aucun titre de section, quand aucune n’en porte', async () => {
      const fixture = await rendre('php');

      expect(hote(fixture).querySelectorAll('.titre-section').length).toBe(0);
      expect(hote(fixture).querySelectorAll('.groupe').length).toBe(1);
      expect(hote(fixture).querySelectorAll('.module').length).toBe(2);
    });

    it('retombe en liste plate si le sujet n’est sectionné qu’À MOITIÉ', async () => {
      // Le schéma promet le tout-ou-rien ; le composant ne s'y fie pas. Un module
      // orphelin sous un titre de section serait pire qu'une liste plate.
      TestBed.resetTestingModule();
      configurer([
        {
          sujet: 'php',
          slug: 'variables',
          section: 'Bases',
          ordre: 1,
          titre: 'Les variables',
          dureeEstimee: 12,
          niveau: 'primaire',
          statut: 'publiee',
        },
        {
          sujet: 'php',
          slug: 'formulaires',
          ordre: 2,
          titre: 'Les formulaires',
          dureeEstimee: 18,
          niveau: 'primaire',
          statut: 'publiee',
        },
      ]);

      const fixture = await rendre('php');

      expect(hote(fixture).querySelectorAll('.titre-section').length).toBe(0);
      expect(hote(fixture).querySelectorAll('.module').length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  describe('état vide — l’état réel de `content/` jusqu’à E3-ST1', () => {
    it('annonce « en préparation » et ne rend ni liste ni résumé', async () => {
      TestBed.resetTestingModule();
      configurer([]);

      const fixture = await rendre('securite-web');

      expect(hote(fixture).querySelector('.vide')?.textContent).toContain('en préparation');
      expect(hote(fixture).querySelector('.resume')).toBeNull();
      expect(hote(fixture).querySelectorAll('ol').length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  describe('état par module et compteurs', () => {
    it('rend « à commencer » partout quand rien n’a été fait', async () => {
      const fixture = await rendre('securite-web');

      expect(textes(fixture, '.badge')).toEqual(['À commencer', 'À commencer', 'À commencer']);
      expect(hote(fixture).querySelectorAll('.etat-non-commence').length).toBe(3);
    });

    it('distingue « lu » de « maîtrisé », et lie le TEXTE à la CLASSE', async () => {
      const progression = TestBed.inject(ProgressionService);
      progression.marquerLue('securite-web', 'injection-sql');
      progression.enregistrerQuiz('securite-web', 'xss', 5, 5);

      const fixture = await rendre('securite-web');

      expect(textes(fixture, '.badge')).toEqual(['Maîtrisé', 'Lu', 'À commencer']);
      // WCAG 1.4.1 : la classe n'est qu'un renfort — le mot est là dans les trois
      // cas. Les deux doivent bouger ENSEMBLE, jamais l'un sans l'autre.
      expect(hote(fixture).querySelector('.etat-maitrise .badge')?.textContent?.trim()).toBe(
        'Maîtrisé',
      );
      expect(hote(fixture).querySelector('.etat-lu .badge')?.textContent?.trim()).toBe('Lu');
    });

    it('un quiz ÉCHOUÉ marque « lu », jamais « maîtrisé » (la maîtrise vient du quiz réussi)', async () => {
      const progression = TestBed.inject(ProgressionService);
      progression.enregistrerQuiz('securite-web', 'xss', 1, 5);

      const fixture = await rendre('securite-web');

      expect(hote(fixture).querySelectorAll('.etat-maitrise').length).toBe(0);
      expect(textes(fixture, '.badge')).toContain('Lu');
    });

    it('🔴 compte la maîtrise depuis le MANIFESTE, pas depuis le stockage', async () => {
      const progression = TestBed.inject(ProgressionService);
      progression.enregistrerQuiz('securite-web', 'xss', 5, 5); // publié → compte
      progression.enregistrerQuiz('securite-web', 'csrf-en-chantier', 5, 5); // brouillon
      progression.enregistrerQuiz('securite-web', 'lecon-disparue', 5, 5); // plus au manifeste
      progression.enregistrerQuiz('php', 'variables', 5, 5); // autre cours

      const fixture = await rendre('securite-web');
      const resume = hote(fixture).querySelector('.resume')?.textContent ?? '';

      // Quatre modules maîtrisés dans le stockage, UN SEUL sur cette page.
      expect(resume).toContain('1 maîtrisé');
      expect(resume).toContain('3 modules');
      expect(hote(fixture).querySelectorAll('.etat-maitrise').length).toBe(1);
    });

    it('compte les modules commencés, maîtrise comprise', async () => {
      const progression = TestBed.inject(ProgressionService);
      progression.marquerLue('securite-web', 'injection-sql');
      progression.enregistrerQuiz('securite-web', 'xss', 5, 5);

      const fixture = await rendre('securite-web');

      expect(hote(fixture).querySelector('.resume')?.textContent).toContain('2 commencés');
    });

    it('rend la durée de CHAQUE module, avec une blanche insécable', async () => {
      const fixture = await rendre('securite-web');

      expect(textes(fixture, '.duree')).toEqual([
        `20${NBSP}min`,
        `25${NBSP}min`,
        `18${NBSP}min`,
      ]);
    });

    it('rend le niveau en français, jamais la valeur de schéma brute', async () => {
      // Les trois valeurs viennent de l'énumération RÉELLE du contrat : c'est ce
      // qui rend ce test capable de voir un dictionnaire indexé sur des clefs
      // imaginaires (il rendrait « secondaire », « cegep », « universite »).
      const fixture = await rendre('securite-web');

      expect(textes(fixture, '.niveau')).toEqual(['Secondaire', 'Cégep', 'Université']);
    });
  });

  // ---------------------------------------------------------------------------
  describe('accord en nombre — le résumé ne dit jamais « 1 modules »', () => {
    it('met le SINGULIER à un module, maîtrise et commencement compris', async () => {
      TestBed.resetTestingModule();
      configurer([
        {
          sujet: 'php',
          slug: 'variables',
          ordre: 1,
          titre: 'Les variables',
          dureeEstimee: 12,
          niveau: 'primaire',
          statut: 'publiee',
        },
      ]);
      const progression = TestBed.inject(ProgressionService);
      progression.enregistrerQuiz('php', 'variables', 5, 5);

      const fixture = await rendre('php');

      expect(textes(fixture, '.chiffre')).toEqual([
        '1 module',
        `12${NBSP}min de lecture`,
        '1 maîtrisé',
        '1 commencé',
      ]);
    });

    it('met le PLURIEL dès deux, et le singulier à zéro', async () => {
      // Le français accorde 0 au singulier : « 0 maîtrisé », jamais « 0 maîtrisés ».
      const fixture = await rendre('securite-web');

      expect(textes(fixture, '.chiffre')).toEqual([
        '3 modules',
        `1${NBSP}h${NBSP}03 de lecture`,
        '0 maîtrisé',
        '0 commencé',
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  describe('gate d’hydratation (L-033)', () => {
    it('🔴 garde une STRUCTURE DOM identique entre progression vide et peuplée', async () => {
      const vide = await rendre('securite-web');
      const structureVide = squelette(vide);
      const badgesVides = textes(vide, '.badge');

      TestBed.resetTestingModule();
      localStorage.clear();
      configurer();
      const progression = TestBed.inject(ProgressionService);
      progression.enregistrerQuiz('securite-web', 'xss', 5, 5);
      progression.marquerLue('securite-web', 'injection-sql');

      const peuple = await rendre('securite-web');

      // Le cœur du test : mêmes nœuds, dans le même ordre.
      expect(squelette(peuple)).toBe(structureVide);
      // Garde-fou contre le vert vide (L-005) : si le composant ignorait la
      // progression, l'égalité ci-dessus passerait toute seule.
      expect(textes(peuple, '.badge')).not.toEqual(badgesVides);
      expect(hote(peuple).querySelectorAll('.etat-maitrise').length).toBe(1);
    });

    it('n’applique AUCUN `@if` à l’état de progression, dans le gabarit', () => {
      // Vérifié sur le SOURCE : un `@if` posé sur `module.etat` rendrait le
      // premier rendu client structurellement différent du HTML prerendu, et le
      // test ci-dessus ne le verrait pas — les deux fixtures y sont toutes deux
      // rendues APRÈS `afterNextRender`.
      // La condition est prise jusqu'à la fin de la LIGNE (et non jusqu'à la
      // première parenthèse fermante) : `@if (estMaitrise(module))` doit être vu
      // en entier, sinon le garde-fou se contenterait de `estMaitrise(module`.
      // Et minusculisée, pour que la casse ne serve pas d'échappatoire.
      const gabarit = sourceDuGabarit();
      const conditions = [...gabarit.matchAll(/@if\s*\(([^\n]*)\)\s*\{/g)].map((m) =>
        (m[1] ?? '').toLowerCase(),
      );

      expect(conditions.length).toBeGreaterThan(0);
      for (const condition of conditions) {
        expect(condition, `@if sur l’état : ${condition}`).not.toContain('etat');
        expect(condition, `@if sur la progression : ${condition}`).not.toContain('maitris');
        expect(condition, `@if sur la progression : ${condition}`).not.toContain('progression');
      }
    });

    it('🔴 le rendu SERVEUR ne contient l’état de personne, même si le service dit « maîtrisé »', async () => {
      // LA propriété voulue, assertée sur le COMPORTEMENT et non sur le texte du
      // source. Une assertion `/progressionLisible = signal\(false\)/` vérifiait un
      // INITIALISEUR : un `computed` neuf qui lirait le service HORS du gate et
      // serait consommé par le gabarit laissait la ligne littérale intacte, donc le
      // test vert et le fichier prerendu divergent.
      //
      // Le montage tient en trois pièces, et aucune n'est décorative :
      //   · `ngServerMode` ⇒ Angular n'exécute JAMAIS `afterNextRender`, donc le
      //     gate reste fermé pour toute la durée du test ;
      //   · `PLATFORM_ID: 'server'` ⇒ la plateforme est cohérente avec le drapeau
      //     ci-dessus (c'est elle que lit le VRAI service) ;
      //   · un FAUX service qui répond « maîtrisé » à tout — INDISPENSABLE : le vrai
      //     est déjà muet hors navigateur, il ne discriminerait rien et ce test
      //     serait vert par absence de données (L-005).
      // Gate fermé ⇒ « À commencer » partout. Gate ouvert (ou contourné par un
      // calcul qui lirait le service en dehors) ⇒ « Maîtrisé », et ce test rougit.
      //
      // ⚠️ `PLATFORM_ID: 'server'` SEUL NE FERME PAS LE GATE, mesuré ici : depuis
      // Angular 19, `afterNextRender` ne consulte plus la plateforme injectée mais
      // le drapeau GLOBAL `ngServerMode` (`core.mjs` : `if (typeof ngServerMode !==
      // 'undefined' && ngServerMode) return NOOP_AFTER_RENDER_REF`). Sans la ligne
      // qui le pose, ce test échoue sur un composant parfaitement sain.
      const toutMaitrise: Pick<ProgressionService, 'estMaitrisee' | 'etatDe'> = {
        estMaitrisee: () => true,
        etatDe: () => ({ lue: true, meilleurScore: 5, totalQuestions: 5 }),
      };
      const global = globalThis as { ngServerMode?: boolean };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          { provide: MANIFESTE_LECONS, useValue: MANIFESTE },
          { provide: HORAIRES_DES_COURS, useValue: SANS_HORAIRE },
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: ProgressionService, useValue: toutMaitrise },
        ],
      });

      global.ngServerMode = true;
      try {
        const fixture = await rendre('securite-web');

        expect(textes(fixture, '.badge')).toEqual(['À commencer', 'À commencer', 'À commencer']);
        expect(hote(fixture).querySelectorAll('.etat-maitrise').length).toBe(0);
        expect(hote(fixture).querySelector('.resume')?.textContent).toContain('0 maîtrisé');
      } finally {
        // Un drapeau global laissé posé rendrait TOUT le reste de la suite muet.
        delete global.ngServerMode;
      }
    });

    it('n’ouvre le gate QUE par `afterNextRender`, jamais par une garde de plateforme', () => {
      // Deux interdits de FORME, que le test de comportement ci-dessus ne peut pas
      // couvrir : il rend sur une plateforme serveur, où `isPlatformBrowser` est
      // faux — un composant gardé par elle y passerait donc le même vert, tout en
      // affichant l'état d'autrui au PREMIER rendu client, qui est le seul moment
      // où L-033 mord.
      const source = sourceDuComposant();

      expect(source).toContain('afterNextRender');
      expect(source).not.toContain('isPlatformBrowser');
    });
  });

  // ---------------------------------------------------------------------------
  describe('accessibilité et liens', () => {
    it('rend une liste sémantique dont chaque module est un `<li>`', async () => {
      const fixture = await rendre('securite-web');
      const listes = hote(fixture).querySelectorAll('ol');

      expect(listes.length).toBe(2);
      for (const liste of listes) {
        // `list-style: none` fait perdre la sémantique de liste à VoiceOver ;
        // le rôle explicite la rétablit.
        expect(liste.getAttribute('role')).toBe('list');
        for (const enfant of liste.children) {
          expect(enfant.tagName).toBe('LI');
        }
      }
    });

    it('donne à chaque lien un nom accessible d’un seul tenant (L-024)', async () => {
      // Le numéro est `aria-hidden` : le nom du lien est le TITRE seul, sans
      // « 1Le XSS » recollé par `preserveWhitespaces: false`.
      const fixture = await rendre('securite-web');
      const premier = hote(fixture).querySelector<HTMLAnchorElement>('.lien');

      expect(premier?.querySelector('.numero')?.getAttribute('aria-hidden')).toBe('true');
      expect(premier?.querySelector('.titre')?.textContent?.trim()).toBe('Le XSS');
    });

    it('nomme le lien avec l’ORDRE de la leçon, que la sémantique de liste n’annonce pas', async () => {
      // `list-style: none` fait annoncer une POSITION D'INDEX (« 4 sur 4 »), pas
      // l'`ordre` du manifeste : les deux se désynchronisent dès qu'un brouillon
      // est intercalé. Le numéro dessiné restant `aria-hidden` (L-024), l'`ordre`
      // n'atteindrait aucune technologie d'assistance sans ce nom explicite.
      const fixture = await rendre('securite-web');
      const liens = [...hote(fixture).querySelectorAll<HTMLAnchorElement>('.lien')];

      expect(liens.map((lien) => lien.getAttribute('aria-label'))).toEqual([
        '1. Le XSS',
        '2. L’injection SQL',
        '3. Les en-têtes de sécurité',
      ]);
      // WCAG 2.5.3 (Label in Name) : le nom accessible CONTIENT le libellé visible.
      for (const lien of liens) {
        const visible = lien.querySelector('.titre')?.textContent?.trim() ?? '';
        expect(lien.getAttribute('aria-label')).toContain(visible);
      }
    });

    it('pointe vers `/cours/<sujet>/<slug>` — donc générique par construction', async () => {
      const securite = await rendre('securite-web');
      expect(
        hote(securite).querySelector<HTMLAnchorElement>('.lien')?.getAttribute('href'),
      ).toBe('/cours/securite-web/xss');

      TestBed.resetTestingModule();
      configurer();

      // ⏳ Le lien PHP est correct par construction, mais sa route n'existe pas
      // encore (`app.routes.ts` ne déclare que `cours/securite-web/:slug`). E7
      // doit la poser dans le même lot que sa première leçon.
      const php = await rendre('php');
      expect(hote(php).querySelector<HTMLAnchorElement>('.lien')?.getAttribute('href')).toBe(
        '/cours/php/variables',
      );
    });

    it('n’expose qu’un focalisable par module — le lien', async () => {
      const fixture = await rendre('securite-web');
      const focalisables = hote(fixture).querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      expect(focalisables.length).toBe(3);
      for (const element of focalisables) {
        expect(element.tagName).toBe('A');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Les jalons d'évaluation — `docs/contenu/ancrage-au-cours.md` §5(c)
  // ---------------------------------------------------------------------------
  // L'horaire est FABRIQUÉ ici, jamais lu dans `content/` : un test calibré sur
  // l'horaire réel de l'enseignant épinglerait un inventaire éditorial, et
  // rougirait le jour où le cégep déplace un examen (L-065). Les trois évaluations
  // reproduisent seulement les FORMES que le contrat autorise — portée contiguë,
  // portée trouée, portée absente.
  describe('jalons d’évaluation (contrat §5(c))', () => {
    /** Trois groupes : séance 1, séance 7, puis un complément SANS séance. */
    const MANIFESTE_ANCRE: readonly EntreeManifesteRoutes[] = [
      {
        sujet: 'securite-web',
        slug: 'fondamentaux',
        section: 'Fondements',
        ordre: 1,
        titre: 'Les fondamentaux',
        dureeEstimee: 20,
        niveau: 'cegep',
        statut: 'publiee',
        seance: 1,
      },
      {
        sujet: 'securite-web',
        slug: 'injection',
        section: 'Sécurité du code',
        ordre: 2,
        titre: 'L’injection',
        dureeEstimee: 20,
        niveau: 'cegep',
        statut: 'publiee',
        seance: 7,
      },
      {
        sujet: 'securite-web',
        slug: 'evaluation-cvss',
        section: 'Compléments',
        ordre: 3,
        titre: 'Le CVSS',
        dureeEstimee: 20,
        niveau: 'cegep',
        statut: 'publiee',
      },
    ];

    function horaireDe(seances: HoraireCompile['seances']): ReadonlyMap<string, HoraireCompile> {
      return new Map([
        [
          'securite-web',
          {
            sujet: 'securite-web',
            cours: {
              code: '420-B10-HU',
              titre: 'Cours de test',
              enseignant: 'Une enseignante',
              etablissement: 'Un cégep',
              session: 'Automne 2026',
            },
            seances,
          },
        ],
      ]);
    }

    /** Les trois formes d'évaluation du contrat, sur un calendrier complet. */
    const SEANCES: HoraireCompile['seances'] = [
      { numero: 1, date: '2026-08-07', titre: 'Introduction' },
      {
        numero: 6,
        date: '2026-09-11',
        titre: 'Examen 1',
        evaluation: {
          libelle: 'Examen 1',
          nature: 'examen-ecrit',
          ponderation: 20,
          portee: [1, 2, 3, 4],
        },
      },
      { numero: 7, date: '2026-09-18', titre: 'Sécurité du code' },
      {
        numero: 11,
        date: '2026-10-16',
        titre: 'Projet de session',
        evaluation: {
          libelle: 'Projet de session',
          nature: 'evaluation-pratique',
          ponderation: 20,
        },
      },
      {
        numero: 13,
        date: '2026-10-30',
        titre: 'Examen final',
        evaluation: {
          libelle: 'Examen final',
          nature: 'examen-ecrit',
          ponderation: 60,
          portee: [1, 2, 3, 4, 5, 7, 8, 9, 10],
        },
      },
    ];

    const EXAMEN_1 = `Examen 1${NBSP}· 11${NBSP}septembre${NBSP}· séances${NBSP}1${NBSP}à${NBSP}4`;
    const PROJET = `Projet de session${NBSP}· 16${NBSP}octobre`;
    const EXAMEN_FINAL =
      `Examen final${NBSP}· 30${NBSP}octobre${NBSP}· ` +
      `séances${NBSP}1${NBSP}à${NBSP}5, 7${NBSP}à${NBSP}10`;

    function preparer(
      seances: HoraireCompile['seances'] = SEANCES,
      manifeste: readonly EntreeManifesteRoutes[] = MANIFESTE_ANCRE,
    ): void {
      TestBed.resetTestingModule();
      configurer(manifeste, horaireDe(seances));
    }

    /** La suite RENDUE des groupes et des jalons, dans l'ordre du document. */
    function sequence(fixture: ComponentFixture<Sommaire>): string[] {
      return [...hote(fixture).querySelectorAll('.groupe, .jalon')].map((noeud) =>
        noeud.classList.contains('jalon')
          ? `jalon: ${noeud.textContent?.trim() ?? ''}`
          : `groupe: ${noeud.querySelector('.titre-section')?.textContent?.trim() ?? ''}`,
      );
    }

    it('rend les TROIS évaluations de l’horaire, le projet de session compris', async () => {
      preparer();

      const fixture = await rendre('securite-web');

      // Le projet compte : c'est une évaluation à 20 %, pas une séance ordinaire.
      expect(textes(fixture, '.jalon')).toEqual([EXAMEN_1, PROJET, EXAMEN_FINAL]);
    });

    it('🔴 intercale chaque jalon APRÈS le groupe qu’il évalue, dans l’ordre des séances', async () => {
      // « Fondements » s'arrête à la séance 1, « Sécurité du code » à la 7 : l'examen 1
      // (séance 6) tombe entre les deux, le projet (11) et l'examen final (13) suivent
      // tous deux le second groupe — par séance CROISSANTE. Les « Compléments », sans
      // séance, ne comptent dans aucun maximum et se rangent après tous les jalons.
      preparer();

      const fixture = await rendre('securite-web');

      expect(sequence(fixture)).toEqual([
        'groupe: Fondements',
        `jalon: ${EXAMEN_1}`,
        'groupe: Sécurité du code',
        `jalon: ${PROJET}`,
        `jalon: ${EXAMEN_FINAL}`,
        'groupe: Compléments',
      ]);
    });

    it('écrit la portée en PLAGE quand elle est contiguë, en énumération sinon', async () => {
      preparer();

      const fixture = await rendre('securite-web');
      const libelles = textes(fixture, '.jalon');

      expect(libelles[0]).toContain(`séances${NBSP}1${NBSP}à${NBSP}4`);
      // La séance 6 est l'examen 1 : elle n'est la matière de personne, d'où le trou.
      // « 1, 2, 3, 4, 5, 7, 8, 9, 10 » serait exact et illisible.
      expect(libelles[2]).toContain(`séances${NBSP}1${NBSP}à${NBSP}5, 7${NBSP}à${NBSP}10`);
      expect(libelles[2]).not.toContain('6');
    });

    it('met le SINGULIER à une seule séance de portée', async () => {
      preparer([
        { numero: 1, date: '2026-08-07', titre: 'Introduction' },
        {
          numero: 6,
          date: '2026-09-11',
          titre: 'Test',
          evaluation: {
            libelle: 'Test de lecture',
            nature: 'examen-ecrit',
            ponderation: 5,
            portee: [3],
          },
        },
      ]);

      const fixture = await rendre('securite-web');

      expect(textes(fixture, '.jalon')).toEqual([
        `Test de lecture${NBSP}· 11${NBSP}septembre${NBSP}· séance${NBSP}3`,
      ]);
    });

    it('🔴 n’annonce AUCUNE séance quand l’enseignant n’a publié aucune portée', async () => {
      // Inventer une portée annoncerait une matière d'examen qui n'a jamais été
      // annoncée — l'un des deux échecs symétriques de `contenu-pedagogique.md` §6.
      preparer();

      const fixture = await rendre('securite-web');
      const projet = textes(fixture, '.jalon')[1] ?? '';

      expect(projet).toBe(PROJET);
      expect(projet).not.toContain('séance');
    });

    it('🔴 formate la date SANS décalage de fuseau — le 7 août reste le 7', async () => {
      // `new Date('2026-08-07')` est lu en UTC : à l'ouest de Greenwich il rend le
      // 6 août. Le contrat impose donc un découpage de chaîne, et ce test est le seul
      // endroit du dépôt qui le prouve. Le `07` du contrat ne doit pas non plus
      // ressortir tel quel (« 07 août »).
      preparer([
        {
          numero: 1,
          date: '2026-08-07',
          titre: 'Test',
          evaluation: { libelle: 'Test éclair', nature: 'examen-ecrit', ponderation: 5 },
        },
      ]);

      const fixture = await rendre('securite-web');

      expect(textes(fixture, '.jalon')).toEqual([`Test éclair${NBSP}· 7${NBSP}août`]);
    });

    it('ne rend AUCUN jalon quand le sujet n’a pas d’horaire', async () => {
      // Le cas du cours PHP : des modules PUBLIÉS, pas encore de calendrier compilé.
      // Le manifeste général est repris exprès — il porte deux leçons PHP, sans quoi
      // ce test serait vert par absence de modules et ne prouverait rien (L-005).
      TestBed.resetTestingModule();
      configurer(MANIFESTE, horaireDe(SEANCES));

      const fixture = await rendre('php');

      expect(hote(fixture).querySelectorAll('.module').length).toBe(2);
      expect(hote(fixture).querySelectorAll('.jalon').length).toBe(0);
    });

    it('🔴 rend le jalon PUIS le module quand un module PORTE la séance d’évaluation', async () => {
      // Réserve laissée ouverte par le lot 0ter, fermée ici (lot 8-B). `positionDuJalon`
      // n'applique aucune règle de nature d'évaluation : il PRÉSUPPOSE qu'un jalon ne
      // partage jamais sa séance avec un module. Depuis que `evaluation-pratique` rend
      // une séance d'évaluation déclarable (lot 0bis), la présupposition est fausse en
      // production — le module 11 est PUBLIÉ sur la séance 11, celle du projet.
      //
      // Ce que le cas mesure : le groupe {11} ne DÉCLENCHE PAS le fail-closed (il faut
      // `min < seance && max > seance`, or 11 n'est ni avant ni après lui-même), et il
      // ne réclame pas non plus la position du jalon (`max < seance` est faux). Le
      // jalon se pose donc après le DERNIER groupe qui précède vraiment la séance 11,
      // et le module qu'il évalue le suit. Un consommateur d'invariant ne rougit dans
      // aucun grep de la règle qu'il suppose : seul un test le tient.
      preparer(SEANCES, [
        ...MANIFESTE_ANCRE.slice(0, 2),
        {
          sujet: 'securite-web',
          slug: 'projet-de-session',
          section: 'Projet de session',
          ordre: 3,
          titre: 'Amorcer un projet LAMP',
          dureeEstimee: 60,
          niveau: 'cegep',
          statut: 'publiee',
          seance: 11,
        },
        { ...MANIFESTE_ANCRE[2]!, ordre: 4 },
      ]);

      const fixture = await rendre('securite-web');

      expect(sequence(fixture)).toEqual([
        'groupe: Fondements',
        `jalon: ${EXAMEN_1}`,
        'groupe: Sécurité du code',
        `jalon: ${PROJET}`,
        'groupe: Projet de session',
        `jalon: ${EXAMEN_FINAL}`,
        'groupe: Compléments',
      ]);
    });

    it('🔴 LÈVE en nommant la section quand un jalon tomberait DANS un groupe', async () => {
      // Contrôle positif du fail-closed. Le groupe « Mêlée » couvre les séances 5 ET
      // 7 : l'examen de la séance 6 n'a aucune frontière où se poser. Repousser le
      // jalon rendrait une page plausible et FAUSSE sur ce que l'examen couvre.
      //
      // L'assertion porte sur le `computed` plutôt que sur `rendre()` : une erreur
      // levée pendant la détection de changements part au `ErrorHandler` d'Angular,
      // qui la journalise sans rejeter la promesse — le test serait vert.
      TestBed.resetTestingModule();
      configurer(
        [
          {
            sujet: 'securite-web',
            slug: 'avant',
            section: 'Mêlée',
            ordre: 1,
            titre: 'Avant l’examen',
            dureeEstimee: 10,
            niveau: 'cegep',
            statut: 'publiee',
            seance: 5,
          },
          {
            sujet: 'securite-web',
            slug: 'apres',
            section: 'Mêlée',
            ordre: 2,
            titre: 'Après l’examen',
            dureeEstimee: 10,
            niveau: 'cegep',
            statut: 'publiee',
            seance: 7,
          },
        ],
        horaireDe(SEANCES),
      );

      const composant = TestBed.createComponent(Sommaire);
      composant.componentRef.setInput('sujet', 'securite-web');

      expect(() => composant.componentInstance.elements()).toThrowError(/Mêlée/);
      expect(() => composant.componentInstance.elements()).toThrowError(/Examen 1/);
    });

    it('🔴 garde le MÊME nombre de jalons, aux mêmes places, quelle que soit la progression', async () => {
      // Moitié « jalons » du gate d'hydratation (L-033) : ils viennent du manifeste et
      // de l'horaire, donc le fichier prerendu et le premier rendu client les portent
      // à l'identique. Un `@if` qui lirait la progression casserait ce test.
      preparer();
      const vide = await rendre('securite-web');
      const sequenceVide = sequence(vide);

      preparer();
      const progression = TestBed.inject(ProgressionService);
      progression.enregistrerQuiz('securite-web', 'fondamentaux', 5, 5);
      const peuple = await rendre('securite-web');

      expect(sequence(peuple)).toEqual(sequenceVide);
      // Anti-vacuité (L-005) : la progression a bien été lue par ailleurs.
      expect(hote(peuple).querySelectorAll('.etat-maitrise').length).toBe(1);
    });

    it('n’entre dans AUCUNE liste de modules, et n’ajoute rien aux compteurs', async () => {
      // Un jalon dans l'`<ol>` serait annoncé « élément N sur M » — une leçon de plus.
      preparer();

      const fixture = await rendre('securite-web');

      expect(hote(fixture).querySelectorAll('ol .jalon').length).toBe(0);
      for (const liste of hote(fixture).querySelectorAll('ol')) {
        for (const enfant of liste.children) {
          expect(enfant.tagName).toBe('LI');
        }
      }
      expect(hote(fixture).querySelector('.resume')?.textContent).toContain('3 modules');
      // Aucun focalisable ajouté : un jalon n'est ni un lien ni un bouton.
      expect(hote(fixture).querySelectorAll('.jalon a, .jalon button').length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  describe('interdits de forme', () => {
    it('ne fait AUCUN rendu HTML brut ni contournement de la sécurité Angular', () => {
      const source = `${sourceDuComposant()}${sourceDuGabarit()}`;

      expect(source).not.toContain('innerHTML');
      expect(source).not.toContain('bypassSecurityTrust');
    });

    it('ne pose pas `standalone: true` (défaut depuis Angular 20)', () => {
      expect(sourceDuComposant()).not.toContain('standalone');
    });

    it('n’importe AUCUNE autre feature (règle d’architecture du 2026-08-17)', () => {
      // `cours/sommaire` LIT ce que `cours/quiz` ÉCRIT — mais uniquement à
      // travers `core/progression/`. Un import direct est bloquant en revue.
      const imports = [...sourceDuComposant().matchAll(/from '([^']+)'/g)].map((m) => m[1] ?? '');

      for (const chemin of imports) {
        expect(chemin, `import de feature : ${chemin}`).not.toMatch(/features\//);
        expect(chemin, `import de feature : ${chemin}`).not.toMatch(/\.\.\/(quiz|lecon|simulation)/);
      }
    });
  });
});
