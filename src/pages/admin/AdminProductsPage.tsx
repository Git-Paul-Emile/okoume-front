import { Plus, Tags, Upload } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { adminApi } from '@/features/admin/admin.api';
import { useAdminCategories, useAdminMutation, useAdminProducts } from '@/features/admin/admin.queries';
import type { AdminProduct } from '@/features/admin/admin.types';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { StateBadge } from '@/features/admin/components/StatusBadges';
import { BulkPriceDialog } from '@/features/admin/components/BulkPriceDialog';
import { ImportCatalogDialog } from '@/features/admin/components/ImportCatalogDialog';
import { NewProductDialog } from '@/features/admin/components/NewProductDialog';
import { ProductEditDialog } from '@/features/admin/components/ProductEditDialog';
import { Switch } from '@/components/ui/Switch';
import { PageIntro, SearchInput, Segmented, Toolbar } from '@/features/admin/components/Toolbar';
import { matches } from '@/features/admin/admin.utils';
import { useSelection } from '@/features/admin/useSelection';
import { isPromotionActive } from '@/features/products/products.utils';
import { missingCost } from '@/features/admin/product.builder';
import { SellerProductReviewDialog } from '@/features/admin/components/SellerProductReviewDialog';
import { toast } from '@/stores/toastStore';
import { formatPrice } from '@/utils/formatPrice';

type Filter = 'all' | 'published' | 'draft' | 'archived' | 'promo' | 'sellers' | 'review';

const available = (p: AdminProduct) => p.variants.reduce((s, v) => s + Math.max(0, v.stock - v.reserved), 0);

export default function AdminProductsPage() {
  const { data: products, isLoading } = useAdminProducts();
  const { data: categories = [] } = useAdminCategories();
  const [filter, setFilter] = useState<Filter>('published');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const { selected, open, close } = useSelection(products);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [bulk, setBulk] = useState(false);
  const toggle = useAdminMutation(
    (p: AdminProduct) => adminApi.updateProduct(p.id, { status: p.status === 'published' ? 'archived' : 'published' }),
    (p) => (p.status === 'published' ? `${p.name} retiré de la boutique` : `${p.name} publié`),
  );

  if (isLoading || !products) return <PageLoader />;

  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const inFilter = (p: AdminProduct, f: Filter) =>
    f === 'all' ||
    (f === 'promo'
      ? isPromotionActive(p.promotion)
      : f === 'sellers'
        ? !!p.seller
        : f === 'review'
          ? p.moderation === 'pending_moderation'
          : p.status === f);
  const rows = products.filter(
    (p) =>
      inFilter(p, filter) &&
      (!category || p.rootCategoryId === category || p.categoryId === category) &&
      matches(query, p.name, p.sku, p.brand),
  );

  const columns: Column<AdminProduct>[] = [
    {
      key: 'name',
      header: 'Produit',
      cell: (p) => (
        <span className="flex items-center gap-3">
          <img
            src={p.thumbnail}
            alt=""
            className="size-11 shrink-0 rounded-md border border-sage bg-white object-contain p-0.5"
          />
          <span className="min-w-0">
            <span className="block max-w-[260px] truncate font-semibold">{p.name}</span>
            <span className="block text-xs text-ink-muted">
              {p.sku} · {p.variants.length} variante{p.variants.length > 1 ? 's' : ''}
              {p.seller ? ` · Boutique ${p.seller.name}` : ''}
            </span>
          </span>
        </span>
      ),
    },
    { key: 'category', header: 'Catégorie', cell: (p) => catName.get(p.categoryId) ?? p.categoryId },
    {
      key: 'price',
      header: 'Prix',
      align: 'right',
      cell: (p) => {
        const prices = p.variants.map((v) => v.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        return (
          <span className="whitespace-nowrap tabular-nums">
            {min === max ? formatPrice(min) : `${formatPrice(min)} à ${formatPrice(max)}`}
          </span>
        );
      },
    },
    {
      key: 'stock',
      header: 'Disponible',
      align: 'right',
      cell: (p) => {
        const n = available(p);
        return (
          <span className={n === 0 ? 'font-semibold text-danger' : 'tabular-nums'}>{n === 0 ? 'Rupture' : n}</span>
        );
      },
    },
    {
      key: 'tags',
      header: 'Mise en avant',
      cell: (p) => (
        <span className="flex flex-wrap gap-1">
          {isPromotionActive(p.promotion) && <StateBadge tone="danger">Promo</StateBadge>}
          {p.isNew && <StateBadge tone="forest">Nouveau</StateBadge>}
          {p.featured && <StateBadge tone="neutral">Accueil</StateBadge>}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'En ligne',
      align: 'center',
      cell: (p) => (
        <Switch
          checked={p.status === 'published'}
          onChange={() =>
            p.status !== 'published' && !p.seller && missingCost(p)
              ? toast.error('Publication impossible', {
                  description: 'Renseignez le coût d’achat de chaque variante avant de publier ce produit.',
                })
              : toggle.mutate(p)
          }
          label={`Publier ${p.name}`}
        />
      ),
    },
  ];

  const labels: Record<Filter, string> = {
    published: 'En ligne',
    draft: 'Brouillons',
    archived: 'Retirés',
    promo: 'En promotion',
    sellers: 'Vendeurs',
    review: 'À examiner',
    all: 'Tous',
  };

  return (
    <>
      <PageIntro
        actions={
          <>
            <Link
              to="/admin/stock"
              className="inline-flex h-11 items-center px-2 text-sm font-semibold text-forest hover:underline"
            >
              Gérer le stock
            </Link>
            <Button variant="outline" icon={<Tags className="size-4" />} onClick={() => setBulk(true)}>
              Modifier les prix
            </Button>
            <Button variant="outline" icon={<Upload className="size-4" />} onClick={() => setImporting(true)}>
              Importer (CSV)
            </Button>
            <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
              Nouveau produit
            </Button>
          </>
        }
      >
        {products.length} produits au catalogue. Un brouillon ou un produit retiré n’apparaît pas dans la boutique ; un
        produit retiré reste dans l’historique des commandes.
      </PageIntro>
      <Toolbar>
        <Segmented
          label="Statut"
          value={filter}
          onChange={setFilter}
          options={(Object.keys(labels) as Filter[]).map((f) => ({
            value: f,
            label: labels[f],
            count: products.filter((p) => inFilter(p, f)).length,
          }))}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Catégorie"
          className="input h-10 w-auto min-w-48"
        >
          <option value="">Toutes les catégories</option>
          {categories
            .filter((c) => !c.parentId)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        <SearchInput value={query} onChange={setQuery} placeholder="Nom, référence, marque" />
      </Toolbar>
      <AdminTable
        key={filter + category + query}
        caption="Produits"
        columns={columns}
        rows={rows}
        rowKey={(p) => p.id}
        onRowClick={open}
        empty="Aucun produit ne correspond."
      />
      {selected &&
        (selected.seller ? (
          <SellerProductReviewDialog key={selected.id} product={selected} onClose={close} />
        ) : (
          <ProductEditDialog key={selected.id} product={selected} onClose={close} />
        ))}
      {bulk && <BulkPriceDialog products={products} categories={categories} onClose={() => setBulk(false)} />}
      {importing && (
        <ImportCatalogDialog products={products} categories={categories} onClose={() => setImporting(false)} />
      )}
      {creating && (
        <NewProductDialog
          products={products}
          categories={categories}
          onClose={() => setCreating(false)}
          onCreated={(p) => {
            setCreating(false);
            setFilter(p.status === 'published' ? 'published' : 'draft');
            setQuery(p.name);
          }}
        />
      )}
    </>
  );
}
