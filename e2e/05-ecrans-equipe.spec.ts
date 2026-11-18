import { loginAsStaff, STAFF } from './support/admin';
import { expect, test } from './support/test';

/** Écrans du back-office (admin.navigation.ts) : chacun doit s'afficher sans erreur ni blocage de la CSP. */
const SCREENS = [
  '/admin',
  '/admin/statistiques',
  '/admin/alertes',
  '/admin/assistant',
  '/admin/commandes',
  '/admin/paiements',
  '/admin/retours',
  '/admin/livraisons',
  '/admin/livreurs',
  '/admin/produits',
  '/admin/categories',
  '/admin/stock',
  '/admin/inventaire',
  '/admin/promotions',
  '/admin/clients',
  '/admin/emails',
  '/admin/donnees-personnelles',
  '/admin/avis',
  '/admin/assistance',
  '/admin/place-de-marche',
  '/admin/contenus',
  '/admin/editorial',
  '/admin/equipe',
  '/admin/securite',
  '/admin/journal',
  '/admin/parametres',
];

test('l’administrateur principal ouvre chaque écran et exporte en PDF', async ({ page }) => {
  test.setTimeout(180_000);
  await loginAsStaff(page, STAFF.owner);

  for (const screen of SCREENS) {
    await page.goto(screen);
    await expect(page.locator('main'), screen).toBeVisible();
    await expect(page.getByText('Une erreur est survenue'), screen).toHaveCount(0);
    await expect(page.getByText('Impossible d’afficher ce contenu'), screen).toHaveCount(0);
  }

  // Export PDF (jsPDF chargé à la demande) : doit aboutir à un téléchargement
  await page.goto('/admin/statistiques');
  await page.getByRole('button', { name: 'CSV' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Format').selectOption('pdf');
  await dialog.getByLabel('Motif de l’export').fill('Contrôle des parcours automatiques');
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Télécharger' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
});
