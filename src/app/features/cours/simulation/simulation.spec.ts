// =============================================================================
// Tests de la Simulation — E2-ST5, lot b1
// -----------------------------------------------------------------------------
// CE QUE CE FICHIER TIENT, ET POURQUOI CHAQUE GROUPE A SON CONTRÔLE POSITIF.
//
//   · LE PRERENDU COMPLET. Les M étapes sont dans le document, toutes visibles, sous
//     l'`id` bâti sur la POSITION, avec le nom accessible « Étape N sur M — titre » en
//     UN SEUL nœud de texte (L-024). Le contrôle positif est qu'on a bien compté des
//     étapes : « aucune n'est masquée » serait vrai d'un composant qui ne rend rien
//     (L-019).
//   · LES LIENS (L-030). Chaque lien porte un `href` ABSOLU, fragment compris — jamais
//     un `#ancre` nu, qui se résoudrait contre le `<base href="/">` et renverrait le
//     lecteur à l'ACCUEIL. Le contrôle positif est qu'on a d'abord relevé un href non
//     vide : « aucun href ne commence par # » est vrai d'un composant sans liens.
//   · LA DÉCISION C′ : RIEN NE SE REPLIE À L'HYDRATATION. Le test attend que le premier
//     rendu client soit passé (`hydrate()`), puis exige que RIEN ne porte `hidden` — et
//     sa moitié de pince est le test suivant, qui prouve qu'un clic, LUI, replie. Sans
//     elle, « rien n'est masqué » serait vrai d'un composant incapable de masquer.
//   · `beforematch` ET `beforeprint`. Le premier resynchronise l'étape courante sans
//     déplier ; le second déplie tout. Les deux sont exercés par un vrai événement
//     dispatché sur le vrai nœud / la vraie fenêtre, jamais par un appel de méthode :
//     un gestionnaire branché nulle part serait invisible autrement (L-008).
//   · LES LEVÉES. Les renvois de l'`etatVisuel` vers les acteurs ne sont revérifiés par
//     PERSONNE d'autre à la lecture de l'artéfact (`types.d.ts` le dit) : chacun a son
//     `it()`, et le message doit NOMMER la cause.
//   · LE PIÈGE DU PROTOTYPE. Un acteur nommé `constructor` sur une simulation dont les
//     `panneaux` n'ont pas cette clé ne doit peindre AUCUN panneau. Le contrôle positif
//     est dans le même test : un autre acteur, lui, a bien son panneau — sinon
//     « 0 panneau » serait vrai d'un composant qui n'en peint jamais.
//   · LES CINQ TYPES D'ACTEUR et LES TROIS CANAUX de l'état d'acteur (WCAG 1.4.1).
//
// LES VALEURS ATTENDUES SONT ÉCRITES ICI, EN DUR — jamais importées du composant ni de
// `contenu-compile.ts` (L-012). Les chaînes `simulation` et `simulation-etape-` sont
// donc littérales ci-dessous : un test qui importe la constante pour la comparer à
// elle-même ne vérifie rien du contrat.
//
// LES FIXTURES SONT TYPÉES `SimulationCompilee` / `ActeurSimulation` / `EtapeSimulation`,
// types AMBIANTS venus de `tools/content-pipeline/types.d.ts` : aucun `import`, aucune
// copie du contrat.
// =============================================================================

import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Simulation } from './simulation';

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

/** Les CINQ types du contrat, un acteur chacun — c'est la fixture des rôles écrits. */
const CINQ_ACTEURS: ActeurSimulation[] = [
  { id: 'victime', libelle: 'Camille, lectrice du forum', type: 'personne' },
  { id: 'pirate', libelle: 'Mallory, qui dépose la charge', type: 'attaquant' },
  { id: 'navigateur', libelle: 'Le navigateur de Camille', type: 'navigateur' },
  { id: 'serveur', libelle: 'Le serveur du forum', type: 'serveur' },
  { id: 'base', libelle: 'La base de données des messages', type: 'stockage' },
];

