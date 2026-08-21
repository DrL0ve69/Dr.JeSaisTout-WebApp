// =============================================================================
// `style-src` n'autorise-t-il QUE les blocs de provenance Angular ? (E2-ST3, lot E-b1)
// -----------------------------------------------------------------------------
// POURQUOI CE TEST EXISTE.
// `tools/deploiement/generer-config-swa.mjs` hachait, jusqu'au 2026-08-18, TOUT bloc
// `<style>` trouvé dans l'artéfact prerendu : la permission CSP se dérivait donc de
// la sortie, ce que S-002 interdit et ce que l'en-tête du générateur reproche déjà
// au cas `script-src`. Le premier composant interactif y aurait ajouté le hachage de
// son `.scss` EN SILENCE. La décision E-3 du lot E borne la dérivation à la
// PROVENANCE : seul `<style ng-app-id="ng">`, sans autre attribut, est haché.
//
// ⚠️ AMENDEMENT DU 2026-08-18, APRÈS REVUE SÉCURITÉ — c'est lui qui donne sa forme à
// ce fichier. Borner à `ng-app-id="ng"` bornait à un MARQUEUR, pas à une provenance :
// les blocs `<style>` de l'artéfact SONT les styles des composants, tous émis par
// Angular avec ce marqueur. La revue a ajouté à l'artéfact réel un
// `<style ng-app-id="ng">.quiz[…]{color:red}</style>` → code 0, 9 → 10 hachages,
// aucun signal. Le générateur épingle donc désormais le NOMBRE de hachages de style
// attendu (miroir de `hachagesScript.size !== 1`), et exige que le bloc soit enfant
// direct de `<head>`/`<body>`.
//
// Et surtout : AUCUN spec n'exerçait ce générateur. La règle neuve serait née dans
// le même état que les fixtures d'E2-ST1 — exacte, exécutable à la main, lancée par
// personne (L-019 sur l'axe CÂBLAGE). Ce fichier est le runner.
//
// LES DEUX MOITIÉS DE LA PINCE, dont aucune ne suffit seule :
//   1. Les artéfacts fautifs sont REFUSÉS, chacun sur une cause qui NOMME le fichier
//      et le bloc. Seul, ce constat est compatible avec un générateur qui refuserait
//      tout.
//   2. Les artéfacts conformes sont ACCEPTÉS, avec le bon NOMBRE de hachages, et ces
//      hachages arrivent réellement dans le `style-src` écrit. C'est l'autre moitié.
//
// TROIS REFUS NE SONT PAS DES DOUBLONS DU PREMIER :
//   · le `<style` en commentaire ne prouve pas qu'on refuse bien ce qu'on voit, il
//     prouve qu'on VOIT tout (S-003) : compte brut ≠ compte analysé = infraction ;
//   · le bloc de trop prouve que le NOMBRE est épinglé — c'est le seul contrôle qui
//     voit le `.scss` d'un composant neuf, puisque celui-ci porte le bon marqueur ;
//   · `<noscript>`/`<svg>` prouvent la contrainte de PLACE : script activé, le
//     navigateur ne voit aucun élément dans le `<noscript>`, et son contenu obtenait
//     pourtant un hachage global (divergence d'analyseurs, famille S-001).
//
// POURQUOI PAR PROCESSUS FILS, SUR UN ARTÉFACT JETABLE. Le générateur est un `.mjs`
// du TROISIÈME programme TypeScript (`tsconfig.tools.json`, Node pur) : l'importer
// le ferait entrer dans `tsconfig.spec.json`, qui n'a ni `allowJs` ni les types Node
// de l'outillage. On exécute donc la ligne de commande RÉELLE — celle que
// `npm run build` lance — dans un dossier temporaire fabriqué ici. Jamais sur
// `dist/` : `npm test` ne construit pas l'application, et un test qui dépendrait
// d'un artéfact bâti à côté serait vert ou rouge selon l'heure.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const GENERATEUR = resolve('tools/deploiement/generer-config-swa.mjs');

/** La VRAIE source de configuration : si son jeton `__HACHAGES_STYLE__` disparaissait, ce test le
 *  verrait — une copie inventée ici ne le verrait pas. */
