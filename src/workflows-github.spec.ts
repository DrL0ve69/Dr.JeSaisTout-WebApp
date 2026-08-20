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

/**
 * Racine du cours réel. Le harnais de fixture qui la doublait a été RETIRÉ le 2026-08-20, à la
 * clôture d'E3-ST1 : les deux workflows bâtissent désormais depuis ici. Le compte de hachages de
 * style qui lui correspond vit dans `src/config-swa-provenance-style.spec.ts` — il n'y a plus
 * qu'un seul artéfact, donc plus qu'un seul compte à relire.
 */
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

/**
 * Les `lecon.md` PRÉSENTES sous `content/cours/securite-web/` (gabarit `<nn>-<slug>/lecon.md`).
 *
 * ⚠️ Le nom dit « présentes » et non « publiées », parce que ce prédicat ne regarde PAS `statut`
 * — il s'appelait `leconsPubliees()` et mentait sur ce qu'il mesurait. Le filtre de statut vit
 * dans `capacitesPubliees()`, où il compte réellement. Ici, la question est plus large et plus
 * bête : `content/` a-t-il disparu (filet L-019) ?
 */
function leconsPresentes(): readonly string[] {
  if (!existsSync(RACINE_COURS_PRODUCTION)) return [];
  return readdirSync(RACINE_COURS_PRODUCTION, { withFileTypes: true })
    .filter((entree) => entree.isDirectory())
    .map((entree) => join(RACINE_COURS_PRODUCTION, entree.name, 'lecon.md'))
    .filter((chemin) => existsSync(chemin));
}

const ci = commandes('.github/workflows/ci.yml');
const deploiement = commandes('.github/workflows/deploy.yml');

// =============================================================================
// `npm run build` ENCHAÎNE-T-IL ENCORE SES TROIS SEGMENTS ?
// -----------------------------------------------------------------------------
// ✅ CE BLOC A RÉTRÉCI LE 2026-08-20, ET C'EST UNE BONNE NOUVELLE. Il gardait l'ÉQUIVALENCE
// entre `npm run build` et les trois commandes que `ci.yml` dépliait à sa place — un dépliage
// rendu nécessaire par la décision E-2, qui exigeait un artéfact bâti sur la fixture témoin.
// Le harnais est retiré (clôture d'E3-ST1) : `ci.yml` appelle de nouveau le VRAI script, donc
// l'équivalence n'a plus rien à garder, et les crochets npm (`prebuild`…) ne peuvent plus être
// sautés d'un côté puisqu'il n'y a plus qu'un côté.
//
// CE QUI RESTE À GARDER, ET QUI EST RÉEL. Le script `build` est ce que les DEUX workflows
// exécutent : si `&& npm run config:swa` en disparaissait, `dist/` partirait en ligne SANS
// `staticwebapp.config.json` — donc sans CSP et sans en-têtes de sécurité — et seule la
// vérification « en-têtes servis », APRÈS le déploiement, rougirait. Le site serait public et
// nu pendant toute la fenêtre. Le contenu du script est donc une LISTE BLANCHE ORDONNÉE, revue
// à la main ici (S-018 : on énumère ce qui est permis, dans l'ordre, jamais ce qui est interdit).
// =============================================================================

/**
 * Les segments que `scripts.build` doit enchaîner, DANS CET ORDRE — recopiés en dur, jamais
 * dérivés du `package.json` qu'ils vérifient (L-012). Bouger cette liste, c'est décider de
 * changer ce que la publication exécute : la revue est le point.
 */
const SEGMENTS_DE_BUILD = ['npm run content:build', 'ng build', 'npm run config:swa'] as const;

