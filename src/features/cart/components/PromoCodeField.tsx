import { AnimatePresence, motion } from 'motion/react';
import { Tag, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { useCartStore } from '@/stores/cartStore';

export function PromoCodeField({
  error,
  loading,
  applied,
}: {
  error: string | null;
  loading: boolean;
  applied: boolean;
}) {
  const promoCode = useCartStore((s) => s.promoCode);
  const setPromoCode = useCartStore((s) => s.setPromoCode);
  const [value, setValue] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) setPromoCode(value.trim().toUpperCase());
  };

  if (promoCode)
    return (
      <div>
        <div className="flex items-center justify-between rounded-md border border-dashed border-forest bg-forest-50 px-3 py-2">
          <span className="flex items-center gap-2 text-sm font-bold text-forest">
            <Tag className="size-4" /> {promoCode}
          </span>
          <button
            type="button"
            onClick={() => setPromoCode(null)}
            className="rounded-md p-1 text-ink-muted hover:text-mure"
            aria-label="Retirer le code promo"
          >
            <X className="size-4" />
          </button>
        </div>
        <AnimatePresence>
          {error ? (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-1.5 text-sm font-medium text-danger"
              role="alert"
            >
              {error}
            </motion.p>
          ) : (
            applied &&
            !loading && (
              <p className="mt-1.5 text-sm font-medium text-forest">
                Code appliqué. Un seul code est utilisable par commande.
              </p>
            )
          )}
        </AnimatePresence>
      </div>
    );

  return (
    <form onSubmit={submit} className="flex gap-2">
      <label htmlFor="promo" className="sr-only">
        Code promotionnel
      </label>
      <input
        id="promo"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Code promo"
        className="input h-11 flex-1 py-0 uppercase placeholder:normal-case"
        autoComplete="off"
      />
      <Button type="submit" variant="outline" loading={loading}>
        Appliquer
      </Button>
    </form>
  );
}
