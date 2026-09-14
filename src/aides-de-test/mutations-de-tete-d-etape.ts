// =============================================================================
// LE CORPUS DES MUTATIONS DE TÊTE D'ÉTAPE — partagé par les DEUX juges
// -----------------------------------------------------------------------------
// 🔴 POURQUOI CE FICHIER EXISTE : L-095, APPLIQUÉE À LA LETTRE. La règle du dépôt
// est que ce qui JUGE se duplique et s'apparie — le validateur et le compilateur
// gardent chacun sa lecture de tête, et les specs confrontent leurs messages, ce
// qui est la parade au motif « l'aval refuse, l'amont laisse passer » (S-010).
// Mais L-095 pose la question suivante, et c'est elle qui tranche ici :
// **quelle moitié du bloc dupliqué JUGE, et quelle moitié RECENSE ?**
//
// Une TABLE DE MUTATIONS ne juge rien. C'est un recensement : « voici les huit
// façons d'écrire une tête d'étape fautive ». Recopiée dans les deux specs, elle
// pouvait DIVERGER en silence — une mutation ajoutée d'un côté et pas de l'autre
// laissait un juge non mesuré sans qu'aucun appariement de messages ne rougisse,
// puisque chaque copie rendait la bonne cause pour la population qu'elle avait.
// C'est exactement le mode d'échec que L-095 décrit sur le registre des sujets
// frères. Le recensement se PARTAGE donc, et une seule source y est plus forte
// que deux.
//
// ⚠️ CE QUI RESTE DANS CHAQUE SPEC, ET QUI NE DOIT JAMAIS MONTER ICI : les
// FRAGMENTS DE MESSAGE attendus. Ce sont eux qui jugent, eux qui distinguent une
// branche d'une autre, et eux qui doivent être écrits deux fois pour que les deux
// copies du juge soient épinglées séparément. Un fichier qui porterait les causes
// ferait des deux specs un seul test déguisé en deux.
//
// ⚠️ ET LE CORPUS EST EXHAUSTIF PAR CONSTRUCTION : chaque spec lève sur une
// mutation dont il n'a pas déclaré la cause attendue. Ajouter une entrée ici
// FORCE donc les deux juges à dire ce qu'ils en font — ce qu'une table recopiée
// ne pouvait pas exiger.
//
// Précédent du même dossier, à citer plutôt qu'à redécouvrir :
// `tools/content-pipeline/sujets-freres.mjs`.
// =============================================================================

/** Une mutation d'une seule ligne — la ligne d'étape, privée de son numéro. */
export interface MutationDeTete {
  /** Le sous-dossier jetable du bac à sable, et la clé de la cause attendue. */
  readonly nom: string;
  /** Ce que le cas éprouve, pour le libellé du `it`. */
  readonly quoi: string;
  /** Le corps de l'étape — ce qui suit « N. ». */
  readonly corps: string;
}

/**
 * Les huit mutations de tête, construites autour d'un renvoi VALIDE dans le contexte de l'appelant.
 *
 * 🔴 LE RENVOI EST UN PARAMÈTRE, ET C'EST NÉCESSAIRE : le cas `valeur-non-citee` fait précéder le
 * bloc fautif d'une tête PARFAITEMENT formée, et cette tête doit viser une cible qui existe VRAIMENT
 * dans la fixture de l'appelant. Un renvoi introuvable y ajouterait une SECONDE cause, et le contrat
 * « un cas = une cause » — celui qui empêche une cause parasite de masquer la disparition de celle
 * qu'on mesure — tomberait sans que rien ne le dise.
 *
 * @param renvoiValide une cible de `{voir="…"}` qui se résout dans la fixture de l'appelant
 */
