import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { ordersApi } from './orders.api';

export function useMyOrders({ enabled = true }: { enabled?: boolean } = {}) {
  const userId = useAuthStore((state) => state.userId);
  return useQuery({
    queryKey: ['orders', 'mine', userId],
    queryFn: ({ signal }) => ordersApi.forUser(userId!, signal),
    enabled: enabled && !!userId,
  });
}

export function useOrder(number: string | undefined) {
  const userId = useAuthStore((state) => state.userId);
  return useQuery({
    queryKey: ['orders', 'number', number],
    queryFn: ({ signal }) => ordersApi.byNumber(number!, userId, signal),
    enabled: !!number,
  });
}

export function useTrackOrder() {
  return useMutation({ mutationFn: ({ number, code }: { number: string; code: string }) => ordersApi.track(number, code) });
}
