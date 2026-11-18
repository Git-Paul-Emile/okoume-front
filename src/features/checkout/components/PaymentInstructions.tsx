import { Copy } from 'lucide-react';
import type { Order } from '@/features/orders/orders.types';
import type { ShopSettings } from '@/features/settings/settings.types';
import { toast } from '@/stores/toastStore';
import { formatPrice } from '@/utils/formatPrice';
import { PaymentLogo } from './PaymentLogo';

function CopyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2">
      <span>
        <span className="block text-xs text-ink-muted">{label}</span>
        <span className="font-mono font-bold">{value}</span>
      </span>
      <button
        type="button"
        className="no-print rounded-md p-2 text-ink-muted hover:bg-sage hover:text-ink"
        aria-label={`Copier ${label.toLowerCase()}`}
        onClick={() => navigator.clipboard?.writeText(value).then(() => toast.success(`${label} copié`))}
      >
        <Copy className="size-4" />
      </button>
    </div>
  );
}

/** Instructions après la commande : tous les paiements se font à la livraison, au livreur. */
export function PaymentInstructions({ order, settings }: { order: Order; settings: ShopSettings | undefined }) {
  if (order.paymentMethod === 'cash')
    return (
      <div className="rounded-lg bg-forest-50 p-5">
        <h2 className="text-base">Paiement en espèces à la livraison</h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          Préparez {formatPrice(order.totals.total)}, si possible en monnaie exacte. Rien à payer avant : vous réglez le
          livreur à la réception.
        </p>
      </div>
    );

  const account = settings?.mobileMoney.find((m) => m.method === order.paymentMethod);
  return (
    <div className="rounded-lg border border-mure/30 bg-mure-50 p-5">
      <h2 className="flex items-center gap-2 text-base">
        <PaymentLogo method={order.paymentMethod} className="size-8" /> Paiement par {account?.label ?? 'Mobile Money'}{' '}
        à la livraison
      </h2>
      <p className="mt-1.5 text-sm text-ink-soft">
        Rien à payer maintenant. À la réception, envoyez le montant depuis votre téléphone, en présence du livreur, avec
        votre numéro de commande en référence.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {account && <CopyValue label="Numéro bénéficiaire" value={account.number} />}
        {account && <CopyValue label="Nom du bénéficiaire" value={account.beneficiary} />}
        <CopyValue label="Montant exact" value={String(order.totals.total)} />
        <CopyValue label="Référence (n° de commande)" value={order.number} />
      </div>
    </div>
  );
}
