import { expect, type Page } from '@playwright/test';
import { DEMO_PASSWORD } from './stack';

/** Comptes de l'équipe des données de départ (api/prisma/seeders/data/staff.json) */
export const STAFF = {
  owner: 'admin@boutique.ga',
  orders: 'commandes@boutique.ga',
  stock: 'stock@boutique.ga',
} as const;

/** Connexion directe au back-office avec adresse e-mail et mot de passe. */
export async function loginAsStaff(page: Page, email: string) {
  await page.goto('/admin/connexion');
  await page.getByLabel('Adresse e-mail professionnelle').fill(email);
  await page.getByLabel('Mot de passe').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
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
