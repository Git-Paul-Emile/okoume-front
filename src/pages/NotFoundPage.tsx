import { motion } from 'motion/react';
import { ButtonLink } from '@/components/ui/Button';
import { SearchBar } from '@/features/search/components/SearchBar';

export default function NotFoundPage() {
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-12 text-center">
      <div className="max-w-md">
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          className="text-8xl font-extrabold text-forest"
        >
          404
        </motion.p>
        <h1 className="mt-2 text-2xl">Cette page n’existe pas</h1>
        <p className="mt-2 text-ink-soft">
          Le lien est peut-être incorrect ou la page a été déplacée. Cherchez un produit ou revenez à l’accueil.
        </p>
        <SearchBar className="mt-6 text-left" />
        <ButtonLink to="/" className="mt-5">
          Retour à l’accueil
        </ButtonLink>
      </div>
    </div>
  );
}
