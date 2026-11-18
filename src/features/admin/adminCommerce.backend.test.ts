import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ env: { backendUrl: 'http://api.test/api/v1' } }));

const { adminCommerceBackend, promoCodeBody, toPromoCode, toStaffReturn } = await import('./adminCommerce.backend');
const { availableWithSource } = await import('./admin.navigation');

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const calls = () =>
  fetchMock.mock.calls.map(([url, init]) => ({
    route: `${init.method} ${String(url).replace('http://api.test/api/v1', '')}`,
    body: typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : null,
  }));

const staffReturn = {
  id: 'r1',
  orderId: 'o1',
  orderNumber: 'CMD-2026-AB12CD',
  customerId: 'k1',
  status: 'refund_due',
  reason: 'Produit endommagé',
  comment: 'Couture déchirée',
  evidenceUrls: [],
  items: [{ variantId: 'v1', quantity: 2, resaleable: 1, unsellable: 1 }],
  decisionReason: 'Défaut visible sur les photos',
  shippingPaidBy: 'shop',
  shippingReason: 'Défaut de fabrication',
  inspectionNote: 'Une pièce tachée',
  refundAmount: 18_000,
  refundedAmount: 0,
  restockStatus: 'pending',
  reopenRequestedAt: null,
  history: [
    { status: 'pending', note: null, actor: 'customer', at: 'a' },
    { status: 'expected', note: null, actor: 'staff', by: 'Inès Moussavou', at: 'b' },
    { status: 'received', note: null, actor: 'staff', by: 'Inès Moussavou', at: 'c' },
    { status: 'refund_due', note: null, actor: 'staff', by: 'Paul Ndong', at: 'd' },
  ],
  createdAt: 'a',
};

const apiCode = {
  id: 'pc1',
  code: 'LIVRAISON',
  label: 'Livraison offerte',
  type: 'fixed',
  value: 0,
  minAmount: 0,
  freeDelivery: true,
  newCustomersOnly: false,
  tiers: [],
  startsAt: '2026-11-01T00:00:00.000Z',
  endsAt: '2026-12-01T00:00:00.000Z',
  maxUses: null,
  perCustomer: null,
  uses: 4,
  active: true,
  customerId: null,
  productIds: [],
  categoryIds: [],
  createdAt: 'x',
};

describe('retours de l’équipe', () => {
  it('rattache le dossier à sa commande, avec l’inspection et la remise en stock à valider', () => {
    const { orderId, request } = toStaffReturn(staffReturn);
    expect(orderId).toBe('o1');
    expect(request).toMatchObject({
      id: 'r1',
      status: 'refund_due',
      inspection: {
        lines: [{ variantId: 'v1', resaleable: 1, unsellable: 1 }],
        note: 'Une pièce tachée',
        by: 'Paul Ndong',
        at: 'd',
      },
      restock: { status: 'pending' },
    });
  });

  it('présente un retour accepté comme « colis attendu »', () => {
    const { request } = toStaffReturn({
      ...staffReturn,
      status: 'expected',
      items: [{ variantId: 'v1', quantity: 2, resaleable: null, unsellable: null }],
      restockStatus: 'none',
    });
    expect(request.status).toBe('accepted');
    expect(request).not.toHaveProperty('inspection');
    expect(request).not.toHaveProperty('restock');
  });

  it('envoie chaque étape à sa route, avec les motifs exigés', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json({ success: true, data: staffReturn })));
    const { request } = toStaffReturn(staffReturn);
    await adminCommerceBackend.acceptReturn(request, {
      decisionReason: 'Défaut visible',
      shippingPaidBy: 'shop',
      shippingReason: 'Défaut de fabrication',
    });
    await adminCommerceBackend.rejectInspection(request, 'Produit porté');
    await adminCommerceBackend.restockReturn(request);
    expect(calls()).toEqual([
      {
        route: 'POST /staff/returns/r1/decision',
        body: {
          status: 'accepted',
          decisionReason: 'Défaut visible',
          shippingPaidBy: 'shop',
          shippingReason: 'Défaut de fabrication',
        },
      },
      { route: 'POST /staff/returns/r1/inspection', body: { outcome: 'non_conforming', note: 'Produit porté' } },
      { route: 'POST /staff/returns/r1/restock', body: null },
    ]);
  });

  it('montre les commandes sans leurs retours à un membre qui n’y a pas droit', async () => {
    fetchMock.mockResolvedValue(json({ success: false, message: 'Accès refusé.' }, 403));
    expect((await adminCommerceBackend.returnsByOrder()).size).toBe(0);
  });
});

describe('codes promo et écrans', () => {
  it('traduit les limites absentes : sans limite d’utilisation, 0 par client', () => {
    expect(toPromoCode(apiCode)).toMatchObject({ maxUses: null, perCustomer: 0, value: 0, freeDelivery: true });
    expect(toPromoCode({ ...apiCode, customerId: 'k1' }).userId).toBe('k1');
  });

  it('n’envoie que les champs fournis, 0 par client devenant sans limite', () => {
    expect(promoCodeBody({ active: false })).toEqual({ active: false });
    expect(promoCodeBody({ perCustomer: 0, maxUses: null })).toEqual({ perCustomer: null, maxUses: null });
    expect(promoCodeBody({ ...toPromoCode(apiCode), id: 'pc1', uses: 9 })).not.toHaveProperty('uses');
  });

  it('ouvre les retours, les promotions et les clients avec l’API', () => {
    expect(availableWithSource('/admin/retours')).toBe(true);
    expect(availableWithSource('/admin/promotions')).toBe(true);
    expect(availableWithSource('/admin/clients')).toBe(true);
  });
});
