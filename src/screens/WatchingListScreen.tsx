import React, { useState, useCallback } from 'react';
import { View, FlatList, Text, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { WatchingStackParamList, CurrentShow } from '../types';
import {
  getAllCurrentShows,
  updateEpisodeProgress,
  moveToWatched,
} from '../db/database';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import ShowCard from '../components/ShowCard';

type Nav = NativeStackNavigationProp<WatchingStackParamList, 'WatchingList'>;

export default function WatchingListScreen() {
  const navigation = useNavigation<Nav>();
  const [shows, setShows] = useState<CurrentShow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadShows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllCurrentShows();
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

  async function handleNextEpisode(show: CurrentShow) {
    const nextEpisode = show.currentEpisode + 1;
    await updateEpisodeProgress(show.imdbID, show.currentSeason, nextEpisode);
    setShows((prev) =>
      prev.map((s) =>
        s.imdbID === show.imdbID ? { ...s, currentEpisode: nextEpisode } : s
      )
    );
  }

  async function handleNextSeason(show: CurrentShow) {
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
      <FlatList
        data={shows}
        keyExtractor={(item) => item.imdbID}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View>
            <ShowCard
              show={item}
              onPress={() =>
                navigation.navigate('ShowDetail', { imdbID: item.imdbID })
              }
              badge={`S${item.currentSeason}E${item.currentEpisode}`}
              badgeColor="bg-[#6366f1]"
            />
            {/* Episode controls */}
            <View className="flex-row mx-4 -mt-1 mb-3 gap-2">
              <TouchableOpacity
                onPress={() => handleNextEpisode(item)}
                className="flex-1 bg-[#1e293b] border border-[#334155] rounded-lg py-2 items-center"
                activeOpacity={0.7}
              >
                <Text className="text-[#94a3b8] text-xs font-semibold">+ Episode</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleNextSeason(item)}
                className="flex-1 bg-[#1e293b] border border-[#334155] rounded-lg py-2 items-center"
                activeOpacity={0.7}
              >
                <Text className="text-[#94a3b8] text-xs font-semibold">+ Season</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleFinished(item)}
                className="flex-1 bg-emerald-900 border border-emerald-700 rounded-lg py-2 items-center"
                activeOpacity={0.7}
              >
                <Text className="text-emerald-300 text-xs font-semibold">Finished ✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}
