import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextAreaField } from '@/components/ui/TextField';
import { toast } from '@/stores/toastStore';
import { formatDate } from '@/utils/formatDate';
import { cn } from '@/utils/text';
import { downloadJson, privacyApi, type ClientPrivacyRequestType } from '../privacy.api';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { RETENTION_RULES } from '../retention';
import { useCreatePrivacyRequest, usePrivacyRequests } from '../privacy.queries';
import { privacyStatusLabel, privacyTypeLabel } from '../privacy.rules';

const forms: Partial<
  Record<ClientPrivacyRequestType, { title: string; description: string; label: string; confirm: string }>
> = {
  correction: {
    title: 'Demander une correction',
    description:
      'Indiquez les informations à corriger que vous ne pouvez pas modifier vous-même (adresse e-mail, commande…).',
    label: 'Informations à corriger',
    confirm: 'Envoyer la demande',
  },
  access: {
    title: 'Demander l’accès à vos données',
    description: 'Notre équipe vous indique quelles données nous détenons, pourquoi et pendant combien de temps.',
    label: 'Votre question (facultatif)',
    confirm: 'Envoyer la demande',
  },
};

/** Droits sur les données personnelles (19.5) : accès, export, correction et suppression, avec suivi. */
export function PrivacySection() {
  const { data: requests = [] } = usePrivacyRequests();
  const create = useCreatePrivacyRequest();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ClientPrivacyRequestType | null>(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const current = form ? forms[form] : null;
  const pendingDeletion = requests.some(
    (r) => r.type === 'deletion' && (r.status === 'received' || r.status === 'in_progress'),
  );

  const exportData = async () => {
    setExporting(true);
    try {
      downloadJson(await privacyApi.bundle(), `mes-donnees-okoume.json`);
      // L'export est déjà inscrit dans le suivi par le serveur
      void queryClient.invalidateQueries({ queryKey: ['privacy'] });
      toast.success('Vos données ont été téléchargées');
    } catch {
      toast.error('L’export n’a pas pu être préparé. Réessayez.');
    } finally {
      setExporting(false);
    }
  };

  const submit = () => {
    if (!form) return;
    if (form === 'correction' && details.trim().length < 5) return setError('Indiquez les informations à corriger.');
    create.mutate(
      { type: form, details: details.trim() },
      {
        onSuccess: () => {
          toast.success('Demande envoyée : réponse sous 30 jours au plus');
          setForm(null);
          setDetails('');
          setError('');
        },
      },
    );
  };

  return (
    <div className="card p-6">
      <h2 className="text-lg">Mes données personnelles</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Vous pouvez consulter, télécharger, faire corriger ou supprimer vos données. Chaque demande reçoit une réponse
        sous 30 jours au plus.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" loading={exporting} onClick={exportData}>
          Télécharger mes données
        </Button>
        <Button variant="outline" onClick={() => setForm('access')}>
          Demander l’accès
        </Button>
        <Button variant="outline" onClick={() => setForm('correction')}>
          Demander une correction
        </Button>
        <Button variant="danger" disabled={pendingDeletion} onClick={() => setDeleting(true)}>
          Supprimer mon compte
        </Button>
      </div>
      {pendingDeletion && (
        <p className="mt-2 text-sm text-ink-soft">Votre demande de suppression est en cours de traitement.</p>
      )}

      {deleting && <DeleteAccountDialog onClose={() => setDeleting(false)} />}

      <details className="mt-6 text-sm">
        <summary className="cursor-pointer font-semibold">Durées de conservation de vos données</summary>
        <ul className="mt-2 space-y-1 text-ink-soft">
          {RETENTION_RULES.map((r) => (
            <li key={r.category}>
              <span className="font-medium text-ink">
                {r.label} : {r.duration}.
              </span>{' '}
              {r.outcome}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-ink-muted">
          La suppression de votre compte efface ou anonymise vos données personnelles, sauf les factures et avoirs que
          la loi impose de conserver.
        </p>
      </details>

      {requests.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 font-bold">Suivi de mes demandes</h3>
          <ul className="divide-y divide-sage text-sm">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
                <span className="min-w-0">
                  <span className="block font-medium">
                    {privacyTypeLabel[r.type]} · {r.number}
                  </span>
                  <span className="block text-xs text-ink-muted">
                    Envoyée le {formatDate(r.createdAt)}
                    {(r.status === 'received' || r.status === 'in_progress') &&
                      `, réponse au plus tard le ${formatDate(r.dueAt)}`}
                  </span>
                  {r.response && <span className="mt-1 block text-ink-soft">{r.response}</span>}
                </span>
                <span
                  className={cn(
                    'text-sm font-semibold',
                    r.status === 'completed' ? 'text-forest' : r.status === 'refused' ? 'text-danger' : 'text-warning',
                  )}
                >
                  {privacyStatusLabel[r.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Modal
        open={!!current}
        onClose={() => setForm(null)}
        title={current?.title ?? ''}
        description={current?.description}
      >
        <div className="space-y-4">
          <TextAreaField
            label={current?.label ?? ''}
            rows={3}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            error={error || undefined}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setForm(null)}>
              Annuler
            </Button>
            <Button variant="primary" loading={create.isPending} onClick={submit}>
              {current?.confirm}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
