import { Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Checkbox, SelectField, TextAreaField, TextField } from '@/components/ui/TextField';
import type { Category } from '@/features/categories/categories.types';
import { isCollection } from '@/features/categories/categories.utils';
import { adminApi } from '../admin.api';
import { useAdminMutation } from '../admin.queries';
import type { AdminProduct } from '../admin.types';
import {
  buildProduct,
  emptyProductForm,
  emptyVariant,
  validateProductForm,
  type ProductForm,
} from '../product.builder';
import { ImageGalleryUpload } from '@/components/ui/Upload';
import { staffImageUploader } from '../adminCatalog.backend';
import { VAT_RATES } from '../product.edit';

interface Props {
  products: AdminProduct[];
  categories: Category[];
  onClose: () => void;
  onCreated: (product: AdminProduct) => void;
}

/** Création d'un produit : informations, images, variantes (prix, coût, stock), puis brouillon ou publication. */
export function NewProductDialog({ products, categories, onClose, onCreated }: Props) {
  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<'draft' | 'publish' | null>(null);
  const set = (patch: Partial<ProductForm>) => setForm((f) => ({ ...f, ...patch }));
  const setVariant = (i: number, patch: Partial<ProductForm['variants'][number]>) =>
    set({ variants: form.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) });
  const create = useAdminMutation(
    (p: AdminProduct) => adminApi.createProduct(p),
    (p) => (p.status === 'published' ? `${p.name} publié dans la boutique` : `${p.name} enregistré en brouillon`),
  );

  const byId = new Map(categories.map((c) => [c.id, c]));
  const path = (c: Category): string =>
    c.parentId && byId.get(c.parentId) ? `${path(byId.get(c.parentId)!)} › ${c.name}` : c.name;
  const hasChildren = new Set(categories.map((c) => c.parentId));
  // Les produits se rangent dans les catégories les plus précises (sans sous-catégorie)
  const options = categories
    .filter((c) => !isCollection(c) && !hasChildren.has(c.id))
    .map((c) => ({ id: c.id, label: path(c) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  const multiple = form.variants.length > 1;

  const submit = (publish: boolean) => (e?: FormEvent) => {
    e?.preventDefault();
    const next = { ...form, publish };
    const message = validateProductForm(next);
    if (message) return setError(message);
    setError('');
    setPending(publish ? 'publish' : 'draft');
    const product = buildProduct(next, products, categories);
    create.mutate(product, { onSuccess: () => onCreated(product) });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Nouveau produit"
      description="La référence et l’adresse de la fiche sont créées automatiquement."
      className="max-w-3xl"
    >
      <form onSubmit={submit(true)} noValidate>
        <div className="max-h-[68vh] space-y-6 overflow-y-auto pr-1">
          <Section title="Informations">
            <TextField
              label="Nom du produit"
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              autoFocus
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Catégorie"
                value={form.categoryId}
                onChange={(e) => set({ categoryId: e.target.value })}
              >
                <option value="">Choisir…</option>
                {options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </SelectField>
              <TextField label="Marque" optional value={form.brand} onChange={(e) => set({ brand: e.target.value })} />
            </div>
            <TextAreaField
              label="Accroche"
              rows={2}
              value={form.shortDescription}
              onChange={(e) => set({ shortDescription: e.target.value })}
              hint="Une phrase affichée sous le nom, sur la fiche et dans les résultats."
            />
            <TextAreaField
              label="Description"
              optional
              rows={4}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              hint="Laissez une ligne vide entre deux paragraphes."
            />
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <TextAreaField
                label="Caractéristiques"
                optional
                rows={3}
                value={form.specs}
                onChange={(e) => set({ specs: e.target.value })}
                hint="Une par ligne : « Libellé : valeur »."
              />
              <SelectField
                label="Taux de TVA"
                value={form.vatRate}
                onChange={(e) => set({ vatRate: e.target.value })}
                hint="À valider avec un expert-comptable."
              >
                {VAT_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r} %
                  </option>
                ))}
              </SelectField>
            </div>
          </Section>

          <Section title="Images">
            <ImageGalleryUpload
              label="Photos du produit"
              value={form.images}
              onChange={(images) => set({ images })}
              uploader={staffImageUploader('products')}
            />
          </Section>

          <Section title="Prix, stock et variantes">
            {multiple && (
              <TextField
                label="Ce qui distingue les variantes"
                value={form.optionName}
                onChange={(e) => set({ optionName: e.target.value })}
                hint="Par exemple : Taille, Couleur, Stockage."
                containerClassName="sm:max-w-xs"
              />
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-muted">
                    {multiple && <th className="pb-2 font-semibold">Valeur</th>}
                    <th className="pb-2 font-semibold">Prix (FCFA)</th>
                    <th className="pb-2 font-semibold">Coût d’achat</th>
                    <th className="pb-2 font-semibold">Stock</th>
                    <th className="pb-2 font-semibold">Seuil d’alerte</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {form.variants.map((v, i) => (
                    <tr key={i}>
                      {multiple && (
                        <td className="pr-2 pb-2">
                          <input
                            aria-label={`Valeur de la variante ${i + 1}`}
                            placeholder="Ex. M"
                            className="input h-10"
                            value={v.label}
                            onChange={(e) => setVariant(i, { label: e.target.value })}
                          />
                        </td>
                      )}
                      {(['price', 'cost', 'stock', 'threshold'] as const).map((k) => (
                        <td key={k} className="pr-2 pb-2">
                          <input
                            aria-label={`${{ price: 'Prix', cost: 'Coût d’achat', stock: 'Stock', threshold: 'Seuil d’alerte' }[k]} de la variante ${i + 1}`}
                            inputMode="numeric"
                            placeholder={k === 'cost' ? 'Facultatif' : undefined}
                            className="input h-10"
                            value={v[k]}
                            onChange={(e) => setVariant(i, { [k]: e.target.value })}
                          />
                        </td>
                      ))}
                      <td className="pb-2">
                        {multiple && (
                          <button
                            type="button"
                            onClick={() => set({ variants: form.variants.filter((_, j) => j !== i) })}
                            aria-label={`Supprimer la variante ${i + 1}`}
                            className="grid size-10 place-items-center text-ink-muted transition-colors hover:text-danger"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={() => set({ variants: [...form.variants, emptyVariant()] })}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline"
            >
              <Plus className="size-4" aria-hidden="true" />
              Ajouter une variante (taille, couleur…)
            </button>
            <p className="text-sm text-ink-muted">Le coût d’achat reste interne : il sert au calcul des marges.</p>
          </Section>

          <Section title="Mise en avant">
            <div className="flex flex-wrap gap-6">
              <Checkbox
                label="Badge « Nouveau »"
                checked={form.isNew}
                onChange={(e) => set({ isNew: e.target.checked })}
              />
              <Checkbox
                label="Afficher sur l’accueil"
                checked={form.featured}
                onChange={(e) => set({ featured: e.target.checked })}
              />
            </div>
          </Section>
        </div>

        {error && (
          <p className="mt-4 text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-sage pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="outline"
            loading={create.isPending && pending === 'draft'}
            onClick={() => submit(false)()}
          >
            Enregistrer en brouillon
          </Button>
          <Button type="submit" loading={create.isPending && pending === 'publish'}>
            Publier
          </Button>
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
