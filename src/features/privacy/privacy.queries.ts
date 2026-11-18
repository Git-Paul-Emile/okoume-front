import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { privacyApi, type ClientPrivacyRequestType } from './privacy.api';

export function usePrivacyRequests() {
  const userId = useAuthStore((s) => s.userId);
  return useQuery({
    queryKey: ['privacy', userId],
    queryFn: ({ signal }) => privacyApi.mine(signal),
    enabled: !!userId,
  });
}

export function useCreatePrivacyRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, details }: { type: ClientPrivacyRequestType; details: string }) =>
      privacyApi.create(type, details),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['privacy'] }),
  });
}
