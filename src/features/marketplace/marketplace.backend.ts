import { z } from 'zod';
import { backend, getPage, type PageOf } from '@/api/backend';
import type { Id } from '@/api/types';

/**
 * Place de marché, côté acheteur, sur l'API (api/src/features/listings, shops, listing-requests, chat).
 * Chaque réponse est validée avant affichage.
 */

export const CONDITIONS = ['new', 'like_new', 'good', 'used'] as const;
export type ListingCondition = (typeof CONDITIONS)[number];
export const PAYMENT_METHODS = ['cash', 'airtel', 'moov'] as const;
export type MarketPaymentMethod = (typeof PAYMENT_METHODS)[number];
export const HANDOVER_MODES = ['pickup', 'seller_delivery'] as const;
export type HandoverMode = (typeof HANDOVER_MODES)[number];
export const REPORT_REASONS = [
  'prohibited',
  'scam',
  'misleading',
  'offensive',
  'personal_data',
  'inappropriate_photos',
  'spam',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

const listingDto = z.object({
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
  shop: z.object({ slug: z.string(), name: z.string(), verified: z.boolean() }),
  sold: z.boolean(),
  publishedAt: z.string().nullable(),
});

/** Annonce publique ; distance arrondie et mise en avant seulement dans les résultats de recherche. */
export type Listing = z.infer<typeof listingDto> & { distanceKm: number | null; sponsored: boolean };

const searchHit = listingDto.extend({ distanceKm: z.number().nullable(), sponsored: z.boolean() });

export const toListing = (raw: unknown): Listing => {
  const hit = searchHit.partial({ distanceKm: true, sponsored: true }).parse(raw);
  return { ...hit, distanceKm: hit.distanceKm ?? null, sponsored: hit.sponsored ?? false };
};

const shopDto = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  city: z.string(),
  district: z.string().nullable(),
  acceptedPaymentMethods: z.array(z.enum(PAYMENT_METHODS)),
  handoverModes: z.array(z.enum(HANDOVER_MODES)),
  verified: z.boolean(),
});

export type PublicShop = z.infer<typeof shopDto>;

const requestStatus = z.enum(['sent', 'accepted', 'refused', 'cancelled', 'concluded', 'not_concluded']);

const requestDto = z.object({
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
  history: z.array(z.object({ status: requestStatus, actor: z.string(), note: z.string().nullable(), at: z.string() })),
  createdAt: z.string(),
  shop: z.object({ slug: z.string(), name: z.string(), phone: z.string().nullable() }),
});

export type ListingRequest = z.infer<typeof requestDto>;
export type RequestStatus = ListingRequest['status'];

const messageDto = z.object({
  id: z.string(),
  author: z.enum(['buyer', 'assistant', 'seller', 'system']),
  body: z.string(),
  createdAt: z.string(),
});

export type ChatMessage = z.infer<typeof messageDto>;

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

export type Conversation = z.infer<typeof conversationDto>;

/** Critères de recherche ; la position n'est jamais mise dans l'adresse (POST /listings/searches). */
export interface ListingFilters {
  search?: string;
  category?: string;
  kind?: 'product' | 'service';
  condition?: ListingCondition[];
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'relevance' | '-publishedAt' | 'price' | '-price' | 'distance';
  page: number;
}

export interface Position {
  latitude: number;
  longitude: number;
}

const PAGE_SIZE = 24;

