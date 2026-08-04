# Infra — provisionnement Azure (phase 1)

> **Une seule ressource utile** : une Azure Static Web App au palier **Free**, dans un groupe de
> ressources dédié. Décrite en Terraform parce que c'est l'outil habituel du propriétaire, et
> parce qu'un palier écrit en code est un garde-fou budgétaire qu'un clic dans le portail ne donne
> pas : passer en Standard exigerait un diff Git.
>
> **Coût : 0 $.** SWA Free n'exige aucune carte de crédit et fournit TLS gratuit sur
> `*.azurestaticapps.net`. Terraform CLI et le provider `azurerm` sont gratuits. Rien ici ne touche
> au crédit étudiant. Conforme à `.claude/rules/budget-free-tier.md`.

## Ce que Terraform fait — et ne fait pas

| | |
|---|---|
| **Fait** | Crée le groupe de ressources et la Static Web App **Free**, et sort le jeton de déploiement. |
| **Ne fait pas** | Ne déploie aucun contenu. Ne tourne **jamais** en CI. |

Ce partage est délibéré. La fiche KB `devops/infrastructure-as-code-limites.md` rappelle qu'un
système qui applique de l'infra détient des identifiants cloud à haut privilège — un point de
compromission critique. En gardant `terraform apply` sur ton poste, la CI ne connaît que le jeton
de déploiement SWA, dont la portée se limite à téléverser du statique dans **cette** ressource.

La même fiche tranche aussi la question de l'orchestration : « petite équipe, une seule stack,
déploiements peu fréquents → Terraform seul ». Pas de Spacelift, pas de Terraform Cloud, pas
d'Atlantis. À rouvrir si la phase 2 amène plusieurs stacks couplées.

## État Terraform — lire avant le premier `apply`

L'état est **local** (`infra/terraform.tfstate`) et **gitignoré**.

> ⚠️ **Le fichier d'état contient le jeton de déploiement SWA en clair.** C'est une propriété de
> Terraform, pas un défaut de cette configuration : `sensitive = true` masque une valeur dans la
> *sortie*, jamais dans l'*état*. Ne jamais le committer, ne jamais le coller dans une issue.
> Le `.gitignore` couvre `*.tfstate*`, `*.tfvars` et `.terraform/`.

Un backend distant (Azure Storage + verrouillage) est la pratique de référence dès qu'on est
plusieurs à appliquer. À un seul opérateur sur un seul poste, il ajouterait une ressource à opérer
sans résoudre de problème réel — décision à revoir si quelqu'un d'autre applique un jour.

## ⚠️ Toutes les commandes ci-dessous sont en **PowerShell**

C'est le shell de ce poste (Windows PowerShell 5.1). Deux pièges qui ont déjà mordu :

- **`&&` n'existe pas.** `cd infra && terraform init` est une *erreur de syntaxe*, pas un
  enchaînement. Une commande par ligne, ou `;` pour enchaîner sans condition. Pour n'enchaîner
  qu'en cas de succès : `cmd1; if ($?) { cmd2 }`.
- **`grep` n'existe pas** → `Select-String`.

`$(...)` fonctionne en revanche comme en bash. Attention : si la commande interne échoue, `$(...)`
rend une chaîne **vide** sans que rien ne le signale — un `gh secret set --body ""` passe alors
silencieusement. D'où l'ordre imposé plus bas : `apply` **avant** `secret set`.

## Prérequis

| Outil | État sur ce poste (2026-08-04) |
|---|---|
| Terraform | ✅ v1.15.6 |
| Azure CLI (`az`) | ✅ installé |
| GitHub CLI (`gh`) | ✅ v2.93.0 |
| Node | ✅ v24.18.1 |

Ni Python ni Docker ne sont requis — l'action de déploiement SWA s'exécute dans un conteneur sur
le runner GitHub, pas sur ton poste.

---

## Marche à suivre — première mise en ligne

