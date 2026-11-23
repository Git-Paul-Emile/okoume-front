import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ env: { backendUrl: 'http://api.test/api/v1' } }));

const { settingsApi } = await import('./settings.api');
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
  maxDiscountRate: 0.5,
  mobileMoney: [
    { method: 'airtel', label: 'Airtel Money', number: '+241 07', beneficiary: 'OKOZA', instructions: '*150#' },
  ],
  mobileMoneyExpiryHours: 24,
  returnWindowDays: 14,
  reopenWindowDays: 14,
  deliveryVatRate: 18,
  maxAddresses: 5,
  supportSla: { high: 4, normal: 24 },
  legal: { companyName: 'OKOZA SARL', nif: '', rccm: '', vatNote: '' },
  support: { whatsapp: '24107', phone: '+241 07', email: 'contact@okoza.ga', hours: 'Lun-Sam', address: 'Libreville' },
  social: { facebook: 'https://facebook.com/okoza' },
};

describe('données publiques lues sur l’API', () => {
  it('lit les réglages publics, dont le compte Mobile Money où payer', async () => {
    fetchMock.mockResolvedValue(json(settings));
    const result = await settingsApi.get();
    expect(String(fetchMock.mock.calls[0]![0])).toBe('http://api.test/api/v1/settings');
    expect(result.mobileMoney[0]?.beneficiary).toBe('OKOZA');
    expect(result).not.toHaveProperty('reviewAmount');
  });

  it('refuse des réglages incomplets plutôt que d’afficher un numéro de paiement faux', async () => {
    fetchMock.mockResolvedValue(json({ ...settings, mobileMoney: [{ method: 'orange' }] }));
    await expect(settingsApi.get()).rejects.toThrow();
  });

  it('lit les codes promo publics', async () => {
    fetchMock.mockResolvedValueOnce(
      json([
        {
          id: 'p1',
          code: 'NOEL10',
          label: 'Noël',
          type: 'percent',
          value: 10,
          minAmount: 0,
          freeDelivery: false,
          endsAt: 'b',
        },
      ]),
    );
    expect((await promotionsApi.publicCodes()).map((c) => c.code)).toEqual(['NOEL10']);
    expect(String(fetchMock.mock.calls[0]![0])).toBe('http://api.test/api/v1/promo-codes');
  });
});
