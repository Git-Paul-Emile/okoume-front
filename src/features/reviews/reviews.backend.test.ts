import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ env: { backendUrl: 'http://api.test/api/v1' } }));

const { reviewsBackend, toReview } = await import('./reviews.backend');

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify({ success: status < 400, ...(status < 400 ? { data: body } : { error: body }) }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const review = {
  id: 'r1',
  productId: 'p1',
  authorName: 'Awa N.',
  rating: 4,
  comment: 'Tissu de belle qualité.',
  photos: [],
  createdAt: '2026-11-03T08:00:00.000Z',
};

describe('avis sur l’API', () => {
  it('lit un avis public comme publié et sans compte', () => {
    expect(toReview(review)).toMatchObject({ status: 'approved', userId: null });
  });

  it('rend null quand le client n’a pas encore d’avis sur le produit', async () => {
    fetchMock.mockResolvedValue(json(null));
    expect(await reviewsBackend.mine('p1')).toBeNull();
  });

  it('regroupe les signalements de la file de modération', async () => {
    fetchMock.mockResolvedValue(
      json({
        items: [
          {
            ...review,
            customerId: 'c1',
            status: 'approved',
            rejectionReason: null,
            history: [],
            reports: ['Hors sujet'],
          },
        ],
        total: 1,
        page: 1,
        limit: 100,
        hasNext: false,
      }),
    );
    const { reviews, reports } = await reviewsBackend.staffList();
    expect(reviews[0]?.userId).toBe('c1');
    expect(reports).toEqual([{ id: 'r1-0', reviewId: 'r1', reason: 'Hors sujet', createdAt: review.createdAt }]);
  });

  it('considère un second signalement du même client comme déjà enregistré', async () => {
    fetchMock.mockResolvedValue(json({ code: 'CONFLICT', message: 'Vous avez déjà signalé cet avis.' }, 409));
    await expect(reviewsBackend.report('r1', 'Hors sujet')).resolves.toBeUndefined();
  });
});
