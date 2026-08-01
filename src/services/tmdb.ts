import type { Show } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? '';
const BASE_URL = 'https://api.themoviedb.org/3';

// ─── Genre pills shown on the For You screen ─────────────────────────────────
export const OMDB_TOP_GENRES = [
  'Drama',
  'Comedy',
  'Crime',
  'Action',
  'Sci-Fi',
  'Mystery',
  'Documentary',
  'Animation',
  'Reality',
  'War & Politics',
];

// TMDB TV genre IDs — from https://api.themoviedb.org/3/genre/tv/list
const GENRE_IDS: Record<string, number> = {
  Drama:            18,
  Comedy:           35,
  Crime:            80,
  Action:           10759, // "Action & Adventure"
  'Sci-Fi':         10765, // "Sci-Fi & Fantasy"
  Mystery:          9648,
  Documentary:      99,
  Animation:        16,
  Reality:          10764,
  'War & Politics': 10768,
};

// ─── TMDB response types ──────────────────────────────────────────────────────
interface TmdbShow {
  id: number;
  name: string;
  first_air_date: string;
  poster_path: string | null;
  genre_ids: number[];
  vote_average: number;
  overview: string;
}

interface TmdbDiscoverResponse {
  results: TmdbShow[];
}

interface TmdbExternalIds {
  imdb_id: string | null;
}

// Reverse map: TMDB genre ID → label string
const ID_TO_GENRE = Object.fromEntries(
  Object.entries(GENRE_IDS).map(([name, id]) => [id, name])
);

// ─── Fetch top 20 recent well-rated shows for a genre ────────────────────────
export async function getShowsByGenre(genre: string): Promise<Show[]> {
  const genreId = GENRE_IDS[genre];
  if (!genreId) return [];

  const currentYear = new Date().getFullYear();
  const params = new URLSearchParams({
    api_key: API_KEY,
    with_genres: String(genreId),
    sort_by: 'first_air_date.desc',
    'vote_average.gte': '6.5',
    'vote_count.gte': '100',
    'first_air_date.gte': `${currentYear - 2}-01-01`,
    language: 'en-US',
    page: '1',
  });

  const res = await fetch(`${BASE_URL}/discover/tv?${params}`);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);

  const data: TmdbDiscoverResponse = await res.json();
  const top20 = data.results.slice(0, 20);

  // Resolve IMDb IDs so the detail screen can use OMDB as normal
  const shows = await Promise.all(top20.map((s) => resolveShow(s, genre)));
  return shows.filter((s): s is Show => s !== null);
}

async function resolveShow(tmdb: TmdbShow, genreLabel: string): Promise<Show | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/tv/${tmdb.id}/external_ids?api_key=${API_KEY}`
    );
    const ext: TmdbExternalIds = await res.json();
    if (!ext.imdb_id) return null;

    const year = tmdb.first_air_date ? tmdb.first_air_date.slice(0, 4) : 'N/A';
    const genres = tmdb.genre_ids
      .map((id) => ID_TO_GENRE[id])
      .filter((g): g is string => Boolean(g));
    if (!genres.includes(genreLabel)) genres.unshift(genreLabel);

    return {
      imdbID: ext.imdb_id,
      title: tmdb.name,
      year,
      poster: tmdb.poster_path
        ? `https://image.tmdb.org/t/p/w300${tmdb.poster_path}`
        : '',
      genre: genres,
      imdbRating: tmdb.vote_average > 0 ? tmdb.vote_average.toFixed(1) : 'N/A',
      totalSeasons: 'N/A',
      plot: tmdb.overview || undefined,
    };
  } catch {
    return null;
  }
}
