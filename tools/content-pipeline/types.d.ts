// =============================================================================
// LE CONTRAT DU CONTENU COMPILÉ — un seul fichier, trois consommateurs
// -----------------------------------------------------------------------------
// POURQUOI CE FICHIER EXISTE.
// `content/**` est écrit par la boucle CONTENU (professeur-web / verificateur-
// theorie) ; `src/app/**` est écrit par la boucle LIVRAISON. Entre les deux, le
// pipeline de build produit un JSON par leçon. Ce fichier est la SEULE
// description de ce JSON : E2-ST2 (page de leçon), E2-ST3 (quiz), E2-ST4 (blocs de
// code) et E2-ST6 (simulation) s'y réfèrent, et le compilateur `compiler-markdown.mjs`
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

/**
 * UNE remarque de l'auteur, et la PORTÉE sur laquelle elle s'applique.
 *
 * ⚠️ FORME CHANGÉE EN E2-ST4 (lot A1) : `ligne: number` est devenu `lignes: number[]`.
 * `{lignes="1,2"}` poussait auparavant DEUX annotations portant le même `texte` — la même phrase
 * répétée sous deux étiquettes, comme si l'auteur avait écrit deux commentaires. Une remarque qui
 * couvre deux lignes est UNE remarque à deux ancres, pas deux remarques.
 *
 * INVARIANTS, tous imposés par `lireExemple`/`lirePortee` (`compiler-markdown.mjs`) :
 *   · jamais vide — l'absence de `{lignes="…"}` vaut `[0]` ;
 *   · entiers >= 0, sans doublon, triés par ordre croissant ;
 *   · `[0]` = l'annotation porte sur le bloc ENTIER (convention tranchée en E2-ST1). `0` ne se
 *     combine avec aucun numéro de ligne, et aucune ligne réelle ne porte le numéro 0 ;
 *   · 🔴 chaque numéro EXISTE dans l'extrait annoté — et c'est le seul invariant de cette liste
 *     qu'aucun consommateur de l'artéfact ne peut revérifier, parce qu'`ExempleCode` ne conserve
 *     pas le code brut (voir ci-dessous). Il se tient au compilateur, ou il ne se tient pas.
 */
interface AnnotationLigne {
  lignes: number[];
  texte: string;
}

/**
 * ⚠️ `htmlColore` EST LA SEULE FORME DU CODE QUI SURVIT À LA COMPILATION — le code brut n'est PAS
 * conservé. C'est délibéré (rien en aval n'a à recolorer quoi que ce soit), mais la conséquence se
 * paie sur `annotations` : la borne « la ligne N existe » n'est vérifiable QUE dans le compilateur.
 * Un contrôle écrit côté application ne pourrait que la déduire du balisage de Shiki, donc promettre
 * une garantie dérivée de l'artéfact qu'elle contrôle — le patron que S-005 et S-009 refusent.
 */
