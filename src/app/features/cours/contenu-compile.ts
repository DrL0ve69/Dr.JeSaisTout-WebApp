// =============================================================================
// LA FRONTIÈRE DE TYPAGE entre le contenu compilé et l'application (E2-ST2, lot B)
// -----------------------------------------------------------------------------
// CE QUE FAIT CE FICHIER, ET POURQUOI IL EXISTE ICI PLUTÔT QU'AILLEURS.
// `src/content-generated/` est écrit par `npm run content:build`. Deux de ses trois
// sorties entrent dans l'application par ce fichier, et par lui seul :
//   · `manifeste-routes.json` — les métadonnées de toutes les leçons, triées par
//     `ordre` ; lues par `getPrerenderParams()` et par la navigation prev/next ;
//   · `lecons/<slug>.json` — le corps d'UNE leçon, chargé paresseusement par
//     `carte-lecons.ts` (voir `resoudre-lecon.ts`).
//
// LES DEUX ARRIVENT EN `unknown`, ET C'EST VOULU — pas une négligence du
// générateur. La note de fin de `tools/content-pipeline/types.d.ts` l'écrit : un
// `import('./lecons/x.json')` fait inférer `statut: string` à TypeScript, ce qui
// n'est PAS assignable à l'union `'brouillon' | 'verifiee' | 'publiee'` du contrat.
// Typer le générateur mentirait ou ne compilerait pas. La frontière est donc à la
// CONSOMMATION, et la voici : un contrôle ÉCRIT, jamais un `as` nu.
//
// Le même raisonnement vaut pour le manifeste, avec un piège de plus : quand
// `content/` est vide — l'état du dépôt jusqu'à E3-ST1 — le fichier vaut `[]` et
// TypeScript en infère `never[]`. Toute manipulation « typée » de cet import
// passerait donc la compilation aujourd'hui pour la rater le jour où une vraie
// leçon existe. On le reçoit en `unknown`, et on le rétrécit.
//
// CE QUE CES CONTRÔLES VÉRIFIENT, ET CE QU'ILS LAISSENT À D'AUTRES.
// Ils vérifient la CHARPENTE : présence, type et forme des champs du frontmatter,
// des entrées de manifeste et des en-têtes de section. Ils ne descendent PAS dans
// les `BlocContenu` — c'est `RenduBlocs` qui les valide nommément, au moment où il
// les rend, et qui LÈVE sur un type inconnu. Deux validateurs, deux profondeurs,
// aucun recouvrement : dupliquer ici la liste des sept types de blocs ferait
// exactement la faute L-016 (deux vérités qui divergent au premier ajout).
// Le quiz (E2-ST3) suit EXACTEMENT ce partage : son ENVELOPPE est vérifiée ici
// (présence, appariement au slug, `id` et `type` de chaque question), les champs
// propres à chacun des quatre types appartiennent au `QuizComponent`.
// La simulation (E2-ST5) le suit à son tour : enveloppe ici (appariement au slug,
// titre, acteurs, séquence des étapes, collision d'`id`), champs d'`etatVisuel` au
// composant du lot b. Une seule différence, et elle est de contrat : `simulation` est
// OPTIONNELLE — ce qui se vérifie n'est pas sa présence mais la COHÉRENCE de la paire
// « fichier ⇔ ancre `[[simulation]]` ».
//
// FAIL-CLOSED, ET BRUYAMMENT. Un artéfact malformé LÈVE en nommant le champ fautif.
// Sur une route prerendue, cela fait échouer `npm run build` — le comportement
// voulu partout dans ce dépôt : jamais une page vide en silence.
//
// ⚠️ LES TYPES SONT AMBIANTS. `EntreeManifesteRoutes`, `LeconCompilee` et
// `SectionCompilee` viennent de `tools/content-pipeline/types.d.ts`, listé
// nominativement dans `tsconfig.app.json` et `tsconfig.spec.json` : aucun `import`
// à écrire, et surtout aucune copie du contrat à maintenir (L-016).
// =============================================================================

import { InjectionToken } from '@angular/core';

import manifesteBrut from '../../../content-generated/manifeste-routes.json';

/** Les trois statuts du contrat — liste NOMINATIVE, jamais un `string` accepté tel quel. */
const STATUTS = ['brouillon', 'verifiee', 'publiee'] as const;

/**
 * Les cinq niveaux du contrat, REPRIS DE L'ÉNUMÉRATION DU SCHÉMA DE BUILD
 * (`tools/content-pipeline/schemas/lecon.frontmatter.schema.json`, propriété
 * `niveau`). Nominative comme `STATUTS` — « chaîne non vide » laissait passer
 * `niveau: "constructor"`, que la page allait chercher dans un dictionnaire
 * d'affichage : pas de XSS (l'interpolation échappe), mais ce fichier se déclare
 * frontière de confiance, et une frontière qui accepte n'importe quel mot n'en est
 * pas une. `lecon.spec.ts` RELIT le schéma et compare les deux listes : elles ne
 * peuvent pas diverger en silence (même patron que l'extrait d'en-têtes de la Home,
 * borné par un test qui relit `staticwebapp.config.source.json`).
 */
export const NIVEAUX = ['maternelle', 'primaire', 'secondaire', 'cegep', 'universite'] as const;

