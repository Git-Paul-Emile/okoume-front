import { z } from 'zod';
import { backend, getAll } from '@/api/backend';
import type { Id } from '@/api/types';
import type { User } from '@/features/auth/auth.types';

const summaryDto = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  status: z.enum(['pending_verification', 'active', 'anonymized']),
  createdAt: z.string(),
  lastLoginAt: z.string().nullable(),
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
      status: z.enum(['confirmed', 'preparing', 'ready', 'courier_assigned', 'shipping', 'delivered', 'cancelled', 'claim']),
    }),
  ),
});

/** Client minimal pour les exports non sensibles du back-office. */
export const toUser = (c: CustomerSummary): User => ({
  id: c.id,
  firstName: c.firstName,
  lastName: c.lastName,
  email: c.email,
  phone: c.phone ?? '',
  favorites: [],
  addresses: [],
  notificationPrefs: { email: false },
  hasOrdered: c.orderCount > 0,
  ...(c.lastLoginAt ? { lastLoginAt: c.lastLoginAt } : {}),
  createdAt: c.createdAt,
});

export const adminCustomersBackend = {
  list: (signal?: AbortSignal) => getAll('/staff/customers', {}, (raw) => summaryDto.parse(raw), signal),
  detail: async (id: Id, signal?: AbortSignal) =>
    detailDto.parse(await backend.get(`/staff/customers/${id}`, undefined, signal)),
};
