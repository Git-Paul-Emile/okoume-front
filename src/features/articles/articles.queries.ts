import { useQuery } from '@tanstack/react-query';
import { articlesApi } from './articles.api';

export function useArticles() {
  return useQuery({ queryKey: ['articles'], queryFn: ({ signal }) => articlesApi.list(signal) });
}

export function useArticle(slug: string) {
  return useQuery({ queryKey: ['articles', slug], queryFn: ({ signal }) => articlesApi.bySlug(slug, signal) });
}
