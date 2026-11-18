import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ease } from '@/lib/motion';
import { cn } from '@/utils/text';
import type { Ad } from '../home.types';
import { useAds } from '../home.queries';
import { pickAds } from '../home.utils';

type Variant = 'wide' | 'side';

/** Visuel d'une diapositive : lien interne ou externe (annonceur), avec la mention « Publicité » si tiers. */
function AdSlide({ ad }: { ad: Ad }) {
  const external = /^https?:\/\//.test(ad.href);
  const content = (
    <>
      <picture className="block size-full">
        {ad.imageMobile && <source media="(max-width: 639px)" srcSet={ad.imageMobile} />}
        <img
          src={ad.image}
          alt={ad.alt}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </picture>
      {/* Une publicité tierce doit être identifiable comme telle */}
      {ad.advertiser && (
        <span className="absolute top-2 right-2 rounded-sm bg-ink/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          Publicité · {ad.advertiser}
        </span>
      )}
    </>
  );
  return external ? (
    <a href={ad.href} target="_blank" rel="noreferrer sponsored" className="group relative block size-full">
      {content}
    </a>
  ) : (
    <Link to={ad.href} className="group relative block size-full">
      {content}
    </Link>
  );
}

/**
 * Espace publicitaire ouvert à toute entreprise, en diaporama de 3 visuels.
 * Formats conseillés : « wide » 1200 × 400 px, « side » 600 × 700 px, mobile 800 × 600 px.
 */
export function AdBanner({
  placement,
  variant = 'wide',
  className,
}: {
  placement: string;
  variant?: Variant;
  className?: string;
}) {
  const { data, isLoading } = useAds(placement);
  const slides = pickAds(data ?? []);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => window.clearInterval(id);
  }, [count, paused]);

  const frame = cn(
    'relative overflow-hidden rounded-lg bg-ink',
    variant === 'wide'
      ? 'aspect-[4/3] shrink-0 sm:aspect-[3/1]'
      : 'aspect-[4/3] sm:aspect-[6/7] lg:aspect-auto lg:min-h-0 lg:flex-1',
    className,
  );
  if (isLoading) return <div className={cn(frame, 'skeleton')} />;
  if (!count) return null;
  const current = slides[index % count];

  return (
    <div
      className={frame}
      aria-roledescription="carrousel"
      aria-label="Espace publicitaire"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={current.id}
          className="absolute inset-0"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.5, ease } }}
          exit={{ opacity: 0, x: -30, transition: { duration: 0.3 } }}
        >
          <AdSlide ad={current} />
        </motion.div>
      </AnimatePresence>
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Publicité ${i + 1} sur ${count}`}
              aria-current={i === index % count}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === index % count ? 'w-5 bg-white' : 'w-1.5 bg-white/50',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
