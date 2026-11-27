import { useQuery } from '@tanstack/react-query';
import { homeApi } from './home.api';

export function useAds(placement: string) {
  return useQuery({
    queryKey: ['ads', placement],
    queryFn: ({ signal }) => homeApi.ads(placement, signal),
    staleTime: 10 * 60_000,
  });
}

export function useExclusiveOffers() {
  return useQuery({ queryKey: ['offers'], queryFn: ({ signal }) => homeApi.offers(signal), staleTime: 10 * 60_000 });
}
