import { MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { useMyConversations } from '@/features/marketplace/marketplace.queries';
import { formatDateTime } from '@/utils/formatDate';

/** Conversations avec les vendeurs (32.5), de la plus récente à la plus ancienne. */
export default function AccountConversationsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useMyConversations(page);

  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <div>
      <h1 className="mb-5 text-2xl">Mes messages</h1>
      {data.items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<MessageCircle className="size-7" />}
            title="Aucune conversation"
            description="Depuis une annonce, « Contacter le vendeur » ouvre une conversation."
            action={<ButtonLink to="/annonces">Voir les annonces</ButtonLink>}
          />
        </div>
      ) : (
        <ul className="card divide-y divide-sage">
          {data.items.map((c) => (
            <li key={c.id}>
              <Link to={`/compte/messages/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-ivory">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.listing.title}</span>
                  <span className="block text-sm text-ink-muted">
                    {c.shop.name}, dernier message le {formatDateTime(c.lastMessageAt)}
                  </span>
                </span>
                {c.status === 'closed' && <Badge>Close</Badge>}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6">
        <Pagination page={page} pageCount={Math.max(1, Math.ceil(data.total / data.limit))} onChange={setPage} />
      </div>
    </div>
  );
}
