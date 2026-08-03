---
name: security-audit
description: >-
  Runs a professional security audit of Dr. Je-Sais-Tout — the codebase, the content pipeline
  and/or the deployed site (Azure Static Web Apps) — against the OWASP frameworks, and writes a
  report + a pseudo-AGILE remediation backlog. Use when the user asks for a security audit /
  pentest / vuln assessment, or types /security-audit. Safe by default; active exploit probing
  is an explicit opt-in.
argument-hint: "[local | deploye | complet | --actif <url locale ou de préproduction>]"
---

# Audit de sécurité

Pilote un audit de sécurité **depuis la conversation principale** (tu coordonnes ; le sous-agent
`security-auditor` fait le travail profond par domaine ; le `security-mentor` capitalise). Le livrable
est un **rapport daté + un backlog mis à jour** — une **boucle suivie**, pas un PDF ponctuel.

> **Pourquoi la barre est dure ici.** Ce site **enseigne la sécurité des applications web** : une
> faiblesse chez nous est une **contradiction publique** avec le contenu publié. C'est un facteur
> aggravant dans la cotation, à dire explicitement dans le rapport.

**Périmètre / arguments :** $ARGUMENTS

## 0. Analyser le périmètre & le mode (d'abord)

- **`local`** (défaut si aucun argument) — analyse statique du dépôt : code, configuration de
  déploiement, pipeline de contenu, CI, dépendances.
- **`deploye`** — analyse statique **plus** sondes live non intrusives contre le site publié :
  en-têtes de sécurité, **CSP réellement servie**, TLS/HSTS, forme des réponses d'erreur, fichiers
  sensibles exposés (source maps, fichiers de configuration). **Sûr en production** — lecture seule,
  aucun trafic d'attaque.
- **`complet`** — `local` + `deploye`.
- **`--actif <url>`** — ajoute du DAST actif (**OWASP ZAP baseline + Nuclei, gratuits et sans clé**)
  contre la cible donnée. **Garde-fous durs :** la cible **doit** être locale (`localhost`/`127.0.0.1`)
  ou un hôte de **préproduction** explicite ; **refuse tout hôte de production**. Avant le moindre
  trafic d'attaque, énonce en une ligne les **règles d'engagement** et obtiens l'accord explicite de
  l'utilisateur.

Si le mode est ambigu, ou si `--actif` vise quelque chose qui ressemble à de la production,
**arrête-toi et demande**.

> **Phase 1 — pas de comptes, pas de base de données, pas de backend déployé.** Les domaines
> authentification / autorisation / données personnelles sont **hors périmètre effectif** : dis-le au
> lieu d'inventer des constats. Si le dépôt n'a pas encore de code, audite ce qui existe
> (configuration, CI, dépendances, plans) et liste ce qui n'est **pas encore auditable**.

## 1. Charger la barre

