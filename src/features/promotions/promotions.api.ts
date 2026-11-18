import { z } from 'zod';
import { backend } from '@/api/backend';
import type { PromoCode } from './promotions.types';

/** Ce qu'un visiteur voit d'un code ouvert à tous : sans compteurs d'utilisation. */
export type PublicPromoCode = Pick<
  PromoCode,
  'id' | 'code' | 'label' | 'type' | 'value' | 'minAmount' | 'freeDelivery' | 'tiers' | 'startsAt' | 'endsAt'
>;

/** Code personnel encore utilisable par le client (bienvenue, anniversaire). */
export type PersonalCode = Pick<PromoCode, 'code' | 'label' | 'type' | 'value' | 'endsAt'>;

const publicCodeDto = z.object({
  id: z.string(),
  code: z.string(),
  label: z.string(),
  type: z.enum(['percent', 'fixed']),
  value: z.number(),
  minAmount: z.number(),
  freeDelivery: z.boolean(),
  tiers: z.array(z.enum(['bronze', 'argent', 'or'])),
  startsAt: z.string(),
  endsAt: z.string(),
});

const personalCodeDto = z.object({
  code: z.string(),
  label: z.string(),
  type: z.enum(['percent', 'fixed']),
  value: z.number(),
  endsAt: z.string(),
});

export const promotionsApi = {
  publicCodes: async (signal?: AbortSignal): Promise<PublicPromoCode[]> =>
    z.array(publicCodeDto).parse(await backend.get('/promo-codes', undefined, signal)),

  /** Codes personnels encore utilisables par le client connecté. */
  mine: async (signal?: AbortSignal): Promise<PersonalCode[]> =>
    z.array(personalCodeDto).parse(await backend.get('/loyalty/codes', undefined, signal)),
};
