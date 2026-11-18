import type { ProductSpec } from '@/features/products/products.types';
import type { AdminProduct, AdminVariant, PriceChange } from './admin.types';

/** Changements de prix entre l'état enregistré et la saisie, prêts à historiser (4.7). */
export function priceDiffs(
  product: Pick<AdminProduct, 'id' | 'name' | 'variants'>,
  next: Record<string, number>,
  reason: string,
  by: string,
): Array<Omit<PriceChange, 'id' | 'at'>> {
  return product.variants
    .filter((v) => next[v.id] !== undefined && next[v.id] !== v.price)
    .map((v) => ({
      productId: product.id,
      variantId: v.id,
      label: `${product.name} · ${v.label}`,
      before: v.price,
      after: next[v.id],
      by,
      reason,
    }));
}

export interface BulkRule {
  mode: 'percent' | 'fixed';
  /** Variation : +10 = hausse de 10 % (ou de 10 FCFA), −5 = baisse. */
  value: number;
  /** Arrondi à la centaine de FCFA la plus proche. */
  round: boolean;
}

export interface BulkLine {
  product: AdminProduct;
  variant: AdminVariant;
  before: number;
  after: number;
  /** Nouveau prix inférieur ou égal au coût d'achat : à vérifier avant validation. */
  belowCost: boolean;
}

/** Aperçu d'une modification de prix en masse (4.7) : rien n'est appliqué avant validation. */
export function computeBulkPrices(products: AdminProduct[], rule: BulkRule): BulkLine[] {
  return products.flatMap((product) =>
    product.variants.map((variant) => {
      const raw = rule.mode === 'percent' ? variant.price * (1 + rule.value / 100) : variant.price + rule.value;
      const after = Math.max(100, rule.round ? Math.round(raw / 100) * 100 : Math.round(raw));
      return { product, variant, before: variant.price, after, belowCost: !!variant.cost && after <= variant.cost };
    }),
  );
}

/** Caractéristiques saisies une par ligne : « Libellé : valeur ». */
export const parseSpecs = (text: string): ProductSpec[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.split(/\s*:\s*/))
    .filter(([label, ...rest]) => label?.trim() && rest.join(':').trim())
    .map(([label, ...rest]) => ({ label: label.trim(), value: rest.join(' : ').trim() }));

export const specsToText = (specs: ProductSpec[]) => specs.map((s) => `${s.label} : ${s.value}`).join('\n');

/** Taux de TVA proposés (à confirmer avec un expert-comptable selon la réglementation gabonaise). */
export const VAT_RATES = [18, 10, 5, 0];
