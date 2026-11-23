import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import type { Id } from '@/api/types';
import { useCurrentUser } from '@/features/auth/auth.queries';
import { quote } from '@/features/orders/orders.backend';
import { useSettings } from '@/features/settings/settings.queries';
import { useCartStore } from '@/stores/cartStore';
import { estimateTotals } from './cart.utils';

/**
 * Totaux du panier, avec le code promo et les points choisis, pour une zone de livraison donnée.
 * Les totaux sont ceux du devis serveur (prix de la base, code et points vérifiés) ; le calcul local ne sert
 * qu'à afficher une estimation sans code ni points pendant le tout premier devis.
 */
export function useCartTotals(deliveryFee: number | null = null, zoneId: Id | null = null) {
  const { lines, promoCode } = useCartStore();
  const { user } = useCurrentUser();
  const { data: settings } = useSettings();

  const request = useMemo(
    () => ({
      lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
      zoneId,
      promoCode,
    }),
    [lines, zoneId, promoCode],
  );
  const serverQuote = useQuery({
    queryKey: ['cart', 'quote', request, user?.id ?? null],
    queryFn: ({ signal }) => quote(request, signal),
    enabled: lines.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const estimate = useMemo(
    () => estimateTotals(lines, deliveryFee),
    [lines, deliveryFee],
  );

  return {
    lines,
    totals: serverQuote.data ?? estimate,
    appliedCode: promoCode && serverQuote.data && !serverQuote.data.codeError ? promoCode : null,
    promoLoading: serverQuote.isFetching && !!promoCode,
    quoteError: serverQuote.error ? getErrorMessage(serverQuote.error) : null,
    settings: settings ?? null,
    user,
  };
}
