import { motion } from 'motion/react';
import { useId } from 'react';
import { ease } from '@/lib/motion';

/**
 * Visuel « pop-out » de la section vendredi, en trois plans :
 * 1. le décor (cadre mûre au motif de pagne, soleil doré) ;
 * 2. le couple détouré, dont les têtes débordent au-dessus du cadre ;
 * 3. un ruban doré qui passe devant les tenues, pour donner de la profondeur.
 */
export function FridayPopOut() {
  const id = useId();
  return (
    <motion.div
      className="group relative mx-auto aspect-[2/3] w-full max-w-[300px] select-none"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
    >
      {/* Plan 1 : décor */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-x-0 top-[26%] bottom-0 overflow-hidden rounded-xl bg-mure"
        variants={{
          hidden: { opacity: 0, scale: 0.92 },
          show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease } },
        }}
      >
        <svg className="absolute inset-0 size-full" aria-hidden="true">
          <defs>
            <pattern id={`pagne-${id}`} width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M14 3 25 14 14 25 3 14Z" fill="none" stroke="#c08a2b" strokeWidth="1.5" opacity="0.45" />
              <path d="M14 10 18 14 14 18 10 14Z" fill="#f7f2e8" opacity="0.25" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#pagne-${id})`} />
        </svg>
      </motion.div>
      <motion.span
        aria-hidden="true"
        className="absolute top-[10%] right-[4%] aspect-square w-[38%] rounded-full bg-gold"
        variants={{
          hidden: { opacity: 0, scale: 0.5 },
          show: { opacity: 1, scale: 1, transition: { duration: 0.7, delay: 0.15, ease } },
        }}
      />

      {/* Plan 2 : sujet détouré, plus haut que le cadre */}
      <motion.img
        src="/images/vendredi-tenues.webp"
        alt="Une femme en ensemble pagne et un homme en chemise brodée, tenues traditionnelles du vendredi"
        width={667}
        height={900}
        loading="lazy"
        className="absolute inset-x-0 bottom-0 mx-auto h-full w-auto object-contain object-bottom drop-shadow-[0_12px_18px_rgb(0_0_0/0.35)] transition-transform duration-500 group-hover:-translate-y-1.5 group-hover:scale-[1.03]"
        style={{ transformOrigin: 'bottom center' }}
        variants={{
          hidden: { opacity: 0, y: 28 },
          show: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.2, ease } },
        }}
      />

      {/* Plan 3 : ruban devant les tenues */}
      <svg
        viewBox="0 0 260 60"
        className="pointer-events-none absolute inset-x-[-6%] bottom-[14%] w-[112%]"
        aria-hidden="true"
      >
        <motion.path
          d="M4 44 C 60 8, 110 58, 160 26 S 236 10, 256 30"
          fill="none"
          stroke="#c08a2b"
          strokeWidth="7"
          strokeLinecap="round"
          variants={{
            hidden: { pathLength: 0 },
            show: { pathLength: 1, transition: { duration: 0.9, delay: 0.5, ease } },
          }}
        />
      </svg>
      <motion.span
        aria-hidden="true"
        className="absolute bottom-[30%] left-[2%] size-3 rotate-45 bg-ivory"
        variants={{ hidden: { opacity: 0, scale: 0 }, show: { opacity: 1, scale: 1, transition: { delay: 0.9 } } }}
      />
    </motion.div>
  );
}
