// =============================================================================
// LE CONTRAT DU CONTENU COMPILÉ — un seul fichier, trois consommateurs
// -----------------------------------------------------------------------------
// POURQUOI CE FICHIER EXISTE.
// `content/**` est écrit par la boucle CONTENU (professeur-web / verificateur-
// theorie) ; `src/app/**` est écrit par la boucle LIVRAISON. Entre les deux, le
// pipeline de build produit un JSON par leçon. Ce fichier est la SEULE
// description de ce JSON : E2-ST2 (page de leçon), E2-ST4 (blocs de code) et
// E2-ST6 (quiz/simulation) s'y réfèrent, et le compilateur `compiler-markdown.mjs`
// s'y conforme sous `checkJs`. Trois représentations du même contrat existent
// encore (ce fichier, les schémas Ajv, le Markdown réel) — le test `satisfies`
// du lot 5 réduit l'écart, il ne l'élimine pas.
//
// POURQUOI DES DÉCLARATIONS GLOBALES (ni `export`, ni `import`).
// Le fichier est repris VERBATIM du plan arrêté d'E2-ST1 ; y ajouter des `export`
// en ferait un module et changerait la façon dont il se cite. Il est listé
// NOMINATIVEMENT dans `tsconfig.tools.json`, donc ses types sont visibles de tout
// l'outillage sans import.
//
// ✅ LA REPRISE CÔTÉ ANGULAR EST FAITE (E2-ST2, lot A) : ce même fichier est
// désormais listé NOMINATIVEMENT dans `tsconfig.app.json` ET `tsconfig.spec.json`.
// Les trois programmes lisent donc LA MÊME déclaration — aucune copie du contrat
// n'existe sous `src/`, et il n'y en aura pas (L-016). Le raisonnement du choix,
// et ce qu'il coûte (types ambiants côté application), est écrit dans
// `tsconfig.app.json` ; que les deux entrées soient réellement compilées est
// épinglé par `src/configuration-typescript.spec.ts`.
//
// CONVENTIONS MARKDOWN ASSOCIÉES — voir l'en-tête de `compiler-markdown.mjs` :
// conteneurs `:::` en liste fermée, `[[quiz]]` / `[[simulation]]` pour les ancres,
// `::::` pour un `comparaison` qui en imbrique d'autres.
// =============================================================================

type Langage = 'php' | 'csharp' | 'typescript' | 'sql' | 'bash' | 'json';
type NiveauTitre = 2 | 3; // <h2>/<h3> réels — pour un sommaire imbriqué correct (E2-ST2)

interface AnnotationLigne {
  ligne: number;
  texte: string;
}

interface ExempleCode {
  htmlColore: string; // Shiki, transformerStyleToClass — 0 attribut style=
  annotations: AnnotationLigne[]; // peut être vide, jamais absente
}

