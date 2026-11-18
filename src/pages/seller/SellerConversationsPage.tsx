import { useState } from 'react';
import { Link } from 'react-router';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { Checkbox } from '@/components/ui/TextField';
import { useSellerConversations } from '@/features/seller/seller.queries';
import { formatDateTime } from '@/utils/formatDate';

/** Conversations des acheteurs (32.5) ; celles que l'assistant a transmises au vendeur d'abord à traiter. */
export default function SellerConversationsPage() {
  const [needsSeller, setNeedsSeller] = useState(false);
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useSellerConversations(needsSeller, page);

  return (
    <div>
      <Checkbox
        className="mb-4"
        label="Seulement celles qui attendent ma réponse"
        checked={needsSeller}
        onChange={(e) => {
          setNeedsSeller(e.target.checked);
          setPage(1);
        }}
      />
      {isLoading ? (
        <PageLoader />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <p className="card p-6 text-ink-soft">Aucune conversation.</p>
      ) : (
        <ul className="card divide-y divide-sage">
          {data.items.map((c) => (
            <li key={c.id}>
              <Link to={`/vendeur/messages/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-ivory">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.listing.title}</span>
                  <span className="block text-sm text-ink-muted">
                    Dernier message le {formatDateTime(c.lastMessageAt)}
                  </span>
                </span>
                {c.needsSeller && <Badge tone="warning">Votre réponse est attendue</Badge>}
                {c.status === 'closed' && <Badge>Close</Badge>}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {data && (
        <div className="mt-6">
          <Pagination page={page} pageCount={Math.max(1, Math.ceil(data.total / data.limit))} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
