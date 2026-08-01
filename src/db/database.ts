import * as SQLite from 'expo-sqlite';
import type { CurrentShow, WatchedShow, ToWatchShow, Show } from '../types';
import type { SyncEvent } from '../services/sync';

let db: SQLite.SQLiteDatabase;

// ─── Sync emitter registration ────────────────────────────────────────────────
// sync.ts calls setSyncEmitter() after startSync() so every local write
// automatically broadcasts to peers. applyRemoteEvent() writes without
// re-emitting to prevent loops.

let syncEmitter: ((event: SyncEvent) => void) | null = null;

export function setSyncEmitter(fn: (event: SyncEvent) => void): void {
  syncEmitter = fn;
}

export function clearSyncEmitter(): void {
  syncEmitter = null;
}

// ─── Open DB & create tables ──────────────────────────────────────────────────
export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync('tvshows.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS current_shows (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      imdbID        TEXT    NOT NULL UNIQUE,
      title         TEXT    NOT NULL,
      year          TEXT,
      poster        TEXT,
      genre         TEXT,
      imdbRating    TEXT,
      totalSeasons  TEXT,
      currentSeason INTEGER NOT NULL DEFAULT 1,
      currentEpisode INTEGER NOT NULL DEFAULT 1,
      addedAt       TEXT    NOT NULL,
      sort_order    INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS watched_shows (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      imdbID       TEXT    NOT NULL UNIQUE,
      title        TEXT    NOT NULL,
      year         TEXT,
      poster       TEXT,
      genre        TEXT,
      imdbRating   TEXT,
      totalSeasons TEXT,
      finishedAt   TEXT    NOT NULL,
      lastSeason   INTEGER NOT NULL DEFAULT 1,
      lastEpisode  INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS to_watch_shows (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      imdbID       TEXT    NOT NULL UNIQUE,
      title        TEXT    NOT NULL,
      year         TEXT,
      poster       TEXT,
      genre        TEXT,
      imdbRating   TEXT,
      totalSeasons TEXT,
      addedAt      TEXT    NOT NULL
    );
  `);

  // Migration: add sort_order if it doesn't exist yet (existing installs)
  const cols = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(current_shows)`
  );
  const hasSortOrder = cols.some((c) => c.name === 'sort_order');
  if (!hasSortOrder) {
    await db.execAsync(
      `ALTER TABLE current_shows ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`
    );
    // Seed existing rows with their current DESC-by-addedAt position
    await db.execAsync(`
      UPDATE current_shows SET sort_order = (
        SELECT COUNT(*) FROM current_shows c2 WHERE c2.addedAt >= current_shows.addedAt
      )
    `);
  }

  // Migration: add lastSeason/lastEpisode to watched_shows if missing
  const watchedCols = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(watched_shows)`
  );
  const colNames = watchedCols.map((c) => c.name);
  if (!colNames.includes('lastSeason')) {
    await db.execAsync(
      `ALTER TABLE watched_shows ADD COLUMN lastSeason INTEGER NOT NULL DEFAULT 1`
    );
  }
  if (!colNames.includes('lastEpisode')) {
    await db.execAsync(
      `ALTER TABLE watched_shows ADD COLUMN lastEpisode INTEGER NOT NULL DEFAULT 1`
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseGenre(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(',').map((g) => g.trim());
}

function serializeGenre(genre: string[]): string {
  return genre.join(', ');
}

// ─── Current shows CRUD ───────────────────────────────────────────────────────
export async function addCurrentShow(show: Show): Promise<void> {
  const addedAt = new Date().toISOString();
  // New shows go to the top (sort_order = 0), shift existing rows down
  await db.runAsync(`UPDATE current_shows SET sort_order = sort_order + 1`);
  await db.runAsync(
    `INSERT OR IGNORE INTO current_shows
      (imdbID, title, year, poster, genre, imdbRating, totalSeasons, currentSeason, currentEpisode, addedAt, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, 0)`,
    [
      show.imdbID,
      show.title,
      show.year,
      show.poster,
      serializeGenre(show.genre),
      show.imdbRating,
      show.totalSeasons,
      addedAt,
    ]
  );
  syncEmitter?.({
    type: 'ADD_CURRENT',
    payload: {
      ...show,
      id: 0, // remote side will use its own auto-increment id
      currentSeason: 1,
      currentEpisode: 1,
      addedAt,
    },
  });
}

export async function updateEpisodeProgress(
  imdbID: string,
  season: number,
  episode: number
): Promise<void> {
  await db.runAsync(
    `UPDATE current_shows SET currentSeason = ?, currentEpisode = ? WHERE imdbID = ?`,
    [season, episode, imdbID]
  );
  syncEmitter?.({ type: 'UPDATE_PROGRESS', payload: { imdbID, currentSeason: season, currentEpisode: episode } });
}

export async function removeCurrentShow(imdbID: string): Promise<void> {
  await db.runAsync(`DELETE FROM current_shows WHERE imdbID = ?`, [imdbID]);
  syncEmitter?.({ type: 'REMOVE_CURRENT', payload: { imdbID } });
}

export async function updateShowOrder(orderedImdbIDs: string[]): Promise<void> {
  await Promise.all(
    orderedImdbIDs.map((imdbID, index) =>
      db.runAsync(`UPDATE current_shows SET sort_order = ? WHERE imdbID = ?`, [index, imdbID])
    )
  );
}

export async function getAllCurrentShows(): Promise<CurrentShow[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM current_shows ORDER BY sort_order ASC`
  );
  return rows.map((r) => ({
    id: r.id as number,
    imdbID: r.imdbID as string,
    title: r.title as string,
    year: r.year as string,
    poster: r.poster as string,
    genre: parseGenre(r.genre as string | null),
    imdbRating: r.imdbRating as string,
    totalSeasons: r.totalSeasons as string,
    currentSeason: r.currentSeason as number,
    currentEpisode: r.currentEpisode as number,
    addedAt: r.addedAt as string,
  }));
}

