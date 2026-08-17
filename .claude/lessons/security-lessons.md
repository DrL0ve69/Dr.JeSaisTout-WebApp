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
Markdown/JSON de `content/` (E2), qui analysera lui aussi une entrée non fiable par motif. Variante
« périmètre déclaré vs périmètre balayé » (fichier unique promis comme « le site ») : [[S-010]].
**Volet placement, ajouté en E2-ST1** : voir tout aussi si le garde-fou tourne **du tout** sur le
chemin d'exécution réel. `rendre-mermaid.mjs` portait un recomptage de motifs interdits et un
contrôle d'unicité d'identifiants, mais uniquement dans son harnais CLI `--racine` — jamais appelé
par `npm run content:build`, seul chemin qu'empruntent CI et développeurs. Et un SVG relu **depuis
le cache** était réinjecté sans repasser par aucun nettoyage : tenait en CI (cache froid), ne
tenait pas sur poste à cache chaud. Un contrôle exact mais placé hors du chemin réel ne garde rien.
**Règle additionnelle.** Après avoir écrit un garde-fou fail-closed, tracer **qui l'appelle** :
s'il ne vit que dans un harnais séparé du script que CI/dev exécutent réellement, il est mort code.
Tout artéfact réintroduit depuis un cache doit retraverser exactement le même nettoyage qu'un
artéfact frais — le cache n'est jamais une exemption de contrôle.
**Réfs.** `tools/deploiement/generer-config-swa.mjs`, `tools/content-pipeline/build.mjs`,
`tools/content-pipeline/rendre-mermaid.mjs`, `.claude/rules/security.md` §1,
`docs/agile/backlog-phase-1.md` §E2-ST1.

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

## S-007 · Isoler un secret protège le jeton, pas l'artéfact — ce sont deux mesures distinctes (A08 · chaîne d'approvisionnement CI/CD)

**Symptôme.** `deploy.yml` faisait tourner tous les gates **et** la publication dans un seul job.
Le gate d'accessibilité (`playwright install --with-deps chromium`) exécute un binaire téléchargé
d'un CDN, hors du contrôle d'intégrité de `package-lock.json`, avec les droits root du runner —
donc du code non épinglé s'exécutait sur la machine détenant
`AZURE_STATIC_WEB_APPS_API_TOKEN`. Scinder le workflow en deux jobs (`gates` sans secret →
`publication` qui téléverse) n'a fermé que la **moitié** du problème : dans `gates`, ce même code
téléchargé s'exécute toujours entre le build de `dist/` et son envoi au job suivant, et peut le
réécrire — y compris `staticwebapp.config.json`, qui porte la CSP.
**Règle.** Traiter « ne pas exposer le jeton » et « ne pas laisser un binaire tiers modifier
l'artéfact » comme **deux propriétés indépendantes, chacune avec sa propre mesure** : (1) un gate
qui exécute du code téléchargé ne partage jamais le job qui détient un jeton de publication ; (2)
sceller l'artéfact par empreintes `sha256` juste après le build et revérifier juste avant le
téléversement, indépendamment de qui détient le jeton. Généralise au-delà de Playwright : tout
outil de gate qui télécharge un binaire dans une chaîne de publication.
**Réfs.** `.github/workflows/deploy.yml`, `.claude/rules/security.md` §1/§3,
`docs/agile/backlog-phase-1.md` §E1-ST2.

## S-008 · Un `exit 0` sur chemin d'erreur rend une vérification verte sans qu'elle ait tourné (A05 · fail-open assumé dans le code)

**Symptôme.** Les étapes de vérification en ligne de `deploy.yml` (en-têtes servis, routage
404/301) commençaient par : si l'URL du site déployé n'est pas fournie par l'action de
déploiement, émettre `::warning::` puis **`exit 0`**. Un simple renommage de sortie côté action
tierce suffisait à rendre les deux vérifications vertes **sans rien vérifier**, juste après un
déploiement réel — alors qu'elles sont le seul filet constatant la CSP et le routage sur le site
publié. Corrigé en `::error::` + `exit 1`. Correctif connexe dans le même lot : la vérification
n'exigeait que la **présence** des en-têtes, jamais la valeur des directives (une CSP servie mais
permissive passait) ; elle exige désormais `object-src 'none'`, `base-uri 'self'`,
`frame-ancestors 'none'`, `upgrade-insecure-requests`, un `max-age` HSTS, et refuse
`unsafe-inline`/`unsafe-eval`/`strict-dynamic`.
**Règle.** Distinct de [[S-003]]/[[S-004]] (le garde-fou ne voit pas tout) : ici le garde-fou peut
ne **pas tourner du tout**, par un `exit 0` écrit exprès sur un chemin d'erreur. Toute
vérification post-déploiement dont une précondition peut manquer doit échouer fail-closed
(`exit 1`) sur cette précondition, jamais réussir silencieusement — un input absent n'est jamais
une preuve d'absence de faille. Et une vérification de sécurité qui contrôle la présence d'un
header sans contrôler la valeur de ses directives ne vérifie rien de mordant.
**Réfs.** `.github/workflows/deploy.yml`, `.claude/rules/security.md` §1,
`docs/agile/backlog-phase-1.md` §E1-ST2.

