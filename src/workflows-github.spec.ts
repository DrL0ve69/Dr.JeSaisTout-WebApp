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

import { existsSync, readFileSync } from 'node:fs';
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
