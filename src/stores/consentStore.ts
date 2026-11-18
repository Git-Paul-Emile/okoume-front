import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Consentement aux cookies (cahier des charges, 25.2). Les cookies nécessaires (panier, session)
 * ne demandent pas d'accord ; la mesure d'audience ne démarre qu'après un accord explicite.
 * Le choix est redemandé au bout de 6 mois.
 */
export const CONSENT_MAX_AGE = 182 * 86_400_000;

interface ConsentState {
  analytics: boolean;
  decidedAt: number | null;
  /** Fenêtre de préférences ouverte (bannière ou lien « Gérer les cookies »). */
  preferencesOpen: boolean;
  decide: (analytics: boolean) => void;
  openPreferences: () => void;
  closePreferences: () => void;
}

export const useConsentStore = create<ConsentState>()(
  persist(
    (set) => ({
      analytics: false,
      decidedAt: null,
      preferencesOpen: false,
      decide: (analytics) => set({ analytics, decidedAt: Date.now(), preferencesOpen: false }),
      openPreferences: () => set({ preferencesOpen: true }),
      closePreferences: () => set({ preferencesOpen: false }),
    }),
    { name: 'shop-consent', partialize: ({ analytics, decidedAt }) => ({ analytics, decidedAt }) },
  ),
);

/** À appeler avant tout envoi de mesure d'audience. */
export const canMeasureAudience = () => {
  const { analytics, decidedAt } = useConsentStore.getState();
  return analytics && !!decidedAt && Date.now() - decidedAt < CONSENT_MAX_AGE;
};
