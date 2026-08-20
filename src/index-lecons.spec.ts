// =============================================================================
// L'INDEX DES LEÇONS DIT-IL LA VÉRITÉ SUR LES PLAGES QU'IL ANNONCE ?
// -----------------------------------------------------------------------------
// POURQUOI CE FICHIER EXISTE. Le 2026-08-20, le préambule permanent d'un sous-agent a été mesuré à
// ~74 000 tokens, dont 51 600 pour les deux corpus de leçons que six définitions d'agents faisaient
// lire EN ENTIER. La parade est `.claude/lessons/INDEX.md` : une table qui donne, par entrée, son
// identifiant, son sujet et sa PLAGE DE LIGNES, pour qu'un agent ouvre 2-4 entrées par
// `Read(fichier, offset, limit)` au lieu d'un fichier de 33 600 tokens.
//
// 🔴 LE MODE D'ÉCHEC, ET IL EST SILENCIEUX. L'index est GÉNÉRÉ. Ajouter, fusionner ou élaguer une
// entrée décale toutes les plages suivantes — et un `mentor` qui oublie `npm run lecons:index`
// laisse un index qui envoie chaque agent lire LE MAUVAIS PASSAGE. Rien ne rougirait : l'agent
// recevrait un texte plausible, sur un sujet voisin, et l'appliquerait. Un index qui ment coûte
// plus cher que pas d'index du tout, et c'est exactement la famille L-008/L-016 — une garantie qui
// ne vit que dans une consigne écrite ne garantit rien.
//
// ⚠️ CE QU'ON VÉRIFIE, ET POURQUOI PAS AUTRE CHOSE. On ne compare PAS l'octet près à ce que le
// générateur reproduirait : ce serait vérifier qu'un outil est d'accord avec lui-même (L-012). On
// vérifie la PROPRIÉTÉ qui compte, contre le corpus lui-même comme seconde source :
//   (a) chaque plage annoncée commence RÉELLEMENT sur le titre de l'entrée qu'elle nomme ;
//   (b) aucune entrée du corpus ne manque à l'index — sans quoi il rétrécirait en silence, et
//       l'agent conclurait à l'absence d'une leçon qui existe (famille L-046) ;
//   (c) chaque plage FINIT là où la suivante commence, et la dernière au bout du corpus. C'est
//       la moitié qui manquait au 2026-08-20 : seul `fin >= debut` était vérifié, alors qu'un
//       ajout DANS la dernière entrée ne décale aucun `debut` — l'index restait vert en
//       annonçant une plage tronquée, et l'agent lisait une leçon amputée.
// =============================================================================

import { existsSync, readFileSync } from 'node:fs';

const INDEX = '.claude/lessons/INDEX.md';

/** Les deux corpus indexés, et le motif de titre d'une entrée dans chacun. */
const CORPUS = [
  { fichier: '.claude/lessons/lessons-learned.md', prefixe: 'L' },
  { fichier: '.claude/lessons/security-lessons.md', prefixe: 'S' },
] as const;

/** Une ligne de table de l'index : `| L-001 | 31–60 | … |` (tiret demi-cadratin U+2013). */
const LIGNE_INDEX = /^\|\s*([LS]-\d+)\s*\|\s*(\d+)–(\d+)\s*\|/;

/** Les lignes d'un fichier, en tolérant le CRLF de ce poste (L-015). */
function lignes(chemin: string): readonly string[] {
  return readFileSync(chemin, 'utf8').split(/\r?\n/);
}

/** Une entrée telle que l'index la DÉCLARE — code, et plage de lignes en base 1. */
interface EntreeDeclaree {
  readonly code: string;
  readonly debut: number;
  readonly fin: number;
}

