import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/stores/toastStore';
import { cn } from '@/utils/text';
import { useReportReview } from '../reviews.queries';

const REASONS = [
  'Propos injurieux ou discriminatoires',
  'Publicité ou coordonnées personnelles',
  'Sans rapport avec le produit',
  'Faux avis',
  'Autre motif',
];

/** Signalement d'un avis à l'équipe de modération, avec un motif. */
export function ReportReviewDialog({ reviewId, onClose }: { reviewId: string; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const report = useReportReview();

  return (
    <Modal
      open
      onClose={onClose}
      title="Signaler cet avis"
      description="Notre équipe l’examine puis décide de le garder ou de le masquer."
    >
      <fieldset className="space-y-2">
        <legend className="label">Motif</legend>
        {REASONS.map((r) => (
          <label
            key={r}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm',
              reason === r ? 'border-forest text-forest' : 'border-sage-dark hover:border-forest',
            )}
          >
            <input
              type="radio"
              name="report-reason"
              className="accent-forest"
              checked={reason === r}
              onChange={() => setReason(r)}
            />
            {r}
          </label>
        ))}
      </fieldset>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button
          disabled={!reason}
          loading={report.isPending}
          onClick={() =>
            report.mutate(
              { reviewId, reason },
              {
                onSuccess: () => {
                  toast.success('Avis signalé', { description: 'Merci, notre équipe va l’examiner.' });
                  onClose();
                },
                onError: () => toast.error('Le signalement a échoué. Réessayez.'),
              },
            )
          }
        >
          Signaler
        </Button>
      </div>
    </Modal>
  );
}
