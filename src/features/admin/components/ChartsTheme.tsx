import { createTheme, ThemeProvider } from '@mui/material/styles';
import { frFR } from '@mui/x-charts/locales';
import type { ReactNode } from 'react';
import { chartColor } from '../chart.utils';

/**
 * Thème MUI limité aux graphiques MUI X : police et couleurs de texte du site.
 * Pas de CssBaseline : les styles globaux restent ceux de Tailwind.
 */
const theme = createTheme(
  {
    typography: { fontFamily: "'Plus Jakarta Sans Variable', ui-sans-serif, system-ui, sans-serif" },
    palette: {
      primary: { main: chartColor.primary },
      text: { primary: '#25352f', secondary: chartColor.axis },
      divider: chartColor.grid,
    },
    shape: { borderRadius: 10 },
  },
  frFR,
);

export function ChartsTheme({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
