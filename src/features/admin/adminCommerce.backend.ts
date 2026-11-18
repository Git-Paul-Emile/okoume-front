import { z } from 'zod';
import { ApiError } from '@/api/ApiError';
import { backend, getAll } from '@/api/backend';
import type { Id } from '@/api/types';
import type { InvoiceDocument } from '@/features/invoices/invoice.rules';
import { toInvoiceDocument } from '@/features/orders/orders.backend';
import type { ReturnRequest } from '@/features/orders/orders.types';
import type { PromoCode } from '@/features/promotions/promotions.types';
import type { InspectionLine } from './orders.actions';

/**
 * Retours, codes promo et factures de l'équipe sur l'API (api/src/features/staff-returns, staff-promo-codes,
 * invoices). Chaque étape d'un retour est une action de l'API, qui en trace l'auteur et en applique les effets
 * (stock non revendable, remise en stock, montant remboursable).
 */

const API_TO_FRONT_STATUS = {
  pending: 'pending',
  refused: 'refused',
  // Retour accepté : le colis est attendu (le back-office l'affiche « accepté, colis attendu »)
  expected: 'accepted',
  received: 'received',
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
      resaleable: z.number().nullable(),
      unsellable: z.number().nullable(),
    }),
  ),
  decisionReason: z.string().nullable(),
  inspectionNote: z.string().nullable(),
  restockStatus: z.enum(['none', 'pending', 'done']),
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
  const inspected = r.items.every((i) => i.resaleable !== null && i.unsellable !== null);
  const inspection = r.history.findLast((e) => e.status === 'refund_due');
  const request: ReturnRequest = {
    id: r.id,
    items: r.items.map(({ variantId, quantity }) => ({ variantId, quantity })),
    reason: r.reason,
    comment: r.comment,
    status: API_TO_FRONT_STATUS[r.status],
    createdAt: r.createdAt,
    ...(r.decisionReason ? { decisionReason: r.decisionReason } : {}),
    ...(r.reopenRequestedAt ? { reopenRequestedAt: r.reopenRequestedAt } : {}),
    ...(inspected && inspection
      ? {
          inspection: {
            lines: r.items.map((i) => ({
              variantId: i.variantId,
              resaleable: i.resaleable ?? 0,
              unsellable: i.unsellable ?? 0,
            })),
            note: r.inspectionNote ?? '',
            by: inspection.by ?? 'Équipe',
            at: inspection.at,
          },
        }
      : {}),
    ...(r.restockStatus !== 'none' ? { restock: { status: r.restockStatus } } : {}),
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
  newCustomersOnly: z.boolean(),
  tiers: z.array(z.enum(['bronze', 'argent', 'or'])),
  startsAt: z.string(),
  endsAt: z.string(),
  maxUses: z.number().nullable(),
  perCustomer: z.number().nullable(),
  uses: z.number(),
  active: z.boolean(),
  customerId: z.string().nullable(),
  productIds: z.array(z.string()),
  categoryIds: z.array(z.string()),
});

/** Code de l'API dans la forme du back-office : une limite absente s'écrit null (illimité) ou 0 par client. */
export function toPromoCode(raw: unknown): PromoCode {
  const { customerId, perCustomer, ...code } = promoCodeDto.parse(raw);
  return { ...code, perCustomer: perCustomer ?? 0, ...(customerId ? { userId: customerId } : {}) };
}

const PROMO_FIELDS = [
  'code',
  'label',
  'type',
  'value',
  'minAmount',
  'freeDelivery',
  'newCustomersOnly',
  'tiers',
  'startsAt',
  'endsAt',
  'maxUses',
  'active',
  'productIds',
  'categoryIds',
] as const;

/**
 * Champs du back-office dans la forme de l'API, seulement ceux fournis ; 0 par client signifie sans limite.
 * Le titulaire d'un code personnel ne se change pas depuis le back-office.
 */
export function promoCodeBody(code: Partial<PromoCode>) {
  const body: Record<string, unknown> = {};
  for (const key of PROMO_FIELDS) if (code[key] !== undefined) body[key] = code[key];
  if (code.perCustomer !== undefined) body.perCustomer = code.perCustomer > 0 ? code.perCustomer : null;
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
  inspectReturn: (request: ReturnRequest, lines: InspectionLine[], note: string) =>
    backend.post(returnRoute(request, 'inspection'), { outcome: 'conforming', lines, note: note.trim() }),
  rejectInspection: (request: ReturnRequest, note: string) =>
    backend.post(returnRoute(request, 'inspection'), { outcome: 'non_conforming', note }),
  restockReturn: (request: ReturnRequest) => backend.post(returnRoute(request, 'restock')),

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
