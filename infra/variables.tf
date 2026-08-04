variable "subscription_id" {
  description = "ID de l'abonnement Azure. Laisser vide pour utiliser ARM_SUBSCRIPTION_ID ou l'abonnement actif d'`az login`."
  type        = string
  default     = null
}

variable "nom_projet" {
  description = "Préfixe de nommage des ressources."
  type        = string
  default     = "dr-je-sais-tout"
}

variable "emplacement_groupe" {
  description = "Région du groupe de ressources. Sans contrainte de palier — seule la Static Web App est limitée."
  type        = string
  default     = "canadacentral"
}

variable "emplacement_swa" {
  description = <<-EOT
    Région de la Static Web App. Le palier **Free** n'est offert que dans un sous-ensemble de
    régions (aucune au Canada au 2026-08-04) : westus2, centralus, eastus2, westeurope, eastasia.
    eastus2 est la plus proche de l'Outaouais.
  EOT
  type        = string
  default     = "eastus2"

  validation {
    condition     = contains(["westus2", "centralus", "eastus2", "westeurope", "eastasia"], var.emplacement_swa)
    error_message = "Région non offerte pour le palier Free. Choisir parmi : westus2, centralus, eastus2, westeurope, eastasia."
  }
}

variable "etiquettes" {
  description = "Étiquettes appliquées à toutes les ressources."
  type        = map(string)
  default = {
    projet     = "dr-je-sais-tout"
    phase      = "1"
    gestion    = "terraform"
    cout_prevu = "zero-palier-gratuit"
  }
}
