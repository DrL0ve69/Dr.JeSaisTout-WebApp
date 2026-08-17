// =============================================================================
// LE GARDE-FOU DE PORTÉE DU CONTOURNEMENT DE SANITIZER — à l'échelle du DÉPÔT
// -----------------------------------------------------------------------------
// POURQUOI CE FICHIER EXISTE, ET POURQUOI IL N'EST PAS DANS `rendu-blocs.spec.ts`.
// `rendu-blocs.ts:271` écrit, en toutes lettres, « L'UNIQUE `bypassSecurityTrustHtml`
// DU SITE ». Le garde-fou qui était censé tenir cette promesse
// (`rendu-blocs.spec.ts`, « n'expose AUCUN contournement générique ») ne lit qu'UN
// SEUL FICHIER, et n'apparie qu'un seul receveur nommé (`this.assainisseur.`). Un
// seizième composant écrit demain, avec son propre `inject(DomSanitizer)`, aurait
// donc pu poser un seizième contournement sans faire rougir quoi que ce soit — la
// promesse était « du site », la vérification était « du fichier ».
//
// C'est le constat de la revue `security-reviewer` du 2026-08-17 (E2-ST2 lot A), et
// c'est la FAMILLE DE S-003 : un garde-fou plus étroit que la garantie qu'il énonce
// donne toutes les apparences de la rigueur. Le correctif est le même que partout
// ailleurs dans ce dépôt — on ne rétrécit pas la promesse, on élargit le contrôle.
//
// CE QUE CE FICHIER VÉRIFIE, EXACTEMENT :
//   1. il n'existe qu'UN SEUL site d'appel à `bypassSecurityTrust*` dans TOUT le code
//      applicatif, il est dans `rendu-blocs.ts`, et c'est la variante `…Html` ;
//   2. aucun AUTRE fichier applicatif ne prononce même le nom — ce qui ferme les
//      voies qu'un appariement sur `receveur.methode(` laisse ouvertes : alias
//      (`const enConfiance = s.bypassSecurityTrustHtml.bind(s)`), déstructuration,
//      ou ré-export.
//
// POURQUOI LES `*.spec.ts` SONT EXCLUS. Ils NOMMENT légitimement ces méthodes pour
// affirmer leur absence (`not.toContain('bypassSecurityTrustScript')` dans sept
// specs de composants) et `sonde-sanitizer-svg.spec.ts` mesure le sanitizer sans
// contournement. Les inclure ferait échouer ce garde-fou sur les tests qui le
// servent. La contrepartie assumée : un contournement écrit DANS un fichier de test
// n'est pas vu ici — il n'atteindrait aucun visiteur, c'est du code qui ne part pas
// en production.
//
// ⚠️ CE GARDE-FOU DOIT ÉCHOUER SI ON LE DÉPLACE. Deux contrôles positifs ci-dessous
// s'en assurent : un balayage qui ne lirait plus aucun fichier, ou qui ne lirait plus
// `rendu-blocs.ts`, sortirait « 0 contournement trouvé » — donc VERT — tout en ne
// gardant plus rien. C'est L-014 et L-019 dans le même geste : une assertion de
// non-présence sans contrôle positif ne prouve que le vide de son propre balayage.
// =============================================================================

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Le seul fichier applicatif autorisé à contourner le sanitizer, chemin depuis `src/`. */
const FICHIER_AUTORISE = 'app/features/cours/lecon/rendu-blocs/rendu-blocs.ts';

/**
 * La seule variante autorisée. Écrite ICI et non importée du composant : un test qui
 * importe la constante qu'il vérifie ne vérifie rien du contrat (L-012).
 */
const VARIANTE_AUTORISEE = 'bypassSecurityTrustHtml';

/** Le nom de famille cherché, ASSEMBLÉ à l'exécution — voir la note de `sourcesApplicatives`. */
const NOM_FAMILLE = ['bypass', 'Security', 'Trust'].join('');

/**
 * Tous les `.ts` **ET `.html`** de `src/`, spécifications exclues, chemins
 * normalisés en `/`.
 *
 * ⚠️ POURQUOI LES `.html` SONT LÀ — constat de la revue `security-reviewer` du
 * 2026-08-17, sur la PREMIÈRE version de ce fichier, qui ne lisait que les `.ts`.
 * Ce dépôt emploie des gabarits EXTERNES (`src/app/app.html`) autant qu'inline. Un
 * composant qui exposerait `readonly s = inject(DomSanitizer)` et écrirait
 * `s.bypassSecurityTrustHtml(x)` **dans son gabarit** aurait traversé les deux
 * assertions sans être vu : son `.ts` ne prononce jamais le nom. Le fichier
 * promettait « TOUT le code applicatif » et lisait la moitié — la faute même qu'il
 * corrige, au troisième tour de la famille S-003/S-009. Le périmètre est désormais
 * celui de `lintFilePatterns` d'`angular.json` : `src/**` en `.ts` et `.html`.
 *
 * Le nom `bypassSecurityTrust` ne figure JAMAIS d'un seul tenant dans ce fichier
 * (il est assemblé ci-dessus) : ce fichier est certes exclu du balayage par son
 * extension `.spec.ts`, mais l'écrire entier ici transformerait la moindre erreur
 * de filtre en test qui se trouve lui-même et passe pour la mauvaise raison.
 */
