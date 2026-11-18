import { expect, test } from './support/test';
import { deliver, loginAsStaff, STAFF } from './support/admin';
import { addToCart, fillDelivery, payAndConfirm } from './support/shop';

test('une commande Airtel Money se prépare sans paiement préalable et s’encaisse à la livraison', async ({
  page,
  staffPage,
}) => {
  await addToCart(page);
  await fillDelivery(page, { name: 'Paul Ndong', phone: '074 22 33 44', email: 'paul.ndong@exemple.test' });
  const number = await payAndConfirm(page, /Airtel/i);

  // Rien à payer avant : le client paiera au livreur, depuis son téléphone
  await expect(page.getByRole('heading', { name: /Paiement par .* à la livraison/ })).toBeVisible();
  await expect(page.getByText('Rien à payer maintenant', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'J’ai payé' })).toHaveCount(0);

  // L'équipe prépare et livre sans attendre de paiement
  const staff = staffPage;
  await loginAsStaff(staff, STAFF.orders);
  const drawer = await deliver(staff, number);

  // À la livraison : encaissement confirmé avec la référence de la transaction
  await drawer.getByRole('button', { name: 'Confirmer l’encaissement' }).click();
  const dialog = staff.getByRole('dialog', { name: 'Confirmer l’encaissement' });
  // Un montant partiel est refusé par l'API
  await dialog.getByLabel('Montant reçu (FCFA)').fill('10000');
  await dialog.getByLabel(/Référence de la transaction/).fill('AM-E2E-0001');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(staff.getByText(/Montant attendu : 32.500.FCFA/)).toBeVisible();

  await dialog.getByLabel('Montant reçu (FCFA)').fill('32500');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();
  await expect(drawer.getByText(/Payé$/)).toBeVisible();
  // Facture émise par l'API au paiement
  await expect(drawer.getByText(/FAC-\d{4}-\d{6} Facture/)).toBeVisible();
  await expect(drawer.getByText(/réf\. AM-E2E-0001/)).toBeVisible();
});
