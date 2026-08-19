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
// par la page. Le préfixe de route est dérivé UNE fois, ici (`prefixeRouteLecon`).
//
// Les deux fonctions qui décident ce que le PUBLIC atteint — `parametresDePrerender`
// et `voisinesDe` — passent par `leconsPubliees` (`../contenu-compile`), l'unique
// définition de « publiée » du dépôt (décision D-1 d'E2-ST6). Le prédicat
// `statut === 'publiee'` ne se recopie jamais ici (L-016).
//
// 🔴 ET TOUTES PRENNENT UN `sujet`, DEPUIS LE CORRECTIF DE REVUE DU 2026-08-19.
// La phase 1 porte DEUX cours (sécurité web et PHP, §E7) dans UN SEUL manifeste.
// Une fonction qui balaie le manifeste entier en ne cherchant que le `slug` est
// aveugle au cours : `getPrerenderParams()` de la route `cours/securite-web/:slug`
// écrirait alors `/cours/securite-web/variables/index.html` pour une leçon de PHP —
// une page LIVRÉE et INDEXABLE sous l'URL d'un autre cours, pendant que le lien du
// sommaire vers `/cours/php/variables` tomberait en 404. Même cause, second effet :
// la « leçon suivante » du dernier module de sécurité mènerait au premier de PHP.
// ⚠️ L'unicité des slugs NE RÈGLE PAS ce défaut. `generer-manifeste.mjs` refuse bien
// au build deux leçons de même slug, tous sujets confondus — mais un slug unique dit
// seulement quelle leçon on désigne, jamais sous quelle URL on l'écrit.
//
// ⚠️ Les types (`EntreeManifesteRoutes`, `SectionCompilee`) sont AMBIANTS —
// `tools/content-pipeline/types.d.ts`, listé dans `tsconfig.app.json` (L-016).
// =============================================================================

import { leconsPubliees } from '../contenu-compile';

/**
 * Le préfixe des routes de leçon d'un cours — DÉRIVÉ DU SUJET, plus une constante.
 *
 * Il était écrit en dur (`/cours/securite-web`) tant qu'un seul cours existait ; avec
 * deux cours dans un manifeste unique, une constante aurait fabriqué le lien d'une
 * leçon de PHP sous l'URL du cours de sécurité. Le `sujet` vient du MANIFESTE, donc
 * du pipeline — jamais de l'URL du visiteur (règle en tête d'`app.routes.server.ts`).
 *
 * La table de routes porte le chemin de son côté, et `app.routes.spec.ts` vérifie que
 * les deux coïncident sur le rendu réel, pas sur cette fonction (L-012).
 */
export function prefixeRouteLecon(sujet: string): string {
  return `/cours/${sujet}`;
}

/** Le nom du site, tel qu'il doit apparaître dans chaque titre d'onglet (WCAG 2.4.2). */
const NOM_DU_SITE = 'Dr. Je-Sais-Tout';

/**
 * Les entrées d'UN cours — l'unique définition du filtre de sujet de ce fichier.
 *
 * Trois fonctions en ont besoin, et elles n'ont pas le droit de diverger : trois
 * recopies de `entree.sujet === sujet` seraient un L-016 en puissance, exactement
 * comme les quatre recopies de `statut === 'publiee'` qu'évite `leconsPubliees`.
 * L'ordre du manifeste est PRÉSERVÉ — `voisinesDe` en dépend.
 */
function duCours(
  entrees: readonly EntreeManifesteRoutes[],
  sujet: string,
): readonly EntreeManifesteRoutes[] {
  return entrees.filter((entree) => entree.sujet === sujet);
}

// -----------------------------------------------------------------------------
// Prerender
// -----------------------------------------------------------------------------

