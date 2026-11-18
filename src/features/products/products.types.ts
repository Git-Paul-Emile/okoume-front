import type { Id } from '@/api/types';

export interface Promotion {
  type: 'percent' | 'fixed';
  value: number;
  startsAt: string;
  endsAt: string;
}

export interface Variant {
  id: Id;
  sku: string;
  label: string;
  attributes: Record<string, string>;
  price: number;
  stock: number;
  reserved: number;
  image: string | null;
  lowStockThreshold: number;
  /** Facultatifs, renseignés dans le back-office (4.3). */
  weightGrams?: number | null;
  dimensions?: { length: number; width: number; height: number } | null;
  /** Articles retournés non revendables : stock séparé, jamais proposé à la vente (14.3). */
  unsellable?: number;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: Id;
  /** Données fiscales (4.2) : taux de TVA appliqué au prix TTC affiché. */
  tax?: { vatRate: number; hsCode: string };
  slug: string;
  name: string;
  sku: string;
  categoryId: Id;
  rootCategoryId: Id;
  brand: string | null;
  shortDescription: string;
  description: string[];
  specs: ProductSpec[];
  usageTips: string | null;
  images: string[];
  thumbnail: string;
  variants: Variant[];
  promotion: Promotion | null;
  dealOfTheDay: boolean;
  featured: boolean;
  isNew: boolean;
  relatedIds: Id[];
  tags: string[];
  status: 'published' | 'archived' | 'draft';
  createdAt: string;
}

export type Availability = 'in_stock' | 'low_stock' | 'out_of_stock';

export type SortKey = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating' | 'discount';

export interface CatalogFilters {
  q: string;
  category: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  inStock: boolean;
  onSale: boolean;
  attributes: Record<string, string[]>;
  sort: SortKey;
  page: number;
}
