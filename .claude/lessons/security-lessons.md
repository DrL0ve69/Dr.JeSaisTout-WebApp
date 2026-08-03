# Leçons de sécurité — Dr. Je-Sais-Tout

> **Ce que c'est.** Le journal vivant des leçons de sécurité durables sur ce dépôt — distinct de
> `.claude/lessons/lessons-learned.md` (leçons générales `L-0xx`). Chaque leçon est numérotée
> `S-0xx` (ordre d'apparition) et suit le format :
>
> ```
> ## S-0xx · Titre court et cherchable
>
> **Symptôme.** La faille/le constat observé (concret, avec fichier:ligne si pertinent, référence
> OWASP si applicable).
> **Règle.** Le geste à répéter (ou à ne plus jamais faire) pour l'éviter.
> **Réfs.** Fichiers/PR/commits concernés.
> ```
>
> Ce fichier n'est **pas** injecté en entier au `SessionStart` — seul un pointeur d'une ligne l'est
> (voir `.claude/hooks/inject-context.mjs`). Le lire en entier **avant** tout travail sensible à la
> sécurité (headers/CSP, dépendances, et dès la phase 2 : auth/API/EF). Voir la checklist opérationnelle
> dans `.claude/rules/security.md`.

---

(aucune leçon de sécurité capturée pour l'instant — ce fichier se remplit au fil des revues de
sécurité et des constats levés sur le dépôt)
