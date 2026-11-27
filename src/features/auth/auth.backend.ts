import { z } from 'zod';
import { backend, getPage } from '@/api/backend';
import type { Id } from '@/api/types';
import type { RegisterInput } from './auth.schemas';
import type { Address, User } from './auth.types';

const customerDto = z.object({
  id: z.string(), email: z.string(), firstName: z.string(), lastName: z.string(), phone: z.string().nullable(),
  createdAt: z.string(),
});
const addressDto = z.object({
  id: z.string(), label: z.string(), recipient: z.string(), phone: z.string(), zoneId: z.string(),
  landmark: z.string(), instructions: z.string(), isDefault: z.boolean(), createdAt: z.string(),
});
const toAddress = (raw: unknown): Address => addressDto.parse(raw);

function toUser(customerRaw: unknown, addresses: Address[], hasOrdered: boolean): User {
  const customer = customerDto.parse(customerRaw);
  return {
    id: customer.id, email: customer.email, firstName: customer.firstName, lastName: customer.lastName,
    phone: customer.phone ?? '', addresses, hasOrdered,
    createdAt: customer.createdAt,
  };
}

async function me(signal?: AbortSignal): Promise<User> {
  const [customer, addresses, orders] = await Promise.all([
    backend.get('/auth/me', undefined, signal),
    backend.get('/me/addresses', undefined, signal),
    getPage('/orders', { page: 1, limit: 1 }, (value) => value, signal),
  ]);
  return toUser(customer, z.array(addressDto).parse(addresses).map(toAddress), orders.total > 0);
}

export const authBackend = {
  me,
  async login(identifier: string, password: string) { await backend.post('/auth/sessions', { identifier, password }); },
  logout: () => backend.delete('/auth/sessions/current'),
  async register(input: RegisterInput) {
    const { confirmPassword: _confirmPassword, ...body } = input;
    await backend.post('/auth/registrations', body);
  },
  updateProfile: (patch: Partial<Pick<User, 'firstName' | 'lastName'>>) => backend.patch('/me', patch),
  updateContact: (body: { type: 'email' | 'phone'; value: string }) => backend.patch('/auth/contact-changes', body),
  addAddress: (address: Omit<Address, 'id' | 'isDefault'>) => backend.post('/me/addresses', address),
  setDefaultAddress: (id: Id) => backend.patch(`/me/addresses/${id}`, { isDefault: true }),
  removeAddress: (id: Id) => backend.delete(`/me/addresses/${id}`),
};
