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
      json({ alertEscalationHours: 4, reviewAmount: 500000, cashPreparationAlertHours: 24, assistantMonthlyBudget: 0 }),
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
  it('répartit l’enregistrement entre informations de la boutique et règles de fidélité', async () => {
    await adminSettingsBackend.update({
      reviewAmount: 750000,
      social: { facebook: 'https://facebook.com/okoume', tiktok: '' },
      tiers: [
        { id: 'bronze', name: 'Bronze', threshold: 0, perks: [] },
        { id: 'argent', name: 'Argent', threshold: 200000, perks: [] },
        { id: 'or', name: 'Or', threshold: 600000, perks: [] },
      ],
      welcomeCode: { enabled: false, percent: 0, validDays: 30 },
    });
    expect(patches()).toEqual([
      {
        path: '/staff/settings/shop',
        body: { social: { facebook: 'https://facebook.com/okoume' }, reviewAmount: 750000 },
      },
      {
        path: '/staff/settings/loyalty',
        body: { silverThreshold: 200000, goldThreshold: 600000, welcomeEnabled: false, welcomeValidDays: 30 },
      },
    ]);
  });
});
