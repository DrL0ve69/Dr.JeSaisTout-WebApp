// =============================================================================
// LE RENVOI AU COURS — l'UNIQUE fabrique de libellé de diapositives (lot 2)
// -----------------------------------------------------------------------------
// 🔴 POURQUOI CE FICHIER EXISTE, ET POURQUOI IL EST SEUL.
// `docs/contenu/ancrage-au-cours.md` §5 le pose en toutes lettres : « On réutilise
// cette fonction, on n'en écrit pas une deuxième : deux fabriques de libellé
// divergent, et rien ne le signale. » TROIS surfaces citent aujourd'hui les mêmes
// diapositives — l'étiquette d'un encadré (`rendu-blocs.ts`), la ligne posée sous un
// titre de section et le texte du lien de sommaire (`lecon.ts` / `navigation-lecon.ts`).
// Le repli des plages n'a donc qu'une implémentation, ici ; ce que chaque surface
// choisit, c'est son EMBALLAGE (« · Séance 2 · … » d'un côté, « (…) » de l'autre).
//
// ⚠️ TOUTES LES ESPACES QUI COMPTENT SONT INSÉCABLES, ET CE N'EST PAS DE LA
// TYPOGRAPHIE (L-024). `preserveWhitespaces: false` retire le nœud blanc entre deux
// `<span>` : le nom accessible se recollerait en un seul mot, l'espace visible ne
// venant que du `gap` CSS, qu'aucune API d'accessibilité ne lit. D'où la règle
// appliquée partout ci-dessous : un renvoi est UNE SEULE CHAÎNE, interpolée dans UN
// SEUL élément, et aucune de ses espaces ne dépend du CSS. Une plage — « 12 à 18 » —
// se tient de la même façon d'un bloc : un retour à la ligne au milieu ferait lire
// « 12 » et « 18 » comme deux numéros isolés.
//
// ⚠️ Les types sont AMBIANTS (`tools/content-pipeline/types.d.ts`, listé dans
// `tsconfig.app.json`) — il n'y a rien à importer pour `SectionCompilee` (L-016).
// =============================================================================

/** U+00A0 écrite en échappement : `no-irregular-whitespace` refuse la vraie dans un littéral. */
export const INSECABLE = '\u00A0';

/**
 * CE QUE LA FABRIQUE LIT D'UNE SECTION — son renvoi, et son marqueur `{hors-cours}`.
 *
 * 🔴 ELLE PREND LA SECTION, PAS LE SEUL `renvoiCours` (lot 1c-B). Depuis §3bis, deux champs
 * INDÉPENDANTS du contrat décident de ce qui s'écrit sous un titre, et ils sont exclusifs
 * (`types.d.ts` : les deux à la fois sont refusés par les deux copies du juge). Passer le seul
 * renvoi obligerait chaque appelant à lire l'autre champ lui-même, donc à recomposer un bout de
 * libellé de son côté — exactement la seconde fabrique que §5 interdit.
 *
 * Le type est DÉRIVÉ du contrat ambiant plutôt que réécrit : le jour où un troisième champ
 * d'ancrage apparaît, ce fichier le voit au lieu de continuer à décrire l'ancien (L-016).
 */
export type AncrageDeTitre = Pick<SectionCompilee, 'renvoiCours' | 'horsCours'>;

/**
 * À partir de COMBIEN de numéros consécutifs une suite se replie en « a à b ».
 *
 * Décision du propriétaire (2026-09-01) : TROIS. « 45, 46 » se lit aussi vite que
 * « 45 à 46 » et dit plus — on voit qu'il y en a exactement deux ; à partir de trois,
 * l'énumération devient du bruit qui masque l'étendue réelle du renvoi.
 */
const SEUIL_DE_REPLI = 3;

/**
 * Les segments d'une suite de numéros : « 56 », « 64 à 66 », …
 *
 * `[56,57,64,65,66,69,70,71]` → `['56', '57', '64 à 66', '69 à 71']` (avec des
 * insécables autour du « à »).
 *
 * ⚠️ ON NE RETRIE PAS, ET C'EST VOULU. L'ordre vient de l'auteur, déplié par le
 * compilateur ; le réordonner ici ferait dire à la page autre chose que ce que la
 * source déclare, et masquerait un renvoi mal saisi au lieu de le montrer. Une suite
 * non croissante produit simplement des segments d'un seul numéro.
 */
export function replierDiapositives(diapos: readonly number[]): string[] {
  const segments: string[] = [];
  let debut: number | undefined;
  let fin: number | undefined;
  let longueur = 0;

  const fermerLaSuite = (): void => {
    if (debut === undefined || fin === undefined) return;
    if (longueur >= SEUIL_DE_REPLI) {
      segments.push(`${debut}${INSECABLE}à${INSECABLE}${fin}`);
      return;
    }
    // Une suite courte s'écrit en clair. Elle est consécutive par construction, donc
    // l'énumération de `debut` à `fin` rend exactement les numéros qu'elle contient.
    for (let numero = debut; numero <= fin; numero += 1) segments.push(String(numero));
  };

  for (const diapo of diapos) {
    if (fin !== undefined && diapo === fin + 1) {
      fin = diapo;
      longueur += 1;
      continue;
    }
    fermerLaSuite();
    debut = diapo;
    fin = diapo;
    longueur = 1;
  }
  fermerLaSuite();

  return segments;
}

