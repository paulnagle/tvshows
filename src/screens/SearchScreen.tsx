import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SearchStackParamList } from '../types';
import { searchShows } from '../services/omdb';
import type { Show } from '../types';
import {
  addToWatchShow,
  getAllCurrentShows,
  getAllToWatchShows,
  getAllWatchedShows,
} from '../db/database';
import ShowCard from '../components/ShowCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

type Nav = NativeStackNavigationProp<SearchStackParamList, 'SearchScreen'>;

type ListStatus = 'watching' | 'towatch' | 'watched';

export default function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Show[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [addedIDs, setAddedIDs] = useState<Set<string>>(new Set());
  const [listMap, setListMap] = useState<Map<string, ListStatus>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refresh list membership whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      async function loadLists() {
        const [watching, toWatch, watched] = await Promise.all([
          getAllCurrentShows(),
          getAllToWatchShows(),
          getAllWatchedShows(),
        ]);
        const map = new Map<string, ListStatus>();
        watched.forEach((s) => map.set(s.imdbID, 'watched'));
        toWatch.forEach((s) => map.set(s.imdbID, 'towatch'));
        watching.forEach((s) => map.set(s.imdbID, 'watching'));
        setListMap(map);
      }
      loadLists();
    }, []),
  );

  async function handleAddToWatch(show: Show) {
    try {
      await addToWatchShow(show);
      setAddedIDs((prev) => new Set(prev).add(show.imdbID));
      setListMap((prev) => new Map(prev).set(show.imdbID, 'towatch'));
    } catch {
      Alert.alert('Error', 'Could not add to To Watch list.');
    }
  }

  function getBadge(imdbID: string): { badge: string; badgeColor: string } | null {
    const status = listMap.get(imdbID);
    if (status === 'watching') return { badge: '▶ Watching', badgeColor: 'bg-emerald-800' };
    if (status === 'towatch') return { badge: '✓ To Watch', badgeColor: 'bg-[#1e3a5f]' };
    if (status === 'watched') return { badge: '✓ Watched', badgeColor: 'bg-[#374151]' };
    if (addedIDs.has(imdbID)) return { badge: '✓ To Watch', badgeColor: 'bg-[#1e3a5f]' };
    return null;
  }

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const shows = await searchShows(text);
        setResults(shows);
        setHasSearched(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to fetch results.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  return (
    <View className="flex-1 bg-[#0f172a]">
      {/* Search bar */}
      <View className="px-4 pt-4 pb-3">
        <TextInput
          className="bg-[#1e293b] text-[#f1f5f9] rounded-xl px-4 py-3 text-base border border-[#334155]"
          placeholder="Search TV shows…"
          placeholderTextColor="#94a3b8"
          value={query}
          onChangeText={handleChangeText}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-red-400 text-center text-base">{error}</Text>
        </View>
      ) : !hasSearched ? (
        <EmptyState
          message="Find a show"
          subMessage="Type a title above to search for TV shows"
        />
      ) : results.length === 0 ? (
        <EmptyState
          message="No results found"
          subMessage={`No shows found for "${query}"`}
        />
      ) : (
        <FlatList
          data={results}
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
