import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Id } from '@/api/types';
import { reviewsApi, type ProductRating } from './reviews.api';
import type { RatingStats } from './reviews.types';

const toStats = (ratings: ProductRating[]) =>
  new Map<Id, RatingStats>(ratings.map((r) => [r.productId, { average: r.average, count: r.count }]));

/** Note moyenne et nombre d'avis approuvés, par produit. */
export function useRatingStats() {
  return useQuery({
    queryKey: ['reviews', 'ratings'],
    queryFn: ({ signal }) => reviewsApi.ratings(signal),
    select: toStats,
    staleTime: 5 * 60_000,
  });
}

export function useProductReviews(productId: Id | undefined) {
  return useQuery({
    queryKey: ['reviews', 'product', productId],
    queryFn: ({ signal }) => reviewsApi.forProduct(productId!, signal),
    enabled: !!productId,
  });
}


export function useMyReview(userId: Id | undefined, productId: Id) {
  return useQuery({
    queryKey: ['reviews', 'mine', userId, productId],
    queryFn: ({ signal }) => reviewsApi.mine(productId, signal),
    enabled: !!userId,
  });
}

export function useSaveReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reviewsApi.save,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  });
}
