# LAN Sync Plan — TV Show Tracker

## Overview

Add peer-to-peer list synchronisation over local WiFi so all devices running the app on the same network share the same watching list in real time.

**Approach:** Each app instance advertises itself via mDNS (`react-native-zeroconf`), discovers peers on the same network, and maintains a WebSocket connection to each peer. Any DB write is immediately broadcast as a typed JSON event to all connected peers, who apply it to their own local SQLite database. React Native's built-in `WebSocket` API is used for transport — no extra networking library is needed beyond Zeroconf.

**Conflict resolution:** Last write wins (simplest approach; conflicts are not expected in practice).

**Scope:**
- New `src/services/sync.ts` — peer discovery, WebSocket pool, message dispatch/receive
- Modified `src/db/database.ts` — each write emits a sync event after the local DB write
- Modified `App.tsx` — initialise sync service on startup

**Non-goals:**
- No cloud backend
- No authentication / user accounts
- No offline queue / eventual consistency guarantees
- No UI for managing peers

---

## Sub-Tasks

---

### Sub-Task 1 — Install `react-native-zeroconf` and create a dev build

**Intent:** Add the only new native dependency required and ensure it compiles.

**Expected Outcomes:**
- `react-native-zeroconf` is listed in `package.json` dependencies
- `npx expo prebuild` completes without errors
- A local dev build can be run on a physical device (or simulator)

**Todo List:**
1. Run `npx expo install react-native-zeroconf` to add the package
2. Run `npx expo prebuild --clean` to generate native project files
3. Verify the iOS and Android native projects build successfully

**Relevant Context:**
- `app.json` — Expo project config (`projectId: 9f4b60c1-35dd-4ff8-a6f0-6306aa0a6d98`, `owner: paulnagles-team`)
- `package.json` — current dependencies list
- The app currently has no native modules that require a custom dev build, so this is the first one

**Status:** [ ] pending

---

### Sub-Task 2 — Create `src/services/sync.ts` (sync service)

**Intent:** Encapsulate all peer discovery and WebSocket management in a single service module so the rest of the app has a clean interface to trigger and listen to sync events.

**Expected Outcomes:**
- `sync.ts` exports `startSync()`, `stopSync()`, and `broadcastChange(event)` functions
- `startSync()` advertises the device on mDNS (`_tvshows._tcp`) and begins browsing for peers
- When a peer is found, a WebSocket connection is established; when lost, it is cleaned up
- When a new peer connects, the service requests a full snapshot from them (or sends one if this device is asked)
- Incoming events are validated and dispatched to a registered callback (`onRemoteChange`)
- The service handles WebSocket reconnection gracefully (peer disappears and reappears)

**Todo List:**
1. Create `src/services/sync.ts`
2. Implement `startSync(onRemoteChange: (event: SyncEvent) => void)`:
   - Start Zeroconf advertising as `_tvshows._tcp` on a fixed port (e.g. `8765`)
   - Start Zeroconf browsing for `_tvshows._tcp` services
   - On peer discovered: open a WebSocket to `ws://<peer-host>:<peer-port>`
   - On peer removed: close and remove the corresponding WebSocket
3. Implement a lightweight WebSocket server using `react-native`'s built-in server capability or a minimal Node-compatible server (evaluate if `ws` package is needed inside Expo; if not available, use a polling/UDP alternative — see note below)
4. Define the `SyncEvent` union type covering all DB operations:
   - `{ type: 'ADD_CURRENT', payload: CurrentShow }`
   - `{ type: 'UPDATE_PROGRESS', payload: { imdbID, currentSeason, currentEpisode } }`
   - `{ type: 'REMOVE_CURRENT', payload: { imdbID } }`
   - `{ type: 'MOVE_TO_WATCHED', payload: { imdbID, finishedAt } }`
   - `{ type: 'SNAPSHOT_REQUEST' }`
   - `{ type: 'SNAPSHOT', payload: { currentShows: CurrentShow[], watchedShows: WatchedShow[] } }`
5. Implement `broadcastChange(event: SyncEvent)` — serialise and send to all open WebSocket connections
6. Implement `stopSync()` — stop advertising, stop browsing, close all connections

> **Note on WebSocket server:** React Native does not ship a WebSocket *server*. The recommended lightweight option for Expo bare workflow is the `ws` npm package (pure JS, no native deps). Evaluate this at implementation time — if `ws` works in the Expo/Metro bundler context, use it; otherwise fall back to a UDP broadcast approach using `react-native-udp`.

**Relevant Context:**
- `src/types/index.ts` — `CurrentShow`, `WatchedShow`, `Show` types
- `src/db/database.ts` — `getAllCurrentShows()`, `getAllWatchedShows()` (used for snapshot)
- React Native's built-in `WebSocket` client API is available globally

