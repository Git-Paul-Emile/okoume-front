import { contentBackend } from '@/features/home/content.backend';

/** Le serveur ne renvoie que les articles publiés à leur date : les articles programmés attendent (3.6). */
export const articlesApi = {
  list: (signal?: AbortSignal) => contentBackend.articles(signal),
  bySlug: (slug: string, signal?: AbortSignal) => contentBackend.article(slug, signal),
};
