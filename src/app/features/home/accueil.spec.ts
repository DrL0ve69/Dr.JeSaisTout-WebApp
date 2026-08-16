// =============================================================================
// Tests d'Accueil — la page « / », et les quatre promesses qu'elle tient seule
// -----------------------------------------------------------------------------
//  1. UN SEUL FOCALISABLE. « Un seul CTA » n'est pas une figure de style : c'est
//     le compte sur lequel s'appuient les specs Playwright d'E1-ST2 (arrêts de
//     tabulation, cibles de pointeur, focus visible). Un lien ajouté ici les
//     casse ailleurs, et la panne semblera venir d'elles.
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

  describe('un seul appel à l’action (décision 1)', () => {
    it('n’expose qu’UN élément focalisable dans toute la page', async () => {
      const rendu = hote(await rendre());

      const focalisables = rendu.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      expect(focalisables.length).toBe(1);
    });

    it('mène à une route qui EXISTE dans la table du site', async () => {
      const rendu = hote(await rendre());
      const cta = rendu.querySelector<HTMLAnchorElement>('a[href]');

      // Les chemins littéraux de la table, sous leur forme d'URL. Comparer à la
      // table plutôt qu'à une chaîne recopiée : renommer la route du cours sans
      // toucher à l'accueil rougit ici, au lieu de livrer un lien mort.
      const urlsConnues = routes
        .map((route) => route.path ?? '')
        .filter((chemin) => !chemin.includes(':') && !chemin.includes('*'))
        .map((chemin) => (chemin === '' ? '/' : `/${chemin}`));

      expect(urlsConnues.length).toBeGreaterThan(1);
      expect(urlsConnues).toContain(cta?.getAttribute('href'));
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
