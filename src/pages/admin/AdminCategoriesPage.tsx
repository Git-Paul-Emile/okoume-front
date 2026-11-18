import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SelectField, TextField } from '@/components/ui/TextField';
import type { Category } from '@/features/categories/categories.types';
import { buildTree, inCategory, isCollection } from '@/features/categories/categories.utils';
import { adminApi } from '@/features/admin/admin.api';
import { useAdminCategories, useAdminMutation, useAdminProducts } from '@/features/admin/admin.queries';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { ImageUpload } from '@/components/ui/Upload';
import { staffImageUploader } from '@/features/admin/adminCatalog.backend';
import { StateBadge } from '@/features/admin/components/StatusBadges';
import { PageIntro } from '@/features/admin/components/Toolbar';
import { cn, normalizeText } from '@/utils/text';

type Row = Category & { depth: number };

const slugify = (s: string) => normalizeText(s).replace(/ /g, '-');

export default function AdminCategoriesPage() {
  const { data: categories, isLoading } = useAdminCategories();
  const { data: products = [] } = useAdminProducts();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);

  if (isLoading || !categories) return <PageLoader />;

  const byId = new Map(categories.map((c) => [c.id, c]));
  // Arborescence aplatie avec son niveau, puis les collections transversales à la fin
  const rows: Row[] = [];
  const walk = (nodes: ReturnType<typeof buildTree>, depth: number) =>
    nodes.forEach((n) => {
      rows.push({ ...n, depth });
      walk(n.children, depth + 1);
    });
  walk(buildTree(categories.filter((c) => !isCollection(c))), 0);
  categories.filter(isCollection).forEach((c) => rows.push({ ...c, depth: 0 }));

  const count = (id: string) => products.filter((p) => inCategory(p.categoryId, id, byId)).length;

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Catégorie',
      cell: (c) => (
        <span className="flex items-center gap-3" style={{ paddingLeft: c.depth * 28 }}>
          {c.image && (
            <img
              src={c.image}
              alt=""
              className="size-9 shrink-0 rounded-full border border-sage bg-white object-cover"
            />
          )}
          <span className={cn(c.depth === 0 ? 'font-bold' : 'font-medium')}>{c.name}</span>
        </span>
      ),
    },
    { key: 'slug', header: 'Adresse', cell: (c) => <code className="text-xs text-ink-muted">?categorie={c.id}</code> },
    {
      key: 'type',
      header: 'Type',
      cell: (c) =>
        isCollection(c) ? (
          <StateBadge tone="forest">Collection</StateBadge>
        ) : (
          <span className="text-ink-soft">{['Rayon', 'Sous-catégorie', '3e niveau'][c.depth]}</span>
        ),
    },
    {
      key: 'count',
      header: 'Produits',
      align: 'right',
      cell: (c) => <span className="tabular-nums">{count(c.id)}</span>,
    },
  ];

  return (
    <>
      <PageIntro
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>
            Nouvelle catégorie
          </Button>
        }
      >
        Trois niveaux au maximum. Une collection (comme « Traditionnel ») regroupe des catégories existantes sans
        apparaître dans les menus.
      </PageIntro>
      <AdminTable
        caption="Catégories"
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        onRowClick={(c) => setEditing(byId.get(c.id)!)}
        pageSize={50}
      />
      {editing && (
        <CategoryDialog
          category={editing === 'new' ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function CategoryDialog({
  category,
  categories,
  onClose,
}: {
  category: Category | null;
  categories: Category[];
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [parentId, setParentId] = useState(category?.parentId ?? '');
  const [image, setImage] = useState<string | null>(category?.image ?? null);
  const [error, setError] = useState('');
  const byId = new Map(categories.map((c) => [c.id, c]));
  const depth = (id: string | null): number => (id ? 1 + depth(byId.get(id)?.parentId ?? null) : 0);
  // Parents possibles : rayons et sous-catégories (pour rester sur trois niveaux), hors catégorie elle-même
  const parents = categories.filter((c) => !isCollection(c) && depth(c.parentId) < 2 && c.id !== category?.id);
  const save = useAdminMutation(
    (c: Category) => (category ? adminApi.updateCategory(c.id, c) : adminApi.createCategory(c)),
    (c) => `${c.name} enregistrée`,
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError('Saisissez un nom.');
    const id = category?.id ?? slugify(name);
    if (!category && byId.has(id)) return setError('Une catégorie porte déjà ce nom.');
    save.mutate(
      {
        ...category,
        id,
        slug: category?.slug ?? id,
        name: name.trim(),
        parentId: parentId || null,
        image,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal open onClose={onClose} title={category ? `Modifier ${category.name}` : 'Nouvelle catégorie'}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <TextField label="Nom" value={name} onChange={(e) => setName(e.target.value)} error={error} autoFocus />
        {!(category && isCollection(category)) && (
          <SelectField label="Catégorie parente" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">Aucune : nouveau rayon</option>
            {parents.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parentId ? `${byId.get(c.parentId)?.name} › ${c.name}` : c.name}
              </option>
            ))}
          </SelectField>
        )}
        <ImageUpload
          label="Image"
          value={image}
          onChange={setImage}
          uploader={staffImageUploader('categories')}
          aspect="aspect-square max-w-[160px]"
          fit="cover"
          maxSize={600}
          hint="Visuel carré, affiché en rond dans « Acheter par catégorie »."
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={save.isPending}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
