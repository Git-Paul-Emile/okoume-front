import { z } from 'zod';
import { backend } from '@/api/backend';
import type { Category } from './categories.types';

/** Catégorie telle que l'API la publie (même forme que le type du front), validée à la réception. */
const categoryDto = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  fullName: z.string().optional(),
  parentId: z.string().nullable(),
  icon: z.string().optional(),
  image: z.string().nullable(),
  imageFit: z.enum(['cover', 'contain']).optional(),
  members: z.array(z.string()).optional(),
});

export const categoriesApi = {
  list: async (signal?: AbortSignal): Promise<Category[]> =>
    z.array(categoryDto).parse(await backend.get('/categories', undefined, signal)),
};
