import { LineChart, lineClasses } from '@mui/x-charts/LineChart';
import { chartColor, compactNumber, formatInt } from '../chart.utils';
import type { trafficSeries } from '../dashboard.utils';
import { axisStyle } from './chartStyles';

type Row = ReturnType<typeof trafficSeries>[number];

/** Visiteurs uniques sur la période : aire et courbe, repère vertical et infobulle au survol. */
export function VisitorsChart({ data }: { data: Row[] }) {
  const every = Math.ceil(data.length / 7);
  return (
    <div className="flex flex-1 flex-col">
      <LineChart
        height={260}
        hideLegend
        grid={{ horizontal: true }}
        margin={{ left: 0, right: 12, top: 16, bottom: 0 }}
        dataset={data.map((d, i) => ({ i, visitors: d.visitors }))}
        xAxis={[
          {
            dataKey: 'i',
            scaleType: 'point',
            tickLabelInterval: (_v, i) => i % every === 0,
            valueFormatter: (i: number, ctx) => (ctx.location === 'tick' ? data[i].label : data[i].title),
            disableTicks: true,
          },
        ]}
        yAxis={[{ valueFormatter: (v: number) => compactNumber(v), width: 44, disableTicks: true }]}
        series={[
          {
            dataKey: 'visitors',
            label: 'Visiteurs',
            color: chartColor.primary,
            area: true,
            showMark: false,
            curve: 'monotoneX',
            valueFormatter: (v) => formatInt(v ?? 0),
          },
        ]}
        sx={{
          ...axisStyle,
          [`& .${lineClasses.area}`]: { fillOpacity: 0.12 },
          [`& .${lineClasses.line}`]: { strokeWidth: 2 },
        }}
      />

      <div className="sr-only">
        <table>
          <caption>Visiteurs par période</caption>
          <thead>
            <tr>
              <th>Période</th>
              <th>Visiteurs</th>
              <th>Sessions PWA</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.start.toISOString()}>
                <td>{d.title}</td>
                <td>{d.visitors}</td>
                <td>{d.pwa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
