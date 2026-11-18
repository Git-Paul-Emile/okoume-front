import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Id } from '@/api/types';

/** Produits récemment consultés, mémorisés sur l'appareil. */
interface RecentlyViewedState {
  ids: Id[];
  push: (id: Id) => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      ids: [],
      push: (id) => set((s) => ({ ids: [id, ...s.ids.filter((x) => x !== id)].slice(0, 12) })),
    }),
    { name: 'shop-recently-viewed' },
  ),
);
