// =============================================================================
// Les workflows GitHub sont-ils du YAML LISIBLE ? (E2-ST1, lot 5)
// -----------------------------------------------------------------------------
// POURQUOI CE TEST EXISTE — et il a été écrit le jour où sa faute a été payée.
//
// Le 2026-08-16, une étape de `deploy.yml` a été renommée en :
//
//     - name: Sceller l'artéfact (portée : construction → téléversement)
//
// En YAML, dans un scalaire **non quoté**, la séquence « `:` suivie d'une
// espace » ouvre une **clef de mapping**. Le fichier est devenu illisible d'un
// bout à l'autre — et GitHub n'a pas dit « erreur de syntaxe ligne N ». Il a
// créé un run en **échec instantané (0 s)** intitulé « This run likely failed
// because of a workflow file issue », **sur un push de branche de
// fonctionnalité que le déclencheur `branches: [main]` du fichier n'aurait
// jamais dû viser** : ne sachant plus lire `on:`, GitHub ne peut plus décider de
// ne pas exécuter. Le symptôme ne désigne donc ni le fichier fautif, ni la
// ligne, ni même le bon déclencheur.
//
// CE QUE CE GATE MORD, ET CE QU'IL NE MORD PAS. Il prouve que les trois
// workflows **se parsent** et gardent leur forme (des jobs, des étapes, des
// déclencheurs). Il ne dit rien de ce qu'ils FONT — les assertions sur l'ordre
// des étapes vivent dans `pipeline-contenu-orchestration.spec.ts` et
// `configuration-typescript.spec.ts`, et elles n'ont pas vu passer celle-ci
// parce qu'elles lisent le fichier au MOTIF : une regex trouve encore
// `content:build` dans un fichier que plus aucun analyseur ne sait lire.
//
// POURQUOI UN VRAI ANALYSEUR, ET PAS UNE REGEX qui chercherait « un `: ` dans un
// `name:` non quoté » : ce serait exactement l'anti-patron que le dépôt vient
// d'interdire (S-009, `.claude/rules/security.md` §4 — on analyse, puis on
// confronte). Une regex n'attraperait que la forme de la faute déjà vue.
//
// `yaml` est déclaré en devDependency EXPRÈS, alors qu'il était déjà dans
// l'arbre par `vite` et `@azure/static-web-apps-cli` : un test qui s'appuie sur
// une dépendance TRANSITIVE casse le jour où l'un de ces deux-là change d'avis,
// et le message ne parlerait pas de workflows. ISC, gratuit, sans clé, aucun
// téléchargement neuf — il était déjà installé.
// =============================================================================

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

/** Forme minimale attendue — on ne modélise que ce qu'on vérifie. */
interface WorkflowAnalyse {
  name?: string;
  on?: unknown;
  jobs?: Record<string, { steps?: unknown[] }>;
}

const WORKFLOWS = [
  '.github/workflows/ci.yml',
  '.github/workflows/deploy.yml',
  '.github/workflows/infra.yml',
] as const;

describe('les workflows GitHub', () => {
  // Garde-fou de complétude : si un quatrième workflow apparaît, il doit entrer
  // dans cette liste — sinon il ne serait couvert par rien, ce qui est
  // précisément la situation que ce fichier répare.
  it('sont TOUS listés ici — aucun workflow ne vit hors de ce gate', () => {
    for (const chemin of WORKFLOWS) {
      expect(existsSync(chemin), `${chemin} est listé mais absent du dépôt`).toBe(true);
    }
  });

  for (const chemin of WORKFLOWS) {
    describe(chemin, () => {
      let analyse: WorkflowAnalyse;

      beforeAll(() => {
        // Si le fichier est illisible, `parse` lève ICI, avec la ligne et la
        // colonne — c'est tout ce que GitHub ne nous donnait pas.
        analyse = parse(readFileSync(chemin, 'utf8')) as WorkflowAnalyse;
      });

      it('se parse en YAML valide', () => {
        expect(analyse).toBeTypeOf('object');
        expect(analyse).not.toBeNull();
      });

      // `on` est le piège classique du YAML 1.1 : le mot y est un BOOLÉEN, donc
      // la clef peut arriver sous `true` au lieu de `'on'`. On accepte les deux,
      // mais on exige qu'elle EXISTE — un workflow sans déclencheur ne tourne
      // jamais, en silence.
      it('déclare au moins un déclencheur', () => {
        const declencheurs = analyse.on ?? (analyse as Record<string, unknown>)['true'];
        expect(declencheurs, `${chemin} n'a aucune clef « on: »`).toBeDefined();
        expect(Object.keys(declencheurs as object).length).toBeGreaterThan(0);
      });

      it('porte au moins un job, et chaque job au moins une étape', () => {
        const jobs = analyse.jobs ?? {};
        expect(Object.keys(jobs).length).toBeGreaterThan(0);
        for (const [nom, job] of Object.entries(jobs)) {
          expect(Array.isArray(job.steps), `le job « ${nom} » n'a pas de liste « steps »`).toBe(
            true,
          );
          expect((job.steps ?? []).length, `le job « ${nom} » n'a aucune étape`).toBeGreaterThan(0);
        }
      });
    });
  }
});

