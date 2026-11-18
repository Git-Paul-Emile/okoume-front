import type { AdminOrder, AdminProduct } from './admin.types';
import {
  activeCustomers,
  deliveryIssues,
  marginByProduct,
  newProducts,
  productInterest,
  repeatPurchase,
} from './stats.rules';

const start = new Date('2026-10-01T00:00:00Z');
const end = new Date('2026-11-01T00:00:00Z');
const prevStart = new Date('2026-09-01T00:00:00Z');

const order = (over: Partial<AdminOrder>) =>
  ({
    id: 'o',
    number: 'CMD',
    userId: 'u1',
    status: 'delivered',
    createdAt: '2026-10-10T10:00:00Z',
    customer: { recipient: 'Awa', phone: '+241 07 00 00 01', zoneName: 'Akanda' },
    totals: { total: 10_000 },
    items: [
      {
        productId: 'p1',
        variantId: 'v1',
        name: 'Sac',
        variantLabel: 'Noir',
        unitPrice: 10_000,
        unitCost: 6_000,
        quantity: 1,
      },
    ],
    history: [],
    ...over,
  }) as unknown as AdminOrder;

const products = [
  { id: 'p1', name: 'Sac', createdAt: '2026-10-05T00:00:00Z', status: 'published' },
  { id: 'p2', name: 'Robe', createdAt: '2026-08-05T00:00:00Z', status: 'published' },
] as unknown as AdminProduct[];

describe('indicateurs complémentaires', () => {
  it('classe les produits consultés avec leur conversion', () => {
    const views = [
      { id: '1', productId: 'p1', kind: 'view' as const, at: '2026-10-02T00:00:00Z' },
      { id: '2', productId: 'p1', kind: 'view' as const, at: '2026-10-03T00:00:00Z' },
      { id: '3', productId: 'p2', kind: 'click' as const, at: '2026-10-03T00:00:00Z' },
    ];
    const rows = productInterest(views, [order({})], products, start, end);
    expect(rows[0]).toMatchObject({ id: 'p1', views: 2, units: 1, conversion: 0.5 });
    expect(rows[1]).toMatchObject({ id: 'p2', clicks: 1 });
  });

  it('liste les nouveautés et les clients actifs', () => {
    expect(newProducts(products, [order({})], start, end).map((p) => p.id)).toEqual(['p1']);
    const top = activeCustomers([order({}), order({ id: 'o2' }), order({ id: 'o3', userId: null })], start, end);
    expect(top[0]).toMatchObject({ orders: 2, revenue: 20_000 });
  });

  it('mesure le réachat et son délai moyen', () => {
    const r = repeatPurchase([
      order({ createdAt: '2026-10-01T00:00:00Z' }),
      order({ id: 'o2', createdAt: '2026-10-11T00:00:00Z' }),
      order({ id: 'o3', userId: 'u2' }),
    ]);
    expect(r).toMatchObject({ customers: 2, repeatRate: 0.5, averageGapDays: 10 });
  });

  it('repère les retards et les échecs de livraison', () => {
    const late = order({
      status: 'shipping',
      history: [{ status: 'courier_assigned', at: '2026-10-20T08:00:00Z' }] as AdminOrder['history'],
      deliveryFailures: [{ at: '2026-10-21T08:00:00Z', reason: 'Client absent', decision: 'retry', by: 'Nadia' }],
    });
    const r = deliveryIssues([late], start, end, new Date('2026-10-25T08:00:00Z').getTime());
    expect(r.late).toHaveLength(1);
    expect(r.failureReasons).toEqual([['Client absent', 1]]);
  });

  it('compare la marge par variante à la période précédente', () => {
    const rows = marginByProduct(
      [
        order({}),
        order({
          id: 'old',
          createdAt: '2026-09-10T00:00:00Z',
          items: [
            {
              productId: 'p1',
              variantId: 'v1',
              name: 'Sac',
              variantLabel: 'Noir',
              unitPrice: 10_000,
              unitCost: 8_000,
              quantity: 1,
            },
          ] as AdminOrder['items'],
        }),
      ],
      start,
      end,
      prevStart,
    );
    expect(rows[0]).toMatchObject({ margin: 4_000, rate: 0.4, prevRate: 0.2 });
    expect(Math.round(rows[0].change!)).toBe(20);
  });
});
