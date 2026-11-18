import type { Category } from './categories.types';
import { ancestors, buildTree, inCategory, shopCategories } from './categories.utils';

const cat = (id: string, parentId: string | null, over: Partial<Category> = {}): Category => ({
  id,
  slug: id,
  name: id,
  parentId,
  image: 'x.png',
  ...over,
});

const categories = [
  cat('mode', null),
  cat('mode-homme', 'mode'),
  cat('mode-femme', 'mode'),
  cat('tradi-homme', 'mode-homme'),
  cat('tradi-femme', 'mode-femme'),
  cat('traditionnel', null, { members: ['tradi-homme', 'tradi-femme'] }),
];
const byId = new Map(categories.map((c) => [c.id, c]));

describe('catégories', () => {
  it('construit trois niveaux sans la collection', () => {
    const tree = buildTree(categories);
    expect(tree.map((c) => c.id)).toEqual(['mode']);
    expect(tree[0].children[0].children.map((c) => c.id)).toEqual(['tradi-homme']);
  });

  it('remonte les parents', () => {
    expect(ancestors('tradi-homme', byId).map((c) => c.id)).toEqual(['tradi-homme', 'mode-homme', 'mode']);
  });

  it('rattache un produit à ses parents et à la collection', () => {
    expect(inCategory('tradi-homme', 'mode-homme', byId)).toBe(true);
    expect(inCategory('tradi-homme', 'mode', byId)).toBe(true);
    expect(inCategory('tradi-femme', 'traditionnel', byId)).toBe(true);
    expect(inCategory('mode-homme', 'traditionnel', byId)).toBe(false);
  });

  it('montre « Traditionnel » et pas les sous-sous-catégories dans « Acheter par catégorie »', () => {
    expect(shopCategories(categories).map((c) => c.id)).toEqual(['mode-homme', 'mode-femme', 'traditionnel']);
  });
});
