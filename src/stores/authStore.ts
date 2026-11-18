import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Id } from '@/api/types';

/** Session côté client : uniquement l'identifiant. Les données du compte vivent dans le cache TanStack Query. */
interface AuthState {
  userId: Id | null;
  setUserId: (id: Id | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist((set) => ({ userId: null, setUserId: (userId) => set({ userId }) }), { name: 'shop-session' }),
);
