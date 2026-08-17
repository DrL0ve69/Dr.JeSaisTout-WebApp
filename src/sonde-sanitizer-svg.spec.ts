// =============================================================================
// SONDE — le sanitizer d'Angular laisse-t-il passer un SVG en `[innerHTML]` ?
// (E2-ST1, lot 3 · objection B1 du plan arrêté)
// -----------------------------------------------------------------------------
// POURQUOI CE FICHIER EXISTE, ET POURQUOI IL RESTE DANS LE DÉPÔT.
// Le lot 3 rend les diagrammes Mermaid en SVG À LA COMPILATION. E2-ST2 devra
// poser ce SVG dans la page. Deux voies, et une seule est acceptable selon ce que
// le sanitizer fait réellement :
//
//   · BRANCHE A — la structure survit : liaison directe `[innerHTML]`, SANS
//     `bypassSecurityTrustHtml`. Rien à justifier, rien à faire relire.
//   · BRANCHE B — le sanitizer mord : `bypassSecurityTrustHtml` devient
//     INÉVITABLE, scopé au seul bloc `mermaid`, justifié en commentaire nominatif
//     et soumis à une revue `security-reviewer` avant le merge d'E2-ST2.
//
// La différence entre les deux branches est une décision de sécurité. On ne la
// prend pas de mémoire ni sur la foi d'un billet de blogue : on la MESURE, sur la
// version d'Angular réellement installée. Cette sonde est la mesure, et elle reste
// versionnée parce qu'elle est aussi le TRIPWIRE de la décision : le jour où une
// montée d'Angular changerait le verdict, c'est ce test qui rougit, et la note de
// `tools/content-pipeline/types.d.ts` devient fausse au même instant.
//
// LE CONTRÔLE POSITIF (L-019). « Le SVG ne survit pas » est vrai d'un fragment
// vide, d'un composant qui ne rend rien, et d'un comptage cassé. Le premier test
// prouve donc que la MÉTHODE DE COMPTAGE trouve bel et bien les onze familles
// d'éléments dans le fragment d'origine. Si quelqu'un ampute le fragment, c'est
// ce test-là qui rougit — pas la conclusion, qui deviendrait muette.
//
// LE FRAGMENT. Ce n'est pas un `<g><text>` de démonstration : c'est la forme
// réelle que `mmdc` produit avec `htmlLabels: false` — `<defs>`, `<marker>`,
// `<clipPath>`, `<g class="node …">`, `<path>`, `<text><tspan>`, plus le `<title>`
// et le `<desc>` que Mermaid tire des directives `accTitle:` / `accDescr:`. Un
// fragment plus pauvre donnerait une réponse qui ne vaudrait que pour lui.
// =============================================================================

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';

/**
 * Extrait REPRÉSENTATIF d'une sortie `mmdc` (`flowchart`, `htmlLabels: false`).
 * Les valeurs numériques sont réduites pour la lisibilité ; la STRUCTURE, elle,
 * est celle que Mermaid émet vraiment.
 */
const SVG_MMDC = `<svg id="diagramme-0" width="100%" viewBox="0 0 412 174"
     xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     role="graphics-document document" aria-roledescription="flowchart-v2">
  <title id="titre-0">Trajet d'une requête soumise à la CSP</title>
  <desc id="desc-0">Le navigateur demande la page, le serveur répond avec l'en-tête
    Content-Security-Policy, puis le navigateur refuse le script inline non haché.</desc>
  <defs>
    <marker id="fleche-fin" class="marker flowchart-v2" viewBox="0 0 10 10"
            refX="5" refY="5" markerUnits="userSpaceOnUse"
            markerWidth="8" markerHeight="8" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" class="arrowMarkerPath"></path>
    </marker>
    <clipPath id="decoupe-0"><rect x="0" y="0" width="412" height="174"></rect></clipPath>
  </defs>
  <g class="root" clip-path="url(#decoupe-0)">
    <g class="edgePaths">
      <path d="M54,43L54,67L54,91" id="arete-0"
            class="edge-thickness-normal edge-pattern-solid flowchart-link"
            marker-end="url(#fleche-fin)"></path>
    </g>
    <g class="nodes">
      <g class="node default" id="noeud-navigateur" transform="translate(54,27)">
        <rect class="basic label-container" rx="0" ry="0"
              x="-46" y="-19" width="92" height="38"></rect>
        <g class="label" transform="translate(-16,-12)">
          <text class="nodeLabel" text-anchor="middle" y="0">
            <tspan class="text-outer-tspan" x="0" dy="0">
              <tspan class="text-inner-tspan" dy="0">Navigateur</tspan>
            </tspan>
          </text>
        </g>
      </g>
      <g class="node default" id="noeud-serveur" transform="translate(54,115)">
        <rect class="basic label-container" x="-46" y="-19" width="92" height="38"></rect>
        <g class="label" transform="translate(-14,-12)">
          <text class="nodeLabel" text-anchor="middle" y="0">
            <tspan class="text-outer-tspan" x="0" dy="0">
              <tspan class="text-inner-tspan" dy="0">Serveur</tspan>
            </tspan>
          </text>
        </g>
      </g>
    </g>
  </g>
</svg>`;

