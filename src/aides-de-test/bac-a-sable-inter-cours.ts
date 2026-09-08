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
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * L'arbre témoin COMPLET : la racine compilée/validée ET son sujet frère. Les deux moitiés sont
 * indispensables — un renvoi `{cours="php"}` ne se résout qu'en lisant un fichier de l'AUTRE
 * racine, et c'est précisément ce que ces specs mesurent.
 */
export const FIXTURE_INTER_COURS = 'tools/content-pipeline/__fixtures__/inter-cours/cours';

/**
 * Le titre témoin DÉPOUILLÉ de tout bloc d'attributs — la ligne sur laquelle chaque cas greffe le
 * sien. Les cas du marqueur `{hors-cours}` (lot 1c) n'ont pas de renvoi à écrire : ils partent de
 * celle-ci, pas de la forme annotée ci-dessous.
 */
export const TITRE_NU_INTER_COURS = '### Le VirtualHost, côté cours de PHP';

/**
 * Le titre témoin de la racine valide — la SEULE ligne que les cas de renvoi remplacent, et le
 * seul chemin passant du lot 1b.
 *
 * ⚠️ IL EST DÉRIVÉ DU TITRE NU, pas réécrit à côté : deux littéraux qui doivent se correspondre
 * finissent par diverger, et `preparerArbreInterCours` lève alors sur « la fixture a changé de
 * forme » — un message qui accuserait la fixture d'un défaut qui serait celui du harnais.
 */
export const TITRE_TEMOIN_INTER_COURS = `${TITRE_NU_INTER_COURS} {cours="php" seance="8" diapos="30-42"}`;

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

/**
 * UN DOSSIER JETABLE, ET LES DEUX GESTES QUI L’OUVRENT ET LE FERMENT.
 *
 * 🔴 POURQUOI CECI MONTE ICI (SonarCloud, lot 1c). Les deux specs du marqueur `{hors-cours}`
 * répétaient mot pour mot les dix lignes du `mkdtempSync`/`rmSync` — assez pour que le détecteur
 * de copier-coller apparie les DEUX blocs d’un bout à l’autre, causes de refus comprises. Or
 * ouvrir un dossier temporaire ne JUGE rien : c’est du recensement, et le contrat de ce fichier
 * dit depuis le lot 1b-B que le recensement se partage.
 *
 * ⚠️ CE FICHIER N’IMPORTE PAS `vitest`, DÉLIBÉRÉMENT. Rendre les deux fonctions plutôt que de
 * poser `beforeAll`/`afterAll` soi-même garde la plomberie utilisable hors d’un harnais — et
 * surtout laisse à chaque spec la maîtrise du MOMENT où son bac s’ouvre, que le dépôt exploite
 * déjà (`describe` voisins qui ouvrent chacun le leur, le précédent étant nettoyé avant).
 *
 * @param prefixe ce qui distingue le bac dans `%TEMP%` — le nom du lot, jamais un nom de cas
 */
export function bacASableInterCours(prefixe: string): {
  readonly ouvrir: () => void;
  readonly fermer: () => void;
  readonly chemin: () => string;
} {
  let bac = '';
  return {
    ouvrir: () => {
      bac = mkdtempSync(join(tmpdir(), `drjst-${prefixe}-`));
    },
    fermer: () => {
      rmSync(bac, { recursive: true, force: true });
    },
    // On LÈVE plutôt que de rendre la chaîne vide : un `join('', …)` silencieux écrirait dans le
    // dossier courant, donc dans le dépôt, et le cas suivant lirait les restes du précédent.
    chemin: () => {
      if (bac === '') throw new Error(`le bac « ${prefixe} » est lu avant son ouvrir()`);
      return bac;
    },
  };
}

/** Un cas de refus d’un bloc d’attributs de titre : ce qu’on écrit, et la cause attendue. */
export interface CasDeRefusDeTitre {
  /** Le sous-dossier du bac — chaque spec a le sien, donc les noms ne se marchent pas dessus. */
  readonly nom: string;
  /** Ce que le cas abîme, interpolé dans le nom du test par `it.each`. */
  readonly quoi: string;
  /** La ligne de titre substituée à `TITRE_TEMOIN_INTER_COURS`. */
  readonly titre: string;
  /** Le FRAGMENT de message qui distingue ce refus des autres — jamais le message entier. */
  readonly cause: string;
}

/**
 * LES TROIS REFUS DU MARQUEUR « {hors-cours} » (§3bis, lot 1c) — une seule écriture pour les DEUX
 * copies du juge.
 *
 * 🔴 CE N’EST PAS UN RELÂCHEMENT DE LA RÈGLE « CE QUI JUGE SE DUPLIQUE » — c’est son application.
 * Ce qui doit rester écrit deux fois, ce sont les REFUS eux-mêmes, dans `valider.mjs` et dans
 * `compiler-markdown.mjs` : chacun garde ses branches, et une mutation dans l’une laisse l’autre
 * verte (mesuré au lot 1c-A, 1 rouge exactement). Ici on n’écrit pas un juge, on écrit ce que le
 * contrat exige des deux — et le contrat veut la MÊME phrase des deux côtés, puisque l’auteur ne
 * sait pas lequel des deux outils l’a repoussé. Deux littéraux identiques recopiés à la main ne
 * garantissaient pas cet appariement ; celui-ci le rend vrai par construction.
 *
 * ⚠️ CHAQUE SPEC LANCE TOUJOURS SON PROPRE JUGE sur cette table. Partager l’ATTENTE ne partage
 * pas la mesure : si un seul des deux outils changeait de message, sa moitié rougirait seule.
 */
export const REFUS_DU_MARQUEUR_HORS_COURS: readonly CasDeRefusDeTitre[] = [
  {
    // ⚠️ CE QUI DISCRIMINE EST LE NOM DE LA CLEF VOISINE. « les deux se contredisent » sans nom
    // obligerait l’auteur d’un titre qui porte trois attributs à relire toute la ligne.
    nom: 'marqueur-et-renvoi',
    quoi: 'le marqueur ET un renvoi — en NOMMANT la clef trouvée à côté',
    titre: `${TITRE_NU_INTER_COURS} {hors-cours diapos="30-42"}`,
    cause: "porte le marqueur « hors-cours » ET l'attribut « diapos »",
  },
  {
    // ⚠️ DISCRIMINANT : « attribut « hors-cours » inconnu » enverrait l’auteur corriger une faute
    // de frappe dans un nom qui est, lui, parfaitement au contrat — c’est sa FORME qui est
    // fautive, et le message doit nommer la grammaire des MARQUEURS.
    nom: 'marqueur-avec-valeur',
    quoi: 'le marqueur écrit avec une valeur, sous la grammaire des MARQUEURS',
    titre: `${TITRE_NU_INTER_COURS} {hors-cours="oui"}`,
    cause: '« hors-cours » est un marqueur : il s’écrit seul, sans valeur ni guillemets',
  },
  {
    nom: 'ni-l-un-ni-l-autre',
    quoi: 'un bloc vide — en nommant LES DEUX issues, pas seulement « diapos »',
    titre: `${TITRE_NU_INTER_COURS} {}`,
    cause: 'ne renvoie à rien',
  },
];

/** Les DEUX issues que le message du bloc vide doit nommer — n’en nommer qu’une envoie l’auteur
 * inventer un renvoi là où le cours n’a rien, exactement ce que le marqueur existe pour éviter. */
export const ISSUES_DU_BLOC_VIDE: readonly string[] = [
  'citer des diapositives avec « diapos="12-18" »',
  'ou déclarer le marqueur « hors-cours »',
];
