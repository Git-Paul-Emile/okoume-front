import type { Ad } from './home.types';
import { pickAds } from './home.utils';

const ad = (over: Partial<Ad>): Ad => ({
  id: '1',
  placement: 'home-promo',
  advertiser: null,
  startsAt: null,
  endsAt: null,
  priority: 0,
  image: '',
  imageMobile: null,
  alt: '',
  href: '/',
  active: true,
  ...over,
});

const now = new Date('2026-11-10T12:00:00Z');
const ids = (ads: Ad[]) => ads.map((a) => a.id);

describe('pickAds', () => {
  const houses = [ad({ id: 'h1', priority: 3 }), ad({ id: 'h2', priority: 2 }), ad({ id: 'h3', priority: 1 })];

  it('montre 3 visuels « espace disponible » sans campagne en cours', () => {
    const past = ad({ id: 'past', advertiser: 'A', endsAt: '2026-11-01T00:00:00Z' });
    expect(ids(pickAds([past, ...houses], now))).toEqual(['h1', 'h2', 'h3']);
  });

  it('place les campagnes en cours en premier, par priorité, puis complète', () => {
    const low = ad({ id: 'low', advertiser: 'A', priority: 1 });
    const high = ad({ id: 'high', advertiser: 'B', priority: 5, startsAt: '2026-11-01T00:00:00Z' });
    expect(ids(pickAds([...houses, low, high], now))).toEqual(['high', 'low', 'h1']);
  });

  it('ignore une campagne qui n’a pas commencé', () => {
    const future = ad({ id: 'future', advertiser: 'A', startsAt: '2026-12-01T00:00:00Z' });
    expect(ids(pickAds([future, ...houses], now))).not.toContain('future');
  });
});
