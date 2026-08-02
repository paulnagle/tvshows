import React, { useState, useCallback } from 'react';
import { View, FlatList, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RecommendationsStackParamList, Show } from '../types';
import { getShowsByGenre, TOP_GENRES } from '../services/recommendations';
import {
  addToWatchShow,
  getAllCurrentShows,
  getAllToWatchShows,
  getAllWatchedShows,
  addHiddenRecommendation,
  getAllHiddenRecommendationIDs,
} from '../db/database';
import ShowCard from '../components/ShowCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

type Nav = NativeStackNavigationProp<
  RecommendationsStackParamList,
  'RecommendationsList'
>;

type ListStatus = 'watching' | 'towatch' | 'watched';

export default function RecommendationsScreen() {
  const navigation = useNavigation<Nav>();
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedIDs, setAddedIDs] = useState<Set<string>>(new Set());
  const [listMap, setListMap] = useState<Map<string, ListStatus>>(new Map());
  const [hiddenIDs, setHiddenIDs] = useState<Set<string>>(new Set());

  // Refresh list membership and hidden IDs whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      async function loadLists() {
        const [watching, toWatch, watched, hidden] = await Promise.all([
          getAllCurrentShows(),
          getAllToWatchShows(),
          getAllWatchedShows(),
          getAllHiddenRecommendationIDs(),
        ]);
        const map = new Map<string, ListStatus>();
        watched.forEach((s) => map.set(s.imdbID, 'watched'));
        toWatch.forEach((s) => map.set(s.imdbID, 'towatch'));
        watching.forEach((s) => map.set(s.imdbID, 'watching'));
        setListMap(map);
        setHiddenIDs(new Set(hidden));
        // Re-filter any currently displayed shows
        setShows((prev) => prev.filter(
          (s) => !map.has(s.imdbID) && !hidden.includes(s.imdbID)
        ));
      }
      loadLists();
    }, []),
  );

  async function handleAddToWatch(show: Show) {
    try {
      await addToWatchShow(show);
      setAddedIDs((prev) => new Set(prev).add(show.imdbID));
      setListMap((prev) => new Map(prev).set(show.imdbID, 'towatch'));
      setShows((prev) => prev.filter((s) => s.imdbID !== show.imdbID));
    } catch {
      Alert.alert('Error', 'Could not add to To Watch list.');
    }
  }

  async function handleHide(show: Show) {
    await addHiddenRecommendation(show.imdbID);
    setHiddenIDs((prev) => new Set(prev).add(show.imdbID));
    setShows((prev) => prev.filter((s) => s.imdbID !== show.imdbID));
  }

  function getBadge(imdbID: string): { badge: string; badgeColor: string } | null {
    const status = listMap.get(imdbID);
    if (status === 'watching') return { badge: '▶ Watching', badgeColor: 'bg-emerald-800' };
    if (status === 'towatch') return { badge: '✓ To Watch', badgeColor: 'bg-[#1e3a5f]' };
    if (status === 'watched') return { badge: '✓ Watched', badgeColor: 'bg-[#374151]' };
    if (addedIDs.has(imdbID)) return { badge: '✓ To Watch', badgeColor: 'bg-[#1e3a5f]' };
    return null;
  }

  const selectGenre = useCallback(async (genre: string) => {
    // Tapping the active genre deselects it
    if (genre === selectedGenre) {
      setSelectedGenre(null);
      setShows([]);
      return;
    }

    setSelectedGenre(genre);
    setLoading(true);
    try {
      const results = await getShowsByGenre(genre);
      setShows(results.filter((s) => !listMap.has(s.imdbID) && !hiddenIDs.has(s.imdbID)));
    } catch {
      setShows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedGenre, listMap, hiddenIDs]);

  return (
    <View className="flex-1 bg-[#0f172a]">
      {/* Genre pills */}
      <View className="px-4 pt-4 pb-2">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TOP_GENRES.map((g) => {
            const active = g === selectedGenre;
            return (
              <TouchableOpacity
                key={g}
                onPress={() => selectGenre(g)}
                className={
                  active
                    ? 'bg-[#6366f1] border border-[#6366f1] rounded-full px-3 py-1'
                    : 'bg-[#1e293b] border border-[#334155] rounded-full px-3 py-1'
                }
              >
                <Text
                  className={
                    active
                      ? 'text-white text-sm font-semibold'
                      : 'text-[#94a3b8] text-sm'
                  }
                >
                  {g}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : !selectedGenre ? (
        <EmptyState
          message="Pick a genre"
          subMessage="Tap a genre above to see the top shows"
        />
      ) : shows.length === 0 ? (
        <EmptyState
          message="No results"
          subMessage={`Couldn't load shows for ${selectedGenre}`}
        />
      ) : (
        <FlatList
          data={shows}
          keyExtractor={(item) => item.imdbID}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => {
            const badgeInfo = getBadge(item.imdbID);
            const alreadyInAList = listMap.has(item.imdbID) || addedIDs.has(item.imdbID);
            return (
              <ShowCard
                show={item}
                onPress={() =>
                  navigation.navigate('ShowDetail', { imdbID: item.imdbID })
                }
                onAddToWatch={
                  alreadyInAList ? undefined : () => handleAddToWatch(item)
                }
                onHide={
                  alreadyInAList ? undefined : () => handleHide(item)
                }
                badge={badgeInfo?.badge}
                badgeColor={badgeInfo?.badgeColor}
              />
            );
          }}
        />
      )}
    </View>
  );
}
