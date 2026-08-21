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

**✅ FERMÉE pour `generer-config-swa.mjs` (PR #27, lot de dette pré-E3-ST1, 2026-08-19).** Le
garde-fou script **et** style reposent désormais sur un seul parse jsdom par page ; les motifs
restants ne servent plus qu'à **compter** le brut pour le contrôle de conservation, jamais à
décider — 14 contournements exécutés par `npm test`. **Reste hors de cette fermeture** : tout autre
garde-fou par motif du dépôt (voir [[S-014]]/[[S-015]] pour `compiler-markdown.mjs`).

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

**✅ RENFORT le 2026-08-19 (PR #28, lot de dette pré-E3-ST1) : la substitution des jetons
`__HACHAGES_*__` est désormais vérifiée SOURCE PAR SOURCE, pas seulement par comptage.** Un
`'unsafe-inline'` glissé en 2ᵉ position derrière un hachage valide passait un contrôle qui ne
comptait que le nombre d'entrées ; il est refusé maintenant que chaque valeur substituée est
confrontée individuellement à la liste attendue. Même famille que [[S-002]] (une autorisation se
compare à une valeur revue, jamais à un compte) — la vérification en ligne de la CSP servie
([[S-008]]) énumère de même ses 11 directives une à une dans le journal, pour que « absence de
comparaison » et « 0 divergence » restent distinguables au log.

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

**🔴 RENFORT le 2026-08-20 (encadrés de provenance, `fix/intermittence-gates-pre-e3-st1`) — la
promesse et le code étaient dans le MÊME diff, écrits à quelques minutes d'intervalle, et personne
ne les a confrontés.** `MARQUEURS_PROVENANCE_LITTERAUX` (règle G1 : aucun pictogramme de provenance
littéral en prose) ne couvrait que **📘** et **🧩**, tandis que **trois** documents livrés au même
lot affirmaient que **⚠️** l'était aussi (`docs/contenu/pipeline-contenu.md`, la note de
`tools/content-pipeline/types.d.ts`, et la table des pictogrammes qui déclare ⚠️ « réservé »).
**Conséquence concrète, et elle n'est pas cosmétique** : un ⚠️ littéral en prose accuse le cours
**sans** `::: correction-du-cours`, donc **sans l'attribut `source` obligatoire, donc hors de G3** —
exactement l'accusation non sourcée que `.claude/rules/contenu-pedagogique.md` §6 classe comme
**défaut grave** (elle salit un enseignant sur une lecture rapide).
**Règle renforcée.** La liste de caractères/motifs d'un garde-fou et **toute prose qui l'énumère**
sont **un seul artéfact** : elles se relisent ensemble, dans le même diff, en **comptant les
entrées de part et d'autre** ([[S-011]], corollaire de méthode). Écrire « X, Y et Z sont réservés »
sans que Z figure dans la constante, c'est délivrer une permission qu'aucun humain n'a revue
([[S-002]] : on compare à une **valeur**, jamais à une intention).
⚠️ **Variante de saisie à couvrir en même temps :** ⚠️ s'écrit **U+26A0 suivi de U+FE0F**
(sélecteur de variante). Une liste de caractères qui ignore les sélecteurs de variante — ou qui
n'inscrit que la forme composée — se contourne sans même passer par les entités ([[S-022]]).
**Réfs additionnelles.** `tools/content-pipeline/valider.mjs`
(`MARQUEURS_PROVENANCE_LITTERAUX`), `docs/contenu/pipeline-contenu.md`,
`tools/content-pipeline/types.d.ts`, `.claude/rules/contenu-pedagogique.md` §6.

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

**Cinquième occurrence, E3-ST2/E3-ST3 (2026-08-21) — la promesse générique « LA page de leçon »
se rompt en silence dès qu'une deuxième leçon existe, SANS qu'aucun spec ne passe en `skip`.**
`style-src` gagne un 14ᵉ hachage (bloc `.simulation`, 4 775 o) en ajoutant la leçon `injection/`,
seule page de l'artéfact à porter `<app-simulation`. Le seul test qui **énumère** les blocs
`<style>` du DOM vivant et exige que chacun soit **nommé** par la CSP servie visait
`ROUTE_LECON_QUIZ` — la première page portant `<app-quiz` (`evaluation-cvss`), qui n'a **pas** de
simulation. Le bloc neuf n'était donc couvert par **aucun** instrument d'énumération : seul
subsistait le **compte global** de l'artéfact, qui ne dit rien de la **page d'origine** d'un bloc.
**Ce qui rend ce cas distinct de la règle ci-dessus et de [[S-023]] point 2 : rien n'a été
supprimé ni passé en `skip`.** Tant qu'une seule leçon existait, « la page de leçon » désignait un
objet unique par construction et deux constantes nommées d'après cet objet convergeaient
forcément ; à trois leçons, `ROUTE_LECON_QUIZ` et `ROUTE_LECON_SIMULATION` désignent deux pages
**différentes** sans qu'aucun texte ne le dise — la promesse d'unicité était vraie à l'écriture et
**devient fausse par la seule croissance du corpus publié**, sans qu'aucun diff ne la touche.
**Règle renforcée.** Quand un lot augmente un compte de permission CSP, recenser **quelle page**
produit chaque hachage neuf, puis vérifier qu'un instrument **énumère** les blocs de CETTE page
précise — un compte global ou un test visant « la » page de leçon ne suffit pas dès qu'il en existe
plusieurs. Tout littéral/constante nommé au singulier générique (`…_PAGE_LECON`) se renomme
d'après la page qu'il mesure réellement (`…_PAGE_QUIZ`, `…_PAGE_SIMULATION`) dès qu'une deuxième
variante de page apparaît dans le corpus publié — le renommage rend visible ce que le nom générique
masquait. Corollaire pour tout corpus qui grossit (leçons, pages, routes) : une promesse d'unicité
« la page de X » a une **date de péremption implicite**, le jour où un deuxième X publié existe ;
la revoir à ce moment-là n'est pas optionnel.
**Correctif appliqué.** `BLOCS_STYLE_PAGE_LECON` renommé `BLOCS_STYLE_PAGE_QUIZ` ; ajout de
`BLOCS_STYLE_PAGE_SIMULATION = 7` et d'un test qui rejoue « 0 orphelin » + le compte de blocs sur
`ROUTE_LECON_SIMULATION`, avec anti-vacuité exigeant qu'un bloc porte `.simulation`.
**Réfs additionnelles.** `e2e/aides/sonde-csp.ts`, `e2e/aides/artefact-mesure.ts`
(`ROUTE_LECON_QUIZ`, `ROUTE_LECON_SIMULATION`), branche `feat/e3-st2-st3-lecons` (2026-08-21).

**Sixième occurrence, E3-ST5 (2026-08-21) — un instrument dont la CIBLE est DÉCOUVERTE à
l'exécution déplace le problème vers la DÉTERMINATION de la population, pas la population
elle-même.** `e2e/aides/artefact-mesure.ts` documentait sa découverte de page comme « la première
page prerendue portant `<app-quiz>`/`<app-simulation>`, dans l'ordre alphabétique du dossier » —
phrase reprise par trois littéraux épinglés. **Fausse** : elle appelait `readdirSync`, qui ne trie
pas mais rend l'ordre du système de fichiers. Vraie par accident sur le NTFS du poste de revue.
Mesuré : l'ordre de création des cinq pages (`csrf, xss, injection, fondamentaux,
evaluation-cvss`) suit la fin d'un prerender **parallèle**, à 82 ms d'écart — ni alphabétique, ni
stable, rien ne garantit un ordre identique sur ext4 côté runner. Le risque empirait en silence :
`BLOCS_STYLE_PAGE_QUIZ` (6) était satisfait par 2 candidats sur 4 avant `csrf` ; après (7), par
**un seul sur cinq** — le pari devenait perdant sans qu'aucun gate ne le signale.
**Règle renforcée.** Distincte de la règle ci-dessus (qui dit « recense ce qu'un instrument cesse
de couvrir quand la population change ») : celle-ci dit **assure-toi d'abord que l'instrument vise
la même cible deux fois de suite**. Un compte épinglé sur une cible *découverte* doit soit être
invariant sur toutes les cibles possibles de la population, soit la découverte doit être
**totalement ordonnée** (`.sort(localeCompare)`), jamais confiée à l'ordre du système de fichiers —
qui diffère entre poste de revue et runner CI.
**Réfs additionnelles.** `e2e/aides/artefact-mesure.ts`, branche `feat/e3-st5-lecon-csrf`
(2026-08-21).

## S-025 · Un instrument d'énumération LIVE d'une directive DÉRIVÉE ne couvre que les formes de page déjà visitées par un test — jamais toutes les formes qui contribuent à la directive (A05 · trou de couverture non signalé, croisement [[S-010]]/[[S-016]])

**Symptôme.** `e2e/simulation-sous-csp.spec.ts` est le seul énumérateur live de blocs `<style>` du
dépôt, et il ne navigue que des pages de **leçon**. Mesure de l'artéfact E3-ST5 : `style-src` porte
**14** hachages, dont **7 seulement** naissent sur une page de leçon (couverts) ; les **7 autres**
— accueil (`.accueil`, `.toile`, `.piece`, `.carte`), sommaire (`.page`, `.vide`), 404
(`.cartouche-erreur`) — ne sont énumérés par **aucun** instrument live, avant comme après ce lot.
Seul le compte global les couvre, et un compte ne dit rien de l'origine d'un bloc.
**Règle.** Quand une directive CSP est **dérivée de l'artéfact** (ici `style-src`, S-005), la
couverture live doit énumérer **toutes les formes de page** qui contribuent à cette directive
(accueil, sommaire, 404, leçon quiz, leçon simulation…), pas seulement celle qui a motivé le
dernier lot. La couverture s'étend par accident, page par page, au gré de ce qu'on a testé — jamais
par conception ; recenser les formes de page **une fois**, puis vérifier l'union des hachages
qu'elles portent contre la directive servie.
**Corollaire de méthode, pour évaluer une perte de couverture.** Comparer des **unions de
hachages**, jamais des comptes de pages : la bascule d'une page de référence de S-010 (occurrence
5) semblait faire perdre la forme « leçon sans simulation », mais mesuré, les 6 blocs
d'`evaluation-cvss` sont un sous-ensemble strict des 7 de `csrf` — union avant = après = 7, zéro
hachage perdu. Un compte de pages aurait fait conclure à tort.
**Réfs.** `e2e/simulation-sous-csp.spec.ts`, `e2e/aides/sonde-csp.ts`, `docs/agile/backlog-phase-1.md`
§E3-ST5 (revue du 2026-08-21).

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

**✅ CONFIRMÉE close le 2026-08-19 (PR #27, lot de dette pré-E3-ST1) : le balayage de TEXTE brut a
disparu de `generer-config-swa.mjs`, remplacé par le parse jsdom (voir clôture de [[S-003]]
ci-dessus).** Une phrase d'auteur de leçon ne peut plus déclencher la branche « style/gestionnaire
en ligne » : seul un attribut/élément réellement présent dans l'arbre le peut. **Corollaire payé au
même lot ([[S-020]])** : fermer une collision texte↔motif en passant à un compte structurel
ré-ouvre la collision **à la valeur d'un attribut réel** dès que du texte d'auteur y est sérialisé
sans échappement de `<` — la parade reste éditoriale, jamais un relâchement du compte.

**🔵 GÉNÉRALISATION le 2026-08-20 (attribut `source` de `::: correction-du-cours`) — tout champ
d'AUTEUR en texte libre nouvellement rendu au DOM arrive avec son test « à deux mains ».**
`{{ bloc.source }}` est le **premier** champ d'auteur en texte libre rendu au DOM depuis le quiz.
**Aucune exposition n'a été trouvée** : la valeur est lue par une liste blanche à un nom, mise en
artéfact par `JSON.stringify`, rendue dans un **unique nœud texte**, jamais dans une valeur
d'attribut ; aucun `innerHTML`, aucun `bypassSecurityTrust*` dans le diff. **Mais l'invariant
n'était tenu par aucun test** — le jour où quelqu'un déplace la valeur dans un `[attr.…]`, rien ne
rougit, et le déplacement est banal (un `title`, un `aria-label`, une ancre).
**Règle générale.** Tout champ d'auteur en texte libre **nouvellement** rendu au DOM arrive dans le
même lot avec le test à deux mains décrit ci-dessus : (a) la charge s'affiche **entière** et
n'engendre **aucun nœud** ; (b) l'assertion qui épingle le **canal** (nœud texte, pas valeur
d'attribut). Exemplaire de référence déjà au dépôt :
`src/app/features/cours/quiz/quiz.spec.ts`, « AFFICHE une charge utile sans en faire naître un seul
nœud ».
**Distinction à ne pas perdre** (elle sépare « le build casse » de « rien ne se passe ») : la
collision S-011 avec le générateur de CSP porte sur les **valeurs d'attribut**, où la sérialisation
n'échappe pas `<` — pas sur les **nœuds texte**, qu'Angular échappe (`&`, `<`, `>`). Déplacer un
champ d'auteur du texte vers un attribut change donc **les deux** propriétés d'un coup : innocuité
et bruit de gate.
**Réfs additionnelles.** `src/app/features/cours/lecon/rendu-blocs/rendu-blocs.ts`
(rendu de `bloc.source`), `tools/content-pipeline/valider.mjs` (règle G3),
`.claude/rules/contenu-pedagogique.md` §6.

**🔵 NOUVELLE OCCURRENCE le 2026-08-20 (lot E6 « Moniteur ambre ») — le motif surveillé N'A MÊME
PAS besoin d'un attribut réel, un COMMENTAIRE HTML suffit.** Le contrôle de conservation de
`generer-config-swa.mjs` compte les occurrences **brutes** de `<script[\s>/]` dans le HTML —
**commentaires HTML compris**, parce qu'un commentaire n'est pas retiré du texte balayé. Un
commentaire de `src/index.html` citant la balise en clair (« … le `<script>` anti-flash … ») a
fait échouer la construction, **code 1 sur les 5 pages**, sur un dépôt par ailleurs sain — le
même patron que le symptôme d'origine, mais sans qu'aucun texte d'auteur de leçon ne soit en
cause. La parade reste la même : **éditoriale** (« ‹script› », entité), jamais un assouplissement
du compte. Ce n'est pas qu'une leçon publiée qui peut déclencher S-011 — n'importe quel
commentaire de code du dépôt qui documente ce garde-fou en citant son motif littéralement le peut
aussi.

**✅ MESURÉE EMPIRIQUEMENT le 2026-08-21, sur la vraie leçon `04-xss` publiée.**
`dist/dr-je-sais-tout/browser/cours/securite-web/xss/index.html` porte **2 occurrences littérales**
de `onerror=alert(1)` dans des nœuds texte (à l'intérieur de `<code>`) — et `npm run build` est
**VERT**. La parade éditoriale (guillemets typographiques, entités) n'a donc **plus lieu d'être**
pour du texte d'auteur en nœud texte : elle **dégraderait la pédagogie** sans corriger de risque
réel — mettre des guillemets typographiques dans une charge XSS destinée à être lue et comprise
apprend au lecteur une charge qui ne fonctionne pas. **L'issue** : le lot de dette pré-E3-ST1
(2026-08-19) a remplacé le balayage de texte brut par un parse jsdom structurel ; cette collision
est donc **structurellement close** pour tout nœud texte, et le restera tant que le générateur
n'ajoute pas de contrôle de conservation sur la branche attributs (voir « CE QUI LA ROUVRIRAIT »
dans le commentaire d'en-tête de `quiz.ts`).
**Ce qui subsiste, à ne pas perdre — les QUATRE écarts nommés à la source
(`generer-config-swa.mjs:755-763`, jumeaux `<script>`/`<style>`), pas de mémoire :**
(1) un `<script`/`<style` dans un **commentaire HTML** — celui qui a réellement mordu (occurrence
E6 sur `src/index.html`, voir plus haut) ; (2) dans un `<template>` inerte ; (3) dans la **chaîne
d'un script** ; (4) dans une **valeur d'attribut** — la sérialisation HTML n'échappe pas `<` à cet
endroit, et c'est **mesuré, pas hypothétique** : trois champs d'auteur y sont aujourd'hui rendus —
`simulation.titre`/`etapes[].titre` → `aria-label` (`simulation.ts` l. 278 et 381),
`paires[].droite` → `<option value>` (`quiz.ts`), l'`accTitle` d'un bloc `mermaid` → `aria-label`
(`rendu-blocs.ts:551`). Le compte brut reste donc un contrôle de **conservation** actif sur ces
quatre fronts ; (5) le patron « à deux mains » (charge affichée entière **et** aucun nœud engendré)
reste la bonne forme de test pour tout champ d'auteur nouvellement rendu au DOM, indépendamment de
l'état de cette collision précise.
**Réfs.** `docs/contenu/pipeline-contenu.md` (section réécrite le 2026-08-21),
`src/app/features/cours/simulation/simulation.ts` (commentaire d'en-tête corrigé le 2026-08-21).

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

## S-018 · Scinder/renommer une étape de CI CRÉE une affirmation de sécurité — sans contrôle sur le CORPS de ce qui s'exécute, le nom est une intention, pas un garde-fou (A08 · CICD-SEC, croisement [[S-002]]/[[S-009]])

**Symptôme.** `deploy.yml` portait une étape « Installer le navigateur »
(`playwright install --with-deps chromium`) qui cachait **deux** risques distincts hors du sceau
d'artéfact : un `apt-get` en root, et un binaire téléchargé d'un CDN hors du contrôle d'intégrité de
`package-lock.json`. En la scindant en deux scripts npm nommés (`e2e:install:deps` /
`e2e:install:navigateur`), la note de dette du workflow a été réécrite pour dire que le risque
portait désormais « NOMMÉMENT » sur `e2e:install:deps` — **faux et plus fort que la réalité** : les
deux moitiés restaient hors sceau, et le binaire CDN (implicitement écarté) est le **plus exposé**
des deux (`apt` vérifie au moins des signatures GPG, le CDN n'a que HTTPS). Patron [[S-009]] : un
texte promettait plus que ce qui était appliqué.
**Le défaut structurel derrière.** Rien n'empêchait de remettre `--with-deps` dans le script
`e2e:install:navigateur` — le nom de l'étape aurait continué à jurer que l'`apt-get` en root n'y est
pas, en silence, et **tous les gates seraient restés verts** : les workflows appellent des scripts
npm, aucun test ne regardait ce que ces scripts *font*. Patron [[S-002]] transposé de la CSP à la
CI : une propriété de sécurité comparée à un nom d'étape plutôt qu'à une valeur revue.
**Règle.** Dès qu'un découpage, un renommage ou une séparation d'étapes **crée une affirmation de
sécurité** (« ceci ne fait que X », « le risque Y est isolé dans cette étape »), épingler cette
affirmation par un contrôle exécutable qui inspecte le **corps** de ce qui s'exécute — jamais
seulement son nom ou son appelant. Un test qui épingle le corps d'un script npm par motif
(`/^playwright install-deps\b/`, et l'absence de `--with-deps` dans l'autre) rend la promesse vraie
**par construction**, vérifiable par mutation, plutôt que crue sur parole. Et une justification
écrite ne promet jamais plus que ce que le code applique — la relire au même diff que le garde-fou
qu'elle décrit ([[S-009]]).
**Réfs.** `.github/workflows/deploy.yml`, `src/pipeline-contenu-orchestration.spec.ts`,
`package.json` (`e2e:install:deps`, `e2e:install:navigateur`, `e2e:install`),
`.claude/rules/security.md` §1/§3, `docs/agile/backlog-phase-1.md` §E2-ST6 (revue du 2026-08-19).

**🔴 RENFORT le 2026-08-19 (PR #30, lot de dette pré-E3-ST1) — le patron d'épinglage du CORPS avait
lui-même une faute de même famille : il reconnaissait l'INTERDIT plutôt que d'énumérer le PERMIS.**
Le garde ne fait qu'apparier `npm run e2e:install:navigateur` dans le corps de l'étape ; **quatre**
contournements passaient les quatre tests au vert : `npx playwright install`,
`node_modules/.bin/playwright install`, un `&& npx playwright install` greffé derrière l'appel
attendu, et **n'importe quel `uses:`** (une action tierce entière, jamais inspectée). Une liste
d'appariement — même portant sur le corps, pas seulement le nom (correctif de la première rédaction
de cette leçon) — reste une liste **noire** tant qu'elle ne borne pas ce qui est permis.
**Règle renforcée.** Un garde-fou d'ordonnancement de CI doit être une liste blanche **ordonnée**
d'étapes permises, chacune identifiée par une **empreinte du corps exécuté au complet**
(commande exacte, littérale et **revue à la main** — jamais recalculée depuis le fichier, sinon le
garde-fou s'auto-valide comme [[S-002]] le nomme) — et refuser toute étape absente de la liste,
`uses:` compris. Un appariement partiel du corps n'est pas une analyse du corps.
**Réfs additionnelles.** `.github/workflows/deploy.yml`,
`src/pipeline-contenu-orchestration.spec.ts`, `docs/agile/backlog-phase-1.md` (lot de dette
pré-E3-ST1, 2026-08-19).

## S-019 · Sur un site prerendu, « ne pas prerendre » n'est PAS « ne pas publier » — un filtre de visibilité doit couvrir génération, mise en artéfact ET rendu client (A01/A05 · croisement [[S-006]]/[[S-010]])

**Symptôme.** E2-ST6 devait masquer les leçons `statut: brouillon`. Un sélecteur unique
`leconsPubliees()` a bien été écrit et branché sur trois consommateurs (sommaire, prev/next,
`parametresDePrerender`) — le prerender était donc correctement filtré, `ng build` annonçant
« Prerendered 4 static routes » sans `lecon-brouillon/index.html` sur disque. La leçon restait
pourtant **publique** par deux chemins que le sélecteur ne couvrait pas : (1) **mise en artéfact** —
`rendreCarteLecons` recevait le manifeste entier et `ecrireContenuGenere` écrivait `lecons/<slug>.json`
pour **toutes** les leçons, brouillon compris, qu'esbuild empaquetait en chunk public servi 200 ; (2)
**rendu client** — `resoudreLecon` n'appelait jamais le sélecteur, la clef étant une propriété propre
de `carteLecons` : navigation Chromium sur l'URL de la leçon brouillon → 404 côté serveur mais le
routeur **rendait la leçon entière** (`<h1>` compris), sans erreur.
**Pourquoi le trou a survécu à l'écriture.** Le commentaire du sélecteur promettait « l'**unique**
définition de « publiée » du dépôt » et énumérait trois consommateurs — il y en avait **cinq**. La
promesse d'exhaustivité était fausse et **aucun test ne la tenait**.
**Croisement explicite.** C'est la jonction de deux leçons déjà écrites, sur un axe qu'aucune des
deux ne couvre seule — le **rendu client** d'une application prerendue : [[S-006]] établit que tout
fichier présent dans l'artéfact est servable qu'un plan de routage le mentionne ou non (la moitié
« artéfact » du constat ci-dessus, cas n°1) ; [[S-010]] établit qu'une promesse « unique »/« tout »
doit être vérifiée contre le périmètre qu'elle énonce, avec contrôle positif (la moitié « promesse
fausse », le décompte 3 ≠ 5 ci-dessus). Ni l'une ni l'autre ne nomme le **routeur côté client** comme
un point de décision distinct de la génération de pages — c'est l'apport propre de cette entrée.
**Règle.** Filtrer à la **génération**, jamais seulement à la consommation ; drapeau explicite pour un
futur mode éditorial, défaut **fermé** (fail-closed). Avant d'écrire une promesse d'exhaustivité,
**recenser tous les points de décision** puis poser un garde-fou exécutable qui la tient — ici :
`Object.keys(carteLecons) ⊆ leconsPubliees(manifeste)`, avec contrôle positif sur une fixture portant
un brouillon. La vérification qui fait foi est **live** : `grep` sur `dist/` **et** une navigation
réelle sur l'URL — un obstacle levé n'est pas une directive appliquée ([[L-004]]), et une lecture de
code n'aurait rien vu ici (elle n'a effectivement rien vu). Gravité : le contenu exposé est une leçon
**non relue** par le `verificateur-theorie`, sur un site dont la règle n°1 est de n'enseigner jamais
du faux — le même défaut vaut identiquement pour `statut: verifiee`.
**⏳ Statut.** Correctif en cours d'application dans un lot séparé au moment où cette leçon est
écrite ; la fermeture (garde-fou câblé + mesure live des trois chemins) reste à constater par le fil
principal, pas encore vérifiée ici.
**Réfs.** `docs/agile/backlog-phase-1.md` §E2-ST6, `.claude/rules/security.md` §4,
`.claude/rules/contenu-pedagogique.md` §1/§6 (fiabilité du contenu publié).

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

## S-020 · Sur une liste blanche NOMINATIVE, un nom d'attribut admis n'est pas une VALEUR admise — cinquième occurrence de la famille [[S-001]]/[[S-003]]/[[S-009]]/[[S-014]] (A03 · CWE-116, CWE-79)

**Symptôme.** `analyserSvg` (`rendre-mermaid.mjs`) contraignait la liste **des noms** d'attributs
autorisés, mais ne vérifiait la **valeur** que pour `href`/`xlink:href`. `fill`, `stroke`,
`clip-path`, `marker-start`, `marker-end` acceptaient n'importe quel `<FuncIRI>`, donc
`url(https://exemple.invalide/x.svg#p)` traversait intact — un canal d'exfiltration/de référence
externe que la revue de [[S-009]] n'avait pas fermé, parce qu'elle raisonnait « nom admis ⇒
attribut sûr ».
**Piège de fixture rencontré en corrigeant, à consigner à part.** Le premier resserrement des
valeurs FuncIRI a fait rougir `rect rgb(191, 223, 255)` — syntaxe **documentée** de
`sequenceDiagram`, présente en valeur d'attribut `fill`. Or `.claude/rules/contenu-pedagogique.md`
**impose** un `sequenceDiagram` dès qu'une leçon décrit un échange : ce faux positif aurait rougi le
build à la **première** leçon publiée, sur un message parlant de `url(#…)` — un site qui enseigne la
CSP bloqué par sa propre pédagogie. Corrigé en ajoutant une **forme nominative revue**
(`rgb(0-255, 0-255, 0-255)`), jamais en assouplissant vers une chasse au motif. Un corpus de
**fixture** (SVG jetables de test) ne remplace pas le corpus de **production** (rendu Mermaid réel
d'une leçon) pour valider une liste blanche de valeurs.
**Règle.** Sur une liste blanche nominative d'attributs, la contrainte de **nom** et la contrainte
de **valeur** sont deux gestes distincts et tous deux obligatoires — un attribut dont la grammaire
de valeur admet une référence externe (`<FuncIRI>`, `url()`, tout schéma d'URI) doit voir sa valeur
analysée, pas seulement son nom listé. Avant de resserrer une grammaire de valeur, vérifier contre
un corpus de **production réelle** (ici : les leçons/diagrammes que le pipeline produit
effectivement), pas seulement contre les fixtures du garde-fou lui-même.
**Réfs.** `tools/content-pipeline/rendre-mermaid.mjs` (`analyserSvg`),
`.claude/rules/security.md` §4, `.claude/rules/contenu-pedagogique.md` §3,
`docs/agile/backlog-phase-1.md` (lot de dette pré-E3-ST1, 2026-08-19, PR #29).

## S-021 · Un artéfact transféré entre jobs de CI EST une entrée non fiable — existence des chemins attendus ne suffit ni contre un membre EN PLUS, ni contre un chemin `..`, ni contre un lien symbolique (A08 · CICD-SEC, CWE-22)

**Symptôme, trois défauts empilés dans le même mécanisme de restauration inter-jobs.** (1)
`tar -xzf` s'exécutait sans liste de membres, à la racine du dépôt, et le contrôle de conservation
ne vérifiait que la **présence** des chemins attendus — une archive portant les 3 chemins légitimes
**plus** `tools/deploiement/generer-config-swa.mjs` passait l'étape « verte » en écrasant le
générateur de CSP. (2) La liste blanche de membres ajoutée en réponse restait aveugle au chemin
sérialisé : `src/content-generated/../../tools/deploiement/generer-config-swa.mjs` appariait le
motif de chemin **et** passait le contrôle de type — seul GNU tar l'a arrêté (fail-closed, mais la
barrière applicative était hors-jeu). (3) Un **lien symbolique** portant un nom de la liste blanche
aurait passé un contrôle de chemin seul, sans contrôle de **type d'entrée**. Ironie du lot : c'est
précisément le correctif retirant de la confiance à un binaire CDN externe qui ouvrait ce canal
inter-jobs.
**Croisement avec la famille [[S-001]]/[[S-003]]/[[S-009]]/[[S-014]].** Même patron générique
qu'ailleurs sur ce dépôt — un contrôle d'**existence**/de **motif** donne l'apparence de la rigueur
sans borner ce qui peut être présent **en plus**, transposé ici à un artéfact CI plutôt qu'à un
SVG/HTML. Nouveau par rapport à ces quatre : la surface n'est pas du contenu utilisateur mais un
**artéfact inter-jobs**, et le vecteur ajoute une dimension absente ailleurs — la **structure du
chemin** (`..`) et le **type d'entrée sur disque** (lien symbolique), pas seulement le nom.
**Règle.** Traiter tout artéfact transféré entre jobs de CI (`actions/upload-artifact` /
`download-artifact`, cache restauré, archive rejouée) comme une **entrée non fiable** :
extraire avec une liste de membres explicite (jamais une extraction ouverte), refuser tout membre
absent de la liste blanche **et** tout chemin dont un segment est `..` ou `.` (découper en segments,
ne pas apparier la chaîne sérialisée — même défaut que [[S-014]] transposé aux chemins), **et**
contrôler le **type** de chaque entrée avant écriture (rejeter les liens symboliques). Un contrôle
de conservation qui ne vérifie que « les chemins attendus sont là » ne dit jamais rien de ce qui est
**en plus** — répétition du renfort déjà posé par [[S-003]] pour du HTML/SVG, ici pour une archive.
**Réfs.** `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.claude/rules/security.md`
§1/§3, `docs/agile/backlog-phase-1.md` (lot de dette pré-E3-ST1, 2026-08-19, PR #30).

## S-022 · Un garde-fou qui balaie la SOURCE d'un format qui DÉCODE se contourne par ce que le compilateur ajoute — la COUCHE d'observation est un choix de sécurité (A03/A05 · CWE-116, axe neuf sur la famille [[S-003]]/[[S-009]]/[[S-014]])

**Symptôme, mesuré et non supposé** (markdown-it du dépôt, avec ses options réelles
`html: false, typographer: false`) : `&#x1F4D8;` compile en `<p>📘</p>` et `&#x1F9E9;` en
`<p>🧩</p>`. La règle **G1** (aucun pictogramme de provenance littéral dans le corps d'une leçon,
hors blocs de code) balaie les **lignes du Markdown source**. Un auteur obtient donc un pictogramme
de provenance **en prose publiée** sans que G1 voie quoi que ce soit — c'est-à-dire précisément le
point de décision que G1 existe pour fermer. Aucune entrée hostile n'est nécessaire : il suffit
d'une entité HTML, forme parfaitement ordinaire en Markdown.
**Pourquoi ça compte plus ici qu'ailleurs.** La provenance n'est pas cosmétique sur ce site : un
📘 non tracé fait passer pour **matière d'examen** ce que l'enseignant n'a jamais enseigné ; un ⚠️
non tracé **accuse un enseignant sans source** (voir le renfort de [[S-009]] du 2026-08-20). Le
lecteur qui révise est celui qui paie.
**Ce que la famille ne nommait pas encore.** [[S-003]]/[[S-014]] disent *quoi* inspecter (analyser,
ne pas apparier un motif) ; [[S-015]] dit *dans quel sens* le défaut peut aller (sur-refus). Aucune
ne nomme **à quelle couche** on regarde. Un balayage de la **source** contrôle un texte que le
compilateur va encore **transformer** : entités décodées, références de caractères, normalisations.
Contrôler l'amont d'une transformation, c'est contrôler autre chose que ce qui est publié — même
patron que [[S-005]] (le périmètre était faux, pas la vérification).
**Règle.** Porter tout contrôle de contenu publié sur la **sortie compilée** — les nœuds texte de
l'AST, hors nœuds `code` — jamais sur le Markdown source. Deux gains, pas un : les entités y sont
**déjà résolues**, et l'exemption « bloc de code » devient **structurelle** au lieu d'être
reconstruite à la main (automate de fences, spans en ligne). Corollaire de saisie, à appliquer dans
le même geste : normaliser avant comparaison et **couvrir les sélecteurs de variante** — ⚠️ s'écrit
U+26A0 **suivi de U+FE0F**, et une liste de caractères qui les ignore se contourne sans même passer
par les entités.
**⚠️ Coût connu à assumer :** un contrôle porté sur l'AST perd le **numéro de ligne source** si on
ne le conserve pas explicitement (`map` des jetons) — le conserver, sinon le message d'erreur
devient inutilisable pour l'auteur et la pression à désarmer le garde-fou revient ([[S-011]]).

**🔵 CE QUI A TENU AU MÊME LOT — trois patrons à nommer parce qu'ils marchent.**
· **G1 analyse par tranches**, avec un automate de fences CommonMark réel et des spans en ligne
blanchis **à longueur égale** (la colonne est préservée) ; son contrôle positif place un 📘
**légal** dans un bloc de code **au-dessus** de la faute et assertionne le **numéro de ligne** —
une implémentation `corps.includes('📘')` rougirait. C'est le premier contrôle positif du dépôt qui
**distingue réellement** deux implémentations, au lieu de prouver seulement « ça rougit »
([[L-019]]).
· **`verifierVariante` côté rendu** est une liste blanche nominative dérivée d'un littéral **écrit
à la main** (jamais de l'artéfact, [[S-002]]), avec `Array.includes` **avant** toute indexation par
crochets — [[S-017]] fermée par construction — et un échec qui **lève en se nommant** plutôt qu'un
rendu nu silencieux.
· **G2 refuse un compte de provenance déclaré au frontmatter**, au motif explicite qu'un compte
écrit par l'auteur à côté des encadrés qu'il pose serait une **preuve fabriquée par l'entrée** :
[[S-014]] appliquée **d'elle-même et en amont**, pour la première fois sur ce dépôt.

**Réfs.** `tools/content-pipeline/valider.mjs` (règles G1/G2/G3),
`tools/content-pipeline/compiler-markdown.mjs` (`VARIANTES_ENCADRE`),
`src/app/features/cours/lecon/rendu-blocs/rendu-blocs.ts` (`verifierVariante`),
`.claude/rules/security.md` §4, `.claude/rules/contenu-pedagogique.md` §6,
branche `fix/intermittence-gates-pre-e3-st1` (2026-08-20).

## S-023 · Retirer une permission CSP nominative devenue sans besoin est un DURCISSEMENT — à condition que le garde-fou qui la comptait reste capable de rougir (A05 · patron réussi, à réemployer)

**Ce que c'est.** Pas un incident — un patron **approuvé en revue** (lot E6 « Moniteur ambre »,
2026-08-20), consigné parce qu'il n'avait pas d'entrée et qu'il se reproduira à chaque retrait de
permission. `script-src` est passé de **1 hachage nominatif à ZÉRO** (`script-src 'self'` en dur) :
le script inline anti-flash de thème n'a plus rien à lire depuis que le site n'a qu'un seul thème
(sombre, D-2). Un script qui ne fait rien conserve quand même une permission — pour du **code
mort**. Le retirer transforme la liste blanche en liste **vide** : tout script inline dans
l'artéfact devient une infraction, **sans exception possible**. C'est plus strict que [[S-005]]
(un seul hachage revu), pas moins.

**Règle — les trois gestes qui rendent ce retrait sûr, à réemployer pour toute permission CSP
devenue sans objet.**
1. 🔴 **Continuer d'ALIMENTER la collection même quand toute valeur constatée serait une
   infraction.** La boucle doit faire `hachagesScript.add(hacher(corps))` **avant** de pousser
   l'infraction — jamais l'inverse. Sans ça, `hachagesScript.size !== 0` serait **vrai par
   construction** (aucun script inline ne peut plus exister sans faire échouer le build ailleurs
   en premier) : le contrôle final ne pourrait plus jamais rougir sur SA propre condition, et
   devient une décoration plutôt qu'un garde-fou. C'est exactement le mode d'échec de [[L-005]]
   (un run vert ne prouve pas qu'une vérification a tourné) appliqué à une collection, pas à un
   run.
2. **Re-héberger la preuve AVANT de supprimer le spec qui la portait, en nommant ce que ce spec
   était le SEUL à prouver.** Le spec e2e supprimé ici portait deux choses à la fois : le contrôle
   positif (« un script inline non haché est bien refusé ») et la mesure « 0 violation CSP sur un
   parcours interactif ». Les deux ont été relogées, et le contrôle positif a **gagné** une
   assertion (aucun `sha256-` dans le `script-src` **servi**, le pendant live du contrôle
   statique) — au lieu de simplement disparaître avec le spec.
3. 🔴 **Transformer l'ancienne charge AUTORISÉE en cas de REFUS.** Le script anti-flash, réinjecté
   verbatim dans un cas de test, doit maintenant échouer. C'est le **seul** moyen de distinguer une
   exception *supprimée* (le garde-fou refuse activement ce qu'il autorisait) d'une exception
   *rendue muette* (le garde-fou ne voit plus jamais le cas, donc ne peut plus se prononcer —
   [[L-063]], un invariant que rien n'observe n'est pas vrai, il est indéterminé).

**Corollaire.** Un compte de permissions qui BAISSE dans un diff CSP n'est pas, en soi, une preuve
de durcissement — il l'est seulement si (1) et (3) sont vérifiés. Sans eux, une baisse de compte
peut aussi bien signifier « le garde-fou a cessé de regarder ».

**Réfs.** `tools/deploiement/generer-config-swa.mjs` (boucle d'accumulation `hachagesScript`),
`src/app/**` (retrait de l'anti-flash de thème, D-2 thème sombre seul), lot E6 « Moniteur ambre »,
`docs/agile/backlog-phase-1.md` §E6. Croise [[S-005]], [[L-005]], [[L-019]], [[L-063]].

## S-024 · Fermer une leçon de sécurité exige de mesurer le RÉSIDU sur l'artéfact du lot, jamais de le raisonner de mémoire — le mécanisme et l'état du produit sont deux régimes de preuve distincts (A05 · discipline de clôture)

**Symptôme.** Le lot E3-ST4 (leçon `04-xss`) a déclaré [[S-011]] partiellement périmée — à raison :
le balayage de texte brut a bien disparu de `generer-config-swa.mjs`. Mais la note de clôture
écrite au même lot commettait deux fautes trouvées par une revue indépendante : (a) elle citait
« le » résidu au singulier, en oubliant l'occurrence commentaire (celle qui avait réellement mordu
en E6) parmi les quatre écarts que le garde-fou énumère lui-même en commentaire source ; (b) elle
écrivait au **conditionnel** — « la collision rouvrirait si un champ passait en valeur d'attribut »
— alors que **trois champs d'auteur étaient, dans ce même commit, déjà rendus en attribut**
(`aria-label`/`<option value>` de la simulation, du quiz, d'un bloc mermaid). Le mécanisme mesuré
était juste ; l'état du produit décrit à côté était faux, et personne ne l'a remarqué parce que
rien ne signalait le changement de régime de preuve entre les deux phrases.

**Pourquoi c'est distinct de [[L-070]] et pourquoi ça mord précisément à la clôture.** Le moment où
l'on prouve qu'une collision est close est le moment où l'on cesse, par construction, de la
chercher ailleurs — la charge cognitive de la clôture se dépense sur « est-ce fermé », pas sur « où
d'autre est-ce ouvert ». Une condition de réouverture écrite au futur («·rouvrirait si·») est un
énoncé qu'on peut rédiger sans consulter le dépôt ; elle se glisse donc sans le contrôle qu'une
formulation au présent («·est ouvert sur·») aurait imposé par sa syntaxe même.

**Règle.** Fermer une leçon S-0xx par « mesurée/close » exige de rejouer le résidu **sur l'artéfact
du lot en cours**, jamais de mémoire ni par confiance dans une note antérieure — même quand la
mesure du mécanisme est, elle, vérifiée. Toute clause de réouverture écrite au futur (« rouvrirait
si… ») doit être **retestée contre le dépôt avant d'être écrite** : si la condition est déjà vraie,
elle se rédige au présent et cesse d'être une clause de veille pour devenir un fait déclaré. Et une
énumération de cas (« les écarts possibles sont… ») se **compte à la source au moment de la
clôture**, jamais recopiée d'une clôture précédente — [[S-011]] elle-même l'exigeait déjà
(« compter ses motifs, pas nommer celui auquel on pensait ») ; ici c'est la note de clôture qui a
raté sa propre règle.

**Réfs.** `.claude/lessons/security-lessons.md` [[S-011]] (résidu complété au même geste),
[[S-005]] (mécanisme juste, périmètre faux — même famille), [[S-009]] (texte qui promet plus que
le code n'applique), lot E3-ST4 (2026-08-21).
