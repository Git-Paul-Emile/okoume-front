import { expect, type Page } from '@playwright/test';
import { sixDigitCode, waitForEmail } from './mailbox';

export interface Customer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

/** Client unique par exécution : la base de test est neuve, mais un même fichier peut être relancé. */
export const newCustomer = (): Customer => {
  const id = Date.now().toString(36);
  return {
    firstName: 'Nadia',
    lastName: 'Obiang',
    email: `nadia.${id}@exemple.test`,
    phone: `066 ${String(Date.now())
      .slice(-6)
      .replace(/(\d\d)(\d\d)(\d\d)/, '$1 $2 $3')}`,
    password: 'Parcours-client-2026',
  };
};

/** Inscription : formulaire, puis code reçu par e-mail. */
export async function register(page: Page, c: Customer) {
  const since = Date.now();
  await page.goto('/inscription');
  await page.getByLabel('Prénom').fill(c.firstName);
  await page.getByLabel('Nom', { exact: true }).fill(c.lastName);
  await page.getByLabel('Adresse e-mail').fill(c.email);
  await page.getByLabel('Téléphone').fill(c.phone);
  await page.getByLabel('Mot de passe', { exact: true }).fill(c.password);
  await page.getByLabel('Confirmer le mot de passe').fill(c.password);
  await page.getByRole('checkbox', { name: /CGV/ }).check();
  await page.getByRole('button', { name: 'Continuer' }).click();
  const mail = await waitForEmail(c.email, /code de confirmation/i, since);
  await page.getByLabel('Code de vérification').fill(sixDigitCode(mail));
  await page.getByLabel('Code de vérification').press('Enter');
  await expect(page.getByRole('link', { name: new RegExp(c.firstName) }).first()).toBeVisible();
}
