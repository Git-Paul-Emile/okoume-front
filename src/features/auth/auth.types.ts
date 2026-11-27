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

export interface User {
  id: Id;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addresses: Address[];
  hasOrdered: boolean;
  /** Dernière connexion, pour la durée de conservation des comptes inactifs (3 ans). */
  lastLoginAt?: string;
  createdAt: string;
}
