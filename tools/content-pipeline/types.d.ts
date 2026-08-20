// =============================================================================
// LE CONTRAT DU CONTENU COMPILÉ — un seul fichier, trois consommateurs
// -----------------------------------------------------------------------------
// POURQUOI CE FICHIER EXISTE.
// `content/**` est écrit par la boucle CONTENU (professeur-web / verificateur-
// theorie) ; `src/app/**` est écrit par la boucle LIVRAISON. Entre les deux, le
// pipeline de build produit un JSON par leçon. Ce fichier est la SEULE
// description de ce JSON : E2-ST2 (page de leçon), E2-ST3 (quiz), E2-ST4 (blocs de
// code) et E2-ST5 (simulation) s'y réfèrent, et le compilateur `compiler-markdown.mjs`
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
 * Les SIX encadrés du contrat — liste FERMÉE (E3-ST1, lot « provenance »).
 *
 * Les trois premiers sont les encadrés de TON, hérités d'E2-ST1 : ils qualifient ce que l'auteur
 * dit. Les trois derniers sont les encadrés de PROVENANCE, nés de
 * `.claude/rules/contenu-pedagogique.md` §6 : ils qualifient D'OÙ vient ce qui est dit, et c'est
 * une information dont le lecteur a besoin au moment exact où il révise un examen.
 *
 * ⚠️ `correction-du-cours` est une variante À PART ENTIÈRE, et non un attribut de `attention` :
 * `attention` signale un DANGER TECHNIQUE au lecteur, `correction-du-cours` signale un DÉSACCORD
 * SOURCÉ avec l'enseignant. Deux régimes éditoriaux — le second n'efface jamais ce que le cours
 * enseigne (c'est ce qui sera évalué) et doit citer sa source. Les fondre en une seule variante
 * ferait perdre au rendu la seule distinction qui compte pour réviser.
 *
 * AUCUN PICTOGRAMME N'EST ÉCRIT DANS LE MARKDOWN SOURCE. Les 📘 / 🧩 / ⚠️ des fiches de la
 * KnowledgeBase sont ici portés par la VARIANTE, et posés par le rendu — le validateur refuse les
 * TROIS marqueurs littéraux dans le corps d'une leçon (hors bloc de code), précisément pour qu'il
 * n'existe qu'un seul endroit où la provenance se décide.
 *
 * ⚠️ CETTE PHRASE A ÉTÉ FAUSSE JUSQU'AU 2026-08-20 : elle disait « un marqueur », le validateur
 * n'en refusait que DEUX, et le manquant était le ⚠️ — le seul qui ACCUSE l'enseignant, donc le
 * seul dont l'écriture en prose contourne l'obligation de source de `correction-du-cours`. Une
 * promesse plus large que le code appliqué est pire qu'une absence de promesse : elle dispense
 * le lecteur d'aller vérifier. Trou restant, écrit à la constante `MARQUEURS_PROVENANCE_LITTERAUX`
 * de `valider.mjs` : la règle balaie la source brute, où une entité numérique n'est pas encore
 * décodée.
 */
type VarianteEncadre =
  | 'attention'
  | 'note'
  | 'a-retenir'
  | 'cours'
  | 'complement'
  | 'correction-du-cours';

/**
 * UNE remarque de l'auteur, et la PORTÉE sur laquelle elle s'applique.
 *
 * ⚠️ FORME CHANGÉE EN E2-ST4 (lot A1) : `ligne: number` est devenu `lignes: number[]`.
 * `{lignes="1,2"}` poussait auparavant DEUX annotations portant le même `texte` — la même phrase
 * répétée sous deux étiquettes, comme si l'auteur avait écrit deux commentaires. Une remarque qui
 * couvre deux lignes est UNE remarque à deux ancres, pas deux remarques.
 *
 * ⚠️ OÙ LA PORTÉE S'ÉCRIT, DEPUIS LE LOT B1a : en TÊTE DE LA NOTE, plus sur le conteneur. Dans un
 * `::: vulnerable` / `::: corrige`, après la clôture de code, chaque paragraphe est UNE note et
 * doit ouvrir par `{lignes="…"}`. L'ancienne forme `::: vulnerable {lignes="2"}` fait désormais
 * ÉCHOUER le build (clef inconnue) : la migration se voit.
 *
 * INVARIANTS, tous imposés par `lireExemple`/`lireNote`/`lirePortee` (`compiler-markdown.mjs`) :
 *   · jamais vide — une note sans portée lisible en tête fait échouer le build, il n'y a plus de
 *     portée par défaut ;
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
  // Shiki, `transformerStyleToClass` — 0 attribut `style=`. Chaque ligne y porte en plus son ANCRE
  // `class="line ancre-ligne-N"`, N en base 1 (transformateur `drjst-ancre-de-ligne`, E2-ST4 lot A2) :
  // c'est le crochet sur lequel le lot B accroche les annotations ancrées. Le compilateur ANALYSE
  // sa sortie (jsdom, `pre.shiki > code > span.line`) et exige la suite `1…N` : un motif cherché
  // dans la chaîne aurait pu être satisfait par le TEXTE du code de l'auteur (S-003 / S-009).
  //
  // 🔴 IL Y A UNE LIGNE DE PLUS QUE DANS LA SOURCE, ET LE LOT B DOIT LE SAVOIR AVANT D'APPARIER.
  // Mesuré sur la fixture : un bloc de code du corps de leçon sort en `[1, 2, 3, 4]` pour TROIS
  // lignes écrites — markdown-it termine le contenu d'une clôture par un saut de ligne, et Shiki
  // en fait une dernière ligne VIDE, ancrée comme les autres. Le `code` d'une question de quiz,
  // qui n'a pas ce saut, sort en `[1, 2, 3]` pour trois lignes. Règle exacte :
  //
  //     nombre d'éléments `.line` === compterLignes(code) + (code se termine par un saut ? 1 : 0)
  //
  // Cette ligne surnuméraire n'est ADRESSABLE PAR AUCUNE ANNOTATION : `lirePortee` borne toute
  // portée à `compterLignes(code)`, donc `ancre-ligne-4` d'un extrait de trois lignes ne peut être
  // cité par personne. Le compilateur ne l'interdit donc pas — il exige seulement que la suite
  // soit continue et qu'il y ait AU MOINS autant d'ancres que de lignes de source. Un rendu qui
  // apparierait « la Nième ligne rendue » à « la ligne N de la source » reste juste ; un rendu qui
  // compterait les lignes rendues pour en déduire la longueur de l'extrait se tromperait d'un.
  //
  // ═══ POURQUOI UNE CLASSE, ET RIEN D'AUTRE — MESURÉ LE 2026-08-18, ANGULAR 22.1 ═════════════
  // `src/sonde-sanitizer-shiki.spec.ts` a monté cette sortie même dans un composant qui la lie en
  // `[innerHTML]`, comme `rendu-blocs.ts`, et a compté sur trois lignes :
  //
  //     class 15 → 15 · tabindex 3 → 3 · aria-describedby 3 → 3 · aria-label 3 → 3
  //     id 3 → 0 · data-ligne 3 → 0
  //
  // ⚠️ `tabindex` valait « 4 → 4 » jusqu'au lot B : le quatrième était celui que Shiki posait sur
  // son `<pre>`, devenu un arrêt de tabulation MORT depuis que le défilement vit sur `.defileur`
  // dans le gabarit. Le transformateur `drjst-pre-sans-tabindex` le retire, et `htmlColore` ne
  // porte donc AUCUN `tabindex` — l'atteignabilité au clavier appartient au gabarit, seul endroit
  // où un nom accessible survit.
  //
  // `data-*` et `id` sont EFFACÉS par le sanitizer : la liste blanche d'Angular est nominative et
  // ne connaît ni l'un ni l'autre. Un `data-ligne="3"` aurait donné un artéfact correct, une page
  // sans crochet, et aucun gate rouge. Corollaire pour le lot B : `aria-describedby` traverse, mais
  // la CIBLE du lien doit être écrite dans le GABARIT (son `id` serait effacé ici).
  htmlColore: string;
  // ✅ N ÉLÉMENTS, POUR DE VRAI DEPUIS E2-ST4 (lot B1a) — la limite « 0 ou 1 en pratique » du lot
  // A1 est tombée avec le `.join(' ')` qui la causait. UN PARAGRAPHE DU VOLET = UNE NOTE, dans
  // l'ordre du document, chacune ouvrant par sa propre portée `{lignes="…"}`. Ce que le
  // compilateur garantit à tout consommateur (`RenduBlocs` en premier) :
  //   · le tableau peut être VIDE (un volet sans prose), jamais absent ;
  //   · les notes sont dans l'ORDRE OÙ L'AUTEUR LES A ÉCRITES — jamais retriées : un volet dont
  //     les portées décroissent fait ÉCHOUER le build plutôt que de voir sa prose réordonnée ;
  //   · cet ordre est croissant par plus petite ligne de portée, `lignes: [0]` (le bloc entier)
  //     venant donc en tête ;
  //   · DEUX NOTES PEUVENT CITER LA MÊME LIGNE, et c'est voulu : deux remarques distinctes sur la
  //     même ligne sont légitimes. Aucun dédoublonnage entre notes — un rendu qui indexerait les
  //     notes PAR numéro de ligne (une note par ligne) en perdrait. `lirePortee` ne refuse le
  //     doublon qu'à l'INTÉRIEUR d'une même portée (`{lignes="1,1"}`).
  annotations: AnnotationLigne[];
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
  | {
      type: 'encadre';
      variante: VarianteEncadre;
      /**
       * Référence de la correction — RENSEIGNÉE UNIQUEMENT sur `correction-du-cours`, où elle est
       * OBLIGATOIRE et non vide (`{source="OWASP Top 10 2021 — A02"}`). Le compilateur refuse
       * l'attribut sur les cinq autres variantes et refuse son absence sur celle-ci : un ⚠️ qui
       * accuse le cours sans citer sa source salit un enseignant sur la foi d'une lecture rapide,
       * ce que `.claude/rules/contenu-pedagogique.md` §6 classe comme un défaut grave.
       */
      source?: string;
      blocs: BlocContenu[];
    }
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
      // Shiki, `transformerStyleToClass` — 0 attribut `style=`, et l'ancre `class="line ancre-ligne-N"`
      // sur chaque ligne, comme pour `ExempleCode.htmlColore` (même colorateur, mêmes garanties).
      htmlColore: string;
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

