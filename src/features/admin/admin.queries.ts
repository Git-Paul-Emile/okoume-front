import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/api/ApiError';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { toast } from '@/stores/toastStore';
import { adminApi } from './admin.api';
import { invoicesApi } from '@/features/invoices/invoices.api';
import { staffBackend } from './staff.backend';

const list =
  <T>(key: string, fn: (signal?: AbortSignal) => Promise<T>) =>
  () =>
    useQuery({ queryKey: ['admin', key], queryFn: ({ signal }) => fn(signal) });

export const useAdminOrders = list('orders', adminApi.orders);
export const useAdminProducts = list('products', adminApi.products);
export const useStockMovements = list('stockMovements', adminApi.stockMovements);
export const useAdminCategories = list('categories', adminApi.categories);
export const useAdminPromoCodes = list('promoCodes', adminApi.promoCodes);
export const useAdminCustomers = list('customers', adminApi.customers);
export const useAdminReviews = list('reviews', adminApi.reviews);
export const useAdminReviewReports = list('reviewReports', adminApi.reviewReports);
export const useAdminAds = list('ads', adminApi.ads);
export const useAdminBanners = list('banners', adminApi.banners);
export const useAdminZones = list('deliveryZones', adminApi.deliveryZones);
export const useZoneRequests = list('zoneRequests', adminApi.zoneRequests);
export const useAdminSettings = list('settings', adminApi.settings);
export const useAdminTeam = list('team', adminApi.team);
export const useProposalDecisions = list('proposalDecisions', adminApi.proposalDecisions);
export const useAssistantLog = list('assistantLog', adminApi.assistantLog);
export const useActivityLog = list('activityLog', adminApi.activityLog);
export const useCouriers = list('couriers', adminApi.couriers);
export const useAdminLegalPages = list('legalPages', adminApi.legalPages);
export const useAssistantActions = list('assistantActions', adminApi.assistantActions);
export const usePriceChanges = list('priceChanges', adminApi.priceChanges);
export const useAdminAlerts = list('alerts', adminApi.alerts);
export const useInvoices = list('invoices', invoicesApi.all);
export const useSearchLog = list('searchLog', adminApi.searchLog);
export const useProductViews = list('productViews', adminApi.productViews);
export const useSiteStats = list('siteStats', adminApi.siteStats);

/**
 * Ferme la session du back-office : le jeton de renouvellement est aussi révoqué ; sans réseau,
 * la fermeture locale suffit et le jeton d'accès expire de lui-même.
 */
export function endAdminSession() {
  void (async () => {
    await staffBackend.logout().catch(() => undefined);
  })();
  useAdminAuthStore.getState().setAdmin(null);
}

/**
 * Mutation du back-office (chaque action est tracée par le serveur) : message de confirmation, message d'erreur lisible et rafraîchissement
 * de toutes les données (back-office et boutique), puisqu'une action peut toucher plusieurs écrans.
 */
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
      // La boutique se rafraîchit en arrière-plan ; seul le back-office est attendu
      void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'admin' });
      return queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (error) => toast.error('Action impossible', { description: getErrorMessage(error) }),
  });
}
