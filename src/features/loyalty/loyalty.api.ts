import { z } from 'zod';
import { getAll } from '@/api/backend';
import type { Id } from '@/api/types';
import type { LoyaltyMovement } from './loyalty.types';

const movementDto = z.object({
  id: z.string(),
  points: z.number(),
  type: z.enum(['earn', 'redeem', 'restore', 'adjust', 'referral', 'birthday', 'reversal']),
  label: z.string(),
  orderId: z.string().nullable(),
  createdAt: z.string(),
});

/** Mouvement de points de l'API dans la forme du front ; le compte est celui de la session. */
export function toMovement(raw: unknown, userId: Id): LoyaltyMovement {
  const { orderId, ...m } = movementDto.parse(raw);
  return { ...m, userId, ...(orderId ? { orderId } : {}) };
}

export const loyaltyApi = {
  /** Historique des points du compte, du plus récent au plus ancien. */
  movements: (userId: Id, signal?: AbortSignal): Promise<LoyaltyMovement[]> =>
    getAll('/loyalty/movements', {}, (raw) => toMovement(raw, userId), signal),
};
