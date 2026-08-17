// =============================================================================
// Tests de RenduBlocs — et surtout : LA PINCE AUTOUR DU CONTOURNEMENT
// -----------------------------------------------------------------------------
// Ce composant est le seul endroit du site qui appelle `bypassSecurityTrustHtml`.
// Deux assertions ne suffisent donc pas : il faut les DEUX MOITIÉS de la pince.
//   · CONTRÔLE NÉGATIF — un `<script>` glissé dans un bloc `prose` est bien
//     NEUTRALISÉ. C'est la preuve que le contournement n'est pas atteignable par
//     un autre type de bloc, mesurée sur le DOM et non sur une relecture.
//   · CONTRÔLE POSITIF — le SVG d'un bloc `mermaid` arrive bien ENTIER. Sans lui,
//     « rien de dangereux n'est passé » resterait vrai d'un composant qui ne rend
//     rien du tout (L-019).
//
// LA SONDE DE CONSERVATION (`prose` / `code`). « Le HTML est rendu » est une
// affirmation faible : le sanitizer d'Angular peut en AMPUTER une partie sans rien
// dire, et une leçon perdrait ses tableaux ou la coloration de son code sous un
// run vert. On compte donc les éléments et les attributs AVANT et APRÈS la liaison,
// comme le fait `src/sonde-sanitizer-svg.spec.ts` pour le SVG, et on l'imprime.
// Les comptes d'origine sont ÉCRITS : amputer une fixture fait rougir le contrôle
// positif, pas la conclusion — qui deviendrait muette.
//
// LES FIXTURES SONT TYPÉES `BlocContenu`, ET C'EST LE GARDE-FOU DE COMPLÉTUDE.
// `FIXTURES` est un `Record<BlocContenu['type'], BlocContenu>` : ajouter un membre
// à l'union du contrat (`tools/content-pipeline/types.d.ts`) casse la COMPILATION
// de ce fichier tant que le nouveau cas n'a pas de fixture. Aucune constante du
// composant n'est importée pour être comparée à elle-même (L-012).
// =============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';

import { RenduBlocs } from './rendu-blocs';

// -----------------------------------------------------------------------------
// Les fragments — des formes RÉELLES, pas des `<div>` de démonstration
// -----------------------------------------------------------------------------

/**
 * Ce que markdown-it produit vraiment pour un paragraphe, une liste, une citation
 * et un tableau. Un fragment plus pauvre donnerait une réponse qui ne vaudrait que
 * pour lui : les tableaux et les liens sont précisément ce qu'un sanitizer trop
 * zélé mutile en premier.
 */
const HTML_PROSE = `<p>Une requête <code>SELECT</code> concaténée est une <strong>injection SQL</strong>.</p>
<ul>
<li>Premier point, avec un <a href="https://example.org/reference">lien externe</a>.</li>
<li>Deuxième point.</li>
</ul>
<blockquote>
<p>Une citation attribuée.</p>
</blockquote>
<table>
<thead><tr><th>Champ</th><th>Rôle</th></tr></thead>
<tbody><tr><td><code>id</code></td><td>Clef primaire</td></tr></tbody>
</table>`;

/** 13 noms d'éléments, 19 occurrences, 1 attribut (`href`). Mesuré, pas estimé. */
const COMPTES_PROSE: Record<string, number> = {
  p: 2,
  code: 2,
  strong: 1,
  ul: 1,
  li: 2,
  a: 1,
  blockquote: 1,
  table: 1,
  thead: 1,
  tr: 2,
  th: 2,
  tbody: 1,
  td: 2,
};
const ATTRIBUTS_PROSE = 1;

/**
 * La forme que Shiki émet avec `transformerStyleToClass` : `<pre class="shiki …"
 * tabindex="0"><code><span class="line">…`. TOUT le sens visuel est porté par des
 * `class` — zéro `style=`, la CSP du site étant à hachages (S-005). Si le sanitizer
 * mangeait ces `class`, le code s'afficherait en noir et blanc sous un run vert.
 */
