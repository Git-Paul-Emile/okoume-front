import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ env: { backendUrl: 'http://api.test/api/v1' } }));

const { contentBackend } = await import('./content.backend');

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

describe('contenus sur l’API', () => {
  it('n’envoie que les champs modifiables d’un espace publicitaire, jamais le contrat', async () => {
    fetchMock.mockResolvedValue(
      json({
        id: 'ad1',
        placement: 'home-promo',
        advertiser: null,
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
});
