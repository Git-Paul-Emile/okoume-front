import type { Category } from '@/features/categories/categories.types';
import { ancestors } from '@/features/categories/categories.utils';
import { normalizeText } from '@/utils/text';
import type { AdminProduct, AdminVariant } from './admin.types';
import { parseSpecs } from './product.edit';

/** Saisie du formulaire « Nouveau produit » (montants en texte, tels que tapés). */
export interface ProductForm {
  name: string;
  categoryId: string;
  brand: string;
  shortDescription: string;
  description: string;
  /** Caractéristiques, une par ligne : « Libellé : valeur ». */
  specs: string;
  vatRate: string;
  images: string[];
  /** Nom de l'option qui distingue les variantes (Taille, Couleur, Stockage…) ; vide = article unique. */
  optionName: string;
  variants: Array<{ label: string; price: string; cost: string; stock: string; threshold: string }>;
  isNew: boolean;
  featured: boolean;
  publish: boolean;
}

export const emptyVariant = () => ({ label: '', price: '', cost: '', stock: '0', threshold: '3' });

export const emptyProductForm = (): ProductForm => ({
  name: '',
  categoryId: '',
  brand: '',
  shortDescription: '',
  description: '',
  specs: '',
  vatRate: '18',
  images: [],
  optionName: '',
  variants: [emptyVariant()],
  isNew: true,
  featured: false,
  publish: false,
});

const slugify = (s: string) => normalizeText(s).replace(/ /g, '-');
const int = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : NaN);

/** Un produit sans coût d'achat valide ne peut être ni publié ni vendu (28.1). */
export const missingCost = (p: Pick<AdminProduct, 'variants'>) => p.variants.some((v) => !v.cost || v.cost <= 0);

/** Contrôle la saisie ; renvoie le premier message d'erreur, ou null si tout est correct. */
export function validateProductForm(form: ProductForm): string | null {
  if (form.name.trim().length < 3) return 'Saisissez le nom du produit.';
  if (!form.categoryId) return 'Choisissez une catégorie.';
  if (form.shortDescription.trim().length < 10) return 'Rédigez une accroche d’au moins 10 caractères.';
  if (!form.images.length) return 'Ajoutez au moins une image.';
  const multiple = form.variants.length > 1;
  if (multiple && !form.optionName.trim()) return 'Indiquez ce qui distingue les variantes (Taille, Couleur…).';
  const labels = new Set<string>();
  for (const [i, v] of form.variants.entries()) {
    const n = `Variante ${i + 1}`;
    if (multiple && !v.label.trim()) return `${n} : saisissez sa valeur (ex. M, Rouge, 128 Go).`;
    if (labels.has(normalizeText(v.label))) return `${n} : cette valeur existe déjà.`;
    labels.add(normalizeText(v.label));
    if (!(int(v.price) > 0)) return `${n} : le prix doit être un montant entier en FCFA.`;
    if (form.publish && !v.cost.trim())
      return `${n} : le coût d’achat est obligatoire pour publier (enregistrez en brouillon sinon).`;
    if (v.cost.trim() && Number.isNaN(int(v.cost))) return `${n} : le coût d’achat doit être un montant entier.`;
    if (v.cost.trim() && int(v.cost) >= int(v.price)) return `${n} : le coût d’achat dépasse le prix de vente.`;
    if (Number.isNaN(int(v.stock))) return `${n} : le stock doit être un nombre entier.`;
    if (Number.isNaN(int(v.threshold))) return `${n} : le seuil d’alerte doit être un nombre entier.`;
  }
  return null;
}

/** Référence suivante (GA-1086…), adresse de fiche unique et variantes prêtes à enregistrer. */
export function buildProduct(
  form: ProductForm,
  products: Array<Pick<AdminProduct, 'id' | 'sku' | 'slug'>>,
  categories: Category[],
  now = new Date(),
): AdminProduct {
  const next = Math.max(999, ...products.map((p) => Number(p.sku.replace(/\D/g, '')) || 0)) + 1;
  const sku = `GA-${next}`;
  const base = slugify(form.name);
  let slug = base;
  for (let i = 2; products.some((p) => p.slug === slug); i++) slug = `${base}-${i}`;
  const ids = products.map((p) => Number(p.id)).filter(Number.isFinite);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const root = ancestors(form.categoryId, byId).at(-1)?.id ?? form.categoryId;
  const option = form.optionName.trim();

  const variants: AdminVariant[] = form.variants.map((v) => {
    const label = v.label.trim() || 'Standard';
    const vsku = `${sku}-${slugify(label).toUpperCase() || 'STD'}`;
    return {
      id: vsku,
      sku: vsku,
      label,
      attributes: option ? { [option]: label } : {},
      price: int(v.price),
      cost: v.cost.trim() ? int(v.cost) : undefined,
      stock: int(v.stock),
      reserved: 0,
      image: null,
      lowStockThreshold: int(v.threshold),
    };
  });

  return {
    id: String(Math.max(0, ...ids) + 1),
    slug,
    name: form.name.trim(),
    sku,
    categoryId: form.categoryId,
    rootCategoryId: root,
    brand: form.brand.trim() || null,
    shortDescription: form.shortDescription.trim(),
    description: form.description
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean),
    specs: [...(form.brand.trim() ? [{ label: 'Marque', value: form.brand.trim() }] : []), ...parseSpecs(form.specs)],
    tax: { vatRate: Number(form.vatRate), hsCode: '' },
    usageTips: null,
    images: form.images,
    thumbnail: form.images[0],
    variants,
    promotion: null,
    dealOfTheDay: false,
    featured: form.featured,
    isNew: form.isNew,
    relatedIds: [],
    tags: [slugify(form.name).split('-')[0]].filter(Boolean),
    status: form.publish ? 'published' : 'draft',
    createdAt: now.toISOString(),
  };
}