/**
 * 🔴 LE CORPS EXACT des deux scripts que `build` appelle — la surface que ce bloc ne gardait PAS,
 * et par laquelle tout revenait (S-018, 6ᵉ occurrence, constatée le 2026-08-20).
 *
 * Épingler `npm run config:swa` comme SEGMENT ne dit rien de ce que ce segment EXÉCUTE. Tant que
 * le garde-fou ne portait que sur les `run:` des workflows, un
 * `"config:swa": "node tools/deploiement/generer-config-swa.mjs --hachages-style 20"` posé dans
 * `package.json` passait TOUS les gates — rien ne lisait `scripts['config:swa']` — et desserrait
 * une autorisation CSP dans les deux workflows à la fois. Le corps du script npm est le maillon
 * entre le workflow et l'outil : c'est une liste blanche NOMINATIVE, revue à la main, en `toBe`.
 *
 * ⚠️ `toBe`, jamais `toContain` : un `toContain` laisserait passer tout ce qu'on APPEND.
 */
const CORPS_DE_SCRIPT_REVUS: Readonly<Record<string, string>> = {
  'content:build': 'node tools/content-pipeline/build.mjs',
  'config:swa': 'node tools/deploiement/generer-config-swa.mjs',
};

/**
 * 🔴 LES CROCHETS npm, INTERDITS AUTOUR DE LA CHAÎNE DE PUBLICATION — restaurés le 2026-08-20
 * (ils avaient disparu avec un `describe` devenu obsolète, or le risque, lui, n'a pas disparu).
 *
 * npm exécute `pre<nom>` et `post<nom>` AUTOUR de chaque script, sans qu'aucun workflow ne les
 * nomme. Un `postconfig:swa` réécrirait `staticwebapp.config.json` APRÈS que le générateur l'a
 * validé — donc après le seul contrôle qui regarde la CSP — et il le ferait dans les DEUX
 * workflows, `deploy.yml` compris. Un `prebuild` sauterait, lui, la compilation du contenu.
 *
 * `prestart`, `pretest` et `prewatch` restent légitimes et ne sont PAS dans cette liste : ils
 * n'encadrent pas ce qui part en ligne.
 */
const CROCHETS_INTERDITS = [
  'prebuild',
  'postbuild',
  'precontent:build',
  'postcontent:build',
  'preconfig:swa',
  'postconfig:swa',
] as const;

describe('le script `build`, celui que les deux workflows exécutent', () => {
  const scripts = (
    JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string> }
  ).scripts;

  it('enchaîne exactement les segments revus, dans leur ordre', () => {
    const segments = (scripts?.['build'] ?? '')
      .split('&&')
      .map((segment) => segment.trim())
      .filter((segment) => segment !== '');

    expect(
      segments,
      `« scripts.build » a changé :\n` +
        `  · revu ici   : ${SEGMENTS_DE_BUILD.join(' · ')}\n` +
        `  · package.json : ${segments.join(' · ')}\n` +
        `Un segment retiré part en ligne sans avoir été exécuté — « config:swa » en moins, c'est ` +
        `un artéfact publié sans CSP ni en-têtes de sécurité, et seule la vérification EN LIGNE ` +
        `d'après-déploiement le dirait.`,
    ).toEqual([...SEGMENTS_DE_BUILD]);
  });

  it.each(Object.keys(CORPS_DE_SCRIPT_REVUS))(
    'exécute pour « %s » exactement la commande revue, sans drapeau appendu',
    (nom) => {
      expect(
        scripts?.[nom],
        `« scripts.${nom} » a changé de CORPS. C'est le maillon entre le workflow et l'outil, et ` +
          `rien d'autre ne le lit : un drapeau appendu ici passe les deux workflows sans qu'aucun ` +
          `« run: » ne le montre (S-018). Attendu, revu à la main : « ${CORPS_DE_SCRIPT_REVUS[nom] ?? ''} ».`,
      ).toBe(CORPS_DE_SCRIPT_REVUS[nom]);
    },
  );

  it('ne pose aucun crochet npm autour de la chaîne de publication', () => {
    const poses = Object.keys(scripts ?? {}).filter((nom) =>
      (CROCHETS_INTERDITS as readonly string[]).includes(nom),
    );
    expect(
      poses,
      `« package.json » porte un crochet npm autour de la chaîne de publication : ${poses.join(', ')}. ` +
        `npm l'exécute AUTOUR du script sans qu'aucun workflow ne le nomme — un « postconfig:swa » ` +
        `réécrirait « staticwebapp.config.json » APRÈS la seule validation qui regarde la CSP, et ` +
        `dans les DEUX workflows.`,
    ).toEqual([]);
  });
});

