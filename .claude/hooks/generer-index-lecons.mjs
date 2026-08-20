#!/usr/bin/env node
/**
 * Génère `.claude/lessons/INDEX.md` — la table de routage des deux corpus de leçons.
 *
 * 🔴 POURQUOI CE FICHIER EXISTE, ET C'EST UNE MESURE, PAS UNE INTUITION (2026-08-20).
 * Le préambule permanent d'un sous-agent a été mesuré à **~74 000 tokens** avant qu'il n'ait lu
 * une seule ligne de code du lot qu'on lui confie. Sa moitié la plus lourde vient des deux corpus
 * de leçons, qui grossissent à CHAQUE cycle et ne rétrécissent jamais :
 *   · `.claude/lessons/lessons-learned.md`  ~33 600 tokens (L-001 → L-063)
 *   · `.claude/lessons/security-lessons.md` ~18 000 tokens (S-001 → S-022)
 * Six définitions d'agents disaient « lis `lessons-learned.md` » — donc 33 600 tokens dépensés
 * pour, en pratique, deux ou trois entrées pertinentes. Le `SessionStart` injectait déjà un index,
 * mais (a) il ne portait AUCUN numéro de ligne, donc un agent ne pouvait pas lire une entrée sans
 * ouvrir le fichier entier, et (b) rien ne garantit qu'un sous-agent reçoive la sortie du hook.
 *
 * CE QUE CET INDEX CHANGE. Il tient sur ~1 500 tokens, il vit SUR LE DISQUE (donc il est lisible
 * par n'importe quel agent, hook ou pas), et chaque entrée porte sa PLAGE DE LIGNES : un agent
 * lit l'index, choisit ses deux ou trois leçons, et les ouvre avec un `Read` borné par
 * `offset`/`limit`. Économie mesurée : ~30 000 tokens par sous-agent qui lisait le corpus général.
 *
 * ⏳ FRAÎCHEUR. Régénéré à chaque `SessionStart` (par `inject-context.mjs`) et par
 * `npm run lecons:index`. Les agents `mentor` et `security-mentor` l'appellent en dernier geste,
 * après avoir édité un corpus — sinon les plages de lignes mentiraient dès la première leçon
 * ajoutée, et un index qui ment coûte plus cher que pas d'index du tout.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = process.env['CLAUDE_PROJECT_DIR'] ?? join(ici, '..', '..');
const dossier = join(racine, '.claude', 'lessons');

/** Les deux corpus indexés, avec le motif de titre d'une entrée. */
const CORPUS = [
  {
    fichier: 'lessons-learned.md',
    motif: /^##\s+(L-\d+)\s*·?\s*(.*)$/,
    titre: 'Leçons générales (L-0xx) — conception, tests, CI, méthode',
  },
  {
    fichier: 'security-lessons.md',
    motif: /^##\s+(S-\d+)\s*·?\s*(.*)$/,
    titre: 'Leçons de sécurité (S-0xx) — CSP, assainissement, chaîne de build',
  },
];

/**
 * Les entrées d'un corpus, avec la plage de lignes de chacune.
 *
 * @param {string} contenu
 * @param {RegExp} motif
 * @returns {{ code: string, titre: string, debut: number, fin: number }[]}
 */
function entrees(contenu, motif) {
  // ⚠️ `/\r?\n/` et non `'\n'` : ces fichiers sont en CRLF sur ce poste, et en JS le `\r` résiduel
  // est un TERMINATEUR DE LIGNE que `.` ne consomme pas. Le motif de titre ne matchait alors RIEN,
  // et l'index sortait vide en annonçant sereinement « 0 entrées » — famille L-015, et exactement
  // le mode d'échec « gate vide » que ce dépôt combat : un index vide n'aurait fait rougir personne.
  const lignes = contenu.split(/\r?\n/);
  /** @type {{ code: string, titre: string, debut: number, fin: number }[]} */
  const trouvees = [];
  lignes.forEach((ligne, i) => {
    const m = motif.exec(ligne);
    if (m === null) return;
    // La ligne PRÉCÉDENTE de la dernière entrée est la fin de l'avant-dernière.
    const derniere = trouvees.at(-1);
    if (derniere !== undefined) derniere.fin = i;
    trouvees.push({ code: m[1] ?? '', titre: (m[2] ?? '').trim(), debut: i + 1, fin: lignes.length });
  });
  return trouvees;
}

const sortie = [
  '# Index des leçons — lire CECI, pas les corpus entiers',
  '',
  '> ⚠️ **Généré. Ne pas éditer à la main.** Régénéré par `npm run lecons:index` et à chaque',
  '> `SessionStart`. Les agents `mentor`/`security-mentor` le régénèrent après toute édition.',
  '',
  '**Comment s’en servir.** Repère les 2-4 entrées dont le sujet touche TON lot, puis ouvre-les',
  'une par une avec un `Read` borné : `Read(<fichier>, offset=<début>, limit=<fin − début>)`.',
  'Ouvrir un corpus en entier coûte 18 000 à 33 600 tokens pour deux entrées utiles — c’est',
  'exactement le gaspillage que `.claude/rules/agent-context-budget.md` interdit.',
  '',
];

let total = 0;
for (const { fichier, motif, titre } of CORPUS) {
  const chemin = join(dossier, fichier);
  sortie.push(`## ${titre}`, '', `Fichier : \`.claude/lessons/${fichier}\``, '');
  if (!existsSync(chemin)) {
    sortie.push('_(absent)_', '');
    continue;
  }
  const liste = entrees(readFileSync(chemin, 'utf8'), motif);
  total += liste.length;
  sortie.push('| Entrée | Lignes | Sujet |', '|---|---|---|');
  for (const e of liste) {
    // Les barres verticales d'un titre casseraient la table.
    sortie.push(`| ${e.code} | ${e.debut}–${e.fin} | ${e.titre.replace(/\|/g, '\\|')} |`);
  }
  sortie.push('');
}

sortie.push(`_${total} entrées indexées._`);
writeFileSync(join(dossier, 'INDEX.md'), sortie.join('\n') + '\n');
console.log(`✔ .claude/lessons/INDEX.md — ${total} entrées`);
