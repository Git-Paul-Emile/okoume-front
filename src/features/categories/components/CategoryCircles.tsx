import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useCategories } from '../categories.queries';
import { shopCategories } from '../categories.utils';

const FADE = '72px';

/**
 * « Acheter par catégorie » : toutes les sous-catégories avec visuel rond.
 * Quand la rangée dépasse la largeur, les bords s'estompent et des flèches flottantes
 * apparaissent au centre de chaque extrémité (la barre de défilement est masquée).
 */
export function CategoryCircles() {
  const { data } = useCategories();
  const items = shopCategories(data?.all ?? []);
  const rowRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const max = row.scrollWidth - row.clientWidth;
    setEdges({ left: row.scrollLeft > 4, right: row.scrollLeft < max - 4 });
  }, []);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    measure();
    // La molette verticale fait défiler la rangée tant qu'il reste du contenu à voir.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      const max = row.scrollWidth - row.clientWidth;
      const atStart = row.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = row.scrollLeft >= max - 1 && e.deltaY > 0;
      if (max <= 0 || atStart || atEnd) return;
      e.preventDefault();
      row.scrollLeft += e.deltaY;
    };
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    row.addEventListener('wheel', onWheel, { passive: false });
    row.addEventListener('scroll', measure, { passive: true });
    return () => {
      observer.disconnect();
      row.removeEventListener('wheel', onWheel);
      row.removeEventListener('scroll', measure);
    };
  }, [items.length, measure]);

  const scrollBy = (direction: 1 | -1) => {
    const row = rowRef.current;
    if (row) row.scrollBy({ left: direction * row.clientWidth * 0.8, behavior: 'smooth' });
  };

  // Fondu des extrémités uniquement du côté où il reste des catégories à voir.
  const mask = `linear-gradient(to right, ${edges.left ? 'transparent' : '#000'} 0, #000 ${FADE}, #000 calc(100% - ${FADE}), ${edges.right ? 'transparent' : '#000'} 100%)`;

  return (
    <div className="relative">
      <div
        ref={rowRef}
        tabIndex={0}
        aria-label="Catégories, faites défiler horizontalement"
        className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        <RevealGroup gap={0.04} className="flex w-max snap-x gap-5 py-1">
          {items.map((c) => (
            <RevealItem key={c.id} className="snap-start">
              <Link
                to={`/catalogue?categorie=${c.id}`}
                className="group flex w-32 flex-col items-center gap-2.5 text-center"
              >
                <motion.span
                  whileHover={{ y: -4 }}
                  className="grid size-28 place-items-center overflow-hidden rounded-full border border-sage bg-white transition-colors group-hover:border-forest"
                >
                  <img
                    src={c.image!}
                    alt=""
                    loading="lazy"
                    className={
                      c.imageFit === 'cover'
                        ? 'size-full object-cover transition-transform duration-300 group-hover:scale-110'
                        : 'size-[86%] object-contain transition-transform duration-300 group-hover:scale-110'
                    }
                  />
                </motion.span>
                <span className="text-sm font-semibold text-ink group-hover:text-forest">{c.name}</span>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>

      <AnimatePresence>
        {edges.left && (
          <motion.button
            key="prev"
            type="button"
            onClick={() => scrollBy(-1)}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            className="absolute top-[60px] left-0 grid size-11 -translate-y-1/2 place-items-center text-ink transition-colors hover:text-forest"
            aria-label="Catégories précédentes"
          >
            <ChevronLeft className="size-8" strokeWidth={2.25} />
          </motion.button>
        )}
        {edges.right && (
          <motion.button
            key="next"
            type="button"
            onClick={() => scrollBy(1)}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            className="absolute top-[60px] right-0 grid size-11 -translate-y-1/2 place-items-center text-ink transition-colors hover:text-forest"
            aria-label="Catégories suivantes"
          >
            <ChevronRight className="size-8" strokeWidth={2.25} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
