import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ProductCard } from '@/features/products/components/ProductCard';
import { useProducts } from '@/features/products/products.queries';
import { useRatingStats } from '@/features/reviews/reviews.queries';

/** Mieux notés : note moyenne des avis approuvés, avec au moins 3 avis. */
export function TopRatedSection() {
  const { data: products } = useProducts();
  const { data: ratings } = useRatingStats();
  if (!products || !ratings) return null;

  const items = products
    .filter((p) => (ratings.get(p.id)?.count ?? 0) >= 3)
    .sort((a, b) => ratings.get(b.id)!.average - ratings.get(a.id)!.average)
    .slice(0, 6);

  return (
    <section>
      <SectionHeading
        title="Les mieux notés par nos clients"
        link={{ to: '/catalogue?tri=rating', label: 'Tout voir' }}
      />
      <RevealGroup gap={0.05} className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        {items.map((p) => (
          <RevealItem key={p.id}>
            <ProductCard product={p} rating={ratings.get(p.id)} compact />
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
