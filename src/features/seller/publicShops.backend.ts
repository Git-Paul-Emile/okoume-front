import { z } from 'zod';
import { getPage, type PageOf } from '@/api/backend';

const publicShopDto = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  city: z.string(),
  district: z.string().nullable(),
  acceptedPaymentMethods: z.array(z.enum(['cash', 'airtel', 'moov'])),
  verified: z.boolean(),
  createdAt: z.string(),
});

export type PublicSellerShop = z.infer<typeof publicShopDto>;

export const publicShopsBackend = {
  list: (page: number, signal?: AbortSignal): Promise<PageOf<PublicSellerShop>> =>
    getPage('/shops', { page, limit: 24 }, (raw) => publicShopDto.parse(raw), signal),
};
