import { z } from 'zod';
import { backend, getPage } from '@/api/backend';
import type { Id } from '@/api/types';
import { planDto, shopDto, shopPaymentDto } from '@/features/seller/seller.backend';

/**
 * Boutiques des vendeurs administrées par l'équipe (api/src/features/staff-shops) : boutiques, offres d'accès,
 * paiements des offres et réglages. Droits du domaine « vendeurs » : consulter, modifier, valider.
 * La vérification des produits des vendeurs se fait depuis la page Produits.
 */

const staffPaymentDto = shopPaymentDto.extend({ shop: z.object({ id: z.string(), name: z.string() }) });
export type StaffShopPayment = z.infer<typeof staffPaymentDto>;

const staffPlanDto = planDto.extend({ position: z.number() });
export type StaffAccessPlan = z.infer<typeof staffPlanDto>;

export type StaffShop = z.infer<typeof shopDto>;

const marketplaceSettingsDto = z.object({
  graceDays: z.number(),
  reminderDays: z.number(),
  aiReviewMonthlyLimit: z.number(),
  /** Commission d'OKOZA sur les ventes des vendeurs livrées par ses livreurs, en pourcentage (32.6) */
  commissionRate: z.number().default(0),
});

export type MarketplaceSettings = z.infer<typeof marketplaceSettingsDto>;

export type ShopAction = { action: 'suspend'; reason: string } | { action: 'reinstate' | 'verify' | 'unverify' };

export type Decision = { status: 'validated' } | { status: 'refused'; reason: string };

const page = { limit: 20 };
const arrayOf =
  <T>(schema: z.ZodType<T>) =>
  (raw: unknown) =>
    z
      .array(z.unknown())
      .parse(raw)
      .map((x) => schema.parse(x));

export const adminMarketplaceBackend = {
  shops: (filters: { status?: 'active' | 'suspended'; search?: string }, p: number, signal?: AbortSignal) =>
    getPage(
      '/staff/shops',
      {
        ...page,
        page: p,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.search?.trim() ? { search: filters.search.trim() } : {}),
      },
      (raw) => shopDto.parse(raw),
      signal,
    ),

  actOnShop: async (id: Id, action: ShopAction) => shopDto.parse(await backend.patch(`/staff/shops/${id}`, action)),

  shopPayments: (status: 'pending' | 'validated' | 'refused' | undefined, p: number, signal?: AbortSignal) =>
    getPage(
      '/staff/shop-payments',
      { ...page, page: p, ...(status ? { status } : {}) },
      (raw) => staffPaymentDto.parse(raw),
      signal,
    ),

  decideShopPayment: async (id: Id, decision: Decision) =>
    staffPaymentDto.parse(await backend.patch(`/staff/shop-payments/${id}`, decision)),

  accessPlans: async (signal?: AbortSignal) =>
    arrayOf(staffPlanDto)(await backend.get('/staff/access-plans', undefined, signal)),

  saveAccessPlan: async (plan: Omit<StaffAccessPlan, 'id'>, id: Id | null) =>
    staffPlanDto.parse(
      id ? await backend.patch(`/staff/access-plans/${id}`, plan) : await backend.post('/staff/access-plans', plan),
    ),

  settings: async (signal?: AbortSignal) =>
    marketplaceSettingsDto.parse(await backend.get('/staff/settings/marketplace', undefined, signal)),

  updateSettings: async (patch: Partial<MarketplaceSettings>) =>
    marketplaceSettingsDto.parse(await backend.patch('/staff/settings/marketplace', patch)),
};
