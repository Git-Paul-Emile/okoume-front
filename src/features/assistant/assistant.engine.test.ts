import type { Category } from '@/features/categories/categories.types';
import type { Product } from '@/features/products/products.types';
import { answer, type AssistantData } from './assistant.engine';

// Catégorie telle que l'API la renvoie : identifiant UUID, slug lisible
const smartphones = {
  id: '6ebe0681-1f72-8b0a-8b8c-1c42b9ca3807',
  slug: 'smartphones',
  name: 'Smartphones',
  parentId: null,
} as Category;

const phone = (id: string, price: number) =>
  ({
    id,
    slug: id,
    name: `Téléphone ${id}`,
    categoryId: smartphones.id,
    images: [],
    specs: [],
    promotion: null,
    variants: [{ id: `${id}-v`, label: 'Standard', price, stock: 5, reserved: 0, attributes: {} }],
  }) as unknown as Product;

const data: AssistantData = {
  products: [phone('a', 250_000), phone('b', 450_000)],
  categories: [smartphones],
  zones: [],
  settings: null,
};

describe('assistant d’achat', () => {
  it.each(['qu’est ce que tu peux faire pour moi?', 'Que peux-tu faire ?', 'aide', 'Qui es-tu ?'])(
    'se présente quand on lui demande ce qu’il sait faire : « %s »',
    (question) => {
      const reply = answer(question, data);
      expect(reply.text).toContain('Je peux vous aider');
      expect(reply.text).not.toContain('pas de réponse fiable');
    },
  );

  it('trouve la catégorie d’un mot courant malgré les identifiants UUID de l’API', () => {
    const reply = answer('téléphone moins de 300 000', data);
    expect(reply.products?.map((p) => p.id)).toEqual(['a']);
    expect(reply.links?.[0]?.to).toBe(`/catalogue?categorie=${smartphones.id}&max=300000`);
  });

  it('met en relation avec l’équipe quand on demande à parler à quelqu’un', () => {
    expect(answer('je voudrais parler à quelqu’un', data).links?.some((l) => l.to === '/contact')).toBe(true);
  });

  it('répond aux remerciements', () => {
    expect(answer('merci beaucoup', data).text).toMatch(/Avec plaisir/);
  });
});
