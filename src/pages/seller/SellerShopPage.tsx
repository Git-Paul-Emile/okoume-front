import { useState } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { MobileMoneyForm } from '@/features/seller/components/MobileMoneyForm';
import { ShopForm } from '@/features/seller/components/ShopForm';
import { decisionLabel, sellerBackend, type AccessPlan } from '@/features/seller/seller.backend';
import { useAccessPlans, useSellerAction, useSellerShop, useShopPayments } from '@/features/seller/seller.queries';
import { toast } from '@/stores/toastStore';
import { formatDate, formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/text';

const planPrice = (p: AccessPlan) =>
  p.kind === 'free' ? 'Gratuit' : `${formatPrice(p.price)} pour ${p.periodDays ?? 0} jours`;

/** Fiche de la boutique, offre d'accès et paiements déclarés (32.2). */
export default function SellerShopPage() {
  const { data: shop } = useSellerShop();
  const { data: plans = [] } = useAccessPlans();
  const [page, setPage] = useState(1);
  const payments = useShopPayments(page);
  const [chosen, setChosen] = useState<AccessPlan | null>(null);
  const update = useSellerAction(sellerBackend.updateShop);
  const changePlan = useSellerAction(sellerBackend.changePlan);
  const declare = useSellerAction(sellerBackend.declareShopPayment);

  if (!shop) return <PageLoader />;
  const pending = payments.data?.items.some((p) => p.status === 'pending');

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-5">
        <h2 className="mb-4 text-lg">Fiche de la boutique</h2>
        <p className={shop.verified ? 'mb-4 text-sm text-forest' : 'mb-4 rounded-md bg-ivory p-3 text-sm text-ink-soft'} role="status">
          {shop.verified
            ? 'Boutique vérifiée par OKOZA.'
            : 'La vérification de votre boutique est en attente. Les produits que vous soumettez sont vérifiés séparément avant leur publication.'}
        </p>
        <ShopForm
          initial={{
            name: shop.name,
            description: shop.description,
            city: shop.city,
            district: shop.district ?? '',
            phone: shop.phone,
            acceptedPaymentMethods: shop.acceptedPaymentMethods,
            handoverModes: shop.handoverModes,
          }}
          submitLabel="Enregistrer"
          onSubmit={async (fields) => {
            await update.mutateAsync(fields);
            toast.success('Boutique enregistrée');
          }}
        />
      </section>

      <div className="space-y-6">
        <section className="card space-y-3 p-5">
          <h2 className="text-lg">Offre d’accès</h2>
          <ul className="space-y-2">
            {plans.map((p) => {
              const current = p.id === shop.plan.id;
              return (
                <li
                  key={p.id}
                  className={cn('rounded-md border p-3 text-sm', current ? 'border-forest' : 'border-sage')}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">
                      {p.name} : {planPrice(p)}
                    </span>
                    {current && <Badge tone="forest">Offre actuelle</Badge>}
                  </div>
                  {p.description && <p className="mt-1 text-ink-soft">{p.description}</p>}
                  {p.kind === 'free' && !current && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      loading={changePlan.isPending}
                      onClick={() =>
                        changePlan.mutate(p.id, {
                          onSuccess: () => toast.success(`Offre ${p.name} activée`),
                          onError: (err) => toast.error('Changement impossible', { description: getErrorMessage(err) }),
                        })
                      }
                    >
                      Passer à cette offre
                    </Button>
                  )}
                  {p.kind === 'paid' && (
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => setChosen(p)}>
                      {current ? 'Renouveler' : 'Choisir et payer'}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          {chosen && (
            <div className="rounded-md border border-sage p-4">
              <p className="mb-2 font-semibold">
                {chosen.name} : {planPrice(chosen)}
              </p>
              {pending && (
                <p className="mb-2 text-sm text-warning">
                  Un paiement est déjà en cours de vérification : attendez la décision avant d’en déclarer un autre.
                </p>
              )}
              <MobileMoneyForm
                amount={chosen.price}
                submitLabel="Déclarer le paiement"
                onSubmit={async (payment) => {
                  await declare.mutateAsync({ planId: chosen.id, ...payment });
                  toast.success('Paiement déclaré', { description: 'L’équipe OKOZA le vérifie avant d’activer.' });
                  setChosen(null);
                }}
              />
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-lg">Paiements déclarés</h2>
          {!payments.data ? (
            <PageLoader />
          ) : payments.data.items.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucun paiement déclaré.</p>
          ) : (
            <ul className="divide-y divide-sage text-sm">
              {payments.data.items.map((p) => (
                <li key={p.id} className="py-2.5">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>
                      {p.plan.name}, {formatPrice(p.amount)} ({p.method === 'airtel' ? 'Airtel' : 'Moov'}, réf.{' '}
                      <span className="font-mono">{p.reference}</span>)
                    </span>
                    <Badge tone={p.status === 'validated' ? 'forest' : p.status === 'refused' ? 'danger' : 'warning'}>
                      {decisionLabel[p.status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-ink-muted">
                    Déclaré le {formatDateTime(p.createdAt)}
                    {p.periodEnd && `, accès jusqu’au ${formatDate(p.periodEnd)}`}
                    {p.decisionReason && `. Motif : ${p.decisionReason}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {payments.data && (
            <div className="mt-4">
              <Pagination
                page={page}
                pageCount={Math.max(1, Math.ceil(payments.data.total / payments.data.limit))}
                onChange={setPage}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
