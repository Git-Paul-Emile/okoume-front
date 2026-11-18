import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useProductsByIds } from '@/features/products/products.queries';
import { ease } from '@/lib/motion';
import { cn } from '@/utils/text';
import { useExclusiveOffers } from '../home.queries';

/** Encart « Offre exclusive » : titre et produit viennent des données, rotation automatique s'il y en a plusieurs. */
export function ExclusiveOfferCard({ className }: { className?: string }) {
  const { data: offers } = useExclusiveOffers();
  const { data: products } = useProductsByIds(offers?.map((o) => o.productId) ?? []);
  const [index, setIndex] = useState(0);
  const count = offers?.length ?? 0;

  useEffect(() => {
    if (count < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => window.clearInterval(id);
  }, [count]);

  const offer = offers?.[index % Math.max(count, 1)];
  const product = products?.find((p) => p.id === offer?.productId);
  if (!offer || !product) return <div className={cn('skeleton min-h-[300px] rounded-lg', className)} />;

  return (
    <div className={cn('relative flex min-h-[300px] flex-col', className)}>
      <Link
        to={offer.href ?? `/produit/${product.slug}`}
        className="group relative flex flex-1 flex-col overflow-hidden rounded-lg bg-forest p-5 text-white"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={offer.id}
            className="flex flex-1 flex-col"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease } }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
          >
            <p className="text-[11px] font-semibold tracking-wider text-white/75 uppercase">{offer.label}</p>
            <h2 className="mt-2 text-xl leading-tight text-white">{offer.title}</h2>
            <span className="mt-4 relative z-10 inline-flex h-9 w-fit items-center gap-1.5 rounded-md bg-white px-3 text-sm font-semibold text-forest">
              Découvrir
            </span>
            <motion.img
              src={product.images[0] ?? product.thumbnail}
              alt={product.name}
              className="pointer-events-none -mx-5 mt-3 -mb-5 min-h-0 w-[calc(100%+2.5rem)] flex-1 origin-bottom object-contain object-bottom"
              initial={{ scale: 1, rotate: 6 }}
              animate={{ scale: 1.08, rotate: 0, transition: { duration: 0.6, ease } }}
              whileHover={{ scale: 1.13 }}
            />
          </motion.div>
        </AnimatePresence>
      </Link>
      {count > 1 && (
        <div className="absolute bottom-3 left-5 flex gap-1.5">
          {offers!.map((o, i) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Offre ${i + 1} sur ${count}`}
              aria-current={i === index}
              className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