// -----------------------------------------------------------------------------
// LA SIMULATION — miroir de `schemas/simulation.schema.json`, émise DANS la leçon (E2-ST5, lot a)
// -----------------------------------------------------------------------------
// POURQUOI LA SIMULATION VOYAGE DANS LA LEÇON, comme le quiz et pour la même raison.
// Elle s'affiche sur la page de leçon, à l'ancre `[[simulation]]` — donc au même instant
// que le corps, dans le même chunk. Un second import paresseux ferait un aller-retour
// réseau de plus pour une donnée dont on sait, avant même de charger la page, qu'elle
// sera lue.
//
// ⚠️ ELLE EST OPTIONNELLE, ET C'EST LA SEULE DIFFÉRENCE DE FOND AVEC LE QUIZ.
// `valider.mjs` (§9) n'exige `simulation.json` d'aucune leçon : une leçon qui ne décrit
// aucun flux n'en a pas. `LeconCompilee.simulation` est donc `?`, et un consommateur qui
// traiterait l'absence comme une anomalie se tromperait. Le contrat NEUF que le lot a
// ajoute est l'autre moitié : `simulation.json` présent ⇔ EXACTEMENT UNE ancre
// `[[simulation]]` dans le corps ; absent ⇔ ZÉRO. Avant lui, une ancre orpheline
// compilait et rendait un trou silencieux dans la page, et un `simulation.json` sans
// ancre était de la donnée livrée que rien n'affichait — les deux moitiés du même défaut
// que `[[quiz]]` avait déjà. Le contrôle vit dans `compilerLecon` (le seul endroit qui
// voit à la fois le DOSSIER et l'AST) et il est REDIT à la lecture de l'artéfact par
// `lireLeconCompilee` (`src/app/features/cours/contenu-compile.ts`).
//
// LA SIMULATION EST PASSÉE FIDÈLEMENT — RIEN N'EST AJOUTÉ, RIEN N'EST RETIRÉ.
// Contrairement au quiz, aucun champ n'est enrichi au build (pas de `htmlColore`) et aucun
// champ n'est retiré (il n'y a pas d'équivalent de `ficheSource` — la traçabilité de la
// simulation passe par la leçon qui la porte).
//
// 🔵 DÉCISION, PAS UNE OPTION : LE `code` D'UN PANNEAU N'EST JAMAIS COLORÉ. Shiki tourne au
// BUILD et ne part jamais au navigateur (la CSP du site est à hachages : aucun colorateur
// d'exécution ne pourrait y injecter ses styles). Le `code` d'un panneau se rend donc en
// TEXTE BRUT monospace, par interpolation — exactement comme le rendu `comparaison`
// d'E2-ST4. Il n'y a rien à arbitrer côté composant du lot b.
//
// LES `id` DEVIENNENT DES `id` DE DOCUMENT. La région porte `ID_SIMULATION`, et l'étape
// `numero: N` est rendue sous `PREFIXE_ID_ETAPE + N` — les deux constantes vivent dans
// `src/app/features/cours/contenu-compile.ts`, à côté de `PREFIXE_ID_QUESTION` et pour la
// même raison : les ancres de section écrites par l'auteur et les `id` de la simulation
// partagent l'espace de noms du document, et la collision est refusée nominativement là.
// -----------------------------------------------------------------------------

