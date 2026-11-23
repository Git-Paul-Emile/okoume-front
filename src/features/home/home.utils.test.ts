import type { Ad } from './home.types';
import { pickAds } from './home.utils';

const ad = (over: Partial<Ad>): Ad => ({
  id: '1',
  placement: 'home-promo',
  advertiser: null,
  priority: 0,
  image: '',
  imageMobile: null,
  alt: '',
  href: '/',
  active: true,
  ...over,
});

const ids = (ads: Ad[]) => ads.map((a) => a.id);

describe('pickAds', () => {
  const houses = [ad({ id: 'h1', priority: 3 }), ad({ id: 'h2', priority: 2 }), ad({ id: 'h3', priority: 1 })];

  it('montre les espaces disponibles après les visuels annonceurs actifs', () => {
    const advertiser = ad({ id: 'a1', advertiser: 'A' });
    expect(ids(pickAds([advertiser, ...houses]))).toEqual(['a1', 'h1', 'h2']);
  });

  it('place les visuels annonceurs en premier, par priorité, puis complète', () => {
    const low = ad({ id: 'low', advertiser: 'A', priority: 1 });
    const high = ad({ id: 'high', advertiser: 'B', priority: 5 });
    expect(ids(pickAds([...houses, low, high]))).toEqual(['high', 'low', 'h1']);
  });

  it('ignore les espaces masqués', () => {
    const hidden = ad({ id: 'hidden', advertiser: 'A', active: false });
    expect(ids(pickAds([hidden, ...houses]))).not.toContain('hidden');
  });
});