export async function isCurrentShow(imdbID: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM current_shows WHERE imdbID = ?`,
    [imdbID]
  );
  return (row?.count ?? 0) > 0;
}

// ─── Move to watched ──────────────────────────────────────────────────────────
export async function moveToWatched(imdbID: string): Promise<void> {
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM current_shows WHERE imdbID = ?`,
    [imdbID]
  );
  if (!row) return;

  const finishedAt = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO watched_shows
      (imdbID, title, year, poster, genre, imdbRating, totalSeasons, finishedAt, lastSeason, lastEpisode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.imdbID as string,
      row.title as string,
      row.year as string,
      row.poster as string,
      row.genre as string,
      row.imdbRating as string,
      row.totalSeasons as string,
      finishedAt,
      row.currentSeason as number,
      row.currentEpisode as number,
    ]
  );
  // Delete directly without re-emitting REMOVE (we emit MOVE_TO_WATCHED instead)
  await db.runAsync(`DELETE FROM current_shows WHERE imdbID = ?`, [imdbID]);
  syncEmitter?.({ type: 'MOVE_TO_WATCHED', payload: { imdbID, finishedAt } });
}

// ─── To Watch shows CRUD ──────────────────────────────────────────────────────
export async function addToWatchShow(show: Show): Promise<void> {
  const addedAt = new Date().toISOString();
  await db.runAsync(
    `INSERT OR IGNORE INTO to_watch_shows
      (imdbID, title, year, poster, genre, imdbRating, totalSeasons, addedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      show.imdbID,
      show.title,
      show.year,
      show.poster,
      serializeGenre(show.genre),
      show.imdbRating,
      show.totalSeasons,
      addedAt,
    ]
  );
  syncEmitter?.({ type: 'ADD_TO_WATCH', payload: { ...show, id: 0, addedAt } });
}

export async function removeToWatchShow(imdbID: string): Promise<void> {
  await db.runAsync(`DELETE FROM to_watch_shows WHERE imdbID = ?`, [imdbID]);
  syncEmitter?.({ type: 'REMOVE_TO_WATCH', payload: { imdbID } });
}

export async function getAllToWatchShows(): Promise<ToWatchShow[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM to_watch_shows ORDER BY addedAt DESC`
  );
  return rows.map((r) => ({
    id: r.id as number,
    imdbID: r.imdbID as string,
    title: r.title as string,
    year: r.year as string,
    poster: r.poster as string,
    genre: parseGenre(r.genre as string | null),
    imdbRating: r.imdbRating as string,
    totalSeasons: r.totalSeasons as string,
    addedAt: r.addedAt as string,
  }));
}

