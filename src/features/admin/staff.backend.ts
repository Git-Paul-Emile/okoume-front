import { z } from 'zod';
import { backend } from '@/api/backend';
import type { AdminUser } from './admin.types';

const staffMeDto = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.string(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  owner: z.boolean(),
});

export function toAdminUser(raw: unknown): AdminUser {
  const member = staffMeDto.parse(raw);
  return {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    role: 'super_admin',
  };
}

const sessionDto = z.object({ member: z.unknown() });

/** Connexion de l'équipe par adresse e-mail et mot de passe. */
export const staffBackend = {
  async login(email: string, password: string) {
    const session = sessionDto.parse(
      await backend.post('/staff/auth/sessions', { email: email.trim().toLowerCase(), password }),
    );
    return toAdminUser(session.member);
  },

  me: async (signal?: AbortSignal) => toAdminUser(await backend.get('/staff/auth/me', undefined, signal)),
  logout: () => backend.delete('/staff/auth/sessions/current'),
  revokeOtherSessions: () => backend.delete('/staff/auth/sessions/others'),
};