// =============================================================================
// LA COUVERTURE E2E DE LA PAGE DE LEÇON — le trou est COMPTÉ, jamais silencieux
// -----------------------------------------------------------------------------
// ✅ CE QUI A REMPLACÉ QUOI, LE 2026-08-20 (clôture d'E3-ST1). Ce bloc gardait le
// HARNAIS DE FIXTURE de la décision E-2 : `ci.yml` bâtissait son artéfact depuis
// `tools/content-pipeline/__fixtures__/temoin/…` parce que `content/` était vide, et un
// tripwire auto-périmant devait rougir le jour où une vraie leçon arriverait. Ce jour est
// venu, le harnais est retiré, et le tripwire a fait son travail. Ce qui suit garde ce que
// le retrait a créé : un TROU DE COUVERTURE, borné et daté.
//
// 🔴 LE TROU, DIT À VOIX HAUTE. Les huit specs de la page de leçon ne visent plus une route
// écrite en dur : `e2e/aides/artefact-mesure.ts` DÉCOUVRE dans l'artéfact bâti une page qui
// porte un quiz, une page qui porte une simulation, et fait sauter les fichiers sans sujet.
// Sur l'artéfact publié aujourd'hui :
//   · la leçon 01 `fondamentaux` porte un QUIZ  → les 6 specs de quiz s'exécutent ;
//   · AUCUNE leçon publiée ne porte de SIMULATION → les 3 specs de simulation SAUTENT
//     (pour `simulation-sous-csp.spec.ts`, seul son lien profond saute : ses DEUX mesures de
//     `style-src` sont gardées par le quiz, parce qu'elles sont la seule preuve live que cette
//     directive est appliquée — les éteindre pendant qu'elle passe de 10 à 13 hachages aurait
//     été un « enabler ≠ enforcement », `.claude/rules/security.md` §1).
// La leçon 01 n'a pas de simulation par DÉCISION du propriétaire (2026-08-20) : le module est
// abstrait, sa kill chain est un schéma statique. La couverture revient à E3-ST3
// (`03-injection`), qui en porte une au plan — environ trois semaines, assumées ici par écrit.
//
// 🔴 POURQUOI CE FILET DOIT VIVRE ICI, ET NULLE PART AILLEURS. Un saut est la seule chose qui
// empêche ces specs d'être rouges là où leur sujet n'existe pas ; il faut donc, par symétrie,
// quelque chose qui les empêche d'être SAUTÉS PARTOUT. Ce quelque chose ne peut pas vivre dans
// la suite e2e — un fichier entièrement sauté ne peut pas s'assertionner (L-005/L-014). Il vit
// dans G-test, qui tourne toujours, et il ne lit rien de la suite e2e : il lit `content/`.
//
// 🔴 CE QUE CE BLOC MORD, ET DANS LES DEUX SENS :
//   · le jour où une leçon publiée porte une simulation, ce fichier ROUGIT — parce que le
//     littéral revu à la main dirait encore « aucune », alors que trois specs viennent de se
//     rallumer sans que personne ait vérifié qu'ils passent. C'est la fermeture du trou qui
//     réclame la revue, pas son ouverture ;
//   · le jour où plus aucune leçon publiée ne porte de quiz, il ROUGIT aussi — quatre specs se
//     seraient mis à sauter en silence, et le vert de G-e2e ne voudrait plus rien dire ;
//   · les trois specs de simulation doivent EXISTER et appeler leur garde. Sauter pendant trois
//     semaines est le mode d'échec où un spec se fait supprimer « puisqu'il ne tourne pas ».
//   · `ci.yml` ne doit ramener NI `--racine` NI `--hachages-style` : le premier ferait auditer
//     un double de test à la place du contenu publié, le second desserrerait un contrôle
//     d'égalité exacte sur la CSP sans passer par `config-swa-provenance-style.spec.ts`.
// =============================================================================

