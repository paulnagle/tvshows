// ─── Show data from TMDB-backed lookups ──────────────────────────────────────
export interface Show {
  imdbID: string;
  title: string;
  year: string;
  poster: string;
  genre: string[];       // e.g. ["Drama", "Thriller"]
  imdbRating: string;    // e.g. "8.5" or "N/A"
  totalSeasons: string;  // e.g. "5" or "N/A"
  plot?: string;         // short plot summary
  actors?: string;       // comma-separated cast list
}

// ─── Currently watching ───────────────────────────────────────────────────────
export interface CurrentShow extends Show {
  id: number;
  currentSeason: number;
  currentEpisode: number;
  addedAt: string; // ISO date string
}

// ─── Previously watched ───────────────────────────────────────────────────────
export interface WatchedShow extends Show {
  id: number;
  finishedAt: string; // ISO date string
  lastSeason: number;
  lastEpisode: number;
}

// ─── To Watch (want to watch) ─────────────────────────────────────────────────
export interface ToWatchShow extends Show {
  id: number;
  addedAt: string; // ISO date string
}

// ─── Navigation param types ───────────────────────────────────────────────────
export type WatchingStackParamList = {
  WatchingList: undefined;
  ShowDetail: { imdbID: string };
};

export type ToWatchStackParamList = {
  ToWatchList: undefined;
  ShowDetail: { imdbID: string };
};

export type HistoryStackParamList = {
  HistoryList: undefined;
  ShowDetail: { imdbID: string };
};

export type RecommendationsStackParamList = {
  RecommendationsList: undefined;
  ShowDetail: { imdbID: string };
};

export type SearchStackParamList = {
  SearchScreen: undefined;
  ShowDetail: { imdbID: string };
};

export type SettingsStackParamList = {
  SettingsScreen: undefined;
};
