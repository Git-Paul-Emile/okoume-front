import { z } from 'zod';
import { backend, getPage } from '@/api/backend';
import type { Id } from '@/api/types';
import { toOrder } from '@/features/orders/orders.backend';
import type { Order, OrderStatus } from '@/features/orders/orders.types';

/**
 * Espace vendeur (cahier des charges 1.2, 32.4 à 32.6) : commandes reçues par la boutique, livraison choisie et
 * reversements. Le compte connecté est toujours le vendeur : l'API ne lit aucune boutique dans la requête.
 */
const ORDERS = '/seller/orders';
const path = (id: Id) => `${ORDERS}/${encodeURIComponent(id)}`;
const asOrder = (raw: unknown): Order => toOrder(raw, null);

export const SELLER_ORDER_STATUSES = [
  'confirmed',
  'preparing',
  'ready',
  'courier_assigned',
  'shipping',
  'delivered',
  'cancelled',
] as const satisfies readonly OrderStatus[];

const deliveryDto = z.object({
  mode: z.enum(['okoume', 'seller']),
  fees: z.array(z.object({ zoneId: z.string(), fee: z.number() })),
});

export type ShopDelivery = z.infer<typeof deliveryDto>;

const payoutDto = z.object({
  id: z.string(),
  order: z.object({ id: z.string(), number: z.string() }),
  collected: z.number(),
  deliveryFee: z.number(),
  commissionRate: z.number(),
  commission: z.number(),
  amount: z.number(),
  status: z.enum(['pending', 'paid', 'cancelled']),
  method: z.enum(['cash', 'airtel', 'moov']).nullable(),
  reference: z.string().nullable(),
  paidAt: z.string().nullable(),
  createdAt: z.string(),
});

export type SellerPayout = z.infer<typeof payoutDto>;

const payoutsPageDto = z.object({
  items: z.array(payoutDto),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  /** Ce qu'Okoumé doit encore à la boutique */
  due: z.number(),
});

export const sellerOrdersBackend = {
  list: (status: OrderStatus | undefined, page: number, signal?: AbortSignal) =>
    getPage(ORDERS, { page, limit: 20, ...(status ? { status } : {}) }, asOrder, signal),
  get: async (id: Id, signal?: AbortSignal) => asOrder(await backend.get(path(id), undefined, signal)),
  advance: async (id: Id) => asOrder(await backend.post(`${path(id)}/progress`, {})),
  confirmHandover: async (id: Id) => asOrder(await backend.post(`${path(id)}/handover`, {})),
  cancel: async (id: Id, reason: string) => asOrder(await backend.post(`${path(id)}/cancellation`, { reason })),
  collect: async (id: Id, reference: string | null) =>
    asOrder(await backend.post(`${path(id)}/collection`, { reference })),

  delivery: async (signal?: AbortSignal) => deliveryDto.parse(await backend.get('/seller/delivery', undefined, signal)),
  saveDelivery: async (delivery: ShopDelivery) => deliveryDto.parse(await backend.put('/seller/delivery', delivery)),

  /** Reversements de la boutique, et ce qu'Okoumé lui doit encore. */
  payouts: async (page: number, signal?: AbortSignal) =>
    payoutsPageDto.parse(await backend.get('/seller/payouts', { page, limit: 20 }, signal)),
};

/** Action suivante proposée au vendeur selon l'état de la commande et qui livre ; null s'il n'a rien à faire. */
export function nextSellerAction(order: Pick<Order, 'status' | 'fulfilledBy' | 'collectionConfirmedAt'>): string | null {
  if (order.status === 'confirmed') return 'Commencer la préparation';
  if (order.status === 'preparing') return 'Commande prête';
  if (order.fulfilledBy === 'okoume')
    return order.status === 'courier_assigned' && !order.collectionConfirmedAt ? 'Confirmer la remise au livreur' : null;
  if (order.status === 'ready') return 'Partie en livraison';
  if (order.status === 'shipping') return 'Livrée au client';
  return null;
}
