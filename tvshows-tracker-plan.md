# TV Show Tracker — Implementation Plan

## Top-Level Overview

Build a React Native (Expo) iOS app for tracking TV shows. The app allows users to:

- Search for TV shows using the OMDB API and view IMDB ratings
- Track shows they are currently watching, including the current season and episode
- Mark shows as previously watched (watch history)
- Get genre-based show recommendations derived from their watch history
- Store all personal data locally using Expo SQLite, designed to be cloud-sync-ready later

**Tech Stack:**
- Framework: Expo (React Native) with TypeScript
- Navigation: React Navigation (bottom tabs + stack navigator)
- Styling: NativeWind (Tailwind CSS for React Native)
- Storage: Expo SQLite
- External API: OMDB API (show search, details, IMDB ratings)
- Platform: iOS only

---

## Pre-requisites

Before starting implementation, obtain a free OMDB API key:
1. Go to https://www.omdbapi.com/apikey.aspx
2. Select the free tier (1,000 requests/day)
3. Register with an email address and verify it
4. Save the key — it will be stored in a `.env` file in the project root as `EXPO_PUBLIC_OMDB_API_KEY`

---

## Sub-Tasks

---

### Sub-Task 1 — Project Scaffolding & Configuration

**Intent:**
Initialize the Expo project with TypeScript, install all required dependencies, set up NativeWind, configure Expo SQLite, and establish the base folder structure. This is the foundation everything else builds on.

**Expected Outcomes:**
- A working Expo app that builds and runs on iOS Simulator
- TypeScript configured
- NativeWind configured and a test style renders correctly
- Folder structure in place: `src/screens`, `src/components`, `src/services`, `src/db`, `src/navigation`, `src/hooks`, `src/types`
- `.env` file placeholder with `EXPO_PUBLIC_OMDB_API_KEY`

**Todo List:**
1. Run `npx create-expo-app tvshows --template blank-typescript` inside `/Users/paulnagle/git/`
   - Note: the project must be initialized in the parent directory so the repo folder `tvshows` becomes the project root
2. Install dependencies:
   - `react-navigation/native`, `react-navigation/bottom-tabs`, `react-navigation/native-stack`
   - `react-native-screens`, `react-native-safe-area-context`
   - `expo-sqlite`
   - `nativewind`, `tailwindcss`
3. Configure `tailwind.config.js` for NativeWind
4. Update `babel.config.js` to include the NativeWind preset
5. Configure `tsconfig.json` paths if needed
6. Create the `src/` folder structure
7. Create `.env` with `EXPO_PUBLIC_OMDB_API_KEY=your_key_here`
8. Create a `src/types/index.ts` file with shared TypeScript interfaces (see types sub-task)

**Relevant Context:**
- NativeWind v4 requires `tailwindcss` v3 and specific babel setup
- Expo SQLite requires `expo-sqlite` package from Expo SDK
- `.env` values prefixed with `EXPO_PUBLIC_` are automatically available via `process.env`

**Status:** `[ ] pending`

---

### Sub-Task 2 — TypeScript Types & Database Schema

**Intent:**
Define the shared TypeScript types and the SQLite database schema. Doing this early ensures all subsequent sub-tasks build against a consistent data contract.

**Expected Outcomes:**
- `src/types/index.ts` contains all shared interfaces
- `src/db/database.ts` sets up the SQLite connection and creates tables on first run
- All tables are created with appropriate columns and indexes

**Todo List:**
1. Define TypeScript interfaces in `src/types/index.ts`:
   - `Show`: `{ id, imdbID, title, year, poster, genre, imdbRating, totalSeasons }`
   - `WatchedShow` (previously watched): `{ id, imdbID, title, poster, genre, imdbRating, finishedAt }`
   - `CurrentShow` (currently watching): `{ id, imdbID, title, poster, genre, imdbRating, totalSeasons, currentSeason, currentEpisode, addedAt }`
2. Create `src/db/database.ts`:
   - Opens (or creates) a SQLite database called `tvshows.db`
   - Exports an `initDatabase()` function that creates the following tables if they don't exist:
     - `current_shows`: columns matching `CurrentShow`
     - `watched_shows`: columns matching `WatchedShow`
3. Export typed CRUD helper functions:
   - `addCurrentShow(show)`, `updateEpisodeProgress(imdbID, season, episode)`, `removeCurrentShow(imdbID)`
   - `getAllCurrentShows()`, `moveToWatched(imdbID)`, `getAllWatchedShows()`

**Relevant Context:**
- `expo-sqlite` API: `SQLite.openDatabaseAsync(name)` returns a database instance
- Use `db.execAsync(sql)` for DDL (CREATE TABLE), `db.runAsync(sql, params)` for writes, `db.getAllAsync(sql, params)` for reads

**Status:** `[ ] pending`

---

### Sub-Task 3 — OMDB API Service

