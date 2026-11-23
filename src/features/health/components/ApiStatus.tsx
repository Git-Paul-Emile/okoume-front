import { AnimatePresence, motion } from 'motion/react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useApiHealth } from '../useApiHealth';

/** Bandeau de fonctionnement dégradé : hors ligne ou serveur indisponible. */
export function ApiStatus() {
  const online = useOnlineStatus();
  const { isError } = useApiHealth();
  const message = !online
    ? 'Votre connexion est interrompue. Rétablissez-la pour recharger les pages et passer une commande.'
    : isError
      ? 'Le service est momentanément indisponible. Nous réessayons automatiquement.'
      : null;

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden bg-mure text-white"
          role="status"
        >
          <p className="container-page flex items-center justify-center gap-2 py-2 text-center text-sm font-medium">
            <WifiOff className="size-4 shrink-0" />
            {message}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
