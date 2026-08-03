# Budget « zéro frais » — règle dure (Dr. Je-Sais-Tout)

> **Ce que c'est.** Une contrainte **non négociable** posée par le propriétaire du projet : le site
> doit se construire et tourner **sans dépenser d'argent**. La seule ressource payée déjà acquise est
> le **crédit étudiant Azure (~120 $ CA)** ; on ne le dépasse pas. Le hook `PostToolUse`
> (`post-edit-guardrail.mjs`) pointe ici sur toute édition de dépendance/fournisseur/config
> (`package.json`, `*.csproj`, `appsettings*.json`, `staticwebapp.config.json`, CI).
>
> **Règle d'or :** *jamais de dépense, d'abonnement, de clé API facturée ni de service payant — sans
> le consentement explicite du propriétaire.* Par défaut on choisit du **gratuit ET sans clé**.

---

## 1 · La décision — avant tout fournisseur / `dotnet add package` / `npm i` d'un SDK hébergé

- [ ] **Gratuit ET sans clé ?** Priorise le keyless/open pour tout service tiers (fonts, icônes,
      recherche, analytics, hébergement d'images…).
- [ ] **Le « tier gratuit » exige-t-il un compte de facturation / une carte de crédit ?** Si oui →
      **traité comme PAYANT → refusé.** Un « free tier » qui peut **facturer au dépassement** est
      exclu par défaut : le risque de frais existe. On ne « met pas juste une carte au cas où ».
- [ ] **Coût documenté dans le PR.** Toute nouvelle dépendance externe / tout appel à un tiers indique
      explicitement : *gratuit + sans clé* / *gratuit avec compte mais sans carte* / *facturable* (→ à
      refuser sauf accord). Pas de service réseau ajouté en silence.
- [ ] **Azure.** S'en tenir aux paliers gratuits documentés dans `docs/deployment.md` :
      **Phase 1** — **Azure Static Web Apps Free** (hébergement du site statique/prerendu, pas de
      backend). **Phase 2** — dès que l'API .NET existe : **Container Apps free grant** + **Azure SQL
      S0** (sur le crédit étudiant). Ne pas provisionner de SKU payant ni dépasser le crédit. Toute
      ressource cloud nouvelle = vérifier le palier avant de la créer.

---

## 2 · Anti-patrons à refuser en revue

- [ ] **Clé API facturée** (CDN payant, service d'analytics payant, LLM payant pour du contenu
      généré…) introduite sans accord explicite → refus ; chercher l'équivalent keyless (cf. §1).
- [ ] **« On active la facturation pour le tier gratuit »** → non : un tier qui requiert une carte est
      traité comme payant (§1).
- [ ] **SKU Azure payant / dépassement du crédit étudiant** sans accord → refus. En particulier :
      SWA **Standard** au lieu de **Free**, App Service au lieu de Container Apps free grant, tout tier
      Azure SQL au-dessus de **S0**.
- [ ] **Service tiers réseau ajouté sans ligne de coût dans le PR** → documenter ou retirer.
- [ ] **Domaine personnalisé / certificat payant** ajouté sans accord → le sous-domaine `*.azurestaticapps.net`
      fourni par SWA Free (avec TLS gratuit) est le défaut tant qu'aucun domaine n'est acheté avec accord.

---

**Pré-commit, sur un diff touchant dépendances / fournisseur / config cloud :** gratuit **et** sans
clé (ou gratuit sans carte) ? aucun tier « facturable au dépassement » introduit sans accord ? coût
documenté dans le PR ? palier Azure gratuit respecté (SWA Free en phase 1, Container Apps free grant +
SQL S0 en phase 2) ? Au moindre doute sur un frais possible — **stop, demander au propriétaire**.
