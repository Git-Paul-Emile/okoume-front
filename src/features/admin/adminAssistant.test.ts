import type { AdminOrder, AdminProduct } from './admin.types';
import { anomalies, answer, dailySummary, proposals, type AssistantContext } from './adminAssistant';

const END = new Date('2026-10-29T00:00:00');
const day = (n: number) => new Date(END.getTime() - n * 86_400_000 + 10 * 3_600_000).toISOString();

const order = (id: string, at: string, over: Partial<AdminOrder> = {}): AdminOrder =>
  ({
    id,
    number: `CMD-${id}`,
    createdAt: at,
    status: 'delivered',
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    customer: { recipient: 'Awa', zoneName: 'Akanda' },
    items: [
      { productId: 'p1', variantId: 'v1', name: 'Bol', image: '', unitPrice: 10000, unitCost: 6000, quantity: 1 },
    ],
    totals: {
      subtotal: 10000,
      productDiscount: 0,
      codeDiscount: 0,
      pointsDiscount: 0,
      deliveryFee: 2000,
      deliveryDiscount: 0,
      total: 12000,
    },
    deliveryCost: 2000,
    history: [],
    ...over,
  }) as AdminOrder;

const product = (id: string, over: Partial<AdminProduct> = {}): AdminProduct =>
  ({
    id,
    name: `Produit ${id}`,
    status: 'published',
    featured: false,
    promotion: null,
    createdAt: day(100),
    variants: [{ id: `v-${id}`, label: 'Standard', stock: 20, reserved: 0, lowStockThreshold: 3, price: 10000 }],
    ...over,
  }) as AdminProduct;

const ctx = (over: Partial<AssistantContext> = {}): AssistantContext => ({
  orders: [order('1', day(1)), order('2', day(1)), order('3', day(8))],
  products: [product('p1'), product('p2')],
  stats: [],
  end: END,
  ...over,
});

describe('résumé quotidien', () => {
  it('compare la veille au même jour de la semaine précédente', () => {
    const s = dailySummary(ctx());
    expect(s.lines[0]).toMatchObject({ label: 'Chiffre d’affaires', change: 100 });
    expect(s.lines[1].value).toBe('2');
    expect(s.insufficient).toBe(false);
  });

  it('signale des données insuffisantes', () => {
    expect(dailySummary(ctx({ orders: [] })).insufficient).toBe(true);
  });
});

describe('anomalies', () => {
  it('repère les paiements Mobile Money en attente depuis plus de 24 h', () => {
    const late = order('9', day(3), {
      paymentMethod: 'airtel',
      paymentStatus: 'awaiting_verification',
      status: 'confirmed',
    });
    const found = anomalies(ctx({ orders: [late] }));
    expect(found.find((f) => f.id === 'payments')?.level).toBe('critical');
  });

  it('ne signale rien sans motif', () => {
    expect(anomalies(ctx())).toEqual([]);
  });
});

describe('propositions', () => {
  it('retire de l’accueil un produit mis en avant mais en rupture', () => {
    const out = proposals(
      ctx({
        products: [
          product('p9', { featured: true, variants: [{ id: 'v', stock: 0, reserved: 0 }] as AdminProduct['variants'] }),
        ],
      }),
    );
    expect(out[0].changes[0]).toMatchObject({
      productId: 'p9',
      before: { featured: true },
      after: { featured: false },
    });
  });

});

describe('questions', () => {
  it('répond sur les ventes de la semaine avec les chiffres', () => {
    expect(answer('Combien avons-nous vendu cette semaine ?', ctx()).text).toMatch(/2 commandes/);
  });

  it('répond sur la marge sans la présenter comme un bénéfice', () => {
    const a = answer('Quelle est notre marge ?', ctx());
    expect(a.bullets?.join(' ')).toMatch(/pas un bénéfice net/);
  });

  it('propose de l’aide si la question n’est pas comprise', () => {
    expect(answer('bonjour', ctx()).bullets?.length).toBe(3);
  });
});
