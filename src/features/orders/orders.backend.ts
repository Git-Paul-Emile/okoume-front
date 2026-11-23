import { z } from 'zod';
import { ApiError } from '@/api/ApiError';
import { backend, getAll } from '@/api/backend';
import { signedUploadDto, type SignedUpload } from '@/api/mediaUpload';
import type { Id } from '@/api/types';
import type { CartLine, CartTotals } from '@/features/cart/cart.types';
import type { DeliveryInput } from '@/features/checkout/checkout.schemas';
import type { InvoiceDocument } from '@/features/invoices/invoice.rules';
import type { Order, PaymentMethod, ReturnRequest } from './orders.types';

/**
 * Commandes sur l'API (api/src/features/orders). L'API recalcule tout : le navigateur n'envoie que les
 * articles, les quantités, la livraison, le paiement et le code promo. Chaque réponse est validée.
 */

const status = z.enum([
  'confirmed',
  'preparing',
  'ready',
  'courier_assigned',
  'shipping',
  'delivered',
  'cancelled',
  'claim',
]);
const paymentStatus = z.enum([
  'awaiting_payment',
  'awaiting_verification',
  'partially_paid',
  'paid',
  'refund_due',
  'refunded',
]);
const paymentMethod = z.enum(['cash', 'airtel', 'moov']);

const totals = z.object({
  subtotal: z.number(),
  productDiscount: z.number(),
  codeDiscount: z.number(),
  deliveryFee: z.number(),
  deliveryDiscount: z.number(),
  total: z.number(),
});

const item = z.object({
  productId: z.string(),
  variantId: z.string(),
  name: z.string(),
  variantLabel: z.string(),
  image: z.string(),
  unitPrice: z.number(),
  originalPrice: z.number(),
  quantity: z.number(),
});

const history = z.array(z.object({ status, at: z.string(), from: status.optional(), note: z.string().optional() }));

const orderDto = z.object({
  id: z.string(),
  number: z.string(),
  trackingCode: z.string(),
  items: z.array(item),
  customer: z.object({
    recipient: z.string(),
    phone: z.string(),
    email: z.string(),
    zoneId: z.string(),
    zoneName: z.string(),
    landmark: z.string(),
    instructions: z.string(),
  }),
  totals,
  promoCode: z.string().nullable(),
  paymentMethod,
  paymentStatus,
  status,
  history,
  cancellationRequest: z
    .object({
      reason: z.string(),
      comment: z.string(),
      status: z.enum(['pending', 'accepted', 'refused']),
      createdAt: z.string(),
      decisionReason: z.string().optional(),
    })
    .nullable(),
  deliveryDispute: z
    .object({
      reason: z.string(),
      status: z.enum(['open', 'resolved']),
      resolution: z.string().nullable(),
      createdAt: z.string(),
    })
    .nullable(),
  shop: z.object({ slug: z.string(), name: z.string() }).nullable().default(null),
  checkoutNumber: z.string().nullable().default(null),
  fulfilledBy: z.enum(['okoza', 'seller']).default('okoza'),
  collectionConfirmedAt: z.string().nullable().default(null),
  collectionConfirmedBy: z.string().nullable().default(null),
  createdAt: z.string(),
});

/** Réponse du passage de commande : la première commande, et toutes celles du même panier (une par boutique). */
const placedDto = orderDto.extend({ checkout: z.array(z.unknown()).default([]) });

/** Suivi sans compte : l'API ne renvoie ni les coordonnées du client ni l'identifiant de la commande. */
const trackingDto = z.object({
  number: z.string(),
  checkoutNumber: z.string().nullable().default(null),
  status,
  history,
  items: z.array(item),
  totals,
  paymentMethod,
  paymentStatus,
  createdAt: z.string(),
  zoneName: z.string(),
  orders: z
    .array(
      z.object({
        number: z.string(),
        shopName: z.string(),
        status,
        paymentStatus,
        fulfilledBy: z.enum(['okoza', 'seller']),
        total: z.number(),
        collectionConfirmedAt: z.string().nullable(),
      }),
    )
    .default([]),
});

const quoteDto = z.object({
  totals: z.object({
    baseSubtotal: z.number(),
    subtotal: z.number(),
    productDiscount: z.number(),
    codeDiscount: z.number(),
    deliveryFee: z.number(),
    deliveryDiscount: z.number(),
    total: z.number(),
    codeError: z.string().nullable(),
  }),
  shipments: z
    .array(
      z.object({
        shop: z.object({ id: z.string(), name: z.string().nullable() }).nullable(),
        fulfilledBy: z.enum(['okoza', 'seller']),
        subtotal: z.number(),
        deliveryFee: z.number(),
        total: z.number(),
      }),
    )
    .default([]),
});

/**
 * Commande de l'API dans la forme du front. `ownerId` : le compte qui l'a lue sur ses propres routes
 * (l'API a vérifié l'appartenance), null pour une commande passée sans compte.
 */
