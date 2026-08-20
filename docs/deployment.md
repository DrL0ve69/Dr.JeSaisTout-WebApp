# Déploiement — Azure Static Web Apps (phase 1)

> Phase 1 : site **100 % statique prerendu**, palier **SWA Free** — aucun coût, aucune carte de
> crédit (`.claude/rules/budget-free-tier.md`). Pas de fonction managée, pas de backend.
> Artéfact déployé : **`dist/dr-je-sais-tout/browser`** — et rien d'autre.

## La configuration SWA est **générée**, pas écrite à la main

| Fichier | Rôle |
|---|---|
| `config/staticwebapp.config.source.json` | **Source versionnée.** Contient tout sauf les hachages CSP, marqués `__HACHAGES_STYLE__`. |
| `tools/deploiement/generer-config-swa.mjs` | Résout les hachages et écrit le fichier final dans l'artéfact. |
| `dist/dr-je-sais-tout/browser/staticwebapp.config.json` | **Généré à chaque build.** Jamais édité, jamais versionné. |

`npm run build` = `npm run content:build && ng build && npm run config:swa` — **trois** commandes, et
la compilation du contenu en fait partie (elle produit la feuille de coloration syntaxique
gitignorée, sans laquelle Sass échoue). Le générateur sort en **code 1** si quoi que ce soit
cloche : la CI casse au lieu de déployer une CSP fausse.

**Pourquoi générer ?** Chaque page prerendue porte un bloc `<style ng-app-id>` produit par Angular.
Une CSP stricte ne peut l'autoriser que par **hachage**, et ce hachage change dès qu'un style
change. Une CSP recopiée à la main se désynchroniserait au premier commit de design — en silence.
Détail et mesures : addendum **S-02**, `docs/architecture/stack-et-architecture.md` §9.

> ⚠️ **La source ne doit jamais s'appeler `staticwebapp.config.json` ni vivre à la racine.**
> Constaté en local le 2026-08-03 : `swa start` résout ce nom **depuis le répertoire courant**, pas
> depuis le dossier servi. Un fichier ainsi nommé à la racine est servi tel quel, jeton
> `__HACHAGES_STYLE__` compris → `style-src` invalide → **site sans styles en production**, sans
> aucune erreur de build. D'où le nom et l'emplacement actuels.

## `trailingSlash: "auto"` — et pourquoi surtout pas `"always"`

**Un 301 sur un `.js` n'est pas un coût d'aller-retour : c'est un changement de base de résolution.**
`"always"` s'applique **aussi aux fichiers avec extension** (documenté par Microsoft :
`/privacy.html` → 301 → `/privacy/`). Le bundle `main-<hash>.js` était donc servi à
`/main-<hash>.js/`, avec le bon type MIME et un 200 — le site se chargeait, tout paraissait normal.
Mais l'URL **finale** du module devient la base de ses imports relatifs : son
`import('./chunk-<hash>.js')` visait `/main-<hash>.js/chunk-<hash>.js`, qui n'existe pas. **La route
paresseuse de la page de leçon était morte en production** (constaté le 2026-08-17, leçon L-032).

`"auto"` garde ce qui motivait `"always"` et laisse tomber ce qui cassait :

| Requête | `always` | `auto` *(retenu)* |
|---|---|---|
| `/cours/securite-web` (dossier) | 301 → `/cours/securite-web/` | 301 → `/cours/securite-web/` |
| `/main-<hash>.js` (fichier) | **301 → `/main-<hash>.js/`** | **200, direct** |

La canonicalisation des URL de pages — la raison SEO d'avoir un réglage plutôt qu'aucun — est donc
intacte. Omettre la clef entièrement serait un recul : SWA ne redirigerait plus rien et servirait la
même page sous deux URL.

