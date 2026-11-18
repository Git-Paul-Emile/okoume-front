import { addToCart, fillDelivery } from './support/shop';
import { expect, test } from './support/test';

test('un double clic puis un renvoi de la même commande ne créent qu’une commande', async ({ page }) => {
  await addToCart(page);
  await fillDelivery(page, { name: 'Léa Moussavou', phone: '077 55 66 77', email: 'lea.moussavou@exemple.test' });
  const radio = page.getByRole('radio', { name: /livraison/i });
  await radio.focus();
  await radio.press('Enter');
  await page.getByRole('button', { name: 'Vérifier ma commande' }).click();
  await page.getByRole('checkbox', { name: /conditions générales de vente/ }).check();

  const placed: { url: string; body: string; number: Promise<string> }[] = [];
  page.on('response', (r) => {
    const req = r.request();
    if (req.method() !== 'POST' || !/\/api\/v1\/orders$/.test(r.url())) return;
    const number = r.json().then((b: { data: { number: string } }) => b.data.number);
    placed.push({ url: r.url(), body: req.postData() ?? '', number });
  });
  await page.getByRole('button', { name: 'Confirmer la commande' }).dblclick();
  await expect(page.getByRole('heading', { name: 'Merci, votre commande est enregistrée' })).toBeVisible();
  const number = decodeURIComponent(page.url().split('/').pop() ?? '');

  // Un double clic rapide peut envoyer deux requêtes avant que le bouton se désactive : elles portent la même
  // clé d'idempotence, et l'API renvoie la même commande au lieu d'en créer une seconde
  expect(placed.length).toBeGreaterThanOrEqual(1);
  expect(new Set(placed.map((p) => JSON.parse(p.body).idempotencyKey)).size).toBe(1);
  expect(await Promise.all(placed.map((p) => p.number))).toEqual(placed.map(() => number));

  // Même requête renvoyée (réseau coupé puis rejoué, par exemple) : même clé d'idempotence, même commande
  const replay = await page.request.post(placed[0].url, {
    data: JSON.parse(placed[0].body),
    headers: { 'Content-Type': 'application/json' },
  });
  expect(replay.ok()).toBe(true);
  const body = (await replay.json()) as { data: { number: string } };
  expect(body.data.number).toBe(number);
});
