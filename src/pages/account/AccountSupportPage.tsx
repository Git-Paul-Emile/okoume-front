import { LifeBuoy, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TicketForm } from '@/features/support/components/TicketForm';
import { categoryLabel } from '@/features/support/support.schemas';
import { useMyTickets } from '@/features/support/support.queries';
import { ticketStatusLabel } from '@/features/support/support.constants';
import { toast } from '@/stores/toastStore';
import { formatDate } from '@/utils/formatDate';

export default function AccountSupportPage() {
  const { data: tickets, isLoading } = useMyTickets();
  const [params] = useSearchParams();
  const [creating, setCreating] = useState(!!params.get('commande'));
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Assistance</h1>
        {!creating && (
          <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            Nouvelle demande
          </Button>
        )}
      </div>
      {creating && (
        <div className="card p-6">
          <h2 className="mb-4 text-lg">Nouvelle demande</h2>
          <TicketForm
            defaultOrder={params.get('commande') ?? undefined}
            onCreated={(t) => {
              toast.success(`Demande ${t.number} envoyée`);
              navigate(`/compte/assistance/${t.number}`);
            }}
          />
        </div>
      )}
      {isLoading ? (
        <div className="skeleton h-32" />
      ) : !tickets?.length ? (
        !creating && (
          <div className="card">
            <EmptyState
              icon={<LifeBuoy className="size-7" />}
              title="Aucune demande"
              description="Une question sur une commande ou un produit ? Ouvrez une demande, nous vous répondons ici et par e-mail."
            />
          </div>
        )
      ) : (
        <ul className="card divide-y divide-sage">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                to={`/compte/assistance/${t.number}`}
                className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-ivory"
              >
                <span>
                  <span className="block font-semibold">{t.subject}</span>
                  <span className="text-xs text-ink-muted">
                    {t.number} · {categoryLabel[t.category]} · {formatDate(t.createdAt)}
                  </span>
                </span>
                <Badge tone={t.status === 'resolved' || t.status === 'closed' ? 'neutral' : 'forest'}>
                  {ticketStatusLabel[t.status]}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
