import { z } from 'zod';
import { ApiError } from '@/api/ApiError';
import { backend } from '@/api/backend';

export const PAYMENT_METHODS = ['cash', 'airtel', 'moov'] as const;
export type ShopPaymentMethod = (typeof PAYMENT_METHODS)[number];

export const paymentLabel: Record<ShopPaymentMethod, string> = {
  cash: 'Espèces',
  airtel: 'Airtel Money',
  moov: 'Moov Money',
};

export interface ShopFields {
  name: string;
  description: string;
  city: string;
  district: string;
  phone: string;
  acceptedPaymentMethods: ShopPaymentMethod[];
}

export const shopDto = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  city: z.string(),
  district: z.string(),
  position: z.object({ latitude: z.number(), longitude: z.number() }).nullable(),
  phone: z.string(),
  acceptedPaymentMethods: z.array(z.enum(PAYMENT_METHODS)),
  deliveryMode: z.enum(['okoza', 'seller']),
  status: z.enum(['active', 'suspended']),
  suspensionReason: z.string().nullable(),
  verified: z.boolean(),
  createdAt: z.string(),
});
export type SellerShop = z.infer<typeof shopDto>;

const dashboardDto = z.object({
  shop: z.object({
    name: z.string(),
    slug: z.string(),
    status: z.enum(['active', 'suspended']),
    verified: z.boolean(),
  }),
  products: z.object({
    published: z.number(),
    draft: z.number(),
    archived: z.number(),
    inReview: z.number(),
    changesRequested: z.number(),
    pendingModeration: z.number(),
    rejected: z.number(),
  }),
  orders: z.object({ toPrepare: z.number(), toDeliver: z.number(), toCollect: z.number() }),
});
export type SellerDashboard = z.infer<typeof dashboardDto>;

export const sellerBackend = {
  /** Boutique du compte ; null si le compte n'en a pas encore (404). */
  async shop(signal?: AbortSignal): Promise<SellerShop | null> {
    try {
      return shopDto.parse(await backend.get('/seller/shop', undefined, signal));
    } catch (error) {
      if (error instanceof ApiError && error.isNotFound) return null;
      throw error;
    }
  },

  openShop: async (fields: ShopFields) =>
    shopDto.parse(await backend.post('/seller/shop', { ...fields, position: null })),

  updateShop: async (fields: Partial<ShopFields>) => shopDto.parse(await backend.patch('/seller/shop', fields)),

  dashboard: async (signal?: AbortSignal) =>
    dashboardDto.parse(await backend.get('/seller/dashboard', undefined, signal)),
};

