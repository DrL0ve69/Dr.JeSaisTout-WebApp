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

**⚠️ ÉCART ASSUMÉ, DÉCLARÉ ICI PARCE QU'IL NE DOIT PAS SE TAIRE — `style-src`, décision E-3 du lot E
(E2-ST3, 2026-08-18), AMENDÉE le jour même après revue sécurité.** `script-src` respecte la règle
ci-dessus à la lettre ; `style-src` **non**, et c'est un choix, pas un oubli. Jusqu'au 2026-08-18 le
générateur hachait **tout** bloc `<style>` de l'artéfact : la permission se dérivait entièrement de
la sortie, et le premier `.scss` d'un composant interactif (E2-ST3) y aurait ajouté un hachage **en
silence**.

**🔴 Ce que la première rédaction de cette note promettait à tort — la lire avant tout le reste.**
Elle annonçait qu'« un bloc injecté par autre chose qu'Angular — **un composant** — ne peut plus
s'auto-autoriser ». C'est **faux, et c'était mesurable** : les blocs `<style>` de l'artéfact **sont**
les styles des composants (`[_nghost-ng-c…]`), tous émis par Angular avec `ng-app-id="ng"`. La revue
a ajouté à l'artéfact réel un `<style ng-app-id="ng">.quiz[_ngcontent-ng-c999]{color:red}</style>` →
**code 0, 9 → 10 hachages, aucun signal**. Borner à `ng-app-id="ng"`, c'est borner à un **marqueur**,
pas à une **provenance** : le producteur légitime porte lui-même le marqueur. Le texte était donc
exactement la faute qu'il prétendait éviter ([[S-009]]), et l'écart résiduel était déclaré trop
étroit — il portait sur **le nombre de blocs et leur contenu**, pas sur « le contenu d'un bloc ».

**La dérivation est désormais bornée par TROIS contrôles cumulés :**
· **PROVENANCE** — seuls les blocs `<style ng-app-id="ng">`, **sans aucun autre attribut** ;
· **PLACE** — enfant direct de `<head>` ou `<body>`. `<noscript><style ng-app-id="ng">` (et
`<svg><style …>`) étaient acceptés et hachés : script activé, le navigateur ne voit **aucun élément**
dans le `<noscript>`, et son contenu obtenait pourtant un hachage dans un `style-src` **global** —
divergence d'analyseurs de la famille [[S-001]] ;
· **NOMBRE ÉPINGLÉ** — `NOMBRE_HACHAGES_STYLE_ATTENDU` (9 au 2026-08-18), miroir exact de
`hachagesScript.size !== 1`. Toute divergence fait échouer la construction, avec la consigne
`security-reviewer` **PUIS** mise à jour de la constante. **Jamais l'inverse.**

