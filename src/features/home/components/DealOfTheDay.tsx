import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Rating } from '@/components/ui/Rating';
import { PriceTag } from '@/features/products/components/PriceTag';
import { useProducts } from '@/features/products/products.queries';
import { isPromotionActive, productInStock, productSalePrice } from '@/features/products/products.utils';
import { useRatingStats } from '@/features/reviews/reviews.queries';
import { useCountdown } from '@/hooks/useCountdown';
import { ease } from '@/lib/motion';
import { cn } from '@/utils/text';

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="relative grid h-11 w-12 place-items-center overflow-hidden rounded-md border border-sage bg-ivory text-lg font-extrabold tabular-nums">
        <motion.span
          key={value}
          initial={{ y: -14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          {String(value).padStart(2, '0')}
        </motion.span>
      </span>
      <span className="mt-1 text-[11px] text-ink-muted">{label}</span>
    </div>
  );
}

/**
 * Offres limitées dans le temps, en diaporama : une offre par diapositive,
 * avec son propre compte à rebours calé sur la vraie date de fin de la promotion.
 */
export function DealOfTheDay({ className }: { className?: string }) {
  const { data: products, isLoading } = useProducts();
  const { data: ratings } = useRatingStats();
  const deals = useMemo(() => {
    const activePromotions = (products ?? [])
      .filter((p) => isPromotionActive(p.promotion) && productInStock(p))
      .sort((a, b) => a.promotion!.endsAt.localeCompare(b.promotion!.endsAt));
    const featuredDeals = activePromotions.filter((p) => p.dealOfTheDay);
    return featuredDeals.length ? featuredDeals : activePromotions;
  }, [products]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = deals.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => window.clearInterval(id);
  }, [count, paused]);

  const deal = deals[index % Math.max(count, 1)];
  const time = useCountdown(deal?.promotion?.endsAt ?? null);

  if (isLoading) return <div className={cn('skeleton min-h-[340px] rounded-lg', className)} />;
  if (!deal)
    return (
      <article className={cn('card flex min-h-[340px] flex-col items-center justify-center p-6 text-center', className)}>
        <h2 className="text-lg">Offre limitée</h2>
        <p className="mt-2 max-w-xs text-sm text-ink-soft">De nouvelles offres arrivent bientôt.</p>
        <Link to="/promotions" className="mt-4 text-sm font-semibold text-forest hover:underline">
          Voir les promotions
        </Link>
      </article>
    );

  const { price, original } = productSalePrice(deal);
  const rating = ratings?.get(deal.id);

  return (
    <article
      className={cn('card flex flex-col overflow-hidden p-5 pb-7', className)}
      aria-roledescription="carrousel"
      aria-label="Offres limitées"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <h2 className="text-center text-lg">Offre limitée</h2>
      <p className="mt-0.5 mb-3 text-center text-xs text-ink-muted">Fin de l’offre dans</p>
      <div
        className="flex justify-center gap-2"
        aria-label={`Fin de l’offre dans ${time.days} jours ${time.hours} heures ${time.minutes} minutes`}
      >
        <Unit value={time.days} label="jours" />
        <Unit value={time.hours} label="h" />
        <Unit value={time.minutes} label="min" />
        <Unit value={time.seconds} label="s" />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={deal.id}
          className="flex min-h-0 flex-1 flex-col"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.45, ease } }}
          exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
        >
          <Link to={`/produit/${deal.slug}`} className="group mt-4 flex min-h-0 flex-1 flex-col justify-center">
            <motion.img
              src={deal.images[0] ?? deal.thumbnail}
              alt=""
              className="mx-auto h-full max-h-72 min-h-0 w-full flex-1 object-contain"
              initial={{ scale: 1.15 }}
              whileHover={{ scale: 1.22, rotate: -3 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            />
            <h3 className="mt-3 text-sm font-semibold group-hover:text-forest">{deal.name}</h3>
          </Link>
          {rating && <Rating className="mt-1" value={rating.average} count={rating.count} size={13} />}
          <PriceTag className="mt-2" price={price} original={original} />
        </motion.div>
      </AnimatePresence>

      {count > 1 && (
        <div className="mt-5 flex justify-center gap-1.5">
          {deals.map((d, i) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Offre ${i + 1} sur ${count}`}
              aria-current={i === index % count}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === index % count ? 'w-5 bg-forest' : 'w-1.5 bg-sage-dark hover:bg-ink-muted',
              )}
            />
          ))}
        </div>
      )}
    </article>
  );
}
