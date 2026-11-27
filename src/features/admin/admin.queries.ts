import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/api/ApiError';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { toast } from '@/stores/toastStore';
import { adminApi } from './admin.api';
import { staffBackend } from './staff.backend';

const list = <T,>(key: string, fn: (signal?: AbortSignal) => Promise<T>) => () =>
  useQuery({ queryKey: ['admin', key], queryFn: ({ signal }) => fn(signal) });

export const useAdminOrders = list('orders', adminApi.orders);
export const useAdminProducts = list('products', adminApi.products);
export const useStockMovements = list('stockMovements', adminApi.stockMovements);
export const usePriceChanges = list('priceChanges', adminApi.priceChanges);
export const useAdminCategories = list('categories', adminApi.categories);
export const useAdminPromoCodes = list('promoCodes', adminApi.promoCodes);
export const useAdminReviews = list('reviews', adminApi.reviews);
export const useAdminAds = list('ads', adminApi.ads);
export const useAdminZones = list('deliveryZones', adminApi.deliveryZones);
export const useAdminSettings = list('settings', adminApi.settings);
export const useCouriers = list('couriers', adminApi.couriers);

export function endAdminSession() {
  void staffBackend.logout().catch(() => undefined);
  useAdminAuthStore.getState().setAdmin(null);
}

export function useAdminMutation<TVars, TResult = unknown>(
  fn: (vars: TVars) => Promise<TResult>,
  success?: string | ((vars: TVars) => string),
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_result, vars) => {
      const message = success ? (typeof success === 'function' ? success(vars) : success) : null;
      if (message) toast.success(message);
      void queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'admin' });
      return queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (error) => toast.error('Action impossible', { description: getErrorMessage(error) }),
  });
}
