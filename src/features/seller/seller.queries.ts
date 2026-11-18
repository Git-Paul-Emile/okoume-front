import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Id } from '@/api/types';
import type { ChatSource } from '@/features/marketplace/useChat';
import { sellerBackend, type ListingFields, type SellerListingStatus } from './seller.backend';

/** Toutes les données de l'espace vendeur sont sous cette clé : une action les rafraîchit ensemble. */
const SELLER = 'seller';

export const sellerChat: ChatSource = {
  scope: 'seller',
  get: sellerBackend.conversation,
  send: sellerBackend.send,
};

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

export function useSellerListings(status: SellerListingStatus | undefined, page: number) {
  return useQuery({
    queryKey: [SELLER, 'listings', status ?? 'all', page],
    queryFn: ({ signal }) => sellerBackend.listings(status, page, signal),
    placeholderData: keepPreviousData,
  });
}

export function useSellerListing(id: Id | undefined) {
  return useQuery({
    queryKey: [SELLER, 'listing', id],
    queryFn: ({ signal }) => sellerBackend.listing(id!, signal),
    enabled: !!id,
  });
}

export function useListingStats(id: Id | undefined, published: boolean) {
  return useQuery({
    queryKey: [SELLER, 'listing-stats', id],
    queryFn: ({ signal }) => sellerBackend.listingStats(id!, signal),
    enabled: !!id && published,
  });
}

export function useSellerRequests(page: number) {
  return useQuery({
    queryKey: [SELLER, 'requests', page],
    queryFn: ({ signal }) => sellerBackend.requests(page, signal),
    placeholderData: keepPreviousData,
  });
}

export function useSellerConversations(needsSeller: boolean, page: number) {
  return useQuery({
    queryKey: ['conversations', 'seller', 'list', needsSeller, page],
    queryFn: ({ signal }) => sellerBackend.conversations(needsSeller, page, signal),
    placeholderData: keepPreviousData,
  });
}

export function useBoostPlans() {
  return useQuery({
    queryKey: ['boost-plans'],
    queryFn: ({ signal }) => sellerBackend.boostPlans(signal),
    staleTime: 10 * 60_000,
  });
}

export function useBoosts(page: number) {
  return useQuery({
    queryKey: [SELLER, 'boosts', page],
    queryFn: ({ signal }) => sellerBackend.boosts(page, signal),
    placeholderData: keepPreviousData,
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

export const useSaveListing = () =>
  useSellerAction(({ id, fields }: { id: Id | null; fields: ListingFields }) =>
    id ? sellerBackend.updateListing(id, fields) : sellerBackend.createListing(fields),
  );