export async function isToWatchShow(imdbID: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM to_watch_shows WHERE imdbID = ?`,
    [imdbID]
  );
  return (row?.count ?? 0) > 0;
}

export async function moveToWatchToWatching(imdbID: string): Promise<void> {
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM to_watch_shows WHERE imdbID = ?`,
    [imdbID]
  );
  if (!row) return;

  const addedAt = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO current_shows
      (imdbID, title, year, poster, genre, imdbRating, totalSeasons, currentSeason, currentEpisode, addedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?)`,
    [
      row.imdbID as string,
      row.title as string,
      row.year as string,
      row.poster as string,
      row.genre as string,
      row.imdbRating as string,
      row.totalSeasons as string,
      addedAt,
    ]
  );
  await db.runAsync(`DELETE FROM to_watch_shows WHERE imdbID = ?`, [imdbID]);
  syncEmitter?.({
    type: 'ADD_CURRENT',
    payload: {
      id: 0,
      imdbID: row.imdbID as string,
      title: row.title as string,
      year: row.year as string,
      poster: row.poster as string,
      genre: (row.genre as string | null)?.split(',').map((g) => g.trim()) ?? [],
      imdbRating: row.imdbRating as string,
      totalSeasons: row.totalSeasons as string,
      currentSeason: 1,
      currentEpisode: 1,
      addedAt,
    },
  });
  syncEmitter?.({ type: 'REMOVE_TO_WATCH', payload: { imdbID } });
}

// ─── Watched shows ────────────────────────────────────────────────────────────
export async function getAllWatchedShows(): Promise<WatchedShow[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM watched_shows ORDER BY finishedAt DESC`
  );
  return rows.map((r) => ({
    id: r.id as number,
    imdbID: r.imdbID as string,
    title: r.title as string,
    year: r.year as string,
    poster: r.poster as string,
    genre: parseGenre(r.genre as string | null),
    imdbRating: r.imdbRating as string,
    totalSeasons: r.totalSeasons as string,
    finishedAt: r.finishedAt as string,
    lastSeason: (r.lastSeason as number) ?? 1,
    lastEpisode: (r.lastEpisode as number) ?? 1,
  }));
}

export async function removeWatchedShow(imdbID: string): Promise<void> {
  await db.runAsync(`DELETE FROM watched_shows WHERE imdbID = ?`, [imdbID]);
}

export async function moveToWatching(imdbID: string): Promise<void> {
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM watched_shows WHERE imdbID = ?`,
    [imdbID]
  );
  if (!row) return;

  const addedAt = new Date().toISOString();
  const lastSeason = (row.lastSeason as number) ?? 1;
  const lastEpisode = (row.lastEpisode as number) ?? 1;
  await db.runAsync(
    `INSERT OR REPLACE INTO current_shows
      (imdbID, title, year, poster, genre, imdbRating, totalSeasons, currentSeason, currentEpisode, addedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.imdbID as string,
      row.title as string,
      row.year as string,
      row.poster as string,
      row.genre as string,
      row.imdbRating as string,
      row.totalSeasons as string,
      lastSeason,
      lastEpisode,
      addedAt,
    ]
  );
  await db.runAsync(`DELETE FROM watched_shows WHERE imdbID = ?`, [imdbID]);
  syncEmitter?.({
    type: 'ADD_CURRENT',
    payload: {
      id: 0,
      imdbID: row.imdbID as string,
      title: row.title as string,
      year: row.year as string,
      poster: row.poster as string,
      genre: (row.genre as string | null)?.split(',').map((g) => g.trim()) ?? [],
      imdbRating: row.imdbRating as string,
      totalSeasons: row.totalSeasons as string,
      currentSeason: lastSeason,
      currentEpisode: lastEpisode,
      addedAt,
    },
  });
}

