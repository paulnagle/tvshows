# OMDb Integration Plan

## Top-Level Overview

Replace the TMDB API with OMDb for all operations it can support, while keeping TMDB only for the two features OMDb cannot cover:

- **OMDb handles:** Search by title, show details (title, year, rating, plot, actors, genres, poster, total seasons), and per-season episode counts.
- **TMDB retains:** Genre-based discovery (Recommendations screen) and release tracking (next episode air date / show status).

The strategy is:
1. Create a new `src/services/omdb.ts` service alongside the existing `src/services/tmdb.ts`.
2. Create a parallel `src/services/omdbApiKey.ts` for secure OMDb key storage (same pattern as the TMDB key module).
3. Wire `searchShows` and `getShowDetails` / `getSeasonEpisodeCounts` to call OMDb instead of TMDB.
4. Leave `getShowsByGenre` and `getReleaseStatus` in `tmdb.ts` untouched — they continue to use TMDB.
5. Add an OMDb API key input section to the Settings screen alongside the existing TMDB section.

The app's primary identifier (`imdbID`) is already the native key for OMDb, so no ID-translation layer is needed for OMDb calls.

---

## Sub-Tasks

---

### Sub-Task 1 — Add OMDb key storage module

**Intent**  
Provide the same secure-store pattern for the OMDb API key that already exists for TMDB. The key `13ee4a53` is hardcoded as a build-time env-var fallback (`EXPO_PUBLIC_OMDB_API_KEY`) so the app works out of the box. Users can override it in Settings later.

**Expected Outcomes**  
- `src/services/omdbApiKey.ts` exists and exports `getOmdbApiKey`, `setOmdbApiKey`, `deletOmdbApiKey`.
- Key is stored under the SecureStore key `omdb_api_key`.
- Build-time fallback reads `process.env.EXPO_PUBLIC_OMDB_API_KEY`.

**Todo List**  
1. Create `src/services/omdbApiKey.ts` — copy the structure of `src/services/tmdbApiKey.ts`, change the store key to `omdb_api_key`, the env var to `EXPO_PUBLIC_OMDB_API_KEY`, and export the three functions with `Omdb` names.

**Relevant Context**  
- Mirror: [`src/services/tmdbApiKey.ts`](src/services/tmdbApiKey.ts)

**Status** — `[ ] pending`

---

### Sub-Task 2 — Create the OMDb service

**Intent**  
Implement `searchShows`, `getShowDetails`, and `getSeasonEpisodeCounts` using the OMDb API, returning the same `Show` / `number[]` types the rest of the app already consumes. This keeps all downstream screens and the database layer unchanged.

**Expected Outcomes**  
- `src/services/omdb.ts` exists and exports `searchShows`, `getShowDetails`, `getSeasonEpisodeCounts`.
- All three functions call `http://www.omdbapi.com/` with `apikey` appended to every request.
- Return types match the existing `Show` interface exactly.
- `searchShows` uses `?s=<query>&type=series`.
- `getShowDetails` uses `?i=<imdbID>&type=series&plot=full`.
- `getSeasonEpisodeCounts` iterates seasons 1…N, each via `?i=<imdbID>&Season=<n>`, and returns an array of episode counts.
- OMDb `imdbRating` is used directly for the rating field.
- OMDb `Poster` URL is used directly (no CDN prefix needed).
- OMDb genres come as a comma-separated string; split into an array.

**OMDb response shape reference**
```
// Search result item
{ imdbID, Title, Year, Poster }

// Series detail
{ imdbID, Title, Year, Poster, Genre, imdbRating, totalSeasons, Plot, Actors }

// Season detail
{ Season, Episodes: [{ Episode, Title, imdbID, Released, imdbRating }] }
```

**Todo List**  
1. Create `src/services/omdb.ts`.
2. Define internal OMDb response interfaces.
3. Implement `searchShows(query)` — search endpoint, map each result to `Show` (partial: no plot/actors/rating from search results; those come from the detail endpoint called per result).
4. Implement `getShowDetails(imdbID)` — detail endpoint, map full `Show`.
5. Implement `getSeasonEpisodeCounts(imdbID, totalSeasons)` — loop over season numbers, return `number[]`.
6. Add a private `mapOmdbShow` helper that converts an OMDb detail response to `Show`.

