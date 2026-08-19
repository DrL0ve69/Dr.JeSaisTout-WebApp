// =============================================================================
// SONDE — que survit-il de la sortie SHIKI au sanitizer d'Angular ?
// (E2-ST4, lot A2 · « mesurer avant de concevoir »)
// -----------------------------------------------------------------------------
// POURQUOI CE FICHIER EXISTE.
// Le lot B doit ancrer une annotation À SA LIGNE. Pour cela il faut un CROCHET
// par ligne dans le HTML coloré — une classe, un `id`, un `data-*`, un
// `aria-describedby` — posé par un transformateur Shiki `line` à la compilation.
// Ce crochet ne sert à rien s'il ne survit pas au trajet : `rendu-blocs.ts` pose
// `htmlColore` par `[innerHTML]`, SANS `bypassSecurityTrustHtml` (le seul du
// dépôt reste scopé au bloc `mermaid`). Le sanitizer d'Angular passe donc dessus,
// et il retire ce qu'il ne connaît pas — EN SILENCE.
//
// ⚠️ ON NE LE SUPPOSE PAS, PARCE QU'ON S'EST DÉJÀ TROMPÉ. `sonde-sanitizer-svg.spec.ts`
// a mesuré 24 éléments → 0 et 71 attributs → 0 sur un SVG Mermaid : le sanitizer
// n'est pas un filtre poli, c'est une liste blanche stricte. Concevoir le
// transformateur `line` sur une intuition, c'est risquer un lot B qui compile
// vert, s'affiche sans crochet, et dont l'ancrage n'existe que dans l'artéfact.
//
// ═══ VERDICT, MESURÉ LE 2026-08-18 SUR ANGULAR 22.1 ═══════════════════════════
//
//     class             15 → 15   ✅   survit
//     tabindex           3 →  3   ✅   survit (⚠️ voir la note de mise à jour ci-dessous)
//     aria-describedby   3 →  3   ✅   survit
//     aria-label         3 →  3   ✅   survit
//     id                 3 →  0   ❌   EFFACÉ
//     data-ligne         3 →  0   ❌   EFFACÉ
//
// ⚠️ MISE À JOUR DU 2026-08-18 (lot B, constat de revue) — LE CHIFFRE DE `tabindex`
// A BOUGÉ, ET CE N'EST PAS UN ASSOUPLISSEMENT. Il valait « 4 → 4 » : les 3 que
// cette sonde injecte par ligne, PLUS celui que Shiki posait lui-même sur son
// `<pre>`. Ce dernier a été RETIRÉ à la compilation (transformateur
// `drjst-pre-sans-tabindex`, `compiler-markdown.mjs`) parce que le lot B2 avait
// remonté le défilement dans le gabarit (`div.defileur`) : le `<pre>` n'avait plus
// rien à faire défiler et son `tabindex` était devenu un arrêt de tabulation MORT —
// 16 arrêts au lieu de 8 sur la leçon-témoin prerendue. Le tripwire reste donc
// exact : « 3 → 3 » est la mesure d'AUJOURD'HUI, et le `nbLignes` (et non
// `nbLignes + 1`) du contrôle positif ci-dessous est ce qui prouve que le `<pre>`
// n'en porte plus. Si Shiki, ou notre transformateur, en remettait un, ce fichier
// rougit.
//
// 🔴 LE PRÉCÉDENT DU SVG AVAIT RAISON D'INTERDIRE DE SUPPOSER : `data-*` et `id`
// ne survivent PAS. Le sanitizer d'Angular n'a pas de règle « les attributs de
// données sont inoffensifs » — sa liste blanche est NOMINATIVE, et ni `id` ni le
// préfixe `data-` n'y sont. Un transformateur `line` qui aurait écrit
// `data-ligne="3"` — le premier réflexe, et le plus lisible en CSS — aurait
// produit un artéfact correct, une leçon prerendue sans le moindre crochet, et
// aucun gate rouge : le HTML compilé porte l'attribut, seul le DOM ne l'a plus.
//
// CE QUE LE LOT B A DONC LE DROIT D'ÉCRIRE :
//   · le crochet de ligne est une CLASSE (`class="line ancre-ligne-3"`) — c'est le seul
//     véhicule de donnée qui traverse ;
//   · l'ancrage ACCESSIBLE reste possible, et c'est le constat le moins attendu :
//     `aria-describedby` traverse. La cible du lien, elle, ne peut PAS vivre dans
//     le HTML injecté (son `id` y serait effacé) — elle doit être écrite dans le
//     GABARIT de `rendu-blocs.ts`, qui ne traverse aucun sanitizer. Une ligne
//     colorée peut donc pointer vers sa note ; l'inverse (une note pointant une
//     ligne par `href="#note-3"`) est impossible.
//

