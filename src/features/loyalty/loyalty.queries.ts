import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { loyaltyApi } from './loyalty.api';

export function useLoyaltyMovements() {
  const userId = useAuthStore((s) => s.userId);
  return useQuery({
    queryKey: ['loyalty', userId],
    queryFn: ({ signal }) => loyaltyApi.movements(userId!, signal),
    enabled: !!userId,
  });
}
