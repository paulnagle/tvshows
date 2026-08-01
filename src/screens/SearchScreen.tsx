import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SearchStackParamList } from '../types';
import { searchShows } from '../services/omdb';
import type { Show } from '../types';
import ShowCard from '../components/ShowCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

type Nav = NativeStackNavigationProp<SearchStackParamList, 'Search'>;

export default function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Show[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        // "Movie not found!" is OMDB's message for zero results — treat as empty, not error
        if (msg === 'Movie not found!') {
          setResults([]);
          setHasSearched(true);
        } else {
          setError(msg);
        }
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
          renderItem={({ item }) => (
            <ShowCard
              show={item}
              onPress={() =>
                navigation.navigate('ShowDetail', { imdbID: item.imdbID })
              }
            />
          )}
        />
      )}
    </View>
  );
}
