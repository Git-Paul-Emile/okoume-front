import { Flag } from 'lucide-react';
import { useState } from 'react';
import { reviewsBackend } from '@/features/reviews/reviews.backend';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { Rating } from '@/components/ui/Rating';
import { REVIEW_REJECTION_REASONS, type Review } from '@/features/reviews/reviews.types';
import { Modal } from '@/components/ui/Modal';
import { SelectField, TextField } from '@/components/ui/TextField';
import {
  useAdminMutation,
  useAdminProducts,
  useAdminReviewReports,
  useAdminReviews,
} from '@/features/admin/admin.queries';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { StateBadge } from '@/features/admin/components/StatusBadges';
import { PageIntro, SearchInput, Segmented, StatRow, Toolbar } from '@/features/admin/components/Toolbar';
import { matches } from '@/features/admin/admin.utils';
import { formatDate } from '@/utils/formatDate';

type Filter = 'pending' | 'reported' | 'approved' | 'rejected';

export default function AdminReviewsPage() {
  const { data: reviews, isLoading } = useAdminReviews();
  const { data: reports = [] } = useAdminReviewReports();
  const { data: products = [] } = useAdminProducts();
  const [filter, setFilter] = useState<Filter>('pending');
  const [query, setQuery] = useState('');
  const [rejecting, setRejecting] = useState<Review | null>(null);
  const moderate = useAdminMutation(
    ({
      review,
      status,
      reason,
      detail = '',
    }: {
      review: Review;
      status: 'approved' | 'rejected';
      reason?: string;
      detail?: string;
    }) => {
      // Historique, motif et clôture des signalements sont tenus par le serveur
      return reviewsBackend.decide(
        review.id,
        status === 'approved' ? { status } : { status, rejectionReason: reason ?? '', detail },
      );
    },
    (v) => (v.status === 'approved' ? 'Avis publié' : 'Avis masqué'),
  );

  if (isLoading || !reviews) return <PageLoader />;

  const productName = new Map(products.map((p) => [p.id, p.name]));
  const reported = new Map<string, string[]>();
  reports.forEach((r) => reported.set(r.reviewId, [...(reported.get(r.reviewId) ?? []), r.reason]));
  const inFilter = (r: Review, f: Filter) => (f === 'reported' ? reported.has(r.id) : r.status === f);
  const rows = reviews.filter(
    (r) => inFilter(r, filter) && matches(query, r.authorName, r.comment, productName.get(r.productId)),
  );
  const approved = reviews.filter((r) => r.status === 'approved');
  const average = approved.length ? approved.reduce((s, r) => s + r.rating, 0) / approved.length : 0;

  const columns: Column<Review>[] = [
    {
      key: 'review',
      header: 'Avis',
      cell: (r) => (
        <div className="max-w-md">
          <Rating value={r.rating} size={14} />
          <p className="mt-1 text-ink">{r.comment}</p>
          {r.rejectionReason && r.status === 'rejected' && (
            <p className="mt-1 text-xs text-ink-muted">Motif communiqué : {r.rejectionReason}</p>
          )}
          {(r.history?.length ?? 0) > 1 && (
            <details className="mt-1 text-xs text-ink-muted">
              <summary className="cursor-pointer font-semibold">Historique ({r.history!.length})</summary>
              <ul className="mt-1 space-y-1">
                {r.history!.map((h, i) => (
                  <li key={i}>
                    {formatDate(h.at)} · {h.event}
                    {h.comment !== undefined && ` : « ${h.comment} » (${h.rating}/5)`}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {reported.has(r.id) && (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-danger">
              <Flag className="size-3.5" aria-hidden="true" />
              Signalé : {reported.get(r.id)!.join(', ')}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Produit',
      cell: (r) => <span className="line-clamp-2 max-w-[200px]">{productName.get(r.productId) ?? '-'}</span>,
    },
    {
      key: 'author',
      header: 'Auteur',
      cell: (r) => (
        <>
          <span className="block font-medium">{r.authorName}</span>
          <span className="block text-xs text-ink-muted">{formatDate(r.createdAt)}</span>
        </>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (r) =>
        r.status === 'approved' ? (
          <StateBadge tone="forest">Publié</StateBadge>
        ) : r.status === 'rejected' ? (
          <StateBadge tone="neutral">Masqué</StateBadge>
        ) : (
          <StateBadge tone="warning">À modérer</StateBadge>
        ),
    },
    {
      key: 'actions',
      header: 'Décision',
      align: 'right',
      cell: (r) => (
        <span className="inline-flex gap-2">
          {r.status !== 'approved' && (
            <Button size="sm" onClick={() => moderate.mutate({ review: r, status: 'approved' })}>
              Publier
            </Button>
          )}
          {r.status !== 'rejected' && (
            <Button size="sm" variant="outline" onClick={() => setRejecting(r)}>
              Masquer
            </Button>
          )}
        </span>
      ),
    },
  ];

  const labels: Record<Filter, string> = {
    pending: 'À modérer',
    reported: 'Signalés',
    approved: 'Publiés',
    rejected: 'Masqués',
  };

  return (
    <>
      <PageIntro>
        Un avis est publié après modération. Masquez les avis contenant des coordonnées, de la publicité ou des propos
        injurieux ; un avis négatif mais honnête reste publié.
      </PageIntro>
      <StatRow
        items={[
          { label: 'À modérer', value: reviews.filter((r) => r.status === 'pending').length },
          { label: 'Signalés', value: reported.size },
          { label: 'Avis publiés', value: approved.length },
          { label: 'Note moyenne', value: `${average.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} / 5` },
        ]}
      />
      <Toolbar>
        <Segmented
          label="Statut"
          value={filter}
          onChange={setFilter}
          options={(Object.keys(labels) as Filter[]).map((f) => ({
            value: f,
            label: labels[f],
            count: reviews.filter((r) => inFilter(r, f)).length,
          }))}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Auteur, commentaire, produit" />
      </Toolbar>
      <AdminTable
        key={filter + query}
        caption="Avis clients"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        empty="Aucun avis dans cette catégorie."
      />
      {rejecting && (
        <RejectDialog
          loading={moderate.isPending}
          onClose={() => setRejecting(null)}
          onConfirm={(reason, detail) =>
            moderate.mutate(
              { review: rejecting, status: 'rejected', reason, detail },
              { onSuccess: () => setRejecting(null) },
            )
          }
        />
      )}
    </>
  );
}

/** Refus d'un avis : motif de la charte, communiqué au client qui peut corriger son avis (13.3). */
function RejectDialog({
  loading,
  onClose,
  onConfirm,
}: {
  loading: boolean;
  onClose: () => void;
  /** Motif de la charte et précision facultative, assemblés à l’enregistrement */
  onConfirm: (reason: string, detail: string) => void;
}) {
  const [reason, setReason] = useState<string>(REVIEW_REJECTION_REASONS[0]);
  const [detail, setDetail] = useState('');
  return (
    <Modal
      open
      onClose={onClose}
      title="Ne pas publier cet avis"
      description="Le motif est communiqué au client, qui peut corriger son avis."
    >
      <div className="space-y-4">
        <SelectField label="Motif" value={reason} onChange={(e) => setReason(e.target.value)}>
          {REVIEW_REJECTION_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Précision pour le client"
          optional
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="danger" loading={loading} onClick={() => onConfirm(reason, detail.trim())}>
            Ne pas publier
          </Button>
        </div>
      </div>
    </Modal>
  );
}
