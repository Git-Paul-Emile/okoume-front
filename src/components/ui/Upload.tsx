import { AnimatePresence, motion } from 'motion/react';
import { FileText, ImagePlus, Paperclip, X } from 'lucide-react';
import { useId, useState, type DragEvent, type ReactNode } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/utils/text';
import {
  formatSize,
  IMAGE_TYPES,
  MAX_IMAGE_MB,
  readImageBlob,
  type ImageUploader,
  UploadError,
  type UploadedDocument,
} from '@/utils/upload';

interface ShellProps {
  label: string;
  hint?: ReactNode;
  error: string;
  children: ReactNode;
  id: string;
}

function Shell({ label, hint, error, children, id }: ShellProps) {
  return (
    <div>
      <p className="label" id={`${id}-label`}>
        {label}
      </p>
      {children}
      {error ? (
        <p className="mt-1.5 text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-sm text-ink-muted">{hint}</p>
      )}
    </div>
  );
}

/** Zone de dépôt : clic ou glisser-déposer, accessible au clavier. */
function DropZone({
  id,
  accept,
  multiple,
  busy,
  onFiles,
  className,
  children,
}: {
  id: string;
  accept: string;
  multiple?: boolean;
  busy: boolean;
  onFiles: (files: File[]) => void;
  className?: string;
  children: ReactNode;
}) {
  const [over, setOver] = useState(false);
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const files = [...e.dataTransfer.files];
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };
  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors',
        over ? 'border-forest bg-forest-50' : 'border-sage-dark hover:border-forest',
        busy && 'pointer-events-none opacity-60',
        className,
      )}
    >
      <input
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
      {busy ? <Spinner className="size-6 text-forest" /> : children}
    </label>
  );
}

/** Image réduite puis envoyée chez l'hébergeur ; renvoie son adresse publique. */
async function prepareImage(file: File, maxSize: number | undefined, uploader: ImageUploader) {
  const blob = await readImageBlob(file, maxSize);
  try {
    return await uploader(blob);
  } catch (error) {
    throw new UploadError(error instanceof Error ? error.message : 'Envoi impossible, réessayez.');
  }
}

/** Envoi d'une image déjà réduite ; l'échec devient une erreur lisible sous le champ. */
async function uploadWith(uploader: ImageUploader, blob: Blob) {
  try {
    return await uploader(blob);
  } catch (error) {
    throw new UploadError(error instanceof Error ? error.message : 'Envoi impossible, réessayez.');
  }
}

function useUpload() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async <T,>(task: () => Promise<T>) => {
    setError('');
    setBusy(true);
    try {
      return await task();
    } catch (e) {
      setError(e instanceof UploadError ? e.message : 'Envoi impossible, réessayez.');
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { error, busy, run };
}

/** Croix de suppression posée sur un aperçu (sans fond derrière l'icône). */
function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="absolute top-1.5 right-1.5 grid size-8 place-items-center text-ink transition-colors [filter:drop-shadow(0_0_1.5px_#fff)_drop-shadow(0_0_3px_#fff)] hover:text-danger"
    >
      <X className="size-5" strokeWidth={2.75} />
    </button>
  );
}

const imageHint = `JPG, PNG ou WebP, ${MAX_IMAGE_MB} Mo au maximum.`;

/** Déplace un élément de la galerie (ordre d'affichage, image principale en premier). */
function move<T>(list: T[], from: number, to: number) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, item);
  return next;
}

interface ImageUploadProps {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  hint?: string;
  /** Proportions de l'aperçu, ex. « aspect-[3/1] ». */
  aspect?: string;
  maxSize?: number;
  fit?: 'cover' | 'contain';
  /** Envoi chez l'hébergeur d'images */
  uploader: ImageUploader;
}

