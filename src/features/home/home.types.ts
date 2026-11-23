import type { Id } from '@/api/types';

export interface Banner {
  id: Id;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  image: string;
  accent: 'forest' | 'mure';
}

/** Bannière publicitaire administrable, affichée à un emplacement donné de la page. */
export interface Ad {
  id: Id;
  placement: string;
  /** Nom de l'entreprise annonceuse ; null pour le visuel « espace disponible » de la boutique. */
  advertiser: string | null;
  /** Début et fin de campagne (ISO) ; null = sans limite. */
  /** Si plusieurs campagnes sont en cours, la plus prioritaire s'affiche. */
  priority: number;
  /** Visuel ordinateur, 1200 × 400 px conseillé. */
  image: string;
  /** Visuel mobile facultatif, 800 × 600 px conseillé. */
  imageMobile: string | null;
  /** Texte alternatif : ce que dit le visuel. */
  alt: string;
  /** Lien interne (/catalogue…) ou externe (annonceur). */
  href: string;
  active: boolean;
  /** Contrat ou bon de commande de l'annonceur (back-office uniquement). */
  contract?: { name: string; size: number; type: string; url: string } | null;
}

/** Champs d'une campagne publicitaire transmis à l'API. */
export type AdInput = Omit<Ad, 'id' | 'contract'>;

/** Encart « Offre exclusive » de l'accueil, administrable (titre, produit mis en avant, lien). */
export interface ExclusiveOffer {
  id: Id;
  label: string;
  title: string;
  productId: Id;
  /** Lien personnalisé ; à défaut, la fiche du produit. */
  href: string | null;
  active: boolean;
  order: number;
}