**Intent:**
Build the API service layer that communicates with OMDB. Centralizing API calls here keeps screens clean and makes it easy to swap or extend the data source later.

**Expected Outcomes:**
- `src/services/omdb.ts` contains all OMDB API functions
- Functions are fully typed with TypeScript
- API key is read from the environment variable

**Todo List:**
1. Create `src/services/omdb.ts`
2. Implement `searchShows(query: string): Promise<Show[]>` — calls OMDB search endpoint (`?s=query&type=series`)
3. Implement `getShowDetails(imdbID: string): Promise<Show>` — calls OMDB by ID (`?i=imdbID&plot=short`) to get full details including `imdbRating`, `Genre`, `totalSeasons`
4. Map OMDB API response fields (e.g. `Title`, `imdbRating`, `Genre`) to the local `Show` type
5. Handle the case where OMDB returns `{ Response: "False" }` gracefully (return empty array / throw typed error)

**Relevant Context:**
- OMDB search endpoint: `https://www.omdbapi.com/?apikey=KEY&s=QUERY&type=series`
- OMDB detail endpoint: `https://www.omdbapi.com/?apikey=KEY&i=IMDBID`
- OMDB returns `Genre` as a comma-separated string (e.g. `"Drama, Thriller"`) — split and store as array

**Status:** `[ ] pending`

---

### Sub-Task 4 — Navigation Structure

**Intent:**
Set up the bottom-tab navigation with four tabs and configure the stack navigators within each tab. Navigation is the skeleton of the app.

**Expected Outcomes:**
- App has a working bottom tab bar with four tabs: Currently Watching, Previously Watched, Recommendations, Search
- Each tab has its own stack navigator for drilling into show details
- Navigation types are defined in TypeScript

**Todo List:**
1. Create `src/navigation/index.tsx` with a `NavigationContainer` wrapping a `BottomTabNavigator`
2. Define four tabs:
   - **Watching** — stack: `WatchingList` → `ShowDetail`
   - **History** — stack: `HistoryList` → `ShowDetail`
   - **Recommendations** — stack: `RecommendationsList` → `ShowDetail`
   - **Search** — stack: `SearchScreen` → `ShowDetail`
3. Create placeholder screen files in `src/screens/` for all screens listed above
4. Define navigation param types in `src/types/index.ts`
5. Wire navigation into `App.tsx`, calling `initDatabase()` on app startup

**Relevant Context:**
- Use `@react-navigation/bottom-tabs` and `@react-navigation/native-stack`
- `initDatabase()` should be called once at app start, before any screen renders — use a loading state in `App.tsx`

**Status:** `[ ] pending`

---

### Sub-Task 5 — Search Screen

**Intent:**
Build the Search screen where users can search for TV shows by name, see results with IMDB ratings, and add a show to their "Currently Watching" list.

**Expected Outcomes:**
- User can type a show name and see a list of results from OMDB
- Each result shows the poster image, title, year, and IMDB rating
- Tapping a result navigates to the Show Detail screen
- From Show Detail, user can add the show to Currently Watching (defaults to S01E01)

**Todo List:**
1. Implement `src/screens/SearchScreen.tsx`:
   - Text input with debounced search (300ms)
   - Calls `searchShows()` on input change
   - Renders results in a `FlatList`, each row showing poster thumbnail, title, year
   - Tapping a row navigates to `ShowDetail` with the `imdbID`
2. Implement `src/screens/ShowDetailScreen.tsx`:
   - Calls `getShowDetails(imdbID)` on mount
   - Displays: poster, title, year, genre tags, IMDB rating, total seasons
   - "Add to Watching" button — calls `addCurrentShow()` with `currentSeason: 1, currentEpisode: 1`
   - If show is already in `current_shows`, show "Already Watching" (disabled button)
   - If show is in `watched_shows`, show "Watched" badge

**Relevant Context:**
- `src/services/omdb.ts` — `searchShows()`, `getShowDetails()`
- `src/db/database.ts` — `addCurrentShow()`
- Use `expo-image` or React Native `Image` component for posters

**Status:** `[ ] pending`

---

### Sub-Task 6 — Currently Watching Screen

**Intent:**
Build the screen that shows all shows the user is actively watching, with their current episode progress, and allows them to update episode/season or mark the show as finished.

**Expected Outcomes:**
- List of currently watching shows with poster, title, current S/E progress, and IMDB rating
- "+" and "−" controls to increment/decrement the current episode
- Ability to advance to the next season
- "Mark as Finished" button that moves the show to watch history
- Empty state when no shows are being tracked

**Todo List:**
1. Implement `src/screens/WatchingListScreen.tsx`:
   - Fetches all rows from `current_shows` on focus (use `useFocusEffect`)
   - `FlatList` of show cards, each showing: poster, title, `S{season}E{episode}` badge, IMDB rating
   - Each card has a `+Episode` button and a `+Season` button
   - Each card has a "Finished" button
