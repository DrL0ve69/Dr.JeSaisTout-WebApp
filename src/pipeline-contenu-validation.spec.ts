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
import { readdirSync, readFileSync } from 'node:fs';

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
];

/**
 * Les SIX variantes d'encadré du contrat, ÉCRITES EN DUR et dans l'ordre du contrat.
 *
 * L-012 : ce littéral n'est dérivé d'aucune des deux listes qu'il vérifie. Un test qui lirait la
 * constante dont il contrôle la valeur ne vérifierait que `x === x` — et les deux copies pourraient
 * dériver ENSEMBLE, ce qui est précisément le mode d'échec qu'on ferme ici.
 */
const SIX_VARIANTES_ENCADRE = [
  'attention',
  'note',
  'a-retenir',
  'cours',
  'complement',
  'correction-du-cours',
] as const;

/** Les trois conteneurs de comparaison, qui ne sont PAS des encadrés (ils n'ont pas de variante). */
const TROIS_CONTENEURS_DE_COMPARAISON = ['comparaison', 'vulnerable', 'corrige'] as const;

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
    'traite les VINGT-TROIS cas, et aucun ne manque à l’appel',
    () => {
      // Compte en DUR, pas `CAS_ATTENDUS.length` : dériver l'attendu de la table qui sert déjà à
      // la boucle ci-dessous ferait un test qui se compare à lui-même (L-012). Ce littéral est ce
      // qui oblige un humain à constater qu'un cas est apparu ou a disparu.
      expect(sortie).toContain('23 cas attendus INVALIDES');
      expect(sortie).toContain('23/23 cas refusés avec une cause nommée');
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
  it('le compilateur déclare EXACTEMENT les six variantes d’encadré du contrat', () => {
    expect(listeDeclaree(COMPILATEUR, /const VARIANTES_ENCADRE = \[([\s\S]*?)\];/)).toEqual([
      ...SIX_VARIANTES_ENCADRE,
    ]);
  });

  it('le validateur déclare les trois conteneurs de comparaison PUIS les six mêmes variantes', () => {
    expect(
      listeDeclaree(VALIDATEUR, /const CONTENEURS_AUTORISES = new Set\(\[([\s\S]*?)\]\);/),
    ).toEqual([...TROIS_CONTENEURS_DE_COMPARAISON, ...SIX_VARIANTES_ENCADRE]);
  });

  // Le troisième constat, celui qu'aucun des deux ci-dessus ne fait seul : les listes se
  // RECOUPENT. Retirer un nom d'un seul des deux fichiers fait rougir l'assertion de ce
  // fichier-là ; celle-ci rougit en plus en nommant l'écart, ce qui est le message utile.
  it('aucune des deux copies ne connaît un encadré que l’autre ignore', () => {
    const duCompilateur = listeDeclaree(COMPILATEUR, /const VARIANTES_ENCADRE = \[([\s\S]*?)\];/);
    const duValidateur = listeDeclaree(
      VALIDATEUR,
      /const CONTENEURS_AUTORISES = new Set\(\[([\s\S]*?)\]\);/,
    ).filter((nom) => !TROIS_CONTENEURS_DE_COMPARAISON.includes(nom as never));
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
