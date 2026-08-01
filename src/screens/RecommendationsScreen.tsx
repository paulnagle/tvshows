import React, { useState, useCallback } from 'react';
import { View, FlatList, Text } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RecommendationsStackParamList, Show } from '../types';
import { getAllWatchedShows, getAllCurrentShows } from '../db/database';
import { getTopGenres, getRecommendations } from '../services/recommendations';
import ShowCard from '../components/ShowCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

type Nav = NativeStackNavigationProp<
  RecommendationsStackParamList,
  'RecommendationsList'
>;

export default function RecommendationsScreen() {
  const navigation = useNavigation<Nav>();
  const [recommendations, setRecommendations] = useState<Show[]>([]);
  const [topGenres, setTopGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [noGenres, setNoGenres] = useState(false);

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const [watched, current] = await Promise.all([
        getAllWatchedShows(),
        getAllCurrentShows(),
      ]);

      const allShows = [...watched, ...current];
      const genres = getTopGenres(allShows);

      if (genres.length === 0) {
        setNoGenres(true);
        setRecommendations([]);
        return;
      }

      setNoGenres(false);
      setTopGenres(genres);

      const excludeIDs = allShows.map((s) => s.imdbID);
      const recs = await getRecommendations(genres, excludeIDs);
      setRecommendations(recs);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecommendations();
    }, [loadRecommendations])
  );

  if (loading) return <LoadingSpinner />;

  if (noGenres) {
    return (
      <EmptyState
        message="Nothing to recommend yet"
        subMessage="Add and watch some shows first — recommendations are based on your genre preferences"
      />
    );
  }

  if (recommendations.length === 0) {
    return (
      <EmptyState
        message="No new recommendations"
        subMessage="Try adding more shows to your history to improve suggestions"
      />
    );
  }

  return (
    <View className="flex-1 bg-[#0f172a]">
      {/* Genre pills */}
      <View className="px-4 pt-4 pb-2 flex-row flex-wrap gap-2">
        <Text className="text-[#94a3b8] text-xs self-center">Based on: </Text>
        {topGenres.map((g) => (
          <View
            key={g}
            className="bg-[#6366f1]/20 border border-[#6366f1]/40 rounded-full px-3 py-0.5"
          >
            <Text className="text-[#6366f1] text-xs font-semibold">{g}</Text>
          </View>
        ))}
      </View>

      <FlatList
        data={recommendations}
        keyExtractor={(item) => item.imdbID}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <ShowCard
            show={item}
            onPress={() =>
              navigation.navigate('ShowDetail', { imdbID: item.imdbID })
            }
          />
        )}
      />
    </View>
  );
}