**Status:** [ ] pending

---

### Sub-Task 3 — Wire sync events into `src/db/database.ts`

**Intent:** Make every DB write automatically broadcast a sync event to peers, and make the sync service's `onRemoteChange` callback apply incoming events to the local DB.

**Expected Outcomes:**
- Every call to `addCurrentShow`, `updateEpisodeProgress`, `removeCurrentShow`, `moveToWatched` broadcasts a corresponding `SyncEvent` after the local write succeeds
- A new exported function `applyRemoteEvent(event: SyncEvent)` applies an incoming event directly to the local DB (without re-broadcasting, to prevent loops)
- Remote-applied writes use `INSERT OR REPLACE` / `INSERT OR IGNORE` semantics to be idempotent

**Todo List:**
1. Add an optional sync callback registry to `database.ts` (a module-level variable `let syncEmitter: ((e: SyncEvent) => void) | null = null`)
2. Export `setSyncEmitter(fn)` and `clearSyncEmitter()` so `sync.ts` can register itself
3. After each successful write in `addCurrentShow`, `updateEpisodeProgress`, `removeCurrentShow`, `moveToWatched` — call `syncEmitter?.(event)`
4. Implement `applyRemoteEvent(event: SyncEvent)`:
   - `ADD_CURRENT` → run the same INSERT as `addCurrentShow` but with `INSERT OR REPLACE`
   - `UPDATE_PROGRESS` → run `updateEpisodeProgress`
   - `REMOVE_CURRENT` → run `removeCurrentShow`
   - `MOVE_TO_WATCHED` → run `moveToWatched` (idempotent — already uses INSERT OR REPLACE semantics if adjusted)
   - `SNAPSHOT` → for each show in payload, call the appropriate apply path; do not re-emit

**Relevant Context:**
- `src/db/database.ts` — all existing write functions (lines ~40–163)
- `src/services/sync.ts` (Sub-Task 2) — will call `setSyncEmitter` and pass `applyRemoteEvent` as the `onRemoteChange` callback

**Status:** [ ] pending

---

### Sub-Task 4 — Initialise sync in `App.tsx` and trigger UI refresh on remote changes

**Intent:** Start the sync service when the app mounts and ensure that when a remote event modifies the DB, the relevant screen's data is refreshed.

**Expected Outcomes:**
- `startSync` is called after `initDatabase()` completes in `App.tsx`
- `stopSync` is called when the app goes to the background or unmounts
- When a remote `SyncEvent` is received and applied, all screens that display the affected data re-fetch from the DB
- No screen needs to be open/focused for the sync to work; it applies in the background

**Todo List:**
1. In `App.tsx`, after `initDatabase()`, call `startSync(onRemoteChange)` where `onRemoteChange` calls `applyRemoteEvent(event)` and then emits a global refresh signal
2. Use React Native's `AppState` API to call `stopSync` on background and `startSync` on foreground
3. Add a lightweight global event emitter (a simple `EventEmitter` or a `mitt` instance, or a `React.createContext` with a counter) so screens can subscribe to "data changed" notifications
4. In `WatchingListScreen` and `HistoryListScreen`, subscribe to the "data changed" event and call their existing data-fetch functions when it fires
5. Confirm that `RecommendationsScreen` also refreshes if relevant

**Relevant Context:**
- `App.tsx` — current DB init pattern to mirror for sync init
- `src/screens/WatchingListScreen.tsx` — has `loadShows()` function that re-fetches from DB
- `src/screens/HistoryListScreen.tsx` — similar pattern
- React Native `AppState` API (no extra library needed)

**Status:** [ ] pending

---

### Sub-Task 5 — Add a sync status indicator to the UI

**Intent:** Give users visible feedback that sync is active and how many peers are connected, so they know the feature is working.

**Expected Outcomes:**
- A small, unobtrusive indicator (e.g. in the header or bottom tab bar area) shows the number of connected peers
- When peers = 0, the indicator is neutral/grey
- When peers ≥ 1, the indicator is green/active
- No new screen or settings page is required

**Todo List:**
1. Expose `getPeerCount()` (or a reactive count) from `sync.ts`
2. Add a header right component to the `WatchingList` screen showing the peer count
3. Style it consistently with the existing dark UI (nativewind/tailwind classes)

**Relevant Context:**
- `src/navigation/index.tsx` — where screen options and headers are configured
- `src/screens/WatchingListScreen.tsx` — most natural home for the indicator as it is the primary screen
- Existing colour palette uses dark backgrounds with white/grey text

**Status:** [ ] pending
