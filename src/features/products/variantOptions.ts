import { normalizeText } from '@/utils/text';
import type { Variant } from './products.types';
import { availableStock } from './products.utils';

/** Une option de produit (Taille, Couleur, Pointure…) et ses valeurs, dans l'ordre des variantes. */
export interface ProductOption {
  name: string;
  isColor: boolean;
  values: Array<{ value: string; available: boolean }>;
}

export type OptionSelection = Record<string, string>;

const COLOR_KEYS = new Set(['couleur', 'coloris', 'color', 'teinte']);

/** L'attribut décrit-il une couleur ? Il s'affiche alors en pastilles. */
export const isColorAttribute = (name: string) => COLOR_KEYS.has(normalizeText(name));

/**
 * Teintes des noms de couleur courants. Une couleur absente de la table garde un rendu neutre,
 * avec son nom en infobulle et pour les lecteurs d'écran.
 */
const SWATCHES: Record<string, string> = {
  noir: '#1f1f1f',
  blanc: '#ffffff',
  gris: '#8a8a8a',
  'gris clair': '#c8c8c8',
  rouge: '#c0392b',
  bordeaux: '#7b1e2b',
  bleu: '#2e6fd8',
  'bleu ciel': '#8ec5ef',
  'bleu marine': '#1f2f5c',
  turquoise: '#2bb3a6',
  vert: '#2e7d32',
  kaki: '#6b6a3a',
  jaune: '#f2c230',
  moutarde: '#c9a227',
  orange: '#e67e22',
  rose: '#e88aa8',
  fuchsia: '#c2187a',
  violet: '#7a2a8c',
  marron: '#6d4325',
  chocolat: '#4a2c1a',
  beige: '#d9c3a0',
  creme: '#f3ead2',
  ivoire: '#f6f1e1',
  or: '#c9a227',
  dore: '#c9a227',
  argent: '#b8bcc2',
  argente: '#b8bcc2',
};

export const swatchColor = (value: string): string | null => SWATCHES[normalizeText(value)] ?? null;

/** Options d'un produit : une par attribut des variantes, valeurs dans l'ordre de première apparition. */
export function productOptions(variants: readonly Variant[]): ProductOption[] {
  const options = new Map<string, Map<string, boolean>>();
  for (const v of variants)
    for (const [name, value] of Object.entries(v.attributes)) {
      const values = options.get(name) ?? new Map<string, boolean>();
      values.set(value, (values.get(value) ?? false) || availableStock(v) > 0);
      options.set(name, values);
    }
  return [...options].map(([name, values]) => ({
    name,
    isColor: isColorAttribute(name),
    values: [...values].map(([value, available]) => ({ value, available })),
  }));
}

/** Variante qui porte exactement ces valeurs, s'il y en a une. */
export const findVariant = (variants: readonly Variant[], selection: OptionSelection) =>
  variants.find((v) => Object.entries(selection).every(([name, value]) => v.attributes[name] === value));

/**
 * Variante après le choix d'une valeur : la combinaison exacte si elle existe, sinon celle qui garde la valeur
 * choisie et le plus d'autres valeurs déjà retenues, de préférence en stock.
 */
export function chooseVariant(variants: readonly Variant[], selection: OptionSelection, name: string, value: string) {
  const wanted = { ...selection, [name]: value };
  const exact = findVariant(variants, wanted);
  if (exact) return exact;
  const score = (v: Variant) =>
    Object.entries(wanted).filter(([n, val]) => v.attributes[n] === val).length * 2 + (availableStock(v) > 0 ? 1 : 0);
  return variants
    .filter((v) => v.attributes[name] === value)
    .reduce<Variant | undefined>((best, v) => (!best || score(v) > score(best) ? v : best), undefined);
}