/** Critères dans la forme de l'API : seuls ceux renseignés sont envoyés. */
export function searchParams(filters: ListingFilters) {
  return {
    page: filters.page,
    limit: PAGE_SIZE,
    ...(filters.search?.trim() ? { search: filters.search.trim() } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(filters.condition?.length ? { condition: filters.condition.join(',') } : {}),
    ...(filters.city?.trim() ? { city: filters.city.trim() } : {}),
    ...(filters.minPrice !== undefined ? { minPrice: filters.minPrice } : {}),
    ...(filters.maxPrice !== undefined ? { maxPrice: filters.maxPrice } : {}),
    ...(filters.sort && filters.sort !== 'distance' ? { sort: filters.sort } : {}),
  };
}

const pageOf = <T>(raw: unknown, toItem: (raw: unknown) => T): PageOf<T> => {
  const page = z
    .object({
      items: z.array(z.unknown()),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      hasNext: z.boolean(),
    })
    .parse(raw);
  return { ...page, items: page.items.map(toItem) };
};

export const marketplaceBackend = {
  /** Recherche sans position : en GET, partageable par lien. */
  search: (filters: ListingFilters, signal?: AbortSignal) =>
    getPage('/listings', searchParams(filters), toListing, signal),

  /** Recherche autour de l'acheteur : position arrondie par l'API, envoyée dans le corps de la requête. */
  async searchNearby(filters: ListingFilters, position: Position, maxKm: number | null, signal?: AbortSignal) {
    const { condition, ...params } = searchParams(filters);
    const raw = await backend.post(
      '/listings/searches',
      {
        ...params,
        ...(condition ? { condition: condition.split(',') } : {}),
        position,
        ...(maxKm ? { maxKm } : {}),
      },
      signal,
    );
    return pageOf(raw, toListing);
  },

  listing: async (slug: string, signal?: AbortSignal) =>
    toListing(await backend.get(`/listings/${encodeURIComponent(slug)}`, undefined, signal)),

  shop: async (slug: string, signal?: AbortSignal) =>
    shopDto.parse(await backend.get(`/shops/${encodeURIComponent(slug)}`, undefined, signal)),

  report: (slug: string, reason: ReportReason, comment: string) =>
    backend.post(`/listings/${encodeURIComponent(slug)}/reports`, { reason, comment: comment.trim() }),

  /** Demande de commande : le prix est celui de l'annonce, ou le prix convenu dans le tchat s'il est valable. */
  async createRequest(input: {
    listingSlug: string;
    quantity: number | null;
    paymentMethod: MarketPaymentMethod;
    handover: HandoverMode;
    contactPhone: string;
    message: string;
  }): Promise<ListingRequest> {
    return requestDto.parse(await backend.post('/listing-requests', { ...input, message: input.message.trim() }));
  },

  myRequests: (page: number, signal?: AbortSignal) =>
    getPage('/listing-requests', { page, limit: 20 }, (raw) => requestDto.parse(raw), signal),

  cancelRequest: async (id: Id, reason: string) =>
    requestDto.parse(
      await backend.patch(`/listing-requests/${id}`, {
        action: 'cancel',
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      }),
    ),

  /** Ouvre la conversation sur une annonce, ou retrouve celle qui existe déjà. */
  openConversation: async (listingSlug: string) =>
    conversationDto.parse(await backend.post('/conversations', { listingSlug })),

  conversations: (page: number, signal?: AbortSignal) =>
    getPage('/conversations', { page, limit: 20 }, (raw) => conversationDto.parse(raw), signal),

  /** Conversation et ses messages ; avec `since`, seulement les messages écrits après. */
  conversation: async (id: Id, since?: string, signal?: AbortSignal) =>
    conversationDto.parse(await backend.get(`/conversations/${id}`, since ? { since } : undefined, signal)),

  send: async (id: Id, body: string) =>
    messageDto.parse(await backend.post(`/conversations/${id}/messages`, { body: body.trim() })),

  closeConversation: async (id: Id) =>
    conversationDto.parse(await backend.patch(`/conversations/${id}`, { action: 'close' })),
};

/** Libellés affichés, en français, pour les valeurs de l'API. */
export const conditionLabel: Record<ListingCondition, string> = {
  new: 'Neuf',
  like_new: 'Comme neuf',
  good: 'Bon état',
  used: 'Usé',
};
export const paymentLabel: Record<MarketPaymentMethod, string> = {
  cash: 'Espèces',
  airtel: 'Airtel Money',
  moov: 'Moov Money',
};
export const handoverLabel: Record<HandoverMode, string> = {
  pickup: 'Retrait chez le vendeur',
  seller_delivery: 'Livraison par le vendeur',
};
export const reportLabel: Record<ReportReason, string> = {
  prohibited: 'Produit ou service interdit',
  scam: 'Arnaque ou fraude',
  misleading: 'Annonce trompeuse',
  offensive: 'Contenu choquant',
  personal_data: 'Données personnelles exposées',
  inappropriate_photos: 'Photos inappropriées',
  spam: 'Annonce en double ou publicité',
  other: 'Autre motif',
};
export const requestStatusLabel: Record<RequestStatus, string> = {
  sent: 'Envoyée, en attente du vendeur',
  accepted: 'Acceptée',
  refused: 'Refusée',
  cancelled: 'Annulée',
  concluded: 'Vente conclue',
  not_concluded: 'Vente non conclue',
};
