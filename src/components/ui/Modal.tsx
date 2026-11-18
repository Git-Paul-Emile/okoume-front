import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useId, useRef, type ReactNode } from 'react';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { cn } from '@/utils/text';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, description, children, className }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useLockBodyScroll(open);
  useDialogFocus(open, ref, onClose);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <motion.div
            className="absolute inset-0 bg-ink/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-title`}
            aria-describedby={description ? `${id}-description` : undefined}
            tabIndex={-1}
            className={cn(
              'relative max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-xl bg-white p-6 shadow-2xl outline-none',
              // Largeur par défaut, sauf si l'appelant en demande une autre
              !/(^|\s)max-w-/.test(className ?? '') && 'max-w-lg',
              className,
            )}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 grid size-9 place-items-center rounded-md hover:text-forest"
              aria-label="Fermer"
            >
              <X className="size-5" />
            </button>
            <h2 id={`${id}-title`} className="pr-10 text-xl">
              {title}
            </h2>
            {description && (
              <p id={`${id}-description`} className="mt-1.5 text-ink-soft">
                {description}
              </p>
            )}
            <div className="mt-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