// LE CONTRÔLE POSITIF (L-019). « Rien ne survit » est vrai d'un fragment vide,
// d'un composant qui ne rend rien et d'un comptage cassé. Le premier test prouve
// donc que le fragment MESURÉ porte bien les attributs candidats AVANT rendu — si
// quelqu'un casse l'enrichissement, c'est ce test-là qui rougit, pas la conclusion,
// qui deviendrait muette.
//
// LE FRAGMENT N'EST PAS ÉCRIT À LA MAIN. Il sort du COMPILATEUR RÉEL, exécuté sur
// la fixture `temoin-minimal` : c'est la sortie de `createHighlighter` +
// `transformerStyleToClass`, avec les deux thèmes et `defaultColor: false` du
// dépôt. Un fragment recopié se périmerait à la première montée de Shiki sans que
// personne ne le remarque — et la conclusion tirée d'un fragment périmé ne vaut
// pour aucun artéfact réellement publié.
//
// POURQUOI PAR PROCESSUS FILS, ET NON PAR IMPORT : même raison que
// `pipeline-contenu-compilation.spec.ts` — le compilateur est un `.mjs` du
// troisième programme TypeScript (`tsconfig.tools.json`), et l'importer depuis un
// spec Angular franchirait la frontière que `configuration-typescript.spec.ts`
// défend.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ChangeDetectionStrategy, Component, SecurityContext, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';

const COMPILATEUR = 'tools/content-pipeline/compiler-markdown.mjs';
const FIXTURE_TEMOIN = 'tools/content-pipeline/__fixtures__/temoin-minimal';

/** Shiki charge de vraies grammaires TextMate au premier appel — lent, mais une seule fois. */
const DELAI = 60_000;

/**
 * Les attributs CANDIDATS au crochet de ligne du lot B, et la raison de chacun.
 * `class` et `tabindex` sont déjà émis par Shiki aujourd'hui ; les quatre autres
 * sont ce que le transformateur `line` POURRAIT écrire. On les mesure ensemble
 * parce qu'une réponse par attribut est ce qui permet de choisir.
 */
const CANDIDATS = [
  'class', // Shiki l'émet déjà (`line`, `clr-…`) — le crochet le plus simple
  'id', // ancrage accessible : `aria-describedby` d'une ligne vers sa note
  'data-ligne', // sélecteur CSS lisible, sans analyse de chaîne de classes
  'aria-describedby', // le lien accessible lui-même, s'il survit
  'aria-label', // témoin ARIA : un nom accessible sur la ligne
  'tabindex', // témoin d'atteignabilité au clavier — et compteur du `<pre>` (voir l'en-tête)
] as const;

/** Composant nu : rien d'autre que la liaison qu'écrit déjà `rendu-blocs.ts`. */
@Component({
  selector: 'app-sonde-shiki',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="cible" [innerHTML]="fragment()"></div>',
})
class SondeShiki {
  readonly fragment = input.required<string>();
}

interface QuestionLue {
  type: string;
  htmlColore?: string;
}

/**
 * Compile la fixture minimale et rend le `htmlColore` de sa question
 * `trouver-la-faille` — le seul code coloré de cette fixture, et un vrai : trois
 * lignes de PHP portant la charge `<script>alert('XSS')</script>`.
 */
