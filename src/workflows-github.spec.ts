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

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'yaml';

/** Forme minimale attendue — on ne modélise que ce qu'on vérifie. */
interface WorkflowAnalyse {
  name?: string;
  on?: unknown;
  jobs?: Record<string, { steps?: unknown[]; 'timeout-minutes'?: unknown }>;
}

/** Plafond de panne admissible pour un job, en minutes. Aucun job du dépôt n'approche cette
 * durée — le run nominal de `ci.yml` tient en ~2 min — mais un plafond n'est pas une cible : il
 * borne le SILENCE, pas le travail. Au-delà, on ne borne plus rien d'utile. */
const PLAFOND_TIMEOUT_MINUTES = 60;

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

    // 🔴 LA MOITIÉ QUI MANQUAIT, et sans elle le titre de ce test était FAUX. Vérifier que chaque
    // chemin listé existe ne prouve que le sens « liste → disque » ; le sens qui compte est
    // l'autre. Un quatrième workflow déposé dans le dossier n'était couvert par RIEN — ni par ce
    // gate, ni par celui des `timeout-minutes` ci-dessous, qui n'itère que sur cette liste en dur.
    // La promesse « aucun workflow ne vit hors de ce gate » se serait donc démentie toute seule au
    // premier fichier neuf, en silence (famille S-010 : portée promise ≠ portée balayée).
    const surLeDisque = readdirSync('.github/workflows')
      .filter((fichier) => /\.ya?ml$/.test(fichier))
      .sort();
    expect(
      surLeDisque,
      'un workflow vit dans `.github/workflows/` sans être listé dans WORKFLOWS : il échappe à ' +
        'tous les gates de ce fichier',
    ).toEqual(WORKFLOWS.map((chemin) => basename(chemin)).sort());
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

      // ⏱️ NÉ D'UNE PANNE RÉELLE, le 2026-08-19 (PR #22). L'étape d'installation du navigateur a
      // pendu : 53 min sur un essai, 12+ min sur le suivant, contre 2 min 12 s pour le run ENTIER
      // la veille. Aucun des trois workflows ne déclarait `timeout-minutes` — un job pendu court
      // donc jusqu'au plafond GitHub de six heures.
      //
      // CE QUE CE TEST MORD, ET POURQUOI IL EST ICI PLUTÔT QU'EN COMMENTAIRE. Le défaut ne rend
      // aucun run rouge : il rend un run ÉTERNEL. Rien ne le signale, ni au moment où on retire
      // la clef, ni au moment où on ajoute un job neuf sans elle — et c'est le mode d'échec le
      // plus coûteux du dépôt, parce qu'il consomme du temps HUMAIN (l'auteur attend un signal
      // qui ne viendra pas) et non de la machine. C'est très exactement la famille L-008/L-016 :
      // une garantie qui ne vit que dans un commentaire ne garantit rien. Elle vit donc ici.
      //
      // Le plafond haut est volontaire : ce test n'arbitre PAS la bonne durée de chaque job (elle
      // dépend de ce qu'il fait), il refuse l'ABSENCE de borne et les valeurs qui n'en sont pas.
      it('borne chacun de ses jobs par un « timeout-minutes » — aucun run ne peut pendre en silence', () => {
        const jobs = analyse.jobs ?? {};
        // Filet propre (L-019) : sans lui, un fichier sans `jobs:` ferait passer ce test avec une
        // boucle VIDE — vert en n'ayant mesuré aucun job. Le test frère plus haut l'attraperait,
        // mais un contrôle ne délègue pas sa propre validité à son voisin.
        expect(Object.keys(jobs).length, `${chemin} n'expose aucun job à borner`).toBeGreaterThan(0);
        for (const [nom, job] of Object.entries(jobs)) {
          const delai = job['timeout-minutes'];
          expect(
            delai,
            `le job « ${nom} » de ${chemin} n'a pas de « timeout-minutes » : pendu, il courrait ` +
              `six heures sans jamais rougir (incident du 2026-08-19)`,
          ).toBeTypeOf('number');
          expect(delai as number, `« timeout-minutes » du job « ${nom} » doit être positif`).
            toBeGreaterThan(0);
          expect(
            delai as number,
            `« timeout-minutes » du job « ${nom} » dépasse ${PLAFOND_TIMEOUT_MINUTES} min : ce ` +
              `n'est plus une borne de panne`,
          ).toBeLessThanOrEqual(PLAFOND_TIMEOUT_MINUTES);
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
 * style NON REVU, au moment de pression maximale (build rouge, cf. S-011). Le voici.
 *
 * 📈 13 → 14 le 2026-08-19 (E2-ST6, lot C2c). Le hachage de plus vient de la BASCULE DE ROUTE :
 * `PageAVenir` fournissait UN bloc `<style>` sur `cours/securite-web` ; il est remplacé par DEUX
 * — l'adaptateur de route `PageSommaireSecuriteWeb` (`.page`, 362 o) et le composant `Sommaire`
 * (`.vide`, 3 216 o). Net +1, et les deux ont été NOMMÉS avant d'être épinglés (mesure du
 * 2026-08-19 : 14 blocs distincts sur l'artéfact de fixture, 10 sur celui de production). Le
 * compte de hachages de SCRIPT reste à 1. ⚠️ La fixture porte pourtant DEUX leçons depuis le lot
 * B : la seconde est en `statut: brouillon` et n'est PAS prerendue (`leconsPubliees` filtre
 * `parametresDePrerender`), donc elle n'apporte aucun bloc.
 *
 * 📈 12 → 13 le 2026-08-19 (E2-ST5, lot b2). Le hachage de plus était le bloc `<style>` du
 * `SimulationComponent`, apparu quand l'ancre `[[simulation]]` a cessé de rendre le vide. Il a été
 * NOMMÉ avant d'être épinglé : la page de leçon de la fixture passe de 7 à 8 blocs `<style>`, et
 * le treizième bloc distinct de l'artéfact commence par `.simulation[_ngcontent-…]`. Aucune des
 * quatre autres pages prerendues n'a bougé, et le compte de hachages de SCRIPT reste à 1.
 * `NOMBRE_HACHAGES_STYLE_ATTENDU` (production, 9) ne bouge PAS : `content/` est vide, donc aucune
 * simulation n'est rendue en ligne. */
const HACHAGES_STYLE_CI_ATTENDU = 14;

/** Racine du cours réel. Tant qu'elle ne porte aucune leçon, le harnais de fixture est légitime. */
const RACINE_COURS_PRODUCTION = 'content/cours/securite-web';

/**
 * Les COMMANDES RÉELLEMENT EXÉCUTÉES, pas le texte brut du fichier. Un `grep` sur la source
 * confondrait un commentaire qui EXPLIQUE le drapeau avec un `run:` qui le POSE — et le
 * commentaire de `deploy.yml` en parle nommément, pour dire qu'il ne s'y emploie pas. On analyse,
 * puis on confronte (`.claude/rules/security.md` §4).
 */
function etapes(chemin: string): readonly { name?: string; run?: string; uses?: unknown }[] {
  const analyse = parse(readFileSync(chemin, 'utf8')) as WorkflowAnalyse;
  return Object.values(analyse.jobs ?? {}).flatMap(
    (job) => (job.steps ?? []) as { name?: string; run?: string; uses?: unknown }[],
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
//   · `ci.yml` passe bien `--hachages-style 13`, à la valeur près — sans quoi le compte retomberait
//     sur celui de la production et le gate rougirait à chaque run, avec la pression S-011 à la clef ;
//   · `deploy.yml` ne bascule PAS sur une racine de fixture, ne pose PAS ce drapeau, et exécute
//     encore `npm run build` : il publie, donc il construit ce qui part en ligne ;
//   · ⏳ ET IL SE PÉRIME TOUT SEUL — voir le dernier cas.
//
// ⏳ À RETIRER AVEC LE HARNAIS, à la clôture d'E3-ST1 (backlog §E2-ST2, réserve 4).
// =============================================================================

/**
 * Le slug de la leçon que les trois specs e2e de la page de leçon vont chercher.
 *
 * Écrit ici EN DUR, et c'est le point : ce fichier ne compile pas avec la suite e2e, donc il ne peut
 * pas importer la constante. C'est exactement ce qu'on veut (L-012) — un test qui importerait la
 * valeur qu'il contrôle ne prouverait que la cohérence d'un fichier avec lui-même.
 */
const SLUG_LECON_MESUREE_EN_E2E = 'lecon-temoin';

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

  // 🔴 CE TEST FERME LE DERNIER TROU DU SAUT DE `e2e/aides/artefact-mesure.ts`, ET LUI SEUL LE PEUT.
  // Depuis le déploiement rouge du 2026-08-18, les trois specs de la page de leçon se SAUTENT quand
  // l'artéfact mesuré ne porte pas cette page — c'est ce qui rend `deploy.yml` (racine de production,
  // `content/` vide) vert sans exiger que la fixture parte en ligne. Le saut est donc la seule chose
  // qui les empêche d'être rouges partout ; il faut par symétrie quelque chose qui les empêche d'être
  // SAUTÉS partout, et ce quelque chose ne peut pas vivre dans la suite e2e elle-même (un fichier
  // entièrement sauté ne peut pas s'assertionner).
  //
  // Le test voisin exige que la racine de fixture porte UNE leçon, n'importe laquelle. Ça ne suffit
  // pas : les specs visent une ROUTE, `/cours/securite-web/lecon-temoin/`, qui vient du nom du
  // dossier. Renommer la fixture laisserait ce gate-là vert, `ci.yml` prerendrait toujours une page
  // interactive — et les dix specs se sauteraient EN SILENCE des deux côtés, sans qu'un seul run ne
  // rougisse. Le gate le plus vide du dépôt, déplacé d'un cran (L-005/L-014).
  it('fait porter à la fixture de ci.yml la leçon dont les specs e2e attendent la ROUTE', () => {
    const racine = /--racine\s+(\S+)/.exec(ci)?.[1] ?? '';
    // Le slug est la moitié de fin du dossier `<nn>-<slug>`, et c'est lui qui devient la route.
    const slugs = existsSync(racine)
      ? readdirSync(racine, { withFileTypes: true })
          .filter((entree) => entree.isDirectory() && existsSync(join(racine, entree.name, 'lecon.md')))
          .map((entree) => entree.name.replace(/^\d+-/, ''))
      : [];
    expect(
      slugs,
      `la fixture « ${racine} » ne porte aucune leçon de slug « ${SLUG_LECON_MESUREE_EN_E2E} » — or c'est la route ` +
        `que visent e2e/parcours-clavier-quiz, e2e/quiz-pre-hydratation et e2e/quiz-sous-csp. Ils se sauteraient ` +
        `des DEUX côtés, en silence. Renommer la fixture impose de renommer la route dans les trois specs.`,
    ).toContain(SLUG_LECON_MESUREE_EN_E2E);
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

// =============================================================================
// LA PORTÉE DU SCEAU D'ARTÉFACT EST-ELLE ENCORE PLEINE ? (lot C, dette sécurité pré-E3-ST1)
// -----------------------------------------------------------------------------
// CE QUE LE LOT C A CORRIGÉ. `rendre-mermaid.mjs` impose à `mmdc` le Chromium de Playwright ; la
// compilation de `content/` exigeait donc ce binaire — téléchargé d'un CDN, hors du contrôle
// d'intégrité de `package-lock.json` — et devait précéder lint/test/build. L'installation avait
// donc été remontée AVANT la construction de `dist/`, et le sceau posé après `npm run build` ne
// couvrait plus que la fenêtre construction → téléversement. La parade est un JOB PROPRE
// (`contenu`) qui compile et transmet ses sorties ; `gates` bâtit alors `dist/` sur une machine
// vierge de binaire CDN, et n'installe le navigateur qu'APRÈS le sceau, pour G-e2e.
//
// CE QUE CE BLOC MORD, ET POURQUOI IL EST EXÉCUTABLE PLUTÔT QU'ÉCRIT. La régression est d'une
// facilité redoutable : il suffit de remonter trois lignes d'installation pour « réparer » un
// build rouge, et RIEN ne rougirait — le sceau continuerait de se poser et de se vérifier, en ne
// surveillant qu'une fenêtre amputée. C'est la famille L-008/L-016 (une garantie qui ne vit que
// dans un commentaire ne garantit rien) et le patron S-009 (une justification ne doit jamais
// promettre plus que ce qui est appliqué) : le commentaire du workflow affirme cette portée, ces
// tests sont ce qui la rend vraie.
//
// ⚠️ CE QU'ILS NE MORDENT PAS, dit ici pour ne pas les surestimer : ils prouvent une TOPOLOGIE,
// pas une innocuité. `gates` consomme les sorties de `contenu`, et un SVG empoisonné y serait
// scellé de bonne foi. Ce reliquat est traité par l'analyseur à liste blanche de
// `rendre-mermaid.mjs`, pas ici.
// =============================================================================

describe('la portée du sceau d’artéfact de deploy.yml (lot C)', () => {
  const analyseSceau = parse(readFileSync('.github/workflows/deploy.yml', 'utf8')) as {
    jobs?: Record<string, { needs?: unknown; steps?: { name?: string; run?: string }[] }>;
  };
  const jobsSceau = Object.entries(analyseSceau.jobs ?? {});
  const INSTALLATION_NAVIGATEUR = /npm run e2e:install:navigateur(?![:\w-])/;

  // Filet propre (L-019) : sans lui, un `jobs:` absent rendrait VERTES toutes les boucles
  // ci-dessous en n'ayant mesuré aucun job.
  it('expose des jobs à inspecter', () => {
    expect(jobsSceau.length, 'deploy.yml n’expose aucun job').toBeGreaterThan(0);
  });

  it('fait compiler `content/` par un job SÉPARÉ de celui qui bâtit `dist/`', () => {
    const compilent = jobsSceau
      .filter(([, job]) =>
        (job.steps ?? []).some((etape) => /npm run content:build(?![:\w-])/.test(etape.run ?? '')),
      )
      .map(([nom]) => nom);
    const batissent = jobsSceau
      .filter(([, job]) => (job.steps ?? []).some((etape) => (etape.name ?? '').startsWith('G-build')))
      .map(([nom]) => nom);
    expect(compilent, 'aucun job de deploy.yml ne compile `content/`').not.toEqual([]);
    expect(batissent, 'aucun job de deploy.yml ne porte G-build').not.toEqual([]);
    // L'intersection doit être VIDE : un job qui ferait les deux porterait le navigateur avant la
    // construction, et la portée réduite serait de retour.
    expect(
      compilent.filter((nom) => batissent.includes(nom)),
      'le même job compile `content/` ET bâtit `dist/` : il exécute donc le Chromium de `mmdc` ' +
        'avant la construction, et le sceau retombe à la portée réduite que le lot C a corrigée',
    ).toEqual([]);
  });

  // ⚠️ CE TEST NE SE LAISSE PAS SAUTER NON PLUS (L-019, même vice que son voisin ci-dessous). Il
  // bouclait sur TOUS les jobs et passait au suivant quand G-build n'y était pas : un renommage de
  // l'étape `G-build` aurait donc vidé la boucle et rendu ce test VERT sans mesurer un seul job.
  // Il part maintenant de la liste FILTRÉE, et exige qu'elle ne soit pas vide.
  it('n’installe AUCUN navigateur avant G-build dans le job qui bâtit `dist/`', () => {
    const batisseurs = jobsSceau.filter(([, job]) =>
      (job.steps ?? []).some((etape) => (etape.name ?? '').startsWith('G-build')),
    );
    expect(
      batisseurs.map(([nom]) => nom),
      'aucun job de deploy.yml ne porte d’étape dont le nom commence par « G-build » : la fenêtre ' +
        'avant construction n’a pas pu être mesurée (l’étape a-t-elle été renommée ?)',
    ).not.toEqual([]);
    for (const [nom, job] of batisseurs) {
      const etapes = job.steps ?? [];
      const rangBuild = etapes.findIndex((etape) => (etape.name ?? '').startsWith('G-build'));
      const avant = etapes
        .slice(0, rangBuild)
        .filter((etape) => INSTALLATION_NAVIGATEUR.test(etape.run ?? ''))
        .map((etape) => etape.name ?? '(sans nom)');
      expect(
        avant,
        `le job « ${nom} » installe le navigateur AVANT G-build : le binaire CDN s'exécute donc ` +
          `sur la machine qui bâtit \`dist/\`, en amont du sceau. Cette installation appartient au ` +
          `job « contenu », ou à une étape POSTÉRIEURE au sceau.`,
      ).toEqual([]);
    }
  });

  // ⚠️ CE TEST NE SE LAISSE PAS SAUTER. Une première version bouclait sur les jobs et passait au
  // suivant quand elle ne trouvait pas d'étape de scellement — un simple RENOMMAGE du sceau
  // l'aurait donc rendu VERT en n'ayant rien mesuré (L-019, le vice de la boucle vide). Il part
  // maintenant du job qui porte G-build, et EXIGE d'y trouver le sceau.
  it('installe le navigateur APRÈS le sceau — donc dans la fenêtre qu’il surveille', () => {
    const batisseurs = jobsSceau.filter(([, job]) =>
      (job.steps ?? []).some((etape) => (etape.name ?? '').startsWith('G-build')),
    );
    expect(batisseurs.map(([nom]) => nom), 'aucun job de deploy.yml ne porte G-build').not.toEqual(
      [],
    );
    for (const [nom, job] of batisseurs) {
      const etapes = job.steps ?? [];
      const rangSceau = etapes.findIndex((etape) => (etape.name ?? '').startsWith('Sceller'));
      expect(
        rangSceau,
        `le job « ${nom} » bâtit \`dist/\` sans étape de scellement dont le nom commence par ` +
          `« Sceller » : le sceau a disparu, ou son nom a changé sans que ce test le suive`,
      ).not.toBe(-1);
      const rangInstallation = etapes.findIndex((etape) =>
        INSTALLATION_NAVIGATEUR.test(etape.run ?? ''),
      );
      expect(
        rangInstallation,
        `le job « ${nom} » scelle l'artéfact mais n'installe jamais le navigateur : G-e2e ne ` +
          `pourrait pas démarrer`,
      ).not.toBe(-1);
      expect(
        rangInstallation,
        `dans « ${nom} », l'installation du navigateur précède le sceau : elle échappe donc à ce ` +
          `que le sceau prouve`,
      ).toBeGreaterThan(rangSceau);
    }
  });

  // ===========================================================================================
  // LA FENÊTRE PRÉ-SCEAU — LISTE BLANCHE NOMINATIVE, JAMAIS LISTE NOIRE (MAJEUR 2 de la revue)
  // -------------------------------------------------------------------------------------------
  // Les tests ci-dessus tiennent la TOPOLOGIE (quel job compile, quel job bâtit, dans quel ordre).
  // Celui-ci tient le CONTENU de la seule fenêtre qui échappe par construction au sceau : tout ce
  // que `gates` exécute AVANT « Sceller ». Ce qui s'y glisse s'exécute sur la machine qui bâtit
  // `dist/`, en amont de la seule empreinte qui prouve que `dist/` n'a pas bougé.
  //
  // 🔴 LE TROU QUE CE BLOC BOUCHE. Le garde-fou d'installation n'appariait que
  // `/npm run e2e:install:navigateur/` sur `etape.run`. QUATRE écritures rétablissaient donc la
  // portée réduite du sceau en laissant les quatre tests VERTS — mesuré, pas supposé :
  //   · `run: npx playwright install chromium`
  //   · `run: node_modules/.bin/playwright install chromium`
  //   · n'importe quel `uses:` placé avant G-build (une action tierce s'exécute, elle aussi, sur
  //     cette machine — et rien dans le dépôt n'interdisait de l'y poser)
  //
  // 🔴 LE CINQUIÈME CONTOURNEMENT, TROUVÉ PAR DEUX CONTRE-REVUES INDÉPENDANTES (2026-08-19) — et
  // c'est celui qui vidait la garantie centrale du lot. La liste blanche épinglait les NOMS ;
  // le CORPS des étapes `run:` n'était couvert par rien. Rejoué avant correctif :
  // `G-lint.run = "npx playwright install chromium && npm run lint"` ⇒ **32 tests VERTS**, zéro
  // anomalie. Une étape légitime, gardée à son nom légitime, exécutait n'importe quoi sur la
  // machine qui bâtit `dist/`. Le critère qui manquait n'était donc pas « refuser les commandes
  // d'installation » (ce serait la liste noire que ce dépôt a payée sept fois) mais : TOUTE
  // MODIFICATION DE CE QUI S'EXÉCUTE DANS CETTE FENÊTRE DOIT DEVENIR VISIBLE EN REVUE.
  // La signature d'une étape porte donc désormais l'EMPREINTE de tout ce que l'étape emporte —
  // `run`, `uses`, `with`, `env`, `shell`… — tout sauf son `name`, qui n'est que documentation.
  // Et aucun autre test du dépôt ne les refusait : les garde-fous de `pipeline-contenu-
  // orchestration.spec.ts` épinglent `e2e:install:deps` et le script COMBINÉ, pas un
  // `playwright install` brut.
  //
  // POURQUOI UNE LISTE BLANCHE, ET PAS « quelques commandes d'installation de plus » : une liste
  // noire ne refuse que ce que son auteur a imaginé — c'est le patron S-001/S-003/S-009/S-014 que
  // ce dépôt a déjà payé six fois (`.claude/rules/security.md` §4). On énumère donc ce qui est
  // REVU, en ordre, et tout le reste échoue en se nommant.
  //
  // ⚠️ CE TEST EST DÉLIBÉRÉMENT FRAGILE, et c'est sa fonction. Ajouter une étape légitime avant le
  // sceau le fait rougir : c'est le point. La liste ci-dessous est une décision de sécurité, elle
  // se met à jour par une REVUE, pas au fil d'un correctif. Un mainteneur pressé qui la « répare »
  // en la dérivant du fichier annulerait tout ce bloc (patron S-005 : une liste dérivée autorise
  // ce que personne n'a vu).
  // ===========================================================================================

  /** Ce qu'on lit d'une étape — `uses` compris, que le type du bloc parent n'expose pas. L'index
   * ouvert n'est pas de la paresse : l'empreinte ci-dessous doit couvrir TOUT ce que l'étape
   * emporte (`with`, `env`, `shell`, `working-directory`…), y compris une clef qu'aucun lot
   * n'a encore employée. Une empreinte qui ne couvrirait que les clefs déclarées ici laisserait
   * `env: NODE_OPTIONS: --require ./charge.js` passer sans bruit. */
  interface EtapeWorkflow {
    name?: string;
    run?: string;
    uses?: string;
    [autreClef: string]: unknown;
  }
  interface JobWorkflow {
    needs?: unknown;
    steps?: EtapeWorkflow[];
  }

  /** Un document `deploy.yml` FRAIS à chaque appel : les mutants du contrôle positif écrivent
   * dedans, et deux tests ne doivent pas se passer un document déjà muté. */
  function documentDeploy(): Record<string, JobWorkflow> {
    const analyse = parse(readFileSync('.github/workflows/deploy.yml', 'utf8')) as {
      jobs?: Record<string, JobWorkflow>;
    };
    return analyse.jobs ?? {};
  }

  /**
   * Sérialisation CANONIQUE d'une valeur analysée depuis le YAML : clefs triées (un simple
   * réordonnancement des clefs ne doit pas rougir), chaînes normalisées CRLF → LF puis `trimEnd()`
   * — `deploy.yml` est en CRLF sur le poste de développement (L-015) et une fin de ligne n'est pas
   * un changement de ce qui s'exécute.
   */
  function canonique(valeur: unknown): string {
    if (valeur === null || typeof valeur !== 'object') {
      return JSON.stringify(
        typeof valeur === 'string' ? valeur.replace(/\r\n/g, '\n').trimEnd() : valeur,
      );
    }
    if (Array.isArray(valeur)) return `[${valeur.map(canonique).join(',')}]`;
    const entrees = Object.entries(valeur as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entrees.map(([clef, v]) => `${JSON.stringify(clef)}:${canonique(v)}`).join(',')}}`;
  }

  /** L'empreinte de TOUT ce qu'une étape emporte, SAUF son `name:` — celui-ci est la légende, il
   * est déjà épinglé en clair par la signature. */
  function empreinteEtape(etape: EtapeWorkflow): string {
    const emporte: Record<string, unknown> = { ...etape };
    delete emporte['name'];
    return createHash('sha256').update(canonique(emporte)).digest('hex').slice(0, 12);
  }

  /**
   * La signature d'une étape : ce qui l'IDENTIFIE en clair, plus l'empreinte de ce qu'elle
   * EXÉCUTE. Pour une étape `uses:`, l'identité en clair est l'ACTION — son `name:` n'est que de
   * la documentation, et un renommage ne change rien à ce qui tourne. Pour une étape `run:`, c'est
   * son nom.
   *
   * 🔴 POURQUOI UNE EMPREINTE, ET PAS LE NOM SEUL (correctif du 2026-08-19). Le nom seul laissait
   * réécrire librement le corps d'une étape revue — mesuré, greffe verte sur 32 tests. Trois voies
   * ont été pesées :
   *   · une liste NOIRE de commandes d'installation — REFUSÉE, et c'est la faute que ce dépôt a
   *     payée sept fois : elle ne refuse que ce que son auteur a imaginé (S-001/S-003/S-009/S-014) ;
   *   · le corps VERBATIM dans la liste — le plus lisible, mais « Déballer les sorties compilées »
   *     fait 50 lignes de shell : le dupliquer ici invite exactement la « réparation » par
   *     dérivation que ce bloc interdit ;
   *   · l'EMPREINTE, retenue. Elle est NOMINATIVE (les 11 valeurs ci-dessous sont des littéraux
   *     revus, jamais recalculés depuis le fichier — patron S-005), elle refuse TOUT ce qui n'est
   *     pas exactement le corps revu plutôt qu'une liste de motifs, et elle force la mise à jour à
   *     apparaître dans le MÊME diff que la modification de `deploy.yml`, sous les yeux d'un
   *     relecteur. Son seul défaut — une empreinte ne se relit pas — est compensé par le message
   *     d'échec, qui IMPRIME le corps trouvé.
   */
  function signature(etape: EtapeWorkflow): string {
    const uses = String(etape.uses ?? '');
    const identite = uses !== '' ? `uses ${uses}` : `run « ${etape.name ?? '(sans nom)'} »`;
    return `${identite} sha256:${empreinteEtape(etape)}`;
  }

  /** La fenêtre pré-sceau du job `gates`, revue le 2026-08-19. Ordonnée : un déplacement compte.
   * Chaque empreinte est un LITTÉRAL REVU : elle ne se met à jour qu'avec le diff de `deploy.yml`
   * sous les yeux, jamais en la recopiant depuis la sortie du test. */
  const FENETRE_AVANT_SCEAU_REVUE: readonly string[] = [
    'uses actions/checkout@v7 sha256:60ca15f023a2',
    'uses actions/setup-node@v7 sha256:5d380d42b3f2',
    // 📌 2796a1ab1439 → 901c052f9cea le 2026-08-19 : le corps passe de `npm ci` à
    // `npm ci --ignore-scripts` (SonarCloud githubactions:S6505). Revu — le drapeau RÉDUIT ce que
    // l'étape exécute, elle ne lance plus les scripts de cycle de vie des dépendances dans la
    // fenêtre pré-sceau. Raisonnement mesuré au point d'appel, `deploy.yml` job `contenu`.
    'run « Installer (verrouillé) » sha256:901c052f9cea',
    'uses actions/download-artifact@v7 sha256:299c81e63a50',
    'run « Déballer les sorties compilées » sha256:a6ceff83511d',
    'run « G-lint » sha256:9b77b20f69fa',
    'run « G-typage-outils » sha256:77a76afa12cf',
    'run « G-contraste » sha256:7a6eb7f7346b',
    'run « G-glyphes » sha256:810657eb61c1',
    'run « G-test » sha256:2b5fa5189a85',
    'run « G-build (+ config SWA à hachages) » sha256:44d96178c110',
  ];

  /** Les SEULES actions admises avant le sceau. Redondant avec la liste ordonnée ci-dessus, et
   * volontairement : un `uses:` neuf mérite un message qui parle de chaîne d'approvisionnement,
   * pas un diff de liste. */
  const ACTIONS_REVUES_AVANT_SCEAU = new Set([
    'actions/checkout@v7',
    'actions/setup-node@v7',
    'actions/download-artifact@v7',
  ]);

  /**
   * Les anomalies de la fenêtre pré-sceau — liste vide = conforme. Prend les jobs en PARAMÈTRE,
   * pour que le contrôle positif puisse lui soumettre des mutants (L-019 : un garde-fou qu'aucun
   * cas fautif ne traverse est une intention, pas un gate).
   */
  function anomaliesFenetreAvantSceau(jobs: Record<string, JobWorkflow>): readonly string[] {
    const batisseurs = Object.entries(jobs).filter(([, job]) =>
      (job.steps ?? []).some((etape) => (etape.name ?? '').startsWith('G-build')),
    );
    if (batisseurs.length === 0) {
      return ['aucun job ne porte G-build : la fenêtre pré-sceau n’a pas pu être mesurée'];
    }

    const anomalies: string[] = [];
    for (const [nom, job] of batisseurs) {
      const etapes = job.steps ?? [];
      const rangSceau = etapes.findIndex((etape) => (etape.name ?? '').startsWith('Sceller'));
      if (rangSceau === -1) {
        anomalies.push(
          `le job « ${nom} » bâtit \`dist/\` sans étape « Sceller… » : toute la fenêtre échappe au sceau`,
        );
        continue;
      }

      const fenetre = etapes.slice(0, rangSceau);
      for (const etape of fenetre) {
        const uses = String(etape.uses ?? '');
        if (uses !== '' && !ACTIONS_REVUES_AVANT_SCEAU.has(uses)) {
          anomalies.push(
            `le job « ${nom} » exécute l'action « ${uses} » (étape « ${etape.name ?? '(sans nom)'} ») ` +
              `AVANT le sceau : du code tiers tourne donc sur la machine qui bâtit \`dist/\`, hors de ` +
              `la fenêtre surveillée. Cette action appartient au job « contenu », ou à une étape ` +
              `POSTÉRIEURE au sceau.`,
          );
        }
      }

      const trouvee = fenetre.map(signature);
      if (trouvee.join(' ') !== FENETRE_AVANT_SCEAU_REVUE.join(' ')) {
        // Le premier écart, isolé puis imprimé. Le cas le plus vicieux — celui que le correctif
        // du 2026-08-19 ferme — est celui où le NOM tient et où le CORPS a changé : la seule
        // chose qui bouge alors est une empreinte, et une empreinte ne se relit pas. On imprime
        // donc, dans ce cas-là, ce que l’étape exécute désormais.
        const ecart = Math.max(
          0,
          trouvee.findIndex((sig, i) => sig !== FENETRE_AVANT_SCEAU_REVUE[i]),
        );
        const attendue = FENETRE_AVANT_SCEAU_REVUE[ecart] ?? '(rien : la fenêtre s’est allongée)';
        const obtenue = trouvee[ecart] ?? '(rien : la fenêtre s’est raccourcie)';
        const memeIdentite = attendue.split(' sha256:')[0] === obtenue.split(' sha256:')[0];
        const etapeEcart = fenetre[ecart];
        const corpsTrouve =
          memeIdentite && etapeEcart !== undefined
            ? `
  ⚠️ le NOM tient, le CORPS a changé — c’est ce qui s’EXÉCUTE qui a bougé :
  ` +
              canonique({ ...etapeEcart, name: undefined })
            : '';
        anomalies.push(
          `la fenêtre pré-sceau du job « ${nom} » : premier écart au rang ${ecart + 1} — ` +
            `« ${attendue} » → « ${obtenue} ».${corpsTrouve}`,
        );
        anomalies.push(
          `la fenêtre pré-sceau du job « ${nom} » ne correspond plus à la liste blanche revue.\n` +
            `  revue  : ${FENETRE_AVANT_SCEAU_REVUE.join(' | ')}\n` +
            `  trouvée: ${trouvee.join(' | ')}`,
        );
      }
    }
    return anomalies;
  }

  it('n’exécute, AVANT le sceau, que les étapes de la liste blanche revue', () => {
    expect(
      anomaliesFenetreAvantSceau(documentDeploy()),
      'la fenêtre pré-sceau a changé. Si l’étape ajoutée est légitime, elle se REVOIT (que ' +
        'fait-elle sur la machine qui bâtit `dist/` ? peut-elle écrire dedans ?) puis s’inscrit ' +
        'dans FENETRE_AVANT_SCEAU_REVUE. Ne jamais dériver cette liste du fichier.',
    ).toEqual([]);
  });

  it('CONTRÔLE POSITIF — les trois contournements de l’ancien garde-fou sont refusés, en se nommant', () => {
    const contournements: readonly (readonly [string, EtapeWorkflow, string])[] = [
      [
        'npx playwright install',
        { name: 'Préparer le navigateur', run: 'npx playwright install chromium' },
        'Préparer le navigateur',
      ],
      [
        'le binaire de node_modules/.bin',
        { name: 'Préparer le navigateur', run: 'node_modules/.bin/playwright install chromium' },
        'Préparer le navigateur',
      ],
      ['une action tierce', { name: 'Restaurer un cache', uses: 'actions/cache@v4' }, 'actions/cache@v4'],
    ];

    for (const [etiquette, mutant, repere] of contournements) {
      // TÉMOIN — l'ancien prédicat ne voit RIEN de ces trois-là. Sans cette ligne, on ne saurait
      // pas si la liste blanche apporte quelque chose ou si elle double une garde existante.
      expect(
        INSTALLATION_NAVIGATEUR.test(mutant.run ?? ''),
        `le contournement « ${etiquette} » est vu par l'ancien prédicat : le témoin ne prouve plus rien`,
      ).toBe(false);

      const jobs = documentDeploy();
      const etapes = jobs['gates']?.steps ?? [];
      const rangBuild = etapes.findIndex((etape) => (etape.name ?? '').startsWith('G-build'));
      expect(rangBuild, 'le job « gates » n’expose plus G-build : le mutant ne peut pas être posé').
        toBeGreaterThan(-1);
      etapes.splice(rangBuild, 0, mutant);

      const anomalies = anomaliesFenetreAvantSceau(jobs);
      expect(
        anomalies,
        `le contournement « ${etiquette} » passe la liste blanche : la portée réduite du sceau se ` +
          `réinstalle en silence`,
      ).not.toEqual([]);
      expect(
        anomalies.join('\n'),
        `le contournement « ${etiquette} » est refusé sans être NOMMÉ — un refus muet ne dit pas ` +
          `quoi corriger`,
      ).toContain(repere);
    }
  });

  it('CONTRÔLE POSITIF — le CORPS d’une étape revue ne peut plus changer en silence', () => {
    // Le cinquième contournement, celui que deux contre-revues ont trouvé indépendamment : garder
    // le NOM d'une étape légitime et réécrire ce qu'elle exécute. Mesuré AVANT ce correctif :
    // 32 tests verts, zéro anomalie.
    const jobs = documentDeploy();
    const etapes = jobs['gates']?.steps ?? [];
    const rangLint = etapes.findIndex((etape) => etape.name === 'G-lint');
    expect(rangLint, 'le job « gates » n’expose plus d’étape « G-lint »').toBeGreaterThan(-1);

    const original: EtapeWorkflow = etapes[rangLint] ?? {};
    const greffe: EtapeWorkflow = {
      ...original,
      run: `npx playwright install chromium && ${String(original.run ?? '').trim()}`,
    };

    // TÉMOIN — la signature d'AVANT le correctif (le nom seul) ne voit rien de cette greffe. Sans
    // cette ligne, on ne saurait pas si l'empreinte apporte quelque chose ou si elle double une
    // garde existante (L-019).
    const identite = (etape: EtapeWorkflow): string =>
      String(etape.uses ?? '') !== ''
        ? `uses ${String(etape.uses)}`
        : `run « ${etape.name ?? '(sans nom)'} »`;
    expect(
      identite(greffe),
      'le témoin ne prouve plus rien : la greffe change déjà l’identité en clair de l’étape',
    ).toBe(identite(original));
    expect(
      INSTALLATION_NAVIGATEUR.test(greffe.run ?? ''),
      'la greffe est vue par l’ancien prédicat d’installation : le témoin ne prouve plus rien',
    ).toBe(false);

    etapes[rangLint] = greffe;
    const anomalies = anomaliesFenetreAvantSceau(jobs);
    expect(
      anomalies,
      'le corps de « G-lint » a été réécrit et la liste blanche l’accepte : une installation de ' +
        'navigateur peut donc s’exécuter avant le sceau sous un nom d’étape irréprochable',
    ).not.toEqual([]);
    expect(
      anomalies.join('\n'),
      'le changement de corps est refusé sans que l’étape soit NOMMÉE — un refus muet ne dit pas ' +
        'où regarder',
    ).toContain('G-lint');
  });

  it('fait dépendre le job de construction du job de compilation', () => {
    const gates = analyseSceau.jobs?.['gates'];
    expect(gates, 'deploy.yml n’a plus de job « gates »').toBeDefined();
    expect(
      JSON.stringify(gates?.needs ?? null),
      'le job « gates » ne dépend plus de « contenu » : il bâtirait `dist/` sans les sorties du ' +
        'pipeline, donc sur une erreur Sass qui ne nomme pas sa cause',
    ).toContain('contenu');
  });

  // ===========================================================================================
  // LE PRÉCHAUFFAGE DU CACHE MERMAID — RELIER LA LISTE TENUE À LA MAIN AUX FIXTURES
  // -------------------------------------------------------------------------------------------
  // 🔴 LE DÉFAUT QUE CES DEUX TESTS FERMENT, et pourquoi il était sournois : le script
  // `content:mermaid:prechauffer` (package.json) énumère ses racines À LA MAIN. Ajouter une
  // fixture à diagramme, ou en déplacer une, ne faisait rougir RIEN au moment de la faute. La
  // panne surgissait deux étapes plus loin, dans `gates`, sous la forme « Chromium de Playwright
  // introuvable » — c'est-à-dire en accusant Playwright, le mauvais coupable, et en suggérant
  // exactement le geste interdit (installer un navigateur dans le job qui bâtit `dist/`).
  //
  // Les deux moitiés se tiennent :
  //   1. COUVERTURE — toute fixture portant un bloc ` ```mermaid ` vit sous une racine préchauffée.
  //   2. COMPTE — le minimum exigé par `deploy.yml` (aux DEUX bouts, émission et déballage) est
  //      DÉRIVÉ de ces fixtures, jamais recopié. Le nombre de blocs ne suffit pas : deux sources
  //      IDENTIQUES partagent une clef de cache (`clefCache` indexe une SOURCE, pas une
  //      occurrence — L-026). On compte donc les sources DISTINCTES, normalisées comme le fait
  //      `rendre-mermaid.mjs` : CRLF ramenés en LF, `trim()`, saut final (L-015, poste Windows).
  // ===========================================================================================

  const RACINE_FIXTURES = 'tools/content-pipeline/__fixtures__';

  /** Le module de production qui recense les leçons ET extrait les diagrammes. */
  const RENDRE_MERMAID = pathToFileURL(
    join(process.cwd(), 'tools', 'content-pipeline', 'rendre-mermaid.mjs'),
  ).href;

  /** Le module charge Playwright et le compilateur Markdown à l'import : c'est lent, pas infini. */
  const DELAI_RECENSEMENT = 60_000;

  let fixturesMemoisees: { chemin: string; sources: string[] }[] | undefined;

  /**
   * Les `lecon.md` à diagramme, avec leurs sources de diagrammes normalisées.
   *
   * 🔴 LES DEUX MOITIÉS VIENNENT DU CODE DE PRODUCTION — `recenserFichiersLecon` et
   * `extraireDiagrammes`, tous deux exportés par `tools/content-pipeline/rendre-mermaid.mjs`. Les
   * réimplémenter ici serait une dérivation, et une dérivation peut diverger DES DEUX CÔTÉS À LA
   * FOIS : la copie qui vivait ici ignorait le suffixe d'info-string que la production accepte
   * (` ```mermaid foo `). Un diagramme neuf écrit sous cette forme aurait été compté par le
   * pipeline et ignoré par ce test — l'attendu serait resté le même, le test serait resté VERT, et
   * le minimum `attendu=<n>` de `deploy.yml` aurait cessé de couvrir le cache réellement exigé.
   * Un test qui n'exécute pas le code de production ne prouve rien de ce code.
   *
   * POURQUOI PAR PROCESSUS FILS, ET NON PAR `import` — même raison que
   * `analyseur-svg-references.spec.ts` et `pipeline-contenu-orchestration.spec.ts` :
   * `rendre-mermaid.mjs` est un `.mjs` vérifié par le TROISIÈME programme
   * (`tsconfig.tools.json`, Node pur) ; l'importer d'ici le ferait entrer dans
   * `tsconfig.spec.json`, qui n'a ni `allowJs` ni les types Node de l'outillage.
   * ⚠️ Sur Windows, un `import()` dynamique exige une URL `file://` — d'où `pathToFileURL`.
   */
  function fixturesADiagramme(): { chemin: string; sources: string[] }[] {
    if (fixturesMemoisees !== undefined) return fixturesMemoisees;
    const script =
      `const { readFileSync } = await import('node:fs');` +
      `const m = await import(${JSON.stringify(RENDRE_MERMAID)});` +
      `const trouves = m.recenserFichiersLecon(${JSON.stringify(RACINE_FIXTURES)})` +
      `.map((chemin) => ({ chemin: chemin.replaceAll('\\\\', '/'),` +
      ` sources: m.extraireDiagrammes(readFileSync(chemin, 'utf8')) }))` +
      `.filter((f) => f.sources.length > 0);` +
      `process.stdout.write(JSON.stringify(trouves));`;
    const resultat = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8',
      cwd: process.cwd(),
    });
    expect(
      resultat.status,
      'le recensement des fixtures à diagramme a échoué — il passe par `recenserFichiersLecon` et ' +
        '`extraireDiagrammes` de `tools/content-pipeline/rendre-mermaid.mjs`, dont les exports ont ' +
        `peut-être changé :\n${resultat.stderr ?? ''}`,
    ).toBe(0);
    fixturesMemoisees = JSON.parse(resultat.stdout) as { chemin: string; sources: string[] }[];
    return fixturesMemoisees;
  }

  /** Les racines que `content:mermaid:prechauffer` passe à `--racine`, en séparateurs POSIX. */
  function racinesPrechauffees(): string[] {
    const paquet = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts?: Record<string, string>;
    };
    const script = paquet.scripts?.['content:mermaid:prechauffer'];
    expect(
      script,
      'le script npm « content:mermaid:prechauffer » a disparu de package.json : le job « contenu » ' +
        'de deploy.yml l’appelle, et sans lui `gates` rappellerait `mmdc` sans Chromium',
    ).toBeTypeOf('string');
    return [...String(script).matchAll(/--racine\s+(\S+)/g)].map((m) =>
      String(m[1] ?? '')
        .replaceAll('\\', '/')
        .replace(/\/+$/, ''),
    );
  }

  // Le recensement passe par un processus fils qui importe `rendre-mermaid.mjs` (Playwright et le
  // compilateur Markdown au chargement) : on le paie UNE fois ici, hors du délai par défaut des
  // `it`, et les deux tests ci-dessous lisent ensuite la mémoïsation.
  beforeAll(() => {
    fixturesADiagramme();
  }, DELAI_RECENSEMENT);

  it('fait couvrir CHAQUE fixture à diagramme par `content:mermaid:prechauffer`', () => {
    const racines = racinesPrechauffees();
    expect(
      racines,
      'le script « content:mermaid:prechauffer » ne passe aucune racine à `--racine` : il ne ' +
        'préchauffe donc rien, et le job `gates` de deploy.yml rappellerait `mmdc` sans Chromium',
    ).not.toEqual([]);

    const porteuses = fixturesADiagramme();
    // Filet propre (L-019) : si plus aucune fixture ne portait de diagramme, la boucle ci-dessous
    // serait vide et ce test passerait VERT sans avoir mesuré la moindre couverture.
    expect(
      porteuses.map(({ chemin }) => chemin),
      `aucune fixture sous ${RACINE_FIXTURES} ne porte de bloc \`\`\`mermaid : soit elles ont ` +
        `disparu, soit l'extraction de ce test ne les reconnaît plus`,
    ).not.toEqual([]);

    const decouvertes = porteuses
      .map(({ chemin }) => chemin)
      .filter((chemin) => !racines.some((racine) => chemin.startsWith(`${racine}/`)));
    expect(
      decouvertes,
      `ces fixtures portent un diagramme Mermaid et ne vivent sous AUCUNE racine de ` +
        `« content:mermaid:prechauffer » (package.json) : leur socle SVG ne sera pas mis en cache ` +
        `par le job « contenu » de deploy.yml, donc \`content:build\` rappellera \`mmdc\` dans ` +
        `« gates », qui n'a aucun Chromium — et le message d'échec accusera Playwright. ` +
        `Ajouter « --racine <dossier> » au script pour chacune :\n${decouvertes.join('\n')}`,
    ).toEqual([]);
  });

  it('dérive des fixtures le minimum d’entrées de cache exigé aux DEUX bouts de deploy.yml', () => {
    const racines = racinesPrechauffees();
    const couvertes = fixturesADiagramme().filter(({ chemin }) =>
      racines.some((racine) => chemin.startsWith(`${racine}/`)),
    );
    const distinctes = new Set(couvertes.flatMap(({ sources }) => sources));
    expect(
      distinctes.size,
      'aucune source de diagramme distincte n’a été recensée sous les racines préchauffées : le ' +
        'minimum ci-dessous ne mesurerait rien',
    ).toBeGreaterThan(0);

    /** Le littéral `attendu=<n>` d'une étape nommée, ou `undefined`. */
    const minimumDe = (job: string, debutDuNom: string): number | undefined => {
      const etape = (analyseSceau.jobs?.[job]?.steps ?? []).find((e) =>
        (e.name ?? '').startsWith(debutDuNom),
      );
      const trouve = /^\s*attendu=(\d+)\s*$/m.exec(etape?.run ?? '');
      return trouve === null ? undefined : Number(trouve[1]);
    };

    // LES DEUX BOUTS, et c'est le point : le préchauffage EXIGE ce minimum avant d'empaqueter, le
    // déballage le RÉEXIGE après transfert. Un seul des deux laisserait l'autre moitié muette —
    // c'est exactement l'état que la revue a trouvé (le compte était `echo`é, jamais comparé).
    for (const [job, debutDuNom] of [
      ['contenu', 'Préchauffer le cache Mermaid'],
      ['gates', 'Déballer les sorties compilées'],
    ] as const) {
      expect(
        minimumDe(job, debutDuNom),
        `l'étape « ${debutDuNom}… » du job « ${job} » de deploy.yml n'exige pas le bon minimum de ` +
          `cache Mermaid. Deux causes, et le message vaut pour les deux : soit la ligne ` +
          `« attendu=<n> » a disparu (reçu « undefined » — le compte n'est alors plus COMPARÉ à ` +
          `quoi que ce soit, et un cache déplacé ou vide passerait en silence), soit les fixtures ` +
          `portent désormais ${distinctes.size} source(s) de diagramme DISTINCTE(S) et le ` +
          `littéral du workflow est resté en arrière — le cache transféré serait alors trop ` +
          `petit, et « gates » rappellerait « mmdc » sans Chromium`,
      ).toBe(distinctes.size);
    }
  });
});

