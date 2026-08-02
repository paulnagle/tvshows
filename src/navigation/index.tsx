import React, { useRef, useState, useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import type { LinkingOptions, NavigationContainerRef } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

// ─── Shared screen options ────────────────────────────────────────────────────
const stackScreenOptions = {
  headerStyle: { backgroundColor: '#1e293b' },
  headerTintColor: '#f1f5f9',
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: '#0f172a' },
};

// ─── Stack navigators ─────────────────────────────────────────────────────────
const WatchingStack = createNativeStackNavigator<WatchingStackParamList>();
function WatchingNavigator() {
  return (
    <WatchingStack.Navigator screenOptions={stackScreenOptions}>
      <WatchingStack.Screen name="WatchingList" component={WatchingListScreen} options={{ title: 'Currently Watching' }} />
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
      <ToWatchStack.Screen name="ToWatchList" component={ToWatchListScreen} options={{ title: 'Watch Next' }} />
      <ToWatchStack.Screen name="ShowDetail" component={ShowDetailScreen} options={{ title: '' }} />
    </ToWatchStack.Navigator>
  );
}

// ─── Root stack param list ────────────────────────────────────────────────────
type RootStackParamList = {
  MainTabs: undefined;
};

// ─── Deep-link / web URL config ───────────────────────────────────────────────
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Watching: '',
          ToWatch: 'to-watch',
          History: 'history',
          Recommendations: 'recommendations',
          Search: 'search',
          Settings: 'settings',
        },
      },
    },
  },
};

// ─── Tab labels & sub-labels ──────────────────────────────────────────────────
const TAB_ICONS: Record<string, string> = {
  Watching:        '▶',
  ToWatch:         '◷',
  History:         '✦',
  Recommendations: '★',
  Search:          '⌕',
  Settings:        '⚙',
};

const TAB_LABELS: Record<string, string> = {
  Watching:        'Watching',
  ToWatch:         'Up Next',
  History:         'History',
  Recommendations: 'For You',
  Search:          'Search',
  Settings:        'Settings',
};

// ─── Main swipeable tabs (all 6 tabs) ─────────────────────────────────────────
const MainTop = createMaterialTopTabNavigator();

function MainTabsNavigator() {
  return (
    <MainTop.Navigator
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
        lazy: true,
      }}
      tabBar={EmptyTabBar}
    >
      <MainTop.Screen name="Watching" component={WatchingNavigator} />
      <MainTop.Screen name="ToWatch" component={ToWatchNavigator} />
      <MainTop.Screen name="History" component={HistoryNavigator} />
      <MainTop.Screen name="Recommendations" component={RecommendationsNavigator} />
      <MainTop.Screen name="Search" component={SearchNavigator} />
      <MainTop.Screen name="Settings" component={SettingsNavigator} />
    </MainTop.Navigator>
  );
}

// ─── Root stack navigator ─────────────────────────────────────────────────────
const RootStack = createNativeStackNavigator<RootStackParamList>();

// ─── Empty tab bar (suppresses the built-in one) ──────────────────────────────
function EmptyTabBar() {
  return null;
}

// ─── Derive the active MainTop tab name from navRef ──────────────────────────
function getActiveNames(
  navRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>,
): { innerTabName: string } {
  const state = navRef.current?.getState();
  const mainTabsRoute = state?.routes?.find((r: any) => r.name === 'MainTabs') as any;
  const innerTabName =
    mainTabsRoute?.state?.routes?.[mainTabsRoute?.state?.index ?? 0]?.name ?? 'Watching';
  return { innerTabName };
}

// ─── Custom bottom bar — lives outside navigator tree, uses navRef ────────────
interface BottomBarProps {
  navRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>;
  innerTabName: string;
}

function CustomBottomBar({ navRef, innerTabName }: BottomBarProps) {
  const insets = useSafeAreaInsets();

  const tabs = [
    { name: 'Watching',        innerTab: 'Watching' },
    { name: 'ToWatch',         innerTab: 'ToWatch' },
    { name: 'History',         innerTab: 'History' },
    { name: 'Recommendations', innerTab: 'Recommendations' },
    { name: 'Search',          innerTab: 'Search' },
    { name: 'Settings',        innerTab: 'Settings' },
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: '#1e293b',
        borderTopColor: '#334155',
        borderTopWidth: 1,
        paddingBottom: insets.bottom || 10,
        paddingTop: 8,
        height: 64 + (insets.bottom || 10),
      }}
    >
      {tabs.map((tab) => {
        const isActive = innerTabName === tab.innerTab;
        const color = isActive ? '#6366f1' : '#94a3b8';

        return (
          <TouchableOpacity
            key={tab.name}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }}
            onPress={() => {
              if (!navRef.current) return;
              navRef.current.navigate('MainTabs', { screen: tab.innerTab } as any);
            }}
          >
            <Text style={{ color, fontSize: 22, lineHeight: 26 }}>
              {TAB_ICONS[tab.name]}
            </Text>
            <Text style={{ color, fontSize: 10, lineHeight: 13, letterSpacing: 0.2 }}>
              {TAB_LABELS[tab.name]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Root navigator ───────────────────────────────────────────────────────────
export default function AppNavigator() {
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((n) => n + 1), []);

  const onStateChange = useCallback(() => {
    forceUpdate();
  }, [forceUpdate]);

  const { innerTabName } = getActiveNames(navRef);

  return (
    <NavigationContainer ref={navRef} linking={linking} onStateChange={onStateChange}>
      <View style={{ flex: 1 }}>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="MainTabs" component={MainTabsNavigator} />
        </RootStack.Navigator>
        <CustomBottomBar
          navRef={navRef}
          innerTabName={innerTabName}
        />
      </View>
    </NavigationContainer>
  );
}
