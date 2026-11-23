import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SelectField, TextAreaField, TextField } from '@/components/ui/TextField';
import type { Ad, AdInput, Banner } from '@/features/home/home.types';
import { adminApi } from '@/features/admin/admin.api';
import { useAdminAds, useAdminBanners, useAdminMutation } from '@/features/admin/admin.queries';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { ImageUpload } from '@/components/ui/Upload';
import { staffImageUploader } from '@/features/admin/adminCatalog.backend';
import { Switch } from '@/components/ui/Switch';
import { PageIntro, Segmented, Toolbar } from '@/features/admin/components/Toolbar';

const placementLabel: Record<string, string> = {
  'home-promo': 'Accueil, grande bannière (1200 × 400)',
  'home-promo-side': 'Accueil, colonne (600 × 700)',
};

type Tab = 'ads' | 'banners';

export default function AdminContentPage() {
  const { data: ads, isLoading } = useAdminAds();
  const { data: banners = [] } = useAdminBanners();
  const [tab, setTab] = useState<Tab>('ads');
  const [ad, setAd] = useState<Ad | 'new' | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const toggle = useAdminMutation(
    (a: Ad) => adminApi.updateAd(a.id, { active: !a.active }),
    (a) => (a.active ? 'Visuel masqué' : 'Visuel affiché'),
  );

  if (isLoading || !ads) return <PageLoader />;

  const adColumns: Column<Ad>[] = [
    {
      key: 'visual',
      header: 'Visuel',
      cell: (a) => (
        <img src={a.image} alt="" className="h-12 w-28 rounded-md border border-sage bg-white object-cover" />
      ),
    },
    {
      key: 'advertiser',
      header: 'Annonceur',
      cell: (a) => (
        <>
          <span className="block font-semibold">{a.advertiser ?? 'La boutique'}</span>
          <span className="line-clamp-1 block max-w-xs text-xs text-ink-muted">{a.alt}</span>
        </>
      ),
    },
    { key: 'placement', header: 'Emplacement', cell: (a) => placementLabel[a.placement] ?? a.placement },
    { key: 'priority', header: 'Priorité', align: 'center', cell: (a) => a.priority },
    {
      key: 'active',
      header: 'Affiché',
      align: 'center',
      cell: (a) => <Switch checked={a.active} onChange={() => toggle.mutate(a)} label={`Afficher ${a.alt}`} />,
    },
  ];

  const bannerColumns: Column<Banner>[] = [
    {
      key: 'visual',
      header: 'Visuel',
      cell: (b) => (
        <img src={b.image} alt="" className="size-14 rounded-md border border-sage bg-white object-contain p-1" />
      ),
    },
    {
      key: 'title',
      header: 'Texte',
      cell: (b) => (
        <>
          <span className="block font-semibold">{b.title}</span>
          <span className="line-clamp-1 block max-w-md text-xs text-ink-muted">{b.subtitle}</span>
        </>
      ),
    },
    { key: 'cta', header: 'Bouton', cell: (b) => b.cta },
    { key: 'href', header: 'Lien', cell: (b) => <code className="text-xs text-ink-muted">{b.href}</code> },
  ];

  return (
    <>
      <PageIntro>
        Les espaces publicitaires sont gérés ici : activez un visuel d’annonceur ou affichez le visuel « espace
        disponible » de la boutique. Chaque publicité porte la mention « Publicité ».
      </PageIntro>
      <Toolbar>
        <Segmented
          label="Contenu"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'ads', label: 'Espaces publicitaires', count: ads.length },
            { value: 'banners', label: 'Carrousel d’accueil', count: banners.length },
          ]}
        />
        {tab === 'ads' && (
          <Button className="sm:ml-auto" icon={<Plus className="size-4" />} onClick={() => setAd('new')}>
            Nouvel espace publicitaire
          </Button>
        )}
      </Toolbar>
      {tab === 'ads' ? (
        <AdminTable
          caption="Espaces publicitaires"
          columns={adColumns}
          rows={ads}
          rowKey={(a) => a.id}
          onRowClick={setAd}
        />
      ) : (
        <AdminTable
          caption="Diapositives du carrousel d’accueil"
          columns={bannerColumns}
          rows={banners}
          rowKey={(b) => b.id}
          onRowClick={setBanner}
        />
      )}
      {ad && <AdDialog ad={ad === 'new' ? null : ad} onClose={() => setAd(null)} />}
      {banner && <BannerDialog banner={banner} onClose={() => setBanner(null)} />}
    </>
  );
}

