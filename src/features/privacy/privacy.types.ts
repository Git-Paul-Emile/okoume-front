import type { Id } from '@/api/types';

export type PrivacyRequestType = 'access' | 'export' | 'correction' | 'deletion';
export type PrivacyRequestStatus = 'received' | 'in_progress' | 'completed' | 'refused';

/** Demande d'exercice des droits sur les données personnelles (19.5), suivie jusqu'à la réponse. */
export interface PrivacyRequest {
  id: Id;
  number: string;
  userId: Id;
  name: string;
  email: string;
  type: PrivacyRequestType;
  details: string;
  status: PrivacyRequestStatus;
  createdAt: string;
  /** Date limite de réponse (un mois). */
  dueAt: string;
  response?: string;
  history: Array<{ at: string; by: string; event: string }>;
}
