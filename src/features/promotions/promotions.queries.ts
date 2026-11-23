import { useQuery } from '@tanstack/react-query';
import { promotionsApi } from './promotions.api';

export function usePublicPromoCodes() {
  return useQuery({ queryKey: ['promoCodes', 'public'], queryFn: ({ signal }) => promotionsApi.publicCodes(signal) });
}
