// src/navigation/AppNavigator.tsx
// Bottom tab navigator. Home tab is wrapped in a NativeStack so MapScreen
// can be pushed full-screen without affecting the Trips or Settings tabs.

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { CreateTripScreen } from '@/screens/trip/CreateTripScreen';
import { DestinationPickerScreen } from '@/screens/trip/DestinationPickerScreen';
import { MapScreen } from '@/screens/map/MapScreen';
import { TripDetailScreen } from '@/screens/trip/TripDetailScreen';
import { TripsScreen } from '@/screens/trips/TripsScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { useTheme } from '@/theme/ThemeProvider';
import type { AppTabParamList, HomeStackParamList } from './types';

const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen
        name="CreateTrip"
        component={CreateTripScreen}
        options={{
          headerShown: true,
          title: 'สร้างทริปใหม่',
          headerBackTitle: 'กลับ',
        }}
      />
      <HomeStack.Screen
        name="DestinationPicker"
        component={DestinationPickerScreen}
        options={{
          headerShown: true,
          title: 'เลือกจุดหมาย',
          headerBackTitle: 'กลับ',
        }}
      />
      <HomeStack.Screen
        name="MapScreen"
        component={MapScreen}
        options={{ gestureEnabled: false }}
      />
      <HomeStack.Screen
        name="TripDetail"
        component={TripDetailScreen}
        options={{ headerShown: false }}
      />
    </HomeStack.Navigator>
  );
}

// Placeholder emoji icon — replace with lucide-react-native in Phase 5.2 polish
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray500,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          title: 'Home', // TODO(thai): translate after agent finishes
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Trips"
        component={TripsScreen}
        options={{
          title: 'Trips', // TODO(thai): translate after agent finishes
          tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings', // TODO(thai): translate after agent finishes
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
