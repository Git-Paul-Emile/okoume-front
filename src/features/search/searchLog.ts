/** Recherche enregistrée de façon anonyme : terme, nombre de résultats, date. Aucune donnée personnelle (18.2). */
export interface SearchEntry {
  id: string;
  term: string;
  results: number;
  at: string;
}

export const normalizeTerm = (term: string) => term.trim().toLowerCase().replace(/\s+/g, ' ');

export interface SearchStat {
  term: string;
  count: number;
  /** Résultats lors de la dernière recherche. */
  results: number;
}

/** Termes les plus recherchés sur la période, avec ceux qui ne donnent aucun résultat. */
export function topSearches(entries: SearchEntry[], start: Date, end: Date, limit = 15): SearchStat[] {
  const map = new Map<string, SearchStat & { last: string }>();
  for (const e of entries) {
    const at = new Date(e.at);
    if (at < start || at > end) continue;
    const t = normalizeTerm(e.term);
    const current = map.get(t);
    if (!current) map.set(t, { term: t, count: 1, results: e.results, last: e.at });
    else {
      current.count += 1;
      if (e.at > current.last) Object.assign(current, { results: e.results, last: e.at });
    }
  }
  return [...map.values()]
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, limit)
    .map(({ term, count, results }) => ({ term, count, results }));
}
