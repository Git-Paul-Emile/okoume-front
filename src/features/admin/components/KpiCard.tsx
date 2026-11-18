import { motion } from 'motion/react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { fadeUp } from '@/lib/motion';
import { cn } from '@/utils/text';
import { formatPercent } from '../chart.utils';

interface Props {
  label: string;
  value: string;
  /** Variation en % par rapport à la période précédente. */
  change: number | null;
  hint: string;
}

/** Indicateur clé : la valeur domine, la variation et le détail restent secondaires. */
export function KpiCard({ label, value, change, hint }: Props) {
  const up = (change ?? 0) >= 0;
  return (
    <motion.div variants={fadeUp} className="card flex h-full min-w-0 flex-col p-5">
      <p className="text-sm font-medium text-ink-soft">{label}</p>
      <p className="mt-2 text-[26px] leading-tight font-extrabold tracking-tight text-ink tabular-nums">{value}</p>
      <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-3 text-sm">
        {change === null ? (
          <span className="text-ink-muted">Pas de période à comparer</span>
        ) : (
          <span className={cn('inline-flex items-center gap-1 font-semibold', up ? 'text-forest' : 'text-danger')}>
            {up ? (
              <TrendingUp className="size-4" aria-hidden="true" />
            ) : (
              <TrendingDown className="size-4" aria-hidden="true" />
            )}
            <span className="sr-only">{up ? 'Hausse de' : 'Baisse de'}</span>
            {up ? '+' : '−'}
            {formatPercent(Math.abs(change))}
          </span>
        )}
        <span className="text-ink-muted">{hint}</span>
      </div>
    </motion.div>
  );
}
