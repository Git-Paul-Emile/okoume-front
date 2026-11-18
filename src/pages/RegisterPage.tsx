import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { AuthAside } from '@/features/auth/components/AuthAside';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';

export default function RegisterPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.userId);
  const back = params.get('retour') ?? '/compte';
  if (userId) return <Navigate to={back} replace />;

  return (
    <div className="container-page py-8 lg:py-12">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
        <div className="card p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl">Créer un compte</h1>
          <p className="mt-1.5 mb-6 text-ink-soft">
            Quelques informations suffisent. Vous pourrez ajouter vos adresses plus tard.
          </p>
          <RegisterForm
            onSuccess={() => {
              toast.success('Compte créé', {
                description: 'Bienvenue ! Vous pouvez maintenant commander et cumuler des points.',
              });
              navigate(back, { replace: true });
            }}
          />
          <p className="mt-6 text-center text-sm text-ink-soft">
            Déjà inscrit ?{' '}
            <Link to="/connexion" className="font-semibold text-forest hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
        <AuthAside />
      </div>
    </div>
  );
}
