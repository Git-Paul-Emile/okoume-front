import { useSearchParams } from 'react-router';
import { Tabs } from '@/components/ui/Tabs';
import { OffersTab } from '@/features/admin/marketplace/OffersTab';
import { ShopPaymentsTab, ShopsTab } from '@/features/admin/marketplace/SellersTabs';

const TABS = [
  { value: 'boutiques', label: 'Boutiques' },
  { value: 'paiements', label: 'Paiements d’abonnement' },
  { value: 'offres', label: 'Offres et réglages' },
] as const;

type Tab = (typeof TABS)[number]['value'];

/**
 * Boutiques des vendeurs (cahier des charges 32.2) : boutiques, paiements des offres, offres et réglages.
 * Les produits des vendeurs se vérifient depuis la page Produits, les reversements depuis la leur.
 */
export default function AdminMarketplacePage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.find((t) => t.value === params.get('onglet'))?.value ?? 'boutiques';

  return (
    <div className="space-y-5">
      <Tabs
        label="Vendeurs"
        value={tab}
        options={[...TABS]}
        onChange={(value) => setParams({ onglet: value }, { replace: true })}
      />
      {tab === 'boutiques' && <ShopsTab />}
      {tab === 'paiements' && <ShopPaymentsTab />}
      {tab === 'offres' && <OffersTab />}
    </div>
  );
}
