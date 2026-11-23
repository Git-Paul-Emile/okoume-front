import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ env: { backendUrl: 'http://api.test/api/v1' } }));

const {
  adminCatalogBackend,
  categoryBody,
  createProductBody,
  productChanges,
  rootOf,
  staffImageUploader,
  toAdminProduct,
  toPriceChange,
  toStockMovement,
  variantChanges,
} = await import('./adminCatalog.backend');
const { availableWithSource } = await import('./admin.navigation');

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const categories = [
  { id: 'mode', slug: 'mode', name: 'Mode', parentId: null, image: null },
  { id: 'robes', slug: 'robes', name: 'Robes', parentId: 'mode', image: null },
  { id: 'wax', slug: 'wax', name: 'Wax', parentId: 'robes', image: null },
];

const variant = (id: string, label: string, price: number) => ({
  id,
  sku: `SKU-${id}`,
  label,
  attributes: { Taille: label },
  price,
  cost: null,
  stock: 5,
  reserved: 1,
  unsellable: 0,
  lowStockThreshold: 3,
  image: null,
});

const staffProduct = {
  id: 'p1',
  slug: 'robe-wax',
  sku: 'GA-1',
  name: 'Robe wax',
  status: 'draft',
  categoryId: 'wax',
  brand: null,
  shortDescription: 'Robe en pagne wax.',
  description: ['Cousue main.'],
  specs: [],
  usageTips: null,
  tax: { vatRate: 18, hsCode: null },
  images: ['https://res.cloudinary.com/okoume/image/upload/a.webp'],
  thumbnail: 'https://res.cloudinary.com/okoume/image/upload/a.webp',
  featured: false,
  isNew: true,
  dealOfTheDay: false,
  tags: [],
  promotion: null,
  variants: [variant('v1', 'M', 20_000), variant('v2', 'L', 22_000)],
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

const calls = () =>
  fetchMock.mock.calls.map(([url, init]) => ({
    route: `${init.method} ${String(url).replace('http://api.test/api/v1', '')}`,
    body: typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : null,
  }));

describe('produits de l’équipe dans la forme du back-office', () => {
  it('retrouve la famille racine et garde le coût seulement s’il est connu', () => {
    expect(rootOf('wax', categories)).toBe('mode');
    const product = toAdminProduct(staffProduct, categories);
    expect(product).toMatchObject({ rootCategoryId: 'mode', tax: { vatRate: 18, hsCode: '' }, relatedIds: [] });
    expect(product.variants[0]).not.toHaveProperty('cost');
  });

  it('ne retient que les champs réellement modifiés', () => {
    const current = toAdminProduct(staffProduct, categories);
    expect(productChanges(current, { ...current, name: 'Robe wax longue', tax: { vatRate: 18, hsCode: ' ' } })).toEqual(
      {
        name: 'Robe wax longue',
      },
    );
    expect(productChanges(current, { tax: { vatRate: 10, hsCode: '6204' } })).toEqual({ vatRate: 10, hsCode: '6204' });
    expect(variantChanges(current.variants[0]!, { ...current.variants[0]!, price: 21_000, stock: 99 })).toEqual({
      price: 21_000,
    });
  });

  it('prépare la création : nom de l’option pour plusieurs variantes, publication selon le statut', () => {
    const body = createProductBody({ ...toAdminProduct(staffProduct, categories), status: 'published' });
    expect(body).toMatchObject({ optionName: 'Taille', publish: true, hsCode: null, vatRate: 18 });
    expect(body.variants[0]).toEqual({
      label: 'M',
      price: 20_000,
      cost: null,
      stock: 5,
      lowStockThreshold: 3,
      image: null,
      weightGrams: null,
    });
  });

  it('enregistre un produit par ressource : champs, statut, variante modifiée, variante ajoutée', async () => {
    const reply = () => Promise.resolve(json({ success: true, data: url(fetchMock.mock.calls.length) }));
    const url = (n: number) => (n === 1 ? categories : staffProduct);
    fetchMock.mockImplementation(reply);
    const current = toAdminProduct(staffProduct, categories);
    await adminCatalogBackend.updateProduct('p1', {
      name: 'Robe wax longue',
      status: 'published',
      variants: [
        { ...current.variants[0]!, price: 21_000 },
        current.variants[1]!,
        { ...current.variants[1]!, id: 'new-2', label: 'XL', price: 23_000, stock: 2 },
      ],
    });
    expect(calls().map((c) => c.route)).toEqual([
      'GET /staff/categories',
      'GET /staff/products/p1',
      'PATCH /staff/products/p1',
      'PUT /staff/products/p1/status',
      'PATCH /staff/products/p1/variants/v1',
      'POST /staff/products/p1/variants',
      'GET /staff/products/p1',
    ]);
    expect(calls()[4]!.body).toEqual({ price: 21_000 });
    expect(calls()[5]!.body).toMatchObject({ label: 'XL', stock: 2 });
  });
});

describe('catégories, stock et images', () => {
  it('reconnaît une collection à ses membres, sans parent', () => {
    expect(
      categoryBody({
        id: 'c',
        slug: 'traditionnel',
        name: 'Traditionnel',
        parentId: 'mode',
        image: null,
        members: ['robes'],
      }),
    ).toMatchObject({ isCollection: true, parentId: null, memberIds: ['robes'], imageFit: 'contain' });
  });

  it('remplace le stock par la quantité comptée', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json({ success: true, data: {} }, 201)));
    await adminCatalogBackend.setStock('v1', 7, 'Inventaire : comptage');
    expect(calls()[0]).toEqual({
      route: 'POST /staff/variants/v1/stock-movements',
      body: { type: 'ajustement', counted: 7, reason: 'Inventaire : comptage' },
    });
  });

  it('envoie une image avec une autorisation signée pour le dossier demandé', async () => {
    fetchMock
      .mockResolvedValueOnce(
        json(
          {
            success: true,
            data: {
              uploadUrl: 'https://api.cloudinary.com/v1_1/okoume/image/upload',
              fields: { signature: 'sig', asset_folder: 'okoume/test/products' },
              expiresAt: '2026-11-11T12:00:00.000Z',
            },
          },
          201,
        ),
      )
      .mockResolvedValueOnce(json({ secure_url: 'https://res.cloudinary.com/okoume/image/upload/n.webp' }));
    const url = await staffImageUploader('products')(new Blob(['x'], { type: 'image/webp' }));
    expect(url).toBe('https://res.cloudinary.com/okoume/image/upload/n.webp');
    expect(calls()[0]).toEqual({ route: 'POST /staff/media/upload-signatures', body: { folder: 'products' } });
  });

  it('ouvre les écrans du catalogue et du stock avec l’API', () => {
    expect(
      ['/admin/produits', '/admin/categories', '/admin/stock', '/admin/inventaire'].every(availableWithSource),
    ).toBe(true);
    expect(availableWithSource('/admin/clients')).toBe(true);
  });
});

