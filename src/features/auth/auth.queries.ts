import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ApiError } from '@/api/ApiError';
import type { Id } from '@/api/types';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from './auth.api';
import type { Address, User } from './auth.types';

export const userKey = (id: string | null) => ['user', id] as const;
const isUnauthorized = (error: unknown) => error instanceof ApiError && error.status === 401;

export function useCurrentUser() {
  const userId = useAuthStore((s) => s.userId);
  const setUserId = useAuthStore((s) => s.setUserId);
  const query = useQuery({
    queryKey: userKey(userId), queryFn: ({ signal }) => authApi.me(signal), enabled: !!userId,
    staleTime: 30_000, retry: (count, error) => !isUnauthorized(error) && count < 2,
  });
  const expired = isUnauthorized(query.error);
  useEffect(() => { if (expired) setUserId(null); }, [expired, setUserId]);
  return { ...query, user: query.data ?? null, isAuthenticated: !!userId };
}

export function useLogin() {
  const qc = useQueryClient();
  const setUserId = useAuthStore((s) => s.setUserId);
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => authApi.login(email, password),
    onSuccess: (user) => { qc.setQueryData(userKey(user.id), user); setUserId(user.id); },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  const setUserId = useAuthStore((s) => s.setUserId);
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (user) => {
      qc.setQueryData(userKey(user.id), user);
      setUserId(user.id);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const setUserId = useAuthStore((s) => s.setUserId);
  return () => {
    void authApi.logout().catch(() => undefined);
    setUserId(null);
    qc.removeQueries({ queryKey: ['user'] });
    qc.removeQueries({ queryKey: ['orders'] });
    qc.removeQueries({ queryKey: ['seller'] });
  };
}

export function useUpdateUser() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  return useMutation({
    mutationFn: (patch: Partial<User>) => authApi.update(patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: userKey(userId) });
      const previous = qc.getQueryData<User>(userKey(userId));
      if (previous) qc.setQueryData<User>(userKey(userId), { ...previous, ...patch });
      return { previous };
    },
    onError: (_error, _patch, context) => { if (context?.previous) qc.setQueryData(userKey(userId), context.previous); },
    onSuccess: (user) => qc.setQueryData(userKey(userId), user),
  });
}

export function useAddressActions() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const onSuccess = (user: User) => qc.setQueryData(userKey(userId), user);
  return {
    add: useMutation({ mutationFn: (address: Omit<Address, 'id' | 'isDefault'>) => authApi.addAddress(address), onSuccess }),
    setDefault: useMutation({ mutationFn: (id: Id) => authApi.setDefaultAddress(id), onSuccess }),
    remove: useMutation({ mutationFn: (id: Id) => authApi.removeAddress(id), onSuccess }),
  };
}
