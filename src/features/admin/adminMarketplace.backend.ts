import { z } from 'zod';
import { backend, getPage } from '@/api/backend';
import type { Id } from '@/api/types';
import { CONDITIONS, REPORT_REASONS } from '@/features/marketplace/marketplace.backend';
import {
  LISTING_STATUSES,
  boostDto,
  boostPlanDto,
  planDto,
  reviewDto,
  shopDto,
  shopPaymentDto,
  type SellerListingStatus,
} from '@/features/seller/seller.backend';

/**
 * Modération de la place de marché par l'équipe (api/src/features/staff-shops, staff-listings, staff-boosts).
 * Droits du domaine « vendeurs » : consulter, modifier (offres, réglages), valider (décisions).
 */

const staffListingDto = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.object({ id: z.string(), label: z.string() }),
  kind: z.enum(['product', 'service']),
  condition: z.enum(CONDITIONS).nullable(),
  price: z.number(),
  quantity: z.number().nullable(),
  city: z.string(),
  district: z.string().nullable(),
  photos: z.array(z.string()),
  status: z.enum(LISTING_STATUSES),
  version: z.number(),
  shop: z.object({ id: z.string(), slug: z.string(), name: z.string(), status: z.enum(['active', 'suspended']) }),
  reviews: z.array(reviewDto.extend({ model: z.string().nullable() })),
  openReports: z.number(),
  submittedAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
});

export type StaffListing = z.infer<typeof staffListingDto>;

const reportDto = z.object({
  id: z.string(),
  listing: z.object({ id: z.string(), slug: z.string(), title: z.string(), shopName: z.string() }),
  reason: z.enum(REPORT_REASONS),
  comment: z.string(),
  status: z.enum(['open', 'dismissed', 'upheld']),
  decidedAt: z.string().nullable(),
  createdAt: z.string(),
});

export type ListingReport = z.infer<typeof reportDto>;

const staffPaymentDto = shopPaymentDto.extend({ shop: z.object({ id: z.string(), name: z.string() }) });
export type StaffShopPayment = z.infer<typeof staffPaymentDto>;

const staffBoostDto = boostDto.extend({ shop: z.object({ id: z.string(), name: z.string() }) });
export type StaffBoost = z.infer<typeof staffBoostDto>;

const staffBoostPlanDto = boostPlanDto.extend({ active: z.boolean(), position: z.number() });
export type StaffBoostPlan = z.infer<typeof staffBoostPlanDto>;

const staffPlanDto = planDto.extend({ position: z.number() });
export type StaffAccessPlan = z.infer<typeof staffPlanDto>;

export type StaffShop = z.infer<typeof shopDto>;

const marketplaceSettingsDto = z.object({
  graceDays: z.number(),
  reminderDays: z.number(),
  aiReviewMonthlyLimit: z.number(),
  agreementValidityHours: z.number(),
  aiChatMonthlyLimit: z.number(),
});

export type MarketplaceSettings = z.infer<typeof marketplaceSettingsDto>;

export type ListingDecision =
  { decision: 'approve' } | { decision: 'request_changes' | 'reject' | 'hide'; reason: string };

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
  listings: (status: SellerListingStatus, p: number, signal?: AbortSignal) =>
    getPage('/staff/listings', { ...page, page: p, status }, (raw) => staffListingDto.parse(raw), signal),

  decideListing: async (id: Id, decision: ListingDecision) =>
    staffListingDto.parse(await backend.patch(`/staff/listings/${id}`, decision)),

  reports: (status: ListingReport['status'], p: number, signal?: AbortSignal) =>
    getPage('/staff/listing-reports', { ...page, page: p, status }, (raw) => reportDto.parse(raw), signal),

  decideReport: async (id: Id, status: 'dismissed' | 'upheld') =>
    reportDto.parse(await backend.patch(`/staff/listing-reports/${id}`, { status })),

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

  boosts: (status: 'pending' | 'validated' | 'refused' | undefined, p: number, signal?: AbortSignal) =>
    getPage(
      '/staff/boosts',
      { ...page, page: p, ...(status ? { status } : {}) },
      (raw) => staffBoostDto.parse(raw),
      signal,
    ),

  decideBoost: async (id: Id, decision: Decision) =>
    staffBoostDto.parse(await backend.patch(`/staff/boosts/${id}`, decision)),

  accessPlans: async (signal?: AbortSignal) =>
    arrayOf(staffPlanDto)(await backend.get('/staff/access-plans', undefined, signal)),

  saveAccessPlan: async (plan: Omit<StaffAccessPlan, 'id'>, id: Id | null) =>
    staffPlanDto.parse(
      id ? await backend.patch(`/staff/access-plans/${id}`, plan) : await backend.post('/staff/access-plans', plan),
    ),

  boostPlans: async (signal?: AbortSignal) =>
    arrayOf(staffBoostPlanDto)(await backend.get('/staff/boost-plans', undefined, signal)),

  saveBoostPlan: async (plan: Omit<StaffBoostPlan, 'id'>, id: Id | null) =>
    staffBoostPlanDto.parse(
      id ? await backend.patch(`/staff/boost-plans/${id}`, plan) : await backend.post('/staff/boost-plans', plan),
    ),

  settings: async (signal?: AbortSignal) =>
    marketplaceSettingsDto.parse(await backend.get('/staff/settings/marketplace', undefined, signal)),

  updateSettings: async (patch: Partial<MarketplaceSettings>) =>
    marketplaceSettingsDto.parse(await backend.patch('/staff/settings/marketplace', patch)),
};
