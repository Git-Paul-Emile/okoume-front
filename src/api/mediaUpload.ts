import { z } from 'zod';
import { ApiError } from './ApiError';

/** Autorisation signée par l'API : le fichier part directement chez l'hébergeur, avec ces champs. */
export const signedUploadDto = z.object({
  uploadUrl: z.string().url(),
  fields: z.record(z.string(), z.string()),
  expiresAt: z.string(),
});

export type SignedUpload = z.infer<typeof signedUploadDto>;

/** Formats et poids acceptés pour une photo, vérifiés avant l'envoi pour un message clair. */
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export function photoError(file: File): string | null {
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) return 'Formats acceptés : JPEG, PNG ou WebP.';
  if (file.size > MAX_PHOTO_BYTES) return 'Photo trop lourde : 8 Mo au maximum.';
  return null;
}

const hostedImage = z.object({ secure_url: z.string().url() });

/** Envoie une photo avec une autorisation signée ; renvoie son adresse publique chez l'hébergeur. */
export async function uploadPhoto(signed: SignedUpload, file: Blob): Promise<string> {
  const form = new FormData();
  for (const [key, value] of Object.entries(signed.fields)) form.append(key, value);
  form.append('file', file, file instanceof File ? file.name : 'image.webp');
  let response: Response;
  try {
    response = await fetch(signed.uploadUrl, { method: 'POST', body: form });
  } catch (error) {
    throw new ApiError('Réseau indisponible', 0, error);
  }
  if (!response.ok) throw new ApiError('La photo n’a pas pu être envoyée. Réessayez.', response.status);
  const parsed = hostedImage.safeParse(await response.json());
  if (!parsed.success) throw new ApiError('Réponse inattendue de l’hébergeur d’images.', 502);
  return parsed.data.secure_url;
}
