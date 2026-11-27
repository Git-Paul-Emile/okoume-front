import { contentBackend } from './content.backend';
import type { Ad, ExclusiveOffer } from './home.types';

export const homeApi = {
  /** Seules les campagnes en cours sont renvoyées. */
  ads: (placement: string, signal?: AbortSignal): Promise<Ad[]> => contentBackend.ads(placement, signal),
  offers: (signal?: AbortSignal): Promise<ExclusiveOffer[]> => contentBackend.offers(signal),
};
