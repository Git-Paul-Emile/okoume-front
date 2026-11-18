import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useUiStore } from '@/stores/uiStore';

/** L'image du produit « vole » jusqu'à l'icône du panier, qui rebondit à l'arrivée. */
export function FlyToCart() {
  const flying = useUiStore((s) => s.flying);
  const endFlight = useUiStore((s) => s.endFlight);

  const target = flying ? document.getElementById('cart-target')?.getBoundingClientRect() : undefined;

  useEffect(() => {
    if (flying && !target) endFlight();
  }, [flying, target, endFlight]);

  return (
    <AnimatePresence>
      {flying && target && (
        <motion.img
          key={flying.id}
          src={flying.image}
          alt=""
          aria-hidden="true"
          className="pointer-events-none fixed z-[70] rounded-lg bg-white object-contain p-2 shadow-xl"
          style={{ left: 0, top: 0, width: flying.from.width, height: flying.from.height }}
          initial={{ x: flying.from.x, y: flying.from.y, scale: 1, opacity: 1 }}
          animate={{
            x: [
              flying.from.x,
              (flying.from.x + target.left) / 2,
              target.left + target.width / 2 - flying.from.width / 2,
            ],
            y: [
              flying.from.y,
              Math.min(flying.from.y, target.top) - 80,
              target.top + target.height / 2 - flying.from.height / 2,
            ],
            scale: [1, 0.55, 0.08],
            opacity: [1, 1, 0.4],
          }}
          transition={{ duration: 0.75, ease: [0.55, 0, 0.35, 1] }}
          onAnimationComplete={endFlight}
        />
      )}
    </AnimatePresence>
  );
}
