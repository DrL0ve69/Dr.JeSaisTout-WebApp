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
import { basename, join } from 'node:path';
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

  it('n’installe AUCUN navigateur avant G-build dans le job qui bâtit `dist/`', () => {
    for (const [nom, job] of jobsSceau) {
      const etapes = job.steps ?? [];
      const rangBuild = etapes.findIndex((etape) => (etape.name ?? '').startsWith('G-build'));
      if (rangBuild === -1) continue;
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

  it('fait dépendre le job de construction du job de compilation', () => {
    const gates = analyseSceau.jobs?.['gates'];
    expect(gates, 'deploy.yml n’a plus de job « gates »').toBeDefined();
    expect(
      JSON.stringify(gates?.needs ?? null),
      'le job « gates » ne dépend plus de « contenu » : il bâtirait `dist/` sans les sorties du ' +
        'pipeline, donc sur une erreur Sass qui ne nomme pas sa cause',
    ).toContain('contenu');
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