const SOURCE_CONFIG = readFileSync(resolve('config/staticwebapp.config.source.json'), 'utf8');

// =============================================================================
// 🔴 CE FICHIER PORTAIT UNE CONSTANTE `SCRIPT_THEME`, ET ELLE A DISPARU (bascule E6, 2026-08-20).
// Elle relisait `<script id="init-theme">` dans `src/index.html` et l'injectait dans CHAQUE page
// de fixture, parce que le générateur exigeait alors exactement un script inline autorisé par page.
// `src/index.html` ne porte plus aucun script inline et `script-src` vaut `'self'` sans hachage :
// une page de fixture qui en porterait un serait désormais REFUSÉE, et tous les cas de ce fichier
// échoueraient sur une cause étrangère à ce qu'ils testent — la provenance des blocs `<style>`.
//
// ⚠️ CE QUE CETTE CONSTANTE PROUVAIT SEULE : rien. Elle n'était pas assertionnée ici, elle rendait
// seulement la fixture plausible. Ce qui EST assertionné sur `script-src` — zéro hachage, et un
// script inline qui fait échouer le générateur — vit dans `src/config-swa-contournements.spec.ts`,
// qui exerce précisément cette branche. Aucune couverture n'est perdue par ce retrait.
// =============================================================================

/**
 * Le nombre de hachages de style que le générateur épingle — RECOPIÉ ICI EN DUR, jamais importé de
 * l'outil qu'il vérifie (L-012). La duplication est le point : elle fait de ce fichier le SECOND
 * endroit revu quand le compte change. Un composant neuf porteur de styles rougit donc ici aussi,
 * une fois, et c'est la revue qu'on veut ; éditer un `.scss` existant ne change rien au compte.
 */
// 📈 10 → 13 le 2026-08-20 (E3-ST1, clôture) : `content/` porte sa PREMIÈRE LEÇON PUBLIÉE
// (`01-fondamentaux`), donc l’artéfact de production prerend enfin une page de leçon. Les trois
// blocs de plus ont été ÉNUMÉRÉS ET NOMMÉS un par un avant cet épinglage (⚠️ c’est le NOMBRE qui
// est épinglé et revu ; le CONTENU de chaque bloc reste dérivé de l’artéfact — `style-src` n’est
// PAS une liste blanche nominative comme `script-src`, S-002/S-009), et ils n’apparaissent QUE sur
// `cours/securite-web/fondamentaux/index.html` :
//   · 4 196 o — l’adaptateur de route de la page de leçon `[_nghost-…]{display:block;padding:…}`
//   · 6 998 o — le rendeur de blocs, `.prose[_ngcontent-…]`
//   · 5 669 o — le quiz, `.quiz[_ngcontent-…]`
// ⚠️ IL N’Y EN A QUE TROIS, ET C’EST LA MESURE QUI LE DIT. L’artéfact de FIXTURE en portait
// QUATRE de plus (14) : le quatrième était `.simulation[_ngcontent-…]`. La leçon 01 n’a pas de
// simulation — sujet abstrait, schéma statique (décision du propriétaire du 2026-08-20) — donc
// ce bloc n’est pas rendu. Il reviendra avec E3-ST3, et rougira ici une fois, comme prévu.
// Le compte de hachages de SCRIPT reste à 1.
// 📈 13 → 14 le 2026-08-21 (E3-ST3) : « 03-injection » est la première leçon publiée portant un
// « simulation.json ». Le bloc de plus, MESURÉ et NOMMÉ avant épinglage : 4 775 o,
// `.simulation[_ngcontent-…]`, sur la SEULE page `cours/securite-web/injection/index.html`.
// C'est le retour annoncé ci-dessus (« il reviendra avec E3-ST3, et rougira ici une fois »).
const NOMBRE_HACHAGES_ATTENDU = 14;

/** Autant de blocs Angular conformes, tous de contenus DISTINCTS — le générateur dédoublonne. */
function blocsAngular(nombre: number): string[] {
  return Array.from({ length: nombre }, (_, i) => `<style ng-app-id="ng">.bloc-${i}{color:red}</style>`);
}

