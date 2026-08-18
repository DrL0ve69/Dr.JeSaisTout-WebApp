# Carte KB → projet — quelle fiche lire pour quelle tâche

> **À quoi sert ce fichier.** La KnowledgeBase compte **263 fiches** réparties sur **10 domaines**
> (`C:\Users\phili\ProjetsPortfolio\KnowledgeBase\`). Son `INDEX.md` fait ~26 000 tokens : le lire à
> chaque session est un gaspillage, et le survoler produit exactement la faute constatée le
> 2026-08-04 — un plan bâti sur `web/securite/` et `web/angular/` seuls, en ignorant `cs/`,
> `devops/`, `outils/` et `divers/pedagogie/` qui portaient sur des décisions déjà prises.
>
> Ce document est la **table de routage** : tâche du projet → fiches à ouvrir. ~3 000 tokens au lieu
> de 26 000. **Il ne remplace pas les fiches** : il dit lesquelles ouvrir, jamais ce qu'elles disent.
>
> **Règle d'usage.** Avant toute décision d'architecture, de design, de contenu ou d'outillage :
> lire la ligne correspondante ici, ouvrir les fiches citées, et **si aucune ligne ne couvre le
> sujet**, faire une recherche (`node tools/kb-search.mjs <termes>`) puis **compléter ce fichier**.
> Un sujet non couvert ici est un trou de la carte, pas une absence dans la KB.
>
> Chemins relatifs à `C:\Users\phili\ProjetsPortfolio\KnowledgeBase\`. Lecture seule (sauf correction
> d'erreur avérée, cf. `docs/contenu/pipeline-contenu.md`).
> 🆕 = fiche jamais prise en compte dans le plan phase 1 avant le 2026-08-04.

---

## 1 · Contenu du cours « Sécurité des applications web » (E2, E3)

Source primaire des 13 modules — déjà câblée dans `docs/contenu/pipeline-contenu.md` §« Correspondance modules ↔ fiches KB ».

| Besoin | Fiches |
|---|---|
| Les 13 modules, un par fiche | `web/securite/*.md` — entrer par `web/securite/carte.md` |
| Prérequis réseau d'un cours de sécu web (DNS, TCP, HTTP/2-3, CDN, rendu navigateur) | 🆕 `cs/reseaux/parcours-requete-web.md` |
| HTTPS/TLS, certificats, HSTS, ACME/Let's Encrypt, révocation | 🆕 `cs/reseaux/https-tls.md` |
| HTTP au niveau RFC (9110/9112), chunked, parsing | 🆕 `cs/reseaux/tcp-http-en-profondeur.md` |
| Module CSRF — la distinction CORS ≠ CSRF ≠ same-origin | 🆕 `web/backend/cors.md` |
| Modules authentification / sessions / JWT — contrepoint applicatif | 🆕 `web/backend/authentification-autorisation.md`, 🆕 `web/backend/webauthn-passkeys.md` |
| Module contrôle d'accès — versant conception d'API (RBAC/ABAC, idempotence) | 🆕 `web/backend/conception-api.md` |
| Module durcissement — versant infra (Docker, moindre privilège) | 🆕 `devops/docker/docker-fondamentaux.md` §sécurité |
| Cadre méthodologique d'un audit (phases de pentest, 12 disciplines, MITRE) | 🆕 `cs/securite/cybersecurite-ethical-hacking.md` |
| Zero Trust, segmentation, pare-feu — cadrage « au-delà de l'applicatif » | 🆕 `cs/securite/zero-trust-securite-reseau.md` |
| Études de cas racontables en leçon | 🆕 `cs/securite/dark-web-investigation.md`, 🆕 `cs/securite/detection-compromission-poste.md` |
| Stockage navigateur — pourquoi pas de token en `localStorage` | 🆕 `web/frontend/stockage-navigateur.md` |

## 2 · Pédagogie — la mission du site (transverse, `.claude/rules/contenu-pedagogique.md`)

| Besoin | Fiches |
|---|---|
| **Comment on enseigne l'informatique** — David Malan / CS50, art d'enseigner et de présenter, politique IA, risque de dépendance | 🆕 `divers/pedagogie/enseigner-informatique-ere-ia.md` — *la fiche la plus alignée sur la raison d'être du projet, absente du plan jusqu'ici* |
| Exigence « pourquoi avant comment », alternatives et arbitrages obligatoires | `KnowledgeBase/CONVENTIONS.md` §Exigence pédagogique |
| Visualisation honnête d'une donnée dans un support de cours | 🆕 `cs/donnees/fondamentaux-data-science.md` §visualisation |
| Statistiques citées dans une leçon sans les tordre (p-value, corrélation ≠ causalité) | 🆕 `cs/donnees/statistiques-pour-la-donnee.md` |

## 3 · Le site Angular (E1, E2, E4)

| Besoin | Fiches |
|---|---|
| Angular : signaux, standalone, routing, DI ; écarts Angular 2026 (zoneless, Signal Forms) | `web/angular/angular-fondamentaux.md` |
| **Pourquoi SSG/prerender plutôt que SPA** — SPA/MPA/SSR/SSG, critères réels, note Angular pour dev .NET | 🆕 `web/frontend/architecture-frontend-comparatif.md` |
| **Critical rendering path, Core Web Vitals, critical CSS, hydratation** — le terrain exact du piège `inlineCritical` rencontré en E0-ST2 | 🆕 `web/frontend/concepts-frontend-senior.md` |
| Quand une SPA est le mauvais choix (SEO, première peinture) | 🆕 `web/frontend/spa-navigation-scroll-infini.md` |
| Alternative sérieuse à évaluer par le `devils-advocate` | 🆕 `web/frontend/htmx.md` |
| tsconfig strict avancé (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), alias de chemins | 🆕 `web/js/typescript-avance.md` |
| **Choisir/refuser une dépendance ; bundlers, tree shaking, code splitting** — appui direct de la règle « zéro dépense » | 🆕 `web/js/panorama-bibliotheques-js.md` |
| Diagrammes et visualisations de données dans une leçon | 🆕 `web/js/d3-visualisation.md` |

### Design & CSS (E1 — direction « Carnet de laboratoire »)

| Besoin | Fiches |
|---|---|
| **Typographie, échelle typographique, système d'espacement 8pt, hiérarchie/contraste WCAG, profondeur** — socle des jetons SCSS d'E1-ST1 | 🆕 `web/frontend/principes-design-visuel.md` |
| Sélecteurs, cascade, **spécificité** — hygiène du design system | 🆕 `web/css/selecteurs-cascade-specificite.md` |
| Wrappers, grid `auto-fit`/`minmax`, propriétés logiques, flexbox vs grid | 🆕 `web/css/patterns-layout.md` |
| `clamp()`, media queries, mobile-first, container queries | 🆕 `web/css/responsive-design-fondamentaux.md` |
| Popover, Anchor Positioning, View Transitions, `@property`, `@scope`, nesting — support Baseline revérifié 2026 | 🆕 `web/css/nouveautes-css-2025.md` |
| `position`, `z-index`, stacking contexts, pièges du sticky | 🆕 `web/css/position.md` |
| Animations CSS natives ; **`prefers-reduced-motion`, quand ne pas animer** | 🆕 `web/css/animations-css-natives.md`, 🆕 `web/frontend/animations-web.md` |
| Effets visuels (⚠ la fiche signale elle-même les pièges de contraste du neomorphism) | 🆕 `web/css/recettes-effets-visuels.md`, 🆕 `web/css/astuces-css.md` |
| Entrée du domaine | 🆕 `web/css/carte.md`, 🆕 `web/frontend/carte.md` |

### Accessibilité — barre dure WCAG 2.2 AA

| Besoin | Fiches |
|---|---|
| **HTML sémantique, ARIA (« no ARIA is better than bad ARIA »), formulaires accessibles, balises méconnues** | 🆕 `web/html/html-semantique-accessibilite.md` |
| **Onglets accessibles : `tablist`/`tab`/`tabpanel`, roving tabindex, navigation clavier** — exactement le composant « vulnérable / corrigé » du pipeline contenu | 🆕 `web/css/composant-tabs.md` |
| Coût réel en accessibilité et SEO d'une UI rendue en `<canvas>` (à ne PAS faire ici) | 🆕 `web/frontend/canvas-ui-html-in-canvas.md` |

## 4 · Posture de sécurité du site lui-même (E0-ST3, `/security-audit`)

| Besoin | Fiches |
|---|---|
| En-têtes de sécurité HTTP, CSP/HSTS/nosniff/frame-ancestors, WAF | `web/securite/durcissement-serveur-web.md` |
| XSS et encodage de sortie contextuel — frontière de confiance du rendu Markdown | `web/securite/xss-cross-site-scripting.md` |
| Chaîne CVE→CWE→CVSS→EPSS/KEV pour noter un constat d'audit | `web/securite/evaluation-vulnerabilites-cvss.md` |
| STRIDE, boîte noire/blanche/grise, OWASP Top 10 2021 **et** 2025 | `web/securite/fondamentaux-securite-web.md` |
| Secrets, environnements, health checks, observabilité | 🆕 `devops/fondamentaux-devops.md` |
| **Prompt injection, OWASP agentique ASI01-10, supply chain des skills** — le harnais d'agents de ce dépôt est lui-même une surface | 🆕 `ai/agents/securite-agents.md` |

## 5 · CI/CD & déploiement (E0-ST4 — tâche courante)

| Besoin | Fiches |
|---|---|
| **Anatomie d'un pipeline, CI vs CD, blue-green/canary/rolling, GitHub Actions Node, « quand c'est de la sur-ingénierie »** | 🆕 `devops/cicd/cicd-fondamentaux.md` |
| Pipeline bout-en-bout réel, dont **auth CI→cloud par OIDC** (alternative au secret long terme) | 🆕 `devops/etudes-de-cas/pipeline-cicd-eks.md` |
| Concepts cloud agnostiques, autoscaling, serverless, **quand ne pas aller au cloud** | 🆕 `devops/cloud/cloud-computing-concepts.md` |
| Équivalences AWS↔Azure si une doc de référence est en AWS | 🆕 `devops/cloud/aws-certified-cloud-practitioner.md` |
| Limites de l'IaC — pertinent seulement si on scripte la ressource Azure | 🆕 `devops/infrastructure-as-code-limites.md` |
| **Trunk-based vs gitflow, convention de commit à l'impératif, merge vs rebase** — la stratégie de branche du dépôt | 🆕 `outils/git/git-fondamentaux.md` |
| Monorepo vs polyrepo — si le backend .NET rejoint ce dépôt en phase 2 | 🆕 `outils/git/monorepo-polyrepo.md` |
| Méthode de débogage (reproduire, isoler, bissecter, `git bisect`) | 🆕 `outils/debogage-fondamentaux.md` |

## 6 · Qualité de code & architecture (transverse)

| Besoin | Fiches |
|---|---|
| **SOLID, Dependency Rule, critiques et sur-ingénierie, « quand ne pas appliquer »** — socle du skill `/solid-review` | 🆕 `cs/architecture/principes-solid-clean-architecture.md` |
| Patrons d'architecture et 23 patterns GoF ; monolithe modulaire | 🆕 `cs/architecture/patrons-architecture.md` |
| **Result pattern, erreurs opérationnelles vs bugs, nommage, découplage ; versant TS : tuple `[error, data]`, Zod** — pipeline de contenu et validation JSON | 🆕 `web/backend/qualite-code-gestion-erreurs.md` |
| Mesurer avant d'optimiser (variance, micro-benchmarks trompeurs, quand ne pas optimiser) | 🆕 `cs/algorithmes/benchmarking-performance.md` |

## 7 · Phase 2 — backend .NET 10 (E5 et au-delà)

Le CLAUDE.md renvoie aux conventions du projet frère AbrisTempo ; la KB en couvre la théorie.

| Besoin | Fiches |
|---|---|
| Couches, Onion vs Clean, Vertical Slice, **quand c'est de la sur-ingénierie** | 🆕 `cs/architecture/clean-architecture-dotnet-fondations.md` |
| CQRS, MediatR (et sa licence commerciale 2025 + alternatives), FluentValidation | 🆕 `cs/architecture/clean-architecture-dotnet-cqrs.md` |
| Persistance, outbox EF Core, débat Unit of Work | 🆕 `cs/architecture/clean-architecture-dotnet-persistance.md` |
| DDD tactique, value objects, aggregate root, domain events | 🆕 `cs/architecture/clean-architecture-dotnet-ddd.md` |
| **Assemblage Angular + ASP.NET Core** : structure de solution, CORS vs proxy, DTO/OpenAPI, intercepteur JWT | 🆕 `web/fullstack-angular-dotnet.md` |
| Web API + EF Core, migrations, relations, chargement | 🆕 `web/backend/dotnet-webapi-ef-core.md` |
| DI, `IOptions`, user secrets, Central Package Management | 🆕 `web/backend/dotnet-projet-configuration.md` |
| Identity, rôles vs claims vs policies — si des comptes apparaissent | 🆕 `web/backend/aspnet-core-identity.md` |
| Rate limiting, caching — si une API publique apparaît | 🆕 `cs/architecture/rate-limiting.md`, 🆕 `cs/architecture/caching.md` |
| Choix de base de données ; SQLite suffit-il ? | 🆕 `cs/bases-de-donnees/key-value-stores.md`, 🆕 `cs/bases-de-donnees/sqlite.md` |

## 8 · Le harnais d'agents de ce dépôt (méta — `.claude/`)

| Besoin | Fiches |
|---|---|
| Gestion du contexte, « zone intelligente », 1 ticket = 1 fenêtre — source de `.claude/rules/agent-context-budget.md` | `ai/agents/claude-code/methode-travail.md` |
| Coût d'une flotte, séquentiel vs parallèle, coût d'une tâche abandonnée | `ai/agents/cout-exploitation-flotte.md` |
| CLAUDE.md, portées, permissions, subagents, skills/hooks/MCP, **RAG vs navigation fichiers** | 🆕 `ai/agents/claude-code/workflow-configuration.md` |
| Arbre de décision tool / skill / subagent ; les deux cas légitimes de subagent | 🆕 `ai/agents/architecture-harness.md` |
| Skills, progressive disclosure, LLM-as-judge, maturité des evals | 🆕 `ai/agents/claude-code/skills-et-evals.md` |
| **AI slop, design system injecté en contexte, bibliothèque de goût** — source de `docs/design/direction-visuelle.md` | 🆕 `ai/agents/claude-code/design-ui.md` |
| Mémoire applicative vs prompt caching vs compaction ; wikis d'agent | 🆕 `ai/agents/memoire-cache-agents.md` |
| **Graphe de code vs RAG vectoriel vs grep vs long contexte, et le coût de chaque** — fonde le choix d'outillage de recherche ci-dessous | 🆕 `ai/agents/outils/analyse-codebase-graph.md` |
| **Quand NE PAS faire de RAG** ; BM25, hybride, qualité réelle des embeddings **en français** | 🆕 `ai/rag/architecture-rag.md`, 🆕 `ai/fondamentaux/embeddings.md` |

---

## Trous connus — ce que le projet a besoin et que la KB ne couvre PAS

À ne pas chercher dans la KB : la réponse n'y est pas, il faut une source externe.

- **Azure Static Web Apps** en propre (paliers, `staticwebapp.config.json`, action de déploiement) —
  la KB couvre AWS et le cloud agnostique, pas SWA. Source du projet : `docs/deployment.md`.
- **WCAG 2.2 AA au niveau critère** (les critères numérotés, axe-core, outillage de test a11y) —
  la KB donne les principes ARIA, pas le référentiel.
- **Vitest / tests de composants Angular** — aucune fiche de test frontend.
- **Markdown → HTML au build** (`markdown-it`, `shiki`, `gray-matter`, `ajv`) — décidé en spike S-01
  sans appui KB ; voir `docs/architecture/stack-et-architecture.md` §9.
- **Mermaid** comme brique de rendu (la KB *utilise* Mermaid partout, aucune fiche ne le *traite*).
- **Angular 22 spécifiquement** — la fiche Angular est un crash course 18.2 avec une section d'écarts
  2026 ; elle ne remplace pas la doc officielle ni le MCP `angular-cli`.
- 🆕 **Gamification et conception de la motivation** *(trou constaté le 2026-08-17)* — `npm run kb --
  gamification pedagogie motivation --any` ne remonte que **deux** fiches, dont une carte de domaine :
  `divers/pedagogie/enseigner-informatique-ere-ia.md` (Malan/CS50) est la seule substance, et elle
  parle de pédagogie, pas de mécaniques de jeu. Or la direction produit décidée le 2026-08-17
  s'appuie explicitement sur boot.dev et Duolingo. Ce qui a servi à trancher (§E2-ST6 du backlog) est
  donc de la **recherche web datée**, pas de la KB : efficacité mesurée de la gamification,
  *dark patterns* de la série quotidienne, effet des ligues sur l'objectif d'apprentissage.
  **Prioritaire pour l'archiviste** — c'est le seul trou de cette liste qui porte sur une décision
  produit déjà prise.
- 🆕 **Widgets d'exercice interactifs (appariement, désignation de ligne)** *(trou constaté le
  2026-08-18, lot D d'E2-ST3)* — `npm run kb -- associer appariement clavier --any` ne remonte que
  `web/css/composant-tabs.md`, qui traite d'autre chose. La KB couvre les **onglets** accessibles et
  la doctrine ARIA (`web/html/html-semantique-accessibilite.md`), rien sur les patrons d'exercice
  qu'un site d'apprentissage emploie tous les jours. Ce qui a tranché le lot D (décision **D-1** du
  backlog : un `<select>` natif par ligne, jamais un glisser-déposer) est donc la **doctrine « no
  ARIA is better than bad ARIA » + WCAG 2.2 2.5.7**, pas une fiche. À ingérer avant E2-ST5, qui aura
  le même besoin sur la simulation pas-à-pas.
- 🆕 **Design d'interface de jeu / esthétique rétro** — même angle mort : la KB couvre les principes
  de design visuel (`web/frontend/principes-design-visuel.md`) et les recettes d'effets CSS
  (`web/css/recettes-effets-visuels.md`), rien sur les codes visuels du jeu vidéo.

> Ces trous sont aussi la liste de courses de l'archiviste : ce sont les sujets à ingérer en priorité
> si la KB doit un jour couvrir ce projet de bout en bout. **Deux commandes d'archivage sont déjà
> nommées et datées ailleurs** : la fusion du site du cours (backlog **E3-ST0**) et les deux trous
> ci-dessus.
