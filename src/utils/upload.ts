/**
 * Préparation des fichiers envoyés : vérification du type et de la taille, réduction des images.
 * Les images sont ensuite envoyées chez l'hébergeur, qui renvoie une URL publique.
 */

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_MB = 5;

export class UploadError extends Error {}

const mb = (bytes: number) => bytes / 1024 / 1024;

/** Image vérifiée puis réduite à `maxSize` px de côté, sur un canevas prêt à exporter. */
async function resizedCanvas(file: File, maxSize: number) {
  if (!IMAGE_TYPES.includes(file.type)) throw new UploadError('Format accepté : JPG, PNG ou WebP.');
  if (mb(file.size) > MAX_IMAGE_MB) throw new UploadError(`Image trop lourde : ${MAX_IMAGE_MB} Mo au maximum.`);
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

/** Même réduction, en fichier WebP à envoyer chez l'hébergeur d'images. */
export async function readImageBlob(file: File, maxSize = 1600): Promise<Blob> {
  const canvas = await resizedCanvas(file, maxSize);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new UploadError('Lecture de l’image impossible.'))),
      'image/webp',
      0.85,
    ),
  );
}

/** Envoi d'une image chez l'hébergeur ; renvoie son adresse publique HTTPS. */
export type ImageUploader = (image: Blob) => Promise<string>;

export interface UploadedDocument {
  name: string;
  size: number;
  type: string;
  url: string;
}

export const formatSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} Ko`
    : `${mb(bytes).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;
