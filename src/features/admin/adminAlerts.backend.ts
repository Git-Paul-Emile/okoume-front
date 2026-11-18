import { z } from 'zod';
import { backend } from '@/api/backend';
import type { Id } from '@/api/types';
import type { AlertRecord } from './alerts.rules';

/**
 * Alertes sur l'API (api/src/features/staff-alerts) : détectées par le worker toutes les 15 minutes, regroupées par
 * situation. L'historique et les épisodes sont tenus par le serveur ; le front n'envoie que la décision.
 */

const alertDto = z.object({
  id: z.string(),
  key: z.string(),
  level: z.enum(['info', 'warning', 'critical']),
  title: z.string(),
  detail: z.string(),
  to: z.string(),
  state: z.enum(['new', 'in_progress', 'resolved', 'closed']),
  occurrences: z.number(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  cleared: z.boolean(),
  assigneeId: z.string().nullable(),
  closureReason: z.string().nullable(),
  actionTaken: z.string().nullable(),
  episodes: z.array(z.object({ openedAt: z.string(), resolvedAt: z.string().optional() })),
  lastReminderAt: z.string().nullable(),
  history: z.array(z.object({ at: z.string(), by: z.string(), event: z.string() })),
});

export function toAlert(raw: unknown): AlertRecord {
  const { closureReason, actionTaken, lastReminderAt, ...a } = alertDto.parse(raw);
  return {
    ...a,
    ...(closureReason !== null ? { closureReason } : {}),
    ...(actionTaken !== null ? { actionTaken } : {}),
    ...(lastReminderAt !== null ? { lastReminderAt } : {}),
  };
}

export const adminAlertsBackend = {
  list: async (signal?: AbortSignal) =>
    z
      .array(z.unknown())
      .parse(await backend.get('/staff/alerts', undefined, signal))
      .map(toAlert),

  update: async (id: Id, patch: Partial<AlertRecord>) =>
    toAlert(
      await backend.patch(`/staff/alerts/${id}`, {
        ...(patch.state && patch.state !== 'new' ? { state: patch.state } : {}),
        ...(patch.assigneeId !== undefined ? { assigneeId: patch.assigneeId } : {}),
        ...(patch.closureReason !== undefined ? { closureReason: patch.closureReason } : {}),
        ...(patch.actionTaken !== undefined ? { actionTaken: patch.actionTaken } : {}),
      }),
    ),
};
