import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { visibleInAccount } from '@/features/privacy/retention';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button, ButtonLink } from '@/components/ui/Button';
import { LogoMark } from '@/components/ui/Logo';
import { brand } from '@/config/brand';
import { useCurrentUser } from '@/features/auth/auth.queries';
import type { InvoiceDocument } from '@/features/invoices/invoice.rules';
import { ordersBackend } from '@/features/orders/orders.backend';
import { paymentMethodLabel } from '@/features/orders/orders.constants';
import { useOrder } from '@/features/orders/orders.queries';
import { useSettings } from '@/features/settings/settings.queries';
import type { ShopSettings } from '@/features/settings/settings.types';
import { formatDate } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';

const INVOICED = ['paid', 'refund_due', 'refunded'];

/**
 * Facture et avoirs d'une commande payée (25.4), tels qu'émis : numéros chronologiques, TVA détaillée,
 * documents figés. « Enregistrer en PDF » passe par l'impression du navigateur.
 */
export default function InvoicePage() {
  const { number } = useParams();
  const { data: order, isLoading } = useOrder(number);
  const { user } = useCurrentUser();
  const { data: settings } = useSettings();
  // Au-delà de la fenêtre opérationnelle, la facture n'est plus dans le compte : archives comptables (19.5)
  const [now] = useState(() => Date.now());
  const allowed =
    !!order &&
    order.userId === user?.id &&
    INVOICED.includes(order.paymentStatus) &&
    visibleInAccount(order.createdAt, now);
  const docs = useQuery({
    queryKey: ['invoices', order?.id],
    enabled: allowed,
    // Factures et avoirs émis par le serveur au paiement et au remboursement
    queryFn: ({ signal }) => ordersBackend.invoices(order!, user!.id, signal),
  });

  if (isLoading || (allowed && docs.isLoading)) return <PageLoader />;
  // Affichage seulement : l'API vérifie elle-même que la commande appartient au compte
  if (!order || !allowed || !docs.data?.length)
    return (
      <ErrorState title="Facture indisponible">
        Une facture est disponible une fois la commande payée, pendant 3 ans dans votre compte. Au-delà, elle est
        conservée dans les archives de la boutique : demandez-en une copie depuis la page Contact.
      </ErrorState>
    );

  return (
    <div className="min-h-dvh bg-ivory py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-between gap-2 px-4 print:hidden">
        <ButtonLink to={`/compte/commandes/${order.number}`} variant="ghost" size="sm">
          Retour à la commande
        </ButtonLink>
        <Button size="sm" icon={<Printer className="size-4" />} onClick={() => window.print()}>
          Imprimer ou enregistrer en PDF
        </Button>
      </div>
      <div className="space-y-8 print:space-y-0">
        {docs.data.map((d, i) => (
          <InvoiceSheet key={d.id} doc={d} settings={settings} first={i === 0} />
        ))}
      </div>
    </div>
  );
}

