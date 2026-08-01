import type { Show } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_OMDB_API_KEY ?? '';
const BASE_URL = 'https://www.omdbapi.com/';

// ─── OMDB response types ──────────────────────────────────────────────────────
interface OmdbSearchItem {
  imdbID: string;
  Title: string;
  Year: string;
  Poster: string;
  Type: string;
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
  totalSeasons?: string;
  Response: 'True' | 'False';
  Error?: string;
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────
function mapGenre(genreStr: string): string[] {
  if (!genreStr || genreStr === 'N/A') return [];
  return genreStr.split(',').map((g) => g.trim());
}

function mapSearchItem(item: OmdbSearchItem): Show {
  return {
    imdbID: item.imdbID,
    title: item.Title,
    year: item.Year,
    poster: item.Poster !== 'N/A' ? item.Poster : '',
    genre: [],
    imdbRating: 'N/A',
    totalSeasons: 'N/A',
  };
}

function mapDetail(detail: OmdbDetailResponse): Show {
  return {
    imdbID: detail.imdbID,
    title: detail.Title,
    year: detail.Year,
    poster: detail.Poster !== 'N/A' ? detail.Poster : '',
    genre: mapGenre(detail.Genre),
    imdbRating: detail.imdbRating ?? 'N/A',
    totalSeasons: detail.totalSeasons ?? 'N/A',
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function searchShows(query: string): Promise<Show[]> {
  if (!query.trim()) return [];

  const url = `${BASE_URL}?apikey=${API_KEY}&s=${encodeURIComponent(query)}&type=series`;
  const res = await fetch(url);
  const data: OmdbSearchResponse = await res.json();

  if (data.Response === 'False') {
    // Surface API-level errors (invalid key, no results, etc.) to the caller
    throw new Error(data.Error ?? 'No results found');
  }
  return (data.Search ?? []).map(mapSearchItem);
}

export async function getShowDetails(imdbID: string): Promise<Show> {
  const url = `${BASE_URL}?apikey=${API_KEY}&i=${imdbID}&plot=short`;
  const res = await fetch(url);
  const data: OmdbDetailResponse = await res.json();

  if (data.Response === 'False') {
    throw new Error(data.Error ?? 'Show not found');
  }
  return mapDetail(data);
}
