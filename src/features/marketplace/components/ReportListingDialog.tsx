import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SelectField, TextAreaField } from '@/components/ui/TextField';
import { toast } from '@/stores/toastStore';
import { REPORT_REASONS, reportLabel, type ReportReason } from '../marketplace.backend';
import { useReportListing } from '../marketplace.queries';

/** Signalement d'une annonce (13.4) : motif obligatoire, précision facultative, examiné par l'équipe. */
export function ReportListingDialog({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const report = useReportListing();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!reason) return setError('Choisissez le motif du signalement.');
    setError('');
    report.mutate(
      { slug, reason, comment },
      {
        onSuccess: () => {
          toast.success('Signalement envoyé', { description: 'L’équipe Okoumé examine l’annonce.' });
          onClose();
        },
        onError: (err) => setError(getErrorMessage(err)),
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Signaler l’annonce"
      description="Votre signalement reste anonyme pour le vendeur."
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <SelectField
          label="Motif"
          value={reason}
          onChange={(e) => setReason(REPORT_REASONS.find((r) => r === e.target.value) ?? '')}
          error={error && !reason ? error : undefined}
        >
          <option value="">Choisissez un motif</option>
          {REPORT_REASONS.map((r) => (
            <option key={r} value={r}>
              {reportLabel[r]}
            </option>
          ))}
        </SelectField>
        <TextAreaField
          label="Précision"
          optional
          rows={3}
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        {error && reason && (
          <p className="text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={report.isPending}>
            Envoyer le signalement
          </Button>
        </div>
      </form>
    </Modal>
  );
}
