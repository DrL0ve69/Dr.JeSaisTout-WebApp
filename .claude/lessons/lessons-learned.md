# Leçons apprises — Dr. Je-Sais-Tout

> **Ce que c'est.** Le journal vivant des erreurs déjà commises sur ce dépôt, pour ne pas les répéter.
> Chaque leçon est numérotée `L-0xx` (ordre d'apparition) et suit le format :
>
> ```
> ## L-0xx · Titre court et cherchable
>
> **Symptôme.** Ce qui a été observé/cassé (concret, avec fichier:ligne si pertinent).
> **Règle.** Le geste à répéter (ou à ne plus jamais faire) pour l'éviter.
> **Réfs.** Fichiers/PR/commits concernés.
> ```
>
> Le hook `SessionStart` (`inject-context.mjs`) injecte automatiquement l'**index** (titres seulement)
> dans chaque session/sous-agent ; lire l'entrée complète d'une leçon dont la zone touche la tâche en
> cours **avant** d'y toucher. Ce fichier est distinct de `.claude/lessons/security-lessons.md`
> (`S-0xx`), réservé aux leçons de sécurité.

---

## L-001 · Le plan du projet vit dans `docs/agile/backlog-phase-1.md` — pointeur, jamais l'epic entier

**Symptôme.** Une délégation à un sous-agent qui reçoit tout un epic/backlog en brief se met à
boucler sur chaque sous-tâche dans le même contexte, et dépasse le budget de contexte par agent
(voir `.claude/rules/agent-context-budget.md`) bien avant d'avoir livré quoi que ce soit de vérifiable.

**Règle.** Le plan du projet (`docs/agile/backlog-phase-1.md` ou équivalent une fois créé) **est** le
brief — mais on ne passe à un sous-agent qu'un **pointeur de section** (ex. « §2.3 Leçon XSS-101,
lignes 40-58 »), jamais le document entier. Un agent = un livrable vérifiable, scope étroit.

**Réfs.** `.claude/rules/agent-context-budget.md` §2.

---

## L-002 · Toute commande destinée au propriétaire s'écrit en **PowerShell**, jamais en bash

**Symptôme.** Le 2026-08-04, `infra/README.md` proposait `cd infra && terraform init && terraform
plan`. Le poste est en **Windows PowerShell 5.1**, où `&&` n'est pas un séparateur d'instruction :
la ligne entière est une *erreur de syntaxe*, aucune des trois commandes ne s'exécute. Conséquence
en cascade : `terraform output` a ensuite tourné depuis le mauvais répertoire, sans état, et a rendu
une **chaîne vide** — que `gh secret set --body ""` aurait acceptée sans broncher, posant un secret
vide et silencieusement cassé. Deux fautes du même README dans la même session.

**Règle.** Écrire les commandes du propriétaire en PowerShell, et baliser les blocs ` ```powershell `.
Pas de `&&` (une commande par ligne, ou `;`, ou `cmd1; if ($?) { cmd2 }`) · pas de `grep`
(→ `Select-String`) · pas de `head`/`tail`/`which`/`touch`/`mkdir -p`. **Et surtout** : ne jamais
enchaîner un `$(...)` dont l'échec produirait une valeur vide acceptée en aval — vérifier
explicitement (`gh secret list`, longueur non nulle) plutôt que de supposer. Le Bash tool existe pour
*mes* scripts POSIX ; il ne dit rien du shell du propriétaire.

**Réfs.** `infra/README.md` §« Toutes les commandes ci-dessous sont en PowerShell » ;
`docs/deployment.md`.

---

## L-003 · Entrer dans la KnowledgeBase par `docs/kb-map.md`, jamais par le dossier au nom évident

**Symptôme.** Le 2026-08-04, le propriétaire a dû reprendre trois fois : la KB n'avait pas été
consultée, puis seul `web/` l'avait été, puis seul `ai/`. Le plan de phase 1 ne citait que
`web/securite/` et `web/angular/` sur **263 fiches / 10 domaines**. La revue qui a suivi a trouvé
un gate impossible à satisfaire (skill `frontend-design` inexistant, invoqué à 5 endroits), des
échelles de design jamais définies, un piège de contraste, et 4 modules sur 13 sans support
pédagogique mémorable.

**Règle.** Avant toute décision d'architecture, de design, de contenu ou d'outillage : lire
`docs/kb-map.md` (table de routage tâche → fiches, ~3k tokens), puis `npm run kb -- <termes>`, puis
la `carte.md` du domaine. `INDEX.md` (~26k tokens) en dernier recours. **Si `kb-map.md` ne couvre
pas le sujet : chercher, puis le compléter.** Les domaines `cs/`, `devops/`, `outils/` et
`divers/pedagogie/` portent sur ce projet autant que `web/`.

**Réfs.** `docs/kb-map.md` · `docs/revue-plan-kb-2026-08-04.md` · CLAUDE.md §KnowledgeBase.

---

## L-004 · Une vérification post-déploiement doit attendre l'**effet**, pas le code de retour

**Symptôme.** Premier déploiement du 2026-08-04 : `deploy.yml` **rouge alors que le site était
parfaitement en ligne**. Azure SWA sert la page (**HTTP 200**) *avant* d'avoir appliqué
`staticwebapp.config.json` — pendant ~30-60 s la réponse ne porte que `content-type` et `date`.
L'étape de vérification a lu cette réponse et déclaré les cinq en-têtes absents. Le
`curl --retry 5 --retry-all-errors` censé couvrir ça n'a **jamais** réessayé : la réponse était un
**succès**, et `--retry` ne se déclenche que sur un échec.

**Règle.** Une vérification qui suit un déploiement attend la **condition observable** qu'elle
teste (ici : la présence effective de l'en-tête `content-security-policy`), dans une boucle bornée
avec un pas explicite — jamais le seul code de retour HTTP, et jamais `--retry` quand l'état
transitoire se présente comme un succès. Corollaire : « 200 » ne veut pas dire « configuré ».

**Réfs.** `.github/workflows/deploy.yml` étape « Vérifier les en-têtes servis » ;
`docs/deployment.md` §Reste à faire.

---

(les prochaines leçons seront ajoutées ici par l'agent mentor au fil des cycles de livraison)
