import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ env: { backendUrl: 'http://api.test/api/v1' } }));

const { ordersBackend, quote, toInvoiceDocument, toOrder, toReturnRequest, toTrackedOrder } =
  await import('./orders.backend');
const { stockConflictMessages } = await import('@/features/checkout/checkout.api');
const { ApiError } = await import('@/api/ApiError');

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const item = {
  productId: 'p1',
  variantId: 'v1',
  name: 'Robe wax',
  variantLabel: 'Taille M',
  image: 'https://res.cloudinary.com/okoume/a.webp',
  unitPrice: 18_000,
  originalPrice: 20_000,
  vatRate: 18,
  quantity: 1,
};
const totals = {
  subtotal: 18_000,
  productDiscount: 2_000,
  codeDiscount: 0,
  pointsDiscount: 0,
  deliveryFee: 2_000,
  deliveryDiscount: 0,
  total: 20_000,
};
const orderDto = {
  id: 'o1',
  number: 'CMD-2026-AB12CD',
  trackingCode: 'XY34ZT',
  items: [item],
  customer: {
    recipient: 'Awa Ndong',
    phone: '077123456',
    email: 'awa@example.ga',
    zoneId: 'z1',
    zoneName: 'Glass',
    landmark: 'Face à la pharmacie',
    instructions: 'Portail vert',
  },
  totals,
  promoCode: null,
  pointsUsed: 0,
  paymentMethod: 'cash',
  paymentStatus: 'awaiting_payment',
  status: 'delivered',
  history: [{ status: 'confirmed', at: '2026-11-03T08:00:00.000Z' }],
  cancellationRequest: null,
  deliveryDispute: {
    reason: 'Colis jamais reçu, livreur injoignable',
    status: 'open',
    resolution: null,
    createdAt: 'y',
  },
  createdAt: '2026-11-03T08:00:00.000Z',
};

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const sentBody = () => JSON.parse(String(fetchMock.mock.calls[0]![1].body));

describe('commandes de l’API dans le format du front', () => {
  it('garde le contenu, les consignes, les frais proposés et la réclamation', () => {
    expect(toOrder(orderDto, 'c1')).toMatchObject({
      id: 'o1',
      userId: 'c1',
      customer: { instructions: 'Portail vert' },
      returnRequest: null,
      deliveryDispute: { status: 'open', resolution: null },
    });
  });

  it('ne fabrique pas de coordonnées pour une commande suivie sans compte', () => {
    const { number, status, history, items, totals: t, paymentMethod, paymentStatus, createdAt } = orderDto;
    const tracked = toTrackedOrder({
      number,
      status,
      history,
      items,
      totals: t,
      paymentMethod,
      paymentStatus,
      createdAt,
      zoneName: 'Glass',
    });
    expect(tracked.customer).toEqual({
      recipient: '',
      phone: '',
      email: '',
      zoneId: '',
      zoneName: 'Glass',
      landmark: '',
      instructions: '',
    });
    expect(tracked.userId).toBeNull();
  });

  it('refuse une commande au statut inconnu', () => {
    expect(() => toOrder({ ...orderDto, status: 'perdue' }, null)).toThrow();
  });
});

describe('devis et passage de commande', () => {
  it('demande un devis sans zone ni code quand ils ne sont pas choisis', async () => {
    fetchMock.mockResolvedValue(
      json({
        success: true,
        data: {
          zone: null,
          totals: {
            ...totals,
            deliveryFee: 0,
            total: 18_000,
            baseSubtotal: 20_000,
            pointsUsed: 0,
            pointsEarned: 18,
            codeError: null,
            pointsError: null,
          },
        },
      }),
    );
    const result = await quote({ lines: [{ variantId: 'v1', quantity: 2 }], zoneId: null, promoCode: null });
    expect(sentBody()).toEqual({ lines: [{ variantId: 'v1', quantity: 2 }] });
    expect(result).toMatchObject({ total: 18_000, itemCount: 2, codeError: null });
  });

  it('envoie seulement articles, livraison, paiement et code : jamais de prix', async () => {
    fetchMock.mockResolvedValue(json({ success: true, data: orderDto }, 201));
    await ordersBackend.place(
      {
        idempotencyKey: '7b0c1d2e-3f40-4a5b-8c6d-7e8f9a0b1c2d',
        lines: [{ variantId: 'v1', quantity: 1 }],
        delivery: {
          recipient: 'Awa Ndong',
          phone: '077123456',
          email: 'awa@example.ga',
          zoneId: 'z1',
          landmark: 'Face à la pharmacie',
          instructions: 'Portail vert',
        },
        paymentMethod: 'cash',
        promoCode: null,
      },
      null,
    );
    const body = sentBody();
    expect(body).not.toHaveProperty('promoCode');
    expect(body).not.toHaveProperty('totals');
    expect(body.lines).toEqual([{ variantId: 'v1', quantity: 1 }]);
    expect(body.delivery.instructions).toBe('Portail vert');
  });

  it('cherche une commande du compte par numéro, null si elle n’y est pas', async () => {
    fetchMock.mockResolvedValue(
      json({ success: true, data: { items: [], total: 0, page: 1, limit: 1, hasNext: false } }),
    );
    expect(await ordersBackend.byNumber('CMD-2026-AB12CD', 'c1')).toBeNull();
    expect(fetchMock.mock.calls[0]![0]).toBe('http://api.test/api/v1/orders?number=CMD-2026-AB12CD&page=1&limit=1');
  });
});

