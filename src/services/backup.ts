/**
 * Backup & Restore Service
 *
 * exportBackup – serialises all three lists to JSON, writes to a temp file,
 *                then opens the native share sheet so the user can save or
 *                send the file however they like.
 *
 * importBackup – opens a document picker, reads the chosen JSON file, validates
 *                the shape, and restores every row via INSERT OR REPLACE.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  getAllCurrentShows,
  getAllWatchedShows,
  getAllToWatchShows,
  restoreBackup,
} from '../db/database';
import type { CurrentShow, WatchedShow, ToWatchShow } from '../types';

// ─── Backup file schema ───────────────────────────────────────────────────────

const BACKUP_VERSION = 1;

interface BackupFile {
  version: number;
  exportedAt: string;
  currentShows: CurrentShow[];
  watchedShows: WatchedShow[];
  toWatchShows: ToWatchShow[];
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportBackup(): Promise<void> {
  const [currentShows, watchedShows, toWatchShows] = await Promise.all([
    getAllCurrentShows(),
    getAllWatchedShows(),
    getAllToWatchShows(),
  ]);

  const backup: BackupFile = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    currentShows,
    watchedShows,
    toWatchShows,
  };

  const filename = `tvshows-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const path = FileSystem.cacheDirectory + filename;

  await FileSystem.writeAsStringAsync(path, JSON.stringify(backup, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(path, {
    mimeType: 'application/json',
    dialogTitle: 'Save TV Shows Backup',
    UTI: 'public.json',
  });
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function importBackup(): Promise<{ restored: number }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'public.json', 'text/plain'],
    copyToCacheDirectory: true,
  });

  if (result.canceled) {
    return { restored: 0 };
  }

  const asset = result.assets[0];
  if (!asset?.uri) {
    throw new Error('No file selected.');
  }

  const raw = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (!isBackupFile(parsed)) {
    throw new Error('The selected file does not look like a TV Shows backup.');
  }

  const count = await restoreBackup(parsed.currentShows, parsed.watchedShows, parsed.toWatchShows);
  return { restored: count };
}

// ─── Type guard ───────────────────────────────────────────────────────────────

function isBackupFile(value: unknown): value is BackupFile {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.version === 'number' &&
    Array.isArray(obj.currentShows) &&
    Array.isArray(obj.watchedShows) &&
    Array.isArray(obj.toWatchShows)
  );
}
