import { z } from 'zod';
import { backend } from '@/api/backend';
import type { PromoCode } from './promotions.types';

/** Ce qu'un visiteur voit d'un code ouvert à tous : sans compteurs d'utilisation. */
export type PublicPromoCode = Pick<
  PromoCode,
  'id' | 'code' | 'label' | 'type' | 'value' | 'minAmount' | 'freeDelivery' | 'endsAt'
>;

const publicCodeDto = z.object({
  id: z.string(),
  code: z.string(),
  label: z.string(),
  type: z.enum(['percent', 'fixed']),
  value: z.number(),
  minAmount: z.number(),
  freeDelivery: z.boolean(),
  endsAt: z.string(),
});

export const promotionsApi = {
  publicCodes: async (signal?: AbortSignal): Promise<PublicPromoCode[]> =>
    z.array(publicCodeDto).parse(await backend.get('/promo-codes', undefined, signal)),

};
