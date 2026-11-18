import { expect, test } from './support/test';
import { deliver, loginAsStaff, STAFF } from './support/admin';
import { newCustomer, register } from './support/customer';
import { addToCart, fillDelivery, payAndConfirm, PRODUCT_NAME } from './support/shop';

test('un client inscrit commande, est livré puis demande un retour', async ({ page, staffPage }) => {
  const customer = newCustomer();
  await register(page, customer);

  await addToCart(page);
  await fillDelivery(page, {
    name: `${customer.firstName} ${customer.lastName}`,
    phone: customer.phone,
    email: customer.email,
  });
  const number = await payAndConfirm(page, /Espèces/);

  // La commande apparaît dans l'espace client
  await page.goto('/compte/commandes');
  await expect(page.getByText(number)).toBeVisible();

  const staff = staffPage;
  await loginAsStaff(staff, STAFF.orders);
  await deliver(staff, number);

  await page.goto(`/compte/commandes/${number}`);
  await page.getByRole('button', { name: 'Demander un retour' }).click();
  const dialog = page.getByRole('dialog', { name: 'Demander un retour' });
  await dialog.getByRole('button', { name: 'Augmenter la quantité' }).click();
  await dialog.getByLabel('Motif').selectOption('Erreur de taille ou de variante');
  await dialog.getByLabel('Description du problème').fill('La taille ne convient pas à mon fils.');
  await dialog.getByRole('button', { name: 'Envoyer la demande' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(/retour/i).first()).toBeVisible();

  // L'équipe voit la demande de retour
  await staff.goto('/admin/retours');
  await staff.getByRole('radio', { name: /^Retours/ }).click();
  const row = staff.getByRole('row', { name: new RegExp(number) });
  await expect(row).toContainText('Erreur de taille ou de variante');
  await expect(row).toContainText('À décider');
  await row.click();
  await expect(staff.getByRole('dialog', { name: number }).getByText(PRODUCT_NAME).first()).toBeVisible();
});
