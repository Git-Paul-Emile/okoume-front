import { AnimatePresence, motion } from 'motion/react';
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
      <FlyToCart />
      <CookieBanner />
      {/* Dans le routeur : les notifications peuvent contenir des liens */}
      <Toaster />
      <ScrollRestoration />
    </div>
  );
}