/**
 * Les `id` que la PAGE de leçon émet elle-même (`lecon.ts`). Une section ancrée
 * `titre-sommaire` produirait DEUX éléments de même `id` dans le document, donc un
 * `aria-labelledby` ambigu — un lecteur d'écran nommerait le repère avec le mauvais
 * titre (WCAG 1.3.1/4.1.2). Ils entrent donc dans l'ensemble d'unicité comparé, au
 * même titre que les ancres entre elles. `lecon.spec.ts` vérifie sur le DOM RENDU
 * qu'aucun `id` statique de la page n'échappe à cette liste.
 */
export const ANCRES_RESERVEES = [
  'titre-objectifs',
  'titre-prerequis',
  'titre-sommaire',
  'titre-voisines',
] as const;

/** Les deux niveaux de titre qu'une section compilée peut porter (`NiveauTitre`). */
const NIVEAUX_DE_TITRE = [2, 3] as const;

/**
 * Les QUATRE types de question du contrat — liste NOMINATIVE, comme `STATUTS` et
 * `NIVEAUX`. Un `type` accepté tel quel ferait retomber le rendu sur une branche
 * par défaut, c'est-à-dire une question affichée vide : exactement l'échec
 * silencieux que ce fichier existe pour interdire.
 */
export const TYPES_DE_QUESTION = [
  'choix-multiple',
  'vrai-faux',
  'associer',
  'trouver-la-faille',
] as const;

/**
 * Les CINQ types d'acteur du contrat — liste NOMINATIVE, REPRISE DE L'ÉNUMÉRATION DU
 * SCHÉMA DE BUILD (`tools/content-pipeline/schemas/simulation.schema.json`,
 * `acteurs.items.properties.type`). Le composant du lot b associe à chaque valeur une
 * icône ET un rôle accessible : un `type` inconnu produirait une boîte MUETTE pour un
 * lecteur d'écran — exactement ce que le schéma dit en refusant la liste ouverte.
 * `lecon.spec.ts` RELIT le schéma et compare les deux listes, comme il le fait déjà pour
 * `NIVEAUX` : elles ne peuvent pas diverger en silence (L-016).
 *
 * POURQUOI `attaquant` EST UN TYPE, ET NON UNE `personne` AU LIBELLÉ PARLANT. Le bloc A
 * d'E3 porte cinq déroulés d'attaque où l'opposition attaquant/victime EST le propos de la
 * simulation. Sans ce type, les deux boîtes recevraient la même icône et le même rôle
 * accessible : la distinction ne tiendrait qu'au `libelle`, donc à rien pour qui ne lit pas
 * (l'objectif d'E2-ST5 nomme d'ailleurs « navigateur/attaquant/serveur »).
 */
export const TYPES_ACTEUR = [
  'personne',
  'attaquant',
  'navigateur',
  'serveur',
  'stockage',
] as const;

/** Le kebab-case du schéma — ancres de section ET identifiants de question. */
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Le préfixe sous lequel un `id` de question devient un `id` de DOCUMENT.
 *
 * POURQUOI IL EST FIXÉ ICI, ET NON LAISSÉ AU COMPOSANT. Les `id` de question et les ancres
 * de section vivent dans le MÊME espace de noms — celui du document. L'auteur d'une leçon
 * choisit ses ancres (`ancre: 'quiz'` est parfaitement naturel) sans rien savoir des `id`
 * de son quiz, et réciproquement. Sans préfixe, deux éléments porteraient le même `id` :
 * le sommaire ancré sauterait au mauvais endroit, et `aria-labelledby` désignerait l'autre.
 *
 * ET IL EST VÉRIFIÉ, PAS SEULEMENT ÉCRIT. Un préfixe posé dans un commentaire et appliqué
 * nulle part serait exactement L-008 ; obliger l'auteur à connaître les ancres réservées de
 * la page serait une contrainte invisible. D'où la confrontation ci-dessous : c'est le
 * contrat qui se plie à la leçon, en refusant bruyamment le seul cas qu'il ne peut pas
 * arbitrer. Le lot C rendra ses `<fieldset>` sous `PREFIXE_ID_QUESTION + question.id` — la
 * même constante, pas une chaîne recopiée.
 */
export const PREFIXE_ID_QUESTION = 'quiz-';

/**
 * L'`id` de document de la RÉGION de simulation (E2-ST5, lot a).
 *
 * POURQUOI IL EST ARBITRÉ ICI, ET NON LAISSÉ AU COMPOSANT DU LOT b — même raison,
 * mot pour mot, que `PREFIXE_ID_QUESTION`. Le composant rendra une barre de LIENS
 * D'ÉTAPE (décision du propriétaire) : il lui faut des `id` de document, donc un espace
 * de noms, et cet espace est le MÊME que celui des ancres de section, que l'auteur d'une
 * leçon choisit librement et sans rien savoir de la simulation. `ancre: 'simulation'` est
 * un choix parfaitement naturel pour une section qui présente le pas-à-pas.
 *
 * ET C'EST VÉRIFIÉ, PAS SEULEMENT ÉCRIT (L-008) : `verifierEnveloppeDeLaSimulation` refuse
 * nominativement une leçon où une ancre de section prendrait l'un de ces `id`. Le composant
 * les IMPORTERA — il ne recopiera pas de chaînes.
 */
