import { z } from 'zod';
import { backend } from '@/api/backend';
import { ApiError } from '@/api/ApiError';

/** Fiche publique d'une boutique de vendeur (api/src/features/shops), validée à la réception. */
const publicShopDto = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  city: z.string(),
  district: z.string().nullable(),
  verified: z.boolean(),
});

export type PublicShop = z.infer<typeof publicShopDto>;

export const shopsApi = {
  /** Boutique inconnue ou suspendue : null, la page affiche « introuvable ». */
  bySlug: async (slug: string, signal?: AbortSignal) => {
    try {
      return publicShopDto.parse(await backend.get(`/shops/${encodeURIComponent(slug)}`, undefined, signal));
    } catch (error) {
      if (error instanceof ApiError && (error.isNotFound || error.status === 400)) return null;
      throw error;
    }
  },
};
