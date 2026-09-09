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
**Règle cardinale : UNE leçon = UN lot** (jamais « fais les leçons 3 à 5 ») — budget contexte
**120k visé / 150k gros maximum / 200k exceptionnel par agent** (`.claude/rules/agent-context-budget.md`).

> ⚠️ **« Une leçon » n'est PAS toujours « un agent » — mesuré le 2026-08-21.** Les deux rédacteurs
> d'E3-ST2 et E3-ST3 ont fini à **197 798** et **206 884** tokens, sur des fiches sources de **540**
> et **740 lignes** ayant produit **609** et **869 lignes** de leçon, plus un quiz, plus une
> simulation. Dimensionner au livrable (« une leçon ») ne prédit rien : la variable est le **volume
> de source × le volume produit** (règle §2, L-047). Au-delà d'environ **500 lignes de fiche
> source**, ou dès qu'une `simulation.json` s'ajoute au quiz, **scinder en deux agents** — (a)
> `lecon.md`, (b) `quiz.json` + `simulation.json` écrits depuis la leçon déjà rédigée. Repère
> mesuré : les agents de **correctifs**, au périmètre serré, finissent autour de **105-115k**.

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
- 🔴 **le statut de départ : `statut: verifiee`, JAMAIS `publiee`.** `valider.mjs` §6 **interdit**
  les marqueurs `à-vérifier:` dès `publiee` : un brief qui impose `publiee` force donc le professeur
  à taire ses doutes, ou à les livrer hors du dépôt. Constaté le 2026-08-21 sur E3-ST2/E3-ST3 — les
  deux rédacteurs ont rendu leur liste de doutes dans leur **rapport**, où plus rien ne la relit.
  Une leçon en `verifiee` n'est pas prerendue, c'est voulu ; la bascule à `publiee` (et le retrait
  des marqueurs) est le **dernier geste**, après le verdict PUBLIABLE — étape (e) ;
- le rappel : une seule leçon, marqueurs `à-vérifier:` sur tout ce qui est douteux, conformité
  à `docs/contenu/pipeline-contenu.md` et `.claude/rules/contenu-pedagogique.md` (l'agent les
  lit lui-même).

🔴 **ET LA LISTE DES SECTIONS OBLIGATOIRES, ÉCRITE EN TOUTES LETTRES DANS LE BRIEF — jamais supposée
connue.** Défaut payé un agent entier au lot des séances 3-4 : ni le rédacteur de la moitié A ni
celui de la moitié B n'avaient écrit « Exemple simple », « Exemple complet » et « À toi de jouer »,
chacun couvrant le plan qu'on lui avait donné — et ce plan ne les portait pas. C'est `valider.mjs`
qui les a réclamées **après coup**, et il a fallu un troisième agent pour les insérer. **La moitié
qui FERME une leçon reçoit cette liste :**

```
## L'idée en une image      (première section, toujours)
## En bref — la marche à suivre   (format actionnable seulement — voir ci-dessous)
## <sections de théorie>    (libres, autant qu'il en faut)
## Exemple simple
## Exemple complet
## À toi de jouer
## À retenir
## Aller plus loin          (dernière section, toujours)
```

- **Au plus 5 objectifs** au frontmatter — un brief qui en demande « 5 à 6 » fait rougir G-content au
  premier essai.
- **Format actionnable** (refonte du 2026-08-31) : si le module en fait partie, le brief **exige**
  la section `## En bref — la marche à suivre` portant un conteneur `:::: marche-a-suivre`, et — sur
  **chacun** de ses titres `##` et `###` — soit un renvoi `{diapos="…"}`, soit le marqueur
  `{hors-cours}`. ⚠️ **Nomme les DEUX issues dans le brief** : un rédacteur à qui l'on ne cite que
  `{diapos="…"}` inventera un renvoi là où le cours ne dit rien, ce que le marqueur existe
  précisément pour éviter (lot 1c). Le contrat complet — bornes du
  conteneur, résolution de `{voir="…"}`, conteneur `methodes` à onglets, et la liste
  `MODULES_AU_FORMAT_ACTIONNABLE` qui décide qui y est soumis — vit dans
  `docs/contenu/pipeline-contenu.md` et `docs/contenu/ancrage-au-cours.md` §3bis. **Nomme ces deux
  sections dans le brief** : un rédacteur qui ne sait pas que le module est au format actionnable
  écrira à l'ancien format, et le build le refusera sans que personne n'ait le contrat sous les yeux.

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

1. **Bascule le frontmatter de la leçon en `statut: publiee`** et retire les marqueurs
   `à-vérifier:` que le vérificateur a levés — c'est ce geste, et lui seul, qui met la leçon en
   ligne. Une leçon laissée en `verifiee` n'est **pas** prerendue : elle serait « finie » sans être
   publiée, et rien ne le dirait.
2. **Si le lot est une reprise au format actionnable, ajoute le slug du module à
   `MODULES_AU_FORMAT_ACTIONNABLE`** (`tools/content-pipeline/valider.mjs`) — c'est le **dernier**
   geste du lot, après le verdict, et il vaut déclaration que le module est **entièrement** conforme.
   La liste est nominative et écrite à la main, jamais dérivée du corpus (S-005).
   ⚠️ **Le geste se vérifie tout seul, dans les deux sens** : `src/format-actionnable.spec.ts` rougit
   si un slug listé n'a **pas** de leçon publiée, et il imprime à chaque exécution de G-test combien
   de modules restent à reprendre. Ce compteur ne redescend jamais.
3. Mets à jour l'item de la leçon dans `docs/agile/backlog-phase-1.md` : statut (ex.
   `à faire → rédigée-vérifiée`), date, chemin du livrable. Respecte le format existant du
   backlog — ne le restructure pas.
4. Si le vérificateur a **corrigé la KnowledgeBase**, signale-le à l'utilisateur dans ton résumé
   (fichier + avant/après + source) — c'est une écriture hors du repo qui doit rester visible.
5. Résumé final à l'utilisateur ≤ 10 lignes : fichiers produits, verdict, nombre de constats
   corrigés, corrections KB éventuelles, statut backlog.

## Garde-fous

- Jamais plus d'une leçon par invocation du skill ; pour un lot, relance `/lecon` par sujet.
- Les briefs pointent des **chemins**, pas du contenu copié (le copier-coller de fiches fait
  exploser les deux contextes).
- Le professeur écrit, le vérificateur lit : ne jamais inverser ni fusionner les rôles.
- Aucune écriture hors de `content/`, `docs/agile/backlog-phase-1.md` (et la KB par le seul
  vérificateur, cas d'erreur certaine).
