import { z } from 'zod';
import { backend, getAll } from '@/api/backend';
import type { Id } from '@/api/types';
import type { PromoCode } from '@/features/promotions/promotions.types';

const promoCodeDto = z.object({
  id: z.string(), code: z.string(), label: z.string(), type: z.enum(['percent', 'fixed']), value: z.number(),
  minAmount: z.number(), freeDelivery: z.boolean(), endsAt: z.string(), maxUses: z.number().nullable(),
  uses: z.number(), active: z.boolean(), productIds: z.array(z.string()), categoryIds: z.array(z.string()),
});
export const toPromoCode = (raw: unknown): PromoCode => promoCodeDto.parse(raw);
const promoFields = ['code', 'label', 'type', 'value', 'minAmount', 'freeDelivery', 'endsAt', 'maxUses', 'active', 'productIds', 'categoryIds'] as const;
const promoCodeBody = (code: Partial<PromoCode>) => {
  const body: Record<string, unknown> = {};
  for (const key of promoFields) if (code[key] !== undefined) body[key] = code[key];
  return body;
};

export const adminCommerceBackend = {
  promoCodes: (signal?: AbortSignal) => getAll('/staff/promo-codes', {}, toPromoCode, signal),
  createPromoCode: async (code: PromoCode) => toPromoCode(await backend.post('/staff/promo-codes', promoCodeBody(code))),
  updatePromoCode: async (id: Id, patch: Partial<PromoCode>) =>
    toPromoCode(await backend.patch(`/staff/promo-codes/${id}`, promoCodeBody(patch))),
};
