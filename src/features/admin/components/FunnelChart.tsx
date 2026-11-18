import { BarChart } from '@mui/x-charts/BarChart';
import { chartColor, formatInt, formatPercent } from '../chart.utils';
import type { funnel } from '../dashboard.utils';
import { axisStyle } from './chartStyles';

/** Tunnel d'achat : une barre horizontale par étape ; l'infobulle donne le taux de passage depuis l'étape précédente. */
export function FunnelChart({ data }: { data: ReturnType<typeof funnel> }) {
  const steps = data.steps.map((s, i) => {
    const prev = i ? data.steps[i - 1].value : 0;
    return { ...s, rate: prev ? (s.value / prev) * 100 : null };
  });

  return (
    <div className="flex flex-1 flex-col">
      <BarChart
        height={240}
        layout="horizontal"
        hideLegend
        borderRadius={4}
        margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
        dataset={steps.map((s, i) => ({ i, value: s.value }))}
        yAxis={[
          {
            dataKey: 'i',
            scaleType: 'band',
            categoryGapRatio: 0.35,
            width: 170,
            disableTicks: true,
            disableLine: true,
            valueFormatter: (i: number) => steps[i].label,
          },
        ]}
        xAxis={[{ position: 'none' }]}
        series={[
          {
            dataKey: 'value',
            label: 'Effectif',
            color: chartColor.primary,
            valueFormatter: (v, { dataIndex }) => {
              const rate = steps[dataIndex].rate;
              return rate === null
                ? formatInt(v ?? 0)
                : `${formatInt(v ?? 0)} (${formatPercent(rate)} de l’étape précédente)`;
            },
          },
        ]}
        sx={axisStyle}
      />
      <p className="mt-auto border-t border-sage pt-4 text-sm text-ink-soft">
        Abandon de panier : <span className="font-bold text-ink">{formatPercent(data.abandonment, 0)}</span> des paniers
        créés n’aboutissent pas à une commande.
      </p>
    </div>
  );
}
