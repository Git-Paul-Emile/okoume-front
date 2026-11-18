import { loginAsStaff, openOrder, STAFF } from './support/admin';
import { fillDelivery, payAndConfirm, PRODUCT_SLUG } from './support/shop';
import { expect, test } from './support/test';

test('une commande de quantité inhabituelle attend une vérification avant la préparation', async ({
  page,
  staffPage,
}) => {
  // 5 exemplaires d'un même article : signal « quantité inhabituelle »
  await page.goto(`/produit/${PRODUCT_SLUG}`);
  for (let i = 1; i < 5; i++) await page.getByRole('button', { name: 'Augmenter la quantité' }).first().click();
  await page.getByRole('button', { name: 'Ajouter au panier' }).first().click();
  await expect(page.getByRole('button', { name: /Ouvrir le panier, 5 articles/ })).toBeVisible();
  await fillDelivery(page, { name: 'Marc Ella', phone: '062 11 22 33', email: 'marc.ella@exemple.test' });
  const number = await payAndConfirm(page, /Espèces/);
  // Le client n'est pas averti : la commande est enregistrée normalement
  await expect(page.getByText(/vérifier|suspect/i)).toHaveCount(0);

  const staff = staffPage;
  await loginAsStaff(staff, STAFF.orders);
  await staff.goto('/admin/commandes');
  await staff.getByRole('radio', { name: /À vérifier/ }).click();
  await expect(staff.getByRole('row', { name: new RegExp(number) })).toBeVisible();

  const drawer = await openOrder(staff, number);
  await expect(drawer.getByText('Quantité inhabituelle d’un même article')).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Commencer la préparation' })).toBeDisabled();

  await drawer.getByRole('button', { name: 'Valider après vérification' }).click();
  const dialog = staff.getByRole('dialog', { name: `Vérifier ${number}` });
  await dialog.getByLabel('Motif').fill('Client rappelé : commande pour une association, confirmée.');
  await dialog.getByRole('button', { name: 'Valider la commande' }).click();
  await expect(dialog).toBeHidden();
  await expect(drawer.getByText(/Commande vérifiée/)).toBeVisible();

  await drawer.getByRole('button', { name: 'Commencer la préparation' }).click();
  await expect(drawer.getByText(/^En préparation/)).toBeVisible();
});