/** Une colonne/boîte du rendu. `type` pilote l'icône ET le rôle accessible du composant. */
interface ActeurSimulation {
  id: string; // kebab-case, unique dans la simulation — unicité vérifiée par `valider.mjs`
  libelle: string;
  /**
   * Liste FERMÉE du schéma. Elle est REDITE nominativement côté application
   * (`TYPES_ACTEUR`, `contenu-compile.ts`) parce que le schéma Ajv appartient au
   * programme de l'outillage et n'a rien à faire dans le bundle du navigateur ;
   * `lecon.spec.ts` relit le schéma et compare ces deux listes EXÉCUTABLES, pour qu'elles
   * ne divergent pas (L-016).
   *
   * ⚠️ L'union ci-dessous est une TROISIÈME copie, que ce test ne lie PAS — un `.d.ts`
   * ambiant ne s'exécute pas, donc rien ne rougirait s'il restait en arrière. La mettre à
   * jour DANS LE MÊME DIFF que les deux autres est donc une obligation d'auteur, pas une
   * garantie d'outil (l'ajout d'`attaquant` en est l'illustration : trois fichiers touchés
   * pour une seule valeur).
   *
   * `attaquant` est distinct de `personne` parce que les déroulés d'attaque du bloc A d'E3
   * font de l'opposition attaquant/victime le propos même de la simulation : sans ce type,
   * les deux boîtes porteraient la même icône et le même rôle accessible.
   */
  type: 'personne' | 'attaquant' | 'navigateur' | 'serveur' | 'stockage';
}

