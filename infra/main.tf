resource "azurerm_resource_group" "principal" {
  name     = "rg-${var.nom_projet}"
  location = var.emplacement_groupe
  tags     = var.etiquettes
}

# Hébergement du site prerendu — phase 1.
#
# ⚠️ Le palier est verrouillé sur **Free** en dur, pas via une variable : c'est la traduction en
# code de la règle `.claude/rules/budget-free-tier.md`. Passer en Standard est une décision du
# propriétaire, qui doit se voir dans un diff Git — pas un `-var` passé en ligne de commande.
# SWA Free fournit TLS gratuit sur *.azurestaticapps.net et n'exige aucune carte de crédit.
resource "azurerm_static_web_app" "site" {
  name                = "swa-${var.nom_projet}"
  resource_group_name = azurerm_resource_group.principal.name
  location            = var.emplacement_swa

  sku_tier = "Free"
  sku_size = "Free"

  tags = var.etiquettes
}
