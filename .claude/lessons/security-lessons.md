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

## S-001 · Un garde-fou qui se met à autoriser doit apparier des jetons structurels, jamais des sous-chaînes (A05 · WSTG-CONF)

**Symptôme.** `generer-config-swa.mjs` détectait `<script id="init-theme">` (ST1-C) par recherche de
sous-chaîne pour en calculer le hachage CSP. Trois contournements reproduits sur l'artéfact réel par
deux revues indépendantes : `id="init-theme"` présent dans la VALEUR d'un autre attribut (aucun
attribut `id` réel, corps arbitraire quand même haché et autorisé) ; ruse équivalente sur la
détection de type inerte rendant un script invisible au garde-fou ; casse `<ScRiPt>`, fermeture
`</script >`, attribut `type` dupliqué (l'analyseur HTML garde le premier, le code maison gardait le
dernier), valeur entre backticks. Chaque écart entre l'appariement maison et un vrai analyseur HTML
est une surface de contournement de CSP.
**Règle.** Dès qu'un garde-fou passe de « refuser » à « autoriser » (délivrer un hachage, une
exemption, une permission), traiter sa précision comme un contrôle de sécurité à part entière :
découper réellement les attributs en paires nom→valeur (premier gagnant, comme un navigateur), et
**refuser fail-closed tout bloc d'attributs non intégralement analysable** — l'inconnu est une
infraction, jamais un laissez-passer. À défaut d'un vrai analyseur HTML, échouer sur l'ambigu plutôt
que de deviner.
**Réfs.** `tools/deploiement/generer-config-swa.mjs`, `.claude/rules/security.md` §1,
`docs/agile/backlog-phase-1.md` §E1-ST1 (ST1-C).

## S-002 · Une autorisation CSP se compare à une valeur revue épinglée, jamais ne se dérive de l'artéfact (A05/A08)

**Symptôme.** La première version de ST1-C hachait « ce qui portait le bon `id` » : n'importe quel
corps de script placé sous `id="init-theme"` s'auto-autorisait, et la revue `security-reviewer`
exigée par le backlog ne survivait pas à la première édition du script — le générateur validait
toujours puisqu'il générait la permission à partir du contenu courant. Piège technique associé,
constaté séparément : le hachage porte sur le contenu **après normalisation des fins de ligne par
l'analyseur HTML** (`\r\n`/`\r` → `\n`) ; `index.csr.html` est livré en CRLF et `index.html` en LF,
donc sans normalisation la même source produit deux hachages et la CSP bloque en silence.
**Règle.** Épingler le hachage attendu dans une constante revue (`HACHAGE_SCRIPT_ATTENDU`) ; toute
divergence fait échouer la construction avec pour consigne explicite de repasser par
`security-reviewer` **avant** de mettre la constante à jour. Ne jamais laisser un artéfact généré
s'auto-valider. Normaliser les fins de ligne avant tout calcul de hachage sur du HTML source. Même
esprit que [[L-009]] (artéfact généré reproductible, mode `--check`).
**Réfs.** `tools/deploiement/generer-config-swa.mjs`, `config/staticwebapp.config.source.json`,
`.claude/rules/security.md` §1, `docs/agile/backlog-phase-1.md` §E1-ST1 (ST1-C).
