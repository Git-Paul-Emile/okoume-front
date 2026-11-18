import type { Id } from '@/api/types';

export interface Review {
  id: Id;
  productId: Id;
  userId: Id | null;
  authorName: string;
  rating: number;
  comment: string;
  photos: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  /** Motif communiqué au client quand l'avis n'est pas publié (13.3). */
  rejectionReason?: string;
  /** Versions précédentes et décisions, conservées à chaque modification (13.3). */
  history?: Array<{ at: string; event: string; rating?: number; comment?: string }>;
}

/** Motifs de refus prévus par la charte de modération (13.3). */
export const REVIEW_REJECTION_REASONS = [
  'Spam, publicité ou répétition abusive',
  'Insultes, menaces ou propos discriminatoires',
  'Divulgation de données personnelles',
  'Avis frauduleux ou achat non vérifiable',
  'Photos inappropriées, dangereuses ou sans rapport',
] as const;

export interface RatingStats {
  average: number;
  count: number;
}