/**
 * Les paramètres de route à prerendre — un objet `{ slug }` par leçon PUBLIÉE
 * **du cours demandé**, dans l'ordre du manifeste.
 *
 * 🔴 LE FILTRE DE SUJET EST AUSSI STRUCTURANT QUE CELUI DE STATUT, et il se trompe
 * plus discrètement. Cette fonction alimente le `getPrerenderParams()` d'UNE route,
 * dont le chemin nomme UN cours ; chaque slug rendu ici devient un `index.html`
 * ÉCRIT SOUS CE CHEMIN. Sans le filtre, une leçon de PHP serait déployée à
 * `/cours/securite-web/<son slug>/` — publiée, indexable, et servie par le
 * résolveur, alors que son URL légitime répondrait 404.
 *
 * 🔴 C'EST ICI QUE SE FERME LA RÉSERVE (3) D'E2-ST2, et nulle part ailleurs. Une
 * entrée en `brouillon` (ou en `verifiee`) qui arriverait jusqu'ici deviendrait un
 * fichier `index.html` déployé : une page PUBLIQUE et INDEXABLE, atteignable par
 * URL directe et par moteur de recherche, sans qu'aucun lien du site n'y mène. La
 * masquer du sommaire et de la navigation ne serait alors qu'une façade. Le filtre
 * de sortie du produit passe donc par `leconsPubliees` — décision D-1 d'E2-ST6.
 *
 * Ce que la décision de 2026-08-16 disait reste vrai et ne s'oppose pas à ce
 * filtre : le manifeste ne contient que ce que `--racine` a compilé, et la
 * leçon-témoin du pipeline vit hors de `content/` — la protection contre une leçon
 * FACTICE reste physique, et remplace toujours le drapeau `factice` abandonné. Ce
 * qui a changé, c'est le débat que ce commentaire déclarait « non ouvert » :
 * publier ou non un brouillon EST tranché, et la réponse est non.
 *
 * Un manifeste vide — ou sans aucune leçon publiée dans ce cours — rend `[]` :
 * `npm run build` prerende alors zéro leçon, sans échouer. C'est l'état normal du
 * dépôt jusqu'à E3-ST1.
 *
 * @param entrees le manifeste ENTIER, tous cours confondus
 * @param sujet le cours dont la route appelle cette fonction (`securite-web`, `php`…)
 */
