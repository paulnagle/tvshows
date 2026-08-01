import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ToWatchStackParamList, ToWatchShow } from '../types';
import {
  getAllToWatchShows,
  removeToWatchShow,
  moveToWatchToWatching,
} from '../db/database';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import ShowCard from '../components/ShowCard';
import { dataEvents } from '../events/dataEvents';

type Nav = NativeStackNavigationProp<ToWatchStackParamList, 'ToWatchList'>;

export default function ToWatchListScreen() {
  const navigation = useNavigation<Nav>();
  const [shows, setShows] = useState<ToWatchShow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadShows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllToWatchShows();
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
            onStartWatching={() => handleMoveToWatching(item)}
            onRemove={() => handleRemove(item)}
          />
        )}
      />
    </View>
  );
}
