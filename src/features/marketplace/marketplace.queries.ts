import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Id } from '@/api/types';
import { marketplaceBackend, type ListingFilters, type Position, type ReportReason } from './marketplace.backend';

export function useListings(filters: ListingFilters, near: { position: Position; maxKm: number | null } | null) {
  return useQuery({
    // La position n'entre dans la clé qu'arrondie par l'API : ici, elle reste en mémoire seulement
    queryKey: ['listings', 'search', filters, near],
    queryFn: ({ signal }) =>
      near
        ? marketplaceBackend.searchNearby(filters, near.position, near.maxKm, signal)
        : marketplaceBackend.search(filters, signal),
    placeholderData: keepPreviousData,
  });
}

export function useListing(slug: string | undefined) {
  return useQuery({
    queryKey: ['listings', 'slug', slug],
    queryFn: ({ signal }) => marketplaceBackend.listing(slug!, signal),
    enabled: !!slug,
  });
}

export function usePublicShop(slug: string | undefined) {
  return useQuery({
    queryKey: ['shops', 'slug', slug],
    queryFn: ({ signal }) => marketplaceBackend.shop(slug!, signal),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useMyListingRequests(page: number) {
  return useQuery({
    queryKey: ['listing-requests', 'mine', page],
    queryFn: ({ signal }) => marketplaceBackend.myRequests(page, signal),
    placeholderData: keepPreviousData,
  });
}

export function useCreateListingRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: marketplaceBackend.createRequest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['listing-requests'] }),
  });
}

export function useCancelListingRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: Id; reason: string }) => marketplaceBackend.cancelRequest(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['listing-requests'] }),
  });
}

export function useReportListing() {
  return useMutation({
    mutationFn: ({ slug, reason, comment }: { slug: string; reason: ReportReason; comment: string }) =>
      marketplaceBackend.report(slug, reason, comment),
  });
}

export function useOpenConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: marketplaceBackend.openConversation,
    onSuccess: (conversation) => {
      qc.setQueryData(['conversations', 'buyer', conversation.id], conversation);
      void qc.invalidateQueries({ queryKey: ['conversations', 'buyer', 'list'] });
    },
  });
}

export function useMyConversations(page: number) {
  return useQuery({
    queryKey: ['conversations', 'buyer', 'list', page],
    queryFn: ({ signal }) => marketplaceBackend.conversations(page, signal),
    placeholderData: keepPreviousData,
  });
}
