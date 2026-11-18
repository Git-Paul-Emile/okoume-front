import type { Id } from '@/api/types';

export interface ArticleBlock {
  type: 'p' | 'h2';
  text: string;
}

export interface Article {
  id: Id;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  cover: string;
  content: ArticleBlock[];
  publishedAt: string;
  readingTime: number;
  /** « published » avec une date future : publication programmée (3.6). */
  status: 'published' | 'draft';
  /** Métadonnées SEO ; à défaut, le titre et le résumé sont utilisés. */
  seo?: { title: string; description: string };
  /** Versions précédentes, conservées à chaque modification ou dépublication (3.6). */
  history?: ArticleVersion[];
}

export interface ArticleVersion {
  at: string;
  by: string;
  event: string;
  title: string;
  excerpt: string;
  content: ArticleBlock[];
  status: Article['status'];
  publishedAt: string;
}

export const isScheduled = (a: Pick<Article, 'status' | 'publishedAt'>, now = Date.now()) =>
  a.status === 'published' && new Date(a.publishedAt).getTime() > now;
