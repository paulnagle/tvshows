import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';

interface StarRatingModalProps {
  visible: boolean;
  currentRating: number | null;
  onRate: (rating: number) => void;
  onClear: () => void;
  onClose: () => void;
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

        {/* 10 star buttons */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => {
            const filled = pendingRating !== null && star <= pendingRating;
            return (
              <TouchableOpacity
                key={star}
                onPress={() => setPendingRating(star)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text style={{ fontSize: 26, color: filled ? '#3b82f6' : '#475569' }}>
                  {filled ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Rating label */}
        <Text style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
          {pendingRating !== null ? `${pendingRating} / 10` : 'Tap a star to rate'}
        </Text>

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
