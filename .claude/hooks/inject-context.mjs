#!/usr/bin/env node
/**
 * SessionStart hook — auto-injects the team's operating rules + the living
 * "lessons learned" files into EVERY session's context.
 *
 * WHY THIS EXISTS
 *   Subagents and fresh sessions don't automatically know the project's hard-won
 *   gotchas. CLAUDE.md is auto-loaded, but the *dynamic* lessons (maintained by a
 *   mentor agent) are not. This hook reads `.claude/lessons/lessons-learned.md` and
 *   prints an INDEX of it (one line per lesson title + a pointer) to stdout — NOT the
 *   full file, which grows every cycle. For the SessionStart event, anything printed to
 *   stdout is injected into Claude's context — so every agent starts knowing WHICH
 *   lessons exist and reads the full entry on demand when its area is in scope (same
 *   on-demand model as security-lessons.md). This keeps the "teacher → everyone" loop
 *   automatic without paying the whole file's token cost up front.
 *
 * CONTRACT (see .claude/README.md and the Claude Code hooks docs)
 *   - Wired in .claude/settings.json under hooks.SessionStart.
 *   - Receives the event JSON on stdin (unused here); writes context to stdout; exit 0.
 *   - Pure Node, no external deps (no `jq`), so it runs the same on Windows/macOS/Linux.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve the repo root from this script's location (.claude/hooks/inject-context.mjs).
// CLAUDE_PROJECT_DIR is provided by Claude Code, but deriving it keeps the script
// runnable on its own for testing.
const here = dirname(fileURLToPath(import.meta.url));
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? join(here, '..', '..');

const out = [];
out.push('=== Dr. Je-Sais-Tout · operating rules (auto-injected at session start) ===');
out.push(
  'Site pédagogique en FRANÇAIS SEULEMENT (contenu, code, commentaires, messages de commit). ' +
    'Phase 1 : contenu public (pas de comptes), sujet prioritaire = sécurité des applications web. ' +
    'Stack : Angular 21 + SCSS (SSR/prerender), contenu Markdown+JSON dans `content/`, backend .NET 10 ' +
    'C# en phase 2 seulement. Hébergement Azure Static Web Apps Free. Verify with build + tests before ' +
    'claiming done. WCAG 2.2 AA is a hard bar — this is a non-negotiable floor, same weight as security.',
);
out.push(
  'BUDGET — HARD RULE: never spend money. No subscriptions, no paid/billed API keys, no paid Azure ' +
    'SKUs without the owner’s explicit consent. Default to free AND keyless. A "free tier" that requires ' +
    'a billing account / credit card is treated as PAID → rejected. The only paid resource is the ~$120 ' +
    'CAD Azure student credit. Hosting target: Azure Static Web Apps Free (phase 1), then Container Apps ' +
    'free grant + SQL S0 (phase 2). See `.claude/rules/budget-free-tier.md`.',
);
out.push(
  'CONTEXT BUDGET — HARD RULE: 150k targeted / 200k tolerated / 250k absolute max per subagent. One ' +
    'agent = one verifiable deliverable; review fixes go to a FRESH agent, never a resumed saturated one; ' +
    'heavy gates (full e2e/build suites) go to a throwaway verification agent. See ' +
    '`.claude/rules/agent-context-budget.md`.',
);
out.push(
  'SECURITY & TEACHING: this site TEACHES web security — every published lesson must itself comply with ' +
    'what it preaches (phase 1: security headers, strict nonce/hash CSP via `staticwebapp.config.json`, no ' +
    'client-side secret, `npm audit` clean, no personal data collected; phase 2 backend checklist waits for ' +
    'the API). Deliberately vulnerable example code belongs ONLY inside clearly marked example blocks in ' +
    'lesson content, NEVER in the site’s own executable code. See `.claude/rules/security.md` and the ' +
    'one-line pointer to `.claude/lessons/security-lessons.md` below.',
);
out.push('');

// Rafraîchit `.claude/lessons/INDEX.md` — la table de routage AVEC PLAGES DE LIGNES que les
// SOUS-AGENTS lisent (eux ne reçoivent pas forcément la sortie de ce hook, et l'index imprimé
// plus bas ne porte pas de numéros de ligne : sans le fichier, un agent n'a pas d'autre choix
// que d'ouvrir un corpus de 33 600 tokens pour deux entrées utiles). Mesuré le 2026-08-20 :
// ~74 000 tokens de préambule permanent par sous-agent, dont 51 600 pour les deux corpus.
// ⚠️ En `try` mutique : ce hook ne doit JAMAIS faire échouer un démarrage de session.
try {
  await import('./generer-index-lecons.mjs');
} catch {
  // Index non régénéré — les agents retombent sur les corpus entiers, plus cher mais pas faux.
}

try {
  const lessons = readFileSync(join(projectDir, '.claude', 'lessons', 'lessons-learned.md'), 'utf8');
  // Inject only an INDEX (one line per lesson: "L-0xx · title") + a pointer — NOT the full file.
  // The title is enough signal to decide relevance; agents Read the full Symptom/Rule/Refs of a
  // lesson on demand when its area is in scope.
  const titles = lessons
    .split('\n')
    .filter((line) => /^##\s+L-\d/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
  out.push(
    '=== Lessons learned — INDEX (open `.claude/lessons/lessons-learned.md` and read the full ' +
      'entry of any lesson whose area your task touches) ===',
  );
  if (titles.length > 0) {
    out.push(...titles);
    out.push('');
    out.push(
      `(${titles.length} lessons; titles only — the full Symptom/Rule/Refs live in the file. ` +
        'Read the matching entry BEFORE work in its area.)',
    );
  } else {
    out.push('(no lessons captured yet)');
  }
} catch {
  // First run, or the file was removed — not an error, just nothing to inject yet.
  out.push('(no .claude/lessons/lessons-learned.md yet)');
}

out.push('');
out.push(
  '=== Security lessons — pointer only (NOT injected in full; read `.claude/lessons/security-lessons.md` ' +
    'before any security-sensitive edit — CSP/headers, dependencies, future auth/API work) ===',
);

process.stdout.write(out.join('\n') + '\n');
process.exit(0);
