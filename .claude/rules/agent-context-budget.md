# Budget de contexte des sous-agents — règle dure (Dr. Je-Sais-Tout)

> **Ce que c'est.** Une contrainte **non négociable** posée par le propriétaire : un sous-agent doit
> finir sa tâche **dans sa smart zone**. Au-delà, la qualité chute *et* chaque token relu est refacturé.
> Cousine de `.claude/rules/budget-free-tier.md` (axe **argent**) — celle-ci est l'axe **contexte**.
>
> **Plafonds — RESSERRÉS par le propriétaire le 2026-08-19 :** **120k visé · 150k = le gros
> maximum · 200k exceptionnel et à justifier.** L'ancien barème (150 visé / 200 toléré / 250
> absolu) est **PÉRIMÉ** : 250k n'est plus une valeur admissible, et 200k n'est plus « toléré »
> mais **exceptionnel**, c'est-à-dire qu'un dépassement se **motive dans le rapport de clôture**.
> C'est **par agent**, pas par tâche : trois agents à 120k valent mieux qu'un à 300k.
>
> **Un dépassement est un défaut de BRIEF, jamais un défaut d'agent.** Un sous-agent ne peut pas se
> `/compact` lui-même : son isolation vient **entièrement** du périmètre qu'on lui a donné. Quand
> un agent déborde, c'est le coordinateur qui a mal découpé — c'est donc le BRIEF qui change, pas
> l'agent qui « fait attention ».
>
> **Nuance KB (à lire avec les plafonds).** La « zone intelligente » d'un agent se dégrade bien
> avant les plafonds : ~**100–140k** selon la KB
> (`KnowledgeBase/ai/agents/claude-code/methode-travail.md` — « 1 ticket = 1 fenêtre de contexte »).
> Les seuils ci-dessus sont donc des **plafonds d'alerte**, pas des cibles : dimensionner chaque lot
> pour **finir sous ~120k** ; 150k = signal de découpe manquée, 200k = post-mortem du brief, écrit
> dans le rapport.

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
- [ ] 🔴 **Dimensionne au VOLUME DE SOURCE à lire, jamais au nombre de livrables promis** (leçon
      **L-047**, mesurée le 2026-08-19 sur la passe E3-ST0). Un lot « 4 fiches » et un lot
      « 6 fiches » ont fini à **250k, 244k, 277k et 249k** — au-delà du maximum absolu — parce que
      la vraie variable était le corpus : **230 à 298 diapositives** et jusqu'à **47 captures à
      ouvrir une par une**. Les lots dimensionnés par corpus (23 diapositives, 2 fiches) ont fini à
      **113k** et **105k**. Le compte de livrables ne prédit **rien** dès qu'un livrable a une source
      de taille inconnue : **mesure la source avant d'écrire le brief** (nombre de pages, de
      diapositives, d'images, de fichiers à lire), et découpe là-dessus.
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

---

## 7 · Le PLANCHER : ce que l'agent porte AVANT d'avoir lu son lot

> Mesuré le **2026-08-20**. Le propriétaire avait observé des sous-agents démarrant à ~100k en fin
> de session contre 40-50k au début, et supposé une fuite du contexte du fil principal.
> **L'hypothèse est RÉFUTÉE par la mesure** : un sous-agent (hors `fork`) ne reçoit rien du
> transcript du fil principal. Le plancher venait d'ailleurs — et il est **monotone** : les corpus
> grossissent à chaque cycle et ne redescendent jamais, pas même entre deux sessions.

**Le relevé, tel quel.** Avant d'avoir lu une ligne du lot :

| Injecté dans chaque agent | ~tokens |
|---|---|
| `CLAUDE.md` (projet, auto-chargé) | 11 500 |
| les cinq `.claude/rules/*.md` | 10 600 |
| `.claude/lessons/lessons-learned.md` **lu en entier** | 33 600 |
| `.claude/lessons/security-lessons.md` **lu en entier** | 18 000 |
| `~/.claude/CLAUDE.md` + prompt de l'agent | ~2 500 |
| **Plancher** | **~74 000** |

Sur un plafond de 120k, il restait **46k** de travail utile. Ce n'était pas un budget : c'était une
contrainte cachée, qui expliquait à elle seule les démarrages à 100k.

**Le correctif, en place.** `.claude/lessons/INDEX.md` — généré par
`.claude/hooks/generer-index-lecons.mjs`, régénéré à chaque `SessionStart` et par
`npm run lecons:index` — porte, pour chaque entrée, son identifiant, son sujet **et sa plage de
lignes**. ~3 900 tokens au lieu de 51 600.

- [ ] **Un agent lit l'INDEX, puis 2-4 entrées** avec `Read(fichier, offset, limit)`. Ouvrir un
      corpus en entier est désormais un défaut de méthode, pas une prudence.
