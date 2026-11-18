import { z } from 'zod';
import { backend } from '@/api/backend';
import type { DeliveryZone, ZoneRequest } from './delivery.types';

/** Quartier livré tel que l'API le publie : sans le coût interne du livreur. */
const zoneDto = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  fee: z.number(),
  eta: z.string(),
  days: z.string(),
  available: z.boolean(),
});

export const deliveryApi = {
  /** Demande sans compte ; seule la confirmation revient. */
  requestZone: (input: Pick<ZoneRequest, 'neighbourhood' | 'city' | 'contact'>): Promise<unknown> =>
    backend.post('/zone-requests', input),

  /** Quartiers livrés, triés par nom. */
  zones: async (signal?: AbortSignal): Promise<DeliveryZone[]> => {
    const zones = z.array(zoneDto).parse(await backend.get('/delivery-zones', undefined, signal));
    return [...zones].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  },
};
