// =============================================================================
// L'ANALYSEUR SVG CONTRAINT-IL LES VALEURS `url(…)` ? (dette sécurité, lot D)
// -----------------------------------------------------------------------------
// POURQUOI CE SPEC EXISTE.
// `tools/content-pipeline/rendre-mermaid.mjs` confronte le SVG rendu par `mmdc` à
// une liste blanche NOMINATIVE — c'est le patron de référence du dépôt. Mais
// jusqu'à ce lot, cette liste contraignait les NOMS d'attributs et, pour les
// seuls `href`/`xlink:href`, leur valeur. Or `fill`, `stroke`, `clip-path`,
// `marker-start` et `marker-end` acceptent un `<FuncIRI>` : la revue de sécurité
// d'E2-ST2 (lot A, 2026-08-17) a montré que
// `fill="url(https://exemple.invalide/x.svg#p)"` traversait SANS UN MOT, code 0.
// `prefixerIdentifiants` ne s'en plaignait pas davantage — il ne signale qu'un
// `url(#…)` LOCAL orphelin. Une référence externe entrait donc dans un SVG livré.
//
// CE QUE CES CHARGES ONT VALU AVANT LE CORRECTIF — mesuré, pas supposé.
// Les onze charges ci-dessous ont été rejouées contre la version de `HEAD`
// antérieure au lot : **onze acceptations, code 0, aucun message**. Contre la
// version corrigée : onze refus nommés, plus le SVG sain toujours accepté. Sans
// cette mesure préalable, un test vert ne prouverait rien — c'est la faute du lot
// A d'E2-ST1, où une charge supposée silencieuse ne l'était pas (S-003 : « un
// contrôle positif qu'aucun runner n'exécute est une intention, pas un gate »).
//
// CE QUE LA REVUE DE SÉCURITÉ DU LOT D A AJOUTÉ (2026-08-19), en trois points.
// (1) `REFERENCE_LOCALE` seule était un FAUX POSITIF MESURÉ : `mmdc` émet
//     `fill="rgb(191, 223, 255)"` dès qu'un `sequenceDiagram` emploie
//     `rect rgb(…)`, la syntaxe documentée de surlignage d'un échange — et
//     `.claude/rules/contenu-pedagogique.md` §3 IMPOSE un `sequenceDiagram` dès
//     qu'une leçon décrit un aller-retour. Le corpus de la fixture (2 diagrammes)
//     ne pouvait pas le voir. D'où `COULEUR_FONCTIONNELLE`, ajoutée
//     NOMINATIVEMENT après avoir rendu les deux formes et relu la sortie
//     (`rgb(…)` et `rgba(…)` : mesurées ; `hsl()`, `var()` : jamais observées,
//     donc jamais admises). Les témoins ci-dessous figent les deux sens.
// (2) Le couplage `ATTRIBUTS_AUTORISES` → `ATTRIBUTS_FUNCIRI` n'était tenu que
//     par un commentaire : `mask`, `filter`, `marker` et `marker-mid` portent un
//     FuncIRI et ne sont refusés que par leur NOM. Un lot qui en admettrait un
//     rouvrirait le trou en une ligne — d'où le tripwire exécutable, en fin de
//     fichier.
// (3) Deux assouplissements restaient invisibles : `URL(#a)` LOCAL et `url( #a )`
//     LOCAL (seules leurs variantes EXTERNES étaient couvertes). Ils ont leur
//     `it`.
//
// POURQUOI PAR PROCESSUS FILS, ET NON PAR IMPORT — même raison que
// `pipeline-contenu-orchestration.spec.ts` : `rendre-mermaid.mjs` est un `.mjs`
// vérifié par le TROISIÈME programme (`tsconfig.tools.json`, Node pur).
// L'importer d'ici le ferait entrer dans `tsconfig.spec.json`, qui n'a ni
// `allowJs` ni les types Node de l'outillage. Et le refus de l'analyseur passe de
// toute façon par `process.exit(1)` : le code de sortie EST l'assertion.
//
// ⚠️ Sur Windows, un `import()` dynamique exige une URL `file://` — un chemin
// absolu « C:\… » est refusé par le chargeur ESM (`ERR_UNSUPPORTED_ESM_URL_SCHEME`,
// il y lit un protocole « c: »). D'où `pathToFileURL` ci-dessous.
//
// Ce spec n'ouvre AUCUN Chromium : il n'appelle que l'analyseur, sur des SVG
// écrits à la main. Aucune dépendance à `npm run e2e:install`.
// =============================================================================

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const MODULE = pathToFileURL(
  join(process.cwd(), 'tools', 'content-pipeline', 'rendre-mermaid.mjs'),
).href;

