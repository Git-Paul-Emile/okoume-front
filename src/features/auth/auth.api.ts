import { ApiError } from '@/api/ApiError';
import type { Id } from '@/api/types';
import { authBackend } from './auth.backend';
import type { Address, User } from './auth.types';

/** Champs du compte modifiables par update() ; les adresses et favoris ont leurs propres appels. */
const SERVER_PATCHABLE = new Set<keyof User>([
  'firstName',
  'lastName',
  'birthday',
  'birthdayRewardChoice',
  'notificationPrefs',
]);

/**
 * Compte du client. La session (cookies) désigne le compte ; codes de vérification, mots de passe et
 * sessions sont gérés par l'API.
 */
export const authApi = {
  /** Connexion par e-mail ou téléphone, avec mot de passe. */
  async login(identifier: string, password: string): Promise<User> {
    await authBackend.login(identifier, password);
    return authBackend.me();
  },

  me: (signal?: AbortSignal): Promise<User> => authBackend.me(signal),

  async update(patch: Partial<User>): Promise<User> {
    const unsupported = Object.keys(patch).filter((k) => !SERVER_PATCHABLE.has(k as keyof User));
    if (unsupported.length)
      throw new ApiError('Cette modification n’est pas encore disponible.', 501, { fields: unsupported });
    const { firstName, lastName, birthday, birthdayRewardChoice, notificationPrefs } = patch;
    if (firstName !== undefined || lastName !== undefined) await authBackend.updateProfile({ firstName, lastName });
    if (birthday !== undefined || birthdayRewardChoice !== undefined)
      await authBackend.updateBirthday({ birthDate: birthday, birthdayChoice: birthdayRewardChoice });
    if (notificationPrefs) await authBackend.updateNotificationPrefs(notificationPrefs);
    return authBackend.me();
  },

  /** Fin de session : l'API révoque le jeton de renouvellement et efface les cookies. */
  logout: () => authBackend.logout(),

  /** Nouvelle adresse ; la première devient l'adresse par défaut. */
  async addAddress(address: Omit<Address, 'id' | 'isDefault'>): Promise<User> {
    await authBackend.addAddress(address);
    return authBackend.me();
  },

  async setDefaultAddress(addressId: Id): Promise<User> {
    await authBackend.setDefaultAddress(addressId);
    return authBackend.me();
  },

  async removeAddress(addressId: Id): Promise<User> {
    await authBackend.removeAddress(addressId);
    return authBackend.me();
  },

  /** Ajoute ou retire un favori ; renvoie la liste à jour. */
  async setFavorite(user: User, productId: Id, favorite: boolean): Promise<Id[]> {
    const next = favorite
      ? [...new Set([...user.favorites, productId])]
      : user.favorites.filter((id) => id !== productId);
    await (favorite ? authBackend.addFavorite(productId) : authBackend.removeFavorite(productId));
    return next;
  },
};