export const ID_SIMULATION = 'simulation';

/**
 * Le préfixe sous lequel l'étape `numero: N` devient un `id` de document :
 * `simulation-etape-3` pour la troisième. Voir `ID_SIMULATION` pour le raisonnement.
 */
export const PREFIXE_ID_ETAPE = 'simulation-etape-';

/**
 * Compte les blocs d'ancre d'un type donné dans une liste de blocs BRUTE — encadrés compris.
 *
 * POURQUOI CETTE FONCTION EXISTE ICI, EN DOUBLE DU COMPILATEUR. `compilerLecon`
 * (`tools/content-pipeline/compiler-markdown.mjs`) refuse déjà une leçon dont le corps ne
 * porte pas le bon nombre d'ancres `[[quiz]]` / `[[simulation]]`, et il le fait
 * récursivement. Mais ce fichier-ci se déclare frontière de confiance contre un artéfact
 * produit par une AUTRE version du pipeline (voir l'en-tête) : un invariant qui n'existe
 * qu'au compilateur n'est pas tenu à la LECTURE. Or celui-là est un invariant d'`id` au
 * même titre que les autres déjà contrôlés — deux ancres, c'est le composant rendu deux
 * fois, donc tous ses `id` dupliqués dans le document.
 *
 * LA RÉCURSION N'EST PAS UNE PRÉCAUTION : `encadre` est le seul bloc qui en imbrique
 * d'autres, et c'est exactement là que le compilateur avait son trou (une ancre dans un
 * `::: note` était invisible à un balayage de premier niveau). Le type des blocs est
 * `unknown` à ce stade — leur CONTENU appartient à `RenduBlocs`, qui lève sur un type
 * inconnu ; on ne lit ici que ce qu'il faut pour compter.
 *
 * UNE SEULE FONCTION POUR LES DEUX ANCRES, comme dans le compilateur : deux recopies
 * auraient été deux descentes à éprouver séparément, dont la seconde serait restée non
 * exercée (L-039).
 *
 * ⚠️ LE POINTEUR CROISÉ NE SUFFIT PAS — `src/compter-ancres-parite.spec.ts` fait compter le
 * MÊME corpus aux deux copies et exige l'égalité (L-037). Sans lui, le jour où un
 * `BlocContenu` neuf portera des `blocs` imbriqués, une descente mise à jour d'un seul côté
 * ferait SOUS-COMPTER l'autre — et le côté qui sous-compte trouverait son compte juste
 * (1 ancre attendue, 1 comptée), donc resterait VERT (L-034). D'où l'export : cette fonction
 * n'a aucun appelant hors de ce fichier, elle est exportée pour être mise à l'épreuve.
 */
export function compterAncres(
  blocs: readonly unknown[],
  type: 'ancre-quiz' | 'ancre-simulation',
): number {
  let total = 0;
  for (const bloc of blocs) {
    if (!estObjet(bloc)) continue;
    if (bloc['type'] === type) total += 1;
    else if (bloc['type'] === 'encadre' && Array.isArray(bloc['blocs'])) {
      total += compterAncres(bloc['blocs'], type);
    }
  }
  return total;
}

/** Un objet quelconque, une fois qu'on sait que c'en est un. */
type Objet = Record<string, unknown>;