/**
 * Ce que la suite e2e mesure AUJOURD'HUI sur l'artéfact publié — littéral REVU À LA MAIN, et
 * surtout PAS dérivé de `content/`.
 *
 * ⚠️ Le dériver le viderait de tout sens : un compte que son entrée peut fabriquer n'est pas un
 * garde-fou (S-014). C'est la CONFRONTATION entre ce littéral et ce que `content/` porte
 * réellement qui fait le gate — la même mécanique que `NOMBRE_HACHAGES_STYLE_ATTENDU`.
 *
 * 📉 `simulation: false` depuis le 2026-08-20 (clôture d'E3-ST1). À repasser à `true` en
 * publiant E3-ST3 (`03-injection`), dans le MÊME commit que la leçon — et ce fichier rougira
 * pour l'exiger.
 */
const CAPACITES_MESUREES_EN_E2E = { quiz: true, simulation: false } as const;

/** Les trois specs qui n'ont plus de sujet tant qu'aucune leçon publiée n'a de simulation. */
const SPECS_DE_SIMULATION = [
  'e2e/parcours-clavier-simulation.spec.ts',
  'e2e/simulation-mecanique.spec.ts',
  'e2e/simulation-sous-csp.spec.ts',
] as const;

/**
 * Les specs qui exigent une page de leçon portant un quiz — inventaire EXHAUSTIF, tenu à la main.
 *
 * ⚠️ `e2e/sommaire.spec.ts` a été AJOUTÉ le 2026-08-20 : il appelle `exigerUneLeconAvecQuiz` et
 * n'était dans AUCUNE liste, donc sa disparition ne faisait rougir rien (famille L-037).
 * `e2e/simulation-sous-csp.spec.ts` figure dans les DEUX listes depuis la même date : ses deux
 * mesures de `style-src` sont gardées par le quiz, son lien profond par la simulation.
 */
const SPECS_DE_QUIZ = [
  'e2e/parcours-clavier-quiz.spec.ts',
  'e2e/quiz-pre-hydratation.spec.ts',
  'e2e/quiz-sous-csp.spec.ts',
  'e2e/defileurs-clavier.spec.ts',
  'e2e/sommaire.spec.ts',
  'e2e/simulation-sous-csp.spec.ts',
] as const;

/**
 * Le frontmatter d'une `lecon.md` — le bloc entre les deux premiers `---`.
 *
 * On le borne au lieu de balayer le fichier entier : une leçon qui CITE `statut: publiee` dans
 * un bloc de code (ce module enseigne le contenu-as-code) ferait mentir un balayage global.
 */
function frontmatter(chemin: string): string {
  const brut = readFileSync(chemin, 'utf8');
  const fin = brut.indexOf('\n---', brut.indexOf('---') + 3);
  return fin === -1 ? '' : brut.slice(0, fin);
}

