import type { Id } from '@/api/types';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Link } from 'react-router';
import { useRatingStats } from '@/features/reviews/reviews.queries';
import { useRecentlyViewedStore } from '@/stores/recentlyViewedStore';
import { useProductsByIds } from '../products.queries';
import { ProductCard } from './ProductCard';

export function RecentlyViewed({ excludeId }: { excludeId?: Id }) {
  const ids = useRecentlyViewedStore((s) => s.ids)
    .filter((id) => id !== excludeId)
    .slice(0, 6);
  const { data: products, isLoading } = useProductsByIds(ids);
  const { data: ratings } = useRatingStats();
  const ordered = ids.map((id) => products?.find((p) => p.id === id)).filter((p) => p !== undefined);

  return (
    <section>
      <SectionHeading title="Récemment consultés" />
      {ordered.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
          {ordered.map((p) => (
            <ProductCard key={p.id} product={p} rating={ratings?.get(p.id)} compact />
          ))}
        </div>
      ) : ids.length && isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: Math.min(ids.length, 6) }, (_, i) => (
            <div key={i} className="skeleton aspect-[3/4] rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="card flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-soft">Les produits que vous consultez apparaîtront ici.</p>
          <Link to="/catalogue" className="text-sm font-semibold text-forest hover:underline">
            Découvrir le catalogue
          </Link>
        </div>
      )}
    </section>
  );
}
