import { reviewsBackend } from './reviews.backend';
import type { Id } from '@/api/types';
import type { Review } from './reviews.types';

export interface ProductRating {
  productId: Id;
  average: number;
  count: number;
}

export const reviewsApi = {
  /** Les notes sont calculées par le serveur : les avis eux-mêmes ne sont pas téléchargés. */
  ratings: (signal?: AbortSignal): Promise<ProductRating[]> => reviewsBackend.ratings(signal),
  forProduct: (productId: Id, signal?: AbortSignal): Promise<Review[]> => reviewsBackend.forProduct(productId, signal),
  /** Avis du client sur ce produit, quel que soit son statut (un seul avis par client et par produit). */
  mine: (productId: Id, signal?: AbortSignal) => reviewsBackend.mine(productId, signal),
  /** Tout avis, nouveau ou modifié, repasse en modération ; la version précédente est conservée par le serveur. */
  save: (review: Pick<Review, 'productId' | 'rating' | 'comment' | 'photos'>) =>
    reviewsBackend.save(review.productId, { rating: review.rating, comment: review.comment, photos: review.photos }),
};