/** Une image : zone d'envoi, puis aperçu avec croix de suppression. */
export function ImageUpload({
  label,
  value,
  onChange,
  hint,
  aspect = 'aspect-video',
  maxSize,
  fit = 'contain',
  uploader,
}: ImageUploadProps) {
  const id = useId();
  const { error, busy, run } = useUpload();
  const upload = async (files: File[]) => {
    const url = await run(() => prepareImage(files[0], maxSize, uploader));
    if (url) onChange(url);
  };

  return (
    <Shell id={id} label={label} hint={hint ?? imageHint} error={error}>
      <AnimatePresence mode="wait" initial={false}>
        {value ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={cn('relative overflow-hidden rounded-lg border border-sage bg-[#fbfaf6]', aspect)}
          >
            <img src={value} alt="" className={cn('size-full', fit === 'cover' ? 'object-cover' : 'object-contain')} />
            <RemoveButton onClick={() => onChange(null)} label={`Supprimer l’image : ${label}`} />
          </motion.div>
        ) : (
          <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DropZone id={id} accept={IMAGE_TYPES.join(',')} busy={busy} onFiles={upload} className={aspect}>
              <ImagePlus className="size-7 text-forest" aria-hidden="true" />
              <span className="font-semibold text-ink">Ajouter une image</span>
              <span className="text-ink-muted">Cliquez ou glissez un fichier ici</span>
            </DropZone>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  );
}

/** Plusieurs images (galerie produit) : la première sert de vignette. */
export function ImageGalleryUpload({
  label,
  value,
  onChange,
  max = 8,
  hint = `${imageHint} La première image est la photo principale ; « Avant » et « Après » changent l’ordre d’affichage.`,
  uploader,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  max?: number;
  hint?: string;
  uploader: ImageUploader;
}) {
  const id = useId();
  const { error, busy, run } = useUpload();
  const upload = async (files: File[]) => {
    const urls = await run(() =>
      Promise.all(files.slice(0, max - value.length).map((f) => prepareImage(f, undefined, uploader))),
    );
    if (urls) onChange([...value, ...urls]);
  };

  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        <AnimatePresence initial={false}>
          {value.map((src, i) => (
            <motion.li
              key={src.slice(-40) + i}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative aspect-square overflow-hidden rounded-lg border border-sage bg-[#fbfaf6]"
            >
              <img src={src} alt="" className="size-full object-contain p-1" />
              {i === 0 && max > 3 && (
                <span className="absolute top-1.5 left-1.5 rounded-sm bg-ink/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  Principale
                </span>
              )}
              {value.length > 1 && (
                <span className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => onChange(move(value, i, i - 1))}
                    aria-label={`Avancer l’image ${i + 1}`}
                    className="rounded-sm bg-white/90 px-1.5 text-[11px] font-semibold text-ink shadow-sm disabled:opacity-0"
                  >
                    Avant
                  </button>
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => onChange(move(value, i, 0))}
                      className="rounded-sm bg-white/90 px-1.5 text-[11px] font-semibold text-forest shadow-sm"
                    >
                      Principale
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={i === value.length - 1}
                    onClick={() => onChange(move(value, i, i + 1))}
                    aria-label={`Reculer l’image ${i + 1}`}
                    className="rounded-sm bg-white/90 px-1.5 text-[11px] font-semibold text-ink shadow-sm disabled:opacity-0"
                  >
                    Après
                  </button>
                </span>
              )}
              <RemoveButton
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                label={`Supprimer l’image ${i + 1}`}
              />
            </motion.li>
          ))}
        </AnimatePresence>
        {value.length < max && (
          <li>
            <DropZone
              id={id}
              accept={IMAGE_TYPES.join(',')}
              multiple
              busy={busy}
              onFiles={upload}
              className="aspect-square p-2"
            >
              <ImagePlus className="size-6 text-forest" aria-hidden="true" />
              <span className="text-xs font-semibold text-ink">Ajouter</span>
            </DropZone>
          </li>
        )}
      </ul>
    </Shell>
  );
}

/**
 * Photos jointes à un message, envoyées chez l'hébergeur : vignettes avec leur croix. Les PDF joints
 * auparavant restent affichés par leur nom.
 */