export function parametresDePrerender(
  entrees: readonly EntreeManifesteRoutes[],
  sujet: string,
): Record<string, string>[] {
  return duCours(leconsPubliees(entrees), sujet).map((entree) => ({ slug: entree.slug }));
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
 * Les voisines d'un slug parmi les leçons PUBLIÉES **du même cours**, dans l'ordre
 * du manifeste, qui fait foi pour l'ordre du cours.
 *
 * 🔴 LE FILTRE DE SUJET PRÉCÈDE TOUT LE RESTE, et sans lui le parcours DÉBORDERAIT
 * d'un cours à l'autre : la « leçon suivante » du dernier module de sécurité serait
 * le premier module de PHP, sous un lien `/cours/securite-web/…` qui n'existe pas.
 *
 * 🔴 LE FILTRE S'APPLIQUE AVANT LE CALCUL DU RANG, ET C'EST TOUT L'ENJEU. Filtrer
 * APRÈS donnerait `null` là où un brouillon s'intercale, c'est-à-dire un cours qui
 * s'INTERROMPT au milieu pour le lecteur ; filtrer AVANT le fait SAUTER, et le
 * parcours reste continu. Les deux comportements sont différents, un seul est
 * correct — d'où l'assertion dédiée dans `lecon.spec.ts` (un brouillon posé au
 * MILIEU du manifeste, pas à une extrémité, où les deux implémentations
 * coïncideraient).
 *
 * Un slug absent des leçons publiées — inconnu, ou publié nulle part parce qu'il
 * est encore en brouillon — rend deux `null` plutôt que de lever : le cas se
 * produit légitimement en test (une leçon rendue hors manifeste) et il ne mérite
 * pas de casser une page — l'absence de voisines est un rendu correct, pas un
 * demi-rendu. Le cas « slug inconnu » côté ROUTE, lui, est traité en amont par
 * `resoudre-lecon.ts`, et il redirige.
 *
 * @param entrees le manifeste ENTIER, tous cours confondus
 * @param sujet le cours de la leçon affichée — celui de son frontmatter
 * @param slug le slug de la leçon affichée — celui de son frontmatter, jamais l'URL
 */
export function voisinesDe(
  entrees: readonly EntreeManifesteRoutes[],
  sujet: string,
  slug: string,
): Voisines {
  const publiees = duCours(leconsPubliees(entrees), sujet);
  const rang = publiees.findIndex((entree) => entree.slug === slug);
  if (rang === -1) return { precedente: null, suivante: null };
  return {
    precedente: publiees[rang - 1] ?? null,
    suivante: publiees[rang + 1] ?? null,
  };
}

/** Le chemin de route d'une leçon, sous forme de commandes `routerLink`. */
export function lienVersLecon(sujet: string, slug: string): string[] {
  return [prefixeRouteLecon(sujet), slug];
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
 *
 * LE SUJET AUSSI VIENT DU FRONTMATTER : une `og:url` qui nommerait le mauvais cours
 * ferait publier au site, sous son propre domaine, une adresse qui répond 404.
 */
export function urlDeLecon(sujet: string, slug: string): string {
  return `${prefixeRouteLecon(sujet)}/${slug}`;
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
 *
 * ⚠️ CETTE FONCTION NE FILTRE PAS SUR `statut`, DÉLIBÉRÉMENT (E2-ST6, lot C2).
 * `leconsPubliees` garde ce que le public ATTEINT — une URL prerendue, un lien de
 * sommaire, une voisine, et depuis le correctif du 2026-08-19 le chargement même de
 * la leçon (`resoudreLecon`) et son ÉCRITURE dans l'artéfact
 * (`generer-manifeste.mjs`). Un titre d'onglet, lui, ne fait atteindre personne : il
 * nomme une page DÉJÀ à l'écran. Filtrer ici ne retirerait donc aucune page
 * publique ; ça donnerait un onglet « Sécurité des applications web » au-dessus d'un
 * `<h1>` qui dit autre chose — un titre qui ne décrit plus son document, c'est-à-dire
 * un échec de 2.4.2, pour zéro gain de confidentialité. Le risque que cette fonction
 * porte est ailleurs et il est déjà tenu : ne jamais réafficher un slug forgé, ce que
 * fait le repli générique ci-dessous.
 *
 * 🔴 CE QUE LA VERSION PRÉCÉDENTE DE CETTE NOTE DISAIT DE FAUX, ET QUI A ÉTÉ MESURÉ.
 * Elle affirmait que la seule surface où un brouillon reste rendu est `npm start` et
 * la relecture éditoriale. C'était faux : le SITE DÉPLOYÉ le rendait aussi. Le chunk
 * de la leçon était écrit, servi en 200, et le routeur client montait la page entière
 * sur l'URL non prerendue. Après le correctif, un brouillon n'est plus rendu NULLE
 * PART — ni en ligne, ni en `npm start` : le drapeau `--inclure-brouillons` remet le
 * chunk, mais `resoudreLecon` refuse toujours. Cette fonction ne nomme donc plus,
 * aujourd'hui, que des pages publiées ; elle reste sans filtre pour le jour où une
 * prévisualisation EXPLICITE existera (voir l'en-tête de `resoudre-lecon.ts`).
 *
 * 🔴 ELLE FILTRE EN REVANCHE SUR LE `sujet`, ET CE N'EST PAS LA MÊME QUESTION. Ne pas
 * filtrer sur le statut laisse nommer une page DÉJÀ à l'écran ; ne pas filtrer sur le
 * cours ferait titrer l'onglet d'une leçon avec le titre d'une AUTRE — celle qu'un
 * homonyme de slug désignerait dans le cours voisin. Le titre ne décrirait plus son
 * document (échec de WCAG 2.4.2). L'unicité globale des slugs rend ce cas improbable
 * aujourd'hui, mais c'est un invariant du PIPELINE, pas une garantie de cette
 * fonction : elle reçoit un manifeste, elle ne le fabrique pas.
 *
 * @param entrees le manifeste ENTIER, tous cours confondus
 * @param sujet le cours de la route qui appelle — déjà écrit dans son `path`
 * @param slug le segment reçu, éventuellement forgé : il ne sert qu'à CHERCHER
 */
export function titreDeDocument(
  entrees: readonly EntreeManifesteRoutes[],
  sujet: string,
  slug: string,
): string {
  const entree = duCours(entrees, sujet).find((candidate) => candidate.slug === slug);
  if (entree === undefined) {
    // ⏭️ E7 : le jour où une seconde route de cours appellera cette fonction, ce repli
    // devra nommer SON cours. Il est juste aujourd'hui parce qu'un seul appelant
    // existe — `app.routes.ts`, route `cours/securite-web/:slug`.
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