- [ ] **Sans plage de lignes, un index ne sert à rien** : l'agent n'a pas d'autre choix que
      d'ouvrir le fichier. C'est ce qui rendait inopérant l'index déjà imprimé par le hook.
- [ ] 🔴 **L'index se régénère après TOUTE édition du corpus** (`npm run lecons:index`). Ajouter,
      fusionner ou élaguer une entrée décale toutes les plages suivantes : sans régénération,
      l'index envoie chaque agent lire le **mauvais passage, en silence**. Un index qui ment coûte
      plus cher que pas d’index.
      ⚠️ **Ce n'est PAS le `mentor` qui le lance — cette ligne l'a affirmé jusqu'au 2026-08-26, et
      c'était faux.** Les deux `mentor` n'ont **aucun outil d'exécution**
      (`Read`/`Grep`/`Glob`/`Edit`/`Write`), délibérément : leur définition leur impose de terminer
      leur rapport par une **demande explicite** de régénération, et c'est **l'appelant** qui
      exécute. La garantie ne vit donc ni dans l'outillage du mentor ni dans la mémoire de son
      coordinateur, mais dans un **test** — `src/index-lecons.spec.ts` confronte chaque plage
      déclarée au corpus, et **G-test rougit** tant que l'index n'a pas été régénéré. Un brief qui
      ordonne au mentor de lancer la commande lui demande l'impossible : constaté le 2026-08-26, le
      mentor a répondu qu'il n'avait pas l'outil, ce qui était **exact**.
- [ ] **Un fichier injecté partout est un budget partagé.** Le bloc de reprise de `CLAUDE.md` est
      payé par chaque agent de chaque session ; l'historique détaillé d'un epic clos appartient au
      backlog. L'élaguer à chaque clôture d'epic est du travail rentable.
- [ ] **Mesurer avant de supposer** : `wc -c` sur tout ce qui est injecté, ÷ 4. Un plancher de 70k
      explique un démarrage à 100k sans qu'il faille inventer une fuite.

---

## 8 · Le plancher REMESURÉ le 2026-08-25 — et ce qu'il n'est pas

> Le propriétaire a signalé des sous-agents démarrant « presque à 100k » là où ils démarraient
> « à 60k au plus ». Soupçon nommé : la façon d'injecter le contexte aurait encore changé.
> **Réfuté par la mesure, sur les deux axes.**

**(a) Le mécanisme n'a pas bougé.** Les six définitions d'agents qui lisent les leçons pointent
toujours `INDEX.md` et interdisent toujours d'ouvrir un corpus en entier — vérifié fichier par
fichier. Rien n'a été modifié depuis le correctif du 2026-08-20.

**(b) Ce qui a grossi, mesuré sur l'historique git** (`CLAUDE.md` dépouillé de ses commentaires de
bloc, qui sont retirés avant injection) :

| Fichier auto-injecté | 2026-08-20 | 2026-08-25 |
|---|---|---|
| `CLAUDE.md` (injecté) | 8 407 tok | 10 768 tok |
| `.claude/lessons/INDEX.md` | 3 752 | 4 634 |
| `docs/contenu/pipeline-contenu.md` (lu par `professeur-web`) | 7 281 | 7 657 |
| `lessons-learned.md` (pointé, pas injecté) | 32 087 | 39 893 |
| `security-lessons.md` (pointé, pas injecté) | 17 183 | 22 052 |

Soit **+4 000 tokens** environ sur le plancher inconditionnel. **Pas 40 000.**

**(c) 🔴 LE CHIFFRE QUI TRANCHE : un sous-agent qui ne fait RIEN coûte déjà ~61k.** Sonde du
2026-08-25 — un agent `general-purpose`/haiku à qui l'on demande de décrire son propre préambule,
sans lire un fichier, sans lancer une commande : **0 appel d'outil, 60 786 tokens rapportés**. Sa
propre estimation du préambule *issu du dépôt* était ~19 500 tokens. **L'écart de ~41 000 est
harnais-side** — prompt système de l'agent, schémas des ~50 outils différés, listing des skills,
`memory/MEMORY.md`. Le dépôt n'en contrôle rien.

**Ce qu'il faut en conclure, et c'est un changement de doctrine.** « 60k » n'est plus un démarrage
observable : c'est à peu près le **coût du vide**. Comparer un agent d'aujourd'hui à un souvenir
d'agent d'il y a deux semaines mesure surtout la croissance du harnais. **Le seul chiffre qui
renseigne encore est le DELTA** — tokens rapportés moins ~61k — et c'est lui qu'il faut lire dans
un rapport de clôture, pas le total brut.

### Deux défauts que la mesure a rendus visibles, tous deux corrigés le 2026-08-25

