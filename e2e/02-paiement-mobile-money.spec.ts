import { expect, test } from './support/test';
import { loginAsStaff, STAFF } from './support/admin';
import { addToCart, fillDelivery, payAndConfirm } from './support/shop';

test('une commande Airtel Money déclarée par le client n’entre en préparation qu’une fois le paiement vérifié', async ({
  page,
  staffPage,
}) => {
  await addToCart(page);
  await fillDelivery(page, { name: 'Paul Ndong', phone: '074 22 33 44', email: 'paul.ndong@exemple.test' });
  const number = await payAndConfirm(page, /Airtel/i);

  // Le client déclare son paiement avec la référence reçue par SMS, sans compte
  await page.getByLabel('Référence de la transaction').fill('AM-E2E-0001');
  await page.getByRole('button', { name: 'J’ai payé' }).click();
  await expect(page.getByText(/Paiement déclaré.*réf\. AM-E2E-0001/)).toBeVisible();

  // Le suivi sans compte affiche la déclaration
  const code = (await page.getByText('Code de suivi').locator('xpath=following-sibling::p[1]').textContent())?.trim();
  await page.goto(`/suivi?numero=${number}`);
  await page.getByLabel('Code de suivi').fill(code ?? '');
  await page.getByRole('button', { name: 'Afficher le suivi' }).click();
  await expect(page.getByText(/Paiement déclaré.*réf\. AM-E2E-0001/)).toBeVisible();

  const staff = staffPage;
  await loginAsStaff(staff, STAFF.orders);
  await staff.goto('/admin/paiements');
  await staff.getByRole('radio', { name: /À vérifier/ }).click();
  await staff.getByRole('searchbox', { name: 'Numéro, client, téléphone' }).fill(number);
  await staff.getByRole('row', { name: new RegExp(number) }).click();
  const drawer = staff.getByRole('dialog', { name: number });

  // Préparation bloquée tant que le paiement n'est pas enregistré ; la référence déclarée est montrée
  await expect(drawer.getByText('Paiement Mobile Money à vérifier avant de commencer la préparation.')).toBeVisible();
  await expect(drawer.getByText('AM-E2E-0001')).toBeVisible();

  await drawer.getByRole('button', { name: 'Enregistrer le paiement reçu' }).click();
  const dialog = staff.getByRole('dialog', { name: 'Enregistrer le paiement reçu' });
  await expect(dialog.getByLabel(/Référence de la transaction/)).toHaveValue('AM-E2E-0001');
  // Un montant partiel est refusé par l'API
  await dialog.getByLabel('Montant reçu (FCFA)').fill('10000');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(staff.getByText(/Montant attendu : 32.500.FCFA/)).toBeVisible();

  await dialog.getByLabel('Montant reçu (FCFA)').fill('32500');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();
  await expect(drawer.getByText(/Payé$/)).toBeVisible();
  // Facture émise par l'API au paiement
  await expect(drawer.getByText(/FAC-\d{4}-\d{6} Facture/)).toBeVisible();
  await expect(drawer.getByText(/réf\. AM-E2E-0001/)).toBeVisible();

  await drawer.getByRole('button', { name: 'Commencer la préparation' }).click();
  await expect(drawer.getByText(/^En préparation/)).toBeVisible();
});
