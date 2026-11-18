import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/TextField';
import { AttachmentsPicker } from '@/components/ui/Upload';
import type { UploadedDocument } from '@/utils/upload';
import { useCurrentUser } from '@/features/auth/auth.queries';
import { supportImageUploader } from '../support.backend';
import { fieldErrors } from '@/utils/zodErrors';
import { categoryLabel, ticketSchema, type TicketInput } from '../support.schemas';
import { useCreateTicket } from '../support.queries';
import type { Ticket } from '../support.types';
import { ORDER_NUMBER_EXAMPLE } from '@/features/orders/orders.constants';

export function TicketForm({
  onCreated,
  defaultOrder,
  defaultCategory,
  defaultSubject,
}: {
  onCreated: (t: Ticket) => void;
  defaultOrder?: string;
  defaultCategory?: TicketInput['category'];
  defaultSubject?: string;
}) {
  const { user } = useCurrentUser();
  const [v, setV] = useState<Partial<Record<keyof TicketInput, string>>>({
    name: user ? `${user.firstName} ${user.lastName}` : '',
    email: user?.email ?? '',
    orderNumber: defaultOrder ?? '',
    category: defaultCategory ?? '',
    subject: defaultSubject ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<UploadedDocument[]>([]);
  const create = useCreateTicket();

  const field = (k: keyof TicketInput) => ({
    value: v[k] ?? '',
    error: errors[k],
    onChange: (e: { target: { value: string } }) => {
      setV((x) => ({ ...x, [k]: e.target.value }));
      if (errors[k]) setErrors((x) => ({ ...x, [k]: '' }));
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = ticketSchema.safeParse(v);
    if (!r.success) return setErrors(fieldErrors(r.error));
    create.mutate({ ...r.data, attachments }, { onSuccess: onCreated });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Nom" autoComplete="name" {...field('name')} />
        <TextField label="Adresse e-mail" type="email" autoComplete="email" {...field('email')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Sujet" {...field('category')}>
          <option value="">Choisissez un sujet</option>
          {Object.entries(categoryLabel).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </SelectField>
        <TextField label="Numéro de commande" optional placeholder={ORDER_NUMBER_EXAMPLE} {...field('orderNumber')} />
      </div>
      <TextField label="Objet" {...field('subject')} />
      <TextAreaField
        label="Message"
        rows={5}
        {...field('message')}
        hint="N’indiquez jamais de mot de passe ni de code secret Mobile Money."
      />
      {/* API : images envoyées chez l'hébergeur avec l'autorisation du compte ; sans compte, pas de pièce jointe */}
      {user ? (
        <AttachmentsPicker value={attachments} onChange={setAttachments} uploader={supportImageUploader} />
      ) : (
        <p className="text-xs text-ink-muted">
          Pour joindre des photos, connectez-vous : la demande sera aussi suivie dans votre espace client.
        </p>
      )}
      {create.isError && <p className="text-sm font-medium text-danger">{getErrorMessage(create.error)}</p>}
      <Button type="submit" size="lg" loading={create.isPending} loadingText="Envoi…">
        Envoyer ma demande
      </Button>
    </form>
  );
}