/**
 * Ce qui s'affiche sous la boîte d'un acteur. AU MOINS l'un des deux champs est écrit
 * (`anyOf` du schéma), et `code` sans `langage` est refusé (`dependencies`).
 *
 * 🔵 `code` SE REND EN TEXTE BRUT MONOSPACE, PAR INTERPOLATION — décision, pas une option
 * (voir la note de tête de cette section : Shiki ne part jamais au navigateur). `langage`
 * ne sert donc qu'à ÉTIQUETER le panneau, pas à le colorer.
 *
 * 🔴 ET C'EST DU CODE VOLONTAIREMENT VULNÉRABLE, écrit par l'auteur de la leçon
 * (`.claude/rules/contenu-pedagogique.md` §4) : une charge XSS d'exemple est le contenu
 * NORMAL de ce champ. Il se rend par interpolation SEULE — jamais `[innerHTML]`, jamais
 * `bypassSecurityTrust*`, dans aucune circonstance. La même consigne vaut pour `texte`.
 */
interface PanneauSimulation {
  texte?: string;
  code?: string;
  langage?: Langage;
}

/**
 * L'état visuel DÉCLARATIF d'une étape — ce que le composant du lot b sait peindre.
 *
 * ⚠️ AUCUN de ces champs n'est revérifié par la frontière de typage de l'application :
 * c'est le composant qui les lit, donc lui qui doit les refuser nommément (même partage
 * que `sections`/`blocs` avec `RenduBlocs`, et que l'enveloppe du quiz avec `QuizComponent`).
 *
 * 🔴 ET SURTOUT : LES RENVOIS VERS UN ACTEUR NE SONT GARANTIS NULLE PART À LA LECTURE.
 * `acteurActif`, `fleche.de`/`vers`, les clés de `panneaux` et `surbrillance` sont tenus par
 * `valider.mjs` AU BUILD, SUR `content/` UNIQUEMENT (JSON Schema ne sait pas comparer deux
 * branches du même document). À la LECTURE de l'artéfact, ces renvois ne sont revérifiés par
 * PERSONNE : `compilerSimulation` revalide le schéma — pas les renvois — précisément parce
 * que `compilerRacine` s'exécute aussi hors de `build.mjs`, et `lireLeconCompilee` s'arrête à
 * l'enveloppe. C'est donc au composant du lot b de les refuser NOMMÉMENT ; y lire « déjà
 * garanti » serait hériter d'une confiance non gagnée (L-016, addendum E2-ST1).
 *
 * 🔒 ET `panneaux` NE SE LIT JAMAIS PAR ACCÈS DIRECT. C'est un `Record<string, …>` issu d'un
 * `JSON.parse`, dont les clés viennent du contenu : `panneaux[acteur.id]` sur un objet
 * dépourvu de cette clé rend l'héritage d'`Object.prototype`. `constructor` est un `id`
 * d'acteur syntaxiquement légal (kebab-case), et `Object.prototype.constructor` est une
 * valeur *truthy* qui traverserait un `@if (panneau)` pour peindre un panneau vide. Le lot b
 * lit donc par `Object.hasOwn(panneaux, id)` ou via `new Map(Object.entries(panneaux))` —
 * même parade que `resoudre-lecon.ts` sur la carte des leçons. (La frontière refuse déjà
 * `constructor` comme `id` d'ACTEUR ; une clé de `panneaux` qui ne correspond à aucun acteur
 * n'est, elle, tenue que par `valider.mjs`, donc au build seulement — d'où cette obligation.)
 */