// =============================================================================
// LE JOB QUI DÉTIENT LE JETON — deux garanties qui ne vivent QU'EN LIGNE
// -----------------------------------------------------------------------------
// `publication` est le seul job du dépôt qui voit `secrets.AZURE_STATIC_WEB_APPS_API_TOKEN`.
// Rien de ce qu'il fait n'est reproductible en local : ni le déploiement, ni les vérifications
// qui suivent. Ses deux garanties structurelles ne peuvent donc être tenues que par une lecture
// du workflow — c'est ce que fait ce bloc, et c'est pour ça qu'il existe.
//
//   1. La CSP servie est comparée STRUCTURELLEMENT. Retirer l'appel au comparateur laisserait
//      les contrôles par motifs en place, le déploiement vert, et personne ne verrait que la
//      seule vérification capable d'attraper une directive ajoutée a disparu (L-005/S-003).
//      ⚠️ L'INVERSE N'EST PAS VRAI, et c'est le piège à ne pas tendre au prochain mainteneur :
//      le comparateur ne lit QUE l'en-tête `Content-Security-Policy`. Il subsume les contrôles
//      par motifs DE CSP — pas ceux des quatre en-têtes hors CSP (`strict-transport-security`,
//      `x-content-type-options`, `referrer-policy`, `permissions-policy`) ni le `max-age=` de
//      HSTS, dont ces motifs restent la SEULE couverture. Les supprimer en croyant retirer un
//      doublon laisserait passer un `Permissions-Policy: camera=*` servi.
//   2. L'action de déploiement est ÉPINGLÉE AU SHA. Un tag est mutable : repointer `v1` dans le
//      dépôt amont ferait s'exécuter du code neuf, avec le jeton de déploiement en variable
//      d'environnement, sans qu'aucune revue de PR ne voie quoi que ce soit changer.
// =============================================================================
describe('deploy.yml — les deux garanties du job qui détient le jeton, lues sur le workflow entier', () => {
  const DEPLOY = '.github/workflows/deploy.yml';

  /**
   * Tous les `uses:` du workflow, dans l'ordre — le `run:` seul ne les voit pas.
   *
   * Balaie TOUS les jobs, pas seulement `publication` : c'est volontaire et c'est plus strict.
   * Une action de déploiement déplacée dans un autre job continuerait de recevoir le jeton, et
   * un filtre par nom de job la rendrait invisible à l'exigence d'épinglage au SHA.
   */
  function utilisations(chemin: string): readonly string[] {
    return etapes(chemin)
      .map((etape) => String(etape.uses ?? ''))
      .filter((valeur) => valeur !== '');
  }

  it('appelle le comparateur structurel de CSP, avec ses TROIS documents', () => {
    // On lit la commande RÉELLEMENT exécutée, pas le texte du fichier : le commentaire de l'étape
    // nomme le script pour l'expliquer, et un `grep` confondrait les deux (même patron que
    // `etapes()` plus haut, `.claude/rules/security.md` §4).
    const run = runDeLEtape(DEPLOY, 'Vérifier les en-têtes servis');
    expect(
      run,
      "l'étape ne lance plus `verifier-csp-servie.mjs` : la CSP servie n'est de nouveau vérifiée que par MOTIFS, et une directive entière ajoutée passerait verte",
    ).toContain('tools/deploiement/verifier-csp-servie.mjs');

    // Les trois documents, chacun pour une raison distincte : sans `--source`, la comparaison ne
    // vaut plus que « le servi égale le généré » — et un générateur fautif resterait invisible.
    for (const argument of ['--entetes', '--artefact', '--source']) {
      expect(run, `l'appel au comparateur a perdu ${argument}`).toContain(argument);
    }
    expect(
      run,
      'le comparateur ne reçoit plus la SOURCE VERSIONNÉE — le seul des trois documents qu’un humain relit en revue',
    ).toContain('config/staticwebapp.config.source.json');
  });

  it("épingle l'action de déploiement à un SHA de commit, jamais à un tag mutable", () => {
    const deploiements = utilisations(DEPLOY).filter((valeur) =>
      valeur.startsWith('Azure/static-web-apps-deploy@'),
    );
    expect(deploiements, "l'action de déploiement a disparu de deploy.yml").toHaveLength(1);
    expect(
      deploiements[0],
      "`Azure/static-web-apps-deploy` est référencée par un tag ou une branche — donc par une référence MUTABLE, dans le job qui détient le jeton de déploiement. Épingler au SHA de commit du tag visé.",
    ).toMatch(/^Azure\/static-web-apps-deploy@[0-9a-f]{40}$/);
  });
});