const HTML_CODE = `<pre class="shiki shiki-themes carnet-clair carnet-sombre" tabindex="0"><code><span class="line"><span class="sVar">$requete</span><span class="sOp"> = </span><span class="sTxt">"SELECT * FROM utilisateurs"</span><span class="sOp">;</span></span>
<span class="line"></span>
<span class="line"><span class="sCom">// concaténation : ne jamais faire</span></span></code></pre>`;

/** 3 noms d'éléments, 10 occurrences, 10 attributs (8 `class` + `class`/`tabindex` du `pre`). */
const COMPTES_CODE: Record<string, number> = { pre: 1, code: 1, span: 8 };
const ATTRIBUTS_CODE = 10;

/**
 * Extrait représentatif d'une sortie `mmdc` déjà passée par l'analyseur à liste
 * blanche de `rendre-mermaid.mjs` : plus aucun `<style>`, plus aucun `style=`, et
 * la classe `diagramme-mermaid` posée sur la racine.
 */
const SVG_MERMAID = `<svg id="d0-diagramme" class="diagramme-mermaid" viewBox="0 0 412 174" xmlns="http://www.w3.org/2000/svg" role="graphics-document document">
  <title id="d0-titre">Trajet d'une requête soumise à la CSP</title>
  <desc id="d0-desc">Le navigateur demande la page, le serveur répond, le script inline est refusé.</desc>
  <g class="root">
    <path d="M54,43L54,67L54,91" class="flowchart-link"></path>
    <g class="node"><rect x="-46" y="-19" width="92" height="38"></rect>
      <text class="nodeLabel" y="0"><tspan x="0" dy="0">Navigateur</tspan></text>
    </g>
  </g>
</svg>`;

// -----------------------------------------------------------------------------
// Les fixtures d'AST — une par membre de l'union, garanties par le compilateur
// -----------------------------------------------------------------------------

const FIXTURES: Record<BlocContenu['type'], BlocContenu> = {
  prose: { type: 'prose', html: HTML_PROSE },
  code: { type: 'code', langage: 'php', htmlColore: HTML_CODE },
  comparaison: {
    type: 'comparaison',
    exemples: [
      {
        langage: 'php',
        vulnerable: {
          htmlColore:
            '<pre class="shiki"><code><span class="line">$q = "…" . $_GET;</span></code></pre>',
          annotations: [
            { ligne: 1, texte: 'La donnée du client entre telle quelle dans la requête.' },
            { ligne: 0, texte: 'Aucune requête préparée dans tout ce bloc.' },
          ],
        },
        corrige: {
          htmlColore:
            '<pre class="shiki"><code><span class="line">$s = $pdo->prepare("…");</span></code></pre>',
          annotations: [
            { ligne: 1, texte: 'La requête est préparée, la donnée reste un paramètre.' },
          ],
        },
      },
    ],
  },
  mermaid: {
    type: 'mermaid',
    svg: SVG_MERMAID,
    titreAccessible: 'Trajet d’une requête soumise à la CSP',
    descriptionLongue:
      'Le navigateur demande la page, le serveur répond avec l’en-tête ' +
      'Content-Security-Policy, puis le navigateur refuse le script inline non haché.',
  },
  encadre: {
    type: 'encadre',
    variante: 'attention',
    blocs: [{ type: 'prose', html: '<p>Un enfant rendu par la récursion.</p>' }],
  },
  'ancre-quiz': { type: 'ancre-quiz' },
  'ancre-simulation': { type: 'ancre-simulation' },
};

// -----------------------------------------------------------------------------
// Outillage
// -----------------------------------------------------------------------------

interface Recensement {
  parElement: Record<string, number>;
  attributs: number;
}

/**
 * Recense éléments et attributs SOUS une racine — racine EXCLUE. L'exclusion n'est
 * pas un détail : côté rendu, la racine est le `<div>` du gabarit, qui n'a jamais
 * traversé le sanitizer ; l'y compter ajouterait un attribut fantôme à la mesure
 * « après ».
 */
function recenserSous(racine: Element): Recensement {
  const parElement: Record<string, number> = {};
  let attributs = 0;
  const visiter = (element: Element): void => {
    parElement[element.localName] = (parElement[element.localName] ?? 0) + 1;
    attributs += element.attributes.length;
    for (const enfant of Array.from(element.children)) visiter(enfant);
  };
  for (const enfant of Array.from(racine.children)) visiter(enfant);
  return { parElement, attributs };
}

