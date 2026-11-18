import type { Ad } from './home.types';

export const AD_SLIDES = 3;

function isRunning(ad: Ad, now: Date) {
  return (!ad.startsAt || new Date(ad.startsAt) <= now) && (!ad.endsAt || now <= new Date(ad.endsAt));
}

/**
 * Diapositives d'un espace publicitaire : les campagnes d'annonceurs en cours, par priorité,
 * complétées par les visuels « espace disponible » de la boutique, jusqu'à `limit` diapositives.
 */
export function pickAds(ads: Ad[], now = new Date(), limit = AD_SLIDES) {
  const campaigns = ads.filter((a) => a.advertiser && isRunning(a, now)).sort((a, b) => b.priority - a.priority);
  const house = ads.filter((a) => !a.advertiser).sort((a, b) => b.priority - a.priority);
  return [...campaigns, ...house].slice(0, limit);
}
