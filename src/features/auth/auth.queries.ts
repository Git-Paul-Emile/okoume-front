import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ApiError } from '@/api/ApiError';
import type { Id } from '@/api/types';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from './auth.api';
import { authBackend } from './auth.backend';
import type { Address, User } from './auth.types';

export const userKey = (id: string | null) => ['user', id] as const;

const isUnauthorized = (error: unknown) => error instanceof ApiError && error.status === 401;

export function useCurrentUser() {
  const userId = useAuthStore((s) => s.userId);
  const setUserId = useAuthStore((s) => s.setUserId);
  const query = useQuery({
    queryKey: userKey(userId),
    queryFn: ({ signal }) => authApi.me(signal),
    enabled: !!userId,
    staleTime: 30_000,
    retry: (count, error) => !isUnauthorized(error) && count < 2,
  });
  // Session expirée côté serveur (renouvellement refusé) : le navigateur oublie le compte
  const expired = isUnauthorized(query.error);
  useEffect(() => {
    if (expired) setUserId(null);
  }, [expired, setUserId]);
  return { ...query, user: query.data ?? null, isAuthenticated: !!userId };
}

export function useLogin() {
  const qc = useQueryClient();
  const setUserId = useAuthStore((s) => s.setUserId);
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => authApi.login(email, password),
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
    // La session est révoquée côté serveur ; la déconnexion locale reste immédiate.
    void (async () => {
      await authApi.logout().catch(() => undefined);
    })();
    setUserId(null);
    qc.removeQueries({ queryKey: ['user'] });
    qc.removeQueries({ queryKey: ['orders'] });
    qc.removeQueries({ queryKey: ['tickets'] });
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
      if (previous) qc.setQueryData(userKey(userId), { ...previous, ...patch });
      return { previous };
    },
    onError: (_e, _p, ctx) => ctx?.previous && qc.setQueryData(userKey(userId), ctx.previous),
    onSuccess: (user) => qc.setQueryData(userKey(userId), user),
  });
}

/** Inscription sur l'API : le code reçu par e-mail active le compte et ouvre la session. */
export function useVerifyRegistration() {
  const qc = useQueryClient();
  const setUserId = useAuthStore((s) => s.setUserId);
  return useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      await authBackend.verifyEmail(email, code);
      return authBackend.me();
    },
    onSuccess: (user) => {
      qc.setQueryData(userKey(user.id), user);
      setUserId(user.id);
    },
  });
}

/** Adresses enregistrées (2.2) : chaque action renvoie le compte à jour. */
export function useAddressActions() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const onSuccess = (user: User) => qc.setQueryData(userKey(userId), user);
  return {
    add: useMutation({
      mutationFn: (address: Omit<Address, 'id' | 'isDefault'>) => authApi.addAddress(address),
      onSuccess,
    }),
    setDefault: useMutation({
      mutationFn: (id: Id) => authApi.setDefaultAddress(id),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (id: Id) => authApi.removeAddress(id),
      onSuccess,
    }),
  };
}

/** Favori ajouté ou retiré, affiché tout de suite puis confirmé par le serveur. */
export function useSetFavorite() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  return useMutation({
    mutationFn: ({ user, productId, favorite }: { user: User; productId: Id; favorite: boolean }) =>
      authApi.setFavorite(user, productId, favorite),
    onMutate: async ({ user, productId, favorite }) => {
      await qc.cancelQueries({ queryKey: userKey(userId) });
      const previous = qc.getQueryData<User>(userKey(userId));
      const favorites = favorite ? [...user.favorites, productId] : user.favorites.filter((id) => id !== productId);
      if (previous) qc.setQueryData(userKey(userId), { ...previous, favorites });
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(userKey(userId), ctx.previous),
    onSuccess: (favorites) => {
      const current = qc.getQueryData<User>(userKey(userId));
      if (current) qc.setQueryData(userKey(userId), { ...current, favorites });
    },
  });
}
