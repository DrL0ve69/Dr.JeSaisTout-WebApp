# Budget de contexte des sous-agents — règle dure (Dr. Je-Sais-Tout)

> **Ce que c'est.** Une contrainte **non négociable** posée par le propriétaire : un sous-agent doit
> finir sa tâche **dans sa smart zone**. Au-delà, la qualité chute *et* chaque token relu est refacturé.
> Cousine de `.claude/rules/budget-free-tier.md` (axe **argent**) — celle-ci est l'axe **contexte**.
>
> **Plafonds :** **150k visé · 200k toléré · 250k maximum absolu, à éviter.**
> C'est **par agent**, pas par tâche : trois agents à 120k valent mieux qu'un à 300k.
>
> **Nuance KB (à lire avec les plafonds).** La « zone intelligente » d'un agent se dégrade bien
> avant les plafonds : ~**100–140k** selon la KB
> (`KnowledgeBase/ai/agents/claude-code/methode-travail.md` — « 1 ticket = 1 fenêtre de contexte »).
> Les seuils ci-dessus sont donc des **plafonds d'alerte**, pas des cibles : dimensionner chaque lot
> pour **finir sous ~120k** ; 150k = signal de découpe manquée, 200k+ = post-mortem du brief.

---

## 1 · Les deux fautes qui font exploser un agent (précédent mesuré sur le projet frère AbrisTempo)

| Run | Périmètre donné | Tokens |
|---|---|---|
| ST-4.E implémentation | composant admin + 2 e2e neufs + 1 e2e étendu + 4 docs + **suite e2e complète** | **294k** ❌ |
| Correctifs de revue | **reprise** (`SendMessage`) du même agent | **301k** ❌ |
| Round-trip live L-001 | agent **frais**, scope étroit, vérification seule | **137k** ✅ |

Ce tableau vient du projet frère **AbrisTempo Local**, gardé ici comme précédent réel — pas comme
mesure propre à Dr. Je-Sais-Tout, dont l'historique est encore à écrire. Les deux fautes qu'il illustre
restent générales :

**Faute n°1 — le brief était court, le PÉRIMÈTRE ne l'était pas.** Un brief de 3 lignes qui dit
« implémente §X » n'est court qu'en apparence si la section couvre plusieurs lots. Ce n'est **pas** la
longueur du brief qui coûte : c'est le nombre d'allers-retours que le périmètre impose.

**Faute n°2 — `SendMessage` à un agent saturé repart de son CUMUL.** Reprendre un agent déjà à 200k+
pour appliquer quelques constats de revue le pousse au-delà du max ; le même correctif confié à un
agent **frais** tient en une fraction du coût. La reprise ne « continue » pas à coût nul — elle
**recharge tout le transcript**.

---

## 2 · Découper — un agent = UN livrable vérifiable

- [ ] **Test du « + »** : si le brief contient « **et** e2e » ou « **et** la clôture documentaire »,
      c'est **≥ 2 agents**. Un lot = une chose qu'on peut déclarer verte seule.
- [ ] **Ordre de grandeur** : un agent qui dépasse ~**60 appels d'outils** est en train de déborder —
      c'est le signal à surveiller (précédent AbrisTempo : 124 appels sur le run à 294k).
- [ ] **Découpe type d'une sous-tâche « lourde »** : (a) le composant/la leçon + ses tests unitaires ·
      (b) les e2e/vérifications d'accessibilité · (c) la clôture documentaire. Chacun repart **frais**,
      avec le pointeur `fichier:ligne` (ou `section#`) du plan.
- [ ] Le plan par sous-tâche (`docs/agile/backlog-phase-1.md` ou équivalent) **est** le brief : passe
      la **section** visée, jamais le document entier (voir L-001 dans `.claude/lessons/lessons-learned.md`).

## 3 · Ne jamais reprendre un agent au-delà de ~150k

- [ ] **Correctifs de revue → agent FRAIS.** Une revue produit une liste de constats
      `fichier:ligne` + correctif : c'est *exactement* un brief autonome. Aucun besoin du transcript
      d'implémentation.
- [ ] `SendMessage` reste bon pour un **échange court sur un agent encore léger** (< ~150k) — pas pour
      relancer un chantier sur un agent déjà lourd.
- [ ] Vérifie le `subagent_tokens` rapporté à chaque retour. **S'il dépasse 200k, le prochain tour
      part d'un agent neuf**, point.

## 4 · Sortir les gates lourds du contexte de l'implémenteur

Un implémenteur ne doit pas porter la sortie d'une suite de tests/e2e complète.

- [ ] **Suite e2e/a11y complète**, `npm run build` bilingue (si i18n), vérification de contenu
      pédagogique de bout en bout → **agent de vérification dédié et jetable**, ou fil principal.
- [ ] L'implémenteur ne lance que les gates **ciblés** de son lot : `lint`, `build`, tests unitaires,
      specs e2e **qu'il a touchées**.
- [ ] Exige un **retour ≤ 15-20 lignes** avec des **chiffres**, jamais des logs collés.

## 5 · La plomberie n'est pas du travail de développeur

- [ ] **Clôture documentaire** (backlog, board, audits, notes datées) → agent scribe (Sonnet). C'est
      du travail de scribe : le facturer au prix d'un implémenteur Opus est un gaspillage pur.
- [ ] Commit/branche/PR/surveillance CI → agent scribe également.

## 6 · Séquentiel par défaut — le parallèle coûte le cache

- [ ] **La boucle de livraison est séquentielle** (architecte → développeur → reviewer) : lancer les
      agents en séquence « chauffe » le cache de préfixe (~×1,4 le coût d'un agent seul) ; N agents
      **en parallèle** repartent chacun d'un cache froid (~×N). Réf. KB :
      `ai/agents/cout-exploitation-flotte.md`.
- [ ] Le **fan-out parallèle** se réserve aux cas où l'indépendance vaut son prix : revues
      **read-only** indépendantes, exploration multi-pistes dont on ne garde qu'une, lots réellement
      disjoints. Jamais deux implémenteurs en parallèle sur le même code.

---

**Avant de déléguer, trois questions :** le lot est-il **un** livrable vérifiable (§2) ? l'agent visé
est-il **frais** ou déjà lourd (§3) ? les gates lourds sont-ils **sortis** de son périmètre (§4) ?
Au moindre doute — **découpe**. Un agent coupé à 250k a coûté plus cher que deux agents à 120k, et il
rend un travail moins bon.
