# Vision produit — Dr. Je-Sais-Tout

> Site d'apprentissage web **en français**, construit par un développeur solo (AEC Programmeur Web,
> portfolio 2026) outillé de Claude Code. Ce document fixe la mission, les publics, les phases et les
> critères de succès. Les choix techniques sont dans
> [`docs/architecture/stack-et-architecture.md`](architecture/stack-et-architecture.md) ; le plan
> d'exécution dans [`docs/agile/roadmap.md`](agile/roadmap.md) et
> [`docs/agile/backlog-phase-1.md`](agile/backlog-phase-1.md).

---

## 1 · Mission

**Transformer une base de connaissances personnelle en une plateforme d'apprentissage interactive,
rigoureuse et gratuite** — en commençant par refaire, mieux que l'original, le cours de sécurité des
applications web (420-B10-HU) que son auteur reprend d'août à octobre 2026.

Trois convictions fondatrices :

1. **Apprendre en construisant.** Le site est lui-même l'exercice : il *exemplifie* la sécurité qu'il
   enseigne (CSP stricte, en-têtes durcis, `npm audit` vert). Un cours de sécurité web servi par un
   site vulnérable n'aurait aucune crédibilité.
2. **Le contenu est du code.** Les leçons vivent en Markdown versionné, les quiz et simulations en
   JSON, compilés au build. Pas de CMS, pas de base de données tant que le besoin n'existe pas.
3. **Zéro dépense, zéro compromis.** Hébergement gratuit, services sans clé, qualité
   professionnelle : WCAG 2.2 AA, zéro violation AXE, design unique « anti AI-slop ».

## 2 · Publics

| Horizon | Public | Besoin servi |
|---|---|---|
| **Phase 1 (2026)** | Étudiants de cégep en sécurité des applications web — au premier chef l'auteur lui-même, qui reprend le cours 420-B10-HU août–octobre 2026 | Un cours complet, corrigé et à jour (Top 10 2021 **et** 2025, encadrés « ce que le cours dit vs l'état de l'art »), avec quiz et simulations pour préparer les examens |
| Phase 1+ | Étudiants de l'AEC Programmeur Web et autodidactes francophones | Contenu de sécurité web rare en français, exemples en PHP (cours) **et** C#/TypeScript (industrie) |
| Phase 3 | Apprenants web au sens large | Tous les cours de l'AEC + sujets absents du cursus (IA, déploiement, sécurité) |
| Phase 4 | Élèves maternelle → université et leurs parents | Tutorat et accompagnement de projets |

## 3 · Les quatre phases

### Phase 1 — Cours de sécurité web public *(août → octobre 2026)* — **priorité ferme**

- Une page d'accueil simple et signée, avec un lien vers **un seul cours** : sécurité des
  applications web.
- Le cours complet : 13 modules dérivés des fiches de
  `KnowledgeBase/web/securite/carte.md`, dans son ordre de lecture (fondations → familles
  d'attaques → identités et données → durcissement).
- Exercices : quiz interactifs, code annoté vulnérable/corrigé côte à côte, simulations
  pas-à-pas visuelles. **Pas** de labo exécutable, **pas** de comptes.
- Progression sauvegardée en `localStorage` uniquement.
- **Couche « jeu », restreinte** *(décidée le 2026-08-17)* : le site reprend de boot.dev sa **carte
  de parcours** (les 13 modules en chemin visible, état de chacun) et sa notion de **maîtrise** (un
  module se marque maîtrisé au quiz réussi, jamais au temps passé). Il **refuse** la série
  quotidienne, les ligues, les classements et la monnaie virtuelle — dark patterns documentés,
  impossibles sans compte, et sans usage réel ici. Périmètre détaillé : backlog §E2-ST6.
- Site 100 % statique (Angular prerendu) sur **Azure Static Web Apps Free**.
- En fin de phase, si le temps le permet : squelette backend .NET 10 (sans fonctionnalité exposée).

### Phase 2 — Backend comptes et progression *(hiver 2027)*

- API .NET 10 C# (Clean Architecture allégée, conventions du projet frère
  `AbrisAutoOutaouais-WebApp`) : comptes, progression synchronisée, scores de quiz.
- Azure Container Apps (free grant) + Azure SQL S0 sur le crédit étudiant (~120 $).
- Migration douce : le `localStorage` de la phase 1 s'importe dans le compte.

