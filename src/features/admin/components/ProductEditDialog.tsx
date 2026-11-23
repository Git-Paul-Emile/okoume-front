import { Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Checkbox, SelectField, TextAreaField, TextField } from '@/components/ui/TextField';
import { ImageGalleryUpload, MiniImagePicker } from '@/components/ui/Upload';
import { staffImageUploader } from '../adminCatalog.backend';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import { normalizeText } from '@/utils/text';
import { adminApi } from '../admin.api';
import { useAdminMutation, usePriceChanges } from '../admin.queries';
import type { AdminProduct, AdminVariant } from '../admin.types';
import { parseSpecs, priceDiffs, specsToText, VAT_RATES } from '../product.edit';

interface Row {
  id: string;
  isNew: boolean;
  label: string;
  sku: string;
  price: string;
  cost: string;
  threshold: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  image: string | null;
  stock: number;
  reserved: number;
}

const toRow = (v: AdminVariant): Row => ({
  id: v.id,
  isNew: false,
  label: v.label,
  sku: v.sku,
  price: String(v.price),
  cost: v.cost ? String(v.cost) : '',
  threshold: String(v.lowStockThreshold),
  weight: v.weightGrams ? String(v.weightGrams) : '',
  length: v.dimensions ? String(v.dimensions.length) : '',
  width: v.dimensions ? String(v.dimensions.width) : '',
  height: v.dimensions ? String(v.dimensions.height) : '',
  image: v.image,
  stock: v.stock,
  reserved: v.reserved,
});

const int = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : NaN);
const optionalInt = (v: string) => (v.trim() ? int(v) : null);

/**
 * Modification complète d'un produit (4.2, 4.3, 4.7) : informations, caractéristiques, fiscalité,
 * photos, variantes (photo, poids, dimensions, seuil) et prix avec motif historisé.
 * Le stock ne se modifie pas ici : il passe par l'écran Stock, où chaque mouvement est tracé.
 */
