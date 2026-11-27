import { z } from 'zod';
import { backend } from '@/api/backend';
import type { Id } from '@/api/types';
import type { DeliveryZone } from '@/features/delivery/delivery.types';

/** Quartiers livrés vus par l'équipe (api/src/features/staff-delivery-zones), avec le coût habituel d'une course. */
const staffZoneDto = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  fee: z.number(),
  eta: z.string(),
  days: z.string(),
  available: z.boolean(),
  courierCost: z.number().nullable(),
});

export function toStaffZone(raw: unknown): DeliveryZone {
  const { courierCost, ...zone } = staffZoneDto.parse(raw);
  return courierCost === null ? zone : { ...zone, courierCost };
}

const EDITABLE = ['name', 'city', 'fee', 'eta', 'days', 'available', 'courierCost'] as const;

/** Champs modifiés seulement ; un coût de course retiré devient null pour l'API. */
function zoneBody(patch: Partial<DeliveryZone>) {
  const body: Record<string, unknown> = {};
  for (const key of EDITABLE)
    if (Object.prototype.hasOwnProperty.call(patch, key))
      body[key] = patch[key] ?? (key === 'courierCost' ? null : undefined);
  return body;
}

export const adminZonesBackend = {
  list: async (signal?: AbortSignal) =>
    z
      .array(z.unknown())
      .parse(await backend.get('/staff/delivery-zones', undefined, signal))
      .map(toStaffZone)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr')),

  create: async (zone: Omit<DeliveryZone, 'id'>) =>
    toStaffZone(await backend.post('/staff/delivery-zones', zoneBody(zone))),

  update: async (id: Id, patch: Partial<DeliveryZone>) =>
    toStaffZone(await backend.patch(`/staff/delivery-zones/${id}`, zoneBody(patch))),

};