// =============================================================================
// LE HARNAIS DE LEÇON INTERACTIVE EST-IL ENCORE CÂBLÉ ? (E2-ST3, lot E-b2)
// -----------------------------------------------------------------------------
// Décision E-2 : `ci.yml` bâtit son artéfact depuis la FIXTURE TÉMOIN, parce que
// `content/` est vide jusqu'à E3-ST1 et qu'un artéfact sans page de leçon rend
// G-axe, G-e2e et le générateur de CSP aveugles au premier composant interactif
// du site. Un harnais est exactement le genre de chose qui se décâble en silence
// (L-007, L-019) : le chemin de la fixture peut être renommé par un lot de
// contenu, et le drapeau `--hachages-style` peut disparaître dans une résolution
// de conflit — dans les deux cas, la CI resterait VERTE en ayant cessé de
// regarder ce qu'elle a été câblée pour voir.
//
// CE QUE CE BLOC MORD :
//   · le chemin de fixture nommé dans `ci.yml` EXISTE réellement sur le disque ;
//   · `ci.yml` passe bien un `--hachages-style <entier>` — sans quoi le compte
//     retomberait sur celui de la production et le gate rougirait à chaque run,
//     avec la pression S-011 à la clef ;
//   · `deploy.yml` ne bascule PAS sur la fixture et ne pose PAS ce drapeau : il
//     publie, donc il construit ce qui part en ligne.
//
// ⏳ À RETIRER AVEC LE HARNAIS, à la clôture d'E3-ST1.
// =============================================================================

/** Le compte de hachages `style-src` épinglé dans `ci.yml`, RECOPIÉ ICI EN DUR — jamais lu du YAML
 * qu'il vérifie. La duplication EST le garde-fou : côté production, `NOMBRE_HACHAGES_STYLE_ATTENDU`
 * (9) a déjà son miroir dans `config-swa-provenance-style.spec.ts`, donc le bouger coûte deux
 * fichiers et une revue ; la valeur de CI n'avait pas ce miroir, et passer 12 → 13 dans `ci.yml`
 * ne faisait rougir personne — alors que c'est exactement l'écriture qui autorise un hachage de
 * style NON REVU, au moment de pression maximale (build rouge, cf. S-011). Le voici. */
const HACHAGES_STYLE_CI_ATTENDU = 12;

/** Racine du cours réel. Tant qu'elle ne porte aucune leçon, le harnais de fixture est légitime. */
const RACINE_COURS_PRODUCTION = 'content/cours/securite-web';

/**
 * Les COMMANDES RÉELLEMENT EXÉCUTÉES, pas le texte brut du fichier. Un `grep` sur la source
 * confondrait un commentaire qui EXPLIQUE le drapeau avec un `run:` qui le POSE — et le
 * commentaire de `deploy.yml` en parle nommément, pour dire qu'il ne s'y emploie pas. On analyse,
 * puis on confronte (`.claude/rules/security.md` §4).
 */
function etapes(chemin: string): readonly { name?: string; run?: string }[] {
  const analyse = parse(readFileSync(chemin, 'utf8')) as WorkflowAnalyse;
  return Object.values(analyse.jobs ?? {}).flatMap(
    (job) => (job.steps ?? []) as { name?: string; run?: string }[],
  );
}

/** Toutes les commandes d'un workflow, concaténées. */
function commandes(chemin: string): string {
  return etapes(chemin)
    .map((etape) => String(etape.run ?? ''))
    .join('\n');
}

