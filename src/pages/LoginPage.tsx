import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { AuthAside } from '@/features/auth/components/AuthAside';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';

export default function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.userId);
  const back = params.get('retour') ?? '/compte';
  if (userId) return <Navigate to={back} replace />;

  return (
    <div className="container-page py-8 lg:py-12">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
        <div className="card p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl">Connexion</h1>
          <p className="mt-1.5 mb-6 text-ink-soft">Accédez à vos commandes et à vos favoris.</p>
          <LoginForm
            onSuccess={() => {
              toast.success('Vous êtes connecté');
              navigate(back, { replace: true });
            }}
          />
          <p className="mt-4 rounded-md bg-ivory p-3 text-xs text-ink-muted">
            Compte de démonstration : voir le fichier README du projet.
          </p>
          <p className="mt-6 text-center text-sm text-ink-soft">
            Pas encore de compte ?{' '}
            <Link
              to={`/inscription${params.get('retour') ? `?retour=${encodeURIComponent(back)}` : ''}`}
              className="font-semibold text-forest hover:underline"
            >
              Créer un compte
            </Link>
          </p>
          <p className="mt-4 text-center text-sm text-ink-soft">
            Vous êtes vendeur ?{' '}
            <Link to="/connexion?retour=%2Fvendeur" className="font-semibold text-forest hover:underline">
              Accéder à mon espace vendeur
            </Link>
          </p>
        </div>
        <AuthAside />
      </div>
    </div>
  );
}
