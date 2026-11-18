import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recordEvent } from '@/features/analytics/analytics.api';
import { userKey } from '@/features/auth/auth.queries';
import { checkoutApi, type PlaceOrderInput } from './checkout.api';

export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaceOrderInput) => {
      recordEvent({ kind: 'checkout' });
      return checkoutApi.placeOrder(input);
    },
    onSuccess: (order, input) => {
      qc.setQueryData(['orders', 'number', order.number], order);
      void qc.invalidateQueries({ queryKey: ['products'] });
      if (input.user) void qc.invalidateQueries({ queryKey: userKey(input.user.id) });
    },
  });
}