export function ProductEditDialog({ product, onClose }: { product: AdminProduct; onClose: () => void }) {
  const admin = useAdminAuthStore((s) => s.admin);
  const { data: history = [] } = usePriceChanges();
  const [v, setV] = useState({
    name: product.name,
    brand: product.brand ?? '',
    short: product.shortDescription,
    description: product.description.join('\n\n'),
    specs: specsToText(product.specs),
    vatRate: String(product.tax?.vatRate ?? 18),
    hsCode: product.tax?.hsCode ?? '',
    images: product.images,
    featured: product.featured,
    isNew: product.isNew,
    promo: product.promotion?.type === 'percent' ? String(product.promotion.value) : '',
    priceReason: '',
  });
  const [rows, setRows] = useState<Row[]>(product.variants.map(toRow));
  const [error, setError] = useState('');
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const by = admin ? `${admin.firstName} ${admin.lastName}` : 'Équipe';

  const newPrices = Object.fromEntries(rows.filter((r) => !r.isNew).map((r) => [r.id, int(r.price)]));
  const changes = priceDiffs(product, newPrices, v.priceReason.trim(), by);
  const productHistory = history.filter((h) => h.productId === product.id).slice(0, 8);

  const save = useAdminMutation(
    async ({ patch }: { patch: Partial<AdminProduct>; priceCount: number }) => {
      const saved = await adminApi.updateProduct(product.id, patch, v.priceReason.trim());
      return saved;
    },
    ({ priceCount }) =>
      priceCount
        ? `${product.name} enregistré, ${priceCount} prix modifié${priceCount > 1 ? 's' : ''} (${v.priceReason.trim()})`
        : `${product.name} enregistré`,
  );

  const addRow = () =>
    setRows((list) => [
      ...list,
      {
        ...toRow({
          ...product.variants[0],
          id: `new-${list.length}`,
          label: '',
          sku: '',
          image: null,
          weightGrams: null,
          dimensions: null,
        }),
        isNew: true,
        price: list[0]?.price ?? '',
        cost: '',
        stock: 0,
        reserved: 0,
      },
    ]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (v.name.trim().length < 3) return setError('Le nom est obligatoire.');
    if (!v.images.length) return setError('Ajoutez au moins une image du produit.');
    if (!rows.length) return setError('Le produit doit garder au moins une variante.');
    const labels = rows.map((r) => normalizeText(r.label));
    if (rows.length > 1 && labels.some((l) => !l))
      return setError('Chaque variante doit avoir une valeur (taille, couleur…).');
    if (new Set(labels).size !== labels.length) return setError('Deux variantes ont la même valeur.');
    for (const r of rows) {
      const name = r.label || 'Variante';
      if (!(int(r.price) > 0)) return setError(`${name} : le prix doit être un montant entier en FCFA.`);
      if (product.status === 'published' && !(int(r.cost) > 0))
        return setError(`${name} : produit en ligne, le coût d’achat est obligatoire.`);
      if (r.cost && Number.isNaN(int(r.cost))) return setError(`${name} : coût d’achat invalide.`);
      if (Number.isNaN(int(r.threshold))) return setError(`${name} : seuil d’alerte invalide.`);
      if ([r.weight, r.length, r.width, r.height].some((x) => x.trim() && Number.isNaN(int(x))))
        return setError(`${name} : poids et dimensions en nombres entiers.`);
      const dims = [r.length, r.width, r.height].filter((x) => x.trim()).length;
      if (dims > 0 && dims < 3) return setError(`${name} : indiquez les trois dimensions ou aucune.`);
    }
    if (changes.length && v.priceReason.trim().length < 5) return setError('Indiquez le motif du changement de prix.');
    const rate = Number(v.promo);
    if (v.promo && (!Number.isInteger(rate) || rate <= 0 || rate >= 90))
      return setError('La remise doit être un pourcentage entre 1 et 89.');

    const now = new Date();
    const usedSkus = new Set(rows.filter((r) => !r.isNew).map((r) => r.sku));
    const variants: AdminVariant[] = rows.map((r) => {
      const base = product.variants.find((x) => x.id === r.id);
      let sku = r.sku;
      if (r.isNew) {
        const stem = `${product.sku}-${normalizeText(r.label).replace(/ /g, '-').toUpperCase() || 'VAR'}`;
        sku = stem;
        for (let i = 2; usedSkus.has(sku); i++) sku = `${stem}-${i}`;
        usedSkus.add(sku);
      }
      return {
        ...(base ?? { attributes: {}, stock: 0, reserved: 0 }),
        id: r.isNew ? sku : r.id,
        sku,
        label: r.label.trim() || 'Standard',
        attributes: base?.attributes ?? {},
        price: int(r.price),
        cost: r.cost ? int(r.cost) : undefined,
        lowStockThreshold: int(r.threshold),
        image: r.image,
        weightGrams: optionalInt(r.weight),
        dimensions: r.length.trim() ? { length: int(r.length), width: int(r.width), height: int(r.height) } : null,
      } as AdminVariant;
    });

    save.mutate(
      {
        patch: {
          name: v.name.trim(),
          brand: v.brand.trim() || null,
          shortDescription: v.short.trim(),
          description: v.description
            .split(/\n{2,}/)
            .map((p) => p.trim())
            .filter(Boolean),
          specs: parseSpecs(v.specs),
          tax: { vatRate: Number(v.vatRate), hsCode: v.hsCode.trim() },
          images: v.images,
          thumbnail: v.images[0],
          featured: v.featured,
          isNew: v.isNew,
          promotion: v.promo
            ? {
                type: 'percent',
                value: rate,
                startsAt: now.toISOString(),
                endsAt: product.promotion?.endsAt ?? new Date(now.getTime() + 30 * 86_400_000).toISOString(),
              }
            : null,
          variants,
        },
        priceCount: changes.length,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={product.name}
      description={`Référence produit ${product.sku}`}
      className="max-w-4xl"
    >
      <form onSubmit={submit} noValidate>
        <div className="max-h-[68vh] space-y-6 overflow-y-auto pr-1">
          <Section title="Informations">
            <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
              <TextField label="Nom" value={v.name} onChange={(e) => set({ name: e.target.value })} />
              <TextField label="Marque" optional value={v.brand} onChange={(e) => set({ brand: e.target.value })} />
            </div>
            <TextAreaField label="Accroche" rows={2} value={v.short} onChange={(e) => set({ short: e.target.value })} />
            <TextAreaField
              label="Description"
              rows={4}
              value={v.description}
              onChange={(e) => set({ description: e.target.value })}
              hint="Une ligne vide entre deux paragraphes."
            />
            <ImageGalleryUpload
              label="Photos du produit"
              value={v.images}
              onChange={(images) => set({ images })}
              uploader={staffImageUploader('products')}
            />
          </Section>

          <Section title="Caractéristiques et fiscalité">
            <TextAreaField
              label="Caractéristiques"
              optional
              rows={4}
              value={v.specs}
              onChange={(e) => set({ specs: e.target.value })}
              hint="Une par ligne, sous la forme « Libellé : valeur » (ex. Matière : coton wax)."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Taux de TVA" value={v.vatRate} onChange={(e) => set({ vatRate: e.target.value })}>
                {VAT_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r} %
                  </option>
                ))}
              </SelectField>
              <TextField
                label="Code douanier (SH)"
                optional
                value={v.hsCode}
                onChange={(e) => set({ hsCode: e.target.value })}
                hint="Taux et codes à valider avec un expert-comptable."
              />
            </div>
          </Section>

          <Section title="Variantes">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-muted">
                    {[
                      'Photo',
                      'Valeur',
                      'Prix',
                      'Coût d’achat',
                      'Seuil',
                      'Poids (g)',
                      'L × l × h (cm)',
                      'Stock',
                      '',
                    ].map((h) => (
                      <th key={h} className="pr-2 pb-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const removable = r.isNew || (r.stock === 0 && r.reserved === 0);
                    const input = (key: keyof Row, aria: string, width = 'w-24') => (
                      <input
                        aria-label={`${aria} : ${r.label || `variante ${i + 1}`}`}
                        inputMode="numeric"
                        className={`input h-10 ${width}`}
                        value={r[key] as string}
                        onChange={(e) => setRow(i, { [key]: e.target.value })}
                      />
                    );
                    return (
                      <tr key={r.id} className="align-middle">
                        <td className="pr-2 pb-2">
                          <MiniImagePicker
                            value={r.image}
                            onChange={(image) => setRow(i, { image })}
                            uploader={staffImageUploader('products')}
                            label={r.label || `variante ${i + 1}`}
                          />
                        </td>
                        <td className="pr-2 pb-2">
                          <input
                            aria-label={`Valeur de la variante ${i + 1}`}
                            className="input h-10 w-28"
                            value={r.label}
                            onChange={(e) => setRow(i, { label: e.target.value })}
                          />
                          <span className="mt-0.5 block text-[11px] text-ink-muted">
                            {r.isNew ? 'Nouvelle' : r.sku}
                          </span>
                        </td>
                        <td className="pr-2 pb-2">{input('price', 'Prix', 'w-28')}</td>
                        <td className="pr-2 pb-2">{input('cost', 'Coût d’achat', 'w-28')}</td>
                        <td className="pr-2 pb-2">{input('threshold', 'Seuil d’alerte', 'w-16')}</td>
                        <td className="pr-2 pb-2">{input('weight', 'Poids', 'w-20')}</td>
                        <td className="pr-2 pb-2">
                          <span className="flex items-center gap-1">
                            {input('length', 'Longueur', 'w-14')}
                            {input('width', 'Largeur', 'w-14')}
                            {input('height', 'Hauteur', 'w-14')}
                          </span>
                        </td>
                        <td className="pr-2 pb-2 tabular-nums">{r.stock}</td>
                        <td className="pb-2">
                          <button
                            type="button"
                            disabled={!removable}
                            title={removable ? undefined : 'Mettez le stock à zéro avant de supprimer cette variante'}
                            onClick={() => setRows((list) => list.filter((_, j) => j !== i))}
                            aria-label={`Supprimer la variante ${r.label || i + 1}`}
                            className="grid size-10 place-items-center text-ink-muted transition-colors hover:text-danger disabled:opacity-30"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline"
            >
              <Plus className="size-4" aria-hidden="true" />
              Ajouter une variante
            </button>
            <p className="text-sm text-ink-muted">
              Le stock d’une nouvelle variante se saisit ensuite dans l’écran Stock, où chaque mouvement est tracé.
            </p>
            {changes.length > 0 && (
              <TextField
                label={`Motif du changement de prix (${changes.length} variante${changes.length > 1 ? 's' : ''})`}
                value={v.priceReason}
                onChange={(e) => set({ priceReason: e.target.value })}
                hint="Conservé avec l’ancien et le nouveau prix, la date et votre nom."
              />
            )}
          </Section>

          <Section title="Mise en avant">
            <div className="flex flex-wrap gap-6">
              <Checkbox
                label="Afficher sur l’accueil"
                checked={v.featured}
                onChange={(e) => set({ featured: e.target.checked })}
              />
              <Checkbox
                label="Badge « Nouveau »"
                checked={v.isNew}
                onChange={(e) => set({ isNew: e.target.checked })}
              />
            </div>
            <TextField
              label="Remise en %"
              optional
              inputMode="numeric"
              value={v.promo}
              onChange={(e) => set({ promo: e.target.value })}
              hint="Laisser vide pour aucune promotion. Durée par défaut : 30 jours."
              containerClassName="sm:max-w-xs"
            />
          </Section>

          {productHistory.length > 0 && (
            <Section title="Historique des prix">
              <ul className="divide-y divide-sage text-sm">
                {productHistory.map((h) => (
                  <li key={h.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      <span className="font-medium">{h.label}</span> : {formatPrice(h.before)} → {formatPrice(h.after)}
                      <span className="block text-xs text-ink-muted">{h.reason}</span>
                    </span>
                    <span className="text-xs text-ink-muted">
                      {formatDateTime(h.at)}, {h.by}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
        {error && (
          <p className="mt-4 text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="mt-5 flex items-center justify-between gap-2 border-t border-sage pt-4">
          <Link
            to={`/produit/${product.slug}`}
            target="_blank"
            className="text-sm font-semibold text-forest hover:underline"
          >
            Voir la fiche
          </Link>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" loading={save.isPending}>
              Enregistrer
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-base">{title}</h3>
      {children}
    </section>
  );
}
