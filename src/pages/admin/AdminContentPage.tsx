import { useState, type FormEvent } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextAreaField, TextField } from '@/components/ui/TextField';
import type { Ad, Banner } from '@/features/home/home.types';
import { adminApi } from '@/features/admin/admin.api';
import { useAdminAds, useAdminBanners, useAdminMutation } from '@/features/admin/admin.queries';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { ImageUpload } from '@/components/ui/Upload';
import { staffImageUploader } from '@/features/admin/adminCatalog.backend';
import { StateBadge } from '@/features/admin/components/StatusBadges';
import { Switch } from '@/components/ui/Switch';
import { PageIntro, Segmented, Toolbar } from '@/features/admin/components/Toolbar';
import { formatDate } from '@/utils/formatDate';

const placementLabel: Record<string, string> = {
  'home-promo': 'Accueil, grande bannière (1200 × 400)',
  'home-promo-side': 'Accueil, colonne (600 × 700)',
};

type Tab = 'ads' | 'banners';

const campaign = (a: Ad, now = new Date()) => {
  if (!a.advertiser) return <StateBadge tone="neutral">Espace disponible</StateBadge>;
  if (a.startsAt && new Date(a.startsAt) > now) return <StateBadge tone="warning">Programmée</StateBadge>;
  if (a.endsAt && new Date(a.endsAt) < now) return <StateBadge tone="neutral">Terminée</StateBadge>;
  return <StateBadge tone="forest">En cours</StateBadge>;
};

export default function AdminContentPage() {
  const { data: ads, isLoading } = useAdminAds();
  const { data: banners = [] } = useAdminBanners();
  const [tab, setTab] = useState<Tab>('ads');
  const [ad, setAd] = useState<Ad | null>(null);
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
    {
      key: 'period',
      header: 'Période',
      cell: (a) =>
        a.startsAt || a.endsAt ? (
          <span className="whitespace-nowrap">
            {a.startsAt ? formatDate(a.startsAt) : '…'} au {a.endsAt ? formatDate(a.endsAt) : '…'}
          </span>
        ) : (
          'Sans limite'
        ),
    },
    { key: 'state', header: 'Campagne', cell: (a) => campaign(a) },
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
        Les espaces publicitaires sont vendus à des entreprises extérieures ; sans campagne en cours, le visuel « espace
        disponible » de la boutique s’affiche. Chaque publicité porte la mention « Publicité ».
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
      {ad && <AdDialog ad={ad} onClose={() => setAd(null)} />}
      {banner && <BannerDialog banner={banner} onClose={() => setBanner(null)} />}
    </>
  );
}

const toDate = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

function AdDialog({ ad, onClose }: { ad: Ad; onClose: () => void }) {
  const [v, setV] = useState({
    advertiser: ad.advertiser ?? '',
    alt: ad.alt,
    href: ad.href,
    image: ad.image as string | null,
    imageMobile: ad.imageMobile,
    contract: ad.contract ?? null,
    startsAt: toDate(ad.startsAt),
    endsAt: toDate(ad.endsAt),
    priority: String(ad.priority),
  });
  const [error, setError] = useState('');
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  const save = useAdminMutation(
    (patch: Partial<Ad>) => adminApi.updateAd(ad.id, patch),
    'Espace publicitaire enregistré',
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (v.alt.trim().length < 5) return setError('Décrivez le visuel : ce texte est lu par les lecteurs d’écran.');
    if (v.startsAt && v.endsAt && v.endsAt < v.startsAt) return setError('La fin doit être après le début.');
    if (!v.image) return setError('Ajoutez le visuel ordinateur.');
    save.mutate(
      {
        advertiser: v.advertiser.trim() || null,
        alt: v.alt.trim(),
        href: v.href.trim(),
        image: v.image,
        imageMobile: v.imageMobile,
        contract: v.contract,
        startsAt: v.startsAt ? new Date(`${v.startsAt}T00:00:00`).toISOString() : null,
        endsAt: v.endsAt ? new Date(`${v.endsAt}T23:59:00`).toISOString() : null,
        priority: Number(v.priority) || 0,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Espace publicitaire"
      description={placementLabel[ad.placement]}
      className="max-w-xl"
    >
      <form onSubmit={submit} noValidate className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
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
          aspect={ad.placement === 'home-promo-side' ? 'aspect-[6/7] max-w-[240px]' : 'aspect-[3/1]'}
          fit="cover"
          maxSize={1600}
          uploader={staffImageUploader('banners')}
          hint={`${placementLabel[ad.placement] ?? ''}. JPG, PNG ou WebP, 5 Mo au maximum.`}
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
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Début" type="date" value={v.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
          <TextField label="Fin" type="date" value={v.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
          <TextField
            label="Priorité"
            inputMode="numeric"
            value={v.priority}
            onChange={(e) => set({ priority: e.target.value })}
          />
        </div>
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
