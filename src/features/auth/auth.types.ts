import type { Id } from '@/api/types';
import type { TierId } from '@/features/settings/settings.types';

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

export type NotificationTopic = 'orders' | 'support' | 'loyalty' | 'promotions';
export type NotificationChannel = 'email' | 'push';

/**
 * Préférences de notification (26). « email » et « push » restent les interrupteurs généraux ;
 * « topics » précise le choix par type de message. Les e-mails de commande et d'assistance
 * sont des messages de service : ils ne se désactivent pas.
 */
export interface NotificationPrefs {
  email: boolean;
  push: boolean;
  topics?: Partial<Record<NotificationTopic, Partial<Record<NotificationChannel, boolean>>>>;
}

export interface User {
  id: Id;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthday: string | null;
  referralCode: string;
  loyaltyPoints: number;
  totalSpent: number;
  tier: TierId;
  favorites: Id[];
  /** Produits récemment consultés, synchronisés entre appareils (3.8). */
  recentlyViewed?: Id[];
  addresses: Address[];
  notificationPrefs: NotificationPrefs;
  /** Cadeau d'anniversaire choisi par le client (12.5). */
  birthdayRewardChoice?: 'points' | 'code';
  hasOrdered: boolean;
  /** Adresse e-mail vérifiée par code (19.1). */
  emailVerifiedAt?: string;
  /** Dernière connexion, pour la durée de conservation des comptes inactifs (3 ans). */
  lastLoginAt?: string;
  createdAt: string;
}