export function mutationsDeTete(renvoiValide: string): readonly MutationDeTete[] {
  return [
    {
      nom: 'voie-vide',
      quoi: 'une voie VIDE — elle ne désigne rien, et le dire vaut mieux que l’ignorer',
      corps: '{voie=""} Relire le journal.',
    },
    {
      // 🔴 LE CŒUR DE LA LISTE FERMÉE : le refus doit ÉNUMÉRER. Sans cette branche, un garde-fou
      // qui refuserait TOUTE voie passerait le test — y compris sur les deux valeurs admises.
      nom: 'voie-hors-liste',
      quoi: 'une voie HORS de la liste fermée, en énumérant les deux admises',
      corps: '{voie="ancienne"} Relire le journal.',
    },
    {
      nom: 'deux-voies',
      quoi: 'DEUX voies sur la même étape',
      corps: '{voie="cours"} {voie="moderne"} Relire le journal.',
    },
    {
      // La voie est SYNTAXIQUEMENT juste et sa valeur est admise : seule sa POSITION pèche.
      nom: 'voie-pas-en-tete',
      quoi: 'une voie valide mais posée AU MILIEU de la phrase',
      corps: 'Relire le journal {voie="cours"} sans tarder.',
    },
    {
      nom: 'nom-de-tete-inconnu',
      quoi: 'un NOM d’attribut de tête inconnu, en énumérant les noms admis',
      corps: '{couleur="ambre"} Relire le journal.',
    },
    {
      // 🔴 LA FAUTE DE FRAPPE D'UN SEUL CARACTÈRE. `voir` et `voie` ne diffèrent que d'une lettre :
      // `{voi="…"}` doit se NOMMER, jamais tomber ni dans un silence ni dans « le renvoi n'est pas
      // en tête », qui enverrait l'auteur corriger une position parfaitement juste.
      nom: 'voi-faute-de-frappe',
      quoi: 'la faute de frappe « voi » — elle se NOMME, elle ne passe pas en silence',
      corps: '{voi="cours"} Relire le journal.',
    },
    {
      nom: 'voire-faute-de-frappe',
      quoi: 'la faute de frappe « voire »',
      corps: `{voire="${renvoiValide}"} Relire le journal.`,
    },
    {
      // 🔴 LE JUMEAU DU CAS POSITIF « accolade nue ». Le correctif restreint le refus à ce qui
      // RESSEMBLE à un bloc d'attributs ; il doit donc TOUJOURS mordre sur une valeur non citée,
      // y compris quand une tête PARFAITEMENT formée la précède — la position même où le sur-refus
      // corrigé se tenait.
      nom: 'valeur-non-citee',
      quoi: 'une valeur NON CITÉE dans un second bloc, après une tête valide',
      corps: `{voir="${renvoiValide}"} {voie=cours} Relire le journal.`,
    },
  ];
}

/**
 * Apparie le corpus aux causes attendues du juge de l'appelant, et LÈVE sur une mutation orpheline.
 *
 * 🔴 C'EST LA MOITIÉ QUI REND LE CORPUS EXHAUSTIF. Sans elle, une entrée ajoutée ici serait
 * simplement ignorée par le spec qui ne l'aurait pas déclarée : le partage aurait remplacé une
 * divergence silencieuse par une autre. La levée est volontairement une erreur de construction de
 * table, pas un `expect` — elle doit tomber avant qu'un seul cas ne s'exécute.
 *
 * @param renvoiValide une cible de `{voir="…"}` qui se résout dans la fixture de l'appelant
 * @param numero le numéro de l'étape mutée, tel qu'il s'écrit dans la fixture
 * @param attendus les fragments attendus, un par `nom` du corpus
 */
export function refusDeTete<T>(
  renvoiValide: string,
  numero: number,
  attendus: Readonly<Record<string, T>>,
): readonly (MutationDeTete & { readonly etape: string; readonly attendu: T })[] {
  return mutationsDeTete(renvoiValide).map((mutation) => {
    const attendu = attendus[mutation.nom];
    if (attendu === undefined) {
      throw new Error(
        `« ${mutation.nom} » est au corpus des mutations de tête mais ce juge n’en déclare aucune cause attendue`,
      );
    }
    return { ...mutation, etape: `${numero}. ${mutation.corps}`, attendu };
  });
}
