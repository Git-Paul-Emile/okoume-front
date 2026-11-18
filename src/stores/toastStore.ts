import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  /** false pour masquer l'icône (ex. ajout au panier). */
  icon?: boolean;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = ++counter;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...toast, id }] }));
    window.setTimeout(() => get().dismiss(id), toast.tone === 'error' ? 7000 : 4500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (title: string, extra?: Partial<Omit<Toast, 'id' | 'tone' | 'title'>>) =>
    useToastStore.getState().push({ tone: 'success', title, ...extra }),
  error: (title: string, extra?: Partial<Omit<Toast, 'id' | 'tone' | 'title'>>) =>
    useToastStore.getState().push({ tone: 'error', title, ...extra }),
  info: (title: string, extra?: Partial<Omit<Toast, 'id' | 'tone' | 'title'>>) =>
    useToastStore.getState().push({ tone: 'info', title, ...extra }),
};
