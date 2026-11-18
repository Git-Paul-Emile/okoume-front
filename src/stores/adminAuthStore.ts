import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminUser } from '@/features/admin/admin.types';

/** Session du back-office, séparée de celle des clients. */
interface AdminAuthState {
  admin: AdminUser | null;
  setAdmin: (admin: AdminUser | null) => void;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist((set) => ({ admin: null, setAdmin: (admin) => set({ admin }) }), { name: 'shop-admin-session' }),
);
