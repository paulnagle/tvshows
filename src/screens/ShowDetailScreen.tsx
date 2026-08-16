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
  ReleaseStatus,
} from '../types';
import { getShowDetails, getSeasonEpisodeCounts } from '../services/omdb';
import { getReleaseStatus } from '../services/tmdb';
import {
  addCurrentShow,
  isCurrentShow,
  isWatchedShow,
  addToWatchShow,
  isToWatchShow,
  getShowRating,
  updateShowRating,
} from '../db/database';
import type { Show } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import StarRatingModal from '../components/StarRatingModal';

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
  const [alreadyToWatch, setAlreadyToWatch] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addingToWatch, setAddingToWatch] = useState(false);
  const [releaseStatus, setReleaseStatus] = useState<ReleaseStatus | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [detail, watching, watched, toWatch, rating] = await Promise.all([
          getShowDetails(imdbID),
          isCurrentShow(imdbID),
          isWatchedShow(imdbID),
          isToWatchShow(imdbID),
          getShowRating(imdbID),
        ]);
        setShow(detail);
        setAlreadyWatching(watching);
        setAlreadyWatched(watched);
        setAlreadyToWatch(toWatch);
        setUserRating(rating);

        const release = await getReleaseStatus(imdbID, 1, 0).catch(() => null);
        setReleaseStatus(release);

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
      Alert.alert('Added!', `"${show.title}" added to your Watch List.`);
    } catch {
      Alert.alert('Error', 'Could not add show. Please try again.');
    } finally {
      setAdding(false);
    }
  }

  async function handleAddToWatch() {
    if (!show) return;
    setAddingToWatch(true);
    try {
      await addToWatchShow(show);
      setAlreadyToWatch(true);
      Alert.alert('Added!', `"${show.title}" added to your To Watch list.`);
    } catch {
      Alert.alert('Error', 'Could not add show. Please try again.');
    } finally {
      setAddingToWatch(false);
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

  const watchButtonLabel = alreadyWatching
    ? '✓ Already Watching'
    : adding
    ? 'Adding…'
    : '+ Add to Watch Next';

  const toWatchButtonLabel = alreadyToWatch
    ? '✓ In Watch Next'
    : addingToWatch
    ? 'Adding…'
    : '+ Add to To Watch';

  return (
    <ScrollView className="flex-1 bg-[#0f172a]" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Poster */}
      {show.poster ? (
        <Image
          source={{ uri: show.poster }}
          className="w-full h-72 bg-[#1e293b]"
          resizeMode="contain"
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
         <View className="flex-row items-center mt-3">
           <Text className="text-yellow-400 text-xl">⭐</Text>
           <Text className="text-[#f1f5f9] text-2xl font-bold ml-1">
             {show.imdbRating && show.imdbRating !== 'N/A' ? show.imdbRating : 'N/A'}
           </Text>
           <Text className="text-[#94a3b8] text-base ml-1">/ 10 (IMDB)</Text>
         </View>

         {/* User rating */}
         {userRating !== null && (
           <View className="flex-row items-center mt-1">
             <Text style={{ color: '#3b82f6', fontSize: 18 }}>★</Text>
             <Text style={{ color: '#3b82f6', fontSize: 16, fontWeight: '600', marginLeft: 4 }}>
               Your rating: {typeof userRating === 'number' ? userRating.toFixed(1) : userRating} / 10
             </Text>
           </View>
         )}

        {releaseStatus && (releaseStatus.nextEpisodeAirDate || releaseStatus.statusTone === 'ended') && (
          <View className={`mt-4 rounded-xl px-4 py-3 border ${
            releaseStatus.statusTone === 'available'
              ? 'bg-emerald-950 border-emerald-800'
              : releaseStatus.statusTone === 'ended'
              ? 'bg-[#1e293b] border-[#334155]'
              : 'bg-violet-950 border-violet-800'
          }`}>
            <Text className={`text-sm font-semibold ${
              releaseStatus.statusTone === 'available'
                ? 'text-emerald-300'
                : releaseStatus.statusTone === 'ended'
                ? 'text-[#cbd5e1]'
                : 'text-violet-300'
            }`}>
              {releaseStatus.isAvailableNow ? 'New episode available' : releaseStatus.statusLabel}
            </Text>
            {releaseStatus.nextEpisodeSeason && releaseStatus.nextEpisodeNumber ? (
              <Text className="text-[#cbd5e1] text-sm mt-1">
                Next up: S{releaseStatus.nextEpisodeSeason}E{releaseStatus.nextEpisodeNumber}
                {releaseStatus.nextEpisodeName ? ` · ${releaseStatus.nextEpisodeName}` : ''}
              </Text>
            ) : null}
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

        {/* Rate This Show — always visible */}
        <View className="mt-5 gap-3">
          <TouchableOpacity
            onPress={() => setRatingModalVisible(true)}
            className="rounded-xl py-3 items-center border border-[#3b82f6] bg-[#172554]"
            activeOpacity={0.8}
          >
            <Text style={{ color: '#3b82f6', fontWeight: '600', fontSize: 15 }}>
              {userRating !== null ? `★ Change Rating (${typeof userRating === 'number' ? userRating.toFixed(1) : userRating}/10)` : '☆ Rate This Show'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Buttons: only shown if not already in watch history */}
        {!alreadyWatched && (
          <View className="mt-3 gap-3">
            {/* Add to Watch Next */}
            <TouchableOpacity
              onPress={handleAdd}
              disabled={alreadyWatching || adding}
              className={`rounded-xl py-3 items-center ${
                alreadyWatching ? 'bg-[#334155]' : 'bg-[#6366f1]'
              }`}
              activeOpacity={0.8}
            >
              <Text
                className={`font-semibold text-base ${
                  alreadyWatching ? 'text-[#94a3b8]' : 'text-white'
                }`}
              >
                {watchButtonLabel}
              </Text>
            </TouchableOpacity>

            {/* Add to To Watch */}
            {!alreadyWatching && (
              <TouchableOpacity
                onPress={handleAddToWatch}
                disabled={alreadyToWatch || addingToWatch}
                className={`rounded-xl py-3 items-center border ${
                  alreadyToWatch
                    ? 'bg-[#334155] border-[#334155]'
                    : 'bg-[#1e3a5f] border-[#2563eb]'
                }`}
                activeOpacity={0.8}
              >
                <Text
                  className={`font-semibold text-base ${
                    alreadyToWatch ? 'text-[#94a3b8]' : 'text-blue-300'
                  }`}
                >
                  {toWatchButtonLabel}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <StarRatingModal
        visible={ratingModalVisible}
        currentRating={userRating}
        onRate={async (rating) => {
          await updateShowRating(imdbID, rating);
          setUserRating(rating);
        }}
        onClear={async () => {
          await updateShowRating(imdbID, null);
          setUserRating(null);
        }}
        onClose={() => setRatingModalVisible(false)}
      />
    </ScrollView>
  );
}
