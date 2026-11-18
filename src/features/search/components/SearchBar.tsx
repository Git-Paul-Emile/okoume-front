import { AnimatePresence, motion } from 'motion/react';
import { Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useCategories } from '@/features/categories/categories.queries';
import { productSalePrice } from '@/features/products/products.utils';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/text';
import { useSearchSuggestions } from '../useSearchSuggestions';

export function SearchBar({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [category, setCategory] = useState(params.get('categorie') ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const navigate = useNavigate();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const { data: categories } = useCategories();
  const suggestions = useSearchSuggestions(query);

  useEffect(() => {
    const close = (e: MouseEvent) => !wrapRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const target = active >= 0 ? suggestions.products[active] : null;
    setOpen(false);
    if (target) return navigate(`/produit/${target.slug}`);
    const p = new URLSearchParams();
    if (query.trim()) p.set('q', query.trim());
    if (category) p.set('categorie', category);
    navigate(`/catalogue?${p.toString()}`);
  };

  const show = open && query.trim().length >= 2;

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <form
        onSubmit={submit}
        role="search"
        className="flex h-12 items-stretch overflow-hidden rounded-md border border-sage-dark bg-white transition focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/15"
      >
        <label htmlFor={`${listId}-input`} className="sr-only">
          Rechercher un produit
        </label>
        <input
          id={`${listId}-input`}
          type="search"
          value={query}
          autoFocus={autoFocus}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, suggestions.products.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, -1));
            } else if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Rechercher un produit, une marque…"
          className="min-w-0 flex-1 bg-transparent px-4 text-[15px] outline-none placeholder:text-ink-muted [&::-webkit-search-cancel-button]:hidden"
          role="combobox"
          aria-expanded={show}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="px-2 text-ink-muted hover:text-ink"
            aria-label="Effacer la recherche"
          >
            <X className="size-4" />
          </button>
        )}
        <label htmlFor={`${listId}-cat`} className="sr-only">
          Catégorie
        </label>
        <select
          id={`${listId}-cat`}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="hidden max-w-44 border-l border-sage bg-transparent px-3 text-sm text-ink-soft outline-none lg:block"
        >
          <option value="">Toutes catégories</option>
          {categories?.tree.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="grid w-13 place-items-center bg-forest text-white transition hover:bg-forest-dark"
          aria-label="Lancer la recherche"
        >
          <Search className="size-5" />
        </button>
      </form>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-lg border border-sage bg-white shadow-[var(--shadow-lift)]"
          >
            <ul id={listId} role="listbox" aria-label="Suggestions">
              {suggestions.products.map((p, i) => {
                const { price, original } = productSalePrice(p);
                return (
                  <li key={p.id} id={`${listId}-${i}`} role="option" aria-selected={active === i}>
                    <Link
                      to={`/produit/${p.slug}`}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-ivory',
                        active === i && 'bg-ivory',
                      )}
                    >
                      <img
                        src={p.thumbnail}
                        alt=""
                        width={44}
                        height={44}
                        className="size-11 shrink-0 rounded-md border border-sage bg-white object-contain p-1"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
                      <span className="text-right text-sm font-bold whitespace-nowrap text-ink">
                        {formatPrice(price)}
                        {original > price && (
                          <span className="block text-xs font-normal text-ink-muted line-through">
                            {formatPrice(original)}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {suggestions.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-sage px-4 py-3">
                {suggestions.categories.map((c) => (
                  <Link
                    key={c.id}
                    to={`/catalogue?categorie=${c.id}`}
                    onClick={() => setOpen(false)}
                    className="rounded-md bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest hover:bg-forest-100"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
            {suggestions.products.length === 0 && suggestions.query && (
              <p className="px-4 py-4 text-sm text-ink-soft">
                Aucun produit ne correspond à « {suggestions.query} ». Essayez un autre mot ou{' '}
                <Link to="/catalogue" className="font-semibold text-forest underline" onClick={() => setOpen(false)}>
                  parcourez le catalogue
                </Link>
                .
              </p>
            )}
            {suggestions.products.length > 0 && (
              <button
                type="button"
                onClick={() => submit()}
                className="w-full border-t border-sage px-4 py-3 text-left text-sm font-semibold text-forest hover:bg-ivory"
              >
                Voir tous les résultats pour « {suggestions.query} »
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
