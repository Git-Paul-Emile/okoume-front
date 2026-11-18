import { imageSrcSet, responsiveImage } from './responsiveImage';

describe('images adaptées à l’écran', () => {
  it('propose plusieurs largeurs quand le service le permet', () => {
    const set = imageSrcSet('https://images.unsplash.com/photo-1?q=80');
    expect(set?.split(', ')).toHaveLength(4);
    expect(set).toContain('w=640');
    expect(set).toContain(' 640w');
  });
  it('garde l’image d’origine sinon', () => {
    expect(responsiveImage('https://cdn.dummyjson.com/a.webp', '100vw')).toEqual({
      src: 'https://cdn.dummyjson.com/a.webp',
    });
  });
});