/**
 * Les familles d'éléments dont dépend la LISIBILITÉ d'un diagramme Mermaid.
 * Perdre `path` efface les arêtes ; perdre `tspan` efface les étiquettes ;
 * perdre `marker` efface les pointes de flèche ; perdre `title`/`desc` efface
 * l'équivalent textuel exigé par WCAG 1.1.1.
 */
const ELEMENTS_ATTENDUS = [
  'svg',
  'title',
  'desc',
  'defs',
  'marker',
  'clipPath',
  'rect',
  'path',
  'g',
  'text',
  'tspan',
] as const;

/**
 * Ce que le fragment contient RÉELLEMENT — mesuré, pas estimé. 24 éléments,
 * 71 attributs au total. C'est l'étalon du contrôle positif : sans lui, « rien
 * n'a survécu » resterait vrai d'un fragment qu'on aurait vidé par mégarde.
 */
const COMPTES_ORIGINE: Record<string, number> = {
  svg: 1,
  title: 1,
  desc: 1,
  defs: 1,
  marker: 1,
  clipPath: 1,
  rect: 3,
  path: 2,
  g: 7,
  text: 2,
  tspan: 4,
};

/** Composant nu : rien d'autre que la liaison qu'E2-ST2 voudrait écrire. */
@Component({
  selector: 'app-sonde-svg',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="cible" [innerHTML]="fragment()"></div>',
})
class SondeSvg {
  readonly fragment = input.required<string>();
}

interface Recensement {
  parElement: Map<string, number>;
  attributs: number;
}

/**
 * Recense les éléments (par nom local) et le nombre total d'attributs sous une
 * racine — racine EXCLUE. L'exclusion n'est pas un détail : côté rendu, la racine
 * est le `<div class="cible">` du composant, qui n'a jamais traversé le sanitizer.
 * L'y compter ajouterait un attribut fantôme à toute mesure « après ».
 */
function recenserSous(racine: Element): Recensement {
  const parElement = new Map<string, number>();
  let attributs = 0;
  const visiter = (element: Element): void => {
    const nom = element.localName;
    parElement.set(nom, (parElement.get(nom) ?? 0) + 1);
    attributs += element.attributes.length;
    for (const enfant of Array.from(element.children)) visiter(enfant);
  };
  for (const enfant of Array.from(racine.children)) visiter(enfant);
  return { parElement, attributs };
}

/**
 * Le fragment d'origine, analysé HORS d'Angular — c'est l'étalon du comptage.
 * Le `<svg>` racine est réinséré dans un porteur neutre pour que les deux mesures
 * répondent exactement à la même question : « que trouve-t-on SOUS le porteur ? »
 */
function recenserOriginal(): Recensement {
  const analyse = new DOMParser().parseFromString(SVG_MMDC, 'image/svg+xml');
  const porteur = document.createElement('div');
  porteur.appendChild(analyse.documentElement);
  return recenserSous(porteur);
}

