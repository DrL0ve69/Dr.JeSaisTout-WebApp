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

`npm run build` = `ng build && npm run config:swa`. Le générateur sort en **code 1** si quoi que ce
soit cloche : la CI casse au lieu de déployer une CSP fausse.

**Pourquoi générer ?** Chaque page prerendue porte un bloc `<style ng-app-id>` produit par Angular.
Une CSP stricte ne peut l'autoriser que par **hachage**, et ce hachage change dès qu'un style
change. Une CSP recopiée à la main se désynchroniserait au premier commit de design — en silence.
Détail et mesures : addendum **S-02**, `docs/architecture/stack-et-architecture.md` §9.

> ⚠️ **La source ne doit jamais s'appeler `staticwebapp.config.json` ni vivre à la racine.**
> Constaté en local le 2026-08-03 : `swa start` résout ce nom **depuis le répertoire courant**, pas
> depuis le dossier servi. Un fichier ainsi nommé à la racine est servi tel quel, jeton
> `__HACHAGES_STYLE__` compris → `style-src` invalide → **site sans styles en production**, sans
> aucune erreur de build. D'où le nom et l'emplacement actuels.

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

## Chaîne CI/CD et provisionnement (E0-ST4)

| Fichier | Déclencheur | Rôle |
|---|---|---|
| `.github/workflows/ci.yml` | PR vers `main` | G-lint → G-test → G-build → G-audit. Aucun déploiement. |
| `.github/workflows/infra.yml` | PR/push touchant `infra/**` | `terraform fmt -check` + `validate` (`-backend=false` : aucun identifiant Azure en CI). |
| `.github/workflows/deploy.yml` | push sur `main` | Mêmes gates, puis publication, puis **vérification des en-têtes servis en ligne**. |
| `infra/` (Terraform) | **manuel, poste du propriétaire** | Groupe de ressources + Static Web App **Free**. Jamais exécuté en CI. |

**Le provisionnement ne passe pas par la CI, délibérément.** Terraform détient des identifiants
Azure à haut privilège ; la CI ne connaît que le jeton de déploiement SWA, dont la portée se limite
à téléverser du statique dans cette ressource. Marche à suivre : [`infra/README.md`](../infra/README.md).

`skip_app_build: true` dans `deploy.yml` est **obligatoire** : l'artéfact est déjà construit par
l'étape G-build, config SWA à hachages comprise. Laisser l'action reconstruire produirait un
dossier sans `staticwebapp.config.json` résolu — donc sans CSP.

## Reste à faire

- **E0-ST4, actions du propriétaire** : créer le dépôt GitHub (aucun remote aujourd'hui, et branche
  locale `master` alors que les workflows écoutent `main`), lancer `terraform apply`, poser le
  secret `AZURE_STATIC_WEB_APPS_API_TOKEN`. Les commandes sont dans `infra/README.md`.
- **Sortie `static_web_app_url` à confirmer** : l'étape de vérification des en-têtes de `deploy.yml`
  lit cette sortie de l'action Azure. Si elle arrive vide au premier run, l'étape émet un
  avertissement au lieu d'échouer — ajuster le nom à ce moment-là plutôt que de le supposer juste.
- **Constat navigateur non fait** : qu'aucune violation CSP ne frappe
  `<script id="ng-state" type="application/json">` (l'hydratation en dépend) et que la page
  s'affiche stylée. Les en-têtes sont vérifiés par machine ; le **comportement du navigateur ne
  l'est pas**. À faire à l'œil sur l'URL Azure — `infra/README.md` §5.
- **G-axe** : volontairement absent des workflows tant qu'il n'existe pas de page réelle à tester.
  Un gate vert qui ne teste rien est pire qu'un gate absent. Arrive en E1.
- **E1** : une vraie page 404 ; aujourd'hui `responseOverrides` réécrit vers `/index.html` avec le
  statut 404.
