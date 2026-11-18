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

const report = {
  id: 'r1',
  listing: { id: 'l1', slug: 'velo-vtt', title: 'Vélo VTT', shopName: 'Cycles Awa' },
  reason: 'scam',
  comment: '',
  status: 'upheld',
  decidedAt: 'x',
  createdAt: 'y',
};

describe('modération de la place de marché', () => {
  it('liste par défaut les annonces qui attendent une décision humaine', async () => {
    fetchMock.mockResolvedValue(json({ items: [], total: 0, page: 1, limit: 20, hasNext: false }));
    await adminMarketplaceBackend.listings('pending_moderation', 1);
    expect(String(fetchMock.mock.calls[0]![0])).toBe(
      'http://api.test/api/v1/staff/listings?limit=20&page=1&status=pending_moderation',
    );
  });

  it('envoie une décision motivée sur une annonce et un classement de signalement', async () => {
    fetchMock.mockResolvedValue(json(report));
    await adminMarketplaceBackend.decideReport('r1', 'upheld');
    expect(call()).toEqual({ route: 'PATCH /staff/listing-reports/r1', body: { status: 'upheld' } });
  });

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

  it('existe avec l’API, réservé à l’administrateur principal ou à un rôle personnalisé du domaine', () => {
    expect(availableWithSource('/admin/place-de-marche')).toBe(true);
    expect(hasRole({ role: 'super_admin' }, item)).toBe(true);
    expect(hasRole({ role: 'orders_manager' }, item)).toBe(false);
    expect(hasRole({ role: 'orders_manager', customPermissions: ['vendeurs:consulter'] }, item)).toBe(true);
  });
});
