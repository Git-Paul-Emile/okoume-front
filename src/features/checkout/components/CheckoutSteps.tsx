import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { cn } from '@/utils/text';

const STEPS = ['Livraison', 'Paiement', 'Récapitulatif'];

export function CheckoutSteps({ current, onGoTo }: { current: number; onGoTo: (step: number) => void }) {
  return (
    <ol className="relative mb-8 flex items-center justify-between" aria-label="Étapes de la commande">
      <div className="absolute top-5 right-[16%] left-[16%] h-0.5 bg-sage" aria-hidden="true">
        <motion.div
          className="h-full bg-forest"
          animate={{ width: `${(current / (STEPS.length - 1)) * 100}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={label}
            className="relative z-10 flex flex-1 flex-col items-center gap-2"
            aria-current={active ? 'step' : undefined}
          >
            <button
              type="button"
              disabled={!done}
              onClick={() => onGoTo(i)}
              className={cn(
                'grid size-10 place-items-center rounded-full border-2 text-sm font-bold transition-colors',
                done && 'border-forest bg-white text-forest hover:border-forest-dark',
                active && 'border-forest bg-white text-forest ring-4 ring-forest/15',
                !done && !active && 'border-sage-dark bg-white text-ink-muted',
              )}
              aria-label={done ? `Revenir à l’étape ${label}` : label}
            >
              {done ? (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Check className="size-5" />
                </motion.span>
              ) : (
                i + 1
              )}
            </button>
            <span className={cn('text-xs font-semibold sm:text-sm', active || done ? 'text-ink' : 'text-ink-muted')}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
