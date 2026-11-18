import type { Order } from '@/features/orders/orders.types';
import { deletionBlockers, isOverdue } from './privacy.rules';
import type { PrivacyRequest } from './privacy.types';

const order = (over: Partial<Order> = {}) =>
  ({
    number: 'CMD-1',
    status: 'delivered',
    paymentStatus: 'paid',
    totals: { total: 10_000 },
    items: [],
    customer: {
      recipient: 'Awa Mba',
      phone: '+241',
      email: 'awa@x.ga',
      zoneId: '1',
      zoneName: 'Akanda',
      landmark: 'Pharmacie',
      instructions: '',
    },
    ...over,
  }) as unknown as Order;

describe('données personnelles', () => {
  it('signale une réponse en retard', () => {
    const r = { status: 'received', dueAt: '2026-10-31T00:00:00.000Z' } as PrivacyRequest;
    expect(isOverdue(r, new Date('2026-11-02').getTime())).toBe(true);
    expect(isOverdue({ ...r, status: 'completed' }, new Date('2026-11-02').getTime())).toBe(false);
  });

  it('bloque la suppression tant qu’une commande est en cours', () => {
    expect(deletionBlockers([order(), order({ status: 'shipping' })])).toHaveLength(1);
    expect(deletionBlockers([order({ status: 'cancelled', paymentStatus: 'refund_due' })])).toHaveLength(1);
  });
});
