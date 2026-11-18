import { useMemo } from 'react';
import { useCategories } from '@/features/categories/categories.queries';
import { useProducts } from '@/features/products/products.queries';
import { useDebounce } from '@/hooks/useDebounce';
import { normalizeText } from '@/utils/text';
import { searchProducts } from './search.utils';

export function useSearchSuggestions(query: string) {
  const debounced = useDebounce(query, 300);
  const { data: products } = useProducts();
  const { data: categories } = useCategories();

  return useMemo(() => {
    const q = debounced.trim();
    if (q.length < 2 || !products) return { products: [], categories: [], query: q };
    const byId = categories?.byId;
    const nq = normalizeText(q);
    return {
      query: q,
      products: searchProducts(products, q, (p) => byId?.get(p.categoryId)?.name ?? ''),
      categories: (categories?.all ?? []).filter((c) => normalizeText(c.name).includes(nq)).slice(0, 3),
    };
  }, [debounced, products, categories]);
}
