import type { Id } from '@/api/types';
import type { Order, OrderItem, PaymentMethod } from '@/features/orders/orders.types';
import type { Product, Variant } from '@/features/products/products.types';

/** Rôle unique du back-office dans le MVP. */
export type AdminRole = 'super_admin';

export interface AdminUser {
  id: Id;
  firstName: string;
  lastName: string;
  email: string;
  role: AdminRole;
  /** Ouverture de la session, pour la révocation (19.2). */
  loginAt?: string;
}

/** Membre de l'équipe vu depuis l'écran « Équipe ». */
export interface TeamMember extends AdminUser {
  status: 'active' | 'invited' | 'suspended';
  /**
   * Délégation des remboursements (14.5) : montant maximal par remboursement, en FCFA.
   * null ou absent = pas de délégation. L'administrateur principal n'a pas de plafond.
   */
  refundLimit?: number | null;
  backupCodesLeft?: number;
  sessionsRevokedAt?: string | null;
  inviteToken?: string | null;
  inviteExpiresAt?: string | null;
}

export type StockMovementType =
  'reception' | 'ajustement' | 'commande' | 'annulation' | 'retour' | 'non_vendable' | 'mise_au_rebut';

/** Mouvement de stock (7.4) : quantité avant et après, variation, type, motif, date et auteur. */
export interface StockMovement {
  id: Id;
  productId: Id;
  variantId: Id;
  label: string;
  type?: StockMovementType;
  before?: number;
  after?: number;
  delta: number;
  reason: string;
  by: string;
  at: string;
}

/** Trace d'une action du back-office (17.7, 19.4). En production, écrite par l'API, non modifiable. */
export interface ActivityEntry {
  id: Id;
  at: string;
  actorId: Id;
  actorName: string;
  role: AdminRole;
  action: string;
  /** Écran d'où l'action a été faite. */
  screen: string;
}

/** Livreur du répertoire (9.3) : pas de compte sur la plateforme. */
export interface Courier {
  id: Id;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  vehicle: 'Moto' | 'Voiture' | 'Vélo' | 'À pied';
  zoneIds: Id[];
  active: boolean;
  notes: string;
}

/** Proposition de l'assistant appliquée après validation, avec de quoi revenir en arrière (17.8). */
export interface AssistantAction {
  id: Id;
  proposalId: string;
  title: string;
  changes: Array<{ productId: Id; label: string; before: Partial<AdminProduct>; after: Partial<AdminProduct> }>;
  appliedAt: string;
  appliedBy: string;
  revertedAt: string | null;
  revertedBy?: string;
}

export interface ReviewReport {
  id: Id;
  reviewId: Id;
  reason: string;
  createdAt: string;
}

/** Données réservées au back-office : coût d'achat et coût réel de livraison. */
export interface AdminVariant extends Variant {
  cost?: number;
  /** Poids en grammes et dimensions en centimètres, facultatifs (4.3). */
  weightGrams?: number | null;
  dimensions?: { length: number; width: number; height: number } | null;
}
/** Vérification d'un produit de vendeur avant publication (cahier des charges 32.3). */
export type ProductModeration = 'in_review' | 'changes_requested' | 'pending_moderation' | 'approved' | 'rejected';

export interface AdminProduct extends Omit<Product, 'variants'> {
  variants: AdminVariant[];
  /** Produit de vendeur : état de sa vérification, points relevés et note de l'équipe ; null pour Okoumé */
  moderation?: ProductModeration | null;
  moderationIssues?: string[];
  moderationNote?: string | null;
  /** Données nécessaires à la fiscalité (4.2) : à valider avec un expert-comptable. */
  tax?: { vatRate: number; hsCode: string };
}

/** Changement de prix d'une variante (4.7) : ancienne et nouvelle valeur, date, auteur, motif. */
export interface PriceChange {
  id: Id;
  productId: Id;
  variantId: Id;
  label: string;
  before: number;
  after: number;
  at: string;
  by: string;
  reason: string;
}
export interface AdminOrderItem extends OrderItem {
  unitCost?: number;
}
/** Encaissement ou remboursement enregistré par une personne autorisée (8.4, 14.4). */
export interface PaymentRecord {
  id: string;
  kind: 'payment' | 'refund';
  amount: number;
  method: PaymentMethod;
  /** Date de réception des fonds ou de l'opération de remboursement. */
  at: string;
  reference: string;
  note: string;
  by: string;
  recordedAt: string;
}

export interface AdminOrder extends Omit<Order, 'items'> {
  items: AdminOrderItem[];
  deliveryCost?: number;
  /** Livreur chargé de la course (nom affiché et fiche du répertoire). */
  courier?: string;
  courierId?: Id;
  /** Livraisons échouées : motif et décision consignés (9.6). */
  deliveryFailures?: Array<{ at: string; reason: string; decision: 'retry' | 'cancel'; by: string }>;
  /** Vérification humaine d'une commande signalée comme suspecte (19.3). */
  /** Vérification anti-fraude (19.3) tenue par l'API : motifs à la création, puis note de la personne qui a vérifié */
  review?: {
    status: 'pending' | 'cleared';
    reasons: string[];
    note: string | null;
    by: string | null;
    at: string | null;
  } | null;
  payments?: PaymentRecord[];
}

/** Mesure d'audience quotidienne (outil de statistiques respectueux du consentement). */
export interface SiteStat {
  id: string;
  date: string;
  visitors: number;
  pageViews: number;
  pwaSessions: number;
  productViews: number;
  addToCart: number;
  checkouts: number;
  orders: number;
}

export type Period = '7d' | '30d' | '90d' | '6m';