function htmlColoreReel(): string {
  const bac = mkdtempSync(join(tmpdir(), 'drjst-sonde-shiki-'));
  try {
    const sortie = execFileSync(
      process.execPath,
      [COMPILATEUR, '--racine', FIXTURE_TEMOIN, '--css', join(bac, 'c.scss'), '--json'],
      { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: DELAI },
    );
    const donnees = JSON.parse(sortie) as {
      lecons: { quiz: { questions: QuestionLue[] } }[];
    };
    const question = donnees.lecons
      .flatMap((lecon) => lecon.quiz.questions)
      .find((q) => q.type === 'trouver-la-faille' && q.htmlColore !== undefined);
    if (question?.htmlColore === undefined) {
      throw new Error('la fixture minimale ne porte plus de question « trouver-la-faille » colorée');
    }
    return question.htmlColore;
  } finally {
    rmSync(bac, { recursive: true, force: true });
  }
}

/**
 * Pose sur CHAQUE ligne les attributs candidats que le transformateur `line`
 * n'écrit PAS — `id`, `data-ligne`, `aria-describedby`, `aria-label`, `tabindex`.
 *
 * ⚠️ LA CLASSE, ELLE, N'EST PAS INJECTÉE : elle vient déjà du compilateur réel
 * (`class="line ancre-ligne-3"`). C'est ce qui fait de cette sonde autre chose qu'une
 * expérience de laboratoire — le crochet réellement publié traverse le sanitizer
 * dans la même mesure que les candidats qu'on lui compare. La substitution
 * s'accroche donc à `class="line…"` sans supposer ce qui suit : c'est exactement
 * l'hypothèse qui a rougi ici quand le transformateur du lot A2 est entré.
 */
function enrichirLignes(html: string): { enrichi: string; nbLignes: number } {
  let numero = 0;
  const enrichi = html.replace(/<span class="(line[^"]*)">/g, (_tout, classes: string) => {
    numero += 1;
    const n = String(numero);
    return (
      `<span class="${classes}" id="repere-${n}" data-ligne="${n}" ` +
      `aria-describedby="note-${n}" aria-label="Ligne ${n}" tabindex="-1">`
    );
  });
  return { enrichi, nbLignes: numero };
}

/**
 * Compte, sous une racine (racine EXCLUE), combien d'éléments portent chaque
 * attribut candidat. L'exclusion de la racine n'est pas un détail : côté rendu,
 * c'est le `<div class="cible">` du composant, qui n'a jamais traversé le
 * sanitizer — l'y compter ajouterait un `class` fantôme à la mesure « après ».
 */
function compterAttributs(racine: Element): Record<string, number> {
  const comptes: Record<string, number> = Object.fromEntries(
    CANDIDATS.map((nom) => [nom, 0] as const),
  );
  const visiter = (element: Element): void => {
    for (const nom of CANDIDATS) {
      if (element.hasAttribute(nom)) comptes[nom] = (comptes[nom] ?? 0) + 1;
    }
    for (const enfant of Array.from(element.children)) visiter(enfant);
  };
  for (const enfant of Array.from(racine.children)) visiter(enfant);
  return comptes;
}

/** Analyse un fragment HORS d'Angular — l'étalon du comptage « avant ». */
function compterAvant(html: string): Record<string, number> {
  const porteur = document.createElement('div');
  porteur.innerHTML = html;
  return compterAttributs(porteur);
}

/** Monte le composant et compte ce que le sanitizer a laissé dans le DOM. */
async function compterApres(
  html: string,
): Promise<{ comptes: Record<string, number>; htmlRendu: string }> {
  const fixture = TestBed.createComponent(SondeShiki);
  fixture.componentRef.setInput('fragment', html);
  await fixture.whenStable();

  const cible = (fixture.nativeElement as HTMLElement).querySelector('.cible');
  if (cible === null) throw new Error('la sonde n’a pas rendu son élément cible');
  return { comptes: compterAttributs(cible), htmlRendu: cible.innerHTML };
}

