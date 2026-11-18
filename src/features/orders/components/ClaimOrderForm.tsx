import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { toast } from '@/stores/toastStore';
import { ORDER_NUMBER_EXAMPLE, ORDER_NUMBER_PATTERN } from '../orders.constants';
import { useClaimOrder } from '../orders.queries';

/**
 * Commande passée sans compte, ajoutée au compte : numéro et code de suivi reçus par e-mail. L'API vérifie aussi
 * que la commande a été passée avec l'adresse e-mail du compte.
 */
export function ClaimOrderForm() {
  const claim = useClaimOrder();
  const [number, setNumber] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ORDER_NUMBER_PATTERN.test(number.trim()))
      return setError(`Saisissez le numéro au format ${ORDER_NUMBER_EXAMPLE}.`);
    if (code.trim().length !== 6) return setError('Le code de suivi contient 6 caractères.');
    setError('');
    claim.mutate(
      { number: number.trim().toUpperCase(), code: code.trim().toUpperCase() },
      {
        onSuccess: (order) => {
          toast.success('Commande ajoutée à votre compte', { description: order.number });
          setNumber('');
          setCode('');
        },
        onError: (err) => setError(getErrorMessage(err)),
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="card mt-6 space-y-4 p-6">
      <div>
        <h2 className="text-lg">Une commande passée sans compte ?</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Ajoutez-la à votre compte avec son numéro et son code de suivi, reçus par e-mail. Elle doit avoir été passée
          avec l’adresse e-mail de ce compte.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Numéro de commande"
          placeholder={ORDER_NUMBER_EXAMPLE}
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />
        <TextField label="Code de suivi" placeholder="ABC123" value={code} onChange={(e) => setCode(e.target.value)} />
      </div>
      {error && (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" loading={claim.isPending}>
        Ajouter à mon compte
      </Button>
    </form>
  );
}
