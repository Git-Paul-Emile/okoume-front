import { z } from 'zod';
import { backend, getPage } from '@/api/backend';
import { signedUploadDto, uploadPhoto } from '@/api/mediaUpload';
import type { Id } from '@/api/types';
import type { ImageUploader } from '@/utils/upload';

/**
 * Produits de la boutique du vendeur connecté (api/src/features/seller-products), validés à la réception.
 * Un produit n'est en vente qu'après une vérification favorable (cahier des charges 32.3).
 */
export const MODERATIONS = ['in_review', 'changes_requested', 'pending_moderation', 'approved', 'rejected'] as const;
export type SellerProductModeration = (typeof MODERATIONS)[number];
export const CONDITIONS = ['new', 'like_new', 'good', 'used'] as const;
export type SellerProductCondition = (typeof CONDITIONS)[number];

const variantDto = z.object({
  id: z.string(),
  sku: z.string(),
  label: z.string(),
  attributes: z.record(z.string(), z.string()),
  price: z.number(),
  stock: z.number(),
  reserved: z.number(),
  available: z.number(),
  image: z.string().nullable(),
});

const productDto = z.object({
  id: z.string(),
  slug: z.string(),
  sku: z.string(),
  name: z.string(),
  status: z.enum(['draft', 'published', 'archived']),
  categoryId: z.string(),
  brand: z.string().nullable(),
  shortDescription: z.string(),
  description: z.array(z.string()),
  images: z.array(z.string()),
  thumbnail: z.string().nullable(),
  condition: z.enum(CONDITIONS).nullable(),
  moderation: z.enum(MODERATIONS).nullable(),
  moderationIssues: z.array(z.string()),
  moderationNote: z.string().nullable(),
  variants: z.array(variantDto),
  updatedAt: z.string(),
});

export type SellerProduct = z.infer<typeof productDto>;
const toProduct = (raw: unknown) => productDto.parse(raw);

export interface SellerProductFields {
  name: string;
  categoryId: Id;
  brand: string | null;
  shortDescription: string;
  description: string[];
  condition: SellerProductCondition;
  images: string[];
}

export interface NewSellerVariant {
  label: string;
  price: number;
  stock: number;
}

const BASE = '/seller/products';
const path = (id: Id) => `${BASE}/${encodeURIComponent(id)}`;

export const sellerProductsBackend = {
  list: (moderation: SellerProductModeration | undefined, page: number, signal?: AbortSignal) =>
    getPage(BASE, { page, limit: 20, ...(moderation ? { moderation } : {}) }, toProduct, signal),
  get: async (id: Id, signal?: AbortSignal) => toProduct(await backend.get(path(id), undefined, signal)),
  create: async (fields: SellerProductFields, optionName: string | null, variants: NewSellerVariant[]) =>
    toProduct(
      await backend.post(BASE, {
        ...fields,
        specs: [],
        usageTips: null,
        optionName,
        variants: variants.map((v) => ({ ...v, image: null })),
        submit: true,
      }),
    ),
  update: async (id: Id, fields: Partial<SellerProductFields>) => toProduct(await backend.patch(path(id), fields)),
  submit: async (id: Id) => toProduct(await backend.post(`${path(id)}/submission`)),
  withdraw: async (id: Id) => toProduct(await backend.post(`${path(id)}/withdrawal`)),
  addVariant: async (id: Id, variant: NewSellerVariant) =>
    toProduct(await backend.post(`${path(id)}/variants`, { ...variant, image: null })),
  updateVariant: async (id: Id, variantId: Id, fields: { label?: string; price?: number }) =>
    toProduct(await backend.patch(`${path(id)}/variants/${encodeURIComponent(variantId)}`, fields)),
  setStock: async (id: Id, variantId: Id, counted: number, reason: string) =>
    toProduct(await backend.put(`${path(id)}/variants/${encodeURIComponent(variantId)}/stock`, { counted, reason })),
};

export const productPhotoUploader: ImageUploader = async (image) =>
  uploadPhoto(signedUploadDto.parse(await backend.post(`${BASE}/photo-uploads`)), image);

export const moderationLabel: Record<SellerProductModeration, string> = {
  in_review: 'En vérification',
  changes_requested: 'Corrections demandées',
  pending_moderation: 'Examen par l’équipe',
  approved: 'Validé',
  rejected: 'Refusé',
};

export const productConditionLabel: Record<SellerProductCondition, string> = {
  new: 'Neuf',
  like_new: 'Comme neuf',
  good: 'Bon état',
  used: 'Usé',
};

/** État affiché au vendeur : la vérification d'abord, puis la mise en vente. */
export function sellerProductState(p: Pick<SellerProduct, 'status' | 'moderation'>) {
  if (p.status === 'archived') return { label: 'Retiré de la vente', tone: 'neutral' as const };
  if (p.status === 'published') return { label: 'En vente', tone: 'forest' as const };
  if (!p.moderation) return { label: 'Brouillon', tone: 'neutral' as const };
  const tone =
    p.moderation === 'changes_requested' || p.moderation === 'rejected' ? ('danger' as const) : ('warning' as const);
  return { label: moderationLabel[p.moderation], tone };
}