/** Monte le composant et recense ce que le sanitizer a laissé dans le DOM. */
async function recenserApresSanitizer(): Promise<{
  survivants: Recensement;
  htmlRendu: string;
}> {
  const fixture = TestBed.createComponent(SondeSvg);
  fixture.componentRef.setInput('fragment', SVG_MMDC);
  await fixture.whenStable();

  const cible = (fixture.nativeElement as HTMLElement).querySelector('.cible');
  if (cible === null) throw new Error('la sonde n’a pas rendu son élément cible');
  return { survivants: recenserSous(cible), htmlRendu: cible.innerHTML };
}

describe('Sonde — le sanitizer d’Angular face à un SVG Mermaid', () => {
  it('CONTRÔLE POSITIF : le fragment d’origine porte bien les 24 éléments et 71 attributs mesurés', () => {
    const original = recenserOriginal();

    // Les comptes sont ÉCRITS, pas seulement « > 0 » : c'est ce qui rend la
    // conclusion de `types.d.ts` vérifiable. Amputer le fragment fait rougir ici.
    expect(Object.fromEntries(original.parElement)).toEqual(COMPTES_ORIGINE);
    expect([...original.parElement.values()].reduce((s, n) => s + n, 0)).toBe(24);
    expect(original.attributs).toBe(71);
  });

  it('MESURE : compte les survivants après passage par `[innerHTML]`', async () => {
    const original = recenserOriginal();
    const { survivants } = await recenserApresSanitizer();

    // Le compte-rendu chiffré — c'est LUI que `types.d.ts` cite. Il s'imprime à
    // chaque exécution : une conclusion consignée sans son chiffre est une opinion.
    const lignes = ELEMENTS_ATTENDUS.map((nom) => {
      const avant = original.parElement.get(nom) ?? 0;
      const apres = survivants.parElement.get(nom) ?? 0;
      return `  ${nom.padEnd(10)} ${String(avant).padStart(3)} → ${String(apres).padStart(3)}`;
    });
    // `console.warn` et non `console.info` : le lanceur de tests d'Angular 22
    // n'affiche que stderr — un compte-rendu sur stdout serait AVALÉ, et une
    // sonde muette ne prouve rien (L-005).
    console.warn(
      [
        'Sonde sanitizer SVG — éléments avant → après `[innerHTML]` :',
        ...lignes,
        `  ${'attributs'.padEnd(10)} ${String(original.attributs).padStart(3)} → ` +
          `${String(survivants.attributs).padStart(3)}`,
      ].join('\n'),
    );

    // Le delta, en une ligne : 24 éléments et 71 attributs entrent, 0 et 0 sortent.
    expect([...original.parElement.values()].reduce((s, n) => s + n, 0)).toBe(24);
    expect([...survivants.parElement.values()].reduce((s, n) => s + n, 0)).toBe(0);
    expect(original.attributs).toBe(71);
    expect(survivants.attributs).toBe(0);
  });

  it('VERDICT — BRANCHE B : le sanitizer efface INTÉGRALEMENT le SVG', async () => {
    const { survivants, htmlRendu } = await recenserApresSanitizer();

    // Angular a retiré SVG de la liste blanche de son sanitizer HTML : aucune des
    // onze familles ne survit, pas même `<svg>` lui-même. Seul le texte des nœuds
    // reste, sous forme de nœuds textuels sans structure — donc un diagramme
    // illisible, et un `<title>`/`<desc>` perdus (WCAG 1.1.1 non tenu).
    //
    // ⚠️ TRIPWIRE. Si une future version d'Angular réadmettait SVG, CE test
    // rougirait — et la conclusion consignée dans `tools/content-pipeline/types.d.ts`
    // deviendrait fausse au même instant. C'est voulu : la note et la mesure
    // tombent ensemble.
    for (const nom of ELEMENTS_ATTENDUS) {
      expect(survivants.parElement.get(nom) ?? 0).toBe(0);
    }
    expect(survivants.attributs).toBe(0);
    expect(htmlRendu).not.toContain('<svg');
    expect(htmlRendu).not.toContain('<path');

    // Contrôle positif du VERDICT : quelque chose a bien été rendu (le composant
    // n'est pas simplement vide parce qu'il n'a rien reçu) — le texte des étiquettes
    // survit, dépouillé de sa structure.
    expect(htmlRendu).toContain('Navigateur');
    expect(htmlRendu).toContain('Serveur');
  });
});