/** Ce que `content/` publie RÉELLEMENT — mesuré, jamais déclaré. */
function capacitesPubliees(): { readonly quiz: boolean; readonly simulation: boolean } {
  const dossiers = existsSync(RACINE_COURS_PRODUCTION)
    ? readdirSync(RACINE_COURS_PRODUCTION, { withFileTypes: true })
        .filter((entree) => entree.isDirectory())
        .map((entree) => join(RACINE_COURS_PRODUCTION, entree.name))
    : [];

  // Une leçon en `statut: brouillon` n'est PAS prerendue (D-1 d'E2-ST6) : sa simulation
  // n'existerait dans aucun artéfact, et la compter ici rendrait le gate rouge pour rien.
  const publiees = dossiers.filter((dossier) => {
    const lecon = join(dossier, 'lecon.md');
    return existsSync(lecon) && /^statut:[ \t]*publiee[ \t]*$/m.test(frontmatter(lecon));
  });

  // 🔴 LE FICHIER **ET** L'ANCRE RENDUE — pas l'un des deux (constat du 2026-08-20).
  // `e2e/aides/artefact-mesure.ts` cherche `<app-quiz` dans le HTML PRERENDU ; mesurer ici la
  // seule présence de `quiz.json` était donc un PRÉDICAT DIFFÉRENT de celui du garde qu'on
  // protège. Une leçon qui garde son `quiz.json` mais perd son ancre `[[quiz]]` dans `lecon.md`
  // ne rend aucun `<app-quiz` : les specs de quiz sauteraient EN SILENCE pendant que ce gate
  // resterait vert — le mode d'échec exact que ce bloc existe pour interdire.
  // L'ancre est exigée SEULE SUR SA LIGNE, comme le compilateur la reconnaît : une occurrence
  // citée en prose ou dans un bloc de code ne rend rien.
  const porte = (dossier: string, fichier: string, ancre: RegExp): boolean =>
    existsSync(join(dossier, fichier)) && ancre.test(readFileSync(join(dossier, 'lecon.md'), 'utf8'));

  return {
    quiz: publiees.some((dossier) => porte(dossier, 'quiz.json', /^\[\[quiz\]\]\s*$/m)),
    simulation: publiees.some((dossier) =>
      porte(dossier, 'simulation.json', /^\[\[simulation\]\]\s*$/m),
    ),
  };
}

