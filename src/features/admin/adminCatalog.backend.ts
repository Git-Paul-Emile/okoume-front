import { z } from 'zod';
import { backend, getAll, getPage, MAX_PAGE_SIZE } from '@/api/backend';
import { signedUploadDto, uploadPhoto } from '@/api/mediaUpload';
import type { Id } from '@/api/types';
import type { Category } from '@/features/categories/categories.types';
import type { ImageUploader } from '@/utils/upload';
import type { AdminProduct, AdminVariant, PriceChange, StockMovement } from './admin.types';

/**
 * Catalogue de l'équipe sur l'API (api/src/features/staff-catalog, staff-categories, staff-stock, staff-media).
 * Le back-office édite un produit entier ; l'API travaille par ressource (produit, statut, variante, mouvement
 * de stock) : seuls les changements réels sont envoyés, chacun à sa route.
 */

const stockMovementDto = z.object({
  id: z.string(),
  variantId: z.string(),
  productId: z.string(),
  productName: z.string(),
  variantLabel: z.string(),
  type: z.enum(['reception', 'ajustement', 'commande', 'annulation', 'retour', 'non_vendable', 'mise_au_rebut']),
  before: z.number(),
  after: z.number(),
  delta: z.number(),
  reason: z.string(),
  by: z.string().nullable(),
  createdAt: z.string(),
});

const priceChangeDto = z.object({
  id: z.string(),
  productId: z.string(),
  variantId: z.string(),
  productName: z.string(),
  variantLabel: z.string(),
  before: z.number(),
  after: z.number(),
  reason: z.string(),
  by: z.string().nullable(),
  createdAt: z.string(),
});

/** Changement de prix historisé par l'API, dans la forme de la fiche produit */
export function toPriceChange(raw: unknown): PriceChange {
  const c = priceChangeDto.parse(raw);
  return {
    id: c.id,
    productId: c.productId,
    variantId: c.variantId,
    label: `${c.productName} · ${c.variantLabel}`,
    before: c.before,
    after: c.after,
    reason: c.reason,
    // Auteur retiré de l'équipe depuis : le changement reste, sans nom
    by: c.by ?? 'Ancien membre',
    at: c.createdAt,
  };
}

/** Mouvement du journal général de l'API dans la forme de l'écran Stock */
export function toStockMovement(raw: unknown): StockMovement {
  const m = stockMovementDto.parse(raw);
  return {
    id: m.id,
    productId: m.productId,
    variantId: m.variantId,
    label: `${m.productName} · ${m.variantLabel}`,
    type: m.type,
    before: m.before,
    after: m.after,
    delta: m.delta,
    reason: m.reason,
    // Mouvement automatique (commande, annulation) : aucun membre de l'équipe
    by: m.by ?? 'Automatique',
    at: m.createdAt,
  };
}

const categoryDto = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  fullName: z.string().optional(),
  parentId: z.string().nullable(),
  icon: z.string().optional(),
  image: z.string().nullable(),
  imageFit: z.enum(['cover', 'contain']).optional(),
  members: z.array(z.string()).optional(),
});

const promotionDto = z.object({
  type: z.enum(['percent', 'fixed']),
  value: z.number(),
  startsAt: z.string(),
  endsAt: z.string(),
});

const staffVariantDto = z.object({
  id: z.string(),
  sku: z.string(),
  label: z.string(),
  attributes: z.record(z.string(), z.string()),
  price: z.number(),
  cost: z.number().nullable(),
  stock: z.number(),
  reserved: z.number(),
  lowStockThreshold: z.number(),
  image: z.string().nullable(),
});

const staffProductDto = z.object({
  id: z.string(),
  slug: z.string(),
  sku: z.string(),
  name: z.string(),
  status: z.enum(['draft', 'published', 'archived']),
  categoryId: z.string(),
  brand: z.string().nullable(),
  shortDescription: z.string(),
  description: z.array(z.string()),
  specs: z.array(z.object({ label: z.string(), value: z.string() })),
  usageTips: z.string().nullable(),
  tax: z.object({ vatRate: z.number(), hsCode: z.string().nullable() }),
  images: z.array(z.string()),
  thumbnail: z.string().nullable(),
  featured: z.boolean(),
  isNew: z.boolean(),
  dealOfTheDay: z.boolean(),
  tags: z.array(z.string()),
  promotion: promotionDto.nullable(),
  variants: z.array(staffVariantDto),
  seller: z.object({ slug: z.string(), name: z.string() }).nullable().default(null),
  condition: z.enum(['new', 'like_new', 'good', 'used']).nullable().default(null),
  moderation: z
    .enum(['in_review', 'changes_requested', 'pending_moderation', 'approved', 'rejected'])
    .nullable()
    .default(null),
  moderationIssues: z.array(z.string()).default([]),
  moderationNote: z.string().nullable().default(null),
  createdAt: z.string(),
});

