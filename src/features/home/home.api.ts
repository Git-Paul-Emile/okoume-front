import { contentBackend } from './content.backend';
import type { Ad, Banner, ExclusiveOffer } from './home.types';

export const homeApi = {
  banners: (signal?: AbortSignal): Promise<Banner[]> => contentBackend.banners(signal),
  /** Seules les campagnes en cours sont renvoyées. */
  ads: (placement: string, signal?: AbortSignal): Promise<Ad[]> => contentBackend.ads(placement, signal),
  offers: (signal?: AbortSignal): Promise<ExclusiveOffer[]> => contentBackend.offers(signal),
};
