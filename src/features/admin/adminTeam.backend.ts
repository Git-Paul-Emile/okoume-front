import { z } from 'zod';
import { backend, getAll } from '@/api/backend';
import type { Id } from '@/api/types';
import type { ActivityEntry, TeamMember } from './admin.types';

/**
 * Équipe sur l'API (api/src/features/staff-team). Le lien d'invitation est
 * envoyé par e-mail par le serveur, qui n'en garde que l'empreinte : il n'apparaît pas dans la liste.
 */

const memberDto = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.string(),
  status: z.enum(['invited', 'active', 'suspended']),
  inviteExpiresAt: z.string().nullable(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
});

const toMember = (raw: unknown): TeamMember => {
  const m = memberDto.parse(raw);
  return {
    id: m.id,
    email: m.email,
    firstName: m.firstName,
    lastName: m.lastName,
    role: 'super_admin',
    status: m.status,
    inviteExpiresAt: m.inviteExpiresAt,
  };
};

const inviteDto = z.object({ member: z.unknown(), inviteLink: z.string() });

const activityDto = z
  .object({
    id: z.string(),
    staffId: z.string().nullable(),
    staffName: z.string(),
    role: z.string(),
    area: z.string(),
    action: z.string(),
    createdAt: z.string(),
  })
  .transform((a): ActivityEntry => ({
    id: a.id,
    at: a.createdAt,
    actorId: a.staffId ?? '',
    actorName: a.staffName,
    role: 'super_admin',
    action: a.action,
    screen: a.area,
  }));

export const adminTeamBackend = {
  /** Journal tenu par l'API à chaque écriture réussie ; l'interface ne l'écrit pas. */
  activity: (signal?: AbortSignal) => getAll('/staff/activity', {}, (raw) => activityDto.parse(raw), signal),

  /** Export déclaré avant la génération du fichier : l'API inscrit le motif au journal (18.3) */
  declareExport: (input: { title: string; format: 'csv' | 'xlsx' | 'pdf'; rows: number; reason: string }) =>
    backend.post('/staff/exports', input),

  team: async (signal?: AbortSignal) =>
    z
      .array(z.unknown())
      .parse(await backend.get('/staff/team', undefined, signal))
      .map(toMember),

  async invite(member: { email: string; firstName: string; lastName: string }) {
    const { member: raw } = inviteDto.parse(
      await backend.post('/staff/team/invitations', {
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
      }),
    );
    return toMember(raw);
  },

  async renewInvite(id: Id) {
    const { member } = inviteDto.parse(await backend.post(`/staff/team/${id}/invitations`));
    return toMember(member);
  },

  /** L'API ferme les sessions quand un compte est suspendu. */
  update: async (id: Id, patch: Partial<TeamMember>) =>
    toMember(
      await backend.patch(`/staff/team/${id}`, {
        ...(patch.status === 'active' || patch.status === 'suspended' ? { status: patch.status } : {}),
      }),
    ),

  revokeSessions: (id: Id) => backend.post(`/staff/team/${id}/session-revocations`),

  acceptInvitation: (token: string, password: string) =>
    backend.post(`/staff/auth/invitations/${encodeURIComponent(token)}/acceptance`, { password }),
};
