import * as Notifications from 'expo-notifications';
import type { CurrentShow, ToWatchShow, ReleaseStatus } from '../types';
import { getReleaseStatus } from './tmdb';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type ReleaseStatusMap = Record<string, ReleaseStatus>;

const alertedAvailableEpisodes = new Set<string>();

function getAlertKey(show: CurrentShow, releaseStatus: ReleaseStatus): string | null {
  if (!releaseStatus.nextEpisodeSeason || !releaseStatus.nextEpisodeNumber) {
    return null;
  }

  return `${show.imdbID}:${releaseStatus.nextEpisodeSeason}:${releaseStatus.nextEpisodeNumber}`;
}

export async function requestReleaseAlertPermissions(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function loadReleaseStatuses(shows: CurrentShow[]): Promise<ReleaseStatusMap> {
  const entries = await Promise.all(
    shows.map(async (show) => {
      try {
        const status = await getReleaseStatus(
          show.imdbID,
          show.currentSeason,
          show.currentEpisode
        );
        return [show.imdbID, status] as const;
      } catch {
        return [
          show.imdbID,
          {
            statusLabel: 'Release status unavailable',
            statusTone: 'upcoming' as const,
            isAvailableNow: false,
          },
        ] as const;
      }
    })
  );

  return Object.fromEntries(entries);
}

export async function loadToWatchReleaseStatuses(shows: ToWatchShow[]): Promise<ReleaseStatusMap> {
  const entries = await Promise.all(
    shows.map(async (show) => {
      try {
        const status = await getReleaseStatus(show.imdbID, 1, 0);
        return [show.imdbID, status] as const;
      } catch {
        return [
          show.imdbID,
          {
            statusLabel: 'Release status unavailable',
            statusTone: 'upcoming' as const,
            isAvailableNow: false,
          },
        ] as const;
      }
    })
  );

  return Object.fromEntries(entries);
}

export async function notifyForNewEpisodes(
  shows: CurrentShow[],
  releaseStatuses: ReleaseStatusMap,
  alertsEnabled: boolean
): Promise<void> {
  if (!alertsEnabled) return;

  const permissionGranted = await requestReleaseAlertPermissions();
  if (!permissionGranted) return;

  for (const show of shows) {
    const releaseStatus = releaseStatuses[show.imdbID];
    if (!releaseStatus?.isAvailableNow) continue;

    const alertKey = getAlertKey(show, releaseStatus);
    if (!alertKey || alertedAvailableEpisodes.has(alertKey)) continue;

    alertedAvailableEpisodes.add(alertKey);
    const episodeLabel = releaseStatus.nextEpisodeSeason && releaseStatus.nextEpisodeNumber
      ? `S${releaseStatus.nextEpisodeSeason}E${releaseStatus.nextEpisodeNumber}`
      : 'Next episode';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'New episode available',
        body: `${show.title} ${episodeLabel} is now available.`,
      },
      trigger: null,
    });
  }
}

export function getReleaseBadgeColor(releaseStatus?: ReleaseStatus): string | undefined {
  if (!releaseStatus) return undefined;
  if (releaseStatus.statusTone === 'available') return 'bg-emerald-700';
  if (releaseStatus.statusTone === 'ended') return 'bg-[#475569]';
  return 'bg-[#7c3aed]';
}

export function getReleaseSubtitle(releaseStatus?: ReleaseStatus): string | undefined {
  if (!releaseStatus) return undefined;

  const episodeLabel =
    releaseStatus.nextEpisodeSeason && releaseStatus.nextEpisodeNumber
      ? `S${releaseStatus.nextEpisodeSeason}E${releaseStatus.nextEpisodeNumber}`
      : undefined;

  if (!episodeLabel) {
    return undefined;
  }

  return `${episodeLabel} · ${releaseStatus.statusLabel}`;
}
