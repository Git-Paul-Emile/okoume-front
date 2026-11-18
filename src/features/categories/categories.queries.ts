import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from './categories.api';
import { buildTree } from './categories.utils';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => categoriesApi.list(signal),
    staleTime: 10 * 60_000,
    select: (categories) => ({
      all: categories,
      tree: buildTree(categories),
      byId: new Map(categories.map((c) => [c.id, c])),
      // Nom court stable (« traditionnel ») : liens écrits dans le code et anciennes adresses du catalogue
      bySlug: new Map(categories.map((c) => [c.slug, c])),
    }),
  });
}
