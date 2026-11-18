import type { Page } from '@playwright/test';
import { deliver, loginAsStaff, openOrder, STAFF } from './support/admin';
import { newCustomer, register } from './support/customer';
import { addToCart, fillDelivery, payAndConfirm } from './support/shop';
import { expect, test } from './support/test';

/** Solde affiché dans l'espace fidélité du client */
async function loyaltyBalance(page: Page) {
  await page.goto('/compte/fidelite');
  const value = page.getByText('Solde de points').locator('xpath=following-sibling::p[1]');
  await expect(value).toBeVisible();
  return value;
}

test('un retour accepté, reçu, inspecté et remboursé retire les points gagnés', async ({ page, staffPage }) => {
  test.setTimeout(150_000);
  const customer = newCustomer();
  await register(page, customer);
  await addToCart(page);
  await fillDelivery(page, {
    name: `${customer.firstName} ${customer.lastName}`,
    phone: customer.phone,
    email: customer.email,
  });
  const number = await payAndConfirm(page, /livraison/i);
  const before = Number(await (await loyaltyBalance(page)).textContent());

  // Livraison puis encaissement des espèces : les points sont crédités une fois la commande payée
  const staff = staffPage;
  await loginAsStaff(staff, STAFF.owner);
  const drawer = await deliver(staff, number);
  await drawer.getByRole('button', { name: 'Confirmer l’encaissement' }).click();
  const cash = staff.getByRole('dialog', { name: 'Confirmer l’encaissement' });
  await cash.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(cash).toBeHidden();
  await expect(drawer.getByText(/Payé$/)).toBeVisible();

  // 1 point par tranche de 1 000 FCFA d'articles : 31 points pour 31 000 FCFA
  await expect(await loyaltyBalance(page)).toHaveText(String(before + 31));

  // Demande de retour du client
  await page.goto(`/compte/commandes/${number}`);
  await page.getByRole('button', { name: 'Demander un retour' }).click();
  const request = page.getByRole('dialog', { name: 'Demander un retour' });
  await request.getByRole('button', { name: 'Augmenter la quantité' }).click();
  await request.getByLabel('Motif').selectOption('Erreur de taille ou de variante');
  await request.getByRole('button', { name: 'Envoyer la demande' }).click();
  await expect(request).toBeHidden();

  // Décision, réception, inspection puis remboursement par l'administrateur principal
  const order = await openOrder(staff, number);
  await order.getByRole('button', { name: 'Accepter le retour' }).click();
  const accept = staff.getByRole('dialog', { name: `Accepter le retour de ${number}` });
  await accept.getByLabel('Motif de l’accord').fill('Taille non adaptée, article intact.');
  await accept.getByRole('radio').first().check();
  await accept.getByLabel('Motif de la prise en charge').fill('Retour déposé en boutique par le client.');
  await accept.getByRole('button', { name: 'Accepter le retour' }).click();
  await expect(accept).toBeHidden();

  await order.getByRole('button', { name: 'Marquer le colis reçu' }).click();
  await order.getByRole('button', { name: 'Inspecter le colis' }).click();
  const inspection = staff.getByRole('dialog', { name: 'Inspection du colis retourné' });
  await inspection.getByRole('button', { name: 'Valider l’inspection' }).click();
  await expect(inspection).toBeHidden();

  await order.getByRole('button', { name: 'Confirmer le remboursement' }).click();
  const refund = staff.getByRole('dialog', { name: 'Confirmer le remboursement' });
  await refund.getByLabel('Référence du remboursement').fill('REMB-E2E-0001');
  await refund.getByRole('button', { name: 'Confirmer le remboursement' }).click();
  await expect(refund).toBeHidden();
  await expect(order.getByText('Retour : remboursé')).toBeVisible();
  await expect(order.getByText(/réf\. REMB-E2E-0001/)).toBeVisible();

  // Les points gagnés sur l'article retourné sont retirés
  await expect(await loyaltyBalance(page)).toHaveText(String(before));
});
