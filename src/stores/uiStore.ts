import { create } from 'zustand';

export interface FlyingItem {
  id: number;
  image: string;
  from: { x: number; y: number; width: number; height: number };
}

interface UiState {
  cartOpen: boolean;
  assistantOpen: boolean;
  mobileMenuOpen: boolean;
  flying: FlyingItem | null;
  cartPulse: number;
  setCartOpen: (open: boolean) => void;
  setAssistantOpen: (open: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  /** Lance l'animation « vers le panier » depuis l'élément source. */
  flyToCart: (image: string, source: Element | null) => void;
  endFlight: () => void;
}

let flightId = 0;

export const useUiStore = create<UiState>((set) => ({
  cartOpen: false,
  assistantOpen: false,
  mobileMenuOpen: false,
  flying: null,
  cartPulse: 0,
  setCartOpen: (cartOpen) => set({ cartOpen }),
  setAssistantOpen: (assistantOpen) => set({ assistantOpen }),
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
  flyToCart: (image, source) => {
    if (!source) return set((s) => ({ cartPulse: s.cartPulse + 1 }));
    const r = source.getBoundingClientRect();
    set({ flying: { id: ++flightId, image, from: { x: r.left, y: r.top, width: r.width, height: r.height } } });
  },
  endFlight: () => set((s) => ({ flying: null, cartPulse: s.cartPulse + 1 })),
}));
