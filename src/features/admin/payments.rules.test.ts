import type { AdminOrder } from './admin.types';
import { overpayment, paidAmount, receivedAt, refundableAmount, refundError } from './payments.rules';

const AT = '2026-10-28T10:00:00.000Z';
const order = (over: Partial<AdminOrder> = {}): AdminOrder =>
  ({
    id: 'o1',
    number: 'CMD-1',
    status: 'confirmed',
    paymentMethod: 'airtel',
    paymentStatus: 'awaiting_verification',
    totals: {
      subtotal: 20_000,
      productDiscount: 0,
      codeDiscount: 0,
      deliveryFee: 2_000,
      deliveryDiscount: 0,
      total: 22_000,
    },
    items: [
      { variantId: 'v1', unitPrice: 15_000, quantity: 1 },
      { variantId: 'v2', unitPrice: 5_000, quantity: 1 },
    ],
    returnRequest: null,
    ...over,
  }) as unknown as AdminOrder;

describe('montants encaissés', () => {
  const payment = (amount: number) => ({
    id: 'p' + amount,
    kind: 'payment' as const,
    amount,
    method: 'airtel' as const,
    at: AT,
    reference: 'AM' + amount,
    note: '',
    by: 'Nadia',
    recordedAt: AT,
  });

  it('additionne les paiements enregistrés et signale un trop-perçu', () => {
    const o = order({ payments: [payment(20_000), payment(5_000)] });
    expect(paidAmount(o)).toBe(25_000);
    expect(overpayment(o)).toBe(3_000);
  });

  it('prend le total pour une commande payée sans détail, rien pour une commande en attente', () => {
    expect(paidAmount(order({ paymentStatus: 'paid' }))).toBe(22_000);
    expect(paidAmount(order())).toBe(0);
    expect(overpayment(order())).toBe(0);
  });
});

describe('remboursements', () => {
  const paid = order({ paymentStatus: 'paid' });
  const input = {
    amount: 22_000,
    method: 'airtel' as const,
    reference: 'RB-1',
    noReferenceReason: '',
    clientAgreed: false,
  };

  it('exige une référence, sauf exception justifiée', () => {
    expect(refundError(paid, { ...input, reference: '' })).toMatch(/référence/);
    expect(refundError(paid, { ...input, reference: '', noReferenceReason: 'Remise en main propre' })).toBeNull();
  });

  it('un autre moyen exige l’accord du client et le montant ne dépasse pas l’encaissé', () => {
    expect(refundError(paid, { ...input, method: 'cash' })).toMatch(/accord/);
    expect(refundError(paid, { ...input, amount: 30_000 })).toMatch(/dépasse/);
  });

  it('un retour partiel rembourse les articles concernés, remises réparties', () => {
    const o = order({
      paymentStatus: 'refund_due',
      totals: {
        subtotal: 20_000,
        productDiscount: 0,
        codeDiscount: 2_000,
        deliveryFee: 2_000,
        deliveryDiscount: 0,
        total: 20_000,
      } as AdminOrder['totals'],
      returnRequest: { items: [{ variantId: 'v2', quantity: 1 }], status: 'refund_due' } as AdminOrder['returnRequest'],
    });
    expect(refundableAmount(o)).toBe(4_500);
  });
});

describe('receivedAt', () => {
  const created = '2026-11-18T00:38:42.000Z';

  it('retient l’heure de la commande quand la minute saisie est la sienne', () => {
    expect(receivedAt('2026-11-18T00:38:00.000Z', created)).toBe(created);
  });

  it('garde la date saisie sinon', () => {
    expect(receivedAt('2026-11-18T00:40:00.000Z', created)).toBe('2026-11-18T00:40:00.000Z');
    expect(receivedAt('2026-11-18T00:30:00.000Z', created)).toBe('2026-11-18T00:30:00.000Z');
  });
});