1. **Le hook `SessionStart` imprimait un SECOND index, sans plages de lignes** (~10 000 caractères,
   ~2 500 tokens). Son propre commentaire justifiait la dépense en affirmant que les sous-agents
   « ne reçoivent pas forcément la sortie de ce hook » — **la sonde l'a retrouvée dans son
   préambule**. Le dépôt payait donc deux index par agent, et le moins cher des deux était le seul
   à porter des plages. Un index sans plage n'est pas un demi-index : il ne laisse à l'agent aucun
   geste sauf ouvrir le corpus entier (§7). Remplacé par un pointeur + le compte : **13 783 → 2 700
   octets**, économisés à chaque session **et** à chaque sous-agent.
2. **Le même hook annonçait le barème PÉRIMÉ** — « 150k targeted / 200k tolerated / 250k absolute
   max » — en contradiction directe avec les plafonds resserrés le 2026-08-19 que ce fichier porte.
   Un chiffre injecté d'office qui contredit la règle qu'il cite est **pire qu'un chiffre absent** :
   c'est celui-là que l'agent lit en premier. Aligné sur 120/150/200.

⚠️ **La leçon de méthode, plus générale que le cas.** Les deux défauts étaient des **chiffres écrits
une fois et jamais remesurés** — dans un hook, dans six définitions d'agents (« INDEX ~3 900
tokens », faux de 20 %). Un ordre de grandeur cité dans une consigne **se date ou se dérive** ;
recopié nu, il devient un mensonge silencieux à la vitesse où le corpus grossit. Les six définitions
disent désormais que les chiffres grossissent et qu'il faut se fier à la **règle**, pas au nombre.

---

## 9 · 🔴 LES FIXTURES SONT UN DEUXIÈME LIVRABLE — précédent mesuré le 2026-08-25

**Le run.** Lot « pipeline des exercices du cours » (E3-ST21-A) : **303 202 tokens, 153 appels
d'outils**. Le résultat était bon — quatre gates verts, 913 tests, dix cas de fixture chacun avec sa
cause propre — mais le coût est le double du maximum admissible.

**Le brief passait pourtant le test du « + ».** Il annonçait UN livrable vérifiable :
« `content:build` valide, compile et garde les exercices ». Une seule phrase, une seule chose
déclarable verte. C'est ce qui l'a fait paraître dimensionné.

**Ce qui a été omis, et c'est la leçon.** Le brief demandait, en une ligne parmi d'autres, « au
moins six fixtures invalides, plus deux inter-leçons, plus une valide ». Dans ce dépôt, **une
fixture n'est pas un fichier** : c'est un dossier portant un `lecon.md` (~78 lignes de frontmatter
et de sections de gabarit) **et** un `quiz.json` (~82 lignes, cinq questions minimum avec leurs
explications), plus une `horaire.json`, plus l'assertion de cause propre dans le spec, plus le
compte en dur à remettre à la main. **Dix cas = ~1 600 lignes à écrire**, chacune devant passer le
validateur pour la bonne raison et échouer pour une seule autre.

Écrire ce corpus est un travail de **rédaction**, pas de modification : il ne partage presque rien
avec la lecture du validateur. C'est un second livrable, et il a doublé le lot.

- [ ] 🔴 **Compter les fixtures comme un lot à part dès qu'il y en a plus de deux ou trois.** La
      découpe juste était : **(A1)** schéma + validateur + compilateur + manifeste + types, avec
      *deux* fixtures témoins pour prouver que les règles mordent ; **(A2)** le corpus de cas
      invalides + les assertions + les comptes en dur. A2 n'a pas besoin du transcript de A1 : la
      liste des règles suffit, et c'est déjà un brief autonome.
- [ ] **Le signal à chercher dans son propre brief** : une phrase qui dit « avec ses tests » est
      inoffensive ; une phrase qui dit « au moins N fixtures » est un **corpus**, et un corpus se
      mesure (nombre de fichiers × lignes par fichier) avant d'écrire le brief — exactement le geste
      de §2 (L-047), appliqué cette fois à ce que l'agent doit **écrire** et non à ce qu'il doit
      **lire**. Le volume de SORTIE compte autant que le volume de SOURCE.
- [ ] **Corollaire déjà connu, reconfirmé** : un plafond d'appels d'outils annoncé dans le brief
      (« arrête-toi et rends un rapport d'étape à 50 appels ») est le seul frein qu'un agent puisse
      actionner lui-même. Il ne remplace pas la découpe, il en limite le dégât quand elle a raté.

⚠️ **Ce qui n'était PAS la cause, pour ne pas corriger la mauvaise chose.** Les plages de lignes
injectées ont fonctionné : l'agent n'a ouvert en entier aucun des deux fichiers de 2 400 lignes.
Sans elles le run aurait été pire. **Ne pas conclure « les pointeurs ne servent à rien »** — ils ont
tenu la moitié *lecture* du budget ; c'est la moitié *écriture* qui n'avait été estimée par personne.