/** Le fragment analysé HORS d'Angular — l'étalon du comptage. */
function recenserFragment(html: string): Recensement {
  const porteur = document.createElement('div');
  porteur.innerHTML = html;
  return recenserSous(porteur);
}

async function rendre(blocs: readonly BlocContenu[]): Promise<HTMLElement> {
  const fixture: ComponentFixture<RenduBlocs> = TestBed.createComponent(RenduBlocs);
  fixture.componentRef.setInput('blocs', blocs);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function sourceDuComposant(): string {
  return readFileSync(
    join(
      process.cwd(),
      'src',
      'app',
      'features',
      'cours',
      'lecon',
      'rendu-blocs',
      'rendu-blocs.ts',
    ),
    'utf8',
  );
}

// -----------------------------------------------------------------------------

describe('RenduBlocs', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('sonde de conservation — ce que le sanitizer laisse passer', () => {
    it('CONTRÔLE POSITIF : les deux fragments portent bien les comptes mesurés', () => {
      // Sans cette assertion, « le HTML survit » resterait vrai d'une fixture qu'on
      // aurait vidée par mégarde. C'est elle qui rend la conclusion vérifiable.
      const prose = recenserFragment(HTML_PROSE);
      expect(prose.parElement).toEqual(COMPTES_PROSE);
      expect(prose.attributs).toBe(ATTRIBUTS_PROSE);

      const code = recenserFragment(HTML_CODE);
      expect(code.parElement).toEqual(COMPTES_CODE);
      expect(code.attributs).toBe(ATTRIBUTS_CODE);
    });

    it('`prose` : le HTML de markdown-it survit INTACT à `[innerHTML]`', async () => {
      const rendu = await rendre([FIXTURES.prose]);
      const cible = rendu.querySelector('.prose');
      expect(cible).not.toBeNull();

      const avant = recenserFragment(HTML_PROSE);
      const apres = recenserSous(cible as Element);

      // `console.warn` et non `console.info` : le lanceur d'Angular 22 n'affiche que
      // stderr — une sonde muette ne prouve rien (L-005).
      console.warn(
        `Sonde prose — éléments ${JSON.stringify(avant.parElement)} → ` +
          `${JSON.stringify(apres.parElement)} · attributs ${avant.attributs} → ${apres.attributs}`,
      );

      expect(apres.parElement).toEqual(avant.parElement);
      expect(apres.attributs).toBe(avant.attributs);
      // Et le contenu, pas seulement la charpente : un tableau vidé de son texte
      // passerait les comptes ci-dessus.
      expect(cible?.textContent).toContain('Clef primaire');
      expect(cible?.querySelector('a')?.getAttribute('href')).toBe('https://example.org/reference');
    });

    it('`code` : le HTML de Shiki survit INTACT, `class` comprises', async () => {
      const rendu = await rendre([FIXTURES.code]);
      const cible = rendu.querySelector('.code');
      expect(cible).not.toBeNull();

      const avant = recenserFragment(HTML_CODE);
      const apres = recenserSous(cible as Element);

      console.warn(
        `Sonde code — éléments ${JSON.stringify(avant.parElement)} → ` +
          `${JSON.stringify(apres.parElement)} · attributs ${avant.attributs} → ${apres.attributs}`,
      );

      expect(apres.parElement).toEqual(avant.parElement);
      expect(apres.attributs).toBe(avant.attributs);
      // La coloration ne tient QU'AUX CLASSES (zéro `style=`, CSP à hachages) :
      // les perdre afficherait un code en noir et blanc sous un run vert.
      expect(cible?.querySelector('pre')?.getAttribute('class')).toContain('shiki');
      expect(cible?.querySelectorAll('span.line').length).toBe(3);
      // Le langage reste lisible du DOM sans être une promesse visuelle.
      expect(cible?.getAttribute('data-langage')).toBe('php');
    });
  });

  describe('le contournement du sanitizer — les deux moitiés de la pince', () => {
    it('CONTRÔLE NÉGATIF : un `<script>` dans un bloc `prose` est NEUTRALISÉ', async () => {
      // La preuve que `bypassSecurityTrustHtml` n'est atteignable que par `mermaid`.
      // Le contenu est aujourd'hui 100 % auteur-contrôlé — le pipeline de rendu n'en
      // reste pas moins une frontière de confiance (`.claude/rules/security.md` §4).
      const rendu = await rendre([
        {
          type: 'prose',
          html:
            '<p>Avant.</p><script>globalThis.__renduBlocsCompromis = true;</script>' +
            '<img src="x" onerror="globalThis.__renduBlocsCompromis = true"><p>Après.</p>',
        },
      ]);
      const cible = rendu.querySelector('.prose');

      expect(cible?.querySelector('script')).toBeNull();
      expect(cible?.innerHTML).not.toContain('<script');
      expect(cible?.innerHTML).not.toContain('onerror');
      // Contrôle positif du contrôle négatif : le bloc a bien été rendu, il n'est
      // pas vide par accident.
      expect(cible?.textContent).toContain('Avant.');
      expect(cible?.textContent).toContain('Après.');
    });

    it('CONTRÔLE POSITIF : le SVG d’un bloc `mermaid` arrive ENTIER', async () => {
      // Sans contournement, la sonde `src/sonde-sanitizer-svg.spec.ts` a mesuré
      // 24 éléments → 0 et 71 attributs → 0. Ce test prouve que le contournement
      // fait bien ce qu'il prétend — et rougirait si on le retirait.
      const rendu = await rendre([FIXTURES.mermaid]);
      const dessin = rendu.querySelector('.dessin');
      const svg = dessin?.querySelector('svg');

      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('class')).toContain('diagramme-mermaid');
      expect(dessin?.querySelectorAll('path').length).toBe(1);
      expect(dessin?.querySelectorAll('rect').length).toBe(1);
      expect(dessin?.querySelectorAll('tspan').length).toBe(1);
      expect(dessin?.querySelector('title')?.textContent).toContain('CSP');
    });

    it('n’expose AUCUN contournement générique : un seul appel, dans la branche `mermaid`', () => {
      // Vérifié sur le SOURCE et non sur le DOM : une méthode générique
      // `enConfiance(html)` introduite demain, appelée depuis une branche que ces
      // tests ne rendent pas, passerait autrement inaperçue.
      const source = sourceDuComposant();
      const appels = source.match(/this\.assainisseur\.bypassSecurityTrust\w*\(/g) ?? [];
      expect(appels).toHaveLength(1);
      expect(appels[0]).toBe('this.assainisseur.bypassSecurityTrustHtml(');
      // Les trois autres liaisons de HTML passent par le sanitizer, nues.
      expect(source).not.toContain('bypassSecurityTrustScript');
      expect(source).not.toContain('bypassSecurityTrustResourceUrl');
    });

    it('calcule la valeur de confiance UNE FOIS, pas à chaque détection', async () => {
      // Un `SafeHtml` recalculé à chaque cycle remplacerait le SVG dans le DOM :
      // position de défilement et focus perdus à chaque changement d'état de la page.
      const fixture: ComponentFixture<RenduBlocs> = TestBed.createComponent(RenduBlocs);
      fixture.componentRef.setInput('blocs', [FIXTURES.mermaid]);
      await fixture.whenStable();

      const hote = fixture.nativeElement as HTMLElement;
      const avant = hote.querySelector('.dessin svg');
      fixture.detectChanges();
      const apres = hote.querySelector('.dessin svg');

      expect(avant).not.toBeNull();
      expect(apres).toBe(avant);
    });
  });

  describe('accessibilité du diagramme', () => {
    it('porte un nom accessible court et un équivalent textuel révélable SANS JS', async () => {
      const rendu = await rendre([FIXTURES.mermaid]);
      const dessin = rendu.querySelector('.dessin');

      // `role="img"` est un rôle FEUILLE : le lecteur d'écran annonce le nom et ne
      // parcourt pas les centaines de nœuds du diagramme.
      expect(dessin?.getAttribute('role')).toBe('img');
      expect(dessin?.getAttribute('aria-label')).toBe('Trajet d’une requête soumise à la CSP');

      // `<details>` est NATIF : il s'ouvre sans JavaScript, ce qui est la seule
      // option tenable ici — `withNoIncrementalHydration()` est actif et la page est
      // prerendue (`src/app/app.config.ts`).
      const details = rendu.querySelector('details');
      expect(details?.querySelector('summary')?.textContent).toContain('Description');
      expect(details?.textContent).toContain('Content-Security-Policy');
    });

    it('ÉCHOUE bruyamment sur un diagramme sans équivalent textuel', async () => {
      // Un `role="img"` sans nom accessible est une violation de WCAG 1.1.1 livrée
      // en silence dans une leçon publiée. Le prerender doit tomber à la place.
      const fixture: ComponentFixture<RenduBlocs> = TestBed.createComponent(RenduBlocs);
      fixture.componentRef.setInput('blocs', [
        { type: 'mermaid', svg: SVG_MERMAID, titreAccessible: '  ', descriptionLongue: 'x' },
      ]);

      expect(() => fixture.componentInstance.blocsPrepares()).toThrowError(/1\.1\.1/);
    });
  });

  describe('encadré — récursif, et distingué par autre chose que la couleur', () => {
    it('rend ses blocs enfants par récursion, sous son étiquette écrite', async () => {
      const rendu = await rendre([FIXTURES.encadre]);
      const encadre = rendu.querySelector('.encadre');

      expect(encadre?.getAttribute('data-variante')).toBe('attention');
      // Le troisième canal de WCAG 1.4.1 : le MOT. En `forced-colors: active`, la
      // couleur tombe et le style de trait seul ne dirait pas de quel genre d'encadré
      // il s'agit.
      expect(encadre?.querySelector('.etiquette')?.textContent).toContain('Attention');
      // La récursion : l'enfant `prose` est bien rendu, à l'intérieur.
      expect(encadre?.querySelector('.prose')?.textContent).toContain(
        'Un enfant rendu par la récursion',
      );
    });

    it('nomme chacune des trois variantes, jamais un libellé vide', async () => {
      // Les libellés sont ÉCRITS ICI, jamais importés du composant (L-012) : un
      // composant qui cesserait de les rendre resterait vert autrement.
      const attendus: [BlocContenu, string][] = [
        [{ type: 'encadre', variante: 'attention', blocs: [] }, 'Attention'],
        [{ type: 'encadre', variante: 'note', blocs: [] }, 'Note'],
        [{ type: 'encadre', variante: 'a-retenir', blocs: [] }, 'À retenir'],
      ];

      for (const [bloc, libelle] of attendus) {
        TestBed.resetTestingModule();
        const rendu = await rendre([bloc]);
        expect(rendu.querySelector('.etiquette')?.textContent?.trim()).toBe(libelle);
      }
    });
  });

  describe('comparaison — rendu provisoire, mais complet et honnête', () => {
    it('rend les deux volets étiquetés, avec leurs annotations rattachées', async () => {
      const rendu = await rendre([FIXTURES.comparaison]);

      const vulnerable = rendu.querySelector('.volet-vulnerable');
      const corrige = rendu.querySelector('.volet-corrige');
      expect(vulnerable?.querySelector('.etiquette')?.textContent).toContain('vulnérable');
      expect(corrige?.querySelector('.etiquette')?.textContent).toContain('Correctif');
      // La langue est écrite, pas seulement portée par un onglet à venir.
      expect(vulnerable?.querySelector('.etiquette')?.textContent).toContain('php');

      // Les annotations appartiennent au volet qui les porte — les mélanger ferait
      // décrire le correctif par le commentaire de la faille.
      expect(vulnerable?.querySelectorAll('.annotations li').length).toBe(2);
      expect(corrige?.querySelectorAll('.annotations li').length).toBe(1);
      expect(vulnerable?.textContent).toContain('Ligne 1');
      // `ligne: 0` désigne le bloc entier (convention tranchée en E2-ST1) : il ne
      // doit surtout pas s'afficher « Ligne 0 ».
      expect(vulnerable?.textContent).toContain('Ensemble du bloc');
      expect(vulnerable?.textContent).not.toContain('Ligne 0');
      expect(corrige?.textContent).toContain('la donnée reste un paramètre');
    });

    it('n’emploie AUCUN motif ARIA d’onglets — c’est le sous-projet E2-ST4', async () => {
      // Un `tablist` à moitié posé dégrade l'accessibilité au lieu de l'améliorer
      // (constat C5 du 2026-08-04, backlog §E2-ST4). Mieux vaut un empilement nu.
      const rendu = await rendre([FIXTURES.comparaison]);

      expect(rendu.querySelector('[role="tablist"]')).toBeNull();
      expect(rendu.querySelector('[role="tab"]')).toBeNull();
      expect(rendu.querySelector('[role="tabpanel"]')).toBeNull();
    });
  });

  describe('ancres de quiz et de simulation', () => {
    it('ne rendent RIEN — aucune promesse à l’écran d’un quiz qui n’existe pas', async () => {
      // Un cadre « Quiz » ou un « à venir » ferait mentir la page. Les deux cas sont
      // traités NOMMÉMENT dans le `@switch` (aucun `@default` muet) ; ce qu'ils
      // rendent est le vide, et leur position est celle où E2-ST3/E2-ST5 poseront
      // leur composant.
      const rendu = await rendre([FIXTURES['ancre-quiz'], FIXTURES['ancre-simulation']]);

      expect(rendu.querySelectorAll('*').length).toBe(0);
      expect(rendu.textContent?.trim()).toBe('');
    });
  });

  describe('complétude et échec bruyant', () => {
    it('rend les SEPT types du contrat sans lever', async () => {
      // `FIXTURES` est un `Record<BlocContenu['type'], BlocContenu>` : ce test ne
      // pourrait pas COMPILER s'il manquait un membre de l'union. C'est le
      // compilateur qui tient la complétude, pas une liste recopiée.
      const tous = Object.values(FIXTURES);
      expect(tous).toHaveLength(7);

      const rendu = await rendre(tous);
      expect(rendu.querySelector('.prose')).not.toBeNull();
      expect(rendu.querySelector('.code')).not.toBeNull();
      expect(rendu.querySelector('.comparaison')).not.toBeNull();
      expect(rendu.querySelector('.diagramme')).not.toBeNull();
      expect(rendu.querySelector('.encadre')).not.toBeNull();
    });

    it('ÉCHOUE en NOMMANT le type, sur un bloc que le contrat ne connaît pas', () => {
      // Le cast est la seule façon d'écrire ce cas : le contrat l'interdit à la
      // compilation. Ce qu'il simule est réel — un JSON compilé par une autre
      // version du pipeline. Un rendu vide en silence ferait un trou dans une leçon
      // publiée ; le rendu ayant lieu au prerender, l'échec casse la construction.
      const inconnu = { type: 'carrousel-3d' } as unknown as BlocContenu;
      const fixture: ComponentFixture<RenduBlocs> = TestBed.createComponent(RenduBlocs);
      fixture.componentRef.setInput('blocs', [FIXTURES.prose, inconnu]);

      expect(() => fixture.componentInstance.blocsPrepares()).toThrowError(/carrousel-3d/);
      // Et il dit OÙ : « bloc n°2 », pas « un bloc quelque part ».
      expect(() => fixture.componentInstance.blocsPrepares()).toThrowError(/n°2/);
    });

    it('lève aussi sur un type inconnu IMBRIQUÉ dans un encadré', async () => {
      // La récursion doit valider, pas seulement rendre : sinon un encadré serait
      // un angle mort où n'importe quoi passerait.
      const encadre: BlocContenu = {
        type: 'encadre',
        variante: 'note',
        blocs: [{ type: 'video-360' } as unknown as BlocContenu],
      };

      await expect(rendre([encadre])).rejects.toThrowError(/video-360/);
    });

    it('accepte un tableau VIDE sans rien rendre ni lever', async () => {
      const rendu = await rendre([]);
      expect(rendu.querySelectorAll('*').length).toBe(0);
    });
  });

  describe('interdits de forme', () => {
    it('ne pose pas `standalone: true` (défaut depuis Angular 20)', () => {
      expect(sourceDuComposant()).not.toContain('standalone');
    });

    it('n’emploie ni `ngClass` ni `ngStyle`', () => {
      const source = sourceDuComposant();
      expect(source).not.toContain('ngClass');
      expect(source).not.toContain('ngStyle');
    });
  });
});
