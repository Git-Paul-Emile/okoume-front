import { z } from 'zod';
import { backend } from '@/api/backend';

export interface AssistantUsage {
  id: string;
  count: number;
}

const usageDto = z
  .object({ period: z.string(), count: z.number() })
  .transform((u): AssistantUsage => ({ id: u.period, count: u.count }));

/** Compteur mensuel des requêtes de l'assistant (16.6), tenu et plafonné par l'API. */
export const assistantApi = {
  usage: async (signal?: AbortSignal) => usageDto.parse(await backend.get('/assistant/usage', undefined, signal)),
  record: async () => usageDto.parse(await backend.post('/assistant/usage')),
};