interface EtatVisuelSimulation {
  acteurActif: string;
  fleche?: { de: string; vers: string; libelle: string };
  /** Clé = `id` d'acteur. */
  panneaux?: Record<string, PanneauSimulation>;
  /**
   * `id` d'acteurs à mettre en évidence (danger). La mise en évidence ne doit JAMAIS être
   * le seul porteur de sens : `narration` dit la même chose en mots (WCAG 1.4.1).
   */
  surbrillance?: string[];
}

interface EtapeSimulation {
  numero: number; // 1-based, égal à la position dans `etapes` — vérifié par `valider.mjs`
  titre: string;
  /** L'équivalent textuel de l'étape : c'est LUI qui la rend compréhensible sans l'image. */
  narration: string;
  etatVisuel: EtatVisuelSimulation;
}

interface SimulationCompilee {
  lecon: string; // slug de la leçon — RE-vérifié à l'émission, comme `QuizCompile.lecon`
  titre: string;
  acteurs: ActeurSimulation[]; // 2 à 6 (schéma)
  etapes: EtapeSimulation[]; // 5 à 12 (schéma)
}

interface LeconCompilee {
  frontmatter: {
    titre: string;
    slug: string;
    sujet: string;
    /**
     * OPTIONNEL — libellé du groupe de modules affiché par le sommaire du cours.
     * Le contrat est « tout-ou-rien PAR SUJET » (`valider.mjs`) : absent partout, ou
     * présent sur toutes les leçons du sujet. Un groupement partiel laisserait des
     * modules flotter hors de toute section — un défaut d'affichage silencieux.
     */
    section?: string;
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
  /**
   * OPTIONNEL, à la différence de `quiz` — voir la note de la simulation ci-dessus.
   * Présent ⇔ le corps porte EXACTEMENT une ancre `[[simulation]]` ; absent ⇔ zéro.
   */
  simulation?: SimulationCompilee;
}

interface EntreeManifesteRoutes {
  sujet: string;
  slug: string;
  /** Voir `LeconCompilee['frontmatter'].section` — OPTIONNEL, tout-ou-rien par sujet. */
  section?: string;
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
