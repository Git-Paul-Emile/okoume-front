import { z } from 'zod';
import { backend, getAll } from '@/api/backend';
import type { Id } from '@/api/types';

/**
 * Reversements aux vendeurs (cahier des charges 1.2, 32.6), lus et enregistrés sur l'API : ce qu'un livreur
 * Okoumé a encaissé pour une boutique, moins la livraison et la commission.
 */
const payoutDto = z.object({
  id: z.string(),
  shop: z.object({ id: z.string(), name: z.string() }),
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
  paidBy: z.string().nullable(),
  createdAt: z.string(),
});

export type AdminPayout = z.infer<typeof payoutDto>;

/** Total encore dû aux vendeurs, renvoyé avec chaque page de la liste. */
const dueDto = z.object({ due: z.number() });

export const adminPayoutsBackend = {
  /** Tous les reversements de cet état, page après page, et le total encore dû. */
  async list(status: AdminPayout['status'] | undefined, signal?: AbortSignal) {
    const params = status ? { status } : {};
    const [items, first] = await Promise.all([
      getAll('/staff/payouts', params, (raw) => payoutDto.parse(raw), signal),
      backend.get('/staff/payouts', { page: 1, limit: 1 }, signal),
    ]);
    return { items, due: dueDto.parse(first).due };
  },
  markPaid: async (id: Id, method: 'cash' | 'airtel' | 'moov', reference: string | null) =>
    payoutDto.parse(await backend.post(`/staff/payouts/${encodeURIComponent(id)}/payment`, { method, reference })),
};
