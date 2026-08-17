// =============================================================================
// LES DÉRIVATIONS PURES d'une leçon et du manifeste (E2-ST2, lot B)
// -----------------------------------------------------------------------------
// Quatre fonctions, aucune dépendance Angular, aucun état : ce qui se déduit du
// manifeste et des sections compilées. Elles vivent hors du composant et hors des
// tables de routes précisément pour être TESTABLES sur des données réelles — le
// manifeste du dépôt vaut `[]` jusqu'à E3-ST1, donc un test qui n'atteindrait ces
// calculs qu'à travers le composant ne prouverait rien (L-005).
//
// `parametresDePrerender` est appelée par `app.routes.server.ts` ; les trois autres
// par la page. Le préfixe de route est écrit UNE fois, ici.
//
// ⚠️ Les types (`EntreeManifesteRoutes`, `SectionCompilee`) sont AMBIANTS —
// `tools/content-pipeline/types.d.ts`, listé dans `tsconfig.app.json` (L-016).
// =============================================================================

/**
 * Le préfixe des routes de leçon. Écrit ici, cité par la page (prev/next) ; la
 * table de routes le porte de son côté, et `app.routes.spec.ts` vérifie que les
 * deux coïncident sur le rendu réel, pas sur cette constante (L-012).
 */
export const PREFIXE_ROUTE_LECON = '/cours/securite-web';

/** Le nom du site, tel qu'il doit apparaître dans chaque titre d'onglet (WCAG 2.4.2). */
const NOM_DU_SITE = 'Dr. Je-Sais-Tout';

// -----------------------------------------------------------------------------
// Prerender
// -----------------------------------------------------------------------------

/**
 * Les paramètres de route à prerendre — un objet `{ slug }` par entrée du
 * manifeste, dans l'ordre du manifeste.
 *
 * AUCUN FILTRAGE, ET C'EST UNE DÉCISION ARRÊTÉE (nœud tranché par le propriétaire
 * le 2026-08-16). Le manifeste ne peut contenir que ce que `--racine` a compilé, et
 * la racine par défaut est `content/cours/securite-web` : la leçon-témoin du
 * pipeline vit hors de `content/`, donc hors de portée du build de production. Il
 * n'y a pas de « fausse » leçon à écarter — il n'existe aucun champ pour le faire,
 * et c'est la protection PHYSIQUE qui remplace le drapeau `factice` abandonné.
 * Filtrer sur `statut` serait un autre débat (publier ou non un brouillon) et il
 * n'est pas ouvert : le validateur décide de ce qui entre dans `content/`.
 *
 * Un manifeste vide rend `[]` — `npm run build` prerende alors zéro leçon, sans
 * échouer. C'est l'état normal du dépôt jusqu'à E3-ST1.
 */
export function parametresDePrerender(
  entrees: readonly EntreeManifesteRoutes[],
): Record<string, string>[] {
  return entrees.map((entree) => ({ slug: entree.slug }));
}

// -----------------------------------------------------------------------------
// Voisinage — la navigation prev/next
// -----------------------------------------------------------------------------

/** Les deux leçons voisines. `null` = il n'y en a pas ; JAMAIS un lien vide. */
export interface Voisines {
  readonly precedente: EntreeManifesteRoutes | null;
  readonly suivante: EntreeManifesteRoutes | null;
}

/**
 * Les voisines d'un slug dans le manifeste, qui fait foi pour l'ordre du cours.
 *
 * Un slug absent du manifeste rend deux `null` plutôt que de lever : le cas se
 * produit légitimement en test (une leçon rendue hors manifeste) et il ne mérite
 * pas de casser une page — l'absence de voisines est un rendu correct, pas un
 * demi-rendu. Le cas « slug inconnu » côté ROUTE, lui, est traité en amont par
 * `resoudre-lecon.ts`, et il redirige.
 */
export function voisinesDe(entrees: readonly EntreeManifesteRoutes[], slug: string): Voisines {
  const rang = entrees.findIndex((entree) => entree.slug === slug);
  if (rang === -1) return { precedente: null, suivante: null };
  return {
    precedente: entrees[rang - 1] ?? null,
    suivante: entrees[rang + 1] ?? null,
  };
}

/** Le chemin de route d'une leçon, sous forme de commandes `routerLink`. */
export function lienVersLecon(slug: string): string[] {
  return [PREFIXE_ROUTE_LECON, slug];
}

