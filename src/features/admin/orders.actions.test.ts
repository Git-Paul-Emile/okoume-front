import type { AdminOrder } from './admin.types';
import {
  advancePatch,
  canDecideReturn,
  canReopen,
  canRestock,
  canWriteOff,
  inspectionPatch,
  nextStatus,
} from './orders.actions';

const order = (over: Partial<AdminOrder> = {}): AdminOrder =>
  ({
    id: 'o1',
    status: 'shipping',
    paymentMethod: 'cash',
    paymentStatus: 'awaiting_payment',
    history: [{ status: 'confirmed', at: '2026-10-01T00:00:00.000Z' }],
    cancellationRequest: null,
    returnRequest: null,
    ...over,
  }) as AdminOrder;

const NOW = '2026-10-28T10:00:00.000Z';

describe('avancement des commandes', () => {
  it('suit le cycle et s’arrête à la livraison', () => {
    expect(nextStatus('confirmed')).toBe('preparing');
    expect(nextStatus('delivered')).toBeNull();
    expect(nextStatus('cancelled')).toBeNull();
  });

  it('une livraison en espèces attend la confirmation de l’encaissement', () => {
    const patch = advancePatch(order(), NOW);
    expect(patch.status).toBe('delivered');
    expect(patch.paymentStatus).toBeUndefined();
    expect(patch.history?.at(-1)).toEqual({ status: 'delivered', at: NOW });
  });

  it('prépare une commande Mobile Money sans attendre de paiement : tout se paie à la livraison', () => {
    const o = order({ status: 'confirmed', paymentMethod: 'moov', paymentStatus: 'awaiting_payment' });
    expect(advancePatch(o, NOW).status).toBe('preparing');
    expect(advancePatch({ ...o, paymentMethod: 'cash', paymentStatus: 'awaiting_payment' }, NOW).status).toBe(
      'preparing',
    );
  });

  it('un paiement Mobile Money n’est pas modifié à la livraison', () => {
    expect(advancePatch(order({ paymentMethod: 'airtel', paymentStatus: 'paid' }), NOW).paymentStatus).toBeUndefined();
  });
});

describe('retours', () => {
  it('l’inspection classe chaque article avant le remboursement', () => {
    const received = order({
      status: 'delivered',
      paymentStatus: 'paid',
      returnRequest: {
        items: [{ variantId: 'v1', quantity: 2 }],
        reason: 'Défectueux',
        comment: '',
        status: 'received',
        createdAt: NOW,
      },
    });
    expect(() => inspectionPatch(received, [{ variantId: 'v1', resaleable: 1, unsellable: 0 }], '', 'Nadia')).toThrow(
      /Classez/,
    );
    const inspected = {
      ...received,
      ...inspectionPatch(received, [{ variantId: 'v1', resaleable: 1, unsellable: 1 }], 'Écran fissuré', 'Nadia'),
    } as AdminOrder;
    expect(inspected.returnRequest?.status).toBe('refund_due');
    expect(inspected.returnRequest?.restock).toEqual({ status: 'pending' });
    expect(inspected.paymentStatus).toBe('refund_due');
  });

  it('réserve chaque décision au bon rôle', () => {
    expect(canRestock('stock_manager')).toBe(true);
    expect(canRestock('orders_manager')).toBe(false);
    expect(canWriteOff('stock_manager')).toBe(false);
    expect(canDecideReturn('super_admin')).toBe(true);
    expect(canDecideReturn('orders_manager')).toBe(false);
    expect(canReopen('orders_manager')).toBe(true);
    expect(canReopen('stock_manager')).toBe(false);
  });
});