export function AttachmentsPicker({
  value,
  onChange,
  max = 3,
  uploader,
}: {
  value: UploadedDocument[];
  onChange: (value: UploadedDocument[]) => void;
  max?: number;
  /** Envoi chez l'hébergeur : seules les images sont acceptées */
  uploader: ImageUploader;
}) {
  const id = useId();
  const { error, busy, run } = useUpload();
  const upload = async (files: File[]) => {
    const docs = await run(() =>
      Promise.all(
        files.slice(0, max - value.length).map(async (f): Promise<UploadedDocument> => {
          const blob = await readImageBlob(f, 1400);
          return { name: f.name, size: blob.size, type: 'image/webp', url: await uploadWith(uploader, blob) };
        }),
      ),
    );
    if (docs) onChange([...value, ...docs]);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {value.map((doc, i) => (
          <div key={doc.url.slice(-30) + i} className="relative">
            {doc.type.startsWith('image/') ? (
              <img src={doc.url} alt={doc.name} className="size-16 rounded-md border border-sage object-cover" />
            ) : (
              <span className="flex h-16 max-w-[180px] items-center gap-2 rounded-md border border-sage px-3 pr-8 text-xs">
                <FileText className="size-5 shrink-0 text-forest" aria-hidden="true" />
                <span className="truncate">{doc.name}</span>
              </span>
            )}
            <RemoveButton onClick={() => onChange(value.filter((_, j) => j !== i))} label={`Retirer ${doc.name}`} />
          </div>
        ))}
        {value.length < max && (
          <label
            htmlFor={id}
            className="inline-flex h-10 cursor-pointer items-center gap-2 px-1 text-sm font-semibold text-forest hover:underline"
          >
            <input
              id={id}
              type="file"
              multiple
              accept={IMAGE_TYPES.join(',')}
              className="sr-only"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                e.target.value = '';
                if (files.length) void upload(files);
              }}
            />
            {busy ? <Spinner className="size-4" /> : <Paperclip className="size-4" aria-hidden="true" />}
            Joindre une photo
          </label>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-1 text-xs text-ink-muted">
          {max} photos au maximum, {MAX_IMAGE_MB} Mo chacune.
        </p>
      )}
    </div>
  );
}

/** Affichage des pièces jointes d'un message (lecture seule). */
/** Pièce jointe affichée : la taille est inconnue pour une image déjà hébergée, montrée en vignette. */
type ShownDocument = Omit<UploadedDocument, 'size'> & { size?: number };

export function AttachmentList({ items, tone = 'light' }: { items?: ShownDocument[]; tone?: 'light' | 'dark' }) {
  if (!items?.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {items.map((doc, i) => (
        <li key={doc.url.slice(-30) + i}>
          <a href={doc.url} download={doc.name} target="_blank" rel="noreferrer" title={doc.name}>
            {doc.type.startsWith('image/') ? (
              <img src={doc.url} alt={doc.name} className="size-20 rounded-md border border-white/40 object-cover" />
            ) : (
              <span
                className={cn(
                  'flex items-center gap-1.5 text-xs font-semibold underline',
                  tone === 'dark' ? 'text-white' : 'text-forest',
                )}
              >
                <FileText className="size-4" aria-hidden="true" />
                {doc.name}
                {doc.size !== undefined && ` (${formatSize(doc.size)})`}
              </span>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Petite photo (variante d'un produit) : vignette cliquable, croix pour la retirer. */
export function MiniImagePicker({
  value,
  onChange,
  label,
  uploader,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  label: string;
  uploader: ImageUploader;
}) {
  const id = useId();
  const { error, busy, run } = useUpload();
  return (
    <div className="relative size-12 shrink-0" title={error || undefined}>
      {value ? (
        <>
          <img src={value} alt="" className="size-12 rounded-md border border-sage bg-white object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`Retirer la photo : ${label}`}
            className="absolute -top-2 -right-2 grid size-6 place-items-center text-ink transition-colors [filter:drop-shadow(0_0_1.5px_#fff)_drop-shadow(0_0_3px_#fff)] hover:text-danger"
          >
            <X className="size-4" strokeWidth={2.75} />
          </button>
        </>
      ) : (
        <label
          htmlFor={id}
          className={cn(
            'grid size-12 cursor-pointer place-items-center rounded-md border-2 border-dashed text-forest',
            error ? 'border-danger' : 'border-sage-dark hover:border-forest',
          )}
          aria-label={`Ajouter une photo : ${label}`}
        >
          {busy ? <Spinner className="size-4" /> : <ImagePlus className="size-4" aria-hidden="true" />}
          <input
            id={id}
            type="file"
            accept={IMAGE_TYPES.join(',')}
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              const url = await run(() => prepareImage(f, 1000, uploader));
              if (url) onChange(url);
            }}
          />
        </label>
      )}
    </div>
  );
}
