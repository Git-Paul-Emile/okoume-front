import type { PaymentMethod } from '@/features/orders/orders.types';

/**
 * Couleurs des graphiques, dérivées de l'identité (vert forêt, or, mûre) et rendues plus saturées
 * pour rester distinguables par les personnes daltoniennes (palette vérifiée : contraste ≥ 3:1, ΔE CVD ≥ 8).
 */
export const chartColor = {
  primary: '#127552',
  secondary: '#b07a1a',
  tertiary: '#a64d73',
  grid: '#e5ece7',
  axis: '#6b7a73',
};

export const paymentColor: Record<PaymentMethod, string> = {
  cash: chartColor.primary,
  airtel: chartColor.secondary,
  moov: chartColor.tertiary,
};

const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });
/** 1,2 M ; 850 k : pour les axes, jamais pour les montants exacts. */
export const compactNumber = (n: number) => compact.format(n).replace(/\u202f/g, '\u00a0');

const integer = new Intl.NumberFormat('fr-FR');
export const formatInt = (n: number) => integer.format(Math.round(n)).replace(/\u202f/g, '\u00a0');

export const formatPercent = (n: number, digits = 1) =>
  `${n.toLocaleString('fr-FR', { maximumFractionDigits: digits, minimumFractionDigits: 0 })}\u00a0%`;