describe('stock insuffisant', () => {
  it('affiche le message de l’API pour chaque article', () => {
    const fromApi = new ApiError('Stock insuffisant pour certains articles.', 409, {
      code: 'OUT_OF_STOCK',
      requestId: null,
      errors: [{ field: 'lines.v1', message: 'Robe wax (Taille M) : 1 disponible, 2 demandés.' }],
    });
    expect(stockConflictMessages(fromApi)).toEqual(['Robe wax (Taille M) : 1 disponible, 2 demandés.']);
    expect(stockConflictMessages(new ApiError('Autre', 422))).toBeNull();
  });
});

const returnDto = {
  id: 'r1',
  orderId: 'o1',
  orderNumber: 'CMD-2026-AB12CD',
  status: 'refused',
  reason: 'Produit endommagé',
  comment: 'Couture déchirée',
  items: [{ variantId: 'v1', quantity: 1 }],
  decisionReason: 'Photos illisibles',
  shippingPaidBy: null,
  refundAmount: 18_000,
  refundedAmount: 0,
  history: [{ status: 'pending', note: null, at: 'a' }],
  createdAt: '2026-11-05T10:00:00.000Z',
};

describe('retours, paiement et factures sur l’API', () => {
  it('traduit le dossier de retour et le joint à la commande lue par son numéro', async () => {
    expect(toReturnRequest(returnDto)).toEqual({
      items: [{ variantId: 'v1', quantity: 1 }],
      reason: 'Produit endommagé',
      comment: 'Couture déchirée',
      status: 'refused',
      createdAt: '2026-11-05T10:00:00.000Z',
      decisionReason: 'Photos illisibles',
    });
    fetchMock
      .mockResolvedValueOnce(
        json({ success: true, data: { items: [orderDto], total: 1, page: 1, limit: 1, hasNext: false } }),
      )
      .mockResolvedValueOnce(json({ success: true, data: returnDto }));
    const order = await ordersBackend.byNumber('CMD-2026-AB12CD', 'c1');
    expect(order?.returnRequest?.status).toBe('refused');
    expect(fetchMock.mock.calls[1]![0]).toBe('http://api.test/api/v1/orders/o1/return');
  });

  it('lit une commande sans dossier de retour (404) comme une commande sans retour', async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({ success: true, data: { items: [orderDto], total: 1, page: 1, limit: 1, hasNext: false } }),
      )
      .mockResolvedValueOnce(json({ success: false, message: 'Aucune demande de retour pour cette commande.' }, 404));
    expect((await ordersBackend.byNumber('CMD-2026-AB12CD', 'c1'))?.returnRequest).toBeNull();
  });

  it('envoie les photos avec la demande de retour', async () => {
    fetchMock.mockResolvedValue(json({ success: true, data: { ...returnDto, status: 'pending' } }, 201));
    const order = toOrder(orderDto, 'c1');
    const updated = await ordersBackend.requestReturn(order, {
      items: [{ variantId: 'v1', quantity: 1 }],
      reason: 'Produit endommagé',
      comment: 'Couture déchirée',
      evidenceUrls: ['https://res.cloudinary.com/okoume/image/upload/r.webp'],
    });
    expect(sentBody().evidenceUrls).toEqual(['https://res.cloudinary.com/okoume/image/upload/r.webp']);
    expect(updated.returnRequest?.status).toBe('pending');
  });

  it('traduit une facture de l’API dans la forme du front', () => {
    const doc = toInvoiceDocument(
      {
        id: 'i1',
        number: 'FAC-2026-000001',
        type: 'invoice',
        orderId: 'o1',
        orderNumber: 'CMD-2026-AB12CD',
        issuedAt: '2026-11-06T09:00:00.000Z',
        relatedNumber: null,
        reason: null,
        customerName: 'Awa Ndong',
        customerPhone: '077123456',
        customerEmail: 'awa@example.ga',
        address: 'Glass, Face à la pharmacie',
        paymentMethod: 'cash',
        lines: [{ label: 'Robe wax', detail: 'Taille M', quantity: 1, unit: 18_000, vatRate: 18, ttc: 18_000 }],
        vatBreakdown: [{ rate: 18, ht: 15_254, vat: 2_746, ttc: 18_000 }],
        totals: { ht: 15_254, vat: 2_746, ttc: 18_000 },
      },
      'c1',
    );
    expect(doc).toMatchObject({
      userId: 'c1',
      customer: { name: 'Awa Ndong', address: 'Glass, Face à la pharmacie' },
      totals: { ttc: 18_000 },
    });
    expect(doc).not.toHaveProperty('relatedNumber');
  });
});