### 1 · Dépôt GitHub

Le dépôt n'a **aucun remote** aujourd'hui, et la branche locale est `master` alors que les
workflows écoutent `main`. Les deux se règlent d'un coup :

```powershell
git branch -m master main
gh repo create Dr.JeSaisTout-WebApp --public --source=. --remote=origin
```

> ✅ **Fait le 2026-08-04** → `https://github.com/DrL0ve69/Dr.JeSaisTout-WebApp`

> **Public plutôt que privé, volontairement** : GitHub Actions est illimité sur un dépôt public,
> alors qu'un dépôt privé consomme un quota de 2 000 min/mois dont le dépassement est **facturable**.
> Un quota facturable au dépassement est exclu par `.claude/rules/budget-free-tier.md`. C'est de
> toute façon un projet de portfolio, destiné à être vu.
>
> Avant de pousser : `git log -p | Select-String -Pattern 'apiKey|secret|password|token='` — rien
> ne doit sortir. Activer ensuite *push protection* dans Settings → Code security.

### 2 · Créer la ressource Azure

```powershell
az login                        # ouvre le navigateur ; à faire toi-même
az account show --output table  # vérifier que c'est le bon abonnement

cd infra
terraform init
terraform plan                  # LIRE le plan avant d'aller plus loin
terraform apply
```

`plan` doit annoncer exactement **2 à créer, 0 à modifier, 0 à détruire**. Tout écart se lit avant
d'appliquer, pas après.

### 3 · Câbler le jeton de déploiement

**Après l'`apply`, jamais avant** : sans état, `terraform output` rend une chaîne vide et
`gh secret set` pose alors un secret vide *sans erreur visible*.

```powershell
gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --body (terraform output -raw jeton_deploiement)
terraform output url_site       # note l'URL, elle servira à l'étape 5
```

Vérifier que le secret est bien posé et non vide :

```powershell
gh secret list                  # AZURE_STATIC_WEB_APPS_API_TOKEN doit apparaître
(terraform output -raw jeton_deploiement).Length   # doit être > 0 (ne PAS afficher la valeur)
```

Le jeton n'apparaît ni dans l'historique du shell (`gh` lit `--body` en argument évalué) ni dans les
logs GitHub, où les secrets sont masqués.

### 4 · Déclencher le déploiement

```powershell
cd ..
git add -A
git commit -m "feat(ci): workflows GitHub Actions et provisionnement Terraform SWA Free"
git push -u origin main
```

Le workflow `Déploiement (main → SWA Free)` enchaîne lint → test → build → audit → publication,
puis **vérifie les en-têtes réellement servis** et échoue si la CSP arrive sans hachage résolu.

### 5 · Le constat qu'aucun script ne peut faire à ta place

Ouvre l'URL, console développeur ouverte, et regarde : **aucune violation CSP** ne doit apparaître,
en particulier sur `<script id="ng-state" type="application/json">` — l'hydratation Angular en
dépend. La page doit être **stylée** (si elle est nue, `style-src` a rejeté le bloc `<style>`).

C'est le point resté ouvert depuis E0-ST3 : les en-têtes sont vérifiés par machine, le
*comportement du navigateur* ne l'est pas. Deux minutes de tes yeux le closent.

---

## Détruire

```powershell
cd infra
terraform destroy
```

Rien n'étant facturé, il n'y a aucune urgence à détruire — mais la commande existe et l'état local
la rend fiable.

## Régions

Le palier Free n'est offert que dans un sous-ensemble de régions, **aucune au Canada** au
2026-08-04 : `westus2`, `centralus`, `eastus2`, `westeurope`, `eastasia`. Le défaut est `eastus2`
(la plus proche de l'Outaouais) et une `validation` Terraform refuse toute autre valeur — une
région non offerte échouerait sinon au milieu de l'`apply`. Le groupe de ressources, lui, n'a pas
cette contrainte et reste en `canadacentral`.