const DEUX_ACTEURS: ActeurSimulation[] = [
  { id: 'navigateur', libelle: 'Le navigateur de Camille', type: 'navigateur' },
  { id: 'serveur', libelle: 'Le serveur du forum', type: 'serveur' },
];

/**
 * LA CHARGE UTILE D'AUTEUR, DANS UN PANNEAU. Ce n'est pas de la décoration : le `code`
 * d'un panneau est du code VOLONTAIREMENT VULNÉRABLE (`.claude/rules/contenu-pedagogique.md`
 * §4), et une leçon sur le XSS écrira littéralement ceci. Le test qui s'en sert prouve la
 * sûreté du rendu par le COMPORTEMENT du DOM — pas par la seule absence d'une chaîne dans
 * la source, qui resterait verte si le gabarit passait un jour à une liaison de HTML brut
 * écrite autrement.
 */
const CODE_XSS = "echo $_GET['avis']; // <img src=x onerror=\"alert('XSS')\">";

const TROIS_ETAPES: EtapeSimulation[] = [
  {
    numero: 1,
    titre: 'Mallory dépose la charge',
    narration:
      'Mallory poste un message qui contient une balise de script. Elle est l’acteur ' +
      'actif de cette étape, et le serveur est l’acteur exposé.',
    etatVisuel: {
      acteurActif: 'navigateur',
      fleche: { de: 'navigateur', vers: 'serveur', libelle: 'POST /messages' },
      panneaux: {
        navigateur: { texte: 'Le champ « avis » part tel quel.' },
        serveur: { code: CODE_XSS, langage: 'php' },
      },
      surbrillance: ['serveur'],
    },
  },
  {
    numero: 2,
    titre: 'Le serveur enregistre sans encoder',
    narration:
      'Le serveur écrit le message dans la base sans l’encoder. La base devient ' +
      'l’acteur exposé de cette étape.',
    etatVisuel: {
      acteurActif: 'serveur',
      panneaux: { serveur: { texte: 'INSERT INTO messages…' } },
      surbrillance: ['serveur'],
    },
  },
  {
    numero: 3,
    titre: 'Camille relit le fil',
    narration: 'Le navigateur de Camille exécute la charge en croyant lire un message.',
    etatVisuel: { acteurActif: 'navigateur' },
  },
];

function simulationDe(acteurs: ActeurSimulation[], etapes: EtapeSimulation[]): SimulationCompilee {
  return { lecon: 'xss-stocke', titre: 'Un XSS stocké, de bout en bout', acteurs, etapes };
}

/** UNE étape, pour isoler un cas de validation. */
function etapeDe(etatVisuel: EtatVisuelSimulation): EtapeSimulation {
  return {
    numero: 1,
    titre: 'Une étape à valider',
    narration: 'La narration existe : ce n’est pas elle que le cas met à l’épreuve.',
    etatVisuel,
  };
}

const SIMULATION_TEMOIN = simulationDe(DEUX_ACTEURS, TROIS_ETAPES);

// -----------------------------------------------------------------------------
// Outillage
// -----------------------------------------------------------------------------

function fenetre(): Window {
  const vue = document.defaultView;
  if (vue === null) throw new Error('Aucune fenêtre : ces tests exigent un environnement DOM.');
  return vue;
}

let fixture: ComponentFixture<Simulation>;

