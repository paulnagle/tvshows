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
import ToWatchListScreen from '../screens/ToWatchListScreen';
import SettingsScreen from '../screens/SettingsScreen';

import type {
  WatchingStackParamList,
  HistoryStackParamList,
  RecommendationsStackParamList,
  SearchStackParamList,
  ToWatchStackParamList,
  SettingsStackParamList,
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
      <SearchStack.Screen name="SearchScreen" component={SearchScreen} options={{ title: 'Search' }} />
      <SearchStack.Screen name="ShowDetail" component={ShowDetailScreen} options={{ title: '' }} />
    </SearchStack.Navigator>
  );
}

const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
function SettingsNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={stackScreenOptions}>
      <SettingsStack.Screen name="SettingsScreen" component={SettingsScreen} options={{ title: 'Settings' }} />
    </SettingsStack.Navigator>
  );
}

const ToWatchStack = createNativeStackNavigator<ToWatchStackParamList>();
function ToWatchNavigator() {
  return (
    <ToWatchStack.Navigator screenOptions={stackScreenOptions}>
      <ToWatchStack.Screen name="ToWatchList" component={ToWatchListScreen} options={{ title: 'To Watch' }} />
      <ToWatchStack.Screen name="ShowDetail" component={ShowDetailScreen} options={{ title: '' }} />
    </ToWatchStack.Navigator>
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
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            backgroundColor: '#1e293b',
            borderTopColor: '#334155',
            height: 64,
            paddingBottom: 10,
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#6366f1',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarLabel: ({ color }) => {
            if (route.name === 'Watching') {
              return (
                <Text style={{ color, fontSize: 30, lineHeight: 34 }}>📺</Text>
              );
            }
            if (route.name === 'ToWatch') {
              return (
                <Text style={{ color, fontSize: 30, lineHeight: 34 }}>🔖</Text>
              );
            }
            if (route.name === 'History') {
              return (
                <Text style={{ color, fontSize: 30, lineHeight: 34 }}>⏳</Text>
              );
            }
            if (route.name === 'Recommendations') {
              return (
                <Text style={{ color, fontSize: 30, lineHeight: 34 }}>💡</Text>
              );
            }
            if (route.name === 'Search') {
              return (
                <Text style={{ color, fontSize: 30, lineHeight: 34 }}>🔍</Text>
              );
            }
            return (
              <Text style={{ color, fontSize: 30, lineHeight: 34 }}>⚙️</Text>
            );
          },
          tabBarIcon: () => null,
          tabBarIconStyle: { display: 'none' },
        })}
      >
        <Tab.Screen name="Watching" component={WatchingNavigator} />
        <Tab.Screen name="ToWatch" component={ToWatchNavigator} />
        <Tab.Screen name="History" component={HistoryNavigator} />
        <Tab.Screen name="Recommendations" component={RecommendationsNavigator} />
        <Tab.Screen name="Search" component={SearchNavigator} />
        <Tab.Screen name="Settings" component={SettingsNavigator} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