⚠️ **Ce réglage ne peut PAS être vérifié en local.** L'émulateur `npx swa start` n'implémente pas
`trailingSlash` (zéro occurrence dans son code) : le gate e2e tourne donc sous une politique de
routage qui n'est pas celle de la production, et il est resté **vert** pendant que la production
était cassée. La vérification vit en **post-déploiement** — `deploy.yml`, étape « Vérifier le
routage servi », bloc (c) : chaque asset référencé par la page réellement servie doit répondre
**200, jamais 3xx**.

## Les en-têtes, et pourquoi ceux-là

Tous posés dans `globalHeaders` — jamais au cas par cas dans le code Angular
(`.claude/rules/security.md` §1).

| En-tête | Valeur | Raison |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'` + hachages de style | Cœur de la défense XSS. **Aucun hôte externe** : ni CDN, ni police distante, ni analytique — cohérent avec la règle « gratuit ET sans clé ». |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS. SWA fournit TLS gratuitement sur `*.azurestaticapps.net`. |
| `X-Content-Type-Options` | `nosniff` | Empêche le navigateur de deviner un type MIME. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Ne fuite pas le chemin des pages consultées. |
| `Permissions-Policy` | caméra, micro, géoloc… **tous désactivés** | Le site n'a besoin d'aucune de ces API. |
| `X-Frame-Options` + `frame-ancestors 'none'` | `DENY` | Anti-clickjacking. Les deux : `frame-ancestors` fait foi sur les navigateurs modernes, `X-Frame-Options` couvre les anciens. |
| `Cross-Origin-Opener-Policy` / `-Resource-Policy` | `same-origin` | Isolation du contexte de navigation. |

Directives CSP notables : `object-src 'none'` (aucun plugin), `base-uri 'self'` (empêche le
détournement des URL relatives), `form-action 'self'`, `upgrade-insecure-requests`.

## Vérifier en local avant de pousser

```bash
npm run build
npx swa start dist/dr-je-sais-tout/browser --swa-config-location dist/dr-je-sais-tout/browser
curl -s -D - -o /dev/null http://localhost:4280/
```

