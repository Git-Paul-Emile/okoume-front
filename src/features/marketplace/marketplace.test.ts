import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ env: { backendUrl: 'https://api.okoume.ga/api/v1' } }));

const { marketplaceBackend, searchParams, toListing } = await import('./marketplace.backend');
const { distanceLabel, mergeMessages, shareLink } = await import('./marketplace.utils');

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const sent = () => ({
  url: String(fetchMock.mock.calls[0]![0]),
  method: fetchMock.mock.calls[0]![1].method as string,
  body: JSON.parse(String(fetchMock.mock.calls[0]![1].body ?? 'null')) as unknown,
});

const listing = {
  slug: 'velo-vtt',
  title: 'Vélo VTT',
  description: 'Bon vélo, peu servi.',
  category: { id: 'c1', label: 'Sport' },
  kind: 'product',
  condition: 'good',
  price: 85_000,
  quantity: 1,
  city: 'Libreville',
  district: 'Nzeng-Ayong',
  photos: ['https://res.cloudinary.com/okoume/image/upload/v.webp'],
  shop: { slug: 'cycles-awa', name: 'Cycles Awa', verified: true },
  sold: false,
  publishedAt: '2026-11-08T10:00:00.000Z',
};

const page = (items: unknown[]) => ({
  success: true,
  data: { items, total: items.length, page: 1, limit: 24, hasNext: false },
});

describe('recherche d’annonces', () => {
  it('n’envoie que les critères renseignés, et jamais le tri par distance en GET', () => {
    expect(
      searchParams({ page: 2, search: '  vélo ', condition: ['good', 'used'], sort: 'distance', city: '' }),
    ).toEqual({
      page: 2,
      limit: 24,
      search: 'vélo',
      condition: 'good,used',
    });
  });

  it('lit une fiche sans distance ni mise en avant comme une annonce ordinaire', () => {
    expect(toListing(listing)).toMatchObject({ distanceKm: null, sponsored: false, shop: { verified: true } });
    expect(() => toListing({ ...listing, condition: 'abîmé' })).toThrow();
  });

  it('envoie la position dans le corps de la requête, jamais dans l’adresse', async () => {
    fetchMock.mockResolvedValue(json(page([{ ...listing, distanceKm: 2, sponsored: true }])));
    const result = await marketplaceBackend.searchNearby(
      { page: 1, condition: ['new'], sort: 'distance' },
      { latitude: 0.39, longitude: 9.45 },
      10,
    );
    expect(sent()).toEqual({
      url: 'https://api.okoume.ga/api/v1/listings/searches',
      method: 'POST',
      body: { page: 1, limit: 24, condition: ['new'], position: { latitude: 0.39, longitude: 9.45 }, maxKm: 10 },
    });
    expect(result.items[0]).toMatchObject({ distanceKm: 2, sponsored: true });
  });
});

describe('demande, signalement et tchat', () => {
  it('envoie la demande sans prix : l’API applique le prix de l’annonce ou le prix convenu', async () => {
    fetchMock.mockResolvedValue(
      json(
        {
          success: true,
          data: {
            id: 'r1',
            number: 'DEM-2026-0001',
            listing: { slug: 'velo-vtt', title: 'Vélo VTT' },
            quantity: 1,
            unitPrice: 80_000,
            total: 80_000,
            paymentMethod: 'airtel',
            handover: 'pickup',
            message: '',
            status: 'sent',
            reason: null,
            history: [],
            createdAt: 'x',
            shop: { slug: 'cycles-awa', name: 'Cycles Awa', phone: null },
          },
        },
        201,
      ),
    );
    const request = await marketplaceBackend.createRequest({
      listingSlug: 'velo-vtt',
      quantity: 1,
      paymentMethod: 'airtel',
      handover: 'pickup',
      contactPhone: '077123456',
      message: '  Disponible samedi ?  ',
    });
    expect(sent().body).toEqual({
      listingSlug: 'velo-vtt',
      quantity: 1,
      paymentMethod: 'airtel',
      handover: 'pickup',
      contactPhone: '077123456',
      message: 'Disponible samedi ?',
    });
    expect(request.shop.phone).toBeNull();
  });

  it('demande les seuls messages écrits depuis le dernier reçu', async () => {
    fetchMock.mockResolvedValue(
      json({
        success: true,
        data: {
          id: 'k1',
          listing: { slug: 'velo-vtt', title: 'Vélo VTT' },
          shop: { name: 'Cycles Awa' },
          status: 'open',
          needsSeller: false,
          agreement: { price: 80_000, expiresAt: '2026-11-13T10:00:00.000Z' },
          lastMessageAt: 'b',
          messages: [],
        },
      }),
    );
    await marketplaceBackend.conversation('k1', '2026-11-11T10:00:00.000Z');
    expect(sent().url).toBe('https://api.okoume.ga/api/v1/conversations/k1?since=2026-11-11T10%3A00%3A00.000Z');
  });

  it('fusionne les messages relevés sans doublon, dans l’ordre', () => {
    const m = (id: string, at: string) => ({ id, author: 'buyer' as const, body: id, createdAt: at });
    expect(mergeMessages([m('a', '1'), m('b', '2')], [m('b', '2'), m('c', '3')]).map((x) => x.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});

describe('affichage', () => {
  it('arrondit la distance affichée et partage par la page d’aperçu de l’API', () => {
    expect(distanceLabel(0.4)).toBe('À moins de 1 km');
    expect(distanceLabel(3)).toBe('À environ 3 km');
    expect(shareLink('velo-vtt')).toBe('https://api.okoume.ga/partage/annonces/velo-vtt');
  });
});
