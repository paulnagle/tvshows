import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

import WatchingListScreen from '../screens/WatchingListScreen';
import HistoryListScreen from '../screens/HistoryListScreen';
import RecommendationsScreen from '../screens/RecommendationsScreen';
import SearchScreen from '../screens/SearchScreen';
import ShowDetailScreen from '../screens/ShowDetailScreen';

import type {
  WatchingStackParamList,
  HistoryStackParamList,
  RecommendationsStackParamList,
  SearchStackParamList,
} from '../types';

// ─── Stack navigators ─────────────────────────────────────────────────────────
const WatchingStack = createNativeStackNavigator<WatchingStackParamList>();
function WatchingNavigator() {
  return (
    <WatchingStack.Navigator screenOptions={stackScreenOptions}>
      <WatchingStack.Screen name="WatchingList" component={WatchingListScreen} options={{ title: 'Watching' }} />
      <WatchingStack.Screen name="ShowDetail" component={ShowDetailScreen} options={{ title: '' }} />
    </WatchingStack.Navigator>
  );
}

const HistoryStack = createNativeStackNavigator<HistoryStackParamList>();
function HistoryNavigator() {
  return (
    <HistoryStack.Navigator screenOptions={stackScreenOptions}>
      <HistoryStack.Screen name="HistoryList" component={HistoryListScreen} options={{ title: 'Watch History' }} />
      <HistoryStack.Screen name="ShowDetail" component={ShowDetailScreen} options={{ title: '' }} />
    </HistoryStack.Navigator>
  );
}

const RecommendationsStack = createNativeStackNavigator<RecommendationsStackParamList>();
function RecommendationsNavigator() {
  return (
    <RecommendationsStack.Navigator screenOptions={stackScreenOptions}>
      <RecommendationsStack.Screen name="RecommendationsList" component={RecommendationsScreen} options={{ title: 'For You' }} />
      <RecommendationsStack.Screen name="ShowDetail" component={ShowDetailScreen} options={{ title: '' }} />
    </RecommendationsStack.Navigator>
  );
}

const SearchStack = createNativeStackNavigator<SearchStackParamList>();
function SearchNavigator() {
  return (
    <SearchStack.Navigator screenOptions={stackScreenOptions}>
      <SearchStack.Screen name="Search" component={SearchScreen} options={{ title: 'Search' }} />
      <SearchStack.Screen name="ShowDetail" component={ShowDetailScreen} options={{ title: '' }} />
    </SearchStack.Navigator>
  );
}

// ─── Shared screen options ────────────────────────────────────────────────────
const stackScreenOptions = {
  headerStyle: { backgroundColor: '#1e293b' },
  headerTintColor: '#f1f5f9',
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: '#0f172a' },
};

// ─── Bottom tab navigator ─────────────────────────────────────────────────────
const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#1e293b',
            borderTopColor: '#334155',
          },
          tabBarActiveTintColor: '#6366f1',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarLabel: ({ color }) => {
            const labels: Record<string, string> = {
              Watching: '📺 Watching',
              History: '✅ History',
              Recommendations: '💡 For You',
              Search: '🔍 Search',
            };
            return (
              <Text style={{ color, fontSize: 10, marginBottom: 2 }}>
                {labels[route.name] ?? route.name}
              </Text>
            );
          },
          tabBarIcon: () => null,
          tabBarIconStyle: { display: 'none' },
        })}
      >
        <Tab.Screen name="Watching" component={WatchingNavigator} />
        <Tab.Screen name="History" component={HistoryNavigator} />
        <Tab.Screen name="Recommendations" component={RecommendationsNavigator} />
        <Tab.Screen name="Search" component={SearchNavigator} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
