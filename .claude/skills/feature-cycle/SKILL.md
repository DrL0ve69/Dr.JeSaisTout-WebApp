---
name: feature-cycle
description: >-
  Runs the full architect → devils-advocate → developer → reviewer → mentor delivery loop for a
  feature or bug fix on Dr. Je-Sais-Tout (Angular 21 app, content engine, .NET skeleton). Use
  when the user asks to build/implement/fix something non-trivial, or types /feature-cycle.
  Orchestrates the project's subagents and closes the learn loop. NOT for writing lesson
  content — that goes through the `lecon` skill and the content agents.
argument-hint: [ce qu'il faut construire ou corriger]
---

# Cycle de livraison d'une fonctionnalité

Fais passer un changement dans la boucle d'agents **depuis la conversation principale** (les
sous-agents ne peuvent pas s'appeler entre eux : **c'est toi, le fil principal, le coordinateur**).
Ajuste la cérémonie à la tâche : va directement à l'étape 2 pour un changement d'une ligne ; déroule
toute la boucle dès que ça touche plusieurs fichiers, un contrat, un schéma de contenu ou le pipeline
de build.

**Tâche :** $ARGUMENTS

## ⚠️ Ce cycle ne couvre PAS le contenu pédagogique

Les fichiers sous **`content/**`** (Markdown des leçons, JSON des quiz) relèvent de la **boucle
contenu** : le skill **`lecon`** orchestre **`professeur-web`** (transforme les fiches de la
KnowledgeBase en leçons) puis **`verificateur-theorie`** (contre-vérifie la théorie), selon
`.claude/rules/contenu-pedagogique.md` et `docs/contenu/pipeline-contenu.md`. `/feature-cycle`
construit le **moteur** (schéma, validation, compilation, rendu, routage, styles, tests). Si la
demande mélange les deux, **découpe-la** et dis à l'utilisateur quelle moitié part vers `lecon`.

## La boucle

1. **Planifier — `solution-architect`.** Délègue la demande au sous-agent `solution-architect`. Il
   rend un plan au niveau fichier (fichiers touchés, contrats, impact sur le build de contenu,
   risques, plan de vérification, **découpage en sous-tâches**). Lis-le ; s'il fait apparaître une
   vraie décision qui appartient à l'utilisateur, demande **avant** de coder.
   > Au démarrage du projet, le dépôt n'a pas encore de code : le plan de référence est
   > `docs/agile/backlog-phase-1.md`, `docs/agile/roadmap.md` et
   > `docs/architecture/stack-et-architecture.md`.

   **1b. Contester — `devils-advocate`** (plans non triviaux / décisions structurantes seulement).
   Passe le plan à `devils-advocate` (Opus, lecture seule) : il conteste les choix structurants
   (dépendance vs code maison, format de contenu, modèle de données, direction) et propose des
   alternatives. **Boucle fermée obligatoire : renvoie ensuite les objections à l'architecte pour une
   2ᵉ passe**, d'où il doit sortir un **plan v2 finalisé** qui, objection par objection, **défend** le
   choix initial ou **amende / change de cap**. Le `feature-developer` ne reçoit **que ce plan v2**,
   jamais la v1 antérieure au défi. Si un désaccord de fond persiste, présente le pour/contre à
   l'utilisateur pour arbitrage. **Une seule passe d'avocat** — une fois la v2 arrêtée, on ne
   re-litige pas (contrairement au `security-reviewer`, qui repasse sur chaque diff sensible). On saute
   cette étape pour les petits correctifs.
   > Astuce contexte : l'avocat du diable et l'architecte font de la recherche web, lente et coûteuse.
   > Tu peux les lancer **en arrière-plan** et récupérer leur synthèse ensuite.

2. **Implémenter — `feature-developer`** (ou fais-le toi-même dans le fil principal pour un petit
   changement). **Découpe d'abord, délègue UNE sous-tâche à la fois.** Le plan de l'architecte découpe
   déjà le travail : confie au développeur **une** sous-tâche avec **seulement** le contexte qu'elle
   exige — jamais « implémente l'épopée X ». Relance un sous-agent **frais** par sous-tâche plutôt que
   d'enchaîner dans un seul contexte : un sous-agent ne peut pas se `/compact` lui-même, son isolation
   vient du **périmètre de son prompt** (`.claude/rules/agent-context-budget.md` : **150k visé, 200k
   toléré, 250k maximum absolu**). **Test du « + »** : si le brief dit « … **et** les e2e » ou
   « … **et** la clôture documentaire », c'est **≥ 2 agents**.
   Le frontend suit le skill `angular` + `.claude/rules/angular-best-practices.md` (cache local du
   MCP — n'appeler `get_best_practices` que si le fichier manque ou après une montée de version
   majeure). Reproduis un bug par un test qui échoue **avant** de le corriger, puis traite la cause
   racine. Le hook `PostToolUse` (`.claude/hooks/post-edit-guardrail.mjs`) rappellera, fichier par
   fichier, quelle vérification s'applique.

