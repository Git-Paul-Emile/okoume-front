import type { AdminOrder } from './admin.types';
import { bulkAdvancePlan } from './orders.bulk';
import { stampHistory } from './orders.actions';

const NOW = '2026-11-03T10:00:00.000Z';
const order = (over: Partial<AdminOrder>) =>
  ({
    id: over.number,
    status: 'confirmed',
    paymentMethod: 'cash',
    paymentStatus: 'awaiting_payment',
    createdAt: '2026-11-02T10:00:00Z',
    customer: { phone: `+241 07 00 00 ${over.number?.slice(-2)}`, email: `${over.number}@x.ga` },
    totals: { subtotal: 10_000, total: 10_000 },
    items: [{ name: 'Sac', quantity: 1 }],
    history: [{ status: 'confirmed', at: '2026-11-02T10:00:00Z' }],
    pointsUsed: 0,
    promoCode: null,
    ...over,
  }) as unknown as AdminOrder;

describe('actions groupées sur les commandes', () => {
  it('fait avancer ce qui peut l’être et explique le reste', () => {
    const list = [
      order({ number: 'C-01' }),
      // Mobile Money non payé : se prépare comme les espèces, tout se paie à la livraison
      order({ number: 'C-02', paymentMethod: 'airtel' }),
      order({ number: 'C-03', status: 'ready' }),
      order({ number: 'C-04', status: 'delivered' }),
    ];
    const plan = bulkAdvancePlan(list, 'Nadia', NOW);
    expect(plan.ready.map((r) => r.order.number)).toEqual(['C-01', 'C-02']);
    expect(plan.ready[0].patch.history?.at(-1)).toMatchObject({ status: 'preparing', from: 'confirmed', by: 'Nadia' });
    expect(plan.skipped.map((s) => s.number)).toEqual(['C-03', 'C-04']);
  });

  it('n’altère jamais l’historique existant', () => {
    const o = order({ number: 'C-05' });
    expect(stampHistory(o, { paymentStatus: 'paid' }, 'Nadia')).toEqual({ paymentStatus: 'paid' });
    const p = stampHistory(o, { history: [...o.history, { status: 'preparing', at: NOW }] }, 'Nadia');
    expect(p.history?.[0]).toEqual(o.history[0]);
  });
});
