import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import type { Show } from '../types';

interface ShowCardProps {
  show: Show;
  onPress: () => void;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
}

export default function ShowCard({
  show,
  onPress,
  subtitle,
  badge,
  badgeColor = 'bg-[#6366f1]',
}: ShowCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center bg-[#1e293b] rounded-xl mx-4 mb-3 p-3 border border-[#334155]"
      activeOpacity={0.7}
    >
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
          className="text-[#f1f5f9] font-semibold text-base"
          numberOfLines={2}
        >
          {show.title}
        </Text>
        <Text className="text-[#94a3b8] text-xs mt-0.5">{show.year}</Text>

        {/* Genre tags */}
        {show.genre.length > 0 && (
          <View className="flex-row flex-wrap mt-1 gap-1">
            {show.genre.slice(0, 2).map((g) => (
              <View key={g} className="bg-[#0f172a] rounded px-1.5 py-0.5">
                <Text className="text-[#94a3b8] text-[10px]">{g}</Text>
              </View>
            ))}
          </View>
        )}

        {subtitle ? (
          <Text className="text-[#94a3b8] text-xs mt-1">{subtitle}</Text>
        ) : null}
      </View>

      {/* Right column */}
      <View className="items-end ml-2 gap-1.5">
        {show.imdbRating !== 'N/A' && show.imdbRating ? (
          <View className="flex-row items-center">
            <Text className="text-yellow-400 text-xs">⭐ </Text>
            <Text className="text-[#f1f5f9] text-xs font-semibold">
              {show.imdbRating}
            </Text>
          </View>
        ) : null}
        {badge ? (
          <View className={`${badgeColor} rounded-full px-2 py-0.5`}>
            <Text className="text-white text-[10px] font-semibold">{badge}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
