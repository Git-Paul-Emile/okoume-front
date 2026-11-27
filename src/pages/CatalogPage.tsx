import { AnimatePresence, motion } from 'motion/react';
import { SearchX, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Pagination } from '@/components/ui/Pagination';
import { useCategories } from '@/features/categories/categories.queries';
import { ancestors } from '@/features/categories/categories.utils';
import { ProductCard, ProductCardSkeleton } from '@/features/products/components/ProductCard';
import { ProductFilters } from '@/features/products/components/ProductFilters';
import type { SortKey } from '@/features/products/products.types';
import { useCatalog } from '@/features/products/useCatalog';
import { useCatalogFilters } from '@/features/products/useCatalogFilters';
import { formatPrice } from '@/utils/formatPrice';
import { pluralize } from '@/utils/text';

const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: 'relevance', label: 'Pertinence' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'newest', label: 'Nouveautés' },
  { value: 'rating', label: 'Mieux notés' },
  { value: 'discount', label: 'Meilleures réductions' },
];

export default function CatalogPage() {
  const { filters, update, reset } = useCatalogFilters();
  const catalog = useCatalog(filters);
  const { data: categories } = useCategories();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const category = filters.category ? categories?.byId.get(filters.category) : null;
  const parents = category && categories ? ancestors(category.id, categories.byId).slice(1).reverse() : [];
  const title = filters.q
    ? `Résultats pour « ${filters.q} »`
    : (category?.fullName ?? category?.name ?? 'Tout le catalogue');

  const chips = [
    filters.q && { label: `« ${filters.q} »`, clear: () => update({ q: '' }) },
    category && { label: category.fullName ?? category.name, clear: () => update({ category: null }) },
    filters.minPrice !== null && {
      label: `dès ${formatPrice(filters.minPrice)}`,
      clear: () => update({ minPrice: null }),
    },
    filters.maxPrice !== null && {
      label: `jusqu’à ${formatPrice(filters.maxPrice)}`,
      clear: () => update({ maxPrice: null }),
    },
    filters.inStock && { label: 'En stock', clear: () => update({ inStock: false }) },
    filters.onSale && { label: 'En promotion', clear: () => update({ onSale: false }) },
    ...Object.entries(filters.attributes).flatMap(([k, vs]) =>
      vs.map((v) => ({
        label: `${k} ${v}`,
        clear: () => update({ attributes: { ...filters.attributes, [k]: vs.filter((x) => x !== v) } }),
      })),
    ),
  ].filter((c): c is { label: string; clear: () => void } => !!c);

  const filterPanel = (
    <ProductFilters
      filters={filters}
      update={update}
      reset={reset}
      facets={catalog.facets}
      priceMax={catalog.priceMax}
    />
  );

  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs
        items={[
          { label: 'Accueil', to: '/' },
          ...parents.map((c) => ({ label: c.name, to: `/catalogue?categorie=${c.id}` })),
          { label: title },
        ]}
      />
      <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="card sticky top-36 max-h-[calc(100dvh-10rem)] overflow-y-auto p-5">{filterPanel}</div>
        </aside>

        <section aria-labelledby="catalog-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 id="catalog-title" className="text-2xl sm:text-3xl">
                {title}
              </h1>
              <p className="mt-1 text-sm text-ink-muted" aria-live="polite">
                {catalog.isLoading ? 'Chargement…' : pluralize(catalog.total, 'produit')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden"
                icon={<SlidersHorizontal className="size-4" />}
                onClick={() => setFiltersOpen(true)}
              >
                Filtres
              </Button>
              <label htmlFor="sort" className="sr-only">
                Trier par
              </label>
              <select
                id="sort"
                value={filters.sort}
                onChange={(e) => update({ sort: e.target.value as SortKey })}
                className="input h-9 w-auto py-0 text-sm"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    Trier : {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {chips.length > 0 && (
            <ul className="mb-5 flex flex-wrap gap-2">
              <AnimatePresence initial={false}>
                {chips.map((c) => (
                  <motion.li
                    key={c.label}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <button
                      type="button"
                      onClick={c.clear}
                      className="inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-forest hover:text-forest-dark hover:underline"
                      aria-label={`Retirer le filtre ${c.label}`}
                    >
                      {c.label} <X className="size-3.5" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}

          {catalog.error ? (
            <ErrorState error={catalog.error} onRetry={() => catalog.refetch()} />
          ) : catalog.isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
              {Array.from({ length: 9 }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : catalog.total === 0 ? (
            <div className="card">
              <EmptyState
                icon={<SearchX className="size-7" />}
                title="Aucun produit ne correspond à votre recherche"
                description="Vérifiez l’orthographe, utilisez un mot plus général ou retirez certains filtres."
                action={<Button onClick={reset}>Réinitialiser les filtres</Button>}
              />
              {catalog.alternatives.length > 0 && (
                <div className="border-t border-sage p-5">
                  <h2 className="mb-4 text-lg">Ces produits disponibles pourraient vous intéresser</h2>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {catalog.alternatives.map((p) => (
                      <ProductCard key={p.id} product={p} rating={catalog.ratings?.get(p.id)} compact />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <h2 className="sr-only">Produits</h2>
              <motion.div
                key={`${filters.page}-${filters.sort}-${filters.category}-${filters.q}`}
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.035 } } }}
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 2xl:grid-cols-5"
              >
                {catalog.items.map((p) => (
                  <motion.div key={p.id} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
                    <ProductCard product={p} rating={catalog.ratings?.get(p.id)} compact />
                  </motion.div>
                ))}
              </motion.div>
              <div className="mt-8">
                <Pagination
                  page={catalog.page}
                  pageCount={catalog.pageCount}
                  onChange={(page) => {
                    update({ page });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            </>
          )}
        </section>
      </div>

      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtres"
        side="left"
        footer={
          <Button className="w-full" onClick={() => setFiltersOpen(false)}>
            Voir les {pluralize(catalog.total, 'produit')}
          </Button>
        }
      >
        <div className="p-5">{filterPanel}</div>
      </Drawer>
    </div>
  );
}