/** jsdom démarre, quatre à six processus Node se lancent : large, mais borné. */
const DELAI = 60_000;

const BASE = mkdtempSync(join(tmpdir(), 'swa-provenance-'));

/** Une page prerendue plausible : un `<head>` SANS aucun script inline, et les blocs à l'essai. */
function page(blocsStyle: readonly string[]): string {
  return [
    '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Essai</title>',
    ...blocsStyle,
    '</head><body><p>Essai</p></body></html>',
  ].join('\n');
}

/**
 * Fabrique un artéfact jetable complet (source de config + pages prerendues) et y lance la ligne
 * de commande réelle. `404/index.html` existe parce que `responseOverrides.404` le nomme et que le
 * générateur vérifie ses cibles (S-004) ; il ne porte AUCUN bloc `<style>`, pour que le compte de
 * hachages rapporté ne dépende que des blocs à l'essai.
 */
function lancer(
  blocsStyle: readonly string[],
  args: readonly string[] = [],
): { sortie: string; code: number; config: string } {
  const racine = mkdtempSync(join(BASE, 'artefact-'));
  const navigateur = join(racine, 'dist', 'dr-je-sais-tout', 'browser');
  mkdirSync(join(racine, 'config'), { recursive: true });
  mkdirSync(join(navigateur, '404'), { recursive: true });
  writeFileSync(join(racine, 'config', 'staticwebapp.config.source.json'), SOURCE_CONFIG);
  writeFileSync(join(navigateur, 'index.html'), page(blocsStyle));
  writeFileSync(join(navigateur, '404', 'index.html'), page([]));

  let sortie: string;
  let code: number;
  try {
    sortie = execFileSync(process.execPath, [GENERATEUR, ...args], {
      cwd: racine,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    code = 0;
  } catch (erreur) {
    const detail = erreur as { status?: number; stdout?: string; stderr?: string };
    sortie = `${detail.stdout ?? ''}${detail.stderr ?? ''}`;
    code = detail.status ?? -1;
  }

  let config: string;
  try {
    config = readFileSync(join(navigateur, 'staticwebapp.config.json'), 'utf8');
  } catch {
    config = '';
  }
  return { sortie, code, config };
}

/**
 * Un cas = un bloc `<style>` fautif, une empreinte de cause. Le fragment attendu est le morceau le
 * plus SPÉCIFIQUE du message — celui qu'un autre cas ne pourrait pas produire par accident — et il
 * est écrit ICI, en dur, jamais importé de l'outil qu'il vérifie (L-012).
 */
const CAS_REFUSES: readonly { nom: string; bloc: string; cause: RegExp }[] = [
  {
    nom: 'un bloc sans marqueur de provenance',
    bloc: '<style>body{color:red}</style>',
    cause: /index\.html : bloc <style \(aucun attribut\)> de provenance non reconnue/,
  },
  {
    nom: 'un bloc Angular portant un attribut de plus',
    bloc: '<style ng-app-id="ng" data-quelconque="x">body{color:red}</style>',
    cause: /index\.html : bloc <style ng-app-id="ng" data-quelconque="x"> de provenance non reconnue/,
  },
  {
    nom: 'un bloc dont le marqueur porte une autre valeur',
    bloc: '<style ng-app-id="autre-chose">body{color:red}</style>',
    cause: /index\.html : bloc <style ng-app-id="autre-chose"> de provenance non reconnue/,
  },
  {
    // S-003 : ce cas ne teste pas le refus, il teste la VUE. Le bloc est en commentaire — aucun
    // élément n'en sort, mais l'occurrence brute existe. Sans contrôle de conservation, un
    // garde-fou qui refuse parfaitement ce qu'il voit reste muet sur ce qu'il n'a pas vu.
    nom: 'une occurrence de « <style » que l’analyseur ne retrouve pas',
    bloc: '<!-- <style ng-app-id="ng">body{color:red}</style> -->',
    cause: /index\.html : 1 occurrence\(s\) brute\(s\) de « <style » pour 0 élément\(s\)/,
  },
  {
    // FAUX POSITIF CONSERVÉ, DÉLIBÉRÉMENT. Un `<style ` en valeur d'attribut ne produit aucun
    // élément ici, mais rien ne garantit que tout analyseur le lise ainsi : l'écart mérite un
    // regard humain. Le test l'épingle pour que le jour où quelqu'un rencontre ce rouge, il trouve
    // la cause écrite — c'est la pression S-011 qu'on désamorce, pas le garde-fou qu'on assouplit.
    nom: 'une valeur d’attribut contenant « <style » (faux positif assumé, cause éditoriale)',
    bloc: '<p data-exemple="<style >">balise citée dans une valeur d’attribut</p>',
    cause: /index\.html : 1 occurrence\(s\) brute\(s\) de « <style » pour 0 élément\(s\)/,
  },
  {
    // PLACE (S-001) : le marqueur est juste, le bloc est invisible au navigateur quand le script
    // est actif — et son contenu obtenait pourtant un hachage dans un `style-src` GLOBAL.
    nom: 'un bloc Angular caché dans un <noscript>, que le navigateur ne voit pas',
    bloc: '<noscript><style ng-app-id="ng">body{color:red}</style></noscript>',
    cause: /index\.html : bloc <style ng-app-id="ng"> placé dans <noscript> — un bloc haché doit être enfant direct de/,
  },
  {
    nom: 'un bloc Angular placé dans un <svg>',
    bloc: '<svg><style ng-app-id="ng">body{color:red}</style></svg>',
    cause: /index\.html : bloc <style ng-app-id="ng"> placé dans <svg> — un bloc haché doit être enfant direct de/,
  },
];

// AU NIVEAU DU FICHIER, PAS DANS UN `describe`. La purge vivait dans le premier bloc, et le second
// (ajouté au lot E-b2) partait alors sur un `BASE` déjà effacé : huit cas rouges en 0 ms, sur un
// ENOENT qui ne parlait pas de ce qu'ils testent. Un `afterAll` de suite s'exécute à la FIN DE SA
// SUITE, pas à la fin du fichier.
afterAll(() => {
  rmSync(BASE, { recursive: true, force: true });
});

describe('le garde-fou de provenance de `style-src`', () => {
  for (const cas of CAS_REFUSES) {
    it(
      `refuse ${cas.nom}, en le nommant`,
      () => {
        const { sortie, code } = lancer([cas.bloc]);
        expect(code).toBe(1);
        expect(sortie).toMatch(cas.cause);
        // Le refus doit sortir AVANT l'écriture : une config écrite puis un code 1 laisserait un
        // artéfact déployable portant une CSP jamais revue.
        expect(sortie).toContain('la sortie prerendue est incompatible avec la CSP stricte');
      },
      DELAI,
    );
  }

  it(
    'refuse UN BLOC DE TROP, même parfaitement marqué — c’est le seul contrôle qui voit un `.scss` neuf',
    () => {
      // Le cas exact reproduit par la revue sur l'artéfact réel : un bloc de composant, avec le bon
      // `ng-app-id="ng"`, à la bonne place. La provenance ne peut RIEN en dire — Angular émet
      // lui-même les styles de composants. Seul le compte épinglé le voit.
      const { sortie, code, config } = lancer(blocsAngular(NOMBRE_HACHAGES_ATTENDU + 1));
      // L'écart CHIFFRÉ d'abord : si ce garde-fou tombe, le rouge doit nommer ce qui manque, pas
      // se contenter d'un « code 0 au lieu de 1 » qui n'apprend rien à qui le lit.
      expect(sortie).toMatch(
        new RegExp(
          `${NOMBRE_HACHAGES_ATTENDU + 1} hachage\\(s\\) de style distinct\\(s\\) dans l’artéfact — ${NOMBRE_HACHAGES_ATTENDU} attendu`,
        ),
      );
      expect(code).toBe(1);
      // L'ORDRE de la consigne est le cœur de S-002 : revue d'abord, constante ensuite.
      expect(sortie).toContain('security-reviewer');
      expect(sortie).toContain('Jamais l’inverse');
      // Rien ne doit être écrit : un artéfact déployable porterait une CSP jamais revue.
      expect(config).toBe('');
    },
    DELAI,
  );

  it(
    `accepte un artéfact ne portant que des blocs « <style ng-app-id="ng"> », et hache les ${NOMBRE_HACHAGES_ATTENDU}`,
    () => {
      const { sortie, code, config } = lancer(blocsAngular(NOMBRE_HACHAGES_ATTENDU));
      expect(code).toBe(0);
      expect(sortie).toContain(`${NOMBRE_HACHAGES_ATTENDU} hachage(s) de style distinct(s)`);
      // Le compte affiché ne prouve rien tout seul : c'est la directive ÉCRITE qui part sur Azure.
      const directive = /style-src[^;]*/.exec(config)?.[0] ?? '';
      expect(directive.match(/sha256-/g) ?? []).toHaveLength(NOMBRE_HACHAGES_ATTENDU);
    },
    DELAI,
  );

  it(
    'reconnaît les formes qu’un motif raterait — casse de balise, guillemets simples, blancs',
    () => {
      // Ces écritures sont, pour un navigateur, exactement le même élément que celui qu'Angular
      // émet : elles doivent donc être acceptées. Elles ne le seraient pas par un motif cherchant
      // la sous-chaîne `<style ng-app-id="ng">` — d'où l'analyse plutôt que le balayage.
      const { sortie, code } = lancer([
        '<STYLE NG-APP-ID="ng">.exotique-0{color:red}</STYLE>',
        "<style ng-app-id='ng'   >.exotique-1{color:blue}</style >",
        ...blocsAngular(NOMBRE_HACHAGES_ATTENDU - 2),
      ]);
      expect(code).toBe(0);
      expect(sortie).toContain(`${NOMBRE_HACHAGES_ATTENDU} hachage(s) de style distinct(s)`);
    },
    DELAI,
  );

  it(
    'ne confond pas un élément dont le NOM commence par « style » avec un bloc <style>',
    () => {
      // `<style-guide>` est un nom d'élément personnalisé légal — dans une leçon, il est même
      // plausible. Compté comme occurrence brute, il rendait la construction rouge sur un message
      // accusant la CSP pour une cause purement éditoriale : la pression S-011, exactement.
      const { sortie, code } = lancer([...blocsAngular(NOMBRE_HACHAGES_ATTENDU), '<style-guide>x</style-guide>']);
      expect(code).toBe(0);
      expect(sortie).toContain(`${NOMBRE_HACHAGES_ATTENDU} hachage(s) de style distinct(s)`);
    },
    DELAI,
  );
});

// =============================================================================
// UN SEUL COMPTE, ÉPINGLÉ — ET PLUS AUCUN LEVIER POUR LE REMPLACER
// -----------------------------------------------------------------------------
// ✅ CE QUI A CHANGÉ LE 2026-08-20. Le générateur portait `--hachages-style <n>`,
// qui remplaçait le compte épinglé POUR CET APPEL. Le drapeau existait pour la
// décision E-2 (lot E-b2), où la CI bâtissait l'artéfact depuis la fixture témoin
// pendant que `deploy.yml` le bâtissait depuis `content/` : deux artéfacts, deux
// comptes. Le harnais est retiré à la clôture d'E3-ST1 — il n'y a plus qu'un
// artéfact — et le drapeau est SUPPRIMÉ avec lui.
//
// 🔴 POURQUOI SUPPRIMER PLUTÔT QUE SURVEILLER (S-018, 6ᵉ occurrence). Le garde-fou
// qui interdisait le retour du drapeau ne lisait que les `run:` des workflows. Le
// CORPS d'un script npm est une surface qu'il ne voyait pas : un
// `"config:swa": "node …/generer-config-swa.mjs --hachages-style 20"` passait tous
// les gates et desserrait une autorisation CSP dans les DEUX workflows. Un levier
// qui n'existe plus ne se rallume pas en silence.
//
// CE QUE CES CAS PROUVENT :
//   · l'égalité est EXACTE, dans les deux sens (un bloc de moins rougit autant
//     qu'un bloc de plus) — jamais « au moins n » ;
//   · TOUT argument est refusé en se nommant, jamais ignoré : y compris celui qui
//     vient d'être supprimé, dont le retour ne doit pas être silencieux.
// =============================================================================

describe('le compte de hachages de style, épinglé et sans levier', () => {
  const AUTRE_COMPTE = NOMBRE_HACHAGES_ATTENDU + 3;

  it(
    `accepte exactement ${NOMBRE_HACHAGES_ATTENDU} blocs — et écrit les ${NOMBRE_HACHAGES_ATTENDU} hachages`,
    () => {
      const { sortie, code, config } = lancer(blocsAngular(NOMBRE_HACHAGES_ATTENDU));
      expect(code).toBe(0);
      expect(sortie).toContain(`${NOMBRE_HACHAGES_ATTENDU} hachage(s) de style distinct(s)`);
      const directive = /style-src[^;]*/.exec(config)?.[0] ?? '';
      expect(directive.match(/sha256-/g) ?? []).toHaveLength(NOMBRE_HACHAGES_ATTENDU);
    },
    DELAI,
  );

  it(
    'reste une ÉGALITÉ : un bloc de MOINS que le compte épinglé rougit aussi',
    () => {
      // Le sens « en moins » compte autant que le sens « en plus » : un `.scss` disparu change la
      // directive servie tout autant, et un contrôle « au moins n » ne le verrait jamais.
      const { sortie, code, config } = lancer(blocsAngular(NOMBRE_HACHAGES_ATTENDU - 1));
      expect(code).toBe(1);
      expect(sortie).toContain(
        `${NOMBRE_HACHAGES_ATTENDU - 1} hachage(s) de style distinct(s) dans l’artéfact — ${NOMBRE_HACHAGES_ATTENDU} attendu(s)`,
      );
      expect(config).toBe('');
    },
    DELAI,
  );

  it(
    `un bloc de PLUS rougit — la valeur épinglée (${NOMBRE_HACHAGES_ATTENDU}) s’applique toujours`,
    () => {
      const { sortie, code, config } = lancer(blocsAngular(AUTRE_COMPTE));
      expect(code).toBe(1);
      expect(sortie).toContain(
        `${AUTRE_COMPTE} hachage(s) de style distinct(s) dans l’artéfact — ${NOMBRE_HACHAGES_ATTENDU} attendu(s)`,
      );
      expect(config).toBe('');
    },
    DELAI,
  );

  const ARGS_REFUSES: readonly { nom: string; args: readonly string[]; cause: RegExp }[] = [
    {
      // 🔴 LE CAS QUI COMPTE LE PLUS : le drapeau supprimé ne revient pas en silence. Tant qu'il
      // existait, il pouvait desserrer une autorisation CSP depuis le corps d'un script npm.
      nom: 'le drapeau SUPPRIMÉ --hachages-style, même avec une valeur valide',
      args: ['--hachages-style', String(NOMBRE_HACHAGES_ATTENDU)],
      cause: /option inconnue : « --hachages-style »/,
    },
    {
      nom: 'le drapeau supprimé sans valeur',
      args: ['--hachages-style'],
      cause: /option inconnue : « --hachages-style »/,
    },
    {
      nom: 'une option approchante, plutôt que de l’ignorer',
      args: ['--hachages-styles', '12'],
      cause: /option inconnue : « --hachages-styles »/,
    },
    {
      nom: 'une racine de construction, que ce script n’a jamais acceptée',
      args: ['--racine', 'tools/content-pipeline/__fixtures__/temoin'],
      cause: /option inconnue : « --racine »/,
    },
    {
      nom: 'un argument nu',
      args: ['13'],
      cause: /option inconnue : « 13 »/,
    },
  ];

  for (const cas of ARGS_REFUSES) {
    it(
      `refuse ${cas.nom}`,
      () => {
        // L'artéfact est CONFORME au compte épinglé : seul l'argument peut faire échouer ces cas,
        // donc un rouge ici ne peut venir que de ce qu'on teste.
        const { sortie, code, config } = lancer(blocsAngular(NOMBRE_HACHAGES_ATTENDU), cas.args);
        expect(code).toBe(1);
        expect(sortie).toMatch(cas.cause);
        expect(config).toBe('');
      },
      DELAI,
    );
  }
});
