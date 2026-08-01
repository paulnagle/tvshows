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
  Plot?: string;
  Actors?: string;
  Response: 'True' | 'False';
  Error?: string;
}

interface OmdbSeasonResponse {
  Season: string;
  totalSeasons: string;
  Episodes: Array<{ Episode: string }>;
  Response: 'True' | 'False';
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
    plot: detail.Plot !== 'N/A' ? detail.Plot : undefined,
    actors: detail.Actors !== 'N/A' ? detail.Actors : undefined,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function searchShows(query: string): Promise<Show[]> {
  if (!query.trim()) return [];

  const encoded = encodeURIComponent(query);
  const [page1, page2] = await Promise.all([
    fetch(`${BASE_URL}?apikey=${API_KEY}&s=${encoded}&type=series&page=1`).then((r) => r.json() as Promise<OmdbSearchResponse>),
    fetch(`${BASE_URL}?apikey=${API_KEY}&s=${encoded}&type=series&page=2`).then((r) => r.json() as Promise<OmdbSearchResponse>),
  ]);

  if (page1.Response === 'False') {
    // Surface API-level errors (invalid key, no results, etc.) to the caller
    throw new Error(page1.Error ?? 'No results found');
  }

  const page1Results = (page1.Search ?? []).map(mapSearchItem);
  // Page 2 may not exist for short result sets — ignore its errors silently
  const page2Results = page2.Response === 'True' ? (page2.Search ?? []).map(mapSearchItem) : [];

  // Deduplicate by imdbID (page 2 shouldn't overlap but be safe)
  const seen = new Set(page1Results.map((s) => s.imdbID));
  const merged = [...page1Results, ...page2Results.filter((s) => !seen.has(s.imdbID))];
  return merged;
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

// Returns an array where index 0 = season 1 episode count, index 1 = season 2, etc.
export async function getSeasonEpisodeCounts(
  imdbID: string,
  totalSeasons: number
): Promise<number[]> {
  const requests = Array.from({ length: totalSeasons }, (_, i) =>
    fetch(`${BASE_URL}?apikey=${API_KEY}&i=${imdbID}&Season=${i + 1}`)
      .then((r) => r.json() as Promise<OmdbSeasonResponse>)
      .then((data) =>
        data.Response === 'True' ? data.Episodes.length : 0
      )
      .catch(() => 0)
  );
  return Promise.all(requests);
}