describe('journal général du stock', () => {
  it('situe chaque mouvement sur son article et nomme un mouvement automatique', () => {
    const movement = toStockMovement({
      id: 'm1',
      variantId: 'v1',
      productId: 'p1',
      productName: 'Pagne wax',
      variantLabel: '6 yards',
      type: 'commande',
      before: 5,
      after: 3,
      delta: -2,
      reason: 'Commande CMD-2026-7KQ4XM',
      by: null,
      createdAt: '2026-11-18T08:00:00.000Z',
    });
    expect(movement).toMatchObject({ label: 'Pagne wax · 6 yards', type: 'commande', by: 'Automatique', delta: -2 });
  });
});

describe('historique des prix', () => {
  it('reprend l’ancien et le nouveau prix avec le motif', () => {
    expect(
      toPriceChange({
        id: 'c1',
        productId: 'p1',
        variantId: 'v1',
        productName: 'Pagne wax',
        variantLabel: '6 yards',
        before: 12_000,
        after: 14_000,
        reason: 'Hausse du prix fournisseur',
        by: 'Grâce Mintsa',
        createdAt: '2026-11-18T08:00:00.000Z',
      }),
    ).toEqual({
      id: 'c1',
      productId: 'p1',
      variantId: 'v1',
      label: 'Pagne wax · 6 yards',
      before: 12_000,
      after: 14_000,
      reason: 'Hausse du prix fournisseur',
      by: 'Grâce Mintsa',
      at: '2026-11-18T08:00:00.000Z',
    });
  });
});
