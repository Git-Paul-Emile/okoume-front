import { z } from 'zod';
import type { Product, Variant } from './products.types';

/**
 * Produit tel que l'API le publie (api/src/features/products/products.dto.ts), validé à la réception.
 * L'API ne publie pas le stock exact ni les réservations : seulement la quantité disponible et son niveau.
 */
const variantDto = z.object({
  id: z.string(),
  sku: z.string(),
  label: z.string(),
  attributes: z.record(z.string(), z.string()),
  price: z.number(),
  salePrice: z.number(),
  available: z.number().int().min(0),
  availability: z.enum(['in_stock', 'low_stock', 'out_of_stock']),
  image: z.string().nullable(),
});

const productDto = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  sku: z.string(),
  categoryId: z.string(),
  rootCategoryId: z.string(),
  brand: z.string().nullable(),
  shortDescription: z.string(),
  description: z.array(z.string()),
  specs: z.array(z.object({ label: z.string(), value: z.string() })),
  usageTips: z.string().nullable(),
  tax: z.object({ vatRate: z.number(), hsCode: z.string().nullable() }),
  images: z.array(z.string()),
  thumbnail: z.string().nullable(),
  variants: z.array(variantDto),
  promotion: z
    .object({ type: z.enum(['percent', 'fixed']), value: z.number(), startsAt: z.string(), endsAt: z.string() })
    .nullable(),
  dealOfTheDay: z.boolean(),
  featured: z.boolean(),
  isNew: z.boolean(),
  tags: z.array(z.string()),
  seller: z.object({ slug: z.string(), name: z.string() }).nullable().default(null),
  condition: z.enum(['new', 'like_new', 'good', 'used']).nullable().default(null),
  createdAt: z.string(),
});

/**
 * Variante dans le format du front. La disponibilité publique devient un stock sans réservation, et le seuil
 * d'alerte est choisi pour que variantAvailability (products.utils.ts) redonne exactement le niveau de l'API.
 */
function toVariant(v: z.infer<typeof variantDto>): Variant {
  return {
    id: v.id,
    sku: v.sku,
    label: v.label,
    attributes: v.attributes,
    price: v.price,
    stock: v.available,
    reserved: 0,
    image: v.image,
    lowStockThreshold: v.availability === 'low_stock' ? v.available : 0,
  };
}

/** Produit de l'API dans le format du front ; une réponse inattendue lève une erreur explicite. */
export function toProduct(raw: unknown): Product {
  const p = productDto.parse(raw);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    sku: p.sku,
    categoryId: p.categoryId,
    rootCategoryId: p.rootCategoryId,
    brand: p.brand,
    shortDescription: p.shortDescription,
    description: p.description,
    specs: p.specs,
    usageTips: p.usageTips,
    tax: { vatRate: p.tax.vatRate, hsCode: p.tax.hsCode ?? '' },
    images: p.images,
    thumbnail: p.thumbnail ?? p.images[0] ?? '',
    variants: p.variants.map(toVariant),
    promotion: p.promotion,
    dealOfTheDay: p.dealOfTheDay,
    featured: p.featured,
    isNew: p.isNew,
    // Produits associés : pas encore publiés par l'API (README de l'API, limites connues)
    relatedIds: [],
    tags: p.tags,
    status: 'published',
    seller: p.seller,
    condition: p.condition,
    createdAt: p.createdAt,
  };
}