// =============================================================================
// AUCUN `npm ci` DE WORKFLOW N'EXÉCUTE DE SCRIPT DE CYCLE DE VIE
// -----------------------------------------------------------------------------
// Constat SonarCloud `githubactions:S6505`, tombé sur le `npm ci` du job `contenu` de `deploy.yml`
// : sans `--ignore-scripts`, les scripts `preinstall`/`install`/`postinstall`/`prepare` des
// dépendances s'exécutent pendant l'installation, avec les droits du runner et sans qu'aucun humain
// ne les ait revus. Le raisonnement mesuré qui rend le drapeau sans coût est écrit au point d'appel
// (`deploy.yml`, job `contenu`) ; ce test est ce qui l'empêche de se démentir en silence.
//
// POURQUOI UN TEST ET PAS UNE SIMPLE CORRECTION. Le drapeau se retire en une frappe, et rien dans
// le dépôt ne le remarquerait : SonarCloud n'analyse que le NOUVEAU code, donc une ligne rétablie
// dans un fichier déjà analysé ne rouvrirait aucun constat. Un garde-fou que rien n'exécute est une
// intention, pas un gate (famille L-019).
//
// PORTÉE — les TROIS workflows, pas seulement celui que l'outil a pointé. Corriger le seul `npm ci`
// signalé fermerait la porte qualité sans améliorer la posture. Et le compte plancher ci-dessous
// est la moitié qui manquerait autrement : un test qui n'inspecte QUE ce qu'il trouve passe vert
// sur zéro occurrence — le jour où une refonte renomme les étapes, il jurerait que tout va bien en
// n'ayant rien regardé (famille S-010 : portée promise ≠ portée balayée).
//
// ⚠️ On analyse le YAML, on ne `grep` pas le fichier : le commentaire de `deploy.yml` contient le
// texte `npm ci` ET le texte `--ignore-scripts`, et une regex sur la source les confondrait avec
// les commandes réellement exécutées (`.claude/rules/security.md` §4).
// =============================================================================
describe('les `npm ci` des workflows', () => {
  /** Un `npm ci` réellement exécuté, avec de quoi le nommer dans un message d'échec. */
  interface InstallationReperee {
    readonly workflow: string;
    readonly etape: string;
    readonly segment: string;
  }

  /**
   * Les invocations de `npm ci` de tous les workflows. On découpe chaque bloc `run:` en segments de
   * commande (`\n`, `&&`, `||`, `;`) pour que le drapeau soit exigé sur LA commande qui installe —
   * un `--ignore-scripts` posé sur une commande voisine de la même étape ne compterait pas.
   */
  const installations: readonly InstallationReperee[] = WORKFLOWS.flatMap((workflow) =>
    etapes(workflow).flatMap((etape) =>
      String(etape.run ?? '')
        .split(/\n|&&|\|\||;/)
        .map((segment) => segment.trim())
        .filter((segment) => /(^|\s)npm\s+ci(\s|$)/.test(segment))
        .map((segment) => ({ workflow, etape: etape.name ?? '(étape sans nom)', segment })),
    ),
  );

  // Relevé le 2026-08-19 : `ci.yml` (job unique) + `deploy.yml` (jobs `contenu` et `gates`).
  // `infra.yml` n'installe rien, et `publication` non plus — c'est voulu et documenté au point
  // d'appel. Ce plancher n'est pas une valeur à ajuster machinalement : un `npm ci` qui DISPARAÎT
  // est une information, un `npm ci` qui APPARAÎT doit passer par ce gate.
  const INSTALLATIONS_ATTENDUES = 3;

  it('sont au nombre attendu — le gate ne peut pas passer en n’inspectant rien', () => {
    expect(
      installations.map((i) => `${i.workflow} → ${i.etape}`),
      'le nombre de `npm ci` dans les workflows a changé. Si c’est voulu, ajuster ' +
        'INSTALLATIONS_ATTENDUES *et* vérifier que le nouveau porte `--ignore-scripts`.',
    ).toHaveLength(INSTALLATIONS_ATTENDUES);
  });

  it('portent TOUS `--ignore-scripts` — aucun script de cycle de vie au `npm ci`', () => {
    const sansDrapeau = installations.filter(
      (installation) => !/(^|\s)--ignore-scripts(\s|$)/.test(installation.segment),
    );

    expect(
      sansDrapeau.map(
        (installation) =>
          `${installation.workflow} → étape « ${installation.etape} » : ${installation.segment}`,
      ),
      'un `npm ci` de workflow s’exécute SANS `--ignore-scripts` : les scripts de cycle de vie des ' +
        'dépendances tournent avec les droits du runner (SonarCloud githubactions:S6505). Le ' +
        'raisonnement mesuré est au point d’appel, dans deploy.yml, job `contenu`.',
    ).toEqual([]);
  });
});
