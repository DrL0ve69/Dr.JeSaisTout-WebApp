// =============================================================================
// Le validateur de contenu MORD-IL, et mord-il sur la BONNE cause ? (E2-ST1, lot 5)
// -----------------------------------------------------------------------------
// POURQUOI CE TEST EXISTE — et pourquoi il est arrivé en retard.
// `tools/content-pipeline/valider.mjs` porte un mode `--fixtures` qui est le
// contrôle positif du garde-fou (L-019) : un dossier par cas, une faute chacun, tous
// attendus REFUSÉS. Ce mode était exact, exécutable à la main… et lancé par
// PERSONNE — ni par un test, ni par un script npm, ni par un workflow. Or
// `content/cours/securite-web` n'existe pas encore : l'étape de validation de
// `content:build` valide donc ZÉRO fichier, et sortirait verte même si le glob
// était cassé ou si Ajv ne compilait plus. Le maillon qui décide si une leçon
// entre dans le site n'était vérifié par rien (constat de revue, 2026-08-16).
//
// C'est la cousine de L-019 sur l'axe CÂBLAGE : un contrôle positif qu'aucun
// runner n'exécute est une intention, pas un gate. Ce fichier est le runner.
//
// LES TROIS CHOSES QU'IL PROUVE, et pourquoi aucune ne suffit seule :
//   1. TOUS les cas invalides sont REFUSÉS. Seul, ce constat est compatible avec
//      un validateur qui refuserait TOUT.
//   2. La leçon-témoin VALIDE passe, code 0. C'est l'autre moitié de la pince :
//      ensemble, les deux prouvent que le garde-fou discrimine.
//   3. Chaque refus porte la BONNE cause, cas par cas. Sans ce troisième point,
//      des refus tous dus à une seule et même raison (un chemin introuvable, disons)
//      seraient indistinguables d’autant de refus corrects.
//
// LES CAUSES ATTENDUES SONT ÉCRITES ICI, EN DUR — jamais importées de l'outil
// qu'elles vérifient (L-012). Un test qui importe la constante dont il contrôle
// la valeur ne vérifie rien du contrat : il vérifie que `x === x`.
//
// POURQUOI PAR PROCESSUS FILS. Même raison que le spec de compilation : le
// validateur est un `.mjs` du TROISIÈME programme TypeScript
// (`tsconfig.tools.json`, Node pur) ; l'importer le ferait entrer dans
// `tsconfig.spec.json`, qui n'a ni `allowJs` ni les types Node de l'outillage.
// On exécute donc la ligne de commande RÉELLE — celle que la CI lance.
// =============================================================================

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const VALIDATEUR = 'tools/content-pipeline/valider.mjs';
const COMPILATEUR = 'tools/content-pipeline/compiler-markdown.mjs';
const DOSSIER_INVALIDES = 'tools/content-pipeline/__fixtures__/invalides';
const FIXTURE_VALIDE = 'tools/content-pipeline/__fixtures__/temoin-minimal';

/**
 * La racine-témoin GRASSE : DEUX leçons, toutes deux porteuses d'une `section`. C'est la
 * moitié « sections partout » du tout-ou-rien de la décision D-2 — `FIXTURE_VALIDE`, qui n'en
 * porte aucune, en est la moitié « sections nulle part ». Sans les deux, « refuse le mélange »
 * serait indistinguable de « refuse `section` » ou de « ignore `section` ».
 */
const FIXTURE_SECTIONS_PARTOUT = 'tools/content-pipeline/__fixtures__/temoin/cours/securite-web';

/**
 * La racine d'ANCRAGE AU COURS : un `horaire.json` valide, un module qui déclare `seance: 2`, et
 * les QUATRE formes légales de renvoi — l'encadré nu, `{diapos="13, 17"}`, `{seance="1"
 * diapos="45-50"}` (une AUTRE séance que celle du module) et la variante qui admet les trois
 * attributs à la fois. C'est la moitié POSITIVE de la pince pour les onze cas d'E3-ST20 : sans
 * elle, « refuse un renvoi fautif » serait indistinguable de « refuse tout renvoi ».
 *
 * ⚠️ ELLE PORTE AUSSI, DEPUIS LE LOT 1a, LES DEUX FORMES DE RENVOI SUR UN TITRE (§3bis) : un `##`
 * qui déclare `{diapos="12-18"}` (séance héritée) et un `###` qui déclare `{seance="1"
 * diapos="45-50"}` (une AUTRE séance du même cours). Le compilateur les mesure en plus dans
 * `src/pipeline-contenu-compilation.spec.ts` — titre dépouillé, ancre, plages dépliées.
 */
const FIXTURE_ANCRAGE = 'tools/content-pipeline/__fixtures__/ancrage-au-cours';

/**
 * La racine des EXERCICES DU COURS (E3-ST21) : un `exercices.json` valide, un module `publiee`
 * rattaché à la séance 2, et les trois formes d'encadré qui comptent — référence NUMÉRIQUE avec
 * séance héritée, référence numérique avec séance et `diapos` déclarés, référence NOMMÉE à corps
 * VIDE (la piste est facultative, §6.2).
 *
 * ⚠️ C'EST AUSSI LE CONTRÔLE POSITIF DU GATE DE COMPLÉTUDE, et c'est ce qui la rend indispensable :
 * son module est `publiee` et place les TROIS exercices de la feuille, donc elle sort en code 0 —
 * là où un gate qui refuserait toute racine portant un registre la ferait rougir. Sans elle, les
 * dix cas fautifs ci-dessus resteraient tous verts sur un contrat qu'on aurait cassé au lieu de
 * l'ouvrir.
 */
const FIXTURE_EXERCICES = 'tools/content-pipeline/__fixtures__/exercices-du-cours';

/**
 * La racine du MODULE RATTACHÉ À UNE ÉVALUATION PRATIQUE (arbitrage R-3, 2026-08-31) : un
 * `horaire.json` dont la séance 3 est un « examen-ecrit » et la séance 4 une
 * « evaluation-pratique » (le projet de session), et un module qui déclare `seance: 4`.
 *
 * ⚠️ C'EST LA MOITIÉ POSITIVE DE R-3, et sans elle le lot ne prouverait que ce qu'il REFUSE.
 * Le cas `invalides/seance-du-module-est-une-evaluation` reste vert sur un validateur qui
 * refuserait TOUTE évaluation — soit exactement le contrat qui existait AVANT R-3. Seule cette
 * racine-ci, qui doit sortir en code 0, rend ce contournement impossible.
 */
const FIXTURE_EVALUATION_PRATIQUE =
  'tools/content-pipeline/__fixtures__/module-sur-evaluation-pratique';

/** Ajv compile ses schémas et une racine par cas : lent une fois, pas une fois par cas. */
const DELAI = 60_000;

/**
 * Un cas = un dossier, une faute, une empreinte de cause. Le fragment attendu est
 * volontairement le morceau le plus SPÉCIFIQUE du message — celui qu'un autre cas
 * ne pourrait pas produire par accident.
 */
