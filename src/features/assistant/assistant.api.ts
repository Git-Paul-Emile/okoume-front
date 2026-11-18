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

export interface AssistantTurn {
  from: 'client' | 'assistant';
  text: string;
}

const answerDto = z.object({ reply: z.string(), productSlugs: z.array(z.string()) });

/** Réponse de l'assistant d'IA de l'API ; en cas d'échec, le widget répond avec ses règles locales. */
export const askAssistant = async (input: { message: string; history: AssistantTurn[]; productSlug?: string }) =>
  answerDto.parse(await backend.post('/assistant/messages', input));
