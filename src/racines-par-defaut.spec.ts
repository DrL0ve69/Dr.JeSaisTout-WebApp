// =============================================================================
// LE GATE DE LA LISTE DES RACINES COMPILÉES (E7, lot A)
//
// 🔴 POURQUOI CE FICHIER EXISTE. `RACINES_PAR_DEFAUT`, dans
// `tools/content-pipeline/build.mjs`, décide quels cours du dépôt sont compilés,
// écrits dans le manifeste et déployés. C'est l'objet le plus structurant du
// lot — et, jusqu'au 2026-09-10, c'était l'objet que RIEN ne mesurait : aucun
// spec ne lançait `build.mjs` sans `--racine`, tous passaient des racines
// explicites. Mesuré : retirer `content/cours/php` de la liste laissait G-test
// (1156 tests) et G-build entièrement VERTS. Le cours aurait disparu du
// manifeste en silence le jour où il porte sa première leçon.
//
// C'est le jumeau exact de la « permission morte » du lot 9, où
// `MODULES_AU_FORMAT_ACTIONNABLE` vivait dans `valider.mjs` sans gate, et la
// sixième face de S-010 : **quand un lot remplace une constante par une LISTE
// BLANCHE, cette liste devient l'élément le plus structurant et le moins
// protégé du diff.** Elle a l'air d'une évidence — elle nomme des dossiers
// qu'on a sous les yeux — et c'est précisément ce qui fait qu'on ne l'éprouve
// pas.
//
// POURQUOI PAR PROCESSUS FILS. Même raison que `src/format-actionnable.spec.ts`
// et les deux specs du pipeline : `build.mjs` est un `.mjs` du TROISIÈME
// programme TypeScript (`tsconfig.tools.json`, Node pur) ; l'importer le ferait
// entrer dans `tsconfig.spec.json`, qui n'a ni `allowJs` ni les types Node de
// l'outillage. On exécute donc la ligne de commande RÉELLE.
//
// LES DEUX MOITIÉS DE LA PINCE, et il en faut deux :
//   · le CONTENU — la liste nomme exactement les cours attendus. Sans lui, un
//     retrait passe inaperçu.
//   · l'EXISTENCE SUR DISQUE — chaque entrée est un dossier réel. Sans lui, une
//     faute de frappe (`content/cours/ph`) serait avalée : une racine par défaut
//     absente est un cas TOLÉRÉ par le pipeline (code 0, sorties écrites quand
//     même), donc rien d'autre ne rougirait.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';

const ORCHESTRATEUR = 'tools/content-pipeline/build.mjs';

/**
 * Les cours que le dépôt compile et publie, au 2026-09-10.
 *
 * ⚠️ CETTE LISTE SE MODIFIE EN MÊME TEMPS QUE `RACINES_PAR_DEFAUT`, JAMAIS APRÈS COUP — et c'est
 * le but : ouvrir ou fermer un cours doit être un geste qui se voit en revue, des DEUX côtés.
 *
 * ⚠️ L'ORDRE COMPTE, ET IL EST TENU : c'est celui dans lequel les racines sont compilées. Un
 * `toEqual` sur un tableau le vérifie sans qu'on ait à l'écrire, et c'est voulu — réordonner la
 * liste change le journal de construction, donc ce que lit qui diagnostique une régression.
 */
const RACINES_ATTENDUES = ['content/cours/securite-web', 'content/cours/php'];

function lireRacinesParDefaut(): string[] {
  const sortie = execFileSync(process.execPath, [ORCHESTRATEUR, '--racines-par-defaut'], {
    encoding: 'utf8',
  });
  return JSON.parse(sortie) as string[];
}

describe('les racines compilées par défaut', () => {
  it('nomment EXACTEMENT les cours attendus — le gate de la permission morte', () => {
    expect(lireRacinesParDefaut()).toEqual(RACINES_ATTENDUES);
  });

  it('désignent toutes un dossier RÉEL du dépôt', () => {
    // Le cas qu'on attrape ici est la faute de frappe, pas l'oubli : une racine par défaut absente
    // est TOLÉRÉE par `build.mjs` (code 0), donc invisible partout ailleurs.
    for (const racine of lireRacinesParDefaut()) {
      expect(statSync(racine, { throwIfNoEntry: false })?.isDirectory(), racine).toBe(true);
    }
  });

  it('refuse de se combiner à une autre option — il imprime, il ne construit pas', () => {
    // Sans ce refus, `--racines-par-defaut --racine X` imprimerait la liste et sortirait en 0 :
    // l'appelant croirait avoir construit. Même garde que `valider.mjs --modules-actionnables`.
    expect(() =>
      execFileSync(
        process.execPath,
        [ORCHESTRATEUR, '--racines-par-defaut', '--racine', 'content/cours/php'],
        { encoding: 'utf8', stdio: 'pipe' },
      ),
    ).toThrow();
  });
});
