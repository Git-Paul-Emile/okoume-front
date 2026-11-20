import { z } from 'zod';
import { backend, getAll } from '@/api/backend';
import type { Id } from '@/api/types';
import { toOrder } from '@/features/orders/orders.backend';
import type { AdminOrder, Courier, PaymentRecord } from './admin.types';

/**
 * Commandes, livreurs et paiements de l'équipe sur l'API (api/src/features/staff-*). L'API applique chaque
 * changement comme une action (transition, décision, encaissement) dans une transaction, avec son auteur :
 * le front n'écrit jamais l'état d'une commande lui-même.
 */

const staffExtras = z.object({
  customerId: z.string().nullable(),
  courierId: z.string().nullable(),
  deliveryCost: z.number().nullable(),
  history: z.array(z.object({ by: z.string().optional() })),
  review: z
    .object({
      status: z.enum(['pending', 'cleared']),
      reasons: z.array(z.string()),
      note: z.string().nullable(),
      by: z.string().nullable(),
      at: z.string().nullable(),
    })
    .nullable(),
});

/** Commande de l'équipe dans la forme du back-office ; le nom du livreur vient du répertoire. */
export function toAdminOrder(raw: unknown, couriers: readonly Courier[] = []): AdminOrder {
  const order = toOrder(raw, null);
  const extras = staffExtras.parse(raw);
  const courier = couriers.find((c) => c.id === extras.courierId);
  return {
    ...order,
    userId: extras.customerId,
    history: order.history.map((step, i) => {
      const by = extras.history[i]?.by;
      return by ? { ...step, by } : step;
    }),
    ...(extras.courierId ? { courierId: extras.courierId } : {}),
    ...(courier ? { courier: `${courier.firstName} ${courier.lastName}` } : {}),
    ...(extras.deliveryCost !== null ? { deliveryCost: extras.deliveryCost } : {}),
    review: extras.review,
  };
}

const VEHICLE_TO_FRONT = { moto: 'Moto', voiture: 'Voiture', velo: 'Vélo', a_pied: 'À pied' } as const;
const VEHICLE_TO_API = { Moto: 'moto', Voiture: 'voiture', Vélo: 'velo', 'À pied': 'a_pied' } as const;

const courierDto = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  vehicle: z.enum(['moto', 'voiture', 'velo', 'a_pied']),
  active: z.boolean(),
  notes: z.string(),
  zoneIds: z.array(z.string()),
});

export function toCourier(raw: unknown): Courier {
  const c = courierDto.parse(raw);
  return { ...c, email: c.email ?? '', vehicle: VEHICLE_TO_FRONT[c.vehicle] };
}

const paymentDto = z.object({
  id: z.string(),
  kind: z.enum(['payment', 'refund']),
  amount: z.number(),
  method: z.enum(['cash', 'airtel', 'moov']),
  occurredAt: z.string(),
  reference: z.string().nullable(),
  noReferenceReason: z.string().nullable(),
  by: z.string(),
  createdAt: z.string(),
});

const checkoutPaymentDto = z.object({
  number: z.string().nullable(),
  total: z.number(),
  orders: z.number(),
  shops: z.array(z.string()),
});
const paymentsSummary = z.object({ payments: z.array(paymentDto), checkout: checkoutPaymentDto.nullable().optional() });
export type CheckoutPaymentSummary = z.infer<typeof checkoutPaymentDto>;

export function toPaymentsSummary(raw: unknown) {
  const summary = paymentsSummary.parse(raw);
  return {
    payments: summary.payments.map((p) => ({
      id: p.id,
      kind: p.kind,
      amount: p.amount,
      method: p.method,
      at: p.occurredAt,
      reference: p.reference ?? '',
      note: p.noReferenceReason ? `Sans référence : ${p.noReferenceReason}` : '',
      by: p.by,
      recordedAt: p.createdAt,
    })),
    checkout: summary.checkout ?? null,
  };
}

/** Encaissements et remboursements d'une commande, dans la forme du back-office. */
export function toPaymentRecords(raw: unknown): PaymentRecord[] {
  return toPaymentsSummary(raw).payments;
}

/** Une transition par requête, avec les champs propres à chaque action (api staff-orders.schemas.ts). */
export type Transition =
  | { action: 'advance'; note?: string }
  | { action: 'confirm_collection' }
  | { action: 'assign_courier'; courierId: Id; deliveryCost?: number }
  | { action: 'cancel'; reason: string }
  | { action: 'reopen'; reason: string }
  | { action: 'delivery_failed'; reason: string; decision: 'retry' | 'cancel' };

