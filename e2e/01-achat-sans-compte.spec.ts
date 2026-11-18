import { expect, test } from './support/test';
import { addToCart, fillDelivery, payAndConfirm, PRODUCT_NAME } from './support/shop';

test('un visiteur commande sans compte, paie à la livraison puis suit sa commande', async ({ page }) => {
  await addToCart(page);
  await fillDelivery(page, { name: 'Aïcha Mba', phone: '077 12 34 56', email: 'aicha.mba@exemple.test' });
  const number = await payAndConfirm(page, /livraison/i);

  // Livraison Glass 1 500 FCFA ajoutée au prix de la raquette (31 000 FCFA)
  await expect(page.getByText('Livraison (Glass)')).toBeVisible();
  await expect(page.locator('main')).toContainText(/Préparez 32.500.FCFA/);
  await expect(page.getByText(PRODUCT_NAME).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Ouvrir le panier, 0 article/ })).toBeVisible();

  const code = (await page.getByText('Code de suivi').locator('xpath=following-sibling::p[1]').textContent())?.trim();
  expect(code).toMatch(/^[A-Z0-9]{6}$/);

  await page.getByRole('link', { name: 'Suivre ma commande' }).last().click();
  await expect(page.getByLabel('Numéro de commande')).toHaveValue(number);
  await page.getByLabel('Code de suivi').fill(code ?? '');
  await page.getByRole('button', { name: 'Afficher le suivi' }).click();
  await expect(page.getByText(PRODUCT_NAME).first()).toBeVisible();
  await expect(page.getByText(number).first()).toBeVisible();

  // Un mauvais code ne révèle rien
  await page.goto(`/suivi?numero=${number}`);
  await page.getByLabel('Code de suivi').fill('ZZZZZZ');
  await page.getByRole('button', { name: 'Afficher le suivi' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText(PRODUCT_NAME)).toHaveCount(0);
});
