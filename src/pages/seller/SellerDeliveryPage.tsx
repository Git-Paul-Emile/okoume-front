import { useState } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { useDeliveryZones } from '@/features/delivery/delivery.queries';
import { useSellerAction, useShopDelivery } from '@/features/seller/seller.queries';
import { sellerOrdersBackend, type ShopDelivery } from '@/features/seller/sellerOrders.backend';
import { toast } from '@/stores/toastStore';
import { formatPrice } from '@/utils/formatPrice';

/**
 * Qui livre les commandes de la boutique (cahier des charges 32.5) : les livreurs OKOZA, aux frais de chaque
 * quartier, ou le vendeur lui-même, aux frais qu'il fixe pour les quartiers qu'il dessert.
 */
export default function SellerDeliveryPage() {
  const delivery = useShopDelivery();
  const zones = useDeliveryZones();
  if (delivery.isLoading || zones.isLoading) return <PageLoader />;
  if (delivery.isError || !delivery.data || !zones.data)
    return <ErrorState error={delivery.error ?? zones.error} onRetry={() => void delivery.refetch()} />;
  return <DeliveryForm initial={delivery.data} zones={zones.data.filter((z) => z.available)} />;
}

function DeliveryForm({
  initial,
  zones,
}: {
  initial: ShopDelivery;
  zones: Array<{ id: string; name: string; city: string; fee: number }>;
}) {
  const [mode, setMode] = useState(initial.mode);
  const [fees, setFees] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.fees.map((f) => [f.zoneId, String(f.fee)])),
  );
  const [error, setError] = useState<string | null>(null);
  const save = useSellerAction((d: ShopDelivery) => sellerOrdersBackend.saveDelivery(d));

  const submit = () => {
    const chosen = Object.entries(fees).filter(([, v]) => v.trim() !== '');
    if (chosen.some(([, v]) => !/^\d+$/.test(v.trim())))
      return setError('Les frais sont des montants entiers en FCFA (0 pour une livraison offerte).');
    if (mode === 'seller' && !chosen.length) return setError('Indiquez au moins un quartier que vous livrez.');
    setError(null);
    save.mutate(
      { mode, fees: mode === 'seller' ? chosen.map(([zoneId, v]) => ({ zoneId, fee: Number(v.trim()) })) : [] },
      {
        onSuccess: () => toast.success('Livraison enregistrée'),
        onError: (err) => setError(getErrorMessage(err)),
      },
    );
  };

  return (
    <section className="card max-w-3xl space-y-5 p-5">
      <h2 className="text-lg">Livraison de vos commandes</h2>
      <fieldset className="space-y-3">
        <legend className="sr-only">Qui livre</legend>
        <label className="flex cursor-pointer gap-3 rounded-md border border-sage p-3 has-[:checked]:border-forest">
          <input type="radio" name="mode" checked={mode === 'okoza'} onChange={() => setMode('okoza')} />
          <span>
            <span className="block font-semibold">Les livreurs OKOZA</span>
            <span className="text-sm text-ink-soft">
              Vous préparez la commande, un livreur OKOZA la récupère et encaisse à la livraison. OKOZA garde les
              frais de livraison et vous reverse le reste, commission déduite.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer gap-3 rounded-md border border-sage p-3 has-[:checked]:border-forest">
          <input type="radio" name="mode" checked={mode === 'seller'} onChange={() => setMode('seller')} />
          <span>
            <span className="block font-semibold">Mes propres livreurs</span>
            <span className="text-sm text-ink-soft">
              Vous livrez et encaissez vous-même, aux frais que vous fixez. Le client ne voit que les quartiers que vous
              desservez.
            </span>
          </span>
        </label>
      </fieldset>

      {mode === 'seller' && (
        <div className="space-y-2">
          <p className="text-sm text-ink-soft">
            Frais par quartier ; laissez vide un quartier que vous ne livrez pas. Pour repère, le tarif OKOZA est
            indiqué.
          </p>
          <ul className="divide-y divide-sage rounded-md border border-sage">
            {zones.map((z) => (
              <li key={z.id} className="flex flex-wrap items-center justify-between gap-3 p-2.5 text-sm">
                <span>
                  <span className="font-semibold">{z.name}</span>{' '}
                  <span className="text-ink-muted">
                    ({z.city}, tarif OKOZA {formatPrice(z.fee)})
                  </span>
                </span>
                <input
                  className="input h-9 w-32"
                  inputMode="numeric"
                  aria-label={`Frais pour ${z.name}`}
                  placeholder="Non livré"
                  value={fees[z.id] ?? ''}
                  onChange={(e) => setFees((x) => ({ ...x, [z.id]: e.target.value }))}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-mure-50 p-3 text-sm text-mure-dark" role="alert">
          {error}
        </p>
      )}
      <Button loading={save.isPending} onClick={submit}>
        Enregistrer
      </Button>
    </section>
  );
}