export async function isWatchedShow(imdbID: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM watched_shows WHERE imdbID = ?`,
    [imdbID]
  );
  return (row?.count ?? 0) > 0;
}

// ─── Apply a remote sync event (no re-broadcast) ──────────────────────────────
export async function applyRemoteEvent(event: SyncEvent): Promise<void> {
  // Temporarily suppress the emitter so we don't echo the event back to peers
  const saved = syncEmitter;
  syncEmitter = null;

  try {
    switch (event.type) {
      case 'ADD_CURRENT': {
        const s = event.payload;
        await db.runAsync(
          `INSERT OR REPLACE INTO current_shows
            (imdbID, title, year, poster, genre, imdbRating, totalSeasons, currentSeason, currentEpisode, addedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            s.imdbID,
            s.title,
            s.year,
            s.poster,
            serializeGenre(s.genre),
            s.imdbRating,
            s.totalSeasons,
            s.currentSeason,
            s.currentEpisode,
            s.addedAt,
          ]
        );
        break;
      }
      case 'UPDATE_PROGRESS': {
        const { imdbID, currentSeason, currentEpisode } = event.payload;
        await db.runAsync(
          `UPDATE current_shows SET currentSeason = ?, currentEpisode = ? WHERE imdbID = ?`,
          [currentSeason, currentEpisode, imdbID]
        );
        break;
      }
      case 'REMOVE_CURRENT': {
        await db.runAsync(`DELETE FROM current_shows WHERE imdbID = ?`, [event.payload.imdbID]);
        break;
      }
      case 'MOVE_TO_WATCHED': {
        const { imdbID, finishedAt } = event.payload;
        const row = await db.getFirstAsync<Record<string, unknown>>(
          `SELECT * FROM current_shows WHERE imdbID = ?`,
          [imdbID]
        );
        if (row) {
          await db.runAsync(
            `INSERT OR REPLACE INTO watched_shows
              (imdbID, title, year, poster, genre, imdbRating, totalSeasons, finishedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              row.imdbID as string,
              row.title as string,
              row.year as string,
              row.poster as string,
              row.genre as string,
              row.imdbRating as string,
              row.totalSeasons as string,
              finishedAt,
            ]
          );
          await db.runAsync(`DELETE FROM current_shows WHERE imdbID = ?`, [imdbID]);
        }
        break;
      }
      case 'ADD_TO_WATCH': {
        const s = event.payload;
        await db.runAsync(
          `INSERT OR IGNORE INTO to_watch_shows
            (imdbID, title, year, poster, genre, imdbRating, totalSeasons, addedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.imdbID, s.title, s.year, s.poster, serializeGenre(s.genre), s.imdbRating, s.totalSeasons, s.addedAt]
        );
        break;
      }
      case 'REMOVE_TO_WATCH': {
        await db.runAsync(`DELETE FROM to_watch_shows WHERE imdbID = ?`, [event.payload.imdbID]);
        break;
      }
      case 'SNAPSHOT': {
        const { currentShows, watchedShows } = event.payload;
        for (const s of currentShows) {
          await db.runAsync(
            `INSERT OR REPLACE INTO current_shows
              (imdbID, title, year, poster, genre, imdbRating, totalSeasons, currentSeason, currentEpisode, addedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              s.imdbID, s.title, s.year, s.poster,
              serializeGenre(s.genre), s.imdbRating, s.totalSeasons,
              s.currentSeason, s.currentEpisode, s.addedAt,
            ]
          );
        }
        for (const w of watchedShows) {
          await db.runAsync(
            `INSERT OR REPLACE INTO watched_shows
              (imdbID, title, year, poster, genre, imdbRating, totalSeasons, finishedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              w.imdbID, w.title, w.year, w.poster,
              serializeGenre(w.genre), w.imdbRating, w.totalSeasons, w.finishedAt,
            ]
          );
        }
        break;
      }
    }
  } finally {
    syncEmitter = saved;
  }
}

// ─── Backup restore ───────────────────────────────────────────────────────────
/**
 * Restore data from a backup file. Uses INSERT OR REPLACE so existing rows
 * are overwritten with backup values and missing rows are inserted.
 * Returns the total number of rows written.
 */
export async function restoreBackup(
  currentShows: CurrentShow[],
  watchedShows: WatchedShow[],
  toWatchShows: ToWatchShow[]
): Promise<number> {
  let count = 0;

  for (const s of currentShows) {
    await db.runAsync(
      `INSERT OR REPLACE INTO current_shows
        (imdbID, title, year, poster, genre, imdbRating, totalSeasons, currentSeason, currentEpisode, addedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.imdbID, s.title, s.year, s.poster,
        serializeGenre(s.genre), s.imdbRating, s.totalSeasons,
        s.currentSeason, s.currentEpisode, s.addedAt,
      ]
    );
    count++;
  }

  for (const w of watchedShows) {
    await db.runAsync(
      `INSERT OR REPLACE INTO watched_shows
        (imdbID, title, year, poster, genre, imdbRating, totalSeasons, finishedAt, lastSeason, lastEpisode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        w.imdbID, w.title, w.year, w.poster,
        serializeGenre(w.genre), w.imdbRating, w.totalSeasons,
        w.finishedAt, w.lastSeason ?? 1, w.lastEpisode ?? 1,
      ]
    );
    count++;
  }

  for (const t of toWatchShows) {
    await db.runAsync(
      `INSERT OR REPLACE INTO to_watch_shows
        (imdbID, title, year, poster, genre, imdbRating, totalSeasons, addedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        t.imdbID, t.title, t.year, t.poster,
        serializeGenre(t.genre), t.imdbRating, t.totalSeasons, t.addedAt,
      ]
    );
    count++;
  }

  return count;
}