/** L'origine passée à l'analyseur : c'est elle qui doit nommer le fichier ET le rang. */
const ORIGINE = 'lecon-charge.md · diagramme n°3';

/** Le module charge Playwright et le compilateur Markdown à l'import : c'est lent, pas infini. */
const DELAI = 60_000;

interface Verdict {
  code: number;
  journal: string;
}

/** Passe un SVG à `verifierSvgNettoye` dans un processus fils et rend son verdict. */
function analyser(corps: string): Verdict {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg">${corps}</svg>`;
  const script =
    `const m = await import(${JSON.stringify(MODULE)});` +
    `m.verifierSvgNettoye(${JSON.stringify(svg)}, ${JSON.stringify(ORIGINE)});`;
  const resultat = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8',
    cwd: process.cwd(),
  });
  return {
    code: resultat.status ?? -1,
    journal: `${resultat.stdout ?? ''}\n${resultat.stderr ?? ''}`,
  };
}

describe("l'analyseur SVG de `rendre-mermaid.mjs`, sur les valeurs `url(…)`", () => {
  // ---------------------------------------------------------------------------
  // LE TÉMOIN — sans lui, un spec qui refuse TOUT serait vert de bout en bout
  // ---------------------------------------------------------------------------
  describe('sur un SVG SAIN', () => {
    it(
      'accepte les cinq attributs porteurs de `FuncIRI` dans leurs formes légitimes',
      () => {
        // Exactement ce que `mmdc` émet, mesuré sur les diagrammes de la fixture :
        // des couleurs hexadécimales, `none`, un mot-clef de couleur, et un
        // `url(#…)` local vers un `<marker>` défini dans le même document.
        const verdict = analyser(
          '<defs><marker id="fleche"><path d="M0 0"/></marker>' +
            '<clipPath id="coupe"><rect x="0" y="0" width="4" height="4"/></clipPath></defs>' +
            '<g clip-path="url(#coupe)">' +
            '<path d="M0 0" fill="none" stroke="#666" marker-end="url(#fleche)"/>' +
            '<line x1="0" y1="0" x2="4" y2="4" stroke="black" marker-start="url(#fleche)"/>' +
            '<rect x="0" y="0" width="4" height="4" fill="#eaeaea"/>' +
            '</g>',
        );
        expect(verdict.journal).not.toContain('url(#identifiant)');
        expect(verdict.code).toBe(0);
      },
      DELAI,
    );

    it(
      'accepte le `rect rgb(…)` de surlignage d’un `sequenceDiagram`, mesuré sur `mmdc`',
      () => {
        // MESURÉ, PAS SUPPOSÉ : `mmdc` a rendu les deux diagrammes ci-dessous et
        // sa sortie porte `<rect fill="rgb(191, 223, 255)">` et
        // `<rect fill="rgba(0, 0, 255, .1)">` — Mermaid pose la couleur du
        // surlignage en ATTRIBUT (`rectElem.attr("fill", rectData.fill)`). Avant
        // le correctif, ces deux valeurs sortaient en code 1 sur un message
        // parlant de `url(#…)`.
        const verdict = analyser(
          '<rect x="0" y="0" width="4" height="4" fill="rgb(191, 223, 255)"/>' +
            '<rect x="0" y="0" width="4" height="4" fill="rgba(0, 0, 255, .1)"/>',
        );
        expect(verdict.journal).not.toContain('url(#identifiant)');
        expect(verdict.code).toBe(0);
      },
      DELAI,
    );
  });

  // ---------------------------------------------------------------------------
  // LES CHARGES — chacune traversait en SILENCE avant ce lot (mesuré, cf. en-tête)
  // ---------------------------------------------------------------------------
  describe('sur une référence EXTERNE', () => {
    it(
      'refuse les CINQ attributs porteurs, et nomme chacun d’eux',
      () => {
        // Une seule charge pour les cinq : ce qu'on veut prouver n'est pas qu'un
        // attribut est couvert, c'est qu'AUCUN des cinq ne manque à l'appel.
        const verdict = analyser(
          '<g clip-path="url(https://exemple.invalide/x.svg#coupe)">' +
            '<path d="M0 0" fill="url(https://exemple.invalide/x.svg#peinture)"/>' +
            '<path d="M0 0" stroke="url(https://exemple.invalide/x.svg#trait)"/>' +
            '<path d="M0 0" marker-start="url(https://exemple.invalide/x.svg#debut)"/>' +
            '<path d="M0 0" marker-end="url(https://exemple.invalide/x.svg#fin)"/>' +
            '</g>',
        );
        expect(verdict.code).toBe(1);
        for (const attendu of [
          '<g clip-path="url(https://exemple.invalide/x.svg#coupe)">',
          '<path fill="url(https://exemple.invalide/x.svg#peinture)">',
          '<path stroke="url(https://exemple.invalide/x.svg#trait)">',
          '<path marker-start="url(https://exemple.invalide/x.svg#debut)">',
          '<path marker-end="url(https://exemple.invalide/x.svg#fin)">',
        ]) {
          expect(verdict.journal).toContain(attendu);
        }
      },
      DELAI,
    );

    it(
      'nomme le fichier et le rang du diagramme dans le refus',
      () => {
        // Un refus qui ne dit pas OÙ est le défaut oblige à fouiller treize leçons.
        const verdict = analyser('<path d="M0 0" fill="url(https://exemple.invalide/x#p)"/>');
        expect(verdict.code).toBe(1);
        expect(verdict.journal).toContain(ORIGINE);
      },
      DELAI,
    );
  });

  // Les formes d'évasion. Aucune n'est « cherchée » par l'analyseur : elles
  // échouent parce qu'elles ne sont pas la forme ADMISE — c'est la différence
  // entre une liste blanche et une liste noire (S-003, S-009).
  const evasions: readonly (readonly [string, string])[] = [
    ['un protocole relatif', '<path d="M0 0" stroke="url(//exemple.invalide/x#p)"/>'],
    [
      'des guillemets doubles',
      '<path d="M0 0" fill="url(&quot;https://exemple.invalide/x#p&quot;)"/>',
    ],
    ['des guillemets simples', `<path d="M0 0" fill="url('https://exemple.invalide/x#p')"/>`],
    ['une casse mixte', '<path d="M0 0" marker-start="URL(https://exemple.invalide/x#p)"/>'],
    ['des espaces internes', '<path d="M0 0" fill="url( https://exemple.invalide/x#p )"/>'],
    ['une URI `data:`', '<path d="M0 0" fill="url(data:image/svg+xml;base64,AAAA#p)"/>'],
    ['un `javascript:`', '<path d="M0 0" stroke="url(javascript:alert(1))"/>'],
    // Depuis l'ajout de `COULEUR_FONCTIONNELLE` : la forme couleur ne doit
    // couvrir QUE des chiffres. Une valeur qui MÊLE une couleur et autre chose,
    // ou une fonction jamais mesurée, reste refusée — sinon l'ajout de forme
    // aurait rouvert la porte qu'il vient de fermer.
    [
      'une couleur suivie d’une déclaration de plus',
      '<path d="M0 0" fill="rgb(0,0,0);background:url(http://exemple.invalide/x)"/>',
    ],
    ['une couleur suivie d’un FuncIRI', '<path d="M0 0" fill="rgb(0,0,0) url(#a)"/>'],
    ['une couleur en casse mixte', '<path d="M0 0" fill="RGB(0,0,0)"/>'],
    ['une parenthèse de couleur non fermée', '<path d="M0 0" stroke="rgb(0,0,0"/>'],
    ['une fonction de couleur jamais mesurée', '<path d="M0 0" fill="hsl(0, 0%, 0%)"/>'],
    ['une variable CSS', '<path d="M0 0" stroke="var(--couleur-trait)"/>'],
  ];

  describe.each(evasions)('sur %s', (_libelle, corps) => {
    it(
      'refuse, et dit quelle forme est la seule admise',
      () => {
        const verdict = analyser(corps);
        expect(verdict.code).toBe(1);
        expect(verdict.journal).toContain('url(#identifiant)');
      },
      DELAI,
    );
  });

  // ---------------------------------------------------------------------------
  // LE CAS QUI SURPREND — une référence LOCALE, mais sous une forme que le
  // préfixage des identifiants ne sait pas réécrire
  // ---------------------------------------------------------------------------
  //
  // ⚠️ CE QUE LE PRÉFIXAGE FAIT VRAIMENT, sans l'exagérer. `prefixerIdentifiants`
  // réécrit `/url\(#([^)]+)\)/g` — sans guillemets, sans le drapeau `i` — ET il
  // préfixe TOUS les `id` du diagramme. Une référence qui échappe à sa réécriture
  // reste donc NON préfixée alors que sa cible, elle, l'est : elle PEND, elle ne
  // désigne plus rien. Elle ne pointerait chez un voisin que si un élément
  // NON-diagramme de la page portait l'identifiant brut. Dans les deux cas, ni le
  // rendu ni le contrôle d'orphelins ne s'en plaindraient : d'où le refus ici.
  //
  // Les trois formes LOCALES ci-dessous sont donc figées ensemble — la première
  // était couverte, les deux autres ne l'étaient que dans leur variante EXTERNE.
  const localesRefusees: readonly (readonly [string, string])[] = [
    ['des guillemets — `url("#a")`', '<path d="M0 0" marker-end="url(&quot;#a&quot;)"/>'],
    ['une casse mixte — `URL(#a)`', '<path d="M0 0" marker-end="URL(#a)"/>'],
    ['des espaces internes — `url( #a )`', '<path d="M0 0" marker-end="url( #a )"/>'],
  ];

  describe.each(localesRefusees)(
    'sur une référence LOCALE que le préfixage ne saurait pas réécrire, avec %s',
    (_libelle, corps) => {
      it(
        'refuse bien qu’elle soit locale, parce que la référence resterait non préfixée',
        () => {
          const verdict = analyser('<defs><marker id="a"><path d="M0 0"/></marker></defs>' + corps);
          expect(verdict.code).toBe(1);
          expect(verdict.journal).toContain('url(#identifiant)');
        },
        DELAI,
      );
    },
  );

  // ---------------------------------------------------------------------------
  // LE TRIPWIRE — le couplage des deux ensembles, tenu par un runner et non par
  // un commentaire (réserve 2 de la revue de sécurité du lot D)
  // ---------------------------------------------------------------------------
  // `mask`, `filter`, `marker` et `marker-mid` portent un `<FuncIRI>` et ne sont
  // refusés AUJOURD'HUI que par leur nom (absents d'`ATTRIBUTS_AUTORISES`). Le
  // jour où un lot en admet un pour une famille de diagrammes neuve — une ligne —
  // sa valeur redeviendrait libre si personne ne l'inscrivait aussi dans
  // `ATTRIBUTS_FUNCIRI`. L'invariant s'assertionne donc ici.
  describe('le couplage ATTRIBUTS_AUTORISES → ATTRIBUTS_FUNCIRI', () => {
    /** Les noms dont la VALEUR peut porter un `<FuncIRI>` — admis ou non à ce jour. */
    const PORTEURS_DE_FUNCIRI = [
      'clip-path',
      'fill',
      'filter',
      'marker',
      'marker-end',
      'marker-mid',
      'marker-start',
      'mask',
      'stroke',
    ] as const;

    /** Relit les deux ensembles EXPORTÉS par l'analyseur, dans un processus fils. */
    function lireEnsembles(): { autorises: string[]; funcIri: string[] } {
      const script =
        `const m = await import(${JSON.stringify(MODULE)});` +
        `process.stdout.write('[[' + JSON.stringify({ ` +
        `autorises: [...m.ATTRIBUTS_AUTORISES], funcIri: [...m.ATTRIBUTS_FUNCIRI] }) + ']]');`;
      const resultat = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
        encoding: 'utf8',
        cwd: process.cwd(),
      });
      const capture = /\[\[([\s\S]*)]]/.exec(resultat.stdout ?? '');
      const charge = capture?.[1];
      if (charge === undefined) {
        throw new Error(`l’analyseur n’a pas rendu ses ensembles : ${resultat.stderr ?? ''}`);
      }
      return JSON.parse(charge) as { autorises: string[]; funcIri: string[] };
    }

    it(
      'tout attribut ADMIS porteur d’un FuncIRI voit sa valeur contrainte',
      () => {
        const { autorises, funcIri } = lireEnsembles();
        // TÉMOIN : sans lui, deux ensembles vides passeraient l'invariant en
        // silence — le vice exact de S-003 (un contrôle qui ne prouve pas avoir
        // regardé quelque chose ne garde rien).
        expect(funcIri.length).toBeGreaterThan(0);
        expect(funcIri).toContain('fill');
        expect(autorises).toContain('fill');
        // L'INVARIANT.
        const trous = PORTEURS_DE_FUNCIRI.filter(
          (nom) => autorises.includes(nom) && !funcIri.includes(nom),
        );
        expect(trous).toEqual([]);
      },
      DELAI,
    );

    it(
      'et aucun nom d’ATTRIBUTS_FUNCIRI n’y est mort — chacun est aussi admis',
      () => {
        // Le sens inverse : un nom contraint mais jamais admis serait du code
        // mort, donc une contrainte qui ne s'exécute sur rien.
        const { autorises, funcIri } = lireEnsembles();
        expect(funcIri.filter((nom) => !autorises.includes(nom))).toEqual([]);
      },
      DELAI,
    );
  });
});