· **Ce qui est fermé** : qu'un hachage de style **apparaisse dans la CSP sans que personne ne le
voie**. Un composant neuf porteur de styles rougit **une fois** et passe en revue (~3-4 fois d'ici la
fin d'E2 : ST4, ST5, ST6) — c'est le comportement voulu, pas une nuisance.
· **Ce qui reste ouvert** : le **contenu** de chaque bloc reste **dérivé**, jamais comparé à une
valeur revue. `style-src` n'est donc **pas** une liste blanche nominative comme `script-src` — le
**nombre** est épinglé, les **valeurs** ne le sont pas. Aucun texte du dépôt ne doit laisser croire
l'inverse.
· **Pourquoi le nombre et non les valeurs** : un `HACHAGE_STYLE_ATTENDU` par bloc rougirait à
**chaque `.scss` touché** ; la pression à contourner le garde-fou serait permanente, sur un fichier
dont [[S-011]] montre qu'il en subit déjà. Éditer un `.scss` ne change **pas** le compte : l'objection
qui écarte l'épinglage des valeurs ne s'applique pas à celui du nombre. Un garde-fou qu'on désarme
sous la pression protège moins qu'un garde-fou plus faible qui tient.
· **Le garde-fou est CÂBLÉ** : `src/config-swa-provenance-style.spec.ts` exécute la ligne de commande
réelle sur un artéfact jetable — sept refus nommés (provenance ×3, contrôle de conservation [[S-003]]
×2, place ×2, plus le **bloc de trop** qui est le seul à voir un `.scss` neuf) et trois
contre-épreuves acceptées. Sans elles, les refus seraient compatibles avec un générateur qui refuse
tout ([[L-019]], axe câblage). Les trois contrôles sont prouvés par **mutation** (compte permissif →
1 rouge nommant 10 vs 9 · contrainte de place neutralisée → 2 rouges · ancrage du compte brut
relâché → 1 rouge).
· **La cause éditoriale se dit dans le code** : le contrôle de conservation rougit aussi sur un
`<style` en commentaire, dans un `<template>`, dans une chaîne de script, ou dans une **valeur
d'attribut** — messages qui accusent la CSP pour une faute de rédaction ([[S-011]]). Le cas
`<style-guide>` (élément dont le nom commence par `style`) a été supprimé à la racine en ancrant le
comptage brut sur `/<style[\s>/]/gi` : ce sont exactement les caractères qui terminent un nom de
balise, donc aucun vrai `<style>` n'échappe au compte.
· **Le bloc `<style>` est ANALYSÉ (jsdom), pas apparié par motif** — la branche `<script>` du même
fichier reste sur motif, et ce trou-là est [[S-003]], lot autonome à payer avant E3-ST1. Le patron à
y transposer est la branche `<style>`, pas un motif de plus.

**Réfs.** `tools/deploiement/generer-config-swa.mjs`, `config/staticwebapp.config.source.json`,
`src/config-swa-provenance-style.spec.ts`, `.claude/rules/security.md` §1,
`docs/agile/backlog-phase-1.md` §E1-ST1 (ST1-C) et §E2-ST3 (décision E-3).

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

**✅ MESURÉE le 2026-08-18 (lot E d'E2-ST3), sur la page de leçon réellement interactive (quiz à
l'écran) — deux instruments indépendants, résultat qui affine la crainte plutôt que de la confirmer
telle quelle.** Côté artéfact : la page interactive gagne bien un script inline de plus
(`<script id="ng-state" type="application/json">`, l'état d'hydratation), mais son `type` est
**inerte** — le navigateur ne l'exécute pas, la CSP ne le soumet pas à `script-src`, qui **n'a pas
bougé** (liste nominative, un seul élément, intacte). Ce qui bouge, c'est `style-src`
(+3 hachages, un par bloc de styles de composant). Côté navigateur : `npx swa start` + Playwright,
quiz réellement actionné (radios, `<select>`, correction) → **0 violation**, avec contrôle positif
et témoin que la politique est appliquée (pas `report-only`).
**Correction à la règle : ce n'est pas `script-src` qui bouge quand une page de ce dépôt devient
interactive, c'est `style-src` — et `style-src` est dérivé de l'artéfact ([[S-002]], écart assumé)
là où `script-src` reste nominatif.** Le danger annoncé par S-005 a changé de directive sans changer
de nature ; revalider « la CSP au premier écouteur » reste juste, mais viser `style-src` en premier,
pas `script-src`, sur ce dépôt précis.
**Réfs additionnelles.** `docs/agile/backlog-phase-1.md` §E2-ST3 lot E (E-b2, E-c2).

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

**Quatrième occurrence, E2-ST5 lot a (2026-08-19) — le même patron sur un contrôle de COLLISION
d'`id`, pas sur un scan de fichiers.** La détection de collisions d'`id` d'étapes de simulation ne
confrontait qu'aux ancres de section, en **excluant** `ANCRES_RESERVEES` au seul motif — écrit en
**commentaire**, tenu par **aucun test** — qu'« elles commencent toutes par `titre-` ». Une future
ancre réservée nommée autrement aurait rouvert la collision en silence, et une collision d'`id`
utilisé comme cible de fragment (`#simulation-etape-3`) ne produit pas une erreur mais une
**navigation vers le mauvais élément**, silencieusement ([[L-030]] : un fragment nu se résout
contre `<base href>`). Corrigé en confrontant l'**union complète**
(`[...ANCRES_RESERVEES, ...ancresDuDocument]`) aux deux points de contrôle, ce qui rend le
commentaire vrai **par construction du code** plutôt que par relecture. Même famille, même correctif
que la règle ci-dessus : une exclusion de périmètre justifiée en prose seule, sans contrôle positif,
est une promesse non tenue.
**Renfort complémentaire, à ne pas confondre avec la règle ci-dessus mais à appliquer ensemble** :
l'`id` de chaque étape est bâti depuis `rang + 1` (la **position** dans le tableau), **jamais** depuis
`etape.numero` qui vient du contenu — et `numero` est par ailleurs borné trois fois (schéma, script de
validation, égalité stricte à la frontière). Un `id` dérivé du contenu peut être **forgé** par
l'auteur d'une leçon ; un `id` dérivé de la position ne le peut pas. Bâtir un identifiant de collision
depuis la position/une constante, et confronter cet identifiant à l'espace de noms **complet**, sont
les deux moitiés d'un seul geste correct.
**Réfs additionnelles.** `src/app/features/cours/contenu-compile.ts` (`ANCRES_RESERVEES`),
`src/app/features/cours/simulation/simulation.ts`, `docs/agile/backlog-phase-1.md` §E2-ST5 lot a.

## S-011 · Un garde-fou qui balaie la SORTIE rencontre un jour le contenu qui enseigne le motif qu'il refuse (A05 · pression d'assouplissement)

**Symptôme.** `tools/deploiement/generer-config-swa.mjs` lit le HTML prerendu et refuse deux
séquences : le style en ligne (` style="`, ligne 379) et tout gestionnaire d'événement en ligne
(` on[a-z]+="`, ligne 333). C'est juste — ce sont exactement les formes que la CSP à hachages ne
peut pas autoriser. Mais le `QuizComponent` (E2-ST3 lot C) affiche du code **volontairement
vulnérable** par interpolation, et l'interpolation d'Angular n'échappe **que** `&`, `<` et `>` : les
guillemets et le signe `=` passent intacts. Une question « trouver la faille » d'une leçon sur le
XSS, qui contient `onerror="alert('XSS')"` — c'est-à-dire la charge la plus banale du sujet le plus
central du cours — arrive donc **littéralement** dans le HTML servi et fait **échouer le build**,
sur un message accusant la CSP alors que la cause est un texte de quiz parfaitement sûr. Le
composant documentait le mode d'échec, mais pour un seul des deux motifs (` style="`) : celui de la
leçon sur la CSP, pas celui de la leçon sur le XSS.

**Pourquoi c'est une leçon de sécurité et non un bogue d'ergonomie.** La panne est **fail-closed**,
donc saine ; le danger est ailleurs. Le jour où elle survient, elle survient **au moment de publier
une leçon**, avec un diagnostic trompeur — et la correction la plus rapide, celle qui vient à
l'esprit sous pression, est d'**assouplir le garde-fou** (exclure la page de leçon du balayage,
retirer un motif). Sur un site dont la raison d'être est d'enseigner la CSP, ce serait perdre la
mesure au moment précis où on prêche. Un garde-fou de sortie sur un site pédagogique a une
propriété qu'il n'a nulle part ailleurs : **son motif est aussi une matière d'enseignement**, donc
sa collision avec le contenu est certaine, pas hypothétique.

**Règle.** Un garde-fou qui balaie une **sortie rendue** (HTML prerendu, artéfact publié) doit
énumérer **tous** ses motifs à l'endroit du code qui peut les produire, et ce mode d'échec doit être
**mesuré par un test**, jamais promis par un commentaire (sinon [[L-008]]). Le test à écrire est
comportemental et à deux mains : (a) la charge s'affiche **entière** à l'écran et n'engendre **aucun
nœud** (ni `img`, ni `script`, aucun attribut `on…`/`style` sur un élément réel) — c'est la preuve
d'innocuité que doit à lui-même un site qui affiche des payloads ; (b) le HTML sérialisé **contient
encore** la séquence que le garde-fou cherche — c'est la preuve que la collision existe, et le jour
où cette assertion tombe, c'est la note qui doit partir, pas le garde-fou. Et la parade éditoriale
est du côté du **contenu** (guillemets typographiques, entité), jamais du côté de la mesure.
Corollaire de méthode, valable au-delà de ce cas : une note « mode d'échec à connaître » qui cite un
garde-fou doit relire ce garde-fou et **compter ses motifs**, pas nommer celui auquel on pensait.

**Réfs.** `src/app/features/cours/quiz/quiz.ts` (note du cas `trouver-la-faille`),
`src/app/features/cours/quiz/quiz.spec.ts` (« AFFICHE une charge utile sans en faire naître un seul
nœud »), `tools/deploiement/generer-config-swa.mjs` (lignes 333 et 379),
`.claude/rules/security.md` §1 et §4, `.claude/rules/contenu-pedagogique.md` §4.

## S-012 · `npx` dans un job de CI qui produit l'artéfact publié est une résolution de code NON ÉPINGLÉE au moment de l'exécution (A08 · CICD-SEC)

**Symptôme.** `ci.yml` bâtissait l'artéfact avec `npx ng build`. `npx` installe depuis le registre
npm ce qu'il ne trouve pas localement (et exécute ses scripts de cycle de vie) : si `@angular/cli`
disparaissait des dépendances déclarées, ou si `npm ci` échouait à moitié sans faire échouer
l'étape, la CI irait chercher un `ng` non épinglé dans le job même qui produit ce qui part en
ligne. Constats SonarCloud `githubactions:S6505` + `S8543`, tous deux justes — aucun `// NOSONAR`
ni `sonar.issue.ignore.*` posé : sur un site qui enseigne la sécurité, on ne muselle pas un constat
juste quand la voie sûre est gratuite.
**Règle.** Dans un job de build/CI, appeler le binaire résolu par `npm ci`
(`node_modules/.bin/<outil>`), jamais `npx <outil>` — `npx` ne peut alors rien installer et échoue
proprement si le binaire manque, au lieu d'aller chercher une version non épinglée à l'exécution.
Même famille que la dette déjà notée sur `Azure/static-web-apps-deploy@v1` (tag mutable dans le job
qui détient le jeton) : une commande de CI capable de résoudre du code non épinglé au runtime, dans
un job sensible.
**Réfs.** `.github/workflows/ci.yml`, `docs/agile/backlog-phase-1.md` §E2-ST3 lot E.

## S-013 · Un aléa faible dans un INSTRUMENT DE MESURE de sécurité ne crée pas une faille, il crée un FAUX NÉGATIF (A05 · CWE-330 appliqué à un gate)

**Symptôme.** `e2e/aides/sonde-csp.ts` employait `Math.random()` pour produire un jeton par
document, servant à dédupliquer les violations CSP relevées pendant l'e2e sous CSP réelle. La
prédictibilité de `Math.random()` n'ouvrait aucune faille ici — le jeton n'autorise rien. Le risque
était qu'une valeur **répétée** entre deux documents ferait taire à tort une violation par
déduplication, donc rendrait **vert** le seul gate qui mesure la CSP à l'exécution (constat
SonarCloud `typescript:S2245`). Corrigé en `crypto.randomUUID()`.
**Règle.** Dans le code d'un gate/instrument de mesure (e2e, sonde, harnais de vérification), traiter
tout usage d'aléa comme un risque de **faux négatif silencieux**, pas seulement de prévisibilité
exploitable — l'un menace la mesure elle-même, l'autre menace ce qu'elle mesure. Utiliser
systématiquement `crypto.randomUUID()`/`crypto.getRandomValues()`, même sans usage cryptographique
apparent, dès que la valeur sert à distinguer des événements dans un gate de sécurité : un faux
négatif s'y lit comme une preuve.
**Réfs.** `e2e/aides/sonde-csp.ts`, `docs/agile/backlog-phase-1.md` §E2-ST3 lot E.

## S-014 · La règle « analyser, jamais apparier par motif » vaut pour TOUTE chaîne qui contient une entrée — même un contrôle de conservation, même sur une sortie d'outil réputée sûre (A03/A05 · CWE-116, quatrième occurrence de la famille [[S-001]]/[[S-003]]/[[S-009]])

**Symptôme.** `verifierAncres` (E2-ST4 lot A2, `compiler-markdown.mjs`) devait exiger qu'une ancre
`class="line ancre-ligne-N"` soit posée sur chaque ligne du HTML produit par Shiki. Première
écriture : une regex `\bligne-(\d+)\b` appliquée à la **chaîne HTML complète** — laquelle contient
le **texte du code de l'auteur**, une entrée. `security-reviewer` a débranché le transformateur qui
pose les ancres et rejoué le vrai Shiki : code neutre ⇒ rougit correctement ; le même code avec un
commentaire `// voir ligne-1, ligne-2, ligne-3` ⇒ le garde-fou passe **vert avec zéro ancre posée**.
L'entrée fournissait elle-même la preuve qu'on lui réclamait. Aggravant : le commentaire du code
invoquait explicitement « patron S-003 » en commettant précisément la faute que S-003 nomme.
**Ce que S-001/S-003/S-009 ne disaient pas encore.** Les trois précédents portaient sur un contenu
**manifestement hostile** (SVG, HTML de contenu) — la lecture naturelle de « analyser plutôt que
filtrer par motif » est une règle **anti-XSS**. Ici la chaîne analysée est une **sortie d'outil
réputée sûre** (Shiki) et le motif cherché est **notre propre marqueur**, pas celui d'un attaquant :
on croit donc être hors périmètre en écrivant « un simple contrôle de conservation ». La règle vaut
en réalité dès qu'on **cherche un motif dans une chaîne qui contient une entrée**, quel que soit le
but poursuivi — vérification de conservation comprise, pas seulement sanitisation.
**Règle.** Sur toute chaîne structurée qui contient une entrée non fiable (y compris le texte d'un
exemple de code d'une leçon), analyser l'arbre réel (jsdom, déjà dépendance du dépôt — patron de
référence `rendre-mermaid.mjs::analyserSvg`) et confronter à un sélecteur/une structure
**nominative** — jamais une regex sur la chaîne sérialisée, même pour un contrôle qui se veut
seulement défensif ou seulement conservatoire. Corollaire à retenir : **un garde-fou dont l'entrée
peut elle-même fabriquer la preuve qu'il exige n'est pas un garde-fou.** Renfort structurel : exiger
une suite **ordonnée** (`1…N`, pas un `Set`) quand la propriété vérifiée est une couverture complète
— un ensemble aurait laissé passer une base 0 ou un décalage. Et fournir un **contrôle positif
exécutable** (HTML forgé, code de sortie attendu) plutôt qu'une conviction lue sur le code.
**Réfs.** `tools/content-pipeline/compiler-markdown.mjs` (`verifierAncres`),
`tools/content-pipeline/rendre-mermaid.mjs` (`analyserSvg`, patron de référence),
`src/pipeline-contenu-compilation.spec.ts`, `.claude/rules/security.md` §4,
`docs/agile/backlog-phase-1.md` §E2-ST4 lot A2.

## S-015 · Un garde-fou par motif peut échouer par SUR-refus — et sur ce dépôt, le contenu le plus certain de le déclencher est la leçon qui enseigne le motif surveillé, sans parade éditoriale possible (A05/CWE-116 · sur-refus, axe neuf sur la famille [[S-001]]/[[S-003]]/[[S-009]]/[[S-014]])

**Symptôme.** Le garde-fou « zéro style en ligne » de `compiler-markdown.mjs` cherchait
`/\sstyle\s*=/i` et `/<style[\s>]/i` dans la chaîne HTML produite par Shiki — laquelle contient le
texte du code de l'auteur, une entrée. `security-reviewer` a reproduit : un exemple PHP contenant
`$html = '<p style="color:red">';` fait échouer G-content, sur le message « la coloration a produit
du style en ligne », alors que le style provient du **texte du code**, pas de Shiki. Shiki laisse
les guillemets bruts dans le texte : le sur-refus n'est pas théorique.
**Ce qui est neuf par rapport à [[S-014]].** S-001/S-003/S-009/S-014 portaient tous sur le
**contournement** (une entrée hostile satisfait ou échappe au garde-fou). Ici le défaut va dans
l'autre sens : le garde-fou refuse du contenu légitime — et pas n'importe lequel, la leçon qui
**enseigne** le motif qu'il surveille, sur un site dont c'est la raison d'être. Et à la différence
de [[S-011]] (même famille de collision contenu/garde-fou), **aucune parade éditoriale n'existe** :
on ne met pas de guillemets typographiques dans un extrait de code, il doit rester copiable et
exact. La seule issue apparente était donc de désarmer un contrôle de CSP sur le site qui
l'enseigne — jonction S-011 × S-014, qui mérite d'être nommée pour être retrouvée.
**Règle.** Sur un garde-fou de sortie dont l'entrée peut légitimement contenir le motif recherché
**sans échappatoire éditoriale** (code source affiché tel quel, contrairement à une question de
quiz), le seul correctif viable est de faire porter le contrôle sur la **structure réelle produite**
(élément `<style>` réel, attribut `style` réel via jsdom — patron [[S-014]]), jamais sur le texte
qui la contient. Ne pas confondre avec S-011 : là où S-011 accepte une parade côté rédaction, ici il
n'y en a pas — la seule sortie est l'analyse structurelle. Vérifié par deux contrôles positifs, dont
un appel direct de la fonction corrigée (`verifierZeroStyle`, exportée pour ça) sur du HTML forgé.
**Réfs.** `tools/content-pipeline/compiler-markdown.mjs`, `.claude/rules/security.md` §4,
`docs/agile/backlog-phase-1.md` §E2-ST4 lot B.

## S-016 · Un collecteur de `securitypolicyviolation` mesure « rien d'observable par CET événement », pas « rien de bloqué » — et la portée réelle de `style-src` n'est pas celle qu'on croit (A05 · faux négatif d'instrument, cousin de [[S-005]]/[[S-013]])

> **✅ DETTE PAYÉE le 2026-08-19 (E2-ST5, lot c2)** — par `exigerStyleSrcApplique` /
> `mesurerStyleSrc` dans `e2e/aides/sonde-csp.ts`, exercées par
> `e2e/simulation-sous-csp.spec.ts` sur la page de leçon, simulation actionnée, sous la CSP
> réellement servie. **La règle de la leçon tient ; sa PRÉMISSE FACTUELLE était fausse et est
> corrigée ci-dessous.**

**Symptôme d'origine (2026-08-19, E2-ST4 lot C).** Sous CSP réellement servie, une écriture de
style par CSSOM (`el.style.top = '-200px'`) semblait acceptée dans le DOM, jamais appliquée, sans
événement `securitypolicyviolation` ni message de console. D'où la crainte : « la politique mord en
silence, un collecteur d'événements ne le verra pas ».

**🔴 CE QUE LA MESURE DU LOT c2 A ÉTABLI — la prémisse était un ARTEFACT DE PROPRIÉTÉ.** Quatre
écritures distinctes, même page, même politique servie, `npx swa start` + Chromium réel :

| Canal | Effet (`getComputedStyle`) | Événement |
|---|---|---|
| `<style>` inline non haché inséré par la page | **refusé** | `style-src-elem ← inline` ✅ |
| `element.setAttribute('style', '…')` | **refusé** (l'attribut se relit intact) | `style-src-attr ← inline` ✅ |
| `element.style.setProperty(…)` | **appliqué** | aucun — *et c'est normal* |
| `element.style.cssText = …` / `element.style.paddingTop = …` | **appliqués** | aucun |
| `<link rel="stylesheet">` de **même origine** (`'self'`) | **appliqué** | aucun |

La frontière n'est donc **pas** « CSSOM contre attribut » mais **« écriture propriété par propriété
contre ANALYSE d'un texte de déclaration »** : `style-src-attr` gouverne le *parsing* de l'attribut
`style`, pas les accesseurs de `CSSStyleDeclaration`. Et **les deux canaux réellement refusés SONT
rapportés** par `securitypolicyviolation`.
**Pourquoi la mesure d'origine a conclu l'inverse** : `el.style.top = '-200px'` portait sur un
élément en **position statique**, où `top` n'a aucun effet visuel. Rejouée au lot c2, la valeur est
bel et bien appliquée (`getComputedStyle` rend `-200px`). Le même mode d'échec a mordu **une
seconde fois pendant l'écriture du correctif** : la sonde employait d'abord `outline-offset`, que
Chromium résout à `0px` tant que `outline-style` vaut `none` — les trois canaux rendaient alors la
même valeur, et les deux refus se seraient lus comme des succès. **Une propriété témoin doit se
RÉSOUDRE inconditionnellement** (`padding-top` a été retenue) — sans quoi on mesure la propriété,
pas la politique.

**⚠️ CE QUI RESTE VRAI, ET QUI EST LA LEÇON.** La règle ne change pas d'un mot : **ne jamais
présumer qu'une directive CSP est observable par `securitypolicyviolation` sans contrôle positif
DÉDIÉ à cette directive** — le contrôle positif de `script-src` ne vaut pas preuve pour `style-src`.
Ce qui a changé, c'est que la question est maintenant **tranchée par une mesure** au lieu d'être
tranchée par une inférence. Et l'inférence était fausse **dans les deux sens** : elle accusait le
navigateur d'être muet là où il parle, et elle laissait croire qu'un canal était fermé alors qu'il
est **hors périmètre**.

**🔴 LA PORTÉE RÉELLE DE LA PROTECTION, À ÉCRIRE PARTOUT OÙ ON LA CITE.** `style-src` **n'empêche
pas** un script déjà en cours d'exécution de restyler la page ; il ferme l'**INJECTION** de style —
un `<style>` ou un `style="…"` glissé dans du contenu. C'est exactement la surface d'un site de
contenu compilé, donc exactement la bonne protection ici — mais l'écrire comme « la CSP interdit
tout style dynamique » serait une garantie surestimée, famille [[S-009]].

**Forme du contrôle positif, et pourquoi celle-là.** Il **mesure l'EFFET, pas l'événement** —
`getComputedStyle` est le seul instrument qu'une politique ne peut pas rendre muet. Et c'est une
**pince** ([[L-019]]) : quatre canaux, même déclaration, même page — deux doivent être refusés, le
canal `'self'` doit **passer** (sans lui, « la valeur n'a pas bougé » serait indiscernable d'un
témoin jamais inséré), le canal CSSOM est mesuré pour **écrire la portée** au lieu de la supposer.
Deux détails payés en direct : le canal autorisé sert de **barrière de temps** (l'événement `load`
d'un `<link>` **précède** l'application de la feuille de ~25 ms — relever trop tôt rendrait « refusé »
sur un canal autorisé), et il passe par `page.route` plutôt que par un fichier écrit dans `dist/`,
que `deploy.yml` scelle par empreintes sha256.

**Mutations exécutées (pas raisonnées), 2026-08-19.** (a) hachage du bloc sondé ajouté à `style-src`
→ le contrôle rougit sur le canal élément (`13px` au lieu de `0px`) ; (b) `'unsafe-hashes'` + hachage
de la déclaration → il rougit sur le canal attribut ; (c) hachage de la feuille `.simulation` retiré
de la directive → l'énumération des blocs de la page rougit sur 3 orphelins. Un `'unsafe-inline'` nu,
lui, est arrêté **plus tôt**, par `exigerCspServie`.

**Ce qui reste ouvert.** Le contrôle vit sur la page de leçon de la **fixture**, servie par
`npx swa start` **en HTTP sur localhost** : il ne dit rien de `frame-ancestors`, de HSTS ni
d'`upgrade-insecure-requests`, inobservables là (voir l'en-tête de `playwright.config.ts`), et il
n'est **pas** rejoué en ligne par `deploy.yml`, qui vérifie la politique **écrite** et non son
application.

**Réfs.** `e2e/aides/sonde-csp.ts` (`mesurerStyleSrc`, `exigerStyleSrcApplique`),
`e2e/simulation-sous-csp.spec.ts`, `src/configuration-typescript.spec.ts` (épinglage L-034),
`.claude/rules/security.md` §1, `.claude/lessons/lessons-learned.md` **L-041** *(à corriger : sa
prémisse factuelle est infirmée par la mesure ci-dessus — sa consigne pratique, « ne déplacer aucun
élément par le style dans un spec », reste bonne, mais pour une autre raison : un `style="…"` est
bel et bien refusé, tandis qu'une écriture CSSOM passe, ce qui rend le geste imprévisible selon la
forme employée)*, `docs/agile/backlog-phase-1.md` §E2-ST5 lot c2.

## S-017 · Une clé venue du contenu (`JSON.parse`) qui indexe un objet PAR CROCHETS peut remonter `Object.prototype` — un motif kebab-case ne l'exclut pas (A03 · CWE-1321, troisième occurrence sur ce dépôt)

**Symptôme.** Constaté en revue du lot a d'E2-ST5 : `acteur.id` est validé par le motif kebab-case
`^[a-z0-9]+(-[a-z0-9]+)*$`, qui **accepte** `constructor` — les underscores de `__proto__` sont
refusés par le motif, ce qui donne une fausse impression d'avoir fermé la classe. Une lecture par
indexation directe `panneaux[acteur.id]` sur un objet issu de `JSON.parse` **sans cette clé** aurait
rendu `Object.prototype.constructor` — une fonction, valeur *truthy* — qui aurait traversé un `@if`
et peint un panneau vide, sans qu'aucune exception ne signale la faute de contenu. `prototype` seul
est inoffensif sur un objet simple ; c'est `constructor` (et par la même logique `__proto__` si le
motif l'avait laissé passer) le cas réellement exploitable par indexation par crochets.
**Ce n'est pas un cas isolé.** Le dépôt porte déjà la trace écrite de ce même piège à au moins deux
autres endroits — `resoudre-lecon.ts` et `NIVEAUX_LISIBLES` dans `lecon.ts` — ce qui en fait la
**troisième occurrence** connue. Un principe rappelé en commentaire à chaque site d'appel n'a pas
empêché la récidive : la connaissance était présente, elle n'était simplement pas **imposée par le
type/le contrat**.
**Règle.** Sur toute clé issue du contenu (`JSON.parse`, frontmatter, identifiant d'auteur) qui sert
à indexer un objet simple par crochets, refuser à la frontière selon un ensemble **clos et
énumérable** — `Object.hasOwn(Object.prototype, id)` plutôt qu'une liste noire de motifs
(`__proto__`, `constructor`, `prototype`…) qui ne couvre que ce dont on se souvient. Et, au **contrat
de données** (pas seulement en commentaire au point d'appel), imposer que toute lecture indexée par
une clé de contenu se fasse par `Object.hasOwn` ou par une `Map` — jamais par indexation directe
`objet[cle]`. Sur ce dépôt, la troisième occurrence du même piège appelle un renfort permanent :
`.claude/rules/security.md` §4/§6 devrait porter ce garde-fou comme geste systématique, pas comme
rappel au cas par cas.
**Réfs.** `src/app/features/cours/simulation/simulation.ts` (lignes ~76-95, ~536, ~562-563),
`src/app/features/cours/lecon/resoudre-lecon.ts`, `src/app/features/cours/lecon/lecon.ts`
(`NIVEAUX_LISIBLES`), `.claude/rules/security.md` §4, `docs/agile/backlog-phase-1.md` §E2-ST5 lot a.