/**
 * L'URL d'une leçon, en chemin absolu — pour `og:url` (`lecon.ts`).
 *
 * 🔴 LE SLUG ATTENDU EST CELUI DU FRONTMATTER, jamais celui de l'URL : une balise
 * `og:url` bâtie sur le segment reçu ferait publier au site, sous son propre
 * domaine, l'adresse qu'un tiers a forgée (règle en tête d'`app.routes.server.ts`).
 *
 * CHEMIN ET NON URL ABSOLUE, faute de source de vérité pour l'origine : le domaine
 * public ne vit aujourd'hui que dans `docs/deployment.md` et dans l'état Terraform.
 * L'écrire en dur ici en ferait une deuxième vérité, qui mentirait le jour d'un
 * domaine personnalisé ; le déduire du `document` au prerender y graverait l'hôte de
 * BUILD. Un chemin est incomplet pour certains agrégateurs, il n'est jamais FAUX.
 */
export function urlDeLecon(slug: string): string {
  return `${PREFIXE_ROUTE_LECON}/${slug}`;
}

// -----------------------------------------------------------------------------
// Titre de document
// -----------------------------------------------------------------------------

/**
 * Le titre d'onglet d'une leçon, DÉDUIT DU MANIFESTE — jamais du slug de l'URL.
 *
 * 🔴 C'est ici que se joue la règle écrite en tête d'`app.routes.server.ts` : un
 * slug sert à CHOISIR quel texte, écrit par nous, s'affiche. Le slug entre, un
 * titre rédigé par la boucle contenu sort. Un slug introuvable ne se réaffiche donc
 * pas « pour aider » : il rend le titre générique du cours. Ce n'est pas une
 * question d'échappement — `/cours/securite-web/votre-compte-est-compromis-appelez…`
 * serait parfaitement échappé, et ferait quand même écrire au site, sous son propre
 * domaine, la phrase d'un tiers.
 *
 * POURQUOI CETTE FONCTION PLUTÔT QU'UNE `TitleStrategy` MAISON. La stratégie par
 * défaut d'Angular applique déjà `route.title` qu'il soit une chaîne OU un
 * `ResolveFn<string>` : la table de routes passe donc cette fonction, et le titre
 * est posé par le routeur — avant tout rendu, sans effet de bord dans le composant,
 * et sans dépendre de l'ordre de résolution des `resolve`. Une classe
 * `TitleStrategy` n'ajouterait ici aucun comportement : elle ne ferait que
 * recentraliser un suffixe déjà écrit une seule fois. Le commentaire d'E1 disait
 * qu'elle « se justifierait en E2, quand le titre viendra du frontmatter » ; le
 * titre vient bien du contenu, mais l'API de route suffit à l'y prendre.
 */
export function titreDeDocument(entrees: readonly EntreeManifesteRoutes[], slug: string): string {
  const entree = entrees.find((candidate) => candidate.slug === slug);
  if (entree === undefined) {
    return `Sécurité des applications web — ${NOM_DU_SITE}`;
  }
  return `${entree.titre} — ${NOM_DU_SITE}`;
}

// -----------------------------------------------------------------------------
// Sommaire ancré
// -----------------------------------------------------------------------------

/** Une entrée de sommaire de second niveau (un `<h3>` de la leçon). */
export interface SousEntreeSommaire {
  readonly ancre: string;
  readonly titre: string;
}

/** Une entrée de sommaire de premier niveau (un `<h2>`), et ses sous-titres. */
export interface EntreeSommaire extends SousEntreeSommaire {
  readonly sousEntrees: readonly SousEntreeSommaire[];
}

/**
 * Reconstruit un sommaire IMBRIQUÉ à partir de la liste plate des sections.
 *
 * `SectionCompilee.niveau` vaut 2 ou 3 et correspond au `<h2>`/`<h3>` réellement
 * rendu : une section de niveau 3 appartient à la section de niveau 2 qui la
 * précède. Un sommaire plat afficherait « Le même mécanisme, en TypeScript » au
 * même rang que « Exemple simple » — le lecteur perdrait la structure que les
 * titres portent, et la liste imbriquée est aussi ce qu'annonce un lecteur d'écran
 * (« liste de 7 éléments », puis « liste de 1 élément » à l'intérieur).
 *
 * CAS LIMITE ASSUMÉ : une leçon qui DÉBUTE par une section de niveau 3 n'a pas de
 * parent où la ranger. Elle est alors placée au premier niveau plutôt que jetée —
 * un sommaire silencieusement incomplet serait pire qu'un sommaire un peu plat, et
 * le gabarit du pipeline rend ce cas improbable (il ancre la première section).
 */
export function construireSommaire(
  sections: readonly SectionCompilee[],
): readonly EntreeSommaire[] {
  const sommaire: { ancre: string; titre: string; sousEntrees: SousEntreeSommaire[] }[] = [];

  for (const section of sections) {
    const parent = sommaire.at(-1);
    if (section.niveau === 3 && parent !== undefined) {
      parent.sousEntrees.push({ ancre: section.ancre, titre: section.titre });
      continue;
    }
    sommaire.push({ ancre: section.ancre, titre: section.titre, sousEntrees: [] });
  }

  return sommaire;
}
