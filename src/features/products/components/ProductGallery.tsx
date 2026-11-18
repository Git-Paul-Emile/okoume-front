import { AnimatePresence, motion } from 'motion/react';
import { ZoomIn } from 'lucide-react';
import { useState, type PointerEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/utils/text';
import { responsiveImage } from '@/utils/responsiveImage';

interface Props {
  images: string[];
  name: string;
  /** Image imposée par la variante sélectionnée. */
  activeImage?: string | null;
}

export function ProductGallery({ images, name, activeImage }: Props) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const current = activeImage && images.includes(activeImage) ? activeImage : (images[index] ?? images[0]);

  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 && (
        <ul className="flex gap-2 sm:flex-col" aria-label="Miniatures">
          {images.map((img, i) => (
            <li key={img}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Photo ${i + 1} sur ${images.length}`}
                aria-current={current === img}
                className={cn(
                  'relative size-16 overflow-hidden rounded-md border-2 bg-white p-1 transition sm:size-20',
                  current === img ? 'border-forest' : 'border-sage hover:border-sage-dark',
                )}
              >
                <img {...responsiveImage(img, '80px')} alt="" className="size-full object-contain" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative flex-1">
        <button
          type="button"
          className="relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-lg border border-sage bg-white"
          onPointerMove={onMove}
          onPointerLeave={() => setZoom(null)}
          onClick={() => setLightbox(true)}
          aria-label="Agrandir la photo"
        >
          <AnimatePresence mode="wait">
            {/* L'animation d'apparition est sur le conteneur : elle ne doit pas écraser la transformation du zoom */}
            <motion.div
              key={current}
              className="size-full"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <img
                {...responsiveImage(current, '(min-width: 1024px) 50vw, 100vw')}
                alt={name}
                draggable={false}
                className="size-full object-contain p-6 transition-transform duration-150 ease-out"
                style={{
                  transform: zoom ? 'scale(2.2)' : 'scale(1)',
                  transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : 'center',
                }}
              />
            </motion.div>
          </AnimatePresence>
          <span
            className={cn(
              'absolute right-3 bottom-3 flex items-center gap-1.5 rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-ink-soft shadow-sm transition-opacity',
              zoom && 'opacity-0',
            )}
          >
            <ZoomIn className="size-3.5" /> Survolez pour zoomer
          </span>
        </button>
      </div>
      <Modal open={lightbox} onClose={() => setLightbox(false)} title={name} className="max-w-3xl">
        <img
          {...responsiveImage(current, '(min-width: 768px) 768px, 100vw')}
          alt={name}
          className="mx-auto max-h-[70vh] object-contain"
        />
      </Modal>
    </div>
  );
}
