import { Link } from 'react-router';
import { ServerPasswordReset } from '@/features/auth/components/ServerPasswordReset';

/**
 * Récupération du compte (19.1) par code envoyé à l'adresse e-mail.
 * La réponse est la même que le compte existe ou non, pour ne pas révéler les comptes.
 */
export default function ForgotPasswordPage() {
  return (
    <div className="container-page py-8 lg:py-12">
      <div className="card mx-auto max-w-lg p-6 sm:p-10">
        <h1 className="text-2xl sm:text-3xl">Mot de passe oublié</h1>
        <ServerPasswordReset />
        <p className="mt-6 text-center text-sm">
          <Link to="/connexion" className="font-semibold text-forest hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
