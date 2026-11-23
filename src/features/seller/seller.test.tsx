import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ env: { backendUrl: 'http://api.test/api/v1' } }));

const { sellerBackend } = await import('./seller.backend');
const { productPhotoUploader } = await import('./sellerProducts.backend');

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const call = (i = 0) => ({
  route: `${fetchMock.mock.calls[i]![1].method} ${String(fetchMock.mock.calls[i]![0]).replace('http://api.test/api/v1', '')}`,
  body:
    typeof fetchMock.mock.calls[i]![1].body === 'string'
      ? (JSON.parse(fetchMock.mock.calls[i]![1].body) as unknown)
      : null,
});

describe('boutique du vendeur', () => {
  it('considère un compte sans boutique (404) comme une boutique à ouvrir', async () => {
    fetchMock.mockResolvedValue(json({ success: false, message: 'Aucune boutique.' }, 404));
    expect(await sellerBackend.shop()).toBeNull();
  });

  it('déclare un paiement Mobile Money avec l’offre, le moyen, la référence et le montant', async () => {
    fetchMock.mockResolvedValue(
      json(
        {
          success: true,
          data: {
            id: 'p1',
            shop: { id: 's1', name: 'Cycles Awa' },
            plan: { name: 'Mensuel' },
            amount: 5_000,
            method: 'airtel',
            reference: 'MP2611',
            status: 'pending',
            decisionReason: null,
            decidedAt: null,
            periodStart: null,
            periodEnd: null,
            createdAt: 'x',
          },
        },
        201,
      ),
    );
    await sellerBackend.declareShopPayment({ planId: 'pl1', method: 'airtel', reference: 'MP2611', amount: 5_000 });
    expect(call()).toEqual({
      route: 'POST /seller/shop/payments',
      body: { planId: 'pl1', method: 'airtel', reference: 'MP2611', amount: 5_000 },
    });
  });
});

describe('photos des produits', () => {
  it('envoie une photo de produit avec l’autorisation signée pour la boutique', async () => {
    fetchMock
      .mockResolvedValueOnce(
        json(
          {
            success: true,
            data: {
              uploadUrl: 'https://api.cloudinary.com/v1_1/okoza/image/upload',
              fields: { signature: 'sig' },
              expiresAt: 'z',
            },
          },
          201,
        ),
      )
      .mockResolvedValueOnce(json({ secure_url: 'https://res.cloudinary.com/okoza/image/upload/l.webp' }));
    expect(await productPhotoUploader(new Blob(['x'], { type: 'image/webp' }))).toBe(
      'https://res.cloudinary.com/okoza/image/upload/l.webp',
    );
    expect(call().route).toBe('POST /seller/products/photo-uploads');
  });
});
