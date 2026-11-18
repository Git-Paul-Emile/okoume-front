import type { Transition, Variants } from 'motion/react';

/** Courbes et variantes partagées : un seul langage de mouvement pour tout le site. */
export const ease = [0.22, 1, 0.36, 1] as const;

export const spring: Transition = { type: 'spring', stiffness: 380, damping: 30 };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

export const stagger = (delay = 0.06): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: delay } },
});

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.2, ease } },
};
