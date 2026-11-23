import { z } from 'zod';
import { backend } from '@/api/backend';
import type { Id } from '@/api/types';
import type { RegisterInput } from './auth.schemas';
import type { Address, NotificationPrefs, NotificationTopic, User } from './auth.types';

/**
 * Comptes clients sur l'API (api/src/features/auth, account, notifications).
 * Chaque réponse est validée avant usage ; le compte du front est assemblé à partir de plusieurs ressources.
 */

const customerDto = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  emailVerifiedAt: z.string().nullable(),
  createdAt: z.string(),
});

const addressDto = z.object({
  id: z.string(),
  label: z.string(),
  recipient: z.string(),
  phone: z.string(),
  zoneId: z.string(),
  landmark: z.string(),
  instructions: z.string(),
  isDefault: z.boolean(),
});

/** Réglages renvoyés par l'API : une ligne par sujet (l'e-mail des sujets obligatoires reste verrouillé). */
const prefsDto = z.array(
  z.object({
    topic: z.string(),
    email: z.boolean(),
  }),
);
const ordersPage = z.object({ total: z.number() });

const TOPICS: NotificationTopic[] = ['orders', 'promotions'];

const toAddress = (raw: unknown): Address => addressDto.parse(raw);

/** Réglages de l'API (par sujet) dans la forme du front : interrupteurs généraux et détail par sujet. */
export function toNotificationPrefs(raw: unknown): NotificationPrefs {
  const rows = prefsDto.parse(raw);
  const of = (t: NotificationTopic) => {
    const row = rows.find((r) => r.topic === t);
    return { email: row?.email ?? false };
  };
  return {
    email: TOPICS.some((t) => of(t).email),
    topics: Object.fromEntries(TOPICS.map((t) => [t, of(t)])),
  };
}

/** Compte du front assemblé : identité, adresses, favoris, notifications et première commande. */
export function toUser(parts: {
  customer: unknown;
  addresses: unknown;
  favorites: unknown;
  prefs: unknown;
  orders: unknown;
}): User {
  const customer = customerDto.parse(parts.customer);
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone ?? '',
    favorites: z.array(z.string()).parse(parts.favorites),
    addresses: z.array(z.unknown()).parse(parts.addresses).map(toAddress),
    notificationPrefs: toNotificationPrefs(parts.prefs),
    hasOrdered: ordersPage.parse(parts.orders).total > 0,
    ...(customer.emailVerifiedAt ? { emailVerifiedAt: customer.emailVerifiedAt } : {}),
    createdAt: customer.createdAt,
  };
}

export const authBackend = {
  /** Compte de la session en cours ; 401 si la session est absente ou expirée. */
  async me(signal?: AbortSignal): Promise<User> {
    const customer = await backend.get('/auth/me', undefined, signal);
    const [addresses, favorites, prefs, orders] = await Promise.all([
      backend.get('/me/addresses', undefined, signal),
      backend.get('/me/favorites', undefined, signal),
      backend.get('/notification-preferences', undefined, signal),
      backend.get('/orders', { page: 1, limit: 1 }, signal),
    ]);
    return toUser({ customer, addresses, favorites, prefs, orders });
  },

  /** Ouvre la session (cookies posés par l'API) et renvoie l'identifiant du client. */
  async login(identifier: string, password: string): Promise<Id> {
    return customerDto.parse(await backend.post('/auth/sessions', { identifier, password })).id;
  },

  logout: () => backend.delete('/auth/sessions/current'),

  /** Inscription : l'API envoie un code par e-mail ; le compte s'active à sa saisie (verifyEmail). */
  register: (input: RegisterInput) =>
    backend.post('/auth/registrations', {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      ...(input.phone ? { phone: input.phone } : {}),
      password: input.password,
      acceptTerms: true,
    }),

  /** Code d'inscription : la session s'ouvre si le code est bon. */
  async verifyEmail(email: string, code: string): Promise<Id> {
    return customerDto.parse(await backend.post('/auth/verifications', { email: email.toLowerCase(), code })).id;
  },

  resendVerification: (email: string) => backend.post('/auth/verification-codes', { email: email.toLowerCase() }),

  /** Réponse identique que le compte existe ou non : l'API ne révèle pas les comptes. */
  requestPasswordReset: (identifier: string) => backend.post('/auth/password-resets', { identifier }),

  confirmPasswordReset: (identifier: string, code: string, password: string) =>
    backend.post('/auth/password-resets/confirmations', { identifier, code, password }),

  updateProfile: (patch: { firstName?: string; lastName?: string }) => backend.patch('/me', patch),

  /** Changement d'e-mail ou de téléphone, étape 1 : mot de passe vérifié, code envoyé par l'API. */
  requestContactChange: (change: { type: 'email' | 'phone'; value: string; password: string }) =>
    backend.post('/auth/contact-changes', change),

  /** Étape 2 : le code confirme la nouvelle coordonnée. */
  confirmContactChange: (code: string) => backend.post('/auth/contact-changes/confirmations', { code }),

  /** Seuls les sujets modifiés sont envoyés ; l'API garde les autres. */
  updateNotificationPrefs: (prefs: NotificationPrefs) =>
    backend.patch(
      '/notification-preferences',
      Object.fromEntries(
        Object.entries(prefs.topics ?? {}).filter(([, channels]) => channels && Object.keys(channels).length > 0),
      ),
    ),

  addAddress: async (address: Omit<Address, 'id' | 'isDefault'>) =>
    toAddress(await backend.post('/me/addresses', address)),
  setDefaultAddress: (id: Id) => backend.patch(`/me/addresses/${id}`, { isDefault: true }),
  removeAddress: (id: Id) => backend.delete(`/me/addresses/${id}`),

  addFavorite: (productId: Id) => backend.put(`/me/favorites/${productId}`),
  removeFavorite: (productId: Id) => backend.delete(`/me/favorites/${productId}`),
};
