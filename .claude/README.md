# `.claude/` — le système d'agents et d'automatisation de Dr. Je-Sais-Tout

Ce dossier transforme Claude Code, d'« un assistant » en une **petite équipe avec un processus** : un
architecte planifie, un développeur implémente, un reviewer contrôle, un mentor consigne ce qu'on a
appris pour qu'on ne répète pas nos erreurs — et, en parallèle, une **boucle contenu** rédige et
contre-vérifie les leçons du site. La plupart du temps, ça se déclenche **tout seul** : tu décris ce
que tu veux en langage courant, et les bons agents, skills et vérifications s'engagent.

> Nouveau sur Claude Code ? Lis ce document une fois de bout en bout. Après, tu peux presque l'oublier.

**Le projet :** site d'apprentissage web **en français seulement**. Phase 1 (août–octobre 2026) :
contenu public sans comptes, sujet prioritaire = **sécurité des applications web**. Frontend
**Angular 21** (standalone, signaux, `OnPush`, SCSS, SSR + prerender), **contenu-as-code** (Markdown
enrichi + JSON de quiz dans `content/`, compilés au build), backend **.NET 10** planifié mais
**squelette seulement**. Hébergement **Azure Static Web Apps Free**. **Le site doit exemplifier la
sécurité qu'il enseigne** — en-têtes, CSP, et **WCAG 2.2 AA, zéro violation AXE**.

---

## 1. Le modèle mental : une boucle de 4 agents

```
            tu décris une tâche
                    │
          ┌─────────▼──────────┐
          │ solution-architect │   planifie (au niveau fichier), signale les risques  ← lecture seule
          └─────────┬──────────┘
                    │ plan
          ┌─────────▼──────────┐
          │ feature-developer  │   écrit le code, passe lint + build + tests
          └─────────┬──────────┘
                    │ diff + preuves
          ┌─────────▼──────────┐
          │   code-reviewer    │   revue indépendante du diff                          ← lecture seule
          └─────────┬──────────┘
                    │ constats
          ┌─────────▼──────────┐
          │       mentor       │   écrit des leçons durables → lessons/lessons-learned.md
          └─────────┬──────────┘
                    │ (réinjectées dans la session SUIVANTE, pour tout le monde)
                    └──────────────────────────────────────────────►
```

Les deux relecteurs (architecte, `code-reviewer`) sont **en lecture seule à dessein** : un agent qui ne
peut pas éditer donne un vrai second avis au lieu de « corriger » discrètement pour faire passer sa
propre revue.

