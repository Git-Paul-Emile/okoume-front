/**
 * Versions d'une image adaptées à la taille d'écran (4.4). Les services d'images qui acceptent un paramètre
 * de largeur (ici Unsplash) reçoivent plusieurs tailles ; en production, le CDN de l'API génère ces versions
 * pour toutes les photos téléversées. Sinon, l'image d'origine est servie.
 */
export const WIDTHS = [320, 640, 960, 1400] as const;

export function imageSrcSet(src: string, widths: readonly number[] = WIDTHS): string | undefined {
  if (!src.startsWith('https://images.unsplash.com/')) return undefined;
  const url = new URL(src);
  return widths
    .map((w) => {
      url.searchParams.set('w', String(w));
      url.searchParams.set('auto', 'format');
      url.searchParams.set('fit', 'max');
      return `${url.toString()} ${w}w`;
    })
    .join(', ');
}

/** Attributs à poser sur une balise img : `sizes` décrit la largeur affichée selon l'écran. */
export const responsiveImage = (src: string, sizes: string) => {
  const srcSet = imageSrcSet(src);
  return srcSet ? { src, srcSet, sizes } : { src };
};
