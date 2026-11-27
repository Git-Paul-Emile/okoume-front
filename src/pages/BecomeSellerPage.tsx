import { ArrowRight, BadgeCheck, ClipboardList, PackagePlus, Store, Truck } from 'lucide-react';
import { Link } from 'react-router';
import { ButtonLink } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useCurrentUser } from '@/features/auth/auth.queries';
import { useSellerShop } from '@/features/seller/seller.queries';

const steps = [
  {
    icon: <Store className="size-6" />,
    title: 'Créez votre boutique',
    text: 'Renseignez le nom et les coordonnées de votre commerce pour créer votre boutique.',
  },
  {
    icon: <PackagePlus className="size-6" />,
    title: 'Ajoutez vos produits',
    text: 'Saisissez vos produits, leurs prix et leurs stocks. OKOZA les vérifie avant publication.',
  },
  {
    icon: <ClipboardList className="size-6" />,
    title: 'Gérez vos commandes',
    text: 'Suivez les commandes reçues, préparez-les et confirmez leur remise ou leur livraison.',
  },
];

export default function BecomeSellerPage() {
  const { isAuthenticated } = useCurrentUser();
  const { data: shop } = useSellerShop();
  const destination = isAuthenticated ? '/vendeur' : '/inscription?retour=%2Fvendeur';
  const ctaLabel = shop ? 'Accéder à mon espace vendeur' : 'Créer ma boutique';

  return (
    <div className="container-page space-y-12 py-6 lg:py-10">
      <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Devenir vendeur' }]} />

      <section className="grid overflow-hidden rounded-2xl bg-forest text-white lg:grid-cols-[minmax(0,1fr)_0.85fr]">
        <div className="p-7 sm:p-10 lg:p-14">
          <p className="text-sm font-semibold text-forest-100">Vous êtes commerçant ?</p>
          <h1 className="mt-2 max-w-2xl text-3xl leading-tight font-bold sm:text-4xl">
            Ouvrez votre boutique sur OKOZA
          </h1>
          <p className="mt-5 max-w-xl text-white/85 sm:text-lg">
            Présentez vos produits, recevez les commandes et suivez leur livraison depuis votre espace vendeur.
          </p>
          <ButtonLink to={destination} variant="light" size="lg" className="mt-7" icon={<ArrowRight className="size-5" />}>
            {ctaLabel}
          </ButtonLink>
          {!isAuthenticated && (
            <p className="mt-5 text-sm text-white/80">
              Déjà vendeur ?{' '}
              <Link to="/connexion?retour=%2Fvendeur" className="font-semibold text-white underline underline-offset-4">
                Accéder à mon espace vendeur
              </Link>
            </p>
          )}
        </div>
        <div className="hidden min-h-80 items-center justify-center bg-forest-dark p-8 lg:flex" aria-hidden="true">
          <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-white/10 p-5">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-white text-forest"><Store className="size-6" /></span>
              <div><p className="font-bold">Ma boutique</p><p className="text-xs text-white/70">Votre espace vendeur</p></div>
              <BadgeCheck className="ml-auto size-5 text-forest-100" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/10 p-4"><PackagePlus className="mb-3 size-5" /><p className="text-xs text-white/70">Produits</p><p className="font-semibold">À publier</p></div>
              <div className="rounded-xl bg-white/10 p-4"><ClipboardList className="mb-3 size-5" /><p className="text-xs text-white/70">Commandes</p><p className="font-semibold">À traiter</p></div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-white p-3 text-sm font-semibold text-forest"><Truck className="size-4" /> Suivez vos livraisons</div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl sm:text-3xl">Les étapes pour vendre</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.title} className="card p-5">
              <span className="grid size-11 place-items-center rounded-lg bg-forest-50 text-forest">{step.icon}</span>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-ink-muted">Étape {index + 1}</p>
              <h3 className="mt-1 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card p-6 sm:p-8">
        <div className="flex items-center gap-3"><Truck className="size-6 text-forest" /><h2 className="text-xl">Livraisons</h2></div>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Choisissez depuis votre espace si les commandes sont livrées par OKOZA ou par votre boutique. Vous pouvez
          modifier les frais de livraison lorsque vous organisez vous-même la course.
        </p>
      </section>

      <section className="rounded-xl bg-ivory px-6 py-10 text-center sm:px-10">
        <p className="text-sm font-semibold text-forest">Prêt à rejoindre OKOZA ?</p>
        <h2 className="mt-2 text-2xl sm:text-3xl">Créez votre boutique et proposez vos produits</h2>
        <ButtonLink to={destination} size="lg" className="mt-5" icon={<ArrowRight className="size-5" />}>
          {ctaLabel}
        </ButtonLink>
        <p className="mt-3 text-xs text-ink-muted">Une boutique par compte vendeur.</p>
      </section>
    </div>
  );
}
