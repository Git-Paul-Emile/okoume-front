import { useMemo } from 'react';
import { useCategories } from '@/features/categories/categories.queries';
import { inCategory } from '@/features/categories/categories.utils';
import { useRatingStats } from '@/features/reviews/reviews.queries';
import { relevance } from '@/features/search/search.utils';
import { useProducts } from './products.queries';
import type { CatalogFilters, Product } from './products.types';
import { applyPromotion, availableStock, isPromotionActive, productInStock, productSalePrice } from './products.utils';

export const PAGE_SIZE = 20;

/** Filtre, trie et pagine le catalogue selon les filtres de l'URL. */
export function useCatalog(filters: CatalogFilters) {
  const products = useProducts();
  const ratings = useRatingStats();
  const categories = useCategories();

  const result = useMemo(() => {
    const all = products.data ?? [];
    const byId = categories.data?.byId;
    const catName = (p: Product) => `${byId?.get(p.categoryId)?.name ?? ''} ${byId?.get(p.rootCategoryId)?.name ?? ''}`;

    // 1. périmètre : recherche + catégorie
    let scoped = all.map((p) => ({ p, score: relevance(p, filters.q, catName(p)) })).filter((r) => r.score > 0);
    if (filters.category) scoped = scoped.filter(({ p }) => byId && inCategory(p.categoryId, filters.category!, byId));

    // facettes calculées sur le périmètre, avant les autres filtres
    const facets = new Map<string, Set<string>>();
    let priceMax = 0;
    for (const { p } of scoped) {
      priceMax = Math.max(priceMax, ...p.variants.map((v) => applyPromotion(v.price, p.promotion)));
      for (const v of p.variants)
        for (const [k, val] of Object.entries(v.attributes)) {
          if (!facets.has(k)) facets.set(k, new Set());
          facets.get(k)!.add(val);
        }
    }

    // 2. filtres
    const filtered = scoped.filter(({ p }) => {
      const { price } = productSalePrice(p);
      if (filters.minPrice !== null && price < filters.minPrice) return false;
      if (filters.maxPrice !== null && price > filters.maxPrice) return false;
      if (filters.shop && (p.seller?.slug ?? 'okoza') !== filters.shop) return false;
      if (filters.inStock && !productInStock(p)) return false;
      if (filters.onSale && !isPromotionActive(p.promotion)) return false;
      for (const [attr, values] of Object.entries(filters.attributes)) {
        if (!values.length) continue;
        const ok = p.variants.some(
          (v) => values.includes(v.attributes[attr]) && (!filters.inStock || availableStock(v) > 0),
        );
        if (!ok) return false;
      }
      return true;
    });

    // 3. tri : à pertinence égale, les produits disponibles passent devant
    const stats = ratings.data;
    const price = (p: Product) => productSalePrice(p).price;
    const discountRate = (p: Product) => {
      const { price: s, original } = productSalePrice(p);
      return original ? (original - s) / original : 0;
    };
    const sorted = [...filtered].sort((a, b) => {
      switch (filters.sort) {
        case 'price_asc':
          return price(a.p) - price(b.p);
        case 'price_desc':
          return price(b.p) - price(a.p);
        case 'newest':
          return b.p.createdAt.localeCompare(a.p.createdAt);
        case 'rating':
          return (stats?.get(b.p.id)?.average ?? 0) - (stats?.get(a.p.id)?.average ?? 0);
        case 'discount':
          return discountRate(b.p) - discountRate(a.p);
        default:
          return Number(productInStock(b.p)) - Number(productInStock(a.p)) || b.score - a.score;
      }
    });

    const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const page = Math.min(filters.page, pageCount);
    return {
      items: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => r.p),
      total: sorted.length,
      page,
      pageCount,
      facets: [...facets.entries()].map(([name, values]) => ({
        name,
        values: [...values].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true })),
      })),
      priceMax: Math.ceil(priceMax / 5000) * 5000,
      // alternatives quand rien n'est trouvé : produits disponibles de la catégorie, sinon mis en avant
      alternatives: sorted.length
        ? []
        : all
            .filter(
              (p) =>
                productInStock(p) &&
                (filters.category ? !!byId && inCategory(p.categoryId, filters.category, byId) : p.featured),
            )
            .slice(0, 4),
    };
  }, [products.data, categories.data, ratings.data, filters]);

  return {
    ...result,
    ratings: ratings.data,
    isLoading: products.isLoading,
    error: products.error,
    refetch: products.refetch,
  };
}
