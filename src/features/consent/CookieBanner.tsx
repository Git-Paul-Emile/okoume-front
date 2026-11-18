import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { CONSENT_MAX_AGE, useConsentStore } from '@/stores/consentStore';

/**
 * Bannière de consentement : « Tout refuser » et « Tout accepter » ont le même poids visuel,
 * comme l'exigent les bonnes pratiques (refuser doit être aussi simple qu'accepter).
 */
export function CookieBanner() {
  const { decidedAt, preferencesOpen, decide, openPreferences, closePreferences } = useConsentStore();
  const [now] = useState(() => Date.now());
  const mustAsk = !decidedAt || now - decidedAt > CONSENT_MAX_AGE;

  return (
    <>
      <AnimatePresence>
        {mustAsk && !preferencesOpen && (
          <motion.div
            role="region"
            aria-label="Cookies"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-xl border border-sage bg-white p-5 shadow-lift sm:inset-x-6 sm:bottom-6"
          >
            <p className="font-bold text-ink">Vos choix sur les cookies</p>
            <p className="mt-1.5 text-sm text-ink-soft">
              Nous utilisons des cookies nécessaires au panier et à votre compte. Avec votre accord, nous mesurons aussi
              l’audience du site pour l’améliorer. Aucun cookie publicitaire.{' '}
              <Link to="/legal/confidentialite" className="font-semibold text-forest hover:underline">
                En savoir plus
              </Link>
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => decide(false)}>
                Tout refuser
              </Button>
              <Button variant="outline" size="sm" onClick={() => decide(true)}>
                Tout accepter
              </Button>
              <button
                type="button"
                onClick={openPreferences}
                className="ml-auto px-2 text-sm font-semibold text-forest hover:underline"
              >
                Personnaliser
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {preferencesOpen && <Preferences onClose={closePreferences} onSave={decide} />}
    </>
  );
}

function Preferences({ onClose, onSave }: { onClose: () => void; onSave: (analytics: boolean) => void }) {
  const current = useConsentStore((s) => s.analytics);
  const [analytics, setAnalytics] = useState(current);
  return (
    <Modal
      open
      onClose={onClose}
      title="Gérer les cookies"
      description="Vous pouvez changer d’avis à tout moment depuis le pied de page."
    >
      <ul className="divide-y divide-sage">
        <li className="flex items-start justify-between gap-4 py-3">
          <span>
            <span className="block font-semibold">Nécessaires</span>
            <span className="block text-sm text-ink-soft">Panier, connexion, sécurité. Toujours actifs.</span>
          </span>
          <Switch checked onChange={() => undefined} label="Cookies nécessaires" disabled />
        </li>
        <li className="flex items-start justify-between gap-4 py-3">
          <span>
            <span className="block font-semibold">Mesure d’audience</span>
            <span className="block text-sm text-ink-soft">
              Pages vues et parcours, sans publicité ni revente des données.
            </span>
          </span>
          <Switch checked={analytics} onChange={setAnalytics} label="Mesure d’audience" />
        </li>
      </ul>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={() => onSave(false)}>
          Tout refuser
        </Button>
        <Button onClick={() => onSave(analytics)}>Enregistrer mes choix</Button>
      </div>
    </Modal>
  );
}
