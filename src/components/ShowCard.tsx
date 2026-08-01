import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import type { Show } from '../types';

interface ProgressControls {
  onPrevEpisode: () => void;
  onNextEpisode: () => void;
  onPrevSeason: () => void;
  onNextSeason: () => void;
  onFinished: () => void;
  episodeAtStart: boolean;
  episodeDone: boolean;
  seasonAtStart: boolean;
  seasonDone: boolean;
}

interface ShowCardProps {
  show: Show;
  onPress: () => void;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  controls?: ProgressControls;
}

function ControlBtn({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
      className={`px-3 py-1.5 rounded-md border ${
        disabled
          ? 'border-[#1e293b] opacity-30'
          : 'bg-[#0f172a] border-[#334155] active:opacity-70'
      }`}
      activeOpacity={0.6}
    >
      <Text className="text-[#94a3b8] text-xs font-semibold">{label}</Text>
    </TouchableOpacity>
  );
}

export default function ShowCard({
  show,
  onPress,
  subtitle,
  badge,
  badgeColor = 'bg-[#6366f1]',
  controls,
}: ShowCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-[#1e293b] rounded-xl mx-4 mb-3 p-3 border border-[#334155]"
      activeOpacity={0.7}
    >
      <View className="flex-row items-center">
        {/* Poster */}
        {show.poster ? (
          <Image
            source={{ uri: show.poster }}
            className="w-14 h-20 rounded-lg bg-[#334155]"
            resizeMode="cover"
          />
        ) : (
          <View className="w-14 h-20 rounded-lg bg-[#334155] items-center justify-center">
            <Text className="text-2xl">🎬</Text>
          </View>
        )}

        {/* Info */}
        <View className="flex-1 ml-3">
          <Text
            className="text-[#f1f5f9] font-semibold text-lg"
            numberOfLines={2}
          >
            {show.title}
          </Text>
          <Text className="text-[#94a3b8] text-sm mt-0.5">{show.year}</Text>

          {/* Genre tags */}
          {show.genre.length > 0 && (
            <View className="flex-row flex-wrap mt-1 gap-1">
              {show.genre.slice(0, 2).map((g) => (
                <View key={g} className="bg-[#0f172a] rounded px-1.5 py-0.5">
                  <Text className="text-[#94a3b8] text-xs">{g}</Text>
                </View>
              ))}
            </View>
          )}

          {subtitle ? (
            <Text className="text-[#94a3b8] text-sm mt-1">{subtitle}</Text>
          ) : null}
        </View>

        {/* Right column */}
        <View className="items-end ml-2 gap-1.5">
          {show.imdbRating !== 'N/A' && show.imdbRating ? (
            <View className="flex-row items-center">
              <Text className="text-yellow-400 text-sm">⭐ </Text>
              <Text className="text-[#f1f5f9] text-sm font-semibold">
                {show.imdbRating}
              </Text>
            </View>
          ) : null}
          {badge ? (
            <View className={`${badgeColor} rounded-full px-2 py-1`}>
              <Text className="text-white text-xs font-semibold">{badge}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Inline progress controls */}
      {controls && (
        <>
          <View className="flex-row items-center justify-between mt-2.5 pt-2 border-t border-[#334155]">
            <View className="flex-row gap-1.5">
              <ControlBtn label="− Ep" onPress={controls.onPrevEpisode} disabled={controls.episodeAtStart} />
              <ControlBtn label="+ Ep" onPress={controls.onNextEpisode} disabled={controls.episodeDone} />
            </View>
            <View className="flex-row gap-1.5">
              <ControlBtn label="− S" onPress={controls.onPrevSeason} disabled={controls.seasonAtStart} />
              <ControlBtn label="+ S" onPress={controls.onNextSeason} disabled={controls.seasonDone} />
            </View>
          </View>
          <TouchableOpacity
            onPress={controls.onFinished}
            className="mt-2 bg-emerald-900 border border-emerald-700 rounded-md py-2 items-center"
            activeOpacity={0.7}
          >
            <Text className="text-emerald-300 text-xs font-semibold">Finished ✓</Text>
          </TouchableOpacity>
        </>
      )}
    </TouchableOpacity>
  );
}
