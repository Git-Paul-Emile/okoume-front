import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ env: { backendUrl: 'http://api.test/api/v1' } }));

const { contentBackend, toArticle } = await import('./content.backend');

const json = (body: unknown) =>
  new Response(JSON.stringify({ success: true, data: body }), { headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const call = () => ({
  route: `${fetchMock.mock.calls[0]![1].method} ${String(fetchMock.mock.calls[0]![0]).replace('http://api.test/api/v1', '')}`,
  body: JSON.parse(String(fetchMock.mock.calls[0]![1].body ?? 'null')) as unknown,
});

const article = {
  id: 'a1',
  slug: 'payer-par-mobile-money',
  title: 'Payer par Mobile Money',
  category: 'Guide',
  excerpt: 'Les étapes.',
  cover: 'https://medias.test/c.jpg',
  content: [{ type: 'p', text: 'Texte.' }],
  publishedAt: '2026-11-01T08:00:00.000Z',
  readingTime: 3,
  status: 'published',
  seo: null,
};

describe('contenus sur l’API', () => {
  it('lit un article sans SEO ni historique comme le front les attend', () => {
    const a = toArticle(article);
    expect(a).not.toHaveProperty('seo');
    expect(a).not.toHaveProperty('history');
  });

  it('crée un article puis le remplace, sans envoyer son historique', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(article)));
    await contentBackend.saveArticle({ ...toArticle(article), id: '' });
    expect(call().route).toBe('POST /staff/content/articles');
    fetchMock.mockClear();
    await contentBackend.saveArticle({ ...toArticle(article), history: [] });
    expect(call()).toMatchObject({ route: 'PUT /staff/content/articles/a1' });
    expect(call().body).not.toHaveProperty('history');
  });

  it('n’envoie que les champs modifiables d’un espace publicitaire, jamais le contrat', async () => {
    fetchMock.mockResolvedValue(
      json({
        id: 'ad1',
        placement: 'home-promo',
        advertiser: null,
        startsAt: null,
        endsAt: null,
        priority: 1,
        image: '/ads/a.svg',
        imageMobile: null,
        alt: 'Espace disponible',
        href: '/contact',
        active: false,
      }),
    );
    await contentBackend.updateAd('ad1', {
      active: false,
      contract: { name: 'c.pdf', size: 1, type: 'application/pdf', url: 'x' },
    });
    expect(call()).toEqual({ route: 'PATCH /staff/content/ads/ad1', body: { active: false } });
  });

  it('rend null pour un article inconnu ou pas encore publié', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Article introuvable.' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(await contentBackend.article('a-venir')).toBeNull();
  });
});
