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

(les prochaines leçons seront ajoutées ici par l'agent mentor au fil des cycles de livraison)
