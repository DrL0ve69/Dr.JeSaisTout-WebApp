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
      if (
        typeof section['ancre'] !== 'string' ||
        !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(section['ancre'])
      ) {
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
    const ancres = sections.map((section) => (estObjet(section) ? section['ancre'] : undefined));
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

  if (manques.length > 0) refuser(provenance, manques);

  return valeur as unknown as LeconCompilee;
}
