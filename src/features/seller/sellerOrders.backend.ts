import { z } from 'zod';
import { backend, getPage } from '@/api/backend';
import type { Id } from '@/api/types';
import { toOrder } from '@/features/orders/orders.backend';
import type { Order, OrderStatus } from '@/features/orders/orders.types';

/**
 * Espace vendeur : commandes reçues par la boutique et livraison choisie. Le compte connecté est toujours le vendeur.
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