/** Le bloc `run:` de l'unique étape dont le nom commence par `prefixe`. Lève si elle manque. */
function runDeLEtape(chemin: string, prefixe: string): string {
  const trouvees = etapes(chemin).filter((e) => (e.name ?? '').startsWith(prefixe));
  if (trouvees.length !== 1) {
    throw new Error(
      `${chemin} : ${trouvees.length} étape(s) nommée(s) « ${prefixe}… » — il en faut exactement une`,
    );
  }
  return String(trouvees[0]?.run ?? '');
}

/** Les leçons RÉELLEMENT publiées sous `content/cours/securite-web/` (gabarit `<nn>-<slug>/lecon.md`). */
function leconsPubliees(): readonly string[] {
  if (!existsSync(RACINE_COURS_PRODUCTION)) return [];
  return readdirSync(RACINE_COURS_PRODUCTION, { withFileTypes: true })
    .filter((entree) => entree.isDirectory())
    .map((entree) => join(RACINE_COURS_PRODUCTION, entree.name, 'lecon.md'))
    .filter((chemin) => existsSync(chemin));
}

const ci = commandes('.github/workflows/ci.yml');
const deploiement = commandes('.github/workflows/deploy.yml');

// =============================================================================
// « G-BUILD DE ci.yml » EST-IL ENCORE « npm run build », DÉPLIÉ ?
// -----------------------------------------------------------------------------
// `ci.yml` ne peut plus appeler `npm run build` : le script compile la racine de PRODUCTION, et la
// décision E-2 exige un artéfact bâti sur la fixture témoin. Il DÉPLIE donc les trois commandes du
// script — et jusqu'ici, personne ne gardait l'équivalence.
//
// LE MODE D'ÉCHEC, ET IL EST SÉRIEUX. Une PR qui retire `&& npm run config:swa` du script `build`
// passe la CI VERTE : la CI, elle, appelle `config:swa` explicitement. Puis `deploy.yml` exécute le
// VRAI script, produit un `dist/` SANS `staticwebapp.config.json`, et PUBLIE. Seule la vérification
// « en-têtes servis », APRÈS le déploiement, rougit : le site est en ligne sans CSP ni en-têtes
// pendant toute la fenêtre. Symétrique pour un ajout : une 4ᵉ commande au script resterait hors de
// la CI, la PR verte, et `deploy.yml` rougirait après fusion sur une cause qui semblera étrangère.
//
// CE QUE CE BLOC MORD : même NOMBRE de segments, même ORDRE, et chaque ligne de `ci.yml` porte la
// cible du segment npm de même rang — modulo les paramètres propres au harnais (`--racine`,
// `--hachages-style`) et le préfixe `npx`, qui appelle le MÊME binaire de `node_modules/.bin`.
//
// ⚠️ CE QU'IL MORD AUSSI, ET QUI EST MOINS VISIBLE : les crochets npm. Un `precontent:build` ou un
// `prebuild` ajouté un jour à `package.json` serait exécuté par `npm run build` (donc par
// `deploy.yml`) et SAUTÉ par le dépliage de `ci.yml` — une divergence que le comptage de segments
// ne peut pas voir, puisqu'aucun segment n'apparaît. Ils sont donc interdits nommément.
// =============================================================================