/** Catégorie racine d'une catégorie (le catalogue filtre par grande famille). */
export function rootOf(categoryId: Id, categories: readonly Category[]): Id {
  const byId = new Map(categories.map((c) => [c.id, c] as const));
  let current = byId.get(categoryId);
  const seen = new Set<Id>();
  while (current?.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = byId.get(current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current?.id ?? categoryId;
}

export function toAdminProduct(raw: unknown, categories: readonly Category[]): AdminProduct {
  const p = staffProductDto.parse(raw);
  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    status: p.status,
    categoryId: p.categoryId,
    rootCategoryId: rootOf(p.categoryId, categories),
    brand: p.brand,
    shortDescription: p.shortDescription,
    description: p.description,
    specs: p.specs,
    usageTips: p.usageTips,
    tax: { vatRate: p.tax.vatRate, hsCode: p.tax.hsCode ?? '' },
    images: p.images,
    thumbnail: p.thumbnail ?? p.images[0] ?? '',
    featured: p.featured,
    isNew: p.isNew,
    dealOfTheDay: p.dealOfTheDay,
    tags: p.tags,
    promotion: p.promotion,
    relatedIds: [],
    seller: p.seller,
    condition: p.condition,
    moderation: p.moderation,
    moderationIssues: p.moderationIssues,
    moderationNote: p.moderationNote,
    createdAt: p.createdAt,
    variants: p.variants.map(({ cost, ...v }) => (cost === null ? v : { ...v, cost })),
  };
}

const PRODUCT_FIELDS = [
  'name',
  'categoryId',
  'brand',
  'shortDescription',
  'description',
  'specs',
  'usageTips',
  'featured',
  'isNew',
  'dealOfTheDay',
  'tags',
  'promotion',
  'images',
] as const;

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Champs du produit réellement modifiés, dans la forme de l'API. */
export function productChanges(current: AdminProduct, patch: Partial<AdminProduct>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const key of PRODUCT_FIELDS)
    if (patch[key] !== undefined && !same(patch[key], current[key])) body[key] = patch[key];
  if (patch.tax) {
    if (patch.tax.vatRate !== current.tax?.vatRate) body.vatRate = patch.tax.vatRate;
    const hsCode = patch.tax.hsCode.trim() || null;
    if (hsCode !== (current.tax?.hsCode.trim() || null)) body.hsCode = hsCode;
  }
  return body;
}

const VARIANT_FIELDS = ['label', 'price', 'lowStockThreshold', 'image', 'weightGrams'] as const;

/** Champs d'une variante existante réellement modifiés ; le stock ne change que par un mouvement de stock. */
export function variantChanges(current: AdminVariant, next: AdminVariant): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const key of VARIANT_FIELDS)
    if (next[key] !== undefined && !same(next[key], current[key])) body[key] = next[key] ?? null;
  if ((next.cost ?? null) !== (current.cost ?? null)) body.cost = next.cost ?? null;
  return body;
}

const newVariantBody = (v: AdminVariant) => ({
  label: v.label,
  price: v.price,
  cost: v.cost ?? null,
  stock: v.stock,
  lowStockThreshold: v.lowStockThreshold,
  image: v.image,
  weightGrams: v.weightGrams ?? null,
});

/** Corps de création : l'API attribue référence et adresse, et recalcule tout ce qui est dérivé. */
export function createProductBody(product: AdminProduct) {
  const optionName =
    product.variants.length > 1 ? (Object.keys(product.variants[0]?.attributes ?? {})[0] ?? null) : null;
  return {
    name: product.name,
    categoryId: product.categoryId,
    brand: product.brand,
    shortDescription: product.shortDescription,
    description: product.description,
    specs: product.specs,
    usageTips: product.usageTips,
    vatRate: product.tax?.vatRate ?? 18,
    hsCode: product.tax?.hsCode.trim() || null,
    featured: product.featured,
    isNew: product.isNew,
    dealOfTheDay: product.dealOfTheDay,
    tags: product.tags,
    promotion: product.promotion,
    images: product.images,
    optionName,
    variants: product.variants.map(newVariantBody),
    publish: product.status === 'published',
  };
}