describe('la couverture e2e de la page de leçon (clôture du harnais, E3-ST1)', () => {
  // Filet propre (L-019) : sans lui, un `content/` disparu rendrait les deux cas suivants
  // verts en n'ayant mesuré aucune leçon.
  it('trouve au moins une leçon à mesurer', () => {
    expect(
      leconsPresentes().length,
      `aucune « lecon.md » sous ${RACINE_COURS_PRODUCTION} : le contenu a disparu, ` +
        `et tout ce qui suit mesurerait le vide`,
    ).toBeGreaterThan(0);
  });

  it('confronte les capacités RÉELLEMENT publiées au littéral revu à la main', () => {
    const reelles = capacitesPubliees();

    expect(
      reelles.quiz,
      `le littéral dit « quiz: ${String(CAPACITES_MESUREES_EN_E2E.quiz)} », la mesure dit ` +
        `« ${String(reelles.quiz)} ». Si plus aucune leçon publiée ne porte à la fois un ` +
        `« quiz.json » ET son ancre « [[quiz]] » rendue (les DEUX : sans l’ancre, aucun ` +
        `« <app-quiz » n’est prerendu et le garde e2e ne trouve rien), les ` +
        `${SPECS_DE_QUIZ.length} specs de quiz (${SPECS_DE_QUIZ.join(', ')}) se sautent EN SILENCE ` +
        `et le vert de G-e2e ne prouve plus rien sur le seul composant interactif du site.`,
    ).toBe(CAPACITES_MESUREES_EN_E2E.quiz);

    expect(
      reelles.simulation,
      `le littéral dit « simulation: ${String(CAPACITES_MESUREES_EN_E2E.simulation)} », la mesure ` +
        `dit « ${String(reelles.simulation)} ». ✅ SI LA MESURE EST « true », C'EST UNE BONNE ` +
        `NOUVELLE : une leçon publiée porte enfin une simulation, donc les ${SPECS_DE_SIMULATION.length} ` +
        `specs de simulation viennent de se RALLUMER tout seuls. Ce rouge existe pour qu'un humain ` +
        `les fasse tourner avant de basculer le littéral à « true » — c'est la FERMETURE du trou ` +
        `qui réclame la revue, pas son ouverture. Trou ouvert le 2026-08-20 (leçon 01 sans ` +
        `simulation, décision du propriétaire), refermeture prévue à E3-ST3 « 03-injection ».`,
    ).toBe(CAPACITES_MESUREES_EN_E2E.simulation);
  });

  // 🔴 LE MODE D'ÉCHEC QUE CE CAS SEUL ATTRAPE : un spec qui saute pendant trois semaines a
  // toutes les apparences d'un spec mort. Le supprimer, ou lui retirer son garde « pour qu'il
  // tourne enfin », ne ferait rougir RIEN — et la couverture ne reviendrait jamais à E3-ST3.
  it.each([...SPECS_DE_SIMULATION])('garde %s vivant et gardé pendant le trou', (chemin) => {
    expect(existsSync(chemin), `${chemin} a été SUPPRIMÉ pendant que ses tests sautaient`).toBe(true);
    expect(
      readFileSync(chemin, 'utf8'),
      `${chemin} n'appelle plus « exigerUneLeconAvecSimulation » EN POSITION D'INSTRUCTION : sans ` +
        `ce garde, il partira en 404 sur l'artéfact publié — exactement le déploiement rouge du ` +
        `2026-08-18 (L-007).`,
      // 🔴 UN APPEL, PAS UNE MENTION (L-043). Un `toContain` sur le texte source ne distingue pas
      // l'instruction du commentaire : mettre l'appel en commentaire laissait ce gate VERT et
      // renvoyait les specs en 404. L'ancre est donc « début de ligne, éventuellement indenté »
      // — indenté parce que l'appel vit dans un `describe` dans plusieurs fichiers.
    ).toMatch(/^\s*exigerUneLeconAvecSimulation\(/m);
  });

  it.each([...SPECS_DE_QUIZ])('garde %s gardé par la capacité qu’il exige', (chemin) => {
    expect(existsSync(chemin), `${chemin} a été SUPPRIMÉ`).toBe(true);
    expect(
      readFileSync(chemin, 'utf8'),
      `${chemin} n'appelle plus « exigerUneLeconAvecQuiz » EN POSITION D'INSTRUCTION : il partirait ` +
        `en 404 sur tout artéfact dont aucune leçon ne porte de quiz.`,
      // Même ancre que ci-dessus, et pour la même raison (L-043) : un appel mis en commentaire
      // laissait ce gate vert.
    ).toMatch(/^\s*exigerUneLeconAvecQuiz\(/m);
  });

  it('interdit le retour du harnais de fixture dans ci.yml', () => {
    expect(
      ci,
      `« --racine » est de retour dans une commande de ci.yml : la CI auditerait de nouveau un ` +
        `double de test à la place du contenu publié (mode d'échec L-007, et c'est ce que le ` +
        `tripwire de la décision E-2 a passé trois semaines à annoncer).`,
    ).not.toMatch(/--racine\s/);
    expect(
      ci,
      `« --hachages-style » est de retour dans une commande de ci.yml : le compte attendu ne serait ` +
        `plus « NOMBRE_HACHAGES_STYLE_ATTENDU », donc plus celui que « config-swa-provenance-style.spec.ts » ` +
        `fait relire. Un contrôle d'égalité exacte sur « style-src » se desserrerait sans revue (S-002, S-011).`,
    ).not.toMatch(/--hachages-style\s/);
  });

  it('laisse les DEUX workflows sur `npm run build`, le script qui publie', () => {
    for (const workflow of ['.github/workflows/ci.yml', '.github/workflows/deploy.yml']) {
      expect(
        runDeLEtape(workflow, 'G-build').trim(),
        `${workflow} ne bâtit plus par « npm run build » : le vert d'un workflow ne dirait plus ` +
          `rien de l'autre, et c'est le script de « deploy.yml » qui produit ce qui part en ligne.`,
      ).toBe('npm run build');
    }
  });

  it('garde deploy.yml sur la racine de production', () => {
    // Le JETON `--racine <chemin>`, pas la sous-chaîne « __fixtures__ » : câbler un jour
    // `content:valider:fixtures` dans `deploy.yml` — ce que L-007 réclame — rougirait ce test pour
    // une raison qui n'a rien à voir avec la racine de construction.
    const racines = [...deploiement.matchAll(/--racine\s+(\S+)/g)].map((trouve) => trouve[1] ?? '');
    expect(
      racines.filter((racine) => racine.includes('__fixtures__')),
      'deploy.yml construit depuis une fixture : ce qui serait PUBLIÉ ne serait pas le contenu réel',
    ).toEqual([]);
    expect(deploiement).not.toContain('--hachages-style');
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
