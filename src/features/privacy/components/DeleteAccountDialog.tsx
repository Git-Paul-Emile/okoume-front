import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getErrorMessage } from '@/api/ApiError';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Checkbox, TextField } from '@/components/ui/TextField';
import { useLogout } from '@/features/auth/auth.queries';
import { useMyOrders } from '@/features/orders/orders.queries';
import { toast } from '@/stores/toastStore';
import { privacyApi } from '../privacy.api';
import { deletionBlockers } from '../privacy.rules';

/** Suppression du compte par le client (2.2, 19.5) : immédiate, sans passer par l'équipe. */
export function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const logout = useLogout();
  const { data: orders = [] } = useMyOrders();
  const blockers = deletionBlockers(orders);
  const [password, setPassword] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState('');
  const remove = useMutation({
    mutationFn: () => privacyApi.deleteOwnAccount(password),
    onSuccess: () => {
      logout();
      toast.success('Votre compte a été supprimé', { description: 'Vos données personnelles ont été anonymisées.' });
      navigate('/', { replace: true });
    },
  });

  const submit = () => {
    if (!understood) return setError('Cochez la case pour confirmer.');
    if (!password) return setError('Saisissez votre mot de passe.');
    setError('');
    remove.mutate();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Supprimer mon compte"
      description="La suppression est immédiate et définitive : nom, coordonnées, adresses, favoris et points sont effacés. Les montants de vos commandes restent conservés pour la comptabilité, sans votre nom ni vos coordonnées."
    >
      {blockers.length ? (
        <div className="space-y-4">
          <p className="text-sm text-warning" role="status">
            Suppression impossible pour l’instant : {blockers.map((o) => o.number).join(', ')}{' '}
            {blockers.length > 1 ? 'sont encore en cours' : 'est encore en cours'} ou en attente de remboursement. Vous
            pourrez supprimer votre compte une fois{' '}
            {blockers.length > 1 ? 'ces commandes terminées' : 'cette commande terminée'}.
          </p>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <TextField
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Checkbox
            label="Je comprends que cette suppression est définitive."
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
          />
          {(error || remove.isError) && (
            <p className="text-sm font-medium text-danger" role="alert">
              {error || getErrorMessage(remove.error)}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={submit}>
              Supprimer définitivement
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
