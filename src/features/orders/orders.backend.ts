import { z } from 'zod';
import { backend, getAll } from '@/api/backend';
import type { Id } from '@/api/types';
import type { CartLine, CartTotals } from '@/features/cart/cart.types';
import type { DeliveryInput } from '@/features/checkout/checkout.schemas';
import type { Order, PaymentMethod } from './orders.types';

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
]);
const paymentStatus = z.enum(['awaiting_payment', 'paid']);
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
    shop: o.shop,
    checkoutNumber: o.checkoutNumber,
    fulfilledBy: o.fulfilledBy,
    collectionConfirmedAt: o.collectionConfirmedAt,
    collectionConfirmedBy: o.collectionConfirmedBy,
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
  mine: (ownerId: Id, signal?: AbortSignal) => getAll('/orders', {}, (raw) => toOrder(raw, ownerId), signal),

  /** Commande du compte par son numéro ; null si elle n'existe pas ou appartient à un autre client. */
  async byNumber(number: string, ownerId: Id, signal?: AbortSignal): Promise<Order | null> {
    const page = z
      .object({ items: z.array(z.unknown()) })
      .parse(await backend.get('/orders', { number, page: 1, limit: 1 }, signal));
    if (!page.items[0]) return null;
    const order = toOrder(page.items[0], ownerId);
    return order;
  },

  track: async (number: string, code: string) =>
    toTrackedOrder(
      await backend.get('/order-tracking', { number: number.trim().toUpperCase(), code: code.trim().toUpperCase() }),
    ),


};
