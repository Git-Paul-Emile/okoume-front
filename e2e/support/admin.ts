import { expect, type Page } from '@playwright/test';
import { sixDigitCode, waitForEmail } from './mailbox';
import { DEMO_PASSWORD } from './stack';

/** Comptes de l'équipe des données de départ (api/prisma/seeders/data/staff.json) */
export const STAFF = {
  owner: 'admin@boutique.ga',
  orders: 'commandes@boutique.ga',
  stock: 'stock@boutique.ga',
} as const;

/** Connexion au back-office : mot de passe, puis code reçu par e-mail. */
export async function loginAsStaff(page: Page, email: string) {
  const since = Date.now();
  await page.goto('/admin/connexion');
  await page.getByLabel('Adresse e-mail professionnelle').fill(email);
  await page.getByLabel('Mot de passe').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('heading', { name: 'Vérification en deux étapes' })).toBeVisible();
  const mail = await waitForEmail(email, /code de connexion/i, since);
  await page.getByLabel('Code de vérification').fill(sixDigitCode(mail));
  await page.getByRole('button', { name: 'Valider' }).click();
  await expect(page).toHaveURL(/\/admin(\/|$)(?!connexion)/);
}

/** Ouvre la commande dans le back-office et la fait avancer jusqu'à « Livrée » ; renvoie son tiroir. */
export async function deliver(staff: Page, number: string) {
  const drawer = await openOrder(staff, number);
  await drawer.getByRole('button', { name: 'Commencer la préparation' }).click();
  await drawer.getByRole('button', { name: 'Marquer prête à livrer' }).click();
  await drawer.getByRole('button', { name: 'Assigner un livreur' }).click();
  const courier = staff.getByRole('dialog', { name: `Livreur pour ${number}` });
  await courier.getByRole('radio').first().check();
  await courier.getByRole('button', { name: 'Affecter et envoyer' }).click();
  await expect(courier).toBeHidden();
  await drawer.getByRole('button', { name: 'Marquer en livraison' }).click();
  await drawer.getByRole('button', { name: 'Marquer livrée' }).click();
  await expect(drawer.getByText(/^Livrée/).first()).toBeVisible();
  return drawer;
}

/** Ouvre une commande dans le back-office et renvoie son tiroir. */
export async function openOrder(staff: Page, number: string) {
  await staff.goto('/admin/commandes');
  await staff.getByRole('searchbox').first().fill(number);
  await staff.getByRole('row', { name: new RegExp(number) }).click();
  return staff.getByRole('dialog', { name: number });
}