function estObjet(valeur: unknown): valeur is Objet {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

function estChaineNonVide(valeur: unknown): boolean {
  return typeof valeur === 'string' && valeur.trim() !== '';
}

function estNombreFini(valeur: unknown): boolean {
  return typeof valeur === 'number' && Number.isFinite(valeur);
}

function estTableauDeChaines(valeur: unknown): boolean {
  return Array.isArray(valeur) && valeur.every((element) => typeof element === 'string');
}

/**
 * Interrompt en DISANT quoi et où. Un message qui se contente de « contenu
 * invalide » oblige le lecteur à refaire l'enquête que ce fichier vient de faire —
 * c'est la même exigence que les messages d'échec du pipeline (`build.mjs`).
 */
function refuser(provenance: string, manques: readonly string[]): never {
  throw new Error(
    `Contenu compilé invalide — ${provenance} : ${manques.join(' · ')}. ` +
      'La source du contrat est `tools/content-pipeline/types.d.ts` ; ' +
      'régénérer avec `npm run content:build`.',
  );
}

// -----------------------------------------------------------------------------
// Le manifeste de routes
// -----------------------------------------------------------------------------

/**
 * Rétrécit le manifeste brut en `EntreeManifesteRoutes[]`.
 *
 * Le TRI n'est pas refait ici : `generer-manifeste.mjs` trie déjà par `ordre`, et
 * ce fichier constate plutôt qu'il ne corrige — un manifeste désordonné signalerait
 * une régression du générateur, que re-trier en silence masquerait. Ce qui est
 * vérifié, c'est que l'ordre EST croissant.
 *
 * @param valeur le contenu de `manifeste-routes.json`, tel quel
 * @param provenance nom du fichier, pour le message d'erreur
 */
export function lireManifeste(
  valeur: unknown,
  provenance = 'src/content-generated/manifeste-routes.json',
): readonly EntreeManifesteRoutes[] {
  if (!Array.isArray(valeur)) {
    refuser(provenance, ['la racine devrait être un tableau']);
  }

  const entrees: EntreeManifesteRoutes[] = [];
  for (const [rang, brut] of valeur.entries()) {
    if (!estObjet(brut)) {
      refuser(`${provenance} (entrée n°${rang + 1})`, ["ce n'est pas un objet"]);
    }

    const manques: string[] = [];
    for (const champ of ['sujet', 'slug', 'titre']) {
      if (!estChaineNonVide(brut[champ])) manques.push(`« ${champ} » : chaîne non vide attendue`);
    }
    for (const champ of ['ordre', 'dureeEstimee']) {
      if (!estNombreFini(brut[champ])) manques.push(`« ${champ} » : nombre attendu`);
    }
    const statut = brut['statut'];
    if (!STATUTS.some((connu) => connu === statut)) {
      manques.push(`« statut » : attendu ${STATUTS.join(' | ')}`);
    }
    const niveau = brut['niveau'];
    if (!NIVEAUX.some((connu) => connu === niveau)) {
      manques.push(`« niveau » : attendu ${NIVEAUX.join(' | ')}`);
    }
    if (manques.length > 0) refuser(`${provenance} (entrée n°${rang + 1})`, manques);

    entrees.push(brut as unknown as EntreeManifesteRoutes);
  }

  const desordre = entrees.findIndex(
    (entree, rang) => rang > 0 && entree.ordre <= (entrees[rang - 1]?.ordre ?? 0),
  );
  if (desordre !== -1) {
    refuser(provenance, [
      `les entrées ne sont pas triées par « ordre » croissant (rang ${desordre + 1})`,
      'le tri appartient à `generer-manifeste.mjs` — le refaire ici masquerait sa régression',
    ]);
  }

  return entrees;
}

/**
 * Le manifeste du dépôt, validé une fois au chargement du module. `[]` tant que
 * `content/` est vide — un résultat, pas une panne (voir l'en-tête de `build.mjs`).
 */
export const manifesteLecons: readonly EntreeManifesteRoutes[] = lireManifeste(manifesteBrut);

/**
 * Le manifeste, injectable. Il n'existe PAS pour permettre plusieurs manifestes :
 * il n'y en a qu'un. Il existe parce que la navigation prev/next d'une page ne se
 * teste pas sur un manifeste vide, et que `manifesteLecons` l'est jusqu'à E3-ST1 —
 * une constante importée en dur rendrait ce test impossible, donc muet (L-005).
 * Le défaut est la vraie valeur : rien à câbler dans `app.config.ts`.
 */
export const MANIFESTE_LECONS = new InjectionToken<readonly EntreeManifesteRoutes[]>(
  'manifeste des leçons compilées',
  { providedIn: 'root', factory: () => manifesteLecons },
);

// -----------------------------------------------------------------------------
// Une leçon compilée
// -----------------------------------------------------------------------------

/** Les champs de `LeconCompilee['frontmatter']`, par forme attendue. */
const FRONTMATTER_CHAINES = ['titre', 'slug', 'sujet', 'cree', 'maj'] as const;
const FRONTMATTER_NOMBRES = ['ordre', 'dureeEstimee'] as const;
const FRONTMATTER_LISTES = ['objectifs', 'prerequis', 'fichesSources'] as const;

/**
 * Rétrécit un `lecons/<slug>.json` en `LeconCompilee`.
 *
 * @param valeur le `default` du module JSON importé — `unknown` par contrat
 * @param provenance ce qu'on nomme dans le message d'échec. ⚠️ N'Y METTRE QUE DU
 *   TEXTE QUE NOUS ÉCRIVONS : les slugs cités par les appelants viennent des CLEFS
 *   de `carte-lecons.ts`, donc du pipeline, jamais de l'URL du visiteur.
 */
export function lireLeconCompilee(valeur: unknown, provenance: string): LeconCompilee {
  if (!estObjet(valeur)) {
    refuser(provenance, ["ce n'est pas un objet"]);
  }

  const manques: string[] = [];

  const frontmatter = valeur['frontmatter'];
  if (!estObjet(frontmatter)) {
    manques.push('« frontmatter » : objet attendu');
  } else {
    for (const champ of FRONTMATTER_CHAINES) {
      if (!estChaineNonVide(frontmatter[champ])) {
        manques.push(`« frontmatter.${champ} » : chaîne non vide attendue`);
      }
    }
    for (const champ of FRONTMATTER_NOMBRES) {
      if (!estNombreFini(frontmatter[champ])) {
        manques.push(`« frontmatter.${champ} » : nombre attendu`);
      }
    }
    for (const champ of FRONTMATTER_LISTES) {
      if (!estTableauDeChaines(frontmatter[champ])) {
        manques.push(`« frontmatter.${champ} » : tableau de chaînes attendu`);
      }
    }
    const statut = frontmatter['statut'];
    if (!STATUTS.some((connu) => connu === statut)) {
      manques.push(`« frontmatter.statut » : attendu ${STATUTS.join(' | ')}`);
    }
    // NOMINATIF, comme `statut` — voir la note de `NIVEAUX`. C'est ce contrôle qui
    // garantit à la page que son dictionnaire d'affichage ne sera interrogé qu'avec
    // l'une de ces cinq clefs.
    const niveau = frontmatter['niveau'];
    if (!NIVEAUX.some((connu) => connu === niveau)) {
      manques.push(`« frontmatter.niveau » : attendu ${NIVEAUX.join(' | ')}`);
    }
  }

  // Hissé hors du bloc : l'espace de noms des `id` du document se compose ICI, et le quiz
  // (plus bas) doit s'y confronter. Reste vide si `sections` est hors contrat — la collision
  // ne se mesure alors sur rien, et c'est juste : la vraie faute est déjà signalée.
  let ancresDuDocument: unknown[] = [];

  // Les listes de blocs, UNE FOIS TOUTES LISIBLES — `null` sinon. Deux comptages d'ancres
  // s'en servent (quiz et simulation), et ni l'un ni l'autre ne doit porter sur un artéfact
  // déjà signalé hors contrat : le « 0 ancre » qui en sortirait accuserait la mauvaise cause.
  let blocsLisibles: readonly (readonly unknown[])[] | null = null;

  const sections = valeur['sections'];
  if (!Array.isArray(sections)) {
    manques.push('« sections » : tableau attendu');
  } else if (sections.length === 0) {
    manques.push('« sections » : au moins une section attendue');
  } else {
    for (const [rang, section] of sections.entries()) {
      const ou = `« sections[${rang}] »`;
      if (!estObjet(section)) {
        manques.push(`${ou} : objet attendu`);
        continue;
      }
      if (!estChaineNonVide(section['titre'])) manques.push(`${ou}.titre : chaîne non vide`);
      // L'ancre sert d'`id` dans le document ET de cible `#…` dans le sommaire : une
      // ancre hors du kebab-case casserait le lien sans rien afficher d'anormal.
      if (typeof section['ancre'] !== 'string' || !KEBAB_CASE.test(section['ancre'])) {
        manques.push(`${ou}.ancre : kebab-case attendu`);
      }
      if (!NIVEAUX_DE_TITRE.some((connu) => connu === section['niveau'])) {
        manques.push(`${ou}.niveau : attendu ${NIVEAUX_DE_TITRE.join(' ou ')}`);
      }
      // Le CONTENU des blocs appartient à `RenduBlocs`, qui lève sur un type inconnu.
      if (!Array.isArray(section['blocs'])) manques.push(`${ou}.blocs : tableau attendu`);
    }

    // L'UNICITÉ SE MESURE CONTRE LE DOCUMENT ENTIER, pas entre sections seulement :
    // la page émet aussi les `id` d'`ANCRES_RESERVEES`, et une section qui en
    // reprendrait un donnerait deux éléments de même `id`.
    ancresDuDocument = sections.map((section) =>
      estObjet(section) ? section['ancre'] : undefined,
    );
    const ancres = ancresDuDocument;
    const toutesLesAncres = [...ANCRES_RESERVEES, ...ancres];
    if (new Set(toutesLesAncres).size !== toutesLesAncres.length) {
      const reservees = ancres.filter((ancre) => ANCRES_RESERVEES.some((id) => id === ancre));
      manques.push(
        reservees.length > 0
          ? `« sections » : ancre réservée à la page de leçon — ${reservees.join(', ')} ` +
              `(réservées : ${ANCRES_RESERVEES.join(' · ')})`
          : '« sections » : deux sections partagent la même ancre (ids dupliqués)',
      );
    }

    // L'ANCRE DU QUIZ EST UN INVARIANT D'`id`, EXACTEMENT COMME LES ANCRES DE SECTION.
    // Elle n'est comptée que si TOUTES les listes de blocs sont lisibles : sinon le
    // compte porterait sur un artéfact déjà signalé hors contrat, et le « 0 ancre »
    // qui en sortirait accuserait la mauvaise cause.
    const blocsDeChaqueSection = sections.map((section) =>
      estObjet(section) ? section['blocs'] : undefined,
    );
    if (blocsDeChaqueSection.every((blocs) => Array.isArray(blocs))) {
      blocsLisibles = blocsDeChaqueSection as readonly (readonly unknown[])[];
      const ancresQuiz = blocsLisibles.reduce(
        (total, blocs) => total + compterAncres(blocs, 'ancre-quiz'),
        0,
      );
      if (ancresQuiz !== 1) {
        manques.push(
          `« sections » : ${ancresQuiz} ancre(s) « [[quiz]] » dans le corps, une seule attendue ` +
            (ancresQuiz === 0
              ? '— le quiz ne serait rendu nulle part'
              : '— le quiz serait rendu plusieurs fois, tous ses ids dupliqués'),
        );
      }
    }
  }

  verifierEnveloppeDuQuiz(
    valeur['quiz'],
    estObjet(frontmatter) ? frontmatter['slug'] : undefined,
    ancresDuDocument,
    manques,
  );

  verifierEnveloppeDeLaSimulation(
    valeur['simulation'],
    estObjet(frontmatter) ? frontmatter['slug'] : undefined,
    ancresDuDocument,
    blocsLisibles,
    manques,
  );

  if (manques.length > 0) refuser(provenance, manques);

  return valeur as unknown as LeconCompilee;
}

/**
 * Contrôle l'ENVELOPPE du quiz — et rien de plus (E2-ST3, lot B).
 *
 * POURQUOI ICI, DÈS CE LOT. `LeconCompilee.quiz` est OBLIGATOIRE : sans ce contrôle, le
 * type promettrait au composant un champ que rien ne vérifie, et une leçon compilée par
 * une version antérieure du pipeline arriverait sans quiz — page à moitié rendue, aucune
 * erreur. Un contrat n'est tenu qu'à l'endroit où il est confronté à la donnée.
 *
 * CE QUI EST VÉRIFIÉ : que le quiz existe, qu'il désigne CETTE leçon, qu'il porte un
 * titre et au moins une question, et que chaque question a un `id` kebab-case unique et
 * un `type` de la liste NOMINATIVE. L'appariement au slug est le seul contrôle « métier »
 * qui vaut la peine ici : un quiz apparié ailleurs s'afficherait sous la mauvaise leçon
 * sans que rien ne le dise.
 *
 * ⏭️ CE QUI RESTE AU LOT SUIVANT : les champs PROPRES à chaque type (`choix`,
 * `bonneReponse`, `paires`, `code`/`htmlColore`…). C'est le `QuizComponent` (lot C) qui
 * les lit, donc lui qui doit les refuser nommément — même partage que `sections`/`blocs`,
 * dont le contenu appartient à `RenduBlocs`. Dupliquer ici la forme des quatre types
 * ferait deux vérités qui divergeraient au premier ajustement du schéma (L-016).
 *
 * @param valeur le champ `quiz` brut
 * @param slug le `frontmatter.slug` déjà lu, ou `undefined` si le frontmatter est hors contrat
 * @param ancresDuDocument les ancres de section déjà lues — l'autre moitié de l'espace de noms
 * @param manques canal d'accumulation partagé avec `lireLeconCompilee`
 */
function verifierEnveloppeDuQuiz(
  valeur: unknown,
  slug: unknown,
  ancresDuDocument: readonly unknown[],
  manques: string[],
): void {
  if (!estObjet(valeur)) {
    manques.push('« quiz » : objet attendu — toute leçon porte son quiz');
    return;
  }

  if (!estChaineNonVide(valeur['titre'])) manques.push('« quiz.titre » : chaîne non vide attendue');

  // Le slug n'est comparé que s'il est lui-même conforme : sinon le message décrirait un
  // désaccord avec une valeur déjà signalée fautive, et masquerait la vraie cause.
  if (typeof slug === 'string' && valeur['lecon'] !== slug) {
    manques.push(
      `« quiz.lecon » : « ${String(valeur['lecon'])} » alors que « frontmatter.slug » vaut « ${slug} »`,
    );
  }

  const questions = valeur['questions'];
  if (!Array.isArray(questions)) {
    manques.push('« quiz.questions » : tableau attendu');
    return;
  }
  if (questions.length === 0) {
    manques.push('« quiz.questions » : au moins une question attendue');
    return;
  }

  const identifiants: string[] = [];
  for (const [rang, question] of questions.entries()) {
    const ou = `« quiz.questions[${rang}] »`;
    if (!estObjet(question)) {
      manques.push(`${ou} : objet attendu`);
      continue;
    }
    // L'`id` sert d'ancre de `<fieldset>` et de clef de progression (`core/progression/`) :
    // deux questions homonymes rendraient la progression de l'une indiscernable de l'autre.
    if (typeof question['id'] !== 'string' || !KEBAB_CASE.test(question['id'])) {
      manques.push(`${ou}.id : kebab-case attendu`);
    } else {
      identifiants.push(question['id']);
    }
    if (!TYPES_DE_QUESTION.some((connu) => connu === question['type'])) {
      manques.push(`${ou}.type : attendu ${TYPES_DE_QUESTION.join(' | ')}`);
    }
  }

  if (new Set(identifiants).size !== identifiants.length) {
    manques.push('« quiz.questions » : deux questions partagent le même « id »');
  }

  // LA COLLISION AVEC LE RESTE DU DOCUMENT — l'autre moitié de l'unicité des `id`.
  // L'espace de noms du document est confronté EN ENTIER : ancres réservées de la page ET
  // ancres écrites par l'auteur. Les premières sont aujourd'hui hors de portée (elles
  // commencent toutes par « titre- », qu'aucun `PREFIXE_ID_QUESTION + …` ne peut produire),
  // mais c'était écrit en COMMENTAIRE et tenu par aucun test (L-008) : les inclure rend la
  // phrase vraie par construction du code, au prix d'un `…` dans un tableau.
  const espaceDeNoms = [...ANCRES_RESERVEES, ...ancresDuDocument];
  const heurtees = identifiants.filter((id) =>
    espaceDeNoms.some((ancre) => ancre === `${PREFIXE_ID_QUESTION}${id}`),
  );
  if (heurtees.length > 0) {
    manques.push(
      `« quiz.questions » : l'« id » ${heurtees.join(', ')} donnerait l'« id » de document ` +
        `« ${PREFIXE_ID_QUESTION}${heurtees[0]} », déjà pris par une ancre de section`,
    );
  }
}

/**
 * Contrôle l'ENVELOPPE de la simulation — et rien de plus (E2-ST5, lot a).
 *
 * ⚠️ CE CHAMP EST OPTIONNEL, à la différence de `quiz`. Son absence n'est pas une anomalie :
 * une leçon qui ne décrit aucun flux n'a pas de `simulation.json`, et `valider.mjs` (§9) ne
 * l'exige de personne. Ce qui est contrôlé, c'est la COHÉRENCE de la paire — présent ⇔
 * exactement une ancre `ancre-simulation` dans le corps, absent ⇔ zéro. C'est le même
 * invariant que le compilateur tient sur le dossier, redit ici PARCE QUE ce fichier lit un
 * artéfact qu'une autre version du pipeline a pu produire (voir `compterAncres`).
 *
 * CE QUI EST VÉRIFIÉ : qu'elle désigne CETTE leçon, qu'elle porte un titre, au moins deux
 * acteurs aux `id` kebab-case UNIQUES et non hérités d'`Object.prototype`, de `type` pris
 * dans la liste NOMINATIVE, au libellé non vide, et au moins une étape dont le `numero` suit
 * la position (1-based), avec titre et narration non vides. Plus la collision d'`id` de
 * document, que ni l'auteur ni le composant ne peuvent arbitrer seuls.
 *
 * ⏭️ CE QUI RESTE AU LOT b : les champs d'`etatVisuel` (`acteurActif`, `fleche`, `panneaux`,
 * `surbrillance`). C'est le composant qui les lit, donc lui qui doit les refuser nommément —
 * même partage que `sections`/`blocs` avec `RenduBlocs` et que l'enveloppe du quiz avec
 * `QuizComponent`. Les redire ici ferait deux vérités qui divergeraient au premier
 * ajustement du schéma (L-016).
 *
 * @param valeur le champ `simulation` brut, ou `undefined` s'il n'y en a pas
 * @param slug le `frontmatter.slug` déjà lu, ou `undefined` si le frontmatter est hors contrat
 * @param ancresDuDocument les ancres de section déjà lues — l'autre moitié de l'espace de noms
 * @param blocsLisibles les blocs de chaque section, ou `null` si l'un d'eux est hors contrat
 * @param manques canal d'accumulation partagé avec `lireLeconCompilee`
 */
function verifierEnveloppeDeLaSimulation(
  valeur: unknown,
  slug: unknown,
  ancresDuDocument: readonly unknown[],
  blocsLisibles: readonly (readonly unknown[])[] | null,
  manques: string[],
): void {
  // LE COMPTE D'ANCRES SE FAIT DANS LES DEUX CAS — c'est lui qui attrape l'ancre ORPHELINE,
  // celle d'une leçon sans simulation. Un contrôle qui ne s'exécuterait qu'en présence du
  // champ laisserait passer très exactement la moitié du défaut.
  const attendues = valeur === undefined ? 0 : 1;
  if (blocsLisibles !== null) {
    const trouvees = blocsLisibles.reduce(
      (total, blocs) => total + compterAncres(blocs, 'ancre-simulation'),
      0,
    );
    if (trouvees !== attendues) {
      manques.push(
        `« sections » : ${trouvees} ancre(s) « [[simulation]] » dans le corps, ${attendues} attendue(s) ` +
          (valeur === undefined
            ? '— aucune « simulation » dans cette leçon, l’ancre laisserait un trou dans la page'
            : trouvees === 0
              ? '— la simulation ne serait rendue nulle part'
              : '— la simulation serait rendue plusieurs fois, tous ses ids d’étape dupliqués'),
      );
    }
  }

  if (valeur === undefined) return;
  if (!estObjet(valeur)) {
    manques.push('« simulation » : objet attendu — le champ existe mais n’est pas une simulation');
    return;
  }

  if (!estChaineNonVide(valeur['titre'])) {
    manques.push('« simulation.titre » : chaîne non vide attendue');
  }

  // Même prudence que pour le quiz : le slug n'est comparé que s'il est lui-même conforme.
  if (typeof slug === 'string' && valeur['lecon'] !== slug) {
    manques.push(
      `« simulation.lecon » : « ${String(valeur['lecon'])} » alors que « frontmatter.slug » vaut « ${slug} »`,
    );
  }

  const acteurs = valeur['acteurs'];
  // LE SEUIL EST DEUX, PAS UN — repris mot pour mot de `minItems: 2` du schéma
  // (`simulation.schema.json`, `acteurs.description`) et de `types.d.ts` (« 2 à 6 »). Un
  // `length !== 0` laisserait traverser cette frontière une simulation à un acteur, que le
  // build refuse : la lecture serait alors PLUS permissive que l'écriture, exactement ce que
  // ce fichier existe pour empêcher.
  if (!Array.isArray(acteurs) || acteurs.length < 2) {
    manques.push(
      '« simulation.acteurs » : au moins deux acteurs — une simulation à un acteur ne ' +
        'raconte pas d’échange',
    );
  } else {
    const identifiants: string[] = [];
    for (const [rang, acteur] of acteurs.entries()) {
      const ou = `« simulation.acteurs[${rang}] »`;
      if (!estObjet(acteur)) {
        manques.push(`${ou} : objet attendu`);
        continue;
      }
      // L'`id` d'un acteur est la clef par laquelle chaque étape le désigne (`acteurActif`,
      // `fleche`, `panneaux`, `surbrillance`) : deux homonymes rendraient l'un des deux
      // indésignable, et le composant du lot b peindrait le mauvais.
      if (typeof acteur['id'] !== 'string' || !KEBAB_CASE.test(acteur['id'])) {
        manques.push(`${ou}.id : kebab-case attendu`);
      } else if (Object.hasOwn(Object.prototype, acteur['id'])) {
        // 🔴 LE PIÈGE DU PROTOTYPE, REFUSÉ À LA FRONTIÈRE. `panneaux` est un
        // `Record<idActeur, PanneauSimulation>` issu d'un `JSON.parse`, et le composant du
        // lot b l'indexera par l'`id` de l'acteur. Sur un objet dépourvu de la clef,
        // `panneaux['constructor']` ne rend pas `undefined` mais
        // `Object.prototype.constructor` — une fonction, donc une valeur *truthy* qui
        // traverserait un `@if (panneau)` pour peindre un panneau vide.
        // L'ENSEMBLE VISÉ EST CLOS ET ÉNUMÉRABLE, ce n'est donc pas une liste noire : on
        // interroge `Object.prototype` lui-même. Deux voisins pour situer le seul cas réel :
        // `__proto__` est déjà refusé plus haut (le kebab-case n'admet pas d'underscore) et
        // `prototype` n'est pas hérité par un objet simple — reste `constructor`, qui passe
        // le kebab-case sans rien devoir à un contenu hostile. Même parade que
        // `resoudre-lecon.ts` sur la carte des leçons.
        manques.push(
          `${ou}.id : « ${acteur['id']} » est hérité d’« Object.prototype » — cet « id » ` +
            'indexerait « panneaux » sur une valeur que l’auteur n’a pas écrite',
        );
      } else {
        identifiants.push(acteur['id']);
      }
      if (!estChaineNonVide(acteur['libelle'])) {
        manques.push(`${ou}.libelle : chaîne non vide attendue`);
      }
      if (!TYPES_ACTEUR.some((connu) => connu === acteur['type'])) {
        manques.push(`${ou}.type : attendu ${TYPES_ACTEUR.join(' | ')}`);
      }
    }
    if (new Set(identifiants).size !== identifiants.length) {
      manques.push('« simulation.acteurs » : deux acteurs partagent le même « id »');
    }
  }

  const etapes = valeur['etapes'];
  if (!Array.isArray(etapes)) {
    manques.push('« simulation.etapes » : tableau attendu');
    return;
  }
  if (etapes.length === 0) {
    manques.push('« simulation.etapes » : au moins une étape attendue');
    return;
  }

  for (const [rang, etape] of etapes.entries()) {
    const ou = `« simulation.etapes[${rang}] »`;
    if (!estObjet(etape)) {
      manques.push(`${ou} : objet attendu`);
      continue;
    }
    // Le `numero` N'EST PAS décoratif : c'est lui qui devient l'`id` de document de l'étape
    // (`PREFIXE_ID_ETAPE`), donc la cible du lien de la barre d'étapes. Un `numero` qui ne
    // suivrait pas la position ferait deux étapes au même `id`, ou un lien vers rien.
    if (etape['numero'] !== rang + 1) {
      manques.push(`${ou}.numero : ${String(etape['numero'])} attendu à ${rang + 1} (1-based)`);
    }
    if (!estChaineNonVide(etape['titre'])) manques.push(`${ou}.titre : chaîne non vide attendue`);
    // La narration est l'équivalent textuel de l'état visuel (WCAG 1.1.1) : une étape muette
    // serait une étape que rien ne raconte à qui ne voit pas le dessin.
    if (!estChaineNonVide(etape['narration'])) {
      manques.push(`${ou}.narration : chaîne non vide attendue`);
    }
    // Les CHAMPS d'`etatVisuel` appartiennent au composant du lot b ; sa PRÉSENCE, non —
    // sans elle, il n'aurait rien à peindre et la page serait à moitié rendue.
    if (!estObjet(etape['etatVisuel'])) manques.push(`${ou}.etatVisuel : objet attendu`);
  }

  // LA COLLISION AVEC LE RESTE DU DOCUMENT — mesurée SEULEMENT quand la simulation est là,
  // parce que ces `id` n'existent dans la page que dans ce cas. L'espace de noms est
  // confronté EN ENTIER, ancres réservées comprises : elles commencent aujourd'hui toutes
  // par « titre- », donc aucune ne peut heurter — mais cette garantie ne vivait qu'en
  // commentaire (L-008), et la voici tenue par le code. Restent les ancres écrites par
  // l'auteur, qui sont libres : « simulation » est un choix parfaitement naturel pour la
  // section qui présente le pas-à-pas.
  const idsDeLaSimulation = [
    ID_SIMULATION,
    ...etapes.map((_etape, rang) => `${PREFIXE_ID_ETAPE}${rang + 1}`),
  ];
  const espaceDeNoms = [...ANCRES_RESERVEES, ...ancresDuDocument];
  const heurtes = idsDeLaSimulation.filter((id) => espaceDeNoms.some((ancre) => ancre === id));
  if (heurtes.length > 0) {
    manques.push(
      `« simulation » : l'« id » de document « ${heurtes.join(', ')} » est déjà pris par une ` +
        'ancre de section — la simulation et le sommaire se disputeraient la même cible',
    );
  }
}
