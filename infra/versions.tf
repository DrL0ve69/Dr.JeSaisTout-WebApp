terraform {
  required_version = ">= 1.9.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  # État LOCAL, volontairement (voir infra/README.md §État).
  # Un backend distant Azure Storage coûterait des centimes sur le crédit étudiant et ajouterait
  # une ressource à opérer pour un projet à une seule stack, mono-utilisateur. La fiche KB
  # devops/infrastructure-as-code-limites.md tranche ce cas : « petite équipe, une seule stack
  # → Terraform seul ». À rouvrir si le backend .NET de la phase 2 amène plusieurs stacks.
}

provider "azurerm" {
  features {}

  # Défini par la variable, sinon par la variable d'environnement ARM_SUBSCRIPTION_ID,
  # sinon par l'abonnement actif d'`az login`.
  subscription_id = var.subscription_id
}
