import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ env: { backendUrl: 'http://api.test/api/v1' } }));

const { settingsApi } = await import('./settings.api');
const { loyaltyApi, toMovement } = await import('@/features/loyalty/loyalty.api');
const { promotionsApi } = await import('@/features/promotions/promotions.api');

const json = (body: unknown) =>
  new Response(JSON.stringify({ success: true, data: body }), { headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const settings = {
  currency: 'XAF',
  loyalty: { pointValue: 50, minRedeem: 100, earnPer: 1000 },
  maxDiscountRate: 0.5,
  tiers: [{ id: 'bronze', name: 'Bronze', threshold: 0, perks: [] }],
  mobileMoney: [
    { method: 'airtel', label: 'Airtel Money', number: '+241 07', beneficiary: 'OKOUME', instructions: '*150#' },
  ],
  mobileMoneyExpiryHours: 24,
  returnWindowDays: 14,
  reopenWindowDays: 14,
  referralReward: 300,
  welcomeCode: { enabled: true, percent: 10, validDays: 30 },
  birthdayReward: { enabled: true, points: 200, percent: 10 },
  deliveryVatRate: 18,
  maxAddresses: 5,
  supportSla: { high: 4, normal: 24 },
  legal: { companyName: 'Okoumé SARL', nif: '', rccm: '', vatNote: '' },
  support: { whatsapp: '24107', phone: '+241 07', email: 'contact@okoume.ga', hours: 'Lun-Sam', address: 'Libreville' },
  social: { facebook: 'https://facebook.com/okoume' },
};

describe('données publiques lues sur l’API', () => {
  it('lit les réglages publics, dont le compte Mobile Money où payer', async () => {
    fetchMock.mockResolvedValue(json(settings));
    const result = await settingsApi.get();
    expect(String(fetchMock.mock.calls[0]![0])).toBe('http://api.test/api/v1/settings');
    expect(result.mobileMoney[0]?.beneficiary).toBe('OKOUME');
    expect(result).not.toHaveProperty('reviewAmount');
  });

  it('refuse des réglages incomplets plutôt que d’afficher un numéro de paiement faux', async () => {
    fetchMock.mockResolvedValue(json({ ...settings, mobileMoney: [{ method: 'orange' }] }));
    await expect(settingsApi.get()).rejects.toThrow();
  });

  it('lit l’historique des points du compte, points rendus compris', async () => {
    expect(
      toMovement(
        { id: 'm1', points: 120, type: 'restore', label: 'Commande annulée', orderId: 'o1', createdAt: 'x' },
        'c1',
      ),
    ).toEqual({
      id: 'm1',
      userId: 'c1',
      points: 120,
      type: 'restore',
      label: 'Commande annulée',
      orderId: 'o1',
      createdAt: 'x',
    });
    fetchMock.mockResolvedValue(json({ items: [], total: 0, page: 1, limit: 100, hasNext: false }));
    await loyaltyApi.movements('c1');
    expect(String(fetchMock.mock.calls[0]![0])).toBe('http://api.test/api/v1/loyalty/movements?page=1&limit=100');
  });

  it('lit les codes publics et les codes personnels du client', async () => {
    fetchMock
      .mockResolvedValueOnce(
        json([
          {
            id: 'p1',
            code: 'NOEL10',
            label: 'Noël',
            type: 'percent',
            value: 10,
            minAmount: 0,
            freeDelivery: false,
            tiers: [],
            startsAt: 'a',
            endsAt: 'b',
          },
        ]),
      )
      .mockResolvedValueOnce(json([{ code: 'MERCI-AWA', label: 'Merci', type: 'percent', value: 10, endsAt: 'b' }]));
    expect((await promotionsApi.publicCodes()).map((c) => c.code)).toEqual(['NOEL10']);
    expect((await promotionsApi.mine()).map((c) => c.code)).toEqual(['MERCI-AWA']);
    expect(String(fetchMock.mock.calls[1]![0])).toBe('http://api.test/api/v1/loyalty/codes');
  });
});
