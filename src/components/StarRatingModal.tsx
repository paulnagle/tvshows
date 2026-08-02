import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import Slider from '@react-native-community/slider';

interface StarRatingModalProps {
  visible: boolean;
  currentRating: number | null;
  onRate: (rating: number) => void;
  onClear: () => void;
  onClose: () => void;
}

/** Render 10 stars with partial fill based on a 1–10 decimal rating. */
function PartialStars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
      {Array.from({ length: 10 }, (_, i) => {
        // How much of this star is filled (0–1)
        const fill = Math.min(1, Math.max(0, rating - i));

        if (fill <= 0) {
          // Empty star
          return (
            <Text key={i} style={{ fontSize: 26, color: '#475569' }}>
              ☆
            </Text>
          );
        }

        if (fill >= 1) {
          // Full star
          return (
            <Text key={i} style={{ fontSize: 26, color: '#3b82f6' }}>
              ★
            </Text>
          );
        }

        // Partial star — clip a filled star to `fill * 100%` width
        return (
          <View key={i} style={{ width: 26, height: 32 }}>
            {/* Empty star background */}
            <Text
              style={{
                fontSize: 26,
                color: '#475569',
                position: 'absolute',
              }}
            >
              ☆
            </Text>
            {/* Filled star clipped by overflow hidden */}
            <View
              style={{
                position: 'absolute',
                width: `${fill * 100}%` as any,
                overflow: 'hidden',
              }}
            >
              <Text style={{ fontSize: 26, color: '#3b82f6' }}>★</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function StarRatingModal({
  visible,
  currentRating,
  onRate,
  onClear,
  onClose,
}: StarRatingModalProps) {
  const [pendingRating, setPendingRating] = useState<number | null>(currentRating);

  // Sync pending rating when modal opens with a pre-existing rating
  useEffect(() => {
    if (visible) {
      setPendingRating(currentRating);
    }
  }, [visible, currentRating]);

  function handleDone() {
    if (pendingRating !== null) {
      onRate(pendingRating);
    }
    onClose();
  }

  function handleClear() {
    setPendingRating(null);
    onClear();
    onClose();
  }

  /** Round slider value to 1 decimal place. */
  function handleSliderChange(value: number) {
    setPendingRating(Math.round(value * 10) / 10);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
      </TouchableWithoutFeedback>

      {/* Bottom sheet */}
      <View
        style={{
          backgroundColor: '#1e293b',
          borderTopWidth: 1,
          borderTopColor: '#334155',
          paddingHorizontal: 24,
          paddingTop: 20,
          paddingBottom: 36,
        }}
      >
        <Text
          style={{ color: '#f1f5f9', fontSize: 16, fontWeight: '700', marginBottom: 20, textAlign: 'center' }}
        >
          Rate This Show
        </Text>

        {/* Stars — partial fill driven by slider */}
        <PartialStars rating={pendingRating ?? 0} />

        {/* Rating label */}
        <Text style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 12, marginBottom: 4 }}>
          {pendingRating !== null ? `${pendingRating.toFixed(1)} / 10` : 'Move the slider to rate'}
        </Text>

        {/* Slider */}
        <Slider
          style={{ width: '100%', height: 40, marginBottom: 16 }}
          minimumValue={1}
          maximumValue={10}
          step={0.1}
          value={pendingRating ?? 5}
          onValueChange={handleSliderChange}
          minimumTrackTintColor="#3b82f6"
          maximumTrackTintColor="#475569"
          thumbTintColor="#6366f1"
        />

        {/* Action buttons */}
        <TouchableOpacity
          onPress={handleDone}
          disabled={pendingRating === null}
          style={{
            backgroundColor: pendingRating !== null ? '#6366f1' : '#334155',
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: 'center',
            marginBottom: 10,
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: pendingRating !== null ? '#ffffff' : '#64748b', fontWeight: '600', fontSize: 15 }}>
            Done
          </Text>
        </TouchableOpacity>

        {currentRating !== null && (
          <TouchableOpacity
            onPress={handleClear}
            style={{
              borderRadius: 12,
              paddingVertical: 10,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#ef4444',
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#f87171', fontWeight: '600', fontSize: 14 }}>
              Clear Rating
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}