function sourcesApplicatives(): { chemin: string; source: string }[] {
  const racine = join(process.cwd(), 'src');
  return readdirSync(racine, { recursive: true, encoding: 'utf8' })
    .map((chemin) => chemin.replace(/\\/g, '/'))
    .filter((chemin) => chemin.endsWith('.ts') || chemin.endsWith('.html'))
    .filter((chemin) => !chemin.endsWith('.spec.ts'))
    .map((chemin) => ({ chemin, source: readFileSync(join(racine, chemin), 'utf8') }));
}

describe('portée des contournements de sanitizer, sur TOUT le dépôt', () => {
  const fichiers = sourcesApplicatives();

  // -------------------------------------------------------------------------
  // Les deux contrôles positifs — sans eux, tout le reste est vrai du vide
  // -------------------------------------------------------------------------
  it('CONTRÔLE POSITIF : le balayage lit bien du code, dont le fichier autorisé', () => {
    // Un `include` déplacé, un dossier renommé, un filtre trop gourmand : chacun
    // rendrait les assertions suivantes vertes en n'ayant rien lu (L-014).
    expect(fichiers.length).toBeGreaterThan(10);
    expect(fichiers.map((f) => f.chemin)).toContain(FICHIER_AUTORISE);
  });

  it('CONTRÔLE POSITIF : les GABARITS EXTERNES sont bien dans le balayage', () => {
    // La couverture des `.html` a besoin de sa propre preuve, sinon elle
    // disparaîtrait en silence au premier filtre maladroit — et le garde-fou
    // retomberait exactement dans le défaut que la revue du 2026-08-17 a relevé,
    // en restant vert. On exige donc qu'au moins un `.html` réel soit lu.
    const gabarits = fichiers.filter((f) => f.chemin.endsWith('.html'));
    expect(gabarits.map((f) => f.chemin)).toContain('app/app.html');
  });

  it('CONTRÔLE POSITIF : le motif d’appel trouve RÉELLEMENT le contournement connu', () => {
    // Si `preparer()` renommait son receveur ou passait par une variable locale, le
    // motif ci-dessous cesserait d'apparier — et « 0 appel hors du fichier autorisé »
    // resterait vrai sans plus rien garder (L-019).
    const autorise = fichiers.find((f) => f.chemin === FICHIER_AUTORISE);
    expect(autorise).toBeDefined();
    expect(appels(autorise?.source ?? '')).toEqual([VARIANTE_AUTORISEE]);
  });

  // -------------------------------------------------------------------------
  // La promesse elle-même
  // -------------------------------------------------------------------------
  it('ne compte qu’UN SEUL site d’appel dans tout le code applicatif', () => {
    const parFichier = fichiers
      .map((f) => ({ chemin: f.chemin, trouves: appels(f.source) }))
      .filter((f) => f.trouves.length > 0);

    // L'assertion porte sur la CARTE complète, pas sur un total : si elle échoue, le
    // message nomme le fichier fautif et la variante employée, au lieu d'annoncer
    // « attendu 1, reçu 2 » sans dire où.
    expect(parFichier).toEqual([{ chemin: FICHIER_AUTORISE, trouves: [VARIANTE_AUTORISEE] }]);
  });

  it('aucun autre fichier applicatif ne PRONONCE même le nom', () => {
    // Ferme ce qu'un appariement `receveur.methode(` laisse passer : alias, `.bind()`,
    // déstructuration, ré-export. Un fichier qui nomme la méthode sans l'appeler
    // aujourd'hui est un contournement en préparation — il doit se déclarer.
    const bavards = fichiers
      .filter((f) => f.chemin !== FICHIER_AUTORISE && f.source.includes(NOM_FAMILLE))
      .map((f) => f.chemin);

    expect(bavards).toEqual([]);
  });

  it('n’emploie AUCUNE variante autre que `…Html`, où que ce soit', () => {
    // `…Script`, `…ResourceUrl`, `…Style` et `…Url` ouvrent des surfaces que la
    // justification de `rendu-blocs.ts` ne couvre PAS : elle parle d'un SVG produit au
    // build et filtré par un analyseur à liste blanche, de rien d'autre. Une variante
    // nouvelle exige sa propre revue, pas l'héritage de celle-ci.
    const variantes = fichiers.flatMap((f) => appels(f.source));
    expect([...new Set(variantes)]).toEqual([VARIANTE_AUTORISEE]);
  });
});

/** Les variantes réellement APPELÉES dans une source, dans l'ordre du fichier. */
function appels(source: string): string[] {
  // `\.` en tête : on cherche un appel de méthode, pas la mention du nom dans un
  // commentaire — `rendu-blocs.ts` en compte une, parfaitement légitime, dans le bloc
  // qui justifie le contournement.
  const motif = new RegExp(`\\.(${NOM_FAMILLE}\\w*)\\s*\\(`, 'g');
  return [...source.matchAll(motif)].map((c) => c[1] ?? '');
}