Lis `.claude/rules/security.md`, `.claude/lessons/security-lessons.md`,
`docs/architecture/stack-et-architecture.md` et `docs/contenu/pipeline-contenu.md`. Survole le dernier
rapport dans `docs/securite/` (s'il y en a un) pour comparer la posture dans le temps.

## 2. Auditer — répartir par domaine

Délègue chaque domaine dans le périmètre à un sous-agent `security-auditor` (en parallèle quand ils
sont indépendants), en lui passant le périmètre + le mode. Domaines adaptés à ce projet :

`contenu-injection` (Markdown/JSON rendu, assainissement, charges utiles d'exemple qui doivent
s'afficher et non s'exécuter) · `entetes-csp` (configuration Static Web Apps, CSP, en-têtes) ·
`build-et-ssr` (pipeline de contenu, fuites d'erreur SSR, artefacts publiés) ·
`chaine-approvisionnement-ci` (`npm audit`, scripts `postinstall`, secrets, permissions du workflow) ·
`posture-deployee` (modes `deploye`/`complet`) · `backend-squelette` (seulement si du code .NET
existe) · `dast-actif` (uniquement avec `--actif`, local/préproduction).

Chacun rend ses constats sous forme de **tickets AGILE** (OWASP/CWE + CVSS + sévérité + preuve +
correctif + critères d'acceptation). Pour une demande petite et ciblée, un seul auditeur — ou un
passage en ligne — suffit.

**Outillage gratuit ET sans clé uniquement** (`.claude/rules/budget-free-tier.md`) : `npm audit`,
`gitleaks`/`trufflehog`, `curl -I`/`openssl`, `dotnet list package --vulnerable --include-transitive`
si le backend existe, ZAP + Nuclei en mode actif. **Jamais un scanner payant ou à clé.**

## 3. Synthétiser

Fusionne les constats ; dédoublonne ; attribue la sévérité finale (bande CVSS, ajustée par l'OWASP
Risk Rating quand le contexte le justifie — site public sans données personnelles en phase 1) ;
construis le **registre de risques** (comptes par sévérité + matrice vraisemblance × impact). Rattache
chaque constat à OWASP Top 10 2025 (+ id 2021) / API Top 10 2023 / CWE. Conserve les **forces** (les
contrôles qui ne doivent pas régresser). Sépare **confirmé** de **plausible**.

## 4. Écrire le rapport

Crée `docs/securite/audit-<AAAA-MM-JJ>.md`, en français : résumé exécutif (langage d'affaires, relier
les constats à l'impact réel, y compris **la crédibilité du site en tant que ressource
d'apprentissage**) · périmètre & règles d'engagement · méthodologie (OWASP WSTG + STRIDE + outils
lancés) · synthèse des constats + matrice de risques · constats détaillés (vecteur CVSS, preuve,
remédiation, références) · recommandations tactiques et stratégiques · annexe (sorties d'outils,
vecteurs CVSS, notes hors périmètre). **La date vient de l'environnement — ne la devine pas.**

## 5. Mettre à jour le backlog (pseudo-AGILE)

Synchronise `docs/securite/backlog-securite.md` : un ticket par constat ouvert (ID · titre · sévérité ·
CVSS · OWASP/CWE · zone touchée · statut · SLA), avec un flux Ouvert → En cours → En attente de
vérification → Fermé. **Le re-test est la Definition of Done** : un ticket ne ferme que si un
re-scan/re-test confirme le correctif. Marque « en attente de vérification » tout constat déjà corrigé,
puis vérifie-le.

> **Activateur ≠ application.** Un obstacle levé (script inline externalisé) n'est pas une directive
> appliquée : si la CSP n'est pas **servie et vérifiée live**, scinde le ticket en « préparation » et
> « application » et ne ferme que le premier.

## 6. Passer le relais

- Propose de router les correctifs par **`/feature-cycle`** (architecte → développeur →
  **`security-reviewer` + `code-reviewer`** → mentor). Traite Critique/Élevé d'abord, en respectant les
  SLA. Rappel de budget de contexte : **un correctif = un agent frais**
  (`.claude/rules/agent-context-budget.md`).
- Délègue les enseignements durables au sous-agent **`security-mentor`** (met à jour
  `.claude/lessons/security-lessons.md`).
- **Passerelle vers le contenu :** si un constat illustre parfaitement une notion enseignée (« notre
  propre erreur de CSP »), **signale-le comme sujet candidat** pour la boucle contenu (skill `lecon` →
  `professeur-web` → `verificateur-theorie`). Tu **n'écris rien** sous `content/**`.
- Résume pour l'utilisateur : verdict de posture, comptes par sévérité, les 3 choses à corriger
  maintenant, et où vivent le rapport et le backlog.

## Notes

- Les agents `security-*` se chargent à la **session suivante** (redémarrage/`/clear`). Si l'un d'eux
  n'est pas encore disponible, déroule son étape en ligne avec ce skill + `.claude/rules/security.md`
  et la commande `/security-review`.
- Ne lance **jamais** d'outillage actif contre la production. N'introduis **jamais** d'outil payant ou
  à clé.
- Vue d'ensemble du système : `.claude/README.md` (boucle sécurité).
