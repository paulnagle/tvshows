import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type {
  SearchStackParamList,
  WatchingStackParamList,
  HistoryStackParamList,
  RecommendationsStackParamList,
} from '../types';
import { getShowDetails, getSeasonEpisodeCounts } from '../services/omdb';
import {
  addCurrentShow,
  isCurrentShow,
  isWatchedShow,
} from '../db/database';
import type { Show } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

type ShowDetailRoute =
  | RouteProp<SearchStackParamList, 'ShowDetail'>
  | RouteProp<WatchingStackParamList, 'ShowDetail'>
  | RouteProp<HistoryStackParamList, 'ShowDetail'>
  | RouteProp<RecommendationsStackParamList, 'ShowDetail'>;

export default function ShowDetailScreen() {
  const route = useRoute<ShowDetailRoute>();
  const navigation = useNavigation();
  const { imdbID } = route.params;

  const [show, setShow] = useState<Show | null>(null);
  const [episodeCounts, setEpisodeCounts] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadyWatching, setAlreadyWatching] = useState(false);
  const [alreadyWatched, setAlreadyWatched] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [detail, watching, watched] = await Promise.all([
          getShowDetails(imdbID),
          isCurrentShow(imdbID),
          isWatchedShow(imdbID),
        ]);
        setShow(detail);
        setAlreadyWatching(watching);
        setAlreadyWatched(watched);

        // Fetch episode counts per season if we know how many seasons there are
        const total = parseInt(detail.totalSeasons, 10);
        if (!isNaN(total) && total > 0) {
          const counts = await getSeasonEpisodeCounts(imdbID, total);
          setEpisodeCounts(counts);
        }
      } catch {
        setError('Failed to load show details.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [imdbID]);

  async function handleAdd() {
    if (!show) return;
    setAdding(true);
    try {
      await addCurrentShow(show);
      setAlreadyWatching(true);
      Alert.alert('Added!', `"${show.title}" added to your watchlist.`);
    } catch {
      Alert.alert('Error', 'Could not add show. Please try again.');
    } finally {
      setAdding(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  if (error || !show) {
    return (
      <View className="flex-1 bg-[#0f172a] items-center justify-center px-8">
        <Text className="text-red-400 text-center text-base">{error ?? 'Show not found.'}</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mt-4 bg-[#6366f1] rounded-xl px-6 py-2"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const buttonLabel = alreadyWatching
    ? '✓ Already Watching'
    : adding
    ? 'Adding…'
    : '+ Add to Watching';

  return (
    <ScrollView className="flex-1 bg-[#0f172a]" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Poster */}
      {show.poster ? (
        <Image
          source={{ uri: show.poster }}
          className="w-full h-72 bg-[#1e293b]"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-72 bg-[#1e293b] items-center justify-center">
          <Text className="text-6xl">🎬</Text>
        </View>
      )}

      <View className="px-5 pt-5">
        {/* Title & year */}
        <Text className="text-[#f1f5f9] text-2xl font-bold">{show.title}</Text>
        <Text className="text-[#94a3b8] text-base mt-1">{show.year}</Text>

        {/* IMDB rating */}
        {show.imdbRating !== 'N/A' && (
          <View className="flex-row items-center mt-3">
            <Text className="text-yellow-400 text-xl">⭐</Text>
            <Text className="text-[#f1f5f9] text-2xl font-bold ml-1">
              {show.imdbRating}
            </Text>
            <Text className="text-[#94a3b8] text-base ml-1">/ 10 (IMDB)</Text>
          </View>
        )}

        {/* Seasons & episode counts */}
        {show.totalSeasons !== 'N/A' && (
          <View className="mt-3">
            <Text className="text-[#94a3b8] text-base font-semibold mb-2">
              {show.totalSeasons} Season{Number(show.totalSeasons) !== 1 ? 's' : ''}
            </Text>
            {episodeCounts.length > 0 && (
              <View className="flex-row flex-wrap gap-2">
                {episodeCounts.map((count, i) => (
                  <View
                    key={i}
                    className="bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-1.5"
                  >
                    <Text className="text-[#f1f5f9] text-xs font-semibold">
                      S{i + 1}
                    </Text>
                    <Text className="text-[#94a3b8] text-xs">
                      {count} ep{count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Genre tags */}
        {show.genre.length > 0 && (
          <View className="flex-row flex-wrap mt-3 gap-2">
            {show.genre.map((g) => (
              <View key={g} className="bg-[#1e293b] border border-[#334155] rounded-full px-3 py-1.5">
                <Text className="text-[#94a3b8] text-sm">{g}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Plot summary */}
        {show.plot && (
          <View className="mt-4">
            <Text className="text-[#f1f5f9] text-sm font-semibold mb-1">About</Text>
            <Text className="text-[#94a3b8] text-sm leading-5">{show.plot}</Text>
          </View>
        )}

        {/* Cast */}
        {show.actors && (
          <View className="mt-4">
            <Text className="text-[#f1f5f9] text-sm font-semibold mb-1">Starring</Text>
            <Text className="text-[#94a3b8] text-sm leading-5">{show.actors}</Text>
          </View>
        )}

        {/* Status badges */}
        {alreadyWatched && (
          <View className="mt-4 bg-emerald-900 border border-emerald-700 rounded-xl px-4 py-2 self-start">
            <Text className="text-emerald-300 text-base font-semibold">✓ Previously Watched</Text>
          </View>
        )}

        {/* Add button */}
        {!alreadyWatched && (
          <TouchableOpacity
            onPress={handleAdd}
            disabled={alreadyWatching || adding}
            className={`mt-5 rounded-xl py-3 items-center ${
              alreadyWatching ? 'bg-[#334155]' : 'bg-[#6366f1]'
            }`}
            activeOpacity={0.8}
          >
            <Text
              className={`font-semibold text-base ${
                alreadyWatching ? 'text-[#94a3b8]' : 'text-white'
              }`}
            >
              {buttonLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
