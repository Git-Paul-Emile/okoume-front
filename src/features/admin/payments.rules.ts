import type { PaymentMethod } from '@/features/orders/orders.types';
import type { AdminOrder } from './admin.types';

/** Montant réellement encaissé (paiements enregistrés ; anciennes commandes payées sans détail : le total). */
export function paidAmount(order: AdminOrder) {
  const records = (order.payments ?? []).filter((p) => p.kind === 'payment');
  if (!records.length)
    return order.paymentStatus === 'paid' || order.paymentStatus === 'refund_due' || order.paymentStatus === 'refunded'
      ? order.totals.total
      : 0;
  return records.reduce((s, p) => s + p.amount, 0);
}

export const refundedAmount = (order: AdminOrder) =>
  (order.payments ?? []).filter((p) => p.kind === 'refund').reduce((s, p) => s + p.amount, 0);

export const remainingAmount = (order: AdminOrder) => Math.max(0, order.totals.total - paidAmount(order));

/** Trop-perçu à traiter manuellement (8.4). */
export const overpayment = (order: AdminOrder) => Math.max(0, paidAmount(order) - order.totals.total);

export interface PaymentInput {
  amount: number;
  at: string;
  reference: string;
}

/**
 * Date de réception envoyée à l'API. Le champ est précis à la minute : un paiement saisi dans la minute de la
 * commande paraîtrait antérieur à celle-ci (01:38 avant 01:38:42). Dans ce cas seulement, on retient l'heure
 * exacte de la commande.
 */
export function receivedAt(local: string, orderCreatedAt: string) {
  const picked = new Date(local);
  const created = new Date(orderCreatedAt);
  const sameMinute = picked < created && created.getTime() - picked.getTime() < 60_000;
  return (sameMinute ? created : picked).toISOString();
}

export function paymentError(order: AdminOrder, input: PaymentInput): string | null {
  if (!Number.isInteger(input.amount) || input.amount <= 0) return 'Indiquez le montant reçu en FCFA, sans décimales.';
  if (!input.at) return 'Indiquez la date de réception.';
  if (new Date(input.at).getTime() > Date.now() + 60_000) return 'La date de réception ne peut pas être dans le futur.';
  if (new Date(input.at) < new Date(order.createdAt)) return 'La date de réception précède la commande.';
  if (order.paymentMethod !== 'cash' && input.reference.trim().length < 3)
    return 'Indiquez la référence de la transaction Mobile Money.';
  return null;
}

/** Montant à rembourser : articles retournés (montant réellement payé) ou somme encaissée pour une annulation. */
export function refundableAmount(order: AdminOrder) {
  const request = order.returnRequest;
  if (request && ['refund_due', 'received', 'inspecting'].includes(request.status)) {
    const t = order.totals;
    const goods = t.subtotal;
    // Les remises sont réparties au prorata des articles ; la livraison est examinée séparément
    const discounts = t.codeDiscount + t.pointsDiscount;
    const items = request.items.reduce(
      (s, r) => s + (order.items.find((i) => i.variantId === r.variantId)?.unitPrice ?? 0) * r.quantity,
      0,
    );
    return Math.max(0, Math.round(items - (goods > 0 ? (discounts * items) / goods : 0)));
  }
  return Math.max(0, paidAmount(order) - refundedAmount(order));
}

export interface RefundInput {
  amount: number;
  method: PaymentMethod;
  reference: string;
  /** Exception justifiée quand aucune référence n'existe (14.4). */
  noReferenceReason: string;
  clientAgreed: boolean;
}

export function refundError(order: AdminOrder, input: RefundInput): string | null {
  if (!Number.isInteger(input.amount) || input.amount <= 0) return 'Indiquez le montant remboursé en FCFA.';
  if (input.amount > paidAmount(order) - refundedAmount(order))
    return 'Le remboursement dépasse le montant encaissé pour cette commande.';
  if (input.reference.trim().length < 3 && input.noReferenceReason.trim().length < 5)
    return 'La référence du remboursement est obligatoire, sauf exception justifiée.';
  if (input.method !== order.paymentMethod && !input.clientAgreed)
    return 'Un autre moyen que le paiement initial exige l’accord du client.';
  return null;
}
