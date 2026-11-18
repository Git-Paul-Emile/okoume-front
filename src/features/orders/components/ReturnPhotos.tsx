import { ImagePlus, X } from 'lucide-react';
import { useId, useRef, useState, type ChangeEvent } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { photoError, uploadPhoto, type SignedUpload } from '@/api/mediaUpload';
import { Button } from '@/components/ui/Button';
import { ordersBackend } from '../orders.backend';
import type { Order } from '../orders.types';

export const MAX_RETURN_PHOTOS = 6;

/**
 * Photos justificatives d'un retour (14.2), envoyées directement chez l'hébergeur avec une autorisation
 * signée par l'API. Seules leurs adresses sont jointes à la demande.
 */
export function ReturnPhotos({
  order,
  value,
  onChange,
  required,
  error,
}: {
  order: Order;
  value: string[];
  onChange: (urls: string[]) => void;
  required: boolean;
  error?: string;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const signature = useRef<SignedUpload | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState('');

  /** Une autorisation sert pour plusieurs photos tant qu'elle n'a pas expiré (marge d'une minute). */
  async function signed() {
    const current = signature.current;
    if (current && new Date(current.expiresAt).getTime() - Date.now() > 60_000) return current;
    signature.current = await ordersBackend.signEvidenceUpload(order);
    return signature.current;
  }

  async function add(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].slice(0, MAX_RETURN_PHOTOS - value.length);
    e.target.value = '';
    if (!files.length) return;
    const invalid = files.map(photoError).find(Boolean);
    if (invalid) return setUploadError(invalid);
    setUploadError('');
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const file of files) urls.push(await uploadPhoto(await signed(), file));
      onChange([...value, ...urls]);
    } catch (err) {
      setUploadError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const message = uploadError || error;

  return (
    <fieldset>
      <legend className="label">Photos du produit {required ? '(obligatoires)' : '(facultatives)'}</legend>
      <p className="mb-2 text-xs text-ink-muted">
        {MAX_RETURN_PHOTOS} photos au plus, JPEG, PNG ou WebP. Montrez le défaut et l’étiquette du produit.
      </p>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {value.map((url, i) => (
            <li key={url} className="relative">
              <img src={url} alt={`Photo ${i + 1}`} className="size-16 rounded-md border border-sage object-cover" />
              <button
                type="button"
                onClick={() => onChange(value.filter((u) => u !== url))}
                className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-ink text-white"
                aria-label={`Retirer la photo ${i + 1}`}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={input}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={add}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        icon={<ImagePlus className="size-4" />}
        loading={busy}
        loadingText="Envoi…"
        disabled={value.length >= MAX_RETURN_PHOTOS}
        onClick={() => input.current?.click()}
      >
        Ajouter des photos
      </Button>
      {message && (
        <p className="mt-1.5 text-sm font-medium text-danger" role="alert">
          {message}
        </p>
      )}
    </fieldset>
  );
}
