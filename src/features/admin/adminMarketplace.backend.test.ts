import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ env: { backendUrl: 'http://api.test/api/v1' } }));

const { adminMarketplaceBackend } = await import('./adminMarketplace.backend');
const { availableWithSource, hasRole, adminNavigation } = await import('./admin.navigation');

const json = (body: unknown) =>
  new Response(JSON.stringify({ success: true, data: body }), { headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const call = () => ({
  route: `${fetchMock.mock.calls[0]![1].method} ${String(fetchMock.mock.calls[0]![0]).replace('http://api.test/api/v1', '')}`,
  body: JSON.parse(String(fetchMock.mock.calls[0]![1].body ?? 'null')) as unknown,
});

describe('administration des boutiques de vendeurs', () => {
  it('refuse un paiement avec son motif, valide sans motif', async () => {
    fetchMock.mockResolvedValue(
      json({
        id: 'p1',
        shop: { id: 's1', name: 'Cycles Awa' },
        plan: { name: 'Mensuel' },
        amount: 5_000,
        method: 'moov',
        reference: 'MV1',
        status: 'refused',
        decisionReason: 'Référence introuvable',
        periodStart: null,
        periodEnd: null,
        createdAt: 'x',
      }),
    );
    await adminMarketplaceBackend.decideShopPayment('p1', { status: 'refused', reason: 'Référence introuvable' });
    expect(call()).toEqual({
      route: 'PATCH /staff/shop-payments/p1',
      body: { status: 'refused', reason: 'Référence introuvable' },
    });
  });
});

describe('accès à l’écran de la place de marché', () => {
  const item = adminNavigation.flatMap((g) => g.items).find((i) => i.to === '/admin/place-de-marche')!;

  it('existe avec l’API et est accessible au rôle unique administrateur', () => {
    expect(availableWithSource('/admin/place-de-marche')).toBe(true);
    expect(hasRole({ role: 'super_admin' }, item)).toBe(true);
  });
});