3. **Vérifier.** Lance les vraies commandes et garde leur sortie comme preuve :
   - **Gates statiques D'ABORD (zéro token — ce qu'une CLI attrape n'atteint jamais le reviewer
     Opus)** : **`npm run lint`** → 0 erreur sur les fichiers touchés ; **`npm run build`** = typecheck
     complet **et** compilation du contenu (un build cassé est un échec de gate, pas une nuisance).
   - **`npm test`** (tests unitaires + axe). Ajoute un scénario e2e/axe pour toute route nouvellement
     rendue.
   - **Routes de contenu** : confirme qu'elles sont bien **prerendues** et lisibles **sans JS**, et
     qu'un fichier de contenu malformé fait **échouer le build** avec un message nommant le fichier.
   - **Backend, seulement quand il existe** : `dotnet build` puis `dotnet test`.
   - ⚠️ Formatage : ne `prettier --write` que les fichiers **créés** ; sur un fichier existant, respecte
     le style environnant à la main (sinon un correctif de 20 lignes disparaît sous du bruit).
   - **Gates lourds hors implémenteur** : suite e2e complète, `build` de production, vérification live
     des en-têtes → **agent de vérification dédié et jetable**, ou fil principal.

4. **Réviser — `code-reviewer`.** Délègue une revue à contexte **frais** du diff au sous-agent
   `code-reviewer` (lecture seule, il n'a pas vu ton raisonnement — c'est le but). Si le diff touche la
   configuration de déploiement, les en-têtes/CSP, le rendu de contenu, les dépendances, la CI ou le
   SSR, lance **aussi** `security-reviewer` (en parallèle). Traite chaque constat
   **Critique/Majeur** ; les broutilles sont optionnelles. **Ne laisse jamais l'implémenteur signer son
   propre diff.**
   > **Les correctifs de revue partent vers un agent FRAIS.** Une liste `fichier:ligne` + correctif est
   > déjà un brief autonome : reprendre par `SendMessage` un agent déjà saturé **recharge tout son
   > transcript** et coûte plus cher que d'en lancer un neuf. Vérifie le `subagent_tokens` rapporté :
   > au-delà de 200k, le tour suivant part d'un agent neuf, point.

5. **Capitaliser — `mentor`.** Si la revue (ou le correctif) a révélé un piège récurrent ou non
   évident, délègue au sous-agent `mentor` pour l'inscrire dans `.claude/lessons/lessons-learned.md`
   (et au `security-mentor` pour `.claude/lessons/security-lessons.md` si c'est sécuritaire). Ce
   fichier est réinjecté à la session suivante par `.claude/hooks/inject-context.mjs` : la leçon
   atteint tout le monde automatiquement.

6. **Clôturer.** Résume ce qui a changé, les preuves (commandes + résultats) et la leçon éventuelle.
   Branche de fonctionnalité, jamais la branche par défaut ; Conventional Commit en français ; on ne
   commite/pousse que si l'utilisateur le demande. **Délègue la plomberie git — indexation, message de
   commit, branche, PR `gh`, surveillance CI, mise à jour de `docs/agile/backlog-phase-1.md` — au
   sous-agent `git-ops` (Sonnet)** au lieu d'y brûler des tokens Opus du fil principal. Donne-lui le
   résumé du diff + les preuves de gates verts ; la décision de *quoi* commiter reste au fil principal.

## Portée d'une invocation — jusqu'où aller sans rendre la main

**Par défaut, accomplis tout le cycle sans que le propriétaire ait à intervenir.**

**Garde-fou de contexte — obligatoire.** Si le lot est trop gros pour tenir dans la *smart zone* du fil
principal (dépassement prévisible de 150–200k), n'essaie pas d'aller au bout :

1. Termine **toutes les sous-tâches d'UNE tâche**, ou 2 à X tâches selon ce qui tient.
2. **Arrête-toi proprement** : mets à jour le pointeur dans `docs/agile/backlog-phase-1.md`, résume ce
   qui est fait et ce qui reste, et **rends la main pour un `/clear`**.

> **En cas de doute sur le dépassement, `/feature-cycle` se comporte comme une seule tâche puis rend
> la main.** Le doute tranche toujours vers le petit périmètre : un fil saturé produit du code de
> moins bonne qualité.

## Hygiène de contexte (coordinateur)

- **Résumés, jamais de diffs complets.** Exige du `feature-developer` et des reviewers un **résumé +
  liste de fichiers + lignes de preuve** (pass/fail des commandes) — jamais le diff intégral ni les
  dumps d'exploration. Le reviewer relit le diff avec `git diff`, pas dans le fil principal.
- **Suggère `/compact`** après l'implémentation et après toute étape lourde (MCP, e2e, axe).
- **`/clear` au changement de tâche** — ne poursuis jamais une tâche indépendante dans une session déjà
  chargée.
- **Un `feature-developer` à la fois** (pas d'implémenteurs parallèles) ; groupe les revues en lecture
  seule aux frontières de lot.

## Notes

- Les fichiers d'agents créés ou modifiés se chargent à la **session suivante** (redémarrage/`/clear`),
  pas en cours de session. Si un sous-agent n'est pas encore disponible, déroule la même étape en ligne
  avec le skill correspondant (`angular`, `solid-review`) et la commande `/code-review`, puis
  redémarre.
- Vue d'ensemble du système : `.claude/README.md`.