describe('G-build de ci.yml ≡ `npm run build` déplié (décision E-2)', () => {
  const scripts = (
    JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string> }
  ).scripts;

  /** Les segments de `scripts.build`, dans l'ordre — la référence. */
  const segmentsNpm = String(scripts?.['build'] ?? '')
    .split('&&')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  /** Les commandes dépliées de G-build, dans l'ordre — ce qui doit lui correspondre. */
  const lignesCi = runDeLEtape('.github/workflows/ci.yml', 'G-build')
    .split('\n')
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne.length > 0);

  /**
   * Ce qu'une ligne de `ci.yml` doit contenir pour valoir le segment npm de même rang. Un
   * `npm run <nom>` vaut par son NOM (la CI peut l'appeler tel quel, avec des paramètres après
   * `--`) ou par la CIBLE de son corps (le `.mjs` qu'il lance, que la CI invoque alors
   * directement). Une commande qui n'est pas un `npm run` ne vaut que par elle-même — d'où
   * `npx ng build` ⊇ `ng build`, et non l'inverse.
   */
  function empreintes(segment: string): readonly string[] {
    const nom = /^npm run ([\w:.-]+)$/.exec(segment)?.[1];
    if (nom === undefined) return [segment];
    const corps = scripts?.[nom];
    if (corps === undefined) {
      throw new Error(`scripts.build appelle « npm run ${nom} », absent de package.json`);
    }
    return [nom, /(\S+\.mjs)/.exec(corps)?.[1] ?? corps];
  }

  it('déplie AUTANT de commandes que `scripts.build` a de segments, dans le même ordre', () => {
    expect(segmentsNpm.length, 'scripts.build est vide ou illisible').toBeGreaterThan(0);
    expect(
      lignesCi,
      `divergence entre les deux workflows :\n` +
        `  · package.json → npm run build : ${segmentsNpm.join(' · ')}\n` +
        `  · ci.yml       → G-build       : ${lignesCi.join(' · ')}\n` +
        `Tout segment présent d'un seul côté part en ligne sans avoir été vu par la CI (ou l'inverse).`,
    ).toHaveLength(segmentsNpm.length);
  });

  it('fait porter à chaque commande dépliée la cible du segment npm de même rang', () => {
    expect(segmentsNpm.length).toBeGreaterThan(0);
    segmentsNpm.forEach((segment, rang) => {
      const ligne = lignesCi[rang] ?? '';
      const attendues = empreintes(segment);
      expect(
        attendues.some((empreinte) => ligne.includes(empreinte)),
        `rang ${rang + 1} : « ${segment} » (package.json) n'a pas d'équivalent dans « ${ligne} » (ci.yml) — ` +
          `attendu l'une de : ${attendues.join(' | ')}`,
      ).toBe(true);
    });
  });

  it('n’autorise aucun crochet npm que le dépliage sauterait en silence', () => {
    const crochets = ['prebuild', 'postbuild'].concat(
      segmentsNpm.flatMap((segment) => {
        const nom = /^npm run ([\w:.-]+)$/.exec(segment)?.[1];
        return nom === undefined ? [] : [`pre${nom}`, `post${nom}`];
      }),
    );
    expect(crochets.length).toBeGreaterThan(2);
    for (const crochet of crochets) {
      expect(
        scripts?.[crochet],
        `« ${crochet} » existe : \`npm run build\` (deploy.yml) l'exécuterait, le dépliage de ci.yml le sauterait`,
      ).toBeUndefined();
    }
  });
});

// =============================================================================
// LE HARNAIS DE LEÇON INTERACTIVE EST-IL ENCORE CÂBLÉ ? (E2-ST3, lot E-b2)
// -----------------------------------------------------------------------------
// Décision E-2 : `ci.yml` bâtit son artéfact depuis la FIXTURE TÉMOIN, parce que
// `content/` est vide jusqu'à E3-ST1 et qu'un artéfact sans page de leçon rend
// G-axe, G-e2e et le générateur de CSP aveugles au premier composant interactif
// du site. Un harnais est exactement le genre de chose qui se décâble en silence
// (L-007, L-019) : le chemin de la fixture peut être renommé par un lot de
// contenu, et le drapeau `--hachages-style` peut disparaître dans une résolution
// de conflit — dans les deux cas, la CI resterait VERTE en ayant cessé de
// regarder ce qu'elle a été câblée pour voir.
//
// CE QUE CE BLOC MORD :
//   · le chemin de fixture nommé dans `ci.yml` porte réellement une `lecon.md` — un dossier vide
//     existe aussi, et ne prerenderait aucune page ;
//   · `ci.yml` passe bien `--hachages-style 12`, à la valeur près — sans quoi le compte retomberait
//     sur celui de la production et le gate rougirait à chaque run, avec la pression S-011 à la clef ;
//   · `deploy.yml` ne bascule PAS sur une racine de fixture, ne pose PAS ce drapeau, et exécute
//     encore `npm run build` : il publie, donc il construit ce qui part en ligne ;
//   · ⏳ ET IL SE PÉRIME TOUT SEUL — voir le dernier cas.
//
// ⏳ À RETIRER AVEC LE HARNAIS, à la clôture d'E3-ST1 (backlog §E2-ST2, réserve 4).
// =============================================================================

