import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { CatalogFilters, SortKey } from './products.types';

const SORTS: SortKey[] = ['relevance', 'price_asc', 'price_desc', 'newest', 'rating', 'discount'];
const ATTR_PREFIX = 'attr_';

/** Les filtres du catalogue vivent dans l'URL : partageables et conservés au retour arrière. */
export function useCatalogFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<CatalogFilters>(() => {
    const attributes: Record<string, string[]> = {};
    params.forEach((value, key) => {
      if (key.startsWith(ATTR_PREFIX)) attributes[key.slice(ATTR_PREFIX.length)] = value.split(',').filter(Boolean);
    });
    const sort = params.get('tri') as SortKey | null;
    const num = (k: string) => (params.get(k) ? Number(params.get(k)) : null);
    return {
      q: params.get('q') ?? '',
      category: params.get('categorie'),
      minPrice: num('min'),
      maxPrice: num('max'),
      inStock: params.get('dispo') === '1',
      onSale: params.get('promo') === '1',
      attributes,
      sort: sort && SORTS.includes(sort) ? sort : 'relevance',
      page: Math.max(1, Number(params.get('page') ?? 1)),
    };
  }, [params]);

  const update = useCallback(
    (patch: Partial<CatalogFilters>) => {
      const next = { ...filters, page: 1, ...patch };
      const p = new URLSearchParams();
      if (next.q) p.set('q', next.q);
      if (next.category) p.set('categorie', next.category);
      if (next.minPrice !== null) p.set('min', String(next.minPrice));
      if (next.maxPrice !== null) p.set('max', String(next.maxPrice));
      if (next.inStock) p.set('dispo', '1');
      if (next.onSale) p.set('promo', '1');
      for (const [k, v] of Object.entries(next.attributes)) if (v.length) p.set(ATTR_PREFIX + k, v.join(','));
      if (next.sort !== 'relevance') p.set('tri', next.sort);
      if (next.page > 1) p.set('page', String(next.page));
      setParams(p, { preventScrollReset: true });
    },
    [filters, setParams],
  );

  const reset = useCallback(() => setParams(filters.q ? { q: filters.q } : {}), [filters.q, setParams]);

  return { filters, update, reset };
}
