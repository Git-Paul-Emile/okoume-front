import { backend, getAll } from '@/api/backend';
import { ApiError } from '@/api/ApiError';
import type { Id } from '@/api/types';
import { toProduct } from './products.backend';
import type { Product } from './products.types';

/**
 * Catalogue public lu sur l'API (produits publiés seulement, sans données internes). Le front garde le
 * catalogue complet en mémoire et filtre lui-même.
 */
export const productsApi = {
  list: (signal?: AbortSignal) => getAll('/products', {}, toProduct, signal),

  bySlug: async (slug: string, signal?: AbortSignal) => {
    try {
      return toProduct(await backend.get(`/products/${encodeURIComponent(slug)}`, undefined, signal));
    } catch (error) {
      // Produit inconnu ou retiré : la page affiche « introuvable »
      if (error instanceof ApiError && (error.isNotFound || error.status === 400)) return null;
      throw error;
    }
  },

  /** L'API ne filtre pas par identifiants : le catalogue complet, déjà en cache le plus souvent, est filtré. */
  byIds: async (ids: Id[], signal?: AbortSignal) => {
    if (!ids.length) return [] as Product[];
    const wanted = new Set(ids);
    return (await productsApi.list(signal)).filter((p) => wanted.has(p.id));
  },
};
