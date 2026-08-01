import * as SQLite from 'expo-sqlite';
import type { CurrentShow, WatchedShow, Show } from '../types';

let db: SQLite.SQLiteDatabase;

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
      addedAt       TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS watched_shows (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      imdbID     TEXT    NOT NULL UNIQUE,
      title      TEXT    NOT NULL,
      year       TEXT,
      poster     TEXT,
      genre      TEXT,
      imdbRating TEXT,
      totalSeasons TEXT,
      finishedAt TEXT    NOT NULL
    );
  `);
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
  await db.runAsync(
    `INSERT OR IGNORE INTO current_shows
      (imdbID, title, year, poster, genre, imdbRating, totalSeasons, currentSeason, currentEpisode, addedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?)`,
    [
      show.imdbID,
      show.title,
      show.year,
      show.poster,
      serializeGenre(show.genre),
      show.imdbRating,
      show.totalSeasons,
      new Date().toISOString(),
    ]
  );
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
}

export async function removeCurrentShow(imdbID: string): Promise<void> {
  await db.runAsync(`DELETE FROM current_shows WHERE imdbID = ?`, [imdbID]);
}

export async function getAllCurrentShows(): Promise<CurrentShow[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM current_shows ORDER BY addedAt DESC`
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
      new Date().toISOString(),
    ]
  );
  await removeCurrentShow(imdbID);
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
  }));
}

export async function isWatchedShow(imdbID: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM watched_shows WHERE imdbID = ?`,
    [imdbID]
  );
  return (row?.count ?? 0) > 0;
}
