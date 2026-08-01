import type { Show } from '../types';
import { getTmdbApiKey } from './tmdbApiKey';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300';

// ─── Genre pills shown on the For You screen ─────────────────────────────────
export const TOP_GENRES = [
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
  Drama: 18,
  Comedy: 35,
  Crime: 80,
  Action: 10759,
  'Sci-Fi': 10765,
  Mystery: 9648,
  Documentary: 99,
  Animation: 16,
  Reality: 10764,
  'War & Politics': 10768,
};

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbSeason {
  season_number: number;
  episode_count: number;
}

// ─── TMDB response types ──────────────────────────────────────────────────────
interface TmdbShow {
  id: number;
  name: string;
  first_air_date: string;
  poster_path: string | null;
  genre_ids?: number[];
  genres?: TmdbGenre[];
  vote_average: number;
  overview: string;
  number_of_seasons?: number;
}

interface TmdbListResponse {
  results: TmdbShow[];
}

interface TmdbExternalIds {
  imdb_id: string | null;
}

interface TmdbFindResponse {
  tv_results: TmdbShow[];
}

interface TmdbCreditsResponse {
  cast?: Array<{ name: string }>;
}

interface TmdbShowDetailResponse extends TmdbShow {
  external_ids?: TmdbExternalIds;
  credits?: TmdbCreditsResponse;
  seasons?: TmdbSeason[];
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
  const apiKey = await getTmdbApiKey();
  const params = new URLSearchParams({
    api_key: apiKey,
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

  const data: TmdbListResponse = await res.json();
  const top20 = data.results.slice(0, 20);

  // Resolve IMDb IDs so navigation/storage can continue using IMDb IDs
  const shows = await Promise.all(top20.map((s) => resolveShow(s, genre)));
  return shows.filter((s): s is Show => s !== null);
}

export async function searchShows(query: string): Promise<Show[]> {
  if (!query.trim()) return [];

  const apiKey = await getTmdbApiKey();
  const params = new URLSearchParams({
    api_key: apiKey,
    query,
    language: 'en-US',
    page: '1',
  });

  const res = await fetch(`${BASE_URL}/search/tv?${params}`);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);

  const data: TmdbListResponse = await res.json();
  const shows = await Promise.all(data.results.map((show) => resolveShow(show)));
  return shows.filter((show): show is Show => show !== null);
}

export async function getShowDetails(imdbID: string): Promise<Show> {
  const tmdbID = await getTmdbIdFromImdbID(imdbID);
  const apiKey = await getTmdbApiKey();
  const params = new URLSearchParams({
    api_key: apiKey,
    language: 'en-US',
    append_to_response: 'external_ids,credits',
  });

  const res = await fetch(`${BASE_URL}/tv/${tmdbID}?${params}`);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);

  const detail: TmdbShowDetailResponse = await res.json();
  return mapShow(detail, detail.external_ids?.imdb_id ?? imdbID);
}

export async function getSeasonEpisodeCounts(
  imdbID: string,
  totalSeasons: number
): Promise<number[]> {
  const tmdbID = await getTmdbIdFromImdbID(imdbID);
  const apiKey = await getTmdbApiKey();
  const params = new URLSearchParams({
    api_key: apiKey,
    language: 'en-US',
  });

  const res = await fetch(`${BASE_URL}/tv/${tmdbID}?${params}`);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);

  const detail: TmdbShowDetailResponse = await res.json();
  const seasonMap = new Map(
    (detail.seasons ?? []).map((season) => [season.season_number, season.episode_count])
  );

  return Array.from({ length: totalSeasons }, (_, index) => seasonMap.get(index + 1) ?? 0);
}

async function getTmdbIdFromImdbID(imdbID: string): Promise<number> {
  const apiKey = await getTmdbApiKey();
  const params = new URLSearchParams({
    api_key: apiKey,
    external_source: 'imdb_id',
  });

  const res = await fetch(`${BASE_URL}/find/${imdbID}?${params}`);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);

  const data: TmdbFindResponse = await res.json();
  const match = data.tv_results?.[0];
  if (!match) throw new Error('Show not found');
  return match.id;
}

async function resolveShow(tmdb: TmdbShow, genreLabel?: string): Promise<Show | null> {
  try {
    const imdbID = await getExternalImdbId(tmdb.id);
    if (!imdbID) return null;
    return mapShow(tmdb, imdbID, genreLabel);
  } catch {
    return null;
  }
}

async function getExternalImdbId(tmdbID: number): Promise<string | null> {
  const apiKey = await getTmdbApiKey();
  const res = await fetch(`${BASE_URL}/tv/${tmdbID}/external_ids?api_key=${apiKey}`);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  const ext: TmdbExternalIds = await res.json();
  return ext.imdb_id;
}

function mapShow(tmdb: TmdbShowDetailResponse | TmdbShow, imdbID: string, genreLabel?: string): Show {
  const year = tmdb.first_air_date ? tmdb.first_air_date.slice(0, 4) : 'N/A';
  const genreNames = tmdb.genres?.map((genre) => genre.name) ?? [];
  const genreIds = tmdb.genre_ids ?? [];
  const genres = (genreNames.length > 0 ? genreNames : genreIds.map((id) => ID_TO_GENRE[id])).filter(
    (genre): genre is string => Boolean(genre)
  );

  if (genreLabel && !genres.includes(genreLabel)) {
    genres.unshift(genreLabel);
  }

  const actors = 'credits' in tmdb && tmdb.credits?.cast?.length
    ? tmdb.credits.cast.slice(0, 5).map((member) => member.name).join(', ')
    : undefined;

  return {
    imdbID,
    title: tmdb.name,
    year,
    poster: tmdb.poster_path ? `${IMAGE_BASE_URL}${tmdb.poster_path}` : '',
    genre: genres,
    imdbRating: tmdb.vote_average > 0 ? tmdb.vote_average.toFixed(1) : 'N/A',
    totalSeasons: tmdb.number_of_seasons ? String(tmdb.number_of_seasons) : 'N/A',
    plot: tmdb.overview || undefined,
    actors,
  };
}
