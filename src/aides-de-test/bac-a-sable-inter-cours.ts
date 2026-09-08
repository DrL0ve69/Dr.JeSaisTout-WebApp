/**
 * LE BAC À SABLE DES REFUS INTER-COURS — la PLOMBERIE partagée des deux specs (§3bis, lot 1b-B).
 *
 * 🔴 POURQUOI CE FICHIER EXISTE, alors que ce dépôt DUPLIQUE délibérément ce qui juge. C'est
 * exactement l'arbitrage rendu au lot 1b sur `tools/content-pipeline/sujets-freres.mjs`, appliqué
 * cette fois aux specs : **la duplication est le contrat pour ce qui JUGE, jamais pour ce qui
 * RECENSE**. Les quinze causes de refus restent écrites DEUX fois — une par copie du juge, c'est
 * elles qui doivent s'apparier. Mais « copier l'arbre témoin et muter une ligne » ne juge rien :
 * c'est du recensement, et deux copies n'y ajoutent aucune garantie.
 *
 * ⚠️ CE N'EST PAS QU'UNE QUESTION DE LIGNES ÉCONOMISÉES. SonarCloud a rougi sur ces 15 lignes
 * (6,1 % de duplication sur le code neuf, seuil 3 %) et il avait raison, pour la raison que le lot
 * 1b avait déjà écrite : si les deux harnais divergeaient — un titre témoin retouché d'un côté, un
 * chemin de fixture de l'autre — chaque spec construirait un arbre légèrement différent et
 * rendrait la BONNE cause pour l'arbre qu'il a construit. Une seule source est ici plus forte que
 * deux. ⚠️ Nuance honnête, à ne pas gommer : contrairement au balayage de production, cette
 * divergence-ci ne serait pas totalement silencieuse (chaque spec épingle une cause précise et
 * lève si sa mutation ne mord pas). C'est « plus sûr et moins cher », pas « la seule option
 * correcte ».
 *
 * 🔴 POURQUOI SOUS `src/aides-de-test/` ET PAS AILLEURS — la frontière que ce chemin déplace.
 * `tsconfig.app.json` inclut `src/**` en n'excluant QUE `*.spec.ts`, et porte `"types": []` pour
 * qu'aucune API Node ne soit atteignable depuis un composant (elle casserait le prerender). Un
 * helper Node posé n'importe où ailleurs sous `src/` entrerait donc dans le programme de
 * l'APPLICATION. Ce dossier est nommément **exclu** de `tsconfig.app.json` et nommément **inclus**
 * dans `tsconfig.spec.json` ; `src/configuration-typescript.spec.ts` tient les deux moitiés — sans
 * quoi retirer l'exclusion laisserait `npm test` vert et casserait `ng build` un lot plus tard
 * (L-005, patron déjà payé sur l'entrée du contrat de contenu).
 */
import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * L'arbre témoin COMPLET : la racine compilée/validée ET son sujet frère. Les deux moitiés sont
 * indispensables — un renvoi `{cours="php"}` ne se résout qu'en lisant un fichier de l'AUTRE
 * racine, et c'est précisément ce que ces specs mesurent.
 */
export const FIXTURE_INTER_COURS = 'tools/content-pipeline/__fixtures__/inter-cours/cours';

/**
 * Le titre témoin de la racine valide — la SEULE ligne que les cas de renvoi remplacent, et le
 * seul chemin passant du lot 1b.
 */
export const TITRE_TEMOIN_INTER_COURS =
  '### Le VirtualHost, côté cours de PHP {cours="php" seance="8" diapos="30-42"}';

/** Le code de cours que l'horaire du frère déclare — jamais écrit dans le `lecon.md` (S-026). */
export const CODE_DU_COURS_FRERE = '420-4P2-HU';

/** La mutation d'un cas : le titre de section, l'horaire du frère, ou les deux. */
export interface MutationInterCours {
  readonly titre?: string;
  readonly horaire?: string;
}

/**
 * Copie l'arbre témoin dans le bac à sable, applique LA mutation du cas, et rend le chemin de la
 * racine à compiler ou à valider.
 *
 * 🔴 LA MUTATION EST VÉRIFIÉE AVANT D'ÊTRE MESURÉE (L-015). Les fins de ligne de ce dépôt sont
 * mixtes ; un remplacement qui ne mordrait pas laisserait l'arbre VALIDE, et le `throw` que
 * l'appelant émet quand le cas est accepté accuserait le garde-fou d'un défaut qui serait celui du
 * harnais. On lève donc ici, sur l'absence du titre témoin — c'est-à-dire sur la fixture qui
 * aurait changé de forme, qui est la vraie cause.
 *
 * @param bac le dossier jetable de l'appelant (`mkdtempSync`)
 * @param nom le nom du cas, qui devient le sous-dossier et apparaît dans les messages d'erreur
 * @param mutation ce que le cas abîme
 * @returns le chemin de la racine `securite-web` mutée
 */
export function preparerArbreInterCours(
  bac: string,
  nom: string,
  mutation: MutationInterCours,
): string {
  const arbre = join(bac, nom);
  cpSync(FIXTURE_INTER_COURS, arbre, { recursive: true });

  if (mutation.titre !== undefined) {
    const fichier = join(arbre, 'securite-web', '01-temoin', 'lecon.md');
    const source = readFileSync(fichier, 'utf8');
    if (!source.includes(TITRE_TEMOIN_INTER_COURS)) {
      throw new Error(`« ${nom} » : le titre témoin est introuvable — la fixture a changé de forme`);
    }
    writeFileSync(fichier, source.replace(TITRE_TEMOIN_INTER_COURS, mutation.titre), 'utf8');
  }

  if (mutation.horaire !== undefined) {
    writeFileSync(join(arbre, 'php', 'horaire.json'), mutation.horaire, 'utf8');
  }

  return join(arbre, 'securite-web');
}

/**
 * Rend le texte d'un `horaire.json` de frère muté, en partant du fichier RÉEL.
 *
 * ANTI-VACUITÉ : le code témoin est confronté à sa valeur attendue AVANT d'être remplacé. S'il
 * cessait d'être conforme, la mutation ne prouverait plus rien — on mesurerait un horaire déjà
 * refusé pour une autre raison que celle qu'on croit tester.
 */
export function horaireDuFrereMute(muter: (donnees: Record<string, unknown>) => void): string {
  const brut = readFileSync(join(FIXTURE_INTER_COURS, 'php', 'horaire.json'), 'utf8');
  const donnees = JSON.parse(brut) as Record<string, unknown>;
  const cours = donnees['cours'] as { code?: string } | undefined;
  if (cours?.code !== CODE_DU_COURS_FRERE) {
    throw new Error(`le code témoin a changé : « ${String(cours?.code)} »`);
  }
  muter(donnees);
  return JSON.stringify(donnees, null, 2);
}
