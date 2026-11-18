import { AnimatePresence, motion } from 'motion/react';
import { PackageSearch } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { getErrorMessage } from '@/api/ApiError';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { OrderDetailPanel } from '@/features/orders/components/OrderDetailPanel';
import { ORDER_NUMBER_EXAMPLE, ORDER_NUMBER_PATTERN } from '@/features/orders/orders.constants';
import { useTrackOrder } from '@/features/orders/orders.queries';

export default function TrackOrderPage() {
  const [params] = useSearchParams();
  const [number, setNumber] = useState(params.get('numero') ?? '');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<{ number?: string; code?: string }>({});
  const track = useTrackOrder();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = {
      number: ORDER_NUMBER_PATTERN.test(number.trim())
        ? undefined
        : `Saisissez le numéro au format ${ORDER_NUMBER_EXAMPLE}.`,
      code: code.trim().length === 6 ? undefined : 'Le code de suivi contient 6 caractères.',
    };
    setErrors(next);
    if (next.number || next.code) return;
    track.mutate({ number, code });
  };

  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Suivre une commande' }]} />
      <div className="mx-auto max-w-4xl">
        <div className="card mx-auto max-w-xl p-6 sm:p-8">
          <span className="mb-3 grid place-items-start text-forest [&_svg]:size-8">
            <PackageSearch className="size-6" />
          </span>
          <h1 className="text-2xl">Suivre ma commande</h1>
          <p className="mt-1.5 text-ink-soft">
            Saisissez le numéro de commande et le code de suivi affichés à la confirmation et envoyés par e-mail.
          </p>
          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            <TextField
              label="Numéro de commande"
              placeholder={ORDER_NUMBER_EXAMPLE}
              value={number}
              onChange={(e) => setNumber(e.target.value.toUpperCase())}
              error={errors.number}
              autoComplete="off"
            />
            <TextField
              label="Code de suivi"
              placeholder="ABC123"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              error={errors.code}
              autoComplete="off"
            />
            {track.isError && (
              <p className="text-sm font-medium text-danger" role="alert">
                {getErrorMessage(track.error)}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" loading={track.isPending} loadingText="Recherche…">
              Afficher le suivi
            </Button>
          </form>
          <p className="mt-4 text-xs text-ink-muted">Démo : commande CMD-2026-00147, code K7P2QX.</p>
        </div>

        <AnimatePresence>
          {track.data && (
            <motion.div
              key={track.data.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <OrderDetailPanel order={track.data} trackingCode={code.trim().toUpperCase()} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
