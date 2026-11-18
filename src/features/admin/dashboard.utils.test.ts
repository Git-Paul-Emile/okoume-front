import type { AdminOrder } from './admin.types';
import { buckets, delta, grossMargin, marginAfterDelivery, orderMetrics, ordersToCsv } from './dashboard.utils';

const order = (over: Partial<AdminOrder> = {}): AdminOrder =>
  ({
    id: 'o1',
    number: 'CMD-1',
    status: 'delivered',
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    createdAt: '2026-10-20T10:00:00.000Z',
    customer: { recipient: 'Awa "A" Mba', zoneName: 'Akanda' },
    items: [{ productId: 'p', variantId: 'v', name: 'X', image: '', unitPrice: 10000, unitCost: 7000, quantity: 2 }],
    totals: {
      subtotal: 20000,
      productDiscount: 0,
      codeDiscount: 1000,
      pointsDiscount: 0,
      deliveryFee: 2000,
      deliveryDiscount: 0,
      total: 21000,
    },
    deliveryCost: 2500,
    ...over,
  }) as AdminOrder;

describe('marges', () => {
  it('marge brute : vente moins coût d’achat et remises', () => {
    expect(grossMargin(order())).toBe(5000);
  });

  it('marge après livraison : ajoute les frais facturés, retire le coût réel du livreur', () => {
    expect(marginAfterDelivery(order())).toBe(4500);
  });

  it('coût d’achat inconnu : aucune marge comptée', () => {
    const o = order({ items: [{ ...order().items[0], unitCost: undefined }] });
    expect(grossMargin(o)).toBe(-1000);
  });
});

describe('orderMetrics', () => {
  it('exclut les commandes annulées', () => {
    const m = orderMetrics([order(), order({ id: 'o2', status: 'cancelled' })]);
    expect(m.count).toBe(1);
    expect(m.cancelled).toBe(1);
    expect(m.revenue).toBe(21000);
    expect(m.avgBasket).toBe(21000);
  });
});

describe('delta', () => {
  it('calcule la variation et ignore une base nulle', () => {
    expect(delta(150, 100)).toBe(50);
    expect(delta(10, 0)).toBeNull();
  });
});

describe('buckets', () => {
  const end = new Date(2026, 9, 29);
  it('découpe par jour, par semaine ou par mois', () => {
    expect(buckets('7d', end)).toHaveLength(7);
    expect(buckets('90d', end)).toHaveLength(13);
    const months = buckets('6m', end);
    expect(months).toHaveLength(6);
    expect(months[5].start.getMonth()).toBe(9);
  });
});

describe('ordersToCsv', () => {
  it('échappe les guillemets et utilise le point-virgule', () => {
    const csv = ordersToCsv([order()]).split('\n');
    expect(csv).toHaveLength(2);
    expect(csv[1]).toContain('"Awa ""A"" Mba"');
    expect(csv[1].split(';')).toHaveLength(9);
  });
});
