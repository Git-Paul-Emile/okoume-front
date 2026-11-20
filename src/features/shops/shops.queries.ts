import { useQuery } from '@tanstack/react-query';
import { shopsApi } from './shops.api';

export function usePublicShop(slug: string) {
  return useQuery({
    queryKey: ['shops', slug],
    queryFn: ({ signal }) => shopsApi.bySlug(slug, signal),
    staleTime: 5 * 60_000,
  });
}
