import { z } from 'zod';
import { backend } from '@/api/backend';
import type { SearchEntry } from '@/features/search/searchLog';
import type { SiteStat } from './admin.types';
import type { ProductViewEntry } from './stats.rules';

/** Mesure d'audience sur l'API (api/src/features/analytics) : 13 mois au plus, comme sa conservation. */
const DAY = 86_400_000;
const window = () => {
  const now = Date.now();
  return { from: new Date(now - 395 * DAY).toISOString(), to: new Date(now + DAY).toISOString() };
};

const productEventDto = z.object({
  id: z.string(),
  productId: z.string(),
  kind: z.enum(['view', 'click']),
  at: z.string(),
});
const searchDto = z.object({ id: z.string(), term: z.string(), results: z.number(), at: z.string() });
const dailyDto = z
  .object({
    day: z.string(),
    visits: z.number(),
    pwaVisits: z.number(),
    productViews: z.number(),
    addToCart: z.number(),
    checkouts: z.number(),
    orders: z.number(),
  })
  .transform((d): SiteStat => ({
    id: d.day,
    date: d.day,
    visitors: d.visits,
    // Pages vues : visites et fiches produit, les seules pages mesurées
    pageViews: d.visits + d.productViews,
    pwaSessions: d.pwaVisits,
    productViews: d.productViews,
    addToCart: d.addToCart,
    checkouts: d.checkouts,
    orders: d.orders,
  }));

export const adminAnalyticsBackend = {
  productViews: async (signal?: AbortSignal): Promise<ProductViewEntry[]> =>
    z.array(productEventDto).parse(await backend.get('/staff/analytics/product-events', window(), signal)),
  searches: async (signal?: AbortSignal): Promise<SearchEntry[]> =>
    z.array(searchDto).parse(await backend.get('/staff/analytics/searches', window(), signal)),
  daily: async (signal?: AbortSignal): Promise<SiteStat[]> =>
    z.array(dailyDto).parse(await backend.get('/staff/analytics/daily', window(), signal)),
};
