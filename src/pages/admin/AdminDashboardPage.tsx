import { ArrowRight, BadgePercent, CreditCard, Package, ShoppingBag, Store } from 'lucide-react';
import { Link } from 'react-router';

const shortcuts = [
  { to: '/admin/commandes', title: 'Commandes', detail: 'Consulter et traiter les commandes.', icon: ShoppingBag },
  { to: '/admin/paiements', title: 'Paiements', detail: 'Consulter les paiements par commande.', icon: CreditCard },
  { to: '/admin/produits', title: 'Produits', detail: 'Gérer le catalogue et les stocks.', icon: Package },
  {
    to: '/admin/place-de-marche',
    title: 'Boutiques vendeurs',
    detail: 'Consulter et gérer les boutiques.',
    icon: Store,
  },
  {
    to: '/admin/promotions',
    title: 'Promotions',
    detail: 'Mettre à jour les offres du catalogue.',
    icon: BadgePercent,
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h2 className="text-2xl">Tableau de bord</h2>
        <p className="mt-1 text-ink-soft">Accès rapide aux fonctions principales de la boutique.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shortcuts.map(({ to, title, detail, icon: Icon }) => (
          <Link key={to} to={to} className="card group flex items-start gap-4 p-5 hover:border-forest">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-sage text-forest">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{title}</span>
              <span className="mt-1 block text-sm text-ink-soft">{detail}</span>
            </span>
            <ArrowRight
              className="mt-1 size-4 text-ink-muted transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