describe('le harnais de leçon interactive (décision E-2)', () => {
  it('nomme dans ci.yml une racine de fixture qui porte vraiment une leçon', () => {
    const racine = /--racine\s+(\S+)/.exec(ci)?.[1];
    expect(racine, 'aucun « --racine » exécuté par ci.yml : le harnais a été décâblé').toBeDefined();
    // `existsSync` sur le dossier ne suffit pas : une racine qui existe SANS leçon laisserait ce
    // gate vert tout en prerendant zéro page interactive — exactement le trou que le harnais bouche.
    const lecons = existsSync(racine ?? '')
      ? readdirSync(racine ?? '', { withFileTypes: true })
          .filter((entree) => entree.isDirectory())
          .map((entree) => join(racine ?? '', entree.name, 'lecon.md'))
          .filter((chemin) => existsSync(chemin))
      : [];
    expect(
      lecons.length,
      `ci.yml compile « ${racine ?? ''} », qui ne porte aucune « lecon.md » — la CI ne prerendrait plus de page de leçon`,
    ).toBeGreaterThan(0);
  });

  it('passe dans ci.yml le compte de hachages de style épinglé, à la valeur près', () => {
    const compte = /--hachages-style\s+(\S+)/.exec(ci)?.[1];
    expect(compte, 'aucun « --hachages-style » exécuté par ci.yml').toBeDefined();
    expect(compte ?? '').toMatch(/^\d+$/);
    expect(
      Number(compte),
      `ci.yml autorise ${String(compte)} hachages de style, ce fichier en a revu ${HACHAGES_STYLE_CI_ATTENDU} : ` +
        `mettre à jour les DEUX, après passe du security-reviewer (S-002, S-011) — jamais le YAML seul.`,
    ).toBe(HACHAGES_STYLE_CI_ATTENDU);
  });

  it('laisse deploy.yml sur la racine de production, sans drapeau de compte', () => {
    // Le JETON `--racine <chemin>`, pas la sous-chaîne « __fixtures__ » : câbler un jour
    // `content:valider:fixtures` dans `deploy.yml` — ce que L-007 réclame — rougirait ce test pour
    // une raison qui n'a rien à voir avec la racine de construction.
    const racines = [...deploiement.matchAll(/--racine\s+(\S+)/g)].map((trouve) => trouve[1] ?? '');
    expect(
      racines.filter((racine) => racine.includes('__fixtures__')),
      'deploy.yml construit depuis une fixture : ce qui serait PUBLIÉ ne serait pas le contenu réel',
    ).toEqual([]);
    expect(deploiement).not.toContain('--hachages-style');
    expect(
      runDeLEtape('.github/workflows/deploy.yml', 'G-build').trim(),
      'deploy.yml doit rester sur `npm run build` — c’est lui qui construit ce qui part en ligne',
    ).toBe('npm run build');
  });

  // ⏳ LE TRIPWIRE DE PÉREMPTION — il vaut mieux que trois rappels en prose.
  // Le harnais masque le vrai `content/` : le jour où une leçon y est publiée, le laisser en place
  // ferait auditer une fixture à la place du contenu réel, sans que rien ne l'annonce. C'est le
  // patron `mentionChantier` / L-007, que ce dépôt a déjà payé. Une règle qui s'auto-périme bat une
  // note qu'il faut penser à relire : ce cas rougit tout seul le jour J, et son correctif est le
  // retrait du harnais (backlog §E2-ST2, réserve 4).
  it('se retire de lui-même dès que `content/` porte une vraie leçon', () => {
    const publiees = leconsPubliees();
    if (publiees.length === 0) {
      // Tant qu'aucune leçon n'existe, le harnais est légitime — et doit être là.
      expect(ci, 'le harnais a disparu alors que `content/` est encore vide').toMatch(/--racine\s/);
      return;
    }
    expect(
      ci,
      `${publiees.length} leçon(s) publiée(s) sous ${RACINE_COURS_PRODUCTION} (${publiees.join(', ')}) : ` +
        `LE HARNAIS A FAIT SON TEMPS et masque désormais le contenu réel. Le retirer — G-build de ci.yml ` +
        `redevient \`npm run build\`, \`--hachages-style\` disparaît, et ce describe avec.`,
    ).not.toMatch(/--racine\s/);
  });
});
