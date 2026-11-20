import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sellerProductsBackend, type SellerProductModeration } from './sellerProducts.backend';
import { sellerOrdersBackend } from './sellerOrders.backend';
import type { OrderStatus } from '@/features/orders/orders.types';
import type { Id } from '@/api/types';
import { sellerBackend } from './seller.backend';

/** Toutes les données de l'espace vendeur sont sous cette clé : une action les rafraîchit ensemble. */
const SELLER = 'seller';

export function useSellerShop() {
  return useQuery({
    queryKey: [SELLER, 'shop'],
    queryFn: ({ signal }) => sellerBackend.shop(signal),
  });
}

export function useAccessPlans() {
  return useQuery({
    queryKey: ['access-plans'],
    queryFn: ({ signal }) => sellerBackend.plans(signal),
    staleTime: 10 * 60_000,
  });
}

export function useShopPayments(page: number) {
  return useQuery({
    queryKey: [SELLER, 'payments', page],
    queryFn: ({ signal }) => sellerBackend.shopPayments(page, signal),
    placeholderData: keepPreviousData,
  });
}

export function useSellerDashboard() {
  return useQuery({
    queryKey: [SELLER, 'dashboard'],
    queryFn: ({ signal }) => sellerBackend.dashboard(signal),
  });
}

/** Action du vendeur : toutes les données de l'espace vendeur sont relues ensuite. */
export function useSellerAction<V, R>(fn: (vars: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: [SELLER] }),
  });
}

/** Produits de la boutique (32.3), filtrables par état de vérification. */
export function useSellerProducts(moderation: SellerProductModeration | undefined, page: number) {
  return useQuery({
    queryKey: [SELLER, 'products', moderation ?? 'all', page],
    queryFn: ({ signal }) => sellerProductsBackend.list(moderation, page, signal),
    placeholderData: keepPreviousData,
  });
}

export function useSellerProduct(id: Id | undefined) {
  return useQuery({
    queryKey: [SELLER, 'product', id],
    queryFn: ({ signal }) => sellerProductsBackend.get(id!, signal),
    enabled: !!id,
  });
}

/** Commandes reçues par la boutique (32.4), filtrables par état. */
export function useSellerOrders(status: OrderStatus | undefined, page: number) {
  return useQuery({
    queryKey: [SELLER, 'orders', status ?? 'all', page],
    queryFn: ({ signal }) => sellerOrdersBackend.list(status, page, signal),
    placeholderData: keepPreviousData,
  });
}

export function useSellerOrder(id: Id | undefined) {
  return useQuery({
    queryKey: [SELLER, 'order', id],
    queryFn: ({ signal }) => sellerOrdersBackend.get(id!, signal),
    enabled: !!id,
  });
}

export function useShopDelivery() {
  return useQuery({ queryKey: [SELLER, 'delivery'], queryFn: ({ signal }) => sellerOrdersBackend.delivery(signal) });
}

export function useSellerPayouts(page: number) {
  return useQuery({
    queryKey: [SELLER, 'payouts', page],
    queryFn: ({ signal }) => sellerOrdersBackend.payouts(page, signal),
    placeholderData: keepPreviousData,
  });
}
