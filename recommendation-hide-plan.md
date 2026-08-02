# Recommendation Filtering & Hide Plan

## Overview

Two related improvements to the Recommendations screen:

1. **Auto-filter** — Shows already in any of the three watchlists (Currently Watching, Watch Next, Watch History) should never appear in recommendation results.
2. **Manual hide** — A "✕ Hide" button on each recommendation card lets the user permanently dismiss a show so it never re-appears in recommendations.

Both features share the same filtering mechanism in `RecommendationsScreen`. The hide list is stored in a new SQLite table (`hidden_recommendations`) so dismissals persist across sessions.

---

## Sub-Tasks

---

### Sub-Task 1 — Add `hidden_recommendations` table & DB functions

**Intent**
Persist the user's "hidden from recommendations" list in SQLite, following the same patterns as the other three tables.

**Expected Outcomes**
- A new `hidden_recommendations` table exists (created on app startup).
- `addHiddenRecommendation(imdbID)` inserts a row.
- `getAllHiddenRecommendationIDs()` returns `string[]` of all hidden imdbIDs.
- A migration guard ensures existing installs get the table without data loss.

**Todo List**
1. In `src/db/database.ts`, add the `CREATE TABLE IF NOT EXISTS hidden_recommendations` DDL to the `initDatabase()` `execAsync` block. The table only needs `imdbID TEXT NOT NULL UNIQUE`.
2. Add `export async function addHiddenRecommendation(imdbID: string): Promise<void>` — `INSERT OR IGNORE`.
3. Add `export async function getAllHiddenRecommendationIDs(): Promise<string[]>` — returns a flat `string[]`.

**Relevant Context**
- [`initDatabase`](src/db/database.ts:7) — add DDL here alongside the other three tables.
- Pattern for a minimal insert: [`addToWatchShow`](src/db/database.ts:201).
- Pattern for a read returning primitives: [`isCurrentShow`](src/db/database.ts:163).

**Status** — `[ ] pending`

---

### Sub-Task 2 — Filter watchlist shows & hidden shows from recommendation results

**Intent**
After fetching shows from TMDB, remove any show whose `imdbID` is already in `listMap` (watching/towatch/watched) OR in the new hidden set. This is a pure in-screen filter — no change to the TMDB fetch.

**Expected Outcomes**
- When a genre is selected, shows already in any watchlist do not appear in the results.
- Shows the user has hidden also do not appear.
- If all results are filtered out, the existing "No results" empty state is shown.

**Todo List**
1. In `RecommendationsScreen`, load `hiddenIDs` (a `Set<string>`) alongside `listMap` inside the `useFocusEffect` `loadLists()` function, using `getAllHiddenRecommendationIDs()`.
2. Add a `hiddenIDs` state variable (`useState<Set<string>>(new Set())`).
3. In `selectGenre`, after receiving `results` from `getShowsByGenre`, filter out any show whose `imdbID` is in `listMap` or `hiddenIDs` before calling `setShows`.
4. Also re-filter `shows` when `listMap` updates (i.e. after a user adds a show to watch, remove it from the displayed list).

**Relevant Context**
- [`RecommendationsScreen`](src/screens/RecommendationsScreen.tsx:24) — all state lives here.
- [`useFocusEffect / loadLists`](src/screens/RecommendationsScreen.tsx:33) — add `getAllHiddenRecommendationIDs()` call here.
- [`selectGenre`](src/screens/RecommendationsScreen.tsx:70) — filter results before `setShows`.
- [`handleAddToWatch`](src/screens/RecommendationsScreen.tsx:51) — after adding, also call `setShows(prev => prev.filter(...))` to immediately remove the card.

**Status** — `[ ] pending`

---

### Sub-Task 3 — Add "Hide" button to recommendation cards & wire up handler

**Intent**
Give the user a visible "✕ Hide" (or just "✕") button on each recommendation card so they can dismiss a show with one tap, matching the existing remove button style from the other list screens.

**Expected Outcomes**
- Each card in the recommendations list shows a "✕ Hide" button (only on cards that are not already in a watchlist, i.e. where `onAddToWatch` is visible).
- Tapping "✕ Hide" immediately removes the card from the results list (no confirmation dialog needed — it can be undone by never seeing it again, and it's not a destructive data operation like deleting from a watchlist).
- The hidden imdbID is persisted to the `hidden_recommendations` table.

**Todo List**
1. Add `onHide?: () => void` to `ShowCardProps` in [`src/components/ShowCard.tsx`](src/components/ShowCard.tsx).
2. In the `ShowCard` button row for the "To Watch" section (lines 203–238), render a hide button when `onHide` is provided alongside `onAddToWatch`. Style it consistently with the other `✕` remove buttons (red-950 bg, red-800 border, red-400 text).
3. In `RecommendationsScreen`, add `handleHide(show: Show)`:
   - Calls `addHiddenRecommendation(show.imdbID)`.
   - Updates `hiddenIDs` state.
   - Filters the show out of `shows` state immediately.
4. Pass `onHide={() => handleHide(item)}` to `ShowCard` in the `renderItem` call — but only when the show is not already in a list (same condition as `onAddToWatch`).

**Relevant Context**
- [`ShowCardProps`](src/components/ShowCard.tsx:18) — add the new optional prop here.
- Button row rendering pattern: [`ShowCard lines 203-238`](src/components/ShowCard.tsx:203) — the "To Watch" row that already renders `onAddToWatch`.
- [`renderItem in RecommendationsScreen`](src/screens/RecommendationsScreen.tsx:139) — where `onAddToWatch` is currently passed.
- Existing `handleRemove` pattern in [`ToWatchListScreen`](src/screens/ToWatchListScreen.tsx) — same DB-then-setState flow, no alert needed here.

**Status** — `[ ] pending`

---

## Notes

- No changes needed to `src/types/index.ts` — `imdbID` string is sufficient; no new type required.
- No changes needed to the three watchlist screens.
- The `ShowCard` change is additive (new optional prop) and will not break any existing usage.
- The filter in `selectGenre` means a show hidden or added mid-session will be absent if the user taps a genre again — no additional re-filter hook needed beyond the immediate state update.
