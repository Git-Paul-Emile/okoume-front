import { ArrowRight, BadgeCheck, ClipboardList, PackagePlus, ShieldCheck, Store, Truck } from 'lucide-react';
import { Link } from 'react-router';
import { ButtonLink } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useCurrentUser } from '@/features/auth/auth.queries';
import { useAccessPlans, useSellerShop } from '@/features/seller/seller.queries';
import { formatPrice } from '@/utils/formatPrice';

const steps = [
  {
    icon: <Store className="size-6" />,
    title: 'Créez votre boutique',
    text: 'Inscrivez-vous, confirmez votre adresse e-mail et renseignez le nom, le contact et les informations de votre commerce.',
  },
  {
    icon: <PackagePlus className="size-6" />,
    title: 'Publiez vos produits',
    text: 'Ajoutez vos articles, leurs prix et leur stock. Les nouvelles fiches sont vérifiées avant leur publication sur la marketplace.',
  },
  {
    icon: <ClipboardList className="size-6" />,
    title: 'Traitez vos commandes',
    text: 'Suivez les commandes et préparez-les depuis votre espace vendeur. Vous choisissez les modes de remise proposés par la boutique.',
  },
];

export default function BecomeSellerPage() {
  const { isAuthenticated } = useCurrentUser();
  const { data: shop } = useSellerShop();
  const { data: plans = [], isLoading: plansLoading } = useAccessPlans();
  const destination = isAuthenticated ? '/vendeur' : '/inscription?retour=%2Fvendeur';
  const ctaLabel = shop ? 'Accéder à mon espace vendeur' : 'Créer ma boutique';

  return (
    <div className="container-page space-y-12 py-6 lg:space-y-16 lg:py-10">
      <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Devenir vendeur' }]} />

      <section className="grid overflow-hidden rounded-2xl bg-forest text-white lg:grid-cols-[minmax(0,1fr)_0.85fr]">
        <div className="p-7 sm:p-10 lg:p-14">
          <p className="text-sm font-semibold text-forest-100">Vous êtes commerçant ?</p>
          <h1 className="mt-2 max-w-2xl text-3xl leading-tight font-bold sm:text-4xl lg:text-5xl">
            Développez votre activité avec OKOUMÉ
          </h1>
          <p className="mt-5 max-w-xl text-white/85 sm:text-lg">
            Rejoignez notre marketplace, créez votre boutique en ligne et proposez vos produits à de nouveaux clients.
          </p>
          <ButtonLink to={destination} variant="light" size="lg" className="mt-7" icon={<ArrowRight className="size-5" />}>
            {ctaLabel}
          </ButtonLink>
          <p className="mt-3 text-sm text-white/75">Inscrivez-vous et commencez à vendre sur OKOUMÉ.</p>
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
          <div className="relative w-full max-w-sm rounded-2xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-sm">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-white text-forest"><Store className="size-6" /></span>
              <div><p className="font-bold">Ma boutique</p><p className="text-xs text-white/70">Votre espace vendeur</p></div>
              <BadgeCheck className="ml-auto size-5 text-forest-100" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/10 p-4"><PackagePlus className="mb-3 size-5" /><p className="text-xs text-white/70">Produits</p><p className="font-semibold">À publier</p></div>
              <div className="rounded-xl bg-white/10 p-4"><ClipboardList className="mb-3 size-5" /><p className="text-xs text-white/70">Commandes</p><p className="font-semibold">À traiter</p></div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-white p-3 text-sm font-semibold text-forest"><Truck className="size-4" /> Préparez votre prochaine commande</div>
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-forest">Vendre sur la marketplace</p>
          <h2 className="mt-1 text-2xl sm:text-3xl">Une boutique à votre image, des outils pour la gérer</h2>
        </div>
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

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="card p-6 sm:p-8">
          <div className="flex items-center gap-3"><Truck className="size-6 text-forest" /><h2 className="text-xl">Livraisons et commandes</h2></div>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Gérez la préparation dans votre espace vendeur. Selon les options configurées pour votre boutique, vos clients
            peuvent retirer leur commande, recevoir une livraison par vos soins ou choisir une livraison effectuée par
            les livreurs OKOUMÉ. Les commandes de plusieurs boutiques sont traitées séparément.
          </p>
        </article>
        <article className="card p-6 sm:p-8">
          <div className="flex items-center gap-3"><ShieldCheck className="size-6 text-forest" /><h2 className="text-xl">Commissions et encaissements</h2></div>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Pour une commande encaissée par un livreur OKOUMÉ, le reversement vendeur est calculé sur le montant des
            produits, hors livraison, après déduction de la commission définie par la marketplace. Le taux applicable
            est défini par OKOUMÉ. Contactez l’équipe pour connaître le taux en vigueur avant de lancer votre boutique.
            Si vous livrez vous-même, l’encaissement se fait directement entre vous et l’acheteur.
          </p>
          <Link to="/contact" className="mt-3 inline-block text-sm font-semibold text-forest hover:underline">
            Contacter l’équipe OKOUMÉ
          </Link>
        </article>
      </section>

      <section className="card p-6 sm:p-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-forest">Conditions pour démarrer</p>
          <h2 className="mt-1 text-2xl">Ce qu’il vous faut</h2>
        </div>
        <ul className="mt-5 grid gap-3 text-sm text-ink-soft sm:grid-cols-2">
          <li className="flex gap-2"><BadgeCheck className="size-5 shrink-0 text-forest" />Un compte OKOUMÉ avec une adresse e-mail confirmée.</li>
          <li className="flex gap-2"><BadgeCheck className="size-5 shrink-0 text-forest" />Un numéro de téléphone valide et les coordonnées de votre boutique.</li>
          <li className="flex gap-2"><BadgeCheck className="size-5 shrink-0 text-forest" />Des informations et des produits exacts, conformes aux règles de la marketplace.</li>
          <li className="flex gap-2"><BadgeCheck className="size-5 shrink-0 text-forest" />Une offre d’accès choisie lors de l’ouverture. La vérification du téléphone est actuellement simulée, sans SMS.</li>
        </ul>
      </section>

      {!plansLoading && plans.length > 0 && (
        <section>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-forest">Offres boutique</p>
            <h2 className="mt-1 text-2xl">Choisissez votre accès</h2>
            <p className="mt-2 text-sm text-ink-soft">Les tarifs et durées ci-dessous sont les offres actuellement proposées sur OKOUMÉ.</p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.id} className="card p-5">
                <h3 className="font-bold">{plan.name}</h3>
                <p className="mt-2 text-2xl font-bold text-forest">{plan.kind === 'free' ? 'Gratuit' : formatPrice(plan.price)}</p>
                {plan.kind === 'paid' && plan.periodDays && <p className="text-xs text-ink-muted">pour {plan.periodDays} jours</p>}
                {plan.trialDays > 0 && <p className="mt-1 text-xs font-semibold text-forest">Essai de {plan.trialDays} jours</p>}
                {plan.description && <p className="mt-3 text-sm text-ink-soft">{plan.description}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl bg-ivory px-6 py-10 text-center sm:px-10">
        <p className="text-sm font-semibold text-forest">Prêt à rejoindre OKOUMÉ ?</p>
        <h2 className="mt-2 text-2xl sm:text-3xl">Créez votre boutique et commencez à proposer vos produits</h2>
        <ButtonLink to={destination} size="lg" className="mt-5" icon={<ArrowRight className="size-5" />}>
          {ctaLabel}
        </ButtonLink>
        <p className="mt-3 text-xs text-ink-muted">Une boutique par compte vendeur. L’adresse e-mail doit être confirmée.</p>
      </section>
    </div>
  );
}
