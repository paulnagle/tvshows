import React from 'react';
import { View, Text } from 'react-native';

interface EmptyStateProps {
  message: string;
  subMessage?: string;
}

export default function EmptyState({ message, subMessage }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 bg-[#0f172a]">
      <Text className="text-4xl mb-4">📺</Text>
      <Text className="text-[#f1f5f9] text-lg font-semibold text-center mb-2">
        {message}
      </Text>
      {subMessage ? (
        <Text className="text-[#94a3b8] text-sm text-center">{subMessage}</Text>
      ) : null}
    </View>
  );
}
