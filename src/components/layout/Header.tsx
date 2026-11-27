import { AnimatePresence, motion, useAnimationControls } from 'motion/react';
import { Menu, Search, ShoppingBag, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Logo } from '@/components/ui/Logo';
import { useCurrentUser } from '@/features/auth/auth.queries';
import { SearchBar } from '@/features/search/components/SearchBar';
import { selectItemCount, useCartStore } from '@/stores/cartStore';
import { useUiStore } from '@/stores/uiStore';

function CartButton() {
  const count = useCartStore(selectItemCount);
  const pulse = useUiStore((s) => s.cartPulse);
  const setCartOpen = useUiStore((s) => s.setCartOpen);
  const controls = useAnimationControls();

  useEffect(() => {
    if (pulse) void controls.start({ scale: [1, 1.25, 0.95, 1], rotate: [0, -8, 6, 0], transition: { duration: 0.5 } });
  }, [pulse, controls]);

  return (
    <button
      type="button"
      id="cart-target"
      onClick={() => setCartOpen(true)}
      className="relative flex items-center gap-2.5 rounded-md p-2 text-ink transition hover:bg-sage"
      aria-label={`Ouvrir le panier, ${count} article${count > 1 ? 's' : ''}`}
    >
      <motion.span animate={controls} className="relative block">
        <ShoppingBag className="size-6" />
        <AnimatePresence>
          {count > 0 && (
            <motion.span
              key={count}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 600, damping: 18 }}
              className="absolute -top-2 -right-2.5 grid h-5 min-w-5 place-items-center rounded-full bg-mure px-1 text-[11px] font-bold text-white"
            >
              {count}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
      <span className="hidden text-left text-xs leading-tight lg:block">
        <span className="block text-ink-muted">Mon</span>
        <span className="font-bold">panier</span>
      </span>
    </button>
  );
}

export function Header() {
  const { user, isAuthenticated } = useCurrentUser();
  const setMobileMenuOpen = useUiStore((s) => s.setMobileMenuOpen);
  const location = useLocation();
  // La recherche mobile se referme d'elle-même au changement de page
  const [searchPath, setSearchPath] = useState<string | null>(null);
  const searchOpen = searchPath === location.pathname;

  return (
    <div className="bg-white">
      <div className="container-page flex h-[76px] items-center gap-3 lg:gap-8">
        <button
          type="button"
          className="-ml-2 rounded-md p-2 hover:bg-sage xl:hidden"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu className="size-6" />
        </button>
        <Link to="/" aria-label="Accueil" className="shrink-0">
          <span className="hidden sm:inline">
            <Logo />
          </span>
          <span className="sm:hidden">
            <Logo compact />
          </span>
        </Link>
        <SearchBar className="hidden flex-1 md:block" />
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <button
            type="button"
            className="rounded-md p-2 hover:bg-sage md:hidden"
            onClick={() => setSearchPath(searchOpen ? null : location.pathname)}
            aria-label="Rechercher"
            aria-expanded={searchOpen}
          >
            <Search className="size-6" />
          </button>
          <Link
            to={isAuthenticated ? '/compte' : '/connexion'}
            className="flex items-center gap-2.5 rounded-md p-2 transition hover:bg-sage"
          >
            <User className="size-6" />
            <span className="hidden text-xs leading-tight lg:block">
              <span className="block text-ink-muted">{isAuthenticated ? 'Bonjour' : 'Mon compte'}</span>
              <span className="font-bold">{isAuthenticated ? (user?.firstName ?? '…') : 'Se connecter'}</span>
            </span>
            <span className="sr-only lg:hidden">{isAuthenticated ? 'Mon compte' : 'Se connecter'}</span>
          </Link>
          <CartButton />
        </div>
      </div>
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden"
          >
            <div className="container-page pb-3">
              <SearchBar autoFocus />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