export interface PaymentEntry {
  amount: number;
  /** Date de réception des fonds (ISO) */
  at: string;
  reference: string;
}

export interface RefundEntry {
  amount: number;
  method: AdminOrder['paymentMethod'];
  reference: string;
  noReferenceReason: string;
  clientAgreed: boolean;
}

const one = (couriers: readonly Courier[]) => (raw: unknown) => toAdminOrder(raw, couriers);

export const adminOrdersBackend = {
  /** Commandes de la plus récente à la plus ancienne ; le back-office filtre et trie ensuite à l'écran. */
  list: (couriers: readonly Courier[], signal?: AbortSignal) =>
    getAll('/staff/orders', { sort: '-createdAt' }, one(couriers), signal),

  get: async (id: Id, couriers: readonly Courier[], signal?: AbortSignal) =>
    toAdminOrder(await backend.get(`/staff/orders/${id}`, undefined, signal), couriers),

  transition: async (order: AdminOrder, transition: Transition, couriers: readonly Courier[]) =>
    toAdminOrder(await backend.post(`/staff/orders/${order.id}/transitions`, transition), couriers),

  /** Commande signalée vérifiée : la note dit ce qui a été contrôlé ; la préparation devient possible. */
  clearReview: async (order: AdminOrder, note: string, couriers: readonly Courier[]) =>
    toAdminOrder(await backend.post(`/staff/orders/${order.id}/review-clearances`, { note }), couriers),

  setDeliveryCost: async (order: AdminOrder, amount: number, couriers: readonly Courier[]) =>
    toAdminOrder(await backend.put(`/staff/orders/${order.id}/delivery-cost`, { amount }), couriers),

  proposeFeeChange: async (order: AdminOrder, toFee: number, reason: string, couriers: readonly Courier[]) =>
    toAdminOrder(await backend.post(`/staff/orders/${order.id}/delivery-fee-changes`, { toFee, reason }), couriers),

  resolveDispute: async (order: AdminOrder, resolution: string, couriers: readonly Courier[]) =>
    toAdminOrder(await backend.patch(`/staff/orders/${order.id}/delivery-dispute`, { resolution }), couriers),

  decideCancellation: async (
    order: AdminOrder,
    accept: boolean,
    decisionReason: string,
    couriers: readonly Courier[],
  ) =>
    toAdminOrder(
      await backend.patch(`/staff/orders/${order.id}/cancellation-request`, {
        status: accept ? 'accepted' : 'refused',
        decisionReason,
      }),
      couriers,
    ),

  payments: async (order: AdminOrder, signal?: AbortSignal) =>
    toPaymentsSummary(await backend.get(`/staff/orders/${order.id}/payments`, undefined, signal)),

  /** Encaissement vérifié ; l'API émet la facture et crédite les points quand la commande est payée. */
  recordPayment: (order: AdminOrder, entry: PaymentEntry) =>
    backend.post(`/staff/orders/${order.id}/payments`, {
      amount: entry.amount,
      receivedAt: entry.at,
      reference: entry.reference.trim() || null,
    }),

  /** Remboursement ; l'API émet l'avoir et retire les points. */
  refund: (order: AdminOrder, entry: RefundEntry) =>
    backend.post(`/staff/orders/${order.id}/refunds`, {
      amount: entry.amount,
      method: entry.method,
      refundedAt: new Date().toISOString(),
      reference: entry.reference.trim() || null,
      noReferenceReason: entry.noReferenceReason.trim() || null,
      clientAgreed: entry.clientAgreed,
    }),

  couriers: (signal?: AbortSignal) =>
    backend.get('/staff/couriers', undefined, signal).then((raw) => z.array(z.unknown()).parse(raw).map(toCourier)),

  /** Création ou mise à jour d'un livreur ; un livreur ne se supprime pas, il se désactive. */
  async saveCourier(courier: Courier, exists: boolean): Promise<Courier> {
    const body = {
      firstName: courier.firstName,
      lastName: courier.lastName,
      phone: courier.phone,
      email: courier.email.trim() || null,
      vehicle: VEHICLE_TO_API[courier.vehicle],
      active: courier.active,
      notes: courier.notes,
      zoneIds: courier.zoneIds,
    };
    return toCourier(
      exists ? await backend.patch(`/staff/couriers/${courier.id}`, body) : await backend.post('/staff/couriers', body),
    );
  },
};
