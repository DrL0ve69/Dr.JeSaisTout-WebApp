output "url_site" {
  description = "URL publique du site (TLS fourni par SWA Free)."
  value       = "https://${azurerm_static_web_app.site.default_host_name}"
}

output "nom_swa" {
  description = "Nom de la ressource Static Web App."
  value       = azurerm_static_web_app.site.name
}

# Jeton de déploiement consommé par le workflow GitHub Actions.
# `sensitive = true` l'empêche de s'afficher dans la sortie de `terraform apply` ; il reste
# néanmoins **en clair dans terraform.tfstate**, d'où le .gitignore (voir infra/README.md §État).
output "jeton_deploiement" {
  description = "Valeur du secret GitHub AZURE_STATIC_WEB_APPS_API_TOKEN. Lire avec : terraform output -raw jeton_deploiement"
  value       = azurerm_static_web_app.site.api_key
  sensitive   = true
}