**Relevant Context**  
- Type to satisfy: [`src/types/index.ts` — `Show` interface](src/types/index.ts:2)
- Reference for function signatures: [`src/services/tmdb.ts`](src/services/tmdb.ts) — `searchShows`, `getShowDetails`, `getSeasonEpisodeCounts`
- OMDb API key helper: `src/services/omdbApiKey.ts` (created in Sub-Task 1)

**Status** — `[ ] pending`

---

### Sub-Task 3 — Re-wire callers to use the OMDb service

**Intent**  
Replace the three TMDB function imports in the app's screens/services with their OMDb equivalents, so search and show-detail lookups use OMDb while the recommendations and release-tracking paths continue to use TMDB untouched.

**Expected Outcomes**  
- `searchShows` and `getShowDetails` calls come from `omdb.ts`, not `tmdb.ts`.
- `getSeasonEpisodeCounts` calls come from `omdb.ts`, not `tmdb.ts`.
- `getShowsByGenre` and `getReleaseStatus` still import from `tmdb.ts`.
- No screen or service has a broken import.

**Todo List**  
1. Find every file that currently imports `searchShows`, `getShowDetails`, or `getSeasonEpisodeCounts` from `tmdb.ts`.
2. Update those imports to point to `omdb.ts` instead.
3. Remove the now-unused TMDB imports from those files (keep any remaining TMDB imports that are still needed, e.g. `getShowsByGenre`, `getReleaseStatus`).

**Relevant Context**  
- Files likely to change: `src/screens/SearchScreen.tsx`, `src/screens/ShowDetailScreen.tsx`, `src/services/releaseTracking.ts` (check each).

**Status** — `[ ] pending`

---

### Sub-Task 4 — Add OMDb API key to Settings screen

**Intent**  
Let users view and update their OMDb API key in the Settings screen, following the exact same UI pattern as the existing TMDB key section.

**Expected Outcomes**  
- Settings screen shows two key sections: "OMDb API Key" (new, first) and "TMDB API Key" (existing, second).
- OMDb section has the same input / show-hide toggle / save button / status indicator as the TMDB section.
- Save/clear calls `setOmdbApiKey` / `deleteOmdbApiKey` from `omdbApiKey.ts`.
- TMDB section description updated to clarify it is only needed for "Recommendations and release tracking".
- OMDb section description states it is used for "Search and show details" and links to omdbapi.com.

**Todo List**  
1. Import `getOmdbApiKey`, `setOmdbApiKey`, `deleteOmdbApiKey` from `omdbApiKey.ts` into `SettingsScreen.tsx`.
2. Add state variables for the OMDb key (parallel to existing TMDB key state).
3. Add `useEffect` to load the OMDb key on mount.
4. Add `handleSaveOmdbKey` handler.
5. Render the OMDb key section above the TMDB key section in the JSX, using the same component structure.
6. Update the TMDB section's helper text to "Required for Recommendations and release tracking only."

**Relevant Context**  
- File to edit: [`src/screens/SettingsScreen.tsx`](src/screens/SettingsScreen.tsx)
- TMDB key section to mirror: lines 113–165 of `SettingsScreen.tsx`
- Key helpers: `src/services/omdbApiKey.ts`

**Status** — `[ ] pending`

---

## Notes for Implementation

- OMDb search (`?s=`) returns only `imdbID`, `Title`, `Year`, `Poster` — it does not return rating, plot, actors, or genres. To show full cards in search results, each result from `searchShows` will need a follow-up `?i=<imdbID>` detail call. This is the same pattern TMDB uses (`resolveShow` → `getExternalImdbId`). Cap it at the first 10 results to avoid excessive calls.
- OMDb `totalSeasons` is a string like `"5"` or `"N/A"`. Handle the `"N/A"` case by returning `'N/A'` for `totalSeasons` in the `Show` struct.
- OMDb season detail (`?i=<imdbID>&Season=<n>`) returns `{ Episodes: [...] }`. The episode count is `Episodes.length`.
- The OMDb key `13ee4a53` should be set as the default env-var value in `.env` / `app.json` or documented in the README so the app works without any user configuration. It should NOT be hardcoded directly into source — use the `EXPO_PUBLIC_OMDB_API_KEY` env var fallback path established in Sub-Task 1.
