import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Logo } from '@/components/ui/Logo';

/** Cadre des écrans de connexion du back-office. */
export function AdminAuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-ivory px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card overflow-hidden p-6 sm:p-8">{children}</div>
        <p className="mt-6 text-center text-sm text-ink-muted">
          <Link to="/" className="font-semibold text-forest hover:underline">
            Retour à la boutique
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
