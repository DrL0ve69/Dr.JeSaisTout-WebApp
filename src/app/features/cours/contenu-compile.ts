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
  }

  verifierEnveloppeDuQuiz(
    valeur['quiz'],
    estObjet(frontmatter) ? frontmatter['slug'] : undefined,
    ancresDuDocument,
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
  // Les `ANCRES_RESERVEES` sont hors de portée par CONSTRUCTION : elles commencent toutes
  // par « titre- », qu'aucun `PREFIXE_ID_QUESTION + …` ne peut produire. Ne restent donc que
  // les ancres écrites par l'auteur, qui sont libres — et c'est exactement le cas qu'aucune
  // des deux parties ne peut arbitrer seule, d'où le refus nominatif ici.
  const heurtees = identifiants.filter((id) =>
    ancresDuDocument.some((ancre) => ancre === `${PREFIXE_ID_QUESTION}${id}`),
  );
  if (heurtees.length > 0) {
    manques.push(
      `« quiz.questions » : l'« id » ${heurtees.join(', ')} donnerait l'« id » de document ` +
        `« ${PREFIXE_ID_QUESTION}${heurtees[0]} », déjà pris par une ancre de section`,
    );
  }
}
