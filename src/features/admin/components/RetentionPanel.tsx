import { RETENTION_RULES, type RetentionCategory } from '@/features/privacy/retention';

/** Ce que l'API applique réellement aujourd'hui, règle par règle : rien n'est annoncé qui ne soit fait. */
const SERVER_STATE: Record<RetentionCategory, string> = {
  inactiveAccounts: 'Anonymisation automatique chaque nuit',
  accounting: 'Archivés, jamais supprimés depuis l’administration',
  abandonedCarts: 'Appliqué dans le navigateur',
  browsing: 'Pas encore automatisé sur l’API',
  connectionLogs: 'Pas encore automatisé sur l’API',
  customerService: 'Pas encore automatisé sur l’API',
};

/**
 * Durées de conservation (19.5), en lecture seule : elles ne se règlent pas depuis l'administration.
 * Le traitement planifié de l'API supprime ou anonymise les données échues.
 */
export function RetentionPanel() {
  return (
    <section className="mt-8">
      <h2 className="text-lg">Durées de conservation</h2>
      <p className="mt-1 mb-3 text-sm text-ink-soft">
        Durées fixes, non modifiables. Chaque nuit, l’API anonymise les comptes sans connexion ni commande depuis 3 ans.
      </p>
      <ul className="divide-y divide-sage rounded-xl border border-sage bg-white text-sm">
        {RETENTION_RULES.map((r) => (
          <li key={r.category} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
            <span className="min-w-0">
              <span className="block font-semibold">
                {r.label} : {r.duration}
              </span>
              <span className="block text-ink-soft">{r.outcome}</span>
            </span>
            <span className="shrink-0 text-xs text-ink-muted">{SERVER_STATE[r.category]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
