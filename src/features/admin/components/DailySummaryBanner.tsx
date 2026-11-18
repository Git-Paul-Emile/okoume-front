import { motion } from 'motion/react';
import { Lightbulb } from 'lucide-react';
import { Link } from 'react-router';
import { formatDate } from '@/utils/formatDate';
import type { DailySummary } from '../adminAssistant';
import { formatPercent } from '../chart.utils';

/** Résumé quotidien de l'assistant, affiché en tête du tableau de bord (17.3). */
export function DailySummaryBanner({ summary, findings }: { summary: DailySummary; findings: number }) {
  const [revenue, count] = summary.lines;
  const trend = (c: number | null) => (c === null ? '' : ` (${c >= 0 ? '+' : '−'}${formatPercent(Math.abs(c), 0)})`);
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      aria-label="Résumé du jour"
      className="card flex flex-wrap items-start gap-4 p-5"
    >
      <Lightbulb className="mt-0.5 size-6 shrink-0 text-gold" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-bold text-ink">Résumé du {formatDate(summary.day.toISOString())}</p>
        {summary.insufficient ? (
          <p className="mt-1 text-ink-soft">Données insuffisantes : aucune commande ni visite ce jour-là.</p>
        ) : (
          <p className="mt-1 text-ink-soft">
            {count.value} commande{count.value === '1' ? '' : 's'}
            {trend(count.change)} pour {revenue.value}
            {trend(revenue.change)} par rapport au même jour la semaine dernière.{' '}
            {summary.highlights.filter((h) => !h.startsWith('Le chiffre')).join(' ')}{' '}
            <span className={findings ? 'font-semibold text-warning' : 'font-semibold text-forest'}>
              {findings
                ? `${findings} point${findings > 1 ? 's' : ''} d’attention.`
                : 'Aucune anomalie importante détectée.'}
            </span>
          </p>
        )}
      </div>
      <Link to="/admin/assistant" className="shrink-0 text-sm font-semibold text-forest hover:underline">
        Ouvrir l’assistant
      </Link>
    </motion.section>
  );
}
