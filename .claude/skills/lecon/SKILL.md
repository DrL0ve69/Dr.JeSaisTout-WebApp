---
name: lecon
description: >-
  Produit UNE leçon pédagogique complète pour Dr. Je-Sais-Tout à partir de la KnowledgeBase :
  brief au professeur-web → passe adversariale du verificateur-theorie → correctifs par agent
  frais si besoin → mise à jour du backlog. Utiliser quand l'utilisateur demande de créer,
  produire ou régénérer une leçon (« /lecon <sujet> », « fais la leçon sur le XSS »…).
---

# /lecon <sujet> — produire une leçon vérifiée

Tu es le **coordinateur** de la chaîne de production de contenu. Tu ne rédiges pas la leçon
toi-même : tu orchestres `professeur-web` puis `verificateur-theorie`, chacun dans son couloir.
**Règle cardinale : UNE leçon = UN run d'agent** (jamais « fais les leçons 3 à 5 ») — budget
contexte **150k par agent** (`.claude/rules/agent-context-budget.md`).

## (a) Préparer — lire le contrat et le plan

1. Lis `docs/contenu/pipeline-contenu.md` : gabarit de leçon, schémas quiz/simulation,
   correspondance modules ↔ fiches KB.
2. Lis la section pertinente de `docs/agile/backlog-phase-1.md` : trouve l'item de leçon
   correspondant au `<sujet>` demandé (ordre `nn`, slug, statut). Si le sujet n'y figure pas,
   demande à l'utilisateur avant d'inventer un module.
3. Identifie les **chemins exacts** des fiches KB sources (via la table de correspondance du
   pipeline, ou `KnowledgeBase/web/securite/carte.md` pour un sujet sécurité). Vérifie que les
   fichiers existent (`Glob`), mais **ne les lis pas** — c'est le travail du professeur.

## (b) Rédaction — brief minimal au `professeur-web`

Lance l'agent `professeur-web` avec un brief qui tient en ~15 lignes et contient UNIQUEMENT :

- le sujet et l'angle de la leçon (une phrase) ;
- le dossier de sortie exact : `content/<sujet>/<nn>-<slug>/` ;
- les **chemins** des fiches KB sources — jamais leur contenu copié dans le brief ;
- l'ordre de la leçon, ses prérequis (slugs des leçons précédentes), le niveau visé ;
- le rappel : une seule leçon, marqueurs `à-vérifier:` sur tout ce qui est douteux, conformité
  à `docs/contenu/pipeline-contenu.md` et `.claude/rules/contenu-pedagogique.md` (l'agent les
  lit lui-même).

Si le professeur rapporte un dépassement de périmètre ou un brief incomplet, corrige le brief et
relance un agent **frais** — ne négocie pas avec un agent déjà chargé.

## (c) Vérification — passe `verificateur-theorie`

Lance l'agent `verificateur-theorie` (toujours un agent frais, jamais le professeur qui
s'auto-vérifie) avec pour brief :

- les chemins des fichiers produits (`lecon.md`, `quiz.json`, `simulation.json`) ;
- la liste des marqueurs `à-vérifier:` remontée par le professeur ;
- le rappel : read-only sur `content/`, correction KB seulement si erreur certaine.

Attends son verdict : **PUBLIABLE** ou **À CORRIGER** + liste de constats.

## (d) Correctifs — agent FRAIS, jamais une reprise

Si le verdict est À CORRIGER :

1. **Ne renvoie PAS les constats au professeur d'origine par `SendMessage`** (règle
   agent-context-budget §3 : un agent saturé repart de son cumul). Lance un **agent frais**
   (`professeur-web` neuf) dont le brief EST la liste de constats : fichier + ligne/section +
   correction sourcée à intégrer. C'est un brief autonome — il n'a pas besoin du transcript.
2. Si les corrections touchent le fond pédagogique (restructuration), une relecture ciblée du
   `verificateur-theorie` (agent frais) sur les seules sections modifiées suffit — pas de
   re-passe complète pour une virgule.
3. Boucle au maximum **2 fois** ; au-delà, remonte à l'utilisateur : le sujet ou la fiche KB a
   probablement un problème de fond.

## (e) Clôture — statut dans le backlog

Une fois le verdict PUBLIABLE :

1. Mets à jour l'item de la leçon dans `docs/agile/backlog-phase-1.md` : statut (ex.
   `à faire → rédigée-vérifiée`), date, chemin du livrable. Respecte le format existant du
   backlog — ne le restructure pas.
2. Si le vérificateur a **corrigé la KnowledgeBase**, signale-le à l'utilisateur dans ton résumé
   (fichier + avant/après + source) — c'est une écriture hors du repo qui doit rester visible.
3. Résumé final à l'utilisateur ≤ 10 lignes : fichiers produits, verdict, nombre de constats
   corrigés, corrections KB éventuelles, statut backlog.

## Garde-fous

- Jamais plus d'une leçon par invocation du skill ; pour un lot, relance `/lecon` par sujet.
- Les briefs pointent des **chemins**, pas du contenu copié (le copier-coller de fiches fait
  exploser les deux contextes).
- Le professeur écrit, le vérificateur lit : ne jamais inverser ni fusionner les rôles.
- Aucune écriture hors de `content/`, `docs/agile/backlog-phase-1.md` (et la KB par le seul
  vérificateur, cas d'erreur certaine).