type BlocContenu =
  | { type: 'prose'; html: string }
  | { type: 'code'; langage: Langage; htmlColore: string }
  | {
      // Remplace l'appariement implicite « le corrigé qui suit » de la v1.
      type: 'comparaison';
      // `T[]` et non `Array<T>` : seule divergence de FORME avec le plan arrêté, imposée par la
      // règle ESLint `@typescript-eslint/array-type` du dépôt. Le type est identique.
      exemples: { langage: Langage; vulnerable: ExempleCode; corrige: ExempleCode }[];
    }
  | {
      // ═══ VERDICT DE LA SONDE — BRANCHE B, MESURÉE LE 2026-08-16 ══════════════
      // `src/sonde-sanitizer-svg.spec.ts` a monté un composant liant un SVG `mmdc`
      // réaliste (`htmlLabels: false`) en `[innerHTML]`, sur Angular 22.1, et a
      // compté les survivants :
      //
      //     svg 1→0 · title 1→0 · desc 1→0 · defs 1→0 · marker 1→0 · clipPath 1→0
      //     rect 3→0 · path 2→0 · g 7→0 · text 2→0 · tspan 4→0
      //     TOTAL : 24 éléments → 0 · 71 attributs → 0
      //
      // Le sanitizer d'Angular n'admet PAS SVG : il efface la totalité de la
      // structure et ne laisse que le texte des étiquettes, en vrac. Un diagramme
      // lié directement serait donc illisible, ET sans `<title>`/`<desc>` (WCAG
      // 1.1.1 non tenu). La branche A est fermée.
      //
      // CE QU'E2-ST2 DOIT FAIRE, ET SOUS QUELLES CONDITIONS :
      //   · `bypassSecurityTrustHtml` est INÉVITABLE, mais SCOPÉ À CE SEUL TYPE DE
      //     BLOC — jamais une méthode générique appliquée à du HTML de contenu ;
      //   · il porte une JUSTIFICATION ÉCRITE NOMINATIVE au point d'appel, sur le
      //     patron de `HACHAGE_SCRIPT_ATTENDU`. Cette justification est CI-DESSOUS,
      //     et elle décrit ce qui est RÉELLEMENT APPLIQUÉ — ni plus, ni moins ;
      //   · une revue `security-reviewer` est OBLIGATOIRE avant le merge d'E2-ST2.
      //
      // CE QUI EST RÉELLEMENT APPLIQUÉ À CE `svg`, ET QUI AUTORISE LE BYPASS.
      // Ce champ est produit à la COMPILATION par `rendre-mermaid.mjs`, jamais reçu
      // à l'exécution, et il a traversé un ANALYSEUR XML RÉEL (jsdom, contentType
      // `image/svg+xml`) — pas un jeu de motifs. La v1 surveillait cinq regex, et
      // une revue de sécurité a prouvé que `<a xlink:href="javascript:…">`,
      // `<use href="https://…">` et `<animate attributeName="href">` traversaient
      // intacts : cette note promettait alors PLUS que le code n'appliquait.
      // Ce qui est appliqué aujourd'hui, nominativement :
      //   · LISTE BLANCHE D'ÉLÉMENTS (`ELEMENTS_AUTORISES`) — tout élément absent
      //     fait ÉCHOUER le build en se nommant ; `<a>`, `<use>`, `<image>`,
      //     `<animate>`, `<animateTransform>`, `<animateMotion>`, `<set>`,
      //     `<script>` et `<foreignObject>` sont en outre refusés NOMMÉMENT ;
      //   · LISTE BLANCHE D'ATTRIBUTS (`ATTRIBUTS_AUTORISES`) + les seuls préfixes
      //     `data-` et `aria-` ; tout `on…` est refusé ;
      //   · `href` / `xlink:href` ADMIS UNIQUEMENT si la valeur commence par `#`
      //     (référence interne) — aucune URL externe, aucun `javascript:` ;
      //   · `<style>` et l'attribut `style=` sont RETIRÉS (Mermaid en émet
      //     toujours ; la CSP du site est à hachages — S-005) ;
      //   · CONTRÔLE DE CONSERVATION : la sortie finale est RE-PARSÉE par le même
      //     analyseur (0 refus, 0 retrait restant), y compris tout SVG relu du
      //     cache et tout `svg` de l'AST compilé (`controlerSvgCompiles`).
      // Le sanitizer d'Angular ne repassera PAS derrière : cet analyseur est le
      // SEUL filtre. Élargir une de ces listes se fait dans `rendre-mermaid.mjs`,
      // nominativement, et exige une revue — pas un `//` dans ce fichier.
      //
      // La sonde reste versionnée comme TRIPWIRE : si une montée d'Angular
      // réadmettait SVG, elle rougirait — et cette note deviendrait fausse au même
      // instant, au même endroit.
      // ═════════════════════════════════════════════════════════════════════════
      type: 'mermaid';
      // Passé à l'analyseur à liste blanche de `rendre-mermaid.mjs` (voir la note ci-dessus),
      // avec `htmlLabels: false` forcé côté mermaid-cli. La racine porte en plus la classe
      // `diagramme-mermaid`, seul crochet de `src/styles/_mermaid-generee.scss`, et tous ses
      // identifiants sont préfixés par l'empreinte de L'OCCURRENCE (fichier + rang + code, et
      // NON du seul code — deux diagrammes identiques dans une même leçon partageraient sinon
      // leurs `id`) : deux diagrammes d'une même page ne peuvent donc pas se disputer un
      // `url(#…)` ni un `aria-describedby`.
      svg: string;
      titreAccessible: string; // nom accessible court, role="img"
      descriptionLongue: string; // équivalent textuel complet (WCAG 1.1.1)
    }
  | { type: 'encadre'; variante: 'attention' | 'note' | 'a-retenir'; blocs: BlocContenu[] }
  | { type: 'ancre-quiz' }
  | { type: 'ancre-simulation' };

interface SectionCompilee {
  titre: string;
  ancre: string; // kebab-case, unique dans la leçon — pour E2-ST2 (sommaire ancré)
  niveau: NiveauTitre;
  blocs: BlocContenu[];
}

interface LeconCompilee {
  frontmatter: {
    titre: string;
    slug: string;
    sujet: string;
    ordre: number;
    niveau: string;
    dureeEstimee: number;
    objectifs: string[];
    prerequis: string[];
    fichesSources: string[];
    cree: string;
    maj: string;
    statut: 'brouillon' | 'verifiee' | 'publiee';
  };
  sections: SectionCompilee[];
}

interface EntreeManifesteRoutes {
  sujet: string;
  slug: string;
  ordre: number;
  titre: string;
  dureeEstimee: number;
  niveau: string;
  statut: 'brouillon' | 'verifiee' | 'publiee';
  // AUCUN champ `factice` : la leçon-témoin ne peut plus atteindre ce manifeste.
}

// -----------------------------------------------------------------------------
// LA CARTE DE CHARGEMENT — pourquoi AUCUN type ne la décrit ici
// -----------------------------------------------------------------------------
// Il y avait ici un `CarteChargementLecons` qui décrivait la carte « telle qu'E2-ST2
// la voudrait », avec un avertissement disant qu'aucun fichier ne la portait. E2-ST2
// (lot A) l'a SUPPRIMÉ plutôt que corrigé : un type que rien n'implémente et que
// personne n'importe est la faute L-016 elle-même, et le maintenir à jour serait un
// travail sans lecteur.
//
// CE QUI EST VRAI AUJOURD'HUI. `generer-manifeste.mjs` écrit dans
// `src/content-generated/carte-lecons.ts` :
//     export type ChargeurLecon = () => Promise<{ default: unknown }>;
// et il continue de l'écrire ainsi APRÈS le rapatriement du contrat. Le `unknown`
// n'est plus une conséquence de la frontière entre programmes — elle est tombée —
// mais un choix qui tient à l'import JSON : TypeScript infère `statut: string` d'un
// `import('./lecons/x.json')`, ce qui n'est PAS assignable à l'union
// `'brouillon' | 'verifiee' | 'publiee'` du frontmatter. Typer le `default` en
// `LeconCompilee` ferait donc échouer la compilation du fichier généré.
//
// LA FRONTIÈRE EST DONC À LA CONSOMMATION, et c'est le bon endroit : la page de
// leçon (E2-ST2, lot B) reçoit un `unknown` venu d'un fichier sur disque et le
// rétrécit explicitement en `LeconCompilee`. Un contrôle écrit vaut mieux qu'un
// `as` posé dans un générateur que personne ne relit.
// -----------------------------------------------------------------------------
