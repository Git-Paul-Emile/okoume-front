import { expect, type Page } from '@playwright/test';

/** Produit simple des données de départ : une seule variante, sans promotion, stock large (33), 31 000 FCFA */
export const PRODUCT_SLUG = 'raquette-de-tennis';
export const PRODUCT_NAME = 'Raquette de tennis';

export async function addToCart(page: Page, slug = PRODUCT_SLUG) {
  await page.goto(`/produit/${slug}`);
  await page.getByRole('button', { name: 'Ajouter au panier' }).first().click();
  await expect(page.getByRole('button', { name: /Ouvrir le panier, 1 article/ })).toBeVisible();
}

export interface Recipient {
  name: string;
  phone: string;
  email: string;
}

/** Étape livraison remplie pour un acheteur sans compte */
export async function fillDelivery(page: Page, who: Recipient) {
  await page.goto('/commande');
  await page.getByLabel('Nom du destinataire').fill(who.name);
  await page.getByLabel('Téléphone').fill(who.phone);
  await page.getByLabel('Adresse e-mail').fill(who.email);
  await page.getByLabel('Quartier de livraison').selectOption({ label: 'Glass (Libreville) : 1 500 FCFA' });
  await page.getByLabel('Repère précis').fill('Derrière la pharmacie, portail bleu');
  await page.getByRole('button', { name: 'Continuer vers le paiement' }).click();
}

/** Choisit le moyen de paiement puis confirme ; renvoie le numéro de commande affiché. */
export async function payAndConfirm(page: Page, method: RegExp) {
  // Au clavier : selon le défilement, l'en-tête collant peut recouvrir le choix
  const radio = page.getByRole('radio', { name: method });
  await radio.focus();
  await radio.press('Enter');
  await expect(radio).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Vérifier ma commande' }).click();
  await page.getByRole('checkbox', { name: /conditions générales de vente/ }).check();
  await page.getByRole('button', { name: 'Confirmer la commande' }).click();
  await expect(page.getByRole('heading', { name: 'Merci, votre commande est enregistrée' })).toBeVisible();
  const number = page.url().split('/').pop();
  if (!number) throw new Error('Numéro de commande absent de l’adresse');
  return decodeURIComponent(number);
}
