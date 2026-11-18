import { z } from 'zod';
import { ApiError } from '@/api/ApiError';
import { backend, getPage } from '@/api/backend';
import { signedUploadDto, uploadPhoto } from '@/api/mediaUpload';
import type { Id } from '@/api/types';
import {
  CONDITIONS,
  HANDOVER_MODES,
  PAYMENT_METHODS,
  type ChatMessage,
  type Conversation,
  type HandoverMode,
  type ListingCondition,
  type MarketPaymentMethod,
} from '@/features/marketplace/marketplace.backend';
import type { ImageUploader } from '@/utils/upload';

/**
 * Espace vendeur sur l'API (api/src/features/shops, listings, listing-requests, chat, seller-dashboard, boosts).
 * La boutique est toujours celle du compte connecté : aucune route ne prend d'identifiant de boutique.
 */

export const planDto = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  kind: z.enum(['free', 'paid']),
  price: z.number(),
  periodDays: z.number().nullable(),
  trialDays: z.number(),
  active: z.boolean(),
});

export type AccessPlan = z.infer<typeof planDto>;

const accessDto = z.object({
  state: z.enum(['suspended', 'awaiting_payment', 'trial', 'active', 'grace', 'expired']),
  visible: z.boolean(),
  endsAt: z.string().nullable(),
  graceEndsAt: z.string().nullable(),
});

export type AccessState = z.infer<typeof accessDto>['state'];

export const shopDto = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  city: z.string(),
  district: z.string().nullable(),
  position: z.object({ latitude: z.number(), longitude: z.number() }).nullable(),
  phone: z.string(),
  acceptedPaymentMethods: z.array(z.enum(PAYMENT_METHODS)),
  handoverModes: z.array(z.enum(HANDOVER_MODES)),
  plan: planDto,
  access: accessDto,
  status: z.enum(['active', 'suspended']),
  suspensionReason: z.string().nullable(),
  verified: z.boolean(),
});

export type SellerShop = z.infer<typeof shopDto>;

const decision = z.enum(['pending', 'validated', 'refused']);

export const shopPaymentDto = z.object({
  id: z.string(),
  plan: z.object({ name: z.string() }),
  amount: z.number(),
  method: z.enum(['airtel', 'moov']),
  reference: z.string(),
  status: decision,
  decisionReason: z.string().nullable(),
  periodStart: z.string().nullable(),
  periodEnd: z.string().nullable(),
  createdAt: z.string(),
});

export type ShopPayment = z.infer<typeof shopPaymentDto>;

export const LISTING_STATUSES = [
  'draft',
  'in_review',
  'changes_requested',
  'pending_moderation',
  'published',
  'rejected',
  'withdrawn',
  'sold',
] as const;
export type SellerListingStatus = (typeof LISTING_STATUSES)[number];

export const reviewDto = z.object({
  version: z.number(),
  source: z.enum(['ai', 'staff']),
  outcome: z.enum(['approved', 'changes_requested', 'moderation', 'rejected']),
  issues: z.array(z.object({ field: z.string(), message: z.string() })),
  reason: z.string().nullable(),
  createdAt: z.string(),
});

const sellerListingDto = z.object({
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
  negotiation: z.object({ minPrice: z.number().nullable(), sellerNotes: z.string() }),
  lastReview: reviewDto.nullable(),
  submittedAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
});

export type SellerListing = z.infer<typeof sellerListingDto>;

const requestStatus = z.enum(['sent', 'accepted', 'refused', 'cancelled', 'concluded', 'not_concluded']);

