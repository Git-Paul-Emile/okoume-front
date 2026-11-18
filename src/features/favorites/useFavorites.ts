import { useCallback, useMemo } from 'react';
import type { Id } from '@/api/types';
import { useCurrentUser, useSetFavorite } from '@/features/auth/auth.queries';
import { toast } from '@/stores/toastStore';

/** Favoris enregistrés dans le compte : la connexion est nécessaire pour les conserver. */
export function useFavorites() {
  const { user, isAuthenticated } = useCurrentUser();
  const setFavorite = useSetFavorite();
  const favorites = useMemo(() => user?.favorites ?? [], [user?.favorites]);

  const toggle = useCallback(
    (productId: Id) => {
      if (!isAuthenticated || !user) {
        toast.info('Connectez-vous pour enregistrer vos favoris', {
          action: { label: 'Se connecter', href: '/connexion' },
        });
        return;
      }
      setFavorite.mutate(
        { user, productId, favorite: !favorites.includes(productId) },
        { onError: () => toast.error('Le favori n’a pas pu être enregistré. Réessayez.') },
      );
    },
    [favorites, isAuthenticated, setFavorite, user],
  );

  return { favorites, isFavorite: (id: Id) => favorites.includes(id), toggle };
}
