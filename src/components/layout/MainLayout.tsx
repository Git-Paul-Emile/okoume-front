import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { ScrollRestoration, useLocation, useOutlet } from 'react-router';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Toaster } from '@/components/feedback/Toaster';
import { CartDrawer } from '@/features/cart/components/CartDrawer';
import { CookieBanner } from '@/features/consent/CookieBanner';
import { FlyToCart } from '@/features/cart/components/FlyToCart';
import { ApiStatus } from '@/features/health/components/ApiStatus';
import { pageTransition } from '@/lib/motion';
import { Footer } from './Footer';
import { Header } from './Header';
import { MainNav } from './MainNav';
import { MobileMenu } from './MobileMenu';
import { TopBar } from './TopBar';

/** Fige la page sortante pendant son animation de sortie. */
function FrozenOutlet() {
  const outlet = useOutlet();
  const [frozen] = useState(outlet);
  return frozen;
}

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > 360);
    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Remonter en haut de la page"
      className="fixed right-4 bottom-24 z-50 grid size-11 place-items-center rounded-full bg-forest text-white transition hover:-translate-y-1 hover:bg-forest-dark sm:bottom-6"
    >
      <ArrowUp className="size-5" aria-hidden="true" />
    </button>
  );
}

export function MainLayout() {
  const location = useLocation();

  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-[80] rounded-md bg-forest px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Aller au contenu
      </a>
      <ApiStatus />
      <TopBar />
      <header className="sticky top-0 z-30 shadow-[0_1px_0_var(--color-sage)]">
        <Header />
        <MainNav />
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname} variants={pageTransition} initial="initial" animate="enter" exit="exit">
            <Suspense fallback={<PageLoader />}>
              <FrozenOutlet />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <CartDrawer />
      <MobileMenu />
      <ScrollToTopButton />
      <FlyToCart />
      <CookieBanner />
      {/* Dans le routeur : les notifications peuvent contenir des liens */}
      <Toaster />
      <ScrollRestoration />
    </div>
  );
}