export function toOrder(raw: unknown, ownerId: Id | null): Order {
  const o = orderDto.parse(raw);
  return {
    id: o.id,
    number: o.number,
    trackingCode: o.trackingCode,
    userId: ownerId,
    items: o.items,
    customer: o.customer,
    totals: o.totals,
    promoCode: o.promoCode,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    status: o.status,
    history: o.history,
    cancellationRequest: o.cancellationRequest,
    returnRequest: null,
    shop: o.shop,
    checkoutNumber: o.checkoutNumber,
    fulfilledBy: o.fulfilledBy,
    collectionConfirmedAt: o.collectionConfirmedAt,
    collectionConfirmedBy: o.collectionConfirmedBy,
    deliveryDispute: o.deliveryDispute && {
      createdAt: o.deliveryDispute.createdAt,
      status: o.deliveryDispute.status,
      resolution: o.deliveryDispute.resolution,
    },
    createdAt: o.createdAt,
  };
}

/** Commande suivie par numéro et code : les coordonnées restent vides, elles ne sont pas transmises. */
export function toTrackedOrder(raw: unknown): Order {
  const o = trackingDto.parse(raw);
  return {
    id: '',
    number: o.number,
    trackingCode: '',
    userId: null,
    items: o.items,
    customer: { recipient: '', phone: '', email: '', zoneId: '', zoneName: o.zoneName, landmark: '', instructions: '' },
    totals: o.totals,
    promoCode: null,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    status: o.status,
    history: o.history,
    cancellationRequest: null,
    returnRequest: null,
    shop: null,
    checkoutNumber: o.checkoutNumber,
    fulfilledBy: 'okoza',
    collectionConfirmedAt: null,
    collectionConfirmedBy: null,
    trackedOrders: o.orders,
    createdAt: o.createdAt,
  };
}

export interface QuoteRequest {
  lines: Array<Pick<CartLine, 'variantId' | 'quantity'>>;
  zoneId: Id | null;
  promoCode: string | null;
}

/** Totaux du panier calculés par l'API ; le nombre d'articles reste compté sur l'appareil. */
export async function quote(request: QuoteRequest, signal?: AbortSignal): Promise<CartTotals> {
  const { totals: t, shipments } = quoteDto.parse(
    await backend.post(
      '/checkout/quotes',
      {
        lines: request.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        ...(request.zoneId ? { zoneId: request.zoneId } : {}),
        ...(request.promoCode ? { promoCode: request.promoCode } : {}),
      },
      signal,
    ),
  );
  return { ...t, shipments, itemCount: request.lines.reduce((s, l) => s + l.quantity, 0) };
}

export interface PlaceOrderRequest {
  idempotencyKey: string;
  lines: Array<Pick<CartLine, 'variantId' | 'quantity'>>;
  delivery: DeliveryInput;
  paymentMethod: PaymentMethod;
  promoCode: string | null;
}

/** Dossier de retour vu par le client (api/src/features/returns/returns.dto.ts). */
const returnDto = z.object({
  status: z.enum(['pending', 'refused', 'expected', 'received', 'refund_due', 'refunded', 'closed']),
  reason: z.string(),
  comment: z.string(),
  items: z.array(z.object({ variantId: z.string(), quantity: z.number() })),
  decisionReason: z.string().nullable(),
  createdAt: z.string(),
});

export function toReturnRequest(raw: unknown): ReturnRequest {
  const r = returnDto.parse(raw);
  return {
    items: r.items,
    reason: r.reason,
    comment: r.comment,
    status: r.status,
    createdAt: r.createdAt,
    ...(r.decisionReason ? { decisionReason: r.decisionReason } : {}),
  };
}

const invoiceLine = z.object({
  label: z.string(),
  detail: z.string().optional(),
  quantity: z.number(),
  unit: z.number(),
  vatRate: z.number(),
  ttc: z.number(),
});

const invoiceDto = z.object({
  id: z.string(),
  number: z.string(),
  type: z.enum(['invoice', 'credit_note']),
  orderId: z.string(),
  orderNumber: z.string(),
  issuedAt: z.string(),
  relatedNumber: z.string().nullable(),
  reason: z.string().nullable(),
  customerName: z.string(),
  customerPhone: z.string(),
  customerEmail: z.string(),
  address: z.string(),
  paymentMethod,
  lines: z.array(invoiceLine),
  vatBreakdown: z.array(z.object({ rate: z.number(), ht: z.number(), vat: z.number(), ttc: z.number() })),
  totals: z.object({ ht: z.number(), vat: z.number(), ttc: z.number() }),
});

