import { z } from 'zod';
import { ApiError } from '@/api/ApiError';
import { backend } from '@/api/backend';
import type { Id } from '@/api/types';
import type { Article } from '@/features/articles/articles.types';
import type { LegalPageRecord } from '@/features/legal/legal.api';
import type { Ad, AdInput, Banner, ExclusiveOffer } from './home.types';

/**
 * Contenus sur l'API (api/src/features/content) : bannières, espaces publicitaires, offres exclusives, articles et
 * pages légales. Le serveur filtre ce qui est visible (campagnes en cours, articles publiés à leur date).
 */

const bannerDto = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  cta: z.string(),
  href: z.string(),
  image: z.string(),
  accent: z.enum(['forest', 'mure']),
});

const adDto = z.object({
  id: z.string(),
  placement: z.string(),
  advertiser: z.string().nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  priority: z.number(),
  image: z.string(),
  imageMobile: z.string().nullable(),
  alt: z.string(),
  href: z.string(),
  active: z.boolean(),
});

const offerDto = z.object({
  id: z.string(),
  label: z.string(),
  title: z.string(),
  productId: z.string(),
  href: z.string().nullable(),
  position: z.number(),
});

const blockDto = z.object({ type: z.enum(['p', 'h2']), text: z.string() });
const articleDto = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  category: z.string(),
  excerpt: z.string(),
  cover: z.string(),
  content: z.array(blockDto),
  publishedAt: z.string(),
  readingTime: z.number(),
  status: z.enum(['draft', 'published']),
  seo: z.object({ title: z.string(), description: z.string() }).nullable(),
  history: z
    .array(
      z.object({
        at: z.string(),
        by: z.string(),
        event: z.string(),
        title: z.string(),
        excerpt: z.string(),
        content: z.array(blockDto),
        status: z.enum(['draft', 'published']),
        publishedAt: z.string(),
      }),
    )
    .optional(),
});

const legalDto = z.object({
  slug: z.string(),
  title: z.string(),
  sections: z.array(z.object({ heading: z.string(), body: z.array(z.string()) })),
  updatedAt: z.string(),
});

const toBanner = (raw: unknown): Banner => bannerDto.parse(raw);
const toAd = (raw: unknown): Ad => adDto.parse(raw);
const toOffer = (raw: unknown): ExclusiveOffer => {
  const o = offerDto.parse(raw);
  return {
    id: o.id,
    label: o.label,
    title: o.title,
    productId: o.productId,
    href: o.href,
    active: true,
    order: o.position,
  };
};

export function toArticle(raw: unknown): Article {
  const { seo, history, ...a } = articleDto.parse(raw);
  return { ...a, ...(seo ? { seo } : {}), ...(history ? { history } : {}) };
}

const toLegalPage = (raw: unknown): LegalPageRecord => {
  const p = legalDto.parse(raw);
  return { id: p.slug, title: p.title, sections: p.sections, updatedAt: p.updatedAt };
};

const list = <T>(raw: unknown, map: (item: unknown) => T) => z.array(z.unknown()).parse(raw).map(map);

/** Champs d'un article envoyés au serveur : l'historique et l'identifiant sont tenus par lui. */
const articleBody = (a: Article) => ({
  slug: a.slug,
  title: a.title,
  category: a.category,
  excerpt: a.excerpt,
  cover: a.cover,
  content: a.content,
  publishedAt: a.publishedAt,
  readingTime: a.readingTime,
  status: a.status,
  seo: a.seo ?? null,
});

export const contentBackend = {
  banners: async (signal?: AbortSignal) => list(await backend.get('/content/banners', undefined, signal), toBanner),
  ads: async (placement: string, signal?: AbortSignal) =>
    list(await backend.get('/content/ads', { placement }, signal), toAd),
  offers: async (signal?: AbortSignal) => list(await backend.get('/content/offers', undefined, signal), toOffer),
  articles: async (signal?: AbortSignal) => list(await backend.get('/content/articles', undefined, signal), toArticle),

  async article(slug: string, signal?: AbortSignal): Promise<Article | null> {
    try {
      return toArticle(await backend.get(`/content/articles/${encodeURIComponent(slug)}`, undefined, signal));
    } catch (error) {
      if (error instanceof ApiError && (error.isNotFound || error.status === 400)) return null;
      throw error;
    }
  },

  legalPages: async (signal?: AbortSignal) =>
    list(await backend.get('/content/legal-pages', undefined, signal), toLegalPage),

  staffBanners: async (signal?: AbortSignal) =>
    list(await backend.get('/staff/content/banners', undefined, signal), toBanner),
  updateBanner: async (id: Id, patch: Partial<Banner>) =>
    toBanner(
      await backend.patch(`/staff/content/banners/${id}`, {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.subtitle !== undefined ? { subtitle: patch.subtitle } : {}),
        ...(patch.cta !== undefined ? { cta: patch.cta } : {}),
        ...(patch.href !== undefined ? { href: patch.href } : {}),
        ...(patch.image !== undefined ? { image: patch.image } : {}),
        ...(patch.accent !== undefined ? { accent: patch.accent } : {}),
      }),
    ),

  staffAds: async (signal?: AbortSignal) => list(await backend.get('/staff/content/ads', undefined, signal), toAd),
  createAd: async (ad: AdInput) => toAd(await backend.post('/staff/content/ads', ad)),
  /** Le contrat de l'annonceur n'est pas conservé par l'API : il reste dans les documents de la boutique. */
  updateAd: async (id: Id, patch: Partial<Ad>) =>
    toAd(
      await backend.patch(`/staff/content/ads/${id}`, {
        ...(patch.advertiser !== undefined ? { advertiser: patch.advertiser } : {}),
        ...(patch.startsAt !== undefined ? { startsAt: patch.startsAt } : {}),
        ...(patch.endsAt !== undefined ? { endsAt: patch.endsAt } : {}),
        ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
        ...(patch.image !== undefined ? { image: patch.image } : {}),
        ...(patch.imageMobile !== undefined ? { imageMobile: patch.imageMobile } : {}),
        ...(patch.alt !== undefined ? { alt: patch.alt } : {}),
        ...(patch.href !== undefined ? { href: patch.href } : {}),
        ...(patch.active !== undefined ? { active: patch.active } : {}),
      }),
    ),

  staffArticles: async (signal?: AbortSignal) =>
    list(await backend.get('/staff/content/articles', undefined, signal), toArticle),
  /** Le serveur garde la version précédente et nomme le changement (modification, publication…). */
  saveArticle: async (article: Article) =>
    toArticle(
      article.id
        ? await backend.put(`/staff/content/articles/${article.id}`, articleBody(article))
        : await backend.post('/staff/content/articles', articleBody(article)),
    ),

  staffLegalPages: async (signal?: AbortSignal) =>
    list(await backend.get('/staff/content/legal-pages', undefined, signal), toLegalPage),
  saveLegalPage: async (page: LegalPageRecord) =>
    toLegalPage(
      await backend.put(`/staff/content/legal-pages/${page.id}`, { title: page.title, sections: page.sections }),
    ),
};
