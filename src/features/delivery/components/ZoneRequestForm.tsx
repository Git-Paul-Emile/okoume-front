import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { deliveryApi } from '../delivery.api';

/** Quartier absent de la liste (9.1) : la demande est transmise à l'équipe, qui peut ouvrir la zone. */
export function ZoneRequestForm({ defaultContact = '' }: { defaultContact?: string }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ neighbourhood: '', city: 'Libreville', contact: defaultContact });
  const [error, setError] = useState('');
  const send = useMutation({ mutationFn: deliveryApi.requestZone });

  if (send.isSuccess)
    return (
      <p className="-mt-2 text-sm text-forest" role="status">
        Merci : votre demande pour {v.neighbourhood} est transmise. Nous vous recontactons si la livraison y devient
        possible.
      </p>
    );

  if (!open)
    return (
      <button
        type="button"
        className="-mt-2 text-sm font-semibold text-forest hover:underline"
        onClick={() => setOpen(true)}
      >
        Mon quartier n’est pas dans la liste
      </button>
    );

  const submit = () => {
    if (v.neighbourhood.trim().length < 2) return setError('Indiquez votre quartier.');
    if (v.contact.trim().length < 6) return setError('Indiquez un téléphone ou un e-mail pour vous répondre.');
    setError('');
    send.mutate({ neighbourhood: v.neighbourhood.trim(), city: v.city.trim(), contact: v.contact.trim() });
  };

  return (
    <fieldset className="-mt-2 space-y-3 rounded-lg border border-sage p-4">
      <legend className="px-1 text-sm font-semibold">Demander la livraison dans mon quartier</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Quartier"
          value={v.neighbourhood}
          onChange={(e) => setV({ ...v, neighbourhood: e.target.value })}
        />
        <TextField label="Ville" value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} />
      </div>
      <TextField
        label="Téléphone ou e-mail"
        value={v.contact}
        onChange={(e) => setV({ ...v, contact: e.target.value })}
        error={error || undefined}
      />
      {send.isError && (
        <p className="text-sm text-danger" role="alert">
          La demande n’a pas pu être envoyée. Réessayez.
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" loading={send.isPending} onClick={submit}>
          Envoyer la demande
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </fieldset>
  );
}
