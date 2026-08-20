// =============================================================================
// Tests d'Accueil — la page « / », et les quatre promesses qu'elle tient seule
// -----------------------------------------------------------------------------
//  1. UN COMPTE DE FOCALISABLES ÉPINGLÉ — TROIS depuis la bascule E6 (c'était UN
//     depuis E1-ST3). Ce n'est pas une figure de style : c'est le compte sur
//     lequel s'appuient les specs Playwright d'E1-ST2 (arrêts de tabulation,
//     cibles de pointeur, focus visible). Un lien ajouté ici les casse ailleurs,
//     et la panne semblera venir d'elles — d'où le pointeur nominatif vers
//     `e2e/focus-visible.spec.ts` et `e2e/navigation-clavier.spec.ts` écrit dans
//     le test lui-même.
//  2. UN PLAN DE TITRES SANS SAUT. Un `<h1>` unique, puis des `<h2>` — c'est ce
//     que la navigation par titres suit (WCAG 1.3.1 / 2.4.6, `heading-order`
//     chez axe).
//  3. LA TYPOGRAPHIE FRANÇAISE, QU'AUCUN AUTRE GATE NE VÉRIFIE. Le projet impose
//     U+00A0 et INTERDIT U+202F et U+2009 : les deux fines sont absentes de
//     Fraunces comme d'Inter (contrainte matérielle née d'E1-ST1-B, pas une
//     préférence de style), et U+202F est en plus traitée comme un blanc ordinaire
//     par le compilateur d'Angular — elle disparaîtrait sans bruit.
//     La règle est vérifiée des DEUX côtés : dans le texte rendu, et dans les
//     sources des trois gabarits (une fine que le compilateur avale ne laisserait
//     aucune trace dans le rendu).
//  4. L'ORDRE VISUEL EST L'ORDRE DU DOM (décision 4 du plan, WCAG 1.3.2) :
//     aucune propriété `order:` dans les trois feuilles de la page.
//
// L-012 : la destination de l'appel à l'action n'est pas comparée à une chaîne
// recopiée, mais confrontée à la TABLE DE ROUTES réelle — un CTA qui pointerait
// vers une adresse inexistante rougirait ici.
// =============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { compile } from 'sass';

import { routes } from '../../app.routes';
import { Accueil } from './accueil';

const DOSSIER = join(process.cwd(), 'src', 'app', 'features', 'home');

/** Les trois gabarits de la page, lus au disque. */
const GABARITS = [
  join(DOSSIER, 'accueil.ts'),
  join(DOSSIER, 'carte-cours', 'carte-cours.ts'),
  join(DOSSIER, 'extrait-entetes', 'extrait-entetes.ts'),
];

/**
 * Le manifeste de contenu RÉELLEMENT compilé, lu au disque plutôt qu'importé.
 *
 * Pourquoi au disque : `content:build` le régénère avant chaque `ng test`
 * (crochet `pretest`), et l'importer depuis `src/app/features/cours/` ferait
 * traverser à ce spec la frontière « aucune feature n'en importe une autre » que
 * la revue tient depuis la bascule. Le lire est une lecture de DONNÉES, pas un
 * couplage de code.
 */
interface EntreeDeManifeste {
  readonly sujet: string;
  readonly slug: string;
  readonly statut: string;
}

const lecons: readonly EntreeDeManifeste[] = (
  JSON.parse(
    readFileSync(join(process.cwd(), 'src', 'content-generated', 'manifeste-routes.json'), 'utf8'),
  ) as EntreeDeManifeste[]
).filter((entree) => entree.sujet === 'securite-web');

/** Les trois feuilles de la page, lues au disque. */
const FEUILLES = [
  join(DOSSIER, 'accueil.scss'),
  join(DOSSIER, 'carte-cours', 'carte-cours.scss'),
  join(DOSSIER, 'extrait-entetes', 'extrait-entetes.scss'),
];

async function rendre(): Promise<ComponentFixture<Accueil>> {
  const fixture = TestBed.createComponent(Accueil);
  await fixture.whenStable();
  return fixture;
}

