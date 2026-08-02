import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HistoryStackParamList, WatchedShow } from '../types';
import { getAllWatchedShows, removeWatchedShow, moveToWatching, moveWatchedToToWatch } from '../db/database';
import ShowCard from '../components/ShowCard';
import { dataEvents } from '../events/dataEvents';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

type Nav = NativeStackNavigationProp<HistoryStackParamList, 'HistoryList'>;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function HistoryListScreen() {
  const navigation = useNavigation<Nav>();
  const [shows, setShows] = useState<WatchedShow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadShows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllWatchedShows();
      setShows(data);
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

  function handleRewatch(show: WatchedShow) {
    Alert.alert(
      'Watch Again?',
      `Move "${show.title}" back to your watchlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Watch Again',
          onPress: async () => {
            await moveToWatching(show.imdbID);
            setShows((prev) => prev.filter((s) => s.imdbID !== show.imdbID));
          },
        },
      ]
    );
  }

  function handleAddToWatch(show: WatchedShow) {
    Alert.alert(
      'Add to To Watch?',
      `Add "${show.title}" to your To Watch list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async () => {
            await moveWatchedToToWatch(show.imdbID);
            setShows((prev) => prev.filter((s) => s.imdbID !== show.imdbID));
          },
        },
      ]
    );
  }

  function handleRemove(show: WatchedShow) {
    Alert.alert(
      'Remove Show?',
      `Remove "${show.title}" from your history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeWatchedShow(show.imdbID);
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
        message="No watch history yet"
        subMessage='Mark a show as "Finished" to see it here'
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
            subtitle={`Watched: ${formatDate(item.finishedAt)}`}
            badge="Watched"
            badgeColor="bg-emerald-700"
            userRating={item.userRating}
            onRewatch={() => handleRewatch(item)}
            onAddToWatch={() => handleAddToWatch(item)}
            onRemove={() => handleRemove(item)}
          />
        )}
      />
    </View>
  );
}
