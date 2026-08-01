import './global.css';
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from './src/db/database';
import AppNavigator from './src/navigation';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => setDbReady(true))
      .catch(() => setDbError('Failed to initialize database.'));
  }, []);

  if (dbError) {
    return (
      <View className="flex-1 bg-[#0f172a] items-center justify-center px-8">
        <Text className="text-red-400 text-center text-base">{dbError}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View className="flex-1 bg-[#0f172a] items-center justify-center">
        <Text className="text-[#94a3b8] text-sm">Loading…</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