function hote(fixture: ComponentFixture<Accueil>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe('Accueil', () => {
  beforeEach(() => {
    // `provideRouter([])` suffit : la carte utilise `routerLink`, qui exige un
    // routeur — aucune route n'a besoin d'exister pour qu'un `href` soit calculé.
    // La vraie table est importée plus bas comme DONNÉE, pas comme harnais.
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  describe('composition', () => {
    it('rend la pièce à conviction ET la carte du cours', async () => {
      const rendu = hote(await rendre());

      // On vérifie qu'elles sont RENDUES (leur contenu propre), pas seulement
      // déclarées dans `imports` : un composant importé mais absent du gabarit ne
      // dit rien à personne.
      expect(rendu.querySelector('app-extrait-entetes figure pre > code')).not.toBeNull();
      expect(rendu.querySelector('app-carte-cours article h2')).not.toBeNull();
    });

    it('donne à la carte un titre et une description non vides', async () => {
      const rendu = hote(await rendre());
      const carte = rendu.querySelector('app-carte-cours');

      expect(carte?.querySelector('h2')?.textContent?.trim()).not.toBe('');
      expect(carte?.querySelector('.description')?.textContent?.trim()).not.toBe('');
      expect(carte?.textContent).not.toContain('undefined');
    });
  });

  describe('plan de titres', () => {
    it('porte EXACTEMENT un `<h1>` non vide', async () => {
      const rendu = hote(await rendre());
      const titres = rendu.querySelectorAll('h1');

      expect(titres.length).toBe(1);
      expect(titres[0]?.textContent?.trim()).not.toBe('');
    });

    it('n’enjambe aucun niveau de titre', async () => {
      const rendu = hote(await rendre());
      const niveaux = [...rendu.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((titre) =>
        Number(titre.tagName.slice(1)),
      );

      expect(niveaux.length).toBeGreaterThan(1);
      expect(niveaux[0]).toBe(1);
      for (const [index, niveau] of niveaux.entries()) {
        const precedent = niveaux[index - 1] ?? 0;
        expect(niveau - precedent, `saut de niveau avant un h${niveau}`).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('les appels à l’action', () => {
    it('en expose EXACTEMENT trois, et pas un focalisable de plus', async () => {
      const rendu = hote(await rendre());

      const focalisables = rendu.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      // TROIS depuis la bascule E6 : « Commencer le module 01 » et « Voir les 13
      // modules » dans la bande d'ouverture, plus « Commencer le cours » de la
      // carte. C'était UN seul depuis E1-ST3.
      //
      // 🔴 CE COMPTE EST ÉPINGLÉ HORS D'ICI, et le dire est le seul moyen que la
      // panne se diagnostique là où elle naît : `e2e/focus-visible.spec.ts`
      // (`ARRETS_ATTENDUS`, 7 → 9, coquille comprise) et
      // `e2e/navigation-clavier.spec.ts` (l'ORDRE exact des arrêts) comptent le
      // parcours de tabulation RÉEL de « / ». Ces deux fichiers appartiennent au
      // lot e2e de la bascule ; tant qu'ils ne sont pas ajustés, G-e2e rougit —
      // ce qui est le comportement voulu, pas un dommage collatéral.
      expect(focalisables.length).toBe(3);
    });

    it('le décor d’ambiance n’ajoute AUCUN focalisable et n’est pas annoncé', async () => {
      const rendu = hote(await rendre());
      const decor = rendu.querySelector('app-pluie-glyphes');

      // Contrôle de présence d'abord : sans lui, les deux assertions suivantes
      // seraient vraies sur une page qui n'aurait tout simplement pas de décor.
      expect(decor).not.toBeNull();
      expect(decor?.getAttribute('aria-hidden')).toBe('true');
      expect(decor?.querySelectorAll('a[href], button, [tabindex]').length).toBe(0);
    });

    it('mènent TOUS à une route qui EXISTE dans la table du site', async () => {
      const rendu = hote(await rendre());
      const liens = [...rendu.querySelectorAll<HTMLAnchorElement>('a[href]')];

      // Les chemins littéraux de la table, sous leur forme d'URL. Comparer à la
      // table plutôt qu'à une chaîne recopiée : renommer la route du cours sans
      // toucher à l'accueil rougit ici, au lieu de livrer un lien mort.
      const urlsConnues = routes
        .map((route) => route.path ?? '')
        .filter((chemin) => !chemin.includes(':') && !chemin.includes('*'))
        .map((chemin) => (chemin === '' ? '/' : `/${chemin}`));

      // La route de leçon est PARAMÉTRÉE : aucune URL littérale ne peut la
      // représenter. On confronte donc le slug au manifeste de contenu réellement
      // compilé — un lien vers une leçon dépubliée ou renommée rougit ici, et
      // c'est le seul endroit du dépôt qui puisse le voir avant le déploiement.
      const slugsPublies = lecons.map((lecon) => `/cours/securite-web/${lecon.slug}`);

      expect(urlsConnues.length).toBeGreaterThan(1);
      expect(slugsPublies.length).toBeGreaterThan(0);
      expect(liens.length).toBe(3);

      for (const lien of liens) {
        const href = lien.getAttribute('href') ?? '';
        expect([...urlsConnues, ...slugsPublies], `« ${href} » ne mène nulle part`).toContain(href);
      }
    });
  });

  describe('la mention « Chantier en cours » a disparu, et ça se PROUVE', () => {
    // Dette datée d'E1-ST3, échue à la publication de la leçon 01 : tant qu'aucune
    // leçon n'était en ligne, la carte devait avertir ; depuis, elle mentirait.
    // L'assertion est écrite en ABSENCE parce qu'une disparition non observée est
    // indistinguable d'une disparition accidentelle — et parce que rien
    // n'empêcherait un futur lot de repasser la mention « en attendant ».
    it('ne rend AUCUN paragraphe de chantier, ni le mot dans le texte de la page', async () => {
      const rendu = hote(await rendre());

      expect(rendu.querySelector('app-carte-cours .chantier')).toBeNull();
      expect(rendu.textContent?.toLowerCase()).not.toContain('chantier');
    });
  });

  describe('la jauge de progression du cours', () => {
    it('annonce en TOUTES LETTRES autant de modules que le manifeste en publie', async () => {
      const rendu = hote(await rendre());
      const texte = rendu.querySelector('app-carte-cours .jauge-texte')?.textContent?.trim() ?? '';

      // 🔴 LE RÉVEILLE-MATIN DE LA DETTE. Le nombre affiché est un littéral
      // d'`accueil.ts` ; il est ici confronté au contenu RÉELLEMENT compilé. Le
      // jour où une deuxième leçon est publiée, ce test rougit — au lieu de
      // laisser l'accueil répéter « 1 module publié » comme la `mentionChantier`
      // a répété « Chantier en cours » pendant tout E3-ST1.
      const publiees = lecons.filter((lecon) => lecon.statut === 'publiee').length;

      expect(publiees).toBeGreaterThan(0);
      expect(texte).toBe(
        publiees > 1 ? `${String(publiees)} modules publiés sur 13` : `${String(publiees)} module publié sur 13`,
      );
    });

    it('pose la jauge en `aria-hidden` — l’information vit dans le texte (WCAG 1.4.1)', async () => {
      const rendu = hote(await rendre());
      const jauge = rendu.querySelector('app-carte-cours .jauge');

      expect(jauge).not.toBeNull();
      expect(jauge?.getAttribute('aria-hidden')).toBe('true');
      expect(jauge?.querySelectorAll('.segment').length).toBe(13);
      expect(jauge?.querySelectorAll('.segment.rempli').length).toBe(
        lecons.filter((lecon) => lecon.statut === 'publiee').length,
      );
    });
  });

  describe('typographie française (aucun autre gate ne la vérifie)', () => {
    it('emploie U+00A0 dans le texte rendu, et JAMAIS U+202F ni U+2009', async () => {
      const rendu = hote(await rendre());
      const texte = rendu.textContent ?? '';

      // ⚠️ LES TROIS CARACTÈRES SONT ÉCRITS EN ÉCHAPPEMENT, JAMAIS EN LITTÉRAL :
      // trois blanches invisibles voisines dans un source, personne ne les
      // distingue en relecture — et un test qui chercherait la mauvaise passerait
      // au vert sans rien vérifier. Ce fichier ne contient donc AUCUNE de ces
      // trois blanches, ce qui le rend lui-même conforme à ce qu'il exige.
      //
      // Présence : sans elle, l'assertion d'absence ci-dessous serait vraie sur
      // une page qui n'aurait tout simplement aucune blanche insécable — et la
      // règle ne serait pas vérifiée, juste inapplicable (L-005).
      expect(texte).toContain('\u00a0');
      expect(texte).not.toContain('\u202f');
      expect(texte).not.toContain('\u2009');
    });

    it('n’emploie U+202F ni U+2009 dans AUCUNE des trois sources', () => {
      // Vérification côté source ET côté rendu, parce que les deux ne se
      // recouvrent pas : le compilateur d'Angular traite U+202F comme un blanc
      // ordinaire et la ferait disparaître du rendu sans jamais rien signaler.
      for (const chemin of GABARITS) {
        const source = readFileSync(chemin, 'utf8');

        expect(source, `${chemin} contient U+202F`).not.toContain('\u202f');
        expect(source, `${chemin} contient U+2009`).not.toContain('\u2009');
      }
    });
  });

  describe('ordre du DOM = ordre de lecture (décision 4)', () => {
    it('ne déclare AUCUNE propriété `order` dans les trois feuilles de la page', () => {
      for (const feuille of FEUILLES) {
        const css = compile(feuille).css;

        // Le motif exige un début de déclaration devant `order` : sans lui,
        // `border-color` ou `border-block-start` déclencheraient un faux positif.
        expect(/[;{\s]order\s*:/.test(css), `${feuille} déclare une propriété order`).toBe(false);
      }
    });
  });

  describe('interdits de forme', () => {
    it('ne fait AUCUN rendu HTML brut ni contournement de la sécurité Angular', () => {
      for (const chemin of GABARITS) {
        const source = readFileSync(chemin, 'utf8');

        expect(source, chemin).not.toContain('innerHTML');
        expect(source, chemin).not.toContain('bypassSecurityTrust');
      }
    });

    it('ne pose aucun attribut `style` inline — la CSP à hachages ne les couvre pas', () => {
      // `tools/deploiement/generer-config-swa.mjs` fait ÉCHOUER le build sur un
      // attribut `style="…"` dans la sortie prerendue (les hachages couvrent les
      // blocs `<style>`, jamais les attributs). Le constater ici coûte deux
      // secondes au lieu d'un build complet.
      for (const chemin of GABARITS) {
        expect(readFileSync(chemin, 'utf8'), chemin).not.toContain(' style="');
      }
    });
  });
});
