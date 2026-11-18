import type { Product } from '@/features/products/products.types';
import { editDistance, normalizeText } from '@/utils/text';

/**
 * Pertinence d'un produit pour une recherche : tolère accents, casse et petites fautes de frappe.
 * Renvoie 0 si le produit ne correspond pas.
 */
export function relevance(product: Product, query: string, categoryName = '') {
  const terms = normalizeText(query).split(' ').filter(Boolean);
  if (!terms.length) return 1;

  const name = normalizeText(product.name);
  const nameWords = name.split(' ');
  const haystackWords = normalizeText(
    [product.brand ?? '', categoryName, product.shortDescription, product.tags.join(' '), product.sku].join(' '),
  ).split(' ');

  let score = 0;
  for (const term of terms) {
    const tolerance = term.length >= 7 ? 2 : term.length >= 4 ? 1 : 0;
    if (name.includes(term)) score += nameWords.some((w) => w.startsWith(term)) ? 10 : 6;
    else if (nameWords.some((w) => editDistance(w, term, tolerance) <= tolerance)) score += 5;
    else if (haystackWords.some((w) => w.startsWith(term))) score += 3;
    else if (haystackWords.some((w) => w.length > 3 && editDistance(w, term, tolerance) <= tolerance)) score += 2;
    else return 0;
  }
  return score;
}

export function searchProducts(products: Product[], query: string, categoryName: (p: Product) => string, limit = 6) {
  return products
    .map((p) => ({ product: p, score: relevance(p, query, categoryName(p)) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.product);
}
