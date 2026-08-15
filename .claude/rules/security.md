# Sécurité — règle opérationnelle (Dr. Je-Sais-Tout)

> **Ce que c'est.** Une checklist à dérouler **en écrivant** ou **en révisant** tout ce qui touche à
> la sécurité du site — configuration d'hébergement, en-têtes, dépendances, et (dès la phase 2) API
> .NET. Elle traduit les référentiels OWASP (Top 10 web/API, ASVS, WSTG) **en gestes concrets ancrés
> à ce dépôt**. Le hook `PostToolUse` (`post-edit-guardrail.mjs`) pointe ici sur toute édition d'un
> fichier sensible. Les leçons durables vivent dans **`.claude/lessons/security-lessons.md`**.
>
> **Règle d'or :** *deny-by-default, valider en entrée, encoder en sortie, ne jamais faire confiance
> au client, et ne jamais mettre un secret dans le code.* Ce site **enseigne** la sécurité des
> applications web — chaque leçon publiée doit être **conforme à ce qu'elle prêche**. Le contenu
> pédagogique peut montrer du code **volontairement vulnérable**, mais **seulement** dans des blocs
> d'exemple clairement marqués (« ⚠️ exemple vulnérable — ne pas reproduire »), **jamais** dans du
> code réellement exécuté par le site (composants, scripts, build).
>
> Cousine : `.claude/rules/budget-free-tier.md` (outillage sécu **gratuit ET sans clé** : `npm audit`,
> gitleaks, trufflehog).

---

## Phase 1 — site statique/prerendu (contenu public, pas de comptes)

C'est la phase active aujourd'hui. Pas de backend, pas de données personnelles, pas d'authentification
— mais un site public statique reste une surface d'attaque (headers manquants, dépendances
vulnérables, secrets qui fuitent dans le bundle, XSS via contenu Markdown mal rendu).

### 1 · En-têtes de sécurité & CSP — `staticwebapp.config.json` (A05 · WSTG-CONF)

