import type { Tier } from '@/features/settings/settings.types';
import { tierProgress } from './loyalty.utils';

const tiers: Tier[] = [
  { id: 'bronze', name: 'Bronze', threshold: 0, perks: [] },
  { id: 'argent', name: 'Argent', threshold: 300000, perks: [] },
  { id: 'or', name: 'Or', threshold: 1000000, perks: [] },
];

describe('tierProgress', () => {
  it('calcule le niveau et la progression', () => {
    const r = tierProgress(tiers, 650000);
    expect(r.current.id).toBe('argent');
    expect(r.next?.id).toBe('or');
    expect(r.remaining).toBe(350000);
    expect(r.progress).toBeCloseTo(0.5);
  });

  it('reste au niveau maximal', () => {
    expect(tierProgress(tiers, 2000000).next).toBeNull();
  });
});
