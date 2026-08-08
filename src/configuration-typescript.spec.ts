// =============================================================================
// La rigueur du compilateur est un CONTRAT, pas un réglage
// -----------------------------------------------------------------------------
// POURQUOI CE TEST EXISTE.
// `.claude/rules/security.md` et la barre WCAG tiennent la vérification de types
// pour acquise. Or, avant E1-ST1-F, `tsconfig.json` ne déclarait NI `strict` NI
// `strictTemplates` : le dépôt en bénéficiait quand même, parce que TypeScript 6
// et Angular 22 les activent PAR DÉFAUT. Une garantie qui ne tient qu'à un défaut
// d'outil n'est pas une garantie — elle est invisible à la lecture, et elle
// change sans prévenir à la montée de version majeure suivante.
//
// Trois options, elles, étaient réellement inactives (`noUncheckedIndexedAccess`,
// `typeCheckHostBindings`, `strictStandalone`) et les diagnostics étendus ne
// sortaient qu'en avertissement — donc invisibles dans un run vert (L-006).
//
// CE QUE CE TEST VÉRIFIE, ET POURQUOI SOUS CETTE FORME.
// Il ne relit pas `tsconfig.json` pour le comparer à lui-même (L-012) : il passe
// par `readConfiguration`, LE résolveur du compilateur Angular, celui-là même
// qu'utilise `ng build`. Il voit donc la configuration EFFECTIVE, chaîne
// `extends` déroulée. C'est ce qui compte : la faille réelle n'est pas qu'on
// retire une ligne de la base — c'est qu'un `tsconfig.app.json` ou
// `tsconfig.spec.json` la REDÉFINISSE plus bas, en silence, sans que rien ne
// rougisse. Les deux programmes sont donc vérifiés séparément.
//
// La liste attendue est écrite ICI, en dur, volontairement : c'est la POLITIQUE
// du projet. `tsconfig.json` porte le RÉGLAGE. Deux endroits indépendants — si
// l'un dérive, ce test rougit. S'ils n'en faisaient qu'un, il ne vérifierait rien.
// =============================================================================

import { readConfiguration } from '@angular/compiler-cli';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Les deux programmes réellement compilés : l'application (par `ng build`) et
 * les tests (par `ng test`). Une rigueur qui s'arrêterait aux specs laisserait
 * passer du code de production, et l'inverse laisserait pourrir les tests.
 */
const PROGRAMMES = ['tsconfig.app.json', 'tsconfig.spec.json'] as const;

/**
 * Options TypeScript exigées. `strict` est le PARAPLUIE : ses sous-options
 * (`strictNullChecks`, `noImplicitAny`…) ne sont jamais matérialisées dans la
 * configuration résolue, les affirmer une par une échouerait à tort.
 * `noUncheckedIndexedAccess` n'est PAS couverte par `strict` — c'est un ajout
 * délibéré, et le pipeline de contenu d'E2 indexera beaucoup.
 */
const OPTIONS_TYPESCRIPT = ['strict', 'noUncheckedIndexedAccess'] as const;

/**
 * Options du compilateur Angular exigées. Aucune n'est couverte par `strict` :
 * elles vivent dans `angularCompilerOptions` et se règlent séparément.
 */
const OPTIONS_ANGULAR = [
  'strictTemplates',
  'typeCheckHostBindings',
  'strictStandalone',
  'strictInjectionParameters',
  'strictInputAccessModifiers',
] as const;

describe('rigueur du compilateur', () => {
  for (const programme of PROGRAMMES) {
    describe(programme, () => {
      const { options, errors } = readConfiguration(join(process.cwd(), programme));

      it('se résout sans erreur de configuration', () => {
        // Attrape les incohérences que le compilateur refuse — par exemple
        // NG4003 : `extendedDiagnostics` configuré alors que `strictTemplates`
        // est désactivé. Sans cette assertion, une telle faute ne se verrait
        // qu'au prochain `ng build`.
        expect(errors.map((erreur) => erreur.messageText)).toEqual([]);
      });

      for (const option of [...OPTIONS_TYPESCRIPT, ...OPTIONS_ANGULAR]) {
        it(`active ${option}`, () => {
          expect(options[option]).toBe(true);
        });
      }

      it('traite les diagnostics étendus comme des erreurs', () => {
        // Leur défaut est `warning`. Un avertissement ne casse pas un build :
        // il se noie dans un run vert, et on finit par le tolérer (L-006).
        expect(options.extendedDiagnostics?.defaultCategory).toBe('error');
      });
    });
  }

  // ---------------------------------------------------------------------------
  // La frontière Node — une garantie qui n'était écrite qu'en commentaire
  // ---------------------------------------------------------------------------
  // `tsconfig.spec.json` affirmait que l'application n'inclut pas les types Node,
  // « donc aucune API Node n'est accidentellement atteignable depuis un
  // composant ». C'était faux : `tsconfig.app.json` portait `"types": ["node"]`.
  // Un `process.cwd()` dans un composant passait le typage et cassait au
  // navigateur. La séparation est maintenant affirmée des deux côtés — un
  // commentaire ne protège rien (L-008).
  describe('frontière Node', () => {
    it("n'expose aucun type ambiant à l'application", () => {
      expect(readConfiguration(join(process.cwd(), 'tsconfig.app.json')).options.types).toEqual([]);
    });

    it('expose Node aux seuls tests', () => {
      expect(readConfiguration(join(process.cwd(), 'tsconfig.spec.json')).options.types).toContain(
        'node',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Vérifier la bonne cible — sinon le test garde un fichier que personne ne compile
  // ---------------------------------------------------------------------------
  // `PROGRAMMES` est écrit en dur ci-dessus, mais c'est `angular.json` qui décide
  // quel tsconfig `ng build` et `ng test` compilent RÉELLEMENT. Repointer une
  // cible vers un troisième fichier laisserait tout ce qui précède vert pendant
  // que le build tournerait sous une configuration laxiste — la forme même de
  // L-012, sur l'autre axe.
  it('ne compile aucun programme échappant à ces vérifications', () => {
    const espaceTravail: {
      projects: Record<string, { architect?: Record<string, { options?: { tsConfig?: string } }> }>;
    } = JSON.parse(readFileSync(join(process.cwd(), 'angular.json'), 'utf8'));

    const declares = Object.values(espaceTravail.projects)
      .flatMap((projet) => Object.values(projet.architect ?? {}))
      .map((cible) => cible.options?.tsConfig)
      .filter((chemin): chemin is string => chemin !== undefined);

    const verifies: readonly string[] = PROGRAMMES;
    expect(declares.length).toBeGreaterThan(0);
    expect(declares.filter((chemin) => !verifies.includes(chemin))).toEqual([]);
  });
});
