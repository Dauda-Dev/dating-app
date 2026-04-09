import React, { lazy, Suspense } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { COLORS } from '../constants';

// Tab screens
import { HomeScreen } from '../screens/home/HomeScreen';
import { DiscoveryScreen } from '../screens/discovery/DiscoveryScreen';
import { MatchesScreen } from '../screens/matches/MatchesScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

// Stack-only screens
import { MatchDetailsScreen } from '../screens/matches/MatchDetailsScreen';
import { ChatScreen } from '../screens/matches/ChatScreen';
import { ProfileEditScreen } from '../screens/profile/ProfileEditScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { StealsScreen } from '../screens/steals/StealsScreen';
import { SubscriptionScreen } from '../screens/subscription/SubscriptionScreen';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ReportScreen } from '../screens/report/ReportScreen';
import { AdminScreen } from '../screens/admin/AdminScreen';
import { AdminReportDetailScreen } from '../screens/admin/AdminReportDetailScreen';

// Lazy-load VideoCallScreen so Daily.co native modules don't block Expo Go bundling
const VideoCallScreen = lazy(() =>
  import('../screens/video/VideoCallScreen').then((m) => ({ default: m.VideoCallScreen }))
);
const VideoCallScreenWrapped = (props: any) => (
  <Suspense fallback={<LoadingScreen message="Loading video…" />}>
    <VideoCallScreen {...props} />
  </Suspense>
);

export type MainTabParamList = {
  Home: undefined;
  Discover: undefined;
  Matches: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  MatchDetails: { matchId: string };
  Chat: { matchId: string };
  VideoCall: { matchId: string; roomUrl: string; sessionId: string };
  ProfileEdit: undefined;
  Settings: undefined;
  Steals: undefined;
  Subscription: undefined;
  Report: { userId: string; userName: string; matchId?: string };
  Admin: undefined;
  AdminReportDetail: { reportId: string };
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

const TabIcon = ({ label, focused }: { label: string; focused: boolean }) => {
  const icons: Record<string, string> = {
    Home: '🏠', Discover: '🔥', Matches: '💬', Profile: '👤',
  };
  return <Text style={{ fontSize: focused ? 22 : 19, opacity: focused ? 1 : 0.55 }}>{icons[label]}</Text>;
};

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.gray,
      tabBarStyle: {
        borderTopWidth: 0,
        elevation: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 12,
        height: 64,
        paddingBottom: 8,
        paddingTop: 4,
        backgroundColor: '#fff',
      },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
    })}
  >
    <Tab.Screen name="Discover" component={DiscoveryScreen} />
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Matches" component={MatchesScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export const MainNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Tabs" component={TabNavigator} />
    <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} options={{ presentation: 'card' }} />
    <Stack.Screen name="Chat" component={ChatScreen} options={{ presentation: 'card' }} />
    <Stack.Screen name="VideoCall" component={VideoCallScreenWrapped} options={{ presentation: 'fullScreenModal' }} />
    <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ presentation: 'modal' }} />
    <Stack.Screen name="Settings" component={SettingsScreen} options={{ presentation: 'card' }} />
    <Stack.Screen name="Steals" component={StealsScreen} options={{ presentation: 'card' }} />
    <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ presentation: 'card' }} />
    <Stack.Screen name="Report" component={ReportScreen} options={{ presentation: 'modal' }} />
    <Stack.Screen name="Admin" component={AdminScreen} options={{ presentation: 'card' }} />
    <Stack.Screen name="AdminReportDetail" component={AdminReportDetailScreen} options={{ presentation: 'card' }} />
  </Stack.Navigator>
);
