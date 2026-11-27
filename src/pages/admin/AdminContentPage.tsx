import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextAreaField, TextField } from '@/components/ui/TextField';
import { ImageUpload } from '@/components/ui/Upload';
import { Switch } from '@/components/ui/Switch';
import type { Ad, AdInput } from '@/features/home/home.types';
import { adminApi } from '@/features/admin/admin.api';
import { useAdminAds, useAdminMutation } from '@/features/admin/admin.queries';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { PageIntro, Toolbar } from '@/features/admin/components/Toolbar';
import { staffImageUploader } from '@/features/admin/adminCatalog.backend';

const placementLabel: Record<string, string> = {
  'home-promo': 'Accueil, grande bannière (1200 × 400)',
};

export default function AdminContentPage() {
  const { data: ads, isLoading } = useAdminAds();
  const [ad, setAd] = useState<Ad | 'new' | null>(null);
  const toggle = useAdminMutation(
    (item: Ad) => adminApi.updateAd(item.id, { active: !item.active }),
    (item) => (item.active ? 'Visuel masqué' : 'Visuel affiché'),
  );

  if (isLoading || !ads) return <PageLoader />;

  const columns: Column<Ad>[] = [
    {
      key: 'visual',
      header: 'Visuel',
      cell: (item) => (
        <img src={item.image} alt="" className="h-12 w-28 rounded-md border border-sage bg-white object-cover" />
      ),
    },
    {
      key: 'advertiser',
      header: 'Annonceur',
      cell: (item) => (
        <>
          <span className="block font-semibold">{item.advertiser ?? 'La boutique'}</span>
          <span className="line-clamp-1 block max-w-xs text-xs text-ink-muted">{item.alt}</span>
        </>
      ),
    },
    { key: 'placement', header: 'Emplacement', cell: (item) => placementLabel[item.placement] ?? item.placement },
    { key: 'priority', header: 'Priorité', align: 'center', cell: (item) => item.priority },
    {
      key: 'active',
      header: 'Affiché',
      align: 'center',
      cell: (item) => <Switch checked={item.active} onChange={() => toggle.mutate(item)} label={`Afficher ${item.alt}`} />,
    },
  ];

  return (
    <>
      <PageIntro>
        Gérez les bannières publicitaires de l’accueil. Une campagne peut être activée ou masquée à tout moment.
      </PageIntro>
      <Toolbar>
        <Button className="sm:ml-auto" icon={<Plus className="size-4" />} onClick={() => setAd('new')}>
          Nouvelle bannière publicitaire
        </Button>
      </Toolbar>
      <AdminTable caption="Bannières publicitaires" columns={columns} rows={ads} rowKey={(item) => item.id} onRowClick={setAd} />
      {ad && <AdDialog ad={ad === 'new' ? null : ad} onClose={() => setAd(null)} />}
    </>
  );
}

function AdDialog({ ad, onClose }: { ad: Ad | null; onClose: () => void }) {
  const [values, setValues] = useState(() => ({
    placement: 'home-promo',
    advertiser: ad?.advertiser ?? '',
    alt: ad?.alt ?? '',
    href: ad?.href ?? '/catalogue',
    image: ad?.image ?? null,
    imageMobile: ad?.imageMobile ?? null,
    priority: String(ad?.priority ?? 10),
    active: ad?.active ?? true,
  }));
  const [error, setError] = useState('');
  const set = (patch: Partial<typeof values>) => setValues((current) => ({ ...current, ...patch }));
  const save = useAdminMutation(
    (input: AdInput) => (ad ? adminApi.updateAd(ad.id, input) : adminApi.createAd(input)),
    'Bannière publicitaire enregistrée',
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (values.alt.trim().length < 5) return setError('Décrivez le visuel : ce texte est lu par les lecteurs d’écran.');
    if (!values.image) return setError('Ajoutez le visuel ordinateur.');
    const input: AdInput = {
      placement: values.placement,
      advertiser: values.advertiser.trim() || null,
      alt: values.alt.trim(),
      href: values.href.trim(),
      image: values.image,
      imageMobile: values.imageMobile,
      priority: Number(values.priority) || 0,
      active: values.active,
    };
    save.mutate(input, { onSuccess: onClose });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={ad ? 'Modifier la bannière publicitaire' : 'Nouvelle bannière publicitaire'}
      description="Choisissez un emplacement et un visuel, puis activez sa diffusion."
      className="max-w-xl"
    >
      <form onSubmit={submit} noValidate className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
        <TextField
          label="Annonceur"
          optional
          value={values.advertiser}
          onChange={(event) => set({ advertiser: event.target.value })}
          hint="Laisser vide pour un visuel de la boutique."
        />
        <TextAreaField label="Texte alternatif" rows={2} value={values.alt} onChange={(event) => set({ alt: event.target.value })} />
        <TextField label="Lien" value={values.href} onChange={(event) => set({ href: event.target.value })} />
        <ImageUpload
          label="Visuel ordinateur"
          value={values.image}
          onChange={(image) => set({ image })}
          aspect="aspect-[3/1]"
          fit="cover"
          maxSize={1600}
          uploader={staffImageUploader('banners')}
          hint={`${placementLabel[values.placement] ?? ''}. JPG, PNG ou WebP, 5 Mo au maximum.`}
        />
        <ImageUpload
          label="Visuel mobile (facultatif)"
          value={values.imageMobile}
          onChange={(imageMobile) => set({ imageMobile })}
          aspect="aspect-[4/3] max-w-[240px]"
          maxSize={1000}
          uploader={staffImageUploader('banners')}
          hint="800 × 600 conseillé. Sans visuel mobile, le visuel ordinateur est utilisé."
        />
        <TextField label="Priorité" inputMode="numeric" value={values.priority} onChange={(event) => set({ priority: event.target.value })} />
        <Switch checked={values.active} onChange={() => set({ active: !values.active })} label="Afficher cette campagne" />
        {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={save.isPending}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  );
}
