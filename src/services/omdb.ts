import type { Show } from '../types';
import { getOmdbApiKey } from './omdbApiKey';

const BASE_URL = 'http://www.omdbapi.com/';

// ─── OMDb response types ──────────────────────────────────────────────────────

interface OmdbSearchItem {
  imdbID: string;
  Title: string;
  Year: string;
  Poster: string;
}

interface OmdbSearchResponse {
  Search?: OmdbSearchItem[];
  Response: 'True' | 'False';
  Error?: string;
}

interface OmdbDetailResponse {
  imdbID: string;
  Title: string;
  Year: string;
  Poster: string;
  Genre: string;
  imdbRating: string;
  totalSeasons: string;
  Plot: string;
  Actors: string;
  Response: 'True' | 'False';
  Error?: string;
}

interface OmdbSeasonResponse {
  Episodes?: Array<{ Episode: string }>;
  Response: 'True' | 'False';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function omdbFetch(params: Record<string, string>): Promise<Response> {
  const apiKey = await getOmdbApiKey();
  const query = new URLSearchParams({ ...params, apikey: apiKey });
  const res = await fetch(`${BASE_URL}?${query}`);
  if (!res.ok) throw new Error(`OMDb error: ${res.status}`);
  return res;
}

function mapOmdbShow(detail: OmdbDetailResponse): Show {
  const genres = detail.Genre && detail.Genre !== 'N/A'
    ? detail.Genre.split(', ').map((g) => g.trim())
    : [];

  return {
    imdbID: detail.imdbID,
    title: detail.Title,
    year: detail.Year ? detail.Year.slice(0, 4) : 'N/A',
    poster: detail.Poster !== 'N/A' ? detail.Poster : '',
    genre: genres,
    imdbRating: detail.imdbRating !== 'N/A' ? detail.imdbRating : 'N/A',
    totalSeasons: detail.totalSeasons !== 'N/A' ? detail.totalSeasons : 'N/A',
    plot: detail.Plot !== 'N/A' ? detail.Plot : undefined,
    actors: detail.Actors !== 'N/A' ? detail.Actors : undefined,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function searchShows(query: string): Promise<Show[]> {
  if (!query.trim()) return [];

  const res = await omdbFetch({ s: query, type: 'series' });
  const data: OmdbSearchResponse = await res.json();

  if (data.Response === 'False' || !data.Search) return [];

  // OMDb search results lack rating/plot/actors — fetch detail for each (cap at 10)
  const top10 = data.Search.slice(0, 10);
  const shows = await Promise.all(
    top10.map(async (item) => {
      try {
        return await getShowDetails(item.imdbID);
      } catch {
        return null;
      }
    })
  );

  return shows.filter((s): s is Show => s !== null);
}

export async function getShowDetails(imdbID: string): Promise<Show> {
  const res = await omdbFetch({ i: imdbID, type: 'series', plot: 'full' });
  const data: OmdbDetailResponse = await res.json();

  if (data.Response === 'False') {
    throw new Error(data.Error ?? 'Show not found');
  }

  return mapOmdbShow(data);
}

export async function getSeasonEpisodeCounts(
  imdbID: string,
  totalSeasons: number
): Promise<number[]> {
  const counts = await Promise.all(
    Array.from({ length: totalSeasons }, async (_, i) => {
      const season = String(i + 1);
      try {
        const res = await omdbFetch({ i: imdbID, Season: season });
        const data: OmdbSeasonResponse = await res.json();
        return data.Response === 'True' && data.Episodes ? data.Episodes.length : 0;
      } catch {
        return 0;
      }
    })
  );
  return counts;
}
