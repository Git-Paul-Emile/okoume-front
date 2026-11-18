import { motion } from 'motion/react';
import { CircleCheck, Info, OctagonAlert, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/utils/text';
import type { ActionItem, AlertLevel } from '../dashboard.utils';

const levels: Record<AlertLevel, { label: string; icon: typeof Info; className: string }> = {
  critical: { label: 'Critique', icon: OctagonAlert, className: 'text-danger' },
  warning: { label: 'Avertissement', icon: TriangleAlert, className: 'text-warning' },
  info: { label: 'Information', icon: Info, className: 'text-ink-muted' },
};

/** Ce qui attend l'équipe, du plus urgent au moins urgent. Chaque ligne mène à l'écran de traitement. */
export function ActionQueue({ items }: { items: ActionItem[] }) {
  const pending = items.filter((i) => i.count > 0);
  if (!pending.length)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <CircleCheck className="size-9 text-forest" aria-hidden="true" />
        <p className="font-semibold">Rien en attente</p>
        <p className="text-sm text-ink-muted">Toutes les demandes ont été traitées.</p>
      </div>
    );

  return (
    <ul className="-mx-2 flex-1 space-y-0.5">
      {pending.map((item, i) => {
        const level = levels[item.level];
        return (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <Link to={item.to} className="group flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors">
              <level.icon className={cn('size-5 shrink-0', level.className)} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink group-hover:text-forest">{item.label}</span>
                <span className={cn('block text-xs font-semibold', level.className)}>{level.label}</span>
              </span>
              <span className="text-lg font-extrabold text-ink tabular-nums">{item.count}</span>
            </Link>
          </motion.li>
        );
      })}
    </ul>
  );
}
