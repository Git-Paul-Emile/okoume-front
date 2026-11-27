import { z } from 'zod';
import { backend } from '@/api/backend';
import type { Id } from '@/api/types';
import type { LegalPageRecord } from '@/features/legal/legal.api';
import type { Ad, AdInput, Banner, ExclusiveOffer } from './home.types';

/**
 * Contenus sur l'API : espaces publicitaires, offres exclusives et pages légales.
 */

const adDto = z.object({
  id: z.string(),
  placement: z.string(),
  advertiser: z.string().nullable(),
  priority: z.number(),
  image: z.string(),
  imageMobile: z.string().nullable(),
  alt: z.string(),
  href: z.string(),
  active: z.boolean(),
});

const bannerDto = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  cta: z.string(),
  href: z.string(),
  image: z.string(),
  accent: z.enum(['forest', 'mure']),
});

const offerDto = z.object({
  id: z.string(),
  label: z.string(),
  title: z.string(),
  productId: z.string(),
  href: z.string().nullable(),
  position: z.number(),
});

const legalDto = z.object({
  slug: z.string(),
  title: z.string(),
  sections: z.array(z.object({ heading: z.string(), body: z.array(z.string()) })),
  updatedAt: z.string(),
});

const toAd = (raw: unknown): Ad => adDto.parse(raw);
const toBanner = (raw: unknown): Banner => bannerDto.parse(raw);
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

const toLegalPage = (raw: unknown): LegalPageRecord => {
  const p = legalDto.parse(raw);
  return { id: p.slug, title: p.title, sections: p.sections, updatedAt: p.updatedAt };
};

const list = <T>(raw: unknown, map: (item: unknown) => T) => z.array(z.unknown()).parse(raw).map(map);

export const contentBackend = {
  banners: async (signal?: AbortSignal) => list(await backend.get('/content/banners', undefined, signal), toBanner),
  ads: async (placement: string, signal?: AbortSignal) =>
    list(await backend.get('/content/ads', { placement }, signal), toAd),
  offers: async (signal?: AbortSignal) => list(await backend.get('/content/offers', undefined, signal), toOffer),
  legalPages: async (signal?: AbortSignal) =>
    list(await backend.get('/content/legal-pages', undefined, signal), toLegalPage),

  staffAds: async (signal?: AbortSignal) => list(await backend.get('/staff/content/ads', undefined, signal), toAd),
  createAd: async (ad: AdInput) => toAd(await backend.post('/staff/content/ads', ad)),
  /** Le contrat de l'annonceur n'est pas conservé par l'API : il reste dans les documents de la boutique. */
  updateAd: async (id: Id, patch: Partial<Ad>) =>
    toAd(
      await backend.patch(`/staff/content/ads/${id}`, {
        ...(patch.advertiser !== undefined ? { advertiser: patch.advertiser } : {}),
        ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
        ...(patch.image !== undefined ? { image: patch.image } : {}),
        ...(patch.imageMobile !== undefined ? { imageMobile: patch.imageMobile } : {}),
        ...(patch.alt !== undefined ? { alt: patch.alt } : {}),
        ...(patch.href !== undefined ? { href: patch.href } : {}),
        ...(patch.active !== undefined ? { active: patch.active } : {}),
      }),
    ),

  staffLegalPages: async (signal?: AbortSignal) =>
    list(await backend.get('/staff/content/legal-pages', undefined, signal), toLegalPage),
  saveLegalPage: async (page: LegalPageRecord) =>
    toLegalPage(
      await backend.put(`/staff/content/legal-pages/${page.id}`, { title: page.title, sections: page.sections }),
    ),
};