const sellerRequestDto = z.object({
  id: z.string(),
  number: z.string(),
  listing: z.object({ slug: z.string(), title: z.string() }),
  quantity: z.number().nullable(),
  unitPrice: z.number(),
  total: z.number(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  handover: z.enum(HANDOVER_MODES),
  message: z.string(),
  status: requestStatus,
  reason: z.string().nullable(),
  createdAt: z.string(),
  buyer: z.object({ firstName: z.string(), phone: z.string().nullable() }),
});

export type SellerRequest = z.infer<typeof sellerRequestDto>;

const messageDto = z.object({
  id: z.string(),
  author: z.enum(['buyer', 'assistant', 'seller', 'system']),
  body: z.string(),
  createdAt: z.string(),
});

const conversationDto = z.object({
  id: z.string(),
  listing: z.object({ slug: z.string(), title: z.string() }),
  shop: z.object({ name: z.string() }),
  status: z.enum(['open', 'closed']),
  needsSeller: z.boolean(),
  agreement: z.object({ price: z.number(), expiresAt: z.string() }).nullable(),
  lastMessageAt: z.string(),
  messages: z.array(messageDto),
});

const dashboardDto = z.object({
  shop: z.object({
    name: z.string(),
    slug: z.string(),
    status: z.enum(['active', 'suspended']),
    verified: z.boolean(),
    plan: z.object({ name: z.string(), kind: z.enum(['free', 'paid']) }),
    access: accessDto,
  }),
  // Nombre d'annonces par état ; un état sans annonce est absent
  listings: z.record(z.string(), z.number()),
  requests: z.object({ awaitingAnswer: z.number(), accepted: z.number() }),
  conversations: z.object({ awaitingSeller: z.number() }),
  views: z.object({
    periodDays: z.number(),
    total: z.number(),
    topListings: z.array(z.object({ id: z.string(), slug: z.string(), title: z.string(), views: z.number() })),
  }),
});

export type SellerDashboard = z.infer<typeof dashboardDto>;

const listingStatsDto = z.object({
  total: z.number(),
  daily: z.array(z.object({ day: z.string(), views: z.number() })),
});

export const boostPlanDto = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  durationDays: z.number(),
  price: z.number(),
});

export type BoostPlan = z.infer<typeof boostPlanDto>;

export const boostDto = z.object({
  id: z.string(),
  listing: z.object({ id: z.string(), slug: z.string(), title: z.string() }),
  plan: z.object({ name: z.string(), durationDays: z.number() }),
  amount: z.number(),
  method: z.enum(['airtel', 'moov']),
  reference: z.string(),
  status: decision,
  decisionReason: z.string().nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  createdAt: z.string(),
});

export type Boost = z.infer<typeof boostDto>;

/** Champs d'une boutique, à l'ouverture comme en modification. */
export interface ShopFields {
  name: string;
  description: string;
  city: string;
  district: string;
  phone: string;
  acceptedPaymentMethods: MarketPaymentMethod[];
  handoverModes: HandoverMode[];
}

/** Champs d'une annonce. Le prix minimum reste privé : l'assistant ne le révèle jamais à l'acheteur. */
export interface ListingFields {
  title: string;
  description: string;
  categoryId: Id;
  kind: 'product' | 'service';
  condition: ListingCondition | null;
  price: number;
  quantity: number | null;
  city: string;
  district: string;
  photos: string[];
  minPrice: number | null;
  sellerNotes: string;
}

export interface MobileMoneyDeclaration {
  planId: Id;
  method: 'airtel' | 'moov';
  reference: string;
  amount: number;
}

const list =
  <T>(schema: z.ZodType<T>) =>
  (raw: unknown) =>
    z
      .array(z.unknown())
      .parse(raw)
      .map((x) => schema.parse(x));

