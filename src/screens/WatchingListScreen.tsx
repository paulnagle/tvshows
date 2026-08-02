import React, { useState, useCallback, useEffect } from 'react';
import { View, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import type { WatchingStackParamList, CurrentShow, ReleaseStatus } from '../types';
import {
  getAllCurrentShows,
  updateEpisodeProgress,
  moveToWatched,
  removeCurrentShow,
  updateShowOrder,
} from '../db/database';
import { getSeasonEpisodeCounts } from '../services/tmdb';
import {
  getReleaseBadgeColor,
  getReleaseSubtitle,
  loadReleaseStatuses,
  notifyForNewEpisodes,
} from '../services/releaseTracking';
import { getReleaseAlertsEnabled } from '../services/releaseAlerts';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import ShowCard from '../components/ShowCard';
import { dataEvents } from '../events/dataEvents';

type Nav = NativeStackNavigationProp<WatchingStackParamList, 'WatchingList'>;

// imdbID -> array where index 0 = season 1 episode count, etc.
type EpisodeCountMap = Record<string, number[]>;

export default function WatchingListScreen() {
  const navigation = useNavigation<Nav>();
  const [shows, setShows] = useState<CurrentShow[]>([]);
  const [episodeCounts, setEpisodeCounts] = useState<EpisodeCountMap>({});
  const [releaseStatuses, setReleaseStatuses] = useState<Record<string, ReleaseStatus>>({});
  const [loading, setLoading] = useState(true);

  const loadShows = useCallback(async () => {
    setShows((prev) => {
      if (prev.length === 0) setLoading(true);
      return prev;
    });
    try {
      const data = await getAllCurrentShows();
      setShows(data);

      // Fetch episode counts for every show that has a known season count
      const entries = await Promise.all(
        data.map(async (show) => {
          const total = parseInt(show.totalSeasons, 10);
          if (isNaN(total) || total <= 0) return [show.imdbID, []] as const;
          const counts = await getSeasonEpisodeCounts(show.imdbID, total);
          return [show.imdbID, counts] as const;
        })
      );
      setEpisodeCounts(Object.fromEntries(entries));

      const nextReleaseStatuses = await loadReleaseStatuses(data);
      setReleaseStatuses(nextReleaseStatuses);
      const alertsEnabled = await getReleaseAlertsEnabled();
      await notifyForNewEpisodes(data, nextReleaseStatuses, alertsEnabled);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadShows();
    }, [loadShows])
  );

  // Re-fetch when a remote sync event modifies the data
  useEffect(() => dataEvents.subscribe(loadShows), [loadShows]);

  async function handleNextEpisode(show: CurrentShow) {
    const counts = episodeCounts[show.imdbID] ?? [];
    const rawMax = counts[show.currentSeason - 1];
    const maxEpisode = rawMax != null && rawMax > 0 ? rawMax : Infinity;
    if (show.currentEpisode >= maxEpisode) return;
    const nextEpisode = show.currentEpisode + 1;
    await updateEpisodeProgress(show.imdbID, show.currentSeason, nextEpisode);
    setShows((prev) =>
      prev.map((s) =>
        s.imdbID === show.imdbID ? { ...s, currentEpisode: nextEpisode } : s
      )
    );
  }

  async function handlePrevEpisode(show: CurrentShow) {
    if (show.currentEpisode <= 1) return;
    const prevEpisode = show.currentEpisode - 1;
    await updateEpisodeProgress(show.imdbID, show.currentSeason, prevEpisode);
    setShows((prev) =>
      prev.map((s) =>
        s.imdbID === show.imdbID ? { ...s, currentEpisode: prevEpisode } : s
      )
    );
  }

  async function handleNextSeason(show: CurrentShow) {
    const totalSeasons = parseInt(show.totalSeasons, 10);
    if (!isNaN(totalSeasons) && show.currentSeason >= totalSeasons) return;
    const nextSeason = show.currentSeason + 1;
    await updateEpisodeProgress(show.imdbID, nextSeason, 1);
    setShows((prev) =>
      prev.map((s) =>
        s.imdbID === show.imdbID
          ? { ...s, currentSeason: nextSeason, currentEpisode: 1 }
          : s
      )
    );
  }

  async function handlePrevSeason(show: CurrentShow) {
    if (show.currentSeason <= 1) return;
    const prevSeason = show.currentSeason - 1;
    const counts = episodeCounts[show.imdbID] ?? [];
    const lastEpisode = counts[prevSeason - 1] ?? 1;
    await updateEpisodeProgress(show.imdbID, prevSeason, lastEpisode);
    setShows((prev) =>
      prev.map((s) =>
        s.imdbID === show.imdbID
          ? { ...s, currentSeason: prevSeason, currentEpisode: lastEpisode }
          : s
      )
    );
  }

  function handleRemove(show: CurrentShow) {
    Alert.alert(
      'Remove Show?',
      `Remove "${show.title}" from your watchlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeCurrentShow(show.imdbID);
            setShows((prev) => prev.filter((s) => s.imdbID !== show.imdbID));
          },
        },
      ]
    );
  }

  function handleFinished(show: CurrentShow) {
    Alert.alert(
      'Mark as Finished?',
      `Move "${show.title}" to your watch history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finished',
          style: 'destructive',
          onPress: async () => {
            await moveToWatched(show.imdbID);
            setShows((prev) => prev.filter((s) => s.imdbID !== show.imdbID));
          },
        },
      ]
    );
  }

  const handleDragEnd = useCallback(
    async ({ data }: { data: CurrentShow[] }) => {
      setShows(data);
      await updateShowOrder(data.map((s) => s.imdbID));
    },
    []
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<CurrentShow>) => {
      const counts = episodeCounts[item.imdbID] ?? [];
      const rawMax = counts[item.currentSeason - 1];
      const maxEpisode = rawMax != null && rawMax > 0 ? rawMax : Infinity;
      const totalSeasons = parseInt(item.totalSeasons, 10);
      return (
        <ScaleDecorator>
          <ShowCard
            show={item}
            onPress={() =>
              navigation.navigate('ShowDetail', { imdbID: item.imdbID })
            }
            subtitle={getReleaseSubtitle(releaseStatuses[item.imdbID])}
            badge={releaseStatuses[item.imdbID]?.isAvailableNow ? 'New Episode' : `▶ S${item.currentSeason}E${item.currentEpisode}`}
            badgeColor={releaseStatuses[item.imdbID]?.isAvailableNow ? getReleaseBadgeColor(releaseStatuses[item.imdbID]) : 'bg-[#6366f1]'}
            userRating={item.userRating}
            controls={{
              onPrevEpisode: () => handlePrevEpisode(item),
              onNextEpisode: () => handleNextEpisode(item),
              onPrevSeason: () => handlePrevSeason(item),
              onNextSeason: () => handleNextSeason(item),
              onFinished: () => handleFinished(item),
              episodeAtStart: item.currentEpisode <= 1,
              episodeDone: isFinite(maxEpisode) && item.currentEpisode >= maxEpisode,
              seasonAtStart: item.currentSeason <= 1,
              seasonDone: !isNaN(totalSeasons) && item.currentSeason >= totalSeasons,
            }}
            onRemove={() => handleRemove(item)}
            onDrag={drag}
            isDragging={isActive}
          />
        </ScaleDecorator>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [episodeCounts, navigation, releaseStatuses]
  );

  if (loading) return <LoadingSpinner />;

  if (shows.length === 0) {
    return (
      <EmptyState
        message="No shows yet"
        subMessage="Search for a show and add it to your watchlist"
      />
    );
  }

  return (
    <View className="flex-1 bg-[#0f172a]">
      <DraggableFlatList
        data={shows}
        keyExtractor={(item) => item.imdbID}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
        onDragEnd={handleDragEnd}
        renderItem={renderItem}
        activationDistance={5}
      />
    </View>
  );
}
