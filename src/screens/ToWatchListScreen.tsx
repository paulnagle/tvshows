import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ToWatchStackParamList, ToWatchShow, ReleaseStatus } from '../types';
import {
  getAllToWatchShows,
  removeToWatchShow,
  moveToWatchToWatching,
  updateImdbRating,
} from '../db/database';
import { getShowDetails } from '../services/tmdb';
import {
  getReleaseSubtitle,
  loadToWatchReleaseStatuses,
} from '../services/releaseTracking';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import ShowCard from '../components/ShowCard';
import { dataEvents } from '../events/dataEvents';

type Nav = NativeStackNavigationProp<ToWatchStackParamList, 'ToWatchList'>;

export default function ToWatchListScreen() {
  const navigation = useNavigation<Nav>();
  const [shows, setShows] = useState<ToWatchShow[]>([]);
  const [releaseStatuses, setReleaseStatuses] = useState<Record<string, ReleaseStatus>>({});
  const [loading, setLoading] = useState(true);

  const loadShows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllToWatchShows();
      setShows(data);

      // Background-refresh imdbRating for any show stored as 'N/A'
      data
        .filter((s) => !s.imdbRating || s.imdbRating === 'N/A')
        .forEach(async (s) => {
          try {
            const detail = await getShowDetails(s.imdbID);
            if (detail.imdbRating && detail.imdbRating !== 'N/A') {
              await updateImdbRating(s.imdbID, detail.imdbRating);
              setShows((prev) =>
                prev.map((p) =>
                  p.imdbID === s.imdbID ? { ...p, imdbRating: detail.imdbRating } : p
                )
              );
            }
          } catch {
            // silently ignore — rating will retry next load
          }
        });

      const statuses = await loadToWatchReleaseStatuses(data);
      setReleaseStatuses(statuses);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadShows();
    }, [loadShows])
  );

  useEffect(() => dataEvents.subscribe(loadShows), [loadShows]);

  function handleMoveToWatching(show: ToWatchShow) {
    Alert.alert(
      'Start Watching?',
      `Move "${show.title}" to your Watch List?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Watching',
          onPress: async () => {
            await moveToWatchToWatching(show.imdbID);
            setShows((prev) => prev.filter((s) => s.imdbID !== show.imdbID));
          },
        },
      ]
    );
  }

  function handleRemove(show: ToWatchShow) {
    Alert.alert(
      'Remove Show?',
      `Remove "${show.title}" from your To Watch list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeToWatchShow(show.imdbID);
            setShows((prev) => prev.filter((s) => s.imdbID !== show.imdbID));
          },
        },
      ]
    );
  }

  if (loading) return <LoadingSpinner />;

  if (shows.length === 0) {
    return (
      <EmptyState
        message="Nothing queued up"
        subMessage="Add shows from Search or For You to build your To Watch list"
      />
    );
  }

  return (
    <View className="flex-1 bg-[#0f172a]">
      <FlatList
        data={shows}
        keyExtractor={(item) => item.imdbID}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <ShowCard
            show={item}
            onPress={() =>
              navigation.navigate('ShowDetail', { imdbID: item.imdbID })
            }
            subtitle={getReleaseSubtitle(releaseStatuses[item.imdbID])}
            onStartWatching={() => handleMoveToWatching(item)}
            onRemove={() => handleRemove(item)}
          />
        )}
      />
    </View>
  );
}
