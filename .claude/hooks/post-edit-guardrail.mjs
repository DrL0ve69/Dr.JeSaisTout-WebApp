#!/usr/bin/env node
/**
 * PostToolUse hook (matches Edit | Write | MultiEdit) — a deterministic guardrail.
 *
 * WHY THIS EXISTS
 *   Advisory rules in CLAUDE.md are easy to forget mid-task. This hook fires AFTER every
 *   successful edit, looks at which file changed, and injects a short, non-blocking
 *   reminder of the matching verification + tooling for that layer:
 *     - Content     (content/**.md|.json)         → `rules/contenu-pedagogique.md` + KnowledgeBase sources.
 *     - Frontend    (**.ts|.html|.scss)            → angular skill + angular-best-practices + build/lint/test + WCAG AA.
 *     - Backend     (**.cs, phase 2)               → Clean Architecture boundaries + dotnet test + solid-review.
 *     - Cloud/CI/deps (staticwebapp.config.json, *.yml, appsettings*, package.json, *.csproj)
 *                                                    → rules/security.md + rules/budget-free-tier.md.
 *   It NEVER blocks (always exit 0) — it only nudges, so it can't wedge your session.
 *
 * CONTRACT
 *   - Receives the PostToolUse event JSON on stdin: { tool_name, tool_input: { file_path, ... }, ... }.
 *   - To inject context we print, on stdout, exit 0 + JSON:
 *       { "hookSpecificOutput": { "hookEventName": "PostToolUse", "additionalContext": "<text>" } }
 *     (additionalContext is delivered to Claude as a system reminder.)
 *   - Emits nothing for files where no reminder is useful (our own tooling, build output).
 *   - Pure Node, no `jq` — robust on Windows. Wired in .claude/settings.json.
 */

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let path = '';
  try {
    const input = JSON.parse(raw || '{}');
    path = input?.tool_input?.file_path ?? '';
  } catch {
    process.exit(0); // malformed input → stay silent, never block
  }

  // Normalise to forward slashes so the same matching works on Windows.
  const p = String(path).replace(/\\/g, '/');
  const base = p.split('/').slice(-1)[0];

  const isVendored = /\/(obj|bin|dist|node_modules)\//.test(p) || /\/\.claude\//.test(p);
  if (isVendored || !p) process.exit(0);

  // Cloud/CI/dependency config surface: some are .json (package.json, appsettings*.json,
  // staticwebapp.config.json) which the generic doc/json ignore below would otherwise skip —
  // detect them first and let them through.
  const isCloudCiSurface =
    /\/staticwebapp\.config\.json$/.test(p) ||
    /\/package\.json$/.test(p) ||
    /\.csproj$/.test(p) ||
    /\/appsettings[^/]*\.json$/.test(p) ||
    /\.ya?ml$/.test(p);

  const isContent = /^content\//.test(p) || /\/content\//.test(p);
  const isContentFile = isContent && /\.(md|json)$/.test(p);

  // Ignore non-source files that aren't one of the surfaces above: our own tooling, build
  // output, deps, lockfiles, generic docs.
  if (!isCloudCiSurface && !isContentFile && /\.(md|json|lock|css\.map|snap)$/.test(p)) {
    process.exit(0);
  }

  const reminders = [];

  if (isContentFile) {
    reminders.push(
      'Contenu pédagogique touché (' +
        base +
        '). Suivre `.claude/rules/contenu-pedagogique.md` (écrite par un autre agent — à consulter pour ' +
        'le format des leçons et les exigences de sourçage) et vérifier que les sources citées existent ' +
        'bien dans la base de connaissances (KnowledgeBase). Rappel sécurité : tout exemple de code ' +
        'volontairement vulnérable doit être dans un bloc clairement marqué comme tel, jamais dans du ' +
        'code exécutable du site (`.claude/rules/security.md`).',
    );
  }

  const isFrontend = /\.(ts|html|scss)$/.test(p) && !isContent;
  if (isFrontend) {
    reminders.push(
      'Frontend edit detected (' +
        base +
        '). Follow the `angular` skill + `.claude/rules/angular-best-practices.md` (cache local — call ' +
        'the MCP `get_best_practices` only if that file is missing or after a major Angular upgrade — ' +
        'Angular 21: standalone, signals, OnPush, inject(), native control flow, [class]/[style], reactive ' +
        'forms). Before finishing: `npm run lint`, `npm run build` (typecheck/prerender), `npm test`. Keep ' +
        'WCAG 2.2 AA — zero AXE violations. UI strings in French only.',
    );
  }

  const isBackend = /\.cs$/.test(p);
  if (isBackend) {
    reminders.push(
      'Backend edit detected (' +
        base +
        '). Phase 2 territory — respect Clean Architecture boundaries (Domain ← Application ← ' +
        'Infrastructure/API), run `dotnet test`, and give the diff a `solid-review` pass before claiming ' +
        'done. Also check `.claude/rules/security.md` §5-9 (Phase 2 checklist) since backend code is ' +
        'inherently security-sensitive (authz, JWT, EF, secrets).',
    );
  }

  if (isCloudCiSurface) {
    reminders.push(
      'Cloud/CI/dependency surface touched (' +
        base +
        '). Check `.claude/rules/security.md` (headers/CSP via `staticwebapp.config.json`, no client-side ' +
        'secret, `npm audit` clean) AND `.claude/rules/budget-free-tier.md` (never a paid/billed service or ' +
        'Azure SKU without explicit owner consent — SWA Free in phase 1, Container Apps free grant + SQL ' +
        'S0 in phase 2; a "free tier" needing a billing account/credit card counts as PAID → reject).',
    );
  }

  if (reminders.length === 0) process.exit(0);

  const payload = {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: '[guardrail] ' + reminders.join(' '),
    },
  };
  process.stdout.write(JSON.stringify(payload));
  process.exit(0);
});
