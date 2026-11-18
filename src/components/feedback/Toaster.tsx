import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { Link } from 'react-router';
import { useToastStore, type ToastTone } from '@/stores/toastStore';
import { cn } from '@/utils/text';

const icons: Record<ToastTone, typeof Info> = { success: CheckCircle2, error: XCircle, info: Info };
const colors: Record<ToastTone, string> = { success: 'text-forest', error: 'text-danger', info: 'text-mure' };

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:right-4 sm:left-auto sm:items-end"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = icons[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-sage bg-white p-4 shadow-[var(--shadow-lift)]"
              role={t.tone === 'error' ? 'alert' : 'status'}
            >
              {t.icon !== false && <Icon className={cn('mt-0.5 size-5 shrink-0', colors[t.tone])} />}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{t.title}</p>
                {t.description && <p className="mt-0.5 text-sm text-ink-soft">{t.description}</p>}
                {t.action && (
                  <Link
                    to={t.action.href}
                    onClick={() => dismiss(t.id)}
                    className="mt-1.5 inline-block text-sm font-semibold text-forest underline-offset-2 hover:underline"
                  >
                    {t.action.label}
                  </Link>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="text-ink-muted hover:text-ink"
                aria-label="Fermer la notification"
              >
                <X className="size-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
