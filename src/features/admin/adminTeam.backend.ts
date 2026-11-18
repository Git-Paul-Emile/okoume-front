import { z } from 'zod';
import { backend, getAll } from '@/api/backend';
import type { Id } from '@/api/types';
import type { ActivityEntry, AdminRole, TeamMember } from './admin.types';
import { isPermission, type CustomRole } from './permissions';

/**
 * Équipe sur l'API (api/src/features/staff-team), réservée à l'administrateur principal. Le lien d'invitation est
 * envoyé par e-mail par le serveur, qui n'en garde que l'empreinte : il n'apparaît pas dans la liste.
 */

const role = z.enum(['super_admin', 'catalog_manager', 'orders_manager', 'stock_manager']);

const memberDto = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role,
  extraRoles: z.array(role),
  customRoleIds: z.array(z.string()),
  status: z.enum(['invited', 'active', 'suspended']),
  refundLimit: z.number().nullable(),
  inviteExpiresAt: z.string().nullable(),
  lastLoginAt: z.string().nullable(),
  backupCodesLeft: z.number(),
  createdAt: z.string(),
});

const toMember = (raw: unknown): TeamMember => {
  const m = memberDto.parse(raw);
  return {
    id: m.id,
    email: m.email,
    firstName: m.firstName,
    lastName: m.lastName,
    role: m.role,
    extraRoles: m.extraRoles,
    customRoleIds: m.customRoleIds,
    status: m.status,
    refundLimit: m.refundLimit,
    inviteExpiresAt: m.inviteExpiresAt,
    backupCodesLeft: m.backupCodesLeft,
  };
};

const roleDto = z
  .object({ id: z.string(), name: z.string(), permissions: z.array(z.string()) })
  .transform((r): CustomRole => ({ ...r, permissions: r.permissions.filter(isPermission) }));
const inviteDto = z.object({ member: z.unknown(), inviteLink: z.string() });

const activityDto = z
  .object({
    id: z.string(),
    staffId: z.string().nullable(),
    staffName: z.string(),
    role,
    area: z.string(),
    action: z.string(),
    createdAt: z.string(),
  })
  .transform((a): ActivityEntry => ({
    id: a.id,
    at: a.createdAt,
    actorId: a.staffId ?? '',
    actorName: a.staffName,
    role: a.role,
    action: a.action,
    screen: a.area,
  }));

export const adminTeamBackend = {
  /** Journal tenu par l'API à chaque écriture réussie ; l'interface ne l'écrit pas. */
  activity: (signal?: AbortSignal) => getAll('/staff/activity', {}, (raw) => activityDto.parse(raw), signal),

  /** Export déclaré avant la génération du fichier : l'API inscrit le motif au journal (18.3) */
  declareExport: (input: { title: string; format: 'csv' | 'xlsx' | 'pdf'; rows: number; reason: string }) =>
    backend.post('/staff/exports', input),

  /** Membres actifs (prénom et nom), lisibles par toute l'équipe : attribution des demandes d'assistance */
  directory: async (signal?: AbortSignal) =>
    z
      .array(z.object({ id: z.string(), firstName: z.string(), lastName: z.string() }))
      .parse(await backend.get('/staff/team/directory', undefined, signal)),

  team: async (signal?: AbortSignal) =>
    z
      .array(z.unknown())
      .parse(await backend.get('/staff/team', undefined, signal))
      .map(toMember),

  async invite(member: { email: string; firstName: string; lastName: string; role: AdminRole }) {
    const { member: raw } = inviteDto.parse(
      await backend.post('/staff/team/invitations', {
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        role: member.role,
      }),
    );
    return toMember(raw);
  },

  async renewInvite(id: Id) {
    const { member } = inviteDto.parse(await backend.post(`/staff/team/${id}/invitations`));
    return toMember(member);
  },

  /** Seuls les champs que l'API gère sont envoyés ; elle ferme elle-même les sessions si les droits changent. */
  update: async (id: Id, patch: Partial<TeamMember>) =>
    toMember(
      await backend.patch(`/staff/team/${id}`, {
        ...(patch.role !== undefined ? { role: patch.role } : {}),
        ...(patch.extraRoles !== undefined ? { extraRoles: patch.extraRoles } : {}),
        ...(patch.customRoleIds !== undefined ? { customRoleIds: patch.customRoleIds } : {}),
        ...(patch.status === 'active' || patch.status === 'suspended' ? { status: patch.status } : {}),
        ...(patch.refundLimit !== undefined ? { refundLimit: patch.refundLimit } : {}),
      }),
    ),

  revokeSessions: (id: Id) => backend.post(`/staff/team/${id}/session-revocations`),

  resetBackupCodes: (id: Id, reason: string) => backend.post(`/staff/team/${id}/backup-code-resets`, { reason }),

  customRoles: async (signal?: AbortSignal): Promise<CustomRole[]> =>
    z.array(roleDto).parse(await backend.get('/staff/custom-roles', undefined, signal)),

  saveCustomRole: async (role: CustomRole): Promise<CustomRole> =>
    roleDto.parse(
      role.id
        ? await backend.put(`/staff/custom-roles/${role.id}`, { name: role.name, permissions: role.permissions })
        : await backend.post('/staff/custom-roles', { name: role.name, permissions: role.permissions }),
    ),

  /** Invitation, étape 1 : le lien est valide, un code part à l'adresse invitée. */
  startInvitation: async (token: string) =>
    z
      .object({ firstName: z.string(), email: z.string() })
      .parse(await backend.post(`/staff/auth/invitations/${encodeURIComponent(token)}/codes`)),

  /** Étape 2 : mot de passe et code ; les codes de secours ne sont remis qu'une fois. */
  acceptInvitation: async (token: string, code: string, password: string) =>
    z
      .object({ backupCodes: z.array(z.string()) })
      .parse(await backend.post(`/staff/auth/invitations/${encodeURIComponent(token)}/acceptance`, { code, password })),
};