interface ExempleCode {
  htmlColore: string; // Shiki, transformerStyleToClass — 0 attribut style=
  // ⚠️ 0 OU 1 ÉLÉMENT EN PRATIQUE — le type promet N, `lireExemple` n'en produit jamais deux.
  // Depuis E2-ST4 (lot A1), toute la prose d'un volet est JOINTE en un seul `texte` et poussée en
  // UNE annotation ; la syntaxe n'offre qu'un `{lignes="…"}` par volet, donc une seule portée à
  // attribuer. Le tableau et le `@for` du rendu ne sont pas de l'anticipation gratuite : c'est le
  // LOT B (« annotations ancrées à la ligne ») qui fera sauter la limite, en attachant une portée
  // à chaque paragraphe du volet. Écrit ici pour qu'il ne le découvre pas en chemin — un
  // consommateur qui compterait sur « au plus une » se casserait ce jour-là.
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

// -----------------------------------------------------------------------------
// LE QUIZ — miroir de `schemas/quiz.schema.json`, émis DANS la leçon (E2-ST3, lot B)
// -----------------------------------------------------------------------------
// POURQUOI LE QUIZ VOYAGE DANS LA LEÇON, ET NON DANS SON PROPRE FICHIER.
// Il s'affiche sur la page de leçon, à l'ancre `[[quiz]]` — donc au même instant que
// le corps, dans le même chunk. Un second import paresseux ferait un aller-retour
// réseau de plus pour une donnée dont on sait, avant même de charger la page, qu'elle
// sera lue. `LeconCompilee.quiz` est OBLIGATOIRE, comme `quiz.json` l'est pour toute
// leçon (`valider.mjs` §8) : une leçon sans quiz n'existe pas, et un champ optionnel
// aurait laissé le composant traiter un cas que le contrat interdit.
//
// LE QUIZ EST PASSÉ FIDÈLEMENT — UNE SEULE CHOSE EST AJOUTÉE AU BUILD.
// `trouver-la-faille` reçoit un `htmlColore` produit par le MÊME colorateur Shiki que
// les blocs de code du corps, pour la même raison qu'eux : la coloration se précompile,
// le navigateur ne reçoit jamais Shiki, et la couleur sort en CLASSES (`clr-…`) parce
// que la CSP du site est à hachages. Le `code` brut reste à côté — c'est lui qui porte
// la numérotation des lignes (`ligneFautive`) et le texte accessible.
//
// ⚠️ CE `code` EST VOLONTAIREMENT VULNÉRABLE (`.claude/rules/security.md` §4). Il n'est
// jamais exécuté, et son `htmlColore` NE PASSE PAS par le `bypassSecurityTrustHtml`
// d'E2-ST2 — celui-ci reste scopé au seul bloc `mermaid`. Ce qui le rend sûr, MESURÉ et non
// supposé : Shiki échappe « < » en « &#x3C; » et laisse « > » brut — un échappement partiel,
// mais suffisant, puisque sans « < » aucune balise ne peut s'OUVRIR. La leçon-témoin porte une
// charge `<script>` et un `onerror=`, et `src/pipeline-contenu-compilation.spec.ts` exige qu'il
// ne reste aucun « < » une fois retirées les balises que Shiki émet. Le sanitizer d'Angular
// repassera en outre derrière, côté composant.
//
// CE QUI N'EST **PAS** ÉMIS : `ficheSource`. Le schéma l'exige sur chaque question de la
// SOURCE (traçabilité du savoir, `contenu-pedagogique.md` §5) et `valider.mjs` le contrôle ;
// mais c'est un chemin vers une KnowledgeBase privée, que le navigateur ne peut pas ouvrir.
// La voie publiée vers les sources est la section « Aller plus loin » de la leçon. Le champ
// est donc retiré à l'émission — l'absence ici est le contrat, pas un oubli.
//
// LES `id` DEVIENNENT DES `id` DE DOCUMENT, PRÉFIXÉS PAR `quiz-`. Une question `q3` est
// rendue sous l'`id` `quiz-q3` (`PREFIXE_ID_QUESTION`, `src/app/features/cours/contenu-compile.ts`).
// Le préfixe n'est pas décoratif : sans lui, un `id` de question et une ancre de section
// écrite par l'auteur se disputeraient le même espace de noms. Il est VÉRIFIÉ, pas seulement
// écrit — `lireLeconCompilee` refuse une leçon où `quiz-<id>` heurte une ancre existante.
// -----------------------------------------------------------------------------

interface ChoixDeQuestion {
  id: string; // kebab-case, unique dans la question
  texte: string;
}

interface PaireDAssociation {
  gauche: string;
  droite: string;
}

/** Les QUATRE types du schéma — union fermée, discriminée par `type`. */
type QuestionQuiz =
  | {
      type: 'choix-multiple';
      id: string; // kebab-case, unique dans le quiz
      question: string;
      choix: ChoixDeQuestion[];
      bonneReponse: string; // `id` d'un des `choix` — appartenance vérifiée par `valider.mjs`
      explication: string;
    }
  | {
      type: 'vrai-faux';
      id: string;
      affirmation: string;
      bonneReponse: boolean;
      justification: string; // le pendant d'`explication` : la raison, jamais le seul verdict
    }
  | {
      type: 'associer';
      id: string;
      consigne: string;
      paires: PaireDAssociation[];
      explication: string;
    }
  | {
      type: 'trouver-la-faille';
      id: string;
      consigne: string;
      langage: Langage;
      // Les DEUX sont gardés, et c'est délibéré : `code` est la source de vérité de la
      // numérotation des lignes et du texte accessible ; `htmlColore` n'est que sa mise
      // en couleur, ajoutée au build (voir la note ci-dessus).
      code: string; // lignes séparées par `\n`, numérotation dès 1
      htmlColore: string; // Shiki, transformerStyleToClass — 0 attribut style=
      ligneFautive: number; // désigne une ligne existante de `code` — vérifié par `valider.mjs`
      faille: string;
      explication: string;
      correction: string;
    };

interface QuizCompile {
  lecon: string; // slug de la leçon — RE-vérifié à l'émission (un quiz mal apparié serait muet)
  titre: string;
  melanger?: boolean; // absent = le composant décide (E2-ST3, lot C)
  questions: QuestionQuiz[];
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
  /** Obligatoire — voir la note du quiz ci-dessus. Rendu à l'ancre `[[quiz]]` du corps. */
  quiz: QuizCompile;
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
