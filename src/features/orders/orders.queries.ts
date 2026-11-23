import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { ordersApi, type ReturnInput } from './orders.api';
import type { CancellationRequest, Order } from './orders.types';

export function useMyOrders({ enabled = true }: { enabled?: boolean } = {}) {
  const userId = useAuthStore((s) => s.userId);
  return useQuery({
    queryKey: ['orders', 'mine', userId],
    queryFn: ({ signal }) => ordersApi.forUser(userId!, signal),
    enabled: enabled && !!userId,
  });
}

/** Commande passée sans compte ajoutée au compte : la liste « Mes commandes » est relue. */
export function useClaimOrder() {
  const userId = useAuthStore((s) => s.userId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ number, code }: { number: string; code: string }) => ordersApi.claim(number, code, userId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders', 'mine'] }),
  });
}

export function useOrder(number: string | undefined) {
  const userId = useAuthStore((s) => s.userId);
  return useQuery({
    queryKey: ['orders', 'number', number],
    queryFn: ({ signal }) => ordersApi.byNumber(number!, userId, signal),
    enabled: !!number,
  });
}

export function useTrackOrder() {
  return useMutation({
    mutationFn: ({ number, code }: { number: string; code: string }) => ordersApi.track(number, code),
  });
}

function useOrderMutation<V>(fn: (order: Order, vars: V) => Promise<Order>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ order, ...vars }: { order: Order } & V) => fn(order, vars as V),
    onSuccess: (order) => {
      qc.setQueryData(['orders', 'number', order.number], order);
      void qc.invalidateQueries({ queryKey: ['orders', 'mine'] });
    },
  });
}

export function useCancelOrder() {
  return useOrderMutation<{ request: Omit<CancellationRequest, 'status' | 'createdAt'> }>((order, v) =>
    ordersApi.requestCancellation(order, v.request),
  );
}

export function useRequestReturn() {
  return useOrderMutation<{ request: ReturnInput }>((order, v) => ordersApi.requestReturn(order, v.request));
}

export function useDisputeDelivery() {
  return useOrderMutation<{ message: string }>((order, v) => ordersApi.disputeDelivery(order, v.message));
}

export function useReopenReturn() {
  return useOrderMutation<{ message: string }>((order, v) => ordersApi.reopenReturn(order, v.message));
}
