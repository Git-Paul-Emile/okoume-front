import { z } from 'zod';
import { ApiError } from '@/api/ApiError';
import { backend, getAll } from '@/api/backend';
import type { Id } from '@/api/types';
import type { InvoiceDocument } from '@/features/invoices/invoice.rules';
import { toInvoiceDocument } from '@/features/orders/orders.backend';
import type { ReturnRequest } from '@/features/orders/orders.types';
import type { PromoCode } from '@/features/promotions/promotions.types';

/**
 * Retours, codes promo et factures de l'équipe sur l'API (api/src/features/staff-returns, staff-promo-codes,
 * invoices). Les retours passent par décision, réception et remboursement.
 */

const API_TO_FRONT_STATUS = {
  pending: 'pending',
  refused: 'refused',
  // Retour accepté : le colis est attendu.
  expected: 'accepted',
  // Les dossiers déjà reçus sous l'ancien parcours sont proposés à la même confirmation simplifiée.
  received: 'accepted',
  refund_due: 'refund_due',
  refunded: 'refunded',
  closed: 'closed',
} as const;

const staffReturnDto = z.object({
  id: z.string(),
  orderId: z.string(),
  status: z.enum(['pending', 'refused', 'expected', 'received', 'refund_due', 'refunded', 'closed']),
  reason: z.string(),
  comment: z.string(),
  items: z.array(
    z.object({
      variantId: z.string(),
      quantity: z.number(),
    }),
  ),
  decisionReason: z.string().nullable(),
  reopenRequestedAt: z.string().nullable(),
  history: z.array(
    z.object({
      status: z.string(),
      note: z.string().nullable(),
      by: z.string().optional(),
      at: z.string(),
    }),
  ),
  createdAt: z.string(),
});

/** Dossier de retour de l'équipe dans la forme du back-office, rattaché à sa commande par orderId. */
export function toStaffReturn(raw: unknown): { orderId: Id; request: ReturnRequest } {
  const r = staffReturnDto.parse(raw);
  const request: ReturnRequest = {
    id: r.id,
    items: r.items.map(({ variantId, quantity }) => ({ variantId, quantity })),
    reason: r.reason,
    comment: r.comment,
    status: API_TO_FRONT_STATUS[r.status],
    createdAt: r.createdAt,
    ...(r.decisionReason ? { decisionReason: r.decisionReason } : {}),
    ...(r.reopenRequestedAt ? { reopenRequestedAt: r.reopenRequestedAt } : {}),
  };
  return { orderId: r.orderId, request };
}

/** Accord sur un retour : prise en charge des frais de renvoi décidée au cas par cas, avec ses motifs. */
export interface ReturnAcceptance {
  decisionReason: string;
  shippingPaidBy: 'shop' | 'customer';
  shippingReason: string;
}

const returnRoute = (request: ReturnRequest, step: string) => {
  if (!request.id) throw new ApiError('Dossier de retour introuvable : rechargez la page.', 409);
  return `/staff/returns/${request.id}/${step}`;
};

const promoCodeDto = z.object({
  id: z.string(),
  code: z.string(),
  label: z.string(),
  type: z.enum(['percent', 'fixed']),
  value: z.number(),
  minAmount: z.number(),
  freeDelivery: z.boolean(),
  endsAt: z.string(),
  maxUses: z.number().nullable(),
  uses: z.number(),
  active: z.boolean(),
  productIds: z.array(z.string()),
  categoryIds: z.array(z.string()),
});

/** Les champs de ciblage personnalisés historiques ne sont plus exposés dans le MVP. */
export function toPromoCode(raw: unknown): PromoCode {
  return promoCodeDto.parse(raw);
}

const PROMO_FIELDS = [
  'code',
  'label',
  'type',
  'value',
  'minAmount',
  'freeDelivery',
  'endsAt',
  'maxUses',
  'active',
  'productIds',
  'categoryIds',
] as const;

/**
 * Champs de coupon simple acceptés par l'API ; les anciennes règles personnalisées restent historiques.
 */
export function promoCodeBody(code: Partial<PromoCode>) {
  const body: Record<string, unknown> = {};
  for (const key of PROMO_FIELDS) if (code[key] !== undefined) body[key] = code[key];
  return body;
}

export const adminCommerceBackend = {
  /**
   * Dossiers de retour, par commande. Un membre sans droit sur les retours (403) voit les commandes
   * sans leurs retours plutôt qu'une erreur sur toute la liste.
   */
  async returnsByOrder(signal?: AbortSignal): Promise<Map<Id, ReturnRequest>> {
    try {
      const all = await getAll('/staff/returns', {}, toStaffReturn, signal);
      return new Map(all.map((r) => [r.orderId, r.request] as const));
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) return new Map();
      throw error;
    }
  },

  acceptReturn: (request: ReturnRequest, acceptance: ReturnAcceptance) =>
    backend.post(returnRoute(request, 'decision'), { status: 'accepted', ...acceptance }),
  refuseReturn: (request: ReturnRequest, decisionReason: string) =>
    backend.post(returnRoute(request, 'decision'), { status: 'refused', decisionReason }),
  receiveReturn: (request: ReturnRequest) => backend.post(returnRoute(request, 'reception')),

  promoCodes: (signal?: AbortSignal) => getAll('/staff/promo-codes', {}, toPromoCode, signal),

  createPromoCode: async (code: PromoCode) =>
    toPromoCode(await backend.post('/staff/promo-codes', promoCodeBody(code))),

  updatePromoCode: async (id: Id, patch: Partial<PromoCode>) =>
    toPromoCode(await backend.patch(`/staff/promo-codes/${id}`, promoCodeBody(patch))),

  /** Factures et avoirs émis par l'API, du plus récent au plus ancien. */
  invoices: (signal?: AbortSignal): Promise<InvoiceDocument[]> =>
    getAll(
      '/staff/invoices',
      {},
      (raw) => {
        const customerId = z.object({ customerId: z.string().nullable() }).parse(raw).customerId;
        return { ...toInvoiceDocument(raw, customerId ?? ''), userId: customerId };
      },
      signal,
    ),
};
