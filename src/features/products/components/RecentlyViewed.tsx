import type { Id } from '@/api/types';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { useRatingStats } from '@/features/reviews/reviews.queries';
import { useRecentlyViewedStore } from '@/stores/recentlyViewedStore';
import { useProductsByIds } from '../products.queries';
import { ProductCard } from './ProductCard';

export function RecentlyViewed({ excludeId }: { excludeId?: Id }) {
  const ids = useRecentlyViewedStore((s) => s.ids)
    .filter((id) => id !== excludeId)
    .slice(0, 6);
  const { data: products } = useProductsByIds(ids);
  const { data: ratings } = useRatingStats();
  if (!ids.length || !products?.length) return null;
  const ordered = ids.map((id) => products.find((p) => p.id === id)).filter((p) => p !== undefined);

  return (
    <section>
      <SectionHeading title="Récemment consultés" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        {ordered.map((p) => (
          <ProductCard key={p.id} product={p} rating={ratings?.get(p.id)} compact />
        ))}
      </div>
    </section>
  );
}
