import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { cn } from '@/utils/text';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: 'right' | 'left';
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Drawer({ open, onClose, title, side = 'right', children, footer, className }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useLockBodyScroll(open);
  useDialogFocus(open, panelRef, onClose, 'container');

  const offset = side === 'right' ? '100%' : '-100%';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className={cn(
              'absolute top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl outline-none',
              side === 'right' ? 'right-0' : 'left-0',
              className,
            )}
            initial={{ x: offset }}
            animate={{ x: 0 }}
            exit={{ x: offset }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <div className="flex items-center justify-between border-b border-sage px-5 py-4">
              <h2 className="text-lg">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="grid size-10 place-items-center rounded-md hover:text-forest"
                aria-label="Fermer"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
            {footer && <div className="border-t border-sage p-5">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