describe('Sonde — le sanitizer d’Angular face à la sortie de Shiki', () => {
  let brut = '';
  let enrichi = '';
  let nbLignes = 0;

  beforeAll(() => {
    brut = htmlColoreReel();
    ({ enrichi, nbLignes } = enrichirLignes(brut));
  }, DELAI);

  it('CONTRÔLE POSITIF : le fragment mesuré est bien la sortie réelle de Shiki, enrichie', () => {
    // Sans ces trois-là, tout ce qui suit serait vrai d'une chaîne vide — et la
    // conclusion « `data-*` ne survit pas » serait aussi vraie d'un fragment qui
    // n'en a jamais porté (L-019).
    expect(brut).toMatch(/^<pre class="shiki/);
    expect(brut).toContain('class="clr-');
    expect(nbLignes).toBe(3);

    // Et le crochet du lot B est bien celui que le compilateur POSE aujourd'hui —
    // pas une forme inventée par cette sonde (E2-ST4, lot A2 : `transformateurLigne`).
    expect(brut).toContain('<span class="line ancre-ligne-1">');
    expect(brut).toContain('<span class="line ancre-ligne-3">');

    // Et le `<pre>` NE PORTE PLUS de `tabindex` — le transformateur
    // `drjst-pre-sans-tabindex` le retire (lot B). C'est mesuré sur la sortie du
    // compilateur RÉEL, donc ce n'est pas une recopie qui le dit.
    expect(brut).not.toMatch(/<pre[^>]*\stabindex=/);

    // Le fragment enrichi porte donc UN attribut de chaque famille PAR LIGNE, et
    // `tabindex` EXACTEMENT `nbLignes` : c'était `nbLignes + 1` tant que Shiki
    // laissait le sien sur `<pre>`. Ce « + 1 » disparu est l'arrêt de tabulation
    // mort en moins.
    const avant = compterAvant(enrichi);
    expect(avant['id']).toBe(nbLignes);
    expect(avant['data-ligne']).toBe(nbLignes);
    expect(avant['aria-describedby']).toBe(nbLignes);
    expect(avant['aria-label']).toBe(nbLignes);
    expect(avant['tabindex']).toBe(nbLignes);
    expect(avant['class']).toBeGreaterThan(nbLignes);
  });

  it('MESURE : compte les attributs survivants après passage par `[innerHTML]`', async () => {
    const avant = compterAvant(enrichi);
    const { comptes: apres } = await compterApres(enrichi);

    // ⚠️ MESURÉ, ET CONTRAIRE À CE QUE CROYAIT `sonde-sanitizer-svg.spec.ts` : le
    // lanceur d'Angular 22 n'affiche ce compte-rendu QUE si un test du fichier
    // échoue. Sur un run vert, il est avalé. Il reste utile — c'est ce qu'on lit
    // le jour où le tripwire mord — mais il ne peut donc pas PORTER la mesure :
    // ce sont les deux tables ci-dessous qui la portent, en assertions.
    console.warn(
      [
        `Sonde sanitizer Shiki — ${String(nbLignes)} lignes, attributs avant → après :`,
        ...CANDIDATS.map(
          (nom) =>
            `  ${nom.padEnd(18)} ${String(avant[nom]).padStart(3)} → ${String(apres[nom]).padStart(3)}`,
        ),
      ].join('\n'),
    );

    // Le compte-rendu ci-dessus n'est pas décoratif : c'est lui que citent
    // l'en-tête de ce fichier et `types.d.ts`. Une conclusion consignée sans son
    // chiffre est une opinion.
    expect(avant).toEqual({
      class: 15,
      id: 3,
      'data-ligne': 3,
      'aria-describedby': 3,
      'aria-label': 3,
      tabindex: 3,
    });
    expect(apres).toEqual({
      class: 15,
      id: 0,
      'data-ligne': 0,
      'aria-describedby': 3,
      'aria-label': 3,
      tabindex: 3,
    });
  });

  it('VERDICT — `class` et les attributs ARIA traversent, `id` et `data-*` sont EFFACÉS', async () => {
    const avant = compterAvant(enrichi);
    const { comptes, htmlRendu } = await compterApres(enrichi);

    // ⚠️ TRIPWIRE. Si une future version d'Angular admettait `data-*` ou `id`, CE
    // test rougirait — et le choix de conception du transformateur `line`
    // (`compiler-markdown.mjs`), qui n'écrit QUE des classes à cause de cette
    // mesure, redeviendrait discutable au même instant. C'est voulu : la décision
    // et la mesure tombent ensemble.
    expect(comptes['id']).toBe(0);
    expect(comptes['data-ligne']).toBe(0);

    // Ce qui traverse, intégralement — aucune perte partielle, aucun attribut
    // rogné en chemin.
    expect(comptes['class']).toBe(avant['class']);
    expect(comptes['tabindex']).toBe(avant['tabindex']);
    expect(comptes['aria-describedby']).toBe(avant['aria-describedby']);
    expect(comptes['aria-label']).toBe(avant['aria-label']);

    // Contrôle positif du VERDICT : le composant n'est pas simplement vide. Le
    // balisage de Shiki est là, la charge utile de la fixture aussi — RÉÉCHAPPÉE
    // par le sanitizer, qui resérialise le `&#x3C;` de Shiki en `&lt;`. La forme
    // change, la garantie ne change pas : aucun « < » de la source ne s'ouvre.
    expect(htmlRendu).toContain('&lt;script&gt;');
    expect(htmlRendu).not.toContain('<script');

    // 🔴 CE QUE LE LOT B VIENDRA CHERCHER : l'ancre `ancre-ligne-N` du compilateur est
    // DANS LE DOM, ligne par ligne — pas seulement dans l'artéfact. C'est la seule
    // assertion de ce fichier qui porte sur le crochet réellement publié ; les
    // autres mesurent ce qu'on a renoncé à écrire.
    const ancres = [...htmlRendu.matchAll(/class="line ancre-ligne-(\d+)"/g)].map((t) => Number(t[1]));
    expect(ancres).toEqual([1, 2, 3]);
  });

  it('CONTRE-ÉPREUVE : c’est bien le SANITIZER qui retire `id` et `data-*`, pas le chemin de liaison', () => {
    // ⚠️ CE TEST A ÉTÉ RÉÉCRIT SUR UN CONSTAT DE REVUE (2026-08-18). Sa première
    // version reposait le fragment dans un `div` détaché (`innerHTML`) et concluait
    // « donc c'est le sanitizer » — or elle employait le MÊME instrument que la
    // mesure « avant », et la seule différence avec la mesure « après » était TOUT
    // le chemin de liaison d'Angular, pas le sanitizer seul. Elle nommait un
    // coupable qu'elle n'avait pas isolé.
    //
    // Ici, le sanitizer est appelé DIRECTEMENT, sur la même chaîne : plus rien
    // d'autre ne varie. Ce qui disparaît entre l'entrée et la sortie de CET appel
    // est son œuvre, et rien d'autre ne peut en être tenu responsable.
    const assainisseur = TestBed.inject(DomSanitizer);
    const assaini = assainisseur.sanitize(SecurityContext.HTML, enrichi) ?? '';

    const avant = compterAvant(enrichi);
    const apres = compterAvant(assaini);

    // Contrôle positif : l'entrée porte bien ce qu'on dit qu'elle porte.
    expect(avant['id']).toBe(nbLignes);
    expect(avant['data-ligne']).toBe(nbLignes);

    // Et le verdict, imputé au seul acteur du delta.
    expect(apres['id']).toBe(0);
    expect(apres['data-ligne']).toBe(0);
    expect(apres['class']).toBe(avant['class']);
    expect(apres['aria-describedby']).toBe(avant['aria-describedby']);
  });
});
