// =============================================================================
// compterLignes — LA DÉFINITION DE RÉFÉRENCE du nombre de lignes d'un extrait, pour QUATRE appelants
// -----------------------------------------------------------------------------
// POURQUOI CE FICHIER EXISTE, ET POURQUOI IL EST SI PETIT.
// Quatre garde-fous bornent quelque chose au nombre de lignes d'un extrait de code, et ils
// doivent compter PAREIL, sans quoi l'un accepte ce que l'autre refuse :
//   · `lirePortee` (`compiler-markdown.mjs`) REFUSE `{lignes="6"}` sur un extrait de cinq lignes ;
//   · `verifierAncres` (`compiler-markdown.mjs`) EXIGE au moins autant d'ancres que de lignes ;
//   · `verifierQuestionTrouverLaFaille` (`valider.mjs`) REFUSE une `ligneFautive` hors de l'extrait ;
//   · `decouperLignesDeCode` (`src/app/features/cours/quiz/quiz.ts`) DÉCOUPE les lignes que le
//     quiz `trouver-la-faille` affiche en radios — donc le compte que le visiteur peut désigner.
//
// 🔴 LE QUATRIÈME N'IMPORTE PAS CE FICHIER, ET IL NE LE PEUT PAS. `tools/**` et `src/**` sont
// deux programmes TypeScript distincts (en-tête de `tsconfig.tools.json`) : un composant Angular
// qui importerait ce module le ferait entrer dans son bundle. C'est donc une COPIE, nommée comme
// telle au point de copie, et la duplication est tenue HONNÊTE par un contrôle de parité —
// `src/compter-lignes-parite.spec.ts` fait compter un corpus piégeux par les deux exemplaires
// (celui-ci par processus fils) et exige l'égalité cas par cas. Le patron est celui de
// `clefIndiscernable` / `src/clef-indiscernable-parite.spec.ts`. Un commentaire « la même
// formule que… » ne garde rien (L-008) : c'est exactement la dette payée deux fois ci-dessous.
//
// 🔴 LE TROISIÈME COMPTAIT AUTREMENT, ET C'EST LA DETTE QUE CE FICHIER PAIE (E2-ST4, lot B).
// Le validateur bornait avec `code.split('\n').length` — ni retrait du saut final, ni `\r?`. Sur
// un `code` de quiz terminé par un saut de ligne, il acceptait donc `ligneFautive = N+1` : la
// ligne VIDE finale, que personne ne peut désigner dans l'interface, et que le compilateur, lui,
// aurait refusée. Deux comptages recopiés avaient divergé d'une ligne, en silence, chacun vert de
// son côté. La parade n'est pas de recopier la bonne formule une troisième fois : c'est qu'il n'y
// ait plus qu'une formule à recopier.
//
// 🔴 ET LE QUATRIÈME COMPTAIT AUTREMENT AUSSI — la revue du lot B l'a trouvé sur le chemin du
// RENDU, où la dette se voyait à l'écran : `question.code.split('\n')` donnait au quiz une radio
// fantôme « Ligne N+1 », libellé vide, sélectionnable et toujours fausse, dès qu'un `code` se
// terminait par un saut de ligne. La leçon générale de ces deux passes : une dette de comptage ne
// se solde pas en déclarant le nombre d'appelants, elle se solde en les CHERCHANT.
//
// POURQUOI UN MODULE À PART, ET NON UN EXPORT DE `compiler-markdown.mjs`.
// Le validateur tourne AVANT le compilateur et n'en dépend pas — c'est l'ordre du pipeline
// (`build.mjs` : valider, puis compiler). L'importer depuis `valider.mjs` ferait charger Shiki,
// markdown-it et leurs plugins au démarrage du validateur, et inverserait une dépendance que la
// stratification du pipeline pose exprès dans l'autre sens.
//
// Ce fichier entre NOMINATIVEMENT dans `tsconfig.tools.json`, dans le même diff que sa création :
// un fichier d'outillage hors du programme de types n'est vérifié par rien (L-014/L-020).
// =============================================================================

/**
 * Combien de lignes ce code compte-t-il ?
 *
 * Deux détails de la formule, parce qu'ils répondent à deux besoins différents : markdown-it
 * termine TOUJOURS le contenu d'une clôture par un saut de ligne, et le compter donnerait une
 * ligne fantôme — le `replace` le retire, et ne fait simplement RIEN sur le `code` d'un quiz écrit
 * sans saut final. Le `\r?`, lui, n'a rien à voir avec ça : il couvre les fins de ligne CRLF de ce
 * poste (L-015), qui feraient sinon compter une ligne de plus dans un `quiz.json` enregistré ici.
 *
 * @param {string} code
 * @returns {number} 0 pour une chaîne vide — un extrait sans ligne n'a aucune ligne adressable
 */
export function compterLignes(code) {
  const sansFin = code.replace(/\r?\n$/, '');
  return sansFin === '' ? 0 : sansFin.split(/\r?\n/).length;
}