function AdDialog({ ad, onClose }: { ad: Ad | null; onClose: () => void }) {
  const [v, setV] = useState(() => ({
    placement: ad?.placement ?? 'home-promo',
    advertiser: ad?.advertiser ?? '',
    alt: ad?.alt ?? '',
    href: ad?.href ?? '/catalogue',
    image: ad?.image ?? null,
    imageMobile: ad?.imageMobile ?? null,
    priority: String(ad?.priority ?? 10),
    active: ad?.active ?? true,
  }));
  const [error, setError] = useState('');
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  const save = useAdminMutation(
    (input: AdInput) => (ad ? adminApi.updateAd(ad.id, input) : adminApi.createAd(input)),
    'Espace publicitaire enregistré',
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (v.alt.trim().length < 5) return setError('Décrivez le visuel : ce texte est lu par les lecteurs d’écran.');
    if (!v.image) return setError('Ajoutez le visuel ordinateur.');
    const input: AdInput = {
      placement: v.placement,
      advertiser: v.advertiser.trim() || null,
      alt: v.alt.trim(),
      href: v.href.trim(),
      image: v.image,
      imageMobile: v.imageMobile,
      priority: Number(v.priority) || 0,
      active: v.active,
    };
    save.mutate(input, { onSuccess: onClose });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={ad ? 'Modifier l’espace publicitaire' : 'Nouvel espace publicitaire'}
      description="Choisissez un emplacement, un visuel et activez ou masquez sa diffusion."
      className="max-w-xl"
    >
      <form onSubmit={submit} noValidate className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
        <SelectField
          label="Emplacement"
          value={v.placement}
          disabled={!!ad}
          onChange={(e) => set({ placement: e.target.value })}
        >
          <option value="home-promo">Accueil, grande bannière (1200 × 400)</option>
          <option value="home-promo-side">Accueil, colonne (600 × 700)</option>
        </SelectField>
        <TextField
          label="Annonceur"
          optional
          value={v.advertiser}
          onChange={(e) => set({ advertiser: e.target.value })}
          hint="Laisser vide pour le visuel « espace disponible » de la boutique."
        />
        <TextAreaField label="Texte alternatif" rows={2} value={v.alt} onChange={(e) => set({ alt: e.target.value })} />
        <TextField label="Lien" value={v.href} onChange={(e) => set({ href: e.target.value })} />
        <ImageUpload
          label="Visuel ordinateur"
          value={v.image}
          onChange={(image) => set({ image })}
          aspect={v.placement === 'home-promo-side' ? 'aspect-[6/7] max-w-[240px]' : 'aspect-[3/1]'}
          fit="cover"
          maxSize={1600}
          uploader={staffImageUploader('banners')}
          hint={`${placementLabel[v.placement] ?? ''}. JPG, PNG ou WebP, 5 Mo au maximum.`}
        />
        <ImageUpload
          label="Visuel mobile (facultatif)"
          value={v.imageMobile}
          onChange={(imageMobile) => set({ imageMobile })}
          aspect="aspect-[4/3] max-w-[240px]"
          fit="cover"
          maxSize={1000}
          uploader={staffImageUploader('banners')}
          hint="800 × 600 conseillé. Sans visuel mobile, le visuel ordinateur est utilisé."
        />
        {/* Le contrat de l’annonceur n’est pas stocké en ligne : il reste dans les documents de la boutique */}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Priorité"
            inputMode="numeric"
            value={v.priority}
            onChange={(e) => set({ priority: e.target.value })}
          />
        </div>
        <Switch checked={v.active} onChange={() => set({ active: !v.active })} label="Afficher cette campagne" />
        {error && (
          <p className="text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
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

function BannerDialog({ banner, onClose }: { banner: Banner; onClose: () => void }) {
  const [v, setV] = useState({
    title: banner.title,
    subtitle: banner.subtitle,
    cta: banner.cta,
    href: banner.href,
    image: banner.image as string | null,
  });
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  const save = useAdminMutation(
    (patch: Partial<Banner>) => adminApi.updateBanner(banner.id, patch),
    'Diapositive enregistrée',
  );

  return (
    <Modal open onClose={onClose} title="Diapositive du carrousel" className="max-w-xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (v.title.trim() && v.image) save.mutate({ ...v, image: v.image }, { onSuccess: onClose });
        }}
        className="space-y-4"
      >
        <TextField label="Titre" value={v.title} onChange={(e) => set({ title: e.target.value })} />
        <TextAreaField
          label="Sous-titre"
          rows={2}
          value={v.subtitle}
          onChange={(e) => set({ subtitle: e.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Texte du bouton" value={v.cta} onChange={(e) => set({ cta: e.target.value })} />
          <TextField label="Lien" value={v.href} onChange={(e) => set({ href: e.target.value })} />
        </div>
        <ImageUpload
          label="Visuel"
          value={v.image}
          onChange={(image) => set({ image })}
          aspect="aspect-square max-w-[220px]"
          maxSize={1000}
          uploader={staffImageUploader('banners')}
          hint="Produit détouré sur fond transparent de préférence (PNG ou WebP)."
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