/**
 * Les entrées que l'index déclare.
 *
 * 🔴 LA LECTURE EST PARESSEUSE, ET C'EST UN CORRECTIF (2026-08-20). Elle vivait dans
 * le corps du `describe`, donc elle s'exécutait à la COLLECTE : un `INDEX.md` absent
 * faisait lever `readFileSync` avant qu'aucun test ne démarre, et le message soigné
 * du filet ci-dessous — « il est généré, lancez `npm run lecons:index` » — n'était
 * jamais affiché. Une assertion qu'un plantage antérieur rend inatteignable est une
 * assertion morte : elle coûte sa maintenance et ne dit rien le jour venu.
 */
function entreesDeclarees(): readonly EntreeDeclaree[] {
  if (!existsSync(INDEX)) return [];
  return lignes(INDEX)
    .map((ligne) => LIGNE_INDEX.exec(ligne))
    .filter((trouve): trouve is RegExpExecArray => trouve !== null)
    .map((trouve) => ({
      code: trouve[1] ?? '',
      debut: Number(trouve[2]),
      fin: Number(trouve[3]),
    }));
}

describe('l’index des leçons (.claude/lessons/INDEX.md)', () => {
  // Filet propre (L-019) : sans lui, un index disparu rendrait tout ce qui suit VERT en n'ayant
  // rien mesuré — précisément le gate vide que ce dépôt combat.
  it('existe et déclare des entrées', () => {
    expect(
      existsSync(INDEX),
      `${INDEX} est absent. Il est généré : \`npm run lecons:index\`. Sans lui, chaque sous-agent ` +
        `retombe sur les corpus entiers — 51 600 tokens de plancher au lieu de 3 900.`,
    ).toBe(true);
    expect(
      lignes(INDEX).filter((ligne) => LIGNE_INDEX.test(ligne)).length,
      `${INDEX} ne déclare aucune entrée : le format de table a changé, ou la génération a échoué ` +
        `en silence (elle l'a déjà fait une fois, sur le CRLF — L-015).`,
    ).toBeGreaterThan(0);
  });

  it.each(CORPUS)('fait pointer chaque plage de $fichier sur son vrai titre', ({ fichier, prefixe }) => {
    const corpus = lignes(fichier);
    const pour = entreesDeclarees().filter((entree) => entree.code.startsWith(`${prefixe}-`));
    expect(pour.length, `aucune entrée « ${prefixe}-… » dans l'index`).toBeGreaterThan(0);

    for (const { code, debut, fin } of pour) {
      // `debut` est en base 1 dans l'index, comme ce que `Read(offset)` attend.
      const titre = corpus[debut - 1] ?? '';
      expect(
        titre.startsWith(`## ${code}`),
        `${INDEX} annonce ${code} aux lignes ${String(debut)}–${String(fin)} de ${fichier}, mais la ` +
          `ligne ${String(debut)} est « ${titre.slice(0, 70)} ». Les plages ont DÉCALÉ : le corpus a ` +
          `été édité sans « npm run lecons:index ». Un agent qui suit cet index lit le mauvais ` +
          `passage sans que rien ne rougisse — régénérer, puis relire ce diff.`,
      ).toBe(true);
      expect(fin, `${code} : plage vide ou inversée`).toBeGreaterThanOrEqual(debut);
    }
  });

  // ---------------------------------------------------------------------------
  // 🔴 LA FIN DE PLAGE, CONFRONTÉE AU CORPUS — le trou du 2026-08-20
  // ---------------------------------------------------------------------------
  // Le test ci-dessus ne vérifiait de `fin` qu'une chose : `fin >= debut`. Or c'est
  // `fin` qui borne le `Read(offset, limit)` de l'agent. Le mode d'échec est SILENCIEUX
  // et il n'est pas théorique : ajouter des lignes À L'INTÉRIEUR de la DERNIÈRE entrée
  // d'un corpus ne décale AUCUN `debut`. Toutes les assertions de titre restent vertes,
  // et l'index continue d'annoncer une plage TRONQUÉE — l'agent lit une leçon amputée
  // de sa moitié la plus récente, celle qu'on vient justement d'écrire, et il en tire
  // une conclusion partielle sans que rien ne rougisse. C'est exactement le mode
  // d'échec que l'en-tête de ce fichier revendique fermer.
  //
  // La convention à confronter est celle que POSE `.claude/hooks/generer-index-lecons.mjs` :
  // la fin d'une entrée est la ligne qui précède le titre de la suivante
  // (`fin_k = debut_{k+1} − 1`), et la dernière va jusqu'au bout du corpus
  // (`fin_dernier = nombre de lignes`, avec le même découpage `/\r?\n/` des deux côtés).
  // On ne recalcule PAS l'index avec le générateur — ce serait vérifier qu'un outil est
  // d'accord avec lui-même (L-012) : on confronte les plages au CORPUS.
  it.each(CORPUS)('fait finir chaque plage de $fichier là où la suivante commence', ({ fichier, prefixe }) => {
    const corpus = lignes(fichier);
    const pour = entreesDeclarees().filter((entree) => entree.code.startsWith(`${prefixe}-`));
    expect(pour.length, `aucune entrée « ${prefixe}-… » dans l'index`).toBeGreaterThan(0);

    for (let index = 0; index < pour.length - 1; index++) {
      const entree = pour[index];
      const suivante = pour[index + 1];
      if (entree === undefined || suivante === undefined) continue;
      expect(
        entree.fin,
        `${INDEX} donne à ${entree.code} la plage ${String(entree.debut)}–${String(entree.fin)}, ` +
          `alors que ${suivante.code} commence ligne ${String(suivante.debut)} de ${fichier}. La fin ` +
          `attendue est ${String(suivante.debut - 1)} : trop courte, l'agent lit une entrée AMPUTÉE ` +
          `(et rien d'autre ne le dirait — les débuts, eux, sont justes) ; trop longue, il lit ` +
          `l'entrée suivante par-dessus. Régénérer : « npm run lecons:index ».`,
      ).toBe(suivante.debut - 1);
    }

    // La DERNIÈRE va jusqu'au bout du corpus. C'est elle que le mode d'échec ci-dessus
    // vise : c'est dans la dernière entrée qu'un `mentor` ajoute du texte, et c'est la
    // seule dont la fin ne soit bornée par aucun début suivant.
    const derniere = pour[pour.length - 1];
    expect(derniere, `aucune dernière entrée « ${prefixe}-… »`).toBeDefined();
    if (derniere !== undefined) {
      expect(
        derniere.fin,
        `${INDEX} arrête ${derniere.code} — la DERNIÈRE entrée de ${fichier} — à la ligne ` +
          `${String(derniere.fin)}, alors que le corpus en compte ${String(corpus.length)}. Du texte ` +
          `a été ajouté DANS la dernière entrée sans régénérer l'index : aucun « début » n'a bougé, ` +
          `donc aucune autre assertion ne le voit, et l'agent lit une leçon TRONQUÉE.`,
      ).toBe(corpus.length);
    }
  });

  it.each(CORPUS)('n’omet aucune entrée de $fichier', ({ fichier, prefixe }) => {
    const dansLeCorpus = lignes(fichier)
      .map((ligne) => new RegExp(`^##\\s+(${prefixe}-\\d+)`).exec(ligne)?.[1])
      .filter((code): code is string => code !== undefined);
    const dansLIndex = entreesDeclarees()
      .filter((entree) => entree.code.startsWith(`${prefixe}-`))
      .map((entree) => entree.code);

    expect(dansLeCorpus.length, `${fichier} ne porte aucune entrée « ${prefixe}-… »`).toBeGreaterThan(0);
    expect(
      dansLeCorpus.filter((code) => !dansLIndex.includes(code)),
      `${fichier} porte des entrées ABSENTES de l'index : un agent qui s'y fie conclurait à leur ` +
        `inexistence (famille L-046 — un contrôle d'exhaustivité ne vaut que pour le corpus qu'on ` +
        `lui donne). Régénérer avec « npm run lecons:index ».`,
    ).toEqual([]);
  });
});
