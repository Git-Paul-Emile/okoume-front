import type { Id } from '@/api/types';

export type TicketCategory = 'commande' | 'livraison' | 'retour' | 'produit' | 'compte' | 'publicite';
export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';

/** Pièce jointe (photo ou PDF), limitée en taille et en format. */
export interface Attachment {
  name: string;
  /** Taille en octets ; inconnue pour une image déjà hébergée, qui s'affiche en vignette */
  size?: number;
  type: string;
  url: string;
}

export interface TicketMessage {
  id: Id;
  from: 'customer' | 'support';
  body: string;
  at: string;
  attachments?: Attachment[];
}

export interface Ticket {
  id: Id;
  number: string;
  userId: Id | null;
  email: string;
  name: string;
  category: TicketCategory;
  orderNumber: string | null;
  subject: string;
  status: TicketStatus;
  priority: 'normal' | 'high';
  satisfaction: number | null;
  messages: TicketMessage[];
  createdAt: string;
  reopenedAt?: string;
  /** Membre de l'équipe responsable (15.2). */
  assigneeId?: string | null;
  /** Solution retenue ou motif de clôture, communiqué au client. */
  closureReason?: string;
  resolvedAt?: string;
}
