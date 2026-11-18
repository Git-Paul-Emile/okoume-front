import type { Category } from '@/features/categories/categories.types';
import { isCollection } from '@/features/categories/categories.utils';
import { normalizeText } from '@/utils/text';
import type { AdminProduct } from './admin.types';
import { buildProduct, emptyVariant, type ProductForm } from './product.builder';

/**
 * Import du catalogue par fichier CSV (4.5). Une ligne = une variante ; les lignes qui partagent
 * la même référence produit forment un seul produit. Aucune ligne invalide n'est importée.
 */
export const IMPORT_COLUMNS = [
  'reference',
  'nom',
  'categorie',
  'marque',
  'accroche',
  'option',
  'valeur',
  'prix',
  'cout',
  'stock',
  'seuil',
  'image',
] as const;
type Column = (typeof IMPORT_COLUMNS)[number];

export const IMPORT_TEMPLATE = [
  IMPORT_COLUMNS.join(';'),
  'CHM-01;Chemise wax manches courtes;tradi-homme;;Chemise en pagne wax, coupe droite.;Taille;M;18000;11000;5;2;',
  'CHM-01;Chemise wax manches courtes;tradi-homme;;Chemise en pagne wax, coupe droite.;Taille;L;18000;11000;3;2;',
  'BOL-02;Bol en céramique;Cuisine & électroménager;;Bol artisanal émaillé, 500 ml.;;;6500;;12;3;https://exemple.ga/bol.jpg',
].join('\n');

/** Lecture CSV : séparateur « ; » ou « , » détecté sur l'en-tête, valeurs entre guillemets gérées. */
export function parseCsv(text: string): string[][] {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && clean[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows.map((r) => r.map((v) => v.trim()));
}

export type ImportIssue = 'missing' | 'duplicate' | 'invalid';

export interface ImportLine {
  line: number;
  values: Record<Column, string>;
  categoryId: string | null;
  errors: Array<{ kind: ImportIssue; message: string }>;
}

const int = (v: string) => (/^\d+$/.test(v) ? Number(v) : NaN);

export function analyzeImport(
  rows: string[][],
  products: Array<Pick<AdminProduct, 'sku' | 'name'>>,
  categories: Category[],
): { lines: ImportLine[]; headerError: string | null } {
  if (!rows.length) return { lines: [], headerError: 'Le fichier est vide.' };
  const header = rows[0].map((h) => normalizeText(h).replace(/ /g, ''));
  const index = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c, header.indexOf(c)])) as Record<Column, number>;
  const missing = (['nom', 'categorie', 'prix'] as Column[]).filter((c) => index[c] < 0);
  if (missing.length)
    return {
      lines: [],
      headerError: `Colonnes obligatoires absentes : ${missing.join(', ')}. Partez du modèle à télécharger.`,
    };

  const hasChildren = new Set(categories.map((c) => c.parentId));
  const leaves = categories.filter((c) => !isCollection(c) && !hasChildren.has(c.id));
  const findCategory = (v: string) => {
    const n = normalizeText(v);
    return (
      leaves.find((c) => c.id === v || normalizeText(c.name) === n || normalizeText(c.fullName ?? '') === n)?.id ?? null
    );
  };
  const catalogRefs = new Set(products.map((p) => normalizeText(p.sku)));
  const seen = new Map<string, number>();

  const lines = rows.slice(1).map((r, i) => {
    const values = Object.fromEntries(
      IMPORT_COLUMNS.map((c) => [c, index[c] >= 0 ? (r[index[c]] ?? '') : '']),
    ) as Record<Column, string>;
    const errors: ImportLine['errors'] = [];
    const categoryId = values.categorie ? findCategory(values.categorie) : null;
    if (!values.nom) errors.push({ kind: 'missing', message: 'Nom manquant' });
    if (!values.categorie) errors.push({ kind: 'missing', message: 'Catégorie manquante' });
    else if (!categoryId) errors.push({ kind: 'invalid', message: `Catégorie inconnue : « ${values.categorie} »` });
    if (!values.prix) errors.push({ kind: 'missing', message: 'Prix manquant' });
    else if (!(int(values.prix) > 0))
      errors.push({ kind: 'invalid', message: 'Prix : montant entier en FCFA attendu' });
    if (values.cout && Number.isNaN(int(values.cout)))
      errors.push({ kind: 'invalid', message: 'Coût : nombre entier attendu' });
    else if (values.cout && int(values.cout) >= int(values.prix))
      errors.push({ kind: 'invalid', message: 'Coût d’achat supérieur ou égal au prix' });
    if (values.stock && Number.isNaN(int(values.stock)))
      errors.push({ kind: 'invalid', message: 'Stock : nombre entier attendu' });
    if (values.seuil && Number.isNaN(int(values.seuil)))
      errors.push({ kind: 'invalid', message: 'Seuil : nombre entier attendu' });
    if (values.image && !/^https?:\/\/\S+$/.test(values.image))
      errors.push({ kind: 'invalid', message: 'Image : adresse web attendue (http…)' });
    if (values.reference && catalogRefs.has(normalizeText(values.reference)))
      errors.push({ kind: 'duplicate', message: `Référence déjà au catalogue : ${values.reference}` });
    // Même produit et même valeur de variante sur deux lignes
    const key = `${normalizeText(values.reference || values.nom)}|${normalizeText(values.valeur)}`;
    if (seen.has(key)) errors.push({ kind: 'duplicate', message: `Doublon de la ligne ${seen.get(key)}` });
    else seen.set(key, i + 2);
    return { line: i + 2, values, categoryId, errors };
  });
  return { lines, headerError: null };
}

/** Produits prêts à créer (en brouillon) à partir des lignes valides, regroupées par référence ou par nom. */
export function buildImportedProducts(
  lines: ImportLine[],
  products: Array<Pick<AdminProduct, 'id' | 'sku' | 'slug'>>,
  categories: Category[],
  now = new Date(),
): AdminProduct[] {
  const groups = new Map<string, ImportLine[]>();
  for (const l of lines.filter((x) => !x.errors.length)) {
    const key = normalizeText(l.values.reference || l.values.nom);
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }
  const known = [...products];
  const created: AdminProduct[] = [];
  for (const group of groups.values()) {
    const first = group[0].values;
    const form: ProductForm = {
      name: first.nom,
      categoryId: group[0].categoryId!,
      brand: first.marque,
      shortDescription: first.accroche,
      description: '',
      specs: '',
      vatRate: '18',
      images: group.map((l) => l.values.image).filter((v, i, a) => v && a.indexOf(v) === i),
      optionName: group.length > 1 ? first.option || 'Variante' : first.option,
      variants: group.map((l) => ({
        ...emptyVariant(),
        label: l.values.valeur,
        price: l.values.prix,
        cost: l.values.cout,
        stock: l.values.stock || '0',
        threshold: l.values.seuil || '3',
      })),
      isNew: true,
      featured: false,
      publish: false,
    };
    const product = buildProduct(form, known, categories, now);
    if (first.reference) product.sku = first.reference.toUpperCase();
    product.thumbnail = product.images[0] ?? '';
    known.push(product);
    created.push(product);
  }
  return created;
}
