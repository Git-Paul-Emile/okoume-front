import { motion, type HTMLMotionProps } from 'motion/react';
import { fadeUp, stagger } from '@/lib/motion';

/** Apparition douce, une seule fois, quand la section entre dans l'écran. */
export function Reveal({ children, delay = 0, ...rest }: HTMLMotionProps<'div'> & { delay?: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      variants={fadeUp}
      transition={{ delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Conteneur qui échelonne l'apparition de ses enfants `RevealItem`. */
export function RevealGroup({ children, gap = 0.06, ...rest }: HTMLMotionProps<'div'> & { gap?: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      variants={stagger(gap)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <motion.div variants={fadeUp} {...rest}>
      {children}
    </motion.div>
  );
}
