// =============================================================================
// Lien d'évitement — le scénario de fumée du harnais (WCAG 2.2 · 2.4.1)
// -----------------------------------------------------------------------------
// CE QU'IL AJOUTE À CE QUI EXISTE DÉJÀ. `src/app/app.spec.ts` vérifie que le lien
// est le premier élément focalisable et que sa cible existe — dans jsdom, en
// interrogeant le DOM. C'est nécessaire, ce n'est pas suffisant : jsdom ne calcule
// aucun ordre de tabulation et n'active aucun lien. Le lien pourrait être premier
// dans le document et inatteignable à la touche Tab (un `tabindex` positif ailleurs,
// une couche qui capte la touche), ou atteignable sans que Entrée déplace quoi que
// ce soit. Ici, c'est un vrai Chromium qui presse les touches — sur l'artéfact
// servi par le CLI SWA, donc SOUS LA CSP APPLIQUÉE aux réponses 200 (périmètre
// exact, et les trois trous qu'il laisse : en-tête de `playwright.config.ts`).
//
// ⚠️ AUCUN `.focus()` PROGRAMMATIQUE DANS CE FICHIER, ET C'EST LE POINT.
// Poser le focus par script prouverait seulement que l'élément est focalisable —
// ce que le spec jsdom sait déjà. L'ORDRE réel de tabulation est précisément la
// chose que ce test existe pour mesurer : la seule façon de l'observer est de
// presser Tab. Un `locator.focus()` glissé ici rendrait le test vert et vide.
// =============================================================================

import { expect, test } from '@playwright/test';

test("la première tabulation atteint le lien d'évitement, et Entrée mène au contenu", async ({
  page,
}) => {
  await page.goto('/');

  // Récupéré par son RÔLE et son nom accessible, pas par sa classe CSS : c'est ce
  // qu'une aide technique perçoit. Un lien renommé ou dégradé en `<div>` cliquable
  // ferait donc rougir ce test — un sélecteur `.lien-evitement` ne verrait rien.
  const lienEvitement = page.getByRole('link', { name: 'Aller au contenu principal' });

  // Une seule frappe : le lien d'évitement doit être le PREMIER arrêt, sinon il
  // n'évite rien (un visiteur au clavier ne tabule pas dix fois pour le trouver).
  await page.keyboard.press('Tab');
  await expect(lienEvitement).toBeFocused();

  // Il doit aussi être VISIBLE une fois focalisé : masqué par `clip-path` au repos,
  // il resterait annonçable mais invisible si la règle `:focus` disparaissait —
  // WCAG 2.4.11 (focus non masqué), que le spec jsdom ne peut pas voir faute de
  // cascade CSS.
  await expect(lienEvitement).toBeVisible();

  // Le saut lui-même. Entrée, pas un clic : le lien est invisible au repos, un
  // utilisateur de souris ne l'active jamais.
  await page.keyboard.press('Enter');

  // Le focus atterrit sur `<main id="contenu-principal" tabindex="-1">`. Sans ce
  // `tabindex`, le navigateur ferait défiler la page SANS déplacer le focus : la
  // tabulation suivante repartirait de l'en-tête, et le saut serait purement visuel
  // — la panne classique du lien d'évitement, invisible à tout test structurel.
  await expect(page.locator('#contenu-principal')).toBeFocused();
});