async function monter(simulation: SimulationCompilee): Promise<HTMLElement> {
  fixture = TestBed.createComponent(Simulation);
  fixture.componentRef.setInput('simulation', simulation);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

/** Monte sans attendre le rendu, et rend l'accès qui LÈVE si l'étape est hors contrat. */
function preparation(simulation: SimulationCompilee): () => unknown {
  const isole = TestBed.createComponent(Simulation);
  isole.componentRef.setInput('simulation', simulation);
  return () => isole.componentInstance.etapesPreparees();
}

function etapes(hote: HTMLElement): HTMLElement[] {
  return [...hote.querySelectorAll<HTMLElement>('section.etape')];
}

/** Les liens qui mènent à une étape, dans l'ordre du document. */
function liensDEtape(hote: HTMLElement): HTMLAnchorElement[] {
  return [...hote.querySelectorAll<HTMLAnchorElement>('ol.liens-etapes a')];
}

/** Clique un lien comme un visiteur, puis laisse Angular réagir. */
async function cliquer(lien: HTMLAnchorElement): Promise<void> {
  lien.click();
  await fixture.whenStable();
}

/** Les étapes réellement masquées, par leur `id`. */
function masquees(hote: HTMLElement): string[] {
  return etapes(hote)
    .filter((etape) => etape.hasAttribute('hidden'))
    .map((etape) => etape.id);
}

// -----------------------------------------------------------------------------

describe('Simulation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      // Une route attrape-tout : `routerLink` NAVIGUE réellement au clic, et une
      // navigation qui n'apparie rien rejetterait la promesse du routeur — l'échec
      // porterait alors sur le harnais, pas sur le composant (L-035).
      providers: [provideRouter([{ path: '**', children: [] }])],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // ---------------------------------------------------------------------------
  describe('le prerendu — tout le contenu, sans JavaScript', () => {
    it('rend les M étapes, TOUTES visibles, sous l’`id` bâti sur la POSITION', async () => {
      const hote = await monter(SIMULATION_TEMOIN);

      const rendues = etapes(hote);
      // CONTRÔLE POSITIF (L-019) : sans lui, « aucune n'est masquée » serait vrai d'un
      // composant qui ne rend rien du tout.
      expect(rendues).toHaveLength(TROIS_ETAPES.length);
      expect(rendues.map((etape) => etape.id)).toEqual([
        'simulation-etape-1',
        'simulation-etape-2',
        'simulation-etape-3',
      ]);
      expect(masquees(hote)).toEqual([]);
    });

    it('porte l’`id` et le nom de la RÉGION, en un seul nœud de texte (L-024)', async () => {
      const hote = await monter(SIMULATION_TEMOIN);

      const region = hote.querySelector<HTMLElement>('section.simulation');
      expect(region).not.toBeNull();
      expect(region?.id).toBe('simulation');
      // `tabindex="-1"` : c'est la cible du lien « Réinitialiser », et un repère non
      // ciblable laisserait le focus sur `<body>` (WCAG 2.4.3).
      expect(region?.getAttribute('tabindex')).toBe('-1');
      expect(region?.getAttribute('aria-label')).toBe(
        `Simulation\u00A0: ${SIMULATION_TEMOIN.titre}`,
      );
    });

    it('nomme chaque étape « Étape N sur M — titre » et la rend CIBLABLE', async () => {
      const hote = await monter(SIMULATION_TEMOIN);

      const noms = etapes(hote).map((etape) => etape.getAttribute('aria-label'));
      expect(noms).toEqual([
        'Étape 1 sur 3\u00A0— Mallory dépose la charge',
        'Étape 2 sur 3\u00A0— Le serveur enregistre sans encoder',
        'Étape 3 sur 3\u00A0— Camille relit le fil',
      ]);
      // Le nom est UN SEUL nœud : `preserveWhitespaces: false` colle deux `<span>`
      // adjacents en un mot (L-024). Un attribut ne peut pas être scindé — c'est
      // précisément pourquoi il est employé ici.
      for (const etape of etapes(hote)) {
        expect(etape.getAttribute('tabindex')).toBe('-1');
      }
    });

    it('bâtit l’`id` sur la POSITION, jamais sur `etape.numero`', async () => {
      // Un artéfact compilé par une autre version du pipeline peut porter des `numero`
      // qui ne suivent plus la position : deux étapes au même `id` feraient un lien vers
      // la mauvaise, en silence.
      const menteuses: EtapeSimulation[] = TROIS_ETAPES.map((etape) => ({
        ...etape,
        numero: 42,
      }));
      const hote = await monter(simulationDe(DEUX_ACTEURS, menteuses));

      expect(etapes(hote).map((etape) => etape.id)).toEqual([
        'simulation-etape-1',
        'simulation-etape-2',
        'simulation-etape-3',
      ]);
      expect(etapes(hote)[0]?.getAttribute('aria-label')).toContain('Étape 1 sur 3');
    });

    it('rend la barre : un lien par étape, plus précédent / suivant / réinitialiser', async () => {
      const hote = await monter(SIMULATION_TEMOIN);

      expect(liensDEtape(hote)).toHaveLength(TROIS_ETAPES.length);
      const commandes = [...hote.querySelectorAll<HTMLAnchorElement>('ul.commandes a')];
      expect(commandes).toHaveLength(3);
      const libelles = commandes.map((lien) => lien.textContent?.trim());
      expect(libelles[0]).toBe('Précédente\u00A0: étape 1');
      expect(libelles[1]).toBe('Suivante\u00A0: étape 2');
      expect(libelles[2]).toContain('Réinitialiser');
    });

    it('🔴 écrit des `href` ABSOLUS, fragment compris — jamais un `#ancre` nu (L-030)', async () => {
      const hote = await monter(SIMULATION_TEMOIN);

      const tous = [...hote.querySelectorAll<HTMLAnchorElement>('a')];
      const hrefs = tous.map((lien) => lien.getAttribute('href') ?? '');
      // CONTRÔLE POSITIF : sans lui, « aucun href ne commence par # » serait vrai d'un
      // composant qui ne rend aucun lien.
      expect(hrefs.length).toBeGreaterThanOrEqual(6);
      for (const href of hrefs) {
        expect(href.startsWith('#')).toBe(false);
        expect(href.startsWith('/')).toBe(true);
      }
      expect(hrefs).toContain('/#simulation-etape-2');
      expect(hrefs).toContain('/#simulation');
    });

    it('rend le bandeau des acteurs, avec le rôle ÉCRIT et le badge décoratif', async () => {
      const hote = await monter(simulationDe(CINQ_ACTEURS, TROIS_ETAPES));

      const boites = [...hote.querySelectorAll<HTMLElement>('ul.acteurs > li')];
      expect(boites).toHaveLength(CINQ_ACTEURS.length);
      for (const boite of boites) {
        expect(boite.querySelector('.badge')?.getAttribute('aria-hidden')).toBe('true');
      }
      expect(boites.map((boite) => boite.querySelector('.libelle')?.textContent)).toEqual(
        CINQ_ACTEURS.map((acteur) => acteur.libelle),
      );
    });

    it('donne aux CINQ types d’acteur cinq rôles écrits DISTINCTS', async () => {
      const hote = await monter(simulationDe(CINQ_ACTEURS, TROIS_ETAPES));

      const roles = [...hote.querySelectorAll<HTMLElement>('ul.acteurs .role')].map(
        (element) => element.textContent?.trim() ?? '',
      );
      expect(roles).toEqual(['Personne', 'Attaquant', 'Navigateur', 'Serveur', 'Stockage']);
      // `attaquant` existe précisément pour ne pas être confondu avec `personne` :
      // deux rôles identiques rendraient la distinction invisible à qui ne lit pas le
      // libellé. La mesure est donc l'UNICITÉ, pas la seule présence.
      expect(new Set(roles).size).toBe(roles.length);
    });

    it('écrit le sens de la flèche EN MOTS, sans « → » ni SVG', async () => {
      const hote = await monter(SIMULATION_TEMOIN);

      const fleche = etapes(hote)[0]?.querySelector('.fleche')?.textContent ?? '';
      expect(fleche).toBe(
        'De Le navigateur de Camille vers Le serveur du forum\u00A0— POST /messages',
      );
      expect(hote.innerHTML).not.toContain('→');
      expect(hote.querySelectorAll('svg')).toHaveLength(0);
      // Une étape sans flèche n'en rend aucune — le contrôle positif de la ligne
      // précédente est l'étape 1, qui en a bien une.
      expect(etapes(hote)[2]?.querySelector('.fleche')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  describe('le rendu du code d’un panneau — texte brut, jamais du HTML', () => {
    it('affiche la charge utile ENTIÈRE sans qu’un seul nœud n’en naisse', async () => {
      const hote = await monter(SIMULATION_TEMOIN);

      const bloc = etapes(hote)[0]?.querySelector<HTMLElement>('pre.code');
      // Le `<code>` est le SEUL enfant attendu du `<pre>` : c'est le gabarit qui
      // l'écrit, pas la charge utile. La mesure de « aucun nœud n'est né » porte donc
      // sur LUI — la faire porter sur le `<pre>` compterait notre propre balise, et le
      // test aurait échoué sur un composant sain (L-035).
      const code = bloc?.querySelector('code');
      expect(code).toBeDefined();
      // Le texte est là, en entier : le contrôle positif de l'assertion suivante.
      expect(code?.textContent).toBe(CODE_XSS);
      // …et aucun nœud n'en est né. Un `<img>` ou un attribut `onerror` prouveraient
      // une liaison de HTML brut, quelle que soit la façon dont elle serait écrite.
      expect(hote.querySelectorAll('img')).toHaveLength(0);
      expect(code?.querySelectorAll('*')).toHaveLength(0);
      expect(hote.querySelector('[onerror]')).toBeNull();
      // Aucun défileur, donc aucun `tabindex` à poser : `white-space: pre-wrap` replie
      // les lignes longues au lieu de créer un conteneur défilant (WCAG 2.1.1).
      expect(bloc?.getAttribute('tabindex')).toBeNull();
    });

    it('étiquette le bloc de code par un mot, pas par une couleur', async () => {
      const hote = await monter(SIMULATION_TEMOIN);

      expect(etapes(hote)[0]?.querySelector('.etiquette')?.textContent?.trim()).toBe(
        'Extrait de code\u00A0— php',
      );
    });
  });

  // ---------------------------------------------------------------------------
  describe('la décision C′ — rien ne bouge tant que le lecteur n’a rien demandé', () => {
    it('NE replie RIEN à l’hydratation', async () => {
      const hote = await monter(SIMULATION_TEMOIN);

      // Le premier rendu client est passé : `afterNextRender` a couru. Sans cette
      // assertion, « rien n'est masqué » serait vrai d'un composant dont le code
      // d'hydratation n'a simplement jamais été exécuté (L-019).
      expect(fixture.componentInstance.hydrate()).toBe(true);
      expect(masquees(hote)).toEqual([]);
      expect(fixture.componentInstance.estRepliee()).toBe(false);
      expect(fixture.componentInstance.etapeCourante()).toBe(1);
    });

    it('replie la vue au PREMIER clic sur un lien d’étape', async () => {
      const hote = await monter(SIMULATION_TEMOIN);
      const lien = liensDEtape(hote)[1];
      expect(lien).toBeDefined();

      await cliquer(lien as HTMLAnchorElement);

      expect(fixture.componentInstance.etapeCourante()).toBe(2);
      expect(masquees(hote)).toEqual(['simulation-etape-1', 'simulation-etape-3']);
      // « until-found », pas un `hidden` sec : c'est ce qui garde l'étape TROUVABLE au
      // Ctrl+F, et donc ce qui rend le repli honnête.
      const cachee = hote.querySelector('#simulation-etape-1');
      expect(cachee?.getAttribute('hidden')).toBe('until-found');
      expect(hote.querySelector('#simulation-etape-2')?.hasAttribute('hidden')).toBe(false);
    });

    it('déplie tout avec « Réinitialiser », et repart de l’étape 1', async () => {
      const hote = await monter(SIMULATION_TEMOIN);
      await cliquer(liensDEtape(hote)[2] as HTMLAnchorElement);
      // La moitié de pince : sans elle, le dépli serait vrai d'un composant qui n'a
      // jamais replié.
      expect(masquees(hote)).toHaveLength(2);

      const reinitialiser = [...hote.querySelectorAll<HTMLAnchorElement>('ul.commandes a')][2];
      await cliquer(reinitialiser as HTMLAnchorElement);

      expect(masquees(hote)).toEqual([]);
      expect(fixture.componentInstance.etapeCourante()).toBe(1);
      expect(fixture.componentInstance.estRepliee()).toBe(false);
    });

    it('marque l’étape courante par un MOT, jamais par la seule couleur', async () => {
      const hote = await monter(SIMULATION_TEMOIN);

      const avant = liensDEtape(hote).map((lien) => lien.textContent ?? '');
      expect(avant[0]).toContain('(étape courante)');
      expect(avant[1]).not.toContain('(étape courante)');
      // La blanche insécable de tête est ce qui empêche le nom accessible de se
      // calculer en un seul mot (L-024).
      expect(avant[0]).toContain('\u00A0(étape courante)');

      await cliquer(liensDEtape(hote)[1] as HTMLAnchorElement);

      const apres = liensDEtape(hote).map((lien) => lien.textContent ?? '');
      expect(apres[0]).not.toContain('(étape courante)');
      expect(apres[1]).toContain('(étape courante)');
    });

    it('borne « précédente » et « suivante » sans jamais rendre un lien mort', async () => {
      const hote = await monter(SIMULATION_TEMOIN);
      const commandes = (): HTMLAnchorElement[] => [
        ...hote.querySelectorAll<HTMLAnchorElement>('ul.commandes a'),
      ];

      // À l'étape 1, « précédente » désigne l'étape 1 — cible RÉELLE, et le libellé
      // dit le numéro visé, donc il ne ment pas.
      expect(commandes()[0]?.getAttribute('href')).toBe('/#simulation-etape-1');

      await cliquer(liensDEtape(hote)[2] as HTMLAnchorElement);

      expect(commandes()[0]?.textContent?.trim()).toBe('Précédente\u00A0: étape 2');
      expect(commandes()[1]?.textContent?.trim()).toBe('Suivante\u00A0: étape 3');
      expect(commandes()[1]?.getAttribute('href')).toBe('/#simulation-etape-3');
    });

    it('resynchronise l’étape courante sur `beforematch`, SANS déplier', async () => {
      const hote = await monter(SIMULATION_TEMOIN);
      await cliquer(liensDEtape(hote)[0] as HTMLAnchorElement);
      // Contrôle positif : l'étape 3 est bien repliée avant l'événement.
      expect(masquees(hote)).toContain('simulation-etape-3');

      hote.querySelector('#simulation-etape-3')?.dispatchEvent(new Event('beforematch'));
      await fixture.whenStable();

      expect(fixture.componentInstance.etapeCourante()).toBe(3);
      expect(fixture.componentInstance.estRepliee()).toBe(true);
      expect(masquees(hote)).toEqual(['simulation-etape-1', 'simulation-etape-2']);
    });

    it('déplie tout sur `beforeprint`', async () => {
      const hote = await monter(SIMULATION_TEMOIN);
      await cliquer(liensDEtape(hote)[1] as HTMLAnchorElement);
      expect(masquees(hote)).toHaveLength(2);

      fenetre().dispatchEvent(new Event('beforeprint'));
      await fixture.whenStable();

      expect(masquees(hote)).toEqual([]);
      // L'étape courante ne bouge PAS : imprimer n'est pas recommencer.
      expect(fixture.componentInstance.etapeCourante()).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  describe('les trois canaux de l’état d’un acteur (WCAG 1.4.1)', () => {
    it('écrit un MOT pour l’acteur actif et pour la surbrillance, en plus de la classe', async () => {
      const hote = await monter(SIMULATION_TEMOIN);

      const premiere = etapes(hote)[0];
      const marqueurs = [...(premiere?.querySelectorAll<HTMLElement>('.marqueur') ?? [])].map(
        (element) => element.textContent?.trim() ?? '',
      );
      // Canal 2 — le MOT. Contrôle positif du canal 1 juste en dessous : sans ces deux
      // marqueurs, « la classe existe » ne prouverait rien.
      expect(marqueurs).toContain('Acteur actif à cette étape');
      expect(marqueurs).toContain('Danger — acteur exposé');

      // Canal 1 — la classe (donc la couleur), posée sur la boîte du bon acteur.
      const boites = [...(premiere?.querySelectorAll<HTMLElement>('.boite') ?? [])];
      expect(boites[0]?.classList.contains('est-actif')).toBe(true);
      expect(boites[0]?.classList.contains('est-danger')).toBe(false);
      expect(boites[1]?.classList.contains('est-danger')).toBe(true);

      // Canal 3 — la narration, qui redit la même chose en phrases.
      expect(premiere?.querySelector('.narration')?.textContent).toContain('acteur exposé');
    });

    it('ne marque RIEN quand l’étape n’a ni surbrillance ni panneau', async () => {
      // Le contrôle négatif de l'`it` précédent : sans lui, « le marqueur est là »
      // serait vrai d'un composant qui en pose un partout.
      const hote = await monter(SIMULATION_TEMOIN);

      const troisieme = etapes(hote)[2];
      expect(troisieme?.querySelectorAll('.marqueur-danger')).toHaveLength(0);
      expect(troisieme?.querySelectorAll('.panneau')).toHaveLength(0);
      expect(troisieme?.querySelectorAll('.marqueur-actif')).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  describe('🔒 la lecture de `panneaux` — jamais par indexation directe', () => {
    it('ne peint AUCUN panneau pour un acteur nommé « constructor »', async () => {
      // `constructor` est un `id` d'acteur syntaxiquement légal (kebab-case).
      // `panneaux['constructor']` sur un objet issu de `JSON.parse` sans cette clé rend
      // `Object.prototype.constructor` — une fonction, donc une valeur *truthy* qui
      // traverserait un `@if (panneau)` pour peindre un panneau VIDE.
      const acteurs: ActeurSimulation[] = [
        { id: 'constructor', libelle: 'Un acteur au nom piégé', type: 'serveur' },
        { id: 'navigateur', libelle: 'Le navigateur de Camille', type: 'navigateur' },
      ];
      const etape = etapeDe({
        acteurActif: 'navigateur',
        panneaux: { navigateur: { texte: 'Le seul panneau écrit par l’auteur.' } },
      });

      const hote = await monter(simulationDe(acteurs, [etape]));

      const boites = [...hote.querySelectorAll<HTMLElement>('.boite')];
      expect(boites).toHaveLength(2);
      // CONTRÔLE POSITIF, dans le même test : l'autre acteur a bien SON panneau —
      // sinon « 0 panneau » serait vrai d'un composant qui n'en peint jamais.
      expect(boites[1]?.querySelectorAll('.panneau')).toHaveLength(1);
      expect(boites[0]?.querySelectorAll('.panneau')).toHaveLength(0);
      expect(hote.querySelectorAll('.panneau')).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  describe('les levées — les renvois vers les acteurs, que personne d’autre ne vérifie', () => {
    it('lève sur un `acteurActif` qui ne désigne aucun acteur', () => {
      const acces = preparation(simulationDe(DEUX_ACTEURS, [etapeDe({ acteurActif: 'fantome' })]));

      expect(acces).toThrow(/acteurActif.*fantome.*ne désigne aucun acteur/s);
    });

    it('lève sur un `fleche.de` inconnu, en nommant le champ', () => {
      const acces = preparation(
        simulationDe(DEUX_ACTEURS, [
          etapeDe({
            acteurActif: 'serveur',
            fleche: { de: 'fantome', vers: 'serveur', libelle: 'un envoi' },
          }),
        ]),
      );

      expect(acces).toThrow(/fleche\.de.*fantome/s);
    });

    it('lève sur un `fleche.vers` inconnu, en nommant le champ', () => {
      const acces = preparation(
        simulationDe(DEUX_ACTEURS, [
          etapeDe({
            acteurActif: 'serveur',
            fleche: { de: 'serveur', vers: 'fantome', libelle: 'un envoi' },
          }),
        ]),
      );

      expect(acces).toThrow(/fleche\.vers.*fantome/s);
    });

    it('lève sur une clé de `panneaux` qui ne désigne aucun acteur', () => {
      const acces = preparation(
        simulationDe(DEUX_ACTEURS, [
          etapeDe({
            acteurActif: 'serveur',
            panneaux: { fantome: { texte: 'un panneau orphelin' } },
          }),
        ]),
      );

      expect(acces).toThrow(/panneaux.*fantome.*ne désigne aucun acteur/s);
    });

    it('lève sur un panneau qui n’a ni `texte` ni `code`', () => {
      const acces = preparation(
        simulationDe(DEUX_ACTEURS, [
          etapeDe({ acteurActif: 'serveur', panneaux: { serveur: {} } }),
        ]),
      );

      expect(acces).toThrow(/panneaux\.serveur.*ni « texte » ni « code »/s);
    });

    it('lève sur une entrée de `surbrillance` qui ne désigne aucun acteur', () => {
      const acces = preparation(
        simulationDe(DEUX_ACTEURS, [
          etapeDe({ acteurActif: 'serveur', surbrillance: ['fantome'] }),
        ]),
      );

      expect(acces).toThrow(/surbrillance.*fantome.*ne désigne aucun acteur/s);
    });

    it('lève sur un `type` d’acteur hors de la liste du contrat', () => {
      // Inatteignable par le chemin de production — `lireLeconCompilee` refuse déjà un
      // `type` hors liste. Le cas existe pour l'artéfact produit par une AUTRE version
      // du pipeline, et c'est ce que ce test court-circuite délibérément.
      const acteurs = [
        { id: 'serveur', libelle: 'Le serveur du forum', type: 'proxy' },
        { id: 'navigateur', libelle: 'Le navigateur', type: 'navigateur' },
      ] as unknown as ActeurSimulation[];
      const acces = preparation(simulationDe(acteurs, [etapeDe({ acteurActif: 'serveur' })]));

      expect(acces).toThrow(/type inconnu « proxy »/s);
    });

    it('NOMME l’étape fautive, et pas seulement le champ', () => {
      // Un message qui se contente de « contenu invalide » oblige le lecteur à refaire
      // l'enquête. La cause ET le lieu, comme partout ailleurs dans ce dépôt.
      const acces = preparation(
        simulationDe(DEUX_ACTEURS, [
          TROIS_ETAPES[0] as EtapeSimulation,
          etapeDe({ acteurActif: 'fantome' }),
        ]),
      );

      expect(acces).toThrow(/étape n°2 \(« Une étape à valider »\)/s);
    });

    it('CONTRÔLE POSITIF : la même préparation NE lève PAS sur une simulation saine', () => {
      // Sans lui, les sept levées ci-dessus seraient vraies d'un composant qui lève
      // toujours (L-019).
      expect(preparation(SIMULATION_TEMOIN)).not.toThrow();
    });
  });
});
