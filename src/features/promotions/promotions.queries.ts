import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { promotionsApi } from './promotions.api';

/** Codes personnels du client connecté (bienvenue, anniversaire). */
export function useMyPromoCodes() {
  const userId = useAuthStore((s) => s.userId);
  return useQuery({
    queryKey: ['promoCodes', 'mine', userId],
    queryFn: ({ signal }) => promotionsApi.mine(signal),
    enabled: !!userId,
  });
}

export function usePublicPromoCodes() {
  return useQuery({ queryKey: ['promoCodes', 'public'], queryFn: ({ signal }) => promotionsApi.publicCodes(signal) });
}
