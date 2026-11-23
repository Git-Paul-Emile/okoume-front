import type { Ad } from './home.types';

export const AD_SLIDES = 3;

/**
 * Diapositives d'un espace publicitaire : les campagnes d'annonceurs en cours, par priorité,
 * complétées par les visuels « espace disponible » de la boutique, jusqu'à `limit` diapositives.
 */
export function pickAds(ads: Ad[], limit = AD_SLIDES) {
  const advertiserAds = ads.filter((a) => a.active && a.advertiser).sort((a, b) => b.priority - a.priority);
  const houseAds = ads.filter((a) => a.active && !a.advertiser).sort((a, b) => b.priority - a.priority);
  return [...advertiserAds, ...houseAds].slice(0, limit);
}
