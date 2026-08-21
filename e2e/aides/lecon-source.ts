// =============================================================================
// LE DOSSIER SOURCE DE LA LEÇON MESURÉE — la recherche, en UN seul endroit
// -----------------------------------------------------------------------------
// POURQUOI CE FICHIER EXISTE (2026-08-21, E3-ST2/E3-ST3). `quiz-source.ts` portait
// cette recherche pour le quiz. La leçon « 03-injection » publie la PREMIÈRE
// simulation du dépôt, et `simulation.ts` a exactement le même besoin : retrouver,
// à partir du `slug` que l'artéfact prerend, le dossier de `content/` qui le
// déclare — pour lire ce que l'AUTEUR a écrit, et non ce que le DOM affiche.
//
// 🔴 ON NE RECOPIE PAS LA RECHERCHE, ET L'EN-TÊTE DE `quiz-source.ts` DIT POURQUOI :
// cette lecture y avait déjà vécu en TROIS exemplaires, et les trois avaient
// divergé sur le contrat qu'ils lisaient (famille L-016/L-034). Une quatrième copie
// pour la simulation aurait été la même faute, commise en connaissance de cause.
//
// ⚠️ CE FICHIER N'EST PAS UN SPEC. Il ne s'assertionne pas lui-même ; il rend
// `undefined` quand il ne trouve pas, et c'est à l'appelant de LEVER en se nommant.
// Il est épinglé nominativement dans `src/configuration-typescript.spec.ts` (L-034)
// pour la même raison que ses cinq voisins : un défaut de typage y serait invisible
// depuis les appelants et ferait passer VERTS les gates de la page de leçon.
// =============================================================================

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Les deux racines où une leçon peut être RÉDIGÉE. La seconde est la fixture
 * témoin : `--racine tools/content-pipeline/__fixtures__/temoin/…` reste une façon
 * légitime de bâtir l'artéfact en local, et les specs doivent s'y mesurer aussi.
 * L'ordre compte : `content/` d'abord, la fixture en repli.
 */
export const RACINES_CONTENU = [
  'content/cours/securite-web',
  'tools/content-pipeline/__fixtures__/temoin/cours/securite-web',
] as const;

/** Le `slug` déclaré au frontmatter d'un `lecon.md`, ou `''` s'il n'en porte pas. */
function slugDeclare(cheminLecon: string): string {
  // Le frontmatter est le premier bloc encadré de `---`. `\r?\n` parce que les fins
  // de ligne de ce poste sont mixtes (L-015).
  const brut = readFileSync(cheminLecon, 'utf8');
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(brut)?.[1] ?? '';
  return (/^slug:[ \t]*(.*)$/m.exec(frontmatter)?.[1] ?? '').trim().replace(/^["']|["']$/g, '');
}

/**
 * Le dossier source qui PUBLIE ce slug-là, sous une racine donnée.
 *
 * 🔴 ON LIT LE FRONTMATTER, ON NE DEVINE PAS LE NOM DU DOSSIER (correctif du
 * 2026-08-20). Les copies précédentes retiraient `^\d+-` du nom de dossier et
 * appariaient là-dessus — or `content/…/01-fondamentaux/` publie la route
 * `fondamentaux` par son champ `slug:`, et rien n'oblige le dossier à porter le
 * slug. Le jour où un auteur écrit `slug: fondamentaux-du-web` dans `02-bases/`,
 * la devinette ferait rougir les specs sur un produit parfaitement sain (L-035).
 */
function dossierQuiPublie(racine: string, slug: string): string | undefined {
  if (!existsSync(racine)) return undefined;

  for (const entree of readdirSync(racine, { withFileTypes: true })) {
    if (!entree.isDirectory()) continue;
    const lecon = join(racine, entree.name, 'lecon.md');
    if (!existsSync(lecon)) continue;
    const declare = slugDeclare(lecon);
    // Un `slug:` absent donne `''` : on refuse de l'apparier, sinon une leçon sans
    // frontmatter complet capterait n'importe quelle recherche vide.
    if (declare !== '' && declare === slug) return entree.name;
  }
  return undefined;
}

/**
 * Le chemin du fichier `nom` (`quiz.json`, `simulation.json`…) de la leçon qui
 * déclare ce `slug`, ou `undefined` si aucune racine ne la porte — ou si elle la
 * porte sans ce fichier-là (une leçon sans simulation est parfaitement légale).
 */
export function fichierSourceDeLaLecon(slug: string, nom: string): string | undefined {
  for (const racine of RACINES_CONTENU) {
    const dossier = dossierQuiPublie(racine, slug);
    if (dossier === undefined) continue;

    const chemin = join(racine, dossier, nom);
    if (existsSync(chemin)) return chemin;
    // 🔴 ON CONTINUE, ON N'ABANDONNE PAS À LA PREMIÈRE RACINE (revue du 2026-08-21).
    // Rendre `undefined` ici ferait diverger cette fonction de `laLeconEstDeclaree`,
    // qui balaie les DEUX racines : `content/` déclarant un slug sans son
    // `simulation.json` pendant que la fixture déclare le même slug AVEC suffisait à
    // faire accuser une divergence inexistante. Les deux lectures balaient donc le
    // même espace, et « première racine qui porte le fichier » est la règle.
  }
  return undefined;
}

/**
 * Vrai dès qu'une racine déclare ce slug — indépendamment des fichiers qu'il porte.
 *
 * Sert à DISTINGUER les deux échecs que `fichierSourceDeLaLecon` confond en un
 * `undefined` : « la leçon prerendue n'existe dans aucune racine » (frontmatter et
 * manifeste ont divergé) et « elle existe, sans ce fichier ». Les deux appellent
 * des messages différents ; un appelant qui ne les sépare pas accuserait le
 * mauvais coupable.
 */
export function laLeconEstDeclaree(slug: string): boolean {
  return RACINES_CONTENU.some((racine) => dossierQuiPublie(racine, slug) !== undefined);
}
