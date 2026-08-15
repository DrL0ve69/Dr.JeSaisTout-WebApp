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

## S-003 · Un garde-fou fail-closed doit prouver qu'il a TOUT vu, pas seulement bien refuser ce qu'il voit (A05 · WSTG-CONF)

**Symptôme.** `MOTIF_SCRIPT` dans `generer-config-swa.mjs` peut ne pas apparier une balise `<script>`
du tout : un guillemet orphelin dans le bloc d'attributs (`<script data-x=a"b">alert(1)</script>`)
fait échouer le groupe de capture — la balise devient invisible au motif, ni hachée ni signalée,
build **vert**. Or un navigateur, lui, ferme la balise au `>` et exécute le corps. Différent de
[[S-001]]/[[S-002]] (mauvaise autorisation d'un jeton *vu*) : ici le fail-closed en aval (§S-001) ne
sert à rien parce que le motif en amont n'a **rien détecté à refuser**. Preuve empirique : 7
contournements tentés sur copie jetable, 6 refusés en code 1 avec cause nommée, le 7ᵉ (guillemet
orphelin) passe en 0. Impact borné en pratique ici — aucun hachage n'étant délivré, la CSP servie
bloque quand même l'exécution — mais la couche de **détection** que ce script existe pour garantir
est perdue en silence. Défaut préexistant, non introduit par le lot en cours ; inscrit au backlog
comme lot autonome.
**Règle.** Tout garde-fou qui analyse une entrée non fiable par motif/regex doit s'accompagner d'un
**contrôle de conservation** : compter les occurrences brutes de la structure ciblée
(`html.match(/<script/gi)`) et exiger l'égalité stricte avec le nombre de correspondances produites
par le motif d'analyse — tout écart est une infraction fail-closed, même quand chaque correspondance
individuelle est par ailleurs correctement traitée. L'inconnu doit être **compté**, pas seulement
analysé : « je refuse tout ce que je vois » ne protège rien si voir peut échouer en silence.
S'applique au-delà de ce script — candidat direct : tout futur validateur du pipeline
Markdown/JSON de `content/` (E2), qui analysera lui aussi une entrée non fiable par motif.
**Réfs.** `tools/deploiement/generer-config-swa.mjs`, `.claude/rules/security.md` §1,
`docs/agile/backlog-phase-1.md` (lot autonome à inscrire).

## S-004 · Une config de déploiement qui NOMME un chemin doit prouver qu'il existe dans l'artéfact (A05 · fail-open)

**Symptôme.** `config/staticwebapp.config.source.json` pointait `responseOverrides.404` vers
`/404/index.html` sans que rien ne vérifie la présence de ce fichier dans l'artéfact bâti —
`generer-config-swa.mjs` se contentait d'un `JSON.parse`. La route `404` d'`app.routes.ts` paraît
redondante à côté du fallback `**`, donc un « nettoyage » plausible aurait fait pointer la config
dans le vide **sans qu'aucun gate ne rougisse** : Azure SWA serait retombé, en silence, sur sa page
d'erreur de marque.
**Règle.** Traiter toute cible de `rewrite`/`redirect`/`responseOverrides` d'une config de
déploiement comme une **assertion à valider au build**, jamais comme une donnée : vérifier
l'existence du fichier référencé dans l'artéfact produit, code 1 sinon. Un défaut de cette classe
est un **fail-open** — une config qui échoue en silence vers le comportement de repli du
fournisseur plutôt que de casser le build.
**Réfs.** `tools/deploiement/generer-config-swa.mjs`, `config/staticwebapp.config.source.json`,
`docs/agile/backlog-phase-1.md` §E1-ST2.

## S-005 · Un défaut de framework peut injecter des scripts inline sous une CSP stricte, et seulement quand la page devient interactive (A05 · fail-open de portée)

**Symptôme.** Le build est sorti rouge sur E1-ST2 : la sortie prerendue portait trois scripts inline
au lieu d'un attendu. `provideClientHydration()` d'Angular 22 active **par défaut**
`withIncrementalHydration()`, qui embarque `withEventReplay()` — lequel injecte
`ng-event-dispatch-contract` et `window.__jsaction_bootstrap(…)`, mais **seulement une fois que la
page porte de vrais écouteurs** (`click`/`change` — la bascule de thème d'E1-ST2). E1-ST1 avait
validé une CSP « propre » sur un site sans le moindre élément interactif : la vérification était
juste, son **périmètre** ne l'était pas.
**Règle.** Une CSP validée sur une page non interactive ne prouve rien sur une page qui le devient —
revalider dès qu'un lot ajoute le premier écouteur d'événement. Face à un défaut de framework qui
injecte des scripts inline, préférer **désactiver le mécanisme** (`withNoIncrementalHydration()`,
seule API publique ici) plutôt qu'apprendre au garde-fou à hacher automatiquement N scripts inline :
une liste blanche **dérivée de l'artéfact** cesse d'être une liste **nominative et revue** — elle
autoriserait alors tout script qu'une future version du framework y injecterait, sans regard humain.
À rapprocher de [[S-003]] (garde-fou qui doit prouver avoir tout vu).
**Réfs.** `src/app/app.config.ts`, `docs/agile/backlog-phase-1.md` §E1-ST2.

## S-006 · Tout fichier présent dans l'artéfact est servable, qu'un plan de routage le mentionne ou non (A05 · exclusion d'audit sur motif faux)

**Symptôme.** `dist/dr-je-sais-tout/browser/index.csr.html` (coquille de rendu client vide, ni
`<main>` ni `<h1>`) répondait 200 en production et avait été écarté de l'audit d'accessibilité au
motif que `navigationFallback` le couvrirait — motif **faux** : `navigationFallback` ne se déclenche
que sur un fichier **absent**, jamais sur un fichier qui existe et répond déjà. Cette exclusion a
survécu à une revue précédente parce qu'elle citait un mécanisme réel, mal appliqué. Conséquence
associée découverte en corrigeant : avant retrait de `navigationFallback`, **toute** URL inconnue
sous le domaine renvoyait 200 avec la page d'accueil légitime — support de hameçonnage clé en main
(`https://<site>/facture-impayee/`), jamais identifié comme exposition avant ce lot.
**Règle.** La présence d'un fichier dans l'artéfact bâti, seule, décide s'il est servable — un plan
de routage applicatif (`app.routes.ts`) ne le couvre pas. Toute exclusion d'audit doit nommer le
**mécanisme exact** qui la justifie et être vérifiée contre son comportement réel (fichier absent vs
présent), pas seulement contre son nom. Fermé ici par redirection 301 sur `index.csr.html` et retrait
de `navigationFallback`.
**Réfs.** `config/staticwebapp.config.source.json`, `docs/agile/backlog-phase-1.md` §E1-ST2.
