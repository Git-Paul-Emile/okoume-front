import { axisClasses } from '@mui/x-charts/ChartsAxis';
import { chartsGridClasses } from '@mui/x-charts/ChartsGrid';
import { chartColor } from '../chart.utils';

/** Axes et quadrillage discrets, communs à tous les graphiques MUI X du back-office. */
export const axisStyle = {
  [`& .${axisClasses.line}`]: { stroke: chartColor.grid },
  [`& .${axisClasses.tickLabel}`]: { fill: chartColor.axis, fontSize: 11 },
  [`& .${axisClasses.left} .${axisClasses.line}`]: { display: 'none' },
  [`& .${chartsGridClasses.line}`]: { stroke: chartColor.grid, strokeDasharray: 'none' },
};
