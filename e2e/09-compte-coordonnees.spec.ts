import { newCustomer, register } from './support/customer';
import { sixDigitCode, waitForEmail } from './support/mailbox';
import { addToCart, fillDelivery, payAndConfirm } from './support/shop';
import { expect, test } from './support/test';

test('un client rattache une commande passée sans compte puis change son adresse e-mail', async ({ page }) => {
  const customer = newCustomer();

  // Commande sans compte, avec l'adresse qui servira au compte
  await addToCart(page);
  await fillDelivery(page, { name: 'Nadia Obiang', phone: customer.phone, email: customer.email });
  const number = await payAndConfirm(page, /livraison/i);
  const code = (await page.getByText('Code de suivi').locator('xpath=following-sibling::p[1]').textContent())?.trim();

  await register(page, customer);
  await page.goto('/compte/commandes');
  await page.getByLabel('Numéro de commande').fill(number);
  await page.getByLabel('Code de suivi').fill(code ?? '');
  await page.getByRole('button', { name: 'Ajouter à mon compte' }).click();
  await expect(page.getByRole('link', { name: new RegExp(number) })).toBeVisible();

  // Nouvelle adresse : code envoyé à cette adresse, ancienne adresse prévenue
  const next = customer.email.replace('@', '.nouveau@');
  await page.goto('/compte/profil');
  await page.getByRole('button', { name: 'Modifier mes coordonnées' }).click();
  await page.getByLabel('Nouvelle adresse e-mail').fill(next);
  await page.getByLabel('Mot de passe actuel').fill(customer.password);
  const since = Date.now();
  await page.getByRole('button', { name: 'Recevoir un code' }).click();
  const mail = await waitForEmail(next, /code de modification/i, since);
  await page.getByLabel('Code de vérification').fill(sixDigitCode(mail));
  await page.getByRole('button', { name: 'Confirmer le changement' }).click();
  await expect(page.locator('main section').getByText(next)).toBeVisible();
  await waitForEmail(customer.email, /coordonnées.*ont changé/i, since);
});