> **`devils-advocate`** (lecture seule) est un **5ᵉ agent conditionnel**, pas une étape du cœur de
> boucle : sur un plan non trivial ou une décision structurante (dépendance vs code maison, direction
> d'architecture, format de contenu, modèle de données), il conteste le plan de l'architecte *avant*
> que le développeur ne commence — une passe, puis l'architecte ou le propriétaire tranche. `git-ops`
> (plomberie), la **boucle sécurité** (§6b) et la **boucle contenu** (§6c) sont les autres greffons.

#### À quelle échelle convoquer l'architecte et l'avocat du diable

**Règle du propriétaire (2026-08-04).** `solution-architect` et — plus encore — `devils-advocate`
se convoquent **au début d'un epic, ou sur une grosse tâche** : celle qui demande de la recherche,
couvre une large surface, ou porte des **enjeux importants** (sécurité, accessibilité, contrat
partagé, coût, décision difficile à défaire). **Toute sous-tâche ne les mérite pas** — appeler un
architecte pour un lot dont le plan tient déjà dans le backlog ne produit qu'un tour de chauffe
payant.

| Ampleur | Architecte | Avocat du diable |
|---|---|---|
| Ouverture d'epic, direction technique, nouveau contrat partagé | oui | oui |
| Grosse sous-tâche : recherche à faire, plusieurs couches, décision peu réversible | oui | si la décision est structurante |
| Sous-tâche déjà spécifiée par le backlog (le plan **est** le brief) | non | non |
| Correctif de revue, gate à écrire, plomberie | non | non |

Le test pratique : **le backlog répond-il déjà à « quoi, où, avec quels gates » ?** Si oui, le plan
existe — passer directement à l'implémentation. Sinon, c'est qu'il y a une décision à prendre, et
c'est là que l'architecte gagne son coût.

Corollaire, dans l'autre sens : ne pas déléguer à un sous-agent ce que le fil principal fait sans
se saturer. Un sous-agent repart d'un **cache froid** (§budget de contexte) et son rapport doit
ensuite être revérifié — pour un lot court, c'est plus cher *et* moins bon. Ce qui vaut toujours la
délégation : le **volumineux** (suite e2e complète, audit large) et le **regard neuf indépendant**
(`code-reviewer`, `security-reviewer` sur un diff).

### Pourquoi une boucle et pas un gros agent ?

Chaque agent tourne dans **sa propre fenêtre de contexte** et ne rend qu'un résumé. La conversation
principale reste propre et — surtout — **le reviewer n'a jamais vu le raisonnement du développeur**,
donc il attrape ce que l'auteur s'était rationalisé. C'est le garde-fou qualité le plus efficace du
système.

---

## 2. Ce que contient ce dossier

| Chemin | Ce que c'est | Quand ça tourne |
|--------|--------------|-----------------|
| `agents/solution-architect.md` | Planificateur (lecture seule, **fable**/medium) | Proactivement, avant tout travail non trivial |
| `agents/devils-advocate.md` | Contradicteur du **plan** (lecture seule, **opus**/high) | Une fois par plan non trivial / décision structurante |
| `agents/feature-developer.md` | Implémenteur (tous les outils, **opus**/high) | Pour exécuter un changement convenu |
| `agents/code-reviewer.md` | Reviewer indépendant (lecture seule, **opus**/high) | Après tout changement, avant commit |
| `agents/mentor.md` | Gardien des leçons (**sonnet**/low) | Après une revue / un correctif épineux |
| `agents/git-ops.md` | Plomberie git/GitHub + suivi agile (**sonnet**/low) | Pour sortir le VCS du fil principal |
| `agents/security-auditor.md` | Auditeur OWASP profond (lecture seule, **opus**/high) | Sur `/security-audit` |
| `agents/security-reviewer.md` | Revue sécurité d'un diff (lecture seule, **opus**/high) | Sur tout diff sensible, avant fusion |
| `agents/security-mentor.md` | Gardien des leçons `S-0xx` (**sonnet**/low) | Après un audit / une revue sécurité |
| `agents/professeur-web.md` *(écrit par un autre agent)* | Transforme les fiches de la KnowledgeBase en **leçons pédagogiques** | Boucle contenu |
| `agents/verificateur-theorie.md` *(idem)* | **Contre-vérifie la théorie** d'une leçon | Boucle contenu, après le professeur |
| `skills/feature-cycle/SKILL.md` | Un point d'entrée qui déroule toute la boucle | `/feature-cycle …` ou automatique |
| `skills/security-audit/SKILL.md` | Audit OWASP complet (code + site déployé) → rapport + backlog | `/security-audit …` |
| `skills/lecon/SKILL.md` *(écrit par un autre agent)* | Orchestre la boucle **contenu** (professeur → vérificateur) | `/lecon …` |
| `rules/agent-context-budget.md` | Plafonds de contexte par sous-agent (**150k / 200k / 250k**) | Consulté avant toute délégation |
| `rules/budget-free-tier.md` | Règle **zéro dépense** — gratuit **ET** sans clé | Sur toute édition de dépendance / config cloud |
| `rules/security.md` | La barre sécurité par couche (checklist OWASP) | Sur toute édition sensible |
| `rules/angular-best-practices.md` | Cache local des bonnes pratiques Angular 21 (MCP `angular-cli`) | Sur toute édition frontend |
| `rules/contenu-pedagogique.md` | La barre du **contenu** : structure, ton, exactitude, schéma | Sur toute édition sous `content/**` |
| `lessons/lessons-learned.md` | La liste vivante des pièges de l'équipe (`L-0xx`) | Réinjectée à chaque session |
| `lessons/security-lessons.md` | Les leçons de sécurité durables (`S-0xx`) | Lue par les agents sécurité |
| `hooks/inject-context.mjs` | Charge les règles + les leçons au démarrage de session | Hook `SessionStart` |
| `hooks/post-edit-guardrail.mjs` | Rappelle quelle vérification/skill correspond à chaque édition | Hook `PostToolUse` |

Documents de référence hors `.claude/` : `docs/agile/backlog-phase-1.md` et `docs/agile/roadmap.md`
(le plan — **au démarrage, le dépôt n'a pas encore de code : la vérité est là**),
`docs/architecture/stack-et-architecture.md` (la cible technique),
`docs/contenu/pipeline-contenu.md` (schéma et compilation du contenu).

---

## 3. Comment ça se déclenche **sans que tu demandes**

Trois mécanismes indépendants, pour que rien ne dépende de la « mémoire » du modèle :

1. **Délégation automatique.** Claude lit le champ `description:` de chaque agent et délègue quand ça
   correspond. Les descriptions portent des formules déclencheuses — *« Use PROACTIVELY »*, *« MUST BE
   USED after any code change »* — qui est la façon documentée de rendre la délégation automatique. Tu
   peux toujours en forcer un avec `@agent-code-reviewer …`.
2. **Les hooks = automatisation déterministe** (la garantie la plus forte : ils ignorent le jugement du
   modèle) — `SessionStart` injecte les règles et les leçons ; `PostToolUse` regarde le fichier
   modifié et glisse un rappel court (frontend → skill `angular` + `npm run lint`/`build`/`test`, WCAG
   AA ; `content/**` → boucle contenu + `contenu-pedagogique.md` ; config de déploiement/dépendances →
   `security.md` + `budget-free-tier.md`). Ça ne bloque jamais : ça pousse.
3. **Routage par `CLAUDE.md`.** Le `CLAUDE.md` racine contient une section « système d'agents » qui dit
   au fil principal de faire passer le vrai travail par la boucle. `CLAUDE.md` est chargé dans chaque
   session **et** chaque sous-agent : la politique est toujours présente.

Les hooks sont écrits en **Node** (pas en bash + `jq`) : machine Windows, Node garanti présent, aucun
prérequis supplémentaire, comportement identique partout.

---

## 4. Au jour le jour

- **Parle normalement.** « Ajoute la page d'index des leçons », « corrige le rendu des blocs de code »,
  « rends le quiz accessible au clavier » : les bons agents s'engagent.
- **Dérouler toute la boucle à la demande :** `/feature-cycle ajoute le sommaire d'une leçon`.
- **Forcer un agent :** `@agent-solution-architect planifie le moteur de quiz`.
- **Écrire du contenu :** `/lecon …` — **pas** `/feature-cycle` (voir §6c).

### ⚠️ Redémarre pour charger un agent neuf ou modifié

Claude Code lit `agents/*.md` **au démarrage de session**. Un fichier créé ou édité sur disque (comme
ceux-ci) se charge **à la session suivante** — redémarre (ou `/clear`). En attendant, les skills
déroulent chaque étape en ligne.

---

## 5. La boucle d'apprentissage (comment le « mentor » enseigne vraiment)

Les sous-agents n'ont pas de mémoire entre les runs : « enseigner au développeur et au reviewer » ne
peut donc pas être une conversation — il faut un **fichier que tous lisent au démarrage**. C'est
`lessons/lessons-learned.md` :

1. Le `code-reviewer` repère une erreur récurrente (il l'annote « → mentor : leçon candidate »).
2. Le `mentor` la distille en leçon numérotée (Symptôme / Règle / Réfs) et **cure** le fichier — il
   fusionne les doublons et élague le périmé ; c'est un jardinier, pas un journal.
3. Le hook `SessionStart` réinjecte le fichier la fois suivante : l'architecte, le développeur et le
   reviewer démarrent déjà au courant. La boucle se referme d'elle-même.

Le fichier démarre **vide** (`L-001` sera la première vraie leçon du projet) — c'est normal.

---

## 6b. La boucle sécurité (sœur spécialisée de la boucle principale)

Ce site **enseigne la sécurité des applications web** : une faiblesse chez nous n'est pas seulement un
risque, c'est une **contradiction publique**. La sécurité est donc un **workflow permanent**.

```
        /security-audit  (skill)  ← sûr par défaut ; le DAST --actif est opt-in, local/préprod
                │  reconnaissance → STRIDE → checklist OWASP → outils gratuits ET sans clé
        ┌───────▼──────────┐
        │ security-auditor │  audite code + contenu + site déployé → constats (CVSS + OWASP/CWE)
        └───────┬──────────┘                                                   ← lecture seule, opus
                │  rapport (docs/securite/audit-<date>.md) + tickets de backlog
        ┌───────▼──────────┐   (correctifs via /feature-cycle — le diff reçoit aussi un…)
        │ security-reviewer│  revue sécurité seule du diff                     ← lecture seule, opus
        └───────┬──────────┘
        ┌───────▼──────────┐
        │  security-mentor │  leçon S durable → lessons/security-lessons.md            ← sonnet
        └──────────────────┘   re-test = Definition of Done → le ticket ferme
```

- **La barre** est `rules/security.md`. Les leçons vivent dans `lessons/security-lessons.md` (`S-0xx`).
- **Ce qui compte vraiment en phase 1** (pas de comptes, pas de base de données, pas d'API déployée) :
  **assainissement du Markdown rendu** (une leçon sur le XSS contient des charges utiles d'exemple qui
  doivent s'**afficher**, jamais s'exécuter), **CSP et en-têtes réellement servis** par la
  configuration Static Web Apps, **fuites SSR / artefacts publiés**, **chaîne d'approvisionnement et
  CI**. L'authentification et les données personnelles arrivent en **phase 2**.
- **Ça se déclenche seul** : le garde-fou `PostToolUse` pointe vers `security.md` +
  `security-lessons.md` et vers une passe `security-reviewer` sur toute édition sensible.
- **Lancer un audit :** `/security-audit local` (statique), `deploye` (+ sondes live non intrusives —
  sûr en production), `complet`, ou `--actif <url locale ou de préprod>` (ZAP/Nuclei — **jamais** la
  production). Sortie : un rapport daté + le backlog vivant `docs/securite/backlog-securite.md`.
- **Budget :** tout l'outillage est gratuit **ET** sans clé — même règle dure que
  `rules/budget-free-tier.md`.

---

## 6c. La boucle contenu (écrite par une autre équipe d'agents — ne pas la court-circuiter)

Le contenu pédagogique du site a **sa propre boucle**, distincte de la livraison logicielle :

```
        /lecon (skill)  ← orchestre la production d'une leçon depuis la KnowledgeBase
                │
        ┌───────▼──────────┐
        │  professeur-web  │  transforme une fiche de la KnowledgeBase en LEÇON pédagogique
        └───────┬──────────┘         (Markdown enrichi + quiz JSON dans content/)
        ┌───────▼──────────┐
        │verificateur-     │  CONTRE-VÉRIFIE la théorie (exactitude, sources, à-jour)
        │theorie           │
        └──────────────────┘
```

**La règle de partage à retenir :** `/feature-cycle` construit le **moteur** (schéma, validation,
compilation, rendu, routage, styles, tests) ; `/lecon` produit le **contenu** (`content/**`). Le
`feature-developer` n'écrit **jamais** de leçon — au plus un échantillon de test clairement identifié.
`professeur-web` et `verificateur-theorie` n'écrivent **jamais** de code applicatif. La barre du
contenu est `rules/contenu-pedagogique.md` ; le schéma et la compilation sont dans
`docs/contenu/pipeline-contenu.md` — c'est le **contrat** qui relie les deux boucles : si le schéma
change, les deux côtés bougent ensemble.

---

## 7. Coût & contexte — quel modèle où, et comment garder les sessions bon marché

Chaque sous-agent émet ses **propres** requêtes : une boucle d'agents, c'est là que partent les
crédits. La solution n'est pas « moins d'agents », c'est **le bon modèle par métier** plus de la
discipline de contexte. Règle : **planification → modèle de session (Fable) ; implémentation/revue →
Opus ; mécanique → Sonnet.**

| Agent | Modèle | Effort | Pourquoi |
|-------|--------|--------|----------|
| `solution-architect` | **fable** | **medium** | Peu volumineux (~3 % de l'usage) mais l'étape la plus dense en raisonnement — le pire endroit où rogner. À `low`, Fable pattern-matche et lit moins de contexte → plans superficiels. **Repli manuel** (pas de fallback conditionnel dans le frontmatter) : si l'architecte refuse de démarrer (« modèle indisponible »), bascule sur `model: opus` / `effort: high`. |
| `devils-advocate` | **opus** | **high** | Contre-expertise du **plan** — une passe par décision structurante ; il faut du raisonnement pour proposer une alternative crédible. |
| `feature-developer` | **opus** | **high** | La plus grosse dépense du système ; Opus implémente aussi bien pour une fraction du prix du modèle de session. |
| `code-reviewer` | **opus** | **high** | La revue indépendante du diff est le principal filet qualité. |
| `mentor` | **sonnet** | **low** | Curation mécanique d'un fichier markdown sous instructions strictes. |
| `git-ops` | **sonnet** | **low** | Plomberie git/`gh` déterministe — zéro raisonnement produit. |
| `security-auditor` | **opus** | **high** | Modélisation de menaces + cotation — dense en raisonnement. |
| `security-reviewer` | **opus** | **high** | Le filet sécurité sur le code neuf — même palier que `code-reviewer`. |
| `security-mentor` | **sonnet** | **low** | Curation mécanique du fichier de leçons de sécurité. |

Pour changer un palier, édite le `model:` (`fable`/`opus`/`sonnet`/`haiku`/`inherit`) et/ou l'`effort:`
(`low`/`medium`/`high`/`xhigh`/`max`) de l'agent. Le changement se charge à la **session suivante**.

> **Gates CLI « shift-left » (qualité à zéro token).** Le `feature-developer` lance les gates statiques
> **avant** le build et les tests : ce qu'une CLI attrape gratuitement coûterait des tokens Opus chez
> le reviewer. Frontend : **`npm run lint`** (typage, variables inutilisées, accessibilité des
> gabarits) puis **`npm run build`** (typecheck complet + compilation du contenu) puis **`npm test`**.
> Backend, **quand il existera** : `dotnet build` + `dotnet test`.
> ⚠️ **Piège Prettier :** ne `--write` que les fichiers que tu as **créés** — un `--write` global sur un
> fichier existant reformate tout et enterre un correctif de 20 lignes sous des centaines de lignes de
> bruit.

> **Pourquoi pas d'agent « coordinateur » ?** Un sous-agent ne peut pas en appeler un autre : un agent
> coordinateur serait incapable de déléguer. Le coordinateur est — et doit rester — **le fil
> principal**, piloté par le skill `feature-cycle`. Ce skill **est** le câblage d'orchestration.

**Hygiène de contexte (l'autre moitié de la facture) — `rules/agent-context-budget.md` :**

- **Plafonds durs : 150k visé · 200k toléré · 250k maximum absolu.** C'est **par agent** : trois agents
  à 120k valent mieux qu'un à 300k.
- **Un sous-agent = UN livrable vérifiable.** Test du « + » : si le brief dit « … **et** les e2e » ou
  « … **et** la clôture documentaire », c'est **≥ 2 agents**. Confie une sous-tâche, pas une épopée.
- **`SendMessage` ne va jamais vers un agent saturé** : reprendre un agent lourd **recharge tout son
  transcript**. Les **correctifs de revue partent vers un agent frais** — une liste `fichier:ligne` +
  correctif est déjà un brief autonome.
- **Les gates lourds sortent du contexte de l'implémenteur** : suite e2e complète, build de production,
  vérification live des en-têtes → **agent de vérification jetable** ou fil principal.
- **La plomberie n'est pas du travail de développeur** : commit, branche, PR, CI, mise à jour de
  `docs/agile/backlog-phase-1.md` → **`git-ops` (Sonnet)**.
- **`/compact`** après une étape lourde (MCP, gros diff, e2e) ; **`/clear`** au changement de tâche.

---

## 8. Optionnel : moins d'invites de permission

Volontairement **hors** du `settings.json` commité (un fichier partagé ne doit pas élargir en silence
ce que l'agent peut lancer). Si **tu** veux moins d'invites, colle ceci dans
`.claude/settings.local.json` (ton fichier personnel, ignoré par git) — relis-le d'abord, c'est ton
choix :

```jsonc
{
  "permissions": {
    "allow": [
      "Bash(npm run:*)", "Bash(npm test:*)", "Bash(npx ng:*)", "Bash(npm audit:*)",
      "Bash(git status:*)", "Bash(git diff:*)", "Bash(git add:*)", "Bash(git commit:*)",
      "mcp__angular-cli__get_best_practices", "mcp__angular-cli__find_examples",
      "mcp__angular-cli__search_documentation", "mcp__angular-cli__list_projects"
    ],
    "ask": ["Bash(git push:*)"]
  }
}
```

---

## 9. Origine et réutilisation

Ce système est **porté** depuis celui d'un projet précédent (AbrisTempo Local, §9 de son README) :
même squelette — boucle architecte → avocat du diable conditionnel → développeur → reviewer → mentor,
plus `git-ops` et la boucle sécurité — mais **adapté** à Dr. Je-Sais-Tout : pas de backend en phase 1,
un **moteur de contenu** à la place des domaines métier, du **français seul** au lieu du bilingue, et
une boucle **contenu** en plus. Ce qui se transporte tel quel : les relecteurs en lecture seule, un
agent frais par sous-tâche, les gates lourds hors de l'implémenteur, les descriptions d'agents
orientées **comportement** (« planifie », « révise », « implémente ») qui restent agnostiques de la
pile, et le tiering de modèles du §7.

---

## 10. Entretien du système — éviter le « tissu cicatriciel »

Ce harnais a été construit **avant** la première ligne de code, ce que la KB signale comme un risque
(`KnowledgeBase/ai/agents/claude-code/philosophie-interne.md` : « delete your CLAUDE.md », partir nu
et n'ajouter une règle que pour un problème **répété**). On assume ce choix — le système est porté
d'un projet où il a fait ses preuves — mais il se paie en entretien :

- **Chaque règle/skill/hook doit mériter sa place.** Après chaque epic (et à chaque nouveau modèle),
  repasser sur `rules/` et `skills/` : ce qui n'a jamais servi ou que le modèle fait déjà bien tout
  seul se **supprime**. Un garde-fou jamais déclenché est du contexte facturé à chaque session.
- **Corriger le contexte, pas seulement le code** : quand un agent bute, la correction durable va
  dans la règle/le skill/la leçon concernés (boucle mentor), pas seulement dans le fichier produit —
  mais une seule ligne à la fois, pour un problème réellement observé.
- **Boucle séquentielle par défaut** : le fan-out parallèle neutralise le cache de préfixe (voir
  `rules/agent-context-budget.md` §6) ; réserver le parallèle aux lectures indépendantes.
- **La qualité plafonne à celle du vérificateur.** Pour le code, ce sont les gates CLI ; pour le
  contenu pédagogique, ce sont les **schémas JSON + validation au build** (E2-ST1) qui empêchent le
  `verificateur-theorie` de valider complaisamment. Renforcer le vérificateur avant d'ajouter des
  agents.

*Construit à partir de la documentation Claude Code (sous-agents, hooks, settings, skills) et des
fiches `ai/agents/claude-code/*` de la KnowledgeBase.*