### Phase 3 — Multi-sujets depuis la KnowledgeBase *(2027)*

- Industrialisation du pipeline contenu : chaque domaine de la KB (web, cs, ai…) devient un cours.
- Navigation par sujets, recherche, parcours croisés entre domaines voisins.
- Couvrir les cours de l'AEC + les trous du cursus (IA, déploiement, sécurité avancée).

### Phase 4 — Tutorat / plateforme *(horizon ouvert)*

- Plateforme de tutorat maternelle → université : soumission de sujets/projets, accompagnement,
  éventuellement monétisation. Périmètre à redéfinir quand les phases 1–3 auront livré.

## 4 · Critères de succès — Phase 1

| # | Critère | Mesure |
|---|---|---|
| S1 | **Cours complet en ligne avant fin octobre 2026** | 13/13 modules publiés sur l'URL SWA |
| S2 | **Utilisable pour la reprise du cours de l'auteur** | Premier bloc (fondamentaux, CVSS, injection, XSS) en ligne mi-septembre, avant les premières évaluations |
| S3 | Chaque module = leçon + quiz (+ simulation quand pertinent) | Gates du pipeline `/lecon` verts (`docs/contenu/pipeline-contenu.md`) |
| S4 | Accessibilité irréprochable | WCAG 2.2 AA, **zéro** violation AXE sur toutes les pages |
| S5 | Le site exemplifie ce qu'il enseigne | CSP stricte sans `unsafe-inline`, en-têtes durcis, `npm audit` sans vulnérabilité haute/critique, audit `security-audit` passé |
| S6 | Zéro dépense | 0 $ dépensé ; SWA **Free** uniquement (`.claude/rules/budget-free-tier.md`) |
| S7 | Performance | Lighthouse ≥ 90 (perf, a11y, best practices, SEO) sur home et pages de leçon |
| S8 | Design distinctif | Direction visuelle **« Moniteur ambre »** appliquée (`docs/design/direction-visuelle.md`), garde-fous G1–G11 tenus, pas de rendu « template ». ⚠️ **Thème sombre seul** en phase 1 : le thème clair est une dette datée portée par **E4-ST1** ; s'il saute pour tenir l'échéance d'octobre, l'écart se consigne **ici**, jamais en silence |

## 5 · Hors périmètre — Phase 1

Explicitement reportés, pour protéger l'échéance d'octobre :

- Comptes utilisateurs, authentification, progression serveur (phase 2).
- Labo d'exploitation exécutable (DVWA-like) — les simulations pas-à-pas visuelles en tiennent lieu.
- **Séries quotidiennes, ligues, classements, monnaie virtuelle et boutique** — refusés sur le fond,
  pas seulement reportés (voir §3 phase 1). Les ligues et classements sont à rouvrir en phase 2
  seulement si le backend leur donne un sens ; la série quotidienne, elle, ne revient pas.
- **Avatar / mascotte dessinée** (façon Boots chez boot.dev) : l'identité reste **typographique**
  (décision D-4). C'est le même arbitrage de coût illustratif qui avait écarté la direction
  « Cabinet de curiosités » — un dev solo ne tient pas un fonds d'illustrations.
- Autres sujets que la sécurité web (phase 3) ; la home n'annonce qu'un cours.
- Anglais ou toute autre langue : **français seulement**.
- Domaine personnalisé payant : le sous-domaine `*.azurestaticapps.net` suffit tant qu'aucun achat
  n'est approuvé.

## 6 · Mode de production

Le projet est livré par la boucle d'agents du repo : `solution-architect` → `devils-advocate`
(conditionnel) → `feature-developer` → `code-reviewer` → `mentor` (skill
`.claude/skills/feature-cycle/SKILL.md`), boucle sécurité (`.claude/skills/security-audit/SKILL.md`)
et boucle contenu `professeur-web` → `verificateur-theorie` (skill `.claude/skills/lecon/SKILL.md`).
Deux règles dures encadrent tout : budget de contexte des sous-agents
(`.claude/rules/agent-context-budget.md` — 150k visé / 200k toléré / 250k max) et zéro dépense
(`.claude/rules/budget-free-tier.md`). Le backlog
[`docs/agile/backlog-phase-1.md`](agile/backlog-phase-1.md) est découpé en conséquence : une
sous-tâche = un livrable vérifiable par un agent frais.
