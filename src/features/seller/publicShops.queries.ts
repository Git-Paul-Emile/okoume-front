import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { publicShopsBackend } from './publicShops.backend';

export function usePublicShops(page: number) {
  return useQuery({
    queryKey: ['public-shops', page],
    queryFn: ({ signal }) => publicShopsBackend.list(page, signal),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
