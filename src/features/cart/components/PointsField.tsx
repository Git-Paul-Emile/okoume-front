import { Coins } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useCartStore } from '@/stores/cartStore';
import { formatPrice } from '@/utils/formatPrice';

interface Props {
  balance: number | null;
  pointValue: number;
  minRedeem: number;
  used: number;
  error: string | null;
}

export function PointsField({ balance, pointValue, minRedeem, used, error }: Props) {
  const requested = useCartStore((s) => s.pointsRequested);
  const setRequested = useCartStore((s) => s.setPointsRequested);
  const [value, setValue] = useState(requested ? String(requested) : '');

  if (balance === null)
    return (
      <p className="flex items-start gap-2 rounded-md bg-ivory p-3 text-sm text-ink-soft">
        <Coins className="mt-0.5 size-4 shrink-0 text-mure" />
        <span>
          <Link to="/connexion" className="font-semibold text-forest hover:underline">
            Connectez-vous
          </Link>{' '}
          pour utiliser vos points de fidélité.
        </span>
      </p>
    );

  if (balance < minRedeem)
    return (
      <p className="flex items-start gap-2 rounded-md bg-ivory p-3 text-sm text-ink-soft">
        <Coins className="mt-0.5 size-4 shrink-0 text-mure" />
        Solde : {balance} points. Utilisables à partir de {minRedeem} points.
      </p>
    );

  return (
    <div className="rounded-md bg-ivory p-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Coins className="size-4 text-mure" /> {balance} points disponibles ({formatPrice(balance * pointValue)})
      </p>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setRequested(Number(value) || 0);
        }}
      >
        <label htmlFor="points" className="sr-only">
          Nombre de points à utiliser
        </label>
        <input
          id="points"
          type="number"
          inputMode="numeric"
          min={0}
          max={balance}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`${minRedeem} minimum`}
          className="input h-10 flex-1 py-0 text-sm"
        />
        <button
          type="submit"
          className="rounded-md border border-sage-dark bg-white px-3 text-sm font-semibold hover:border-forest"
        >
          Utiliser
        </button>
        {requested > 0 && (
          <button
            type="button"
            onClick={() => {
              setRequested(0);
              setValue('');
            }}
            className="px-2 text-sm text-ink-muted hover:text-mure"
          >
            Retirer
          </button>
        )}
      </form>
      {error ? (
        <p className="mt-1.5 text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : (
        used > 0 && (
          <p className="mt-1.5 text-sm text-forest">
            {used} points appliqués (− {formatPrice(used * pointValue)}). Les points ne paient pas la livraison.
          </p>
        )
      )}
    </div>
  );
}
