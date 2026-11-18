import { useSearchParams } from 'react-router';
import { Tabs } from '@/components/ui/Tabs';
import { ListingsModerationTab, ReportsTab } from '@/features/admin/marketplace/ModerationTabs';
import { OffersTab } from '@/features/admin/marketplace/OffersTab';
import { BoostsTab, ShopPaymentsTab, ShopsTab } from '@/features/admin/marketplace/SellersTabs';

const TABS = [
  { value: 'annonces', label: 'Annonces à modérer' },
  { value: 'signalements', label: 'Signalements' },
  { value: 'boutiques', label: 'Boutiques' },
  { value: 'paiements', label: 'Paiements d’abonnement' },
  { value: 'mises-en-avant', label: 'Mises en avant' },
  { value: 'offres', label: 'Offres et réglages' },
] as const;

type Tab = (typeof TABS)[number]['value'];

/** Modération de la place de marché (section 32) : annonces, signalements, boutiques, paiements, offres. */
export default function AdminMarketplacePage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.find((t) => t.value === params.get('onglet'))?.value ?? 'annonces';

  return (
    <div className="space-y-5">
      <Tabs
        label="Place de marché"
        value={tab}
        options={[...TABS]}
        onChange={(value) => setParams({ onglet: value }, { replace: true })}
      />
      {tab === 'annonces' && <ListingsModerationTab />}
      {tab === 'signalements' && <ReportsTab />}
      {tab === 'boutiques' && <ShopsTab />}
      {tab === 'paiements' && <ShopPaymentsTab />}
      {tab === 'mises-en-avant' && <BoostsTab />}
      {tab === 'offres' && <OffersTab />}
    </div>
  );
}
