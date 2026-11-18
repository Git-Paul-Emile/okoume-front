import type { Tier } from '@/features/settings/settings.types';

/** Niveau actuel et progression vers le suivant, d'après le cumul d'achats livrés et payés. */
export function tierProgress(tiers: Tier[], totalSpent: number) {
  const sorted = [...tiers].sort((a, b) => a.threshold - b.threshold);
  const current = [...sorted].reverse().find((t) => totalSpent >= t.threshold) ?? sorted[0];
  const next = sorted.find((t) => t.threshold > totalSpent) ?? null;
  const progress = next ? (totalSpent - current.threshold) / (next.threshold - current.threshold) : 1;
  return {
    current,
    next,
    progress: Math.min(1, Math.max(0, progress)),
    remaining: next ? next.threshold - totalSpent : 0,
  };
}