/** Catégorie du back-office dans la forme de l'API ; une collection se reconnaît à ses membres. */
export function categoryBody(category: Category) {
  const isCollection = !!category.members?.length;
  return {
    slug: category.slug,
    name: category.name,
    fullName: category.fullName ?? null,
    parentId: isCollection ? null : category.parentId,
    icon: category.icon ?? null,
    image: category.image,
    imageFit: category.imageFit ?? 'contain',
    isCollection,
    memberIds: category.members ?? [],
  };
}

const categoriesOf = async (signal?: AbortSignal) =>
  z
    .array(categoryDto)
    .parse(await backend.get('/staff/categories', undefined, signal))
    .map((c): Category => c);

async function productById(id: Id, categories: readonly Category[]) {
  return toAdminProduct(await backend.get(`/staff/products/${id}`), categories);
}

export const adminCatalogBackend = {
  categories: categoriesOf,

  saveCategory: async (category: Category, exists: boolean): Promise<Category> =>
    categoryDto.parse(
      exists
        ? await backend.patch(`/staff/categories/${category.id}`, categoryBody(category))
        : await backend.post('/staff/categories', categoryBody(category)),
    ),

  products: async (signal?: AbortSignal) => {
    const categories = await categoriesOf(signal);
    return getAll('/staff/products', {}, (raw) => toAdminProduct(raw, categories), signal);
  },

  /** Décision de l'équipe sur un produit de vendeur (32.3) : toujours motivée, un refus est définitif. */
  moderateProduct: async (id: Id, decision: 'approve' | 'request_changes' | 'reject', note: string, issues: string[]) =>
    toAdminProduct(
      await backend.put(`/staff/products/${id}/moderation`, { decision, note, issues }),
      await categoriesOf(),
    ),

  createProduct: async (product: AdminProduct) =>
    toAdminProduct(await backend.post('/staff/products', createProductBody(product)), await categoriesOf()),

  /**
   * Enregistre les changements d'un produit : champs, statut, puis variantes (nouvelles ajoutées, existantes
   * modifiées). Une variante absente du formulaire n'est pas supprimée : l'API garde l'historique des ventes.
   */
  async updateProduct(id: Id, patch: Partial<AdminProduct>, priceReason?: string): Promise<AdminProduct> {
    const categories = await categoriesOf();
    const current = await productById(id, categories);
    const fields = productChanges(current, patch);
    if (Object.keys(fields).length) await backend.patch(`/staff/products/${id}`, fields);
    if (patch.status && patch.status !== current.status)
      await backend.put(`/staff/products/${id}/status`, { status: patch.status });
    for (const variant of patch.variants ?? []) {
      const existing = current.variants.find((v) => v.id === variant.id);
      if (!existing) {
        await backend.post(`/staff/products/${id}/variants`, newVariantBody(variant));
        continue;
      }
      const changes = variantChanges(existing, variant);
      // Le motif accompagne chaque prix modifié : l'API le conserve dans l'historique
      if (changes.price !== undefined && priceReason) changes.priceReason = priceReason;
      if (Object.keys(changes).length) await backend.patch(`/staff/products/${id}/variants/${variant.id}`, changes);
    }
    return productById(id, categories);
  },

  /** Historique des prix : les 100 changements les plus récents. */
  async priceChanges(signal?: AbortSignal): Promise<PriceChange[]> {
    const page = await getPage('/staff/price-changes', { page: 1, limit: MAX_PAGE_SIZE }, toPriceChange, signal);
    return page.items;
  },

  /** Journal général : les 100 mouvements les plus récents, toutes variantes confondues. */
  async stockJournal(signal?: AbortSignal): Promise<StockMovement[]> {
    const page = await getPage('/staff/stock-movements', { page: 1, limit: MAX_PAGE_SIZE }, toStockMovement, signal);
    return page.items;
  },

  /** Correction simple : la quantité enregistrée est remplacée et le mouvement reste historisé. */
  setStock: (variantId: Id, counted: number, reason: string) =>
    backend.post(`/staff/variants/${variantId}/stock-movements`, { type: 'ajustement', counted, reason }),

};

/** Envoi d'images du back-office : autorisation signée par l'API pour ce dossier, puis envoi direct. */
export const staffImageUploader =
  (folder: 'products' | 'categories' | 'banners'): ImageUploader =>
  async (image) =>
    uploadPhoto(signedUploadDto.parse(await backend.post('/staff/media/upload-signatures', { folder })), image);
