import { z } from 'zod';
import { ApiError } from '@/api/ApiError';
import { backend, getPage } from '@/api/backend';
import type { Id } from '@/api/types';

/** Moyens de paiement acceptés et modes de remise d'une boutique (32.2). */
export const PAYMENT_METHODS = ['cash', 'airtel', 'moov'] as const;
export type ShopPaymentMethod = (typeof PAYMENT_METHODS)[number];
export const HANDOVER_MODES = ['pickup', 'seller_delivery'] as const;
export type HandoverMode = (typeof HANDOVER_MODES)[number];

export const paymentLabel: Record<ShopPaymentMethod, string> = {
  cash: 'Espèces',
  airtel: 'Airtel Money',
  moov: 'Moov Money',
};

export const handoverLabel: Record<HandoverMode, string> = {
  pickup: 'Retrait chez le vendeur',
  seller_delivery: 'Livraison par le vendeur',
};

/**
 * Espace vendeur sur l'API (api/src/features/shops, seller-dashboard ; produits, commandes, livraison et
 * reversements dans sellerProducts.backend.ts et sellerOrders.backend.ts).
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

const dashboardDto = z.object({
  shop: z.object({
    name: z.string(),
    slug: z.string(),
    status: z.enum(['active', 'suspended']),
    verified: z.boolean(),
    plan: z.object({ name: z.string(), kind: z.enum(['free', 'paid']) }),
    access: accessDto,
  }),
  products: z.object({
    published: z.number(),
    draft: z.number(),
    archived: z.number(),
    inReview: z.number(),
    changesRequested: z.number(),
    pendingModeration: z.number(),
    rejected: z.number(),
  }),
  orders: z.object({ toPrepare: z.number(), toDeliver: z.number(), toCollect: z.number() }),
});

export type SellerDashboard = z.infer<typeof dashboardDto>;

/** Champs d'une boutique, à l'ouverture comme en modification. */
export interface ShopFields {
  name: string;
  description: string;
  city: string;
  district: string;
  phone: string;
  acceptedPaymentMethods: ShopPaymentMethod[];
  handoverModes: HandoverMode[];
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

  dashboard: async (signal?: AbortSignal) =>
    dashboardDto.parse(await backend.get('/seller/dashboard', undefined, signal)),
};

export const accessLabel: Record<AccessState, string> = {
  suspended: 'Boutique suspendue',
  awaiting_payment: 'En attente du paiement de l’offre',
  trial: 'Période d’essai',
  active: 'Accès actif',
  grace: 'Accès échu : délai de grâce',
  expired: 'Accès expiré : produits masqués',
};

export const decisionLabel: Record<ShopPayment['status'], string> = {
  pending: 'À vérifier par OKOZA',
  validated: 'Validé',
  refused: 'Refusé',
};