/** Facture ou avoir émis par l'API, dans la forme du front. */
export function toInvoiceDocument(raw: unknown, ownerId: Id): InvoiceDocument {
  const d = invoiceDto.parse(raw);
  return {
    id: d.id,
    number: d.number,
    type: d.type,
    orderId: d.orderId,
    orderNumber: d.orderNumber,
    userId: ownerId,
    issuedAt: d.issuedAt,
    customer: { name: d.customerName, phone: d.customerPhone, email: d.customerEmail, address: d.address },
    paymentMethod: d.paymentMethod,
    lines: d.lines,
    vatBreakdown: d.vatBreakdown,
    totals: d.totals,
    ...(d.relatedNumber ? { relatedNumber: d.relatedNumber } : {}),
    ...(d.reason ? { reason: d.reason } : {}),
  };
}

/** Dossier de retour d'une commande du compte ; null s'il n'y en a pas (404). */
async function returnOf(orderId: Id, signal?: AbortSignal): Promise<ReturnRequest | null> {
  try {
    return toReturnRequest(await backend.get(`/orders/${orderId}/return`, undefined, signal));
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

/** Commande relue après une démarche : le dossier de retour, ressource à part sur l'API, est conservé. */
const refreshed = (order: Order, raw: unknown): Order => ({
  ...toOrder(raw, order.userId),
  returnRequest: order.returnRequest,
});

export const ordersBackend = {
  /** Passage de commande : la même clé renvoie la même commande, jamais un doublon. */
  async place(request: PlaceOrderRequest, ownerId: Id | null): Promise<Order> {
    const { delivery } = request;
    const raw = await backend.post('/orders', {
      idempotencyKey: request.idempotencyKey,
      lines: request.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
      delivery: {
        recipient: delivery.recipient,
        phone: delivery.phone,
        email: delivery.email,
        zoneId: delivery.zoneId,
        landmark: delivery.landmark,
        instructions: delivery.instructions ?? '',
      },
      paymentMethod: request.paymentMethod,
      ...(request.promoCode ? { promoCode: request.promoCode } : {}),
    });
    const { checkout } = placedDto.parse(raw);
    return { ...toOrder(raw, ownerId), checkout: checkout.map((o) => toOrder(o, ownerId)) };
  },

  /** Commandes du compte sur les 3 dernières années, de la plus récente à la plus ancienne. */
  /** Rattache au compte une commande passée sans compte (même adresse e-mail, numéro et code de suivi). */
  claim: async (number: string, code: string, ownerId: Id) =>
    toOrder(await backend.post('/orders/claims', { number, code }), ownerId),

  mine: (ownerId: Id, signal?: AbortSignal) => getAll('/orders', {}, (raw) => toOrder(raw, ownerId), signal),

  /** Commande du compte par son numéro ; null si elle n'existe pas ou appartient à un autre client. */
  async byNumber(number: string, ownerId: Id, signal?: AbortSignal): Promise<Order | null> {
    const page = z
      .object({ items: z.array(z.unknown()) })
      .parse(await backend.get('/orders', { number, page: 1, limit: 1 }, signal));
    if (!page.items[0]) return null;
    const order = toOrder(page.items[0], ownerId);
    return { ...order, returnRequest: await returnOf(order.id, signal) };
  },

  track: async (number: string, code: string) =>
    toTrackedOrder(
      await backend.get('/order-tracking', { number: number.trim().toUpperCase(), code: code.trim().toUpperCase() }),
    ),

  /** Annulation immédiate tant que la commande est confirmée, sinon demande soumise à la boutique. */
  cancel: async (order: Order, reason: string, comment: string) =>
    refreshed(order, await backend.post(`/orders/${order.id}/cancellation-requests`, { reason, comment })),

  disputeDelivery: async (order: Order, reason: string) =>
    refreshed(order, await backend.post(`/orders/${order.id}/delivery-disputes`, { reason })),

  /** Autorisation d'envoyer une photo justificative pour le retour de cette commande. */
  signEvidenceUpload: async (order: Order): Promise<SignedUpload> =>
    signedUploadDto.parse(await backend.post(`/orders/${order.id}/return/evidence-uploads`)),

  async requestReturn(
    order: Order,
    request: { items: ReturnRequest['items']; reason: string; comment: string; evidenceUrls: string[] },
  ): Promise<Order> {
    return { ...order, returnRequest: toReturnRequest(await backend.post(`/orders/${order.id}/return`, request)) };
  },

  async reopenReturn(order: Order, comment: string): Promise<Order> {
    const raw = await backend.post(`/orders/${order.id}/return/reopenings`, { comment });
    return { ...order, returnRequest: toReturnRequest(raw) };
  },

  /** Factures et avoirs d'une commande du compte, émis par l'API au paiement et au remboursement. */
  invoices: async (order: Order, ownerId: Id, signal?: AbortSignal) =>
    z
      .array(z.unknown())
      .parse(await backend.get(`/orders/${order.id}/invoices`, undefined, signal))
      .map((raw) => toInvoiceDocument(raw, ownerId)),
};