`--swa-config-location` est **obligatoire** : sans lui, l'émulateur cherche la config dans le
répertoire courant (voir l'avertissement plus haut). Vérifier que `style-src` contient un
`'sha256-…'` et **pas** `__HACHAGES_STYLE__`.

État au 2026-08-03 : en-têtes constatés servis par l'émulateur, CSP résolue avec le hachage réel.

## Ressources en place (2026-08-04)

| | |
|---|---|
| Dépôt | <https://github.com/DrL0ve69/Dr.JeSaisTout-WebApp> — **public** (Actions illimité), branche `main` |
| Abonnement Azure | *Azure for Students* — locataire **Cégep de l'Outaouais** |
| Groupe de ressources | `rg-dr-je-sais-tout` (`canadacentral`) |
| Static Web App | `swa-dr-je-sais-tout` (`eastus2`, **Free**) |
| **URL du site** | **<https://salmon-sky-0a730780f.7.azurestaticapps.net>** |
| Secret Actions | `AZURE_STATIC_WEB_APPS_API_TOKEN` — posé et confirmé par `gh secret list` |

Créées par `terraform apply` : **2 ajoutées, 0 modifiée, 0 détruite**, `sku_tier`/`sku_size` = `Free`
comme prévu. Coût : **0 $**.

> ⚠️ **Le jeton d'`az login` expire (AADSTS50173).** Un `terraform plan` peut échouer sur
> « could not acquire access token » alors que rien n'a changé dans le code : le jeton Azure CLI a
> simplement été révoqué (changement de mot de passe, politique du locataire). Correctif :
> `az login`, puis relancer. Ce n'est pas un défaut de la configuration Terraform.

## Chaîne CI/CD et provisionnement (E0-ST4)

| Fichier | Déclencheur | Rôle |
|---|---|---|
| `.github/workflows/ci.yml` | PR vers `main` | G-lint → G-typage-outils → G-contraste → G-glyphes → G-test → G-build → G-axe → G-e2e → G-audit. Aucun déploiement. **G-build y est bâti sur la FIXTURE TÉMOIN** (voir ci-dessous). |
| `.github/workflows/infra.yml` | PR/push touchant `infra/**` | `terraform fmt -check` + `validate` (`-backend=false` : aucun identifiant Azure en CI). |
| `.github/workflows/deploy.yml` | push sur `main` | **Trois jobs** — `contenu` → `gates` → `publication` (voir ci-dessous). Mêmes gates, **sauf G-build : racine de PRODUCTION**, puis publication, puis **vérification des en-têtes servis en ligne**. |

### La topologie de `deploy.yml` : trois jobs, et pourquoi (lot de dette pré-E3-ST1, 2026-08-20)

`rendre-mermaid.mjs` impose à `mmdc` le Chromium de Playwright — un binaire **téléchargé d'un CDN**,
hors du contrôle d'intégrité de `package-lock.json`, dont l'installation tire en plus un `apt-get` en
root. Comme le pipeline de contenu en dépend, cette installation avait dû remonter **avant** la
construction de `dist/` : le sceau d'empreintes ne couvrait donc plus que la fenêtre construction →
téléversement.

**La parade n'est pas un digest** — aucun digest n'épingle un `apt-get`. C'est une **coupe de jobs** :

| Job | Ce qu'il fait | Navigateur |
|---|---|---|
| `contenu` | `npm ci` → installe le navigateur → **préchauffe le cache Mermaid des fixtures** → `content:build` → empaquette ses sorties en `.tgz` | **oui**, isolé ici |
| `gates` | récupère et **déballe** ces sorties → G-lint … G-build → **sceau** → installe le navigateur → G-axe, G-e2e, G-audit → **revérifie le sceau** → transmet | **après le sceau seulement** |
| `publication` | détient le jeton, déploie, vérifie les en-têtes servis | non |

**Ce qui rend la coupe vérifiable plutôt que déclarative :**

- La localisation de Chromium est **paresseuse** (`localiserOutils()` n'est appelée que depuis
  `invoquerMmdc`, donc uniquement s'il reste un diagramme à rendre). Sans ça, un cache chaud exigeait
  quand même le binaire et `gates` aurait été rouge à chaque déploiement.
- Le **cache Mermaid transféré** fait que `content:build` ne rappelle jamais `mmdc` dans `gates` ; si
  une entrée manquait, l'échec serait **bruyant et nommé**. C'est le tripwire structurel.
- Le seuil d'entrées de cache est **dérivé** des blocs ```` ```mermaid ```` réellement présents dans
  les fixtures, pas écrit en dur.
- L'archive `contenu → gates` est traitée comme **une entrée** : refus des segments `..`/`.`, liste
  blanche **nominative** des membres, contrôle du **type** d'entrée, puis extraction des membres
  nommés (**S-021**).
- `src/workflows-github.spec.ts` épingle la **fenêtre avant le sceau** par une liste blanche
  **ordonnée**, avec **empreinte du corps exécuté** de chaque étape — le nom seul laissait greffer un
  `&& npx playwright install` dans une étape existante (**S-018**).
- Les trois `npm ci` des workflows portent **`--ignore-scripts`** (SonarCloud `githubactions:S6505`).
  Mesuré avant de l'appliquer : le build, le rendu Mermaid et `swa start` fonctionnent sans les
  scripts de cycle de vie ; seul `keytar` casse, sur un chemin du CLI Azure que la CI n'emprunte pas.

⚠️ **Ce que la coupe NE ferme PAS** : `gates` **consomme** les sorties de `contenu`. On retire
l'exécution du binaire CDN de la machine qui bâtit `dist/`, **pas** la confiance dans ce qu'il a
produit. Dit en toutes lettres dans `deploy.yml` lui-même.

### La CSP servie est comparée **structurellement** (lot de dette pré-E3-ST1, 2026-08-20)

`tools/deploiement/verifier-csp-servie.mjs` (sans aucune dépendance npm — le job `publication` n'a pas
de `node_modules`) parse la CSP en `Map directive → sources` et exige l'égalité **directive par
directive** entre la CSP **servie**, celle de l'artéfact, et `config/staticwebapp.config.source.json`
modulo les jetons `__HACHAGES_*__` — un jeton ne pouvant résoudre **que** des `'sha256-…'`, vérifié
source par source (**S-005**). Avant, seuls des `grep` de présence tournaient : **une directive
entière rendue permissive passait**.

🔴 **Ce que le journal doit montrer, sinon le gate n'a rien lu** (**L-005**) : `En-têtes appliqués
(tentative N).`, puis `CSP servie ≡ CSP de l'artéfact — N directives comparées une à une :` **suivi de
l'énumération**, puis la ligne de résolution des jetons. Un « OK » ne distingue pas 11 directives
comparées de 0.

L'action de déploiement est **épinglée au SHA** `1a947af9992250f3bc2e68ad0754c0b0c11566c9` — le
**tag** `v1`, relevé dans le journal d'un run réel. ⚠️ Le dépôt amont porte **aussi une branche `v1`**
qui diverge : ne pas la prendre pour une mise à jour, un épinglage **fige**, il n'upgrade pas.

### ⚠️ Les deux workflows ne construisent PAS le même artéfact (décision E-2, E2-ST3 lot E)

`content/` ne portera sa première leçon qu'à E3-ST1. Un artéfact bâti sur cette racine ne prerende
donc **aucune page de leçon**, et G-axe, G-e2e ainsi que le générateur de CSP restaient aveugles au
premier composant réellement **interactif** du site (`QuizComponent`) — la barre n'était pas
franchie, elle était contournée par l'absence de données (point aveugle **S-005**).

| | `ci.yml` (G-build) | `deploy.yml` (G-build) |
|---|---|---|
| Commande | les **trois** commandes de `npm run build`, **dépliées** | `npm run build` |
| Racine de contenu | `tools/content-pipeline/__fixtures__/temoin/cours/securite-web` (`--racine`) | `content/` (défaut) |
| Hachages `style-src` attendus | **12** (`--hachages-style 12`) — les 3 de plus sont les blocs `<style>` des composants de la page de leçon | **9** — défaut épinglé `NOMBRE_HACHAGES_STYLE_ATTENDU` |
| Ce que ça prouve | les gates voient en permanence une page de leçon **interactive** | ce qui part **en ligne** est bien ce qui a été construit |

Les deux comptes sont **écrits dans le dépôt et revus**, jamais dérivés de l'artéfact (S-002), et
chacun a son **miroir en test** : le 9 dans `src/config-swa-provenance-style.spec.ts`, le 12 dans
`src/workflows-github.spec.ts`. Ce dernier garde aussi l'**équivalence** entre le dépliage de
`ci.yml` et `scripts.build` — sans quoi un segment retiré du script passerait la CI verte et
publierait un `dist/` sans `staticwebapp.config.json`. La CSP mesurée en CI n'est donc pas octet
pour octet celle du déploiement : ce sont les vérifications **en ligne**, fail-closed, qui font foi.

⏳ **Harnais temporaire**, à retirer à la clôture d'E3-ST1 (backlog §E2-ST2, réserve 4) — un test
rougit tout seul le jour où `content/cours/securite-web/` porte une leçon.
| `infra/` (Terraform) | **manuel, poste du propriétaire** | Groupe de ressources + Static Web App **Free**. Jamais exécuté en CI. |

**Le provisionnement ne passe pas par la CI, délibérément.** Terraform détient des identifiants
Azure à haut privilège ; la CI ne connaît que le jeton de déploiement SWA, dont la portée se limite
à téléverser du statique dans cette ressource. Marche à suivre : [`infra/README.md`](../infra/README.md).

`skip_app_build: true` dans `deploy.yml` est **obligatoire** : l'artéfact est déjà construit par
l'étape G-build, config SWA à hachages comprise. Laisser l'action reconstruire produirait un
dossier sans `staticwebapp.config.json` résolu — donc sans CSP.

## Reste à faire

- **E0-ST4 — le site est en ligne** (première mise en ligne le 2026-08-04, commit `ddb9ba9`).
  Constaté depuis l'extérieur : HTTP 200, les cinq en-têtes servis, CSP à hachage `sha256-` résolu,
  `lang="fr-CA"`. Workflow `Infra (Terraform)` vert.
- **`deploy.yml` rouge au premier run, correctif poussé ensuite** : SWA renvoie **200 avant**
  d'avoir appliqué `staticwebapp.config.json` (~30-60 s de propagation) ; l'étape de vérification a
  lu une réponse ne portant que `content-type` et `date`. `curl --retry` ne rattrape pas ce cas —
  la réponse est un *succès*, donc curl ne réessaie jamais. Remplacé par une **attente active** sur
  la présence effective de la CSP (12 tentatives × 10 s). À reconfirmer vert au run suivant.
- La sortie `static_web_app_url` de l'action Azure est **confirmée correcte** (elle a bien fourni
  l'URL au premier run) — l'incertitude notée à l'écriture du workflow est levée.
- **Sortie `static_web_app_url` à confirmer** : l'étape de vérification des en-têtes de `deploy.yml`
  lit cette sortie de l'action Azure. Si elle arrive vide au premier run, l'étape émet un
  avertissement au lieu d'échouer — ajuster le nom à ce moment-là plutôt que de le supposer juste.
- **✅ Constat navigateur FAIT le 2026-08-14, par le propriétaire** : console ouverte sur l'URL
  Azure, **aucun message** — donc aucune violation CSP, y compris sur
  `<script id="ng-state" type="application/json">` dont l'hydratation dépend ; page stylée ; aucun
  clignotement perçu à la bascule de thème. Les en-têtes étaient vérifiés par machine, le
  **comportement du navigateur ne l'était pas** : il l'est désormais. ⚠️ **Portée exacte, à ne pas
  surinterpréter** : ce constat date d'AVANT E1-ST2, sur un site qui ne portait **aucun élément
  interactif**. C'est précisément ce qui a masqué le défaut décrit ci-dessous (voir S-005).
- **✅ G-axe est en ligne depuis E1-ST2**, au même rang dans `ci.yml` **et** `deploy.yml` (juste
  après G-build, dont il consomme l'artéfact) : `axe-core` exécuté dans jsdom sur chaque page
  prerendue, précédé de son **auto-test** qui prouve qu'il mord. Ce qu'il ne couvre pas est imprimé
  à chaque exécution : clavier, focus visible, `target-size`, contraste rendu — le contraste est
  tenu en amont par G-contraste, le clavier attend son gate Playwright (E1-ST2, en cours).
- **✅ La 404 est un vrai fichier depuis E1-ST2.** `responseOverrides` réécrit vers
  **`/404/index.html`** (route `404` prerendue, composant `PageIntrouvable`), plus vers
  `/index.html`. Et **`navigationFallback` a été RETIRÉ** : c'est un changement de sécurité, pas de
  confort — tant qu'il était là, **toute URL inconnue renvoyait 200 avec la page d'accueil
  légitime**, ce qui faisait de `https://<site>/facture-impayee/` un support de hameçonnage clé en
  main sous le domaine du site. Une URL inconnue renvoie désormais un **404 réel**.
  `/index.csr.html` — coquille de rendu client émise par `ng build`, servable parce que **présente
  dans l'artéfact** — est fermée par une redirection **301** vers `/` (voir S-006).
- **Vérifié au build depuis E1-ST2** : chaque cible interne de `rewrite`/`redirect` de la config SWA
  doit correspondre à un fichier réellement présent dans l'artéfact, sinon `npm run build` sort en
  **code 1**. Sans ce contrôle, supprimer la route `404` — qui *paraît* redondante à côté du `**` —
  aurait fait servir à Azure sa page d'erreur de marque, sans qu'aucun gate ne rougisse (S-004).
