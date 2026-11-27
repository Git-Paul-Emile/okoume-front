import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ env: { backendUrl: 'http://api.test/api/v1' } }));
vi.mock('@/features/settings/settings.api', () => ({ toShopSettings: (raw: unknown) => raw }));

const { adminSettingsBackend } = await import('./adminSettings.backend');

const json = (body: unknown) =>
  new Response(JSON.stringify({ success: true, data: body }), { headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn(() =>
    Promise.resolve(
      json({ currency: 'XAF', mobileMoney: [], mobileMoneyExpiryHours: 24, deliveryVatRate: 18, maxAddresses: 5, legal: {}, support: {}, social: {} }),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const patches = () =>
  fetchMock.mock.calls
    .filter(([, init]) => init.method === 'PATCH')
    .map(([url, init]) => ({
      path: String(url).replace('http://api.test/api/v1', ''),
      body: JSON.parse(String(init.body)) as unknown,
    }));

describe('paramètres sur l’API', () => {
  it('enregistre les informations de boutique', async () => {
    await adminSettingsBackend.update({
      social: { facebook: 'https://facebook.com/okoza', tiktok: '' },
    });
    expect(patches()).toEqual([
      {
        path: '/staff/settings/shop',
        body: { social: { facebook: 'https://facebook.com/okoza' } },
      },
    ]);
  });
});