## S-009 · Une liste NOIRE de motifs sur un format structuré (SVG/HTML/XML) n'est pas un garde-fou, et un texte de justification ne doit jamais promettre plus que le code n'applique (A03/A08 · CWE-79/CWE-116)

**Symptôme.** `rendre-mermaid.mjs` « nettoyait » le SVG produit par `mmdc` en cherchant cinq motifs
par regex (`<style`, `style=`, `<script`, `<foreignObject`, `on…=`), avec un contrôle avant/après
donnant l'apparence de la rigueur. La revue a fait traverser **intacts**, code 0 : `<a
xlink:href="javascript:alert(1)">` (que Mermaid émet dès qu'une leçon emploie `click`), `<use
href="https://evil.example/x.svg#p">`, `<animate attributeName="href" values="javascript:…">`,
`<set attributeName="onload">`. On s'en remettait en silence au `sanitize-url` interne de Mermaid,
dépendance tierce non épinglée pour cet usage. Aggravant : `tools/content-pipeline/types.d.ts`
**citait ce nettoyage** comme justification écrite du futur `bypassSecurityTrustHtml`
(E2-ST2, retrait total du sanitizer Angular sur cette chaîne) — le texte qui autorise un
contournement décrivait une garantie plus forte que celle réellement appliquée. Même patron que
[[S-002]] (une autorisation se compare à une valeur revue, pas à une intention), transposé d'une
liste blanche de hachages à une liste blanche de balisage. Famille avec [[S-003]] (motif regex qui
ne voit pas tout) et le garde-fou de `generer-config-swa.mjs` qui ne connaît que ` style="` et
laisse passer `style='…'` ou sans guillemets — **trois occurrences de la même faute**, non
corrigées d'un même geste.
**Règle.** Sur un format structuré arbitraire (SVG/HTML/XML), analyser réellement l'arbre
(`DOMParser`/jsdom `image/svg+xml`) et appliquer une **liste BLANCHE nominative** d'éléments et
d'attributs — jamais une liste noire de motifs, quel que soit son nombre d'entrées. Nommer chaque
refus (élément/attribut/valeur en cause). `href`/`xlink:href` : admis seulement en `#…` (référence
interne), jamais un schéma externe ou `javascript:`. Tout texte qui **justifie** un contournement
du sanitizer framework (`bypassSecurityTrust*`) doit décrire l'implémentation réelle du garde-fou
en amont, pas son intention — le réviser au même diff que le garde-fou qu'il décrit. Patron de
correctif disponible dans le dépôt : `rendre-mermaid.mjs` (jsdom + liste blanche), précédent plus
ancien `tools/a11y/verifier-axe.mjs`.
**Réfs.** `tools/content-pipeline/rendre-mermaid.mjs`, `tools/content-pipeline/types.d.ts`,
`.claude/rules/security.md` §1/§4, `docs/agile/backlog-phase-1.md` §E2-ST1.

## S-010 · Un garde-fou doit couvrir exactement le périmètre que sa promesse énonce, avec un contrôle positif prouvant qu'il l'a réellement lu (A05 · WSTG-CONF)

**Symptôme.** `rendu-blocs.ts` affirmait « **L'UNIQUE `bypassSecurityTrustHtml` DU SITE** », mais le
garde-fou vivait dans `rendu-blocs.spec.ts` et n'appariait `bypassSecurityTrust\w*\(` que **dans ce
seul fichier** — la promesse parlait du site, la vérification d'un fichier. Le correctif, un
garde-fou de dépôt entier (`src/garde-fou-contournements-sanitizer.spec.ts`), a **reproduit la même
faute dans le même geste** : il ne balayait que les `.ts`, alors que ce dépôt appelle aussi le
sanitizer depuis des gabarits externes (`src/app/app.html`) — un `bypassSecurityTrustHtml` posé dans
un `.html` serait passé inaperçu, promesse « tout le code applicatif », lecture de la moitié. C'est
une revue de sécurité qui l'a vu, pas l'auteur du correctif.
**Règle.** Quand une promesse emploie « le site », « tout », « aucun », le balayage doit couvrir
**exactement** ce périmètre (ici : `lintFilePatterns` d'`angular.json`, `.ts` **et** `.html`) et
porter un **contrôle positif dédié** — une fixture qui prouve qu'un `.html` réel est bien lu, pas
seulement les `.ts` — sinon un balayage vide ou incomplet reste vert indéfiniment : seul un contrôle
positif distingue « rien trouvé » de « rien regardé ». En **élargissant** un garde-fou existant,
premier réflexe systématique : quel format de fichier, quelle syntaxe, quel chemin d'appel le
nouveau balayage laisse-t-il encore dehors — c'est précisément là que la récidive s'est logée ici.
Valider par mutation (faux contournement injecté dans chaque format couvert, doit rougir en nommant
le fichier). Troisième occurrence de la famille [[S-003]] (garde-fou qui doit prouver avoir tout vu)
/ [[S-009]] (justification qui promet plus que le code n'applique) : nommer l'invariant plutôt que
d'empiler un quatrième cas.
**Réfs.** `src/app/features/cours/lecon/rendu-blocs/rendu-blocs.ts`,
`src/garde-fou-contournements-sanitizer.spec.ts`, `angular.json` (`lintFilePatterns`),
`.claude/rules/security.md` §4, `docs/agile/backlog-phase-1.md` §E2-ST2.
