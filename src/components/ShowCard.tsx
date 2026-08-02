import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
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
  userRating?: number | null;
  controls?: ProgressControls;
  onRemove?: () => void;
  onRewatch?: () => void;
  onStartWatching?: () => void;
  onAddToWatch?: () => void;
  onHide?: () => void;
  /** Long-press drag handler supplied by DraggableFlatList */
  onDrag?: (event: GestureResponderEvent) => void;
  isDragging?: boolean;
}

function ControlBtn({
  label,
  onPress,
  disabled,
  finished = false,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  finished?: boolean;
}) {
  const bg = disabled ? '#0f172a' : finished ? '#064e3b' : '#0f172a';
  const borderColor = disabled ? '#1e293b' : finished ? '#065f46' : '#334155';
  const textColor = disabled ? '#1e293b' : finished ? '#6ee7b7' : '#94a3b8';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
      style={{
        flex: 1,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        borderColor,
        opacity: disabled ? 0.3 : 1,
      }}
      activeOpacity={0.6}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: textColor }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ShowCard({
  show,
  onPress,
  subtitle,
  badge,
  badgeColor = 'bg-[#6366f1]',
  userRating,
  controls,
  onRemove,
  onRewatch,
  onStartWatching,
  onAddToWatch,
  onHide,
  onDrag,
  isDragging = false,
}: ShowCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onDrag}
      delayLongPress={300}
      className="bg-[#1e293b] rounded-xl mx-4 mb-3 p-3 border border-[#334155]"
      style={isDragging ? { opacity: 0.9, borderColor: '#6366f1' } : undefined}
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
          {userRating != null ? (
            <View className="flex-row items-center">
              <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '600' }}>
                ★ {userRating}
              </Text>
            </View>
          ) : null}
          {badge ? (
            <View className={`${badgeColor} rounded-full px-2 py-1`}>
              <Text className="text-white text-xs font-semibold">{badge}</Text>
            </View>
          ) : null}
          {onDrag ? (
            <Text style={{ color: '#475569', fontSize: 16, lineHeight: 18 }}>☰</Text>
          ) : null}
        </View>
      </View>

      {/* Inline progress controls */}
      {controls && (
        <View className="flex-row items-center mt-2.5 pt-2 border-t border-[#334155] gap-1.5">
          <ControlBtn label="− Ep" onPress={controls.onPrevEpisode} disabled={controls.episodeAtStart} />
          <ControlBtn label="+ Ep" onPress={controls.onNextEpisode} disabled={controls.episodeDone} />
          <ControlBtn label="Finish" onPress={controls.onFinished} disabled={false} finished />
          <ControlBtn label="− S" onPress={controls.onPrevSeason} disabled={controls.seasonAtStart} />
          <ControlBtn label="+ S" onPress={controls.onNextSeason} disabled={controls.seasonDone} />
        </View>
      )}

      {/* Watch Again + Watch Next + Remove row (history page) */}
      {!controls && onRewatch && (
        <View className="flex-row mt-2 gap-1.5">
          <TouchableOpacity
            onPress={onRewatch}
            className="bg-indigo-900 border border-indigo-700 rounded-md py-2 items-center"
            style={{ flex: 3 }}
            activeOpacity={0.7}
          >
            <Text className="text-indigo-300 text-xs font-semibold">▶ Watch Again</Text>
          </TouchableOpacity>
          {onAddToWatch && (
            <TouchableOpacity
              onPress={onAddToWatch}
              className="bg-[#1e3a5f] border border-[#2563eb] rounded-md py-2 items-center"
              style={{ flex: 3 }}
              activeOpacity={0.7}
            >
              <Text className="text-blue-300 text-xs font-semibold">+ Watch Next</Text>
            </TouchableOpacity>
          )}
          {onRemove && (
            <TouchableOpacity
              onPress={onRemove}
              className="bg-red-950 border border-red-800 rounded-md py-2 items-center"
              style={{ flex: 1 }}
              activeOpacity={0.7}
            >
              <Text className="text-red-400 text-xs font-semibold">✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Start Watching + Remove row (To Watch page) */}
      {!controls && !onRewatch && (onStartWatching || onAddToWatch) && (
        <View className="flex-row mt-2 gap-1.5">
          {onStartWatching && (
            <TouchableOpacity
              onPress={onStartWatching}
              className="bg-emerald-900 border border-emerald-700 rounded-md py-2 items-center"
              style={{ flex: 3 }}
              activeOpacity={0.7}
            >
              <Text className="text-emerald-300 text-xs font-semibold">▶ Start Watching</Text>
            </TouchableOpacity>
          )}
          {onStartWatching && onRemove && (
            <TouchableOpacity
              onPress={onRemove}
              className="bg-red-950 border border-red-800 rounded-md py-2 items-center"
              style={{ flex: 1 }}
              activeOpacity={0.7}
            >
              <Text className="text-red-400 text-xs font-semibold">✕</Text>
            </TouchableOpacity>
          )}
          {onAddToWatch && (
            <TouchableOpacity
              onPress={onAddToWatch}
              className="bg-[#1e3a5f] border border-[#2563eb] rounded-md py-2 items-center"
              style={onStartWatching ? { flex: 1 } : { flex: 4 }}
              activeOpacity={0.7}
            >
              <Text className="text-blue-300 text-xs font-semibold">
                {onStartWatching ? '✕' : '+ Watch Next'}
              </Text>
            </TouchableOpacity>
          )}
          {onHide && (
            <TouchableOpacity
              onPress={onHide}
              className="bg-red-950 border border-red-800 rounded-md py-2 items-center"
              style={{ flex: 1 }}
              activeOpacity={0.7}
            >
              <Text className="text-red-400 text-xs font-semibold">✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