2. On `+Episode`: call `updateEpisodeProgress()` incrementing episode by 1
3. On `+Season`: call `updateEpisodeProgress()` incrementing season by 1, resetting episode to 1
4. On "Finished": call `moveToWatched(imdbID)` and refresh the list
5. Tapping the card navigates to `ShowDetailScreen`

**Relevant Context:**
- `src/db/database.ts` — `getAllCurrentShows()`, `updateEpisodeProgress()`, `moveToWatched()`
- Use `useFocusEffect` from React Navigation so the list refreshes when navigating back

**Status:** `[ ] pending`

---

### Sub-Task 7 — Previously Watched Screen

**Intent:**
Build the screen that shows all shows the user has finished watching, with IMDB ratings and the date they finished.

**Expected Outcomes:**
- List of all previously watched shows with poster, title, IMDB rating, and finish date
- Empty state message when no shows have been watched
- Tapping a show navigates to its detail page

**Todo List:**
1. Implement `src/screens/HistoryListScreen.tsx`:
   - Fetches all rows from `watched_shows` on focus
   - `FlatList` of show cards showing: poster, title, IMDB rating, "Watched on {date}"
   - Tapping a row navigates to `ShowDetailScreen`
2. Show an empty state illustration/message when the list is empty

**Relevant Context:**
- `src/db/database.ts` — `getAllWatchedShows()`

**Status:** `[ ] pending`

---

### Sub-Task 8 — Recommendations Screen

**Intent:**
Build the Recommendations screen. This uses genre data from the user's watch history and current shows to surface OMDB search results in matching genres — providing a simple but effective discovery experience without needing an external recommendations API.

**Expected Outcomes:**
- Screen shows a list of recommended shows the user hasn't tracked yet
- Recommendations are derived from the top genres in the user's history
- Each recommendation shows poster, title, IMDB rating
- Tapping a recommendation navigates to Show Detail where the user can add it

**Todo List:**
1. Create `src/services/recommendations.ts`:
   - `getTopGenres(watchedShows: WatchedShow[]): string[]` — tallies genre frequency and returns the top 3
   - `getRecommendations(topGenres: string[], currentImdbIDs: string[], watchedImdbIDs: string[]): Promise<Show[]>` — searches OMDB for each genre, filters out shows already tracked, deduplicates, returns up to 20 results
2. Implement `src/screens/RecommendationsScreen.tsx`:
   - On mount: load `watched_shows` and `current_shows` from DB
   - Call `getRecommendations()` with top genres and existing IDs to exclude
   - Render a `FlatList` of recommendation cards
   - Show empty state if user hasn't watched/tracked enough shows to determine genres

**Relevant Context:**
- OMDB search by genre is not directly supported — use genre name as the search query (e.g. `?s=drama&type=series`). Results will be approximate but acceptable for this approach.
- `src/services/omdb.ts` — `searchShows()`
- `src/db/database.ts` — `getAllWatchedShows()`, `getAllCurrentShows()`

**Status:** `[ ] pending`

---

### Sub-Task 9 — Polish & UX

**Intent:**
Add loading states, error handling, empty states, and visual polish to ensure the app feels complete and production-ready.

**Expected Outcomes:**
- All screens show a loading spinner while fetching data
- All API errors show a user-friendly error message
- Empty states are present on all list screens
- Consistent spacing, colors, and typography across all screens using NativeWind

**Todo List:**
1. Create a reusable `src/components/LoadingSpinner.tsx` component
2. Create a reusable `src/components/ShowCard.tsx` component used across all list screens
3. Create a reusable `src/components/EmptyState.tsx` component
4. Add error boundary or try/catch + error state to all OMDB API calls in screens
5. Apply consistent NativeWind classes for layout, typography, and color theme
6. Ensure the bottom tab bar icons are set (use `@expo/vector-icons`)

**Relevant Context:**
- `@expo/vector-icons` is bundled with Expo — no extra install needed
- NativeWind classes should follow a consistent color palette defined once (e.g. slate/zinc background, indigo accent)

**Status:** `[ ] pending`

---

## Folder Structure (Target State)

```
tvshows/
├── App.tsx
├── app.json
├── babel.config.js
├── tailwind.config.js
├── tsconfig.json
├── .env
└── src/
    ├── components/
    │   ├── EmptyState.tsx
    │   ├── LoadingSpinner.tsx
    │   └── ShowCard.tsx
    ├── db/
    │   └── database.ts
    ├── hooks/
    ├── navigation/
    │   └── index.tsx
    ├── screens/
    │   ├── HistoryListScreen.tsx
    │   ├── RecommendationsScreen.tsx
    │   ├── SearchScreen.tsx
    │   ├── ShowDetailScreen.tsx
    │   └── WatchingListScreen.tsx
    ├── services/
    │   ├── omdb.ts
    │   └── recommendations.ts
    └── types/
        └── index.ts
```
