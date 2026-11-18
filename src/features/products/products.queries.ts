import { useQuery } from '@tanstack/react-query';
import type { Id } from '@/api/types';
import { productsApi } from './products.api';

export const productKeys = {
  all: ['products'] as const,
  list: () => [...productKeys.all, 'list'] as const,
  detail: (slug: string) => [...productKeys.all, 'detail', slug] as const,
  byIds: (ids: Id[]) => [...productKeys.all, 'ids', [...ids].sort()] as const,
};

/** Catalogue complet publié. Le filtrage se fait côté client (catalogue de taille modeste). */
export function useProducts() {
  return useQuery({ queryKey: productKeys.list(), queryFn: ({ signal }) => productsApi.list(signal) });
}

export function useProduct(slug: string) {
  return useQuery({ queryKey: productKeys.detail(slug), queryFn: ({ signal }) => productsApi.bySlug(slug, signal) });
}

export function useProductsByIds(ids: Id[]) {
  return useQuery({
    queryKey: productKeys.byIds(ids),
    queryFn: ({ signal }) => productsApi.byIds(ids, signal),
    enabled: ids.length > 0,
    placeholderData: (prev) => prev,
  });
}