- [ ] **En-têtes de sécurité** posés via `staticwebapp.config.json` (section `globalHeaders`), pas au
      cas par cas dans le code Angular : `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
      `X-Frame-Options: DENY` (ou CSP `frame-ancestors 'none'`), `Referrer-Policy:
      strict-origin-when-cross-origin`, `Permissions-Policy` (désactiver caméra/micro/géoloc — le site
      n'en a besoin d'aucun).
- [ ] **CSP stricte basée nonce ou hash**, jamais `unsafe-inline` ni `unsafe-eval` par défaut. Angular
      SSR/prerender permet une CSP basée nonce (Angular génère les nonces sur les balises `<script>`
      injectées) — préférer cette approche à une CSP permissive. `default-src 'self'`, `object-src
      'none'`, `base-uri 'self'`.
- [ ] **Enabler ≠ enforcement.** Fermer un constat en-têtes/CSP exige que la **directive effective
      soit en ligne et vérifiée live** (build prerender + inspection des headers réellement servis par
      SWA), pas seulement qu'elle soit écrite dans le fichier de config.
- [ ] **Une CSP validée sur une page INERTE ne vaut que pour une page inerte.** Revalider dès qu'un
      lot introduit le **premier écouteur d'événement** de la page : le framework injecte alors des
      scripts inline qu'il n'émettait pas avant (Angular, rejeu d'événements — constaté en E1-ST2,
      build rouge, deux scripts apparus avec la première bascule interactive). Et si la parade passe
      par un hachage : **la liste blanche reste NOMINATIVE**, jamais dérivée de l'artéfact — une
      liste dérivée autorise tout ce qu'une future version du framework y injectera, sans qu'aucun
      humain l'ait vu. Détail : `.claude/lessons/security-lessons.md` **S-005**.
- [ ] **Retirer** tout header `Server`/`X-Powered-By` exposant la stack.

### 2 · Aucun secret côté client (A02/A04)

- [ ] **Aucun secret dans le bundle Angular** — tout ce qui est livré au navigateur est **public par
      construction** (build prerender/SSR compilé côté client). Pas de clé API, token, ou identifiant
      privé dans `environment.ts`, un composant, ou une variable d'environnement préfixée exposée au
      build.
- [ ] **Aucun secret dans le contrôle de version** : grep `apiKey|secret|password|token=` sur tout
      commit ; activer le *push protection* GitHub ; gitleaks/trufflehog en local avant de committer
      (gratuit, keyless — cf. `.claude/rules/budget-free-tier.md`).
- [ ] Toute future intégration tierce (analytics, formulaire de contact) passe par une clé **publique
      restreinte par domaine** si un secret est réellement nécessaire — sinon, pas d'intégration.

### 3 · Dépendances & chaîne d'approvisionnement (A06/A03 · CICD-SEC)

- [ ] **`npm audit`** vert avant chaque PR (gratuit, aucune clé). Dependabot activé sur le dépôt.
- [ ] **CI durcie** : pas de secret en clair dans les logs ; workflow GitHub Actions figé par version
      d'action (`@vX` épinglé, éviter `@main`).
- [ ] Toute **nouvelle dépendance npm** documente son coût (toujours gratuit ici) et sa surface — pas
      de package non maintenu ou avec des vulnérabilités connues non corrigées.

### 4 · Contenu & XSS (A03 · WSTG-INPV)

- [ ] **Contenu Markdown/JSON** (`content/`) est rendu par un pipeline de confiance (ex. Markdown →
      HTML assaini) — **aucun** `[innerHTML]` non sanitisé sur du contenu qui pourrait un jour être
      modifiable par un tiers (formulaire, import externe). Même si le contenu est aujourd'hui
      100 % auteur-contrôlé, traiter le pipeline de rendu comme une frontière de confiance.
- [ ] **Aucun `bypassSecurityTrust*`** Angular sans justification écrite et revue.
- [ ] **Aucune donnée personnelle collectée en phase 1** : pas de formulaire qui persiste un email/nom
      sans une raison documentée et un consentement — le site n'a pas de compte, il ne doit pas non
      plus accumuler de PII incidentelle (analytics respectueux de la vie privée si utilisés, pas de
      tracking intrusif).

---

## Phase 2 — dès que l'API existe (.NET/JWT/EF/BOLA…)

> Les points ci-dessous sont **hors périmètre actif** (pas de backend en phase 1) mais servent de
> checklist prête à l'emploi dès que l'API .NET 10 démarre. Ne pas les ignorer au moment venu.

### 5 · Contrôle d'accès & autorisation — Phase 2 (A01 · API1/3/5)

- [ ] **Deny-by-default.** Un endpoint n'est public **que** avec `[AllowAnonymous]` explicite.
- [ ] **Autorisation au niveau objet (BOLA/IDOR)** dès qu'une notion de propriétaire de ressource
      existe (progression d'apprentissage, favoris, etc. si ajoutés plus tard).
- [ ] **Sur-exposition de propriétés (BOPLA)** : un DTO de réponse n'expose que les champs nécessaires.

### 6 · Validation d'entrée & injection — Phase 2 (A03/A05)

- [ ] Toute entrée validée par FluentValidation en couche Application. Pas de validation manuelle
      dans le contrôleur.
- [ ] **SQL : jamais de concaténation** — LINQ paramétré par EF ; aucun `FromSqlRaw`/`ExecuteSqlRaw`
      avec interpolation de chaîne.
- [ ] **Mass-assignment / over-posting** : commandes en `sealed record` avec exactement les champs
      autorisés.

### 7 · Authentification & jetons — Phase 2 (A07 · API2)

- [ ] Paramètres JWT complets (`ValidateIssuer`, `ValidateAudience`, `ValidateLifetime`,
      `ValidateIssuerSigningKey`, algorithme épinglé, `ClockSkew` faible).
- [ ] Anti-énumération sur login/register/forgot-password.
- [ ] Rate-limiting des endpoints d'auth.
- [ ] Stockage du jeton : préférer cookie `HttpOnly` + `Secure` + `SameSite` à `localStorage`.

### 8 · Secrets & configuration serveur — Phase 2 (A02/A04/A05)

- [ ] **Aucun secret dans `appsettings.json`** — user-secrets (dev) / variables d'env → Azure Key
      Vault (prod).
- [ ] CORS explicite (origines/méthodes/en-têtes listés), jamais `AllowAnyOrigin()` + credentials.
- [ ] Pas d'erreurs verbeuses : réponses RFC 9457 sans stack-trace.

### 9 · IA / LLM — si une fonctionnalité IA est ajoutée un jour

- [ ] Prompt injection (LLM01), improper output handling (LLM05), fuite du prompt système (LLM02/07),
      quotas contre le *denial-of-wallet* (LLM10) — à activer dès qu'une capacité IA/LLM apparaît.

---

**Pré-commit, phase 1 (statique) :** headers de sécurité posés dans `staticwebapp.config.json` (§1),
CSP stricte basée nonce/hash vérifiée live (§1), aucun secret côté client ni en historique git (§2),
`npm audit` vert (§3), aucun `[innerHTML]`/`bypassSecurityTrust*` non justifié sur du contenu (§4),
aucune collecte de PII non documentée (§4). **Pré-commit, phase 2 (dès l'API) :** dérouler §5–9 en plus.
Au moindre doute — **stop, documenter le constat avant de merger**.
