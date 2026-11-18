import { AnimatePresence, motion } from 'motion/react';
import { MapPin, Plus, Star, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SelectField, TextField } from '@/components/ui/TextField';
import { getErrorMessage } from '@/api/ApiError';
import { useAddressActions, useCurrentUser } from '@/features/auth/auth.queries';
import { useSettings } from '@/features/settings/settings.queries';
import { useDeliveryZones } from '@/features/delivery/delivery.queries';
import { deliverySchema } from '@/features/checkout/checkout.schemas';
import { toast } from '@/stores/toastStore';
import { fieldErrors } from '@/utils/zodErrors';

const addressSchema = deliverySchema.omit({ email: true });

export default function AccountAddressesPage() {
  const { user } = useCurrentUser();
  const { data: zones } = useDeliveryZones();
  const { data: settings } = useSettings();
  const actions = useAddressActions();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ label: '', recipient: '', phone: '', zoneId: '', landmark: '', instructions: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (!user) return null;
  // Nombre d'adresses limité (2.2), réglable par l'administrateur principal
  const max = settings?.maxAddresses ?? 5;
  const full = user.addresses.length >= max;

  const feedback = (message: string) => ({
    onSuccess: () => toast.success(message),
    onError: (error: unknown) =>
      toast.error('L’adresse n’a pas pu être enregistrée.', { description: getErrorMessage(error) }),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = addressSchema.safeParse(v);
    const errs = r.success ? {} : fieldErrors(r.error);
    if (!v.label.trim()) errs.label = 'Donnez un nom à cette adresse (Maison, Bureau…).';
    if (Object.keys(errs).length) return setErrors(errs);
    if (full) return setErrors({ label: `${max} adresses au maximum : supprimez-en une avant d’en ajouter.` });
    const { onSuccess, onError } = feedback('Adresse ajoutée');
    actions.add.mutate(
      { ...v, instructions: v.instructions.trim() },
      {
        // La fenêtre reste ouverte en cas d'échec, pour corriger sans tout ressaisir
        onSuccess: () => {
          onSuccess();
          setOpen(false);
          setV({ label: '', recipient: '', phone: '', zoneId: '', landmark: '', instructions: '' });
        },
        onError,
      },
    );
  };

  const field = (k: keyof typeof v) => ({
    value: v[k],
    error: errors[k],
    onChange: (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value })),
  });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl">Mes adresses</h1>
        <Button icon={<Plus className="size-4" />} disabled={full} onClick={() => setOpen(true)}>
          Ajouter
        </Button>
      </div>
      <p className="-mt-3 mb-4 text-sm text-ink-muted">
        {user.addresses.length} adresse{user.addresses.length > 1 ? 's' : ''} sur {max} possibles
        {full && ' : supprimez-en une pour en ajouter une autre'}.
      </p>
      {user.addresses.length === 0 && (
        <p className="card p-6 text-ink-soft">Aucune adresse enregistrée. Ajoutez-en une pour commander plus vite.</p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2">
        <AnimatePresence initial={false}>
          {user.addresses.map((a) => (
            <motion.li
              key={a.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="card p-5"
            >
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 font-bold">
                  <MapPin className="size-4 text-forest" /> {a.label}
                </p>
                {a.isDefault && <Badge tone="forest">Par défaut</Badge>}
              </div>
              <p className="mt-2 text-sm text-ink-soft">
                {a.recipient} · {a.phone}
                <br />
                {zones?.find((z) => z.id === a.zoneId)?.name}, {a.landmark}
              </p>
              <div className="mt-4 flex gap-2">
                {!a.isDefault && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Star className="size-4" />}
                    loading={actions.setDefault.isPending && actions.setDefault.variables === a.id}
                    onClick={() => actions.setDefault.mutate(a.id, feedback('Adresse par défaut mise à jour'))}
                  >
                    Par défaut
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2 className="size-4" />}
                  loading={actions.remove.isPending && actions.remove.variables === a.id}
                  onClick={() => actions.remove.mutate(a.id, feedback('Adresse supprimée'))}
                >
                  Supprimer
                </Button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle adresse">
        <form onSubmit={submit} noValidate className="space-y-4">
          <TextField label="Nom de l’adresse" placeholder="Maison, Bureau…" {...field('label')} />
          <TextField label="Destinataire" {...field('recipient')} />
          <TextField label="Téléphone" type="tel" {...field('phone')} />
          <SelectField label="Quartier" {...field('zoneId')}>
            <option value="">Choisissez un quartier</option>
            {zones?.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} ({z.city})
              </option>
            ))}
          </SelectField>
          <TextField label="Repère précis" {...field('landmark')} />
          <Button type="submit" className="w-full" loading={actions.add.isPending}>
            Enregistrer l’adresse
          </Button>
        </form>
      </Modal>
    </div>
  );
}