const CAS_ATTENDUS: readonly { dossier: string; cause: RegExp }[] = [
  { dossier: 'quiz-moins-de-cinq-questions', cause: /\/questions — doit compter au moins 5/ },
  { dossier: 'quiz-explication-absente', cause: /\/questions\/1 .*« explication »/ },
  { dossier: 'quiz-fiche-source-absente', cause: /\/questions\/0 .*« ficheSource »/ },
  { dossier: 'frontmatter-slug-non-kebab-case', cause: /\/slug — ne respecte pas le motif/ },
  { dossier: 'corps-espace-fine-insecable-u202f', cause: /U\+202F .*seule U\+00A0 est permise/ },
  { dossier: 'marqueur-a-verifier-en-statut-publiee', cause: /marqueur .*statut: publiee/ },
  { dossier: 'corps-section-gabarit-manquante', cause: /section « ## À retenir » absente/ },
  { dossier: 'corps-conteneur-hors-liste-fermee', cause: /conteneur « ::: astuce » hors de la liste/ },
  { dossier: 'simulation-lecon-differente-du-slug', cause: /« lecon ».*ne correspond pas au slug/ },
  // Dixième cas, ajouté le 2026-08-17 sur constat de revue de sécurité. Il ne verrouille pas une
  // règle NEUVE : il verrouille une règle que le validateur appliquait PAR ACCIDENT. L'ancien motif
  // de titre `/^(#{1,6})\s+(.+?)\s*$/` faisait entrer « ## » suivi de blanches seules dans le relevé
  // des sections, où le contrôle d'ordre du gabarit finissait par s'en plaindre — sous une cause qui
  // ne nommait pas la vraie faute. La réécriture du motif (S8786) l'a fait disparaître du relevé, et
  // donc cesser d'être refusé, SANS qu'aucun test ne rougisse : le seul chemin du lot où une décision
  // a bougé sans que rien d'exécutable le constate. Le refus est désormais EXPLICITE, et ce cas est
  // ce qui l'empêche de redevenir accidentel.
  { dossier: 'corps-titre-de-section-vide', cause: /titre de section sans texte/ },
  // Onzième et douzième cas, ajoutés le 2026-08-18 (E2-ST3, lot E-a). Ils verrouillent les deux
  // unicités qu'un `quiz.json` doit tenir et que JSON Schema ne peut pas exprimer. Le point à ne
  // pas manquer : sans eux, le refus vient du COMPOSANT, donc au prerender d'`ng build`, sur un
  // message qui nomme la question et le champ mais PAS le fichier, au milieu d'une pile Angular.
  // Et l'unicité des `choix[].id` était déjà écrite dans `valider.mjs` — sans qu'aucune fixture ne
  // l'exerce : exactement L-019, une règle exacte que rien n'empêchait de disparaître.
  {
    dossier: 'quiz-associer-gauche-repete',
    cause: /« q4 » : « paires » — deux paires portent le même « gauche »/,
  },
  {
    dossier: 'quiz-choix-identifiant-repete',
    cause: /« q1 » : « choix » — deux choix portent le même « id »/,
  },
  // Treizième cas (lot E-a, constat de revue) : la TROISIÈME règle d'unicité du quiz — celle des
  // `id` de QUESTION — existait dans `valider.mjs` sans aucune fixture, pendant que les deux
  // autres venaient d'en recevoir une. C'est le L-019 laissé ouvert sur la seule des trois qui
  // alimente vraiment le langage de requête : `quiz.ts` retrouve une radio par
  // `[id="…"] input[type=radio]:checked`, et `querySelector` rend le PREMIER match — deux
  // questions homonymes feraient donc relire à l'amorçage L-033 la radio d'une AUTRE question.
  { dossier: 'quiz-question-identifiant-repete', cause: /« q1 » : identifiant répété/ },
  // Quatorzième cas (lot E-a) : le CONTRÔLE POSITIF de la clef d'indiscernabilité. Les deux
  // libellés `gauche` y sont deux chaînes d'octets DIFFÉRENTES (la seconde finit par une U+00A0)
  // que rien ne sépare à l'écran. Avant le correctif, la comparaison portait sur les octets bruts
  // et ce cas sortait ACCEPTÉ — sur un contenu que le rendu aurait cassé. Et ce n'est pas
  // exotique : `.claude/rules/contenu-pedagogique.md` §3 impose U+00A0 dans le contenu du site.
  {
    dossier: 'quiz-associer-gauche-indiscernable',
    cause: /« q4 » : « paires ».*ne diffèrent que par des blanches ou une normalisation Unicode/,
  },
  // Quinzième cas (E2-ST4, lot B) : le TROISIÈME comptage de lignes du pipeline, qui ne disait pas
  // la même chose que les deux autres. `verifierQuestionTrouverLaFaille` bornait `ligneFautive`
  // avec `code.split('\n').length` — donc en comptant la chaîne vide qui suit le dernier saut de
  // ligne. Sur un `code` de quiz terminé par un saut, il acceptait `ligneFautive = N+1` : la ligne
  // VIDE finale, que le quiz affiche sans rien dedans et que personne ne peut désigner à l'écran.
  // Le compilateur, lui, refusait déjà `{lignes="N+1"}` sur le même extrait (`lirePortee`), avec
  // `compterLignes`. Aucun des deux n'était rouge, parce qu'ils ne se comparaient à rien : la
  // divergence ne devient visible qu'en écrivant le cas. Les trois appelants partagent désormais
  // `tools/content-pipeline/compter-lignes.mjs`, et ce cas est ce qui empêche la formule d'être
  // recopiée une quatrième fois. Vérifié par mutation : rétablir `split` ici fait passer ce
  // dossier de « refusé » à « accepté à tort », et c'est le spec qui le rapporte.
  {
    dossier: 'quiz-ligne-fautive-hors-extrait',
    cause: /« q3 » : « ligneFautive » vaut 4 alors que « code » ne compte que 3 ligne\(s\)/,
  },
  // Seizième cas (E2-ST6, lot B) : la PREMIÈRE règle de COLLECTION du validateur — et le premier
  // dossier de fixture qui porte DEUX leçons, parce que sa faute n'est dans aucune des deux prise
  // isolément. `section` est optionnelle (décision D-2) ; ce qui est refusé, c'est le MÉLANGE à
  // l'intérieur d'un sujet. Sans ce cas, un groupement partiel compilerait, se prerendrait et se
  // publierait : la carte de parcours laisserait simplement flotter quelques modules hors de toute
  // section — un défaut d'AFFICHAGE, qu'aucun gate ne peut voir et que seul un œil remarque.
  // L'assertion porte sur les DEUX slugs, pas sur le seul mot « section » : un message qui dirait
  // « incohérence de section » sans nommer les fichiers renverrait l'auteur à une chasse manuelle
  // dans un cours de 27 modules — et il resterait vert si le validateur nommait la mauvaise leçon.
  {
    dossier: 'frontmatter-section-partielle-dans-le-sujet',
    cause:
      /la leçon « sans-section » n'a pas de « section » alors que « avec-section » .*en porte une/,
  },
  // ---------------------------------------------------------------------------------------------
  // Cas 17 à 20 (E3-ST1, lot « provenance ») — les trois règles hors schéma du contrat 📘/🧩/⚠️.
  // ---------------------------------------------------------------------------------------------
  // 17. G1 — marqueur de provenance LITTÉRAL dans le corps.
  // ⚠️ L'ASSERTION PORTE SUR LE NUMÉRO DE LIGNE, et c'est tout son intérêt. Cette fixture contient
  // DEUX marqueurs : un 📘 dans un bloc de code (LÉGAL — une leçon peut citer une fiche KB
  // verbatim, ou enseigner la notation elle-même) placé exprès PLUS HAUT, et le 🧩 fautif en prose.
  // Un garde-fou écrit en `corps.includes('📘')` — la liste noire sur le fichier entier que
  // `.claude/rules/security.md` §4 interdit, et que ce dépôt a déjà écrite cinq fois — rapporterait
  // la ligne du bloc de code, donc échouerait ici. Sans le numéro, les deux implémentations
  // seraient indistinguables.
  {
    dossier: 'corps-marqueur-provenance-litteral',
    cause: /corps ligne 49 : marqueur de provenance littéral .*U\+1F9E9/,
  },
  // 17bis. G1 sur le TROISIÈME marqueur — le ⚠️, ajouté le 2026-08-20 sur constat de revue.
  // 🔴 C'EST LE PLUS IMPORTANT DES TROIS, et il manquait pendant que DEUX documents
  // (`docs/contenu/pipeline-contenu.md`, `types.d.ts`) promettaient déjà qu'il était couvert : une
  // promesse plus large que le code appliqué. Les deux autres marqueurs ne font que perdre une
  // information de provenance ; celui-ci ACCUSE L'ENSEIGNANT — écrit en prose, il contredit le
  // cours sans passer par `::: correction-du-cours`, donc sans le `source` que G3 impose, donc
  // hors de toute relecture. C'est l'accusation non sourcée que
  // `.claude/rules/contenu-pedagogique.md` §6 classe comme défaut GRAVE.
  // ⚠️ LA FIXTURE OPPOSE LES DEUX FORMES DE SAISIE, et c'est tout son intérêt : la faute de la
  // ligne 51 est la séquence ÉMOJI (U+26A0 U+FE0F), le contrôle positif d'exemption placé plus
  // haut dans le bloc de code est la forme NUE (U+26A0 seule). Un garde-fou qui chercherait la
  // séquence complète laisserait passer la forme nue — il se contournerait par une variante de
  // saisie. Le numéro de ligne est ce qui distingue les deux implémentations : une recherche sur
  // le fichier entier rapporterait la ligne du bloc de code.
  {
    dossier: 'corps-marqueur-correction-litteral',
    cause: /corps ligne 51 : marqueur de provenance littéral .*U\+26A0/,
  },
  // 18. G2 — leçon `publiee` sans aucun encadré `cours`/`complement`. Sur un site qui sert d'abord
  // à réviser des examens, une leçon dont rien ne dit ce qui vient du cours et ce qui vient de la
  // KB fait perdre des points OU du temps (`.claude/rules/contenu-pedagogique.md` §6) — les deux
  // échecs sont graves, et aucun schéma JSON ne sait les voir.
  {
    dossier: 'provenance-absente-en-statut-publiee',
    cause: /corps : aucun encadré de provenance alors que `statut: publiee`/,
  },
  // 19. G3 — `correction-du-cours` sans attribut `source` du tout.
  {
    dossier: 'correction-du-cours-sans-source',
    cause: /corps ligne 21 : « ::: correction-du-cours » sans attribut « source »/,
  },
  // 19bis et 19ter (2026-08-20, constat de revue) : LES DEUX FORMES QUE G3 LAISSAIT PASSER.
  // L'ancien motif `/\bsource="([^"]*)"/` cherchait la paire N'IMPORTE OÙ dans la suite du nom de
  // conteneur ; `lireAttributs` (compiler-markdown.mjs) impose, lui, `^\{(.*)\}$` puis une clef en
  // liste fermée. Deux écritures satisfaisaient donc le validateur et faisaient échouer le
  // COMPILATEUR : `source="…"` sans accolades, et `{data-source="…"}` (la frontière `\b` s'ouvre
  // juste après un tiret). Les deux restaient fail-closed — le build cassait — mais sur une cause
  // qui n'était pas la faute commise, et à un endroit qui n'est pas celui où l'auteur la corrige.
  // Un garde-fou qui apparie plus large que le contrat qu'il annonce est la même famille que les
  // listes noires de `.claude/rules/security.md` §4. Ces deux cas sont ce qui l'empêche de revenir.
  {
    dossier: 'correction-du-cours-attributs-hors-accolades',
    cause: /corps ligne 21 : « ::: correction-du-cours » suivi de « source=.* » — les attributs/,
  },
  {
    dossier: 'correction-du-cours-attribut-inconnu',
    cause: /corps ligne 21 : attributs illisibles .* attribut « data-source » inconnu/,
  },
  // 20. G3 sur l'attribut VIDE — et surtout le CONTRÔLE POSITIF DE LA RÉCURSION DE G2.
  // Cette leçon est `publiee` et son SEUL encadré de provenance est imbriqué dans un `:::: note` :
  // G2 ne la laisse passer que parce qu'elle DESCEND. Sa faute propre est celle de G3, déclenchée
  // AVANT G2 dans `verifierCorps` — donc si la descente était débranchée, G2 mordrait en SECONDE
  // anomalie et la ligne imprimée gagnerait un « (+1 autre(s)) ». Le test dédié plus bas est ce
  // qui le voit ; l'assertion ci-dessous, portant sur la sortie entière, ne le verrait pas seule.
  // Motif de L-039 : un compteur qui ne descend pas reste vert sur tout corpus non imbriqué.
  {
    dossier: 'provenance-imbriquee-correction-sans-source',
    cause: /corps ligne 27 : « ::: correction-du-cours » porte un attribut « source » vide/,
  },
  // ---------------------------------------------------------------------------------------------
  // Cas 21 à 31 (E3-ST20, lot A) — L'ANCRAGE AU COURS : `horaire.json`, `seance`, `diapos`.
  // ---------------------------------------------------------------------------------------------
  // CE QUE CES ONZE CAS DÉFENDENT, EN UNE PHRASE : un renvoi faux envoie l'étudiant réviser la
  // mauvaise diapositive, EN SILENCE. C'est le seul défaut de ce contrat qu'aucun gate en aval ne
  // peut voir — ni le typage, ni axe, ni un e2e : la page s'affiche parfaitement, elle ment.
  //
  // 21-22. `seance` du frontmatter vs `horaire.json` — deux fautes DISTINCTES, deux causes.
  // La seconde est celle qui a motivé le contrat : les modules du site suivaient l'ordre OWASP
  // d'une édition ANTÉRIEURE du cours, et rien n'empêchait d'accrocher un module à la séance
  // « Examen 1 ». Un tel module s'afficherait sous un jalon d'examen dans le sommaire.
  {
    dossier: 'seance-absente-de-l-horaire',
    cause: /« seance: 42 » ne figure pas dans « horaire\.json » \(séances déclarées : 1, 2, 3\)/,
  },
  {
    dossier: 'seance-du-module-est-une-evaluation',
    cause: /« seance: 3 » désigne « Examen 1 », une séance d'ÉVALUATION de nature « examen-ecrit »/,
  },
  // 23-24. LA MATRICE D'ATTRIBUTS, prise par ses DEUX diagonales. `source` est admis sur
  // `correction-du-cours` et refusé sur `cours` ; `diapos` est admis sur `cours` et refusé sur
  // `complement`. Un seul des deux cas resterait vert sur un garde-fou qui refuserait, disons,
  // tout attribut partout — ou qui les accepterait tous partout. Il en faut donc deux.
  // ⚠️ Pourquoi `complement` refuse `diapos` : un complément est, par définition, ce que la KB
  // ajoute et que le cours ne dit pas. Le laisser citer une diapositive présenterait comme
  // examinable ce que l'enseignant n'a jamais enseigné (`contenu-pedagogique.md` §6).
  {
    dossier: 'encadre-cours-avec-attribut-source',
    cause: /attributs illisibles sur « ::: cours » — attribut « source » inconnu/,
  },
  {
    dossier: 'encadre-complement-avec-diapos',
    cause: /attributs illisibles sur « ::: complement » — attribut « diapos » inconnu/,
  },
  // 25-27. LA GRAMMAIRE DE `diapos`, par ses trois fautes de forme. Chaque cause NOMME LE JETON
  // fautif, et c'est tout l'intérêt : un message qui dirait « diapos invalide » renverrait l'auteur
  // relire une liste entière. Trois cas, parce qu'un motif global « qui a l'air bon » — la liste
  // noire que `.claude/rules/security.md` §4 interdit — pourrait attraper l'un sans les autres :
  // « quinze » n'est pas un nombre, « 50-45 » en est fait de deux, et « 17, 13 » est composé de
  // deux jetons parfaitement bien formés dont seul l'ORDRE est faux.
  {
    dossier: 'encadre-diapos-jeton-non-numerique',
    cause: /jeton « quinze » illisible dans « diapos="13, quinze" »/,
  },
  {
    dossier: 'encadre-diapos-plage-inversee',
    cause: /jeton « 50-45 » : une plage s'écrit « N-M » avec N < M — celle-ci est inversée/,
  },
  {
    dossier: 'encadre-diapos-non-croissantes',
    cause: /jeton « 13 » : les jetons de « diapos » sont STRICTEMENT croissants, or 17 le précède/,
  },
  // 28. LE RENVOI QUI NE DÉSIGNE RIEN. La fixture n'a NI `seance` au frontmatter, NI attribut
  // `seance` sur l'encadré, NI `horaire.json` — et sa cause propre doit être celle du renvoi
  // orphelin, pas « l'horaire manque ». C'est ce qui distingue les deux lectures possibles de la
  // règle : la séance ne devient obligatoire que sur un encadré QUI PORTE UN RENVOI. Un
  // `::: cours` nu reste légal sans séance — c'est le cas des six leçons déjà publiées, dont
  // aucune ne porte encore le champ.
  {
    dossier: 'encadre-renvoi-sans-seance-derivable',
    cause: /« ::: cours » porte un renvoi au cours sans séance à laquelle le rattacher/,
  },
  // 29-31. `horaire.json` LUI-MÊME — les trois règles que JSON Schema ne sait pas exprimer.
  // Ces trois racines ne portent AUCUNE leçon, et c'est délibéré : la faute est dans l'horaire.
  // ⚠️ La croissance stricte couvre l'unicité : deux contrôles séparés donneraient DEUX causes
  // pour une seule faute sur `[1, 1]`, et le mode `--fixtures` n'en compare qu'une.
  {
    dossier: 'horaire-numeros-non-croissants',
    cause: /« seances » : la séance 1 suit la séance 1 — les « numero » sont STRICTEMENT croissants/,
  },
  {
    dossier: 'horaire-portee-vers-une-seance-inconnue',
    cause: /la portée de l'évaluation de la séance 3 cite la séance 9, qui n'existe pas/,
  },
  {
    dossier: 'horaire-portee-vers-une-evaluation',
    cause: /cite la séance 3, qui est elle-même une ÉVALUATION/,
  },
  // ── E3-ST21 — LES EXERCICES DU COURS (`docs/contenu/ancrage-au-cours.md` §6) ────────────────
  // Cinq cas qui ne portent AUCUNE leçon : la faute est dans le registre lui-même.
  // ⚠️ La référence répétée est NOMMÉE (« projet-de-session »), et ce n'est pas un hasard : une
  // référence numérique répétée violerait DEUX règles à la fois (unicité ET croissance stricte),
  // donc produirait deux causes pour une seule faute — ce que le mode `--fixtures` interdit.
  {
    dossier: 'exercices-reference-repetee',
    cause: /la référence « projet-de-session » est déclarée DEUX FOIS/,
  },
  {
    dossier: 'exercices-numeros-non-croissants',
    cause: /la référence « 2 » suit « 3 » — les références NUMÉRIQUES suivent l'ordre/,
  },
  {
    dossier: 'exercices-seance-est-une-evaluation',
    cause: /la séance 3 désigne « Examen 1 », une séance d'ÉVALUATION/,
  },
  {
    dossier: 'exercices-seance-absente-de-l-horaire',
    cause: /la séance 9 ne figure pas dans « horaire\.json »/,
  },
  // Sans cette règle, l'index `Map` du registre écraserait la première feuille par la seconde EN
  // SILENCE : la moitié des exercices d'une séance disparaîtrait du gate de complétude, c'est-à-dire
  // que le garde-fou censé rendre « ajoute-les tous » mesurable cesserait de mesurer.
  {
    dossier: 'exercices-seance-repetee',
    cause: /la séance 2 est déclarée DEUX FOIS — un registre ne porte qu'une feuille/,
  },
  // Trois cas dont la faute est dans l'ENCADRÉ. Leçons en `brouillon` à dessein : les règles
  // inter-leçons ne comptent que les modules PUBLIÉS, ces cas restent donc à une seule cause.
  {
    dossier: 'encadre-exercice-ref-inconnue',
    cause: /« ref="99" », inconnue de la séance 2 de « exercices\.json » \(références déclarées : 1\)/,
  },
  {
    dossier: 'encadre-exercice-avec-source',
    cause: /attribut « source » inconnu ; attributs admis sur « ::: exercice-du-cours »/,
  },
  {
    dossier: 'encadre-exercice-sans-ref',
    cause: /« ::: exercice-du-cours » sans attribut « ref »/,
  },
  // Les DEUX cas INTER-LEÇONS (§6.4). Ils ne peuvent naître que dans `validerRacine`, seule à voir
  // toutes les leçons d'un sujet — ni le schéma ni `validerLecon` ne peuvent les exprimer.
  {
    dossier: 'exercices-non-tous-places',
    cause: /séance 2 : 1 exercice\(s\) du cours ne sont placés par aucun encadré .* « 2 » \(Exercice oublié\)/,
  },
  {
    dossier: 'encadre-exercice-ref-en-double',
    cause: /l'exercice « 1 » est déjà cité par « .*01-premier » — un exercice du cours se pose UNE fois/,
  },
  // ---------------------------------------------------------------------------------------------
  // Cas 45 (§3bis, lot 1a) — LE RENVOI POSÉ SUR UN TITRE DE SECTION.
  // ---------------------------------------------------------------------------------------------
  // 🔴 POURQUOI CE CAS-LÀ, ET PAS UN AUTRE. Deux fautes se disputaient la place : une clef hors
  // matrice, et un `cours="…"` non résoluble. La clef inconnue l'emporte pour deux raisons.
  // (a) ELLE EST PERMANENTE. Le refus de `cours` est une limite du lot 1a — le lot 1b rend le
  //     validateur multi-sujets et le lève ; une fixture bâtie dessus aurait une date de
  //     péremption, et une fixture périmée est réécrite par quelqu'un qui ne sait plus ce qu'elle
  //     prouvait.
  // (b) ELLE EST LA SEULE À DISTINGUER « ANALYSÉ » DE « NETTOYÉ ». Une implémentation qui
  //     retirerait le bloc `{…}` du titre par simple motif — la liste noire que
  //     `.claude/rules/security.md` §4 interdit (famille S-003/S-009/S-014) — produirait le bon
  //     titre, la bonne ancre, les bonnes sections de gabarit… et avalerait `{diapo="12"}` EN
  //     SILENCE. L'auteur croirait avoir posé un renvoi ; la page n'en porterait aucun. C'est ce
  //     cas-ci, et lui seul, qui rougit sur une telle implémentation.
  // ⚠️ La leçon reste par ailleurs valide : ses sections de gabarit sont intactes, et c'est le
  // point — si le dépouillement du titre était raté, la cause imprimée serait « section
  // « ## Ce que le validateur regarde » absente », qui n'aiderait personne.
  {
    dossier: 'corps-titre-attribut-inconnu',
    cause:
      /corps ligne 11 : attributs illisibles sur « ## Ce que le validateur regarde » — attribut « diapo » inconnu ; attributs admis sur un titre de section/,
  },
  // Le titre porte DEUX blocs d'attributs. Sans le garde de résidu, le découpage prend le
  // DERNIER et laisse le premier dans le TEXTE du titre — donc dans l'ancre et au sommaire —
  // tandis que la séance qu'il déclarait est perdue sans un mot : le renvoi se résout sur la
  // séance du frontmatter. ⚠️ Les DEUX copies de la règle étaient d'accord pour se taire, si
  // bien qu'aucun appariement compilateur/validateur ne pouvait rougir (famille S-010).
  {
    dossier: 'corps-titre-bloc-residuel',
    cause:
      /corps ligne 11 : accolade dans le TEXTE du titre \(« Ce que le validateur regarde \{seance="1"\} »\)/,
  },
  // 🔴 CE CAS EXISTE POUR RENDRE LA §4d NON VACUE, et c'est sa seule raison d'être.
  // Mesuré : remplacer la queue de `verifierRenvoisDeTitres` par `return null` laissait la
  // suite ENTIÈREMENT verte — le seul autre cas de titre (`corps-titre-attribut-inconnu`)
  // sort plus tôt, sur la lecture des attributs. C'est donc la seule fixture qui prouve qu'un
  // renvoi posé sur un TITRE est bien confronté à « horaire.json », et non pas seulement lu.
  {
    dossier: 'corps-titre-seance-inconnue',
    cause:
      /corps ligne 11 : « ## Ce que le validateur regarde » cite la séance 99, absente de « horaire\.json »/,
  },
  // 🔴 CE CAS DISCRIMINE, il ne se contente pas de refuser. CommonMark admet `### Titre ##` : les
  // `#` de fin sont une FERMETURE. Le compilateur, qui lit les jetons de markdown-it, voyait donc
  // l'attribut ; le validateur, qui lit la ligne brute, ne le voyait jamais — la séance 99
  // n'était confrontée à aucun horaire (famille S-010, les deux copies ne voyaient pas la même
  // chaîne). ⚠️ CONTRÔLE POSITIF EXÉCUTÉ : en débranchant le retrait de la fermeture, ce cas
  // reste refusé — mais par le garde d'accolade résiduelle, donc sur la MAUVAISE cause. C'est
  // pourquoi l'assertion épingle « séance 99 » et non le simple fait du refus : c'est le seul
  // discriminant entre les deux gardes.
  {
    dossier: 'corps-titre-atx-ferme',
    cause:
      /corps ligne 11 : « ## Ce que le validateur regarde » cite la séance 99, absente de « horaire\.json »/,
  },
  // ---------------------------------------------------------------------------------------------
  // Cas 49 et 50 (décision D-A, lot 3) — LES DEUX REFUS QUE LE CONTRAT ÉCRIT EN ROUGE
  // sur le conteneur « :::: marche-a-suivre ».
  // ---------------------------------------------------------------------------------------------
  // 🔴 CES DEUX CAS DISCRIMINENT, ils ne se contentent pas de refuser. Les deux racines sont des
  // copies de `__fixtures__/marche-a-suivre`, qui est VALIDE : la seule différence est la faute
  // injectée, et l'assertion épingle le morceau de message qu'aucun autre garde ne produirait.
  //
  // (a) L'AMBIGUÏTÉ. Deux sections au même titre rendent `{voir="…"}` indécidable, et le contrat
  //     l'écrit : c'est un refus, jamais « la première gagne ». Une résolution positionnelle serait
  //     le littéral fragile que le contrat vient d'interdire, déguisé en commodité — renommer l'une
  //     des deux sections déplacerait le renvoi EN SILENCE. L'assertion exige que les DEUX lignes
  //     en cause soient nommées : un message qui dirait seulement « ambigu » n'aiderait personne.
  {
    dossier: 'voir-titre-ambigu',
    cause:
      /renvoie à « Ce que le validateur regarde », titre AMBIGU — 2 sections le portent \(lignes 28, 43\)/,
  },
  // (b) LA CIBLE NON PUBLIÉE. Un module `verifiee` n'est pas prerendu : le lien servirait une 404 —
  //     l'incident de production du 2026-08-27, à l'identique. ⚠️ L'assertion épingle
  //     « statut: verifiee » et non le simple fait du refus : sans ce discriminant, un garde qui
  //     refuserait TOUT renvoi `module:` (parce que son index serait vide, disons) passerait pour
  //     juste. Une fixture qui refuse ne prouve jamais seule qu'elle refuse pour la BONNE cause.
  {
    dossier: 'voir-module-non-publiee',
    cause:
      /« voir="module:cible" » renvoie à un module en « statut: verifiee » — un module non publié n'est pas prerendu/,
  },
  // (c) LE NOM COLLÉ À SON ACCOLADE — la DIVERGENCE entre les deux copies, mesurée le 2026-09-02.
  //     `nomDeConteneur` lisait `/^([A-Za-z0-9-]+)/`, qui s'arrête sur `{` : le validateur rendait
  //     « 2 leçon(s) valides » en code 0 sur cette racine, que le compilateur refusait. La
  //     construction restait fail-CLOSED — rien n'était publié en clair — mais le juge d'AMONT
  //     laissait passer ce que l'aval refuse, et l'auteur recevait le message générique du
  //     compilateur au lieu de celui qui nomme sa faute (famille S-010).
  // ⚠️ L'ASSERTION ÉPINGLE LE NOM COLLÉ, pas le simple fait du refus : un validateur qui
  //     refuserait TOUT conteneur (liste vide, disons) passerait pour juste. Ce qui discrimine est
  //     que le nom RETENU soit le premier jeton séparé par des blanches — `marche-a-suivre{titre="Faire`
  //     — c'est-à-dire EXACTEMENT ce que markdown-it appelle le nom du conteneur.
  {
    dossier: 'marche-nom-colle-a-l-accolade',
    cause:
      /corps ligne 13 : conteneur « ::: marche-a-suivre\{titre="Faire » hors de la liste fermée/,
  },
  // ---------------------------------------------------------------------------------------------
  // Cas 52 (lot 7) — LE SLUG INCONNU, la branche jumelle de « la cible n'est pas publiee ».
  // ---------------------------------------------------------------------------------------------
  // 🔴 CETTE BRANCHE EXISTAIT DANS LES DEUX COPIES ET AUCUN RUNNER NE L'EXERÇAIT (L-019). Elle est
  //     pourtant celle que l'auteur rencontre le plus : une faute de frappe dans un slug, ou un
  //     module cité avant d'exister. `voir-module-non-publiee` ne la couvre pas — sa cible EXISTE,
  //     c'est son statut qui pèche, et les deux refus sortent de deux `if` distincts.
  // ⚠️ CE DOSSIER NE PORTE QU'UNE LEÇON, à la différence de ses deux voisins `voir-…`. Sa faute
  //     n'est pas une relation entre modules : un slug absent du sujet l'est déjà quand le sujet
  //     n'en compte qu'un. C'est ce qui rend son discriminant lisible — « slugs déclarés : guide »
  //     énumère un index NON VIDE, donc construit. Sans lui, un validateur dont l'index resterait
  //     vide refuserait TOUT renvoi « module: » et passerait pour juste, exactement comme le
  //     rappelle l'assertion de `voir-module-non-publiee` sur le statut lu.
  {
    dossier: 'voir-module-inconnu',
    cause:
      /corps ligne 22 : « voir="module:cible-absente" » renvoie à un module inconnu de ce sujet \(slugs déclarés : guide\)/,
  },
];

/**
 * Les SEPT variantes d'encadré du contrat, ÉCRITES EN DUR et dans l'ordre du contrat.
 *
 * L-012 : ce littéral n'est dérivé d'aucune des deux listes qu'il vérifie. Un test qui lirait la
 * constante dont il contrôle la valeur ne vérifierait que `x === x` — et les deux copies pourraient
 * dériver ENSEMBLE, ce qui est précisément le mode d'échec qu'on ferme ici.
 *
 * ⚠️ ELLES ÉTAIENT SIX JUSQU'À E3-ST21 : le septième nom se recopie À LA MAIN ici, dans
 * `VARIANTES_ENCADRE` (compilateur) et dans `CONTENEURS_AUTORISES` (validateur). Ce n'est pas une
 * corvée oubliée, c'est le geste qui oblige un humain à constater qu'une variante est apparue.
 */
const SEPT_VARIANTES_ENCADRE = [
  'attention',
  'note',
  'a-retenir',
  'cours',
  'complement',
  'correction-du-cours',
  'exercice-du-cours',
] as const;

/** Les trois conteneurs de comparaison, qui ne sont PAS des encadrés (ils n'ont pas de variante). */
const TROIS_CONTENEURS_DE_COMPARAISON = ['comparaison', 'vulnerable', 'corrige'] as const;

/**
 * Le QUATRIÈME conteneur hors encadré (décision D-A, 2026-08-31) : la marche à suivre.
 *
 * Il n'a pas de variante non plus — il porte un `{titre="…"}` obligatoire et son contenu est une
 * liste ordonnée d'étapes, pas de la prose libre. Il est isolé dans sa propre constante pour que
 * l'assertion de recoupement ci-dessous continue de comparer des ENCADRÉS à des encadrés.
 */
const CONTENEUR_HORS_ENCADRE_MARCHE = ['marche-a-suivre'] as const;

/**
 * Les CINQUIÈME et SIXIÈME conteneurs hors encadré (décision D-C, 2026-08-31) : les onglets de
 * méthode et leur volet.
 *
 * Ils n'ont pas de variante non plus. `methodes` n'admet AUCUN attribut ; `methode` porte un
 * `{libelle="…"}` obligatoire et le premier MARQUEUR SANS VALEUR du dépôt, `defaut`. Leur ordre
 * est celui des deux déclarations : le conteneur, puis son volet.
 *
 * ⚠️ Ce littéral est écrit À LA MAIN, comme les trois du dessus, et c'est le geste qui oblige un
 * humain à constater qu'un nom est apparu (L-012). Le commentaire de `compiler-markdown.mjs` qui
 * promettait ce test au « lot 5 » a été corrigé dans le même diff : il ne promet plus un travail
 * fait (L-070).
 */
const DEUX_CONTENEURS_DE_METHODES = ['methodes', 'methode'] as const;

/**
 * Extrait les noms d'une déclaration de liste d'un fichier d'outillage.
 *
 * ANALYSE PAR LIGNES, PAS UNE RECHERCHE GLOBALE DE CHAÎNES CITÉES. Les deux déclarations portent
 * des commentaires en français, donc des apostrophes droites : un `/'([a-z-]+)'/g` lâché sur le
 * bloc entier lirait des morceaux de prose comme des noms de conteneurs. On découpe, on écarte les
 * lignes de commentaire, puis on n'accepte qu'une ligne qui EST une entrée de liste.
 *
 * ⚠️ Une extraction qui échoue LÈVE. Sans ça, un renommage de constante rendrait deux tableaux
 * vides — égaux entre eux, et le test passerait vert sur zéro information.
 */
function listeDeclaree(fichier: string, motif: RegExp): string[] {
  const bloc = motif.exec(readFileSync(fichier, 'utf8'))?.[1];
  if (bloc === undefined) {
    throw new Error(`déclaration introuvable dans ${fichier} — c'est l'extraction qui a échoué`);
  }
  const noms = bloc
    .split('\n')
    .map((ligne) => ligne.trim())
    .filter((ligne) => !ligne.startsWith('//'))
    .map((ligne) => /^'([a-z0-9-]+)',$/.exec(ligne)?.[1])
    .filter((nom): nom is string => nom !== undefined);
  if (noms.length === 0) {
    throw new Error(`aucune entrée lue dans ${fichier} — l'extraction ne prouverait rien`);
  }
  return noms;
}

/**
 * Lance le validateur et rend sa sortie complète. Le mode `--fixtures` sort en
 * code 1 PAR CONSTRUCTION (du contenu invalide a bien été détecté) : c'est la
 * liste des causes qui fait foi, pas le code. On ne peut donc pas se contenter
 * de `execFileSync` sans capture.
 */
function lancer(args: readonly string[]): { sortie: string; code: number } {
  try {
    const sortie = execFileSync(process.execPath, [VALIDATEUR, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { sortie, code: 0 };
  } catch (erreur) {
    const detail = erreur as { status?: number; stdout?: string; stderr?: string };
    return {
      sortie: `${detail.stdout ?? ''}${detail.stderr ?? ''}`,
      code: detail.status ?? -1,
    };
  }
}

describe('le contrôle positif du validateur de contenu', () => {
  let sortie = '';

  beforeAll(() => {
    sortie = lancer(['--fixtures', DOSSIER_INVALIDES]).sortie;
  }, DELAI);

  it(
    'traite les CINQUANTE-DEUX cas, et aucun ne manque à l’appel',
    () => {
      // Compte en DUR, pas `CAS_ATTENDUS.length` : dériver l'attendu de la table qui sert déjà à
      // la boucle ci-dessous ferait un test qui se compare à lui-même (L-012). Ce littéral est ce
      // qui oblige un humain à constater qu'un cas est apparu ou a disparu.
      expect(sortie).toContain('52 cas attendus INVALIDES');
      expect(sortie).toContain('52/52 cas refusés avec une cause nommée');
    },
    DELAI,
  );

  // 🔴 LE CONTRÔLE POSITIF DE « G2 COMPTE À TOUTE PROFONDEUR ».
  // Les assertions de la boucle ci-dessous portent sur la sortie ENTIÈRE : elles resteraient vertes
  // si une anomalie SUPPLÉMENTAIRE s'ajoutait à un cas. Or c'est exactement ce qui se produit si G2
  // cesse de voir l'imbrication — la fixture, dont l'unique encadré `::: cours` est imbriqué dans
  // un `:::: note`, se met à violer G2 en plus de sa faute propre, et le runner imprime
  // « (+1 autre(s)) » derrière la cause. Ce test-ci exige donc la ligne EXACTE, terminée par sa fin
  // de ligne : rien ne peut se glisser après « l'autorise ».
  // ⚠️ CE TEST GARDE LE CONTRAT, PAS UNE IMPLÉMENTATION (précision du 2026-08-20). Il parlait
  // naguère de « la descente récursive de `compterProvenance` » : cette descente parcourait un
  // ARBRE de conteneurs dont AUCUNE sortie n'observait la forme — un compte plat des lignes
  // d'ouverture rendait le même nombre sur tout document, imbriqué ou non. L'arbre est parti ;
  // l'indépendance à la profondeur est désormais structurelle, et c'est cette fixture qui la
  // constate du point de vue de l'auteur.
  it(
    'la fixture imbriquée n’est refusée QUE sur sa faute propre — la provenance imbriquée est comptée',
    () => {
      expect(sortie).toMatch(
        /refusé : corps ligne 27 : « ::: correction-du-cours » porte un attribut « source » vide — une correction du cours cite la source qui l'autorise\r?\n/,
      );
    },
    DELAI,
  );

  // Le cœur : chaque cas est refusé POUR SA PROPRE RAISON. Des refus tous identiques
  // passeraient l'assertion globale ci-dessus et échoueraient ici.
  for (const { dossier, cause } of CAS_ATTENDUS) {
    it(
      `refuse « ${dossier} » sur sa cause propre`,
      () => {
        expect(sortie).toMatch(new RegExp(`✔ ${dossier}`));
        expect(sortie).toMatch(cause);
      },
      DELAI,
    );
  }

  // GARDE-FOU DE COMPLÉTUDE. Sans lui, ajouter un cas de fixture de plus sans
  // écrire son assertion laisserait ce spec vert — et le nouveau cas ne serait
  // vérifié par personne, ce qui est exactement la faute que ce fichier répare.
  it('connaît TOUS les dossiers de fixtures — un cas ajouté sans assertion fait rougir', () => {
    const surDisque = readdirSync(DOSSIER_INVALIDES, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    const connus = CAS_ATTENDUS.map((c) => c.dossier).sort();
    expect(surDisque).toEqual(connus);
  });
});

// =============================================================================
// LES DEUX LISTES DUPLIQUÉES DISENT-ELLES LA MÊME CHOSE ?
// -----------------------------------------------------------------------------
// La liste fermée des conteneurs `:::` existe en DEUX exemplaires — `VARIANTES_ENCADRE` dans
// `compiler-markdown.mjs`, `CONTENEURS_AUTORISES` dans `valider.mjs` — et la duplication est
// VOULUE : le validateur tourne AVANT le compilateur et ne doit pas en dépendre (importer la
// constante chargerait Shiki et markdown-it au démarrage du validateur, et inverserait la
// stratification du pipeline). Elle n'est donc PAS à mutualiser.
//
// Ce qui n'est pas acceptable, c'est que le seul lien entre les deux copies soit un COMMENTAIRE
// (L-008) — même patron que la clef d'indiscernabilité, appariée par `--clefs`. Ce bloc est
// l'appariement de celle-ci.
//
// LE MODE D'ÉCHEC N'EST VICIEUX QUE DANS UN SENS. Si le VALIDATEUR devient plus permissif que le
// compilateur, une leçon sort G-content verte puis casse au prerender d'`ng build`, sur un message
// qui ne nomme pas le fichier au milieu d'une pile Angular. Si c'est le COMPILATEUR qui l'est,
// l'auteur reçoit un refus pour un conteneur que le rendu aurait su afficher.
// =============================================================================
describe('les deux copies de la liste fermée de conteneurs', () => {
  it('le compilateur déclare EXACTEMENT les sept variantes d’encadré du contrat', () => {
    expect(listeDeclaree(COMPILATEUR, /const VARIANTES_ENCADRE = \[([\s\S]*?)\];/)).toEqual([
      ...SEPT_VARIANTES_ENCADRE,
    ]);
  });

  it('le validateur déclare les six conteneurs hors encadré PUIS les sept mêmes variantes', () => {
    expect(
      listeDeclaree(VALIDATEUR, /const CONTENEURS_AUTORISES = new Set\(\[([\s\S]*?)\]\);/),
    ).toEqual([
      ...TROIS_CONTENEURS_DE_COMPARAISON,
      ...CONTENEUR_HORS_ENCADRE_MARCHE,
      ...DEUX_CONTENEURS_DE_METHODES,
      ...SEPT_VARIANTES_ENCADRE,
    ]);
  });

  // 🔴 LE CONSTAT QUE L'ASSERTION DE RECOUPEMENT NE FAIT PAS, et qui manquait au lot 3.
  // Celle du bas compare les ENCADRÉS des deux copies ; la marche à suivre n'en est pas un, et sa
  // présence dans les deux fichiers n'était donc appariée par rien. Or le mode d'échec est le
  // vicieux (voir l'en-tête de ce bloc) : un validateur qui ignorerait `marche-a-suivre` la
  // refuserait comme conteneur inconnu, et l'auteur recevrait un refus pour un conteneur que le
  // rendu sait afficher. La liste du compilateur est ici lue par ses LITTÉRAUX seuls — le
  // `...VARIANTES_ENCADRE` qui la termine n'en est pas un, il est apparié par le test au-dessus.
  it('les deux copies connaissent les MÊMES six conteneurs hors encadré', () => {
    const attendus = [
      ...TROIS_CONTENEURS_DE_COMPARAISON,
      ...CONTENEUR_HORS_ENCADRE_MARCHE,
      ...DEUX_CONTENEURS_DE_METHODES,
    ];
    expect(
      listeDeclaree(COMPILATEUR, /const CONTENEURS_AUTORISES = new Set\(\[([\s\S]*?)\]\);/),
    ).toEqual(attendus);
    expect(
      listeDeclaree(VALIDATEUR, /const CONTENEURS_AUTORISES = new Set\(\[([\s\S]*?)\]\);/).slice(
        0,
        attendus.length,
      ),
    ).toEqual(attendus);
  });

  // Le troisième constat, celui qu'aucun des deux ci-dessus ne fait seul : les listes se
  // RECOUPENT. Retirer un nom d'un seul des deux fichiers fait rougir l'assertion de ce
  // fichier-là ; celle-ci rougit en plus en nommant l'écart, ce qui est le message utile.
  // ---------------------------------------------------------------------------------------------
  // LA SECONDE LISTE DUPLIQUÉE : les clefs admises sur un TITRE de section (§3bis, lot 1a).
  // ---------------------------------------------------------------------------------------------
  // Même duplication assumée, même mode d'échec asymétrique que ci-dessus. Elle s'extrait
  // autrement : `CLEFS_RENVOI_DE_TITRE` est écrite en IDENTIFIANTS (`[ATTRIBUT_DIAPOS, …]`) et non
  // en littéraux, pour qu'un nom d'attribut ne soit pas recopié deux fois DANS un même fichier.
  // On résout donc chaque identifiant jusqu'à sa valeur — sans quoi ce test comparerait des noms
  // de constantes, c'est-à-dire deux orthographes plutôt que deux contrats.
  const TROIS_CLEFS_DE_TITRE = ['diapos', 'seance', 'cours'] as const;

  function clefsDeTitreDeclarees(fichier: string): string[] {
    const source = readFileSync(fichier, 'utf8');
    const bloc = /const CLEFS_RENVOI_DE_TITRE = \[([^\]]*)\];/.exec(source)?.[1];
    if (bloc === undefined) {
      throw new Error(`CLEFS_RENVOI_DE_TITRE introuvable dans ${fichier} — extraction en échec`);
    }
    const identifiants = bloc
      .split(',')
      .map((jeton) => jeton.trim())
      .filter((jeton) => jeton !== '');
    if (identifiants.length === 0) {
      throw new Error(`aucune clef lue dans ${fichier} — l'extraction ne prouverait rien`);
    }
    return identifiants.map((identifiant) => {
      const valeur = new RegExp(`const ${identifiant} = '([a-z-]+)';`).exec(source)?.[1];
      if (valeur === undefined) {
        throw new Error(`« ${identifiant} » n'est pas une constante de chaîne de ${fichier}`);
      }
      return valeur;
    });
  }

  it('les deux copies admettent EXACTEMENT les trois clefs du §3bis sur un titre', () => {
    expect(clefsDeTitreDeclarees(COMPILATEUR)).toEqual([...TROIS_CLEFS_DE_TITRE]);
    expect(clefsDeTitreDeclarees(VALIDATEUR)).toEqual([...TROIS_CLEFS_DE_TITRE]);
  });

  it('aucune des deux copies ne connaît un encadré que l’autre ignore', () => {
    const duCompilateur = listeDeclaree(COMPILATEUR, /const VARIANTES_ENCADRE = \[([\s\S]*?)\];/);
    const duValidateur = listeDeclaree(
      VALIDATEUR,
      /const CONTENEURS_AUTORISES = new Set\(\[([\s\S]*?)\]\);/,
    ).filter(
      (nom) =>
        !TROIS_CONTENEURS_DE_COMPARAISON.includes(nom as never) &&
        !CONTENEUR_HORS_ENCADRE_MARCHE.includes(nom as never) &&
        !DEUX_CONTENEURS_DE_METHODES.includes(nom as never),
    );
    expect([...duValidateur].sort()).toEqual([...duCompilateur].sort());
  });
});

describe('l’autre moitié de la pince — le validateur ne refuse pas TOUT', () => {
  it(
    'accepte la leçon-témoin valide, en code 0',
    () => {
      const { sortie, code } = lancer(['--racine', FIXTURE_VALIDE]);
      expect(code).toBe(0);
      expect(sortie).toMatch(/1 leçon\(s\) valides/);
    },
    DELAI,
  );

  // ⚠️ CE TEST EST LA MOITIÉ QUI MANQUAIT AU CAS INVALIDE, et il en faut DEUX moitiés, pas une.
  // Le seizième cas de fixture prouve que le MÉLANGE est refusé. Seul, il resterait vert sur un
  // validateur qui refuserait `section` en toutes circonstances. C'est ce test-ci — deux leçons
  // qui en portent une chacune, code 0 — qui rend ce contournement impossible. La moitié
  // symétrique (« aucune section nulle part ») est le test ci-dessus : `temoin-minimal` n'en
  // porte pas, et sort en code 0 lui aussi. Les trois ensemble décrivent le tout-ou-rien entier.
  // ⚠️ LA MOITIÉ POSITIVE DE L'ANCRAGE AU COURS (E3-ST20). Les onze cas fautifs ci-dessus
  // resteraient TOUS verts sur un validateur qui refuserait `seance`, `diapos` et `horaire.json`
  // en toutes circonstances — c'est-à-dire sur un contrat qu'on aurait cassé au lieu de l'ouvrir.
  // Cette fixture est ce qui rend ce contournement impossible : elle porte les quatre formes de
  // renvoi légales, dont l'encadré NU (aucun attribut) qui est le cas des six leçons déjà
  // publiées, et elle sort en code 0.
  it(
    'accepte une racine ANCRÉE AU COURS — horaire, « seance » et renvois de diapositives',
    () => {
      const { sortie, code } = lancer(['--racine', FIXTURE_ANCRAGE]);
      expect(code).toBe(0);
      expect(sortie).toMatch(/1 leçon\(s\) valides/);
    },
    DELAI,
  );

  it(
    'accepte un module rattaché à une évaluation PRATIQUE — R-3 ouvre le projet de session',
    () => {
      const { sortie, code } = lancer(['--racine', FIXTURE_EVALUATION_PRATIQUE]);
      expect(code).toBe(0);
      expect(sortie).toMatch(/1 leçon\(s\) valides/);
    },
    DELAI,
  );

  it(
    'accepte une racine dont un module PUBLIÉ place TOUS les exercices de sa séance',
    () => {
      const { sortie, code } = lancer(['--racine', FIXTURE_EXERCICES]);
      expect(code).toBe(0);
      expect(sortie).toMatch(/1 leçon\(s\) valides/);
    },
    DELAI,
  );

  it(
    'accepte DEUX leçons qui portent chacune une « section » — le tout-ou-rien satisfait',
    () => {
      const { sortie, code } = lancer(['--racine', FIXTURE_SECTIONS_PARTOUT]);
      expect(code).toBe(0);
      expect(sortie).toMatch(/2 leçon\(s\) valides/);
    },
    DELAI,
  );
});

// =============================================================================
// LES VOLETS D'UN `:::: methodes` — la moitié VALIDATEUR (décision D-C, lot 5)
// -----------------------------------------------------------------------------
// 🔴 POURQUOI CE BLOC MONTE SES RACINES À LA VOLÉE PLUTÔT QUE D'ENTRER DANS
// `__fixtures__/invalides/`. Le corpus de cas invalides du conteneur `methodes` est un lot à part
// (lot 7) : chacun de ses cas exige un dossier complet et fait bouger le compte en dur de ce
// fichier. Or la grammaire de MARQUEURS ajoutée au lot 5 (`{libelle="…" defaut}`) est une
// extension du validateur, et un garde-fou qu'aucun runner n'exerce est une intention, pas un
// gate (L-019). Les cas ci-dessous sont donc écrits ici, dans un bac à sable jetable, et ne
// touchent ni au dossier `invalides/` ni au compte de 51.
//
// ⚠️ LE DERNIER CAS EST LE CONTRÔLE POSITIF DU CONTRÔLE DE RÉSIDU, et il porte sur un appelant
// SANS marqueur : `::: note {lignes=2}` (guillemets oubliés). C'est ce que l'extension pouvait
// casser sans que rien d'autre le dise — un résidu avalé rendrait un objet vide et enverrait une
// annotation à la ligne 0. Les messages sont COPIÉS de la sortie réelle (L-089).
// =============================================================================
describe('les volets d’un « :::: methodes », côté VALIDATEUR', () => {
  const FIXTURE_METHODES = 'tools/content-pipeline/__fixtures__/methodes';
  let bac = '';

  beforeAll(() => {
    bac = mkdtempSync(join(tmpdir(), 'drjst-methodes-'));
  });

  afterAll(() => {
    rmSync(bac, { recursive: true, force: true });
  });

  /**
   * Monte une racine d'un module en remplaçant le conteneur `methodes` de la fixture témoin par
   * le bloc donné, puis rend la sortie du validateur.
   */
  function causeDuBloc(nom: string, bloc: string): string {
    const source = readFileSync(join(FIXTURE_METHODES, '01-deux-volets', 'lecon.md'), 'utf8');
    const debut = source.indexOf(':::: methodes');
    const fin = source.indexOf('## Exemple simple');
    const dossier = join(bac, nom, '01-deux-volets');
    mkdirSync(dossier, { recursive: true });
    writeFileSync(
      join(dossier, 'lecon.md'),
      `${source.slice(0, debut)}${bloc}\n\n${source.slice(fin)}`,
      'utf8',
    );
    writeFileSync(
      join(dossier, 'quiz.json'),
      readFileSync(join(FIXTURE_METHODES, '01-deux-volets', 'quiz.json'), 'utf8'),
      'utf8',
    );
    const { sortie, code } = lancer(['--racine', join(bac, nom)]);
    if (code === 0) throw new Error(`« ${nom} » a été ACCEPTÉ — le garde-fou n'a pas mordu`);
    return sortie;
  }

  const VOLET_VALIDE = ['::: methode {libelle="B"}', '', 'Deux.', '', ':::'].join('\n');

  /**
   * Monte un conteneur d’onglets à DEUX volets dont seule la partie VARIABLE est passée ici.
   *
   * Les refus ci-dessous ne diffèrent que par UNE ligne — l’ouverture du conteneur, ou les
   * attributs du premier volet. Recopier le gabarit entier à chaque cas noyait cette ligne dans
   * dix autres identiques : il fallait comparer deux blocs à l’œil pour voir ce qui était
   * mesuré. SonarCloud l’a chiffré — 52,8 % de duplication sur le code neuf de ce fichier, et
   * la porte rouge sur la PR du lot 5. Ce qui varie est un argument ; le reste s’écrit une fois.
   */
  function conteneurDeMethodes(premierVolet: string, ouverture = ':::: methodes'): string {
    return [
      ouverture,
      '',
      premierVolet,
      '',
      'Un.',
      '',
      ':::',
      '',
      VOLET_VALIDE,
      '',
      '::::',
    ].join('\n');
  }

  it(
    'refuse un MARQUEUR inconnu en le nommant, et énumère ceux qu’il admet',
    () => {
      const sortie = causeDuBloc(
        'marqueur-inconnu',
        conteneurDeMethodes('::: methode {libelle="A" defo}'),
      );
      // LISTE BLANCHE NOMINATIVE : le refus nomme le jeton fautif ET ce qui est admis.
      expect(sortie).toContain('« defo » n\u2019est ni un attribut ni un marqueur connu');
      expect(sortie).toContain('marqueurs admis : defaut');
    },
    DELAI,
  );

  it(
    'refuse « {libelle=""} » — c’est le seul nom accessible que l’onglet aura',
    () => {
      const sortie = causeDuBloc(
        'libelle-vide',
        conteneurDeMethodes('::: methode {libelle="" defaut}'),
      );
      expect(sortie).toContain('« ::: methode » sans attribut « libelle » non vide');
    },
    DELAI,
  );

  // 🔴 LA DIVERGENCE QU'UNE REVUE A MESURÉE (correctif C1), ET C'EST LE CAS LE PLUS GRAVE DU LOT.
  // Cette copie ne filtrait QUE `::: methode` : la ligne d'ouverture du conteneur n'était jamais
  // regardée. Mesuré sur ce bloc exact — validateur « 1 leçon(s) valides », code 0 ; compilateur
  // code 1, « attribut « titre » inconnu ». Le juge d'amont laissait passer ce que l'aval refuse
  // (famille S-010). Le fragment asserté est COPIÉ de la sortie réelle des DEUX copies.
  it(
    'refuse un attribut posé sur le CONTENEUR — la ligne que cette copie ne regardait pas',
    () => {
      const sortie = causeDuBloc(
        'attribut-sur-le-conteneur',
        conteneurDeMethodes('::: methode {libelle="A" defaut}', ':::: methodes {titre="Deux chemins"}'),
      );
      expect(sortie).toContain('attribut « titre » inconnu');
      expect(sortie).toContain('n’admet aucun attribut');
    },
    DELAI,
  );

  // Le marqueur RÉPÉTÉ : branche présente des deux côtés depuis le lot 5, exercée par aucun
  // runner (L-019). Elle refuse correctement — encore fallait-il qu'un gate le dise.
  it(
    'refuse un marqueur « defaut » écrit deux fois — une frappe, pas une intention',
    () => {
      const sortie = causeDuBloc(
        'defaut-repete',
        conteneurDeMethodes('::: methode {libelle="A" defaut defaut}'),
      );
      expect(sortie).toContain('marqueur « defaut » écrit deux fois');
    },
    DELAI,
  );

  // 🔴 PARITÉ D'ORDRE AVEC LE COMPILATEUR (correctif C5). Sur `{libelle="…" titre="X" defo}`, les
  // deux copies refusaient — pour deux causes DIFFÉRENTES : le compilateur juge les clefs dans sa
  // boucle de paires, donc avant le résidu, et cette copie jugeait le résidu d'abord. L'auteur
  // corrigeait « defo » ou « titre » selon le gate qui avait rougi. Le MÊME littéral est asserté
  // dans `pipeline-contenu-compilation.spec.ts`, cas « clef-inconnue-avant-residu » : c'est le
  // couple des deux assertions qui prouve la parité, aucune ne la prouve seule (L-089).
  it(
    'refuse une clef inconnue AVANT un marqueur inconnu, comme le compilateur',
    () => {
      const sortie = causeDuBloc(
        'clef-inconnue-avant-residu',
        conteneurDeMethodes('::: methode {libelle="A" titre="X" defo}'),
      );
      expect(sortie).toContain('attribut « titre » inconnu');
      expect(sortie).not.toContain('« defo »');
    },
    DELAI,
  );

  it(
    'refuse ENCORE « {lignes=2} » sur un appelant SANS marqueur — le résidu reste sensible',
    () => {
      const sortie = causeDuBloc(
        'residu-sans-marqueur',
        ['::: note {lignes=2}', 'Un encadré.', ':::'].join('\n'),
      );
      expect(sortie).toContain('attributs illisibles sur « ::: note » — « lignes=2 »');
    },
    DELAI,
  );

  it(
    'accepte la racine témoin — 2 volets et 3 volets, en code 0',
    () => {
      const { sortie, code } = lancer(['--racine', FIXTURE_METHODES]);
      expect(code).toBe(0);
      expect(sortie).toMatch(/2 leçon\(s\) valides/);
    },
    DELAI,
  );
});

// =============================================================================
// LE RENVOI `{voir="…"}` D'UNE ÉTAPE — la moitié VALIDATEUR (décision D-A, lot 7)
// -----------------------------------------------------------------------------
// 🔴 POURQUOI CE BLOC EXISTE, ET CE QUE LA MESURE A TROUVÉ. `jugerRenvoiDEtape` porte SEPT refus.
// Un seul était exercé au 2026-09-07 — le titre AMBIGU, par la fixture `voir-titre-ambigu`. Les
// six autres étaient du code mort du point de vue des gates : présents, corrects, et invisibles à
// toute régression (L-019). Le compilateur, lui, a ses propres contrôles positifs pour quelques-
// unes de ces formes — ce qui est exactement le mode d'échec que ce dépôt a déjà payé trois fois :
// l'aval refuse, l'amont laisse passer, et l'auteur reçoit le message de l'aval, qui parle d'un
// objet (une étape compilée) qu'il n'a pas sous les yeux. Famille S-010.
//
// ⚠️ POURQUOI ICI PLUTÔT QUE DANS `__fixtures__/invalides/`. Chacun de ces six cas est une
// MUTATION D'UNE SEULE LIGNE de la racine témoin `__fixtures__/marche-a-suivre`, qui est VALIDE.
// En faire six dossiers coûterait ~1 000 lignes recopiées pour six lignes utiles, et §9 de
// `.claude/rules/agent-context-budget.md` dit qu'un corpus de fixtures se COMPTE avant d'être
// écrit. Le bac à sable jetable exécute le MÊME binaire sur une VRAIE racine : la couverture est
// la même, le coût ne l'est pas. Le dossier `invalides/` reste réservé aux fautes qu'une mutation
// d'une ligne ne sait pas écrire — d'où `voir-module-inconnu`, qui a besoin d'un sujet à lui.
//
// ⚠️ LES MESSAGES SONT COPIÉS DE LA SORTIE RÉELLE (L-089), jamais rédigés de mémoire — et
// l'APOSTROPHE est le piège de ce bloc, payé une fois en écrivant : `jugerRenvoiDEtape` compose
// ses causes avec des apostrophes DROITES (« qui n'est le titre d'aucune section »), alors que la
// prose de ce dépôt emploie la courbe et qu'un éditeur la substitue volontiers. Une assertion
// « normalisée » à la relecture rougirait donc sur un produit parfaitement sain (L-035).
// ⚠️ Corollaire, visible dans la table : le texte de l'ÉTAPE injectée peut porter la courbe
// (elle vient de l'auteur et traverse le validateur telle quelle) là où la CAUSE attendue porte
// la droite. Les deux apparaissent dans le même cas `titre-introuvable` — ce n'est pas une faute
// de frappe.
// =============================================================================
describe('le renvoi « {voir="…"} » d’une étape, côté VALIDATEUR', () => {
  const FIXTURE_MARCHE = 'tools/content-pipeline/__fixtures__/marche-a-suivre';

  /** L'étape témoin de la racine valide — la SEULE ligne que chaque cas remplace. */
  const ETAPE_TEMOIN =
    '2. {voir="module:cible"} Relire la PREMIÈRE anomalie du journal, jamais la dernière.';

  let bac = '';

  beforeAll(() => {
    bac = mkdtempSync(join(tmpdir(), 'drjst-voir-'));
  });

  afterAll(() => {
    rmSync(bac, { recursive: true, force: true });
  });

  /**
   * Copie la racine témoin, remplace son étape n°2 par celle du cas, et rend la sortie du refus.
   *
   * 🔴 LA MUTATION EST VÉRIFIÉE AVANT D'ÊTRE MESURÉE (L-015). Les fins de ligne de ce dépôt sont
   * mixtes ; un remplacement qui ne mordrait pas laisserait la racine VALIDE, et le `throw` de la
   * fin accuserait le garde-fou d'un défaut qui serait celui du harnais. On lève donc sur
   * l'absence de l'étape témoin — c'est-à-dire sur la fixture qui aurait changé de forme.
   */
  function causeDeLEtape(nom: string, etape: string): string {
    const racine = join(bac, nom);
    cpSync(FIXTURE_MARCHE, racine, { recursive: true });
    const fichier = join(racine, '02-guide', 'lecon.md');
    const source = readFileSync(fichier, 'utf8');
    if (!source.includes(ETAPE_TEMOIN)) {
      throw new Error(`« ${nom} » : l’étape témoin est introuvable — la fixture a changé de forme`);
    }
    writeFileSync(fichier, source.replace(ETAPE_TEMOIN, etape), 'utf8');
    const { sortie, code } = lancer(['--racine', racine]);
    if (code === 0) throw new Error(`« ${nom} » a été ACCEPTÉ — le garde-fou n’a pas mordu`);
    return sortie;
  }

  /**
   * LES SIX REFUS, EN TABLE — chacun sur SA cause propre.
   *
   * ⚠️ Un garde-fou qui refuserait TOUT renvoi passerait un test qui n'épingle que l'échec. Ce qui
   * discrimine est le fragment de message : il nomme la faute commise, et lui seul distingue ces
   * six branches les unes des autres.
   */
  const REFUS: readonly { nom: string; quoi: string; etape: string; cause: string }[] = [
    {
      nom: 'renvoi-vide',
      quoi: 'un renvoi VIDE — il ne désigne rien, et le dire vaut mieux que l’ignorer',
      etape: '2. {voir=""} Relire la PREMIÈRE anomalie du journal.',
      cause: 'renvoi vide ; citer un titre de section de cette leçon, ou « module:<slug> »',
    },
    {
      nom: 'module-sans-slug',
      quoi: 'un « module: » SANS slug — le préfixe seul ne nomme aucune cible',
      etape: '2. {voir="module:"} Relire la PREMIÈRE anomalie du journal.',
      cause: '« module: » sans slug',
    },
    {
      // ⚠️ DISCRIMINANT : le message ÉNUMÈRE les titres existants. Sans cette moitié, un
      // validateur dont la liste de sections serait vide refuserait TOUT renvoi de section et
      // passerait pour juste — même piège que l'index vide de `voir-module-inconnu`.
      nom: 'titre-introuvable',
      quoi: 'un titre de section INTROUVABLE, en énumérant ceux qui existent',
      etape: '2. {voir="Une section qui n’existe pas"} Relire le journal.',
      cause:
        "qui n'est le titre d'aucune section de cette leçon (titres : « L'idée en une image »",
    },
    {
      // Le renvoi est SYNTAXIQUEMENT juste et sa cible EXISTE : seule sa POSITION pèche. C'est le
      // cas qui prouve que la règle porte sur la tête de l'item, et non sur la seule présence
      // d'un bloc d'accolades quelque part dans la phrase.
      nom: 'renvoi-pas-en-tete',
      quoi: 'un renvoi valide mais posé AU MILIEU de la phrase',
      etape: '2. Relire le journal {voir="Ce que le validateur regarde"} sans tarder.',
      cause: "le renvoi n'est pas en TÊTE de l'étape",
    },
    {
      nom: 'deux-renvois',
      quoi: 'DEUX renvois sur la même étape — deux destinations valent deux étapes',
      etape: '2. {voir="Ce que le validateur regarde"} Relire {voir="module:cible"} le journal.',
      cause: 'deux renvois sur la même étape',
    },
    {
      // 🔴 LES GUILLEMETS COURBES. Un traitement de texte, ou un éditeur réglé sur la typographie
      // française, les substitue SANS PRÉVENIR. Le refus doit donc dire que seuls les droits sont
      // acceptés — sinon l'auteur relit dix fois une ligne qui lui paraît identique au contrat.
      nom: 'accolade-illisible',
      quoi: 'un bloc d’attributs aux guillemets COURBES, en disant lesquels sont acceptés',
      etape: '2. {voir=“Ce que le validateur regarde”} Relire le journal.',
      cause:
        'bloc d\'attributs illisible en tête ; seule la forme {voir="…"} est acceptée, guillemets droits compris',
    },
  ];

  for (const cas of REFUS) {
    it(
      `refuse ${cas.quoi}`,
      () => {
        const sortie = causeDeLEtape(cas.nom, cas.etape);
        expect(sortie).toContain(cas.cause);
        // La LIGNE du corps est ce que l'auteur voit dans son éditeur : sans elle, il relit toute
        // la marche à suivre. Les six cas mutent la même ligne, donc l'attendu est le même.
        expect(sortie).toContain('corps ligne 22');
        // UNE faute, jamais deux : le contrat « un cas = une cause » du mode --fixtures vaut aussi
        // ici. Une cause parasite masquerait la disparition de celle qu'on mesure.
        expect(sortie).toContain('1 anomalie(s)');
      },
      DELAI,
    );
  }

  // L'AUTRE MOITIÉ DE LA PINCE : la racine témoin, NON mutée, passe en code 0. Sans elle, les six
  // refus ci-dessus resteraient compatibles avec un validateur qui refuserait toute marche à
  // suivre — et les deux renvois valides qu'elle porte (un titre, un module publié) sont
  // précisément les formes que les six cas mutent.
  it(
    'accepte la racine témoin — les deux renvois valides passent, en code 0',
    () => {
      const { sortie, code } = lancer(['--racine', FIXTURE_MARCHE]);
      expect(code).toBe(0);
      expect(sortie).toMatch(/2 leçon\(s\) valides/);
    },
    DELAI,
  );
});

// =============================================================================
// LE RENVOI « {cours="…"} » — la moitié VALIDATEUR (§3bis, lot 1b-B)
// -----------------------------------------------------------------------------
// 🔴 POURQUOI CE BLOC EXISTE, ET CE QUE LE RECENSEMENT A TROUVÉ. Le lot 1b a livré la résolution
// inter-cours et n'a mesuré que le chemin PASSANT ; sa clôture annonçait « cinq refus » sans
// contrôle positif. Recomptés contre le dépôt le 2026-09-08 (L-094, qui exige exactement ce
// recomptage), ils sont QUINZE, répartis sur trois juges : six dans `causeDuRenvoiInterCours`
// ici, cinq dans `resoudreRenvoiInterCours` du compilateur, quatre dans son
// `lireHoraireDUnSujetFrere`. Une seule branche était exercée. C'est la population trouée de
// S-010/L-019, dans la forme même que le lot 7 avait payée sur `jugerRenvoiDEtape` — et la ligne
// du plan ne pouvait pas la voir, puisqu'elle comptait ce que le plan annonçait, non ce que le
// code porte.
//
// 🔴 LA SIXIÈME BRANCHE N'ÉTAIT DANS AUCUN PLAN : « dont l'horaire est refusé ». Elle ne se
// déclenche pas en mutant la leçon — il faut abîmer l'`horaire.json` DU FRÈRE. C'est pour cela
// qu'elle avait échappé au compte : on ne la trouve qu'en lisant le juge, jamais en listant les
// façons d'écrire un attribut.
//
// ⚠️ POURQUOI ICI PLUTÔT QUE DANS `__fixtures__/invalides/`. Même arbitrage qu'au lot 7, et il
// pèse plus lourd encore : chacun de ces cas est une mutation d'UNE ligne d'une racine VALIDE qui
// a besoin d'un SUJET FRÈRE à côté d'elle. En dossiers, chaque cas coûterait l'arbre entier
// (`cours/securite-web/01-temoin/{lecon.md,quiz.json}` + `cours/php/horaire.json`) pour une ligne
// utile — §9 de `.claude/rules/agent-context-budget.md`, qui dit qu'un corpus de fixtures se
// COMPTE avant d'être écrit. Le bac à sable exécute le MÊME binaire sur une VRAIE racine.
//
// ⚠️ LES CAUSES SONT COPIÉES DE LA SORTIE RÉELLE (L-089), jamais rédigées de mémoire — et le
// piège d'apostrophe du lot 7 est ici aussi : `causeDuRenvoiInterCours` compose ses messages avec
// des apostrophes DROITES (« n'est pas un nom de dossier »), quand la prose de ce fichier emploie
// la courbe. Une assertion « normalisée » à la relecture rougirait sur un produit sain (L-035).
// =============================================================================
describe('le renvoi « {cours="…"} » vers un autre cours, côté VALIDATEUR', () => {
  /** L'arbre COMPLET — la racine validée ET son sujet frère, qui est la moitié utile. */
  const FIXTURE_INTER = 'tools/content-pipeline/__fixtures__/inter-cours/cours';

  /** Le titre témoin de la racine valide — la SEULE ligne que les cinq premiers cas remplacent. */
  const TITRE_TEMOIN =
    '### Le VirtualHost, côté cours de PHP {cours="php" seance="8" diapos="30-42"}';

  let bac = '';

  beforeAll(() => {
    bac = mkdtempSync(join(tmpdir(), 'drjst-inter-refus-'));
  });

  afterAll(() => {
    rmSync(bac, { recursive: true, force: true });
  });

  /**
   * Copie l'arbre témoin, applique LA mutation du cas, et rend la sortie du refus.
   *
   * 🔴 LA MUTATION EST VÉRIFIÉE AVANT D'ÊTRE MESURÉE (L-015). Les fins de ligne de ce dépôt sont
   * mixtes ; un remplacement qui ne mordrait pas laisserait l'arbre VALIDE, et le `throw` de la
   * fin accuserait le garde-fou d'un défaut qui serait celui du harnais. On lève donc sur
   * l'absence du titre témoin — c'est-à-dire sur la fixture qui aurait changé de forme.
   */
  function causeDuRenvoi(nom: string, mutation: { titre?: string; horaire?: string }): string {
    const arbre = join(bac, nom);
    cpSync(FIXTURE_INTER, arbre, { recursive: true });
    if (mutation.titre !== undefined) {
      const fichier = join(arbre, 'securite-web', '01-temoin', 'lecon.md');
      const source = readFileSync(fichier, 'utf8');
      if (!source.includes(TITRE_TEMOIN)) {
        throw new Error(
          `« ${nom} » : le titre témoin est introuvable — la fixture a changé de forme`,
        );
      }
      writeFileSync(fichier, source.replace(TITRE_TEMOIN, mutation.titre), 'utf8');
    }
    if (mutation.horaire !== undefined) {
      writeFileSync(join(arbre, 'php', 'horaire.json'), mutation.horaire, 'utf8');
    }
    const { sortie, code } = lancer(['--racine', join(arbre, 'securite-web')]);
    if (code === 0) throw new Error(`« ${nom} » a été ACCEPTÉ — le garde-fou n’a pas mordu`);
    return sortie;
  }

  /**
   * LES SIX REFUS, EN TABLE — chacun sur SA cause propre, dans l'ordre du juge.
   *
   * ⚠️ Un garde-fou qui refuserait TOUT renvoi inter-cours passerait un test qui n'épingle que
   * l'échec. Ce qui discrimine est le fragment : il nomme la faute commise, et lui seul distingue
   * ces six branches les unes des autres.
   */
  const REFUS: readonly {
    nom: string;
    quoi: string;
    mutation: { titre?: string; horaire?: string };
    cause: string;
  }[] = [
    {
      // ⚠️ CE REFUS N'EST PAS LE GARDE-FOU DE SÉCURITÉ, et l'assertion ne doit pas le laisser
      // croire : ce qui rend `cours="…"` inoffensif est le REGISTRE (la valeur d'auteur est une
      // clef de `Map`, jamais un composant de chemin). Ce cas constate seulement que `../php`
      // sort sous SA faute — « pas un nom de dossier » — au lieu de tomber dans « sujet inconnu »,
      // qui enverrait l'auteur chercher un dossier qu'il n'a jamais voulu nommer.
      nom: 'forme-du-nom',
      quoi: 'une valeur qui n’est pas un nom de dossier, sous sa faute PROPRE',
      mutation: {
        titre: '### Le VirtualHost, côté cours de PHP {cours="../php" seance="8" diapos="30-42"}',
      },
      cause: "« cours=\"../php\" » n'est pas un nom de dossier de sujet",
    },
    {
      nom: 'sujet-de-la-racine',
      quoi: 'un « cours » qui nomme le sujet du module LUI-MÊME — l’attribut est sans effet',
      mutation: {
        titre:
          '### Le VirtualHost, côté cours de PHP {cours="securite-web" seance="8" diapos="30-42"}',
      },
      cause: "nomme le sujet de ce module lui-même : l'attribut est superflu, retirez-le",
    },
    {
      // ⚠️ DISCRIMINANT : le message ÉNUMÈRE les sujets réellement balayés. Sans cette moitié, un
      // validateur dont le registre serait TOUJOURS VIDE refuserait tout renvoi inter-cours et
      // passerait pour juste — c'est le piège de l'index vide, nommé au lot 7 sur
      // `voir-module-inconnu`, et la raison pour laquelle ce cas-ci ne peut pas vivre sur une
      // racine ad hoc sans frère.
      nom: 'sujet-inconnu',
      quoi: 'un sujet qui n’est pas frère de cette racine, en énumérant ceux qui le sont',
      mutation: {
        titre: '### Le VirtualHost, côté cours de PHP {cours="csharp" seance="8" diapos="30-42"}',
      },
      cause: "qui n'est pas un sujet frère de cette racine — sujets connus : « php »",
    },
    {
      // La décision (3) du lot 1b, mesurée : sans `seance`, le renvoi retomberait sur celle du
      // frontmatter — qui vaut 2 et appartient à CE cours-ci. Le refus est ce qui empêche un
      // renvoi de citer, en silence, une séance que personne n'a écrite.
      nom: 'seance-absente',
      quoi: 'un « cours » SANS « seance » — la séance du frontmatter appartient à l’autre cours',
      mutation: {
        titre: '### Le VirtualHost, côté cours de PHP {cours="php" diapos="30-42"}',
      },
      cause: 'cite le cours « php » sans « seance »',
    },
    {
      nom: 'seance-inexistante',
      quoi: 'une séance absente de l’horaire du cours CITÉ, pas de celui de la racine',
      mutation: {
        titre: '### Le VirtualHost, côté cours de PHP {cours="php" seance="42" diapos="30-42"}',
      },
      cause: 'cite la séance 42 du cours « php », absente de',
    },
    {
      // 🔴 LA SIXIÈME BRANCHE, celle qu'aucun plan n'avait comptée. Le renvoi est IRRÉPROCHABLE :
      // c'est l'horaire du frère qui est cassé. Le refus doit donc dire d'où vient la faute —
      // sinon l'auteur relit un renvoi juste. La cause est repassée telle quelle : c'est elle qui
      // nomme le fichier fautif, que l'auteur n'a pas ouvert.
      nom: 'horaire-du-frere-illisible',
      quoi: 'un renvoi juste vers un frère dont l’horaire ne se lit pas, en disant lequel',
      mutation: { horaire: '{{ pas du JSON' },
      cause: "dont l'horaire est refusé —",
    },
  ];

  for (const cas of REFUS) {
    it(
      `refuse ${cas.quoi}`,
      () => {
        const sortie = causeDuRenvoi(cas.nom, cas.mutation);
        expect(sortie).toContain(cas.cause);
        // La LIGNE du corps est ce que l'auteur voit dans son éditeur. Les cinq premiers cas
        // mutent la même ligne ; le sixième ne mute pas la leçon du tout, et pointe pourtant la
        // même — c'est le renvoi qui est en cause, pas le fichier qu'on a abîmé.
        expect(sortie).toContain('corps ligne 17');
        // UNE faute, jamais deux : le contrat « un cas = une cause » du mode --fixtures vaut
        // aussi ici. Une cause parasite masquerait la disparition de celle qu'on mesure.
        expect(sortie).toContain('1 anomalie(s)');
      },
      DELAI,
    );
  }

  // 🔴 LE CAS QUE LA REVUE DE SÉCURITÉ DU 2026-09-08 A EXIGÉ, ET QUE RIEN NE REJOUAIT. S-026 veut
  // que la GRAMMAIRE du code de cours soit tenue là où le code entre au contrat compilé. La revue
  // l'a mesurée une fois, à la main, en débranchant le garde — une mesure qui ne laisse aucune
  // trace qu'un gate puisse relancer est une intention, pas un contrôle positif (L-019). Côté
  // validateur, cette grammaire vit dans `schemas/horaire.schema.json` : ce test est la moitié
  // « fermée pour le PIPELINE » du couple, sa jumelle « fermée pour la FONCTION » étant dans le
  // spec de compilation. Les deux ensemble sont ce que la revue demandait.
  it(
    'refuse un « cours.code » de forme inattendue dans l’horaire du frère (S-026, moitié schéma)',
    () => {
      const horaire = readFileSync(join(FIXTURE_INTER, 'php', 'horaire.json'), 'utf8');
      const donnees = JSON.parse(horaire) as { cours: { code: string } };
      // ANTI-VACUITÉ : si le code témoin cessait d'être conforme, la mutation ne prouverait plus
      // rien — on mesurerait un horaire déjà refusé pour une autre raison.
      if (donnees.cours.code !== '420-4P2-HU') {
        throw new Error(`le code témoin a changé : « ${donnees.cours.code} »`);
      }
      donnees.cours.code = '420-zzz-hu';
      const sortie = causeDuRenvoi('code-de-cours-mal-forme', {
        horaire: JSON.stringify(donnees, null, 2),
      });
      expect(sortie).toContain("dont l'horaire est refusé —");
      // LE MOTIF, pas seulement le champ : c'est lui qui distingue « le code est absent » de « le
      // code est là, mais ne ressemble pas à un code de cours ».
      expect(sortie).toContain('/cours/code — ne respecte pas le motif attendu');
    },
    DELAI,
  );

  // L'AUTRE MOITIÉ DE LA PINCE : l'arbre témoin, NON muté, passe en code 0. Sans elle, les sept
  // refus ci-dessus resteraient compatibles avec un validateur qui refuserait TOUT renvoi
  // inter-cours — et le renvoi valide qu'il porte est précisément la forme que les cas mutent.
  it(
    'accepte l’arbre témoin — le renvoi inter-cours valide passe, en code 0',
    () => {
      const { sortie, code } = lancer(['--racine', join(FIXTURE_INTER, 'securite-web')]);
      expect(code).toBe(0);
      expect(sortie).toMatch(/1 leçon\(s\) valides/);
    },
    DELAI,
  );
});
