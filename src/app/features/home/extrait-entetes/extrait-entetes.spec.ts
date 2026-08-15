// =============================================================================
// Tests d'ExtraitEntetes — une preuve, ça se vérifie
// -----------------------------------------------------------------------------
// Ce bloc AFFIRME quelque chose au visiteur : « voici les en-têtes que ce site
// vous sert ». Trois façons de rendre cette affirmation fausse en silence, et une
// vérification pour chacune :
//
//  1. LA CONFIGURATION CHANGE, LA PAGE NON. Le texte de l'extrait est en dur
//     (dérive assumée pour E1 — le générer au build est du niveau E2). Ce fichier
//     relit donc `config/staticwebapp.config.source.json` et exige que CHAQUE
//     ligne affichée y existe encore, en directive de CSP ou en nom d'en-tête.
//     Rien ne se recopie ici : les valeurs attendues sont LUES à l'autre bout du
//     contrat (L-012).
//  2. LE BLOC DÉBORDE LA PAGE. `overflow-x: auto` doit vivre sur le `<pre>` et
//     nulle part ailleurs (décision 3 du plan) : sur un ancêtre, c'est la page
//     entière qui défilerait à 360 px (WCAG 1.4.10). La feuille du composant est
//     COMPILÉE ici et confrontée au DOM rendu — un commentaire ne protège rien.
//  3. UN INTERACTIF S'Y GLISSE. L'accueil ne doit avoir qu'un seul focalisable
//     neuf ; cet extrait n'en apporte aucun, et les comptes des specs Playwright
//     d'E1-ST2 en dépendent.
// =============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { compile } from 'sass';

import { ExtraitEntetes } from './extrait-entetes';

const DOSSIER = join(process.cwd(), 'src', 'app', 'features', 'home', 'extrait-entetes');
const CONFIG_SWA = join(process.cwd(), 'config', 'staticwebapp.config.source.json');

async function rendre(): Promise<ComponentFixture<ExtraitEntetes>> {
  const fixture = TestBed.createComponent(ExtraitEntetes);
  await fixture.whenStable();
  return fixture;
}

function hote(fixture: ComponentFixture<ExtraitEntetes>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** Les en-têtes globaux réellement configurés pour Azure Static Web Apps. */
function entetesServis(): Record<string, string> {
  const config = JSON.parse(readFileSync(CONFIG_SWA, 'utf8')) as {
    globalHeaders?: Record<string, string>;
  };
  return config.globalHeaders ?? {};
}

/**
 * Les règles CSS compilées du composant, aplaties en couples
 * (sélecteur, déclarations). Les blocs `@media` imbriqués ne sont pas dépliés :
 * la règle interne est capturée telle quelle, ce qui suffit ici — on cherche une
 * déclaration, pas une cascade.
 */
function reglesCompilees(): { selecteur: string; declarations: string }[] {
  const css = compile(join(DOSSIER, 'extrait-entetes.scss')).css;
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((regle) => ({
    selecteur: (regle[1] ?? '').trim(),
    declarations: regle[2] ?? '',
  }));
}

/** `matches()` lève sur un sélecteur invalide (`:host`…) : on traite ça en « non ». */
function correspond(element: Element, selecteur: string): boolean {
  try {
    return element.matches(selecteur);
  } catch {
    return false;
  }
}

describe('ExtraitEntetes', () => {
  describe('structure imposée (décision 3)', () => {
    it('rend une `<figure>` nommée, contenant un `<pre><code>` et une `<figcaption>`', async () => {
      const rendu = hote(await rendre());
      const figure = rendu.querySelector('figure');

      expect(figure?.getAttribute('aria-label')?.trim()).not.toBe('');
      expect(figure?.querySelector('pre > code')).not.toBeNull();
      expect(figure?.querySelector('figcaption')?.textContent?.trim()).not.toBe('');
    });

    it('n’apporte AUCUN élément focalisable à la page', async () => {
      const rendu = hote(await rendre());

      const focalisables = rendu.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      expect(focalisables.length).toBe(0);
    });
  });

  describe('le défilement horizontal reste DANS le bloc', () => {
    it('ne déclare `overflow` que sur le `<pre>`, jamais sur un de ses ancêtres', async () => {
      const rendu = hote(await rendre());
      const pre = rendu.querySelector('pre');
      if (!pre) {
        throw new Error('Aucun `<pre>` rendu : la structure imposée a changé.');
      }
      const reglesOverflow = reglesCompilees().filter((regle) =>
        regle.declarations.includes('overflow'),
      );

      // Garde-fou contre le vert vide : plus aucune règle d'`overflow`, et
      // l'assertion suivante ne mordrait plus rien (L-005).
      expect(reglesOverflow.length).toBe(1);
      const selecteur = reglesOverflow[0]?.selecteur ?? '';

      expect(correspond(pre, selecteur), `sélecteur : ${selecteur}`).toBe(true);

      // Aucun ancêtre du `<pre>`, jusqu'à l'hôte du composant inclus, ne doit
      // correspondre : c'est ça, « jamais sur un ancêtre ».
      for (let ancetre = pre.parentElement; ancetre; ancetre = ancetre.parentElement) {
        expect(correspond(ancetre, selecteur), `ancêtre : ${ancetre.className}`).toBe(false);
        if (ancetre === rendu) break;
      }
    });
  });

  describe('la preuve correspond encore à ce que le site sert', () => {
    it('n’affiche que des lignes présentes dans `staticwebapp.config.source.json`', async () => {
      const rendu = hote(await rendre());
      const entetes = entetesServis();
      const lignes = (rendu.querySelector('pre > code')?.textContent ?? '')
        .split('\n')
        .map((ligne) => ligne.trim())
        .filter((ligne) => ligne !== '');

      // Deux garde-fous avant la boucle : un extrait vide, ou une configuration
      // illisible, rendraient la vérification vraie sans rien prouver.
      expect(lignes.length).toBeGreaterThanOrEqual(4);
      expect(Object.keys(entetes).length).toBeGreaterThan(0);

      for (const ligne of lignes) {
        const nomEntete = ligne.replace(/:$/, '');
        const estUnEntete = Object.hasOwn(entetes, nomEntete);
        const estUneDirective = Object.values(entetes).some((valeur) => valeur.includes(ligne));

        expect(
          estUnEntete || estUneDirective,
          `« ${ligne} » ne figure plus dans les en-têtes servis — l’extrait de l’accueil ment`,
        ).toBe(true);
      }
    });

    it('ne fige AUCUNE valeur périssable — le nom de HSTS, jamais son `max-age`', async () => {
      const rendu = hote(await rendre());
      const extrait = rendu.querySelector('pre > code')?.textContent ?? '';

      // Une durée affichée en dur deviendrait fausse au premier ajustement de la
      // configuration, et personne ne penserait à ouvrir la page d'accueil.
      expect(extrait).toContain('Strict-Transport-Security');
      expect(extrait).not.toContain('max-age');
    });
  });

  describe('interdits de forme', () => {
    it('ne fait AUCUN rendu HTML brut ni contournement de la sécurité Angular', () => {
      const source = readFileSync(join(DOSSIER, 'extrait-entetes.ts'), 'utf8');

      expect(source).not.toContain('innerHTML');
      expect(source).not.toContain('bypassSecurityTrust');
    });

    it('ne pose pas `standalone: true` (défaut depuis Angular 20)', () => {
      expect(readFileSync(join(DOSSIER, 'extrait-entetes.ts'), 'utf8')).not.toContain('standalone');
    });
  });
});
