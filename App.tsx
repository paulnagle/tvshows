import './global.css';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { initDatabase, setSyncEmitter, clearSyncEmitter, applyRemoteEvent, getAllCurrentShows, getAllWatchedShows } from './src/db/database';
import { startSync, stopSync, broadcastChange } from './src/services/sync';
import { dataEvents } from './src/events/dataEvents';
import AppNavigator from './src/navigation';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    initDatabase()
      .then(() => {
        // Wire the sync emitter so local DB writes broadcast to peers
        setSyncEmitter(broadcastChange);

        // Start sync; remote events are applied to local DB then UI is notified
        startSync(
          async (event) => {
            await applyRemoteEvent(event);
            dataEvents.emit();
          },
          async () => ({
            currentShows: await getAllCurrentShows(),
            watchedShows: await getAllWatchedShows(),
          })
        );

        setDbReady(true);
      })
      .catch(() => setDbError('Failed to initialize database.'));

    return () => {
      clearSyncEmitter();
      stopSync();
    };
  }, []);

  // Pause sync when the app goes to background, resume on foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current === 'active' && nextState.match(/inactive|background/)) {
        stopSync();
        clearSyncEmitter();
      } else if (appState.current.match(/inactive|background/) && nextState === 'active') {
        setSyncEmitter(broadcastChange);
        startSync(
          async (event) => {
            await applyRemoteEvent(event);
            dataEvents.emit();
          },
          async () => ({
            currentShows: await getAllCurrentShows(),
            watchedShows: await getAllWatchedShows(),
          })
        );
      }
      appState.current = nextState;
    });
    return () => sub.remove();
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
