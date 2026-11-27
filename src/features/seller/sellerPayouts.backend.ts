import { z } from 'zod';
import { backend } from '@/api/backend';

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

export type SellerPayout = z.infer<typeof payoutDto>;

const responseDto = z.object({
  items: z.array(z.unknown()),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  hasNext: z.boolean(),
  due: z.number(),
});

export const sellerPayoutsBackend = {
  async list(page: number, signal?: AbortSignal) {
    const response = responseDto.parse(await backend.get('/seller/payouts', { page, limit: 20 }, signal));
    return {
      ...response,
      items: response.items.map((item) => payoutDto.parse(item)),
    };
  },
};
