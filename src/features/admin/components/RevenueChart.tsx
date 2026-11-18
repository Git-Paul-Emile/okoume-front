import { BarChart } from '@mui/x-charts/BarChart';
import { formatPrice } from '@/utils/formatPrice';
import { chartColor, compactNumber } from '../chart.utils';
import type { revenueSeries } from '../dashboard.utils';
import { axisStyle } from './chartStyles';

type Row = ReturnType<typeof revenueSeries>[number];

const SERIES = [
  { key: 'revenue', label: 'Chiffre d’affaires', color: chartColor.primary },
  { key: 'margin', label: 'Marge brute', color: chartColor.secondary },
] as const;

/** Chiffre d'affaires et marge brute par jour, semaine ou mois : barres groupées sur un seul axe (FCFA). */
export function RevenueChart({ data }: { data: Row[] }) {
  const totals = SERIES.map((s) => data.reduce((sum, d) => sum + d[s.key], 0));
  // Au plus 8 étiquettes sur l'axe horizontal
  const every = Math.ceil(data.length / 8);

  return (
    <div className="flex flex-1 flex-col">
      <ul className="mb-2 flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Légende">
        {SERIES.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="size-3 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
            <span className="text-ink-soft">{s.label}</span>
            <span className="font-bold text-ink tabular-nums">{formatPrice(totals[i])}</span>
          </li>
        ))}
      </ul>

      <BarChart
        height={280}
        hideLegend
        borderRadius={4}
        grid={{ horizontal: true }}
        margin={{ left: 0, right: 8, top: 16, bottom: 0 }}
        dataset={data.map((d, i) => ({ i, revenue: d.revenue, margin: d.margin }))}
        xAxis={[
          {
            dataKey: 'i',
            scaleType: 'band',
            categoryGapRatio: 0.3,
            barGapRatio: 0.1,
            tickLabelInterval: (_v, i) => i % every === 0,
            valueFormatter: (i: number, ctx) => (ctx.location === 'tick' ? data[i].label : data[i].title),
            disableTicks: true,
          },
        ]}
        yAxis={[{ valueFormatter: (v: number) => compactNumber(v), width: 52, disableTicks: true }]}
        series={SERIES.map((s) => ({
          dataKey: s.key,
          label: s.label,
          color: s.color,
          valueFormatter: (v) => formatPrice(v ?? 0),
        }))}
        sx={axisStyle}
      />

      <div className="sr-only">
        <table>
          <caption>Chiffre d’affaires et marge brute</caption>
          <thead>
            <tr>
              <th>Période</th>
              <th>Chiffre d’affaires</th>
              <th>Marge brute</th>
              <th>Commandes</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.start.toISOString()}>
                <td>{d.title}</td>
                <td>{formatPrice(d.revenue)}</td>
                <td>{formatPrice(d.margin)}</td>
                <td>{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
