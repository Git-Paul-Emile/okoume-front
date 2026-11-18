import { Link, useParams } from 'react-router';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { useCurrentUser } from '@/features/auth/auth.queries';
import { OrderDetailPanel } from '@/features/orders/components/OrderDetailPanel';
import { useOrder } from '@/features/orders/orders.queries';

export default function AccountOrderDetailPage() {
  const { number } = useParams();
  const { data: order, isLoading, error } = useOrder(number);
  const { user } = useCurrentUser();

  if (isLoading) return <PageLoader />;
  // Contrôle d'accès côté client (le serveur réel doit refaire ce contrôle : IDOR)
  if (error || !order || order.userId !== user?.id)
    return <ErrorState title="Commande introuvable dans votre compte" />;

  return (
    <div>
      <Link
        to="/compte/commandes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline"
      >
        Mes commandes
      </Link>
      <OrderDetailPanel order={order} inAccount />
      <p className="mt-6 text-sm text-ink-soft">
        Un problème avec cette commande ?{' '}
        <Link to={`/compte/assistance?commande=${order.number}`} className="font-semibold text-forest hover:underline">
          Ouvrir une demande d’assistance
        </Link>
      </p>
    </div>
  );
}
