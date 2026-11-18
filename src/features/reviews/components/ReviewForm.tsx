import { Star } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { reviewPhotoUploader } from '../reviews.backend';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextAreaField } from '@/components/ui/TextField';
import { ImageGalleryUpload } from '@/components/ui/Upload';
import { toast } from '@/stores/toastStore';
import { cn } from '@/utils/text';
import { useSaveReview } from '../reviews.queries';
import type { Review } from '../reviews.types';

const LABELS = ['', 'Très déçu', 'Déçu', 'Correct', 'Satisfait', 'Très satisfait'];

/** Dépôt ou modification d'un avis : note, commentaire et jusqu'à 3 photos. Publication après modération. */
export function ReviewForm({
  productId,
  productName,
  existing,
  onClose,
}: {
  productId: string;
  productName: string;
  existing: Review | null;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [photos, setPhotos] = useState<string[]>(existing?.photos ?? []);
  const [error, setError] = useState('');
  const save = useSaveReview();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!rating) return setError('Choisissez une note de 1 à 5 étoiles.');
    if (comment.trim().length < 10)
      return setError('Décrivez votre expérience en quelques mots (10 caractères minimum).');
    setError('');
    save.mutate(
      {
        productId,
        rating,
        comment: comment.trim(),
        photos,
      },
      {
        onSuccess: () => {
          toast.success(existing ? 'Avis modifié' : 'Merci pour votre avis', {
            description: 'Il sera publié après vérification par notre équipe.',
          });
          onClose();
        },
        onError: (err) => setError(getErrorMessage(err)),
      },
    );
  };

  const shown = hover || rating;

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? 'Modifier mon avis' : 'Donner mon avis'}
      description={productName}
      className="max-w-xl"
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <div>
          <p className="label">Votre note</p>
          <div
            className="flex items-center gap-1"
            role="radiogroup"
            aria-label="Note sur 5"
            onMouseLeave={() => setHover(0)}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} sur 5 : ${LABELS[n]}`}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  className={cn('size-8', shown >= n ? 'text-gold' : 'text-sage-dark')}
                  fill="currentColor"
                  strokeWidth={0}
                />
              </button>
            ))}
            <span className="ml-2 text-sm font-semibold text-ink-soft">{LABELS[shown]}</span>
          </div>
        </div>
        <TextAreaField
          label="Votre avis"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          hint="Qualité, taille, livraison… N’indiquez ni numéro de téléphone ni adresse."
        />
        <ImageGalleryUpload
          label="Photos (facultatif)"
          value={photos}
          onChange={setPhotos}
          max={3}
          uploader={reviewPhotoUploader}
          hint="Jusqu’à 3 photos du produit reçu : JPG, PNG ou WebP, 5 Mo au maximum."
        />
        {error && (
          <p className="text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={save.isPending}>
            {existing ? 'Enregistrer' : 'Publier mon avis'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