export const sellerBackend = {
  plans: async (signal?: AbortSignal) =>
    list(planDto)(await backend.get('/access-plans', undefined, signal)).filter((p) => p.active),

  /** Boutique du compte ; null si le compte n'en a pas encore (404). */
  async shop(signal?: AbortSignal): Promise<SellerShop | null> {
    try {
      return shopDto.parse(await backend.get('/seller/shop', undefined, signal));
    } catch (error) {
      if (error instanceof ApiError && error.isNotFound) return null;
      throw error;
    }
  },

  openShop: async (fields: ShopFields, planId: Id) =>
    shopDto.parse(await backend.post('/seller/shop', { ...fields, position: null, planId })),

  updateShop: async (fields: Partial<ShopFields>) => shopDto.parse(await backend.patch('/seller/shop', fields)),

  /** Passage direct sur une offre gratuite ; une offre payante s'active par un paiement validé. */
  changePlan: async (planId: Id) => shopDto.parse(await backend.put('/seller/shop/plan', { planId })),

  declareShopPayment: async (payment: MobileMoneyDeclaration) =>
    shopPaymentDto.parse(await backend.post('/seller/shop/payments', payment)),

  shopPayments: (page: number, signal?: AbortSignal) =>
    getPage('/seller/shop/payments', { page, limit: 20 }, (raw) => shopPaymentDto.parse(raw), signal),

  listings: (status: SellerListingStatus | undefined, page: number, signal?: AbortSignal) =>
    getPage(
      '/seller/listings',
      { page, limit: 20, ...(status ? { status } : {}) },
      (raw) => sellerListingDto.parse(raw),
      signal,
    ),

  listing: async (id: Id, signal?: AbortSignal) =>
    sellerListingDto.parse(await backend.get(`/seller/listings/${id}`, undefined, signal)),

  createListing: async (fields: ListingFields) =>
    sellerListingDto.parse(await backend.post('/seller/listings', fields)),

  updateListing: async (id: Id, fields: Partial<ListingFields>) =>
    sellerListingDto.parse(await backend.patch(`/seller/listings/${id}`, fields)),

  /** Soumission à la vérification (IA puis, si besoin, une personne) ou retrait de la vente. */
  changeListingStatus: async (id: Id, action: 'submit' | 'withdraw') =>
    sellerListingDto.parse(await backend.patch(`/seller/listings/${id}/status`, { action })),

  listingStats: async (id: Id, signal?: AbortSignal) =>
    listingStatsDto.parse(await backend.get(`/seller/dashboard/listings/${id}`, undefined, signal)),

  dashboard: async (signal?: AbortSignal) =>
    dashboardDto.parse(await backend.get('/seller/dashboard', undefined, signal)),

  requests: (page: number, signal?: AbortSignal) =>
    getPage('/seller/listing-requests', { page, limit: 20 }, (raw) => sellerRequestDto.parse(raw), signal),

  decideRequest: async (
    id: Id,
    action:
      | { action: 'accept' }
      | { action: 'refuse'; reason: string }
      | { action: 'conclude' }
      | { action: 'not_concluded'; reason: string },
  ) => sellerRequestDto.parse(await backend.patch(`/seller/listing-requests/${id}`, action)),

  conversations: (needsSeller: boolean, page: number, signal?: AbortSignal) =>
    getPage(
      '/seller/conversations',
      { page, limit: 20, ...(needsSeller ? { needsSeller: true } : {}) },
      (raw): Conversation => conversationDto.parse(raw),
      signal,
    ),

  conversation: async (id: Id, since?: string, signal?: AbortSignal): Promise<Conversation> =>
    conversationDto.parse(await backend.get(`/seller/conversations/${id}`, since ? { since } : undefined, signal)),

  send: async (id: Id, body: string): Promise<ChatMessage> =>
    messageDto.parse(await backend.post(`/seller/conversations/${id}/messages`, { body: body.trim() })),

  /** Prix proposé par le vendeur lui-même, au plus le prix affiché ; valable le temps fixé par l'administration. */
  agree: async (id: Id, price: number): Promise<Conversation> =>
    conversationDto.parse(await backend.put(`/seller/conversations/${id}/agreement`, { price })),

  boostPlans: async (signal?: AbortSignal) => list(boostPlanDto)(await backend.get('/boost-plans', undefined, signal)),

  declareBoost: async (listingId: Id, payment: MobileMoneyDeclaration) =>
    boostDto.parse(await backend.post(`/seller/listings/${listingId}/boosts`, payment)),

  boosts: (page: number, signal?: AbortSignal) =>
    getPage('/seller/boosts', { page, limit: 20 }, (raw) => boostDto.parse(raw), signal),
};

/** Envoi des photos d'annonce : autorisation signée par l'API pour la boutique du compte, puis envoi direct. */
export const listingPhotoUploader: ImageUploader = async (image) =>
  uploadPhoto(signedUploadDto.parse(await backend.post('/seller/listings/photo-uploads')), image);

export const accessLabel: Record<AccessState, string> = {
  suspended: 'Boutique suspendue',
  awaiting_payment: 'En attente du paiement de l’offre',
  trial: 'Période d’essai',
  active: 'Accès actif',
  grace: 'Accès échu : délai de grâce',
  expired: 'Accès expiré : annonces masquées',
};

export const listingStatusLabel: Record<SellerListingStatus, string> = {
  draft: 'Brouillon',
  in_review: 'En vérification',
  changes_requested: 'Corrections demandées',
  pending_moderation: 'En attente d’un modérateur',
  published: 'Publiée',
  rejected: 'Refusée',
  withdrawn: 'Retirée',
  sold: 'Vendue',
};

export const decisionLabel: Record<ShopPayment['status'], string> = {
  pending: 'À vérifier par Okoumé',
  validated: 'Validé',
  refused: 'Refusé',
};
