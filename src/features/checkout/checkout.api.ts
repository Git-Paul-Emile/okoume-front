import { ApiError } from '@/api/ApiError';
import { apiFieldErrors } from '@/api/backend';
import type { User } from '@/features/auth/auth.types';
import type { CartLine, CartTotals } from '@/features/cart/cart.types';
import type { Order, PaymentMethod } from '@/features/orders/orders.types';
import { ordersBackend } from '@/features/orders/orders.backend';
import type { DeliveryInput } from './checkout.schemas';

export interface PlaceOrderInput {
  idempotencyKey: string;
  lines: CartLine[];
  totals: CartTotals;
  delivery: DeliveryInput;
  paymentMethod: PaymentMethod;
  /** Code accepté par le devis : seul un code validé est envoyé */
  appliedCode: string | null;
  user: User | null;
}

/** Articles en quantité insuffisante (409) : l'API renvoie un message par article dans ses erreurs. */
export function stockConflictMessages(error: unknown): string[] | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const messages = Object.values(apiFieldErrors(error));
  return messages.length ? messages : null;
}

export const checkoutApi = {
  /** Stock, réservation, prix, code et points sont vérifiés et enregistrés par l'API dans une seule transaction. */
  placeOrder: (input: PlaceOrderInput): Promise<Order> =>
    ordersBackend.place(
      {
        idempotencyKey: input.idempotencyKey,
        lines: input.lines,
        delivery: input.delivery,
        paymentMethod: input.paymentMethod,
        promoCode: input.appliedCode,
        points: input.totals.pointsUsed,
      },
      input.user?.id ?? null,
    ),
};
