import React from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function LoadingSpinner() {
  return (
    <View className="flex-1 items-center justify-center bg-[#0f172a]">
      <ActivityIndicator size="large" color="#6366f1" />
    </View>
  );
}
