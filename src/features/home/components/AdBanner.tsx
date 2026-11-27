import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ease } from '@/lib/motion';
import { cn } from '@/utils/text';
import type { Ad } from '../home.types';
import { useAds } from '../home.queries';
import { pickAds } from '../home.utils';

function AdSlide({ ad }: { ad: Ad }) {
  const content = (
    <>
      <picture className="block size-full">
        {ad.imageMobile && <source media="(max-width: 639px)" srcSet={ad.imageMobile} />}
        <img src={ad.image} alt={ad.alt} className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
      </picture>
      {ad.advertiser && (
        <span className="absolute top-2 right-2 rounded-sm bg-ink/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          Publicité · {ad.advertiser}
        </span>
      )}
    </>
  );
  return /^https?:\/\//.test(ad.href) ? (
    <a href={ad.href} target="_blank" rel="noreferrer sponsored" className="group relative block size-full">
      {content}
    </a>
  ) : (
    <Link to={ad.href} className="group relative block size-full">
      {content}
    </Link>
  );
}

export function AdBanner({ placement, className }: { placement: string; className?: string }) {
  const { data, isLoading } = useAds(placement);
  const slides = pickAds(data ?? []);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = slides[index % Math.max(slides.length, 1)];

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % slides.length), 5000);
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);

  const frame = cn(
    'relative aspect-[4/3] overflow-hidden rounded-lg bg-transparent sm:aspect-[18/5]',
    className,
  );
  if (isLoading) return <div className={cn(frame, 'skeleton')} />;
  if (!current) return null;

  return (
    <div
      className={frame}
      aria-roledescription="carrousel"
      aria-label="Bannières publicitaires"
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
      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setIndex(slideIndex)}
              aria-label={`Publicité ${slideIndex + 1} sur ${slides.length}`}
              aria-current={slideIndex === index % slides.length}
              className={cn(
                'h-1.5 rounded-full transition-all',
                slideIndex === index % slides.length ? 'w-5 bg-white' : 'w-1.5 bg-white/50',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
