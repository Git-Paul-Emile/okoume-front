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

});
