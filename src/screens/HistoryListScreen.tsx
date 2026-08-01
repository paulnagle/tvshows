import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HistoryStackParamList, WatchedShow } from '../types';
import { getAllWatchedShows } from '../db/database';
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
          />
        )}
      />
    </View>
  );
}
