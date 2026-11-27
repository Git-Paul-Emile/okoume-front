import { ApiError } from '@/api/ApiError';
import type { Id } from '@/api/types';
import { authBackend } from './auth.backend';
import type { Address, User } from './auth.types';
import type { RegisterInput } from './auth.schemas';

const SERVER_PATCHABLE = new Set<keyof User>(['firstName', 'lastName']);

export const authApi = {
  async login(identifier: string, password: string): Promise<User> {
    await authBackend.login(identifier, password);
    return authBackend.me();
  },

  async register(input: RegisterInput): Promise<User> {
    await authBackend.register(input);
    return authBackend.me();
  },

  me: (signal?: AbortSignal): Promise<User> => authBackend.me(signal),

  async update(patch: Partial<User>): Promise<User> {
    const unsupported = Object.keys(patch).filter((key) => !SERVER_PATCHABLE.has(key as keyof User));
    if (unsupported.length)
      throw new ApiError('Cette modification n’est pas disponible.', 501, { fields: unsupported });
    const { firstName, lastName } = patch;
    if (firstName !== undefined || lastName !== undefined)
      await authBackend.updateProfile({ ...(firstName !== undefined ? { firstName } : {}), ...(lastName !== undefined ? { lastName } : {}) });
    return authBackend.me();
  },

  logout: () => authBackend.logout(),

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
};
