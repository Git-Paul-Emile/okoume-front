import type { Id } from '@/api/types';

export interface Address {
  id: Id;
  label: string;
  recipient: string;
  phone: string;
  zoneId: Id;
  landmark: string;
  instructions: string;
  isDefault: boolean;
}

export type NotificationTopic = 'orders' | 'promotions';
export type NotificationChannel = 'email';

/**
 * Préférences d'e-mail par sujet. Les e-mails de commande sont des messages de service : ils ne se désactivent pas.
 */
export interface NotificationPrefs {
  email: boolean;
  topics?: Partial<Record<NotificationTopic, Partial<Record<NotificationChannel, boolean>>>>;
}

export interface User {
  id: Id;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  favorites: Id[];
  /** Produits récemment consultés, synchronisés entre appareils (3.8). */
  recentlyViewed?: Id[];
  addresses: Address[];
  notificationPrefs: NotificationPrefs;
  hasOrdered: boolean;
  /** Adresse e-mail vérifiée par code (19.1). */
  emailVerifiedAt?: string;
  /** Dernière connexion, pour la durée de conservation des comptes inactifs (3 ans). */
  lastLoginAt?: string;
  createdAt: string;
}
