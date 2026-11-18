import { z } from 'zod';
import { backend, getAll } from '@/api/backend';
import type { Id } from '@/api/types';
import type { User } from '@/features/auth/auth.types';

/**
 * Fichier clients sur l'API (api/src/features/staff-customers). Coordonnées et repères d'adresse arrivent déjà
 * masqués sans le droit sur les données sensibles : l'interface n'a rien à cacher elle-même.
 */

const tier = z.enum(['bronze', 'argent', 'or']);

const summaryDto = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  status: z.enum(['pending_verification', 'active', 'anonymized']),
  referralCode: z.string(),
  createdAt: z.string(),
  lastLoginAt: z.string().nullable(),
  points: z.number(),
  tier,
  orderCount: z.number(),
  totalSpent: z.number(),
});
export type CustomerSummary = z.infer<typeof summaryDto>;

const detailDto = summaryDto.extend({
  addresses: z.array(z.object({ id: z.string(), label: z.string(), zoneName: z.string(), landmark: z.string() })),
  orders: z.array(
    z.object({
      id: z.string(),
      number: z.string(),
      createdAt: z.string(),
      total: z.number(),
      status: z.enum([
        'confirmed',
        'preparing',
        'ready',
        'courier_assigned',
        'shipping',
        'delivered',
        'cancelled',
        'claim',
      ]),
    }),
  ),
  movements: z.array(
    z.object({
      id: z.string(),
      points: z.number(),
      type: z.string(),
      label: z.string(),
      staffName: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
});
export type CustomerDetail = z.infer<typeof detailDto>;

const referralDto = z.object({
  id: z.string(),
  referrerId: z.string(),
  refereeId: z.string(),
  refereeName: z.string(),
  orderNumber: z.string(),
  points: z.number(),
  status: z.enum(['pending', 'granted', 'rejected']),
  signals: z.array(z.string()),
  createdAt: z.string(),
});
export type ReferralReward = z.infer<typeof referralDto>;

/**
 * Client du fichier sous la forme du compte du front, pour les écrans qui la partagent (statistiques, exports).
 * Adresses, favoris et préférences ne font pas partie de la liste : ils restent vides.
 */
export const toUser = (c: CustomerSummary): User => ({
  id: c.id,
  firstName: c.firstName,
  lastName: c.lastName,
  email: c.email,
  phone: c.phone ?? '',
  birthday: null,
  referralCode: c.referralCode,
  loyaltyPoints: c.points,
  totalSpent: c.totalSpent,
  tier: c.tier,
  favorites: [],
  addresses: [],
  notificationPrefs: { email: false, push: false },
  hasOrdered: c.orderCount > 0,
  ...(c.lastLoginAt ? { lastLoginAt: c.lastLoginAt } : {}),
  createdAt: c.createdAt,
});

export const adminCustomersBackend = {
  list: (signal?: AbortSignal) => getAll('/staff/customers', {}, (raw) => summaryDto.parse(raw), signal),

  detail: async (id: Id, signal?: AbortSignal) =>
    detailDto.parse(await backend.get(`/staff/customers/${id}`, undefined, signal)),

  /** Correction motivée : l'API l'inscrit à l'historique avec son auteur, jamais modifié ensuite. */
  adjust: (customerId: Id, points: number, reason: string) =>
    backend.post(`/staff/customers/${customerId}/loyalty-adjustments`, { points, reason }),

  pendingReferrals: (signal?: AbortSignal) =>
    getAll('/staff/referral-rewards', { status: 'pending' }, (raw) => referralDto.parse(raw), signal),

  decideReferral: (id: Id, grant: boolean, note: string) =>
    backend.patch(`/staff/referral-rewards/${id}`, { status: grant ? 'granted' : 'rejected', note }),
};