/**
 * « diapo 13 », « diapos 56, 57, 64 à 66 » — ou `null` quand il n'y en a aucune.
 *
 * LE SINGULIER N'EST PAS UNE COQUETTERIE : « diapos 13 » ferait douter le lecteur
 * qu'il manque un numéro.
 *
 * ⚠️ LE `null` A UN APPELANT RÉEL, côté encadré : le contrat autorise `diapos: []`
 * quand l'encadré ne déclare qu'une `seance` (§5). Une étiquette qui finirait par
 * « · diapos » sans numéro serait un renvoi mort. (Sur un TITRE de section, `diapos`
 * est requis depuis le lot 1a — le cas n'y survient pas, mais la fabrique est
 * partagée, donc elle le traite.)
 */
export function libelleDiapositives(diapos: readonly number[]): string | null {
  const premiere = diapos[0];
  if (premiere === undefined) return null;
  if (diapos.length === 1) return `diapo${INSECABLE}${premiere}`;
  return `diapos${INSECABLE}${replierDiapositives(diapos).join(', ')}`;
}

/**
 * Ce que le lecteur voit quand une section EST cartographiée mais qu'aucune diapositive ne la
 * porte (`{hors-cours}`, §3bis). Même emballage entre parenthèses que les trois autres formes,
 * parce que c'est la même incise, au même endroit, lue par le même œil.
 *
 * ⚠️ SES ESPACES SONT ORDINAIRES, ET C'EST DÉLIBÉRÉ. Les insécables de ce fichier protègent une
 * NUMÉROTATION — « diapos 12 à 18 » coupé en deux ferait lire « 12 » et « 18 » comme deux numéros
 * isolés (L-024). Ici il n'y a aucun nombre à tenir : un repli entre deux mots d'une phrase ne
 * change rien à ce qui est lu. L'insécable qui compte est celle qui COLLE la mention au titre au
 * sommaire, et elle est posée par `construireSommaire`, comme pour un renvoi.
 */
const MENTION_HORS_COURS = '(hors du cours)';

/**
 * LA MENTION D'UN TITRE DE SECTION, entre parenthèses — ou `null` quand il n'y en a pas.
 *
 * Décision du propriétaire (2026-09-01, élargie le 2026-09-08), quatre formes et rien d'autre :
 *
 *   (diapos 12 à 18)
 *   (séance 4 · diapos 45 à 50)
 *   (420-4P2-HU · séance 8 · diapos 30 à 42)
 *   (hors du cours)
 *
 * 🔴 LA QUATRIÈME SORT DE CETTE FONCTION-CI, ET PAS D'UNE VOISINE (§5). Elle occupe la même
 * ligne, sous le même titre, dans le même `<p class="renvoi-titre">` et le même
 * `<span class="renvoi">` de sommaire : deux fabriques finiraient par emballer différemment la
 * même incise, et rien ne le signalerait.
 *
 * ⚠️ ABSENT N'EST PAS `false` (`types.d.ts`). Une section sans renvoi NI marqueur rend `null` —
 * « pas encore cartographié » ne s'écrit pas, c'est un trou, pas une information.
 *
 * 🔴 « SÉANCE N » N'EST ÉCRITE QUE SI ELLE APPREND QUELQUE CHOSE. Quand elle est
 * celle du module — le cas normal — la répéter sous chaque titre de la page ferait
 * lire vingt fois la même information et noierait le seul renvoi qui, lui, pointe
 * ailleurs. Elle est donc écrite dans exactement trois cas : la séance diffère de
 * celle du module ; le module n'en déclare aucune (le champ est optionnel, et taire
 * la séance laisserait alors le lecteur sans point d'entrée) ; ou le renvoi cite un
 * AUTRE cours, où « séance 8 » ne peut plus se déduire de rien.
 *
 * Minuscule à « séance » ici, majuscule dans l'étiquette d'un encadré : là-bas le
 * renvoi suit un mot-étiquette et ouvre un segment, ici il vit dans une incise.
 *
 * ⚠️ `cours` EST AU CONTRAT MAIS AUCUN CONTENU NE LE PRODUIT (lot 1a le refuse à
 * l'usage ; sa résolution est le lot 1b). Sa branche est écrite et couverte par un
 * test sur un objet construit à la main : c'est le seul moyen de l'exercer, et la
 * livrer non écrite obligerait le lot 1b à deviner la forme décidée aujourd'hui.
 */
export function renvoiDeTitre(
  section: AncrageDeTitre,
  seanceDuModule: number | undefined,
): string | null {
  if (section.horsCours === true) return MENTION_HORS_COURS;

  const renvoi = section.renvoiCours;
  if (renvoi === undefined) return null;

  const morceaux: string[] = [];
  if (renvoi.cours !== undefined) morceaux.push(renvoi.cours);
  if (
    renvoi.cours !== undefined ||
    seanceDuModule === undefined ||
    renvoi.seance !== seanceDuModule
  ) {
    morceaux.push(`séance${INSECABLE}${renvoi.seance}`);
  }
  const diapositives = libelleDiapositives(renvoi.diapos);
  if (diapositives !== null) morceaux.push(diapositives);

  return morceaux.length === 0 ? null : `(${morceaux.join(' · ')})`;
}
