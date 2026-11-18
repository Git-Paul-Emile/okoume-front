import { expect, test } from './support/test';
import { loginAsStaff, STAFF } from './support/admin';

test('un mauvais mot de passe ne donne pas accès au back-office', async ({ page }) => {
  await page.goto('/admin/connexion');
  await page.getByLabel('Adresse e-mail professionnelle').fill(STAFF.orders);
  await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe-123');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vérification en deux étapes' })).toHaveCount(0);

  await page.goto('/admin/commandes');
  await expect(page).toHaveURL(/\/admin\/connexion/);
});

test('le gestionnaire stock n’accède ni aux commandes ni aux paiements', async ({ page }) => {
  await loginAsStaff(page, STAFF.stock);
  await page.goto('/admin/stock');
  await expect(page.getByText('Accès réservé')).toHaveCount(0);

  for (const screen of ['/admin/commandes', '/admin/paiements']) {
    await page.goto(screen);
    await expect(page.getByText('Accès réservé')).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'Commandes', exact: true })).toHaveCount(0);
});
