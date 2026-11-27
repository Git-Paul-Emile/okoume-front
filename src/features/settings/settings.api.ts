import { z } from 'zod';
import { backend } from '@/api/backend';
import type { ShopSettings } from './settings.types';

/** Réglages publics publiés par l'API (GET /settings) : sans les seuils internes réservés à l'équipe. */
const publicSettingsDto = z.object({
  currency: z.literal('XAF'),
  mobileMoney: z.array(
    z.object({
      method: z.enum(['airtel', 'moov']),
      label: z.string(),
      number: z.string(),
      beneficiary: z.string(),
      instructions: z.string(),
    }),
  ),
  mobileMoneyExpiryHours: z.number(),
  deliveryVatRate: z.number(),
  maxAddresses: z.number(),
  legal: z.object({ companyName: z.string(), nif: z.string(), rccm: z.string(), vatNote: z.string() }),
  support: z.object({
    whatsapp: z.string(),
    phone: z.string(),
    email: z.string(),
    hours: z.string(),
    address: z.string(),
  }),
  social: z.record(z.string(), z.string()),
});

export const toShopSettings = (raw: unknown): ShopSettings => publicSettingsDto.parse(raw);

export const settingsApi = {
  get: async (signal?: AbortSignal): Promise<ShopSettings> =>
    toShopSettings(await backend.get('/settings', undefined, signal)),
};