function InvoiceSheet({ doc, settings, first }: { doc: InvoiceDocument; settings?: ShopSettings; first: boolean }) {
  const legal = settings?.legal;
  const credit = doc.type === 'credit_note';
  const Title = first ? 'h1' : 'h2';
  return (
    <article className="mx-auto max-w-3xl bg-white p-8 shadow-card sm:p-12 print:max-w-none print:break-after-page print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-sage pb-6">
        <div className="flex items-center gap-3">
          <LogoMark className="size-11" />
          <div className="text-sm">
            <p className="text-lg font-extrabold">{legal?.companyName ?? brand.name}</p>
            <p className="text-ink-soft">{settings?.support.address}</p>
            <p className="text-ink-soft">
              {settings?.support.phone} · {settings?.support.email}
            </p>
            <p className="text-ink-muted">
              NIF : {legal?.nif ?? 'À compléter'} · RCCM : {legal?.rccm ?? 'À compléter'}
            </p>
          </div>
        </div>
        <div className="text-right text-sm">
          <Title className="text-2xl">{credit ? 'Avoir' : 'Facture'}</Title>
          <p className="font-mono font-semibold">{doc.number}</p>
          <p className="text-ink-soft">Date : {formatDate(doc.issuedAt)}</p>
          <p className="text-ink-soft">Commande {doc.orderNumber}</p>
          {credit && <p className="text-ink-soft">Sur la facture {doc.relatedNumber}</p>}
        </div>
      </header>

      <section className="grid gap-6 py-6 text-sm sm:grid-cols-2">
        <div>
          <h3 className="mb-1 text-xs font-semibold text-ink-muted">Facturé à</h3>
          <p className="font-semibold">{doc.customer.name}</p>
          <p className="text-ink-soft">{doc.customer.phone}</p>
          <p className="text-ink-soft">{doc.customer.email}</p>
        </div>
        <div>
          <h3 className="mb-1 text-xs font-semibold text-ink-muted">Livré à</h3>
          <p className="text-ink-soft">{doc.customer.address}</p>
          <p className="mt-2 text-ink-soft">
            {credit ? `Motif : ${doc.reason}` : `Paiement : ${paymentMethodLabel[doc.paymentMethod]}`}
          </p>
        </div>
      </section>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-y border-sage text-left text-xs text-ink-muted">
            <th className="py-2 font-semibold">Désignation</th>
            <th className="py-2 text-right font-semibold">Qté</th>
            <th className="py-2 text-right font-semibold">PU TTC</th>
            <th className="py-2 text-right font-semibold">TVA</th>
            <th className="py-2 text-right font-semibold">Montant TTC</th>
          </tr>
        </thead>
        <tbody>
          {doc.lines.map((l, i) => (
            <tr key={i} className="border-b border-sage/70">
              <td className="py-2.5">
                {l.label}
                {l.detail && <span className="block text-xs text-ink-muted">{l.detail}</span>}
              </td>
              <td className="py-2.5 text-right tabular-nums">{l.quantity}</td>
              <td className="py-2.5 text-right tabular-nums">{formatPrice(l.unit)}</td>
              <td className="py-2.5 text-right tabular-nums">{l.vatRate} %</td>
              <td className="py-2.5 text-right tabular-nums">{formatPrice(l.ttc)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 grid gap-6 text-sm sm:grid-cols-2">
        <table className="self-start text-xs">
          <caption className="mb-1 text-left font-semibold text-ink-muted">Détail de la TVA</caption>
          <thead>
            <tr className="text-ink-muted">
              <th className="pr-4 text-left font-semibold">Taux</th>
              <th className="pr-4 text-right font-semibold">Base HT</th>
              <th className="text-right font-semibold">TVA</th>
            </tr>
          </thead>
          <tbody>
            {doc.vatBreakdown.map((r) => (
              <tr key={r.rate}>
                <td className="pr-4">{r.rate} %</td>
                <td className="pr-4 text-right tabular-nums">{formatPrice(r.ht)}</td>
                <td className="text-right tabular-nums">{formatPrice(r.vat)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="space-y-1.5">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Total HT</dt>
            <dd className="tabular-nums">{formatPrice(doc.totals.ht)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">TVA</dt>
            <dd className="tabular-nums">{formatPrice(doc.totals.vat)}</dd>
          </div>
          <div className="flex justify-between border-t border-sage pt-2 text-base font-extrabold">
            <dt>{credit ? 'Total remboursé TTC' : 'Total TTC'}</dt>
            <dd className="tabular-nums">{formatPrice(doc.totals.ttc)}</dd>
          </div>
        </dl>
      </div>

      <footer className="mt-10 border-t border-sage pt-4 text-xs text-ink-muted">
        <p>Montants en francs CFA (XAF). Document émis automatiquement ; il ne peut être ni modifié ni supprimé.</p>
        {legal?.vatNote && <p className="mt-1">{legal.vatNote}</p>}
      </footer>
    </article>
  );
}
