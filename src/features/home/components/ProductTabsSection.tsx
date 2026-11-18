import { motion } from 'motion/react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { ProductCard, ProductCardSkeleton } from '@/features/products/components/ProductCard';
import { useProducts } from '@/features/products/products.queries';
import { useRatingStats } from '@/features/reviews/reviews.queries';

/** « Articles du moment » : les produits mis en avant par la boutique. */
export function ProductTabsSection() {
  const { data: products, isLoading } = useProducts();
  const { data: ratings } = useRatingStats();
  const items = useMemo(() => (products ?? []).filter((p) => p.featured).slice(0, 8), [products]);

  return (
    <section aria-labelledby="popular-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-sage pb-3">
        <h2 id="popular-title" className="text-xl sm:text-2xl">
          Articles du moment
        </h2>
        <Link to="/catalogue" className="text-sm font-semibold text-forest hover:underline">
          Voir plus de produits
        </Link>
      </div>
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        variants={{ show: { transition: { staggerChildren: 0.045 } } }}
        className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4"
      >
        {isLoading
          ? Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)
          : items.map((p) => (
              <motion.div key={p.id} variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
                <ProductCard product={p} rating={ratings?.get(p.id)} />
              </motion.div>
            ))}
      </motion.div>
    </section>
  );
}
