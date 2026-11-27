import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { ease } from '@/lib/motion';
import type { Banner } from '../home.types';
import { useBanners } from '../home.queries';

const DEFAULT_BANNERS: Banner[] = [
  {
    id: 'home-banner-tech',
    title: 'La tech qui suit votre rythme',
    subtitle: 'Smartphones, ordinateurs et accessoires neufs, livrés à Libreville, Akanda et Owendo.',
    cta: 'Voir l’électronique',
    href: '/catalogue?categorie=electronique',
    image: 'https://cdn.dummyjson.com/product-images/smartphones/iphone-13-pro/1.webp',
    accent: 'forest',
  },
  {
    id: 'home-banner-mode',
    title: 'Votre style, du bureau au week-end',
    subtitle: 'Chemises, robes, sacs et baskets. Payez à la livraison ou par Mobile Money.',
    cta: 'Découvrir la mode',
    href: '/catalogue?categorie=mode',
    image: "https://cdn.dummyjson.com/product-images/womens-bags/heshe-women's-leather-bag/1.webp",
    accent: 'mure',
  },
  {
    id: 'home-banner-cuisine',
    title: 'Équipez votre cuisine sans vous déplacer',
    subtitle: 'Blenders, micro-ondes et ustensiles, avec un délai de livraison indiqué pour votre quartier.',
    cta: 'Voir la cuisine',
    href: '/catalogue?categorie=cuisine',
    image: 'https://cdn.dummyjson.com/product-images/kitchen-accessories/boxed-blender/1.webp',
    accent: 'forest',
  },
];

/** Cercle pointillé qui se dessine autour du visuel produit. */
function Halo() {
  return (
    <svg
      className="pointer-events-none absolute inset-[6%] size-[88%] text-sage-dark"
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <motion.circle
        cx="50"
        cy="50"
        r="48"
        stroke="currentColor"
        strokeWidth="0.35"
        strokeDasharray="1.5 2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease }}
      />
    </svg>
  );
}

export function HeroSlider() {
  const { data: banners, isLoading } = useBanners();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slides = banners?.length ? banners : DEFAULT_BANNERS;
  const count = slides.length;
  const currentIndex = index % count;

  useEffect(() => {
    if (!count || paused) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), 6500);
    return () => window.clearInterval(id);
  }, [count, paused]);

  if (isLoading) return <div className="skeleton h-[420px] rounded-xl" />;
  const b = slides[currentIndex];

  return (
    <section
      className="relative overflow-hidden rounded-xl border border-sage bg-forest-50"
      aria-roledescription="carrousel"
      aria-label="Mises en avant"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="grid min-h-[440px] items-center gap-6 px-6 pt-8 pb-14 sm:px-10 md:grid-cols-[1.1fr_1fr] md:py-10 lg:px-14">
        <AnimatePresence mode="wait">
          <motion.div
            key={b.id}
            initial="hidden"
            animate="show"
            exit="exit"
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          >
            {[
              <h1 key="t" className="max-w-lg text-4xl leading-[1.08] font-extrabold sm:text-5xl">
                {b.title}
              </h1>,
              <p key="s" className="mt-4 max-w-md text-[17px] leading-relaxed text-ink-soft">
                {b.subtitle}
              </p>,
              <div key="c" className="mt-8">
                <ButtonLink
                  to={b.href}
                  size="lg"
                  variant={b.accent === 'mure' ? 'accent' : 'primary'}
                  className="group"
                >
                  {b.cta}
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </ButtonLink>
              </div>,
            ].map((node, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 22 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
                  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
                }}
              >
                {node}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="relative mx-auto aspect-square w-full max-w-[320px] md:max-w-[480px]">
          <Halo key={`halo-${b.id}`} />
          <AnimatePresence mode="wait">
            <motion.img
              key={b.image}
              src={b.image}
              alt=""
              className="absolute inset-[3%] size-[94%] object-contain drop-shadow-[0_30px_30px_rgba(37,53,47,0.18)]"
              initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
              animate={{ opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.7, ease } }}
              exit={{ opacity: 0, scale: 0.9, rotate: 4, transition: { duration: 0.25 } }}
            />
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setIndex((index - 1 + count) % count)}
          className="grid size-8 place-items-center text-ink transition hover:text-forest"
          aria-label="Diapositive précédente"
        >
          <ChevronLeft className="size-4" />
        </button>
        {slides.map((x, i) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setIndex(i)}
            className="relative h-2 overflow-hidden rounded-full bg-forest/20 transition-all"
            style={{ width: i === currentIndex ? 32 : 8 }}
            aria-label={`Aller à la diapositive ${i + 1}`}
            aria-current={i === currentIndex}
          >
            {i === currentIndex && !paused && (
              <motion.span
                key={`${currentIndex}-p`}
                className="absolute inset-y-0 left-0 bg-forest"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 6.5, ease: 'linear' }}
              />
            )}
            {i === currentIndex && paused && <span className="absolute inset-0 bg-forest" />}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIndex((index + 1) % count)}
          className="grid size-8 place-items-center text-ink transition hover:text-forest"
          aria-label="Diapositive suivante"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </section>
  );
}
