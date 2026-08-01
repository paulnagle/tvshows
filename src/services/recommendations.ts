import type { Show, WatchedShow, CurrentShow } from '../types';
import { searchShows } from './omdb';

// ─── Tally genre frequency and return top N ───────────────────────────────────
export function getTopGenres(
  shows: Array<Pick<Show, 'genre'>>,
  topN = 3
): string[] {
  const freq: Record<string, number> = {};
  for (const show of shows) {
    for (const g of show.genre) {
      freq[g] = (freq[g] ?? 0) + 1;
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([genre]) => genre);
}

// ─── Fetch recommendations based on top genres ────────────────────────────────
export async function getRecommendations(
  topGenres: string[],
  excludeImdbIDs: string[]
): Promise<Show[]> {
  if (topGenres.length === 0) return [];

  const excludeSet = new Set(excludeImdbIDs);
  const seen = new Set<string>();
  const results: Show[] = [];

  await Promise.all(
    topGenres.map(async (genre) => {
      try {
        const shows = await searchShows(genre);
        for (const show of shows) {
          if (!excludeSet.has(show.imdbID) && !seen.has(show.imdbID)) {
            seen.add(show.imdbID);
            results.push(show);
          }
        }
      } catch {
        // silently skip a failed genre fetch
      }
    })
  );

  return results.slice(0, 20);
}
