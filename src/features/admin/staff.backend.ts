import { z } from 'zod';
import { backend } from '@/api/backend';
import type { AdminUser } from './admin.types';

/**
 * Connexion de l'équipe sur l'API (api/src/features/staff-auth) : mot de passe, puis code reçu par e-mail
 * ou code de secours. Les droits viennent de l'API, qui les relit à chaque requête.
 */

const role = z.enum(['super_admin', 'catalog_manager', 'orders_manager', 'stock_manager']);

const staffMeDto = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role,
  roles: z.array(role),
  permissions: z.array(z.string()),
  owner: z.boolean(),
});

/**
 * Membre de l'équipe dans la forme du front. Les droits effectifs calculés par l'API (rôles standards et
 * personnalisés) sont repris tels quels : le front n'en déduit rien, il masque seulement ce qui est refusé.
 */
export function toAdminUser(raw: unknown): AdminUser {
  const m = staffMeDto.parse(raw);
  return {
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    role: m.role,
    extraRoles: m.roles.filter((r) => r !== m.role),
    customPermissions: m.permissions,
  };
}

const challengeDto = z.object({ challengeId: z.string() });
const sessionDto = z.object({ member: z.unknown(), backupCodesLeft: z.number().nullable().optional() });
const backupCodesDto = z.object({ backupCodes: z.array(z.string()) });

export type SecondFactor = { code: string } | { backupCode: string };

export const staffBackend = {
  /** Étape 1 : l'API vérifie le mot de passe et envoie un code par e-mail. */
  async startLogin(email: string, password: string): Promise<string> {
    return challengeDto.parse(await backend.post('/staff/auth/challenges', { email: email.toLowerCase(), password }))
      .challengeId;
  },

  /** Étape 2 : la session s'ouvre (cookies de l'équipe) si le code ou le code de secours est bon. */
  async completeLogin(challengeId: string, proof: SecondFactor) {
    const session = sessionDto.parse(await backend.post('/staff/auth/sessions', { challengeId, ...proof }));
    return { admin: toAdminUser(session.member), backupCodesLeft: session.backupCodesLeft ?? null };
  },

  /** Mot de passe oublié, étape 1 : même réponse que l'adresse soit connue ou non. */
  requestPasswordReset: (email: string) =>
    backend.post('/staff/auth/password-resets', { email: email.trim().toLowerCase() }),

  /** Étape 2 : code reçu par e-mail et code de secours, puis nouveau mot de passe. */
  confirmPasswordReset: (input: { email: string; code: string; backupCode: string; password: string }) =>
    backend.post('/staff/auth/password-resets/confirmations', { ...input, email: input.email.trim().toLowerCase() }),

  /** Membre connecté, droits relus ; 401 si la session est révoquée, le compte suspendu ou le rôle changé. */
  me: async (signal?: AbortSignal) => toAdminUser(await backend.get('/staff/auth/me', undefined, signal)),

  logout: () => backend.delete('/staff/auth/sessions/current'),

  /** Codes de secours encore utilisables du membre connecté. */
  backupCodesLeft: async (signal?: AbortSignal) =>
    sessionDto.parse(await backend.get('/staff/auth/me', undefined, signal)).backupCodesLeft ?? 0,

  /** Ferme les autres sessions du membre ; celle-ci reste ouverte. */
  revokeOtherSessions: () => backend.delete('/staff/auth/sessions/others'),

  /** Nouveaux codes de secours, affichés une seule fois. */
  async regenerateBackupCodes(): Promise<string[]> {
    return backupCodesDto.parse(await backend.post('/staff/auth/backup-codes')).backupCodes;
  },
};
