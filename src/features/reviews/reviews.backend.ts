import { z } from 'zod';
import { backend, getAll } from '@/api/backend';
import { signedUploadDto, uploadPhoto } from '@/api/mediaUpload';
import type { Id } from '@/api/types';
import type { ImageUploader } from '@/utils/upload';
import type { Review } from './reviews.types';

/**
 * Avis sur l'API (api/src/features/reviews). Achat vérifié, modération et nom affiché (prénom et initiale)
 * sont décidés par le serveur.
 */

const reviewDto = z.object({
  id: z.string(),
  productId: z.string(),
  authorName: z.string(),
  rating: z.number(),
  comment: z.string(),
  photos: z.array(z.string()),
  createdAt: z.string(),
  customerId: z.string().nullable().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  rejectionReason: z.string().nullable().optional(),
  history: z
    .array(
      z.object({ at: z.string(), event: z.string(), rating: z.number().optional(), comment: z.string().optional() }),
    )
    .optional(),
});

/** Un avis public n'a ni statut ni auteur : il est publié, et son compte n'est pas montré. */
export function toReview(raw: unknown): Review {
  const r = reviewDto.parse(raw);
  return {
    id: r.id,
    productId: r.productId,
    userId: r.customerId ?? null,
    authorName: r.authorName,
    rating: r.rating,
    comment: r.comment,
    photos: r.photos,
    status: r.status ?? 'approved',
    createdAt: r.createdAt,
    ...(r.rejectionReason ? { rejectionReason: r.rejectionReason } : {}),
    ...(r.history ? { history: r.history } : {}),
  };
}

const ratingsDto = z.array(z.object({ productId: z.string(), average: z.number(), count: z.number() }));

export const reviewsBackend = {
  ratings: async (signal?: AbortSignal) => ratingsDto.parse(await backend.get('/reviews/ratings', undefined, signal)),

  forProduct: (productId: Id, signal?: AbortSignal) => getAll(`/reviews/products/${productId}`, {}, toReview, signal),

  async mine(productId: Id, signal?: AbortSignal): Promise<Review | null> {
    const raw = await backend.get(`/reviews/mine/${productId}`, undefined, signal);
    return raw === null ? null : toReview(raw);
  },

  save: async (productId: Id, content: { rating: number; comment: string; photos: string[] }) =>
    toReview(await backend.put(`/reviews/mine/${productId}`, content)),

  staffList: async (signal?: AbortSignal) => getAll('/staff/reviews', {}, toReview, signal),

  decide: async (
    id: Id,
    decision: { status: 'approved' } | { status: 'rejected'; rejectionReason: string; detail: string },
  ) => toReview(await backend.patch(`/staff/reviews/${id}`, decision)),
};

/** Envoi d'une photo d'avis par un client connecté. */
export const reviewPhotoUploader: ImageUploader = async (image) =>
  uploadPhoto(signedUploadDto.parse(await backend.post('/reviews/photo-uploads')), image);
